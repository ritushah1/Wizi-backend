const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const UserMaster = require('../models/userMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const SalaryPolicy = require('../models/salaryPolicy');
const {
  getDateRangeBySalaryPolicy,
  daysInMonth,
  employeeeLeaveBalance,
  getOrderByFields,
  getSalaryMasterMap,
  capitalize,
  calculateLeaveEncashemnt_FNF,
} = require('../utils/commonUtilFunctions');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeResignation = require('../models/resignation');
const ResigantionReason = require('../models/resigantionReason');
const AssignAssetToEmployee = require('../models/assignAssetToEmployee');
const assetMaster = require('../models/assetMaster');
const AssetCategory = require('../models/assetCategory');
const advancePayment = require('../models/advancePayment');
const LoanMaster = require('../models/loanMaster');
const LoanTransaction = require('../models/loanTransaction');
const LoanAdvance = require('../models/loanAdvance');
const EmployeePenalty = require('../models/employeePenalty');
const Penalty = require('../models/penalty');
const {
  employeeRepaymentType,
  advancePaymentType,
  PayrollFrequencyType,
  bonusPaymentFNFStatusEnum,
  chekLeaveBalanceFromEnum,
  HrLeaveTypesIds,
  CoffUsedTypeEnum,
  AuthorizationStatusType,
  payheadMasterIdsMapping,
  SalaryStructureTypeEnum,
  offDayCategoryEnum,
  incentivePayModeEnum,
  depositPayModeEnum,
} = require('../utils/dbUtils');
const EmployeeRepayment = require('../models/employeeRepayment');
const { usermessage } = require('../response_message/message');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const ResignationTaskAssign = require('../models/resignTaskAssign');
const EmployeeBonus = require('../models/employeeBonus');
const { statusCodes } = require('../utils/commonVars');
const LeaveEncashment = require('../models/leaveEncashment');
const UserLeaveLapse = require('../models/userLeaveLapse');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const HRSalaryTrasaction = require('../models/hrSalaryTransaction');
const moment = require('moment');
const UsedCoffTransaction = require('../models/usedCoffTransaction');
const HrLeaveBalance = require('../models/hrLeaveBalance');
const { date, required } = require('@hapi/joi');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const EmployeeSkillCategory = require('../models/employeeSkillCategory');
const employeeLeavePolicy = require('../models/employeeLeavePolicy');
const empLeavePolicy = require('../models/empLeavePolicy');
const UserLeaveTransaction = require('../models/userLeaveTransaction');
const UserLeave = require('../models/userleave');
const { includes, get } = require('lodash');
const EmployeeShift = require('../models/employeeShift');
const EmployeeWeekOff = require('../models/employeeWeekOff');
const weekOffPolicy = require('../models/weekOffPolicy');
const Shift = require('../models/shift');
const ShiftTIme = require('../models/shiftTime');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const Employeeincentive = require('../models/employeeincentive');
const Incentivetype = require('../models/incentivetype');
const deposit = require('../models/deposit');
const depositcategory = require('../models/depositCategory');
const FormAuthorizationDetails = require('../models/AuthorizationDetails');


exports.getFNFCount = async (req, res, next) => {
  try {
    const { userMasterID = [], month } = req.body;

    if (!userMasterID.length || !month)
      return res.status(200).json({
        status: 401,
        message: 'Invalid parameters!',
      });

    const year = String(month).slice(0, 4);
    const Month = String(month).slice(4, 6);
    let monday = daysInMonth(Month, year);

    const enddate = year + '-' + Month + '-' + monday;

    const userData = await UserMaster.findAll({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: userMasterID,
        },
      },
      include: [
        {
          required: true,
          model: EmployeeJoiningDetails,
          where: {
            leavingDate: {
              [Sequelize.Op.and]: {
                [Sequelize.Op.ne]: '',
                [Sequelize.Op.not]: null,
              },
            },
          },
        },
        {
          required: false,
          separate: true,
          model: HrLeaveMonthlyTrans,
          where: {
            AttnYearMon: month,
          },
          limit: 1,
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
                endDate: { [Sequelize.Op.is]: null },
              },
            ],
          },
          attributes: ['salaryPolicyID'],
          include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
        },
      ],
    });

    let counter = 0;

    for (const data of userData) {
      const empjoining = data.employeeJoiningDetails[0] || null;
      const att_cal = data.hrLeaveMonthlyTrans?.[0] || null;
      const salaryPolicy =
        data.employeeSalaryPolicies?.[0]?.salaryPolicy || null;

      const leavingDate = empjoining?.leavingDate || null;

      if (leavingDate) {
        // if attendance calculation data
        if (att_cal && att_cal.monthstartdate && att_cal.monthenddate) {
          if (
            new Date(leavingDate).getTime() >=
              new Date(att_cal.monthstartdate).getTime() &&
            new Date(leavingDate).getTime() <=
              new Date(att_cal.monthenddate).getTime()
          ) {
            counter++;
            continue;
          }
        }

        const { start_date, end_date } = getDateRangeBySalaryPolicy(
          year,
          Month,
          salaryPolicy,
        );

        if (
          new Date(leavingDate).getTime() >= new Date(start_date).getTime() &&
          new Date(leavingDate).getTime() <= new Date(end_date).getTime()
        ) {
          counter++;
          continue;
        }
      }
    }

    return res.status(200).json({
      status: 200,
      count: counter,
    });
  } catch (error) {
    next(error);
  }
};

exports.listFNF = async (req, res, next) => {
  try {
    const {
      companyId,
      branchId,
      month,
      userMasterID = [],
      isFNF,
      payrollFrequency = PayrollFrequencyType.MONTHLY,
      payrollStartDate,
      payrollEndDate,
      userStatus = '1',
    } = req.body;

    if (
      payrollFrequency == PayrollFrequencyType.FORTNIGHTLY ||
      payrollFrequency == PayrollFrequencyType.WEEKLY
    ) {
      if (!companyId)
        return res.status(200).json({
          status: 401,
          message: 'Invalid Parameters!',
        });
    } else {
      if (!companyId || !month)
        return res.status(200).json({
          status: 401,
          message: 'Invalid Parameters!',
        });
    }

    const condition = {
      companyMasterId: companyId,
      status: 1,
    };

    const empJoiningDetailsCondition = {
      leavingDate: {
        [Sequelize.Op.and]: {
          [Sequelize.Op.ne]: '',
          [Sequelize.Op.not]: null,
        },
      },
    };
    if (payrollFrequency)
      empJoiningDetailsCondition.payrollFrequency = payrollFrequency;

    if (userMasterID && userMasterID.length)
      condition['userMasterID'] = {
        [Sequelize.Op.in]: userMasterID,
      };

    if (isFNF == 'Pending') {
      condition.isFNF = {
        [Sequelize.Op.or]: [null, false],
      };
    } else if (isFNF == 'Completed') {
      condition.isFNF = true;
    }

    condition.status = userStatus || '1';

    const year = String(month).slice(0, 4);
    const Month = String(month).slice(4, 6);
    let monday = daysInMonth(Month, year);
    let enddate;
    if (
      payrollFrequency == PayrollFrequencyType.FORTNIGHTLY ||
      payrollFrequency == PayrollFrequencyType.WEEKLY
    ) {
      enddate = payrollEndDate;
    } else {
      enddate = year + '-' + Month + '-' + monday;
    }

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const allIncludes = [
      ...includeModels,
      {
        required: true,
        model: EmployeeJoiningDetails,
        where: empJoiningDetailsCondition,
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
              endDate: { [Sequelize.Op.is]: null },
            },
          ],
        },
        attributes: ['salaryPolicyID'],
        include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
      },
      {
        model: EmployeeDesignation,
        where: {
          status: 1,
          applicableDate: { [Sequelize.Op.lte]: enddate },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: enddate } },
            { endDate: { [Sequelize.Op.is]: null } },
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
          applicableDate: { [Sequelize.Op.lte]: enddate },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: enddate } },
            { endDate: { [Sequelize.Op.is]: null } },
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
          ...(branchId && { branchID: branchId }),
          applicableDate: { [Sequelize.Op.lte]: enddate },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: enddate } },
            { endDate: { [Sequelize.Op.is]: null } },
          ],
        },
        required: branchId ? true : false,
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
        model: EmployeeResignation,
        as: 'employee',
        where: {
          authorizationstatus: {
            [Sequelize.Op.notIn]: [4, 5],
          },
        },
      },
    ];

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      allIncludes.push({
        required: false,
        separate: true,
        model: HrLeaveMonthlyTrans,
        where: {
          AttnYearMon: month,
        },
        limit: 1,
      });
    }

    const userData = await UserMaster.findAll({
      where: { ...where, ...condition },
      include: allIncludes,
    });

    const finalData = [];

    for (const data of userData) {
      const empjoining = data.employeeJoiningDetails[0] || null;
      const att_cal = data.hrLeaveMonthlyTrans?.[0] || null;
      const salaryPolicy =
        data.employeeSalaryPolicies?.[0]?.salaryPolicy || null;
      const branch =
        data.employeeBranches?.[0]?.branchMaster?.branchName || null;
      const department =
        data.employeeDepartments?.[0]?.department?.departmentName || null;
      const designation =
        data.employeeDesignations?.[0]?.designation?.designationName || null;
      const resignation = data.employee?.[0] || null;

      const obj = {
        userMasterID: data.userMasterID,
        empCode: empjoining?.employeeCode || '',
        displayName: data.displayName,
        userNumber: data.userNumber,
        branch,
        department,
        designation,
        appliedDate: resignation?.appliedDate || '',
        lastworkingdate: resignation?.lastworkingdate || '',
        preferredLWDate: resignation?.preferredLWDate || '',
        relievingDate: resignation?.relievingDate || '',
        leavingDate: empjoining?.leavingDate || '',
        status: data.isFNF ? 'Completed' : 'Pending',
        noticeperiod: resignation?.noticeperiod || '',
        photo: data.photo,
        firstName: data.firstName,
        lastName: data.lastName,
      };

      const leavingDate = empjoining?.leavingDate || null;

      if (leavingDate) {
        // if attendance calculation data
        if (
          (payrollFrequency == PayrollFrequencyType.FORTNIGHTLY ||
            payrollFrequency == PayrollFrequencyType.WEEKLY) &&
          payrollStartDate &&
          payrollEndDate
        ) {
          if (
            new Date(leavingDate).getTime() >=
              new Date(payrollStartDate).getTime() &&
            new Date(leavingDate).getTime() <=
              new Date(payrollEndDate).getTime()
          ) {
            finalData.push(obj);
            continue;
          }
        } else {
          if (att_cal && att_cal.monthstartdate && att_cal.monthenddate) {
            if (
              new Date(leavingDate).getTime() >=
                new Date(att_cal.monthstartdate).getTime() &&
              new Date(leavingDate).getTime() <=
                new Date(att_cal.monthenddate).getTime()
            ) {
              finalData.push(obj);
              continue;
            }
          }

          const { start_date, end_date } = getDateRangeBySalaryPolicy(
            year,
            Month,
            salaryPolicy,
          );

          if (
            new Date(leavingDate).getTime() >= new Date(start_date).getTime() &&
            new Date(leavingDate).getTime() <= new Date(end_date).getTime()
          ) {
            finalData.push(obj);
            continue;
          }
        }
      }
    }

    return res.status(200).json({
      status: 200,
      data: finalData,
      totalcount: finalData.length,
    });
  } catch (error) {
    next(error);
  }
};

exports.resignationByUserId = async (req, res, next) => {
  try {
    const { id } = req.params;

    const resignationData = await EmployeeResignation.findOne({
      where: {
        userMasterID: id,
        status: 1,
        authorizationstatus: {
          [Sequelize.Op.in]: [0, 1, 2, 3],
        },
      },
      include: [{ model: ResignationTaskAssign }, { model: ResigantionReason }],
    });

    const taskPending = (resignationData?.resignTaskAssigns || []).some((e) =>
      [0, 2].includes(+e.status),
    );

    return res.status(200).json({
      status: 200,
      data: resignationData,
      taskCompleted: !taskPending,
    });
  } catch (error) {
    next(error);
  }
};

exports.assetByUserId = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await AssignAssetToEmployee.findAll({
      where: {
        userMasterID: id,
        status: 1,
        returnDate: {
          [Sequelize.Op.is]: null,
        },
      },
      include: [
        { model: assetMaster, as: 'assetMaster' },
        { model: AssetCategory, as: 'assetCategory' },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.advanceByUserId = async (req, res, next) => {
  try {
    const { id } = req.params;

    const data = await advancePayment.findAll({
      where: {
        userMasterID: id,
        AdvanceStatus: 1,
        status: 1,
        tablereferenceID: {
          [Sequelize.Op.is]: null,
        },
        advancePaymentID: {
          [Sequelize.Op.notIn]: Sequelize.literal(`(
                        
SELECT DISTINCT "advancePaymentID" FROM "employeeRepayments" WHERE "advancePaymentID" in (SELECT "advancePaymentID" from "advancePayments" where "userMasterID" = ${id} and status=1 and "AdvanceStatus"=1 and "tablereferenceID" is NULL)
                    )`),
        },
      },
      order: [['advanceDate', 'ASC']],
    });

    return res.status(200).json({
      status: 200,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.loanByUserId = async (req, res, next) => {
  try {
    const { userMasterID, FNFMonth } = req.query;

    const loanData = await LoanMaster.findAll({
      where: {
        userMasterID,
        loanstatus: 1,
        status: 1,
        LoanID: {
          [Sequelize.Op.in]: Sequelize.literal(`(
                        SELECT DISTINCT "LoanID" 
                        FROM "loanTransactions" 
                        WHERE "RefrenceId" IS NULL and "loanAdvanceId" IS NULL
                    )`),
        },
      },
      include: [
        {
          required: false,
          model: LoanTransaction,
        },
        {
          required: false,
          model: LoanAdvance,
          where: {
            type: advancePaymentType.ADVANCE,
          },
        },
      ],
    });

    const finalData = [];

    for (const loan of loanData) {
      const transactions = loan.loanTransactions || [];
      const advance = loan.loanAdvances || [];

      const amount = transactions.reduce((acc, obj) => acc + +obj.EMIAmount, 0);

      if (+amount <= 0) continue;
      let first = true;
      const pendingAmount = [...transactions]
        .filter((e) => !e.RefrenceId && !e.loanAdvanceId)
        .reduce((acc, obj) => {
          const interest = first ? +obj.monthlyInterest : 0;
          first = false;
          return acc + (+obj.monthlyPrinciple + interest);
        }, 0);
      const advanceAmount = [...advance].reduce(
        (acc, obj) => acc + +obj.Amount,
        0,
      );
      loan.dataValues.pendingAmount = Math.round(+pendingAmount);

      loan.dataValues.advanceAmount = Math.round(+advanceAmount);

      // check if loan transaction month same

      const check = transactions.filter(
        (e) => !e.RefrenceId && e.EMIMonth != FNFMonth,
      );

      let deduct_from_salary_button = false;

      if (check.length) deduct_from_salary_button = true;

      loan.dataValues.deduct_from_salary_button = deduct_from_salary_button;

      finalData.push(loan);
    }

    return res.status(200).json({
      status: 200,
      data: finalData,
    });
  } catch (error) {
    next(error);
  }
};

exports.penaltyByUserId = async (req, res, next) => {
  try {
    const { userMasterID, FNFMonth, payrollFrequency, endDate, startDate } =
      req.query;

    let enddate;
    let year;
    let Month;

    if (
      (payrollFrequency == PayrollFrequencyType.FORTNIGHTLY ||
        payrollFrequency == PayrollFrequencyType.WEEKLY) &&
      endDate
    ) {
      enddate = endDate;
    } else {
      year = String(FNFMonth).slice(0, 4);
      Month = String(FNFMonth).slice(4, 6);
      let monday = daysInMonth(Month, year);

      enddate = year + '-' + Month + '-' + monday;
    }

    const allIncludes = [
      {
        required: true,
        model: EmployeeJoiningDetails,
        where: {
          leavingDate: {
            [Sequelize.Op.and]: {
              [Sequelize.Op.ne]: '',
              [Sequelize.Op.not]: null,
            },
          },
        },
      },
    ];

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      allIncludes.push(
        {
          required: false,
          separate: true,
          model: HrLeaveMonthlyTrans,
          where: {
            AttnYearMon: FNFMonth,
          },
          limit: 1,
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
                endDate: { [Sequelize.Op.is]: null },
              },
            ],
          },
          attributes: ['salaryPolicyID'],
          include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
        },
      );
    }

    const userData = await UserMaster.findOne({
      where: {
        userMasterID,
      },
      include: allIncludes,
    });

    if (!userData) {
      return res.status(200).json({
        status: 401,
        message: 'User not found!',
      });
    }

    let start_date;
    let end_date;

    if (
      (payrollFrequency == PayrollFrequencyType.FORTNIGHTLY ||
        payrollFrequency == PayrollFrequencyType.WEEKLY) &&
      startDate &&
      endDate
    ) {
      start_date = startDate;
      end_date = endDate;
    } else {
      start_date = year + '-' + Month + '-' + '01';
      end_date = enddate;

      const empjoining = userData.employeeJoiningDetails[0] || null;
      const att_cal = userData.hrLeaveMonthlyTrans?.[0] || null;
      const salaryPolicy =
        userData.employeeSalaryPolicies?.[0]?.salaryPolicy || null;

      const leavingDate = empjoining?.leavingDate || null;

      if (leavingDate) {
        // if attendance calculation data
        if (att_cal && att_cal.monthstartdate && att_cal.monthenddate) {
          ((start_date = att_cal.monthstartdate),
            (end_date = att_cal.monthenddate));
        } else {
          const { start_date: start_date_temp, end_date: end_date_temp } =
            getDateRangeBySalaryPolicy(year, Month, salaryPolicy);

          start_date = start_date_temp;
          end_date = end_date_temp;
        }

        if (
          new Date(leavingDate).getTime() >= new Date(start_date).getTime() &&
          new Date(leavingDate).getTime() <= new Date(end_date).getTime()
        ) {
          end_date = leavingDate;
        }
      }
    }

    const employeePenalty = await EmployeePenalty.findAll({
      where: {
        userMasterID,
        status: 1,
        RefrenceId: {
          [Sequelize.Op.is]: null,
        },
        penaltyDate: {
          [Sequelize.Op.between]: [start_date, end_date],
        },
        employeePenaltyID: {
          [Sequelize.Op.notIn]: Sequelize.literal(`(
                        SELECT DISTINCT "employeePenaltyID" FROM "employeeRepayments" WHERE "employeePenaltyID" in (SELECT "employeePenaltyID" from "employeePenalties" as emp LEFT join
                        "penalties" as pe on emp."penaltyID" = pe."penaltyID" where "userMasterID" = ${userMasterID} and emp.status=1 and "RefrenceId" is NULL and pe."deductionFromSalary" = TRUE and emp."penaltyDate" BETWEEN '${start_date}' AND '${end_date}')
                    )`),
        },
      },
      include: [
        { model: Penalty, as: 'penalty', where: { deductionFromSalary: true } },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: employeePenalty,
    });
  } catch (error) {
    next(error);
  }
};

// add advance and Penalty Repayment

exports.addEmp_repayment = async (req, res, next) => {
  try {
    const {
      type,
      date,
      salaryMonth,
      amount,
      paymentMode,
      referenceNO = null,
    } = req.body;
    let { advancePaymentID = null, employeePenaltyID = null } = req.body;

    if (!type || !date || !salaryMonth || !amount || !paymentMode) {
      return res.status(200).json({
        status: 401,
        message: 'Pass valid parameters!',
      });
    }

    if (type == employeeRepaymentType.ADVANCE) employeePenaltyID = null;
    if (type == employeeRepaymentType.PENALTY) advancePaymentID = null;

    if (!employeePenaltyID && !advancePaymentID) {
      return res.status(200).json({
        status: 401,
        message: 'Pass valid parameters!',
      });
    }

    const message = employeePenaltyID
      ? 'Penalty'
      : advancePaymentID
        ? 'Adavance'
        : '';

    const condition = employeePenaltyID
      ? { type: employeeRepaymentType.PENALTY, employeePenaltyID }
      : advancePaymentID
        ? { type: employeeRepaymentType.ADVANCE, advancePaymentID }
        : null;

    if (condition) {
      const check = await EmployeeRepayment.findOne({
        where: condition,
      });

      if (check) {
        return res.status(200).json({
          status: 200,
          message: `A repayment has already been recorded for this ${message}. Duplicate repayments are not allowed. `,
        });
      }
    }

    await EmployeeRepayment.create(
      {
        type,
        date,
        salaryMonth,
        amount,
        paymentMode,
        referenceNO,
        employeePenaltyID,
        advancePaymentID,
      },
      {
        user: req.userDetails,
      },
    );

    return res.status(200).json({
      status: 200,
      message: usermessage.addMessage(`Employee ${message}  Repayment`),
    });
  } catch (error) {
    next(error);
  }
};

// set  same month for all loantransactions
exports.loanTransInFNF = async (req, res, next) => {
  try {
    const { LoanID, month, startDate, endDate } = req.body;

    let { payrollFrequency } = req.body;
    if (!payrollFrequency) payrollFrequency = PayrollFrequencyType.MONTHLY;

    // Common validation response function
    const validationError = (field) => {
      return res.status(200).json({
        status: 401,
        message: usermessage.requiredMessage(field),
      });
    };

    //  LoanID required
    if (!LoanID) {
      return validationError('LoanID');
    }

    //  Monthly validation
    if (payrollFrequency === PayrollFrequencyType.MONTHLY && !month) {
      return validationError('month');
    }

    // Date range validation
    if (
      payrollFrequency !== PayrollFrequencyType.MONTHLY &&
      (!startDate || !endDate)
    ) {
      return validationError('startDate and endDate');
    }

    const loanMasterIntrestData = await LoanMaster.findByPk(LoanID, {
      attributes: ['interest', 'payrollFrequency'],
    });

    if (!loanMasterIntrestData)
      return res.status(200).json({
        status: 401,
        message: usermessage.notFoundMessage('Loan Data'),
      });

    if (
      loanMasterIntrestData.interest !== undefined &&
      loanMasterIntrestData.interest > 0
    ) {
      const pendingLoan = await LoanTransaction.findAll({
        attributes: [
          'LoanTrasactionId',
          'LoanID',
          'EMIAmount',
          'EMIMonth',
          'monthlyInterest',
          'monthlyPrinciple',
        ],
        where: {
          LoanID,
          RefrenceId: {
            [Sequelize.Op.is]: null,
          },
        },
        order: [['LoanTrasactionId', 'DESC']],
      });

      const updates = pendingLoan.slice(1).map((loan) =>
        LoanTransaction.update(
          {
            EMIAmount: loan.monthlyPrinciple,
            monthlyInterest: 0,
          },
          {
            where: {
              LoanTrasactionId: loan.LoanTrasactionId,
            },
          },
        ),
      );

      await Promise.all(updates);
    }

    const updateData = {};

    if (
      loanMasterIntrestData.payrollFrequency != PayrollFrequencyType.MONTHLY
    ) {
      updateData.startDate = startDate;
      updateData.endDate = endDate;

      const updateMonth = month
        ? month
        : String(endDate).substring(0, 7).replace('-');

      updateData.EMIMonth = updateMonth;
    } else {
      updateData.EMIMonth = month;
    }

    // update all Loan Transaction
    await LoanTransaction.update(updateData, {
      where: {
        LoanID,
        RefrenceId: {
          [Sequelize.Op.is]: null,
        },
      },
    });

    return res.status(200).json({
      status: 200,
      message: usermessage.updateMessage(`Loan Payment`),
    });
  } catch (error) {
    next(error);
  }
};

exports.bonusPaymentFNFStatusChange = async (req, res, next) => {
  try {
    const { id, operationType } = req.body;

    if (!id || !operationType) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.requiredMessage('id and operationType'),
      });
    }

    if (!Object.values(bonusPaymentFNFStatusEnum).includes(operationType)) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: `Invalid operation type. Only ${Object.values(bonusPaymentFNFStatusEnum).join(', ')} are allowed.`,
      });
    }

    await EmployeeBonus.update(
      {
        bonusPaymentFNFStatus: operationType,
      },
      {
        where: {
          id,
        },
        individualHooks: true,
        user: req.userDetails,
      },
    );

    return res.status(200).json({
      status: 401,
      message: `Bonus ${operationType == bonusPaymentFNFStatusEnum.PAY_IN_FNF ? 'updated' : 'Waive Off'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

exports.getBonusInFNFByUserId = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) throw new Error('UserId is not found!');

    const bonusData = await EmployeeBonus.findAll({
      where: {
        userMasterID: id,
        status: 1,
        payReferenceId: {
          [Sequelize.Op.is]: null,
        },
        employeePaymentId: {
          [Sequelize.Op.is]: null,
        },
      },
      attributes: ['bonusYYYYMM', 'amount', 'bonusPaymentFNFStatus', 'id'],
      order: [['bonusYYYYMM', 'ASC']],
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: bonusData,
    });
  } catch (error) {
    next(error);
  }
};

exports.proccessedLeaveInFNFByUserId = async (req, res, next) => {
  try {
    const { userMasterID, companyMasterID } = req.body;

    if (!userMasterID) throw new Error('UserId is not found!');

    const [encashedData, lapsedData] = await Promise.all([
      LeaveEncashment.findAll({
        where: {
          userMasterID,
          status: 1,
          isFromFNF: true,
        },
        attributes: ['LeaveTranId', 'days', 'isFromFNF', 'payInFNF'],
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
      }),
      UserLeaveLapse.findAll({
        where: {
          userMasterID,
          isFromFNF: true,
        },
        attributes: ['LeaveTranId', 'LapseDays', 'isFromFNF'],
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
      }),
    ]);

    const leaveMap = new Map();

    const createDefault = (leave) => ({
      leaveName: leave?.hrLeaveType?.LeaveMaster?.LeaveName || '',
      leaveDesc: leave?.hrLeaveType?.LeaveMaster?.LeaveDesc || '',
      encashInFNF: 0,
      encashInSalary: 0,
      lapse: 0,
    });

    // Process encashed data
    for (const leave of encashedData) {
      const key = leave?.hrLeaveType?.LeaveID;

      if (!key) continue;

      if (!leaveMap.has(key)) {
        leaveMap.set(key, createDefault(leave));
      }

      const data = leaveMap.get(key);
      const days = leave?.days || 0;

      if (leave.payInFNF) {
        data.encashInFNF += days;
      } else if (leave.isFromFNF) {
        data.encashInSalary += days;
      }
    }

    // Process lapsed data
    for (const leave of lapsedData) {
      const key = leave?.hrLeaveType?.LeaveID;

      if (!key || !leave.isFromFNF) continue;

      if (!leaveMap.has(key)) {
        leaveMap.set(key, createDefault(leave));
      }

      leaveMap.get(key).lapse += leave?.LapseDays || 0;
    }

    // Convert map to array of objects
    const leaveArray = Array.from(leaveMap, ([LeaveID, value]) => ({
      LeaveID,
      ...value,
    }));

    // ------------------------------- leave balance data ---------------------

    const userBalance = await employeeeLeaveBalance(
      companyMasterID,
      userMasterID,
      null,
      null,
      null,
      null,
      null,
      chekLeaveBalanceFromEnum.ADMIN,
    );

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      fnfLeave: leaveArray,
      leaveBalance: userBalance.filter(
        (e) => e.LeaveID != HrLeaveTypesIds.OPTIONAL_HOLIDAY && e.Balance > 0,
      ),
    });
  } catch (error) {
    next(error);
  }
};

exports.revertLeaveAtFNF = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { userMasterID, LeaveID, FNFMonth , payrollFrequency, startDate, endDate} = req.body;

  const badRequest = async (params) => {
  await transaction.rollback();
  return res.status(statusCodes.OK).json({
    status: statusCodes.BAD_REQUEST,
    message: usermessage.passValidValidParameter(params),
  });
};

if (!userMasterID || !LeaveID) {
  return badRequest(' userMasterID,LeaveID');
}

const isMonthly = payrollFrequency === PayrollFrequencyType.MONTHLY;
const condition = { userMasterID };

if (isMonthly) {
  if (!startDate || !endDate) return badRequest(' startDate,endDate');
  Object.assign(condition, { startDate, endDate });
} else {
  if (!FNFMonth) return badRequest(' FNFMonth');
  condition.salaryYYYYMM = FNFMonth;
}

const salary = await HRSalaryTrasaction.findOne({
  where: condition,
  transaction,
});

    if (salary) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Salary already calculated!',
      });
    }

    const [encashedData, lapsedData] = await Promise.all([
      LeaveEncashment.findAll({
        where: {
          userMasterID,
          status: 1,
          isFromFNF: true,
        },
        include: [
          { model: HrLeaveTypes, where: { LeaveID }, attributes: ['LeaveID'] },
        ],
      }),
      UserLeaveLapse.findAll({
        where: {
          userMasterID,
          isFromFNF: true,
        },
        include: [
          { model: HrLeaveTypes, where: { LeaveID }, attributes: ['LeaveID'] },
        ],
      }),
    ]);

    if (LeaveID == HrLeaveTypesIds.COFF) {
      const encashDates = encashedData.map((e) =>
        moment(e.createdAt).format('YYYY-MM-DD'),
      );
      const lapseDates = lapsedData.map((e) =>
        moment(e.createdAt).format('YYYY-MM-DD'),
      );

      if (encashDates.length || lapseDates.length) {
        const usedCoffData = await UsedCoffTransaction.findAll({
          where: {
            [Sequelize.Op.or]: [
              {
                date: encashDates,
                type: CoffUsedTypeEnum.ENCASH,
              },
              {
                date: lapseDates,
                type: CoffUsedTypeEnum.LAPSE,
              },
            ],
          },
          include: [
            {
              model: HrLeaveBalance,
              where: {
                userMasterID,
              },
              include: [
                { model: HrLeaveTypes, where: { LeaveID }, attributes: [] },
              ],
            },
          ],
        });

        const todeleteCoffTransIds = [];
        const hrLeaveBalanceData = [];

        const totalDays =
          encashedData.reduce((acc, obj) => acc + +obj.days, 0) +
          lapsedData.reduce((acc, obj) => acc + +obj.LapseDays, 0);

        const hrLeaveBalanceMap = new Map();

        for (const data of usedCoffData) {
          const hrLeaveBalance = data.hrLeaveBalance;

          if (!hrLeaveBalance) continue;

          const key = hrLeaveBalance.LeaveBalTranId;
          const value = hrLeaveBalance.availBal;

          hrLeaveBalanceMap.set(key, { available: value });
        }

        let remaining = totalDays;

        for (const usedCoff of usedCoffData) {
          const hrleaveBalance = usedCoff.hrLeaveBalance;
          const LeaveBalTranId = hrleaveBalance.LeaveBalTranId;

          if (remaining <= 0) break;

          const hrLeaveBalanceData = hrLeaveBalanceMap?.get(LeaveBalTranId);

          if (!hrLeaveBalanceData) continue;

          // if remaining days are less than the used coff
          if (remaining < +usedCoff.days) {
            usedCoff.days -= +remaining;
            // update used coff
            await usedCoff.save({ transaction });

            hrLeaveBalanceData.available += +remaining;

            break;
          } else {
            remaining -= +usedCoff.days;

            todeleteCoffTransIds.push(usedCoff.id);
            hrLeaveBalanceData.available += +usedCoff.days;
          }
        }

        // delete used coff
        await UsedCoffTransaction.destroy({
          where: {
            id: {
              [Sequelize.Op.in]: todeleteCoffTransIds,
            },
          },
          transaction,
        });

        await Promise.all(
          [...hrLeaveBalanceMap.entries()].map(([key, value]) =>
            HrLeaveBalance.update(
              {
                availBal: value.available,
                updateBy: req.userDetails.userMasterId,
                updateByIp: req.userDetails.userIpAddress,
              },
              {
                where: {
                  LeaveBalTranId: key,
                },
                transaction,
              },
            ),
          ),
        );
      }
    }

    if (encashedData.length) {
      const encashIds = encashedData.map((e) => e.id);

      await LeaveEncashment.destroy(
        {
          where: {
            id: {
              [Sequelize.Op.in]: encashIds,
            },
          },
        },
        { transaction },
      );
    }

    if (lapsedData.length) {
      const lapseIds = lapsedData.map((e) => e.UserLeaveLapseID);

      await UserLeaveLapse.destroy(
        {
          where: {
            UserLeaveLapseID: {
              [Sequelize.Op.in]: lapseIds,
            },
          },
        },
        { transaction },
      );
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: 'Leave revert successfully.',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.fnfUsersList = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchMasterID,
      departmentID,
      designationID,
      divisionId,
      workingAreaId,
      workerType,
      contractorId,
      status,
      FNFMonth,
      userMasterID,
    } = req.body;

    if (!companyMasterID || !FNFMonth) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.passValidValidParameter(
          ' companyMasterID,FNFMonth',
        ),
      });
    }

    const month = String(FNFMonth).slice(4, 6);
    const year = String(FNFMonth).slice(0, 4);

    const startDate = year + '-' + month + '-' + '01';
    const endDate = year + '-' + month + '-' + daysInMonth(month, year);

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const joinindCondition = {};
    if (workerType) joinindCondition.salarytype = workerType;
    if (contractorId) joinindCondition.contractorId = contractorId;

    const includedModels = [
      ...includeModels,
      {
        model: EmployeeJoiningDetails,
        where: joinindCondition,
        attributes: ['employeeCode'],
      },
      {
        model: EmployeeDesignation,
        where: {
          status: 1,
          ...(designationID &&
            (!Array.isArray(designationID) || designationID.length) && {
              designationID,
            }),
          applicableDate: {
            [Sequelize.Op.lte]: endDate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: endDate,
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: designationID?.length ? true : false,
        attributes: ['designationID'],
      },
      {
        model: EmployeeDepartment,
        where: {
          status: 1,
          ...(departmentID &&
            (!Array.isArray(departmentID) || departmentID.length) && {
              departmentID,
            }),
          applicableDate: {
            [Sequelize.Op.lte]: endDate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: endDate,
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: departmentID?.length ? true : false,
        attributes: ['departmentID'],
      },
      {
        model: EmployeeBranch,
        where: {
          status: 1,
          ...(branchMasterID &&
            (!Array.isArray(branchMasterID) || branchMasterID.length) && {
              branchID: branchMasterID,
            }),
          applicableDate: {
            [Sequelize.Op.lte]: endDate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: endDate,
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: branchMasterID?.length ? true : false,
        attributes: ['branchID'],
      },
      {
        model: EmployeeDivision,
        where: {
          status: 1,
          ...(divisionId && {
            divisionId,
          }),
          startDate: {
            [Sequelize.Op.lte]: endDate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: endDate,
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: divisionId ? true : false,
        attributes: ['divisionId'],
      },

      {
        model: EmployeeWorkingArea,
        where: {
          status: 1,
          ...(workingAreaId && {
            workingAreaId,
          }),
          startDate: {
            [Sequelize.Op.lte]: endDate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: endDate,
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: workingAreaId ? true : false,
        attributes: ['workingAreaId'],
      },
    ];

    const condition = {
      companyMasterId: companyMasterID,
      isFNF: true,
      fnfMonth: FNFMonth,
    };

    if (status) condition.status = status;

    const userData = await UserMaster.findAll({
      where: { ...where, ...condition },
      include: includedModels,
      order: [['displayName', 'ASC']],
      attributes: ['userMasterID', 'displayName', 'userNumber'],
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: userData,
    });
  } catch (error) {
    next(error);
  }
};

exports.fnfRegister = async (req, res, next) => {
  try {
    const { FNFMonth, userMasterID, page, limit, exportType, sortField } =
      req.body;

    if (
      !userMasterID ||
      (Array.isArray(userMasterID) && userMasterID.length == 0) ||
      !FNFMonth
    ) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.passValidValidParameter(' userMasterID,FNFMonth'),
      });
    }

    const paginateCondition =
      !exportType && page && limit ? { offset: (page - 1) * limit, limit } : {};

    const month = String(FNFMonth).slice(4, 6);
    const year = String(FNFMonth).slice(0, 4);

    const startDate = year + '-' + month + '-' + '01';
    const endDate = year + '-' + month + '-' + daysInMonth(month, year);

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const orderByField = getOrderByFields(sortField);

    const includedModels = [
      ...includeModels,
      {
        model: EmployeeJoiningDetails,
        attributes: [
          'employeeCode',
          'joiningDate',
          'leavingDate',
          'salaryCalculationAct',
        ],
      },
      // hrleave MonthlyTrans
      {
        required: false,
        separate: true,
        model: HrLeaveMonthlyTrans,
        where: {
          verified: 1,
        },
        attributes: ['LeaveTranId', 'AttnYearMon', 'AttnVal', 'MonDays'],
        include: [
          {
            model: HrLeaveTypes,
            where: { LeaveID: HrLeaveTypesIds.PRESENT },
            attributes: ['LeaveID'],
          },
        ],
      },
      // skill category
      {
        required: false,
        model: EmployeeSkillCategory,
        where: {
          applicableYYYYMM: {
            [Sequelize.Op.lte]: FNFMonth,
          },
          [Sequelize.Op.or]: [
            {
              endYYYYMM: {
                [Sequelize.Op.gte]: FNFMonth,
              },
            },
            { endYYYYMM: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: ['skillCategory'],
      },
      // designation
      {
        model: EmployeeDesignation,
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: endDate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: endDate,
              },
            },
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
      // employee bonus
      {
        required: false,
        model: EmployeeBonus,
        where: {
          bonusPaymentFNFStatus: bonusPaymentFNFStatusEnum.PAY_IN_FNF,
          status: 1,
          payReferenceId: {
            [Sequelize.Op.is]: null,
          },
          employeePaymentId: {
            [Sequelize.Op.is]: null,
          },
        },
      },
      // leave balance
      {
        required: false,
        separate: true,
        model: HrLeaveBalance,
        include: [
          {
            model: HrLeaveTypes,
            where: { Leave_Allow: 'Y' },
            attributes: ['LeaveID', 'Leave_Allow'],
          },
        ],
        attributes: ['LeaveTranId', 'LeaveAddNew', 'OPBal'],
      },
      // leave policy
      {
        model: empLeavePolicy,
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: endDate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: endDate,
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['employeeLeavePolicyID'],
      },
      // leave Encashment
      {
        required: false,
        model: LeaveEncashment,
        where: {
          payInFNF: true,
          status: 1,
          referenceId: {
            [Sequelize.Op.is]: null,
          },
        },
        attributes: ['LeaveTranId', 'days'],
        include: [
          {
            model: HrLeaveTypes,
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
      // salary policy
      {
        model: EmployeeSalaryPolicy,
        where: {
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: endDate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: endDate,
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['salaryPolicyID'],
        include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
      },
      // shift
      {
        required: false,
        model: EmployeeShift,
        where: {
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: endDate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: endDate,
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['shiftsID'],
      },
      // weekoff policy
      {
        required: false,
        model: EmployeeWeekOff,
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: endDate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: endDate,
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['weekOffPolicyID'],
        include: [{ model: weekOffPolicy, as: 'weekoff' }],
      },
      {
        required: false,
        model: EmployeeAttendancePolicy,
        where: {
          status: 1,
          startDate: {
            [Sequelize.Op.lte]: endDate,
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: endDate,
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
            attributes: ['WHPHPriority'],
          },
        ],
      },
    ];

    const condition = {
      userMasterID: {
        [Sequelize.Op.in]: userMasterID,
      },
      status: [0, 1],
      isFNF: true,
      fnfMonth: FNFMonth,
    };

    const { rows: userData, count } = await UserMaster.findAndCountAll({
      distinct: true,
      where: { ...where, ...condition },
      paginateCondition,
      attributes: ['displayName', 'userNumber', 'userMasterID', 'gender'],
      order: orderByField,
      include: includedModels,
    });

    const allUserIds = userData.map((e) => e.userMasterID);

    const usedLeave = await UserLeaveTransaction.findAll({
      where: {
        status: 1,
      },
      include: [
        {
          required: true,
          model: HrLeaveTypes,
          where: {
            Leave_Allow: 'Y',
          },
          attributes: [],
        },
        {
          model: UserLeave,
          required: true,
          where: {
            status: 1,
            authorizationStatus: AuthorizationStatusType.APPROVED,
          },
          attributes: [],
        },
      ],
      attributes: [
        [Sequelize.col('userLeave.userMasterID'), 'userMasterID'],
        [Sequelize.fn('SUM', Sequelize.col('days')), 'usedLeave'],
      ],
      group: ['userLeave.userMasterID'],
      raw: true,
    });

    const usedLeaveMap = new Map();

    for (const used of usedLeave) {
      const key = +used.userMasterID;
      usedLeaveMap.set(key, used.usedLeave);
    }

    // find salary data
    const employeeMonthPairs = [];

    for (const user of allUserIds) {
      employeeMonthPairs.push({
        userMasterID: user,
        salaryMonth: FNFMonth,
      });
    }

    // ----------------- salary structure map ------------------

    const salaryStructureMap = await getSalaryMasterMap({
      employeeMonthPairs,
    });

    const dateWiseUserIdsRangeMap = new Map();
    const allShiftIds = new Set();

    for (const user of userData) {
      const userMasterID = +user.userMasterID;
      const salaryPolicy =
        user.employeeSalaryPolicies?.[0]?.salaryPolicy || null;
      const employeeLeaveEncash = user.leaveEncashments || [];

      if (employeeLeaveEncash.length == 0) continue;

      const salaryStructure = salaryStructureMap.get(userMasterID);

      const gross = salaryStructure
        ?.get(+FNFMonth)
        ?.get(payheadMasterIdsMapping.GROSS);

      if (!gross) continue;

      if (gross.baseOnCalculation == SalaryStructureTypeEnum.DAILY) continue;

      const { start_date, end_date } = getDateRangeBySalaryPolicy(
        year,
        month,
        salaryPolicy,
      );

      const key = `${start_date}_${end_date}`;

      if (!dateWiseUserIdsRangeMap.has(key)) {
        dateWiseUserIdsRangeMap.set(key, {
          startDate: start_date,
          endDate: end_date,
          userIds: [],
        });
      }

      const data = dateWiseUserIdsRangeMap.get(key);

      data.userIds.push(userMasterID);

      // ----add shiftids

      const shiftIds = user.employeeShifts?.[0]?.shiftsID || [];

      for (const id of shiftIds) {
        allShiftIds.add(+id);
      }
    }

    //------------------- set for shift in bulk and mapping -------------------

    const allShifts = await Shift.findAll({
      where: {
        shiftID: {
          [Sequelize.Op.in]: [...allShiftIds],
        },
      },
      include: [{ model: ShiftTIme, limit: 1 }],
      attributes: ['shiftID'],
    });

    const shiftMasterMap = new Map();

    for (let i = 0; i < allShifts.length; i++) {
      const item = allShifts[i];

      const shiftTimes = item.shiftTimes?.[0] || null;

      shiftMasterMap.set(+item.shiftID, shiftTimes);
    }

    // --------------------------------------------------------------

    // -----------------weekoff holiday setup -------------------

    const allWeekoffHolidayData = [];
    for (const [, group] of dateWiseUserIdsRangeMap) {
      const data = await weekoffHolidayTran.findAll({
        raw: true,
        where: {
          userMasterID: { [Sequelize.Op.in]: group.userIds },
          date: { [Sequelize.Op.between]: [group.startDate, group.endDate] },
          [Sequelize.Op.or]: [
            { optionalHoliday: false },
            { optionalHoliday: { [Sequelize.Op.is]: null } },
          ],
        },
        attributes: [
          'userMasterID',
          'date',
          'value',
          'WHDayType',
          'tableName',
          'yearMonth',
        ],
      });
      allWeekoffHolidayData.push(...data);
    }

    // ------------------ Create Map (userMasterID → tableName → date → data)
    const weekoffHolidayMap = new Map();

    allWeekoffHolidayData.forEach((item) => {
      if (!weekoffHolidayMap.has(+item.userMasterID)) {
        weekoffHolidayMap.set(+item.userMasterID, {
          holiday: {},
          weekoff: {},
        });
      }
      const userMap = weekoffHolidayMap.get(+item.userMasterID);

      // Add to appropriate tableName (holiday or weekoff)
      if (item.tableName === 'holiday') {
        userMap.holiday[item.date] = item;
      } else if (item.tableName === 'weekoff') {
        userMap.weekoff[item.date] = item;
      }
    });

    //------------------------------- leave policy setup ---------------

    const allLeaveIds = [
      ...new Set(
        userData.flatMap(
          (e) => e.empLeavePolicies?.[0]?.employeeLeavePolicyID || [],
        ),
      ),
    ];

    const allLeavePolicy = await employeeLeavePolicy.findAll({
      where: {
        id: {
          [Sequelize.Op.in]: allLeaveIds,
        },
      },
      attributes: ['id', 'leaveId', 'fixedAmount_ENC', 'payheadIds'],
    });

    const LeaveIdWiseMap = new Map();

    for (const leavePolicy of allLeavePolicy) {
      const key = leavePolicy.id;
      LeaveIdWiseMap.set(key, leavePolicy);
    }

    // -------------------- set all users data structure ----------------------

    const fnfData = []; // Array to collect all employee data

    for (const user of userData) {
      const userMasterID = +user.userMasterID;

      const joining = user.employeeJoiningDetails?.[0] || null;
      const desigantion =
        user.employeeDesignations?.[0]?.designation?.designationName || '';
      const skillCategory =
        user.employeeSkillCategories?.[0]?.skillCategory || '';
      const joiningDate = joining?.joiningDate || '';
      const leavingDate = joining?.leavingDate || '';
      const attnCalData = user.hrLeaveMonthlyTrans || [];
      const workingDays = attnCalData?.reduce(
        (acc, obj) => acc + +obj.AttnVal,
        0,
      );
      const totalLeavesAdded = user.hrLeaveBalances || [];
      const addedLeaveBalance = totalLeavesAdded?.reduce(
        (acc, obj) => acc + (+obj.OPBal + +obj.LeaveAddNew) || 0,
        0,
      );
      const usedLeave = usedLeaveMap?.get(userMasterID) || 0;

      const leavePolicyIds =
        user.empLeavePolicies?.[0]?.employeeLeavePolicyID || [];

      const leaveIdWiseLeavePolicyMap = new Map();

      for (const id of leavePolicyIds) {
        const leavePolicy = LeaveIdWiseMap.get(id);
        if (!leavePolicy) continue;
        const key = +leavePolicy.leaveId;
        leaveIdWiseLeavePolicyMap.set(key, leavePolicy);
      }

      const encashedData = user.leaveEncashments || [];

      const leaveWiseEncashmentMap = new Map();

      for (const encash of encashedData) {
        const key = encash.hrLeaveType?.LeaveID || null;

        if (!key) continue;

        if (!leaveWiseEncashmentMap.has(key)) {
          const leavePolicy = leaveIdWiseLeavePolicyMap?.get(+key) || null;
          leaveWiseEncashmentMap.set(key, {
            leaveName: encash.hrLeaveType?.LeaveMaster?.LeaveName || '',
            value: 0,
            leavePolicy,
            perDayAmount: 0,
          });
        }

        const data = leaveWiseEncashmentMap.get(key);

        data.value += +encash.days;
      }

      const encashedBalance = encashedData.reduce(
        (acc, obj) => acc + +obj.days,
        0,
      );
      const bonusAmount = (user.employeeBonus || []).reduce(
        (acc, obj) => acc + +obj.amount,
        0,
      );

      const salaryStructureData = salaryStructureMap
        .get(userMasterID)
        ?.get(+FNFMonth);

    const obj = {
      'Employee Code':joining?.employeeCode || '',
      'Employee Name':user.displayName,
      'Gender':user.gender == 'female' ? 'F' : user.gender == 'male' ? 'M' :'',
      Desigantion:desigantion,
      'Skill Set': skillCategory ? capitalize(skillCategory) : '',
      'Date Of Joining':joiningDate ? moment(joiningDate).format('DD-MM-YYYY'):'',
      'Date Of Leaving':leavingDate ? moment(leavingDate).format('DD-MM-YYYY'):'',
      'Total Working Days':workingDays,
      'Leave Balance Added':addedLeaveBalance,
      'No. Of Leave Taken':usedLeave,
      'Leave Balance Paid':encashedBalance,
      'Rate Per Day':0,
      'Leave Encash Amount':0,
      'Bonus Amount':Math.round(+bonusAmount),
      'Total F&F Amount':0,
      'Signature':''

    }

      const weekoffHoliday = weekoffHolidayMap.get(userMasterID);
      const WHPHPriority =
        user.employeeAttendancePolicies?.[0]?.attendancePolicy?.WHPHPriority;

      const priority =
        WHPHPriority == 'PH'
          ? offDayCategoryEnum.HOLIDAY
          : offDayCategoryEnum.WEEKOFF;

      const allShiftData = [];

      const shiftIds = user.employeeShifts?.[0]?.shiftsID || [];

      shiftIds.forEach((e) => {
        const shift = shiftMasterMap.get(+e);
        if (shift) {
          allShiftData.push(shift);
        }
      });

      const shiftData = allShiftData[0];
      const salaryPolicy =
        user.employeeSalaryPolicies?.[0]?.salaryPolicy || null;
      const monthDays =
        attnCalData.find((e) => e.AttnYearMon == FNFMonth)?.MonDays || null;
      const weekoffPolicy = user.employeeWeekOffs?.[0]?.weekoff || null;

      const { leaveEncashAmount, leaveWiseEncashmentMap: leaveMap } =
        calculateLeaveEncashemnt_FNF(
          salaryStructureData,
          weekoffHoliday,
          priority,
          leaveWiseEncashmentMap,
          shiftData,
          salaryPolicy,
          monthDays,
          weekoffPolicy,
          joining,
        );

      const paidLeaveText = Array.from(leaveMap.values())
        .map((e) => `${e.leaveName}:${e.value}`)
        .join('\n');

      const perDayRateText = Array.from(leaveMap.values())
        .map((e) => `${e.leaveName}:${e.perDayAmount}`)
        .join('\n');

  obj['Leave Balance Paid'] = paidLeaveText;
  obj['Rate Per Day']= perDayRateText;
  obj['Leave Encash Amount'] = Math.round(+leaveEncashAmount);

      obj['Total F&F Amount'] =
        obj['Bonus Amount'] + obj['Leave Encash Amount'];

      fnfData.push(obj); // Add to array
    }

    // Handle export types
    if (exportType === 'pdf') {
      const base64Data = await generateFNFRegisterPDF(res, fnfData, FNFMonth);
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        data: base64Data,
      });
    } else if (exportType === 'excel') {
      return await generateFNFRegisterExcel(res, fnfData, FNFMonth);
    } else {
      // Return JSON response for pagination
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        data: fnfData,
        totalCount: count,
      });
    }
  } catch (error) {
    next(error);
  }
};

// Helper function to generate PDF for FNF Register
async function generateFNFRegisterPDF(res, fnfData, FNFMonth) {
  try {
    const puppeteer = require('puppeteer');
    const Handlebars = require('handlebars');
    const path = require('path');
    const fs = require('fs');

    // Calculate totals including leave-wise aggregation
    const leaveWiseTotals = new Map(); // Map to store leave-wise totals
    const rateWiseTotals = new Map(); // Map to store rate-wise totals

    const totals = fnfData.reduce(
      (acc, row) => {
        acc.totalWorkingDays += +row['Total Working Days'] || 0;
        acc.totalLeaveBalanceAdded += +row['Leave Balance Added'] || 0;
        acc.totalLeaveTaken += +row['No. Of Leave Taken'] || 0;
        acc.totalLeaveEncashAmount += +row['Leave Encash Amount'] || 0;
        acc.totalBonusAmount += +row['Bonus Amount'] || 0;
        acc.totalFNFAmount += +row['Total F&F Amount'] || 0;

        // Parse and aggregate "Balanced Leave Paid" (format: "Casual Leave:5\nSick Leave:3")
        const balancedLeavePaid = row['Leave Balance Paid'] || '';
        if (balancedLeavePaid) {
          const leavePairs = balancedLeavePaid.split('\n').map((s) => s.trim());
          leavePairs.forEach((pair) => {
            const [leaveName, days] = pair.split(':').map((s) => s.trim());
            if (leaveName && days) {
              const currentTotal = leaveWiseTotals.get(leaveName) || 0;
              leaveWiseTotals.set(leaveName, currentTotal + parseFloat(days));
            }
          });
        }

        // Parse and aggregate "Rate Per Day" (format: "Casual Leave:500\nSick Leave:400")
        const ratePerDay = row['Rate Per Day'] || '';
        if (ratePerDay) {
          const ratePairs = ratePerDay.split('\n').map((s) => s.trim());
          ratePairs.forEach((pair) => {
            const [leaveName, rate] = pair.split(':').map((s) => s.trim());
            if (leaveName && rate) {
              const currentTotal = rateWiseTotals.get(leaveName) || 0;
              rateWiseTotals.set(leaveName, currentTotal + parseFloat(rate));
            }
          });
        }

        return acc;
      },
      {
        totalWorkingDays: 0,
        totalLeaveBalanceAdded: 0,
        totalLeaveTaken: 0,
        totalLeaveEncashAmount: 0,
        totalBonusAmount: 0,
        totalFNFAmount: 0,
      },
    );

    // Format leave-wise totals as string (e.g., "Casual Leave:15\nSick Leave:8")
    const balancedLeavePaidTotal = Array.from(leaveWiseTotals.entries())
      .map(([leaveName, days]) => `${leaveName}:${days}`)
      .join('\n');

    // Format rate-wise totals as string (e.g., "Casual Leave:7500\nSick Leave:3200")
    const ratePerDayTotal = Array.from(rateWiseTotals.entries())
      .map(([leaveName, rate]) => `${leaveName}:${Math.round(rate)}`)
      .join('\n');

    totals.balancedLeavePaidTotal = balancedLeavePaidTotal;
    totals.ratePerDayTotal = ratePerDayTotal;

    // Read HTML template from file
    const templatePath = path.join(__dirname, '../html/fnf-register.html');
    const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

    // Register Handlebars helper for addition
    Handlebars.registerHelper('add', function (a, b) {
      return a + b;
    });

    const template = Handlebars.compile(htmlTemplate);
    const html = template({
      data: fnfData,
      month: moment(FNFMonth, 'YYYYMM').format('MMMM YYYY'),
      totals,
    });

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A3',
      landscape: true,
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
    });

    await browser.close();

    const base64path = Buffer.from(pdfBuffer).toString('base64');
    return base64path;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

// Helper function to generate Excel for FNF Register
async function generateFNFRegisterExcel(res, fnfData, FNFMonth) {
  try {
    const ExcelJS = require('exceljs');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('FNF Register');

    // Define columns
    worksheet.columns = [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'Employee Code', key: 'employeeCode', width: 15 },
      { header: 'Employee Name', key: 'employeeName', width: 25 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Skill Set', key: 'skillSet', width: 15 },
      { header: 'Date Of Joining', key: 'dateOfJoining', width: 15 },
      { header: 'Date Of Leaving', key: 'dateOfLeaving', width: 15 },
      { header: 'Total Working Days', key: 'totalWorkingDays', width: 18 },
      { header: 'Leave Balance Added', key: 'leaveBalanceAdded', width: 20 },
      { header: 'No. Of Leave Taken', key: 'leaveTaken', width: 18 },
      { header: 'Leave Balance Paid', key: 'balancedLeavePaid', width: 30 },
      { header: 'Rate Per Day', key: 'ratePerDay', width: 30 },
      { header: 'Leave Encash Amount', key: 'leaveEncashAmount', width: 20 },
      { header: 'Bonus Amount', key: 'bonusAmount', width: 15 },
      { header: 'Total F&F Amount', key: 'totalFNFAmount', width: 18 },
      { header: 'Signature', key: 'signature', width: 15 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF87CEEB' }, // Light blue color
    };
    worksheet.getRow(1).alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };

    // Freeze header row and first 3 columns (S.No, Employee Code, Employee Name)
    worksheet.views = [{ state: 'frozen', xSplit: 3, ySplit: 1 }];

    // Calculate totals including leave-wise aggregation
    const leaveWiseTotals = new Map();
    const rateWiseTotals = new Map();

    let totalWorkingDays = 0;
    let totalLeaveBalanceAdded = 0;
    let totalLeaveTaken = 0;
    let totalLeaveEncashAmount = 0;
    let totalBonusAmount = 0;
    let totalFNFAmount = 0;

    // Add data rows
    fnfData.forEach((row, index) => {
      const excelRow = worksheet.addRow({
        sno: index + 1,
        employeeCode: row['Employee Code'],
        employeeName: row['Employee Name'],
        gender: row['Gender'],
        designation: row['Desigantion'],
        skillSet: row['Skill Set'],
        dateOfJoining: row['Date Of Joining'],
        dateOfLeaving: row['Date Of Leaving'],
        totalWorkingDays: +row['Total Working Days'] || 0,
        leaveBalanceAdded: +row['Leave Balance Added'] || 0,
        leaveTaken: +row['No. Of Leave Taken'] || 0,
        balancedLeavePaid: row['Leave Balance Paid'],
        ratePerDay: row['Rate Per Day'],
        leaveEncashAmount: +row['Leave Encash Amount'] || 0,
        bonusAmount: +row['Bonus Amount'] || 0,
        totalFNFAmount: +row['Total F&F Amount'] || 0,
        signature: row['Signature'],
      });

      // Accumulate totals
      totalWorkingDays += +row['Total Working Days'] || 0;
      totalLeaveBalanceAdded += +row['Leave Balance Added'] || 0;
      totalLeaveTaken += +row['No. Of Leave Taken'] || 0;
      totalLeaveEncashAmount += +row['Leave Encash Amount'] || 0;
      totalBonusAmount += +row['Bonus Amount'] || 0;
      totalFNFAmount += +row['Total F&F Amount'] || 0;

      // Parse and aggregate "Balanced Leave Paid"
      const balancedLeavePaid = row['Leave Balance Paid'] || '';
      if (balancedLeavePaid) {
        const leavePairs = balancedLeavePaid.split('\n').map((s) => s.trim());
        leavePairs.forEach((pair) => {
          const [leaveName, days] = pair.split(':').map((s) => s.trim());
          if (leaveName && days) {
            const currentTotal = leaveWiseTotals.get(leaveName) || 0;
            leaveWiseTotals.set(leaveName, currentTotal + parseFloat(days));
          }
        });
      }

      // Parse and aggregate "Rate Per Day"
      const ratePerDay = row['Rate Per Day'] || '';
      if (ratePerDay) {
        const ratePairs = ratePerDay.split('\n').map((s) => s.trim());
        ratePairs.forEach((pair) => {
          const [leaveName, rate] = pair.split(':').map((s) => s.trim());
          if (leaveName && rate) {
            const currentTotal = rateWiseTotals.get(leaveName) || 0;
            rateWiseTotals.set(leaveName, currentTotal + parseFloat(rate));
          }
        });
      }

      // Align numeric columns to right
      excelRow.getCell('totalWorkingDays').alignment = { horizontal: 'right' };
      excelRow.getCell('leaveBalanceAdded').alignment = { horizontal: 'right' };
      excelRow.getCell('leaveTaken').alignment = { horizontal: 'right' };
      excelRow.getCell('leaveEncashAmount').alignment = { horizontal: 'right' };
      excelRow.getCell('bonusAmount').alignment = { horizontal: 'right' };
      excelRow.getCell('totalFNFAmount').alignment = { horizontal: 'right' };

      // Enable text wrapping for leave detail columns
      excelRow.getCell('balancedLeavePaid').alignment = {
        wrapText: true,
        vertical: 'top',
      };
      excelRow.getCell('ratePerDay').alignment = {
        wrapText: true,
        vertical: 'top',
      };
    });

    // Format leave-wise totals as string
    const balancedLeavePaidTotal = Array.from(leaveWiseTotals.entries())
      .map(([leaveName, days]) => `${leaveName}:${days}`)
      .join('\n');

    // Format rate-wise totals as string
    const ratePerDayTotal = Array.from(rateWiseTotals.entries())
      .map(([leaveName, rate]) => `${leaveName}:${Math.round(rate)}`)
      .join('\n');

    // Add total row
    const totalRow = worksheet.addRow({
      sno: '',
      employeeCode: '',
      employeeName: '',
      gender: '',
      designation: '',
      skillSet: '',
      dateOfJoining: '',
      dateOfLeaving: 'TOTAL:',
      totalWorkingDays: totalWorkingDays,
      leaveBalanceAdded: totalLeaveBalanceAdded,
      leaveTaken: totalLeaveTaken,
      balancedLeavePaid: balancedLeavePaidTotal,
      ratePerDay: '',
      leaveEncashAmount: totalLeaveEncashAmount,
      bonusAmount: totalBonusAmount,
      totalFNFAmount: totalFNFAmount,
      signature: '',
    });

    // Style total row
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    totalRow.getCell('dateOfLeaving').alignment = { horizontal: 'right' };
    totalRow.getCell('totalWorkingDays').alignment = { horizontal: 'right' };
    totalRow.getCell('leaveBalanceAdded').alignment = { horizontal: 'right' };
    totalRow.getCell('leaveTaken').alignment = { horizontal: 'right' };
    totalRow.getCell('leaveEncashAmount').alignment = { horizontal: 'right' };
    totalRow.getCell('bonusAmount').alignment = { horizontal: 'right' };
    totalRow.getCell('totalFNFAmount').alignment = { horizontal: 'right' };

    // Enable text wrapping for balanced leave paid column in total row
    totalRow.getCell('balancedLeavePaid').alignment = {
      wrapText: true,
      vertical: 'top',
    };

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Set response headers for streaming Excel
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=FNF_Register_${FNFMonth}.xlsx`,
    );

    // Stream the workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel:', error);
    throw error;
  }
}

exports.incentiveList = async(req,res,next)=>{
  try {

    const {userMasterID} = req.body;

    if(!userMasterID) return res.status(statusCodes.OK).json({
      status:statusCodes.BAD_REQUEST,
      message:usermessage.requiredMessage('userMasterID')
    });

    const data = await Employeeincentive.findAll({
      where:{
        userMasterID,
        status:1
      },
      include:[{
        model:Incentivetype,
        as: 'IncType',
        where:{
          showinsalaryslip:'false'
        },
        attributes:['incentivetypename','inc_type_displayName']
      }],
      attributes:['employeeincentiveID','payInFNF','amount','yearmonth','IncentivetypeID','payModeInFNF'],
      order:[['yearmonth','DESC']]
    }); 

    return res.status(statusCodes.OK).json({
      status:statusCodes.OK,
      data
    });
    
  } catch (error) {
    next(error);
  }
}

exports.payIncentive = async(req,res,next)=>{
  try {

    const {employeeincentiveID,payModeInFNF,fnfMonth,fnfDate} = req.body;

    if(!employeeincentiveID || !fnfMonth || !fnfDate) return res.status(statusCodes.OK).json({
      status:statusCodes.BAD_REQUEST,
      message:usermessage.requiredMessage('employeeincentiveID, fnfMonth and fnfDate')
    });

    if(!Object.values(incentivePayModeEnum).includes(payModeInFNF)){
return res.status(statusCodes.OK).json({
      status:statusCodes.BAD_REQUEST,
      message: `Invalid payment mode. Allowed payment modes are: ${Object.values(incentivePayModeEnum).join(', ')}.`
    });
    }

   await Employeeincentive.update(
      {
payInFNF:true,
payModeInFNF:payModeInFNF,
yearmonth:fnfMonth,
incentiveDate:fnfDate
      },
      {
      where:{
       employeeincentiveID
      },
    
    });

    return res.status(statusCodes.OK).json({
      status:statusCodes.OK,
      message:'Incentive updated successfully.'
    });
    
  } catch (error) {
    next(error);
  }
}

exports.depositList = async(req,res,next)=>{
  try {

    const {userMasterID} = req.body;

    if(!userMasterID) return res.status(statusCodes.OK).json({
      status:statusCodes.BAD_REQUEST,
      message:usermessage.requiredMessage('userMasterID')
    });

    const data = await deposit.findAll({
      where:{
        userMasterID,
        status:1
      },
      include:[{
        model:depositcategory,
        attributes:['depositcategoryname']
      }],
      attributes:['amount','depositReceiveAs','salaryMonth','payModeInFNF','payInFNF','dateOfDeposit','depositId'],
      order:[['depositId','DESC']]
    });

    return res.status(statusCodes.OK).json({
      status:statusCodes.OK,
      data
    });
    
  } catch (error) {
    next(error);
  }
}

exports.payDeposit = async(req,res,next)=>{
  try {

    const {depositId,payModeInFNF,fnfMonth} = req.body;

    if(!depositId || !fnfMonth) return res.status(statusCodes.OK).json({
      status:statusCodes.BAD_REQUEST,
      message:usermessage.requiredMessage('depositId and fnfMonth')
    });

    if(!Object.values(depositPayModeEnum).includes(payModeInFNF)){
return res.status(statusCodes.OK).json({
      status:statusCodes.BAD_REQUEST,
      message: `Invalid payment mode. Allowed payment modes are: ${Object.values(depositPayModeEnum).join(', ')}.`
    });
    }

   await deposit.update(
      {
payInFNF:true,
payModeInFNF:payModeInFNF,
salaryMonthToPay:fnfMonth
      },
      {
      where:{
       depositId
      },
    
    });

    return res.status(statusCodes.OK).json({
      status:statusCodes.OK,
      message:'Deposit updated successfully.'
    });
    
  } catch (error) {
    next(error);
  }
}
