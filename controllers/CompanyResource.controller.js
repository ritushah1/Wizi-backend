'use strict';
const BranchMaster = require('../models/branchMaster');
const Department = require('../models/department');
const Designation = require('../models/designation');
const Division = require('../models/division');
const WorkingArea = require('../models/workingArea');
const UserMaster = require('../models/userMaster');
const RoleMaster = require('../models/roleMaster');
const UserRole = require('../models/userRole');
const EmployeeBranch = require('../models/employeeBranch');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const companyMaster = require('../models/companyMaster');
const CompanySubscriptionMaster = require('../models/subscriptionPlan');
const { Sequelize } = require('sequelize');
const Op = Sequelize.Op;
const { statusCodes, envType } = require('../utils/commonVars');
const { usermessage } = require('../response_message/message');
const bcrypt = require('bcrypt');
const msHrms = require('../config/database');
const { wizihireUserMasterID } = require('../utils/dbUtils');
const { sendEmailFornewuser } = require('../middleware/sendemail');
const Timezone = require('../models/timezone');
const {
  TIMEZONE,
  projectNamesList,
  ProjectName,
} = require('../utils/labelUtils');
const {
  getTimezone,
  checkAlreayExistUsernumber,
} = require('../utils/commonUtilFunctions');

/**
 * List Branch - Returns list of branches for the company
 * Header: x-api-key
 */
exports.listBranch = async (req, res, next) => {
  try {
    // Get companyMasterID from middleware
    const companyMasterID = req?.company.companyMasterID;

    // Get branches for the company
    const branches = await BranchMaster.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1, // Active status
      },
      attributes: ['branchMasterID', 'branchName', 'branchCode'],
      order: [['branchName', 'ASC']],
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.branchget,
      data: branches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List Department - Returns list of departments for the company
 * Header: x-api-key
 */
exports.listDepartment = async (req, res, next) => {
  try {
    // Get companyMasterID from middleware
    const companyMasterID = req?.company.companyMasterID;

    // Get departments for the company
    const departments = await Department.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1, // Active status
      },
      attributes: ['departmentId', 'departmentName'],
      order: [['departmentName', 'ASC']],
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.departmentget,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List Designation - Returns list of designations for the company
 * Header: x-api-key
 */
exports.listDesignation = async (req, res, next) => {
  try {
    // Get companyMasterID from middleware
    const companyMasterID = req?.company.companyMasterID;

    // Get designations for the company
    const designations = await Designation.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1, // Active status
      },
      attributes: ['designationId', 'designationName'],
      order: [['designationName', 'ASC']],
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.designationget,
      data: designations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List Division - Returns list of divisions for the company
 * Header: x-api-key
 */
exports.listDivision = async (req, res, next) => {
  try {
    // Get companyMasterID from middleware
    const companyMasterID = req?.company.companyMasterID;

    // Get divisions for the company
    const divisions = await Division.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1, // Active status
      },
      attributes: ['id', 'divisionName'],
      order: [['divisionName', 'ASC']],
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Division list retrieved successfully.',
      data: divisions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List WorkingArea - Returns list of working areas for the company
 * Header: x-api-key
 */
exports.listWorkingArea = async (req, res, next) => {
  try {
    // Get companyMasterID from middleware
    const companyMasterID = req?.company.companyMasterID;

    // Get working areas for the company
    const workingAreas = await WorkingArea.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1, // Active status
      },
      attributes: ['id', 'workingAreaName'],
      order: [['workingAreaName', 'ASC']],
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Working area list retrieved successfully.',
      data: workingAreas,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add Candidate - Register a new candidate for the company
 * Header: x-api-key
 * Request body: {
 *   prefix: "",
 *   firstName: "GAGAN",
 *   middleName: "",
 *   lastName: "PATEL",
 *   gender: "Male",
 *   countryCode: "+91",
 *   mobileNo: "9876543210",
 *   password: "sad",
 *   email: "hiteshvdesai@gmail.com",
 *   officialEmail: "",
 *   otherContactNumber: "",
 *   cugNumber: "",
 *   branchId: "branch-id",
 *   departmentId: "department-id",
 *   designationId: "designation-id",
 *   applicableBranchDate: "2026-04-07T18:30:00.000Z",
 *   applicableDepartmentDate: "2026-04-21T18:30:00.000Z",
 *   applicableDesignationDate: "2026-04-14T18:30:00.000Z",
 *   dob: "2026-04-15T18:30:00.000Z",
 *   joiningDate: "2026-04-07T18:30:00.000Z",
 *   employeeType: ""
 * }
 */
exports.addCandidate = async (req, res, next) => {
  const transaction = await msHrms.transaction();
  try {
    // Extract required fields from request body
    const { firstName, mobileNo, password } = req.body;

    // Get companyMasterID from middleware
    const companyMasterID = req?.company.companyMasterID;
    const companyName = req?.company?.company?.dataValues?.companyName || null;

    // Subscription check - Get company data with subscription info
    const existCompanyData = await companyMaster.findOne({
      attributes: ['companyMasterID', 'parentCompanyMasterID'],
      where: { companyMasterID: companyMasterID, status: 1 },
    });

    if (!existCompanyData) {
      await transaction.rollback();
      return res.json({
        status: 404,
        message: usermessage.notFoundMessage('Company'),
      });
    }

    const condition = {
      status: 1,
    };
    if (+existCompanyData.parentCompanyMasterID != 0) {
      // For Child Company
      condition[Sequelize.Op.or] = [
        {
          parentCompanyMasterID: existCompanyData.parentCompanyMasterID,
        },
        {
          companyMasterID: existCompanyData.parentCompanyMasterID,
        },
      ];
    } else {
      // For Child Company
      condition[Sequelize.Op.or] = [
        {
          parentCompanyMasterID: +companyMasterID,
        },
        {
          companyMasterID: +companyMasterID,
        },
      ];
    }
    const companyData = await companyMaster.findAll({
      where: condition,
      include: [
        {
          required: false,
          model: CompanySubscriptionMaster,
          where: { status: 1 },
        },
      ],
    });

    const findParentCompany = companyData.find(
      (e) => +e.parentCompanyMasterID == 0,
    );
    const companyMasterIDs = companyData.map((e) => +e.companyMasterID);

    const companySubscription =
      findParentCompany?.companySubscriptions?.[0] || null;

    if (companySubscription) {
      const totalCompanyUser = await UserMaster.count({
        raw: true,
        where: {
          companyMasterId: {
            [Op.in]: companyMasterIDs,
          },
          status: 1,
        },
      });

      if (totalCompanyUser >= companySubscription.totalUser) {
        await transaction.rollback();
        return res.json({
          status: 401,
          message:
            'Your user limit has been reached. Please upgrade your plan.',
        });
      }
    } else {
      await transaction.rollback();
      return res.json({
        status: 401,
        message: usermessage.usersubscribeplan,
      });
    }

    // Validation
    if (!firstName) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'First name is required.',
      });
    }

    if (!mobileNo) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Mobile number is required.',
      });
    }

    if (!password) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Password is required.',
      });
    }

    let timezoneID = null;

    if (ProjectName == projectNamesList.PIH) {
      timezoneID = (await getTimezone()) || null;
    } else if (ProjectName == projectNamesList.MARS) {
      timezoneID = (await getTimezone()) || null;
    } else {
      timezoneID =
        companyData.find((e) => +e.companyMasterID == +companyMasterID)
          ?.dataValues?.timezoneID ||
        (await getTimezone()) ||
        null;
    }

    // Get optional fields from request body or set to null
    const prefix = req.body.prefix || null;
    const middleName = req.body.middleName || null;
    const lastName = req.body.lastName || null;
    const gender = req.body.gender ? req.body.gender.toLowerCase() : null;
    const countryCode = req.body.countryCode || null;
    const email = req.body.email || null;
    const officialEmail = req.body.officialEmail || null;
    const otherContactNumber = req.body.otherContactNumber || null;
    const cugNumber = req.body.cugNumber || null;
    const branchId = req.body.branchId || null;
    const departmentId = req.body.departmentId || null;
    const designationId = req.body.designationId || null;
    const applicableBranchDate = req.body.applicableBranchDate || null;
    const applicableDepartmentDate = req.body.applicableDepartmentDate || null;
    const applicableDesignationDate =
      req.body.applicableDesignationDate || null;
    const dob = req.body.dob || null;
    const joiningDate = req.body.joiningDate || null;
    const employeeType = req.body.employeeType || null;
    const sendCredentialsInMail = req.body.sendCredentialsInMail
      ? JSON.parse(req.body.sendCredentialsInMail)
      : false;

    // Construct userNumber with country code
    const userNumber = mobileNo;
    // Check if mobile number already exists
    const alreadyExistUserNumberCheck = await checkAlreayExistUsernumber({
      userNumber,
      companyMasterID,
    });

    if (alreadyExistUserNumberCheck.hasUser) {
      await transaction.rollback();
      return res.status(200).json({
        status: alreadyExistUserNumberCheck.status,
        message: alreadyExistUserNumberCheck.message,
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Create user master record
    // Using system user (ID 1) as createBy since this is API-based
    const createBy =
      process.env.NODE_ENV == envType.PRODUCTION
        ? wizihireUserMasterID.PRODUCTION_USERMASTER_ID
        : process.env.NODE_ENV == envType.QA
          ? wizihireUserMasterID.QA_USERMASTER_ID
          : process.env.NODE_ENV == envType.STAGE
            ? wizihireUserMasterID.STAGE_USERMASTER_ID
            : wizihireUserMasterID.LOCAL_USERMASTER_ID;
    const createByIp = req.ip || '0.0.0.0';

    const createdUser = await UserMaster.create(
      {
        firstName: firstName,
        middleName: middleName || null,
        lastName: lastName || null,
        displayName: prefix
          ? `${prefix} ${firstName} ${lastName || ''}`.trim()
          : `${firstName} ${lastName || ''}`.trim(),
        userNumber: userNumber,
        gender: gender || null,
        dob: dob ? new Date(dob).toISOString() : null,
        companyMasterId: companyMasterID,
        password: hashedPassword,
        email: email || null,
        officalEmail: officialEmail || null,
        otherContactNumber: otherContactNumber || null,
        cugNumber: cugNumber || null,
        userNamePrefix: prefix || null,
        userNumberCountryMasterID: +countryCode,
        admin: 0,
        status: '1',
        resetpassword: 1,
        createBy: createBy,
        createByIp: createByIp,
        isonBoarding: '1',
        timezoneID: timezoneID,
      },
      { transaction },
    );

    // Find the Employee role for this company
    const employeeRole = await RoleMaster.findOne({
      where: {
        companyMasterID: companyMasterID,
        roleName: 'Employee',
        status: 1,
      },
    });

    if (employeeRole) {
      // Create userRole entry with default status 1
      await UserRole.create(
        {
          userMasterID: createdUser.userMasterID,
          roleMasterID: employeeRole.roleMasterID,
          status: 1,
          createBy: createBy,
          createByIp: createByIp,
        },
        {
          user: { userMasterId: createBy, userIpAddress: createByIp },
          transaction,
        },
      );
    }

    // Create employee branch record if branchId and applicableBranchDate are provided
    if (branchId && applicableBranchDate) {
      // Parse branchId and validate it
      const parsedBranchId =
        typeof branchId === 'object'
          ? branchId.branchMasterID || branchId.branchId
          : parseInt(branchId);

      // Validate branchId is a valid positive integer
      if (!parsedBranchId || isNaN(parsedBranchId) || parsedBranchId <= 0) {
        await transaction.rollback();
        return res.status(statusCodes.BAD_REQUEST).json({
          status: statusCodes.BAD_REQUEST,
          message: 'Invalid branchId. Please provide a valid branch ID.',
        });
      }

      // Verify the branch exists in branchMasters
      const branchExists = await BranchMaster.findOne({
        where: {
          branchMasterID: parsedBranchId,
          companyMasterID: companyMasterID,
          status: 1,
        },
      });

      if (!branchExists) {
        await transaction.rollback();
        return res.status(statusCodes.BAD_REQUEST).json({
          status: statusCodes.BAD_REQUEST,
          message: 'Branch does not exist or is not active.',
        });
      }

      await EmployeeBranch.create(
        {
          userMasterID: createdUser.userMasterID,
          branchID: parsedBranchId,
          applicableDate: new Date(applicableBranchDate),
          status: '1',
          createBy: createBy,
          createByIp: createByIp,
        },
        { transaction },
      );
    }

    // Create employee department record if departmentId and applicableDepartmentDate are provided
    if (departmentId && applicableDepartmentDate) {
      // Parse departmentId and validate it
      const parsedDepartmentId =
        typeof departmentId === 'object'
          ? departmentId.departmentId || departmentId.departmentID
          : parseInt(departmentId);

      // Validate departmentId is a valid positive integer
      if (
        !parsedDepartmentId ||
        isNaN(parsedDepartmentId) ||
        parsedDepartmentId <= 0
      ) {
        await transaction.rollback();
        return res.status(statusCodes.BAD_REQUEST).json({
          status: statusCodes.BAD_REQUEST,
          message:
            'Invalid departmentId. Please provide a valid department ID.',
        });
      }

      // Verify the department exists
      const departmentExists = await Department.findOne({
        where: {
          departmentId: parsedDepartmentId,
          companyMasterID: companyMasterID,
          status: 1,
        },
      });

      if (!departmentExists) {
        await transaction.rollback();
        return res.status(statusCodes.BAD_REQUEST).json({
          status: statusCodes.BAD_REQUEST,
          message: 'Department does not exist or is not active.',
        });
      }

      await EmployeeDepartment.create(
        {
          userMasterID: createdUser.userMasterID,
          departmentID: parsedDepartmentId,
          applicableDate: new Date(applicableDepartmentDate),
          status: '1',
          createBy: createBy,
          createByIp: createByIp,
        },
        { transaction },
      );
    }

    // Create employee designation record if designationId and applicableDesignationDate are provided
    if (designationId && applicableDesignationDate) {
      // Parse designationId and validate it
      const parsedDesignationId =
        typeof designationId === 'object'
          ? designationId.designationId || designationId.designationID
          : parseInt(designationId);

      // Validate designationId is a valid positive integer
      if (
        !parsedDesignationId ||
        isNaN(parsedDesignationId) ||
        parsedDesignationId <= 0
      ) {
        await transaction.rollback();
        return res.status(statusCodes.BAD_REQUEST).json({
          status: statusCodes.BAD_REQUEST,
          message:
            'Invalid designationId. Please provide a valid designation ID.',
        });
      }

      // Verify the designation exists
      const designationExists = await Designation.findOne({
        where: {
          designationId: parsedDesignationId,
          companyMasterID: companyMasterID,
          status: 1,
        },
      });

      if (!designationExists) {
        await transaction.rollback();
        return res.status(statusCodes.BAD_REQUEST).json({
          status: statusCodes.BAD_REQUEST,
          message: 'Designation does not exist or is not active.',
        });
      }

      await EmployeeDesignation.create(
        {
          userMasterID: createdUser.userMasterID,
          designationID: parsedDesignationId,
          applicableDate: new Date(applicableDesignationDate),
          status: '1',
          createBy: createBy,
          createByIp: createByIp,
        },
        { transaction },
      );
    }

    // Get additional fields for EmployeeJoiningDetails from request body or set to null
    const biometricCode = req.body.biometricCode || null;
    const biometricSerialNo = req.body.biometricSerialNo || null;
    const overtime = req.body.overtime ? parseInt(req.body.overtime) : null;
    const esicNumber = req.body.esicNumber || null;
    const pfNumber = req.body.pfNumber || null;
    const uanNumber = req.body.uanNumber || null;
    const pancard = req.body.pancard || null;
    const adharCard = req.body.adharCard || null;
    const bankAccountNo = req.body.bankAccountNo || null;
    const bankIFSC = req.body.bankIFSC || null;
    const bankMasterID = req.body.bankMasterID
      ? parseInt(req.body.bankMasterID)
      : null;
    const bankBranchID = req.body.bankBranchID
      ? parseInt(req.body.bankBranchID)
      : null;
    const bloodgroup = req.body.bloodgroup || null;
    const nationality = req.body.nationality || null;
    const noticePeriod = req.body.noticePeriod
      ? parseInt(req.body.noticePeriod)
      : null;
    const retirementAge = req.body.retirementAge
      ? parseInt(req.body.retirementAge)
      : null;
    const salarytype = req.body.salarytype || null;

    // Create employee joining details record
    await EmployeeJoiningDetails.create(
      {
        userMasterID: createdUser.userMasterID,
        dob: dob ? dob : null,
        joiningDate: joiningDate ? joiningDate : null,
        biometricCode: biometricCode,
        biometricSerialNo: biometricSerialNo,
        overtime: overtime,
        esicNumber: esicNumber,
        pfNumber: pfNumber,
        uanNumber: uanNumber,
        pancard: pancard,
        adharCard: adharCard,
        bankAccountNo: bankAccountNo,
        bankIFSC: bankIFSC,
        bankMasterID: bankMasterID,
        bankBranchID: bankBranchID,
        bloodgroup: bloodgroup,
        nationality: nationality,
        noticePeriod: noticePeriod,
        retirementAge: retirementAge,
        salarytype: salarytype,
        status: 1,
        createBy: createBy,
        createByIp: createByIp,
        employeeType: employeeType,
      },
      { transaction },
    );

    // Commit the transaction
    await transaction.commit();
    if (sendCredentialsInMail && email) {
      await sendEmailFornewuser({
        email,
        mobile: userNumber,
        password: req.body.password,
        companyName: companyName,
        employeeName: prefix
          ? `${prefix} ${firstName} ${lastName || ''}`.trim()
          : `${firstName} ${lastName || ''}`.trim(),
      });
    }

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.addMessage('Candidate'),
      data: {
        userMasterID: createdUser.userMasterID,
      },
    });
  } catch (error) {
    // Check if transaction is not already finished before rolling back
    if (
      transaction &&
      transaction.finished !== 'commit' &&
      transaction.finished !== 'rollback'
    ) {
      await transaction.rollback();
    }
    next(error);
  }
};
