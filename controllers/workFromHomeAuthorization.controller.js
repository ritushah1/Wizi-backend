const message = require('../response_message/message');
const e = require('express');
const {
  WorkFromHomeTypes,
  AuthorizationStatusType,
  AuthStatusInAuthorizationRequest,
  authorizationCriteriaType,
  authorizationMasterTypes,
} = require('../utils/dbUtils');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const AuthorizationDetailService = require('../services/authorizationDetailService');
const UserWorkFromHomeService = require('../services/userWorkFromHomeService');
const WorkFromHomeAuthorizationService = require('../services/workFromHomeAuthorization');
const sequelize = require('../config/database');
const { Op, Sequelize } = require('sequelize');
const { statusCodes } = require('../utils/commonVars');
const UserMaster = require('../models/userMaster');
const WorkFromHomeAuthorization = require('../models/workFromHomeAuthorizations');
const {
  asiaKolkataDateTime,
  sendNotification,
} = require('../utils/commonUtilFunctions');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const Designation = require('../models/designation');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const EmployeeBranch = require('../models/employeeBranch');
const UserWorkFromHome = require('../models/userWorkFromHome');
const { includes } = require('lodash');
const WorkFromHomeTransaction = require('../models/workFromHomeTransaction');
const workFromHomeTransactionService = require('../services/workFromHomeTransactionService');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const userInboxService = require('../services/userInboxService');
const userMasterService = require('../services/userMasterService');
const userWorkFromHomeService = require('../services/userWorkFromHomeService');
const FormAuthorizationDetails = require('../models/AuthorizationDetails');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const ExcelJS = require('exceljs');
const moment = require('moment');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const Division = require('../models/division');
const EmployeeDivision = require('../models/employeeDivision');
const companyMaster = require('../models/companyMaster');

exports.list = async (req, res, next) => {
  try {
    let {
      page = 1,
      pageSize = 10,
      sortByField,
      sortByValue,
      userMasterID,
      fromDate,
      toDate,
      dayType,
      authStatus,
      companyMasterID,
      isExport = false,
    } = req.body;

    const allowedKeys = [
      'page',
      'pageSize',
      'sortByField',
      'sortByValue',
      'userMasterID',
      'fromDate',
      'toDate',
      'dayType',
      'authStatus',
      'companyMasterID',
      'isExport',
    ];

    const invalidKeys = invalidKeyParams(req.body, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid query parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    page = parseInt(page);
    pageSize = parseInt(pageSize);

    if (!sortByField) {
      sortByField = 'createdAt';
    }

    if (!sortByValue) {
      sortByValue = 'DESC';
    }

    const order = [[sortByField, sortByValue]];

    const where = {
      userMasterID: req.userDetails.userMasterId,
    };

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const userWorkFromHomeWhere = {};

    if (authStatus !== null && authStatus !== undefined) {
      where.authStatus = authStatus;
      if (+authStatus == 2) {
        userWorkFromHomeWhere['authorizationStatus'] = {
          [Sequelize.Op.notIn]: [3, 4],
        };
      }
    } else {
      where.authStatus = authStatus;
    }

    if (fromDate && toDate) {
      userWorkFromHomeWhere[Op.or] = [
        { fromDate: { [Op.between]: [fromDate, toDate] } },
        { toDate: { [Op.between]: [fromDate, toDate] } },
        {
          fromDate: { [Op.lte]: fromDate },
          toDate: { [Op.gte]: toDate },
        },
      ];
    } else if (fromDate) {
      userWorkFromHomeWhere[toDate] = { [Op.gte]: fromDate };
    } else if (toDate) {
      userWorkFromHomeWhere[fromDate] = { [Op.lte]: toDate };
    }

    if (dayType) {
      userWorkFromHomeWhere[dayType] = dayType;
    }

    if (Array.isArray(userMasterID) && userMasterID.length > 0) {
      userWorkFromHomeWhere.userMasterID = {
        [Op.in]: userMasterID,
      };
    }

    const offset = (page - 1) * pageSize;
    const userCondition = { status: 1 };
    if (companyMasterID) {
      userCondition.companyMasterId = companyMasterID;
    }
    const include = [
      {
        model: UserWorkFromHome,
        where: userWorkFromHomeWhere,
        include: [
          {
            model: UserMaster,
            where: userCondition,
            attributes: ['userMasterID', 'displayName', 'userNumber', 'companyMasterId'],
            include: [
              {
                model: companyMaster,
                attributes: ['companyName']
              },
              {
                model: EmployeeJoiningDetails,
                attributes: ['employeeCode'],
              },
              {
                separate: true,
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
                separate: true,
                model: EmployeeDivision,
                where: {
                  status: 1,
                  startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
                  startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
            separate: true,
            model: WorkFromHomeAuthorization,
            attributes: ['authStatus', 'userMasterID'],
            include: [
              {
                model: UserMaster,
                attributes: ['displayName'],
              },
            ],
          },
          {
            model: AuthorizationCriteriaMaster,
            as: 'wfhAuthCri',
            attributes: ['AuthorizationCriteria'],
          },
        ],
      },
    ];

    const result = await WorkFromHomeAuthorizationService.list(
      offset,
      pageSize,
      order,
      where,
      include,
      true,
    );

    if (isExport) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('LeaveAuthorizationRequests');

      const columns = [
        { header: 'Company Name', key: 'companyName', width: 18 }, // 1
        { header: 'Employee Code', key: 'employeeCode', width: 18 }, // 1
        { header: 'Employee Name', key: 'employeeName', width: 25 }, // 2
        { header: 'Branch', key: 'branchName', width: 20 }, // 3
        { header: 'Department', key: 'departmentName', width: 22 }, // 4
        { header: 'Designation', key: 'designationName', width: 22 }, // 5
        { header: 'Division', key: 'divisionName', width: 20 }, // 6
        { header: 'Working Area', key: 'workingAreaName', width: 20 }, // 7
        { header: 'From Date', key: 'fromDate', width: 15 }, // 8
        { header: 'To Date', key: 'toDate', width: 22 }, // 9
        { header: 'Day Type', key: 'dayType', width: 22 }, // 10
        { header: 'Days', key: 'leaveDays', width: 20 }, // 11
        { header: 'Remarks', key: 'remarks', width: 25 }, // 13
        { header: 'Status', key: 'authStatus', width: 15 }, // 12
        { header: 'Auth Criteria', key: 'authCriteria', width: 25 }, // 14
        { header: 'Authorizer', key: 'authorizer', width: 25 }, // 15 ← per-row
        { header: 'Authorizer Status', key: 'authorizerStatus', width: 18 }, // 16 ← per-row
        { header: 'Applied On', key: 'createdAt', width: 18 }, // 17
      ];

      worksheet.columns = columns;

      // ── Style header row ─────────────────────────────────────────────────
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
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
      headerRow.height = 30;

      // ── Data rows ────────────────────────────────────────────────────────
      let currentRowIndex = 2;

      for (const request of result.rows) {
        const WFHRequest = request.userWorkFromHome || {};
        const userData = WFHRequest.userMaster || {};

        // ── Employee identifiers ─────────────────────────────────────────

        const companyName = userData?.companyMaster?.companyName;
        const empCode =
          (userData.employeeJoiningDetails || [])[0]?.employeeCode || '';

        const designationName =
          (userData.employeeDesignations || [])[0]?.designation
            ?.designationName || '';

        const departmentName =
          (userData.employeeDepartments || [])[0]?.department?.departmentName ||
          '';

        const branchName =
          (userData.employeeBranches || [])[0]?.branchMaster?.branchName || '';

        const divisionName =
          (userData.employeeDivisions || [])[0]?.division?.divisionName || '';

        const workingAreaName =
          (userData.employeeWorkingAreas || [])[0]?.workingArea
            ?.workingAreaName || '';

        // ── Outdoor Duty fields ────────────────────────────────

        const leaveDays = WFHRequest?.workFromHomeDays;
        const dayType = WFHRequest?.dayType;
        const toDate = WFHRequest?.toDate ? moment(WFHRequest?.toDate).format('DD-MM-YYYY')
            : '';
        const fromDate = WFHRequest?.fromDate ? moment(WFHRequest?.fromDate).format('DD-MM-YYYY')
            : '';

        const authStatus =
          WFHRequest.authorizationStatus == 4
            ? 'Rejected'
            : WFHRequest.authorizationStatus == 3
              ? 'Approved'
              : 'Pending';

        const remarks = WFHRequest.remark;
        // ── Auth criteria ────────────────────────────────────────────────
        // Sourced from nested AuthorizationDetails → AuthorizationCriteriaMaster
        const authCriteria =
          WFHRequest?.wfhAuthCri?.AuthorizationCriteria || '';

        const authorizers = (WFHRequest.workFromHomeAuthorizations || []).map(
          (auth) => ({
            name: auth.userMaster?.displayName || '',
            status:
              auth.authStatus == 0
                ? 'Rejected'
                : auth.authStatus == 1
                  ? 'Approved'
                  : auth.authStatus == 2
                    ? 'Pending'
                    : '',
          }),
        );

        const rowCount = Math.max(authorizers.length, 1);

        // ── Common fields (shared across all merged rows) ────────────────
        const commonFields = {
          employeeCode: empCode,
          companyName,
          employeeName: userData.displayName || '',
          branchName,
          departmentName,
          designationName,
          divisionName,
          workingAreaName,
          dayType,
          fromDate,
          toDate,
          leaveDays,
          authStatus,
          authCriteria,
          remarks,
          createdAt: request.createdAt
            ? moment(request.createdAt).format('DD-MM-YYYY hh:mm')
            : '',
        };

        // ── Write one row per authorizer ─────────────────────────────────
        for (let i = 0; i < rowCount; i++) {
          const auth = authorizers[i] || { name: '', status: '' };
          const excelRow = worksheet.addRow({
            ...commonFields,
            authorizer: auth.name,
            authorizerStatus: auth.status,
          });
          excelRow.height = 20;
          excelRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
            cell.alignment = { vertical: 'middle', wrapText: true };
          });
        }

        // ── Merge common columns across authorizer rows ──────────────────
        if (rowCount > 1) {
          const mergeStart = currentRowIndex;
          const mergeEnd = currentRowIndex + rowCount - 1;

          // All cols except 22 (authorizer) and 23 (authorizerStatus)
          const columnsToMerge = [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18,
          ];

          for (const colNum of columnsToMerge) {
            worksheet.mergeCells(mergeStart, colNum, mergeEnd, colNum);
            const mergedCell = worksheet.getCell(mergeStart, colNum);
            mergedCell.alignment = {
              vertical: 'middle',
              horizontal: 'left',
              wrapText: true,
            };
          }
        }

        currentRowIndex += rowCount;
      }

      // ── Stream response ──────────────────────────────────────────────────
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="LeaveAuthorizationRequests.xlsx"',
      );

      await workbook.xlsx.write(res);
      return res.end();
    }

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: message.usermessage.fetchMessage('Work From Home Authorization'),
      data: result.rows,
      totalRecords: result.count,
      currentPage: page,
      totalPages: Math.ceil(result.count / pageSize),
    });
  } catch (err) {
    next(err);
  }
};

exports.view = async (req, res, next) => {
  try {
    const allowedParams = ['id'];

    const invalidParams = invalidKeyParams(req.params, allowedParams);

    if (invalidParams.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid route parameter(s): ${invalidParams.join(', ')}`,
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Missing required parameter: id',
      });
    }

    const attributes = [
      'id',
      'dayType',
      'fromDate',
      'toDate',
      'workFromHomeDays',
      'remark',
      'authorizationStatus',
      'status',
      'AuthorizationCriteriaID',
      'createdAt',
      'authorizerRemark',
    ];

    const include = [
      {
        model: UserMaster,
        attributes: ['userMasterID', 'displayName', 'userNumber'],

        include: [
          {
            model: EmployeeDesignation,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: null },
              ],
            },
            separate: true,
            required: false,
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
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: null },
              ],
            },
            separate: true,
            required: false,
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
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: null },
              ],
            },
            separate: true,
            required: false,
            attributes: ['branchID', 'applicableDate'],
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
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
        ],
      },
      {
        model: WorkFromHomeTransaction,
        attributes: [
          'workFromHomeTransactionID',
          'userWorkFromHomeID',
          'days',
          'date',
          'remark',
          'status',
        ],
      },
      {
        model: WorkFromHomeAuthorization,
        attributes: [
          'whAuthoriztaionid',
          'userWorkFromHomeID',
          'userMasterID',
          'remark',
          'status',
          'authStatus',
          'updatedAt',
        ],
        include: [
          {
            model: UserMaster,
            attributes: ['userMasterID', 'displayName'],
          },
        ],
      },
      {
        model: AuthorizationCriteriaMaster,
        attributes: ['AuthorizationCriteria'],
      },
      {
        model: UserMaster,
        as: 'authorizer',
        attributes: ['displayName'],
      },
    ];

    const result = await UserWorkFromHomeService.editWorkFromHome(
      { id: id },
      attributes,
      include,
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Work From Home Authorization'),
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.viewV2 = async (req, res, next) => {
  try {
    // const allowedParams = ['id'];

    // const invalidParams = invalidKeyParams(req.params, allowedParams);

    // if (invalidParams.length > 0) {
    //   return res.status(statusCodes.BAD_REQUEST).json({
    //     message: `Invalid route parameter(s): ${invalidParams.join(', ')}`,
    //   });
    // }

    let { id,userMasterID } = req.body;

    if(req.userDetails.isMyUserDetails){
      userMasterID=req.userDetails.userMasterId
    }

    if (!id) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Missing required parameter: id',
      });
    }

    const attributes = [
      'id',
      'dayType',
      'fromDate',
      'toDate',
      'workFromHomeDays',
      'remark',
      'authorizationStatus',
      'status',
      'AuthorizationCriteriaID',
      'createdAt',
      'authorizerRemark',
    ];

    const include = [
      {
        model: UserMaster,
        attributes: ['userMasterID', 'displayName', 'userNumber'],

        include: [
          {
            model: EmployeeDesignation,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: null },
              ],
            },
            separate: true,
            required: false,
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
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: null },
              ],
            },
            separate: true,
            required: false,
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
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: null },
              ],
            },
            separate: true,
            required: false,
            attributes: ['branchID', 'applicableDate'],
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
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
        ],
      },
      {
        model: WorkFromHomeTransaction,
        attributes: [
          'workFromHomeTransactionID',
          'userWorkFromHomeID',
          'days',
          'date',
          'remark',
          'status',
        ],
      },
      {
        model: WorkFromHomeAuthorization,
        attributes: [
          'whAuthoriztaionid',
          'userWorkFromHomeID',
          'userMasterID',
          'remark',
          'status',
          'authStatus',
          'updatedAt',
        ],
        include: [
          {
            model: UserMaster,
            attributes: ['userMasterID', 'displayName'],
          },
        ],
      },
      {
        model: AuthorizationCriteriaMaster,
        attributes: ['AuthorizationCriteria'],
      },
      {
        model: UserMaster,
        as: 'authorizer',
        attributes: ['displayName'],
      },
    ];

    const result = await UserWorkFromHomeService.editWorkFromHome(
      { id: id ,userMasterID:userMasterID},
      attributes,
      include,
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Work From Home Authorization'),
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.statusUpdate = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const allowedKeys = ['authStatus', 'remark', 'id'];

    const invalidKeys = invalidKeyParams(req.body, allowedKeys);

    if (invalidKeys.length > 0) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid query parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const { authStatus, remark, id } = req.body;

    if (!id) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Work From Home Request, Try again!',
        ),
      });
    }

    const wfhIDList = Array.isArray(id) ? id : [id];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    };

    const workFromHomeAuthorizationData =
      await WorkFromHomeAuthorizationService.getAllWorkFromHomeAuthorization(
        [
          'whAuthoriztaionid',
          'userMasterID',
          'authStatus',
          'userWorkFromHomeID',
        ],
        {
          whAuthoriztaionid: wfhIDList,
          authStatus: 2,
        },
        [
          {
            model: UserWorkFromHome,
            where: {
              authorizationStatus: [
                AuthorizationStatusType.PENDING_ZERO,
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
            attributes: [
              'id',
              'userMasterID',
              'fromDate',
              'toDate',
              'dayType',
              'authorizationStatus',
            ],
            include: [
              {
                model: UserMaster,
                attributes: ['displayName', 'userMasterID'],
                include: [
                  {
                    separate: true,
                    model: FormAuthorizationDetails,
                    attributes: [
                      'AuthorizationDetailsId',
                      'AuthorizationCriteriaID',
                      'AuthorizationMasterID',
                      'AuthorizedByUserMasterId',
                    ],
                    where: {
                      AuthorizationMasterID: authorizationMasterTypes.leave,
                      status: 1,
                    },
                  },
                ],
              },
            ],
          },
        ],
        options,
      );

    if (workFromHomeAuthorizationData.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Work From Home Authorization Request',
        ),
      });
    }

    if (authStatus == 0) {
      const allWFHIds = workFromHomeAuthorizationData.map((e) => {
        return e?.userWorkFromHome?.id;
      });

      const allAuthorizer = await userWorkFromHomeService.getAllWorkFromHome(
        [
          'id',
          'userMasterID',
          'fromDate',
          'toDate',
          'dayType',
          'authorizationStatus',
        ],
        {
          id: allWFHIds,
        },
        [
          {
            model: WorkFromHomeAuthorization,
            attributes: [
              'whAuthoriztaionid',
              'userMasterID',
              'authStatus',
              'userWorkFromHomeID',
            ],
          },
        ],
        options,
      );

      const allIdToDestroyInbox = allAuthorizer.flatMap((e) =>
        e.workFromHomeAuthorizations.map((id) => id.whAuthoriztaionid),
      );

      const getIdtoUpdateWFHAuth = allIdToDestroyInbox.filter((item) =>
        wfhIDList.includes(item),
      );

      await userWorkFromHomeService.update(
        {
          authorizationStatus: AuthorizationStatusType.REJECTED,
          authorizedBy: req.userDetails.userMasterId,
          authorizedAt: new Date(),
          authorizerRemark: remark,
        },
        { id: allWFHIds },
        options,
      );
      const data = {
        authStatus: authStatus,
        remark: remark,
      };
      await WorkFromHomeAuthorizationService.update(data, {
        whAuthoriztaionid: getIdtoUpdateWFHAuth,
      });
      await userInboxService.destroyUserInbox(
        {
          activityTable: WorkFromHomeAuthorization.getTableName(),
          activityTablePK: { [Op.in]: allIdToDestroyInbox },
        },
        options,
      );
      await transaction.commit();
      return res.status(200).json({
        status: 200,
        message: 'Work From Home Authorization request rejected successfully',
      });
    } else {
      const anyOneData = [];
      const anyTwoData = [];
      const anyThreeData = [];
      const sequenceWise = [];
      let allIDsToDeleteInbox = [];
      let allIDsToUpdateWFH = [];
      let allIDsToUpdateWFHAuth = [];
      let bulkNotification = [];
      let workFromTran = [];
      workFromHomeAuthorizationData.map((data) => {
        if (
          data?.userWorkFromHome?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYONE
        ) {
          anyOneData.push({
            whAuthoriztaionid: data.whAuthoriztaionid,
            userWorkFromHomeID: data.userWorkFromHomeID,
          });
        } else if (
          data?.userWorkFromHome?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTWO
        ) {
          anyTwoData.push({
            whAuthoriztaionid: data.whAuthoriztaionid,
            userWorkFromHomeID: data.userWorkFromHomeID,
          });
        } else if (
          data?.userWorkFromHome?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTHREE
        ) {
          anyThreeData.push({
            whAuthoriztaionid: data.whAuthoriztaionid,
            userWorkFromHomeID: data.userWorkFromHomeID,
          });
        } else if (
          data?.userWorkFromHome?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO
        ) {
          sequenceWise.push({
            whAuthoriztaionid: data.whAuthoriztaionid,
            userWorkFromHomeID: data.userWorkFromHomeID,
            authorizerIDs:
              data.userWorkFromHome.userMaster.authorizationDetails[0]
                .AuthorizedByUserMasterId, // it is an array of userID
            userNameForNotification:
              data.userWorkFromHome.userMaster.displayName,
            assignedBy: data.userWorkFromHome.userMaster.userMasterID,
            fromDate: data.userWorkFromHome.fromDate,
            toDate: data.userWorkFromHome.toDate,
          });
        }
      });

      if (anyOneData.length > 0) {
        const allWFHIds = anyOneData.map((e) => {
          return e.userWorkFromHomeID;
        });

        const allAuthorizer = await userWorkFromHomeService.getAllWorkFromHome(
          [
            'id',
            'userMasterID',
            'fromDate',
            'toDate',
            'dayType',
            'authorizationStatus',
          ],
          {
            id: allWFHIds,
          },
          [
            {
              model: WorkFromHomeAuthorization,
              attributes: [
                'whAuthoriztaionid',
                'userMasterID',
                'authStatus',
                'userWorkFromHomeID',
              ],
            },
          ],
          options,
        );

        const allIdToDestroyInbox = allAuthorizer.flatMap((e) =>
          e.workFromHomeAuthorizations.map((id) => id.whAuthoriztaionid),
        );

        const getIdtoUpdateWFHAuth = allIdToDestroyInbox.filter((item) =>
          wfhIDList.includes(item),
        );

        allAuthorizer.map((data) => {
          const dates = getDatesBetween(data.fromDate, data.toDate);

          const workFromHomeTransaction = dates.map((item) => {
            return {
              userWorkFromHomeID: data.id,
              days:
                data.dayType == WorkFromHomeTypes.FIRSTHALF ||
                data.dayType == WorkFromHomeTypes.SECONDHALF
                  ? 0.5
                  : 1,
              date: item,
              remark: '',
              status: 1,
            };
          });
          workFromTran = [...workFromTran, ...workFromHomeTransaction];
        });

        allIDsToUpdateWFHAuth = [
          ...allIDsToUpdateWFHAuth,
          ...getIdtoUpdateWFHAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...allIdToDestroyInbox];
        allIDsToUpdateWFH = [...allIDsToUpdateWFH, ...allWFHIds];
      }
      if (anyTwoData.length > 0) {
        const allWFHIds = anyTwoData.map((e) => e.userWorkFromHomeID);
        const getAUthorizationReqId = anyTwoData.map(
          (e) => e.whAuthoriztaionid,
        );

        const allAuthorizer = await userWorkFromHomeService.getAllWorkFromHome(
          [
            'id',
            'userMasterID',
            'fromDate',
            'toDate',
            'dayType',
            'authorizationStatus',
          ],
          {
            id: allWFHIds,
          },
          [
            {
              model: WorkFromHomeAuthorization,
              attributes: [
                'whAuthoriztaionid',
                'userMasterID',
                'authStatus',
                'userWorkFromHomeID',
              ],
            },
          ],
          options,
        );

        const otherAuthorizers = [];
        const shortLeaveApprovedIds = [];

        allAuthorizer.forEach((item) => {
          const authorizers = item.workFromHomeAuthorizations;

          const approved = authorizers.filter((a) => a.authStatus === 1);

          if (approved.length == 1) {
            const allIds = authorizers.map((a) => a.whAuthoriztaionid);
            const dates = getDatesBetween(item.fromDate, item.toDate);

            const workFromHomeTransaction = dates.map((data) => {
              return {
                userWorkFromHomeID: item.id,
                days:
                  item.dayType == WorkFromHomeTypes.FIRSTHALF ||
                  item.dayType == WorkFromHomeTypes.SECONDHALF
                    ? 0.5
                    : 1,
                date: data,
                remark: '',
                status: 1,
              };
            });
            workFromTran = [...workFromTran, ...workFromHomeTransaction];
            otherAuthorizers.push(...allIds);
            shortLeaveApprovedIds.push(item.id);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];
        const getIdtoUpdateShortLeaveAuth = getAUthorizationReqId.filter(
          (item) => wfhIDList.includes(item),
        );

        allIDsToUpdateWFHAuth = [
          ...allIDsToUpdateWFHAuth,
          ...getIdtoUpdateShortLeaveAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateWFH = [...allIDsToUpdateWFH, ...shortLeaveApprovedIds];
      }
      if (anyThreeData.length > 0) {
        const allWFHIds = anyThreeData.map((e) => e.userWorkFromHomeID);
        const getAUthorizationReqId = anyThreeData.map(
          (e) => e.whAuthoriztaionid,
        );

        const allAuthorizer = await userWorkFromHomeService.getAllWorkFromHome(
          [
            'id',
            'userMasterID',
            'fromDate',
            'toDate',
            'dayType',
            'authorizationStatus',
          ],
          {
            id: allWFHIds,
          },
          [
            {
              model: WorkFromHomeAuthorization,
              attributes: [
                'whAuthoriztaionid',
                'userMasterID',
                'authStatus',
                'userWorkFromHomeID',
              ],
            },
          ],
          options,
        );

        const otherAuthorizers = [];
        const shortLeaveApprovedIds = [];

        allAuthorizer.forEach((item) => {
          const authorizers = item.workFromHomeAuthorizations;

          const approved = authorizers.filter((a) => a.authStatus === 1);

          if (approved.length == 2) {
            const allIds = authorizers.map((a) => a.whAuthoriztaionid);

            const dates = getDatesBetween(item.fromDate, item.toDate);

            const workFromHomeTransaction = dates.map((data) => {
              return {
                userWorkFromHomeID: item.id,
                days:
                  item.dayType == WorkFromHomeTypes.FIRSTHALF ||
                  item.dayType == WorkFromHomeTypes.SECONDHALF
                    ? 0.5
                    : 1,
                date: data,
                remark: '',
                status: 1,
              };
            });
            workFromTran = [...workFromTran, ...workFromHomeTransaction];

            otherAuthorizers.push(...allIds);
            shortLeaveApprovedIds.push(item.id);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];
        const getIdtoUpdateShortLeaveAuth = getAUthorizationReqId.filter(
          (item) => wfhIDList.includes(item),
        );

        allIDsToUpdateWFHAuth = [
          ...allIDsToUpdateWFHAuth,
          ...getIdtoUpdateShortLeaveAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateWFH = [...allIDsToUpdateWFH, ...shortLeaveApprovedIds];
      }
      if (sequenceWise.length > 0) {
        const allWFHIds = sequenceWise.map((e) => e.userWorkFromHomeID);
        const getAUthorizationReqId = sequenceWise.map(
          (e) => e.whAuthoriztaionid,
        );

        const otherAuthorizers = [];
        const shortLeaveApprovedIds = [];
        const createShortLeaveAuth = [];
        const sendNotificationInbox = [];

        const getIdtoUpdateWFHAuth = getAUthorizationReqId.filter((item) =>
          wfhIDList.includes(item),
        );

        const data = {
          authStatus: authStatus,
          remark: remark,
        };
        await WorkFromHomeAuthorizationService.update(data, {
          whAuthoriztaionid: getIdtoUpdateWFHAuth,
        });

        const allAuthorizer = await userWorkFromHomeService.getAllWorkFromHome(
          [
            'id',
            'userMasterID',
            'fromDate',
            'toDate',
            'dayType',
            'authorizationStatus',
          ],
          {
            id: allWFHIds,
          },
          [
            {
              model: WorkFromHomeAuthorization,
              attributes: [
                'whAuthoriztaionid',
                'userMasterID',
                'authStatus',
                'userWorkFromHomeID',
              ],
            },
          ],
          options,
        );

        allAuthorizer.forEach((item) => {
          const authorizers = item.workFromHomeAuthorizations;

          const approved = authorizers.filter((a) => a.authStatus === 1);

          const seq = sequenceWise.find(
            (x) => x.userWorkFromHomeID === item.id,
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
            const allIds = authorizers.map((a) => a.id);

            const dates = getDatesBetween(item.fromDate, item.toDate);

            const workFromHomeTransaction = dates.map((data) => {
              return {
                userWorkFromHomeID: item.id,
                days:
                  item.dayType == WorkFromHomeTypes.FIRSTHALF ||
                  item.dayType == WorkFromHomeTypes.SECONDHALF
                    ? 0.5
                    : 1,
                date: data,
                remark: '',
                status: 1,
              };
            });
            workFromTran = [...workFromTran, ...workFromHomeTransaction];

            otherAuthorizers.push(...allIds);
            shortLeaveApprovedIds.push(item.id);
            return;
          }

          const nextUser = remainingUsers[0]; // FIRST PENDING USER

          createShortLeaveAuth.push({
            userWorkFromHomeID: item.id,
            userMasterID: +nextUser,
            authStatus: 2,
            status: 1,
          });
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateWFH = [...allIDsToUpdateWFH, ...shortLeaveApprovedIds];

        const createNewExtraDaysAuth =
          await WorkFromHomeAuthorization.bulkCreate(createShortLeaveAuth, {
            ...options,
          });

        sequenceWise.map((item) => {
          const data = createNewExtraDaysAuth.find(
            (e) => e.userWorkFromHomeID == item.userWorkFromHomeID,
          );

          if (data) {
            sendNotificationInbox.push({
              assignedTo: data.userMasterID,
              userWorkFromHomeID: item.userWorkFromHomeID,
              assignedBy: item.assignedBy,
              activityTable: WorkFromHomeAuthorization.getTableName(),
              activityTablePK: data.whAuthoriztaionid,
              message: `${item.userNameForNotification} has applied for Work from Home of date ${item.fromDate} to ${item.toDate ? item.toDate : item.fromDate}`,
            });
          }
        });

        if (sendNotificationInbox.length > 0) {
          bulkNotification = await userInboxService.bulkCreateUserInbox(
            sendNotificationInbox,
            options,
          );
        }
      }

      const data = {
        authStatus: authStatus,
        remark: remark,
      };
      await WorkFromHomeAuthorizationService.update(
        data,
        {
          whAuthoriztaionid: allIDsToUpdateWFHAuth,
        },
        true,
        options,
      );

      await userInboxService.destroyUserInbox(
        {
          activityTable: WorkFromHomeAuthorization.getTableName(),
          activityTablePK: { [Op.in]: allIDsToDeleteInbox },
        },
        options,
      );

      if (allIDsToUpdateWFH.length > 0) {
        await userWorkFromHomeService.update(
          {
            authorizationStatus: AuthorizationStatusType.APPROVED,
            authorizedBy: req.userDetails.userMasterId,
            authorizedAt: new Date(),
            authorizerRemark: remark,
          },
          { id: allIDsToUpdateWFH },
          options,
        );
      }

      if (workFromTran.length > 0) {
        await workFromHomeTransactionService.bulkCreateWorkFromHomeTransaction(
          workFromTran,
          options,
        );
      }

      await transaction.commit();
      let notificationData = {
        screen: 'workFromHome',
        isScheduled: 'true',
        scheduledTime: new Date().toISOString(),
      };

      bulkNotification.forEach((item) => {
        let notification = {
          title: `Hey ${item.displayName}! Someone requested for Work From Home`,
          body: item.message,
        };
        sendNotification(item.assignedTo, notification, notificationData);
      });
      return res.status(200).json({
        status: 200,
        message: 'Work From Home Authorization request approved successfully',
      });
    }
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.workFromHomeCancelationList = async (req, res, next) => {
  try {
    const allowedKeys = ['userMasterID', 'startDate', 'endDate'];

    const invalidKeys = invalidKeyParams(req.body, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid query parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const { userMasterID, startDate, endDate } = req.body;

    const condition = {};

    condition.userMasterID = {
      [Sequelize.Op.in]: userMasterID,
    };

    const transactionCondition = {
      status: 1,
    };
    if (startDate && endDate) {
      transactionCondition.date = { [Op.between]: [startDate, endDate] };
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const [rows, hrleaveData] = await Promise.all([
      WorkFromHomeTransaction.findAll({
        attributes: [
          'workFromHomeTransactionID',
          'userWorkFromHomeID',
          'days',
          'date',
          'remark',
          'status',
          'createdAt',
        ],
        where: transactionCondition,
        include: [
          {
            required: true,
            model: UserWorkFromHome,
            where: condition,
            include: [
              {
                required: true,
                model: UserMaster,
                where: { ...userAccessCondition.where },
                attributes: ['displayName', 'userNumber', 'userMasterID'],
                order: [['displayName', 'ASC']],
                include: [
                  ...userAccessCondition.includeModels,
                  {
                    model: EmployeeDesignation,
                    where: {
                      status: 1,
                      applicableDate: { [Sequelize.Op.lte]: new Date() },
                      [Sequelize.Op.or]: [
                        { endDate: { [Sequelize.Op.gte]: new Date() } },
                        { endDate: null },
                      ],
                    },
                    separate: true,
                    required: false,
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
                    where: {
                      status: 1,
                      applicableDate: { [Sequelize.Op.lte]: new Date() },
                      [Sequelize.Op.or]: [
                        { endDate: { [Sequelize.Op.gte]: new Date() } },
                        { endDate: null },
                      ],
                    },
                    separate: true,
                    required: false,
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
                    where: {
                      status: 1,
                      applicableDate: { [Sequelize.Op.lte]: new Date() },
                      [Sequelize.Op.or]: [
                        { endDate: { [Sequelize.Op.gte]: new Date() } },
                        { endDate: null },
                      ],
                    },
                    separate: true,
                    required: false,
                    attributes: ['branchID', 'applicableDate'],
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
                    model: EmployeeJoiningDetails,
                    attributes: ['employeeCode'],
                  },
                ],
              },
            ],
            attributes: [
              'userMasterID',
              'dayType',
              'fromDate',
              'toDate',
              'remark',
              'authorizationStatus',
            ],
          },
        ],
        order: [
          [
            { model: UserWorkFromHome, as: 'userWorkFromHome' },
            { model: UserMaster, as: 'userMaster' },
            'displayName',
            'ASC',
          ],
          ['date', 'DESC'],
        ],
      }),
      HrLeaveMonthlyTrans.findAll({
        where: {
          userMasterID: userMasterID,
          verified: 1,
        },
        attributes: ['monthstartdate', 'monthenddate', 'userMasterID'],
        group: ['monthstartdate', 'monthenddate', 'userMasterID'],
      }),
    ]);

    const finalData = [];

    rows.forEach((e) => {
      const userMasterID = e.userWorkFromHome.userMasterID;
      const verifiedData = hrleaveData.filter(
        (v) => v.userMasterID == userMasterID,
      );

      const isDateInRange = verifiedData.some((range) => {
        const startDate = new Date(range.monthstartdate);
        const endDate = new Date(range.monthenddate);
        const checkDate = new Date(e.date);

        return checkDate >= startDate && checkDate <= endDate;
      });

      if (!isDateInRange) finalData.push(e);
    });

    return res.status(200).json({
      status: 200,
      data: finalData,
      totalcount: finalData.length,
    });
  } catch (err) {
    next(err);
  }
};

exports.cancelWorkFromHomeTransaction = async (req, res, next) => {
  try {
    const allowedKeys = ['workFromHomeTransactionID', 'remark'];

    const invalidKeys = invalidKeyParams(req.body, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid query parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const { workFromHomeTransactionID, remark } = req.body;

    const condition = {
      workFromHomeTransactionID: workFromHomeTransactionID,
    };

    const data = { status: 10, remark: remark };

    await workFromHomeTransactionService.update(data, condition);

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Work From Home Cancel'),
    });
  } catch (err) {
    next(err);
  }
};

function invalidKeyParams(query, allowedKeys) {
  return Object.keys(query).filter((key) => !allowedKeys.includes(key));
}

function getDatesBetween(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);

  while (currentDate <= new Date(endDate)) {
    dates.push(currentDate.toISOString().slice(0, 10)); // format YYYY-MM-DD
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

exports.getAllWorkFromHomeAuthAdmin = async (req, res, next) => {
  try {
    const {
      authorizationstatus,
      companyMasterID,
      limit,
      page,
      userMasterID,
      startdate,
    } = req.body;

    let { enddate } = req.body;
    if (!companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Company'),
      });
    }

    const allowedKeys = [
      'companyMasterID',
      'userMasterID',
      'startdate',
      'enddate',
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

    const condition = {
      status: 1,
    };

    if (authorizationstatus) {
      if (authorizationstatus == AuthorizationStatusType.PEDING_ONE) {
        condition.authorizationStatus = [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ];
      } else {
        condition.authorizationStatus = authorizationstatus;
      }
    } else {
      condition.authorizationStatus = [
        AuthorizationStatusType.PENDING_ZERO,
        AuthorizationStatusType.PEDING_ONE,
        AuthorizationStatusType.PEDING_TWO,
      ];
    }

    if (startdate) {
      if (enddate == '' || enddate == undefined || enddate == null) {
        enddate = asiaKolkataDateTime(new Date()).slice(0, 10);
      }
      condition.AttendanceDate = {
        [Sequelize.Op.between]: [startdate, enddate],
      };
    }

    if (userMasterID.length > 0) {
      condition.userMasterID = userMasterID;
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const include = [
      {
        model: UserMaster,
        attributes: ['userMasterID', 'displayName', 'userNumber'],
        where: {
          companyMasterId: companyMasterID,
        },
        include: [
          {
            required: false,
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
          {
            model: EmployeeDesignation,
            required: false,
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
            model: EmployeeDepartment,
            required: false,
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
            model: EmployeeBranch,
            required: false,
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
    ];

    const order = [['createdAt', 'DESC']];

    const getAllWorkFromHome =
      await WorkFromHomeAuthorizationService.getAllWorkFromHomeAdmin(
        paginationQuery.offset,
        paginationQuery.limit,
        order,
        condition,
        include,
        true,
      );

    return res.status(200).json({
      status: 200,
      data: getAllWorkFromHome.rows,
      totalcount: getAllWorkFromHome.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptRejectWorkFromHomeAdmin = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id, authstatus, rejectionRemarks } = await req.body;

    if (!id) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Work From Home Request '),
      });
    }

    const allowedKeys = ['id', 'authstatus', 'rejectionRemarks'];

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

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction,
    };

    const workFromHomeAuthorizationIDList = Array.isArray(id) ? id : [id];

    const getWorkFromAuthorizationData =
      await userWorkFromHomeService.getAllWorkFromHome(
        ['id', 'fromDate', 'toDate', 'dayType', 'authorizationStatus'],
        {
          id: workFromHomeAuthorizationIDList,
          authorizationStatus: [
            AuthorizationStatusType.PENDING_ZERO,
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        {
          model: WorkFromHomeAuthorization,
          attributes: ['whAuthoriztaionid'],
        },
        options,
      );

    if (getWorkFromAuthorizationData.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: message.usermessage.notFoundMessage(
          'Work From Home Authorization Request',
        ),
      });
    }

    const allIdsToDestroyInbox = getWorkFromAuthorizationData.flatMap((item) =>
      item.workFromHomeAuthorizations.map((e) => e.whAuthoriztaionid),
    );

    await userInboxService.destroyUserInbox(
      {
        activityTable: WorkFromHomeAuthorization.getTableName(),
        activityTablePK: { [Op.in]: allIdsToDestroyInbox },
      },
      options,
    );

    const workFromHomeWhere = { id: workFromHomeAuthorizationIDList };

    await UserWorkFromHomeService.update(
      {
        authorizationStatus:
          authstatus == 0
            ? AuthorizationStatusType.REJECTED
            : AuthorizationStatusType.APPROVED,
        authorizerRemark: rejectionRemarks,
        authorizedBy: req.userDetails.userMasterId,
        authorizedAt: new Date(),
        isAuthorizedBy: true,
        authorizerRemark: rejectionRemarks,
      },
      workFromHomeWhere,
      options,
    );

    let allDataToCreateworkFromHomeTran = [];
    if (authstatus == 1) {
      getWorkFromAuthorizationData.map((data) => {
        const dates = getDatesBetween(data.fromDate, data.toDate);

        const workFromHomeTransaction = dates.map((item) => {
          return {
            userWorkFromHomeID: data.id,
            days:
              data.dayType == WorkFromHomeTypes.FIRSTHALF ||
              data.dayType == WorkFromHomeTypes.SECONDHALF
                ? 0.5
                : 1,
            date: item,
            remark: '',
            status: 1,
          };
        });

        allDataToCreateworkFromHomeTran = [
          ...allDataToCreateworkFromHomeTran,
          ...workFromHomeTransaction,
        ];
      });
    }

    await workFromHomeTransactionService.bulkCreateWorkFromHomeTransaction(
      allDataToCreateworkFromHomeTran,
      options,
    );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        authstatus == 1
          ? 'Work From Home Request Approved Successfully.'
          : 'Work From Home Request Rejected Successfully.',
    });
  } catch (error) {
    transaction.rollback();
    next(error);
  }
};
