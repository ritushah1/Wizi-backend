const UserMaster = require('../models/userMaster');
const HRSalarySlip = require('../models/hrSalarySlip');
const path = require('path');
const { saveBase64Pdf } = require('./base64ToPdf');
const companyMaster = require('../models/companyMaster');
const subscriptionPlan = require('../models/subscriptionPlan');
const {
  adminSideUserTypesArray,
  customizeProfileFields,
} = require('./dbUtils');
const {
  asiaKolkataDateTime,
  parseEmployeeInfoAlias,
} = require('./commonUtilFunctions');
const UserRole = require('../models/userRole');
const RolePermission = require('../models/rolePermission');
const FormMaster = require('../models/formMaster');
const { Sequelize } = require('sequelize');
const RoleMaster = require('../models/roleMaster');
const {
  notRegistered,
  adminNotAllowed,
  noSubscriptionPlan,
} = require('./whatsappMessageTemplates');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const WorkingArea = require('../models/workingArea');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const Division = require('../models/division');
const EmployeeDivision = require('../models/employeeDivision');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const CustomizeProfile = require('../models/customizeProfile');
const BranchMaster = require('../models/branchMaster');
const moment = require('moment');

async function getUserDetailsByNumber(number) {
  const originalNumber = getOriginalMobileNo(number);

  return await UserMaster.findOne({
    where: {
      userNumber: originalNumber,
      status: 1,
    },
    include: [{ model: companyMaster }],
  });
}

function getLastmonthsYYYYMMExcludeCurrent(numberOfMonth = 6) {
  const result = [];
  const date = new Date();

  for (let i = 1; i <= numberOfMonth; i++) {
    const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    result.push(`${year}${month}`);
  }

  return result;
}

async function getLastSixSalarySlipMonth(userMasterID) {
  const data = await HRSalarySlip.findAll({
    where: {
      userMasterID,
    },
    limit: 6,
    order: [['salaryYYYYMM', 'DESC']],
    attributes: ['salaryYYYYMM'],
  });

  const monthsArray = data.map((e) => e.salaryYYYYMM);

  return monthsArray;
}

async function getSalarySlipByUserIdandMonth(userMasterID, month) {
  const filePath = 'uploads/whatsapp/salaryslip';
  const uploadDir = path.join(__dirname, `../${filePath}`);

  const salarySlip = await HRSalarySlip.findOne({
    where: {
      userMasterID,
      salaryYYYYMM: month,
      salarySlipIssue: 1,
    },
  });

  if (!salarySlip?.path) {
    return null;
  }
  const fileName = `salary-slip-${userMasterID}-${month}-${new Date().getTime()}.pdf`;
  const pdfPath = await saveBase64Pdf(
    salarySlip.path, // base64
    uploadDir,
    fileName,
  );

  console.log('PDF saved at:', pdfPath);

  return `${process.env.APIURL}${filePath}/${fileName}`;
}

const recieveMessageTypeFromWhatsApp = {
  TEXT: 'text',
  INTERACTIVE: 'interactive',
};

function getOriginalMobileNo(userNumber) {
  return String(userNumber).slice(-10);
}

const interactiveMessageType = {
  SALARY_SLIPS: 'salaryslips',
  MY_PROFILE: 'MyProfile',
  MY_Leave_Balance: 'MyLeaveBalance',
};
const interactiveTitleType = {
  SALARY_SLIPS: 'Salary Slips',
  MY_PROFILE: 'My Profile',
  MY_Leave_Balance: 'My Leave Balance',
};
const permissionMap = {
  SalarySlip: {
    id: interactiveMessageType.SALARY_SLIPS,
    title: interactiveTitleType.SALARY_SLIPS,
    description: 'Get your salary slip',
  },
  MyProfile: {
    id: interactiveMessageType.MY_PROFILE,
    title: interactiveTitleType.MY_PROFILE,
    description: 'Get your Profile',
  },
  MyLeaveBalance: {
    id: interactiveMessageType.MY_Leave_Balance,
    title: interactiveTitleType.MY_Leave_Balance,
    description: 'Get your Leave Balance',
  },
};
async function checkUserValidity(userData) {
  try {
    if (!userData) {
      return {
        isValidUser: false,
        message: notRegistered(),
      };
    }

    if (adminSideUserTypesArray.includes(+userData.admin)) {
      return {
        isValidUser: false,
        message: adminNotAllowed(),
      };
    }

    const loginUserCompanyMasterID = +userData.companyMaster?.companyMasterID;

    const companyMasterID =
      +userData.companyMaster?.parentCompanyMasterID === 0
        ? loginUserCompanyMasterID
        : +userData.companyMaster?.parentCompanyMasterID;

    const userCompanySubscription = await subscriptionPlan.findOne({
      where: {
        status: 1,
        companyMasterID,
      },
    });

    const subscriptionValidation = validateSubscription(
      userCompanySubscription,
    );
    if (!subscriptionValidation.isValid) {
      return {
        isValidUser: false,
        message: subscriptionValidation.message,
      };
    }

    return {
      isValidUser: true,
      message: null,
    };
  } catch (error) {
    console.log('Error In checkUserValidity:', error);

    return {
      isValidUser: false,
      message: dataFetchError(),
    };
  }
}

function validateSubscription(subscription) {
  const currDate = asiaKolkataDateTime(new Date()).slice(0, 10);

  if (!subscription) {
    return {
      isValid: false,
      message: noSubscriptionPlan(),
    };
  }

  const { startDate, endDate } = subscription;

  if (!startDate || !endDate) {
    return {
      isValid: false,
      message: noSubscriptionPlan(),
    };
  }

  if (startDate > currDate) {
    return {
      isValid: false,
      message: noSubscriptionPlan(),
    };
  }

  if (endDate < currDate) {
    return {
      isValid: false,
      message: noSubscriptionPlan(),
    };
  }

  return {
    isValid: true,
    message: null,
  };
}
const formNames = {
  SALARY_SLIP: 'SalarySlip',
  MY_PROFILE: 'MyProfile',
  MY_Leave_Balance: 'MyLeaveBalance',
};

const formPermissionArray = [formNames.SALARY_SLIP, formNames.MY_Leave_Balance];
async function getUserRolePermission(userMasterID) {
  const defaultForms = [formNames.MY_PROFILE];

  try {
    const userRole = await UserRole.findOne({
      subQuery: false,
      where: {
        userMasterID,
        status: 1,
      },
      attributes: ['roleMasterID', 'userMasterID'],
    });

    // If no role assigned
    if (!userRole) {
      return defaultForms;
    }

    const userRoleWisePermission = await RolePermission.findAll({
      where: {
        roleMasterID: userRole.roleMasterID,
        operationID: 4,
      },
      include: [
        {
          model: FormMaster,
          attributes: ['formName'],
          where: {
            formName: {
              [Sequelize.Op.in]: formPermissionArray,
            },
          },
        },
      ],
    });

    const allowedForms =
      userRoleWisePermission?.map((perm) => perm?.formMaster?.formName) || [];

    return [...new Set([...defaultForms, ...allowedForms])];
  } catch (error) {
    console.log('Error In getUserRolePermission:', error);
    return defaultForms;
  }
}

const checkPermissionExistInRole = (userRoleForms, formName) =>
  userRoleForms?.includes(formName);

async function getUserProfileData(userMasterID) {
  try {
    const dateFilter = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userMasterIncludeModels = [
      {
        model: companyMaster,
        attributes: ['companyName'],
        include: [
          { required: false, model: CustomizeProfile, attributes: ['fields'] },
        ],
      },
      {
        required: false,
        model: EmployeeJoiningDetails,
        as: 'emp_join',
        attributes: ['employeeCode', 'joiningDate', 'employment', 'dob'],
      },
      {
        required: false,
        model: EmployeeBranch,
        as: 'emp_branch',
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(dateFilter),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(dateFilter),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },

        attributes: ['branchID'],
        include: [
          {
            model: BranchMaster,
            as: 'branchMaster',
            attributes: ['branchName'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeDepartment,
        as: 'emp_dept',
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(dateFilter),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(dateFilter),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },

        attributes: ['departmentID'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentName'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeDesignation,
        as: 'emp_desig',
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(dateFilter),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(dateFilter),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },

        attributes: ['designationID'],
        include: [
          {
            model: Designation,
            as: 'designation',
            attributes: ['designationName'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeDivision,
        as: 'emp_div',
        where: {
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: new Date(dateFilter),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(dateFilter),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: ['divisionId', 'startDate'],
        include: [
          {
            model: Division,
            attributes: ['divisionName'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeWorkingArea,
        as: 'emp_area',
        where: {
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: new Date(dateFilter),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(dateFilter),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: ['workingAreaId'],
        include: [
          {
            model: WorkingArea,
            attributes: ['workingAreaName'],
          },
        ],
      },
    ];
    const user_details = await UserMaster.findOne({
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
      include: userMasterIncludeModels,
    });
    const customizeProfileFieldsArray =
      user_details?.companyMaster?.customizeProfiles?.[0]?.fields || [];

    const dob = user_details?.emp_join?.[0]?.dob;

    const formattedDob = dob ? moment(dob).format('DD-MM-YYYY') : null;
    // helper to check if field should be shown
    const shouldShow = (fieldKey) =>
      customizeProfileFieldsArray.length === 0 ||
      customizeProfileFieldsArray.includes(fieldKey);

    const userObj = {
      employeeCode: parseEmployeeInfoAlias(user_details)?.employeeCode,
      showEmployeeCode: shouldShow(customizeProfileFields.employeeCode),
      displayName: user_details?.displayName || null,
      showUserNumber: shouldShow(customizeProfileFields.contactNo),
      userNumber: user_details?.userNumber || null,
      showEmail: shouldShow(customizeProfileFields.email),
      email: user_details?.email || null,
      showDob: shouldShow(customizeProfileFields.dateOfBirth),
      dob: formattedDob || null,
      showCompany: shouldShow(customizeProfileFields.companyName),
      company: parseEmployeeInfoAlias(user_details)?.companyName,
      showBranch: shouldShow(customizeProfileFields.branch),
      branch: parseEmployeeInfoAlias(user_details)?.branch,
      showDepartment: shouldShow(customizeProfileFields.department),
      department: parseEmployeeInfoAlias(user_details)?.department,
      showDesignation: shouldShow(customizeProfileFields.designation),
      designation: parseEmployeeInfoAlias(user_details)?.designation,
      division: parseEmployeeInfoAlias(user_details)?.division,
      workingArea: parseEmployeeInfoAlias(user_details)?.workingArea,
    };
    return userObj || {};
  } catch (error) {
    throw new Error('Error in Get User Details: ' + error.message);
  }
}
module.exports = {
  getUserDetailsByNumber,
  getLastmonthsYYYYMMExcludeCurrent,
  getLastSixSalarySlipMonth,
  getSalarySlipByUserIdandMonth,
  recieveMessageTypeFromWhatsApp,
  getOriginalMobileNo,
  interactiveMessageType,
  checkUserValidity,
  getUserRolePermission,
  permissionMap,
  checkPermissionExistInRole,
  formNames,
  getUserProfileData,
};
