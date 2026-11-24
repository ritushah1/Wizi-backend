const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const Designation = require('../models/designation');
const Sequelize = require('sequelize');
const attendanceTransaction = require('../models/attendanceTransaction');
const UserMaster = require('../models/userMaster');
const EmployeeBranch = require('../models/employeeBranch');
const message = require('../response_message/message');
const AttendanceLogs = require('../models/attendancelogs');
const moment = require('moment');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const overTimeCalculation = require('../models/overTimeCalculation');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const UserLeaveTransaction = require('../models/userLeaveTransaction');
const UserLeave = require('../models/userleave');
const AttendancePolicy = require('../models/attendancePolicy');
const {
  getDatesFromDateRange,
  toHoursAndMinutes,
  asiaKolkataDateTime,
  toGetFinalHolidayWeekoff,
  checkLeaveOnWH,
  parseEmployeeInfoAlias,
  findCompanySubscription,
  minutesToHoursMinutes,
  get7DaysBefore_WeekoffHoliday_Attendance_Map,
  getAllWeekoffHolidayWithPriority,
  getWeekOffBasedOnWeekoffAbsent,
} = require('../utils/commonUtilFunctions');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const Shift = require('../models/shift');
const {
  generateAttendanceReport_2_Excel,
  generateAttendanceReport_Consolidate_Excel,
  generateAttendanceReport_Punch_IN_Out_Excel,
  generateAttendanceReport_2_with_PA_INOUT_Excel,
} = require('../utils/exportData');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const EmployeeLateEarlyPolicy = require('../models/employeeLateEarlyPolicy');
const LateEarlyPolicy = require('../models/lateEarlyPolicy');
const UserShortLeave = require('../models/userShortLeave');
const {
  attendanceReportMainReportTypes,
  weekoffTypeEnum,
  PenaltyDeductFromEnum,
  AuthorizationStatusType,
  sortFields,
  offDayCategoryEnum,
} = require('../utils/dbUtils');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const EmployeeProject = require('../models/employeeProject');
const Project = require('../models/project');
const EmployeeWeekOff = require('../models/employeeWeekOff');
const weekOffPolicy = require('../models/weekOffPolicy');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const UserWorkFromHome = require('../models/userWorkFromHome');
const WorkFromHomeTransaction = require('../models/workFromHomeTransaction');
const TrackingKM = require('../models/trackingKM');
const TrackingKMsOld = require('../models/trackingKMOld');
const { TRACKING_MIGRATION_DATE } = require('../utils/labelUtils');
const EmployeeSkillCategory = require('../models/employeeSkillCategory');
const UserExpense = require('../models/userExpense');
const UserExpenseTransaction = require('../models/userExpenseTransaction');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const { attendanceStatusForCalender } = require('../utils/commonVars');
const AttendanceCorrectionRequest = require('../models/attendanceCorrectionRequest');

exports.attendanceReport = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      fromdate,
      todate,
      page,
      limit,
      generateExcelFile,
      userMasterID,
      exportData = false,
      selectedShowFields = [],
      departmentID,
      designationID,
      divisionId,
      workingAreaId,
      projectID,
      skillCategory,
      salarytype,
      employmentType,
      sortField = sortFields.EMPLOYEENAME,
      userStatus = [1],
    } = req.body;
    let { branchMasterID } = req.body;
    if (!companyMasterID || !fromdate || !todate) {
      return res.status(200).json({
        status: 401,
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }
    const diffInMs = new Date(todate) - new Date(fromdate);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24) + 1;

    if (diffInDays > 31) {
      return res.status(200).json({
        status: 401,
        message: 'Date range cannot exceed 31 days',
      });
    }
    const getCompanySubscription =
      await findCompanySubscription(companyMasterID);
    if (!getCompanySubscription) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Company Subscription'),
      });
    }
    const subscriptionEndDate = moment(getCompanySubscription.endDate).endOf(
      'day',
    );
    if (fromdate && moment(fromdate).isAfter(subscriptionEndDate)) {
      return res.status(200).json({
        status: 401,
        message: 'From Date cannot be greater than subscription end date',
      });
    }

    if (todate && moment(todate).isAfter(subscriptionEndDate)) {
      return res.status(200).json({
        status: 401,
        message: 'To Date cannot be greater than subscription end date',
      });
    }
    const dateFilter = asiaKolkataDateTime(new Date(todate)).slice(0, 10);
    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);
    let showAttendanceLogs = false;
    if (
      +generateExcelFile ==
      attendanceReportMainReportTypes.REGISTER_2_INOUT_WITHLOGS
    ) {
      showAttendanceLogs = true;
    }
    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const userCondition = {
      companyMasterId: companyMasterID,
      status: userStatus,
    };

    if (userMasterID && userMasterID.length) {
      userCondition.userMasterID = userMasterID;
    }

    const empJoiningCondition = {
      joiningDate: {
        [Sequelize.Op.lte]: todate,
      },
      [Sequelize.Op.or]: [
        {
          leavingDate: { [Sequelize.Op.gte]: fromdate },
        },
        {
          leavingDate: { [Sequelize.Op.eq]: null },
        },
        {
          leavingDate: { [Sequelize.Op.eq]: '' },
        },
      ],
    };
    if (salarytype) empJoiningCondition.salarytype = salarytype;
    if (employmentType) empJoiningCondition.employment = employmentType;
    const userMasterIncludeModels = [
      {
        required: true,
        model: EmployeeJoiningDetails,
        as: 'emp_join',
        where: empJoiningCondition,
        attributes: [
          'employeeCode',
          'joiningDate',
          'leavingDate',
          'employment',
          'esicNumber',
          'adharName',
          'uanNumber',
          'dob',
          'fullMonthPresence',
        ],
      },

      {
        required: branchMasterID && branchMasterID.length ? true : false,
        model: EmployeeBranch,
        as: 'emp_branch',
        where: {
          status: 1,
          ...(branchMasterID &&
            (!Array.isArray(branchMasterID) || branchMasterID.length) && {
              branchID: branchMasterID,
            }),
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
        required: departmentID && departmentID.length ? true : false,
        model: EmployeeDepartment,
        as: 'emp_dept',
        where: {
          status: 1,
          ...(departmentID &&
            (!Array.isArray(departmentID) || departmentID.length) && {
              departmentID,
            }),
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
        required: designationID && designationID.length ? true : false,

        model: EmployeeDesignation,
        as: 'emp_desig',
        where: {
          status: 1,
          ...(designationID &&
            (!Array.isArray(designationID) || designationID.length) && {
              designationID,
            }),
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
        required: divisionId ? true : false,
        model: EmployeeDivision,
        as: 'emp_div',
        where: {
          status: 1,
          ...(divisionId && { divisionId }),
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
        required: workingAreaId ? true : false,
        model: EmployeeWorkingArea,
        as: 'emp_area',
        where: {
          status: 1,
          ...(workingAreaId && { workingAreaId }),
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
      {
        required: false,
        model: EmployeeAttendancePolicy,
        as: 'empAttPolicy',
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
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        attributes: ['attendancePolicyID'],
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
              'coff',
              'isWHAbsentRule',
            ],
          },
        ],
      },
      // weeoffPolicy
      {
        required: false,
        model: EmployeeWeekOff,
        as: 'emp_weekoff',

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
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        attributes: ['weekOffPolicyID'],
        include: [
          {
            model: weekOffPolicy,
            as: 'weekoff',
            attributes: [
              'weekoffType',
              'monthlyFix',
              'presentDays',
              'isNoWeekoffPolicy',
              'physicalPresent',
              'paidDays',
              'PHweekOffType',
              'isMinDaysForFixWf',
              'minPresentDaysForFixWF',
            ],
          },
        ],
      },

      // LCEG Policy
      {
        required: false,
        model: EmployeeLateEarlyPolicy,
        as: 'emp_lceg',
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
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        attributes: ['employeeLateEarlyPolicyID'],
        include: [
          {
            model: LateEarlyPolicy,
            as: 'lateEarlyPolicy',
            attributes: ['lateEarlyPolicyType', 'deductFrom'],
          },
        ],
      },
      // Employee project
      {
        required: projectID ? true : false,
        model: EmployeeProject,
        as: 'emp_pro',
        where: {
          status: 1,
          ...(projectID && { projectID }),
          startDate: {
            [Sequelize.Op.lte]: dateFilter,
          },
          [Sequelize.Op.or]: [
            {
              releaseDate: {
                [Sequelize.Op.gte]: dateFilter,
              },
            },
            {
              releaseDate: {
                [Sequelize.Op.eq]: null,
              },
            },
          ],
        },
        attributes: ['projectID', 'startDate', 'releaseDate'],
        include: [
          {
            model: Project,
            attributes: ['projectID', 'projectName'],
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
            [Sequelize.Op.between]: [fromdate, todate],
          },
        },
      },
    ];

    if (
      generateExcelFile ==
      attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_VERTICAL
    ) {
      userMasterIncludeModels.push({
        required: false,
        model: AttendanceCorrectionRequest,
        where: {
          AttendanceDate: {
            [Sequelize.Op.between]: [fromdate, todate],
          },
          correctionStatus: {
            [Sequelize.Op.ne]: 4,
          },
        },
        attributes: ['AttendanceDate', 'authorizationStatus'],
      });
    }

    if (skillCategory) {
      const skillCategoryCondition = {};
      skillCategoryCondition.skillCategory = skillCategory;
      (skillCategoryCondition.applicableYYYYMM = {
        [Sequelize.Op.lte]: +YYYYMM,
      }),
        (skillCategoryCondition[Sequelize.Op.or] = [
          { endYYYYMM: { [Sequelize.Op.gte]: +YYYYMM } },
          { endYYYYMM: { [Sequelize.Op.eq]: null } },
        ]);
      userMasterIncludeModels.push({
        required: skillCategory ? true : false,
        model: EmployeeSkillCategory,
        as: 'emp_skill',
        where: skillCategoryCondition,
      });
    }
    let orderByArray = [['displayName', 'ASC']];

    if (sortField && sortField == sortFields.EMPLOYEECODE) {
      const employeeCodeSubquery = `
(
  SELECT ejd."employeeCode"
  FROM "employeeJoiningDetails" ejd
  WHERE ejd."userMasterID" = "userMaster"."userMasterID"
  LIMIT 1
)
`;

      orderByArray = [
        // 0. NULL / empty FIRST
        [
          Sequelize.literal(`
        CASE 
          WHEN ${employeeCodeSubquery} IS NULL 
               OR ${employeeCodeSubquery} = '' 
          THEN 0 
          ELSE 1 
        END
      `),
          'ASC',
        ],

        // 1. Pure numbers first
        [
          Sequelize.literal(`
        CASE 
          WHEN ${employeeCodeSubquery} ~ '^[0-9]+$' 
          THEN 0 
          ELSE 1 
        END
      `),
          'ASC',
        ],

        // 2. Numeric sort
        [
          Sequelize.literal(`
        CASE 
          WHEN ${employeeCodeSubquery} ~ '^[0-9]+$' 
          THEN (${employeeCodeSubquery})::int 
        END
      `),
          'ASC',
        ],

        // 3. Prefix (alphabet part)
        [
          Sequelize.literal(`
        substring(${employeeCodeSubquery} FROM '^[^0-9]+')
      `),
          'ASC',
        ],

        // 4. Numeric part (natural sort)
        [
          Sequelize.literal(`
        CASE 
          WHEN ${employeeCodeSubquery} ~ '[0-9]+' 
          THEN substring(${employeeCodeSubquery} FROM '[0-9]+')::int 
        END
      `),
          'ASC',
        ],

        // 5. Final fallback
        [Sequelize.literal(`${employeeCodeSubquery}`), 'ASC'],

        ['displayName', 'ASC'],
      ];
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows: allUsersData, count: totalcount } =
      await UserMaster.findAndCountAll({
        distinct: true,
        where: { ...userAccessCondition.where, ...userCondition },
        ...paginationQuery,
        include: [
          ...userAccessCondition.includeModels,
          ...userMasterIncludeModels,
        ],
        order: orderByArray,
        attributes: ['userMasterID', 'displayName', 'userNumber'],
      });

    if (allUsersData.length == 0) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('User'),
      });
    }
    const allUserIDs = allUsersData.map((e) => e.userMasterID);

    const attendaceIncludeArray = [
      {
        required: false,
        model: overTimeCalculation,
        attributes: [
          'OverTimeHourAndMin',
          'AuthorizationRequired',
          'UpdateOverTimeHourAndMin',
        ],
      },
      {
        model: Shift,
        attributes: ['shiftName'],
      },
    ];
    if (showAttendanceLogs) {
      attendaceIncludeArray.push({
        required: false,
        model: AttendanceLogs,
        attributes: [
          'logDateTime',
          'direction',
          'AttendanceTransID',
          'attendnaceFrom',
        ],
        order: [['logDateTime', 'ASC']],
      });
    }
    const attendancedata1 = attendanceTransaction.findAll({
      where: {
        userMasterID: allUserIDs,
        AttendanceDate: {
          [Sequelize.Op.between]: [new Date(fromdate), new Date(todate)],
        },
      },
      include: attendaceIncludeArray,
      order: [['AttendanceDate', 'ASC']],
    });
    const weekholidaydata1 = await weekoffHolidayTran.findAll({
      where: {
        userMasterID: allUserIDs,
        date: {
          [Sequelize.Op.between]: [new Date(fromdate), new Date(todate)],
        },
        [Sequelize.Op.or]: [
          { optionalHoliday: false },
          { optionalHoliday: null },
        ],
        [Sequelize.Op.and]: Sequelize.literal(`
      ("weekoffHolidayTran"."date", "weekoffHolidayTran"."tableName") IN (
        SELECT date, MAX("tableName")
        FROM "weekoffHolidayTrans"
        WHERE "userMasterID" IN (${allUserIDs.join(',')})
          AND date BETWEEN '${fromdate}' AND '${todate}'
          AND ("optionalHoliday" IS FALSE OR "optionalHoliday" IS NULL)
        GROUP BY "userMasterID", date
      )
    `),
      },
      attributes: [
        'userMasterID',
        'date',
        'optionalHoliday',
        'tableName',
        'value',
      ],
      order: [
        ['date', 'ASC'],
        ['tableName', 'DESC'],
      ],
    });

    const userleaveData1 = UserLeave.findAll({
      where: {
        userMasterID: allUserIDs,
        [Sequelize.Op.or]: [
          {
            FromDate: {
              [Sequelize.Op.between]: [new Date(fromdate), new Date(todate)],
            },
          },
          {
            ToDate: {
              [Sequelize.Op.between]: [new Date(fromdate), new Date(todate)],
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
              model: HrLeaveTypes,
              attributes: ['LeaveID'],
              include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
            },
          ],
          attributes: ['LeaveTranId', 'days', 'date', 'status'],
        },
        {
          model: HrLeaveTypes,
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
        userMasterID: allUserIDs,
        status: 1,
        authorizationStatus: {
          [Sequelize.Op.ne]: 4,
        },

        [Sequelize.Op.or]: [
          {
            fromDate: {
              [Sequelize.Op.lte]: fromdate,
            },
            toDate: {
              [Sequelize.Op.gte]: fromdate,
            },
          },
          {
            fromDate: {
              [Sequelize.Op.lte]: todate,
            },
            toDate: {
              [Sequelize.Op.gte]: todate,
            },
          },
          {
            fromDate: {
              [Sequelize.Op.gte]: fromdate,
            },
            toDate: {
              [Sequelize.Op.lte]: todate,
            },
          },
        ],
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
    const companyLeaveTypes1 = HrLeaveTypes.findAll({
      where: {
        LeaveID: {
          [Sequelize.Op.notIn]: [5],
        },
        status: 1,
        companyMasterID,
        [Sequelize.Op.or]: [{ Leave_Allow: 'Y' }, { LeaveID: 25 }],
      },
      include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
    });
    let allUserTrackingKMs1 = Promise.resolve([]); // default if not required
    let allUserExpense1 = Promise.resolve([]); // default if not required
    if (showAttendanceLogs) {
      const trackingKMsTargetModel =
        new Date(fromdate) >= new Date(TRACKING_MIGRATION_DATE)
          ? TrackingKM
          : TrackingKMsOld;

      const from = new Date(fromdate);
      from.setHours(0, 0, 0, 0);

      const to = new Date(todate);
      to.setHours(23, 59, 59, 999);

      const trackingKmsCondition = {
        date: {
          [Sequelize.Op.between]: [from, to],
        },
        userMasterID: allUserIDs,
      };

      allUserTrackingKMs1 = trackingKMsTargetModel.findAll({
        raw: true,
        where: trackingKmsCondition,
        attributes: ['userMasterID', 'date', 'kilometer'],
      });

      const userExpenseCondition = {
        userMasterID: allUserIDs,
        expense_date: {
          [Sequelize.Op.between]: [new Date(fromdate), new Date(todate)],
        },
      };

      const order = [['userExpenseID', 'ASC']];
      allUserExpense1 = UserExpense.findAll({
        where: userExpenseCondition,
        order,
        include: [
          {
            required: true,
            model: UserExpenseTransaction,
            as: 'ut',
            where: {
              status: 1,
              authorizationStatus: {
                [Sequelize.Op.in]: [
                  AuthorizationStatusType.PENDING_ZERO,
                  AuthorizationStatusType.PEDING_ONE,
                  AuthorizationStatusType.PEDING_TWO,
                  AuthorizationStatusType.APPROVED,
                ],
              },
            },
          },
        ],
      });
    }
    const [
      attendancedata,
      weekholidaydata,
      userleaveData,
      userWorkFromHomeData,
      companyLeaveTypes,
      allUserTrackingKMs,
      allUserExpense,
    ] = await Promise.all([
      attendancedata1,
      weekholidaydata1,
      userleaveData1,
      userWorkFromHomeData1,
      companyLeaveTypes1,
      allUserTrackingKMs1,
      allUserExpense1,
    ]);

    const beforeUserIds = [];

    for (const user of allUsersData) {
      const userWeekOffPolicy = user.emp_weekoff?.[0]?.weekoff || null;
      const fullMonthPresence = user?.emp_join?.[0]?.fullMonthPresence || 0;

      if (!userWeekOffPolicy?.minPresentDaysForFixWF || fullMonthPresence)
        continue;
      beforeUserIds.push(user.userMasterID);
    }

    const {
      before_attendanceMap,
      before_weekoffHolidayMap,
      before_outDutyMap,
    } = await get7DaysBefore_WeekoffHoliday_Attendance_Map(
      beforeUserIds,
      fromdate,
    );

    const datesArray = await getDatesFromDateRange(
      new Date(fromdate),
      new Date(todate),
    );
    const formattedDatesArray = datesArray.map((e) =>
      moment(e).format('DD-MM-YYYY'),
    );
    const sortedCompanyLeaveTypes = companyLeaveTypes.sort(
      (a, b) => a.LeaveTranId - b.LeaveTranId,
    );
    const leaveNamesArray = sortedCompanyLeaveTypes.map(
      (e) => e.LeaveMaster.LeaveName,
    );
    const responseObj = {
      start_date: fromdate,
      end_date: todate,
      users: [],
    };
    userDataLoop: for (let user of allUsersData) {
      const hrLeaveMasters = sortedCompanyLeaveTypes.map((e) => {
        return {
          LeaveID: e.LeaveID,
          LeaveTranId: e.LeaveTranId,
          LeaveTranId: e.LeaveTranId,
          LeaveName: e.LeaveMaster.LeaveName,
          usedCount: 0,
        };
      });
      const userProjects = user?.emp_pro ?? [];
      const projectNameArray = userProjects.map(
        ({ project }) => project?.projectName ?? '',
      );
      const userObj = {
        userMasterID: user.userMasterID,
        employeeCode: parseEmployeeInfoAlias(user)?.employeeCode,
        displayName: user?.displayName,
        userNumber: user?.userNumber,
        company: parseEmployeeInfoAlias(user)?.companyName,
        branch: parseEmployeeInfoAlias(user)?.branch,
        department: parseEmployeeInfoAlias(user)?.department,
        designation: parseEmployeeInfoAlias(user)?.designation,
        division: parseEmployeeInfoAlias(user)?.division,
        workingArea: parseEmployeeInfoAlias(user)?.workingArea,
        project: projectNameArray?.join(', ') || '',
        userStatus: +user.status == 1 ? 'Active' : 'Deactive',
        fullMonthPresence: user?.emp_join?.[0]?.fullMonthPresence || 0,
        joiningDate: user?.emp_join?.[0]?.joiningDate || '',
        formattendJoiningDate: user.emp_join?.[0]?.joiningDate
          ? moment(user.emp_join?.[0]?.joiningDate, 'YYYY-MM-DD').format(
              'DD-MM-YYYY',
            )
          : '',
        leavingDate: user?.emp_join?.[0]?.leavingDate || '',
        formattedLeavingDate: user.emp_join?.[0]?.leavingDate
          ? moment(user.emp_join?.[0]?.leavingDate, 'YYYY-MM-DD').format(
              'DD-MM-YYYY',
            )
          : '',
        totalMonthDays: datesArray.length,
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
        actualWorkingMinutes: 0,
        daysBeforeJoiningOrAfterLeft: 0,
        actualWorkingDays: 0,
        latePenaltyDays: 0,
        earlyPenaltyDays: 0,
        pendingWorkFromHome: 0,
        approvedWorkFromHome: 0,
        leaveCountsData: hrLeaveMasters,
        attendanceData: [],
        allDayAttedanceStatus: [],
        allDayIntimes: [],
        allDayOnlyIntimes: [],
        allDayOuttimes: [],
        allDayOnlyOuttimes: [],
        allDayRoundOffHours: [],
        allDayShiftNames: [],
        allDayOvertimeHours: [],
        totalInHours: 0,
        totalOutHours: 0,
        totalRoundOffHours: 0,
        totalRoundOffMinutes: 0,
        totalWithoutOtMinutes: 0,
        totalLateby: 0,
        totalEarlyBy: 0,
        totalShiftShortfallMinutes: 0,
        totalOtMinutes: 0,
        totalBreakMinutes1: 0,
        totalBreakMinutes2: 0,
        pendingOutDuty: 0,
        approvedOutDuty: 0,
        pendingAttendanceCorrection: 0,
        approvedAttendanceCorrection: 0,
      };

      // Attendance correction
      if (
        generateExcelFile ===
        attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_VERTICAL
      ) {
        const attendanceCorrData = user.attendanceCorrectionRequests || [];

        let pendingAttendanceCorrection = 0;
        let approvedAttendanceCorrection = 0;

        for (const correction of attendanceCorrData) {
          const status = +correction.authorizationStatus;

          if (
            status === AuthorizationStatusType.PEDING_ONE ||
            status === AuthorizationStatusType.PEDING_TWO ||
            status === AuthorizationStatusType.PENDING_ZERO
          ) {
            pendingAttendanceCorrection++;
          } else if (status === AuthorizationStatusType.APPROVED) {
            approvedAttendanceCorrection++;
          }
        }

        userObj.pendingAttendanceCorrection = pendingAttendanceCorrection;
        userObj.approvedAttendanceCorrection = approvedAttendanceCorrection;
      }
      // User Leave
      const userLeave = userleaveData.filter((leave) => {
        return +leave.userMasterID == +user.userMasterID;
      });
      // User Leave
      const userWorkFromHome = userWorkFromHomeData.filter((wfh) => {
        return +wfh.userMasterID == +user.userMasterID;
      });
      // User WeekOff
      const userWeekOffData = weekholidaydata.filter((att) => {
        return (
          +user.userMasterID === +att.userMasterID &&
          att.tableName === 'weekoff' &&
          att.date >= userObj.joiningDate &&
          (!userObj.leavingDate || att.date <= userObj.leavingDate)
        );
      });

      // User Holiday
      const userHolidayData = weekholidaydata.filter((att) => {
        return (
          +user.userMasterID == +att.userMasterID &&
          att.tableName == 'holiday' &&
          att.date >= userObj.joiningDate &&
          (!userObj.leavingDate || att.date <= userObj.leavingDate)
        );
      });
      const weekoffholidayData = [...userWeekOffData, ...userHolidayData];

      // User AttendanceData
      const userAttendnaceData = attendancedata.filter((att) => {
        return +att.userMasterID == +user.userMasterID;
      });

      // User Attendance Policies
      const userAttendancePolicy =
        user.empAttPolicy?.[0]?.attendancePolicy || null;
      // Get Week Off Holiday Priority
      const weekOffHolidayPriority = userAttendancePolicy?.WHPHPriority || 'WO';
      const userWeekOffPolicy = user.emp_weekoff?.[0]?.weekoff || null;
      const weekoffPolicyType = userWeekOffPolicy?.weekoffType || null;
      // LCEG Policy
      const LCEGPolicy = user.emp_lceg?.[0]?.lateEarlyPolicy || null;
      let attendanceMonthStartDate = new Date(fromdate);
      let attendanceMonthEndDate = new Date(todate);
      const approvedLeavesArray = userLeave
        .flatMap((e) => e.userLeaveTransactions)
        .filter((tran) => tran.status == 1);
      let checkWeekoff = true;
      // if monthly fix weekoff or on present days
      if (
        [
          weekoffTypeEnum.MONTHLYFIX,
          weekoffTypeEnum.ONPAIDDAYS,
          weekoffTypeEnum.ONPRESENTDAY,
        ].includes(weekoffPolicyType)
      ) {
        checkWeekoff = false;
      }
      const finalweekoffholidays = userObj.fullMonthPresence
        ? weekoffholidayData
        : await toGetFinalHolidayWeekoff(
            userAttendnaceData,
            userAttendancePolicy,
            checkWeekoff ? weekoffholidayData : userHolidayData,
            approvedLeavesArray,
            attendanceMonthStartDate,
            attendanceMonthEndDate,
            userObj.userMasterID,
          );

      // if check weekoff is true
      let finalWeekoffs = userObj.fullMonthPresence
        ? userWeekOffData
        : checkLeaveOnWH(
            approvedLeavesArray,
            checkWeekoff ? finalweekoffholidays.weekoffs : userWeekOffData,
            true,
          );

      const finalHolidays = userObj.fullMonthPresence
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
        !userObj.fullMonthPresence
      ) {
        // for before weekoff/holiday ----------------------
        const userWiseBeforeWH = before_weekoffHolidayMap?.get(
          +user.userMasterID,
        );
        const beforeWeekoffHoliday = getAllWeekoffHolidayWithPriority(
          userWiseBeforeWH,
          weekOffHolidayPriority == 'PH'
            ? offDayCategoryEnum.HOLIDAY
            : offDayCategoryEnum.WEEKOFF,
        );

        // for before AttendanceData ----------------------

        const beforeAttendanceData = before_attendanceMap?.get(
          +user.userMasterID,
        );

        // for before out Duty Data ----------------------

        const beforeOutDutyData = before_outDutyMap?.get(+user.userMasterID);

        const finalOutDutyData = approvedLeavesArray.filter(
          (e) => e.hrLeaveType?.LeaveID == 25,
        );
        const { WeekoffAbsent, earningWeekoff } =
          getWeekOffBasedOnWeekoffAbsent({
            beforeWH: beforeWeekoffHoliday,
            beforeAttendance: beforeAttendanceData,
            actualWeekoff: userWeekOffData,
            weekOffData: finalWeekoffs,
            holidayData: finalHolidays,
            attendanceData: userAttendnaceData,
            startDate: fromdate,
            weekoffPolicy: userWeekOffPolicy,
            joiningDate: userObj.joiningDate,
            beforeOutDutyData: beforeOutDutyData,
            outDutyData: finalOutDutyData,
          });

        weekoffAbsentArray = WeekoffAbsent;
        finalWeekoffs = earningWeekoff;
      }

      const userTrackingKMs = showAttendanceLogs
        ? allUserTrackingKMs.filter((e) => {
            return e.userMasterID == user.userMasterID;
          })
        : [];
      const userExpenses = showAttendanceLogs
        ? allUserExpense.filter((e) => {
            return e.userMasterID == user.userMasterID;
          })
        : [];

      // short leave map date wise
      const userWiseShortLeave = user.userShortLeaves || [];

      // create short leave map

      const shortLeaveMap = new Map();

      for (const shortleave of userWiseShortLeave) {
        const key = shortleave.date;
        shortLeaveMap.set(key, shortleave);
      }

      attendanceLoop: while (
        attendanceMonthStartDate <= attendanceMonthEndDate
      ) {
        let attendanceDateObj = new Date(attendanceMonthStartDate);

        const attendanceObj = {
          attendanceDate: asiaKolkataDateTime(attendanceDateObj).slice(0, 10),
          formattedAttendanceDate: '',
          title: [],
          inTime: '',
          outTime: '',
          inDateTime: '',
          outDateTime: '',
          minutes: '',
          shift: '',
          shiftHours: '',
          shiftInTime: '',
          shiftOutTime: '',
          Lateby: '',
          EarlyBy: '',
          Penalty: '',
          latePenaltyMinutes: '',
          PenaltyDeduction: '',
          goEarlyPanalty: '',
          goEarlyPanaltyDeduction: '',
          earlyPenaltyMinutes: '',
          GoEarlyUsed: '',
          roundOffMinutes: 0,
          roundOffHours: null,
          noOfPunches: '',
          punchingDevices: [],
          punchingDevicesRemarks: [],
          KMSTravelled: 0,
          expenseApplied: 0,
          userWorkFromHomeLabel: [],
          finalminutes: 0,
          logData: [],
          otMinutes: null,
          overtimeHours: 0,
          outMinutes: 0,
          inHours: null,
          outHours: null,
          otStatus: null,
          breakStartTime1: null,
          breakEndTime1: null,
          breakMinutes1: null,
          breakStartTime2: null,
          breakEndTime2: null,
          breakMinutes2: null,
          remarks: null,
          withoutOtMinutes: '',
          LCPenaltyFrom: '',
          EGPenaltyFrom: '',
          isManual: false,
          shiftShortfallMinutes: null,
          isWHConvertedToOT: '',
        };

        // Format using moment
        attendanceObj.formattedAttendanceDate = moment(
          attendanceObj.attendanceDate,
          'YYYY-MM-DD',
        ).format('DD-MM-YYYY');

        attendanceDateObj.setDate(attendanceDateObj.getDate() + 1);
        // Set updated date back if needed
        attendanceMonthStartDate = attendanceDateObj;
        if (
          new Date(attendanceObj.attendanceDate) <
            new Date(userObj.joiningDate) ||
          (userObj.leavingDate &&
            new Date(attendanceObj.attendanceDate) >
              new Date(userObj.leavingDate))
        ) {
          userObj.daysBeforeJoiningOrAfterLeft++;
          attendanceObj.title.push('-');
          attendanceObj.title = attendanceObj.title.join('+');
          pushDataToUserObj(generateExcelFile, userObj, attendanceObj);
          userObj.attendanceData.push(attendanceObj);
          continue attendanceLoop;
        }
        // weekoff data
        const actucalWeekOffData =
          userWeekOffData && userWeekOffData.length > 0
            ? userWeekOffData.find((att) => {
                return (
                  new Date(att.date).getTime() ==
                  new Date(attendanceObj.attendanceDate).getTime()
                );
              })
            : null;

        // Holiday Data
        const actualHolidayData =
          userHolidayData && userHolidayData.length > 0
            ? userHolidayData.find((att) => {
                return (
                  new Date(att.date).getTime() ===
                  new Date(attendanceObj.attendanceDate).getTime()
                );
              })
            : null;
        // weekoff data
        const weekOffData =
          finalWeekoffs && finalWeekoffs.length > 0
            ? finalWeekoffs.find((att) => {
                return (
                  new Date(att.date).getTime() ==
                  new Date(attendanceObj.attendanceDate).getTime()
                );
              })
            : null;
        // Holiday Data
        const holidayData =
          finalHolidays && finalHolidays.length > 0
            ? finalHolidays.find((att) => {
                return (
                  new Date(att.date).getTime() ===
                  new Date(attendanceObj.attendanceDate).getTime()
                );
              })
            : null;

        // Weekoff Absent Data
        const weekOffAbsentData =
          weekoffAbsentArray?.length > 0
            ? weekoffAbsentArray.find((att) => {
                return (
                  new Date(att.date).getTime() ===
                  new Date(attendanceObj.attendanceDate).getTime()
                );
              })
            : null;

        const userleaveDateWise = userLeave.filter((leave) => {
          return (
            new Date(leave.FromDate) <=
              new Date(attendanceObj.attendanceDate) &&
            new Date(leave.ToDate) >= new Date(attendanceObj.attendanceDate)
          );
        });
        const userWorkFromHomeDateWise = userWorkFromHome.filter((leave) => {
          return (
            new Date(leave.fromDate) <=
              new Date(attendanceObj.attendanceDate) &&
            new Date(leave.toDate) >= new Date(attendanceObj.attendanceDate)
          );
        });

        const getDayTypeLabel = (dayType) => {
          if (dayType === 'First Half') return '(FH)';
          if (dayType === 'Second Half') return '(SH)';
          return '';
        };
        const getDayValue = (dayType) => {
          return dayType === 'First Half' || dayType === 'Second Half'
            ? 0.5
            : 1;
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
            attendanceObj.userWorkFromHomeLabel.push(`WFH ${suffix}`.trim());
            userObj.approvedWorkFromHome += dayValue;
            continue;
          }

          // PENDING (Applied)
          if ([0, 1, 2].includes(wfh.authorizationStatus)) {
            attendanceObj.userWorkFromHomeLabel.push(
              `WFH Applied ${suffix}`.trim(),
            );
            userObj.pendingWorkFromHome += dayValue;
            continue;
          }
        }
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
              userObj.pendingOutDuty += 1;
              totalUnApprovedOutDutyDays += 1;
            } else {
              userObj.pendingLeaveCount += 1;
              totalUnApprovedLeaveDays += 1;
            }
            attendanceObj.title.push(`${leaveName} Applied`);
          } else {
            if (isOutDuty) {
              userObj.pendingOutDuty += leaveDays;
              totalUnApprovedOutDutyDays += leaveDays;
            } else {
              userObj.pendingLeaveCount += leaveDays;
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
                  new Date(attendanceObj.attendanceDate).getTime() &&
                leavetrans.status == 1
              ) {
                leavetrans.dataValues.DayType = leave.DayType;
                const leaveDate = new Date(leavetrans.date).getTime();
                const attendanceDate = new Date(
                  attendanceObj.attendanceDate,
                ).getTime();

                if (leaveDate == attendanceDate && +leavetrans.status == 1) {
                  let totalLeaveDays = 0;
                  const leaveID = leavetrans?.hrLeaveType?.LeaveID || null;
                  if (leaveID == 25) {
                    totalApprovedOutDutyDays += +leavetrans.days || 0;
                    totalLeaveDays = +leavetrans.days || 0;
                    if (weekOffData) {
                      userObj.approvedOutDutyOnWeekoffHoliday +=
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
                      userObj.approvedOutDutyOnWeekoffHoliday +=
                        +leavetrans.days || 0;
                      totalLeaveDays = 0;
                    } else {
                      userObj.approvedOutDuty += +leavetrans.days || 0;
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
                  // Update usedCount in hrLeaveMasters

                  const index = userObj.leaveCountsData.findIndex(
                    (item) => +item.LeaveTranId === +leavetrans.LeaveTranId,
                  );

                  const match =
                    index !== -1 ? userObj.leaveCountsData[index] : null;

                  if (match && +match.LeaveID == 18) {
                    userObj.leaveCountsData[index].usedCount +=
                      +leavetrans.days || 0;
                    userObj.unPaidLeaveCount += totalLeaveDays;
                  } else if (match && +match.LeaveID == 25) {
                    //Out Duty
                    userObj.leaveCountsData[index].usedCount += totalLeaveDays;
                    userObj.actualWorkingDays += totalLeaveDays;
                  } else if (match) {
                    userObj.leaveCountsData[index].usedCount += totalLeaveDays;
                    userObj.paidLeaveCount += totalLeaveDays;
                    userObj.actualWorkingDays += totalLeaveDays;
                  }
                }
              }
            }
          }
        }
        totalLeaveDays += totalUnApprovedLeaveDays + totalApprovedLeaveDays;
        totalOutDutyDays +=
          totalUnApprovedOutDutyDays + totalApprovedOutDutyDays;
        const totalLeaveAndOutDutyDays = totalLeaveDays + totalOutDutyDays;
        const isSandwichleave =
          (actucalWeekOffData &&
            !weekOffData &&
            !weekOffAbsentData &&
            +totalApprovedLeaveDays != 1) ||
          (actualHolidayData && !holidayData && +totalApprovedLeaveDays != 1)
            ? true
            : false;
        // For Future Date
        // For Future Date
        if (new Date(attendanceObj.attendanceDate) > new Date(currentdate)) {
          // Leave Request
          if (unApprovedLeave.length) {
            attendanceObj.title.push(...allPendingLeaveNames);
          }
          if (approveLeave.length > 0) {
            attendanceObj.title.push(...allApprovedLeaveNames);
          }
          if (totalLeaveAndOutDutyDays < 1) {
            let title = '';
            if (actucalWeekOffData && actualHolidayData) {
              if (weekOffHolidayPriority == 'PH') {
                userObj.holidayCount += actualHolidayData.value;
                title = 'HD';
              } else {
                if (totalLeaveAndOutDutyDays == 0) {
                  userObj.weekOffCount += actucalWeekOffData.value;
                  if (actucalWeekOffData.value < 1) {
                    title = 'WO (SH)';
                    if (userObj.fullMonthPresence) {
                      attendanceObj.title.push('P');
                      userObj.presentCount += 1 - actucalWeekOffData.value;
                    } else {
                      attendanceObj.title.push('A');
                      userObj.absentCount += 1 - actucalWeekOffData.value;
                    }
                  } else {
                    title = 'WO';
                  }
                }
              }
            } else if (actucalWeekOffData) {
              if (totalLeaveAndOutDutyDays == 0) {
                userObj.weekOffCount += actucalWeekOffData.value;
                if (actucalWeekOffData.value < 1) {
                  title = 'WO (SH)';
                  if (totalOutDutyDays == 0) {
                    if (userObj.fullMonthPresence) {
                      attendanceObj.title.push('P');
                      userObj.presentCount += 1 - actucalWeekOffData.value;
                    } else {
                      attendanceObj.title.push('A');
                      userObj.absentCount += 1 - actucalWeekOffData.value;
                    }
                  }
                } else {
                  title = 'WO';
                }
              } else if (
                totalLeaveAndOutDutyDays == 0.5 &&
                weekOffData.value < 1
              ) {
                userObj.weekOffCount += weekOffData.value;
                title = 'WO (SH)';
              }
            } else if (actualHolidayData) {
              userObj.holidayCount += actualHolidayData.value;
              title = 'HD';
            } else if (totalLeaveDays == 0.5) {
              if (userObj.fullMonthPresence) {
                attendanceObj.title.push('P');
                userObj.presentCount += 0.5;
              } else {
                attendanceObj.title.push('A');
                userObj.absentCount += 0.5;
              }
            } else if (totalLeaveDays == 0) {
              if (userObj.fullMonthPresence) {
                attendanceObj.title.push('P');
                userObj.presentCount += 1;
              } else {
                attendanceObj.title.push('A');
                userObj.absentCount += 1;
              }
            }
            if (title) {
              attendanceObj.title.push(title);
            }
          }
          attendanceObj.title.push(...attendanceObj.userWorkFromHomeLabel);

          // for short leave

          const shortLeave = shortLeaveMap.get(attendanceObj.attendanceDate);

          if (shortLeave) {
            attendanceObj.title.push('SHL');
            userObj.shortDayLeaveCount += 1;
          }

          attendanceObj.title = attendanceObj.title.join('+');
          pushDataToUserObj(generateExcelFile, userObj, attendanceObj);
          userObj.attendanceData.push(attendanceObj);
          continue attendanceLoop;
        }
        const dateWiseAttendaceData = userAttendnaceData.find((att) => {
          return att.AttendanceDate == attendanceObj.attendanceDate;
        });

        attendanceObj.isWHConvertedToOT =
          dateWiseAttendaceData?.isWHConvertedToOT ? 'Yes' : '';

        // DateWise Attendace
        if (dateWiseAttendaceData) {
          userObj.actualWorkingMinutes +=
            dateWiseAttendaceData.roundOffMinutes || 0;
          attendanceObj.roundOffMinutes =
            dateWiseAttendaceData.roundOffMinutes || 0;
          attendanceObj.roundOffHours = minutesToHoursMinutes(
            dateWiseAttendaceData.roundOffMinutes || 0,
          );
          if (dateWiseAttendaceData.InDatetime) {
            attendanceObj.inTime = moment(
              dateWiseAttendaceData.InDatetime,
            ).format('HH:mm:ss'); // 24-hour format
            attendanceObj.inDateTime = moment(
              dateWiseAttendaceData.InDatetime,
            ).format('DD-MM-YYYY HH:mm:ss'); // 24-hour format
          }

          if (dateWiseAttendaceData.OutDateTime) {
            attendanceObj.outTime = moment(
              dateWiseAttendaceData.OutDateTime,
            ).format('HH:mm:ss'); // 24-hour format
            attendanceObj.outDateTime = moment(
              dateWiseAttendaceData.OutDateTime,
            ).format('DD-MM-YYYY HH:mm:ss'); // 24-hour format
          }

          const attendaceDate_OTData =
            dateWiseAttendaceData.OverTimeCalculations?.[0] || null;
          if (
            attendaceDate_OTData &&
            attendaceDate_OTData.AuthorizationRequired != 4
          ) {
            if (attendaceDate_OTData.AuthorizationRequired == 3) {
              attendanceObj.otStatus = 'Approved';
              attendanceObj.otMinutes =
                +attendaceDate_OTData.UpdateOverTimeHourAndMin;
              userObj.totalOtMinutes +=
                +attendaceDate_OTData.UpdateOverTimeHourAndMin || 0;
            } else {
              attendanceObj.otStatus = 'Pending';
              attendanceObj.otMinutes =
                +attendaceDate_OTData.OverTimeHourAndMin;
              userObj.totalOtMinutes +=
                +attendaceDate_OTData.OverTimeHourAndMin || 0;
            }
            const hours = minutesToHoursMinutes(+attendanceObj.otMinutes || 0);
            attendanceObj.overtimeHours = hours;
          }
          const totalMinutes =
            (+dateWiseAttendaceData.InHrs || 0) +
            (+dateWiseAttendaceData.OutHrs || 0);

          userObj.totalInHours += Number(dateWiseAttendaceData?.InHrs ?? 0);
          userObj.totalOutHours += Number(dateWiseAttendaceData?.OutHrs ?? 0);
          userObj.totalRoundOffMinutes += Number(
            dateWiseAttendaceData?.roundOffMinutes ?? 0,
          );
          userObj.totalWithoutOtMinutes += Number(
            dateWiseAttendaceData?.withoutOtMinutes ?? 0,
          );
          userObj.totalLateby += Number(dateWiseAttendaceData?.LateBy ?? 0);
          userObj.totalEarlyBy += Number(dateWiseAttendaceData?.EarlyBy ?? 0);
          userObj.totalShiftShortfallMinutes += Number(
            dateWiseAttendaceData?.shiftShortfallMinutes ?? 0,
          );
          userObj.totalBreakMinutes1 += Number(
            dateWiseAttendaceData?.lunchBreak ?? 0,
          );
          userObj.totalBreakMinutes2 += Number(
            dateWiseAttendaceData?.teaBreak ?? 0,
          );
          Object.assign(attendanceObj, {
            minutes: toHoursAndMinutes(totalMinutes),

            shift: dateWiseAttendaceData.shift?.shiftName || '',
            shiftHours: dateWiseAttendaceData.Shifthrs || '',
            shiftInTime: dateWiseAttendaceData.ShiftIntime || '',
            shiftOutTime: dateWiseAttendaceData.ShiftoutTime || '',

            Lateby: dateWiseAttendaceData.LateBy || '',
            EarlyBy: dateWiseAttendaceData.EarlyBy || '',

            Penalty: dateWiseAttendaceData.Panalty || '',
            goEarlyPanalty: dateWiseAttendaceData.goEarlyPanalty || '',
            goEarlyPanaltyDeduction:
              dateWiseAttendaceData.goEarlyPanaltyDeduction || '',

            latePenaltyMinutes: dateWiseAttendaceData.latePenaltyMinutes || '',
            earlyPenaltyMinutes:
              dateWiseAttendaceData.earlyPenaltyMinutes || '',
            PenaltyDeduction: dateWiseAttendaceData.PanaltyDeduction || '',

            roundOffMinutes: dateWiseAttendaceData.roundOffMinutes || '',
            roundOffHours: dateWiseAttendaceData.roundOffMinutes
              ? minutesToHoursMinutes(
                  dateWiseAttendaceData.roundOffMinutes || 0,
                )
              : '',
            finalminutes: totalMinutes || '',
            outMinutes: +dateWiseAttendaceData.OutHrs,
            inHours: dateWiseAttendaceData?.InHrs || '',
            outHours: dateWiseAttendaceData?.OutHrs || '',
            breakStartTime1: dateWiseAttendaceData?.lunchBreakStartTime || '',
            breakEndTime1: dateWiseAttendaceData?.lunchBreakEndTime || '',
            breakMinutes1: dateWiseAttendaceData?.lunchBreak || '',
            breakStartTime2: dateWiseAttendaceData?.teaBreakInStartTime || '',
            breakEndTime2: dateWiseAttendaceData?.teaBreakEndTime || '',
            breakMinutes2: dateWiseAttendaceData?.teaBreak || '',
            remarks: dateWiseAttendaceData?.remarks || null,
            withoutOtMinutes: dateWiseAttendaceData?.withoutOtMinutes || '',
            LCPenaltyFrom: dateWiseAttendaceData?.LCPenaltyFrom || '',
            EGPenaltyFrom: dateWiseAttendaceData?.EGPenaltyFrom || '',
            isManual: dateWiseAttendaceData?.isManual || false,
            shiftShortfallMinutes:
              dateWiseAttendaceData?.shiftShortfallMinutes || null,
          });
          if (showAttendanceLogs) {
            const userKMsDateWise = userTrackingKMs.find(
              (e) =>
                new Date(e.date).getTime() ===
                new Date(attendanceObj.attendanceDate).getTime(),
            );
            if (userKMsDateWise) {
              attendanceObj.KMSTravelled = userKMsDateWise.kilometer;
            }
            const targetDateStr = moment(attendanceObj.attendanceDate).format(
              'YYYY-MM-DD',
            );

            attendanceObj.expenseApplied = userExpenses.reduce((total, e) => {
              if (
                moment(e.expense_date).format('YYYY-MM-DD') !== targetDateStr
              ) {
                return total;
              }

              const expenseTotal = (e.ut || []).reduce(
                (sum, t) => sum + (t.expenseAmount || 0),
                0,
              );

              return total + expenseTotal;
            }, 0);
            const showLogWithDatetime = selectedShowFields.includes(
              'Logs With Date-Time',
            );

            const devicesSet = new Set();
            const logData = [];
            const dateWiseAttLogs = (
              dateWiseAttendaceData?.attendancelogs || []
            ).sort((a, b) => new Date(a.logDateTime) - new Date(b.logDateTime));
            for (let log of dateWiseAttLogs) {
              // collect punching devices
              if (log.attendnaceFrom) {
                devicesSet.add(log.attendnaceFrom);
              }
              // format logs
              if (log.logDateTime) {
                const format = showLogWithDatetime
                  ? 'DD-MM-YYYY HH:mm'
                  : 'HH:mm';

                logData.push(
                  `${moment(log.logDateTime).format(format)} - ${log.direction}`,
                );
              } else {
                logData.push('-');
              }
              let attendanceFromArray = [...devicesSet];
              if (
                attendanceFromArray.includes('manual') ||
                attendanceObj.isManual
              ) {
                attendanceFromArray = ['manual'];
              }
              attendanceObj.punchingDevices = [...devicesSet];
              attendanceObj.punchingDevicesRemarks = attendanceFromArray;
              attendanceObj.logData = logData;
              attendanceObj.noOfPunches = logData.length;
            }
          }
        }

        if (dateWiseAttendaceData && totalApprovedOutDutyDays < 1) {
          if (userObj.fullMonthPresence) {
            if (weekOffData || holidayData) {
            } else {
              // Check For Current Date
              attendanceObj.title.push('P');
              if (totalLeaveAndOutDutyDays == 0) {
                userObj.presentCount += 1;
                userObj.actualWorkingDays += 1;
              } else {
                userObj.presentCount += 0.5;
                userObj.actualWorkingDays += 0.5;
              }
            }
          } else {
            if (
              dateWiseAttendaceData.OutDateTime == null &&
              dateWiseAttendaceData.InDatetime &&
              currentdate != dateWiseAttendaceData.AttendanceDate
            ) {
              // Check For Miss Punch
              userObj.missPunchCount += 1;
              attendanceObj.title.push('MP');
              if (!weekOffData && !holidayData) {
                if (totalLeaveAndOutDutyDays == 0.5) {
                  userObj.absentDueToMissPunchCount += 0.5;
                } else {
                  userObj.absentDueToMissPunchCount += 1;
                }
              }
            } else {
              if (dateWiseAttendaceData.fulldayhalfday == 1) {
                attendanceObj.title.push('P');

                if (weekOffAbsentData) {
                  attendanceObj.title.push(
                    attendanceStatusForCalender.WEEKOFF_ABSENT,
                  );
                }

                if (weekOffData || holidayData) {
                  if (weekOffData) {
                    if (weekOffData.value < 1) {
                      userObj.presentOnWeekOffHolidayCount += 0.5;
                    } else {
                      userObj.presentOnWeekOffHolidayCount += 1;
                    }
                  } else {
                    userObj.presentOnWeekOffHolidayCount += 1;
                  }
                } else {
                  if (totalLeaveAndOutDutyDays == 0) {
                    userObj.presentCount += 1;
                    userObj.actualWorkingDays += 1;
                  } else {
                    userObj.presentCount += 0.5;
                    userObj.actualWorkingDays += 0.5;
                  }
                }
              } else if (dateWiseAttendaceData.fulldayhalfday == 0.5) {
                attendanceObj.title.push('HFD');

                if (weekOffAbsentData) {
                  attendanceObj.title.push(
                    attendanceStatusForCalender.WEEKOFF_ABSENT,
                  );
                }

                if (weekOffData || holidayData) {
                  if (weekOffData) {
                    if (weekOffData.value < 1) {
                      userObj.presentOnWeekOffHolidayCount += 0.5;
                      userObj.halfDayCount += 1;
                      userObj.actualWorkingDays += 0.5;
                    } else {
                      userObj.presentOnWeekOffHolidayCount += 0.5;
                    }
                  } else {
                    userObj.presentOnWeekOffHolidayCount += 0.5;
                  }
                } else {
                  if (totalLeaveAndOutDutyDays == 0) {
                    userObj.absentCount += 0.5;
                  }
                  userObj.halfDayCount += 1;
                  userObj.actualWorkingDays += 0.5;
                }
              } else if (dateWiseAttendaceData.fulldayhalfday == 0) {
                if (weekOffAbsentData) {
                  attendanceObj.title.push(
                    attendanceStatusForCalender.WEEKOFF_ABSENT,
                  );
                  userObj.absentCount += +weekOffAbsentData.value;
                } else {
                  if (!weekOffData && !holidayData) {
                    if (totalLeaveAndOutDutyDays == 0.5) {
                      userObj.absentCount += 0.5;
                      attendanceObj.title.push('A');
                    } else {
                      attendanceObj.title.push('A');
                      userObj.absentCount += 1;
                    }
                  }
                }
              } else if (currentdate == dateWiseAttendaceData.AttendanceDate) {
                // Check For Current Date
                attendanceObj.title.push('P');
                if (weekOffData || holidayData) {
                  userObj.presentOnWeekOffHolidayCount += 1;
                } else {
                  if (totalLeaveAndOutDutyDays == 0) {
                    userObj.presentCount += 1;
                    userObj.actualWorkingDays += 1;
                  } else {
                    userObj.presentCount += 0.5;
                    userObj.actualWorkingDays += 0.5;
                  }
                }
              } else {
                attendanceObj.title.push('A');
                userObj.absentCount += 1;
              }
              if (
                dateWiseAttendaceData.latePenaltyMinutes ||
                dateWiseAttendaceData.PanaltyDeduction
              ) {
                // Check For Late Come
                userObj.lateComeCount += 1;
                attendanceObj.title.push('LC');
              }
              if (
                dateWiseAttendaceData.earlyPenaltyMinutes ||
                dateWiseAttendaceData.goEarlyPanaltyDeduction
              ) {
                // Check For Early Go
                userObj.earlyGoCount += 1;
                attendanceObj.title.push('EG');
              }

              if (
                dateWiseAttendaceData.Panalty &&
                dateWiseAttendaceData.PanaltyDeduction == 'day'
              ) {
                userObj.latePenaltyDays += +dateWiseAttendaceData.Panalty;
              }
              if (
                dateWiseAttendaceData.goEarlyPanalty &&
                dateWiseAttendaceData.goEarlyPanaltyDeduction == 'day'
              ) {
                userObj.goEarlyPanalty += +dateWiseAttendaceData.goEarlyPanalty;
              }
            }
          }
          if (unApprovedLeave.length) {
            attendanceObj.title.push(...allPendingLeaveNames);
          }
          if (approveLeave.length > 0) {
            attendanceObj.title.push(...allApprovedLeaveNames);
          }

          if (weekOffData && holidayData) {
            if (weekOffHolidayPriority == 'PH') {
              userObj.holidayCount += holidayData.value;
              attendanceObj.title.push('HD');
            } else {
              userObj.weekOffCount += weekOffData.value;
              if (weekOffData.value < 1) {
                attendanceObj.title.push('WO (SH)');
              } else {
                attendanceObj.title.push('WO');
              }
            }
          } else if (weekOffData) {
            userObj.weekOffCount += weekOffData.value;
            if (weekOffData.value < 1) {
              attendanceObj.title.push('WO (SH)');
            } else {
              attendanceObj.title.push('WO');
            }
          } else if (holidayData) {
            userObj.holidayCount += holidayData.value;
            attendanceObj.title.push('HD');
          }
          attendanceObj.title.push(...attendanceObj.userWorkFromHomeLabel);

          // for short leave

          const shortLeave = shortLeaveMap.get(attendanceObj.attendanceDate);

          if (shortLeave) {
            attendanceObj.title.push('SHL');
            userObj.shortDayLeaveCount += 1;
          }

          attendanceObj.title = attendanceObj.title.join('+');
          pushDataToUserObj(generateExcelFile, userObj, attendanceObj);
          userObj.attendanceData.push(attendanceObj);
        } else {
          // No Attendance Or Total Full Day Leave

          // Leave Request
          if (unApprovedLeave.length) {
            attendanceObj.title.push(...allPendingLeaveNames);
          }
          if (approveLeave.length > 0) {
            attendanceObj.title.push(...allApprovedLeaveNames);
          }
          let title = null;
          if (weekOffData && holidayData) {
            if (weekOffHolidayPriority == 'PH') {
              userObj.holidayCount += holidayData.value;
              title = 'HD';
            } else {
              userObj.weekOffCount += weekOffData.value;
              if (weekOffData.value < 1) {
                title = 'WO (SH)';
              } else {
                title = 'WO';
              }
              if (totalLeaveAndOutDutyDays == 0 && weekOffData.value < 1) {
                if (userObj.fullMonthPresence) {
                  attendanceObj.title.push('P');
                  userObj.presentCount += 1 - weekOffData.value;
                } else {
                  attendanceObj.title.push('A');
                  userObj.absentCount += 1 - weekOffData.value;
                }
              }
            }
          } else if (weekOffData) {
            if (totalLeaveDays == 0) {
              userObj.weekOffCount += weekOffData.value;
              if (weekOffData.value < 1) {
                title = 'WO (SH)';
                if (userObj.fullMonthPresence) {
                  attendanceObj.title.push('P');
                  userObj.presentCount += 1 - weekOffData.value;
                } else {
                  if (totalLeaveAndOutDutyDays == 0) {
                    attendanceObj.title.push('A (HFD)');
                  }
                }
              } else {
                title = 'WO';
              }
            } else if (totalLeaveDays == 0.5 && weekOffData.value < 1) {
              userObj.weekOffCount += weekOffData.value;
              title = 'WO (SH)';
            }
          } else if (holidayData) {
            userObj.holidayCount += holidayData.value;
            title = 'HD';
          } else if (totalLeaveAndOutDutyDays == 0.5) {
            if (userObj.fullMonthPresence && !weekOffData && !holidayData) {
              attendanceObj.title.push('P');
              userObj.presentCount += 0.5;
            } else {
              if (isSandwichleave) {
                title = 'Absent (s)';
              } else if (weekOffAbsentData) {
                title = attendanceStatusForCalender.WEEKOFF_ABSENT;
              } else {
                attendanceObj.title.push('A');
              }
              userObj.absentCount += 0.5;
            }
          } else if (totalLeaveAndOutDutyDays == 0) {
            if (isSandwichleave) {
              title = 'Absent (s)';
              userObj.absentCount += 1;
            } else if (weekOffAbsentData) {
              title = attendanceStatusForCalender.WEEKOFF_ABSENT;
            } else {
              if (userObj.fullMonthPresence && !weekOffData && !holidayData) {
                attendanceObj.title.push('P');
                userObj.presentCount += 1;
              } else {
                attendanceObj.title.push('A');
                userObj.absentCount += 1;
              }
            }
          }
          if (title) {
            attendanceObj.title.push(title);
          }
          attendanceObj.title.push(...attendanceObj.userWorkFromHomeLabel);

          // for short leave

          const shortLeave = shortLeaveMap.get(attendanceObj.attendanceDate);

          if (shortLeave) {
            attendanceObj.title.push('SHL');
            userObj.shortDayLeaveCount += 1;
          }

          attendanceObj.title = attendanceObj.title.join('+');
          pushDataToUserObj(generateExcelFile, userObj, attendanceObj);
          userObj.attendanceData.push(attendanceObj);
        }
      }
      userObj.totalInHours = Number(userObj.totalInHours.toFixed(2));
      userObj.totalOutHours = Number(userObj.totalOutHours.toFixed(2));
      userObj.totalRoundOffMinutes = Number(
        userObj.totalRoundOffMinutes.toFixed(2),
      );
      userObj.totalWithoutOtMinutes = Number(
        userObj.totalWithoutOtMinutes.toFixed(2),
      );
      userObj.totalLateby = Number(userObj.totalLateby.toFixed(2));
      userObj.totalEarlyBy = Number(userObj.totalEarlyBy.toFixed(2));
      userObj.totalShiftShortfallMinutes = Number(
        userObj.totalShiftShortfallMinutes.toFixed(2),
      );
      userObj.totalRoundOffHours = toHoursAndMinutes(
        userObj.totalRoundOffMinutes,
      );
      // set weekoff Policy type
      if (
        userWeekOffPolicy &&
        weekoffPolicyType &&
        !userWeekOffPolicy.isNoWeekoffPolicy
      ) {
        if (weekoffPolicyType == weekoffTypeEnum.MONTHLYFIX) {
          userObj.weekOffCount = userWeekOffPolicy.monthlyFix;
        } else if (weekoffPolicyType == weekoffTypeEnum.ONPAIDDAYS) {
          userObj.weekOffCount = Math.floor(
            +userObj.actualWorkingDays / +userWeekOffPolicy.paidDays,
          );
        }
      }

      userObj.presentAfterPenaltyCount = userObj.presentCount;
      if (
        LCEGPolicy?.lateEarlyPolicyType != 'noLcEgPolicy' &&
        LCEGPolicy?.deductFrom == PenaltyDeductFromEnum.ATTENDANCE
      ) {
        userObj.presentAfterPenaltyCount =
          userObj.presentCount -
          userObj.latePenaltyDays -
          userObj.earlyPenaltyDays;
        userObj.paidDaysCount -=
          userObj.latePenaltyDays + userObj.earlyPenaltyDays;
      }
      userObj.actualWorkingHours = (
        (userObj.actualWorkingMinutes || 0) / 60
      ).toFixed(2);

      responseObj.users.push(userObj);
    }
    if (exportData) {
      let FileName = 'Attendance-Report';

      if (
        +generateExcelFile == attendanceReportMainReportTypes.REGISTER_2_PA ||
        +generateExcelFile ==
          attendanceReportMainReportTypes.REGISTER_2_INOUT ||
        +generateExcelFile ==
          attendanceReportMainReportTypes.REGISTER_2_INOUT_WITHLOGS
      ) {
        if (
          +generateExcelFile == attendanceReportMainReportTypes.REGISTER_2_PA ||
          +generateExcelFile == attendanceReportMainReportTypes.REGISTER_2_INOUT
        ) {
          FileName = 'Attendance Register 2';
        } else if (
          +generateExcelFile ==
          attendanceReportMainReportTypes.REGISTER_2_INOUT_WITHLOGS
        ) {
          FileName = 'Attendance Register 2 With Log Report';
        }
        await generateAttendanceReport_2_Excel(
          responseObj,
          FileName,
          'xlsx',
          generateExcelFile,
          selectedShowFields,
          res,
        );
        return;
      } else if (
        +generateExcelFile ==
        attendanceReportMainReportTypes.REGISTER_2_PA_INOUT
      ) {
        FileName = 'Attendance Register 2';
        await generateAttendanceReport_2_with_PA_INOUT_Excel(
          responseObj,
          FileName,
          'xlsx',
          res,
        );
        return;
      } else if (
        +generateExcelFile == attendanceReportMainReportTypes.CONSOLIDATED_PA ||
        +generateExcelFile ==
          attendanceReportMainReportTypes.CONSOLIDATED_INOUT ||
        +generateExcelFile ==
          attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_VERTICAL ||
        +generateExcelFile ==
          attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_HORIZONTAL
      ) {
        FileName = 'Consolidate Attendance Register';
        await generateAttendanceReport_Consolidate_Excel(
          responseObj,
          FileName,
          'xlsx',
          generateExcelFile,
          formattedDatesArray,
          res,
        );
        return;
      } else if (
        +generateExcelFile ==
          attendanceReportMainReportTypes.EMPLOYEE_PUNCH_IN_OUT_PA ||
        +generateExcelFile ==
          attendanceReportMainReportTypes.EMPLOYEE_PUNCH_IN_OUT_INOUT
      ) {
        FileName = 'Employee Punch In & Punch Out';
        await generateAttendanceReport_Punch_IN_Out_Excel(
          responseObj,
          FileName,
          'xlsx',
          generateExcelFile,
          formattedDatesArray,
          res,
        );
        return;
      }
    }
    return res.status(200).json({
      status: 200,
      data: responseObj?.users || [],
      dates: formattedDatesArray,
      totalCount: totalcount,
    });
  } catch (err) {
    next(err);
  }
};

function pushDataToUserObj(generateExcelFile, userObj, attendanceObj) {
  if (
    +generateExcelFile == attendanceReportMainReportTypes.CONSOLIDATED_PA ||
    +generateExcelFile == attendanceReportMainReportTypes.CONSOLIDATED_INOUT ||
    +generateExcelFile ==
      attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_VERTICAL ||
    +generateExcelFile ==
      attendanceReportMainReportTypes.CONSOLIDATED_PA_INOUT_HORIZONTAL ||
    +generateExcelFile ==
      attendanceReportMainReportTypes.EMPLOYEE_PUNCH_IN_OUT_PA ||
    +generateExcelFile ==
      attendanceReportMainReportTypes.EMPLOYEE_PUNCH_IN_OUT_INOUT
  ) {
    userObj.allDayAttedanceStatus.push(attendanceObj.title);
    userObj.allDayIntimes.push(attendanceObj.inDateTime);
    userObj.allDayOnlyIntimes.push(attendanceObj.inTime);
    userObj.allDayOuttimes.push(attendanceObj.outDateTime);
    userObj.allDayOnlyOuttimes.push(attendanceObj.outTime);
    userObj.allDayRoundOffHours.push(
      attendanceObj.roundOffHours ? attendanceObj.roundOffHours : ' ',
    );
    userObj.allDayShiftNames.push(
      attendanceObj.shift ? attendanceObj.shift : ' ',
    );
    userObj.allDayOvertimeHours.push(attendanceObj.overtimeHours);
  }
}
