const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const {
  PayrollFrequencyType,
  TaxApplicabilityType,
  payheadMasterIdsMapping,
  HrLeaveTypesIds,
  salaryFieldSrNoFields,
  SalaryStructureTypeEnum,
  ExpatHRAValue,
  ExpatMVAValue,
} = require('../utils/dbUtils');
const { statusCodes, userAttributes } = require('../utils/commonVars');
const { usermessage } = require('../response_message/message');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const HRSalaryTrasaction = require('../models/hrSalaryTransaction');
const HRSalaryMasterFields = require('../models/hrSalaryMaster');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const HRSalaryFields = require('../models/hrSalaryFields');
const Payheadmaster = require('../models/payhead');
const EmployeePenalty = require('../models/employeePenalty');
const Employeeincentive = require('../models/employeeincentive');
const Incentivetype = require('../models/incentivetype');
const BranchMaster = require('../models/branchMaster');
const Department = require('../models/department');
const Designation = require('../models/designation');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const BankMaster = require('../models/bankMaster');
const BankBranch = require('../models/bankBranch');
const userFamily = require('../models/userfamily');
const UserMaster = require('../models/userMaster');
const Penalty = require('../models/penalty');
const {
  daysInMonth,
  dateFormatYYYYMMDD,
  minutesToHoursMinutes,
  getRoundOffSalary,
  roundOffLeaveBalance,
  getDaysFromDates,
  pngExpat_HRA_MVA_Calculation,
} = require('../utils/commonUtilFunctions');
const companyMaster = require('../models/companyMaster');
const {
  generatePNGNationalSalaryRegister,
  generatePNGExpatSalaryRegister,
  generateExcel,
} = require('../utils/exportData');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const SalaryPolicy = require('../models/salaryPolicy');
const GradeStructure = require('../models/gradeStructure');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const moment = require('moment');

function normalizeAndOrder(employeeArray, orderedUniqueNames) {
  const map = new Map(employeeArray.map((e) => [e.payheadName, e]));

  return orderedUniqueNames.map(
    (name) =>
      map.get(name) || {
        payheadName: name,
        EmployeeSalaryAmount: '',
      },
  );
}

async function processNationalSalaryData(
  allUserData = [],
  attnCalData = [],
  companyData,
  res,
) {
  const finalData = [];
  const companyName = companyData?.companyName || '';

  const UniqueTaxablePayhead = new Set();
  const UniqueIncentive = new Set();
  const UniqueCalculatedData = new Set();
  const UniqueNonTaxableData = new Set();
  const UniqueNcslData = new Set();
  const UniquedeductionData = new Set();
  const UniquepenaltyData = new Set();
  const UniqueEmployerContriData = new Set();

  const ncslIds = new Set([
    payheadMasterIdsMapping.NCSL_KIDS_SAVING,
    payheadMasterIdsMapping.NCSL_LOAN,
    payheadMasterIdsMapping.NCSL_GENERAL_SAVINGS,
    payheadMasterIdsMapping.NCSL_PORO,
    payheadMasterIdsMapping.NCSL_XMAS,
  ]);
  const avoidIds = new Set([
    payheadMasterIdsMapping.GROSS,
    payheadMasterIdsMapping.PENALTY,
    payheadMasterIdsMapping.CTC,
    payheadMasterIdsMapping.INCENTIVE,
    payheadMasterIdsMapping.NETSALARY,
  ]);

  for (const [index, user] of allUserData.entries()) {
    const joining = user.employeeJoiningDetails?.[0] || {};
    const salaryData = user.hrSalaryTrasactions || [];
    const divisionName =
      user.employeeDivisions?.[0]?.division?.divisionName ?? '';
    const workingAreaName =
      user.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName ?? '';
    const dependant = (user.userFamilies || []).length;

    const rateHourly =
      salaryData.find(
        (e) =>
          e?.HSM?.GSS?.HSF?.payheadMasterId ==
          payheadMasterIdsMapping.NORMAL_PAY,
      )?.HSM?.EmployeeSalaryAmount ?? 0;

    const object = {
      'Sr No': index + 1,
      'Employee Code': joining?.employeeCode ?? '',
      'Employee Name': user.displayName,
      Number: user.userNumber,
      'Date Of Joining': dateFormatYYYYMMDD(joining?.joiningDate),
      Company: companyName,
      Branch: salaryData[0]?.BranchMaster?.branchName ?? '',
      Department: salaryData[0]?.department?.departmentName ?? '',
      Designation: salaryData[0]?.designation?.designationName ?? '',
      Division: divisionName,
      WorkingArea: workingAreaName,
      'Nasfund No': joining?.pfNumber,
      'NCSL No': joining?.esicNumber,
      'Bank Name':
        joining?.bankAccountStatus == 1 ? joining?.bankMaster?.bankName : '',
      'Bank Account No':
        joining?.bankAccountStatus == 1 ? joining?.bankAccountNo : '',
      'Bank Branch':
        joining?.bankAccountStatus == 1
          ? joining?.bankBranch?.bankBranchName
          : '',
      'BSB No': joining?.bankAccountStatus == 1 ? joining?.bankIFSC : '',
      'No of Dependant': dependant,
      attnCalData: [],
      'Hourly Rate': rateHourly,
      taxableData: [],
      incentiveData: [],
      calculatedData: [],
      Gross: 0,
      'Total Gross Pay': 0,
      nonTaxableData: [],
      'Grand Total Gross': 0,
      ncslData: [],
      'NCSL (Total)': 0,
      deductionData: [],
      penaltyData: [],
      Deductions: 0,
      'Net Pay': 0,
      employerContriData: [],
    };

    // Attendance
    const userAttnCalData = attnCalData.filter(
      (e) => e.userMasterID == user.userMasterID,
    );

    const normalPayHrs =
      userAttnCalData.find(
        (e) => e.hrLeaveType?.LeaveID == HrLeaveTypesIds.WORKING_HRS,
      )?.AttnVal || 0;
    const OTHrs =
      userAttnCalData.find(
        (e) => e.hrLeaveType?.LeaveID == HrLeaveTypesIds.OT_HRS,
      )?.AttnVal || 0;
    const OT2Hrs =
      userAttnCalData.find(
        (e) => e.hrLeaveType?.LeaveID == HrLeaveTypesIds.PH_HRS,
      )?.AttnVal || 0;
    const totalHrs = +normalPayHrs + +OTHrs + +OT2Hrs;

    object.attnCalData.push(
      {
        payheadName: 'Normal Hrs',
        EmployeeSalaryAmount: minutesToHoursMinutes(normalPayHrs),
      },
      {
        payheadName: 'OT 1.5',
        EmployeeSalaryAmount: minutesToHoursMinutes(OTHrs),
      },
      {
        payheadName: 'PH Hrs',
        EmployeeSalaryAmount: minutesToHoursMinutes(OT2Hrs),
      },
      {
        payheadName: 'Total',
        EmployeeSalaryAmount: minutesToHoursMinutes(totalHrs),
      },
    );

    // Salary Data Processing
    salaryData
      .sort((a, b) => {
        const indexA = a.HSM?.GSS?.salaryfieldindex ?? Infinity;
        const indexB = b.HSM?.GSS?.salaryfieldindex ?? Infinity;

        if (indexA !== indexB) return indexA - indexB;

        const nameA = a.HSM?.GSS?.HSF?.payheadDisplayName?.toLowerCase() || '';
        const nameB = b.HSM?.GSS?.HSF?.payheadDisplayName?.toLowerCase() || '';

        if (nameA !== nameB) return nameA.localeCompare(nameB);

        const phA = a.HSM?.GSS?.HSF?.PHM?.payheadName?.toLowerCase() || '';
        const phB = b.HSM?.GSS?.HSF?.PHM?.payheadName?.toLowerCase() || '';
        return phA.localeCompare(phB);
      })
      .forEach((obj) => {
        const HSF = obj.HSM?.GSS?.HSF || {};
        const PHM = HSF?.PHM || {};

        const taxApplicability = PHM.taxApplicability;
        const salaryFieldSrNo = HSF.salaryFieldSrNo;
        const payheadMasterId = HSF.payheadMasterId;
        const payheadName = HSF.payheadDisplayName
          ? String(HSF.payheadDisplayName).trim()
          : PHM.payheadName || '';
        const amount = +obj.EmployeeSalaryAmount || 0;

        if (payheadMasterId == payheadMasterIdsMapping.GROSS)
          object['Grand Total Gross'] = amount;
        if (payheadMasterId == payheadMasterIdsMapping.NETSALARY)
          object['Net Pay'] = amount;

        if (!avoidIds.has(payheadMasterId) && amount > 0) {
          const finalObject = {
            payheadName,
            EmployeeSalaryAmount: amount,
          };

          if (salaryFieldSrNo === salaryFieldSrNoFields.EARNING) {
            if (taxApplicability === TaxApplicabilityType.TAXABLE) {
              if (
                [
                  payheadMasterIdsMapping.NORMAL_PAY,
                  payheadMasterIdsMapping.OT_PAY,
                  payheadMasterIdsMapping.PAID_HOLIDAY_PAY,
                ].includes(payheadMasterId)
              ) {
                payheadMasterId == payheadMasterIdsMapping.NORMAL_PAY
                  ? object.calculatedData.splice(0, 0, finalObject)
                  : payheadMasterId == payheadMasterIdsMapping.OT_PAY
                    ? object.calculatedData.splice(1, 0, finalObject)
                    : object.calculatedData.splice(2, 0, finalObject);
                UniqueCalculatedData.add(payheadName);
              } else {
                object.taxableData.push(finalObject);
                UniqueTaxablePayhead.add(payheadName);
              }
            } else {
              object.nonTaxableData.push(finalObject);
              UniqueNonTaxableData.add(payheadName);
            }
          }

          if (salaryFieldSrNo === salaryFieldSrNoFields.EMPLOYEE_DEDUCTION) {
            if (ncslIds.has(payheadMasterId)) {
              object.ncslData.push(finalObject);
              UniqueNcslData.add(payheadName);
            } else {
              object.deductionData.push(finalObject);
              UniquedeductionData.add(payheadName);
            }
          }

          if (salaryFieldSrNo === salaryFieldSrNoFields.EMPLOYER_DEDUCTION) {
            object.employerContriData.push(finalObject);
            UniqueEmployerContriData.add(payheadName);
          }
        }

        // Incentives
        obj.employeeincentives?.forEach((incentive) => {
          if (+incentive.amount > 0) {
            const incentiveType =
              incentive.IncType?.dataValues?.displayName ||
              incentive.IncType?.dataValues?.name;

            UniqueIncentive.add(incentiveType);

            const existing = object.incentiveData.find(
              (e) => e.IncentivetypeID == incentive.IncentivetypeID,
            );

            if (existing) {
              existing.EmployeeSalaryAmount += +incentive.amount;
            } else {
              object.incentiveData.push({
                payheadName: incentiveType,
                EmployeeSalaryAmount: +incentive.amount,
                IncentivetypeID: incentive.IncentivetypeID,
              });
            }
          }
        });

        // Penalties
        obj.employeePenalties?.forEach((penalty) => {
          if (+penalty.penaltyAmount) {
            if (penalty?.penalty?.penaltyName)
              UniquepenaltyData.add(penalty.penalty.penaltyName);

            const existing = object.penaltyData.find(
              (e) => e.penaltyID === penalty.penaltyID,
            );

            if (existing) {
              existing.EmployeeSalaryAmount += +penalty.penaltyAmount;
            } else {
              object.penaltyData.push({
                payheadName: penalty.penalty?.penaltyName,
                penaltyID: penalty.penaltyID,
                EmployeeSalaryAmount: +penalty.penaltyAmount,
              });
            }
          }
        });
      });

    // Totals
    object.Gross = object.calculatedData.reduce(
      (a, b) => a + b.EmployeeSalaryAmount,
      0,
    );

    object['Total Gross Pay'] =
      [...object.taxableData, ...object.incentiveData].reduce(
        (a, b) => a + b.EmployeeSalaryAmount,
        0,
      ) + object.Gross;

    object['NCSL (Total)'] = object.ncslData.reduce(
      (a, b) => a + b.EmployeeSalaryAmount,
      0,
    );

    object['Deductions'] =
      [...object.deductionData, ...object.penaltyData].reduce(
        (a, b) => a + b.EmployeeSalaryAmount,
        0,
      ) + object['NCSL (Total)'];

    finalData.push(object);
  }

  const allTaxable = Array.from(UniqueTaxablePayhead);
  const allIncentive = Array.from(UniqueIncentive);
  const allCalculated = Array.from(UniqueCalculatedData);
  const allNonTaxable = Array.from(UniqueNonTaxableData);
  const allNcsl = Array.from(UniqueNcslData);
  const allDeduction = Array.from(UniquedeductionData);
  const allPenalty = Array.from(UniquepenaltyData);
  const allEmployerContri = Array.from(UniqueEmployerContriData);

  for (const emp of finalData) {
    emp.taxableData = normalizeAndOrder(emp.taxableData, allTaxable);
    emp.incentiveData = normalizeAndOrder(emp.incentiveData, allIncentive);
    emp.calculatedData = normalizeAndOrder(emp.calculatedData, allCalculated);
    emp.nonTaxableData = normalizeAndOrder(emp.nonTaxableData, allNonTaxable);
    emp.ncslData = normalizeAndOrder(emp.ncslData, allNcsl);
    emp.deductionData = normalizeAndOrder(emp.deductionData, allDeduction);
    emp.penaltyData = normalizeAndOrder(emp.penaltyData, allPenalty);
    emp.employerContriData = normalizeAndOrder(
      emp.employerContriData,
      allEmployerContri,
    );
  }

  return await generatePNGNationalSalaryRegister(
    finalData,
    'National Salary Register',
    'xlsx',
    res,
  );
}

async function processMonthlySalaryData(
  allUserData = [],
  attnCalData = [],
  companyData = null,
  previousCalculatedSalary = [],
  YYYYMM,
  res,
) {
  const finalData = [];
  const companyName = companyData?.companyName || '';

  const uniqueLeavetypes = new Set();
  const UniqueActualTaxablePayhead = new Set();
  const UniqueActualNonTaxablePayhead = new Set();
  const UniqueTaxablePayhead = new Set();
  const UniqueIncentive = new Set();
  const UniqueNonTaxableData = new Set();
  const UniquedeductionData = new Set();
  const UniquepenaltyData = new Set();
  const UniqueTaxAndFrienge = new Set();

  const avoidIds = new Set([
    payheadMasterIdsMapping.GROSS,
    payheadMasterIdsMapping.PENALTY,
    payheadMasterIdsMapping.CTC,
    payheadMasterIdsMapping.INCENTIVE,
    payheadMasterIdsMapping.NETSALARY,
  ]);
  const excludeLeaveIds = new Set([
    HrLeaveTypesIds.PRESENT,
    HrLeaveTypesIds.ABSENT,
    HrLeaveTypesIds.WEEKOFF,
    HrLeaveTypesIds.HOLIDAY,
    HrLeaveTypesIds.ATTENDANCE_PENALTY,
    HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH,
    HrLeaveTypesIds.LEAVE_BEHALF_ON_SANDWICH,
    HrLeaveTypesIds.ACTUAL_WEEKOFF,
    HrLeaveTypesIds.ACTUAL_HOLIDAY,
    HrLeaveTypesIds.ATTENDANCE_BONUS,
    HrLeaveTypesIds.WORKING_HRS,
    HrLeaveTypesIds.OT_HRS,
    HrLeaveTypesIds.PH_HRS,
  ]);

  for (const [index, user] of allUserData.entries()) {
    const joining = user.employeeJoiningDetails?.[0] || {};
    const salaryData = user.hrSalaryTrasactions || [];
    const divisionName =
      user.employeeDivisions?.[0]?.division?.divisionName ?? '';
    const workingAreaName =
      user.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName ?? '';
    const dependant = (user.userFamilies || []).length;
    const contractualHrs =
      user.employeeSalaryPolicies?.[0]?.salaryPolicy?.monthlyFixhours || 0;

    // Attendance
    const userAttnCalData = attnCalData.filter(
      (e) => e.userMasterID == user.userMasterID,
    );

    const normalPay =
      salaryData.find(
        (e) =>
          e?.HSM?.GSS?.HSF?.payheadMasterId ==
          payheadMasterIdsMapping.NORMAL_PAY,
      ) || null;
    const StructureType =
      normalPay?.HSM?.GSS?.gradeStructure?.baseOnCalculation || null;

    const amount = normalPay?.HSM?.EmployeeSalaryAmount ?? 0;

    const rateHourly =
      StructureType == SalaryStructureTypeEnum.MONTHLY
        ? roundOffLeaveBalance(+amount / +contractualHrs)
        : StructureType == SalaryStructureTypeEnum.DAILY
          ? roundOffLeaveBalance(+amount / 8)
          : amount;

    const startDate = userAttnCalData?.[0]?.startDate || null;
    const endDate = userAttnCalData?.[0]?.endDate || null;

    const monthDays = getDaysFromDates(startDate, endDate);

    const perDay =
      StructureType == SalaryStructureTypeEnum.MONTHLY
        ? startDate && endDate
          ? roundOffLeaveBalance(+amount / +monthDays)
          : ''
        : StructureType == SalaryStructureTypeEnum.DAILY
          ? amount
          : roundOffLeaveBalance(amount * 8);

    const object = {
      'Sr No': index + 1,
      'Employee Code': joining?.employeeCode ?? '',
      'Employee Name': user.displayName,
      Number: user.userNumber,
      'Date Of Joining': dateFormatYYYYMMDD(joining?.joiningDate),
      Company: companyName,
      Branch: salaryData[0]?.BranchMaster?.branchName ?? '',
      Department: salaryData[0]?.department?.departmentName ?? '',
      Designation: salaryData[0]?.designation?.designationName ?? '',
      Division: divisionName,
      WorkingArea: workingAreaName,
      Nationality: joining?.nationality ?? '',
      'Bank Name':
        joining?.bankAccountStatus == 1 ? joining?.bankMaster?.bankName : '',
      'Bank Account No':
        joining?.bankAccountStatus == 1 ? joining?.bankAccountNo : '',
      'Bank Branch':
        joining?.bankAccountStatus == 1
          ? joining?.bankBranch?.bankBranchName
          : '',
      'BSB No': joining?.bankAccountStatus == 1 ? joining?.bankIFSC : '',
      'No of Dependant': dependant,
      'Contractual Currency': '',
      'Contractual Hrs': contractualHrs,
      'Month Hrs': '',
      'Rate Per Hour': rateHourly,
      'Rate Per Day': perDay,
      attnCalData: [],
      taxableActualData: [],
      'Total Fixed': 0,
      nonTaxableActualData: [],
      taxableData: [],
      incentiveData: [],
      'Taxable Income': 0,
      nonTaxableData: [],
      'Net Salary': 0,
      taxAndFrienge: [],
      'Gross Salary': 0,
      deductionData: [],
      penaltyData: [],
      Net: 0,
      'Net Amount AS On Previous': 0,
      'Tax Amount AS On Previous': 0,
    };

    // attn cal data

    for (const attnCal of userAttnCalData) {
      const leaveId = attnCal.hrLeaveType?.LeaveID || null;
      const value = +attnCal.AttnVal || 0;
      const leaveName = attnCal.hrLeaveType?.LeaveMaster?.LeaveName || null;

      if (!excludeLeaveIds.has(leaveId) && value > 0 && leaveName) {
        uniqueLeavetypes.add(leaveName);

        object.attnCalData.push({
          payheadName: attnCal.hrLeaveType?.LeaveMaster?.LeaveName,
          EmployeeSalaryAmount: value,
        });
      }
    }

    const actualHrs =
      userAttnCalData.find(
        (e) => e.hrLeaveType?.LeaveID == HrLeaveTypesIds.WORKING_HRS,
      )?.AttnVal || 0;
    const OTHrs =
      userAttnCalData.find(
        (e) => e.hrLeaveType?.LeaveID == HrLeaveTypesIds.OT_HRS,
      )?.AttnVal || 0;
    const OT2Hrs =
      userAttnCalData.find(
        (e) => e.hrLeaveType?.LeaveID == HrLeaveTypesIds.PH_HRS,
      )?.AttnVal || 0;

    object.attnCalData.push(
      {
        payheadName: 'Actual Hrs',
        EmployeeSalaryAmount: minutesToHoursMinutes(actualHrs),
      },
      {
        payheadName: 'OT (in Hrs)',
        EmployeeSalaryAmount: minutesToHoursMinutes(OTHrs),
      },
      {
        payheadName: 'PH (in Hrs)',
        EmployeeSalaryAmount: minutesToHoursMinutes(OT2Hrs),
      },
    );
    uniqueLeavetypes.add('Actual Hrs');
    uniqueLeavetypes.add('OT (in Hrs)');
    uniqueLeavetypes.add('PH (in Hrs)');

    object['Month Hrs'] = minutesToHoursMinutes(actualHrs + OTHrs + OT2Hrs);

    // Salary Data Processing
    salaryData
      .sort((a, b) => {
        const indexA = a.HSM?.GSS?.salaryfieldindex ?? Infinity;
        const indexB = b.HSM?.GSS?.salaryfieldindex ?? Infinity;

        if (indexA !== indexB) return indexA - indexB;

        const nameA = a.HSM?.GSS?.HSF?.payheadDisplayName?.toLowerCase() || '';
        const nameB = b.HSM?.GSS?.HSF?.payheadDisplayName?.toLowerCase() || '';

        if (nameA !== nameB) return nameA.localeCompare(nameB);

        const phA = a.HSM?.GSS?.HSF?.PHM?.payheadName?.toLowerCase() || '';
        const phB = b.HSM?.GSS?.HSF?.PHM?.payheadName?.toLowerCase() || '';
        return phA.localeCompare(phB);
      })
      .forEach((obj) => {
        const HSF = obj.HSM?.GSS?.HSF || {};
        const PHM = HSF?.PHM || {};

        const taxApplicability = PHM.taxApplicability;
        const salaryFieldSrNo = HSF.salaryFieldSrNo;
        const payheadMasterId = HSF.payheadMasterId;
        const payheadName = HSF.payheadDisplayName
          ? String(HSF.payheadDisplayName).trim()
          : PHM.payheadName || '';
        const amount = +obj.EmployeeSalaryAmount || 0;

        if (payheadMasterId == payheadMasterIdsMapping.GROSS)
          object['Gross Salary'] = amount;
        if (payheadMasterId == payheadMasterIdsMapping.NETSALARY)
          object['Net'] = amount;

        if (!avoidIds.has(payheadMasterId) && amount > 0) {
          const finalObject = {
            payheadName,
            EmployeeSalaryAmount: amount,
          };

          if (salaryFieldSrNo === salaryFieldSrNoFields.EARNING) {
            const actualAmount = obj?.HSM?.EmployeeSalaryAmount || 0;
            const ActualPayheadName = `Actual_ ${payheadName}`;

            const actaulObject = {
              payheadName: ActualPayheadName,
              EmployeeSalaryAmount: actualAmount,
            };

            if (taxApplicability === TaxApplicabilityType.TAXABLE) {
              object.taxableData.push(finalObject);
              UniqueTaxablePayhead.add(payheadName);
              // actual
              object.taxableActualData.push(actaulObject);
              UniqueActualTaxablePayhead.add(ActualPayheadName);
            } else {
              object.nonTaxableData.push(finalObject);
              UniqueNonTaxableData.add(payheadName);
              // actual
              object.nonTaxableActualData.push(actaulObject);
              UniqueActualNonTaxablePayhead.add(ActualPayheadName);
            }
          }

          if (salaryFieldSrNo === salaryFieldSrNoFields.EMPLOYEE_DEDUCTION) {
            if (payheadMasterId == payheadMasterIdsMapping.SALARY_WAGES_TAX) {
              object.taxAndFrienge.push(finalObject);
              UniqueTaxAndFrienge.add(payheadName);
            } else {
              object.deductionData.push(finalObject);
              UniquedeductionData.add(payheadName);
            }
          }
        }

        // Incentives
        obj.employeeincentives?.forEach((incentive) => {
          if (+incentive.amount > 0) {
            const incentiveType =
              incentive.IncType?.dataValues?.displayName ||
              incentive.IncType?.dataValues?.name;

            UniqueIncentive.add(incentiveType);

            const existing = object.incentiveData.find(
              (e) => e.IncentivetypeID == incentive.IncentivetypeID,
            );

            if (existing) {
              existing.EmployeeSalaryAmount += +incentive.amount;
            } else {
              object.incentiveData.push({
                payheadName: incentiveType,
                EmployeeSalaryAmount: +incentive.amount,
                IncentivetypeID: incentive.IncentivetypeID,
              });
            }
          }
        });

        // Penalties
        obj.employeePenalties?.forEach((penalty) => {
          if (+penalty.penaltyAmount > 0) {
            if (penalty?.penalty?.penaltyName)
              UniquepenaltyData.add(penalty.penalty.penaltyName);

            const existing = object.penaltyData.find(
              (e) => e.penaltyID === penalty.penaltyID,
            );

            if (existing) {
              existing.EmployeeSalaryAmount += +penalty.penaltyAmount;
            } else {
              object.penaltyData.push({
                payheadName: penalty.penalty?.penaltyName,
                penaltyID: penalty.penaltyID,
                EmployeeSalaryAmount: +penalty.penaltyAmount,
              });
            }
          }
        });
      });

    // Totals
    object['Total Fixed'] = object.taxableActualData.reduce(
      (a, b) => a + b.EmployeeSalaryAmount,
      0,
    );

    object['Taxable Income'] = [
      ...object.taxableData,
      ...object.incentiveData,
    ].reduce((a, b) => a + b.EmployeeSalaryAmount, 0);

    object['Net Salary'] =
      object.nonTaxableData.reduce((a, b) => a + b.EmployeeSalaryAmount, 0) +
      object['Taxable Income'];

    // calclulate Fringe benefits
    const HRA_Applicable = joining?.png_HRA_Applicable;
    const MVA_Applicable = joining?.png_MVA_Applicable;
    const joiningDate = joining?.joiningDate || null;
    const leavingDate = joining?.leavingDate || null;

    const actualNormalPay = normalPay?.HSM?.EmployeeSalaryAmount || 0;

    if ((HRA_Applicable || MVA_Applicable) && joiningDate) {
      let HRA = 0;
      let MVA = 0;

      if (HRA_Applicable) HRA = ExpatHRAValue.LABEL1;
      if (MVA_Applicable) MVA = ExpatMVAValue.LABEL1;

      if (actualNormalPay > 10000) HRA = ExpatHRAValue.LABEL2;

      const { currentMonthHRA, currentMonthMVA } = pngExpat_HRA_MVA_Calculation(
        HRA,
        MVA,
        YYYYMM,
        joiningDate,
        leavingDate,
      );

      const totalFrienge = currentMonthHRA + currentMonthMVA;

      if (totalFrienge > 0) {
        const payheadName = 'Fringe Benefits';
        object.taxAndFrienge.push({
          payheadName,
          EmployeeSalaryAmount: roundOffLeaveBalance(+totalFrienge),
        });

        UniqueTaxAndFrienge.add(payheadName);
      }
    }

    // calculate previous salary data

    const userPreviosSalary = previousCalculatedSalary.filter(
      (e) => e.userMasterID == user.userMasterID,
    );

    const totalTaxableAmount =
      userPreviosSalary.reduce((acc, obj) => acc + +obj.totalTaxableAmount, 0) -
      userPreviosSalary.reduce(
        (acc, obj) => acc + +obj.salarySacrificeAmount,
        0,
      );

    object['Net Amount AS On Previous'] = totalTaxableAmount;

    const taxAmount = userPreviosSalary.reduce(
      (acc, obj) => acc + +obj.totalTaxAmount,
      0,
    );

    object['Tax Amount AS On Previous'] = roundOffLeaveBalance(taxAmount);

    finalData.push(object);
  }

  const allLeaveTypes = Array.from(uniqueLeavetypes);
  const allActualTaxable = Array.from(UniqueActualTaxablePayhead);
  const allActualNonTaxable = Array.from(UniqueActualNonTaxablePayhead);
  const allTaxable = Array.from(UniqueTaxablePayhead);
  const allIncentive = Array.from(UniqueIncentive);
  const allNonTaxable = Array.from(UniqueNonTaxableData);
  const allTaxAndFrienge = Array.from(UniqueTaxAndFrienge);
  const allDeduction = Array.from(UniquedeductionData);
  const allPenalty = Array.from(UniquepenaltyData);

  for (const emp of finalData) {
    emp.attnCalData = normalizeAndOrder(emp.attnCalData, allLeaveTypes);
    emp.taxableActualData = normalizeAndOrder(
      emp.taxableActualData,
      allActualTaxable,
    );
    emp.nonTaxableActualData = normalizeAndOrder(
      emp.nonTaxableActualData,
      allActualNonTaxable,
    );
    emp.taxableData = normalizeAndOrder(emp.taxableData, allTaxable);
    emp.incentiveData = normalizeAndOrder(emp.incentiveData, allIncentive);
    emp.nonTaxableData = normalizeAndOrder(emp.nonTaxableData, allNonTaxable);
    emp.taxAndFrienge = normalizeAndOrder(emp.taxAndFrienge, allTaxAndFrienge);
    emp.deductionData = normalizeAndOrder(emp.deductionData, allDeduction);
    emp.penaltyData = normalizeAndOrder(emp.penaltyData, allPenalty);
  }

  return await generatePNGExpatSalaryRegister(
    finalData,
    'Expat Salary Register',
    'xlsx',
    res,
  );
}

exports.salaryRegister = async (req, res, next) => {
  try {
    const {
      companyMasterId,
      branchMasterId,
      departmentId,
      payrollFrequency,
      YYYYMM,
      startDate,
      endDate,
      userMasterID,
    } = req.body;

    const isValidPayrollFrequency =
      Object.values(PayrollFrequencyType).includes(payrollFrequency);

    const isMonthlyInvalid =
      payrollFrequency === PayrollFrequencyType.MONTHLY && !YYYYMM;

    const isValidDate = (d) => !isNaN(new Date(d).getTime());

    const isWeeklyOrFortnightInvalid =
      [PayrollFrequencyType.WEEKLY, PayrollFrequencyType.FORTNIGHTLY].includes(
        payrollFrequency,
      ) &&
      (!isValidDate(startDate) || !isValidDate(endDate));

    if (
      !companyMasterId ||
      !payrollFrequency ||
      !isValidPayrollFrequency ||
      isMonthlyInvalid ||
      isWeeklyOrFortnightInvalid
    ) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.ValidParameters,
      });
    }

    const filterDate = YYYYMM
      ? String(YYYYMM).slice(0, 4) +
        '-' +
        String(YYYYMM).slice(4, 6) +
        '-' +
        daysInMonth(String(YYYYMM).slice(4, 6), String(YYYYMM).slice(0, 4))
      : endDate;

    const payrollCondition = { payrollFrequency };
    const attnCalCondition = { payrollFrequency };

    if (
      [PayrollFrequencyType.WEEKLY, PayrollFrequencyType.FORTNIGHTLY].includes(
        payrollFrequency,
      )
    ) {
      payrollCondition.startDate = startDate;
      payrollCondition.endDate = endDate;
      attnCalCondition.startDate = startDate;
      attnCalCondition.endDate = endDate;
    } else {
      attnCalCondition.AttnYearMon = YYYYMM;
      payrollCondition.salaryYYYYMM = YYYYMM;
    }

    if (branchMasterId) payrollCondition.branchId = branchMasterId;
    if (departmentId) payrollCondition.departmentId = departmentId;

    const includeModels = [
      {
        required: true,
        model: HRSalaryTrasaction,
        where: payrollCondition,
        attributes: [
          'salaryMasterID',
          'userMasterID',
          'salaryYYYYMM',
          'EmployeeSalaryAmount',
          'SalaryCalcOnDays',
          'branchId',
          'departmentId',
          'designationId',
        ],
        include: [
          {
            model: HRSalaryMasterFields,
            as: 'HSM',
            attributes: ['gradeSalaryStructureID', 'EmployeeSalaryAmount'],
            include: [
              {
                model: GradeSalaryStructure,
                as: 'GSS',
                attributes: [
                  'salaryFieldID',
                  'salaryfieldindex',
                  'gradeStructureID',
                ],
                include: [
                  {
                    model: GradeStructure,
                    attributes: ['baseOnCalculation'],
                  },
                  {
                    model: HRSalaryFields,
                    as: 'HSF',
                    attributes: [
                      'salaryFieldSrNo',
                      'salaryFieldSide',
                      'considerIn',
                      'payheadDisplayName',
                      'payheadMasterId',
                    ],
                    include: [
                      {
                        model: Payheadmaster,
                        as: 'PHM',
                        attributes: ['payheadName', 'taxApplicability'],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            required: false,
            model: EmployeePenalty,
            include: [
              { model: Penalty, as: 'penalty', attributes: ['penaltyName'] },
            ],
          },
          {
            required: false,
            model: Employeeincentive,
            include: [
              {
                model: Incentivetype,
                as: 'IncType',
                attributes: [
                  ['incentivetypename', 'name'],
                  ['inc_type_displayName', 'displayName'],
                  ['IncentivetypeID', 'id'],
                ],
              },
            ],
          },
          {
            model: BranchMaster,
            attributes: ['branchName'],
          },
          {
            model: Department,
            attributes: ['departmentName'],
          },
          {
            model: Designation,
            attributes: ['designationName'],
          },
        ],
      },
      {
        required: true,
        model: EmployeeJoiningDetails,
        where: {
          payrollFrequency,
        },
        attributes: [
          'employeeCode',
          'joiningDate',
          'pfNumber',
          'esicNumber',
          'bankMasterID',
          'bankBranchID',
          'bankAccountNo',
          'bankIFSC',
          'nationality',
          'leavingDate',
          'png_HRA_Applicable',
          'png_MVA_Applicable',
          'bankAccountStatus',
        ],
        include: [
          {
            model: BankMaster,
            attributes: ['bankName'],
          },
          {
            model: BankBranch,
            attributes: ['bankBranchName'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeDivision,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
        model: userFamily,
        where: {
          verifyStatus: 1,
          status: 1,
        },
        attributes: ['userFamilyID'],
      },
    ];

    // hourly salary policy

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      includeModels.push({
        model: EmployeeSalaryPolicy,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['salaryPolicyID'],
        include: [
          {
            model: SalaryPolicy,
            as: 'salaryPolicy',
            attributes: ['salaryPolicyName', 'monthlyFixhours'],
          },
        ],
      });
    }

    // usermaster id condition
    const condition = { companyMasterId };

    if (userMasterID && Array.isArray(userMasterID) && userMasterID.length)
      condition.userMasterID = {
        [Sequelize.Op.in]: userMasterID,
      };

    const userData = await UserMaster.findAll({
      where: condition,
      attributes: userAttributes,
      include: includeModels,
      order: [['displayName', 'ASC']],
    });

    const allUserIds = userData.map((e) => e.userMasterID);

    attnCalCondition.userMasterID = allUserIds;

    const promiseArray = [];

    promiseArray.push(
      HrLeaveMonthlyTrans.findAll({
        where: attnCalCondition,
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
      }),
      companyMaster.findOne({
        where: {
          companyMasterID: companyMasterId,
        },
      }),
    );

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      const startMonth = String(YYYYMM).slice(0, 4) + '01';

      // previous salary condition and attributes
      const previousSalaryCondition = {
        payrollFrequency,
        userMasterID: allUserIds,
        salaryYYYYMM: {
          [Sequelize.Op.gte]: startMonth,
          [Sequelize.Op.lt]: YYYYMM,
        },
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
                          WHEN "HSM->GSS->HSF->PHM"."payheadMasterId" = ${payheadMasterIdsMapping.SALARY_WAGES_TAX} 
                          THEN "hrSalaryTrasaction"."EmployeeSalaryAmount" 
                          ELSE 0 
                        END
                      )
                    `),
          'totalTaxAmount',
        ],
        [
          Sequelize.literal(`
                                     SUM(
                                CASE 
                                  WHEN "HSM->GSS->HSF->PHM"."taxApplicability" = '${TaxApplicabilityType.TAXABLE}' AND "HSM->GSS->HSF"."salaryFieldSrNo" = '${salaryFieldSrNoFields.EARNING}'
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
                                  WHEN "HSM->GSS->HSF->PHM"."payheadMasterId" = ${payheadMasterIdsMapping.SALARY_SACRIFICE}
                                  THEN "hrSalaryTrasaction"."EmployeeSalaryAmount" 
                                  ELSE 0 
                                END
                              )
                            `),
          'salarySacrificeAmount',
        ],
      ];

      promiseArray.push(
        HRSalaryTrasaction.findAll({
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
                          [Sequelize.Op.notIn]: [
                            payheadMasterIdsMapping.CTC,
                            payheadMasterIdsMapping.GROSS,
                            payheadMasterIdsMapping.NETSALARY,
                          ],
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
        }),
      );
    }

    const resultData = await Promise.all(promiseArray);

    const attnCalData = resultData[0] || [];
    const companyData = resultData[1];
    const previousCalculatedSalary = resultData[2] || [];

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      return await processMonthlySalaryData(
        userData,
        attnCalData,
        companyData,
        previousCalculatedSalary,
        YYYYMM,
        res,
      );
    } else {
      return await processNationalSalaryData(
        userData,
        attnCalData,
        companyData,
        res,
      );
    }
  } catch (error) {
    next(error);
  }
};

exports.yearlySalaryReport = async (req, res, next) => {
  try {
    const { companyMasterID, payrollFrequency, year, userMasterID } = req.body;

    const isValidPayrollFrequency =
      Object.values(PayrollFrequencyType).includes(payrollFrequency);

    if (
      !companyMasterID ||
      !isValidPayrollFrequency ||
      !year ||
      !userMasterID ||
      (userMasterID && !Array.isArray(userMasterID))
    ) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.ValidParameters,
      });
    }

    if (userMasterID && userMasterID.length == 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: usermessage.requiredMessage('User'),
      });
    }

    const condition = {
      companyMasterId: companyMasterID,
      userMasterID: {
        [Sequelize.Op.in]: userMasterID,
      },
    };

    const payrollCondition = { payrollFrequency };

    if (payrollFrequency == PayrollFrequencyType.MONTHLY) {
      const startMonth = year + '01';
      const endMonth = year + '12';

      payrollCondition.salaryYYYYMM = {
        [Sequelize.Op.between]: [startMonth, endMonth],
      };
    } else {
      const startDate = year + '-01-01';
      const endDate = year + '-12-31';

      payrollCondition.endDate = {
        [Sequelize.Op.between]: [startDate, endDate],
      };
    }

    const companyData = await companyMaster.findOne({
      where: {
        companyMasterID,
      },
    });

    if (!companyData) throw new Error('Company not found!');

    const includeModels = [
      {
        required: true,
        model: HRSalaryTrasaction,
        where: payrollCondition,
        attributes: [
          'salaryMasterID',
          'userMasterID',
          'salaryYYYYMM',
          'EmployeeSalaryAmount',
        ],
        include: [
          {
            model: HRSalaryMasterFields,
            as: 'HSM',
            attributes: ['gradeSalaryStructureID'],
            include: [
              {
                model: GradeSalaryStructure,
                as: 'GSS',
                attributes: ['salaryFieldID', 'salaryfieldindex'],
                include: [
                  {
                    model: HRSalaryFields,
                    as: 'HSF',
                    attributes: [
                      'salaryFieldSrNo',
                      'salaryFieldSide',
                      'payheadMasterId',
                    ],
                    include: [
                      {
                        model: Payheadmaster,
                        as: 'PHM',
                        attributes: ['payheadName', 'taxApplicability'],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        required: true,
        model: EmployeeJoiningDetails,
        where: {
          payrollFrequency,
        },
        attributes: ['employeeCode', 'joiningDate', 'leavingDate'],
      },
      {
        required: false,
        model: userFamily,
        where: {
          verifyStatus: 1,
          status: 1,
        },
        attributes: ['userFamilyID'],
      },
    ];

    const userData = await UserMaster.findAll({
      where: condition,
      attributes: ['userMasterID', 'displayName'],
      include: includeModels,
      order: [['displayName', 'ASC']],
    });

    const finalData = [];

    const excludeIds = [
      payheadMasterIdsMapping.CTC,
      payheadMasterIdsMapping.GROSS,
      payheadMasterIdsMapping.NETSALARY,
    ];

    for (const user of userData) {
      const joining = user.employeeJoiningDetails?.[0] || null;
      const joiningYear = joining
        ? String(joining.joiningDate).slice(0, 4)
        : null;
      const leavingYear =
        joining && joining.leavingDate
          ? String(joining.leavingDate).slice(0, 4)
          : null;

      const dependant = user.userFamilies || [];

      const obj = {
        'Employee Code': joining?.employeeCode ?? '',
        'TIN Employer': companyData.tanNumber,
        'Employer Name': companyData.companyName,
        'Employer Contact Name': companyData.cpName,
        'Employer Phone No.': companyData.cpMobileNo,
        'SOE Year': year,
        'TIN Employee': '',
        'Employee Name': user.displayName,
        'Employee Postal Address': companyData.companyAddress,
        'No. Of Dependants': Array.isArray(dependant)?.length ?? 0,
        'Resident Y/N': 'Y',
        'Gross Wages': 0,
        'Taxable Allowances': 0,
        'Taxable Benefits-Accom': 0,
        'Taxable Benefits-Vehicle': 0,
        'Non-Taxable Allowances': 0,
        'Lump Sum on Tmn': 0,
        'Tax Deducted': 0,
        'Part Year From Date':
          joiningYear == year
            ? moment(joining.joiningDate, 'YYYY-MM-DD').format('DD-MM-YYYY')
            : '',
        'Part Year To Date':
          leavingYear == year
            ? moment(joining.leavingDate, 'YYYY-MM-DD').format('DD-MM-YYYY')
            : '',
        Signatory: companyData.cpName,
      };

      const salaryData = user.hrSalaryTrasactions || [];

      const gross = salaryData
        .filter(
          (e) =>
            e.HSM?.GSS?.HSF?.payheadMasterId == payheadMasterIdsMapping.GROSS,
        )
        .reduce((acc, obj) => acc + +obj.EmployeeSalaryAmount, 0);

      obj['Gross Wages'] = roundOffLeaveBalance(gross);

      const withOutGrossData = salaryData.filter(
        (e) => !excludeIds.includes(e.HSM?.GSS?.HSF?.payheadMasterId),
      );

      const taxableAllowances = withOutGrossData
        .filter(
          (e) =>
            e.HSM?.GSS?.HSF?.PHM?.taxApplicability ==
              TaxApplicabilityType.TAXABLE &&
            e.HSM?.GSS?.HSF?.salaryFieldSrNo == salaryFieldSrNoFields.EARNING,
        )
        .reduce((acc, obj) => acc + +obj.EmployeeSalaryAmount, 0);
      const salarySacrifices = withOutGrossData
        .filter(
          (e) =>
            e.HSM?.GSS?.HSF?.payheadMasterId ==
            payheadMasterIdsMapping.SALARY_SACRIFICE,
        )
        .reduce((acc, obj) => acc + +obj.EmployeeSalaryAmount, 0);

      obj['Taxable Allowances'] = roundOffLeaveBalance(
        taxableAllowances - salarySacrifices,
      );

      const nonTaxableAllowances = withOutGrossData
        .filter(
          (e) =>
            e.HSM?.GSS?.HSF?.PHM?.taxApplicability !=
              TaxApplicabilityType.TAXABLE &&
            e.HSM?.GSS?.HSF?.salaryFieldSrNo == salaryFieldSrNoFields.EARNING,
        )
        .reduce((acc, obj) => acc + +obj.EmployeeSalaryAmount, 0);

      obj['Non-Taxable Allowances'] =
        roundOffLeaveBalance(nonTaxableAllowances);

      const taxDeducted = withOutGrossData
        .filter(
          (e) =>
            e.HSM?.GSS?.HSF?.payheadMasterId ==
            payheadMasterIdsMapping.SALARY_WAGES_TAX,
        )
        .reduce((acc, obj) => acc + +obj.EmployeeSalaryAmount, 0);

      obj['Tax Deducted'] = roundOffLeaveBalance(taxDeducted);

      finalData.push(obj);
    }

    return await generateExcel(
      finalData,
      'Yearly Salary Register',
      'xlsx',
      res,
    );
  } catch (error) {
    next(error);
  }
};
