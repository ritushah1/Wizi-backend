const Sequelize = require('sequelize');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const employeeSalaryPolicies = require('../models/employeeSalaryPolicy');
const HRSalaryTrasaction = require('../models/hrSalaryTransaction');
const EmployeeWeekOff = require('../models/employeeWeekOff');
const WeekoffOptions = require('../models/weekOffOptions');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const employeeHolidayPolicy = require('../models/employeeHolidayPolicy');
const holidayList = require('../models/holidayList');
const { executeQuery } = require('./common.controller');
const UserMaster = require('../models/userMaster');
const hrLeaveTypes = require('../models/hrLeaveTypes');
const attendanceTransaction = require('../models/attendanceTransaction');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const UserLeave = require('../models/userleave');
const UserLeaveTransactions = require('../models/userLeaveTransaction');
const SalaryPolicy = require('../models/salaryPolicy');
const EmployeeBranch = require('../models/employeeBranch');
const EmployeeDesignation = require('../models/employeeDesignation');
const BranchMaster = require('../models/branchMaster');
const Department = require('../models/department');
const Designation = require('../models/designation');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const OvertimeAuthorizationRequest = require('../models/overtimeAuthorization');
const overTimeCalculation = require('../models/overTimeCalculation');
const AuthorizationMaster = require('../models/authorizationMaster');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const overtimeAuthorizationRequest = require('../models/overtimeAuthorization');
const UserLeaveTransaction = require('../models/userLeaveTransaction');
const moment = require('moment');
const HRSalarySlip = require('../models/hrSalarySlip');
const overTimeCalculationMain = require('../models/overTimeCalculationMain');
const EmployeeAttendanceBonusPolicy = require('../models/empattandancebonuspolicy');
const AttendanceBonusPolicy = require('../models/attendanceBonusPolicy');
const Incentivetype = require('../models/incentivetype');
const {
  accessibleUsers,
  calculateDays,
  attendanceCalculation1,
  checkLeaveOnWH,
  getDaysFromDates,
  asiaKolkataDateTime,
  getStartAndEndDate,
  employeeeLeaveBalance,
  getLeaveAdjustArray,
  getAllSingleDayLeave,
  checkLeavePolicyOnAttendanceVerify,
  getDateByAddingDays,
  checkCoffBalanceProcess,
  addCanteenPenalty,
  resolveAttendanceBonusSlot,
  minutesToHoursMinutes,
  getSalaryCycleDateByMonth,
  getAllWeekoffHolidayWithPriority,
  month_dict,
  getSalary_SalaryMaster_DataMap,
  attendanceCalculationLatest,
  sendEvent,
} = require('../utils/commonUtilFunctions');

const {
  daysInMonth,
  employeeDepartment,
  employeeDesignation,
  employeeBranch,
  lunchBreakPenaltyForVaishnavi,
  checkSundayPresentDoublesalary,
  addThreeDaysExtraAmount,
  getOTDaysforAsopalav,
  getAttendanceData,
  getUserSalaryMasterByMonth,
  userDetails,
} = require('../utils/commonUtilFunctions');

const { generateExcel } = require('../utils/exportData');
const ExtraDays = require('../models/extraDays');
const readXlsxFile = require('read-excel-file/node');
const fs = require('fs');
const Employeeincentive = require('../models/employeeincentive');
const EmployeePenalty = require('../models/employeePenalty');
const HrLeaveBalance = require('../models/hrLeaveBalance');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const EmployeeDepartment = require('../models/employeeDepartment');
const path = require('path');
const weekOffPolicy = require('../models/weekOffPolicy');
const {
  weekoffTypeEnum,
  MonthDaysTypeEnum,
  leaveApplyFromEnum,
  FoodAllowanceTypeEnum,
  incentiveFromEnum,
  CoffUsedTypeEnum,
  defaultPenaltyNames,
  attendanceBonusSlotEnum,
  attendanceBonusType,
  attendanceBonusForEnum,
  HrLeaveTypesIds,
  SalaryPolicyTypeEnum,
  monthlyOTCalcuationType,
  payheadMasterIdsMapping,
  salaryFieldSrNoFields,
  salaryConsiderInEnum,
  default_payheadMasterIds,
  offDayCategoryEnum,
  extraDaysFromEnum,
} = require('../utils/dbUtils');
const coffMaster = require('../models/coffMaster');
const EmployeeLateEarlyPolicy = require('../models/employeeLateEarlyPolicy');
const LateEarlyPolicy = require('../models/lateEarlyPolicy');
const LCEGPenalty = require('../models/lcegPenalty');
const empLeavePolicy = require('../models/empLeavePolicy');
const employeeLeavePolicy = require('../models/employeeLeavePolicy');
const LeaveAuthorizationRequest = require('../models/leaveAuthorization');
const UserInbox = require('../models/UserInbox');
const EmployeeResignation = require('../models/resignation');
const EmployeeEmployeement = require('../models/employeeEmployeement');
const holidayPolicy = require('../models/holidayPolicy');
const EmployeeFoodAllowancePolicy = require('../models/employeeFoodAllowancePolicy');
const FoodAllowancePolicy = require('../models/foodAllowancePolicy');
const UsedCoffTransaction = require('../models/usedCoffTransaction');
const ApprovedLeaveAuthorization = require('../models/approvedLeaveAuthorization');
const CanteenLogs = require('../models/canteenLogs');
const Penalty = require('../models/penalty');
const CanteenMeals = require('../models/canteenMeals');
const biometricIntegration = require('../models/biometricIntegration');
const { statusCodes } = require('../utils/commonVars');
const AttendanceCorrectionRequest = require('../models/attendanceCorrectionRequest');
const Shift = require('../models/shift');
const ShiftTIme = require('../models/shiftTime');
const EmployeeShift = require('../models/employeeShift');
const HRSalaryMasterFields = require('../models/hrSalaryMaster');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const GradeStructure = require('../models/gradeStructure');
const HRSalaryFields = require('../models/hrSalaryFields');
const Payheadmaster = require('../models/payhead');
const deposit = require('../models/deposit');
const depositcategory = require('../models/depositCategory');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const PHWeekOffPolicySlab = require('../models/phWeekOffPolicySlab');
const UserDocument = require('../models/userDocument');
const DocumentList = require('../models/documentList');
const SalaryEligibilityDocument = require('../models/salaryEligibilityDocument');

async function getdates(weekoffid, yearMonth, UserMasterID) {
  let alldata = [];
  alldata = await WeekoffOptions.findAll({
    where: {
      weekOffPolicyID: weekoffid,
    },
  });
  function Value(option) {
    if (option.slice(0, 4) == 'full') {
      return 1;
    } else {
      return 0.5;
    }
  }

  function getDate(year, month, day) {
    var start_date = new Date(year, month - 1, 2);
    var end_date = new Date(year, month, 0).getDate();
    var day_date = new Array();
    var day_val;
    if (day == 'sunday') {
      day_val = 0;
    } else if (day == 'monday') {
      day_val = 1;
    } else if (day == 'tuesday') {
      day_val = 2;
    } else if (day == 'wednesday') {
      day_val = 3;
    } else if (day == 'thursday') {
      day_val = 4;
    } else if (day == 'friday') {
      day_val = 5;
    } else {
      day_val = 6;
    }

    for (var i = 1; i <= end_date; i++) {
      var newDate = new Date(
        start_date.getFullYear(),
        start_date.getMonth(),
        i,
      );
      if (newDate.getDay() == day_val) {
        day_date.push(i);
      }
    }
    return day_date;
  }
  var arr = [];

  if (alldata.length > 0) {
    for (var i = 0; i < alldata.length; i++) {
      for (j = 0; j < alldata[i].dataValues.options.length; j++) {
        var value = Value(alldata[i].dataValues.options[j].option);
        var temp_date;
        var day = alldata[i].day;
        var year = String(yearMonth).slice(0, 4);
        var month = String(yearMonth).slice(4, 6);
        var day_option = alldata[i].dataValues.options[j].name.slice(0, 3);

        if (day_option != 'all') {
          if (day_option == '1st') {
            temp_date = getDate(year, month, day)[0];
          } else if (day_option == '2nd') {
            temp_date = getDate(year, month, day)[1];
          } else if (day_option == '3rd') {
            temp_date = getDate(year, month, day)[2];
          } else if (day_option == '4th') {
            temp_date = getDate(year, month, day)[3];
          } else if (day_option == '5th') {
            temp_date = getDate(year, month, day)[4];
          } else {
            temp_date = null;
          }
          if (temp_date != null) {
            let temp = {
              companyMasterID:
                alldata[i].weekOffPolicy.dataValues.companyMasterID,
              userMasterID: UserMasterID,
              yearMonth: yearMonth,
              date: new Date(
                new Date(year, month - 1, temp_date).getTime() + 330 * 60000,
              )
                .toISOString()
                .split('T')[0],
              dayName: alldata[i].day,
              value: value,
              tableName: 'weekoff',
            };
            arr.push(temp);
          }
        } else {
          for (k = 0; getDate(year, month, day)[k] != null; k++) {
            temp_date = getDate(year, month, day)[k];
            let temp = {
              companyMasterID:
                alldata[i].weekOffPolicy.dataValues.companyMasterID,
              userMasterID: UserMasterID,
              yearMonth: yearMonth,
              date: new Date(
                new Date(year, month - 1, temp_date).getTime() + 330 * 60000,
              )
                .toISOString()
                .split('T')[0],
              dayName: alldata[i].day,
              value: value,
              tableName: 'weekoff',
            };
            arr.push(temp);
          }
        }
      }
    }
  }
  return arr;
}

async function getdatesholiday(holidayid, yearMonth, UserMasterID) {
  var arr = [];
  let alldata = [];
  alldata = await holidayList.findAll({
    where: {
      holidayPolicyID: holidayid,
    },
    include: [{ model: holidayPolicy }],
  });

  function get_day(date) {
    temp = date.getDay();
    days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return days[temp];
  }
  var arr = [];
  for (var j = 0; j < alldata.length; j++) {
    for (var i = 0; i < alldata[j].holidayDate.length; i++) {
      let temp = {
        companyMasterID: alldata[j].holidayPolicy.dataValues.companyMasterID,
        userMasterID: UserMasterID,
        yearMonth: Number(
          new Date(alldata[j].holidayDate[i].getTime() + 1000 * (60 * 330))
            .toISOString()
            .slice(0, 10)
            .slice(0, 4) +
            new Date(alldata[j].holidayDate[i].getTime() + 1000 * (60 * 330))
              .toISOString()
              .slice(0, 10)
              .slice(5, 7),
        ),
        date: new Date(alldata[j].holidayDate[i].getTime() + 1000 * (60 * 330))
          .toISOString()
          .slice(0, 10),
        dayName: get_day(alldata[j].holidayDate[i]),
        value: 1,
        tableName: 'holiday',
      };
      arr.push(temp);
    }
  }
  return arr;
}

async function overtimeauthorizationForAsopalav(data) {
  let authorizationmaster = await AuthorizationMaster.findOne({
    where: { authorizationMasterName: 'Overtime' },
  });
  let authorizationdetails = await AuthorizationDetails.findOne({
    where: {
      AuthorizationMasterID: authorizationmaster.authorizationMasterID,
      userMasterID: data.UserMasterID,
      status: 1,
    },
    raw: true,
  });

  let find_overtime = await overTimeCalculation.findOne({
    where: {
      UserMasterID: data.UserMasterID,
      OverTimeDate: data.OverTimeDate,
      AttendanceTransID: null,
    },
  });

  if (find_overtime) {
    await sequelize.transaction(async (t) => {
      let db_status = await overTimeCalculation.update(
        {
          OverTimeIn: data.OverTimeIn,
          OverTimeOut: data.OverTimeOut,
          OverTimeHourAndMin: Math.round(+data.OverTimeHourAndMin),
        },
        {
          where: {
            UserMasterID: data.UserMasterID,
            OverTimeDate: data.OverTimeDate,
          },
          transaction: t,
        },
      );
    });
  } else {
    if (authorizationdetails) {
      let AuthorizationCriterias = await AuthorizationCriteria.findOne({
        where: {
          AuthorizationCriteriaID: authorizationdetails.AuthorizationCriteriaID,
          status: 1,
        },
        raw: true,
      });

      if (AuthorizationCriterias.AuthorizationCriteria == 'Sequeance No') {
        let result = await sequelize.transaction(async (t) => {
          let db_status = await overTimeCalculation.create(
            {
              AttendanceTransID: data.AttendanceTransID,
              UserMasterID: data.UserMasterID,
              OverTimeDate: data.OverTimeDate,
              OverTimeIn: data.OverTimeIn,
              OverTimeOut: data.OverTimeOut,
              OverTimeHourAndMin: Math.round(+data.OverTimeHourAndMin),
              AttendancePolicyID: data.AttendancePolicyID,
              AuthorizationRequired: 2,
              CompanyMasterID: data.CompanyMasterID,
              createBy: data.createBy,
              createByIp: data.createByIp,
            },
            { transaction: t },
          );
          let insert_db_status1 = await OvertimeAuthorizationRequest.create(
            {
              ReferenceID: db_status.OverTimeID,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
              status: 1,
              authstatus: 2,
              createBy: data.createBy,
              createByIp: data.createByIp,
            },
            { transaction: t },
          );

          return db_status;
        });
      } else {
        let result = await sequelize.transaction(async (t) => {
          let db_status = await overTimeCalculation.create(
            {
              AttendanceTransID: data.AttendanceTransID,
              UserMasterID: data.UserMasterID,
              OverTimeDate: data.OverTimeDate,
              OverTimeIn: data.OverTimeIn,
              OverTimeOut: data.OverTimeOut,
              OverTimeHourAndMin: Math.round(+data.OverTimeHourAndMin),
              AttendancePolicyID: data.AttendancePolicyID,
              CompanyMasterID: data.CompanyMasterID,
              AuthorizationRequired: 1,
              createBy: data.createBy,
              createByIp: data.createByIp,
            },
            { transaction: t },
          );

          for (
            var i = 0;
            i < authorizationdetails.AuthorizedByUserMasterId.length;
            i++
          ) {
            let insert_db_status1 = await OvertimeAuthorizationRequest.create(
              {
                ReferenceID: db_status.OverTimeID,
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[i],
                status: 1,
                authstatus: 2,
                createBy: data.createBy,
                createByIp: data.createByIp,
              },
              { transaction: t },
            );
          }
        });
      }
    } else {
      let result = await sequelize.transaction(async (t) => {
        let db_status = await overTimeCalculation.create(
          {
            AttendanceTransID: data.AttendanceTransID,
            UserMasterID: data.UserMasterID,
            OverTimeDate: data.OverTimeDate,
            OverTimeIn: data.OverTimeIn,
            OverTimeOut: data.OverTimeOut,
            AuthorizationRequired: 0,
            OverTimeHourAndMin: Math.round(+data.OverTimeHourAndMin),
            AttendancePolicyID: data.AttendancePolicyID,
            CompanyMasterID: data.CompanyMasterID,
            createBy: data.createBy,
            createByIp: data.createByIp,
          },
          { transaction: t },
        );

        return db_status;
      });
    }
  }
}

async function calculateExtraDays(
  salaryPolicy,
  salaryData = [],
  userMasterID,
  start_date,
  end_date,
  monday,
  salaryCalculationAct,
  calculatedAttendanceData,
  extraDays,
) {
  let amount = 0;

  if (!salaryData.length) return amount;

  const grossAmount = Number(
    salaryData.find((e) => e.payheadMasterId == 50)?.EmployeeSalaryAmount ?? 0,
  );

  if (salaryData[0].baseOnCalculation == 'D') amount = grossAmount * +extraDays;
  if (salaryData[0].baseOnCalculation == 'H')
    amount = grossAmount * 8 * +extraDays;
  // if monthly salary
  if (salaryData[0].baseOnCalculation == 'M') {
    let salary_CalculationDays = Number(monday);
    let calculateBy;
    let shiftHrs = 8;

    if (salaryPolicy) {
      let salaryCalculationDays = salaryPolicy.salaryCalculationDays,
        salarycalbasedon = salaryPolicy.salarycalculationBasedon;

      if (salaryCalculationDays && salarycalbasedon == 'daywise') {
        salary_CalculationDays = salaryCalculationDays;
      } else {
        if (salarycalbasedon == 'hourwise') {
          calculateBy = 'hourwise';

          const attendance = await attendanceTransaction.findOne({
            raw: true,
            where: {
              userMasterID: userMasterID,
              AttendanceDate: {
                [Sequelize.Op.between]: [start_date, end_date],
              },
            },
            order: [['AttendanceDate', 'DESC']],
          });

          shiftHrs = +attendance?.Shifthrs || 8;

          let monthly_Workingminutes = 0;

          if (!salaryPolicy.monthlyFixhours) {
            if (!salaryPolicy.dailyFixhours) {
              if (attendance) {
                monthly_Workingminutes =
                  Number(attendance.Shifthrs) * Number(monday) * 60;
              } else {
                monthly_Workingminutes = 8 * Number(monday) * 60;
              }
            } else {
              monthly_Workingminutes =
                Number(salaryPolicy.dailyFixhours) * Number(monday) * 60;
            }
          } else {
            monthly_Workingminutes = Number(salaryPolicy.monthlyFixhours) * 60;
          }

          salary_CalculationDays = Number(monthly_Workingminutes);
        } else {
          if (salaryCalculationAct == 'F' || salaryCalculationAct == 'W') {
            const sumOfWeekoff =
              salaryCalculationAct == 'F'
                ? calculatedAttendanceData
                    .filter((e) => [30].includes(e['hrLeaveType.LeaveID']))
                    .reduce((acc, obj) => acc + +obj.AttnVal, 0)
                : calculatedAttendanceData
                    .filter((e) => [30, 31].includes(e['hrLeaveType.LeaveID']))
                    .reduce((acc, obj) => acc + +obj.AttnVal, 0);

            salary_CalculationDays = +monday - +sumOfWeekoff;
          }
        }
      }
    } else {
      if (salaryCalculationAct == 'F' || salaryCalculationAct == 'W') {
        const sumOfWeekoff =
          salaryCalculationAct == 'F'
            ? calculatedAttendanceData
                .filter((e) => [30].includes(e['hrLeaveType.LeaveID']))
                .reduce((acc, obj) => acc + +obj.AttnVal, 0)
            : calculatedAttendanceData
                .filter((e) => [30, 31].includes(e['hrLeaveType.LeaveID']))
                .reduce((acc, obj) => acc + +obj.AttnVal, 0);

        salary_CalculationDays = +monday - +sumOfWeekoff;
      }
    }

    // if hourly

    if (calculateBy == 'hourwise') {
      amount =
        (grossAmount / +salary_CalculationDays) * +shiftHrs * 60 * +extraDays;
    } else {
      amount = (grossAmount / +salary_CalculationDays) * +extraDays;
    }
  }
  return amount;
}

function sumByGroup(array = []) {
  const groupedAbsentArray = Object.values(
    array.reduce((acc, { LeaveTranId, LeaveDays, days }) => {
      if (!acc[LeaveTranId]) {
        acc[LeaveTranId] = { LeaveTranId, LeaveDays: 0 };
      }
      acc[LeaveTranId].LeaveDays += LeaveDays || days;
      return acc;
    }, {}),
  );

  return groupedAbsentArray;
}

exports.postUpdateLeaveAttnTranId = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    let {
      ArrayData,
      coffType = null,
      coffValue = 0,
      weekoffPolicyType = null,
      weekoffValue = 0,
      holidayExtraDays = 0,
    } = req.body;

    if (ArrayData.length > 0) {
      const check_NegativeValue = ArrayData.filter((item) => +item.AttnVal < 0);

      if (
        check_NegativeValue.length > 0 &&
        req.userDetails.companyMasterId != 384
      ) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: 'Attendance Value Should be positive value!',
        });
      }

      let userMasterID = ArrayData[0].userMasterID;
      let yearMonth = ArrayData[0].AttnYearMon;

      let monday =
        ArrayData[0].MonDays ||
        daysInMonth(yearMonth.slice(4, 6), yearMonth.slice(0, 4));

      // ----- get previous month to next month -----------------

      const { startDate, endDate } = getStartAndEndDate(+yearMonth);

      const userData = await UserMaster.findOne({
        where: {
          userMasterID: userMasterID,
          status: 1,
        },
        include: [
          { model: EmployeeJoiningDetails },
          // employee leave policy
          {
            required: false,
            model: empLeavePolicy,
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: endDate,
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: startDate,
                  },
                },
                {
                  endDate: {
                    [Sequelize.Op.is]: null,
                  },
                },
              ],
            },
          },
          // salary policy
          {
            required: false,
            model: employeeSalaryPolicies,
            where: {
              status: 1,
              startDate: {
                [Sequelize.Op.lte]: endDate,
              },

              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.is]: null } },
                { endDate: { [Sequelize.Op.gte]: startDate } },
              ],
            },
            attributes: ['salaryPolicyID', 'startDate', 'endDate'],
            include: [
              {
                model: SalaryPolicy,
                as: 'salaryPolicy',
              },
            ],
          },
          // attendance policy
          {
            required: false,
            model: EmployeeAttendancePolicy,
            where: {
              status: 1,
              startDate: {
                [Sequelize.Op.lte]: endDate,
              },

              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.is]: null } },
                { endDate: { [Sequelize.Op.gte]: startDate } },
              ],
            },
            attributes: ['attendancePolicyID', 'startDate', 'endDate'],
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
                  ['overtimeEntryAfterMin', 'Ot_Aft_min'],
                  'isWHAbsentRule',
                  'isAddlPaidDay',
                ],
              },
            ],
          },
          // branch
          {
            model: EmployeeBranch,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(startDate) },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            required: false,
            attributes: ['branchID', 'applicableDate', 'endDate'],
          },
          // employee attendance bonus policy
          {
            separate: true,
            required: false,
            model: EmployeeAttendanceBonusPolicy,
            where: {
              status: 1,
              startDate: {
                [Sequelize.Op.lte]: endDate,
              },

              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.is]: null } },
                { endDate: { [Sequelize.Op.gte]: startDate } },
              ],
            },
            include: [
              {
                model: AttendanceBonusPolicy,
              },
            ],
          },
          // food allowance policy
          {
            required: false,
            model: EmployeeFoodAllowancePolicy,
            as: 'empFAP',
            where: {
              status: 1,
              startDate: {
                [Sequelize.Op.lte]: endDate,
              },

              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.is]: null } },
                { endDate: { [Sequelize.Op.gte]: startDate } },
              ],
            },
            attributes: ['startDate', 'endDate', 'foodAllowancePolicyId'],
            include: [
              {
                model: FoodAllowancePolicy,
                attributes: ['foodAllowanceType', 'workingTimeAmount'],
              },
            ],
          },
          // canteen logs
          {
            required: false,
            model: CanteenLogs,
            where: {
              [Sequelize.Op.and]: [
                Sequelize.where(
                  Sequelize.fn('DATE', Sequelize.col('logDateTime')),
                  '>=',
                  startDate,
                ),
                Sequelize.where(
                  Sequelize.fn('DATE', Sequelize.col('logDateTime')),
                  '<=',
                  endDate,
                ),
              ],
            },
            include: { model: EmployeePenalty },
          },
          // hrleave monthly trans
          {
            separate: true,
            required: false,
            model: HrLeaveMonthlyTrans,
            where: {
              AttnYearMon: yearMonth,
              verified: 1,
            },
            limit: 1,
          },
        ],
      });

      if (!userData) throw new Error('User not found!');

      const alreadyVerified = userData.hrLeaveMonthlyTrans?.[0] || null;

      if (alreadyVerified) {
        await transaction.rollback();
        return res.status(statusCodes.OK).json({
          status: statusCodes.BAD_REQUEST,
          message: 'Attendance has already been verified.',
        });
      }

      const companyId = userData.companyMasterId;

      const joiningdata = userData.employeeJoiningDetails?.[0] || null;
      const salaryCalAct = joiningdata?.salaryCalculationAct || null;

      const createBy = req.userDetails?.userMasterId || null;
      const createByIp = req.userDetails?.ipAddress || null;

      // await sequelize.transaction(async (t) => {
      for (let i = 0; i < ArrayData.length; i++) {
        await HrLeaveMonthlyTrans.update(
          {
            AttnVal: ArrayData[i].AttnVal || 0,
            verified: 1,
            MonDays: ArrayData[i].MonDays,
            updateBy: createBy,
            updateByIp: createByIp,
          },
          {
            where: {
              userMasterID: ArrayData[i].userMasterID,
              AttnYearMon: ArrayData[i].AttnYearMon,
              LeaveTranId: ArrayData[i].LeaveTranId,
            },
            transaction,
          },
        );
      }

      const [affectedCount, updatedRows] = await HrLeaveMonthlyTrans.update(
        {
          verified: 1,
          salaryCalAct,
          updateBy: createBy,
          updateByIp: createByIp,
        },
        {
          where: {
            userMasterID: userMasterID,
            AttnYearMon: yearMonth,
          },
          transaction,
          returning: true,
        },
      );

      let start_date =
        updatedRows && updatedRows.length > 0 && updatedRows[0].monthstartdate
          ? updatedRows[0].monthstartdate
          : yearMonth.slice(0, 4) + '-' + yearMonth.slice(4, 6) + '-' + '01';

      let end_date =
        updatedRows && updatedRows.length > 0 && updatedRows[0].monthenddate
          ? updatedRows[0].monthenddate
          : yearMonth.slice(0, 4) + '-' + yearMonth.slice(4, 6) + '-' + monday;

      const branch =
        (userData.employeeBranches || []).find(
          (e) =>
            new Date(e.applicableDate) <= new Date(end_date) &&
            (new Date(e.endDate) >= new Date(end_date) || !e.endDate),
        ) || null;

      // --------------------------------- add penalty of canteen logs -----------------------

      const canteenLogs = (userData.canteenLogs || [])
        .filter((e) => {
          const dateStr = asiaKolkataDateTime(e.logDateTime).slice(0, 10);
          return dateStr >= start_date && dateStr <= end_date;
        })
        .sort((a, b) => new Date(a.logDateTime) - new Date(b.logDateTime));

      if (canteenLogs.length) {
        // ------------------------ find canteen Penalty type of company ----------------

        const canteenPenaltyType = await Penalty.findOne({
          where: {
            companyMasterID: companyId,
            penaltyName: defaultPenaltyNames.CANTEEN,
            isDefault: true,
            status: 1,
          },
        });

        // ------------- biometric integration ----------

        const biometricIntegrationData = await biometricIntegration.findOne({
          where: {
            companyMasterID: companyId,
            status: 1,
          },
        });

        const canteenDetailIds =
          biometricIntegrationData?.canteenDetailsId?.filter((e) => e) || [];

        // --- canteen meals data ---------

        const canteenMealsData = await CanteenMeals.findAll({
          raw: true,
          where: {
            canteenDetailsId: canteenDetailIds,
            status: 1,
          },
        });

        // ------------------------ Process Penalties ----------------

        await addCanteenPenalty(
          canteenPenaltyType,
          canteenLogs,
          canteenMealsData,
          biometricIntegrationData,
          createBy,
          createByIp,
          transaction,
        );
      }

      const user_attendancePolicy =
        (userData.employeeAttendancePolicies || []).find(
          (e) =>
            new Date(e.startDate) <= new Date(end_date) &&
            (new Date(e.endDate) >= new Date(end_date) || !e.endDate),
        )?.attendancePolicy || null;

      const user_salaryPolicy =
        (userData.employeeSalaryPolicies || []).find(
          (e) =>
            new Date(e.startDate) <= new Date(end_date) &&
            (new Date(e.endDate) >= new Date(end_date) || !e.endDate),
        )?.salaryPolicy || null;

      const attendanceBonusPolicy =
        (userData.employeeAttendanceBonusPolicies || []).find(
          (e) =>
            new Date(e.startDate) <= new Date(end_date) &&
            (new Date(e.endDate) >= new Date(end_date) || !e.endDate),
        )?.attendanceBonusPolicy || null;

      // food allowance policy
      const foodAllowancePolicy =
        (userData.empFAP || []).find(
          (e) =>
            new Date(e.startDate) <= new Date(end_date) &&
            (new Date(e.endDate) >= new Date(end_date) || !e.endDate),
        )?.foodAllowancePolicy || null;

      // find leave policy

      const employeeLeavePolicyIds =
        (userData.empLeavePolicies || []).find(
          (e) =>
            new Date(e.applicableDate) <= new Date(end_date) &&
            (new Date(e.endDate) >= new Date(end_date) || !e.endDate),
        )?.employeeLeavePolicyID || [];

      // fins all leave policy

      const allTempLeavePolicy = await employeeLeavePolicy.findAll({
        where: {
          id: {
            [Sequelize.Op.in]: employeeLeavePolicyIds,
          },
        },
        attributes: [
          'leaveId',
          'autoAdjustedPriority',
          'isAutoAdjusted',
          'leaveOperationalYear',
          'allowHalfDays',
          'allowMaxInMonth',
          'allowMaxInQuarter',
          'allowMaxInHalfYear',
          'allowMaxInYear',
          'leaveOnNoticePeriod',
          'leaveOnProbation',
          'probationDays',
          'presentDays',
          'expiryDays',
        ],
        order: [['autoAdjustedPriority', 'ASC']],
      });

      // all AutoAdjusted policy
      const allLeavePolicy = allTempLeavePolicy.filter((e) => e.isAutoAdjusted);

      // coff Policy

      const coffLeavePolicy = allTempLeavePolicy.find((e) => e.leaveId == 6);

      // find attendance data
      let attendancedata = [];
      let attendanceExecuted = false;

      // ------------------- set leave logic here --------------------

      const hrLeaveData = await HrLeaveMonthlyTrans.findAll({
        where: {
          userMasterID,
          AttnYearMon: yearMonth,
        },
        include: [
          {
            model: HrLeaveTypes,
            attributes: ['LeaveID'],
          },
        ],
        transaction,
      });

      const absent =
        hrLeaveData.find((e) => e.hrLeaveType?.LeaveID == 5) || null;
      const absentDueToSandwhich =
        hrLeaveData.find((e) => e.hrLeaveType?.LeaveID == 28) || null;

      const absentValue = absent?.AttnVal || 0;

      const absentDueToSandwhichValue = absentDueToSandwhich?.AttnVal || 0;

      if (
        allLeavePolicy.length &&
        (+absentValue > 0 || +absentDueToSandwhichValue > 0)
      ) {
        attendancedata = await getAttendanceData(
          userMasterID,
          start_date,
          end_date,
          false,
        );

        attendanceExecuted = true;

        const [resignation, employeement] = await Promise.all([
          EmployeeResignation.findOne({
            where: {
              userMasterID,
              authorizationstatus: {
                [Sequelize.Op.in]: [0, 1, 2, 3],
              },
              status: 1,
            },
          }),
          EmployeeEmployeement.findOne({
            where: {
              userMasterID,
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(end_date),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: {
                    [Sequelize.Op.gte]: new Date(end_date),
                  },
                },
                {
                  endDate: {
                    [Sequelize.Op.is]: null,
                  },
                },
              ],
            },
          }),
        ]);

        const leaveCheckArray = await checkLeavePolicyOnAttendanceVerify(
          allLeavePolicy,
          start_date,
          end_date,
          yearMonth,
          userMasterID,
          employeement,
          resignation,
          joiningdata?.joiningDate || null,
        );

        // ---------------------- Pending Leave Logic -------------------------

        const pendingLeave = await UserLeave.findAll({
          where: {
            userMasterID,
            [Sequelize.Op.or]: [
              {
                FromDate: {
                  [Sequelize.Op.lte]: start_date,
                },
                ToDate: {
                  [Sequelize.Op.gte]: start_date,
                },
              },
              {
                FromDate: {
                  [Sequelize.Op.lte]: end_date,
                },
                ToDate: {
                  [Sequelize.Op.gte]: end_date,
                },
              },
              {
                FromDate: {
                  [Sequelize.Op.gte]: start_date,
                },
                ToDate: {
                  [Sequelize.Op.lte]: end_date,
                },
              },
            ],
            authorizationStatus: {
              [Sequelize.Op.in]: [0, 1, 2],
            },
            status: 1,
          },

          include: [
            { model: hrLeaveTypes, attributes: ['LeaveID'] },
            { model: LeaveAuthorizationRequest },
          ],
          transaction,
        });

        // find inbox

        const allAuthIds = pendingLeave.flatMap((item) =>
          item.leaveAuthorizations.map((child) => child.AuthorizationRequestId),
        );

        // delete user inbox request
        await UserInbox.destroy({
          where: {
            activityTablePK: {
              [Sequelize.Op.in]: allAuthIds,
            },
            [Sequelize.Op.or]: [
              {
                activityTable: LeaveAuthorizationRequest.getTableName(),
              },
              {
                activityTable: 'outdoorDutyAuthorizations',
              },
            ],
          },
          transaction,
        });

        await ApprovedLeaveAuthorization.destroy({
          where: {
            AuthorizationRequestId: {
              [Sequelize.Op.in]: allAuthIds,
            },
          },
          transaction,
        });

        // delete authorization data
        await LeaveAuthorizationRequest.destroy({
          where: {
            AuthorizationRequestId: {
              [Sequelize.Op.in]: allAuthIds,
            },
          },
          transaction,
        });

        const ODLeave = pendingLeave.filter(
          (e) => e.hrLeaveType?.LeaveID == 25,
        );

        const ODApprovedLeave = getAllSingleDayLeave(
          ODLeave,
          createBy,
          createByIp,
        );

        const optionalHolidayLeave = pendingLeave.filter(
          (e) => e.hrLeaveType?.LeaveID == 24,
        );

        const OHApprovedLeave = getAllSingleDayLeave(
          optionalHolidayLeave,
          createBy,
          createByIp,
        );

        const otherLeaves = pendingLeave.filter(
          (e) => ![24, 25].includes(+e.hrLeaveType?.LeaveID),
        );

        const leaveBalance = await employeeeLeaveBalance(
          companyId,
          userMasterID,
        );

        const toApprovedLeave = [];
        const toDeleteLeave = [];

        let coffAvailableBalance = [];
        let allUsedCoffTrans = [];

        for (const leaveReq of otherLeaves) {
          // if absent or LWF
          if ([5, 18].includes(+leaveReq.hrLeaveType?.LeaveID)) {
            toApprovedLeave.push(leaveReq);
            continue;
          }

          // find validate leavePolicy Data
          const checkPolicy = leaveCheckArray.find(
            (e) => e.leaveId == leaveReq.hrLeaveType?.LeaveID,
          );

          // for coff
          if (leaveReq.hrLeaveType?.LeaveID == 6) {
            const singleDayCoff = getAllSingleDayLeave([leaveReq]);

            let coffTempAvailableBalance = [];
            let tempUsedTransactionLog = [];
            let deleteFlag = false;

            // loop through all dates
            for (const coff of singleDayCoff) {
              // check coff balance process
              const {
                allBalanceData: allBalanceDataTemp,
                remaining,
                usedTransactionLog,
              } = await checkCoffBalanceProcess(
                coffAvailableBalance,
                leaveReq.userMasterID,
                coff.date,
                coff.days,
              );

              if (remaining > 0) {
                // to delete leave req
                deleteFlag = true;
                break;
              }

              // check policy conditions

              if (checkPolicy) {
                // if user on probation or notice period
                if (!checkPolicy.leaveStatus) {
                  // to delete leave req
                  deleteFlag = true;
                  break;
                }

                // if half day allowed or not

                if (!checkPolicy.allowHalfDay && leaveReq.LeaveDays == 0.5) {
                  // to delete leave req
                  deleteFlag = true;
                  break;
                }

                // check allowed leave

                if (
                  checkPolicy.allowedLeave > 0 &&
                  checkPolicy.allowedLeave <
                    +checkPolicy.usedLeave + +leaveReq.LeaveDays
                ) {
                  // to delete leave req
                  deleteFlag = true;
                  continue;
                }

                checkPolicy.usedLeave += +coff.days;
              }

              tempUsedTransactionLog = [
                ...tempUsedTransactionLog,
                ...usedTransactionLog,
              ];

              const filteredData = coffTempAvailableBalance.filter(
                (e) =>
                  !allBalanceDataTemp
                    .map((c) => +c.LeaveBalTranId)
                    .includes(+e.LeaveBalTranId),
              );

              // restore to allBalanceData
              coffTempAvailableBalance = [
                ...filteredData,
                ...allBalanceDataTemp,
              ];
            }

            // if not deleted

            if (!deleteFlag) {
              allUsedCoffTrans = [
                ...allUsedCoffTrans,
                ...tempUsedTransactionLog,
              ];

              const filteredData = coffAvailableBalance.filter(
                (e) =>
                  !coffTempAvailableBalance
                    .map((c) => +c.LeaveBalTranId)
                    .includes(+e.LeaveBalTranId),
              );

              // restore to allBalanceData
              coffAvailableBalance = [
                ...filteredData,
                ...coffTempAvailableBalance,
              ];
            }
          } else {
            const findBalance = leaveBalance.find(
              (e) => e.LeaveID == leaveReq.hrLeaveType?.LeaveID,
            );
            // if balance is available
            if (leaveReq.LeaveDays <= findBalance.Balance) {
              if (checkPolicy) {
                // if user on probation or notice period
                if (!checkPolicy.leaveStatus) {
                  // to delete leave req
                  toDeleteLeave.push(leaveReq);
                  continue;
                }

                // if half day allowed or not

                if (!checkPolicy.allowHalfDay && leaveReq.LeaveDays == 0.5) {
                  // to delete leave req
                  toDeleteLeave.push(leaveReq);
                  continue;
                }

                // check allowed leave

                if (
                  checkPolicy.allowedLeave > 0 &&
                  checkPolicy.allowedLeave <
                    +checkPolicy.usedLeave + +leaveReq.LeaveDays
                ) {
                  // to delete leave req
                  toDeleteLeave.push(leaveReq);
                  continue;
                }

                checkPolicy.usedLeave += +leaveReq.LeaveDays;
              }

              findBalance.Balance -= leaveReq.LeaveDays;
              toApprovedLeave.push(leaveReq);
            } else {
              // to delete leave req
              toDeleteLeave.push(leaveReq);
            }
          }
        }

        const othersApprovedLeave = getAllSingleDayLeave(
          toApprovedLeave,
          createBy,
          createByIp,
        );

        const finalApprovedArray = [
          ...ODApprovedLeave,
          ...OHApprovedLeave,
          ...othersApprovedLeave,
        ];

        const leaveIds = [
          ...new Set(finalApprovedArray.map((e) => e.ReferenceID)),
        ];

        const queryArray = [];
        // update leaveQuery
        queryArray.push(
          UserLeave.update(
            {
              authorizationStatus: 3,
              updateBy: createBy,
              updateByIp: createByIp,
            },
            {
              where: {
                UserLeaveApplicationID: {
                  [Sequelize.Op.in]: leaveIds,
                },
              },
              transaction,
            },
          ),
        );

        // add approved leave
        queryArray.push(
          UserLeaveTransaction.bulkCreate(finalApprovedArray, { transaction }),
        );

        // delete user leave
        queryArray.push(
          UserLeave.destroy({
            where: {
              UserLeaveApplicationID: {
                [Sequelize.Op.in]: toDeleteLeave.map(
                  (e) => e.UserLeaveApplicationID,
                ),
              },
            },
            transaction,
          }),
        );

        await Promise.all(queryArray);

        const approvedDays = finalApprovedArray.reduce(
          (acc, obj) => acc + +obj.days,
          0,
        );

        // update present Days
        if (absentValue < approvedDays) {
          const presentData =
            hrLeaveData.find((e) => e.hrLeaveType?.LeaveID == 1) || null;

          if (presentData) {
            const value = +presentData.AttnVal - (approvedDays - absentValue);

            await HrLeaveMonthlyTrans.update(
              {
                AttnVal: value || 0,
              },
              {
                where: {
                  userMasterID,
                  AttnYearMon: yearMonth,
                  LeaveTranId: presentData.LeaveTranId,
                },
                transaction,
              },
            );
          }
        }

        // --------------- get adjusted leave array -------------------------

        const {
          absentLeaveArray,
          absentDueTosandwichLeaveArray,
          finalAbsent,
          finalAbsentDueToSandwich,
        } = await getLeaveAdjustArray(
          companyId,
          userMasterID,
          user_attendancePolicy,
          start_date,
          end_date,
          attendancedata,
          absentValue - approvedDays > 0 ? absentValue - approvedDays : 0,
          absentDueToSandwhichValue,
          allLeavePolicy,
          leaveBalance,
          createBy,
          createByIp,
          transaction,
          leaveCheckArray,
        );

        const leaveTransactionArray = [];

        const finalApprovedData = [];

        if (absentValue > 0 || absentDueToSandwhichValue > 0) {
          const coffTranId =
            leaveBalance.find((e) => e.LeaveID == 6)?.LeaveTranId || null;

          let finalAbsentCount = finalAbsent;

          for (const leave of absentLeaveArray) {
            // if not coff
            if (leave.LeaveTranId != coffTranId) {
              finalApprovedData.push(leave);
              continue;
            }

            // check coff balance process
            const {
              allBalanceData: allBalanceDataTemp,
              remaining,
              usedTransactionLog,
            } = await checkCoffBalanceProcess(
              coffAvailableBalance,
              userMasterID,
              leave.FromDate,
              leave.LeaveDays,
            );

            if (remaining > 0) {
              leave.days -= +remaining;
              finalAbsentCount += +remaining;
            }

            finalApprovedData.push(leave);

            allUsedCoffTrans = [...allUsedCoffTrans, ...usedTransactionLog];

            const filteredData = coffAvailableBalance.filter(
              (e) =>
                !allBalanceDataTemp
                  .map((c) => +c.LeaveBalTranId)
                  .includes(+e.LeaveBalTranId),
            );

            // restore to allBalanceData
            coffAvailableBalance = [...filteredData, ...allBalanceDataTemp];
          }

          let finalSandwichCount = finalAbsentDueToSandwich;

          for (const sandwich of absentDueTosandwichLeaveArray) {
            // if not coff
            if (sandwich.LeaveTranId != coffTranId) {
              finalApprovedData.push(sandwich);
              continue;
            }

            // check coff balance process
            const {
              allBalanceData: allBalanceDataTemp,
              remaining,
              usedTransactionLog,
            } = await checkCoffBalanceProcess(
              coffAvailableBalance,
              userMasterID,
              sandwich.FromDate,
              sandwich.LeaveDays,
            );

            if (remaining > 0) {
              sandwich.days -= +remaining;
              finalSandwichCount += +remaining;
            }

            finalApprovedData.push(sandwich);

            allUsedCoffTrans = [...allUsedCoffTrans, ...usedTransactionLog];

            const filteredData = coffAvailableBalance.filter(
              (e) =>
                !allBalanceDataTemp
                  .map((c) => +c.LeaveBalTranId)
                  .includes(+e.LeaveBalTranId),
            );

            // restore to allBalanceData
            coffAvailableBalance = [...filteredData, ...allBalanceDataTemp];
          }

          // update absent
          await HrLeaveMonthlyTrans.update(
            {
              AttnVal: finalAbsentCount || 0,
            },
            {
              where: {
                userMasterID,
                AttnYearMon: yearMonth,
                LeaveTranId: absent.LeaveTranId,
              },
              transaction,
            },
          );

          // update absent due to sandwich

          await HrLeaveMonthlyTrans.update(
            {
              AttnVal: finalSandwichCount || 0,
            },
            {
              where: {
                userMasterID,
                AttnYearMon: yearMonth,
                LeaveTranId: absentDueToSandwhich.LeaveTranId,
              },
              transaction,
            },
          );

          const finalApprovedLeaveArray = [...finalApprovedData].filter(
            (e) => +e.LeaveDays > 0,
          );

          const absentSumArray = sumByGroup([
            ...finalApprovedLeaveArray,
            ...finalApprovedArray,
          ]);

          // if absent array is available

          for (const obj of absentSumArray) {
            const checkLeaveValue =
              hrLeaveData.find((e) => e.LeaveTranId == obj.LeaveTranId)
                ?.AttnVal || 0;

            // update all used leave type
            await HrLeaveMonthlyTrans.update(
              {
                AttnVal: checkLeaveValue + +obj.LeaveDays,
              },
              {
                where: {
                  userMasterID,
                  AttnYearMon: yearMonth,
                  LeaveTranId: obj.LeaveTranId,
                },
                transaction,
              },
            );
          }

          // for absent
          const addedLeave = await UserLeave.bulkCreate(absentLeaveArray, {
            transaction,
            returning: true,
          });

          for (const leave of addedLeave) {
            leaveTransactionArray.push({
              ReferenceID: leave.UserLeaveApplicationID,
              LeaveTranId: leave.LeaveTranId,
              days: leave.LeaveDays,
              date: leave.FromDate,
              issandwichleave: 0,
              status: 1,
              createBy: createBy,
              createByIp: createByIp,
            });
          }

          // for sandwich
          const addedSandwichLeave = await UserLeave.bulkCreate(
            absentDueTosandwichLeaveArray,
            {
              transaction,
              returning: true,
            },
          );

          let sandwichCount = 0;

          for (const leave of addedSandwichLeave) {
            sandwichCount += +leave.LeaveDays;

            leaveTransactionArray.push({
              ReferenceID: leave.UserLeaveApplicationID,
              LeaveTranId: leave.LeaveTranId,
              days: leave.LeaveDays,
              date: leave.FromDate,
              issandwichleave: 0,
              status: 1,
              createBy: createBy,
              createByIp: createByIp,
            });
          }

          // update Leave Behalf Of Sandwich Leave
          const sandwichLeaveData =
            hrLeaveData.find((e) => e.hrLeaveType.LeaveID == 29) || null;

          if (sandwichCount > 0 && sandwichLeaveData) {
            const finalvalue = sandwichLeaveData.AttnVal + +sandwichCount;

            await HrLeaveMonthlyTrans.update(
              {
                AttnVal: finalvalue || 0,
              },
              {
                where: {
                  userMasterID,
                  AttnYearMon: yearMonth,
                  LeaveTranId: sandwichLeaveData.LeaveTranId,
                },
                transaction,
              },
            );
          }
        }

        // if coff data
        if (coffAvailableBalance.length > 0) {
          await UsedCoffTransaction.bulkCreate(allUsedCoffTrans, {
            user: req.userDetails,
            individualHooks: true,
            transaction,
          });

          await Promise.all(
            coffAvailableBalance.map((e) =>
              HrLeaveBalance.update(
                {
                  availBal: e.availBal,
                },
                {
                  where: {
                    LeaveBalTranId: e.LeaveBalTranId,
                  },
                  transaction,
                },
              ),
            ),
          );
        }

        // add final approved leave
        await UserLeaveTransactions.bulkCreate(leaveTransactionArray, {
          transaction,
        });
      }

      // Set Actual Weekoff if weekoffPolicyType is onpresent days
      if (
        weekoffPolicyType &&
        [weekoffTypeEnum.ONPAIDDAYS, weekoffTypeEnum.ONPRESENTDAY].includes(
          weekoffPolicyType,
        )
      ) {
        const weekoffData = await HrLeaveMonthlyTrans.findOne({
          where: {
            userMasterID,
            AttnYearMon: yearMonth,
          },
          include: [
            {
              model: HrLeaveTypes,
              where: {
                LeaveID: 30,
              },
              attributes: ['LeaveID'],
            },
          ],
          transaction,
        });

        if (weekoffData) {
          weekoffData.AttnVal = +weekoffValue;
          await weekoffData.save({ transaction });
        }
      }

      const All_findAttnData = await HrLeaveMonthlyTrans.findAll({
        raw: true,
        where: {
          userMasterID,
          AttnYearMon: yearMonth,
        },
        include: [
          {
            model: HrLeaveTypes,
            where: {
              LeaveID: { [Sequelize.Op.in]: [1, 7, 9, 30, 31, 32, 20, 21] },
            },
            attributes: ['LeaveID'],
          },
        ],
        transaction,
      });

      const workingData =
        All_findAttnData.find((e) => e['hrLeaveType.LeaveID'] == 20) || null;

      const otMinutes =
        All_findAttnData.find(
          (e) => e['hrLeaveType.LeaveID'] == 21 && +e.AttnVal > 0,
        )?.AttnVal || 0;

      const findAttnData = All_findAttnData.filter(
        (e) => ![20, 21].includes(+e['hrLeaveType.LeaveID']),
      );

      const salaryCalculationBasedOn =
        user_salaryPolicy?.salarycalculationBasedon || '';

      // Attendance Bonus
      let extraDays = 0;

      const attBonus_ExtraDays = await Incentivetype.findAll({
        raw: true,
        where: Sequelize.and(
          Sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('incentivetypename')),
            ),

            {
              [Sequelize.Op.in]: [
                'attendance bonus',
                'extra days',
                'food allowance',
              ],
            },
          ),
          Sequelize.where(
            sequelize.col('companyMasterID'),
            userData.companyMasterId,
          ),
          Sequelize.or(
            Sequelize.where(sequelize.col('status'), 0),
            Sequelize.where(sequelize.col('status'), 1),
          ),
        ),
        transaction,
      });

      const attBonusTypeIncentive = attBonus_ExtraDays.find(
        (e) =>
          String(e.incentivetypename).trim().toLocaleLowerCase() ==
          'attendance bonus',
      );
      const extraDaysTypeInc = attBonus_ExtraDays.find(
        (e) =>
          String(e.incentivetypename).trim().toLocaleLowerCase() ==
          'extra days',
      );

      const foodAllowanceTypeInc = attBonus_ExtraDays.find(
        (e) =>
          String(e.incentivetypename).trim().toLocaleLowerCase() ==
          'food allowance',
      );

      let salaryData = [];

      if (attBonusTypeIncentive || extraDaysTypeInc) {
        salaryData = await getUserSalaryMasterByMonth(userMasterID, yearMonth);
      }

      // check condition attendanceBonusPolicy and not set No attendanceBonusPolicy and Attendance Bonus is present in company

      if (
        attendanceBonusPolicy &&
        !attendanceBonusPolicy.setNoattendanceBonusPolicy &&
        attBonusTypeIncentive
      ) {
        let eligibleForBonus = false,
          monthly_PaidDays = 0,
          actual_Present = 0,
          slot = null;

        // for hourly salary calculation
        if (
          salaryCalculationBasedOn == 'hourwise' &&
          attendanceBonusPolicy.type == attendanceBonusType.HOURLY
        ) {
          const userWorkingMinutes = +workingData?.AttnVal || 0;
          const minAttnBonusMin = Math.round(
            +attendanceBonusPolicy.min_bonus_hrs * 60,
          );

          if (+userWorkingMinutes >= +minAttnBonusMin) eligibleForBonus = true;
        }

        // for daily salary calculation

        if (
          salaryCalculationBasedOn != 'hourwise' &&
          attendanceBonusPolicy.type == attendanceBonusType.DAILY
        ) {
          // Set Monthly Paid Days

          // this is for only absent days
          if (
            attendanceBonusPolicy.attBonusFor ==
            attendanceBonusForEnum.ABSENT_DAYS
          ) {
            const totalPaidDays = findAttnData
              .filter((e) => [1, 7, 9].includes(e['hrLeaveType.LeaveID']))
              .reduce((acc, obj) => acc + +obj.AttnVal, 0);

            const absentDays = +monday - +totalPaidDays;

            // Set Slot calculation

            const { slot: slotData, eligibleForBonus: eligible } =
              resolveAttendanceBonusSlot(
                absentDays,
                attendanceBonusPolicy,
                attendanceBonusSlotEnum,
                attendanceBonusPolicy.attBonusFor,
              );

            slot = slotData;
            eligibleForBonus = eligible;
          } else {
            // for present days

            if (joiningdata && joiningdata.salaryCalculationAct == 'F') {
              const weekoff = findAttnData
                .filter((e) => e['hrLeaveType.LeaveID'] == 30)
                .reduce((acc, obj) => acc + +obj.AttnVal, 0);
              monthly_PaidDays = +monday - +weekoff;
              actual_Present = findAttnData
                .filter(
                  (e) =>
                    e['hrLeaveType.LeaveID'] == 1 ||
                    e['hrLeaveType.LeaveID'] == 9,
                )
                .reduce((acc, obj) => acc + +obj.AttnVal, 0);
            } else if (joiningdata && joiningdata.salaryCalculationAct == 'W') {
              const weekoffHoliday = findAttnData
                .filter(
                  (e) =>
                    e['hrLeaveType.LeaveID'] == 30 ||
                    e['hrLeaveType.LeaveID'] == 31,
                )
                .reduce((acc, obj) => acc + +obj.AttnVal, 0);
              monthly_PaidDays = +monday - +weekoffHoliday;
              actual_Present = findAttnData
                .filter((e) => e['hrLeaveType.LeaveID'] == 1)
                .reduce((acc, obj) => acc + +obj.AttnVal, 0);
            } else {
              monthly_PaidDays = +monday;
              actual_Present = findAttnData
                .filter(
                  (e) =>
                    e['hrLeaveType.LeaveID'] == 1 ||
                    e['hrLeaveType.LeaveID'] == 7 ||
                    e['hrLeaveType.LeaveID'] == 9,
                )
                .reduce((acc, obj) => acc + +obj.AttnVal, 0);
            }

            // if set fix days
            if (attendanceBonusPolicy.setPresentDay == 'Fix') {
              const leaveID =
                attendanceBonusPolicy.attBonusFor ==
                attendanceBonusForEnum.PRESENT_DAYS
                  ? [1]
                  : [1, 9];

              const presentDays = findAttnData
                .filter((e) => leaveID.includes(e['hrLeaveType.LeaveID']))
                .reduce((acc, obj) => acc + (+obj.AttnVal || 0), 0);

              // Set Slot calculation

              const { slot: slotData, eligibleForBonus: eligible } =
                resolveAttendanceBonusSlot(
                  presentDays,
                  attendanceBonusPolicy,
                  attendanceBonusSlotEnum,
                  attendanceBonusPolicy.attBonusFor,
                );

              slot = slotData;
              eligibleForBonus = eligible;
            } else if (attendanceBonusPolicy.setPresentDay == 'Half') {
              if (+monthly_PaidDays / 2 <= +actual_Present)
                eligibleForBonus = true;
            } else {
              const totalPaidDays = findAttnData
                .filter((e) => [1, 7, 9].includes(e['hrLeaveType.LeaveID']))
                .reduce((acc, obj) => acc + +obj.AttnVal, 0);

              if (+totalPaidDays == +monday) eligibleForBonus = true;
            }
          }
        }

        // check eligibleForBonus is true

        if (eligibleForBonus) {
          let amount = 0;

          const salaryCalculationType =
            salaryData.length > 0 ? salaryData[0].baseOnCalculation : '';

          // for daily salary

          if (attendanceBonusPolicy.type == attendanceBonusType.DAILY) {
            const attendnaceBonusType =
              slot == attendanceBonusSlotEnum.THREESLOT
                ? attendanceBonusPolicy.attendanceBonustypeSlot3
                : slot == attendanceBonusSlotEnum.TWOSLOT
                  ? attendanceBonusPolicy.attendanceBonustypeSlot2
                  : attendanceBonusPolicy.attendanceBonustype;

            const attendnaceBonusAmount =
              slot == attendanceBonusSlotEnum.THREESLOT
                ? +attendanceBonusPolicy.attendanceBonusAmountSlot3
                : slot == attendanceBonusSlotEnum.TWOSLOT
                  ? +attendanceBonusPolicy.attendanceBonusAmountSlot2
                  : +attendanceBonusPolicy.attendanceBonusAmount;

            // if Attendance Bonus Amount is Fixed
            if (attendnaceBonusType == 'Fix' && salaryCalculationType != 'H') {
              amount = attendnaceBonusAmount;
            } else {
              // Set Extra Days
              extraDays = attendnaceBonusAmount;
              const grossAmount =
                salaryData.find((e) => e.payheadMasterId == 50)
                  ?.EmployeeSalaryAmount || 0;

              // if salaryCalculationType is daywise
              if (salaryCalculationType == 'D')
                amount = +grossAmount * attendnaceBonusAmount;
              // if salaryCalculationType is Month Wise
              if (salaryCalculationType == 'M') {
                let perDayAmount = 0;

                if (salaryCalculationBasedOn == 'daywise')
                  perDayAmount =
                    +grossAmount / +user_salaryPolicy.salaryCalculationDays;
                else {
                  // if salaryCalculationAct set as factory act
                  if (joiningdata && joiningdata.salaryCalculationAct == 'F') {
                    const actualWeekoff = findAttnData.find(
                      (e) => e['hrLeaveType.LeaveID'] == 30,
                    );

                    perDayAmount =
                      +grossAmount /
                      (+monday - (actualWeekoff ? +actualWeekoff.AttnVal : 0));
                  } else if (
                    joiningdata &&
                    joiningdata.salaryCalculationAct == 'W'
                  ) {
                    const actualWeekoffHoliday = findAttnData
                      .filter(
                        (e) =>
                          e['hrLeaveType.LeaveID'] == 30 ||
                          e['hrLeaveType.LeaveID'] == 31,
                      )
                      .reduce((acc, obj) => acc + obj.AttnVal, 0);

                    perDayAmount =
                      +grossAmount / (+monday - actualWeekoffHoliday);
                  } else {
                    perDayAmount = +grossAmount / +monday;
                  }
                }

                amount = perDayAmount * attendnaceBonusAmount;
              }
            }
          }
          // for houly salary
          if (attendanceBonusPolicy.type == attendanceBonusType.HOURLY) {
            let minutes = 0;
            // find trans for shift
            const att = await attendanceTransaction.findOne({
              where: {
                userMasterID,
                AttendanceDate: {
                  [Sequelize.Op.between]: [start_date, end_date],
                },
              },
              order: [['AttendanceDate', 'DESC']],
            });

            if (attendanceBonusPolicy.bonus_criteria == 'fix')
              minutes = Math.round(+attendanceBonusPolicy.hours * 60);

            if (attendanceBonusPolicy.bonus_criteria == 'shift') {
              minutes = att
                ? Math.round(+att.Shifthrs * 60 * +attendanceBonusPolicy.hours)
                : 0;
            }

            let perMinuteGross = 0;

            const grossAmount =
              salaryData.find((e) => e.payheadMasterId == 50)
                ?.EmployeeSalaryAmount || 0;

            // if hourly salary structure
            if (salaryCalculationType == 'H')
              perMinuteGross = +grossAmount / 60;
            // daily salary structure
            if (salaryCalculationType == 'D') {
              if (user_salaryPolicy.dailyFixhours)
                perMinuteGross =
                  +grossAmount / (+user_salaryPolicy.dailyFixhours * 60);

              if (!user_salaryPolicy.dailyFixhours && att)
                perMinuteGross = +grossAmount / (+att.Shifthrs * 60);
            }
            // monthly salary structure
            if (salaryCalculationType == 'M') {
              const days = calculateDays(start_date, end_date) || 0;

              if (user_salaryPolicy.monthlyFixhours)
                perMinuteGross =
                  +grossAmount / (+user_salaryPolicy.monthlyFixhours * 60);

              if (
                user_salaryPolicy.dailyFixhours &&
                !user_salaryPolicy.monthlyFixhours
              )
                perMinuteGross =
                  +grossAmount / (+user_salaryPolicy.dailyFixhours * days * 60);

              if (
                !user_salaryPolicy.dailyFixhours &&
                !user_salaryPolicy.monthlyFixhours &&
                att
              )
                perMinuteGross = +grossAmount / (+att.Shifthrs * days * 60);
            }
            // set minutes and amount
            extraDays = +minutes;
            amount = +perMinuteGross * +minutes;
          }

          const attendanceBonus_leaveType = findAttnData.find(
            (e) => e['hrLeaveType.LeaveID'] == 32,
          );

          // if Extra Days is greater than zero
          if (+extraDays > 0 && attendanceBonus_leaveType) {
            await HrLeaveMonthlyTrans.update(
              {
                AttnVal: extraDays,
                verified: 1,
                updateBy: createBy,
                updateByIp: createByIp,
              },
              {
                where: {
                  userMasterID: userMasterID,
                  AttnYearMon: yearMonth,
                  LeaveTranId: attendanceBonus_leaveType.LeaveTranId,
                },
                transaction,
              },
            );
          }

          // if amount is greater than Zero

          if (+amount > 0) {
            // Add Attendance Bonus in Employee Attendance
            await Employeeincentive.create(
              {
                userMasterID,
                yearmonth: yearMonth,
                amount: Math.round(amount),
                IncentivetypeID: attBonusTypeIncentive.IncentivetypeID,
                incentiveDate: end_date,
                createBy: createBy,
              },
              {
                transaction,
              },
            );
          }
        }
      }

      // -------------------Add coff or Extra Days from Attendance Calculation ----------------------

      if (
        [
          weekoffTypeEnum.MONTHLYFIX,
          weekoffTypeEnum.ONPAIDDAYS,
          weekoffTypeEnum.ONPRESENTDAY,
        ].includes(weekoffPolicyType) &&
        coffValue &&
        coffType
      ) {
        if (coffType == 'AddLeave' && joiningdata) {
          const coffLeaveType = await HrLeaveTypes.findOne({
            where: {
              companyMasterID: userData.companyMasterId,
              LeaveID: 6,
              status: 1,
            },
          });

          if (coffLeaveType) {
            const coffData = await coffMaster.findOne({
              where: {
                userMasterID,
                YearMM: yearMonth,
                From: 'AC',
              },
              include: [
                {
                  model: HrLeaveBalance,
                  include: [{ model: UsedCoffTransaction }],
                },
              ],
            });

            const usedCoff =
              coffData?.hrLeaveBalance?.usedCoffTransactions || [];

            if (usedCoff.length == 0) {
              if (coffData) {
                if (coffData.LeaveBalTranId) {
                  await HrLeaveBalance.destroy({
                    where: {
                      LeaveBalTranId: coffData.LeaveBalTranId,
                    },
                    transaction,
                  });
                }

                await coffMaster.destroy({
                  where: {
                    coffMasterID: coffData.coffMasterID,
                  },
                  transaction,
                });
              }

              const expiryDate = coffLeavePolicy?.expiryDays
                ? getDateByAddingDays(end_date, coffLeavePolicy.expiryDays)
                : null;

              // create leave balance
              const leaveBalance = await HrLeaveBalance.create(
                {
                  LeaveTranId: coffLeaveType.LeaveTranId,
                  userMasterID,
                  YearMM: yearMonth,
                  LeaveAddNew: +coffValue,
                  expiryDate,
                  createBy: createBy,
                  createByIp: createByIp,
                  availBal: +coffValue,
                },
                {
                  transaction,
                },
              );

              await coffMaster.create(
                {
                  LeaveBalTranId: leaveBalance.LeaveBalTranId,
                  LeaveTranId: coffLeaveType.LeaveTranId,
                  userMasterID,
                  LeaveCreatedDate: end_date,
                  YearMM: yearMonth,
                  LeaveAddNew: +coffValue,
                  authorizationStatus: 3,
                  From: 'AC',
                  expiryDate,
                  createBy: createBy,
                  createByIp: createByIp,
                },
                {
                  transaction,
                },
              );
            }
          }
        }

        if (coffType == 'AddExtraDays') {
          // Add Extra Days
          await ExtraDays.create(
            {
              userMasterID,
              date: end_date,
              days: +coffValue,
              employeeincentiveID: null,
              authorizationStatus: 3,
              From: extraDaysFromEnum.ATTENDANCE_CALCULATION,
            },
            {
              user: req.userDetails,
              transaction,
            },
          );
        }
      }

      // if holiday extra days

      if (holidayExtraDays > 0) {
        // Add Extra Days
        await ExtraDays.create(
          {
            userMasterID,
            date: end_date,
            days: +holidayExtraDays,
            employeeincentiveID: null,
            authorizationStatus: 3,
            From: extraDaysFromEnum.WEEKOFF_HOLIDAY_ON_SAME_DAY,
          },
          {
            user: req.userDetails,
            transaction,
          },
        );
      }

      // Extra Days calculation --------------------

      if (extraDaysTypeInc) {
        const extraDaysData = await ExtraDays.findAll({
          where: {
            userMasterID,
            date: {
              [Sequelize.Op.between]: [start_date, end_date],
            },
            authorizationStatus: 3,
          },
          transaction,
        });

        // if extra days data exist
        if (extraDaysData.length) {
          const extraDays = extraDaysData.reduce(
            (acc, obj) => acc + +obj.days,
            0,
          );

          const amount = await calculateExtraDays(
            user_salaryPolicy,
            salaryData,
            userMasterID,
            start_date,
            end_date,
            monday,
            joiningdata?.salaryCalculationAct || '',
            All_findAttnData,
            extraDays,
          );

          if (Math.round(+amount) > 0) {
            const addedData = await Employeeincentive.create(
              {
                userMasterID,
                yearmonth: yearMonth,
                amount: Math.round(amount),
                IncentivetypeID: extraDaysTypeInc.IncentivetypeID,
                incentiveDate: end_date,
                createBy,
              },
              {
                transaction,
              },
            );
            // update Extra Days
            await ExtraDays.update(
              {
                employeeincentiveID: addedData.employeeincentiveID,
                updateBy: createBy,
              },
              {
                where: {
                  extraDaysID: {
                    [Sequelize.Op.in]: extraDaysData.map((e) => e.extraDaysID),
                  },
                },
                hooks: false,
                transaction,
              },
            );
          }
        }
      }

      // food allowance calculation-----------------

      if (
        foodAllowanceTypeInc &&
        foodAllowancePolicy?.foodAllowanceType ==
          FoodAllowanceTypeEnum.ON_MONTH_DAYS
      ) {
        const totalDays = getDaysFromDates(start_date, end_date);

        const amount = +totalDays * +foodAllowancePolicy.workingTimeAmount;

        if (Math.round(amount) > 0) {
          await Employeeincentive.create(
            {
              userMasterID,
              yearmonth: yearMonth,
              amount: Math.round(amount),
              IncentivetypeID: foodAllowanceTypeInc.IncentivetypeID,
              incentiveDate: end_date,
              from: incentiveFromEnum.ATTN_CAL,
              createBy: createBy,
            },
            {
              transaction,
            },
          );
        }
      }

      // hourly overtime request
      if (+otMinutes > 0 && joiningdata?.overtime == 1) {
        const company = userData.companyMasterId;

        let overtimeEntryAfter = 0;

        if (user_attendancePolicy) {
          overtimeEntryAfter = user_attendancePolicy.dataValues.Ot_Aft_min;
        }
        if (Number(otMinutes) > Number(overtimeEntryAfter)) {
          let final_ot_min = Number(otMinutes);

          let data = {
            AttendanceTransID: null,
            UserMasterID: userMasterID,
            OverTimeDate: end_date,
            OverTimeIn: null,
            OverTimeOut: null,
            OverTimeHourAndMin: final_ot_min,
            AttendancePolicyID: null,
            CompanyMasterID: company,
            createBy: createBy,
            createByIp: createByIp,
          };
          await overtimeauthorization(data);
        }
      }

      // condition for Asopalv
      if (
        (companyId == 277 || companyId == 298 || companyId == 300) &&
        joiningdata?.overtime == 1
      ) {
        const ot_data = await getOTDaysforAsopalav(userMasterID, yearMonth);

        if (+ot_data.minutes > 0) {
          const data = {
            AttendanceTransID: null,
            UserMasterID: userMasterID,
            OverTimeDate: ot_data.date,
            OverTimeIn: null,
            OverTimeOut: null,
            OverTimeHourAndMin: ot_data.minutes,
            AttendancePolicyID: null,
            CompanyMasterID: companyId,
            createBy: createBy,
            createByIp: createByIp,
          };

          await overtimeauthorizationForAsopalav(data);
        }
      }

      // SRI VAISHNAVI RETAIL (INDIA) LLP

      if (companyId == 237) {
        const absentdata = ArrayData.find((e) => e.LeaveTranId == 1471); //leavetranid for absent

        const absent = absentdata ? +absentdata.AttnVal : 0;

        // paid leave incentive

        await addThreeDaysExtraAmount(
          userMasterID,
          yearMonth,
          absent,
          createBy,
          createByIp,
          end_date,
        );

        const branchId = branch?.branchID || '';

        if (!attendanceExecuted) {
          attendancedata = await getAttendanceData(
            userMasterID,
            start_date,
            end_date,
            false,
          );
        }

        // weekoff incentive

        await checkSundayPresentDoublesalary(
          attendancedata,
          userMasterID,
          start_date,
          end_date,
          branchId,
          yearMonth,
          createBy,
          createByIp,
        );

        // lunch break penalty

        await lunchBreakPenaltyForVaishnavi(
          attendancedata,
          end_date,
          createBy,
          createByIp,
        );
      }
    }

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.UpdateHrLeaveMonthlyTrans,
      data: {},
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

async function findBranchDepartDesig(start_date, userid) {
  const employeebranch = await employeeBranch(userid, start_date);

  let assignbranch;
  let branchid;
  if (employeebranch) {
    assignbranch = employeebranch['branchMaster.branchName'];
    branchid = employeebranch.branchID;
  } else {
    assignbranch = '';
    branchid = null;
  }

  const employeedepart = await employeeDepartment(userid, start_date);

  let assigndepart;
  let departid;
  if (employeedepart) {
    assigndepart = employeedepart['department.departmentName'];
    departid = employeedepart.departmentID;
  } else {
    assigndepart = '';
    departid = null;
  }

  const employeedesig = await employeeDesignation(userid, start_date);

  let assigndesig;
  let desigid;
  if (employeedesig) {
    assigndesig = employeedesig['designation.designationName'];
    desigid = employeedesig.designationID;
  } else {
    assigndesig = '';
    desigid = null;
  }

  let data = {
    branch: assignbranch,
    branchid: branchid,
    depart: assigndepart,
    departid: departid,
    desig: assigndesig,
    desigid: desigid,
  };

  return data;
}

exports.attendanceCalculation = async (req, res, next) => {
  try {
    const {
      month,
      leftdate,
      userMasterID,
      page,
      limit,
      attendanceStatus,
      salaryStatus,
      salarySlipStatus,
    } = await req.body;

    // ----- get previous month to next month -----------------

    const { startDate, endDate } = getStartAndEndDate(+month);

    let year, Month, monday;

    if (leftdate) {
      year = String(leftdate).slice(0, 4);
      Month = String(leftdate).slice(5, 7);
      monday = daysInMonth(Month, year);
    } else {
      year = String(+month).slice(0, 4);
      Month = String(+month).slice(4, 6);
      monday = daysInMonth(Month, year);
    }

    const enddate = year + '-' + Month + '-' + monday;
    // const paginateCondition = page && limit ? { offset: (page - 1) * limit, limit } : {};

    const hrleaveMonthlyTransCondition = ['0', '1'].includes(attendanceStatus)
      ? { AttnYearMon: month, verified: +attendanceStatus }
      : { AttnYearMon: month };

    const requiredLeave = ['0', '1'].includes(attendanceStatus);

    const salarySlipCondition = { salaryYYYYMM: month };
    if (salarySlipStatus)
      salarySlipCondition.salarySlipIssue = salarySlipStatus;
    if (salaryStatus == '2') salarySlipCondition.paid = true;

    if (salaryStatus == '3')
      salarySlipCondition.holdBy = { [Sequelize.Op.ne]: null };

    // Step 1: Pre-filter userMasterIDs based on salary status (MUCH FASTER)
    const getFilteredUserIDs = async () => {
      if (!salaryStatus || salaryStatus === '') {
        return userMasterID; // No filter needed
      }

      // Get users with/without salary in single query
      const salaryUserIDs = await executeQuery(`
    SELECT DISTINCT "userMasterID" 
    FROM "hrSalaryTrasactions" 
    WHERE "userMasterID" = ANY(ARRAY[${userMasterID.join(',')}])
    AND "salaryYYYYMM" = '${month}'
  `);

      const salaryUserSet = new Set(salaryUserIDs.map((r) => +r.userMasterID));

      if ([1, 2].includes(+salaryStatus)) {
        // Users WITH salary
        return userMasterID.filter((id) => salaryUserSet.has(id));
      } else if (salaryStatus === '0') {
        // Users WITHOUT salary
        return userMasterID.filter((id) => !salaryUserSet.has(id));
      }

      return userMasterID;
    };

    // Step 2: Pre-filter by salary slip if needed
    const getSlipFilteredUserIDs = async (filteredIDs) => {
      if (!salarySlipStatus && ![2, 3].includes(+salaryStatus)) {
        return filteredIDs;
      }

      if (filteredIDs.length === 0) return [];

      let slipQuery = `
    SELECT DISTINCT "userMasterID" 
    FROM "hrSalarySlips" 
    WHERE "userMasterID" = ANY(ARRAY[${filteredIDs.join(',')}])
    AND "salaryYYYYMM" = '${month}'
  `;

      if (salarySlipStatus) {
        slipQuery += ` AND "salarySlipIssue" = '${salarySlipStatus}'`;
      }
      if (salaryStatus === '2') {
        slipQuery += ` AND "paid" = true`;
      }

      if (salaryStatus === '3') {
        slipQuery += ` AND "holdBy" is not null`;
      }

      const slipUserIDs = await executeQuery(slipQuery);
      const slipUserSet = new Set(slipUserIDs.map((r) => +r.userMasterID));

      return filteredIDs.filter((id) => slipUserSet.has(id));
    };

    // Step 3: Pre-filter by attendance status if needed
    const getAttendanceFilteredUserIDs = async (filteredIDs) => {
      if (!requiredLeave || filteredIDs.length === 0) {
        return filteredIDs;
      }

      let attnQuery = `
    SELECT DISTINCT "userMasterID" 
    FROM "hrLeaveMonthlyTrans" 
    WHERE "userMasterID" = ANY(ARRAY[${filteredIDs.join(',')}])
    AND "AttnYearMon" = '${month}'
  `;

      if (['0', '1'].includes(attendanceStatus)) {
        attnQuery += ` AND "verified" = ${+attendanceStatus}`;
      }

      const attnUserIDs = await executeQuery(attnQuery);
      return attnUserIDs.map((r) => +r.userMasterID);
    };

    // Execute pre-filtering

    let filteredUserIDs = await getFilteredUserIDs();
    filteredUserIDs = await getSlipFilteredUserIDs(filteredUserIDs);
    filteredUserIDs = await getAttendanceFilteredUserIDs(filteredUserIDs);

    // Early return if no users match
    if (filteredUserIDs.length === 0) {
      return res.status(200).json({
        status: 200,
        data: [],
        totalcount: 0,
      });
    }

    const totalcount = filteredUserIDs.length;

    // Step 4: Apply pagination to filtered IDs
    const paginatedUserIDs =
      page && limit
        ? filteredUserIDs.slice((page - 1) * limit, page * limit)
        : filteredUserIDs;

    // Step 5: Build simplified include array (remove required conditions since pre-filtered)
    const includeArray = [
      // HrleaveMonthlyTrans
      {
        required: false,
        model: HrLeaveMonthlyTrans,
        where: hrleaveMonthlyTransCondition,
        attributes: [
          'AttnTranId',
          'LeaveTranId',
          'AttnVal',
          'userMasterID',
          'AttnYearMon',
          'monthstartdate',
          'monthenddate',
          'verified',
          'updateBy',
          'MonWorkDays',
          'MonDays',
          'updatedAt',
          'salaryCalAct',
        ],
        include: [
          {
            model: hrLeaveTypes,
            attributes: ['LeaveID'],
            include: [
              {
                model: HrLeaveMaster,
                as: 'LeaveMaster',
                attributes: ['LeaveName', 'LeaveDesc'],
              },
            ],
          },
          {
            model: UserMaster,
            as: 'updatedBy',
            attributes: ['displayName'],
          },
        ],
      },
      //Employee joining
      {
        model: EmployeeJoiningDetails,
        attributes: [
          'employeeCode',
          'dob',
          'joiningDate',
          'leavingDate',
          'salaryCalculationAct',
          'fullMonthPresence',
        ],
      },
      // salary policy
      {
        required: false,
        model: employeeSalaryPolicies,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(enddate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(enddate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: ['salaryPolicyID'],
        include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
      },
      // designation
      {
        model: EmployeeDesignation,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(startDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['designationID', 'applicableDate', 'endDate'],
        include: [
          {
            model: Designation,
            as: 'designation',
            attributes: ['designationName', 'designationId'],
          },
        ],
      },
      // department
      {
        model: EmployeeDepartment,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(startDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['departmentID', 'applicableDate', 'endDate'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentName', 'departmentId'],
          },
        ],
      },
      // branch
      {
        model: EmployeeBranch,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(startDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['branchID', 'applicableDate', 'endDate'],
        include: [
          {
            model: BranchMaster,
            as: 'branchMaster',
            attributes: ['branchName', 'branchMasterID'],
          },
        ],
      },
      //attendance policy
      {
        model: EmployeeAttendancePolicy,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(endDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(startDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['attendancePolicyID', 'startDate', 'endDate'],
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
              'cofffullday',
              'coffhalfday',
              ['coffOneAndHalfDay', 'coffOneHalf'],
              'coffTwoFullDay',
              'holidayCoff',
              ['holidayCoffHalfDay', 'h_halfDay'],
              ['holidayCoffFullDay', 'h_fullDay'],
              ['holidayCoffOneHalfDay', 'h_oneHalf'],
              ['holidayCoffTwoDay', 'h_twoDay'],
              'isAddlPaidDay',
            ],
          },
        ],
      },
      // weekoff policy
      {
        model: EmployeeWeekOff,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(startDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['weekOffPolicyID', 'applicableDate', 'endDate'],
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
            include: [
              {
                model: PHWeekOffPolicySlab,
                as: 'PHWS',
                attributes: ['minPresentDays', 'weekOffCount'],
              },
            ],
          },
        ],
      },
      // employee shift
      {
        required: false,
        model: EmployeeShift,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(endDate) },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(endDate) },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        attributes: ['shiftsID'],
      },
      // coffmaster
      // {
      //   required: false,
      //   model: coffMaster,
      //   where: { YearMM: month, From: 'AC' },
      //   attributes: ['YearMM', 'LeaveAddNew'],
      // },
      // salary policy
      {
        required: false,
        model: EmployeeLateEarlyPolicy,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(endDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(startDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: ['lateEarlyPolicyMasterID', 'startDate', 'endDate'],
        include: [
          {
            model: LateEarlyPolicy,
            as: 'lateEarlyPolicy',
            attributes: ['lateEarlyPolicyType', 'deductFrom'],
          },
        ],
      },
      // lceg penalty
      {
        required: false,
        model: LCEGPenalty,
        where: { YYYYMM: month },
        attributes: ['userMasterID', 'YYYYMM', 'penaltyType', 'penaltyValue'],
      },
      // salary slip
      {
        required: false,
        model: HRSalarySlip,
        where: salarySlipCondition,
        attributes: [
          'salaryYYYYMM',
          'salarySlipIssue',
          'paid',
          'paidDate',
          'holdBy',
          'holdAt',
        ],
        include: [
          {
            model: UserMaster,
            as: 'salaryHoldBy',
            attributes: ['displayName'],
          },
        ],
      },
      // user documents
      {
        required: false,
        model: UserDocument,
        where: {
          status: 1,
          verifyStatus: 1,
        },
        attributes: ['expiryDate', 'documentListID'],
      },
    ];

    // Step 6: Execute main query with pre-filtered and paginated IDs
    const usermaster = await UserMaster.findAll({
      where: {
        userMasterID: { [Sequelize.Op.in]: paginatedUserIDs },
        status: [0, 1],
      },
      include: includeArray,
      attributes: [
        'userMasterID',
        'firstName',
        'lastName',
        'displayName',
        'userNumber',
        'photo',
        'companyMasterId',
        'gender',
        'isFNF',
        'fnfMonth',
      ],
      order: [['displayName', 'ASC']],
    });

    if (usermaster.length === 0)
      return res
        .status(200)
        .json({ status: 200, data: [], totalcount: totalcount });

    const companyId = usermaster[0].companyMasterId;

    const AllHrLeaveTypes = await HrLeaveTypes.findAll({
      where: {
        companyMasterID: companyId,
        status: 1,
        LeaveID: {
          [Sequelize.Op.ne]: 34,
        },
      },
      include: [
        {
          model: HrLeaveMaster,
          as: 'LeaveMaster',
          attributes: ['LeaveName', 'LeaveDesc'],
        },
      ],
      order: [['LeaveTranId', 'ASC']],
    });

    const result = await attendanceCalculationLatest(
      usermaster,
      month,
      AllHrLeaveTypes,
      req,
      'all',
      false,
      null,
    );

    // const finaldata1 = [];

    // for (let i = 0; i < usermaster.length; i++) {
    //   const calculatedAttendance = await attendanceCalculation1(
    //     usermaster[i],
    //     month,
    //     leftdate,
    //     AllHrLeaveTypes,
    //   );

    //   finaldata1.push(calculatedAttendance[0]);
    // }

    // const unverifiedData = finaldata1.filter((e) => e.verified == 0);

    // const userIds = [];
    // const toAddData = [];
    // const toAddLCEGPenaltyData = [];

    // for (const data of unverifiedData) {
    //   userIds.push(data.userMasterID);

    //   // for penalty

    //   for (const penalty of data.penaltyArray) {
    //     toAddLCEGPenaltyData.push({
    //       userMasterID: data.userMasterID,
    //       YYYYMM: +data.yearMonth,
    //       penaltyType: penalty.penaltyType,
    //       penaltyValue: penalty.values,
    //     });
    //   }

    //   // for leave types
    //   for (let m = 0; m < data.user_leave.length; m++) {
    //     toAddData.push({
    //       userMasterID: data.userMasterID,
    //       LeaveTranId: data.user_leave[m].leavetranid,
    //       AttnYearMon: data.yearMonth,
    //       MonDays: data.MonDays,
    //       MonWorkDays: data.WorkingDays,
    //       AttnVal: data.user_leave[m].values,
    //       monthstartdate: data.start_date,
    //       monthenddate: data.end_date,
    //       branchID: data.branchid,
    //       departmentID: data.departid,
    //       designationID: data.desigid,
    //       createBy: createBy,
    //       createByIp: createByIp,
    //     });
    //   }
    // }

    // //delete data

    // await sequelize.transaction(async (t) => {
    //   await HrLeaveMonthlyTrans.destroy({
    //     where: {
    //       userMasterID: {
    //         [Sequelize.Op.in]: userIds,
    //       },
    //       AttnYearMon: month,
    //     },
    //     transaction: t,
    //   });

    //   await LCEGPenalty.destroy({
    //     where: {
    //       userMasterID: {
    //         [Sequelize.Op.in]: userIds,
    //       },
    //       YYYYMM: month,
    //     },
    //     transaction: t,
    //   });

    //   await HrLeaveMonthlyTrans.bulkCreate(toAddData, { transaction: t });
    //   await LCEGPenalty.bulkCreate(toAddLCEGPenaltyData, {
    //     individualHooks: true,
    //     user: req.userDetails,
    //     transaction: t,
    //   });
    // });

    return res
      .status(200)
      .json({ status: 200, data: result.allData, totalcount: totalcount });
  } catch (err) {
    next(err);
  }
};

/**
 * Streaming version of attendance calculation API
 * Uses Server-Sent Events (SSE) to stream progress updates to the frontend
 */
exports.attendanceCalculationStream = async (req, res, next) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  try {
    const {
      month,
      leftdate,
      userMasterID,
      page,
      limit,
      attendanceStatus,
      salaryStatus,
      salarySlipStatus,
    } = req.body;

    // Send initial progress
    sendEvent(
      'progress',
      {
        phase: 'filtering',
        message: 'Filtering users based on criteria...',
        progress: 5,
        total: userMasterID?.length || 0,
      },
      res,
    );

    const { startDate, endDate } = getStartAndEndDate(+month);

    let year, Month, monday;
    if (leftdate) {
      year = String(leftdate).slice(0, 4);
      Month = String(leftdate).slice(5, 7);
      monday = daysInMonth(Month, year);
    } else {
      year = String(+month).slice(0, 4);
      Month = String(+month).slice(4, 6);
      monday = daysInMonth(Month, year);
    }

    const enddate = year + '-' + Month + '-' + monday;

    const hrleaveMonthlyTransCondition = ['0', '1'].includes(attendanceStatus)
      ? { AttnYearMon: month, verified: +attendanceStatus }
      : { AttnYearMon: month };

    const requiredLeave = ['0', '1'].includes(attendanceStatus);

    const salarySlipCondition = { salaryYYYYMM: month };
    if (salarySlipStatus)
      salarySlipCondition.salarySlipIssue = salarySlipStatus;
    if (salaryStatus == '2') salarySlipCondition.paid = true;
    if (salaryStatus == '3')
      salarySlipCondition.holdBy = { [Sequelize.Op.ne]: null };

    // Pre-filtering functions
    const getFilteredUserIDs = async () => {
      if (!salaryStatus || salaryStatus === '') return userMasterID;

      const salaryUserIDs = await executeQuery(`
        SELECT DISTINCT "userMasterID" 
        FROM "hrSalaryTrasactions" 
        WHERE "userMasterID" = ANY(ARRAY[${userMasterID.join(',')}])
        AND "salaryYYYYMM" = '${month}'
      `);

      const salaryUserSet = new Set(salaryUserIDs.map((r) => +r.userMasterID));

      if ([1, 2].includes(+salaryStatus)) {
        return userMasterID.filter((id) => salaryUserSet.has(id));
      } else if (salaryStatus === '0') {
        return userMasterID.filter((id) => !salaryUserSet.has(id));
      }
      return userMasterID;
    };

    const getSlipFilteredUserIDs = async (filteredIDs) => {
      if (!salarySlipStatus && ![2, 3].includes(+salaryStatus))
        return filteredIDs;
      if (filteredIDs.length === 0) return [];

      let slipQuery = `
        SELECT DISTINCT "userMasterID" 
        FROM "hrSalarySlips" 
        WHERE "userMasterID" = ANY(ARRAY[${filteredIDs.join(',')}])
        AND "salaryYYYYMM" = '${month}'
      `;

      if (salarySlipStatus)
        slipQuery += ` AND "salarySlipIssue" = '${salarySlipStatus}'`;
      if (salaryStatus === '2') slipQuery += ` AND "paid" = true`;
      if (salaryStatus === '3') slipQuery += ` AND "holdBy" is not null`;

      const slipUserIDs = await executeQuery(slipQuery);
      const slipUserSet = new Set(slipUserIDs.map((r) => +r.userMasterID));
      return filteredIDs.filter((id) => slipUserSet.has(id));
    };

    const getAttendanceFilteredUserIDs = async (filteredIDs) => {
      if (!requiredLeave || filteredIDs.length === 0) return filteredIDs;

      let attnQuery = `
        SELECT DISTINCT "userMasterID" 
        FROM "hrLeaveMonthlyTrans" 
        WHERE "userMasterID" = ANY(ARRAY[${filteredIDs.join(',')}])
        AND "AttnYearMon" = '${month}'
      `;

      if (['0', '1'].includes(attendanceStatus)) {
        attnQuery += ` AND "verified" = ${+attendanceStatus}`;
      }

      const attnUserIDs = await executeQuery(attnQuery);
      return attnUserIDs.map((r) => +r.userMasterID);
    };

    sendEvent(
      'progress',
      {
        phase: 'filtering',
        message: 'Applying salary filters...',
        progress: 10,
      },
      res,
    );

    let filteredUserIDs = await getFilteredUserIDs();

    sendEvent(
      'progress',
      {
        phase: 'filtering',
        message: 'Applying salary slip filters...',
        progress: 15,
      },
      res,
    );

    filteredUserIDs = await getSlipFilteredUserIDs(filteredUserIDs);

    sendEvent(
      'progress',
      {
        phase: 'filtering',
        message: 'Applying attendance filters...',
        progress: 20,
      },
      res,
    );

    filteredUserIDs = await getAttendanceFilteredUserIDs(filteredUserIDs);

    if (filteredUserIDs.length === 0) {
      sendEvent('complete', { status: 200, data: [], totalcount: 0 }, res);
      return res.end();
    }

    const totalcount = filteredUserIDs.length;
    const paginatedUserIDs =
      page && limit
        ? filteredUserIDs.slice((page - 1) * limit, page * limit)
        : filteredUserIDs;

    // Send init event with totalcount for pagination
    sendEvent(
      'init',
      {
        totalcount: totalcount,
        pageCount: paginatedUserIDs.length,
      },
      res,
    );

    sendEvent(
      'progress',
      {
        phase: 'fetching',
        message: `Fetching data for ${paginatedUserIDs.length} employees...`,
        progress: 25,
        total: paginatedUserIDs.length,
      },
      res,
    );

    // Build include array (same as original)
    const includeArray = [
      // HrleaveMonthlyTrans
      {
        required: false,
        model: HrLeaveMonthlyTrans,
        where: hrleaveMonthlyTransCondition,
        attributes: [
          'AttnTranId',
          'LeaveTranId',
          'AttnVal',
          'userMasterID',
          'AttnYearMon',
          'monthstartdate',
          'monthenddate',
          'verified',
          'updateBy',
          'MonWorkDays',
          'MonDays',
          'updatedAt',
          'salaryCalAct',
        ],
        include: [
          {
            model: hrLeaveTypes,
            attributes: ['LeaveID'],
            include: [
              {
                model: HrLeaveMaster,
                as: 'LeaveMaster',
                attributes: ['LeaveName', 'LeaveDesc'],
              },
            ],
          },
          {
            model: UserMaster,
            as: 'updatedBy',
            attributes: ['displayName'],
          },
        ],
      },
      //Employee joining
      {
        model: EmployeeJoiningDetails,
        attributes: [
          'employeeCode',
          'dob',
          'joiningDate',
          'leavingDate',
          'salaryCalculationAct',
          'fullMonthPresence',
        ],
      },
      // salary policy
      {
        required: false,
        model: employeeSalaryPolicies,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(enddate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(enddate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: ['salaryPolicyID'],
        include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
      },
      // designation
      {
        model: EmployeeDesignation,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(startDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['designationID', 'applicableDate', 'endDate'],
        include: [
          {
            model: Designation,
            as: 'designation',
            attributes: ['designationName', 'designationId'],
          },
        ],
      },
      // department
      {
        model: EmployeeDepartment,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(startDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['departmentID', 'applicableDate', 'endDate'],
        include: [
          {
            model: Department,
            as: 'department',
            attributes: ['departmentName', 'departmentId'],
          },
        ],
      },
      // branch
      {
        model: EmployeeBranch,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(startDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['branchID', 'applicableDate', 'endDate'],
        include: [
          {
            model: BranchMaster,
            as: 'branchMaster',
            attributes: ['branchName', 'branchMasterID'],
          },
        ],
      },
      //attendance policy
      {
        model: EmployeeAttendancePolicy,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(endDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(startDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['attendancePolicyID', 'startDate', 'endDate'],
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
              'cofffullday',
              'coffhalfday',
              ['coffOneAndHalfDay', 'coffOneHalf'],
              'coffTwoFullDay',
              'holidayCoff',
              ['holidayCoffHalfDay', 'h_halfDay'],
              ['holidayCoffFullDay', 'h_fullDay'],
              ['holidayCoffOneHalfDay', 'h_oneHalf'],
              ['holidayCoffTwoDay', 'h_twoDay'],
              'isAddlPaidDay',
            ],
          },
        ],
      },
      // weekoff policy
      {
        model: EmployeeWeekOff,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(startDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['weekOffPolicyID', 'applicableDate', 'endDate'],
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
            include: [
              {
                model: PHWeekOffPolicySlab,
                as: 'PHWS',
                attributes: ['minPresentDays', 'weekOffCount'],
              },
            ],
          },
        ],
      },
      // employee shift
      {
        required: false,
        model: EmployeeShift,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(endDate) },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(endDate) },
            },
            {
              endDate: { [Sequelize.Op.eq]: null },
            },
          ],
        },
        attributes: ['shiftsID'],
      },
      // salary policy
      {
        required: false,
        model: EmployeeLateEarlyPolicy,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(endDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(startDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: ['lateEarlyPolicyMasterID', 'startDate', 'endDate'],
        include: [
          {
            model: LateEarlyPolicy,
            as: 'lateEarlyPolicy',
            attributes: ['lateEarlyPolicyType', 'deductFrom'],
          },
        ],
      },
      // lceg penalty
      {
        required: false,
        model: LCEGPenalty,
        where: { YYYYMM: month },
        attributes: ['userMasterID', 'YYYYMM', 'penaltyType', 'penaltyValue'],
      },
      // salary slip
      {
        required: false,
        model: HRSalarySlip,
        where: salarySlipCondition,
        attributes: [
          'salaryYYYYMM',
          'salarySlipIssue',
          'paid',
          'paidDate',
          'holdBy',
          'holdAt',
        ],
        include: [
          {
            model: UserMaster,
            as: 'salaryHoldBy',
            attributes: ['displayName'],
          },
        ],
      },
      // user documents
      {
        required: false,
        model: UserDocument,
        where: {
          status: 1,
          verifyStatus: 1,
        },
        attributes: ['expiryDate', 'documentListID'],
      },
    ];

    const usermaster = await UserMaster.findAll({
      where: {
        userMasterID: { [Sequelize.Op.in]: paginatedUserIDs },
        status: [0, 1],
      },
      include: includeArray,
      attributes: [
        'userMasterID',
        'firstName',
        'lastName',
        'displayName',
        'userNumber',
        'photo',
        'companyMasterId',
        'gender',
        'isFNF',
        'fnfMonth',
      ],
      order: [['displayName', 'ASC']],
    });

    if (usermaster.length === 0) {
      sendEvent(
        'complete',
        { status: 200, data: [], totalcount: totalcount },
        res,
      );
      return res.end();
    }
    sendEvent(
      'totalcount',
      { status: 200, data: [], totalcount: totalcount },
      res,
    );

    sendEvent(
      'progress',
      {
        phase: 'fetching',
        message: 'Loading leave types...',
        progress: 30,
      },
      res,
    );

    const companyId = usermaster[0].companyMasterId;
    const AllHrLeaveTypes = await HrLeaveTypes.findAll({
      where: {
        companyMasterID: companyId,
        status: 1,
        LeaveID: { [Sequelize.Op.ne]: 34 },
      },
      include: [
        {
          model: HrLeaveMaster,
          as: 'LeaveMaster',
          attributes: ['LeaveName', 'LeaveDesc'],
        },
      ],
      order: [['LeaveTranId', 'ASC']],
    });

    // const finaldata1 = [];
    // const baseProgress = 30;
    // const calculationProgressRange = 70; // 30% to 100%

    const result = await attendanceCalculationLatest(
      usermaster,
      month,
      AllHrLeaveTypes,
      req,
      'all',
      true,
      res,
    );

    // // Calculate attendance for each user with progress updates
    // for (let i = 0; i < usermaster.length; i++) {
    //   const calculatedAttendance = await attendanceCalculation1(
    //     usermaster[i],
    //     month,
    //     leftdate,
    //     AllHrLeaveTypes,
    //   );

    //   finaldata1.push(calculatedAttendance[0]);

    //   const currentProgress = baseProgress +
    //     Math.round(((i + 1) / usermaster.length) * calculationProgressRange);

    //   // Send progress update
    //   sendEvent('progress', {
    //     phase: 'calculating',
    //     message: `Calculating: ${usermaster[i].displayName}`,
    //     current: i + 1,
    //     total: usermaster.length,
    //     progress: currentProgress,
    //     currentUser: {
    //       userMasterID: usermaster[i].userMasterID,
    //       displayName: usermaster[i].displayName
    //     }
    //   });

    //   // Send individual user data
    //   sendEvent('user-data', {
    //     index: i,
    //     data: calculatedAttendance[0]
    //   });
    // }

    // sendEvent('progress', {
    //   phase: 'saving',
    //   message: 'Saving attendance records...',
    //   progress: 92
    // });

    // // Process and save unverified data
    // const unverifiedData = finaldata1.filter((e) => e.verified == 0);
    // const userIds = [];
    // const toAddData = [];
    // const toAddLCEGPenaltyData = [];

    // for (const data of unverifiedData) {
    //   userIds.push(data.userMasterID);

    //   for (const penalty of data.penaltyArray) {
    //     toAddLCEGPenaltyData.push({
    //       userMasterID: data.userMasterID,
    //       YYYYMM: +data.yearMonth,
    //       penaltyType: penalty.penaltyType,
    //       penaltyValue: penalty.values,
    //     });
    //   }

    //   for (let m = 0; m < data.user_leave.length; m++) {
    //     toAddData.push({
    //       userMasterID: data.userMasterID,
    //       LeaveTranId: data.user_leave[m].leavetranid,
    //       AttnYearMon: data.yearMonth,
    //       MonDays: data.MonDays,
    //       MonWorkDays: data.WorkingDays,
    //       AttnVal: data.user_leave[m].values,
    //       monthstartdate: data.start_date,
    //       monthenddate: data.end_date,
    //       branchID: data.branchid,
    //       departmentID: data.departid,
    //       designationID: data.desigid,
    //       createBy: createBy,
    //       createByIp: createByIp,
    //     });
    //   }
    // }

    // sendEvent('progress', {
    //   phase: 'saving',
    //   message: 'Finalizing database updates...',
    //   progress: 95
    // });

    // if (userIds.length > 0) {
    //   await sequelize.transaction(async (t) => {
    //     await HrLeaveMonthlyTrans.destroy({
    //       where: {
    //         userMasterID: { [Sequelize.Op.in]: userIds },
    //         AttnYearMon: month,
    //       },
    //       transaction: t,
    //     });

    //     await LCEGPenalty.destroy({
    //       where: {
    //         userMasterID: { [Sequelize.Op.in]: userIds },
    //         YYYYMM: month,
    //       },
    //       transaction: t,
    //     });

    //     await HrLeaveMonthlyTrans.bulkCreate(toAddData, { transaction: t });
    //     await LCEGPenalty.bulkCreate(toAddLCEGPenaltyData, {
    //       individualHooks: true,
    //       user: req.userDetails,
    //       transaction: t,
    //     });
    //   });
    // }

    sendEvent(
      'complete',
      {
        status: 200,
        data: result.allData,
        totalcount: totalcount,
        message: 'Attendance calculation completed successfully',
      },
      res,
    );

    // Small delay to ensure the complete event is flushed before closing
    await new Promise((resolve) => setTimeout(resolve, 100));
    res.end();
  } catch (err) {
    sendEvent(
      'error',
      {
        status: 500,
        message: err.message || 'An error occurred during calculation',
      },
      res,
    );
    res.end();
  }
};

async function overtimeauthorization(data) {
  let authorizationmaster = await AuthorizationMaster.findOne({
    where: { authorizationMasterName: 'Overtime' },
  });
  let authorizationdetails = await AuthorizationDetails.findOne({
    where: {
      AuthorizationMasterID: authorizationmaster.authorizationMasterID,
      userMasterID: data.UserMasterID,
      status: 1,
    },
    raw: true,
  });

  let find_overtime = await overTimeCalculation.findOne({
    where: {
      UserMasterID: data.UserMasterID,
      OverTimeDate: data.OverTimeDate,
      AttendanceTransID: null,
    },
  });

  if (find_overtime) {
    let db_status = await overTimeCalculation.update(
      {
        OverTimeIn: data.OverTimeIn,
        OverTimeOut: data.OverTimeOut,
        OverTimeHourAndMin: Math.round(+data.OverTimeHourAndMin),
      },
      {
        where: {
          UserMasterID: data.UserMasterID,
          OverTimeDate: data.OverTimeDate,
        },
      },
    );
  } else {
    if (authorizationdetails) {
      let AuthorizationCriterias = await AuthorizationCriteria.findOne({
        where: {
          AuthorizationCriteriaID: authorizationdetails.AuthorizationCriteriaID,
          status: 1,
        },
        raw: true,
      });

      if (AuthorizationCriterias.AuthorizationCriteria == 'Sequeance No') {
        let result = await sequelize.transaction(async (t) => {
          let db_status = await overTimeCalculation.create(
            {
              AttendanceTransID: data.AttendanceTransID,
              UserMasterID: data.UserMasterID,
              OverTimeDate: data.OverTimeDate,
              OverTimeIn: data.OverTimeIn,
              OverTimeOut: data.OverTimeOut,
              OverTimeHourAndMin: Math.round(+data.OverTimeHourAndMin),
              AttendancePolicyID: data.AttendancePolicyID,
              AuthorizationRequired: 2,
              CompanyMasterID: data.CompanyMasterID,
              createBy: data.createBy,
              createByIp: data.createByIp,
            },
            { transaction: t },
          );
          let insert_db_status1 = await OvertimeAuthorizationRequest.create(
            {
              ReferenceID: db_status.OverTimeID,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
              status: 1,
              authstatus: 2,
              createBy: data.createBy,
              createByIp: data.createByIp,
            },
            { transaction: t },
          );

          return db_status;
        });
      } else {
        let result = await sequelize.transaction(async (t) => {
          let db_status = await overTimeCalculation.create(
            {
              AttendanceTransID: data.AttendanceTransID,
              UserMasterID: data.UserMasterID,
              OverTimeDate: data.OverTimeDate,
              OverTimeIn: data.OverTimeIn,
              OverTimeOut: data.OverTimeOut,
              OverTimeHourAndMin: Math.round(+data.OverTimeHourAndMin),
              AttendancePolicyID: data.AttendancePolicyID,
              CompanyMasterID: data.CompanyMasterID,
              AuthorizationRequired: 1,
              createBy: data.createBy,
              createByIp: data.createByIp,
            },
            { transaction: t },
          );
          for (
            var i = 0;
            i < authorizationdetails.AuthorizedByUserMasterId.length;
            i++
          ) {
            let insert_db_status1 = await OvertimeAuthorizationRequest.create(
              {
                ReferenceID: db_status.OverTimeID,
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[i],
                status: 1,
                authstatus: 2,
                createBy: data.createBy,
                createByIp: data.createByIp,
              },
              { transaction: t },
            );
          }
        });
      }
    } else {
      let result = await sequelize.transaction(async (t) => {
        let db_status = await overTimeCalculation.create(
          {
            AttendanceTransID: data.AttendanceTransID,
            UserMasterID: data.UserMasterID,
            OverTimeDate: data.OverTimeDate,
            OverTimeIn: data.OverTimeIn,
            OverTimeOut: data.OverTimeOut,
            AuthorizationRequired: 0,
            OverTimeHourAndMin: Math.round(+data.OverTimeHourAndMin),
            AttendancePolicyID: data.AttendancePolicyID,
            CompanyMasterID: data.CompanyMasterID,
            createBy: data.createBy,
            createByIp: data.createByIp,
          },
          { transaction: t },
        );

        return db_status;
      });
    }
  }
}

exports.verifyAllAttendanceCalcution = async (req, res, next) => {
  try {
    let { companyMasterID, userMasterID, yearMonth, leftdate } = await req.body;

    userMasterID = Array.isArray(userMasterID) ? userMasterID : [userMasterID];

    const updateBy = req.userDetails?.userMasterId || null;
    const updateByIp = req.userDetails?.userIpAddress || null;

    const mondayTemp = daysInMonth(
      yearMonth.slice(4, 6),
      yearMonth.slice(0, 4),
    );

    const enddate =
      yearMonth.slice(0, 4) + '-' + yearMonth.slice(4, 6) + '-' + mondayTemp;

    const { startDate, endDate } = getStartAndEndDate(+yearMonth);

    // ------------- biometric integration ----------

    const biometricIntegrationData = await biometricIntegration.findOne({
      where: {
        companyMasterID,
        status: 1,
      },
    });

    const canteenDetailIds =
      biometricIntegrationData?.canteenDetailsId?.filter((e) => e) || [];

    const [AllHrLeaveTypes, canteenPenaltyType, allCanteenMealsData] =
      await Promise.all([
        HrLeaveTypes.findAll({
          where: {
            companyMasterID: companyMasterID,
            status: 1,
          },
          include: [
            {
              model: HrLeaveMaster,
              as: 'LeaveMaster',
              attributes: ['LeaveName'],
            },
          ],
          order: [['LeaveTranId', 'ASC']],
        }),
        Penalty.findOne({
          where: {
            companyMasterID,
            penaltyName: defaultPenaltyNames.CANTEEN,
            isDefault: true,
            status: 1,
          },
        }),
        CanteenMeals.findAll({
          raw: true,
          where: {
            canteenDetailsId: canteenDetailIds,
            status: 1,
          },
        }),
      ]);

    const NegativeValue_UserName = [];

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const [usermaster, AllUserSalary, AllLeavePolicyData, allCoffData] =
      await Promise.all([
        UserMaster.findAll({
          where: {
            ...where,
            userMasterID: userMasterID,
          },
          include: [
            ...includeModels,
            {
              model: EmployeeJoiningDetails,
            },
            {
              required: false,
              model: HrLeaveMonthlyTrans,
              where: { AttnYearMon: yearMonth },
              attributes: [
                'AttnTranId',
                'LeaveTranId',
                'AttnVal',
                'userMasterID',
                'AttnYearMon',
                'monthstartdate',
                'monthenddate',
                'verified',
                'updateBy',
              ],
              include: [
                {
                  model: hrLeaveTypes,
                  attributes: ['LeaveID'],
                  include: [
                    {
                      model: HrLeaveMaster,
                      as: 'LeaveMaster',
                      attributes: ['LeaveName', 'LeaveDesc'],
                    },
                  ],
                },
              ],
            },
            {
              required: false,
              model: employeeSalaryPolicies,
              where: {
                status: 1,
                startDate: {
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
              attributes: ['salaryPolicyID', 'startDate', 'endDate'],
              include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
            },
            {
              model: EmployeeAttendancePolicy,
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: new Date(endDate) },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(startDate) },
                  },
                  {
                    endDate: { [Sequelize.Op.eq]: null },
                  },
                ],
              },
              required: false,
              attributes: ['attendancePolicyID', 'startDate', 'endDate'],
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
                    'coff',
                    'overtimeEntryAfterMin',
                    'isWHAbsentRule',
                    'cofffullday',
                    'coffhalfday',
                    ['coffOneAndHalfDay', 'coffOneHalf'],
                    'coffTwoFullDay',
                    'holidayCoff',
                    ['holidayCoffHalfDay', 'h_halfDay'],
                    ['holidayCoffFullDay', 'h_fullDay'],
                    ['holidayCoffOneHalfDay', 'h_oneHalf'],
                    ['holidayCoffTwoDay', 'h_twoDay'],
                    'isAddlPaidDay',
                  ],
                },
              ],
            },

            // weeoffPolicy
            {
              model: EmployeeWeekOff,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(startDate) },
                  },
                  {
                    endDate: { [Sequelize.Op.eq]: null },
                  },
                ],
              },
              required: false,
              attributes: ['weekOffPolicyID', 'applicableDate', 'endDate'],
              include: [
                {
                  model: weekOffPolicy,
                  as: 'weekoff',
                  include: [
                    {
                      model: PHWeekOffPolicySlab,
                      as: 'PHWS',
                      attributes: ['minPresentDays', 'weekOffCount'],
                    },
                  ],
                },
              ],
            },
            // LCEG Policy
            {
              required: false,
              model: EmployeeLateEarlyPolicy,
              where: {
                status: 1,
                startDate: { [Sequelize.Op.lte]: new Date(endDate) },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(startDate) },
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
            // LCEG Penalty
            {
              required: false,
              model: LCEGPenalty,
              where: {
                YYYYMM: yearMonth,
              },
            },

            // branch
            {
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(startDate) },
                  },
                  {
                    endDate: { [Sequelize.Op.eq]: null },
                  },
                ],
              },
              required: false,
              attributes: ['branchID', 'applicableDate', 'endDate'],
            },
            // employee attendance bonus policy
            {
              separate: true,
              required: false,
              model: EmployeeAttendanceBonusPolicy,
              where: {
                status: 1,
                startDate: {
                  [Sequelize.Op.lte]: endDate,
                },

                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.is]: null } },
                  { endDate: { [Sequelize.Op.gte]: startDate } },
                ],
              },
              include: [
                {
                  model: AttendanceBonusPolicy,
                },
              ],
            },
            // employee leave policy
            {
              required: false,
              model: empLeavePolicy,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: endDate,
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: startDate,
                    },
                  },
                  {
                    endDate: {
                      [Sequelize.Op.is]: null,
                    },
                  },
                ],
              },
            },

            // employee Resignation
            {
              required: false,
              model: EmployeeResignation,
              as: 'employee',
              where: {
                authorizationstatus: {
                  [Sequelize.Op.in]: [0, 1, 2, 3],
                },
                status: 1,
              },
            },

            // employee Employeements

            {
              required: false,
              model: EmployeeEmployeement,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(endDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(startDate),
                    },
                  },
                  {
                    endDate: {
                      [Sequelize.Op.is]: null,
                    },
                  },
                ],
              },
              attributes: [
                'userMasterID',
                'employeement',
                'applicableDate',
                'endDate',
              ],
            },

            // food allowance policy
            {
              required: false,
              model: EmployeeFoodAllowancePolicy,
              as: 'empFAP',
              where: {
                status: 1,
                startDate: {
                  [Sequelize.Op.lte]: endDate,
                },

                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.is]: null } },
                  { endDate: { [Sequelize.Op.gte]: startDate } },
                ],
              },
              attributes: ['startDate', 'endDate', 'foodAllowancePolicyId'],
              include: [
                {
                  model: FoodAllowancePolicy,
                  attributes: ['foodAllowanceType', 'workingTimeAmount'],
                },
              ],
            },

            // canteen logs
            {
              required: false,
              model: CanteenLogs,
              where: {
                [Sequelize.Op.and]: [
                  Sequelize.where(
                    Sequelize.fn('DATE', Sequelize.col('logDateTime')),
                    '>=',
                    startDate,
                  ),
                  Sequelize.where(
                    Sequelize.fn('DATE', Sequelize.col('logDateTime')),
                    '<=',
                    endDate,
                  ),
                ],
              },
              include: { model: EmployeePenalty },
            },
          ],
        }),
        HRSalaryTrasaction.findAll({
          raw: true,
          where: {
            userMasterID: userMasterID,
            salaryYYYYMM: yearMonth,
          },
        }),
        employeeLeavePolicy.findAll({
          where: {
            companyMasterId: companyMasterID,
          },
          attributes: [
            'id',
            'leaveId',
            'autoAdjustedPriority',
            'isAutoAdjusted',
            'leaveOperationalYear',
            'allowHalfDays',
            'allowMaxInMonth',
            'allowMaxInQuarter',
            'allowMaxInHalfYear',
            'allowMaxInYear',
            'leaveOnNoticePeriod',
            'leaveOnProbation',
            'probationDays',
            'presentDays',
            'expiryDays',
          ],
          order: [['autoAdjustedPriority', 'ASC']],
        }),
        coffMaster.findAll({
          where: {
            userMasterID: {
              [Sequelize.Op.in]: userMasterID,
            },
            YearMM: yearMonth,
            From: 'AC',
          },
          include: [
            {
              model: HrLeaveBalance,
              include: [{ model: UsedCoffTransaction }],
            },
          ],
        }),
      ]);

    let attBonus_ExtraDays = [];

    if (usermaster.length) {
      attBonus_ExtraDays = await Incentivetype.findAll({
        raw: true,
        where: Sequelize.and(
          Sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('incentivetypename')),
            ),
            {
              [Sequelize.Op.in]: [
                'attendance bonus',
                'extra days',
                'food allowance',
              ],
            },
          ),
          Sequelize.where(
            sequelize.col('companyMasterID'),
            usermaster[0].companyMasterId,
          ),
          Sequelize.or(
            Sequelize.where(sequelize.col('status'), 0),
            Sequelize.where(sequelize.col('status'), 1),
          ),
        ),
      });
    }

    for (let i = 0; i < usermaster.length; i++) {
      const companyId = usermaster[i].companyMasterId;

      const find_salary = AllUserSalary.find(
        (e) =>
          e.userMasterID == usermaster[i].userMasterID &&
          e.salaryYYYYMM == yearMonth,
      );

      if (find_salary) continue;

      const verifiedData = (usermaster[i].hrLeaveMonthlyTrans || []).find(
        (e) => e.verified == 1,
      );

      if (verifiedData) continue;

      const empjoing = usermaster[i].employeeJoiningDetails?.[0] || null;

      const salaryCalAct = empjoing?.salaryCalculationAct || null;

      const attendancedataCal = await attendanceCalculation1(
        usermaster[i],
        yearMonth,
        leftdate,
        AllHrLeaveTypes,
      );

      // -------------------  add calculation here ----------------------

      const holidayExtraDays = attendancedataCal[0]?.holidayExtraDays || 0;

      const unverifiedData = attendancedataCal.filter(
        (e) => e.verified == 0 || e.left || e.notJoin,
      );

      // if already verified
      if (!unverifiedData.length) continue;

      // left or not join employee
      if (unverifiedData?.[0]?.left || unverifiedData?.[0]?.notJoin) continue;

      if (unverifiedData.length) {
        await sequelize.transaction(async (t) => {
          await HrLeaveMonthlyTrans.destroy({
            where: {
              userMasterID: usermaster[i].userMasterID,
              AttnYearMon: yearMonth,
            },
            transaction: t,
          });

          await LCEGPenalty.destroy({
            where: {
              userMasterID: usermaster[i].userMasterID,
              YYYYMM: yearMonth,
            },
            transaction: t,
          });

          if (
            unverifiedData[0].user_leave &&
            unverifiedData[0].user_leave.length
          ) {
            const toAddData = [];
            const toAddLCEGPenaltyData = [];

            // for penalty

            for (const penalty of unverifiedData[0]?.penaltyArray || []) {
              toAddLCEGPenaltyData.push({
                userMasterID: unverifiedData[0].userMasterID,
                YYYYMM: +unverifiedData[0].yearMonth,
                penaltyType: penalty.penaltyType,
                penaltyValue: penalty.values,
              });
            }

            for (let m = 0; m < unverifiedData[0].user_leave.length; m++) {
              toAddData.push({
                userMasterID: unverifiedData[0].userMasterID,
                LeaveTranId: unverifiedData[0].user_leave[m].leavetranid,
                AttnYearMon: unverifiedData[0].yearMonth,
                MonDays: unverifiedData[0].MonDays,
                MonWorkDays: unverifiedData[0].WorkingDays,
                AttnVal: unverifiedData[0].user_leave[m].values,
                monthstartdate: unverifiedData[0].start_date,
                monthenddate: unverifiedData[0].end_date,
                branchID: unverifiedData[0].branchid,
                departmentID: unverifiedData[0].departid,
                designationID: unverifiedData[0].desigid,
                createBy: updateBy,
                createByIp: updateByIp,
              });
            }

            //add data
            await HrLeaveMonthlyTrans.bulkCreate(toAddData, {
              transaction: t,
            });
            await LCEGPenalty.bulkCreate(toAddLCEGPenaltyData, {
              individualHooks: true,
              user: req.userDetails,
              transaction: t,
            });
          }
        });
      }

      const getAlldata = await HrLeaveMonthlyTrans.findAll({
        raw: true,
        where: {
          userMasterID: usermaster[i].userMasterID,
          AttnYearMon: yearMonth,
        },
        include: [{ model: HrLeaveTypes, attributes: ['LeaveID'] }],
      });

      const monday =
        getAlldata?.[0]?.MonDays ||
        daysInMonth(yearMonth.slice(4, 6), yearMonth.slice(0, 4));

      // Check For Negative Value
      const check_NegativeValue = getAlldata.filter((e) => +e.AttnVal < 0);

      if (
        check_NegativeValue.length > 0 &&
        req.userDetails.companyMasterId != 384
      ) {
        NegativeValue_UserName.push(usermaster[i].displayName);
        continue;
      }

      let start_date =
        getAlldata.length > 0 && getAlldata[0].monthstartdate
          ? getAlldata[0].monthstartdate
          : yearMonth.slice(0, 4) + '-' + yearMonth.slice(4, 6) + '-' + '01';

      let end_date =
        getAlldata.length > 0 && getAlldata[0].monthenddate
          ? getAlldata[0].monthenddate
          : yearMonth.slice(0, 4) + '-' + yearMonth.slice(4, 6) + '-' + monday;

      const branch =
        (usermaster[i].employeeBranches || []).find(
          (e) =>
            new Date(e.applicableDate) <= new Date(end_date) &&
            (new Date(e.endDate) >= new Date(end_date) || !e.endDate),
        ) || null;

      const user_attendancePolicy =
        (usermaster[i].employeeAttendancePolicies || []).find(
          (e) =>
            new Date(e.startDate) <= new Date(end_date) &&
            (new Date(e.endDate) >= new Date(end_date) || !e.endDate),
        )?.attendancePolicy || null;

      const user_salaryPolicy =
        (usermaster[i].employeeSalaryPolicies || []).find(
          (e) =>
            new Date(e.startDate) <= new Date(end_date) &&
            (new Date(e.endDate) >= new Date(end_date) || !e.endDate),
        )?.salaryPolicy || null;

      const attendanceBonusPolicy =
        (usermaster[i].employeeAttendanceBonusPolicies || []).find(
          (e) =>
            new Date(e.startDate) <= new Date(end_date) &&
            (new Date(e.endDate) >= new Date(end_date) || !e.endDate),
        )?.attendanceBonusPolicy || null;

      // find leave policy

      const employeeLeavePolicyIds =
        (usermaster[i].empLeavePolicies || []).find(
          (e) =>
            new Date(e.applicableDate) <= new Date(end_date) &&
            (new Date(e.endDate) >= new Date(end_date) || !e.endDate),
        )?.employeeLeavePolicyID || [];

      // EmployeeResignation

      const resignation = usermaster[i].employee?.[0] || null;

      // Employee Employeement

      const employeement = (usermaster[i].empLeavePolicies || []).find(
        (e) =>
          new Date(e.applicableDate) <= new Date(end_date) &&
          (new Date(e.endDate) >= new Date(end_date) || !e.endDate),
      );

      // food allowance policy

      const foodAllowancePolicy =
        (usermaster[i].empFAP || []).find(
          (e) =>
            new Date(e.startDate) <= new Date(end_date) &&
            (new Date(e.endDate) >= new Date(end_date) || !e.endDate),
        )?.foodAllowancePolicy || null;

      //  Auto adjust Leave Policy
      const allLeavePolicy = AllLeavePolicyData.filter(
        (e) => employeeLeavePolicyIds.includes(+e.id) && e.isAutoAdjusted,
      );

      //  coff Policy
      const coffLeavePolicy = AllLeavePolicyData.find(
        (e) => employeeLeavePolicyIds.includes(+e.id) && e.leaveId == 6,
      );

      // find attendance data
      let attendancedata = [];
      let attendanceExecuted = false;

      const absent =
        getAlldata.find((e) => e['hrLeaveType.LeaveID'] == 5) || null;
      const absentDueToSandwhich =
        getAlldata.find((e) => e['hrLeaveType.LeaveID'] == 28) || null;

      const absentValue = absent?.AttnVal || 0;

      const absentDueToSandwhichValue = absentDueToSandwhich?.AttnVal || 0;

      // --------------- start transaction from here -------------------

      await sequelize.transaction(async (t) => {
        // --------------------------------- add penalty of canteen logs -----------------------

        const canteenLogs = (usermaster[i].canteenLogs || [])
          .filter((e) => {
            const dateStr = asiaKolkataDateTime(e.logDateTime).slice(0, 10);
            return dateStr >= start_date && dateStr <= end_date;
          })
          .sort((a, b) => new Date(a.logDateTime) - new Date(b.logDateTime));

        if (canteenLogs.length) {
          // ------------------------ Process Penalties ----------------

          await addCanteenPenalty(
            canteenPenaltyType,
            canteenLogs,
            allCanteenMealsData,
            biometricIntegrationData,
            req.userDetails.userMasterId,
            req.userDetails.userIpAddress,
            t,
          );
        }

        if (
          allLeavePolicy.length &&
          (+absentValue > 0 || +absentDueToSandwhichValue > 0)
        ) {
          attendanceExecuted = true;

          attendancedata = await getAttendanceData(
            usermaster[i].userMasterID,
            start_date,
            end_date,
            false,
          );

          const leaveCheckArray = await checkLeavePolicyOnAttendanceVerify(
            allLeavePolicy,
            start_date,
            end_date,
            yearMonth,
            usermaster[i].userMasterID,
            employeement,
            resignation,
            empjoing?.joiningDate || null,
          );

          // ---------------------- Pending Leave Logic -------------------------

          const pendingLeave = await UserLeave.findAll({
            where: {
              userMasterID: usermaster[i].userMasterID,
              [Sequelize.Op.or]: [
                {
                  FromDate: {
                    [Sequelize.Op.lte]: start_date,
                  },
                  ToDate: {
                    [Sequelize.Op.gte]: start_date,
                  },
                },
                {
                  FromDate: {
                    [Sequelize.Op.lte]: end_date,
                  },
                  ToDate: {
                    [Sequelize.Op.gte]: end_date,
                  },
                },
                {
                  FromDate: {
                    [Sequelize.Op.gte]: start_date,
                  },
                  ToDate: {
                    [Sequelize.Op.lte]: end_date,
                  },
                },
              ],
              authorizationStatus: {
                [Sequelize.Op.in]: [0, 1, 2],
              },
              status: 1,
            },

            include: [
              { model: hrLeaveTypes, attributes: ['LeaveID'] },
              { model: LeaveAuthorizationRequest },
            ],
            transaction: t,
          });

          // find inbox

          const allAuthIds = pendingLeave.flatMap((item) =>
            item.leaveAuthorizations.map(
              (child) => child.AuthorizationRequestId,
            ),
          );

          // delete user inbox request
          await UserInbox.destroy({
            where: {
              activityTablePK: {
                [Sequelize.Op.in]: allAuthIds,
              },
              [Sequelize.Op.or]: [
                {
                  activityTable: LeaveAuthorizationRequest.getTableName(),
                },
                {
                  activityTable: 'outdoorDutyAuthorizations',
                },
              ],
            },
            transaction: t,
          });

          await ApprovedLeaveAuthorization.destroy({
            where: {
              AuthorizationRequestId: {
                [Sequelize.Op.in]: allAuthIds,
              },
            },
            transaction: t,
          });

          // delete authorization data
          await LeaveAuthorizationRequest.destroy({
            where: {
              AuthorizationRequestId: {
                [Sequelize.Op.in]: allAuthIds,
              },
            },
            transaction: t,
          });

          const ODLeave = pendingLeave.filter(
            (e) => e.hrLeaveType?.LeaveID == 25,
          );

          const ODApprovedLeave = getAllSingleDayLeave(
            ODLeave,
            req.userDetails.userMasterId,
            req.userDetails.userIpAddress,
          );

          const optionalHolidayLeave = pendingLeave.filter(
            (e) => e.hrLeaveType?.LeaveID == 24,
          );

          const OHApprovedLeave = getAllSingleDayLeave(
            optionalHolidayLeave,
            req.userDetails.userMasterId,
            req.userDetails.userIpAddress,
          );

          const otherLeaves = pendingLeave.filter(
            (e) => ![24, 25].includes(+e.hrLeaveType?.LeaveID),
          );

          const leaveBalance = await employeeeLeaveBalance(
            companyId,
            usermaster[i].userMasterID,
          );

          const toApprovedLeave = [];
          const toDeleteLeave = [];

          let coffAvailableBalance = [];
          let allUsedCoffTrans = [];

          for (const leaveReq of otherLeaves) {
            // if absent or LWF
            if ([5, 18].includes(+leaveReq.hrLeaveType?.LeaveID)) {
              toApprovedLeave.push(leaveReq);
              continue;
            }

            // find validate leavePolicy Data
            const checkPolicy = leaveCheckArray.find(
              (e) => e.leaveId == leaveReq.hrLeaveType?.LeaveID,
            );

            // for coff
            if (leaveReq.hrLeaveType?.LeaveID == 6) {
              const singleDayCoff = getAllSingleDayLeave([leaveReq]);

              let coffTempAvailableBalance = [];
              let tempUsedTransactionLog = [];
              let deleteFlag = false;

              // loop through all dates
              for (const coff of singleDayCoff) {
                // check coff balance process
                const {
                  allBalanceData: allBalanceDataTemp,
                  remaining,
                  usedTransactionLog,
                } = await checkCoffBalanceProcess(
                  coffAvailableBalance,
                  usermaster[i].userMasterID,
                  coff.date,
                  coff.days,
                );

                if (remaining > 0) {
                  // to delete leave req
                  deleteFlag = true;
                  break;
                }

                // check policy conditions

                if (checkPolicy) {
                  // if user on probation or notice period
                  if (!checkPolicy.leaveStatus) {
                    // to delete leave req
                    deleteFlag = true;
                    break;
                  }

                  // if half day allowed or not

                  if (!checkPolicy.allowHalfDay && leaveReq.LeaveDays == 0.5) {
                    // to delete leave req
                    deleteFlag = true;
                    break;
                  }

                  // check allowed leave

                  if (
                    checkPolicy.allowedLeave > 0 &&
                    checkPolicy.allowedLeave <
                      +checkPolicy.usedLeave + +leaveReq.LeaveDays
                  ) {
                    // to delete leave req
                    deleteFlag = true;
                    continue;
                  }

                  checkPolicy.usedLeave += +coff.days;
                }

                tempUsedTransactionLog = [
                  ...tempUsedTransactionLog,
                  ...usedTransactionLog,
                ];

                const filteredData = coffTempAvailableBalance.filter(
                  (e) =>
                    !allBalanceDataTemp
                      .map((c) => +c.LeaveBalTranId)
                      .includes(+e.LeaveBalTranId),
                );

                // restore to allBalanceData
                coffTempAvailableBalance = [
                  ...filteredData,
                  ...allBalanceDataTemp,
                ];
              }

              // if not deleted

              if (!deleteFlag) {
                allUsedCoffTrans = [
                  ...allUsedCoffTrans,
                  ...tempUsedTransactionLog,
                ];

                const filteredData = coffAvailableBalance.filter(
                  (e) =>
                    !coffTempAvailableBalance
                      .map((c) => +c.LeaveBalTranId)
                      .includes(+e.LeaveBalTranId),
                );

                // restore to allBalanceData
                coffAvailableBalance = [
                  ...filteredData,
                  ...coffTempAvailableBalance,
                ];
              }
            } else {
              const findBalance = leaveBalance.find(
                (e) => e.LeaveID == leaveReq.hrLeaveType?.LeaveID,
              );
              // if balance is available
              if (leaveReq.LeaveDays <= findBalance.Balance) {
                if (checkPolicy) {
                  // if user on probation or notice period
                  if (!checkPolicy.leaveStatus) {
                    // to delete leave req
                    toDeleteLeave.push(leaveReq);
                    continue;
                  }

                  // if half day allowed or not

                  if (!checkPolicy.allowHalfDay && leaveReq.LeaveDays == 0.5) {
                    // to delete leave req
                    toDeleteLeave.push(leaveReq);
                    continue;
                  }

                  // check allowed leave

                  if (
                    checkPolicy.allowedLeave > 0 &&
                    checkPolicy.allowedLeave <
                      +checkPolicy.usedLeave + +leaveReq.LeaveDays
                  ) {
                    // to delete leave req
                    toDeleteLeave.push(leaveReq);
                    continue;
                  }

                  checkPolicy.usedLeave += +leaveReq.LeaveDays;
                }

                findBalance.Balance -= leaveReq.LeaveDays;
                toApprovedLeave.push(leaveReq);
              } else {
                // to delete leave req
                toDeleteLeave.push(leaveReq);
              }
            }
          }

          const othersApprovedLeave = getAllSingleDayLeave(
            toApprovedLeave,
            req.userDetails.userMasterId,
            req.userDetails.userIpAddress,
          );

          const finalApprovedArray = [
            ...ODApprovedLeave,
            ...OHApprovedLeave,
            ...othersApprovedLeave,
          ];

          const leaveIds = [
            ...new Set(finalApprovedArray.map((e) => e.ReferenceID)),
          ];

          const queryArray = [];
          // update leaveQuery
          queryArray.push(
            UserLeave.update(
              {
                authorizationStatus: 3,
                updateBy: req.userDetails.userMasterId,
                updateByIp: req.userDetails.userIpAddress,
              },
              {
                where: {
                  UserLeaveApplicationID: {
                    [Sequelize.Op.in]: leaveIds,
                  },
                },
                transaction: t,
              },
            ),
          );

          // add approved leave
          queryArray.push(
            UserLeaveTransaction.bulkCreate(finalApprovedArray, {
              transaction: t,
            }),
          );

          // delete user leave
          queryArray.push(
            UserLeave.destroy({
              where: {
                UserLeaveApplicationID: {
                  [Sequelize.Op.in]: toDeleteLeave.map(
                    (e) => e.UserLeaveApplicationID,
                  ),
                },
              },
              transaction: t,
            }),
          );

          await Promise.all(queryArray);

          const approvedDays = finalApprovedArray.reduce(
            (acc, obj) => acc + +obj.days,
            0,
          );

          // update present Days
          if (absentValue < approvedDays) {
            const presentData =
              getAlldata.find((e) => e['hrLeaveType.LeaveID'] == 1) || null;

            if (presentData) {
              const value = +presentData.AttnVal - (approvedDays - absentValue);

              await HrLeaveMonthlyTrans.update(
                {
                  AttnVal: value || 0,
                },
                {
                  where: {
                    userMasterID: usermaster[i].userMasterID,
                    AttnYearMon: yearMonth,
                    LeaveTranId: presentData.LeaveTranId,
                  },
                  transaction: t,
                },
              );
            }
          }

          // --------------- get adjusted leave array -------------------------

          const {
            absentLeaveArray,
            absentDueTosandwichLeaveArray,
            finalAbsent,
            finalAbsentDueToSandwich,
          } = await getLeaveAdjustArray(
            companyId,
            usermaster[i].userMasterID,
            user_attendancePolicy,
            start_date,
            end_date,
            attendancedata,
            absentValue - approvedDays > 0 ? absentValue - approvedDays : 0,
            absentDueToSandwhichValue,
            allLeavePolicy,
            leaveBalance,
            req.userDetails.userMasterId,
            req.userDetails.userIpAddress,
            t,
            leaveCheckArray,
          );

          const leaveTransactionArray = [];

          const finalApprovedData = [];

          if (absentValue > 0 || absentDueToSandwhichValue > 0) {
            const coffTranId =
              leaveBalance.find((e) => e.LeaveID == 6)?.LeaveTranId || null;

            let finalAbsentCount = finalAbsent;

            for (const leave of absentLeaveArray) {
              // if not coff
              if (leave.LeaveTranId != coffTranId) {
                finalApprovedData.push(leave);
                continue;
              }

              // check coff balance process
              const {
                allBalanceData: allBalanceDataTemp,
                remaining,
                usedTransactionLog,
              } = await checkCoffBalanceProcess(
                coffAvailableBalance,
                usermaster[i].userMasterID,
                leave.FromDate,
                leave.LeaveDays,
              );

              if (remaining > 0) {
                leave.days -= +remaining;
                finalAbsentCount += +remaining;
              }

              finalApprovedData.push(leave);

              allUsedCoffTrans = [...allUsedCoffTrans, ...usedTransactionLog];

              const filteredData = coffAvailableBalance.filter(
                (e) =>
                  !allBalanceDataTemp
                    .map((c) => +c.LeaveBalTranId)
                    .includes(+e.LeaveBalTranId),
              );

              // restore to allBalanceData
              coffAvailableBalance = [...filteredData, ...allBalanceDataTemp];
            }

            let finalSandwichCount = finalAbsentDueToSandwich;

            for (const sandwich of absentDueTosandwichLeaveArray) {
              // if not coff
              if (sandwich.LeaveTranId != coffTranId) {
                finalApprovedData.push(sandwich);
                continue;
              }

              // check coff balance process
              const {
                allBalanceData: allBalanceDataTemp,
                remaining,
                usedTransactionLog,
              } = await checkCoffBalanceProcess(
                coffAvailableBalance,
                userMasterID,
                sandwich.FromDate,
                sandwich.LeaveDays,
              );

              if (remaining > 0) {
                sandwich.days -= +remaining;
                finalSandwichCount += +remaining;
              }

              finalApprovedData.push(sandwich);

              allUsedCoffTrans = [...allUsedCoffTrans, ...usedTransactionLog];

              const filteredData = coffAvailableBalance.filter(
                (e) =>
                  !allBalanceDataTemp
                    .map((c) => +c.LeaveBalTranId)
                    .includes(+e.LeaveBalTranId),
              );

              // restore to allBalanceData
              coffAvailableBalance = [...filteredData, ...allBalanceDataTemp];
            }

            // update absent
            await HrLeaveMonthlyTrans.update(
              {
                AttnVal: finalAbsentCount || 0,
              },
              {
                where: {
                  userMasterID: usermaster[i].userMasterID,
                  AttnYearMon: yearMonth,
                  LeaveTranId: absent.LeaveTranId,
                },
                transaction: t,
              },
            );

            // update absent due to sandwich
            await HrLeaveMonthlyTrans.update(
              {
                AttnVal: finalSandwichCount || 0,
              },
              {
                where: {
                  userMasterID: usermaster[i].userMasterID,
                  AttnYearMon: yearMonth,
                  LeaveTranId: absentDueToSandwhich.LeaveTranId,
                },
                transaction: t,
              },
            );

            const finalApprovedLeaveArray = [...finalApprovedData].filter(
              (e) => +e.LeaveDays > 0,
            );

            const absentSumArray = sumByGroup([
              ...finalApprovedLeaveArray,
              ...finalApprovedArray,
            ]);

            // if absent array is available

            for (const obj of absentSumArray) {
              const checkLeaveValue =
                getAlldata.find((e) => e.LeaveTranId == obj.LeaveTranId)
                  ?.AttnVal || 0;

              // update all used leave type
              await HrLeaveMonthlyTrans.update(
                {
                  AttnVal: checkLeaveValue + +obj.LeaveDays,
                },
                {
                  where: {
                    userMasterID: usermaster[i].userMasterID,
                    AttnYearMon: yearMonth,
                    LeaveTranId: obj.LeaveTranId,
                  },
                  transaction: t,
                },
              );
            }

            // for absent
            const addedLeave = await UserLeave.bulkCreate(absentLeaveArray, {
              transaction: t,
              returning: true,
            });

            for (const leave of addedLeave) {
              leaveTransactionArray.push({
                ReferenceID: leave.UserLeaveApplicationID,
                LeaveTranId: leave.LeaveTranId,
                days: leave.LeaveDays,
                date: leave.FromDate,
                issandwichleave: 0,
                status: 1,
                createBy: req.userDetails.userMasterId,
                createByIp: req.userDetails.userIpAddress,
              });
            }

            // for sandwich
            const addedSandwichLeave = await UserLeave.bulkCreate(
              absentDueTosandwichLeaveArray,
              {
                transaction: t,
                returning: true,
              },
            );

            let sandwichCount = 0;

            for (const leave of addedSandwichLeave) {
              sandwichCount += +leave.LeaveDays;

              leaveTransactionArray.push({
                ReferenceID: leave.UserLeaveApplicationID,
                LeaveTranId: leave.LeaveTranId,
                days: leave.LeaveDays,
                date: leave.FromDate,
                issandwichleave: 1,
                status: 1,
                createBy: req.userDetails.userMasterId,
                createByIp: req.userDetails.userIpAddress,
              });
            }

            // update Leave Behalf Of Sandwich Leave
            const sandwichLeaveData =
              getAlldata.find((e) => e['hrLeaveType.LeaveID'] == 29) || null;

            if (sandwichCount > 0 && sandwichLeaveData) {
              const finalvalue = sandwichLeaveData.AttnVal + +sandwichCount;

              await HrLeaveMonthlyTrans.update(
                {
                  AttnVal: finalvalue || 0,
                },
                {
                  where: {
                    userMasterID: usermaster[i].userMasterID,
                    AttnYearMon: yearMonth,
                    LeaveTranId: sandwichLeaveData.LeaveTranId,
                  },
                  transaction: t,
                },
              );
            }
          }

          // if coff data
          if (coffAvailableBalance.length > 0) {
            await UsedCoffTransaction.bulkCreate(allUsedCoffTrans, {
              user: req.userDetails,
              individualHooks: true,
              transaction: t,
            });

            await Promise.all(
              coffAvailableBalance.map((e) =>
                HrLeaveBalance.update(
                  {
                    availBal: e.availBal,
                  },
                  {
                    where: {
                      LeaveBalTranId: e.LeaveBalTranId,
                    },
                    transaction: t,
                  },
                ),
              ),
            );
          }

          // add final approved leave
          await UserLeaveTransactions.bulkCreate(leaveTransactionArray, {
            transaction: t,
          });
        }

        let overtimeAdded = '',
          salaryCalculationBasedOn = '';
        if (user_salaryPolicy) {
          // to set for salaryCalculationBasedOn
          salaryCalculationBasedOn = user_salaryPolicy.salarycalculationBasedon;
          overtimeAdded = user_salaryPolicy.overtimeAdded;
        }

        await HrLeaveMonthlyTrans.update(
          {
            updateBy: updateBy,
            updateByIp: updateByIp,
            verified: 1,
            salaryCalAct,
          },
          {
            where: {
              userMasterID: usermaster[i].userMasterID,
              AttnYearMon: yearMonth,
            },
            transaction: t,
          },
        );

        // ------------------Attendance Bonus-------------------

        let extraDays = 0;

        const attBonusTypeIncentive = attBonus_ExtraDays.find(
          (e) =>
            String(e.incentivetypename).trim().toLocaleLowerCase() ==
            'attendance bonus',
        );
        const extraDaysTypeInc = attBonus_ExtraDays.find(
          (e) =>
            String(e.incentivetypename).trim().toLocaleLowerCase() ==
            'extra days',
        );

        const foodAllowanceTypeInc = attBonus_ExtraDays.find(
          (e) =>
            String(e.incentivetypename).trim().toLocaleLowerCase() ==
            'food allowance',
        );

        let salaryData = [];

        if (attBonusTypeIncentive || extraDaysTypeInc) {
          salaryData = await getUserSalaryMasterByMonth(
            usermaster[i].userMasterID,
            yearMonth,
          );
        }

        // check condition attendanceBonusPolicy and not set No attendanceBonusPolicy and Attendance Bonus is present in company

        if (
          attendanceBonusPolicy &&
          !attendanceBonusPolicy.setNoattendanceBonusPolicy &&
          attBonusTypeIncentive
        ) {
          let eligibleForBonus = false,
            monthly_PaidDays = 0,
            actual_Present = 0,
            slot = null;

          // for hourly salary calculation

          const workingData =
            getAlldata.find((e) => e['hrLeaveType.LeaveID'] == 20) || null;

          if (
            salaryCalculationBasedOn == 'hourwise' &&
            attendanceBonusPolicy.type == attendanceBonusType.HOURLY
          ) {
            const userWorkingMinutes = +workingData?.AttnVal || 0;
            const minAttnBonusMin = Math.round(
              +attendanceBonusPolicy.min_bonus_hrs * 60,
            );

            if (+userWorkingMinutes >= +minAttnBonusMin)
              eligibleForBonus = true;
          }

          // for daily salary calculation
          if (
            salaryCalculationBasedOn != 'hourwise' &&
            attendanceBonusPolicy.type == attendanceBonusType.DAILY
          ) {
            // Set Monthly Paid Days

            // this is for only absent days
            if (
              attendanceBonusPolicy.attBonusFor ==
              attendanceBonusForEnum.ABSENT_DAYS
            ) {
              const totalPaidDays = getAlldata
                .filter((e) => [1, 7, 9].includes(e['hrLeaveType.LeaveID']))
                .reduce((acc, obj) => acc + +obj.AttnVal, 0);

              const absentDays = +monday - +totalPaidDays;

              // Set Slot calculation

              const { slot: slotData, eligibleForBonus: eligible } =
                resolveAttendanceBonusSlot(
                  absentDays,
                  attendanceBonusPolicy,
                  attendanceBonusSlotEnum,
                  attendanceBonusPolicy.attBonusFor,
                );

              slot = slotData;
              eligibleForBonus = eligible;
            } else {
              // for present days

              if (empjoing?.salaryCalculationAct == 'F') {
                const weekoff = getAlldata
                  .filter((e) => e['hrLeaveType.LeaveID'] == 30)
                  .reduce((acc, obj) => acc + +obj.AttnVal, 0);
                monthly_PaidDays = +monday - +weekoff;
                actual_Present = getAlldata
                  .filter(
                    (e) =>
                      e['hrLeaveType.LeaveID'] == 1 ||
                      e['hrLeaveType.LeaveID'] == 9,
                  )
                  .reduce((acc, obj) => acc + +obj.AttnVal, 0);
              } else if (empjoing?.salaryCalculationAct == 'W') {
                const weekoffHoliday = getAlldata
                  .filter(
                    (e) =>
                      e['hrLeaveType.LeaveID'] == 30 ||
                      e['hrLeaveType.LeaveID'] == 31,
                  )
                  .reduce((acc, obj) => acc + +obj.AttnVal, 0);
                monthly_PaidDays = +monday - +weekoffHoliday;
                actual_Present = getAlldata
                  .filter((e) => e['hrLeaveType.LeaveID'] == 1)
                  .reduce((acc, obj) => acc + +obj.AttnVal, 0);
              } else {
                monthly_PaidDays = +monday;
                actual_Present = getAlldata
                  .filter(
                    (e) =>
                      e['hrLeaveType.LeaveID'] == 1 ||
                      e['hrLeaveType.LeaveID'] == 7 ||
                      e['hrLeaveType.LeaveID'] == 9,
                  )
                  .reduce((acc, obj) => acc + +obj.AttnVal, 0);
              }

              // if set fix days
              if (attendanceBonusPolicy.setPresentDay == 'Fix') {
                const leaveID =
                  attendanceBonusPolicy.attBonusFor ==
                  attendanceBonusForEnum.PRESENT_DAYS
                    ? [1]
                    : [1, 9];

                const presentDays = getAlldata
                  .filter((e) => leaveID.includes(e['hrLeaveType.LeaveID']))
                  .reduce((acc, obj) => acc + (+obj.AttnVal || 0), 0);

                // Set Slot calculation

                const { slot: slotData, eligibleForBonus: eligible } =
                  resolveAttendanceBonusSlot(
                    presentDays,
                    attendanceBonusPolicy,
                    attendanceBonusSlotEnum,
                    attendanceBonusPolicy.attBonusFor,
                  );

                slot = slotData;
                eligibleForBonus = eligible;
              } else if (attendanceBonusPolicy.setPresentDay == 'Half') {
                if (+monthly_PaidDays / 2 <= +actual_Present)
                  eligibleForBonus = true;
              } else {
                const totalPaidDays = getAlldata
                  .filter(
                    (e) =>
                      e['hrLeaveType.LeaveID'] == 1 ||
                      e['hrLeaveType.LeaveID'] == 7 ||
                      e['hrLeaveType.LeaveID'] == 9,
                  )
                  .reduce((acc, obj) => acc + +obj.AttnVal, 0);

                if (+totalPaidDays == +monday) eligibleForBonus = true;
              }
            }
          }

          // check eligibleForBonus is true

          if (eligibleForBonus) {
            let amount = 0;
            const salaryCalculationType =
              salaryData.length > 0 ? salaryData[0].baseOnCalculation : '';

            // for daily salary

            if (attendanceBonusPolicy.type == attendanceBonusType.DAILY) {
              const attendnaceBonusType =
                slot == attendanceBonusSlotEnum.THREESLOT
                  ? attendanceBonusPolicy.attendanceBonustypeSlot3
                  : slot == attendanceBonusSlotEnum.TWOSLOT
                    ? attendanceBonusPolicy.attendanceBonustypeSlot2
                    : attendanceBonusPolicy.attendanceBonustype;

              const attendnaceBonusAmount =
                slot == attendanceBonusSlotEnum.THREESLOT
                  ? +attendanceBonusPolicy.attendanceBonusAmountSlot3
                  : slot == attendanceBonusSlotEnum.TWOSLOT
                    ? +attendanceBonusPolicy.attendanceBonusAmountSlot2
                    : +attendanceBonusPolicy.attendanceBonusAmount;
              // if Attendance Bonus Amount is Fixed
              if (
                attendnaceBonusType == 'Fix' &&
                salaryCalculationType != 'H'
              ) {
                amount = attendnaceBonusAmount;
              } else {
                extraDays = attendnaceBonusAmount;

                const grossAmount =
                  salaryData.find((e) => e.payheadMasterId == 50)
                    ?.EmployeeSalaryAmount || 0;

                // if salaryCalculationType is daywise
                if (salaryCalculationType == 'D')
                  amount = +grossAmount * attendnaceBonusAmount;
                // if salaryCalculationType is Month Wise
                if (salaryCalculationType == 'M') {
                  let perDayAmount = 0;

                  if (salaryCalculationBasedOn == 'daywise')
                    perDayAmount =
                      +grossAmount / +user_salaryPolicy.salaryCalculationDays;
                  else {
                    // if salaryCalculationAct set as factory act
                    if (empjoing?.salaryCalculationAct == 'F') {
                      const actualWeekoff = getAlldata.find(
                        (e) => e['hrLeaveType.LeaveID'] == 30,
                      );

                      perDayAmount =
                        +grossAmount /
                        (+monday -
                          (actualWeekoff ? +actualWeekoff.AttnVal : 0));
                    } else if (empjoing?.salaryCalculationAct == 'W') {
                      const actualWeekoffHoliday = getAlldata
                        .filter(
                          (e) =>
                            e['hrLeaveType.LeaveID'] == 30 ||
                            e['hrLeaveType.LeaveID'] == 31,
                        )
                        .reduce((acc, obj) => acc + obj.AttnVal, 0);

                      perDayAmount =
                        +grossAmount / (+monday - actualWeekoffHoliday);
                    } else {
                      perDayAmount = +grossAmount / +monday;
                    }
                  }

                  amount = perDayAmount * attendnaceBonusAmount;
                }
              }
            }

            // for houly salary
            if (attendanceBonusPolicy.type == attendanceBonusType.HOURLY) {
              let minutes = 0;
              // find trans for shift
              const att = await attendanceTransaction.findOne({
                where: {
                  userMasterID: usermaster[i].userMasterID,
                  AttendanceDate: {
                    [Sequelize.Op.between]: [start_date, end_date],
                  },
                },
                order: [['AttendanceDate', 'DESC']],
              });

              if (attendanceBonusPolicy.bonus_criteria == 'fix')
                minutes = Math.round(+attendanceBonusPolicy.hours * 60);

              if (attendanceBonusPolicy.bonus_criteria == 'shift') {
                minutes = att
                  ? Math.round(
                      +att.Shifthrs * 60 * +attendanceBonusPolicy.hours,
                    )
                  : 0;
              }

              let perMinuteGross = 0;

              const grossAmount =
                salaryData.find((e) => e.payheadMasterId == 50)
                  ?.EmployeeSalaryAmount || 0;

              // if hourly salary structure
              if (salaryCalculationType == 'H')
                perMinuteGross = +grossAmount / 60;
              // daily salary structure
              if (salaryCalculationType == 'D') {
                if (user_salaryPolicy.dailyFixhours)
                  perMinuteGross =
                    +grossAmount / (+user_salaryPolicy.dailyFixhours * 60);

                if (!user_salaryPolicy.dailyFixhours && att)
                  perMinuteGross = +grossAmount / (+att.Shifthrs * 60);
              }
              // monthly salary structure
              if (salaryCalculationType == 'M') {
                const days = calculateDays(start_date, end_date) || 0;

                if (user_salaryPolicy.monthlyFixhours)
                  perMinuteGross =
                    +grossAmount / (+user_salaryPolicy.monthlyFixhours * 60);

                if (
                  user_salaryPolicy.dailyFixhours &&
                  !user_salaryPolicy.monthlyFixhours
                )
                  perMinuteGross =
                    +grossAmount /
                    (+user_salaryPolicy.dailyFixhours * days * 60);

                if (
                  !user_salaryPolicy.dailyFixhours &&
                  !user_salaryPolicy.monthlyFixhours &&
                  att
                )
                  perMinuteGross = +grossAmount / (+att.Shifthrs * days * 60);
              }
              // set minutes and amount
              extraDays = +minutes;
              amount = +perMinuteGross * +minutes;
            }

            const attendanceBonus_leaveType = getAlldata.find(
              (e) => e['hrLeaveType.LeaveID'] == 32,
            );

            // if Extra Days is greater than zero
            if (+extraDays > 0 && attendanceBonus_leaveType) {
              await HrLeaveMonthlyTrans.update(
                {
                  AttnVal: extraDays,
                  verified: 1,
                  updateBy: req.userDetails.userMasterId,
                  updateByIp: req.userDetails.userIpAddress,
                },
                {
                  where: {
                    userMasterID: usermaster[i].userMasterID,
                    AttnYearMon: yearMonth,
                    LeaveTranId: attendanceBonus_leaveType.LeaveTranId,
                  },
                  transaction: t,
                },
              );
            }

            // if amount is greater than Zero

            if (+amount > 0) {
              // Add Attendance Bonus in Employee Attendance
              await Employeeincentive.create(
                {
                  userMasterID: usermaster[i].userMasterID,
                  yearmonth: yearMonth,
                  amount: Math.round(amount),
                  IncentivetypeID: attBonusTypeIncentive.IncentivetypeID,
                  incentiveDate: end_date,
                  createBy: req.userDetails.userMasterId,
                },
                { transaction: t },
              );
            }
          }
        }

        const weekoffPolicyType =
          attendancedataCal[0]?.weekoffPolicyType || null;
        const coffValue = attendancedataCal[0]?.coffValue || 0;
        const coffType = attendancedataCal[0]?.coff || null;
        const calculateOn = attendancedataCal[0]?.calculateon || '';

        // -------------------Add coff or Extra Days from Attendance Calculation ----------------------

        if (
          [
            weekoffTypeEnum.MONTHLYFIX,
            weekoffTypeEnum.ONPAIDDAYS,
            weekoffTypeEnum.ONPRESENTDAY,
          ].includes(weekoffPolicyType) &&
          coffValue &&
          coffType &&
          calculateOn != 'hourly'
        ) {
          if (coffType == 'AddLeave') {
            const coffLeaveType = AllHrLeaveTypes.find((e) => e.LeaveID == 6);

            if (coffLeaveType) {
              const coffData = allCoffData.find(
                (e) => e.userMasterID == usermaster[i].userMasterID,
              );

              const usedCoff =
                coffData?.hrLeaveBalance?.usedCoffTransactions || [];

              if (usedCoff.length == 0) {
                if (coffData) {
                  if (coffData.LeaveBalTranId) {
                    await HrLeaveBalance.destroy({
                      where: {
                        LeaveBalTranId: coffData.LeaveBalTranId,
                      },
                      transaction: t,
                    });
                  }

                  await coffMaster.destroy({
                    where: {
                      coffMasterID: coffData.coffMasterID,
                    },
                    transaction: t,
                  });
                }

                const expiryDate = coffLeavePolicy?.expiryDays
                  ? getDateByAddingDays(end_date, coffLeavePolicy.expiryDays)
                  : null;

                // create leave balance
                const leaveBalance = await HrLeaveBalance.create(
                  {
                    LeaveTranId: coffLeaveType.LeaveTranId,
                    userMasterID: usermaster[i].userMasterID,
                    YearMM: yearMonth,
                    LeaveAddNew: +coffValue,
                    expiryDate,
                    availBal: +coffValue,
                    createBy: req.userDetails.userMasterId,
                    createByIp: req.userDetails.userIpAddress,
                  },
                  {
                    transaction: t,
                  },
                );

                await coffMaster.create(
                  {
                    LeaveBalTranId: leaveBalance.LeaveBalTranId,
                    LeaveTranId: coffLeaveType.LeaveTranId,
                    userMasterID: usermaster[i].userMasterID,
                    LeaveCreatedDate: end_date,
                    YearMM: yearMonth,
                    LeaveAddNew: +coffValue,
                    authorizationStatus: 3,
                    From: 'AC',
                    expiryDate,
                    createBy: req.userDetails.userMasterId,
                    createByIp: req.userDetails.userIpAddress,
                  },
                  {
                    transaction: t,
                  },
                );
              }
            }
          }

          if (coffType == 'AddExtraDays') {
            // Add Extra Days
            await ExtraDays.create(
              {
                userMasterID: usermaster[i].userMasterID,
                date: end_date,
                days: +coffValue,
                employeeincentiveID: null,
                authorizationStatus: 3,
                From: extraDaysFromEnum.ATTENDANCE_CALCULATION,
              },
              {
                user: req.userDetails,
                transaction: t,
              },
            );
          }
        }

        // if holiday extra days

        if (holidayExtraDays > 0) {
          // Add Extra Days
          await ExtraDays.create(
            {
              userMasterID: usermaster[i].userMasterID,
              date: end_date,
              days: +holidayExtraDays,
              employeeincentiveID: null,
              authorizationStatus: 3,
              From: extraDaysFromEnum.WEEKOFF_HOLIDAY_ON_SAME_DAY,
            },
            {
              user: req.userDetails,
              transaction: t,
            },
          );
        }

        // Extra Days calculation --------------------

        if (extraDaysTypeInc) {
          const extraDaysData = await ExtraDays.findAll({
            where: {
              userMasterID: usermaster[i].userMasterID,
              date: {
                [Sequelize.Op.between]: [start_date, end_date],
              },
              authorizationStatus: 3,
            },
            transaction: t,
          });

          // if extra days data exist
          if (extraDaysData.length) {
            const extraDays = extraDaysData.reduce(
              (acc, obj) => acc + +obj.days,
              0,
            );
            const amount = await calculateExtraDays(
              user_salaryPolicy,
              salaryData,
              usermaster[i].userMasterID,
              start_date,
              end_date,
              monday,
              usermaster[i].employeeJoiningDetails?.[0]?.salaryCalculationAct ||
                '',
              getAlldata,
              extraDays,
            );
            if (Math.round(+amount) > 0) {
              const addedData = await Employeeincentive.create(
                {
                  userMasterID: usermaster[i].userMasterID,
                  yearmonth: yearMonth,
                  amount: Math.round(amount),
                  IncentivetypeID: extraDaysTypeInc.IncentivetypeID,
                  incentiveDate: end_date,
                  createBy: req.userDetails.userMasterId,
                },
                {
                  transaction: t,
                },
              );
              // update Extra Days
              await ExtraDays.update(
                {
                  employeeincentiveID: addedData.employeeincentiveID,
                  updateBy: req.userDetails.userMasterId,
                },
                {
                  where: {
                    extraDaysID: {
                      [Sequelize.Op.in]: extraDaysData.map(
                        (e) => e.extraDaysID,
                      ),
                    },
                  },
                  hooks: false,
                  transaction: t,
                },
              );
            }
          }
        }

        // food allowance calculation-----------------

        if (
          foodAllowanceTypeInc &&
          foodAllowancePolicy?.foodAllowanceType ==
            FoodAllowanceTypeEnum.ON_MONTH_DAYS
        ) {
          const totalDays = getDaysFromDates(start_date, end_date);

          const amount = +totalDays * +foodAllowancePolicy.workingTimeAmount;

          if (Math.round(amount) > 0) {
            await Employeeincentive.create(
              {
                userMasterID: usermaster[i].userMasterID,
                yearmonth: yearMonth,
                amount: Math.round(amount),
                IncentivetypeID: foodAllowanceTypeInc.IncentivetypeID,
                incentiveDate: end_date,
                from: incentiveFromEnum.ATTN_CAL,
                createBy: req.userDetails.userMasterId,
              },
              {
                transaction: t,
              },
            );
          }
        }

        // hourly overtime request

        const otMinutes =
          getAlldata.find(
            (e) => e['hrLeaveType.LeaveID'] == 21 && +e.AttnVal > 0,
          )?.AttnVal || 0;

        if (otMinutes > 0 && empjoing?.overtime == 1) {
          if (overtimeAdded != 'daily') {
            let overtimeEntryAfter;

            if (user_attendancePolicy) {
              overtimeEntryAfter =
                user_attendancePolicy.overtimeEntryAfterMin || 0;
            } else {
              overtimeEntryAfter = 0;
            }

            if (Number(otMinutes) > Number(overtimeEntryAfter)) {
              let final_ot_min = Number(otMinutes);

              let data = {
                AttendanceTransID: null,
                UserMasterID: usermaster[i].userMasterID,
                OverTimeDate: end_date,
                OverTimeIn: null,
                OverTimeOut: null,
                OverTimeHourAndMin: final_ot_min,
                AttendancePolicyID: null,
                CompanyMasterID: companyMasterID,
                createBy: updateBy,
              };

              await overtimeauthorization(data);
            }
          }
        }

        // condition for Asopalv
        if (
          (companyMasterID == 277 ||
            companyMasterID == 298 ||
            companyMasterID == 300) &&
          empjoing?.overtime == 1
        ) {
          const ot_data = await getOTDaysforAsopalav(
            usermaster[i].userMasterID,
            yearMonth,
          );

          if (+ot_data.minutes > 0) {
            const data = {
              AttendanceTransID: null,
              UserMasterID: usermaster[i].userMasterID,
              OverTimeDate: ot_data.date,
              OverTimeIn: null,
              OverTimeOut: null,
              OverTimeHourAndMin: +ot_data.minutes,
              AttendancePolicyID: null,
              CompanyMasterID: companyMasterID,
              createBy: updateBy,
              createByIp: updateByIp,
            };

            await overtimeauthorizationForAsopalav(data);
          }
        }

        // SRI VAISHNAVI RETAIL (INDIA) LLP

        if (companyMasterID == 237) {
          const absentdata = getAlldata.find((e) => e.LeaveTranId == 1471); //leavetranid for absent

          const absent = absentdata ? +absentdata.AttnVal : 0;

          await addThreeDaysExtraAmount(
            usermaster[i].userMasterID,
            yearMonth,
            absent,
            updateBy,
            updateByIp,
            end_date,
          );

          const branchId = branch ? branch.branchID : '';

          if (!attendanceExecuted) {
            attendancedata = await getAttendanceData(
              usermaster[i].userMasterID,
              start_date,
              end_date,
              false,
            );
          }

          //check weekoff payment

          await checkSundayPresentDoublesalary(
            attendancedata,
            usermaster[i].userMasterID,
            start_date,
            end_date,
            branchId,
            yearMonth,
            updateBy,
            updateByIp,
          );
          await lunchBreakPenaltyForVaishnavi(
            attendancedata,
            end_date,
            updateBy,
            updateByIp,
          );
        }
      });
    }

    let message = 'Attendance verified successfully.';

    if (NegativeValue_UserName.length > 0) {
      message = `Attenance not verified of ${NegativeValue_UserName} and other attendance verified successfully.`;
    }

    return res.status(200).json({
      status: 200,
      message: message,
    });
  } catch (err) {
    next(err);
  }
};

exports.unVerifyAllAttendanceCalcution = async (req, res, next) => {
  try {
    let { companyMasterID, userMasterID, yearMonth } = await req.body;

    const updateBy = req.userDetails?.userMasterId || null;
    const updateByIp = req.userDetails?.userIpAddress || null;

    const monday = daysInMonth(yearMonth.slice(4, 6), yearMonth.slice(0, 4));

    const calculatedOTNames = [];
    const salaryCalculatedNames = [];

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const [usermaster, AllUserSalary, AllUserAttData, AllCoff] =
      await Promise.all([
        UserMaster.findAll({
          raw: true,
          where: {
            ...where,
            userMasterID: userMasterID,
          },
          include: [...includeModels, { model: EmployeeJoiningDetails }],
        }),
        HRSalaryTrasaction.findAll({
          raw: true,
          where: {
            userMasterID: userMasterID,
            salaryYYYYMM: yearMonth,
          },
        }),
        HrLeaveMonthlyTrans.findAll({
          raw: true,
          where: {
            userMasterID: userMasterID,
            AttnYearMon: yearMonth,
            verified: 1,
          },
          include: [{ model: HrLeaveTypes, attributes: ['LeaveID'] }],
        }),
        // Find Coff
        coffMaster.findAll({
          where: {
            userMasterID: {
              [Sequelize.Op.in]: userMasterID,
            },
            YearMM: yearMonth,
            From: 'AC',
          },
          include: [
            {
              model: HrLeaveBalance,
              include: [{ model: UsedCoffTransaction }],
            },
          ],
        }),
        // find system generated Leave
      ]);

    await sequelize.transaction(async (t) => {
      for (let i = 0; i < usermaster.length; i++) {
        companyMasterID = usermaster[i].companyMasterId;

        const find_salary = AllUserSalary.find(
          (e) =>
            e.userMasterID == usermaster[i].userMasterID &&
            e.salaryYYYYMM == yearMonth,
        );

        if (find_salary) {
          salaryCalculatedNames.push(usermaster[i].displayName);
          continue;
        }

        const getAlldata = AllUserAttData.filter(
          (e) =>
            e.userMasterID == usermaster[i].userMasterID &&
            e.AttnYearMon == yearMonth,
        );

        let end_date =
          getAlldata.length > 0 && getAlldata[0].monthenddate
            ? getAlldata[0].monthenddate
            : yearMonth.slice(0, 4) +
              '-' +
              yearMonth.slice(4, 6) +
              '-' +
              monday;

        let start_date =
          getAlldata.length > 0 && getAlldata[0].monthstartdate
            ? getAlldata[0].monthstartdate
            : yearMonth.slice(0, 4) + '-' + yearMonth.slice(4, 6) + '-' + '01';

        // ---------------------- find system generated leaves -----------------------

        const leaves = await UserLeave.findAll({
          where: {
            userMasterID: usermaster[i].userMasterID,
            leaveFrom: leaveApplyFromEnum.SYSTEM,
          },
          include: [
            {
              model: UserLeaveTransaction,
              where: {
                date: { [Sequelize.Op.between]: [start_date, end_date] },
                status: 1,
              },
              include: [{ model: HrLeaveTypes, attributes: ['LeaveID'] }],
            },
          ],
        });

        const queryArray = [
          UserLeaveTransaction.destroy({
            where: {
              ReferenceID: {
                [Sequelize.Op.in]: leaves.map((e) => e.UserLeaveApplicationID),
              },
            },
            transaction: t,
          }),

          UserLeave.destroy({
            where: {
              UserLeaveApplicationID: {
                [Sequelize.Op.in]: leaves.map((e) => e.UserLeaveApplicationID),
              },
            },
            transaction: t,
          }),
        ];

        const userLeaveTrans = leaves.flatMap((e) =>
          (e.userLeaveTransactions || []).filter(
            (u) => u.hrLeaveType?.LeaveID == 6,
          ),
        );

        const allDates = userLeaveTrans.map((e) => e.date);

        const allUsedCoff = await UsedCoffTransaction.findAll({
          where: {
            date: {
              [Sequelize.Op.in]: allDates,
            },
            type: CoffUsedTypeEnum.USED,
          },
          include: [
            {
              model: HrLeaveBalance,
              where: { userMasterID: usermaster[i].userMasterID },
            },
          ],
        });

        const groupedData = allUsedCoff.reduce((acc, curr) => {
          const id = curr.LeaveBalTranId;
          if (!acc[id]) {
            acc[id] = { LeaveBalTranId: id, totalDays: 0 };
          }
          acc[id].totalDays += Number(curr.days) || 0;
          return acc;
        }, {});

        const result = Object.values(groupedData);

        for (const usedCoff of result) {
          const balance =
            (allUsedCoff.find(
              (e) => e.LeaveBalTranId == usedCoff.LeaveBalTranId,
            )?.hrLeaveBalance?.availBal || 0) + +usedCoff.totalDays;

          if (balance > 0) {
            queryArray.push(
              HrLeaveBalance.update(
                {
                  availBal: balance,
                },
                {
                  where: {
                    LeaveBalTranId: usedCoff.LeaveBalTranId,
                  },
                  transaction: t,
                },
              ),
            );
          }
        }

        queryArray.push(
          UsedCoffTransaction.destroy({
            where: {
              id: {
                [Sequelize.Op.in]: allUsedCoff.map((e) => e.id),
              },
            },
            user: req.userDetails,
            individualHooks: true,
            transaction: t,
          }),
        );

        // delete system generated leaves
        await Promise.all(queryArray);

        const ot_value = await executeQuery(
          `
    select HrLM."AttnVal"  from "hrLeaveMonthlyTrans" as HrLM left outer join 
    "hrLeaveTypes" as HrLT on HrLM."LeaveTranId" = HrLT."LeaveTranId" 
    WHERE HrLT."LeaveID"=21 and HrLM."userMasterID"=` +
            usermaster[i].userMasterID +
            ` and HrLM."AttnYearMon"=` +
            yearMonth +
            ` and HrLM."AttnVal">0`,
        );

        // hourly overtime request check
        if (
          ot_value.length > 0 ||
          usermaster[i].companyMasterId == 277 ||
          usermaster[i].companyMasterId == 298 ||
          usermaster[i].companyMasterId == 300
        ) {
          const [overtime, overtimeCal] = await Promise.all([
            overTimeCalculation.findOne({
              raw: true,
              where: {
                UserMasterID: usermaster[i].userMasterID,
                OverTimeDate: end_date,
                AttendanceTransID: null,
              },
            }),
            overTimeCalculationMain.findOne({
              where: {
                yyyymm: yearMonth,
                userMasterID: usermaster[i].userMasterID,
              },
            }),
          ]);

          if (overtimeCal && overtime) {
            calculatedOTNames.push(usermaster[i].displayName);
            continue;
          }

          if (overtime) {
            await overtimeAuthorizationRequest.destroy({
              where: {
                ReferenceID: overtime.OverTimeID,
              },
              transaction: t,
            });

            await overTimeCalculation.destroy({
              where: {
                OverTimeID: overtime.OverTimeID,
              },
              transaction: t,
            });
          }
        }

        // Set Attendance Bonus Days Zero
        const atendnaceBonus = getAlldata.find(
          (e) => e['hrLeaveType.LeaveID'] == 32,
        );

        if (atendnaceBonus) {
          await HrLeaveMonthlyTrans.update(
            {
              verified: 0,
              AttnVal: 0,
              updateBy: updateBy,
              updateByIp: updateByIp,
            },
            {
              where: {
                userMasterID: usermaster[i].userMasterID,
                AttnYearMon: yearMonth,
                LeaveTranId: atendnaceBonus.LeaveTranId,
              },
              transaction: t,
            },
          );
        }

        await HrLeaveMonthlyTrans.update(
          {
            updateBy: updateBy,
            updateByIp: updateByIp,
            verified: 0,
            salaryCalAct: null,
          },
          {
            where: {
              userMasterID: usermaster[i].userMasterID,
              AttnYearMon: yearMonth,
            },
            transaction: t,
          },
        );

        // find Extra Days

        const extraDaysData = await ExtraDays.findAll({
          where: {
            userMasterID: usermaster[i].userMasterID,
            date: {
              [Sequelize.Op.between]: [start_date, end_date],
            },
            employeeincentiveID: {
              [Sequelize.Op.ne]: null,
            },
          },
          transaction: t,
        });

        if (extraDaysData.length > 0 && extraDaysData[0].employeeincentiveID) {
          await ExtraDays.update(
            {
              employeeincentiveID: null,
              updateBy: req.userDetails.userMasterId,
            },
            {
              where: {
                extraDaysID: {
                  [Sequelize.Op.in]: extraDaysData.map((e) => e.extraDaysID),
                },
              },
              transaction: t,
              hooks: false,
            },
          );

          // delete extra days incentives
          await Employeeincentive.destroy({
            where: {
              employeeincentiveID: extraDaysData[0].employeeincentiveID,
            },
            transaction: t,
          });
        }

        // ------------------------------Delete Extra Days and coff -----------------------

        await ExtraDays.destroy({
          where: {
            date: end_date,
            userMasterID: usermaster[i].userMasterID,
            From: [
              extraDaysFromEnum.ATTENDANCE_CALCULATION,
              extraDaysFromEnum.WEEKOFF_HOLIDAY_ON_SAME_DAY,
            ],
          },
          individualHooks: true,
          user: req.userDetails,
          transaction: t,
        });

        // Find Coff
        const findCoff = AllCoff.filter(
          (e) =>
            e.userMasterID == usermaster[i].userMasterID &&
            (!e.hrLeaveBalance?.usedCoffTransactions ||
              e.hrLeaveBalance.usedCoffTransactions.length === 0),
        );

        if (findCoff.length) {
          const LeaveBalTranIds = findCoff.map((e) => e.LeaveBalTranId);
          if (LeaveBalTranIds.length) {
            // Delete Coff Balance
            await HrLeaveBalance.destroy({
              where: {
                LeaveBalTranId: {
                  [Sequelize.Op.in]: LeaveBalTranIds,
                },
              },
              transaction: t,
            });
          }
          // Delete Coff
          await coffMaster.destroy({
            where: {
              coffMasterID: {
                [Sequelize.Op.in]: findCoff.map((e) => e.coffMasterID),
              },
            },
            transaction: t,
          });
        }

        // SRI VAISHNAVI RETAIL (INDIA) LLP
        if (companyMasterID == 237) {
          // delete three days extra Amount and weekoff payment Amount

          await Employeeincentive.destroy(
            {
              where: {
                userMasterID: usermaster[i].userMasterID,
                yearmonth: +yearMonth,
                IncentivetypeID: [129, 159], //three days extra id 129 and weekoff payment id 159
              },
            },
            { transaction: t },
          );

          // if attendance is verified
          if (getAlldata.length > 0) {
            await EmployeePenalty.destroy(
              {
                where: {
                  userMasterID: usermaster[i].userMasterID,
                  penaltyDate: getAlldata[0].monthenddate,
                  penaltyID: 64, // Lunch Break Penalty id 64
                },
              },
              { transaction: t },
            );
          }
        }

        // delete Attendance Bonus

        const allIncentives = await Employeeincentive.findAll({
          where: {
            userMasterID: usermaster[i].userMasterID,
            yearmonth: yearMonth,
            incentiveDate: end_date,
          },
          include: [
            {
              required: true,
              model: Incentivetype,
              where: {
                [Sequelize.Op.or]: [
                  Sequelize.where(
                    sequelize.fn(
                      'LOWER',
                      sequelize.fn(
                        'TRIM',
                        sequelize.col('incentivetype.incentivetypename'),
                      ),
                    ),
                    'attendance bonus',
                  ),

                  Sequelize.literal(`TRIM(LOWER("incentivetype"."incentivetypename")) = 'food allowance' 
                   AND "employeeincentive"."from" = '${incentiveFromEnum.ATTN_CAL}'`),
                ],
              },
            },
          ],
          transaction: t,
        });

        await Employeeincentive.destroy({
          where: {
            employeeincentiveID: allIncentives.map(
              (e) => e.employeeincentiveID,
            ),
          },
          transaction: t,
        });
      }
    });

    let message = '';

    if (calculatedOTNames.length > 0) {
      message += `OT has already been calculated for ${calculatedOTNames}.`;
    }

    if (salaryCalculatedNames.length > 0) {
      message += ` salary has already been calculated for ${salaryCalculatedNames}.`;
    }
    if (calculatedOTNames.length == 0 && salaryCalculatedNames.length == 0) {
      message = 'Attendance unverified successfully.';
    } else {
      message += 'Attendance unverified for the rest.';
    }
    res.status(200).json({
      status: 200,
      data: {},
      message,
    });
  } catch (err) {
    next(err);
  }
};

exports.attendanceSummarybyuserid = async (req, res, next) => {
  try {
    let { userMasterID, month, companyMasterID } = await req.body;

    if (!month) {
      month =
        String(new Date().getFullYear()) +
        String(new Date().getMonth() + 1).padStart(2, '0');
    }

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    const monday = daysInMonth(month.slice(4, 6), month.slice(0, 4));

    const enddate = month.slice(0, 4) + '-' + month.slice(4, 6) + '-' + monday;

    const { startDate, endDate } = getStartAndEndDate(+month);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const usermaster = await UserMaster.findOne({
      where: {
        userMasterID: userMasterID,
        status: 1,
        ...userAccessCondition.where,
      },
      include: [
        ...userAccessCondition.includeModels,
        {
          required: false,
          model: HrLeaveMonthlyTrans,
          where: { AttnYearMon: month },
          attributes: [
            'AttnTranId',
            'LeaveTranId',
            'AttnVal',
            'userMasterID',
            'AttnYearMon',
            'monthstartdate',
            'monthenddate',
            'verified',
            'updateBy',
          ],
          include: [
            {
              model: hrLeaveTypes,
              attributes: ['LeaveID'],
              include: [
                {
                  model: HrLeaveMaster,
                  as: 'LeaveMaster',
                  attributes: ['LeaveName', 'LeaveDesc'],
                },
              ],
            },
          ],
        },
        {
          model: EmployeeJoiningDetails,
          attributes: [
            'employeeCode',
            'joiningDate',
            'leavingDate',
            'salaryCalculationAct',
            'fullMonthPresence',
          ],
        },
        {
          required: false,
          model: employeeSalaryPolicies,
          where: {
            status: 1,
            startDate: {
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
          attributes: ['salaryPolicyID'],
          include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
        },
        {
          model: EmployeeAttendancePolicy,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: new Date(endDate) },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(startDate) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          required: false,
          attributes: ['attendancePolicyID','startDate','endDate'],
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
                'coff',
                'overtimeEntryAfterMin',
                    'isWHAbsentRule',
                    'cofffullday',
                    'coffhalfday',
                    ['coffOneAndHalfDay', 'coffOneHalf'],
                    'coffTwoFullDay',
                    'holidayCoff',
                    ['holidayCoffHalfDay', 'h_halfDay'],
                    ['holidayCoffFullDay', 'h_fullDay'],
                    ['holidayCoffOneHalfDay', 'h_oneHalf'],
                    ['holidayCoffTwoDay', 'h_twoDay'],
                    'isAddlPaidDay',
              ],
            },
          ],
        },
        // weeoffPolicy
        {
          model: EmployeeWeekOff,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(startDate) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          required: false,
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
            startDate: { [Sequelize.Op.lte]: new Date(endDate) },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(startDate) },
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
        // LCEG Penalty
        {
          required: false,
          model: LCEGPenalty,
          where: {
            YYYYMM: month,
          },
        },
      ],
      attributes: [
        'userMasterID',
        'firstName',
        'lastName',
        'displayName',
        'userNumber',
        'photo',
        'companyMasterId',
        'gender',
      ],
      order: [['displayName', 'ASC']],
    });

    const AllHrLeaveTypes = await HrLeaveTypes.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
      include: [
        {
          model: HrLeaveMaster,
          as: 'LeaveMaster',
          attributes: ['LeaveName', 'LeaveDesc'],
        },
      ],
      order: [['LeaveTranId', 'ASC']],
    });

    const attendancedata = await attendanceCalculation1(
      usermaster,
      month,
      '',
      AllHrLeaveTypes,
    );

    if (+attendancedata.length === 0)
      return res.status(200).json({
        message: 'No data found!',
      });

    const unverifiedData = attendancedata.filter((e) => e.verified == 0);

    if (
      unverifiedData.length &&
      unverifiedData[0].user_leave &&
      unverifiedData[0].user_leave.length
    ) {
      const toAddData = [];
      const toAddLCEGPenaltyData = [];

      // for penalty

      for (const penalty of unverifiedData[0]?.penaltyArray || []) {
        toAddLCEGPenaltyData.push({
          userMasterID: unverifiedData[0].userMasterID,
          YYYYMM: +unverifiedData[0].yearMonth,
          penaltyType: penalty.penaltyType,
          penaltyValue: penalty.values,
        });
      }

      for (let m = 0; m < unverifiedData[0].user_leave.length; m++) {
        toAddData.push({
          userMasterID: unverifiedData[0].userMasterID,
          LeaveTranId: unverifiedData[0].user_leave[m].leavetranid,
          AttnYearMon: unverifiedData[0].yearMonth,
          MonDays: unverifiedData[0].MonDays,
          MonWorkDays: unverifiedData[0].WorkingDays,
          AttnVal: unverifiedData[0].user_leave[m].values,
          monthstartdate: unverifiedData[0].start_date,
          monthenddate: unverifiedData[0].end_date,
          branchID: unverifiedData[0].branchid,
          departmentID: unverifiedData[0].departid,
          designationID: unverifiedData[0].desigid,
          createBy: createBy,
          createByIp: createByIp,
        });
      }

      //delete data

      await sequelize.transaction(async (t) => {
        await HrLeaveMonthlyTrans.destroy({
          where: {
            userMasterID: userMasterID,
            AttnYearMon: month,
          },
          transaction: t,
        });

        await LCEGPenalty.destroy({
          where: {
            userMasterID: userMasterID,
            YYYYMM: month,
          },
          transaction: t,
        });

        await HrLeaveMonthlyTrans.bulkCreate(toAddData, { transaction: t });
        await LCEGPenalty.bulkCreate(toAddLCEGPenaltyData, {
          individualHooks: true,
          user: req.userDetails,
          transaction: t,
        });
      });
    }

    const finalData = attendancedata.map((e) => {
      let hasSandwich = false;
      let hasBonus = false;

      for (const l of e.user_leave) {
        const leaveId = l.leaveID;

        // convert minutes → HH:mm only for required IDs
        if (
          leaveId === HrLeaveTypesIds.WORKING_HRS ||
          leaveId === HrLeaveTypesIds.OT_HRS ||
          leaveId === HrLeaveTypesIds.PH_HRS ||
          leaveId === HrLeaveTypesIds.LEAVE_HRS
        ) {
          l.values = minutesToHoursMinutes(l.values);
        }

        // conditions
        if (
          (leaveId === HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH ||
            leaveId === HrLeaveTypesIds.LEAVE_BEHALF_ON_SANDWICH) &&
          l.values > 0
        ) {
          hasSandwich = true;
        }

        if (leaveId === HrLeaveTypesIds.ATTENDANCE_BONUS && l.values > 0) {
          hasBonus = true;
        }
      }

      // decide excluded IDs once
      let excludeIds;

      if (hasSandwich && hasBonus) {
        excludeIds = null; // no filter
      } else if (hasBonus) {
        excludeIds = new Set([
          HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH,
          HrLeaveTypesIds.LEAVE_BEHALF_ON_SANDWICH,
          HrLeaveTypesIds.ACTUAL_WEEKOFF,
          HrLeaveTypesIds.ACTUAL_HOLIDAY,
        ]);
      } else if (hasSandwich) {
        excludeIds = new Set([HrLeaveTypesIds.ATTENDANCE_BONUS]);
      } else {
        excludeIds = new Set([
          HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH,
          HrLeaveTypesIds.LEAVE_BEHALF_ON_SANDWICH,
          HrLeaveTypesIds.ACTUAL_WEEKOFF,
          HrLeaveTypesIds.ACTUAL_HOLIDAY,
          HrLeaveTypesIds.ATTENDANCE_BONUS,
        ]);
      }

      return {
        month: e.month,
        userName: e.userName,
        user_leave: excludeIds
          ? e.user_leave.filter((s) => !excludeIds.has(s.leaveID))
          : e.user_leave,
      };
    });

    return res.status(200).json({
      status: 200,
      data: finalData,
      message: 'Data get successfully.',
    });
  } catch (err) {
    next(err.message);
  }
};

exports.demoCountWiseAttendance = async (req, res, next) => {
  try {
    const { companyMasterID, userMasterID, month } = req.body;

    if (!companyMasterID || !month) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'companyMasterID and month are required!',
      });
    }

    // ==============================
    // Helpers
    // ==============================
    const getMonthDates = (month) => {
      const year = month.slice(0, 4);
      const mon = month.slice(4, 6);

      const totalDays = daysInMonth(mon, year);

      return {
        firstDate: `${year}-${mon}-01`,
        endDate: `${year}-${mon}-${totalDays}`,
        totalDays,
      };
    };

    const excludeIds = new Set([
      HrLeaveTypesIds.WORKING_HRS,
      HrLeaveTypesIds.OT_HRS,
      HrLeaveTypesIds.LEAVE_BEHALF_ON_SANDWICH,
      HrLeaveTypesIds.ACTUAL_HOLIDAY,
      HrLeaveTypesIds.ACTUAL_WEEKOFF,
      HrLeaveTypesIds.LEAVE_HRS,
    ]);

    const transformUser = (e, leaveMap, totalDays) => {
      const userMasterID = e.userMasterID;
      const attendanceData = leaveMap.get(userMasterID) || [];

      const summary = {
        [HrLeaveTypesIds.PRESENT]: '',
        [HrLeaveTypesIds.ABSENT]: '',
        [HrLeaveTypesIds.WEEKOFF]: '',
        [HrLeaveTypesIds.HOLIDAY]: '',
        [HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH]: 0,
        [HrLeaveTypesIds.WA]: 0,
      };

      const dynamicLeaves = {};

      let tempTotalDays = totalDays;

      for (const d of attendanceData) {
        if (excludeIds.has(d.leaveID)) continue;
        tempTotalDays = d.MonDays;

        const leaveId = d.leaveID;

        if (leaveId in summary) {
          summary[leaveId] = d.values === undefined ? '' : d.values;
        } else {
          dynamicLeaves[d.leave_name] = d.values;
        }
      }

      return {
        'Employee Code': e.employeeJoiningDetails?.[0]?.employeeCode || '',
        'Employee Name': e.displayName,
        'Mobile No.': e.userNumber,
        Branch: e.employeeBranches?.[0]?.branchMaster?.branchName || '',
        Department:
          e.employeeDepartments?.[0]?.department?.departmentName || '',
        Designation:
          e.employeeDesignations?.[0]?.designation?.designationName || '',
        'OT(Minutes)': '',
        'Month Days': tempTotalDays,
        'Present Days': summary[HrLeaveTypesIds.PRESENT] ?? '',
        'Absent Days': summary[HrLeaveTypesIds.ABSENT] ?? '',
        WH: summary[HrLeaveTypesIds.WEEKOFF] ?? '',
        PH: summary[HrLeaveTypesIds.HOLIDAY] ?? '',
        'Absent Due To Sandwhich':
          summary[HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH] || 0,
        WA: summary[HrLeaveTypesIds.WA] || 0,
        ...dynamicLeaves,
      };
    };

    // ==============================
    // Setup
    // ==============================
    const { firstDate, endDate, totalDays } = getMonthDates(month);

    const limit = 300;
    let offset = 0;
    let hasMore = true;

    const final = [];

    // ==============================
    // Get Leave Types once
    // ==============================
    const AllHrLeaveTypes = await HrLeaveTypes.findAll({
      where: { companyMasterID, status: 1 },
      include: [
        { model: HrLeaveMaster, as: 'LeaveMaster', attributes: ['LeaveName'] },
      ],
      order: [['LeaveTranId', 'ASC']],
    });

    // ==============================
    // Pagination Loop
    // ==============================

    const condition = { companyMasterId: companyMasterID, status: 1 };

    if (userMasterID && Array.isArray(userMasterID)) {
      condition.userMasterID = {
        [Sequelize.Op.in]: userMasterID,
      };
    }

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    let count = 0;
    while (hasMore) {
      const users = await UserMaster.findAll({
        where: { ...where, ...condition },
        attributes: [
          'userMasterID',
          'firstName',
          'middleName',
          'lastName',
          'displayName',
          'userNumber',
          'photo',
          'companyMasterId',
          'gender',
          'isFNF',
          'fnfMonth',
        ],
        order: [['displayName', 'ASC']],
        limit,
        offset,
        include: [
          ...includeModels,
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
            model: EmployeeSalaryPolicy,
            where: {
              status: 1,
              startDate: {
                [Sequelize.Op.lte]: new Date(endDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(endDate) },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            required: false,
            attributes: ['salaryPolicyID'],
            include: [
              {
                model: SalaryPolicy,
                as: 'salaryPolicy', // Alias
              },
            ],
          },
          {
            required: true,
            model: EmployeeJoiningDetails,
            where: {
              joiningDate: {
                [Sequelize.Op.lte]: new Date(endDate),
              },
              [Sequelize.Op.or]: [
                {
                  leavingDate: { [Sequelize.Op.gte]: new Date(firstDate) },
                },
                {
                  leavingDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            attributes: [
              'employeeCode',
              'dob',
              'joiningDate',
              'leavingDate',
              'salarytype',
              'employment',
              'fullMonthPresence',
              'payrollFrequency',
              'salaryCalculationAct',
            ],
          },
          {
            model: EmployeeAttendancePolicy,
            where: {
              status: 1,
              startDate: { [Sequelize.Op.lte]: new Date(endDate) },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(firstDate) },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            required: false,
            attributes: ['attendancePolicyID', 'startDate', 'endDate'],
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
                  'coff',
                  'isWHAbsentRule',
                ],
              },
            ],
          },
          {
            required: false,
            model: HrLeaveMonthlyTrans,
            where: {
              AttnYearMon: month,
            },
            attributes: [
              'AttnTranId',
              'LeaveTranId',
              'AttnVal',
              'userMasterID',
              'AttnYearMon',
              'monthstartdate',
              'monthenddate',
              'verified',
              'updateBy',
              'MonDays',
              'updatedAt',
            ],
            include: [
              {
                model: hrLeaveTypes,
                attributes: ['LeaveID'],
                include: [
                  {
                    model: HrLeaveMaster,
                    as: 'LeaveMaster',
                    attributes: ['LeaveName', 'LeaveDesc'],
                  },
                ],
              },
              {
                model: UserMaster,
                as: 'updatedBy',
                attributes: ['displayName'],
              },
            ],
          },
          // weekoffPolicy
          {
            model: EmployeeWeekOff,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(firstDate) },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            required: false,
            attributes: ['weekOffPolicyID', 'applicableDate', 'endDate'],
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
            where: {
              status: 1,
              startDate: { [Sequelize.Op.lte]: new Date(endDate) },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(firstDate) },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            attributes: ['startDate', 'endDate', 'lateEarlyPolicyMasterID'],
            include: [
              {
                model: LateEarlyPolicy,
                as: 'lateEarlyPolicy',
                attributes: ['lateEarlyPolicyType', 'deductFrom'],
              },
            ],
          },
          // LCEG Penalty
          {
            required: false,
            model: LCEGPenalty,
            where: {
              YYYYMM: month,
            },
            attributes: [
              'userMasterID',
              'YYYYMM',
              'penaltyType',
              'penaltyValue',
            ],
          },
          // employee shift
          {
            required: false,
            model: EmployeeShift,
            where: {
              status: 1,
              startDate: { [Sequelize.Op.lte]: new Date(endDate) },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(endDate) },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            attributes: ['shiftsID'],
          },
          // coff
          {
            required: false,
            model: coffMaster,
            where: { YearMM: month, From: 'AC' },
            attributes: ['YearMM', 'LeaveAddNew'],
          },
          // salary Slip
          {
            required: false,
            model: HRSalarySlip,
            where: {
              salaryYYYYMM: month,
            },
            attributes: [
              'salaryYYYYMM',
              'userMasterID',
              'holdBy',
              'holdAt',
              'paid',
              'salarySlipIssue',
            ],
            include: [
              {
                model: UserMaster,
                as: 'salaryHoldBy',
                attributes: ['displayName'],
              },
            ],
          },
        ],
      });

      if (!users.length) {
        hasMore = false;
        break;
      }

      const result = await attendanceCalculationLatest(
        users,
        month,
        AllHrLeaveTypes,
        req,
        'leave',
        false,
        null,
      );

      count++;
      const leaveMap = result.onlyLeaveDataMapUserWise;

      for (const user of users) {
        final.push(transformUser(user, leaveMap, totalDays));
      }

      offset += limit;
    }

    // ==============================
    // Response
    // ==============================
    if (!final.length) {
      return res.status(200).json({
        message: 'No data found to export!',
      });
    }

    return generateExcel(final, 'CountWiseAttendance', 'xlsx', res);
  } catch (error) {
    next(error);
  }
};

exports.uploadCountWiseAttendance = async (req, res, next) => {
  const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);

  const transaction = await sequelize.transaction();
  try {
    const { companyMasterID, month } = await req.body;

    const createBy = req.userDetails?.userMasterId || null;
    const createByIp = req.userDetails?.userIpAddress || null;

    const firstDate = month.slice(0, 4) + '-' + month.slice(4, 6) + '-' + '01';

    const monday = daysInMonth(month.slice(4, 6), month.slice(0, 4));
    const lastDate = month.slice(0, 4) + '-' + month.slice(4, 6) + '-' + monday;

    const leavetype = await hrLeaveTypes.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
      transaction,
    });

    let aTranId,
      pTranId,
      wTranId,
      hTranId,
      a_due_To_Sandwhich_TranId,
      whTranId,
      otTranId,
      wa_TranId;

    leavetype.map((e) => {
      if (e.LeaveID == 1) {
        pTranId = e.LeaveTranId;
      } else if (e.LeaveID == 5) {
        aTranId = e.LeaveTranId;
      } else if (e.LeaveID == 7) {
        wTranId = e.LeaveTranId;
      } else if (e.LeaveID == 9) {
        hTranId = e.LeaveTranId;
      } else if (e.LeaveID == 22) {
        penTranId = e.LeaveTranId;
      } else if (e.LeaveID == 20) {
        whTranId = e.LeaveTranId;
      } else if (e.LeaveID == 21) {
        otTranId = e.LeaveTranId;
      } else if (e.LeaveID == 28) {
        a_due_To_Sandwhich_TranId = e.LeaveTranId;
      } else if (e.LeaveID == HrLeaveTypesIds.WA) {
        wa_TranId = e.LeaveTranId;
      }
    });

    readXlsxFile(filePath).then(async (rows) => {
      rows.shift();

      const toAddData = [];
      const toUpdateData = [];
      const toAddOt = [];

      const { where, includeModels } = accessibleRoleWiseUsers({
        userDetails: req.userDetails,
        includeCompany: false,
      });

      const AllUserNumbers = rows.map((e) => String(e[2]));

      const AllUsers = await UserMaster.findAll({
        where: {
          ...where,
          userNumber: {
            [Sequelize.Op.in]: AllUserNumbers,
          },
          status: 1,
          companyMasterId: companyMasterID,
        },
        include: [
          ...includeModels,
          {
            required: false,
            model: EmployeeSalaryPolicy,
            where: {
              status: 1,
              startDate: {
                [Sequelize.Op.lte]: new Date(lastDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(lastDate) },
                },
                {
                  endDate: { [Sequelize.Op.eq]: null },
                },
              ],
            },
            attributes: ['salaryPolicyID'],
            include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
          },
          {
            required: false,
            model: HrLeaveMonthlyTrans,
            where: {
              AttnYearMon: month,
            },
            include: [
              {
                model: HrLeaveTypes,
                where: {
                  LeaveID: {
                    [Sequelize.Op.notIn]: [29, 30, 31],
                  },
                },
                attributes: ['LeaveID'],
              },
            ],
          },
          {
            model: EmployeeJoiningDetails,
            attributes: ['salaryCalculationAct'],
          },
        ],
        transaction,
      });

      const userSalary = HRSalaryTrasaction.findAll({
        where: {
          userMasterID: AllUsers.map((e) => e.userMasterID),
          salaryYYYYMM: month,
        },
        transaction,
      });

      const otCal = overTimeCalculationMain.findAll({
        where: {
          userMasterID: AllUsers.map((e) => e.userMasterID),
          yyyymm: +month,
        },
        transaction,
      });

      const [allUserSalary, All_OT_CAl] = await Promise.all([
        userSalary,
        otCal,
      ]);

      const allUserIds = [];

      for (const row of rows) {
        const presentdata = row[8] && typeof row[8] === 'number' ? row[8] : 0;
        const absentdata = row[9] && typeof row[9] === 'number' ? row[9] : 0;
        const whdata = row[10] && typeof row[10] === 'number' ? row[10] : 0;
        const phdata = row[11] && typeof row[11] === 'number' ? row[11] : 0;
        const a_due_To_Sandwhichdata =
          row[12] && typeof row[12] === 'number' ? row[12] : 0;

        const wa_data = row[13] && typeof row[13] === 'number' ? row[13] : 0;

        const otData = row[6] && typeof row[6] === 'number' ? row[6] : 0;

        if (
          +presentdata < 0 ||
          +absentdata < 0 ||
          +whdata < 0 ||
          +phdata < 0 ||
          +otData < 0 ||
          +a_due_To_Sandwhichdata < 0 ||
          +wa_data < 0
        ) {
          await transaction.rollback();
          return res.status(200).json({
            status: 401,
            message: 'Value Should be positive of Leave Type:' + `'${row[2]}'`,
          });
        }

        if (
          presentdata ||
          absentdata ||
          whdata ||
          phdata ||
          a_due_To_Sandwhichdata ||
          wa_data
        ) {
          const user = AllUsers.find(
            (e) => String(e.userNumber) == String(row[2]),
          );

          if (!user) continue;

          allUserIds.push(user.userMasterID);

          const salary = allUserSalary.find(
            (e) => e.userMasterID == user.userMasterID,
          );

          if (salary) {
            await transaction.rollback();
            return res.status(200).json({
              status: 401,
              message: 'Salary already calculated for ' + `'${row[2]}'`,
            });
          }

          const hrleaveData =
            user.hrLeaveMonthlyTrans && user.hrLeaveMonthlyTrans.length > 0
              ? user.hrLeaveMonthlyTrans
              : [];

          const allLeaveSum = hrleaveData
            .filter(
              (e) =>
                ![1, 5, 7, 9, 20, 21, 28, 35, 57].includes(
                  e.hrLeaveType.LeaveID,
                ),
            )
            .reduce((acc, obj) => acc + +obj.AttnVal, 0);

          if (
            +row[7] !=
            +presentdata +
              +absentdata +
              +whdata +
              +phdata +
              +a_due_To_Sandwhichdata +
              +allLeaveSum +
              +wa_data
          ) {
            await transaction.rollback();
            return res.status(200).json({
              status: 401,
              message: 'Month Days value does not match for ' + `'${row[2]}'`,
            });
          }

          const salaryCalAct =
            user.employeeJoiningDetails?.[0]?.salaryCalculationAct || null;

          const salaryPolicy =
            user.employeeSalaryPolicies &&
            user.employeeSalaryPolicies.length > 0
              ? user.employeeSalaryPolicies[0]
              : null;

          let tempMonthDays = monday;

          let start_date = firstDate,
            end_date = lastDate;

          if (salaryPolicy) {
            let date = salaryPolicy.salaryPolicy.salaryCycleDate;

            date = (date < 10 ? '0' : '') + date;

            start_date =
              month.slice(0, 4) + '-' + month.slice(4, 6) + '-' + date;

            // To Check salary consider Month

            if (salaryPolicy.salaryPolicy.salaryCycleConsider == 'E') {
              const tempDate = new Date(start_date);
              tempDate.setMonth(tempDate.getMonth() - 1);

              start_date =
                tempDate.getFullYear() +
                '-' +
                String(tempDate.getMonth() + 1).padStart(2, '0') +
                '-' +
                String(tempDate.getDate()).padStart(2, '0');

              // set Month days
              tempMonthDays = daysInMonth(
                start_date.slice(5, 7),
                start_date.slice(0, 4),
              );
            }

            let date1 = new Date(start_date);
            date1.setDate(date1.getDate() + (tempMonthDays - 1));

            end_date =
              date1.getFullYear() +
              '-' +
              String(date1.getMonth() + 1).padStart(2, '0') +
              '-' +
              String(date1.getDate()).padStart(2, '0');
          }

          // Present

          if (typeof row[8] === 'number') {
            const attData = hrleaveData.find((e) => e.LeaveTranId == pTranId);

            if (attData) {
              toUpdateData.push({
                AttnTranId: attData.AttnTranId,
                AttnVal: presentdata,
                MonDays: row[7],
                MonWorkDays: +row[7] - (+whdata + +phdata),
                monthstartdate: start_date,
                monthenddate: end_date,
                updateBy: createBy,
                updateByIp: createByIp,
                salaryCalAct,
              });
            } else {
              toAddData.push({
                userMasterID: user.userMasterID,
                LeaveTranId: pTranId,
                AttnYearMon: +month,
                MonDays: row[7],
                MonWorkDays: +row[7] - (+whdata + +phdata),
                monthstartdate: start_date,
                monthenddate: end_date,
                AttnVal: row[8],
                createBy: createBy,
                createByIp: createByIp,
                verified: 1,
                salaryCalAct,
              });
            }
          }

          // Absent

          if (typeof row[9] === 'number') {
            const attData = hrleaveData.find((e) => e.LeaveTranId == aTranId);

            if (attData) {
              toUpdateData.push({
                AttnTranId: attData.AttnTranId,
                MonDays: row[7],
                MonWorkDays: +row[7] - (+whdata + +phdata),
                monthstartdate: start_date,
                monthenddate: end_date,
                AttnVal: row[9],
                updateBy: createBy,
                updateByIp: createByIp,
                salaryCalAct,
              });

              // await HrLeaveMonthlyTrans.update({ AttnVal: row[6], updateBy: createBy, updateByIp: createByIp }, { where: { AttnTranId: attData } })
            } else {
              toAddData.push({
                userMasterID: user.userMasterID,
                LeaveTranId: aTranId,
                AttnYearMon: +month,
                MonDays: row[7],
                MonWorkDays: +row[7] - (+whdata + +phdata),
                monthstartdate: start_date,
                monthenddate: end_date,
                AttnVal: row[9],
                createBy: createBy,
                createByIp: createByIp,
                verified: 1,
                salaryCalAct,
              });
            }
          }

          // Weekoff

          if (typeof row[10] === 'number') {
            const attData = hrleaveData.find((e) => e.LeaveTranId == wTranId);

            if (attData) {
              toUpdateData.push({
                AttnTranId: attData.AttnTranId,
                MonDays: row[7],
                MonWorkDays: +row[7] - (+whdata + +phdata),
                monthstartdate: start_date,
                monthenddate: end_date,
                AttnVal: row[10],
                updateBy: createBy,
                updateByIp: createByIp,
                salaryCalAct,
              });
            } else {
              toAddData.push({
                userMasterID: user.userMasterID,
                LeaveTranId: wTranId,
                AttnYearMon: +month,
                MonDays: row[7],
                MonWorkDays: +row[7] - (+whdata + +phdata),
                monthstartdate: start_date,
                monthenddate: end_date,
                AttnVal: row[10],
                createBy: createBy,
                createByIp: createByIp,
                verified: 1,
                salaryCalAct,
              });
            }
          }

          // Holiday

          if (typeof row[11] === 'number') {
            const attData = hrleaveData.find((e) => e.LeaveTranId == hTranId);

            if (attData) {
              toUpdateData.push({
                AttnTranId: attData.AttnTranId,
                MonDays: row[7],
                MonWorkDays: +row[7] - (+whdata + +phdata),
                monthstartdate: start_date,
                monthenddate: end_date,
                AttnVal: row[11],
                updateBy: createBy,
                updateByIp: createByIp,
                salaryCalAct,
              });

              // await HrLeaveMonthlyTrans.update({ AttnVal: row[6], updateBy: createBy, updateByIp: createByIp }, { where: { AttnTranId: attData } })
            } else {
              toAddData.push({
                userMasterID: user.userMasterID,
                LeaveTranId: hTranId,
                AttnYearMon: +month,
                MonDays: row[7],
                MonWorkDays: +row[7] - (+whdata + +phdata),
                monthstartdate: start_date,
                monthenddate: end_date,
                AttnVal: row[11],
                createBy: createBy,
                createByIp: createByIp,
                verified: 1,
                salaryCalAct,
              });
            }
          }

          // Holiday

          if (typeof row[12] === 'number') {
            const attData = hrleaveData.find(
              (e) => e.LeaveTranId == a_due_To_Sandwhich_TranId,
            );

            if (attData) {
              toUpdateData.push({
                AttnTranId: attData.AttnTranId,
                MonDays: row[7],
                MonWorkDays: +row[7] - (+whdata + +phdata),
                monthstartdate: start_date,
                monthenddate: end_date,
                AttnVal: row[12],
                updateBy: createBy,
                updateByIp: createByIp,
                salaryCalAct,
              });

              // await HrLeaveMonthlyTrans.update({ AttnVal: row[6], updateBy: createBy, updateByIp: createByIp }, { where: { AttnTranId: attData } })
            } else {
              toAddData.push({
                userMasterID: user.userMasterID,
                LeaveTranId: a_due_To_Sandwhich_TranId,
                AttnYearMon: +month,
                MonDays: row[7],
                MonWorkDays: +row[7] - (+whdata + +phdata),
                monthstartdate: start_date,
                monthenddate: end_date,
                AttnVal: row[12],
                createBy: createBy,
                createByIp: createByIp,
                verified: 1,
                salaryCalAct,
              });
            }
          }

          //WA

          if (typeof row[13] === 'number') {
            const attData = hrleaveData.find((e) => e.LeaveTranId == wa_TranId);

            if (attData) {
              toUpdateData.push({
                AttnTranId: attData.AttnTranId,
                MonDays: row[7],
                MonWorkDays: +row[7] - (+whdata + +phdata),
                monthstartdate: start_date,
                monthenddate: end_date,
                AttnVal: row[13],
                updateBy: createBy,
                updateByIp: createByIp,
                salaryCalAct,
              });
            } else {
              toAddData.push({
                userMasterID: user.userMasterID,
                LeaveTranId: wa_TranId,
                AttnYearMon: +month,
                MonDays: row[7],
                MonWorkDays: +row[7] - (+whdata + +phdata),
                monthstartdate: start_date,
                monthenddate: end_date,
                AttnVal: row[13],
                createBy: createBy,
                createByIp: createByIp,
                verified: 1,
                salaryCalAct,
              });
            }
          }

          await HrLeaveMonthlyTrans.destroy({
            where: {
              LeaveTranId: {
                [Sequelize.Op.in]: [whTranId, otTranId],
              },
              AttnYearMon: month,
              userMasterID: user.userMasterID,
            },
            transaction,
          });

          if (row[6] && typeof row[6] === 'number') {
            const clculated_ot = All_OT_CAl.find(
              (e) => e.userMasterID == user.userMasterID,
            );

            if (clculated_ot) {
              await transaction.rollback();
              return res.status(200).json({
                status: 401,
                message:
                  'Overtime already calculated for' +
                  `'${row[2]}'.` +
                  'Delete overtime calculation to add overtime.',
              });
            }

            const overtime = await overTimeCalculation.findAll({
              where: {
                UserMasterID: user.userMasterID,
                OverTimeDate: {
                  [Sequelize.Op.between]: [start_date, end_date],
                },
              },
              transaction,
            });

            const otids = overtime.map((e) => +e.OverTimeID);

            await overtimeAuthorizationRequest.destroy({
              where: {
                ReferenceID: {
                  [Sequelize.Op.in]: otids,
                },
              },
              transaction,
            });

            await overTimeCalculation.destroy({
              where: {
                OverTimeID: {
                  [Sequelize.Op.in]: otids,
                },
                UserMasterID: user.userMasterID,
              },
              transaction,
            });

            const overtimeData = {
              CompanyMasterID: user.companyMasterId,
              UserMasterID: user.userMasterID,
              OverTimeDate: end_date,
              UpdateOverTimeHourAndMin: +row[6],
              OverTimeHourAndMin: +row[6],
              AuthorizationRequired: 3,
              createBy: createBy,
              createByIp: createByIp,
            };

            toAddOt.push(overtimeData);
          }

          await HrLeaveMonthlyTrans.update(
            {
              verified: 1,
              updateBy: req.userDetails.userMasterId,
              updateByIp: req.userDetails.userIpAddress,
              MonDays: row[7],
              MonWorkDays: +row[7] - (+whdata + +phdata),
              monthstartdate: start_date,
              monthenddate: end_date,
              salaryCalAct,
            },
            {
              where: {
                userMasterID: user.userMasterID,
                AttnYearMon: month,
              },
              transaction,
            },
          );
        }
      }

      await HrLeaveMonthlyTrans.bulkCreate(toAddData, { transaction });

      await overTimeCalculation.bulkCreate(toAddOt, { transaction });

      await Promise.all(
        toUpdateData.map((data) =>
          HrLeaveMonthlyTrans.update(
            {
              MonDays: data.MonDays,
              MonWorkDays: data.MonWorkDays,
              AttnVal: data.AttnVal,
              updateBy: data.updateBy,
              updateByIp: data.updateByIp,
              verified: 1,
              monthstartdate: data.monthstartdate,
              monthenddate: data.monthenddate,
              salaryCalAct: data.salaryCalAct,
            },
            { where: { AttnTranId: data.AttnTranId }, transaction },
          ),
        ),
      );

      fs.unlink(filePath, function (err) {});

      await transaction.commit();
      return res.status(200).send({
        status: 200,
        message: ' The File Upload Successfully: ' + req.file.originalname,
      });
    });
  } catch (error) {
    fs.unlink(filePath, function (err) {});
    await transaction.rollback();
    next(error);
  }
};

exports.listMonthlyAttendanceEntry = async (req, res, next) => {
  try {
    const { companyMasterID, branchMasterID, YYYYMM, Export } = req.body;

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const CurrentMonth = currentDate.slice(0, 7).replace('-', '');

    if (+YYYYMM > +CurrentMonth) {
      return res.status(200).json({
        status: 401,
        message: 'You cannot select a future month.',
      });
    }

    const year = String(YYYYMM).slice(0, 4);
    const month = String(YYYYMM).slice(4, 6);

    const enddate = year + '-' + month + '-' + daysInMonth(month, year);

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const AllUserData = await UserMaster.findAll({
      where: {
        ...where,
        companyMasterId: companyMasterID,
        status: 1,
      },
      include: [
        ...includeModels,
        {
          required: false,
          model: HrLeaveMonthlyTrans,
          where: {
            AttnYearMon: YYYYMM,
            verified: 1,
          },
          attributes: [
            'AttnTranId',
            'LeaveTranId',
            'AttnVal',
            'userMasterID',
            'AttnYearMon',
            'monthstartdate',
            'monthenddate',
            'verified',
            'updateBy',
            'MonWorkDays',
          ],
          include: [
            {
              model: hrLeaveTypes,
              attributes: ['LeaveID'],
            },
          ],
        },
        {
          model: EmployeeJoiningDetails,
          attributes: [
            'employeeCode',
            'joiningDate',
            'leavingDate',
            'salaryCalculationAct',
            'fullMonthPresence',
          ],
        },
        {
          required: false,
          model: employeeSalaryPolicies,
          where: {
            status: 1,
            startDate: {
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
          attributes: ['salaryPolicyID'],
          include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
        },

        {
          model: EmployeeAttendancePolicy,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: new Date(enddate) },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(enddate) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          required: false,
          attributes: ['attendancePolicyID'],
          include: [
            {
              model: AttendancePolicy,
              as: 'attendancePolicy',
              attributes: ['attendancePolicyID', 'WHPHPriority'],
            },
          ],
        },

        {
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(enddate) },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(enddate) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          required: false,
          attributes: ['designationID'],
          include: [
            {
              model: Designation,
              as: 'designation',
              attributes: ['designationName', 'designationId'],
            },
          ],
        },
        {
          model: EmployeeDepartment,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(enddate) },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(enddate) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          required: false,
          attributes: ['departmentID'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName', 'departmentId'],
            },
          ],
        },
        {
          model: EmployeeBranch,
          where: {
            status: 1,
            ...(branchMasterID && { branchID: branchMasterID }),
            applicableDate: { [Sequelize.Op.lte]: new Date(enddate) },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(enddate) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          required: branchMasterID ? true : false,
          attributes: ['branchID'],
          include: [
            {
              model: BranchMaster,
              as: 'branchMaster',
              attributes: ['branchName', 'branchMasterID'],
            },
          ],
        },
        {
          model: EmployeeWeekOff,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(enddate) },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(enddate) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          required: false,
          attributes: ['weekOffPolicyID'],
          include: [
            {
              model: weekOffPolicy,
              as: 'weekoff',
            },
          ],
        },
        {
          separate: true,
          required: false,
          model: HRSalaryTrasaction,
          where: {
            salaryYYYYMM: YYYYMM,
          },
          limit: 1,
        },
      ],
      attributes: [
        'userMasterID',
        'displayName',
        'userNumber',
        'companyMasterId',
      ],
      order: [['displayName', 'ASC']],
    });

    const finalData = [];

    for (const data of AllUserData) {
      const userMasterID = data.userMasterID;

      // Employee joining Details
      const empjoining = data.employeeJoiningDetails?.[0] || null;

      // Attendance calculation data
      const userAttnCalData = data.hrLeaveMonthlyTrans || [];

      const obj = {
        ...(!Export && { userMasterID }),
        EmployeeCode: empjoining?.employeeCode || '',
        EmployeeName: data.displayName,
        UserNumber: data.userNumber,
        Branch: data.employeeBranches?.[0]?.branchMaster?.branchName || '',
        Department:
          data.employeeDepartments?.[0]?.department?.departmentName || '',
        Designation:
          data.employeeDesignations?.[0]?.designation?.designationName || '',
        StartDate: '',
        EndDate: '',
        salaryPolicyType: 'monthwise',
        salaryCalculated: false,
        totalDays: null,
        leavesArray: [],
        Weekoffvalue: 0,
        weekoffPolicyType: '',
        monday: null,
        verified: 0,
      };

      let monday = daysInMonth(month, year);

      obj.totalDays = monday;

      //--------------------------Employee salary policy ----------------------

      const user_salaryPolicy =
        data.employeeSalaryPolicies?.[0]?.salaryPolicy || null;

      let end_date;
      let start_date;
      let salaryPolicyType = '';
      let salaryPolicyMonthDays = null;

      // ----------- set start date and end date according to salary policy -------

      if (user_salaryPolicy) {
        let date = user_salaryPolicy.salaryCycleDate;
        salaryPolicyType = user_salaryPolicy.salarycalculationBasedon;

        // set fix month days
        if (
          salaryPolicyType != 'hourwise' &&
          user_salaryPolicy.MonthDaysType == MonthDaysTypeEnum.FIX &&
          user_salaryPolicy.fixDays
        )
          salaryPolicyMonthDays = user_salaryPolicy.fixDays;

        date = (date < 10 ? '0' : '') + date;

        start_date = year + '-' + month + '-' + date;

        // To Check salary consider Month

        if (user_salaryPolicy.salaryCycleConsider == 'E') {
          const tempDate = new Date(start_date);
          tempDate.setMonth(tempDate.getMonth() - 1);

          start_date =
            tempDate.getFullYear() +
            '-' +
            String(tempDate.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(tempDate.getDate()).padStart(2, '0');

          // set Month days
          monday = daysInMonth(start_date.slice(5, 7), start_date.slice(0, 4));
        }

        let date1 = new Date(start_date);
        date1.setDate(date1.getDate() + (monday - 1));

        end_date =
          date1.getFullYear() +
          '-' +
          String(date1.getMonth() + 1).padStart(2, '0') +
          '-' +
          String(date1.getDate()).padStart(2, '0');
      } else {
        start_date = year + '-' + month + '-' + '01';
        end_date = year + '-' + month + '-' + monday;
      }

      let joining = false;
      let calculateFixMonthDays = true;

      if (empjoining) {
        if (
          empjoining.joiningDate > start_date &&
          empjoining.joiningDate <= end_date
        ) {
          start_date = empjoining.joiningDate;
          calculateFixMonthDays = false;
        }
        // not join yet
        if (empjoining.joiningDate > end_date) {
          continue;
        }

        // end date
        if (empjoining.leavingDate) {
          if (
            empjoining.leavingDate < end_date &&
            empjoining.leavingDate >= start_date
          ) {
            end_date = empjoining.leavingDate;
            calculateFixMonthDays = false;
          }
          // left employee
          if (empjoining.leavingDate < start_date) {
            continue;
          }
        }

        if (start_date > end_date) {
          continue;
        } else {
          joining = true;
        }
      }

      // if not joining
      if (!joining) continue;

      // set salary Policy Type
      obj.salaryPolicyType = salaryPolicyType;

      //set monthdays

      obj.monday = salaryPolicyMonthDays || monday;

      // get Weekoff Policy
      const weekoffPolicy = data.employeeWeekOffs?.[0]?.weekoff || null;
      // weekoff Policy Type
      const weekoffPolicyType = weekoffPolicy?.weekoffType || null;

      obj.weekoffPolicyType = weekoffPolicyType;

      // set weekoff Policy type
      if (
        weekoffPolicy &&
        weekoffPolicyType &&
        !weekoffPolicy.isNoWeekoffPolicy
      ) {
        const map = {
          [weekoffTypeEnum.MONTHLYFIX]: weekoffPolicy.monthlyFix,
          [weekoffTypeEnum.ONPAIDDAYS]: weekoffPolicy.paidDays,
          [weekoffTypeEnum.ONPRESENTDAY]: weekoffPolicy.presentDays,
        };

        obj.Weekoffvalue = map[weekoffPolicyType] ?? 0;
      }

      // if attendance calculation is verified

      if (userAttnCalData && userAttnCalData.length) {
        // set startdate and endDate
        (obj.StartDate = userAttnCalData[0].monthstartdate),
          (obj.EndDate = userAttnCalData[0].monthenddate);

        if (Export) {
          obj.StartDate = obj.StartDate.split('-').reverse().join('-');
          obj.EndDate = obj.EndDate.split('-').reverse().join('-');
        }

        obj.totalDays = getDaysFromDates(
          userAttnCalData[0].monthstartdate,
          userAttnCalData[0].monthenddate,
        );

        obj['Present'] =
          userAttnCalData.find((e) => e.hrLeaveType.LeaveID == 1)?.AttnVal || 0;
        obj['Absent'] =
          userAttnCalData.find((e) => e.hrLeaveType.LeaveID == 5)?.AttnVal || 0;
        obj['WeekOff'] =
          userAttnCalData.find((e) => e.hrLeaveType.LeaveID == 7)?.AttnVal || 0;
        obj['Holiday'] =
          userAttnCalData.find((e) => e.hrLeaveType.LeaveID == 9)?.AttnVal || 0;

        // filter Array leave types
        const leaveArray = userAttnCalData.filter(
          (e) =>
            ![1, 5, 7, 9, 20, 21, 22, 29, 30, 31, 32, 35].includes(
              e.hrLeaveType.LeaveID,
            ),
        );

        const paidLeaves = leaveArray
          .filter((e) => ![28, 18].includes(e.hrLeaveType.LeaveID))
          .reduce((acc, obj) => acc + +obj.AttnVal, 0);
        const unpaidLeaves = leaveArray
          .filter((e) => [28, 18].includes(e.hrLeaveType.LeaveID))
          .reduce((acc, obj) => acc + +obj.AttnVal, 0);

        obj['PaidLeaves'] = +paidLeaves || 0;
        obj['UnPaidLeaves'] = +unpaidLeaves || 0;

        obj.leavesArray = leaveArray.map((e) => {
          return {
            LeaveTranId: e.LeaveTranId,
            value: e.AttnVal,
          };
        });

        obj.verified = 1;

        // get salary data
        const salaryData = data.hrSalaryTrasactions || [];

        if (salaryData.length) obj.salaryCalculated = true;

        if (Export) {
          delete obj.Weekoffvalue;
          delete obj.salaryPolicyType;
          delete obj.salaryCalculated;
          delete obj.weekoffPolicyType;
          delete obj.totalDays;
          delete obj.monday;
          delete obj.leavesArray;
          delete obj.verified;
        }

        finalData.push(obj);

        continue;
      }

      // set startdate and endDate
      (obj.StartDate = start_date), (obj.EndDate = end_date);

      if (Export) {
        obj.StartDate = obj.StartDate.split('-').reverse().join('-');
        obj.EndDate = obj.EndDate.split('-').reverse().join('-');
      }

      // set total days

      obj.totalDays =
        calculateFixMonthDays && salaryPolicyMonthDays
          ? salaryPolicyMonthDays
          : getDaysFromDates(start_date, end_date);

      let weekoffCount = 0;
      let findWeekoff = true;

      const WH_Condition = {
        userMasterID: userMasterID,
        date: {
          [Sequelize.Op.between]: [start_date, end_date],
        },
        tableName: 'holiday',
        [Sequelize.Op.and]: Sequelize.literal(`(date, "tableName") IN (
          SELECT date, "tableName"
          FROM "weekoffHolidayTrans"
          WHERE "userMasterID" = ${userMasterID}
            AND date BETWEEN '${start_date}' AND '${end_date}'
            AND ("optionalHoliday" IS FALSE OR "optionalHoliday" IS NULL) AND "tableName"='holiday'
          GROUP BY date,"tableName"
        )`),
      };

      // find Weekoff
      if (
        weekoffPolicy &&
        weekoffPolicyType &&
        !weekoffPolicy.isNoWeekoffPolicy
      ) {
        // if monthly fix weekoff or on present days
        if (
          [
            weekoffTypeEnum.MONTHLYFIX,
            weekoffTypeEnum.ONPAIDDAYS,
            weekoffTypeEnum.ONPRESENTDAY,
          ].includes(weekoffPolicyType)
        ) {
          weekoffCount =
            weekoffPolicyType == weekoffTypeEnum.MONTHLYFIX
              ? +weekoffPolicy.monthlyFix
              : 0;
          findWeekoff = false;
        }

        // if fix weekoff
        if (
          ![
            weekoffTypeEnum.MONTHLYFIX,
            weekoffTypeEnum.ONPAIDDAYS,
            weekoffTypeEnum.ONPRESENTDAY,
          ].includes(weekoffPolicyType)
        ) {
          //delete tablename
          delete WH_Condition.tableName;

          const weekOffHolidayPriority =
            data.employeeAttendancePolicies?.[0]?.attendancePolicy
              ?.WHPHPriority || null;

          const typeCondition =
            weekOffHolidayPriority === 'PH' ? "'holiday'" : "'weekoff'";

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
                AND date BETWEEN '${start_date}' AND '${end_date}'
                AND ("optionalHoliday" IS FALSE OR "optionalHoliday" IS NULL)
              GROUP BY date
            )`);
        }
      }
      // find weekoff holiday and leave data
      const [weekoffholidays, leave] = await Promise.all([
        weekoffHolidayTran.findAll({
          raw: true,
          where: WH_Condition,
          order: [
            ['date', 'ASC'],
            ['tableName', 'DESC'],
          ],
        }),
        UserLeaveTransaction.findAll({
          where: {
            date: {
              [Sequelize.Op.between]: [start_date, end_date],
            },
            status: 1,
          },
          include: [
            {
              required: true,
              model: UserLeave,
              where: { userMasterID: userMasterID, status: 1 },
              attributes: ['DayType'],
            },
            {
              required: true,
              model: HrLeaveTypes,
              attributes: ['LeaveID'],
            },
          ],
        }),
      ]);

      // if find weekoff is true
      if (findWeekoff) {
        const finalWeekoffs = checkLeaveOnWH(
          leave,
          weekoffholidays.filter((e) => e.tableName == 'weekoff'),
          false,
        );
        weekoffCount = finalWeekoffs.reduce((acc, obj) => acc + +obj.value, 0);
      }

      // get holidays
      const finalHolidays = checkLeaveOnWH(
        leave,
        weekoffholidays.filter((e) => e.tableName == 'holiday'),
        false,
      );

      const holidayCount = finalHolidays.reduce(
        (acc, obj) => acc + +obj.value,
        0,
      );

      const paidLeaves = leave
        .filter((e) => ![5, 18].includes(e.hrLeaveType.LeaveID))
        .reduce((acc, obj) => acc + +obj.days, 0);
      const unpaidLeaves = leave
        .filter((e) => [5, 18].includes(e.hrLeaveType.LeaveID))
        .reduce((acc, obj) => acc + +obj.days, 0);

      const totalLeaves = +paidLeaves + +unpaidLeaves;

      obj['Present'] = !Export ? null : '';
      obj['Absent'] =
        +obj.totalDays - (+weekoffCount + +holidayCount + +totalLeaves) > 0
          ? +obj.totalDays - (+weekoffCount + +holidayCount + +totalLeaves)
          : 0;
      obj['WeekOff'] = +weekoffCount || 0;
      obj['Holiday'] = +holidayCount || 0;
      obj['PaidLeaves'] = +paidLeaves || 0;
      obj['UnPaidLeaves'] = +unpaidLeaves || 0;
      obj.leavesArray = leave.map((e) => {
        return {
          LeaveTranId: e.LeaveTranId,
          value: e.days,
        };
      });

      if (Export) {
        delete obj.Weekoffvalue;
        delete obj.salaryPolicyType;
        delete obj.salaryCalculated;
        delete obj.weekoffPolicyType;
        delete obj.totalDays;
        delete obj.monday;
        delete obj.leavesArray;
        delete obj.verified;
      }

      finalData.push(obj);
    }

    if (Export)
      return await generateExcel(finalData, 'Monthly Attendance', 'xlsx', res);

    return res.status(200).json({
      status: 200,
      data: finalData,
      totalcount: finalData.length,
    });
  } catch (error) {
    next(error);
  }
};

exports.saveMonthlyAttendanceEntry = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { dataArray = [], companyMasterID, YYYYMM } = req.body;

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const CurrentMonth = currentDate.slice(0, 7).replace('-', '');

    if (+YYYYMM > +CurrentMonth) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'You cannot select a future month.',
      });
    }

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    const AllUserIds = dataArray.map((e) => e.userMasterID);

    // find salary Data

    const [salaryData, AllHrleaveTypes, AllEmpJoining] = await Promise.all([
      HRSalaryTrasaction.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: AllUserIds,
          },
          salaryYYYYMM: YYYYMM,
        },
        group: ['userMasterID', 'salaryYYYYMM'],
        attributes: ['userMasterID', 'salaryYYYYMM'],
      }),
      HrLeaveTypes.findAll({
        where: {
          companyMasterID,
          status: 1,
          LeaveID: {
            [Sequelize.Op.notIn]: [20, 21, 22, 35],
          },
        },
        order: [['LeaveTranId', 'ASC']],
      }),
      EmployeeJoiningDetails.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: AllUserIds,
          },
        },
        attributes: ['salaryCalculationAct', 'userMasterID'],
      }),
    ]);

    const finalDataToAdd = [];

    const userMasterIds = [];

    const salaryCalculatedUser = [];

    for (const data of dataArray) {
      const userMasterID = data.userMasterID;

      if (salaryData.find((e) => e.userMasterID == userMasterID)) {
        salaryCalculatedUser.push(data.EmployeeName);
        continue;
      }

      // Validate attendance days
      const totalCalculatedDays =
        +data.Present +
        +data.Absent +
        +data.WeekOff +
        +data.Holiday +
        +data.PaidLeaves +
        +data.UnPaidLeaves;
      if (+data.totalDays !== totalCalculatedDays) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `Attendance days mismatch for ${data.employeeName}. Please check.`,
        });
      }

      userMasterIds.push(userMasterID);

      // if present is null then only delete data not add

      if (data.Present == null) continue;

      const empJoining = AllEmpJoining?.find(
        (e) => e.userMasterID == userMasterID,
      );
      const salaryCalAct = empJoining?.salaryCalculationAct || null;

      const leavesArray = data.leavesArray || [];

      for (const leaveType of AllHrleaveTypes) {
        const leaveID = leaveType.LeaveID;
        const LeaveTranId = leaveType.LeaveTranId;
        let AttnVal = 0;

        switch (leaveID) {
          case 1:
            AttnVal = +data.Present;
            break;
          case 5:
            AttnVal = +data.Absent;
            break;
          case 7:
          case 30:
            AttnVal = +data.WeekOff;
            break;
          case 9:
          case 31:
            AttnVal = +data.Holiday;
            break;
          case 29:
          case 32:
            AttnVal = 0;
            break;
          default:
            // Sum value from leavesArray for matching leave type
            AttnVal = leavesArray
              .filter((l) => l.LeaveTranId == LeaveTranId)
              .reduce((sum, l) => sum + +l.value, 0);
            break;
        }

        finalDataToAdd.push({
          userMasterID,
          AttnYearMon: YYYYMM,
          LeaveTranId,
          MonDays: data.monday,
          MonWorkDays: data.totalDays,
          AttnVal,
          createBy,
          createByIp,
          updateBy: createBy,
          updateByIp: createByIp,
          verified: 1,
          monthstartdate: data.StartDate,
          monthenddate: data.EndDate,
          salaryCalAct,
        });
      }
    }

    // delete All Previous Data
    await HrLeaveMonthlyTrans.destroy({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: userMasterIds,
        },
        AttnYearMon: YYYYMM,
      },
      transaction,
    });

    // Add all Attendance data
    await HrLeaveMonthlyTrans.bulkCreate(finalDataToAdd, { transaction });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: salaryCalculatedUser.length
        ? `Salary calulated for ${salaryCalculatedUser.join(',')} and other data save successfully.`
        : 'Data save successfully.',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.deleteMonthlyAttendanceEntry = async (req, res, next) => {
  try {
    const { userMasterID = [], YYYYMM } = req.body;

    if (!Array.isArray(userMasterID) || userMasterID.length === 0 || !YYYYMM) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }

    const AllSalary = await HRSalaryTrasaction.findAll({
      raw: true,
      where: {
        userMasterID: {
          [Sequelize.Op.in]: userMasterID,
        },
        salaryYYYYMM: YYYYMM,
      },
      include: [
        {
          model: UserMaster,
          attributes: [],
        },
      ],
      group: [
        'hrSalaryTrasaction.userMasterID',
        'hrSalaryTrasaction.salaryYYYYMM',
        'userMaster.displayName',
        'userMaster.userMasterID',
      ],
      attributes: [
        'hrSalaryTrasaction.userMasterID',
        'hrSalaryTrasaction.salaryYYYYMM',
        'userMaster.displayName',
      ],
    });

    const salaryCalulatedUser = AllSalary.filter((e) =>
      userMasterID.includes(+e.userMasterID),
    );

    if (salaryCalulatedUser.length) {
      return res.status(200).json({
        status: 401,
        message: `Salary already calculated for ${salaryCalulatedUser.map((e) => e.displayName).join(',')} `,
      });
    }

    await HrLeaveMonthlyTrans.destroy({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: userMasterID,
        },
        AttnYearMon: YYYYMM,
      },
    });

    return res.status(200).json({
      status: 200,
      message: `Attendance Entry deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPendingCountsForAttendanceAndSalaryCalculation = async (
  req,
  res,
  next,
) => {
  try {
    const { userMasterID, authorizationStatus, startDate, endDate } = req?.body;

    if (
      (Array.isArray(userMasterID) && userMasterID.length == 0) ||
      (!Array.isArray(userMasterID) && !userMasterID) ||
      !authorizationStatus ||
      !startDate ||
      !endDate
    ) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.NOT_FOUND,
        message: message.errorMessage.INVALID_REQUEST,
      });
    }

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const user = await UserMaster.findAll({
      where: {
        ...where,
        userMasterID,
      },
      include: [...includeModels],
      attributes: ['userMasterID'],
    });

    const userIds = user.map((e) => e.userMasterID);

    const attendanceCorrCondition = {
      authorizationStatus,
      AttendanceDate: {
        [Sequelize.Op.between]: [startDate, endDate],
      },
      userMasterID: userIds,
      status: 1,
    };

    const leaveCondition = {
      authorizationStatus,
      FromDate: {
        [Sequelize.Op.lte]: endDate,
      },
      ToDate: {
        [Sequelize.Op.gte]: startDate,
      },
      userMasterID: userIds,
      status: 1,
    };

    const extraDaysCondition = {
      authorizationStatus,
      date: {
        [Sequelize.Op.between]: [startDate, endDate],
      },
      userMasterID: userIds,
    };

    const missPunchCondition = {
      userMasterID: userIds,
      OutDateTime: { [Sequelize.Op.eq]: null },
      AttendanceDate: {
        [Sequelize.Op.between]: [new Date(startDate), new Date(endDate)],
        [Sequelize.Op.ne]: new Date().toISOString().slice(0, 10),
      },
    };

    const [
      attendanceCorrectionCount,
      leaveCount,
      odCount,
      extraDaysCount,
      missPunchCount,
    ] = await Promise.all([
      AttendanceCorrectionRequest.count({
        where: attendanceCorrCondition,
      }),

      UserLeave.count({
        where: leaveCondition,
        include: [
          {
            model: hrLeaveTypes,
            where: {
              LeaveID: {
                [Sequelize.Op.ne]: 25,
              },
            },
          },
        ],
      }),

      UserLeave.count({
        where: leaveCondition,
        include: [
          {
            model: hrLeaveTypes,
            where: {
              LeaveID: {
                [Sequelize.Op.eq]: 25,
              },
            },
          },
        ],
      }),

      ExtraDays.count({
        where: extraDaysCondition,
      }),

      attendanceTransaction.count({
        where: missPunchCondition,
      }),
    ]);

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: {
        attendanceCorrectionCount,
        leaveCount,
        odCount,
        extraDaysCount,
        missPunchCount,
        // leaveCount +
        totalCount:
          attendanceCorrectionCount + odCount + extraDaysCount + missPunchCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
