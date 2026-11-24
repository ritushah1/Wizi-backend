const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');
const UserMaster = require('../models/userMaster');
const ExcelJS = require('exceljs');
const moment = require('moment');
const {
  asiaKolkataDateTime,
  sendNotification,
  invalidKeyParams,
} = require('../utils/commonUtilFunctions');
const { Sequelize } = require('sequelize');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const Designation = require('../models/designation');
const sequelize = require('../config/database');
const UserInbox = require('../models/UserInbox');
const {
  authorizationMasterTypes,
  AuthorizationStatusType,
  authorizationCriteriaType,
  notificationScreentTypes,
  notificationTitleTypes,
  exclude_payheadMasterIds,
  PayrollFrequencyType,
} = require('../utils/dbUtils');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const { userAttributes } = require('../utils/commonVars');
const companyMaster = require('../models/companyMaster');
const SalaryIncrementRequest = require('../models/salaryIncrementRequest');
const SalaryIncrementRequestAuthorization = require('../models/salaryIncrementRequestAuthorization');
const HRSalaryMasterFields = require('../models/hrSalaryMaster');
const SalaryIncrementRequestDetails = require('../models/salaryIncrementRequestDetails');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const message = require('../response_message/message');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const GradeStructure = require('../models/gradeStructure');
const HRSalaryFields = require('../models/hrSalaryFields');
const Payheadmaster = require('../models/payhead');
const HRSalaryTrasaction = require('../models/hrSalaryTransaction');

exports.getSalaryIncrementAuthorizationRequestById = async (req, res, next) => {
  try {
    const { salaryIncrementRequestID } = req.body;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const authorizationRequest = await SalaryIncrementRequest.findOne({
      where: { salaryIncrementRequestID: salaryIncrementRequestID },
      include: [
        {
          model: SalaryIncrementRequestDetails,
          as: 'SIRDetails',
          attributes: [
            'gradeSalaryStructureID',
            'EmployeeSalaryAmount',
            'ActualEmployeeSalaryAmount',
            'salaryIncrementRequestID',
          ],
          include: [
            {
              required: true,
              model: GradeSalaryStructure,
              as: 'GSS',
              attributes: [
                'gradeSalaryStructureID',
                'formula',
                'salaryfieldindex',
                'salaryfieldmaxrange',
                'remainingAmtSalaryFieldID',
                'salaryFieldID',
              ],
              include: [
                {
                  model: GradeStructure,
                  attributes: [
                    'gradeStructureID',
                    'gradeName',
                    'baseOnCalculation',
                  ],
                },
                {
                  model: HRSalaryFields,
                  as: 'HSF',
                  attributes: [
                    'salaryFieldID',
                    'payheadDisplayName',
                    'status',
                    'payheadMasterId',
                    'salaryFieldSrNo',
                    'salaryFieldSide',
                    'salaryFieldShow',
                    'salaryFieldAttanChk',
                    'salaryFieldRound',
                    'salaryFieldRoundNo',
                    'salaryFieldWhenMonth',
                    'roundOffType',
                    'considerIn',
                  ],
                  where: {
                    payheadMasterId: {
                      [Sequelize.Op.notIn]: exclude_payheadMasterIds,
                    },
                  },
                  include: [
                    {
                      model: Payheadmaster,
                      as: 'PHM',
                      attributes: ['payheadName'],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          model: UserMaster,
          as: 'userMaster',
          attributes: userAttributes,
          include: [
            {
              required: false,
              model: AuthorizationDetails,
              as: 'authorizationDetails',
              where: {
                status: 1,
                AuthorizationMasterID: authorizationMasterTypes.salaryIncrement,
              },
              attributes: ['AuthorizationCriteriaID'],
              include: [
                {
                  model: AuthorizationCriteriaMaster,
                  as: 'AuthorizationCriteriaMaster',
                  attributes: ['AuthorizationCriteria'],
                },
              ],
            },
            {
              separate: true,
              required: false,
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(filterDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
              separate: true,
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(filterDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
              separate: true,
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(filterDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
              separate: true,
              required: false,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              required: false,
              separate: true,
              model: EmployeeDivision,
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: filterDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: filterDate } },
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
              separate: true,
              model: EmployeeWorkingArea,
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: filterDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: filterDate } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },

              attributes: ['workingAreaId', 'startDate'],
              include: [
                {
                  model: WorkingArea,
                  attributes: ['workingAreaName'],
                },
              ],
            },
          ],
        },
        {
          model: UserMaster,
          as: 'createByUser',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'authorizer',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'structureDeletedBy',
          attributes: ['displayName'],
        },
      ],
      order: [
        [
          { model: SalaryIncrementRequestDetails, as: 'SIRDetails' },
          { model: GradeSalaryStructure, as: 'GSS' },
          { model: HRSalaryFields, as: 'HSF' },
          'salaryFieldSrNo',
          'ASC',
        ],

        [
          { model: SalaryIncrementRequestDetails, as: 'SIRDetails' },
          { model: GradeSalaryStructure, as: 'GSS' },
          'salaryfieldindex',
          'ASC',
        ],

        // Order by payheadName in Payheadmaster
        [
          { model: SalaryIncrementRequestDetails, as: 'SIRDetails' },
          { model: GradeSalaryStructure, as: 'GSS' },
          { model: HRSalaryFields, as: 'HSF' },
          { model: Payheadmaster, as: 'PHM' },
          'payheadName',
          'ASC',
        ],
      ],
    });

    const {
      authorizationStatus,
      userMasterID,
      userMaster,
      createByUser,
      remarks,
      cancelRemarks,
      salaryFromYYYYMM,
      stateid,
      AmountIn,
      skillCategory,
      corporationId,
      minWagesMasterId,
      payrollFrequency,
      startDate,
      endDate,
      SIRDetails,
      structureDeletedBy,
      structureDeletedAt,
      authorizedAt,
      authorizerRemark,
    } = authorizationRequest;

    const { displayName, authorizationDetails } = userMaster;

    const authCriteriaID =
      authorizationDetails && authorizationDetails.length > 0
        ? authorizationDetails[0].AuthorizationCriteriaID
        : null;

    const authCriteria = await AuthorizationCriteria.findOne({
      where: { AuthorizationCriteriaID: authCriteriaID },
      attributes: ['AuthorizationCriteria'],
    });

    const authUserStatuses = await SalaryIncrementRequestAuthorization.findAll({
      where: { salaryIncrementRequestID: salaryIncrementRequestID },
    });

    const userMasterIDs = authUserStatuses.map((item) => item.userMasterID);

    const users = await UserMaster.findAll({
      where: { userMasterID: userMasterIDs },
      attributes: ['userMasterID', 'displayName'],
    });

    const userMap = new Map(
      users.map((user) => [user.userMasterID.toString(), user.displayName]),
    );

    const authUserStatusData = authUserStatuses.map((status) => ({
      userMasterID: status.userMasterID,
      displayName: userMap.get(status.userMasterID.toString()) || null,
      authStatus: status.authStatus,
      remarks: status.remarks,
      updatedAt: status.updatedAt,
    }));

    const responseData = {
      authorizationStatus,
      userMasterID,
      displayName,
      AuthorizationCriteria: authCriteria
        ? authCriteria.AuthorizationCriteria
        : '',
      authUserStatus:
        authUserStatusData && authUserStatusData.length > 0
          ? authUserStatusData
          : [],
      createdByUser: createByUser ? createByUser.displayName : '',
      remarks,
      cancelRemarks,
      employeeCode:
        authorizationRequest.userMaster?.employeeJoiningDetails[0]
          ?.employeeCode || '',
      branch:
        authorizationRequest.userMaster?.employeeBranches?.[0]?.branchMaster
          ?.branchName || '',
      department:
        authorizationRequest.userMaster?.employeeDepartments?.[0]?.department
          ?.departmentName || '',
      designation:
        authorizationRequest.userMaster?.employeeDesignations?.[0]?.designation
          ?.designationName || '',
      division:
        authorizationRequest.userMaster?.employeeDivisions?.[0]?.division
          ?.divisionName || null,
      workingArea:
        authorizationRequest.userMaster?.employeeWorkingAreas?.[0]?.workingArea
          ?.workingAreaName || null,
      createdAt: authorizationRequest.createdAt,
      userNumber: authorizationRequest.userMaster?.userNumber,
      authorizer: authorizationRequest?.authorizer?.displayName || null,
      finalRemark: authorizationRequest?.authorizerRemark,
      isAutoApproved: authorizationRequest.isAutoApproved,
      salaryFromYYYYMM,
      stateid,
      AmountIn,
      skillCategory,
      corporationId,
      minWagesMasterId,
      payrollFrequency,
      startDate,
      endDate,
      SIRDetails,
      structureDeletedBy,
      structureDeletedAt,
      authorizedAt,
      authorizerRemark,
    };

    return res.status(200).json({ status: 200, data: responseData });
  } catch (error) {
    next(error);
  }
};

exports.listSalaryIncrementAuthorization = async (req, res, next) => {
  try {
    const { limit, page, user, status, companyMasterID, exportData } = req.body;
    const authUserMasterID = req.userDetails.userMasterId;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginateCondition =
      page && limit ? { offset: (page - 1) * limit, limit } : {};

    const condition = { userMasterID: authUserMasterID };
    if (status !== null && status !== undefined) {
      condition.authStatus = status;
      if (+status === 2) {
        condition['$salaryIncreReqAuth.authorizationStatus$'] = {
          [Sequelize.Op.notIn]: [3, 4, 5],
        };
      }
    } else {
      condition.authStatus = 2;
      condition['$salaryIncreReqAuth.authorizationStatus$'] = {
        [Sequelize.Op.notIn]: [3, 4, 5],
      };
    }

    if (user && user.length > 0) {
      condition['$salaryIncreReqAuth.userMasterID$'] = {
        [Sequelize.Op.in]: user,
      };
    }

    const userCondition = { status: 1 };
    if (companyMasterID) {
      userCondition.companyMasterId = companyMasterID;
    }
    const salaryIncrementAuthorizationRequest =
      await SalaryIncrementRequestAuthorization.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginateCondition,
        order: [['createdAt', 'DESC']],
        include: [
          {
            required: true,
            as: 'salaryIncreReqAuth',
            model: SalaryIncrementRequest,
            include: [
              {
                separate: true,
                as: 'salaryIncreReqAuth',
                model: SalaryIncrementRequestAuthorization,
                include: [
                  {
                    as: 'employee',
                    model: UserMaster,
                    attributes: ['displayName'],
                  },
                ],
              },
              {
                as: 'userMaster',
                model: UserMaster,
                where: userCondition,
                attributes: ['userMasterID', 'displayName', 'userNumber'],
                include: [
                  {
                    separate: true,
                    required: false,
                    model: AuthorizationDetails,
                    as: 'authorizationDetails',
                    where: {
                      status: 1,
                      AuthorizationMasterID:
                        authorizationMasterTypes.salaryIncrement,
                    },
                    attributes: ['AuthorizationCriteriaID'],
                    include: [
                      {
                        model: AuthorizationCriteria,
                        as: 'AuthorizationCriteriaMaster',
                        attributes: ['AuthorizationCriteria'],
                      },
                    ],
                  },
                  {
                    model: companyMaster,
                    attributes: ['companyName'],
                  },
                  {
                    separate: true,
                    required: false,
                    model: EmployeeDesignation,
                    where: {
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.lte]: new Date(filterDate),
                      },
                      [Sequelize.Op.or]: [
                        {
                          endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
                    separate: true,
                    model: EmployeeDepartment,
                    where: {
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.lte]: new Date(filterDate),
                      },
                      [Sequelize.Op.or]: [
                        {
                          endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
                    separate: true,
                    model: EmployeeBranch,
                    where: {
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.lte]: new Date(filterDate),
                      },
                      [Sequelize.Op.or]: [
                        {
                          endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
                    separate: true,
                    required: false,
                    model: EmployeeJoiningDetails,
                    attributes: ['employeeCode'],
                  },
                  {
                    required: false,
                    separate: true,
                    model: EmployeeDivision,
                    where: {
                      status: 1,
                      startDate: { [Sequelize.Op.lte]: filterDate },
                      [Sequelize.Op.or]: [
                        { endDate: { [Sequelize.Op.gte]: filterDate } },
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
                    separate: true,
                    model: EmployeeWorkingArea,
                    where: {
                      status: 1,
                      startDate: { [Sequelize.Op.lte]: filterDate },
                      [Sequelize.Op.or]: [
                        { endDate: { [Sequelize.Op.gte]: filterDate } },
                        { endDate: { [Sequelize.Op.eq]: null } },
                      ],
                    },

                    attributes: ['workingAreaId', 'startDate'],
                    include: [
                      {
                        model: WorkingArea,
                        attributes: ['workingAreaName'],
                      },
                    ],
                  },
                ],
              },
              {
                model: UserMaster,
                as: 'createByUser',
                attributes: ['displayName'],
              },
            ],
          },
        ],
      });
    if (exportData) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(
        'SalaryIncrementRequestAuthorization',
      );

      const columns = [
        { header: 'Company Name', key: 'companyName', width: 22 },
        { header: 'Employee Code', key: 'employeeCode', width: 18 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Mobile No', key: 'mobileNo', width: 15 },
        { header: 'Branch', key: 'branchName', width: 20 },
        { header: 'Department', key: 'departmentName', width: 22 },
        { header: 'Designation', key: 'designationName', width: 22 },
        { header: 'Working Area', key: 'workingAreaName', width: 20 },
        { header: 'Division', key: 'divisionName', width: 20 },
        { header: 'Authorization Criteria', key: 'authCriteria', width: 18 },
        { header: 'Authorizers', key: 'authorizer', width: 25 },
        { header: 'Authorizer Status', key: 'authorizerStatus', width: 18 },
        { header: 'Authorizer Remarks', key: 'authRemarks', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Remarks', key: 'remark', width: 20 },
        { header: 'Created By', key: 'createdBy', width: 22 },
        { header: 'Created Date', key: 'createdDate', width: 18 },
      ];

      worksheet.columns = columns;

      const headerRow = worksheet.getRow(1);

      headerRow.eachCell((cell) => {
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' },
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' },
        };

        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      let currentRowIndex = 2;

      for (const record of salaryIncrementAuthorizationRequest.rows) {
        const salaryIncrementRequest = record.salaryIncreReqAuth || {};
        const user = salaryIncrementRequest.userMaster || {};

        const authorizations = salaryIncrementRequest.salaryIncreReqAuth || [];

        const rowCount = Math.max(authorizations.length, 1);

        const commonFields = {
          authCriteria:
            user.authorizationDetails?.[0]?.AuthorizationCriteriaMaster
              ?.AuthorizationCriteria || '',

          companyName: user.companyMaster?.companyName || '',

          employeeCode: user.employeeJoiningDetails?.[0]?.employeeCode || '',

          name: user.displayName || '',

          mobileNo: user.userNumber || '',

          branchName:
            user.employeeBranches?.[0]?.branchMaster?.branchName || '',

          departmentName:
            user.employeeDepartments?.[0]?.department?.departmentName || '',

          designationName:
            user.employeeDesignations?.[0]?.designation?.designationName || '',

          workingAreaName:
            user.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName || '',

          divisionName:
            user.employeeDivisions?.[0]?.division?.divisionName || '',

          createdBy: salaryIncrementRequest.createByUser?.displayName || '',

          createdDate: record.createdAt
            ? moment(record.createdAt).format('DD-MM-YYYY')
            : '',

          remark: authorizations[0]?.remarks || '',

          status: [0, 1, 2].includes(
            record.salaryIncreReqAuth?.authorizationStatus,
          )
            ? 'Pending'
            : record.salaryIncreReqAuth?.authorizationStatus === 3
              ? 'Approved'
              : 'Rejected',
        };

        if (authorizations.length === 0) {
          const excelRow = worksheet.addRow({
            ...commonFields,
            authorizer: '',
            authorizerStatus: '',
            authRemarks: '',
          });

          excelRow.height = 20;

          excelRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };

            cell.alignment = {
              vertical: 'middle',
              wrapText: true,
            };
          });
        } else {
          for (const auth of authorizations) {
            const excelRow = worksheet.addRow({
              ...commonFields,

              authorizer: auth.employee?.displayName || '',

              authorizerStatus:
                auth.authStatus == 0
                  ? 'Rejected'
                  : auth.authStatus == 1
                    ? 'Approved'
                    : auth.authStatus == 2
                      ? 'Pending'
                      : '',

              authRemarks: auth.remarks || '',
            });

            excelRow.height = 20;

            excelRow.eachCell({ includeEmpty: true }, (cell) => {
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
              };

              cell.alignment = {
                vertical: 'middle',
                wrapText: true,
              };
            });
          }
        }

        if (rowCount > 1) {
          const mergeStart = currentRowIndex;
          const mergeEnd = currentRowIndex + rowCount - 1;

          const columnsToMerge = [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 15, 16, 17,
          ];

          columnsToMerge.forEach((col) => {
            worksheet.mergeCells(mergeStart, col, mergeEnd, col);
          });
        }

        currentRowIndex += rowCount;
      }
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );

      res.setHeader(
        'Content-Disposition',
        'attachment; filename="SalaryIncrementAuthorizations.xlsx"',
      );

      await workbook.xlsx.write(res);

      return res.end();
    }

    return res.status(200).json({
      status: 200,
      data: salaryIncrementAuthorizationRequest.rows,
      totalcount: salaryIncrementAuthorizationRequest.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.salaryIncrementAuthorizationacceptreject = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { salaryIncrementRequestAuthorizationID, remarks, authStatus } =
      req.body;

    const salaryIncrementAuthorizationIDList = Array.isArray(
      salaryIncrementRequestAuthorizationID,
    )
      ? salaryIncrementRequestAuthorizationID
      : [salaryIncrementRequestAuthorizationID];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    };

    const authRequests = await SalaryIncrementRequestAuthorization.findAll({
      where: {
        salaryIncrementRequestAuthorizationID:
          salaryIncrementAuthorizationIDList,
        authStatus: 2,
      },
      attributes: [
        'salaryIncrementRequestAuthorizationID',
        'userMasterID',
        'authStatus',
        'salaryIncrementRequestID',
      ],
      include: [
        {
          as: 'salaryIncreReqAuth',
          model: SalaryIncrementRequest,
          where: {
            authorizationStatus: [
              AuthorizationStatusType.PENDING_ZERO,
              AuthorizationStatusType.PEDING_ONE,
              AuthorizationStatusType.PEDING_TWO,
            ],
          },
          attributes: [
            'salaryIncrementRequestID',
            'userMasterID',
            'authorizationStatus',
          ],
          include: [
            {
              as: 'userMaster',
              model: UserMaster,
              attributes: ['displayName', 'userMasterID'],
              include: [
                {
                  separate: true,
                  model: AuthorizationDetails,
                  attributes: [
                    'AuthorizationDetailsId',
                    'AuthorizationCriteriaID',
                    'AuthorizationMasterID',
                    'AuthorizedByUserMasterId',
                  ],
                  where: {
                    AuthorizationMasterID:
                      authorizationMasterTypes.salaryIncrement,
                    status: 1,
                  },
                },
              ],
            },
          ],
        },
      ],
      ...options,
    });

    if (authRequests.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 500,
        message: 'Salary Structure Authorization request not found',
      });
    }

    if (authStatus == 0) {
      const allSalaryIncrementRequestIds = authRequests.map((e) => {
        return e?.salaryIncreReqAuth?.salaryIncrementRequestID;
      });

      const allAuthorizer = await getAllSalaryIncrement(
        allSalaryIncrementRequestIds,
        options,
      );

      const allIdToDestroInbox = allAuthorizer.flatMap((e) =>
        e.salaryIncreReqAuth.map(
          (id) => id.salaryIncrementRequestAuthorizationID,
        ),
      );

      const getIdtoUpdateSalaryIncrementAuth = allIdToDestroInbox.filter(
        (item) => salaryIncrementAuthorizationIDList.includes(item),
      );
      await updateSalaryIncrementAuth(
        getIdtoUpdateSalaryIncrementAuth,
        options,
        remarks,
        authStatus,
      );
      await destroyAllInboxes(allIdToDestroInbox, options);
      await updateSalaryIncrement(
        allSalaryIncrementRequestIds,
        options,
        AuthorizationStatusType.REJECTED,
        req.userDetails.userMasterId,
        false,
        remarks,
      );

      await transaction.commit();
      return res.status(200).json({
        status: 200,
        message: 'Salary Structure Authorization request rejected successfully',
      });
    } else {
      const anyOneData = [];
      const anyTwoData = [];
      const anyThreeData = [];
      const sequenceWise = [];
      let allIDsToDeleteInbox = [];
      let allIDsToUpdateSalaryIncrement = [];
      let allIDsToUpdateSalaryIncrementAuth = [];
      let bulkNotification = [];
      authRequests.map((data) => {
        if (
          data?.salaryIncreReqAuth?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYONE
        ) {
          anyOneData.push({
            salaryIncrementRequestAuthorizationID:
              data.salaryIncrementRequestAuthorizationID,
            salaryIncrementRequestID: data.salaryIncrementRequestID,
          });
        }
        if (
          data?.salaryIncreReqAuth?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTWO
        ) {
          anyTwoData.push({
            salaryIncrementRequestAuthorizationID:
              data.salaryIncrementRequestAuthorizationID,
            salaryIncrementRequestID: data.salaryIncrementRequestID,
          });
        }
        if (
          data?.salaryIncreReqAuth?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTHREE
        ) {
          anyThreeData.push({
            salaryIncrementRequestAuthorizationID:
              data.salaryIncrementRequestAuthorizationID,
            salaryIncrementRequestID: data.salaryIncrementRequestID,
          });
        }
        if (
          data?.salaryIncreReqAuth?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO
        ) {
          sequenceWise.push({
            salaryIncrementRequestAuthorizationID:
              data.salaryIncrementRequestAuthorizationID,
            salaryIncrementRequestID: data.salaryIncrementRequestID,
            authorizerIDs:
              data.salaryIncreReqAuth.userMaster.authorizationDetails[0]
                .AuthorizedByUserMasterId, // it is an array of userID
            userNameForNotification:
              data.salaryIncreReqAuth.userMaster.displayName,
            assignedBy: data.salaryIncreReqAuth.userMaster.userMasterID,
            date: data.salaryIncreReqAuth.date,
          });
        }
      });

      if (anyOneData.length > 0) {
        const getAllSalaryIncrementIds = anyOneData.map((e) => {
          return e.salaryIncrementRequestID;
        });

        const getAllAuthorizers = await getAllSalaryIncrement(
          getAllSalaryIncrementIds,
          options,
        );

        const getAllIdsToDestryInbox = getAllAuthorizers.flatMap((e) =>
          e.salaryIncreReqAuth.map(
            (id) => id.salaryIncrementRequestAuthorizationID,
          ),
        );
        const getIdtoUpdateSalaryIncrementAuth = getAllIdsToDestryInbox.filter(
          (item) => salaryIncrementAuthorizationIDList.includes(item),
        );

        allIDsToUpdateSalaryIncrementAuth = [
          ...allIDsToUpdateSalaryIncrementAuth,
          ...getIdtoUpdateSalaryIncrementAuth,
        ];
        allIDsToDeleteInbox = [
          ...allIDsToDeleteInbox,
          ...getAllIdsToDestryInbox,
        ];
        allIDsToUpdateSalaryIncrement = [
          ...allIDsToUpdateSalaryIncrement,
          ...getAllSalaryIncrementIds,
        ];
      }
      if (anyTwoData.length > 0) {
        const getAllSalaryIncrementId = anyTwoData.map(
          (e) => e.salaryIncrementRequestID,
        );
        const getAUthorizationReqId = anyTwoData.map(
          (e) => e.salaryIncrementRequestAuthorizationID,
        );

        const getAllSalaryIncrementData = await getAllSalaryIncrement(
          getAllSalaryIncrementId,
          options,
        );

        const otherAuthorizers = [];
        const salaryIncrementApprovedIds = [];

        getAllSalaryIncrementData.forEach((item) => {
          const authorizers = item.salaryIncreReqAuth;
          const approved = authorizers.filter((a) => a.authStatus === 1);

          if (approved.length == 1) {
            const allIds = authorizers.map(
              (a) => a.salaryIncrementRequestAuthorizationID,
            );

            otherAuthorizers.push(...allIds);
            salaryIncrementApprovedIds.push(item.salaryIncrementRequestID);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];
        const getIdtoUpdateSalaryIncrementAuth = getAUthorizationReqId.filter(
          (item) => salaryIncrementAuthorizationIDList.includes(item),
        );

        allIDsToUpdateSalaryIncrementAuth = [
          ...allIDsToUpdateSalaryIncrementAuth,
          ...getIdtoUpdateSalaryIncrementAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateSalaryIncrement = [
          ...allIDsToUpdateSalaryIncrement,
          ...salaryIncrementApprovedIds,
        ];
      }
      if (anyThreeData.length > 0) {
        const getAllSalaryIncrementId = anyThreeData.map(
          (e) => e.salaryIncrementRequestID,
        );
        const getAUthorizationReqId = anyThreeData.map(
          (e) => e.salaryIncrementRequestAuthorizationID,
        );

        const getAllSalaryIncrementData = await getAllSalaryIncrement(
          getAllSalaryIncrementId,
          options,
        );

        const otherAuthorizers = [];
        const salaryIncrementApprovedIds = [];

        getAllSalaryIncrementData.forEach((item) => {
          const authorizers = item.salaryIncreReqAuth;

          const approved = authorizers.filter((a) => a.authStatus === 1);

          if (approved.length == 2) {
            const allIds = authorizers.map(
              (a) => a.salaryIncrementRequestAuthorizationID,
            );

            otherAuthorizers.push(...allIds);
            salaryIncrementApprovedIds.push(item.salaryIncrementRequestID);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];
        const getIdtoUpdateSalaryIncrementAuth = getAUthorizationReqId.filter(
          (item) => salaryIncrementAuthorizationIDList.includes(item),
        );

        allIDsToUpdateSalaryIncrementAuth = [
          ...allIDsToUpdateSalaryIncrementAuth,
          ...getIdtoUpdateSalaryIncrementAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateSalaryIncrement = [
          ...allIDsToUpdateSalaryIncrement,
          ...salaryIncrementApprovedIds,
        ];
      }
      if (sequenceWise.length > 0) {
        const getAllSalaryIncrementId = sequenceWise.map(
          (e) => e.salaryIncrementRequestID,
        );
        const getAUthorizationReqId = sequenceWise.map(
          (e) => e.salaryIncrementRequestAuthorizationID,
        );

        const otherAuthorizers = [];
        const salaryIncrementApprovedIds = [];
        const createSalaryIncrementAuth = [];
        const sendNotificationInbox = [];

        const getIdtoUpdateSalaryIncrementAuth = getAUthorizationReqId.filter(
          (item) => salaryIncrementAuthorizationIDList.includes(item),
        );
        await updateSalaryIncrementAuth(
          getIdtoUpdateSalaryIncrementAuth,
          options,
          remarks,
          authStatus,
        );

        const getAllSalaryIncrementData = await getAllSalaryIncrement(
          getAllSalaryIncrementId,
          options,
        );

        getAllSalaryIncrementData.forEach((item) => {
          const authorizers = item.salaryIncreReqAuth;

          const approved = authorizers.filter((a) => a.authStatus === 1);

          const seq = sequenceWise.find(
            (x) => x.salaryIncrementRequestID === item.salaryIncrementRequestID,
          );

          if (!seq) return;

          const sequenceUserIDs = seq.authorizerIDs.map((id) => id.toString());

          const approvedUserIDs = approved.map((a) =>
            a.userMasterID.toString(),
          );

          const remainingUsers = sequenceUserIDs.filter(
            (id) => !approvedUserIDs.includes(id),
          );

          if (remainingUsers.length === 0) {
            const allIds = authorizers.map(
              (a) => a.salaryIncrementRequestAuthorizationID,
            );

            otherAuthorizers.push(...allIds);
            salaryIncrementApprovedIds.push(item.salaryIncrementRequestID);
            return;
          }

          const nextUser = remainingUsers[0]; // FIRST PENDING USER

          createSalaryIncrementAuth.push({
            salaryIncrementRequestID: item.salaryIncrementRequestID,
            userMasterID: +nextUser,
            authStatus: 2,
          });
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateSalaryIncrement = [
          ...allIDsToUpdateSalaryIncrement,
          ...salaryIncrementApprovedIds,
        ];

        const createNewSalaryIncrementAuth =
          await SalaryIncrementRequestAuthorization.bulkCreate(
            createSalaryIncrementAuth,
            { ...options },
          );

        sequenceWise.map((item) => {
          const data = createNewSalaryIncrementAuth.find(
            (e) => e.salaryIncrementRequestID == item.salaryIncrementRequestID,
          );

          if (data) {
            sendNotificationInbox.push({
              assignedTo: data.userMasterID,
              salaryIncrementRequestID: item.salaryIncrementRequestID,
              assignedBy: item.assignedBy,
              activityTable: SalaryIncrementRequestAuthorization.getTableName(),
              activityTablePK: data.salaryIncrementRequestAuthorizationID,
              message: `${item.userNameForNotification} has requested New Salary Structure `,
            });
          }
        });

        if (sendNotificationInbox.length > 0) {
          bulkNotification = await UserInbox.bulkCreate(sendNotificationInbox, {
            ...options,
          });
        }
      }
      await updateSalaryIncrementAuth(
        allIDsToUpdateSalaryIncrementAuth,
        options,
        remarks,
        authStatus,
      );

      await destroyAllInboxes(allIDsToDeleteInbox, options);
      let msg = '';
      if (allIDsToUpdateSalaryIncrement.length > 0) {
       msg = await updateSalaryIncrement(
          allIDsToUpdateSalaryIncrement,
          options,
          AuthorizationStatusType.APPROVED,
          req.userDetails.userMasterId,
          false,
          remarks,
        );
      }
      await transaction.commit();
      const data = {
        screen: notificationScreentTypes.SALARYINCREMENT,
      };

      bulkNotification.forEach(async (item) => {
        const notification = {
          title: notificationTitleTypes.SALARYINCREMENT,
          body: item.message,
        };
        sendNotification(item.assignedTo, notification, data);
      });

      return res.status(200).json({
        status: msg ? 400 : 200,
        message: msg ? msg.skippedMessage : 'Salary Structure Authorization request approved successfully',
      });
    }
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

async function updateSalaryIncrementAuth(
  allIdToUpdate,
  options,
  remarks,
  authStatus,
) {
  const updateAllAuthorizationById =
    await SalaryIncrementRequestAuthorization.update(
      {
        remarks: remarks,
        authStatus: authStatus,
      },
      {
        where: {
          salaryIncrementRequestAuthorizationID: allIdToUpdate,
        },
        ...options,
      },
    );
}

async function destroyAllInboxes(allIdToDestroInbox, options) {
  const destroyAllInbox = await UserInbox.destroy(
    {
      where: {
        activityTable: SalaryIncrementRequestAuthorization.getTableName(),
        activityTablePK: allIdToDestroInbox,
      },
    },
    { ...options },
  );
}

async function updateSalaryIncrement(
  allSalaryIncrementIds,
  options,
  authorizationStatus,
  userMasterId,
  isAuthorizedBy = false,
  remark,
) {
  await SalaryIncrementRequest.update(
    {
      authorizationStatus,
      authorizedBy: userMasterId,
      authorizedAt: new Date(),
      isAuthorizedBy,
      authorizerRemark: remark,
    },
    {
      where: {
        salaryIncrementRequestID: {
          [Sequelize.Op.in]: allSalaryIncrementIds,
        },
      },
      ...options,
    },
  );

  if (authorizationStatus !== AuthorizationStatusType.APPROVED) {
    return;
  }

  const salaryIncrements = await SalaryIncrementRequest.findAll({
    where: {
      salaryIncrementRequestID: {
        [Sequelize.Op.in]: allSalaryIncrementIds,
      },
    },
    include: [
      {
        model: SalaryIncrementRequestDetails,
        as: 'SIRDetails',
      },
      {
        model: UserMaster,
        as: 'userMaster',
        attributes: ['userMasterID', 'displayName']
      }
    ],
    ...options,
  });

  if (!salaryIncrements.length) {
    return;
  }

  const userIds = [
    ...new Set(salaryIncrements.map((item) => item.userMasterID)),
  ];

  // Get latest calculated salary records
  const calculatedSalaries = await HRSalaryTrasaction.findAll({
    where: {
      userMasterID: {
        [Sequelize.Op.in]: userIds,
      },
    },
    order: [['salaryYYYYMM', 'DESC']],
    ...options,
  });

  const salaryTransactionMap = {};
  const skippedEmployees = [];
  for (const item of calculatedSalaries) {
    const key = `${item.userMasterID}_${item.payrollFrequency}`;

    if (!salaryTransactionMap[key]) {
      salaryTransactionMap[key] = item;
    }
  }

  // Existing salary structures
  const existingSalaryData = await HRSalaryMasterFields.findAll({
    where: {
      userMasterID: {
        [Sequelize.Op.in]: userIds,
      },
    },
    attributes: [
      'userMasterID',
      'payrollFrequency',
      'salaryFromYYYYMM',
      'startDate',
      'endDate',
    ],
    ...options,
  });

  const existingSalaryMap = new Set();

  existingSalaryData.forEach((item) => {
    let key;

    if (
      [PayrollFrequencyType.WEEKLY, PayrollFrequencyType.FORTNIGHTLY].includes(
        item.payrollFrequency,
      )
    ) {
      key = `${item.userMasterID}_${item.payrollFrequency}_${item.startDate}_${item.endDate}`;
    } else {
      key = `${item.userMasterID}_${item.payrollFrequency}_${item.salaryFromYYYYMM}`;
    }

    existingSalaryMap.add(key);
  });

  const result = [];

  for (const salaryIncrement of salaryIncrements) {
    const transactionKey = `${salaryIncrement.userMasterID}_${salaryIncrement.payrollFrequency}`;

    const latestCalculatedSalary = salaryTransactionMap[transactionKey];

    // Check salary already calculated
    if (latestCalculatedSalary) {
      let salaryAlreadyCalculated = false;

      if (
        [
          PayrollFrequencyType.WEEKLY,
          PayrollFrequencyType.FORTNIGHTLY,
        ].includes(salaryIncrement.payrollFrequency)
      ) {
        salaryAlreadyCalculated =
          new Date(latestCalculatedSalary.startDate) >=
          new Date(salaryIncrement.startDate);
      } else {
        salaryAlreadyCalculated =
          +latestCalculatedSalary.salaryYYYYMM >=
          +salaryIncrement.salaryFromYYYYMM;
      }

      if (salaryAlreadyCalculated) {
  skippedEmployees.push({
    userMasterID: salaryIncrement.userMasterID,
    employeeName: salaryIncrement.userMaster?.displayName,
    payrollFrequency: salaryIncrement.payrollFrequency,
    salaryFromYYYYMM: salaryIncrement.salaryFromYYYYMM,
  });

  continue;
}
    }

    // Check salary structure already exists
    let salaryStructureKey;

    if (
      [PayrollFrequencyType.WEEKLY, PayrollFrequencyType.FORTNIGHTLY].includes(
        salaryIncrement.payrollFrequency,
      )
    ) {
      salaryStructureKey = `${salaryIncrement.userMasterID}_${salaryIncrement.payrollFrequency}_${salaryIncrement.startDate}_${salaryIncrement.endDate}`;
    } else {
      salaryStructureKey = `${salaryIncrement.userMasterID}_${salaryIncrement.payrollFrequency}_${salaryIncrement.salaryFromYYYYMM}`;
    }

    if (existingSalaryMap.has(salaryStructureKey)) {
      continue;
    }

    // Prevent duplicates in current batch
    existingSalaryMap.add(salaryStructureKey);

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
        salaryIncrementRequestID: salaryIncrement.salaryIncrementRequestID,
        gradeSalaryStructureID: detail.gradeSalaryStructureID,
        EmployeeSalaryAmount: detail.EmployeeSalaryAmount,
        ActualEmployeeSalaryAmount: detail.ActualEmployeeSalaryAmount,
      });
    }
  }

  let skippedMessage = '';

if (skippedEmployees.length > 0) {
  skippedMessage =
    'Salary structure was not created for the following employees because salary has already been calculated: ' +
    skippedEmployees.map((e) => e.employeeName).join(', ');
}

  if (result.length > 0) {
    await HRSalaryMasterFields.bulkCreate(result, {
      ...options,
      individualHooks: true,
    });
  }

  if(skippedMessage){
    return {
  skippedEmployees,
  skippedMessage,
};
  }
}

async function getAllSalaryIncrement(allSalaryIncrementIds, options) {
  const allAuthorizer = await SalaryIncrementRequest.findAll({
    where: {
      salaryIncrementRequestID: allSalaryIncrementIds,
      authorizationStatus: [
        AuthorizationStatusType.PENDING_ZERO,
        AuthorizationStatusType.PEDING_ONE,
        AuthorizationStatusType.PEDING_TWO,
      ],
    },
    include: [
      {
        as: 'salaryIncreReqAuth',
        model: SalaryIncrementRequestAuthorization,
      },
    ],
    ...options,
  });
  return allAuthorizer;
}

exports.getAllSalaryIncrementAuthorizationAdmin = async (req, res, next) => {
  try {
    const { limit, page, userMasterID, authorizationstatus, companyMasterID } =
      req.body;

    if (!companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Company'),
      });
    }

    const allowedKeys = [
      'companyMasterID',
      'userMasterID',
      'page',
      'limit',
      'authorizationstatus',
    ];

    const invalidKeys = invalidKeyParams(
      { ...req.body, ...req.params },
      allowedKeys,
    );

    if (invalidKeys.length > 0) {
      return res.status(200).json({
        status: 400,
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const condition = {};

    if (userMasterID.length > 0) {
      condition.userMasterID = userMasterID;
    }

    if (authorizationstatus) {
      if (authorizationstatus == 1) {
        condition.authorizationStatus = [0, 1, 2];
      } else {
        condition.authorizationStatus = authorizationstatus == 4 ? [4] : [3, 5];
      }
    } else {
      condition.authorizationStatus = [0, 1, 2];
    }

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const getAllExtraDayAuthRequest =
      await SalaryIncrementRequest.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginationQuery,
        order: [['createdAt', 'DESC']],
        include: [
          {
            separate: true,
            as: 'salaryIncreReqAuth',
            model: SalaryIncrementRequestAuthorization,
            include: [
              {
                as: 'employee',
                model: UserMaster,
                attributes: ['displayName'],
              },
            ],
          },
          {
            as: 'userMaster',
            model: UserMaster,
            attributes: ['userMasterID', 'displayName', 'userNumber'],
            where: {
              ...where,
              companyMasterId: companyMasterID,
              status: 1,
            },
            include: [
              ...includeModels,
              {
                separate: true,
                required: false,
                model: EmployeeDesignation,
                where: {
                  status: 1,
                  applicableDate: {
                    [Sequelize.Op.lte]: new Date(filterDate),
                  },
                  [Sequelize.Op.or]: [
                    {
                      endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
                separate: true,
                model: EmployeeDepartment,
                where: {
                  status: 1,
                  applicableDate: {
                    [Sequelize.Op.lte]: new Date(filterDate),
                  },
                  [Sequelize.Op.or]: [
                    {
                      endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
                separate: true,
                model: EmployeeBranch,
                where: {
                  status: 1,
                  applicableDate: {
                    [Sequelize.Op.lte]: new Date(filterDate),
                  },
                  [Sequelize.Op.or]: [
                    {
                      endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
                separate: true,
                required: false,
                model: EmployeeJoiningDetails,
                attributes: ['employeeCode'],
              },
              {
                required: false,
                separate: true,
                model: EmployeeDivision,
                where: {
                  status: 1,
                  startDate: { [Sequelize.Op.lte]: filterDate },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: filterDate } },
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
                separate: true,
                model: EmployeeWorkingArea,
                where: {
                  status: 1,
                  startDate: { [Sequelize.Op.lte]: filterDate },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: filterDate } },
                    { endDate: { [Sequelize.Op.eq]: null } },
                  ],
                },

                attributes: ['workingAreaId', 'startDate'],
                include: [
                  {
                    model: WorkingArea,
                    attributes: ['workingAreaName'],
                  },
                ],
              },
            ],
          },
          {
            model: UserMaster,
            as: 'createByUser',
            attributes: ['displayName'],
          },
        ],
      });

    return res.status(200).json({
      status: 200,
      data: getAllExtraDayAuthRequest.rows,
      totalcount: getAllExtraDayAuthRequest.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptRejectSalaryIncrementAuthAdmin = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { salaryIncrementRequestID, authStatus, remarks } = req.body;

    if (!salaryIncrementRequestID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Salary Structure Authorization Request',
        ),
      });
    }

    const allowedKeys = ['salaryIncrementRequestID', 'authStatus', 'remarks'];

    const invalidKeys = invalidKeyParams(
      { ...req.body, ...req.params },
      allowedKeys,
    );

    if (invalidKeys.length > 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const salaryIncrementAuthorizationIDList = Array.isArray(
      salaryIncrementRequestID,
    )
      ? salaryIncrementRequestID
      : [salaryIncrementRequestID];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    };

    const allSalaryIncrement = await getAllSalaryIncrement(
      salaryIncrementAuthorizationIDList,
      options,
    );

    if (allSalaryIncrement.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Salary Structure Authorization Request',
        ),
      });
    }

    const idToApproveExtraDays = allSalaryIncrement.map(
      (item) => item.salaryIncrementRequestID,
    );
    const idToDestroyInbox = allSalaryIncrement.flatMap((item) =>
      item.salaryIncreReqAuth.map(
        (e) => e.salaryIncrementRequestAuthorizationID,
      ),
    );

    await destroyAllInboxes(idToDestroyInbox, options);
    const updatedData =
      authStatus == 1
        ? await updateSalaryIncrement(
            idToApproveExtraDays,
            options,
            AuthorizationStatusType.APPROVED,
            req.userDetails.userMasterId,
            true,
            remarks,
          )
        : await updateSalaryIncrement(
            idToApproveExtraDays,
            options,
            AuthorizationStatusType.REJECTED,
            req.userDetails.userMasterId,
            true,
            remarks,
          );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        authStatus == 1
          ? 'Salary Structure Authorization Request Approved Successfully'
          : 'Salary Structure Authorization Request Rejected Successfully',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
