const { Op, where, Sequelize } = require('sequelize');
const UserMaster = require('../models/userMaster');
const { usermessage } = require('../response_message/message');
const { statusCodes } = require('../utils/commonVars');
const {
  sendBulkNotification,
  getStartAndEndDate,
  daysInMonth,
  month_dict,
  isValidMonth,
  getDatesFromDateRange,
  getFormattedAttendanceTime,
  getAttendanceStatus,
  asiaKolkataDateTime,
  minutesToHoursMinutes,
} = require('../utils/commonUtilFunctions');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const Department = require('../models/department');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const { required } = require('@hapi/joi');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const {
  getUserDetailsByCompany,
  getSalaryDataMap_By_UserIdsAndMonth,
  validateDateRange,
  returnIncludeAndUserAttribute,
  getAllUsersDataMap,
} = require('../utils/thirdPartyApiCommonUtil');
const moment = require('moment');
const attendanceTransaction = require('../models/attendanceTransaction');
const AttendanceLogs = require('../models/attendancelogs');
const BankBranch = require('../models/bankBranch');
const Contractor = require('../models/contractor');
const BankMaster = require('../models/bankMaster');
const userFamily = require('../models/userfamily');
const UserDocument = require('../models/userDocument');
const DocumentList = require('../models/documentList');
const UserEducation = require('../models/userEducation');
const UserExperience = require('../models/userExperience');
const companyMaster = require('../models/companyMaster');

exports.getUserListByCompanyId = async (req, res, next) => {
  try {
    const companyMasterID = req?.company.parentChildCompanyMasterIDs;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.OK,
        message: usermessage.notFoundMessage('Company'),
      });
    }

    const userData = await UserMaster.findAll({
      where: {
        companyMasterId: companyMasterID,
        status: 1,
      },
      attributes: [
        'userMasterID',
        'displayName',
        'userNumber',
        'companyMasterId',
      ],
    });

    return res.status(statusCodes.OK).json({
      status: 200,
      data: userData,
    });
  } catch (error) {
    next(error);
  }
};

exports.sendNotification = async (req, res, next) => {
  try {
    const companyMasterID = req?.company.parentChildCompanyMasterIDs;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('Company'),
      });
    }

    const { title, message, screen, userMasterID } = req.body;

    // Validate required fields
    if (
      !userMasterID ||
      (Array.isArray(userMasterID) && userMasterID.length === 0)
    ) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'UserMasterID is required',
      });
    }

    if (!title || !message) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Title and message are required',
      });
    }

    // Handle both single ID and array of IDs
    const userIdQuery = Array.isArray(userMasterID)
      ? { [Op.in]: userMasterID }
      : userMasterID;

    const userData = await UserMaster.findAll({
      attributes: ['userMasterID', 'firebaseToken', 'deviceType'],
      where: {
        companyMasterId: companyMasterID,
        userMasterID: userIdQuery,
        status: 1,
      },
    });

    const iosTokens = [];
    const androidTokens = [];

    for (const user of userData) {
      const deviceType = user.deviceType;
      const firebaseToken = user.firebaseToken;
      if (firebaseToken) {
        if (deviceType === 'ios') {
          iosTokens.push(firebaseToken);
        } else if (deviceType === 'android') {
          androidTokens.push(firebaseToken);
        }
      }
    }

    const payload = {
      notification: {
        title: title,
        body: message,
      },
      data: {
        screen: screen || '',
      },
    };

    if (iosTokens.length > 0) {
      await sendBulkNotification(iosTokens, payload, 'ios');
    }

    if (androidTokens.length > 0) {
      await sendBulkNotification(androidTokens, payload, 'android');
    }

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Notification sent sucessfully.',
    });
  } catch (error) {
    next(error);
  }
};

function mapUserDetails(user) {
  return {
    'Company': user?.companyMaster?.companyName || '',
    'Employee Code': user.employeeJoiningDetails?.[0]?.employeeCode || '',
    'Employee Name': user.displayName,
    email: user.email,
    'Mobile No': user.userNumber,
    Branch: user.employeeBranches?.[0]?.branchMaster?.branchName || '',
    Department: user.employeeDepartments?.[0]?.department?.departmentName || '',
    Designation:
      user.employeeDesignations?.[0]?.designation?.designationName || '',
    Division: user.employeeDivisions?.[0]?.division?.divisionName || '',
    'Working Area':
      user.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName || '',
  };
}

exports.getSalaryDataByCompanyAndMonth = async (req, res, next) => {
  try {
    const companyMasterID = req?.company?.parentChildCompanyMasterIDs;
    const { month } = req.query;

    // ==============================
    // Validation
    // ==============================

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('Company'),
      });
    }

    if (!month) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.requiredMessage(' month'),
      });
    }

    if (!isValidMonth(month)) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.passValidValidParameter(' month'),
      });
    }

    const currentMonth = moment().format('YYYYMM');

    if (+month > +currentMonth) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Invalid month. Future month is not allowed.',
      });
    }

    // ==============================
    // Date calculations
    // ==============================

    const { startDate, endDate } = getStartAndEndDate(+month);

    const monthStr = String(month);
    const year = monthStr.slice(0, 4);
    const Month = monthStr.slice(4, 6);

    const startdate = `${year}-${Month}-01`;

    const enddate = `${year}-${Month}-${daysInMonth(Month, year)}`;

    const monthName = `${month_dict[Month]}-${year}`;

    // ==============================
    // Common where condition
    // ==============================

    const commonDateCondition = {
      status: 1,
      [Op.or]: [
        { endDate: { [Op.gte]: new Date(endDate) } },
        { endDate: { [Op.eq]: null } },
      ],
    };

    // ==============================
    // Include Models
    // ==============================

    const includeModels = [
      {
        model: companyMaster,
        attributes: ['companyName']
      },
      // Joining
      {
        model: EmployeeJoiningDetails,
        where: {
          joiningDate: {
            [Op.lte]: endDate,
          },
          [Op.or]: [
            {
              leavingDate: {
                [Op.gte]: startDate,
              },
            },
            {
              leavingDate: {
                [Op.is]: null,
              },
            },
          ],
        },
        attributes: ['employeeCode', 'joiningDate', 'leavingDate'],
      },

      // Designation
      {
        model: EmployeeDesignation,
        required: false,
        where: {
          ...commonDateCondition,
          applicableDate: {
            [Op.lte]: new Date(endDate),
          },
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

      // Department
      {
        model: EmployeeDepartment,
        required: false,
        where: {
          ...commonDateCondition,
          applicableDate: {
            [Op.lte]: new Date(endDate),
          },
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

      // Branch
      {
        model: EmployeeBranch,
        required: false,
        where: {
          ...commonDateCondition,
          applicableDate: {
            [Op.lte]: new Date(endDate),
          },
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

      // Division
      {
        model: EmployeeDivision,
        required: false,
        where: {
          ...commonDateCondition,
          startDate: {
            [Op.lte]: new Date(endDate),
          },
        },
        attributes: ['divisionId'],
        include: [
          {
            model: Division,
            attributes: ['divisionName'],
          },
        ],
      },

      // Working Area
      {
        model: EmployeeWorkingArea,
        required: false,
        where: {
          ...commonDateCondition,
          startDate: {
            [Op.lte]: new Date(endDate),
          },
        },
        attributes: ['workingAreaId'],
        include: [
          {
            model: WorkingArea,
            attributes: ['workingAreaName'],
          },
        ],
      },

      // Attendance Calc
      {
        required: false,
        model: HrLeaveMonthlyTrans,
        where: {
          AttnYearMon: month,
        },
        attributes: ['monthstartdate', 'monthenddate'],
        limit: 1,
      },
    ];

    // ==============================
    // Chunk Processing Configuration
    // ==============================

    const CHUNK_SIZE = 200;
    const finalData = [];
    let offset = 0;
    let hasMoreData = true;

    // Process employees in chunks of 300
    while (hasMoreData) {
      // ==============================
      // Fetch Employee Chunk
      // ==============================

      const userList = await UserMaster.findAll({
        where: {
          companyMasterId: companyMasterID,
          status: [0, 1],
        },
        include: includeModels,
        attributes: ['displayName', 'userNumber', 'userMasterID'],
        order: [['displayName']],
        limit: CHUNK_SIZE,
        offset: offset,
      });

      // Check if we have more data
      if (!userList.length) {
        hasMoreData = false;
        break;
      }

      // Update offset for next iteration
      offset += CHUNK_SIZE;

      // If we got less than CHUNK_SIZE, this is the last chunk
      if (userList.length < CHUNK_SIZE) {
        hasMoreData = false;
      }

      // ==============================
      // Get User IDs for Salary Data
      // ==============================

      const userMasterIDs = userList.map((e) => e.userMasterID);

      // ==============================
      // Get Salary Data for Current Chunk
      // ==============================

      const { salaryTransactionMap } =
        await getSalaryDataMap_By_UserIdsAndMonth({
          userMasterIDs,
          month,
        });

      // ==============================
      // Process Users in Current Chunk
      // ==============================

      for (const user of userList) {
        const joining = user.employeeJoiningDetails?.[0];

        if (!joining) continue;

        const userMasterID = +user.userMasterID;

        const attnCal = user.hrLeaveMonthlyTrans?.[0];

        const attnCal_startDate = attnCal?.monthstartdate || startdate;

        const attnCal_endDate = attnCal?.monthenddate || enddate;

        const joiningDate = joining.joiningDate;

        const leavingDate = joining.leavingDate || null;

        // Skip if outside attendance cycle
        if (
          joiningDate > attnCal_endDate ||
          (leavingDate && leavingDate < attnCal_startDate)
        ) {
          continue;
        }

        const salary = salaryTransactionMap.get(userMasterID);

        finalData.push({
          ...mapUserDetails(user),

          'Salary Month': monthName,

          'Employee Earnings': salary
            ? [...salary.earning, ...salary.extraEarning]
            : [],

          Gross: salary?.gross?.[0]?.EmployeeSalaryAmount || 0,

          'Employee Deductions': salary?.employeeDeduction || [],

          'Net Salary': salary?.netPay?.[0]?.EmployeeSalaryAmount || 0,

          'Employer Deductions': salary?.employerDeduction || [],

          CTC: salary?.ctc?.[0]?.EmployeeSalaryAmount || 0,
        });
      }
    }

    // ==============================
    // Final Response
    // ==============================

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: finalData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAttendanceDataByCompanyAndDateRange = async (req, res, next) => {
  try {
    const companyMasterID = req?.company?.parentChildCompanyMasterIDs;
    const { StartDate, EndDate } = req.query;

    // ==============================
    // Validation
    // ==============================

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('Company'),
      });
    }

    // Validate date range using common utility function (max 93 days)
    const dateValidation = validateDateRange(StartDate, EndDate, false, 93);

    if (!dateValidation.isValid) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: dateValidation.message,
      });
    }

    // ==============================
    // Pre-calculate dates outside loop
    // ==============================

    const endDateObj = new Date(EndDate);
    const allDates = await getDatesFromDateRange(
      new Date(StartDate),
      new Date(EndDate),
    );

    // ==============================
    // Common where condition
    // ==============================

    const commonDateCondition = {
      status: 1,
      [Op.or]: [
        { endDate: { [Op.gte]: endDateObj } },
        { endDate: { [Op.eq]: null } },
      ],
    };

    // ==============================
    // Include Models
    // ==============================

    const includeModels = [
            {
        model: companyMaster,
        attributes: ['companyName']
      },
      // Joining
      {
        model: EmployeeJoiningDetails,
        where: {
          joiningDate: {
            [Op.lte]: EndDate,
          },
          [Op.or]: [
            {
              leavingDate: {
                [Op.gte]: StartDate,
              },
            },
            {
              leavingDate: {
                [Op.is]: null,
              },
            },
          ],
        },
        attributes: ['employeeCode', 'joiningDate', 'leavingDate'],
      },

      // Designation
      {
        model: EmployeeDesignation,
        required: false,
        where: {
          ...commonDateCondition,
          applicableDate: {
            [Op.lte]: endDateObj,
          },
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

      // Department
      {
        model: EmployeeDepartment,
        required: false,
        where: {
          ...commonDateCondition,
          applicableDate: {
            [Op.lte]: endDateObj,
          },
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

      // Branch
      {
        model: EmployeeBranch,
        required: false,
        where: {
          ...commonDateCondition,
          applicableDate: {
            [Op.lte]: endDateObj,
          },
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

      // Division
      {
        model: EmployeeDivision,
        required: false,
        where: {
          ...commonDateCondition,
          startDate: {
            [Op.lte]: endDateObj,
          },
        },
        attributes: ['divisionId'],
        include: [
          {
            model: Division,
            attributes: ['divisionName'],
          },
        ],
      },

      // Working Area
      {
        model: EmployeeWorkingArea,
        required: false,
        where: {
          ...commonDateCondition,
          startDate: {
            [Op.lte]: endDateObj,
          },
        },
        attributes: ['workingAreaId'],
        include: [
          {
            model: WorkingArea,
            attributes: ['workingAreaName'],
          },
        ],
      },

      // Attendance transaction
      {
        required: false,
        model: attendanceTransaction,
        where: {
          AttendanceDate: {
            [Op.between]: [StartDate, EndDate],
          },
        },
        include: [
          {
            model: AttendanceLogs,
            attributes: ['logDateTime', 'direction', 'attendnaceFrom'],
          },
        ],
        attributes: [
          'AttendanceDate',
          'InDatetime',
          'OutDateTime',
          'fulldayhalfday',
          'roundOffMinutes',
        ],
      },
    ];

    // ==============================
    // Chunk Processing Configuration
    // ==============================

    const CHUNK_SIZE = 200;
    const finalData = [];
    let offset = 0;
    let hasMoreData = true;

    // Process employees in chunks
    while (hasMoreData) {
      // ==============================
      // Fetch Employee Chunk
      // ==============================

      const userList = await UserMaster.findAll({
        where: {
          companyMasterId: companyMasterID,
          status: [0, 1],
        },
        include: includeModels,
        attributes: ['displayName', 'userNumber', 'userMasterID', 'email'],
        order: [['displayName']],
        limit: CHUNK_SIZE,
        offset: offset,
      });

      // Check if we have more data
      if (!userList.length) {
        hasMoreData = false;
        break;
      }

      // Update offset for next iteration
      offset += CHUNK_SIZE;

      // If we got less than CHUNK_SIZE, this is the last chunk
      if (userList.length < CHUNK_SIZE) {
        hasMoreData = false;
      }

      // ==============================
      // Process Users in Current Chunk
      // ==============================

      for (const user of userList) {
        const joining = user.employeeJoiningDetails?.[0];

        if (!joining) continue;

        const joiningDate = joining.joiningDate;
        const leavingDate = joining.leavingDate || null;

        // Skip if outside attendance cycle
        if (joiningDate > EndDate || (leavingDate && leavingDate < StartDate)) {
          continue;
        }

        // Determine effective date range based on joining and leaving dates
        let effectiveStartDate = StartDate;
        let effectiveEndDate = EndDate;

        if (joiningDate && joiningDate > StartDate) {
          effectiveStartDate = joiningDate;
        }

        if (leavingDate && leavingDate < EndDate) {
          effectiveEndDate = leavingDate;
        }

        // Build user object
        const obj = {
          ...mapUserDetails(user),
          'Attendance Data': [],
        };

        // Build attendance transaction map
        const attendanceData = user.attendanceTransactions || [];
        const transactionMap = new Map();

        for (const attendance of attendanceData) {
          transactionMap.set(attendance.AttendanceDate, attendance);
        }

        // Process only dates within employee's joining and leaving range
        for (const dates of allDates) {
          const date = moment(dates).format('YYYY-MM-DD');

          // Skip dates outside employee's effective date range
          if (date < effectiveStartDate || date > effectiveEndDate) {
            continue;
          }

          const attn = transactionMap.get(date);
          const logs = attn?.attendancelogs || [];
          const workingHrs = minutesToHoursMinutes(+attn?.roundOffMinutes || 0);

          const attendanceRecord = {
            'Attendance Date': date,
            'PunchIn Time': getFormattedAttendanceTime(attn?.InDatetime) || '',
            'PunchOut Time':
              getFormattedAttendanceTime(attn?.OutDateTime) || '',
            'Attendance Status':
              getAttendanceStatus(attn?.fulldayhalfday) || 'A',
            'Working Hours': workingHrs,
            'Attendance Logs': [],
          };

          if (logs.length) {
            const sortedLogs = logs.sort(
              (a, b) => a.logDateTime - b.logDateTime,
            );
            attendanceRecord['Attendance Logs'] = sortedLogs.map((log) => ({
              'Log Date Time': getFormattedAttendanceTime(log.logDateTime),
              Direction: log.direction,
              'Log From': log.attendnaceFrom,
            }));
          }

          obj['Attendance Data'].push(attendanceRecord);
        }

        finalData.push(obj);
      }
    }

    // ==============================
    // Final Response (JSON)
    // ==============================

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: finalData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllUsersByCompany = async (req, res, next) => {
  try {
    const companyMasterID = req?.company?.parentChildCompanyMasterIDs;
    const { limit, page, status } = req.query;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('Company'),
      });
    }

    if (!limit || !page) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.requiredMessage('Limit and Page'),
      });
    }

    let statusArray = [];

    if (status?.length) {
      statusArray = status[0].split(',');

      const validStatuses = ['0', '1'];

      const isValid =
        statusArray.length <= 2 &&
        statusArray.every((item) => validStatuses.includes(item));

      if (!isValid) {
        return res.status(statusCodes.BAD_REQUEST).json({
          status: statusCodes.BAD_REQUEST,
          message: 'Only valid status values are 0, 1, or 0,1',
        });
      }
    }

    const condition = {
      companyMasterId: companyMasterID,
    };

    if (statusArray.length) {
      condition.status = {
        [Sequelize.Op.in]: statusArray.map(Number),
      };
    } else {
      condition.status = 1;
    }

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const { includes, userAttributes } = returnIncludeAndUserAttribute();

    const { rows: allUser, count } = await UserMaster.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      attributes: userAttributes,
      include: includes,
      order: [['displayName', 'ASC']],
    });

    if (allUser.length == 0) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        data: [],
      });
    }

    const finalData = getAllUsersDataMap(allUser);

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      totalRecords: count,
      currentPage: Number(page),
      totalPages: Math.ceil(count / limit),
      data: finalData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserByMobileNumber = async (req, res, next) => {
  try {
    const companyMasterID = req?.company?.parentChildCompanyMasterIDs;
    const { mobileNumber } = req.query;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('Company'),
      });
    }

    if (!mobileNumber) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('User Mobile Number'),
      });
    }

    const condition = {
      companyMasterId: companyMasterID,
      userNumber: mobileNumber,
      status: [0, 1],
    };

    const { includes, userAttributes } = returnIncludeAndUserAttribute();

    const allUser = await UserMaster.findOne({
      where: condition,
      attributes: userAttributes,
      include: includes,
      order: [['displayName', 'ASC']],
    });

    if (!allUser) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        message: usermessage.notFoundMessage('User'),
      });
    }

    const finalData = getAllUsersDataMap([allUser]);

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: finalData?.[0] || {},
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserByEmployeeCode = async (req, res, next) => {
  try {
    const companyMasterID = req?.company?.parentChildCompanyMasterIDs;
    const { employeeCode } = req.query;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('Company'),
      });
    }

    if (!employeeCode) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('Employee Code'),
      });
    }

    const condition = {
      companyMasterId: companyMasterID,
      status: [0, 1],
    };

    const { includes, userAttributes } =
      returnIncludeAndUserAttribute(employeeCode);

    const allUser = await UserMaster.findOne({
      where: condition,
      attributes: userAttributes,
      include: includes,
    });

    if (!allUser) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        message: usermessage.notFoundMessage('User'),
      });
    }

    const finalData = getAllUsersDataMap([allUser]);

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: finalData?.[0] || {},
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsersFamilyDetailsByUserMasterID = async (req, res, next) => {
  try {
    const companyMasterID = req?.company?.parentChildCompanyMasterIDs;
    const { userMasterID } = req.query;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('Company'),
      });
    }

    if (!userMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('userMasterID'),
      });
    }

    const condition = {
      companyMasterId: companyMasterID,
      status: [0, 1],
      userMasterID: userMasterID,
    };

    const user = await UserMaster.findOne({
      where: condition,
      attributes: ['displayName', 'userNumber', 'userMasterID'],
      include: [
        {
          model: userFamily,
          where: {
            status: {
              [Sequelize.Op.in]: [0, 1],
            },
          },
          attributes: [
            'memberName',
            'dob',
            'gender',
            'relation',
            'contact',
            'status',
            'verifyStatus',
            'verifyBy',
            'nominee',
            'percentForNominee',
            'aadhaarNumber',
            'aadhaarFront',
            'aadhaarBack',
            'rejectionRemarks',
          ],
          include: [
            {
              model: UserMaster,
              as: 'verifiedBy',
              attributes: ['displayName', 'userNumber'],
            },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        message: usermessage.notFoundMessage('User'),
      });
    }

    const finalData = {
      userNumber: user.userNumber,
      displayName: user.displayName,
      userMasterID: user.userMasterID,
      familyDetails:
        user?.userFamilies?.map((fd) => ({
          memberName: fd.memberName,
          verifyStatus: fd?.verifyStatus,
          verifyBy: fd?.verifyBy
            ? {
                name: fd?.verifiedBy?.displayName,
                userNumber: fd?.verifiedBy?.userNumber,
              }
            : null,
          dob: fd?.dob,
          gender: fd?.gender,
          relation: fd?.relation,
          contact: fd?.contact,
          // status: fd?.status,
          nominee: fd?.nominee,
          rejectionRemarks: fd?.rejectionRemarks,
          percentForNominee: fd?.percentForNominee,
          aadhaarNumber: fd?.aadhaarNumber,
          aadhaarFront: fd?.aadhaarFront
            ? process.env.APIURL + fd?.aadhaarFront
            : null,
          aadhaarBack: fd?.aadhaarBack
            ? process.env.APIURL + fd?.aadhaarBack
            : null,
        })) || [],
    };

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: finalData || {},
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsersDocumentByUserMasterID = async (req, res, next) => {
  try {
    const companyMasterID = req?.company?.parentChildCompanyMasterIDs;
    const { userMasterID } = req.query;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('Company'),
      });
    }

    if (!userMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('userMasterID'),
      });
    }

    const condition = {
      companyMasterId: companyMasterID,
      status: [0, 1],
      userMasterID: userMasterID,
    };

    const user = await UserMaster.findOne({
      where: condition,
      attributes: ['displayName', 'userNumber', 'userMasterID'],
      include: [
        {
          model: UserDocument,
          where: {
            status: {
              [Sequelize.Op.in]: [0, 1],
            },
          },
          attributes: [
            'document',
            'verifyStatus',
            'verifyBy',
            'documentNumber',
            'nameOnDocument',
            'expiryDate',
            'isMultiPageAadharCard',
            'document1',
            'rejectionRemarks',
          ],
          include: [
            { model: DocumentList, attributes: ['documentName'] },
            {
              model: UserMaster,
              as: 'docVerifiedBy',
              attributes: ['displayName', 'userNumber'],
            },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        message: usermessage.notFoundMessage('User'),
      });
    }

    const finalData = {
      userNumber: user.userNumber,
      displayName: user.displayName,
      userMasterID: user.userMasterID,
      userDocuments:
        user?.userDocuments?.map((doc) => ({
          documentFront: doc?.document
            ? `${process.env.APIURL}uploads/user/document/${doc?.document}`
            : null,
          verifyStatus: doc?.verifyStatus,
          verifyBy: doc?.verifyBy
            ? {
                name: doc?.docVerifiedBy?.displayName,
                userNumber: doc?.docVerifiedBy?.userNumber,
              }
            : null,
          documentNumber: doc?.documentNumber,
          nameOnDocument: doc?.nameOnDocument,
          expiryDate: doc?.expiryDate,
          isMultiPageDoc: doc?.isMultiPageAadharCard,
          documentBack: doc?.document1
            ? `${process.env.APIURL}uploads/user/document/${doc?.document1}`
            : null,
          documentName: doc?.documentList?.documentName,
          rejectionRemarks: doc?.rejectionRemarks,
        })) || [],
    };

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: finalData || {},
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsersEducationByUserMasterID = async (req, res, next) => {
  try {
    const companyMasterID = req?.company?.parentChildCompanyMasterIDs;
    const { userMasterID } = req.query;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('Company'),
      });
    }

    if (!userMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('userMasterID'),
      });
    }

    const condition = {
      companyMasterId: companyMasterID,
      status: [0, 1],
      userMasterID: userMasterID,
    };

    const user = await UserMaster.findOne({
      where: condition,
      attributes: ['displayName', 'userNumber', 'userMasterID'],
      include: [
        {
          model: UserEducation,
          where: { status: [0, 1] },
          attributes: [
            'qualification',
            'yearOfPassing',
            'grade',
            'percentageObtained',
            'institute',
            'university',
            'verifyStatus',
            'verifyBy',
            'rejectionRemarks',
            'degree',
          ],
          include: [
            {
              model: UserMaster,
              as: 'eduVerifiedBy',
              attributes: ['displayName', 'userNumber'],
            },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        message: usermessage.notFoundMessage('User'),
      });
    }

    const finalData = {
      userNumber: user.userNumber,
      displayName: user.displayName,
      userMasterID: user.userMasterID,
      userEducation:
        user?.userEducations?.map((edu) => ({
          qualification: edu?.qualification,
          yearOfPassing: edu?.yearOfPassing,
          verifyBy: edu?.verifyBy
            ? {
                name: edu?.eduVerifiedBy?.displayName,
                userNumber: edu?.eduVerifiedBy?.userNumber,
              }
            : null,
          grade: edu?.grade,
          percentageObtained: edu?.percentageObtained,
          institute: edu?.institute,
          university: edu?.university,
          verifyStatus: edu?.verifyStatus,
          rejectionRemarks: edu?.rejectionRemarks,
          degree: edu?.degree
            ? `${process.env.APIURL}uploads/user/degree/${edu?.degree}`
            : null,
        })) || [],
    };

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: finalData || {},
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsersExperienceByUserMasterID = async (req, res, next) => {
  try {
    const companyMasterID = req?.company?.parentChildCompanyMasterIDs;
    const { userMasterID } = req.query;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('Company'),
      });
    }

    if (!userMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.notFoundMessage('userMasterID'),
      });
    }

    const condition = {
      companyMasterId: companyMasterID,
      status: [0, 1],
      userMasterID: userMasterID,
    };

    const user = await UserMaster.findOne({
      where: condition,
      attributes: ['displayName', 'userNumber', 'userMasterID'],
      include: [
        {
          model: UserExperience,
          where: { status: [0, 1] },
          attributes: [
            'designation',
            'fromDate',
            'toDate',
            'organization',
            'roleRespo',
            'verifyStatus',
            'verifyBy',
            'rejectionRemarks',
          ],
          include: [
            {
              model: UserMaster,
              as: 'expVerifiedBy',
              attributes: ['displayName', 'userNumber'],
            },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        message: usermessage.notFoundMessage('User'),
      });
    }

    const finalData = {
      userNumber: user.userNumber,
      displayName: user.displayName,
      userMasterID: user.userMasterID,
      userExperience:
        user?.userExperiences?.map((exp) => ({
          designation: exp?.designation,
          fromDate: exp?.fromDate,
          verifyBy: exp?.verifyBy
            ? {
                name: exp?.expVerifiedBy?.displayName,
                userNumber: exp?.expVerifiedBy?.userNumber,
              }
            : null,
          toDate: exp?.toDate,
          organization: exp?.organization,
          roleAndResponsebilities: exp?.roleRespo,
          rejectionRemarks: exp?.rejectionRemarks,
          verifyStatus: exp?.verifyStatus,
        })) || [],
    };

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: finalData || {},
    });
  } catch (error) {
    next(error);
  }
};
