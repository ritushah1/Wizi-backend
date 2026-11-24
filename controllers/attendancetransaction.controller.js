const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const Designation = require('../models/designation');
const Sequelize = require('sequelize');
const attendanceTransaction = require('../models/attendanceTransaction');
const UserMaster = require('../models/userMaster');
const EmployeeShift = require('../models/employeeShift');
const EmployeeBranch = require('../models/employeeBranch');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const shiftTime = require('../models/shiftTime');
const shiftModel = require('../models/shift');
const AttendanceLogs = require('../models/attendancelogs');
const moment = require('moment');
const userMaster = require('../models/userMaster');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const OvertimeAuthorizationRequest = require('../models/overtimeAuthorization');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const overTimeCalculation = require('../models/overTimeCalculation');
const companyMaster = require('../models/companyMaster');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const hrLeaveBalances = require('../models/hrLeaveBalance');
const UserLeaves = require('../models/userleave');
const coffMaster = require('../models/coffMaster');
const datewiseAttendancepolicy = require('../models/datewiseAttendancepolicy');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const SalaryPolicy = require('../models/salaryPolicy');
const UserLeaveTransaction = require('../models/userLeaveTransaction');
const UserLeave = require('../models/userleave');
const AttendancePolicy = require('../models/attendancePolicy');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const CompensatoryOffAuthorization = require('../models/compensatoryOffAuthorization');
const AttendanceCorrection = require('../models/attendanceCorrection');
const {
  daysInMonth,
  formatAMPM,
  checkHoliday,
  overtime,

  employeeDepartment,

  employeeDesignation,
  employeeBranch,
  addCoff,
  coffOvertime,

  lateComingPenalty,
  earlyByPermission,
  monthStartDateBetween,
  employeeSalaryPolicy,

  calculateEarlyby,
  calculateLateby,

  getDatesFromDateRange,
  toHoursAndMinutes,

  getFinancialYearDatesFromDate,
  month_dict,
  getUserByCompanyandDateRange,
  getBranchByLatLong,
  employeeWorkingLocation,
  // employeeWorkingLocation,
  CountCurrentPenalties,
  countFinalPenalties,
  countPenalties,
  countMonthLateByPenalties,
  getTotalMinutes,
  countEarlyPenalties,
  countMonthEarlyByPenalties,
  getCurrentEarlyByPenalty,
  employeeLateEarlyPolicy,
  userDetails,
  addAsopalavBreakTimePenalty,
  addAsopalavBreakTime,
  getLeave,
  paginate,
  getUserByDepartmentandDate,
  getUserSalaryMasterByMonth,
  getDDMMYYYYdate,
  getTimeHHMMSSFormat,
  asiaKolkataDateTime,
  combined_deductionMobile,
  combined_deductionManual,
  penalty_deductionManual,
  earlyby_deductionManual,
  addFoodAllowanceInAttendance,
  getAutomticShiftAssignedMobile,
  addCoffMobile,
  coffOvertimeMobile,
  overtimeMobile,
  getShiftData,
  calculateDays,
  getAllDatesBetween,
  toGetFinalHolidayWeekoff,
  addExtraDaysMobile,
  findWeekoff_Without_trans,
  add_normalDay_CoffMobile,
  add_normalDay_ExtraDayMobile,
  deleteOvertimeCoffExtraDaysMobile,
  employeeWeekoffPolicy,
  weekoffOnPhysicalPresentCalculationNoTxn,
  checkHolidayNew,
  coff_Overtime_Manual,
  coff_addLeave_Manual,
  coff_addExtraDays_Manual,
  addFoodAllowanceInAttendance_Manual,
  getAsopalavBreakTime_Manual,
  OD_On_Weekoff_MissPunch_Without_Trans,
  getWeekoffHoliday_WithOut_Trans,
  add_OD_On_weekOff_Coff_OT_ED_WithOut_Trans,
  getODData,
  getODData_Without_Trans,
  calculateWeekoffMinutes,
  applyWeekoffHolidayFlags,
  applyLeaveFlagsAndNames,
  applyWorkFromHomeFlagsAndNames,
  add_weekOff_Coff_OT_ED,
  OD_On_WeekoffForAbsent,
  getWeekoffHoliday,
  add_OD_On_weekOff_Coff_OT_ED,
  lcShiftWise_deductionManual,
  lcShiftWise_deductionMobile,
  parseEmployeeInfo,
  coff_extraHrs_As_Overtime,
  shiftShortfallMinutesDeduction,
  deleteOvertimeCoff,
  checkIsAttendanceMissPunch,
  getCoffMinutes,
  sendBulkNotification,
  minutesToHoursMinutes,
  updateShortLeave,
  attendancepunchinpunchout_Manual,
  createlogs,
  attendancepunchinpunchoutupdate_Manual,
  getOrderByFields,
  convertWorkingHrstoOT_IfNotPresent,
  normal_overtime_Manual_For_Mehta,
  schedule_auto_punchout,
  calculateFullDayHalfDay,
} = require('../utils/commonUtilFunctions');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const Shift = require('../models/shift');
const notificationPolicy = require('../models/notificationPolicy');
const {
  generateExcel,
  generateChecklistExcel,
  generateExcelForLeave,
  generateExcelForDailyCost,
  generateExcelForPunchInPunchOutReport,
} = require('../utils/exportData');
const FormMaster = require('../models/formMaster');
const { Op } = require('sequelize');
const ShiftTIme = require('../models/shiftTime');
const { isArray, last, includes } = require('lodash');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const RolePermission = require('../models/rolePermission');
const RoleMaster = require('../models/roleMaster');
const EmployeeLateEarlyPolicy = require('../models/employeeLateEarlyPolicy');
const LateEarlyPolicy = require('../models/lateEarlyPolicy');
const { join } = require('path');
const { attendancePhotobase64Topng } = require('../utils/base64Topng');
const AutoMailSetup = require('../models/autoMailSetup');
const RoleMasterBranchWise = require('../models/roleMasterBranchWise');
const UserInbox = require('../models/UserInbox');
const ShiftRoster = require('../models/shiftRoster');
const UserShortLeave = require('../models/userShortLeave');
const EmployeeShortLeavePolicy = require('../models/employeeShortLeavePolicy');
const ShortLeave = require('../models/shortLeave');
const {
  roleType,
  attendaceTransType,
  attendanceTransactionType,
  authorizationMasterTypes,
  attendanceBranchTypeRule,
  PayrollFrequencyType,
  attendanceReportMainReportTypes,
  weekoffTypeEnum,
  TeaAllowanceTypeEnum,
  FoodAllowanceTypeEnum,
  LCEGPolicyTypeEnum,
  OutsidePunchPermissionEnum,
  overtimeAddedEnum,
  compensationTypeEnum,
  notificationTitleTypes,
  notificationScreentTypes,
  ShiftTypeEnum,
  sortFields,
  AuthorizationStatusType,
  workerTypesEnum,
  attendanceFromType,
  punchOutConfig,
} = require('../utils/dbUtils');
const ExtraDays = require('../models/extraDays');
const ExtraDaysAuthorization = require('../models/extraDaysAuthorization');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const EmployeeProject = require('../models/employeeProject');
const Project = require('../models/project');
const EmployeeWeekOff = require('../models/employeeWeekOff');
const weekOffPolicy = require('../models/weekOffPolicy');
const ExcelJS = require('exceljs');
const ShortLeavePolicy = require('../models/shortLeave');
const Employeeincentive = require('../models/employeeincentive');
const Incentivetype = require('../models/incentivetype');
const HrLeaveBalance = require('../models/hrLeaveBalance');
const Penalty = require('../models/penalty');
const attedanceCorrection = require('../models/attendanceCorrection');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const UsedCoffTransaction = require('../models/usedCoffTransaction');
const {
  statusCodes,
  userAttributes,
  DailyAttendanceSummaryDashboardFields,
  orderByEmployeeMasterFields,
} = require('../utils/commonVars');
const UserWorkFromHome = require('../models/userWorkFromHome');
const WorkFromHomeTransaction = require('../models/workFromHomeTransaction');
const TrackingKM = require('../models/trackingKM');
const TrackingKMsOld = require('../models/trackingKMOld');
const {
  TRACKING_MIGRATION_DATE,
  isStoreFileToS3Bucket,
  bucketName,
} = require('../utils/labelUtils');
const { log } = require('console');
const path = require('path');
const fs = require('fs');
const { uploadBase64ToS3 } = require('../utils/s3.utils');
const employeeHolidayPolicy = require('../models/employeeHolidayPolicy');
const holidayPolicy = require('../models/holidayPolicy');
const HolidayCompensationRule = require('../models/holidayCompensationRule');
const EmployeeReportTo = require('../models/employeeReportTo');
const { response } = require('express');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const otCalcShiftSlab = require('../models/otCalcShiftSlab');
const otCalcShiftSlabRatio = require('../models/otCalcShiftSlabRatio');
const {
  removePunchoutQueue,
  checkJobById,
  listJobs,
} = require('../services/autoPunchoutQueueService');
const PunchInOutFormValue = require('../models/punchInOutFormValue');

function roundToNearestHour(minutes, roundoff) {
  // Calculate hours and the remaining minutes
  let hours = Math.floor(minutes / 60);
  let remainingMinutes = minutes % 60;

  // Round up if remaining minutes are more
  if (+remainingMinutes > +roundoff) {
    hours += 1;
  }

  return hours;
}

exports.getovertimeuserwise = async (req, res, next) => {
  try {
    let { limit, page, startdate, enddate, userMasterID } = await req.body;
    let offset = (page - 1) * limit;

    let overTimeCalculations, totalcount;

    if (startdate && enddate) {
      overTimeCalculations = await overTimeCalculation.findAll({
        raw: true,
        where: {
          UserMasterID: userMasterID,
          OverTimeDate: {
            [Sequelize.Op.between]: [startdate, enddate],
          },
        },
        order: [['OverTimeDate', 'DESC']],
        limit: limit,
        offset: offset,
        include: [
          {
            model: attendanceTransaction,
            attributes: ['InDatetime', 'OutDateTime'],
          },
        ],
      });

      totalcount = await overTimeCalculation.count({
        where: {
          UserMasterID: userMasterID,
          OverTimeDate: {
            [Sequelize.Op.between]: [startdate, enddate],
          },
        },
      });
    } else {
      overTimeCalculations = await overTimeCalculation.findAll({
        raw: true,
        where: {
          UserMasterID: userMasterID,
        },
        order: [['OverTimeDate', 'DESC']],
        limit: limit,
        offset: offset,
        include: [
          {
            model: attendanceTransaction,
            attributes: ['InDatetime', 'OutDateTime'],
          },
        ],
      });
      totalcount = await overTimeCalculation.count({
        where: {
          UserMasterID: userMasterID,
        },
      });
    }

    const auth_Criteria = await AuthorizationDetails.findOne({
      row: true,
      where: {
        AuthorizationMasterID: authorizationMasterTypes.overtime,
        userMasterID: userMasterID,
        status: 1,
      },
      include: [
        {
          model: AuthorizationCriteriaMaster,
          attributes: ['AuthorizationCriteria'],
        },
      ],
      attributes: [],
    });

    for (let i = 0; i < overTimeCalculations.length; i++) {
      overTimeCalculations[i].auth_Criteria =
        auth_Criteria && auth_Criteria.AuthorizationCriteriaMaster
          ? auth_Criteria.AuthorizationCriteriaMaster.AuthorizationCriteria
          : '';
    }

    return res.json({
      status: 200,
      message: message.usermessage.overtimedataget,
      data: overTimeCalculations,
      totalcount: totalcount,
    });
  } catch (err) {
    next(err.message);
  }
};

exports.getovertimeuserwiseV2 = async (req, res, next) => {
  try {
    let { limit, page, startdate, enddate, userMasterID } = await req.body;
    if (req.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    let offset = (page - 1) * limit;

    let overTimeCalculations, totalcount;

    if (startdate && enddate) {
      overTimeCalculations = await overTimeCalculation.findAll({
        raw: true,
        where: {
          UserMasterID: userMasterID,
          OverTimeDate: {
            [Sequelize.Op.between]: [startdate, enddate],
          },
        },
        order: [['OverTimeDate', 'DESC']],
        limit: limit,
        offset: offset,
        include: [
          {
            model: attendanceTransaction,
            attributes: ['InDatetime', 'OutDateTime'],
          },
        ],
      });

      totalcount = await overTimeCalculation.count({
        where: {
          UserMasterID: userMasterID,
          OverTimeDate: {
            [Sequelize.Op.between]: [startdate, enddate],
          },
        },
      });
    } else {
      overTimeCalculations = await overTimeCalculation.findAll({
        raw: true,
        where: {
          UserMasterID: userMasterID,
        },
        order: [['OverTimeDate', 'DESC']],
        limit: limit,
        offset: offset,
        include: [
          {
            model: attendanceTransaction,
            attributes: ['InDatetime', 'OutDateTime'],
          },
        ],
      });
      totalcount = await overTimeCalculation.count({
        where: {
          UserMasterID: userMasterID,
        },
      });
    }

    const auth_Criteria = await AuthorizationDetails.findOne({
      row: true,
      where: {
        AuthorizationMasterID: authorizationMasterTypes.overtime,
        userMasterID: userMasterID,
        status: 1,
      },
      include: [
        {
          model: AuthorizationCriteriaMaster,
          attributes: ['AuthorizationCriteria'],
        },
      ],
      attributes: [],
    });

    for (let i = 0; i < overTimeCalculations.length; i++) {
      overTimeCalculations[i].auth_Criteria =
        auth_Criteria && auth_Criteria.AuthorizationCriteriaMaster
          ? auth_Criteria.AuthorizationCriteriaMaster.AuthorizationCriteria
          : '';
    }

    return res.json({
      status: 200,
      message: message.usermessage.overtimedataget,
      data: overTimeCalculations,
      totalcount: totalcount,
    });
  } catch (err) {
    next(err.message);
  }
};

exports.getAttendanceLogsByTrnsactionId = async (req, res, next) => {
  try {
    const attendanceData = await AttendanceLogs.findAll({
      where: {
        AttendanceTransID: req.params.id,
      },
      include: [
        {
          model: PunchInOutFormValue,
          as: 'formValue',
        },
      ],
      order: [['logDateTime', 'DESC']],
    });
    if (!attendanceData)
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    else res.status(200).json({ status: 200, data: attendanceData });
  } catch (err) {
    next(err);
  }
};

exports.attendancereport = async (req, res, next) => {
  try {
    const { userMasterID, fromdate, todate, limit, page, exportData } =
      await req.body;

    let fromdate1 = new Date(
      new Date(new Date(fromdate).setHours(0, 0, 0, 0))
        .toString()
        .split('GMT')[0] + ' UTC',
    ).toISOString();
    let enddate1 = new Date(
      new Date(new Date(todate).setHours(23, 59, 59, 999))
        .toString()
        .split('GMT')[0] + ' UTC',
    ).toISOString();

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [];
    if (exportData) order.push(['userMasterID', 'ASC'], ['logDateTime', 'ASC']);
    else order.push(['logDateTime', 'DESC'], ['attendanceLogID', 'DESC']);
    order.push([
      { model: PunchInOutFormValue, as: 'formValue' },
      'fieldIndex',
      'ASC',
    ]);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const attendance_data = await AttendanceLogs.findAndCountAll({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: userMasterID,
        },
        logDateTime: {
          [Sequelize.Op.between]: [new Date(fromdate1), new Date(enddate1)],
        },
      },
      ...paginationQuery,
      order,
      include: [
        {
          model: UserMaster,
          where: { ...userAccessCondition.where },
          required: true,
          attributes: [
            ['displayName', 'displayName'],
            ['userNumber', 'userNumber'],
            ['companyMasterId', 'companyMasterId'],
          ],
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
          ],
        },
        {
          model: attendanceTransaction,
          attributes: ['branchID', 'AttendanceDate'],
          include: [
            { model: BranchMaster, attributes: ['branchName'] },
            { model: Department, attributes: ['departmentName'] },
            { model: Designation, attributes: ['designationName'] },
          ],
        },
        {
          model: PunchInOutFormValue,
          as: 'formValue',
        },
      ],
    });

    for (let item of attendance_data.rows) {
      if (
        +item.AttendanceTransID == attendaceTransType.biometricNotValidated ||
        +item.AttendanceTransID == attendaceTransType.tpMirrorNotValidated
      )
        item.direction = attendanceTransactionType.notValidated;
      if (
        +item.AttendanceTransID == attendaceTransType.biometricNC ||
        +item.AttendanceTransID == attendaceTransType.tpMirrorNC
      )
        item.direction = attendanceTransactionType.notConsider;
    }

    if (exportData) {
      const finalData = [];

      for (let item of attendance_data.rows) {
        const logDateTime = new Date(item.dataValues.logDateTime);
        const formattedDate = `${logDateTime
          .getDate()
          .toString()
          .padStart(2, '0')}-${(logDateTime.getMonth() + 1)
          .toString()
          .padStart(2, '0')}-${logDateTime.getFullYear()} ${logDateTime
          .getHours()
          .toString()
          .padStart(2, '0')}:${logDateTime
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;

        const tempObj = {
          'Employee Code':
            item.dataValues.userMaster.dataValues.employeeJoiningDetails
              .length > 0
              ? item.dataValues.userMaster.dataValues.employeeJoiningDetails[0]
                  .dataValues.employeeCode
              : '',
          'Employee Name': item.dataValues.userMaster.displayName,
          'Employee Number': item.dataValues.userMaster.userNumber,
          Branch:
            item.dataValues.attendanceTransaction &&
            item.dataValues.attendanceTransaction.branchMaster
              ? item.dataValues.attendanceTransaction.branchMaster.branchName
              : '',
          Department:
            item.dataValues.attendanceTransaction &&
            item.dataValues.attendanceTransaction.department
              ? item.dataValues.attendanceTransaction.department.departmentName
              : '',
          Designation:
            item.dataValues.attendanceTransaction &&
            item.dataValues.attendanceTransaction.designation
              ? item.dataValues.attendanceTransaction.designation
                  .designationName
              : '',
          'Attendance Date': item.dataValues.attendanceTransaction
            ? item.dataValues.attendanceTransaction.AttendanceDate.toString()
                .split('-')
                .reverse()
                .join('-')
            : '',
          'Log Date Time': formattedDate,
          Direction: item.dataValues.direction,
          'Log From': item.dataValues.attendnaceFrom,
          Latitude: item.dataValues.latitude,
          Longitude: item.dataValues.longitude,
          Address: item.dataValues.address,
          image: item.dataValues.photo,
          'Serial Number': item.dataValues.sn,
          'Log Remarks': item.dataValues.remarks,
          isS3Upload: item.isS3Upload || false,
          formValue: Array.isArray(item.dataValues.formValue)
            ? item.dataValues.formValue.map((f) => ({
                fieldIndex: f.fieldIndex,
                fieldLabel: f.fieldLabel,
                fieldValue: f.fieldValue,
                inputType: f.inputType,
              }))
            : [],
        };
        finalData.push(tempObj);
      }
      await generateExcelForPunchInPunchOutReport(
        finalData,
        'PunchIn-OutReport',
        'xlsx',
        res,
      );
      return;
    }

    return res.json({
      status: 200,
      message: message.usermessage.attendancedata,
      data: attendance_data.rows,
      totalcount: attendance_data.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.dashboardpunchinout = async (req, res, next) => {
  try {
    let {
      companyMasterID,
      date,
      branchMasterID,
      departmentID,
      designationID,
      divisionId,
      workingAreaId,
    } = await req.body;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const total_active_user = await UserMaster.findAll({
      where: {
        companyMasterId: companyMasterID,
        status: 1,
        ...userAccessCondition.where,
      },
      include: [
        ...userAccessCondition.includeModels,
        {
          model: EmployeeDesignation,
          where: {
            status: 1,
            ...(designationID &&
              (!Array.isArray(designationID) || designationID.length) && {
                designationID,
              }),
            applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: designationID && designationID.length ? true : false,
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
            ...(departmentID &&
              (!Array.isArray(departmentID) || departmentID.length) && {
                departmentID,
              }),
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: departmentID && departmentID.length ? true : false,
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
            ...(branchMasterID &&
              (!Array.isArray(branchMasterID) || branchMasterID.length) && {
                branchID: branchMasterID,
              }),
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: branchMasterID && branchMasterID.length ? true : false,
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
          model: attendanceTransaction,
          where: {
            AttendanceDate: date ? date : currentDate,
          },
          attributes: [
            'AttendanceTransID',
            'InDatetime',
            'OutDateTime',
            'AttendanceDate',
            'userMasterID',
            'Shifthrs',
            'ShiftIntime',
            'ShiftoutTime',
            'InHrs',
            'LateBy',
            'EarlyBy',
          ],
        },
        {
          model: EmployeeDivision,
          where: {
            status: 1,
            ...(divisionId &&
              (!Array.isArray(divisionId) || divisionId.length) && {
                divisionId,
              }),
            startDate: { [Sequelize.Op.lte]: new Date(currentDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: divisionId && divisionId.length ? true : false,
          attributes: ['divisionId'],
          include: [
            {
              model: Division,
              attributes: ['divisionName'],
            },
          ],
        },
        {
          model: EmployeeWorkingArea,
          where: {
            status: 1,
            ...(workingAreaId &&
              (!Array.isArray(workingAreaId) || workingAreaId.length) && {
                workingAreaId,
              }),
            startDate: { [Sequelize.Op.lte]: new Date(currentDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: workingAreaId && workingAreaId.length ? true : false,
          attributes: ['workingAreaId'],
          include: [
            {
              model: WorkingArea,
              attributes: ['workingAreaName'],
            },
          ],
        },
      ],
    });
    const filterPunchinUser = total_active_user.filter(
      (e) =>
        e.attendanceTransactions.length &&
        e.attendanceTransactions[0].InDatetime &&
        e.attendanceTransactions[0].OutDateTime == null,
    );
    const filterPunchOutUser = total_active_user.filter(
      (e) =>
        e.attendanceTransactions.length &&
        e.attendanceTransactions[0].InDatetime &&
        e.attendanceTransactions[0].OutDateTime,
    );
    const filterNotPunchUser = total_active_user.filter(
      (e) => e.attendanceTransactions.length == 0,
    );

    const finaldata = [
      {
        total_active: total_active_user.length,
        total_punchin: filterPunchinUser.length,
        total_not_punchin: filterNotPunchUser.length,
        total_punchout: filterPunchOutUser.length,
      },
    ];

    return res.status(200).json({ status: 200, data: finaldata });
  } catch (err) {
    next(err);
  }
};

exports.shiftupdate = async (req, res, next) => {
  try {
    const { userMasterID, startdate, enddate, shiftID, shiftSelection } =
      req.body;
    const usermasterid = userMasterID;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    const createBy = updateBy;

    let updated_id = [];
    let attendanceVerifyUser = [];
    let notattendanceVerifyUser = [];

    let shiftTimeData = [];
    let shift;

    if (shiftSelection != 'auto' && shiftID) {
      shift = await shiftModel.findOne({
        where: {
          shiftID: shiftID,
        },
        include: [{ required: false, model: shiftTime }],
      });
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const attendanceInclude = [
      {
        model: UserMaster,
        required: true,
        where: { ...userAccessCondition.where },
        attributes: ['userMasterID', 'companyMasterId'],
        include: [
          ...userAccessCondition.includeModels,
          {
            model: EmployeeJoiningDetails,
            attributes: ['payrollFrequency', 'joiningDate'],
          },
        ],
      },
      {
        required: false,
        model: UserShortLeave,
        where: {
          authorizationStatus: 3,
        },
      },
    ];

    if (shiftSelection == 'auto') {
      attendanceInclude.push({
        model: Shift,
        include: [{ required: false, separate: true, model: ShiftTIme }],
      });
    }

    const [
      allUserAttendanceData,
      allUserEmployeeSalaryPolicy,
      allUserEmployeeAttendancePolicy,
      allUserShiftRosterData,
      allUserShortLeavePolicy,
      allUserShortLeave,
      allWeekoffPolicyData,
      allODData,
      allWeekoffHoliday,
      allHolidayPolicyData,
    ] = await Promise.all([
      // allUserAttendanceData
      attendanceTransaction.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: usermasterid,
          },
          AttendanceDate: {
            [Sequelize.Op.between]: [startdate, enddate],
          },
        },
        include: attendanceInclude,
        order: [['AttendanceDate', 'ASC']],
      }),
      // allUserEmployeeSalaryPolicy
      EmployeeSalaryPolicy.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: usermasterid,
          },
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: enddate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: startdate,
              },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        attributes: ['userMasterID', 'salaryPolicyID', 'startDate', 'endDate'],
        include: [
          {
            model: UserMaster,
            as: 'employee',
            required: true,
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
            attributes: [],
          },
          { model: SalaryPolicy, as: 'salaryPolicy' },
        ],
      }),
      // allUserEmployeeAttendancePolicy
      EmployeeAttendancePolicy.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: usermasterid,
          },
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: new Date(enddate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(startdate),
              },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        attributes: [
          'userMasterID',
          'attendancePolicyID',
          'startDate',
          'endDate',
        ],
        include: [
          {
            model: UserMaster,
            as: 'employee',
            required: true,
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
            attributes: [],
          },
          {
            model: AttendancePolicy,
            as: 'attendancePolicy',
            include: [
              {
                model: otCalcShiftSlab,
                as: 'otCalcSS',
                attributes: ['shiftIds'],
                include: [
                  {
                    model: otCalcShiftSlabRatio,
                    as: 'otCalcSSR',
                    attributes: ['upToMin', 'ratio'],
                  },
                ],
              },
            ],
          },
        ],
      }),
      // allUserShiftRosterData
      ShiftRoster.findAll({
        where: {
          shiftRosterDate: {
            [Sequelize.Op.between]: [startdate, enddate],
          },
          userMasterID: {
            [Sequelize.Op.in]: usermasterid,
          },
        },
        include: [
          {
            model: UserMaster,
            required: true,
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
            attributes: [],
          },
        ],
      }),
      // allUserShortLeavePolicy
      EmployeeShortLeavePolicy.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: usermasterid,
          },
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: enddate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: startdate,
              },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        attributes: [
          'userMasterID',
          'shortLeavePolicyID',
          'applicableDate',
          'endDate',
        ],
        include: [
          {
            model: UserMaster,
            as: 'employee',
            required: true,
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
            attributes: [],
          },
          { model: ShortLeave },
        ],
      }),
      // user short leave
      UserShortLeave.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: usermasterid,
          },
          date: {
            [Sequelize.Op.between]: [startdate, enddate],
          },
          authorizationStatus: AuthorizationStatusType.APPROVED,
        },
        include: [
          {
            model: UserMaster,
            required: true,
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
            attributes: [],
          },
        ],
      }),
      // WeekoffPolicy
      EmployeeWeekOff.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: usermasterid,
          },
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(enddate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(enddate),
              },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        attributes: ['weekOffPolicyID', 'userMasterID'],
        include: [
          {
            model: UserMaster,
            as: 'employee',
            required: true,
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
            attributes: [],
          },
          { model: weekOffPolicy, as: 'weekoff' },
        ],
      }),
      // OD Data
      UserLeaveTransaction.findAll({
        where: {
          date: {
            [Sequelize.Op.between]: [startdate, enddate],
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
            where: { userMasterID: { [Sequelize.Op.in]: usermasterid } },
            attributes: ['DayType', 'userMasterID'],
            include: [
              {
                model: UserMaster,
                required: true,
                where: { ...userAccessCondition.where },
                include: [...userAccessCondition.includeModels],
                attributes: [],
              },
            ],
          },
        ],
      }),
      weekoffHolidayTran.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: usermasterid,
          },
          date: {
            [Sequelize.Op.between]: [startdate, enddate],
          },
          [Sequelize.Op.or]: [
            { optionalHoliday: false },
            { optionalHoliday: null },
          ],
        },
      }),
      // holiday policy
      employeeHolidayPolicy.findAll({
        where: {
          status: 1,
          userMasterID: {
            [Sequelize.Op.in]: usermasterid,
          },
          applicableDate: {
            [Sequelize.Op.lte]: enddate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: startdate,
              },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        attributes: [
          'holidayPolicyID',
          'userMasterID',
          'applicableDate',
          'endDate',
        ],
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
      }),
    ]);

    // const findMissingDates = (dates, userShiftRoster) => {
    //   // Extract dates from userShiftRoster into a Set for quick lookup
    //   const rosterDates = new Set(
    //     userShiftRoster.map((roster) => roster.shiftRosterDate)
    //   );

    //   // Filter dates to find ones not in userShiftRoster
    //   return dates.filter((date) => !rosterDates.has(date));
    // };

    const AllUserAttendanceVerify = await HrLeaveMonthlyTrans.findAll({
      where: {
        userMasterID: usermasterid,
        [Sequelize.Op.or]: [
          {
            // attendance calculation start within the date range
            monthstartdate: { [Sequelize.Op.between]: [startdate, enddate] },
          },
          {
            // attendance calculation ends within the date range
            monthenddate: { [Sequelize.Op.between]: [startdate, enddate] },
          },
          {
            // attendance calculation spans the entire date range
            monthstartdate: { [Sequelize.Op.lte]: startdate },
            monthenddate: { [Sequelize.Op.gte]: enddate },
          },
        ],
        verified: 1,
      },
      include: [
        {
          model: UserMaster,
          required: true,
          where: { ...userAccessCondition.where },
          include: [...userAccessCondition.includeModels],
          attributes: [],
        },
      ],
    });

    const formatdatesArray = await getDatesFromDateRange(
      new Date(startdate),
      new Date(enddate),
    );

    const datesArray = formatdatesArray.map((e) =>
      e.toISOString().slice(0, 10),
    );

    // create short leave map

    const shortLeaveMap = new Map();

    for (const shortleave of allUserShortLeave) {
      const { userMasterID, date } = shortleave;

      if (!shortLeaveMap.has(+userMasterID)) {
        shortLeaveMap.set(+userMasterID, {});
      }

      const userData = shortLeaveMap.get(+userMasterID);

      userData[date] = shortleave;
    }

    const addShiftRosterData = [];

    for (const user of usermasterid) {
      const attendancedata = allUserAttendanceData.filter(
        (e) => e.userMasterID == user,
      );

      const attendanceVerify = AllUserAttendanceVerify.filter(
        (e) => e.userMasterID == user,
      );

      const userAttendancePolicy = allUserEmployeeAttendancePolicy.filter(
        (e) => e.userMasterID == user,
      );
      const userSalaryPolicy = allUserEmployeeSalaryPolicy.filter(
        (e) => e.userMasterID == user,
      );

      const userShortLeavePolicy = allUserShortLeavePolicy.filter(
        (e) => e.userMasterID == user,
      );

      const userShiftRosterData = allUserShiftRosterData.filter(
        (e) => e.userMasterID == user,
      );

      const userODData = allODData.filter(
        (e) => e.userLeave.userMasterID == user,
      );

      const weekoffHoliday = allWeekoffHoliday.filter(
        (e) => e.userMasterID == user,
      );

      // weekoff policy
      const weekoffPolicy =
        allWeekoffPolicyData.find((e) => e.userMasterID == user)?.weekoff ||
        null;

      // holiday policy

      const userHolidayPolicy = allHolidayPolicyData.filter(
        (e) => e.userMasterID == user,
      );

      // userwise all short leave

      const userWiseShortLeave = shortLeaveMap.get(+user);

      let userData = null;

      let changeShift = false;
      if (attendanceVerify.length > 0) {
        changeShift = attendanceVerify.every(checkVerify);

        function checkVerify(item) {
          return item.verified == 1;
        }
      }

      const convertWorkingHrsToOTDateWiseMap = new Map();

      if (!changeShift) {
        notattendanceVerifyUser.push(user);
        for (const attendance of attendancedata) {
          const attendancePolicy = userAttendancePolicy.find(
            (e) =>
              new Date(e.startDate).getTime() <=
                new Date(attendance.AttendanceDate).getTime() &&
              (!e.endDate ||
                new Date(e.endDate).getTime() >=
                  new Date(attendance.AttendanceDate).getTime()),
          );

          const attendance1 = attendancePolicy?.attendancePolicy || null;

          const holidayPolicy =
            userHolidayPolicy.find(
              (e) =>
                new Date(e.applicableDate).getTime() <=
                  new Date(attendance.AttendanceDate).getTime() &&
                (!e.endDate ||
                  new Date(e.endDate).getTime() >=
                    new Date(attendance.AttendanceDate).getTime()),
            )?.HolidayPolicy || null;

          const typeCondition =
            attendance1?.WHPHPriority == 'PH' ? "'holiday'" : "'weekoff'";

          const holidayCoffRuleIn = attendance1?.holidayCoffRuleIn;

          const holidayCompensationRules =
            (holidayPolicy?.holidayCompensationRules || []).find((e) =>
              (e.holidayDate || []).includes(attendance.AttendanceDate),
            ) || null;

          const checkWH = await getWeekoffHoliday(
            attendance.userMasterID,
            attendance.AttendanceDate,
            typeCondition,
          );

          const weekoffType = checkWH?.tableName || null;

          const dayname = new Date(attendance.AttendanceDate).toLocaleString(
            'en-us',
            {
              weekday: 'long',
            },
          );

          // shift time

          if (shiftSelection == 'auto') shift = attendance.shift;
          // -----------------if shift not found ----------------
          if (!shift) continue;

          const shiftTime = shift
            ? [...shift.shiftTimes].find((e) => e.day == dayname)
            : null;

          // set usermaster data
          userData = attendance.userMaster;

          //  check OD
          const odData = userODData.filter(
            (e) => e.date == attendance.AttendanceDate,
          );

          const companyMasterID = userData?.companyMasterId || null;

          const salaryPolicy = userSalaryPolicy.find(
            (e) =>
              new Date(e.startDate).getTime() <=
                new Date(attendance.AttendanceDate).getTime() &&
              (!e.endDate ||
                new Date(e.endDate).getTime() >=
                  new Date(attendance.AttendanceDate).getTime()),
          );

          const empPayrollFrequency =
            attendance.userMaster.employeeJoiningDetails?.[0]
              ?.payrollFrequency || PayrollFrequencyType.MONTHLY;

          const salaryPolicyData =
            salaryPolicy?.salaryPolicy?.payrollFrequency == empPayrollFrequency
              ? salaryPolicy.salaryPolicy
              : null;

          const otAdded =
            salaryPolicyData?.salarycalculationBasedon == 'hourwise'
              ? salaryPolicyData?.overtimeAdded
              : overtimeAddedEnum.DAILY;
          const monthlyOtCalType =
            otAdded == overtimeAddedEnum.MONHTLY
              ? salaryPolicyData.monthly_ot_cal_type
              : null;

          if (attendance.OutDateTime) {
            // user short leave
            const userShortLeave =
              userWiseShortLeave?.[attendance.AttendanceDate] || null;

            // check user shift roster data----
            const roster = userShiftRosterData.find(
              (e) =>
                new Date(e.shiftRosterDate).getTime() ==
                new Date(attendance.AttendanceDate).getTime(),
            );

            if (roster) {
              if (shiftSelection == 'manual') {
                // update roster
                await ShiftRoster.update(
                  {
                    shiftID: shift.shiftID,
                    isFromRoster: false,
                  },
                  {
                    where: {
                      shiftRosterID: roster.shiftRosterID,
                    },
                    individualHooks: true,
                    user: req.userDetails,
                  },
                );
              }
            } else {
              // add shift roster data
              addShiftRosterData.push({
                userMasterID: user,
                shiftID: shift.shiftID,
                shiftRosterDate: attendance.AttendanceDate,
                isFromRoster: false,
              });
            }

            if (shiftTime) {
              updated_id.push(attendance.AttendanceTransID);

              let lateby;
              let date = formatAMPM(attendance.InDatetime);
              var startTime = moment(date, 'HH:mm a');
              var endTime = moment(shiftTime.statTime, 'HH:mm: a');

              var duration = moment.duration(startTime.diff(endTime));
              var hours = parseInt(duration.asHours());
              hours = hours * 60;
              var minutes = (parseInt(duration.asMinutes()) % 60) + hours;

              lateby = minutes > 0 ? minutes : '';

              let earlyBy;
              if (attendance.OutDateTime) {
                const EarlybyMinutes = await calculateEarlyby(
                  attendance.AttendanceDate,
                  shiftTime.statTime,
                  shiftTime.endtime,
                  new Date(attendance.OutDateTime),
                );
                if (EarlybyMinutes) {
                  earlyBy = EarlybyMinutes;
                } else {
                  earlyBy = '';
                }
              }

              let outHRS = +attendance.OutHrs;
              let InHrs = Number(attendance.InHrs);

              let totaltime = 0,
                skipMinutes = 0;
              let actualMinutes = InHrs + outHRS;

              let halfDayOT = false;
              const preShiftOT = attendance1?.preShiftOT || false;
              if (attendance1) {
                halfDayOT = attendance1.Hfd_OT;

                if (attendance1.considerOvertimeAfter == 'shifthours') {
                  const isNextDay = moment(
                    shiftTime.endtime,
                    'h:mm A',
                  ).isBefore(moment(shiftTime.statTime, 'h:mm A'));

                  const attendanceDate = moment(attendance.AttendanceDate)
                    .add(isNextDay ? 1 : 0, 'day')
                    .format('YYYY-MM-DD');

                  const considerInTime =
                    preShiftOT &&
                    new Date(attendanceDate + ' ' + shiftTime.statTime) >
                      new Date(attendance.InDatetime)
                      ? new Date(attendanceDate + ' ' + shiftTime.statTime)
                      : new Date(attendance.InDatetime);
                  const shiftOutTime = new Date(
                    attendanceDate + ' ' + shiftTime.endtime,
                  );
                  const shiftInTime = new Date(
                    attendance.AttendanceDate + ' ' + shiftTime.statTime,
                  );

                  if (
                    new Date(attendance.OutDateTime).getTime() >
                    shiftOutTime.getTime()
                  ) {
                    totaltime =
                      (shiftOutTime.getTime() - considerInTime.getTime()) /
                      (1000 * 60);
                  } else {
                    totaltime = preShiftOT
                      ? (new Date(attendance.OutDateTime).getTime() -
                          shiftInTime.getTime()) /
                        60000
                      : InHrs + outHRS;
                  }
                } else {
                  totaltime = InHrs + outHRS;
                }

                if (
                  attendance1.considerWorkingHours == 'notincludingouthours'
                ) {
                  totaltime -= Number(outHRS);
                  actualMinutes -= +outHRS;
                }

                // if (attendance1.considerWorkingHours == 'includingouthours') {
                //   let outHRS = attendance.OutHrs;
                //   if (outHRS) {
                //     totaltime = Number(attendance.InHrs) + Number(outHRS);
                //   } else {
                //     totaltime = Number(attendance.InHrs);
                //   }
                // } else {
                //   totaltime = Number(attendance.InHrs);
                // }

                // preshift hours consideration
                if (
                  new Date(attendance.InDatetime) <
                  new Date(attendance.AttendanceDate + ' ' + shiftTime.statTime)
                ) {
                  const diffMilliseconds =
                    new Date(
                      attendance.AttendanceDate + ' ' + shiftTime.statTime,
                    ) - new Date(attendance.InDatetime);

                  // Convert the time difference from milliseconds to minutes
                  const EarlyMinutes = Math.floor(
                    diffMilliseconds / (1000 * 60),
                  );

                  // Check if early arrival minutes should be considered for deduction
                  if (
                    (attendance1.preShiftHrsConsideration == 0 || // Policy: Do not consider early arrival
                      (attendance1.preShiftHrsConsideration == 1 && // Policy: Consider only if early minutes are less than allowed
                        EarlyMinutes < +attendance1.preShiftMin)) &&
                    !preShiftOT
                  ) {
                    // Assign the early minutes to skipMinutes for deduction
                    skipMinutes = EarlyMinutes;

                    // Deduct the skipMinutes from fulldayHalfdayMinutes to avoid counting early arrival towards present time
                    totaltime -= +skipMinutes;
                    actualMinutes -= +skipMinutes;
                  }
                }
              } else {
                let outHRS = attendance.OutHrs;
                if (outHRS) {
                  totaltime = Number(attendance.InHrs) + Number(outHRS);
                } else {
                  totaltime = Number(attendance.InHrs);
                }
              }

              const userComp = attendance.userMaster.companyMasterId;
              let inHours = 0;
              if (
                userComp &&
                +userComp.companyMasterId == 168 &&
                new Date(attendance.InDatetime) <
                  new Date(
                    attendance.AttendanceDate + ' ' + shiftTime.statTime,
                  ) &&
                attendance.OutDateTime
              ) {
                totaltime = Math.round(
                  (new Date(attendance.OutDateTime).getTime() -
                    new Date(attendance.InDatetime).getTime()) /
                    (60 * 1000),
                );

                inHours = totaltime - +attendance.OutHrs;
                if (
                  attendance1 &&
                  attendance1.considerWorkingHours != 'includingouthours'
                ) {
                  totaltime = totaltime - +attendance.OutHrs;
                }

                const difference = Math.abs(
                  (new Date(
                    attendance.AttendanceDate + ' ' + shiftTime.statTime,
                  ) -
                    new Date(attendance.InDatetime)) /
                    (1000 * 60),
                );
                totaltime = Math.round(totaltime - +difference);
                inHours = Math.round(inHours - +difference);
              }

              // --- find Short leave policy

              const emp_ShortLeavePolicy = userShortLeavePolicy.find(
                (e) =>
                  new Date(e.applicableDate).getTime() <=
                    new Date(attendance.AttendanceDate).getTime() &&
                  (!e.endDate ||
                    new Date(e.endDate).getTime() >=
                      new Date(attendance.AttendanceDate).getTime()),
              );
              const shortLeavePolicy = emp_ShortLeavePolicy?.shortLeave || null;

              let shift_Grace = totaltime;

              // -----------------grace minutes to send in overtime function----------
              let grace = 0;

              if (shift && shift.shiftGrace) {
                shift_Grace = Number(shift.shiftGrace) + totaltime;
                grace = Number(shift.shiftGrace);
              }

              // set total time + add short leave minutes
              if (shortLeavePolicy && userShortLeave) {
                shift_Grace += +shortLeavePolicy.minutesForShortLeave;
                grace += +shortLeavePolicy.minutesForShortLeave;

                const toUpdateData = {
                  AttendanceTransID: attendance.AttendanceTransID,
                  updateBy,
                  updateByIp,
                };

                const updateOptions = {
                  hooks: false,
                };
                // update short leave
                await updateShortLeave(
                  toUpdateData,
                  userShortLeave.userShortLeaveId,
                  updateOptions,
                );
              }

              let weekOffMinutes = 0;
              let normalDayMinutes = shift_Grace;

              if (
                checkWH &&
                checkWH.WHDayType == 'SH' &&
                checkWH.value == 0.5
              ) {
                const totalMinuteshalfday = shiftTime.totalhourshalfday * 60;
                if (
                  attendance1 &&
                  attendance1.considerOvertimeAfter == 'totalworkinghours'
                ) {
                  if (shift_Grace > totalMinuteshalfday) {
                    weekOffMinutes = shift_Grace - totalMinuteshalfday - grace;
                    shift_Grace = shift_Grace - weekOffMinutes;
                    normalDayMinutes = shift_Grace;
                  }
                } else {
                  if (
                    new Date(attendance.InDatetime) <
                    new Date(
                      attendance.AttendanceDate +
                        ' ' +
                        shiftTime.firsthalfendtime,
                    )
                  ) {
                    if (
                      new Date(attendance.OutDateTime) >
                      new Date(
                        attendance.AttendanceDate +
                          ' ' +
                          shiftTime.firsthalfendtime,
                      )
                    ) {
                      const inTime = new Date(attendance.InDatetime).getTime();
                      const firstHalfEndTime = new Date(
                        attendance.AttendanceDate +
                          ' ' +
                          shiftTime.firsthalfendtime,
                      ).getTime();

                      let differenceInMinutes =
                        (firstHalfEndTime - inTime) / 60000; // Convert ms to minutes

                      differenceInMinutes = differenceInMinutes - skipMinutes;

                      if (differenceInMinutes >= 0) {
                        weekOffMinutes =
                          shift_Grace - differenceInMinutes - grace;
                        shift_Grace = differenceInMinutes;
                        normalDayMinutes = shift_Grace;
                      }
                    } else if (
                      new Date(attendance.InDatetime) >
                      new Date(
                        attendance.AttendanceDate +
                          ' ' +
                          shiftTime.firsthalfendtime,
                      )
                    ) {
                      weekOffMinutes = shift_Grace - grace;
                      shift_Grace = 0;
                      normalDayMinutes = shift_Grace;
                    }
                  }
                }
              }

              const attendanceFullDayHalfDay = await calculateFullDayHalfDay({
                shiftID: shift.shiftID,
                dayName: dayname,
                totalWorkMin: shift_Grace,
              });
              // // set roundoff minutes
              // const salaryPolicy = userSalaryPolicy.find(
              //   (e) =>
              //     new Date(e.startDate).getTime() <=
              //       new Date(attendance.AttendanceDate).getTime() &&
              //     (!e.endDate ||
              //       new Date(e.endDate).getTime() >=
              //         new Date(attendance.AttendanceDate).getTime()),
              // );

              // const empPayrollFrequency =
              //   attendance.userMaster.employeeJoiningDetails?.[0]
              //     ?.payrollFrequency || PayrollFrequencyType.MONTHLY;

              // const salaryPolicyData =
              //   salaryPolicy?.salaryPolicy?.payrollFrequency ==
              //   empPayrollFrequency
              //     ? salaryPolicy.salaryPolicy
              //     : null;

              let final_Minutes = Math.round(+actualMinutes);

              const temp_final_Minutes = final_Minutes;

              if (
                salaryPolicyData &&
                salaryPolicyData.salarycalculationBasedon == 'hourwise' &&
                salaryPolicyData.considerTimeType != 'actual'
              ) {
                if (salaryPolicyData.considerTimeValue) {
                  if (salaryPolicyData.considerTimeType == 'slotwise') {
                    final_Minutes =
                      Math.floor(
                        Math.round(+final_Minutes) /
                          +salaryPolicyData.considerTimeValue,
                      ) * +salaryPolicyData.considerTimeValue;
                  }

                  if (salaryPolicyData.considerTimeType == 'roundoff') {
                    final_Minutes =
                      roundToNearestHour(
                        Math.round(+final_Minutes),
                        +salaryPolicyData.considerTimeValue,
                      ) * 60;
                  }
                }
              }

              const extraMinutes = +temp_final_Minutes - +final_Minutes;

              let updatedData = [];

              if (
                userComp &&
                +userComp.companyMasterId == 168 &&
                new Date(attendance.InDatetime) <
                  new Date(
                    attendance.AttendanceDate + ' ' + shiftTime.statTime,
                  ) &&
                attendance.OutDateTime
              ) {
                [affectedRows, updatedData] =
                  await attendanceTransaction.update(
                    {
                      InHrs: inHours,
                      Shift: String(shiftTime.shiftID),
                      Shifthrs: String(shiftTime.totalhours),
                      ShiftIntime: shiftTime.statTime,
                      ShiftoutTime: shiftTime.endtime,
                      updateBy: updateBy,
                      updateByIp: updateByIp,
                      LateBy: lateby,
                      EarlyBy: earlyBy,
                      fulldayhalfday: attendanceFullDayHalfDay,
                      roundOffMinutes:
                        Math.round(+final_Minutes) > 0
                          ? Math.round(+final_Minutes)
                          : 0,
                      shiftShortfallMinutes: null,
                      isWHConvertedToOT: false,
                    },
                    {
                      where: {
                        AttendanceTransID: attendance.AttendanceTransID,
                      },
                      returning: true,
                    },
                  );
              } else {
                [affectedRows, updatedData] =
                  await attendanceTransaction.update(
                    {
                      Shift: String(shiftTime.shiftID),
                      Shifthrs: String(shiftTime.totalhours),
                      ShiftIntime: shiftTime.statTime,
                      ShiftoutTime: shiftTime.endtime,
                      updateBy: updateBy,
                      updateByIp: updateByIp,
                      LateBy: lateby,
                      EarlyBy: earlyBy,
                      fulldayhalfday: attendanceFullDayHalfDay,
                      roundOffMinutes:
                        Math.round(+final_Minutes) > 0
                          ? Math.round(+final_Minutes)
                          : 0,
                      shiftShortfallMinutes: null,
                      isWHConvertedToOT: false,
                    },
                    {
                      where: {
                        AttendanceTransID: attendance.AttendanceTransID,
                      },
                      returning: true,
                    },
                  );
              }

              await deleteOvertimeCoff(
                attendance.userMasterID,
                attendance.AttendanceDate,
                null,
                null,
              );

              // ------------------------------ for ot minutes if not present ---------------------------

              const isNonPresentOT = attendance1?.isNonPresentOT || false;
              const isPresent = attendanceFullDayHalfDay == 1;

              const shouldConvertWorkingHoursToOT =
                isNonPresentOT && !isPresent;

              // add to map
              convertWorkingHrsToOTDateWiseMap.set(
                attendance.AttendanceDate,
                shouldConvertWorkingHoursToOT,
              );

              const isHalfWeekOff =
                checkWH?.WHDayType === 'SH' && checkWH?.value === 0.5;

              let otMinutesIfNotPresent = 0;

              const convertToOT = async () =>
                convertWorkingHrstoOT_IfNotPresent(
                  attendance1,
                  attendance,
                  createBy,
                  updateByIp,
                  otMinutesIfNotPresent,
                  otAdded,
                  monthlyOtCalType,
                  +userData.companyMasterId,
                  null,
                );

              if (checkWH) {
                let withoutOtMinutes = Math.round(+final_Minutes);
                if (attendance1) {
                  let total_In_Hrs = Math.round(+final_Minutes);
                  if (
                    checkWH &&
                    checkWH.WHDayType == 'SH' &&
                    checkWH.value == 0.5
                  ) {
                    total_In_Hrs = weekOffMinutes;
                    otMinutesIfNotPresent = normalDayMinutes;
                  } else {
                    weekOffMinutes = Math.round(+attendance.roundOffMinutes);
                    total_In_Hrs = weekOffMinutes;
                    normalDayMinutes = 0;
                  }

                  const parameterData = {
                    attendancePolicy: attendance1,
                    weekoffType,
                    holidayCoffRuleIn,
                    holidayCompensationRules,
                  };

                  const { minutesData, compensationType } =
                    getCoffMinutes(parameterData);

                  if (compensationType == compensationTypeEnum.Overtime)
                    withoutOtMinutes = 0;

                  if (
                    isHalfWeekOff &&
                    shouldConvertWorkingHoursToOT &&
                    compensationType == compensationTypeEnum.Overtime
                  ) {
                    otMinutesIfNotPresent += weekOffMinutes;

                    await convertToOT();
                  } else {
                    // ------------------ OD on weekoff -------------------------

                    const odDays = odData.reduce(
                      (acc, obj) => acc + +obj.days,
                      0,
                    );

                    const attendanceData = updatedData[0] || null;

                    if (attendanceData?.fulldayhalfday != 1 && odDays > 0) {
                      let minutes = calculateWeekoffMinutes(
                        checkWH,
                        attendancePolicy,
                        attendanceData,
                        shiftTime,
                        attendanceData?.roundOffMinutes || 0,
                      );

                      // if absent
                      if (+attendanceData?.fulldayhalfday == 0) {
                        if (checkWH?.value == 0.5) {
                          const checkSecondHalfOD = odData.find((e) =>
                            ['Full Day', 'Second Half'].includes(
                              e.userLeave.DayType,
                            ),
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

                      // if absent
                      if (+attendanceData?.fulldayhalfday == 0.5) {
                        // check in time

                        let presentInFH = false;
                        let presentInSH = false;

                        if (
                          new Date(attendanceData.InDatetime) <
                          new Date(
                            attendanceData.AttendanceDate +
                              ' ' +
                              shiftTime.firsthalfendtime,
                          )
                        )
                          presentInFH = true;

                        if (
                          new Date(attendanceData.OutDateTime) >=
                          new Date(
                            attendanceData.AttendanceDate +
                              ' ' +
                              shiftTime.endtime,
                          )
                        )
                          presentInSH = true;

                        if (presentInFH && !presentInSH) {
                          const checkSecondHalfOD = odData.find((e) =>
                            ['Full Day', 'Second Half'].includes(
                              e.userLeave.DayType,
                            ),
                          );

                          minutes += checkSecondHalfOD
                            ? Math.round(+shiftTime.totalhours * 60) -
                              Math.round(+shiftTime.totalhourshalfday * 60)
                            : 0;
                        } else if (!presentInFH && presentInSH) {
                          const checkFirstHalfOD = odData.find((e) =>
                            ['Full Day', 'First Half'].includes(
                              e.userLeave.DayType,
                            ),
                          );

                          minutes += checkFirstHalfOD
                            ? Math.round(+shiftTime.totalhourshalfday * 60)
                            : 0;
                        } else if (!presentInFH && !presentInSH) {
                          minutes += Math.round(
                            +shiftTime.totalhourshalfday * 60,
                          );
                        }
                      }

                      // if OD on weekOff add OT/ED/Coff
                      await add_OD_On_weekOff_Coff_OT_ED_WithOut_Trans(
                        attendance1,
                        attendanceData,
                        companyMasterID,
                        minutes,
                        0,
                        minutes,
                        skipMinutes,
                        user,
                        attendanceData.AttendanceDate,
                        otAdded,
                        monthlyOtCalType,
                        weekoffType,
                        holidayCoffRuleIn,
                        holidayCompensationRules,
                      );
                    } else {
                      //If Overtime
                      if (compensationType == compensationTypeEnum.Overtime) {
                        coffOvertimeMobile(
                          attendance.userMasterID,
                          attendance.AttendanceTransID,
                          companyMasterID,
                          attendance1,
                          skipMinutes,
                          total_In_Hrs,
                          normalDayMinutes,
                          attendance.AttendanceDate,
                          false,
                          otAdded,
                          monthlyOtCalType,
                          weekoffType,
                        );
                      } else if (
                        compensationType == compensationTypeEnum.AddLeave
                      ) {
                        if (
                          minutesData?.halfDayMinutes &&
                          minutesData?.fullDayMinutes
                        ) {
                          const extraHrsOTonWH =
                            attendance1.extraHrsOTonWH || false;
                          const lastSlabMinutes = minutesData?.twoDayMinutes
                            ? minutesData?.twoDayMinutes
                            : minutesData?.oneHalfDayminutes
                              ? minutesData?.oneHalfDayminutes
                              : minutesData?.fullDayMinutes;
                          const extraMinutes = +total_In_Hrs - +lastSlabMinutes;

                          let coffValue = 0;
                          if (
                            total_In_Hrs >=
                              Number(minutesData.halfDayMinutes) &&
                            total_In_Hrs < Number(minutesData.fullDayMinutes)
                          ) {
                            coffValue = 0.5;
                          } else if (
                            total_In_Hrs >=
                              Number(minutesData.fullDayMinutes) &&
                            (!minutesData.oneHalfDayminutes ||
                              total_In_Hrs <
                                Number(minutesData.oneHalfDayminutes))
                          ) {
                            coffValue = 1;
                          } else if (
                            minutesData.oneHalfDayminutes &&
                            total_In_Hrs >=
                              Number(minutesData.oneHalfDayminutes) &&
                            (!minutesData?.twoDayMinutes ||
                              total_In_Hrs < Number(minutesData?.twoDayMinutes))
                          ) {
                            coffValue = 1.5;
                          } else if (
                            minutesData?.twoDayMinutes &&
                            total_In_Hrs >= Number(minutesData?.twoDayMinutes)
                          ) {
                            coffValue = 2;
                          }

                          if (coffValue > 0) {
                            await addCoff(
                              attendance.userMasterID,
                              attendance.AttendanceDate,
                              coffValue,
                              createBy,
                              updateByIp,
                              attendance1.autoApproveCoff,
                              otAdded,
                              monthlyOtCalType,
                            );

                            // if set extra hrs as ot
                            if (
                              extraHrsOTonWH &&
                              extraMinutes > 0 &&
                              attendance
                            ) {
                              const otAddedMinutes =
                                await coff_extraHrs_As_Overtime(
                                  attendance,
                                  attendance1,
                                  extraMinutes,
                                  createBy,
                                  updateByIp,
                                  null,
                                  otAdded,
                                  monthlyOtCalType,
                                  weekoffType,
                                );

                              withoutOtMinutes -= otAddedMinutes;
                            }
                          }
                        }
                      } else if (
                        compensationType == compensationTypeEnum.AddExtraDays
                      ) {
                        const otAddedMinutes = await addExtraDaysMobile(
                          attendance1,
                          attendance,
                          total_In_Hrs,
                          attendance.userMasterID,
                          attendance.AttendanceDate,
                          otAdded,
                          monthlyOtCalType,
                          minutesData,
                          weekoffType,
                        );

                        withoutOtMinutes -= otAddedMinutes;
                      }
                    }
                  }

                  if (
                    isHalfWeekOff &&
                    shouldConvertWorkingHoursToOT &&
                    compensationType != compensationTypeEnum.Overtime
                  ) {
                    await convertToOT();
                  }
                }

                // update attendance transaction
                await attendanceTransaction.update(
                  {
                    withoutOtMinutes:
                      withoutOtMinutes > 0 ? withoutOtMinutes : 0,
                  },
                  {
                    where: { AttendanceTransID: attendance.AttendanceTransID },
                  },
                );
              } else {
                if (shouldConvertWorkingHoursToOT) {
                  otMinutesIfNotPresent = attendance.roundOffMinutes;

                  await convertToOT();
                } else {
                  await overtime(
                    attendance.userMasterID,
                    attendance.AttendanceTransID,
                    skipMinutes,
                    extraMinutes,
                    grace,
                    halfDayOT,
                    shiftTime,
                    otAdded,
                    monthlyOtCalType,
                  );
                }
              }
            }
          } else {
            // not puch out

            // ----------------------OD on weekoff Logic ----------------

            // if OD on weekoff
            if (checkWH && odData && attendance1) {
              await OD_On_Weekoff_MissPunch_Without_Trans(
                null,
                user,
                attendance.AttendanceDate,
                checkWH,
                attendance1,
                shiftTime,
                odData,
                companyMasterID,
                otAdded,
                monthlyOtCalType,
                weekoffType,
                holidayCoffRuleIn,
                holidayCompensationRules,
              );
            }
          }
          let finaltransation = await attendanceTransaction.findOne({
            where: {
              AttendanceTransID: attendance.AttendanceTransID,
            },
          });

          await addFoodAllowanceInAttendance(finaltransation, Boolean(checkWH));
        }

        const empJoing = userData?.employeeJoiningDetails[0] || null;

        const attendancePolicyData =
          userAttendancePolicy && userAttendancePolicy.length
            ? userAttendancePolicy[0].attendancePolicy
            : null;

        const salaryPolicyData =
          userSalaryPolicy && userSalaryPolicy.length
            ? userSalaryPolicy[0].salaryPolicy
            : null;

        let endDateFinal = enddate;

        // ----------------------------- Weekoff on Physical Present ------------------------

        if (
          weekoffPolicy?.weekoffType == weekoffTypeEnum.ONPHYSICALPRESENT &&
          startdate &&
          empJoing
        ) {
          const userMasterID = userData.userMasterID;
          const joiningDate = empJoing.joiningDate || null;

          const attendanceDate = new Date(startdate);

          attendanceDate.setMonth(attendanceDate.getMonth() - 2);

          const startDate = joiningDate
            ? new Date(joiningDate) > new Date(attendanceDate)
              ? joiningDate
              : attendanceDate
            : attendanceDate;

          const currentDate = new Date();

          currentDate.setDate(currentDate.getDate() + 1);

          const endDate = currentDate.toISOString().slice(0, 10);

          endDateFinal = endDate;

          // find weekoff holiday

          const weekoffHoliday = await weekoffHolidayTran.findAll({
            where: {
              userMasterID,
              date: {
                [Sequelize.Op.between]: [startDate, endDate],
              },
              [Sequelize.Op.or]: [
                { optionalHoliday: false },
                { optionalHoliday: null },
              ],
            },
            order: [['date', 'DESC']],
          });

          const allWeekoff = weekoffHoliday.filter(
            (e) => e.tableName == 'weekoff',
          );

          const allHoliday = weekoffHoliday.filter(
            (e) => e.tableName == 'holiday',
          );

          const holidayDates = allHoliday.map((e) => e.date);

          const allAttendance = await attendanceTransaction.findAll({
            where: {
              userMasterID,
              [Sequelize.Op.and]: [
                {
                  AttendanceDate: {
                    [Sequelize.Op.between]: [startDate, endDate],
                  },
                },
                { AttendanceDate: { [Sequelize.Op.notIn]: holidayDates } },
              ],
              fulldayhalfday: {
                [Sequelize.Op.gte]: 0.5,
              },
              OutDateTime: {
                [Sequelize.Op.not]: null,
              },
            },
            include: [
              {
                model: shiftModel,
                attributes: ['shiftID', 'shiftGrace'],
                include: [{ model: ShiftTIme }],
              },
            ],
            order: [['AttendanceDate', 'ASC']],
          });

          await weekoffOnPhysicalPresentCalculationNoTxn(
            userMasterID,
            userData.companyMasterId,
            startdate,
            attendancePolicyData,
            salaryPolicyData,
            allAttendance,
            allWeekoff,
            weekoffPolicy.physicalPresent,
            createBy,
            req.userDetails.userIpAddress,
            'shiftValidate',
            allHoliday,
          );
        }

        const attendancePolicy =
          userAttendancePolicy && userAttendancePolicy.length
            ? userAttendancePolicy[0].attendancePolicy
            : null;

        await shiftValidatePenaltyGoEary(
          user,
          startdate,
          endDateFinal,
          attendancePolicy,
        );

        if (
          attendancePolicy?.isNonPresentOT ||
          attendancePolicy?.isShiftShortfall
        ) {
          const allAttendanceData = await attendanceTransaction.findAll({
            where: {
              userMasterID: user,
              AttendanceDate: {
                [Sequelize.Op.between]: [startdate, enddate],
              },
            },
          });

          if (attendancePolicy?.isNonPresentOT) {
            const otAdded =
              salaryPolicyData?.salarycalculationBasedon == 'hourwise'
                ? salaryPolicyData?.overtimeAdded
                : overtimeAddedEnum.DAILY;
            const monthlyOtCalType =
              otAdded == overtimeAddedEnum.MONHTLY
                ? salaryPolicyData.monthly_ot_cal_type
                : null;

            for (const attn of allAttendanceData) {
              const date = attn.AttendanceDate;

              const isConvertedToOT =
                convertWorkingHrsToOTDateWiseMap.get(date);

              if (isConvertedToOT == false && attn.fulldayhalfday != 1) {
                await convertWorkingHrstoOT_IfNotPresent(
                  attendancePolicy,
                  attn,
                  createBy,
                  updateByIp,
                  attn.roundOffMinutes,
                  otAdded,
                  monthlyOtCalType,
                  +userData.companyMasterId,
                  null,
                );
              }
            }
          }

          if (attendancePolicy?.isShiftShortfall) {
            const attendanceData = allAttendanceData.filter(
              (e) => e.fulldayhalfday == 1,
            );

            const weekoffSet = new Set(weekoffHoliday.map((e) => e.date));

            for (const att of attendanceData) {
              if (weekoffSet.has(att.AttendanceDate)) continue;

              await shiftShortfallMinutesDeduction(attendancePolicy, att);
            }
          } else {
            await attendanceTransaction.update(
              {
                shiftShortfallMinutes: null,
              },
              {
                where: {
                  userMasterID: user,
                  AttendanceDate: {
                    [Sequelize.Op.between]: [startdate, enddate],
                  },
                },
              },
            );
          }
        }
      } else {
        attendanceVerifyUser.push(user);
      }
    }

    if (shiftSelection != 'auto') {
      // Upadte all users Shift roster which users attendance are not verified between selected dates
      await ShiftRoster.update(
        {
          shiftID: shift.shiftID,
          isFromRoster: false,
        },
        {
          where: {
            userMasterID: {
              [Sequelize.Op.in]: notattendanceVerifyUser,
            },
            shiftRosterDate: {
              [Sequelize.Op.between]: [startdate, enddate],
            },
          },
          individualHooks: true,
          user: req.userDetails,
        },
      );
    }

    // Add remainig dates shift roster

    await ShiftRoster.bulkCreate(addShiftRosterData, {
      individualHooks: true,
      user: req.userDetails,
    });

    let attendanceVerifyUserData;
    let joinedNames;
    if (attendanceVerifyUser.length > 0) {
      attendanceVerifyUserData = await userMaster.findAll({
        where: {
          userMasterID: attendanceVerifyUser,
        },
        attributes: ['displayName'],
      });

      let displayNames = attendanceVerifyUserData.map(
        (user) => user.displayName,
      );
      joinedNames = displayNames.join(', ');
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.shiftValidate,
      data: updated_id,
      notattendanceVerifyUser:
        notattendanceVerifyUser.length > 0
          ? notattendanceVerifyUser.length +
            ' User Shift Validate Successfully.'
          : '',
      attendanceVerifyUserData: joinedNames
        ? joinedNames + ' Attendance is Verify So Shift Can Not Be Change.'
        : '',
    });
  } catch (err) {
    next(err);
  }
};

async function shiftValidatePenaltyGoEary(
  userMasterID,
  startDate,
  endDate,
  attendance,
) {
  const monthArray = await monthStartDateBetween(startDate, endDate);

  for (let i = 0; i < monthArray.length; i++) {
    const salaryPolicy = await employeeSalaryPolicy(
      userMasterID,
      monthArray[i],
    );

    let start_Date;
    let end_Date;

    const month = Number(monthArray[i].substring(5, 7));
    const year = Number(monthArray[i].substring(0, 4));
    let monday = daysInMonth(month, year);

    if (salaryPolicy) {
      const date = salaryPolicy['salaryPolicy.salaryCycleDate'];

      const salary_startdate = date < 10 ? '0' + date : date;

      start_Date = monthArray[i].substring(0, 8) + salary_startdate;

      // To Check salary consider Month

      if (salaryPolicy['salaryPolicy.salaryCycleConsider'] == 'E') {
        const tempDate = new Date(start_Date);
        tempDate.setMonth(tempDate.getMonth() - 1);

        start_Date =
          tempDate.getFullYear() +
          '-' +
          String(tempDate.getMonth() + 1).padStart(2, '0') +
          '-' +
          String(tempDate.getDate()).padStart(2, '0');

        // set Month days
        monday = daysInMonth(start_Date.slice(5, 7), start_Date.slice(0, 4));
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
      start_Date = monthArray[i].substring(0, 8) + '01';

      end_Date = start_Date.substring(0, 8) + monday;
    }

    const monthly_Attendance = await attendanceTransaction.findAll({
      where: {
        userMasterID: userMasterID,
        AttendanceDate: {
          [Sequelize.Op.between]: [start_Date, end_Date],
        },
        isManual: false,
      },
      include: [
        {
          required: false,
          model: UserShortLeave,
          where: { authorizationStatus: 3 },
        },
        {
          model: Shift,
          attributes: ['shiftGrace'],
        },
      ],
      order: [['AttendanceDate', 'ASC']],
    });

    const weekoffHoliday = await weekoffHolidayTran.findAll({
      where: {
        userMasterID,
        date: {
          [Sequelize.Op.between]: [start_Date, end_Date],
        },
        [Sequelize.Op.or]: [
          { optionalHoliday: false },
          { optionalHoliday: null },
        ],
      },
    });

    if (monthly_Attendance.length == 0) return;

    const LateEarlyPolicy = await employeeLateEarlyPolicy(
      monthly_Attendance[0].userMasterID,
      monthly_Attendance[0].AttendanceDate,
    );

    if (LateEarlyPolicy) {
      if (
        LateEarlyPolicy['lateEarlyPolicy.lateEarlyPolicyType'] ==
        LCEGPolicyTypeEnum.COMBINED
      ) {
        await combined_deductionManual(
          monthly_Attendance,
          LateEarlyPolicy,
          weekoffHoliday,
        );
      } else if (
        LateEarlyPolicy['lateEarlyPolicy.lateEarlyPolicyType'] ==
        LCEGPolicyTypeEnum.LC_SHIFT_WISE
      ) {
        await lcShiftWise_deductionManual(
          monthly_Attendance,
          LateEarlyPolicy,
          weekoffHoliday,
        );
      } else {
        await penalty_deductionManual(
          monthly_Attendance,
          LateEarlyPolicy,
          weekoffHoliday,
        );
        await earlyby_deductionManual(
          monthly_Attendance,
          LateEarlyPolicy,
          weekoffHoliday,
        );
      }
    }
  }
}
function getFirstAndLastDateOfMonth(year, month) {
  // Create a date object for the first day of the month
  const firstDate = new Date(year, month - 1, 1);

  // Calculate the last day of the month
  const lastDate = new Date(year, month, 0);

  // Format the dates as 'YYYY-MM-DD' strings
  const formattedFirstDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const formattedLastDate = `${year}-${String(month).padStart(2, '0')}-${String(
    lastDate.getDate(),
  ).padStart(2, '0')}`;

  return {
    firstDate: formattedFirstDate,
    lastDate: formattedLastDate,
  };
}
const dashboardattendanceNEWStatus = {
  PRESENT: 'Present',
  HALF_DAY: 'Half Day',
  ABSENT: 'Absnet',
  WEEKOFF: 'Weekoff',
  HOLIDAY: 'Holiday',
  PRESENT_ON_WEEKOFF: 'Present On Weekoff',
  PRESENT_ON_HOLIDAY: 'Present On Holiday',
  APPROVED_LEAVE: 'Approved Leave',
  PENDING_LEAVE: 'Pending Leave',
  APPROVED_OD: 'Approved OD',
  PENDING_OD: 'Pending OD',
  MISS_PUNCH: 'Miss Punch',
};

exports.dashboardattendanceNEW = async (req, res, next) => {
  try {
    let { companyMasterID, YYYYMM } = req.query;
    YYYYMM = YYYYMM || moment().format('YYYYMM');

    const companyData = await companyMaster.findOne({
      where: {
        companyMasterID,
        status: 1,
      },
    });

    if (!companyData) {
      return res.status(200).json({
        status: 401,
        message: 'Company is Deactivated or Deleted.',
      });
    }

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    const { firstDate, lastDate } = getFirstAndLastDateOfMonth(
      YYYYMM.substring(0, 4),
      YYYYMM.substring(4, 6),
    );

    const datesArray = await getDatesFromDateRange(
      new Date(firstDate),
      new Date(lastDate),
    );

    const monthStart = new Date(firstDate);
    const monthEnd = new Date(lastDate);
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const normalizeDate = (date) => moment(date).format('YYYY-MM-DD');

    const dateKeys = datesArray.map((date) => normalizeDate(date));

    const label = datesArray.map((date) => moment(date).format('DD-MM-YYYY'));

    const AttendanceData1 = [
      { data: [], label: dashboardattendanceNEWStatus.PRESENT },
      { data: [], label: dashboardattendanceNEWStatus.HALF_DAY },
      { data: [], label: dashboardattendanceNEWStatus.MISS_PUNCH },
      { data: [], label: dashboardattendanceNEWStatus.HOLIDAY },
      { data: [], label: dashboardattendanceNEWStatus.WEEKOFF },
      {
        data: [],
        label: dashboardattendanceNEWStatus.PRESENT_ON_WEEKOFF,
      },
      {
        data: [],
        label: dashboardattendanceNEWStatus.PRESENT_ON_HOLIDAY,
      },
      {
        data: [],
        label: dashboardattendanceNEWStatus.APPROVED_LEAVE,
      },
      {
        data: [],
        label: dashboardattendanceNEWStatus.PENDING_LEAVE,
      },
      {
        data: [],
        label: dashboardattendanceNEWStatus.APPROVED_OD,
      },
      {
        data: [],
        label: dashboardattendanceNEWStatus.PENDING_OD,
      },
      { data: [], label: dashboardattendanceNEWStatus.ABSENT },
    ];

    const allActiveUsers = await EmployeeJoiningDetails.findAll({
      raw: true,
      where: {
        joiningDate: { [Sequelize.Op.lte]: monthEnd },
        [Sequelize.Op.or]: [
          { leavingDate: { [Sequelize.Op.gte]: monthStart } },
          {
            leavingDate: { [Sequelize.Op.eq]: null },
          },
        ],
        '$userMaster.companyMasterId$': companyMasterID,
        '$userMaster.status$': [0, 1],
      },
      include: [
        {
          model: userMaster,
          required: true,
          where: { ...userAccessCondition.where },
          include: [...userAccessCondition.includeModels],
        },
      ],
    });

    const allUserIds = allActiveUsers.map((u) => Number(u.userMasterID));

    if (!allUserIds.length) {
      return res.status(200).json({
        status: 200,
        label,
        data: AttendanceData1.map((item) => ({
          ...item,
          data: dateKeys.map(() => 0),
        })),
      });
    }

    const [attendanceRows, weekoffHolidayRows, userleaveRows] =
      await Promise.all([
        attendanceTransaction.findAll({
          raw: true,
          where: {
            userMasterID: allUserIds,
            AttendanceDate: {
              [Sequelize.Op.between]: [monthStart, monthEnd],
            },
          },
          attributes: [
            'userMasterID',
            'AttendanceDate',
            'fulldayhalfday',
            'InDatetime',
            'OutDateTime',
          ],
        }),

        weekoffHolidayTran.findAll({
          raw: true,
          where: {
            userMasterID: allUserIds,
            date: {
              [Sequelize.Op.between]: [monthStart, monthEnd],
            },
            tableName: ['holiday', 'weekoff'],
            [Sequelize.Op.or]: [
              { optionalHoliday: false },
              { optionalHoliday: null },
            ],
          },
          attributes: [
            'userMasterID',
            'date',
            'tableName',
            'WHDayType',
            'value',
          ],
        }),

        UserLeave.findAll({
          where: {
            userMasterID: allUserIds,
            status: 1,
            FromDate: {
              [Sequelize.Op.lte]: monthEnd,
            },
            ToDate: {
              [Sequelize.Op.gte]: monthStart,
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
              attributes: ['LeaveTranId', 'days', 'date', 'status'],
              include: [
                {
                  model: HrLeaveTypes,
                  attributes: ['LeaveID'],
                  include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
                },
              ],
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
        }),
      ]);

    const attendanceMap = new Map();

    for (const att of attendanceRows) {
      const key = `${att.userMasterID}_${normalizeDate(att.AttendanceDate)}`;
      attendanceMap.set(key, att);
    }

    const weekoffHolidayMap = new Map();

    for (const wh of weekoffHolidayRows) {
      const key = `${wh.userMasterID}_${normalizeDate(wh.date)}`;
      weekoffHolidayMap.set(key, wh);
    }

    const leaveMap = new Map();

    for (const leave of userleaveRows) {
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

    for (const dateKey of dateKeys) {
      let presentCount = 0;
      let halfDayCount = 0;
      let missPunchCount = 0;
      let holidayCount = 0;
      let weekoffCount = 0;
      let presentOnWeekoffCount = 0;
      let presentOnHolidayCount = 0;
      let approvedLeaveCount = 0;
      let pendingLeaveCount = 0;
      let approvedODCount = 0;
      let pendingODCount = 0;
      let absentCount = 0;
      const dateWiseFilteredUserData = allActiveUsers.filter((user) => {
        const employeeJoining = user || null;
        if (employeeJoining) {
          const joiningDate = moment(employeeJoining.joiningDate).format(
            'YYYY-MM-DD',
          );
          const leavingDate = employeeJoining.leavingDate
            ? moment(employeeJoining.leavingDate).format('YYYY-MM-DD')
            : null;
          if (
            joiningDate <= dateKey &&
            (!leavingDate || leavingDate >= dateKey)
          ) {
            return true;
          }
        }
        return false;
      });
      for (const user of dateWiseFilteredUserData) {
        const userId = user.userMasterID;
        let remainingDay = 1;

        const consume = (value) => {
          const allowed = value > remainingDay ? remainingDay : value;
          remainingDay -= allowed;
          return allowed;
        };

        const attendance = attendanceMap.get(`${userId}_${dateKey}`);
        const weekoffHoliday = weekoffHolidayMap.get(`${userId}_${dateKey}`);
        const leaveTransactions = leaveMap.get(`${userId}_${dateKey}`) || [];

        const isWeekoff = weekoffHoliday?.tableName === 'weekoff';
        const isHoliday = weekoffHoliday?.tableName === 'holiday';
        const isWeekoffOrHoliday = isWeekoff || isHoliday;

        const fulldayhalfday = Number(attendance?.fulldayhalfday || 0);

        // 1. LEAVE / OD PRIORITY
        for (const leave of leaveTransactions) {
          let leaveType = null;
          let leaveValue = 0;

          if (leave.authorizationStatus == 3) {
            leaveType = leave?.ult?.[0]?.hrLeaveType?.LeaveID;

            const filteredUserLeaveTrans = (leave?.ult || []).filter((e) =>
              moment(e.date).isSame(moment(dateKey), 'day'),
            );
            leaveValue = (filteredUserLeaveTrans || []).reduce((sum, tran) => {
              return sum + Number(tran.days || 0);
            }, 0);
          } else {
            leaveType = leave?.hrLeaveType?.LeaveID;
            leaveValue = leave?.DayType === 'Full Day' ? 1 : 0.5;
          }

          const isOD = leaveType == 25;
          const consumed = consume(leaveValue);

          if (isOD) {
            if (leave.authorizationStatus == 3) {
              approvedODCount += consumed;
            } else {
              pendingODCount += consumed;
            }
          } else if (leave.authorizationStatus == 3) {
            approvedLeaveCount += consumed;
          } else {
            pendingLeaveCount += consumed;
          }
        }

        // 2. WEEKOFF / HOLIDAY PRIORITY
        if (remainingDay > 0 && weekoffHoliday) {
          const whValue = weekoffHoliday?.WHDayType === 'SH' ? 0.5 : 1;
          const consumed = consume(whValue);

          if (isWeekoff) {
            weekoffCount += consumed;

            if (attendance && fulldayhalfday !== 0) {
              presentOnWeekoffCount += fulldayhalfday;
            }
          } else if (isHoliday) {
            holidayCount += consumed;

            if (attendance && fulldayhalfday !== 0) {
              presentOnHolidayCount += fulldayhalfday;
            }
          }
        }

        // 3. ATTENDANCE PRIORITY
        if (remainingDay > 0 && !isWeekoffOrHoliday) {
          if (
            dateKey === currentDate &&
            attendance?.InDatetime &&
            !attendance?.OutDateTime
          ) {
            presentCount += consume(remainingDay);
          } else if (
            fulldayhalfday === 1 &&
            attendance?.InDatetime &&
            attendance?.OutDateTime
          ) {
            presentCount += consume(1);
          } else if (
            fulldayhalfday === 0.5 &&
            attendance?.InDatetime &&
            attendance?.OutDateTime
          ) {
            halfDayCount += consume(0.5);
          } else if (
            dateKey !== currentDate &&
            attendance?.InDatetime &&
            !attendance?.OutDateTime
          ) {
            missPunchCount += consume(remainingDay);
          }
        }

        // 4. FINAL ABSENT
        if (remainingDay > 0 && !isWeekoffOrHoliday && dateKey <= currentDate) {
          absentCount += remainingDay;
          remainingDay = 0;
        }
      }

      AttendanceData1[0].data.push(presentCount);
      AttendanceData1[1].data.push(halfDayCount);
      AttendanceData1[2].data.push(missPunchCount);
      AttendanceData1[3].data.push(holidayCount);
      AttendanceData1[4].data.push(weekoffCount);
      AttendanceData1[5].data.push(presentOnWeekoffCount);
      AttendanceData1[6].data.push(presentOnHolidayCount);
      AttendanceData1[7].data.push(approvedLeaveCount);
      AttendanceData1[8].data.push(pendingLeaveCount);
      AttendanceData1[9].data.push(approvedODCount);
      AttendanceData1[10].data.push(pendingODCount);
      AttendanceData1[11].data.push(absentCount);
    }

    return res.status(200).json({
      status: 200,
      label,
      data: AttendanceData1,
    });
  } catch (err) {
    next(err);
  }
};

exports.dashboardMisspunchReport = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchID,
      fromDate,
      toDate,
      users,
      page,
      limit,
      exportData,
    } = req.body;

    /** Validate from date and to date */
    if (new Date(fromDate) > new Date(toDate)) {
      return res
        .status(200)
        .json({ status: 401, message: 'Please pass valid date range' });
    }
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    /** Prepare dynamic query for fetching active user */
    const activeUserMasterCondition = {};

    if (users) {
      /** if users length is passed then fetch active user from list */
      activeUserMasterCondition.userMasterID = users;
    } else if (branchID != '' && branchID != null && branchID != 'null') {
      /** if branchId is passed then fetch active user from branc */

      /** Validate branch */
      let getBranch = await BranchMaster.findOne({
        raw: true,
        where: {
          branchMasterID: branchID,
          status: 1,
          '$companyMaster.status$': 1,
        },
        include: [{ model: companyMaster }],
      });

      if (!getBranch) {
        return res
          .status(200)
          .json({ status: 401, message: 'Company or Branch deactivated!' });
      }

      /** Fetch Branch Users */
      const branchWiseUserList = await EmployeeBranch.findAll({
        raw: true,
        where: {
          branchID: branchID,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(fromDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(fromDate),
              },
            },
            {
              endDate: null,
            },
          ],
          status: 1,
        },
        attributes: ['userMasterID'],
      });

      activeUserMasterCondition.userMasterID = branchWiseUserList.map(
        (e) => e.userMasterID,
      );
    } else if (companyMasterID) {
      /** if companyMasterId is passed then get all active user of the company */

      /** Validate company */
      let getCompany = await companyMaster.findOne({
        raw: true,
        where: {
          companyMasterID: companyMasterID,
          status: 1,
        },
      });

      if (!getCompany) {
        return res
          .status(200)
          .json({ status: 401, message: 'Company deactivated or Deleted!' });
      }
      activeUserMasterCondition['$userMaster.companyMasterId$'] =
        companyMasterID;
    } else {
      return res
        .status(200)
        .json({ status: 401, message: 'Please pass valid Parameters' });
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    /** Fetch all active user details */
    const allActiveUsers = await EmployeeJoiningDetails.findAll({
      raw: true,
      where: {
        joiningDate: {
          [Sequelize.Op.lte]: toDate,
        },
        [Sequelize.Op.or]: [
          {
            leavingDate: { [Sequelize.Op.gte]: fromDate },
          },
          {
            leavingDate: { [Sequelize.Op.eq]: null },
            [Sequelize.Op.or]: [
              {
                '$userMaster.deactiveDate$': { [Sequelize.Op.gte]: fromDate },
              },
              {
                '$userMaster.deactiveDate$': { [Sequelize.Op.eq]: null },
              },
            ],
          },
        ],
        '$userMaster.status$': 1,
        ...activeUserMasterCondition,
      },
      include: [
        {
          model: UserMaster,
          required: true,
          where: { ...userAccessCondition.where },
          include: [...userAccessCondition.includeModels],
        },
      ],
      attributes: ['userMasterID'],
      order: [[{ model: UserMaster }, 'displayName', 'ASC']],
    });

    /** If no active user found then send empty response */
    if (!allActiveUsers?.length) {
      return res.status(200).json({ status: 200, data: [], totalcount: 0 });
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    /** Prepare MissPunch Report Attendance Query */
    const condition = {
      userMasterID: allActiveUsers.map((e) => e.userMasterID),
      OutDateTime: { [Sequelize.Op.eq]: null },
      AttendanceDate: {
        [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
        [Sequelize.Op.ne]: new Date().toISOString().slice(0, 10),
      },
    };

    /** Fetch Attendance data for miss punch report */
    const { rows: AttendanceData, count: totalcount } =
      await attendanceTransaction.findAndCountAll({
        where: condition,
        ...paginationQuery,
        order: [['AttendanceDate', 'DESC']],
        attributes: [
          'userMasterID',
          'InDatetime',
          'OutDateTime',
          'AttendanceDate',
          'AttendanceTransID',
          'designationID',
        ],
        include: [
          { model: Department, attributes: ['departmentName'] },
          { model: BranchMaster, attributes: ['branchName'] },
          {
            model: UserMaster,
            where: { ...userAccessCondition.where },
            attributes: [
              'displayName',
              'photo',
              'companyMasterId',
              'userNumber',
            ],
            include: [
              ...userAccessCondition.includeModels,
              {
                model: EmployeeJoiningDetails,
                attributes: ['employeeCode', 'joiningDate'],
              },
              {
                required: false,
                model: EmployeeDesignation,
                where: {
                  status: 1,
                  applicableDate: {
                    [Sequelize.Op.lte]: Sequelize.col('AttendanceDate'),
                  },
                  [Sequelize.Op.or]: [
                    {
                      endDate: {
                        [Sequelize.Op.gte]: Sequelize.col('AttendanceDate'),
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
        ],
      });

    if (true == exportData) {
      const finalData = [];

      for (const item of AttendanceData) {
        const tempObj = {
          'Employee Code':
            item.userMaster?.employeeJoiningDetails?.[0]?.employeeCode || '',
          Name: item.userMaster?.displayName || '',
          Number: item.userMaster?.userNumber || '',
          Branch: item.branchMaster?.branchName || '',
          Department: item.department?.departmentName || '',
          Designation:
            item.userMaster?.employeeDesignations?.[0]?.designation
              ?.designationName || '',
          Division: parseEmployeeInfo(item.userMaster)?.division,
          'Working Area': parseEmployeeInfo(item.userMaster)?.workingArea,
          'Joining Date':
            moment(
              item.userMaster?.employeeJoiningDetails?.[0]?.joiningDate,
              'YYYY-MM-DD',
            ).format('DD-MM-YYYY') || '',

          'Mobile Number': item.userMaster?.userNumber || '',
          'Attendance Date': item.AttendanceDate
            ? moment(item.AttendanceDate).format('DD-MM-YYYY')
            : '',
          'Log Date Time': item.InDatetime
            ? moment(item.InDatetime).format('DD-MM-YYYY HH:mm:ss')
            : '',
        };
        finalData.push(tempObj);
      }

      await generateExcelForPunchInPunchOutReport(
        finalData,
        'Miss-Punch-Report',
        'xlsx',
        res,
      );
      return;
    } else {
      /** Map Data */
      for (const item of AttendanceData) {
        if (item?.userMaster?.employeeDesignations) {
          item.designationID =
            item.userMaster.employeeDesignations[0]?.designation
              ?.designationName || '';
        } else {
          item.designationID = '';
        }
        item.dataValues.employeeCode =
          item.userMaster?.employeeJoiningDetails?.[0]?.employeeCode || '';
      }
    }
    return res
      .status(200)
      .json({ status: 200, data: AttendanceData, totalcount });
  } catch (err) {
    next(err);
  }
};

exports.LateComeEarlyGoReport = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      fromDate,
      toDate,
      page,
      limit,
      exportData,
      exportFileType,
      sortField,
    } = req.query;
    const companyID = companyMasterID;

    if (!fromDate || !toDate || !companyID) {
      return res.status(200).json({
        status: 401,
        message:
          'Please provide the "from date," "to date," and "company ID" to proceed.',
      });
    }

    const condition = {};
    condition['$userMaster.companyMasterId$'] = companyID;
    condition.AttendanceDate = {
      [Sequelize.Op.between]: [fromDate, toDate],
    };
    condition[Sequelize.Op.or] = [
      {
        LateBy: { [Sequelize.Op.ne]: null },
        LateBy: { [Sequelize.Op.ne]: '' },
      },
      {
        EarlyBy: { [Sequelize.Op.ne]: null },
        EarlyBy: { [Sequelize.Op.ne]: '' },
      },
    ];
    let order = [];

    if (sortField === orderByEmployeeMasterFields.EMPLOYEECODE) {
      const employeeCodeSubquery = `
  (
    SELECT ejd."employeeCode"
    FROM "employeeJoiningDetails" ejd
    WHERE ejd."userMasterID" = "userMaster"."userMasterID"
    LIMIT 1
  )
  `;

      order = [
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
        [
          Sequelize.literal(`
        CASE
          WHEN ${employeeCodeSubquery} ~ '^[0-9]+$'
          THEN (${employeeCodeSubquery})::int
        END
      `),
          'ASC',
        ],
        [
          Sequelize.literal(`
        substring(${employeeCodeSubquery} FROM '^[^0-9]+')
      `),
          'ASC',
        ],
        [
          Sequelize.literal(`
        CASE
          WHEN ${employeeCodeSubquery} ~ '[0-9]+'
          THEN substring(${employeeCodeSubquery} FROM '[0-9]+')::int
        END
      `),
          'ASC',
        ],
        [Sequelize.literal(`${employeeCodeSubquery}`), 'ASC'],

        [Sequelize.col('userMaster.displayName'), 'ASC'],
        [Sequelize.col('attendanceTransaction.AttendanceDate'), 'DESC'],
      ];
    } else if (sortField == orderByEmployeeMasterFields.EMPLOYEENAME) {
      // Employee Name sorting
      order = [
        [Sequelize.col('userMaster.displayName'), 'ASC'],
        [Sequelize.col('attendanceTransaction.AttendanceDate'), 'DESC'],
      ];
    } else {
      order = [
        [Sequelize.col('attendanceTransaction.AttendanceDate'), 'DESC'],
        [Sequelize.col('userMaster.displayName'), 'ASC'],
      ];
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    // const order = [['AttendanceDate', 'ASC']];
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const AttendanceData = await attendanceTransaction.findAndCountAll({
      distinct: true,
      // raw: true,
      subQuery: false,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: UserMaster,
          required: true,
          where: { ...userAccessCondition.where, status: [0, 1] },
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode', 'salarytype'],
            },
          ],
        },
      ],
    });

    if (exportData) {
      const Staff = [];
      const Wages = [];
      const Others = [];

      var s = 1,
        w = 1,
        o = 1;

      const shiftIds = [...new Set(AttendanceData.rows.map((e) => +e.Shift))];

      const getAllShift = await Shift.findAll({
        where: {
          shiftID: shiftIds,
        },
      });

      const lateEarlyAllUsers_Count_Array = [];

      for (let item of AttendanceData.rows) {
        const getShift = getAllShift.find((e) => +e.shiftID == +item.Shift);

        let lateearly = '',
          no;
        if (item.LateBy && item.EarlyBy) lateearly = 'Late In/ Early out';
        else if (item.LateBy) lateearly = 'Late In';
        else if (item.EarlyBy) lateearly = 'Early out';

        const financialYearDatesResult = financialYearDates(toDate);

        const already_findData = lateEarlyAllUsers_Count_Array.find(
          (e) => e.userMasterID == item.userMasterID,
        );

        if (already_findData) {
          no = +already_findData.lateByCount + +already_findData.earlyByCount;
        } else {
          const LatebyCount = await attendanceTransaction.count({
            raw: true,
            where: {
              LateBy: { [Sequelize.Op.ne]: null },
              LateBy: { [Sequelize.Op.ne]: '' },
              AttendanceDate: {
                [Sequelize.Op.between]: [
                  financialYearDatesResult.start,
                  financialYearDatesResult.end,
                ],
              },
              userMasterID: item.userMasterID,
            },
            include: [
              {
                model: UserMaster,
                // attributes: ['displayName', 'userNumber', 'companyMasterId'],
                required: true,
                where: { ...userAccessCondition.where },
                include: [...userAccessCondition.includeModels],
              },
            ],
            attributes: ['AttendanceDate'],
            group: ['AttendanceDate'],
          });

          const EarlybyCount = await attendanceTransaction.count({
            raw: true,
            where: {
              EarlyBy: { [Sequelize.Op.ne]: null },
              EarlyBy: { [Sequelize.Op.ne]: '' },
              AttendanceDate: {
                [Sequelize.Op.between]: [
                  financialYearDatesResult.start,
                  financialYearDatesResult.end,
                ],
              },
              userMasterID: item.userMasterID,
            },
            include: [
              {
                model: UserMaster,
                // attributes: ['displayName', 'userNumber', 'companyMasterId'],
                required: true,
                where: { ...userAccessCondition.where },
                include: [...userAccessCondition.includeModels],
              },
            ],
            attributes: ['AttendanceDate'],
            group: ['AttendanceDate'],
          });

          lateEarlyAllUsers_Count_Array.push({
            userMasterID: item.userMasterID,
            lateByCount: LatebyCount.length,
            earlyByCount: EarlybyCount.length,
          });

          no = LatebyCount.length + EarlybyCount.length;
        }

        let type = null;
        let employeeCode = '';
        const joining =
          item.userMaster.employeeJoiningDetails &&
          item.userMaster.employeeJoiningDetails.length > 0
            ? item.userMaster.employeeJoiningDetails[0]
            : null;
        if (joining && joining.salarytype == 'S') type = 'S';
        if (joining && joining.salarytype == 'W') type = 'W';
        if (joining) employeeCode = joining.employeeCode;

        let item1 = {
          'Sr No.': type == 'W' ? w : type == 'S' ? s : o,
          'Employee Code': employeeCode,
          'Name of Employee': item.userMaster.displayName,
          'Number of Employee': item.userMaster.userNumber,
          'Late In/Early Out': lateearly,
          Date: getDDMMYYYYdate(item.AttendanceDate),

          Shift:
            getShift.shiftName +
            '(' +
            item.ShiftIntime +
            ' to ' +
            item.ShiftoutTime +
            ' )',
          In: new Date(
            new Date(item.InDatetime).getTime() -
              new Date(item.InDatetime).getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(11, 19),
          Out: item.OutDateTime
            ? new Date(
                new Date(item.OutDateTime).getTime() -
                  new Date(item.OutDateTime).getTimezoneOffset() * 60000,
              )
                .toISOString()
                .slice(11, 19)
            : '',
          'Late In by(Minutes)': item.LateBy ? item.LateBy : 0,
          'Early Out by(Minutes)': item.EarlyBy ? item.EarlyBy : 0,
          'No. of times Late In/Early out in FY': no,
        };
        type == 'W'
          ? Wages.push(item1)
          : type == 'S'
            ? Staff.push(item1)
            : Others.push(item1);
        type == 'W' ? w++ : type == 'S' ? s++ : o++;
      }

      if (Staff.length == 0 && Wages.length == 0 && Others.length == 0) {
        let item1 = {
          'Sr No.': '',
          'Employee Code': '',
          'Name of Employee': '',
          'Number of Employee': '',
          'Late In/Early Out': '',
          Date: '',
          Shift: '',
          In: '',
          Out: '',
          'Late In by(Minutes)': '',
          'Early Out by(Minutes)': '',
          'No. of times Late In/Early out in FY': '',
        };
        Others.push(item1);
      }

      const finalData = [];
      const Names = [];
      if (Staff.length != 0) finalData.push(Staff), Names.push('Staff');
      if (Wages.length != 0) finalData.push(Wages), Names.push('Wages');
      if (Others.length != 0) finalData.push(Others), Names.push('Others');

      await generateChecklistExcel(
        finalData,
        'LateByEarlyGo',
        'xlsx',
        res,
        Names,
      );
    } else {
      return res.status(200).json({
        status: 200,
        data: AttendanceData.rows,
        totalcount: AttendanceData.count,
      });
    }
  } catch (err) {
    next(err);
  }
};

function financialYearDates(currentDate) {
  const dateObj = new Date(currentDate);
  const startOfYear = new Date(dateObj.getFullYear(), 3, 1);
  const endOfYear = new Date(dateObj.getFullYear() + 1, 2, 31);

  if (dateObj < startOfYear) {
    return {
      start: formatDate(new Date(dateObj.getFullYear() - 1, 3, 1)),
      end: formatDate(new Date(dateObj.getFullYear(), 2, 31)),
    };
  } else {
    return {
      start: formatDate(startOfYear),
      end: formatDate(endOfYear),
    };
  }
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

async function getFomatedData(sortedArray1, user) {
  const absentArray = [];

  let currentRange = null;

  sortedArray1.forEach((date) => {
    if (!currentRange) {
      currentRange = {
        userMasterID: user.userMasterID,
        displayName: user.userMaster.displayName,
        FromDate: date,
        ToDate: date,
        authorizationStatus: 'Absent',
        LeaveDays: 1,
      };
    } else {
      const currentDate = new Date(date);
      const nextExpectedDate = new Date(currentRange.ToDate);
      nextExpectedDate.setDate(nextExpectedDate.getDate() + 1);

      if (currentDate.getTime() === nextExpectedDate.getTime()) {
        currentRange.ToDate = date;
        currentRange.LeaveDays += 1;
      } else {
        absentArray.push({ ...currentRange });
        currentRange = {
          userMasterID: user.userMasterID,
          displayName: user.userMaster.displayName,
          FromDate: date,
          ToDate: date,
          authorizationStatus: 'Absent',
          LeaveDays: 1,
        };
      }
    }
  });

  // Add the last range to the result array
  if (currentRange) {
    absentArray.push({ ...currentRange });
  }

  return absentArray;
}

exports.getLeaveExcel = async (req, res, next) => {
  try {
    let { companyMasterID } = req.query;

    let sendmail = false;

    if (companyMasterID) {
      companyMasterID = [companyMasterID];
    }

    const date = asiaKolkataDateTime(new Date()).slice(0, 10);

    const oneDayBeforedate = new Date(date);
    oneDayBeforedate.setDate(new Date(date).getDate() - 1);

    const dates = await getFinancialYearDatesFromDate(date);

    const startDate = dates.startDate;
    const endDate = dates.endDate;
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    for (const compid of companyMasterID) {
      const leave = await HrLeaveTypes.findAll({
        raw: true,
        where: {
          companyMasterID: compid,
          Leave_Allow: 'Y',
          status: 1,
        },
        include: [
          { model: HrLeaveMaster, as: 'LeaveMaster', attributes: [] },
          { model: companyMaster },
        ],
        attributes: [
          [Sequelize.col('LeaveMaster.LeaveName'), 'LeaveName'],
          [Sequelize.col('companyMaster.companyName'), 'companyName'],
        ],
      });

      const month = month_dict[startDate.slice(5, 7)];

      const firstHeader =
        `${leave.length > 0 ? leave[0].companyName : ''}` +
        ' Leave Update ' +
        `${month}` +
        '-' +
        startDate.slice(0, 4);

      const leaveHeader = leave.map((e) => e.LeaveName).concat('A');

      const startdate = date.slice(0, 8) + '01';

      // set date of after two months

      const inputDate = new Date(startdate);
      inputDate.setMonth(inputDate.getMonth() + 2, inputDate.getDate() - 1);
      let enddate =
        inputDate.getFullYear() +
        '-' +
        ('0' + (inputDate.getMonth() + 1)).slice(-2) +
        '-' +
        ('0' + inputDate.getDate()).slice(-2);

      if (new Date(enddate) > new Date(endDate)) enddate = endDate;

      const userLeave = await UserLeave.findAll({
        raw: true,
        where: {
          status: 1,
          FromDate: { [Sequelize.Op.lte]: enddate },
          ToDate: { [Sequelize.Op.gte]: startdate },
          authorizationStatus: {
            [Sequelize.Op.notIn]: [4],
          },
        },
        include: [
          {
            model: UserMaster,
            where: { companyMasterId: compid, ...userAccessCondition.where },
            required: true,
            attributes: [],
            include: [
              ...userAccessCondition.includeModels,
              { model: EmployeeJoiningDetails, attributes: [] },
            ],
          },
        ],
        attributes: [
          'userMasterID',
          Sequelize.col('userMaster.displayName', 'displayName'),
          'FromDate',
          'ToDate',
          'authorizationStatus',
          'LeaveDays',
          [Sequelize.col('userMaster.deactiveDate'), 'deactiveDate'],
          [
            Sequelize.col('userMaster.employeeJoiningDetails.joiningDate'),
            'joiningDate',
          ],
          [
            Sequelize.col('userMaster.employeeJoiningDetails.leavingDate'),
            'leavingDate',
          ],
        ],
        order: [[{ model: UserMaster }, 'displayName', 'ASC']],
      });

      const beforeEndDate =
        new Date(startdate).getFullYear() +
        '-' +
        ('0' + (new Date(startdate).getMonth() + 1)).slice(-2) +
        '-' +
        ('0' + (new Date(startdate).getDate() - 1)).slice(-2);

      const users = await EmployeeJoiningDetails.findAll({
        where: {
          joiningDate: {
            [Sequelize.Op.lte]: new Date(enddate),
          },
          [Sequelize.Op.or]: [
            {
              leavingDate: { [Sequelize.Op.gte]: new Date(startdate) },
            },
            {
              leavingDate: { [Sequelize.Op.eq]: null },
              [Sequelize.Op.or]: [
                {
                  '$userMaster.deactiveDate$': {
                    [Sequelize.Op.gte]: new Date(startdate),
                  },
                },
                {
                  '$userMaster.deactiveDate$': { [Sequelize.Op.eq]: null },
                },
              ],
            },
          ],
          '$userMaster.companyMasterId$': compid,
          '$userMaster.status$': [0, 1],
        },
        include: [
          {
            model: UserMaster,
            required: true,
            where: { ...userAccessCondition.where },
            include: [
              ...userAccessCondition.includeModels,
              {
                model: EmployeeDepartment,
                where: {
                  status: 1,
                  applicableDate: {
                    [Sequelize.Op.lte]: new Date(oneDayBeforedate),
                  },
                  [Sequelize.Op.or]: [
                    {
                      endDate: {
                        [Sequelize.Op.gte]: new Date(oneDayBeforedate),
                      },
                    },
                    { endDate: { [Sequelize.Op.eq]: null } },
                  ],
                },
                required: false,
                include: [{ model: Department, as: 'department' }],
              },
            ],
          },
        ],
        order: [[{ model: UserMaster }, 'displayName', 'ASC']],
      });

      const isDateInRange = (date, fromdate, todate) =>
        date >= fromdate && date <= todate;

      const final = [];
      const salaryTypeStaff = [];
      const salaryTypeWages = [];
      const SalatTypeNotSet = [];
      let srno = 0;

      for (const user of users) {
        // create startdate and enddate for get data of current month from 1st date to one day before today date

        const fyStartDate =
          new Date(user.joiningDate) > new Date(startdate)
            ? user.joiningDate
            : startdate;
        const fyEndDate = user.leavingDate
          ? new Date(user.leavingDate) < new Date(oneDayBeforedate)
            ? user.leavingDate
            : oneDayBeforedate
          : user.userMaster.deactiveDate
            ? new Date(user.userMaster.deactiveDate) <
              new Date(oneDayBeforedate)
              ? user.userMaster.deactiveDate
              : oneDayBeforedate
            : oneDayBeforedate;

        const attendanceQuery = {
          attributes: ['AttendanceDate'],
          where: {
            userMasterID: user.userMasterID,
            AttendanceDate: {
              [Op.between]: [fyStartDate, fyEndDate],
            },
            fulldayhalfday: {
              [Op.gt]: 0,
            },
          },
          distinct: true,
        };

        const weekoffHolidayQuery = {
          attributes: ['date'],
          where: {
            userMasterID: user.userMasterID,
            date: {
              [Op.between]: [fyStartDate, fyEndDate],
            },
            [Sequelize.Op.or]: [
              { optionalHoliday: false },
              { optionalHoliday: null },
            ],
          },
          distinct: true,
        };

        // Use Promise.all to fetch data concurrently
        const [uniqueDatesFromAttendance, uniqueDatesFromWeekoffHoliday] =
          await Promise.all([
            attendanceTransaction.findAll(attendanceQuery),
            weekoffHolidayTran.findAll(weekoffHolidayQuery),
          ]);

        // Extract unique dates from the results
        const uniqueDatesFromAttendanceSet = new Set(
          uniqueDatesFromAttendance.map((item) => item.AttendanceDate),
        );
        const uniqueDatesFromWeekoffHolidaySet = new Set(
          uniqueDatesFromWeekoffHoliday.map((item) => item.date),
        );

        // Combine the unique dates
        const combinedUniqueDates = [
          ...uniqueDatesFromAttendanceSet,
          ...uniqueDatesFromWeekoffHolidaySet,
        ];

        // get all date from date to todate

        const datesArray = await getDatesFromDateRange(
          new Date(fyStartDate),
          new Date(fyEndDate),
        );

        const formatedDate = datesArray.map((e) =>
          new Date(e).toISOString().slice(0, 10),
        );

        // remove dates from dates array

        const datesArray1 = formatedDate.filter(
          (date) => !combinedUniqueDates.includes(date),
        );

        const leavedata = userLeave.filter(
          (e) => e.userMasterID == user.userMasterID,
        );

        // Remove dates from array1 that occur in the range of fromdate and todate in array2
        const filteredAbsent = datesArray1.filter(
          (date) =>
            !leavedata.some((obj) =>
              isDateInRange(date, obj.FromDate, obj.ToDate),
            ),
        );

        // Sort array1 in ascending order
        const sortedArray1 = filteredAbsent.sort(
          (a, b) => new Date(a) - new Date(b),
        );

        const absentArray = await getFomatedData(sortedArray1, user);

        if (leavedata.length > 0 || absentArray.length > 0) {
          srno++;

          const approvedleave = await UserLeaveTransaction.findAll({
            raw: true,
            where: {
              date: {
                [Sequelize.Op.between]: [startDate, beforeEndDate],
              },
              status: 1,
            },
            include: [
              {
                model: UserLeave,
                where: { userMasterID: user.userMasterID },
                attributes: [],
              },
              {
                model: HrLeaveTypes,
                include: [
                  { model: HrLeaveMaster, as: 'LeaveMaster', attributes: [] },
                ],
                attributes: [],
              },
            ],
            group: [
              'userLeave.userMasterID',
              'userLeaveTransaction.LeaveTranId',
              'hrLeaveType.LeaveMaster.LeaveName',
            ],
            attributes: [
              [Sequelize.col('userLeave.userMasterID'), 'userMasterID'],
              [Sequelize.col('hrLeaveType.LeaveMaster.LeaveName'), 'LeaveName'],
              [
                Sequelize.fn('SUM', Sequelize.literal('COALESCE("days", 0)')),
                'totalDays',
              ],
            ],
          });

          // to get financial data

          const fyStartDate1 =
            new Date(user.joiningDate) > new Date(startDate)
              ? user.joiningDate
              : startDate;
          const fyEndDate1 = user.leavingDate
            ? new Date(user.leavingDate) < new Date(oneDayBeforedate)
              ? user.leavingDate
              : oneDayBeforedate
            : user.userMaster.deactiveDate
              ? new Date(user.userMaster.deactiveDate) <
                new Date(oneDayBeforedate)
                ? user.userMaster.deactiveDate
                : oneDayBeforedate
              : oneDayBeforedate;

          const [attendance, weekoffholiday, leavedata1] = await Promise.all([
            attendanceTransaction.findAll({
              raw: true,
              where: {
                userMasterID: user.userMasterID,
                AttendanceDate: {
                  [Sequelize.Op.between]: [fyStartDate1, fyEndDate1],
                },
              },

              attributes: [
                [
                  Sequelize.fn(
                    'SUM',
                    Sequelize.literal('COALESCE("fulldayhalfday", 0)'),
                  ),
                  'days',
                ],
                [
                  Sequelize.fn(
                    'SUM',
                    Sequelize.literal(
                      `CASE WHEN "LateBy" <> '' THEN 1 ELSE 0 END`,
                    ),
                  ),
                  'lateDays',
                ],
                [
                  Sequelize.fn(
                    'SUM',
                    Sequelize.literal(
                      `CASE WHEN "EarlyBy" <> '' THEN 1 ELSE 0 END`,
                    ),
                  ),
                  'earlyDays',
                ],
              ],
            }),

            weekoffHolidayTran.findAll({
              raw: true,
              where: {
                userMasterID: user.userMasterID,
                date: {
                  [Sequelize.Op.between]: [fyStartDate1, fyEndDate1],
                },
                [Sequelize.Op.or]: [
                  { optionalHoliday: false },
                  { optionalHoliday: null },
                ],
              },
              attributes: [
                [
                  Sequelize.fn(
                    'SUM',
                    Sequelize.literal('COALESCE("value", 0)'),
                  ),
                  'days',
                ],
              ],
            }),

            UserLeave.findAll({
              raw: true,
              where: {
                userMasterID: user.userMasterID,
                status: 1,
                FromDate: { [Sequelize.Op.lte]: fyEndDate1 },
                ToDate: { [Sequelize.Op.gte]: fyStartDate1 },
              },
              attributes: [
                [
                  Sequelize.fn(
                    'SUM',
                    Sequelize.literal('COALESCE("LeaveDays", 0)'),
                  ),
                  'days',
                ],
              ],
            }),
          ]);

          const totalDays =
            (new Date(fyEndDate1) - new Date(fyStartDate1)) /
            (1000 * 60 * 60 * 24);

          const finalAbsentDays =
            +totalDays -
            (attendance.length > 0 ? +attendance[0].days : 0) -
            (weekoffholiday.length > 0 ? +weekoffholiday[0].days : 0) -
            (leavedata1.length > 0 ? +leavedata1[0].days : 0);

          const lC_Eg =
            attendance.length > 0
              ? +attendance[0].lateDays + +attendance[0].earlyDays
              : 0;

          const department =
            user.userMaster.employeeDepartments &&
            user.userMaster.employeeDepartments.length > 0
              ? user.userMaster.employeeDepartments[0]
              : null;

          const result = {};

          leaveHeader.forEach((value) => {
            const foundItem = approvedleave.find(
              (item) => item.LeaveName == value,
            );
            result[value] = foundItem ? foundItem.totalDays : '';
          });

          // merge both array

          const data = [...leavedata, ...absentArray];

          data.map((c) => {
            const data = {
              SrNo: srno,
              displayName: c.displayName,
              department: department
                ? department.department.departmentName
                : '',
              FromDate: getDDMMYYYYdate(c.FromDate),
              toDate: getDDMMYYYYdate(c.ToDate),
              authorizationStatus:
                c.authorizationStatus == 3
                  ? 'Accepted'
                  : c.authorizationStatus == 'Absent'
                    ? 'Absent'
                    : 'Pending',
              days: c.LeaveDays,
            };

            const finalObject = { ...data, ...result };

            finalObject['finalAbsentDays'] =
              +finalAbsentDays > 0 ? finalAbsentDays : 0;
            finalObject['lCEG'] = lC_Eg;

            if (user.salarytype == 'S') {
              salaryTypeStaff.push(finalObject);
            } else if (user.salarytype == 'W') {
              salaryTypeWages.push(finalObject);
            } else {
              SalatTypeNotSet.push(finalObject);
            }
          });
        }
      }

      const arraysToCheck = [salaryTypeStaff, salaryTypeWages, SalatTypeNotSet];

      for (const array of arraysToCheck) {
        if (array.length > 0) {
          final.push(array);
        }
      }

      if (+final.length === 0 && sendmail == false) {
        return res.status(200).json({
          message: 'No data found to export!',
        });
      }

      await generateExcelForLeave(
        final,
        firstHeader,
        leaveHeader,
        compid,
        sendmail,
        oneDayBeforedate,
        'FY Wise Leave Report' + `${oneDayBeforedate}`,
        'xlsx',
        res,
        ['Staff', 'Wages', 'Others'],
      );
    }

    if (sendmail == true) {
      return res.status(200).json({
        status: 200,
        message: 'Mail sent successfully.',
      });
    }
    return;
  } catch (err) {
    next(err);
  }
};

exports.getDailyHourlyReport = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      userMasterID,
      startDate,
      endDate,
      exportData,
      exportFileType,
      sortField,
    } = await req.body;

    const paginationQuery = !exportData
      ? page && limit
        ? { offset: (page - 1) * limit, limit }
        : {}
      : {};

    const orderByFields = getOrderByFields(sortField);

    const userData = await UserMaster.findAll({
      distinct: true,
      where: {
        userMasterID: {
          [Sequelize.Op.in]: userMasterID,
        },
      },
      ...paginationQuery,
      include: [
        {
          required: false,
          model: attendanceTransaction,
          where: {
            AttendanceDate: {
              [Sequelize.Op.between]: [new Date(startDate), new Date(endDate)],
            },
          },
        },
        {
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(endDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
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
            applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(endDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
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
            applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(endDate) } },
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
            startDate: { [Sequelize.Op.lte]: endDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: endDate } },
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
          model: EmployeeWorkingArea,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: endDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: endDate } },
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
          model: EmployeeJoiningDetails,
          attributes: ['employeeCode'],
        },
      ],
      attributes: ['displayName', 'userNumber', 'userMasterID'],
      order: orderByFields,
    });

    const datesArray = await getDatesFromDateRange(
      new Date(startDate),
      new Date(endDate),
    );
    const finalData = [];
    for (var user of userData) {
      const tempData = {};

      const allAttendance = user.attendanceTransactions || [];

      tempData['Employee Name'] = user.displayName;
      tempData['Employee Number'] = user.userNumber;
      tempData['Employee Code'] =
        user.employeeJoiningDetails?.[0]?.employeeCode || '';
      tempData['Employee Branch'] =
        user.employeeBranches?.[0]?.branchMaster?.branchName || '';
      tempData['Employee Department'] =
        user.employeeDepartments?.[0]?.department?.departmentName || '';
      tempData['Employee Designation'] =
        user.employeeDesignations?.[0]?.designation?.designationName || '';
      tempData['Employee Division'] =
        user.employeeDivisions?.[0]?.division?.divisionName || '';
      tempData['Employee Working Area'] =
        user.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName || '';
      let totalDays = 0,
        totalHrs = 0;

      for (const date of datesArray) {
        const attendance = allAttendance.find(
          (e) =>
            new Date(e.AttendanceDate).getTime() == new Date(date).getTime(),
        );

        if (!attendance) {
          tempData[
            new Date(date).toLocaleDateString('en-GB').replace(/\//g, '-')
          ] = 0;
          continue;
        }

        if (attendance.fulldayhalfday == 1 || attendance.fulldayhalfday == 0.5)
          totalDays++;

        tempData[
          new Date(attendance.AttendanceDate)
            .toLocaleDateString('en-GB')
            .replace(/\//g, '-')
        ] = toHoursAndMinutes(+attendance.roundOffMinutes);
        totalHrs += +attendance.roundOffMinutes;
      }
      tempData['Total Days'] = totalDays;
      tempData['Total Hrs'] = toHoursAndMinutes(+totalHrs);

      finalData.push(tempData);
    }

    if (exportData) {
      await generateExcel(
        finalData,
        'Daily Hourly Report',
        exportFileType,
        res,
      );
      return;
    }

    return res
      .status(200)
      .json({ status: 200, data: finalData, totalcount: userMasterID.length });
  } catch (err) {
    next(err);
  }
};

exports.getPerDayCostDepartmentWise = async (req, res, next) => {
  try {
    let { companyMasterID, month, branchMasterID } = req.query;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const date =
      new Date().getFullYear() +
      '-' +
      ('0' + (new Date().getMonth() + 1)).slice(-2) +
      '-' +
      ('0' + new Date().getDate()).slice(-2);

    if (month && month > date.slice(0, 4) + date.slice(5, 7)) {
      return res.status(200).json({
        status: 401,
        message: 'You can not select future month!',
      });
    }

    // let companyMasterID;
    let sendmail = false;

    if (companyMasterID) {
      companyMasterID = [companyMasterID];
    } else {
      sendmail = true;

      const allCompany = await RolePermission.findAll({
        raw: true,
        include: [
          { model: RoleMaster, attributes: [] },
          {
            model: FormMaster,
            where: { formName: 'DailyCostReport' },
            attributes: [],
          },
        ],
        attributes: [
          [Sequelize.col('roleMaster.roleMasterID'), 'roleMasterID'],
          [Sequelize.col('roleMaster.companyMasterID'), 'companyMasterID'],
        ],
      });

      const companyids = allCompany.map((item) => +item.companyMasterID);

      const findNotificationPolicy = await notificationPolicy.findAll({
        raw: true,
        where: {
          companyMasterID: {
            [Sequelize.Op.in]: companyids,
          },
          status: 1,
        },
        attributes: [[Sequelize.col('companyMasterID'), 'companyMasterID']],
      });

      companyMasterID = findNotificationPolicy.map(
        (item) => +item.companyMasterID,
      );
    }

    let oneDayBeforedate =
      new Date().getFullYear() +
      '-' +
      ('0' + (new Date().getMonth() + 1)).slice(-2) +
      '-' +
      ('0' + (new Date().getDate() - 1)).slice(-2);

    if (month) {
      if (month < date.slice(0, 4) + date.slice(5, 7)) {
        oneDayBeforedate =
          month.slice(0, 4) +
          '-' +
          month.slice(4, 6) +
          '-' +
          daysInMonth(month.slice(4, 6), month.slice(0, 4));
      }
    }

    const month1 = oneDayBeforedate.slice(0, 4) + oneDayBeforedate.slice(5, 7);

    const startDate = oneDayBeforedate.slice(0, 8) + '01';
    const endDate =
      oneDayBeforedate.slice(0, 8) +
      daysInMonth(oneDayBeforedate.slice(5, 7), oneDayBeforedate.slice(0, 4));

    const headerMonth =
      month_dict[oneDayBeforedate.slice(5, 7)] +
      ' ' +
      oneDayBeforedate.slice(0, 4);

    const dates = await getDatesFromDateRange(
      new Date(startDate),
      new Date(endDate),
    );

    const daysInmonth = daysInMonth(
      oneDayBeforedate.slice(5, 7),
      oneDayBeforedate.slice(0, 4),
    );

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    for (const compId of companyMasterID) {
      const department = await Department.findAll({
        where: {
          companyMasterID: compId,
          status: 1,
        },
      });

      const allShift = await Shift.findAll({
        where: {
          companyMasterID,
          status: 1,
        },
        include: [
          {
            required: false,
            model: shiftTime,
          },
        ],
      });

      const wagesfinalData = [],
        stafffinalData = [],
        otherfinalData = [];
      const datesArray = Array.from(
        { length: daysInmonth },
        (_, index) => index + 1,
      );

      const departId = department.map((e) => e.departmentId);

      const employeeDepartment = await EmployeeDepartment.findAll({
        where: {
          departmentID: {
            [Sequelize.Op.in]: departId,
          },
          applicableDate: {
            [Sequelize.Op.lte]: new Date(endDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(endDate),
              },
            },
            {
              endDate: null,
            },
          ],
          status: 1,
        },
        include: [
          {
            required: true,
            model: UserMaster,
            as: 'employee',
            where: { ...where },
            attributes: ['userMasterID'],
            include: [...includeModels],
          },
        ],
      });

      const allActiveUsersID = employeeDepartment.map((e) => e.userMasterID);

      const allUsers = await EmployeeJoiningDetails.findAll({
        where: {
          joiningDate: {
            [Sequelize.Op.lte]: new Date(endDate),
          },
          [Sequelize.Op.or]: [
            {
              leavingDate: { [Sequelize.Op.gte]: new Date(endDate) },
            },
            {
              leavingDate: { [Sequelize.Op.eq]: null },
              [Sequelize.Op.or]: [
                {
                  '$userMaster.deactiveDate$': {
                    [Sequelize.Op.gte]: new Date(endDate),
                  },
                },
                {
                  '$userMaster.deactiveDate$': { [Sequelize.Op.eq]: null },
                },
              ],
            },
          ],
          userMasterID: allActiveUsersID,
          '$userMaster.status$': 1,
        },
        include: [
          {
            model: UserMaster,
            required: true,
            where: { ...where },
            include: [
              ...includeModels,
              {
                model: EmployeeAttendancePolicy,
                where: {
                  status: 1,
                  startDate: {
                    [Sequelize.Op.lte]: new Date(endDate),
                  },
                  [Sequelize.Op.or]: [
                    {
                      endDate: {
                        [Sequelize.Op.gte]: new Date(endDate),
                      },
                    },
                    { endDate: { [Sequelize.Op.eq]: null } },
                  ],
                },
                attributes: ['attendancePolicyID'],
                required: false,
                include: [{ model: AttendancePolicy, as: 'attendancePolicy' }],
              },
              {
                model: EmployeeShift,
                where: {
                  status: 1,
                  startDate: {
                    [Sequelize.Op.lte]: new Date(endDate),
                  },
                  [Sequelize.Op.or]: [
                    {
                      endDate: {
                        [Sequelize.Op.gte]: new Date(endDate),
                      },
                    },
                    { endDate: { [Sequelize.Op.eq]: null } },
                  ],
                },
                required: false,
              },
              {
                model: EmployeeBranch,
                where: {
                  status: 1,
                  ...(branchMasterID && {
                    branchID: branchMasterID,
                  }),
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
                required: branchMasterID ? true : false,
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

      allUsers.forEach((row) => {
        const deptData = employeeDepartment.find(
          (user) => user.userMasterID === row.userMasterID,
        );
        if (deptData) {
          row.departmentId = deptData.departmentID;
        }
      });

      const allUsersId = allUsers.map((e) => e.userMasterID);

      const usersalaryData = [];

      const [weekOffs, attendanceData, overtimeData, leaveData] =
        await Promise.all([
          weekoffHolidayTran.findAll({
            where: {
              userMasterID: {
                [Sequelize.Op.in]: allUsersId,
              },
              date: {
                [Sequelize.Op.between]: [startDate, endDate],
              },
              [Sequelize.Op.or]: [
                { optionalHoliday: false },
                { optionalHoliday: null },
              ],
            },
          }),

          attendanceTransaction.findAll({
            where: {
              userMasterID: {
                [Sequelize.Op.in]: allUsersId,
              },
              AttendanceDate: {
                [Sequelize.Op.between]: [startDate, endDate],
              },
            },
          }),
          overTimeCalculation.findAll({
            where: {
              UserMasterID: {
                [Sequelize.Op.in]: allUsersId,
              },
              OverTimeDate: {
                [Sequelize.Op.between]: [startDate, endDate],
              },
              AuthorizationRequired: 3,
            },
          }),

          UserLeaveTransaction.findAll({
            where: {
              date: {
                [Sequelize.Op.between]: [startDate, endDate],
              },
              status: 1,
            },
            include: [
              {
                required: true,
                model: UserLeave,
                where: {
                  userMasterID: allUsersId,
                  authorizationStatus: 3,
                  status: 1,
                },
              },
            ],
          }),
        ]);

      for (const dep of department) {
        const otherfinalAmount = [],
          wagesfinalAmount = [],
          stafffinalAmount = [];

        const Wagesfinal = {
          department: dep.departmentName,
          amount: wagesfinalAmount,
        };
        const stafffinal = {
          department: dep.departmentName,
          amount: stafffinalAmount,
        };
        const otherfinal = {
          department: dep.departmentName,
          amount: otherfinalAmount,
        };

        const users = allUsers.filter(
          (e) => e.departmentId == dep.departmentId,
        );

        for (const date of dates) {
          // let totalSalaryAmount = 0;
          let totalWagesSalaryAmount = 0,
            totalStaffSalaryAmount = 0,
            totalOtherAmount = 0;
          const currentDate = date.toISOString().slice(0, 10);

          if (new Date(currentDate) <= new Date(oneDayBeforedate)) {
            const final = await Promise.all(
              users.map(async (user) => {
                const usersalarystoredata = usersalaryData.find(
                  (e) => e.userId == user.userMasterID,
                );

                let gross = 0,
                  salaryStructureType;

                if (usersalarystoredata) {
                  gross = +usersalarystoredata.grossAmount;
                  salaryStructureType = usersalarystoredata.salaryStructureType;
                } else {
                  const usersalary = await getUserSalaryMasterByMonth(
                    user.userMasterID,
                    month1,
                  );

                  if (+usersalary.length > 0) {
                    gross =
                      usersalary.find((e) => e.payheadMasterId == 50)
                        ?.EmployeeSalaryAmount || 0;

                    salaryStructureType = usersalary[0].baseOnCalculation;

                    usersalaryData.push({
                      userId: user.userMasterID,
                      grossAmount: +gross,
                      salaryStructureType: salaryStructureType,
                    });
                  }
                }

                if (+gross > 0) {
                  let todivideSalary = daysInmonth;

                  if (user.salaryCalculationAct == 'F') {
                    const userWeekOffSum = weekOffs
                      .filter(
                        (e) =>
                          e.userMasterID == user.userMasterID &&
                          e.tableName == 'weekoff',
                      )
                      .reduce((acc, obj) => acc + +obj.value, 0);

                    todivideSalary = +todivideSalary - +userWeekOffSum;
                  }

                  let todividePerdaysalary = 0;

                  const userWeekoff = weekOffs.find(
                    (e) =>
                      e.userMasterID == user.userMasterID &&
                      e.date == currentDate,
                  );

                  const attendancePolicy =
                    user.userMaster.employeeAttendancePolicies &&
                    user.userMaster.employeeAttendancePolicies.length > 0
                      ? user.userMaster.employeeAttendancePolicies[0]
                          .attendancePolicy
                      : null;

                  if (attendancePolicy) {
                    todividePerdaysalary = +attendancePolicy.overtimeHrs;
                  }

                  if (
                    salaryStructureType == 'M' ||
                    salaryStructureType == 'D'
                  ) {
                    let oneDaySalary =
                      salaryStructureType == 'M'
                        ? +gross / +todivideSalary
                        : salaryStructureType == 'D'
                          ? +gross
                          : 0;

                    if (userWeekoff) {
                      if (user.salaryCalculationAct == 'S') {
                        if (user.salarytype == workerTypesEnum.COMPANY_WORKER)
                          totalWagesSalaryAmount +=
                            +userWeekoff.value * +oneDaySalary;
                        else if (
                          user.salarytype == workerTypesEnum.COMPANY_STAFF
                        )
                          totalStaffSalaryAmount +=
                            +userWeekoff.value * +oneDaySalary;
                        else
                          totalOtherAmount +=
                            +userWeekoff.value * +oneDaySalary;
                      }
                    } else {
                      const attendance = attendanceData.find(
                        (e) =>
                          e.userMasterID == user.userMasterID &&
                          e.AttendanceDate == currentDate,
                      );

                      if (user.salarytype == workerTypesEnum.COMPANY_WORKER)
                        totalWagesSalaryAmount += attendance
                          ? +attendance.fulldayhalfday * +oneDaySalary
                          : 0;
                      else if (user.salarytype == workerTypesEnum.COMPANY_STAFF)
                        totalStaffSalaryAmount += attendance
                          ? +attendance.fulldayhalfday * +oneDaySalary
                          : 0;
                      else
                        totalOtherAmount += attendance
                          ? +attendance.fulldayhalfday * +oneDaySalary
                          : 0;
                    }

                    const perminuteSalary =
                      +todividePerdaysalary > 0
                        ? +oneDaySalary / +todividePerdaysalary
                        : +oneDaySalary / 480;

                    const ot = overtimeData.find(
                      (e) =>
                        e.UserMasterID == user.userMasterID &&
                        e.OverTimeDate == currentDate,
                    );

                    if (user.salarytype == workerTypesEnum.COMPANY_WORKER)
                      totalWagesSalaryAmount += ot
                        ? +ot.UpdateOverTimeHourAndMin * +perminuteSalary
                        : 0;
                    else if (user.salarytype == workerTypesEnum.COMPANY_STAFF)
                      totalStaffSalaryAmount += ot
                        ? +ot.UpdateOverTimeHourAndMin * +perminuteSalary
                        : 0;
                    else
                      totalOtherAmount += ot
                        ? +ot.UpdateOverTimeHourAndMin * +perminuteSalary
                        : 0;

                    const leave = leaveData
                      .filter(
                        (e) =>
                          e.userLeave.userMasterID == user.userMasterID &&
                          e.date == currentDate,
                      )
                      .reduce((acc, obj) => acc + +obj.days, 0);

                    if (user.salarytype == workerTypesEnum.COMPANY_WORKER)
                      totalWagesSalaryAmount += +leave * +oneDaySalary;
                    else if (user.salarytype == workerTypesEnum.COMPANY_STAFF)
                      totalStaffSalaryAmount += +leave * +oneDaySalary;
                    else totalOtherAmount += +leave * +oneDaySalary;
                  }

                  if (salaryStructureType == 'H') {
                    let onedaysalary = 0;

                    const userShift =
                      user.userMaster.employeeShifts &&
                      user.userMaster.employeeShifts.length > 0
                        ? user.userMaster.employeeShifts[0]
                        : null;

                    let day = new Date(date).toLocaleString('en-us', {
                      weekday: 'long',
                    });

                    if (userShift) {
                      const shiftData = allShift.find(
                        (e) => e.shiftID == userShift.shiftsID[0],
                      );
                      if (shiftData) {
                        const shift =
                          shiftData.shiftTimes &&
                          shiftData.shiftTimes.length > 0
                            ? shiftData.shiftTimes.find((e) => e.day == day)
                            : null;
                        if (shift) onedaysalary = +shift.shiftHrs * +gross;
                      }
                    }

                    if (userWeekoff) {
                      if (user.salaryCalculationAct == 'S') {
                        if (user.salarytype == workerTypesEnum.COMPANY_WORKER)
                          totalWagesSalaryAmount +=
                            +userWeekoff.value * +onedaysalary;
                        else if (
                          user.salarytype == workerTypesEnum.COMPANY_STAFF
                        )
                          totalStaffSalaryAmount +=
                            +userWeekoff.value * +onedaysalary;
                        else
                          totalOtherAmount +=
                            +userWeekoff.value * +onedaysalary;
                      }
                    } else {
                      const attendance = attendanceData.find(
                        (e) =>
                          e.userMasterID == user.userMasterID &&
                          e.AttendanceDate == currentDate,
                      );

                      if (user.salarytype == workerTypesEnum.COMPANY_WORKER)
                        totalWagesSalaryAmount += attendance
                          ? +attendance.InHrs * (+gross / 60)
                          : 0;
                      else if (user.salarytype == workerTypesEnum.COMPANY_STAFF)
                        totalStaffSalaryAmount += attendance
                          ? +attendance.InHrs * (+gross / 60)
                          : 0;
                      else
                        totalOtherAmount += attendance
                          ? +attendance.InHrs * (+gross / 60)
                          : 0;

                      const leave = leaveData
                        .filter(
                          (e) =>
                            e.userLeave.userMasterID == user.userMasterID &&
                            e.date == currentDate,
                        )
                        .reduce((acc, obj) => acc + +obj.days, 0);

                      if (user.salarytype == workerTypesEnum.COMPANY_WORKER)
                        totalWagesSalaryAmount += +leave * +onedaysalary;
                      else if (user.salarytype == workerTypesEnum.COMPANY_STAFF)
                        totalStaffSalaryAmount += +leave * +onedaysalary;
                      else totalOtherAmount += +leave * +onedaysalary;
                    }
                  }
                }
                return;
              }),
            );

            totalWagesSalaryAmount = totalWagesSalaryAmount
              ? Number.isInteger(+totalWagesSalaryAmount)
                ? +(+totalWagesSalaryAmount).toFixed(0)
                : +(+totalWagesSalaryAmount) % 1 === 0.2
                  ? +(+totalWagesSalaryAmount).toFixed(1)
                  : +(+totalWagesSalaryAmount).toFixed(2)
              : 0;

            totalStaffSalaryAmount = totalStaffSalaryAmount
              ? Number.isInteger(+totalStaffSalaryAmount)
                ? +(+totalStaffSalaryAmount).toFixed(0)
                : +(+totalStaffSalaryAmount) % 1 === 0.2
                  ? +(+totalStaffSalaryAmount).toFixed(1)
                  : +(+totalStaffSalaryAmount).toFixed(2)
              : 0;

            totalOtherAmount = totalOtherAmount
              ? Number.isInteger(+totalOtherAmount)
                ? +(+totalOtherAmount).toFixed(0)
                : +(+totalOtherAmount) % 1 === 0.2
                  ? +(+totalOtherAmount).toFixed(1)
                  : +(+totalOtherAmount).toFixed(2)
              : 0;
          }
          wagesfinalAmount.push(totalWagesSalaryAmount);
          stafffinalAmount.push(totalStaffSalaryAmount);
          otherfinalAmount.push(totalOtherAmount);
        }

        wagesfinalData.push(Wagesfinal);
        stafffinalData.push(stafffinal);
        otherfinalData.push(otherfinal);
      }

      const finalData = [];

      finalData.push(wagesfinalData, stafffinalData, otherfinalData);

      if (+finalData.length === 0) {
        return res.status(200).json({
          message: 'No data found to export!',
        });
      }

      const wagessumArray = Array.from(
        { length: wagesfinalData[0].amount.length },
        () => 0,
      );

      // Calculate the sum of amounts index-wise
      wagesfinalData.forEach((department) => {
        department.amount.forEach((amount, index) => {
          wagessumArray[index] += amount;
        });
      });

      const staffsumArray = Array.from(
        { length: stafffinalData[0].amount.length },
        () => 0,
      );

      // Calculate the sum of amounts index-wise
      stafffinalData.forEach((department) => {
        department.amount.forEach((amount, index) => {
          staffsumArray[index] += amount;
        });
      });

      const othersumArray = Array.from(
        { length: otherfinalData[0].amount.length },
        () => 0,
      );

      // Calculate the sum of amounts index-wise
      otherfinalData.forEach((department) => {
        department.amount.forEach((amount, index) => {
          othersumArray[index] += amount;
        });
      });

      await generateExcelForDailyCost(
        headerMonth,
        datesArray,
        finalData,
        wagessumArray,
        staffsumArray,
        othersumArray,
        ['Wages', 'Staff', 'Others'],
        sendmail,
        compId,
        oneDayBeforedate,
        'PerDayCost',
        'xlsx',
        res,
      );
    }

    if (sendmail == true) {
      return res.status(200).json({
        status: 200,
        message: 'Mail sent successfully.',
      });
    }

    return;
  } catch (error) {
    next(error);
  }
};

exports.totalpunchInCount = async (req, res, next) => {
  try {
    const { date } = req.body;

    const todayDate = new Date().toISOString().split('T')[0];
    const attendanceDate = date || todayDate;

    const count = await attendanceTransaction.count({
      distinct: true,
      col: 'userMasterID',
      where: {
        AttendanceDate: attendanceDate,
      },
    });

    return res.status(200).json({
      status: 200,
      data: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.totalpunchIn = async (req, res, next) => {
  try {
    const { page, limit, searchQuery, date, Export } = req.body;
    const todayDate = date || new Date().toISOString().split('T')[0];

    const whereCondition = { AttendanceDate: todayDate };

    const condition = {
      status: 1,
    };
    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('companyName')), {
          [Sequelize.Op.like]: `%${searchQuery.toLowerCase()}%`,
        }),
      ];
    }
    const paginationQuery =
      !Export && page && limit ? { offset: (page - 1) * limit, limit } : {};

    const attendanceCounts = await attendanceTransaction.findAll({
      attributes: [
        [
          Sequelize.fn('COUNT', Sequelize.col('AttendanceTransID')),
          'punchInCount',
        ],
        [Sequelize.col('userMaster.companyMaster.companyName'), 'companyName'],
        [
          Sequelize.col('userMaster.companyMaster.companyMasterID'),
          'companyMasterID',
        ],
      ],
      where: whereCondition,
      include: [
        {
          model: userMaster,
          attributes: [],
          include: [
            {
              model: companyMaster,
              attributes: [],
            },
          ],
        },
      ],
      group: [
        'userMaster.companyMaster.companyName',
        'userMaster.companyMaster.companyMasterID',
      ],
      raw: true,
    });

    const { rows: companyData, count } = await companyMaster.findAndCountAll({
      ...paginationQuery,
      where: condition,
      attributes: ['companyName', 'companyMasterID'],
      order: [['companyName', 'ASC']],
    });

    const result = companyData.map((company) => {
      const match = attendanceCounts.find(
        (att) => att.companyMasterID === company.companyMasterID,
      );
      return {
        companyName: company.companyName,
        punchInCount: match ? +match.punchInCount : 0,
      };
    });

    // const { rows: result, count } = await companyMaster.findAndCountAll({
    //   ...paginationQuery,
    //   where: condition,
    //   attributes: [
    //     'companyName',
    //     'companyMasterID',
    //     [
    //       Sequelize.fn(
    //         'COUNT',
    //         Sequelize.col('userMaster.attendanceTransaction.AttendanceTransID')
    //       ),
    //       'punchInCount',
    //     ],
    //   ],
    //   include: [
    //     {
    //       model: userMaster,
    //       attributes: [],
    //       include: [
    //         {
    //           model: attendanceTransaction,
    //           attributes: [],
    //           where: whereCondition,
    //           required: false, // Left join to include companies without attendance records
    //         },
    //       ],
    //     },
    //   ],
    //   group: ['companyMaster.companyName', 'companyMaster.companyMasterID'],
    //   order: [['companyName', 'ASC']],
    //   raw: true,
    // });

    if (Export) {
      await generateExcel(result, 'PunchIn', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: result,
      totalCount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.attendancestatus_V2 = async (req, res, next) => {
  try {
    const { userMasterID } = req.body;
    const date = asiaKolkataDateTime(new Date()).slice(0, 10);
    const findUserData = await UserMaster.findOne({
      where: { userMasterID: userMasterID },
      attributes: ['userMasterID', 'userFaces', 'facePhotoArray'],
      include: [
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
          include: [
            {
              model: AttendancePolicy,
              as: 'attendancePolicy',
              attributes: [
                'missPunchMinutes',
                'singleMultiplePunchInPunchOut',
                'shiftBasedRestriction',
                'latePunchRestricted',
              ],
            },
          ],
        },
      ],
    });

    const findLastAttendance = await attendanceTransaction.findOne({
      where: {
        userMasterID: userMasterID,
        AttendanceDate: {
          [Sequelize.Op.lte]: date,
        },
      },
      include: [
        {
          model: AttendanceLogs,
          where: {
            AttendanceTransID: {
              [Sequelize.Op.notIn]: [
                attendaceTransType.biometricNotValidated,
                attendaceTransType.biometricNC,
                attendaceTransType.biometricNC_SameTime,
                attendaceTransType.tpMirrorNC,
                attendaceTransType.tpMirrorNotValidated,
              ],
            },
          },
          attributes: [
            'logDateTime',
            'direction',
            'userMasterID',
            'address',
            'AttendanceTransID',
          ],
        },
      ],
      order: [['AttendanceDate', 'DESC']],
    });
    if (!findLastAttendance) {
      return res.json({
        status: 200,
        message: message.usermessage.fetchMessage('Attendance Data'),
        data: {
          In_Data: null,
          Out_Data: null,
        },
        continuePunchIN: false,
        userFaces: findUserData?.userFaces || [],
        facePhotoArray: findUserData?.facePhotoArray || [],
      });
    }
    const sortedAttendanceLogs = findLastAttendance?.attendancelogs?.sort(
      (a, b) => new Date(b.logDateTime) - new Date(a.logDateTime),
    );
    const findLastAttendanceLog =
      sortedAttendanceLogs.length > 0 ? sortedAttendanceLogs[0] : null;
    if (!findLastAttendanceLog) {
      return res.json({
        status: 200,
        message: message.usermessage.fetchMessage('Attendance Data'),
        data: {
          In_Data: null,
          Out_Data: null,
        },
        continuePunchIN: false,
        userFaces: findUserData?.userFaces || [],
        facePhotoArray: findUserData?.facePhotoArray || [],
      });
    }

    const In_Data =
      findLastAttendanceLog?.direction === 'out'
        ? sortedAttendanceLogs.find((log) => log.direction === 'in') || null
        : null;
    const logData = {
      logDateTime: findLastAttendanceLog.logDateTime,
      direction: findLastAttendanceLog.direction,
      address: findLastAttendanceLog.address,
      AttendanceTransID: findLastAttendanceLog.AttendanceTransID,
    };
    const attendacePolicyData =
      findUserData?.employeeAttendancePolicies?.[0]?.attendancePolicy || null;
    let continuePunchIN = false;
    if (attendacePolicyData) {
      if (attendacePolicyData.latePunchRestricted) {
        let day = new Date(findLastAttendance.AttendanceDate).toLocaleString(
          'en-us',
          { weekday: 'long' },
        );

        const dayWiseShiftTime = await shiftTime.findOne({
          where: {
            shiftID: findLastAttendance.Shift,
            day: day,
          },
          include: [
            {
              model: shiftModel,
              as: 'shift',
            },
          ],
        });

        const missPunchObj = await checkIsAttendanceMissPunch(
          attendacePolicyData,
          findLastAttendance,
          dayWiseShiftTime,
          new Date(),
        );

        if (
          findLastAttendanceLog.direction == 'in' &&
          missPunchObj.isMissPunch
        ) {
          const dummyData = {
            logDateTime: null,
            direction: 'out',
            address: 'Missed Punch Out',
            AttendanceTransID: null,
          };

          return res.json({
            status: 200,
            message: message.usermessage.fetchMessage('Attendance'),
            data: {
              In_Data: logData,
              Out_Data: dummyData,
            },
            continuePunchIN: continuePunchIN,
            userFaces: findUserData?.userFaces || [],
            facePhotoArray: findUserData?.facePhotoArray || [],
          });
        }

        if (
          findLastAttendanceLog.direction == 'out' &&
          !missPunchObj.isMissPunch &&
          attendacePolicyData.singleMultiplePunchInPunchOut == 'Multiple'
        ) {
          continuePunchIN = true;
        }
      } else {
        if (
          findLastAttendanceLog.direction == 'out' &&
          attendacePolicyData.singleMultiplePunchInPunchOut == 'Multiple'
        ) {
          continuePunchIN = true;
        }
      }
    }

    return res.json({
      status: 200,
      message: message.usermessage.fetchMessage('Attendance Data'),
      data: {
        In_Data: In_Data
          ? In_Data
          : Object.keys(logData).length > 0
            ? logData
            : null,
        Out_Data: In_Data
          ? Object.keys(logData).length > 0
            ? logData
            : null
          : null,
      },
      continuePunchIN: continuePunchIN,
      userFaces: findUserData?.userFaces || [],
      facePhotoArray: findUserData?.facePhotoArray || [],
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserLogDateWise = async (req, res, next) => {
  const { userMasterID, attendanceDate } = req.body;

  try {
    const getUserAttendance = await attendanceTransaction.findOne({
      where: {
        userMasterID,
        AttendanceDate: attendanceDate,
      },
      include: [
        {
          model: AttendanceLogs,
          attributes: ['attendanceLogID', 'logDateTime', 'direction'],
        },
      ],
      order: [[AttendanceLogs, 'logDateTime', 'ASC']],
    });

    return res.status(200).json({ status: 200, data: getUserAttendance });
  } catch (error) {
    next(error);
  }
};

exports.attendanceTimingReport = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      userMasterID,
      fromdate,
      todate,
      exportData,
      exportFileType,
      employeeType,
      page,
      limit,
      sortField,
    } = req.body;
    const paginationQuery =
      !exportData && page && limit ? { offset: (page - 1) * limit, limit } : {};

    const condition = {
      userMasterID: userMasterID,
      companyMasterId: companyMasterID,
    };

    const salaryPolicyList =
      'expat' === employeeType
        ? await SalaryPolicy.findAll({
            where: {
              salarycalculationBasedon: 'hourwise',
              monthlyFixhours: { [Sequelize.Op.ne]: null },
            },
            attributes: [
              'salaryPolicyID',
              'salaryPolicyName',
              'salarycalculationBasedon',
              'monthlyFixhours',
            ],
          })
        : null;

    const conditionalJoins = [
      {
        model: EmployeeJoiningDetails,
        attributes: ['employeeCode', 'employeeType', 'nationality'],
        required: true,
        where: {
          employeeType,
        },
      },
    ];
    if ('expat' === employeeType) {
      conditionalJoins.push({
        model: EmployeeSalaryPolicy,
        where: {
          status: 1,
          salaryPolicyID: salaryPolicyList.map((e) => e.salaryPolicyID),
          [Sequelize.Op.or]: [
            { startDate: { [Sequelize.Op.between]: [fromdate, todate] } },
            { endDate: { [Sequelize.Op.between]: [fromdate, todate] } },
            {
              startDate: { [Sequelize.Op.lte]: fromdate },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: todate } },
                { endDate: null },
              ],
            },
          ],
        },
        attributes: ['userMasterID', 'salaryPolicyID', 'startDate', 'endDate'],
      });
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const orderByFields = getOrderByFields(sortField);
    const [userAttendance, count, allShiftsList, allUserApprovedLeaves] =
      await Promise.all([
        /** Find users with attendence data */
        userMaster.findAll({
          order: orderByFields,
          ...paginationQuery,
          where: { ...userAccessCondition.where, ...condition },
          attributes: ['displayName', 'userMasterID'],
          include: [
            ...userAccessCondition.includeModels,
            ...conditionalJoins,
            {
              model: attendanceTransaction,
              required: false,
              where: {
                AttendanceDate: { [Sequelize.Op.between]: [fromdate, todate] },
              },
              attributes: [
                'AttendanceTransID',
                'Shifthrs',
                'InHrs',
                'OutHrs',
                'AttendanceDate',
                'roundOffMinutes',
                'withoutOtMinutes',
                'Shift',
              ],
              include: {
                model: overTimeCalculation,
                separate: true,
                attributes: ['UpdateOverTimeHourAndMin', 'OverTimeHourAndMin'],
                required: false,
              },
            },
            {
              model: EmployeeAttendancePolicy,
              separate: true,
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: new Date(fromdate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(fromdate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              attributes: ['attendancePolicyID'],
              include: [
                {
                  model: AttendancePolicy,
                  as: 'attendancePolicy',
                  attributes: ['considerWorkingHours'],
                },
              ],
            },
            {
              model: weekoffHolidayTran,
              required: false,
              attributes: ['date', 'tableName'],
              where: { date: { [Sequelize.Op.between]: [fromdate, todate] } },
            },
            {
              required: false,
              model: EmployeeShift,
              attributes: ['shiftID', 'shiftsID', 'startDate', 'endDate'],
              where: {
                status: 1,
                [Sequelize.Op.or]: [
                  {
                    startDate: {
                      [Sequelize.Op.between]: [fromdate, todate],
                    },
                  },
                  {
                    endDate: {
                      [Sequelize.Op.between]: [fromdate, todate],
                    },
                  },
                  {
                    [Sequelize.Op.and]: [
                      { startDate: { [Sequelize.Op.lte]: fromdate } },
                      {
                        [Sequelize.Op.or]: [
                          {
                            endDate: {
                              [Sequelize.Op.gte]: todate,
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
            {
              required: false,
              model: ShiftRoster,
              attributes: ['shiftRosterDate', 'shiftID'],
              where: {
                status: 1,
                shiftRosterDate: {
                  [Sequelize.Op.between]: [fromdate, todate],
                },
              },
            },
          ],
        }),
        /** Find total counts */
        userMaster.count({
          where: { ...userAccessCondition.where, ...condition },
          include: [...userAccessCondition.includeModels, ...conditionalJoins],
        }),

        /** Find all shift */
        Shift.findAll({
          where: {
            companyMasterID: companyMasterID,
            status: 1,
          },
          attributes: ['shiftID'],
          include: [
            {
              model: ShiftTIme,
              attributes: [
                'day',
                'totalhours',
                'firsthalfendtime',
                'secondhalfstarttime',
                'totalhourshalfday',
              ],
            },
          ],
        }),

        /** Final All Approved leaves of user (Exclude L.W.P)*/
        UserLeaveTransaction.findAll({
          where: {
            status: 1,
            date: {
              [Sequelize.Op.between]: [fromdate, todate],
            },
          },
          order: [['date', 'DESC']],
          attributes: [
            'userLeaveTransactionID',
            'ReferenceID',
            'leaveAuthID',
            'LeaveTranId',
            'days',
            'date',
            'issandwichleave',
            'status',
          ],
          include: [
            {
              model: UserLeave,
              where: { userMasterID: userMasterID },
              attributes: ['userMasterID'],
              include: [
                {
                  model: UserMaster,
                  where: {
                    companyMasterId: companyMasterID,
                    ...userAccessCondition.where,
                  },
                  include: [...userAccessCondition.includeModels],
                  attributes: [],
                },
              ],
            },
            {
              model: HrLeaveTypes,
              attributes: ['LeaveID'],
              where: {
                LeaveID: { [Sequelize.Op.ne]: 18 }, // exclude L.W.P
              },
            },
          ],
        }),
      ]);

    const attendanceData = [];

    for (const item of userAttendance) {
      const userLeaves = allUserApprovedLeaves.filter(
        (leave) => leave.userLeave.userMasterID == item.userMasterID,
      );
      const tempData = {
        endPayDate: moment(todate, 'YYYY-MM-DD').format('DD-MM-YYYY'),
        employeeCode: item.employeeJoiningDetails?.[0]?.employeeCode || '',
        displayName: item.displayName,
        employeeType: item.employeeJoiningDetails?.[0]?.employeeType || '',
        workingHrs: 0,
        hrsClocked: 0,
        regHrsPayable: 0,
        ot1: 0,
        ot2: 0,
      };

      const salaryPolicyID = item.employeeSalaryPolicies?.[0]?.salaryPolicyID;

      if ('expat' === tempData.employeeType) {
        const salaryPolicy = salaryPolicyList.find(
          (e) => e.salaryPolicyID == salaryPolicyID,
        );
        tempData.workingHrs = salaryPolicy?.monthlyFixhours || 0;
      } else {
        tempData.workingHrs = 88;
      }

      const holidayDates = item.weekoffHolidayTrans
        .filter((holiday) => holiday.tableName === 'holiday')
        .map((holiday) => holiday.date);
      const weekOffDates = item.weekoffHolidayTrans
        .filter((holiday) => holiday.tableName === 'weekoff')
        .map((holiday) => holiday.date);
      const attendanceDate = [];

      for (const attendance of item.attendanceTransactions) {
        attendanceDate.push(attendance.AttendanceDate);

        /** Find current date user's approved  leave */
        const currentDateUserLeaves = userLeaves.filter(
          (leave) => leave.date == attendance.AttendanceDate,
        );

        let clockedHrs = +attendance.roundOffMinutes;
        let ot1Hrs = 0;
        let ot2Hrs = 0;
        let regHrs = 0;

        /** Calculate regular hour only if there is no weekoff */
        if (!weekOffDates.includes(attendance.AttendanceDate)) {
          let shiftBreakMin = 0;
          let shitFullDayMin = 0;
          let shitHalfDayMin = 0;
          let currentDateUserLevaveDay = 0;

          /** calculate total number of day's like half day or full day or user applied two leaves of half day for same day */
          if (currentDateUserLeaves.length) {
            currentDateUserLevaveDay = currentDateUserLeaves.reduce(
              (prev, curr) => prev + +curr.days,
              0,
            );
          }

          /** Calculate brake hour based on shift first half end time and shift second half start time */
          const shitInfo = allShiftsList.find(
            (e) => e.shiftID == attendance.Shift,
          );
          if (shitInfo) {
            const day = new Date(attendance.AttendanceDate).toLocaleString(
              'en-us',
              {
                weekday: 'long',
              },
            );
            const shiftTime = shitInfo.shiftTimes.find((e) => e.day == day);
            if (shiftTime) {
              if (shiftTime.firsthalfendtime && shiftTime.secondhalfstarttime) {
                const firstHalfEndTime = moment(
                  shiftTime.firsthalfendtime,
                  'h:mm A',
                );
                const secondHalfStartTime = moment(
                  shiftTime.secondhalfstarttime,
                  'h:mm A',
                );
                shiftBreakMin = secondHalfStartTime.diff(
                  firstHalfEndTime,
                  'minutes',
                );
              }
              shitFullDayMin = +shiftTime.totalhours * 60;
              shitHalfDayMin = +shiftTime.totalhourshalfday * 60;
            }
          }

          /** Calculate regular payable hours */
          if (clockedHrs >= shitFullDayMin + shiftBreakMin) {
            regHrs = shitFullDayMin;
          } else {
            if (clockedHrs >= shitHalfDayMin + shiftBreakMin) {
              if (currentDateUserLevaveDay == 0.5) {
                regHrs = shitHalfDayMin;
              } else if (currentDateUserLevaveDay == 1) {
                regHrs = 0;
              } else {
                regHrs = clockedHrs - shiftBreakMin;
              }
            } else {
              if (clockedHrs < shitHalfDayMin) {
                /**
                 * if user apply half day leave then consider half day
                 * if user apply full day leave then consider full day
                 * if user does not applied any leave then consider absent
                 */
                regHrs = 0;
              } else {
                if (currentDateUserLevaveDay == 1) {
                  regHrs = 0;
                } else {
                  regHrs = shitHalfDayMin;
                }
              }
            }
          }
        }

        if (weekOffDates.includes(attendance.AttendanceDate)) {
          if (
            attendance.OverTimeCalculations &&
            attendance.OverTimeCalculations.length
          )
            if (+attendance.OverTimeCalculations[0].UpdateOverTimeHourAndMin) {
              ot1Hrs =
                +attendance.OverTimeCalculations[0].UpdateOverTimeHourAndMin;
            }
        } else if (holidayDates.includes(attendance.AttendanceDate)) {
          const shiftMin = +attendance.Shifthrs * 60;

          if (
            attendance.OverTimeCalculations &&
            attendance.OverTimeCalculations.length
          )
            if (+attendance.OverTimeCalculations[0].UpdateOverTimeHourAndMin) {
              ot2Hrs =
                +attendance.OverTimeCalculations[0].UpdateOverTimeHourAndMin;
            }

          if (ot2Hrs < shiftMin) {
            regHrs = shiftMin - ot2Hrs;
          } else {
            regHrs = 0;
          }
        } else {
          if (
            attendance.OverTimeCalculations &&
            attendance.OverTimeCalculations.length
          )
            if (+attendance.OverTimeCalculations[0].UpdateOverTimeHourAndMin) {
              ot1Hrs =
                +attendance.OverTimeCalculations[0].UpdateOverTimeHourAndMin;
            }
        }
        if (currentDateUserLeaves.length) {
          regHrs += currentDateUserLeaves.reduce(
            (prev, curr) => prev + +attendance.Shifthrs * curr.days * 60,
            0,
          );
        }
        tempData.hrsClocked += clockedHrs;
        tempData.regHrsPayable += regHrs;
        tempData.ot1 += ot1Hrs;
        tempData.ot2 += ot2Hrs;
      }

      /** Add hours of holiday according shit if used does not punch in on holiday */
      for (let holiday of holidayDates) {
        if (!attendanceDate.includes(holiday)) {
          /** Find roaster shift */
          const findDateWiseRoster =
            item.shiftRosters?.length > 0
              ? item.shiftRosters.find((e) => e.shiftRosterDate == holiday)
              : null;
          if (findDateWiseRoster) {
            const shiftInfo = allShiftsList.find(
              (e) => e.shiftID == findDateWiseRoster.shiftID,
            );
            if (shiftInfo) {
              const day = new Date(holiday).toLocaleString('en-us', {
                weekday: 'long',
              });
              const shiftTime = shiftInfo.shiftTimes.find((e) => e.day == day);
              if (shiftTime?.totalhours) {
                tempData.regHrsPayable += +shiftTime?.totalhours * 60;
              }
            }
          } else {
            /** Find employee shift */
            const findDateWiseEmployeeShift = item.employeeShifts?.length
              ? item.employeeShifts.find(
                  (e) =>
                    e.startDate <= holiday &&
                    (e.endDate >= holiday || e.endDate == null),
                )
              : null;
            let employeeShiftIds = [];
            if (findDateWiseEmployeeShift) {
              if (findDateWiseEmployeeShift.shiftID) {
                employeeShiftIds = [findDateWiseEmployeeShift.shiftID];
              } else if (findDateWiseEmployeeShift.shiftsID.length) {
                employeeShiftIds = findDateWiseEmployeeShift.shiftsID;
              }
            }
            /** Employee shift can be multiple */
            if (employeeShiftIds.length) {
              const shiftTimeList = allShiftsList
                .filter((e) => employeeShiftIds.find((es) => es == e.shiftID))
                .map((e) => e.shiftTimes)
                .flat();
              if (shiftTimeList?.length) {
                const day = new Date(holiday).toLocaleString('en-us', {
                  weekday: 'long',
                });
                const dayWiseShiftTime = shiftTimeList
                  .filter((e) => e.day == day)
                  .sort((a, b) => +a.totalhours - b.totalhours);
                if (dayWiseShiftTime?.[0]?.totalhours) {
                  tempData.regHrsPayable +=
                    +dayWiseShiftTime?.[0]?.totalhours * 60;
                }
              }
            }
          }
        }
      }

      /** Add hours of leave according shift if user does not punch in on leave day */
      for (let leave of userLeaves) {
        const leaveDate = leave.date;
        if (!attendanceDate.includes(leaveDate)) {
          /** Find roaster shift */
          const findDateWiseRoster =
            item.shiftRosters?.length > 0
              ? item.shiftRosters.find((e) => e.shiftRosterDate == leaveDate)
              : null;
          if (findDateWiseRoster) {
            const shiftInfo = allShiftsList.find(
              (e) => e.shiftID == findDateWiseRoster.shiftID,
            );
            if (shiftInfo) {
              const day = new Date(leaveDate).toLocaleString('en-us', {
                weekday: 'long',
              });
              const shiftTime = shiftInfo.shiftTimes.find((e) => e.day == day);
              if (shiftTime?.totalhours) {
                tempData.regHrsPayable +=
                  +shiftTime?.totalhours * leave.days * 60;
              }
            }
          } else {
            /** Find employee shift */
            const findDateWiseEmployeeShift = item.employeeShifts?.length
              ? item.employeeShifts.find(
                  (e) =>
                    e.startDate <= leaveDate &&
                    (e.endDate >= leaveDate || e.endDate == null),
                )
              : null;
            let employeeShiftIds = [];
            if (findDateWiseEmployeeShift) {
              if (findDateWiseEmployeeShift.shiftID) {
                employeeShiftIds = [findDateWiseEmployeeShift.shiftID];
              } else if (findDateWiseEmployeeShift.shiftsID.length) {
                employeeShiftIds = findDateWiseEmployeeShift.shiftsID;
              }
            }
            /** Employee shift can be multiple */
            if (employeeShiftIds.length) {
              const shiftTimeList = allShiftsList
                .filter((e) => employeeShiftIds.find((es) => es == e.shiftID))
                .map((e) => e.shiftTimes)
                .flat();
              if (shiftTimeList?.length) {
                const day = new Date(leaveDate).toLocaleString('en-us', {
                  weekday: 'long',
                });
                const dayWiseShiftTime = shiftTimeList
                  .filter((e) => e.day == day)
                  .sort((a, b) => +a.totalhours - b.totalhours);
                if (dayWiseShiftTime?.[0]?.totalhours) {
                  tempData.regHrsPayable +=
                    +dayWiseShiftTime[0].totalhours * leave.days * 60;
                }
              }
            }
          }
        }
      }

      tempData.hrsClocked = tempData.hrsClocked
        ? (+tempData.hrsClocked / 60).toFixed(2)
        : '00.00';
      tempData.regHrsPayable = tempData.regHrsPayable
        ? (+tempData.regHrsPayable / 60).toFixed(2)
        : '00.00';
      tempData.ot1 = tempData.ot1 ? (+tempData.ot1 / 60).toFixed(2) : '00.00';
      tempData.ot2 = tempData.ot2 ? (+tempData.ot2 / 60).toFixed(2) : '00.00';

      attendanceData.push(tempData);
    }

    if (exportData) {
      const exportList = [];
      for (let item of attendanceData) {
        exportList.push({
          'End Pay Date': item.endPayDate,
          'Employee Code': item.employeeCode,
          'Employee Name': item.displayName,
          'Employee Type': item.employeeType,
          'Working Hours (standard  Hours Should be)': item.workingHrs,
          'Hours Clocked': item.hrsClocked,
          'Reg Hours Payable': item.regHrsPayable,
          'Overtime1-hr (Normal Day and WeekOff)': item.ot1,
          'Overtime2 (Public Holiday)': item.ot2,
        });
      }
      return await generateExcel(
        exportList,
        'Attendance Timing',
        exportFileType || 'xlsx',
        res,
      );
    }

    return res.status(200).json({
      status: 200,
      data: attendanceData,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.attendanceByCompanyId = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchMasterID,
      designationID,
      departmentID,
      searchQuery,
      page,
      limit,
    } = req.body;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const condition = {};
    const paginationQuery =
      page && limit ? { offset: (page - 1) * limit, limit: +limit } : {};

    let branchIds = branchMasterID ? [branchMasterID] : [];

    if (
      !branchMasterID &&
      req.userDetails &&
      req.userDetails.role &&
      req.userDetails.role.roleType == roleType.BRANCH_WISE
    ) {
      branchIds = req.userDetails.accessibleBranches;
    }

    condition.companyMasterId = companyMasterID;
    condition.status = 1;
    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          '$userMaster.displayName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$employeeJoiningDetails.employeeCode$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    }

    const { rows: getcompanyWiseUser, count } =
      await userMaster.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginationQuery,
        attributes: [
          'userMasterID',
          'displayName',
          'firstName',
          'middleName',
          'lastName',
          'photo',
          'companyMasterId',
          'userFaces',
          'facePhoto',
          'facePhotoArray',
        ],
        order: [['displayName', 'ASC']],
        subQuery: false,
        include: [
          {
            required: true,
            separate: true,
            model: AttendanceLogs,
            where: {
              AttendanceTransID: {
                [Sequelize.Op.notIn]: [0, 1],
              },
            },
            order: [['logDateTime', 'DESC']],
            include: [
              {
                model: attendanceTransaction,
              },
            ],
          },
          {
            model: EmployeeJoiningDetails,
            where: {
              joiningDate: {
                [Sequelize.Op.lte]: currentDate,
              },

              [Sequelize.Op.or]: [
                { leavingDate: { [Sequelize.Op.eq]: null } },
                { leavingDate: { [Sequelize.Op.gte]: currentDate } },
                {
                  leavingDate: {
                    [Sequelize.Op.eq]: '',
                  },
                },
              ],
            },
            attributes: ['employeeCode', 'joiningDate', 'leavingDate'],
          },
          {
            model: EmployeeDesignation,
            where: {
              status: 1,
              ...(designationID && { designationID: designationID }),
              applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: designationID ? true : false,
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
              ...(departmentID && { departmentID: departmentID }),
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: departmentID ? true : false,
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
              ...(isArray(branchIds) &&
                branchIds.length && { branchID: branchIds }),
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: isArray(branchIds) && branchIds.length ? true : false,
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
            model: attendanceTransaction,
            where: {
              AttendanceDate: currentDate,
            },
            attributes: [
              'AttendanceTransID',
              'InDatetime',
              'OutDateTime',
              'AttendanceDate',
              'userMasterID',
              'Shifthrs',
              'ShiftIntime',
              'ShiftoutTime',
              'InHrs',
              'LateBy',
              'EarlyBy',
            ],
          },
          {
            separate: true,
            required: false,
            model: EmployeeAttendancePolicy,
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
            attributes: [
              'employeeAttendancePolicyID',
              'userMasterID',
              'attendancePolicyID',
              'startDate',
              'endDate',
            ],
            include: [
              {
                model: AttendancePolicy,
                as: 'attendancePolicy',
              },
            ],
          },
        ],
      });

    for (let user of getcompanyWiseUser) {
      const userMasterID = user.userMasterID;
      const attendancetransaction =
        user.attendancelogs &&
        user.attendancelogs.length > 0 &&
        user.attendancelogs[0].attendanceTransaction
          ? user.attendancelogs[0].attendanceTransaction
          : null;
      if (user.attendancelogs.length) {
        user.attendancelogs.length = 1;
      }
      const latest_attendanceLog =
        user.attendancelogs && user.attendancelogs.length > 0
          ? user.attendancelogs[0]
          : null;
      let continuePunchIN = false;

      const get_one_data =
        user.employeeAttendancePolicies &&
        user.employeeAttendancePolicies.length > 0
          ? user.employeeAttendancePolicies[0].attendancePolicy
            ? user.employeeAttendancePolicies[0].attendancePolicy
            : null
          : null;

      if (get_one_data && get_one_data.latePunchRestricted) {
        if (latest_attendanceLog && latest_attendanceLog.direction == 'in') {
          let day = new Date(
            attendancetransaction.AttendanceDate,
          ).toLocaleString('en-us', { weekday: 'long' });

          const dayWiseShiftTime = await shiftTime.findOne({
            where: {
              shiftID: attendancetransaction.Shift,
              day: day,
            },
            include: [
              {
                model: shiftModel,
                as: 'shift',
              },
            ],
          });

          const missPunchObj = await checkIsAttendanceMissPunch(
            get_one_data,
            attendancetransaction,
            dayWiseShiftTime,
            new Date(),
          );

          if (missPunchObj.isMissPunch) {
            const dummyData = AttendanceLogs.build({
              attendanceLogID: null,
              userMasterID: attendancetransaction.userMasterID,
              logDateTime: null,
              direction: 'out',
              photo: null,
              attendnaceFrom: null,
              longitude: null,
              latitude: null,
              address: 'Missed Punch Out',
              AttendanceTransID: null,
              createBy: null,
              updateBy: null,
              createByIp: null,
              updateByIp: null,
              createdAt: null,
              updatedAt: null,
            });
            user.dataValues.attendancelogs = [dummyData];
            user.dataValues.continuePunchIN = continuePunchIN;
          }
        }
      }
    }

    return res.status(200).json({
      status: 200,
      data: getcompanyWiseUser,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

// Add manually LCEG Penalty
exports.addLCEGPenalty = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      userMasterID,
      AttendanceDate,
      penaltyType,
      penaltyDeductionType,
      value,
    } = req.body;

    if (
      !userMasterID ||
      !AttendanceDate ||
      !penaltyType ||
      !penaltyDeductionType ||
      !value
    ) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }

    if (+value <= 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Enter a positive value!',
      });
    }

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    const [weekoffHoliday, attendance, verifiedAttendance] = await Promise.all([
      weekoffHolidayTran.findOne({
        where: {
          userMasterID,
          date: AttendanceDate,
          [Sequelize.Op.or]: [
            { optionalHoliday: false },
            { optionalHoliday: null },
          ],
        },
      }),

      attendanceTransaction.findOne({
        where: {
          userMasterID,
          AttendanceDate,
        },
      }),

      HrLeaveMonthlyTrans.findOne({
        where: {
          userMasterID,
          monthstartdate: {
            [Sequelize.Op.lte]: AttendanceDate,
          },
          monthenddate: {
            [Sequelize.Op.gte]: AttendanceDate,
          },
          verified: 1,
        },
      }),
    ]);

    if (verifiedAttendance) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Attendance already verified!',
      });
    }

    if (weekoffHoliday) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Weekoff on this date!',
      });
    }

    if (!attendance) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Attendance not found!',
      });
    }

    await AttendanceCorrection.create(
      {
        AttendanceTransID: attendance.AttendanceTransID,
        userMasterID: attendance.userMasterID,
        departmentID: attendance.departmentID,
        designationID: attendance.designationID,
        branchID: attendance.branchID,
        InDatetime: attendance.InDatetime,
        OutDateTime: attendance.OutDateTime,
        AttendanceDate: attendance.AttendanceDate,
        Shift: attendance.Shift,
        Shifthrs: attendance.Shifthrs,
        ShiftIntime: attendance.ShiftIntime,
        ShiftoutTime: attendance.ShiftoutTime,
        InHrs: Math.floor(attendance.InHrs),
        OutHrs: attendance.OutHrs,
        LateBy: attendance.LateBy,
        EarlyBy: attendance.EarlyBy,
        Panalty: attendance.Panalty,
        PanaltyDeduction: attendance.PanaltyDeduction,
        Othrs: attendance.Othrs,
        fulldayhalfday: attendance.fulldayhalfday,
        punchINbranch: attendance.punchINbranch,
        punchOUTbranch: attendance.punchOUTbranch,
        goEarlyUsed: attendance.goEarlyUsed,
        createBy: createBy,
        createByIp: createByIp,
        Status: attendance.Status,
        updateBy: createBy,
        updateByIp: createByIp,
        ChangeBy: 'mannual',
        roundOffMinutes: attendance.roundOffMinutes,
        remarks: attendance.remarks,
        withoutOtMinutes: attendance.withoutOtMinutes,
        LCPenaltyFrom: attendance.LCPenaltyFrom,
        EGPenaltyFrom: attendance.EGPenaltyFrom,
        isManual: attendance.isManual,
      },
      { transaction },
    );

    const updateData = {
      updateBy: createBy,
      updateByIp: createByIp,
    };

    if (penaltyType == 'LC') {
      updateData.PanaltyDeduction = penaltyDeductionType;
      updateData.Panalty = value;
      updateData.LCPenaltyFrom = 'M';
    }

    if (penaltyType == 'EG') {
      updateData.goEarlyPanaltyDeduction = penaltyDeductionType;
      updateData.goEarlyPanalty = value;
      updateData.EGPenaltyFrom = 'M';
    }

    await attendanceTransaction.update(updateData, {
      where: {
        AttendanceTransID: attendance.AttendanceTransID,
      },
      transaction,
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Attendance Penalty'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Remove Manually LCEG Penalty
exports.deleteLCEGPenalty = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { userMasterID, AttendanceDate, penaltyType } = req.body;

    if (!userMasterID || !AttendanceDate || !penaltyType) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    const [attendance, verifiedAttendance] = await Promise.all([
      attendanceTransaction.findOne({
        where: {
          userMasterID,
          AttendanceDate,
        },
      }),
      HrLeaveMonthlyTrans.findOne({
        where: {
          userMasterID,
          monthstartdate: {
            [Sequelize.Op.lte]: AttendanceDate,
          },
          monthenddate: {
            [Sequelize.Op.gte]: AttendanceDate,
          },
          verified: 1,
        },
      }),
    ]);

    if (verifiedAttendance) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Attendance already verified!',
      });
    }

    if (!attendance) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Attendance not found!',
      });
    }

    await AttendanceCorrection.create(
      {
        AttendanceTransID: attendance.AttendanceTransID,
        userMasterID: attendance.userMasterID,
        departmentID: attendance.departmentID,
        designationID: attendance.designationID,
        branchID: attendance.branchID,
        InDatetime: attendance.InDatetime,
        OutDateTime: attendance.OutDateTime,
        AttendanceDate: attendance.AttendanceDate,
        Shift: attendance.Shift,
        Shifthrs: attendance.Shifthrs,
        ShiftIntime: attendance.ShiftIntime,
        ShiftoutTime: attendance.ShiftoutTime,
        InHrs: Math.floor(attendance.InHrs),
        OutHrs: attendance.OutHrs,
        LateBy: attendance.LateBy,
        EarlyBy: attendance.EarlyBy,
        Panalty: attendance.Panalty,
        PanaltyDeduction: attendance.PanaltyDeduction,
        Othrs: attendance.Othrs,
        fulldayhalfday: attendance.fulldayhalfday,
        punchINbranch: attendance.punchINbranch,
        punchOUTbranch: attendance.punchOUTbranch,
        goEarlyUsed: attendance.goEarlyUsed,
        createBy: createBy,
        createByIp: createByIp,
        Status: attendance.Status,
        updateBy: createBy,
        updateByIp: createByIp,
        ChangeBy: 'mannual',
        roundOffMinutes: attendance.roundOffMinutes,
        remarks: attendance.remarks,
        withoutOtMinutes: attendance.withoutOtMinutes,
        LCPenaltyFrom: attendance.LCPenaltyFrom,
        EGPenaltyFrom: attendance.EGPenaltyFrom,
        isManual: attendance.isManual,
      },
      { transaction },
    );

    const updateData = {
      updateBy: createBy,
      updateByIp: createByIp,
    };

    if (penaltyType == 'LC') {
      updateData.PanaltyDeduction = null;
      updateData.Panalty = null;
      updateData.LCPenaltyFrom = 'RM';
    }

    if (penaltyType == 'EG') {
      updateData.goEarlyPanaltyDeduction = null;
      updateData.goEarlyPanalty = null;
      updateData.EGPenaltyFrom = 'RM';
    }

    await attendanceTransaction.update(updateData, {
      where: {
        AttendanceTransID: attendance.AttendanceTransID,
      },
      transaction,
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Attendance Penalty'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

function getAllDatesFromTo(fromDate, toDate) {
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  const dates = [];

  while (startDate <= endDate) {
    const yyyy = startDate.getFullYear();
    const mm = String(startDate.getMonth() + 1).padStart(2, '0');
    const dd = String(startDate.getDate()).padStart(2, '0');

    dates.push(`${yyyy}-${mm}-${dd}`);
    startDate.setDate(startDate.getDate() + 1);
  }

  return dates;
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;

  // DD/MM/YYYY
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // DD-MM-YYYY  ✅ Added
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Already YYYY-MM-DD or ISO string
  return new Date(dateStr).toISOString().split('T')[0];
}

exports.generateExcelForStatusWiseAttendance = async (req, res, next) => {
  try {
    const {
      userMasterID,
      companyMasterID,
      startdate,
      enddate,
      isDownload,
      sortField = sortFields.EMPLOYEENAME,
    } = req.body;

    const condition = {
      status: 1,
      userMasterID,
    };
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const getAllDates = getAllDatesFromTo(startdate, enddate);

    const allShifts = await shiftModel.findAll({
      where: { status: 1, companyMasterID: companyMasterID },
      order: [['shiftName', 'ASC']],
      include: [{ model: shiftTime }],
    });

    let order = [];

    switch (sortField) {
      case sortFields.EMPLOYEECODE:
        const employeeCodeSubquery = `
(
  SELECT ejd."employeeCode"
  FROM "employeeJoiningDetails" ejd
  WHERE ejd."userMasterID" = "userMaster"."userMasterID"
  LIMIT 1
)
`;

        order = [
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

          [
            Sequelize.literal(`
        CASE 
          WHEN ${employeeCodeSubquery} ~ '^[0-9]+$' 
          THEN (${employeeCodeSubquery})::int 
        END
      `),
            'ASC',
          ],

          [
            Sequelize.literal(`
        substring(${employeeCodeSubquery} FROM '^[^0-9]+')
      `),
            'ASC',
          ],

          [
            Sequelize.literal(`
        CASE 
          WHEN ${employeeCodeSubquery} ~ '[0-9]+' 
          THEN substring(${employeeCodeSubquery} FROM '[0-9]+')::int 
        END
      `),
            'ASC',
          ],

          [Sequelize.literal(`${employeeCodeSubquery}`), 'ASC'],

          ['displayName', 'ASC'],
        ];

        break;

      case sortFields.EMPLOYEENAME:
      default:
        order = [['displayName', 'ASC']];
        break;
    }
    const getAllShiftName = allShifts.map((s) => s.shiftName);

    if (isDownload) {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=attendance_report.xlsx',
      );

      const workbook = new ExcelJS.Workbook();

      const worksheet = workbook.addWorksheet('Attendance Report');

      const shiftHiddenSheet = workbook.addWorksheet('shiftList');
      shiftHiddenSheet.state = 'hidden';

      getAllShiftName.forEach((name, index) => {
        shiftHiddenSheet.getCell(`A${index + 1}`).value = name;
      });

      const shiftRange = `shiftList!$A$1:$A$${getAllShiftName.length}`;
      workbook.definedNames.add('ShiftNamesList', shiftRange);

      const header = [
        'Employee Code',
        'Name',
        'Mobile Number',
        'Branch',
        'Department',
        'Designation',
        ...getAllDates.map((dateStr) => {
          const d = new Date(dateStr);
          return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
        }),
      ];

      const headerRow = worksheet.addRow(header);

      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'D3D3D3' },
      };

      headerRow.font = {
        bold: true,
      };

      let offset = 0;
      const chunkSize = 200;
      let hasMore = true;
      const userAccessCondition = accessibleRoleWiseUsers({
        userDetails: req.userDetails,
        includeCompany: !companyMasterID,
      });
      while (hasMore) {
        const { rows: company_contact, count } =
          await UserMaster.findAndCountAll({
            where: { ...condition, ...userAccessCondition.where },
            offset,
            limit: chunkSize,
            order: order,
            include: [
              ...userAccessCondition.includeModels,
              {
                required: false,
                model: EmployeeDepartment,
                attributes: ['departmentID'],
                where: {
                  status: 1,
                  applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                    { endDate: { [Sequelize.Op.eq]: null } },
                  ],
                },
                include: [
                  {
                    model: Department,
                    as: 'department',
                    attributes: ['departmentName'],
                  },
                ],
              },
              {
                model: EmployeeJoiningDetails,
                attributes: ['employeeCode'],
              },
              {
                required: false,
                model: EmployeeDesignation,
                attributes: ['designationID'],
                where: {
                  status: 1,
                  applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                    { endDate: { [Sequelize.Op.eq]: null } },
                  ],
                },
                include: [{ model: Designation, as: 'designation' }],
              },
              {
                required: false,
                model: EmployeeBranch,
                attributes: ['branchID'],
                where: {
                  status: 1,
                  applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                    { endDate: { [Sequelize.Op.eq]: null } },
                  ],
                },
                include: [{ model: BranchMaster, as: 'branchMaster' }],
              },
            ],
          });

        const userIds = company_contact.map((u) => u.userMasterID);

        const attendance = await attendanceTransaction.findAll({
          where: {
            userMasterID: { [Sequelize.Op.in]: userIds },
            AttendanceDate: { [Sequelize.Op.in]: getAllDates },
          },
          attributes: [
            'userMasterID',
            'AttendanceDate',
            'fulldayhalfday',
            'InDatetime',
            'OutDateTime',
          ],
          raw: true,
          include: [
            {
              model: shiftModel,
              attributes: ['shiftName', 'shiftID'],
            },
          ],
        });

        const weekOffHoliday = await weekoffHolidayTran.findAll({
          where: {
            userMasterID: userMasterID,
            date: { [Sequelize.Op.between]: [startdate, enddate] },
          },
          attributes: ['date', 'userMasterID', 'tableName'],
        });

        for (const user of company_contact) {
          const userAttendance = attendance.filter(
            (a) => a.userMasterID == user.userMasterID,
          );

          const userWeekOffHoliday = weekOffHoliday.filter(
            (w) => w.userMasterID == user.userMasterID,
          );

          const row = [
            user?.employeeJoiningDetails?.[0]?.employeeCode || '',
            user.displayName,
            user.userNumber,
            user?.employeeBranches?.[0]?.branchMaster?.branchName || '',
            user?.employeeDepartments?.[0]?.department?.departmentName || '',
            user?.employeeDesignations?.[0]?.designation?.designationName || '',
            ...getAllDates.map((dateStr) => {
              const record = userAttendance.find(
                (a) => a.AttendanceDate === normalizeDate(dateStr),
              );
              if (record?.fulldayhalfday == 1) return 'P';
              if (record?.fulldayhalfday == 0.5) return 'HFD';
              if (record?.InDatetime && !record?.OutDateTime) return 'MP';
              return 'A';
            }),
          ];

          const rowObj = worksheet.addRow(row);

          for (let i = 7; i <= 6 + getAllDates.length; i++) {
            const cell = rowObj.getCell(i);

            cell.dataValidation = {
              type: 'list',
              allowBlank: true,
              formulae: ['"P,A,HFD"'],
              showDropDown: true,
            };
          }

          const shiftRow = [
            '',
            '',
            '',
            '',
            '',
            '',
            ...getAllDates.map((dateStr) => {
              const record = userAttendance.find(
                (a) => a.AttendanceDate == normalizeDate(dateStr),
              );
              return record?.['shift.shiftName'] || '';
            }),
          ];

          const shiftRowDropDown = worksheet.addRow(shiftRow);

          for (let i = 7; i <= 6 + getAllDates.length; i++) {
            const cell = shiftRowDropDown.getCell(i);

            cell.dataValidation = {
              type: 'list',
              allowBlank: true,
              formulae: [`shiftList!$A$1:$A$${getAllShiftName.length}`],
              showDropDown: true,
            };
          }

          const whRow = [
            '',
            '',
            '',
            '',
            '',
            '',
            ...getAllDates.map((dateStr) => {
              const wh = userWeekOffHoliday.find(
                (w) => w.date == normalizeDate(dateStr),
              );
              if (!wh) return '';
              if (wh.tableName === 'weekoff') return 'WeekOff';
              if (wh.tableName === 'holiday') return 'Holiday';
              return '';
            }),
          ];

          const weekOffRow = worksheet.addRow(whRow);

          for (let i = 1; i <= 6 + getAllDates.length; i++) {
            const cell = weekOffRow.getCell(i);

            cell.border = {
              bottom: { style: 'thin' },
            };
          }
        }

        offset += chunkSize;
        hasMore = offset < count;
      }

      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    return res.status(200).json({
      status: 200,
      data: [],
    });
  } catch (err) {
    next(err);
  }
};

exports.validateStatusWiseAttendance = async (req, res, next) => {
  if (!req.file) {
    return res
      .status(200)
      .send({ status: 400, message: 'Please upload an excel file!' });
  }
  try {
    let isCorrectData = true;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.getWorksheet('Attendance Report');

    const headerRow = worksheet.getRow(1).values;
    const dates = headerRow.slice(7);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDates = [];

    for (const excelDate of dates) {
      if (!excelDate) continue;

      let parsedDate;

      // Handle Excel date object
      if (excelDate instanceof Date) {
        parsedDate = new Date(excelDate);
      } else {
        // Handle string format like DD/MM/YYYY
        const [day, month, year] = excelDate.toString().split('/');
        parsedDate = new Date(`${year}-${month}-${day}`);
      }

      parsedDate.setHours(0, 0, 0, 0);

      if (parsedDate > today) {
        futureDates.push(excelDate);
      }
    }

    if (futureDates.length) {
      return res.status(200).json({
        status: 400,
        message: `Future dates are not allowed in attendance upload.`,
        futureDates,
      });
    }

    let users = [];

    const companyMasterID = req.body.companyMasterId;
    const { page = 1, limit = 20 } = req.body;

    const allShifts = await shiftModel.findAll({
      where: { status: 1, companyMasterID },
    });
    const validShiftNames = allShifts.map((s) => s.shiftName);
    const validShiftMap = {};
    allShifts.forEach((s) => {
      validShiftMap[s.shiftName] = s.shiftID;
    });

    const formattedDate = moment(dates[dates.length - 1], 'DD/MM/YYYY').format(
      'YYYY-MM-DD',
    );

    const allUsers = await UserMaster.findAll({
      where: { companyMasterId: companyMasterID, status: 1 },
      attributes: ['userMasterID', 'userNumber'],
      include: [
        {
          required: false,
          separate: true,
          model: EmployeeAttendancePolicy,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(formattedDate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(formattedDate),
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
              attributes: ['isNonPresentOT'],
            },
          ],
        },
      ],
    });

    const company = await companyMaster.findOne({
      where: {
        companyMasterID
      },
      attributes: ['companyMasterID', 'isAttRemarkRequired']
    })

    const validUserNumbers = allUsers.map((u) => u.userNumber);
    const validStatuses = ['A', 'P', 'HFD'];

    const uploadedUserNumbers = new Set();
    const duplicateUserNumbers = new Set();

    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 3) {
      const attendanceRow = worksheet.getRow(rowIndex).values;

      const userNumber = attendanceRow[3]?.toString()?.trim() || '';

      if (!userNumber) continue;

      if (uploadedUserNumbers.has(userNumber)) {
        duplicateUserNumbers.add(userNumber);
      } else {
        uploadedUserNumbers.add(userNumber);
      }
    }

    // ── Build output workbook ──────────────────────────────────────────────
    const outWorkbook = new ExcelJS.Workbook();
    const outSheet = outWorkbook.addWorksheet('Attendance Report');

    // Mirror original header row then append 'remark' at the end
    const originalHeader = worksheet.getRow(1).values.slice(1);
    outSheet.addRow(['uuid', ...originalHeader, 'remark']);

    const invalidRows = [];

    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 3) {
      const attendanceRow = worksheet.getRow(rowIndex).values;
      const shiftRow = worksheet.getRow(rowIndex + 1).values;
      const whRow = worksheet.getRow(rowIndex + 2).values;
      const uuid = crypto.randomUUID();
      const employeeCode = attendanceRow[1];
      const name = attendanceRow[2];
      const userNumber = attendanceRow?.[3]?.toString();
      const branch = attendanceRow[4];
      const department = attendanceRow[5];
      const designation = attendanceRow[6];

      const userData = allUsers.find((e) => e.userNumber == userNumber);

      let remarkList = [];

      const isUserExist = validUserNumbers.includes(userNumber);
      if (duplicateUserNumbers.has(userNumber)) {
        isCorrectData = false;
        remarkList.push(`Duplicate user number (${userNumber}) found in excel`);
      }
      let attendanceData = [];

      if (!isUserExist) {
        remarkList.push(message.usermessage.notFoundMessage('User'));
        isCorrectData = false;
      } else {
        const isNonPresentOT =
          userData?.employeeAttendancePolicies?.[0]?.attendancePolicy
            ?.isNonPresentOT || false;

        attendanceData = dates.map((attendance_date, i) => {
          let status = attendanceRow[i + 7];
          let shiftName = shiftRow[i + 7];
          const weekOffHoliday = whRow[i + 7];
          let shiftID = null;

          if (!status && !shiftName) {
            status = 'A';
            shiftName = '';
          } else if (!status && shiftName) {
            status = 'A';
            shiftName = '';
          }

          if (status && !validStatuses.includes(status)) {
            isCorrectData = false;
            remarkList.push(
              `Invalid status value (${status}) at ${attendance_date}`,
            );
          }

          if (shiftName) {
            const _shiftName = shiftName.toString().trim().toLowerCase();
            const _validShiftNames = validShiftNames.map((s) =>
              s.trim().toLowerCase(),
            );

            if (!_validShiftNames.includes(_shiftName)) {
              isCorrectData = false;
              remarkList.push(
                `Invalid shift (${shiftName}) at ${attendance_date}`,
              );
            } else {
              const _validShiftMap = {};
              Object.keys(validShiftMap).forEach((k) => {
                _validShiftMap[k.trim().toLowerCase()] = validShiftMap[k];
              });
              shiftID = _validShiftMap[_shiftName];
            }
          }

          if ((status == 'P' || status == 'HFD') && !shiftName) {
            isCorrectData = false;
            remarkList.push(
              `Shift is required when status is P Or HFD at ${attendance_date}`,
            );
          }

          if (isNonPresentOT && status == 'HFD') {
            isCorrectData = false;
            remarkList.push(
              `Half Day status is not allowed at ${attendance_date}`,
            );
          }

          return { attendance_date, status, shiftID, weekOffHoliday };
        });
      }

      const remark = remarkList.join(', ') || null;

      users.push({
        uuid,
        employeeCode: isUserExist ? employeeCode : '',
        name: isUserExist ? name : '',
        userNumber,
        branch: isUserExist ? branch : '',
        department: isUserExist ? department : '',
        designation: isUserExist ? designation : '',
        attendance: attendanceData || [],
        remark, // ← remark added here too
      });

      // Track invalid rows
      const dataRowNumber = Math.floor((rowIndex - 2) / 3) + 1;
      if (remark) {
        invalidRows.push({ rowNumber: dataRowNumber, userNumber });
      }

      // ── Write mirrored rows into output sheet ──────────────────────────
      const attendanceOutRow = [uuid, ...attendanceRow.slice(1)];

      //  Build shiftOutRow from resolved shiftIDs, not raw Excel shiftNames
      const shiftOutRow = [
        uuid,
        employeeCode,
        name,
        userNumber,
        branch,
        department,
        designation,
        ...attendanceData.map((a) => a.shiftID || ''),
      ];

      const whOutRow = [uuid, ...whRow.slice(1)];

      const totalCols = 6 + dates.length;
      while (attendanceOutRow.length < totalCols) attendanceOutRow.push('');
      while (whOutRow.length < totalCols) whOutRow.push('');

      outSheet.addRow([...attendanceOutRow, remark || '']);
      outSheet.addRow([...shiftOutRow, '']);
      outSheet.addRow([...whOutRow, '']);
    }

    // ── Save validated Excel ───────────────────────────────────────────────
    const savePath = path.join(
      'uploads/validated',
      `attendance_validation_${Date.now()}.xlsx`,
    );
    await outWorkbook.xlsx.writeFile(savePath);

    // ── Delete original upload ─────────────────────────────────────────────
    try {
      const uploadedFilePath = path.resolve(req.file.path);
      if (fs.existsSync(uploadedFilePath)) {
        fs.unlinkSync(uploadedFilePath);
      }
    } catch (err) {
      console.error('Failed to delete uploaded file:', err);
    }

    // ── Paginate ───────────────────────────────────────────────────────────
    const start = (Number(page) - 1) * Number(limit);
    const end = start + Number(limit);

    const invalidRowNumbers = invalidRows.map((r) => r.rowNumber).join(',');

    return res.json({
      status: 200,
      message: message.usermessage.validateMessage('Attendance'),
      validatedExcelPath: savePath,
      dates,
      users: users.slice(start, end),
      isCorrectData,
      totalRecords: users.length,
      page: Number(page),
      limit: Number(limit),
      invalidRowNumbers,
      isAttRemarkRequired: company?.isAttRemarkRequired || false,
      summary: {
        totalRows: users.length,
        invalidRowCount: invalidRows.length,
        hasErrors: invalidRows.length > 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getValidatedAttendanceData = async (req, res, next) => {
  try {
    const { validatedExcelPath, page = 1, limit = 20 } = req.body;

    if (!validatedExcelPath) {
      return res
        .status(400)
        .json({ status: 400, message: 'Validated Excel path is required!' });
    }

    if (!fs.existsSync(validatedExcelPath)) {
      return res
        .status(404)
        .json({ status: 404, message: 'Validated file not found!' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(validatedExcelPath);
    const worksheet = workbook.getWorksheet('Attendance Report');

    const headerRow = worksheet.getRow(1).values;
    // Both header and data now start with UUID, so they are perfectly aligned
    const remarkColIndex =
      headerRow.indexOf('remark') !== -1
        ? headerRow.indexOf('remark')
        : headerRow.length - 1;
    const dates = headerRow.slice(8, remarkColIndex); // Dates start at index 8 (uuid + 6 info columns)

    const allUsers = [];

    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 3) {
      const attendanceRow = worksheet.getRow(rowIndex).values;
      const shiftRow = worksheet.getRow(rowIndex + 1).values;
      const whRow = worksheet.getRow(rowIndex + 2).values;

      const uuid = attendanceRow[1];
      const employeeCode = attendanceRow[2];
      const name = attendanceRow[3];
      const userNumber = attendanceRow[4];
      const branch = attendanceRow[5];
      const department = attendanceRow[6];
      const designation = attendanceRow[7];
      const remark = attendanceRow[remarkColIndex] || null;

      const attendance = dates.map((attendance_date, i) => {
        return {
          attendance_date,
          status: attendanceRow[i + 8] || 'A',
          shiftID: shiftRow[i + 8] || null,
          weekOffHoliday: whRow[i + 8] || '',
        };
      });

      allUsers.push({
        uuid,
        employeeCode,
        name,
        userNumber,
        branch,
        department,
        designation,
        attendance,
        remark: remark || null,
      });
    }

    // Paginate
    const start = (Number(page) - 1) * Number(limit);
    const end = start + Number(limit);
    const invalidRows = allUsers
      .map((u, i) => ({ remark: u.remark, rowNumber: i + 1 }))
      .filter((u) => u.remark);
    return res.json({
      status: 200,
      dates,
      users: allUsers.slice(start, end),
      totalRecords: allUsers.length,
      page: Number(page),
      limit: Number(limit),
      invalidRowNumbers: invalidRows.map((r) => r.rowNumber).join(','),
      summary: {
        totalRows: allUsers.length,
        invalidRowCount: allUsers.filter((u) => u.remark).length,
        hasErrors: allUsers.some((u) => u.remark),
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateValidatedAttendanceRow = async (req, res, next) => {
  try {
    const {
      validatedExcelPath,
      companyMasterId,
      userNumber,
      attendance,
      uuid,
    } = req.body;

    if (!validatedExcelPath) {
      return res
        .status(400)
        .json({ status: 400, message: 'Validated Excel path is required!' });
    }

    if (!fs.existsSync(validatedExcelPath)) {
      return res
        .status(404)
        .json({ status: 404, message: 'Validated file not found!' });
    }

    const allShifts = await shiftModel.findAll({
      where: { status: 1, companyMasterID: companyMasterId },
      attributes: ['shiftID'],
    });

    const formattedDate = attendance[attendance.length - 1]?.attendance_date
      ? moment(
          attendance[attendance.length - 1]?.attendance_date,
          'DD/MM/YYYY',
        ).format('YYYY-MM-DD')
      : moment().format('YYYY-MM-DD');

    const userData = await UserMaster.findOne({
      where: { userNumber, status: 1, companyMasterId: companyMasterId },
      attributes: ['userMasterID', 'userNumber'],
      include: [
        {
          required: false,
          separate: true,
          model: EmployeeAttendancePolicy,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(formattedDate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(formattedDate),
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
            },
          ],
        },
      ],
    });

    const validShiftIDs = allShifts.map((s) => s.shiftID);
    const validStatuses = ['A', 'P', 'HFD'];

    const allUsers = await UserMaster.findAll({
      where: { companyMasterId: companyMasterId, status: 1 },
      attributes: ['userNumber'],
    });
    const validUserNumbers = allUsers.map((u) => String(u.userNumber));

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(validatedExcelPath);
    const worksheet = workbook.getWorksheet('Attendance Report');
    const uploadedUserNumbers = new Set();
    const duplicateUserNumbers = new Set();

    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 3) {
      const row = worksheet.getRow(rowIndex).values;

      const fileUserNumber = row[4]?.toString()?.trim() || '';

      if (!fileUserNumber) continue;

      if (uploadedUserNumbers.has(fileUserNumber)) {
        duplicateUserNumbers.add(fileUserNumber);
      } else {
        uploadedUserNumbers.add(fileUserNumber);
      }
    }
    const headerRow = worksheet.getRow(1).values;
    // Both header and data now start with UUID
    const remarkColIndex =
      headerRow.indexOf('remark') !== -1
        ? headerRow.indexOf('remark')
        : headerRow.length - 1;

    let rowFound = false;
    let updatedUser = null;

    const isNonPresentOT =
      userData?.employeeAttendancePolicies?.[0]?.attendancePolicy
        ?.isNonPresentOT || false;

    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 3) {
      const attendanceRow = worksheet.getRow(rowIndex).values;
      const uuid = attendanceRow[1];
      const existingUserNumber = attendanceRow[4];

      if (String(uuid) === String(req.body.uuid)) {
        rowFound = true;

        const remarkList = [];

        const isUserExist = validUserNumbers.includes(String(userNumber));
        if (!isUserExist) {
          remarkList.push(message.usermessage.notFoundMessage('User'));
        }

        if (duplicateUserNumbers.has(String(userNumber))) {
          remarkList.push(
            `Duplicate user number (${userNumber}) found in excel`,
          );
        }

        // Update userNumber cell in Excel
        worksheet.getRow(rowIndex).getCell(4).value = userNumber;
        const updatedAttendance = [];

        attendance.forEach((att, i) => {
          const colIndex = i + 8;
          let { status, shiftID } = att;

          // Validate status
          if (status && !validStatuses.includes(status)) {
            remarkList.push(
              `Invalid status value (${status}) at ${att.attendance_date}`,
            );
          }

          // Validate shiftID
          if (shiftID && !validShiftIDs.includes(shiftID)) {
            remarkList.push(`Invalid shift at ${att.attendance_date}`);
            shiftID = null;
          }

          // If status is A, clear shift
          if (status === 'A') {
            shiftID = null;
          }

          // Row 3 (weekOffHoliday)
          const weekOffHoliday =
            worksheet.getRow(rowIndex + 2).getCell(colIndex).value || '';

          if (isNonPresentOT && status == 'HFD') {
            remarkList.push(
              `Half Day status is not allowed at ${att.attendance_date}`,
            );
          }

          // Update status row
          worksheet.getRow(rowIndex).getCell(colIndex).value = status;

          worksheet.getRow(rowIndex + 1).getCell(colIndex).value =
            shiftID || '';

          updatedAttendance.push({
            attendance_date: att.attendance_date,
            status,
            shiftID,
            weekOffHoliday,
          });
        });

        const remark = remarkList.length ? remarkList.join(', ') : null;

        // Update remark in excel
        worksheet.getRow(rowIndex).getCell(remarkColIndex).value = remark || '';

        // Build updated user object to return
        updatedUser = {
          uuid: attendanceRow[1],
          employeeCode: attendanceRow[2],
          name: attendanceRow[3],
          userNumber: attendanceRow[4],
          branch: attendanceRow[5],
          department: attendanceRow[6],
          designation: attendanceRow[7],
          attendance: updatedAttendance,
          remark,
        };

        break;
      }
    }

    if (!rowFound) {
      return res.status(404).json({
        status: 404,
        message: 'User row not found in validated file!',
      });
    }

    await workbook.xlsx.writeFile(validatedExcelPath);

    // Check if whole file still has errors
    let hasErrors = false;
    const invalidRows = [];

    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 3) {
      const remark = String(
        worksheet.getRow(rowIndex).getCell(remarkColIndex).value || '',
      ).trim();
      const dataRowNumber = Math.floor((rowIndex - 2) / 3) + 1; // 1-based data row number

      if (remark) {
        hasErrors = true;
        invalidRows.push({ rowNumber: dataRowNumber });
      }
    }

    const invalidRowNumbers = invalidRows.map((r) => r.rowNumber).join(',');

    return res.json({
      status: 200,
      message: 'Row updated successfully!',
      updatedUser,
      invalidRowNumbers,
      summary: {
        hasErrors,
        invalidRowCount: invalidRows.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteValidatedAttendanceRow = async (req, res, next) => {
  try {
    const { validatedExcelPath, userNumber, uuid } = req.body;

    if (!validatedExcelPath) {
      return res.status(400).json({
        status: 400,
        message: 'Validated Excel path is required!',
      });
    }

    if (!fs.existsSync(validatedExcelPath)) {
      return res.status(404).json({
        status: 404,
        message: 'Validated file not found!',
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(validatedExcelPath);

    const worksheet = workbook.getWorksheet('Attendance Report');

    let rowFound = false;
    let deletedRowIndex = null;

    // Find matching user row by UUID
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 3) {
      const attendanceRow = worksheet.getRow(rowIndex).values;
      const existingUUID = attendanceRow[1]?.toString()?.trim() || '';

      if (existingUUID === String(uuid).trim()) {
        rowFound = true;
        deletedRowIndex = rowIndex;
        break;
      }
    }

    if (!rowFound) {
      return res.status(404).json({
        status: 404,
        message: 'User row not found in validated file!',
      });
    }

    // Determine remark column index: both header and data rows start with UUID
    const originalHeaderRow = worksheet.getRow(1).values;
    const remarkColIndex =
      originalHeaderRow.indexOf('remark') !== -1
        ? originalHeaderRow.indexOf('remark')
        : originalHeaderRow.length - 1;
    const totalCols = remarkColIndex; // total columns 1-based index (header and data are aligned)

    // Collect all rows except the 3 deleted ones
    const allRows = [];
    for (let i = 1; i <= worksheet.rowCount; i++) {
      if (i >= deletedRowIndex && i <= deletedRowIndex + 2) continue;
      const rowVals = worksheet.getRow(i).values.slice(1); // remove ExcelJS leading empty
      // Pad row to full column count so ExcelJS doesn't truncate trailing empty cells
      while (rowVals.length < totalCols) rowVals.push('');
      allRows.push(rowVals);
    }

    // Rebuild into fresh workbook to avoid ExcelJS internal state issues
    const newWorkbook = new ExcelJS.Workbook();
    const newWorksheet = newWorkbook.addWorksheet('Attendance Report');
    allRows.forEach((rowValues) => newWorksheet.addRow(rowValues));
    // =========================
    // Rebuild Duplicate Remarks
    // =========================

    const uploadedUserNumbers = new Set();
    const duplicateUserNumbers = new Set();

    // Detect duplicates again
    for (let rowIndex = 2; rowIndex <= newWorksheet.rowCount; rowIndex += 3) {
      const attendanceRow = newWorksheet.getRow(rowIndex).values;
      const fileUserNumber = attendanceRow[4]?.toString()?.trim() || '';

      if (!fileUserNumber) continue;

      if (uploadedUserNumbers.has(fileUserNumber)) {
        duplicateUserNumbers.add(fileUserNumber);
      } else {
        uploadedUserNumbers.add(fileUserNumber);
      }
    }

    let hasErrors = false;
    const invalidRows = [];
    let totalRecords = 0;

    // Rebuild remarks
    for (let rowIndex = 2; rowIndex <= newWorksheet.rowCount; rowIndex += 3) {
      totalRecords++;

      const attendanceRow = newWorksheet.getRow(rowIndex);
      const existingUserNumber =
        attendanceRow.getCell(4).value?.toString()?.trim() || '';

      let remark = String(
        attendanceRow.getCell(remarkColIndex).value || '',
      ).trim();

      // Remove old duplicate remark
      remark = remark
        .replace(/Duplicate user number \([^)]+\) found in excel,?\s*/g, '')
        .trim()
        .replace(/,$/, '')
        .trim();

      // Add duplicate remark again if still duplicate
      if (duplicateUserNumbers.has(existingUserNumber)) {
        remark = remark
          ? `${remark}, Duplicate user number (${existingUserNumber}) found in excel`
          : `Duplicate user number (${existingUserNumber}) found in excel`;
      }

      // Update remark in excel
      attendanceRow.getCell(remarkColIndex).value = remark;

      const dataRowNumber = Math.floor((rowIndex - 2) / 3) + 1;

      if (remark) {
        hasErrors = true;
        invalidRows.push({ rowNumber: dataRowNumber });
      }
    }

    await newWorkbook.xlsx.writeFile(validatedExcelPath);

    const invalidRowNumbers = invalidRows.map((r) => r.rowNumber).join(',');

    return res.json({
      status: 200,
      message: 'Row deleted successfully!',
      totalRecords,
      invalidRowNumbers,
      summary: {
        hasErrors,
        invalidRowCount: invalidRows.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.reValidateStatusWiseAttendance = async (req, res, next) => {
  try {
    let { users, dates, companyMasterID } = req.body;
    let isCorrectData = true;

    const allShifts = await shiftModel.findAll({
      where: { status: 1, companyMasterID },
    });
    const validshiftIDs = allShifts.map((s) => s.shiftID);

    const allUsers = await UserMaster.findAll({
      where: { companyMasterId: companyMasterID, status: 1 },
      attributes: ['userMasterID', 'userNumber'],
    });
    const validUserNumbers = allUsers.map((u) => u.userNumber);

    const validStatuses = ['A', 'P', 'HFD'];

    // Revalidate all rows
    users = users.map((user) => {
      let remarkList = [];

      const isUserExist = validUserNumbers.includes(user.userNumber);
      let attendanceData = [];
      if (!isUserExist) {
        remarkList.push('User not found');
        isCorrectData = false;
      } else {
        attendanceData = (user.attendance || []).map((att) => {
          const { attendance_date, status, shiftID, weekOffHoliday } = att;

          // validate status
          if (status && !validStatuses.includes(status)) {
            isCorrectData = false;
            remarkList.push(
              `Invalid status value (${status}) at ${attendance_date}`,
            );
          }

          // validate shift
          if (shiftID && !validshiftIDs.includes(shiftID)) {
            isCorrectData = false;
            remarkList.push(`Invalid shift at ${attendance_date}`);
          }

          return { attendance_date, status, shiftID, weekOffHoliday };
        });
      }
      return {
        ...user,
        employeeCode: isUserExist ? user.employeeCode : '',
        name: isUserExist ? user.name : '',
        branch: isUserExist ? user.branch : '',
        department: isUserExist ? user.department : '',
        designation: isUserExist ? user.designation : '',
        attendance: attendanceData,
        remark: remarkList.join('; ') || null,
      };
    });

    return res.json({
      status: 200,
      message: message.usermessage.reValidateMessage('Attendance'),
      users,
      dates,
      isCorrectData,
    });
  } catch (err) {
    next(err);
  }
};

exports.addStatusWiseAttendance = async (req, res, next) => {
  try {
    const { validatedExcelPath, companyMasterID, attCorrRemark } = req.body;
    // ── Read users from validated Excel if path is provided ───────────────
    const users = [];
    const companyData = await companyMaster.findOne({
      where: {
        companyMasterID
      },
      attributes: ['isAttRemarkRequired']
    });

    if(companyData.isAttRemarkRequired && !attCorrRemark){
      return res.status(200).json({ status: 400, message: 'Attendance Correction Remark is Required!' });
    }
    if (validatedExcelPath) {
      if (!fs.existsSync(validatedExcelPath)) {
        return res
          .status(404)
          .json({ status: 404, message: 'Validated file not found!' });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(validatedExcelPath);
      const worksheet = workbook.getWorksheet('Attendance Report');

      const headerRow = worksheet.getRow(1).values;
      const remarkColIndex = headerRow.length - 1;
      const dates = headerRow.slice(8, remarkColIndex); // exclude remark column

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 3) {
        const attendanceRow = worksheet.getRow(rowIndex).values;
        const shiftRow = worksheet.getRow(rowIndex + 1).values;
        const whRow = worksheet.getRow(rowIndex + 2).values;
        const remark = attendanceRow[remarkColIndex];

        // Block save if any row still has errors
        if (remark) {
          return res.status(400).json({
            status: 400,
            message: 'Please fix all validation errors before saving!',
          });
        }

        const userNumber = attendanceRow[4];

        const attendance = dates.map((attendance_date, i) => {
          const colIndex = i + 8;
          const status = attendanceRow[colIndex] || 'A';
          const shiftID = shiftRow[colIndex] || '';
          const weekOffHoliday = whRow[colIndex] || '';
          const remarks = attCorrRemark;
          return { attendance_date, status, shiftID, weekOffHoliday, remarks };
        });

        users.push({ userNumber, attendance });
      }
    }
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    if (users.length === 0) {
      return res.status(400).json({
        status: 401,
        message: 'No user found for update.',
      });
    }

    companyid = companyMasterID;
    const allUserIds = users.map((u) => u.userNumber.toString());

    const formattedDates = [
      ...new Set(
        users.flatMap((u) => u.attendance.map((a) => a.attendance_date)),
      ),
    ];

    const allDates = formattedDates.map((dateStr) => {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month}-${day}`; // YYYY-MM-DD
    });

    const allShifts = await shiftModel.findAll({
      where: { status: 1, companyMasterID },
      include: [{ model: shiftTime }],
    });

    if (allShifts.length === 0) {
      return res.status(400).json({
        status: 401,
        message: 'Please create atleast one shift ',
      });
    }

    const timestamps = allDates.map((d) => new Date(d).getTime());

    const minDate = new Date(Math.min(...timestamps));
    const maxDate = new Date(Math.max(...timestamps));

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const AllUserData = await UserMaster.findAll({
      where: {
        status: 1,
        companyMasterId: companyMasterID,
        userNumber: {
          [Sequelize.Op.in]: allUserIds,
        },
        ...userAccessCondition.where,
      },
      include: [
        ...userAccessCondition.includeModels,
        { required: false, model: EmployeeJoiningDetails },
        {
          required: false,
          separate: true,
          model: EmployeeAttendancePolicy,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: maxDate,
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: minDate,
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['attendancePolicyID'],
          include: [{ model: AttendancePolicy, as: 'attendancePolicy' }],
        },
        {
          required: false,
          model: attendanceTransaction,
          where: {
            AttendanceDate: { [Sequelize.Op.in]: allDates },
          },
          include: [
            {
              separate: true,
              required: false,
              model: UserShortLeave,
              where: {
                date: { [Sequelize.Op.in]: allDates },
                authorizationStatus: 3,
              },
            },
          ],
        },
        {
          required: false,
          model: EmployeeBranch,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: maxDate,
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: minDate,
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['branchID'],
          include: [{ model: BranchMaster, as: 'branchMaster' }],
        },
        {
          required: false,
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: maxDate,
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: minDate,
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
        },
        {
          model: EmployeeDepartment,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: maxDate,
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: minDate,
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
        },
        {
          required: false,
          separate: true,
          model: EmployeeSalaryPolicy,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: maxDate,
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: minDate,
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['salaryPolicyID'],
          include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
        },
        {
          required: false,
          model: ShiftRoster,
          where: {
            status: 1,
            shiftRosterDate: { [Sequelize.Op.in]: allDates },
          },
        },
        {
          required: false,
          model: EmployeeShift,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: maxDate,
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: minDate,
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
        },
        {
          required: false,
          separate: true,
          model: EmployeeShortLeavePolicy,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: maxDate,
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: minDate,
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['shortLeavePolicyID'],
          include: [{ model: ShortLeavePolicy }],
        },
        {
          required: false,
          model: EmployeeWeekOff,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: maxDate,
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: minDate,
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['weekOffPolicyID'],
          include: [{ model: weekOffPolicy, as: 'weekoff' }],
        },

        // holiday policy
        {
          model: employeeHolidayPolicy,
          required: false,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: maxDate,
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: minDate,
                },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
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
      order: [[{ model: ShiftRoster }, 'shiftRosterDate', 'ASC']],
    });

    const notAddedAttendanceUsers = new Set();

    /*
     * ================================================================
     * USER-WISE TRANSACTION
     * ================================================================
     */
    for (let i = 0; i < AllUserData.length; i++) {
      const userData = AllUserData[i];

      const inputRow = users.find((e) => e.userNumber == userData.userNumber);

      if (!inputRow) {
        continue;
      }

      const transaction = await sequelize.transaction();
      const bullkShiftRosterArray = [];
      const bulkAttendanceTransactionArray = [];
      const bulkAttendanceCorrectionWithAttendanceTransIDArray = [];
      const attendanceTransIDs = [];
      const incentiveDeleteConditions = [];
      const shortLeaveIds = [];
      const allAttendanceForLogs = [];
      const incentiveDeleteIds = [];
      const destroyShiftRosterIDs = [];

      try {
        const attendancePolicy =
          userData?.employeeAttendancePolicies?.[0]?.attendancePolicy || null;

        const empPayrollFrequency =
          userData.employeeJoiningDetails?.[0]?.payrollFrequency ||
          PayrollFrequencyType.MONTHLY;

        const salaryPolicyData =
          userData.employeeSalaryPolicies?.[0]?.salaryPolicy
            ?.payrollFrequency == empPayrollFrequency
            ? userData.employeeSalaryPolicies?.[0]?.salaryPolicy
            : null;

        const otAdded =
          salaryPolicyData?.salarycalculationBasedon == 'hourwise'
            ? salaryPolicyData?.overtimeAdded
            : overtimeAddedEnum.DAILY;
        const monthlyOtCalType =
          otAdded == overtimeAddedEnum.MONHTLY
            ? salaryPolicyData.monthly_ot_cal_type
            : null;

        const holidayPolicies = userData.employeeHolidayPolicies || [];

        const holidayCoffRuleIn = attendancePolicy?.holidayCoffRuleIn;

        const typeCondition =
          attendancePolicy?.WHPHPriority == 'PH' ? "'holiday'" : "'weekoff'";

        const isNonPresentOT =
          userData?.employeeAttendancePolicies?.[0]?.attendancePolicy
            ?.isNonPresentOT || false;

        for (let att of inputRow.attendance) {
          const checkDate = normalizeDate(att.attendance_date);
          const employeeShitRoater =
            userData.shiftRosters?.find(
              (e) => e.shiftRosterDate == checkDate,
            ) || null;

          const remarks = att.remarks || null;
          const day = new Date(checkDate).toLocaleString('en-us', {
            weekday: 'long',
          });

          const get_options = allShifts.filter((s) =>
            s.shiftTimes.some((st) => st.day === day),
          );

          if (get_options.length === 0) {
            throw new Error(
              `Please create atleast one shift Time for user ${userData.displayName}`,
            );
          }

          const attendance_data = userData?.attendanceTransactions.find(
            (e) => checkDate == e.AttendanceDate,
          );

          const userShortLeave = attendance_data?.userShortLeaves?.[0] || null;

          const holidayPolicy =
            holidayPolicies.find(
              (e) =>
                new Date(e.applicableDate).getTime() <=
                  new Date(checkDate).getTime() &&
                (!e.endDate ||
                  new Date(e.endDate).getTime() >=
                    new Date(checkDate).getTime()),
            )?.HolidayPolicy || null;

          // holiday compensation rules
          const holidayCompensationRules =
            (holidayPolicy?.holidayCompensationRules || []).find((e) =>
              (e.holidayDate || []).includes(checkDate),
            ) || null;

          if (isNonPresentOT && att.status == 'HFD') {
            notAddedAttendanceUsers.add(userData.displayName);
          }

          if (att.status == 'P') {
            att.status = 1;
          } else if (att.status == 'A') {
            att.status = 0;
          } else if (att.status == 'HFD') {
            att.status = 0.5;
          }
          const attendanceType = att.status;
          if (attendance_data && att.status != 0) {
            if (
              attendance_data?.fulldayhalfday == att?.status &&
              att?.shiftID == attendance_data?.Shift
            ) {
              continue;
            }
          } else if (!attendance_data && att.status == 0) {
            continue;
          } else if (attendance_data?.fulldayhalfday == 0 && att.status == 0) {
            continue;
          }

          if (attendance_data?.AttendanceTransID) {
            // remove auto punchout job

            await removePunchoutQueue(attendance_data.AttendanceTransID);

            if (attendanceType == 0) {
              bulkAttendanceCorrectionWithAttendanceTransIDArray.push({
                AttendanceTransID: attendance_data.AttendanceTransID,
                userMasterID: attendance_data.userMasterID,
                departmentID: attendance_data.departmentID,
                designationID: attendance_data.designationID,
                branchID: attendance_data.branchID,
                InDatetime: attendance_data.InDatetime,
                OutDateTime: attendance_data.OutDateTime,
                AttendanceDate: attendance_data.AttendanceDate,
                Shift: attendance_data.Shift,
                Shifthrs: attendance_data.Shifthrs,
                ShiftIntime: attendance_data.ShiftIntime,
                ShiftoutTime: attendance_data.ShiftoutTime,
                InHrs: Math.floor(attendance_data.InHrs),
                OutHrs: attendance_data.OutHrs,
                LateBy: attendance_data.LateBy,
                EarlyBy: attendance_data.EarlyBy,
                Panalty: attendance_data.Panalty,
                PanaltyDeduction: attendance_data.PanaltyDeduction,
                Othrs: attendance_data.Othrs,
                fulldayhalfday: attendance_data.fulldayhalfday,
                punchINbranch: attendance_data.punchINbranch,
                punchOUTbranch: attendance_data.punchOUTbranch,
                goEarlyUsed: attendance_data.goEarlyUsed,
                createBy: createBy,
                createByIp: createByIp,
                Status: attendance_data.Status,
                updateBy: createBy,
                updateByIp: createByIp,
                ChangeBy: 'mannual',
                roundOffMinutes: attendance_data.roundOffMinutes,
                remarks: attendance_data.remarks,
                withoutOtMinutes: attendance_data.withoutOtMinutes,
              });

              //asopalav destroy both
              if (+companyMasterID == 277 || +companyMasterID == 298) {
                const IncentivetypeID = +companyid == 277 ? 155 : 233;

                incentiveDeleteConditions.push({
                  userMasterID: attendance_data.userMasterID,
                  incentiveDate: attendance_data.AttendanceDate,
                  IncentivetypeID: {
                    [Op.in]: [IncentivetypeID, 156],
                  },
                });
              }

              const dataOfINC = await Employeeincentive.findAll({
                where: {
                  userMasterID: attendance_data.userMasterID,
                  incentiveDate: attendance_data.AttendanceDate,
                },
                include: [
                  {
                    required: true,
                    model: Incentivetype,
                    where: Sequelize.or(
                      Sequelize.where(
                        sequelize.fn(
                          'TRIM',
                          sequelize.fn(
                            'LOWER',
                            sequelize.col('incentivetype.incentivetypename'),
                          ),
                        ),
                        'food allowance',
                      ),
                      Sequelize.where(
                        sequelize.fn(
                          'TRIM',
                          sequelize.fn(
                            'LOWER',
                            sequelize.col('incentivetype.incentivetypename'),
                          ),
                        ),
                        'tea/coffee allowance',
                      ),
                    ),
                  },
                ],
                transaction,
              });

              if (dataOfINC.length > 0) {
                incentiveDeleteIds.push(
                  ...dataOfINC.map((e) => e.employeeincentiveID),
                );
              }

              await deleteOvertimeCoff(
                attendance_data.userMasterID,
                attendance_data.AttendanceDate,
                transaction,
              );

              attendanceTransIDs.push(attendance_data.AttendanceTransID);
              if (employeeShitRoater && !employeeShitRoater.isFromRoster) {
                destroyShiftRosterIDs.push(employeeShitRoater.shiftRosterID);
              }
              // cancel short leave
              if (userShortLeave) {
                shortLeaveIds.push(userShortLeave.userShortLeaveId);
              }

              // ------------------------------------- OD on Weekoff or holiday -----------------------------------------

              const shiftData = get_options.find(
                (e) => e.shiftID == attendance_data.Shift,
              );

              await OD_On_WeekoffForAbsent(
                attendance_data,
                shiftData,
                attendancePolicy,
                companyMasterID,
                createBy,
                createByIp,
                transaction,
                otAdded,
                monthlyOtCalType,
                holidayCoffRuleIn,
                holidayCompensationRules,
              );
            } else {
              if (!employeeShitRoater) {
                bullkShiftRosterArray.push({
                  shiftID: att.shiftID,
                  shiftRosterDate: checkDate,
                  userMasterID: userData.userMasterID,
                  isFromRoster: false,
                });
              } else {
                await ShiftRoster.update(
                  {
                    shiftID: att.shiftID,
                    isFromRoster: false,
                  },
                  {
                    where: { shiftRosterID: employeeShitRoater.shiftRosterID },
                    individualHooks: true,
                    user: req.userDetails,
                    transaction,
                  },
                );
              }

              const shiftData = get_options.find(
                (e) => e.shiftID == att.shiftID,
              );

              const shiftTimeData = shiftData.shiftTimes?.[0] || null;

              // Set Shift In Out Times
              let shiftInTime = shiftTimeData.statTime,
                shiftOutTime,
                punchOutDate = checkDate,
                totaltime;
              let weekOffMinutes = 0;
              let normalDayMinutes = totaltime;
              if (att.status == '0.5') {
                shiftOutTime = shiftTimeData.firsthalfendtime;
                totaltime = Math.round(+shiftTimeData.totalhourshalfday * 60);
              } else {
                const findWeekOffData = await findWeekoff(
                  userData.userMasterID,
                  checkDate,
                  transaction,
                );

                if (
                  findWeekOffData &&
                  findWeekOffData.WHDayType == 'SH' &&
                  findWeekOffData.value == 0.5
                ) {
                  const totalMinutesSecondHalf =
                    Math.round(+shiftTimeData.totalhours * 60) -
                    Math.round(+shiftTimeData.totalhourshalfday * 60);

                  totaltime = Math.round(+shiftTimeData.totalhourshalfday * 60);
                  weekOffMinutes = totalMinutesSecondHalf;
                  shiftOutTime = shiftTimeData.endtime;
                  normalDayMinutes = totaltime;
                } else {
                  shiftOutTime = shiftTimeData.endtime;
                  totaltime = Math.round(+shiftTimeData.totalhours * 60);
                  // normalDayMinutes = totaltime;
                }
              }

              // if Punch Out Date Time next day

              if (
                new Date(checkDate + ' ' + shiftInTime) >
                new Date(checkDate + ' ' + shiftOutTime)
              ) {
                const date = new Date(checkDate);
                date.setDate(date.getDate() + 1);

                punchOutDate =
                  date.getFullYear() +
                  '-' +
                  String(date.getMonth() + 1).padStart(2, '0') +
                  '-' +
                  String(date.getDate()).padStart(2, '0');
              }
              // Create in date time and out date time
              const intime = getDateTimeFormat(checkDate, shiftInTime);
              const outtime = getDateTimeFormat(punchOutDate, shiftOutTime);

              if (
                +companyid == 168 &&
                new Date(attendance_data.InDatetime) <
                  new Date(
                    attendance_data.AttendanceDate +
                      ' ' +
                      attendance_data.ShiftIntime,
                  )
              ) {
                const difference = Math.abs(
                  (new Date(
                    attendance_data.AttendanceDate +
                      ' ' +
                      attendance_data.ShiftIntime,
                  ) -
                    new Date(attendance_data.InDatetime)) /
                    (1000 * 60),
                );
                totaltime = Math.round(totaltime - +difference);
              }

              bulkAttendanceCorrectionWithAttendanceTransIDArray.push({
                AttendanceTransID: attendance_data.AttendanceTransID,
                userMasterID: attendance_data.userMasterID,
                departmentID: attendance_data.departmentID,
                designationID: attendance_data.designationID,
                branchID: attendance_data.branchID,
                InDatetime: attendance_data.InDatetime,
                OutDateTime: attendance_data.OutDateTime,
                AttendanceDate: attendance_data.AttendanceDate,
                Shift: attendance_data.Shift,
                Shifthrs: attendance_data.Shifthrs,
                ShiftIntime: attendance_data.ShiftIntime,
                ShiftoutTime: attendance_data.ShiftoutTime,

                InHrs: Math.floor(attendance_data.InHrs),
                OutHrs: attendance_data.OutHrs,
                LateBy: attendance_data.LateBy,
                EarlyBy: attendance_data.EarlyBy,
                Panalty: attendance_data.Panalty,
                PanaltyDeduction: att.status,
                Othrs: attendance_data.Othrs,
                fulldayhalfday: attendance_data.fulldayhalfday,
                punchINbranch: attendance_data.punchINbranch,
                punchOUTbranch: attendance_data.punchOUTbranch,
                goEarlyUsed: attendance_data.goEarlyUsed,
                createBy: createBy,
                createByIp: createByIp,
                Status: attendance_data.Status,
                updateBy: createBy,
                updateByIp: createByIp,
                ChangeBy: 'mannual',
                roundOffMinutes: attendance_data.roundOffMinutes,
                remarks: attendance_data.remarks,
                withoutOtMinutes: attendance_data.withoutOtMinutes,
                LCPenaltyFrom: attendance_data.LCPenaltyFrom,
                EGPenaltyFrom: attendance_data.EGPenaltyFrom,
                shiftShortfallMinutes: attendance_data.shiftShortfallMinutes,
              });

              let final_Minutes = Math.round(+totaltime);

              if (
                salaryPolicyData &&
                salaryPolicyData.salarycalculationBasedon == 'hourwise' &&
                salaryPolicyData.considerTimeType != 'actual'
              ) {
                if (salaryPolicyData.considerTimeValue) {
                  if (salaryPolicyData.considerTimeType == 'slotwise') {
                    final_Minutes =
                      Math.floor(
                        Math.round(+totaltime) /
                          +salaryPolicyData.considerTimeValue,
                      ) * +salaryPolicyData.considerTimeValue;
                  }

                  if (salaryPolicyData.considerTimeType == 'roundoff') {
                    final_Minutes =
                      roundToNearestHour(
                        Math.round(+totaltime),
                        +salaryPolicyData.considerTimeValue,
                      ) * 60;
                  }
                }
              }

              const [count, updatedRows] = await attendanceTransaction.update(
                {
                  InDatetime: intime,
                  OutDateTime: outtime,
                  fulldayhalfday: att.status,
                  InHrs: Math.round(+totaltime),
                  Shift: att.shiftID,
                  Shifthrs: shiftTimeData.totalhours,
                  ShiftIntime: shiftTimeData.statTime,
                  ShiftoutTime: shiftOutTime,
                  OutHrs: null,
                  LateBy: null,
                  EarlyBy: null,
                  Panalty: null,
                  PanaltyDeduction: null,
                  goEarlyUsed: 0,
                  goEarlyPanalty: null,
                  goEarlyPanaltyDeduction: null,
                  earlyPenaltyMinutes: null,
                  latePenaltyMinutes: null,
                  lunchBreak: null,
                  teaBreak: null,
                  lunchBreakStartTime: null,
                  lunchBreakEndTime: null,
                  teaBreakInStartTime: null,
                  teaBreakEndTime: null,
                  updateBy: createBy,
                  updateByIp: createByIp,
                  roundOffMinutes: Math.round(+final_Minutes),
                  remarks,
                  withoutOtMinutes: Math.round(+final_Minutes),
                  shiftShortfallMinutes: null,
                },
                {
                  where: {
                    AttendanceTransID: attendance_data.AttendanceTransID,
                  },
                  transaction,
                  returning: true,
                },
              );

              const get_one_data = updatedRows[0];

              await deleteOvertimeCoff(
                get_one_data.userMasterID,
                get_one_data.AttendanceDate,
                transaction,
              );

              // ------------------------------------- OD on Weekoff or holiday -----------------------------------------

              const checkWH = await getWeekoffHoliday(
                get_one_data.userMasterID,
                get_one_data.AttendanceDate,
                typeCondition,
                transaction,
              );

              const weekoffType = checkWH?.tableName || null;
              // if weekoff or holiday and attendance_data policy
              if (checkWH) {
                // check OD is approved or not
                const odData = await getODData(
                  get_one_data.userMasterID,
                  get_one_data.AttendanceDate,
                  transaction,
                );

                const odDays = odData.reduce((acc, obj) => acc + +obj.days, 0);

                if (get_one_data.fulldayhalfday != 1 && odDays > 0) {
                  // check if OD is applied for Full Day or Second Half
                  const checkSecondHalfOD = odData.find((e) =>
                    ['Full Day', 'Second Half'].includes(e.userLeave.DayType),
                  );

                  let minutes = checkSecondHalfOD
                    ? Math.round(+shiftTimeData.totalhours * 60) -
                      Math.round(+shiftTimeData.totalhourshalfday * 60)
                    : 0;
                  // if half day weekoff
                  if (checkWH.value == 0.5) {
                    minutes += weekOffMinutes;
                  } else {
                    minutes += final_Minutes;
                  }

                  // if OD on weekOff add OT/ED/Coff
                  await add_OD_On_weekOff_Coff_OT_ED(
                    attendancePolicy,
                    get_one_data,
                    companyMasterID,
                    createBy,
                    createByIp,
                    minutes,
                    transaction,
                    minutes,
                    normalDayMinutes,
                    get_one_data.userMasterID,
                    get_one_data.AttendanceDate,
                    otAdded,
                    monthlyOtCalType,
                    weekoffType,
                    holidayCoffRuleIn,
                    holidayCompensationRules,
                  );
                } else {
                  // if full day attendance_data
                  await add_weekOff_Coff_OT_ED(
                    attendancePolicy,
                    get_one_data,
                    companyMasterID,
                    createBy,
                    createByIp,
                    final_Minutes,
                    transaction,
                    weekOffMinutes,
                    normalDayMinutes,
                    otAdded,
                    monthlyOtCalType,
                    weekoffType,
                    holidayCoffRuleIn,
                    holidayCompensationRules,
                  );
                }
              }

              // Condition for Asopalav
              if (
                +companyid === 277 ||
                +companyid == 298 ||
                +companyid == 300
              ) {
                await AddAsopalavBreakTime_Manual(
                  get_one_data.userMasterID,
                  [],
                  companyid,
                  checkDate,
                  get_one_data.AttendanceTransID,
                  transaction,
                );
              }

              allAttendanceForLogs.push(get_one_data);

              // cancel short leave
              if (userShortLeave) {
                shortLeaveIds.push(userShortLeave.userShortLeaveId);
              }
              // Add Food Allowance Bonus

              await addFoodAllowanceInAttendance_Manual(
                get_one_data,
                Boolean(checkWH),
                transaction,
              );
            }
          } else {
            if (attendanceType != '0') {
              if (!employeeShitRoater) {
                bullkShiftRosterArray.push({
                  shiftID: att.shiftID,
                  shiftRosterDate: checkDate,
                  userMasterID: userData.userMasterID,
                  createBy,
                  createByIp,
                  isFromRoster: false,
                });
              } else {
                await ShiftRoster.update(
                  {
                    shiftID: att.shiftID,
                    isFromRoster: false,
                  },
                  {
                    where: { shiftRosterID: employeeShitRoater.shiftRosterID },
                    individualHooks: true,
                    user: req.userDetails,
                    transaction,
                  },
                );
              }

              const shiftData = get_options.find(
                (e) => e.shiftID == att.shiftID,
              );

              const shiftTimeData = shiftData.shiftTimes[0].dataValues;

              // Set Shift In Out Times
              let shiftInTime = shiftTimeData.statTime,
                shiftOutTime,
                punchOutDate = checkDate,
                totaltime;
              let weekOffMinutes = 0;
              let normalDayMinutes = totaltime;
              if (att.status == '0.5') {
                shiftOutTime = shiftTimeData.firsthalfendtime;
                totaltime = Math.round(+shiftTimeData.totalhourshalfday * 60);
              } else {
                const findWeekOffData = await findWeekoff(
                  userData.userMasterID,
                  checkDate,
                  transaction,
                );

                if (
                  findWeekOffData &&
                  findWeekOffData.WHDayType == 'SH' &&
                  findWeekOffData.value == 0.5
                ) {
                  const totalMinutesSecondHalf =
                    Math.round(+shiftTimeData.totalhours * 60) -
                    Math.round(+shiftTimeData.totalhourshalfday * 60);

                  totaltime = Math.round(+shiftTimeData.totalhourshalfday * 60);
                  weekOffMinutes = totalMinutesSecondHalf;
                  shiftOutTime = shiftTimeData.endtime;
                  normalDayMinutes = totaltime;
                } else {
                  shiftOutTime = shiftTimeData.endtime;
                  totaltime = Math.round(+shiftTimeData.totalhours * 60);
                  // normalDayMinutes = totaltime;
                }
              }

              // if Punch Out Date Time next day

              if (
                new Date(checkDate + ' ' + shiftInTime) >
                new Date(checkDate + ' ' + shiftOutTime)
              ) {
                const date = new Date(checkDate);
                date.setDate(date.getDate() + 1);

                punchOutDate =
                  date.getFullYear() +
                  '-' +
                  String(date.getMonth() + 1).padStart(2, '0') +
                  '-' +
                  String(date.getDate()).padStart(2, '0');
              }
              // Create in date time and out date time
              const intime = getDateTimeFormat(checkDate, shiftInTime);
              const outtime = getDateTimeFormat(punchOutDate, shiftOutTime);

              if (
                +companyid == 168 &&
                new Date(intime) < new Date(checkDate + ' ' + shiftInTime)
              ) {
                const difference = Math.abs(
                  (new Date(checkDate + ' ' + shiftInTime) - new Date(intime)) /
                    (1000 * 60),
                );
                totaltime = Math.round(totaltime - +difference);
              }

              // set roundoff minutes

              let final_Minutes = Math.round(+totaltime);

              if (
                salaryPolicyData &&
                salaryPolicyData.salarycalculationBasedon == 'hourwise' &&
                salaryPolicyData.considerTimeType != 'actual'
              ) {
                if (salaryPolicyData.considerTimeValue) {
                  if (salaryPolicyData.considerTimeType == 'slotwise') {
                    final_Minutes =
                      Math.floor(
                        Math.round(+totaltime) /
                          +salaryPolicyData.considerTimeValue,
                      ) * +salaryPolicyData.considerTimeValue;
                  }

                  if (salaryPolicyData.considerTimeType == 'roundoff') {
                    final_Minutes =
                      roundToNearestHour(
                        Math.round(+totaltime),
                        +salaryPolicyData.considerTimeValue,
                      ) * 60;
                  }
                }
              }

              const get_one_data = await attendanceTransaction.create(
                {
                  userMasterID: userData.userMasterID,
                  AttendanceDate: checkDate,
                  InDatetime: intime,
                  OutDateTime: outtime,
                  Shift: att.shiftID,
                  Shifthrs: shiftTimeData.totalhours,
                  ShiftIntime: shiftTimeData.statTime,
                  ShiftoutTime: shiftOutTime,
                  InHrs: Math.round(+totaltime),
                  fulldayhalfday: att.status,
                  departmentID:
                    userData?.employeeDepartments?.[0]?.departmentId,
                  designationID:
                    userData?.employeeDesignations?.[0]?.designationId,
                  branchID:
                    userData?.employeeBranches?.[0]?.branchMaster
                      ?.branchMasterID,
                  status: 1,
                  createBy: createBy,
                  createByIp: createByIp,
                  roundOffMinutes: Math.round(+final_Minutes),
                  remarks,
                  withoutOtMinutes: Math.round(+final_Minutes),
                },
                { transaction },
              );

              await deleteOvertimeCoff(
                get_one_data.userMasterID,
                get_one_data.AttendanceDate,
                transaction,
              );

              // ------------------------------------- OD on Weekoff or holiday -----------------------------------------

              const checkWH = await getWeekoffHoliday(
                get_one_data.userMasterID,
                get_one_data.AttendanceDate,
                typeCondition,
                transaction,
              );

              const weekoffType = checkWH?.tableName || null;

              // if weekoff or holiday and attendance_data policy
              if (checkWH) {
                // check OD is approved or not
                const odData = await getODData(
                  get_one_data.userMasterID,
                  get_one_data.AttendanceDate,
                  transaction,
                );

                const odDays = odData.reduce((acc, obj) => acc + +obj.days, 0);

                if (get_one_data.fulldayhalfday != 1 && odDays > 0) {
                  // check if OD is applied for Full Day or Second Half
                  const checkSecondHalfOD = odData.find((e) =>
                    ['Full Day', 'Second Half'].includes(e.userLeave.DayType),
                  );

                  if (!checkSecondHalfOD) {
                    continue;
                  }

                  let minutes = 0;
                  // if half day weekoff
                  if (checkWH.value == 0.5) {
                    minutes = weekOffMinutes;
                  } else {
                    // if full day weekoff

                    const totalMinutesSecondHalf =
                      Math.round(+shiftTimeData.totalhours * 60) -
                      Math.round(+shiftTimeData.totalhourshalfday * 60);

                    minutes = final_Minutes + totalMinutesSecondHalf;
                  }

                  // if OD on weekOff add OT/ED/Coff
                  await add_OD_On_weekOff_Coff_OT_ED(
                    attendancePolicy,
                    get_one_data,
                    companyMasterID,
                    createBy,
                    createByIp,
                    minutes,
                    transaction,
                    minutes,
                    normalDayMinutes,
                    get_one_data.userMasterID,
                    get_one_data.AttendanceDate,
                    otAdded,
                    monthlyOtCalType,
                    weekoffType,
                    holidayCoffRuleIn,
                    holidayCompensationRules,
                  );
                } else {
                  // if full day attendance_data
                  await add_weekOff_Coff_OT_ED(
                    attendancePolicy,
                    get_one_data,
                    companyMasterID,
                    createBy,
                    createByIp,
                    final_Minutes,
                    transaction,
                    weekOffMinutes,
                    normalDayMinutes,
                    otAdded,
                    monthlyOtCalType,
                    weekoffType,
                    holidayCoffRuleIn,
                    holidayCompensationRules,
                  );
                }
              }

              // Condition for Asopalav
              if (
                +companyid === 277 ||
                +companyid == 298 ||
                +companyid == 300
              ) {
                await AddAsopalavBreakTime_Manual(
                  get_one_data.userMasterID,
                  [],
                  companyid,
                  checkDate,
                  get_one_data.AttendanceTransID,
                  transaction,
                );
              }

              allAttendanceForLogs.push(get_one_data);

              // cancel short leave
              if (userShortLeave) {
                shortLeaveIds.push(userShortLeave.userShortLeaveId);
              }

              // Add Food Allowance Bonus
              await addFoodAllowanceInAttendance_Manual(
                get_one_data,
                Boolean(checkWH),
                transaction,
              );
            }
          }
        }

        if (bulkAttendanceCorrectionWithAttendanceTransIDArray.length) {
          await attedanceCorrection.bulkCreate(
            bulkAttendanceCorrectionWithAttendanceTransIDArray,
            {
              individualHooks: true,
              user: req.userDetails,
              transaction,
            },
          );
        }

        if (attendanceTransIDs.length > 0) {
          await AttendanceLogs.destroy({
            where: {
              AttendanceTransID: attendanceTransIDs,
            },
            transaction,
          });
          await attendanceTransaction.destroy({
            where: {
              AttendanceTransID: attendanceTransIDs,
            },
            transaction,
          });
        }
        if (destroyShiftRosterIDs.length > 0) {
          await ShiftRoster.destroy({
            where: {
              shiftRosterID: destroyShiftRosterIDs,
            },
            transaction,
            user: req.userDetails,
            individualHooks: true,
          });
        }
        if (bullkShiftRosterArray.length > 0) {
          await ShiftRoster.bulkCreate(bullkShiftRosterArray, {
            individualHooks: true,
            user: req.userDetails,
            transaction,
          });
        }

        if (shortLeaveIds.length > 0) {
          await UserShortLeave.update(
            {
              authorizationStatus: 5,
              cancelRemarks: 'cancelled by manual',
            },
            {
              where: {
                userShortLeaveId: { [Op.in]: shortLeaveIds },
              },
              user: req.userDetails,
              transaction,
            },
          );
        }

        if (bulkAttendanceTransactionArray.length > 0) {
          await attendanceTransaction.bulkCreate(
            bulkAttendanceTransactionArray,
            {
              individualHooks: true,
              user: req.userDetails,
              transaction,
            },
          );
        }

        if (incentiveDeleteIds.length > 0) {
          await Employeeincentive.destroy({
            where: {
              [Op.or]: incentiveDeleteConditions,
            },
            transaction,
          });
        }

        if (incentiveDeleteIds.length > 0) {
          await Employeeincentive.destroy({
            where: {
              employeeincentiveID: { [Op.in]: incentiveDeleteIds },
            },
            transaction,
          });
        }

        await bulkCreateLogs(allAttendanceForLogs, 'manual', transaction);

        await transaction.commit();
      } catch (error) {
        /*
         * ============================================================
         * ROLLBACK ONLY THIS USER
         * ============================================================
         */

        await transaction.rollback();

        console.error(
          `Attendance update failed for user ${userData.displayName} (${userData.userMasterID}):`,
          error,
        );

        /*
         * Continue with the next employee.
         */
        continue;
      }
    }

    // Delete validated file after all users are processed
    if (validatedExcelPath) {
      try {
        fs.unlinkSync(validatedExcelPath);
      } catch (err) {
        console.error('Failed to delete validated file:', err);
      }
    }

    const msg = notAddedAttendanceUsers.size
      ? `Half-day attendance is not allowed for ${[
          ...notAddedAttendanceUsers,
        ].join(', ')}. Attendance for other users has been added successfully.`
      : message.usermessage.addMessage('Attendance');

    return res.json({
      status: 200,
      message: msg,
    });
  } catch (error) {
    next(error);
  }
};

async function findWeekoff(userMasterID, date, transaction) {
  try {
    const weekoff = await weekoffHolidayTran.findOne({
      where: {
        userMasterID,
        date,
        tableName: 'weekoff',
      },
      transaction,
    });

    return weekoff ? weekoff : null;
  } catch (error) {
    throw new Error('Error in find Weekoff: ' + error.message);
  }
}

function getDateTimeFormat(date, time) {
  const dateTime = date + ' ' + time;
  return (
    date +
    ' ' +
    String(new Date(dateTime).getHours()).padStart(2, 0) +
    ':' +
    String(new Date(dateTime).getMinutes()).padStart(2, 0) +
    ':00'
  );
}

async function AddAsopalavBreakTime_Manual(
  userid,
  attendnaceLogs,
  companyid,
  date,
  transid,
  transaction,
) {
  // Asopalav Condition

  try {
    const penaltyID = +companyid == 277 ? 90 : +companyid == 298 ? 166 : 201;

    const findPenalty = await Penalty.findOne({
      raw: true,
      where: {
        penaltyID: penaltyID,
      },
      transaction,
    });

    if (!findPenalty) return;

    await EmployeePenalties.destroy({
      where: {
        userMasterID: userid,
        penaltyDate: date,
        penaltyID: penaltyID,
      },
      transaction,
    });

    if (attendnaceLogs.length === 0) return;

    const totalBreakTime =
      new Date(date + ' 09:35 AM') > new Date(attendnaceLogs[0].logDateTime)
        ? 90
        : 45;

    for (let j = 0; j < attendnaceLogs.length; j++) {
      if (j != 0 && attendnaceLogs[j].direction == 'in') {
        const attendance = await attendanceTransaction.findOne({
          where: {
            AttendanceTransID: transid,
          },
          transaction,
        });

        const breakTime = await getAsopalavBreakTime_Manual(
          attendance,
          new Date(attendnaceLogs[j].logDateTime),
          new Date(attendnaceLogs[j - 1].logDateTime),
        );

        if (breakTime.type == 'teaBreak') {
          if (breakTime.diff + +attendance.lunchBreak > +totalBreakTime)
            await addAsopalavBreakTimePenalty_Manual(
              findPenalty,
              attendance.userMasterID,
              attendance.AttendanceDate,
              penaltyID,
              transaction,
            );

          await attendanceTransaction.update(
            {
              teaBreak: breakTime.diff,
              teaBreakInStartTime: breakTime.starttime,
              teaBreakEndTime: breakTime.endtime,
            },
            {
              where: { AttendanceTransID: attendance.AttendanceTransID },
              transaction,
            },
          );
        } else if (breakTime.type == 'lunchBreak') {
          if (breakTime.diff > totalBreakTime) {
            await addAsopalavBreakTimePenalty_Manual(
              findPenalty,
              attendance.userMasterID,
              attendance.AttendanceDate,
              penaltyID,
              transaction,
            );
          }

          await attendanceTransaction.update(
            {
              lunchBreak: breakTime.diff,
              lunchBreakStartTime: breakTime.starttime,
              lunchBreakEndTime: breakTime.endtime,
            },
            {
              where: { AttendanceTransID: attendance.AttendanceTransID },
              transaction,
            },
          );
        }
      }
    }
  } catch (error) {
    throw new Error('Error in AsopalaveBreakTime: ' + error.message);
  }
}

async function bulkCreateLogs(allAttendanceData, logType, transaction) {
  try {
    const attendanceIds = allAttendanceData.map((d) => d.AttendanceTransID);

    await AttendanceLogs.destroy({
      where: { AttendanceTransID: { [Sequelize.Op.in]: attendanceIds } },
      transaction,
    });

    const allLogEntries = [];
    const buildLog = (data, logDateTime, direction) => ({
      userMasterID: data.userMasterID,
      AttendanceTransID: data.AttendanceTransID,
      logDateTime,
      direction,
      photo: null,
      attendnaceFrom: logType,
      longitude: logType,
      latitude: logType,
      address: logType,
      createBy: data.createBy,
      createByIp: data.createByIp,
    });

    for (let data of allAttendanceData) {
      if (data.InDatetime) {
        allLogEntries.push(buildLog(data, data.InDatetime, 'in'));
      }
      if (data.OutDateTime) {
        allLogEntries.push(buildLog(data, data.OutDateTime, 'out'));
      }
    }

    if (allLogEntries.length) {
      await AttendanceLogs.bulkCreate(allLogEntries, { transaction });
    }
  } catch (error) {
    throw new Error('Error in bulkCreateLogs: ' + error.message);
  }
}

exports.dailyAttendanceSummary = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchMasterID,
      attendanceDate,
      page,
      limit,
      userMasterID,
      exportData,
      filterType,
    } = req.body;
    if (!companyMasterID || !attendanceDate)
      return res.status(200).json({
        status: 401,
        message: 'Invalid parameters!',
      });
    const datetime = asiaKolkataDateTime(new Date()).slice(0, 10);
    const whereDate = new Date(datetime);

    const condition = { companyMasterId: companyMasterID, status: 1 };
    if (userMasterID && userMasterID.length) {
      condition.userMasterID = userMasterID;
    }
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
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows: allUsersData, count } = await UserMaster.findAndCountAll({
      distinct: true,
      subQuery: false,
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
          required:
            filterType &&
            filterType == DailyAttendanceSummaryDashboardFields.PHYSICALPRESENT
              ? true
              : false,
          model: attendanceTransaction,
          where: { AttendanceDate: attendanceDate },
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
          required:
            filterType &&
            filterType == DailyAttendanceSummaryDashboardFields.WEEKOFF_HOLIDAY
              ? true
              : false,
          model: weekoffHolidayTran,
          where: {
            date: attendanceDate,
          },
        },
        {
          required:
            filterType === DailyAttendanceSummaryDashboardFields.WORKFROMHOME
              ? true
              : false,
          model: UserWorkFromHome,
          where: {
            status: 1,
            authorizationStatus: { [Sequelize.Op.ne]: 4 },
            fromDate: { [Sequelize.Op.lte]: attendanceDate },
            toDate: { [Sequelize.Op.gte]: attendanceDate },
            [Sequelize.Op.or]: [
              // condition equivalent to your HAVING
              { authorizationStatus: { [Sequelize.Op.ne]: 3 } },
              Sequelize.literal(`
          EXISTS (
            SELECT 1
            FROM "workFromHomeTransaction" AS wft
            WHERE wft."userWorkFromHomeID" = "userWorkFromHomes"."id"
            AND wft."status" = 1
            AND wft."date" = '${attendanceDate}'
          )
        `),
            ],
          },
          attributes: [
            'id',
            'userMasterID',
            'dayType',
            'fromDate',
            'toDate',
            'workFromHomeDays',
            'authorizationStatus',
          ],
          include: [
            {
              required: false,
              model: WorkFromHomeTransaction,
              where: {
                status: 1,
                date: attendanceDate,
              },
              attributes: [
                'workFromHomeTransactionID',
                'userWorkFromHomeID',
                'days',
                'date',
                'status',
              ],
            },
          ],
        },

        {
          required:
            filterType === DailyAttendanceSummaryDashboardFields.LEAVE ||
            filterType === DailyAttendanceSummaryDashboardFields.OUTDOORDUTY
              ? true
              : false,
          model: UserLeave,
          where: {
            status: 1,
            authorizationStatus: { [Sequelize.Op.ne]: 4 },
            FromDate: { [Sequelize.Op.lte]: attendanceDate },
            ToDate: { [Sequelize.Op.gte]: attendanceDate },
            [Sequelize.Op.or]: [
              { authorizationStatus: { [Sequelize.Op.ne]: 3 } },
              Sequelize.literal(`
        "userLeaves"."authorizationStatus" = 3
        AND EXISTS (
          SELECT 1
          FROM "userLeaveTransactions" AS ult
          WHERE ult."ReferenceID" = "userLeaves"."UserLeaveApplicationID"
          AND ult."status" = 1
          AND ult."date" = '${attendanceDate}'
        )
      `),
            ],
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
              where:
                filterType === DailyAttendanceSummaryDashboardFields.LEAVE
                  ? { LeaveID: { [Sequelize.Op.ne]: 25 } }
                  : { LeaveID: 25 },
            },
          ],
        },
      ],
    });

    const allUsers = allUsersData
      .filter(Boolean)
      .map((u) => (u.dataValues ? u.dataValues : u));

    await Promise.all([
      applyWeekoffHolidayFlags(allUsers, attendanceDate),
      applyLeaveFlagsAndNames(allUsers, attendanceDate),
      applyWorkFromHomeFlagsAndNames(allUsers, attendanceDate),
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

exports.genderWiseAttendanceLeaveCalc = async (req, res, next) => {
  try {
    const { companyMasterID, branchMasterID, gender } = req.body;
    let { date } = req.body;
    let total_punchin = 0,
      total_punchout = 0,
      total_weekoff = 0,
      total_onLeave = 0,
      total_holiday = 0,
      total_not_punchin = 0;

    if (!date) {
      date = new Date().toISOString().slice(0, 10);
    }

    const userMasterCondition = {
      [Sequelize.Op.or]: [
        {
          deactiveDate: { [Sequelize.Op.gt]: date },
        },
        {
          deactiveDate: { [Sequelize.Op.eq]: null },
        },
      ],
      companyMasterId: companyMasterID,
      status: [1, 0],
    };

    if (gender) {
      userMasterCondition.gender = gender;
    }

    const allIncludes = [
      {
        model: EmployeeJoiningDetails,
        attributes: ['userMasterID'],
        where: {
          joiningDate: {
            [Sequelize.Op.lte]: date,
          },
          [Sequelize.Op.or]: [
            {
              leavingDate: { [Sequelize.Op.gte]: date },
            },
            {
              leavingDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
      },
      {
        required: false,
        model: attendanceTransaction,
        attributes: ['userMasterID', 'OutDateTime', 'InDatetime'],
        where: {
          AttendanceDate: date,
        },
      },
      {
        required: false,
        model: weekoffHolidayTran,
        attributes: ['tableName'],
        where: {
          date: date,
          [Sequelize.Op.or]: [
            { optionalHoliday: false },
            { optionalHoliday: null },
          ],
        },
      },
      {
        required: false,
        model: UserLeave,
        attributes: ['authorizationStatus'],
        where: {
          FromDate: {
            [Sequelize.Op.lte]: new Date(date),
          },
          ToDate: { [Sequelize.Op.gte]: new Date(date) },
          authorizationStatus: [0, 1, 2, 3],
          status: 1,
        },
        include: [
          {
            required: false,
            model: UserLeaveTransaction,
            attributes: ['status'],
            where: {
              status: 1,
            },
          },
        ],
      },
      {
        required: false,
        model: EmployeeAttendancePolicy,
        attributes: ['attendancePolicyID'],
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

        include: [
          {
            model: AttendancePolicy,
            as: 'attendancePolicy',
            attributes: ['WHPHPriority'],
          },
        ],
      },
    ];

    if (branchMasterID) {
      allIncludes.push({
        model: BranchMaster,
        attributes: [],
        required: true,
        where: {
          branchID: branchMasterID,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(date),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(date),
              },
            },
            {
              endDate: null,
            },
          ],
          status: 1,
        },
      });
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const getPunchInOutCount = await UserMaster.findAll({
      attributes: ['userMasterID'],
      where: { ...userMasterCondition, ...userAccessCondition.where },
      include: [...allIncludes, ...userAccessCondition.includeModels],
    });

    if (getPunchInOutCount && getPunchInOutCount.length > 0) {
      for (const employee of getPunchInOutCount) {
        const attendance = employee.attendanceTransactions?.[0] || null;
        const weekHolidayList = employee.weekoffHolidayTrans || [];
        const leave = employee.userLeaves || [];
        const policy =
          employee.employeeAttendancePolicies?.[0]?.attendancePolicy || null;

        /**
         * Attendance
         */
        if (attendance?.InDatetime) {
          attendance.OutDateTime ? total_punchout++ : total_punchin++;
          continue;
        }

        /**
         * Weekoff / Holiday
         */
        if (weekHolidayList.length) {
          const hasWeekOff = weekHolidayList.some(
            (w) => w.tableName === 'weekoff',
          );
          const hasHoliday = weekHolidayList.some(
            (w) => w.tableName === 'holiday',
          );

          if (hasWeekOff && hasHoliday) {
            policy?.WHPHPriority === 'PH' ? total_holiday++ : total_weekoff++;
          } else if (hasHoliday) {
            total_holiday++;
          } else if (hasWeekOff) {
            total_weekoff++;
          }
          continue;
        }

        /**
         * Leave
         */
        if (leave && leave.length > 0) {
          const hasPending = leave.some((l) =>
            [0, 1, 2].includes(l.authorizationStatus),
          );

          if (hasPending) {
            total_onLeave++;
            continue;
          }

          const hasApprovedWithTxn = leave.some(
            (l) =>
              l.authorizationStatus === 3 &&
              l.userLeaveTransactions?.length > 0,
          );

          if (hasApprovedWithTxn) {
            total_onLeave++;
            continue;
          }
        }

        /**
         * Absent
         */
        total_not_punchin++;
      }
    }

    const finaldata = {
      allActiveUser: getPunchInOutCount.length,
      total_punchin: total_punchin,
      total_punchout: total_punchout,
      total_weekoff: total_weekoff,
      total_onLeave: total_onLeave,
      total_onHoliday: total_holiday,
      total_notpunchin: total_not_punchin,
    };
    res.status(200).json({ status: 200, data: finaldata });
  } catch (error) {
    next(error);
  }
};

exports.userCompletedWorkingHours = async (req, res, next) => {
  try {
    const loggedInUserId = req.userDetails.userMasterId;

    const currentDateTime = new Date('2026-04-24T07:30:00'); // Mocked current date for testing
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const previousDate = moment(currentDate)
      .subtract(1, 'day')
      .format('YYYY-MM-DD');
    // 🔹 Fetch user + today's attendance
    const userData = await UserMaster.findOne({
      where: { userMasterID: loggedInUserId, status: 1 },
      attributes: ['userMasterID', 'displayName'],
      include: [
        {
          required: false,
          model: EmployeeAttendancePolicy,
          as: 'empAttPolicy',
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: new Date(currentDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
              { endDate: null },
            ],
          },
          include: [{ model: AttendancePolicy, as: 'attendancePolicy' }],
        },
        {
          required: false,
          model: attendanceTransaction,
          where: { AttendanceDate: currentDate },
          include: [
            {
              model: Shift,
              attributes: ['shiftID', 'shiftName', 'shiftType'],
              include: [{ model: shiftTime }],
            },
          ],
        },
      ],
    });

    if (!userData) {
      return res.status(404).json({ status: 404, message: 'User not found' });
    }

    let attendanceData = userData.attendanceTransactions?.[0];

    // 🔹 fallback to previous night shift
    if (!attendanceData) {
      attendanceData = await attendanceTransaction.findOne({
        where: {
          AttendanceDate: previousDate,
          userMasterID: loggedInUserId,
        },
        include: [
          {
            model: Shift,
            where: { shiftType: ShiftTypeEnum.NIGHTSHIFT },
            attributes: ['shiftID', 'shiftName', 'shiftType'],
            include: [{ model: shiftTime }],
          },
        ],
      });
    }

    const responseData = {
      userMasterID: userData.userMasterID,
      displayName: userData.displayName,
      shiftName: null,
      shiftIntime: null,
      shiftOutTime: null,

      totalWorkingHours: null,
      completeWorkingHours: null,
      remainingWorkingHours: null,

      totalWorkingMinutes: null,
      completeWorkingMinutes: null,
      remainingWorkingMinutes: null,

      totalWorkingTime: null,
      completeWorkingTime: null,
      remainingWorkingTime: null,

      outHrs: null,
    };

    if (!attendanceData) {
      return res.status(200).json({ status: 200, data: responseData });
    }

    const shiftData = attendanceData.shift;
    const attendancePolicy = userData.empAttPolicy?.[0]?.attendancePolicy;

    // 🔹 Get day name
    const day = new Date(attendanceData.AttendanceDate).toLocaleString(
      'en-us',
      { weekday: 'long' },
    );

    const dayWiseShiftTime = shiftData?.shiftTimes?.find((e) => e.day === day);

    if (!dayWiseShiftTime) {
      return res.status(200).json({ status: 200, data: responseData });
    }

    responseData.outHrs = attendanceData.OutHrs || null;
    let completedMinutes = 0;

    if (attendanceData.OutDateTime) {
      // ✅ Already completed
      completedMinutes = attendanceData.roundOffMinutes || 0;
    } else {
      // 🔹 Live calculation
      const missPunchObj = await checkIsAttendanceMissPunch(
        attendancePolicy,
        attendanceData,
        dayWiseShiftTime,
        currentDateTime,
      );

      if (missPunchObj.isMissPunch) {
        completedMinutes = Number(missPunchObj.allowedMinutes || 0);
      } else {
        completedMinutes =
          (Date.now() - new Date(attendanceData.InDatetime).getTime()) /
          (1000 * 60);
      }
      // 🔹 Deduct out hours if needed (convert hrs → minutes)
      if (attendancePolicy?.considerWorkingHours === 'notincludingouthours') {
        completedMinutes -= Number(attendanceData.OutHrs || 0);
      }
    }

    // 🔹 Ensure no negative values
    completedMinutes = Math.max(0, Math.round(completedMinutes));
    const completedTotalMinutes = Math.round(completedMinutes);
    // 🔹 Total minutes
    const totalMinutes = dayWiseShiftTime.totalhours
      ? Math.round(Number(dayWiseShiftTime.totalhours) * 60)
      : 0;

    // 🔹 Remaining minutes
    const remainingMinutes = Math.max(0, totalMinutes - completedTotalMinutes);
    const remainingTotalMinutes = Math.round(remainingMinutes);

    // 🔹 Assign minutes
    responseData.totalWorkingMinutes = totalMinutes;
    responseData.completeWorkingMinutes = completedTotalMinutes;
    responseData.remainingWorkingMinutes = remainingTotalMinutes;

    responseData.shiftName = shiftData?.shiftName || null;
    responseData.shiftIntime = dayWiseShiftTime.statTime;
    responseData.shiftOutTime = dayWiseShiftTime.endtime;
    responseData.totalWorkingHours = `${String(
      Math.floor(totalMinutes / 60),
    ).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;

    responseData.totalWorkingTime = `${String(
      Math.floor(totalMinutes / 60),
    ).padStart(2, '0')}h ${String(totalMinutes % 60).padStart(2, '0')}m`;

    responseData.completeWorkingHours = `${String(
      Math.floor(completedTotalMinutes / 60),
    ).padStart(2, '0')}:${String(completedTotalMinutes % 60).padStart(2, '0')}`;
    // 🔹 Human readable format
    responseData.completeWorkingTime = `${String(
      Math.floor(completedTotalMinutes / 60),
    ).padStart(2, '0')}h ${String(completedTotalMinutes % 60).padStart(
      2,
      '0',
    )}m`;

    responseData.remainingWorkingHours = `${String(
      Math.floor(remainingTotalMinutes / 60),
    ).padStart(2, '0')}:${String(remainingTotalMinutes % 60).padStart(2, '0')}`;
    responseData.remainingWorkingTime = `${String(
      Math.floor(remainingTotalMinutes / 60),
    ).padStart(2, '0')}h ${String(remainingTotalMinutes % 60).padStart(
      2,
      '0',
    )}m`;

    return res.status(200).json({ status: 200, data: responseData });
  } catch (error) {
    next(error);
  }
};

exports.generateInOutExcel = async (req, res, next) => {
  try {
    const { companyMasterID, userMasterID, startdate, enddate } = req.body;

    if (!companyMasterID || !userMasterID) {
      return res.status(400).json({
        status: 400,
        message: 'Company and User are required.',
      });
    }

    if (!startdate || !enddate) {
      return res.status(400).json({
        status: 400,
        message: 'Start Date and End Date are required fields.',
      });
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const getAllDates = getAllDatesFromTo(startdate, enddate);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const users = await UserMaster.findAll({
      where: { status: 1, userMasterID, ...userAccessCondition.where },
      include: [
        ...userAccessCondition.includeModels,
        {
          required: false,
          model: attendanceTransaction,
          where: {
            AttendanceDate: { [Sequelize.Op.in]: getAllDates },
          },
        },
        {
          required: false,
          model: EmployeeDepartment,
          attributes: ['departmentID'],
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: null },
            ],
          },
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName'],
            },
          ],
        },
        {
          model: EmployeeJoiningDetails,
          attributes: ['employeeCode'],
        },
        {
          required: false,
          model: EmployeeDesignation,
          attributes: ['designationID'],
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: null },
            ],
          },
          include: [{ model: Designation, as: 'designation' }],
        },
        {
          required: false,
          model: EmployeeBranch,
          attributes: ['branchID'],
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: null },
            ],
          },
          include: [{ model: BranchMaster, as: 'branchMaster' }],
        },
      ],
    });

    // -----------------------
    // Use in-memory workbook (supports mergeCells)
    // -----------------------
    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet('Attendance Report', {
      // ✅ Change 1: Freeze only till Mobile Number (col 3)
      views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }],
    });

    // -----------------------
    // Header Row
    // -----------------------
    const header = [
      'Employee Code',
      'Name',
      'Mobile Number',
      'Branch',
      'Department',
      'Designation',
      'Time',
      // ✅ Change 2: Date format with - instead of /
      ...getAllDates.map((dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB').replace(/\//g, '-');
      }),
    ];

    const headerRow = worksheet.addRow(header);
    headerRow.font = { bold: true };
    for (let col = 8; col <= header.length; col++) {
      worksheet.getColumn(col).numFmt = '@'; // TEXT format
    }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' },
    };
    headerRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });

    // -----------------------
    // Data Rows
    // -----------------------
    let currentExcelRow = 2;

    for (const user of users) {
      const attendanceMap = {};
      (user.attendanceTransactions || []).forEach((a) => {
        attendanceMap[a.AttendanceDate] = a;
      });

      const fixedColumns = [
        user?.employeeJoiningDetails?.[0]?.employeeCode || '',
        user.displayName || '',
        user.userNumber || '',
        user?.employeeBranches?.[0]?.branchMaster?.branchName || '',
        user?.employeeDepartments?.[0]?.department?.departmentName || '',
        user?.employeeDesignations?.[0]?.designation?.designationName || '',
      ];

      // -------- IN ROW --------
      const inRowData = [
        ...fixedColumns,
        'In Time',
        ...getAllDates.map((dateStr) => {
          const record = attendanceMap[normalizeDate(dateStr)];
          return record?.InDatetime
            ? new Date(record.InDatetime).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })
            : '';
        }),
      ];

      worksheet.addRow(inRowData);

      // -------- OUT ROW --------
      const outRowData = [
        '',
        '',
        '',
        '',
        '',
        '',
        'Out Time',
        ...getAllDates.map((dateStr) => {
          const record = attendanceMap[normalizeDate(dateStr)];
          return record?.OutDateTime
            ? new Date(record.OutDateTime).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })
            : '';
        }),
      ];

      worksheet.addRow(outRowData);

      // -------- MERGE cols 1–6 across IN and OUT rows --------
      for (let col = 1; col <= 6; col++) {
        worksheet.mergeCells(currentExcelRow, col, currentExcelRow + 1, col);
        const mergedCell = worksheet.getCell(currentExcelRow, col);
        mergedCell.value = fixedColumns[col - 1];
        mergedCell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // ✅ Change 3: Bottom border on IN row
      const inRow = worksheet.getRow(currentExcelRow);
      inRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          ...(cell.border || {}),
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
        };
      });

      // ✅ Change 3: Bottom border on OUT row (this is the visible separator between employees)
      const outRow = worksheet.getRow(currentExcelRow + 1);
      outRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          ...(cell.border || {}),
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
        };
      });

      currentExcelRow += 2;
    }

    // -----------------------
    // Column Widths
    // -----------------------
    worksheet.columns.forEach((column, index) => {
      column.width = index === 6 ? 12 : 18;
    });

    // -----------------------
    // Write buffer and send
    // -----------------------
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=attendance_report.xlsx',
    );
    res.setHeader('Content-Length', buffer.length);

    res.end(buffer);
  } catch (error) {
    next(error);
  }
};

exports.validateAttendanceExcel = async (req, res, next) => {
  try {
    const { companyMasterID, page = 1, limit = 20 } = req.body;

    if (!companyMasterID)
      return res.status(400).json({ message: 'Company ID is required' });

    if (!req.file)
      return res.status(400).json({ message: 'Excel file is required' });

    const uploadedPath = req.file.path;

    // -------------------------
    // Read Uploaded Excel
    // -------------------------
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(uploadedPath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet)
      return res.status(400).json({ message: 'Invalid Excel file' });

    // -------------------------
    // Extract Headers
    // -------------------------
    const headerRow = worksheet.getRow(1);
    const headers = [];

    headerRow.eachCell((cell) => {
      headers.push(cell.value);
    });

    const fixedColumns = [
      'Employee Code',
      'Name',
      'Mobile Number',
      'Branch',
      'Department',
      'Designation',
      'Time',
    ];
    const dynamicColumns = headers.filter((h) => !fixedColumns.includes(h));

    const parsedDates = dynamicColumns
      .map((d) => {
        const [day, month, year] = d.split('-');
        return new Date(`${year}-${month}-${day}`);
      })
      .filter((d) => !isNaN(d));

    const excelStartDate = parsedDates[0];
    const excelEndDate = parsedDates[parsedDates.length - 1];

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const futureDates = parsedDates.filter((d) => d >= endOfToday);

    if (futureDates.length > 0) {
      return res.status(400).json({
        message: 'Future attendance dates are not allowed',
        futureDates: futureDates.map((d) =>
          d.toLocaleDateString('en-GB').replace(/\//g, '-'),
        ),
      });
    }

    // -------------------------
    // Time format validator (24-hour only)
    // HH:MM or HH:MM:SS
    // -------------------------
    const is24HourFormat = (value) => {
      if (!value) return true;
      const str = String(value).trim();
      return /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(str);
    };

    // -------------------------
    // STEP 1: Extract All User Numbers
    // -------------------------
    const excelUserNumbers = new Set();

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const isInRow = (rowNumber - 2) % 2 === 0;
      if (!isInRow) return;

      const mobileIndex = headers.indexOf('Mobile Number') + 1;
      const mobile = normalizeMobile(row.getCell(mobileIndex).value);

      if (mobile) {
        excelUserNumbers.add(mobile);
      }
    });

    const uniqueUserNumbers = Array.from(excelUserNumbers);

    // -------------------------
    // STEP 2: Fetch Users From DB
    // -------------------------
    const dbUsers = await UserMaster.findAll({
      where: {
        companyMasterId: companyMasterID,
        status: 1,
        userNumber: {
          [Op.in]: uniqueUserNumbers,
        },
      },
      attributes: ['userMasterID', 'userNumber'],
      include: [
        {
          required: false,
          model: HrLeaveMonthlyTrans,
          attributes: [
            'userMasterID',
            'verified',
            'monthstartdate',
            'monthenddate',
          ],
          where: {
            monthstartdate: {
              [Op.lte]: excelEndDate,
            },
            monthenddate: {
              [Op.gte]: excelStartDate,
            },
            verified: 1,
          },
        },
      ],
    });

    const company = await companyMaster.findOne({
      where: {
        companyMasterID
      },
      attributes: ['companyMasterID', 'isAttRemarkRequired']
    })

    const dbUserMap = {};
    dbUsers.forEach((u) => {
      dbUserMap[normalizeMobile(u.userNumber)] = u;
    });
    const verifiedAttendanceMap = new Map();

    dbUsers.forEach((user) => {
      const mobile = normalizeMobile(user.userNumber);

      const uniqueRanges = new Map();

      (user.hrLeaveMonthlyTrans || []).forEach((row) => {
        const key = [row.verified, row.monthstartdate, row.monthenddate].join(
          '_',
        );

        if (!uniqueRanges.has(key)) {
          uniqueRanges.set(key, {
            verified: row.verified,
            start: new Date(row.monthstartdate),
            end: new Date(row.monthenddate),
          });
        }
      });

      verifiedAttendanceMap.set(mobile, Array.from(uniqueRanges.values()));
    });

    // -------------------------
    // Prepare New Validated Workbook
    // -------------------------
    const validatedWorkbook = new ExcelJS.Workbook();
    const validatedSheet = validatedWorkbook.addWorksheet(
      'Validated Attendance',
    );

    // Add header + Remark column
    validatedSheet.addRow([...headers, 'Remark']);

    const parsedRows = [];
    const invalidUserRowNumbers = [];
    const invalidLeaveColumns = [];
    let invalidUserCount = 0;

    // -------------------------
    // STEP 3: Validate Each Row
    // -------------------------
    for (let i = 2; i <= worksheet.rowCount; i += 2) {
      const inRow = worksheet.getRow(i);
      const outRow = worksheet.getRow(i + 1);
      const employeeNumber = (i - 2) / 2 + 1;
      if (!inRow || !outRow) continue;

      // skip ghost/empty rows
      const mobileRaw = inRow.getCell(
        headers.indexOf('Mobile Number') + 1,
      ).value;
      if (!mobileRaw) continue;

      const mobile = normalizeMobile(mobileRaw);
      const userData = dbUserMap[mobile];
      const isValidUser = !!userData;
      const verifiedRanges = verifiedAttendanceMap.get(mobile) || [];

      const isAttendanceVerified = verifiedRanges.some((range) => {
        return (
          range.verified == 1 &&
          range.start <= excelEndDate &&
          range.end >= excelStartDate
        );
      });

      const invalidTimeColumns = [];
      const sameTimeColumns = [];

      for (const col of dynamicColumns) {
        const colIdx = headers.indexOf(col) + 1;
        const inVal = inRow.getCell(colIdx).value;
        const outVal = outRow.getCell(colIdx).value;

        const inInvalid = !is24HourFormat(inVal);
        const outInvalid = !is24HourFormat(outVal);

        // Check if in and out time are the same
        const inStr = inVal ? String(inVal).trim() : '';
        const outStr = outVal ? String(outVal).trim() : '';
        const isSameTime = inStr && outStr && inStr === outStr;

        if (inInvalid || outInvalid) {
          if (!invalidTimeColumns.includes(col)) invalidTimeColumns.push(col);
          if (!invalidLeaveColumns.includes(col)) invalidLeaveColumns.push(col);
        }

        if (isSameTime) {
          if (!sameTimeColumns.includes(col)) sameTimeColumns.push(col);
          if (!invalidLeaveColumns.includes(col)) invalidLeaveColumns.push(col);
        }

        if (inInvalid && inVal) inRow.getCell(colIdx).value = '';
        if (outInvalid && outVal) outRow.getCell(colIdx).value = '';
      }

      const hasTimeError = invalidTimeColumns.length > 0;
      const hasSameTimeError = sameTimeColumns.length > 0;

      let remark = 'Valid';

      if (!isValidUser) {
        remark = 'User not found in this company';
      } else if (isAttendanceVerified) {
        remark = 'Attendance already verified';
      }
      if (hasTimeError) {
        const timeMsg = `Invalid time format in: ${invalidTimeColumns.join(', ')}`;
        remark = remark === 'Valid' ? timeMsg : `${remark}; ${timeMsg}`;
      }

      if (hasSameTimeError) {
        const sameMsg = `In and out time can not be same`;
        remark = remark === 'Valid' ? sameMsg : `${remark}; ${sameMsg}`;
      }

      if (
        !isValidUser ||
        hasTimeError ||
        hasSameTimeError ||
        isAttendanceVerified
      ) {
        invalidUserCount++;
        invalidUserRowNumbers.push(employeeNumber);
      }

      const inValues = headers.map(
        (_, idx) => inRow.getCell(idx + 1).value || '',
      );
      validatedSheet.addRow([...inValues, remark]);

      // Copy fixed column values from IN row into OUT row
      const outValues = headers.map((h, idx) => {
        if (fixedColumns.includes(h)) {
          return inRow.getCell(idx + 1).value || '';
        }
        return outRow.getCell(idx + 1).value || '';
      });
      validatedSheet.addRow([...outValues, '']);

      const dynamicData = {};
      for (const col of dynamicColumns) {
        const colIdx = headers.indexOf(col) + 1;
        dynamicData[col] = {
          in: inRow.getCell(colIdx).value || '',
          out: outRow.getCell(colIdx).value || '',
        };
      }

      parsedRows.push({
        rowNumber: employeeNumber,
        outRowNumber: employeeNumber,
        name: inRow.getCell(headers.indexOf('Name') + 1).value || '',
        mobile,
        ...dynamicData,
        remark,
        invalidTimeColumns,
        sameTimeColumns,
        isEditing: false,
      });
    }

    const validatedPath = path.join(
      path.join(__dirname, '../uploads/validated'),
      `validated-${Date.now()}.xlsx`,
    );

    await validatedWorkbook.xlsx.writeFile(validatedPath);

    fs.unlinkSync(uploadedPath);

    // -------------------------
    // Pagination
    // -------------------------
    const start = (page - 1) * limit;
    const end = start + Number(limit);

    res.json({
      validatedExcelPath: validatedPath,
      operationType: 'attendance-upload',
      totalRecords: parsedRows.length,
      page: Number(page),
      limit: Number(limit),
      data: parsedRows.slice(start, end),
      invalidUserRowNumbers: [...new Set(invalidUserRowNumbers)],
      validAttendanceRow: dynamicColumns,
      invalidLeaveColumns: [...new Set(invalidLeaveColumns)],
      isAttRemarkRequired: company?.isAttRemarkRequired || false,
      summary: {
        totalRows: parsedRows.length,
        invalidUserCount,
        hasErrors: invalidUserCount > 0 || invalidLeaveColumns.length > 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.getValidatedAttendance = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, filePath } = req.body;

    if (!filePath)
      return res
        .status(400)
        .json({ message: 'Validated file path is required' });

    if (!fs.existsSync(filePath))
      return res.status(404).json({ message: 'File not found' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet)
      return res.status(400).json({ message: 'Invalid Excel file' });

    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell) => {
      headers.push(cell.value);
    });

    const fixedColumns = [
      'Employee Code',
      'Name',
      'Mobile Number',
      'Branch',
      'Department',
      'Designation',
      'Time',
      'Remark',
    ];
    const dynamicColumns = headers.filter((h) => !fixedColumns.includes(h));

    const getValue = (row, colName) => {
      const idx = headers.indexOf(colName) + 1;
      const val = row.getCell(idx).value;
      return val !== null && val !== undefined ? String(val) : '';
    };

    // ✅ Count only real (non-empty) employee rows
    const mobileColIndex = headers.indexOf('Mobile Number') + 1;
    let totalRecords = 0;
    for (let empIdx = 0; ; empIdx++) {
      const inRowNumber = 2 + empIdx * 2;
      if (inRowNumber > worksheet.rowCount) break;
      const inRow = worksheet.getRow(inRowNumber);
      const mobileRaw = inRow.getCell(mobileColIndex).value;
      if (mobileRaw) totalRecords++;
      else break;
    }

    const pageNumber = Number(page);
    const pageSize = Number(limit);

    const startEmployeeIndex = (pageNumber - 1) * pageSize;
    const endEmployeeIndex = Math.min(
      startEmployeeIndex + pageSize,
      totalRecords,
    );

    // -------------------------
    // Collect ALL invalid user row numbers across entire file
    // -------------------------
    const invalidUserRowNumbers = [];
    for (let empIdx = 0; empIdx < totalRecords; empIdx++) {
      const empNumber = empIdx + 1;
      const inRowNumber = 2 + empIdx * 2;
      const inRow = worksheet.getRow(inRowNumber);
      const remark = getValue(inRow, 'Remark');
      if (remark && remark !== 'Valid') {
        invalidUserRowNumbers.push(empNumber);
      }
    }

    // -------------------------
    // Paginated data
    // -------------------------
    const paginatedData = [];

    for (let empIdx = startEmployeeIndex; empIdx < endEmployeeIndex; empIdx++) {
      const empNumber = empIdx + 1;
      const inRowNumber = 2 + empIdx * 2;
      const outRowNumber = inRowNumber + 1;

      const inRow = worksheet.getRow(inRowNumber);
      const outRow = worksheet.getRow(outRowNumber);

      if (!inRow || !outRow) continue;

      // ✅ Skip empty/ghost rows
      const mobileRaw = inRow.getCell(mobileColIndex).value;
      if (!mobileRaw) continue;

      const rowData = {
        rowNumber: empNumber,
        outRowNumber: empNumber, // ✅ consistent employee number, not raw Excel row
        name: getValue(inRow, 'Name'),
        mobile: normalizeMobile(getValue(inRow, 'Mobile Number')),
        employeeCode: getValue(inRow, 'Employee Code'),
        branch: getValue(inRow, 'Branch'),
        department: getValue(inRow, 'Department'),
        designation: getValue(inRow, 'Designation'),
        remark: getValue(inRow, 'Remark'),
        isEditing: false,
      };

      for (const col of dynamicColumns) {
        rowData[col] = {
          in: getValue(inRow, col),
          out: getValue(outRow, col),
        };
      }

      paginatedData.push(rowData);
    }

    res.json({
      totalRecords,
      page: pageNumber,
      limit: pageSize,
      data: paginatedData,
      invalidUserRowNumbers,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAttendanceRow = async (req, res, next) => {
  try {
    const { filePath, rowNumber, updates } = req.body;

    if (!filePath)
      return res.status(400).json({ message: 'File path is required' });

    if (!rowNumber)
      return res.status(400).json({ message: 'Row number is required' });

    if (!updates || typeof updates !== 'object')
      return res.status(400).json({ message: 'Updates object is required' });

    if (!fs.existsSync(filePath))
      return res.status(404).json({ message: 'Validated file not found' });

    // -------------------------
    // Time format validator (24-hour only)
    // -------------------------
    const is24HourFormat = (value) => {
      if (!value) return true;
      const str = String(value).trim();
      return /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(str);
    };

    // -------------------------
    // Validate time formats + same in/out before touching the file
    // -------------------------
    const invalidTimeFields = [];
    const sameTimeFields = []; // ✅ NEW

    for (const [col, value] of Object.entries(updates)) {
      if (typeof value === 'object' && value !== null) {
        if (value.in && !is24HourFormat(value.in)) {
          invalidTimeFields.push(`${col} (IN): "${value.in}"`);
        }
        if (value.out && !is24HourFormat(value.out)) {
          invalidTimeFields.push(`${col} (OUT): "${value.out}"`);
        }

        // ✅ NEW: Check same in/out time
        const inStr = value.in ? String(value.in).trim() : '';
        const outStr = value.out ? String(value.out).trim() : '';
        if (inStr && outStr && inStr === outStr) {
          sameTimeFields.push(col);
        }
      }
    }

    if (invalidTimeFields.length > 0) {
      return res.status(400).json({
        message: 'Invalid 24-hour time format detected',
        invalidTimeFields,
        hint: 'Expected format: HH:MM or HH:MM:SS (e.g. 09:00, 23:59:00)',
      });
    }

    // -------------------------
    // Read Excel
    // -------------------------
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet)
      return res.status(400).json({ message: 'Invalid Excel file' });

    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell) => {
      headers.push(cell.value);
    });

    const fixedColumns = [
      'Employee Code',
      'Name',
      'Mobile Number',
      'Branch',
      'Department',
      'Designation',
      'Time',
      'Remark',
    ];
    const dynamicColumns = headers.filter((h) => !fixedColumns.includes(h));
    const remarkColIndex = headers.indexOf('Remark') + 1;
    const mobileColIndex = headers.indexOf('Mobile Number') + 1;

    const excelInRow = 2 + (rowNumber - 1) * 2;
    const excelOutRow = excelInRow + 1;

    const inRow = worksheet.getRow(excelInRow);
    const outRow = worksheet.getRow(excelOutRow);

    if (!inRow || !outRow)
      return res.status(404).json({ message: 'Row not found in Excel' });

    // -------------------------
    // Apply Updates
    // -------------------------
    for (const [col, value] of Object.entries(updates)) {
      const colIndex = headers.indexOf(col) + 1;
      if (colIndex === 0) continue;

      if (typeof value === 'object' && value !== null) {
        if (value.in !== undefined) inRow.getCell(colIndex).value = value.in;
        if (value.out !== undefined) outRow.getCell(colIndex).value = value.out;
      } else {
        inRow.getCell(colIndex).value = value;
      }
    }

    // -------------------------
    // Re-evaluate remark after update
    // -------------------------
    const existingRemark = String(inRow.getCell(remarkColIndex).value || '');
    const isUserValid = !existingRemark.includes('User not found');
    const hasVerifiedRemark = existingRemark.includes(
      'Attendance already verified',
    );

    const invalidTimeColumnsForRow = [];
    const sameTimeColumnsForRow = []; // ✅ NEW
    for (const col of dynamicColumns) {
      const colIdx = headers.indexOf(col) + 1;
      const inVal = inRow.getCell(colIdx).value;
      const outVal = outRow.getCell(colIdx).value;
      if (!is24HourFormat(inVal) || !is24HourFormat(outVal)) {
        invalidTimeColumnsForRow.push(col);
      }
      const inStr = inVal ? String(inVal).trim() : '';
      const outStr = outVal ? String(outVal).trim() : '';
      if (inStr && outStr && inStr === outStr) {
        sameTimeColumnsForRow.push(col);
      }
    }

    // Rebuild remark
    let newRemark = 'Valid';

    if (!isUserValid) {
      newRemark = 'User not found in this company';
    } else if (hasVerifiedRemark) {
      newRemark = 'Attendance already verified';
    }

    if (invalidTimeColumnsForRow.length > 0) {
      const timeMsg = `Invalid time format in: ${invalidTimeColumnsForRow.join(', ')}`;
      newRemark = newRemark === 'Valid' ? timeMsg : `${newRemark}; ${timeMsg}`;
    }
    if (sameTimeColumnsForRow.length > 0) {
      const sameMsg = `In and out time can not be same`;
      newRemark = newRemark === 'Valid' ? sameMsg : `${newRemark}; ${sameMsg}`;
    }

    inRow.getCell(remarkColIndex).value = newRemark;

    inRow.commit();
    outRow.commit();

    await workbook.xlsx.writeFile(filePath);

    // -------------------------
    // Build rowData for response
    // -------------------------
    const getValue = (row, colName) => {
      const idx = headers.indexOf(colName) + 1;
      const val = row.getCell(idx).value;
      return val !== null && val !== undefined ? String(val) : '';
    };

    const rowData = {
      rowNumber,
      name: getValue(inRow, 'Name'),
      mobile: getValue(inRow, 'Mobile Number'),
      employeeCode: getValue(inRow, 'Employee Code'),
      branch: getValue(inRow, 'Branch'),
      department: getValue(inRow, 'Department'),
      designation: getValue(inRow, 'Designation'),
      remark: newRemark,
      invalidTimeColumns: invalidTimeColumnsForRow,
      sameTimeColumns: sameTimeColumnsForRow, // ✅ NEW
      isEditing: false,
    };

    for (const col of dynamicColumns) {
      rowData[col] = {
        in: getValue(inRow, col),
        out: getValue(outRow, col),
      };
    }

    // -------------------------
    // Scan entire file for invalid rows
    // -------------------------
    let totalEmployees = 0;
    for (let empIdx = 0; ; empIdx++) {
      const inRowNumber = 2 + empIdx * 2;
      if (inRowNumber > worksheet.rowCount) break;
      const empInRow = worksheet.getRow(inRowNumber);
      const mobileRaw = empInRow.getCell(mobileColIndex).value;
      if (mobileRaw) totalEmployees++;
      else break;
    }

    const invalidUserRowNumbers = [];
    const invalidUsers = [];

    for (let empIdx = 0; empIdx < totalEmployees; empIdx++) {
      const empNumber = empIdx + 1;
      const empExcelRow = 2 + empIdx * 2;
      const empInRow = worksheet.getRow(empExcelRow);
      const remark = String(empInRow.getCell(remarkColIndex).value || '');

      if (remark !== 'Valid') {
        invalidUserRowNumbers.push(empNumber);
        if (remark.includes('User not found')) {
          invalidUsers.push(empNumber);
        }
      }
    }

    res.status(200).json({
      message: 'Row updated successfully',
      rowData,
      remark: newRemark,
      summary: {
        invalidUserCount: invalidUsers.length,
        hasErrors: invalidUserRowNumbers.length > 0,
      },
      invalidUserRowNumbers,
    });
  } catch (error) {
    next(error);
  }
};

const normalizeMobile = (num) => {
  if (!num) return '';
  return String(num).replace(/\D/g, '').trim();
};

exports.deleteAttendanceRow = async (req, res, next) => {
  try {
    const { filePath, rowNumber } = req.body;

    if (!filePath)
      return res.status(400).json({ message: 'File path is required' });

    if (!rowNumber)
      return res.status(400).json({ message: 'Row number is required' });

    if (!fs.existsSync(filePath))
      return res.status(404).json({ message: 'Validated file not found' });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet)
      return res.status(400).json({ message: 'Invalid Excel file' });

    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell) => headers.push(cell.value));
    const totalCols = headers.length; // ✅ defined here

    const remarkColIndex = headers.indexOf('Remark') + 1;
    const mobileColIndex = headers.indexOf('Mobile Number') + 1;

    const excelInRow = 2 + (rowNumber - 1) * 2;
    const totalRows = worksheet.rowCount;

    if (excelInRow > totalRows) {
      return res.status(404).json({ message: 'Row not found in Excel' });
    }

    // -------------------------
    // Shift rows up by 2 — cell by cell copy
    // -------------------------
    for (let i = excelInRow; i <= totalRows - 2; i++) {
      const sourceRow = worksheet.getRow(i + 2);
      const targetRow = worksheet.getRow(i);
      for (let col = 1; col <= totalCols; col++) {
        targetRow.getCell(col).value = sourceRow.getCell(col).value;
      }
      targetRow.commit();
    }

    // -------------------------
    // Clear last 2 rows — cell by cell
    // -------------------------
    for (let i = totalRows - 1; i <= totalRows; i++) {
      const row = worksheet.getRow(i);
      for (let col = 1; col <= totalCols; col++) {
        row.getCell(col).value = null;
      }
      row.commit();
    }

    await workbook.xlsx.writeFile(filePath);

    // -------------------------
    // Count real rows by mobile cell
    // -------------------------
    let totalEmployees = 0;
    for (let empIdx = 0; ; empIdx++) {
      const inRowNumber = 2 + empIdx * 2;
      if (inRowNumber > worksheet.rowCount) break;
      const inRow = worksheet.getRow(inRowNumber);
      const mobileRaw = inRow.getCell(mobileColIndex).value;
      if (mobileRaw) totalEmployees++;
      else break;
    }

    const invalidUserRowNumbers = [];
    const invalidUsers = [];

    for (let empIdx = 0; empIdx < totalEmployees; empIdx++) {
      const empNumber = empIdx + 1;
      const empExcelRow = 2 + empIdx * 2;
      const empInRow = worksheet.getRow(empExcelRow);
      const remark = String(empInRow.getCell(remarkColIndex).value || '');

      if (remark && remark !== 'Valid') {
        invalidUserRowNumbers.push(empNumber);
        if (remark.includes('User not found')) {
          invalidUsers.push(empNumber);
        }
      }
    }

    res.status(200).json({
      message: 'Row deleted successfully',
      deletedRowNumber: rowNumber,
      totalRecords: totalEmployees,
      summary: {
        invalidUserCount: invalidUsers.length,
        hasErrors: invalidUserRowNumbers.length > 0,
      },
      invalidUserRowNumbers,
    });
  } catch (error) {
    next(error);
  }
};

exports.saveInOutAttendanceData = async (req, res, next) => {
  try {
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const { filePath, companyMasterID, attCorrRemark } = req.body;
    companyid = companyMasterID;
    if (!filePath) {
      return res.status(400).json({ message: 'File path is required' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    const companyData = await companyMaster.findOne({
      where: {
        companyMasterID
      },
      attributes: ['isAttRemarkRequired']
    });

    if(companyData.isAttRemarkRequired && !attCorrRemark){
      return res.status(200).json({ status: 400, message: 'Attendance Correction Remark is Required!' });
    }

    // -------------------------
    // Read Excel
    // -------------------------
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({ message: 'Invalid Excel file' });
    }

    // Get headers
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell) => headers.push(cell.value));

    const fixedColumns = [
      'Employee Code',
      'Name',
      'Mobile Number',
      'Branch',
      'Department',
      'Designation',
      'Time',
      'Remark',
    ];
    const dynamicColumns = headers.filter((h) => !fixedColumns.includes(h));

    const getValue = (row, colName) => {
      const idx = headers.indexOf(colName) + 1;
      const val = row.getCell(idx).value;
      return val !== null && val !== undefined ? String(val) : '';
    };

    const totalEmployees = Math.floor((worksheet.rowCount - 1) / 2);

    const currentDate = moment().format('YYYY-MM-DD');

    const users = [];

    for (let empIdx = 0; empIdx < totalEmployees; empIdx++) {
      const empNumber = empIdx + 1;
      const excelInRow = 2 + empIdx * 2;
      const excelOutRow = excelInRow + 1;

      const inRow = worksheet.getRow(excelInRow);
      const outRow = worksheet.getRow(excelOutRow);

      const remark = getValue(inRow, 'Remark');

      const attendance = {};
      for (const col of dynamicColumns) {
        attendance[col] = {
          in: getValue(inRow, col),
          out: getValue(outRow, col),
        };
      }

      users.push({
        number: empNumber,
        employeeCode: getValue(inRow, 'Employee Code'),
        name: getValue(inRow, 'Name'),
        mobile: normalizeMobile(getValue(inRow, 'Mobile Number')),
        branch: getValue(inRow, 'Branch'),
        department: getValue(inRow, 'Department'),
        designation: getValue(inRow, 'Designation'),
        remarks: attCorrRemark,
        isValid: remark === 'Valid',
        attendance,
      });
    }

    const formattedDates =
      users?.length > 0 ? Object.keys(users[0].attendance) : [];

    const allDates = formattedDates.map((dateStr) => {
      const [day, month, year] = dateStr.split('-');
      return `${year}-${month}-${day}`;
    });

    const allUserIDs = users.map((user) => user.mobile);

    const allShifts = await shiftModel.findAll({
      where: { status: 1, companyMasterID },
      include: [{ model: shiftTime }],
    });

    if (allShifts.length === 0) {
      return res.status(200).json({
        status: 401,
        message: 'Please create atleast one shift ',
      });
    }

    const AllUserData = await UserMaster.findAll({
      where: {
        userNumber: {
          [Sequelize.Op.in]: allUserIDs,
        },
        status: 1,
      },
      include: [
        { required: false, model: EmployeeJoiningDetails },
        {
          required: false,
          separate: true,
          model: EmployeeAttendancePolicy,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(
                Math.min(...allDates.map((d) => new Date(d))),
              ),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(
                    Math.max(...allDates.map((d) => new Date(d))),
                  ),
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['attendancePolicyID'],
          include: [{ model: AttendancePolicy, as: 'attendancePolicy' }],
        },
        {
          required: false,
          model: attendanceTransaction,
          where: {
            AttendanceDate: { [Sequelize.Op.in]: allDates },
          },
          include: [
            {
              separate: true,
              required: false,
              model: UserShortLeave,
              where: {
                date: { [Sequelize.Op.in]: allDates },
                authorizationStatus: 3,
              },
            },
          ],
        },
        {
          required: false,
          model: EmployeeBranch,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(
                Math.min(...allDates.map((d) => new Date(d))),
              ),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(
                    Math.max(...allDates.map((d) => new Date(d))),
                  ),
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['branchID'],
          include: [{ model: BranchMaster, as: 'branchMaster' }],
        },
        {
          required: false,
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(
                Math.min(...allDates.map((d) => new Date(d))),
              ),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(
                    Math.max(...allDates.map((d) => new Date(d))),
                  ),
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
        },
        {
          model: EmployeeDepartment,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(
                Math.min(...allDates.map((d) => new Date(d))),
              ),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(
                    Math.max(...allDates.map((d) => new Date(d))),
                  ),
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
        },
        {
          required: false,
          separate: true,
          model: EmployeeSalaryPolicy,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(
                Math.min(...allDates.map((d) => new Date(d))),
              ),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(
                    Math.max(...allDates.map((d) => new Date(d))),
                  ),
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['salaryPolicyID'],
          include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
        },
        {
          required: false,
          model: ShiftRoster,
          where: {
            status: 1,
            shiftRosterDate: { [Sequelize.Op.in]: allDates },
          },
        },
        {
          required: false,
          model: EmployeeShift,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(
                Math.min(...allDates.map((d) => new Date(d))),
              ),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(
                    Math.max(...allDates.map((d) => new Date(d))),
                  ),
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
        },
        {
          required: false,
          separate: true,
          model: EmployeeShortLeavePolicy,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(
                Math.min(...allDates.map((d) => new Date(d))),
              ),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(
                    Math.max(...allDates.map((d) => new Date(d))),
                  ),
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['shortLeavePolicyID'],
          include: [{ model: ShortLeavePolicy }],
        },
        {
          required: false,
          model: EmployeeWeekOff,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(
                Math.min(...allDates.map((d) => new Date(d))),
              ),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(
                    Math.max(...allDates.map((d) => new Date(d))),
                  ),
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: ['weekOffPolicyID'],
          include: [{ model: weekOffPolicy, as: 'weekoff' }],
        },
        {
          model: EmployeeLateEarlyPolicy,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(
                Math.min(...allDates.map((d) => new Date(d))),
              ),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(
                    Math.min(...allDates.map((d) => new Date(d))),
                  ),
                },
              },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          separate: true,
          attributes: ['lateEarlyPolicyMasterID'],
          include: [
            {
              model: LateEarlyPolicy,
              as: 'lateEarlyPolicy',
            },
          ],
        },
        {
          model: employeeHolidayPolicy,
          required: false,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(
                Math.min(...allDates.map((d) => new Date(d))),
              ),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(
                    Math.min(...allDates.map((d) => new Date(d))),
                  ),
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
                      [Sequelize.Op.contains]: [...allDates],
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    for (const userData of AllUserData) {
      const transaction = await sequelize.transaction();

      try {
        // These arrays must be reset for every employee
        const bulkAttendanceCorrectionWithAttendanceTransIDArray = [];
        const attendanceTransIDsToDestry = [];
        const deleteIncentiveArray = [];
        const shortLeaveIdsToUpdate = [];
        const punchoutArray = [];
        let attendanceLogsIDsToDestry = [];
        let incentiveIDsToDestroy = [];
        let push156ID = true;

        const inputRow = users.find((e) => e.mobile == userData.userNumber);

        if (!inputRow) {
          await transaction.commit();
          continue;
        }

        const attendancePolicy =
          userData?.employeeAttendancePolicies?.[0]?.attendancePolicy || null;

        const empPayrollFrequency =
          userData.employeeJoiningDetails?.[0]?.payrollFrequency ||
          PayrollFrequencyType.MONTHLY;

        const salaryPolicyData =
          userData.employeeSalaryPolicies?.[0]?.salaryPolicy
            ?.payrollFrequency == empPayrollFrequency
            ? userData.employeeSalaryPolicies?.[0]?.salaryPolicy
            : null;

        const weekoffPolicy = userData.employeeWeekOffs?.[0]?.weekoff || null;

        const LC_EG_Policy =
          userData.employeeLateEarlyPolicies &&
          userData.employeeLateEarlyPolicies.length > 0
            ? userData.employeeLateEarlyPolicies[0]
            : null;

        const empJoing =
          userData.employeeJoiningDetails &&
          userData.employeeJoiningDetails.length > 0
            ? userData.employeeJoiningDetails[0]
            : null;

        for (let [attendanceDate, att] of Object.entries(inputRow.attendance)) {
          const checkDate = normalizeDate(attendanceDate);
          let backUpAttIn = att.in;
          att.in = combineDateAndTime(attendanceDate, att.in);
          att.out = combineDateAndTime(attendanceDate, att.out, backUpAttIn);

          const day = new Date(checkDate).toLocaleString('en-us', {
            weekday: 'long',
          });

          const get_options = allShifts.filter((s) =>
            s.shiftTimes.some((st) => st.day === day),
          );

          if (get_options.length === 0) {
            throw new Error('Please create atleast one shift Time');
          }

          const attendance_data = userData?.attendanceTransactions.find(
            (e) => checkDate == e.AttendanceDate,
          );
          const formattedIN = att?.in
            ? moment(att.in).format('YYYY-MM-DD HH:mm')
            : null;

          const formattedOut = att?.out
            ? moment(att.out).format('YYYY-MM-DD HH:mm')
            : null;

          const formattedAttIN = attendance_data?.InDatetime
            ? moment(attendance_data.InDatetime).format('YYYY-MM-DD HH:mm')
            : null;

          const formattedAttOut = attendance_data?.OutDateTime
            ? moment(attendance_data.OutDateTime).format('YYYY-MM-DD HH:mm')
            : null;

          const IN_Change = formattedIN !== formattedAttIN;
          const OUT_Change = formattedOut !== formattedAttOut;

          if (!IN_Change && !OUT_Change) {
            continue;
          }
          const userShortLeave = attendance_data?.userShortLeaves?.[0] || null;

          const isAutoPunchOut = currentDate == checkDate;

          if (attendance_data?.AttendanceTransID) {
            if (!att?.in && !att?.out) {
              if (isAutoPunchOut) {
                await removePunchoutQueue(attendance_data.AttendanceTransID);
              }

              bulkAttendanceCorrectionWithAttendanceTransIDArray.push({
                AttendanceTransID: attendance_data.AttendanceTransID,
                userMasterID: attendance_data.userMasterID,
                departmentID: attendance_data.departmentID,
                designationID:
                  attendance_data.designationID == 0
                    ? null
                    : attendance_data.designationID,
                branchID: attendance_data.branchID,
                InDatetime: attendance_data.InDatetime,
                OutDateTime: attendance_data.OutDateTime,
                AttendanceDate: attendance_data.AttendanceDate,
                Shift: attendance_data.Shift,
                Shifthrs: attendance_data.Shifthrs,
                ShiftIntime: attendance_data.ShiftIntime,
                ShiftoutTime: attendance_data.ShiftoutTime,

                InHrs: Math.round(attendance_data.InHrs),
                OutHrs: attendance_data.OutHrs,
                LateBy: attendance_data.LateBy,
                EarlyBy: attendance_data.EarlyBy,
                Panalty: attendance_data.Panalty,
                PanaltyDeduction: attendance_data.PanaltyDeduction,
                Othrs: attendance_data.Othrs,
                fulldayhalfday: attendance_data.fulldayhalfday,
                punchINbranch: attendance_data.punchINbranch,
                punchOUTbranch: attendance_data.punchOUTbranch,
                goEarlyUsed: attendance_data.goEarlyUsed,
                createBy: req.userDetails.userMasterId,
                createByIp: req.userDetails.userIpAddress,
                Status: attendance_data.Status,
                ChangeBy: 'mannual',
                roundOffMinutes: attendance_data.roundOffMinutes,
                remarks: attendance_data.remarks,
                withoutOtMinutes: attendance_data.withoutOtMinutes,
                LCPenaltyFrom: attendance_data.LCPenaltyFrom,
                EGPenaltyFrom: attendance_data.EGPenaltyFrom,
                isManual: attendance_data.isManual,
                shiftShortfallMinutes: attendance_data.shiftShortfallMinutes,
                isWHConvertedToOT: attendance_data.isWHConvertedToOT,
              });

              await deleteOvertimeCoff(
                attendance_data.userMasterID,
                attendance_data.AttendanceDate,
                transaction,
              );
              //asopalav destroy both
              if (+companyid == 277 || +companyid == 298) {
                const IncentivetypeID = +companyid == 277 ? 155 : 233;

                deleteIncentiveArray.push({
                  userMasterID: attendance_data?.userMasterID,
                  IncentivetypeID: IncentivetypeID,
                  incentiveDate: attendance_data?.AttendanceDate,
                });

                if (push156ID) {
                  deleteIncentiveArray.push({
                    userMasterID: attendance_data?.userMasterID,
                    IncentivetypeID: 156,
                    incentiveDate: attendance_data?.AttendanceDate,
                  });

                  push156ID = false;
                }
              }

              // delete Food Allowance Incentive

              const dataOfINC = await Employeeincentive.findAll({
                where: {
                  userMasterID: attendance_data.userMasterID,
                  incentiveDate: attendance_data.AttendanceDate,
                },
                include: [
                  {
                    required: true,
                    model: Incentivetype,
                    where: Sequelize.and(
                      Sequelize.or(
                        Sequelize.where(
                          sequelize.fn(
                            'TRIM',
                            sequelize.fn(
                              'LOWER',
                              sequelize.col('incentivetype.incentivetypename'),
                            ),
                          ),
                          'food allowance',
                        ),
                        Sequelize.where(
                          sequelize.fn(
                            'TRIM',
                            sequelize.fn(
                              'LOWER',
                              sequelize.col('incentivetype.incentivetypename'),
                            ),
                          ),
                          'tea/coffee allowance',
                        ),
                      ),
                    ),
                  },
                ],
                transaction,
              });

              const allIDsToDelete = dataOfINC.map(
                (e) => e.employeeincentiveID,
              );

              incentiveIDsToDestroy = [
                ...incentiveIDsToDestroy,
                ...allIDsToDelete,
              ];

              attendanceLogsIDsToDestry = [
                ...attendanceLogsIDsToDestry,
                attendance_data.AttendanceTransID,
              ];

              attendanceTransIDsToDestry.push(
                attendance_data.AttendanceTransID,
              );

              // cancel short leave
              // if (userShortLeave) {
              //   shortLeaveIdsToUpdate.push(userShortLeave.userShortLeaveId);
              // }

              // ------------------------------------- OD on Weekoff or holiday -----------------------------------------

              const shiftData = get_options.find(
                (e) => e.shiftID == attendance_data.Shift,
              );

              await OD_On_WeekoffForAbsent(
                attendance_data,
                shiftData,
                attendancePolicy,
                companyMasterID,
                createBy,
                createByIp,
                transaction,
              );
            } else {
              const date = new Date(normalizeDate(attendanceDate));

              date.setDate(date.getDate() + 1);

              let temp_punchoutdate =
                date.getFullYear() +
                '-' +
                String(date.getMonth() + 1).padStart(2, '0') +
                '-' +
                String(date.getDate()).padStart(2, '0');

              let punchindate = att.in.slice(0, 10);
              let punchintime = att.in.slice(11, 16);

              let punchoutdate = att.out.slice(0, 10);
              let punchouttime = att.out.slice(11, 16);

              let intime = punchindate + ' ' + punchintime;
              let outtime = punchoutdate + ' ' + punchouttime;

              // check punchout date max

              if (new Date(punchoutdate) > new Date(temp_punchoutdate)) {
                punchoutArray.push(att.Name);
                continue;
              }

              // update Attendance data
              await attendanceTransaction.update(
                {
                  fulldayhalfday: null,
                  InHrs: null,
                  OutHrs: null,
                  LateBy: null,
                  EarlyBy: null,
                  Panalty: null,
                  PanaltyDeduction: null,
                  goEarlyUsed: 0,
                  goEarlyPanalty: null,
                  goEarlyPanaltyDeduction: null,
                  earlyPenaltyMinutes: null,
                  latePenaltyMinutes: null,
                  lunchBreak: null,
                  teaBreak: null,
                  lunchBreakStartTime: null,
                  lunchBreakEndTime: null,
                  teaBreakInStartTime: null,
                  teaBreakEndTime: null,
                  updateBy: createBy,
                  roundOffMinutes: null,
                  remarks: attCorrRemark,
                  withoutOtMinutes: null,
                  isManual: false,
                  shiftShortfallMinutes: null,
                  isWHConvertedToOT: false,
                },
                {
                  where: {
                    AttendanceTransID: attendance_data.AttendanceTransID,
                  },
                  transaction,
                },
              );

              // delete coff and overtime
              await deleteOvertimeCoff(
                attendance_data.userMasterID,
                attendance_data.AttendanceDate,
                transaction,
              );

              const body = {
                userMasterID: attendance_data.userMasterID,
                direction: 'in',
                newpunchin: true,
                photo: 'url',
                attendnaceFrom: 'manual',
                date: intime,
                date1: attendance_data.AttendanceDate,
                updateBy: req.userDetails.userMasterId,
                updateByIp: req.userDetails.userIpAddress,
                createBy: req.userDetails.userMasterId,
                createByIp: req.userDetails.userIpAddress,
                address: 'manual',
              };

              let request = {
                body: body,
              };
              let final = await attendancepunchinpunchoutupdate_Manual(
                request,
                attendance_data.AttendanceTransID,
                userData,
                transaction,
              );

              if (final == 404) {
                //userName.push(attendance_data.Name);
              } else {
                if (att.out != '') {
                  request.body.direction = 'out';
                  request.body.date = outtime;

                  final = await attendancepunchinpunchoutupdate_Manual(
                    request,
                    attendance_data.AttendanceTransID,
                    userData,
                    transaction,
                  );
                } else {
                  deleteIncentiveArray.push({
                    userMasterID: attendance_data.userMasterID,
                    IncentivetypeID: 156,
                    incentiveDate: attendance_data.AttendanceDate,
                  });
                }

                const find_attendance = await attendanceTransaction.findOne({
                  where: {
                    AttendanceTransID: attendance_data.AttendanceTransID,
                  },
                  transaction,
                });

                // Condition for Asopalav
                if (
                  +companyid === 277 ||
                  +companyid == 298 ||
                  +companyid == 300
                ) {
                  await AddAsopalavBreakTime_Manual(
                    find_attendance.userMasterID,
                    [],
                    companyid,
                    attendance_data.AttendanceDate,
                    attendance_data.AttendanceTransID,
                    transaction,
                  );
                }

                bulkAttendanceCorrectionWithAttendanceTransIDArray.push({
                  AttendanceTransID: attendance_data.AttendanceTransID,
                  userMasterID: attendance_data.userMasterID,
                  departmentID: attendance_data.departmentID,
                  designationID: attendance_data.designationID,
                  branchID: attendance_data.branchID,
                  InDatetime: attendance_data.InDatetime,
                  OutDateTime: attendance_data.OutDateTime,
                  AttendanceDate: attendance_data.AttendanceDate,
                  Shift: attendance_data.Shift,
                  Shifthrs: attendance_data.Shifthrs,
                  ShiftIntime: attendance_data.ShiftIntime,
                  ShiftoutTime: attendance_data.ShiftoutTime,
                  InHrs: Math.round(attendance_data.InHrs),
                  OutHrs: attendance_data.OutHrs,
                  LateBy: attendance_data.LateBy,
                  EarlyBy: attendance_data.EarlyBy,
                  Panalty: attendance_data.Panalty,
                  PanaltyDeduction: attendance_data.PanaltyDeduction,
                  Othrs: attendance_data.Othrs,
                  fulldayhalfday: attendance_data.fulldayhalfday,
                  punchINbranch: attendance_data.punchINbranch,
                  punchOUTbranch: attendance_data.punchOUTbranch,
                  goEarlyUsed: attendance_data.goEarlyUsed,
                  createBy: req.userDetails.userMasterId,
                  createByIp: req.userDetails.userIpAddress,
                  Status: attendance_data.Status,
                  ChangeBy: 'mannual',
                  roundOffMinutes: attendance_data.roundOffMinutes,
                  remarks: attendance_data.remarks,
                  withoutOtMinutes: attendance_data.withoutOtMinutes,
                  LCPenaltyFrom: attendance_data.LCPenaltyFrom,

                  EGPenaltyFrom: attendance_data.EGPenaltyFrom,
                  isManual: attendance_data.isManual,
                  shiftShortfallMinutes: attendance_data.shiftShortfallMinutes,
                });
                await createlogs(
                  find_attendance,
                  'manual',
                  IN_Change,
                  OUT_Change,
                  transaction,
                );
              }
            }
          } else {
            let date = new Date(checkDate);

            date.setDate(date.getDate() + 1);

            let temp_punchoutdate =
              date.getFullYear() +
              '-' +
              String(date.getMonth() + 1).padStart(2, '0') +
              '-' +
              String(date.getDate()).padStart(2, '0');

            let punchindate = att.in.slice(0, 10);
            let punchintime = att.in.slice(11, 16);

            let punchoutdate = att.out.slice(0, 10);
            let punchouttime = att.out.slice(11, 16);

            let intime = punchindate + ' ' + punchintime;
            let outtime = punchoutdate + ' ' + punchouttime;

            if (new Date(punchoutdate) > new Date(temp_punchoutdate)) {
              punchoutArray.push(attendance_data.Name);
              continue;
            }
            let body = {
              userMasterID: userData.userMasterID,
              direction: 'in',
              newpunchin: true,
              photo: 'url',
              attendnaceFrom: 'manual',
              date: intime,
              date1: checkDate,
              createBy: req.userDetails.userMasterId,
              createByIp: req.userDetails.userIpAddress,
              address: 'manual',
            };

            let request = {
              body: body,
            };
            let final = await attendancepunchinpunchout_Manual(
              request,
              userData,
              transaction,
            );

            if (final == 404) {
              //userName.push(attendance_data?.Name);
            } else {
              if (att?.out) {
                request.body.direction = 'out';
                request.body.date = outtime;

                final = await attendancepunchinpunchout_Manual(
                  request,
                  userData,
                  transaction,
                );
              }

              const find_attendance = await attendanceTransaction.findOne({
                where: {
                  AttendanceTransID: final.AttendanceTransID,
                },
                transaction,
              });

              // Condition for Asopalav
              if (
                +companyid === 277 ||
                +companyid == 298 ||
                +companyid == 300
              ) {
                await AddAsopalavBreakTime_Manual(
                  find_attendance.userMasterID,
                  [],
                  companyid,
                  attendance_data?.AttendanceDate,
                  attendance_data?.attendanceTransid,
                  transaction,
                );
              }

              await createlogs(
                find_attendance,
                'manual',
                true,
                true,
                transaction,
              );
            }
          }
          if (
            weekoffPolicy?.weekoffType == weekoffTypeEnum.ONPHYSICALPRESENT &&
            attendance_data.AttendanceDate &&
            empJoing
          ) {
            const userMasterID = userData.userMasterID;
            const joiningDate = empJoing.joiningDate || null;

            const attendanceDate = new Date(attendance_data.AttendanceDate);

            attendanceDate.setMonth(attendanceDate.getMonth() - 2);

            const startDate = joiningDate
              ? new Date(joiningDate) > new Date(attendanceDate)
                ? joiningDate
                : attendanceDate
              : attendanceDate;

            const currentDate = new Date();

            currentDate.setDate(currentDate.getDate() + 1);

            const endDate = currentDate.toISOString().slice(0, 10);

            // find weekoff holiday

            const weekoffHoliday = await weekoffHolidayTran.findAll({
              where: {
                userMasterID,
                date: {
                  [Sequelize.Op.between]: [startDate, endDate],
                },
                [Sequelize.Op.or]: [
                  { optionalHoliday: false },
                  { optionalHoliday: null },
                ],
              },
              transaction,
              order: [['date', 'DESC']],
            });

            const allWeekoff = weekoffHoliday.filter(
              (e) => e.tableName == 'weekoff',
            );

            const allHoliday = weekoffHoliday.filter(
              (e) => e.tableName == 'holiday',
            );

            const holidayDates = allHoliday.map((e) => e.date);

            // find attendance

            const allAttendance = await attendanceTransaction.findAll({
              where: {
                userMasterID,
                [Sequelize.Op.and]: [
                  {
                    AttendanceDate: {
                      [Sequelize.Op.between]: [startDate, endDate],
                    },
                  },
                  { AttendanceDate: { [Sequelize.Op.notIn]: holidayDates } },
                ],
                fulldayhalfday: {
                  [Sequelize.Op.gte]: 0.5,
                },
                OutDateTime: {
                  [Sequelize.Op.not]: null,
                },
              },
              include: [
                {
                  model: shiftModel,
                  attributes: ['shiftID', 'shiftGrace'],
                  include: [{ model: ShiftTIme }],
                },
              ],
              transaction,
              order: [['AttendanceDate', 'ASC']],
            });

            await weekoffOnPhysicalPresentCalculation(
              userMasterID,
              empJoing,
              userData.companyMasterId,
              attendance_data.AttendanceDate,
              attendancePolicy,
              salaryPolicyData,
              LC_EG_Policy,
              allAttendance,
              allWeekoff,
              weekoffPolicy.physicalPresent,
              transaction,
              req.userDetails.userMasterId,
              req.userDetails.userIpAddress,
              allHoliday,
            );
          }
        }

        // ============================================================
        // USER-SPECIFIC CLEANUP
        // ============================================================

        await Employeeincentive.destroy({
          where: {
            [Op.or]: deleteIncentiveArray.map((item) => ({
              userMasterID: item.userMasterID,
              IncentivetypeID: item.IncentivetypeID,
              incentiveDate: item.incentiveDate,
            })),
          },
          transaction,
        });

        await AttendanceCorrection.bulkCreate(
          bulkAttendanceCorrectionWithAttendanceTransIDArray,
          { transaction },
        );

        await Employeeincentive.destroy({
          where: { employeeincentiveID: [...incentiveIDsToDestroy] },
          transaction,
        });

        await AttendanceLogs.destroy({
          where: {
            attendanceLogID: [...attendanceLogsIDsToDestry],
          },
          transaction,
        });

        await attendanceTransaction.destroy({
          where: {
            AttendanceTransID: [...attendanceTransIDsToDestry],
          },
          transaction,
        });

        await UserShortLeave.update(
          {
            authorizationStatus: 5,
            cancelRemarks: 'cancelled by manual',
            updateBy: req.userDetails.userMasterId,
            updateByIp: req.userDetails.userIpAddress,
          },
          {
            where: {
              userShortLeaveId: [...shortLeaveIdsToUpdate],
            },
            hooks: false,
            transaction,
          },
        );

        // ============================================================
        // COMMIT ONLY THIS USER
        // ============================================================

        await transaction.commit();
      } catch (error) {
        // ============================================================
        // ROLLBACK ONLY THIS USER
        // ============================================================

        await transaction.rollback();

        console.error(
          `Attendance update failed for user ${userData.userMasterID} (${userData.displayName} - ${userData.userNumber}):`,
          error,
        );

        // Continue with next employee
        continue;
      }
    }

    // Delete validated file after all employees are processed
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Failed to delete validated file:', err);
    }
    return res.status(200).json({
      status: 200,
      message: 'Attendance Updated Successfully',
    });
  } catch (error) {
    next(error);
  }
};

function combineDateAndTime(dateStr, timeStr, inTimeStr = null) {
  if (!timeStr) return '';

  const [day, month, year] = dateStr.split('-');
  const [hours, minutes] = timeStr.split(':');

  const dateObj = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
  );

  // ✅ If inTimeStr is provided (means we're combining OUT time),
  // and out time is less than in time, it crossed midnight — add 1 day
  if (inTimeStr) {
    const [inHours, inMinutes] = inTimeStr.split(':');
    const inTotalMinutes = Number(inHours) * 60 + Number(inMinutes);
    const outTotalMinutes = Number(hours) * 60 + Number(minutes);

    if (outTotalMinutes < inTotalMinutes) {
      dateObj.setDate(dateObj.getDate() + 1);
    }
  }

  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const hh = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

exports.add_ot_request = async (req, res, next) => {
  try {
    const companyId = 28;
    const startDate = '2026-07-01';
    const endDate = '2026-07-31';

    let offset = 0;
    let pageIndex = 0;
    let recordAdded = 0;
    let totalUsersProcessed = 0;

    const userChunk = await UserMaster.findAll({
      where: {
        companyMasterId: companyId,
        userMasterID: 90240,
        // status: 1,
      },
      include: [
        { required: false, model: EmployeeJoiningDetails },
        {
          required: false,
          separate: true,
          model: EmployeeAttendancePolicy,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(endDate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(endDate),
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
              include: [
                {
                  model: otCalcShiftSlab,
                  as: 'otCalcSS',
                  attributes: ['shiftIds'],
                  include: [
                    {
                      model: otCalcShiftSlabRatio,
                      as: 'otCalcSSR',
                      attributes: ['upToMin', 'ratio'],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          required: false,
          model: attendanceTransaction,
          where: {
            AttendanceDate: {
              [Sequelize.Op.between]: [startDate, endDate],
            },
            OutDateTime: {
              [Sequelize.Op.not]: null,
            },
          },
        },
      ],
      order: [['userMasterID', 'ASC']],
    });

    // 2) Find OT data for just this chunk of users
    const userMasterIds = userChunk.map((e) => e.userMasterID);

    const overtimeData = await overTimeCalculation.findAll({
      where: {
        UserMasterID: {
          [Sequelize.Op.in]: userMasterIds,
        },
        OverTimeDate: {
          [Sequelize.Op.between]: [startDate, endDate],
        },
      },
      raw: true,
    });

    const overtimeMap = new Map();

    for (const overtime of overtimeData) {
      const userMasterId = +overtime.UserMasterID;
      const overtimeDate = moment(overtime.OverTimeDate).format('YYYY-MM-DD');

      if (!overtimeMap.has(userMasterId)) {
        overtimeMap.set(userMasterId, new Map());
      }

      overtimeMap.get(userMasterId).set(overtimeDate, overtime);
    }

    // 3) Create OT requests for this chunk of users
    for (const user of userChunk) {
      const userMasterID = +user.userMasterID;
      const userWiseOvertime = overtimeMap.get(userMasterID);

      const attendancePolicy =
        user.employeeAttendancePolicies?.[0]?.attendancePolicy || null;
      const joining = user.employeeJoiningDetails?.[0] || null;

      const userWiseAttendance = user.attendanceTransactions || [];

      for (const attendance of userWiseAttendance) {
        const attendanceDate = attendance.AttendanceDate;
        const overtime = userWiseOvertime?.get(attendanceDate) || null;

        // skip overtime already exist
        if (overtime) continue;

        await normal_overtime_Manual_For_Mehta(
          attendance,
          joining,
          companyId,
          attendancePolicy,
        );

        recordAdded++;
      }
    }

    totalUsersProcessed += userChunk.length;

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Data added successfully.',
      totalUsersProcessed,
      recordAdded,
    });
  } catch (error) {
    next(error);
  }
};

exports.addAutoPunchOut = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;

    if (!companyMasterID) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Company is required!',
      });
    }

    const currentDate = moment().format('YYYY-MM-DD');

    const allUserData = await UserMaster.findAll({
      where: {
        companyMasterId: companyMasterID,
        status: 1,
      },
      include: [
        {
          required: true,
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
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          attributes: ['attendancePolicyID'],
          include: [
            {
              model: AttendancePolicy,
              as: 'attendancePolicy',
              where: {
                autoPunchOutConfig:
                  punchOutConfig.AUTO_PUNCH_OUT_AFTER_TIME_LIMIT,
              },
            },
          ],
        },
        {
          required: true,
          model: attendanceTransaction,
          where: {
            AttendanceDate: currentDate,
            OutDateTime: {
              [Sequelize.Op.is]: null,
            },
          },
        },
      ],
    });

    const dayname = new Date(currentDate).toLocaleString('en-us', {
      weekday: 'long',
    });

    let count = 0;

    for (const user of allUserData) {
      const attendance = user.attendanceTransactions?.[0] || null;

      if (!attendance || attendance.OutDateTime) continue;

      const shiftID = attendance.Shift;
      const attendancePolicy = user.empAttPolicy?.[0]?.attendancePolicy || null;

      const shiftTimeData = await shiftTime.findOne({
        where: {
          day: dayname,
          shiftID,
        },
      });

      await schedule_auto_punchout(
        attendancePolicy,
        shiftTimeData,
        attendance.userMasterID,
        attendance.AttendanceTransID,
        attendance.AttendanceDate,
      );

      count++;
    }

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Data added successfully',
      count,
    });
  } catch (error) {
    next(error);
  }
};

exports.getJobById = async (req, res, next) => {
  try {
    const { jobId } = req.body;

    if (!jobId)
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'jobId is required.',
      });

    const job = await checkJobById(jobId);

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      job,
    });
  } catch (error) {
    next(error);
  }
};

exports.getJobList = async (req, res, next) => {
  try {
    const { type } = req.body;

    if (!type)
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'type is required.',
      });

    const job = await listJobs(type);

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      job,
    });
  } catch (error) {
    next(error);
  }
};
