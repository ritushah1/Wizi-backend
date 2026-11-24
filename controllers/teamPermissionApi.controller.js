const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const {
  asiaKolkataDateTime,
  manualAttendnace_Latest,
  getTrackingDateWiseData,
  getUserAndDateWiseTrackingKms,
  isCompanyWithServiceExpense,
  getAllTeamMembers,
  formatYearMonth,
  parseYearMonth,
  getCoffBalanceData,
  consumeLeaveBalance,
  employeeeLeaveBalance,
} = require('../utils/commonUtilFunctions');
const { dailyAttendanceData } = require('./monthwiseCalender.controller');
const { generateExcel, generateExcelForVehicleMeterDetails } = require('../utils/exportData');
const {
  APICallFrom,
  distanceCalculationMethodENUM,
  leaveOperationENUM,
  chekLeaveBalanceFromEnum,
} = require('../utils/dbUtils');
const UserMaster = require('../models/userMaster');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const message = require('../response_message/message');
const UserExpenseTransaction = require('../models/userExpenseTransaction');
const UserExpense = require('../models/userExpense');
const { getUserDateWiseServiceVisitData } = require('./mehtaService.contoller');
const Visit = require('../models/visit');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const HrLeaveBalance = require('../models/hrLeaveBalance');
const UserLeaveTransaction = require('../models/userLeaveTransaction');
const UserLeave = require('../models/userleave');
const UserLeaveLapse = require('../models/userLeaveLapse');
const LeaveEncashment = require('../models/leaveEncashment');
const ExcelJS = require('exceljs');
const empLeavePolicy = require('../models/empLeavePolicy');
const employeeLeavePolicy = require('../models/employeeLeavePolicy');
const moment = require('moment');
const path = require('path');
const UsedCoffTransaction = require('../models/usedCoffTransaction');
const fs = require('fs');
const { userAttributes } = require('../utils/commonVars');
const companyMaster = require('../models/companyMaster');
const vehicleUsage = require('../models/vehicleUsage');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');

exports.teamDailyAttendance = async (req, res, next) => {
  try {
    const { userMasterID, calendarstartdate, calendarenddate, exportData } =
      await req.body;

    if (!userMasterID || !calendarstartdate || !calendarenddate)
      return res.status(200).json({
        status: 401,
        message: 'Invalid parameters!',
        data: [],
      });

    const { attendanceData, summaryData, exportedData } =
      await dailyAttendanceData(
        userMasterID,
        calendarstartdate,
        calendarenddate,
        exportData,
        req.userDetails,
        APICallFrom.TEAM,
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
  } catch (error) {
    next(error);
  }
};

exports.addTeamManualAttendance = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { attendanceType, finaldataarray, companyMasterID } = await req.body;

    if (finaldataarray.length === 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Attendance Data is required!',
      });
    }

    const companyData = await companyMaster.findOne({
      where: {
        companyMasterID
      },
      attributes: ['isAttRemarkRequired'],
      transaction,
    });

    if(companyData.isAttRemarkRequired && !finaldataarray?.[0]?.remarks){
      await transaction.rollback();
      return res.status(200).json({ status: 401, message: 'Attendance Correction Remark is Required!' });
    }

    // const companyid = companyMasterID;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    const responseMesage = await manualAttendnace_Latest(
      req,
      attendanceType,
      finaldataarray,
      companyMasterID,
      createBy,
      createByIp,
      transaction,
    );

    await transaction.commit();

    return res.status(200).json(responseMesage);
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
function calcCrow(lat1, lon1, lat2, lon2) {
  const p = Math.PI / 180; // 0.017453292519943295
  const c = Math.cos;
  const a =
    0.5 -
    c((lat2 - lat1) * p) / 2 +
    (c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))) / 2;
  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R (R=6371 km)
}
exports.getTeamUserTrackingInfoById = async (req, res, next) => {
  try {
    const { userMasterID, date } = req.body;

    if (!userMasterID || !date)
      return res
        .status(200)
        .json({ status: 401, message: 'Invalid parameters!', data: [] });
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const checkOpenSourceDistence = [
      distanceCalculationMethodENUM.OSRM,
      distanceCalculationMethodENUM.BOTH,
    ].includes(req.userDetails?.trackingRouteAPI);
    const checkHaversineDistence = [
      distanceCalculationMethodENUM.HAVERSINE,
      distanceCalculationMethodENUM.BOTH,
    ].includes(req.userDetails?.trackingRouteAPI);
    const findUserData = await UserMaster.findOne({
      where: {
        userMasterID: userMasterID,
        status: [0, 1],
      },
      include: [
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
      ],
    });
    if (!findUserData) {
      return res.status(200).json({
        status: 200,
        message: message.usermessage.notFoundMessage('user'),
        data: [],
      });
    }
    let [trackingData, trackingKMs, getVisitData, totalDateWiseExpenseAmount] =
      await Promise.all([
        getTrackingDateWiseData(date, userMasterID),
        getUserAndDateWiseTrackingKms(userMasterID, date),
        Visit.count({
          where: {
            visitDate: date,
            assignID: userMasterID,
            status: 1,
          },
        }),
        UserExpenseTransaction.findOne({
          where: {
            [Sequelize.Op.and]: [
              { '$userExpense.userMasterID$': userMasterID },
              Sequelize.where(
                sequelize.fn('date', sequelize.col('expense_date')),
                '=',
                date,
              ),
            ],
          },
          attributes: [
            [
              sequelize.fn('sum', sequelize.col('expenseAmount')),
              'total_amount',
            ],
          ],
          include: [
            {
              model: UserExpense,
              as: 'userExpense',
              attributes: ['userMasterID'],
            },
          ],
          group: ['userExpense.userMasterID'],
          raw: true,
        }),
      ]);

    const kmData = [];
    const finalTracking = [];
    let lat = null;
    let long = null;
    let totalKilometers = 0;
    let totalOpenSourceKiloMeters = 0;
    for (const item of trackingData) {
      finalTracking.push({
        address:
          item.Address && item.Address !== 'not found'
            ? item.Address
            : 'not found',
        time: item.Track_datetime,
        type: item.type,
        battery: item.Battery,
        gps: item.Gps,
        wifi: item.Wifi,
        developerMode: item.developerMode,
        mobile_name: item.Mobile_name,
        geofence: item.geofence,
        accuracy: item.accuracy,
        batteryOptimization: item.batteryOptimization,
        batterySaver: item.batterySaver,
      });

      // skip invalid coordinates
      if (
        !item.Lattitude ||
        !item.Longitude ||
        item.Lattitude === 'not found' ||
        item.Longitude === 'not found'
      ) {
        continue;
      }

      if (!lat || !long) {
        lat = item.Lattitude;
        long = item.Longitude;
        // ✅ push first valid point
        kmData.push(item);
        continue;
      }

      const lat1 = parseFloat(lat);
      const lon1 = parseFloat(long);
      const lat2 = parseFloat(item.Lattitude);
      const lon2 = parseFloat(item.Longitude);

      const kms = calcCrow(lat1, lon1, lat2, lon2) || 0;

      const isPunchType = [
        'punchin',
        'checkin',
        'checkout',
        'punchout',
        'login',
        'logout',
        'pluggedin',
        'pluggedout',
        'servicecheckin',
        'servicecheckout',
        'autocheckin',
        'autocheckout',
      ].includes(item.type);

      if (isPunchType) {
        kmData.push(item);
      }

      if (kms > 0.085) {
        totalKilometers += kms;
        lat = item.Lattitude;
        long = item.Longitude;
        const itemIndex = kmData?.findIndex(
          (x) => +x?.UserTrackingID === +item?.UserTrackingID,
        );
        if (itemIndex == -1) kmData.push(item);
      }
    }

    if (trackingKMs) {
      totalKilometers = trackingKMs.kilometer || 0;
      totalOpenSourceKiloMeters = trackingKMs.osr_Km || 0;
    }
    const showServiceCount = isCompanyWithServiceExpense(
      +findUserData.companyMasterId,
    );
    let totalServiceVisits = 0;
    if (showServiceCount) {
      const responseObj = await getUserDateWiseServiceVisitData({
        userMasterID,
        date,
      });
      totalServiceVisits = responseObj?.totalServiceVisits || 0;
    }
    const finalResponseObj = {
      tracking: kmData,
      trackingPoints: finalTracking,
      trackingKM: totalKilometers?.toFixed(2),
      trackingOpenSourceKM: totalOpenSourceKiloMeters?.toFixed(2),
      user: findUserData.displayName,
      firstName: findUserData.firstName,
      lastName: findUserData.lastName,
      photo: findUserData.photo,
      department:
        findUserData?.employeeDepartments?.[0]?.department?.departmentName ||
        '',
      designation:
        findUserData?.employeeDesignations?.[0]?.designation?.designationName ||
        '',
      totalVisit: getVisitData,
      totalExpense:
        totalDateWiseExpenseAmount == null
          ? 0
          : totalDateWiseExpenseAmount.total_amount,
      showOpenSourceDistance: checkOpenSourceDistence,
      showHarversineDistance: checkHaversineDistence,
      showServiceCount,
      totalServiceVisits,
    };

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Tracking'),
      data: finalResponseObj,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllUserLeavesBalanceData = async (req, res, next) => {
  try {
    const { page, limit, userMasterID, companyMasterID, exportData } =
      await req.body;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const condition = { status: 1, companyMasterId: companyMasterID };

    const order = [['displayName', 'ASC']];

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    let allowedUserIds = userMasterID;
    if (!userMasterID || userMasterID.length === 0) {
      allowedUserIds = await getAllTeamMembers(
        req.userDetails.userMasterId,
        req.userDetails.companyMasterId,
        null,
        currentDate,
        6,
      );

      allowedUserIds = allowedUserIds
        .filter((e) => e.userMasterID != req.userDetails.userMasterId)
        .map((user) => user.userMasterID);
    }

    condition.userMasterID = allowedUserIds;

    const { rows: allUserData, count: totalCount } =
      await UserMaster.findAndCountAll({
        distinct: true,
        where: { ...where, ...condition },
        ...paginationQuery,
        attributes: userAttributes,
        order,
        include: [
          ...includeModels,
          {
            required: false,
            model: EmployeeDesignation,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
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
              applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
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
              applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
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
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
          {
            required: false,
            model: companyMaster,
            attributes: ['companyMasterID', 'companyName'],
          },
          {
            required: false,
            model: empLeavePolicy,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            attributes: ['employeeLeavePolicyID'],
          },
        ],
      });

    const allUserIDs =
      userMasterID && userMasterID.length
        ? userMasterID
        : allUserData.map((e) => e.userMasterID);

    const hrleavetypeCondition = {
      companyMasterID: +companyMasterID,
      status: 1,
      Leave_Allow: 'Y',
      LeaveID: { [Sequelize.Op.notIn]: [5, 18, 25] },
    };

    const groupBy = [
      'userMasterID',
      'hrLeaveType.LeaveTranId',
      'hrLeaveType.LeaveMaster.LeaveName',
      'hrLeaveType.LeaveMaster.LeaveDesc',
      'hrLeaveType.LeaveID',
    ];

    const attributes = [
      [Sequelize.col('userMasterID'), 'userMasterID'],
      [Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'), 'leaveName'],
      [Sequelize.col('hrLeaveType.LeaveMaster.LeaveDesc'), 'LeaveDesc'],
      [Sequelize.col('hrLeaveType.LeaveTranId'), 'LeaveTranId'],
      [Sequelize.col('hrLeaveType.LeaveID'), 'LeaveID'],
    ];

    const [leaveTypeData, userLapseleave, userLeaveEncashment] =
      await Promise.all([
        // leaveTypeData
        HrLeaveTypes.findAll({
          raw: true,
          where: hrleavetypeCondition,
          include: [
            {
              model: HrLeaveMaster,
              as: 'LeaveMaster',
              attributes: ['LeaveName', 'LeaveDesc'],
            },
          ],
        }),

        // UserLeaveLapse
        UserLeaveLapse.findAll({
          raw: true,
          where: {
            userMasterID: allUserIDs,
          },
          include: [
            {
              model: HrLeaveTypes,
              attributes: [],
              where: hrleavetypeCondition,
              include: {
                model: HrLeaveMaster,
                as: 'LeaveMaster',
                attributes: [],
              },
            },
          ],
          group: groupBy,
          attributes: [
            ...attributes,

            [
              Sequelize.literal(
                'coalesce(sum(cast("LapseDays" as numeric)),0)',
              ),
              'totalDays',
            ],
          ],
        }),

        // userLeaveEncashment
        LeaveEncashment.findAll({
          raw: true,
          where: {
            userMasterID: allUserIDs,
            status: 1,
          },
          include: [
            {
              model: HrLeaveTypes,
              attributes: [],
              where: hrleavetypeCondition,
              include: {
                model: HrLeaveMaster,
                as: 'LeaveMaster',
                attributes: [],
              },
            },
          ],
          group: groupBy,
          attributes: [
            ...attributes,

            [
              Sequelize.literal('coalesce(sum(cast("days" as numeric)),0)'),
              'totalDays',
            ],
          ],
        }),
      ]);

    const userWiseAllData = [];
    for (const user of allUserData) {
      const userWiseLeaveLapse = userLapseleave.filter(
        (e) => e.userMasterID == user.userMasterID,
      );
      const userWiseLeaveEncashment = userLeaveEncashment.filter(
        (e) => e.userMasterID == user.userMasterID,
      );

      const employeeLeavePolicy = user.empLeavePolicies?.[0] || null;

      const userBalance = await employeeeLeaveBalance(
        user.companyMasterId,
        user.userMasterID,
        leaveTypeData,
        userWiseLeaveLapse,
        userWiseLeaveEncashment,
        currentDate,
        employeeLeavePolicy,
        chekLeaveBalanceFromEnum.ADMIN,
      );

      const leaveBalanceMap = userBalance.reduce((acc, item) => {
        acc[item.leaveName] = item.Balance;
        return acc;
      }, {});

      const userLeaveData = {
        userMasterID: user.userMasterID,
        'Company Name': user.companyMaster.companyName,
        'Branch Name':
          user.employeeBranches?.[0]?.branchMaster?.branchName || '-',
        'Department Name':
          user.employeeDepartments?.[0]?.department?.departmentName || '-',
        'Designation Name':
          user.employeeDesignations?.[0]?.designation?.designationName || '-',
        'Employee Code': user.employeeJoiningDetails?.[0]?.employeeCode || '-',
        'Employee Name': user.displayName,
        'Employee Number': user.userNumber,
        ...leaveBalanceMap,
      };
      if (exportData) {
        delete userLeaveData.userMasterID;
      }
      userWiseAllData.push(userLeaveData);
    }

    if (exportData) {
      return await generateExcel(
        userWiseAllData,
        'Leave Count Data',
        'xlsx',
        res,
      );
    }
    return res.status(200).json({
      status: 200,
      totalCount,
      data: userWiseAllData,
    });
  } catch (err) {
    next(err);
  }
};

exports.downloadDemoExcelImportLeaveBalance = async (req, res, next) => {
  try {
    const {
      LeaveTranId,
      operationType,
      yearMonth,
      userMasterID = [],
      companyMasterID,
      payrollFrequency,
    } = req.body;

    if (!companyMasterID || !LeaveTranId || !operationType || !yearMonth) {
      return res.status(400).json({
        status: 400,
        message: 'Required data missing',
      });
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const MAX_LEVEL = 6;

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    let allowedUserIds = userMasterID;
    if (!userMasterID || userMasterID.length === 0) {
      allowedUserIds = await getAllTeamMembers(
        req.userDetails.userMasterId,
        req.userDetails.companyMasterId,
        null,
        filterDate,
        MAX_LEVEL,
      );

      allowedUserIds = allowedUserIds
        .filter((e) => e.userMasterID != req.userDetails.userMasterId)
        .map((user) => user.userMasterID);
    }

    const users = await UserMaster.findAll({
      order: [['displayName', 'ASC']],
      distinct: true,
      attributes: ['displayName', 'userNumber', 'userMasterID'],
      where: {
        ...where,
        userMasterID: { [Sequelize.Op.in]: allowedUserIds },
        status: 1,
        companyMasterId: companyMasterID,
      },
      include: [
        ...includeModels,
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
          required: false,
          model: EmployeeBranch,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
          model: EmployeeJoiningDetails,
          attributes: ['employeeCode', 'employment'],
        },
      ],
    });

    const userIds = users.map((u) => u.userMasterID);

    let userBalanceMap = new Map();

    if (userIds.length > 0) {
      userBalanceMap = await bulkEmployeeLeaveBalance(companyMasterID, userIds);
    }

    const leaveTypes = await HrLeaveTypes.findAll({
      where: {
        companyMasterID,
        LeaveTranId: { [Sequelize.Op.in]: LeaveTranId },
        status: 1,
      },
      attributes: ['LeaveTranId'],
      include: [
        {
          model: HrLeaveMaster,
          as: 'LeaveMaster',
          attributes: ['LeaveName'],
          where: { status: 1 },
        },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leave Balance');

    // Define Columns
    worksheet.columns = [
      { header: 'Employee Code', key: 'employeeCode', width: 18 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Number', key: 'number', width: 18 },
      { header: 'Branch', key: 'branch', width: 18 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'Designation', key: 'designation', width: 18 },
      { header: 'Employeement Type', key: 'employeement', width: 18 },
      { header: 'Operation Type', key: 'operationType', width: 20 },
      { header: 'Month Year', key: 'yearMonth', width: 15 },
      ...leaveTypes.flatMap((lt) => [
        {
          header: `Available (${lt.LeaveMaster.LeaveName})`,
          key: `available_${lt.LeaveMaster.LeaveName}`,
          width: 20,
        },
        {
          header: lt.LeaveMaster.LeaveName,
          key: lt.LeaveMaster.LeaveName,
          width: 18,
        },
      ]),
    ];

    // Freeze panes
    worksheet.views = [
      {
        state: 'frozen',
        xSplit: 2, // freeze first 4 columns
        ySplit: 1, // freeze header row
      },
    ];

    const headerRow = worksheet.getRow(1);

    // Increase header height
    headerRow.height = 20;

    // Header styling
    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' }, // white text
      };

      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }, // blue
      };

      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Add Rows
    users.forEach((user) => {
      const rowData = {
        employeeCode: user?.employeeJoiningDetails?.[0]?.employeeCode,
        name: user.displayName,
        number: user.userNumber,
        branch: user?.employeeBranches?.[0]?.branchMaster.branchName,
        department: user?.employeeDepartments?.[0]?.department?.departmentName,
        designation:
          user?.employeeDesignations?.[0]?.designation?.designationName,
        employeement: user?.employeeJoiningDetails?.[0]?.employment || '',
        operationType,
        yearMonth: formatYearMonth(yearMonth),
      };

      const userBalances = userBalanceMap.get(user.userMasterID) || [];

      // Convert array → Map for O(1) lookup
      const balanceMap = new Map(
        userBalances.map((b) => [
          b.leaveName, // small l
          b.Balance, // capital B
        ]),
      );

      leaveTypes.forEach((lt) => {
        const leaveName = lt.LeaveMaster.LeaveName;

        const availableBalance = balanceMap.get(leaveName) || 0;

        rowData[`available_${leaveName}`] = availableBalance;
        rowData[leaveName] = null;
      });

      worksheet.addRow(rowData);
    });

    // Send Response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Import_Leave_Balance.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

async function bulkEmployeeLeaveBalance(
  companyId,
  userIds, // Array of user IDs
  balanceDate = asiaKolkataDateTime(new Date()).slice(0, 10),
) {
  if (!userIds || userIds.length === 0) return new Map();
  if (!balanceDate) balanceDate = asiaKolkataDateTime(new Date()).slice(0, 10);

  const hrleavetypeCondition = {
    companyMasterID: +companyId,
    status: 1,
    Leave_Allow: 'Y',
    LeaveID: { [Sequelize.Op.notIn]: [5, 18, 25] },
  };

  const groupBy = [
    'userMasterID',
    'hrLeaveType.LeaveTranId',
    'hrLeaveType.LeaveMaster.LeaveName',
    'hrLeaveType.LeaveMaster.LeaveDesc',
    'hrLeaveType.LeaveID',
  ];

  const attributes = [
    [Sequelize.col('userMasterID'), 'userMasterID'],
    [Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'), 'leaveName'],
    [Sequelize.col('hrLeaveType.LeaveMaster.LeaveDesc'), 'LeaveDesc'],
    [Sequelize.col('hrLeaveType.LeaveTranId'), 'LeaveTranId'],
    [Sequelize.col('hrLeaveType.LeaveID'), 'LeaveID'],
  ];

  // Get all leave types
  const leaveType = await HrLeaveTypes.findAll({
    raw: true,
    where: hrleavetypeCondition,
    include: [
      {
        model: HrLeaveMaster,
        as: 'LeaveMaster',
        attributes: ['LeaveName', 'LeaveDesc'],
      },
    ],
  });

  // Get all user lapse leaves in one query
  const userLapseleave = await UserLeaveLapse.findAll({
    raw: true,
    where: {
      userMasterID: { [Sequelize.Op.in]: userIds },
    },
    include: [
      {
        model: HrLeaveTypes,
        attributes: [],
        where: hrleavetypeCondition,
        include: {
          model: HrLeaveMaster,
          as: 'LeaveMaster',
          attributes: [],
        },
      },
    ],
    group: groupBy,
    attributes: [
      ...attributes,
      [
        Sequelize.literal('coalesce(sum(cast("LapseDays" as numeric)),0)'),
        'totalDays',
      ],
    ],
  });

  // Get all user encashment leaves in one query
  const userEncashLeave = await LeaveEncashment.findAll({
    raw: true,
    where: {
      userMasterID: { [Sequelize.Op.in]: userIds },
      status: 1,
    },
    include: [
      {
        model: HrLeaveTypes,
        attributes: [],
        where: hrleavetypeCondition,
        include: {
          model: HrLeaveMaster,
          as: 'LeaveMaster',
          attributes: [],
        },
      },
    ],
    group: groupBy,
    attributes: [
      ...attributes,
      [
        Sequelize.literal('coalesce(sum(cast("days" as numeric)),0)'),
        'totalDays',
      ],
    ],
  });

  // Get all COFF balances for all users
  const allCoffBalances = await HrLeaveBalance.findAll({
    raw: true,
    where: {
      userMasterID: { [Sequelize.Op.in]: userIds },
      availBal: { [Sequelize.Op.gt]: 0 },
      [Sequelize.Op.or]: [
        { expiryDate: { [Sequelize.Op.gte]: balanceDate } },
        { expiryDate: { [Sequelize.Op.is]: null } },
      ],
    },
    include: [
      {
        required: true,
        model: HrLeaveTypes,
        where: { LeaveID: 6, status: 1 },
        attributes: [],
        include: {
          model: HrLeaveMaster,
          as: 'LeaveMaster',
          attributes: [],
        },
      },
    ],
    attributes: [
      'LeaveBalTranId',
      'availBal',
      'expiryDate',
      [Sequelize.col('userMasterID'), 'userMasterID'],
      [Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'), 'leaveName'],
      [Sequelize.col('hrLeaveType.LeaveMaster.LeaveDesc'), 'LeaveDesc'],
      [Sequelize.col('hrLeaveType.LeaveTranId'), 'LeaveTranId'],
      [Sequelize.col('hrLeaveType.LeaveID'), 'LeaveID'],
    ],
  });

  // Get all add balances and used balances for all users
  const [addBalances, usedBalances] = await Promise.all([
    HrLeaveBalance.findAll({
      raw: true,
      where: { userMasterID: { [Sequelize.Op.in]: userIds } },
      include: [
        {
          model: HrLeaveTypes,
          attributes: [],
          where: hrleavetypeCondition,
          include: {
            model: HrLeaveMaster,
            as: 'LeaveMaster',
            attributes: [],
          },
        },
      ],
      group: groupBy,
      attributes: [
        ...attributes,
        [
          Sequelize.literal(
            'coalesce(sum(cast("LeaveAddNew" as numeric)),0)+coalesce(sum("OPBal"),0)',
          ),
          'totalDays',
        ],
      ],
    }),
    UserLeaveTransaction.findAll({
      raw: true,
      where: { status: 1 },
      include: [
        {
          model: UserLeave,
          where: { userMasterID: { [Sequelize.Op.in]: userIds } },
          attributes: [],
        },
        {
          model: HrLeaveTypes,
          where: hrleavetypeCondition,
          include: [
            { model: HrLeaveMaster, as: 'LeaveMaster', attributes: [] },
          ],
          attributes: [],
        },
      ],
      group: groupBy,
      attributes: [
        ...attributes,
        [
          Sequelize.fn('SUM', Sequelize.literal('COALESCE("days", 0)')),
          'totalDays',
        ],
      ],
    }),
  ]);

  // Process results for each user
  const userBalanceMap = new Map();

  userIds.forEach((userId) => {
    const finalAddBalance = [];
    const finalUsedBalance = [];

    for (const data of leaveType) {
      // Handle COFF separately
      if (data.LeaveID == 6) {
        const coffBals = allCoffBalances.filter(
          (c) => c.userMasterID == userId,
        );
        const totalDays = coffBals.reduce((acc, obj) => acc + +obj.availBal, 0);

        finalAddBalance.push({
          userMasterID: userId,
          leaveName: data['LeaveMaster.LeaveName'],
          LeaveDesc: data['LeaveMaster.LeaveDesc'],
          LeaveTranId: data.LeaveTranId,
          LeaveID: data.LeaveID,
          totalDays,
        });
      } else {
        const addBal = addBalances.find(
          (ab) =>
            ab.userMasterID == userId && ab.LeaveTranId == data.LeaveTranId,
        );
        const usedBal = usedBalances.find(
          (ub) =>
            ub.userMasterID == userId && ub.LeaveTranId == data.LeaveTranId,
        );

        if (addBal) finalAddBalance.push(addBal);
        if (usedBal) finalUsedBalance.push(usedBal);

        if (!addBal) {
          finalAddBalance.push({
            userMasterID: userId,
            leaveName: data['LeaveMaster.LeaveName'],
            LeaveDesc: data['LeaveMaster.LeaveDesc'],
            LeaveTranId: data.LeaveTranId,
            LeaveID: data.LeaveID,
            totalDays: 0,
          });
        }
        if (!usedBal) {
          finalUsedBalance.push({
            userMasterID: userId,
            leaveName: data['LeaveMaster.LeaveName'],
            LeaveDesc: data['LeaveMaster.LeaveDesc'],
            LeaveTranId: data.LeaveTranId,
            LeaveID: data.LeaveID,
            totalDays: 0,
          });
        }
      }
    }

    const usedLeaveTotalDaysMap = Object.fromEntries(
      finalUsedBalance.map((item) => [
        item.LeaveTranId,
        parseFloat(item.totalDays),
      ]),
    );

    const userLapseForUser = userLapseleave.filter(
      (ul) => ul.userMasterID == userId,
    );
    const userEncashForUser = userEncashLeave.filter(
      (ue) => ue.userMasterID == userId,
    );

    const finalBalance = finalAddBalance.map((item) => {
      const usedLeaveValue = usedLeaveTotalDaysMap[item.LeaveTranId] || 0;

      const lapsleave =
        item.LeaveID == 6
          ? 0
          : userLapseForUser.find((e) => e.LeaveTranId == item.LeaveTranId);

      const encashleave =
        item.LeaveID == 6
          ? 0
          : userEncashForUser.find((e) => e.LeaveTranId == item.LeaveTranId);

      const calculatedTotalDays =
        +item.totalDays -
        +usedLeaveValue -
        (lapsleave ? +lapsleave.totalDays : 0) -
        (encashleave ? +encashleave.totalDays : 0);

      const formattedTotalDays = calculatedTotalDays
        ? Number.isInteger(calculatedTotalDays)
          ? +calculatedTotalDays.toFixed(0)
          : +calculatedTotalDays % 1 === 0.2
            ? +calculatedTotalDays.toFixed(1)
            : +calculatedTotalDays.toFixed(2)
        : 0;

      const { totalDays, ...rest } = item;

      return {
        ...rest,
        Balance: formattedTotalDays == -0 ? 0 : formattedTotalDays,
      };
    });

    userBalanceMap.set(userId, finalBalance);
  });

  return userBalanceMap;
}

exports.validateExcelImportLeaveBalance = async (req, res, next) => {
  try {
    const { companyMasterID, page = 1, limit = 20 } = req.body;
    const filePath = req.file.path;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    // =========================
    // READ ORIGINAL HEADERS
    // =========================
    const headers = [];
    worksheet.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value).trim());
    });

    const fixedColumns = [
      'Number',
      'Name',
      'Operation Type',
      'Month Year',
      'Employee Code',
      'Branch',
      'Department',
      'Designation',
      'Employeement Type',
    ];

    const availableColumns = headers.filter(
      (h) => typeof h === 'string' && h.startsWith('Available ('),
    );

    const leaveHeaders = headers.filter(
      (h) => !fixedColumns.includes(h) && !availableColumns.includes(h),
    );

    // =========================
    // OPERATION TYPE
    // =========================
    const operationTypeColIndex = headers.indexOf('Operation Type') + 1;
    const firstDataRow = worksheet.getRow(2);
    const operationType = firstDataRow.getCell(operationTypeColIndex).value;

    if (
      !operationType ||
      ![
        leaveOperationENUM.Lapse,
        leaveOperationENUM.Encashment,
        leaveOperationENUM.AddLeaveBalance,
      ].includes(operationType)
    ) {
      return res.status(400).json({
        message: 'Invalid or missing operation type in first data row.',
      });
    }

    // =========================
    // VALIDATE LEAVE HEADERS
    // =========================
    const companyLeaveTypes = await getAllHrLeaveTypes(companyMasterID);

    const validLeaveSet = new Set(
      companyLeaveTypes.map((l) => l.LeaveMaster.LeaveName.trim()),
    );

    const leaveTypeMap = new Map(
      companyLeaveTypes.map((lt) => [
        lt.LeaveMaster.LeaveName.trim(),
        {
          LeaveTranId: lt.LeaveTranId,
          LeaveID: lt.LeaveID,
          LeaveName: lt.LeaveMaster.LeaveName,
        },
      ]),
    );

    const validLeaveHeaders = [];
    const invalidLeaveColumns = [];

    leaveHeaders.forEach((h) => {
      validLeaveSet.has(h)
        ? validLeaveHeaders.push(h)
        : invalidLeaveColumns.push(h);
    });

    // =========================
    // FETCH USERS
    // =========================
    const numberColIndex = headers.indexOf('Number') + 1;
    const uniqueUserNumbers = new Set();

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const mobile = String(row.getCell(numberColIndex).value || '');
      if (mobile) uniqueUserNumbers.add(mobile);
    }

    const date = moment().format('YYYY-MM-DD');

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });

    const users = await UserMaster.findAll({
      where: {
        ...where,
        companyMasterId: companyMasterID,
        userNumber: { [Sequelize.Op.in]: Array.from(uniqueUserNumbers) },
        status: 1,
      },
      attributes: ['userMasterID', 'userNumber'],
      include: [
        ...includeModels,
        {
          required: false,
          model: empLeavePolicy,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['employeeLeavePolicyID'],
        },
      ],
    });

    const MAX_LEVEL = 6;

    const accessibleUserData = await getAllTeamMembers(
      req.userDetails.userMasterId,
      null,
      null,
      date,
      MAX_LEVEL,
    );
    const allowedUsersNumber = accessibleUserData.map(
      (user) => user.userNumber,
    );

    const userSet = new Set(users.map((u) => String(u.userNumber)));
    const allowedSet = new Set(allowedUsersNumber.map(String));

    const unauthorizedNumbers = users
      .map((u) => String(u.userNumber))
      .filter((userNumber) => !allowedSet.has(userNumber));

    if (unauthorizedNumbers.length > 0) {
      return res.status(400).json({
        status: 400,
        message: 'You are not authorized to access some users in the file.',
        unauthorizedNumbers,
      });
    }

    const userMap = new Map(
      users.map((u) => [String(u.userNumber), u.userMasterID]),
    );

    let empLeavePolicyMap = null;
    let employeeLeaveIds = [];
    let allLeavePolicy = [];

    if (operationType == leaveOperationENUM.Encashment) {
      empLeavePolicyMap = new Map(
        users.map((u) => [
          String(u.userMasterID),
          u.empLeavePolicies?.[0]?.employeeLeavePolicyID,
        ]),
      );

      employeeLeaveIds = users.flatMap(
        (e) => e.empLeavePolicies?.[0]?.employeeLeavePolicyID,
      );

      allLeavePolicy = await employeeLeavePolicy.findAll({
        where: {
          id: {
            [Sequelize.Op.in]: employeeLeaveIds,
          },
          leaveEncashmentAtFNF: true,
        },
        attributes: ['id', 'leaveId', 'leaveEncashmentAtFNF'],
        include: [{ model: HrLeaveMaster, attributes: ['LeaveName'] }],
      });
    }

    // =========================
    // BULK BALANCE FETCH
    // =========================
    let userBalanceMap = new Map();

    if (
      operationType === leaveOperationENUM.Lapse ||
      operationType === leaveOperationENUM.Encashment
    ) {
      const userIds = users.map((u) => u.userMasterID);
      if (userIds.length > 0) {
        userBalanceMap = await bulkEmployeeLeaveBalance(
          companyMasterID,
          userIds,
        );
      }
    }

    // =========================
    // CREATE OUTPUT WORKBOOK
    // =========================
    const currentYearMonth = moment().format('YYYYMM');
    const previousYearMonth = moment().subtract(1, 'month').format('YYYYMM');
    const outWorkbook = new ExcelJS.Workbook();
    const outSheet = outWorkbook.addWorksheet('Validated');

    const finalHeaders = ['_uuid', ...headers, 'remark'];

    outSheet.columns = finalHeaders.map((h) => ({
      header: h,
      key: h,
      width: 18,
    }));

    outSheet.getColumn(1).hidden = true;

    const parsedRows = [];

    // 🔥 TRACKING STRUCTURES
    const invalidRowSet = new Set(); // Unique invalid rows
    const invalidColumnRowMap = new Map(); // Column -> Set of row numbers
    const seenNumbers = new Map();
    // =========================
    // PROCESS ROWS
    // =========================
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rowUUID = crypto.randomUUID();
      const rowData = { _uuid: rowUUID };
      const remarks = [];

      headers.forEach((header, index) => {
        rowData[header] = row.getCell(index + 1).value;
      });

      const mobile = String(rowData.Number || '');
      const userMasterID = userMap.get(mobile);

      const yearMonth = parseYearMonth(rowData['Month Year']);
      rowData['Month Year'] = yearMonth;

      // =========================
      // NUMBER / DUPLICATE CHECK
      // =========================
      if (!mobile) {
        remarks.push('User not found');
        invalidRowSet.add(rowNumber - 1);
      } else if (!userSet.has(mobile)) {
        remarks.push('User not found');
        invalidRowSet.add(rowNumber - 1);
      }

      if (mobile) {
        if (seenNumbers.has(mobile)) {
          remarks.push(
            `Duplicate number (already exists at row ${seenNumbers.get(mobile)})`,
          );
          invalidRowSet.add(rowNumber - 1);
        } else {
          seenNumbers.set(mobile, rowNumber - 1);
        }
      }

      if (yearMonth && !/^\d{6}$/.test(yearMonth)) {
        remarks.push('Invalid yearMonth format');
        invalidRowSet.add(rowNumber - 1);
      }

      // =========================
      // NUMERIC VALIDATION
      // =========================
      validLeaveHeaders.forEach((leaveHeader) => {
        const value = rowData[leaveHeader];

        if (value !== null && value !== undefined && value !== '') {
          if (operationType == leaveOperationENUM.Encashment) {
            const userLeavePolicyIds =
              empLeavePolicyMap.get(String(userMasterID)) || [];

            const canEncashLeave = allLeavePolicy.find(
              (item) =>
                userLeavePolicyIds.includes(+item.id) &&
                leaveHeader == item.hrLeaveMaster?.LeaveName,
            );

            if (canEncashLeave) {
              remarks.push(
                `Leave encashment for '${canEncashLeave.hrLeaveMaster?.LeaveName}' is allowed only during Full & Final (FNF) settlement.`,
              );
              invalidRowSet.add(rowNumber - 1);
            }
          }

          const numValue = Number(value);

          if (isNaN(numValue) || numValue <= 0) {
            // ✅ Row-level remark (keep this)
            remarks.push(`${leaveHeader} value invalid`);

            // ✅ Track row as invalid
            invalidRowSet.add(rowNumber - 1);

            // ✅ Track column-wise invalid rows
            if (!invalidColumnRowMap.has(leaveHeader)) {
              invalidColumnRowMap.set(leaveHeader, new Set());
            }
            invalidColumnRowMap.get(leaveHeader).add(rowNumber - 1);

            rowData[leaveHeader] = '';
          }
        }
      });

      // =========================
      // BUSINESS VALIDATION
      // =========================
      if (userMasterID && yearMonth && /^\d{6}$/.test(yearMonth)) {
        const operationRemarks = validateLeaveOperation({
          operationType,
          userBalanceMap,
          userMasterID,
          yearMonth,
          leaveHeaders: validLeaveHeaders,
          rowData,
          leaveTypeMap,
          currentYearMonth,
          previousYearMonth,
        });

        if (operationRemarks.length > 0) {
          remarks.push(...operationRemarks);
          invalidRowSet.add(rowNumber - 1);
        }
      }

      rowData.remark = remarks.length ? remarks.join(', ') : 'Valid';

      outSheet.addRow(rowData);
      parsedRows.push(rowData);
    }

    // =========================
    // BUILD COLUMN-WISE REMARKS
    // =========================
    invalidColumnRowMap.forEach((rowSet, leaveHeader) => {
      const rows = Array.from(rowSet).sort((a, b) => a - b);
      const rowString = rows.join(', ');
      invalidLeaveColumns.push(
        `${leaveHeader} value invalid at rows: ${rowString}`,
      );
    });

    const savePath = path.join(
      'uploads/validated',
      `leave_validation_${Date.now()}.xlsx`,
    );

    await outWorkbook.xlsx.writeFile(savePath);

    // =========================
    // RESPONSE
    // =========================
    res.json({
      validatedExcelPath: savePath,
      operationType,
      headers: finalHeaders,
      totalRecords: parsedRows.length,
      page: Number(page),
      limit: Number(limit),
      data: parsedRows.slice((page - 1) * limit, page * limit),
      invalidLeaveColumns,
      availableColumns,
      invalidUserRowNumbers: Array.from(invalidRowSet).sort((a, b) => a - b),
      summary: {
        totalRows: parsedRows.length,
        invalidUserCount: invalidRowSet.size,
        hasErrors: invalidRowSet.size > 0 || invalidLeaveColumns.length > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

async function getAllHrLeaveTypes(companyMasterID) {
  const allLeaveTypes = await HrLeaveTypes.findAll({
    where: { companyMasterID, status: 1 },
    include: [
      {
        model: HrLeaveMaster,
        as: 'LeaveMaster',
        attributes: ['LeaveName', 'LeaveDesc', 'LeaveID'],
        where: { status: 1 },
      },
    ],
  });

  return allLeaveTypes;
}

function validateLeaveOperation({
  operationType,
  userBalanceMap,
  userMasterID,
  yearMonth,
  leaveHeaders,
  rowData,
  leaveTypeMap,
  currentYearMonth,
  previousYearMonth,
}) {
  switch (operationType) {
    case leaveOperationENUM.Encashment:
      return validateBulkEncashment(
        userBalanceMap,
        userMasterID,
        yearMonth,
        leaveHeaders,
        rowData,
        leaveTypeMap,
        currentYearMonth,
        previousYearMonth,
      );

    case leaveOperationENUM.Lapse:
      return validateBulkLapse(
        userBalanceMap,
        userMasterID,
        yearMonth,
        leaveHeaders,
        rowData,
        leaveTypeMap,
        currentYearMonth,
      );

    case leaveOperationENUM.AddLeaveBalance:
      return validateBulkAddLeaveBalance(
        yearMonth,
        leaveHeaders,
        rowData,
        currentYearMonth,
      );

    default:
      return [`Unsupported operation type: ${operationType}`];
  }
}

function validateBulkEncashment(
  userBalanceMap,
  userMasterID,
  yearMonth,
  leaveHeaders,
  rowData,
  leaveTypeMap,
  currentYearMonth,
  previousYearMonth,
) {
  const remarks = [];

  const userBalance = userBalanceMap.get(userMasterID) || [];

  for (const leaveHeader of leaveHeaders) {
    const balance = rowData[leaveHeader];

    if (!balance || balance === '' || balance === 0) continue;

    const leaveInfo = leaveTypeMap.get(leaveHeader);
    if (!leaveInfo) continue;

    const numValue = Number(balance);
    if (isNaN(numValue) || numValue < 0) continue;

    const findLeave = userBalance.find(
      (e) => e.LeaveTranId === leaveInfo.LeaveTranId,
    );

    if (!findLeave) {
      remarks.push(`${leaveHeader}: Leave type not found for user`);
      continue;
    }

    if (findLeave.Balance < numValue) {
      remarks.push(
        `${leaveHeader}: Insufficient balance (Available: ${findLeave.Balance}, Required: ${numValue})`,
      );
    }
  }

  return remarks;
}

function validateBulkLapse(
  userBalanceMap,
  userMasterID,
  yearMonth,
  leaveHeaders,
  rowData,
  leaveTypeMap,
  currentYearMonth,
) {
  const remarks = [];

  if (yearMonth !== currentYearMonth) {
    remarks.push('Month must be current month');
    return remarks;
  }

  const userBalance = userBalanceMap.get(userMasterID) || [];

  for (const leaveHeader of leaveHeaders) {
    const balance = rowData[leaveHeader];

    if (!balance || balance === '' || balance === 0) continue;

    const leaveInfo = leaveTypeMap.get(leaveHeader);
    if (!leaveInfo) continue;

    const numValue = Number(balance);
    if (isNaN(numValue) || numValue < 0) continue;

    const findLeave = userBalance.find(
      (e) => e.LeaveTranId === leaveInfo.LeaveTranId,
    );

    if (!findLeave) {
      remarks.push(`${leaveHeader}: Leave type not found for user`);
      continue;
    }

    if (findLeave.Balance < numValue) {
      remarks.push(
        `${leaveHeader}: Insufficient balance (Available: ${findLeave.Balance}, Required: ${numValue})`,
      );
    }
  }

  return remarks;
}

function validateBulkAddLeaveBalance(
  yearMonth,
  leaveHeaders,
  rowData,
  currentYearMonth,
) {
  const remarks = [];

  if (yearMonth > currentYearMonth) {
    remarks.push('Month must be previous months or current month');
    return remarks;
  }

  for (const leaveHeader of leaveHeaders) {
    const balance = rowData[leaveHeader];

    if (!balance || balance === '' || balance === 0) continue;

    const numValue = Number(balance);
    if (isNaN(numValue)) {
      remarks.push(`${leaveHeader} value is invalid`);
    } else if (numValue < 0) {
      remarks.push(`${leaveHeader} value cannot be negative`);
    }
  }

  return remarks;
}

exports.saveExcelImportLeaveBalance = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      validatedExcelPath,
      companyMasterID,
      startDate,
      endDate,
      payrollFrequency,
    } = req.body;
    const bulkLeaveEncashment = [];
    const bulkUserLeaveLapse = [];
    const bulkHrLeaveBalance = [];
    if (!validatedExcelPath || !companyMasterID) {
      await transaction.rollback();
      return res.status(400).json({
        status: 400,
        message: 'Validated excel path and companyMasterID required',
      });
    }

    // Read Validated Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(validatedExcelPath);

    const sheet = workbook.getWorksheet('Validated');
    if (!sheet) {
      await transaction.rollback();
      return res.status(400).json({
        status: 400,
        message: 'Validated sheet not found',
      });
    }

    // Read Headers
    const headers = [];
    sheet.getRow(1).eachCell((cell) => {
      headers.push(String(cell.value).trim());
    });

    const fixedColumns = [
      '_uuid',
      'Number',
      'Name',
      'Operation Type',
      'Month Year',
      'Branch',
      'Employee Code',
      'Department',
      'Designation',
      'remark',
      'Employeement Type',
    ];

    const leaveHeaders = headers.filter(
      (h) =>
        !fixedColumns.includes(h) &&
        typeof h === 'string' &&
        !h.startsWith('Available ('),
    );

    // Get operation type from first data row
    const operationTypeColIndex = headers.indexOf('Operation Type') + 1;
    const firstDataRow = sheet.getRow(2);
    const operationType = firstDataRow.getCell(operationTypeColIndex).value;

    // Build LeaveName → LeaveInfo Map
    const leaveTypes = await getAllHrLeaveTypes(companyMasterID);

    const leaveNameToInfoMap = new Map();
    leaveTypes.forEach((lt) => {
      leaveNameToInfoMap.set(lt.LeaveMaster.LeaveName.trim(), {
        LeaveTranId: lt.LeaveTranId,
        LeaveID: lt.LeaveID,
      });
    });

    // Get all unique user numbers from excel
    const numberColIndex = headers.indexOf('Number') + 1;
    const uniqueUserNumbers = new Set();

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      const remark = row.getCell(headers.indexOf('remark') + 1).value;

      // Only process valid rows
      if (remark === 'Valid') {
        const mobile = String(row.getCell(numberColIndex).value || '');
        if (mobile) {
          uniqueUserNumbers.add(mobile);
        }
      }
    }

    const date = asiaKolkataDateTime(new Date()).slice(0, 10);

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });

    // Fetch users that are in the Excel
    const users = await UserMaster.findAll({
      where: {
        ...where,
        companyMasterId: companyMasterID,
        userNumber: { [Sequelize.Op.in]: Array.from(uniqueUserNumbers) },
        status: [0, 1],
      },
      attributes: ['userMasterID', 'userNumber'],
      include: [
        ...includeModels,
        {
          required: false,
          model: empLeavePolicy,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['employeeLeavePolicyID'],
        },
      ],
    });

    const MAX_LEVEL = 6;

    const accessibleUserData = await getAllTeamMembers(
      req.userDetails.userMasterId,
      null,
      null,
      date,
      MAX_LEVEL,
    );
    const allowedUsersNumber = accessibleUserData.map(
      (user) => user.userNumber,
    );

    const userSet = new Set(users.map((u) => String(u.userNumber)));
    const allowedSet = new Set(allowedUsersNumber.map(String));

    const unauthorizedNumbers = users
      .map((u) => String(u.userNumber))
      .filter((userNumber) => !allowedSet.has(userNumber));

    if (unauthorizedNumbers.length > 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'You are not authorized to access some users in the file.',
        unauthorizedNumbers,
      });
    }

    const userNumberToIdMap = new Map(
      users.map((u) => [String(u.userNumber), u.userMasterID]),
    );

    let empLeavePolicyMap = null;
    let employeeLeaveIds = [];
    let allLeavePolicy = [];

    if (operationType == leaveOperationENUM.Encashment) {
      empLeavePolicyMap = new Map(
        users.map((u) => [
          String(u.userMasterID),
          u.empLeavePolicies?.[0]?.employeeLeavePolicyID,
        ]),
      );

      employeeLeaveIds = users.flatMap(
        (e) => e.empLeavePolicies?.[0]?.employeeLeavePolicyID,
      );

      allLeavePolicy = await employeeLeavePolicy.findAll({
        where: {
          id: {
            [Sequelize.Op.in]: employeeLeaveIds,
          },
          leaveEncashmentAtFNF: true,
        },
        attributes: ['id', 'leaveId', 'leaveEncashmentAtFNF'],
        include: [{ model: HrLeaveMaster, attributes: ['LeaveName'] }],
      });
    }

    // Counters
    let savedRowCount = 0;
    let savedLeaveCount = 0;

    // Process each row
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);

      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row.getCell(index + 1).value;
      });

      // Skip invalid rows
      if (rowData.remark !== 'Valid') continue;

      const userNumber = String(rowData.Number || '');
      const yearMonth = String(rowData['Month Year'] || '');
      const userMasterID = userNumberToIdMap.get(userNumber);

      if (!userMasterID) continue; // safety check

      // Process each leave type column
      for (const leaveName of leaveHeaders) {
        const balance = Number(rowData[leaveName]);

        if (!balance || balance <= 0) continue;

        const leaveInfo = leaveNameToInfoMap.get(leaveName);
        if (!leaveInfo) continue;

        const { LeaveTranId, LeaveID } = leaveInfo;

        if (operationType == leaveOperationENUM.Encashment) {
          const userLeavePolicyIds =
            empLeavePolicyMap.get(String(userMasterID)) || [];

          const canEncashLeave = allLeavePolicy.find(
            (item) =>
              userLeavePolicyIds.includes(+item.id) &&
              leaveName == item.hrLeaveMaster?.LeaveName,
          );

          if (canEncashLeave) {
            continue;
          }
        }

        // Get COFF balance data if needed (only for Lapse/Encashment)
        let allCoffBalanceData =
          LeaveID == 6 && operationType !== leaveOperationENUM.AddLeaveBalance
            ? await getCoffBalanceData(userMasterID, date)
            : [];
        let usedLogTransactions = [];

        // Process based on operation type
        if (operationType === leaveOperationENUM.AddLeaveBalance) {
          // Add Leave Balance
          bulkHrLeaveBalance.push({
            LeaveTranId,
            userMasterID,
            YearMM: yearMonth,
            LeaveAddNew: balance,
            availBal: balance,
            createBy: req.userDetails.userMasterId,
            createByIp: req.userDetails.userIpAddress,
          });

          savedLeaveCount++;
        } else if (operationType === leaveOperationENUM.Lapse) {
          // Lapse Leave

          bulkUserLeaveLapse.push({
            userMasterID,
            LeaveTranId,
            LapseDays: balance,
            LapseYearMonth: yearMonth,
            status: 1,
            createBy: req.userDetails.userMasterId,
            createByIp: req.userDetails.userIpAddress,
          });

          // Handle COFF
          if (allCoffBalanceData.length > 0) {
            const { allBalanceData, usedTransactionLog } = consumeLeaveBalance(
              allCoffBalanceData,
              balance,
              date,
              CoffUsedTypeEnum.LAPSE,
            );

            allCoffBalanceData = [...allBalanceData];
            usedLogTransactions = [...usedTransactionLog];
          }

          savedLeaveCount++;
        } else if (operationType === leaveOperationENUM.Encashment) {
          // Encash Leave

          bulkLeaveEncashment.push({
            userMasterID,
            LeaveTranId,
            YYYYMM: yearMonth,
            days: balance,
            status: 1,
            payrollFrequency: payrollFrequency || PayrollFrequencyType.MONTHLY,
            startDate: startDate,
            endDate: endDate,
            createBy: req.userDetails.userMasterId,
            createByIp: req.userDetails.userIpAddress,
          });

          // Handle COFF
          if (allCoffBalanceData.length > 0) {
            const { allBalanceData, usedTransactionLog } = consumeLeaveBalance(
              allCoffBalanceData,
              balance,
              date,
              CoffUsedTypeEnum.ENCASH,
            );

            allCoffBalanceData = [...allBalanceData];
            usedLogTransactions = [...usedTransactionLog];
          }

          savedLeaveCount++;
        }

        // Update COFF balance if needed
        if (allCoffBalanceData.length) {
          await Promise.all(
            allCoffBalanceData.map((e) =>
              HrLeaveBalance.update(
                { availBal: e.availBal },
                { where: { LeaveBalTranId: e.LeaveBalTranId }, transaction },
              ),
            ),
          );
        }

        // Add used COFF transactions
        if (usedLogTransactions.length) {
          await UsedCoffTransaction.bulkCreate(usedLogTransactions, {
            user: req.userDetails,
            individualHooks: true,
            transaction,
          });
        }
      }

      savedRowCount++;
    }

    if (bulkLeaveEncashment.length > 0) {
      await LeaveEncashment.bulkCreate(bulkLeaveEncashment, {
        user: req.userDetails,
        individualHooks: true,
        transaction,
      });
    }
    if (bulkUserLeaveLapse.length > 0) {
      await UserLeaveLapse.bulkCreate(bulkUserLeaveLapse, {
        user: req.userDetails,
        individualHooks: true,
        transaction,
      });
    }
    if (bulkHrLeaveBalance.length > 0) {
      await HrLeaveBalance.bulkCreate(bulkHrLeaveBalance, {
        user: req.userDetails,
        individualHooks: true,
        transaction,
      });
    }

    // Commit Transaction
    await transaction.commit();

    try {
      if (fs.existsSync(validatedExcelPath)) {
        fs.unlinkSync(validatedExcelPath);
      }
    } catch (fileError) {
      // Log error but don't fail the request
      console.error('Failed to delete Excel file:', fileError);
    }

    const userMessage =
      operationType === leaveOperationENUM.Encashment
        ? 'Leave Encashment'
        : operationType === leaveOperationENUM.Lapse
          ? 'Leave Lapse'
          : operationType === leaveOperationENUM.AddLeaveBalance
            ? 'Leave Balance'
            : 'Leave';

    return res.status(200).json({
      status: 200,
      message: `${userMessage} saved successfully`,
      summary: {
        operationType,
        totalUsersProcessed: savedRowCount,
        totalLeaveRecordsInserted: savedLeaveCount,
      },
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.teamVehicleUsage = async (req, res, next) => {
  try {
    let { limit, page, fromdate, todate, userMasterID, Export } = req.body;

    if (!userMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }
    const paginationQuery = !Export
      ? page && limit
        ? { offset: (page - 1) * limit, limit }
        : {}
      : {};
    const { Op } = Sequelize;

    const condition = {
      status: 1,
    };

    if (userMasterID) {
      condition.userMasterID = userMasterID;
    }

    if (fromdate && todate) {
      let todate1 = new Date(todate);
      todate1.setDate(todate1.getDate() + 1);

      condition.startingDateTime = {
        [Sequelize.Op.between]: [new Date(fromdate), new Date(todate1)],
      };
    }

    const vehicleUsageAttributes = [
      'vehicleUsageID',
      'userMasterID',
      'startingDateTime',
      'endingDateTime',
      'startkilometer',
      'endkilometer',
      'status',
      'startingMeterImage',
      'isS3Starting',
      'startingMeterThumb',
      'endingMeterImage',
      'isS3Ending',
      'endingMeterThumb',
      'createBy',
      'createdAt',
      'updateBy',
      'updatedAt',
      'vehicleType',
    ];
    // Fetch vehicle usage along with user and branch data in one query
    const vehicle_Usage = await vehicleUsage.findAndCountAll({
      where: condition,
      attributes: vehicleUsageAttributes,
      ...paginationQuery,
      order: [['vehicleUsageID', 'DESC']],
      include: [
        {
          model: UserMaster,
          where: {
            status: 1,
          },
          attributes: [
            ['displayName', 'displayName'],
            ['userNumber', 'userNumber'],
          ],
          include: [
            {
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: {
                  [Op.lte]: Sequelize.col('vehicleUsage.startingDateTime'),
                },
                [Op.or]: [
                  { endDate: { [Op.eq]: null } },
                  {
                    endDate: {
                      [Op.gte]: Sequelize.col('vehicleUsage.startingDateTime'),
                    },
                  },
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
                startDate: {
                  [Op.lte]: Sequelize.col('vehicleUsage.startingDateTime'),
                },
                [Op.or]: [
                  { endDate: { [Op.eq]: null } },
                  {
                    endDate: {
                      [Op.gte]: Sequelize.col('vehicleUsage.startingDateTime'),
                    },
                  },
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
              model: EmployeeWorkingArea,
              where: {
                status: 1,
                startDate: {
                  [Op.lte]: Sequelize.col('vehicleUsage.startingDateTime'),
                },
                [Op.or]: [
                  { endDate: { [Op.eq]: null } },
                  {
                    endDate: {
                      [Op.gte]: Sequelize.col('vehicleUsage.startingDateTime'),
                    },
                  },
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
              required: false,
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: {
                  [Op.lte]: Sequelize.col('vehicleUsage.startingDateTime'),
                },
                [Op.or]: [
                  { endDate: { [Op.eq]: null } },
                  {
                    endDate: {
                      [Op.gte]: Sequelize.col('vehicleUsage.startingDateTime'),
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
            {
              required: false,
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: {
                  [Op.lte]: Sequelize.col('vehicleUsage.startingDateTime'),
                },
                [Op.or]: [
                  { endDate: { [Op.eq]: null } },
                  {
                    endDate: {
                      [Op.gte]: Sequelize.col('vehicleUsage.startingDateTime'),
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
          ],
        },
        {
          model: UserMaster,
          as: 'createdBy',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'updatedBy',
          attributes: ['displayName'],
        },
      ],
    });

    if (Export) {
      const finalExportData = [];
      for (let e of vehicle_Usage.rows) {
        const obj = {
          'User Name': e.userMaster.displayName,
          'User Number': e.userMaster.userNumber,
          Branch:
            e.userMaster.employeeBranches.length > 0
              ? e.userMaster.employeeBranches?.[0].branchMaster.branchName
              : '',
          Department:
            e.userMaster?.employeeDepartments?.[0]?.department?.departmentName,
          Designation:
            e.userMaster?.employeeDesignations?.[0]?.designation
              ?.designationName,
          Division:
            e.userMaster?.employeeDivisions?.[0]?.division?.divisionName,
          'Working Area':
            e.userMaster?.employeeWorkingAreas?.[0]?.workingArea
              ?.workingAreaName,
          'Starting Date Time': e.startingDateTime
            ? moment(asiaKolkataDateTime(e.startingDateTime)).format(
                'DD-MM-YYYY hh:mm:ss A',
              )
            : '',
          'Starting Meter': e.startkilometer,
          'Starting Meter Image': {
            original: e.startingMeterImage,
            thumbnail: e.startingMeterThumb,
            s3UploadattachFile: e.isS3Starting,
          },
          'Ending Date Time': e.endingDateTime
            ? moment(asiaKolkataDateTime(e.endingDateTime)).format(
                'DD-MM-YYYY hh:mm:ss A',
              )
            : '',
          'Ending Meter': e.endkilometer,
          Kilometer: e.endkilometer
            ? Number(e.endkilometer) - Number(e.startkilometer)
            : '',
          'Ending Meter Image': {
            original: e.endingMeterImage,
            thumbnail: e.endingMeterThumb,
            s3UploadattachFile: e.isS3Ending,
          },
          'Created By': e.createdBy?.displayName || '',
          'Created At': moment(e.createdAt).format('DD-MM-YYYY hh:mm:ss A'),
          'Updated By': e.updatedBy?.displayName || '',
          'Updated At': e.updatedBy?.displayName
            ? moment(e.updatedAt).format('DD-MM-YYYY hh:mm:ss A')
            : '',
        };
        finalExportData.push(obj);
      }
      return await generateExcelForVehicleMeterDetails(
        finalExportData,
        `Vehicle Meter Details`,
        'xlsx',
        res,
      );
    }

    // Process the fetched data
    vehicle_Usage.rows.forEach((vehicle) => {
      const branchContact = vehicle.userMaster.employeeBranches[0];
      vehicle.dataValues.branchName = branchContact
        ? branchContact.branchMaster.branchName
        : '';
    });

    return res.status(200).json({
      status: 200,
      data: vehicle_Usage.rows,
      totalcount: vehicle_Usage.count,
    });
  } catch (err) {
    next(err);
  }
};
