const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const HRSalaryMasterFields = require('../models/hrSalaryMaster');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const GradeStructure = require('../models/gradeStructure');
const HRSalaryFields = require('../models/hrSalaryFields');
const Payheadmaster = require('../models/payhead');
const deposit = require('../models/deposit');
const depositcategory = require('../models/depositCategory');
const EmployeePenalty = require('../models/employeePenalty');
const Employeeincentive = require('../models/employeeincentive');
const Incentivetype = require('../models/incentivetype');
const HRSalaryTrasaction = require('../models/hrSalaryTransaction');
const {
  payheadMasterIdsMapping,
  salaryFieldSrNoFields,
  salaryConsiderInEnum,
  default_payheadMasterIds,
} = require('./dbUtils');
const UserMaster = require('../models/userMaster');
const Penalty = require('../models/penalty');
const moment = require('moment');
const { asiaKolkataDateTime } = require('./commonUtilFunctions');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const BankMaster = require('../models/bankMaster');
const BankBranch = require('../models/bankBranch');
const Contractor = require('../models/contractor');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDivision = require('../models/employeeDivision');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const Division = require('../models/division');
const WorkingArea = require('../models/workingArea');
const companyMaster = require('../models/companyMaster');

// ==============================
// Date Validation Function
// ==============================

/**
 * Validates date range for API requests
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {boolean} allowFutureDates - Whether to allow future dates (default: false)
 * @param {number} maxDays - Maximum allowed days in range (default: null, no limit)
 * @returns {object} - { isValid: boolean, message: string }
 */
function validateDateRange(
  startDate,
  endDate,
  allowFutureDates = false,
  maxDays = null,
) {
  // Check if dates are provided
  if (!startDate || !endDate) {
    return {
      isValid: false,
      message: 'StartDate and EndDate are required',
    };
  }

  // Validate date format (YYYY-MM-DD)
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateFormatRegex.test(startDate)) {
    return {
      isValid: false,
      message: 'Invalid StartDate format. Expected format: YYYY-MM-DD',
    };
  }

  if (!dateFormatRegex.test(endDate)) {
    return {
      isValid: false,
      message: 'Invalid EndDate format. Expected format: YYYY-MM-DD',
    };
  }

  // Validate if dates are valid calendar dates
  if (!moment(startDate, 'YYYY-MM-DD', true).isValid()) {
    return {
      isValid: false,
      message: 'Invalid StartDate. Please provide a valid date.',
    };
  }

  if (!moment(endDate, 'YYYY-MM-DD', true).isValid()) {
    return {
      isValid: false,
      message: 'Invalid EndDate. Please provide a valid date.',
    };
  }

  // Validate StartDate is not after EndDate
  if (moment(startDate).isAfter(moment(endDate))) {
    return {
      isValid: false,
      message: 'StartDate cannot be after EndDate.',
    };
  }

  // Validate maximum days range if specified
  if (maxDays !== null) {
    const daysDifference = moment(endDate).diff(moment(startDate), 'days') + 1; // +1 to include both start and end dates

    if (daysDifference > maxDays) {
      return {
        isValid: false,
        message: `Date range cannot exceed ${maxDays} days. Current range: ${daysDifference} days.`,
      };
    }
  }

  // Validate future dates if not allowed
  if (!allowFutureDates) {
    const currentDate = moment().format('YYYY-MM-DD');

    if (endDate > currentDate) {
      return {
        isValid: false,
        message: 'Invalid date. Future date is not allowed.',
      };
    }
  }

  // All validations passed
  return {
    isValid: true,
    message: 'Valid date range',
  };
}

// HELPERS (GLOBAL / OUTSIDE)
// ==============================

const createSalaryStructure = () => ({
  earning: [],
  gross: [],
  employeeDeduction: [],
  extraEarning: [],
  netPay: [],
  employerDeduction: [],
  ctc: [],
});

const getOrCreate = (map, userId) => {
  if (!map.has(userId)) {
    map.set(userId, createSalaryStructure());
  }
  return map.get(userId);
};

const pushItem = (arr, data) => arr.push(data);

const handleSpecialHeads = ({
  payheadMasterId,
  payheadName,
  salaryFieldSrNo,
  salaryFieldSide,
  considerIn,
  EmployeeSalaryAmount,
  actualAmount,
  transaction,
}) => {
  const mapping = {
    [payheadMasterIdsMapping.CTC]: 'ctc',
    [payheadMasterIdsMapping.GROSS]: 'gross',
    [payheadMasterIdsMapping.NETSALARY]: 'netPay',
  };

  const key = mapping[payheadMasterId];
  if (!key) return;

  transaction[key].push({
    payheadName,
    salaryFieldSrNo,
    salaryFieldSide,
    EmployeeSalaryAmount,
    considerIn,
    payheadMasterId,
  });
};

async function getSalaryDataMap_By_UserIdsAndMonth({
  userMasterIDs = [],
  month,
}) {
  const salaryTransactionMap = new Map();

  // ✅ Early return
  if (!userMasterIDs.length) {
    return { salaryTransactionMap };
  }

  const includeModel = [
    {
      model: HRSalaryMasterFields,
      as: 'HSM',
      include: [
        {
          model: GradeSalaryStructure,
          as: 'GSS',
          include: [
            { model: GradeStructure, attributes: ['baseOnCalculation'] },
            {
              model: HRSalaryFields,
              as: 'HSF',
              include: [
                {
                  model: Payheadmaster,
                  as: 'PHM',
                  attributes: ['payheadName'],
                },
              ],
              attributes: [
                'payheadMasterId',
                'salaryFieldSide',
                'salaryFieldSrNo',
                'considerIn',
                'payheadDisplayName',
              ],
            },
          ],
          attributes: ['salaryFieldID', 'gradeStructureID', 'salaryfieldindex'],
        },
      ],
      attributes: ['gradeSalaryStructureID', 'EmployeeSalaryAmount'],
    },
    {
      required: false,
      model: deposit,
      attributes: ['depositCategoryID', 'amount'],
      include: [
        {
          model: depositcategory,
          attributes: [['depositcategoryname', 'name']],
        },
      ],
    },
    {
      required: false,
      model: EmployeePenalty,
      attributes: ['penaltyAmount', 'penaltyID'],
      include: [
        {
          model: Penalty,
          as: 'penalty',
          attributes: ['penaltyName'],
        },
      ],
    },
    {
      required: false,
      model: Employeeincentive,
      attributes: ['amount', 'IncentivetypeID'],
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
  ];

  const salaryData = await HRSalaryTrasaction.findAll({
    where: {
      userMasterID: {
        [Sequelize.Op.in]: userMasterIDs,
      },
      salaryYYYYMM: month,
    },
    include: includeModel,
    attributes: ['EmployeeSalaryAmount', 'salaryYYYYMM', 'userMasterID'],
    order: [
      // Order by salaryfieldindex in GradeSalaryStructure
      [
        { model: HRSalaryMasterFields, as: 'HSM' },
        { model: GradeSalaryStructure, as: 'GSS' },
        'salaryfieldindex',
        'ASC',
      ],

      // Order by payheadName in Payheadmaster
      [
        { model: HRSalaryMasterFields, as: 'HSM' },
        { model: GradeSalaryStructure, as: 'GSS' },
        { model: HRSalaryFields, as: 'HSF' },
        { model: Payheadmaster, as: 'PHM' },
        'payheadName',
        'ASC',
      ],
    ],
  });

  const speacialHeads = [
    payheadMasterIdsMapping.CTC,
    payheadMasterIdsMapping.GROSS,
    payheadMasterIdsMapping.NETSALARY,
  ];

  const avoidIds = [
    payheadMasterIdsMapping.INCENTIVE,
    payheadMasterIdsMapping.PENALTY,
    payheadMasterIdsMapping.DEPOSIT_DEDUCTION,
  ];

  for (const salary of salaryData) {
    const uid = +salary.userMasterID;

    const transaction = getOrCreate(salaryTransactionMap, uid);

    // Extract once (performance)
    const HSM = salary.HSM;
    const GSS = HSM?.GSS;
    const HSF = GSS?.HSF;

    const payheadMasterId = HSF?.payheadMasterId;
    const salaryFieldSrNo = HSF?.salaryFieldSrNo;
    const salaryFieldSide = HSF?.salaryFieldSide;
    const considerIn = HSF?.considerIn;

    const EmployeeSalaryAmount = salary.EmployeeSalaryAmount || 0;
    const actualAmount = HSM?.EmployeeSalaryAmount || 0;

    const payheadName =
      HSF?.payheadDisplayName?.trim() || HSF?.PHM?.payheadName;

    const employeeIncentives = salary.employeeincentives || [];
    const employeePenalties = salary.employeePenalties || [];
    const employeeDeposites = salary.deposits || [];

    // ==============================
    // Special Heads
    // ==============================
    if (speacialHeads.includes(payheadMasterId)) {
      handleSpecialHeads({
        payheadMasterId,
        payheadName,
        salaryFieldSrNo,
        salaryFieldSide,
        considerIn,
        EmployeeSalaryAmount,
        actualAmount,
        master: null,
        transaction,
      });
      continue;
    }

    if (!avoidIds.includes(payheadMasterId)) {
      // ==============================
      // Earnings
      // ==============================
      if (salaryFieldSrNo === salaryFieldSrNoFields.EARNING) {
        const isNet = considerIn === salaryConsiderInEnum.NET_SALARY;

        if (!isNet) {
          if (
            !default_payheadMasterIds.includes(payheadMasterId) ||
            EmployeeSalaryAmount > 0
          ) {
            pushItem(transaction.earning, {
              payheadName,
              EmployeeSalaryAmount,
            });
          }
        } else {
          if (EmployeeSalaryAmount > 0) {
            pushItem(transaction.extraEarning, {
              payheadName,
              EmployeeSalaryAmount,
            });
          }
        }
      }

      // ==============================
      // Deductions
      // ==============================
      if (salaryFieldSrNo === salaryFieldSrNoFields.EMPLOYEE_DEDUCTION) {
        if (EmployeeSalaryAmount > 0) {
          pushItem(transaction.employeeDeduction, {
            payheadName,
            EmployeeSalaryAmount,
          });
        }
      }

      // Employer Deductions ---------------------

      if (salaryFieldSrNo === salaryFieldSrNoFields.EMPLOYER_DEDUCTION) {
        if (EmployeeSalaryAmount > 0) {
          pushItem(transaction.employerDeduction, {
            payheadName,
            EmployeeSalaryAmount,
          });
        }
      }
    }

    // ==============================
    // Penalties
    // ==============================
    for (const penalty of employeePenalties) {
      const existing = transaction.employeeDeduction.find(
        (p) => p.penaltyID === penalty.penaltyID,
      );

      if (existing) {
        existing.EmployeeSalaryAmount += +penalty.penaltyAmount;
      } else {
        transaction.employeeDeduction.push({
          payheadName: penalty.penalty?.penaltyName || payheadName,
          EmployeeSalaryAmount: +penalty.penaltyAmount,
          penaltyID: penalty.penaltyID,
        });
      }
    }

    // ==============================
    // Incentives
    // ==============================
    for (const incentive of employeeIncentives) {
      const name =
        incentive.IncType?.dataValues?.displayName ||
        incentive.IncType?.dataValues?.name;

      const existing = transaction.earning.find(
        (i) => i.IncentivetypeID === incentive.IncentivetypeID,
      );

      if (existing) {
        existing.EmployeeSalaryAmount += +incentive.amount;
      } else {
        transaction.earning.push({
          payheadName: name,
          EmployeeSalaryAmount: +incentive.amount,
          IncentivetypeID: incentive.IncentivetypeID,
        });
      }
    }

    // ==============================
    // Deposits
    // ==============================
    for (const deposit of employeeDeposites) {
      const existing = transaction.employeeDeduction.find(
        (p) => p.depositCategoryID === deposit.depositCategoryID,
      );

      if (existing) {
        existing.EmployeeSalaryAmount += +deposit.amount;
      } else {
        transaction.employeeDeduction.push({
          payheadName: deposit.depositcategories?.name || payheadName,
          EmployeeSalaryAmount: +deposit.amount,
          depositCategoryID: deposit.depositCategoryID,
        });
      }
    }
  }

  return { salaryTransactionMap };
}

function returnIncludeAndUserAttribute(empCode = null) {
  const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

  const empJoiningCondition = {};

  if (empCode) {
    empJoiningCondition.employeeCode = empCode;
  }

  const includes = [
    {
      model: companyMaster,
      attributes: ['companyName'],
    },
    {
      model: EmployeeJoiningDetails,
      where: empJoiningCondition,
      attributes: [
        'employeeCode',
        'dob',
        'joiningDate',
        'leavingDate',
        'adharCard',
        'esicNumber',
        'pfNumber',
        'uanNumber',
        'pancard',
        'employment',
        'adharName',
        'esicjoiningDate',
        'bloodgroup',
        'nationality',
        'employeeType',
        'pfjoiningDate',
        'pfbankIFSC',
        'pfbankAccountNo',
        'attendanceFrom',
        'nameAsBank',
        'payrollFrequency',
        'esicEndMonth',
        'overtime',
        'salaryCalculationAct',
        'biometricSerialNo',
        'biometricCode',
        'salarytype',
        'applicableDate',
        'endDate',
        'noticePeriod',
        'fullMonthPresence',
        'retirementAge',
        'retirementDate',
        'bankAccountStatus',
        'bankAccountNo',
        'bankIFSC',
        'bankBranchID',
        'bankMasterID',
        'contractorId',
      ],
      include: [
        {
          model: BankMaster,
          attributes: ['bankName'],
          include: [
            {
              separate: true,
              model: BankBranch,
              attributes: ['bankBranchName', 'bankBranchCode'],
            },
          ],
        },
        {
          model: Contractor,
          attributes: ['contractorName'],
        },
        {
          model: BankBranch,
          attributes: ['bankBranchName', 'bankBranchCode'],
        },
      ],
    },
    {
      required: false,
      model: EmployeeBranch,
      attributes: ['branchID'],
      where: {
        status: 1,
        applicableDate: { [Sequelize.Op.lte]: currentDate },
        [Sequelize.Op.or]: [
          { endDate: { [Sequelize.Op.gte]: currentDate } },
          { endDate: null },
        ],
      },
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
      model: EmployeeDepartment,
      attributes: ['departmentID'],
      where: {
        status: 1,
        applicableDate: { [Sequelize.Op.lte]: currentDate },
        [Sequelize.Op.or]: [
          { endDate: { [Sequelize.Op.gte]: currentDate } },
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
      required: false,
      model: EmployeeDesignation,
      attributes: ['designationID'],
      where: {
        status: 1,
        applicableDate: { [Sequelize.Op.lte]: currentDate },
        [Sequelize.Op.or]: [
          { endDate: { [Sequelize.Op.gte]: currentDate } },
          { endDate: null },
        ],
      },
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
      attributes: ['divisionId'],
      where: {
        status: 1,
        startDate: { [Sequelize.Op.lte]: currentDate },
        [Sequelize.Op.or]: [
          { endDate: { [Sequelize.Op.gte]: currentDate } },
          { endDate: null },
        ],
      },
      include: [{ model: Division, attributes: ['divisionName'] }],
    },
    {
      required: false,
      model: EmployeeWorkingArea,
      attributes: ['workingAreaId'],
      where: {
        status: 1,
        startDate: { [Sequelize.Op.lte]: currentDate },
        [Sequelize.Op.or]: [
          { endDate: { [Sequelize.Op.gte]: currentDate } },
          { endDate: null },
        ],
      },
      include: [{ model: WorkingArea, attributes: ['workingAreaName'] }],
    },
  ];

  const userAttributes = [
    'userMasterID',
    'firstName',
    'middleName',
    'lastName',
    'displayName',
    'userNumber',
    'gender',
    'maratialStatus',
    'email',
    'userNamePrefix',
    'physicalDisability',
    'userNumberCountryMasterID',
    'cugNumber',
    'otherContactNumber',
    'officalEmail',
    'status',
  ];

  return { includes, userAttributes };
}

function getAllUsersDataMap(allUser) {
  const finalData = allUser.map((user) => ({
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    displayName: user.displayName,
    userNumber: user.userNumber,
    gender: user.gender,
    maritalStatus: user.maratialStatus,
    email: user.email,
    userNamePrefix: user.userNamePrefix,
    physicalDisability: user.physicalDisability,
    countryCode: user.userNumberCountryMasterID,
    cugNumber: user.cugNumber,
    otherContactNumber: user.otherContactNumber,
    officalEmail: user.officalEmail,
    status: user.status,
    userMasterID: user.userMasterID,
    company: user?.companyMaster?.companyName || null,
    // Joining Details
    employeeCode: user.employeeJoiningDetails?.[0]?.employeeCode || null,
    dob: user.employeeJoiningDetails?.[0]?.dob || null,
    joiningDate: user.employeeJoiningDetails?.[0]?.joiningDate || null,
    leavingDate: user.employeeJoiningDetails?.[0]?.leavingDate || null,
    adharCard: user.employeeJoiningDetails?.[0]?.adharCard || null,
    esicNumber: user.employeeJoiningDetails?.[0]?.esicNumber || null,
    pfNumber: user.employeeJoiningDetails?.[0]?.pfNumber || null,
    uanNumber: user.employeeJoiningDetails?.[0]?.uanNumber || null,
    pancard: user.employeeJoiningDetails?.[0]?.pancard || null,
    employment: user.employeeJoiningDetails?.[0]?.employment || null,
    adharName: user.employeeJoiningDetails?.[0]?.adharName || null,
    esicjoiningDate: user.employeeJoiningDetails?.[0]?.esicjoiningDate || null,
    bloodgroup: user.employeeJoiningDetails?.[0]?.bloodgroup || null,
    nationality: user.employeeJoiningDetails?.[0]?.nationality || null,
    employeeType: user.employeeJoiningDetails?.[0]?.employeeType || null,
    pfjoiningDate: user.employeeJoiningDetails?.[0]?.pfjoiningDate || null,
    pfbankIFSC: user.employeeJoiningDetails?.[0]?.pfbankIFSC || null,
    pfbankAccountNo: user.employeeJoiningDetails?.[0]?.pfbankAccountNo || null,
    attendanceFrom: user.employeeJoiningDetails?.[0]?.attendanceFrom || null,
    nameAsBank: user.employeeJoiningDetails?.[0]?.nameAsBank || null,
    payrollFrequency:
      user.employeeJoiningDetails?.[0]?.payrollFrequency || null,
    esicEndMonth: user.employeeJoiningDetails?.[0]?.esicEndMonth || null,
    overtime: user.employeeJoiningDetails?.[0]?.overtime || null,
    salaryCalculationAct:
      user.employeeJoiningDetails?.[0]?.salaryCalculationAct || null,
    biometricSerialNo:
      user.employeeJoiningDetails?.[0]?.biometricSerialNo || null,
    biometricCode: user.employeeJoiningDetails?.[0]?.biometricCode || null,
    salarytype: user.employeeJoiningDetails?.[0]?.salarytype || null,
    applicableDate: user.employeeJoiningDetails?.[0]?.applicableDate || null,
    endDate: user.employeeJoiningDetails?.[0]?.endDate || null,
    noticePeriod: user.employeeJoiningDetails?.[0]?.noticePeriod || null,
    fullMonthPresence: user.employeeJoiningDetails?.[0]?.fullMonthPresence,
    retirementAge: user.employeeJoiningDetails?.[0]?.retirementAge || null,
    retirementDate: user.employeeJoiningDetails?.[0]?.retirementDate || null,
    bankAccountStatus: user.employeeJoiningDetails?.[0]?.bankAccountStatus,
    bankAccountNo: user.employeeJoiningDetails?.[0]?.bankAccountNo || null,
    bankIFSC: user.employeeJoiningDetails?.[0]?.bankIFSC || null,

    // Bank Branch
    bankName: user.employeeJoiningDetails?.[0]?.bankMaster?.bankName || null,
    // bankBranchName:
    //   user.employeeJoiningDetails?.[0]?.bankMaster?.bankBranches
    //     ?.bankBranchName || null,
    // bankBranchCode:
    //   user.employeeJoiningDetails?.[0]?.bankMaster?.bankBranches
    //     ?.bankBranchCode || null,

    // Contractor
    contractorName:
      user.employeeJoiningDetails?.[0]?.contractor?.contractorName || null,

    // Current Branch
    branchName: user.employeeBranches?.[0]?.branchMaster?.branchName || null,

    // Current Department
    departmentName:
      user.employeeDepartments?.[0]?.department?.departmentName || null,

    // Current Designation
    designationName:
      user.employeeDesignations?.[0]?.designation?.designationName || null,

    // Current Division
    divisionName: user.employeeDivisions?.[0]?.division?.divisionName || null,

    // Current Working Area
    workingAreaName:
      user.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName || null,
  }));

  return finalData;
}

module.exports = {
  validateDateRange,
  getSalaryDataMap_By_UserIdsAndMonth,
  getAllUsersDataMap,
  returnIncludeAndUserAttribute,
};
