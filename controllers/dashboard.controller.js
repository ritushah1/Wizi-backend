const message = require('../response_message/message');
const Sequelize = require('sequelize');
const { statusCodes, userAttributes } = require('../utils/commonVars');
const Shift = require('../models/shift');
const Department = require('../models/department');
const attendanceTransaction = require('../models/attendanceTransaction');
const UserMaster = require('../models/userMaster');
const EmployeeBranch = require('../models/employeeBranch');
const {
  asiaKolkataDateTime,
  applyWeekoffHolidayFlags,
  applyLeaveFlagsAndNames,
  applyWorkFromHomeFlagsAndNames,
  applyTrackingFlags,
  getDatesFromDateRange,
} = require('../utils/commonUtilFunctions');
const {
  generateExcelDailyAttendanceCountShiftDepartmentwise,
  generateExcel,
} = require('../utils/exportData');
const companyMaster = require('../models/companyMaster');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const BranchMaster = require('../models/branchMaster');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const Tracking = require('../models/tracking');
const UserTracking = require('../models/userTracking');
const Visit = require('../models/visit');
const Customer = require('../models/customer');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const UserLeaveTransaction = require('../models/userLeaveTransaction');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const UserLeave = require('../models/userleave');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const ShiftRoster = require('../models/shiftRoster');
const EmployeeShift = require('../models/employeeShift');
const moment = require('moment');

exports.getDepartmentShiftWiseAttendanceCount = async (req, res, next) => {
  try {
    const { companyMasterID, branchMasterID, attendanceDate, exportData } =
      req.body;

    if (!companyMasterID || !attendanceDate) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }
    const [findCompanyShifts, findCompanyDepartments] = await Promise.all([
      Shift.findAll({
        where: { companyMasterID, status: 1 },
        attributes: ['shiftID', 'shiftName'],
        raw: true,
        order: [['shiftName', 'ASC']],
      }),
      Department.findAll({
        where: { companyMasterID, status: 1 },
        attributes: ['departmentId', 'departmentName'],
        raw: true,
        order: [['departmentName', 'ASC']],
      }),
    ]);

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const findEmployeeAttendanceData = await attendanceTransaction.findAll({
      where: { AttendanceDate: attendanceDate },
      include: [
        {
          model: UserMaster,
          where: {
            companyMasterId: companyMasterID,
            status: 1,
            ...userAccessCondition.where,
          },
          attributes: [],
          include: [
            ...userAccessCondition.includeModels,
            {
              required: !!branchMasterID,
              model: EmployeeBranch,
              where: {
                ...(branchMasterID && { branchID: branchMasterID }),
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: null },
                ],
              },
              attributes: [],
            },
          ],
        },
      ],
      attributes: ['departmentID', 'Shift'],
      raw: true,
    });

    const shiftIdToName = {};
    const departmentIdToName = {};

    findCompanyShifts.forEach((s) => {
      shiftIdToName[s.shiftID] = s.shiftName;
    });

    findCompanyDepartments.forEach((d) => {
      departmentIdToName[d.departmentId] = d.departmentName;
    });

    const matrix = {};
    const shiftTotals = {};
    let overallTotal = 0;

    findCompanyShifts.forEach((shift) => {
      shiftTotals[shift.shiftName] = 0;
    });

    findCompanyDepartments.forEach((dept) => {
      matrix[dept.departmentName] = {};

      // Initialize shift columns
      findCompanyShifts.forEach((shift) => {
        matrix[dept.departmentName][shift.shiftName] = 0;
      });

      // ✅ Empty Column
      matrix[dept.departmentName][''] = '';

      // ✅ Department Wise Total
      matrix[dept.departmentName]['Department Wise Total'] = 0;
    });

    for (const record of findEmployeeAttendanceData) {
      const deptName = departmentIdToName[record.departmentID];
      const shiftName = shiftIdToName[record.Shift];

      if (deptName && shiftName) {
        matrix[deptName][shiftName] += 1;
        matrix[deptName]['Department Wise Total'] += 1;
        shiftTotals[shiftName] += 1;
        overallTotal += 1;
      }
    }

    const emptyRow = {};
    findCompanyShifts.forEach((shift) => {
      emptyRow[shift.shiftName] = '';
    });
    emptyRow[''] = '';
    emptyRow['Department Wise Total'] = '';

    matrix[''] = emptyRow;

    matrix['Shift Wise Total'] = {
      ...shiftTotals,
      '': '',
      'Department Wise Total': overallTotal,
    };

    if (exportData) {
      const result = Object.keys(matrix).map((departmentName) => {
        const row = { 'Department Name': departmentName };

        for (const shift of findCompanyShifts) {
          row[shift.shiftName] = matrix[departmentName][shift.shiftName];
        }

        row['Department Wise Total'] =
          matrix[departmentName]['Department Wise Total'];

        return row;
      });

      return await generateExcelDailyAttendanceCountShiftDepartmentwise(
        result,
        [
          ...findCompanyShifts.map((s) => s.shiftName),
          '',
          'Department Wise Total',
        ],
        'daily-department-shift-attendance',
        'xlsx',
        res,
      );
    }

    // 8️⃣ API Response
    return res.status(200).json({
      status: 200,
      data: matrix,
    });
  } catch (err) {
    next(err);
  }
};

exports.attendanceAndTrackingInsights = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchMasterID,
      userMasterID = [],
      page,
      limit,
      exportData,
      attendanceDate,
    } = req.body;
    if (!companyMasterID)
      return res.status(200).json({
        status: 401,
        message: 'Invalid parameters!',
      });
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const finalDate = attendanceDate ? attendanceDate : currentDate;
    const whereDate = new Date(finalDate);

    const condition = {
      companyMasterId: companyMasterID,
      status: 1,
    };
    const paginationQuery = {};

    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = +limit;
    }
    const dateCondition = {
      status: 1,
      applicableDate: { [Sequelize.Op.lte]: whereDate },
      [Sequelize.Op.or]: [
        { endDate: { [Sequelize.Op.gte]: whereDate } },
        { endDate: { [Sequelize.Op.eq]: null } },
      ],
    };
    const order = [['displayName', 'ASC']];

    const start = `${currentDate} 00:00:00.000`;
    const end = `${currentDate} 23:59:59.999`;
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    if (userMasterID && userMasterID.length) {
      condition.userMasterID = userMasterID;
    }
    const { rows: allUsersData, count } = await UserMaster.findAndCountAll({
      distinct: true,
      where: { ...userAccessCondition.where, ...condition },
      attributes: userAttributes,
      ...paginationQuery,
      order,
      include: [
        ...userAccessCondition.includeModels,
        { model: EmployeeJoiningDetails, attributes: ['employeeCode'] },
        {
          model: companyMaster,
          required: true,
          attributes: ['companyMasterID', 'companyName'],
        },
        {
          required: false,
          model: EmployeeDesignation,
          where: dateCondition,
          attributes: ['designationID', 'applicableDate'],
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
          where: dateCondition,
          attributes: ['departmentID', 'applicableDate'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName'],
            },
          ],
        },
        {
          required: !!branchMasterID,
          model: EmployeeBranch,
          where: {
            ...dateCondition,
            ...(branchMasterID &&
              (!Array.isArray(branchMasterID) || branchMasterID.length) && {
                branchID: branchMasterID,
              }),
          },
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
          model: attendanceTransaction,
          where: { AttendanceDate: currentDate },
          attributes: [
            'AttendanceTransID',
            'InDatetime',
            'OutDateTime',
            'fulldayhalfday',
            'Shift',
            'Shifthrs',
            'ShiftIntime',
            'ShiftoutTime',
          ],
          include: [
            {
              model: Shift,
              attributes: ['shiftID', 'shiftName'],
            },
          ],
        },
        {
          required: false,
          model: EmployeeAttendancePolicy,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: whereDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: whereDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['attendancePolicyID'],
          include: [
            {
              model: AttendancePolicy,
              as: 'attendancePolicy',
              attributes: ['WHPHPriority'],
            },
          ],
        },
        {
          required: false,
          model: Tracking,
          where: {
            Track_datetime: {
              [Sequelize.Op.eq]: Sequelize.literal(`(
           SELECT MAX(t2."Track_datetime")
            FROM trackings t2
            WHERE
              t2."userMasterID" = "userMaster"."userMasterID"
              AND t2."Track_datetime" BETWEEN '${start}' AND '${end}'
        )`),
            },
          },
          attributes: [
            'UserTrackingID',
            'userMasterID',
            'Lattitude',
            'Longitude',
            'Address',
            'Track_datetime',
            'Battery',
            'Gps',
            'Wifi',
            'Mobile_name',
            'type',
            'Status',
            'developerMode',
            'geofence',
          ],
        },
        {
          required: false,
          model: UserTracking,
          as: 'userTracking',
          where: {
            trackStatus: 1,
          },
          attributes: ['userTrackingID'],
        },
        {
          required: false,
          model: Visit,
          as: 'assignVisit',
          where: {
            checkInDateTime: {
              [Sequelize.Op.eq]: Sequelize.literal(`(
        SELECT MAX(v."checkInDateTime")
        FROM visits v
        WHERE 
          v."assignID" = "userMaster"."userMasterID"
          AND v."visitDate" = '${currentDate}'
          AND v."checkInDateTime" IS NOT NULL
      )`),
            },
          },
          attributes: [
            'visitID',
            'customerID',
            'checkInDateTime',
            'visitDate',
            'checkOutDateTime',
          ],
          include: [
            { model: Customer, attributes: ['companyName', 'customerName'] },
          ],
        },
      ],
    });

    const allUsers = allUsersData
      .filter(Boolean)
      .map((u) => (u.dataValues ? u.dataValues : u));

    await Promise.all([
      applyWeekoffHolidayFlags(allUsers, currentDate),
      applyLeaveFlagsAndNames(allUsers, currentDate),
      applyWorkFromHomeFlagsAndNames(allUsers, currentDate),
      applyTrackingFlags(allUsers),
    ]);

    if (exportData) {
      const excelData = allUsers.map((user) => {
        const joiningDetails = user?.employeeJoiningDetails?.[0] || {};
        const branch = user?.employeeBranches?.[0]?.branchMaster || {};
        const department = user?.employeeDepartments?.[0]?.department || {};
        const designation = user?.employeeDesignations?.[0]?.designation || {};
        const attendance = user?.attendanceTransactions?.[0] || {};
        const status = [];
        if (user.isWeekoff) status.push(user.weekoffName);
        if (user.isHoliday) status.push(user.holidayName);
        if (user.isLeave) status.push(user.leaveNames);
        if (user.isWorkFromHome) status.push(user.workFromHomeName);

        return {
          'Employee Code': joiningDetails.employeeCode || '',
          'Employee Name': user?.displayName || '',
          Number: user?.userNumber || '',
          'Branch Name': branch.branchName || '',
          Department: department.departmentName || '',
          Designation: designation.designationName || '',
          'Punch In': attendance.InDatetime
            ? moment(attendance.InDatetime).format('DD-MM-YYYY HH:mm:ss')
            : '',
          'Punch Out': attendance.OutDateTime
            ? moment(attendance.OutDateTime).format('DD-MM-YYYY HH:mm:ss')
            : '',
          'Shift Name': attendance?.shift ? attendance.shift.shiftName : '',
          'Shift Time': attendance?.shift
            ? attendance?.ShiftIntime + ' - ' + attendance?.ShiftoutTime
            : '',
          Status: status.length > 0 ? status.join(', ') : '',
        };
      });

      return await generateExcel(excelData, 'Attendance', 'xlsx', res);
    }

    return res.status(200).json({
      status: 200,
      totalcount: count,
      data: allUsersData,
    });
  } catch (err) {
    next(err);
  }
};

exports.deparmentWiseDailyAttendanceSummary = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchMasterID,
      attendanceDate,
      page,
      limit,
      userMasterID,
      exportData,
    } = req.body;

    if (!companyMasterID || !attendanceDate) {
      return res.status(200).json({
        status: 401,
        message: 'Invalid parameters!',
      });
    }

    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = +limit;
    }

    const { rows: findCompanyDepartments, count } =
      await Department.findAndCountAll({
        where: {
          companyMasterID: companyMasterID,
          status: 1,
        },
        ...paginationQuery,
        order: [['departmentName', 'ASC']],
      });
    if (findCompanyDepartments.length == 0) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('No Department'),
      });
    }
    const departmentIDs = findCompanyDepartments.map((d) => d.departmentId);
    /* -----------------------------------------------------------
       2️⃣ Fetch Users Only Once
    ------------------------------------------------------------*/
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const whereDate = new Date(currentDate);

    const userCondition = {
      companyMasterId: companyMasterID,
      status: 1,
      ...(userMasterID?.length && { userMasterID }),
    };
    const dateCondition = {
      status: 1,
      applicableDate: { [Sequelize.Op.lte]: whereDate },
      [Sequelize.Op.or]: [
        { endDate: { [Sequelize.Op.gte]: whereDate } },
        { endDate: null },
      ],
    };

    const order = [['displayName', 'ASC']];
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const allUsersData = await UserMaster.findAll({
      where: { ...userCondition, ...userAccessCondition.where },
      attributes: ['userMasterID'],
      order,
      include: [
        ...userAccessCondition.includeModels,
        {
          required: true,
          model: EmployeeJoiningDetails,
          as: 'emp_join',
          attributes: ['fullMonthPresence'],
        },
        {
          required: !!branchMasterID,
          model: EmployeeBranch,
          as: 'emp_branch',
          where: {
            ...dateCondition,
            ...(branchMasterID &&
              (!Array.isArray(branchMasterID) || branchMasterID.length) && {
                branchID: branchMasterID,
              }),
          },
          attributes: [],
        },
        {
          required: true,
          model: EmployeeDepartment,
          as: 'emp_dept',
          where: {
            ...dateCondition,
            ...(departmentIDs &&
              (!Array.isArray(departmentIDs) || departmentIDs.length) && {
                departmentID: departmentIDs,
              }),
          },
          attributes: ['departmentID', 'applicableDate'],
        },
        {
          model: attendanceTransaction,
          required: false,
          where: { AttendanceDate: attendanceDate },
          attributes: [
            'AttendanceTransID',
            'fulldayhalfday',
            'InDatetime',
            'OutDateTime',
            'AttendanceDate',
          ],
        },
        {
          required: false,
          model: EmployeeAttendancePolicy,
          as: 'empAttPolicy',
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: whereDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: whereDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['attendancePolicyID'],
          include: [
            {
              model: AttendancePolicy,
              as: 'attendancePolicy',
              attributes: ['WHPHPriority'],
            },
          ],
        },
        {
          required: false,
          model: weekoffHolidayTran,
          where: {
            date: attendanceDate,
          },
        },
        {
          required: false,
          model: UserLeave,
          where: {
            status: 1,
            authorizationStatus: 3,
            FromDate: { [Sequelize.Op.lte]: attendanceDate },
            ToDate: { [Sequelize.Op.gte]: attendanceDate },
          },
          attributes: [
            'UserLeaveApplicationID',
            'userMasterID',
            'DayType',
            'FromDate',
            'ToDate',
            'LeaveDays',
            'authorizationStatus',
          ],
          include: [
            {
              required: false,
              model: UserLeaveTransaction,
              where: {
                status: 1,
                date: attendanceDate,
              },
              attributes: ['LeaveTranId', 'date', 'days', 'status'],
            },
            {
              model: HrLeaveTypes,
              attributes: ['LeaveID'],
            },
          ],
        },
      ],
    });
    /* -----------------------------------------------------------
       3️⃣ Group Users by Department (O(N))
    ------------------------------------------------------------*/
    const departmentMap = new Map();

    allUsersData.forEach((user) => {
      const deptID = user.emp_dept?.[0]?.departmentID;
      if (!deptID) return;

      if (!departmentMap.has(deptID)) {
        departmentMap.set(deptID, []);
      }

      departmentMap.get(deptID).push(user);
    });

    const departmentWiseData = [];

    for (const department of findCompanyDepartments) {
      const employees = departmentMap.get(department.departmentId) || [];

      const responseObj = {
        'Department Name': department.departmentName,
        'Total Employees': employees.length,
        Present: 0,
        OutDuty: 0,
        Absent: 0,
        Leave: 0,
        Weekoff: 0,
        Holiday: 0,
        'Present Weekoff/Holiday': 0,
      };

      if (!employees.length) {
        departmentWiseData.push(responseObj);
        continue;
      }

      for (const user of employees) {
        let remainingDay = 1;

        /* ------------------ LEAVE + OUTDUTY ------------------ */
        let outDuty = 0;
        let leave = 0;

        for (const l of user.userLeaves || []) {
          const isOutDuty = l.hrLeaveType?.LeaveID == 25;

          for (const t of l.userLeaveTransactions || []) {
            if (isOutDuty) outDuty += t.days;
            else leave += t.days;
          }
        }

        responseObj.OutDuty += outDuty;
        responseObj.Leave += leave;

        remainingDay -= outDuty + leave;
        if (remainingDay <= 0) continue;
        /* ------------------ ATTENDANCE ------------------ */
        const attendance = user.attendanceTransactions?.[0];
        /* ------------------ WEEKOFF / HOLIDAY ------------------ */
        const weekoffTrans = user.weekoffHolidayTrans || [];
        const weekoff = weekoffTrans.find((e) => e.tableName === 'weekoff');
        const holiday = weekoffTrans.find((e) => e.tableName === 'holiday');

        const priority =
          user.empAttPolicy?.[0]?.attendancePolicy?.WHPHPriority || 'WH';

        if (weekoff && holiday) {
          if (priority === 'WH') {
            responseObj.Weekoff += weekoff.value;
            remainingDay -= weekoff.value;
            if (attendance) {
              if (attendance.OutDateTime) {
                if (attendance.fulldayhalfday == 1) {
                  responseObj['Present Weekoff/Holiday'] += 1;
                } else if (attendance.fulldayhalfday == 0.5) {
                  responseObj['Present Weekoff/Holiday'] += 0.5;
                }
              }
            }
          } else {
            responseObj.Holiday += holiday.value;
            remainingDay -= holiday.value;
            if (attendance) {
              if (attendance.OutDateTime) {
                if (attendance.fulldayhalfday == 1) {
                  responseObj['Present Weekoff/Holiday'] += 1;
                } else if (attendance.fulldayhalfday == 0.5) {
                  responseObj['Present Weekoff/Holiday'] += 0.5;
                }
              }
            }
          }
        } else if (weekoff) {
          responseObj.Weekoff += weekoff.value;
          remainingDay -= weekoff.value;
          if (attendance) {
            if (attendance.OutDateTime) {
              if (attendance.fulldayhalfday == 1) {
                responseObj['Present Weekoff/Holiday'] += 1;
              } else if (attendance.fulldayhalfday == 0.5) {
                responseObj['Present Weekoff/Holiday'] += 0.5;
              }
            }
          }
        } else if (holiday) {
          responseObj.Holiday += holiday.value;
          remainingDay -= holiday.value;
          if (attendance) {
            if (attendance.OutDateTime) {
              if (attendance.fulldayhalfday == 1) {
                responseObj['Present Weekoff/Holiday'] += 1;
              } else if (attendance.fulldayhalfday == 0.5) {
                responseObj['Present Weekoff/Holiday'] += 0.5;
              }
            }
          }
        }

        if (remainingDay <= 0) continue;

        const fullMonthPresence = user.emp_join?.[0]?.fullMonthPresence || 0;

        if (fullMonthPresence) {
          responseObj.Present += remainingDay;
          continue;
        }

        if (!attendance) {
          responseObj.Absent += remainingDay;
          continue;
        }

        if (!attendance.OutDateTime) {
          if (currentDate != attendance.AttendanceDate)
            responseObj.Absent += remainingDay;
          else responseObj.Present += remainingDay;

          continue;
        }

        if (attendance.fulldayhalfday == 1) {
          responseObj.Present += remainingDay;
        } else if (attendance.fulldayhalfday == 0.5) {
          responseObj.Present += Math.min(0.5, remainingDay);
          responseObj.Absent += Math.max(0, remainingDay - 0.5);
        } else {
          responseObj.Absent += remainingDay;
        }
      }

      departmentWiseData.push(responseObj);
    }

    if (exportData) {
      await generateExcel(
        departmentWiseData,
        'Department Wise Daily Attendance Summary',
        'xlsx',
        res,
      );
      return;
    }
    return res.status(200).json({
      status: 200,
      totalcount: count,
      data: departmentWiseData,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================
// LMS Dashboard Endpoints
// ============================================

/**
 * Get Admin Dashboard Data
 * Returns overview statistics for admin users
 */
exports.getAdminDashboard = async (req, res, next) => {
  try {
    const userMasterID = req.userDetails?.userMasterId;
    const companyMasterID = req.userDetails?.companyMasterId;

    if (!userMasterID || !companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'Unauthorized access',
      });
    }

    // TODO: Implement actual admin dashboard logic
    // For now, return mock data structure
    const dashboardData = {
      overview: {
        totalUsers: 0,
        totalCourses: 0,
        totalEnrollments: 0,
        totalCertificates: 0,
      },
      userStats: {
        activeUsers: 0,
        newUsersThisMonth: 0,
        usersByRole: {
          admins: 0,
          trainers: 0,
          trainees: 0,
        },
      },
      courseStats: {
        publishedCourses: 0,
        draftCourses: 0,
        averageCompletionRate: 0,
        mostPopularCourses: [],
      },
      enrollmentStats: {
        totalEnrollments: 0,
        completedEnrollments: 0,
        inProgressEnrollments: 0,
        enrollmentTrends: [],
      },
      assessmentStats: {
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
      },
      certificateStats: {
        totalIssued: 0,
        validCertificates: 0,
        expiredCertificates: 0,
        revokedCertificates: 0,
      },
    };

    return res.status(200).json({
      status: 200,
      message: 'Admin dashboard data retrieved successfully',
      data: dashboardData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Trainer Dashboard Data
 * Returns course and student statistics for trainer users
 */
exports.getTrainerDashboard = async (req, res, next) => {
  try {
    const userMasterID = req.userDetails?.userMasterId;
    const companyMasterID = req.userDetails?.companyMasterId;

    if (!userMasterID || !companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'Unauthorized access',
      });
    }

    const Course = require('../models/course');
    const Enrollment = require('../models/enrollment');
    const Certificate = require('../models/certificate');
    const AssessmentAttempt = require('../models/assessmentAttempt');
    const { Op } = require('sequelize');

    // Get trainer's courses (courses created by this trainer)
    const trainerCourses = await Course.findAll({
      where: {
        createdBy: userMasterID,
        companyMasterID,
        status: 1,
      },
      attributes: [
        'id',
        'title',
        'courseStatus',
        'passingPercentage',
        'estimatedDuration',
      ],
      order: [['createdAt', 'DESC']],
    });

    const courseIds = trainerCourses.map((course) => course.id);

    // Initialize overview statistics
    const myCourses = trainerCourses.length;
    let totalEnrollments = 0;
    let totalCompletions = 0;
    let averageRating = 4.2; // Placeholder for rating system

    // Get course statistics
    const publishedCourses = trainerCourses.filter(
      (c) => c.courseStatus === 'PUBLISHED',
    ).length;
    const draftCourses = trainerCourses.filter(
      (c) => c.courseStatus === 'DRAFT',
    ).length;

    const courseStats = [];

    if (courseIds.length > 0) {
      // Get enrollments for all trainer courses
      const enrollments = await Enrollment.findAll({
        where: {
          courseID: courseIds,
          status: 1,
        },
        attributes: [
          'courseID',
          'completedAt',
          'progressPercentage',
          'enrolledAt',
          'userMasterID',
        ],
        include: [
          {
            model: UserMaster,
            as: 'user',
            attributes: ['userMasterID', 'displayName', 'userNumber'],
          },
        ],
        order: [['enrolledAt', 'DESC']],
      });

      totalEnrollments = enrollments.length;
      totalCompletions = enrollments.filter((e) => e.completedAt).length;

      // Build course statistics
      for (const course of trainerCourses) {
        const courseEnrollments = enrollments.filter(
          (e) => e.courseID === course.id,
        );
        const enrollmentCount = courseEnrollments.length;
        const completedCount = courseEnrollments.filter(
          (e) => e.completedAt,
        ).length;
        const completionRate =
          enrollmentCount > 0 ? (completedCount / enrollmentCount) * 100 : 0;

        courseStats.push({
          courseId: String(course.id),
          courseName: course.title,
          status: course.courseStatus,
          enrollmentCount,
          completionRate: Math.round(completionRate * 100) / 100,
          averageScore: 0, // Placeholder - assessments are department-based, not course-based
        });
      }

      // Get recent enrollments (last 10)
      const recentEnrollments = enrollments.slice(0, 10).map((enrollment) => {
        const course = trainerCourses.find((c) => c.id === enrollment.courseID);
        return {
          userId: String(enrollment.userMasterID),
          userName: enrollment.user?.displayName || 'Unknown',
          courseId: String(enrollment.courseID),
          courseName: course?.title || 'Unknown',
          enrolledAt: enrollment.enrolledAt,
          progress: parseFloat(enrollment.progressPercentage) || 0,
        };
      });

      // Calculate completion trends (last 6 months)
      const completionTrends = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthName = monthDate.toLocaleString('default', {
          month: 'short',
          year: 'numeric',
        });

        const monthCompletions = enrollments.filter((e) => {
          if (!e.completedAt) return false;
          const completedDate = new Date(e.completedAt);
          return completedDate >= monthDate && completedDate <= monthEnd;
        }).length;

        completionTrends.push({
          month: monthName,
          completions: monthCompletions,
        });
      }

      // Get enrolled user IDs for assessment statistics
      const enrolledUserIds = [
        ...new Set(enrollments.map((e) => e.userMasterID)),
      ];

      // Get assessment attempts for enrolled users (as a proxy for course-related assessments)
      let assessmentAttempts = [];
      if (enrolledUserIds.length > 0) {
        assessmentAttempts = await AssessmentAttempt.findAll({
          where: {
            userMasterID: enrolledUserIds,
            status: 1,
            submittedAt: { [Op.ne]: null },
          },
          attributes: [
            'assessmentAttemptID',
            'assessmentID',
            'score',
            'isPassed',
            'submittedAt',
            'userMasterID',
          ],
          include: [
            {
              model: UserMaster,
              as: 'user',
              attributes: ['userMasterID', 'displayName'],
            },
          ],
          order: [['submittedAt', 'DESC']],
          limit: 50,
        });
      }

      // Assessment statistics
      const totalAttempts = assessmentAttempts.length;
      const averageScore =
        totalAttempts > 0
          ? assessmentAttempts.reduce(
              (sum, a) => sum + (parseFloat(a.score) || 0),
              0,
            ) / totalAttempts
          : 0;
      const passedAttempts = assessmentAttempts.filter(
        (a) => a.isPassed,
      ).length;
      const passRate =
        totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0;

      const recentAttempts = assessmentAttempts.slice(0, 10).map((attempt) => ({
        userId: String(attempt.userMasterID),
        userName: attempt.user?.displayName || 'Unknown',
        assessmentName: `Assessment ${attempt.assessmentID}`,
        score: parseFloat(attempt.score) || 0,
        isPassed: attempt.isPassed || false,
        submittedAt: attempt.submittedAt,
      }));

      // Calculate enrollment rate
      const enrollmentRate = myCourses > 0 ? totalEnrollments / myCourses : 0;
      const completionRate =
        totalEnrollments > 0 ? (totalCompletions / totalEnrollments) * 100 : 0;

      // Get certificates issued for trainer's courses
      const Certificate = require('../models/certificate');
      const certificates = await Certificate.findAll({
        where: {
          courseId: courseIds,
          status: 1,
        },
        attributes: ['id', 'isValid'],
      });

      const totalCertificates = certificates.length;
      const validCertificates = certificates.filter((c) => c.isValid).length;

      // Format data to match frontend expectations
      const dashboardData = {
        courses: {
          totalCourses: myCourses,
          publishedCourses,
          draftCourses,
        },
        enrollment: {
          totalEnrollments,
          activeEnrollments: totalEnrollments - totalCompletions,
          completedEnrollments: totalCompletions,
          enrollmentRate: Math.round(completionRate * 100) / 100,
        },
        assessments: {
          totalAssessments: totalAttempts,
          averagePassRate: Math.round(passRate * 100) / 100,
          totalAttempts,
          averageScore: Math.round(averageScore * 100) / 100,
        },
        certificates: {
          totalIssued: totalCertificates,
          validCertificates,
          revokedCertificates: totalCertificates - validCertificates,
        },
        myCourses: courseStats.map((course) => ({
          id: course.courseId,
          title: course.courseName,
          enrollmentCount: course.enrollmentCount,
          completionRate: course.completionRate,
          averageScore: course.averageScore,
        })),
        recentActivity: recentEnrollments.slice(0, 10).map((enrollment) => ({
          type: 'ENROLLMENT',
          studentName: enrollment.userName,
          courseName: enrollment.courseName,
          timestamp: enrollment.enrolledAt,
        })),
      };

      console.log(
        `📊 Trainer dashboard for user ${userMasterID}: ${myCourses} courses, ${totalEnrollments} enrollments, ${totalCompletions} completions`,
      );

      return res.status(200).json({
        status: 200,
        message: 'Trainer dashboard data retrieved successfully',
        data: dashboardData,
      });
    } else {
      // No courses yet - return empty structure matching frontend expectations
      const dashboardData = {
        courses: {
          totalCourses: 0,
          publishedCourses: 0,
          draftCourses: 0,
        },
        enrollment: {
          totalEnrollments: 0,
          activeEnrollments: 0,
          completedEnrollments: 0,
          enrollmentRate: 0,
        },
        assessments: {
          totalAssessments: 0,
          averagePassRate: 0,
          totalAttempts: 0,
          averageScore: 0,
        },
        certificates: {
          totalIssued: 0,
          validCertificates: 0,
          revokedCertificates: 0,
        },
        myCourses: [],
        recentActivity: [],
      };

      return res.status(200).json({
        status: 200,
        message: 'Trainer dashboard data retrieved successfully',
        data: dashboardData,
      });
    }
  } catch (error) {
    console.error('Error fetching trainer dashboard:', error);
  }
};

exports.branchDepartmentWiseAttendanceCount = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      shiftID,
      attendanceDate,
      page,
      limit,
      exportData,
    } = req.body;

    let { branchMasterID, departmentID } = req.body;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // =====================================================
    // PAGINATION
    // =====================================================

    const paginationQuery =
      !exportData && page && limit
        ? {
            offset: (page - 1) * limit,
            limit: +limit,
          }
        : {};

    // =====================================================
    // BRANCH FILTER
    // =====================================================

    const branchCondition = {
      companyMasterID,
      status: 1,
    };

    if (branchMasterID && branchMasterID.length > 0) {
      branchCondition.branchMasterID = branchMasterID;
    } else {
      if (
        req.userDetails.accessibleBranches &&
        req.userDetails.accessibleBranches.length
      ) {
        branchCondition.branchMasterID = req.userDetails.accessibleBranches;
      }
    }

    const allBranches = await BranchMaster.findAll({
      where: branchCondition,
      attributes: ['branchMasterID', 'branchName'],
      order: [['branchName', 'ASC']],
    });

    branchMasterID = allBranches.map((b) => b.branchMasterID);

    // =====================================================
    // DEPARTMENT FILTER
    // =====================================================

    const departmentCondition = {
      companyMasterID,
      status: 1,
    };

    if (departmentID && departmentID.length > 0) {
      departmentCondition.departmentId = departmentID;
    }

    const allDepartments = await Department.findAll({
      where: departmentCondition,
      attributes: ['departmentId', 'departmentName'],
      order: [['departmentName', 'ASC']],
    });

    departmentID = allDepartments.map((d) => d.departmentId);

    // =====================================================
    // PAGINATED BRANCH-DEPARTMENT MAP
    // =====================================================

    const getPaginatedIDs = getPaginatedBranchDepartmentIDs(
      allBranches,
      allDepartments,
      paginationQuery.limit,
      paginationQuery.offset,
      exportData,
    );

    const branchMasterIDs = getPaginatedIDs.branchMasterIDs;

    const departmentIDs = getPaginatedIDs.departmentIDs;

    const branchDepartmentMap = getPaginatedIDs.branchDepartmentMap;

    const totalCount = getPaginatedIDs.totalCount;

    // =====================================================
    // HEADINGS
    // =====================================================

    const headings = [
      'Branch',
      'Department',
      branchDepartmentWiseDahsboardStatus.PRESENT,
      branchDepartmentWiseDahsboardStatus.HALF_DAY,
      branchDepartmentWiseDahsboardStatus.ABSENT,
      branchDepartmentWiseDahsboardStatus.WEEKOFF,
      branchDepartmentWiseDahsboardStatus.HOLIDAY,
      branchDepartmentWiseDahsboardStatus.PRESENT_ON_WEEKOFF,
      branchDepartmentWiseDahsboardStatus.PRESENT_ON_HOLIDAY,
      branchDepartmentWiseDahsboardStatus.APPROVED_LEAVE,
      branchDepartmentWiseDahsboardStatus.PENDING_LEAVE,
      branchDepartmentWiseDahsboardStatus.APPROVED_OD,
      branchDepartmentWiseDahsboardStatus.PENDING_OD,
      'Total',
    ];

    // =====================================================
    // INCLUDE MODELS
    // =====================================================

    const includedModels = [
      {
        required: true,
        model: EmployeeBranch,
        as: 'emp_branch',
        where: {
          ...(branchMasterIDs && {
            branchID: branchMasterIDs,
          }),
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(currentDate),
              },
            },
            {
              endDate: {
                [Sequelize.Op.eq]: null,
              },
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
      },
      {
        required: true,
        model: EmployeeDepartment,
        as: 'emp_dept',
        where: {
          ...(departmentIDs && {
            departmentID: departmentIDs,
          }),
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(currentDate),
              },
            },
            {
              endDate: {
                [Sequelize.Op.eq]: null,
              },
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
      },

      {
        required: false,
        model: EmployeeAttendancePolicy,
        as: 'empAttPolicy',
        where: {
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(currentDate),
              },
            },
            {
              endDate: {
                [Sequelize.Op.eq]: null,
              },
            },
          ],
        },
        include: [
          {
            model: AttendancePolicy,
            as: 'attendancePolicy',
            attributes: ['WHPHPriority'],
          },
        ],
      },

      {
        required: false,
        model: UserLeave,
        where: {
          [Sequelize.Op.and]: [
            {
              FromDate: {
                [Sequelize.Op.lte]: attendanceDate,
              },
            },
            {
              ToDate: {
                [Sequelize.Op.gte]: attendanceDate,
              },
            },
          ],
          status: 1,
          authorizationStatus: [0, 1, 2, 3],
        },
        attributes: [
          'UserLeaveApplicationID',
          'LeaveTranId',
          'userMasterID',
          'FromDate',
          'ToDate',
          'LeaveDays',
          'authorizationStatus',
          'DayType',
        ],
        include: [
          {
            required: false,
            model: UserLeaveTransaction,
            as: 'ult',
            attributes: ['LeaveTranId', 'status', 'date'],
            where: {
              date: attendanceDate,
              status: 1,
            },
            include: [
              {
                model: HrLeaveTypes,
                attributes: ['LeaveID'],
              },
            ],
          },
          {
            model: HrLeaveTypes,
            attributes: ['LeaveID'],
          },
        ],
      },

      {
        required: false,
        model: attendanceTransaction,
        where: {
          AttendanceDate: attendanceDate,
        },
      },

      {
        required: false,
        model: weekoffHolidayTran,
        where: {
          date: attendanceDate,
        },
      },

      {
        required: false,
        model: ShiftRoster,
        where: {
          shiftRosterDate: attendanceDate,
        },
      },

      {
        required: false,
        model: EmployeeShift,
        where: {
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(currentDate),
              },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
      },
    ];

    // =====================================================
    // ACCESS FILTER
    // =====================================================

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    // =====================================================
    // USER DATA
    // =====================================================

    const userData = await UserMaster.findAll({
      distinct: true,
      subQuery: false,
      where: {
        companyMasterId: companyMasterID,
        status: 1,
        ...userAccessCondition.where,
      },
      attributes: ['userMasterID', 'displayName'],
      include: [...includedModels, ...userAccessCondition.includeModels],
      order: [['userMasterID', 'ASC']],
    });

    // =====================================================
    // LOOP USERS
    // =====================================================
    const formattedAttendanceDate = String(attendanceDate).slice(0, 10);
    const isFindCurrentDate = currentDate === formattedAttendanceDate;
    for (const user of userData) {
      const obj = user.toJSON();

      // ==========================================
      // ATTENDANCE
      // ==========================================
      const attendance = obj?.attendanceTransactions?.[0] || null;
      const employeeShiftData = obj.employeeShifts?.[0] || null;
      if (shiftID) {
        let employeeShifts = [];
        if (attendance) {
          employeeShifts = [+attendance.Shift];
        } else if (
          employeeShiftData &&
          employeeShiftData.shiftsID &&
          employeeShiftData.shiftsID.length
        ) {
          employeeShifts = [...employeeShiftData.shiftsID];
        } else if (employeeShiftData && employeeShiftData.shiftID) {
          employeeShifts = [employeeShiftData.shiftID];
        }
        if (!employeeShifts.includes(shiftID)) {
          continue;
        }
      }

      const fulldayhalfday = +attendance?.fulldayhalfday || 0;

      // ==========================================
      // BRANCH / DEPARTMENT
      // ==========================================

      const branchID = obj?.emp_branch?.[0]?.branchID;

      const deptID = obj?.emp_dept?.[0]?.departmentID;

      const key = `${branchID}-${deptID}`;

      if (!branchDepartmentMap.has(key)) continue;

      const data = branchDepartmentMap.get(key);

      // ==========================================
      // ATTENDANCE POLICY
      // ==========================================

      const attendancePolicy = obj?.empAttPolicy?.[0]?.attendancePolicy || null;

      const WHPHPriority = attendancePolicy?.WHPHPriority || 'WH';

      const expectedType = WHPHPriority == 'PH' ? 'holiday' : 'weekoff';

      const weekoffHoliday = obj?.weekoffHolidayTrans?.find(
        (wh) => wh.tableName === expectedType,
      );

      const isWeekoff = weekoffHoliday?.tableName === 'weekoff';

      const isHoliday = weekoffHoliday?.tableName === 'holiday';

      const isWeekoffOrHoliday = isWeekoff || isHoliday;

      // ==========================================
      // REMAINING DAY
      // ==========================================

      let remainingDay = 1;

      const consume = (value) => {
        const allowed = value > remainingDay ? remainingDay : value;

        remainingDay -= allowed;

        return allowed;
      };

      // ==========================================
      // LEAVE / OD DATA
      // ==========================================

      const leaveTransactions = obj?.userLeaves || [];

      // ==========================================
      // 1. LEAVE / OD PRIORITY
      // ==========================================

      for (const leave of leaveTransactions) {
        let leaveType = null;
        let leaveValue = 0;
        let isLeaveTransRequired = false;

        if (leave.authorizationStatus == 3) {
          leaveType = leave?.ult?.[0]?.hrLeaveType?.LeaveID;
          isLeaveTransRequired = true;

          // ✅ Sum all transaction days
          leaveValue = (leave?.ult || []).reduce((sum, tran) => {
            return sum + (tran.DayType === 'Full Day' ? 1 : 0.5);
          }, 0);
        } else {
          leaveType = leave?.hrLeaveType?.LeaveID;

          // ✅ Single leave value
          leaveValue = leave?.DayType === 'Full Day' ? 1 : 0.5;
        }

        const isOD = leaveType == 25;

        const keyName = isOD
          ? leave.authorizationStatus == 3
            ? branchDepartmentWiseDahsboardStatus.APPROVED_OD
            : branchDepartmentWiseDahsboardStatus.PENDING_OD
          : leave.authorizationStatus == 3
            ? branchDepartmentWiseDahsboardStatus.APPROVED_LEAVE
            : branchDepartmentWiseDahsboardStatus.PENDING_LEAVE;

        const consumed = consume(leaveValue);

        data[keyName] += consumed;
      }

      // ==========================================
      // 2. WEEKOFF / HOLIDAY PRIORITY
      // ==========================================

      if (remainingDay > 0 && weekoffHoliday) {
        const whValue = weekoffHoliday?.WHDayType === 'SH' ? 0.5 : 1;

        const consumed = consume(whValue);

        // WEEKOFF
        if (isWeekoff) {
          data[branchDepartmentWiseDahsboardStatus.WEEKOFF] += consumed;

          if (attendance && fulldayhalfday != 0) {
            data[branchDepartmentWiseDahsboardStatus.PRESENT_ON_WEEKOFF] +=
              fulldayhalfday;
          }
        }

        // HOLIDAY
        else if (isHoliday) {
          data[branchDepartmentWiseDahsboardStatus.HOLIDAY] += consumed;

          if (attendance && fulldayhalfday != 0) {
            data[branchDepartmentWiseDahsboardStatus.PRESENT_ON_HOLIDAY] +=
              fulldayhalfday;
          }
        }
      }

      // ==========================================
      // 3. ATTENDANCE PRIORITY
      // ==========================================

      if (remainingDay > 0 && !isWeekoffOrHoliday) {
        if (isFindCurrentDate && attendance && !attendance.OutDateTime) {
          // Current day with only In punch - consider as PRESENT for remaining day
          const consumed = consume(remainingDay);
          data[branchDepartmentWiseDahsboardStatus.PRESENT] += consumed;
        } else if (fulldayhalfday == 1) {
          // FULL PRESENT
          const consumed = consume(1);

          data[branchDepartmentWiseDahsboardStatus.PRESENT] += consumed;
        }

        // HALF DAY
        else if (fulldayhalfday == 0.5) {
          const consumed = consume(0.5);

          data[branchDepartmentWiseDahsboardStatus.HALF_DAY] += consumed;
        }

        // ABSENT
        else if (fulldayhalfday == 0) {
          const consumed = consume(remainingDay);

          data[branchDepartmentWiseDahsboardStatus.ABSENT] += consumed;
        }
      }

      // ==========================================
      // FINAL ABSENT
      // ==========================================

      if (remainingDay > 0 && !isWeekoffOrHoliday) {
        data[branchDepartmentWiseDahsboardStatus.ABSENT] += remainingDay;

        remainingDay = 0;
      }

      branchDepartmentMap.set(key, data);
    }

    // =====================================================
    // TOTALS
    // =====================================================

    const total = {
      [branchDepartmentWiseDahsboardStatus.PRESENT]: 0,
      [branchDepartmentWiseDahsboardStatus.HALF_DAY]: 0,
      [branchDepartmentWiseDahsboardStatus.ABSENT]: 0,
      [branchDepartmentWiseDahsboardStatus.WEEKOFF]: 0,
      [branchDepartmentWiseDahsboardStatus.HOLIDAY]: 0,
      [branchDepartmentWiseDahsboardStatus.PRESENT_ON_WEEKOFF]: 0,
      [branchDepartmentWiseDahsboardStatus.PRESENT_ON_HOLIDAY]: 0,
      [branchDepartmentWiseDahsboardStatus.APPROVED_LEAVE]: 0,
      [branchDepartmentWiseDahsboardStatus.PENDING_LEAVE]: 0,
      [branchDepartmentWiseDahsboardStatus.APPROVED_OD]: 0,
      [branchDepartmentWiseDahsboardStatus.PENDING_OD]: 0,
      Total: 0,
    };

    branchDepartmentMap.forEach((value) => {
      value.Total =
        value[branchDepartmentWiseDahsboardStatus.PRESENT] +
        value[branchDepartmentWiseDahsboardStatus.HALF_DAY] +
        value[branchDepartmentWiseDahsboardStatus.ABSENT] +
        value[branchDepartmentWiseDahsboardStatus.WEEKOFF] +
        value[branchDepartmentWiseDahsboardStatus.HOLIDAY] +
        value[branchDepartmentWiseDahsboardStatus.PRESENT_ON_WEEKOFF] +
        value[branchDepartmentWiseDahsboardStatus.PRESENT_ON_HOLIDAY] +
        value[branchDepartmentWiseDahsboardStatus.APPROVED_LEAVE] +
        value[branchDepartmentWiseDahsboardStatus.PENDING_LEAVE] +
        value[branchDepartmentWiseDahsboardStatus.APPROVED_OD] +
        value[branchDepartmentWiseDahsboardStatus.PENDING_OD];

      Object.keys(total).forEach((key) => {
        total[key] += +value[key] || 0;
      });
    });

    // =====================================================
    // RESPONSE
    // =====================================================
    const responseData = Array.from(branchDepartmentMap.values());
    if (exportData) {
      responseData.push({
        Branch: '',
        Department: 'Total',
        [branchDepartmentWiseDahsboardStatus.PRESENT]:
          total[branchDepartmentWiseDahsboardStatus.PRESENT] || 0,
        [branchDepartmentWiseDahsboardStatus.HALF_DAY]:
          total[branchDepartmentWiseDahsboardStatus.HALF_DAY] || 0,
        [branchDepartmentWiseDahsboardStatus.ABSENT]:
          total[branchDepartmentWiseDahsboardStatus.ABSENT] || 0,
        [branchDepartmentWiseDahsboardStatus.WEEKOFF]:
          total[branchDepartmentWiseDahsboardStatus.WEEKOFF] || 0,
        [branchDepartmentWiseDahsboardStatus.HOLIDAY]:
          total[branchDepartmentWiseDahsboardStatus.HOLIDAY] || 0,
        [branchDepartmentWiseDahsboardStatus.PRESENT_ON_WEEKOFF]:
          total[branchDepartmentWiseDahsboardStatus.PRESENT_ON_WEEKOFF] || 0,
        [branchDepartmentWiseDahsboardStatus.PRESENT_ON_HOLIDAY]:
          total[branchDepartmentWiseDahsboardStatus.PRESENT_ON_HOLIDAY] || 0,
        [branchDepartmentWiseDahsboardStatus.APPROVED_LEAVE]:
          total[branchDepartmentWiseDahsboardStatus.APPROVED_LEAVE] || 0,
        [branchDepartmentWiseDahsboardStatus.PENDING_LEAVE]:
          total[branchDepartmentWiseDahsboardStatus.PENDING_LEAVE] || 0,
        [branchDepartmentWiseDahsboardStatus.APPROVED_OD]:
          total[branchDepartmentWiseDahsboardStatus.APPROVED_OD] || 0,
        [branchDepartmentWiseDahsboardStatus.PENDING_OD]:
          total[branchDepartmentWiseDahsboardStatus.PENDING_OD] || 0,
        Total: total.Total || 0,
      });
      return await generateExcel(
        responseData,
        'Branch Department Wise Attendance Count',
        'xlsx',
        res,
      );
    }
    return res.status(200).json({
      status: statusCodes.OK,
      headings,
      data: responseData,
      total,
      totalCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Trainee Dashboard Data
 * Returns learning progress and course information for trainee users
 */
exports.getTraineeDashboard = async (req, res, next) => {
  try {
    const userMasterID = req.userDetails?.userMasterId;
    const companyMasterID = req.userDetails?.companyMasterId;

    if (!userMasterID || !companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: 'Unauthorized access',
      });
    }

    const Enrollment = require('../models/enrollment');
    const Course = require('../models/course');
    const Certificate = require('../models/certificate');
    const { Op } = require('sequelize');

    // Get all enrollments for the user
    const enrollments = await Enrollment.findAll({
      where: {
        userMasterID,
        status: 1,
      },
      order: [['enrolledAt', 'DESC']],
    });

    // Get all course IDs from enrollments
    const courseIds = enrollments.map((e) => e.courseID);

    // Fetch courses for those IDs
    let coursesMap = {};
    if (courseIds.length > 0) {
      const courses = await Course.findAll({
        where: { id: courseIds, status: 1 },
        attributes: ['id', 'title', 'description', 'coverImageUrl'],
      });
      courses.forEach((c) => {
        coursesMap[c.id] = c;
      });
    }

    // Get all certificates for the user
    const certificates = await Certificate.findAll({
      where: {
        userId: userMasterID,
        status: 1,
      },
      order: [['issuedAt', 'DESC']],
    });

    // Build a map of courseId -> certificate
    const certByCourseId = {};
    certificates.forEach((cert) => {
      certByCourseId[cert.courseId] = cert;
    });

    // Fetch course titles for certificates
    const certCourseIds = certificates
      .map((c) => c.courseId)
      .filter((id) => !coursesMap[id]);
    if (certCourseIds.length > 0) {
      const certCourses = await Course.findAll({
        where: { id: certCourseIds, status: 1 },
        attributes: ['id', 'title'],
      });
      certCourses.forEach((c) => {
        coursesMap[c.id] = c;
      });
    }

    // Calculate statistics
    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter(
      (e) => e.completedAt,
    ).length;
    const inProgressEnrollments = enrollments.filter(
      (e) => !e.completedAt && e.isActive,
    ).length;
    const totalCertificates = certificates.length;

    // Calculate average score from completed enrollments
    const completedWithProgress = enrollments.filter(
      (e) => e.completedAt && e.progressPercentage,
    );
    const averageScore =
      completedWithProgress.length > 0
        ? completedWithProgress.reduce(
            (sum, e) => sum + parseFloat(e.progressPercentage),
            0,
          ) / completedWithProgress.length
        : 0;

    // Map enrollments to course data
    const myCourses = enrollments.map((enrollment) => {
      const course = coursesMap[enrollment.courseID] || {};
      const certificate = certByCourseId[enrollment.courseID];

      return {
        id: String(enrollment.enrollmentID),
        courseId: String(enrollment.courseID),
        courseName: course.title || 'Unknown Course',
        courseDescription: course.description || '',
        coverImageUrl: course.coverImageUrl || '',
        enrollmentDate: enrollment.enrolledAt,
        isCompleted: !!enrollment.completedAt,
        completedAt: enrollment.completedAt,
        progressPercentage: parseFloat(enrollment.progressPercentage) || 0,
        lastAccessedAt: enrollment.lastAccessedAt,
        certificateId: certificate ? certificate.id : null,
      };
    });

    // Map recent certificates to activity
    const recentActivity = certificates.slice(0, 5).map((cert) => {
      const course = coursesMap[cert.courseId] || {};
      return {
        type: 'CERTIFICATE_ISSUED',
        courseName: course.title || 'Course',
        certificateNumber: cert.certificateNumber,
        timestamp: cert.issuedAt,
      };
    });

    const dashboardData = {
      overview: {
        enrolledCourses: totalEnrollments,
        completedCourses: completedEnrollments,
        inProgressCourses: inProgressEnrollments,
        certificatesEarned: totalCertificates,
        averageScore: Math.round(averageScore * 100) / 100,
      },
      myCourses,
      recentActivity,
      upcomingDeadlines: [],
    };

    console.log(
      `📊 Trainee dashboard for user ${userMasterID}: ${totalEnrollments} enrollments, ${completedEnrollments} completed, ${totalCertificates} certificates`,
    );

    return res.status(200).json({
      status: 200,
      message: 'Trainee dashboard data retrieved successfully',
      data: dashboardData,
    });
  } catch (error) {
    console.error('Error fetching trainee dashboard:', error);
    next(error);
  }
};

const getPaginatedBranchDepartmentIDs = (
  branches,
  departments,
  limit = 10,
  offset = 0,
  exportData = false,
) => {
  try {
    const branchDepartmentMap = new Map();
    const branchMasterIDs = [];
    const departmentIDs = [];
    let counter = 0;

    const defaultObj = {
      Branch: '',
      Department: '',
      [branchDepartmentWiseDahsboardStatus.PRESENT]: 0,
      [branchDepartmentWiseDahsboardStatus.HALF_DAY]: 0,
      [branchDepartmentWiseDahsboardStatus.ABSENT]: 0,
      [branchDepartmentWiseDahsboardStatus.WEEKOFF]: 0,
      [branchDepartmentWiseDahsboardStatus.HOLIDAY]: 0,
      [branchDepartmentWiseDahsboardStatus.PRESENT_ON_WEEKOFF]: 0,
      [branchDepartmentWiseDahsboardStatus.PRESENT_ON_HOLIDAY]: 0,
      [branchDepartmentWiseDahsboardStatus.APPROVED_LEAVE]: 0,
      [branchDepartmentWiseDahsboardStatus.PENDING_LEAVE]: 0,
      [branchDepartmentWiseDahsboardStatus.APPROVED_OD]: 0,
      [branchDepartmentWiseDahsboardStatus.PENDING_OD]: 0,
      Total: 0,
    };

    for (const branch of branches) {
      for (const department of departments) {
        // ✅ Skip pagination if exportData = true
        if (!exportData) {
          if (counter < offset) {
            counter++;
            continue;
          }

          if (counter >= offset + limit) {
            counter++;
            continue;
          }
        }

        const obj = { ...defaultObj };

        obj['Branch'] = branch.branchName;
        obj['Department'] = department.departmentName;

        const key = `${branch.branchMasterID}-${department.departmentId}`;

        branchDepartmentMap.set(key, obj);

        counter++;
      }
    }

    branchDepartmentMap.forEach((value, key) => {
      const [bId, dId] = key.split('-');

      branchMasterIDs.push(Number(bId));
      departmentIDs.push(Number(dId));
    });

    return {
      branchMasterIDs,
      departmentIDs,
      totalCount: branches.length * departments.length,
      branchDepartmentMap,
    };
  } catch (error) {
    throw error;
  }
};

exports.branchDepartmentWiseAttendanceOnlyCount = async (req, res, next) => {
  try {
    const { companyMasterID, shiftID, attendanceDate } = req.body;

    let { branchMasterID, departmentID } = req.body;

    if (!companyMasterID || !attendanceDate) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // ===============================
    // BRANCH FILTER
    // ===============================
    const branchCondition = {
      companyMasterID,
      status: 1,
    };

    if (branchMasterID?.length) {
      branchCondition.branchMasterID = branchMasterID;
    } else {
      if (
        req.userDetails.accessibleBranches &&
        req.userDetails.accessibleBranches.length
      ) {
        branchCondition.branchMasterID = req.userDetails.accessibleBranches;
      }
    }

    const allBranches = await BranchMaster.findAll({
      where: branchCondition,
      attributes: ['branchMasterID'],
    });

    branchMasterID = allBranches.map((b) => b.branchMasterID);

    // ===============================
    // DEPARTMENT FILTER
    // ===============================
    const departmentCondition = {
      companyMasterID,
      status: 1,
    };

    if (departmentID?.length) {
      departmentCondition.departmentId = departmentID;
    }

    const allDepartments = await Department.findAll({
      where: departmentCondition,
      attributes: ['departmentId'],
    });

    departmentID = allDepartments.map((d) => d.departmentId);

    // ===============================
    // TOTAL OBJECT
    // ===============================
    const total = {
      [branchDepartmentWiseDahsboardStatus.PRESENT]: 0,
      [branchDepartmentWiseDahsboardStatus.HALF_DAY]: 0,
      [branchDepartmentWiseDahsboardStatus.ABSENT]: 0,
      [branchDepartmentWiseDahsboardStatus.WEEKOFF]: 0,
      [branchDepartmentWiseDahsboardStatus.HOLIDAY]: 0,
      [branchDepartmentWiseDahsboardStatus.PRESENT_ON_WEEKOFF]: 0,
      [branchDepartmentWiseDahsboardStatus.PRESENT_ON_HOLIDAY]: 0,
      [branchDepartmentWiseDahsboardStatus.APPROVED_LEAVE]: 0,
      [branchDepartmentWiseDahsboardStatus.PENDING_LEAVE]: 0,
      [branchDepartmentWiseDahsboardStatus.APPROVED_OD]: 0,
      [branchDepartmentWiseDahsboardStatus.PENDING_OD]: 0,
      Total: 0,
    };

    const includedModels = [
      {
        required: true,
        model: EmployeeBranch,
        as: 'emp_branch',
        where: {
          branchID: branchMasterID,
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: ['branchID'],
      },
      {
        required: true,
        model: EmployeeDepartment,
        as: 'emp_dept',
        where: {
          departmentID,
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: ['departmentID'],
      },
      {
        required: false,
        model: EmployeeAttendancePolicy,
        as: 'empAttPolicy',
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(currentDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        include: [
          {
            model: AttendancePolicy,
            as: 'attendancePolicy',
            attributes: ['WHPHPriority'],
          },
        ],
      },
      {
        required: false,
        model: UserLeave,
        where: {
          FromDate: { [Sequelize.Op.lte]: attendanceDate },
          ToDate: { [Sequelize.Op.gte]: attendanceDate },
          status: 1,
          authorizationStatus: [0, 1, 2, 3],
        },
        attributes: [
          'UserLeaveApplicationID',
          'LeaveTranId',
          'userMasterID',
          'FromDate',
          'ToDate',
          'LeaveDays',
          'authorizationStatus',
          'DayType',
        ],
        include: [
          {
            required: false,
            model: UserLeaveTransaction,
            as: 'ult',
            attributes: ['LeaveTranId', 'status', 'date', 'days'],
            where: {
              date: attendanceDate,
              status: 1,
            },
            include: [
              {
                model: HrLeaveTypes,
                attributes: ['LeaveID'],
              },
            ],
          },
          {
            model: HrLeaveTypes,
            attributes: ['LeaveID'],
          },
        ],
      },
      {
        required: false,
        model: attendanceTransaction,
        where: {
          AttendanceDate: attendanceDate,
        },
      },
      {
        required: false,
        model: weekoffHolidayTran,
        where: {
          date: attendanceDate,
        },
      },
      {
        required: false,
        model: EmployeeShift,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(currentDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
      },
    ];

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    const userData = await UserMaster.findAll({
      distinct: true,
      subQuery: false,
      where: {
        companyMasterId: companyMasterID,
        status: 1,
        ...userAccessCondition.where,
      },
      attributes: ['userMasterID'],
      include: [...includedModels, ...userAccessCondition.includeModels],
      order: [['userMasterID', 'ASC']],
    });

    const formattedAttendanceDate = String(attendanceDate).slice(0, 10);
    const isFindCurrentDate = currentDate === formattedAttendanceDate;

    for (const user of userData) {
      const obj = user.toJSON();

      const attendance = obj?.attendanceTransactions?.[0] || null;
      const employeeShiftData = obj.employeeShifts?.[0] || null;

      if (shiftID) {
        let employeeShifts = [];

        if (attendance) {
          employeeShifts = [+attendance.Shift];
        } else if (employeeShiftData?.shiftsID?.length) {
          employeeShifts = [...employeeShiftData.shiftsID];
        } else if (employeeShiftData?.shiftID) {
          employeeShifts = [employeeShiftData.shiftID];
        }

        if (!employeeShifts.includes(shiftID)) continue;
      }

      const fulldayhalfday = +attendance?.fulldayhalfday || 0;

      const attendancePolicy = obj?.empAttPolicy?.[0]?.attendancePolicy || null;
      const WHPHPriority = attendancePolicy?.WHPHPriority || 'WH';
      const expectedType = WHPHPriority == 'PH' ? 'holiday' : 'weekoff';

      const weekoffHoliday = obj?.weekoffHolidayTrans?.find(
        (wh) => wh.tableName === expectedType,
      );

      const isWeekoff = weekoffHoliday?.tableName === 'weekoff';
      const isHoliday = weekoffHoliday?.tableName === 'holiday';
      const isWeekoffOrHoliday = isWeekoff || isHoliday;

      let remainingDay = 1;

      const consume = (value) => {
        const allowed = value > remainingDay ? remainingDay : value;
        remainingDay -= allowed;
        return allowed;
      };

      const leaveTransactions = obj?.userLeaves || [];

      // ===============================
      // LEAVE / OD
      // ===============================
      for (const leave of leaveTransactions) {
        let leaveType = null;
        let leaveValue = 0;

        if (leave.authorizationStatus == 3) {
          leaveType = leave?.ult?.[0]?.hrLeaveType?.LeaveID;

          leaveValue = (leave?.ult || []).reduce((sum, tran) => {
            return sum + (+tran.days || 0);
          }, 0);
        } else {
          leaveType = leave?.hrLeaveType?.LeaveID;
          leaveValue = leave?.DayType === 'Full Day' ? 1 : 0.5;
        }

        const isOD = leaveType == 25;

        const keyName = isOD
          ? leave.authorizationStatus == 3
            ? branchDepartmentWiseDahsboardStatus.APPROVED_OD
            : branchDepartmentWiseDahsboardStatus.PENDING_OD
          : leave.authorizationStatus == 3
            ? branchDepartmentWiseDahsboardStatus.APPROVED_LEAVE
            : branchDepartmentWiseDahsboardStatus.PENDING_LEAVE;

        total[keyName] += consume(leaveValue);
      }

      // ===============================
      // WEEKOFF / HOLIDAY
      // ===============================
      if (remainingDay > 0 && weekoffHoliday) {
        const whValue = weekoffHoliday?.WHDayType === 'SH' ? 0.5 : 1;
        const consumed = consume(whValue);

        if (isWeekoff) {
          total[branchDepartmentWiseDahsboardStatus.WEEKOFF] += consumed;

          if (attendance && fulldayhalfday != 0) {
            total[branchDepartmentWiseDahsboardStatus.PRESENT_ON_WEEKOFF] +=
              fulldayhalfday;
          }
        } else if (isHoliday) {
          total[branchDepartmentWiseDahsboardStatus.HOLIDAY] += consumed;

          if (attendance && fulldayhalfday != 0) {
            total[branchDepartmentWiseDahsboardStatus.PRESENT_ON_HOLIDAY] +=
              fulldayhalfday;
          }
        }
      }

      // ===============================
      // ATTENDANCE
      // ===============================
      if (remainingDay > 0 && !isWeekoffOrHoliday) {
        if (isFindCurrentDate && attendance && !attendance.OutDateTime) {
          total[branchDepartmentWiseDahsboardStatus.PRESENT] +=
            consume(remainingDay);
        } else if (fulldayhalfday == 1) {
          total[branchDepartmentWiseDahsboardStatus.PRESENT] += consume(1);
        } else if (fulldayhalfday == 0.5) {
          total[branchDepartmentWiseDahsboardStatus.HALF_DAY] += consume(0.5);
        } else {
          total[branchDepartmentWiseDahsboardStatus.ABSENT] +=
            consume(remainingDay);
        }
      }

      if (remainingDay > 0 && !isWeekoffOrHoliday) {
        total[branchDepartmentWiseDahsboardStatus.ABSENT] += remainingDay;
        remainingDay = 0;
      }
    }

    total.Total = Object.keys(total)
      .filter((key) => key !== 'Total')
      .reduce((sum, key) => sum + (+total[key] || 0), 0);

    return res.status(200).json({
      status: statusCodes.OK,
      data: total,
    });
  } catch (error) {
    next(error);
  }
};

const branchDepartmentWiseDahsboardStatus = {
  PRESENT: 'P',
  HALF_DAY: 'HFD',
  ABSENT: 'A',
  WEEKOFF: 'W',
  HOLIDAY: 'H',
  PRESENT_ON_WEEKOFF: 'Present On Weekoff',
  PRESENT_ON_HOLIDAY: 'Present On Holiday',
  APPROVED_LEAVE: 'Approved Leave',
  PENDING_LEAVE: 'Pending Leave',
  APPROVED_OD: 'Approved OD',
  PENDING_OD: 'Pending OD',
};

exports.branchDepartmentWiseAttendanceDateWiseCount = async (
  req,
  res,
  next,
) => {
  try {
    const {
      companyMasterID,
      shiftID,
      fromdate,
      todate,
      branchMasterID,
      departmentID,
      showFields = [
        branchDepartmentWiseDahsboardStatus.PRESENT,
        branchDepartmentWiseDahsboardStatus.ABSENT,
        branchDepartmentWiseDahsboardStatus.WEEKOFF,
        branchDepartmentWiseDahsboardStatus.HOLIDAY,
      ],
      userMasterID = [],
    } = req.body;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // =====================================================
    // INCLUDE MODELS
    // =====================================================

    const employeeJoiningCondition = {
      joiningDate: {
        [Sequelize.Op.lte]: new Date(todate),
      },
      [Sequelize.Op.or]: [
        {
          leavingDate: { [Sequelize.Op.gte]: new Date(fromdate) },
        },
        {
          leavingDate: { [Sequelize.Op.eq]: null },
        },
      ],
    };
    const includedModels = [
      {
        required: true,
        model: EmployeeJoiningDetails,
        as: 'emp_join',
        where: employeeJoiningCondition,
      },
      {
        required: false,
        model: EmployeeAttendancePolicy,
        as: 'empAttPolicy',
        where: {
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(currentDate),
              },
            },
            {
              endDate: {
                [Sequelize.Op.eq]: null,
              },
            },
          ],
        },
        include: [
          {
            model: AttendancePolicy,
            as: 'attendancePolicy',
            attributes: ['WHPHPriority'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeShift,
        where: {
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(currentDate),
              },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
      },
    ];
    if (branchMasterID && branchMasterID.length) {
      includedModels.push({
        required: true,
        model: EmployeeBranch,
        as: 'emp_branch',
        where: {
          branchID: branchMasterID,
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(currentDate),
              },
            },
            {
              endDate: {
                [Sequelize.Op.eq]: null,
              },
            },
          ],
        },
        attributes: [],
      });
    }

    if (departmentID && departmentID.length) {
      includedModels.push({
        required: true,
        model: EmployeeDepartment,
        as: 'emp_dept',
        where: {
          departmentID: departmentID,
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(currentDate),
              },
            },
            {
              endDate: {
                [Sequelize.Op.eq]: null,
              },
            },
          ],
        },
        attributes: [],
      });
    }
    // =====================================================
    // ACCESS FILTER
    // =====================================================

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const userCondition = {
      companyMasterId: companyMasterID,
      status: [0, 1],

      ...(userMasterID?.length && { userMasterID }),
    };
    const allUsersData = await UserMaster.findAll({
      distinct: true,
      where: { ...userAccessCondition.where, ...userCondition },
      include: [...userAccessCondition.includeModels, ...includedModels],
      attributes: ['userMasterID', 'displayName', 'userNumber'],
      order: [['userMasterID', 'ASC']],
    });
    const allUserIDs = allUsersData.map((e) => e.userMasterID);
    const attendancedata1 = attendanceTransaction.findAll({
      raw: true,
      where: {
        userMasterID: allUserIDs,
        AttendanceDate: {
          [Sequelize.Op.between]: [new Date(fromdate), new Date(todate)],
        },
      },
      attributes: [
        'userMasterID',
        'AttendanceDate',
        'fulldayhalfday',
        'OutDateTime',
        'Shift',
      ],
      order: [['AttendanceDate', 'ASC']],
    });
    const weekholidaydata1 = await weekoffHolidayTran.findAll({
      raw: true,
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
        'WHDayType',
      ],
      order: [
        ['date', 'ASC'],
        ['tableName', 'DESC'],
      ],
    });
    const userleaveData1 = UserLeave.findAll({
      where: {
        userMasterID: allUserIDs,
        status: 1,
        FromDate: {
          [Sequelize.Op.lte]: new Date(todate),
        },
        ToDate: {
          [Sequelize.Op.gte]: new Date(fromdate),
        },
        authorizationStatus: [0, 1, 2, 3],
      },
      include: [
        {
          separate: true,
          required: false,
          model: UserLeaveTransaction,
          as: 'ult',
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
    const shiftRosterData1 = ShiftRoster.findAll({
      raw: true,
      where: {
        userMasterID: allUserIDs,
        shiftRosterDate: {
          [Sequelize.Op.between]: [fromdate, todate],
        },
      },
      order: [['shiftRosterDate', 'ASC']],
    });
    const [attendancedata, weekholidaydata, userleaveData, shiftRosterData] =
      await Promise.all([
        attendancedata1,
        weekholidaydata1,
        userleaveData1,
        shiftRosterData1,
      ]);
    const datesArray = (
      await getDatesFromDateRange(new Date(fromdate), new Date(todate))
    ).map((date) => moment(date).format('YYYY-MM-DD'));
    const showFieldSet = new Set(showFields);

    const responseObj = {
      showPresent: showFieldSet.has(
        branchDepartmentWiseDahsboardStatus.PRESENT,
      ),

      showHalfDay: showFieldSet.has(
        branchDepartmentWiseDahsboardStatus.HALF_DAY,
      ),

      showAbsent: showFieldSet.has(branchDepartmentWiseDahsboardStatus.ABSENT),

      showWeekoff: showFieldSet.has(
        branchDepartmentWiseDahsboardStatus.WEEKOFF,
      ),

      showHoliday: showFieldSet.has(
        branchDepartmentWiseDahsboardStatus.HOLIDAY,
      ),

      showPresentOnWeekoff: showFieldSet.has(
        branchDepartmentWiseDahsboardStatus.PRESENT_ON_WEEKOFF,
      ),

      showPresentOnHoliday: showFieldSet.has(
        branchDepartmentWiseDahsboardStatus.PRESENT_ON_HOLIDAY,
      ),

      showApprovedLeave: showFieldSet.has(
        branchDepartmentWiseDahsboardStatus.APPROVED_LEAVE,
      ),

      showPendingLeave: showFieldSet.has(
        branchDepartmentWiseDahsboardStatus.PENDING_LEAVE,
      ),

      showApprovedOD: showFieldSet.has(
        branchDepartmentWiseDahsboardStatus.APPROVED_OD,
      ),

      showPendingOD: showFieldSet.has(
        branchDepartmentWiseDahsboardStatus.PENDING_OD,
      ),

      dateWiseData: [],
    };
    const normalizeDate = (date) => moment(date).format('YYYY-MM-DD');
    const attendanceMap = new Map();
    for (const att of attendancedata) {
      const key = `${att.userMasterID}_${normalizeDate(att.AttendanceDate)}`;
      attendanceMap.set(key, att);
    }

    const shiftRosterMap = new Map();
    for (const shift of shiftRosterData) {
      const key = `${shift.userMasterID}_${normalizeDate(shift.shiftRosterDate)}`;
      shiftRosterMap.set(key, shift);
    }
    const weekoffHolidayMap = new Map();
    for (const wh of weekholidaydata) {
      const key = `${wh.userMasterID}_${normalizeDate(wh.date)}`;
      weekoffHolidayMap.set(key, wh);
    }
    const leaveMap = new Map();

    for (const leave of userleaveData) {
      const start = moment(leave.FromDate);
      const end = moment(leave.ToDate);
      while (start.isSameOrBefore(end, 'day')) {
        const key = `${leave.userMasterID}_${start.format('YYYY-MM-DD')}`;
        if (!leaveMap.has(key)) {
          leaveMap.set(key, []);
        }
        leaveMap.get(key).push(leave);
        start.add(1, 'day');
      }
    }
    function formatDate(date) {
      const d = new Date(date);

      return `${String(d.getDate()).padStart(2, '0')}-${String(
        d.getMonth() + 1,
      ).padStart(2, '0')}-${d.getFullYear()}`;
    }
    const allUsers = allUsersData.map((u) => u.toJSON());
    for (let date of datesArray) {
      const dateWiseObj = {
        attendanceDate: date,
        formattedDate: formatDate(date),
        [branchDepartmentWiseDahsboardStatus.PRESENT]: 0,
        [branchDepartmentWiseDahsboardStatus.HALF_DAY]: 0,
        [branchDepartmentWiseDahsboardStatus.ABSENT]: 0,
        [branchDepartmentWiseDahsboardStatus.WEEKOFF]: 0,
        [branchDepartmentWiseDahsboardStatus.HOLIDAY]: 0,
        [branchDepartmentWiseDahsboardStatus.PRESENT_ON_WEEKOFF]: 0,
        [branchDepartmentWiseDahsboardStatus.PRESENT_ON_HOLIDAY]: 0,
        [branchDepartmentWiseDahsboardStatus.APPROVED_LEAVE]: 0,
        [branchDepartmentWiseDahsboardStatus.PENDING_LEAVE]: 0,
        [branchDepartmentWiseDahsboardStatus.APPROVED_OD]: 0,
        [branchDepartmentWiseDahsboardStatus.PENDING_OD]: 0,
      };
      const normalizedDate = normalizeDate(dateWiseObj.attendanceDate);
      const formattedAttendanceDate = String(dateWiseObj.attendanceDate).slice(
        0,
        10,
      );
      const isFindCurrentDate = currentDate === formattedAttendanceDate;
      const dateWiseFilteredUserData = allUsers.filter((user) => {
        const employeeJoining = user.emp_join?.[0] || null;
        if (employeeJoining) {
          const joiningDate = moment(employeeJoining.joiningDate).format(
            'YYYY-MM-DD',
          );
          const leavingDate = employeeJoining.leavingDate
            ? moment(employeeJoining.leavingDate).format('YYYY-MM-DD')
            : null;
          if (
            joiningDate <= formattedAttendanceDate &&
            (!leavingDate || leavingDate >= formattedAttendanceDate)
          ) {
            return true;
          }
        }
        return false;
      });
      for (const user of dateWiseFilteredUserData) {
        const attendance = attendanceMap.get(
          `${user.userMasterID}_${normalizedDate}`,
        );
        const employeeShiftData = user.employeeShifts?.[0] || null;
        const shiftRoster = shiftRosterMap.get(
          `${user.userMasterID}_${normalizedDate}`,
        );
        if (shiftID) {
          let employeeShifts = [];
          if (attendance) {
            employeeShifts = [+attendance.Shift];
          } else if (shiftRoster) {
            employeeShifts = [+shiftRoster.shiftID];
          } else if (
            employeeShiftData &&
            employeeShiftData.shiftsID &&
            employeeShiftData.shiftsID.length
          ) {
            const shiftsFromEmployeeShift = employeeShiftData.shiftsID.map(
              (id) => +id,
            );
            employeeShifts = [...shiftsFromEmployeeShift];
          } else if (employeeShiftData && employeeShiftData.shiftID) {
            employeeShifts = [+employeeShiftData.shiftID];
          }
          if (!employeeShifts.includes(shiftID)) {
            continue;
          }
        }
        const fulldayhalfday = +attendance?.fulldayhalfday || 0;
        const attendancePolicy = user?.empAttPolicy?.[0]?.attendancePolicy;
        const WHPHPriority = attendancePolicy?.WHPHPriority || 'WH';
        const weekoffHoliday = weekoffHolidayMap.get(
          `${user.userMasterID}_${normalizedDate}`,
        );
        const isWeekoff = weekoffHoliday?.tableName === 'weekoff';
        const isHoliday = weekoffHoliday?.tableName === 'holiday';
        const isWeekoffOrHoliday = isWeekoff || isHoliday;
        let remainingDay = 1;
        const consume = (value) => {
          const allowed = value > remainingDay ? remainingDay : value;
          remainingDay -= allowed;
          return allowed;
        };
        // ==========================================
        // LEAVE / OD DATA
        // ==========================================
        const leaveTransactions =
          leaveMap.get(`${user.userMasterID}_${normalizedDate}`) || [];
        // ==========================================
        // 1. LEAVE / OD PRIORITY
        // ==========================================

        for (const leave of leaveTransactions) {
          let leaveType = null;
          let leaveValue = 0;

          if (leave.authorizationStatus == 3) {
            leaveType = leave?.ult?.[0]?.hrLeaveType?.LeaveID;

            // ✅ Sum all transaction days
            const filteredUserLeaveTrans = (leave?.ult || []).filter((e) =>
              moment(e.date).isSame(moment(normalizedDate), 'day'),
            );
            leaveValue = (filteredUserLeaveTrans || []).reduce((sum, tran) => {
              return sum + Number(tran.days || 0);
            }, 0);
          } else {
            leaveType = leave?.hrLeaveType?.LeaveID;

            // ✅ Single leave value
            leaveValue = leave?.DayType === 'Full Day' ? 1 : 0.5;
          }

          const isOD = leaveType == 25;

          const keyName = isOD
            ? leave.authorizationStatus == 3
              ? branchDepartmentWiseDahsboardStatus.APPROVED_OD
              : branchDepartmentWiseDahsboardStatus.PENDING_OD
            : leave.authorizationStatus == 3
              ? branchDepartmentWiseDahsboardStatus.APPROVED_LEAVE
              : branchDepartmentWiseDahsboardStatus.PENDING_LEAVE;

          const consumed = consume(leaveValue);
          dateWiseObj[keyName] += consumed;
        }

        // ==========================================
        // 2. WEEKOFF / HOLIDAY PRIORITY
        // ==========================================
        if (remainingDay > 0 && weekoffHoliday) {
          const whValue = weekoffHoliday?.WHDayType === 'SH' ? 0.5 : 1;

          const consumed = consume(whValue);

          // WEEKOFF
          if (isWeekoff) {
            dateWiseObj[branchDepartmentWiseDahsboardStatus.WEEKOFF] +=
              consumed;

            if (attendance && fulldayhalfday != 0) {
              dateWiseObj[
                branchDepartmentWiseDahsboardStatus.PRESENT_ON_WEEKOFF
              ] += fulldayhalfday;
            }
          }

          // HOLIDAY
          else if (isHoliday) {
            dateWiseObj[branchDepartmentWiseDahsboardStatus.HOLIDAY] +=
              consumed;

            if (attendance && fulldayhalfday != 0) {
              dateWiseObj[
                branchDepartmentWiseDahsboardStatus.PRESENT_ON_HOLIDAY
              ] += fulldayhalfday;
            }
          }
        }

        // ==========================================
        // 3. ATTENDANCE PRIORITY
        // ==========================================
        if (remainingDay > 0 && !isWeekoffOrHoliday) {
          if (isFindCurrentDate && attendance && !attendance.OutDateTime) {
            // Current day with only In punch - consider as PRESENT for remaining day
            const consumed = consume(remainingDay);
            dateWiseObj[branchDepartmentWiseDahsboardStatus.PRESENT] +=
              consumed;
          } else if (fulldayhalfday == 1) {
            // FULL PRESENT
            const consumed = consume(1);

            dateWiseObj[branchDepartmentWiseDahsboardStatus.PRESENT] +=
              consumed;
          }

          // HALF DAY
          else if (fulldayhalfday == 0.5) {
            const consumed = consume(0.5);

            dateWiseObj[branchDepartmentWiseDahsboardStatus.HALF_DAY] +=
              consumed;
          }
        }

        // ==========================================
        // FINAL ABSENT
        // ==========================================
        if (remainingDay > 0 && !isWeekoffOrHoliday) {
          dateWiseObj[branchDepartmentWiseDahsboardStatus.ABSENT] +=
            remainingDay;
          remainingDay = 0;
        }
      }
      responseObj.dateWiseData.push(dateWiseObj);
    }

    return res.status(200).json({
      status: statusCodes.OK,
      data: responseObj,
    });
  } catch (error) {
    next(error);
  }
};

exports.branchDesignationWiseEmployeeCount = async (req, res, next) => {
  try {
    const { companyMasterID, page, limit, exportData } = req.body;

    let { branchMasterID, designationId } = req.body;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // =====================================================
    // PAGINATION
    // =====================================================

    const paginationQuery =
      !exportData && page && limit
        ? {
            offset: (page - 1) * limit,
            limit: +limit,
          }
        : {};

    // =====================================================
    // BRANCH FILTER
    // =====================================================

    const branchCondition = {
      companyMasterID,
      status: 1,
    };

    if (branchMasterID?.length > 0) {
      branchCondition.branchMasterID = branchMasterID;
    } else {
      if (
        req.userDetails.accessibleBranches &&
        req.userDetails.accessibleBranches.length
      ) {
        branchCondition.branchMasterID = req.userDetails.accessibleBranches;
      }
    }

    const allBranches = await BranchMaster.findAll({
      where: branchCondition,
      attributes: ['branchMasterID', 'branchName'],
      order: [['branchName', 'ASC']],
    });

    branchMasterID = allBranches.map((b) => b.branchMasterID);

    // =====================================================
    // DESIGNATION FILTER
    // =====================================================

    const designationCondition = {
      companyMasterID,
      status: 1,
    };

    if (designationId?.length > 0) {
      designationCondition.designationId = designationId;
    }

    const allDesignations = await Designation.findAll({
      where: designationCondition,
      attributes: ['designationId', 'designationName'],
      order: [['designationName', 'ASC']],
    });

    designationId = allDesignations.map((d) => d.designationId);

    // =====================================================
    // PAGINATED BRANCH-DESIGNATION MAP
    // =====================================================

    const getPaginatedIDs = getPaginatedBranchDesignationIDs(
      allBranches,
      allDesignations,
      paginationQuery.limit,
      paginationQuery.offset,
      exportData,
    );

    const branchMasterIDs = getPaginatedIDs.branchMasterIDs;

    const designationIDs = getPaginatedIDs.designationIDs;

    const branchDesignationMap = getPaginatedIDs.branchDesignationMap;

    const totalCount = getPaginatedIDs.totalCount;

    // =====================================================
    // HEADINGS
    // =====================================================

    const headings = ['Branch', 'Designation', 'Employee Count'];

    // =====================================================
    // INCLUDE MODELS
    // =====================================================

    const includedModels = [
      {
        required: true,
        model: EmployeeBranch,
        as: 'emp_branch',
        where: {
          ...(branchMasterIDs?.length && {
            branchID: branchMasterIDs,
          }),
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(currentDate),
              },
            },
            {
              endDate: {
                [Sequelize.Op.eq]: null,
              },
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
      },
      {
        required: true,
        model: EmployeeDesignation,
        as: 'emp_desig',
        where: {
          ...(designationIDs?.length && {
            designationID: designationIDs,
          }),
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(currentDate),
              },
            },
            {
              endDate: {
                [Sequelize.Op.eq]: null,
              },
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
      },
    ];

    // =====================================================
    // ACCESS FILTER
    // =====================================================

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    // =====================================================
    // USER DATA
    // =====================================================

    const userData = await UserMaster.findAll({
      distinct: true,
      subQuery: false,
      where: {
        companyMasterId: companyMasterID,
        status: 1,
        ...userAccessCondition.where,
      },
      attributes: ['userMasterID', 'displayName'],
      include: [...includedModels, ...userAccessCondition.includeModels],
      order: [['userMasterID', 'ASC']],
    });

    // =====================================================
    // LOOP USERS
    // =====================================================

    for (const user of userData) {
      const obj = user.toJSON();

      const branchID = obj?.emp_branch?.[0]?.branchID;
      const designationID = obj?.emp_desig?.[0]?.designationID;

      if (!branchID || !designationID) continue;

      const branchName = obj?.emp_branch?.[0]?.branchMaster?.branchName || '';

      const designationName =
        obj?.emp_desig?.[0]?.designation?.designationName || '';

      const key = `${branchID}-${designationID}`;

      let existingData = branchDesignationMap.get(key);

      if (!existingData) {
        existingData = {
          Branch: branchName,
          Designation: designationName,
          'Employee Count': 0,
        };
      }

      existingData.Branch = branchName;
      existingData.Designation = designationName;

      existingData['Employee Count'] += 1;

      branchDesignationMap.set(key, existingData);
    }

    // =====================================================
    // TOTAL
    // =====================================================

    const total = {
      'Employee Count': 0,
    };

    branchDesignationMap.forEach((value) => {
      total['Employee Count'] += value['Employee Count'] || 0;
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    const responseData = Array.from(branchDesignationMap.values());

    if (exportData) {
      responseData.push({
        Branch: '',
        Designation: 'Total',
        'Employee Count': total['Employee Count'] || 0,
      });

      return await generateExcel(
        responseData,
        'Branch Designation Wise Employee Count',
        'xlsx',
        res,
      );
    }

    return res.status(200).json({
      status: statusCodes.OK,
      headings,
      data: responseData,
      total,
      totalCount,
    });
  } catch (error) {
    next(error);
  }
};

const getPaginatedBranchDesignationIDs = (
  branches,
  designations,
  limit = 10,
  offset = 0,
  exportData = false,
) => {
  try {
    const branchDesignationMap = new Map();

    const branchMasterIDs = [];

    const designationIDs = [];

    let counter = 0;

    const defaultObj = {
      Branch: '',
      Designation: '',
      'Employee Count': 0,
    };

    for (const branch of branches) {
      for (const designation of designations) {
        if (!exportData) {
          if (counter < offset) {
            counter++;
            continue;
          }

          if (counter >= offset + limit) {
            counter++;
            continue;
          }
        }

        const obj = { ...defaultObj };

        obj.Branch = branch.branchName;

        obj.Designation = designation.designationName;

        const key = `${branch.branchMasterID}-${designation.designationId}`;

        branchDesignationMap.set(key, obj);

        counter++;
      }
    }

    branchDesignationMap.forEach((value, key) => {
      const [bId, dId] = key.split('-');

      branchMasterIDs.push(Number(bId));

      designationIDs.push(Number(dId));
    });

    return {
      branchMasterIDs,
      designationIDs,
      totalCount: branches.length * designations.length,
      branchDesignationMap,
    };
  } catch (error) {
    throw error;
  }
};

exports.employeeAttritionRatio = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchMasterID = [],
      months = 6,
      tillMonth = null,
    } = req.body;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }

    const currentDate = moment().tz('Asia/Kolkata');

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    // =========================================================
    // DATE RANGE
    // =========================================================
    const currentMonth = tillMonth
      ? moment(tillMonth, 'YYYY-MM').tz('Asia/Kolkata').endOf('month')
      : moment().tz('Asia/Kolkata').endOf('month');

    const startMonth = currentMonth
      .clone()
      .subtract(months - 1, 'months')
      .startOf('month');

    const endMonth = currentMonth.clone().endOf('month');

    // =========================================================
    // FETCH ALL EMPLOYEE DATA ONCE
    // =========================================================
    const userIncludeModels = [...userAccessCondition.includeModels];
    if (branchMasterID && branchMasterID.length > 0) {
      userIncludeModels.push({
        required: true,
        model: EmployeeBranch,
        as: 'emp_branch',
        where: {
          branchID: branchMasterID,
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(currentDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(currentDate),
              },
            },
            {
              endDate: {
                [Sequelize.Op.eq]: null,
              },
            },
          ],
        },
        attributes: [],
      });
    }
    const employeeData = await EmployeeJoiningDetails.findAll({
      raw: true,
      attributes: ['userMasterID', 'joiningDate', 'leavingDate'],
      where: {
        joiningDate: {
          [Sequelize.Op.lte]: endMonth.toDate(),
        },
      },
      include: [
        {
          required: true,
          model: UserMaster,
          attributes: [],
          where: {
            companyMasterId: companyMasterID,
            status: [0, 1],
            ...userAccessCondition.where,
          },
          include: userIncludeModels,
        },
      ],
    });

    // =========================================================
    // CURRENT ACTIVE EMPLOYEE
    // =========================================================

    const currentActiveEmployee = await UserMaster.count({
      where: {
        companyMasterId: companyMasterID,
        status: 1,
        ...userAccessCondition.where,
      },
      include: userIncludeModels,
    });

    // =========================================================
    // MONTH WISE CALCULATION
    // =========================================================

    const graphData = [];

    const tempMonth = startMonth.clone();

    while (tempMonth.isSameOrBefore(endMonth, 'month')) {
      const monthStartDate = tempMonth.clone().startOf('month');

      const monthEndDate = tempMonth.clone().endOf('month');

      // =====================================================
      // MONTH START ACTIVE EMPLOYEE
      // =====================================================

      const monthStartEmployee = employeeData.filter((emp) => {
        return (
          moment(emp.joiningDate).isSameOrBefore(monthStartDate, 'day') &&
          (!emp.leavingDate ||
            moment(emp.leavingDate).isSameOrAfter(monthStartDate, 'day'))
        );
      }).length;

      // =====================================================
      // MONTH END ACTIVE EMPLOYEE
      // =====================================================

      const monthEndEmployee = employeeData.filter((emp) => {
        return (
          moment(emp.joiningDate).isSameOrBefore(monthEndDate, 'day') &&
          (!emp.leavingDate ||
            moment(emp.leavingDate).isSameOrAfter(monthEndDate, 'day'))
        );
      }).length;

      // =====================================================
      // JOINED EMPLOYEE
      // =====================================================

      const joinedEmployeeCount = employeeData.filter((emp) => {
        return moment(emp.joiningDate).isBetween(
          monthStartDate,
          monthEndDate,
          'day',
          '[]',
        );
      }).length;

      // =====================================================
      // LEFT EMPLOYEE
      // =====================================================

      const leftEmployeeCount = employeeData.filter((emp) => {
        return (
          emp.leavingDate &&
          moment(emp.leavingDate).isBetween(
            monthStartDate,
            monthEndDate,
            'day',
            '[]',
          )
        );
      }).length;

      // =====================================================
      // ATTRITION RATIO
      // =====================================================

      const averageEmployee = (monthStartEmployee + monthEndEmployee) / 2;

      const attritionRatio =
        averageEmployee > 0
          ? ((leftEmployeeCount / averageEmployee) * 100).toFixed(2)
          : '0.00';

      graphData.push({
        month: monthStartDate.format('MMMM YYYY'),
        activeEmployeeCount: monthEndEmployee,
        averageEmployee: Number(averageEmployee.toFixed(2)),
        joinedEmployeeCount,
        leftEmployeeCount,
        attritionRatio: attritionRatio,
        monthStartEmployee,
        monthEndEmployee,
      });

      tempMonth.add(1, 'month');
    }

    // =========================================================
    // Last MONTH DATA
    // =========================================================

    const lastMonthData = graphData[graphData.length - 1] || {};

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: {
        currentActiveEmployee,
        lastMonthJoinedEmployee: lastMonthData.joinedEmployeeCount || 0,
        lastMonthLeftEmployee: lastMonthData.leftEmployeeCount || 0,
        lastMonthAttritionRatio: lastMonthData.attritionRatio || 0,
        graphData,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.locationDashboard = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchMasterID,
      userMasterID = [],
      page,
      limit,
      exportData,
      attendanceDate,
    } = req.body;
    if (!companyMasterID)
      return res.status(200).json({
        status: 401,
        message: 'Invalid parameters!',
      });
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const finalDate = attendanceDate ? attendanceDate : currentDate;
    const whereDate = new Date(finalDate);

    const condition = {
      companyMasterId: companyMasterID,
      status: 1,
    };
    const paginationQuery = {};

    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = +limit;
    }
    const dateCondition = {
      status: 1,
      applicableDate: { [Sequelize.Op.lte]: whereDate },
      [Sequelize.Op.or]: [
        { endDate: { [Sequelize.Op.gte]: whereDate } },
        { endDate: { [Sequelize.Op.eq]: null } },
      ],
    };
    const order = [['displayName', 'ASC']];

    const start = `${currentDate} 00:00:00.000`;
    const end = `${currentDate} 23:59:59.999`;
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    if (userMasterID && userMasterID.length) {
      condition.userMasterID = userMasterID;
    }
    const { rows: allUsersData, count } = await UserMaster.findAndCountAll({
      distinct: true,
      where: { ...userAccessCondition.where, ...condition },
      attributes: userAttributes,
      ...paginationQuery,
      order,
      include: [
        ...userAccessCondition.includeModels,
        { model: EmployeeJoiningDetails, attributes: ['employeeCode'] },
        {
          required: false,
          model: EmployeeDesignation,
          where: dateCondition,
          attributes: ['designationID', 'applicableDate'],
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
          where: dateCondition,
          attributes: ['departmentID', 'applicableDate'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName'],
            },
          ],
        },
        {
          required: !!branchMasterID,
          model: EmployeeBranch,
          where: {
            ...dateCondition,
            ...(branchMasterID &&
              (!Array.isArray(branchMasterID) || branchMasterID.length) && {
                branchID: branchMasterID,
              }),
          },
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
          model: Tracking,
          where: {
            Track_datetime: {
              [Sequelize.Op.eq]: Sequelize.literal(`(
           SELECT MAX(t2."Track_datetime")
            FROM trackings t2
            WHERE
              t2."userMasterID" = "userMaster"."userMasterID"
              AND t2."Track_datetime" BETWEEN '${start}' AND '${end}'
        )`),
            },
          },
          attributes: [
            'UserTrackingID',
            'userMasterID',
            'Lattitude',
            'Longitude',
            'Address',
            'Track_datetime',
          ],
        },
        {
          required: true,
          model: UserTracking,
          as: 'userTracking',
          where: {
            trackStatus: 1,
          },
          attributes: [],
        },
      ],
      attributes: ['userMasterID', 'displayName', 'userNumber', 'photo'],
    });

    const responseData = allUsersData.map((user) => {
      const joiningDetails = user?.employeeJoiningDetails?.[0] || {};
      const branch = user?.employeeBranches?.[0]?.branchMaster || {};
      const department = user?.employeeDepartments?.[0]?.department || {};
      const designation = user?.employeeDesignations?.[0]?.designation || {};
      return {
        'Employee Code': joiningDetails.employeeCode || '',
        'Employee Name': user?.displayName || '',
        Number: user?.userNumber || '',
        'Branch Name': branch.branchName || '',
        Department: department.departmentName || '',
        Designation: designation.designationName || '',
        tracking: user.trackings?.[0] || null,
        photo: user.photo || null,
      };
    });
    if (exportData) {
      return await generateExcel(excelData, 'Location Dashboard', 'xlsx', res);
    }

    return res.status(200).json({
      status: 200,
      totalcount: count,
      data: responseData,
    });
  } catch (err) {
    next(err);
  }
};
