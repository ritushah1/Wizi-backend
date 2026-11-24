const Sequelize = require('sequelize');
const LeaveAuthorizationRequest = require('../models/leaveAuthorization');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const Department = require('../models/department');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');
const AuthorizationMaster = require('../models/authorizationMaster');
const { executeQuery } = require('./common.controller');
const UserLeave = require('../models/userleave');
const WeekoffHolidayTran = require('../models/weekoffHolidayTran');
const userleavetransaction = require('../models/userLeaveTransaction');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const UserLeaveTransaction = require('../models/userLeaveTransaction');

const companyMaster = require('../models/companyMaster');
const HrLeaveMonthTrans = require('../models/hrLeavesMonthlyTrans');
const EmployeeBranch = require('../models/employeeBranch');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const SalaryPolicy = require('../models/salaryPolicy');
const MailTemplateEditor = require('../models/mailTemplateEditor');

const LoanMaster = require('../models/loanMaster');
const OvertimeAuthorizationRequest = require('../models/overtimeAuthorization');
const advancePayment = require('../models/advancePayment');
const overTimeCalculation = require('../models/overTimeCalculation');

const UserExpenseTransaction = require('../models/userExpenseTransaction');
const UserExpense = require('../models/userExpense');

const UserInbox = require('../models/UserInbox');
const moment = require('moment');
const { appURL } = require('../utils/labelUtils');

const {
  encodeSecureBreak,
  findCompanyNotificationPolicy,
  accessibleUsers,
  asiaKolkataDateTime,
  daysInMonth,
  updateviewstatusAll,
  sendNotification,
  employeeDepartment,
  employeeDesignation,
  employeeBranch,
  employeeeLeaveBalance,
  sendAcceptRejectMail,
  getWeekoffHoliday,
  employeeAttendancePolicy,
  deleteOvertimeCoff,
  calculateWeekoffMinutes,
  add_OD_On_weekOff_Coff_OT_ED,
  checkCoffBalanceProcess,
  leave,
  getApprovedLeaveList,
  invalidKeyParams,
  checkApproveLeaveRequest,
  getemployeeLeavePolicy,
  allowClubbedLeave,
  getAllSingleDayLeave,
} = require('../utils/commonUtilFunctions');

const { generateExcel } = require('../utils/exportData');

const {
  userAttributes,
  authStatusType,
  authStatusTypeObj,
  statusCodes,
  AuthByEnum,
} = require('../utils/commonVars');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const BranchMaster = require('../models/branchMaster');
const ApprovedLeaveAuthorization = require('../models/approvedLeaveAuthorization');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const {
  authorizationMasterTypes,
  PayrollFrequencyType,
  CoffUsedTypeEnum,
  authorizationStatusString,
  AuthorizationStatusType,
  overtimeAddedEnum,
  authorizationCriteriaType,
} = require('../utils/dbUtils');
const { sendEmailForLeave } = require('../middleware/sendemail');
const attendanceTransaction = require('../models/attendanceTransaction');
const ShiftRoster = require('../models/shiftRoster');
const EmployeeShift = require('../models/employeeShift');
const Shift = require('../models/shift');
const ShiftTIme = require('../models/shiftTime');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const HrLeaveBalance = require('../models/hrLeaveBalance');
const UsedCoffTransaction = require('../models/usedCoffTransaction');
const empLeavePolicy = require('../models/empLeavePolicy');
const employeeHolidayPolicy = require('../models/employeeHolidayPolicy');
const holidayPolicy = require('../models/holidayPolicy');
const HolidayCompensationRule = require('../models/holidayCompensationRule');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const ExcelJS = require('exceljs');

const notification_options = {
  priority: 'high',
  timeToLive: 60 * 60 * 24,
};

async function finalLeaveApprove({
  ReferenceID,
  userleaveTrans,
  authRequestId,
  finalApproved,
  createBy,
  createByIp,
  req,
  transaction,
}) {
  // Update User Leave As Accepted
  if (finalApproved) {
    await UserLeave.update(
      {
        authorizationStatus: 3,
        updateBy: createBy,
        updateByIp: createByIp,
        authorizedBy: createBy,
        authorizedAt: new Date(),
        isAuthorizedBy: false,
      },
      {
        where: {
          UserLeaveApplicationID: ReferenceID,
          status: 1,
        },
        transaction,
      },
    );
  }

  const approvedAuth = [];
  const approvedLeaveTrans = [];

  for (const item of userleaveTrans) {
    if (finalApproved) {
      approvedLeaveTrans.push({
        ReferenceID: item.ReferenceID,
        LeaveTranId: item.LeaveTranId,
        days: item.days,
        date: item.date,
        issandwichleave: item.issandwichleave,
        createBy: createBy,
        createByIp: createByIp,
      });
    }

    approvedAuth.push({
      UserLeaveApplicationID: item.ReferenceID,
      AuthorizationRequestId: authRequestId,
      LeaveTranId: item.LeaveTranId,
      days: item.days,
      date: item.date,
      issandwichleave: item.issandwichleave,
    });

    if (+item?.days1 > 0) {
      if (finalApproved) {
        approvedLeaveTrans.push({
          ReferenceID: item.ReferenceID,
          LeaveTranId: item.LeaveTranId1,
          days: item.days1,
          date: item.date,
          issandwichleave: item.issandwichleave,
          createBy: createBy,
          createByIp: createByIp,
        });
      }

      approvedAuth.push({
        UserLeaveApplicationID: item.ReferenceID,
        AuthorizationRequestId: authRequestId,
        LeaveTranId: item.LeaveTranId1,
        days: item.days1,
        date: item.date,
        issandwichleave: item.issandwichleave,
      });
    }
  }

  await ApprovedLeaveAuthorization.bulkCreate(approvedAuth, {
    user: req.userDetails,
    individualHooks: true,
    transaction,
  });
  if (approvedLeaveTrans.length && finalApproved) {
    await UserLeaveTransaction.bulkCreate(approvedLeaveTrans, { transaction });
  }
}

exports.updateViewStatus = async (req, res, next) => {
  try {
    let { tableName, authstatus, userMasterID } = await req.body;

    await updateviewstatusAll(tableName, authstatus, userMasterID);

    res.status(200).json({
      status: 200,
      message: 'Update Successfully.',
    });
  } catch (err) {
    next(err);
  }
};

exports.countPendingRequests = async (req, res, next) => {
  let { userMasterID } = await req.body;

  if (!userMasterID) {
    return res.status(200).json({
      status: 401,
      message: message.errorMessage.INVALID_REQUEST,
    });
  }

  const [
    totalPendingleaveCount,
    totalleaveCount,
    totalpendingOtcount,
    Otcount,
    expenseCount,
  ] = await Promise.all([
    LeaveAuthorizationRequest.count({
      where: {
        userMasterID: userMasterID,
        authstatus: 2,
        status: 1,
      },
      include: [
        {
          model: UserLeave,
          where: {
            authorizationStatus: {
              [Sequelize.Op.notIn]: [3, 4],
            },
          },
          include: [
            { model: UserMaster, where: { status: 1 } },
            {
              model: HrLeaveTypes,
              where: {
                LeaveID: {
                  [Sequelize.Op.notIn]: [25],
                },
              },
            },
          ],
        },
      ],
    }),
    LeaveAuthorizationRequest.count({
      where: {
        userMasterID: userMasterID,
        viewstatus: 0,
        status: 1,
      },
      group: ['authstatus'],
      include: [
        {
          model: UserLeave,
          include: [
            { model: UserMaster, where: { status: 1 } },
            {
              model: HrLeaveTypes,
              where: {
                LeaveID: {
                  [Sequelize.Op.notIn]: [25],
                },
              },
            },
          ],
        },
      ],
    }),
    OvertimeAuthorizationRequest.count({
      where: {
        [Sequelize.Op.and]: [{ userMasterID: userMasterID }, { authstatus: 2 }],
        status: 1,
      },
      include: [
        {
          model: overTimeCalculation,
          as: 'overTimeCalculation',
          where: {
            AuthorizationRequired: {
              [Sequelize.Op.notIn]: [3, 4],
            },
          },
          include: [{ model: UserMaster, where: { status: 1 } }],
        },
      ],
    }),
    OvertimeAuthorizationRequest.count({
      where: {
        [Sequelize.Op.and]: [{ userMasterID: userMasterID }, { viewstatus: 0 }],
        status: 1,
      },
      group: ['authstatus'],
      include: [
        {
          model: overTimeCalculation,
          as: 'overTimeCalculation',
          include: [{ model: UserMaster, where: { status: 1 } }],
        },
      ],
    }),
    executeQuery(
      `
  SELECT 
  COUNT(*) FILTER (WHERE ea.authstatus = 2 AND uet."authorizationStatus" not in (3, 4)) as pending,
  COUNT(*) FILTER (WHERE ea.authstatus = 1) as approved,
  COUNT(*) FILTER (WHERE ea.authstatus = 0) as rejected
FROM "expenseAuthorizations" ea
INNER JOIN "userExpenseTransactions" uet 
  ON ea."ReferenceID" = uet."userExpenseTransactionID"
INNER JOIN "userExpenses" ue 
  ON uet."userExpenseID" = ue."userExpenseID" 
  AND ue.status = 1
INNER JOIN "userMasters" um 
  ON ue."userMasterID" = um."userMasterID" 
  AND um.status = 1
WHERE 
  ea."userMasterID" = ` +
        userMasterID +
        `
  AND ea.status = 1 
  AND ea.viewstatus = 0`,
    ),
  ]);

  let totalapproveOtcount = 0;
  let totalRejectedOtcount = 0;

  Otcount.forEach((e) => {
    if (e.authstatus == 1) {
      totalapproveOtcount = e.count;
    } else if (e.authstatus == 0) {
      totalRejectedOtcount = e.count;
    }
  });

  let totalapproveleaveCount = 0;
  let totalRejectedleaveCount = 0;

  totalleaveCount.forEach((e) => {
    if (e.authstatus == 1) {
      totalapproveleaveCount = e.count;
    } else if (e.authstatus == 0) {
      totalRejectedleaveCount = e.count;
    }
  });

  return res.status(200).json({
    status: 200,
    leaveCount: totalPendingleaveCount,
    OTcount: totalpendingOtcount,
    expenseAuthorizationsCount: expenseCount?.[0]?.pending || 0,
    leaveapprove: totalapproveleaveCount,
    Otapprove: totalapproveOtcount,
    expenseAuthorizationsapprove: expenseCount?.[0]?.approved || 0,
    leaveRejected: totalRejectedleaveCount,
    OTrejected: totalRejectedOtcount,
    expenseAuthorizationsRejected: expenseCount?.[0]?.rejected || 0,
  });
};

exports.listLeaveAuthRequestNew = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      startdate,
      enddate,
      user,
      status,
      companyMasterID,
      isExport = false,
    } = req.body;
    const authUserMasterID = req.userDetails.userMasterId;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginateCondition =
      page && limit && !isExport ? { offset: (page - 1) * limit, limit } : {};

    const condition = {
      status: 1,
      userMasterID: authUserMasterID,
      '$userLeave.status$': 1,
    };

    if (status !== null && status !== undefined) {
      condition.authstatus = status;
      if (status == 2)
        condition['$userLeave.authorizationStatus$'] = {
          [Sequelize.Op.notIn]: [3, 4],
        };
    } else {
      condition.authstatus = 2;
      condition['$userLeave.authorizationStatus$'] = {
        [Sequelize.Op.notIn]: [3, 4],
      };
    }

    if (user && user.length > 0) {
      condition['$userLeave.userMasterID$'] = {
        [Sequelize.Op.in]: user,
      };
    }

    if (startdate && enddate) {
      condition['$userLeave.FromDate$'] = {
        [Sequelize.Op.between]: [startdate, enddate],
      };
    }
    const userCondition = { status: 1 };
    if (companyMasterID) {
      userCondition.companyMasterId = companyMasterID;
    }

    const { rows: authRequest, count } =
      await LeaveAuthorizationRequest.findAndCountAll({
        // raw: true,
        distinct: true,
        where: condition,
        ...paginateCondition,
        order: [['createdAt', 'DESC']],
        include: [
          {
            required: true,
            model: UserLeave,
            include: [
              {
                model: companyMaster,
                attributes: ['companyName'],
              },
              {
                model: AuthorizationCriteriaMaster,
                attributes: ['AuthorizationCriteria'],
              },
              {
                separate: true,
                model: LeaveAuthorizationRequest,
                attributes: ['authstatus', 'userMasterID'],
                include: [
                  {
                    as: 'authorizedPerson',
                    model: UserMaster,
                    attributes: ['displayName'],
                  },
                ],
              },
              {
                model: UserMaster,
                where: userCondition,
                attributes: [
                  'displayName',
                  'userNumber',
                  'userMasterID',
                  'photo',
                ],
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

                  {
                    separate: true,
                    model: AuthorizationDetails,
                    where: {
                      status: 1,
                      AuthorizationMasterID: authorizationMasterTypes.leave, // fot Leave
                    },
                    attributes: ['AuthorizationCriteriaID'],
                    include: [
                      {
                        model: AuthorizationCriteriaMaster,
                        attributes: ['AuthorizationCriteria'],
                      },
                    ],
                  },
                  {
                    model: companyMaster,
                    attributes: ['companyName'],
                  },
                ],
              },
              {
                required: true,
                model: HrLeaveTypes,
                where: {
                  LeaveID: {
                    [Sequelize.Op.ne]: 25,
                  },
                },
                attributes: ['LeaveID'],
                include: [
                  {
                    model: HrLeaveMaster,
                    as: 'LeaveMaster',
                    attributes: ['LeaveName'],
                  },
                ],
              },
              {
                separate: true,
                required: false,
                model: userleavetransaction,
                include: [
                  {
                    model: HrLeaveTypes,
                    attributes: [],
                    include: [
                      {
                        model: HrLeaveMaster,
                        as: 'LeaveMaster',
                        attributes: [],
                      },
                    ],
                  },
                ],
                order: [['date', 'ASC']],
                attributes: [
                  'days',
                  'date',
                  'status',
                  [
                    Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'),
                    'LeaveName',
                  ],
                ],
              },
              {
                separate: true,
                required: false,
                model: ApprovedLeaveAuthorization,
                include: [
                  {
                    model: HrLeaveTypes,
                    attributes: [],
                    include: [
                      {
                        model: HrLeaveMaster,
                        as: 'LeaveMaster',
                        attributes: [],
                      },
                    ],
                  },
                  {
                    required: false,
                    model: UserMaster,
                    as: 'createdByUserDetails',
                    attributes: userAttributes,
                  },
                  {
                    required: false,
                    model: UserMaster,
                    as: 'updatedByUserDetails',
                    attributes: userAttributes,
                  },
                ],
                order: [['date', 'ASC']],
                attributes: [
                  'days',
                  'date',
                  'status',
                  [
                    Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'),
                    'LeaveName',
                  ],
                ],
              },
              {
                required: false,
                model: UserMaster,
                as: 'createdByUserDetails',
                attributes: userAttributes,
              },
              {
                required: false,
                model: UserMaster,
                as: 'updatedByUserDetails',
                attributes: userAttributes,
              },
              {
                required: false,
                model: UserMaster,
                as: 'authorizer',
                attributes: ['displayName'],
              },
            ],
          },
        ],
      });
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
        { header: 'Leave Days', key: 'leaveDays', width: 20 }, // 11
        { header: 'Applied Leave', key: 'appliedLeave', width: 15 }, // 12
        { header: 'Leave Reason', key: 'remarks', width: 25 }, // 14
        { header: 'Status', key: 'authStatus', width: 15 }, // 13
        { header: 'Auth Criteria', key: 'authCriteria', width: 25 }, // 15
        { header: 'Authorizer', key: 'authorizer', width: 25 }, // 16 ← per-row
        { header: 'Authorizer Status', key: 'authorizerStatus', width: 18 }, // 17 ← per-row
        { header: 'Applied On', key: 'createdAt', width: 18 }, // 18
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

      for (const request of authRequest) {
        const leaveRequest = request.userLeave || {};
        const userData = leaveRequest.userMaster || {};

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

        // ── Leave fields ────────────────────────────────

        const appliedLeave = leaveRequest?.hrLeaveType?.LeaveMaster?.LeaveName;
        const leaveDays = leaveRequest?.LeaveDays;
        const dayType = leaveRequest?.DayType;
        const toDate = leaveRequest?.ToDate
          ? moment(leaveRequest?.ToDate).format('DD-MM-YYYY')
          : '';
        const fromDate = leaveRequest?.FromDate
          ? moment(leaveRequest?.FromDate).format('DD-MM-YYYY')
          : '';

        const authStatus =
          leaveRequest.authorizationStatus == 4
            ? 'Rejected'
            : leaveRequest.authorizationStatus == 3
              ? 'Approved'
              : 'Pending';

        const remarks = leaveRequest.Remark;
        // ── Auth criteria ────────────────────────────────────────────────
        // Sourced from nested AuthorizationDetails → AuthorizationCriteriaMaster
        const authCriteria =
          leaveRequest?.AuthorizationCriteriaMaster?.AuthorizationCriteria ||
          '';

        const authorizers = (leaveRequest.leaveAuthorizations || []).map(
          (auth) => ({
            name: auth.authorizedPerson?.displayName || '',
            status:
              auth.authstatus == 0
                ? 'Rejected'
                : auth.authstatus == 1
                  ? 'Approved'
                  : auth.authstatus == 2
                    ? 'Pending'
                    : '',
          }),
        );

        const rowCount = Math.max(authorizers.length, 1);

        // ── Common fields (shared across all merged rows) ────────────────
        const commonFields = {
          companyName,
          employeeCode: empCode,
          employeeName: userData.displayName || '',
          branchName,
          departmentName,
          designationName,
          divisionName,
          workingAreaName,
          dayType,
          fromDate,
          toDate,
          appliedLeave,
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
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19,
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
    return res.status(200).json({
      status: 200,
      data: authRequest,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.listOutdoorDutyAuthRequest = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      startdate,
      enddate,
      user,
      status,
      companyMasterID,
      isExport = false,
    } = req.body;
    const authUserMasterID = req.userDetails.userMasterId;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginateCondition =
      page && limit && !isExport ? { offset: (page - 1) * limit, limit } : {};

    const condition = {
      status: 1,
      userMasterID: authUserMasterID,
      '$userLeave.status$': 1,
    };

    if (status !== null && status !== undefined) {
      condition.authstatus = status;
      if (+status === 2) {
        condition['$userLeave.authorizationStatus$'] = {
          [Sequelize.Op.notIn]: [3, 4],
        };
      }
    }
    if (status == null && status == undefined) {
      condition['$userLeave.userMasterID$'] = {
        [Sequelize.Op.in]: user,
      };
    }
    if (user && user.length) {
      condition['$userLeave.userMasterID$'] = {
        [Sequelize.Op.in]: user,
      };
    }
    if (startdate && enddate) {
      condition['$userLeave.FromDate$'] = {
        [Sequelize.Op.between]: [startdate, enddate],
      };
    }
    const userCondition = { status: 1 };
    if (companyMasterID) {
      userCondition.companyMasterId = companyMasterID;
    }
    const { rows: authRequest, count } =
      await LeaveAuthorizationRequest.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginateCondition,
        order: [['createdAt', 'DESC']],
        include: [
          {
            required: true,
            model: UserLeave,
            include: [
              {
                separate: true,
                model: LeaveAuthorizationRequest,
                attributes: ['authstatus', 'userMasterID'],
                include: [
                  {
                    as: 'authorizedPerson',
                    model: UserMaster,
                    attributes: ['displayName'],
                  },
                ],
              },
              {
                model: UserMaster,
                as: 'authorizer',
                attributes: ['displayName'],
              },
              {
                model: UserMaster,
                where: userCondition,
                attributes: [
                  'displayName',
                  'userNumber',
                  'userMasterID',
                  'photo',
                ],
                include: [
                  {
                    model: companyMaster,
                    attributes: ['companyName'],
                  },
                  {
                    separate: true,
                    model: EmployeeJoiningDetails,
                    attributes: ['employeeCode'],
                  },
                  {
                    separate: true,
                    model: AuthorizationDetails,
                    where: {
                      status: 1,
                      AuthorizationMasterID: authorizationMasterTypes.leave, // fot Leave
                    },
                    attributes: ['AuthorizationCriteriaID'],
                    include: [
                      {
                        model: AuthorizationCriteriaMaster,
                        attributes: ['AuthorizationCriteria'],
                      },
                    ],
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
                required: true,
                model: HrLeaveTypes,
                where: { LeaveID: 25, status: 1 },
                // attributes: [],
              },
              {
                separate: true,
                required: false,
                model: userleavetransaction,
                include: [
                  {
                    model: HrLeaveTypes,
                    attributes: [],
                    include: [
                      {
                        model: HrLeaveMaster,
                        as: 'LeaveMaster',
                        attributes: [],
                      },
                    ],
                  },
                ],
                order: [['date', 'ASC']],
                attributes: [
                  'days',
                  'date',
                  'status',
                  [
                    Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'),
                    'LeaveName',
                  ],
                ],
              },
            ],
          },
        ],
      });

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
        { header: 'Outdoor Duty Days', key: 'leaveDays', width: 20 }, // 11
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

      for (const request of authRequest) {
        const leaveRequest = request.userLeave || {};
        const userData = leaveRequest.userMaster || {};

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

        const leaveDays = leaveRequest?.LeaveDays;
        const dayType = leaveRequest?.DayType;
        const toDate = leaveRequest?.ToDate
          ? moment(leaveRequest?.ToDate).format('DD-MM-YYYY')
          : '';
        const fromDate = leaveRequest?.FromDate
          ? moment(leaveRequest?.FromDate).format('DD-MM-YYYY')
          : '';

        const authStatus =
          leaveRequest.authorizationStatus == 4
            ? 'Rejected'
            : leaveRequest.authorizationStatus == 3
              ? 'Approved'
              : 'Pending';

        const remarks = leaveRequest.Remark;
        // ── Auth criteria ────────────────────────────────────────────────
        // Sourced from nested AuthorizationDetails → AuthorizationCriteriaMaster
        const authCriteria =
          (userData.authorizationDetails || [])[0]?.AuthorizationCriteriaMaster
            ?.AuthorizationCriteria || '';

        const authorizers = (leaveRequest.leaveAuthorizations || []).map(
          (auth) => ({
            name: auth.authorizedPerson?.displayName || '',
            status:
              auth.authstatus == 0
                ? 'Rejected'
                : auth.authstatus == 1
                  ? 'Approved'
                  : auth.authstatus == 2
                    ? 'Pending'
                    : '',
          }),
        );

        const rowCount = Math.max(authorizers.length, 1);

        // ── Common fields (shared across all merged rows) ────────────────
        const commonFields = {
          companyName,
          employeeCode: empCode,
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

    return res.status(200).json({
      status: 200,
      data: authRequest,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

function getSalaryMonths(fromDate, toDate, cycleStartDate = 1, type = 'S') {
  const from = new Date(fromDate);
  const to = new Date(toDate);

  if (!type) type = 'S';
  if (!cycleStartDate) cycleStartDate = 1;

  let salaryMonths = [];

  // Calculate the first salary cycle start date based on the fromDate
  let currentCycleStart = new Date(from);
  currentCycleStart.setDate(cycleStartDate);

  if (from.getDate() < cycleStartDate) {
    // If fromDate is before the cycle start date, adjust to the previous month
    currentCycleStart.setMonth(currentCycleStart.getMonth() - 1);
  }

  while (currentCycleStart <= to) {
    // Calculate the start month of the current cycle
    const startYear = currentCycleStart.getFullYear();
    const startMonth = currentCycleStart.getMonth() + 1;
    const startMonthValue = startYear * 100 + startMonth;

    if (type === 'S' && !salaryMonths.includes(startMonthValue)) {
      salaryMonths.push(startMonthValue);
    }

    if (type === 'E') {
      // Calculate the end month of the current cycle
      const cycleEnd = new Date(currentCycleStart);
      cycleEnd.setMonth(cycleEnd.getMonth() + 1); // Move to next month
      cycleEnd.setDate(cycleEnd.getDate() - 1); // Set to the last day of the cycle

      const endYear = cycleEnd.getFullYear();
      const endMonth = cycleEnd.getMonth() + 1;
      const endMonthValue = endYear * 100 + endMonth;

      if (!salaryMonths.includes(endMonthValue)) {
        salaryMonths.push(endMonthValue);
      }
    }

    // Move to the next salary cycle
    currentCycleStart.setMonth(currentCycleStart.getMonth() + 1);
  }

  return salaryMonths.sort((a, b) => a - b);
}

exports.authorizationacceptreject = async (req, res, next) => {
  try {
    let {
      AuthorizationRequestId,
      authstatus,
      leavetransaction = [],
      rejectionRemarks,
      authBy = AuthByEnum.SINGLE,
    } = await req.body;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const Rejected = 0;
    const Accepted = 1;

    const APPROVAL_THRESHOLDS = {
      'Any One': 1,
      'Any Two': 2,
      'Any Three': 3,
    };
    const DEFAULT_APPROVAL_THRESHOLD = 3;

    let authorizedCount = 0;
    const skippedMap = new Map();

    const addSkipped = (name, reason) => {
      const key = `${name}__${reason}`;
      if (skippedMap.has(key)) {
        skippedMap.get(key).count++;
      } else {
        skippedMap.set(key, { name, reason, count: 1 });
      }
    };

    AuthorizationRequestId = !Array.isArray(AuthorizationRequestId)
      ? [AuthorizationRequestId]
      : AuthorizationRequestId;

    const bailOut = async (transaction, name, reason) => {
      await transaction.rollback();
      if (authBy !== AuthByEnum.MULTIPLE) {
        return {
          respond: true,
          payload: { status: statusCodes.BAD_REQUEST, message: reason },
        };
      }
      addSkipped(name, reason);
      return { respond: false };
    };

    const currentDate = moment().format('YYYY-MM-DD');

    const leaveAuthRequest = await LeaveAuthorizationRequest.findAll({
      where: {
        AuthorizationRequestId: {
          [Sequelize.Op.in]: AuthorizationRequestId,
        },
      },
      include: [
        {
          model: UserLeave,
          include: [
            {
              model: HrLeaveTypes,
              attributes: ['LeaveID'],
            },
            {
              model: UserMaster,
              attributes: [
                'userMasterID',
                'displayName',
                'userNumber',
                'companyMasterId',
              ],
              include: [
                {
                  model: EmployeeJoiningDetails,
                  as: 'emp_join',
                  attributes: ['payrollFrequency'],
                },
                {
                  required: false,
                  separate: true,
                  model: empLeavePolicy,
                  where: {
                    status: 1,
                    applicableDate: {
                      [Sequelize.Op.lte]: new Date(currentDate),
                    },
                    [Sequelize.Op.or]: [
                      {
                        endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
                      },
                      { endDate: null },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    // Find Authorization Master
    const authorizationmaster = await AuthorizationMaster.findOne({
      where: { authorizationMasterName: 'Leave' },
    });

    if (!authorizationmaster) {
      return res.status(200).json({
        status: 401,
        message: `Leave Authorization master is not found!`,
      });
    }

    const userMasterIdSet = new Set();
    const referenceIdSet = new Set();

    for (const e of leaveAuthRequest) {
      if (e.userLeave?.userMasterID != null) {
        userMasterIdSet.add(+e.userLeave.userMasterID);
      }
      if (e.ReferenceID != null) {
        referenceIdSet.add(+e.ReferenceID);
      }
    }

    const userMasterIds = [...userMasterIdSet];
    const allReferenceIds = [...referenceIdSet];

    const AllLeaveAuthorizationRequest =
      await LeaveAuthorizationRequest.findAll({
        raw: true,
        attributes: [
          'AuthorizationRequestId',
          'ReferenceID',
          'userMasterID',
          'authstatus',
        ],
        where: {
          ReferenceID: allReferenceIds,
        },
      });

    const leaveAuthorizationRequestMapByReferenceID = new Map();
    for (const data of AllLeaveAuthorizationRequest) {
      const key = +data.ReferenceID;
      if (!leaveAuthorizationRequestMapByReferenceID.has(key)) {
        leaveAuthorizationRequestMapByReferenceID.set(key, []);
      }
      leaveAuthorizationRequestMapByReferenceID.get(key)?.push(data);
    }

    // Find User Authorization Details
    const Allauthorizationdetails = await AuthorizationDetails.findAll({
      attributes: [
        'userMasterID',
        'AuthorizationCriteriaID',
        'AuthorizedByUserMasterId',
      ],
      where: {
        AuthorizationMasterID: authorizationmaster.authorizationMasterID,
        userMasterID: {
          [Sequelize.Op.in]: userMasterIds,
        },
        status: 1,
      },
      raw: true,
    });

    const authorizationDetailsMapUserWise = new Map();
    for (const data of Allauthorizationdetails) {
      authorizationDetailsMapUserWise.set(+data.userMasterID, data);
    }

    const AllauthorizationCriterias = await AuthorizationCriteria.findAll({
      where: { status: 1 },
      raw: true,
    });

    for (const authRequest of leaveAuthRequest) {
      const transaction = await sequelize.transaction();
      try {
        if (authRequest.authstatus != 2) {
          const outcome = await bailOut(
            transaction,
            'Approved/Rejected',
            'Authorization Request already Approved/Rejected',
          );
          if (outcome.respond) {
            return res.status(statusCodes.OK).json(outcome.payload);
          }
          continue;
        }

        const userLeave = authRequest.userLeave || null;
        if (!userLeave) {
          const outcome = await bailOut(
            transaction,
            'Not found',
            'Leave request not found',
          );
          if (outcome.respond) {
            return res.status(statusCodes.OK).json(outcome.payload);
          }
          continue;
        }

        const userData = userLeave.userMaster || null;
        if (!userData) {
          const outcome = await bailOut(
            transaction,
            'Not found',
            'User not found',
          );
          if (outcome.respond) {
            return res.status(statusCodes.OK).json(outcome.payload);
          }
          continue;
        }

        if (
          [
            AuthorizationStatusType.APPROVED,
            AuthorizationStatusType.REJECTED,
          ].includes(+userLeave.authorizationStatus)
        ) {
          const reason = `Leave Request (${userLeave.FromDate} - ${userLeave.ToDate}) already ${
            userLeave.authorizationStatus == AuthorizationStatusType.APPROVED
              ? 'Approved'
              : 'Rejected'
          }.`;
          const outcome = await bailOut(
            transaction,
            userData.displayName || 'Unknown User',
            reason,
          );
          if (outcome.respond) {
            return res.status(statusCodes.OK).json(outcome.payload);
          }
          continue;
        }

        let coffAvailableBalance = [];
        let allUsedCoffTrans = [];
        let userleaveTrans = leavetransaction || [];
        let leavesequence = true;
        let pendingUser = [];
        let acceptedUser = [];
        let finalApproved = false;

        // ---- Accepted-path validation (balances, attendance lock, clubbing) ----
        if (authstatus == Accepted) {
          if (authBy == AuthByEnum.MULTIPLE || leavetransaction?.length == 0) {
            userleaveTrans = getAllSingleDayLeave(
              [userLeave],
              createBy,
              createByIp,
            ).map((e) => ({
              ...e,
              leaveID: userLeave.hrLeaveType?.LeaveID,
              userMasterID: userLeave.userMasterID,
            }));
          } else {
            userleaveTrans = userleaveTrans.map((e) => ({
              ...e,
              createBy,
              createByIp,
            }));
          }

          const sortedTransaction = [...userleaveTrans].sort(
            (a, b) => new Date(a.date) - new Date(b.date),
          );

          const leavePolicyIds =
            userData?.empLeavePolicies?.[0]?.employeeLeavePolicyID || [];

          const approveMessage = await checkApproveLeaveRequest(
            leavePolicyIds,
            sortedTransaction,
            userData?.companyMasterId,
            userData?.userMasterID,
          );

          if (approveMessage) {
            const outcome = await bailOut(
              transaction,
              userData.displayName,
              approveMessage,
            );
            if (outcome.respond) {
              return res.status(statusCodes.OK).json(outcome.payload);
            }
            continue;
          }

          const payrollFrequency =
            userData.emp_join?.[0]?.payrollFrequency ||
            PayrollFrequencyType.MONTHLY;
          const allDates = sortedTransaction.map((e) => e.date);

          const attendanceCal = await HrLeaveMonthTrans.count({
            where: {
              userMasterID: userData.userMasterID,
              [Sequelize.Op.or]: allDates.map((e) => ({
                monthstartdate: { [Sequelize.Op.lte]: e },
                monthenddate: { [Sequelize.Op.gte]: e },
              })),
              payrollFrequency,
              verified: 1,
            },
          });

          if (attendanceCal > 0) {
            const outcome = await bailOut(
              transaction,
              userData.displayName,
              'Attendance already verified.',
            );
            if (outcome.respond) {
              return res.status(statusCodes.OK).json(outcome.payload);
            }
            continue;
          }

          const userCompany = userData.companyMasterId;
          const leavePolicy = await getemployeeLeavePolicy(
            userLeave.userMasterID,
            currentDate,
          );

          let isbackDatedCoffAllowed = true;
          const coffLeavePolicy = leavePolicy.find((e) => e.leaveId == 6);
          if (coffLeavePolicy) {
            isbackDatedCoffAllowed = coffLeavePolicy.allowCoffBackdate;
          }

          const userleaveBalance = await employeeeLeaveBalance(
            userCompany,
            userData.userMasterID,
          );

          const totals = {};
          for (const item of userleaveTrans) {
            if (+item.days > 0) {
              totals[item.LeaveTranId] =
                (totals[item.LeaveTranId] || 0) + +item.days;
            }
            if (+item?.days1 > 0) {
              totals[item.LeaveTranId1] =
                (totals[item.LeaveTranId1] || 0) + +item.days1;
            }
          }

          const formattedData = Object.entries(totals).map(
            ([LeaveTranId, totalDays]) => ({
              LeaveTranId: +LeaveTranId,
              totalDays,
            }),
          );

          const notSufficientbalance = [];
          let coffTempAvailableBalance = [];
          let notSufficientCoffBalance = false;

          for (const data of formattedData) {
            const balanceData = userleaveBalance.find(
              (e) => e.LeaveTranId == data.LeaveTranId,
            );
            if (!balanceData) continue;

            if (balanceData.LeaveID == 6) {
              for (const trans of sortedTransaction) {
                let leaveDays = 0;
                if (
                  trans.days > 0 &&
                  trans.LeaveTranId == balanceData.LeaveTranId
                )
                  leaveDays += +trans.days;
                if (
                  trans.days1 > 0 &&
                  trans.LeaveTranId1 == balanceData.LeaveTranId
                )
                  leaveDays += +trans.days1;
                if (leaveDays == 0) continue;

                const {
                  allBalanceData: allBalanceDataTemp,
                  remaining,
                  usedTransactionLog,
                  isBackDatedCoffReason,
                } = await checkCoffBalanceProcess(
                  coffTempAvailableBalance,
                  trans.userMasterID,
                  trans.date,
                  leaveDays,
                  isbackDatedCoffAllowed,
                );

                if (remaining > 0 && isBackDatedCoffReason) {
                  notSufficientCoffBalance = true;
                  break;
                }

                allUsedCoffTrans = [...allUsedCoffTrans, ...usedTransactionLog];
                coffTempAvailableBalance = [...allBalanceDataTemp];

                const filteredData = coffAvailableBalance.filter(
                  (e) =>
                    !coffTempAvailableBalance
                      .map((c) => +c.LeaveBalTranId)
                      .includes(+e.LeaveBalTranId),
                );
                coffAvailableBalance = [
                  ...filteredData,
                  ...coffTempAvailableBalance,
                ];

                if (remaining > 0) {
                  notSufficientbalance.push(balanceData.leaveName);
                  break;
                }
              }
            } else {
              const balance = balanceData.Balance || 0;
              if (+balance < +data.totalDays) {
                notSufficientbalance.push(balanceData.leaveName);
                break;
              }
            }
          }

          if (notSufficientCoffBalance) {
            const reason = `You do not have sufficient COFF balance for the selected date (${userLeave.FromDate} - ${userLeave.ToDate}).`;
            const outcome = await bailOut(
              transaction,
              userData.displayName,
              reason,
            );
            if (outcome.respond) {
              return res.status(statusCodes.OK).json(outcome.payload);
            }
            continue;
          }

          if (notSufficientbalance.length > 0) {
            const reason = `You don't have sufficient leave balance of ${notSufficientbalance[0]}.`;
            const outcome = await bailOut(
              transaction,
              userData.displayName,
              reason,
            );
            if (outcome.respond) {
              return res.status(statusCodes.OK).json(outcome.payload);
            }
            continue;
          }

          const leaveTranData = [];
          const leaveTranData1 = [];
          for (const item of userleaveTrans) {
            leaveTranData.push({
              ...item,
              LeaveTranId: item.LeaveTranId,
              days: item.days,
            });
            if (item.days1 > 0) {
              leaveTranData1.push({
                ...item,
                LeaveTranId: item.LeaveTranId1,
                days: item.days1,
                leaveID: item.leaveID1,
              });
            }
          }

          const isNotClubbingAllowed = await allowClubbedLeave(
            leavePolicy,
            [...leaveTranData, ...leaveTranData1],
            false,
          );
          if (isNotClubbingAllowed) {
            const outcome = await bailOut(
              transaction,
              userData.displayName,
              isNotClubbingAllowed,
            );
            if (outcome.respond) {
              return res.status(statusCodes.OK).json(outcome.payload);
            }
            continue;
          }
        }

        const authRequestId = +authRequest.AuthorizationRequestId;
        const referenceId = +authRequest.ReferenceID;
        const userMasterID = +userData.userMasterID;

        // Update Authorization Request
        await LeaveAuthorizationRequest.update(
          {
            viewstatus: 0,
            authstatus: authstatus,
            updateBy: createBy,
            rejectionRemarks: rejectionRemarks ? rejectionRemarks : null,
          },
          { where: { AuthorizationRequestId: authRequestId }, transaction },
        );

        const userLeaveAuthRequest =
          leaveAuthorizationRequestMapByReferenceID?.get(referenceId) || [];
        const userAllLeaveAuthRequestIds = userLeaveAuthRequest.map(
          (e) => e.AuthorizationRequestId,
        );

        const authorizationDetails =
          authorizationDetailsMapUserWise?.get(userMasterID) || null;
        if (!authorizationDetails) {
          const outcome = await bailOut(
            transaction,
            'Not found',
            'Authorization details not found.',
          );
          if (outcome.respond) {
            return res.status(statusCodes.OK).json(outcome.payload);
          }
          continue;
        }

        const authCriteria = AllauthorizationCriterias.find(
          (e) =>
            e.AuthorizationCriteriaID ==
            authorizationDetails.AuthorizationCriteriaID,
        );

        const authCriteriaName = authCriteria?.AuthorizationCriteria;
        const isSequenceCriteria = authCriteriaName === 'Sequeance No';

        if (authstatus == Rejected || isSequenceCriteria) {
          await UserInbox.destroy(
            {
              where: {
                activityTable: LeaveAuthorizationRequest.getTableName(),
                activityTablePK: userAllLeaveAuthRequestIds,
              },
            },
            { transaction },
          );

          if (authstatus == Rejected) {
            acceptedUser.push(+createBy);

            await UserLeave.update(
              {
                authorizationStatus: 4,
                updateBy: createBy,
                updateByIp: createByIp,
                authorizedBy: createBy,
                authorizedAt: new Date(),
                isAuthorizedBy: false,
              },
              {
                where: { UserLeaveApplicationID: referenceId, status: 1 },
                transaction,
              },
            );
          }
        }

        if (authstatus == Accepted) {
          if (isSequenceCriteria) {
            const authUserIds = (userLeaveAuthRequest || []).map(
              (e) => +e.userMasterID,
            );
            const AuthorizedByUserMasterId =
              authorizationDetails.AuthorizedByUserMasterId || [];
            const remainingid = AuthorizedByUserMasterId.filter(
              (d) => !authUserIds.includes(+d),
            );

            if (remainingid.length) {
              leavesequence = false;
              pendingUser = remainingid;

              const insert_db_status1 = await LeaveAuthorizationRequest.create(
                {
                  TableName: UserLeave.getTableName(),
                  ReferenceID: referenceId,
                  userMasterID: remainingid[0],
                  status: 1,
                  authstatus: 2,
                  createBy: createBy,
                },
                { transaction },
              );

              const nextAuthorizationRequestId =
                insert_db_status1.toJSON().AuthorizationRequestId;

              await UserInbox.create(
                {
                  activityTable: LeaveAuthorizationRequest.getTableName(),
                  activityTablePK: nextAuthorizationRequestId,
                  message: `${userData.displayName} has applied for leave request from ${moment(
                    userLeave.FromDate,
                  ).format(
                    'DD/MM/YYYY',
                  )} to ${moment(userLeave.ToDate).format('DD/MM/YYYY')}`,
                  assignedTo: remainingid[0],
                  assignedBy: userData.userMasterID,
                },
                { transaction },
              );

              const notification = {
                title: 'Leave',
                body: userData.displayName + ' requested for leave.',
              };
              const notifData = {
                screen: 'leaveauth',
                isScheduled: 'true',
                scheduledTime: new Date().toISOString(),
              };
              await sendNotification(remainingid[0], notification, notifData);
              await sendMailForLeave(
                userLeave,
                nextAuthorizationRequestId,
                remainingid[0],
              );
            } else {
              finalApproved = true;
              acceptedUser = AuthorizedByUserMasterId;
            }

            await finalLeaveApprove({
              ReferenceID: referenceId,
              userleaveTrans,
              authRequestId,
              finalApproved,
              createBy,
              createByIp,
              req,
              transaction,
            });
          } else {
            let deleteAuthRequestIds = authRequestId;

            const approvedData = (userLeaveAuthRequest || []).filter(
              (e) => e.authstatus == 1,
            );
            const approvedCount = approvedData.length;
            const threshold =
              APPROVAL_THRESHOLDS[authCriteriaName] ??
              DEFAULT_APPROVAL_THRESHOLD;

            if (approvedCount + 1 >= threshold) {
              finalApproved = true;
              acceptedUser = [
                ...new Set([
                  ...approvedData.map((e) => e.userMasterID),
                  +createBy,
                ]),
              ];
              deleteAuthRequestIds = userAllLeaveAuthRequestIds;
            }

            await UserInbox.destroy(
              {
                where: {
                  activityTable: LeaveAuthorizationRequest.getTableName(),
                  activityTablePK: deleteAuthRequestIds,
                },
              },
              { transaction },
            );

            await finalLeaveApprove({
              ReferenceID: referenceId,
              userleaveTrans,
              authRequestId,
              finalApproved,
              createBy,
              createByIp,
              req,
              transaction,
            });
          }

          if (finalApproved) {
            if (coffAvailableBalance.length > 0) {
              await Promise.all(
                coffAvailableBalance.map((data) =>
                  HrLeaveBalance.update(
                    { availBal: data.availBal },
                    {
                      where: { LeaveBalTranId: data.LeaveBalTranId },
                      transaction,
                    },
                  ),
                ),
              );
            }

            if (allUsedCoffTrans.length) {
              await UsedCoffTransaction.bulkCreate(allUsedCoffTrans, {
                user: req.userDetails,
                individualHooks: true,
                transaction,
              });
            }

            const notification = {
              title: 'Leave',
              body: 'Leave accepted successfully',
            };
            const notifData = { screen: 'leave' };
            sendNotification(userLeave.userMasterID, notification, notifData);

            if (userLeave) {
              const mailData = {
                NoOfDays: userLeave.LeaveDays,
                FromDate: userLeave.FromDate,
                ToDate: userLeave.ToDate,
                LeaveType: userleaveTrans.map((e) => e.LeaveTranId),
                acceptedUserList: acceptedUser,
              };
              sendAcceptRejectMail(
                'Leave Accept Email Template',
                mailData,
                userLeave.userMasterID,
              );
            }
          }
        } else {
          const notification = {
            title: 'Leave',
            body: 'Leave rejected successfully',
          };
          const notifData = { screen: 'leave' };
          sendNotification(userLeave.userMasterID, notification, notifData);

          if (userLeave) {
            const mailData = {
              NoOfDays: userLeave.LeaveDays,
              FromDate: userLeave.FromDate,
              ToDate: userLeave.ToDate,
              LeaveType: [],
              rejectedUserList: acceptedUser,
              RejectedReason: '',
            };
            mailData.LeaveType.push(userLeave.LeaveTranId);
            sendAcceptRejectMail(
              'Leave Reject Email Template',
              mailData,
              userLeave.userMasterID,
            );
          }
        }

        await transaction.commit();
        authorizedCount++;
      } catch (error) {
        await transaction.rollback();
        throw new Error(
          'Error in leave authorization request: ' +
            (error.stack || error.message),
        );
      }
    }

    const skippedList = Array.from(skippedMap.values());

    return res.status(statusCodes.OK).json({
      status: skippedList.length ? statusCodes.BAD_REQUEST : statusCodes.OK,
      message:
        skippedList.length === 0
          ? authstatus == Accepted
            ? message.usermessage.acceptMesaage('Leave Authorization Request')
            : message.usermessage.rejectMessage('Leave Authorization Request')
          : null,
      skippedUser: skippedList.length ? skippedList : null,
      authorizedCount,
      skippedCount: AuthorizationRequestId.length - authorizedCount,
      totalRequests: AuthorizationRequestId.length,
    });
  } catch (err) {
    next(err);
  }
};

async function sendMailForLeave(leavedata, AuthorizationRequestId, id) {
  try {
    let user = await UserMaster.findOne({
      raw: true,
      where: {
        userMasterID: id,
        status: 1,
      },
    });
    let get_MailTemplate;
    let get_NotificationPolicy = await findCompanyNotificationPolicy(
      +leavedata.companyMasterID,
    );

    if (get_NotificationPolicy) {
      get_MailTemplate = await MailTemplateEditor.findOne({
        raw: true,
        where: {
          companyMasterID: leavedata.companyMasterID,
          status: 1,
          mailTypeID: 1,
        },
      });

      if (get_MailTemplate) {
        let leavetype = '',
          empcode = '',
          empname = '',
          department = '',
          designation = '',
          branch = '';

        let emp_name = await UserMaster.findOne({
          raw: true,
          where: {
            userMasterID: leavedata.userMasterID,
            status: 1,
          },
          attributes: ['displayName'],
        });
        empname = emp_name ? emp_name.displayName : '';

        let emp_code = await EmployeeJoiningDetails.findOne({
          raw: true,
          where: {
            userMasterID: leavedata.userMasterID,
            status: 1,
          },
          attributes: ['employeeCode'],
        });
        empcode = emp_code ? emp_code.employeeCode : '';

        let leave_type = await HrLeaveTypes.findOne({
          raw: true,
          where: {
            LeaveTranId: leavedata.LeaveTranId,
            status: 1,
          },
          attributes: ['LeaveID'],
          include: [
            {
              model: HrLeaveMaster,
              as: 'LeaveMaster',
              attributes: ['LeaveName'],
            },
          ],
        });
        leavetype = leave_type ? leave_type['LeaveMaster.LeaveName'] : '';

        let emp_branch = await EmployeeBranch.findOne({
          raw: true,
          where: {
            userMasterID: leavedata.userMasterID,
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(),
            },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date() },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
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
        });
        branch = emp_branch ? emp_branch['branchMaster.branchName'] : '';

        let emp_department = await EmployeeDepartment.findOne({
          raw: true,
          where: {
            userMasterID: leavedata.userMasterID,
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(),
            },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date() },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
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
        });
        department = emp_department
          ? emp_department['department.departmentName']
          : '';

        let emp_designation = await EmployeeDesignation.findOne({
          raw: true,
          where: {
            userMasterID: leavedata.userMasterID,
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(),
            },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date() },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
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
        });
        designation = emp_designation
          ? emp_designation['designation.designationName']
          : '';

        get_MailTemplate.subject = get_MailTemplate.subject.replace(
          '[EmployeeCode]',
          empcode,
        );
        get_MailTemplate.subject = get_MailTemplate.subject.replace(
          '[EmployeeName]',
          empname,
        );
        get_MailTemplate.subject = get_MailTemplate.subject.replace(
          '[ToDate]',
          leavedata.ToDate,
        );
        get_MailTemplate.subject = get_MailTemplate.subject.replace(
          '[FromDate]',
          leavedata.FromDate,
        );
        get_MailTemplate.subject = get_MailTemplate.subject.replace(
          '[Reason]',
          leavedata.Remark,
        );
        get_MailTemplate.subject = get_MailTemplate.subject.replace(
          '[NoOfDays]',
          leavedata.LeaveDays,
        );
        get_MailTemplate.subject = get_MailTemplate.subject.replace(
          '[Department]',
          department,
        );
        get_MailTemplate.subject = get_MailTemplate.subject.replace(
          '[Designation]',
          designation,
        );
        get_MailTemplate.subject = get_MailTemplate.subject.replace(
          '[Branch]',
          branch,
        );
        get_MailTemplate.subject = get_MailTemplate.subject.replace(
          '[LeaveType]',
          leavetype,
        );

        get_MailTemplate.body = get_MailTemplate.body.replace(
          '[EmployeeCode]',
          empcode,
        );
        get_MailTemplate.body = get_MailTemplate.body.replace(
          '[EmployeeName]',
          empname,
        );
        get_MailTemplate.body = get_MailTemplate.body.replace(
          '[ToDate]',
          leavedata.ToDate,
        );
        get_MailTemplate.body = get_MailTemplate.body.replace(
          '[FromDate]',
          leavedata.FromDate,
        );
        get_MailTemplate.body = get_MailTemplate.body.replace(
          '[Reason]',
          leavedata.Remark,
        );
        get_MailTemplate.body = get_MailTemplate.body.replace(
          '[NoOfDays]',
          leavedata.LeaveDays,
        );
        get_MailTemplate.body = get_MailTemplate.body.replace(
          '[Department]',
          department,
        );
        get_MailTemplate.body = get_MailTemplate.body.replace(
          '[Designation]',
          designation,
        );
        get_MailTemplate.body = get_MailTemplate.body.replace(
          '[Branch]',
          branch,
        );
        get_MailTemplate.body = get_MailTemplate.body.replace(
          '[LeaveType]',
          leavetype,
        );

        const myTemplate = JSON.parse(JSON.stringify(get_MailTemplate));
        const acceptData = {
          AuthorizationRequestId,
          type: 'approve',
          userMasterID: id,
          companyMasterID: user?.companyMasterId,
        };
        const rejectData = {
          AuthorizationRequestId,
          type: 'reject',
          userMasterID: id,
          companyMasterID: user?.companyMasterId,
        };
        const acceptedSigned = encodeSecureBreak(acceptData);
        const acceptUrl = `${appURL}#/app/attendances/leave_auth_request/2?data=${acceptedSigned}`;
        const rejectedSigned = encodeSecureBreak(rejectData);
        const rejectUrl = `${appURL}#/app/attendances/leave_auth_request/2?data=${rejectedSigned}`;

        myTemplate.body = myTemplate.body.replace(
          `[ApproveButton]`,
          `<a href="${acceptUrl}" rel="noopener noreferrer" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Approve</a>`,
        );

        myTemplate.body = myTemplate.body.replace(
          `[RejectButton]`,
          `<a href="${rejectUrl}" rel="noopener noreferrer" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #f44336; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Reject</a>`,
        );

        let mailData = {
          email_id: user.email,
          body: myTemplate.body,
          subject: myTemplate.subject,
          email: get_NotificationPolicy.email,
          password: get_NotificationPolicy.password,
          port: get_NotificationPolicy.port,
          host: get_NotificationPolicy.hostmail,
          secure: get_NotificationPolicy.secure,
        };

        sendEmailForLeave(mailData);
      }
    }
  } catch (error) {
    console.error(error);
    return;
  }
}

exports.acceptRejectOutdoorDuty = async (req, res, next) => {
  try {
    const { AuthorizationRequestId, authstatus, rejectionRemarks } = req.body;
    let authorizedCount = 0;

    const authRequestIdList = [
      ...new Set(
        (Array.isArray(AuthorizationRequestId)
          ? AuthorizationRequestId
          : [AuthorizationRequestId]
        ).filter(Boolean),
      ),
    ];

    if (!authRequestIdList.length) {
      return res
        .status(200)
        .json({ status: 401, message: 'Authorization request not found' });
    }

    const Op = Sequelize.Op;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    // all map keys go through k() so get/set types always match
    const k = (v) => String(v);

    // ---------------- PRE-FETCH (outside loop) ----------------

    const authRequestList = await LeaveAuthorizationRequest.findAll({
      where: { AuthorizationRequestId: authRequestIdList },
      include: [{ required: true, model: UserLeave }],
    });

    if (!authRequestList.length) {
      return res
        .status(200)
        .json({ status: 401, message: 'Authorization request not found' });
    }

    const referenceIds = [
      ...new Set(authRequestList.map((a) => a.ReferenceID)),
    ];
    const applicantIds = [
      ...new Set(authRequestList.map((a) => a.userLeave.userMasterID)),
    ];
    const globalStart = new Date(
      Math.min(...authRequestList.map((a) => new Date(a.userLeave.FromDate))),
    );
    const globalEnd = new Date(
      Math.max(...authRequestList.map((a) => new Date(a.userLeave.ToDate))),
    );

    // policies overlapping the whole batch range; the right one is picked per request in the loop
    const effectiveWhere = (startKey) => ({
      status: 1,
      [startKey]: { [Op.lte]: globalEnd },
      [Op.or]: [
        { endDate: { [Op.gte]: globalStart } },
        { endDate: { [Op.eq]: null } },
      ],
    });

    const userIncludes = [
      { model: EmployeeJoiningDetails, attributes: ['payrollFrequency'] },
    ];

    if (authstatus != 0) {
      userIncludes.push(
        // attendance
        {
          required: false,
          model: attendanceTransaction,
          where: { AttendanceDate: { [Op.between]: [globalStart, globalEnd] } },
        },
        // shift roster
        {
          required: false,
          model: ShiftRoster,
          where: {
            status: 1,
            shiftRosterDate: { [Op.between]: [globalStart, globalEnd] },
          },
        },
        // attendance policy
        {
          required: false,
          separate: true,
          model: EmployeeAttendancePolicy,
          where: effectiveWhere('startDate'),
          attributes: ['attendancePolicyID', 'startDate', 'endDate'],
          include: [{ model: AttendancePolicy, as: 'attendancePolicy' }],
        },
        // employeeshift
        {
          required: false,
          model: EmployeeShift,
          where: effectiveWhere('startDate'),
        },
        // salary Policy
        {
          required: false,
          model: EmployeeSalaryPolicy,
          as: 'empSalPolicy',
          where: effectiveWhere('startDate'),
          attributes: ['salaryPolicyID', 'startDate', 'endDate'],
          include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
        },
        // holiday policy
        {
          model: employeeHolidayPolicy,
          required: false,
          where: effectiveWhere('applicableDate'),
          attributes: ['holidayPolicyID', 'applicableDate', 'endDate'],
          include: [
            {
              model: holidayPolicy,
              as: 'HolidayPolicy',
              attributes: ['holidayPolicyID'],
              required: false,
              include: [
                {
                  model: HolidayCompensationRule,
                  separate: true,
                  required: false,
                },
              ],
            },
          ],
        },
      );
    }

    const [
      allAuthDataList,
      authorizationDetailsList,
      userInfoList,
      verifiedMonthList,
    ] = await Promise.all([
      LeaveAuthorizationRequest.findAll({
        where: { ReferenceID: referenceIds },
        include: [{ model: UserLeave }],
      }),

      AuthorizationDetails.findAll({
        where: {
          AuthorizationMasterID: authorizationMasterTypes.leave, // Leave Id
          userMasterID: applicantIds,
          status: 1,
        },
      }),

      UserMaster.findAll({
        where: { userMasterID: applicantIds },
        include: userIncludes,
      }),

      authstatus != 0
        ? HrLeaveMonthTrans.findAll({
            where: {
              userMasterID: applicantIds,
              verified: 1,
              monthstartdate: { [Op.lte]: globalEnd },
              monthenddate: { [Op.gte]: globalStart },
            },
            raw: true,
          })
        : [],
    ]);

    const authorizationCriteriaList = await AuthorizationCriteria.findAll({
      where: {
        AuthorizationCriteriaID: [
          ...new Set(
            authorizationDetailsList.map((d) => d.AuthorizationCriteriaID),
          ),
        ],
        status: 1,
      },
    });

    // ---- hashmaps ----
    const userInfoMap = new Map(
      userInfoList.map((u) => [k(u.userMasterID), u]),
    );

    const authorizationDetailsMap = new Map(
      authorizationDetailsList.map((d) => [k(d.userMasterID), d]),
    );

    const authorizationCriteriaMap = new Map(
      authorizationCriteriaList.map((c) => [k(c.AuthorizationCriteriaID), c]),
    );

    const allAuthDataMap = new Map(); // ReferenceID -> [auth rows]
    for (const a of allAuthDataList) {
      const key = k(a.ReferenceID);
      const list = allAuthDataMap.get(key) || [];
      list.push(a);
      allAuthDataMap.set(key, list);
    }

    let shiftMap = new Map();
    let allODDataList = [];

    if (authstatus != 0) {
      const allShiftIds = [
        ...new Set(
          userInfoList.flatMap((u) => {
            const empShift = u.employeeShifts?.[0] || null;
            const empShiftIds = empShift
              ? empShift.shiftID
                ? [empShift.shiftID]
                : empShift.shiftsID || []
              : [];
            return [
              ...(u.attendanceTransactions || []).map((e) => e.Shift),
              ...(u.shiftRosters || []).map((e) => e.shiftID),
              ...empShiftIds,
            ];
          }),
        ),
      ].filter(Boolean);

      const [allShiftData, existingODData] = await Promise.all([
        Shift.findAll({
          where: { shiftID: { [Op.in]: allShiftIds } },
          attributes: ['shiftID', 'shiftGrace'],
          include: [{ model: ShiftTIme }],
        }),

        UserLeaveTransaction.findAll({
          where: {
            date: { [Op.between]: [globalStart, globalEnd] },
            status: 1,
          },
          include: [
            { model: HrLeaveTypes, where: { LeaveID: 25 }, attributes: [] },
            {
              model: UserLeave,
              where: { userMasterID: applicantIds },
              attributes: ['DayType', 'userMasterID'],
            },
          ],
        }),
      ]);

      shiftMap = new Map(allShiftData.map((s) => [k(s.shiftID), s]));
      allODDataList = [...existingODData];
    }

    // picks the record valid on a given date (policies were fetched for the whole batch range)
    const pickActive = (list = [], refDate, startKey = 'startDate') =>
      list.find(
        (p) =>
          new Date(p[startKey]) <= new Date(refDate) &&
          (!p.endDate || new Date(p.endDate) >= new Date(refDate)),
      ) || null;

    // ---------------- skipped tracking ----------------
    const skippedMap = new Map();

    const addSkipped = (name, reason) => {
      const key = `${name}__${reason}`;
      if (skippedMap.has(key)) {
        skippedMap.get(key).count++;
      } else {
        skippedMap.set(key, { name, reason, count: 1 });
      }
    };

    const foundIds = new Set(
      authRequestList.map((a) => k(a.AuthorizationRequestId)),
    );
    for (const id of authRequestIdList) {
      if (!foundIds.has(k(id))) {
        addSkipped(`Request ID: ${id}`, 'Authorization request not found');
      }
    }

    // ---------------- MAIN LOOP (one transaction per request) ----------------

    for (const authRequest of authRequestList) {
      const AuthorizationRequestId = authRequest.AuthorizationRequestId;
      const ReferenceID = authRequest.ReferenceID;
      const outdoorDuty = authRequest.userLeave;
      const userMasterID = authRequest.userLeave.userMasterID;

      const userinfoFromMap = userInfoMap.get(k(userMasterID));
      const employeeName =
        userinfoFromMap?.displayName || `Unknown (ID: ${userMasterID})`;

      if (
        authRequest?.userLeave?.authorizationStatus == 3 ||
        authRequest?.userLeave?.authorizationStatus == 4
      ) {
        addSkipped(
          employeeName,
          authRequest?.userLeave?.authorizationStatus == 3
            ? 'Outdoor Duty request already approved'
            : 'Outdoor Duty request already rejected',
        );
        continue;
      }

      if (!userinfoFromMap) {
        addSkipped(employeeName, 'User not found');
        continue;
      }

      const start = new Date(authRequest.userLeave.FromDate);
      const end = new Date(authRequest.userLeave.ToDate);
      const leavetransaction = [];

      while (start <= end) {
        leavetransaction.push({
          ReferenceID: ReferenceID,
          LeaveTranId: outdoorDuty.LeaveTranId,
          days: +outdoorDuty.LeaveDays >= 1 ? 1 : 0.5,
          date: start.toISOString().split('T')[0],
          issandwichleave: 0,
          status: 1,
          createBy,
          createByIp,
        });
        start.setDate(start.getDate() + 1); // Increment by 1 day
      }

      if (authstatus != 0) {
        const allDates = [...leavetransaction]
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .map((e) => e.date);

        const payrollFrequency =
          userinfoFromMap?.employeeJoiningDetails?.[0]?.payrollFrequency ||
          PayrollFrequencyType.MONTHLY;

        const attendanceCal = verifiedMonthList.filter(
          (m) =>
            m.userMasterID == userMasterID &&
            m.payrollFrequency == payrollFrequency &&
            allDates.some(
              (d) =>
                new Date(m.monthstartdate) <= new Date(d) &&
                new Date(m.monthenddate) >= new Date(d),
            ),
        ).length;

        if (attendanceCal > 0) {
          addSkipped(
            employeeName,
            'Attendance already verified. So can not approve Outdoor Duty',
          );
          continue;
        }
      }

      const allAuthData = allAuthDataMap.get(k(ReferenceID)) || [];

      const authorizationDetails = authorizationDetailsMap.get(k(userMasterID));

      if (!authorizationDetails) {
        addSkipped(employeeName, 'Authorization details not found');
        continue;
      }

      const authorizationCriteria = authorizationCriteriaMap.get(
        k(authorizationDetails.AuthorizationCriteriaID),
      );

      if (!authorizationCriteria) {
        addSkipped(employeeName, 'Authorization criteria not found');
        continue;
      }

      const allAuthIds = allAuthData.map((e) => e.AuthorizationRequestId);

      const startDate = authRequest.userLeave.FromDate;
      const endDate = authRequest.userLeave.ToDate;

      const transaction = await sequelize.transaction();
      try {
        let notification = false;
        let finalApproved = false;
        let userinfo = null;

        if (authstatus == 0) {
          notification = true;
          await UserInbox.destroy(
            {
              where: {
                activityTable: 'outdoorDutyAuthorizations',
                activityTablePK: allAuthIds,
              },
            },
            { transaction },
          );

          await UserLeave.update(
            {
              authorizationStatus: 4,
              // updateBy: createBy
              authorizedBy: req.userDetails.userMasterId,
              authorizedAt: new Date(),
              isAuthorizedBy: false,
              authorizerRemark: rejectionRemarks,
            },
            { where: { UserLeaveApplicationID: ReferenceID }, transaction },
          );
        } else {
          userinfo = userinfoFromMap;

          const notification1 = {
            title: 'Outdoor Duty',
            body: userinfo.displayName + ' requested for Outdoor Duty.',
          };
          const data = {
            screen: 'outDoorDutyAuth',
          };

          if (authorizationCriteria.AuthorizationCriteria === 'Sequeance No') {
            await UserInbox.destroy(
              {
                where: {
                  activityTable: 'outdoorDutyAuthorizations',
                  activityTablePK: allAuthIds,
                },
              },
              { transaction },
            );

            const authRequests = allAuthData.filter((e) => e.authstatus != 0);

            const approvedUserIds = authRequests.map((req) =>
              req.userMasterID.toString(),
            );
            const formAuthUsers =
              authorizationDetails.AuthorizedByUserMasterId.map((id) =>
                id.toString(),
              );

            const remainingUserIds = formAuthUsers.filter(
              (id) => !approvedUserIds.includes(id),
            );

            if (remainingUserIds.length > 0) {
              const outDutyAuth = await LeaveAuthorizationRequest.create(
                {
                  ReferenceID,
                  userMasterID: remainingUserIds[0],
                  TableName: 'userLeaves',
                  status: 1,
                  authstatus: 2,
                  createBy: createBy,
                  createByIp: createByIp,
                  rejectionRemarks: rejectionRemarks,
                },
                { transaction },
              );

              await UserInbox.create(
                {
                  activityTable: 'outdoorDutyAuthorizations',
                  activityTablePK: outDutyAuth.toJSON().AuthorizationRequestId,
                  message: `${
                    userinfo.displayName
                  } has requested for Outdoor Duty from ${moment(
                    authRequest.userLeave.FromDate,
                  ).format('DD/MM/YYYY')} to ${moment(
                    authRequest.userLeave.ToDate,
                  ).format('DD/MM/YYYY')}`,
                  assignedTo: remainingUserIds[0],
                  assignedBy: userinfo.userMasterID,
                },
                { transaction },
              );

              await sendNotification(remainingUserIds[0], notification1, data);
            } else {
              notification = true;
              finalApproved = true;

              await UserLeaveTransaction.bulkCreate(leavetransaction, {
                transaction,
              });

              await UserLeave.update(
                {
                  authorizationStatus: 3,
                  // updateBy: createBy,
                  authorizedBy: req.userDetails.userMasterId,
                  authorizedAt: new Date(),
                  isAuthorizedBy: false,
                  authorizerRemark: rejectionRemarks,
                },
                { where: { UserLeaveApplicationID: ReferenceID }, transaction },
              );
            }
          } else if (
            authorizationCriteria.AuthorizationCriteria === 'Any One'
          ) {
            await UserInbox.destroy(
              {
                where: {
                  activityTable: 'outdoorDutyAuthorization',
                  activityTablePK: AuthorizationRequestId,
                },
              },
              { transaction },
            );

            const approvedRequests = allAuthData.filter(
              (e) => e.authstatus == 1,
            );

            if (approvedRequests.length + 1 >= 1) {
              await UserInbox.destroy(
                {
                  where: {
                    activityTable: 'outdoorDutyAuthorizations',
                    activityTablePK: allAuthIds,
                  },
                },
                { transaction },
              );
              notification = true;
              finalApproved = true;
              await UserLeaveTransaction.bulkCreate(leavetransaction, {
                transaction,
              });

              await UserLeave.update(
                {
                  authorizationStatus: 3,
                  // updateBy: createBy,
                  authorizedBy: req.userDetails.userMasterId,
                  authorizedAt: new Date(),
                  isAuthorizedBy: false,
                  authorizerRemark: rejectionRemarks,
                },
                { where: { UserLeaveApplicationID: ReferenceID }, transaction },
              );
            }
          } else if (
            authorizationCriteria.AuthorizationCriteria === 'Any Two'
          ) {
            await UserInbox.destroy(
              {
                where: {
                  activityTable: 'outdoorDutyAuthorizations',
                  activityTablePK: AuthorizationRequestId,
                },
              },
              { transaction },
            );

            const approvedRequests = allAuthData.filter(
              (e) => e.authstatus == 1,
            );
            if (approvedRequests.length + 1 >= 2) {
              await UserInbox.destroy(
                {
                  where: {
                    activityTable: 'outdoorDutyAuthorizations',
                    activityTablePK: allAuthIds,
                  },
                },
                { transaction },
              );

              notification = true;
              finalApproved = true;
              await UserLeaveTransaction.bulkCreate(leavetransaction, {
                transaction,
              });

              await UserLeave.update(
                {
                  authorizationStatus: 3,
                  // updateBy: createBy,
                  authorizedBy: req.userDetails.userMasterId,
                  authorizedAt: new Date(),
                  isAuthorizedBy: false,
                  authorizerRemark: rejectionRemarks,
                },
                { where: { UserLeaveApplicationID: ReferenceID }, transaction },
              );
            }
          } else {
            await UserInbox.destroy(
              {
                where: {
                  activityTable: 'outdoorDutyAuthorizations',
                  activityTablePK: AuthorizationRequestId,
                },
              },
              { transaction },
            );

            const approvedRequests = allAuthData.filter(
              (e) => e.authstatus == 1,
            );

            if (approvedRequests.length + 1 >= 3) {
              await UserInbox.destroy(
                {
                  where: {
                    activityTable: 'outdoorDutyAuthorizations',
                    activityTablePK: allAuthIds,
                  },
                },
                { transaction },
              );

              notification = true;
              finalApproved = true;

              await UserLeaveTransaction.bulkCreate(leavetransaction, {
                transaction,
              });

              await UserLeave.update(
                {
                  authorizationStatus: 3,
                  // updateBy: createBy,
                  authorizedBy: req.userDetails.userMasterId,
                  authorizedAt: new Date(),
                  isAuthorizedBy: false,
                  authorizerRemark: rejectionRemarks,
                },
                { where: { UserLeaveApplicationID: ReferenceID }, transaction },
              );
            }
          }
        }

        await LeaveAuthorizationRequest.update(
          {
            viewstatus: 0,
            authstatus: authstatus,
            updateBy: createBy,
            updateByIp: createByIp,
            rejectionRemarks: rejectionRemarks,
          },
          {
            where: { AuthorizationRequestId: AuthorizationRequestId },
            transaction,
          },
        );

        const data = {
          screen: 'outDoorDutyAuth',
        };

        if (authstatus == 1) {
          if (notification) {
            const notification1 = {
              title: 'Outdoor Duty',
              body: 'Outdoor Duty accepted successfully',
            };

            sendNotification(userMasterID, notification1, data);
          }
        } else {
          const notification1 = {
            title: 'Outdoor Duty',
            body: 'Outdoor Duty rejected successfully',
          };

          sendNotification(userMasterID, notification1, data);
        }

        // -----------------------------OD on weekoff or Holiday ------------------------------------

        const attendancePolicy =
          pickActive(userinfo?.employeeAttendancePolicies, endDate)
            ?.attendancePolicy || null;

        const salaryPolicy =
          pickActive(userinfo?.empSalPolicy, endDate)?.salaryPolicy || null;

        if (finalApproved && userinfo && attendancePolicy) {
          const inRange = (d) =>
            new Date(d) >= new Date(startDate) &&
            new Date(d) <= new Date(endDate);

          const allAttendance = (userinfo.attendanceTransactions || []).filter(
            (e) => inRange(e.AttendanceDate),
          );
          const allShiftRoster = (userinfo.shiftRosters || []).filter((e) =>
            inRange(e.shiftRosterDate),
          );
          const empShift = pickActive(userinfo.employeeShifts, endDate);
          const empShiftIds = empShift
            ? empShift.shiftID
              ? [empShift.shiftID]
              : empShift.shiftsID
            : [];

          const allODData = allODDataList.filter(
            (e) => e.userLeave?.userMasterID == userMasterID,
          );

          const otAdded =
            salaryPolicy?.salarycalculationBasedon == 'hourwise'
              ? salaryPolicy?.overtimeAdded
              : overtimeAddedEnum.DAILY;
          const monthlyOtCalType =
            otAdded == overtimeAddedEnum.MONHTLY
              ? salaryPolicy.monthly_ot_cal_type
              : null;

          const typeCondition =
            attendancePolicy?.WHPHPriority == 'PH' ? "'holiday'" : "'weekoff'";

          const holidayCoffRuleIn = attendancePolicy?.holidayCoffRuleIn;

          const allHolidayCompensationRules =
            pickActive(
              userinfo.employeeHolidayPolicies,
              endDate,
              'applicableDate',
            )?.HolidayPolicy?.holidayCompensationRules || [];

          for (const data of leavetransaction) {
            const date = data.date;

            const holidayCompensationRules = allHolidayCompensationRules.find(
              (item) => (item.holidayDate || []).includes(date),
            );

            const checkWH = await getWeekoffHoliday(
              userMasterID,
              date,
              typeCondition,
              transaction,
            );

            const weekoffType = checkWH?.tableName || null;

            const attendanceData = allAttendance.find(
              (e) => e.AttendanceDate == date,
            );

            if (!checkWH || attendanceData?.fulldayhalfday == 1) continue;

            // delete OT/Coff/ED

            await deleteOvertimeCoff(userMasterID, date, transaction);

            const odData = allODData.find((e) => e.date == date) || null;

            const odDays = (+odData?.days || 0) + +data.days;

            const finalODData = [];

            // set OD type in data
            data.userLeave = {
              DayType: authRequest.userLeave.DayType,
            };

            if (odData) finalODData.push(odData);
            finalODData.push(data);

            // To Find Day
            const day = new Date(date).toLocaleString('en-us', {
              weekday: 'long',
            });

            let minutes = 0;
            if (attendanceData) {
              const shift = shiftMap.get(k(attendanceData.Shift));

              const shiftTime = (shift?.shiftTimes || []).find(
                (e) => e.day == day,
              );

              const shiftGrace = +attendanceData.roundOffMinutes;

              // find weekoff minutes
              const weekoffminutes = calculateWeekoffMinutes(
                checkWH,
                attendancePolicy,
                attendanceData,
                shiftTime,
                shiftGrace,
              );

              minutes += +weekoffminutes;

              // for absent
              if (+attendanceData.fulldayhalfday == 0) {
                // if half day weekoff

                if (checkWH.value == 0.5) {
                  const checkSecondHalfOD = finalODData.find((e) =>
                    ['Full Day', 'Second Half'].includes(e.userLeave.DayType),
                  );

                  minutes += checkSecondHalfOD
                    ? Math.round(+shiftTime.totalhours * 60) -
                      Math.round(+shiftTime.totalhourshalfday * 60)
                    : 0;
                } else {
                  //  full day weekoff

                  minutes +=
                    odDays == 0.5
                      ? Math.round(+shiftTime.totalhourshalfday * 60)
                      : Math.round(+shiftTime.totalhours * 60);
                }
              }
              // for half day
              if (+attendanceData.fulldayhalfday == 0.5) {
                // check in time

                let presentInFH = false;
                let presentInSH = false;

                if (
                  new Date(attendanceData.InDatetime) <
                  new Date(date + ' ' + shiftTime.firsthalfendtime)
                )
                  presentInFH = true;

                if (
                  new Date(attendanceData.OutDateTime) >=
                  new Date(date + ' ' + shiftTime.endtime)
                )
                  presentInSH = true;

                if (presentInFH && !presentInSH) {
                  const checkSecondHalfOD = finalODData.find((e) =>
                    ['Full Day', 'Second Half'].includes(e.userLeave.DayType),
                  );

                  minutes += checkSecondHalfOD
                    ? Math.round(+shiftTime.totalhours * 60) -
                      Math.round(+shiftTime.totalhourshalfday * 60)
                    : 0;
                } else if (!presentInFH && presentInSH) {
                  const checkFirstHalfOD = finalODData.find((e) =>
                    ['Full Day', 'First Half'].includes(e.userLeave.DayType),
                  );

                  minutes += checkFirstHalfOD
                    ? Math.round(+shiftTime.totalhourshalfday * 60)
                    : 0;
                } else if (!presentInFH && !presentInSH) {
                  minutes += Math.round(+shiftTime.totalhourshalfday * 60);
                }
              }
            } else {
              // if attendance not found

              let shiftId =
                allShiftRoster.find((e) => e.shiftRosterDate == date)
                  ?.shiftID || null;

              if (!shiftId) shiftId = empShiftIds[0];

              // if shift not found

              if (!shiftId) continue;

              const shiftTime = (
                shiftMap.get(k(shiftId))?.shiftTimes || []
              ).find((e) => e.day == day);

              if (!shiftTime) continue;

              // if half day weekoff

              if (checkWH.value == 0.5) {
                const checkSecondHalfOD = finalODData.find((e) =>
                  ['Full Day', 'Second Half'].includes(e.userLeave.DayType),
                );

                minutes += checkSecondHalfOD
                  ? Math.round(+shiftTime.totalhours * 60) -
                    Math.round(+shiftTime.totalhourshalfday * 60)
                  : 0;
              } else {
                //  full day weekoff

                minutes +=
                  odDays == 0.5
                    ? Math.round(+shiftTime.totalhourshalfday * 60)
                    : Math.round(+shiftTime.totalhours * 60);
              }
            }

            // if OD on weekOff add OT/ED/Coff
            await add_OD_On_weekOff_Coff_OT_ED(
              attendancePolicy,
              attendanceData,
              userinfo.companyMasterId,
              createBy,
              createByIp,
              minutes,
              transaction,
              minutes,
              0,
              userMasterID,
              date,
              otAdded,
              monthlyOtCalType,
              weekoffType,
              holidayCoffRuleIn,
              holidayCompensationRules,
            );
          }
        }

        await transaction.commit();
        authorizedCount++;

        // keep in-memory data current for later requests in this same batch
        const selfRow = allAuthData.find(
          (e) => k(e.AuthorizationRequestId) === k(AuthorizationRequestId),
        );
        if (selfRow) selfRow.authstatus = authstatus;

        if (finalApproved) {
          for (const row of leavetransaction) {
            allODDataList.push({
              date: row.date,
              days: row.days,
              userLeave: {
                DayType: authRequest.userLeave.DayType,
                userMasterID,
              },
            });
          }
        }
      } catch (err) {
        if (!transaction.finished) await transaction.rollback();
        console.error('OD authorization failed', AuthorizationRequestId, err);
        addSkipped(employeeName, err.message || 'Something went wrong');
      }
    }

    // ---------------- RESPONSE ----------------

    const skippedList = Array.from(skippedMap.values());

    const successMsg =
      authstatus == 1
        ? 'Outdoor Duty Request Accept Successfully'
        : 'Outdoor Duty Request Reject Successfully';

    const responseMessage = skippedList.length ? null : successMsg;

    return res.status(200).json({
      status: responseMessage ? 200 : 400,
      message: responseMessage,
      skippedUser: responseMessage ? null : skippedList,
      skippedCount: authRequestIdList.length - authorizedCount,
      authorizedCount,
      totalRequests: authRequestIdList.length,
    });
  } catch (error) {
    next(error);
  }
};

exports.outdoorDutyCancellationList = async (req, res, next) => {
  try {
    let { userMasterID, page, limit } = await req.body;

    if (!userMasterID || (userMasterID && userMasterID.length == 0))
      return res.status(200).json({
        status: 401,
        message: 'Invalid Parameters',
      });

    const { data, totalcount } = await getApprovedLeaveList(
      req,
      userMasterID,
      page,
      limit,
      25,
      null,
    );

    return res.status(200).json({
      status: 200,
      data,
      totalcount,
    });
  } catch (err) {
    next(err);
  }
};

exports.cancelOutdoorDuty = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { userLeaveTransactionID, LeaveCancelRemark, userMasterID } =
      req.body;

    if (!userLeaveTransactionID || !userMasterID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.errorMessage.INVALID_REQUEST,
      });
    }

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    const transactionData = await UserLeaveTransaction.findOne({
      where: {
        userLeaveTransactionID,
      },
      transaction,
    });

    if (!transactionData) throw new Error('Transaction data not found!');

    const date = transactionData.date;

    const userData = await UserMaster.findOne({
      where: {
        userMasterID,
      },
      include: [
        // attendance
        {
          required: false,
          model: attendanceTransaction,
          where: {
            AttendanceDate: date,
          },
          include: [
            {
              model: Shift,
              attributes: ['shiftID', 'shiftGrace'],
              include: [{ model: ShiftTIme }],
            },
          ],
        },
        // attendance policy
        {
          required: false,
          separate: true,
          model: EmployeeAttendancePolicy,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(date),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(date),
                },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          attributes: ['attendancePolicyID'],
          include: [{ model: AttendancePolicy, as: 'attendancePolicy' }],
        },
        {
          required: false,
          separate: true,
          model: HrLeaveMonthlyTrans,
          where: {
            monthstartdate: {
              [Sequelize.Op.lte]: date,
            },
            monthenddate: {
              [Sequelize.Op.gte]: date,
            },
            verified: 1,
          },
          limit: 1,
        },
        // salary Policy
        {
          required: false,
          model: EmployeeSalaryPolicy,
          as: 'empSalPolicy',
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(date),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(date),
                },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          attributes: ['salaryPolicyID'],
          include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
        },

        // holiday policy
        {
          model: employeeHolidayPolicy,
          required: false,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: date,
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: date,
                },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          attributes: ['holidayPolicyID'],
          include: [
            {
              model: holidayPolicy,
              as: 'HolidayPolicy',
              attributes: ['holidayPolicyID'],
              required: false,
              include: [
                {
                  model: HolidayCompensationRule,
                  separate: true,
                  required: false,
                  where: {
                    holidayDate: {
                      [Sequelize.Op.contains]: [date],
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
      transaction,
    });

    if (!userData) throw new Error('User not found!');

    if (userData.hrLeaveMonthlyTrans?.length) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Attendance has already been verified.',
      });
    }

    // cancel OD

    transactionData.LeaveCancelRemark = LeaveCancelRemark;
    transactionData.status = 10;
    transactionData.updateBy = createBy;
    transactionData.updateByIp = createByIp;

    // save data
    await transactionData.save({ transaction });

    const notification = {
      title: 'Outdoor Duty',
      body: message.usermessage.cancelMessage('Outdoor Duty'),
    };
    const data = {
      screen: 'outDoorDutyAuth',
    };

    // send notification

    sendNotification(userMasterID, notification, data);

    // --------------- check weekoff or holiday on OD date
    const attendancePolicy =
      userData.employeeAttendancePolicies?.[0]?.attendancePolicy || null;

    const typeCondition =
      attendancePolicy?.WHPHPriority == 'PH' ? "'holiday'" : "'weekoff'";

    const holidayCoffRuleIn = attendancePolicy?.holidayCoffRuleIn;

    const holidayCompensationRules =
      userData.employeeHolidayPolicies?.[0]?.HolidayPolicy
        ?.holidayCompensationRules?.[0] || null;

    const checkWH = await getWeekoffHoliday(
      userMasterID,
      date,
      typeCondition,
      transaction,
    );

    const weekoffType = checkWH?.tableName || null;

    // ----------------------------------------- OD on weekoff or holiday ---------------------------------------------------------

    const attendanceData = userData.attendanceTransactions?.[0] || null;

    const salaryPolicy = userData?.empSalPolicies?.[0]?.salaryPolicy || null;

    // delete OT/Coff/ED

    await deleteOvertimeCoff(userMasterID, date, transaction);

    if (checkWH && attendanceData && attendancePolicy) {
      // To Find Day
      const day = new Date(date).toLocaleString('en-us', {
        weekday: 'long',
      });

      // approved od on that date

      const odData = await UserLeaveTransaction.findOne({
        where: {
          date,
          userLeaveTransactionID: {
            [Sequelize.Op.ne]: userLeaveTransactionID,
          },
          status: 1,
        },
        include: [
          {
            model: HrLeaveTypes,
            where: {
              LeaveID: 25,
            },
            attributes: [],
          },
          {
            model: UserLeave,
            where: { userMasterID },
            attributes: ['DayType'],
          },
        ],
      });

      const odDays = +odData?.days || 0;

      const shiftData = attendanceData.shift || null;

      const shiftTime = (shiftData?.shiftTimes || []).find((e) => e.day == day);

      let minutes = 0;

      const otAdded =
        salaryPolicy?.salarycalculationBasedon == 'hourwise'
          ? salaryPolicy?.overtimeAdded
          : overtimeAddedEnum.DAILY;
      const monthlyOtCalType =
        otAdded == overtimeAddedEnum.MONHTLY
          ? salaryPolicy.monthly_ot_cal_type
          : null;

      if (shiftData && shiftTime) {
        const shiftGrace = +attendanceData.roundOffMinutes;

        // find weekoff minutes
        const weekoffminutes = calculateWeekoffMinutes(
          checkWH,
          attendancePolicy,
          attendanceData,
          shiftTime,
          shiftGrace,
        );

        minutes += +weekoffminutes;

        // for absent
        if (+attendanceData.fulldayhalfday == 0) {
          // if half day weekoff

          if (checkWH.value == 0.5) {
            const checkSecondHalfOD =
              odData?.userLeave?.DayType == 'Full Day' ||
              odData?.userLeave?.DayType == 'Second Half';

            minutes += checkSecondHalfOD
              ? Math.round(+shiftTime.totalhours * 60) -
                Math.round(+shiftTime.totalhourshalfday * 60)
              : 0;
          } else {
            //  full day weekoff

            minutes +=
              odDays == 0.5
                ? Math.round(+shiftTime.totalhourshalfday * 60)
                : Math.round(+shiftTime.totalhours * 60);
          }
        }
        // for Half day
        if (+attendanceData.fulldayhalfday == 0.5) {
          // check in time

          let presentInFH = false;
          let presentInSH = false;

          if (
            new Date(attendanceData.InDatetime) <
            new Date(date + ' ' + shiftTime.firsthalfendtime)
          )
            presentInFH = true;

          if (
            new Date(attendanceData.OutDateTime) >=
            new Date(date + ' ' + shiftTime.endtime)
          )
            presentInSH = true;

          if (presentInFH && !presentInSH) {
            const checkSecondHalfOD =
              odData?.userLeave?.DayType == 'Full Day' ||
              odData?.userLeave?.DayType == 'Second Half';

            minutes += checkSecondHalfOD
              ? Math.round(+shiftTime.totalhours * 60) -
                Math.round(+shiftTime.totalhourshalfday * 60)
              : 0;
          } else if (!presentInFH && presentInSH) {
            const checkFirstHalfOD =
              odData?.userLeave?.DayType == 'Full Day' ||
              odData?.userLeave?.DayType == 'First Half';

            minutes += checkFirstHalfOD
              ? Math.round(+shiftTime.totalhourshalfday * 60)
              : 0;
          } else if (!presentInFH && !presentInSH) {
            minutes += odDays
              ? Math.round(+shiftTime.totalhourshalfday * 60)
              : 0;
          }
        }

        // if OD on weekOff add OT/ED/Coff
        await add_OD_On_weekOff_Coff_OT_ED(
          attendancePolicy,
          attendanceData,
          userData.companyMasterId,
          createBy,
          createByIp,
          minutes,
          transaction,
          minutes,
          0,
          userMasterID,
          date,
          otAdded,
          monthlyOtCalType,
          weekoffType,
          holidayCoffRuleIn,
          holidayCompensationRules,
        );
      }
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.cancelMessage('Outdoor Duty'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.getAuthorizationRequestByReferanceId = async (req, res, next) => {
  try {
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    let get_one_data = await LeaveAuthorizationRequest.findAll({
      where: {
        ReferenceID: req.params.id,
      },
      order: [['AuthorizationRequestId', 'ASC']],
      include: [
        {
          model: UserMaster,
          required: true,
          ...accessibleUsers(req.userDetails, false, false),
          attributes: userAttributes,
          include: [
            {
              separate: true,
              required: false,
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

            {
              separate: true,
              model: AuthorizationDetails,
              where: {
                status: 1,
                AuthorizationMasterID: 1, // fot Leave
              },
              attributes: ['AuthorizationCriteriaID'],
              include: [
                {
                  model: AuthorizationCriteriaMaster,
                  attributes: ['AuthorizationCriteria'],
                },
              ],
            },
          ],
        },
        {
          model: UserLeave,
          where: {
            status: 1,
          },
          include: [
            {
              model: HrLeaveTypes,
              include: [
                {
                  model: HrLeaveMaster,
                  as: 'LeaveMaster',
                },
              ],
            },
            {
              model: UserMaster,
              as: 'authorizer',
              attributes: ['displayName'],
            },
          ],
        },
        {
          separate: true,
          required: false,
          model: ApprovedLeaveAuthorization,
          include: [
            {
              model: HrLeaveTypes,
              attributes: [],
              include: [
                {
                  model: HrLeaveMaster,
                  as: 'LeaveMaster',
                  attributes: [],
                },
              ],
            },
            {
              required: false,
              model: UserMaster,
              as: 'createdByUserDetails',
              attributes: userAttributes,
            },
            {
              required: false,
              model: UserMaster,
              as: 'updatedByUserDetails',
              attributes: userAttributes,
            },
          ],
          order: [['date', 'ASC']],
          attributes: [
            'days',
            'date',
            'status',
            [Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'), 'LeaveName'],
            'LeaveTranId',
            [Sequelize.col('hrLeaveType.leaveTypeChange'), 'leaveTypeChange'],
          ],
        },
      ],
    });
    for (var i = 0; i < get_one_data.length; i++) {
      let user1 = await UserMaster.findOne({
        where: {
          userMasterID: get_one_data[i].userMasterID,
        },
      });
      let user2 = await UserMaster.findOne({
        where: {
          userMasterID: get_one_data[i].userLeave.userMasterID,
        },
      });
      get_one_data[i].dataValues.user = user2.displayName;
      get_one_data[i].dataValues.username = user1.displayName;
    }

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.leavedetails = async (req, res, next) => {
  try {
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    let get_one_data = await UserLeave.findOne({
      where: {
        UserLeaveApplicationID: req.params.id,
      },
      include: [
        {
          model: UserMaster,
          include: [
            {
              separate: true,
              required: false,
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

            {
              model: EmployeeAttendancePolicy,
              as: 'empAttPolicy',
              where: {
                status: 1,
                startDate: {
                  [Sequelize.Op.lte]: Sequelize.col('userLeave.ToDate'),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: Sequelize.col('userLeave.ToDate'),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              attributes: ['attendancePolicyID'],
              include: [
                {
                  model: AttendancePolicy,
                  as: 'attendancePolicy',
                },
              ],
            },
            {
              model: EmployeeSalaryPolicy,
              as: 'empSalPolicy',
              where: {
                status: 1,
                startDate: {
                  [Sequelize.Op.lte]: Sequelize.col('userLeave.ToDate'),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: Sequelize.col('userLeave.ToDate'),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              attributes: ['salaryPolicyID'],
              include: [
                {
                  model: SalaryPolicy,
                  as: 'salaryPolicy',
                },
              ],
            },
          ],
        },
        {
          model: HrLeaveTypes,
          include: [
            {
              model: HrLeaveMaster,
              as: 'LeaveMaster',
              attributes: ['LeaveName'],
            },
          ],
        },
      ],
    });
    if (!get_one_data) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Leave'),
        data: {},
      });
    }
    function getDates(startDate, endDate) {
      const dates = [];
      let currentDate = startDate;
      const addDays = function (days) {
        const date = new Date(this.valueOf());
        date.setDate(date.getDate() + days);
        return date;
      };
      while (currentDate <= endDate) {
        dates.push(currentDate);
        currentDate = addDays.call(currentDate, 1);
      }
      return dates;
    }
    let alldates = [];
    const dates = getDates(
      new Date(get_one_data.FromDate),
      new Date(get_one_data.ToDate),
    );

    dates.forEach(function (date) {
      alldates.push(new Date(date).toISOString().slice(0, 10));
    });

    const attendance =
      get_one_data.userMaster?.empAttPolicy?.[0]?.attendancePolicy || null;

    const salaryPolicy =
      get_one_data.userMaster?.empSalPolicy?.[0]?.salaryPolicy || null;

    const currentdate = new Date().toISOString().slice(0, 10);

    const year = currentdate.slice(0, 4);
    const Month = currentdate.slice(5, 7);
    const monday = daysInMonth(Month, year);

    let start_date, end_date;

    if (salaryPolicy) {
      let date = salaryPolicy.salaryCycleDate;

      date = (date < 10 ? '0' : '') + date;

      start_date = year + '-' + Month + '-' + date;

      let date1 = new Date(start_date);
      date1.setDate(date1.getDate() + (monday - 1));

      end_date =
        date1.getFullYear() +
        '-' +
        String(date1.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(date1.getDate()).padStart(2, '0');
    } else {
      const date = '01';
      start_date = year + '-' + Month + '-' + date;
      end_date = year + '-' + Month + '-' + monday;
    }

    if (start_date > currentdate) {
      let date1 = new Date(start_date);
      date1.setMonth(date1.getMonth() - 1);

      start_date =
        date1.getFullYear() +
        '-' +
        String(date1.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(date1.getDate()).padStart(2, '0');

      let date2 = new Date(end_date);
      date2.setMonth(date2.getMonth() - 1);

      end_date =
        date2.getFullYear() +
        '-' +
        String(date2.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(date2.getDate()).padStart(2, '0');
    }

    const getweekoffholidaytranData = await WeekoffHolidayTran.findAll({
      raw: true,
      where: {
        userMasterID: get_one_data.userMasterID,
        date: {
          [Sequelize.Op.between]: [get_one_data.FromDate, get_one_data.ToDate],
        },
      },
    });

    if (attendance) {
      if (
        attendance.sandwichLeave == true &&
        attendance.weekoffsandwichLeave == true &&
        (attendance.holidaysandwichLeave == null ||
          attendance.holidaysandwichLeave == false) &&
        (attendance.BeforeAfterLeave == null ||
          attendance.BeforeAfterLeave == false)
      ) {
        const getweekoffdata = getweekoffholidaytranData.filter(
          (e) => e.tableName == 'weekoff',
        );
        const optionalHolidayDates = getweekoffholidaytranData
          .filter((e) => e.tableName == 'holiday' && e.optionalHoliday == true)
          .map((m) => m.date);

        alldates = alldates.filter((e) => !optionalHolidayDates.includes(e));

        let finalalldates = alldates;
        let sandwichLeave = [];
        let date = new Date(get_one_data.FromDate).toISOString().slice(0, 10);
        function addQuotes(value) {
          var quotedVar = "'" + value + "'";
          return quotedVar;
        }
        let datemonth = await executeQuery(
          'SELECT to_char(DATE ' +
            addQuotes(date) +
            ',  ' +
            addQuotes('MM') +
            ')',
        );
        datemonth = datemonth[0].to_char;
        let dateyear = await executeQuery(
          'SELECT to_char(DATE ' +
            addQuotes(date) +
            ',  ' +
            addQuotes('YYYY') +
            ')',
        );
        dateyear = dateyear[0].to_char;

        let weekoffdates = [];
        for (var i = 0; i < getweekoffdata.length; i++) {
          weekoffdates.push(getweekoffdata[i].date);
        }

        const intersection = alldates.filter((element) =>
          weekoffdates.includes(element),
        );

        // send data on weekoff or holiday

        const weekoffDates = new Set(
          getweekoffholidaytranData
            .filter((e) => !e.optionalHoliday)
            .map((item) => item.date),
        ); // Convert to Set for faster lookup

        const allDatesAreWeekoff = alldates.every((date) =>
          weekoffDates.has(date),
        );

        if (allDatesAreWeekoff) {
          sandwichLeave = alldates;
          finalalldates = [];
        } else {
          if (intersection.length > 0) {
            for (var j = 0; j < intersection.length; j++) {
              let intersectionDate = intersection[j];
              let yesterday = new Date(
                new Date(intersectionDate).getTime() - 24 * 60 * 60 * 1000,
              )
                .toISOString()
                .slice(0, 10);
              let tomorrow = new Date(
                new Date(intersectionDate).getTime() + 24 * 60 * 60 * 1000,
              )
                .toISOString()
                .slice(0, 10);
              let sandwichdate = [];
              sandwichdate.push(yesterday, tomorrow);
              const sandwichleave = alldates.filter((element) =>
                sandwichdate.includes(element),
              );
              if (sandwichleave.length == 2) {
                sandwichLeave.push(intersection[j]);
                finalalldates = finalalldates.filter(function (item) {
                  return item != intersection[j];
                });
              } else {
                finalalldates = finalalldates.filter(function (item) {
                  return item != intersection[j];
                });
              }
            }
          } else {
            finalalldates = alldates;
          }
        }

        // merge both array

        finalalldates = [...finalalldates, ...optionalHolidayDates];

        // for sorting

        finalalldates = finalalldates
          .map((dateString) => new Date(dateString))
          .sort((a, b) => a - b)
          .map((dateObject) => dateObject.toISOString().split('T')[0]);

        let allleavetypes = await executeQuery(
          'SELECT * from "public".ms_fun_leaves_name(' +
            get_one_data.companyMasterID +
            ')',
        );

        const leavebalance = await employeeeLeaveBalance(
          get_one_data.companyMasterID,
          get_one_data.userMasterID,
        );

        res.status(200).json({
          status: 200,
          message: 'Data Get Successfully.',
          finaldate: finalalldates,
          sandwichdate: sandwichLeave,
          leavebalance: leavebalance,
          leavedata: get_one_data,
        });
      } else if (
        attendance.sandwichLeave == true &&
        attendance.weekoffsandwichLeave == true &&
        attendance.holidaysandwichLeave == true &&
        (attendance.BeforeAfterLeave == null ||
          attendance.BeforeAfterLeave == false)
      ) {
        const getweekoffdata = getweekoffholidaytranData.filter(
          (e) => e.tableName == 'weekoff',
        );
        const optionalHolidayDates = getweekoffholidaytranData
          .filter((e) => e.tableName == 'holiday' && e.optionalHoliday == true)
          .map((m) => m.date);

        alldates = alldates.filter((e) => !optionalHolidayDates.includes(e));

        let finalalldates = alldates;
        let sandwichLeave = [];
        let date = new Date(get_one_data.FromDate).toISOString().slice(0, 10);
        function addQuotes(value) {
          var quotedVar = "'" + value + "'";
          return quotedVar;
        }
        let datemonth = await executeQuery(
          'SELECT to_char(DATE ' +
            addQuotes(date) +
            ',  ' +
            addQuotes('MM') +
            ')',
        );
        datemonth = datemonth[0].to_char;
        let dateyear = await executeQuery(
          'SELECT to_char(DATE ' +
            addQuotes(date) +
            ',  ' +
            addQuotes('YYYY') +
            ')',
        );
        dateyear = dateyear[0].to_char;

        let weekoffdates = [];
        for (let i = 0; i < getweekoffdata.length; i++) {
          weekoffdates.push(getweekoffdata[i].date);
        }

        weekoffdates = weekoffdates.filter(function (value, index, array) {
          return array.indexOf(value) === index;
        });
        const intersection = alldates.filter((element) =>
          weekoffdates.includes(element),
        );

        // send data on weekoff or holiday

        const weekoffDates = new Set(
          getweekoffholidaytranData
            .filter((e) => !e.optionalHoliday)
            .map((item) => item.date),
        ); // Convert to Set for faster lookup

        const allDatesAreWeekoff = alldates.every((date) =>
          weekoffDates.has(date),
        );

        if (allDatesAreWeekoff) {
          sandwichLeave = alldates;
          finalalldates = [];
        } else {
          if (intersection.length > 0) {
            for (let j = 0; j < intersection.length; j++) {
              let intersectionDate = intersection[j];
              let yesterday = new Date(
                new Date(intersectionDate).getTime() - 24 * 60 * 60 * 1000,
              )
                .toISOString()
                .slice(0, 10);
              let tomorrow = new Date(
                new Date(intersectionDate).getTime() + 24 * 60 * 60 * 1000,
              )
                .toISOString()
                .slice(0, 10);
              let sandwichdate = [];
              sandwichdate.push(yesterday, tomorrow);
              const sandwichleave = alldates.filter((element) =>
                sandwichdate.includes(element),
              );
              if (sandwichleave.length == 2) {
                sandwichLeave.push(intersection[j]);
                finalalldates = finalalldates.filter(function (item) {
                  return item != intersection[j];
                });
              } else {
                finalalldates = finalalldates.filter(function (item) {
                  return item != intersection[j];
                });
              }
            }
          } else {
            finalalldates = alldates;
          }
        }

        // merge both array

        finalalldates = [...finalalldates, ...optionalHolidayDates];

        // for sorting

        finalalldates = finalalldates
          .map((dateString) => new Date(dateString))
          .sort((a, b) => a - b)
          .map((dateObject) => dateObject.toISOString().split('T')[0]);

        // let allleavetypes = await executeQuery(
        //   'SELECT * from "public".ms_fun_leaves_name(' +
        //   get_one_data.companyMasterID +
        //   ')'
        // );

        const leavebalance = await employeeeLeaveBalance(
          get_one_data.companyMasterID,
          get_one_data.userMasterID,
        );

        return res.status(200).json({
          status: 200,
          message: 'Data Get Successfully.',
          finaldate: finalalldates,
          leavebalance: leavebalance,
          sandwichdate: sandwichLeave,
          leavedata: get_one_data,
        });
      } else if (
        attendance.sandwichLeave == true &&
        attendance.weekoffsandwichLeave == true &&
        attendance.BeforeAfterLeave == true &&
        (attendance.holidaysandwichLeave == null ||
          attendance.holidaysandwichLeave == false)
      ) {
        const getweekoffdata = getweekoffholidaytranData.filter(
          (e) => e.tableName == 'weekoff',
        );
        const optionalHolidayDates = getweekoffholidaytranData
          .filter((e) => e.tableName == 'holiday' && e.optionalHoliday == true)
          .map((m) => m.date);

        alldates = alldates.filter((e) => !optionalHolidayDates.includes(e));

        let date = new Date(get_one_data.FromDate).toISOString().slice(0, 10);
        function addQuotes(value) {
          var quotedVar = "'" + value + "'";
          return quotedVar;
        }
        let datemonth = await executeQuery(
          'SELECT to_char(DATE ' +
            addQuotes(date) +
            ',  ' +
            addQuotes('MM') +
            ')',
        );
        datemonth = datemonth[0].to_char;
        let dateyear = await executeQuery(
          'SELECT to_char(DATE ' +
            addQuotes(date) +
            ',  ' +
            addQuotes('YYYY') +
            ')',
        );
        dateyear = dateyear[0].to_char;

        let weekoffdates = [];
        for (var i = 0; i < getweekoffdata.length; i++) {
          weekoffdates.push(getweekoffdata[i].date);
        }

        weekoffdates = weekoffdates.filter(function (value, index, array) {
          return array.indexOf(value) === index;
        });
        let alldatewithweekoff = [];

        // send data on weekoff or holiday

        const weekoffDates = new Set(
          getweekoffholidaytranData
            .filter((e) => !e.optionalHoliday)
            .map((item) => item.date),
        ); // Convert to Set for faster lookup

        const allDatesAreWeekoff = alldates.every((date) =>
          weekoffDates.has(date),
        );

        if (allDatesAreWeekoff) {
          alldatewithweekoff = alldates;
        } else {
          for (let k = 0; k < alldates.length; k++) {
            let today = alldates[k];
            let yesterday = new Date(
              new Date(alldates[k]).getTime() - 24 * 60 * 60 * 1000,
            )
              .toISOString()
              .slice(0, 10);
            let tomorrow = new Date(
              new Date(alldates[k]).getTime() + 24 * 60 * 60 * 1000,
            )
              .toISOString()
              .slice(0, 10);

            const todayinter = weekoffdates.filter(
              (element) => element == today,
            );
            const tomorrowinter = weekoffdates.filter(
              (element) => element == tomorrow,
            );
            const yesterdayinter = weekoffdates.filter(
              (element) => element == yesterday,
            );

            if (todayinter[0] != undefined) {
              alldatewithweekoff.push(todayinter[0]);
            }
            if (tomorrowinter[0] != undefined) {
              alldatewithweekoff.push(tomorrowinter[0]);
            }
            if (yesterdayinter[0] != undefined) {
              alldatewithweekoff.push(yesterdayinter[0]);
            }
          }
        }

        alldatewithweekoff = alldatewithweekoff.filter(
          function (value, index, array) {
            return array.indexOf(value) === index;
          },
        );

        const sandwichleave = alldatewithweekoff.filter((element) =>
          alldates.includes(element),
        );

        // merge both array

        alldates = [...alldates, ...optionalHolidayDates].filter(
          (e) => !sandwichleave.includes(e),
        );

        // for sorting

        alldates = alldates
          .map((dateString) => new Date(dateString))
          .sort((a, b) => a - b)
          .map((dateObject) => dateObject.toISOString().split('T')[0]);
        const leavebalance = await employeeeLeaveBalance(
          get_one_data.companyMasterID,
          get_one_data.userMasterID,
        );

        res.status(200).json({
          status: 200,
          message: 'Data Get Successfully.',
          finaldate: alldates,
          leavebalance: leavebalance,
          sandwichdate: sandwichleave,
          leavedata: get_one_data,
        });
      } else if (
        attendance.sandwichLeave == true &&
        attendance.weekoffsandwichLeave == true &&
        attendance.holidaysandwichLeave == true &&
        attendance.BeforeAfterLeave == true
      ) {
        const getweekoffdata = getweekoffholidaytranData.filter(
          (e) => e.optionalHoliday == false,
        );
        const optionalHolidayDates = getweekoffholidaytranData
          .filter((e) => e.tableName == 'holiday' && e.optionalHoliday == true)
          .map((m) => m.date);

        alldates = alldates.filter((e) => !optionalHolidayDates.includes(e));

        let date = new Date(get_one_data.FromDate).toISOString().slice(0, 10);
        function addQuotes(value) {
          var quotedVar = "'" + value + "'";
          return quotedVar;
        }
        let datemonth = await executeQuery(
          'SELECT to_char(DATE ' +
            addQuotes(date) +
            ',  ' +
            addQuotes('MM') +
            ')',
        );
        datemonth = datemonth[0].to_char;
        let dateyear = await executeQuery(
          'SELECT to_char(DATE ' +
            addQuotes(date) +
            ',  ' +
            addQuotes('YYYY') +
            ')',
        );
        dateyear = dateyear[0].to_char;

        let weekoffdates = [];

        for (var i = 0; i < getweekoffdata.length; i++) {
          weekoffdates.push(getweekoffdata[i].date);
        }

        weekoffdates = weekoffdates.filter(function (value, index, array) {
          return array.indexOf(value) === index;
        });
        let alldatewithweekoff = [];

        // send data on weekoff or holiday

        const weekoffDates = new Set(
          getweekoffholidaytranData
            .filter((e) => !e.optionalHoliday)
            .map((item) => item.date),
        ); // Convert to Set for faster lookup

        const allDatesAreWeekoff = alldates.every((date) =>
          weekoffDates.has(date),
        );

        if (allDatesAreWeekoff) {
          alldatewithweekoff = alldates;
        } else {
          for (var k = 0; k < alldates.length; k++) {
            let today = alldates[k];
            let yesterday = new Date(
              new Date(alldates[k]).getTime() - 24 * 60 * 60 * 1000,
            )
              .toISOString()
              .slice(0, 10);
            let tomorrow = new Date(
              new Date(alldates[k]).getTime() + 24 * 60 * 60 * 1000,
            )
              .toISOString()
              .slice(0, 10);

            const todayinter = weekoffdates.filter(
              (element) => element == today,
            );
            const tomorrowinter = weekoffdates.filter(
              (element) => element == tomorrow,
            );
            const yesterdayinter = weekoffdates.filter(
              (element) => element == yesterday,
            );

            if (todayinter[0] != undefined) {
              alldatewithweekoff.push(todayinter[0]);
            }
            if (tomorrowinter[0] != undefined) {
              alldatewithweekoff.push(tomorrowinter[0]);
            }
            if (yesterdayinter[0] != undefined) {
              alldatewithweekoff.push(yesterdayinter[0]);
            }
          }
        }

        alldatewithweekoff = alldatewithweekoff.filter(
          function (value, index, array) {
            return array.indexOf(value) === index;
          },
        );
        const sandwichleave = alldatewithweekoff.filter((element) =>
          alldates.includes(element),
        );

        // merge both array

        alldates = [...alldates, ...optionalHolidayDates].filter(
          (e) => !sandwichleave.includes(e),
        );

        // for sorting

        alldates = alldates
          .map((dateString) => new Date(dateString))
          .sort((a, b) => a - b)
          .map((dateObject) => dateObject.toISOString().split('T')[0]);

        const leavebalance = await employeeeLeaveBalance(
          get_one_data.companyMasterID,
          get_one_data.userMasterID,
        );

        res.status(200).json({
          status: 200,
          message: 'Data Get Successfully.',
          finaldate: alldates,
          leavebalance: leavebalance,
          sandwichdate: sandwichleave,
          leavedata: get_one_data,
        });
      } else {
        const getweekoffdata = getweekoffholidaytranData.filter(
          (e) => e.optionalHoliday == false,
        );
        const optionalHolidayDates = getweekoffholidaytranData
          .filter((e) => e.tableName == 'holiday' && e.optionalHoliday == true)
          .map((m) => m.date);

        alldates = alldates.filter((e) => !optionalHolidayDates.includes(e));

        // let finalalldates = alldates;
        // let sandwichLeave = [];
        let date = new Date(get_one_data.FromDate).toISOString().slice(0, 10);
        function addQuotes(value) {
          var quotedVar = "'" + value + "'";
          return quotedVar;
        }
        let datemonth = await executeQuery(
          'SELECT to_char(DATE ' +
            addQuotes(date) +
            ',  ' +
            addQuotes('MM') +
            ')',
        );
        datemonth = datemonth[0].to_char;
        let dateyear = await executeQuery(
          'SELECT to_char(DATE ' +
            addQuotes(date) +
            ',  ' +
            addQuotes('YYYY') +
            ')',
        );
        dateyear = dateyear[0].to_char;

        let weekoffdates = [];
        for (var i = 0; i < getweekoffdata.length; i++) {
          weekoffdates.push(getweekoffdata[i].date);
        }

        weekoffdates = weekoffdates.filter(function (value, index, array) {
          return array.indexOf(value) === index;
        });

        // send data on weekoff or holiday

        const weekoffDates = new Set(
          getweekoffholidaytranData
            .filter((e) => !e.optionalHoliday)
            .map((item) => item.date),
        ); // Convert to Set for faster lookup

        const allDatesAreWeekoff = alldates.every((date) =>
          weekoffDates.has(date),
        );

        if (!allDatesAreWeekoff) {
          const intersection = alldates.filter((element) =>
            weekoffdates.includes(element),
          );

          if (intersection.length > 0) {
            for (var n = 0; n < intersection.length; n++) {
              alldates = alldates.filter(function (item) {
                return item != intersection[n];
              });
            }
          }
        }

        // merge both array

        alldates = [...alldates, ...optionalHolidayDates];

        // for sorting

        alldates = alldates
          .map((dateString) => new Date(dateString))
          .sort((a, b) => a - b)
          .map((dateObject) => dateObject.toISOString().split('T')[0]);

        const leavebalance = await employeeeLeaveBalance(
          get_one_data.companyMasterID,
          get_one_data.userMasterID,
        );

        res.status(200).json({
          status: 200,
          message: 'Data Get Successfully.',
          finaldate: alldates,
          leavebalance: leavebalance,
          sandwichdate: [],
          leavedata: get_one_data,
        });
      }
    } else {
      const getweekoffdata = getweekoffholidaytranData.filter(
        (e) => e.optionalHoliday == false,
      );
      const optionalHolidayDates = getweekoffholidaytranData
        .filter((e) => e.tableName == 'holiday' && e.optionalHoliday == true)
        .map((m) => m.date);

      alldates = alldates.filter((e) => !optionalHolidayDates.includes(e));

      let finalalldates = alldates;
      let sandwichLeave = [];
      let date = new Date(get_one_data.FromDate).toISOString().slice(0, 10);
      function addQuotes(value) {
        var quotedVar = "'" + value + "'";
        return quotedVar;
      }
      let datemonth = await executeQuery(
        'SELECT to_char(DATE ' +
          addQuotes(date) +
          ',  ' +
          addQuotes('MM') +
          ')',
      );
      datemonth = datemonth[0].to_char;
      let dateyear = await executeQuery(
        'SELECT to_char(DATE ' +
          addQuotes(date) +
          ',  ' +
          addQuotes('YYYY') +
          ')',
      );
      dateyear = dateyear[0].to_char;

      let weekoffdates = [];
      for (var i = 0; i < getweekoffdata.length; i++) {
        weekoffdates.push(getweekoffdata[i].date);
      }
      weekoffdates = weekoffdates.filter(function (value, index, array) {
        return array.indexOf(value) === index;
      });

      // send data on weekoff or holiday

      const weekoffDates = new Set(
        getweekoffholidaytranData
          .filter((e) => !e.optionalHoliday)
          .map((item) => item.date),
      ); // Convert to Set for faster lookup

      const allDatesAreWeekoff = alldates.every((date) =>
        weekoffDates.has(date),
      );

      if (!allDatesAreWeekoff) {
        const intersection = alldates.filter((element) =>
          weekoffdates.includes(element),
        );

        if (intersection.length > 0) {
          for (var n = 0; n < intersection.length; n++) {
            alldates = alldates.filter(function (item) {
              return item != intersection[n];
            });
          }
        }
      }

      // merge both array

      alldates = [...alldates, ...optionalHolidayDates];

      // for sorting

      alldates = alldates
        .map((dateString) => new Date(dateString))
        .sort((a, b) => a - b)
        .map((dateObject) => dateObject.toISOString().split('T')[0]);

      const leavebalance = await employeeeLeaveBalance(
        get_one_data.companyMasterID,
        get_one_data.userMasterID,
      );

      res.status(200).json({
        status: 200,
        message: 'Data Get Successfully.',
        finaldate: alldates,
        leavebalance: leavebalance,
        sandwichdate: [],
        leavedata: get_one_data,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.leaveAuthCriteria = async (req, res, next) => {
  try {
    let Auth_Details;
    let Auth_Criteria;
    let usermaster;
    let Auth_person;
    let Auth_person_Arr = [];
    let Auth_person_list = [];
    let finaldata = [];

    Auth_Details = await AuthorizationDetails.findOne({
      where: {
        userMasterID: req.params.id,
        AuthorizationMasterID: authorizationMasterTypes.leave,
        status: 1,
        '$userMaster.status$': 1,
      },
      attributes: [['AuthorizationCriteriaID', 'id']],
      include: [
        {
          model: UserMaster,
          as: 'userMaster',
        },
      ],
    });

    if (Auth_Details) {
      Auth_Criteria = await AuthorizationCriteria.findOne({
        where: {
          AuthorizationCriteriaID: Auth_Details.dataValues.id,
        },
        attributes: [['AuthorizationCriteria', 'Criteria']],
      });

      usermaster = await AuthorizationDetails.findOne({
        where: {
          userMasterID: req.params.id,
          AuthorizationMasterID: authorizationMasterTypes.leave,
          status: 1,
          '$userMaster.status$': 1,
        },
        attributes: [['AuthorizedByUserMasterId', 'user']],
        include: [
          {
            model: UserMaster,
            as: 'userMaster',
          },
        ],
      });

      for (var i = 0; i < usermaster.dataValues.user.length; i++) {
        Auth_person_Arr.push(usermaster.dataValues.user[i]);
      }

      for (var j = 0; j < Auth_person_Arr.length; j++) {
        Auth_person = await UserMaster.findOne({
          where: {
            userMasterID: Auth_person_Arr[j],
          },
          status: 1,
          attributes: [
            ['userMasterID', 'userMasterID'],
            ['displayName', 'userName'],
            ['userNumber', 'Number'],
            ['photo', 'picture'],
          ],
          include: [
            {
              model: companyMaster,
              as: 'companyMaster',
              attributes: ['companyName', 'companyName'],
            },
          ],
        });
        Auth_person_list.push(Auth_person);
      }
    } else {
      ((Auth_Criteria = ''), (Auth_person = ''));
    }

    finaldata = {
      Auth_Criteria: Auth_Criteria,
      Auth_person: Auth_person_list,
    };

    res.status(200).json({
      status: 200,
      message: {},
      data: finaldata,
    });
  } catch (err) {
    next(err.message);
  }
};

exports.leavecancellist = async (req, res, next) => {
  try {
    let { page, limit, userMasterID } = await req.body;

    const { data, totalcount } = await getApprovedLeaveList(
      req,
      userMasterID,
      page,
      limit,
      null,
      25,
    );

    return res.status(200).json({
      status: 200,
      data,
      totalcount,
    });
  } catch (err) {
    next(err.message);
  }
};

exports.leavecancel = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { userLeaveTransactionID, LeaveCancelRemark, userMasterID } =
      await req.body;

    if (!userLeaveTransactionID || !userMasterID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.errorMessage.INVALID_REQUEST,
      });
    }

    const leaveTransaction = await UserLeaveTransaction.findOne({
      where: {
        userLeaveTransactionID,
        status: 1,
      },
      include: [{ model: HrLeaveTypes, attributes: ['LeaveID'] }],
    });

    if (!leaveTransaction) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Leave Transaction'),
      });
    }

    const leaveDate = leaveTransaction.date;
    const leaveID = leaveTransaction.hrLeaveType?.LeaveID;

    const attnCal = await HrLeaveMonthlyTrans.findOne({
      where: {
        userMasterID,
        verified: 1,
        monthstartdate: {
          [Sequelize.Op.lte]: leaveDate,
        },
        monthenddate: {
          [Sequelize.Op.gte]: leaveDate,
        },
      },
    });

    if (attnCal) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message:
          'This leave cannot be cancelled because attendance has already been verified.',
      });
    }

    // leave cancel type Coff

    if (leaveID == 6) {
      const balanceData = await HrLeaveBalance.findAll({
        where: {
          userMasterID,
          LeaveTranId: leaveTransaction.LeaveTranId,
        },
        include: [
          {
            model: UsedCoffTransaction,
            where: {
              date: leaveDate,
              type: CoffUsedTypeEnum.USED,
            },
          },
        ],
      });

      for (const coffTrans of balanceData) {
        const balance =
          +coffTrans.availBal +
          (+coffTrans.usedCoffTransactions?.[0]?.days || 0);
        const LeaveBalTranId = coffTrans.LeaveBalTranId;
        const id = coffTrans.usedCoffTransactions?.[0]?.id || null;

        if (!id) continue;

        await HrLeaveBalance.update(
          {
            availBal: balance,
          },
          {
            where: {
              LeaveBalTranId,
            },
            transaction,
          },
        );

        await UsedCoffTransaction.destroy({
          where: {
            id,
          },
          transaction,
          user: req.userDetails,
          individualHooks: true,
        });
      }
    }

    leaveTransaction.LeaveCancelRemark = LeaveCancelRemark;
    leaveTransaction.status = 10;
    leaveTransaction.updateBy = req.userDetails.userMasterId;

    await leaveTransaction.save({
      transaction,
      user: req.userDetails,
      individualHooks: true,
    });

    const notification = {
      title: 'Leave',
      body: 'Leave cancelled',
    };
    const data = {
      screen: 'leave',
    };
    sendNotification(userMasterID, notification, data);

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.leavecancel,
    });
  } catch (err) {
    await transaction.rollback();
    next(err.message);
  }
};

exports.requestCountforHRdashboard = async (req, res, next) => {
  try {
    const { companyMasterID, startdate, enddate } = await req.query;

    const user = [];
    const finaldata = {};

    const userdata = await EmployeeJoiningDetails.findAndCountAll({
      raw: true,
      where: {
        joiningDate: {
          [Sequelize.Op.lte]: enddate,
        },
        [Sequelize.Op.or]: [
          {
            leavingDate: { [Sequelize.Op.gte]: enddate },
          },
          {
            leavingDate: { [Sequelize.Op.eq]: null },
            [Sequelize.Op.or]: [
              {
                '$userMaster.deactiveDate$': { [Sequelize.Op.gte]: enddate },
              },
              {
                '$userMaster.deactiveDate$': { [Sequelize.Op.eq]: null },
              },
            ],
          },
        ],
        '$userMaster.companyMasterId$': companyMasterID,
        '$userMaster.status$': [0, 1],
      },
      include: [
        {
          model: UserMaster,
          required: true,
          ...accessibleUsers(req.userDetails),
        },
      ],
      order: [[{ model: UserMaster }, 'displayName', 'ASC']],
    });
    // const userdata = await getAllUserByCompanyDateWise(
    //   companyMasterID,
    //   '',
    //   '',
    //   enddate
    // );

    userdata.rows.map((e) => {
      user.push(e.userMasterID);
    });

    // Leave

    const leaveCount = await UserLeave.count({
      where: {
        userMasterID: user,
        status: 1,
        FromDate: { [Sequelize.Op.lte]: enddate },
        ToDate: { [Sequelize.Op.gte]: startdate },
      },
      group: ['authorizationStatus'],
    });

    let pendingLeave = 0,
      approvedLeave = 0,
      rejectedLeave = 0;

    leaveCount.map((e) => {
      if (
        e.authorizationStatus == 0 ||
        e.authorizationStatus == 1 ||
        e.authorizationStatus == 2
      ) {
        pendingLeave = +pendingLeave + +e.count;
      } else if (e.authorizationStatus == 3) {
        approvedLeave = +approvedLeave + +e.count;
      } else if (e.authorizationStatus == 4) {
        rejectedLeave = +rejectedLeave + +e.count;
      }
    });

    finaldata.pendingLeave = pendingLeave;
    finaldata.approvedLeave = approvedLeave;
    finaldata.rejectedLeave = rejectedLeave;

    // Expense

    const expenseCount = await UserExpenseTransaction.count({
      where: {
        status: 1,
      },
      include: [
        {
          model: UserExpense,
          as: 'userExpense',
          where: {
            userMasterID: user,
            expense_date: { [Sequelize.Op.between]: [startdate, enddate] },
            status: 1,
          },
        },
      ],
      group: ['userExpenseTransaction.authorizationStatus'],
    });

    let pendingExpense = 0,
      approvedExpense = 0,
      rejectedExpense = 0;

    expenseCount.map((e) => {
      if (
        e.authorizationStatus == 0 ||
        e.authorizationStatus == 1 ||
        e.authorizationStatus == 2
      ) {
        pendingExpense = +pendingExpense + +e.count;
      } else if (e.authorizationStatus == 3) {
        approvedExpense = +approvedExpense + +e.count;
      } else if (e.authorizationStatus == 4) {
        rejectedExpense = +rejectedExpense + +e.count;
      }
    });

    finaldata.pendingExpense = pendingExpense;
    finaldata.approvedExpense = approvedExpense;
    finaldata.rejectedExpense = rejectedExpense;

    // Overtime

    const overtimeCount = await overTimeCalculation.count({
      where: {
        OverTimeDate: {
          [Sequelize.Op.between]: [startdate, enddate],
        },
        UserMasterID: user,
      },
      group: ['AuthorizationRequired'],
    });

    let pendingOvertime = 0,
      approvedOvertime = 0,
      rejectedOvertime = 0;

    overtimeCount.map((e) => {
      if (
        e.AuthorizationRequired == 0 ||
        e.AuthorizationRequired == 1 ||
        e.AuthorizationRequired == 2
      ) {
        pendingOvertime = +pendingOvertime + +e.count;
      } else if (e.AuthorizationRequired == 3) {
        approvedOvertime = +approvedOvertime + +e.count;
      } else if (e.AuthorizationRequired == 4) {
        rejectedOvertime = +rejectedOvertime + +e.count;
      }
    });

    finaldata.pendingOvertime = pendingOvertime;
    finaldata.approvedOvertime = approvedOvertime;
    finaldata.rejectedOvertime = rejectedOvertime;

    // Loan

    // formatdate

    let a = new Date(enddate);

    a.setDate(a.getDate() + 1);

    const enddate1 = a.toISOString().slice(0, 10);

    const approvedLoan = await LoanMaster.count({
      where: {
        userMasterID: user,
        givenDate: {
          [Sequelize.Op.between]: [new Date(startdate), new Date(enddate1)],
        },
        status: 1,
        loanstatus: 1,
      },
    });

    const loanCount = await LoanMaster.count({
      where: {
        userMasterID: user,
        createdAt: {
          [Sequelize.Op.between]: [new Date(startdate), new Date(enddate1)],
        },
        status: 1,
        loanstatus: [0, 2],
      },
      group: ['loanstatus'],
    });

    let pendingLoan = 0,
      rejectedLoan = 0;

    loanCount.map((e) => {
      if (e.loanstatus == 0) {
        pendingLoan = +pendingLoan + +e.count;
      } else if (e.loanstatus == 2) {
        rejectedLoan = +rejectedLoan + +e.count;
      }
    });

    finaldata.pendingLoan = pendingLoan;
    finaldata.approvedLoan = approvedLoan;
    finaldata.rejectedLoan = rejectedLoan;

    // Advance

    const approvedAdvance = await advancePayment.count({
      where: {
        userMasterID: user,
        status: 1,
        advanceDate: {
          [Sequelize.Op.between]: [new Date(startdate), new Date(enddate1)],
        },
        AdvanceStatus: 1,
      },
    });

    const advanceCount = await advancePayment.count({
      where: {
        userMasterID: user,
        status: 1,
        createdAt: {
          [Sequelize.Op.between]: [new Date(startdate), new Date(enddate1)],
        },
        AdvanceStatus: [0, 2],
      },
      group: ['AdvanceStatus'],
    });

    let pendingAdvance = 0,
      rejectedAdvance = 0;

    advanceCount.map((e) => {
      if (e.AdvanceStatus == 0) {
        pendingAdvance = +pendingAdvance + +e.count;
      } else if (e.AdvanceStatus == 2) {
        rejectedAdvance = +rejectedAdvance + +e.count;
      }
    });

    finaldata.pendingAdvance = pendingAdvance;
    finaldata.approvedAdvance = approvedAdvance;
    finaldata.rejectedAdvance = rejectedAdvance;

    res.status(200).json({
      status: 200,
      data: finaldata,
    });
  } catch (err) {
    next(err);
  }
};

exports.leavedatashow = async (req, res, next) => {
  try {
    let {
      page,
      limit,
      companyMasterID,
      leavestatus,
      startdate,
      enddate,
      searchQuery,
      exportData,
      exportFileType,
    } = await req.body;

    let offset = (page - 1) * limit;
    const condition = {};

    if (leavestatus == 0) {
      leavestatus = [0, 1, 2];
    } else if (leavestatus == 1) {
      leavestatus = 3;
    } else if (leavestatus == 2) {
      leavestatus = 4;
    }

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          '$userMaster.displayName$': {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
        {
          '$userMaster.userNumber$': {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
      ];

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (leavestatus) condition.authorizationStatus = leavestatus;

    if (startdate && enddate) {
      condition.FromDate = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
    }

    condition.status = 1;

    const leavedata = await UserLeave.findAndCountAll({
      raw: true,
      limit: limit,
      offset: offset,
      where: condition,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: UserMaster,
          attributes: userAttributes,
          required: true,
          ...accessibleUsers(req.userDetails),
        },
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
        {
          model: HrLeaveTypes,
          attributes: [],
          include: [
            {
              model: HrLeaveMaster,
              as: 'LeaveMaster',
              attributes: ['LeaveDesc'],
            },
          ],
        },
      ],
    });

    const promises = leavedata.rows.map(async (row) => {
      const get_data = await userleavetransaction.findAll({
        where: {
          ReferenceID: row.UserLeaveApplicationID,
        },
        order: [['date', 'ASC']],
        include: [
          {
            model: HrLeaveTypes,
            include: [
              {
                model: HrLeaveMaster,
                as: 'LeaveMaster',
              },
            ],
          },
        ],
      });

      const leaveType = get_data.map((data) => ({
        date: data.date,
        leave: data.hrLeaveType.LeaveMaster.LeaveName,
        days: data.days,
      }));

      row['leave'] = leaveType;
    });

    await Promise.all(promises);

    async function processRow(row) {
      const [designation, department, branch, assignPersonName] =
        await Promise.all([
          employeeDesignation(row.userMasterID, new Date()),
          employeeDepartment(row.userMasterID, new Date()),
          employeeBranch(row.userMasterID, new Date()),
          getAssignPersonName(row),
        ]);

      return {
        UserName: row['userMaster.displayName'],
        UserNumber: row['userMaster.userNumber'],
        CompanyName: row['companyMaster.companyName'],
        BranchName: branch ? branch['branchMaster.branchName'] : '',
        Designation: designation
          ? designation['designation.designationName']
          : '',
        Department: department ? department['department.departmentName'] : '',
        Status: getStatus(row.authorizationStatus),
        AssignPersonName: assignPersonName.length !== 0 ? assignPersonName : '',
        FromDate: row.FromDate || '',
        ToDate: row.ToDate || '',
        LeaveType: row['hrLeaveType.LeaveMaster.LeaveDesc'] || '',
        LeaveDays: row.LeaveDays || '',
        DayType: row.DayType || '',
        Remark: row.Remark || '',
      };
    }

    async function getAssignPersonName(dataValues) {
      if ([0, 1, 2].includes(dataValues.authorizationStatus)) {
        const assignPersonData = await LeaveAuthorizationRequest.findAll({
          where: {
            ReferenceID: dataValues.UserLeaveApplicationID,
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
        leavedata.rows.map(processRow),
      );

      await generateExcel(
        updatedDownloadRows,
        'Company-Leave-Report',
        exportFileType,
        res,
      );
      return;
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Leave'),
      data: leavedata,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAuthorizationRequestByAuthorizationRequestId = async (
  req,
  res,
  next,
) => {
  try {
    let get_one_data = await LeaveAuthorizationRequest.findAll({
      where: {
        AuthorizationRequestId: req.params.id,
      },
      include: [
        {
          model: UserLeave,
          // attributes: ['UserLeaveApplicationID', 'LeaveTranId', 'userMasterID'],
        },
      ],
    });

    if (get_one_data && get_one_data.length > 0) {
      let auth_Criteria = await AuthorizationDetails.findOne({
        where: {
          userMasterID: get_one_data[0].userLeave.userMasterID,
          AuthorizationMasterID: authorizationMasterTypes.leave,
          status: 1,
        },
        raw: true,
        include: [
          {
            model: AuthorizationCriteria,
            attributes: [],
          },
        ],
        attributes: [
          [
            Sequelize.col('AuthorizationCriteriaMaster.AuthorizationCriteria'),
            'auth_Criteria',
          ],
        ],
      });

      return res.status(200).json({
        status: 200,
        data: get_one_data,
        auth_Criteria: auth_Criteria,
        message: message.usermessage.fetchMessage('data'),
      });
    } else {
      return res.status(200).json({
        status: 200,
        data: [],
        auth_Criteria: {},
        message: message.usermessage.fetchMessage('data'),
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.getApprovedAuthorizationRequestByUserLeaveApplicationID = async (
  req,
  res,
  next,
) => {
  try {
    const get_one_data = await ApprovedLeaveAuthorization.findAll({
      where: {
        UserLeaveApplicationID: req.params.id,
      },
      include: [
        {
          model: HrLeaveTypes,
          attributes: [],
          include: [
            {
              model: HrLeaveMaster,
              as: 'LeaveMaster',
              attributes: [],
            },
          ],
        },
        {
          required: false,
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: userAttributes,
        },
        {
          required: false,
          model: UserMaster,
          as: 'updatedByUserDetails',
          attributes: userAttributes,
        },
      ],
      order: [['date', 'ASC']],
      attributes: [
        'days',
        'date',
        'status',
        [Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'), 'LeaveName'],
        [Sequelize.col('hrLeaveType.leaveTypeChange'), 'leaveTypeChange'],
      ],
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getAdminOutdoorDutyAuthorizationRequest = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      limit,
      page,
      startdate,
      userMasterID,
      authorizationstatus,
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

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const condition = {
      status: 1,
    };

    if (userMasterID.length > 0) {
      condition.userMasterID = userMasterID;
    }

    if (startdate) {
      if (enddate == '' || enddate == undefined || enddate == null) {
        enddate = asiaKolkataDateTime(new Date()).slice(0, 10);
      }
      condition.FromDate = {
        [Sequelize.Op.between]: [startdate, enddate],
      };
    }

    if (authorizationstatus) {
      if (authorizationstatus == 1) {
        condition.authorizationStatus = [0, 1, 2];
      } else {
        condition.authorizationStatus = authorizationstatus;
      }
    } else {
      condition.authorizationStatus = [0, 1, 2];
    }

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const getAllLeaveRequest = await UserLeave.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: UserMaster,
          as: 'authorizer',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          attributes: ['displayName', 'userNumber', 'userMasterID', 'photo'],
          where: {
            ...where,
            companyMasterId: companyMasterID,
            status: 1,
          },
          include: [
            ...includeModels,
            {
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              model: AuthorizationDetails,
              where: {
                status: 1,
                AuthorizationMasterID: authorizationMasterTypes.leave, // fot Leave
              },
              attributes: ['AuthorizationCriteriaID'],
              separate: true,
              include: [
                {
                  model: AuthorizationCriteriaMaster,
                  attributes: ['AuthorizationCriteria'],
                },
              ],
            },
            {
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
            // {
            //   required: false,
            //   model: EmployeeDivision,
            //   where: {
            //     status: 1,
            //     startDate: { [Sequelize.Op.lte]: filterDate },
            //     [Sequelize.Op.or]: [
            //       { endDate: { [Sequelize.Op.gte]: filterDate } },
            //       { endDate: { [Sequelize.Op.eq]: null } },
            //     ],
            //   },

            //   attributes: ['divisionId', 'startDate'],
            //   include: [
            //     {
            //       model: Division,
            //       attributes: ['divisionName'],
            //     },
            //   ],
            // },
            // {
            //   required: false,

            //   model: EmployeeWorkingArea,
            //   where: {
            //     status: 1,
            //     startDate: { [Sequelize.Op.lte]: filterDate },
            //     [Sequelize.Op.or]: [
            //       { endDate: { [Sequelize.Op.gte]: filterDate } },
            //       { endDate: { [Sequelize.Op.eq]: null } },
            //     ],
            //   },

            //   attributes: ['workingAreaId', 'startDate'],
            //   include: [
            //     {
            //       model: WorkingArea,
            //       attributes: ['workingAreaName'],
            //     },
            //   ],
            // },
          ],
        },
        {
          required: true,
          model: HrLeaveTypes,
          where: { LeaveID: 25, status: 1 },
          // attributes: [],
        },
        {
          separate: true,
          required: false,
          model: userleavetransaction,
          include: [
            {
              model: HrLeaveTypes,
              attributes: [],
              include: [
                {
                  model: HrLeaveMaster,
                  as: 'LeaveMaster',
                  attributes: [],
                },
              ],
            },
          ],
          order: [['date', 'ASC']],
          attributes: [
            'days',
            'date',
            'status',
            [Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'), 'LeaveName'],
          ],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: getAllLeaveRequest.rows,
      totalcount: getAllLeaveRequest.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptRejectOutdoorDutyAdmin = async (req, res, next) => {
  try {
    const { UserLeaveApplicationID, authstatus, rejectionRemarks } = req.body;
    let authorizedCount = 0;

    if (!UserLeaveApplicationID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Leave Application '),
      });
    }

    const allowedKeys = [
      'UserLeaveApplicationID',
      'authstatus',
      'rejectionRemarks',
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

    const odAuthorizationIDList = [
      ...new Set(
        Array.isArray(UserLeaveApplicationID)
          ? UserLeaveApplicationID
          : [UserLeaveApplicationID],
      ),
    ];

    const Op = Sequelize.Op;
    const isReject = authstatus == 0;

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const getLeaveApplicationList = await UserLeave.findAll({
      where: { UserLeaveApplicationID: odAuthorizationIDList, status: 1 },
      attributes: [
        'UserLeaveApplicationID',
        'authorizationStatus',
        'userMasterID',
        'FromDate',
        'ToDate',
        'LeaveTranId',
        'DayType',
      ],
      include: [
        {
          required: true,
          model: UserMaster,
          where: { ...userAccessCondition.where },
          include: [...userAccessCondition.includeModels],
        },
      ],
    });

    if (!getLeaveApplicationList.length) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('User Leave'),
      });
    }

    // ---------------- BULK PRE-FETCH (read-only, no transaction needed) ----------------

    const allUserIds = [
      ...new Set(getLeaveApplicationList.map((e) => e.userMasterID)),
    ];
    const globalStart = new Date(
      Math.min(...getLeaveApplicationList.map((e) => new Date(e.FromDate))),
    );
    const globalEnd = new Date(
      Math.max(...getLeaveApplicationList.map((e) => new Date(e.ToDate))),
    );

    const effectiveWhere = (startKey) => ({
      status: 1,
      [startKey]: { [Op.lte]: globalEnd },
      [Op.or]: [
        { endDate: { [Op.gte]: globalStart } },
        { endDate: { [Op.eq]: null } },
      ],
    });

    const [allAuthData, allUsersInfo, verifiedMonths] = await Promise.all([
      LeaveAuthorizationRequest.findAll({
        where: { ReferenceID: odAuthorizationIDList },
      }),

      UserMaster.findAll({
        where: { userMasterID: allUserIds },
        include: [
          { model: EmployeeJoiningDetails, attributes: ['payrollFrequency'] },
          {
            required: false,
            model: attendanceTransaction,
            where: {
              AttendanceDate: { [Op.between]: [globalStart, globalEnd] },
            },
          },
          {
            required: false,
            model: ShiftRoster,
            where: {
              status: 1,
              shiftRosterDate: { [Op.between]: [globalStart, globalEnd] },
            },
          },
          {
            required: false,
            separate: true,
            model: EmployeeAttendancePolicy,
            where: effectiveWhere('startDate'),
            attributes: ['attendancePolicyID', 'startDate', 'endDate'],
            include: [{ model: AttendancePolicy, as: 'attendancePolicy' }],
          },
          {
            required: false,
            model: EmployeeShift,
            where: effectiveWhere('startDate'),
          },
          {
            required: false,
            model: EmployeeSalaryPolicy,
            as: 'empSalPolicy',
            where: effectiveWhere('startDate'),
            attributes: ['salaryPolicyID', 'startDate', 'endDate'],
            include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
          },
          {
            model: employeeHolidayPolicy,
            required: false,
            where: effectiveWhere('applicableDate'),
            attributes: ['holidayPolicyID', 'applicableDate', 'endDate'],
            include: [
              {
                model: holidayPolicy,
                as: 'HolidayPolicy',
                attributes: ['holidayPolicyID'],
                required: false,
                include: [
                  {
                    model: HolidayCompensationRule,
                    separate: true,
                    required: false,
                  },
                ],
              },
            ],
          },
        ],
      }),

      // verified months only matter on approve
      isReject
        ? Promise.resolve([])
        : HrLeaveMonthTrans.findAll({
            where: {
              userMasterID: allUserIds,
              verified: 1,
              monthstartdate: { [Op.lte]: globalEnd },
              monthenddate: { [Op.gte]: globalStart },
            },
            raw: true,
          }),
    ]);

    const userInfoMap = new Map(allUsersInfo.map((u) => [u.userMasterID, u]));

    const authIdsByApplication = new Map();
    for (const a of allAuthData) {
      const list = authIdsByApplication.get(a.ReferenceID) || [];
      list.push(a.AuthorizationRequestId);
      authIdsByApplication.set(a.ReferenceID, list);
    }

    const allShiftIds = [
      ...new Set(
        allUsersInfo.flatMap((u) => {
          const empShift = u.employeeShifts?.[0];
          const empShiftIds = empShift
            ? empShift.shiftID
              ? [empShift.shiftID]
              : empShift.shiftsID || []
            : [];
          return [
            ...(u.attendanceTransactions || []).map((e) => e.Shift),
            ...(u.shiftRosters || []).map((e) => e.shiftID),
            ...empShiftIds,
          ];
        }),
      ),
    ].filter(Boolean);

    const [allShiftData, existingODData] = await Promise.all([
      Shift.findAll({
        where: { shiftID: { [Op.in]: allShiftIds } },
        attributes: ['shiftID', 'shiftGrace'],
        include: [{ model: ShiftTIme }],
      }),
      UserLeaveTransaction.findAll({
        where: {
          date: { [Op.between]: [globalStart, globalEnd] },
          status: 1,
        },
        include: [
          { model: HrLeaveTypes, where: { LeaveID: 25 }, attributes: [] },
          {
            model: UserLeave,
            where: { userMasterID: allUserIds },
            attributes: ['DayType', 'userMasterID'],
          },
        ],
      }),
    ]);

    const shiftMap = new Map(allShiftData.map((s) => [s.shiftID, s]));

    // updated after each commit so later requests of the same user see earlier ones
    const allODData = [...existingODData];

    const pickActive = (list = [], refDate, startKey = 'startDate') =>
      list.find(
        (p) =>
          new Date(p[startKey]) <= new Date(refDate) &&
          (!p.endDate || new Date(p.endDate) >= new Date(refDate)),
      ) || null;

    const isAttendanceVerified = (userId, payrollFrequency, dates) =>
      verifiedMonths.some(
        (m) =>
          m.userMasterID == userId &&
          m.payrollFrequency == payrollFrequency &&
          dates.some(
            (d) =>
              new Date(m.monthstartdate) <= new Date(d) &&
              new Date(m.monthenddate) >= new Date(d),
          ),
      );

    // ---------------- SKIPPED TRACKING ----------------

    const skippedMap = new Map();

    const addSkipped = (name, reason) => {
      const key = `${name}__${reason}`;
      if (skippedMap.has(key)) {
        skippedMap.get(key).count++;
      } else {
        skippedMap.set(key, { name, reason, count: 1 });
      }
    };

    // ids not found / no access
    const foundIds = new Set(
      getLeaveApplicationList.map((e) => String(e.UserLeaveApplicationID)),
    );
    for (const id of odAuthorizationIDList) {
      if (!foundIds.has(String(id))) {
        addSkipped(`Application ID: ${id}`, 'Outdoor Duty Request not found');
      }
    }

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const notifyData = { screen: 'outDoorDutyAuth' };

    // ---------------- MAIN LOOP — one transaction per request ----------------

    for (const getLeaveApplication of getLeaveApplicationList) {
      const applicationId = getLeaveApplication.UserLeaveApplicationID;
      const userMasterID = getLeaveApplication.userMasterID;
      const userinfo = userInfoMap.get(+userMasterID);
      const employeeName =
        userinfo?.displayName || `Unknown (ID: ${userMasterID})`;

      if (
        getLeaveApplication.authorizationStatus == 3 ||
        getLeaveApplication.authorizationStatus == 4
      ) {
        addSkipped(
          employeeName,
          getLeaveApplication.authorizationStatus == 3
            ? 'Outdoor Duty Request Already Approved'
            : 'Outdoor Duty Request Already Rejected',
        );
        continue;
      }
      if (!userinfo) {
        addSkipped(employeeName, 'User not found');
        continue;
      }

      const startDate = getLeaveApplication.FromDate;
      const endDate = getLeaveApplication.ToDate;

      // build OD day rows (pure computation, needed for the verified check)
      const start = new Date(startDate);
      const end = new Date(endDate);
      const leavetransaction = [];
      while (start <= end) {
        leavetransaction.push({
          ReferenceID: applicationId,
          LeaveTranId: getLeaveApplication.LeaveTranId,
          days: getLeaveApplication.DayType == 'Full Day' ? 1 : 0.5,
          date: start.toISOString().split('T')[0],
          issandwichleave: 0,
          status: 1,
        });
        start.setDate(start.getDate() + 1);
      }

      if (!isReject) {
        const payrollFrequency =
          userinfo.employeeJoiningDetails?.[0]?.payrollFrequency ||
          PayrollFrequencyType.MONTHLY;

        if (
          isAttendanceVerified(
            userMasterID,
            payrollFrequency,
            leavetransaction.map((l) => l.date),
          )
        ) {
          addSkipped(
            employeeName,
            'Attendance already verified. So can not approve Outdoor Duty',
          );
          continue;
        }
      }

      const transaction = await sequelize.transaction();
      try {
        await UserInbox.destroy({
          where: {
            activityTable: 'outdoorDutyAuthorizations',
            activityTablePK: authIdsByApplication.get(applicationId) || [],
          },
          transaction,
        });

        await UserLeave.update(
          {
            authorizationStatus: isReject ? 4 : 3,
            authorizedBy: createBy,
            authorizedAt: new Date(),
            isAuthorizedBy: true,
            authorizerRemark: rejectionRemarks,
          },
          { where: { UserLeaveApplicationID: applicationId }, transaction },
        );

        if (!isReject) {
          await UserLeaveTransaction.bulkCreate(leavetransaction, {
            transaction,
          });
        }

        // ---------------- OD on weekoff / holiday ----------------
        const attendancePolicy =
          pickActive(userinfo.employeeAttendancePolicies, endDate)
            ?.attendancePolicy || null;
        const salaryPolicy =
          pickActive(userinfo.empSalPolicy, endDate)?.salaryPolicy || null;

        if (attendancePolicy) {
          const inRange = (d) =>
            new Date(d) >= new Date(startDate) &&
            new Date(d) <= new Date(endDate);

          const allAttendance = (userinfo.attendanceTransactions || []).filter(
            (e) => inRange(e.AttendanceDate),
          );
          const allShiftRoster = (userinfo.shiftRosters || []).filter((e) =>
            inRange(e.shiftRosterDate),
          );
          const empShift = pickActive(userinfo.employeeShifts, endDate);
          const empShiftIds = empShift
            ? empShift.shiftID
              ? [empShift.shiftID]
              : empShift.shiftsID || []
            : [];

          const userODData = allODData.filter(
            (e) => e.userLeave?.userMasterID == userMasterID,
          );

          const otAdded =
            salaryPolicy?.salarycalculationBasedon == 'hourwise'
              ? salaryPolicy?.overtimeAdded
              : overtimeAddedEnum.DAILY;
          const monthlyOtCalType =
            otAdded == overtimeAddedEnum.MONHTLY
              ? salaryPolicy.monthly_ot_cal_type
              : null;

          const typeCondition =
            attendancePolicy?.WHPHPriority == 'PH' ? "'holiday'" : "'weekoff'";
          const holidayCoffRuleIn = attendancePolicy?.holidayCoffRuleIn;

          const holidayPol = pickActive(
            userinfo.employeeHolidayPolicies,
            endDate,
            'applicableDate',
          );
          const allHolidayCompensationRules =
            holidayPol?.HolidayPolicy?.holidayCompensationRules || [];

          for (const row of leavetransaction) {
            const date = row.date;

            const holidayCompensationRules = allHolidayCompensationRules.find(
              (item) => (item.holidayDate || []).includes(date),
            );

            const checkWH = await getWeekoffHoliday(
              userMasterID,
              date,
              typeCondition,
              transaction,
            );

            const weekoffType = checkWH?.tableName || null;
            const attendanceData = allAttendance.find(
              (e) => e.AttendanceDate == date,
            );

            if (!checkWH || attendanceData?.fulldayhalfday == 1) continue;

            await deleteOvertimeCoff(userMasterID, date, transaction);

            const odData = userODData.find((e) => e.date == date) || null;
            const odDays = (+odData?.days || 0) + +row.days;

            row.userLeave = { DayType: getLeaveApplication.DayType };

            const finalODData = [];
            if (odData) finalODData.push(odData);
            finalODData.push(row);

            const day = new Date(date).toLocaleString('en-us', {
              weekday: 'long',
            });

            let minutes = 0;

            if (attendanceData) {
              const shift = shiftMap.get(+attendanceData.Shift);
              const shiftTime = (shift?.shiftTimes || []).find(
                (e) => e.day == day,
              );
              const shiftGrace = +attendanceData.roundOffMinutes;

              minutes += +calculateWeekoffMinutes(
                checkWH,
                attendancePolicy,
                attendanceData,
                shiftTime,
                shiftGrace,
              );

              // absent
              if (+attendanceData.fulldayhalfday == 0) {
                if (checkWH.value == 0.5) {
                  const checkSecondHalfOD = finalODData.find((e) =>
                    ['Full Day', 'Second Half'].includes(e.userLeave.DayType),
                  );
                  minutes += checkSecondHalfOD
                    ? Math.round(+shiftTime.totalhours * 60) -
                      Math.round(+shiftTime.totalhourshalfday * 60)
                    : 0;
                } else {
                  minutes +=
                    odDays == 0.5
                      ? Math.round(+shiftTime.totalhourshalfday * 60)
                      : Math.round(+shiftTime.totalhours * 60);
                }
              }

              // half day
              if (+attendanceData.fulldayhalfday == 0.5) {
                let presentInFH = false;
                let presentInSH = false;

                if (
                  new Date(attendanceData.InDatetime) <
                  new Date(date + ' ' + shiftTime.firsthalfendtime)
                )
                  presentInFH = true;

                if (
                  new Date(attendanceData.OutDateTime) >=
                  new Date(date + ' ' + shiftTime.endtime)
                )
                  presentInSH = true;

                if (presentInFH && !presentInSH) {
                  const checkSecondHalfOD = finalODData.find((e) =>
                    ['Full Day', 'Second Half'].includes(e.userLeave.DayType),
                  );
                  minutes += checkSecondHalfOD
                    ? Math.round(+shiftTime.totalhours * 60) -
                      Math.round(+shiftTime.totalhourshalfday * 60)
                    : 0;
                } else if (!presentInFH && presentInSH) {
                  const checkFirstHalfOD = finalODData.find((e) =>
                    ['Full Day', 'First Half'].includes(e.userLeave.DayType),
                  );
                  minutes += checkFirstHalfOD
                    ? Math.round(+shiftTime.totalhourshalfday * 60)
                    : 0;
                } else if (!presentInFH && !presentInSH) {
                  minutes += Math.round(+shiftTime.totalhourshalfday * 60);
                }
              }
            } else {
              // attendance not found
              let shiftId =
                allShiftRoster.find((e) => e.shiftRosterDate == date)
                  ?.shiftID || null;
              if (!shiftId) shiftId = empShiftIds[0];
              if (!shiftId) continue;

              const shiftTime = (shiftMap.get(+shiftId)?.shiftTimes || []).find(
                (e) => e.day == day,
              );
              if (!shiftTime) continue;

              if (checkWH.value == 0.5) {
                const checkSecondHalfOD = finalODData.find((e) =>
                  ['Full Day', 'Second Half'].includes(e.userLeave.DayType),
                );
                minutes += checkSecondHalfOD
                  ? Math.round(+shiftTime.totalhours * 60) -
                    Math.round(+shiftTime.totalhourshalfday * 60)
                  : 0;
              } else {
                minutes +=
                  odDays == 0.5
                    ? Math.round(+shiftTime.totalhourshalfday * 60)
                    : Math.round(+shiftTime.totalhours * 60);
              }
            }

            await add_OD_On_weekOff_Coff_OT_ED(
              attendancePolicy,
              attendanceData,
              userinfo.companyMasterId,
              createBy,
              createByIp,
              minutes,
              transaction,
              minutes,
              0,
              userMasterID,
              date,
              otAdded,
              monthlyOtCalType,
              weekoffType,
              holidayCoffRuleIn,
              holidayCompensationRules,
            );
          }
        }

        await transaction.commit();
        authorizedCount++;

        // make this approved OD visible to later requests of the same user
        if (!isReject) {
          for (const row of leavetransaction) {
            allODData.push({
              date: row.date,
              days: row.days,
              userLeave: {
                DayType: getLeaveApplication.DayType,
                userMasterID,
              },
            });
          }
        }

        // notify only after commit
        try {
          sendNotification(
            userMasterID,
            {
              title: 'Outdoor Duty',
              body: isReject
                ? 'Outdoor Duty rejected successfully'
                : 'Outdoor Duty approved successfully',
            },
            notifyData,
          );
        } catch (notifyErr) {
          console.error('OD notification failed', applicationId, notifyErr);
        }
      } catch (err) {
        if (!transaction.finished) await transaction.rollback();
        console.error('OD accept/reject failed', applicationId, err);
        addSkipped(employeeName, err.message || 'Something went wrong');
      }
    }

    // ---------------- RESPONSE ----------------

    const skippedList = Array.from(skippedMap.values());

    const successMsg = isReject
      ? 'Outdoor Duty Request Rejected Successfully'
      : 'Outdoor Duty Request Approved Successfully';

    const responseMessage = skippedList.length ? null : successMsg;

    return res.status(200).json({
      status: responseMessage ? 200 : 400,
      message: responseMessage,
      skippedUser: responseMessage ? null : skippedList,
      skippedCount: odAuthorizationIDList.length - authorizedCount,
      authorizedCount,
      totalRequests: odAuthorizationIDList.length,
    });
  } catch (error) {
    next(error);
  }
};

exports.adminLeaveAuthorizationRequest = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      limit,
      page,
      startdate,
      userMasterID,
      authorizationstatus,
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

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const condition = {
      status: 1,
    };

    if (userMasterID.length > 0) {
      condition.userMasterID = userMasterID;
    }

    if (startdate) {
      if (enddate == '' || enddate == undefined || enddate == null) {
        enddate = asiaKolkataDateTime(new Date()).slice(0, 10);
      }
      condition.FromDate = {
        [Sequelize.Op.between]: [startdate, enddate],
      };
    }

    if (authorizationstatus) {
      if (authorizationstatus == 1) {
        condition.authorizationStatus = [0, 1, 2];
      } else {
        condition.authorizationStatus = authorizationstatus;
      }
    } else {
      condition.authorizationStatus = [0, 1, 2];
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const getAllLeaveRequest = await UserLeave.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: UserMaster,
          as: 'authorizer',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'updatedByUserDetails',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          attributes: ['displayName', 'userNumber', 'userMasterID', 'photo'],
          where: {
            companyMasterId: companyMasterID,
            status: 1,
            ...userAccessCondition.where,
          },
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              model: AuthorizationDetails,
              where: {
                status: 1,
                AuthorizationMasterID: authorizationMasterTypes.leave, // fot Leave
              },
              attributes: ['AuthorizationCriteriaID'],
              separate: true,
              include: [
                {
                  model: AuthorizationCriteriaMaster,
                  attributes: ['AuthorizationCriteria'],
                },
              ],
            },
            {
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
              model: EmployeeDivision,
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: filterDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: filterDate } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },

              attributes: ['divisionId'],
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
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: filterDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: filterDate } },
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
          ],
        },
        {
          required: true,
          model: HrLeaveTypes,
          where: { LeaveID: { [Sequelize.Op.ne]: 25 } },
          attributes: ['LeaveID'],
          include: [
            {
              model: HrLeaveMaster,
              as: 'LeaveMaster',
              attributes: ['LeaveName'],
            },
          ],
        },
        {
          separate: true,
          required: false,
          model: userleavetransaction,
          include: [
            {
              model: HrLeaveTypes,
              attributes: [],
              include: [
                {
                  model: HrLeaveMaster,
                  as: 'LeaveMaster',
                  attributes: [],
                },
              ],
            },
          ],
          order: [['date', 'ASC']],
          attributes: [
            'days',
            'date',
            'status',
            [Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'), 'LeaveName'],
          ],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: getAllLeaveRequest.rows,
      totalcount: getAllLeaveRequest.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptRejectLeaveAdmin = async (req, res, next) => {
  try {
    const {
      UserLeaveApplicationID,
      authstatus,
      authorizerRemark,
      leavetransaction,
      authBy = AuthByEnum.SINGLE,
    } = await req.body;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    let authorizedCount = 0;
    const skippedMap = new Map();

    const addSkipped = (name, reason) => {
      const key = `${name}__${reason}`;
      if (skippedMap.has(key)) {
        skippedMap.get(key).count++;
      } else {
        skippedMap.set(key, { name, reason, count: 1 });
      }
    };

    const leaveApplicationID = !Array.isArray(UserLeaveApplicationID)
      ? [UserLeaveApplicationID]
      : UserLeaveApplicationID;

    const bailOut = async (transaction, name, reason) => {
      await transaction.rollback();
      if (authBy !== AuthByEnum.MULTIPLE) {
        return {
          respond: true,
          payload: { status: statusCodes.BAD_REQUEST, message: reason },
        };
      }
      addSkipped(name, reason);
      return { respond: false };
    };

    const currentDate = moment().format('YYYY-MM-DD');

    const allUserLeaveData = await UserLeave.findAll({
      where: {
        UserLeaveApplicationID: leaveApplicationID,
      },
      include: [
        {
          model: LeaveAuthorizationRequest,
          attributes: ['AuthorizationRequestId'],
        },
        {
          model: HrLeaveTypes,
          attributes: ['LeaveID'],
        },
        {
          model: UserMaster,
          attributes: [
            'userMasterID',
            'displayName',
            'userNumber',
            'companyMasterId',
          ],
          include: [
            {
              model: EmployeeJoiningDetails,
              as: 'emp_join',
              attributes: ['payrollFrequency'],
            },
            {
              required: false,
              separate: true,
              model: empLeavePolicy,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
                  { endDate: null },
                ],
              },
            },
          ],
        },
      ],
      attributes: [
        'UserLeaveApplicationID',
        'authorizationStatus',
        'userMasterID',
        'FromDate',
        'ToDate',
        'LeaveTranId',
        'DayType',
        'status',
        'LeaveDays',
      ],
    });

    const data = {
      screen: 'leave',
    };

    for (const userLeave of allUserLeaveData) {
      const transaction = await sequelize.transaction();
      try {
        const userData = userLeave.userMaster || null;
        if (!userData) {
          const outcome = await bailOut(
            transaction,
            'Not found',
            'User not found',
          );
          if (outcome.respond) {
            return res.status(statusCodes.OK).json(outcome.payload);
          }
          continue;
        }

        if (userLeave.status != 1) {
          const outcome = await bailOut(
            transaction,
            userData.displayName,
            `Leave is deleted (${userLeave.FromDate} - ${userLeave.ToDate}) `,
          );
          if (outcome.respond) {
            return res.status(statusCodes.OK).json(outcome.payload);
          }
          continue;
        }

        if (
          [
            AuthorizationStatusType.APPROVED,
            AuthorizationStatusType.REJECTED,
          ].includes(+userLeave.authorizationStatus)
        ) {
          const reason = `Leave Request (${userLeave.FromDate} - ${userLeave.ToDate}) already ${
            userLeave.authorizationStatus == AuthorizationStatusType.APPROVED
              ? 'Approved'
              : 'Rejected'
          }.`;
          const outcome = await bailOut(
            transaction,
            userData.displayName || 'Unknown User',
            reason,
          );
          if (outcome.respond) {
            return res.status(statusCodes.OK).json(outcome.payload);
          }
          continue;
        }

        let coffAvailableBalance = [];
        let allUsedCoffTrans = [];
        let userleaveTrans = leavetransaction || [];

        // ---- Accepted-path validation (balances, attendance lock, clubbing) ----
        if (authstatus == authStatusTypeObj.APPROVED) {
          if (authBy == AuthByEnum.MULTIPLE || userleaveTrans.length == 0) {
            userleaveTrans = getAllSingleDayLeave(
              [userLeave],
              createBy,
              createByIp,
            ).map((e) => ({
              ...e,
              leaveID: userLeave.hrLeaveType?.LeaveID,
              userMasterID: userLeave.userMasterID,
            }));
          } else {
            userleaveTrans = userleaveTrans.map((e) => ({
              ...e,
              createBy,
              createByIp,
            }));
          }

          const sortedTransaction = [...userleaveTrans].sort(
            (a, b) => new Date(a.date) - new Date(b.date),
          );

          const leavePolicyIds =
            userData?.empLeavePolicies?.[0]?.employeeLeavePolicyID || [];

          const approveMessage = await checkApproveLeaveRequest(
            leavePolicyIds,
            sortedTransaction,
            userData?.companyMasterId,
            userData?.userMasterID,
          );

          if (approveMessage) {
            const outcome = await bailOut(
              transaction,
              userData.displayName,
              approveMessage,
            );
            if (outcome.respond) {
              return res.status(statusCodes.OK).json(outcome.payload);
            }
            continue;
          }

          const payrollFrequency =
            userData.emp_join?.[0]?.payrollFrequency ||
            PayrollFrequencyType.MONTHLY;
          const allDates = sortedTransaction.map((e) => e.date);

          const attendanceCal = await HrLeaveMonthTrans.count({
            where: {
              userMasterID: userData.userMasterID,
              [Sequelize.Op.or]: allDates.map((e) => ({
                monthstartdate: { [Sequelize.Op.lte]: e },
                monthenddate: { [Sequelize.Op.gte]: e },
              })),
              payrollFrequency,
              verified: 1,
            },
          });

          if (attendanceCal > 0) {
            const outcome = await bailOut(
              transaction,
              userData.displayName,
              'Attendance already verified.',
            );
            if (outcome.respond) {
              return res.status(statusCodes.OK).json(outcome.payload);
            }
            continue;
          }

          const userCompany = userData.companyMasterId;
          const leavePolicy = await getemployeeLeavePolicy(
            userLeave.userMasterID,
            currentDate,
          );

          let isbackDatedCoffAllowed = true;
          const coffLeavePolicy = leavePolicy.find((e) => e.leaveId == 6);
          if (coffLeavePolicy) {
            isbackDatedCoffAllowed = coffLeavePolicy.allowCoffBackdate;
          }

          const userleaveBalance = await employeeeLeaveBalance(
            userCompany,
            userData.userMasterID,
          );

          const totals = {};
          for (const item of userleaveTrans) {
            if (+item.days > 0) {
              totals[item.LeaveTranId] =
                (totals[item.LeaveTranId] || 0) + +item.days;
            }
            if (+item?.days1 > 0) {
              totals[item.LeaveTranId1] =
                (totals[item.LeaveTranId1] || 0) + +item.days1;
            }
          }

          const formattedData = Object.entries(totals).map(
            ([LeaveTranId, totalDays]) => ({
              LeaveTranId: +LeaveTranId,
              totalDays,
            }),
          );

          const notSufficientbalance = [];
          let coffTempAvailableBalance = [];
          let notSufficientCoffBalance = false;

          for (const data of formattedData) {
            const balanceData = userleaveBalance.find(
              (e) => e.LeaveTranId == data.LeaveTranId,
            );
            if (!balanceData) continue;

            if (balanceData.LeaveID == 6) {
              for (const trans of sortedTransaction) {
                let leaveDays = 0;
                if (
                  trans.days > 0 &&
                  trans.LeaveTranId == balanceData.LeaveTranId
                )
                  leaveDays += +trans.days;
                if (
                  trans.days1 > 0 &&
                  trans.LeaveTranId1 == balanceData.LeaveTranId
                )
                  leaveDays += +trans.days1;
                if (leaveDays == 0) continue;

                const {
                  allBalanceData: allBalanceDataTemp,
                  remaining,
                  usedTransactionLog,
                  isBackDatedCoffReason,
                } = await checkCoffBalanceProcess(
                  coffTempAvailableBalance,
                  trans.userMasterID,
                  trans.date,
                  leaveDays,
                  isbackDatedCoffAllowed,
                );

                if (remaining > 0 && isBackDatedCoffReason) {
                  notSufficientCoffBalance = true;
                  break;
                }

                allUsedCoffTrans = [...allUsedCoffTrans, ...usedTransactionLog];
                coffTempAvailableBalance = [...allBalanceDataTemp];

                const filteredData = coffAvailableBalance.filter(
                  (e) =>
                    !coffTempAvailableBalance
                      .map((c) => +c.LeaveBalTranId)
                      .includes(+e.LeaveBalTranId),
                );
                coffAvailableBalance = [
                  ...filteredData,
                  ...coffTempAvailableBalance,
                ];

                if (remaining > 0) {
                  notSufficientbalance.push(balanceData.leaveName);
                  break;
                }
              }
            } else {
              const balance = balanceData.Balance || 0;
              if (+balance < +data.totalDays) {
                notSufficientbalance.push(balanceData.leaveName);
                break;
              }
            }
          }

          if (notSufficientCoffBalance) {
            const reason = `You do not have sufficient COFF balance for the selected date (${userLeave.FromDate} - ${userLeave.ToDate}).`;
            const outcome = await bailOut(
              transaction,
              userData.displayName,
              reason,
            );
            if (outcome.respond) {
              return res.status(statusCodes.OK).json(outcome.payload);
            }
            continue;
          }

          if (notSufficientbalance.length > 0) {
            const reason = `You don't have sufficient leave balance of ${notSufficientbalance[0]}.`;
            const outcome = await bailOut(
              transaction,
              userData.displayName,
              reason,
            );
            if (outcome.respond) {
              return res.status(statusCodes.OK).json(outcome.payload);
            }
            continue;
          }

          const leaveTranData = [];
          const leaveTranData1 = [];
          for (const item of userleaveTrans) {
            leaveTranData.push({
              ...item,
              LeaveTranId: item.LeaveTranId,
              days: item.days,
            });
            if (item.days1 > 0) {
              leaveTranData1.push({
                ...item,
                LeaveTranId: item.LeaveTranId1,
                days: item.days1,
                leaveID: item.leaveID1,
              });
            }
          }

          const isNotClubbingAllowed = await allowClubbedLeave(
            leavePolicy,
            [...leaveTranData, ...leaveTranData1],
            false,
          );
          if (isNotClubbingAllowed) {
            const outcome = await bailOut(
              transaction,
              userData.displayName,
              isNotClubbingAllowed,
            );
            if (outcome.respond) {
              return res.status(statusCodes.OK).json(outcome.payload);
            }
            continue;
          }
        }

        const allAuthIds = (userLeave.leaveAuthorizations || []).map(
          (e) => e.AuthorizationRequestId,
        );

        await UserInbox.destroy({
          where: {
            activityTable: LeaveAuthorizationRequest.getTableName(),
            activityTablePK: allAuthIds,
          },
          transaction,
        });
        await UserLeave.update(
          {
            authorizationStatus:
              authstatus == authStatusTypeObj.REJECTED
                ? AuthorizationStatusType.REJECTED
                : AuthorizationStatusType.APPROVED,
            authorizedBy: createBy,
            authorizedAt: new Date(),
            isAuthorizedBy: true,
            authorizerRemark,
            updateBy: createBy,
          },
          {
            where: { UserLeaveApplicationID: userLeave.UserLeaveApplicationID },
            transaction,
          },
        );
        if (authstatus == authStatusTypeObj.REJECTED) {
          const notification = {
            title: 'Leave',
            body: 'Leave rejected successfully',
          };

          sendNotification(userLeave.userMasterID, notification, data);

          const dataObject = {
            NoOfDays: userLeave.LeaveDays,
            FromDate: userLeave.FromDate,
            ToDate: userLeave.ToDate,
            LeaveType: [userLeave.LeaveTranId],
            rejectedUserList: [createBy],
            RejectedReason: authorizerRemark,
          };

          sendAcceptRejectMail(
            'Leave Reject Email Template',
            dataObject,
            userLeave.userMasterID,
          );
        } else {
          // update coff available balance
          if (coffAvailableBalance.length > 0) {
            await Promise.all(
              coffAvailableBalance.map((data) =>
                HrLeaveBalance.update(
                  {
                    availBal: data.availBal,
                  },
                  {
                    where: { LeaveBalTranId: data.LeaveBalTranId },
                    transaction,
                  },
                ),
              ),
            );
          }

          // add used coff transaction
          if (allUsedCoffTrans.length) {
            await UsedCoffTransaction.bulkCreate(allUsedCoffTrans, {
              user: req.userDetails,
              individualHooks: true,
              transaction,
            });
          }

          const notification = {
            title: 'Leave',
            body: 'Leave accepted successfully',
          };
          await UserLeaveTransaction.bulkCreate(userleaveTrans, {
            transaction,
          });
          sendNotification(userLeave.userMasterID, notification, data);

          const dataObject = {
            NoOfDays: userLeave.LeaveDays,
            FromDate: userLeave.FromDate,
            ToDate: userLeave.ToDate,
            LeaveType: userleaveTrans.map((e) => e.LeaveTranId),
            acceptedUserList: [createBy],
          };

          sendAcceptRejectMail(
            'Leave Accept Email Template',
            dataObject,
            userLeave.userMasterID,
          );
        }

        await transaction.commit();
        authorizedCount++;
      } catch (error) {
        await transaction.rollback();
        throw new Error(
          'Error in admin leave authorization request: ' +
            (error.stack || error.message),
        );
      }
    }

    const skippedList = Array.from(skippedMap.values());

    return res.status(statusCodes.OK).json({
      status: skippedList.length ? statusCodes.BAD_REQUEST : statusCodes.OK,
      message:
        skippedList.length === 0
          ? authstatus == authStatusTypeObj.APPROVED
            ? message.usermessage.acceptMesaage('Leave Authorization Request')
            : message.usermessage.rejectMessage('Leave Authorization Request')
          : null,
      skippedUser: skippedList.length ? skippedList : null,
      authorizedCount,
      skippedCount: UserLeaveApplicationID.length - authorizedCount,
      totalRequests: UserLeaveApplicationID.length,
    });
  } catch (error) {
    next(error);
  }
};
