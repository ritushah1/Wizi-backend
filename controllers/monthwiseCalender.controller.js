const Sequelize = require('sequelize');
const BranchMaster = require('../models/branchMaster');
const attendanceTransaction = require('../models/attendanceTransaction');
const UserMaster = require('../models/userMaster');
const EmployeeShift = require('../models/employeeShift');
const EmployeeBranch = require('../models/employeeBranch');
const shiftTime = require('../models/shiftTime');
const shiftModel = require('../models/shift');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const overTimeCalculation = require('../models/overTimeCalculation');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const hrLeaveTypes = require('../models/hrLeaveTypes');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const UserLeaveTransaction = require('../models/userLeaveTransaction');
const UserLeave = require('../models/userleave');
const AttendancePolicy = require('../models/attendancePolicy');
const {
  asiaKolkataDateTime,
  toGetFinalHolidayWeekoff,
  checkLeaveOnWH,
  minutesToHoursMinutes,
  getAttendanceData,
  getWeekOffBasedOnWeekoffAbsent,
} = require('../utils/commonUtilFunctions');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const Shift = require('../models/shift');
const { generateExcel } = require('../utils/exportData');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const ShiftRoster = require('../models/shiftRoster');
const UserShortLeave = require('../models/userShortLeave');
const EmployeeLateEarlyPolicy = require('../models/employeeLateEarlyPolicy');
const EmployeeWeekOff = require('../models/employeeWeekOff');
const weekOffPolicy = require('../models/weekOffPolicy');
const LateEarlyPolicy = require('../models/lateEarlyPolicy');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const SalaryPolicy = require('../models/salaryPolicy');
const {
  userAttributes,
  attendanceStatusForCalender,
  AttendanceLockMessage,
} = require('../utils/commonVars');
const {
  weekoffTypeEnum,
  salaryCalculationAct,
  attendanceInMobileTypes,
  AuthorizationStatusType,
  OvertimeRequestTypeEnum,
  daysTogetBeforeData,
  APICallFrom,
} = require('../utils/dbUtils');
const moment = require('moment');
const UserWorkFromHome = require('../models/userWorkFromHome');
const WorkFromHomeTransaction = require('../models/workFromHomeTransaction');
const {
  factoryActLabel,
  shopActLabel,
  on_Working_Days_Label,
} = require('../utils/labelUtils');
const Visit = require('../models/visit');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const companyMaster = require('../models/companyMaster');
const attendanceRestrictRole = require('../models/attendanceRestrictRole');

exports.getCalenderMonthwiseUserCalender = async (req, res, next) => {
  try {
    let {
      userMasterID,
      calendarstartdate,
      calendarenddate,
      userid,
      exportData,
    } = await req.body;
    userid = userMasterID ? userMasterID : userid;

    if (!userid || !calendarstartdate || !calendarenddate)
      return res.status(200).json({
        status: 401,
        message: 'Invalid parameters!',
        data: [],
      });

    const { attendanceData, summaryData, exportedData } =
      await this.dailyAttendanceData(
        userid,
        calendarstartdate,
        calendarenddate,
        exportData,
        req.userDetails,
        APICallFrom.NORMAL,
        req
      );

    if (exportData) {
      await generateExcel(exportedData, 'Employee Attendance', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: attendanceData,
      userAttendanceSummaryData: summaryData,
    });
  } catch (err) {
    next(err);
  }
};

function userWorkFromHomeStatus(userWorkFromHomeDateWise, attendanceDate) {
  try {
    const dateWiseWorkFromStatusArray = [];
    let totalApprovedWorkFromHome = 0;
    let totalPendingWorkFromHome = 0;
    const getDayTypeLabel = (dayType) => {
      if (dayType === 'First Half') return '(FH)';
      if (dayType === 'Second Half') return '(SH)';
      return '';
    };
    const getDayValue = (dayType) => {
      return dayType === 'First Half' || dayType === 'Second Half' ? 0.5 : 1;
    };
    // store multiple
    for (const wfh of userWorkFromHomeDateWise) {
      const suffix = getDayTypeLabel(wfh.dayType);
      const dayValue = getDayValue(wfh.dayType);

      // Check hasApproved transaction
      const hasApprovedTran = Array.isArray(wfh.workFromHomeTransactions)
        ? wfh.workFromHomeTransactions.some((t) => t.status === 1)
        : false;

      // APPROVED
      if (wfh.authorizationStatus === 3 && hasApprovedTran) {
        const findDateWiseApprovedTrans = wfh.workFromHomeTransactions.find(
          (e) => {
            if (e.status !== 1) return false;

            const d1 = new Date(e.date);
            const d2 = new Date(attendanceDate);

            d1.setHours(0, 0, 0, 0);
            d2.setHours(0, 0, 0, 0);

            return d1.getTime() === d2.getTime();
          },
        );
        if (!findDateWiseApprovedTrans) {
          continue;
        }
        dateWiseWorkFromStatusArray.push(`WFH ${suffix}`.trim());
        totalApprovedWorkFromHome += dayValue;
        continue;
      }

      // PENDING (Applied)
      if ([0, 1, 2].includes(wfh.authorizationStatus)) {
        dateWiseWorkFromStatusArray.push(`WFH Applied ${suffix}`.trim());
        totalPendingWorkFromHome += dayValue;
        continue;
      }
    }
    return {
      statusArray: dateWiseWorkFromStatusArray || [],
      totalApprovedWorkFromHome,
      totalPendingWorkFromHome,
    };
  } catch (error) {
    throw new Error('Error in Get User Include Model: ' + error.message);
  }
}

function getPaginatedDateRange(
  startDate,
  endDate,
  page = 1,
  limit = 5,
  exportData = false,
) {
  const start = moment(startDate).startOf('day');
  const end = moment(endDate).startOf('day');

  const totalDays = end.diff(start, 'days') + 1;

  // ✅ If exportData is true return full range
  if (exportData) {
    return {
      totalDays,
      totalPages: 1,
      page: 1,
      fromDate: start.format('YYYY-MM-DD'),
      toDate: end.format('YYYY-MM-DD'),
    };
  }

  const startIndex = (page - 1) * limit;
  const endIndex = Math.min(startIndex + limit - 1, totalDays - 1);

  const pageStartDate = start.clone().add(startIndex, 'days');
  const pageEndDate = start.clone().add(endIndex, 'days');

  return {
    totalDays,
    totalPages: Math.ceil(totalDays / limit),
    page,
    fromDate: pageStartDate.format('YYYY-MM-DD'),
    toDate: pageEndDate.format('YYYY-MM-DD'),
  };
}

exports.getUserAttendance = async (req, res, next) => {
  try {
    const { calendarstartdate, calendarenddate, exportData, page, limit } =
      req.body;
    const userMasterID = req.userDetails.userMasterId;
    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    if (!calendarstartdate || !calendarenddate)
      return res.status(200).json({
        status: 401,
        message: 'Invalid parameters!',
        data: [],
      });

    const finalAttendanceData = [];

    const result = getPaginatedDateRange(
      calendarstartdate,
      calendarenddate,
      page,
      limit,
      exportData,
    );
    let attendanceMonthStartDate = new Date(result.fromDate);
    let attendanceMonthEndDate = new Date(result.toDate);
    const userCondtion = {
      userMasterID: userMasterID,
      status: 1,
    };
    const empJoiningCondition = {
      joiningDate: {
        [Sequelize.Op.lte]: attendanceMonthEndDate,
      },
      [Sequelize.Op.or]: [
        {
          leavingDate: { [Sequelize.Op.gte]: attendanceMonthStartDate },
        },
        {
          leavingDate: { [Sequelize.Op.eq]: null },
        },
      ],
    };
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const [userData, employeeAttendancePolicies] = await Promise.all([
      // Get User Data
      UserMaster.findOne({
        where: { ...userAccessCondition.where, ...userCondtion },
        include: [
          ...userAccessCondition.includeModels,
          // Employee Joining Details
          {
            required: true,
            model: EmployeeJoiningDetails,
            where: empJoiningCondition,
            attributes: [
              'employeeCode',
              'joiningDate',
              'leavingDate',
              'salaryCalculationAct',
              'fullMonthPresence',
            ],
          },
          // weeoffPolicy
          {
            required: false,
            model: EmployeeWeekOff,
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(attendanceMonthEndDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(attendanceMonthEndDate),
                  },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            attributes: ['weekOffPolicyID', 'applicableDate', 'endDate'],
            include: [
              {
                model: weekOffPolicy,
                as: 'weekoff',
              },
            ],
          },
          // short leave
          {
            required: false,
            model: UserShortLeave,
            where: {
              authorizationStatus: AuthorizationStatusType.APPROVED,
              date: {
                [Sequelize.Op.between]: [
                  attendanceMonthStartDate,
                  attendanceMonthEndDate,
                ],
              },
            },
          },
        ],
        attributes: userAttributes,
      }),
      // Employee Attendance Policy
      EmployeeAttendancePolicy.findAll({
        where: {
          status: 1,
          userMasterID,
          startDate: {
            [Sequelize.Op.lte]: new Date(attendanceMonthStartDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(attendanceMonthStartDate),
              },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },

        attributes: ['attendancePolicyID', 'status', 'endDate', 'startDate'],
        include: [
          {
            model: AttendancePolicy,
            as: 'attendancePolicy',
            attributes: [
              'attendancePolicyID',
              'sandwichLeave',
              'BeforeAfterLeave',
              ['weekoffsandwichLeave', 'wh_sandwich'],
              ['holidaysandwichLeave', 'ph_sandwich'],
              ['HFDBeforeAfterLeave', 'HFD_Be_Aft'],
              'WHPHPriority',
              'showShift',
              'showVisit',
              'attendanceInMobile',
            ],
          },
        ],
      }),
    ]);

    if (!userData) {
      return res.status(200).json({
        status: 200,
        data: finalAttendanceData,
      });
    }

    const attendancedata1 = attendanceTransaction.findAll({
      where: {
        userMasterID,
        AttendanceDate: {
          [Sequelize.Op.between]: [
            attendanceMonthStartDate,
            attendanceMonthEndDate,
          ],
        },
      },
      include: [
        {
          separate: true,
          required: false,
          model: overTimeCalculation,
        },
        {
          model: shiftModel,
          attributes: ['shiftName', 'shiftID'],
          include: [{ model: shiftTime }],
        },
      ],

      order: [['AttendanceDate', 'ASC']],
    });

    const userAttendancePolicy =
      employeeAttendancePolicies?.[0]?.attendancePolicy || null;
    const attendanceInMobile =
      userAttendancePolicy?.attendanceInMobile ||
      attendanceInMobileTypes.In_Out;

    const weekOffHolidayPriority = userAttendancePolicy?.WHPHPriority || null;
    const typeCondition =
      weekOffHolidayPriority === 'PH' ? "'holiday'" : "'weekoff'";

    const weekholidaydata1 = weekoffHolidayTran.findAll({
      where: {
        userMasterID: userMasterID,
        date: {
          [Sequelize.Op.between]: [
            new Date(attendanceMonthStartDate).toISOString().slice(0, 10),
            new Date(attendanceMonthEndDate).toISOString().slice(0, 10),
          ],
        },
        [Sequelize.Op.and]: Sequelize.literal(`(date, "tableName") IN (
            SELECT date, 
                   CASE 
                     WHEN SUM(CASE WHEN "tableName" = 'weekoff' THEN 1 ELSE 0 END) > 0 
                          AND SUM(CASE WHEN "tableName" = 'holiday' THEN 1 ELSE 0 END) > 0 
                     THEN MAX(CASE WHEN "tableName" = ${typeCondition} THEN "tableName" END)
                     ELSE MAX("tableName") 
                   END AS selected_tableName
            FROM "weekoffHolidayTrans"
            WHERE "userMasterID" = ${userMasterID}
              AND date BETWEEN '${new Date(attendanceMonthStartDate).toISOString().slice(0, 10)}' AND '${new Date(attendanceMonthEndDate).toISOString().slice(0, 10)}'
              AND ("optionalHoliday" IS FALSE OR "optionalHoliday" IS NULL)
            GROUP BY date
          )`),
      },
      order: [
        ['date', 'ASC'],
        ['tableName', 'DESC'],
      ],
    });
    const userleaveData1 = UserLeave.findAll({
      where: {
        userMasterID,
        [Sequelize.Op.or]: [
          {
            FromDate: {
              [Sequelize.Op.between]: [
                attendanceMonthStartDate,
                attendanceMonthEndDate,
              ],
            },
          },
          {
            ToDate: {
              [Sequelize.Op.between]: [
                attendanceMonthStartDate,
                attendanceMonthEndDate,
              ],
            },
          },
        ],
        status: 1,
      },
      include: [
        {
          separate: true,
          required: false,
          model: UserLeaveTransaction,
          where: {
            status: 1,
          },
          include: [
            {
              model: hrLeaveTypes,
              attributes: ['LeaveID'],
              include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
            },
          ],
          attributes: ['LeaveTranId', 'days', 'date', 'status'],
        },
        {
          model: hrLeaveTypes,
          attributes: ['LeaveID'],
          include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
        },
      ],
      attributes: [
        'LeaveTranId',
        'userMasterID',
        'FromDate',
        'ToDate',
        'authorizationStatus',
        'LeaveDays',
        'DayType',
      ],
    });
    const userWorkFromHomeData1 = UserWorkFromHome.findAll({
      where: {
        userMasterID,
        status: 1,
        authorizationStatus: {
          [Sequelize.Op.ne]: 4,
        },
        fromDate: {
          [Sequelize.Op.lte]: attendanceMonthEndDate,
        },
        toDate: {
          [Sequelize.Op.gte]: attendanceMonthStartDate,
        },
      },
      include: [
        {
          separate: true,
          required: false,
          model: WorkFromHomeTransaction,
          where: {
            status: 1,
          },
        },
      ],
    });

    const [
      userAttendnaceData,
      weekoffholidayData,
      userLeave,
      userWorkFromHomeData,
    ] = await Promise.all([
      attendancedata1,
      weekholidaydata1,
      userleaveData1,
      userWorkFromHomeData1,
    ]);

    // Employee Joining
    const empJoining = userData.employeeJoiningDetails?.[0] || null;

    // Employee Joining Date
    const EmployeeJoiningDate = empJoining?.joiningDate
      ? new Date(empJoining.joiningDate)
      : null;
    if (EmployeeJoiningDate && EmployeeJoiningDate > attendanceMonthStartDate) {
      attendanceMonthStartDate = EmployeeJoiningDate;
    }
    // Leaving date
    const EmployeeLeaveingDate = empJoining.leavingDate
      ? new Date(empJoining.leavingDate)
      : null;
    if (EmployeeLeaveingDate && EmployeeLeaveingDate < attendanceMonthEndDate) {
      attendanceMonthEndDate = EmployeeLeaveingDate;
    }

    // User WeekOff
    const userWeekOffData = weekoffholidayData.filter((att) => {
      return att.tableName === 'weekoff';
    });

    // User Holiday
    const userHolidayData = weekoffholidayData.filter((att) => {
      return att.tableName == 'holiday';
    });

    // Get Weekoff Policy
    const userWeekOffPolicy = userData.employeeWeekOffs?.[0]?.weekoff || null;
    const weekoffPolicyType = userWeekOffPolicy?.weekoffType || null;

    const fullMonthPresence =
      userData?.employeeJoiningDetails?.[0]?.fullMonthPresence || 0;
    const approvedLeavesArray = userLeave
      .flatMap((e) => e.userLeaveTransactions)
      .filter((tran) => tran.status == 1);

    let checkWeekoff = true;

    // if monthly fix weekoff or on present days
    if (
      userWeekOffPolicy &&
      weekoffPolicyType &&
      [
        weekoffTypeEnum.MONTHLYFIX,
        weekoffTypeEnum.ONPAIDDAYS,
        weekoffTypeEnum.ONPRESENTDAY,
      ].includes(weekoffPolicyType)
    ) {
      checkWeekoff = false;
    }

    const finalweekoffholidays = fullMonthPresence
      ? weekoffholidayData
      : await toGetFinalHolidayWeekoff(
          userAttendnaceData,
          userAttendancePolicy,
          checkWeekoff ? weekoffholidayData : userHolidayData,
          approvedLeavesArray,
          attendanceMonthStartDate,
          attendanceMonthEndDate,
          userData.userMasterID,
        );

    // if check weekoff is true
    //
    let finalWeekoffs = fullMonthPresence
      ? userWeekOffData
      : checkLeaveOnWH(
          approvedLeavesArray,
          checkWeekoff ? finalweekoffholidays.weekoffs : userWeekOffData,
          true,
        );

    const finalHolidays = fullMonthPresence
      ? userHolidayData
      : checkLeaveOnWH(
          approvedLeavesArray,
          finalweekoffholidays.holidays,
          true,
        );

    // ------------------------ get fix weekoff based on present days and holiday -------------------

    let weekoffAbsentArray = [];

    if (
      weekoffPolicyType == weekoffTypeEnum.FIX &&
      userWeekOffPolicy?.isMinDaysForFixWf &&
      !fullMonthPresence
    ) {
      const queryArray = [];

      const before_startdate = moment(attendanceMonthStartDate)
        .subtract(15, 'days')
        .format('YYYY-MM-DD');

      const before_endDate = moment(attendanceMonthStartDate)
        .subtract(1, 'days')
        .format('YYYY-MM-DD');

      const WH_Condition = {
        userMasterID: userMasterID,
        date: {
          [Sequelize.Op.between]: [before_startdate, before_endDate],
        },
      };

      WH_Condition[Sequelize.Op.and] =
        Sequelize.literal(`(date, "tableName") IN (
                              SELECT date, 
                                     CASE 
                                       WHEN SUM(CASE WHEN "tableName" = 'weekoff' THEN 1 ELSE 0 END) > 0 
                                            AND SUM(CASE WHEN "tableName" = 'holiday' THEN 1 ELSE 0 END) > 0 
                                       THEN MAX(CASE WHEN "tableName" = ${typeCondition} THEN "tableName" END)
                                       ELSE MAX("tableName") 
                                     END AS selected_tableName
                              FROM "weekoffHolidayTrans"
                              WHERE "userMasterID" = ${userMasterID}
                                AND date BETWEEN '${before_startdate}' AND '${before_endDate}'
                                AND ("optionalHoliday" IS FALSE OR "optionalHoliday" IS NULL)
                              GROUP BY date
                            )`);

      queryArray.push(
        weekoffHolidayTran.findAll({
          raw: true,
          where: WH_Condition,
          order: [
            ['date', 'ASC'],
            ['tableName', 'DESC'],
          ],
          group: ['userMasterID', 'date', 'value', 'tableName', 'yearMonth'],
          attributes: [
            'userMasterID',
            'date',
            'value',
            'tableName',
            'yearMonth',
          ],
        }),
      );

      queryArray.push(
        getAttendanceData(
          userMasterID,
          before_startdate,
          before_endDate,
          false,
        ),
      );
      queryArray.push(
        UserLeaveTransaction.findAll({
          where: {
            status: 1,
            date: {
              [Sequelize.Op.between]: [before_startdate, before_endDate],
            },
          },
          include: [
            {
              model: hrLeaveTypes,
              where: {
                LeaveID: 25,
              },
              attributes: ['LeaveID'],
              include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
            },
            {
              model: UserLeave,
              where: {
                userMasterID,
              },
            },
          ],
          attributes: ['LeaveTranId', 'days', 'date', 'status'],
        }),
      );
      const [beforeWeekoffHoliday, beforeAttendanceData, beforeOutDutyData] =
        await Promise.all(queryArray);
      const finalOutDutyData = approvedLeavesArray.filter(
        (e) => e.hrLeaveType?.LeaveID == 25,
      );
      const { WeekoffAbsent, earningWeekoff } = getWeekOffBasedOnWeekoffAbsent({
        beforeWH: beforeWeekoffHoliday,
        beforeAttendance: beforeAttendanceData,
        actualWeekoff: userWeekOffData,
        weekOffData: finalWeekoffs,
        holidayData: finalHolidays,
        attendanceData: userAttendnaceData,
        startDate: attendanceMonthStartDate,
        weekoffPolicy: userWeekOffPolicy,
        joiningDate: empJoining?.joiningDate,
        outDutyData: finalOutDutyData,
        beforeOutDutyData: beforeOutDutyData,
      });

      weekoffAbsentArray = WeekoffAbsent;
      finalWeekoffs = earningWeekoff;
    }

    // short leave map date wise
    const userWiseShortLeave = userData.userShortLeaves || [];

    // create short leave map

    const shortLeaveMap = new Map();

    for (const shortleave of userWiseShortLeave) {
      const key = shortleave.date;
      shortLeaveMap.set(key, shortleave);
    }

    const attendaceSum = {
      presentCount: 0,
      presentAfterPenaltyCount: 0,
      presentOnWeekOffHolidayCount: 0,
      halfDayCount: 0,
      absentCount: 0,
      missPunchCount: 0,
      absentDueToMissPunchCount: 0,
      lateComeCount: 0,
      earlyGoCount: 0,
      weekOffCount: 0,
      holidayCount: 0,
      paidLeaveCount: 0,
      unPaidLeaveCount: 0,
      pendingLeaveCount: 0,
      shortDayLeaveCount: 0,
      actualWorkingHours: 0,
      paidDaysCount: 0,
      actualWorkingMinutes: 0,
      daysBeforeJoiningOrAfterLeft: 0,
      actualWorkingDays: 0,
      latePenaltyDays: 0,
      earlyPenaltyDays: 0,
      pendingOutDuty: 0,
      approvedOutDuty: 0,
      approvedOutDutyOnWeekoffHoliday: 0,
      approvedWorkFromHome: 0,
      pendingWorkFromHome: 0,
    };
    attendanceLoop: while (attendanceMonthStartDate <= attendanceMonthEndDate) {
      let attendanceDateObj = new Date(attendanceMonthStartDate);
      const attendanceDate = asiaKolkataDateTime(attendanceDateObj).slice(
        0,
        10,
      );
      const dateWiseTitlesArray = [];
      // DateWise Attendace
      const dateWiseAttendaceData = userAttendnaceData.find((att) => {
        return att.AttendanceDate == attendanceDate;
      });

      const userObj = {
        date: asiaKolkataDateTime(attendanceDateObj).slice(0, 10),
        attendanceDate,
        EmployeeCode: empJoining?.employeeCode || '',
        userMasterID: userData.userMasterID,
        userName: userData.displayName,
        companyMasterId: userData.companyMasterId,
        joiningDate: empJoining?.joiningDate || '',
        formattendJoiningDate: userData.employeeJoiningDetails?.[0]?.joiningDate
          ? moment(
              userData.employeeJoiningDetails?.[0]?.joiningDate,
              'YYYY-MM-DD',
            ).format('DD-MM-YYYY')
          : '',
        leavingDate: userData?.employeeJoiningDetails?.[0]?.leavingDate || '',
        formattedLeavingDate: userData.employeeJoiningDetails?.[0]?.leavingDate
          ? moment(
              userData.employeeJoiningDetails?.[0]?.leavingDate,
              'YYYY-MM-DD',
            ).format('DD-MM-YYYY')
          : '',
        inTime: '',
        outTime: '',
        AttendanceTransID: dateWiseAttendaceData?.AttendanceTransID || '',
        roundOffMinutes: dateWiseAttendaceData?.roundOffMinutes || 0,
        roundOffHours: 0,
        shift: dateWiseAttendaceData?.Shift || '',
        shiftHours: dateWiseAttendaceData?.Shifthrs || '',
        shiftInTime: dateWiseAttendaceData?.ShiftIntime || '',
        shiftOutTime: dateWiseAttendaceData?.ShiftoutTime || '',
        inHours: dateWiseAttendaceData?.InHrs || '',
        outHours: dateWiseAttendaceData?.OutHrs || '',
        lateBy: dateWiseAttendaceData?.LateBy || '',
        earlyBy: dateWiseAttendaceData?.EarlyBy || '',
        penalty: dateWiseAttendaceData?.Panalty || '',
        penaltyDeduction: dateWiseAttendaceData?.PanaltyDeduction || '',
        goEarlyUsed: dateWiseAttendaceData?.goEarlyUsed || '',
        goEarlyPanalty: dateWiseAttendaceData?.goEarlyPanalty || '',
        goEarlyPanaltyDeduction:
          dateWiseAttendaceData?.goEarlyPanaltyDeduction || '',
        shiftName: dateWiseAttendaceData?.shift?.shiftName || '',
        title: [],
        withoutOtMinutes: dateWiseAttendaceData?.withoutOtMinutes || '',
      };
      attendanceDateObj.setDate(attendanceDateObj.getDate() + 1);

      // Set updated date back if needed
      attendanceMonthStartDate = attendanceDateObj;

      if (
        new Date(userObj.attendanceDate) < new Date(userObj.joiningDate) ||
        (userObj.leavingDate &&
          new Date(userObj.attendanceDate) > new Date(userObj.leavingDate))
      ) {
        attendaceSum.daysBeforeJoiningOrAfterLeft++;
        dateWiseTitlesArray.push('-');
        userObj.title = dateWiseTitlesArray;
        finalAttendanceData.push({ ...userObj });
        continue attendanceLoop;
      }

      // weekoff data
      const actucalWeekOffData =
        userWeekOffData && userWeekOffData.length > 0
          ? userWeekOffData.find((att) => {
              return (
                new Date(att.date).getTime() ==
                new Date(userObj.attendanceDate).getTime()
              );
            })
          : null;

      // Holiday Data
      const actualHolidayData =
        userHolidayData && userHolidayData.length > 0
          ? userHolidayData.find((att) => {
              return (
                new Date(att.date).getTime() ===
                new Date(userObj.attendanceDate).getTime()
              );
            })
          : null;
      // weekoff data
      const weekOffData =
        finalWeekoffs && finalWeekoffs.length > 0
          ? finalWeekoffs.find((att) => {
              return (
                new Date(att.date).getTime() ==
                new Date(userObj.attendanceDate).getTime()
              );
            })
          : null;

      // Holiday Data
      const holidayData =
        finalHolidays && finalHolidays.length > 0
          ? finalHolidays.find((att) => {
              return (
                new Date(att.date).getTime() ===
                new Date(userObj.attendanceDate).getTime()
              );
            })
          : null;

      const weekOffAbsentData =
        weekoffAbsentArray?.length > 0
          ? weekoffAbsentArray?.find((att) => {
              return (
                new Date(att.date).getTime() ==
                new Date(userObj.attendanceDate).getTime()
              );
            })
          : null;

      // Datewise Leave
      const userleaveDateWise = userLeave.filter((leave) => {
        return (
          new Date(leave.FromDate) <= new Date(userObj.attendanceDate) &&
          new Date(leave.ToDate) >= new Date(userObj.attendanceDate)
        );
      });
      const userWorkFromHomeDateWise = userWorkFromHomeData.filter((wfh) => {
        return (
          new Date(wfh.fromDate) <= new Date(userObj.attendanceDate) &&
          new Date(wfh.toDate) >= new Date(userObj.attendanceDate)
        );
      });
      const workFromHomeStatusData = userWorkFromHomeStatus(
        userWorkFromHomeDateWise,
        userObj.attendanceDate,
      );
      attendaceSum.pendingWorkFromHome +=
        workFromHomeStatusData.totalPendingWorkFromHome || 0;
      attendaceSum.approvedWorkFromHome +=
        workFromHomeStatusData.totalApprovedWorkFromHome || 0;
      let totalLeaveDays = 0;
      let totalOutDutyDays = 0;
      // Pending Leave
      const unApprovedLeave = userleaveDateWise
        ? userleaveDateWise.filter(
            (e) =>
              e.authorizationStatus == 0 ||
              e.authorizationStatus == 1 ||
              e.authorizationStatus == 2,
          )
        : null;
      const allPendingLeaveNames = [];
      let totalUnApprovedLeaveDays = 0;
      let totalUnApprovedOutDutyDays = 0;

      for (let leave of unApprovedLeave) {
        const leaveDays = +leave.LeaveDays;
        const isOutDuty = leave.hrLeaveType.LeaveID === 25;
        const leaveName = leave.hrLeaveType.LeaveMaster.LeaveName;
        if (leaveDays >= 1) {
          if (isOutDuty) {
            attendaceSum.pendingOutDuty += 1;
            totalUnApprovedOutDutyDays += 1;
          } else {
            attendaceSum.pendingLeaveCount += 1;
            totalUnApprovedLeaveDays += 1;
          }
          dateWiseTitlesArray.push(`${leaveName} Applied`);
        } else {
          if (isOutDuty) {
            attendaceSum.pendingOutDuty += leaveDays;
            totalUnApprovedOutDutyDays += leaveDays;
          } else {
            attendaceSum.pendingLeaveCount += leaveDays;
            totalUnApprovedLeaveDays += leaveDays;
          }

          const dayType = leave.dataValues.DayType;
          const dayTypeLabel =
            dayType === 'First Half'
              ? ' (FH)'
              : dayType === 'Second Half'
                ? ' (SH)'
                : '';
          allPendingLeaveNames.push(`${leaveName} Applied${dayTypeLabel}`);
        }
      }
      // Approved Leave
      let totalApprovedLeaveDays = 0;
      let totalApprovedOutDutyDays = 0;
      const approveLeave = [];
      const allApprovedLeaveNames = [];
      if (userleaveDateWise && userleaveDateWise.length > 0) {
        for (const leave of userleaveDateWise) {
          for (const leavetrans of leave.userLeaveTransactions) {
            if (
              new Date(leavetrans.date).getTime() ==
                new Date(userObj.attendanceDate).getTime() &&
              leavetrans.status == 1
            ) {
              leavetrans.dataValues.DayType = leave.DayType;
              const leaveDate = new Date(leavetrans.date).getTime();
              const attendanceDate = new Date(userObj.attendanceDate).getTime();

              if (leaveDate == attendanceDate && +leavetrans.status == 1) {
                let totalLeaveDays = 0;
                const leaveID = leavetrans?.hrLeaveType?.LeaveID || null;
                if (leaveID == 25) {
                  totalApprovedOutDutyDays += +leavetrans.days || 0;
                  totalLeaveDays = +leavetrans.days || 0;
                  if (weekOffData) {
                    attendaceSum.approvedOutDutyOnWeekoffHoliday +=
                      +leavetrans.days || 0;
                    if (weekOffData.value < 1) {
                      if (+leavetrans.days >= 0.5) {
                        totalLeaveDays = 0.5;
                      }
                    } else {
                      totalLeaveDays = 0;
                    }
                  } else if (holidayData) {
                    totalApprovedOutDutyDays += +leavetrans.days || 0;
                    attendaceSum.approvedOutDutyOnWeekoffHoliday +=
                      +leavetrans.days || 0;
                    totalLeaveDays = 0;
                  }
                } else {
                  totalApprovedLeaveDays += +leavetrans.days || 0;
                  totalLeaveDays = +leavetrans.days || 0;
                }
                // Push approved leave transaction
                approveLeave.push(leavetrans);
                const leaveName =
                  leavetrans?.hrLeaveType?.LeaveMaster?.LeaveName || '';
                const dayType = leave.DayType;
                const suffix =
                  dayType === 'First Half'
                    ? ' (FH)'
                    : dayType === 'Second Half'
                      ? ' (SH)'
                      : '';
                allApprovedLeaveNames.push(`${leaveName}${suffix}`);
              }
            }
          }
        }
      }
      totalLeaveDays += totalUnApprovedLeaveDays + totalApprovedLeaveDays;
      totalOutDutyDays += totalUnApprovedOutDutyDays + totalApprovedOutDutyDays;
      const totalLeaveAndOutDutyDays = totalLeaveDays + totalOutDutyDays;
      // check Sandwich Leave Logic
      const isSandwichleave =
        (actucalWeekOffData &&
          !weekOffData &&
          !weekOffAbsentData &&
          +totalApprovedLeaveDays != 1) ||
        (actualHolidayData && !holidayData && +totalApprovedLeaveDays != 1)
          ? true
          : false;

      // For Future Date
      if (new Date(userObj.attendanceDate) > new Date(currentdate)) {
        // Leave Request
        if (unApprovedLeave.length) {
          dateWiseTitlesArray.push(...allPendingLeaveNames);
        }
        if (approveLeave.length > 0) {
          dateWiseTitlesArray.push(...allApprovedLeaveNames);
        }
        if (totalLeaveAndOutDutyDays < 1) {
          let title = '';
          if (actucalWeekOffData && actualHolidayData) {
            if (weekOffHolidayPriority == 'PH') {
              attendaceSum.holidayCount += actualHolidayData.value;
              title = attendanceStatusForCalender.HOLIDAY;
            } else {
              if (totalLeaveAndOutDutyDays == 0) {
                attendaceSum.weekOffCount += actucalWeekOffData.value;
                if (actucalWeekOffData.value < 1) {
                  title = attendanceStatusForCalender.WEEKOFF_SECONDHALF;
                  dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
                  attendaceSum.absentCount += 1 - actucalWeekOffData.value;
                } else {
                  title = attendanceStatusForCalender.WEEKOFF;
                }
              }
            }
          } else if (actucalWeekOffData) {
            if (totalLeaveAndOutDutyDays == 0) {
              attendaceSum.weekOffCount += actucalWeekOffData.value;
              if (actucalWeekOffData.value < 1) {
                title = attendanceStatusForCalender.WEEKOFF_SECONDHALF;
                if (totalOutDutyDays == 0) {
                  dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
                  attendaceSum.absentCount += 1 - actucalWeekOffData.value;
                }
              } else {
                title = attendanceStatusForCalender.WEEKOFF;
              }
            } else if (
              totalLeaveAndOutDutyDays == 0.5 &&
              weekOffData.value < 1
            ) {
              attendaceSum.weekOffCount += weekOffData.value;
              title = 'WO (SH)';
            }
          } else if (actualHolidayData) {
            attendaceSum.holidayCount += actualHolidayData.value;

            title = attendanceStatusForCalender.HOLIDAY;
          } else if (totalLeaveAndOutDutyDays == 0.5) {
            if (fullMonthPresence) {
              dateWiseTitlesArray.push(title);
              userObj.presentCount += 0.5;
            } else {
              dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
              userObj.absentCount += 0.5;
            }
          } else if (totalLeaveAndOutDutyDays == 0) {
            if (fullMonthPresence) {
              dateWiseTitlesArray.push(title);
              userObj.presentCount += 1;
            } else {
              dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
              userObj.absentCount += 1;
            }
          }
          if (title) {
            dateWiseTitlesArray.push(title);
          }
        }
        dateWiseTitlesArray.push(...(workFromHomeStatusData.statusArray || []));

        // for short leave

        const shortLeave = shortLeaveMap.get(userObj.attendanceDate);

        if (shortLeave) {
          dateWiseTitlesArray.push('SHL');
        }

        userObj.title = dateWiseTitlesArray;
        finalAttendanceData.push({ ...userObj });
        continue attendanceLoop;
      }
      if (dateWiseAttendaceData) {
        userObj.inTime = dateWiseAttendaceData.InDatetime;
        userObj.outTime = dateWiseAttendaceData.OutDateTime;
        userObj.roundOffHours = minutesToHoursMinutes(
          dateWiseAttendaceData.roundOffMinutes || 0,
        );
      }

      if (dateWiseAttendaceData && totalLeaveAndOutDutyDays < 1) {
        if (fullMonthPresence) {
          if (weekOffData || holidayData) {
          } else {
            // Check For Current Date
            dateWiseTitlesArray.push(attendanceStatusForCalender.PRESENT);
            if (totalLeaveAndOutDutyDays == 0) {
              attendaceSum.presentCount += 1;
              attendaceSum.actualWorkingDays += 1;
            } else {
              attendaceSum.presentCount += 0.5;
              attendaceSum.actualWorkingDays += 0.5;
            }
          }
        } else {
          if (
            dateWiseAttendaceData.OutDateTime == null &&
            dateWiseAttendaceData.InDatetime &&
            currentdate != dateWiseAttendaceData.AttendanceDate
          ) {
            // Check For Miss Punch
            attendaceSum.missPunchCount += 1;
            dateWiseTitlesArray.push(attendanceStatusForCalender.MISS_PUNCH);
            if (!weekOffData && !holidayData) {
              if (totalLeaveAndOutDutyDays == 0.5) {
                attendaceSum.absentDueToMissPunchCount += 0.5;
              } else {
                attendaceSum.absentDueToMissPunchCount += 1;
              }
            }
          } else {
            if (dateWiseAttendaceData.fulldayhalfday == 1) {
              dateWiseTitlesArray.push(attendanceStatusForCalender.PRESENT);
              if (weekOffAbsentData) {
                dateWiseTitlesArray.push(
                  attendanceStatusForCalender.WEEKOFF_ABSENT,
                );
              }

              if (weekOffData) {
                if (weekOffData.value < 1) {
                  attendaceSum.presentOnWeekOffHolidayCount += 0.5;
                } else {
                  attendaceSum.presentOnWeekOffHolidayCount += 1;
                }
              } else if (holidayData) {
                attendaceSum.presentOnWeekOffHolidayCount += 1;
              } else {
                if (totalLeaveAndOutDutyDays == 0) {
                  attendaceSum.presentCount += 1;
                  attendaceSum.actualWorkingDays += 1;
                } else {
                  attendaceSum.presentCount += 0.5;
                  attendaceSum.actualWorkingDays += 0.5;
                }
              }
            } else if (dateWiseAttendaceData.fulldayhalfday == 0.5) {
              dateWiseTitlesArray.push(attendanceStatusForCalender.HALFDAY);
              if (weekOffAbsentData) {
                dateWiseTitlesArray.push(
                  attendanceStatusForCalender.WEEKOFF_ABSENT,
                );
              }

              if (weekOffData || holidayData) {
                attendaceSum.presentOnWeekOffHolidayCount += 0.5;
              } else {
                if (totalLeaveAndOutDutyDays == 0) {
                  attendaceSum.absentCount += 0.5;
                }
                attendaceSum.halfDayCount += 1;
                attendaceSum.actualWorkingDays += 0.5;
              }
            } else if (dateWiseAttendaceData.fulldayhalfday == 0) {
              if (weekOffAbsentData) {
                dateWiseTitlesArray.push(
                  attendanceStatusForCalender.WEEKOFF_ABSENT,
                );
                attendaceSum.absentCount += +weekOffAbsentData.value;
              } else {
                if (!weekOffData && !holidayData) {
                  if (totalLeaveAndOutDutyDays == 0.5) {
                    dateWiseTitlesArray.push(
                      attendanceStatusForCalender.ABSENT,
                    );
                    attendaceSum.absentCount += 0.5;
                  } else {
                    dateWiseTitlesArray.push(
                      attendanceStatusForCalender.ABSENT,
                    );
                    attendaceSum.absentCount += 1;
                  }
                }
              }
            } else if (currentdate == dateWiseAttendaceData.AttendanceDate) {
              // Check For Current Date
              dateWiseTitlesArray.push(attendanceStatusForCalender.PRESENT);
              if (weekOffData) {
                if (weekOffData.value < 1) {
                  attendaceSum.presentOnWeekOffHolidayCount += 0.5;
                } else {
                  attendaceSum.presentOnWeekOffHolidayCount += 1;
                }
              } else if (holidayData) {
                attendaceSum.presentOnWeekOffHolidayCount += 1;
              } else {
                if (totalLeaveAndOutDutyDays == 0) {
                  attendaceSum.presentCount += 1;
                  attendaceSum.actualWorkingDays += 1;
                } else {
                  attendaceSum.presentCount += 0.5;
                  attendaceSum.actualWorkingDays += 0.5;
                }
              }
            } else {
              dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
              attendaceSum.absentCount += 1;
            }

            if (
              dateWiseAttendaceData.latePenaltyMinutes ||
              dateWiseAttendaceData.PanaltyDeduction
            ) {
              // Check For Late Come
              attendaceSum.lateComeCount += 1;
              dateWiseTitlesArray.push(attendanceStatusForCalender.LATECOME);
            }
            if (
              dateWiseAttendaceData.earlyPenaltyMinutes ||
              dateWiseAttendaceData.goEarlyPanaltyDeduction
            ) {
              // Check For Early Go
              attendaceSum.earlyGoCount += 1;
              dateWiseTitlesArray.push(attendanceStatusForCalender.EARLYGO);
            }
            if (
              dateWiseAttendaceData.Panalty &&
              dateWiseAttendaceData.PanaltyDeduction == 'day'
            ) {
              attendaceSum.latePenaltyDays += +dateWiseAttendaceData.Panalty;
            }
            if (
              dateWiseAttendaceData.goEarlyPanalty &&
              dateWiseAttendaceData.goEarlyPanaltyDeduction == 'day'
            ) {
              attendaceSum.goEarlyPanalty +=
                +dateWiseAttendaceData.goEarlyPanalty;
            }
          }
        }
        if (unApprovedLeave.length) {
          dateWiseTitlesArray.push(...allPendingLeaveNames);
        }
        if (approveLeave.length > 0) {
          dateWiseTitlesArray.push(...allApprovedLeaveNames);
        }
        if (weekOffData && holidayData) {
          if (weekOffHolidayPriority == 'PH') {
            attendaceSum.holidayCount += holidayData.value;
            dateWiseTitlesArray.push(attendanceStatusForCalender.HOLIDAY);
          } else {
            attendaceSum.weekOffCount += weekOffData.value;
            if (weekOffData.value < 1) {
              dateWiseTitlesArray.push(
                attendanceStatusForCalender.WEEKOFF_SECONDHALF,
              );
            } else {
              dateWiseTitlesArray.push(attendanceStatusForCalender.WEEKOFF);
            }
          }
        } else if (weekOffData) {
          attendaceSum.weekOffCount += weekOffData.value;
          if (weekOffData.value < 1) {
            dateWiseTitlesArray.push(
              attendanceStatusForCalender.WEEKOFF_SECONDHALF,
            );
          } else {
            dateWiseTitlesArray.push(attendanceStatusForCalender.WEEKOFF);
          }
        } else if (holidayData) {
          attendaceSum.holidayCount += holidayData.value;
          dateWiseTitlesArray.push(attendanceStatusForCalender.HOLIDAY);
        }
      } else {
        // No Attendance Or Total Full Day Leave

        // Leave Request
        if (unApprovedLeave.length) {
          dateWiseTitlesArray.push(...allPendingLeaveNames);
        }
        if (approveLeave.length > 0) {
          dateWiseTitlesArray.push(...allApprovedLeaveNames);
        }
        let title = null;
        if (weekOffData && holidayData) {
          if (weekOffHolidayPriority == 'PH') {
            attendaceSum.holidayCount += holidayData.value;
            title = attendanceStatusForCalender.HOLIDAY;
          } else {
            attendaceSum.weekOffCount += weekOffData.value;
            if (weekOffData.value < 1) {
              title = attendanceStatusForCalender.WEEKOFF_SECONDHALF;
            } else {
              title = attendanceStatusForCalender.WEEKOFF;
            }
            if (totalLeaveAndOutDutyDays == 0 && weekOffData.value < 1) {
              if (fullMonthPresence) {
              } else {
                dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
                attendaceSum.absentCount += 1 - weekOffData.value;
              }
            }
          }
        } else if (weekOffData) {
          if (totalLeaveDays == 0) {
            attendaceSum.weekOffCount += weekOffData.value;
            if (weekOffData.value < 1) {
              title = attendanceStatusForCalender.WEEKOFF_SECONDHALF;
              if (fullMonthPresence) {
                dateWiseTitlesArray.push(attendanceStatusForCalender.PRESENT);
                attendaceSum.presentCount += 1 - weekOffData.value;
              } else {
                if (totalLeaveAndOutDutyDays == 0) {
                  dateWiseTitlesArray.push(
                    attendanceStatusForCalender.ABSENT_HFD,
                  );
                }
                attendaceSum.absentCount += 1 - weekOffData.value;
              }
            } else {
              title = attendanceStatusForCalender.WEEKOFF;
            }
          } else if (totalLeaveDays == 0.5 && weekOffData.value < 1) {
            attendaceSum.weekOffCount += weekOffData.value;
            title = 'WO (SH)';
          }
        } else if (holidayData) {
          attendaceSum.holidayCount += holidayData.value;
          title = attendanceStatusForCalender.HOLIDAY;
        } else if (totalLeaveAndOutDutyDays == 0.5) {
          if (fullMonthPresence && !weekOffData && !holidayData) {
            dateWiseTitlesArray.push(attendanceStatusForCalender.PRESENT);
            attendaceSum.presentCount += 0.5;
          } else {
            if (isSandwichleave) {
              title = attendanceStatusForCalender.ABSENT_SANDWICH;
            } else if (weekOffAbsentData) {
              title = attendanceStatusForCalender.WEEKOFF_ABSENT;
            } else {
              dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
            }
            attendaceSum.absentCount += 0.5;
          }
        } else if (totalLeaveAndOutDutyDays == 0) {
          if (isSandwichleave) {
            title = attendanceStatusForCalender.ABSENT_SANDWICH;
            attendaceSum.absentCount += 1;
          } else if (weekOffAbsentData) {
            title = attendanceStatusForCalender.WEEKOFF_ABSENT;
            attendaceSum.absentCount += 1;
          } else {
            if (fullMonthPresence && !weekOffData && !holidayData) {
              dateWiseTitlesArray.push(attendanceStatusForCalender.PRESENT);
              attendaceSum.presentCount += 1;
            } else {
              dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
              attendaceSum.absentCount += 1;
            }
          }
        }
        if (title) {
          dateWiseTitlesArray.push(title);
        }
      }

      dateWiseTitlesArray.push(...(workFromHomeStatusData.statusArray || []));

      // for short leave

      const shortLeave = shortLeaveMap.get(userObj.attendanceDate);

      if (shortLeave) {
        dateWiseTitlesArray.push('SHL');
      }

      userObj.title = dateWiseTitlesArray;
      finalAttendanceData.push({ ...userObj });
    }
    if (exportData) {
      const mergedAttendanceData = finalAttendanceData.map((item) => ({
        'Employee Code': item.EmployeeCode,
        'Employee Name': item.userName,
        'Attendance Date': moment(item.attendanceDate, 'YYYY-MM-DD').format(
          'DD-MM-YYYY',
        ),
        Attendance: [...item.title].join(', '),
        'Late By': item.lateBy,
        'Early By': item.earlyBy,
        'Attendance Shift': item.shiftName,
        'Shift Hours': item.shiftHours,
        'Shift In-time': item.shiftInTime,
        'Shift Out-Time': item.shiftOutTime,

        ...(attendanceInMobile === attendanceInMobileTypes.In_Out && {
          'Attendance InTime': item.inTime
            ? moment(item.inTime).format('DD-MM-YYYY HH:mm:ss')
            : '',
          'Attendance OutTime': item.outTime
            ? moment(item.outTime).format('DD-MM-YYYY HH:mm:ss')
            : '',
          'Working Hours': item.roundOffHours || '',
        }),
      }));

      await generateExcel(
        mergedAttendanceData,
        'Employee Attendance',
        'xlsx',
        res,
      );
      return;
    }
    return res.status(200).json({
      status: 200,
      data: finalAttendanceData,
      attendanceInMobile: attendanceInMobile,
      totalcount: result.totalDays,
    });
  } catch (err) {
    next(err);
  }
};

// daily attendance function

exports.dailyAttendanceData = async (
  userMasterID,
  calendarstartdate,
  calendarenddate,
  exportData,
  userDetails,
  callFrom = APICallFrom.TEAM,
  req
) => {
  const object = {
    attendanceData: [],
    summaryData: {},
    exportedData: [],
  };

  if (!userMasterID || !calendarstartdate || !calendarenddate) return object;

  const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);
  let yearMonth = calendarstartdate.replace(/-/g, '').slice(0, 6);

  const finalAttendanceData = [];
  let attendanceMonthStartDate = new Date(calendarstartdate);
  let attendanceMonthEndDate = new Date(calendarenddate);
  const userCondtion = {
    userMasterID: userMasterID,
    status: 1,
  };
  const empJoiningCondition = {
    joiningDate: {
      [Sequelize.Op.lte]: attendanceMonthEndDate,
    },
    [Sequelize.Op.or]: [
      {
        leavingDate: { [Sequelize.Op.gte]: attendanceMonthStartDate },
      },
      {
        leavingDate: { [Sequelize.Op.eq]: null },
      },
    ],
  };
  const { includeModels, where } =
    callFrom !== APICallFrom.TEAM
      ? accessibleRoleWiseUsers({
          userDetails,
          includeCompany: false,
        })
      : {
          includeModels: [],
          where: {},
        };
  const [userData, employeeAttendancePolicies, userShiftRoster] =
    await Promise.all([
      // Get User Data
      UserMaster.findOne({
        where: { ...where, ...userCondtion },
        include: [
          ...includeModels,
          {
            required: true,
            model: EmployeeJoiningDetails,
            where: empJoiningCondition,
            attributes: [
              'employeeCode',
              'joiningDate',
              'leavingDate',
              'salaryCalculationAct',
              'fullMonthPresence',
            ],
          },
          {
            required: true,
            model: companyMaster,
            attributes: ['isAttRemarkRequired', 'companyMasterID'],
          },
          // Employee Branch
          {
            required: false,
            model: EmployeeBranch,
            as: 'emp_branch',
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(currentdate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(currentdate),
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
          // Hr Leave Monthly Transaction
          {
            required: false,
            separate: true,
            model: HrLeaveMonthlyTrans,
            where: { AttnYearMon: yearMonth },
            attributes: ['userMasterID', 'LeaveTranId', 'AttnVal'],
            include: [
              {
                model: hrLeaveTypes,
                attributes: ['LeaveID'],
                include: [
                  {
                    model: HrLeaveMaster,
                    as: 'LeaveMaster',
                    attributes: ['LeaveName'],
                  },
                ],
              },
            ],
          },
          // Employee Salary Policy
          {
            required: false,
            model: EmployeeSalaryPolicy,
            where: {
              status: 1,
              startDate: {
                [Sequelize.Op.lte]: new Date(attendanceMonthEndDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(attendanceMonthEndDate),
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
          // Employee Shift
          {
            required: false,
            model: EmployeeShift,
            where: {
              status: 1,
              [Sequelize.Op.or]: [
                {
                  startDate: {
                    [Sequelize.Op.between]: [
                      attendanceMonthStartDate,
                      attendanceMonthEndDate,
                    ],
                  },
                },
                {
                  endDate: {
                    [Sequelize.Op.between]: [
                      attendanceMonthStartDate,
                      attendanceMonthEndDate,
                    ],
                  },
                },
                {
                  [Sequelize.Op.and]: [
                    {
                      startDate: {
                        [Sequelize.Op.lte]: attendanceMonthStartDate,
                      },
                    },
                    {
                      [Sequelize.Op.or]: [
                        {
                          endDate: {
                            [Sequelize.Op.gte]: attendanceMonthEndDate,
                          },
                        },
                        { endDate: { [Sequelize.Op.eq]: null } },
                      ],
                    },
                  ],
                },
              ],
            },
          },
          // weeoffPolicy
          {
            required: false,
            model: EmployeeWeekOff,
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(attendanceMonthEndDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(attendanceMonthEndDate),
                  },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            attributes: ['weekOffPolicyID', 'applicableDate', 'endDate'],
            include: [
              {
                model: weekOffPolicy,
                as: 'weekoff',
              },
            ],
          },
          // LCEG Policy
          {
            required: false,
            model: EmployeeLateEarlyPolicy,
            where: {
              status: 1,
              startDate: {
                [Sequelize.Op.lte]: new Date(attendanceMonthEndDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(attendanceMonthEndDate),
                  },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            include: [
              {
                model: LateEarlyPolicy,
                as: 'lateEarlyPolicy',
                attributes: ['lateEarlyPolicyType', 'deductFrom'],
              },
            ],
          },
          {
            required: false,
            model: UserShortLeave,
            where: {
              authorizationStatus: 3,
              date: {
                [Sequelize.Op.between]: [
                  attendanceMonthStartDate,
                  attendanceMonthEndDate,
                ],
              },
            },
          },
        ],
        attributes: userAttributes,
      }),
      // Employee Attendance Policy
      EmployeeAttendancePolicy.findAll({
        where: {
          status: 1,
          userMasterID,
          startDate: {
            [Sequelize.Op.lte]: new Date(attendanceMonthStartDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(attendanceMonthStartDate),
              },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },

        attributes: ['attendancePolicyID', 'status', 'endDate', 'startDate'],
        include: [
          {
            model: AttendancePolicy,
            as: 'attendancePolicy',
            attributes: [
              'attendancePolicyID',
              'sandwichLeave',
              'BeforeAfterLeave',
              ['weekoffsandwichLeave', 'wh_sandwich'],
              ['holidaysandwichLeave', 'ph_sandwich'],
              ['HFDBeforeAfterLeave', 'HFD_Be_Aft'],
              'WHPHPriority',
              'showShift',
              'showVisit',
              'isWHAbsentRule',
            ],
          },
        ],
      }),
      // Shift Roster
      ShiftRoster.findAll({
        where: {
          userMasterID,
          shiftRosterDate: {
            [Sequelize.Op.between]: [
              attendanceMonthStartDate,
              attendanceMonthEndDate,
            ],
          },
        },
        include: [
          {
            required: false,
            model: Shift,
            attributes: ['shiftID', 'shiftName'],
            include: [{ required: false, model: shiftTime }],
          },
        ],
      }),
    ]);

  if (!userData) {
    return object;
  }

  const roleMasterId = req.userDetails?.role?.roleMasterID || null;
  const userCompany = req.userDetails.companyMasterId;

  const [logInUserCompanyDetails,attendanceVerifyData] = await Promise.all([
companyMaster.findOne({
    where:{
      companyMasterID:userCompany
    },
    attributes:['companyMasterID','isAttRestrict'],
    include:[{required:false,model:attendanceRestrictRole,as:'attResRole',where:{roleID:roleMasterId},attributes:['maxAttModDays','roleID']}]
  }),
  HrLeaveMonthlyTrans.findAll({
    attributes:['monthstartdate','monthenddate','verified','userMasterID'],
    where:{
      userMasterID,
      monthstartdate:{
        [Sequelize.Op.lte]:calendarenddate
      },
       monthenddate:{
        [Sequelize.Op.gte]:calendarstartdate
      },
      verified:1
    },
    group:['monthstartdate','monthenddate','verified','userMasterID']
  })
  ]);

  const isAttendanceRestricted = logInUserCompanyDetails?.isAttRestrict || false;
  const restrictedDays = logInUserCompanyDetails.attResRole?.[0]?.maxAttModDays || 0;

  const attendancedata1 = attendanceTransaction.findAll({
    where: {
      userMasterID,
      AttendanceDate: {
        [Sequelize.Op.between]: [
          attendanceMonthStartDate,
          attendanceMonthEndDate,
        ],
      },
    },
    include: [
      {
        separate: true,
        required: false,
        model: overTimeCalculation,
      },
      {
        model: shiftModel,
        attributes: ['shiftName', 'shiftID'],
        include: [{ model: shiftTime }],
      },
    ],

    order: [['AttendanceDate', 'ASC']],
  });

  const userAttendancePolicy =
    employeeAttendancePolicies?.[0]?.attendancePolicy || null;

  const weekOffHolidayPriority = userAttendancePolicy?.WHPHPriority || null;
  const getShowShift = userAttendancePolicy?.showShift || false;
  const getShowVisit = userAttendancePolicy?.showVisit || false;
  const typeCondition =
    weekOffHolidayPriority === 'PH' ? "'holiday'" : "'weekoff'";

  const weekholidaydata1 = weekoffHolidayTran.findAll({
    where: {
      userMasterID: userMasterID,
      date: {
        [Sequelize.Op.between]: [
          new Date(attendanceMonthStartDate).toISOString().slice(0, 10),
          new Date(attendanceMonthEndDate).toISOString().slice(0, 10),
        ],
      },
      [Sequelize.Op.and]: Sequelize.literal(`(date, "tableName") IN (
            SELECT date, 
                   CASE 
                     WHEN SUM(CASE WHEN "tableName" = 'weekoff' THEN 1 ELSE 0 END) > 0 
                          AND SUM(CASE WHEN "tableName" = 'holiday' THEN 1 ELSE 0 END) > 0 
                     THEN MAX(CASE WHEN "tableName" = ${typeCondition} THEN "tableName" END)
                     ELSE MAX("tableName") 
                   END AS selected_tableName
            FROM "weekoffHolidayTrans"
            WHERE "userMasterID" = ${userMasterID}
              AND date BETWEEN '${new Date(attendanceMonthStartDate).toISOString().slice(0, 10)}' AND '${new Date(attendanceMonthEndDate).toISOString().slice(0, 10)}'
              AND ("optionalHoliday" IS FALSE OR "optionalHoliday" IS NULL)
            GROUP BY date
          )`),
    },
    order: [
      ['date', 'ASC'],
      ['tableName', 'DESC'],
    ],
  });
  const userleaveData1 = UserLeave.findAll({
    where: {
      userMasterID,
      [Sequelize.Op.or]: [
        {
          FromDate: {
            [Sequelize.Op.between]: [
              attendanceMonthStartDate,
              attendanceMonthEndDate,
            ],
          },
        },
        {
          ToDate: {
            [Sequelize.Op.between]: [
              attendanceMonthStartDate,
              attendanceMonthEndDate,
            ],
          },
        },
      ],
      status: 1,
    },
    include: [
      {
        separate: true,
        required: false,
        model: UserLeaveTransaction,
        where: {
          status: 1,
        },
        include: [
          {
            model: hrLeaveTypes,
            attributes: ['LeaveID'],
            include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
          },
        ],
        attributes: ['LeaveTranId', 'days', 'date', 'status'],
      },
      {
        model: hrLeaveTypes,
        attributes: ['LeaveID'],
        include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
      },
    ],
    attributes: [
      'LeaveTranId',
      'userMasterID',
      'FromDate',
      'ToDate',
      'authorizationStatus',
      'LeaveDays',
      'DayType',
    ],
  });
  const userWorkFromHomeData1 = UserWorkFromHome.findAll({
    where: {
      userMasterID,
      status: 1,
      authorizationStatus: {
        [Sequelize.Op.ne]: 4,
      },
      fromDate: {
        [Sequelize.Op.lte]: attendanceMonthEndDate,
      },
      toDate: {
        [Sequelize.Op.gte]: attendanceMonthStartDate,
      },
    },
    include: [
      {
        separate: true,
        required: false,
        model: WorkFromHomeTransaction,
        where: {
          status: 1,
        },
      },
    ],
  });
  let userVisitData1 = Promise.resolve([]);
  if (userAttendancePolicy?.showVisit) {
    userVisitData1 = Visit.findAll({
      where: {
        assignID: userMasterID,
        status: 1,
        checkInDateTime: { [Sequelize.Op.ne]: null },
        visitDate: {
          [Sequelize.Op.between]: [
            attendanceMonthStartDate,
            attendanceMonthEndDate,
          ],
        },
      },
      attributes: ['visitID', 'visitDate', 'checkInDateTime'],
    });
  }

  const [
    userAttendnaceData,
    weekoffholidayData,
    userLeave,
    userWorkFromHomeData,
    userVisitData,
  ] = await Promise.all([
    attendancedata1,
    weekholidaydata1,
    userleaveData1,
    userWorkFromHomeData1,
    userVisitData1,
  ]);

  // Attendace Verification Data
  const attVerifyData = userData?.hrLeaveMonthlyTrans?.[0] || null;

  // Employee Joining
  const empJoining = userData.employeeJoiningDetails?.[0] || null;

  // Employee Branch
  const userBranch = userData.emp_branch?.[0]?.branchMaster?.branchName || '';

  // Employee Shift
  const userShiftData = userData?.employeeShifts || [];
  // Employee Joining Date
  const EmployeeJoiningDate = empJoining?.joiningDate
    ? new Date(empJoining.joiningDate)
    : null;
  if (EmployeeJoiningDate && EmployeeJoiningDate > attendanceMonthStartDate) {
    attendanceMonthStartDate = EmployeeJoiningDate;
  }
  // Leaving date
  const EmployeeLeaveingDate = empJoining.leavingDate
    ? new Date(empJoining.leavingDate)
    : null;
  if (EmployeeLeaveingDate && EmployeeLeaveingDate < attendanceMonthEndDate) {
    attendanceMonthEndDate = EmployeeLeaveingDate;
  }

  // User WeekOff
  const userWeekOffData = weekoffholidayData.filter((att) => {
    return att.tableName === 'weekoff';
  });

  // User Holiday
  const userHolidayData = weekoffholidayData.filter((att) => {
    return att.tableName == 'holiday';
  });

  // Get Weekoff Policy
  const userWeekOffPolicy = userData.employeeWeekOffs?.[0]?.weekoff || null;
  const weekoffPolicyType = userWeekOffPolicy?.weekoffType || null;

  // LCEG Policy
  const LCEGPolicy =
    userData.employeeLateEarlyPolicies?.[0]?.lateEarlyPolicy || null;
  const fullMonthPresence =
    userData?.employeeJoiningDetails?.[0]?.fullMonthPresence || 0;
  const approvedLeavesArray = userLeave
    .flatMap((e) => e.userLeaveTransactions)
    .filter((tran) => tran.status == 1);

  let checkWeekoff = true;

  // if monthly fix weekoff or on present days
  if (
    userWeekOffPolicy &&
    weekoffPolicyType &&
    [
      weekoffTypeEnum.MONTHLYFIX,
      weekoffTypeEnum.ONPAIDDAYS,
      weekoffTypeEnum.ONPRESENTDAY,
    ].includes(weekoffPolicyType)
  ) {
    checkWeekoff = false;
  }

  const finalweekoffholidays = fullMonthPresence
    ? weekoffholidayData
    : await toGetFinalHolidayWeekoff(
        userAttendnaceData,
        userAttendancePolicy,
        checkWeekoff ? weekoffholidayData : userHolidayData,
        approvedLeavesArray,
        attendanceMonthStartDate,
        attendanceMonthEndDate,
        userData.userMasterID,
      );

  // if check weekoff is true
  //
  let finalWeekoffs = fullMonthPresence
    ? userWeekOffData
    : checkLeaveOnWH(
        approvedLeavesArray,
        checkWeekoff ? finalweekoffholidays.weekoffs : userWeekOffData,
        true,
      );

  const finalHolidays = fullMonthPresence
    ? userHolidayData
    : checkLeaveOnWH(approvedLeavesArray, finalweekoffholidays.holidays, true);

  // ------------------------ get fix weekoff based on present days and holiday -------------------

  let weekoffAbsentArray = [];

  if (
    weekoffPolicyType == weekoffTypeEnum.FIX &&
    userWeekOffPolicy?.isMinDaysForFixWf &&
    !fullMonthPresence
  ) {
    const queryArray = [];

    const before_startdate = moment(attendanceMonthStartDate)
      .subtract(daysTogetBeforeData, 'days')
      .format('YYYY-MM-DD');

    const before_endDate = moment(attendanceMonthStartDate)
      .subtract(1, 'days')
      .format('YYYY-MM-DD');

    const WH_Condition = {
      userMasterID: userMasterID,
      date: {
        [Sequelize.Op.between]: [before_startdate, before_endDate],
      },
    };

    WH_Condition[Sequelize.Op.and] = Sequelize.literal(`(date, "tableName") IN (
                              SELECT date, 
                                     CASE 
                                       WHEN SUM(CASE WHEN "tableName" = 'weekoff' THEN 1 ELSE 0 END) > 0 
                                            AND SUM(CASE WHEN "tableName" = 'holiday' THEN 1 ELSE 0 END) > 0 
                                       THEN MAX(CASE WHEN "tableName" = ${typeCondition} THEN "tableName" END)
                                       ELSE MAX("tableName") 
                                     END AS selected_tableName
                              FROM "weekoffHolidayTrans"
                              WHERE "userMasterID" = ${userMasterID}
                                AND date BETWEEN '${before_startdate}' AND '${before_endDate}'
                                AND ("optionalHoliday" IS FALSE OR "optionalHoliday" IS NULL)
                              GROUP BY date
                            )`);

    queryArray.push(
      weekoffHolidayTran.findAll({
        raw: true,
        where: WH_Condition,
        order: [
          ['date', 'ASC'],
          ['tableName', 'DESC'],
        ],
        group: ['userMasterID', 'date', 'value', 'tableName', 'yearMonth'],
        attributes: ['userMasterID', 'date', 'value', 'tableName', 'yearMonth'],
      }),
    );

    queryArray.push(
      getAttendanceData(userMasterID, before_startdate, before_endDate, false),
    );
    queryArray.push(
      UserLeaveTransaction.findAll({
        where: {
          status: 1,
          date: {
            [Sequelize.Op.between]: [before_startdate, before_endDate],
          },
        },
        include: [
          {
            model: hrLeaveTypes,
            where: {
              LeaveID: 25,
            },
            attributes: ['LeaveID'],
            include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
          },
          {
            model: UserLeave,
            where: {
              userMasterID,
            },
          },
        ],
        attributes: ['LeaveTranId', 'days', 'date', 'status'],
      }),
    );
    const [beforeWeekoffHoliday, beforeAttendanceData, beforeOutDutyData] =
      await Promise.all(queryArray);

    const finalOutDutyData = approvedLeavesArray.filter(
      (e) => e.hrLeaveType?.LeaveID == 25,
    );
    const { WeekoffAbsent, earningWeekoff } = getWeekOffBasedOnWeekoffAbsent({
      beforeWH: beforeWeekoffHoliday,
      beforeAttendance: beforeAttendanceData,
      actualWeekoff: userWeekOffData,
      weekOffData: finalWeekoffs,
      holidayData: finalHolidays,
      attendanceData: userAttendnaceData,
      startDate: attendanceMonthStartDate,
      weekoffPolicy: userWeekOffPolicy,
      joiningDate: empJoining?.joiningDate,
      outDutyData: finalOutDutyData,
      beforeOutDutyData: beforeOutDutyData,
    });

    weekoffAbsentArray = WeekoffAbsent;
    finalWeekoffs = earningWeekoff;
  }

  const companyAllShift = await Shift.findAll({
    where: {
      companyMasterID: +userData.companyMasterId,
      status: 1,
    },
    include: [
      {
        model: shiftTime,
      },
    ],
  });

  // short leave
  const shortLeaveData = userData.userShortLeaves || [];

  // create map date wise
  const shortLeaveMap = new Map();
  for (const shortleave of shortLeaveData) {
    const key = shortleave.date;
    shortLeaveMap.set(key, shortleave);
  }

  const attendaceSum = {
    presentCount: 0,
    presentAfterPenaltyCount: 0,
    presentOnWeekOffHolidayCount: 0,
    halfDayCount: 0,
    absentCount: 0,
    missPunchCount: 0,
    absentDueToMissPunchCount: 0,
    lateComeCount: 0,
    earlyGoCount: 0,
    weekOffCount: 0,
    holidayCount: 0,
    paidLeaveCount: 0,
    unPaidLeaveCount: 0,
    pendingLeaveCount: 0,
    shortDayLeaveCount: 0,
    actualWorkingHours: 0,
    paidDaysCount: 0,
    actualWorkingMinutes: 0,
    daysBeforeJoiningOrAfterLeft: 0,
    actualWorkingDays: 0,
    latePenaltyDays: 0,
    earlyPenaltyDays: 0,
    pendingOutDuty: 0,
    approvedOutDuty: 0,
    approvedOutDutyOnWeekoffHoliday: 0,
    approvedWorkFromHome: 0,
    pendingWorkFromHome: 0,
  };
  attendanceLoop: while (attendanceMonthStartDate <= attendanceMonthEndDate) {
    let attendanceDateObj = new Date(attendanceMonthStartDate);
    const attendanceDate = asiaKolkataDateTime(attendanceDateObj).slice(0, 10);
    const dateWiseTitlesArray = [];
    // DateWise Attendace
    const dateWiseAttendaceData = userAttendnaceData.find((att) => {
      return att.AttendanceDate == attendanceDate;
    });
    const dateWiseVisitsArray = getShowVisit
      ? userVisitData.filter((att) => {
          return att.visitDate == attendanceDate;
        })
      : [];

    const userObj = {
      date: asiaKolkataDateTime(attendanceDateObj).slice(0, 10),
      attendanceDate,
      EmployeeCode: empJoining?.employeeCode || '',
      userMasterID: userData.userMasterID,
      userMasterId: userMasterID,
      userName: userData.displayName,
      companyMasterId: userData.companyMasterId,
      joiningDate: empJoining?.joiningDate || '',
      formattendJoiningDate: userData.employeeJoiningDetails?.[0]?.joiningDate
        ? moment(
            userData.employeeJoiningDetails?.[0]?.joiningDate,
            'YYYY-MM-DD',
          ).format('DD-MM-YYYY')
        : '',
      leavingDate: userData?.employeeJoiningDetails?.[0]?.leavingDate || '',
      formattedLeavingDate: userData.employeeJoiningDetails?.[0]?.leavingDate
        ? moment(
            userData.employeeJoiningDetails?.[0]?.leavingDate,
            'YYYY-MM-DD',
          ).format('DD-MM-YYYY')
        : '',
      branch: userBranch || '',
      salaryCalculationAct: empJoining?.salaryCalculationAct || 'S',
      attVerifyData: attVerifyData ? 1 : 0,
      addPenaltyFlag: false,
      inTime: '',
      outTime: '',
      attendanceTransactionId: dateWiseAttendaceData?.AttendanceTransID || '',
      roundOffMinutes: 0,
      roundOffHours: 0,
      shift: dateWiseAttendaceData?.Shift || '',
      shiftHours: dateWiseAttendaceData?.Shifthrs || '',
      shiftInTime: dateWiseAttendaceData?.ShiftIntime || '',
      shiftOutTime: dateWiseAttendaceData?.ShiftoutTime || '',
      inHours: dateWiseAttendaceData?.InHrs || '',
      outHours: dateWiseAttendaceData?.OutHrs || '',
      lateBy: dateWiseAttendaceData?.LateBy || '',
      earlyBy: dateWiseAttendaceData?.EarlyBy || '',
      penalty: dateWiseAttendaceData?.Panalty || '',
      penaltyDeduction: dateWiseAttendaceData?.PanaltyDeduction || '',
      goEarlyUsed: dateWiseAttendaceData?.goEarlyUsed || '',
      goEarlyPanalty: dateWiseAttendaceData?.goEarlyPanalty || '',
      goEarlyPanaltyDeduction:
        dateWiseAttendaceData?.goEarlyPanaltyDeduction || '',
      shiftName: dateWiseAttendaceData?.shift?.shiftName || '',
      title: '',
      branchName: userBranch,
      otStatus: '',
      otAmount: '',
      breakStartTime1: dateWiseAttendaceData?.lunchBreakStartTime || '',
      breakEndTime1: dateWiseAttendaceData?.lunchBreakEndTime || '',
      breakMinutes1: dateWiseAttendaceData?.lunchBreak || '',
      breakStartTime2: dateWiseAttendaceData?.teaBreakInStartTime || '',
      breakEndTime2: dateWiseAttendaceData?.teaBreakEndTime || '',
      breakMinutes2: dateWiseAttendaceData?.teaBreak || '',
      roundOffMinutes: dateWiseAttendaceData?.roundOffMinutes || '',
      isShift: false,
      remarks: dateWiseAttendaceData?.remarks || null,
      withoutOtMinutes: dateWiseAttendaceData?.withoutOtMinutes || '',
      LCPenaltyFrom: dateWiseAttendaceData?.LCPenaltyFrom || '',
      EGPenaltyFrom: dateWiseAttendaceData?.EGPenaltyFrom || '',
      isManual: dateWiseAttendaceData?.isManual || false,
      visitCount: getShowVisit ? dateWiseVisitsArray.length : null,
      visitLabel:
        getShowVisit && dateWiseVisitsArray.length == 0 ? 'No Visit' : null,
      shiftShortfallMinutes:
        dateWiseAttendaceData?.shiftShortfallMinutes || null,
      isWHConvertedToOt: dateWiseAttendaceData?.isWHConvertedToOT ? 'Yes' : '',
      preShiftOTMinutes: 0,
      preShiftOTStatus: null,
      isAttendanceLock:false,
      lockMessage:null
    };


  const isVerified = attendanceVerifyData.some(
  e => e.monthstartdate <= userObj.date && e.monthenddate >= userObj.date
);

const isRestricted =
  isAttendanceRestricted &&
  restrictedDays > 0 &&
  moment(currentdate, 'YYYY-MM-DD').diff(
    moment(userObj.date, 'YYYY-MM-DD'),
    'days'
  ) > restrictedDays;

if (isVerified || isRestricted) {
  userObj.isAttendanceLock = true;
  userObj.lockMessage = isVerified
    ? AttendanceLockMessage.ATTN_VERIFY
    : AttendanceLockMessage.MODIFICATION_RESTRICTION;
}

userObj.isAttRemarkRequired = userData?.companyMaster?.isAttRemarkRequired;

    attendanceDateObj.setDate(attendanceDateObj.getDate() + 1);

    // Set updated date back if needed
    attendanceMonthStartDate = attendanceDateObj;

    if (
      new Date(userObj.attendanceDate) < new Date(userObj.joiningDate) ||
      (userObj.leavingDate &&
        new Date(userObj.attendanceDate) > new Date(userObj.leavingDate))
    ) {
      attendaceSum.daysBeforeJoiningOrAfterLeft++;
      continue attendanceLoop;
    }

    // Date Wise Shift Roster
    const userDatewiseRoster =
      userShiftRoster.find((att) => {
        return (
          new Date(att.shiftRosterDate).getTime() ==
          new Date(attendanceDate).getTime()
        );
      }) || null;

    // Date Wise Shift
    const userDateWiseShift =
      userShiftData.find(
        (e) =>
          e.startDate <= attendanceDate &&
          (e.endDate >= attendanceDate || e.endDate == null),
      ) || null;

    // weekoff data
    const actucalWeekOffData =
      userWeekOffData && userWeekOffData.length > 0
        ? userWeekOffData.find((att) => {
            return (
              new Date(att.date).getTime() ==
              new Date(userObj.attendanceDate).getTime()
            );
          })
        : null;

    // Holiday Data
    const actualHolidayData =
      userHolidayData && userHolidayData.length > 0
        ? userHolidayData.find((att) => {
            return (
              new Date(att.date).getTime() ===
              new Date(userObj.attendanceDate).getTime()
            );
          })
        : null;
    // weekoff data
    const weekOffData =
      finalWeekoffs && finalWeekoffs.length > 0
        ? finalWeekoffs.find((att) => {
            return (
              new Date(att.date).getTime() ==
              new Date(userObj.attendanceDate).getTime()
            );
          })
        : null;

    // Holiday Data
    const holidayData =
      finalHolidays && finalHolidays.length > 0
        ? finalHolidays.find((att) => {
            return (
              new Date(att.date).getTime() ===
              new Date(userObj.attendanceDate).getTime()
            );
          })
        : null;

    const weekOffAbsentData =
      weekoffAbsentArray?.length > 0
        ? weekoffAbsentArray?.find((att) => {
            return (
              new Date(att.date).getTime() ==
              new Date(userObj.attendanceDate).getTime()
            );
          })
        : null;

    // Datewise Leave
    const userleaveDateWise = userLeave.filter((leave) => {
      return (
        new Date(leave.FromDate) <= new Date(userObj.attendanceDate) &&
        new Date(leave.ToDate) >= new Date(userObj.attendanceDate)
      );
    });
    const userWorkFromHomeDateWise = userWorkFromHomeData.filter((wfh) => {
      return (
        new Date(wfh.fromDate) <= new Date(userObj.attendanceDate) &&
        new Date(wfh.toDate) >= new Date(userObj.attendanceDate)
      );
    });

    // short leave
    const userShortLeave = shortLeaveMap.get(attendanceDate);

    const workFromHomeStatusData = userWorkFromHomeStatus(
      userWorkFromHomeDateWise,
      userObj.attendanceDate,
    );
    attendaceSum.pendingWorkFromHome +=
      workFromHomeStatusData.totalPendingWorkFromHome || 0;
    attendaceSum.approvedWorkFromHome +=
      workFromHomeStatusData.totalApprovedWorkFromHome || 0;
    let totalLeaveDays = 0;
    let totalOutDutyDays = 0;
    // Pending Leave
    const unApprovedLeave = userleaveDateWise
      ? userleaveDateWise.filter(
          (e) =>
            e.authorizationStatus == 0 ||
            e.authorizationStatus == 1 ||
            e.authorizationStatus == 2,
        )
      : null;
    const allPendingLeaveNames = [];
    let totalUnApprovedLeaveDays = 0;
    let totalUnApprovedOutDutyDays = 0;

    for (let leave of unApprovedLeave) {
      const leaveDays = +leave.LeaveDays;
      const isOutDuty = leave.hrLeaveType.LeaveID === 25;
      const leaveName = leave.hrLeaveType.LeaveMaster.LeaveName;
      if (leaveDays >= 1) {
        if (isOutDuty) {
          attendaceSum.pendingOutDuty += 1;
          totalUnApprovedOutDutyDays += 1;
        } else {
          attendaceSum.pendingLeaveCount += 1;
          totalUnApprovedLeaveDays += 1;
        }
        dateWiseTitlesArray.push(`${leaveName} Applied`);
      } else {
        if (isOutDuty) {
          attendaceSum.pendingOutDuty += leaveDays;
          totalUnApprovedOutDutyDays += leaveDays;
        } else {
          attendaceSum.pendingLeaveCount += leaveDays;
          totalUnApprovedLeaveDays += leaveDays;
        }

        const dayType = leave.dataValues.DayType;
        const dayTypeLabel =
          dayType === 'First Half'
            ? ' (FH)'
            : dayType === 'Second Half'
              ? ' (SH)'
              : '';
        allPendingLeaveNames.push(`${leaveName} Applied${dayTypeLabel}`);
      }
    }
    // Approved Leave
    let totalApprovedLeaveDays = 0;
    let totalApprovedOutDutyDays = 0;
    const approveLeave = [];
    const allApprovedLeaveNames = [];
    if (userleaveDateWise && userleaveDateWise.length > 0) {
      for (const leave of userleaveDateWise) {
        for (const leavetrans of leave.userLeaveTransactions) {
          if (
            new Date(leavetrans.date).getTime() ==
              new Date(userObj.attendanceDate).getTime() &&
            leavetrans.status == 1
          ) {
            leavetrans.dataValues.DayType = leave.DayType;
            const leaveDate = new Date(leavetrans.date).getTime();
            const attendanceDate = new Date(userObj.attendanceDate).getTime();

            if (leaveDate == attendanceDate && +leavetrans.status == 1) {
              let totalLeaveDays = 0;
              const leaveID = leavetrans?.hrLeaveType?.LeaveID || null;
              if (leaveID == 25) {
                totalApprovedOutDutyDays += +leavetrans.days || 0;
                totalLeaveDays = +leavetrans.days || 0;
                if (weekOffData) {
                  attendaceSum.approvedOutDutyOnWeekoffHoliday +=
                    +leavetrans.days || 0;
                  if (weekOffData.value < 1) {
                    if (+leavetrans.days >= 0.5) {
                      totalLeaveDays = 0.5;
                    }
                  } else {
                    totalLeaveDays = 0;
                  }
                } else if (holidayData) {
                  totalApprovedOutDutyDays += +leavetrans.days || 0;
                  attendaceSum.approvedOutDutyOnWeekoffHoliday +=
                    +leavetrans.days || 0;
                  totalLeaveDays = 0;
                }
              } else {
                totalApprovedLeaveDays += +leavetrans.days || 0;
                totalLeaveDays = +leavetrans.days || 0;
              }
              // Push approved leave transaction
              approveLeave.push(leavetrans);
              const leaveName =
                leavetrans?.hrLeaveType?.LeaveMaster?.LeaveName || '';
              const dayType = leave.DayType;
              const suffix =
                dayType === 'First Half'
                  ? ' (FH)'
                  : dayType === 'Second Half'
                    ? ' (SH)'
                    : '';
              allApprovedLeaveNames.push(`${leaveName}${suffix}`);
            }
          }
        }
      }
    }
    totalLeaveDays += totalUnApprovedLeaveDays + totalApprovedLeaveDays;
    totalOutDutyDays += totalUnApprovedOutDutyDays + totalApprovedOutDutyDays;
    const totalLeaveAndOutDutyDays = totalLeaveDays + totalOutDutyDays;
    // check Sandwich Leave Logic
    const isSandwichleave =
      (actucalWeekOffData &&
        !weekOffData &&
        !weekOffAbsentData &&
        +totalApprovedLeaveDays != 1) ||
      (actualHolidayData && !holidayData && +totalApprovedLeaveDays != 1)
        ? true
        : false;

    // For Future Date
    if (new Date(userObj.attendanceDate) > new Date(currentdate)) {
      // Leave Request
      if (unApprovedLeave.length) {
        dateWiseTitlesArray.push(...allPendingLeaveNames);
      }
      if (approveLeave.length > 0) {
        dateWiseTitlesArray.push(...allApprovedLeaveNames);
      }
      if (totalLeaveAndOutDutyDays < 1) {
        let title = '';
        if (actucalWeekOffData && actualHolidayData) {
          if (weekOffHolidayPriority == 'PH') {
            attendaceSum.holidayCount += actualHolidayData.value;
            title = attendanceStatusForCalender.HOLIDAY;
          } else {
            if (totalLeaveAndOutDutyDays == 0) {
              attendaceSum.weekOffCount += actucalWeekOffData.value;
              if (actucalWeekOffData.value < 1) {
                title = attendanceStatusForCalender.WEEKOFF_SECONDHALF;
                dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
                attendaceSum.absentCount += 1 - actucalWeekOffData.value;
              } else {
                title = attendanceStatusForCalender.WEEKOFF;
              }
            }
          }
        } else if (actucalWeekOffData) {
          if (totalLeaveAndOutDutyDays == 0) {
            attendaceSum.weekOffCount += actucalWeekOffData.value;
            if (actucalWeekOffData.value < 1) {
              title = attendanceStatusForCalender.WEEKOFF_SECONDHALF;
              if (totalOutDutyDays == 0) {
                dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
                attendaceSum.absentCount += 1 - actucalWeekOffData.value;
              }
            } else {
              title = attendanceStatusForCalender.WEEKOFF;
            }
          } else if (totalLeaveAndOutDutyDays == 0.5 && weekOffData?.value < 1) {
            attendaceSum.weekOffCount += weekOffData.value;
            title = 'WO (SH)';
          }
        } else if (actualHolidayData) {
          attendaceSum.holidayCount += actualHolidayData.value;

          title = attendanceStatusForCalender.HOLIDAY;
        } else if (totalLeaveDays == 0.5) {
          if (userObj.fullMonthPresence) {
            attendaceSum.presentCount += 0.5;
          } else {
            attendaceSum.absentCount += 0.5;
          }
        } else if (totalLeaveDays == 0) {
          if (userObj.fullMonthPresence) {
            attendaceSum.presentCount += 1;
          } else {
            attendaceSum.absentCount += 1;
          }
        }
        if (title) {
          dateWiseTitlesArray.push(title);
        }
      }
      dateWiseTitlesArray.push(...(workFromHomeStatusData.statusArray || []));

      // push short leave title
      if (userShortLeave) {
        dateWiseTitlesArray.push(attendanceStatusForCalender.SHORT_LEAVE);
        attendaceSum.shortDayLeaveCount += 1;
      }

      for (const title of dateWiseTitlesArray) {
        userObj.title = title;
        finalAttendanceData.push({ ...userObj });
      }
      if (getShowShift) {
        if (userDatewiseRoster || userDateWiseShift) {
          let employeeDayWiseShift = null;
          let shiftID = null;
          if (userDatewiseRoster) {
            employeeDayWiseShift = userDatewiseRoster?.shift;
            shiftID = [userDatewiseRoster.shiftID];
          } else if (userDateWiseShift) {
            if (userDateWiseShift?.shiftID) {
              employeeDayWiseShift = companyAllShift.filter(
                (e) => e.shiftID == userDateWiseShift.shiftID,
              );
              shiftID = [userDateWiseShift.shiftID];
            } else if (userDateWiseShift?.shiftsID?.length) {
              employeeDayWiseShift = companyAllShift.filter((e) =>
                userDateWiseShift.shiftsID.includes(e.shiftID.toString()),
              );
              shiftID = userDateWiseShift.shiftsID;
            }
          }
          const empDayShiftIDs = Array.isArray(shiftID)
            ? companyAllShift.filter((e) =>
                shiftID.map(String).includes(String(e.shiftID)),
              )
            : companyAllShift.filter(
                (e) => String(e.shiftID) === String(shiftID),
              );

          userObj.shift = dateWiseAttendaceData
            ? dateWiseAttendaceData.Shift
            : userDatewiseRoster
              ? userDatewiseRoster.shiftID.toString()
              : '';
          userObj.isShift = true;
          userObj.shiftName = empDayShiftIDs.map((e) => e.shiftName).join(' ,');
          userObj.title = empDayShiftIDs.map((e) => e.shiftName).join(',');
          finalAttendanceData.push({ ...userObj });
        }
      }
      continue attendanceLoop;
    }
    const userDateWiseAttendaceShift = dateWiseAttendaceData?.shift || null;
    if (dateWiseAttendaceData) {
      userObj.inTime = dateWiseAttendaceData.InDatetime;
      userObj.outTime = dateWiseAttendaceData.OutDateTime;

      userObj.roundOffHours = minutesToHoursMinutes(
        dateWiseAttendaceData.roundOffMinutes || 0,
      );

      const attendaceDate_OTData =
        (dateWiseAttendaceData?.OverTimeCalculations || []).find(
          (e) => e.otRequestType != OvertimeRequestTypeEnum.PRE_SHIFT,
        ) || null;
      if (
        attendaceDate_OTData &&
        attendaceDate_OTData.AuthorizationRequired != 4
      ) {
        if (attendaceDate_OTData.AuthorizationRequired == 3) {
          userObj.otStatus = 'Accept';
          userObj.otAmount = +attendaceDate_OTData.UpdateOverTimeHourAndMin;
        } else if (attendaceDate_OTData.AuthorizationRequired == 6) {
          userObj.otStatus = 'monthlyOT';
          userObj.otAmount = +attendaceDate_OTData.UpdateOverTimeHourAndMin;
        } else {
          userObj.otStatus = 'Pending';
          userObj.otAmount = +attendaceDate_OTData.OverTimeHourAndMin;
        }
      }

      const attendaceDate_PreShiftOTData =
        (dateWiseAttendaceData?.OverTimeCalculations || []).find(
          (e) => e.otRequestType == OvertimeRequestTypeEnum.PRE_SHIFT,
        ) || null;
      if (
        attendaceDate_PreShiftOTData &&
        attendaceDate_PreShiftOTData.AuthorizationRequired != 4
      ) {
        if (attendaceDate_PreShiftOTData.AuthorizationRequired == 3) {
          userObj.preShiftOTStatus = 'Accept';
          userObj.preShiftOTMinutes =
            +attendaceDate_PreShiftOTData.UpdateOverTimeHourAndMin;
        } else if (attendaceDate_PreShiftOTData.AuthorizationRequired == 6) {
          userObj.preShiftOTStatus = 'monthlyOT';
          userObj.preShiftOTMinutes =
            +attendaceDate_PreShiftOTData.UpdateOverTimeHourAndMin;
        } else {
          userObj.preShiftOTStatus = 'Pending';
          userObj.preShiftOTMinutes =
            +attendaceDate_PreShiftOTData.OverTimeHourAndMin;
        }
      }
    }

    if (dateWiseAttendaceData && totalLeaveAndOutDutyDays < 1) {
      // Short leave
      // const userShortLeave =
      //   dateWiseAttendaceData?.userShortLeaves?.[0] || null;
      if (fullMonthPresence) {
        if (weekOffData || holidayData) {
        } else {
          // Check For Current Date
          dateWiseTitlesArray.push(attendanceStatusForCalender.PRESENT);
          if (totalLeaveAndOutDutyDays == 0) {
            attendaceSum.presentCount += 1;
            attendaceSum.actualWorkingDays += 1;
          } else {
            attendaceSum.presentCount += 0.5;
            attendaceSum.actualWorkingDays += 0.5;
          }
        }
      } else {
        if (
          dateWiseAttendaceData.OutDateTime == null &&
          dateWiseAttendaceData.InDatetime &&
          currentdate != dateWiseAttendaceData.AttendanceDate
        ) {
          // Check For Miss Punch
          attendaceSum.missPunchCount += 1;
          dateWiseTitlesArray.push(attendanceStatusForCalender.MISS_PUNCH);
          if (!weekOffData && !holidayData) {
            if (totalLeaveAndOutDutyDays == 0.5) {
              attendaceSum.absentDueToMissPunchCount += 0.5;
            } else {
              attendaceSum.absentDueToMissPunchCount += 1;
            }
          }
        } else {
          if (dateWiseAttendaceData.fulldayhalfday == 1) {
            userObj.addPenaltyFlag = true;
            dateWiseTitlesArray.push(attendanceStatusForCalender.PRESENT);
            if (weekOffAbsentData) {
              dateWiseTitlesArray.push(
                attendanceStatusForCalender.WEEKOFF_ABSENT,
              );
            }
            // if (userShortLeave) {
            //   dateWiseTitlesArray.push(
            //     attendanceStatusForCalender.SHORT_LEAVE,
            //   );
            //   attendaceSum.shortDayLeaveCount += 1;
            // }
            if (weekOffData) {
              if (weekOffData.value < 1) {
                attendaceSum.presentOnWeekOffHolidayCount += 0.5;
              } else {
                attendaceSum.presentOnWeekOffHolidayCount += 1;
              }
            } else if (holidayData) {
              attendaceSum.presentOnWeekOffHolidayCount += 1;
            } else {
              if (totalLeaveAndOutDutyDays == 0) {
                attendaceSum.presentCount += 1;
                attendaceSum.actualWorkingDays += 1;
              } else {
                attendaceSum.presentCount += 0.5;
                attendaceSum.actualWorkingDays += 0.5;
              }
            }
          } else if (dateWiseAttendaceData.fulldayhalfday == 0.5) {
            userObj.addPenaltyFlag = true;
            dateWiseTitlesArray.push(attendanceStatusForCalender.HALFDAY);
            if (weekOffAbsentData) {
              dateWiseTitlesArray.push(
                attendanceStatusForCalender.WEEKOFF_ABSENT,
              );
            }

            // if (userShortLeave) {
            //   dateWiseTitlesArray.push(
            //     attendanceStatusForCalender.SHORT_LEAVE,
            //   );
            //   attendaceSum.shortDayLeaveCount += 1;
            // }
            if (weekOffData || holidayData) {
              if (weekOffData) {
                if (weekOffData.value < 1) {
                  attendaceSum.presentOnWeekOffHolidayCount += 0.5;
                  attendaceSum.halfDayCount += 1;
                  attendaceSum.actualWorkingDays += 0.5;
                } else {
                  attendaceSum.presentOnWeekOffHolidayCount += 0.5;
                }
              } else {
                attendaceSum.presentOnWeekOffHolidayCount += 0.5;
              }
            } else {
              if (totalLeaveAndOutDutyDays == 0) {
                attendaceSum.absentCount += 0.5;
              }
              attendaceSum.halfDayCount += 1;
              attendaceSum.actualWorkingDays += 0.5;
            }
          } else if (dateWiseAttendaceData.fulldayhalfday == 0) {
            if (weekOffAbsentData) {
              dateWiseTitlesArray.push(
                attendanceStatusForCalender.WEEKOFF_ABSENT,
              );
              attendaceSum.absentCount += +weekOffAbsentData.value;
            } else {
              if (!weekOffData && !holidayData) {
                if (totalLeaveAndOutDutyDays == 0.5) {
                  dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
                  attendaceSum.absentCount += 0.5;
                } else {
                  dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
                  attendaceSum.absentCount += 1;
                }
              }
            }
          } else if (currentdate == dateWiseAttendaceData.AttendanceDate) {
            userObj.addPenaltyFlag = true;
            // Check For Current Date
            dateWiseTitlesArray.push(attendanceStatusForCalender.PRESENT);
            if (weekOffData) {
              if (weekOffData.value < 1) {
                attendaceSum.presentOnWeekOffHolidayCount += 0.5;
              } else {
                attendaceSum.presentOnWeekOffHolidayCount += 1;
              }
            } else if (holidayData) {
              attendaceSum.presentOnWeekOffHolidayCount += 1;
            } else {
              if (totalLeaveAndOutDutyDays == 0) {
                attendaceSum.presentCount += 1;
                attendaceSum.actualWorkingDays += 1;
              } else {
                attendaceSum.presentCount += 0.5;
                attendaceSum.actualWorkingDays += 0.5;
              }
            }
          } else {
            dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
            attendaceSum.absentCount += 1;
          }

          if (
            dateWiseAttendaceData.latePenaltyMinutes ||
            dateWiseAttendaceData.PanaltyDeduction
          ) {
            // Check For Late Come
            attendaceSum.lateComeCount += 1;
            dateWiseTitlesArray.push(attendanceStatusForCalender.LATECOME);
          }
          if (
            dateWiseAttendaceData.earlyPenaltyMinutes ||
            dateWiseAttendaceData.goEarlyPanaltyDeduction
          ) {
            // Check For Early Go
            attendaceSum.earlyGoCount += 1;
            dateWiseTitlesArray.push(attendanceStatusForCalender.EARLYGO);
          }
          if (
            dateWiseAttendaceData.Panalty &&
            dateWiseAttendaceData.PanaltyDeduction == 'day'
          ) {
            attendaceSum.latePenaltyDays += +dateWiseAttendaceData.Panalty;
          }
          if (
            dateWiseAttendaceData.goEarlyPanalty &&
            dateWiseAttendaceData.goEarlyPanaltyDeduction == 'day'
          ) {
            attendaceSum.goEarlyPanalty +=
              +dateWiseAttendaceData.goEarlyPanalty;
          }
        }
      }
      if (unApprovedLeave.length) {
        dateWiseTitlesArray.push(...allPendingLeaveNames);
      }
      if (approveLeave.length > 0) {
        dateWiseTitlesArray.push(...allApprovedLeaveNames);
      }
      if (weekOffData && holidayData) {
        if (weekOffHolidayPriority == 'PH') {
          attendaceSum.holidayCount += holidayData.value;
          dateWiseTitlesArray.push(attendanceStatusForCalender.HOLIDAY);
        } else {
          attendaceSum.weekOffCount += weekOffData.value;
          if (weekOffData.value < 1) {
            dateWiseTitlesArray.push(
              attendanceStatusForCalender.WEEKOFF_SECONDHALF,
            );
          } else {
            dateWiseTitlesArray.push(attendanceStatusForCalender.WEEKOFF);
          }
        }
      } else if (weekOffData) {
        attendaceSum.weekOffCount += weekOffData.value;
        if (weekOffData.value < 1) {
          dateWiseTitlesArray.push(
            attendanceStatusForCalender.WEEKOFF_SECONDHALF,
          );
        } else {
          dateWiseTitlesArray.push(attendanceStatusForCalender.WEEKOFF);
        }
      } else if (holidayData) {
        attendaceSum.holidayCount += holidayData.value;
        dateWiseTitlesArray.push(attendanceStatusForCalender.HOLIDAY);
      }
    } else {
      // No Attendance Or Total Full Day Leave

      // Leave Request
      if (unApprovedLeave.length) {
        dateWiseTitlesArray.push(...allPendingLeaveNames);
      }
      if (approveLeave.length > 0) {
        dateWiseTitlesArray.push(...allApprovedLeaveNames);
      }
      let title = null;
      if (weekOffData && holidayData) {
        if (weekOffHolidayPriority == 'PH') {
          attendaceSum.holidayCount += holidayData.value;
          title = attendanceStatusForCalender.HOLIDAY;
        } else {
          attendaceSum.weekOffCount += weekOffData.value;
          if (weekOffData.value < 1) {
            title = attendanceStatusForCalender.WEEKOFF_SECONDHALF;
          } else {
            title = attendanceStatusForCalender.WEEKOFF;
          }
          if (totalLeaveAndOutDutyDays == 0 && weekOffData.value < 1) {
            if (fullMonthPresence) {
            } else {
              dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
              attendaceSum.absentCount += 1 - weekOffData.value;
            }
          }
        }
      } else if (weekOffData) {
        if (totalLeaveDays == 0) {
          attendaceSum.weekOffCount += weekOffData.value;
          if (weekOffData.value < 1) {
            title = attendanceStatusForCalender.WEEKOFF_SECONDHALF;
            if (fullMonthPresence) {
              dateWiseTitlesArray.push(attendanceStatusForCalender.PRESENT);
              attendaceSum.presentCount += 1 - weekOffData.value;
            } else {
              if (totalLeaveAndOutDutyDays == 0) {
                dateWiseTitlesArray.push(
                  attendanceStatusForCalender.ABSENT_HFD,
                );
              }
              attendaceSum.absentCount += 1 - weekOffData.value;
            }
          } else {
            title = attendanceStatusForCalender.WEEKOFF;
          }
        } else if (totalLeaveDays == 0.5 && weekOffData?.value < 1) {
          attendaceSum.weekOffCount += weekOffData.value;
          title = 'WO (SH)';
        }
      } else if (holidayData) {
        attendaceSum.holidayCount += holidayData.value;
        title = attendanceStatusForCalender.HOLIDAY;
      } else if (totalLeaveAndOutDutyDays == 0.5) {
        if (fullMonthPresence && !weekOffData && !holidayData) {
          dateWiseTitlesArray.push(attendanceStatusForCalender.PRESENT);
          attendaceSum.presentCount += 0.5;
        } else {
          if (isSandwichleave) {
            title = attendanceStatusForCalender.ABSENT_SANDWICH;
          } else if (weekOffAbsentData) {
            title = attendanceStatusForCalender.WEEKOFF_ABSENT;
          } else {
            dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
          }
          attendaceSum.absentCount += 0.5;
        }
      } else if (totalLeaveAndOutDutyDays == 0) {
        if (isSandwichleave) {
          title = attendanceStatusForCalender.ABSENT_SANDWICH;
          attendaceSum.absentCount += 1;
        } else if (weekOffAbsentData) {
          title = attendanceStatusForCalender.WEEKOFF_ABSENT;
          attendaceSum.absentCount += 1;
        } else {
          if (fullMonthPresence && !weekOffData && !holidayData) {
            dateWiseTitlesArray.push(attendanceStatusForCalender.PRESENT);
            attendaceSum.presentCount += 1;
          } else {
            dateWiseTitlesArray.push(attendanceStatusForCalender.ABSENT);
            attendaceSum.absentCount += 1;
          }
        }
      }
      if (title) {
        dateWiseTitlesArray.push(title);
      }
    }

    dateWiseTitlesArray.push(...(workFromHomeStatusData.statusArray || []));

    // push short leave title
    if (userShortLeave) {
      dateWiseTitlesArray.push(attendanceStatusForCalender.SHORT_LEAVE);
      attendaceSum.shortDayLeaveCount += 1;
    }

    for (let title of dateWiseTitlesArray) {
      userObj.title = title;
      finalAttendanceData.push({ ...userObj });
    }
    if (getShowShift) {
      if (userDatewiseRoster || userDateWiseShift) {
        let employeeDayWiseShift = null;
        let shiftID = null;

        if (userDateWiseAttendaceShift) {
          employeeDayWiseShift = companyAllShift.filter(
            (e) => e.shiftID == userDateWiseAttendaceShift.shiftID,
          );
          shiftID = [userDateWiseAttendaceShift.shiftID];
        } else if (userDatewiseRoster) {
          employeeDayWiseShift = userDatewiseRoster?.shift;
          shiftID = [userDatewiseRoster.shiftID];
        } else if (userDateWiseShift) {
          if (userDateWiseShift?.shiftID) {
            employeeDayWiseShift = companyAllShift.filter(
              (e) => e.shiftID == userDateWiseShift.shiftID,
            );
            shiftID = [userDateWiseShift.shiftID];
          } else if (userDateWiseShift?.shiftsID?.length) {
            employeeDayWiseShift = companyAllShift.filter((e) =>
              userDateWiseShift.shiftsID.includes(e.shiftID.toString()),
            );
            shiftID = userDateWiseShift.shiftsID;
          }
        }
        const empDayShiftIDs = Array.isArray(shiftID)
          ? companyAllShift.filter((e) =>
              shiftID.map(String).includes(String(e.shiftID)),
            )
          : companyAllShift.filter(
              (e) => String(e.shiftID) === String(shiftID),
            );

        userObj.shift = dateWiseAttendaceData
          ? dateWiseAttendaceData.Shift
          : userDatewiseRoster
            ? userDatewiseRoster.shiftID.toString()
            : '';
        userObj.isShift = true;
        userObj.shiftName = empDayShiftIDs.map((e) => e.shiftName).join(' ,');
        userObj.title = empDayShiftIDs.map((e) => e.shiftName).join(',');
        finalAttendanceData.push({ ...userObj });
      }
    }
  }
  if (exportData) {
    const mergedAttendanceData = Object.values(
      finalAttendanceData.reduce((acc, curr) => {
        const dateKey = `${curr.userMasterID}_${curr.date}`;

        if (!acc[dateKey]) {
          acc[dateKey] = {
            ...curr,
            title: curr.title ? new Set([curr.title]) : new Set(),
          };
        } else if (curr.title) {
          acc[dateKey].title.add(curr.title);
        }

        return acc;
      }, {}),
    ).map((item) => ({
      'Employee Code': item.EmployeeCode,
      'Employee Name': item.userName,
      Branch: item.branchName,
      'Attendance Date': item.attendanceDate,
      Status: [...item.title].join(', '),
      'Joining Date': item.formattendJoiningDate,
      'Leaving Date': item.formattedLeavingDate,
      'Salary Calculation Act':
        item.salaryCalculationAct === salaryCalculationAct.FACTORYACT
          ? factoryActLabel
          : item.salaryCalculationAct === salaryCalculationAct.SHOPACT
            ? shopActLabel
            : on_Working_Days_Label,
      'Attendance InTime': item.inTime
        ? moment(item.inTime).format('DD-MM-YYYY HH:mm:ss')
        : '',
      'Attendance OutTime': item.outTime
        ? moment(item.outTime).format('DD-MM-YYYY HH:mm:ss')
        : '',
      'Attendance Shift': item.shiftName,
      'Shift Hours': item.shiftHours,
      'Shift In-time': item.shiftInTime,
      'Shift Out-Time': item.shiftOutTime,
      'In Minutes': item.inHours,
      'Out Minutes': item.outHours,
      'Working Minutes': item.roundOffMinutes,
      'WithOut OT Minutes': item.withoutOtMinutes,
      'Late By': item.lateBy,
      'Early By': item.earlyBy,
      Penalty: item.penalty,
      'Penalty Deduction By': item.penaltyDeduction,
      'GoEarly Penalty': item.goEarlyPanalty,
      'GoEarly Penalty Deduction By': item.goEarlyPanaltyDeduction,
      'PreShift Overtime Minutes':
        item.preShiftOTStatus === 'Pending'
          ? `${item.preShiftOTMinutes} (Pending)`
          : item.preShiftOTStatus === 'Accept'
            ? `${item.preShiftOTMinutes} (Approved)`
            : item.preShiftOTStatus === 'monthlyOT'
              ? `${item.preShiftOTMinutes} (MonthlyOTApproved)`
              : '',
      'Overtime Minutes':
        item.otStatus === 'Pending'
          ? `${item.otAmount} (Pending)`
          : item.otStatus === 'Accept'
            ? `${item.otAmount} (Approved)`
            : item.otStatus === 'monthlyOT'
              ? `${item.otAmount} (MonthlyOTApproved)`
              : '',
      'Break-1 Start Time': item.breakStartTime1
        ? moment(item.breakStartTime1).format('DD-MM-YYYY HH:mm:ss')
        : '',
      'Break-1 End Time': item.breakEndTime1
        ? moment(item.breakEndTime1).format('DD-MM-YYYY HH:mm:ss')
        : '',
      'Break-1 Minutes': item.breakMinutes1,
      'Break-2 Start Time': item.breakStartTime2
        ? moment(item.breakStartTime2).format('DD-MM-YYYY HH:mm:ss')
        : '',
      'Break-2 End Time': item.breakEndTime2
        ? moment(item.breakEndTime2).format('DD-MM-YYYY HH:mm:ss')
        : '',
      'Break-2 Minutes': item.breakMinutes2,
      Remarks: item.remarks,
      'Attendance Change From': item.isManual
        ? 'Status Correction (Time Unchanged)'
        : '',
      'Working Minutes Converted To Overtime': item.isWHConvertedToOt,
    }));

    object.exportedData = mergedAttendanceData;
    return object;
  }

  object.attendanceData = finalAttendanceData;
  object.summaryData = attendaceSum;

  return object;
};
