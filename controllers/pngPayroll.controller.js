/** @format */

const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const {
  getStartAndEndDate,
  accessibleUsers,
  PNGAttendanceCalculation,
  daysInMonth,
  getUserSalaryMasterByMonth,
  calculateDays,
  getMonthlyDailyWorkingMinutes,
  getAttendanceData,
  calculatePenaltyInSalaryPNG,
  penaltyDeductionCalculation,
  getPayBonusAmount,
  minutesToHoursMinutes,
  pngNationalTaxCalculation,
  getYearMonthByRange,
  pngExpatTaxCalculation,
  getSalaryDataPNG,
  pngBenefitTaxCalculation,
  pngExpat_HRA_MVA_Calculation,
  getRoundOffSalary,
  month_dict,
  calculateLeaveEncashment_PNG,
  getDaysFromDates,
  pngExpat_Projected_Salary_Calculation,
  resolveAttendanceBonusSlot,
  pngNationalTaxRebateCalculation,
  calculateProjectedSalary_National_PNG,
  getTaxForMonth,
} = require('../utils/commonUtilFunctions');
const {
  PayrollFrequencyType,
  weekoffTypeEnum,
  NCSLDeductionsEnum,
  OTCalculationRatio,
  TaxApplicabilityType,
  leaveEncashmentPercent,
  paymentMode,
  ExpatHRAValue,
  ExpatMVAValue,
  attendanceBonusSlotEnum,
  attendanceBonusForEnum,
  attendanceBonusType,
  longServicePayEncashmentTax_National,
  payheadMasterIdsMapping,
  extraDaysFromEnum,
} = require('../utils/dbUtils');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const SalaryPolicy = require('../models/salaryPolicy');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const EmployeeWeekOff = require('../models/employeeWeekOff');
const weekOffPolicy = require('../models/weekOffPolicy');
const coffMaster = require('../models/coffMaster');
const EmployeeLateEarlyPolicy = require('../models/employeeLateEarlyPolicy');
const LateEarlyPolicy = require('../models/lateEarlyPolicy');
const LCEGPenalty = require('../models/lcegPenalty');
const HRSalarySlip = require('../models/hrSalarySlip');
const UserMaster = require('../models/userMaster');
const ShiftRoster = require('../models/shiftRoster');
const EmployeeShift = require('../models/employeeShift');
const Shift = require('../models/shift');
const ShiftTIme = require('../models/shiftTime');
const EmployeeAttendanceBonusPolicy = require('../models/empattandancebonuspolicy');
const AttendanceBonusPolicy = require('../models/attendanceBonusPolicy');
const Incentivetype = require('../models/incentivetype');
const attendanceTransaction = require('../models/attendanceTransaction');
const Employeeincentive = require('../models/employeeincentive');
const HrLeaveBalance = require('../models/hrLeaveBalance');
const ExtraDays = require('../models/extraDays');
const { usermessage } = require('../response_message/message');
const HRSalaryTrasaction = require('../models/hrSalaryTransaction');
const BankMaster = require('../models/bankMaster');
const deposit = require('../models/deposit');
const depositcategory = require('../models/depositCategory');
const empLeavePolicy = require('../models/empLeavePolicy');
const LeaveEncashment = require('../models/leaveEncashment');
const EmployeeBonusPolicy = require('../models/employeeBonusPolicy');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const HRSalaryFields = require('../models/hrSalaryFields');
const Payheadmaster = require('../models/payhead');
const GradeStructure = require('../models/gradeStructure');
const employeeLeavePolicy = require('../models/employeeLeavePolicy');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const advancePayment = require('../models/advancePayment');
const EmployeeRepayment = require('../models/employeeRepayment');
const LoanTransaction = require('../models/loanTransaction');
const LoanMaster = require('../models/loanMaster');
const overTimeCalculationMain = require('../models/overTimeCalculationMain');
const ProfessionalTaxSlabMaster = require('../models/professionaltaxmaster');
const EmployeeBonus = require('../models/employeeBonus');
const EmployeePenalty = require('../models/employeePenalty');
const EmpNCSLDeduction = require('../models/empNCSLDeduction');
const SkipEmpNCSLDeduction = require('../models/skipEmpNCSLDeduction');
const HRSalaryMasterFields = require('../models/hrSalaryMaster');
const BonusPolicy = require('../models/bonusPolicy');
const Penalty = require('../models/penalty');
const BankBranch = require('../models/bankBranch');
const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');
const userFamily = require('../models/userfamily');
const PngNationalTaxSlab = require('../models/pngNationalTaxSlab');
const PreviousSalary = require('../models/previousSalary');
const incomeTaxSlabs = require('../models/incomeTaxSlabs');
const incomeTaxSlabMaster = require('../models/incomeTaxSlabMaster');
const TaxStandardDeduction = require('../models/taxStandardDeduction');
const YTDIncomeTaxSlab = require('../models/YTDIncomeTaxSlab');
const { pngGenerateSalaryFileParams } = require('../utils/commonVars');
const moment = require('moment');
const expensePayment = require('../models/expensePayment');
const YTDTaxEntries = require('../models/YTDTaxEntries');
const PNGNationalTaxRebate = require('../models/pngNationalTaxRebate');
const CompanyBankDetails = require('../models/companyBankDetails');

const getTemplate = (type) => {
  const file = path.join(__dirname, `../html/${type}.html`);
  return file;
};

const readFile = (name) => {
  return new Promise((resolve, reject) => {
    fs.readFile(name, 'utf-8', (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

Handlebars.registerHelper({
  eq: (v1, v2) => v1 === v2,
  ne: (v1, v2) => v1 !== v2,
  lt: (v1, v2) => v1 < v2,
  gt: (v1, v2) => v1 > v2,
  lte: (v1, v2) => v1 <= v2,
  gte: (v1, v2) => v1 >= v2,
  and() {
    return Array.prototype.every.call(arguments, Boolean);
  },
  or() {
    return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
  },
});

async function calculateExtraDaysPNG(
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

  const grossAmount =
    salaryData.find((e) => e.payheadMasterId == 50)?.EmployeeSalaryAmount || 0;

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
                .reduce((acc, obj) => acc + +obj.value, 0)
            : calculatedAttendanceData
                .filter((e) => [30, 31].includes(e['hrLeaveType.LeaveID']))
                .reduce((acc, obj) => acc + +obj.value, 0);

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

//attendance Calculation
exports.attendanceCalculation = async (req, res, next) => {
  try {
    const {
      month,
      userMasterID,
      page,
      limit,
      attendanceStatus,
      salaryStatus,
      salarySlipStatus,
      payrollStartDate,
      payrollEndDate,
    } = await req.body;

    let { payrollFrequency } = req.body;

    // If payrollFrequency is not provided (undefined, null, or empty), set it to default 'monthly'
    if (!payrollFrequency) payrollFrequency = PayrollFrequencyType.MONTHLY;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    let startDate, endDate, enddate, monday;

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      // ----- get previous month to next month -----------------
      const tempDate = getStartAndEndDate(+month);
      startDate = tempDate.startDate;
      endDate = tempDate.endDate;
      monday = daysInMonth(
        String(+month).slice(4, 6),
        String(+month).slice(0, 4),
      );
      enddate =
        String(+month).slice(0, 4) +
        '-' +
        String(+month).slice(4, 6) +
        '-' +
        monday;
    } else {
      // For other payroll frequencies, use the provided start and end dates
      startDate = payrollStartDate;
      endDate = payrollEndDate;

      monday = calculateDays(payrollStartDate, payrollEndDate);
      enddate = payrollEndDate;
    }

    // Set pagination if both page and limit are provided
    const paginateCondition =
      page && limit ? { offset: (page - 1) * limit, limit } : {};

    // Initialize base condition for HrLeaveMonthlyTrans query
    const hrleaveMonthlyTransCondition = { payrollFrequency };
    const coffCondition = { From: 'AC' };

    // Add specific date condition based on payroll frequency
    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      hrleaveMonthlyTransCondition.AttnYearMon = month; // For monthly, use AttnYearMon
      coffCondition.YearMM = month;
    } else {
      // For other frequencies, use date range
      hrleaveMonthlyTransCondition.startDate = payrollStartDate;
      hrleaveMonthlyTransCondition.endDate = payrollEndDate;

      coffCondition.LeaveCreatedDate = {
        [Sequelize.Op.between]: [payrollStartDate, payrollEndDate],
      };
    }

    // If attendance status is 0 or 1, filter by verified status accordingly
    if (['0', '1'].includes(attendanceStatus))
      hrleaveMonthlyTransCondition.verified = +attendanceStatus;

    // Set whether Hrleave data is required based on attendance status
    const requiredLeave = ['0', '1'].includes(attendanceStatus) ? true : false;

    const salarySlipCondition =
      payrollFrequency == PayrollFrequencyType.MONTHLY
        ? { salaryYYYYMM: month, payrollFrequency }
        : {
            startDate: payrollStartDate,
            endDate: payrollEndDate,
            payrollFrequency,
          };

    if (salarySlipStatus)
      salarySlipCondition.salarySlipIssue = salarySlipStatus;

    const whereCondition = {
      userMasterID: {
        [Sequelize.Op.in]: userMasterID,
      },
      status: 1,
    };

    const includeArray = [
      {
        required: requiredLeave,
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
        ],
        include: [
          {
            model: HrLeaveTypes,
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
        where: {
          payrollFrequency,
        },
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
        model: EmployeeSalaryPolicy,
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
        include: [
          {
            model: SalaryPolicy,
            as: 'salaryPolicy',
          },
        ],
      },
      {
        model: EmployeeDesignation,
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
        attributes: ['designationID', 'applicableDate', 'endDate'],
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
        attributes: ['departmentID', 'applicableDate', 'endDate'],
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
        include: [
          {
            model: BranchMaster,
            as: 'branchMaster',
            attributes: ['branchName', 'branchMasterID'],
          },
        ],
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
              'coff',
              'isWHAbsentRule',
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
      // coff
      {
        required: false,
        model: coffMaster,
        where: coffCondition,
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
      // salary Slip
      {
        required: salarySlipStatus ? true : false,
        model: HRSalarySlip,
        where: salarySlipCondition,
      },
      {
        required: false,
        model: ShiftRoster,
        where: {
          shiftRosterDate: {
            [Sequelize.Op.between]: [startDate, endDate],
          },
        },
      },
      {
        required: false,
        model: EmployeeShift,
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
      },
    ];

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      // LCEG Penalty
      includeArray.push({
        required: false,
        model: LCEGPenalty,
        where: {
          YYYYMM: month,
        },
      });
    }

    const salaryCondition =
      payrollFrequency == PayrollFrequencyType.MONTHLY
        ? `AND hst."salaryYYYYMM" = '${month}'`
        : `AND hst."startDate" = '${payrollStartDate}' AND hst."endDate" = '${payrollEndDate}'`;

    if (salaryStatus == '1') {
      whereCondition[Sequelize.Op.and] = [
        Sequelize.literal(`EXISTS (
          SELECT 1 FROM "hrSalaryTrasactions" AS hst
          WHERE hst."userMasterID" = "userMaster"."userMasterID"
          AND hst."payrollFrequency" = '${payrollFrequency}' ${salaryCondition}
        )`),
      ];
    }

    if (salaryStatus == '0') {
      whereCondition[Sequelize.Op.and] = [
        Sequelize.literal(`NOT EXISTS (
          SELECT 1 FROM "hrSalaryTrasactions" AS hst
          WHERE hst."userMasterID" = "userMaster"."userMasterID"
          AND hst."payrollFrequency" = '${payrollFrequency}' ${salaryCondition}
        )`),
      ];
    }

    const { rows: usermaster, count: totalcount } =
      await UserMaster.findAndCountAll({
        distinct: true,
        where: whereCondition,
        ...paginateCondition,
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
        ],
        order: [['displayName', 'ASC']],
      });

    if (usermaster.length === 0)
      return res
        .status(200)
        .json({ status: 200, data: [], totalcount: totalcount });

    const companyId = usermaster[0].companyMasterId;

    const [AllHrLeaveTypes, AllShifts] = await Promise.all([
      HrLeaveTypes.findAll({
        where: {
          companyMasterID: companyId,
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
      }),
      Shift.findAll({
        where: {
          companyMasterID: companyId,
          status: 1,
        },
        include: [{ model: ShiftTIme }],
      }),
    ]);

    const finaldata1 = [];

    for (let i = 0; i < usermaster.length; i++) {
      const calculatedAttendance = await PNGAttendanceCalculation(
        usermaster[i],
        month,
        payrollFrequency,
        payrollStartDate,
        payrollEndDate,
        AllHrLeaveTypes,
        AllShifts,
      );

      finaldata1.push(calculatedAttendance[0]);
    }

    const unverifiedData = finaldata1.filter((e) => e.verified == 0);

    if (!unverifiedData.length) {
      return res
        .status(200)
        .json({ status: 200, data: finaldata1, totalcount: totalcount });
    }

    const userIds = [];
    const toAddData = [];
    const toAddLCEGPenaltyData = [];

    for (const data of unverifiedData) {
      userIds.push(data.userMasterID);

      // for penalty

      if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
        for (const penalty of data.penaltyArray) {
          toAddLCEGPenaltyData.push({
            userMasterID: data.userMasterID,
            YYYYMM: +data.yearMonth,
            penaltyType: penalty.penaltyType,
            penaltyValue: penalty.values,
          });
        }
      }

      // for leave types
      for (let m = 0; m < data.user_leave.length; m++) {
        toAddData.push({
          userMasterID: data.userMasterID,
          LeaveTranId: data.user_leave[m].leavetranid,
          AttnYearMon: data.yearMonth,
          MonDays: data.MonDays,
          MonWorkDays: data.WorkingDays,
          AttnVal: data.user_leave[m].values || 0,
          monthstartdate: data.start_date,
          monthenddate: data.end_date,
          branchId: data.branchid,
          departmentId: data.departid,
          designationId: data.desigid,
          payrollFrequency: data.user_leave[m].payrollFrequency,
          startDate: data.user_leave[m].payrollStartDate,
          endDate: data.user_leave[m].payrollEndDate,
          createBy: createBy,
          createByIp: createByIp,
        });
      }
    }

    //delete data

    await sequelize.transaction(async (t) => {
      const condition = {
        userMasterID: {
          [Sequelize.Op.in]: userIds,
        },
      };

      // Add specific date condition based on payroll frequency
      if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
        condition.AttnYearMon = month; // For monthly, use AttnYearMon
      } else {
        // For other frequencies, use date range
        condition.startDate = payrollStartDate;
        condition.endDate = payrollEndDate;
      }

      await HrLeaveMonthlyTrans.destroy({
        where: condition,
        transaction: t,
      });

      await HrLeaveMonthlyTrans.bulkCreate(toAddData, { transaction: t });

      if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
        await LCEGPenalty.destroy({
          where: {
            userMasterID: {
              [Sequelize.Op.in]: userIds,
            },
            YYYYMM: month,
          },
          transaction: t,
        });

        await LCEGPenalty.bulkCreate(toAddLCEGPenaltyData, {
          individualHooks: true,
          user: req.userDetails,
          transaction: t,
        });
      }
    });

    return res
      .status(200)
      .json({ status: 200, data: finaldata1, totalcount: totalcount });
  } catch (err) {
    next(err);
  }
};

// manual changes and verify attendance calcualtion

exports.updateData = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      ArrayData,
      coffType = null,
      coffValue = 0,
      weekoffPolicyType = null,
      weekoffValue = 0,
    } = req.body;

    const createBy = req.userDetails?.userMasterId || null;
    const createByIp = req.userDetails?.userIpAddress || null;

    if (ArrayData.length > 0) {
      const check_NegativeValue = ArrayData.filter((item) => +item.AttnVal < 0);

      if (check_NegativeValue.length > 0) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: 'Attendance Value Should be positive value!',
        });
      }

      let userMasterID = ArrayData[0].userMasterID;
      let yearMonth = ArrayData[0].AttnYearMon;

      const payrollFrequency =
        ArrayData[0].payrollFrequency || PayrollFrequencyType.MONTHLY;
      const payrollStartDate = ArrayData[0].payrollStartDate || '';
      const payrollEndDate = ArrayData[0].payrollEndDate || '';

      const updateCondition = { payrollFrequency, userMasterID };

      let monday, end_date;

      if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
        updateCondition.AttnYearMon = yearMonth;

        monday = daysInMonth(yearMonth.slice(4, 6), yearMonth.slice(0, 4));

        end_date =
          String(yearMonth).slice(0, 4) +
          '-' +
          String(yearMonth).slice(4, 6) +
          '-' +
          monday;
      } else {
        updateCondition.startDate = payrollStartDate;
        updateCondition.endDate = payrollEndDate;

        const totalDays = Math.abs(
          (new Date(payrollStartDate).getTime() -
            new Date(payrollEndDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ); // it returns negative value if start date < end date
        monday = Math.floor(totalDays + 1); // to get complete
        end_date = payrollEndDate;
      }

      for (let i = 0; i < ArrayData.length; i++) {
        await HrLeaveMonthlyTrans.update(
          {
            AttnVal: ArrayData[i].AttnVal,
            verified: 1,
            MonDays: ArrayData[i].MonDays,
            updateBy: createBy,
            updateByIp: createByIp,
          },
          {
            where: {
              ...updateCondition,
              LeaveTranId: ArrayData[i].LeaveTranId,
            },
            transaction,
          },
        );
      }

      await HrLeaveMonthlyTrans.update(
        {
          verified: 1,
          updateBy: createBy,
          updateByIp: createByIp,
        },
        {
          where: updateCondition,
          transaction,
        },
      );

      // Set Actual Weekoff if weekoffPolicyType is onpresent days
      if (
        weekoffPolicyType &&
        [weekoffTypeEnum.ONPAIDDAYS, weekoffTypeEnum.ONPRESENTDAY].includes(
          weekoffPolicyType,
        )
      ) {
        const weekoffData = await HrLeaveMonthlyTrans.findOne({
          where: updateCondition,
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
        where: updateCondition,
        include: [
          {
            model: HrLeaveTypes,
            where: {
              LeaveID: { [Sequelize.Op.in]: [1, 7, 9, 30, 31, 32, 20] },
            },
            attributes: ['LeaveID'],
          },
        ],
        transaction,
      });

      const workingData =
        All_findAttnData.find((e) => e['hrLeaveType.LeaveID'] == 20) || null;

      const findAttnData = All_findAttnData.filter(
        (e) => e['hrLeaveType.LeaveID'] != 20,
      );

      let start_date =
        findAttnData.length > 0 && findAttnData[0].monthstartdate
          ? findAttnData[0].monthstartdate
          : yearMonth.slice(0, 4) + '-' + yearMonth.slice(4, 6) + '-' + '01';

      end_date =
        findAttnData.length > 0 && findAttnData[0].monthenddate
          ? findAttnData[0].monthenddate
          : yearMonth.slice(0, 4) + '-' + yearMonth.slice(4, 6) + '-' + monday;

      // find user data include empjoining , salary policy attendance policy,employee attendance bonus policy

      const userData = await UserMaster.findOne({
        where: {
          userMasterID,
        },
        include: [
          { model: EmployeeJoiningDetails },
          {
            model: EmployeeSalaryPolicy,
            where: {
              status: 1,
              startDate: { [Sequelize.Op.lte]: end_date },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: end_date } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: false,
            attributes: ['salaryPolicyID'],
            include: [
              {
                model: SalaryPolicy,
                as: 'salaryPolicy',
                where: {
                  payrollFrequency,
                },
              },
            ],
          },
          {
            model: EmployeeAttendanceBonusPolicy,
            where: {
              status: 1,
              startDate: { [Sequelize.Op.lte]: end_date },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: end_date } },
                { endDate: { [Sequelize.Op.eq]: null } },
              ],
            },
            required: false,
            attributes: ['attendanceBonusPolicyId'],
            include: [
              {
                model: AttendanceBonusPolicy,
              },
            ],
          },
        ],
      });

      const joiningData = userData.employeeJoiningDetails?.[0] || null;
      const salaryPolicy =
        userData.employeeSalaryPolicies?.[0]?.salaryPolicy || null;
      const attendanceBonusPolicy =
        userData.employeeAttendanceBonusPolicies?.[0]?.attendanceBonusPolicy ||
        null;

      const salaryCalculationBasedOn =
        salaryPolicy?.salarycalculationBasedon || '';

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
              [Sequelize.Op.in]: ['attendance bonus', 'extra days'],
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
            +attendanceBonusPolicy['attendanceBonusPolicy.min_bonus_hrs'] * 60,
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

            if (joiningData?.salaryCalculationAct == 'F') {
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
            } else if (joiningData?.salaryCalculationAct == 'W') {
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
              const presentDays =
                findAttnData.find((e) => e['hrLeaveType.LeaveID'] == 1)
                  ?.AttnVal ?? 0;

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
                    +grossAmount / +salaryPolicy.salaryCalculationDays;
                else {
                  // if salaryCalculationAct set as factory act
                  if (joiningData?.salaryCalculationAct == 'F') {
                    const actualWeekoff = findAttnData.find(
                      (e) => e['hrLeaveType.LeaveID'] == 30,
                    );

                    perDayAmount =
                      +grossAmount /
                      (+monday - (actualWeekoff ? +actualWeekoff.AttnVal : 0));
                  } else if (joiningData?.salaryCalculationAct == 'W') {
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
              if (salaryPolicy.dailyFixhours)
                perMinuteGross =
                  +grossAmount / (+salaryPolicy.dailyFixhours * 60);

              if (!salaryPolicy.dailyFixhours && att)
                perMinuteGross = +grossAmount / (+att.Shifthrs * 60);
            }
            // monthly salary structure
            if (salaryCalculationType == 'M') {
              const days = calculateDays(start_date, end_date) || 0;

              if (salaryPolicy.monthlyFixhours)
                perMinuteGross =
                  +grossAmount / (+salaryPolicy.monthlyFixhours * 60);

              if (salaryPolicy.dailyFixhours && !salaryPolicy.monthlyFixhours)
                perMinuteGross =
                  +grossAmount / (+salaryPolicy.dailyFixhours * days * 60);

              if (
                !salaryPolicy.dailyFixhours &&
                !salaryPolicy.monthlyFixhours &&
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
                updateBy: req.userDetails.userMasterId,
                updateByIp: req.userDetails.userIpAddress,
              },
              {
                where: {
                  ...updateCondition,
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
                createBy: req.userDetails.userMasterId,
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
        if (coffType == 'AddLeave' && userData) {
          const coffLeaveType = await HrLeaveTypes.findOne({
            where: {
              companyMasterID: userData.companyMasterId,
              LeaveID: 6,
              status: 1,
            },
          });

          if (coffLeaveType) {
            // create leave balance
            const leaveBalance = await HrLeaveBalance.create(
              {
                LeaveTranId: coffLeaveType.LeaveTranId,
                userMasterID,
                YearMM: yearMonth,
                LeaveAddNew: +coffValue,
                createBy: req.userDetails.userMasterId,
                createByIp: req.userDetails.userIpAddress,
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
                createBy: req.userDetails.userMasterId,
                createByIp: req.userDetails.userIpAddress,
              },
              {
                transaction,
              },
            );
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
          const amount = await calculateExtraDaysPNG(
            salaryPolicy,
            salaryData,
            userMasterID,
            start_date,
            end_date,
            monday,
            joiningData?.salaryCalculationAct || '',
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
                createBy: req.userDetails.userMasterId,
              },
              {
                transaction,
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
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: 'Attendance verified successfully.',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// verify attendance calculation

exports.verifyAttendanceCalculation = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      companyMasterID,
      userMasterID,
      yearMonth,
      payrollFrequency,
      payrollStartDate,
      payrollEndDate,
    } = await req.body;

    const NegativeValue_UserName = [];

    // If payrollFrequency is not provided (undefined, null, or empty), set it to default 'monthly'
    if (!payrollFrequency) payrollFrequency = PayrollFrequencyType.MONTHLY;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    let startDate, endDate, monday, enddate;

    // coff condition
    const coffCondition = { From: 'AC' };

    // Initialize base condition for HrLeaveMonthlyTrans query
    const hrleaveMonthlyTransCondition = { payrollFrequency };

    const salaryCondition = { payrollFrequency, userMasterID };

    const salaryGroupBy = ['userMasterID', 'payrollFrequency'];

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      // ----- get previous month to next month -----------------
      const tempDate = getStartAndEndDate(+yearMonth);
      startDate = tempDate.startDate;
      endDate = tempDate.endDate;
      monday = daysInMonth(yearMonth.slice(4, 6), yearMonth.slice(0, 4));
      enddate =
        yearMonth.slice(0, 4) + '-' + yearMonth.slice(4, 6) + '-' + monday;

      coffCondition.YearMM = yearMonth;

      hrleaveMonthlyTransCondition.AttnYearMon = yearMonth; // For monthly, use AttnYearMon
      salaryCondition.salaryYYYYMM = yearMonth;
      salaryGroupBy.push('salaryYYYYMM');
    } else {
      // For other payroll frequencies, use the provided start and end dates
      startDate = payrollStartDate;
      endDate = payrollEndDate;

      monday = calculateDays(payrollStartDate, payrollEndDate);
      enddate = payrollEndDate;

      yearMonth =
        String(payrollStartDate).slice(0, 4) +
        String(payrollStartDate).slice(5, 7);

      coffCondition.LeaveCreatedDate = {
        [Sequelize.Op.between]: [payrollStartDate, payrollEndDate],
      };

      // For other frequencies, use date range
      hrleaveMonthlyTransCondition.startDate = payrollStartDate;
      hrleaveMonthlyTransCondition.endDate = payrollEndDate;

      salaryCondition.startDate = payrollStartDate;
      salaryCondition.endDate = payrollEndDate;

      salaryGroupBy.push('startDate', 'endDate');
    }

    const [AllHrLeaveTypes, AllShifts, attBonus_ExtraDays] = await Promise.all([
      HrLeaveTypes.findAll({
        where: {
          companyMasterID,
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
      }),
      Shift.findAll({
        where: {
          companyMasterID,
          status: 1,
        },
        include: [{ model: ShiftTIme }],
      }),
      Incentivetype.findAll({
        raw: true,
        where: Sequelize.and(
          Sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('incentivetypename')),
            ),
            {
              [Sequelize.Op.in]: ['attendance bonus', 'extra days'],
            },
          ),
          Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
          Sequelize.or(
            Sequelize.where(sequelize.col('status'), 0),
            Sequelize.where(sequelize.col('status'), 1),
          ),
        ),
      }),
    ]);

    // included model

    const includeArray = [
      { model: EmployeeJoiningDetails },
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
        ],
        include: [
          {
            model: HrLeaveTypes,
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
        model: EmployeeSalaryPolicy,
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
        include: [
          {
            model: SalaryPolicy,
            as: 'salaryPolicy',
          },
        ],
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
            ],
          },
        ],
      },

      {
        model: EmployeeDesignation,
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
        attributes: ['designationID', 'applicableDate', 'endDate'],
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
        attributes: ['departmentID', 'applicableDate', 'endDate'],
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
        include: [
          {
            model: BranchMaster,
            as: 'branchMaster',
            attributes: ['branchName', 'branchMasterID'],
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

      // coff
      {
        required: false,
        model: coffMaster,
        where: coffCondition,
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

      // Shift Roster
      {
        required: false,
        model: ShiftRoster,
        where: {
          shiftRosterDate: {
            [Sequelize.Op.between]: [startDate, endDate],
          },
        },
      },

      // Employee Shift
      {
        required: false,
        model: EmployeeShift,
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
      },
      // Employee Attendance Bonus

      {
        model: EmployeeAttendanceBonusPolicy,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: enddate },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: enddate } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['attendanceBonusPolicyId'],
        include: [
          {
            model: AttendanceBonusPolicy,
          },
        ],
      },
    ];

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      // LCEG Penalty
      includeArray.push({
        required: false,
        model: LCEGPenalty,
        where: {
          YYYYMM: yearMonth,
        },
      });
    }

    const [usermaster, AllUserSalary] = await Promise.all([
      UserMaster.findAll({
        where: {
          userMasterID: userMasterID,
        },
        include: includeArray,
      }),
      HRSalaryTrasaction.findAll({
        where: salaryCondition,
        group: salaryGroupBy,
        attributes: salaryGroupBy,
      }),
    ]);

    for (let i = 0; i < usermaster.length; i++) {
      const find_salary = AllUserSalary.find(
        (e) => e.userMasterID == usermaster[i].userMasterID,
      );

      const empjoing = usermaster[i].employeeJoiningDetails?.[0] || null;

      if (!find_salary) {
        const attendancedataCal = await PNGAttendanceCalculation(
          usermaster[i],
          yearMonth,
          payrollFrequency,
          payrollStartDate,
          payrollEndDate,
          AllHrLeaveTypes,
          AllShifts,
        );

        const unverifiedData = attendancedataCal.filter((e) => e.verified == 0);

        // if already verified
        if (!unverifiedData.length) continue;

        const condition = {
          userMasterID: usermaster[i].userMasterID,
        };

        // Add specific date condition based on payroll frequency
        if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
          condition.AttnYearMon = yearMonth; // For monthly, use AttnYearMon
        } else {
          // For other frequencies, use date range
          condition.startDate = payrollStartDate;
          condition.endDate = payrollEndDate;
        }

        if (unverifiedData.length) {
          //delete data
          await HrLeaveMonthlyTrans.destroy({
            where: condition,
            transaction,
          });

          if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
            await LCEGPenalty.destroy({
              where: {
                userMasterID: usermaster[i].userMasterID,
                YYYYMM: yearMonth,
              },
              transaction,
            });
          }

          if (
            unverifiedData[0].user_leave &&
            unverifiedData[0].user_leave.length
          ) {
            const toAddData = [];
            const toAddLCEGPenaltyData = [];

            // for penalty

            if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
              for (const penalty of unverifiedData[0]?.penaltyArray || []) {
                toAddLCEGPenaltyData.push({
                  userMasterID: unverifiedData[0].userMasterID,
                  YYYYMM: +unverifiedData[0].yearMonth,
                  penaltyType: penalty.penaltyType,
                  penaltyValue: penalty.values,
                });
              }
            }

            for (let m = 0; m < unverifiedData[0].user_leave.length; m++) {
              toAddData.push({
                userMasterID: unverifiedData[0].userMasterID,
                LeaveTranId: unverifiedData[0].user_leave[m].leavetranid,
                AttnYearMon: unverifiedData[0].yearMonth,
                MonDays: unverifiedData[0].MonDays,
                MonWorkDays: unverifiedData[0].WorkingDays,
                AttnVal: unverifiedData[0].user_leave[m].values || 0,
                monthstartdate: unverifiedData[0].start_date,
                monthenddate: unverifiedData[0].end_date,
                branchId: unverifiedData[0].branchid,
                departmentId: unverifiedData[0].departid,
                designationId: unverifiedData[0].desigid,
                payrollFrequency:
                  unverifiedData[0].user_leave[m].payrollFrequency,
                startDate: unverifiedData[0].user_leave[m].payrollStartDate,
                endDate: unverifiedData[0].user_leave[m].payrollEndDate,
                createBy: createBy,
                createByIp: createByIp,
              });
            }

            // Add data
            await HrLeaveMonthlyTrans.bulkCreate(toAddData, {
              transaction,
            });

            if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
              await LCEGPenalty.bulkCreate(toAddLCEGPenaltyData, {
                individualHooks: true,
                user: req.userDetails,
                transaction,
              });
            }
          }
        }

        const getAlldata = await HrLeaveMonthlyTrans.findAll({
          raw: true,
          where: condition,
          transaction,
          include: [{ model: HrLeaveTypes, attributes: ['LeaveID'] }],
        });

        // Check For Negative Value
        const check_NegativeValue = getAlldata.filter((e) => +e.AttnVal < 0);

        if (check_NegativeValue.length > 0) {
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
            : yearMonth.slice(0, 4) +
              '-' +
              yearMonth.slice(4, 6) +
              '-' +
              monday;

        const user_salaryPolicy =
          payrollFrequency ==
          usermaster[i].employeeSalaryPolicies?.[0]?.salaryPolicy
            ?.payrollFrequency
            ? usermaster[i].employeeSalaryPolicies?.[0]?.salaryPolicy
            : null;

        let salaryCalculationBasedOn = '';
        if (user_salaryPolicy) {
          // to set for salaryCalculationBasedOn
          salaryCalculationBasedOn = user_salaryPolicy.salarycalculationBasedon;
          overtimeAdded = user_salaryPolicy.overtimeAdded;
        }

        await HrLeaveMonthlyTrans.update(
          {
            updateBy: createBy,
            updateByIp: createByIp,
            verified: 1,
          },
          {
            where: condition,
            transaction,
          },
        );

        // ------------------Attendance Bonus-------------------

        const attendanceBonusPolicy =
          usermaster[i].employeeAttendanceBonusPolicies?.[0]
            ?.attendanceBonusPolicy || null;

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
                const presentDays =
                  getAlldata.find((e) => e['hrLeaveType.LeaveID'] == 1)
                    ?.AttnVal ?? 0;

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
                  updateBy: createBy,
                  updateByIp: createByIp,
                },
                {
                  where: {
                    ...condition,
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
                  userMasterID: usermaster[i].userMasterID,
                  yearmonth: yearMonth,
                  amount: Math.round(amount),
                  IncentivetypeID: attBonusTypeIncentive.IncentivetypeID,
                  incentiveDate: end_date,
                  createBy,
                },
                { transaction },
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
              // create leave balance
              const leaveBalance = await HrLeaveBalance.create(
                {
                  LeaveTranId: coffLeaveType.LeaveTranId,
                  userMasterID: usermaster[i].userMasterID,
                  YearMM: yearMonth,
                  LeaveAddNew: +coffValue,
                  createBy,
                  createByIp,
                },
                {
                  transaction,
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
                  createBy,
                  createByIp,
                },
                {
                  transaction,
                },
              );
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
                transaction,
              },
            );
          }
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
          });

          // if extra days data exist
          if (extraDaysData.length) {
            const extraDays = extraDaysData.reduce(
              (acc, obj) => acc + +obj.days,
              0,
            );
            const amount = await calculateExtraDaysPNG(
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
                  createBy: createBy,
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
                      [Sequelize.Op.in]: extraDaysData.map(
                        (e) => e.extraDaysID,
                      ),
                    },
                  },
                  hooks: false,
                  transaction,
                },
              );
            }
          }
        }
      }
    }

    let message = 'Attendance verified successfully.';

    if (NegativeValue_UserName.length > 0) {
      message = `Attenance not verified of ${NegativeValue_UserName} and other attendance verified successfully.`;
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// unverify Attendance calculation

exports.unverifyAttendanceCalculation = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      companyMasterID,
      userMasterID,
      yearMonth,
      payrollFrequency,
      payrollStartDate,
      payrollEndDate,
    } = await req.body;

    // If payrollFrequency is not provided (undefined, null, or empty), set it to default 'monthly'
    if (!payrollFrequency) payrollFrequency = PayrollFrequencyType.MONTHLY;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    let monday;

    // coff condition
    const coffCondition = { From: 'AC' };

    // Initialize base condition for HrLeaveMonthlyTrans query
    const hrleaveMonthlyTransCondition = { payrollFrequency };

    const salaryCondition = { payrollFrequency, userMasterID };

    const salaryGroupBy = ['userMasterID', 'payrollFrequency'];

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      monday = daysInMonth(yearMonth.slice(4, 6), yearMonth.slice(0, 4));

      coffCondition.YearMM = yearMonth;

      hrleaveMonthlyTransCondition.AttnYearMon = yearMonth; // For monthly, use AttnYearMon
      salaryCondition.salaryYYYYMM = yearMonth;
      salaryGroupBy.push('salaryYYYYMM');
    } else {
      monday = calculateDays(payrollStartDate, payrollEndDate);

      yearMonth =
        String(payrollStartDate).slice(0, 4) +
        String(payrollStartDate).slice(5, 7);

      coffCondition.LeaveCreatedDate = {
        [Sequelize.Op.between]: [payrollStartDate, payrollEndDate],
      };

      // For other frequencies, use date range
      hrleaveMonthlyTransCondition.startDate = payrollStartDate;
      hrleaveMonthlyTransCondition.endDate = payrollEndDate;

      salaryCondition.startDate = payrollStartDate;
      salaryCondition.endDate = payrollEndDate;

      salaryGroupBy.push('startDate', 'endDate');
    }

    const [usermaster, AllUserSalary] = await Promise.all([
      UserMaster.findAll({
        where: {
          companyMasterId: companyMasterID,
          userMasterID: userMasterID,
        },
        include: [
          { model: EmployeeJoiningDetails },
          {
            model: HrLeaveMonthlyTrans,
            where: hrleaveMonthlyTransCondition,
            include: [{ model: HrLeaveTypes, attributes: ['LeaveID'] }],
          },
          // coff
          {
            required: false,
            model: coffMaster,
            where: coffCondition,
          },
        ],
      }),
      HRSalaryTrasaction.findAll({
        where: salaryCondition,
        group: salaryGroupBy,
        attributes: salaryGroupBy,
      }),
    ]);

    for (let i = 0; i < usermaster.length; i++) {
      const find_salary = AllUserSalary.find(
        (e) => e.userMasterID == usermaster[i].userMasterID,
      );

      if (!find_salary) {
        const getAlldata = usermaster[i].hrLeaveMonthlyTrans || [];

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

        // Set Attendance Bonus Days Zero
        const atendnaceBonus = getAlldata.find(
          (e) => e.hrLeaveType.LeaveID == 32,
        );

        if (atendnaceBonus) {
          await HrLeaveMonthlyTrans.update(
            {
              verified: 0,
              AttnVal: 0,
              updateBy: createBy,
              updateByIp: createByIp,
            },
            {
              where: {
                AttnTranId: atendnaceBonus.AttnTranId,
              },
              transaction,
            },
          );
        }

        await HrLeaveMonthlyTrans.update(
          {
            updateBy: createBy,
            updateByIp: createByIp,
            verified: 0,
          },
          {
            where: {
              ...hrleaveMonthlyTransCondition,
              userMasterID: usermaster[i].userMasterID,
            },
            transaction,
          },
        );

        // find Extra Days and attendance bonus

        const [extraDaysData, dataOfAttendanceBounus] = await Promise.all([
          ExtraDays.findAll({
            where: {
              userMasterID: usermaster[i].userMasterID,
              date: {
                [Sequelize.Op.between]: [start_date, end_date],
              },
              employeeincentiveID: {
                [Sequelize.Op.ne]: null,
              },
            },
            transaction,
          }),
          Employeeincentive.findAll({
            where: {
              userMasterID: usermaster[i].userMasterID,
              incentiveDate: end_date,
            },
            include: [
              {
                required: true,
                model: Incentivetype,
                where: Sequelize.and(
                  Sequelize.where(
                    sequelize.fn(
                      'TRIM',
                      sequelize.fn(
                        'LOWER',
                        sequelize.col('incentivetype.incentivetypename'),
                      ),
                    ),
                    'attendance bonus',
                  ),
                ),
              },
            ],
            transaction,
          }),
        ]);

        if (extraDaysData.length > 0 && extraDaysData[0].employeeincentiveID) {
          await ExtraDays.update(
            {
              employeeincentiveID: null,
              updateBy: createBy,
            },
            {
              where: {
                extraDaysID: {
                  [Sequelize.Op.in]: extraDaysData.map((e) => e.extraDaysID),
                },
              },
              transaction,
              hooks: false,
            },
          );

          // delete extra days incentives
          await Employeeincentive.destroy({
            where: {
              employeeincentiveID: extraDaysData[0].employeeincentiveID,
            },
            transaction,
          });
        }

        // ------------------------------Delete Extra Days and coff -----------------------

        await ExtraDays.destroy({
          where: {
            date: end_date,
            userMasterID: usermaster[i].userMasterID,
            From: [extraDaysFromEnum.ATTENDANCE_CALCULATION,extraDaysFromEnum.WEEKOFF_HOLIDAY_ON_SAME_DAY],
          },
          individualHooks: true,
          user: req.userDetails,
          transaction,
        });

        // Find Coff
        const findCoff = usermaster[i].coffMasters || [];

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
              transaction,
            });
          }
          // Delete Coff
          await coffMaster.destroy({
            where: {
              coffMasterID: {
                [Sequelize.Op.in]: findCoff.map((e) => e.coffMasterID),
              },
            },
            transaction,
          });
        }

        // delete Attendance Bonus

        await Employeeincentive.destroy({
          where: {
            employeeincentiveID: dataOfAttendanceBounus.map(
              (e) => e.employeeincentiveID,
            ),
          },
          transaction,
        });
      }
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: usermessage.unvarifyAttendanceCalculation,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

const chunkArray = (arr, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
};

// Salary calculation
exports.salaryCalculation = async (req, res, next) => {
  try {
    let {
      userMasterID,
      yearmonth,
      payrollStartDate,
      payrollEndDate,
      from = 'salary',
      payrollFrequency,
      fortnight = null,
    } = req.body;

    if (!payrollFrequency) payrollFrequency = PayrollFrequencyType.MONTHLY;

    const user = userMasterID;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    let year, Month, temp_monday, enddate, startDate, endDate;

    const hrleaveMonthlyTransCondition = { payrollFrequency, verified: 1 };
    const salaryCondition = { payrollFrequency };
    const leaveEncashCondition = { payrollFrequency, status: 1 };
    const loanTransCondition = {
      status: 1,
      loanAdvanceId: {
        [Sequelize.Op.is]: null,
      },
    };

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      hrleaveMonthlyTransCondition.AttnYearMon = yearmonth;
      salaryCondition.salaryYYYYMM = yearmonth;
      leaveEncashCondition.YYYYMM = yearmonth;
      loanTransCondition.EMIMonth = yearmonth;

      const tempDate = getStartAndEndDate(+yearmonth);
      startDate = tempDate.startDate;
      endDate = tempDate.endDate;

      year = yearmonth.slice(0, 4);
      Month = yearmonth.slice(4, 6);
      temp_monday = daysInMonth(Month, year);
      enddate = year + '-' + Month + '-' + temp_monday;
    } else {
      // For other frequencies, use date range
      hrleaveMonthlyTransCondition.startDate = payrollStartDate;
      hrleaveMonthlyTransCondition.endDate = payrollEndDate;

      // leave encashment condition
      leaveEncashCondition.startDate = payrollStartDate;
      leaveEncashCondition.endDate = payrollEndDate;

      // loan condition
      loanTransCondition.startDate = payrollStartDate;
      loanTransCondition.endDate = payrollEndDate;

      // For other payroll frequencies, use the provided start and end dates
      startDate = payrollStartDate;
      endDate = payrollEndDate;

      salaryCondition.startDate = payrollStartDate;
      salaryCondition.endDate = payrollEndDate;

      year = payrollEndDate.slice(0, 4);
      Month = payrollEndDate.slice(5, 7);

      yearmonth = String(year) + String(Month);

      temp_monday = calculateDays(payrollStartDate, payrollEndDate);
      enddate = payrollEndDate;
    }

    const taxApplicableMonth =
      String(payrollEndDate).slice(0, 4) + String(payrollEndDate).slice(5, 7);

    const [pngNationalTaxSlab, pngNationalTaxRebate] =
      payrollFrequency != PayrollFrequencyType.MONTHLY
        ? await Promise.all([
            PngNationalTaxSlab.findAll({
              where: {
                applicableYYYYMM: {
                  [Sequelize.Op.eq]: Sequelize.literal(`(
                SELECT MAX("applicableYYYYMM")
                FROM "pngNationalTaxSlabs"
                WHERE "applicableYYYYMM" <= ${taxApplicableMonth}
              )`),
                },
              },
            }),

            PNGNationalTaxRebate.findOne({
              where: {
                applicableYYYYMM: {
                  [Sequelize.Op.lte]: taxApplicableMonth,
                },
              },
              order: [['applicableYYYYMM', 'DESC']],
            }),
          ])
        : [[], null];

    const condition = {
      status: 1,
      applicableDate: { [Sequelize.Op.lte]: new Date(enddate) },
      [Sequelize.Op.or]: [
        { endDate: { [Sequelize.Op.gte]: new Date(enddate) } },
        { endDate: { [Sequelize.Op.eq]: null } },
      ],
    };

    // set 300 users chunk
    const userChunks = chunkArray(user, 300);

    const includeArray = [
      {
        model: HrLeaveMonthlyTrans,
        where: hrleaveMonthlyTransCondition,
        include: [
          {
            model: HrLeaveTypes,
            where: { LeaveID: { [Sequelize.Op.notIn]: [29, 32] } },
            attributes: ['LeaveID'],
          },
          {
            model: Designation,
            as: 'designation',
            attributes: ['designationName'],
          },
          {
            model: Department,
            as: 'department',
            attributes: ['departmentName'],
          },
          {
            model: BranchMaster,
            as: 'branchMaster',
            attributes: ['branchName', 'branchAddress'],
          },
        ],
      },
      {
        model: EmployeeJoiningDetails,
      },
      {
        model: EmployeeSalaryPolicy,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(enddate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(enddate) } },
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
      {
        model: EmployeeAttendancePolicy,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(enddate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(enddate) } },
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
      // leave Policy
      {
        model: empLeavePolicy,
        where: condition,
        required: false,
        attributes: ['userMasterID', 'employeeLeavePolicyID'],
      },
      // leave encashment
      {
        required: false,
        model: LeaveEncashment,
        where: leaveEncashCondition,
        include: [{ model: HrLeaveTypes, attributes: ['LeaveID'] }],
      },
      // shift Roster
      {
        required: false,
        model: ShiftRoster,
        where: {
          shiftRosterDate: {
            [Sequelize.Op.between]: [startDate, endDate],
          },
        },
      },
      {
        required: false,
        model: EmployeeShift,
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
        attributes: ['lateEarlyPolicyMasterID'],
        include: [
          {
            model: LateEarlyPolicy,
            as: 'lateEarlyPolicy',
          },
        ],
      },
      // NCSL
      {
        required: false,
        model: EmpNCSLDeduction,
        where: {
          status: 1,
        },
        include: [{ required: false, model: SkipEmpNCSLDeduction }],
      },
      {
        required: false,
        model: HRSalarySlip,
        where: salaryCondition,
      },
      // count family member
      {
        required: false,
        model: userFamily,
        where: {
          status: 1,
          verifyStatus: 1,
        },
      },
      // Loan
      {
        required: false,
        model: LoanMaster,
        where: {
          status: 1,
          loanstatus: 1,
          payrollFrequency,
        },
        include: [
          {
            required: false,
            model: LoanTransaction,
            where: loanTransCondition,
            attributes: ['LoanTrasactionId', 'EMIAmount'],
          },
        ],
        attributes: ['LoanID'],
      },
    ];

    // push only if payroll frequency is monthly

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      includeArray.push(
        {
          required: false,
          model: deposit,
          where: {
            status: 1,
            depositReceiveAs: 'salary',
            salaryMonth: yearmonth,
          },
          include: [
            { model: depositcategory, attributes: ['depositcategoryname'] },
          ],
        },
        // Bonus Policy
        {
          required: false,
          model: EmployeeBonusPolicy,
          where: {
            status: 1,
            applicableYYYYMM: { [Sequelize.Op.lte]: yearmonth },
            [Sequelize.Op.or]: [
              { endYYYYMM: { [Sequelize.Op.gte]: yearmonth } },
              { endYYYYMM: { [Sequelize.Op.eq]: null } },
            ],
          },
          include: [{ model: BonusPolicy }],
        },
        // LCEG Penalty
        {
          required: false,
          model: LCEGPenalty,
          where: {
            YYYYMM: yearmonth,
          },
        },
        // Advance payment
        {
          required: false,
          model: advancePayment,
          where: {
            paymentYearMonth: yearmonth,
            status: 1,
            AdvanceStatus: 1,
          },
          attributes: ['advancePaymentID', 'amount'],
          include: [{ model: EmployeeRepayment, attributes: ['amount'] }],
        },
        // Overtime Main Calculation
        {
          required: false,
          model: overTimeCalculationMain,
          where: {
            yyyymm: yearmonth,
          },
        },
        // Expense Reimbursement
        {
          required: false,
          model: expensePayment,
          where: {
            rmbMonth: yearmonth,
            paymentmode: paymentMode.PAYWITHSALARY,
          },
        },
      );
    }

    const financialYear = String(year) + '-' + (+year + 1);

    // find tax data

    const [incomeTaxSlabData, statndardDeductionData, YTDIncomeTaxSlabData] =
      await Promise.all([
        // IncometaxSlab
        incomeTaxSlabs.findAll({
          raw: true,
          where: Sequelize.and(
            Sequelize.where(
              sequelize.fn(
                'TRIM',
                sequelize.fn(
                  'LOWER',
                  sequelize.col('incomeTaxSlabMaster.gender'),
                ),
              ),
              'male',
            ),
            Sequelize.where(
              sequelize.col('incomeTaxSlabMaster.assessmentYear'),
              financialYear,
            ),
            Sequelize.where(
              sequelize.col('incomeTaxSlabMaster.regime'),
              'New Regime',
            ),
            Sequelize.where(sequelize.col('incomeTaxSlabs.status'), 1),
          ),
          include: [{ model: incomeTaxSlabMaster, attributes: [] }],
          attributes: ['fromAmount', 'toAmount', 'percentage'],
          order: [['fromAmount', 'ASC']],
        }),
        // standard deduction
        TaxStandardDeduction.findOne({
          where: {
            financialYear,
            regime: 'New Regime',
          },
        }),

        // YTD Tax slab
        YTDIncomeTaxSlab.findAll({
          raw: true,
          where: Sequelize.and(
            Sequelize.where(
              sequelize.fn(
                'TRIM',
                sequelize.fn(
                  'LOWER',
                  sequelize.col('incomeTaxSlabMaster.gender'),
                ),
              ),
              'male',
            ),
            Sequelize.where(
              sequelize.col('incomeTaxSlabMaster.assessmentYear'),
              financialYear,
            ),
            Sequelize.where(
              sequelize.col('incomeTaxSlabMaster.regime'),
              'New Regime',
            ),
            Sequelize.where(sequelize.col('YTDIncomeTaxSlab.status'), 1),
          ),
          include: [{ model: incomeTaxSlabMaster, attributes: [] }],
          attributes: ['fromAmount', 'toAmount', 'type', 'value'],
          order: [['fromAmount', 'ASC']],
        }),
      ]);

    for (const userChunk of userChunks) {
      let projectedSalaryArray = [];
      let previousMonthRanges = [];

      const hrsalaryFieldCondition = {
        userMasterID: {
          [Sequelize.Op.in]: userChunk,
        },
      };

      if (
        [
          PayrollFrequencyType.FORTNIGHTLY,
          PayrollFrequencyType.WEEKLY,
        ].includes(payrollFrequency)
      ) {
        hrsalaryFieldCondition[Sequelize.Op.and] = Sequelize.literal(`
             ("hrSalaryMaster"."userMasterID", "hrSalaryMaster"."endDate", "hrSalaryMaster"."startDate") IN (
               SELECT "userMasterID", MAX("endDate") as "maxEnd", MAX("startDate") AS "maxMonth"
               FROM "hrSalaryMasters"
               WHERE "startDate" <= '${payrollStartDate}'
               AND "userMasterID" IN (${userChunk.join(',')})
               GROUP BY "userMasterID"
             )
           `);
      } else {
        hrsalaryFieldCondition[Sequelize.Op.and] = Sequelize.literal(`
             ("hrSalaryMaster"."userMasterID", "hrSalaryMaster"."salaryFromYYYYMM") IN (
               SELECT "userMasterID", MAX("salaryFromYYYYMM") AS "maxMonth"
               FROM "hrSalaryMasters"
               WHERE "salaryFromYYYYMM" <= ${yearmonth}
               AND "userMasterID" IN (${userChunk.join(',')})
               GROUP BY "userMasterID"
             )
           `);
      }

      const mainQueryArray = [
        UserMaster.findAll({
          where: {
            userMasterID: userChunk,
            status: 1,
          },
          include: includeArray,
          order: [['displayName', 'ASC']],
        }),
        HRSalaryMasterFields.findAll({
          raw: true,
          where: hrsalaryFieldCondition,
          include: [
            {
              model: GradeSalaryStructure,
              include: [
                { model: GradeStructure, attributes: [] },
                {
                  model: HRSalaryFields,
                  include: [
                    {
                      model: Payheadmaster,
                      attributes: [],
                    },
                  ],
                  attributes: [],
                },
              ],
              attributes: [],
            },
          ],
          attributes: [
            [
              Sequelize.col(
                'gradeSalaryStructure.hrSalaryField.Payheadmaster.payheadName',
              ),
              'payheadName',
            ],
            [
              Sequelize.col(
                'gradeSalaryStructure.hrSalaryField.payheadDisplayName',
              ),
              'payheadDisplayName',
            ],
            [
              Sequelize.col('gradeSalaryStructure.hrSalaryField.status'),
              'status',
            ],
            [
              Sequelize.col(
                'gradeSalaryStructure.hrSalaryField.payheadMasterId',
              ),
              'payheadMasterId',
            ],
            'AmountIn',
            'stateid',
            'salaryMasterID',
            'EmployeeSalaryAmount',
            'ActualEmployeeSalaryAmount',
            'salaryFromYYYYMM',
            'userMasterID',
            'gradeSalaryStructureID',
            'payrollFrequency',
            'startDate',
            'endDate',
            [
              Sequelize.col(
                'gradeSalaryStructure.gradeStructure.baseOnCalculation',
              ),
              'baseOnCalculation',
            ],
            [Sequelize.col('gradeSalaryStructure.formula'), 'formula'],
            [
              Sequelize.col(
                'gradeSalaryStructure.hrSalaryField.salaryFieldSrNo',
              ),
              'salaryFieldSrNo',
            ],
            [
              Sequelize.col(
                'gradeSalaryStructure.hrSalaryField.salaryFieldSide',
              ),
              'salaryFieldSide',
            ],
            [
              Sequelize.col(
                'gradeSalaryStructure.hrSalaryField.salaryFieldShow',
              ),
              'salaryFieldShow',
            ],
            [
              Sequelize.col(
                'gradeSalaryStructure.hrSalaryField.salaryFieldAttanChk',
              ),
              'salaryFieldAttanChk',
            ],
            [
              Sequelize.col(
                'gradeSalaryStructure.hrSalaryField.salaryFieldRound',
              ),
              'salaryFieldRound',
            ],
            [
              Sequelize.col(
                'gradeSalaryStructure.hrSalaryField.salaryFieldRoundNo',
              ),
              'salaryFieldRoundNo',
            ],
            [
              Sequelize.col('gradeSalaryStructure.salaryfieldindex'),
              'salaryfieldindex',
            ],
            [
              Sequelize.col('gradeSalaryStructure.salaryfieldmaxrange'),
              'salaryfieldmaxrange',
            ],
            [
              Sequelize.col(
                'gradeSalaryStructure.hrSalaryField.salaryFieldWhenMonth',
              ),
              'salaryFieldWhenMonth',
            ],
            [
              Sequelize.col('gradeSalaryStructure.hrSalaryField.roundOffType'),
              'roundOffType',
            ],
            [
              Sequelize.col('gradeSalaryStructure.hrSalaryField.considerIn'),
              'considerIn',
            ],
            [
              Sequelize.col(
                'gradeSalaryStructure.hrSalaryField.Payheadmaster.taxApplicability',
              ),
              'taxApplicability',
            ],
          ],
          order: [
            // Order by salaryfieldindex in GradeSalaryStructure
            [
              { model: GradeSalaryStructure, as: 'gradeSalaryStructure' },
              'salaryfieldindex',
              'ASC',
            ],

            // Order by payheadName in Payheadmaster
            [
              { model: GradeSalaryStructure, as: 'gradeSalaryStructure' },
              { model: HRSalaryFields, as: 'hrSalaryField' },
              { model: Payheadmaster, as: 'Payheadmaster' },
              'payheadName',
              'ASC',
            ],
          ],
        }),
      ];
      // previous salary condition and attributes
      const previousSalaryCondition = {
        payrollFrequency,
        userMasterID: userChunk,
      };

      const attributesCondition = [
        'hrSalaryTrasaction.userMasterID',
        'salaryYYYYMM',
        'hrSalaryTrasaction.payrollFrequency',
        'startDate',
        'endDate',
        [
          Sequelize.literal(`
            SUM(
               CASE 
            WHEN "HSM->GSS->HSF->PHM"."payheadMasterId" = 135 
            THEN "hrSalaryTrasaction"."EmployeeSalaryAmount" 
            ELSE 0 
          END
        )
      `),
          'totalTaxAmount',
        ],
      ];

      if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
        const startMonth = String(year) + '01';
        const endMonth = String(year) + '12';

        previousMonthRanges = await getYearMonthByRange(
          startMonth,
          +yearmonth - 1,
        );

        // set month
        previousSalaryCondition.salaryYYYYMM = {
          [Sequelize.Op.gte]: startMonth,
          [Sequelize.Op.lt]: yearmonth,
        };

        attributesCondition.push(
          [
            Sequelize.literal(`
               SUM(
          CASE 
            WHEN "HSM->GSS->HSF->PHM"."taxApplicability" = '${TaxApplicabilityType.TAXABLE}' AND "HSM->GSS->HSF"."salaryFieldSrNo" = 'A' 
            THEN "hrSalaryTrasaction"."EmployeeSalaryAmount" 
            ELSE 0 
          END
        )
      `),
            'totalTaxableAmount',
          ],
          [
            Sequelize.literal(`
            SUM(
               CASE 
            WHEN "HSM->GSS->HSF->PHM"."payheadMasterId" = 133
            THEN "hrSalaryTrasaction"."EmployeeSalaryAmount" 
            ELSE 0 
          END
        )
      `),
            'salarySacrificeAmount',
          ],
        );

        const projectedQueryArray = [];

        // Get the range of months
        const ranges = await getYearMonthByRange(+yearmonth + 1, endMonth);

        for (const range of ranges) {
          projectedQueryArray.push(
            HRSalaryMasterFields.findAll({
              raw: true,
              where: {
                userMasterID: {
                  [Sequelize.Op.in]: userChunk,
                },
                [Sequelize.Op.and]: Sequelize.literal(`
             ("hrSalaryMaster"."userMasterID", "hrSalaryMaster"."salaryFromYYYYMM") IN (
               SELECT "userMasterID", MAX("salaryFromYYYYMM") AS "maxMonth"
               FROM "hrSalaryMasters"
               WHERE "salaryFromYYYYMM" <= ${range}
               AND "userMasterID" IN (${userChunk.join(',')})
               GROUP BY "userMasterID"
             )
           `),
              },
              include: [
                {
                  model: GradeSalaryStructure,
                  as: 'GSS',
                  attributes: [],
                  include: [
                    {
                      model: HRSalaryFields,
                      as: 'HSF',
                      where: {
                        salaryFieldSrNo: 'A',
                        payheadMasterId: {
                          [Sequelize.Op.notIn]: [1, 50, 92],
                        },
                      },
                      attributes: [],
                      include: [
                        {
                          model: Payheadmaster,
                          as: 'PHM',
                          where: {
                            taxApplicability: TaxApplicabilityType.TAXABLE,
                          },
                          attributes: [],
                        },
                      ],
                    },
                  ],
                },
              ],
              attributes: [
                'userMasterID',
                [
                  Sequelize.literal(`
        SUM(
          CASE 
            WHEN "GSS->HSF->PHM"."taxApplicability" = '${TaxApplicabilityType.TAXABLE}' AND "GSS->HSF"."salaryFieldSrNo" = 'A'
            THEN "EmployeeSalaryAmount" 
            ELSE 0 
          END
        )
      `),
                  'totalTaxableAmount',
                ],
              ],
              group: ['userMasterID'],
            }).then((data) =>
              data.map((record) => ({
                ...record,
                salaryMonth: range,
              })),
            ),
          );
        }

        projectedSalaryArray = (await Promise.all(projectedQueryArray)).flat();
      } else {
        previousSalaryCondition.startDate = {
          [Sequelize.Op.lt]: startDate,
        };

        previousSalaryCondition.endDate = {
          [Sequelize.Op.lt]: endDate,
        };

        attributesCondition.push([
          Sequelize.literal(`
        SUM(
          CASE 
            WHEN "HSM->GSS->HSF->PHM"."taxApplicability" = '${TaxApplicabilityType.TAXABLE}' AND "HSM->GSS->HSF"."salaryFieldSrNo" = 'A'
            THEN "hrSalaryTrasaction"."EmployeeSalaryAmount" 
            ELSE 0 
          END
        )
      `),
          'totalTaxableAmount',
        ]);
      }

      // YTD TAx Entry

      mainQueryArray.push(
        YTDTaxEntries.findAll({
          where: {
            year,
            userMasterId: userChunk,
            payrollFrequency,
          },
        }),
      );

      // previous calculate dsalary
      const previousCalculatedSalary = await HRSalaryTrasaction.findAll({
        raw: true,
        where: previousSalaryCondition,
        include: [
          {
            model: HRSalaryMasterFields,
            as: 'HSM',
            attributes: [],
            include: [
              {
                model: GradeSalaryStructure,
                as: 'GSS',
                attributes: [],
                include: [
                  {
                    model: HRSalaryFields,
                    as: 'HSF',
                    where: {
                      payheadMasterId: {
                        [Sequelize.Op.notIn]: [1, 50, 92],
                      },
                    },
                    attributes: [],
                    include: [
                      {
                        model: Payheadmaster,
                        as: 'PHM',
                        attributes: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],

        attributes: attributesCondition,
        group: [
          'hrSalaryTrasaction.userMasterID',
          'salaryYYYYMM',
          'hrSalaryTrasaction.payrollFrequency',
          'hrSalaryTrasaction.startDate',
          'hrSalaryTrasaction.endDate',
        ],
      });

      const resultData = await Promise.all(mainQueryArray);

      const usermaster = resultData[0] || [];
      const salaryMasterData = resultData[1] || [];
      const YTDTaxData = resultData[2] || [];

      if (usermaster.length == 0) throw new Error('User not found!');

      const All_EmployeeLeavePolicyIds = [
        ...new Set(
          usermaster.flatMap(
            (e) => e.empLeavePolicies?.[0]?.employeeLeavePolicyID,
          ),
        ),
      ];

      const queryArray = [
        Shift.findAll({
          where: {
            companyMasterID: usermaster[0].companyMasterId,
            status: 1,
          },
          include: [{ model: ShiftTIme }],
        }),
      ];

      if (All_EmployeeLeavePolicyIds.length && usermaster.length) {
        queryArray.push(
          employeeLeavePolicy.findAll({
            where: {
              id: {
                [Sequelize.Op.in]: All_EmployeeLeavePolicyIds,
              },
            },
            attributes: [
              'id',
              'fixedAmount_ENC',
              'leaveId',
              'payheadIds',
              'ratio',
            ],
          }),
          HrLeaveTypes.findAll({
            where: {
              companyMasterID: usermaster[0].companyMasterId,
              status: 1,
            },
          }),
        );
      }

      const resultArray = await Promise.all(queryArray);

      const AllShifts = resultArray[0];
      const allEmployeeLeavePolicy = resultArray[1];
      const AllHrleaveTypes = resultArray[2];

      for (let i = 0; i < usermaster.length; i++) {
        const employeeSalary = await HRSalaryTrasaction.findOne({
          where: {
            ...salaryCondition,
            userMasterID: usermaster[i].userMasterID,
          },
        });

        if (employeeSalary) continue;

        // Attendance verified or not

        const AllcalculatedAttendanceData =
          usermaster[i].hrLeaveMonthlyTrans || [];

        const employeeJoining =
          usermaster[i].employeeJoiningDetails &&
          usermaster[i].employeeJoiningDetails.length > 0
            ? usermaster[i].employeeJoiningDetails[0]
            : null;

        // Exclude FNF employee ids data

        if (from == 'salary') {
          const leavingDate = employeeJoining?.leavingDate || '';
          if (leavingDate) {
            const startDate =
                AllcalculatedAttendanceData[0]?.monthstartdate || '',
              endDate = AllcalculatedAttendanceData[0]?.monthenddate || '';
            if (
              startDate &&
              endDate &&
              new Date(leavingDate).getTime() >=
                new Date(startDate).getTime() &&
              new Date(leavingDate).getTime() <= new Date(endDate)
            )
              continue;
          }
        }

        const calculatedAttendanceData = AllcalculatedAttendanceData.filter(
          (e) => ![30, 31].includes(e.hrLeaveType.LeaveID),
        );
        if (calculatedAttendanceData.length === 0) continue;
        // salary structure found or not
        const AllsalarystructureData = salaryMasterData.filter(
          (e) => e.userMasterID == usermaster[i].userMasterID,
        );

        const CTC_GROSS_NET = AllsalarystructureData.filter((e) =>
          [50, 92, 1].includes(e.payheadMasterId),
        );

        const EPF_Data = AllsalarystructureData.find(
          (e) => e.payheadMasterId == 5,
        );

        const salarystructure = AllsalarystructureData.filter(
          (e) => ![50, 92, 1, 99, 5].includes(e.payheadMasterId),
        );

        // for LWP Deduction
        const lwp_deduction = AllsalarystructureData.find(
          (e) => e.payheadMasterId == 99,
        );

        const LWP_flag = lwp_deduction?.status == 1 ? true : false;

        if (salarystructure.length === 0) continue;

        const branchId = calculatedAttendanceData[0].branchId || null;
        const departmentId = calculatedAttendanceData[0].departmentId || null;
        const designationId = calculatedAttendanceData[0].designationId || null;

        // salary Policy
        const employeeSalaryPolicy =
          payrollFrequency ==
          usermaster[i].employeeSalaryPolicies?.[0]?.salaryPolicy
            ?.payrollFrequency
            ? usermaster[i].employeeSalaryPolicies?.[0]?.salaryPolicy
            : null;

        // Attendancepolicy
        const userAttendacepolicy =
          usermaster[i].employeeAttendancePolicies?.[0]?.attendancePolicy ||
          null;

        // Bonus Policy
        const bonusPolicy =
          usermaster[i].employeeBonusPolicies?.[0]?.bonusPolicy || null;

        // Encashment Data
        const employeeLeaveEncashment = usermaster[i].leaveEncashments || [];

        // LCEG Penalty Data
        const LCEGPenaltyData = usermaster[i].lcegPenalties || [];

        // shift Roster
        const rosterData = usermaster[i].shiftRosters || [];

        // set ESIC deduction yes or no

        const esicDeduction =
          employeeJoining &&
          employeeJoining.esicEndMonth &&
          employeeJoining.esicEndMonth !== 'undefined'
            ? employeeJoining.esicEndMonth < +yearmonth
              ? false
              : true
            : true;

        // NCSL data

        const NCSLData = usermaster[i].empNCSLDeductions || [];

        // family count
        const dependantData = usermaster[i].userFamilies || [];
        const dependantCount = dependantData.length;

        // -- data for tax----

        const employeeYTDData = YTDTaxData.find(
          (e) => e.userMasterId == usermaster[i].userMasterID,
        );

        const calculatedSalaryData = previousCalculatedSalary.filter(
          (e) => e.userMasterID == usermaster[i].userMasterID,
        );

        const projectedSalaryData =
          projectedSalaryArray.filter(
            (e) => e.userMasterID == usermaster[i].userMasterID,
          ) || [];

        let start_date = calculatedAttendanceData[0].monthstartdate;
        let end_date = calculatedAttendanceData[0].monthenddate,
          payrollStartDate = calculatedAttendanceData[0].startDate;
        payrollEndDate = calculatedAttendanceData[0].endDate;

        // set NCSL deduction flag
        const nasFundFlag =
          employeeJoining?.pfNumber &&
          employeeJoining?.pfjoiningDate &&
          new Date(employeeJoining.pfjoiningDate) <= new Date(payrollEndDate)
            ? true
            : false;
        const ncslFlag =
          employeeJoining?.esicNumber &&
          employeeJoining?.esicjoiningDate &&
          new Date(employeeJoining.esicjoiningDate) <= new Date(payrollEndDate)
            ? true
            : false;

        let monday = temp_monday;

        // if payroll frequency is monthly
        if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
          monday = daysInMonth(start_date.slice(5, 7), start_date.slice(0, 4));
        }

        // EmployeeShift
        const employeeShift =
          (usermaster[i].employeeShifts || []).filter(
            (e) =>
              new Date(e.startDate) <= new Date(end_date) &&
              (new Date(e.endDate) >= new Date(end_date) || !e.endDate),
          ) || [];

        let userSalaryArray = [];
        let employee_netPay = 0;
        let employee_gross = 0;
        let gross =
          CTC_GROSS_NET.find((e) => e.payheadMasterId == 50)
            ?.EmployeeSalaryAmount || 0;
        let employee_extraAddInNetPay = 0;

        let salary_CalculationDays;
        let usertotalpresentday;
        let salary_calculation_wise;
        let dailyworkingminutes = 0;
        let showusersalary = [];

        let totaldays = calculatedAttendanceData.reduce(
          (acc, obj) => acc + +obj.AttnVal,
          0,
        );
        let salaryCalculationAct = employeeJoining.salaryCalculationAct;

        const weekOffHolidayPriority =
          userAttendacepolicy?.WHPHPriority || null;

        const typeCondition =
          weekOffHolidayPriority === 'PH' ? "'holiday'" : "'weekoff'";

        const weekoffHoliday = await weekoffHolidayTran.findAll({
          where: {
            userMasterID: usermaster[i].userMasterID,
            date: {
              [Sequelize.Op.between]: [start_date, end_date],
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
               WHERE "userMasterID" = ${usermaster[i].userMasterID}
                 AND date BETWEEN '${start_date}' AND '${end_date}'
                 AND ("optionalHoliday" IS FALSE OR "optionalHoliday" IS NULL)
               GROUP BY date
             )`),
          },
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
        });

        // To Get UnPaid Days Of User
        const unpaidDays = calculatedAttendanceData
          .filter((e) => [5, 18, 22, 28].includes(e.hrLeaveType.LeaveID))
          .reduce((acc, obj) => acc + +obj.AttnVal, 0);

        if (employeeSalaryPolicy) {
          let salaryCalculationDays =
              employeeSalaryPolicy.salaryCalculationDays,
            salarycalbasedon = employeeSalaryPolicy.salarycalculationBasedon;
          if (salaryCalculationDays && salarycalbasedon == 'daywise') {
            salary_CalculationDays = salaryCalculationDays;

            if (salaryCalculationAct == 'F' || salaryCalculationAct == 'W') {
              const notpaiddata =
                salaryCalculationAct == 'F'
                  ? calculatedAttendanceData.filter((e) =>
                      [5, 18, 7, 22, 28].includes(e.hrLeaveType.LeaveID),
                    )
                  : calculatedAttendanceData.filter((e) =>
                      [5, 18, 7, 9, 22, 28].includes(e.hrLeaveType.LeaveID),
                    );

              const userabsentday = notpaiddata.reduce(
                (acc, obj) => acc + +obj.AttnVal,
                0,
              );

              usertotalpresentday =
                +totaldays - +userabsentday > 0
                  ? +totaldays - +userabsentday
                  : 0;
            } else {
              const excludedLeaveIDs = [5, 18, 22, 28];

              usertotalpresentday = calculatedAttendanceData.reduce(
                (acc, obj) => {
                  if (!excludedLeaveIDs.includes(obj.hrLeaveType.LeaveID)) {
                    return acc + Number(obj.AttnVal);
                  }
                  return acc;
                },
                0,
              );
            }
          } else {
            if (salarycalbasedon == 'hourwise') {
              salary_calculation_wise = 'hourwise';

              const attendance = await attendanceTransaction.findOne({
                raw: true,
                where: {
                  userMasterID: usermaster[i].userMasterID,
                  AttendanceDate: {
                    [Sequelize.Op.between]: [start_date, end_date],
                  },
                },
                order: [['AttendanceDate', 'DESC']],
              });

              const roster =
                rosterData.find((e) => e.shiftRosterDate == end_date) || null;

              const Allminutes = getMonthlyDailyWorkingMinutes(
                employeeSalaryPolicy,
                attendance,
                monday,
                roster,
                AllShifts,
                employeeShift[0],
              );

              let monthly_Workingminutes = Allminutes.monthly_Workingminutes;
              let daily_workingminutes = Allminutes.daily_workingminutes;

              salary_CalculationDays = Number(monthly_Workingminutes);
              dailyworkingminutes = Number(daily_workingminutes);

              usertotalpresentday = calculatedAttendanceData.reduce(
                (acc, obj) => {
                  if (obj.hrLeaveType.LeaveID == 20) {
                    return acc + Number(obj.AttnVal);
                  }
                  return acc;
                },
                0,
              );
            } else {
              if (salaryCalculationAct == 'F' || salaryCalculationAct == 'W') {
                const notpaiddata =
                  salaryCalculationAct == 'F'
                    ? calculatedAttendanceData.filter((e) =>
                        [5, 18, 7, 22, 28].includes(e.hrLeaveType.LeaveID),
                      )
                    : calculatedAttendanceData.filter((e) =>
                        [5, 18, 7, 9, 22, 28].includes(e.hrLeaveType.LeaveID),
                      );

                const sumOfWeekoff =
                  salaryCalculationAct == 'F'
                    ? weekoffHoliday
                        .filter((e) => e.tableName == 'weekoff')
                        .reduce((acc, obj) => acc + +obj.value, 0)
                    : weekoffHoliday.reduce((acc, obj) => acc + +obj.value, 0);

                salary_CalculationDays = +monday - +sumOfWeekoff;

                const userabsentday = notpaiddata.reduce(
                  (acc, obj) => acc + +obj.AttnVal,
                  0,
                );

                usertotalpresentday =
                  +totaldays - +userabsentday > 0
                    ? +totaldays - +userabsentday
                    : 0;
              } else {
                salary_CalculationDays = Number(monday);

                const excludedLeaveIDs = [5, 18, 22, 28];

                usertotalpresentday = calculatedAttendanceData.reduce(
                  (acc, obj) => {
                    if (!excludedLeaveIDs.includes(obj.hrLeaveType.LeaveID)) {
                      return acc + Number(obj.AttnVal);
                    }
                    return acc;
                  },
                  0,
                );
              }
            }
          }
        } else {
          if (salaryCalculationAct == 'F' || salaryCalculationAct == 'W') {
            const notpaiddata =
              salaryCalculationAct == 'F'
                ? calculatedAttendanceData.filter((e) =>
                    [5, 18, 7, 22, 28].includes(e.hrLeaveType.LeaveID),
                  )
                : calculatedAttendanceData.filter((e) =>
                    [5, 18, 7, 9, 22, 28].includes(e.hrLeaveType.LeaveID),
                  );

            const sumOfWeekoff =
              salaryCalculationAct == 'F'
                ? weekoffHoliday
                    .filter((e) => e.tableName == 'weekoff')
                    .reduce((acc, obj) => acc + +obj.value, 0)
                : weekoffHoliday.reduce((acc, obj) => acc + +obj.value, 0);

            salary_CalculationDays = +monday - +sumOfWeekoff;

            const userabsentday = notpaiddata.reduce(
              (acc, obj) => acc + +obj.AttnVal,
              0,
            );

            usertotalpresentday =
              +totaldays - +userabsentday > 0 ? +totaldays - +userabsentday : 0;
          } else {
            salary_CalculationDays = Number(monday);

            const excludedLeaveIDs = [5, 18, 22, 28];

            usertotalpresentday = calculatedAttendanceData.reduce(
              (acc, obj) => {
                if (!excludedLeaveIDs.includes(obj.hrLeaveType.LeaveID)) {
                  return acc + Number(obj.AttnVal);
                }
                return acc;
              },
              0,
            );
          }
        }

        const salaryStructureBaseoncal = salarystructure[0].baseOnCalculation;

        // if salary structure hourly
        if (
          salaryStructureBaseoncal == 'H' &&
          salary_calculation_wise != 'hourwise'
        )
          continue;

        // Attendance Data
        let attendanceTransData = [];

        // Fetch attendance data only if any salary structure field is set to depends on physical presence
        if (
          salarystructure.find((e) => e.salaryFieldAttanChk == 2) ||
          salaryStructureBaseoncal == 'H' ||
          salary_calculation_wise == 'hourwise' ||
          LCEGPenaltyData.find(
            (e) => e.penaltyType == LCEGPenaltyTypeEnum.MINUTE,
          )
        ) {
          attendanceTransData = await getAttendanceData(
            usermaster[i].userMasterID,
            start_date,
            end_date,
            false,
          );
        }

        // check pf/esic Applicable or not on overtime

        let pfApplicable = '';
        let esicApplicable = '';

        if (userAttendacepolicy) {
          pfApplicable = userAttendacepolicy.pfApplicable;
          esicApplicable = userAttendacepolicy.esicApplicable;
        }

        // LCEG Policy
        const userLateComeEarlyGoPolicy =
          (usermaster[i].employeeLateEarlyPolicies || []).find(
            (e) =>
              new Date(e.startDate) <= new Date(end_date) &&
              (new Date(e.endDate) >= new Date(end_date) || !e.endDate),
          )?.lateEarlyPolicy || null;

        let PenaltyInSalary = 0;

        if (userLateComeEarlyGoPolicy) {
          const salarydetails = {
            salaryStructureBaseoncal: salaryStructureBaseoncal,
            gross: gross,
            salary_CalculationDays: salary_CalculationDays,
          };

          PenaltyInSalary = await calculatePenaltyInSalaryPNG(
            userLateComeEarlyGoPolicy,
            salarydetails,
            usermaster[i].userMasterID,
            start_date,
            end_date,
            weekoffHoliday,
          );
        }
        // Advance
        const advanceData = usermaster[i].advancePayments || [];

        // loan
        const loanData = usermaster[i].loanMasters || [];

        // overtime

        const overtime = usermaster[i].OverTimeCalculationMains?.[0] || null;

        // Expense Data

        const expenseData = usermaster[i].expensePayments || [];

        // start transaction
        await sequelize.transaction(async (t) => {
          const [incentiveData, penaltydata] = await Promise.all([
            Employeeincentive.findAll({
              raw: true,
              where: {
                userMasterID: usermaster[i].userMasterID,
                // yearmonth: yearmonth,
                incentiveDate: {
                  [Sequelize.Op.between]: [start_date, end_date],
                },
                status: 1,
              },
              include: [
                { model: Incentivetype, where: { showinsalaryslip: 'true' } },
              ],
            }),
            EmployeePenalty.findAll({
              raw: true,
              where: {
                userMasterID: usermaster[i].userMasterID,
                status: 1,
                penaltyDate: {
                  [Sequelize.Op.between]: [start_date, end_date],
                },
                employeePenaltyID: {
                  [Sequelize.Op.notIn]: Sequelize.literal(`(
                                         SELECT DISTINCT "employeePenaltyID" FROM "employeeRepayments" WHERE "employeePenaltyID" in (SELECT "employeePenaltyID" from "employeePenalties" as emp LEFT join
                                         "penalties" as pe on emp."penaltyID" = pe."penaltyID" where "userMasterID" = ${usermaster[i].userMasterID} and emp.status=1 and pe."deductionFromSalary" = TRUE and emp."penaltyDate" BETWEEN '${start_date}' AND '${end_date}')
                                     )`),
                },
              },
              include: [
                {
                  required: true,
                  model: Penalty,
                  as: 'penalty',
                  where: { deductionFromSalary: 'TRUE' },
                  attributes: [],
                },
              ],
              attributes: [
                'employeePenaltyID',
                'penaltyID',
                [Sequelize.col('penalty.penaltyName'), 'penaltyName'],
                ['penaltyAmount', 'amount'],
              ],
            }),
          ]);

          // Deposit Data

          const depositToDeduction = usermaster[i].deposits?.length
            ? [...usermaster[i].deposits].filter(
                (e) =>
                  e.depositReceiveAs == 'salary' && e.salaryMonth == yearmonth,
              )
            : [];

          const depositToPay = [];

          const depositToDeductionArray = [];
          const depositToPayArray = [];

          // TO get Remaining Days of Month

          let Remaing_Weekoff_Holiday = 0;

          if (salaryCalculationAct == 'F' || salaryCalculationAct == 'W') {
            const actaulEarnigWeekoff = AllcalculatedAttendanceData.filter(
              (e) => e['hrLeaveType.LeaveID'] == 30,
            ).reduce((acc, obj) => acc + +obj.AttnVal, 0);
            const actaulEarnigHoliday = AllcalculatedAttendanceData.filter(
              (e) => e['hrLeaveType.LeaveID'] == 31,
            ).reduce((acc, obj) => acc + +obj.AttnVal, 0);

            const actualWeekoff = weekoffHoliday
              .filter((e) => e.tableName == 'weekoff')
              .reduce((acc, obj) => acc + +obj.value, 0);

            const actualHoliday = weekoffHoliday
              .filter((e) => e.tableName == 'holiday')
              .reduce((acc, obj) => acc + +obj.value, 0);

            Remaing_Weekoff_Holiday =
              salaryCalculationAct == 'F'
                ? +actualWeekoff - +actaulEarnigWeekoff
                : +actualWeekoff -
                  +actaulEarnigWeekoff +
                  (+actualHoliday - +actaulEarnigHoliday);
          }

          const remainingDays =
            +monday - (+totaldays + +Remaing_Weekoff_Holiday) > 0
              ? +monday - (+totaldays + +Remaing_Weekoff_Holiday)
              : 0;

          // leaveEncashIds
          let finalEncashIds = [];
          let longServiceEncashIds = [];

          let BonusPayData = null,
            addCurrentBonusId = false,
            BonusIds = [];

          // --------------- salary calculation --------------------

          let incentiveArray = [];
          let finalinsentivearray = [];
          let finalpenaltyarray = [];
          let overtimeArray = [];

          let overtimeAmount = 0;
          let esicIncentiveAmount = 0;
          let pfIncentiveAmount = 0;
          let OtherEmployee_ESIC_Amount = 0,
            OtherEmployer_ESIC_Amount = 0,
            ESIC_CalculatedOn_Amount = 0;

          let perminuteAmount = 0;

          const basicPay =
            salarystructure.find((e) => e.payheadMasterId == 145)
              ?.ActualEmployeeSalaryAmount || 0;

          if (salarystructure[0].baseOnCalculation == 'M') {
            if (salary_calculation_wise == 'hourwise') {
              perminuteAmount =
                Number(basicPay) / Number(salary_CalculationDays);
            } else {
              perminuteAmount =
                Number(basicPay) / Number(salary_CalculationDays) / 8;
            }
          } else if (salarystructure[0].baseOnCalculation == 'D') {
            if (salary_calculation_wise == 'hourwise') {
              perminuteAmount = Number(basicPay) / Number(dailyworkingminutes);
            } else {
              perminuteAmount = Number(basicPay) / 8;
            }
          } else if (salarystructure[0].baseOnCalculation == 'H') {
            perminuteAmount = Number(basicPay) / Number(60);
          }

          for (let j = 0; j < salarystructure.length; j++) {
            let finalsalary = 0;

            const obj = {
              salaryMasterID: salarystructure[j].salaryMasterID,
              payheadmasterid: salarystructure[j].payheadMasterId,
              payheadName:
                salarystructure[j].payheadDisplayName &&
                salarystructure[j].payheadDisplayName.trim()
                  ? salarystructure[j].payheadDisplayName.trim()
                  : salarystructure[j].payheadName,
              employeeAmount: 0,
              salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
              salaryfieldside: salarystructure[j].salaryFieldSide,
              salaryfieldshow: salarystructure[j].salaryFieldShow,
              calculatedOn: null,
              salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
              incentiveid: null,
              penaltyid: null,
              taxApplicability: salarystructure[j].taxApplicability,
              salaryFieldRound: salarystructure[j].salaryFieldRound,
              salaryFieldRoundNo: salarystructure[j].salaryFieldRoundNo,
              roundOffType: salarystructure[j].roundOffType,
              considerIn: salarystructure[j].considerIn,
            };

            if (salarystructure[j].payheadMasterId == 16) {
              //Advance

              finalsalary = advanceData.reduce((acc, item) => {
                const childSum = (item.employeeRepayments || []).reduce(
                  (sum, child) => sum + +child.amount,
                  0,
                );
                return acc + (+item.amount - +childSum);
              }, 0);

              obj.employeeAmount =
                finalsalary > 0 ? Math.round(finalsalary) : 0;
              // push in salary array
              userSalaryArray.push(obj);
            } else if (salarystructure[j].payheadMasterId == 17) {
              //Loan

              finalsalary = loanData.reduce((sum, item) => {
                const transactionSum = (item.loanTransactions || []).reduce(
                  (acc, t) => acc + t.EMIAmount,
                  0,
                );
                return sum + transactionSum;
              }, 0);

              obj.employeeAmount =
                finalsalary > 0
                  ? getRoundOffSalary(
                      finalsalary,
                      salarystructure[j].salaryFieldRound,
                      salarystructure[j].roundOffType,
                      salarystructure[j].salaryFieldRoundNo,
                    )
                  : 0;
              // push in salary array
              userSalaryArray.push(obj);
            } else if (salarystructure[j].payheadMasterId == 24) {
              // Incentive

              let incentive = incentiveData;

              let incentiveid = [];
              let amountarray = [];
              if (incentive.length > 0) {
                for (let a = 0; a < incentive.length; a++) {
                  const incObj = { ...obj };
                  const incArrayObj = { ...obj };

                  amountarray.push(+incentive[a].amount);

                  const incentiveName = incentive[a][
                    'incentivetype.inc_type_displayName'
                  ]
                    ? incentive[a]['incentivetype.inc_type_displayName']
                    : incentive[a]['incentivetype.incentivetypename'];

                  // FOR ESIC
                  if (incentive[a]['incentivetype.esicApplicable'] == 'true') {
                    OtherEmployee_ESIC_Amount +=
                      (+incentive[a].amount *
                        +incentive[a]['incentivetype.employeeESICPer']) /
                      100;
                    OtherEmployer_ESIC_Amount +=
                      (+incentive[a].amount *
                        +incentive[a]['incentivetype.employerESICPer']) /
                      100;
                    ESIC_CalculatedOn_Amount += +incentive[a].amount;
                  }

                  let find_id = incentiveid.filter((e) => {
                    return e == incentive[a].IncentivetypeID;
                  });

                  if (find_id.length > 0) {
                    let p_Array = incentiveArray.filter((e) => {
                      return e.incentiveid == incentive[a].IncentivetypeID;
                    });

                    let totalAmount =
                      Number(p_Array[0].employeeAmount) +
                      Number(incentive[a].amount);

                    if (incentive[a]['incentivetype.consider'] == 'gross') {
                      if (
                        incentive[a]['incentivetype.pfApplicable'] == 'true'
                      ) {
                        pfIncentiveAmount =
                          +pfIncentiveAmount + +incentive[a].amount;
                      }

                      if (
                        incentive[a]['incentivetype.esicApplicable'] == 'true'
                      ) {
                        esicIncentiveAmount =
                          +esicIncentiveAmount + +incentive[a].amount;
                      }

                      userSalaryArray = userSalaryArray.filter((e) => {
                        return e.incentiveid != incentive[a].IncentivetypeID;
                      });

                      incObj.employeeAmount =
                        totalAmount > 0
                          ? getRoundOffSalary(
                              totalAmount,
                              salarystructure[j].salaryFieldRound,
                              salarystructure[j].roundOffType,
                              salarystructure[j].salaryFieldRoundNo,
                            )
                          : 0;
                      incObj.payheadName = incentiveName;
                      incObj.incentiveid = incentive[a].IncentivetypeID;
                      // push in salary array
                      userSalaryArray.push(incObj);
                    }

                    incentiveArray = incentiveArray.filter((e) => {
                      return e.incentiveid != incentive[a].IncentivetypeID;
                    });

                    incArrayObj.employeeAmount =
                      totalAmount > 0
                        ? getRoundOffSalary(
                            totalAmount,
                            salarystructure[j].salaryFieldRound,
                            salarystructure[j].roundOffType,
                            salarystructure[j].salaryFieldRoundNo,
                          )
                        : 0;
                    incArrayObj.payheadName = incentiveName;
                    incArrayObj.incentiveid = incentive[a].IncentivetypeID;
                    // push in incentive array
                    incentiveArray.push(incArrayObj);
                  } else {
                    incentiveid.push(incentive[a].IncentivetypeID);

                    if (incentive[a]['incentivetype.consider'] == 'gross') {
                      if (
                        incentive[a]['incentivetype.pfApplicable'] == 'true'
                      ) {
                        pfIncentiveAmount =
                          +pfIncentiveAmount + +incentive[a].amount;
                      }

                      if (
                        incentive[a]['incentivetype.esicApplicable'] == 'true'
                      ) {
                        esicIncentiveAmount =
                          +esicIncentiveAmount + +incentive[a].amount;
                      }

                      incObj.employeeAmount =
                        incentive[a].amount > 0
                          ? getRoundOffSalary(
                              incentive[a].amount,
                              salarystructure[j].salaryFieldRound,
                              salarystructure[j].roundOffType,
                              salarystructure[j].salaryFieldRoundNo,
                            )
                          : 0;
                      incObj.payheadName = incentiveName;
                      incObj.incentiveid = incentive[a].IncentivetypeID;
                      // push in salary array
                      userSalaryArray.push(incObj);
                    }

                    incArrayObj.employeeAmount =
                      incentive[a].amount > 0
                        ? getRoundOffSalary(
                            incentive[a].amount,
                            salarystructure[j].salaryFieldRound,
                            salarystructure[j].roundOffType,
                            salarystructure[j].salaryFieldRoundNo,
                          )
                        : 0;
                    incArrayObj.payheadName = incentiveName;
                    incArrayObj.incentiveid = incentive[a].IncentivetypeID;
                    // push in incentive array
                    incentiveArray.push(incArrayObj);
                  }
                }

                const finalamount = amountarray.reduce((acc, obj) => {
                  return acc + +obj;
                }, 0);

                obj.employeeAmount =
                  finalamount > 0
                    ? getRoundOffSalary(
                        finalamount,
                        salarystructure[j].salaryFieldRound,
                        salarystructure[j].roundOffType,
                        salarystructure[j].salaryFieldRoundNo,
                      )
                    : 0;
                obj.payheadName =
                  salarystructure[j].payheadDisplayName &&
                  salarystructure[j].payheadDisplayName.trim()
                    ? salarystructure[j].payheadDisplayName.trim()
                    : salarystructure[j].payheadName;
                obj.incentiveid = null;
                // push in final incentive array
                finalinsentivearray.push(obj);
              } else {
                userSalaryArray.push(obj);
              }
            } else if (salarystructure[j].payheadMasterId == 34) {
              // Penalty

              let penaltyid = [];
              let amountarray = [];

              if (penaltydata.length > 0) {
                for (let b = 0; b < penaltydata.length; b++) {
                  const penaltyObj = { ...obj };

                  amountarray.push(+penaltydata[b].amount);

                  let find_id = penaltyid.filter((e) => {
                    return e == penaltydata[b].penaltyID;
                  });

                  if (find_id.length > 0) {
                    let p_Array = userSalaryArray.filter((e) => {
                      return e.penaltyid == penaltydata[b].penaltyID;
                    });

                    userSalaryArray = userSalaryArray.filter((e) => {
                      return e.penaltyid != penaltydata[b].penaltyID;
                    });

                    const totalAmount =
                      Number(p_Array[0].employeeAmount) +
                      Number(penaltydata[b].amount);

                    penaltyObj.employeeAmount =
                      totalAmount > 0
                        ? getRoundOffSalary(
                            totalAmount,
                            salarystructure[j].salaryFieldRound,
                            salarystructure[j].roundOffType,
                            salarystructure[j].salaryFieldRoundNo,
                          )
                        : 0;
                    penaltyObj.payheadName = penaltydata[b].penaltyName;
                    penaltyObj.penaltyid = penaltydata[b].penaltyID;

                    userSalaryArray.push(penaltyObj);
                  } else {
                    penaltyid.push(penaltydata[b].penaltyID);

                    penaltyObj.employeeAmount =
                      penaltydata[b].amount > 0
                        ? getRoundOffSalary(
                            penaltydata[b].amount,
                            salarystructure[j].salaryFieldRound,
                            salarystructure[j].roundOffType,
                            salarystructure[j].salaryFieldRoundNo,
                          )
                        : 0;
                    penaltyObj.payheadName = penaltydata[b].penaltyName;
                    penaltyObj.penaltyid = penaltydata[b].penaltyID;

                    userSalaryArray.push(penaltyObj);
                  }
                }

                const finalamount = amountarray.reduce((acc, obj) => {
                  return acc + obj;
                }, 0);

                obj.employeeAmount =
                  finalamount > 0
                    ? getRoundOffSalary(
                        finalamount,
                        salarystructure[j].salaryFieldRound,
                        salarystructure[j].roundOffType,
                        salarystructure[j].salaryFieldRoundNo,
                      )
                    : 0;
                obj.payheadName =
                  salarystructure[j].payheadDisplayName &&
                  salarystructure[j].payheadDisplayName.trim()
                    ? salarystructure[j].payheadDisplayName.trim()
                    : salarystructure[j].payheadName;
                obj.penaltyid = null;

                finalpenaltyarray.push(obj);
              } else {
                userSalaryArray.push(obj);
              }
            } else if (salarystructure[j].payheadMasterId == 9) {
              // TDS

              let tdsAmount = 0;

              // if (usermaster[i].companyMaster.tdsdeduction == true) {
              //   const financialYear = await getFinancialYearByMonth(yearmonth);

              //   const incomeTaxData = (
              //     await incomeTaxCalculationByUserId(
              //       usermaster[i].userMasterID,
              //       financialYear
              //     )
              //   ).data.find((e) => e.yearMonth == yearmonth);

              //   tdsAmount = incomeTaxData ? +incomeTaxData.amount : 0;
              // }

              obj.employeeAmount =
                salarystructure[j].salaryFieldRound == 'N'
                  ? +tdsAmount % 1 == 0
                    ? +tdsAmount
                    : +tdsAmount.toFixed(2)
                  : Math.round(+tdsAmount);

              userSalaryArray.push(obj);
            } else if (salarystructure[j].payheadMasterId == 43) {
              // Overtime

              if (
                salarystructure[j].salaryFieldShow == 'Y' &&
                overtime &&
                userAttendacepolicy
              ) {
                let showinsalaryslip = userAttendacepolicy.showinsalaryslip;

                let consider = userAttendacepolicy.consider;

                if (showinsalaryslip == 'true') {
                  overtimeAmount = Number(overtime.TotalAmount);

                  //For ESIC
                  if (esicApplicable == 'true') {
                    OtherEmployee_ESIC_Amount +=
                      (+overtimeAmount * +userAttendacepolicy.employeeESICPer) /
                      100;
                    OtherEmployer_ESIC_Amount +=
                      (+overtimeAmount * +userAttendacepolicy.employerESICPer) /
                      100;
                    ESIC_CalculatedOn_Amount += +overtimeAmount;
                  }

                  if (consider == 'gross') {
                    obj.employeeAmount = +overtime.TotalAmount;
                    userSalaryArray.push(obj);
                  } else {
                    obj.employeeAmount = +overtime.TotalAmount;
                    userSalaryArray.push(obj);
                  }
                } else {
                  userSalaryArray.push(obj);
                }
              } else {
                userSalaryArray.push(obj);
              }
            } else if (salarystructure[j].payheadMasterId == 15) {
            } else if (salarystructure[j].payheadMasterId == 13) {
            } else if (salarystructure[j].payheadMasterId == 135) {
            } else if (salarystructure[j].payheadMasterId == 14) {
            } else if (salarystructure[j].payheadMasterId == 78) {
              // penalty data

              finalsalary = penaltyDeductionCalculation(
                LCEGPenaltyData,
                attendanceTransData,
                salary_CalculationDays,
                gross,
                salaryStructureBaseoncal,
                salary_calculation_wise,
              );

              finalsalary += PenaltyInSalary;

              obj.employeeAmount = Math.round(finalsalary);
              userSalaryArray.push(obj);
            } else if (salarystructure[j].payheadMasterId == 96) {
              // Deposit to deduction from salary
              finalsalary = depositToDeduction.reduce(
                (acc, obj) => acc + +obj.amount,
                0,
              );

              const result = Object.values(
                depositToDeduction.reduce((acc, curr) => {
                  if (!acc[curr.depositcategory.depositcategoryname]) {
                    acc[curr.depositcategory.depositcategoryname] = {
                      salaryMasterID: salarystructure[j].salaryMasterID,
                      payheadmasterid: salarystructure[j].payheadMasterId,
                      payheadName: curr.depositcategory.depositcategoryname,
                      employeeAmount: 0,
                      salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                      salaryfieldside: salarystructure[j].salaryFieldSide,
                      salaryfieldshow: salarystructure[j].salaryFieldShow,
                      calculatedOn: null,
                      salaryfieldmaxrange: null,
                    };
                  }
                  acc[
                    curr.depositcategory.depositcategoryname
                  ].employeeAmount += curr.amount; // Sum the amount
                  return acc;
                }, {}),
              );

              userSalaryArray = [...userSalaryArray, ...result];

              obj.employeeAmount = Math.round(finalsalary);
              depositToDeductionArray.push(obj);
            } else if (salarystructure[j].payheadMasterId == 97) {
              // Deposit to pay in salary
              finalsalary = depositToPay.reduce(
                (acc, obj) => acc + +obj.amount,
                0,
              );

              const result = Object.values(
                depositToPay.reduce((acc, curr) => {
                  if (!acc[curr.depositcategory.depositcategoryname]) {
                    acc[curr.depositcategory.depositcategoryname] = {
                      salaryMasterID: salarystructure[j].salaryMasterID,
                      payheadmasterid: salarystructure[j].payheadMasterId,
                      payheadName: curr.depositcategory.depositcategoryname,
                      employeeAmount: 0,
                      salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                      salaryfieldside: salarystructure[j].salaryFieldSide,
                      salaryfieldshow: salarystructure[j].salaryFieldShow,
                      calculatedOn: null,
                      salaryfieldmaxrange: null,
                    };
                  }
                  acc[
                    curr.depositcategory.depositcategoryname
                  ].employeeAmount += curr.amount; // Sum the amount
                  return acc;
                }, {}),
              );

              userSalaryArray = [...userSalaryArray, ...result];

              obj.employeeAmount = Math.round(finalsalary);
              depositToPayArray.push(obj);
            } else if (salarystructure[j].payheadMasterId == 67) {
              // Leave Encashment

              const normalLeaveEncashemnt = employeeLeaveEncashment.filter(
                (e) => e.hrLeaveType?.LeaveID != 43,
              );

              const { amount, encashIds } = calculateLeaveEncashment_PNG(
                allEmployeeLeavePolicy,
                AllHrleaveTypes,
                normalLeaveEncashemnt,
                AllsalarystructureData,
              );

              // set encashids
              finalEncashIds = encashIds;

              obj.employeeAmount = getRoundOffSalary(
                amount,
                obj.salaryFieldRound,
                obj.roundOffType,
                obj.salaryFieldRoundNo,
              );
              userSalaryArray.push(obj);
            }
            // long service leave pay encashment
            else if (salarystructure[j].payheadMasterId == 152) {
              // Leave Encashment

              const longServiceLeaveEncashemnt = employeeLeaveEncashment.filter(
                (e) => e.hrLeaveType?.LeaveID == 43,
              );

              const { amount, encashIds } = calculateLeaveEncashment_PNG(
                allEmployeeLeavePolicy,
                AllHrleaveTypes,
                longServiceLeaveEncashemnt,
                AllsalarystructureData,
              );

              // set encashids
              longServiceEncashIds = encashIds;

              obj.employeeAmount = getRoundOffSalary(
                amount,
                obj.salaryFieldRound,
                obj.roundOffType,
                obj.salaryFieldRoundNo,
              );
              userSalaryArray.push(obj);
            } else if (salarystructure[j].payheadMasterId == 101) {
              BonusPayData = salarystructure[j];
            }

            // Expense Reimbursement
            else if (salarystructure[j].payheadMasterId == 116) {
              let expenseAmount = expenseData.reduce(
                (acc, obj) => acc + +obj.amount,
                0,
              );

              if (salarystructure[j].salaryFieldRound == 'Y') {
                expenseAmount =
                  salarystructure[j].roundOffType == 0
                    ? Math.ceil(expenseAmount.toFixed(2))
                    : Math.round(expenseAmount);
              } else {
                let salaryfieldroundno = Number(
                  !salarystructure[j].salaryFieldRoundNo
                    ? 0
                    : salarystructure[j].salaryFieldRoundNo,
                );
                expenseAmount = Number(
                  expenseAmount.toFixed(salaryfieldroundno),
                );
              }

              obj.employeeAmount = expenseAmount;
              userSalaryArray.push(obj);
            }

            // NCSL Deductions
            else if (
              [123, 125, 126, 127, 133, 130, 122].includes(
                salarystructure[j].payheadMasterId,
              )
            ) {
              let data = null;
              // general savings

              if (salarystructure[j].payheadMasterId == 125 && ncslFlag)
                data = NCSLData.find(
                  (e) => e.category == NCSLDeductionsEnum.GEN_SAVINGS,
                );
              //  Poro card
              if (salarystructure[j].payheadMasterId == 126 && ncslFlag)
                data = NCSLData.find(
                  (e) => e.category == NCSLDeductionsEnum.PORO_CARD,
                );
              //xmas
              if (salarystructure[j].payheadMasterId == 127 && ncslFlag)
                data = NCSLData.find(
                  (e) => e.category == NCSLDeductionsEnum.XMAS_SAVINGS,
                );
              // educational savings
              if (salarystructure[j].payheadMasterId == 122 && ncslFlag)
                data = NCSLData.find(
                  (e) => e.category == NCSLDeductionsEnum.EDU_SAVINGS,
                );
              // ncsl loan
              if (salarystructure[j].payheadMasterId == 123 && ncslFlag)
                data = NCSLData.find(
                  (e) => e.category == NCSLDeductionsEnum.LOAN,
                );
              // v_nasfund
              if (salarystructure[j].payheadMasterId == 130 && nasFundFlag)
                data = NCSLData.find(
                  (e) =>
                    e.category == NCSLDeductionsEnum.NASFUND_V_CONTRIBUTION,
                );
              // salary sacrifies
              if (salarystructure[j].payheadMasterId == 133)
                data = NCSLData.find(
                  (e) => e.category == NCSLDeductionsEnum.SALARY_SACRIFICE,
                );

              if (data) {
                const skipdata = (data.skipEmpNCSLDeductions || []).find(
                  (e) =>
                    (payrollFrequency == PayrollFrequencyType.MONTHLY
                      ? e.YYYYMM == yearmonth
                      : e.fStartDate == payrollStartDate &&
                        e.fEndDate == payrollEndDate) && !e.salaryStatus,
                );

                if (skipdata) {
                  // update skip ncsl
                  await SkipEmpNCSLDeduction.update(
                    {
                      salaryStatus: true,
                    },
                    {
                      where: {
                        id: skipdata.id,
                      },
                      individualHooks: true,
                      user: req.userDetails,
                      transaction: t,
                    },
                  );
                } else {
                  obj.employeeAmount = +data.amount;
                }
              }

              userSalaryArray.push(obj);
            }

            // OT1 calculation
            else if (salarystructure[j].payheadMasterId == 102) {
              const minutes =
                calculatedAttendanceData.find(
                  (e) => e.hrLeaveType.LeaveID == 21,
                )?.AttnVal || 0;

              const amount = minutes * perminuteAmount * OTCalculationRatio.OT1;

              obj.employeeAmount =
                +amount % 1 == 0 ? +amount : amount.toFixed(2);

              userSalaryArray.push(obj);
            }

            // holiday hrs calculation
            else if (salarystructure[j].payheadMasterId == 104) {
              const minutes =
                calculatedAttendanceData.find(
                  (e) => e.hrLeaveType.LeaveID == 34,
                )?.AttnVal || 0;

              const amount = minutes * perminuteAmount * OTCalculationRatio.OT2;

              obj.employeeAmount =
                +amount % 1 == 0 ? +amount : amount.toFixed(2);

              userSalaryArray.push(obj);
            } else {
              // Check Nasfund flag
              if (
                ([124, 130, 131, 132, 137].includes(
                  +salarystructure[j].payheadMasterId,
                ) &&
                  nasFundFlag) ||
                ![124, 130, 131, 132, 137].includes(
                  +salarystructure[j].payheadMasterId,
                )
              ) {
                // check depends on att
                if (salarystructure[j].salaryFieldAttanChk == 0) {
                  finalsalary = +salarystructure[j].ActualEmployeeSalaryAmount;
                } else if (salarystructure[j].salaryFieldAttanChk == 2) {
                  // if physical Attndance

                  finalsalary =
                    (Math.round(
                      +salarystructure[j].ActualEmployeeSalaryAmount,
                    ) /
                      31) *
                    +attendanceTransData.length;
                } else {
                  const workingMinutes =
                    calculatedAttendanceData.find(
                      (e) => e.hrLeaveType.LeaveID == 20,
                    )?.AttnVal || 0;
                  const ot2Minutes =
                    calculatedAttendanceData.find(
                      (e) => e.hrLeaveType.LeaveID == 34,
                    )?.AttnVal || 0;

                  const finalMinutes = [124, 130, 131, 132, 137, 145].includes(
                    +salarystructure[j].payheadMasterId,
                  )
                    ? workingMinutes
                    : +workingMinutes + +ot2Minutes;
                  // if monthly salary structure
                  if (salarystructure[0].baseOnCalculation == 'M') {
                    if (salary_calculation_wise == 'hourwise') {
                      const oneminutesalry =
                        Number(salarystructure[j].ActualEmployeeSalaryAmount) /
                        Number(salary_CalculationDays);

                      finalsalary =
                        Number(oneminutesalry) * Number(finalMinutes);
                    } else {
                      let onedaysalary =
                        Number(salarystructure[j].ActualEmployeeSalaryAmount) /
                        Number(salary_CalculationDays);

                      finalsalary = LWP_flag
                        ? +salarystructure[j].ActualEmployeeSalaryAmount
                        : +salarystructure[j].ActualEmployeeSalaryAmount -
                          Number(onedaysalary) * (+remainingDays + +unpaidDays);

                      if (+finalsalary < 0) finalsalary = 0;
                    }
                  }
                  // if Daily salary structure
                  else if (salarystructure[0].baseOnCalculation == 'D') {
                    if (salary_calculation_wise == 'hourwise') {
                      const oneminutesalry =
                        Number(salarystructure[j].ActualEmployeeSalaryAmount) /
                        Number(dailyworkingminutes);

                      finalsalary =
                        Number(oneminutesalry) * Number(finalMinutes);
                    } else {
                      finalsalary =
                        Number(salarystructure[j].ActualEmployeeSalaryAmount) *
                        Number(usertotalpresentday);
                    }
                  }
                  // if Hourly salary structure
                  else if (salarystructure[0].baseOnCalculation == 'H') {
                    const oneminutesalry =
                      Number(salarystructure[j].EmployeeSalaryAmount) /
                      Number(60);

                    finalsalary = Number(oneminutesalry) * Number(finalMinutes);
                  }
                }
              }

              // check salary field round

              if (![124, 137].includes(+salarystructure[j].payheadMasterId)) {
                finalsalary = getRoundOffSalary(
                  finalsalary,
                  salarystructure[j].salaryFieldRound,
                  salarystructure[j].roundOffType,
                  salarystructure[j].salaryFieldRoundNo,
                );
              }

              if (salarystructure[j].salaryFieldWhenMonth[0] != 0) {
                let currentmonth = Month;

                if (Number(currentmonth) < 10) {
                  currentmonth = Month.slice(1);
                }

                let whencalculation = salarystructure[j].salaryFieldWhenMonth;
                whencalculation = whencalculation.filter((s) => {
                  return s == currentmonth;
                });

                if (whencalculation.length > 0)
                  obj.employeeAmount = +finalsalary;
              } else {
                obj.employeeAmount = +finalsalary;
              }

              userSalaryArray.push(obj);
            }
          }

          // ----------------------Bonus Pay Calculation ---------------------------------------
          if (BonusPayData) {
            const currentBonusAmount =
              userSalaryArray.find((e) => e.payheadmasterid == 6)
                ?.employeeAmount || 0;

            const { amount, ids, addcurrentId } = await getPayBonusAmount(
              bonusPolicy,
              yearmonth,
              currentBonusAmount,
              usermaster[i].userMasterID,
            );

            BonusIds = ids;
            addCurrentBonusId = addcurrentId;

            userSalaryArray.push({
              salaryMasterID: BonusPayData.salaryMasterID,
              payheadmasterid: BonusPayData.payheadMasterId,
              payheadName:
                BonusPayData.payheadDisplayName &&
                BonusPayData.payheadDisplayName.trim()
                  ? BonusPayData.payheadDisplayName.trim()
                  : BonusPayData.payheadName,
              employeeAmount: Math.round(+amount),
              salaryfieldsrno: BonusPayData.salaryFieldSrNo,
              salaryfieldside: BonusPayData.salaryFieldSide,
              salaryfieldshow: BonusPayData.salaryFieldShow,
              calculatedOn: null,
              salaryfieldmaxrange: BonusPayData.salaryfieldmaxrange,
              considerIn: BonusPayData.considerIn,
            });
          }

          //----------------- Push LWP Deduction in salary array------

          if (lwp_deduction) {
            const amount =
              salarystructure[0].baseOnCalculation == 'M'
                ? LWP_flag && salary_calculation_wise != 'hourwise'
                  ? (+gross / +salary_CalculationDays) *
                    (+remainingDays + +unpaidDays)
                  : 0
                : 0;

            userSalaryArray.push({
              salaryMasterID: lwp_deduction.salaryMasterID,
              payheadmasterid: lwp_deduction.payheadMasterId,
              payheadName:
                lwp_deduction.payheadDisplayName &&
                lwp_deduction.payheadDisplayName.trim()
                  ? lwp_deduction.payheadDisplayName.trim()
                  : lwp_deduction.payheadName,
              employeeAmount:
                lwp_deduction.salaryFieldRound == 'N' && +amount % 1 != 0
                  ? +amount.toFixed(+lwp_deduction.salaryFieldRoundNo)
                  : Math.round(+amount),
              salaryfieldsrno: lwp_deduction.salaryFieldSrNo,
              salaryfieldside: lwp_deduction.salaryFieldSide,
              salaryfieldshow: lwp_deduction.salaryFieldShow,
              calculatedOn: null,
              salaryfieldmaxrange: lwp_deduction.salaryfieldmaxrange,
              considerIn: lwp_deduction.considerIn,
            });
          }

          let ot_payheadMasterId,
            toAddOTInOtherPathead = false;

          // if attendancepolicy has show ot as add in payhead

          if (
            userAttendacepolicy &&
            userAttendacepolicy.toShowOT == 'addInPayhead'
          ) {
            ot_payheadMasterId = userAttendacepolicy.payheadMasterId;
            // Check if payhead id is  present or not in structure
            toAddOTInOtherPathead = userSalaryArray.find(
              (e) => +e.payheadmasterid == +ot_payheadMasterId,
            )
              ? true
              : false;
            // If present then add Amount
            if (toAddOTInOtherPathead) {
              userSalaryArray = userSalaryArray.map((e) => {
                if (+e.payheadmasterid == +ot_payheadMasterId)
                  e.employeeAmount += +overtimeAmount;
                if (+e.payheadmasterid == 43) e.employeeAmount = 0;
                return e;
              });
              // Set OT Array Empty
              overtimeArray = [];
            }
          }

          // set max range

          userSalaryArray.map((e) => {
            if (e.salaryfieldmaxrange) {
              if (+e.salaryfieldmaxrange < +e.employeeAmount) {
                // pf
                if (e.payheadmasterid == 4) {
                  e.calculatedOn = Math.round(
                    (+e.salaryfieldmaxrange * 100) / 12,
                  );
                }
                // EPS
                if (e.payheadmasterid == 12) {
                  e.calculatedOn =
                    +e.salaryfieldmaxrange == 1250
                      ? 15000
                      : Math.round((+e.salaryfieldmaxrange * 100) / 8.33);
                }

                e.employeeAmount = +e.salaryfieldmaxrange;
              }
            }
          });

          // ----------------------------- calculate EPF Amount  ---------------------------

          if (EPF_Data) {
            const PF_amount =
              userSalaryArray.find((e) => e.payheadmasterid == 4)
                ?.employeeAmount || 0;
            const EPS_amount =
              userSalaryArray.find((e) => e.payheadmasterid == 12)
                ?.employeeAmount || 0;

            const amount1 =
              +PF_amount - +EPS_amount > 0 ? +PF_amount - +EPS_amount : 0;

            const employeeAmount =
              EPF_Data.salaryFieldRound == 'Y'
                ? EPF_Data.roundOffType == 0
                  ? Math.ceil((+amount1).toFixed(2))
                  : Math.round(+amount1)
                : !EPF_Data.salaryFieldRound
                  ? Math.round(+amount1)
                  : (+amount1).toFixed(+EPF_Data.salaryFieldRoundNo);

            userSalaryArray.push({
              salaryMasterID: EPF_Data.salaryMasterID,
              payheadmasterid: EPF_Data.payheadMasterId,
              payheadName:
                EPF_Data.payheadDisplayName &&
                EPF_Data.payheadDisplayName.trim()
                  ? EPF_Data.payheadDisplayName.trim()
                  : EPF_Data.payheadName,
              employeeAmount,
              salaryfieldsrno: EPF_Data.salaryFieldSrNo,
              salaryfieldside: EPF_Data.salaryFieldSide,
              salaryfieldshow: EPF_Data.salaryFieldShow,
              calculatedOn: null,
              salaryfieldmaxrange: EPF_Data.salaryfieldmaxrange,
              considerIn: EPF_Data.considerIn,
            });
          }

          // -------------------------------Calculate NasFund on LeaveEncashment --------------------

          const leaveEncash = userSalaryArray.find(
            (e) => e.payheadmasterid == 67,
          );

          //------------- Employee Nasfund

          const employeeNasfund = userSalaryArray.find(
            (e) => e.payheadmasterid == 124,
          );

          if (employeeNasfund) {
            let amount = 0;
            // for leave encashment
            if (leaveEncash) {
              amount +=
                (+leaveEncash.employeeAmount *
                  leaveEncashmentPercent.EMPLOYEE) /
                100;
            }

            // for incentive amount

            if (pfIncentiveAmount)
              amount +=
                (+pfIncentiveAmount * leaveEncashmentPercent.EMPLOYEE) / 100;

            employeeNasfund.employeeAmount += amount;

            employeeNasfund.employeeAmount = getRoundOffSalary(
              employeeNasfund.employeeAmount,
              employeeNasfund.salaryFieldRound,
              employeeNasfund.roundOffType,
              employeeNasfund.salaryFieldRoundNo,
            );
          }

          // ------------------ Calculate nasFund housing on LeaveEncashment and Incentive --------------------------------

          const nasFundHousing = userSalaryArray.find(
            (e) => e.payheadmasterid == 129,
          );

          if (nasFundHousing) {
            let amount = 0;
            // for leave encashment
            if (leaveEncash) {
              amount +=
                (+leaveEncash.employeeAmount *
                  leaveEncashmentPercent.NASFUND_HOUSING) /
                100;
            }

            // for incentive amount

            if (pfIncentiveAmount)
              amount +=
                (+pfIncentiveAmount * leaveEncashmentPercent.NASFUND_HOUSING) /
                100;

            nasFundHousing.employeeAmount += amount;

            nasFundHousing.employeeAmount = getRoundOffSalary(
              nasFundHousing.employeeAmount,
              nasFundHousing.salaryFieldRound,
              nasFundHousing.roundOffType,
              nasFundHousing.salaryFieldRoundNo,
            );
          }

          //--------------------- Employer Nasfund

          const employerNasfund = userSalaryArray.find(
            (e) => e.payheadmasterid == 137,
          );

          if (employerNasfund) {
            let amount = 0;
            // for leave encashment
            if (leaveEncash) {
              amount +=
                (+leaveEncash.employeeAmount *
                  leaveEncashmentPercent.EMPLOYER) /
                100;
            }
            // for incentive amount
            if (pfIncentiveAmount)
              amount +=
                (+pfIncentiveAmount * leaveEncashmentPercent.EMPLOYER) / 100;

            employerNasfund.employeeAmount += amount;

            employerNasfund.employeeAmount = getRoundOffSalary(
              employerNasfund.employeeAmount,
              employerNasfund.salaryFieldRound,
              employerNasfund.roundOffType,
              employerNasfund.salaryFieldRoundNo,
            );
          }

          employee_gross = userSalaryArray
            .filter(
              (e) =>
                e.salaryfieldsrno == 'A' &&
                e.salaryfieldshow == 'Y' &&
                e.considerIn != 'net',
            )
            .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

          let employee_otherAmount = 0;

          userSalaryArray.filter((s) => {
            if (
              s.salaryfieldside == 'D' &&
              s.salaryfieldsrno != 'C' &&
              s.employeeAmount != 0 &&
              s.salaryfieldshow == 'Y'
            ) {
              employee_otherAmount = employee_otherAmount + +s.employeeAmount;
            }
          });

          // add amount in net pay
          employee_extraAddInNetPay = userSalaryArray
            .filter(
              (e) =>
                e.salaryfieldsrno == 'A' &&
                e.salaryfieldshow == 'Y' &&
                e.considerIn == 'net',
            )
            .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

          employee_netPay =
            Number(employee_gross) -
            Number(employee_otherAmount) +
            +employee_extraAddInNetPay;

          // ------------------------------- PNG Tax Calculation ---------------------------------------------

          const taxData = salarystructure.find((s) => s.payheadMasterId == 135);
          let addTaxInNetPay = 0;
          const leavingDate = employeeJoining.leavingDate || null;

          if (taxData) {
            let taxAmount = 0;

            // ------------------------- National Tax Calulation -----------------------

            if (employeeJoining.employeeType == 'national') {
              const taxableAmount =
                userSalaryArray
                  .filter(
                    (e) =>
                      e.salaryfieldsrno == 'A' &&
                      e.taxApplicability == TaxApplicabilityType.TAXABLE &&
                      ![24, 67, 152].includes(+e.payheadmasterid),
                  )
                  .reduce((acc, obj) => acc + +obj.employeeAmount, 0) -
                (userSalaryArray.find((e) => e.payheadmasterid == 133)
                  ?.employeeAmount || 0);

              const slabRange = pngNationalTaxSlab.find(
                (item) =>
                  +taxableAmount > item.exceeding &&
                  taxableAmount <= item.notExceeding,
              );

              taxAmount = pngNationalTaxCalculation(
                taxableAmount,
                slabRange,
                dependantCount,
              );

              // ---------------------- tax on Leave Encashment and Incentive ---------

              const taxableLeaveEncashAmount =
                userSalaryArray.find(
                  (e) =>
                    e.salaryfieldsrno == 'A' &&
                    e.taxApplicability == TaxApplicabilityType.TAXABLE &&
                    e.payheadmasterid == 67,
                )?.employeeAmount || 0;

              const taxableAmtIncentive = incentiveArray
                .filter(
                  (e) =>
                    e.salaryfieldsrno == 'A' &&
                    e.taxApplicability == TaxApplicabilityType.TAXABLE &&
                    e.payheadmasterid == 24,
                )
                .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

              // total amount of incentives and leave encashments

              const finalTaxableENCINC =
                +taxableLeaveEncashAmount + +taxableAmtIncentive;

              if (+finalTaxableENCINC > 0) {
                const variableAmount = salarystructure
                  .filter(
                    (e) =>
                      e.salaryFieldSrNo == 'A' &&
                      e.taxApplicability == TaxApplicabilityType.TAXABLE &&
                      e.salaryFieldAttanChk == 1,
                  )
                  .reduce((acc, obj) => acc + +obj.EmployeeSalaryAmount, 0);
                const fixAmount = salarystructure
                  .filter(
                    (e) =>
                      e.salaryFieldSrNo == 'A' &&
                      e.taxApplicability == TaxApplicabilityType.TAXABLE &&
                      e.salaryFieldAttanChk == 0,
                  )
                  .reduce((acc, obj) => acc + +obj.EmployeeSalaryAmount, 0);

                const projectedSalaryData =
                  calculateProjectedSalary_National_PNG(
                    leavingDate,
                    variableAmount,
                    fixAmount,
                    fortnight,
                    year,
                  );

                const finalCalculatedSalary =
                  employeeYTDData?.payrollFrequency ==
                  PayrollFrequencyType.FORTNIGHTLY
                    ? calculatedSalaryData.filter(
                        (e) =>
                          e.startDate > employeeYTDData?.endDate ||
                          e.endDate < employeeYTDData?.startDate,
                      )
                    : calculatedSalaryData;

                const benefitsTax = pngBenefitTaxCalculation(
                  employeeYTDData,
                  finalCalculatedSalary,
                  projectedSalaryData,
                  taxableAmount,
                  finalTaxableENCINC,
                  incomeTaxSlabData,
                );

                taxAmount += +benefitsTax;
              }

              // ------------------------- calculate Tax Rebate ---------------------

              const taxRebate = pngNationalTaxRebateCalculation(
                pngNationalTaxRebate,
                taxAmount,
                dependantCount,
              );
              taxAmount = Math.max(taxAmount - taxRebate, 0);

              // tax on long service leave encashment
              const longServicePayAmount =
                userSalaryArray.find((e) => e.payheadmasterid == 152)
                  ?.employeeAmount || 0;

              const taxPercent =
                getTaxForMonth(
                  longServicePayEncashmentTax_National,
                  +yearmonth,
                ) || 0;

              taxAmount += (+longServicePayAmount * +taxPercent) / 100;

              (taxAmount = getRoundOffSalary(
                +taxAmount,
                taxData.salaryFieldRound,
                taxData.roundOffType,
                taxData.salaryFieldRoundNo,
              )),
                (employee_netPay -= +taxAmount);
            }
            // ------------------------- Expat Tax Calulation -----------------------
            else if (employeeJoining.employeeType == 'expat') {
              const taxableAmount =
                userSalaryArray.find((e) => e.payheadmasterid == 145)
                  ?.employeeAmount || 0;

              const ExtraTaxableAmount = userSalaryArray
                .filter(
                  (e) =>
                    e.salaryfieldsrno == 'A' &&
                    e.taxApplicability == TaxApplicabilityType.TAXABLE &&
                    e.payheadmasterid != 145,
                )
                .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

              // ----------------- HRA and MVA amount calculation ------------------
              const HRA_Applicable = employeeJoining?.png_HRA_Applicable;
              const MVA_Applicable = employeeJoining?.png_MVA_Applicable;
              const joiningDate = employeeJoining.joiningDate;

              const normalPay =
                salarystructure.find((e) => e.payheadMasterId == 145)
                  ?.EmployeeSalaryAmount || 0;

              let total_HRA_MVA = 0;

              if ((HRA_Applicable || MVA_Applicable) && joiningDate) {
                let HRA = 0;
                let MVA = 0;

                if (HRA_Applicable) HRA = ExpatHRAValue.LABEL1;
                if (MVA_Applicable) MVA = ExpatMVAValue.LABEL1;

                if (normalPay >= 10000) HRA = ExpatHRAValue.LABEL2;

                const { finalHRA, finalMVA } = pngExpat_HRA_MVA_Calculation(
                  HRA,
                  MVA,
                  yearmonth,
                  joiningDate,
                  leavingDate,
                );

                total_HRA_MVA = +finalHRA + +finalMVA;
              }

              const salarysacrifice =
                userSalaryArray.find((e) => e.payheadmasterid == 133)
                  ?.employeeAmount || 0;

              const finalCalculatedSalary =
                employeeYTDData?.payrollFrequency ==
                PayrollFrequencyType.MONTHLY
                  ? calculatedSalaryData.filter(
                      (e) =>
                        e.salaryYYYYMM > employeeYTDData?.endMonth ||
                        e.salaryYYYYMM < employeeYTDData?.startMonth,
                    )
                  : calculatedSalaryData;

              const projectedSalary = pngExpat_Projected_Salary_Calculation(
                projectedSalaryData,
                yearmonth,
                joiningDate,
                leavingDate,
              );

              taxAmount = pngExpatTaxCalculation(
                finalCalculatedSalary,
                employeeYTDData,
                projectedSalary,
                incomeTaxSlabData,
                statndardDeductionData,
                taxableAmount,
                ExtraTaxableAmount,
                previousMonthRanges,
                YTDIncomeTaxSlabData,
                total_HRA_MVA,
                dependantCount,
                salarysacrifice,
              );

              (taxAmount = getRoundOffSalary(
                +taxAmount,
                taxData.salaryFieldRound,
                taxData.roundOffType,
                taxData.salaryFieldRoundNo,
              )),
                (addTaxInNetPay = +taxAmount);

              // Add tax in gross amount
              employee_gross += +taxAmount;
            }

            userSalaryArray.push({
              salaryMasterID: taxData.salaryMasterID,
              payheadmasterid: taxData.payheadMasterId,
              payheadName:
                taxData.payheadDisplayName && taxData.payheadDisplayName.trim()
                  ? taxData.payheadDisplayName.trim()
                  : taxData.payheadName,
              employeeAmount: taxAmount,
              salaryfieldsrno: taxData.salaryFieldSrNo,
              salaryfieldside: taxData.salaryFieldSide,
              salaryfieldshow: taxData.salaryFieldShow,
              calculatedOn: null,
            });
          }

          // push incentive
          if (incentiveArray.length > 0) {
            userSalaryArray = userSalaryArray.filter((s) => {
              return s.payheadmasterid != 24;
            });

            userSalaryArray = [...userSalaryArray, ...incentiveArray];
          }

          // push overtime

          if (overtimeArray.length > 0) {
            userSalaryArray = userSalaryArray.filter((s) => {
              return s.payheadmasterid != 43;
            });

            userSalaryArray = [...userSalaryArray, ...overtimeArray];
          }

          let employeefinalsalary = userSalaryArray;

          const EmployerSideDeduction = userSalaryArray
            .filter((s) => s.salaryfieldsrno == 'C')
            .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

          userSalaryArray = userSalaryArray.filter((s) => {
            return s.salaryfieldsrno != 'C' && s.salaryfieldshow == 'Y';
          });

          // show data

          for (let g = 0; g < userSalaryArray.length; g++) {
            if (
              [
                16, 17, 24, 34, 9, 43, 14, 13, 15, 78, 83, 99, 67, 101, 102,
                103, 104, 107, 112, 116, 135, 123, 125, 126, 127, 133, 148, 151,
                152,
              ].includes(userSalaryArray[g].payheadmasterid)
            ) {
              if (userSalaryArray[g].employeeAmount != 0) {
                showusersalary.push(userSalaryArray[g]);
              }
            } else {
              showusersalary.push(userSalaryArray[g]);
            }
          }

          let totalear = 0;
          let totaldedu = 0;
          // for final net pay

          showusersalary.filter((e) => {
            if (e.salaryfieldside == 'E') {
              totalear = totalear + +e.employeeAmount;
            }
          });

          showusersalary.filter((e) => {
            if (e.salaryfieldside == 'D') {
              totaldedu = totaldedu + +e.employeeAmount;
            }
          });

          employee_netPay =
            Number(totalear) - Number(totaldedu) + +addTaxInNetPay;

          // To check decimal or not

          if (
            +employee_netPay % 1 !== 0 &&
            CTC_GROSS_NET.find((e) => e.payheadMasterId == 92)
              ?.salaryFieldRound == 'N'
          ) {
            employee_netPay = +employee_netPay.toFixed(
              +CTC_GROSS_NET.find((e) => e.payheadMasterId == 92)
                ?.salaryFieldRoundNo || 0,
            );
          } else {
            employee_netPay = Math.round(+employee_netPay);
          }

          if (
            employee_gross % 1 !== 0 &&
            CTC_GROSS_NET.find((e) => e.payheadMasterId == 50)
              ?.salaryFieldRound == 'N'
          ) {
            employee_gross = employee_gross.toFixed(
              +CTC_GROSS_NET.find((e) => e.payheadMasterId == 50)
                ?.salaryFieldRoundNo || 0,
            );
          } else {
            employee_gross = Math.round(+employee_gross);
          }

          let employee_ctc =
            +employee_gross +
            +employee_extraAddInNetPay +
            +EmployerSideDeduction;

          if (
            +employee_ctc % 1 !== 0 &&
            CTC_GROSS_NET.find((e) => e.payheadMasterId == 1)
              ?.salaryFieldRound == 'N'
          ) {
            employee_ctc = +employee_ctc.toFixed(
              +CTC_GROSS_NET.find((e) => e.payheadMasterId == 1)
                ?.salaryFieldRoundNo || 0,
            );
          } else {
            employee_ctc = Math.round(+employee_ctc);
          }

          //--------------------- Add CTC GROSS NET SALARY in salary Data ------------------------------

          CTC_GROSS_NET.forEach((e) => {
            if ([50, 92, 1].includes(e.payheadMasterId)) {
              employeefinalsalary.push({
                salaryMasterID: e.salaryMasterID,
                payheadmasterid: e.payheadMasterId,
                payheadName:
                  e.payheadDisplayName && e.payheadDisplayName.trim()
                    ? e.payheadDisplayName.trim()
                    : e.payheadName,
                employeeAmount:
                  e.payheadMasterId == 50
                    ? +employee_gross
                    : e.payheadMasterId == 92
                      ? +employee_netPay
                      : +employee_ctc,
                salaryfieldsrno: e.salaryFieldSrNo,
                salaryfieldside: e.salaryFieldSide,
                salaryfieldshow: e.salaryFieldShow,
                calculatedOn: null,
              });
            }
          });

          // combined incentive

          if (finalinsentivearray.length > 0) {
            employeefinalsalary = employeefinalsalary.filter((e) => {
              return e.payheadmasterid != 24;
            });

            employeefinalsalary.push(finalinsentivearray[0]);
          }

          // combined penalty

          if (finalpenaltyarray.length > 0) {
            employeefinalsalary = employeefinalsalary.filter((e) => {
              return e.payheadmasterid != 34;
            });

            employeefinalsalary.push(finalpenaltyarray[0]);
          }

          // Final Deposit of deduction
          if (depositToDeductionArray.length) {
            employeefinalsalary = employeefinalsalary.filter((e) => {
              return e.payheadmasterid != 96;
            });

            employeefinalsalary.push(depositToDeductionArray[0]);
          }

          // Final Deposit of Pay
          if (depositToPayArray.length) {
            employeefinalsalary = employeefinalsalary.filter((e) => {
              return e.payheadmasterid != 97;
            });

            employeefinalsalary.push(depositToPayArray[0]);
          }

          const advanceIds =
            advanceData.length > 0
              ? advanceData.map((e) => e.advancePaymentID)
              : [];
          const loantranIds =
            loanData.length > 0
              ? loanData
                  .flatMap((l) => l.loanTransactions)
                  .map((e) => e.LoanTrasactionId)
              : [];
          const penaltyIds =
            penaltydata.length > 0
              ? penaltydata.map((e) => e.employeePenaltyID)
              : [];
          const incentiveIds =
            incentiveData.length > 0
              ? incentiveData.map((e) => e.employeeincentiveID)
              : [];

          let currentBonusData = null;

          // add salary

          for (let l = 0; l < employeefinalsalary.length; l++) {
            let add_data = await HRSalaryTrasaction.create(
              {
                userMasterID: usermaster[i].userMasterID,
                salaryMasterID: employeefinalsalary[l].salaryMasterID,
                salaryYYYYMM: yearmonth,
                EmployeeSalaryPer: 0,
                EmployeeSalaryAmount: employeefinalsalary[l].employeeAmount,
                SalaryCalcOnDays: usertotalpresentday,
                createBy: createBy,
                createByIp: createByIp,
                calculatedOn: employeefinalsalary[l].calculatedOn,
                payrollFrequency,
                startDate: payrollStartDate,
                endDate: payrollEndDate,
                branchId,
                departmentId,
                designationId,
              },
              { transaction: t },
            );

            // Bonus
            if (
              employeefinalsalary[l].payheadmasterid == 6 &&
              +employeefinalsalary[l].employeeAmount > 0
            ) {
              currentBonusData = await EmployeeBonus.create(
                {
                  userMasterID: usermaster[i].userMasterID,
                  amount: Math.round(+employeefinalsalary[l].employeeAmount),
                  bonusYYYYMM: yearmonth,
                  referenceId: add_data.userSalaryTranID,
                },
                {
                  user: req.userDetails,
                  transaction: t,
                },
              );
            }

            // Pay Bonus

            if (
              employeefinalsalary[l].payheadmasterid == 101 &&
              BonusPayData &&
              (BonusIds.length || addCurrentBonusId)
            ) {
              await EmployeeBonus.update(
                {
                  payReferenceId: add_data.userSalaryTranID,
                  payYYYYMM: yearmonth,
                },
                {
                  where: {
                    id: {
                      [Sequelize.Op.in]: BonusIds,
                    },
                  },
                  individualHooks: true,
                  user: req.userDetails,
                  transaction: t,
                },
              );

              if (addCurrentBonusId && currentBonusData) {
                await currentBonusData.update(
                  {
                    payReferenceId: add_data.userSalaryTranID,
                    payYYYYMM: yearmonth,
                  },
                  {
                    user: req.userDetails,
                    transaction: t,
                  },
                );
              }
            }

            //  update Advance
            if (
              employeefinalsalary[l].payheadmasterid == 16 &&
              advanceIds.length > 0
            ) {
              await advancePayment.update(
                {
                  tablereferenceID: add_data.userSalaryTranID,
                  tableName: 'hrSalaryTrasactions',
                  updateBy: createBy,
                  updateByIp: createByIp,
                },
                {
                  where: {
                    advancePaymentID: advanceIds,
                  },
                  transaction: t,
                },
              );
            }

            // update Loan
            if (
              employeefinalsalary[l].payheadmasterid == 17 &&
              loantranIds.length > 0
            ) {
              await LoanTransaction.update(
                {
                  RefrenceId: add_data.userSalaryTranID,
                  TableName: 'hrSalaryTrasactions',
                  updateBy: createBy,
                  updateByIp: createByIp,
                },
                {
                  where: {
                    LoanTrasactionId: loantranIds,
                  },
                  transaction: t,
                },
              );
            }

            // update Penalty

            if (
              employeefinalsalary[l].payheadmasterid == 34 &&
              penaltyIds.length > 0
            ) {
              await EmployeePenalty.update(
                {
                  RefrenceId: add_data.userSalaryTranID,
                  TableName: 'hrSalaryTrasactions',
                  updateBy: createBy,
                  updateByIp: createByIp,
                },
                {
                  where: {
                    employeePenaltyID: penaltyIds,
                  },
                  transaction: t,
                },
              );
            }

            // update incentive

            if (
              employeefinalsalary[l].payheadmasterid == 24 &&
              incentiveIds.length > 0
            ) {
              await Employeeincentive.update(
                {
                  ReferenceId: add_data.userSalaryTranID,
                  TableName: 'hrSalaryTrasactions',
                  updateBy: createBy,
                  updateByIp: createByIp,
                },
                {
                  where: {
                    employeeincentiveID: incentiveIds,
                  },
                  transaction: t,
                },
              );
            }
            // update overtimecal

            if (
              employeefinalsalary[l].payheadmasterid == 43 &&
              +employeefinalsalary[l].employeeAmount > 0
            ) {
              await overTimeCalculationMain.update(
                {
                  ReferenceId: add_data.userSalaryTranID,
                  tableName: 'hrSalaryTrasactions',
                  updateBy: createBy,
                  updateByIp: createByIp,
                },
                {
                  where: {
                    userMasterID: usermaster[i].userMasterID,
                    yyyymm: yearmonth,
                  },
                  transaction: t,
                },
              );
            }

            // update deposits

            if (
              depositToDeduction.length &&
              employeefinalsalary[l].payheadmasterid == 96
            ) {
              await deposit.update(
                {
                  ReferenceId: add_data.userSalaryTranID,
                  TableName: 'hrSalaryTrasactions',
                  updateBy: createBy,
                  updateByIp: createByIp,
                },
                {
                  where: {
                    depositId: depositToDeduction.map((e) => e.depositId),
                  },
                  transaction: t,
                },
              );
            }

            // update deposits

            if (
              depositToPay.length &&
              employeefinalsalary[l].payheadmasterid == 97
            ) {
              await deposit.update(
                {
                  ReferenceId: add_data.userSalaryTranID,
                  TableName: 'hrSalaryTrasactions',
                  updateBy: createBy,
                  updateByIp: createByIp,
                },
                {
                  where: {
                    depositId: depositToPay.map((e) => e.depositId),
                  },
                  transaction: t,
                },
              );
            }

            // update leaveEncashment

            if (
              finalEncashIds.length &&
              employeefinalsalary[l].payheadmasterid == 67
            ) {
              await LeaveEncashment.update(
                {
                  referenceId: add_data.userSalaryTranID,
                  updateBy: createBy,
                  updateByIp: createByIp,
                },
                {
                  where: {
                    id: {
                      [Sequelize.Op.in]: finalEncashIds,
                    },
                  },
                  transaction: t,
                },
              );
            }

            // update long service leave encashment

            if (
              longServiceEncashIds.length &&
              employeefinalsalary[l].payheadmasterid == 152
            ) {
              await LeaveEncashment.update(
                {
                  referenceId: add_data.userSalaryTranID,
                  updateBy: createBy,
                  updateByIp: createByIp,
                },
                {
                  where: {
                    id: {
                      [Sequelize.Op.in]: longServiceEncashIds,
                    },
                  },
                  transaction: t,
                },
              );
            }

            // update Expense Payment

            if (
              employeefinalsalary[l].payheadmasterid == 116 &&
              expenseData.length
            ) {
              await expensePayment.update(
                {
                  referenceId: add_data.userSalaryTranID,
                  updateBy: createBy,
                  updateByIp: createByIp,
                },
                {
                  where: {
                    ExpensePaymentID: {
                      [Sequelize.Op.in]: expenseData.map(
                        (e) => e.ExpensePaymentID,
                      ),
                    },
                  },
                  transaction: t,
                },
              );
            }
          }

          // update FNF Data

          if (from == 'FNF') {
            await UserMaster.update(
              {
                isFNF: true,
                fnfMonth: yearmonth,
              },
              {
                where: {
                  userMasterID: usermaster[i].userMasterID,
                },
                transaction: t,
              },
            );
          }

          // salary slip generation

          const find_salaryslip = usermaster[i].hrSalarySlips?.[0] || null;

          if (find_salaryslip) {
            await HRSalarySlip.destroy({
              where: salaryCondition,
              transaction: t,
            });
          }

          // create salary slip

          await HRSalarySlip.create(
            {
              userMasterID: usermaster[i].userMasterID,
              payrollFrequency,
              salaryYYYYMM: yearmonth,
              startDate: payrollStartDate,
              endDate: payrollEndDate,
              salarySlipIssue: 0,
              createBy,
              createByIp,
            },
            {
              transaction: t,
            },
          );
        });
      }
    }

    res.status(200).json({
      status: 200,
      message: 'data get successfully.',
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteSalary = async (req, res, next) => {
  try {
    let {
      userMasterID = [],
      yearmonth,
      from = 'salary',
      payrollFrequency,
      payrollStartDate,
      payrollEndDate,
    } = await req.body;

    const condition = { payrollFrequency, userMasterID };

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      condition.salaryYYYYMM = yearmonth;
    } else {
      yearmonth =
        String(payrollStartDate).slice(0, 4) +
        String(payrollStartDate).slice(5, 7);
      condition.startDate = payrollStartDate;
      condition.endDate = payrollEndDate;
    }

    await sequelize.transaction(async (t) => {
      const AllsalaryData = await HRSalaryTrasaction.findAll({
        where: condition,
        include: [
          {
            required: true,
            model: HRSalaryMasterFields,
            as: 'HSM',
            attributes: ['gradeSalaryStructureID'],
            include: [
              {
                required: true,
                model: GradeSalaryStructure,
                as: 'GSS',
                attributes: ['salaryFieldID'],
                include: [
                  {
                    required: true,
                    model: HRSalaryFields,
                    as: 'HSF',
                    where: {
                      payheadMasterId: {
                        [Sequelize.Op.in]: [
                          16, 17, 24, 34, 43, 96, 67, 101, 6, 116, 152,
                        ],
                      },
                    },
                    attributes: ['payheadMasterId'],
                  },
                ],
              },
            ],
          },
          {
            required: false,
            model: EmployeePenalty,
            attributes: ['RefrenceId', 'employeePenaltyID'],
          },
          {
            required: false,
            model: Employeeincentive,
            attributes: ['ReferenceId', 'employeeincentiveID'],
          },
          {
            required: false,
            model: expensePayment,
            attributes: ['ExpensePaymentID', 'referenceId'],
          },
          {
            model: UserMaster,
            attributes: ['isFNF', 'fnfMonth'],
          },
        ],
      });
      // filter FNF

      let salaryData = AllsalaryData;
      let excludeIds = [];
      let final_UserMasterID = userMasterID;

      if (from == 'salary') {
        excludeIds = [
          ...new Set(
            AllsalaryData.filter((e) => e.userMaster.fnfMonth == yearmonth).map(
              (a) => +a.userMasterID,
            ),
          ),
        ];
        salaryData = AllsalaryData.filter(
          (e) => !excludeIds.includes(+e.userMasterID),
        );
        final_UserMasterID = userMasterID.filter(
          (e) => !excludeIds.includes(+e),
        );
      }

      // Employee Incentive

      const INC_Ids = salaryData.flatMap((e) =>
        (e.employeeincentives || []).map((inc) => inc.employeeincentiveID),
      );

      const Penalty_Ids = salaryData.flatMap((e) =>
        (e.employeePenalties || []).map((inc) => inc.employeePenaltyID),
      );

      const Loan_Ids = [];
      const Adv_ids = [];
      const OT_Ids = [];
      const deposit_Ids = [];
      const LeaveENC_Ids = [];
      const longServiceLeaveENC_Ids = [];
      const bonus_Ids = [];
      const bonusPay_Ids = [];
      const expensePaymentIds = [];

      salaryData.forEach((e) => {
        if (e.HSM.GSS.HSF.payheadMasterId == 16)
          Adv_ids.push(e.userSalaryTranID);
        if (e.HSM.GSS.HSF.payheadMasterId == 17)
          Loan_Ids.push(e.userSalaryTranID);
        if (e.HSM.GSS.HSF.payheadMasterId == 43)
          OT_Ids.push(e.userSalaryTranID);
        if (e.HSM.GSS.HSF.payheadMasterId == 96)
          deposit_Ids.push(e.userSalaryTranID);
        if (e.HSM.GSS.HSF.payheadMasterId == 67)
          LeaveENC_Ids.push(e.userSalaryTranID);
        if (e.HSM.GSS.HSF.payheadMasterId == 152)
          longServiceLeaveENC_Ids.push(e.userSalaryTranID);
        if (e.HSM.GSS.HSF.payheadMasterId == 6)
          bonus_Ids.push(e.userSalaryTranID);
        if (e.HSM.GSS.HSF.payheadMasterId == 101)
          bonusPay_Ids.push(e.userSalaryTranID);
        if (e.HSM.GSS.HSF.payheadMasterId == 116)
          expensePaymentIds.push(e.userSalaryTranID);
      });

      // update data

      const updateArray = [];
      // Employee Incentives
      if (INC_Ids.length) {
        updateArray.push(
          Employeeincentive.update(
            {
              TableName: null,
              ReferenceId: null,
            },
            {
              where: {
                employeeincentiveID: {
                  [Sequelize.Op.in]: INC_Ids,
                },
              },
              transaction: t,
            },
          ),
        );
      }

      // Employee Penalty
      if (Penalty_Ids.length) {
        updateArray.push(
          EmployeePenalty.update(
            {
              TableName: null,
              RefrenceId: null,
            },
            {
              where: {
                employeePenaltyID: {
                  [Sequelize.Op.in]: Penalty_Ids,
                },
              },
              transaction: t,
            },
          ),
        );
      }

      // loan
      if (Loan_Ids.length) {
        updateArray.push(
          LoanTransaction.update(
            {
              TableName: null,
              RefrenceId: null,
            },
            {
              where: {
                RefrenceId: {
                  [Sequelize.Op.in]: Loan_Ids,
                },
              },
              transaction: t,
            },
          ),
        );
      }

      // advance
      if (Adv_ids.length) {
        updateArray.push(
          advancePayment.update(
            {
              tableName: null,
              tablereferenceID: null,
            },
            {
              where: {
                tablereferenceID: {
                  [Sequelize.Op.in]: Adv_ids,
                },
              },
              transaction: t,
            },
          ),
        );
      }

      // OT
      if (OT_Ids.length) {
        updateArray.push(
          overTimeCalculationMain.update(
            {
              tableName: null,
              ReferenceId: null,
            },
            {
              where: {
                ReferenceId: {
                  [Sequelize.Op.in]: OT_Ids,
                },
              },
              transaction: t,
            },
          ),
        );
      }

      // Deposit
      if (deposit_Ids.length) {
        updateArray.push(
          deposit.update(
            {
              ReferenceId: null,
              TableName: null,
            },
            {
              where: {
                ReferenceId: {
                  [Sequelize.Op.in]: deposit_Ids,
                },
              },
              transaction: t,
            },
          ),
        );
      }

      // Leave Encashment
      if (LeaveENC_Ids.length) {
        updateArray.push(
          LeaveEncashment.update(
            {
              referenceId: null,
            },
            {
              where: {
                referenceId: {
                  [Sequelize.Op.in]: LeaveENC_Ids,
                },
              },
              transaction: t,
            },
          ),
        );
      }

      // long service pay leave encashment
      if (longServiceLeaveENC_Ids.length) {
        updateArray.push(
          LeaveEncashment.update(
            {
              referenceId: null,
            },
            {
              where: {
                referenceId: {
                  [Sequelize.Op.in]: longServiceLeaveENC_Ids,
                },
              },
              transaction: t,
            },
          ),
        );
      }

      // update Bonus

      if (bonus_Ids.length) {
        updateArray.push(
          EmployeeBonus.destroy({
            where: {
              referenceId: {
                [Sequelize.Op.in]: bonus_Ids,
              },
            },
            individualHooks: true,
            user: req.userDetails,
            transaction: t,
          }),
        );
      }

      // update Bonus Pay

      if (bonusPay_Ids.length) {
        updateArray.push(
          EmployeeBonus.update(
            {
              payReferenceId: null,
            },
            {
              where: {
                payReferenceId: {
                  [Sequelize.Op.in]: bonusPay_Ids,
                },
              },
              individualHooks: true,
              user: req.userDetails,
              transaction: t,
            },
          ),
        );
      }

      // update Expense Payments

      if (expensePaymentIds.length) {
        updateArray.push(
          expensePayment.update(
            {
              referenceId: null,
            },
            {
              where: {
                referenceId: {
                  [Sequelize.Op.in]: expensePaymentIds,
                },
              },
              transaction: t,
            },
          ),
        );
      }

      await Promise.all(updateArray);

      // update FNF process
      if (from == 'FNF') {
        await UserMaster.update(
          {
            isFNF: false,
            fnfMonth: null,
          },
          {
            where: {
              userMasterID: final_UserMasterID,
            },
            transaction: t,
          },
        );
      }

      condition.userMasterID = {
        [Sequelize.Op.in]: final_UserMasterID,
      };

      const skipCondition = {};

      if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
        skipCondition.YYYYMM == yearmonth;
      } else {
        skipCondition.fStartDate = payrollStartDate;
        skipCondition.fEndDate = payrollEndDate;
      }

      const allSkipNCSL = await SkipEmpNCSLDeduction.findAll({
        where: skipCondition,
        include: [
          {
            required: true,
            model: EmpNCSLDeduction,
            where: { userMasterID: { [Sequelize.Op.in]: final_UserMasterID } },
          },
        ],
      });

      await SkipEmpNCSLDeduction.update(
        {
          salaryStatus: false,
        },
        {
          where: {
            id: {
              [Sequelize.Op.in]: allSkipNCSL.map((e) => e.id),
            },
          },
          individualHooks: true,
          user: req.userDetails,
          transaction: t,
        },
      );

      await HRSalaryTrasaction.destroy({
        where: condition,
        transaction: t,
      });

      await HRSalarySlip.destroy({
        where: condition,
        transaction: t,
      });
    });

    return res.status(200).json({
      status: 200,
      message: usermessage.deleteMessage('Salary'),
    });
  } catch (error) {
    next(error);
  }
};

// generate salary slip
exports.generateSalarySlip = async (req, res, next) => {
  try {
    const {
      requestFrom,
      yearmonth,
      payrollRefTitle,
      payrollStartDate,
      payrollEndDate,
    } = req.body;

    let { userMasterID, payrollFrequency } = req.body;

    if (!payrollFrequency) payrollFrequency = PayrollFrequencyType.MONTHLY;

    let endDate = null;

    const salaryCondition = { payrollFrequency };

    // if request from employee
    if (requestFrom == 'employee') {
      userMasterID = req.userDetails.userMasterId;
      salaryCondition.salarySlipIssue = 1;
    }

    const HrleaveCondition = { userMasterID, payrollFrequency };

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      salaryCondition.salaryYYYYMM = yearmonth;
      HrleaveCondition.AttnYearMon = yearmonth;

      endDate =
        yearmonth.slice(0, 4) +
        '-' +
        yearmonth.slice(4, 6) +
        '-' +
        daysInMonth(yearmonth.slice(4, 6), yearmonth.slice(0, 4));
    } else {
      // For other payroll frequencies, use the provided start and end dates

      salaryCondition.startDate = payrollStartDate;
      salaryCondition.endDate = payrollEndDate;
      endDate = payrollEndDate;

      HrleaveCondition.startDate = payrollStartDate;
      HrleaveCondition.endDate = payrollEndDate;
    }

    const hrleaveData = await HrLeaveMonthlyTrans.findAll({
      where: HrleaveCondition,
      include: [
        {
          model: HrLeaveTypes,
          where: {
            LeaveID: { [Sequelize.Op.in]: [20, 21, 34, 10, 27, 18] },
          },
        },
      ],
    });

    let startDate = null;

    if (hrleaveData.length) {
      startDate = hrleaveData[0].monthstartdate;
      endDate = hrleaveData[0].monthenddate;
    }

    const userData = await UserMaster.findOne({
      where: {
        userMasterID,
      },
      include: [
        {
          required: true,
          model: EmployeeJoiningDetails,
          where: {
            payrollFrequency,
          },
          include: [
            // { model: BankBranch, attributes: ['bankBranchName'] },
            { model: BankMaster, attributes: ['bankName'] },
          ],
          attributes: [
            'employeeCode',
            'joiningDate',
            'bankIFSC',
            'employeeType',
            'leavingDate',
            'png_HRA_Applicable',
            'png_MVA_Applicable',
            'bankAccountNo',
            'bankAccountStatus',
          ],
        },
        {
          model: HRSalarySlip,
          where: salaryCondition,
        },
        {
          model: EmployeeAttendancePolicy,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: new Date(endDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(endDate) } },
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
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: new Date(endDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(endDate) } },
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
        // count family member
        {
          required: false,
          model: userFamily,
          where: {
            status: 1,
            verifyStatus: 1,
          },
        },
      ],
    });

    if (!userData)
      return res.status(200).json({
        status: 401,
        message: 'Salary slip not found!',
      });

    const attendancePolicy =
      userData.employeeAttendancePolicies?.[0]?.attendancePolicy || null;
    const salaryData = await getSalaryDataPNG(
      userMasterID,
      yearmonth,
      payrollFrequency,
      payrollStartDate,
      payrollEndDate,
      attendancePolicy,
    );

    if (salaryData.length == 0) throw new Error('Salary data not found!');

    const joinig = userData.employeeJoiningDetails?.[0] || null;

    const salaryPolicy =
      userData.employeeSalaryPolicies?.[0]?.salaryPolicy || null;

    // dependant

    const dependantCount = userData.userFamilies?.length || 0;

    // Actual working hrs
    const actualWorkingHrs = hrleaveData
      .filter((e) => [20, 21, 34].includes(e.hrLeaveType.LeaveID))
      .reduce((acc, obj) => acc + +obj.AttnVal, 0);

    const actualRate =
      salaryData.find(
        (e) => e.payheadMasterId == payheadMasterIdsMapping.NORMAL_PAY,
      )?.actualAmount || 0;

    const object = {};

    const employeeDetails = {
      employeeCode: joinig?.employeeCode || '',
      employeeName: userData.displayName,
      joining: joinig.joiningDate
        ? String(joinig.joiningDate).split('-').reverse().join('-')
        : '',
      workingLocation: salaryData[0].branch || '',
      payRef:
        payrollFrequency == PayrollFrequencyType.MONTHLY
          ? `${month_dict[String(yearmonth).slice(4, 6)]} - ${String(yearmonth).slice(0, 4)}`
          : `${payrollRefTitle} - ${payrollFrequency}`,
      TotalWorkingHrs:
        payrollFrequency == PayrollFrequencyType.FORTNIGHTLY
          ? 88
          : payrollFrequency == PayrollFrequencyType.MONTHLY && salaryPolicy
            ? salaryPolicy.monthlyFixhours
            : 0,
      actualWorkingHrs: minutesToHoursMinutes(+actualWorkingHrs),
      LWOP: hrleaveData.find((e) => e.hrLeaveType.LeaveID == 18)?.AttnVal || 0,
      SickLeave:
        hrleaveData.find((e) => e.hrLeaveType.LeaveID == 10)?.AttnVal || 0,
      AL: hrleaveData.find((e) => e.hrLeaveType.LeaveID == 27)?.AttnVal || 0,
      BankName: joinig?.bankMaster?.bankName || '',
      bankAccountNo:
        joinig?.bankAccountStatus == 1 ? joinig?.bankAccountNo : '',
      BSBCode: joinig?.bankIFSC || '',
      payStartDate: String(startDate).split('-').reverse().join('-'),
      payEndDate: String(endDate).split('-').reverse().join('-'),
      dependantCount,
      actualRate,
    };

    object['employeeDetails'] = employeeDetails;

    // taxable earnings
    const earnings = salaryData
      .filter(
        (e) =>
          e.salaryFieldSrNo == 'A' &&
          ![50, 92, 1, 135, 136, 133].includes(e.payheadMasterId) &&
          e.taxApplicability == TaxApplicabilityType.TAXABLE,
      )
      .map((m) => {
        const hrs =
          m.payheadMasterId == 145
            ? hrleaveData.find((e) => e.hrLeaveType.LeaveID == 20)?.AttnVal || 0
            : m.payheadMasterId == 102
              ? hrleaveData.find((e) => e.hrLeaveType.LeaveID == 21)?.AttnVal ||
                0
              : m.payheadMasterId == 104
                ? hrleaveData.find((e) => e.hrLeaveType.LeaveID == 34)
                    ?.AttnVal || 0
                : null;

        return {
          payheadName: m.payheadDisplayName
            ? m.payheadDisplayName
            : m.payheadName,
          actualWorkingHrs:
            [payheadMasterIdsMapping.LEAVE_ENCASHMENT,payheadMasterIdsMapping.LONG_SERVICE_LEAVE_PAY].includes(+m.payheadMasterId)
              ? m.days
              : hrs != null
                ? minutesToHoursMinutes(+hrs)
                : '-',
          amount: m.EmployeeSalaryAmount,
          // YTD: m.YTD,
        };
      });

    const salarysacrifice =
      salaryData.find((e) => e.payheadMasterId == 133) || null;

    if (salarysacrifice?.EmployeeSalaryAmount) {
      earnings.push({
        payheadName: salarysacrifice.payheadDisplayName
          ? salarysacrifice.payheadDisplayName
          : salarysacrifice.payheadName,
        actualWorkingHrs: '-',
        amount: -salarysacrifice.EmployeeSalaryAmount,
      });
    }

    const earning_Total_amount = earnings.reduce(
      (acc, obj) => acc + +obj.amount,
      0,
    );

    // nontaxable earnings
    const nonTaxable = salaryData
      .filter(
        (e) =>
          e.salaryFieldSrNo == 'A' &&
          ![50, 92, 1, 135, 136, 133].includes(e.payheadMasterId) &&
          e.taxApplicability == TaxApplicabilityType.NON_TAXABLE,
      )
      .map((m) => {
        return {
          payheadName: m.payheadDisplayName
            ? m.payheadDisplayName
            : m.payheadName,
          amount: m.EmployeeSalaryAmount,
          // YTD: m.YTD,
        };
      });
    const nonTaxable_Total_amount = nonTaxable.reduce(
      (acc, obj) => acc + +obj.amount,
      0,
    );

    // Deductions

    const deductions = salaryData
      .filter(
        (e) =>
          e.salaryFieldSrNo == 'B' &&
          ![50, 92, 1, 135, 136, 133].includes(e.payheadMasterId) &&
          +e.EmployeeSalaryAmount > 0,
      )
      .map((m) => {
        return {
          payheadName: m.payheadDisplayName
            ? m.payheadDisplayName
            : m.payheadName,
          amount: m.EmployeeSalaryAmount,
          // YTD: m.YTD,
        };
      });
    const deductions_Total_amount = deductions.reduce(
      (acc, obj) => acc + +obj.amount,
      0,
    );

    const taxLiability = salaryData
      .filter(
        (e) =>
          e.salaryFieldSrNo == 'B' && [135, 136].includes(e.payheadMasterId),
      )
      .map((m) => {
        return {
          payheadName: m.payheadDisplayName
            ? m.payheadDisplayName
            : m.payheadName,
          amount: m.EmployeeSalaryAmount,
          // YTD: m.YTD,
        };
      });
    const taxLiability_Total_amount = taxLiability.reduce(
      (acc, obj) => acc + +obj.amount,
      0,
    );

    const employer_contribution = salaryData
      .filter((e) => e.payheadMasterId == 137)
      .map((m) => {
        return {
          payheadName: m.payheadDisplayName
            ? m.payheadDisplayName
            : m.payheadName,
          amount: m.EmployeeSalaryAmount,
          // YTD: m.YTD,
        };
      });

    const gross =
      salaryData.find((e) => e.payheadMasterId == 50)?.EmployeeSalaryAmount ||
      0;
    const netPay =
      salaryData.find((e) => e.payheadMasterId == 92)?.EmployeeSalaryAmount ||
      0;

    if (earnings.length) {
      object['earnings'] = earnings;
      object['earning_Total_amount'] = (+earning_Total_amount).toFixed(2);
      // object["earning_Total_YTD"] = (+earning_Total_YTD).toFixed(2);
    }

    if (nonTaxable.length) {
      object['nonTaxable'] = nonTaxable;
      object['nonTaxable_Total_amount'] = (+nonTaxable_Total_amount).toFixed(2);
      // object["nonTaxable_Total_YTD"] = (+nonTaxable_Total_YTD).toFixed(2);
    }

    if (deductions.length) {
      object['deductions'] = deductions;
      object['deductions_Total_amount'] = (+deductions_Total_amount).toFixed(2);
      // object["deductions_Total_YTD"] = (+deductions_Total_YTD).toFixed(2);
    }

    if (taxLiability.length) {
      object['taxLiability'] = taxLiability;
      object['taxLiability_Total_amount'] =
        (+taxLiability_Total_amount).toFixed(2);
      // object["taxLiability_Total_YTD"] = (+taxLiability_Total_YTD).toFixed(2);
    }

    if (employer_contribution.length) {
      object['employer_contribution'] = employer_contribution;
    }

    if (joinig?.employeeType == 'expat') {
      // ------------------------ HRA and MVA calculation ------------

      const ExtraBenefits = [];

      const HRA_Applicable = joinig?.png_HRA_Applicable;
      const MVA_Applicable = joinig?.png_MVA_Applicable;
      const joiningDate = joinig?.joiningDate || null;
      const leavingDate = joinig?.leavingDate || null;

      const normalPay =
        salaryData.find((e) => e.payheadMasterId == 145)?.actualAmount || 0;

      if ((HRA_Applicable || MVA_Applicable) && joiningDate) {
        let HRA = 0;
        let MVA = 0;

        if (HRA_Applicable) HRA = ExpatHRAValue.LABEL1;
        if (MVA_Applicable) MVA = ExpatMVAValue.LABEL1;

        if (normalPay > 10000) HRA = ExpatHRAValue.LABEL2;

        const { currentMonthHRA, currentMonthMVA } =
          pngExpat_HRA_MVA_Calculation(
            HRA,
            MVA,
            yearmonth,
            joiningDate,
            leavingDate,
          );

        if (currentMonthHRA > 0) {
          ExtraBenefits.push({
            payheadName: 'Fringe Benefit HRA',
            amount: currentMonthHRA,
          });
        }

        if (currentMonthMVA > 0) {
          ExtraBenefits.push({
            payheadName: 'Fringe Benefit MVA',
            amount: currentMonthMVA,
          });
        }
      }

      if (ExtraBenefits.length) {
        object['extraBenefits'] = ExtraBenefits;
      }
    }

    object['gross'] = gross;
    object['netPay'] = netPay;

    const filePath = getTemplate('paySlip');

    const file = await readFile(filePath);
    const template = Handlebars.compile(file);
    const html = template(object);

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox'],
    });
    const page = await browser.newPage();

    // Set the HTML content of the page
    await page.setContent(html);

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4', // Page format (A4 in this case)
      printBackground: true, // print background
      timeout: 120000,
      landscape: false, // Set PDF to landscape mode
    });
    await browser.close();

    const base64path = Buffer.from(pdfBuffer).toString('base64');

    return res.status(200).json({
      status: 200,
      data: base64path,
    });
  } catch (error) {
    next(error);
  }
};

// Release Unrelese salary slip
exports.salarySlipStatusChange = async (req, res, next) => {
  try {
    const {
      userMasterID,
      yearMonth,
      payrollStartDate,
      payrollEndDate,
      salarySlipIssue,
    } = req.body;

    if (
      ![0, 1].includes(+salarySlipIssue) ||
      !Array.isArray(userMasterID) ||
      userMasterID.length === 0
    ) {
      return res.status(200).json({
        status: 401,
        message: usermessage.ValidParameters,
      });
    }

    let { payrollFrequency } = req.body;

    if (!payrollFrequency) payrollFrequency = PayrollFrequencyType.MONTHLY;

    const condition = { payrollFrequency, userMasterID };

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      condition.salaryYYYYMM = yearMonth;
    } else {
      condition.startDate = payrollStartDate;
      condition.endDate = payrollEndDate;
    }

    await HRSalarySlip.update(
      {
        salarySlipIssue,
        updateBy: req.userDetails.userMasterId,
        updateByIp: req.userDetails.userIpAddress,
      },
      {
        where: condition,
      },
    );

    return res.status(200).json({
      status: 200,
      message:
        salarySlipIssue === 0
          ? 'Salary slip un-released successfully.'
          : 'Salary slip released successfully.',
    });
  } catch (error) {
    next(error);
  }
};

exports.generateBankSalaryFile = async (req, res, next) => {
  try {
    const {
      companyMasterId,
      userMasterID,
      payrollFrequency,
      startDate,
      endDate,
      YYYYMM,
    } = req.body;

    if (!companyMasterId) {
      return res.status(200).json({
        status: 401,
        message: usermessage.requiredMessage('Company'),
      });
    }

    if (!payrollFrequency) {
      return res.status(200).json({
        status: 401,
        message: usermessage.requiredMessage('payrollFrequency'),
      });
    }

    if (
      payrollFrequency != PayrollFrequencyType.MONTHLY &&
      (!startDate || !endDate)
    ) {
      return res.status(200).json({
        status: 401,
        message: usermessage.requiredMessage('startDate and endDate'),
      });
    }

    if (payrollFrequency == PayrollFrequencyType.MONTHLY && !YYYYMM) {
      return res.status(200).json({
        status: 401,
        message: usermessage.requiredMessage('Month'),
      });
    }

    const salaryCondition = { payrollFrequency };

    if (payrollFrequency != PayrollFrequencyType.MONTHLY) {
      salaryCondition.startDate = startDate;
      salaryCondition.endDate = endDate;
    } else {
      salaryCondition.salaryYYYYMM = YYYYMM;
    }

    const condition = { companyMasterId };

    if (userMasterID?.length) {
      condition.userMasterID = { [Sequelize.Op.in]: userMasterID };
    }

    const userMasterData = await UserMaster.findAll({
      where: condition,
      attributes: ['displayName'],
      include: [
        {
          model: EmployeeJoiningDetails,
          include: [
            {
              model: BankBranch,
              attributes: ['bankBranchCode', 'bankBranchName'],
            },
            { model: BankMaster, attributes: ['bankName'] },
          ],
          attributes: ['bankAccountNo', 'bankAccountStatus'],
        },
        {
          model: HRSalaryTrasaction,
          where: salaryCondition,
          attributes: ['EmployeeSalaryAmount', 'createdAt'],
          include: [
            {
              required: true,
              model: HRSalaryMasterFields,
              as: 'HSM',
              attributes: ['gradeSalaryStructureID'],
              include: [
                {
                  required: true,
                  model: GradeSalaryStructure,
                  as: 'GSS',
                  attributes: ['salaryFieldID'],
                  include: [
                    {
                      model: HRSalaryFields,
                      as: 'HSF',
                      where: { payheadMasterId: 92 },
                      attributes: ['salaryFieldID'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    if (userMasterData.length === 0) {
      return res.status(200).json({
        status: 401,
        message: 'No payroll records found.',
      });
    }

    const headers = [
      'PaymentMethod',
      'DebitAccountNumber',
      'BeneficiaryName',
      'BeneficiaryAccountNumber',
      'BeneficiaryBankBranchCode',
      'PaymentCurrency',
      'PaymentAmount',
      'CustomerReference',
      'Country',
      'ExecutionDate',
      'BeneficiaryAddress1',
      'BeneficiaryAddress2',
      'BeneficiaryAddress3',
      'BeneficiaryAddress4',
      'BeneficiaryFaxNumber',
      'BeneficiaryEmailID',
      'Charges',
      'BeneficiaryBankBranchName',
      'BeneficiaryBankName',
      'BeneficiaryBankAddress1',
      'BeneficiaryBankAddress2',
      'BeneficiaryBankCity',
      'BeneficiaryBankProvince',
      'BeneficiaryBankCountry',
      'PayableLocation',
      'PrintLocation',
      'DeliveryMethod',
      'MailingAddress1',
      'MailingAddress2',
      'MailingAddress3',
      'MailingAddress4',
      'DetailsOfPayment',
      'InstructionNumber',
      'FirstIntermediaryBankBranchCode',
      'FirstIntermediaryBankName',
      'FirstIntermediaryBranchName',
      'FirstIntermediaryBankAddress1',
      'FirstIntermediaryBankAddress2',
      'FirstIntermediaryBankCity',
      'FirstIntermediaryBankProvince',
      'FirstIntermediaryBankCountry',
      'CentralBankReporting1',
      'CentralBankReporting2',
      'CentralBankReporting3',
      'ConfidentialIndicator',
      'FXContractNumber',
      'FXContractRate',
      'ReportingCode1',
      'ReportingCode2',
    ];
    const findCompanyBankDetails = await CompanyBankDetails.findOne({
      where: {
        companyMasterID: companyMasterId,
      },
    });
    const companyAccopuntNumber =
      findCompanyBankDetails?.bankAccountNo ||
      pngGenerateSalaryFileParams.debitAccountNumber;
    const fileData = [];
    for (const user of userMasterData) {
      const fileDataObj = {
        PaymentMethod: pngGenerateSalaryFileParams.paymentMethod,
        DebitAccountNumber: companyAccopuntNumber,
        BeneficiaryName: user.displayName,
        BeneficiaryAccountNumber:
          user.employeeJoiningDetails?.[0]?.bankAccountStatus == 1
            ? user.employeeJoiningDetails?.[0]?.bankAccountNo
            : '',
        BeneficiaryBankBranchCode:
          user.employeeJoiningDetails?.[0]?.bankAccountStatus == 1
            ? user.employeeJoiningDetails?.[0]?.bankBranch?.bankBranchCode
            : '',
        PaymentCurrency: pngGenerateSalaryFileParams.paymentCurrency,
        PaymentAmount: user.hrSalaryTrasactions?.[0]?.EmployeeSalaryAmount,
        CustomerReference: '',
        Country: pngGenerateSalaryFileParams.country,
        ExecutionDate: user.hrSalaryTrasactions?.[0]?.createdAt
          ? moment().format('DD/MM/YYYY')
          : '',
        BeneficiaryAddress1: '',
        BeneficiaryAddress2: '',
        BeneficiaryAddress3: '',
        BeneficiaryAddress4: '',
        BeneficiaryFaxNumber: '',
        BeneficiaryEmailID: user.email,
        Charges: '',
        BeneficiaryBankBranchName:
          user.employeeJoiningDetails?.[0]?.bankAccountStatus == 1
            ? user.employeeJoiningDetails?.[0]?.bankBranch?.bankBranchName
            : '',
        BeneficiaryBankName:
          user.employeeJoiningDetails?.[0]?.bankAccountStatus == 1
            ? user.employeeJoiningDetails?.[0]?.bankMaster?.bankName
            : '',
        BeneficiaryBankAddress1: '',
        BeneficiaryBankAddress2: '',
        BeneficiaryBankCity: '',
        BeneficiaryBankProvince: '',
        BeneficiaryBankCountry: '',
        PayableLocation: '',
        PrintLocation: '',
        DeliveryMethod: '',
        MailingAddress1: '',
        MailingAddress2: '',
        MailingAddress3: '',
        MailingAddress4: '',
        DetailsOfPayment: '',
        InstructionNumber: '',
        FirstIntermediaryBankBranchCode: '',
        FirstIntermediaryBankName: '',
        FirstIntermediaryBranchName: '',
        FirstIntermediaryBankAddress1: '',
        FirstIntermediaryBankAddress2: '',
        FirstIntermediaryBankCity: '',
        FirstIntermediaryBankProvince: '',
        FirstIntermediaryBankCountry: '',
        CentralBankReporting1: '',
        CentralBankReporting2: '',
        CentralBankReporting3: '',
        ConfidentialIndicator: 'N',
        FXContractNumber: '',
        FXContractRate: '',
        ReportingCode1: '',
        ReportingCode2: '',
      };
      fileData.push(fileDataObj);
    }

    const lines = [];
    for (const row of fileData) {
      const line = headers.map((field) => row[field] ?? '').join('|');
      lines.push(line);
    }

    const fileContent = lines.join('\r\n');
    const fileName = `bank_salary_${Date.now()}.txt`;
    const filePath = path.join(__dirname, `../uploads/${fileName}`);

    fs.writeFileSync(filePath, fileContent, 'utf8');

    // Send file in response
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('File download error:', err);
        next(err);
      }

      // Optional: delete file after sending
      fs.unlink(filePath, () => {});
    });
  } catch (error) {
    next(error);
  }
};
