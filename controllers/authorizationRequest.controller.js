const Sequelize = require('sequelize');
const logger = require('../config/logger');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const Department = require('../models/department');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');
const ExpenseAuthorizationRequest = require('../models/expenseAuthorization');
const UserExpenseTransaction = require('../models/userExpenseTransaction');
const AuthorizationMaster = require('../models/authorizationMaster');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const OvertimeAuthorizationRequest = require('../models/overtimeAuthorization');
const OvertimeCalculation = require('../models/overTimeCalculation');
const EmployeeBranch = require('../models/employeeBranch');
const EmployeeDepartment = require('../models/employeeDepartment');
const e = require('express');
const companyMaster = require('../models/companyMaster');

const attendanceTransaction = require('../models/attendanceTransaction');

const UserInbox = require('../models/UserInbox');

const {
  userDetails,
  employeeSalaryPolicy,
  daysInMonth,
  sendMailforExpense,
  employeeDepartment,
  employeeDesignation,
  asiaKolkataDateTime,
  employeeBranch,
  sendAcceptRejectMail,
  accessibleUsers,
  findAuthorizationDetails,
  sendNotification_NEW,
  findCompanyNotificationPolicy,
  sendMailforExpense_With_Transaction,
  adjustMonth,
  formatDate,
  employeeAttendancePolicy,
  getOvertimeCalculationRatio,
} = require('../utils/commonUtilFunctions');

const { generateExcel } = require('../utils/exportData');
const ExcelJS = require('exceljs');
const moment = require('moment');

const notification_options = {
  priority: 'high',
  timeToLive: 60 * 60 * 24,
};

const UserExpense = require('../models/userExpense');
const overTimeCalculationMain = require('../models/overTimeCalculationMain');
const {
  userAttributes,
  statusCodes,
  authStatusTypeObj,
} = require('../utils/commonVars');
const ExpenseHead = require('../models/expenseHead');
const ExpenseCategory = require('../models/expenseCategory');
const Customer = require('../models/customer');
const ToursMaster = require('../models/toursMaster');
const Visit = require('../models/visit');
const FormMaster = require('../models/formMaster');
const ExpensePriceRule = require('../models/expencePriceRule');
const ExpensePayment = require('../models/expensePayment');
const {
  expenseTypes,
  expenseApprovalTypes,
  authorizationMasterTypes,
  authorizationCriteriaType,
  mailTemplateTypes,
  AuthorizationStatusType,
  OvertimeRequestTypeEnum,
} = require('../utils/dbUtils');
const Project = require('../models/project');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDivision = require('../models/employeeDivision');
const mailTemplateEditor = require('../models/mailTemplateEditor');
const AttendanceLogs = require('../models/attendancelogs');
const notificationPolicy = require('../models/notificationPolicy');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const AttendancePolicy = require('../models/attendancePolicy');
const otCalcShiftSlab = require('../models/otCalcShiftSlab');
const otCalcShiftSlabRatio = require('../models/otCalcShiftSlabRatio');

exports.viewauthorizationrequestbyuseridforovertime = async (
  req,
  res,
  next,
) => {
  try {
    let {
      limit,
      page,
      userMasterID,
      startdate,
      enddate,
      status,
      companyMasterID,
      isExport = false,
    } = req.body;
    const paginationQuery = {};
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (!isExport && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    let overtimeCondition = {
      userMasterID: req.userDetails.userMasterId,
      status: 1,
    };

    if (status !== null && status !== undefined) {
      if (status == 2) {
        overtimeCondition['$overTimeCalculation.AuthorizationRequired$'] = {
          [Sequelize.Op.notIn]: [3, 4],
        };
      }
      overtimeCondition.authstatus = status;
    } else {
      overtimeCondition.authstatus = 2;
      overtimeCondition['$overTimeCalculation.AuthorizationRequired$'] = {
        [Sequelize.Op.notIn]: [3, 4],
      };
    }

    if (startdate && enddate) {
      overtimeCondition['$overTimeCalculation.OverTimeDate$'] = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
    }

    if (userMasterID && Array.isArray(userMasterID) && userMasterID.length) {
      overtimeCondition['$overTimeCalculation.UserMasterID$'] = {
        [Sequelize.Op.in]: userMasterID,
      };
    }
    const userCondition = { status: 1 };
    if (companyMasterID) {
      userCondition.companyMasterId = companyMasterID;
    }
    const includeOptions = [
      {
        required: true,
        model: OvertimeCalculation,
        as: 'overTimeCalculation',
        include: [
          {
            required: false,
            model: attendanceTransaction,
            include: [
              {
                separate: true,
                model: AttendanceLogs,
                order: [['logDateTime', 'ASC']],
              },
            ],
          },
          {
            model: UserMaster,
            where: userCondition,
            attributes: userAttributes,
            include: [
              {
                separate: true,
                model: EmployeeJoiningDetails,
                attributes: ['employeeCode'],
              },
              {
                required: false,
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
                required: false,
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
                model: companyMaster,
                attributes: ['companyName'],
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
            model: OvertimeAuthorizationRequest,
            as: 'OAR',
            attributes: ['authstatus'],
            include: [
              {
                model: UserMaster,
                as: 'authorizedPerson',
                attributes: ['displayName'],
              },
            ],
          },
        ],
      },
    ];

    const { rows: auth_request, count } =
      await OvertimeAuthorizationRequest.findAndCountAll({
        distinct: true,
        where: overtimeCondition,
        order: [['createdAt', startdate && enddate ? 'ASC' : 'DESC']],
        ...paginationQuery,
        include: includeOptions,
      });
    const uniqueUserIds = [
      ...new Set(
        auth_request
          .filter((id) => id?.overTimeCalculation?.UserMasterID)
          .map((item) => +item?.overTimeCalculation?.UserMasterID),
      ),
    ];
    const auth_Criterea = await AuthorizationDetails.findAll({
      raw: true,
      where: {
        userMasterID: {
          [Sequelize.Op.in]: uniqueUserIds,
        },
        status: 1,
        AuthorizationMasterID: authorizationMasterTypes.expense,
      },
      include: [
        {
          model: AuthorizationCriteriaMaster,
          attributes: ['AuthorizationCriteria'],
        },
      ],
    });

    for (let request of auth_request) {
      const authorizationdetails = auth_Criterea.find(
        (c) => c.userMasterID == +request?.overTimeCalculation?.UserMasterID,
      );
      if (authorizationdetails) {
        const AuthorizationCriterias =
          authorizationdetails[
            'AuthorizationCriteriaMaster.AuthorizationCriteria'
          ];
        request.dataValues.Auth_Criteria = AuthorizationCriterias;
      }
      const userData = request.overTimeCalculation?.userMaster || null;
      if (userData) {
        request.dataValues.userMaster = userData.dataValues;
        request.dataValues.user = userData.dataValues.displayName;
        request.dataValues.userNumber = userData.dataValues.userNumber;
        request.dataValues.userID = userData.dataValues.userMasterID;
      }
    }
    if (isExport) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('OvertimeAuthorizationRequests');

      const columns = [
        { header: 'Company Name', key: 'companyName', width: 18 },
        { header: 'Employee Code', key: 'employeeCode', width: 18 },
        { header: 'Employee Name', key: 'employeeName', width: 25 },
        { header: 'Branch', key: 'branchName', width: 20 },
        { header: 'Department', key: 'departmentName', width: 22 },
        { header: 'Designation', key: 'designationName', width: 22 },
        { header: 'Division', key: 'divisionName', width: 20 },
        { header: 'Working Area', key: 'workingAreaName', width: 20 },
        { header: 'Overtime Date', key: 'overtimeDate', width: 15 },
        { header: 'Overtime Request Type', key: 'otRequestType', width: 15 },
        { header: 'PunchIn Time', key: 'punchInTime' },
        { header: 'PunchOut Time', key: 'punchOutTime' },
        { header: 'Overtime In', key: 'overtimeIn' },
        { header: 'Overtime Out', key: 'overtimeOut' },
        { header: 'Overtime Minutes', key: 'overtimeMin' },
        { header: 'Approved Overtime In', key: 'approvedOvertimeIn' },
        { header: 'Approved Overtime Out', key: 'approvedOvertimeOut' },
        { header: 'Approved Overtime Min', key: 'approvedOvertimeMin' },
        { header: 'Attendance Logs', key: 'attendanceLogs' },
        { header: 'Auth Status', key: 'authStatus', width: 15 },
        { header: 'Auth Criteria', key: 'authCriteria', width: 25 },
        { header: 'Authorizer', key: 'authorizer', width: 25 }, // multi-row
        { header: 'Authorizer Status', key: 'authorizerStatus', width: 18 }, // per authorizer
        { header: 'Created At', key: 'createdAt', width: 18 },
      ];

      worksheet.columns = columns;

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

      let currentRowIndex = 2;

      for (const request of auth_request) {
        const calc = request.overTimeCalculation || {};
        const userData = calc.userMaster || {};

        const empCode =
          (userData.employeeJoiningDetails || [])[0]?.employeeCode || '';

        // Designation
        const designationName =
          (userData.employeeDesignations || [])[0]?.designation
            ?.designationName || '';

        // Department
        const departmentName =
          (userData.employeeDepartments || [])[0]?.department?.departmentName ||
          '';

        // Branch
        const branchName =
          (userData.employeeBranches || [])[0]?.branchMaster?.branchName || '';

        // Division
        const divisionName =
          (userData.employeeDivisions || [])[0]?.division?.divisionName || '';

        // Working Area
        const workingAreaName =
          (userData.employeeWorkingAreas || [])[0]?.workingArea
            ?.workingAreaName || '';

        const companyName = userData.companyMaster?.companyName;

        const overtimeDate = calc.OverTimeDate
          ? moment(calc.OverTimeDate).format('DD-MM-YYYY')
          : '';

        const otRequestType =
          calc.otRequestType == OvertimeRequestTypeEnum.PRE_SHIFT
            ? 'Pre-Shift Overtime'
            : '';

        const overtimeIn = calc.OverTimeInDateTime
          ? moment(calc.OverTimeInDateTime).format('DD-MM-YYYY hh:mm')
          : '';

        const overtimeOut = calc.OverTimeOutDateTime
          ? moment(calc.OverTimeOutDateTime).format('DD-MM-YYYY hh:mm')
          : '';

        const overtimeMin = calc.OverTimeHourAndMin;

        const punchInTime = calc?.attendanceTransaction?.InDatetime
          ? moment(calc?.attendanceTransaction?.InDatetime).format(
              'DD-MM-YYYY hh:mm',
            )
          : '';

        const punchOutTime = calc?.attendanceTransaction?.OutDateTime
          ? moment(calc?.attendanceTransaction?.OutDateTime).format(
              'DD-MM-YYYY hh:mm',
            )
          : '';

        const attendanceLogs = calc?.attendanceTransaction?.attendancelogs
          ?.map((log) => {
            const label =
              log.direction === 'in'
                ? 'IN'
                : log.direction === 'out'
                  ? 'OUT'
                  : 'Time';

            return `${label}:- ${moment(log.logDateTime).format(
              'DD-MM-YYYY hh:mm A',
            )}`;
          })
          .join('\n');

        const authStatusLabel =
          request.authstatus == 0
            ? 'Rejected'
            : request.authstatus == 1
              ? 'Approved'
              : request.authstatus == 2
                ? 'Pending'
                : '';

        const authCriteria = request.dataValues.Auth_Criteria || '';

        const approvedOvertimeOut = calc?.UpdateTimeOutDateTime
          ? moment(calc?.UpdateTimeOutDateTime).format('DD-MM-YYYY hh:mm')
          : '';

        const approvedOvertimeIn = calc?.UpdateTimeInDateTime
          ? moment(calc?.UpdateTimeInDateTime).format('DD-MM-YYYY hh:mm')
          : '';

        const approvedOvertimeMin = calc?.UpdateOverTimeHourAndMin;

        const authCritereaEntry = auth_Criterea.find(
          (c) => c.userMasterID == +calc.UserMasterID,
        );

        const authorizers = (request?.overTimeCalculation?.OAR || []).map(
          (auth) => ({
            name: auth.authorizedPerson?.displayName || '',
            status:
              auth.authstatus == 0
                ? 'Rejected'
                : auth.authstatus == 2
                  ? 'Pending'
                  : 'Approved',
          }),
        );

        const rowCount = Math.max(authorizers.length, 1);

        const commonFields = {
          companyName,
          approvedOvertimeOut,
          approvedOvertimeIn,
          approvedOvertimeMin,
          employeeCode: empCode,
          employeeName: userData.displayName || request.dataValues.user || '',
          branchName,
          departmentName,
          designationName,
          divisionName,
          workingAreaName,
          overtimeDate,
          otRequestType,
          authStatus: authStatusLabel,
          attendanceLogs,
          authCriteria,
          overtimeIn,
          overtimeOut,
          overtimeMin,
          punchInTime,
          punchOutTime,
          createdAt: request.createdAt
            ? moment(request.createdAt).format('DD-MM-YYYY hh:mm')
            : '',
        };

        for (let i = 0; i < rowCount; i++) {
          const auth = authorizers[i] || { name: '', status: '' };
          const rowData = {
            ...commonFields,
            authorizer: auth.name,
            authorizerStatus: auth.status,
          };
          const excelRow = worksheet.addRow(rowData);
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

        if (rowCount > 1) {
          const mergeStart = currentRowIndex;
          const mergeEnd = currentRowIndex + rowCount - 1;

          // All columns EXCEPT col 17 (authorizer) and col 18 (authorizerStatus)
          const columnsToMerge = [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
            20, 23,
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

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="OvertimeAuthorizationRequests.xlsx"',
      );

      await workbook.xlsx.write(res);
      return res.end();
    }
    return res
      .status(200)
      .json({ status: 200, data: auth_request, totalcount: count });
  } catch (err) {
    next(err);
  }
};
exports.getAuthorizationRequestByReferanceIdOvertime = async (
  req,
  res,
  next,
) => {
  try {
    let get_one_data = await OvertimeAuthorizationRequest.findAll({
      where: {
        ReferenceID: req.params.id,
      },
      order: [['AuthorizationRequestId', 'ASC']],
    });
    for (let i = 0; i < get_one_data.length; i++) {
      let user1 = await UserMaster.findOne({
        where: {
          userMasterID: get_one_data[i].userMasterID,
        },
      });
      get_one_data[i].dataValues.username = user1.displayName;
    }

    if (!get_one_data)
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};
const updateAuthorizationRequired = async (OverTimeID, status, transaction) => {
  let ratio = null;
  if (status == 3) {
    const findLatestOverTimeCalculation = await OvertimeCalculation.findOne({
      where: { OverTimeID },
      include: [
        {
          model: attendanceTransaction,
          attributes: ['Shift'],
        },
        {
          model: AttendancePolicy,
          include: [
            {
              model: otCalcShiftSlab,
              as: 'otCalcSS',
              include: [
                {
                  model: otCalcShiftSlabRatio,
                  as: 'otCalcSSR',
                },
              ],
            },
          ],
        },
      ],
      transaction,
    });
    const findDateWiseAttendancePolicy =
      findLatestOverTimeCalculation.attendancePolicy || null;
    const findDateWiseAttendance =
      findLatestOverTimeCalculation.attendanceTransaction || null;
    const findUserWeekoffData = await weekoffHolidayTran.findAll({
      where: {
        userMasterID: findLatestOverTimeCalculation.UserMasterID,
        date: findLatestOverTimeCalculation.OverTimeDate,
      },
      order: [['createdAt', 'DESC']],
    });
    let isWeekoff = false;
    let isHoliday = false;

    const weekOffHolidayPriority =
      findDateWiseAttendancePolicy?.WHPHPriority || 'WO';
    if (findUserWeekoffData.length > 1) {
      if (weekOffHolidayPriority == 'WO') {
        const findUserWeekoff = findUserWeekoffData.find(
          (e) => e.tableName == 'weekoff',
        );
        if (findUserWeekoff) {
          isWeekoff = true;
        }
      } else if (weekOffHolidayPriority == 'PH') {
        const findUserHoliday = findUserWeekoffData.find(
          (e) => e.tableName == 'holiday',
        );
        if (findUserHoliday) {
          isHoliday = true;
        }
      }
    } else if (findUserWeekoffData.length == 1) {
      const findUserWeekoff = findUserWeekoffData[0];
      if (findUserWeekoff) {
        if (findUserWeekoff.tableName == 'weekoff') {
          isWeekoff = true;
        } else if (findUserWeekoff.tableName == 'holiday') {
          isHoliday = true;
        }
      }
    }

    ratio = getOvertimeCalculationRatio(
      findDateWiseAttendancePolicy,
      isWeekoff,
      isHoliday,
      findDateWiseAttendance?.Shift,
      findLatestOverTimeCalculation.UpdateOverTimeHourAndMin || 0,
    );
  }
  await OvertimeCalculation.update(
    { AuthorizationRequired: status, ratio: ratio },
    {
      where: { OverTimeID },
      transaction,
    },
  );
};
exports.authorizationacceptrejectovertime = async (req, res, next) => {
  try {
    const {
      authorizationData,
      AuthorizationRequestId,
      ReferenceID,
      authstatus,
      remarks,
      UpdateTimeIn,
      UpdateTimeOut,
      UpdateTimeOutDateTime,
      UpdateTimeInDateTime,
      UpdateOverTimeHourAndMin,
      companyMasterID,
      createBy,
    } = req.body;
    let ApproveOvetimeUser = [];
    let authorizationDataForOT = [];
    let RejectOvetimeUser = [];
    let SkipOvetimeUser = [];

    if (!authorizationData) {
      authorizationDataForOT.push({
        AuthorizationRequestId: AuthorizationRequestId,
        ReferenceID: ReferenceID,
      });
    } else {
      authorizationDataForOT = authorizationData;
    }

    const AllReferenceIds = authorizationDataForOT.map((e) => e.ReferenceID);

    const otAuthRequest = await OvertimeAuthorizationRequest.findAll({
      where: { ReferenceID: AllReferenceIds },
      include: [{ model: OvertimeCalculation, as: 'overTimeCalculation' }],
    });

    // get All UserIds
    const AllUserIds = otAuthRequest.map(
      (e) => e.overTimeCalculation.UserMasterID,
    );

    const AllFormAuthorizations = await AuthorizationDetails.findAll({
      where: {
        AuthorizationMasterID: authorizationMasterTypes.overtime,
        userMasterID: {
          [Sequelize.Op.in]: AllUserIds,
        },
        status: 1,
      },
    });
    const otAuthMap = new Map();
    const referenceRequestMap = new Map();

    otAuthRequest.forEach((item) => {
      otAuthMap.set(item.AuthorizationRequestId, item);
      if (!referenceRequestMap.has(item.ReferenceID)) {
        referenceRequestMap.set(item.ReferenceID, []);
      }

      referenceRequestMap.get(item.ReferenceID).push(item);
    });

    const formAuthorizationMap = new Map();
    AllFormAuthorizations.forEach((item) => {
      formAuthorizationMap.set(item.userMasterID, item);
    });
    await sequelize.transaction(async (t) => {
      for (const data of authorizationDataForOT) {
        const { AuthorizationRequestId, ReferenceID } = data;
        const userid = otAuthMap.get(AuthorizationRequestId);
        const {
          UserMasterID,
          OverTimeID,
          OverTimeDate,
          OverTimeIn,
          OverTimeOut,
          OverTimeInDateTime,
          OverTimeOutDateTime,
          OverTimeHourAndMin,
          ratio,
        } = userid.overTimeCalculation;

        const userOverTime = {
          UpdateTimeIn: OverTimeID,
          UpdateTimeOut: OverTimeOut,
          UpdateTimeInDateTime: OverTimeInDateTime,
          UpdateTimeOutDateTime: OverTimeOutDateTime,
          UpdateOverTimeHourAndMin: OverTimeHourAndMin,
          ratio: ratio,
        };

        const finalUpdateTimeIn = UpdateTimeIn || userOverTime.UpdateTimeIn;
        const finalUpdateTimeOut = UpdateTimeOut || userOverTime.UpdateTimeOut;
        const finalUpdateTimeInDateTime =
          UpdateTimeInDateTime || userOverTime.UpdateTimeInDateTime;
        const finalUpdateTimeOutDateTime =
          UpdateTimeOutDateTime || userOverTime.UpdateTimeOutDateTime;
        const finalUpdateOverTimeHourAndMin =
          UpdateOverTimeHourAndMin || userOverTime.UpdateOverTimeHourAndMin;
        const finalRemarks = remarks || null;

        if (authstatus == 1) {
          const date = OverTimeDate;
          const user_salaryPolicy = await employeeSalaryPolicy(
            UserMasterID,
            date,
          );

          let start_Date;
          let end_Date;

          const month = Number(date.slice(5, 7));
          const year = Number(date.slice(0, 4));
          let monday = daysInMonth(month, year);

          let considerMonth = 'start';

          if (user_salaryPolicy) {
            const date2 = user_salaryPolicy['salaryPolicy.salaryCycleDate'];
            const salary_startdate = date2 < 10 ? '0' + date2 : date2;

            start_Date = date.slice(0, 8) + salary_startdate;

            // To Check salary consider Month

            if (user_salaryPolicy['salaryPolicy.salaryCycleConsider'] == 'E') {
              considerMonth = 'end';
              const tempDate = new Date(start_Date);
              tempDate.setMonth(tempDate.getMonth() - 1);

              start_Date =
                tempDate.getFullYear() +
                '-' +
                String(tempDate.getMonth() + 1).padStart(2, '0') +
                '-' +
                String(tempDate.getDate()).padStart(2, '0');

              // set Month days
              monday = daysInMonth(
                start_Date.slice(5, 7),
                start_Date.slice(0, 4),
              );
            }

            let date1 = new Date(start_Date);
            date1.setDate(date1.getDate() + (monday - 1));

            end_Date =
              date1.getFullYear() +
              '-' +
              String(date1.getMonth() + 1).padStart(2, '0') +
              '-' +
              String(date1.getDate()).padStart(2, '0');
          } else {
            start_Date = date.slice(0, 8) + '01';
            end_Date = date.slice(0, 8) + monday;
          }

          if (new Date(start_Date) > new Date(date)) {
            const previousMonthStart = adjustMonth(new Date(start_Date), -1);
            start_Date = formatDate(previousMonthStart);

            const previousMonthEnd = adjustMonth(new Date(end_Date), -1);
            end_Date = formatDate(previousMonthEnd);
          } else if (new Date(end_Date) < new Date(date)) {
            const nextMonthStart = adjustMonth(new Date(start_Date), 1);
            start_Date = formatDate(nextMonthStart);

            const nextMonthEnd = adjustMonth(new Date(start_Date), 1);
            end_Date = formatDate(nextMonthEnd);
          }

          const yearmonth =
            considerMonth == 'start'
              ? start_Date.slice(0, 4) + '' + start_Date.slice(5, 7)
              : end_Date.slice(0, 4) + '' + end_Date.slice(5, 7);

          const overtimecal = await overTimeCalculationMain.findOne({
            where: {
              userMasterID: UserMasterID,
              yyyymm: yearmonth,
            },
          });

          if (overtimecal) {
            SkipOvetimeUser.push({
              UserMasterID: UserMasterID,
              OverTimeID: OverTimeID,
            });
            continue;
          } else {
            ApproveOvetimeUser.push({
              UserMasterID: UserMasterID,
              OverTimeID: OverTimeID,
            });
          }
        } else {
          RejectOvetimeUser.push({
            UserMasterID: UserMasterID,
            OverTimeID: OverTimeID,
          });
        }

        // await sequelize.transaction(async (t) => {
        await OvertimeAuthorizationRequest.update(
          {
            viewstatus: 0,
            authstatus: authstatus,
            remarks: finalRemarks,
            updateBy: createBy,
          },
          {
            where: { AuthorizationRequestId: AuthorizationRequestId },
            transaction: t,
          },
        );

        if (authstatus !== 0) {
          await OvertimeCalculation.update(
            {
              UpdateTimeIn: finalUpdateTimeIn,
              UpdateTimeOut: finalUpdateTimeOut,
              UpdateTimeInDateTime: finalUpdateTimeInDateTime,
              UpdateTimeOutDateTime: finalUpdateTimeOutDateTime,
              UpdateOverTimeHourAndMin: finalUpdateOverTimeHourAndMin,
              updateBy: createBy,
            },
            {
              where: { OverTimeID: ReferenceID },
              transaction: t,
            },
          );
        }

        const auth_request = referenceRequestMap.get(ReferenceID) || [];
        const FormAuthorizations = formAuthorizationMap.get(UserMasterID);
        if (!FormAuthorizations) {
          continue;
        }
        if (authstatus == 0) {
          await updateAuthorizationRequired(ReferenceID, 4, t);
          continue;
        }
        if (
          FormAuthorizations.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          const auth_requestsequence = otAuthRequest.filter(
            (e) => e.ReferenceID == ReferenceID && e.authstatus != 0,
          );

          let arr = [];
          for (let k = 0; k < auth_requestsequence.length; k++) {
            arr.push(parseInt(auth_requestsequence[k].userMasterID));
          }

          let FormAuthorizationsUser =
            FormAuthorizations.AuthorizedByUserMasterId;
          let remainingid = FormAuthorizationsUser.filter(
            (d) => !arr.includes(d),
          );

          if (remainingid.length > 0) {
            await OvertimeAuthorizationRequest.create(
              {
                ReferenceID: ReferenceID,
                userMasterID: remainingid[0],
                status: 1,
                authstatus: 2,
                createBy: auth_request[0].createBy,
              },
              {
                transaction: t,
              },
            );
          } else {
            await updateAuthorizationRequired(ReferenceID, 3, t);
          }
        } else if (
          FormAuthorizations.AuthorizationCriteriaID ==
          authorizationCriteriaType.ANYONE
        ) {
          const auth_requestanyoneaccept = otAuthRequest.filter(
            (e) => e.ReferenceID == ReferenceID && e.authstatus == 1,
          );

          const accept = auth_requestanyoneaccept.length;

          if (accept + 1 >= 1) {
            await updateAuthorizationRequired(ReferenceID, 3, t);
          }
        } else if (
          FormAuthorizations.AuthorizationCriteriaID ==
          authorizationCriteriaType.ANYTWO
        ) {
          const auth_requestanyoneaccept = otAuthRequest.filter(
            (e) => e.ReferenceID == ReferenceID && e.authstatus == 1,
          );

          const accept = auth_requestanyoneaccept.length;

          if (accept + 1 >= 2) {
            await updateAuthorizationRequired(ReferenceID, 3, t);
          }
        } else {
          const auth_requestanyoneaccept = otAuthRequest.filter(
            (e) => e.ReferenceID == ReferenceID && e.authstatus == 1,
          );
          const accept = auth_requestanyoneaccept.length;
          if (accept + 1 >= 3) {
            await updateAuthorizationRequired(ReferenceID, 3, t);
          }
        }
      }
    });

    ApproveOvetimeUser = ApproveOvetimeUser.filter((approveUser) => {
      return !SkipOvetimeUser.some(
        (skipUser) =>
          skipUser.UserMasterID === approveUser.UserMasterID &&
          skipUser.OverTimeID === approveUser.OverTimeID,
      );
    });

    if (authstatus == 1) {
      let message = '';

      message =
        'Overtime has been approved (' +
        ApproveOvetimeUser.length +
        ') users successfully. <br>';

      if (SkipOvetimeUser.length > 0) {
        let Notassigned = await UserMaster.findAll({
          raw: true,
          where: {
            userMasterID: SkipOvetimeUser[0].UserMasterID,
            status: 1,
          },
          attributes: ['displayName'],
        });

        let notacceptname = '';

        if (Notassigned.length > 0) {
          for (let i = 0; i < Notassigned.length; i++) {
            notacceptname = notacceptname + Notassigned[i].displayName + ',';
          }
          message =
            message +
            '<div style="text-align:justify;font-weight : 800;margin-top : 5px">Overtime request for ' +
            notacceptname +
            ' cannot be approved because overtime has already been calculated for this month.</div><div style="text-align:justify;font-weight : 800;margin-top : 5px"> Please delete the existing overtime calculation for the selected date before approving the request. </div>';
        }
      }

      return res.status(200).json({
        status: 200,
        message: message,
        data: {},
      });
    } else {
      return res.status(200).json({
        status: 200,
        message: message.usermessage.authreject,
        data: {},
      });
    }
  } catch (err) {
    next(err);
  }
};

function addQuotes(value) {
  var quotedVar = "'" + value + "'";
  return quotedVar;
}

exports.overtimeAuthoriedUser = async (req, res, next) => {
  try {
    let { companyMasterID, branchMasterID, authPersonid } = await req.body;
    let userdata, Auth_person;
    const condition = {
      AuthorizedByUserMasterId: { [Sequelize.Op.contains]: [authPersonid] },
      AuthorizationMasterID: authorizationMasterTypes.overtime,
      status: 1,
    };
    if (!branchMasterID) {
      req.userDetails.accessibleCompanies = companyMasterID;
      condition.companyMasterID = companyMasterID;
    }
    if (branchMasterID) {
      req.userDetails.accessibleBranches = branchMasterID;

      Auth_person = await AuthorizationDetails.findAll({
        where: condition,
        include: {
          model: UserMaster,
          required: true,
          ...accessibleUsers(req.userDetails, true, false),
          include: {
            model: EmployeeBranch,
            where: {
              status: 1,
              branchID: branchMasterID,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: true,
            attributes: ['branchID'],
          },
        },
      });
    } else {
      Auth_person = await AuthorizationDetails.findAll({
        where: condition,
        include: {
          model: UserMaster,
          required: true,
          ...accessibleUsers(req.userDetails),
        },
      });
    }

    let userid = [];

    for (let i = 0; i < Auth_person.length; i++) {
      userid.push(Auth_person[i].userMasterID);
    }

    userdata = await UserMaster.findAll({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: userid,
        },
        status: 1,
      },
      attributes: [
        ['userMasterID', 'userMasterID'],
        ['displayName', 'userName'],
        ['userNumber', 'Number'],
      ],
      order: [['displayName']],
    });

    return res.status(200).json({
      status: 200,
      message: 'Data get successfully.',
      data: userdata,
    });
  } catch (error) {
    next(err.message);
  }
};
function getExpenseType(rowData) {
  return rowData.userExpense?.ToursMaster
    ? expenseTypes.TOUR
    : rowData.userExpense?.visit
      ? expenseTypes.VISIT
      : rowData.userExpense?.project
        ? expenseTypes.PROJECT
        : rowData.userExpense?.serviceNumber
          ? expenseTypes.SERVICE
          : expenseTypes.PERSONAL;
}
exports.authorizationacceptrejectexpenseall = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { newArray, authstatus } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const currentUserID = req.userDetails.userMasterId;
    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const mapAllExpenseTransIDs = newArray.map(
      (e) => +e.userexpensetransactionid,
    );
    const [findAllExpenseTransations] = await Promise.all([
      UserExpenseTransaction.findAll({
        where: {
          userExpenseTransactionID: mapAllExpenseTransIDs,
          authorizationStatus: [
            AuthorizationStatusType.PENDING_ZERO,
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        include: [
          {
            model: UserExpense,
            as: 'userExpense',
          },
          {
            model: ExpenseAuthorizationRequest,
            as: 'Auth',
          },
        ],
      }),
    ]);
    const findAllTransactionUserIDs = [
      ...new Set(
        findAllExpenseTransations.map((e) => +e.userExpense?.userMasterID),
      ),
    ];

    const findUserCompany = await UserMaster.findAll({
      where: {
        userMasterID: findAllTransactionUserIDs,
      },
      attributes: ['companyMasterId'],
    });

    const findAllUserCompanyIDs = [
      ...new Set(findUserCompany.map((e) => e.companyMasterId)),
    ];

    const [
      findCompanyExpenseMailTemplate,
      findAllCompanyNotificationPolicyData,
      allUserAuthDatails,
      expenseHeadIds,
    ] = await Promise.all([
      mailTemplateEditor.findAll({
        where: {
          status: 1,
          mailTypeID: [
            mailTemplateTypes.expenseMailTemplate,
            mailTemplateTypes.expenseAcceptMailTemplate,
            mailTemplateTypes.expenseRejectMailTemplate,
          ],
          companyMasterID: findAllUserCompanyIDs,
        },
      }),
      notificationPolicy.findAll({
        where: {
          companyMasterID: findAllUserCompanyIDs,
          status: 1,
        },
      }),
      AuthorizationDetails.findAll({
        where: {
          AuthorizationMasterID: authorizationMasterTypes.expense,
          userMasterID: findAllTransactionUserIDs,
          status: 1,
        },
      }),
      new Set(findAllExpenseTransations.map((item) => +item.expenseHeadId)),
    ]);

    const findAllAuthUsersData = [
      ...new Set(
        allUserAuthDatails
          .flatMap((e) => e.AuthorizedByUserMasterId)
          .filter((id) => id),
      ),
    ];

    const [getAllUserDetails, findExpenseHeadData] = await Promise.all([
      UserMaster.findAll({
        distinct: true,
        where: {
          userMasterID: [
            ...findAllAuthUsersData,
            currentUserID,
            ...findAllTransactionUserIDs,
          ],
        },
        attributes: userAttributes,
        include: [
          {
            required: false,
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
          {
            required: false,
            model: EmployeeBranch,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(currentdate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentdate) } },
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
            model: EmployeeDesignation,
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(currentdate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(currentdate) },
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
            model: EmployeeDepartment,
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(currentdate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(currentdate) },
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
        ],
      }),
      ExpenseHead.findAll({
        where: {
          expenseHeadId: {
            [Sequelize.Op.in]: [...expenseHeadIds],
          },
        },
        include: [
          {
            model: ExpenseCategory,
          },
        ],
      }),
    ]);
    const promiseArray = [];
    const createInboxPromise = [];
    for (let i = 0; i < newArray.length; i++) {
      const finUserExpenseTranction = findAllExpenseTransations.find(
        (e) =>
          +e.userExpenseTransactionID == +newArray[i].userexpensetransactionid,
      );
      const userMasterID = finUserExpenseTranction?.userExpense?.userMasterID;

      const authorizationdetails = allUserAuthDatails.find(
        (e) => +e.userMasterID == +userMasterID,
      );
      if (authorizationdetails && finUserExpenseTranction) {
        const allAuthData = finUserExpenseTranction.Auth || [];
        const userData = getAllUserDetails.find(
          (e) => e.userMasterID == +userMasterID,
        );

        const findCompanyNotificationPolicyData =
          findAllCompanyNotificationPolicyData.find(
            (e) => +e.companyMasterID == +userData?.companyMasterId,
          );
        const {
          findCurrentAuthReq,
          allAuthIds,
          approvedRequests,
          authRequests,
          formAuthUsers,
          expenseAcceptMailTemplate,
          expenseRejectMailTemplate,
          expenseMailTemplate,
          findHeadData,
          ExpenseType,
          expense_date,
          currentAuthUserData,
        } = (() => {
          return {
            findCurrentAuthReq: allAuthData.find(
              (e) =>
                e.AuthorizationRequestId == +newArray[i].authorizationrequestid,
            ),
            allAuthIds: allAuthData.map((e) => +e.AuthorizationRequestId),
            approvedRequests: allAuthData.filter((e) => +e.authstatus == 1),
            authRequests: allAuthData.filter((e) => e.authstatus != 0),
            formAuthUsers: authorizationdetails.AuthorizedByUserMasterId.map(
              (id) => id.toString(),
            ),
            expenseAcceptMailTemplate: findCompanyExpenseMailTemplate.find(
              (e) =>
                +e.mailTypeID == mailTemplateTypes.expenseAcceptMailTemplate &&
                e.companyMasterID == userData?.companyMasterId,
            ),
            expenseRejectMailTemplate: findCompanyExpenseMailTemplate.find(
              (e) =>
                +e.mailTypeID == +mailTemplateTypes.expenseRejectMailTemplate &&
                e.companyMasterID == userData?.companyMasterId,
            ),
            expenseMailTemplate: findCompanyExpenseMailTemplate.find(
              (e) =>
                +e.mailTypeID == +mailTemplateTypes.expenseMailTemplate &&
                e.companyMasterID == userData?.companyMasterId,
            ),
            findHeadData: findExpenseHeadData.find(
              (e) => +e.expenseHeadId == +finUserExpenseTranction.expenseHeadId,
            ),
            ExpenseType: getExpenseType(finUserExpenseTranction),
            expense_date: finUserExpenseTranction.userExpense.expense_date,
            currentAuthUserData: getAllUserDetails.find(
              (e) => e.userMasterID == +currentUserID,
            ),
          };
        })();

        if (findCurrentAuthReq.authstatus !== 2) {
          continue;
        }

        if (findCurrentAuthReq && authorizationdetails) {
          promiseArray.push(
            ExpenseAuthorizationRequest.update(
              {
                viewstatus: 0,
                authstatus: authstatus,
                remarks: newArray[i].remarks ? newArray[i].remarks : '',
                updateBy,
                userMasterID: req.userDetails.userMasterId,
              },
              {
                where: {
                  AuthorizationRequestId: newArray[i].authorizationrequestid,
                },
                transaction,
              },
            ),
          );

          if (authstatus == 0) {
            promiseArray.push(
              UserInbox.destroy(
                {
                  where: {
                    activityTable: UserExpense.getTableName(),
                    activityTablePK: allAuthIds,
                  },
                },
                { transaction },
              ),
            );

            promiseArray.push(
              UserExpenseTransaction.update(
                {
                  authorizationStatus: 4,
                  updateBy,
                  authorizedBy: updateBy,
                  authorizedAt: new Date(),
                  authorizerRemark: newArray[i].remarks
                    ? newArray[i].remarks
                    : null,
                },
                {
                  where: {
                    userExpenseTransactionID:
                      newArray[i].userexpensetransactionid,
                  },
                  transaction,
                },
              ),
            );
            const notification = {
              title: 'Expense',
              body: 'Expense Rejected',
            };
            const data = {
              screen: 'expense',
            };
            sendNotification_NEW(
              userData.firebaseToken,
              userData.deviceType,
              notification,
              data,
            );
            if (
              expenseRejectMailTemplate &&
              findCompanyNotificationPolicyData &&
              userData.email
            ) {
              // send mail
              sendMailforExpense_With_Transaction(
                userData.email,
                userData,
                findHeadData?.expenseHead || '', //Expense Head
                findHeadData?.expenseCategories?.[0]?.expenseCategory || '', //Expense Category
                finUserExpenseTranction.expenseAmount,
                finUserExpenseTranction.description,
                expenseRejectMailTemplate,
                findCompanyNotificationPolicyData,
                ExpenseType,
                expense_date,
                currentAuthUserData,
                newArray[i].remarks ? newArray[i].remarks : '',
              );
            }
          } else {
            if (
              +authorizationdetails.AuthorizationCriteriaID ==
              authorizationCriteriaType.SEQUENCENO
            ) {
              promiseArray.push(
                UserInbox.destroy({
                  where: {
                    activityTable: UserExpense.getTableName(),
                    activityTablePK: allAuthIds,
                  },
                  transaction,
                }),
              );
              const approvedUserIds = authRequests.map((e) =>
                e.userMasterID.toString(),
              );
              const remainingUserIds = formAuthUsers.filter(
                (id) => !approvedUserIds.includes(id),
              );

              if (remainingUserIds.length > 0) {
                const createExpenseAuth =
                  await ExpenseAuthorizationRequest.create(
                    {
                      ReferenceID: newArray[i].userexpensetransactionid,
                      userMasterID: remainingUserIds[0],
                      status: 1,
                      authstatus: 2,
                      createBy: updateBy,
                    },
                    { transaction },
                  );

                if (finUserExpenseTranction) {
                  const authorizerData = getAllUserDetails.find(
                    (e) => e.userMasterID == +remainingUserIds[0],
                  );
                  if (authorizerData && userData) {
                    const createInboxObj = {
                      activityTable: UserExpense.getTableName(),
                      activityTablePK:
                        createExpenseAuth.toJSON().AuthorizationRequestId,
                      message: `${userData.displayName} has applied for Expense of ${finUserExpenseTranction.expenseAmount}`,
                      assignedTo: remainingUserIds[0],
                      assignedBy: userData.userMasterID,
                    };
                    createInboxPromise.push(createInboxObj);
                    let notification = {
                      title:
                        'Hey ' +
                        authorizerData.firstName +
                        '! Someone requested for expense',
                      body:
                        userData.firstName +
                        ' has requested for expense approval',
                    };
                    let data = {
                      screen: 'expenserequest',
                      isScheduled: 'true',
                      scheduledTime: new Date().toISOString(),
                    };

                    sendNotification_NEW(
                      authorizerData.firebaseToken,
                      authorizerData.deviceType,
                      notification,
                      data,
                    );
                    if (
                      expenseMailTemplate &&
                      findCompanyNotificationPolicyData &&
                      authorizerData.email &&
                      userData.email
                    ) {
                      // send mail
                      sendMailforExpense_With_Transaction(
                        authorizerData.email,
                        userData,
                        findHeadData?.expenseHead || '', //Expense Head
                        findHeadData?.expenseCategories?.[0]?.expenseCategory ||
                          '', //Expense Category
                        finUserExpenseTranction.expenseAmount,
                        finUserExpenseTranction.description,
                        expenseMailTemplate,
                        findCompanyNotificationPolicyData,
                        ExpenseType,
                        expense_date,
                        currentAuthUserData,
                      );
                    }
                  }
                }
              } else {
                promiseArray.push(
                  UserExpenseTransaction.update(
                    {
                      authorizationStatus: 3,
                      updateBy,
                      authorizedBy: updateBy,
                      authorizedAt: new Date(),
                      authorizerRemark: newArray[i].remarks
                        ? newArray[i].remarks
                        : null,
                    },
                    {
                      where: {
                        userExpenseTransactionID:
                          newArray[i].userexpensetransactionid,
                      },
                      transaction,
                    },
                  ),
                );
                const notification = {
                  title: 'Expense',
                  body: 'Expense accepted successfully',
                };
                const data = {
                  screen: 'expense',
                };
                sendNotification_NEW(
                  userData.firebaseToken,
                  userData.deviceType,
                  notification,
                  data,
                );
                if (
                  expenseAcceptMailTemplate &&
                  findCompanyNotificationPolicyData &&
                  userData.email
                ) {
                  // send mail
                  sendMailforExpense_With_Transaction(
                    userData.email,
                    userData,
                    findHeadData?.expenseHead || '', //Expense Head
                    findHeadData?.expenseCategories?.[0]?.expenseCategory || '', //Expense Category
                    finUserExpenseTranction.expenseAmount,
                    finUserExpenseTranction.description,
                    expenseAcceptMailTemplate,
                    findCompanyNotificationPolicyData,
                    ExpenseType,
                    expense_date,
                    currentAuthUserData,
                  );
                }
              }
            } else if (
              +authorizationdetails.AuthorizationCriteriaID ==
              authorizationCriteriaType.ANYONE
            ) {
              promiseArray.push(
                UserInbox.destroy(
                  {
                    where: {
                      activityTable: UserExpense.getTableName(),
                      activityTablePK: allAuthIds,
                    },
                  },
                  {
                    transaction,
                  },
                ),
              );
              promiseArray.push(
                UserExpenseTransaction.update(
                  {
                    authorizationStatus: 3,
                    updateBy,
                    authorizedBy: updateBy,
                    authorizedAt: new Date(),
                    authorizerRemark: newArray[i].remarks
                      ? newArray[i].remarks
                      : null,
                  },
                  {
                    where: {
                      userExpenseTransactionID:
                        newArray[i].userexpensetransactionid,
                    },
                    transaction,
                  },
                ),
              );

              const notification = {
                title: 'Expense',
                body: 'Expense accepted successfully',
              };
              const data = {
                screen: 'expense',
              };
              sendNotification_NEW(
                userData.firebaseToken,
                userData.deviceType,
                notification,
                data,
              );
              if (
                expenseAcceptMailTemplate &&
                findCompanyNotificationPolicyData &&
                userData.email
              ) {
                // send mail
                sendMailforExpense_With_Transaction(
                  userData.email,
                  userData,
                  findHeadData?.expenseHead || '', //Expense Head
                  findHeadData?.expenseCategories?.[0]?.expenseCategory || '', //Expense Category
                  finUserExpenseTranction.expenseAmount,
                  finUserExpenseTranction.description,
                  expenseAcceptMailTemplate,
                  findCompanyNotificationPolicyData,
                  ExpenseType,
                  expense_date,
                  currentAuthUserData,
                );
              }
            } else if (
              +authorizationdetails.AuthorizationCriteriaID ==
              authorizationCriteriaType.ANYTWO
            ) {
              if (approvedRequests.length + 1 >= 2) {
                promiseArray.push(
                  UserInbox.destroy(
                    {
                      where: {
                        activityTable: UserExpense.getTableName(),
                        activityTablePK: allAuthIds,
                      },
                    },
                    {
                      transaction,
                    },
                  ),
                );
                promiseArray.push(
                  await UserExpenseTransaction.update(
                    {
                      authorizationStatus: 3,
                      updateBy,
                      authorizedBy: updateBy,
                      authorizedAt: new Date(),
                      authorizerRemark: newArray[i].remarks
                        ? newArray[i].remarks
                        : null,
                    },
                    {
                      where: {
                        userExpenseTransactionID:
                          newArray[i].userexpensetransactionid,
                      },
                      transaction,
                    },
                  ),
                );
                const notification = {
                  title: 'Expense',
                  body: 'Expense accepted successfully',
                };
                const data = {
                  screen: 'expense',
                };
                sendNotification_NEW(
                  userData.firebaseToken,
                  userData.deviceType,
                  notification,
                  data,
                );
                if (
                  expenseAcceptMailTemplate &&
                  findCompanyNotificationPolicyData &&
                  userData.email
                ) {
                  // send mail
                  sendMailforExpense_With_Transaction(
                    userData.email,
                    userData,
                    findHeadData?.expenseHead || '', //Expense Head
                    findHeadData?.expenseCategories?.[0]?.expenseCategory || '', //Expense Category
                    finUserExpenseTranction.expenseAmount,
                    finUserExpenseTranction.description,
                    expenseAcceptMailTemplate,
                    findCompanyNotificationPolicyData,
                    ExpenseType,
                    expense_date,
                    currentAuthUserData,
                  );
                }
              } else {
                promiseArray.push(
                  UserInbox.destroy(
                    {
                      where: {
                        activityTable: UserExpense.getTableName(),
                        activityTablePK: newArray[i].authorizationrequestid,
                      },
                    },
                    { transaction },
                  ),
                );
              }
            } else {
              if (approvedRequests.length + 1 >= 3) {
                promiseArray.push(
                  UserExpenseTransaction.update(
                    {
                      authorizationStatus: 3,
                      updateBy,
                      authorizedBy: updateBy,
                      authorizedAt: new Date(),
                      authorizerRemark: newArray[i].remarks
                        ? newArray[i].remarks
                        : null,
                    },
                    {
                      where: {
                        userExpenseTransactionID:
                          newArray[i].userexpensetransactionid,
                      },
                      transaction,
                    },
                  ),
                );
                promiseArray.push(
                  UserInbox.destroy(
                    {
                      where: {
                        activityTable: UserExpense.getTableName(),
                        activityTablePK: allAuthIds,
                      },
                    },
                    {
                      transaction,
                    },
                  ),
                );
                const notification = {
                  title: 'Expense',
                  body: 'Expense accepted successfully',
                };
                const data = {
                  screen: 'expense',
                };
                sendNotification_NEW(
                  userData.firebaseToken,
                  userData.deviceType,
                  notification,
                  data,
                );
                if (
                  expenseAcceptMailTemplate &&
                  findCompanyNotificationPolicyData &&
                  userData.email
                ) {
                  // send mail
                  sendMailforExpense_With_Transaction(
                    userData.email,
                    userData,
                    findHeadData?.expenseHead || '', //Expense Head
                    findHeadData?.expenseCategories?.[0]?.expenseCategory || '', //Expense Category
                    finUserExpenseTranction.expenseAmount,
                    finUserExpenseTranction.description,
                    expenseAcceptMailTemplate,
                    findCompanyNotificationPolicyData,
                    ExpenseType,
                    expense_date,
                    currentAuthUserData,
                  );
                }
              } else {
                promiseArray.push(
                  UserInbox.destroy(
                    {
                      where: {
                        activityTable: UserExpense.getTableName(),
                        activityTablePK: newArray[i].authorizationrequestid,
                      },
                    },
                    { transaction },
                  ),
                );
              }
            }
          }
        }
      }
    }
    if (createInboxPromise.length > 0) {
      promiseArray.push(
        UserInbox.bulkCreate(createInboxPromise, {
          transaction,
        }),
      );
    }
    await Promise.all(promiseArray);

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        +authstatus == 1
          ? message.usermessage.approveMessage('User Expense')
          : message.usermessage.rejectMessage('User Expense'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.overtimedatashow = async (req, res, next) => {
  try {
    let {
      page,
      limit,
      companyMasterID,
      userMasterID,
      startdate,
      enddate,
      AuthorizationRequired,
      searchQuery,
      exportData,
      exportFileType,
    } = await req.body;

    let offset = (page - 1) * limit;

    const condition = {};

    if (AuthorizationRequired == 0) {
      condition.AuthorizationRequired = [0, 1, 2];
    } else if (AuthorizationRequired == 1) {
      condition.AuthorizationRequired = 3;
    } else if (AuthorizationRequired == 2) {
      condition.AuthorizationRequired = 4;
    }

    if (startdate && enddate) {
      condition.OverTimeDate = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
    }

    const userSearchCondition = {};
    if (searchQuery)
      userSearchCondition[Sequelize.Op.or] = [
        { displayName: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
      ];

    if (companyMasterID) {
      req.userDetails.accessibleCompanies = companyMasterID;
      condition.CompanyMasterID = companyMasterID;
    }

    if (userMasterID) {
      condition.UserMasterID = userMasterID;
    }

    const overtimedata = await OvertimeCalculation.findAndCountAll({
      limit: limit,
      offset: offset,
      where: condition,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: UserMaster,
          where: userSearchCondition,
          attributes: [],
          required: true,
          ...accessibleUsers(req.userDetails, false),
        },
        { model: attendanceTransaction, attributes: [] },
        { model: companyMaster, attributes: [] },
      ],
      attributes: [
        [Sequelize.col('userMaster.displayName'), 'displayName'],
        [Sequelize.col('userMaster.userNumber'), 'userNumber'],
        [Sequelize.col('attendanceTransaction.InDatetime'), 'InDatetime'],
        [Sequelize.col('attendanceTransaction.OutDateTime'), 'OutDateTime'],
        [Sequelize.col('companyMaster.companyName'), 'CompanyName'],
        'OverTimeDate',
        'OverTimeIn',
        'OverTimeOut',
        'OverTimeHourAndMin',
        'OverTimeID',
        'AuthorizationRequired',
        'UpdateTimeInDateTime',
        'UpdateTimeOutDateTime',
        'UpdateOverTimeHourAndMin',
        'UserMasterID',
      ],
    });

    for (let j = 0; j < overtimedata.rows.length; j++) {
      let authorizationdetails = await AuthorizationDetails.findOne({
        where: {
          userMasterID: overtimedata.rows[j].UserMasterID,
          status: 1,
        },
        raw: true,
        attributes: [],
        include: [
          {
            model: AuthorizationMaster,
            where: { authorizationMasterName: 'Overtime' },
            attributes: [],
          },
          {
            model: AuthorizationCriteria,
            attributes: ['AuthorizationCriteria'],
          },
        ],
      });
      if (authorizationdetails) {
        overtimedata.rows[j].dataValues.Auth_Criteria =
          authorizationdetails[
            'AuthorizationCriteriaMaster.AuthorizationCriteria'
          ];
      }
    }

    async function processRow(row) {
      const [designation, department, branch, assignPersonName] =
        await Promise.all([
          employeeDesignation(row.dataValues.UserMasterID, new Date()),
          employeeDepartment(row.dataValues.UserMasterID, new Date()),
          employeeBranch(row.dataValues.UserMasterID, new Date()),
          getAssignPersonName(row.dataValues),
        ]);

      return {
        UserName: row.dataValues.displayName,
        UserNumber: row.dataValues.userNumber,
        CompanyName: row.dataValues.CompanyName,
        BranchName: branch ? branch['branchMaster.branchName'] : '',
        Designation: designation
          ? designation['designation.designationName']
          : '',
        Department: department ? department['department.departmentName'] : '',
        Status: getStatus(row.dataValues.AuthorizationRequired),
        AuthCriteria: row.dataValues.Auth_Criteria || '',
        AssignPersonName: assignPersonName.length !== 0 ? assignPersonName : '',
        OverTimeDate: row.dataValues.OverTimeDate || '',
        InDatetime: row.dataValues.InDatetime
          ? await asiaKolkataDateTime(row.dataValues.InDatetime)
          : '',
        OutDateTime: row.dataValues.OutDateTime
          ? await asiaKolkataDateTime(row.dataValues.OutDateTime)
          : '',
        OverTimeIn: row.dataValues.OverTimeIn || '',
        OverTimeOut: row.dataValues.OverTimeOut || '',
        OverTimeHourAndMin: row.dataValues.OverTimeHourAndMin || '',
      };
    }

    async function getAssignPersonName(dataValues) {
      if ([0, 1, 2].includes(dataValues.AuthorizationRequired)) {
        const assignPersonData = await OvertimeAuthorizationRequest.findAll({
          where: {
            ReferenceID: dataValues.OverTimeID,
          },
          raw: true,
        });

        const userPromises = assignPersonData.map(async (assignPerson) => {
          const user1 = await UserMaster.findOne({
            where: {
              userMasterID: assignPerson.userMasterID,
            },
            raw: true,
          });
          return user1.displayName;
        });

        return Promise.all(userPromises);
      }
      return [];
    }

    function getStatus(authorizationRequired) {
      switch (authorizationRequired) {
        case 0:
        case 1:
        case 2:
          return 'Pending';
        case 4:
          return 'Rejected';
        case 3:
          return 'Approved';
        default:
          return '';
      }
    }

    if (exportData) {
      const updatedDownloadRows = await Promise.all(
        overtimedata.rows.map(processRow),
      );

      await generateExcel(
        updatedDownloadRows,
        'Company-Overtime-Report',
        exportFileType,
        res,
      );
      return;
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Overtime'),
      data: overtimedata,
    });
  } catch (err) {
    next(err);
  }
};

exports.expensedatashow = async (req, res, next) => {
  try {
    let {
      companyMasterID,
      page,
      limit,
      authorizationStatus,
      startdate,
      enddate,
      searchQuery,
      fromAmount,
      toAmount,
      expenseType,
      exportData,
      exportFileType,
    } = await req.body;

    let offset = (page - 1) * limit;

    if (!companyMasterID)
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });

    if (authorizationStatus == 0) {
      authorizationStatus = [0, 1, 2];
    } else if (authorizationStatus == 1) {
      authorizationStatus = 3;
    } else if (authorizationStatus == 2) {
      authorizationStatus = 4;
    }

    const expenseTypeCondition = {};
    if (startdate && enddate) {
      expenseTypeCondition.expense_date = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
    }

    if (expenseType === expenseTypes.VISIT) {
      expenseTypeCondition.visitID = {
        [Sequelize.Op.ne]: null,
      };
    } else if (expenseType === expenseTypes.TOUR) {
      expenseTypeCondition.ToursMasterID = {
        [Sequelize.Op.ne]: null,
      };
    } else if (expenseType === expenseTypes.PERSONAL) {
      expenseTypeCondition.visitID = null;
      expenseTypeCondition.ToursMasterID = null;
      expenseTypeCondition.projectID = null;
      expenseTypeCondition.serviceNumber = null;
    } else if (expenseType === expenseTypes.PROJECT) {
      expenseTypeCondition.projectID = {
        [Sequelize.Op.ne]: null,
      };
    } else if (expenseType === expenseTypes.SERVICE) {
      expenseTypeCondition.serviceNumber = {
        [Sequelize.Op.ne]: null,
      };
    }

    const authorizationFromToAmountCondition = {};
    authorizationFromToAmountCondition.status = 1;
    if (fromAmount && toAmount) {
      authorizationFromToAmountCondition.expenseAmount = {
        [Sequelize.Op.between]: [fromAmount, toAmount],
      };
    }
    if (authorizationStatus) {
      authorizationFromToAmountCondition.authorizationStatus =
        authorizationStatus;
    }

    if (companyMasterID) req.userDetails.accessibleCompanies = companyMasterID;

    const userSearchCondition = {};
    if (searchQuery)
      userSearchCondition[Sequelize.Op.or] = [
        { displayName: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
      ];

    const expensedata = await UserExpenseTransaction.findAndCountAll({
      limit,
      offset,
      where: authorizationFromToAmountCondition,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: ExpenseHead,
          attributes: [
            'expenseHeadId',
            'expenseHead',
            'accountHeadID',
            'expenseCategoryId',
          ],
          include: [
            {
              model: ExpenseCategory,
              attributes: ['expenseCategoryId', 'expenseCategory'],
            },
          ],
        },
        {
          model: UserExpense,
          as: 'userExpense',
          required: true,
          attributes: [
            'userExpenseID',
            'visitID',
            'userMasterID',
            'ToursMasterID',
            'expense_date',
            'projectID',
            'serviceNumber',
            'serviceDate',
          ],
          where: expenseTypeCondition,
          include: [
            {
              required: true,
              model: UserMaster,
              attributes: userAttributes,
              where: {
                companyMasterId: companyMasterID,
                ...userSearchCondition,
              },
              ...accessibleUsers(req.userDetails, false, false),
              include: [{ model: companyMaster, attributes: ['companyName'] }],
            },
            { model: ToursMaster },
            {
              model: Project,
              attributes: [
                'projectID',
                'projectName',
                'display_id',
                'short_name',
                'projectDescription',
              ],
            },
            {
              model: Visit,
              required: false,
              attributes: ['visitID', 'visitDate'],
            },
          ],
        },
      ],
    });

    async function processRow(row) {
      const [
        designation,
        department,
        branch,
        assignPersonName,
        expenseTypeName,
      ] = await Promise.all([
        employeeDesignation(
          row.userExpense.userMaster.userMasterID,
          new Date(),
        ),
        employeeDepartment(row.userExpense.userMaster.userMasterID, new Date()),
        employeeBranch(row.userExpense.userMaster.userMasterID, new Date()),
        getAssignPersonName(row),
        getExpenseType(row),
      ]);

      return {
        UserName: row.userExpense.userMaster.displayName,
        UserNumber: row.userExpense.userMaster.userNumber,
        CompanyName: row.userExpense.userMaster.companyMaster.companyName,
        BranchName: branch ? branch['branchMaster.branchName'] : '',
        Designation: designation
          ? designation['designation.designationName']
          : '',
        Department: department ? department['department.departmentName'] : '',
        Status: getStatus(Number(row.authorizationStatus)),
        AssignPersonName: assignPersonName.length !== 0 ? assignPersonName : '',
        UserExpense: row.userExpense.expense_date || '',
        VisitDate:
          expenseTypeName == expenseTypes.VISIT
            ? moment(row.userExpense.visit.visitDate, 'YYYY-MM-DD').format(
                'DD-MM-YYYY',
              )
            : '',
        ExpenseType: expenseTypeName || '',
        ExpenseHead: row.expenseHead.expenseHead || '',
        ExpenseAmount: row.expenseAmount || '',
        Description: row.description || '',
      };
    }

    async function getAssignPersonName(dataValues) {
      if ([0, 1, 2].includes(Number(dataValues.authorizationStatus))) {
        const assignPersonData = await ExpenseAuthorizationRequest.findAll({
          where: {
            ReferenceID: dataValues.userExpenseTransactionID,
          },
          raw: true,
        });

        const userPromises = assignPersonData.map(async (assignPerson) => {
          const user1 = await UserMaster.findOne({
            where: {
              userMasterID: assignPerson.userMasterID,
            },
            raw: true,
          });
          return user1.displayName;
        });

        return Promise.all(userPromises);
      }
      return [];
    }

    function getStatus(authorizationStatus) {
      switch (authorizationStatus) {
        case 0:
        case 1:
        case 2:
          return 'Pending';
        case 4:
          return 'Rejected';
        case 3:
          return 'Approved';
        default:
          return '';
      }
    }

    if (exportData) {
      const updatedDownloadRows = await Promise.all(
        expensedata.rows.map(processRow),
      );

      await generateExcel(
        updatedDownloadRows,
        'Company-Expense-Report',
        exportFileType,
        res,
      );
      return;
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Expense'),
      data: expensedata,
    });
  } catch (err) {
    next(err);
  }
};

exports.getExpenseAuthorizationRequestByAuthorizationRequestId = async (
  req,
  res,
  next,
) => {
  try {
    const get_one_data = await ExpenseAuthorizationRequest.findAll({
      where: {
        AuthorizationRequestId: req.params.id,
      },
    });

    return res.status(200).json({
      status: 200,
      data: get_one_data,
      message: message.usermessage.fetchMessage('data'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getExpenseAuthByUserExpenseTrans = async (req, res, next) => {
  try {
    let {
      expenseType,
      fromamount,
      toamount,
      page,
      limit,
      authorizerUserMasterID,
      fromdate,
      todate,
      userid,
      authstatus,
      companyMasterID,
    } = await req.body;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginationQuery = {};

    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const expenseTypeCondition = {};
    const expenseAuthCondition = {
      status: 1,
      userMasterID: authorizerUserMasterID,
    };
    const expenseTransactionCondition = {};
    if (authstatus == undefined || authstatus == null) {
      expenseTransactionCondition.authorizationStatus = {
        [Sequelize.Op.in]: [0, 1, 2],
      };
      expenseAuthCondition.authstatus = 2;
    } else if (+authstatus == authStatusTypeObj.PENDING) {
      expenseTransactionCondition.authorizationStatus = {
        [Sequelize.Op.in]: [0, 1, 2],
      };
      expenseAuthCondition.authstatus = 2;
    } else if (+authstatus == authStatusTypeObj.APPROVED) {
      expenseTransactionCondition.authorizationStatus = 3;
      expenseAuthCondition.authstatus = 1;
    } else if (+authstatus == authStatusTypeObj.REJECTED) {
      expenseTransactionCondition.authorizationStatus = 4;
      expenseAuthCondition.authstatus = 0;
    }

    if (fromamount && toamount) {
      expenseTransactionCondition.expenseAmount = {
        [Sequelize.Op.gte]: +fromamount,
        [Sequelize.Op.lte]: +toamount,
      };
    } else if (fromamount) {
      expenseTransactionCondition.expenseAmount = {
        [Sequelize.Op.gte]: +fromamount,
      };
    } else if (toamount) {
      expenseTransactionCondition.expenseAmount = {
        [Sequelize.Op.lte]: +toamount,
      };
    }
    expenseTransactionCondition.status = 1;

    if (expenseType) {
      if (expenseType === expenseTypes.VISIT) {
        expenseTypeCondition.visitID = {
          [Sequelize.Op.ne]: null,
        };
      } else if (expenseType === expenseTypes.TOUR) {
        expenseTypeCondition.ToursMasterID = {
          [Sequelize.Op.ne]: null,
        };
      } else if (expenseType === expenseTypes.PERSONAL) {
        expenseTypeCondition.visitID = null;
        expenseTypeCondition.ToursMasterID = null;
        expenseTypeCondition.projectID = null;
        expenseTypeCondition.serviceNumber = null;
      } else if (expenseType === expenseTypes.PROJECT) {
        expenseTypeCondition.projectID = {
          [Sequelize.Op.ne]: null,
        };
      } else if (expenseType === expenseTypes.SERVICE) {
        expenseTypeCondition.serviceNumber = {
          [Sequelize.Op.ne]: null,
        };
      }
    }

    if (fromdate && todate) {
      expenseTypeCondition.expense_date = {
        [Sequelize.Op.between]: [new Date(fromdate), new Date(todate)],
      };
    }

    if (userid && userid.length) {
      expenseTypeCondition.userMasterID = { [Sequelize.Op.in]: userid };
    }
    const userCondition = { status: 1 };
    if (companyMasterID) {
      userCondition.companyMasterId = companyMasterID;
    }

    const { rows: findExpenseAuthRequest, count } =
      await ExpenseAuthorizationRequest.findAndCountAll({
        where: expenseAuthCondition,
        ...paginationQuery,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: UserExpenseTransaction,
            where: expenseTransactionCondition,
            include: [
              {
                model: ExpenseHead,
                as: 'expenseHead',
                attributes: [
                  'expenseHeadId',
                  'expenseHead',
                  'accountHeadID',
                  'expenseCategoryId',
                ],
                include: [
                  {
                    model: ExpenseCategory,
                    attributes: ['expenseCategoryId', 'expenseCategory'],
                  },
                ],
              },
              {
                model: UserExpense,
                as: 'userExpense',
                where: expenseTypeCondition,
                attributes: [
                  'userExpenseID',
                  'visitID',
                  'userMasterID',
                  'ToursMasterID',
                  'expense_date',
                  'projectID',
                  'serviceNumber',
                  'serviceDate',
                ],
                include: [
                  {
                    required: true,
                    model: UserMaster,
                    where: userCondition,
                    attributes: userAttributes,
                    include: [
                      { model: companyMaster, attributes: ['companyName'] },
                      {
                        required: false,
                        separate: true,

                        model: EmployeeDesignation,
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
                              endDate: {
                                [Sequelize.Op.gte]: new Date(filterDate),
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
                        separate: true,

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
                        separate: true,

                        model: EmployeeJoiningDetails,
                        attributes: ['employeeCode'],
                      },
                      {
                        separate: true,

                        required: false,
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
                    required: false,
                    model: Visit,
                    attributes: ['visitID', 'visitDate'],
                    include: [
                      {
                        model: Customer,
                        attributes: [
                          'customerID',
                          'companyName',
                          'customerName',
                        ],
                      },
                    ],
                  },
                  { required: false, model: ToursMaster },
                  {
                    required: false,
                    model: Project,
                    attributes: [
                      'projectID',
                      'projectName',
                      'display_id',
                      'short_name',
                      'projectDescription',
                    ],
                  },
                ],
              },
            ],
          },
          {
            required: true,
            model: UserMaster,
            as: 'authorizedPerson',
            attributes: userAttributes,
            include: [{ model: companyMaster, attributes: ['companyName'] }],
          },
        ],
      });

    return res.status(200).json({
      status: 200,
      data: findExpenseAuthRequest,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getExpenseAuthByUserExpense = async (req, res, next) => {
  try {
    let {
      expenseType,
      page,
      limit,
      authorizerUserMasterID,
      fromdate,
      todate,
      userid,
      authstatus,
      companyMasterID,
    } = req.body;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginationQuery = {};

    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const expenseTypeCondition = {};
    const expenseTransactionCondition = { status: 1 };
    const expenseAuthCondition = {
      status: 1,
      userMasterID: authorizerUserMasterID,
    };

    let applyAllCondition = false;
    let allowedStatuses = [];

    if (authstatus === undefined || authstatus === null) {
      expenseTransactionCondition.authorizationStatus = {
        [Sequelize.Op.in]: [0, 1, 2],
      };
      expenseAuthCondition.authstatus = 2;
    } else if (+authstatus === authStatusTypeObj.PENDING) {
      expenseTransactionCondition.authorizationStatus = {
        [Sequelize.Op.in]: [0, 1, 2],
      };
      expenseAuthCondition.authstatus = 2;
    } else if (+authstatus === authStatusTypeObj.APPROVED) {
      allowedStatuses = [3, 4];
      applyAllCondition = true;
    } else if (+authstatus === authStatusTypeObj.REJECTED) {
      allowedStatuses = [4];
      applyAllCondition = true;
    } else {
      expenseTransactionCondition.authorizationStatus = {
        [Sequelize.Op.in]: [0, 1, 2],
      };
      expenseAuthCondition.authstatus = 2;
    }

    if (applyAllCondition) {
      expenseTypeCondition.userExpenseID = {
        [Sequelize.Op.in]: Sequelize.literal(`(
          SELECT ut."userExpenseID"
          FROM "userExpenseTransactions" ut
          WHERE ut."status" = 1
          GROUP BY ut."userExpenseID"
          HAVING COUNT(*) = COUNT(
            CASE WHEN ut."authorizationStatus" IN (${allowedStatuses.join(',')})
            THEN 1 END
          )
        )`),
      };
    }
    if (expenseType) {
      if (expenseType === expenseTypes.VISIT) {
        expenseTypeCondition.visitID = { [Sequelize.Op.ne]: null };
      } else if (expenseType === expenseTypes.TOUR) {
        expenseTypeCondition.ToursMasterID = { [Sequelize.Op.ne]: null };
      } else if (expenseType === expenseTypes.PERSONAL) {
        expenseTypeCondition.visitID = null;
        expenseTypeCondition.ToursMasterID = null;
        expenseTypeCondition.projectID = null;
        expenseTypeCondition.serviceNumber = null;
      } else if (expenseType === expenseTypes.PROJECT) {
        expenseTypeCondition.projectID = { [Sequelize.Op.ne]: null };
      } else if (expenseType === expenseTypes.SERVICE) {
        expenseTypeCondition.serviceNumber = {
          [Sequelize.Op.ne]: null,
        };
      }
    }

    if (fromdate && todate) {
      expenseTypeCondition.expense_date = {
        [Sequelize.Op.between]: [new Date(fromdate), new Date(todate)],
      };
    }

    if (userid && userid.length) {
      expenseTypeCondition.userMasterID = { [Sequelize.Op.in]: userid };
    }
    const userCondition = { status: 1 };
    if (companyMasterID) {
      userCondition.companyMasterId = companyMasterID;
    }
    const { rows: findUserExpenseAuth, count } =
      await UserExpense.findAndCountAll({
        where: expenseTypeCondition,
        ...paginationQuery,
        order: [['expense_date', 'DESC']],
        distinct: true,
        attributes: {
          include: [
            [
              Sequelize.literal(`(
                SELECT json_build_object(
                'pending', COUNT(*) FILTER (
                  WHERE uet."deletedAt" IS NULL 
                  AND uet."status" = 1
                  AND ua."authstatus" = 2
                ),
                'approved', COUNT(*) FILTER (
                  WHERE uet."deletedAt" IS NULL 
                  AND uet."status" = 1
                  AND ua."authstatus" = 1
                ),
                'rejected', COUNT(*) FILTER (
                  WHERE uet."deletedAt" IS NULL 
                  AND uet."status" = 1
                  AND ua."authstatus" = 0
                ),
                'total', COUNT(*) FILTER (
                  WHERE uet."status" = 1
                ),
                'pendingAmount', COALESCE(SUM(
                  CASE WHEN uet."deletedAt" IS NULL 
                    AND uet."status" = 1
                    AND ua."authstatus" = 2
                  THEN uet."expenseAmount" ELSE 0 END
                ), 0),
                'approvedAmount', COALESCE(SUM(
                  CASE WHEN uet."deletedAt" IS NULL 
                    AND uet."status" = 1
                    AND ua."authstatus" = 1
                  THEN uet."expenseAmount" ELSE 0 END
                ), 0),
                'rejectedAmount', COALESCE(SUM(
                  CASE WHEN uet."deletedAt" IS NULL 
                    AND uet."status" = 1
                    AND ua."authstatus" = 0
                  THEN uet."expenseAmount" ELSE 0 END
                ), 0),
                'totalExpenseAmount', COALESCE(SUM(
                  CASE WHEN uet."deletedAt" IS NULL 
                    AND uet."status" = 1
                  THEN uet."expenseAmount" ELSE 0 END
                ), 0)
                )
                FROM "userExpenseTransactions" AS uet 
                JOIN "expenseAuthorizations" AS ua
                ON ua."ReferenceID" = uet."userExpenseTransactionID"
                WHERE uet."userExpenseID" = "userExpense"."userExpenseID" 
                AND uet."status" = 1 
                AND ua."userMasterID" = ${authorizerUserMasterID}
              )`),
              'expenseSummary',
            ],
          ],
        },

        include: [
          {
            model: UserExpenseTransaction,
            as: 'ut',
            where: expenseTransactionCondition,
            include: [
              {
                model: ExpenseAuthorizationRequest,
                as: 'Auth',
                where: expenseAuthCondition,
              },
            ],
          },

          {
            model: UserMaster,
            required: true,
            attributes: userAttributes,
            where: userCondition,
            include: [
              {
                required: false,
                separate: true,
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
                separate: true,
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
                required: false,
                separate: true,
                model: EmployeeBranch,
                where: {
                  status: 1,
                  applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
                include: [{ model: Division, attributes: ['divisionName'] }],
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
                  { model: WorkingArea, attributes: ['workingAreaName'] },
                ],
              },
            ],
          },
        ],
      });
    return res.status(200).json({
      status: 200,
      data: findUserExpenseAuth,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};
