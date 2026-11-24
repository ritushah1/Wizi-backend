const UserMaster = require('../models/userMaster');
const message = require('../response_message/message');
const readXlsxFile = require('read-excel-file/node');
const { Sequelize } = require('sequelize');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeBranch = require('../models/employeeBranch');
const sequelize = require('../config/database');
const Designation = require('../models/designation');
const Department = require('../models/department');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const BranchMaster = require('../models/branchMaster');
const companyMaster = require('../models/companyMaster');
const fs = require('fs');
const {
  authorizationMasterTypes,
  roleType,
  FileUploadType,
  AuthorizationStatusType,
  authorizationCriteriaType,
} = require('../utils/dbUtils');
const path = require('path');
const {
  asiaKolkataDateTime,
  sendBulkNotification,
} = require('../utils/commonUtilFunctions');
const {
  generateAuthorozationExcelWithUserData,
} = require('../utils/exportData');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const {
  leaveAuthorization,
  shortLeaveAuthorization,
  workFromHomeAuthorization,
  expenseAuthorization,
  expenseAdvanceRequestAuthorization,
  overtimeAuthorization,
  resignationAuthorization,
  attendanceCorrectionAuthorization,
  coffAuthorization,
  extraDaysAuthorization,
  bankDetailRequestAuthorization,
  getPassAuthorization,
  loanRequestAuthorization,
  manPowerRequisitionAuthorization,
  tourRequestAuthorization,
  visitRequestAuthorization,
  salaryIncrementRequestAuthorization,
  SalaryIncrementAuthorization,
  courseAuthorization,
} = require('../utils/AuthorizationFunction');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const SalaryIncrementRequestDetails = require('../models/salaryIncrementRequestDetails');
const SalaryIncrementRequest = require('../models/salaryIncrementRequest');
const HRSalaryMasterFields = require('../models/hrSalaryMaster');

exports.exportAuthorizationDetails = async (req, res, next) => {
  try {
    let { companyMasterID, authorizationMasterID, branchMasterID } = req.query;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (!companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'companyMasterID is required field!',
      });
    }

    // ================= COMPANY =================
    const currCompany = await companyMaster.findOne({
      where: { companyMasterID, status: 1 },
      attributes: [
        'companyMasterID',
        'parentCompanyMasterID',
        'fileUploadType',
      ],
      raw: true,
    });

    let fileUploadType = FileUploadType.MOBILE_NUMBER;
    if (currCompany.fileUploadType === FileUploadType.EMPLOYEE_CODE) {
      fileUploadType = FileUploadType.EMPLOYEE_CODE;
    }
    const companyWhere = {
      status: 1,
    };
    if (+currCompany.parentCompanyMasterID != 0) {
      // For Child Company
      companyWhere[Sequelize.Op.or] = [
        {
          parentCompanyMasterID: currCompany.parentCompanyMasterID,
        },
        {
          companyMasterID: currCompany.parentCompanyMasterID,
        },
      ];
    } else {
      // For Child Company
      companyWhere[Sequelize.Op.or] = [
        {
          parentCompanyMasterID: +companyMasterID,
        },
        {
          companyMasterID: +companyMasterID,
        },
      ];
    }
    const getAllParentChidCompany = await companyMaster.findAll({
      where: companyWhere,
      order: [['companyMasterID', 'ASC']],
    });
    // ================= EMPLOYEE JOINING DETAILS =================
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const allUserJoiningDetails = await EmployeeJoiningDetails.findAll({
      raw: true,
      where: {
        joiningDate: { [Sequelize.Op.lte]: new Date() },
        [Sequelize.Op.or]: [
          { leavingDate: { [Sequelize.Op.gte]: new Date() } },
          {
            leavingDate: null,
            [Sequelize.Op.or]: [
              {
                '$userMaster.deactiveDate$': { [Sequelize.Op.gte]: new Date() },
              },
              { '$userMaster.deactiveDate$': null },
            ],
          },
        ],
        '$userMaster.companyMasterId$': companyMasterID,
        '$userMaster.status$': 1,
        ...(fileUploadType === FileUploadType.EMPLOYEE_CODE && {
          employeeCode: { [Sequelize.Op.ne]: null },
        }),
      },
      include: [
        {
          model: UserMaster,
          where: { ...userAccessCondition.where },
          required: true,
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeDesignation,
              required: false,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: null },
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
              model: EmployeeDepartment,
              required: false,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: null },
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
              model: EmployeeBranch,
              required: !!branchMasterID,
              where: {
                ...(branchMasterID && { branchID: branchMasterID }),
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: null },
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
          ],
        },
      ],
      order: [[{ model: UserMaster }, 'displayName', 'ASC']],
    });

    const userIds = allUserJoiningDetails.map((e) => e.userMasterID);

    const allParentChidCompanyIDs = getAllParentChidCompany.map(
      (e) => e.companyMasterID,
    );

    // ================= USERS & AUTH DATA =================
    const [allUsers, allAuthDetails, authCriteriaMaster] = await Promise.all([
      UserMaster.findAll({
        where: { companyMasterId: allParentChidCompanyIDs, status: 1 },
        attributes: [
          'userMasterID',
          'userNumber',
          'displayName',
          'companyMasterId',
        ],
        include: [
          {
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
            required: fileUploadType === FileUploadType.EMPLOYEE_CODE,
            ...(fileUploadType === FileUploadType.EMPLOYEE_CODE && {
              where: { employeeCode: { [Sequelize.Op.ne]: null } },
            }),
          },
          {
            model: EmployeeBranch,
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(filterDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(filterDate),
                  },
                },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: false,
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
            model: EmployeeDesignation,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
            model: EmployeeDepartment,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
            model: companyMaster,
            required: true,
            attributes: ['companyMasterID', 'companyName'],
          },
        ],
      }),

      AuthorizationDetails.findAll({
        where: { userMasterID: userIds, status: 1 },
        raw: true,
        include: [
          {
            model: AuthorizationCriteriaMaster,
            attributes: ['AuthorizationCriteria'],
          },
        ],
      }),

      AuthorizationCriteriaMaster.findAll({
        raw: true,
        where: { status: 1 },
        attributes: ['AuthorizationCriteria'],
      }),
    ]);

    // ================= MAPS =================
    const userMap = new Map(allUsers.map((u) => [+u.userMasterID, u]));
    const authMap = new Map();
    for (const a of allAuthDetails) {
      authMap.set(`${a.userMasterID}_${a.AuthorizationMasterID}`, a);
    }

    // ================= AUTH CONFIG =================
    const AUTH_CONFIG = [
      { key: 'Leave', id: authorizationMasterTypes.leave },
      { key: 'Expense', id: authorizationMasterTypes.expense },
      { key: 'Overtime', id: authorizationMasterTypes.overtime },
      { key: 'Resignation', id: authorizationMasterTypes.resignation },
      { key: 'GatePass', id: authorizationMasterTypes.employeeGatePass },
      {
        key: 'Attendance Correction',
        id: authorizationMasterTypes.attendanceCorrection,
      },
      { key: 'Compensatory Off', id: authorizationMasterTypes.compensatoryOff },
      {
        key: 'Probation Assessment',
        id: authorizationMasterTypes.probationAssessment,
      },
      { key: 'Statutory Detail', id: authorizationMasterTypes.statutoryDetail },
      { key: 'Loan', id: authorizationMasterTypes.loan },
      {
        key: 'Manpower Requisition',
        id: authorizationMasterTypes.manPowerRequisition,
      },
      { key: 'Tour', id: authorizationMasterTypes.tour },
      { key: 'Visit', id: authorizationMasterTypes.visit },
      { key: 'Salary Structure', id: authorizationMasterTypes.salaryIncrement },
      { key: 'Course', id: authorizationMasterTypes.lmsCourse },
    ];

    const getAuthorizedUsers = (auth) => {
      if (!auth?.AuthorizedByUserMasterId?.length) return '';
      return auth.AuthorizedByUserMasterId.map((id) => {
        const u = userMap.get(+id);
        if (!u) return 'Not Found';
        return fileUploadType === FileUploadType.EMPLOYEE_CODE
          ? u.employeeJoiningDetails?.[0]?.employeeCode || u.displayName
          : u.userNumber;
      }).join(',');
    };

    // ================= FINAL DATA =================
    const finalData = [];

    for (const user of allUserJoiningDetails) {
      const row = {
        'Employee Name': user['userMaster.displayName'],
        Number: user['userMaster.userNumber'],
        'Employee Code': user.employeeCode || '',
        'Branch Name':
          user['userMaster.employeeBranches.branchMaster.branchName'] || '',
        'Department Name':
          user['userMaster.employeeDepartments.department.departmentName'] ||
          '',
        'Designation Name':
          user['userMaster.employeeDesignations.designation.designationName'] ||
          '',
      };

      for (const authType of AUTH_CONFIG) {
        if (
          +authorizationMasterID !== 0 &&
          +authorizationMasterID !== authType.id
        )
          continue;

        const auth = authMap.get(`${user.userMasterID}_${authType.id}`);

        row[`Authorization Master(${authType.key})`] = authType.key;
        row[`Authorization Criteria(${authType.key})`] =
          auth?.['AuthorizationCriteriaMaster.AuthorizationCriteria'] || '';
        row[`Authorized User(${authType.key})`] = getAuthorizedUsers(auth);
      }

      finalData.push(row);
    }

    if (!finalData.length) {
      return res.status(200).json({
        status: 401,
        message: 'No data found to export!',
      });
    }

    const usersByCompany = new Map();

    for (const row of allUsers) {
      const companyId = Number(row.companyMasterId); // ✅ normalize here

      if (!usersByCompany.has(companyId)) {
        usersByCompany.set(companyId, []);
      }

      usersByCompany.get(companyId).push({
        userMasterID: row.userMasterID,
        displayName: row.displayName,
        userNumber: row.userNumber,
        companyMasterId: companyId,

        employeeCode: row.employeeJoiningDetails?.[0]?.employeeCode || '',
        branch: row.employeeBranches?.[0]?.branchMaster?.branchName || '',
        designation:
          row.employeeDesignations?.[0]?.designation?.designationName || '',
        department:
          row.employeeDepartments?.[0]?.department?.departmentName || '',
        company: row.companyMaster?.companyName || '',
      });
    }

    const companyWiseUserData = [];

    for (const company of getAllParentChidCompany) {
      const companyId = Number(company.companyMasterID); // ✅ normalize again
      const companyUsers = usersByCompany.get(companyId);

      if (!companyUsers || companyUsers.length === 0) continue;

      companyWiseUserData.push({
        companyName: company.companyName,
        employeeData: companyUsers,
      });
    }

    return await generateAuthorozationExcelWithUserData(
      finalData,
      authCriteriaMaster,
      authorizationMasterID,
      companyWiseUserData || [],
      'Authorization Details',
      'xlsx',
      res,
    );
  } catch (error) {
    next(error);
  }
};

exports.validatUploadAuthorizationDetails = async (req, res, next) => {
  try {
    if (!req.file)
      return res.status(200).json({ status: 401, message: 'Invalid File' });

    const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);
    const { companyMasterID, authorizationMasterID } = req.body;

    const excelReadData = await readXlsxFile(filePath);
    const firstRow = excelReadData.shift();

    const indexResponse = getAuthorizationHeaderIndexes(firstRow);
    const uploadObject = getUploadAuthorizationObject(authorizationMasterID);
    const validExcel = validateAuthorizationExcelIndex(
      uploadObject,
      indexResponse,
    );

    if (!validExcel) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.passValidValidParameter('Excel'),
      });
    }

    /* ================= COMPANY ================= */
    const currCompany = await companyMaster.findOne({
      where: { companyMasterID, status: 1 },
      attributes: [
        'companyMasterID',
        'parentCompanyMasterID',
        'fileUploadType',
      ],
      raw: true,
    });
    let fileUploadType = FileUploadType.MOBILE_NUMBER;
    if (currCompany.fileUploadType === FileUploadType.EMPLOYEE_CODE) {
      fileUploadType = FileUploadType.EMPLOYEE_CODE;
    }
    const companyWhere = { status: 1 };
    if (+currCompany.parentCompanyMasterID !== 0) {
      companyWhere[Sequelize.Op.or] = [
        { parentCompanyMasterID: currCompany.parentCompanyMasterID },
        { companyMasterID: currCompany.parentCompanyMasterID },
      ];
    } else {
      companyWhere[Sequelize.Op.or] = [
        { parentCompanyMasterID: +companyMasterID },
        { companyMasterID: +companyMasterID },
      ];
    }

    const getAllParentChidCompany = await companyMaster.findAll({
      where: companyWhere,
      order: [['companyMasterID', 'ASC']],
    });
    const allParentChidCompanyIDs = getAllParentChidCompany.map(
      (e) => e.companyMasterID,
    );
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const [allUserJoiningDetails, AuthCriteria, allEmployees] =
      await Promise.all([
        EmployeeJoiningDetails.findAll({
          raw: true,
          where: {
            joiningDate: { [Sequelize.Op.lte]: new Date() },
            [Sequelize.Op.or]: [
              { leavingDate: { [Sequelize.Op.gte]: new Date() } },
              {
                leavingDate: { [Sequelize.Op.eq]: null },
                [Sequelize.Op.or]: [
                  {
                    '$userMaster.deactiveDate$': {
                      [Sequelize.Op.gte]: new Date(),
                    },
                  },
                  {
                    '$userMaster.deactiveDate$': {
                      [Sequelize.Op.eq]: null,
                    },
                  },
                ],
              },
            ],
            '$userMaster.companyMasterId$': companyMasterID,
            '$userMaster.status$': 1,
            ...(fileUploadType === FileUploadType.EMPLOYEE_CODE && {
              employeeCode: { [Sequelize.Op.ne]: null },
            }),
          },
          include: [
            {
              model: UserMaster,
              required: true,
              where: { ...userAccessCondition.where },
              include: [...userAccessCondition.includeModels],
            },
          ],
        }),
        AuthorizationCriteriaMaster.findAll({
          raw: true,
          where: { status: 1 },
          attributes: ['AuthorizationCriteriaID', 'AuthorizationCriteria'],
        }),
        UserMaster.findAll({
          where: { companyMasterId: allParentChidCompanyIDs, status: 1 },
          raw: true,
          attributes: [
            'displayName',
            'userMasterID',
            'userNumber',
            'companyMasterId',
          ],
          include: [
            {
              model: EmployeeJoiningDetails,
              attributes: ['employeeJoiningDetailId', 'employeeCode'],
              required: fileUploadType === FileUploadType.EMPLOYEE_CODE,
            },
          ],
        }),
      ]);

    const data = [];
    const duplicateUser = new Set();

    for (const row of excelReadData) {
      const authorizationData = {
        userName: row[indexResponse.employeeNameIndex] || null,
        userNumber: row[indexResponse.employeeNumberIndex]
          ? row[indexResponse.employeeNumberIndex].toString().trim()
          : null,
        employeeCode: row[indexResponse.employeeCodeIndex]
          ? row[indexResponse.employeeCodeIndex].toString().trim()
          : null,
        branch: row[indexResponse.branchNameIndex] || null,
        department: row[indexResponse.departmentNameIndex] || null,
        designation: row[indexResponse.designationNameIndex] || null,
        companyMasterID,
        remarks: [],
        userMasterID: null,
        leave: null,
        expense: null,
        overtime: null,
        resignation: null,
        gatepass: null,
        attendanceCorrection: null,
        compensatoryOff: null,
        probationAssessment: null,
        statutoryDetail: null,
        manPowerRequisition: null,
        tour: null,
        visit: null,
        course: null,
      };
      let skipRow = false;
      if (
        fileUploadType === FileUploadType.MOBILE_NUMBER &&
        !authorizationData.userNumber
      ) {
        authorizationData.remarks.push(`Please enter a valid Mobile Number!`);
        skipRow = true;
      }

      if (
        fileUploadType === FileUploadType.EMPLOYEE_CODE &&
        !authorizationData.employeeCode
      ) {
        authorizationData.remarks.push(`Please enter a valid Employee Code!`);
        skipRow = true;
      }

      if (
        authorizationData.userNumber &&
        duplicateUser.has(authorizationData.userNumber)
      ) {
        authorizationData.remarks.push(`Duplicate Mobile Number found!`);
        skipRow = true;
      }

      if (
        authorizationData.employeeCode &&
        duplicateUser.has(authorizationData.employeeCode)
      ) {
        authorizationData.remarks.push(`Duplicate Employee Code found!`);
        skipRow = true;
      }

      if (skipRow) {
        data.push(authorizationData);
        continue;
      }

      duplicateUser.add(authorizationData.userNumber);
      if (authorizationData.employeeCode)
        duplicateUser.add(authorizationData.employeeCode);

      const findUser =
        fileUploadType === FileUploadType.EMPLOYEE_CODE
          ? allUserJoiningDetails.find(
              (u) => u.employeeCode === authorizationData.employeeCode,
            )
          : allUserJoiningDetails.find(
              (u) =>
                u['userMaster.userNumber'] === authorizationData.userNumber,
            );

      if (!findUser) {
        authorizationData.remarks.push(
          fileUploadType === FileUploadType.EMPLOYEE_CODE
            ? `User with Employee Code ${authorizationData.employeeCode} does not exist!`
            : `User with Mobile Number ${authorizationData.userNumber} does not exist!`,
        );
        data.push(authorizationData);
        continue;
      }

      authorizationData.userMasterID = findUser.userMasterID;

      const AUTH_CONFIG = [
        {
          key: 'leave',
          name: 'Leave',
          masterID: authorizationMasterTypes.leave,
          criteriaIdx: indexResponse.leaveAuthCriteriaIndex,
          userIdx: indexResponse.leaveAuthUserIndex,
        },
        {
          key: 'expense',
          name: 'Expense',
          masterID: authorizationMasterTypes.expense,
          criteriaIdx: indexResponse.expenseAuthCriteriaIndex,
          userIdx: indexResponse.expenseAuthUserIndex,
        },
        {
          key: 'overtime',
          name: 'Overtime',
          masterID: authorizationMasterTypes.overtime,
          criteriaIdx: indexResponse.overtimeAuthCriteriaIndex,
          userIdx: indexResponse.overtimeAuthUserIndex,
        },
        {
          key: 'resignation',
          name: 'Resignation',
          masterID: authorizationMasterTypes.resignation,
          criteriaIdx: indexResponse.resignationAuthCriteriaIndex,
          userIdx: indexResponse.resignationAuthUserIndex,
        },
        {
          key: 'gatepass',
          name: 'GatePass',
          masterID: authorizationMasterTypes.employeeGatePass,
          criteriaIdx: indexResponse.gatePassAuthCriteriaIndex,
          userIdx: indexResponse.gatePassAuthUserIndex,
        },
        {
          key: 'attendanceCorrection',
          name: 'Attendance Correction',
          masterID: authorizationMasterTypes.attendanceCorrection,
          criteriaIdx: indexResponse.attendanceCorrectionAuthCriteriaIndex,
          userIdx: indexResponse.attendanceCorrectionAuthUserIndex,
        },
        {
          key: 'compensatoryOff',
          name: 'Compensatory Off',
          masterID: authorizationMasterTypes.compensatoryOff,
          criteriaIdx: indexResponse.compOffAuthCriteriaIndex,
          userIdx: indexResponse.compOffAuthUserIndex,
        },
        {
          key: 'probationAssessment',
          name: 'Probation Assessment',
          masterID: authorizationMasterTypes.probationAssessment,
          criteriaIdx: indexResponse.probationAssessmentAuthCriteriaIndex,
          userIdx: indexResponse.probationAssessmentAuthUserIndex,
        },
        {
          key: 'statutoryDetail',
          name: 'Statutory Detail',
          masterID: authorizationMasterTypes.statutoryDetail,
          criteriaIdx: indexResponse.statutoryDetailAuthCriteriaIndex,
          userIdx: indexResponse.statutoryDetailAuthUserIndex,
        },
        {
          key: 'loan',
          name: 'Loan',
          masterID: authorizationMasterTypes.loan,
          criteriaIdx: indexResponse.loanAuthCriteriaIndex,
          userIdx: indexResponse.loanAuthUserIndex,
        },
        {
          key: 'manPowerRequisition',
          name: 'Manpower Requisition',
          masterID: authorizationMasterTypes.manPowerRequisition,
          criteriaIdx: indexResponse.manPowerAuthCriteriaIndex,
          userIdx: indexResponse.manPowerAuthUserIndex,
        },
        {
          key: 'tour',
          name: 'Tour',
          masterID: authorizationMasterTypes.tour,
          criteriaIdx: indexResponse.tourAuthCriteriaIndex,
          userIdx: indexResponse.tourAuthUserIndex,
        },
        {
          key: 'visit',
          name: 'Visit',
          masterID: authorizationMasterTypes.visit,
          criteriaIdx: indexResponse.visitAuthCriteriaIndex,
          userIdx: indexResponse.visitAuthUserIndex,
        },
        {
          key: 'salaryIncrement',
          name: 'Salary Structure',
          masterID: authorizationMasterTypes.salaryIncrement,
          criteriaIdx: indexResponse.salaryIncrementAuthCriteriaIndex,
          userIdx: indexResponse.salaryIncrementAuthUserIndex,
        },
        {
          key: 'course',
          name: 'Course',
          masterID: authorizationMasterTypes.lmsCourse,
          criteriaIdx: indexResponse.courseAuthCriteriaIndex,
          userIdx: indexResponse.courseAuthUserIndex,
        },
      ];

      for (const cfg of AUTH_CONFIG) {
        if (
          +authorizationMasterID !== 0 &&
          cfg.masterID != authorizationMasterID
        )
          continue;

        const result = processAuthorization({
          row,
          criteriaIdx: cfg.criteriaIdx,
          userIdx: cfg.userIdx,
          authName: cfg.name,
          authMasterID: cfg.masterID,
          AuthCriteria,
          allEmployees,
          currCompany,
          FileUploadType,
          authorizationData,
        });

        if (result?.stop) {
          stopRow = true;
          break;
        }

        if (result?.authorizedData) {
          authorizationData[cfg.key] = result.authorizedData;
        }
      }

      data.push(authorizationData);
    }

    fs.unlinkSync(filePath);

    return res.status(200).json({
      status: 200,
      message: 'Authorization Validate Successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

exports.addUpdateAuthorization = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { authorizationData, authorizationMasterID, companyMasterID } =
      req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const allAddUpdateAuthUserIDs = authorizationData.map(
      (e) => e.userMasterID,
    );
    const findAllUserAuthorizationDetails = await AuthorizationDetails.findAll({
      where: {
        userMasterID: allAddUpdateAuthUserIDs,
        status: 1,
        ...(authorizationMasterID !== 0 && {
          AuthorizationMasterID: authorizationMasterID,
        }),
      },
    });
    const bulkNotificationObject = [];
    for (let row of authorizationData) {
      const userID = row.userMasterID;
      const findUserAuthDetails = findAllUserAuthorizationDetails.filter(
        (e) => e.userMasterID == userID,
      );
      // Leave , Short Leave , Work From Home
      if (
        authorizationMasterID == 0 ||
        authorizationMasterID == authorizationMasterTypes.leave
      ) {
        const findLeaveAuth =
          findUserAuthDetails?.find(
            (auth) =>
              auth.AuthorizationMasterID == authorizationMasterTypes.leave,
          ) || null;

        let shouldExecuteLeaveFunctionCode = false;

        // ----------------------- REMOVE LEAVE AUTH -----------------------
        if (!row.leave) {
          if (findLeaveAuth) {
            // Delete Auth
            await deleteAuthorizationDetails(
              createBy,
              createByIp,
              findLeaveAuth.AuthorizationDetailsId,
              authorizationMasterTypes.leave,
            );
            // Leave
            await leaveAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );

            // Short Leave
            await shortLeaveAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );

            // Work From Home
            await workFromHomeAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );
          }
        } else {
          // ----------------------- COMMON DATA -----------------------
          const toBeLeaveAuthorizedByUserMasterIds =
            row.leave.authorizedUsers.map((u) => u.userMasterID);

          const leaveAuthCriteria = row.leave.authorizationCriteriaID;

          const leaveAuthorizationStatus =
            leaveAuthCriteria === authorizationCriteriaType.SEQUENCENO
              ? AuthorizationStatusType.PEDING_TWO
              : AuthorizationStatusType.PEDING_ONE;

          const leaveAuthUserData = await UserMaster.findAll({
            distinct: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]: toBeLeaveAuthorizedByUserMasterIds,
              },
            },
            attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
          });

          const leaveIosTokens = [];
          const leaveAndroidTokens = [];

          leaveAuthUserData.forEach(({ deviceType, firebaseToken }) => {
            if (!firebaseToken) return;
            if (deviceType === 'ios') leaveIosTokens.push(firebaseToken);
            if (deviceType === 'android')
              leaveAndroidTokens.push(firebaseToken);
          });

          // ----------------------- SHOULD EXECUTE -----------------------
          if (!findLeaveAuth) {
            shouldExecuteLeaveFunctionCode = true;
          } else {
            const isSameAuthUsers = arraysAreIdentical(
              findLeaveAuth.AuthorizedByUserMasterId,
              toBeLeaveAuthorizedByUserMasterIds,
            );

            if (
              findLeaveAuth.AuthorizationCriteriaID !== leaveAuthCriteria ||
              !isSameAuthUsers
            ) {
              shouldExecuteLeaveFunctionCode = true;
            }
          }

          // ----------------------- EXECUTION -----------------------
          if (shouldExecuteLeaveFunctionCode) {
            let FromAmount = Array(
              toBeLeaveAuthorizedByUserMasterIds.length,
            ).fill(0);
            let ToAmount = Array(
              toBeLeaveAuthorizedByUserMasterIds.length,
            ).fill(0);
            let RequiredAuthorizationMessage = Array(
              toBeLeaveAuthorizedByUserMasterIds.length,
            ).fill(1);
            let SequenceNo = [];
            if (+leaveAuthCriteria === authorizationCriteriaType.SEQUENCENO) {
              SequenceNo = toBeLeaveAuthorizedByUserMasterIds.map(
                (_, index) => index + 1,
              );
            } else {
              SequenceNo = Array(
                toBeLeaveAuthorizedByUserMasterIds.length,
              ).fill(0);
            }
            if (findLeaveAuth) {
              const updateObj = {
                AuthorizationMasterID: authorizationMasterTypes.leave,
                AuthorizedByUserMasterId: toBeLeaveAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: leaveAuthCriteria,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                updateBy: createBy,
                updateByIp: createByIp,
              };
              await updateAuthorizationDetails(
                updateObj,
                findLeaveAuth.AuthorizationDetailsId,
                authorizationMasterTypes.leave,
                transaction,
              );
            } else {
              const createObj = {
                AuthorizationMasterID: authorizationMasterTypes.leave,
                AuthorizedByUserMasterId: toBeLeaveAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: leaveAuthCriteria,
                userMasterID: userID,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                createBy,
                createByIp,
              };

              await createAuthorizationDetails(createObj, transaction);
            }
            // Leave
            const leaveNotificationData = await leaveAuthorization(
              req,
              [userID],
              leaveAuthorizationStatus,
              leaveAuthCriteria,
              toBeLeaveAuthorizedByUserMasterIds,
              createBy,
              createByIp,
              createByIp,
              leaveIosTokens,
              leaveAndroidTokens,
              transaction,
            );
            bulkNotificationObject.push(...leaveNotificationData);

            // Short Leave
            const shortLeaveNotificationData = await shortLeaveAuthorization(
              req,
              [userID],
              leaveAuthorizationStatus,
              leaveAuthCriteria,
              toBeLeaveAuthorizedByUserMasterIds,
              createBy,
              createByIp,
              createByIp,
              leaveIosTokens,
              leaveAndroidTokens,
              transaction,
            );
            bulkNotificationObject.push(...shortLeaveNotificationData);

            // Work From Home
            const workFromHomeNotificationData =
              await workFromHomeAuthorization(
                req,
                [userID],
                leaveAuthorizationStatus,
                leaveAuthCriteria,
                toBeLeaveAuthorizedByUserMasterIds,
                createBy,
                createByIp,
                createByIp,
                leaveIosTokens,
                leaveAndroidTokens,
                transaction,
              );
            bulkNotificationObject.push(...workFromHomeNotificationData);
          }
        }
      }

      // Expense
      if (
        authorizationMasterID == 0 ||
        authorizationMasterID == authorizationMasterTypes.expense
      ) {
        const findExpenseAuth =
          findUserAuthDetails?.find(
            (auth) =>
              auth.AuthorizationMasterID == authorizationMasterTypes.expense,
          ) || null;

        let shouldExecuteExpenseFunctionCode = false;

        // ----------------------- REMOVE Expense AUTH -----------------------
        if (!row.expense) {
          if (findExpenseAuth) {
            // Delete Auth
            await deleteAuthorizationDetails(
              createBy,
              createByIp,
              findExpenseAuth.AuthorizationDetailsId,
              authorizationMasterTypes.expense,
            );
            await expenseAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );
            await expenseAdvanceRequestAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,

              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );
          }
        } else {
          // ----------------------- COMMON DATA -----------------------
          const toBeExpenseAuthorizedByUserMasterIds =
            row.expense.authorizedUsers.map((u) => u.userMasterID);

          const expenseAuthCriteria = row.expense.authorizationCriteriaID;

          const expenseAuthorizationStatus =
            expenseAuthCriteria === authorizationCriteriaType.SEQUENCENO
              ? AuthorizationStatusType.PEDING_TWO
              : AuthorizationStatusType.PEDING_ONE;

          const expenseAuthUserData = await UserMaster.findAll({
            distinct: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]: toBeExpenseAuthorizedByUserMasterIds,
              },
            },
            attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
          });

          const expenseIosTokens = [];
          const expenseAndroidTokens = [];

          expenseAuthUserData.forEach(({ deviceType, firebaseToken }) => {
            if (!firebaseToken) return;
            if (deviceType === 'ios') expenseIosTokens.push(firebaseToken);
            if (deviceType === 'android')
              expenseAndroidTokens.push(firebaseToken);
          });

          // ----------------------- SHOULD EXECUTE -----------------------
          if (!findExpenseAuth) {
            shouldExecuteExpenseFunctionCode = true;
          } else {
            const isSameAuthUsers = arraysAreIdentical(
              findExpenseAuth.AuthorizedByUserMasterId,
              toBeExpenseAuthorizedByUserMasterIds,
            );

            if (
              findExpenseAuth.AuthorizationCriteriaID !== expenseAuthCriteria ||
              !isSameAuthUsers
            ) {
              shouldExecuteExpenseFunctionCode = true;
            }
          }

          // ----------------------- EXECUTION -----------------------
          if (shouldExecuteExpenseFunctionCode) {
            let FromAmount = Array(
              toBeExpenseAuthorizedByUserMasterIds.length,
            ).fill(0);
            let ToAmount = Array(
              toBeExpenseAuthorizedByUserMasterIds.length,
            ).fill(0);
            let RequiredAuthorizationMessage = Array(
              toBeExpenseAuthorizedByUserMasterIds.length,
            ).fill(1);
            let SequenceNo = [];
            if (+expenseAuthCriteria === authorizationCriteriaType.SEQUENCENO) {
              SequenceNo = toBeExpenseAuthorizedByUserMasterIds.map(
                (_, index) => index + 1,
              );
            } else {
              SequenceNo = Array(
                toBeExpenseAuthorizedByUserMasterIds.length,
              ).fill(0);
            }
            if (findExpenseAuth) {
              const updateObj = {
                AuthorizationMasterID: authorizationMasterTypes.expense,
                AuthorizedByUserMasterId: toBeExpenseAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: expenseAuthCriteria,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                updateBy: createBy,
                updateByIp: createByIp,
              };
              await updateAuthorizationDetails(
                updateObj,
                findExpenseAuth.AuthorizationDetailsId,
                authorizationMasterTypes.expense,
                transaction,
              );
            } else {
              const createObj = {
                AuthorizationMasterID: authorizationMasterTypes.expense,
                AuthorizedByUserMasterId: toBeExpenseAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: expenseAuthCriteria,
                userMasterID: userID,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                createBy,
                createByIp,
              };

              await createAuthorizationDetails(createObj, transaction);
            }
            const expenseNotificationData = await expenseAuthorization(
              req,
              [userID],
              expenseAuthorizationStatus,
              expenseAuthCriteria,
              toBeExpenseAuthorizedByUserMasterIds,
              createBy,
              createByIp,
              createByIp,
              expenseIosTokens,
              expenseAndroidTokens,
              transaction,
            );
            //Expense Firebase Notification pushed
            bulkNotificationObject.push(...expenseNotificationData);
            const expenseAdvanceRequestNotificationData =
              await expenseAdvanceRequestAuthorization(
                req,
                [userID],
                expenseAuthorizationStatus,
                expenseAuthCriteria,
                toBeExpenseAuthorizedByUserMasterIds,
                createBy,
                createByIp,
                createByIp,
                expenseIosTokens,
                expenseAndroidTokens,
                transaction,
              );

            //Expense Advance Request Firebase Notification pushed
            bulkNotificationObject.push(
              ...expenseAdvanceRequestNotificationData,
            );
          }
        }
      }

      // Overtime
      if (
        authorizationMasterID == 0 ||
        authorizationMasterID == authorizationMasterTypes.overtime
      ) {
        const findOvertimeAuth =
          findUserAuthDetails?.find(
            (auth) =>
              auth.AuthorizationMasterID == authorizationMasterTypes.overtime,
          ) || null;

        let shouldExecuteOvertimeFunctionCode = false;

        // ----------------------- REMOVE Overtime AUTH -----------------------
        if (!row.overtime) {
          if (findOvertimeAuth) {
            // Delete Auth
            await deleteAuthorizationDetails(
              createBy,
              createByIp,
              findOvertimeAuth.AuthorizationDetailsId,
              authorizationMasterTypes.overtime,
            );
            await overtimeAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );
          }
        } else {
          // ----------------------- COMMON DATA -----------------------
          const toBeOvertimeAuthorizedByUserMasterIds =
            row.overtime.authorizedUsers.map((u) => u.userMasterID);

          const overtimeAuthCriteria = row.overtime.authorizationCriteriaID;

          const overtimeAuthorizationStatus =
            overtimeAuthCriteria === authorizationCriteriaType.SEQUENCENO
              ? AuthorizationStatusType.PEDING_TWO
              : AuthorizationStatusType.PEDING_ONE;

          const overtimeAuthUserData = await UserMaster.findAll({
            distinct: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]: toBeOvertimeAuthorizedByUserMasterIds,
              },
            },
            attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
          });

          const overtimeIosTokens = [];
          const overtimeAndroidTokens = [];

          overtimeAuthUserData.forEach(({ deviceType, firebaseToken }) => {
            if (!firebaseToken) return;
            if (deviceType === 'ios') overtimeIosTokens.push(firebaseToken);
            if (deviceType === 'android')
              overtimeAndroidTokens.push(firebaseToken);
          });

          // ----------------------- SHOULD EXECUTE -----------------------
          if (!findOvertimeAuth) {
            shouldExecuteOvertimeFunctionCode = true;
          } else {
            const isSameAuthUsers = arraysAreIdentical(
              findOvertimeAuth.AuthorizedByUserMasterId,
              toBeOvertimeAuthorizedByUserMasterIds,
            );

            if (
              findOvertimeAuth.AuthorizationCriteriaID !==
                overtimeAuthCriteria ||
              !isSameAuthUsers
            ) {
              shouldExecuteOvertimeFunctionCode = true;
            }
          }

          // ----------------------- EXECUTION -----------------------
          if (shouldExecuteOvertimeFunctionCode) {
            let FromAmount = Array(
              toBeOvertimeAuthorizedByUserMasterIds.length,
            ).fill(0);
            let ToAmount = Array(
              toBeOvertimeAuthorizedByUserMasterIds.length,
            ).fill(0);
            let RequiredAuthorizationMessage = Array(
              toBeOvertimeAuthorizedByUserMasterIds.length,
            ).fill(1);
            let SequenceNo = [];
            if (
              (+overtimeAuthCriteria ===
                authorizationCriteriaType.SEQUENCENO) ===
              5
            ) {
              SequenceNo = toBeOvertimeAuthorizedByUserMasterIds.map(
                (_, index) => index + 1,
              );
            } else {
              SequenceNo = Array(
                toBeOvertimeAuthorizedByUserMasterIds.length,
              ).fill(0);
            }
            if (findOvertimeAuth) {
              const updateObj = {
                AuthorizationMasterID: authorizationMasterTypes.overtime,
                AuthorizedByUserMasterId: toBeOvertimeAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: overtimeAuthCriteria,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                updateBy: createBy,
                updateByIp: createByIp,
              };
              await updateAuthorizationDetails(
                updateObj,
                findOvertimeAuth.AuthorizationDetailsId,
                authorizationMasterTypes.overtime,
                transaction,
              );
            } else {
              const createObj = {
                AuthorizationMasterID: authorizationMasterTypes.overtime,
                AuthorizedByUserMasterId: toBeOvertimeAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: overtimeAuthCriteria,
                userMasterID: userID,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                createBy,
                createByIp,
              };

              await createAuthorizationDetails(createObj, transaction);
            }
            const overTimeNotificationData = await overtimeAuthorization(
              req,
              [userID],
              overtimeAuthorizationStatus,
              overtimeAuthCriteria,
              toBeOvertimeAuthorizedByUserMasterIds,
              createBy,
              createByIp,
              createByIp,
              overtimeIosTokens,
              overtimeAndroidTokens,
              transaction,
            );
            //Overtime Firebase Notification pushed
            bulkNotificationObject.push(...overTimeNotificationData);
          }
        }
      }

      // Resignation
      if (
        authorizationMasterID == 0 ||
        authorizationMasterID == authorizationMasterTypes.resignation
      ) {
        const findResignationAuth =
          findUserAuthDetails?.find(
            (auth) =>
              auth.AuthorizationMasterID ==
              authorizationMasterTypes.resignation,
          ) || null;

        let shouldExecuteResignationFunctionCode = false;

        // ----------------------- REMOVE Resignation AUTH -----------------------
        if (!row.resignation) {
          if (findResignationAuth) {
            // Delete Auth
            await deleteAuthorizationDetails(
              createBy,
              createByIp,
              findResignationAuth.AuthorizationDetailsId,
              authorizationMasterTypes.resignation,
            );
            await resignationAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );
          }
        } else {
          // ----------------------- COMMON DATA -----------------------
          const toBeResignationAuthorizedByUserMasterIds =
            row.resignation.authorizedUsers.map((u) => u.userMasterID);

          const resignationAuthCriteria =
            row.resignation.authorizationCriteriaID;

          const resignationAuthorizationStatus =
            resignationAuthCriteria === authorizationCriteriaType.SEQUENCENO
              ? AuthorizationStatusType.PEDING_TWO
              : AuthorizationStatusType.PEDING_ONE;

          const resignationAuthUserData = await UserMaster.findAll({
            distinct: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]: toBeResignationAuthorizedByUserMasterIds,
              },
            },
            attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
          });

          const resignationIosTokens = [];
          const resignationAndroidTokens = [];

          resignationAuthUserData.forEach(({ deviceType, firebaseToken }) => {
            if (!firebaseToken) return;
            if (deviceType === 'ios') resignationIosTokens.push(firebaseToken);
            if (deviceType === 'android')
              resignationAndroidTokens.push(firebaseToken);
          });

          // ----------------------- SHOULD EXECUTE -----------------------
          if (!findResignationAuth) {
            shouldExecuteResignationFunctionCode = true;
          } else {
            const isSameAuthUsers = arraysAreIdentical(
              findResignationAuth.AuthorizedByUserMasterId,
              toBeResignationAuthorizedByUserMasterIds,
            );

            if (
              findResignationAuth.AuthorizationCriteriaID !==
                resignationAuthCriteria ||
              !isSameAuthUsers
            ) {
              shouldExecuteResignationFunctionCode = true;
            }
          }

          // ----------------------- EXECUTION -----------------------
          if (shouldExecuteResignationFunctionCode) {
            let FromAmount = Array(
              toBeResignationAuthorizedByUserMasterIds.length,
            ).fill(0);
            let ToAmount = Array(
              toBeResignationAuthorizedByUserMasterIds.length,
            ).fill(0);
            let RequiredAuthorizationMessage = Array(
              toBeResignationAuthorizedByUserMasterIds.length,
            ).fill(1);
            let SequenceNo = [];
            if (
              +resignationAuthCriteria === authorizationCriteriaType.SEQUENCENO
            ) {
              SequenceNo = toBeResignationAuthorizedByUserMasterIds.map(
                (_, index) => index + 1,
              );
            } else {
              SequenceNo = Array(
                toBeResignationAuthorizedByUserMasterIds.length,
              ).fill(0);
            }
            if (findResignationAuth) {
              const updateObj = {
                AuthorizationMasterID: authorizationMasterTypes.resignation,
                AuthorizedByUserMasterId:
                  toBeResignationAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: resignationAuthCriteria,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                updateBy: createBy,
                updateByIp: createByIp,
              };
              await updateAuthorizationDetails(
                updateObj,
                findResignationAuth.AuthorizationDetailsId,
                authorizationMasterTypes.resignation,
                transaction,
              );
            } else {
              const createObj = {
                AuthorizationMasterID: authorizationMasterTypes.resignation,
                AuthorizedByUserMasterId:
                  toBeResignationAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: resignationAuthCriteria,
                userMasterID: userID,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                createBy,
                createByIp,
              };

              await createAuthorizationDetails(createObj, transaction);
            }
            const resignationNotificationData = await resignationAuthorization(
              req,
              [userID],
              resignationAuthorizationStatus,
              resignationAuthCriteria,
              toBeResignationAuthorizedByUserMasterIds,
              createBy,
              createByIp,
              createByIp,
              resignationIosTokens,
              resignationAndroidTokens,
              transaction,
            );

            //Resignation Firebase Notification pushed
            bulkNotificationObject.push(...resignationNotificationData);
          }
        }
      }

      // Employee Gate Pass
      if (
        authorizationMasterID == 0 ||
        authorizationMasterID == authorizationMasterTypes.employeeGatePass
      ) {
        const findEmployeeGatepassAuth =
          findUserAuthDetails?.find(
            (auth) =>
              auth.AuthorizationMasterID ==
              authorizationMasterTypes.employeeGatePass,
          ) || null;

        let shouldExecuteEmployeeGatepassFunctionCode = false;

        // ----------------------- REMOVE Employee Gatepass AUTH -----------------------
        if (!row.gatepass) {
          if (findEmployeeGatepassAuth) {
            // Delete Auth
            await deleteAuthorizationDetails(
              createBy,
              createByIp,
              findEmployeeGatepassAuth.AuthorizationDetailsId,
              authorizationMasterTypes.employeeGatePass,
            );
            await getPassAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );
          }
        } else {
          // ----------------------- COMMON DATA -----------------------
          const toBeEmployeeGatepassAuthorizedByUserMasterIds =
            row.gatepass.authorizedUsers.map((u) => u.userMasterID);

          const employeeGatepassAuthCriteria =
            row.gatepass.authorizationCriteriaID;

          const employeeGatepassAuthorizationStatus =
            employeeGatepassAuthCriteria ===
            authorizationCriteriaType.SEQUENCENO
              ? AuthorizationStatusType.PEDING_TWO
              : AuthorizationStatusType.PEDING_ONE;

          const employeeGatepassAuthUserData = await UserMaster.findAll({
            distinct: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]:
                  toBeEmployeeGatepassAuthorizedByUserMasterIds,
              },
            },
            attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
          });

          const employeeGatePassIosTokens = [];
          const employeeGatePassAndroidTokens = [];

          employeeGatepassAuthUserData.forEach(
            ({ deviceType, firebaseToken }) => {
              if (!firebaseToken) return;
              if (deviceType === 'ios')
                employeeGatePassIosTokens.push(firebaseToken);
              if (deviceType === 'android')
                employeeGatePassAndroidTokens.push(firebaseToken);
            },
          );

          // ----------------------- SHOULD EXECUTE -----------------------
          if (!findEmployeeGatepassAuth) {
            shouldExecuteEmployeeGatepassFunctionCode = true;
          } else {
            const isSameAuthUsers = arraysAreIdentical(
              findEmployeeGatepassAuth.AuthorizedByUserMasterId,
              toBeEmployeeGatepassAuthorizedByUserMasterIds,
            );

            if (
              findEmployeeGatepassAuth.AuthorizationCriteriaID !==
                employeeGatepassAuthCriteria ||
              !isSameAuthUsers
            ) {
              shouldExecuteEmployeeGatepassFunctionCode = true;
            }
          }

          // ----------------------- EXECUTION -----------------------
          if (shouldExecuteEmployeeGatepassFunctionCode) {
            let FromAmount = Array(
              toBeEmployeeGatepassAuthorizedByUserMasterIds.length,
            ).fill(0);
            let ToAmount = Array(
              toBeEmployeeGatepassAuthorizedByUserMasterIds.length,
            ).fill(0);
            let RequiredAuthorizationMessage = Array(
              toBeEmployeeGatepassAuthorizedByUserMasterIds.length,
            ).fill(1);
            let SequenceNo = [];
            if (
              +employeeGatepassAuthCriteria ===
              authorizationCriteriaType.SEQUENCENO
            ) {
              SequenceNo = toBeEmployeeGatepassAuthorizedByUserMasterIds.map(
                (_, index) => index + 1,
              );
            } else {
              SequenceNo = Array(
                toBeEmployeeGatepassAuthorizedByUserMasterIds.length,
              ).fill(0);
            }
            if (findEmployeeGatepassAuth) {
              const updateObj = {
                AuthorizationMasterID:
                  authorizationMasterTypes.employeeGatePass,
                AuthorizedByUserMasterId:
                  toBeEmployeeGatepassAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: employeeGatepassAuthCriteria,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                updateBy: createBy,
                updateByIp: createByIp,
              };
              await updateAuthorizationDetails(
                updateObj,
                findEmployeeGatepassAuth.AuthorizationDetailsId,
                authorizationMasterTypes.employeeGatePass,
                transaction,
              );
            } else {
              const createObj = {
                AuthorizationMasterID:
                  authorizationMasterTypes.employeeGatePass,
                AuthorizedByUserMasterId:
                  toBeEmployeeGatepassAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: employeeGatepassAuthCriteria,
                userMasterID: userID,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                createBy,
                createByIp,
              };

              await createAuthorizationDetails(createObj, transaction);
            }
            const getPassNotificationData = await getPassAuthorization(
              req,
              [userID],
              employeeGatepassAuthorizationStatus,
              employeeGatepassAuthCriteria,
              toBeEmployeeGatepassAuthorizedByUserMasterIds,
              createBy,
              createByIp,
              createByIp,
              employeeGatePassIosTokens,
              employeeGatePassAndroidTokens,
              transaction,
            );

            //getPass Firebase Notification pushed
            bulkNotificationObject.push(...getPassNotificationData);
          }
        }
      }

      // Attendance Correction
      if (
        authorizationMasterID == 0 ||
        authorizationMasterID == authorizationMasterTypes.attendanceCorrection
      ) {
        const findAttendanceCorrectionAuth =
          findUserAuthDetails?.find(
            (auth) =>
              auth.AuthorizationMasterID ==
              authorizationMasterTypes.attendanceCorrection,
          ) || null;

        let shouldExecuteAttendanceCorrectionFunctionCode = false;

        // ----------------------- REMOVE Expense AUTH -----------------------
        if (!row.attendanceCorrection) {
          if (findAttendanceCorrectionAuth) {
            // Delete Auth
            await deleteAuthorizationDetails(
              createBy,
              createByIp,
              findAttendanceCorrectionAuth.AuthorizationDetailsId,
              authorizationMasterTypes.attendanceCorrection,
            );
            await attendanceCorrectionAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );
          }
        } else {
          // ----------------------- COMMON DATA -----------------------
          const toBeAttendanceCorrectionAuthorizedByUserMasterIds =
            row.attendanceCorrection.authorizedUsers.map((u) => u.userMasterID);

          const attendanceCorrectionAuthCriteria =
            row.attendanceCorrection.authorizationCriteriaID;

          const attendanceCorrectionAuthorizationStatus =
            attendanceCorrectionAuthCriteria ===
            authorizationCriteriaType.SEQUENCENO
              ? AuthorizationStatusType.PEDING_TWO
              : AuthorizationStatusType.PEDING_ONE;

          const attendanceCorrectionAuthUserData = await UserMaster.findAll({
            distinct: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]:
                  toBeAttendanceCorrectionAuthorizedByUserMasterIds,
              },
            },
            attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
          });

          const attendanceCorrectionIosTokens = [];
          const attendanceCorrectionAndroidTokens = [];

          attendanceCorrectionAuthUserData.forEach(
            ({ deviceType, firebaseToken }) => {
              if (!firebaseToken) return;
              if (deviceType === 'ios')
                attendanceCorrectionIosTokens.push(firebaseToken);
              if (deviceType === 'android')
                attendanceCorrectionAndroidTokens.push(firebaseToken);
            },
          );

          // ----------------------- SHOULD EXECUTE -----------------------
          if (!findAttendanceCorrectionAuth) {
            shouldExecuteAttendanceCorrectionFunctionCode = true;
          } else {
            const isSameAuthUsers = arraysAreIdentical(
              findAttendanceCorrectionAuth.AuthorizedByUserMasterId,
              toBeAttendanceCorrectionAuthorizedByUserMasterIds,
            );

            if (
              findAttendanceCorrectionAuth.AuthorizationCriteriaID !==
                attendanceCorrectionAuthCriteria ||
              !isSameAuthUsers
            ) {
              shouldExecuteAttendanceCorrectionFunctionCode = true;
            }
          }

          // ----------------------- EXECUTION -----------------------
          if (shouldExecuteAttendanceCorrectionFunctionCode) {
            let FromAmount = Array(
              toBeAttendanceCorrectionAuthorizedByUserMasterIds.length,
            ).fill(0);
            let ToAmount = Array(
              toBeAttendanceCorrectionAuthorizedByUserMasterIds.length,
            ).fill(0);
            let RequiredAuthorizationMessage = Array(
              toBeAttendanceCorrectionAuthorizedByUserMasterIds.length,
            ).fill(1);
            let SequenceNo = [];
            if (
              +attendanceCorrectionAuthCriteria ===
              authorizationCriteriaType.SEQUENCENO
            ) {
              SequenceNo =
                toBeAttendanceCorrectionAuthorizedByUserMasterIds.map(
                  (_, index) => index + 1,
                );
            } else {
              SequenceNo = Array(
                toBeAttendanceCorrectionAuthorizedByUserMasterIds.length,
              ).fill(0);
            }
            if (findAttendanceCorrectionAuth) {
              const updateObj = {
                AuthorizationMasterID:
                  authorizationMasterTypes.attendanceCorrection,
                AuthorizedByUserMasterId:
                  toBeAttendanceCorrectionAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: attendanceCorrectionAuthCriteria,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                updateBy: createBy,
                updateByIp: createByIp,
              };
              await updateAuthorizationDetails(
                updateObj,
                findAttendanceCorrectionAuth.AuthorizationDetailsId,
                authorizationMasterTypes.attendanceCorrection,
                transaction,
              );
            } else {
              const createObj = {
                AuthorizationMasterID:
                  authorizationMasterTypes.attendanceCorrection,
                AuthorizedByUserMasterId:
                  toBeAttendanceCorrectionAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: attendanceCorrectionAuthCriteria,
                userMasterID: userID,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                createBy,
                createByIp,
              };

              await createAuthorizationDetails(createObj, transaction);
            }
            const attendanceCorrectionNotificationData =
              await attendanceCorrectionAuthorization(
                req,
                [userID],
                attendanceCorrectionAuthorizationStatus,
                attendanceCorrectionAuthCriteria,
                toBeAttendanceCorrectionAuthorizedByUserMasterIds,
                createBy,
                createByIp,
                createByIp,
                attendanceCorrectionIosTokens,
                attendanceCorrectionAndroidTokens,
                transaction,
              );

            // Attendance Correction Firebase Notification pushed
            bulkNotificationObject.push(
              ...attendanceCorrectionNotificationData,
            );
          }
        }
      }

      // COff and Extra Days
      if (
        authorizationMasterID == 0 ||
        authorizationMasterID == authorizationMasterTypes.compensatoryOff
      ) {
        const findCompensatoryOffAuth =
          findUserAuthDetails?.find(
            (auth) =>
              auth.AuthorizationMasterID ==
              authorizationMasterTypes.compensatoryOff,
          ) || null;

        let shouldExecuteCompensatoryOffFunctionCode = false;

        // ----------------------- REMOVE Expense AUTH -----------------------
        if (!row.compensatoryOff) {
          if (findCompensatoryOffAuth) {
            // Delete Auth
            await deleteAuthorizationDetails(
              createBy,
              createByIp,
              findCompensatoryOffAuth.AuthorizationDetailsId,
              authorizationMasterTypes.compensatoryOff,
            );
            //Compensatory Off
            await coffAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );

            //Extra Days
            await extraDaysAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );
          }
        } else {
          // ----------------------- COMMON DATA -----------------------
          const toBeCompensatoryOffAuthorizedByUserMasterIds =
            row.compensatoryOff.authorizedUsers.map((u) => u.userMasterID);

          const compensatoryOffAuthCriteria =
            row.compensatoryOff.authorizationCriteriaID;

          const compensatoryOffAuthorizationStatus =
            compensatoryOffAuthCriteria === authorizationCriteriaType.SEQUENCENO
              ? AuthorizationStatusType.PEDING_TWO
              : AuthorizationStatusType.PEDING_ONE;

          const compensatoryOffAuthUserData = await UserMaster.findAll({
            distinct: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]: toBeCompensatoryOffAuthorizedByUserMasterIds,
              },
            },
            attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
          });

          const compensatoryOffIosTokens = [];
          const compensatoryOffAndroidTokens = [];

          compensatoryOffAuthUserData.forEach(
            ({ deviceType, firebaseToken }) => {
              if (!firebaseToken) return;
              if (deviceType === 'ios')
                compensatoryOffIosTokens.push(firebaseToken);
              if (deviceType === 'android')
                compensatoryOffAndroidTokens.push(firebaseToken);
            },
          );

          // ----------------------- SHOULD EXECUTE -----------------------
          if (!findCompensatoryOffAuth) {
            shouldExecuteCompensatoryOffFunctionCode = true;
          } else {
            const isSameAuthUsers = arraysAreIdentical(
              findCompensatoryOffAuth.AuthorizedByUserMasterId,
              toBeCompensatoryOffAuthorizedByUserMasterIds,
            );

            if (
              findCompensatoryOffAuth.AuthorizationCriteriaID !==
                compensatoryOffAuthCriteria ||
              !isSameAuthUsers
            ) {
              shouldExecuteCompensatoryOffFunctionCode = true;
            }
          }

          // ----------------------- EXECUTION -----------------------
          if (shouldExecuteCompensatoryOffFunctionCode) {
            let FromAmount = Array(
              toBeCompensatoryOffAuthorizedByUserMasterIds.length,
            ).fill(0);
            let ToAmount = Array(
              toBeCompensatoryOffAuthorizedByUserMasterIds.length,
            ).fill(0);
            let RequiredAuthorizationMessage = Array(
              toBeCompensatoryOffAuthorizedByUserMasterIds.length,
            ).fill(1);
            let SequenceNo = [];
            if (
              +compensatoryOffAuthCriteria ===
              authorizationCriteriaType.SEQUENCENO
            ) {
              SequenceNo = toBeCompensatoryOffAuthorizedByUserMasterIds.map(
                (_, index) => index + 1,
              );
            } else {
              SequenceNo = Array(
                toBeCompensatoryOffAuthorizedByUserMasterIds.length,
              ).fill(0);
            }
            if (findCompensatoryOffAuth) {
              const updateObj = {
                AuthorizationMasterID: authorizationMasterTypes.compensatoryOff,
                AuthorizedByUserMasterId:
                  toBeCompensatoryOffAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: compensatoryOffAuthCriteria,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                updateBy: createBy,
                updateByIp: createByIp,
              };
              await updateAuthorizationDetails(
                updateObj,
                findCompensatoryOffAuth.AuthorizationDetailsId,
                authorizationMasterTypes.compensatoryOff,
                transaction,
              );
            } else {
              const createObj = {
                AuthorizationMasterID: authorizationMasterTypes.compensatoryOff,
                AuthorizedByUserMasterId:
                  toBeCompensatoryOffAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: compensatoryOffAuthCriteria,
                userMasterID: userID,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                createBy,
                createByIp,
              };

              await createAuthorizationDetails(createObj, transaction);
            }
            //Compensatory Off start
            const coffNotificationData = await coffAuthorization(
              req,
              [userID],
              compensatoryOffAuthorizationStatus,
              compensatoryOffAuthCriteria,
              toBeCompensatoryOffAuthorizedByUserMasterIds,
              createBy,
              createByIp,
              createByIp,
              compensatoryOffIosTokens,
              compensatoryOffAndroidTokens,
              transaction,
            );

            //coff Firebase Notification pushed
            bulkNotificationObject.push(...coffNotificationData);
            //Compensatory Off end

            //Extra Days start
            const extraDaysNotificationData = await extraDaysAuthorization(
              req,
              [userID],
              compensatoryOffAuthorizationStatus,
              compensatoryOffAuthCriteria,
              toBeCompensatoryOffAuthorizedByUserMasterIds,
              createBy,
              createByIp,
              createByIp,
              compensatoryOffIosTokens,
              compensatoryOffAndroidTokens,
              transaction,
            );

            //extraDays Firebase Notification pushed
            bulkNotificationObject.push(...extraDaysNotificationData);
          }
        }
      }

      // Employment
      if (
        authorizationMasterID == 0 ||
        authorizationMasterID == authorizationMasterTypes.probationAssessment
      ) {
        const findEmploymentAuth =
          findUserAuthDetails?.find(
            (auth) =>
              auth.AuthorizationMasterID ==
              authorizationMasterTypes.probationAssessment,
          ) || null;

        let shouldExecuteEmploymentFunctionCode = false;

        // ----------------------- REMOVE Expense AUTH -----------------------
        if (!row.probationAssessment) {
          if (findEmploymentAuth) {
            // Delete Auth
            await deleteAuthorizationDetails(
              createBy,
              createByIp,
              findEmploymentAuth.AuthorizationDetailsId,
              authorizationMasterTypes.probationAssessment,
            );
          }
        } else {
          // ----------------------- COMMON DATA -----------------------
          const toBeEmploymentAuthorizedByUserMasterIds =
            row.probationAssessment.authorizedUsers.map((u) => u.userMasterID);

          const employmentAuthCriteria =
            row.probationAssessment.authorizationCriteriaID;

          // ----------------------- SHOULD EXECUTE -----------------------
          if (!findEmploymentAuth) {
            shouldExecuteEmploymentFunctionCode = true;
          } else {
            const isSameAuthUsers = arraysAreIdentical(
              findEmploymentAuth.AuthorizedByUserMasterId,
              toBeEmploymentAuthorizedByUserMasterIds,
            );

            if (
              findEmploymentAuth.AuthorizationCriteriaID !==
                employmentAuthCriteria ||
              !isSameAuthUsers
            ) {
              shouldExecuteEmploymentFunctionCode = true;
            }
          }

          // ----------------------- EXECUTION -----------------------
          if (shouldExecuteEmploymentFunctionCode) {
            let FromAmount = Array(
              toBeEmploymentAuthorizedByUserMasterIds.length,
            ).fill(0);
            let ToAmount = Array(
              toBeEmploymentAuthorizedByUserMasterIds.length,
            ).fill(0);
            let RequiredAuthorizationMessage = Array(
              toBeEmploymentAuthorizedByUserMasterIds.length,
            ).fill(1);
            let SequenceNo = [];
            if (
              +employmentAuthCriteria === authorizationCriteriaType.SEQUENCENO
            ) {
              SequenceNo = toBeEmploymentAuthorizedByUserMasterIds.map(
                (_, index) => index + 1,
              );
            } else {
              SequenceNo = Array(
                toBeEmploymentAuthorizedByUserMasterIds.length,
              ).fill(0);
            }
            if (findEmploymentAuth) {
              const updateObj = {
                AuthorizationMasterID:
                  authorizationMasterTypes.probationAssessment,
                AuthorizedByUserMasterId:
                  toBeEmploymentAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: employmentAuthCriteria,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                updateBy: createBy,
                updateByIp: createByIp,
              };
              await updateAuthorizationDetails(
                updateObj,
                findEmploymentAuth.AuthorizationDetailsId,
                authorizationMasterTypes.probationAssessment,
                transaction,
              );
            } else {
              const createObj = {
                AuthorizationMasterID:
                  authorizationMasterTypes.probationAssessment,
                AuthorizedByUserMasterId:
                  toBeEmploymentAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: employmentAuthCriteria,
                userMasterID: userID,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                createBy,
                createByIp,
              };
              await createAuthorizationDetails(createObj, transaction);
            }
          }
        }
      }
      // statutory Detail (Bank)
      if (
        authorizationMasterID == 0 ||
        authorizationMasterID == authorizationMasterTypes.statutoryDetail
      ) {
        const findStatutoryDetailAuth =
          findUserAuthDetails?.find(
            (auth) =>
              auth.AuthorizationMasterID ==
              authorizationMasterTypes.statutoryDetail,
          ) || null;

        let shouldExecuteStatutoryDetailFunctionCode = false;

        // ----------------------- REMOVE Expense AUTH -----------------------
        if (!row.statutoryDetail) {
          if (findStatutoryDetailAuth) {
            // Delete Auth
            await deleteAuthorizationDetails(
              createBy,
              createByIp,
              findStatutoryDetailAuth.AuthorizationDetailsId,
              authorizationMasterTypes.statutoryDetail,
            );

            await bankDetailRequestAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );
          }
        } else {
          // ----------------------- COMMON DATA -----------------------
          const toBeStatutoryDetailAuthorizedByUserMasterIds =
            row.statutoryDetail.authorizedUsers.map((u) => u.userMasterID);

          const statutoryDetailAuthCriteria =
            row.statutoryDetail.authorizationCriteriaID;

          const statutoryDetailAuthorizationStatus =
            statutoryDetailAuthCriteria === authorizationCriteriaType.SEQUENCENO
              ? AuthorizationStatusType.PEDING_TWO
              : AuthorizationStatusType.PEDING_ONE;

          const statutoryDetailAuthUserData = await UserMaster.findAll({
            distinct: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]: toBeStatutoryDetailAuthorizedByUserMasterIds,
              },
            },
            attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
          });

          const statutoryDetailIosTokens = [];
          const statutoryDetailAndroidTokens = [];

          statutoryDetailAuthUserData.forEach(
            ({ deviceType, firebaseToken }) => {
              if (!firebaseToken) return;
              if (deviceType === 'ios')
                statutoryDetailIosTokens.push(firebaseToken);
              if (deviceType === 'android')
                statutoryDetailAndroidTokens.push(firebaseToken);
            },
          );

          // ----------------------- SHOULD EXECUTE -----------------------
          if (!findStatutoryDetailAuth) {
            shouldExecuteStatutoryDetailFunctionCode = true;
          } else {
            const isSameAuthUsers = arraysAreIdentical(
              findStatutoryDetailAuth.AuthorizedByUserMasterId,
              toBeStatutoryDetailAuthorizedByUserMasterIds,
            );

            if (
              findStatutoryDetailAuth.AuthorizationCriteriaID !==
                statutoryDetailAuthCriteria ||
              !isSameAuthUsers
            ) {
              shouldExecuteStatutoryDetailFunctionCode = true;
            }
          }

          // ----------------------- EXECUTION -----------------------
          if (shouldExecuteStatutoryDetailFunctionCode) {
            let FromAmount = Array(
              toBeStatutoryDetailAuthorizedByUserMasterIds.length,
            ).fill(0);
            let ToAmount = Array(
              toBeStatutoryDetailAuthorizedByUserMasterIds.length,
            ).fill(0);
            let RequiredAuthorizationMessage = Array(
              toBeStatutoryDetailAuthorizedByUserMasterIds.length,
            ).fill(1);
            let SequenceNo = [];
            if (
              +statutoryDetailAuthCriteria ===
              authorizationCriteriaType.SEQUENCENO
            ) {
              SequenceNo = toBeStatutoryDetailAuthorizedByUserMasterIds.map(
                (_, index) => index + 1,
              );
            } else {
              SequenceNo = Array(
                toBeStatutoryDetailAuthorizedByUserMasterIds.length,
              ).fill(0);
            }
            if (findStatutoryDetailAuth) {
              const updateObj = {
                AuthorizationMasterID: authorizationMasterTypes.statutoryDetail,
                AuthorizedByUserMasterId:
                  toBeStatutoryDetailAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: statutoryDetailAuthCriteria,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                updateBy: createBy,
                updateByIp: createByIp,
              };
              await updateAuthorizationDetails(
                updateObj,
                findStatutoryDetailAuth.AuthorizationDetailsId,
                authorizationMasterTypes.statutoryDetail,
                transaction,
              );
            } else {
              const createObj = {
                AuthorizationMasterID: authorizationMasterTypes.statutoryDetail,
                AuthorizedByUserMasterId:
                  toBeStatutoryDetailAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: statutoryDetailAuthCriteria,
                userMasterID: userID,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                createBy,
                createByIp,
              };

              await createAuthorizationDetails(createObj, transaction);
            }
            const bankDetailRequestNotificationData =
              await bankDetailRequestAuthorization(
                req,
                [userID],
                statutoryDetailAuthorizationStatus,
                statutoryDetailAuthCriteria,
                toBeStatutoryDetailAuthorizedByUserMasterIds,
                createBy,
                createByIp,
                createByIp,
                statutoryDetailIosTokens,
                statutoryDetailAndroidTokens,
                transaction,
              );

            //Bank Detail Request Notification pushed
            bulkNotificationObject.push(...bankDetailRequestNotificationData);
          }
        }
      }

      // Loan Authorization
      if (
        authorizationMasterID == 0 ||
        authorizationMasterID == authorizationMasterTypes.loan
      ) {
        const findLoanAuth =
          findUserAuthDetails?.find(
            (auth) =>
              auth.AuthorizationMasterID == authorizationMasterTypes.loan,
          ) || null;

        let shouldExecuteLoanFunctionCode = false;

        // ----------------------- REMOVE Loan AUTH -----------------------
        if (!row.loan) {
          if (findLoanAuth) {
            // Delete Auth
            await deleteAuthorizationDetails(
              createBy,
              createByIp,
              findLoanAuth.AuthorizationDetailsId,
              authorizationMasterTypes.loan,
            );

            await loanRequestAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );
          }
        } else {
          // ----------------------- COMMON DATA -----------------------
          const toBeLoanAuthorizedByUserMasterIds =
            row.loan.authorizedUsers.map((u) => u.userMasterID);

          const loanAuthCriteria = row.loan.authorizationCriteriaID;

          const loanAuthorizationStatus =
            loanAuthCriteria === authorizationCriteriaType.SEQUENCENO
              ? AuthorizationStatusType.PEDING_TWO
              : AuthorizationStatusType.PEDING_ONE;

          const loanAuthUserData = await UserMaster.findAll({
            distinct: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]: toBeLoanAuthorizedByUserMasterIds,
              },
            },
            attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
          });

          const loanIosTokens = [];
          const loanAndroidTokens = [];

          loanAuthUserData.forEach(({ deviceType, firebaseToken }) => {
            if (!firebaseToken) return;
            if (deviceType === 'ios') loanIosTokens.push(firebaseToken);
            if (deviceType === 'android') loanAndroidTokens.push(firebaseToken);
          });

          // ----------------------- SHOULD EXECUTE -----------------------
          if (!findLoanAuth) {
            shouldExecuteLoanFunctionCode = true;
          } else {
            const isSameAuthUsers = arraysAreIdentical(
              findLoanAuth.AuthorizedByUserMasterId,
              toBeLoanAuthorizedByUserMasterIds,
            );

            if (
              findLoanAuth.AuthorizationCriteriaID !== loanAuthCriteria ||
              !isSameAuthUsers
            ) {
              shouldExecuteLoanFunctionCode = true;
            }
          }

          // ----------------------- EXECUTION -----------------------
          if (shouldExecuteLoanFunctionCode) {
            let FromAmount = Array(
              toBeLoanAuthorizedByUserMasterIds.length,
            ).fill(0);
            let ToAmount = Array(toBeLoanAuthorizedByUserMasterIds.length).fill(
              0,
            );
            let RequiredAuthorizationMessage = Array(
              toBeLoanAuthorizedByUserMasterIds.length,
            ).fill(1);
            let SequenceNo = [];
            if (+loanAuthCriteria === authorizationCriteriaType.SEQUENCENO) {
              SequenceNo = toBeLoanAuthorizedByUserMasterIds.map(
                (_, index) => index + 1,
              );
            } else {
              SequenceNo = Array(toBeLoanAuthorizedByUserMasterIds.length).fill(
                0,
              );
            }
            if (findLoanAuth) {
              const updateObj = {
                AuthorizationMasterID: authorizationMasterTypes.loan,
                AuthorizedByUserMasterId: toBeLoanAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: loanAuthCriteria,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                updateBy: createBy,
                updateByIp: createByIp,
              };
              await updateAuthorizationDetails(
                updateObj,
                findLoanAuth.AuthorizationDetailsId,
                authorizationMasterTypes.loan,
                transaction,
              );
            } else {
              const createObj = {
                AuthorizationMasterID: authorizationMasterTypes.loan,
                AuthorizedByUserMasterId: toBeLoanAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: loanAuthCriteria,
                userMasterID: userID,
                companyMasterID,
                FromAmount,
                ToAmount,
                RequiredAuthorizationMessage,
                SequenceNo,
                createBy,
                createByIp,
              };

              await createAuthorizationDetails(createObj, transaction);
            }
            const loanRequestNotificationData = await loanRequestAuthorization(
              req,
              [userID],
              loanAuthorizationStatus,
              loanAuthCriteria,
              toBeLoanAuthorizedByUserMasterIds,
              createBy,
              createByIp,
              createByIp,
              loanIosTokens,
              loanAndroidTokens,
              transaction,
            );

            //Loan Request Notification pushed
            bulkNotificationObject.push(...loanRequestNotificationData);
          }
        }
      }
      // Manpower Requisition

      if (
        authorizationMasterID == 0 ||
        authorizationMasterID == authorizationMasterTypes.manPowerRequisition
      ) {
        const findManpowerAuth =
          findUserAuthDetails?.find(
            (auth) =>
              auth.AuthorizationMasterID ==
              authorizationMasterTypes.manPowerRequisition,
          ) || null;

        let shouldExecuteManPowerRequisitionFunctionCode = false;

        // ----------------------- REMOVE Manpower Requisition AUTH -----------------------
        if (!row.manPowerRequisition) {
          if (findManpowerAuth) {
            // Delete Auth
            await deleteAuthorizationDetails(
              createBy,
              createByIp,
              findManpowerAuth.AuthorizationDetailsId,
              authorizationMasterTypes.manPowerRequisition,
            );

            await manPowerRequisitionAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );
          }
        } else {
          // ----------------------- COMMON DATA -----------------------
          const toBeManpowerAuthorizedByUserMasterIds =
            row.manPowerRequisition.authorizedUsers.map((u) => u.userMasterID);

          const manpowerAuthCriteria =
            row.manPowerRequisition.authorizationCriteriaID;

          const toBeManpowerAuthorizationStatus =
            manpowerAuthCriteria === authorizationCriteriaType.SEQUENCENO
              ? AuthorizationStatusType.PEDING_TWO
              : AuthorizationStatusType.PEDING_ONE;

          const manpowerAuthUserData = await UserMaster.findAll({
            distinct: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]: toBeManpowerAuthorizedByUserMasterIds,
              },
            },
            attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
          });

          const manPowerIosTokens = [];
          const manPowerAndroidTokens = [];

          manpowerAuthUserData.forEach(({ deviceType, firebaseToken }) => {
            if (!firebaseToken) return;
            if (deviceType === 'ios') manPowerIosTokens.push(firebaseToken);
            if (deviceType === 'android')
              manPowerAndroidTokens.push(firebaseToken);
          });

          // ----------------------- SHOULD EXECUTE -----------------------
          if (!findManpowerAuth) {
            shouldExecuteManPowerRequisitionFunctionCode = true;
          } else {
            const isSameAuthUsers = arraysAreIdentical(
              findManpowerAuth.AuthorizedByUserMasterId,
              toBeManpowerAuthorizedByUserMasterIds,
            );

            if (
              findManpowerAuth.AuthorizationCriteriaID !==
                manpowerAuthCriteria ||
              !isSameAuthUsers
            ) {
              shouldExecuteManPowerRequisitionFunctionCode = true;
            }
          }

          // ----------------------- EXECUTION -----------------------
          if (shouldExecuteManPowerRequisitionFunctionCode) {
            let FromAmount = Array(
              toBeManpowerAuthorizedByUserMasterIds.length,
            ).fill(0);
            let ToAmount = Array(
              toBeManpowerAuthorizedByUserMasterIds.length,
            ).fill(0);
            let RequiredAuthorizationMessage = Array(
              toBeManpowerAuthorizedByUserMasterIds.length,
            ).fill(1);
            let SequenceNo = [];
            if (
              +manpowerAuthCriteria === authorizationCriteriaType.SEQUENCENO
            ) {
              SequenceNo = toBeManpowerAuthorizedByUserMasterIds.map(
                (_, index) => index + 1,
              );
            } else {
              SequenceNo = Array(
                toBeManpowerAuthorizedByUserMasterIds.length,
              ).fill(0);
            }
            if (findManpowerAuth) {
              const updateObj = {
                AuthorizationMasterID:
                  authorizationMasterTypes.manPowerRequisition,
                AuthorizedByUserMasterId: toBeManpowerAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: manpowerAuthCriteria,
                companyMasterID,
                RequiredAuthorizationMessage,
                SequenceNo,
                updateBy: createBy,
                updateByIp: createByIp,
              };
              await updateAuthorizationDetails(
                updateObj,
                findManpowerAuth.AuthorizationDetailsId,
                authorizationMasterTypes.manPowerRequisition,
                transaction,
              );
            } else {
              const createObj = {
                AuthorizationMasterID:
                  authorizationMasterTypes.manPowerRequisition,
                AuthorizedByUserMasterId: toBeManpowerAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: manpowerAuthCriteria,
                userMasterID: userID,
                FromAmount,
                ToAmount,
                companyMasterID,
                RequiredAuthorizationMessage,
                SequenceNo,
                createBy,
                createByIp,
              };

              await createAuthorizationDetails(createObj, transaction);
            }
            const loanRequestNotificationData =
              await manPowerRequisitionAuthorization(
                req,
                [userID],
                toBeManpowerAuthorizationStatus,
                manpowerAuthCriteria,
                toBeManpowerAuthorizedByUserMasterIds,
                createBy,
                createByIp,
                createByIp,
                manPowerIosTokens,
                manPowerAndroidTokens,
                transaction,
              );

            //Loan Request Notification pushed
            bulkNotificationObject.push(...loanRequestNotificationData);
          }
        }
      }
      // Tour Authorization
      if (
        authorizationMasterID == 0 ||
        authorizationMasterID == authorizationMasterTypes.tour
      ) {
        const findTourAuth =
          findUserAuthDetails?.find(
            (auth) =>
              auth.AuthorizationMasterID == authorizationMasterTypes.tour,
          ) || null;

        let shouldExecuteTourFunctionCode = false;

        if (!row.tour) {
          if (findTourAuth) {
            // Delete Auth
            await deleteAuthorizationDetails(
              createBy,
              createByIp,
              findTourAuth.AuthorizationDetailsId,
              authorizationMasterTypes.tour,
            );

            await tourRequestAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );
          }
        } else {
          const toBeTourAuthorizedByUserMasterIds =
            row.tour.authorizedUsers.map((u) => u.userMasterID);

          const tourAuthCriteria = row.tour.authorizationCriteriaID;

          const toBeTourAuthorizationStatus =
            tourAuthCriteria === authorizationCriteriaType.SEQUENCENO
              ? AuthorizationStatusType.PEDING_TWO
              : AuthorizationStatusType.PEDING_ONE;

          const tourAuthUserData = await UserMaster.findAll({
            distinct: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]: toBeTourAuthorizedByUserMasterIds,
              },
            },
            attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
          });

          const tourIosTokens = [];
          const tourAndroidTokens = [];

          tourAuthUserData.forEach(({ deviceType, firebaseToken }) => {
            if (!firebaseToken) return;

            if (deviceType === 'ios') {
              tourIosTokens.push(firebaseToken);
            } else if (deviceType === 'android') {
              tourAndroidTokens.push(firebaseToken);
            }
          });

          if (!findTourAuth) {
            shouldExecuteTourFunctionCode = true;
          } else {
            const isSameAuthUsers = arraysAreIdentical(
              findTourAuth.AuthorizedByUserMasterId,
              toBeTourAuthorizedByUserMasterIds,
            );

            if (
              findTourAuth.AuthorizationCriteriaID !== tourAuthCriteria ||
              !isSameAuthUsers
            ) {
              shouldExecuteTourFunctionCode = true;
            }
          }

          if (shouldExecuteTourFunctionCode) {
            const FromAmount = Array(
              toBeTourAuthorizedByUserMasterIds.length,
            ).fill(0);

            const ToAmount = Array(
              toBeTourAuthorizedByUserMasterIds.length,
            ).fill(0);

            const RequiredAuthorizationMessage = Array(
              toBeTourAuthorizedByUserMasterIds.length,
            ).fill(1);

            let SequenceNo = [];

            if (+tourAuthCriteria === authorizationCriteriaType.SEQUENCENO) {
              SequenceNo = toBeTourAuthorizedByUserMasterIds.map(
                (_, index) => index + 1,
              );
            } else {
              SequenceNo = Array(toBeTourAuthorizedByUserMasterIds.length).fill(
                0,
              );
            }

            if (findTourAuth) {
              const updateObj = {
                AuthorizationMasterID: authorizationMasterTypes.tour,
                AuthorizedByUserMasterId: toBeTourAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: tourAuthCriteria,
                companyMasterID,
                RequiredAuthorizationMessage,
                SequenceNo,
                updateBy: createBy,
                updateByIp: createByIp,
              };

              await updateAuthorizationDetails(
                updateObj,
                findTourAuth.AuthorizationDetailsId,
                authorizationMasterTypes.tour,
                transaction,
              );
            } else {
              const createObj = {
                AuthorizationMasterID: authorizationMasterTypes.tour,
                AuthorizedByUserMasterId: toBeTourAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: tourAuthCriteria,
                userMasterID: userID,
                FromAmount,
                ToAmount,
                companyMasterID,
                RequiredAuthorizationMessage,
                SequenceNo,
                createBy,
                createByIp,
              };

              await createAuthorizationDetails(createObj, transaction);
            }

            const tourNotificationData = await tourRequestAuthorization(
              req,
              [userID],
              toBeTourAuthorizationStatus,
              tourAuthCriteria,
              toBeTourAuthorizedByUserMasterIds,
              createBy,
              createByIp,
              createByIp,
              tourIosTokens,
              tourAndroidTokens,
              transaction,
            );

            bulkNotificationObject.push(...tourNotificationData);
          }
        }
      }

      // Visit Authorization

      if (
        authorizationMasterID == 0 ||
        authorizationMasterID == authorizationMasterTypes.visit
      ) {
        const findVisitAuth =
          findUserAuthDetails?.find(
            (auth) =>
              auth.AuthorizationMasterID == authorizationMasterTypes.visit,
          ) || null;

        let shouldExecuteVisitFunctionCode = false;

        if (!row.visit) {
          if (findVisitAuth) {
            // Delete Auth
            await deleteAuthorizationDetails(
              createBy,
              createByIp,
              findVisitAuth.AuthorizationDetailsId,
              authorizationMasterTypes.visit,
            );

            await visitRequestAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );
          }
        } else {
          const toBeVisitAuthorizedByUserMasterIds =
            row.visit.authorizedUsers.map((u) => u.userMasterID);

          const visitAuthCriteria = row.visit.authorizationCriteriaID;

          const toBeVisitAuthorizationStatus =
            visitAuthCriteria === authorizationCriteriaType.SEQUENCENO
              ? AuthorizationStatusType.PEDING_TWO
              : AuthorizationStatusType.PEDING_ONE;

          const visitAuthUserData = await UserMaster.findAll({
            distinct: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]: toBeVisitAuthorizedByUserMasterIds,
              },
            },
            attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
          });

          const visitIosTokens = [];
          const visitAndroidTokens = [];

          visitAuthUserData.forEach(({ deviceType, firebaseToken }) => {
            if (!firebaseToken) return;

            if (deviceType === 'ios') {
              visitIosTokens.push(firebaseToken);
            } else if (deviceType === 'android') {
              visitAndroidTokens.push(firebaseToken);
            }
          });

          if (!findVisitAuth) {
            shouldExecuteVisitFunctionCode = true;
          } else {
            const isSameAuthUsers = arraysAreIdentical(
              findVisitAuth.AuthorizedByUserMasterId,
              toBeVisitAuthorizedByUserMasterIds,
            );

            if (
              findVisitAuth.AuthorizationCriteriaID !== visitAuthCriteria ||
              !isSameAuthUsers
            ) {
              shouldExecuteVisitFunctionCode = true;
            }
          }

          if (shouldExecuteVisitFunctionCode) {
            const FromAmount = Array(
              toBeVisitAuthorizedByUserMasterIds.length,
            ).fill(0);

            const ToAmount = Array(
              toBeVisitAuthorizedByUserMasterIds.length,
            ).fill(0);

            const RequiredAuthorizationMessage = Array(
              toBeVisitAuthorizedByUserMasterIds.length,
            ).fill(1);

            let SequenceNo = [];

            if (+visitAuthCriteria === authorizationCriteriaType.SEQUENCENO) {
              SequenceNo = toBeVisitAuthorizedByUserMasterIds.map(
                (_, index) => index + 1,
              );
            } else {
              SequenceNo = Array(
                toBeVisitAuthorizedByUserMasterIds.length,
              ).fill(0);
            }

            if (findVisitAuth) {
              const updateObj = {
                AuthorizationMasterID: authorizationMasterTypes.visit,
                AuthorizedByUserMasterId: toBeVisitAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: visitAuthCriteria,
                companyMasterID,
                RequiredAuthorizationMessage,
                SequenceNo,
                updateBy: createBy,
                updateByIp: createByIp,
              };

              await updateAuthorizationDetails(
                updateObj,
                findVisitAuth.AuthorizationDetailsId,
                authorizationMasterTypes.visit,
                transaction,
              );
            } else {
              const createObj = {
                AuthorizationMasterID: authorizationMasterTypes.visit,
                AuthorizedByUserMasterId: toBeVisitAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: visitAuthCriteria,
                userMasterID: userID,
                FromAmount,
                ToAmount,
                companyMasterID,
                RequiredAuthorizationMessage,
                SequenceNo,
                createBy,
                createByIp,
              };

              await createAuthorizationDetails(createObj, transaction);
            }

            const visitNotificationData = await tourRequestAuthorization(
              req,
              [userID],
              toBeVisitAuthorizationStatus,
              visitAuthCriteria,
              toBeVisitAuthorizedByUserMasterIds,
              createBy,
              createByIp,
              createByIp,
              visitIosTokens,
              visitAndroidTokens,
              transaction,
            );

            bulkNotificationObject.push(...visitNotificationData);
          }
        }
      }
      // Salary Increment Authorization Start
      if (
        authorizationMasterID == 0 ||
        authorizationMasterID == authorizationMasterTypes.salaryIncrement
      ) {
        const findSalaryIncrementAuth =
          findUserAuthDetails?.find(
            (auth) =>
              auth.AuthorizationMasterID ==
              authorizationMasterTypes.salaryIncrement,
          ) || null;

        let shouldExecuteSalaryIncrementFunctionCode = false;
        const allUsersWithoutAuth = [];
        if (!row.salaryIncrement) {
          if (findSalaryIncrementAuth) {
            // Delete Auth
            allUsersWithoutAuth.push(row.userMasterID);
            await deleteAuthorizationDetails(
              createBy,
              createByIp,
              findSalaryIncrementAuth.AuthorizationDetailsId,
              authorizationMasterTypes.salaryIncrement,
            );

            await SalaryIncrementAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );
          }
        } else {
          const toBeSalaryIncrementAuthorizedByUserMasterIds =
            row.salaryIncrement.authorizedUsers.map((u) => u.userMasterID);

          const salaryIncrementAuthCriteria =
            row.salaryIncrement.authorizationCriteriaID;

          const toBeSalaryIncrementAuthorizationStatus =
            salaryIncrementAuthCriteria === authorizationCriteriaType.SEQUENCENO
              ? AuthorizationStatusType.PEDING_TWO
              : AuthorizationStatusType.PEDING_ONE;

          const salaryIncrementAuthUserData = await UserMaster.findAll({
            distinct: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]: toBeSalaryIncrementAuthorizedByUserMasterIds,
              },
            },
            attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
          });

          const visitIosTokens = [];
          const visitAndroidTokens = [];

          salaryIncrementAuthUserData.forEach(
            ({ deviceType, firebaseToken }) => {
              if (!firebaseToken) return;

              if (deviceType === 'ios') {
                visitIosTokens.push(firebaseToken);
              } else if (deviceType === 'android') {
                visitAndroidTokens.push(firebaseToken);
              }
            },
          );

          if (!findSalaryIncrementAuth) {
            shouldExecuteSalaryIncrementFunctionCode = true;
          } else {
            const isSameAuthUsers = arraysAreIdentical(
              findSalaryIncrementAuth.AuthorizedByUserMasterId,
              toBeSalaryIncrementAuthorizedByUserMasterIds,
            );

            if (
              findSalaryIncrementAuth.AuthorizationCriteriaID !==
                salaryIncrementAuthCriteria ||
              !isSameAuthUsers
            ) {
              shouldExecuteSalaryIncrementFunctionCode = true;
            }
          }

          if (shouldExecuteSalaryIncrementFunctionCode) {
            const FromAmount = Array(
              toBeSalaryIncrementAuthorizedByUserMasterIds.length,
            ).fill(0);

            const ToAmount = Array(
              toBeSalaryIncrementAuthorizedByUserMasterIds.length,
            ).fill(0);

            const RequiredAuthorizationMessage = Array(
              toBeSalaryIncrementAuthorizedByUserMasterIds.length,
            ).fill(1);

            let SequenceNo = [];

            if (
              +salaryIncrementAuthCriteria ===
              authorizationCriteriaType.SEQUENCENO
            ) {
              SequenceNo = toBeSalaryIncrementAuthorizedByUserMasterIds.map(
                (_, index) => index + 1,
              );
            } else {
              SequenceNo = Array(
                toBeSalaryIncrementAuthorizedByUserMasterIds.length,
              ).fill(0);
            }

            if (findSalaryIncrementAuth) {
              const updateObj = {
                AuthorizationMasterID: authorizationMasterTypes.salaryIncrement,
                AuthorizedByUserMasterId:
                  toBeSalaryIncrementAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: salaryIncrementAuthCriteria,
                companyMasterID,
                RequiredAuthorizationMessage,
                SequenceNo,
                updateBy: createBy,
                updateByIp: createByIp,
              };

              await updateAuthorizationDetails(
                updateObj,
                findSalaryIncrementAuth.AuthorizationDetailsId,
                authorizationMasterTypes.salaryIncrement,
                transaction,
              );
            } else {
              const createObj = {
                AuthorizationMasterID: authorizationMasterTypes.salaryIncrement,
                AuthorizedByUserMasterId:
                  toBeSalaryIncrementAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: salaryIncrementAuthCriteria,
                userMasterID: userID,
                FromAmount,
                ToAmount,
                companyMasterID,
                RequiredAuthorizationMessage,
                SequenceNo,
                createBy,
                createByIp,
              };

              await createAuthorizationDetails(createObj, transaction);
            }

            const salaryIncrementNotificationData =
              await salaryIncrementRequestAuthorization(
                req,
                [userID],
                toBeSalaryIncrementAuthorizationStatus,
                salaryIncrementAuthCriteria,
                toBeSalaryIncrementAuthorizedByUserMasterIds,
                createBy,
                createByIp,
                createByIp,
                visitIosTokens,
                visitAndroidTokens,
                transaction,
              );

            bulkNotificationObject.push(...salaryIncrementNotificationData);
          }
        }
        if(allUsersWithoutAuth.length > 0) {
          const salaryIncrementRequest = await SalaryIncrementRequest.findAll({
          where: {
            userMasterID: {
              [Sequelize.Op.in]: allUsersWithoutAuth,
            },
          },
          attributes: ['salaryIncrementRequestID'],
        });
        const salaryIncrementRequestIDs = salaryIncrementRequest.map(
          (request) => request.salaryIncrementRequestID,
        );
        await updateSalaryIncrement(salaryIncrementRequestIDs, {
          transaction,
          individualHooks: true,
          user: req.userDetails,
        });
        }
      }
      // Salary Increment Authorization End

      // Course Authorization Start
      if (
        authorizationMasterID == 0 ||
        authorizationMasterID == authorizationMasterTypes.lmsCourse
      ) {
        const findCourseAuth =
          findUserAuthDetails?.find(
            (auth) =>
              auth.AuthorizationMasterID == authorizationMasterTypes.lmsCourse,
          ) || null;

        let shouldExecuteCourseFunctionCode = false;

        if (!row.course) {
          if (findCourseAuth) {
            // Delete Auth
            await deleteAuthorizationDetails(
              createBy,
              createByIp,
              findCourseAuth.AuthorizationDetailsId,
              authorizationMasterTypes.lmsCourse,
              transaction,
            );

            await courseAuthorization(
              req,
              [userID],
              AuthorizationStatusType.PENDING_ZERO,
              null,
              [],
              createBy,
              createByIp,
              createByIp,
              [],
              [],
              transaction,
            );
          }
        } else {
          const toBeCourseAuthorizedByUserMasterIds =
            row.course.authorizedUsers.map((u) => u.userMasterID);

          const courseAuthCriteria = row.course.authorizationCriteriaID;

          const toBeCourseAuthorizationStatus =
            courseAuthCriteria === authorizationCriteriaType.SEQUENCENO
              ? AuthorizationStatusType.PEDING_TWO
              : AuthorizationStatusType.PEDING_ONE;

          const courseAuthUserData = await UserMaster.findAll({
            distinct: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]: toBeCourseAuthorizedByUserMasterIds,
              },
            },
            attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
          });

          const courseIosTokens = [];
          const courseAndroidTokens = [];

          courseAuthUserData.forEach(({ deviceType, firebaseToken }) => {
            if (!firebaseToken) return;

            if (deviceType === 'ios') {
              courseIosTokens.push(firebaseToken);
            } else if (deviceType === 'android') {
              courseAndroidTokens.push(firebaseToken);
            }
          });

          if (!findCourseAuth) {
            shouldExecuteCourseFunctionCode = true;
          } else {
            const isSameAuthUsers = arraysAreIdentical(
              findCourseAuth.AuthorizedByUserMasterId,
              toBeCourseAuthorizedByUserMasterIds,
            );

            if (
              findCourseAuth.AuthorizationCriteriaID !== courseAuthCriteria ||
              !isSameAuthUsers
            ) {
              shouldExecuteCourseFunctionCode = true;
            }
          }

          if (shouldExecuteCourseFunctionCode) {
            const FromAmount = Array(
              toBeCourseAuthorizedByUserMasterIds.length,
            ).fill(0);

            const ToAmount = Array(
              toBeCourseAuthorizedByUserMasterIds.length,
            ).fill(0);

            const RequiredAuthorizationMessage = Array(
              toBeCourseAuthorizedByUserMasterIds.length,
            ).fill(1);

            let SequenceNo = [];

            if (+courseAuthCriteria === authorizationCriteriaType.SEQUENCENO) {
              SequenceNo = toBeCourseAuthorizedByUserMasterIds.map(
                (_, index) => index + 1,
              );
            } else {
              SequenceNo = Array(toBeCourseAuthorizedByUserMasterIds.length).fill(
                0,
              );
            }

            if (findCourseAuth) {
              const updateObj = {
                AuthorizationMasterID: authorizationMasterTypes.lmsCourse,
                AuthorizedByUserMasterId: toBeCourseAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: courseAuthCriteria,
                companyMasterID,
                RequiredAuthorizationMessage,
                SequenceNo,
                updateBy: createBy,
                updateByIp: createByIp,
              };

              await updateAuthorizationDetails(
                updateObj,
                findCourseAuth.AuthorizationDetailsId,
                authorizationMasterTypes.lmsCourse,
                transaction,
              );
            } else {
              const createObj = {
                AuthorizationMasterID: authorizationMasterTypes.lmsCourse,
                AuthorizedByUserMasterId: toBeCourseAuthorizedByUserMasterIds,
                AuthorizationCriteriaID: courseAuthCriteria,
                userMasterID: userID,
                FromAmount,
                ToAmount,
                companyMasterID,
                RequiredAuthorizationMessage,
                SequenceNo,
                createBy,
                createByIp,
              };

              await createAuthorizationDetails(createObj, transaction);
            }

            const courseNotificationData = await courseAuthorization(
              req,
              [userID],
              toBeCourseAuthorizationStatus,
              courseAuthCriteria,
              toBeCourseAuthorizedByUserMasterIds,
              createBy,
              createByIp,
              createByIp,
              courseIosTokens,
              courseAndroidTokens,
              transaction,
            );

            bulkNotificationObject.push(...courseNotificationData);
          }
        }
      }
      // Course Authorization End
    }
    //sent Bulk Notification
    if (bulkNotificationObject.length > 0) {
      for (const notificationItem of bulkNotificationObject) {
        if (notificationItem.iosTokens.length > 0) {
          sendBulkNotification(
            notificationItem.iosTokens,
            notificationItem.payload,
            'ios',
          );
        }

        if (notificationItem.androidTokens.length > 0) {
          sendBulkNotification(
            notificationItem.androidTokens,
            notificationItem.payload,
            'android',
          );
        }
      }
    }
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Authorization'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

async function updateSalaryIncrement(allSalaryIncrementIds, options) {
  const salaryIncrements = await SalaryIncrementRequest.findAll({
    where: {
      salaryIncrementRequestID: {
        [Sequelize.Op.in]: allSalaryIncrementIds,
      },
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
          AuthorizationStatusType.PENDING_ZERO,
        ],
      }
    },
    include: [
      {
        model: SalaryIncrementRequestDetails,
        as: 'SIRDetails',
      },
    ],
    ...options,
  });

  const result = [];

  for (const salaryIncrement of salaryIncrements) {
    const details = salaryIncrement.SIRDetails || [];

    for (const detail of details) {
      result.push({
        userMasterID: salaryIncrement.userMasterID,
        salaryFromYYYYMM: salaryIncrement.salaryFromYYYYMM,
        stateid: salaryIncrement.stateid,
        AmountIn: salaryIncrement.AmountIn,
        skillCategory: salaryIncrement.skillCategory,
        corporationId: salaryIncrement.corporationId,
        minWagesMasterId: salaryIncrement.minWagesMasterId,
        payrollFrequency: salaryIncrement.payrollFrequency,
        startDate: salaryIncrement.startDate,
        endDate: salaryIncrement.endDate,
        createBy: salaryIncrement.createBy,
        gradeSalaryStructureID: detail.gradeSalaryStructureID,
        EmployeeSalaryAmount: detail.EmployeeSalaryAmount,
        ActualEmployeeSalaryAmount: detail.ActualEmployeeSalaryAmount,
      });
    }
  }

  if (result.length > 0) {
    await HRSalaryMasterFields.bulkCreate(result, {
      ...options,
      individualHooks: true,
    });
  }

  await SalaryIncrementRequest.destroy({
    where: {
      salaryIncrementRequestID: {
        [Sequelize.Op.in]: allSalaryIncrementIds,
      },
    },
    individualHooks: true,
    user: options.user,
    transaction: options.transaction,
  });
}

function getAuthorizationHeaderIndexes(firstRow) {
  return {
    employeeNameIndex: firstRow.indexOf('Employee Name'),
    employeeNumberIndex: firstRow.indexOf('Number'),
    employeeCodeIndex: firstRow.indexOf('Employee Code'),
    branchNameIndex: firstRow.indexOf('Branch Name'),
    departmentNameIndex: firstRow.indexOf('Department Name'),
    designationNameIndex: firstRow.indexOf('Designation Name'),

    leaveAuthCriteriaIndex: firstRow.indexOf('Authorization Criteria(Leave)'),
    leaveAuthUserIndex: firstRow.indexOf('Authorized User(Leave)'),

    expenseAuthCriteriaIndex: firstRow.indexOf(
      'Authorization Criteria(Expense)',
    ),
    expenseAuthUserIndex: firstRow.indexOf('Authorized User(Expense)'),

    overtimeAuthCriteriaIndex: firstRow.indexOf(
      'Authorization Criteria(Overtime)',
    ),
    overtimeAuthUserIndex: firstRow.indexOf('Authorized User(Overtime)'),

    resignationAuthCriteriaIndex: firstRow.indexOf(
      'Authorization Criteria(Resignation)',
    ),
    resignationAuthUserIndex: firstRow.indexOf('Authorized User(Resignation)'),

    gatePassAuthCriteriaIndex: firstRow.indexOf(
      'Authorization Criteria(GatePass)',
    ),
    gatePassAuthUserIndex: firstRow.indexOf('Authorized User(GatePass)'),

    attendanceCorrectionAuthCriteriaIndex: firstRow.indexOf(
      'Authorization Criteria(Attendance Correction)',
    ),
    attendanceCorrectionAuthUserIndex: firstRow.indexOf(
      'Authorized User(Attendance Correction)',
    ),

    compOffAuthCriteriaIndex: firstRow.indexOf(
      'Authorization Criteria(Compensatory Off)',
    ),
    compOffAuthUserIndex: firstRow.indexOf('Authorized User(Compensatory Off)'),

    probationAssessmentAuthCriteriaIndex: firstRow.indexOf(
      'Authorization Criteria(Probation Assessment)',
    ),
    probationAssessmentAuthUserIndex: firstRow.indexOf(
      'Authorized User(Probation Assessment)',
    ),

    statutoryDetailAuthCriteriaIndex: firstRow.indexOf(
      'Authorization Criteria(Statutory Detail)',
    ),
    statutoryDetailAuthUserIndex: firstRow.indexOf(
      'Authorized User(Statutory Detail)',
    ),

    manPowerAuthCriteriaIndex: firstRow.indexOf(
      'Authorization Criteria(Manpower Requisition)',
    ),
    manPowerAuthUserIndex: firstRow.indexOf(
      'Authorized User(Manpower Requisition)',
    ),

    loanAuthCriteriaIndex: firstRow.indexOf('Authorization Criteria(Loan)'),
    loanAuthUserIndex: firstRow.indexOf('Authorized User(Loan)'),

    tourAuthCriteriaIndex: firstRow.indexOf('Authorization Criteria(Tour)'),
    tourAuthUserIndex: firstRow.indexOf('Authorized User(Tour)'),

    visitAuthCriteriaIndex: firstRow.indexOf('Authorization Criteria(Visit)'),
    visitAuthUserIndex: firstRow.indexOf('Authorized User(Visit)'),

    salaryIncrementAuthCriteriaIndex: firstRow.indexOf(
      'Authorization Criteria(Salary Structure)',
    ),
    salaryIncrementAuthUserIndex: firstRow.indexOf(
      'Authorized User(Salary Structure)',
    ),

    courseAuthCriteriaIndex: firstRow.indexOf(
      'Authorization Criteria(Course)',
    ),
    courseAuthUserIndex: firstRow.indexOf(
      'Authorized User(Course)',
    ),
  };
}

// Generate upload object based on authorizationMasterID or selected types
function getUploadAuthorizationObject(authorizationMasterID) {
  const uploadObject = {};
  const types = Object.keys(authorizationMasterTypes);

  types.forEach((type) => {
    // If ID == 0, all types true; else only the matching type
    uploadObject[`isUpload${capitalize(type)}`] =
      +authorizationMasterID === 0 ||
      +authorizationMasterID === authorizationMasterTypes[type];
  });

  return uploadObject;
}

// Capitalize first letter for keys
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Validate Excel headers for authorization types
function validateAuthorizationExcelIndex(uploadObject, indexObj) {
  try {
    const validations = [
      {
        flag: uploadObject.isUploadLeave,
        indexes: [indexObj.leaveAuthCriteriaIndex, indexObj.leaveAuthUserIndex],
      },
      {
        flag: uploadObject.isUploadExpense,
        indexes: [
          indexObj.expenseAuthCriteriaIndex,
          indexObj.expenseAuthUserIndex,
        ],
      },
      {
        flag: uploadObject.isUploadOvertime,
        indexes: [
          indexObj.overtimeAuthCriteriaIndex,
          indexObj.overtimeAuthUserIndex,
        ],
      },
      {
        flag: uploadObject.isUploadResignation,
        indexes: [
          indexObj.resignationAuthCriteriaIndex,
          indexObj.resignationAuthUserIndex,
        ],
      },
      {
        flag: uploadObject.isUploadEmployeeGatePass,
        indexes: [
          indexObj.gatePassAuthCriteriaIndex,
          indexObj.gatePassAuthUserIndex,
        ],
      },
      {
        flag: uploadObject.isUploadAttendanceCorrection,
        indexes: [
          indexObj.attendanceCorrectionAuthCriteriaIndex,
          indexObj.attendanceCorrectionAuthUserIndex,
        ],
      },
      {
        flag: uploadObject.isUploadCompensatoryOff,
        indexes: [
          indexObj.compOffAuthCriteriaIndex,
          indexObj.compOffAuthUserIndex,
        ],
      },
      {
        flag: uploadObject.isUploadEmployement,
        indexes: [
          indexObj.probationAssessmentAuthCriteriaIndex,
          indexObj.probationAssessmentAuthUserIndex,
        ],
      },
      {
        flag: uploadObject.isUploadStatutoryDetail,
        indexes: [
          indexObj.statutoryDetailAuthCriteriaIndex,
          indexObj.statutoryDetailAuthUserIndex,
        ],
      },
      {
        flag: uploadObject.isUploadManpowerDetail,
        indexes: [
          indexObj.manPowerAuthCriteriaIndex,
          indexObj.manPowerAuthUserIndex,
        ],
      },
      {
        flag: uploadObject.isUploadLoan,
        indexes: [indexObj.loanAuthCriteriaIndex, indexObj.loanAuthUserIndex],
      },
      {
        flag: uploadObject.isUploadTour,
        indexes: [indexObj.tourAuthCriteriaIndex, indexObj.tourAuthUserIndex],
      },
      {
        flag: uploadObject.isUploadVisit,
        indexes: [indexObj.visitAuthCriteriaIndex, indexObj.visitAuthUserIndex],
      },
      {
        flag: uploadObject.isUploadSalaryIncrement,
        indexes: [
          indexObj.salaryIncrementAuthCriteriaIndex,
          indexObj.salaryIncrementAuthUserIndex,
        ],
      },
      {
        flag: uploadObject.isUploadLmsCourse,
        indexes: [
          indexObj.courseAuthCriteriaIndex,
          indexObj.courseAuthUserIndex,
        ],
      },
    ];

    return !validations.some(
      ({ flag, indexes }) => flag && indexes.some((i) => i === -1),
    );
  } catch (error) {
    throw new Error(
      'Error in Validate Authorization Excel Index: ' + error.message,
    );
  }
}

function processAuthorization({
  row,
  criteriaIdx,
  userIdx,
  authName,
  authMasterID,
  AuthCriteria,
  allEmployees,
  currCompany,
  FileUploadType,
  authorizationData,
}) {
  const hasDuplicates = (array) => new Set(array).size !== array.length;
  const authorizedData = {
    authorizedUsers: [],
    authorizationMasterName: authName,
    authorizationCriteriaID: null,
    authorizationCriteriaName: null,
    authorizationMasterID: authMasterID,
  };

  /* -------------------- EMPTY HANDLING -------------------- */
  if (
    (!row[criteriaIdx] && !row[userIdx]) ||
    (row[criteriaIdx] && !row[userIdx])
  ) {
    row[criteriaIdx] = null;
    row[userIdx] = null;
    return { success: true, authorizedData: null };
  }

  if (!row[criteriaIdx] && row[userIdx]) {
    authorizationData.remarks.push(`Please Select Authorization Criteria!`);
    return { success: false };
  }

  /* -------------------- VALIDATE CRITERIA -------------------- */
  const filteredCriteria = AuthCriteria.find(
    (c) => c.AuthorizationCriteria === row[criteriaIdx].toString().trim(),
  );
  // if (authMasterID == authorizationMasterTypes.probationAssessment) {
  //   if (
  //     +filteredCriteria.AuthorizationCriteriaID ==
  //     authorizationCriteriaType.SEQUENCENO
  //   ) {
  //     authorizationData.remarks.push(
  //       `Authorization criteria "${row[criteriaIdx]}" is not applicable for ${authName} authorization.`
  //     );
  //     return { success: false, stop: true };
  //   }
  // }
  if (!filteredCriteria) {
    authorizationData.remarks.push(
      `Authorization Criteria (${authName}) with name ${row[criteriaIdx]} not found!`,
    );
    return { success: false, stop: true };
  }

  authorizedData.authorizationCriteriaID =
    filteredCriteria.AuthorizationCriteriaID;
  authorizedData.authorizationCriteriaName =
    filteredCriteria.AuthorizationCriteria;

  row[criteriaIdx] = filteredCriteria.AuthorizationCriteriaID;

  /* -------------------- VALIDATE USERS -------------------- */
  const users = row[userIdx].toString().split(',');

  // String-level duplicate check (Excel: 101,101)
  if (hasDuplicates(users.map((u) => u.toString().trim()))) {
    authorizationData.remarks.push(
      `Duplicate Users in ${authName} Authorization found!`,
    );
    return { success: false, stop: true };
  }

  const validatedUsers = [];
  const uniqueUserSet = new Set(); // userMasterID uniqueness

  for (const user of users) {
    let emp;

    if (currCompany.fileUploadType === FileUploadType.EMPLOYEE_CODE) {
      emp = allEmployees.find(
        (e) =>
          e['employeeJoiningDetails.employeeCode'] == user.toString().trim(),
      );
    } else {
      emp = allEmployees.find((e) => +e.userNumber == user.toString().trim());
    }

    if (!emp) {
      authorizationData.remarks.push(
        currCompany.fileUploadType === FileUploadType.EMPLOYEE_CODE
          ? `User with Employee Code ${user} does not exist!`
          : `User with Number ${user} does not exist!`,
      );
      return { success: false };
    }

    // 🚫 Prevent duplicate user in same authorization
    if (uniqueUserSet.has(emp.userMasterID)) {
      authorizationData.remarks.push(
        `Duplicate user ${emp.displayName} found in ${authName} Authorization!`,
      );
      return { success: false, stop: true };
    }

    uniqueUserSet.add(emp.userMasterID);

    validatedUsers.push({
      userMasterID: emp.userMasterID,
      displayName: emp.displayName,
      employeeCode: emp['employeeJoiningDetails.employeeCode'],
    });
  }
  const criteriaMinAuthorizersMap = {
    [authorizationCriteriaType.SEQUENCENO]: 1,
    [authorizationCriteriaType.ANYONE]: 1,
    [authorizationCriteriaType.ANYTWO]: 2,
    [authorizationCriteriaType.ANYTHREE]: 3,
  };

  const criteriaID = +filteredCriteria.AuthorizationCriteriaID;
  const minRequired = criteriaMinAuthorizersMap[criteriaID];

  row[userIdx] = validatedUsers;
  authorizedData.authorizedUsers = validatedUsers;
  if (minRequired && validatedUsers.length < minRequired) {
    authorizationData.remarks.push(
      `At least ${minRequired} authorizer${minRequired > 1 ? 's' : ''} ` +
        `are required for ${authName} authorization with authorization criteria ` +
        `"${filteredCriteria.AuthorizationCriteria}".`,
    );

    return { success: false, stop: true };
  }

  return { success: true, authorizedData };
}

async function deleteAuthorizationDetails(
  updateBy,
  updateByIp,
  AuthorizationDetailsId,
  AuthorizationMasterID,
  transaction,
) {
  try {
    await AuthorizationDetails.update(
      {
        status: 2,
        updateBy,
        updateByIp,
      },
      {
        where: {
          AuthorizationDetailsId,
          AuthorizationMasterID,
        },
        transaction,
      },
    );
  } catch (error) {
    throw new Error('Error in deleteAuthorizationDetails: ' + error.message);
  }
}

async function updateAuthorizationDetails(
  updateObj,
  AuthorizationDetailsId,
  AuthorizationMasterID,
  transaction,
) {
  try {
    await AuthorizationDetails.update(updateObj, {
      where: { AuthorizationDetailsId, AuthorizationMasterID },
      transaction,
    });
  } catch (error) {
    throw new Error('Error in deleteAuthorizationDetails: ' + error.message);
  }
}

async function createAuthorizationDetails(createObj, transaction) {
  try {
    await AuthorizationDetails.create(createObj, {
      transaction,
    });
  } catch (error) {
    throw new Error('Error in deleteAuthorizationDetails: ' + error.message);
  }
}

function arraysAreIdentical(arr1, arr2) {
  return (
    arr1.length === arr2.length &&
    arr1.every((value, index) => value === arr2[index])
  );
}
