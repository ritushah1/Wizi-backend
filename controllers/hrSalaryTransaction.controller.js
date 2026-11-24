const Sequelize = require('sequelize');
const HrSalaryTrans = require('../models/hrSalaryTransaction');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const userMaster = require('../models/userMaster');
const HRSalaryMaster = require('../models/hrSalaryMaster');
const { executeQuery } = require('./common.controller');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeBranch = require('../models/employeeBranch');
const Handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');
const UserMaster = require('../models/userMaster');
const Designation = require('../models/designation');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const BranchMaster = require('../models/branchMaster');
const Department = require('../models/department');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const SalaryPolicy = require('../models/salaryPolicy');
const Payheadmaster = require('../models/payhead');
const advancePayments = require('../models/advancePayment');
const LoanTransactions = require('../models/loanTransaction');
const Penalty = require('../models/penalty');
const ProfessionalTaxSlabMaster = require('../models/professionaltaxmaster');
const { add } = require('winston');
const HRSalarySlip = require('../models/hrSalarySlip');
const employeePenalties = require('../models/employeePenalty');
const LoanMaster = require('../models/loanMaster');
const WeekoffOptions = require('../models/weekOffOptions');
const attendanceTransaction = require('../models/attendanceTransaction');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendacePolicy = require('../models/attendancePolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const HRSalaryFields = require('../models/hrSalaryFields');
const Employeeincentive = require('../models/employeeincentive');
const Shift = require('../models/shift');
const OverTimeCalculationMains = require('../models/overTimeCalculationMain');
const moment = require('moment');
const { ToWords } = require('to-words');
const puppeteer = require('puppeteer');
const {
  mainApiUrl,
  showEmployerLWF,
  showActualEDLI,
  isStoreFileToS3Bucket,
  bucketName,
  ProjectName,
  projectNamesList,
} = require('../utils/labelUtils');

const toWords = new ToWords({
  localeCode: 'en-IN', // Indian Numbering System
  converterOptions: {
    currency: false,
    ignoreZeroCurrency: false,
    doNotAddOnly: false,
  },
});

const {
  daysInMonth,
  employeeAttendancePolicy,
  employeeDepartment,
  employeeShift,
  employeeDesignation,
  employeeBranch,
  employeeSalaryPolicy,
  getemployeeJoiningDetails,
  getAllUserByCompanyDateWise,
  employeeLateEarlyPolicy,
  calculatePenaltyInSalary,
  month_dict,
  getUserByBranchandDateRange,
  getUserByCompanyandDateRange,
  getAttendanceData,
  getFinancialYearByMonth,
  incomeTaxCalculationByUserId,
  isValidDate,
  asiaKolkataDateTime,
  generateHTMLToPDF_base64Path,
  employeeeLeaveBalance,
  getUserSalaryMasterByMonth,
  getSalaryData,
  getDateRangeBySalaryPolicy,
  findCompanyNotificationPolicy,
  getStartAndEndDate,
  getPreviousMonth,
  getNextMonth,
  penaltyDeductionCalculation,
  calculateLeaveEncashment,
  getPayBonusAmount,
  getApplicableTaxSlabs,
  getPreviousMonths,
  getPTCalculationAmount,
  getRoundOffSalary,
  minutesToHoursMinutes,
  calculatePaidLeaveHours,
  getAmountByPresentDays,
  getLeaveBalanceForSalarySlip,
  shortFallHoursCalculation,
  ToformatAddress,
  getNotAddedDocForSalary,
  calculateSalaryMatch,
  settleExtraDaysIntoPresent,
  getOTMinutesFromExtraAmount,
  calculatePaidDays,
  savePdfBuffer,
  ps_getDaysForAmount,
  transformToKeyedObject,
  getAllWeekoffHolidayWithPriority,
  pfCalculationForSep2026,
} = require('../utils/commonUtilFunctions');
const Incentivetype = require('../models/incentivetype');
const EmployeePenalty = require('../models/employeePenalty');
const {
  generateDemoExcelForVariable,
  EmailSalarySlip,
  createZipFileForsalarySlip,
  generateExcel,
} = require('../utils/exportData');
const { accessibleUsers } = require('../utils/commonUtilFunctions');

const EmployeeBonus = require('../models/employeeBonus');
const readXlsxFile = require('read-excel-file/node');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const companyMaster = require('../models/companyMaster');
const GradeStructure = require('../models/gradeStructure');
const HRSalaryTrasaction = require('../models/hrSalaryTransaction');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const advancePayment = require('../models/advancePayment');
const overTimeCalculationMain = require('../models/overTimeCalculationMain');
const deposit = require('../models/deposit');
const depositcategory = require('../models/depositCategory');
const Contractor = require('../models/contractor');
const CityMaster = require('../models/citymaster');
const StateMaster = require('../models/statemaster');
const CountryMaster = require('../models/countrymaster');
const BankMaster = require('../models/bankMaster');
const empLeavePolicy = require('../models/empLeavePolicy');
const {
  nonEditableList_INC,
  LCEGPenaltyTypeEnum,
  WeekOffSalaryTypeEnum,
  PTCalculationEnum,
  default_payheadMasterIds,
  weekoffTypeEnum,
  PayrollFrequencyType,
  paymentMode,
  payheadConsiderInEnum,
  payheadMasterIdsMapping,
  paymentMode_PaidSalary,
  pfPercentage,
  salarySlipNameList,
  addressTypes,
  lwfDeductionMethodEnum,
  HrLeaveTypesIds,
  SalaryStructureTypeEnum,
  salaryConsiderInEnum,
  salaryFieldSrNoFields,
  notIncludePyaheadIds,
  PayrollStatutoryAdjustModeEnum,
  depositPayModeEnum,
  incentivePayModeEnum,
  roundOffDaysForPayrollStatutory,
  offDayCategoryEnum,
  companyMasterIDENUM,
} = require('../utils/dbUtils');
const employeeLeavePolicy = require('../models/employeeLeavePolicy');
const LeaveEncashment = require('../models/leaveEncashment');
const EmployeeRepayment = require('../models/employeeRepayment');
const EmployeeBonusPolicy = require('../models/employeeBonusPolicy');
const BonusPolicy = require('../models/bonusPolicy');
const LCEGPenalty = require('../models/lcegPenalty');
const EmployeeWeekOff = require('../models/employeeWeekOff');
const weekOffPolicy = require('../models/weekOffPolicy');
const ShiftTIme = require('../models/shiftTime');
const CompanySalarySlipFormat = require('../models/companySalarySlipFormat');
const expensePayment = require('../models/expensePayment');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const {
  statusCodes,
  userAttributes,
  orderByEmployeeMasterFields,
  PFCalculationCompanyIds,
  PFCalculationMonth,
  NewRuleCapping,
  SepMonthPFCapping,
  customClientTypes,
} = require('../utils/commonVars');
const SalaryBasedOnDays = require('../models/salaryBasedOnDays');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const { log } = require('console');
const UserAddress = require('../models/userAddress');
const DistrictMaster = require('../models/districtMaster');
const EmployeeDigitalSignature = require('../models/employeeDigitalSignature');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const SalaryEligibilityDocument = require('../models/salaryEligibilityDocument');
const DocumentList = require('../models/documentList');
const UserDocument = require('../models/userDocument');
const PayrollStatutoryConfiguration = require('../models/payrollStatutoryConfiguration');
const EmpPayrollStatutory = require('../models/empPayrollStatutory');
const EmpPayrollStatutoryDetails = require('../models/empPayrollStatutoryDetails');
const PayrollStatutorySalaryTrans = require('../models/payrollStatutorySalaryTrans');
const PayrollStatutoryAttnCal = require('../models/payrollStatutoryAttnCal');
const { uploadBase64ToS3, getS3File } = require('../utils/s3.utils');
const PayrollStatutorySlip = require('../models/payrollStatutorySlip');
const PayrollStatutoryAdjustment = require('../models/payrollStatutoryAdjustment');
const ExtraDays = require('../models/extraDays');
const { s3UploadSalarySlipPdf } = require('../middleware/s3UploadFile');

const toMarathiWords = new ToWords({
  localeCode: 'mr-IN', // Indian Numbering System
  converterOptions: {
    currency: true,
    ignoreZeroCurrency: false,
    doNotAddOnly: false,
  },
});

const chunkArray = (array, chunkSize) => {
  const results = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    results.push(array.slice(i, i + chunkSize));
  }
  return results;
};

function calculateWeekoffSalary(
  weekoff_PayheadIds,
  weekoffCount,
  CTC_GROSS_NET,
  salarystructure,
  salary_CalculationDays,
  calculationType,
) {
  let amount = 0;
  const payheadAmount =
    weekoff_PayheadIds && weekoff_PayheadIds.length
      ? weekoff_PayheadIds?.[0] == 50
        ? CTC_GROSS_NET.find((e) => e.payheadMasterId == 50)
            ?.ActualEmployeeSalaryAmount || 0
        : salarystructure
            .filter((e) => [...weekoff_PayheadIds].includes(+e.payheadMasterId))
            .reduce((acc, obj) => acc + +obj.ActualEmployeeSalaryAmount, 0)
      : 0;

  const perDayAmount =
    calculationType == 'Daily'
      ? +payheadAmount
      : +payheadAmount / +salary_CalculationDays;
  amount = +perDayAmount * weekoffCount;

  return amount;
}

function getLwfAmountForSalary(lwfData, payheadMasterId, grossAmount = 0) {
  let value = 0;

  if (lwfData) {
    if (lwfData.deductionMethod == lwfDeductionMethodEnum.GROSS_PERCENTAGE) {
      const percentage =
        +payheadMasterId == payheadMasterIdsMapping.EMPLOYEE_LWF
          ? lwfData.employeePer
          : lwfData.employerPer;

      const capping =
        +payheadMasterId == payheadMasterIdsMapping.EMPLOYEE_LWF
          ? lwfData.employeeCapping
          : lwfData.employerCapping;

      value = (+percentage * +grossAmount) / 100;

      if (capping != null) {
        value = Math.min(value, capping);
      }
    } else {
      value =
        +payheadMasterId == payheadMasterIdsMapping.EMPLOYEE_LWF
          ? lwfData?.employeeAmt || 0
          : lwfData?.employerAmt || 0;
    }
  }

  return value;
}

function ps_structuredData(
  data,
  amount,
  calculatedOn = null,
  name = null,
  roundoff = true,
) {
  const obj = {
    psDetailsId: data.id,
    payheadmasterid: data.GSS?.HSF?.payheadMasterId,
    payheadName:
      name ||
      data.GSS?.HSF?.payheadDisplayName?.trim() ||
      data.GSS?.HSF?.PHM?.payheadName ||
      null,
    employeeAmount: roundoff
      ? getRoundOffSalary(
          +amount,
          data.GSS.HSF.salaryFieldRound,
          data.GSS.HSF.roundOffType,
          data.GSS.HSF.salaryFieldRoundNo,
        )
      : amount,
    salaryfieldsrno: data.GSS?.HSF?.salaryFieldSrNo,
    salaryfieldside: data.GSS?.HSF?.salaryFieldSide,
    salaryfieldshow: data.GSS?.HSF?.salaryFieldShow,
    calculatedOn: Math.round(+calculatedOn),
    salaryfieldmaxrange: data.GSS?.salaryfieldmaxrange,
  };

  return obj;
}

exports.GenrateSalary = async (req, res, next) => {
  let browser = null;
  let page = null;
  try {
    const {
      userMasterID,
      yearmonth,
      from = 'salary',
      salaryCalRemark = null,
    } = await req.body;
    const user = userMasterID;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    let salarySlipFormat = null;
    let leaveTypeList = [];
    let salaryEligibilityDocList = [];

    const now = new Date();
    const currentYYYYMM = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    const slaceFormatDate = (date) => {
      if (!date) return '';
      return moment(date, 'YYYY-MM-DD').format('DD/MM/YYYY');
    };

    if (+yearmonth > +currentYYYYMM) {
      return res.status(200).json({
        status: 401,
        message: `You can't calculate salary for a future month (${yearmonth})`,
      });
    }

    const getTemplate = (type) => {
      const file = path.join(__dirname, `../html/${type}.hbs`);
      return file;
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
      // serial number helper
      inc: (value) => value + 1,
    });

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

    const year = yearmonth.slice(0, 4);
    const Month = yearmonth.slice(4, 6);
    const temp_monday = daysInMonth(Month, year);

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const enddate = year + '-' + Month + '-' + temp_monday;

    const condition = {
      status: 1,
      applicableDate: { [Sequelize.Op.lte]: new Date(enddate) },
      [Sequelize.Op.or]: [
        { endDate: { [Sequelize.Op.gte]: new Date(enddate) } },
        { endDate: { [Sequelize.Op.eq]: null } },
      ],
    };

    const chunks = chunkArray(user, 100);

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const includeUserMaster = [
      {
        model: companyMaster,
        attributes: [
          'companyName',
          'companyEmail',
          'tdsdeduction',
          'companyLogo',
          'companyAddress',
          'cinNumber',
          'companyWebsite',
          'weekOffSalaryType',
          'payheadMasterId',
          'ptDeduction',
          'cpMobileNo',
        ],
        include: [
          {
            model: PayrollStatutoryConfiguration,
            as: 'PSC',
            attributes: [
              'adjustSalaryFieldId',
              'isPayrollStatutory',
              'adjustMode',
            ],
            include: [
              {
                model: HRSalaryFields,
                as: 'AHSF',
                attributes: ['payheadMasterId'],
              },
            ],
          },
        ],
      },
      {
        separate: true,
        model: EmployeeJoiningDetails,
        include: [
          {
            required: false,
            model: Contractor,
            include: [
              {
                model: CityMaster,
                attributes: ['cityName'],
                include: [
                  {
                    model: StateMaster,
                    attributes: ['stateName'],
                    include: [
                      {
                        model: CountryMaster,
                        attributes: ['countryName'],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            required: false,
            model: BankMaster,
          },
        ],
      },
      {
        model: EmployeeDesignation,
        where: condition,
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
        where: condition,
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
        where: condition,
        required: false,
        attributes: ['branchID'],
        include: [
          {
            model: BranchMaster,
            as: 'branchMaster',
            attributes: ['branchName', 'branchAddress'],
          },
        ],
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
        separate: true,
        attributes: ['salaryPolicyID'],
        include: [
          {
            model: SalaryPolicy,
            as: 'salaryPolicy',
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
      {
        required: false,
        model: LeaveEncashment,
        where: {
          YYYYMM: yearmonth,
          status: 1,
          payInFNF: false,
        },
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
      // salarySlip
      {
        required: false,
        model: HRSalarySlip,
        salaryYYYYMM: yearmonth,
      },
      // weeoffPolicy
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
        attributes: ['weekOffPolicyID', 'applicableDate', 'endDate'],
        include: [
          {
            model: weekOffPolicy,
            as: 'weekoff',
          },
        ],
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
      // user address
      {
        required: false,
        model: UserAddress,
        where: {
          addressType: addressTypes.PERMANENT,
          verifyStatus: 1,
          status: 1,
        },
        include: [{ model: CityMaster, attributes: ['cityName'] }],
      },
      // digital signature
      {
        required: false,
        model: EmployeeDigitalSignature,
        where: {
          status: 1,
        },
        attributes: ['signature'],
      },
      // division
      {
        model: EmployeeDivision,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: new Date(enddate) },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: new Date(enddate) } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: false,
        attributes: ['divisionId'],
        include: [
          {
            model: Division,
            attributes: ['divisionName'],
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

    if (from == 'FNF') {
      includeUserMaster.push({
        required: false,
        model: deposit,
        where: {
          status: 1,
          [Sequelize.Op.or]: [
            {
              depositReceiveAs: 'salary',
              salaryMonth: yearmonth,
            },
            {
              payModeInFNF: depositPayModeEnum.SALARY,
              payInFNF: true,
            },
          ],
        },
        include: [
          {
            model: depositcategory,
            attributes: ['depositcategoryname'],
          },
        ],
      });
    } else {
      includeUserMaster.push({
        required: false,
        model: deposit,
        where: {
          status: 1,
          depositReceiveAs: 'salary',
          salaryMonth: yearmonth,
        },
        include: [
          {
            model: depositcategory,
            attributes: ['depositcategoryname'],
          },
        ],
      });
    }

    const excludePayheadIds_ps = [
      16, 17, 24, 34, 9, 43, 15, 13, 14, 18, 59, 78, 96, 97, 67, 101, 147, 116,
      148, 151, 1, 50, 92, 99, 5,
    ];

    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Prevents memory issues
        '--disable-gpu',
      ],
      headless: 'new',
    });
    page = await browser.newPage();

    for (const chunk of chunks) {
      const [usermaster, salaryMasterData, AllUserAttendanceData] =
        await Promise.all([
          UserMaster.findAll({
            // raw: true,
            where: {
              ...where,
              userMasterID: chunk,
              status: 1,
            },
            include: [...includeModels, ...includeUserMaster],
            order: [['displayName', 'ASC']],
          }),
          HRSalaryMaster.findAll({
            raw: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]: chunk,
              },
              [Sequelize.Op.and]: Sequelize.literal(`
            ("hrSalaryMaster"."userMasterID", "hrSalaryMaster"."salaryFromYYYYMM") IN (
              SELECT "userMasterID", MAX("salaryFromYYYYMM") AS "maxMonth"
              FROM "hrSalaryMasters"
              WHERE "salaryFromYYYYMM" <= ${yearmonth}
              AND "userMasterID" IN (${chunk.join(',')})
              GROUP BY "userMasterID"
            )
          `),
            },
            include: [
              {
                model: GradeSalaryStructure,
                include: [
                  { model: GradeStructure, attributes: [] },
                  // { model: HRSalaryFields,as:'RA_HSF',attributes:[]},
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
                // order: [
                //   // Order by salaryfieldindex in GradeSalaryStructure
                //   ['salaryfieldindex', 'ASC'],

                //   // Order by payheadName in Payheadmaster
                //   [
                //     { model: HRSalaryFields, model: Payheadmaster },
                //     'payheadName',
                //     'ASC',
                //   ],
                // ],
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
              'corporationId',
              'salaryMasterID',
              'EmployeeSalaryAmount',
              'ActualEmployeeSalaryAmount',
              'salaryFromYYYYMM',
              'userMasterID',
              'gradeSalaryStructureID',
              [
                Sequelize.col(
                  'gradeSalaryStructure.gradeStructure.baseOnCalculation',
                ),
                'baseOnCalculation',
              ],
              [
                Sequelize.col(
                  'gradeSalaryStructure.gradeStructure.gradeStructureID',
                ),
                'gradeStructureID',
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
                Sequelize.col('gradeSalaryStructure.remainingAmtSalaryFieldID'),
                'remainingAmtSalaryFieldID',
              ],
              [
                Sequelize.col('gradeSalaryStructure.salaryFieldID'),
                'salaryFieldID',
              ],
              [
                Sequelize.col(
                  'gradeSalaryStructure.hrSalaryField.salaryFieldWhenMonth',
                ),
                'salaryFieldWhenMonth',
              ],
              [
                Sequelize.col(
                  'gradeSalaryStructure.hrSalaryField.roundOffType',
                ),
                'roundOffType',
              ],
              [
                Sequelize.col('gradeSalaryStructure.hrSalaryField.considerIn'),
                'considerIn',
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
          HrLeaveMonthlyTrans.findAll({
            raw: true,
            where: {
              userMasterID: chunk,
              AttnYearMon: yearmonth,
              verified: 1,
            },
            include: [
              {
                model: HrLeaveTypes,
                attributes: ['LeaveID'],
              },
            ],
          }),
        ]);

      if (!usermaster?.length) continue;

      const companyId = usermaster?.[0]?.companyMasterId || null;

      // ----------------- Employee Payroll Statutory Data ----------------------------------

      const isPayrollStatutory =
        usermaster[0]?.companyMaster?.PSC?.[0]?.isPayrollStatutory || false;

      let payrollStatutoryData = [];

      if (isPayrollStatutory) {
        payrollStatutoryData = await EmpPayrollStatutory.findAll({
          where: {
            userMasterID: {
              [Sequelize.Op.in]: chunk,
            },
            [Sequelize.Op.and]: Sequelize.literal(`
      ("empPayrollStatutory"."userMasterID", "empPayrollStatutory"."salaryFromYYYYMM") IN (
        SELECT "userMasterID", MAX("salaryFromYYYYMM")
        FROM "empPayrollStatutories"
        WHERE "salaryFromYYYYMM" <= ${yearmonth}
        AND "userMasterID" IN (${chunk.join(',')})
        AND "deletedAt" IS NULL
        GROUP BY "userMasterID"
      )
    `),
          },

          attributes: [
            'id',
            'userMasterID',
            'salaryFromYYYYMM',
            'AmountIn',
            'stateid',
            'corporationId',
          ],

          include: [
            {
              model: EmpPayrollStatutoryDetails,
              as: 'EPSD',
              attributes: [
                'id',
                'EmployeeSalaryAmount',
                'ActualEmployeeSalaryAmount',
                'gradeSalaryStructureID',
              ],

              include: [
                {
                  model: GradeSalaryStructure,
                  as: 'GSS',

                  attributes: [
                    'gradeSalaryStructureID',
                    'formula',
                    'salaryfieldindex',
                    'salaryfieldmaxrange',
                    'remainingAmtSalaryFieldID',
                    'salaryFieldID',
                  ],

                  include: [
                    {
                      model: GradeStructure,
                      attributes: [
                        'gradeStructureID',
                        'gradeName',
                        'baseOnCalculation',
                      ],
                    },
                    {
                      model: HRSalaryFields,
                      as: 'HSF',

                      attributes: [
                        'salaryFieldID',
                        'payheadDisplayName',
                        'status',
                        'payheadMasterId',
                        'salaryFieldSrNo',
                        'salaryFieldSide',
                        'salaryFieldShow',
                        'salaryFieldAttanChk',
                        'salaryFieldRound',
                        'salaryFieldRoundNo',
                        'salaryFieldWhenMonth',
                        'roundOffType',
                        'considerIn',
                      ],

                      include: [
                        {
                          model: Payheadmaster,
                          as: 'PHM',

                          attributes: ['payheadName'],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],

          order: [
            [
              { model: EmpPayrollStatutoryDetails, as: 'EPSD' },
              { model: GradeSalaryStructure, as: 'GSS' },
              'salaryfieldindex',
              'ASC',
            ],
            [
              { model: EmpPayrollStatutoryDetails, as: 'EPSD' },
              { model: GradeSalaryStructure, as: 'GSS' },
              { model: HRSalaryFields, as: 'HSF' },
              { model: Payheadmaster, as: 'PHM' },
              'payheadName',
              'ASC',
            ],
          ],
        });
      }

      const payrollStatutoryUserWiseMap = new Map();

      for (const payrollStatutory of payrollStatutoryData) {
        const userMasterID = +payrollStatutory.userMasterID;

        const payheadMap = new Map();

        for (const detail of payrollStatutory.EPSD || []) {
          const payheadMasterId = +detail.GSS.HSF.payheadMasterId;
          payheadMap.set(payheadMasterId, detail);
        }

        // Remove details array to save memory
        delete payrollStatutory.EPSD;

        payrollStatutoryUserWiseMap.set(userMasterID, {
          payroll: payrollStatutory,
          payheads: payheadMap,
        });
      }

      //----------------------------------------------------------------------------

      // find all based ondays salary

      const gradeIds = salaryMasterData
        .filter((f) => f.baseOnCalculation == 'D')
        .map((e) => e.gradeStructureID);

      const AllBasedOnDaysSalaryData = gradeIds.length
        ? await SalaryBasedOnDays.findAll({
            where: {
              gradeStructureID: {
                [Sequelize.Op.in]: gradeIds,
              },
            },
            include: [
              { model: HRSalaryFields, attributes: ['payheadMasterId'] },
            ],
          })
        : [];

      // stateids

      const stateIds = [
        ...new Set(
          salaryMasterData.map((item) => item?.stateid).filter(Boolean),
        ),
      ];

      // const stateIdsStr = stateIds.join(',');
      const targetYearMonth = String(yearmonth);

      const ptQuery = `
  SELECT ptsm.*
  FROM "professionalTaxSlabMasters" ptsm
  INNER JOIN (
    SELECT "stateMasterID", MAX("applicableFromYYYYMM") AS maxMonth
    FROM "professionalTaxSlabMasters"
    WHERE "status" = 1
      AND "applicableFromYYYYMM" <= :targetYearMonth
      AND "stateMasterID" IN (:stateIdsStr)
    GROUP BY "stateMasterID"
  ) latest
    ON ptsm."stateMasterID" = latest."stateMasterID"
   AND ptsm."applicableFromYYYYMM" = latest.maxMonth
  WHERE ptsm."status" = 1;
`;

      const lwfQuery = `
  SELECT lwfm.*
  FROM "lwfMasters" lwfm
  INNER JOIN (
    SELECT "stateID", MAX("applicableYearMonth") AS maxMonth
    FROM "lwfMasters"
    WHERE "applicableYearMonth" <= :targetYearMonth
      AND "stateID" IN (:stateIdsStr)
    GROUP BY "stateID"
  ) latest
    ON lwfm."stateID" = latest."stateID"
   AND lwfm."applicableYearMonth" = latest.maxMonth;
`;

      const [allPTData, allLwfData] = stateIds.length
        ? await Promise.all([
            executeQuery(ptQuery, {
              replacements: {
                targetYearMonth: targetYearMonth,
                stateIdsStr: stateIds,
              },
            }),
            executeQuery(lwfQuery, {
              replacements: {
                targetYearMonth: targetYearMonth,
                stateIdsStr: stateIds,
              },
            }),
          ])
        : [[], []];

      console.log(
        'Retrieved PT and LWF data for yearmonth:',
        yearmonth,
        'for users:',
        chunk,
      );

      const allLWFStateWiseMap = new Map();

      for (const lwf of allLwfData) {
        const key = +lwf.stateID;

        if (!allLWFStateWiseMap.has(key)) {
          allLWFStateWiseMap.set(key, []);
        }

        const data = allLWFStateWiseMap.get(key);

        data.push(lwf);
      }

      // userids

      const userIds = usermaster.map((e) => e.userMasterID);

      let previousFiveMonthSalary = [];

      if (
        usermaster?.[0].companyMaster?.ptDeduction ==
        PTCalculationEnum.HALFYEARLY
      ) {
        const previousFiveMonths = getPreviousMonths(yearmonth, 5);

        const promiseQuery = [
          HRSalaryTrasaction.findAll({
            raw: true,
            where: {
              userMasterID: {
                [Sequelize.Op.in]: userIds,
              },
              salaryYYYYMM: {
                [Sequelize.Op.in]: previousFiveMonths,
              },
            },
            include: [
              {
                model: HRSalaryMaster,
                as: 'HSM',
                attributes: [],
                include: [
                  {
                    model: GradeSalaryStructure,
                    as: 'GSS',
                    attributes: [],
                    include: [
                      {
                        required: true,
                        model: HRSalaryFields,
                        as: 'HSF',
                        where: {
                          payheadMasterId: payheadMasterIdsMapping.GROSS,
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
            WHEN "HSM->GSS->HSF"."payheadMasterId" = ${payheadMasterIdsMapping.GROSS} THEN "hrSalaryTrasaction"."EmployeeSalaryAmount"
            ELSE 0
          END
        )
      `),
                'totalAmount',
              ],
            ],
            group: ['hrSalaryTrasaction.userMasterID'],
          }),
        ];

        const [priousFiveMonth_salary] = await Promise.all(promiseQuery);

        previousFiveMonthSalary = priousFiveMonth_salary;
      }

      const All_EmployeeLeavePolicyIds = [
        ...new Set(
          usermaster.flatMap(
            (e) => e.empLeavePolicies?.[0]?.employeeLeavePolicyID,
          ),
        ),
      ];

      let allEmployeeLeavePolicy = [],
        AllHrleaveTypes = [];

      if (All_EmployeeLeavePolicyIds.length && usermaster.length) {
        [allEmployeeLeavePolicy, AllHrleaveTypes] = await Promise.all([
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
        ]);
      }

      //For Jeevdani find ot_calculation

      let All_OT_Cal = [];
      if (
        usermaster.length > 0 &&
        [560, 630].includes(+usermaster[0].companyMasterId)
      ) {
        All_OT_Cal = await overTimeCalculationMain.findAll({
          raw: true,
          where: {
            userMasterID: chunk,
          },
        });
      }

      // find salary slip format

      if (usermaster.length > 0) {
        if (!salarySlipFormat) {
          salarySlipFormat = await CompanySalarySlipFormat.findOne({
            where: {
              companyMasterID: usermaster[0].companyMasterId,
            },
            attributes: ['companyMasterID', 'salarySlipFormatID'],
          });
        }

        if (!salaryEligibilityDocList?.length) {
          salaryEligibilityDocList = await SalaryEligibilityDocument.findAll({
            where: {
              companyMasterID: usermaster[0].companyMasterId,
            },
            attributes: ['documentListID'],
            include: [
              {
                model: DocumentList,
                as: 'document',
                attributes: ['documentName'],
              },
            ],
          });
        }

        if (!leaveTypeList.length) {
          leaveTypeList = await HrLeaveTypes.findAll({
            raw: true,
            where: {
              companyMasterID: usermaster[0].companyMasterId,
              Leave_Allow: 'Y',
              status: 1,
              LeaveID: {
                [Sequelize.Op.notIn]: [5, 18, 25],
              },
            },
            include: [
              { model: HrLeaveMaster, as: 'LeaveMaster', attributes: [] },
            ],
            attributes: [
              'LeaveID',
              [Sequelize.col('LeaveMaster.LeaveName'), 'LeaveName'],
              'LeaveTranId',
            ],
            order: [['LeaveTranId', 'ASC']],
          });
        }
      }

      for (let i = 0; i < usermaster.length; i++) {
        const employeeSalary = await HRSalaryTrasaction.findOne({
          where: {
            userMasterID: usermaster[i].userMasterID,
            salaryYYYYMM: yearmonth,
          },
        });

        if (employeeSalary) continue;

        console.log(
          `Calculating salary for ${usermaster[i].displayName} (${usermaster[i].userMasterID})`,
        );

        // Attendance verified or not
        const allVerifiedData = AllUserAttendanceData.filter(
          (e) => e.userMasterID == usermaster[i].userMasterID,
        );

        const AllcalculatedAttendanceData = allVerifiedData.filter(
          (e) =>
            ![
              HrLeaveTypesIds.LEAVE_BEHALF_ON_SANDWICH,
              HrLeaveTypesIds.ATTENDANCE_BONUS,
            ].includes(+e['hrLeaveType.LeaveID']),
        );

        const userDocument = usermaster[i].userDocuments || [];

        const notAddedDocForSalary = getNotAddedDocForSalary(
          false,
          salaryEligibilityDocList,
          userDocument,
          AllcalculatedAttendanceData?.[0]?.monthenddate,
        );

        if (notAddedDocForSalary) {
          if (userMasterID?.length == 1) {
            return res.status(statusCodes.OK).json({
              status: statusCodes.BAD_REQUEST,
              message: `Please upload '${notAddedDocForSalary}' for ${usermaster[i].displayName} to calculate salary`,
            });
          }
          continue;
        }

        // paid leave minutes
        const paidLeaveMinutes =
          AllcalculatedAttendanceData.find(
            (e) => e['hrLeaveType.LeaveID'] == 35,
          )?.AttnVal || 0;

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
          (e) =>
            e.userMasterID == usermaster[i].userMasterID &&
            ![30, 31].includes(e['hrLeaveType.LeaveID']),
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

        // ------------------------------ Payroll Statutory data ----------------------

        const payrollStatutory = isPayrollStatutory
          ? payrollStatutoryUserWiseMap.get(+usermaster[i].userMasterID)
              ?.payroll || null
          : null;
        const payrollStatutoryDetails = isPayrollStatutory
          ? payrollStatutoryUserWiseMap.get(+usermaster[i].userMasterID)
              ?.payheads || new Map()
          : new Map();

        const payrollStatutorygradeId = isPayrollStatutory
          ? payrollStatutoryDetails?.get(payheadMasterIdsMapping.GROSS)?.GSS
              ?.gradeStructure?.gradeStructureID || null
          : null;
        const gradeId = CTC_GROSS_NET?.[0]?.gradeStructureID || null;

        const isSameGrade =
          isPayrollStatutory && payrollStatutorygradeId
            ? payrollStatutorygradeId == gradeId
            : false;

        // companydata

        const companyData = usermaster[i].companyMaster || null;

        const weekoffSalaryType = companyData?.weekOffSalaryType || null;
        const weekoff_PayheadIds = companyData?.payheadMasterId || null;
        // find weekoff count

        const weekoffCount =
          calculatedAttendanceData.find((e) => e['hrLeaveType.LeaveID'] == 7)
            ?.AttnVal || 0;

        let weekoffPaid = true;

        const employeeBranch =
          usermaster[i].employeeBranches &&
          usermaster[i].employeeBranches.length > 0
            ? usermaster[i].employeeBranches[0].branchMaster
              ? usermaster[i].employeeBranches[0].branchMaster.branchName
              : ''
            : '';
        const employeeBranchAddress =
          usermaster[i].employeeBranches &&
          usermaster[i].employeeBranches.length > 0
            ? usermaster[i].employeeBranches[0].branchMaster
              ? usermaster[i].employeeBranches[0].branchMaster.branchAddress
              : ''
            : '';

        const employeeDepartment =
          usermaster[i].employeeDepartments &&
          usermaster[i].employeeDepartments.length > 0
            ? usermaster[i].employeeDepartments[0].department
              ? usermaster[i].employeeDepartments[0].department.departmentName
              : ''
            : '';
        const employeeDesignation =
          usermaster[i].employeeDesignations &&
          usermaster[i].employeeDesignations.length > 0
            ? usermaster[i].employeeDesignations[0].designation
              ? usermaster[i].employeeDesignations[0].designation
                  .designationName
              : ''
            : '';
        const employeeSalaryPolicy =
          usermaster[i].employeeSalaryPolicies &&
          usermaster[i].employeeSalaryPolicies.length > 0
            ? usermaster[i].employeeSalaryPolicies[0].salaryPolicy
            : null;

        // Bonus Policy
        const bonusPolicy =
          usermaster[i].employeeBonusPolicies?.[0]?.bonusPolicy || null;

        // Encashment Data

        const employeeLeaveEncashment = usermaster[i].leaveEncashments || [];

        // LCEG Penalty Data
        const LCEGPenaltyData = usermaster[i].lcegPenalties || [];

        // weekoff Policy

        const weekoffPolicy =
          usermaster[i].employeeWeekOffs?.[0]?.weekoff || null;

        // Expense Data
        const expenseData = usermaster[i].expensePayments || [];

        // address
        const userAddress = usermaster[i].userAddresses?.[0] || null;

        // digital Signature

        const userSignature =
          usermaster[i].employeeDigitalSignatures?.[0]?.signature || null;

        // set ESIC deduction yes or no

        const esicDeduction =
          employeeJoining &&
          employeeJoining.esicEndMonth &&
          employeeJoining.esicEndMonth !== 'undefined'
            ? employeeJoining.esicEndMonth < +yearmonth
              ? false
              : true
            : true;

        let start_date = `${year}-${String(Month).padStart(2, '0')}-01`;
        let end_date = enddate;
        let monday = temp_monday;

        // if salary policy is available
        if (employeeSalaryPolicy) {
          let date = employeeSalaryPolicy.salaryCycleDate;

          const paddedDate = String(date).padStart(2, '0');
          start_date = `${year}-${String(Month).padStart(2, '0')}-${paddedDate}`;

          // To Check salary consider Month

          if (employeeSalaryPolicy.salaryCycleConsider == 'E') {
            const tempDate = new Date(start_date);
            tempDate.setMonth(tempDate.getMonth() - 1);

            start_date =
              tempDate.getFullYear() +
              '-' +
              String(tempDate.getMonth() + 1).padStart(2, '0') +
              '-' +
              String(tempDate.getDate()).padStart(2, '0');

            // set Month days
            monday = daysInMonth(
              start_date.slice(5, 7),
              start_date.slice(0, 4),
            );
          }

          // Calculate the end date
          const startDateObj = new Date(start_date);
          startDateObj.setDate(startDateObj.getDate() + (monday - 1));

          end_date = `${startDateObj.getFullYear()}-${String(
            startDateObj.getMonth() + 1,
          ).padStart(
            2,
            '0',
          )}-${String(startDateObj.getDate()).padStart(2, '0')}`;
        }

        // set month days here

        monday = calculatedAttendanceData[0].MonDays || monday;

        // Attendancepolicy
        const userAttendacepolicy = await employeeAttendancePolicy(
          usermaster[i].userMasterID,
          end_date,
        );

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
        let dailyworkingminutes;
        let showusersalary = [];
        let overtime_min = 0;
        let employerDeduction = [];
        let EmployerSideAmount = 0;
        let employee_ctc = 0;
        let ps_employee_gross = 0;
        let ps_employee_netPay = 0;
        let ps_gross = 0;
        let ps_employee_ctc = 0;
        let ps_employerDeduction = [];
        let ps_employerSideAmount = 0;
        let ps_overtime_min = 0;

        let totaldays = calculatedAttendanceData.reduce(
          (acc, obj) => acc + +obj.AttnVal,
          0,
        );
        let salaryCalculationAct =
          allVerifiedData?.[0]?.salaryCalAct ||
          employeeJoining.salaryCalculationAct;

        const weekOffHolidayPriority =
          userAttendacepolicy?.WHPHPriority || null;

        let typeCondition =
          weekOffHolidayPriority === 'PH'
            ? offDayCategoryEnum.HOLIDAY
            : offDayCategoryEnum.WEEKOFF;

        const isAddlPaidDay = userAttendacepolicy?.isAddlPaidDay || false;

        let actualWeekoffCount = 0;
        let weekoffCounted = false;
        let substractWeekoff = true;

        const weekoffPolicyType = weekoffPolicy?.weekoffType || null;

        const WH_Condition = {
          userMasterID: usermaster[i].userMasterID,
          date: {
            [Sequelize.Op.between]: [start_date, end_date],
          },
          tableName: 'holiday',
          [Sequelize.Op.and]: Sequelize.literal(`(date, "tableName") IN (
                           SELECT date, "tableName"
                FROM "weekoffHolidayTrans"
                WHERE "userMasterID" = ${usermaster[i].userMasterID}
                  AND date BETWEEN '${start_date}' AND '${end_date}'
                  AND ("optionalHoliday" IS FALSE OR "optionalHoliday" IS NULL)
                        )`),
        };

        // find Weekoff
        if (
          weekoffPolicyType &&
          [
            weekoffTypeEnum.MONTHLYFIX,
            weekoffTypeEnum.ONPAIDDAYS,
            weekoffTypeEnum.ONPRESENTDAY,
          ].includes(weekoffPolicyType) &&
          !weekoffPolicy.isNoWeekoffPolicy
        ) {
          if (
            [weekoffTypeEnum.ONPAIDDAYS, weekoffTypeEnum.ONPRESENTDAY].includes(
              weekoffPolicyType,
            )
          )
            substractWeekoff = false;

          // if monthly fix weekoff or on present days

          weekoffCounted = true;

          actualWeekoffCount =
            +AllUserAttendanceData.find(
              (e) =>
                e.userMasterID == usermaster[i].userMasterID &&
                e['hrLeaveType.LeaveID'] == 30,
            )?.AttnVal || 0;
        } else {
          //delete tablename
          delete WH_Condition.tableName;
        }

        const tempWeekoffHoliday = await weekoffHolidayTran.findAll({
          raw: true,
          where: WH_Condition,
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

        const mappedWeekoffHolidayData =
          transformToKeyedObject(tempWeekoffHoliday);

        const weekoffCountForHourly =
          Object.keys(mappedWeekoffHolidayData?.weekoff)?.length || 0;

        if (employeeSalaryPolicy?.salarycalculationBasedon != 'hourwise') {
          if (
            typeCondition == offDayCategoryEnum.HOLIDAY &&
            isAddlPaidDay &&
            salaryCalculationAct == 'F'
          ) {
            typeCondition = offDayCategoryEnum.WEEKOFF;
          }
        }

        const weekoffHoliday = getAllWeekoffHolidayWithPriority(
          mappedWeekoffHolidayData,
          typeCondition,
        );

        if (!weekoffCounted)
          actualWeekoffCount = weekoffHoliday
            .filter((e) => e.tableName == 'weekoff')
            .reduce((acc, obj) => acc + +obj.value, 0);

        const actualHolidayCount = weekoffHoliday
          .filter((e) => e.tableName == 'holiday')
          .reduce((acc, obj) => acc + +obj.value, 0);

        // To Get UnPaid Days Of User
        const unpaidDays = calculatedAttendanceData
          .filter((e) =>
            [
              HrLeaveTypesIds.ABSENT,
              HrLeaveTypesIds.LWP,
              HrLeaveTypesIds.ATTENDANCE_PENALTY,
              HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH,
              HrLeaveTypesIds.WA,
            ].includes(e['hrLeaveType.LeaveID']),
          )
          .reduce((acc, obj) => acc + +obj.AttnVal, 0);

        let convertWorkedHoursToDays = false;
        let paidDaysForHourlySalary = 0;

        if (employeeSalaryPolicy) {
          let salaryCalculationDays =
              employeeSalaryPolicy.salaryCalculationDays,
            salarycalbasedon = employeeSalaryPolicy.salarycalculationBasedon;
          if (salaryCalculationDays && salarycalbasedon == 'daywise') {
            salary_CalculationDays = salaryCalculationDays;

            if (salaryCalculationAct == 'F' || salaryCalculationAct == 'W') {
              // weekoff is not paid
              weekoffPaid = false;
              const notpaiddata =
                salaryCalculationAct == 'F'
                  ? calculatedAttendanceData.filter((e) =>
                      [
                        HrLeaveTypesIds.ABSENT,
                        HrLeaveTypesIds.LWP,
                        HrLeaveTypesIds.WEEKOFF,
                        HrLeaveTypesIds.ATTENDANCE_PENALTY,
                        HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH,
                        HrLeaveTypesIds.WA,
                      ].includes(e['hrLeaveType.LeaveID']),
                    )
                  : calculatedAttendanceData.filter((e) =>
                      [
                        HrLeaveTypesIds.ABSENT,
                        HrLeaveTypesIds.LWP,
                        HrLeaveTypesIds.WEEKOFF,
                        HrLeaveTypesIds.HOLIDAY,
                        HrLeaveTypesIds.ATTENDANCE_PENALTY,
                        HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH,
                        HrLeaveTypesIds.WA,
                      ].includes(e['hrLeaveType.LeaveID']),
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
              const excludedLeaveIDs = [
                HrLeaveTypesIds.ABSENT,
                HrLeaveTypesIds.LWP,
                HrLeaveTypesIds.ATTENDANCE_PENALTY,
                HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH,
                HrLeaveTypesIds.WA,
              ];

              usertotalpresentday = calculatedAttendanceData.reduce(
                (acc, obj) => {
                  if (!excludedLeaveIDs.includes(obj['hrLeaveType.LeaveID'])) {
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
              convertWorkedHoursToDays =
                employeeSalaryPolicy.convertWorkedHoursToDays;
              // weekoff is not paid
              weekoffPaid = false;

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

              let monthly_Workingminutes;
              let daily_workingminutes;

              if (!employeeSalaryPolicy.monthlyFixhours) {
                let tempMonthDays = monday;

                const calculationAct =
                  allVerifiedData?.[0]?.salaryCalAct ||
                  employeeJoining.salaryCalculationAct;

                if (substractWeekoff && ['F', 'W'].includes(calculationAct)) {
                  if (calculationAct === 'F') {
                    tempMonthDays -=
                      weekoffCountForHourly > 0
                        ? Number(weekoffCountForHourly)
                        : Number(actualWeekoffCount);
                  }

                  if (calculationAct === 'W') {
                    tempMonthDays -=
                      Number(actualHolidayCount) + Number(actualWeekoffCount);
                  }
                }

                if (!employeeSalaryPolicy.dailyFixhours) {
                  if (attendance) {
                    monthly_Workingminutes =
                      Number(attendance.Shifthrs) * Number(tempMonthDays) * 60;
                    daily_workingminutes = Number(attendance.Shifthrs) * 60;
                  } else {
                    const shift = await employeeShift(
                      usermaster[i].userMasterID,
                      end_date,
                      '',
                    );

                    const shifttime = shift
                      ? await ShiftTIme.findOne({
                          where: {
                            shiftID: shift.shiftID,
                          },
                        })
                      : null;

                    monthly_Workingminutes =
                      (+shifttime?.totalhours || 8) * +tempMonthDays * 60;
                    daily_workingminutes = (+shifttime?.totalhours || 8) * 60;
                  }
                } else {
                  monthly_Workingminutes =
                    Number(employeeSalaryPolicy.dailyFixhours) *
                    Number(tempMonthDays) *
                    60;
                  daily_workingminutes =
                    Number(employeeSalaryPolicy.dailyFixhours) * 60;
                }
              } else {
                monthly_Workingminutes =
                  Number(employeeSalaryPolicy.monthlyFixhours) * 60;
                daily_workingminutes =
                  Number(monthly_Workingminutes) / Number(monday);
              }

              salary_CalculationDays = Number(monthly_Workingminutes);
              dailyworkingminutes = Number(daily_workingminutes);

              usertotalpresentday = calculatedAttendanceData.reduce(
                (acc, obj) => {
                  if (obj['hrLeaveType.LeaveID'] == 20) {
                    return acc + Number(obj.AttnVal);
                  }
                  return acc;
                },
                0,
              );

              // for calculating hourly salary converting into day wise
              if (convertWorkedHoursToDays === true) {
                const leaveIds = new Set([1, 25]);

                if (employeeSalaryPolicy.holidayHours == 'Y') {
                  leaveIds.add(9);
                  leaveIds.add(24);
                }

                if (employeeSalaryPolicy.weekoffHours == 'Y') {
                  leaveIds.add(7);
                }

                const excludeIds = new Set([5, 18, 20, 21, 22, 28, 35, 57]);

                let days = 0;

                for (const e of calculatedAttendanceData) {
                  const leaveId = +e['hrLeaveType.LeaveID'];
                  const value = Number(e.AttnVal) || 0;

                  if (leaveIds.has(leaveId)) {
                    days += value;
                  } else if (
                    employeeSalaryPolicy.leaveHours == 'Y' &&
                    !leaveIds.has(leaveId) &&
                    !excludeIds.has(leaveId)
                  ) {
                    days += value;
                  }
                }

                paidDaysForHourlySalary = days;
              }
            } else {
              if (salaryCalculationAct == 'F' || salaryCalculationAct == 'W') {
                // weekoff is not paid
                weekoffPaid = false;
                const notpaiddata =
                  salaryCalculationAct == 'F'
                    ? calculatedAttendanceData.filter((e) =>
                        [
                          HrLeaveTypesIds.ABSENT,
                          HrLeaveTypesIds.LWP,
                          HrLeaveTypesIds.WEEKOFF,
                          HrLeaveTypesIds.ATTENDANCE_PENALTY,
                          HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH,
                          HrLeaveTypesIds.WA,
                        ].includes(e['hrLeaveType.LeaveID']),
                      )
                    : calculatedAttendanceData.filter((e) =>
                        [
                          HrLeaveTypesIds.ABSENT,
                          HrLeaveTypesIds.LWP,
                          HrLeaveTypesIds.WEEKOFF,
                          HrLeaveTypesIds.HOLIDAY,
                          HrLeaveTypesIds.ATTENDANCE_PENALTY,
                          HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH,
                          HrLeaveTypesIds.WA,
                        ].includes(e['hrLeaveType.LeaveID']),
                      );

                const sumOfWeekoff =
                  salaryCalculationAct == 'F'
                    ? weekoffCountForHourly > 0
                      ? weekoffCountForHourly
                      : +actualWeekoffCount
                    : +actualWeekoffCount + +actualHolidayCount;

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

                const excludedLeaveIDs = [
                  HrLeaveTypesIds.ABSENT,
                  HrLeaveTypesIds.LWP,
                  HrLeaveTypesIds.ATTENDANCE_PENALTY,
                  HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH,
                  HrLeaveTypesIds.WA,
                ];

                usertotalpresentday = calculatedAttendanceData.reduce(
                  (acc, obj) => {
                    if (
                      !excludedLeaveIDs.includes(obj['hrLeaveType.LeaveID'])
                    ) {
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
            // weekoff is not paid
            weekoffPaid = false;
            const notpaiddata =
              salaryCalculationAct == 'F'
                ? calculatedAttendanceData.filter((e) =>
                    [
                      HrLeaveTypesIds.ABSENT,
                      HrLeaveTypesIds.LWP,
                      HrLeaveTypesIds.WEEKOFF,
                      HrLeaveTypesIds.ATTENDANCE_PENALTY,
                      HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH,
                      HrLeaveTypesIds.WA,
                    ].includes(e['hrLeaveType.LeaveID']),
                  )
                : calculatedAttendanceData.filter((e) =>
                    [
                      HrLeaveTypesIds.ABSENT,
                      HrLeaveTypesIds.LWP,
                      HrLeaveTypesIds.WEEKOFF,
                      HrLeaveTypesIds.HOLIDAY,
                      HrLeaveTypesIds.ATTENDANCE_PENALTY,
                      HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH,
                      HrLeaveTypesIds.WA,
                    ].includes(e['hrLeaveType.LeaveID']),
                  );

            const sumOfWeekoff =
              salaryCalculationAct == 'F'
                ? weekoffCountForHourly > 0
                  ? weekoffCountForHourly
                  : +actualWeekoffCount
                : +actualWeekoffCount + +actualHolidayCount;

            salary_CalculationDays = +monday - +sumOfWeekoff;

            const userabsentday = notpaiddata.reduce(
              (acc, obj) => acc + +obj.AttnVal,
              0,
            );

            usertotalpresentday =
              +totaldays - +userabsentday > 0 ? +totaldays - +userabsentday : 0;
          } else {
            salary_CalculationDays = Number(monday);

            const excludedLeaveIDs = [
              HrLeaveTypesIds.ABSENT,
              HrLeaveTypesIds.LWP,
              HrLeaveTypesIds.ATTENDANCE_PENALTY,
              HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH,
              HrLeaveTypesIds.WA,
            ];

            usertotalpresentday = calculatedAttendanceData.reduce(
              (acc, obj) => {
                if (!excludedLeaveIDs.includes(obj['hrLeaveType.LeaveID'])) {
                  return acc + Number(obj.AttnVal);
                }
                return acc;
              },
              0,
            );
          }
        }

        if (
          calculatedAttendanceData[0].monthstartdate &&
          calculatedAttendanceData[0].monthenddate
        ) {
          start_date = calculatedAttendanceData[0].monthstartdate;
          end_date = calculatedAttendanceData[0].monthenddate;
        }

        const salaryStructureBaseoncal = salarystructure[0].baseOnCalculation;

        if (
          salaryStructureBaseoncal == SalaryStructureTypeEnum.HOURLY &&
          salary_calculation_wise != 'hourwise'
        ) {
          if (userMasterID?.length == 1) {
            return res.status(statusCodes.OK).json({
              status: statusCodes.BAD_REQUEST,
              message:
                'Hourly salary policy is required to calculate salary for employees with an hourly salary structure.',
            });
          }
          continue;
        }

        // Attendance Data
        let attendanceTransData = [];

        // Fetch attendance data only if any salary structure field is set to depends on physical presence
        if (
          salarystructure.find((e) => e.salaryFieldAttanChk == 2) ||
          salaryStructureBaseoncal == 'H' ||
          salary_calculation_wise == 'hourwise' ||
          LCEGPenaltyData.find(
            (e) => e.penaltyType == LCEGPenaltyTypeEnum.MINUTE,
          ) ||
          userAttendacepolicy?.isShiftShortfall
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

        const userLateComeEarlyGoPolicy = await employeeLateEarlyPolicy(
          usermaster[i].userMasterID,
          end_date,
        );

        let PenaltyInSalary = 0;

        if (userLateComeEarlyGoPolicy) {
          const salarydetails = {
            salaryStructureBaseoncal: salaryStructureBaseoncal,
            gross: gross,
            salary_CalculationDays: salary_CalculationDays,
          };

          PenaltyInSalary = await calculatePenaltyInSalary(
            userLateComeEarlyGoPolicy,
            salarydetails,
            usermaster[i].userMasterID,
            start_date,
            end_date,
          );
        }

        const incentiveCondition = {
          userMasterID: usermaster[i].userMasterID,
          status: 1,
          incentiveDate: {
            [Sequelize.Op.between]: [start_date, end_date],
          },
        };

        const incentiveTypeCondition = {};

        if (from == 'FNF') {
          // Either payInFNF+payModeInFNF matches, OR the incentive type is flagged for salary slip
          incentiveCondition[Sequelize.Op.or] = [
            {
              payInFNF: true,
              payModeInFNF: incentivePayModeEnum.SALARY,
            },
            {
              '$incentivetype.showinsalaryslip$': 'true',
            },
          ];
        } else {
          // Non-FNF: showinsalaryslip is a hard requirement
          incentiveTypeCondition.showinsalaryslip = 'true';
        }

        // start transaction
        await sequelize.transaction(async (t) => {
          const [advanceData, loanData, incentiveData, penaltydata, overtime] =
            await Promise.all([
              advancePayment.findAll({
                where: {
                  userMasterID: usermaster[i].userMasterID,
                  paymentYearMonth: yearmonth,
                  status: 1,
                  AdvanceStatus: 1,
                },
                attributes: ['advancePaymentID', 'amount'],
                include: [{ model: EmployeeRepayment, attributes: ['amount'] }],
              }),
              LoanTransactions.findAll({
                raw: true,
                where: {
                  EMIMonth: yearmonth,
                  status: 1,
                  loanAdvanceId: {
                    [Sequelize.Op.is]: null,
                  },
                },
                include: [
                  {
                    required: true,
                    model: LoanMaster,
                    where: {
                      userMasterID: usermaster[i].userMasterID,
                      status: 1,
                      loanstatus: 1,
                    },
                    attributes: [],
                  },
                ],
                attributes: ['LoanTrasactionId', 'EMIAmount'],
              }),
              Employeeincentive.findAll({
                where: incentiveCondition,
                include: [
                  { model: Incentivetype, where: incentiveTypeCondition },
                  { model: ExtraDays, attributes: ['days'] },
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
              overTimeCalculationMain.findOne({
                raw: true,
                where: {
                  userMasterID: usermaster[i].userMasterID,
                  yyyymm: yearmonth,
                },
              }),
            ]);

          const totalExtraDays = incentiveData.reduce(
            (sum, item) =>
              sum + (item.extraDays || []).reduce((s, d) => s + d.days, 0),
            0,
          );

          // Deposit Data

          const deposits = usermaster[i].deposits || [];

          const depositToDeduction = deposits.filter(
            (e) => e.depositReceiveAs == 'salary' && e.salaryMonth == yearmonth,
          );

          const depositToPay =
            from == 'FNF'
              ? deposits.filter((e) => e.salaryMonthToPay == yearmonth)
              : deposits.filter(
                  (e) =>
                    e.payModeInFNF == depositPayModeEnum.SALARY &&
                    e.payInFNF == true,
                );

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

            const actualWeekoff = +actualWeekoffCount;

            const actualHoliday = +actualHolidayCount;

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

          let BonusPayData = null;
          let addCurrentBonusId = false;
          let BonusIds = [];
          let weekoffSalaryCalculated = false;

          // set weekoff salary calculated is or not

          const findWeekoffPayhead = salarystructure.find(
            (e) => e.payheadMasterId == 147,
          );

          if (
            weekoffSalaryType == WeekOffSalaryTypeEnum.SEPARATE &&
            salary_calculation_wise != 'hourwise' &&
            weekoffPaid &&
            weekoffCount &&
            findWeekoffPayhead
          )
            weekoffSalaryCalculated = true;

          let calculateEsicOnGross = false;
          let expensePaymentId = [];
          const tdsDeductionFlag = Boolean(
            usermaster[i].companyMaster?.tdsdeduction &&
              usermaster[i].tdsDeduction,
          );
          let employee_lwf = null;
          let employer_lwf = null;

          // ----------------------------- Set Payroll Statutory flag for calculation----------------------

          const ps_calculate =
            isPayrollStatutory &&
            payrollStatutory &&
            salary_calculation_wise != 'hourwise' &&
            isSameGrade;
          const extraAmountMode = isPayrollStatutory
            ? usermaster[i].companyMaster?.PSC?.[0]?.adjustMode || null
            : null;

          let payrollStatutoryArray = [];
          const ps_incentiveArray = [];
          const ps_penaltyArray = [];
          const ps_depositArray = [];
          const ps_depositPayArray = [];
          let ps_extraRemainingAmount = 0;
          let ps_extra_days = 0;
          let ps_unpaidDays = 0;
          let ps_attendanceCalData = [];
          let ps_paidDays = 0;
          let ps_overtimeAmount = 0;
          let ps_OtherEmployee_ESIC_Amount = 0;
          let ps_OtherEmployer_ESIC_Amount = 0;
          let ps_ESIC_CalculatedOn_Amount = 0;
          let is_ps_days_calculated = false;
          let earningAmountFor_ps = 0;

          // month wise salary calculation
          if (salarystructure[0].baseOnCalculation == 'M') {
            let incentiveArray = [];
            let finalinsentivearray = [];
            let finalpenaltyarray = [];
            let overtimeArray = [];

            let overtimeAmount = 0;
            let esicIncentiveAmount = 0;
            let pfIncentiveAmount = 0;
            let OtherEmployee_ESIC_Amount = 0;
            let OtherEmployer_ESIC_Amount = 0;
            let ESIC_CalculatedOn_Amount = 0;

            for (let j = 0; j < salarystructure.length; j++) {
              let finalsalary = 0;

              if (salarystructure[j].payheadMasterId == 16) {
                //Advance

                finalsalary = advanceData.reduce((acc, item) => {
                  const childSum = (item.employeeRepayments || []).reduce(
                    (sum, child) => sum + +child.amount,
                    0,
                  );
                  return acc + (+item.amount - +childSum);
                }, 0);

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: finalsalary > 0 ? Math.round(finalsalary) : 0,
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(ps_data, finalsalary, null);

                    payrollStatutoryArray.push(obj);
                  }
                }
              } else if (salarystructure[j].payheadMasterId == 17) {
                //Loan

                finalsalary = loanData.reduce(
                  (acc, obj) => acc + +obj.EMIAmount,
                  0,
                );

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: Math.round(finalsalary),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(ps_data, finalsalary, null);

                    payrollStatutoryArray.push(obj);
                  }
                }
              } else if (salarystructure[j].payheadMasterId == 24) {
                // Incentive

                let ps_incentive = false;
                let ps_data = null;

                if (ps_calculate) {
                  ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) ps_incentive = true;
                }

                let incentive = incentiveData;

                let incentiveid = [];
                let amountarray = [];
                if (incentive.length > 0) {
                  for (let a = 0; a < incentive.length; a++) {
                    amountarray.push(+incentive[a].amount);

                    const incentiveName = incentive[a].incentivetype
                      .inc_type_displayName
                      ? incentive[a].incentivetype.inc_type_displayName
                      : incentive[a].incentivetype.incentivetypename;

                    // FOR ESIC
                    if (incentive[a].incentivetype.esicApplicable == 'true') {
                      OtherEmployee_ESIC_Amount +=
                        (+incentive[a].amount *
                          +incentive[a].incentivetype.employeeESICPer) /
                        100;
                      OtherEmployer_ESIC_Amount +=
                        (+incentive[a].amount *
                          +incentive[a].incentivetype.employerESICPer) /
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

                      if (incentive[a].incentivetype.consider == 'gross') {
                        if (incentive[a].incentivetype.pfApplicable == 'true') {
                          pfIncentiveAmount =
                            +pfIncentiveAmount + +incentive[a].amount;
                        }

                        if (
                          incentive[a].incentivetype.esicApplicable == 'true'
                        ) {
                          esicIncentiveAmount =
                            +esicIncentiveAmount + +incentive[a].amount;
                        }

                        userSalaryArray = userSalaryArray.filter((e) => {
                          return e.incentiveid != incentive[a].IncentivetypeID;
                        });

                        userSalaryArray.push({
                          salaryMasterID: salarystructure[j].salaryMasterID,
                          payheadmasterid: salarystructure[j].payheadMasterId,
                          payheadName: incentiveName,
                          employeeAmount: Math.round(totalAmount),
                          salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                          salaryfieldside: salarystructure[j].salaryFieldSide,
                          salaryfieldshow: salarystructure[j].salaryFieldShow,
                          calculatedOn: null,
                          salaryfieldmaxrange:
                            salarystructure[j].salaryfieldmaxrange,
                          incentiveid: incentive[a].IncentivetypeID,
                        });

                        // ------------------------payroll statutory -------------------

                        if (ps_incentive) {
                          payrollStatutoryArray = payrollStatutoryArray.filter(
                            (e) => {
                              return (
                                e.incentiveid != incentive[a].IncentivetypeID
                              );
                            },
                          );

                          const obj = ps_structuredData(
                            ps_data,
                            totalAmount,
                            null,
                            incentiveName,
                          );
                          obj.incentiveid = incentive[a].IncentivetypeID;
                          obj.considerIn =
                            incentive[a].incentivetype.consider == 'gross'
                              ? salaryConsiderInEnum.GROSS
                              : salaryConsiderInEnum.NET_SALARY;

                          payrollStatutoryArray.push(obj);
                        }
                      }

                      incentiveArray = incentiveArray.filter((e) => {
                        return e.incentiveid != incentive[a].IncentivetypeID;
                      });

                      incentiveArray.push({
                        salaryMasterID: salarystructure[j].salaryMasterID,
                        payheadmasterid: salarystructure[j].payheadMasterId,
                        payheadName: incentiveName,
                        employeeAmount: Math.round(totalAmount),
                        salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                        salaryfieldside: salarystructure[j].salaryFieldSide,
                        salaryfieldshow: salarystructure[j].salaryFieldShow,
                        calculatedOn: null,
                        salaryfieldmaxrange:
                          salarystructure[j].salaryfieldmaxrange,
                        incentiveid: incentive[a].IncentivetypeID,
                      });
                    } else {
                      incentiveid.push(incentive[a].IncentivetypeID);

                      if (incentive[a].incentivetype.consider == 'gross') {
                        if (incentive[a].incentivetype.pfApplicable == 'true') {
                          pfIncentiveAmount =
                            +pfIncentiveAmount + +incentive[a].amount;
                        }

                        if (
                          incentive[a].incentivetype.esicApplicable == 'true'
                        ) {
                          esicIncentiveAmount =
                            +esicIncentiveAmount + +incentive[a].amount;
                        }

                        userSalaryArray.push({
                          salaryMasterID: salarystructure[j].salaryMasterID,
                          payheadmasterid: salarystructure[j].payheadMasterId,
                          payheadName: incentiveName,
                          employeeAmount: Math.round(incentive[a].amount),
                          salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                          salaryfieldside: salarystructure[j].salaryFieldSide,
                          salaryfieldshow: salarystructure[j].salaryFieldShow,
                          calculatedOn: null,
                          salaryfieldmaxrange:
                            salarystructure[j].salaryfieldmaxrange,
                          incentiveid: incentive[a].IncentivetypeID,
                        });
                      }

                      // ------------------------payroll statutory -------------------

                      if (ps_incentive) {
                        const obj = ps_structuredData(
                          ps_data,
                          incentive[a].amount,
                          null,
                          incentiveName,
                        );
                        obj.incentiveid = incentive[a].IncentivetypeID;
                        obj.considerIn =
                          incentive[a].incentivetype.consider == 'gross'
                            ? salaryConsiderInEnum.GROSS
                            : salaryConsiderInEnum.NET_SALARY;
                        payrollStatutoryArray.push(obj);
                      }

                      incentiveArray.push({
                        salaryMasterID: salarystructure[j].salaryMasterID,
                        payheadmasterid: salarystructure[j].payheadMasterId,
                        payheadName: incentiveName,
                        employeeAmount: Math.round(incentive[a].amount),
                        salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                        salaryfieldside: salarystructure[j].salaryFieldSide,
                        salaryfieldshow: salarystructure[j].salaryFieldShow,
                        calculatedOn: null,
                        salaryfieldmaxrange:
                          salarystructure[j].salaryfieldmaxrange,
                        incentiveid: incentive[a].IncentivetypeID,
                      });
                    }
                  }

                  let finalamount = amountarray.reduce((acc, obj) => {
                    return acc + obj;
                  }, 0);

                  finalinsentivearray.push({
                    salaryMasterID: salarystructure[j].salaryMasterID,
                    payheadmasterid: salarystructure[j].payheadMasterId,
                    payheadName:
                      salarystructure[j].payheadDisplayName &&
                      salarystructure[j].payheadDisplayName.trim()
                        ? salarystructure[j].payheadDisplayName.trim()
                        : salarystructure[j].payheadName,
                    employeeAmount: Math.round(finalamount),
                    salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                    salaryfieldside: salarystructure[j].salaryFieldSide,
                    salaryfieldshow: salarystructure[j].salaryFieldShow,
                    calculatedOn: null,
                    salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
                    incentiveid: null,
                  });

                  // ------------------------ payroll statutory -------------------

                  if (ps_incentive) {
                    const obj = ps_structuredData(
                      ps_data,
                      finalamount,
                      null,
                      null,
                    );
                    ps_incentiveArray.push(obj);
                  }
                } else {
                  userSalaryArray.push({
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
                  });

                  //---------------------- for payroll statutory --------------

                  if (ps_calculate) {
                    const ps_data =
                      payrollStatutoryDetails?.get(
                        salarystructure[j].payheadMasterId,
                      ) || null;

                    if (ps_data) {
                      const obj = ps_structuredData(ps_data, 0, null, null);

                      payrollStatutoryArray.push(obj);
                    }
                  }
                }
              } else if (salarystructure[j].payheadMasterId == 34) {
                // Penalty

                if (penaltydata.length > 0) {
                  // Step 1: Group penalties by penaltyID and sum amounts
                  const penaltyMap = new Map();

                  penaltydata.forEach((penalty) => {
                    const existing = penaltyMap.get(penalty.penaltyID);
                    if (existing) {
                      existing.amount += Number(penalty.amount);
                    } else {
                      penaltyMap.set(penalty.penaltyID, {
                        penaltyID: penalty.penaltyID,
                        penaltyName: penalty.penaltyName,
                        amount: Number(penalty.amount),
                      });
                    }
                  });

                  // Step 2: Add grouped penalties to userSalaryArray (rounded per penalty type)
                  penaltyMap.forEach((penalty) => {
                    userSalaryArray.push({
                      salaryMasterID: salarystructure[j].salaryMasterID,
                      payheadmasterid: salarystructure[j].payheadMasterId,
                      payheadName: penalty.penaltyName,
                      employeeAmount: Math.round(penalty.amount), // Round after summing
                      salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                      salaryfieldside: salarystructure[j].salaryFieldSide,
                      salaryfieldshow: salarystructure[j].salaryFieldShow,
                      calculatedOn: null,
                      salaryfieldmaxrange:
                        salarystructure[j].salaryfieldmaxrange,
                      penaltyid: penalty.penaltyID,
                    });

                    //---------------------- for payroll statutory --------------

                    if (ps_calculate) {
                      const ps_data =
                        payrollStatutoryDetails?.get(
                          salarystructure[j].payheadMasterId,
                        ) || null;

                      if (ps_data) {
                        const obj = ps_structuredData(
                          ps_data,
                          Math.round(penalty.amount),
                          null,
                          penalty.penaltyName,
                        );

                        payrollStatutoryArray.push(obj);
                      }
                    }
                  });

                  // Step 3: Calculate total penalty amount for finalpenaltyarray
                  const totalPenaltyAmount = Array.from(
                    penaltyMap.values(),
                  ).reduce((sum, penalty) => sum + penalty.amount, 0);

                  finalpenaltyarray.push({
                    salaryMasterID: salarystructure[j].salaryMasterID,
                    payheadmasterid: salarystructure[j].payheadMasterId,
                    payheadName:
                      salarystructure[j].payheadDisplayName &&
                      salarystructure[j].payheadDisplayName.trim()
                        ? salarystructure[j].payheadDisplayName.trim()
                        : salarystructure[j].payheadName,
                    employeeAmount: Math.round(totalPenaltyAmount), // Round total
                    salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                    salaryfieldside: salarystructure[j].salaryFieldSide,
                    salaryfieldshow: salarystructure[j].salaryFieldShow,
                    calculatedOn: null,
                    salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
                    penaltyid: null,
                  });

                  //---------------------- for payroll statutory --------------

                  if (ps_calculate) {
                    const ps_data =
                      payrollStatutoryDetails?.get(
                        salarystructure[j].payheadMasterId,
                      ) || null;

                    if (ps_data) {
                      const obj = ps_structuredData(
                        ps_data,
                        Math.round(totalPenaltyAmount),
                        null,
                        null,
                      );

                      ps_penaltyArray.push(obj);
                    }
                  }
                } else {
                  userSalaryArray.push({
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
                  });

                  //---------------------- for payroll statutory --------------

                  if (ps_calculate) {
                    const ps_data =
                      payrollStatutoryDetails?.get(
                        salarystructure[j].payheadMasterId,
                      ) || null;

                    if (ps_data) {
                      const obj = ps_structuredData(ps_data, 0, null, null);

                      payrollStatutoryArray.push(obj);
                    }
                  }
                }
              } else if (salarystructure[j].payheadMasterId == 9) {
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
                    overtime_min = +overtime.overtimehrs;
                    overtimeAmount = Number(overtime.TotalAmount);

                    if (consider == 'gross') {
                      //For ESIC
                      if (esicApplicable == 'true') {
                        OtherEmployee_ESIC_Amount +=
                          (+overtimeAmount *
                            +userAttendacepolicy.employeeESICPer) /
                          100;
                        OtherEmployer_ESIC_Amount +=
                          (+overtimeAmount *
                            +userAttendacepolicy.employerESICPer) /
                          100;
                        ESIC_CalculatedOn_Amount += +overtimeAmount;
                      }

                      userSalaryArray.push({
                        salaryMasterID: salarystructure[j].salaryMasterID,
                        payheadmasterid: salarystructure[j].payheadMasterId,
                        payheadName:
                          salarystructure[j].payheadDisplayName &&
                          salarystructure[j].payheadDisplayName.trim()
                            ? salarystructure[j].payheadDisplayName.trim()
                            : salarystructure[j].payheadName,
                        employeeAmount: Number(overtime.TotalAmount),
                        salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                        salaryfieldside: salarystructure[j].salaryFieldSide,
                        salaryfieldshow: salarystructure[j].salaryFieldShow,
                        calculatedOn: null,
                        salaryfieldmaxrange:
                          salarystructure[j].salaryfieldmaxrange,
                      });
                    } else {
                      overtimeArray.push({
                        salaryMasterID: salarystructure[j].salaryMasterID,
                        payheadmasterid: salarystructure[j].payheadMasterId,
                        payheadName:
                          salarystructure[j].payheadDisplayName &&
                          salarystructure[j].payheadDisplayName.trim()
                            ? salarystructure[j].payheadDisplayName.trim()
                            : salarystructure[j].payheadName,
                        employeeAmount: Number(overtime.TotalAmount),
                        salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                        salaryfieldside: salarystructure[j].salaryFieldSide,
                        salaryfieldshow: salarystructure[j].salaryFieldShow,
                        calculatedOn: null,
                        salaryfieldmaxrange:
                          salarystructure[j].salaryfieldmaxrange,
                      });
                    }

                    //---------------------- for payroll statutory --------------

                    if (ps_calculate) {
                      const ps_data =
                        payrollStatutoryDetails?.get(
                          salarystructure[j].payheadMasterId,
                        ) || null;

                      if (ps_data) {
                        const obj = ps_structuredData(
                          ps_data,
                          +overtime.TotalAmount,
                          null,
                          null,
                        );
                        obj.considerIn =
                          consider != 'gross'
                            ? salaryConsiderInEnum.NET_SALARY
                            : salaryConsiderInEnum.GROSS;

                        payrollStatutoryArray.push(obj);
                      }
                    }
                  } else {
                    userSalaryArray.push({
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
                      salaryfieldmaxrange:
                        salarystructure[j].salaryfieldmaxrange,
                    });

                    //---------------------- for payroll statutory --------------

                    if (ps_calculate) {
                      const ps_data =
                        payrollStatutoryDetails?.get(
                          salarystructure[j].payheadMasterId,
                        ) || null;

                      if (ps_data) {
                        const obj = ps_structuredData(ps_data, 0, null, null);

                        payrollStatutoryArray.push(obj);
                      }
                    }
                  }
                } else {
                  userSalaryArray.push({
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
                  });

                  //---------------------- for payroll statutory --------------

                  if (ps_calculate) {
                    const ps_data =
                      payrollStatutoryDetails?.get(
                        salarystructure[j].payheadMasterId,
                      ) || null;

                    if (ps_data) {
                      const obj = ps_structuredData(ps_data, 0, null, null);

                      payrollStatutoryArray.push(obj);
                    }
                  }
                }
              } else if (salarystructure[j].payheadMasterId == 15) {
              } else if (salarystructure[j].payheadMasterId == 13) {
              } else if (salarystructure[j].payheadMasterId == 14) {
              } else if (
                salarystructure[j].payheadMasterId ==
                payheadMasterIdsMapping.EMPLOYEE_LWF
              ) {
                employee_lwf = salarystructure[j];
              } else if (
                salarystructure[j].payheadMasterId ==
                payheadMasterIdsMapping.EMPLOYER_LWF
              ) {
                employer_lwf = salarystructure[j];
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

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: Math.round(finalsalary),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(ps_data, finalsalary, null);

                    payrollStatutoryArray.push(obj);
                  }
                }
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

                depositToDeductionArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: Math.round(finalsalary),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: null,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const ps_result = Object.values(
                      depositToDeduction.reduce((acc, curr) => {
                        if (!acc[curr.depositcategory.depositcategoryname]) {
                          acc[curr.depositcategory.depositcategoryname] =
                            ps_structuredData(ps_data, 0, null, null);
                        }
                        acc[
                          curr.depositcategory.depositcategoryname
                        ].employeeAmount += curr.amount; // Sum the amount
                        return acc;
                      }, {}),
                    );

                    payrollStatutoryArray = [
                      ...payrollStatutoryArray,
                      ...ps_result,
                    ];

                    const data = ps_structuredData(
                      ps_data,
                      finalsalary,
                      null,
                      null,
                    );

                    ps_depositArray.push(data);
                  }
                }
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

                depositToPayArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: Math.round(finalsalary),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: null,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const ps_result = Object.values(
                      depositToPay.reduce((acc, curr) => {
                        if (!acc[curr.depositcategory.depositcategoryname]) {
                          acc[curr.depositcategory.depositcategoryname] =
                            ps_structuredData(ps_data, 0, null, null);
                        }
                        acc[
                          curr.depositcategory.depositcategoryname
                        ].employeeAmount += curr.amount; // Sum the amount
                        return acc;
                      }, {}),
                    );

                    payrollStatutoryArray = [
                      ...payrollStatutoryArray,
                      ...ps_result,
                    ];

                    const data = ps_structuredData(
                      ps_data,
                      finalsalary,
                      null,
                      null,
                    );

                    ps_depositPayArray.push(data);
                  }
                }
              } else if (salarystructure[j].payheadMasterId == 67) {
                // Leave Encashment

                const { amount, encashIds } = calculateLeaveEncashment(
                  allEmployeeLeavePolicy,
                  AllHrleaveTypes,
                  employeeLeaveEncashment,
                  AllsalarystructureData,
                  salary_calculation_wise,
                  salary_CalculationDays,
                  dailyworkingminutes || 0,
                );

                // set encashids
                finalEncashIds = encashIds;

                // for esic
                if (
                  salarystructure[j].considerIn !=
                  payheadConsiderInEnum.NETSALARY
                ) {
                  OtherEmployee_ESIC_Amount +=
                    (Math.round(amount) * 0.75) / 100;
                  OtherEmployer_ESIC_Amount +=
                    (Math.round(amount) * 3.25) / 100;
                }

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: Math.round(amount),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: null,
                  considerIn: salarystructure[j].considerIn,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const data = ps_structuredData(
                      ps_data,
                      Math.round(amount),
                      null,
                      null,
                    );
                    data.considerIn = salarystructure[j].considerIn;

                    payrollStatutoryArray.push(data);
                  }
                }
              } else if (salarystructure[j].payheadMasterId == 101) {
                BonusPayData = salarystructure[j];
              }
              // Weekoff Salary
              else if (salarystructure[j].payheadMasterId == 147) {
                let amount = 0;

                if (weekoffSalaryCalculated) {
                  amount = calculateWeekoffSalary(
                    weekoff_PayheadIds,
                    weekoffCount,
                    CTC_GROSS_NET,
                    salarystructure,
                    salary_CalculationDays,
                    'Monthly',
                  );
                }

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: Math.round(amount),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: null,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(ps_data, amount, null);

                    payrollStatutoryArray.push(obj);
                  }
                }
              }

              // Expense Reimbursement
              else if (salarystructure[j].payheadMasterId == 116) {
                const expenseAmount = expenseData.reduce(
                  (acc, obj) => acc + +obj.amount,
                  0,
                );

                expensePaymentId = expenseData.map((e) => e.ExpensePaymentID);

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: getRoundOffSalary(
                    expenseAmount,
                    salarystructure[j].salaryFieldRound,
                    salarystructure[j].roundOffType,
                    salarystructure[j].salaryFieldRoundNo,
                  ),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: null,
                  considerIn: salarystructure[j].considerIn,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(ps_data, finalsalary, null);
                    (obj.considerIn = salarystructure[j].considerIn),
                      payrollStatutoryArray.push(obj);
                  }
                }
              }
              // Paid Leave Hrs
              else if (
                salarystructure[j].payheadMasterId ==
                payheadMasterIdsMapping.PAID_LEAVE_HOURS
              ) {
                let paidLeaveAmount = 0;

                if (
                  salary_calculation_wise === 'hourwise' &&
                  !convertWorkedHoursToDays &&
                  paidLeaveMinutes > 0
                ) {
                  paidLeaveAmount = calculatePaidLeaveHours(
                    gross,
                    salaryStructureBaseoncal,
                    dailyworkingminutes,
                    salary_CalculationDays,
                    paidLeaveMinutes,
                  );
                }

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: getRoundOffSalary(
                    paidLeaveAmount,
                    salarystructure[j].salaryFieldRound,
                    salarystructure[j].roundOffType,
                    salarystructure[j].salaryFieldRoundNo,
                  ),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: null,
                  considerIn: salarystructure[j].considerIn,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(
                      ps_data,
                      paidLeaveAmount,
                      null,
                      null,
                    );
                    (obj.considerIn = salarystructure[j].considerIn),
                      payrollStatutoryArray.push(obj);
                  }
                }
              }

              // SHORT FALL HOURS
              else if (
                salarystructure[j].payheadMasterId ==
                payheadMasterIdsMapping.SHORT_FALL_HOURS
              ) {
                const amount = shortFallHoursCalculation(
                  salary_CalculationDays,
                  gross,
                  salaryStructureBaseoncal,
                  salary_calculation_wise,
                  attendanceTransData,
                );

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: getRoundOffSalary(
                    amount,
                    salarystructure[j].salaryFieldRound,
                    salarystructure[j].roundOffType,
                    salarystructure[j].salaryFieldRoundNo,
                  ),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: null,
                  considerIn: salarystructure[j].considerIn,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(ps_data, amount, null, null);
                    (obj.considerIn = salarystructure[j].considerIn),
                      payrollStatutoryArray.push(obj);
                  }
                }
              } else {
                const RA_payheadMasterId = salarystructure[j]
                  .remainingAmtSalaryFieldID
                  ? salarystructure.find(
                      (e) =>
                        e.salaryFieldID ==
                        salarystructure[j].remainingAmtSalaryFieldID,
                    )?.payheadMasterId
                  : null;

                let unpaidDaysCal = +remainingDays + +unpaidDays;

                // add weekoff count in unpaid days
                if (weekoffSalaryCalculated) unpaidDaysCal += +weekoffCount;

                // let ps_data = null;
                // let ps_finalsalary = 0;
                // // check depends on att
                // if (ps_calculate) {
                //   ps_data =
                //     payrollStatutoryDetails?.get(
                //       salarystructure[j].payheadMasterId,
                //     ) || null;
                // }

                if (salarystructure[j].salaryFieldAttanChk == 0) {
                  finalsalary = +salarystructure[j].ActualEmployeeSalaryAmount;
                } else if (salarystructure[j].salaryFieldAttanChk == 2) {
                  // if physical Attndance

                  // --------------------- for AMMAN ASSOCIATED SERVICES PRIVATE LIMITED ----------------
                  if (usermaster[i].companyMasterId == 1446)
                    calculateEsicOnGross = true;

                  finalsalary =
                    (+salarystructure[j].ActualEmployeeSalaryAmount / 31) *
                    +attendanceTransData.length;
                } else {
                  if (salary_calculation_wise == 'hourwise') {
                    const actualSalary =
                      +salarystructure[j].ActualEmployeeSalaryAmount || 0;
                    const calculationDays = salary_CalculationDays || 1;

                    if (convertWorkedHoursToDays) {
                      const oneDayGross =
                        (actualSalary / +calculationDays) *
                        +dailyworkingminutes;

                      finalsalary = oneDayGross * +paidDaysForHourlySalary;
                    } else {
                      const oneMinuteSalary = actualSalary / +calculationDays;

                      finalsalary = oneMinuteSalary * +usertotalpresentday;
                    }
                  } else {
                    let onedaysalary =
                      Number(salarystructure[j].ActualEmployeeSalaryAmount) /
                      Number(salary_CalculationDays);

                    finalsalary = LWP_flag
                      ? +salarystructure[j].ActualEmployeeSalaryAmount
                      : +salarystructure[j].ActualEmployeeSalaryAmount -
                        Number(onedaysalary) * unpaidDaysCal;

                    if (+finalsalary < 0) finalsalary = 0;

                    // ------------------------ payroll statutory -------------------------------

                    // if (ps_calculate && ps_data) {
                    //   if (LWP_flag) {
                    //     ps_finalsalary =
                    //       +salarystructure[j].ActualEmployeeSalaryAmount;
                    //   } else {
                    //     const ps_perDaySalary =
                    //       +ps_data.ActualEmployeeSalaryAmount /
                    //       +salary_CalculationDays;

                    //     if (is_ps_days_calculated) {
                    //       ps_finalsalary =
                    //         +ps_data.ActualEmployeeSalaryAmount -
                    //         Number(ps_perDaySalary) * ps_unpaidDays;

                    //       if (
                    //         salarystructure[j].salaryFieldSrNo ==
                    //         salaryFieldSrNoFields.EARNING
                    //       ) {
                    //         const diff = finalsalary - ps_finalsalary;
                    //         ps_extraRemainingAmount += +diff;
                    //       }
                    //     } else {
                    //       const { matchedSalary, diffAmount, diffDays } =
                    //         calculateSalaryMatch(
                    //           finalsalary,
                    //           unpaidDays,
                    //           ps_perDaySalary,
                    //           +ps_data.ActualEmployeeSalaryAmount,
                    //         );
                    //       ps_finalsalary = matchedSalary;
                    //       ps_extra_days = diffDays;
                    //       ps_extraRemainingAmount = diffAmount;
                    //       is_ps_days_calculated = true;

                    //       ps_unpaidDays = Math.max(unpaidDays - diffDays, 0);
                    //     }
                    //   }
                    // }
                  }
                }

                // pf

                if (
                  salarystructure[j].payheadMasterId == 4 ||
                  salarystructure[j].payheadMasterId == 5 ||
                  salarystructure[j].payheadMasterId == 12 ||
                  salarystructure[j].payheadMasterId == 25 ||
                  salarystructure[j].payheadMasterId == 66
                ) {
                  let pf = 0;

                  if ([4, 12].includes(salarystructure[j].payheadMasterId)) {
                    pf =
                      (Number(salarystructure[j].ActualEmployeeSalaryAmount) *
                        100) /
                      (salarystructure[j].payheadMasterId == 4 ? 12 : 8.33);
                  }

                  let calculatedOn =
                    (Number(pf) / Number(salary_CalculationDays)) *
                    (salary_calculation_wise == 'hourwise'
                      ? convertWorkedHoursToDays
                        ? +dailyworkingminutes * +paidDaysForHourlySalary
                        : Number(usertotalpresentday)
                      : salary_CalculationDays - unpaidDaysCal);

                  userSalaryArray.push({
                    salaryMasterID: salarystructure[j].salaryMasterID,
                    payheadmasterid: salarystructure[j].payheadMasterId,
                    payheadName:
                      salarystructure[j].payheadDisplayName &&
                      salarystructure[j].payheadDisplayName.trim()
                        ? salarystructure[j].payheadDisplayName.trim()
                        : salarystructure[j].payheadName,
                    employeeAmount: +finalsalary,
                    salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                    salaryfieldside: salarystructure[j].salaryFieldSide,
                    salaryfieldshow: salarystructure[j].salaryFieldShow,
                    calculatedOn: [4, 12].includes(
                      salarystructure[j].payheadMasterId,
                    )
                      ? +calculatedOn
                      : null,
                    salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
                    salaryFieldRound: salarystructure[j].salaryFieldRound,
                    salaryFieldRoundNo: salarystructure[j].salaryFieldRoundNo,
                    roundOffType: salarystructure[j].roundOffType,
                    considerIn: salarystructure[j].considerIn,
                    RA_payheadMasterId,
                    actualAmount: salarystructure[j].ActualEmployeeSalaryAmount,
                  });

                  // // -------------------------Payroll Statutory -------------------------
                  // if (ps_calculate && ps_data) {
                  //   let ps_calculatedOn = null;
                  //   if ([4, 12].includes(salarystructure[j].payheadMasterId)) {
                  //     const ps_pf =
                  //       (Number(ps_data.ActualEmployeeSalaryAmount) * 100) /
                  //       (ps_data.GSS.HSF.payheadMasterId == 4 ? 12 : 8.33);

                  //     ps_calculatedOn =
                  //       (Number(ps_pf) / Number(salary_CalculationDays)) *
                  //       (salary_CalculationDays - ps_unpaidDays);
                  //   }

                  //   const obj = ps_structuredData(
                  //     ps_data,
                  //     ps_finalsalary,
                  //     ps_calculatedOn,
                  //     null,
                  //     false,
                  //   );
                  //   obj.salaryFieldRound = ps_data.GSS.HSF.salaryFieldRound;
                  //   obj.salaryFieldRoundNo = ps_data.GSS.HSF.salaryFieldRoundNo;
                  //   obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                  //   obj.considerIn = ps_data.GSS.HSF.considerIn;

                  //   payrollStatutoryArray.push(obj);
                  // }
                } else {
                  // check salary field round

                  if (salarystructure[j].salaryFieldRound == 'Y') {
                    finalsalary =
                      salarystructure[j].roundOffType == 0
                        ? Math.ceil(finalsalary.toFixed(2))
                        : Math.round(finalsalary);
                  } else {
                    let salaryfieldroundno = Number(
                      !salarystructure[j].salaryFieldRoundNo
                        ? 0
                        : salarystructure[j].salaryFieldRoundNo,
                    );
                    finalsalary = Number(
                      finalsalary.toFixed(salaryfieldroundno),
                    );
                  }
                  if (salarystructure[j].salaryFieldWhenMonth[0] != 0) {
                    let currentmonth = Month;

                    if (Number(currentmonth) < 10) {
                      currentmonth = Month.slice(1);
                    }

                    let whencalculation =
                      salarystructure[j].salaryFieldWhenMonth;
                    whencalculation = whencalculation.filter((s) => {
                      return s == currentmonth;
                    });

                    if (whencalculation.length > 0) {
                      userSalaryArray.push({
                        salaryMasterID: salarystructure[j].salaryMasterID,
                        payheadmasterid: salarystructure[j].payheadMasterId,
                        payheadName:
                          salarystructure[j].payheadDisplayName &&
                          salarystructure[j].payheadDisplayName.trim()
                            ? salarystructure[j].payheadDisplayName.trim()
                            : salarystructure[j].payheadName,
                        employeeAmount: finalsalary,
                        salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                        salaryfieldside: salarystructure[j].salaryFieldSide,
                        salaryfieldshow: salarystructure[j].salaryFieldShow,
                        calculatedOn: null,
                        salaryfieldmaxrange:
                          salarystructure[j].salaryfieldmaxrange,
                        salaryFieldRound: salarystructure[j].salaryFieldRound,
                        salaryFieldRoundNo:
                          salarystructure[j].salaryFieldRoundNo,
                        roundOffType: salarystructure[j].roundOffType,
                        considerIn: salarystructure[j].considerIn,
                        RA_payheadMasterId,
                      });

                      //---------------------- for payroll statutory --------------

                      if (
                        salarystructure[j].salaryFieldSrNo ==
                          salaryFieldSrNoFields.EARNING &&
                        ps_calculate
                      ) {
                        earningAmountFor_ps += +finalsalary;
                      }

                      // if (ps_calculate && ps_data) {
                      //   const obj = ps_structuredData(
                      //     ps_data,
                      //     ps_finalsalary,
                      //     null,
                      //     null,
                      //     true,
                      //   );
                      //   (obj.considerIn = salarystructure[j].considerIn),
                      //     (obj.salaryFieldRound =
                      //       ps_data.GSS.HSF.salaryFieldRound);
                      //   obj.salaryFieldRoundNo =
                      //     ps_data.GSS.HSF.salaryFieldRoundNo;
                      //   obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                      //   obj.RA_payheadMasterId = RA_payheadMasterId;

                      //   payrollStatutoryArray.push(obj);
                      // }
                    } else {
                      userSalaryArray.push({
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
                        salaryfieldmaxrange:
                          salarystructure[j].salaryfieldmaxrange,
                        salaryFieldRound: salarystructure[j].salaryFieldRound,
                        salaryFieldRoundNo:
                          salarystructure[j].salaryFieldRoundNo,
                        roundOffType: salarystructure[j].roundOffType,
                        considerIn: salarystructure[j].considerIn,
                        RA_payheadMasterId,
                      });

                      //---------------------- for payroll statutory --------------

                      if (
                        salarystructure[j].salaryFieldSrNo ==
                          salaryFieldSrNoFields.EARNING &&
                        ps_calculate
                      ) {
                        earningAmountFor_ps += +finalsalary;
                      }

                      // if (ps_calculate && ps_data) {
                      //   const obj = ps_structuredData(
                      //     ps_data,
                      //     0,
                      //     null,
                      //     null,
                      //     true,
                      //   );
                      //   (obj.considerIn = salarystructure[j].considerIn),
                      //     (obj.salaryFieldRound =
                      //       ps_data.GSS.HSF.salaryFieldRound);
                      //   obj.salaryFieldRoundNo =
                      //     ps_data.GSS.HSF.salaryFieldRoundNo;
                      //   obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                      //   obj.RA_payheadMasterId = RA_payheadMasterId;

                      //   payrollStatutoryArray.push(obj);
                      // }
                    }
                  } else {
                    userSalaryArray.push({
                      salaryMasterID: salarystructure[j].salaryMasterID,
                      payheadmasterid: salarystructure[j].payheadMasterId,
                      payheadName:
                        salarystructure[j].payheadDisplayName &&
                        salarystructure[j].payheadDisplayName.trim()
                          ? salarystructure[j].payheadDisplayName.trim()
                          : salarystructure[j].payheadName,
                      employeeAmount: finalsalary,
                      salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                      salaryfieldside: salarystructure[j].salaryFieldSide,
                      salaryfieldshow: salarystructure[j].salaryFieldShow,
                      calculatedOn: null,
                      salaryfieldmaxrange:
                        salarystructure[j].salaryfieldmaxrange,
                      salaryFieldRound: salarystructure[j].salaryFieldRound,
                      salaryFieldRoundNo: salarystructure[j].salaryFieldRoundNo,
                      roundOffType: salarystructure[j].roundOffType,
                      considerIn: salarystructure[j].considerIn,
                      RA_payheadMasterId,
                    });

                    //---------------------- for payroll statutory --------------

                    if (
                      salarystructure[j].salaryFieldSrNo ==
                        salaryFieldSrNoFields.EARNING &&
                      ps_calculate
                    ) {
                      earningAmountFor_ps += +finalsalary;
                    }

                    // if (ps_calculate && ps_data) {
                    //   const obj = ps_structuredData(
                    //     ps_data,
                    //     ps_finalsalary,
                    //     null,
                    //     null,
                    //     true,
                    //   );
                    //   (obj.considerIn = salarystructure[j].considerIn),
                    //     (obj.salaryFieldRound =
                    //       ps_data.GSS.HSF.salaryFieldRound);
                    //   obj.salaryFieldRoundNo =
                    //     ps_data.GSS.HSF.salaryFieldRoundNo;
                    //   obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                    //   obj.RA_payheadMasterId = RA_payheadMasterId;

                    //   payrollStatutoryArray.push(obj);
                    // }
                  }
                }
              }
            }

            // -------------------------------------------------- Payroll Statutory Calculation -----------------------------------

            if (ps_calculate) {
              const grossAmount =
                payrollStatutoryDetails?.get(payheadMasterIdsMapping.GROSS)
                  ?.EmployeeSalaryAmount || 0;

              const configData = {
                targetAmount: earningAmountFor_ps,
                perDaySalary: 0,
                gross: grossAmount,
                calculationType: SalaryStructureTypeEnum.MONTHLY,
                salaryDivide: salary_CalculationDays,
                roundOffDays: roundOffDaysForPayrollStatutory,
                daysCap: totaldays,
              };

              const ps_daysData = ps_getDaysForAmount(configData);

              ps_paidDays = ps_daysData?.roundedDays;
              ps_extraRemainingAmount = ps_daysData?.remainingAmount;

              const payrollStatutoryDetailsArray = Array.from(
                payrollStatutoryDetails.values(),
              );

              for (const ps_data of payrollStatutoryDetailsArray) {
                const payheadMasterId =
                  ps_data.GSS?.HSF?.payheadMasterId || null;

                if (
                  !payheadMasterId ||
                  excludePayheadIds_ps.includes(payheadMasterId)
                )
                  continue;

                let ps_finalsalary = 0;
                // ------------------------ payroll statutory -------------------------------

                const RA_payheadMasterId = ps_data.GSS.remainingAmtSalaryFieldID
                  ? payrollStatutoryDetailsArray.find(
                      (e) =>
                        e.salaryFieldID ==
                        ps_data.GSS.remainingAmtSalaryFieldID,
                    )?.payheadMasterId
                  : null;

                if (ps_calculate && payheadMasterId) {
                  if (LWP_flag) {
                    ps_finalsalary =
                      +salarystructure[j].ActualEmployeeSalaryAmount;
                  } else {
                    const ps_perDaySalary =
                      +ps_data.ActualEmployeeSalaryAmount /
                      +salary_CalculationDays;

                    ps_finalsalary = Number(ps_perDaySalary) * ps_paidDays;
                  }

                  // pf

                  if ([4, 5, 12, 25, 66].includes(payheadMasterId)) {
                    // -------------------------Payroll Statutory -------------------------
                    if (ps_calculate && ps_data) {
                      let ps_calculatedOn = null;
                      if ([4, 12].includes(payheadMasterId)) {
                        const ps_pf =
                          (Number(ps_data.ActualEmployeeSalaryAmount) * 100) /
                          (ps_data.GSS.HSF.payheadMasterId == 4 ? 12 : 8.33);

                        ps_calculatedOn =
                          (Number(ps_pf) / Number(salary_CalculationDays)) *
                          ps_paidDays;
                      }

                      const obj = ps_structuredData(
                        ps_data,
                        ps_finalsalary,
                        ps_calculatedOn,
                        null,
                        false,
                      );
                      obj.salaryFieldRound = ps_data.GSS.HSF.salaryFieldRound;
                      obj.salaryFieldRoundNo =
                        ps_data.GSS.HSF.salaryFieldRoundNo;
                      obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                      obj.considerIn = ps_data.GSS.HSF.considerIn;
                      obj.actualAmount = Number(
                        ps_data.ActualEmployeeSalaryAmount,
                      );

                      payrollStatutoryArray.push(obj);
                    }
                  } else {
                    // check salary field round

                    if (ps_data.GSS.HSF.salaryFieldWhenMonth[0] != 0) {
                      let currentmonth = Month;

                      if (Number(currentmonth) < 10) {
                        currentmonth = Month.slice(1);
                      }

                      let whencalculation =
                        ps_data.GSS.HSF.salaryFieldWhenMonth;
                      whencalculation = whencalculation.filter((s) => {
                        return s == currentmonth;
                      });

                      if (whencalculation.length > 0) {
                        //---------------------- for payroll statutory --------------

                        if (ps_calculate && ps_data) {
                          const obj = ps_structuredData(
                            ps_data,
                            ps_finalsalary,
                            null,
                            null,
                            true,
                          );
                          (obj.considerIn = ps_data.GSS.HSF.considerIn),
                            (obj.salaryFieldRound =
                              ps_data.GSS.HSF.salaryFieldRound);
                          obj.salaryFieldRoundNo =
                            ps_data.GSS.HSF.salaryFieldRoundNo;
                          obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                          obj.RA_payheadMasterId = RA_payheadMasterId;

                          payrollStatutoryArray.push(obj);
                        }
                      } else {
                        //---------------------- for payroll statutory --------------

                        if (ps_calculate && ps_data) {
                          const obj = ps_structuredData(
                            ps_data,
                            0,
                            null,
                            null,
                            true,
                          );
                          (obj.considerIn = ps_data.GSS.HSF.considerIn),
                            (obj.salaryFieldRound =
                              ps_data.GSS.HSF.salaryFieldRound);
                          obj.salaryFieldRoundNo =
                            ps_data.GSS.HSF.salaryFieldRoundNo;
                          obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                          obj.RA_payheadMasterId = RA_payheadMasterId;

                          payrollStatutoryArray.push(obj);
                        }
                      }
                    } else {
                      //---------------------- for payroll statutory --------------

                      if (ps_calculate && ps_data) {
                        const obj = ps_structuredData(
                          ps_data,
                          ps_finalsalary,
                          null,
                          null,
                          true,
                        );
                        (obj.considerIn = ps_data.GSS.HSF.considerIn),
                          (obj.salaryFieldRound =
                            ps_data.GSS.HSF.salaryFieldRound);
                        obj.salaryFieldRoundNo =
                          ps_data.GSS.HSF.salaryFieldRoundNo;
                        obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                        obj.RA_payheadMasterId = RA_payheadMasterId;

                        payrollStatutoryArray.push(obj);
                      }
                    }
                  }
                }
              }
            }

            // ----------------------------- for payroll Statutory -------------------------------
            const remaingAmountData = {
              userMasterID: usermaster[i].userMasterID,
              salaryYYYYMM: yearmonth,
              adjustMode: PayrollStatutoryAdjustModeEnum.CASH,
              amount: Math.round(ps_extraRemainingAmount),
              minutes: null,
              ps_salaryTransId: null,
            };

            ps_overtimeAmount = overtimeAmount;
            ps_OtherEmployee_ESIC_Amount = OtherEmployee_ESIC_Amount;
            ps_OtherEmployer_ESIC_Amount = OtherEmployer_ESIC_Amount;
            ps_ESIC_CalculatedOn_Amount = ESIC_CalculatedOn_Amount;

            if (
              ps_calculate &&
              extraAmountMode === PayrollStatutoryAdjustModeEnum.OVERTIME
            ) {
              remaingAmountData.minutes = getOTMinutesFromExtraAmount(
                remaingAmountData.amount,
                userAttendacepolicy,
                payrollStatutoryDetails,
                salary_CalculationDays,
              );

              remaingAmountData.adjustMode =
                PayrollStatutoryAdjustModeEnum.OVERTIME;

              ps_overtime_min += +remaingAmountData.minutes + overtime_min;

              const otSalary = payrollStatutoryArray.find(
                (e) => e.payheadmasterid === payheadMasterIdsMapping.OT,
              );

              if (otSalary) {
                otSalary.employeeAmount += Number(remaingAmountData.amount);
                ps_overtimeAmount += Number(remaingAmountData.amount);
              }

              //For ESIC
              if (esicApplicable == 'true') {
                ps_OtherEmployee_ESIC_Amount +=
                  (+remaingAmountData.amount *
                    +userAttendacepolicy.employeeESICPer) /
                  100;
                ps_OtherEmployer_ESIC_Amount +=
                  (+remaingAmountData.amount *
                    +userAttendacepolicy.employerESICPer) /
                  100;
                ps_ESIC_CalculatedOn_Amount += +remaingAmountData.amount;
              }
            }

            // ----------------------Bonus Pay Calculation ---------------------------------------
            if (BonusPayData) {
              const currentBonusAmount =
                userSalaryArray.find((e) => e.payheadmasterid == 6)
                  ?.employeeAmount || 0;

              let bonusAmount = 0;

              const { amount, ids, addcurrentId } = await getPayBonusAmount(
                bonusPolicy,
                yearmonth,
                currentBonusAmount,
                usermaster[i].userMasterID,
              );

              BonusIds = ids;
              addCurrentBonusId = addcurrentId;

              bonusAmount = amount;

              userSalaryArray.push({
                salaryMasterID: BonusPayData.salaryMasterID,
                payheadmasterid: BonusPayData.payheadMasterId,
                payheadName:
                  BonusPayData.payheadDisplayName &&
                  BonusPayData.payheadDisplayName.trim()
                    ? BonusPayData.payheadDisplayName.trim()
                    : BonusPayData.payheadName,
                employeeAmount: getRoundOffSalary(
                  +bonusAmount,
                  BonusPayData.salaryFieldRound,
                  BonusPayData.roundOffType,
                  BonusPayData.salaryFieldRoundNo,
                ),
                salaryfieldsrno: BonusPayData.salaryFieldSrNo,
                salaryfieldside: BonusPayData.salaryFieldSide,
                salaryfieldshow: BonusPayData.salaryFieldShow,
                calculatedOn: null,
                salaryfieldmaxrange: BonusPayData.salaryfieldmaxrange,
                considerIn: BonusPayData.considerIn,
              });

              //---------------------- for payroll statutory --------------

              if (ps_calculate) {
                const ps_data =
                  payrollStatutoryDetails?.get(BonusPayData.payheadMasterId) ||
                  null;

                if (ps_data) {
                  const obj = ps_structuredData(
                    ps_data,
                    bonusAmount,
                    null,
                    null,
                    true,
                  );
                  (obj.considerIn = BonusPayData.considerIn),
                    payrollStatutoryArray.push(obj);
                }
              }
            }

            let unpaidDaysCal = +remainingDays + +unpaidDays;

            // add weekoff count in unpaid days
            if (weekoffSalaryCalculated) unpaidDaysCal += +weekoffCount;

            //----------------- Push LWP Deduction in salary array------

            if (lwp_deduction) {
              const amount =
                LWP_flag && salary_calculation_wise != 'hourwise'
                  ? (+gross / +salary_CalculationDays) * unpaidDaysCal
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

              //---------------------- for payroll statutory --------------

              if (ps_calculate) {
                const ps_data =
                  payrollStatutoryDetails?.get(lwp_deduction.payheadMasterId) ||
                  null;
                if (ps_data) {
                  const obj = ps_structuredData(
                    ps_data,
                    amount,
                    null,
                    null,
                    true,
                  );
                  (obj.considerIn = lwp_deduction.considerIn),
                    payrollStatutoryArray.push(obj);
                }
              }
            }

            // deduct pf on overtime

            if (pfApplicable == 'true' || +pfIncentiveAmount > 0) {
              let pfDeductionAmount = 0;
              if (pfApplicable != 'true') {
                pfDeductionAmount = +pfIncentiveAmount;
              } else {
                pfDeductionAmount = +overtimeAmount + +pfIncentiveAmount;
              }

              userSalaryArray.forEach((e) => {
                if (
                  e.payheadmasterid == 4 ||
                  e.payheadmasterid == 5 ||
                  e.payheadmasterid == 12 ||
                  e.payheadmasterid == 25 ||
                  e.payheadmasterid == 66
                ) {
                  const amount =
                    Number(e.employeeAmount) +
                    (e.payheadmasterid == 4
                      ? (Number(pfDeductionAmount) * 12) / 100
                      : e.payheadmasterid == 5
                        ? (Number(pfDeductionAmount) * 3.67) / 100
                        : e.payheadmasterid == 12
                          ? (Number(pfDeductionAmount) * 8.33) / 100
                          : (Number(pfDeductionAmount) * 0.5) / 100);

                  e.employeeAmount =
                    e.salaryFieldRound == 'Y'
                      ? e.roundOffType == 0
                        ? Math.ceil(amount.toFixed(2))
                        : Math.round(amount)
                      : !e.salaryFieldRound
                        ? Math.round(amount)
                        : amount.toFixed(+e.salaryFieldRoundNo);

                  if ([4, 12].includes(e.payheadmasterid))
                    e.calculatedOn = Math.round(
                      Number(e.calculatedOn) + Number(pfDeductionAmount),
                    );
                }
              });

              if (ps_calculate) {
                let ps_pfDeductionAmount = 0;
                if (pfApplicable != 'true') {
                  ps_pfDeductionAmount = +pfIncentiveAmount;
                } else {
                  ps_pfDeductionAmount = ps_overtimeAmount + +pfIncentiveAmount;
                }

                payrollStatutoryArray.forEach((e) => {
                  if (
                    e.payheadmasterid == 4 ||
                    e.payheadmasterid == 5 ||
                    e.payheadmasterid == 12 ||
                    e.payheadmasterid == 25 ||
                    e.payheadmasterid == 66
                  ) {
                    const amount =
                      Number(e.employeeAmount) +
                      (e.payheadmasterid == 4
                        ? (Number(ps_pfDeductionAmount) * 12) / 100
                        : e.payheadmasterid == 5
                          ? (Number(ps_pfDeductionAmount) * 3.67) / 100
                          : e.payheadmasterid == 12
                            ? (Number(ps_pfDeductionAmount) * 8.33) / 100
                            : (Number(ps_pfDeductionAmount) * 0.5) / 100);

                    e.employeeAmount =
                      e.salaryFieldRound == 'Y'
                        ? e.roundOffType == 0
                          ? Math.ceil(amount.toFixed(2))
                          : Math.round(amount)
                        : !e.salaryFieldRound
                          ? Math.round(amount)
                          : amount.toFixed(+e.salaryFieldRoundNo);

                    if ([4, 12].includes(e.payheadmasterid))
                      e.calculatedOn = Math.round(
                        Number(e.calculatedOn) + Number(ps_pfDeductionAmount),
                      );
                  }
                });
              }
            } else {
              // if not

              userSalaryArray.forEach((e) => {
                if (
                  e.payheadmasterid == 4 ||
                  e.payheadmasterid == 5 ||
                  e.payheadmasterid == 12 ||
                  e.payheadmasterid == 25 ||
                  e.payheadmasterid == 66
                ) {
                  // const amount = Number(e.employeeAmount);

                  e.employeeAmount =
                    e.salaryFieldRound == 'Y'
                      ? e.roundOffType == 0
                        ? Math.ceil((+e.employeeAmount).toFixed(2))
                        : Math.round(+e.employeeAmount)
                      : !e.salaryFieldRound
                        ? Math.round(+e.employeeAmount)
                        : (+e.employeeAmount).toFixed(+e.salaryFieldRoundNo);

                  if ([4, 12].includes(e.payheadmasterid))
                    e.calculatedOn = Math.round(Number(e.calculatedOn));
                }
              });

              if (ps_calculate) {
                payrollStatutoryArray.forEach((e) => {
                  if (
                    e.payheadmasterid == 4 ||
                    e.payheadmasterid == 5 ||
                    e.payheadmasterid == 12 ||
                    e.payheadmasterid == 25 ||
                    e.payheadmasterid == 66
                  ) {
                    e.employeeAmount =
                      e.salaryFieldRound == 'Y'
                        ? e.roundOffType == 0
                          ? Math.ceil((+e.employeeAmount).toFixed(2))
                          : Math.round(+e.employeeAmount)
                        : !e.salaryFieldRound
                          ? Math.round(+e.employeeAmount)
                          : (+e.employeeAmount).toFixed(+e.salaryFieldRoundNo);

                    if ([4, 12].includes(e.payheadmasterid))
                      e.calculatedOn = Math.round(Number(e.calculatedOn));
                  }
                });
              }
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

              if (ps_calculate) {
                // Check if payhead id is  present or not in structure
                toAddOTInOtherPathead = payrollStatutoryArray.find(
                  (e) => +e.payheadmasterid == +ot_payheadMasterId,
                )
                  ? true
                  : false;
                // If present then add Amount
                if (toAddOTInOtherPathead) {
                  payrollStatutoryArray = payrollStatutoryArray.map((e) => {
                    if (+e.payheadmasterid == +ot_payheadMasterId)
                      e.employeeAmount += +ps_overtimeAmount;
                    if (+e.payheadmasterid == 43) e.employeeAmount = 0;
                    return e;
                  });
                }
              }
            }

            // set max range

            const pfMaxRange =
              userSalaryArray.find(
                (e) => e.payheadmasterid == payheadMasterIdsMapping.PF,
              )?.salaryfieldmaxrange || 0;

            const pfjoiningDate = [
              companyMasterIDENUM.BRISK_SURGICAL_COTTON_LTD,
              companyMasterIDENUM.BRISK_SURGICAL_COTTON_LTD_BELAGAVI,
              companyMasterIDENUM.BRISK_SURGICAL_COTTON_LTD_INDUSTRIES,
              companyMasterIDENUM.N_S_Construction,
            ].includes(+companyId)
              ? employeeJoining.pfjoiningDate
              : null;

            userSalaryArray.forEach((e) => {
              if (!e.salaryfieldmaxrange) return;

              let maxRange = +e.salaryfieldmaxrange;
              let empAmount = +e.employeeAmount;
              let remainingAmount = 0;

              const companyPFConfig = PFCalculationCompanyIds[+companyId];

              // pf calculation for according to old and new rule for sept-2026
              if (
                companyPFConfig &&
                Object.hasOwn(NewRuleCapping, +e.payheadmasterid) &&
                maxRange &&
                pfMaxRange <= 2360 &&
                salary_calculation_wise != 'hourwise' &&
                PFCalculationMonth.includes(+yearmonth)
              ) {
                // amount of incentive and overtime for pf deduction
                let totalExtraAmount = pfIncentiveAmount;
                if (pfApplicable == 'true') totalExtraAmount += overtimeAmount;

                empAmount = pfCalculationForSep2026({
                  companyPFConfig,
                  payheadMasterId: e.payheadmasterid,
                  maxRange,
                  yearmonth,
                  amount: e.employeeAmount,
                  actualAmount: e.actualAmount,
                  salaryCalType: salary_calculation_wise,
                  structureType: salaryStructureBaseoncal,
                  salaryDivideBy: salary_CalculationDays,
                  paidDays: Math.max(salary_CalculationDays - unpaidDaysCal, 0),
                  totalExtraAmount,
                  start_date,
                  pfjoiningDate,
                });

                const sepMonthcapping =
                  SepMonthPFCapping[+e.payheadmasterid] || 0;

                empAmount = Math.min(sepMonthcapping, empAmount);

                // PF
                if (e.payheadmasterid == payheadMasterIdsMapping.PF) {
                  e.calculatedOn = Math.round((empAmount * 100) / 12);
                }

                // EPS
                if (e.payheadmasterid == payheadMasterIdsMapping.EPS) {
                  const pfCalculatedOn =
                    userSalaryArray.find(
                      (e) => e.payheadmasterid == payheadMasterIdsMapping.PF,
                    )?.calculatedOn || 0;

                  e.calculatedOn =
                    empAmount === 1250
                      ? 15000
                      : empAmount === 2083
                        ? 25000
                        : pfCalculatedOn;
                }

                e.employeeAmount = getRoundOffSalary(
                  empAmount,
                  e.salaryFieldRoundNo,
                  e.roundOffType,
                  e.salaryFieldRoundNo,
                );
              } else {
                if (empAmount <= maxRange) return;

                remainingAmount = empAmount - maxRange;

                // cap current payhead
                e.employeeAmount = maxRange;

                // PF
                if (e.payheadmasterid == payheadMasterIdsMapping.PF) {
                  e.calculatedOn = Math.round((maxRange * 100) / 12);
                }

                // EPS
                if (e.payheadmasterid == payheadMasterIdsMapping.EPS) {
                  e.calculatedOn =
                    maxRange === 1250
                      ? 15000
                      : maxRange === 2083
                        ? 25000
                        : Math.round((maxRange * 100) / 8.33);
                }
              }

              // push remaining amount
              if (
                remainingAmount > 0 &&
                e.RA_payheadMasterId &&
                e.RA_payheadMasterId !== e.payheadmasterid
              ) {
                const targetPayhead = userSalaryArray.find(
                  (p) => p.payheadmasterid === e.RA_payheadMasterId,
                );

                if (targetPayhead) {
                  const targetMax =
                    +targetPayhead.salaryfieldmaxrange || Infinity;
                  const newAmount =
                    +targetPayhead.employeeAmount + remainingAmount;

                  targetPayhead.employeeAmount =
                    newAmount > targetMax
                      ? targetMax
                      : getRoundOffSalary(
                          newAmount,
                          targetPayhead.salaryFieldRound,
                          targetPayhead.roundOffType,
                          targetPayhead.salaryFieldRoundNo,
                        );
                }
              }
            });

            // ---------------------------- payroll Statutory ----------------------

            const ps_pfMaxRange =
              payrollStatutoryArray.find(
                (e) => e.payheadmasterid == payheadMasterIdsMapping.PF,
              )?.salaryfieldmaxrange || 0;

            if (ps_calculate) {
              // set max range

              payrollStatutoryArray.forEach((e) => {
                if (!e.salaryfieldmaxrange) return;

                let maxRange = +e.salaryfieldmaxrange;
                let empAmount = +e.employeeAmount;
                let remainingAmount = 0;

                const companyPFConfig = PFCalculationCompanyIds[+companyId];

                // pf calculation for according to new rule for sept-2026
                if (
                  companyPFConfig &&
                  Object.hasOwn(NewRuleCapping, +e.payheadmasterid) &&
                  maxRange &&
                  ps_pfMaxRange <= 2360 &&
                  salary_calculation_wise != 'hourwise' &&
                  PFCalculationMonth.includes(+yearmonth)
                ) {
                  // amount of incentive and overtime for pf deduction
                  let totalExtraAmount = pfIncentiveAmount;
                  if (pfApplicable == 'true')
                    totalExtraAmount += overtimeAmount;

                  empAmount = pfCalculationForSep2026({
                    companyPFConfig,
                    payheadMasterId: e.payheadmasterid,
                    maxRange,
                    yearmonth,
                    amount: e.employeeAmount,
                    actualAmount: e.actualAmount,
                    salaryCalType: salary_calculation_wise,
                    structureType: salaryStructureBaseoncal,
                    salaryDivideBy: salary_CalculationDays,
                    paidDays: Math.max(
                      salary_CalculationDays - unpaidDaysCal,
                      0,
                    ),
                    totalExtraAmount,
                    start_date,
                    pfjoiningDate,
                  });

                  const sepMonthcapping =
                    SepMonthPFCapping[+e.payheadmasterid] || 0;

                  empAmount = Math.min(sepMonthcapping, empAmount);

                  if (e.payheadmasterid == payheadMasterIdsMapping.PF) {
                    e.calculatedOn = Math.round((e.employeeAmount * 100) / 12);
                  }

                  // EPS
                  if (e.payheadmasterid == payheadMasterIdsMapping.EPS) {
                    const pfCalculatedOn =
                      payrollStatutoryArray.find(
                        (e) => e.payheadmasterid == payheadMasterIdsMapping.PF,
                      )?.calculatedOn || 0;

                    e.calculatedOn =
                      e.employeeAmount === 1250
                        ? 15000
                        : e.employeeAmount === 2083
                          ? 25000
                          : pfCalculatedOn;
                  }

                  e.employeeAmount = getRoundOffSalary(
                    empAmount,
                    e.salaryFieldRoundNo,
                    e.roundOffType,
                    e.salaryFieldRoundNo,
                  );
                } else {
                  if (empAmount <= maxRange) return;

                  remainingAmount = empAmount - maxRange;

                  // cap current payhead
                  e.employeeAmount = maxRange;

                  if (e.payheadmasterid == payheadMasterIdsMapping.PF) {
                    e.calculatedOn = Math.round((maxRange * 100) / 12);
                  }

                  // EPS
                  if (e.payheadmasterid == payheadMasterIdsMapping.EPS) {
                    e.calculatedOn =
                      maxRange === 1250
                        ? 15000
                        : maxRange === 2083
                          ? 25000
                          : Math.round((maxRange * 100) / 8.33);
                  }
                }

                // const maxRange = +e.salaryfieldmaxrange;
                // const empAmount = +e.employeeAmount;

                // if (empAmount <= maxRange) return;

                // const remainingAmount = empAmount - maxRange;

                // PF
                // if (e.payheadmasterid == payheadMasterIdsMapping.PF) {
                //   e.calculatedOn = Math.round((maxRange * 100) / 12);
                // }

                // // EPS
                // if (e.payheadmasterid == payheadMasterIdsMapping.EPS) {
                //   e.calculatedOn =
                //     maxRange === 1250
                //       ? 15000
                //       :  2083 ? 25000: Math.round((maxRange * 100) / 8.33);
                // }

                // push remaining amount
                if (
                  remainingAmount > 0 &&
                  e.RA_payheadMasterId &&
                  e.RA_payheadMasterId !== e.payheadmasterid
                ) {
                  const targetPayhead = userSalaryArray.find(
                    (p) => p.payheadmasterid === e.RA_payheadMasterId,
                  );

                  if (targetPayhead) {
                    const targetMax =
                      +targetPayhead.salaryfieldmaxrange || Infinity;
                    const newAmount =
                      +targetPayhead.employeeAmount + remainingAmount;

                    targetPayhead.employeeAmount =
                      newAmount > targetMax
                        ? targetMax
                        : getRoundOffSalary(
                            newAmount,
                            targetPayhead.salaryFieldRound,
                            targetPayhead.roundOffType,
                            targetPayhead.salaryFieldRoundNo,
                          );
                  }
                }
              });
            }

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

              //---------------------- for payroll statutory --------------

              if (ps_calculate) {
                const ps_data =
                  payrollStatutoryDetails?.get(EPF_Data.payheadMasterId) ||
                  null;
                if (ps_data) {
                  const ps_PF_amount =
                    payrollStatutoryArray.find((e) => e.payheadmasterid == 4)
                      ?.employeeAmount || 0;
                  const ps_EPS_amount =
                    payrollStatutoryArray.find((e) => e.payheadmasterid == 12)
                      ?.employeeAmount || 0;

                  const amount = Math.max(ps_PF_amount - ps_EPS_amount, 0);

                  const obj = ps_structuredData(
                    ps_data,
                    amount,
                    null,
                    null,
                    true,
                  );

                  payrollStatutoryArray.push(obj);
                }
              }
            }

            employee_gross = userSalaryArray
              .filter(
                (e) =>
                  e.salaryfieldsrno == 'A' &&
                  e.salaryfieldshow == 'Y' &&
                  e.considerIn != payheadConsiderInEnum.NETSALARY,
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
                  e.considerIn == payheadConsiderInEnum.NETSALARY,
              )
              .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

            employee_netPay =
              Number(employee_gross) -
              Number(employee_otherAmount) +
              +employee_extraAddInNetPay;

            // -------------------------------Payroll Statutory --------------------------
            let ps_addInNetPay = 0;
            if (ps_calculate) {
              ps_employee_gross = payrollStatutoryArray
                .filter(
                  (e) =>
                    e.salaryfieldsrno == salaryFieldSrNoFields.EARNING &&
                    e.salaryfieldshow == 'Y' &&
                    e.considerIn != payheadConsiderInEnum.NETSALARY,
                )
                .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

              ps_addInNetPay = payrollStatutoryArray
                .filter(
                  (e) =>
                    e.salaryfieldsrno == salaryFieldSrNoFields.EARNING &&
                    e.salaryfieldshow == 'Y' &&
                    e.considerIn == payheadConsiderInEnum.NETSALARY,
                )
                .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

              const ps_employee_deduction = payrollStatutoryArray
                .filter(
                  (e) =>
                    e.salaryfieldsrno ==
                      salaryFieldSrNoFields.EMPLOYEE_DEDUCTION ||
                    (e.salaryfieldsrno ==
                      salaryFieldSrNoFields.OTHER_DEDUCTION &&
                      e.salaryfieldside == 'D' &&
                      e.salaryfieldshow == 'Y'),
                )
                .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

              ps_employee_netPay =
                +ps_employee_gross - +ps_employee_deduction + +ps_addInNetPay;
            }

            // -------------- Tds deduction --------------------------------------------
            const tdsData = salarystructure.find((s) => {
              return s.payheadMasterId == payheadMasterIdsMapping.TDS;
            });

            if (tdsData) {
              // TDS

              let tdsAmount = 0;

              if (tdsDeductionFlag) {
                const financialYear = await getFinancialYearByMonth(yearmonth);

                const incomeTaxData = (
                  await incomeTaxCalculationByUserId(
                    usermaster[i].userMasterID,
                    financialYear,
                    yearmonth,
                    employee_gross,
                  )
                ).data.find((e) => e.yearMonth == yearmonth);

                tdsAmount = incomeTaxData ? +incomeTaxData.amount : 0;
              }

              userSalaryArray.push({
                salaryMasterID: tdsData.salaryMasterID,
                payheadmasterid: tdsData.payheadMasterId,
                payheadName:
                  tdsData.payheadDisplayName &&
                  tdsData.payheadDisplayName.trim()
                    ? tdsData.payheadDisplayName.trim()
                    : tdsData.payheadName,
                employeeAmount: getRoundOffSalary(
                  tdsAmount,
                  tdsData.salaryFieldRound,
                  tdsData.roundOffType,
                  tdsData.salaryFieldRoundNo,
                ),
                salaryfieldsrno: tdsData.salaryFieldSrNo,
                salaryfieldside: tdsData.salaryFieldSide,
                salaryfieldshow: tdsData.salaryFieldShow,
                calculatedOn: null,
                salaryfieldmaxrange: tdsData.salaryfieldmaxrange,
              });

              if (ps_calculate) {
                const ps_data =
                  payrollStatutoryDetails?.get(tdsData.payheadMasterId) || null;
                if (ps_data) {
                  const obj = ps_structuredData(
                    ps_data,
                    tdsAmount,
                    null,
                    null,
                    true,
                  );

                  payrollStatutoryArray.push(obj);
                }
              }
            }

            // ----------------------- Employee PT Calculation -------------------------
            const ptdata = salarystructure.filter((s) => {
              return s.payheadMasterId == 15;
            });

            if (ptdata.length > 0) {
              const ptDeductionType =
                usermaster[i].companyMaster?.ptDeduction ||
                PTCalculationEnum.MONTHLY;

              const ptSlabs = allPTData.filter(
                (e) =>
                  e.stateMasterID == ptdata[0].stateid &&
                  e.corporationId == ptdata[0].corporationId,
              );

              const ptCalculationType = ptSlabs?.[0]?.ptCalculation || null;

              const previousalary =
                previousFiveMonthSalary.find(
                  (e) => e.userMasterID == usermaster[i].userMasterID,
                )?.totalAmount || 0;

              const value = getPTCalculationAmount(
                ptSlabs,
                ptCalculationType,
                ptDeductionType,
                usermaster[i].gender,
                previousalary,
                employee_gross,
                Month,
              );

              userSalaryArray.push({
                salaryMasterID: ptdata[0].salaryMasterID,
                payheadmasterid: ptdata[0].payheadMasterId,
                payheadName:
                  ptdata[0].payheadDisplayName &&
                  ptdata[0].payheadDisplayName.trim()
                    ? ptdata[0].payheadDisplayName.trim()
                    : ptdata[0].payheadName,
                employeeAmount: +value,
                salaryfieldsrno: ptdata[0].salaryFieldSrNo,
                salaryfieldside: ptdata[0].salaryFieldSide,
                salaryfieldshow: ptdata[0].salaryFieldShow,
                calculatedOn: null,
              });

              employee_netPay = Number(employee_netPay) - Number(value);

              // --------------- Payroll Statutory ------------------------

              if (ps_calculate) {
                const ps_data =
                  payrollStatutoryDetails?.get(ptdata[0].payheadMasterId) ||
                  null;
                if (ps_data) {
                  const obj = ps_structuredData(
                    ps_data,
                    value,
                    null,
                    null,
                    true,
                  );

                  payrollStatutoryArray.push(obj);
                }
              }
            }

            // employee esic

            const esicdata = salarystructure.filter((s) => {
              return s.payheadMasterId == 13;
            });

            if (esicdata.length > 0) {
              if (Number(esicdata[0].EmployeeSalaryAmount) > 0) {
                let value = 0,
                  calculatedOn = 0;

                if (esicDeduction == true) {
                  // only for AMMAN ASSOCIATED SERVICES PRIVATE LIMITED
                  if (calculateEsicOnGross) {
                    value = (+employee_gross * 0.75) / 100;
                    calculatedOn = employee_gross;
                  } else {
                    if (salary_calculation_wise == 'hourwise') {
                      const actualSalary =
                        +esicdata[0].ActualEmployeeSalaryAmount || 0;
                      const calculationDays = salary_CalculationDays || 1;

                      if (convertWorkedHoursToDays) {
                        const oneDayGross =
                          (actualSalary / +calculationDays) *
                          +dailyworkingminutes;

                        value = oneDayGross * +paidDaysForHourlySalary;
                      } else {
                        const oneMinuteSalary = actualSalary / +calculationDays;

                        value = oneMinuteSalary * +usertotalpresentday;
                      }

                      // let oneminutesalry =
                      //   Number(esicdata[0].ActualEmployeeSalaryAmount) /
                      //   Number(salary_CalculationDays);

                      // value =
                      //   Number(oneminutesalry) * Number(usertotalpresentday);
                    } else {
                      let onedaysalary =
                        Number(esicdata[0].ActualEmployeeSalaryAmount) /
                        Number(salary_CalculationDays);

                      value =
                        +esicdata[0].ActualEmployeeSalaryAmount -
                        Number(onedaysalary) * unpaidDaysCal;
                    }

                    value = Math.max(value, 0);

                    const esic =
                      (Number(esicdata[0].ActualEmployeeSalaryAmount) * 100) /
                      0.75;

                    calculatedOn =
                      (Number(esic) / Number(salary_CalculationDays)) *
                      (salary_calculation_wise == 'hourwise'
                        ? convertWorkedHoursToDays
                          ? +dailyworkingminutes * +paidDaysForHourlySalary
                          : Number(usertotalpresentday)
                        : salary_CalculationDays - unpaidDaysCal);
                  }

                  value += +OtherEmployee_ESIC_Amount;
                  calculatedOn += +ESIC_CalculatedOn_Amount;

                  // check max range

                  if (esicdata[0].salaryfieldmaxrange) {
                    if (+value > +esicdata[0].salaryfieldmaxrange) {
                      value = +esicdata[0].salaryfieldmaxrange;
                    }
                  }

                  value =
                    esicdata[0].salaryFieldRound == 'Y'
                      ? esicdata[0].roundOffType == 0
                        ? Math.ceil(value.toFixed(2))
                        : Math.round(value)
                      : !esicdata[0].salaryFieldRound
                        ? Math.round(value)
                        : value.toFixed(+esicdata[0].salaryFieldRoundNo);
                }

                userSalaryArray.push({
                  salaryMasterID: esicdata[0].salaryMasterID,
                  payheadmasterid: esicdata[0].payheadMasterId,
                  payheadName:
                    esicdata[0].payheadDisplayName &&
                    esicdata[0].payheadDisplayName.trim()
                      ? esicdata[0].payheadDisplayName.trim()
                      : esicdata[0].payheadName,
                  employeeAmount: +value,
                  salaryfieldsrno: esicdata[0].salaryFieldSrNo,
                  salaryfieldside: esicdata[0].salaryFieldSide,
                  salaryfieldshow: esicdata[0].salaryFieldShow,
                  calculatedOn:
                    +calculatedOn > 0 ? Math.round(calculatedOn) : null,
                });

                employee_netPay = Number(employee_netPay) - Number(value);

                // ------------------ Payroll Statutory ----------------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(esicdata[0].payheadMasterId) ||
                    null;
                  if (ps_data) {
                    let ps_value = 0;
                    let ps_calculatedOn = 0;

                    if (esicDeduction == true) {
                      // only for AMMAN ASSOCIATED SERVICES PRIVATE LIMITED
                      if (calculateEsicOnGross) {
                        ps_value = (+ps_employee_gross * 0.75) / 100;
                        ps_calculatedOn = ps_employee_gross;
                      } else {
                        const onedaysalary =
                          Number(ps_data.ActualEmployeeSalaryAmount) /
                          Number(salary_CalculationDays);

                        ps_value = Number(onedaysalary) * ps_paidDays;

                        const esic =
                          (Number(ps_data.ActualEmployeeSalaryAmount) * 100) /
                          0.75;

                        ps_calculatedOn =
                          (Number(esic) / Number(salary_CalculationDays)) *
                          ps_paidDays;
                      }

                      ps_value = Math.max(ps_value, 0);

                      ps_value += +ps_OtherEmployee_ESIC_Amount;
                      ps_calculatedOn += +ps_ESIC_CalculatedOn_Amount;

                      // check max range

                      if (ps_data.GSS.salaryfieldmaxrange) {
                        if (+ps_value > +ps_data.GSS.salaryfieldmaxrange) {
                          ps_value = +ps_data.GSS.salaryfieldmaxrange;
                        }
                      }
                    }

                    const obj = ps_structuredData(
                      ps_data,
                      ps_value,
                      ps_calculatedOn,
                      null,
                      true,
                    );

                    payrollStatutoryArray.push(obj);

                    ps_employee_netPay -= Number(obj.employeeAmount);
                  }
                }
              }
            }

            // company esic

            const co_esicdata = salarystructure.filter((s) => {
              return s.payheadMasterId == 14;
            });

            if (co_esicdata.length > 0) {
              if (Number(co_esicdata[0].EmployeeSalaryAmount) > 0) {
                let value = 0;

                if (esicDeduction == true) {
                  // only for AMMAN ASSOCIATED SERVICES PRIVATE LIMITED
                  if (calculateEsicOnGross) {
                    value = (+employee_gross * 3.25) / 100;
                  } else {
                    if (salary_calculation_wise == 'hourwise') {
                      const actualSalary =
                        +co_esicdata[0].ActualEmployeeSalaryAmount || 0;
                      const calculationDays = salary_CalculationDays || 1;

                      if (convertWorkedHoursToDays) {
                        const oneDayGross =
                          (actualSalary / +calculationDays) *
                          +dailyworkingminutes;

                        value = oneDayGross * +paidDaysForHourlySalary;
                      } else {
                        const oneMinuteSalary = actualSalary / +calculationDays;

                        value = oneMinuteSalary * +usertotalpresentday;
                      }

                      // let oneminutesalry =
                      //   Number(co_esicdata[0].EmployeeSalaryAmount) /
                      //   Number(salary_CalculationDays);

                      // value =
                      //   Number(oneminutesalry) * Number(usertotalpresentday);
                    } else {
                      let onedaysalary =
                        Number(co_esicdata[0].ActualEmployeeSalaryAmount) /
                        Number(salary_CalculationDays);

                      value =
                        +co_esicdata[0].ActualEmployeeSalaryAmount -
                        Number(onedaysalary) * unpaidDaysCal;
                    }
                  }

                  value = Math.max(value, 0);

                  //SUM Of ESIC
                  value += +OtherEmployer_ESIC_Amount;

                  // max range

                  if (co_esicdata[0].salaryfieldmaxrange) {
                    if (+value > +co_esicdata[0].salaryfieldmaxrange) {
                      value = +co_esicdata[0].salaryfieldmaxrange;
                    }
                  }

                  value =
                    co_esicdata[0].salaryFieldRound == 'Y'
                      ? co_esicdata[0].roundOffType == 0
                        ? Math.ceil(value.toFixed(2))
                        : Math.round(value)
                      : !co_esicdata[0].salaryFieldRoundNo
                        ? Math.round(value)
                        : value.toFixed(+co_esicdata[0].salaryFieldRoundNo);
                }

                userSalaryArray.push({
                  salaryMasterID: co_esicdata[0].salaryMasterID,
                  payheadmasterid: co_esicdata[0].payheadMasterId,
                  payheadName:
                    co_esicdata[0].payheadDisplayName &&
                    co_esicdata[0].payheadDisplayName.trim()
                      ? co_esicdata[0].payheadDisplayName.trim()
                      : co_esicdata[0].payheadName,
                  employeeAmount: +value,
                  salaryfieldsrno: co_esicdata[0].salaryFieldSrNo,
                  salaryfieldside: co_esicdata[0].salaryFieldSide,
                  salaryfieldshow: co_esicdata[0].salaryFieldShow,
                  calculatedOn: null,
                });

                // ------------------ Payroll Statutory ----------------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      co_esicdata[0].payheadMasterId,
                    ) || null;
                  if (ps_data) {
                    let ps_value = 0;

                    if (esicDeduction == true) {
                      // only for AMMAN ASSOCIATED SERVICES PRIVATE LIMITED
                      if (calculateEsicOnGross) {
                        ps_value = (+ps_employee_gross * 3.25) / 100;
                      } else {
                        const onedaysalary =
                          Number(ps_data.ActualEmployeeSalaryAmount) /
                          Number(salary_CalculationDays);

                        ps_value = Number(onedaysalary) * ps_paidDays;
                      }

                      ps_value = Math.max(ps_value, 0);

                      ps_value += +ps_OtherEmployer_ESIC_Amount;

                      // check max range

                      if (ps_data.GSS.salaryfieldmaxrange) {
                        if (+ps_value > +ps_data.GSS.salaryfieldmaxrange) {
                          ps_value = +ps_data.GSS.salaryfieldmaxrange;
                        }
                      }
                    }

                    const obj = ps_structuredData(
                      ps_data,
                      ps_value,
                      null,
                      null,
                      true,
                    );

                    payrollStatutoryArray.push(obj);
                  }
                }
              }
            }

            // ------------------ LWF deduction -----------------

            if (employee_lwf) {
              let value = 0;

              const stateId = +employee_lwf.stateid || null;

              const lwfData = allLWFStateWiseMap?.get(stateId);

              const salaryCalculation_Act = ['F', 'W'].includes(
                salaryCalculationAct,
              )
                ? 'F'
                : 'S';
              const month = +String(yearmonth).slice(4, 6);

              if (lwfData?.length && +employee_gross > 0) {
                const lwf_data = lwfData.find(
                  (e) =>
                    (e.applicableAct || []).includes(salaryCalculation_Act) &&
                    (!e.month || (e.month || [])?.includes(month)),
                );

                value = getLwfAmountForSalary(
                  lwf_data,
                  employee_lwf.payheadMasterId,
                  employee_gross,
                );
              }

              userSalaryArray.push({
                salaryMasterID: employee_lwf.salaryMasterID,
                payheadmasterid: employee_lwf.payheadMasterId,
                payheadName:
                  employee_lwf.payheadDisplayName &&
                  employee_lwf.payheadDisplayName.trim()
                    ? employee_lwf.payheadDisplayName.trim()
                    : employee_lwf.payheadName,
                employeeAmount: getRoundOffSalary(
                  value,
                  employee_lwf.salaryFieldRound,
                  employee_lwf.roundOffType,
                  employee_lwf.salaryFieldRoundNo,
                ),
                salaryfieldsrno: employee_lwf.salaryFieldSrNo,
                salaryfieldside: employee_lwf.salaryFieldSide,
                salaryfieldshow: employee_lwf.salaryFieldShow,
                calculatedOn: null,
                salaryfieldmaxrange: employee_lwf.salaryfieldmaxrange,
              });

              // ------------------ Payroll Statutory ----------------------

              if (ps_calculate) {
                const ps_data =
                  payrollStatutoryDetails?.get(employee_lwf.payheadMasterId) ||
                  null;

                if (ps_data) {
                  let ps_value = 0;

                  if (lwfData?.length && +ps_employee_gross > 0) {
                    const lwf_data = lwfData.find(
                      (e) =>
                        (e.applicableAct || []).includes(
                          salaryCalculation_Act,
                        ) &&
                        (!e.month || (e.month || [])?.includes(month)),
                    );

                    ps_value = getLwfAmountForSalary(
                      lwf_data,
                      employee_lwf.payheadMasterId,
                      ps_employee_gross,
                    );
                  }

                  const obj = ps_structuredData(
                    ps_data,
                    ps_value,
                    null,
                    null,
                    true,
                  );

                  payrollStatutoryArray.push(obj);
                }
              }
            }

            if (employer_lwf) {
              let value = 0;

              const stateId = +employer_lwf.stateid || null;

              const lwfData = allLWFStateWiseMap?.get(stateId);

              const salaryCalculation_Act = ['F', 'W'].includes(
                salaryCalculationAct,
              )
                ? 'F'
                : 'S';
              const month = +String(yearmonth).slice(4, 6);

              if (lwfData?.length && +employee_gross > 0) {
                const lwf_data = lwfData.find(
                  (e) =>
                    (e.applicableAct || []).includes(salaryCalculation_Act) &&
                    (!e.month || (e.month || [])?.includes(month)),
                );

                value = getLwfAmountForSalary(
                  lwf_data,
                  employer_lwf.payheadMasterId,
                  employee_gross,
                );
              }

              userSalaryArray.push({
                salaryMasterID: employer_lwf.salaryMasterID,
                payheadmasterid: employer_lwf.payheadMasterId,
                payheadName:
                  employer_lwf.payheadDisplayName &&
                  employer_lwf.payheadDisplayName.trim()
                    ? employer_lwf.payheadDisplayName.trim()
                    : employer_lwf.payheadName,
                employeeAmount: getRoundOffSalary(
                  value,
                  employer_lwf.salaryFieldRound,
                  employer_lwf.roundOffType,
                  employer_lwf.salaryFieldRoundNo,
                ),
                salaryfieldsrno: employer_lwf.salaryFieldSrNo,
                salaryfieldside: employer_lwf.salaryFieldSide,
                salaryfieldshow: employer_lwf.salaryFieldShow,
                calculatedOn: null,
                salaryfieldmaxrange: employer_lwf.salaryfieldmaxrange,
              });

              // ------------------ Payroll Statutory ----------------------

              if (ps_calculate) {
                const ps_data =
                  payrollStatutoryDetails?.get(employer_lwf.payheadMasterId) ||
                  null;

                if (ps_data) {
                  let ps_value = 0;

                  if (lwfData?.length && +ps_employee_gross > 0) {
                    const lwf_data = lwfData.find(
                      (e) =>
                        (e.applicableAct || []).includes(
                          salaryCalculation_Act,
                        ) &&
                        (!e.month || (e.month || [])?.includes(month)),
                    );

                    ps_value = getLwfAmountForSalary(
                      lwf_data,
                      employer_lwf.payheadMasterId,
                      ps_employee_gross,
                    );
                  }

                  const obj = ps_structuredData(
                    ps_data,
                    ps_value,
                    null,
                    null,
                    true,
                  );

                  payrollStatutoryArray.push(obj);
                }
              }
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

            // employer side deduction

            employerDeduction = userSalaryArray.filter(
              (s) => s.salaryfieldsrno == 'C' && +s.employeeAmount > 0,
            );

            EmployerSideAmount = employerDeduction.reduce(
              (acc, obj) => acc + +obj.employeeAmount,
              0,
            );

            userSalaryArray = userSalaryArray.filter((s) => {
              return s.salaryfieldsrno != 'C' && s.salaryfieldshow == 'Y';
            });

            // show data

            for (let g = 0; g < userSalaryArray.length; g++) {
              if (
                [
                  16, 17, 24, 34, 9, 43, 14, 13, 15, 78, 83, 99, 67, 101, 102,
                  103, 104, 107, 112, 116, 135, 123, 125, 126, 127, 133, 147,
                  122, 130, 148, 18, 59, 151, 152,
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

            employee_netPay = Number(totalear) - Number(totaldedu);

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

            employee_ctc =
              +employee_gross +
              +employee_extraAddInNetPay +
              +EmployerSideAmount;

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

            // --------------------------- Payroll Statutory -----------------------------

            let ps_employeefinalSalary = [...payrollStatutoryArray];

            if (ps_calculate) {
              const { EMPLOYER_DEDUCTION } = salaryFieldSrNoFields;

              for (const s of payrollStatutoryArray) {
                if (
                  s.salaryfieldsrno === EMPLOYER_DEDUCTION &&
                  +s.employeeAmount > 0
                ) {
                  ps_employerDeduction.push(s);
                  ps_employerSideAmount += +s.employeeAmount;
                }
              }

              // Filter (kept as-is, single pass, no change needed here)
              payrollStatutoryArray = payrollStatutoryArray.filter(
                (s) =>
                  s.salaryfieldsrno !== EMPLOYER_DEDUCTION &&
                  s.salaryfieldshow === 'Y' &&
                  ((notIncludePyaheadIds.includes(s.payheadmasterid) &&
                    s.employeeAmount > 0) ||
                    !notIncludePyaheadIds.includes(s.payheadmasterid)),
              );

              // Single pass: totalEarnings + totalDeduction computed together
              let totalEarnings = 0;
              let totalDeduction = 0;
              for (const e of payrollStatutoryArray) {
                const amt = +e.employeeAmount;
                if (e.salaryfieldside === 'E') totalEarnings += amt;
                else if (e.salaryfieldside === 'D') totalDeduction += amt;
              }

              ps_employee_netPay = totalEarnings - totalDeduction;
              ps_employee_ctc =
                ps_employee_gross + ps_addInNetPay + ps_employerSideAmount;
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

                // --------------------------- Payroll Statutory ----------------------------------

                if (ps_calculate) {
                  const ps_data = payrollStatutoryDetails?.get(
                    e.payheadMasterId,
                  );

                  if (ps_data) {
                    const { GROSS, NETSALARY } = payheadMasterIdsMapping;
                    const payheadId = e.payheadMasterId;

                    const amount =
                      payheadId == GROSS
                        ? ps_employee_gross
                        : payheadId == NETSALARY
                          ? ps_employee_netPay
                          : ps_employee_ctc;

                    ps_employeefinalSalary.push(
                      ps_structuredData(ps_data, amount, null, null, true),
                    );
                  }
                }
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

            // ----------------------- Payroll Statutory ----------------------

            if (ps_calculate) {
              const { INCENTIVE, PENALTY, DEPOSIT_DEDUCTION, DEPOSIT_PAY } =
                payheadMasterIdsMapping;

              // Map of payheadmasterid -> replacement array, only for non-empty ones
              const ps_replacements = [
                [INCENTIVE, ps_incentiveArray],
                [PENALTY, ps_penaltyArray],
                [DEPOSIT_DEDUCTION, ps_depositArray],
                [DEPOSIT_PAY, ps_depositPayArray],
              ].filter(([, arr]) => arr.length);

              if (ps_replacements.length) {
                const excludeIds = new Set(ps_replacements.map(([id]) => id));

                // Single pass to remove all matching payheadmasterids at once
                ps_employeefinalSalary = ps_employeefinalSalary.filter(
                  (e) => !excludeIds.has(e.payheadmasterid),
                );

                // Push replacements
                for (const [, arr] of ps_replacements) {
                  ps_employeefinalSalary.push(arr[0]);
                }
              }
            }

            const advanceIds =
              advanceData.length > 0
                ? advanceData.map((e) => e.advancePaymentID)
                : [];
            const loantranIds =
              loanData.length > 0
                ? loanData.map((e) => e.LoanTrasactionId)
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
              let add_data = await HrSalaryTrans.create(
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
                await advancePayments.update(
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
                await LoanTransactions.update(
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
                await employeePenalties.update(
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
                await OverTimeCalculationMains.update(
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
                    salaryMonthToPay: yearmonth,
                    payReferenceId: add_data.userSalaryTranID,
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

              // update Expense Reimbursement

              if (
                expensePaymentId?.length &&
                employeefinalsalary[l].payheadmasterid ==
                  payheadMasterIdsMapping.EXPENSE_REIMBURSEMENT
              ) {
                await expensePayment.update(
                  {
                    referenceId: add_data.userSalaryTranID,
                    paymentDate: end_date,
                    updateBy: createBy,
                    updateByIp: createByIp,
                  },
                  {
                    where: {
                      ExpensePaymentID: {
                        [Sequelize.Op.in]: expensePaymentId,
                      },
                    },
                    transaction: t,
                  },
                );
              }
            }

            // -------------------------Payroll Statutory -------------------------

            if (ps_calculate) {
              const unPaidIds = [
                HrLeaveTypesIds.ABSENT,
                HrLeaveTypesIds.LWP,
                HrLeaveTypesIds.ATTENDANCE_PENALTY,
                HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH,
                HrLeaveTypesIds.WA,
              ];

              const presentData = allVerifiedData.find(
                (e) => e['hrLeaveType.LeaveID'] == HrLeaveTypesIds.PRESENT,
              );
              const unpaidData = allVerifiedData.filter((e) =>
                unPaidIds.includes(e['hrLeaveType.LeaveID']),
              );

              ps_extra_days = ps_paidDays - usertotalpresentday;

              const { updatedPresentData, updatedUnpaidData } =
                settleExtraDaysIntoPresent(
                  presentData,
                  unpaidData,
                  ps_extra_days,
                );

              const exceludeId = [HrLeaveTypesIds.PRESENT, ...unPaidIds];

              const attnCalData = allVerifiedData.filter(
                (e) => !exceludeId.includes(+e['hrLeaveType.LeaveID']),
              );

              const finalData = [
                updatedPresentData,
                ...attnCalData,
                ...updatedUnpaidData,
              ];

              ps_attendanceCalData = [...finalData];

              const mappedData = finalData.map((e) => {
                return {
                  userMasterID: e.userMasterID,
                  LeaveTranId: e.LeaveTranId,
                  AttnYearMon: e.AttnYearMon,
                  MonDays: e.MonDays,
                  MonWorkDays: e.MonWorkDays,
                  AttnVal: e.AttnVal,
                  monthstartdate: e.monthstartdate,
                  monthenddate: e.monthenddate,
                  payrollFrequency: e.payrollFrequency,
                  startDate: e.startDate,
                  endDate: e.endDate,
                };
              });

              await PayrollStatutoryAttnCal.bulkCreate(mappedData, {
                user: req.userDetails,
                individualHooks: true,
                transaction: t,
              });

              const salaryCalculatedOn = Math.max(ps_paidDays, 0);

              ps_paidDays = salaryCalculatedOn;

              const ps_bulkPayload = ps_employeefinalSalary.map((ps) => ({
                userMasterID: usermaster[i].userMasterID,
                psDetailsId: ps.psDetailsId,
                salaryYYYYMM: yearmonth,
                EmployeeSalaryAmount: ps.employeeAmount,
                SalaryCalcOnDays: salaryCalculatedOn,
                calculatedOn: ps.calculatedOn,
              }));

              const ps_createdRecords =
                await PayrollStatutorySalaryTrans.bulkCreate(ps_bulkPayload, {
                  user: req.userDetails,
                  individualHooks: true,
                  transaction: t,
                  returning: true,
                });

              const ps_recordMap = new Map(
                ps_createdRecords.map((r) => [r.psDetailsId, r.id]),
              );

              const ps_updatePromises = [];

              for (const ps of ps_employeefinalSalary) {
                const createdId = ps_recordMap.get(ps.psDetailsId);

                if (!createdId) {
                  continue;
                }

                if (
                  ps.payheadmasterid === payheadMasterIdsMapping.INCENTIVE &&
                  incentiveIds?.length
                ) {
                  ps_updatePromises.push(
                    Employeeincentive.update(
                      { ps_salaryTransId: createdId },
                      {
                        where: {
                          employeeincentiveID: {
                            [Sequelize.Op.in]: incentiveIds,
                          },
                        },
                        transaction: t,
                      },
                    ),
                  );
                }

                if (
                  ps.payheadmasterid === payheadMasterIdsMapping.PENALTY &&
                  penaltyIds?.length
                ) {
                  ps_updatePromises.push(
                    EmployeePenalty.update(
                      { ps_salaryTransId: createdId },
                      {
                        where: {
                          employeePenaltyID: { [Sequelize.Op.in]: penaltyIds },
                        },
                        transaction: t,
                      },
                    ),
                  );
                }

                if (
                  ps.payheadmasterid == payheadMasterIdsMapping.OT &&
                  remaingAmountData.adjustMode ==
                    PayrollStatutoryAdjustModeEnum.OVERTIME &&
                  remaingAmountData.amount > 0
                ) {
                  remaingAmountData.ps_salaryTransId = createdId;

                  ps_updatePromises.push(
                    PayrollStatutoryAdjustment.create(remaingAmountData, {
                      user: req.userDetails,
                      transaction: t,
                    }),
                  );
                }
              }

              if (
                remaingAmountData.adjustMode ==
                PayrollStatutoryAdjustModeEnum.CASH
              ) {
                ps_updatePromises.push(
                  PayrollStatutoryAdjustment.create(remaingAmountData, {
                    user: req.userDetails,
                    transaction: t,
                  }),
                );
              }

              await Promise.all(ps_updatePromises);
            }
          }

          // Day wise salary calculation
          else if (salarystructure[0].baseOnCalculation == 'D') {
            let incentiveArray = [];
            let finalinsentivearray = [];
            let finalpenaltyarray = [];
            let overtimeArray = [];

            let overtimeAmount = 0;
            let pfIncentiveAmount = 0;
            let esicIncentiveAmount = 0;

            let OtherEmployee_ESIC_Amount = 0;
            let OtherEmployer_ESIC_Amount = 0;
            let ESIC_CalculatedOn_Amount = 0;

            let basicSalaryForBasedOnDays = 0;

            const basedOnDaysData = AllBasedOnDaysSalaryData.filter(
              (e) => e.gradeStructureID == salarystructure[0].gradeStructureID,
            );

            for (let j = 0; j < salarystructure.length; j++) {
              let finalsalary = 0;

              if (salarystructure[j].payheadMasterId == 16) {
                //Advance

                finalsalary = advanceData.reduce((acc, item) => {
                  const childSum = (item.employeeRepayments || []).reduce(
                    (sum, child) => sum + +child.amount,
                    0,
                  );
                  return acc + (+item.amount - +childSum);
                }, 0);

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: finalsalary > 0 ? Math.round(finalsalary) : 0,
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(ps_data, finalsalary, null);

                    payrollStatutoryArray.push(obj);
                  }
                }
              } else if (salarystructure[j].payheadMasterId == 17) {
                //Loan

                finalsalary = loanData.reduce(
                  (acc, obj) => acc + +obj.EMIAmount,
                  0,
                );

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: Math.round(finalsalary),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(ps_data, finalsalary, null);

                    payrollStatutoryArray.push(obj);
                  }
                }
              } else if (salarystructure[j].payheadMasterId == 24) {
                // Incentive

                let ps_incentive = false;
                let ps_data = null;

                if (ps_calculate) {
                  ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) ps_incentive = true;
                }

                let incentive = incentiveData;

                let incentiveid = [];
                let amountarray = [];
                if (incentive.length > 0) {
                  for (let a = 0; a < incentive.length; a++) {
                    amountarray.push(+incentive[a].amount);

                    const incentiveName = incentive[a].incentivetype
                      .inc_type_displayName
                      ? incentive[a].incentivetype.inc_type_displayName
                      : incentive[a].incentivetype.incentivetypename;

                    // FOR ESIC
                    if (incentive[a].incentivetype.esicApplicable == 'true') {
                      OtherEmployee_ESIC_Amount +=
                        (+incentive[a].amount *
                          +incentive[a].incentivetype.employeeESICPer) /
                        100;
                      OtherEmployer_ESIC_Amount +=
                        (+incentive[a].amount *
                          +incentive[a].incentivetype.employerESICPer) /
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

                      if (incentive[a].incentivetype.consider == 'gross') {
                        if (incentive[a].incentivetype.pfApplicable == 'true') {
                          pfIncentiveAmount =
                            +pfIncentiveAmount + +incentive[a].amount;
                        }

                        if (
                          incentive[a].incentivetype.esicApplicable == 'true'
                        ) {
                          esicIncentiveAmount =
                            +esicIncentiveAmount + +incentive[a].amount;
                        }

                        userSalaryArray = userSalaryArray.filter((e) => {
                          return e.incentiveid != incentive[a].IncentivetypeID;
                        });

                        userSalaryArray.push({
                          salaryMasterID: salarystructure[j].salaryMasterID,
                          payheadmasterid: salarystructure[j].payheadMasterId,
                          payheadName: incentiveName,
                          employeeAmount: Math.round(totalAmount),
                          salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                          salaryfieldside: salarystructure[j].salaryFieldSide,
                          salaryfieldshow: salarystructure[j].salaryFieldShow,
                          calculatedOn: null,
                          salaryfieldmaxrange:
                            salarystructure[j].salaryfieldmaxrange,
                          incentiveid: incentive[a].IncentivetypeID,
                        });

                        // ------------------------payroll statutory -------------------

                        if (ps_incentive) {
                          payrollStatutoryArray = payrollStatutoryArray.filter(
                            (e) => {
                              return (
                                e.incentiveid != incentive[a].IncentivetypeID
                              );
                            },
                          );

                          const obj = ps_structuredData(
                            ps_data,
                            totalAmount,
                            null,
                            incentiveName,
                          );
                          obj.incentiveid = incentive[a].IncentivetypeID;
                          obj.considerIn =
                            incentive[a].incentivetype.consider == 'gross'
                              ? salaryConsiderInEnum.GROSS
                              : salaryConsiderInEnum.NET_SALARY;

                          payrollStatutoryArray.push(obj);
                        }
                      }

                      incentiveArray = incentiveArray.filter((e) => {
                        return e.incentiveid != incentive[a].IncentivetypeID;
                      });

                      incentiveArray.push({
                        salaryMasterID: salarystructure[j].salaryMasterID,
                        payheadmasterid: salarystructure[j].payheadMasterId,
                        payheadName: incentiveName,
                        employeeAmount: Math.round(totalAmount),
                        salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                        salaryfieldside: salarystructure[j].salaryFieldSide,
                        salaryfieldshow: salarystructure[j].salaryFieldShow,
                        calculatedOn: null,
                        salaryfieldmaxrange:
                          salarystructure[j].salaryfieldmaxrange,
                        incentiveid: incentive[a].IncentivetypeID,
                      });
                    } else {
                      incentiveid.push(incentive[a].IncentivetypeID);

                      if (incentive[a].incentivetype.consider == 'gross') {
                        if (incentive[a].incentivetype.pfApplicable == 'true') {
                          pfIncentiveAmount =
                            +pfIncentiveAmount + +incentive[a].amount;
                        }

                        if (
                          incentive[a].incentivetype.esicApplicable == 'true'
                        ) {
                          esicIncentiveAmount =
                            +esicIncentiveAmount + +incentive[a].amount;
                        }

                        userSalaryArray.push({
                          salaryMasterID: salarystructure[j].salaryMasterID,
                          payheadmasterid: salarystructure[j].payheadMasterId,
                          payheadName: incentiveName,
                          employeeAmount: Math.round(incentive[a].amount),
                          salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                          salaryfieldside: salarystructure[j].salaryFieldSide,
                          salaryfieldshow: salarystructure[j].salaryFieldShow,
                          calculatedOn: null,
                          salaryfieldmaxrange:
                            salarystructure[j].salaryfieldmaxrange,
                          incentiveid: incentive[a].IncentivetypeID,
                        });

                        // ------------------------payroll statutory -------------------

                        if (ps_incentive) {
                          const obj = ps_structuredData(
                            ps_data,
                            incentive[a].amount,
                            null,
                            incentiveName,
                          );
                          obj.incentiveid = incentive[a].IncentivetypeID;
                          obj.considerIn =
                            incentive[a].incentivetype.consider == 'gross'
                              ? salaryConsiderInEnum.GROSS
                              : salaryConsiderInEnum.NET_SALARY;
                          payrollStatutoryArray.push(obj);
                        }
                      }

                      incentiveArray.push({
                        salaryMasterID: salarystructure[j].salaryMasterID,
                        payheadmasterid: salarystructure[j].payheadMasterId,
                        payheadName: incentiveName,
                        employeeAmount: Math.round(incentive[a].amount),
                        salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                        salaryfieldside: salarystructure[j].salaryFieldSide,
                        salaryfieldshow: salarystructure[j].salaryFieldShow,
                        calculatedOn: null,
                        salaryfieldmaxrange:
                          salarystructure[j].salaryfieldmaxrange,
                        incentiveid: incentive[a].IncentivetypeID,
                      });
                    }
                  }

                  let finalamount = amountarray.reduce((acc, obj) => {
                    return acc + obj;
                  }, 0);

                  finalinsentivearray.push({
                    salaryMasterID: salarystructure[j].salaryMasterID,
                    payheadmasterid: salarystructure[j].payheadMasterId,
                    payheadName:
                      salarystructure[j].payheadDisplayName &&
                      salarystructure[j].payheadDisplayName.trim()
                        ? salarystructure[j].payheadDisplayName.trim()
                        : salarystructure[j].payheadName,
                    employeeAmount: Math.round(finalamount),
                    salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                    salaryfieldside: salarystructure[j].salaryFieldSide,
                    salaryfieldshow: salarystructure[j].salaryFieldShow,
                    calculatedOn: null,
                    salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
                    incentiveid: null,
                  });

                  // ------------------------ payroll statutory -------------------

                  if (ps_incentive) {
                    const obj = ps_structuredData(
                      ps_data,
                      finalamount,
                      null,
                      null,
                    );
                    ps_incentiveArray.push(obj);
                  }
                } else {
                  userSalaryArray.push({
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
                  });

                  //---------------------- for payroll statutory --------------

                  if (ps_calculate) {
                    const ps_data =
                      payrollStatutoryDetails?.get(
                        salarystructure[j].payheadMasterId,
                      ) || null;

                    if (ps_data) {
                      const obj = ps_structuredData(ps_data, 0, null, null);

                      payrollStatutoryArray.push(obj);
                    }
                  }
                }
              } else if (salarystructure[j].payheadMasterId == 34) {
                // Penalty

                if (penaltydata.length > 0) {
                  // Step 1: Group penalties by penaltyID and sum amounts
                  const penaltyMap = new Map();

                  penaltydata.forEach((penalty) => {
                    const existing = penaltyMap.get(penalty.penaltyID);
                    if (existing) {
                      existing.amount += Number(penalty.amount);
                    } else {
                      penaltyMap.set(penalty.penaltyID, {
                        penaltyID: penalty.penaltyID,
                        penaltyName: penalty.penaltyName,
                        amount: Number(penalty.amount),
                      });
                    }
                  });

                  // Step 2: Add grouped penalties to userSalaryArray (rounded per penalty type)
                  penaltyMap.forEach((penalty) => {
                    userSalaryArray.push({
                      salaryMasterID: salarystructure[j].salaryMasterID,
                      payheadmasterid: salarystructure[j].payheadMasterId,
                      payheadName: penalty.penaltyName,
                      employeeAmount: Math.round(penalty.amount), // Round after summing
                      salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                      salaryfieldside: salarystructure[j].salaryFieldSide,
                      salaryfieldshow: salarystructure[j].salaryFieldShow,
                      calculatedOn: null,
                      salaryfieldmaxrange:
                        salarystructure[j].salaryfieldmaxrange,
                      penaltyid: penalty.penaltyID,
                    });

                    //---------------------- for payroll statutory --------------

                    if (ps_calculate) {
                      const ps_data =
                        payrollStatutoryDetails?.get(
                          salarystructure[j].payheadMasterId,
                        ) || null;

                      if (ps_data) {
                        const obj = ps_structuredData(
                          ps_data,
                          Math.round(penalty.amount),
                          null,
                          penalty.penaltyName,
                        );

                        payrollStatutoryArray.push(obj);
                      }
                    }
                  });

                  // Step 3: Calculate total penalty amount for finalpenaltyarray
                  const totalPenaltyAmount = Array.from(
                    penaltyMap.values(),
                  ).reduce((sum, penalty) => sum + penalty.amount, 0);

                  finalpenaltyarray.push({
                    salaryMasterID: salarystructure[j].salaryMasterID,
                    payheadmasterid: salarystructure[j].payheadMasterId,
                    payheadName:
                      salarystructure[j].payheadDisplayName &&
                      salarystructure[j].payheadDisplayName.trim()
                        ? salarystructure[j].payheadDisplayName.trim()
                        : salarystructure[j].payheadName,
                    employeeAmount: Math.round(totalPenaltyAmount), // Round total
                    salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                    salaryfieldside: salarystructure[j].salaryFieldSide,
                    salaryfieldshow: salarystructure[j].salaryFieldShow,
                    calculatedOn: null,
                    salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
                    penaltyid: null,
                  });

                  //---------------------- for payroll statutory --------------

                  if (ps_calculate) {
                    const ps_data =
                      payrollStatutoryDetails?.get(
                        salarystructure[j].payheadMasterId,
                      ) || null;

                    if (ps_data) {
                      const obj = ps_structuredData(
                        ps_data,
                        Math.round(totalPenaltyAmount),
                        null,
                        null,
                      );

                      ps_penaltyArray.push(obj);
                    }
                  }
                } else {
                  userSalaryArray.push({
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
                  });
                }

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(ps_data, 0, null, null);

                    payrollStatutoryArray.push(obj);
                  }
                }
              } else if (salarystructure[j].payheadMasterId == 9) {
                // TDS

                userSalaryArray.push({
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
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(ps_data, 0, null, null);

                    payrollStatutoryArray.push(obj);
                  }
                }
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
                    overtime_min = +overtime.overtimehrs;

                    overtimeAmount = Number(overtime.TotalAmount);

                    if (consider == 'gross') {
                      //For ESIC
                      if (esicApplicable == 'true') {
                        OtherEmployee_ESIC_Amount +=
                          (+overtimeAmount *
                            +userAttendacepolicy.employeeESICPer) /
                          100;
                        OtherEmployer_ESIC_Amount +=
                          (+overtimeAmount *
                            +userAttendacepolicy.employerESICPer) /
                          100;
                        ESIC_CalculatedOn_Amount += +overtimeAmount;
                      }

                      userSalaryArray.push({
                        salaryMasterID: salarystructure[j].salaryMasterID,
                        payheadmasterid: salarystructure[j].payheadMasterId,
                        payheadName:
                          salarystructure[j].payheadDisplayName &&
                          salarystructure[j].payheadDisplayName.trim()
                            ? salarystructure[j].payheadDisplayName.trim()
                            : salarystructure[j].payheadName,
                        employeeAmount: Number(overtime.TotalAmount),
                        salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                        salaryfieldside: salarystructure[j].salaryFieldSide,
                        salaryfieldshow: salarystructure[j].salaryFieldShow,
                        calculatedOn: null,
                        salaryfieldmaxrange:
                          salarystructure[j].salaryfieldmaxrange,
                      });
                    } else {
                      overtimeArray.push({
                        salaryMasterID: salarystructure[j].salaryMasterID,
                        payheadmasterid: salarystructure[j].payheadMasterId,
                        payheadName:
                          salarystructure[j].payheadDisplayName &&
                          salarystructure[j].payheadDisplayName.trim()
                            ? salarystructure[j].payheadDisplayName.trim()
                            : salarystructure[j].payheadName,
                        employeeAmount: Number(overtime.TotalAmount),
                        salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                        salaryfieldside: salarystructure[j].salaryFieldSide,
                        salaryfieldshow: salarystructure[j].salaryFieldShow,
                        calculatedOn: null,
                        salaryfieldmaxrange:
                          salarystructure[j].salaryfieldmaxrange,
                      });
                    }

                    //---------------------- for payroll statutory --------------

                    if (ps_calculate) {
                      const ps_data =
                        payrollStatutoryDetails?.get(
                          salarystructure[j].payheadMasterId,
                        ) || null;

                      if (ps_data) {
                        const obj = ps_structuredData(
                          ps_data,
                          +overtime.TotalAmount,
                          null,
                          null,
                        );
                        obj.considerIn =
                          consider != 'gross'
                            ? salaryConsiderInEnum.NET_SALARY
                            : salaryConsiderInEnum.GROSS;

                        payrollStatutoryArray.push(obj);
                      }
                    }
                  } else {
                    userSalaryArray.push({
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
                      salaryfieldmaxrange:
                        salarystructure[j].salaryfieldmaxrange,
                    });

                    //---------------------- for payroll statutory --------------

                    if (ps_calculate) {
                      const ps_data =
                        payrollStatutoryDetails?.get(
                          salarystructure[j].payheadMasterId,
                        ) || null;

                      if (ps_data) {
                        const obj = ps_structuredData(ps_data, 0, null, null);

                        payrollStatutoryArray.push(obj);
                      }
                    }
                  }
                } else {
                  userSalaryArray.push({
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
                  });

                  //---------------------- for payroll statutory --------------

                  if (ps_calculate) {
                    const ps_data =
                      payrollStatutoryDetails?.get(
                        salarystructure[j].payheadMasterId,
                      ) || null;

                    if (ps_data) {
                      const obj = ps_structuredData(ps_data, 0, null, null);

                      payrollStatutoryArray.push(obj);
                    }
                  }
                }
              } else if (salarystructure[j].payheadMasterId == 15) {
              } else if (salarystructure[j].payheadMasterId == 13) {
              } else if (salarystructure[j].payheadMasterId == 14) {
              } else if (
                salarystructure[j].payheadMasterId ==
                payheadMasterIdsMapping.EMPLOYEE_LWF
              ) {
                employee_lwf = salarystructure[j];
              } else if (
                salarystructure[j].payheadMasterId ==
                payheadMasterIdsMapping.EMPLOYER_LWF
              ) {
                employer_lwf = salarystructure[j];
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

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: Math.round(finalsalary),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(ps_data, finalsalary, null);

                    payrollStatutoryArray.push(obj);
                  }
                }
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

                depositToDeductionArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: Math.round(finalsalary),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: null,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const ps_result = Object.values(
                      depositToDeduction.reduce((acc, curr) => {
                        if (!acc[curr.depositcategory.depositcategoryname]) {
                          acc[curr.depositcategory.depositcategoryname] =
                            ps_structuredData(ps_data, 0, null, null);
                        }
                        acc[
                          curr.depositcategory.depositcategoryname
                        ].employeeAmount += curr.amount; // Sum the amount
                        return acc;
                      }, {}),
                    );

                    payrollStatutoryArray = [
                      ...payrollStatutoryArray,
                      ...ps_result,
                    ];

                    const data = ps_structuredData(
                      ps_data,
                      finalsalary,
                      null,
                      null,
                    );

                    ps_depositArray.push(data);
                  }
                }
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

                depositToPayArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: Math.round(finalsalary),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: null,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const ps_result = Object.values(
                      depositToPay.reduce((acc, curr) => {
                        if (!acc[curr.depositcategory.depositcategoryname]) {
                          acc[curr.depositcategory.depositcategoryname] =
                            ps_structuredData(ps_data, 0, null, null);
                        }
                        acc[
                          curr.depositcategory.depositcategoryname
                        ].employeeAmount += curr.amount; // Sum the amount
                        return acc;
                      }, {}),
                    );

                    payrollStatutoryArray = [
                      ...payrollStatutoryArray,
                      ...ps_result,
                    ];

                    const data = ps_structuredData(
                      ps_data,
                      finalsalary,
                      null,
                      null,
                    );

                    ps_depositPayArray.push(data);
                  }
                }
              } else if (salarystructure[j].payheadMasterId == 67) {
                // Leave Encashment

                const { amount, encashIds } = calculateLeaveEncashment(
                  allEmployeeLeavePolicy,
                  AllHrleaveTypes,
                  employeeLeaveEncashment,
                  AllsalarystructureData,
                  salary_calculation_wise,
                  salary_CalculationDays,
                  dailyworkingminutes || 0,
                );

                // set encashids
                finalEncashIds = encashIds;

                // for esic
                if (
                  salarystructure[j].considerIn !=
                  payheadConsiderInEnum.NETSALARY
                ) {
                  OtherEmployee_ESIC_Amount +=
                    (Math.round(amount) * 0.75) / 100;
                  OtherEmployer_ESIC_Amount +=
                    (Math.round(amount) * 3.25) / 100;
                }

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: Math.round(amount),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: null,
                  considerIn: salarystructure[j].considerIn,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const data = ps_structuredData(
                      ps_data,
                      Math.round(amount),
                      null,
                      null,
                    );
                    data.considerIn = salarystructure[j].considerIn;

                    payrollStatutoryArray.push(data);
                  }
                }
              } else if (salarystructure[j].payheadMasterId == 101) {
                BonusPayData = salarystructure[j];
              } // Weekoff Salary
              else if (salarystructure[j].payheadMasterId == 147) {
                let amount = 0;

                if (weekoffSalaryCalculated) {
                  amount = calculateWeekoffSalary(
                    weekoff_PayheadIds,
                    weekoffCount,
                    CTC_GROSS_NET,
                    salarystructure,
                    salary_CalculationDays,
                    'Daily',
                  );
                }

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: Math.round(amount),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: null,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(ps_data, amount, null);

                    payrollStatutoryArray.push(obj);
                  }
                }
              }

              // Expense Reimbursement
              else if (salarystructure[j].payheadMasterId == 116) {
                const expenseAmount = expenseData.reduce(
                  (acc, obj) => acc + +obj.amount,
                  0,
                );

                expensePaymentId = expenseData.map((e) => e.ExpensePaymentID);

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: getRoundOffSalary(
                    expenseAmount,
                    salarystructure[j].salaryFieldRound,
                    salarystructure[j].roundOffType,
                    salarystructure[j].salaryFieldRoundNo,
                  ),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: null,
                  considerIn: salarystructure[j].considerIn,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(ps_data, finalsalary, null);
                    (obj.considerIn = salarystructure[j].considerIn),
                      payrollStatutoryArray.push(obj);
                  }
                }
              }
              // Paid Leave Hrs
              else if (
                salarystructure[j].payheadMasterId ==
                payheadMasterIdsMapping.PAID_LEAVE_HOURS
              ) {
                let paidLeaveAmount = 0;

                if (
                  salary_calculation_wise === 'hourwise' &&
                  !convertWorkedHoursToDays &&
                  paidLeaveMinutes > 0
                ) {
                  paidLeaveAmount = calculatePaidLeaveHours(
                    gross,
                    salaryStructureBaseoncal,
                    dailyworkingminutes,
                    salary_CalculationDays,
                    paidLeaveMinutes,
                  );
                }

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: getRoundOffSalary(
                    paidLeaveAmount,
                    salarystructure[j].salaryFieldRound,
                    salarystructure[j].roundOffType,
                    salarystructure[j].salaryFieldRoundNo,
                  ),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: null,
                  considerIn: salarystructure[j].considerIn,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(
                      ps_data,
                      paidLeaveAmount,
                      null,
                      null,
                    );
                    (obj.considerIn = salarystructure[j].considerIn),
                      payrollStatutoryArray.push(obj);
                  }
                }
              }

              // SHORT FALL HOURS
              else if (
                salarystructure[j].payheadMasterId ==
                payheadMasterIdsMapping.SHORT_FALL_HOURS
              ) {
                const amount = shortFallHoursCalculation(
                  salary_CalculationDays,
                  gross,
                  salaryStructureBaseoncal,
                  salary_calculation_wise,
                  attendanceTransData,
                );

                userSalaryArray.push({
                  salaryMasterID: salarystructure[j].salaryMasterID,
                  payheadmasterid: salarystructure[j].payheadMasterId,
                  payheadName:
                    salarystructure[j].payheadDisplayName &&
                    salarystructure[j].payheadDisplayName.trim()
                      ? salarystructure[j].payheadDisplayName.trim()
                      : salarystructure[j].payheadName,
                  employeeAmount: getRoundOffSalary(
                    amount,
                    salarystructure[j].salaryFieldRound,
                    salarystructure[j].roundOffType,
                    salarystructure[j].salaryFieldRoundNo,
                  ),
                  salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  salaryfieldside: salarystructure[j].salaryFieldSide,
                  salaryfieldshow: salarystructure[j].salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: null,
                  considerIn: salarystructure[j].considerIn,
                });

                //---------------------- for payroll statutory --------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      salarystructure[j].payheadMasterId,
                    ) || null;

                  if (ps_data) {
                    const obj = ps_structuredData(ps_data, amount, null, null);
                    (obj.considerIn = salarystructure[j].considerIn),
                      payrollStatutoryArray.push(obj);
                  }
                }
              } else {
                const RA_payheadMasterId = salarystructure[j]
                  .remainingAmtSalaryFieldID
                  ? salarystructure.find(
                      (e) =>
                        e.salaryFieldID ==
                        salarystructure[j].remainingAmtSalaryFieldID,
                    )?.payheadMasterId
                  : null;

                const findData = basedOnDaysData.find(
                  (e) =>
                    e.hrSalaryField?.payheadMasterId ==
                    salarystructure[j].payheadMasterId,
                );

                let paidDaysCal = usertotalpresentday;

                if (weekoffSalaryCalculated) paidDaysCal -= +weekoffCount;

                // let ps_data = null;
                // let ps_finalsalary = 0;
                // // check depends on att
                // if (ps_calculate) {
                //   ps_data =
                //     payrollStatutoryDetails?.get(
                //       salarystructure[j].payheadMasterId,
                //     ) || null;
                // }

                // check depends on att

                if (salarystructure[j].salaryFieldAttanChk == 0) {
                  finalsalary = +salarystructure[j].ActualEmployeeSalaryAmount;
                } else if (salarystructure[j].salaryFieldAttanChk == 2) {
                  // if physical Attndance

                  // --------------------- for AMMAN ASSOCIATED SERVICES PRIVATE LIMITED ----------------
                  if (usermaster[i].companyMasterId == 1446)
                    calculateEsicOnGross = true;

                  finalsalary =
                    +salarystructure[j].ActualEmployeeSalaryAmount *
                    +attendanceTransData.length;
                } else {
                  if (salary_calculation_wise == 'hourwise') {
                    const actualSalary =
                      +salarystructure[j].ActualEmployeeSalaryAmount || 0;

                    if (convertWorkedHoursToDays) {
                      finalsalary = actualSalary * +paidDaysForHourlySalary;
                    } else {
                      const oneMinuteSalary =
                        actualSalary / +dailyworkingminutes;

                      finalsalary = oneMinuteSalary * +usertotalpresentday;
                    }

                    // let oneminutesalry =
                    //   Number(salarystructure[j].ActualEmployeeSalaryAmount) /
                    //   Number(dailyworkingminutes);

                    // finalsalary =
                    //   Number(oneminutesalry) * Number(usertotalpresentday);
                  } else {
                    if (findData) {
                      const presentDays =
                        calculatedAttendanceData.find(
                          (e) => e['hrLeaveType.LeaveID'] == 1,
                        )?.AttnVal || 0;
                      const perDayAmount = getAmountByPresentDays(
                        presentDays,
                        findData,
                      );

                      finalsalary = +presentDays * +perDayAmount;
                    } else {
                      finalsalary =
                        Number(salarystructure[j].ActualEmployeeSalaryAmount) *
                        Number(paidDaysCal);
                    }

                    // ------------------------ payroll statutory -------------------------------

                    // if (ps_calculate && ps_data) {
                    //   const ps_perDaySalary =
                    //     +ps_data.ActualEmployeeSalaryAmount;

                    //   if (ps_paidDays) {
                    //     ps_finalsalary =
                    //       +ps_data.ActualEmployeeSalaryAmount * ps_paidDays;

                    //     if (
                    //       salarystructure[j].salaryFieldSrNo ==
                    //       salaryFieldSrNoFields.EARNING
                    //     ) {
                    //       const diff = finalsalary - ps_finalsalary;
                    //       ps_extraRemainingAmount += +diff;
                    //     }
                    //   } else {
                    //     const { govPaidDays, govSalary, diffSalary, diffDays } =
                    //       calculatePaidDays(
                    //         finalsalary,
                    //         paidDaysCal,
                    //         +ps_perDaySalary,
                    //         0.5,
                    //         salary_CalculationDays
                    //       );
                    //     ps_finalsalary = govSalary;
                    //     ps_extra_days = diffDays;
                    //     ps_extraRemainingAmount = diffSalary;

                    //     ps_paidDays = Math.max(govPaidDays, 0);
                    //   }
                    // }
                  }

                  if (salarystructure[j].salaryFieldRound == 'Y') {
                    finalsalary =
                      salarystructure[j].roundOffType == 0
                        ? Math.ceil(finalsalary.toFixed(2))
                        : Math.round(finalsalary);
                  } else {
                    let salaryfieldroundno = Number(
                      !salarystructure[j].salaryFieldRoundNo
                        ? 0
                        : salarystructure[j].salaryFieldRoundNo,
                    );
                    finalsalary = Number(
                      finalsalary.toFixed(salaryfieldroundno),
                    );
                  }
                }

                if (
                  salarystructure[j].payheadMasterId == 4 ||
                  salarystructure[j].payheadMasterId == 5 ||
                  salarystructure[j].payheadMasterId == 12 ||
                  salarystructure[j].payheadMasterId == 25 ||
                  salarystructure[j].payheadMasterId == 66
                ) {
                  let pf = 0;
                  let calculatedOn = 0;

                  if (basedOnDaysData.length) {
                    calculatedOn = basicSalaryForBasedOnDays;
                    const percentage =
                      pfPercentage.get(salarystructure[j].payheadMasterId) ?? 0;
                    finalsalary =
                      (+basicSalaryForBasedOnDays * +percentage) / 100;
                  } else {
                    if ([4, 12].includes(salarystructure[j].payheadMasterId)) {
                      pf =
                        (Number(salarystructure[j].ActualEmployeeSalaryAmount) *
                          100) /
                        (salarystructure[j].payheadMasterId == 4 ? 12 : 8.33);
                    }

                    if (salary_calculation_wise == 'hourwise') {
                      calculatedOn = convertWorkedHoursToDays
                        ? +pf * +paidDaysForHourlySalary
                        : (Number(pf) / Number(dailyworkingminutes)) *
                          Number(usertotalpresentday);
                    } else {
                      calculatedOn = Number(pf) * Number(paidDaysCal);
                    }
                  }

                  userSalaryArray.push({
                    salaryMasterID: salarystructure[j].salaryMasterID,
                    payheadmasterid: salarystructure[j].payheadMasterId,
                    payheadName:
                      salarystructure[j].payheadDisplayName &&
                      salarystructure[j].payheadDisplayName.trim()
                        ? salarystructure[j].payheadDisplayName.trim()
                        : salarystructure[j].payheadName,
                    employeeAmount: finalsalary,
                    salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                    salaryfieldside: salarystructure[j].salaryFieldSide,
                    salaryfieldshow: salarystructure[j].salaryFieldShow,
                    calculatedOn: [4, 12].includes(
                      salarystructure[j].payheadMasterId,
                    )
                      ? +calculatedOn
                      : null,
                    salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
                    salaryFieldRound: salarystructure[j].salaryFieldRound,
                    salaryFieldRoundNo: salarystructure[j].salaryFieldRoundNo,
                    roundOffType: salarystructure[j].roundOffType,
                    salaryFieldRound: salarystructure[j].salaryFieldRound,
                    salaryFieldRoundNo: salarystructure[j].salaryFieldRoundNo,
                    roundOffType: salarystructure[j].roundOffType,
                    considerIn: salarystructure[j].considerIn,
                    RA_payheadMasterId,
                    actualAmount:
                      +salarystructure[j].ActualEmployeeSalaryAmount,
                  });

                  // -------------------------Payroll Statutory -------------------------
                  // if (ps_calculate && ps_data) {
                  //   let ps_calculatedOn = null;
                  //   if ([4, 12].includes(salarystructure[j].payheadMasterId)) {
                  //     const ps_pf =
                  //       (Number(ps_data.ActualEmployeeSalaryAmount) * 100) /
                  //       (ps_data.GSS?.HSF?.payheadMasterId == 4 ? 12 : 8.33);

                  //     ps_calculatedOn = Number(ps_pf) * Number(ps_paidDays);
                  //   }

                  //   const obj = ps_structuredData(
                  //     ps_data,
                  //     ps_finalsalary,
                  //     ps_calculatedOn,
                  //     null,
                  //     false,
                  //   );
                  //   obj.salaryFieldRound = ps_data.GSS.HSF.salaryFieldRound;
                  //   obj.salaryFieldRoundNo = ps_data.GSS.HSF.salaryFieldRoundNo;
                  //   obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                  //   obj.considerIn = ps_data.GSS.HSF.considerIn;

                  //   payrollStatutoryArray.push(obj);
                  // }
                } else {
                  if (salarystructure[j].salaryFieldRound == 'Y') {
                    finalsalary =
                      salarystructure[j].roundOffType == 0
                        ? Math.ceil(finalsalary.toFixed(2))
                        : Math.round(finalsalary);
                  } else {
                    let salaryfieldroundno = Number(
                      !salarystructure[j].salaryFieldRoundNo
                        ? 0
                        : salarystructure[j].salaryFieldRoundNo,
                    );
                    finalsalary = Number(
                      finalsalary.toFixed(salaryfieldroundno),
                    );
                  }

                  if (
                    salarystructure[j].payheadMasterId ==
                      payheadMasterIdsMapping.BASIC &&
                    findData
                  ) {
                    basicSalaryForBasedOnDays = finalsalary;
                  }

                  if (salarystructure[j].salaryFieldWhenMonth[0] != 0) {
                    let currentmonth = Month;

                    if (Number(currentmonth) < 10) {
                      currentmonth = Month.slice(1);
                    }

                    let whencalculation =
                      salarystructure[j].salaryFieldWhenMonth;
                    whencalculation = whencalculation.filter((s) => {
                      return s == currentmonth;
                    });

                    if (whencalculation.length > 0) {
                      userSalaryArray.push({
                        salaryMasterID: salarystructure[j].salaryMasterID,
                        payheadmasterid: salarystructure[j].payheadMasterId,
                        payheadName:
                          salarystructure[j].payheadDisplayName &&
                          salarystructure[j].payheadDisplayName.trim()
                            ? salarystructure[j].payheadDisplayName.trim()
                            : salarystructure[j].payheadName,
                        employeeAmount: finalsalary,
                        salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                        salaryfieldside: salarystructure[j].salaryFieldSide,
                        salaryfieldshow: salarystructure[j].salaryFieldShow,
                        calculatedOn: null,
                        salaryfieldmaxrange:
                          salarystructure[j].salaryfieldmaxrange,
                        salaryFieldRound: salarystructure[j].salaryFieldRound,
                        salaryFieldRoundNo:
                          salarystructure[j].salaryFieldRoundNo,
                        roundOffType: salarystructure[j].roundOffType,
                        considerIn: salarystructure[j].considerIn,
                        RA_payheadMasterId,
                      });

                      //---------------------- for payroll statutory --------------

                      if (
                        salarystructure[j].salaryFieldSrNo ==
                          salaryFieldSrNoFields.EARNING &&
                        ps_calculate
                      ) {
                        earningAmountFor_ps += +finalsalary;
                      }

                      // if (ps_calculate && ps_data) {
                      //   const obj = ps_structuredData(
                      //     ps_data,
                      //     ps_finalsalary,
                      //     null,
                      //     null,
                      //     true,
                      //   );
                      //   (obj.considerIn = salarystructure[j].considerIn),
                      //     (obj.salaryFieldRound =
                      //       ps_data.GSS.HSF.salaryFieldRound);
                      //   obj.salaryFieldRoundNo =
                      //     ps_data.GSS.HSF.salaryFieldRoundNo;
                      //   obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                      //   obj.RA_payheadMasterId = RA_payheadMasterId;

                      //   payrollStatutoryArray.push(obj);
                      // }
                    } else {
                      userSalaryArray.push({
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
                        salaryfieldmaxrange:
                          salarystructure[j].salaryfieldmaxrange,
                        salaryFieldRound: salarystructure[j].salaryFieldRound,
                        salaryFieldRoundNo:
                          salarystructure[j].salaryFieldRoundNo,
                        roundOffType: salarystructure[j].roundOffType,
                        considerIn: salarystructure[j].considerIn,
                        RA_payheadMasterId,
                      });

                      //---------------------- for payroll statutory --------------

                      if (
                        salarystructure[j].salaryFieldSrNo ==
                          salaryFieldSrNoFields.EARNING &&
                        ps_calculate
                      ) {
                        earningAmountFor_ps += +finalsalary;
                      }

                      // if (ps_calculate && ps_data) {
                      //   const obj = ps_structuredData(
                      //     ps_data,
                      //     0,
                      //     null,
                      //     null,
                      //     true,
                      //   );
                      //   (obj.considerIn = salarystructure[j].considerIn),
                      //     (obj.salaryFieldRound =
                      //       ps_data.GSS.HSF.salaryFieldRound);
                      //   obj.salaryFieldRoundNo =
                      //     ps_data.GSS.HSF.salaryFieldRoundNo;
                      //   obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                      //   obj.RA_payheadMasterId = RA_payheadMasterId;

                      //   payrollStatutoryArray.push(obj);
                      // }
                    }
                  } else {
                    userSalaryArray.push({
                      salaryMasterID: salarystructure[j].salaryMasterID,
                      payheadmasterid: salarystructure[j].payheadMasterId,
                      payheadName:
                        salarystructure[j].payheadDisplayName &&
                        salarystructure[j].payheadDisplayName.trim()
                          ? salarystructure[j].payheadDisplayName.trim()
                          : salarystructure[j].payheadName,
                      employeeAmount: finalsalary,
                      salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                      salaryfieldside: salarystructure[j].salaryFieldSide,
                      salaryfieldshow: salarystructure[j].salaryFieldShow,
                      calculatedOn: null,
                      salaryfieldmaxrange:
                        salarystructure[j].salaryfieldmaxrange,
                      salaryFieldRound: salarystructure[j].salaryFieldRound,
                      salaryFieldRoundNo: salarystructure[j].salaryFieldRoundNo,
                      roundOffType: salarystructure[j].roundOffType,
                      considerIn: salarystructure[j].considerIn,
                      RA_payheadMasterId,
                    });

                    //---------------------- for payroll statutory --------------

                    if (
                      salarystructure[j].salaryFieldSrNo ==
                        salaryFieldSrNoFields.EARNING &&
                      ps_calculate
                    ) {
                      earningAmountFor_ps += +finalsalary;
                    }

                    // if (ps_calculate && ps_data) {
                    //   const obj = ps_structuredData(
                    //     ps_data,
                    //     ps_finalsalary,
                    //     null,
                    //     null,
                    //     true,
                    //   );
                    //   (obj.considerIn = salarystructure[j].considerIn),
                    //     (obj.salaryFieldRound =
                    //       ps_data.GSS.HSF.salaryFieldRound);
                    //   obj.salaryFieldRoundNo =
                    //     ps_data.GSS.HSF.salaryFieldRoundNo;
                    //   obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                    //   obj.RA_payheadMasterId = RA_payheadMasterId;

                    //   payrollStatutoryArray.push(obj);
                    // }
                  }
                }
              }
            }

            // -------------------------------------------------- Payroll Statutory Calculation -----------------------------------

            if (ps_calculate) {
              const grossAmount =
                payrollStatutoryDetails?.get(payheadMasterIdsMapping.GROSS)
                  ?.EmployeeSalaryAmount || 0;

              const configData = {
                targetAmount: earningAmountFor_ps,
                perDaySalary: grossAmount,
                gross: 0,
                calculationType: SalaryStructureTypeEnum.DAILY,
                salaryDivide: salary_CalculationDays,
                roundOffDays: roundOffDaysForPayrollStatutory,
                daysCap: totaldays,
              };

              const ps_daysData = ps_getDaysForAmount(configData);

              ps_paidDays = ps_daysData?.roundedDays;
              ps_extraRemainingAmount = ps_daysData?.remainingAmount;

              const payrollStatutoryDetailsArray = Array.from(
                payrollStatutoryDetails.values(),
              );

              for (const ps_data of payrollStatutoryDetailsArray) {
                const payheadMasterId =
                  ps_data.GSS?.HSF?.payheadMasterId || null;

                if (
                  !payheadMasterId ||
                  excludePayheadIds_ps.includes(payheadMasterId)
                )
                  continue;

                let ps_finalsalary = 0;
                // ------------------------ payroll statutory -------------------------------

                const RA_payheadMasterId = ps_data.GSS.remainingAmtSalaryFieldID
                  ? payrollStatutoryDetailsArray.find(
                      (e) =>
                        e.salaryFieldID ==
                        ps_data.GSS.remainingAmtSalaryFieldID,
                    )?.payheadMasterId
                  : null;

                if (ps_calculate && payheadMasterId) {
                  if (LWP_flag) {
                    ps_finalsalary =
                      +salarystructure[j].ActualEmployeeSalaryAmount;
                  } else {
                    const ps_perDaySalary = +ps_data.ActualEmployeeSalaryAmount;

                    ps_finalsalary = Number(ps_perDaySalary) * ps_paidDays;
                  }

                  // pf

                  if ([4, 5, 12, 25, 66].includes(payheadMasterId)) {
                    // -------------------------Payroll Statutory -------------------------
                    if (ps_calculate && ps_data) {
                      let ps_calculatedOn = null;
                      if ([4, 12].includes(payheadMasterId)) {
                        const ps_pf =
                          (Number(ps_data.ActualEmployeeSalaryAmount) * 100) /
                          (ps_data.GSS.HSF.payheadMasterId == 4 ? 12 : 8.33);

                        ps_calculatedOn =
                          (Number(ps_pf) / Number(salary_CalculationDays)) *
                          ps_paidDays;
                      }

                      const obj = ps_structuredData(
                        ps_data,
                        ps_finalsalary,
                        ps_calculatedOn,
                        null,
                        false,
                      );
                      obj.salaryFieldRound = ps_data.GSS.HSF.salaryFieldRound;
                      obj.salaryFieldRoundNo =
                        ps_data.GSS.HSF.salaryFieldRoundNo;
                      obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                      obj.considerIn = ps_data.GSS.HSF.considerIn;
                      obj.actualAmount = Number(
                        ps_data.ActualEmployeeSalaryAmount,
                      );

                      payrollStatutoryArray.push(obj);
                    }
                  } else {
                    // check salary field round

                    if (ps_data.GSS.HSF.salaryFieldWhenMonth[0] != 0) {
                      let currentmonth = Month;

                      if (Number(currentmonth) < 10) {
                        currentmonth = Month.slice(1);
                      }

                      let whencalculation =
                        ps_data.GSS.HSF.salaryFieldWhenMonth;
                      whencalculation = whencalculation.filter((s) => {
                        return s == currentmonth;
                      });

                      if (whencalculation.length > 0) {
                        //---------------------- for payroll statutory --------------

                        if (ps_calculate && ps_data) {
                          const obj = ps_structuredData(
                            ps_data,
                            ps_finalsalary,
                            null,
                            null,
                            true,
                          );
                          (obj.considerIn = ps_data.GSS.HSF.considerIn),
                            (obj.salaryFieldRound =
                              ps_data.GSS.HSF.salaryFieldRound);
                          obj.salaryFieldRoundNo =
                            ps_data.GSS.HSF.salaryFieldRoundNo;
                          obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                          obj.RA_payheadMasterId = RA_payheadMasterId;

                          payrollStatutoryArray.push(obj);
                        }
                      } else {
                        //---------------------- for payroll statutory --------------

                        if (ps_calculate && ps_data) {
                          const obj = ps_structuredData(
                            ps_data,
                            0,
                            null,
                            null,
                            true,
                          );
                          (obj.considerIn = ps_data.GSS.HSF.considerIn),
                            (obj.salaryFieldRound =
                              ps_data.GSS.HSF.salaryFieldRound);
                          obj.salaryFieldRoundNo =
                            ps_data.GSS.HSF.salaryFieldRoundNo;
                          obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                          obj.RA_payheadMasterId = RA_payheadMasterId;

                          payrollStatutoryArray.push(obj);
                        }
                      }
                    } else {
                      //---------------------- for payroll statutory --------------

                      if (ps_calculate && ps_data) {
                        const obj = ps_structuredData(
                          ps_data,
                          ps_finalsalary,
                          null,
                          null,
                          true,
                        );
                        (obj.considerIn = ps_data.GSS.HSF.considerIn),
                          (obj.salaryFieldRound =
                            ps_data.GSS.HSF.salaryFieldRound);
                        obj.salaryFieldRoundNo =
                          ps_data.GSS.HSF.salaryFieldRoundNo;
                        obj.roundOffType = ps_data.GSS.HSF.roundOffType;
                        obj.RA_payheadMasterId = RA_payheadMasterId;

                        payrollStatutoryArray.push(obj);
                      }
                    }
                  }
                }
              }
            }

            // ----------------------------- for payroll Statutory -------------------------------
            const remaingAmountData = {
              userMasterID: usermaster[i].userMasterID,
              salaryYYYYMM: yearmonth,
              adjustMode: PayrollStatutoryAdjustModeEnum.CASH,
              amount: Math.round(ps_extraRemainingAmount),
              minutes: null,
              ps_salaryTransId: null,
            };

            ps_overtimeAmount = overtimeAmount;
            ps_OtherEmployee_ESIC_Amount = OtherEmployee_ESIC_Amount;
            ps_OtherEmployer_ESIC_Amount = OtherEmployer_ESIC_Amount;
            ps_ESIC_CalculatedOn_Amount = ESIC_CalculatedOn_Amount;

            if (
              ps_calculate &&
              extraAmountMode === PayrollStatutoryAdjustModeEnum.OVERTIME
            ) {
              remaingAmountData.minutes = getOTMinutesFromExtraAmount(
                remaingAmountData.amount,
                userAttendacepolicy,
                payrollStatutoryDetails,
                null,
              );

              remaingAmountData.adjustMode =
                PayrollStatutoryAdjustModeEnum.OVERTIME;

              ps_overtime_min += +remaingAmountData.minutes + +overtime_min;

              const otSalary = payrollStatutoryArray.find(
                (e) => e.payheadmasterid === payheadMasterIdsMapping.OT,
              );

              if (otSalary) {
                otSalary.employeeAmount += Number(remaingAmountData.amount);
                ps_overtimeAmount += Number(remaingAmountData.amount);
              }

              //For ESIC
              if (esicApplicable == 'true') {
                ps_OtherEmployee_ESIC_Amount +=
                  (+remaingAmountData.amount *
                    +userAttendacepolicy.employeeESICPer) /
                  100;
                ps_OtherEmployer_ESIC_Amount +=
                  (+remaingAmountData.amount *
                    +userAttendacepolicy.employerESICPer) /
                  100;
                ps_ESIC_CalculatedOn_Amount += +remaingAmountData.amount;
              }
            }

            // ----------------------Bonus Pay Calculation ---------------------------------------
            if (BonusPayData) {
              const currentBonusAmount =
                userSalaryArray.find((e) => e.payheadmasterid == 6)
                  ?.employeeAmount || 0;

              let bonusAmount = 0;

              const { amount, ids, addcurrentId } = await getPayBonusAmount(
                bonusPolicy,
                yearmonth,
                currentBonusAmount,
                usermaster[i].userMasterID,
              );

              BonusIds = ids;
              addCurrentBonusId = addcurrentId;

              bonusAmount = amount;

              userSalaryArray.push({
                salaryMasterID: BonusPayData.salaryMasterID,
                payheadmasterid: BonusPayData.payheadMasterId,
                payheadName:
                  BonusPayData.payheadDisplayName &&
                  BonusPayData.payheadDisplayName.trim()
                    ? BonusPayData.payheadDisplayName.trim()
                    : BonusPayData.payheadName,
                employeeAmount: getRoundOffSalary(
                  +bonusAmount,
                  BonusPayData.salaryFieldRound,
                  BonusPayData.roundOffType,
                  BonusPayData.salaryFieldRoundNo,
                ),
                salaryfieldsrno: BonusPayData.salaryFieldSrNo,
                salaryfieldside: BonusPayData.salaryFieldSide,
                salaryfieldshow: BonusPayData.salaryFieldShow,
                calculatedOn: null,
                salaryfieldmaxrange: BonusPayData.salaryfieldmaxrange,
                considerIn: BonusPayData.considerIn,
              });

              //---------------------- for payroll statutory --------------

              if (ps_calculate) {
                const ps_data =
                  payrollStatutoryDetails?.get(BonusPayData.payheadMasterId) ||
                  null;

                if (ps_data) {
                  const obj = ps_structuredData(
                    ps_data,
                    bonusAmount,
                    null,
                    null,
                    true,
                  );
                  (obj.considerIn = BonusPayData.considerIn),
                    payrollStatutoryArray.push(obj);
                }
              }
            }

            let paidDaysCal = usertotalpresentday;

            if (weekoffSalaryCalculated) paidDaysCal -= +weekoffCount;

            //----------------- Push LWP Deduction in salary array------

            if (lwp_deduction) {
              userSalaryArray.push({
                salaryMasterID: lwp_deduction.salaryMasterID,
                payheadmasterid: lwp_deduction.payheadMasterId,
                payheadName:
                  lwp_deduction.payheadDisplayName &&
                  lwp_deduction.payheadDisplayName.trim()
                    ? lwp_deduction.payheadDisplayName.trim()
                    : lwp_deduction.payheadName,
                employeeAmount: 0,
                salaryfieldsrno: lwp_deduction.salaryFieldSrNo,
                salaryfieldside: lwp_deduction.salaryFieldSide,
                salaryfieldshow: lwp_deduction.salaryFieldShow,
                calculatedOn: null,
                salaryfieldmaxrange: lwp_deduction.salaryfieldmaxrange,
                considerIn: lwp_deduction.considerIn,
              });

              //---------------------- for payroll statutory --------------

              if (ps_calculate) {
                const ps_data =
                  payrollStatutoryDetails?.get(lwp_deduction.payheadMasterId) ||
                  null;
                if (ps_data) {
                  const obj = ps_structuredData(
                    ps_data,
                    amount,
                    null,
                    null,
                    true,
                  );
                  (obj.considerIn = lwp_deduction.considerIn),
                    payrollStatutoryArray.push(obj);
                }
              }
            }

            // deduct pf on overtime

            if (pfApplicable == 'true' || +pfIncentiveAmount > 0) {
              let pfDeductionAmount = 0;
              if (pfApplicable != 'true') {
                pfDeductionAmount = +pfIncentiveAmount;
              } else {
                pfDeductionAmount = +overtimeAmount + +pfIncentiveAmount;
              }

              userSalaryArray.forEach((e) => {
                if (
                  e.payheadmasterid == 4 ||
                  e.payheadmasterid == 5 ||
                  e.payheadmasterid == 12 ||
                  e.payheadmasterid == 25 ||
                  e.payheadmasterid == 66
                ) {
                  const amount =
                    Number(e.employeeAmount) +
                    (e.payheadmasterid == 4
                      ? (Number(pfDeductionAmount) * 12) / 100
                      : e.payheadmasterid == 5
                        ? (Number(pfDeductionAmount) * 3.67) / 100
                        : e.payheadmasterid == 12
                          ? (Number(pfDeductionAmount) * 8.33) / 100
                          : (Number(pfDeductionAmount) * 0.5) / 100);

                  e.employeeAmount =
                    e.salaryFieldRound == 'Y'
                      ? e.roundOffType == 0
                        ? Math.ceil(amount.toFixed(2))
                        : Math.round(amount)
                      : !e.salaryFieldRound
                        ? Math.round(amount)
                        : amount.toFixed(+e.salaryFieldRoundNo);

                  if ([4, 12].includes(e.payheadmasterid))
                    e.calculatedOn = Math.round(
                      Number(e.calculatedOn) + Number(pfDeductionAmount),
                    );
                }
              });

              if (ps_calculate) {
                let ps_pfDeductionAmount = 0;
                if (pfApplicable != 'true') {
                  ps_pfDeductionAmount = +pfIncentiveAmount;
                } else {
                  ps_pfDeductionAmount =
                    +ps_overtimeAmount + +pfIncentiveAmount;
                }

                payrollStatutoryArray.forEach((e) => {
                  if (
                    e.payheadmasterid == 4 ||
                    e.payheadmasterid == 5 ||
                    e.payheadmasterid == 12 ||
                    e.payheadmasterid == 25 ||
                    e.payheadmasterid == 66
                  ) {
                    const amount =
                      Number(e.employeeAmount) +
                      (e.payheadmasterid == 4
                        ? (Number(pfDeductionAmount) * 12) / 100
                        : e.payheadmasterid == 5
                          ? (Number(pfDeductionAmount) * 3.67) / 100
                          : e.payheadmasterid == 12
                            ? (Number(pfDeductionAmount) * 8.33) / 100
                            : (Number(pfDeductionAmount) * 0.5) / 100);

                    e.employeeAmount =
                      e.salaryFieldRound == 'Y'
                        ? e.roundOffType == 0
                          ? Math.ceil(amount.toFixed(2))
                          : Math.round(amount)
                        : !e.salaryFieldRound
                          ? Math.round(amount)
                          : amount.toFixed(+e.salaryFieldRoundNo);

                    if ([4, 12].includes(e.payheadmasterid))
                      e.calculatedOn = Math.round(
                        Number(e.calculatedOn) + Number(pfDeductionAmount),
                      );
                  }
                });
              }
            } else {
              userSalaryArray.forEach((e) => {
                if (
                  e.payheadmasterid == 4 ||
                  e.payheadmasterid == 5 ||
                  e.payheadmasterid == 12 ||
                  e.payheadmasterid == 25 ||
                  e.payheadmasterid == 66
                ) {
                  // const amount = Number(e.employeeAmount);

                  e.employeeAmount =
                    e.salaryFieldRound == 'Y'
                      ? e.roundOffType == 0
                        ? Math.ceil((+e.employeeAmount).toFixed(2))
                        : Math.round(+e.employeeAmount)
                      : !e.salaryFieldRound
                        ? Math.round(+e.employeeAmount)
                        : (+e.employeeAmount).toFixed(+e.salaryFieldRoundNo);

                  if ([4, 12].includes(e.payheadmasterid))
                    e.calculatedOn = Math.round(Number(e.calculatedOn));
                }
              });

              if (ps_calculate) {
                payrollStatutoryArray.forEach((e) => {
                  if (
                    e.payheadmasterid == 4 ||
                    e.payheadmasterid == 5 ||
                    e.payheadmasterid == 12 ||
                    e.payheadmasterid == 25 ||
                    e.payheadmasterid == 66
                  ) {
                    e.employeeAmount =
                      e.salaryFieldRound == 'Y'
                        ? e.roundOffType == 0
                          ? Math.ceil((+e.employeeAmount).toFixed(2))
                          : Math.round(+e.employeeAmount)
                        : !e.salaryFieldRound
                          ? Math.round(+e.employeeAmount)
                          : (+e.employeeAmount).toFixed(+e.salaryFieldRoundNo);

                    if ([4, 12].includes(e.payheadmasterid))
                      e.calculatedOn = Math.round(Number(e.calculatedOn));
                  }
                });
              }
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

              if (ps_calculate) {
                // Check if payhead id is  present or not in structure
                toAddOTInOtherPathead = payrollStatutoryArray.find(
                  (e) => +e.payheadmasterid == +ot_payheadMasterId,
                )
                  ? true
                  : false;
                // If present then add Amount
                if (toAddOTInOtherPathead) {
                  payrollStatutoryArray = payrollStatutoryArray.map((e) => {
                    if (+e.payheadmasterid == +ot_payheadMasterId)
                      e.employeeAmount += +ps_overtimeAmount;
                    if (+e.payheadmasterid == 43) e.employeeAmount = 0;
                    return e;
                  });
                }
              }
            }

            // set max range

            const pfMaxRange =
              userSalaryArray.find(
                (e) => e.payheadmasterid == payheadMasterIdsMapping.PF,
              )?.salaryfieldmaxrange || 0;

            const pfjoiningDate = [
              companyMasterIDENUM.BRISK_SURGICAL_COTTON_LTD,
              companyMasterIDENUM.BRISK_SURGICAL_COTTON_LTD_BELAGAVI,
              companyMasterIDENUM.BRISK_SURGICAL_COTTON_LTD_INDUSTRIES,
              companyMasterIDENUM.N_S_Construction,
            ].includes(+companyId)
              ? employeeJoining.pfjoiningDate
              : null;

            userSalaryArray.forEach((e) => {
              if (!e.salaryfieldmaxrange) return;

              let maxRange = +e.salaryfieldmaxrange;
              let empAmount = +e.employeeAmount;
              let remainingAmount = 0;

              const companyPFConfig = PFCalculationCompanyIds[+companyId];

              // pf calculation for according to new rule for sept-2026
              if (
                companyPFConfig &&
                Object.hasOwn(NewRuleCapping, +e.payheadmasterid) &&
                maxRange &&
                pfMaxRange <= 2360 &&
                salary_calculation_wise != 'hourwise' &&
                PFCalculationMonth.includes(+yearmonth)
              ) {
                // amount of incentive and overtime for pf deduction
                let totalExtraAmount = pfIncentiveAmount;
                if (pfApplicable == 'true') totalExtraAmount += overtimeAmount;

                empAmount = pfCalculationForSep2026({
                  companyPFConfig,
                  payheadMasterId: e.payheadmasterid,
                  maxRange,
                  yearmonth,
                  amount: e.employeeAmount,
                  actualAmount: e.actualAmount,
                  salaryCalType: salary_calculation_wise,
                  structureType: salaryStructureBaseoncal,
                  salaryDivideBy: salary_CalculationDays,
                  paidDays: paidDaysCal,
                  totalExtraAmount,
                  start_date,
                  pfjoiningDate,
                });

                const sepMonthcapping =
                  SepMonthPFCapping[+e.payheadmasterid] || 0;

                empAmount = Math.min(sepMonthcapping, empAmount);

                if (e.payheadmasterid == payheadMasterIdsMapping.PF) {
                  e.calculatedOn = Math.round((empAmount * 100) / 12);
                }

                // EPS
                if (e.payheadmasterid == payheadMasterIdsMapping.EPS) {
                  const pfCalculatedOn =
                    userSalaryArray.find(
                      (e) => e.payheadmasterid == payheadMasterIdsMapping.PF,
                    )?.calculatedOn || 0;

                  e.calculatedOn =
                    empAmount === 1250
                      ? 15000
                      : empAmount === 2083
                        ? 25000
                        : pfCalculatedOn;
                }

                e.employeeAmount = getRoundOffSalary(
                  empAmount,
                  e.salaryFieldRoundNo,
                  e.roundOffType,
                  e.salaryFieldRoundNo,
                );
              } else {
                if (empAmount <= maxRange) return;

                remainingAmount = empAmount - maxRange;

                // cap current payhead
                e.employeeAmount = maxRange;

                if (e.payheadmasterid == payheadMasterIdsMapping.PF) {
                  e.calculatedOn = Math.round((maxRange * 100) / 12);
                }

                // EPS
                if (e.payheadmasterid == payheadMasterIdsMapping.EPS) {
                  e.calculatedOn =
                    maxRange === 1250
                      ? 15000
                      : maxRange === 2083
                        ? 25000
                        : Math.round((maxRange * 100) / 8.33);
                }
              }

              // const maxRange = +e.salaryfieldmaxrange;
              // const empAmount = +e.employeeAmount;

              // if (empAmount <= maxRange) return;

              // const remainingAmount = empAmount - maxRange;

              // PF
              // if (e.payheadmasterid == payheadMasterIdsMapping.PF) {
              //   e.calculatedOn = Math.round((maxRange * 100) / 12);
              // }

              // // EPS
              // if (e.payheadmasterid == payheadMasterIdsMapping.EPS) {
              //   e.calculatedOn =
              //     maxRange === 1250
              //       ? 15000
              //       : 2083 ? 25000: Math.round((maxRange * 100) / 8.33);
              // }

              // cap current payhead
              // e.employeeAmount = maxRange;

              // push remaining amount
              if (
                remainingAmount > 0 &&
                e.RA_payheadMasterId &&
                e.RA_payheadMasterId !== e.payheadmasterid
              ) {
                const targetPayhead = userSalaryArray.find(
                  (p) => p.payheadmasterid === e.RA_payheadMasterId,
                );

                if (targetPayhead) {
                  const targetMax =
                    +targetPayhead.salaryfieldmaxrange || Infinity;
                  const newAmount =
                    +targetPayhead.employeeAmount + remainingAmount;

                  targetPayhead.employeeAmount =
                    newAmount > targetMax
                      ? targetMax
                      : getRoundOffSalary(
                          newAmount,
                          targetPayhead.salaryFieldRound,
                          targetPayhead.roundOffType,
                          targetPayhead.salaryFieldRoundNo,
                        );
                }
              }
            });

            // ---------------------------- payroll Statutory ----------------------
            const ps_pfMaxRange =
              payrollStatutoryArray.find(
                (e) => e.payheadmasterid == payheadMasterIdsMapping.PF,
              )?.salaryfieldmaxrange || 0;

            if (ps_calculate) {
              // set max range

              payrollStatutoryArray.forEach((e) => {
                if (!e.salaryfieldmaxrange) return;

                let maxRange = +e.salaryfieldmaxrange;
                let empAmount = +e.employeeAmount;
                let remainingAmount = 0;

                const companyPFConfig = PFCalculationCompanyIds[+companyId];

                // pf calculation for according to new rule for sept-2026
                if (
                  companyPFConfig &&
                  Object.hasOwn(NewRuleCapping, +e.payheadmasterid) &&
                  maxRange &&
                  ps_pfMaxRange <= 2360 &&
                  salary_calculation_wise != 'hourwise' &&
                  PFCalculationMonth.includes(+yearmonth)
                ) {
                  // amount of incentive and overtime for pf deduction
                  let totalExtraAmount = pfIncentiveAmount;
                  if (pfApplicable == 'true')
                    totalExtraAmount += overtimeAmount;

                  empAmount = pfCalculationForSep2026({
                    companyPFConfig,
                    payheadMasterId: e.payheadmasterid,
                    maxRange,
                    yearmonth,
                    amount: e.employeeAmount,
                    actualAmount: e.actualAmount,
                    salaryCalType: salary_calculation_wise,
                    structureType: salaryStructureBaseoncal,
                    salaryDivideBy: salary_CalculationDays,
                    paidDays: paidDaysCal,
                    totalExtraAmount,
                    start_date,
                    pfjoiningDate,
                  });

                  const sepMonthcapping =
                    SepMonthPFCapping[+e.payheadmasterid] || 0;

                  empAmount = Math.min(sepMonthcapping, empAmount);

                  if (e.payheadmasterid == payheadMasterIdsMapping.PF) {
                    e.calculatedOn = Math.round((e.employeeAmount * 100) / 12);
                  }

                  // EPS
                  if (e.payheadmasterid == payheadMasterIdsMapping.EPS) {
                    const pfCalculatedOn =
                      payrollStatutoryArray.find(
                        (e) => e.payheadmasterid == payheadMasterIdsMapping.PF,
                      )?.calculatedOn || 0;

                    e.calculatedOn =
                      e.employeeAmount === 1250
                        ? 15000
                        : e.employeeAmount === 2083
                          ? 25000
                          : pfCalculatedOn;
                  }

                  e.employeeAmount = getRoundOffSalary(
                    empAmount,
                    e.salaryFieldRoundNo,
                    e.roundOffType,
                    e.salaryFieldRoundNo,
                  );
                } else {
                  if (empAmount <= maxRange) return;

                  remainingAmount = empAmount - maxRange;

                  // cap current payhead
                  e.employeeAmount = maxRange;

                  if (e.payheadmasterid == payheadMasterIdsMapping.PF) {
                    e.calculatedOn = Math.round((maxRange * 100) / 12);
                  }

                  // EPS
                  if (e.payheadmasterid == payheadMasterIdsMapping.EPS) {
                    e.calculatedOn =
                      maxRange === 1250
                        ? 15000
                        : maxRange === 2083
                          ? 25000
                          : Math.round((maxRange * 100) / 8.33);
                  }
                }

                // const maxRange = +e.salaryfieldmaxrange;
                // const empAmount = +e.employeeAmount;

                // if (empAmount <= maxRange) return;

                // const remainingAmount = empAmount - maxRange;

                // PF
                // if (e.payheadmasterid == payheadMasterIdsMapping.PF) {
                //   e.calculatedOn = Math.round((maxRange * 100) / 12);
                // }

                // // EPS
                // if (e.payheadmasterid == payheadMasterIdsMapping.EPS) {
                //   e.calculatedOn =
                //     maxRange === 1250
                //       ? 15000
                //       : 2083 ? 25000: Math.round((maxRange * 100) / 8.33);
                // }

                // cap current payhead
                // e.employeeAmount = maxRange;

                // push remaining amount
                if (
                  remainingAmount > 0 &&
                  e.RA_payheadMasterId &&
                  e.RA_payheadMasterId !== e.payheadmasterid
                ) {
                  const targetPayhead = userSalaryArray.find(
                    (p) => p.payheadmasterid === e.RA_payheadMasterId,
                  );

                  if (targetPayhead) {
                    const targetMax =
                      +targetPayhead.salaryfieldmaxrange || Infinity;
                    const newAmount =
                      +targetPayhead.employeeAmount + remainingAmount;

                    targetPayhead.employeeAmount =
                      newAmount > targetMax
                        ? targetMax
                        : getRoundOffSalary(
                            newAmount,
                            targetPayhead.salaryFieldRound,
                            targetPayhead.roundOffType,
                            targetPayhead.salaryFieldRoundNo,
                          );
                  }
                }
              });
            }

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

              //---------------------- for payroll statutory --------------

              if (ps_calculate) {
                const ps_data =
                  payrollStatutoryDetails?.get(EPF_Data.payheadMasterId) ||
                  null;
                if (ps_data) {
                  const ps_PF_amount =
                    payrollStatutoryArray.find((e) => e.payheadmasterid == 4)
                      ?.employeeAmount || 0;
                  const ps_EPS_amount =
                    payrollStatutoryArray.find((e) => e.payheadmasterid == 12)
                      ?.employeeAmount || 0;

                  const amount = Math.max(ps_PF_amount - ps_EPS_amount, 0);

                  const obj = ps_structuredData(
                    ps_data,
                    amount,
                    null,
                    null,
                    true,
                  );

                  payrollStatutoryArray.push(obj);
                }
              }
            }

            employee_gross = userSalaryArray
              .filter(
                (e) =>
                  e.salaryfieldsrno == 'A' &&
                  e.salaryfieldshow == 'Y' &&
                  e.considerIn != payheadConsiderInEnum.NETSALARY,
              )
              .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

            // if (employee_gross == 0) {
            //   // set Lwf deduction zero for both employee and employer side
            //   const idsToUpdate = new Set([
            //     payheadMasterIdsMapping.EMPLOYEE_LWF,
            //     payheadMasterIdsMapping.EMPLOYER_LWF,
            //   ]);

            //   userSalaryArray.forEach((item) => {
            //     if (idsToUpdate.has(item.payheadmasterid)) {
            //       item.employeeAmount = 0;
            //     }
            //   });
            // }

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
                  e.considerIn == payheadConsiderInEnum.NETSALARY,
              )
              .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

            employee_netPay =
              Number(employee_gross) -
              Number(employee_otherAmount) +
              +employee_extraAddInNetPay;

            // -------------------------------Payroll Statutory --------------------------
            let ps_addInNetPay = 0;
            if (ps_calculate) {
              ps_employee_gross = payrollStatutoryArray
                .filter(
                  (e) =>
                    e.salaryfieldsrno == salaryFieldSrNoFields.EARNING &&
                    e.salaryfieldshow == 'Y' &&
                    e.considerIn != payheadConsiderInEnum.NETSALARY,
                )
                .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

              ps_addInNetPay = payrollStatutoryArray
                .filter(
                  (e) =>
                    e.salaryfieldsrno == salaryFieldSrNoFields.EARNING &&
                    e.salaryfieldshow == 'Y' &&
                    e.considerIn == payheadConsiderInEnum.NETSALARY,
                )
                .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

              const ps_employee_deduction = payrollStatutoryArray
                .filter(
                  (e) =>
                    e.salaryfieldsrno ==
                      salaryFieldSrNoFields.EMPLOYEE_DEDUCTION ||
                    (e.salaryfieldsrno ==
                      salaryFieldSrNoFields.OTHER_DEDUCTION &&
                      e.salaryfieldside == 'D' &&
                      e.salaryfieldshow == 'Y'),
                )
                .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

              ps_employee_netPay =
                +ps_employee_gross - +ps_employee_deduction + +ps_addInNetPay;
            }

            // -------------------------------- Employee PT calculation ---------------------------
            const ptdata = salarystructure.filter((s) => {
              return s.payheadMasterId == 15;
            });

            if (ptdata.length > 0) {
              const ptDeductionType =
                usermaster[i].companyMaster?.ptDeduction ||
                PTCalculationEnum.MONTHLY;

              const ptSlabs = allPTData.filter(
                (e) =>
                  e.stateMasterID == ptdata[0].stateid &&
                  e.corporationId == ptdata[0].corporationId,
              );

              const ptCalculationType = ptSlabs?.[0]?.ptCalculation || null;

              const previousalary =
                previousFiveMonthSalary.find(
                  (e) => e.userMasterID == usermaster[i].userMasterID,
                )?.totalAmount || 0;

              const value = getPTCalculationAmount(
                ptSlabs,
                ptCalculationType,
                ptDeductionType,
                usermaster[i].gender,
                previousalary,
                employee_gross,
                Month,
              );

              userSalaryArray.push({
                salaryMasterID: ptdata[0].salaryMasterID,
                payheadmasterid: ptdata[0].payheadMasterId,
                payheadName:
                  ptdata[0].payheadDisplayName &&
                  ptdata[0].payheadDisplayName.trim()
                    ? ptdata[0].payheadDisplayName.trim()
                    : ptdata[0].payheadName,
                employeeAmount: +value,
                salaryfieldsrno: ptdata[0].salaryFieldSrNo,
                salaryfieldside: ptdata[0].salaryFieldSide,
                salaryfieldshow: ptdata[0].salaryFieldShow,
                calculatedOn: null,
              });

              employee_netPay = Number(employee_netPay) - Number(value);

              // --------------- Payroll Statutory ------------------------

              if (ps_calculate) {
                const ps_data =
                  payrollStatutoryDetails?.get(ptdata[0].payheadMasterId) ||
                  null;
                if (ps_data) {
                  const obj = ps_structuredData(
                    ps_data,
                    value,
                    null,
                    null,
                    true,
                  );

                  payrollStatutoryArray.push(obj);
                }
              }
            }

            // employee esic

            const esicdata = salarystructure.filter((s) => {
              return s.payheadMasterId == 13;
            });

            if (esicdata.length > 0) {
              if (Number(esicdata[0].EmployeeSalaryAmount) > 0) {
                let value = 0,
                  calculatedOn = 0;

                if (esicDeduction == true) {
                  // only for AMMAN ASSOCIATED SERVICES PRIVATE LIMITED
                  if (calculateEsicOnGross || basedOnDaysData.length) {
                    value = (+employee_gross * 0.75) / 100;
                    calculatedOn = employee_gross;
                  } else {
                    const esic =
                      (Number(esicdata[0].ActualEmployeeSalaryAmount) * 100) /
                      0.75;

                    if (salary_calculation_wise == 'hourwise') {
                      const actualSalary =
                        +esicdata[0].ActualEmployeeSalaryAmount || 0;

                      if (convertWorkedHoursToDays) {
                        value = actualSalary * +paidDaysForHourlySalary;

                        calculatedOn = +esic * paidDaysForHourlySalary;
                      } else {
                        const oneMinuteSalary =
                          actualSalary / +dailyworkingminutes;

                        value = oneMinuteSalary * +usertotalpresentday;

                        calculatedOn =
                          (Number(esic) / Number(dailyworkingminutes)) *
                          Number(usertotalpresentday);
                      }
                    } else {
                      let onedaysalary = Number(
                        esicdata[0].ActualEmployeeSalaryAmount,
                      );

                      value = Number(onedaysalary) * Number(paidDaysCal);
                      calculatedOn = Number(esic) * Number(paidDaysCal);
                    }
                  }

                  value = Math.max(value, 0);

                  if (!basedOnDaysData.length) {
                    value += +OtherEmployee_ESIC_Amount;
                    calculatedOn += +ESIC_CalculatedOn_Amount;
                  }

                  // check max range

                  if (esicdata[0].salaryfieldmaxrange) {
                    if (+value > +esicdata[0].salaryfieldmaxrange) {
                      value = +esicdata[0].salaryfieldmaxrange;
                    }
                  }

                  value =
                    esicdata[0].salaryFieldRound == 'Y'
                      ? esicdata[0].roundOffType == 0
                        ? Math.ceil(value.toFixed(2))
                        : Math.round(value)
                      : !esicdata[0].salaryFieldRound
                        ? Math.round(value)
                        : value.toFixed(+esicdata[0].salaryFieldRoundNo);
                }

                userSalaryArray.push({
                  salaryMasterID: esicdata[0].salaryMasterID,
                  payheadmasterid: esicdata[0].payheadMasterId,
                  payheadName:
                    esicdata[0].payheadDisplayName &&
                    esicdata[0].payheadDisplayName.trim()
                      ? esicdata[0].payheadDisplayName.trim()
                      : esicdata[0].payheadName,
                  employeeAmount: +value,
                  salaryfieldsrno: esicdata[0].salaryFieldSrNo,
                  salaryfieldside: esicdata[0].salaryFieldSide,
                  salaryfieldshow: esicdata[0].salaryFieldShow,
                  calculatedOn:
                    +calculatedOn > 0 ? Math.round(+calculatedOn) : null,
                });

                employee_netPay = Number(employee_netPay) - Number(value);

                // ------------------ Payroll Statutory ----------------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(esicdata[0].payheadMasterId) ||
                    null;
                  if (ps_data) {
                    let ps_value = 0;
                    let ps_calculatedOn = 0;

                    if (esicDeduction == true) {
                      // only for AMMAN ASSOCIATED SERVICES PRIVATE LIMITED
                      if (calculateEsicOnGross) {
                        ps_value = (+ps_employee_gross * 0.75) / 100;
                        ps_calculatedOn = ps_employee_gross;
                      } else {
                        const esic =
                          (Number(ps_data.ActualEmployeeSalaryAmount) * 100) /
                          0.75;

                        const onedaysalary = Number(
                          ps_data.ActualEmployeeSalaryAmount,
                        );

                        ps_value = Number(onedaysalary) * Number(ps_paidDays);
                        ps_calculatedOn = Number(esic) * Number(ps_paidDays);
                      }

                      ps_value = Math.max(ps_value, 0);

                      ps_value += +ps_OtherEmployee_ESIC_Amount;
                      ps_calculatedOn += +ps_ESIC_CalculatedOn_Amount;

                      // check max range

                      if (ps_data.GSS.salaryfieldmaxrange) {
                        if (+ps_value > +ps_data.GSS.salaryfieldmaxrange) {
                          ps_value = +ps_data.GSS.salaryfieldmaxrange;
                        }
                      }
                    }

                    const obj = ps_structuredData(
                      ps_data,
                      ps_value,
                      ps_calculatedOn,
                      null,
                      true,
                    );

                    payrollStatutoryArray.push(obj);

                    ps_employee_netPay -= Number(obj.employeeAmount);
                  }
                }
              }
            }

            // company esic

            const co_esicdata = salarystructure.filter((s) => {
              return s.payheadMasterId == 14;
            });

            if (co_esicdata.length > 0) {
              if (Number(co_esicdata[0].EmployeeSalaryAmount) > 0) {
                let value = 0;

                if (esicDeduction == true) {
                  // only for AMMAN ASSOCIATED SERVICES PRIVATE LIMITED or based on days
                  if (calculateEsicOnGross || basedOnDaysData.length) {
                    value = (+employee_gross * 3.25) / 100;
                  } else {
                    if (salary_calculation_wise == 'hourwise') {
                      const actualSalary =
                        +co_esicdata[0].ActualEmployeeSalaryAmount || 0;

                      if (convertWorkedHoursToDays) {
                        value = actualSalary * +paidDaysForHourlySalary;
                      } else {
                        const oneMinuteSalary =
                          actualSalary / +dailyworkingminutes;

                        value = oneMinuteSalary * +usertotalpresentday;
                      }

                      // let oneminutesalry =
                      //   Number(co_esicdata[0].EmployeeSalaryAmount) /
                      //   Number(dailyworkingminutes);

                      // value =
                      //   Number(oneminutesalry) * Number(usertotalpresentday);
                    } else {
                      let onedaysalary = Number(
                        co_esicdata[0].ActualEmployeeSalaryAmount,
                      );

                      value = Number(onedaysalary) * Number(paidDaysCal);
                    }
                  }

                  value = Math.max(value, 0);

                  if (!basedOnDaysData.length) {
                    //SUM Of ESIC
                    value += +OtherEmployer_ESIC_Amount;
                  }

                  // max range

                  if (co_esicdata[0].salaryfieldmaxrange) {
                    if (+value > +co_esicdata[0].salaryfieldmaxrange) {
                      value = +co_esicdata[0].salaryfieldmaxrange;
                    }
                  }

                  value =
                    co_esicdata[0].salaryFieldRound == 'Y'
                      ? co_esicdata[0].roundOffType == 0
                        ? Math.ceil(value.toFixed(2))
                        : Math.round(value)
                      : !co_esicdata[0].salaryFieldRoundNo
                        ? Math.round(value)
                        : value.toFixed(+co_esicdata[0].salaryFieldRoundNo);
                }

                userSalaryArray.push({
                  salaryMasterID: co_esicdata[0].salaryMasterID,
                  payheadmasterid: co_esicdata[0].payheadMasterId,
                  payheadName:
                    co_esicdata[0].payheadDisplayName &&
                    co_esicdata[0].payheadDisplayName.trim()
                      ? co_esicdata[0].payheadDisplayName.trim()
                      : co_esicdata[0].payheadName,
                  employeeAmount: +value,
                  salaryfieldsrno: co_esicdata[0].salaryFieldSrNo,
                  salaryfieldside: co_esicdata[0].salaryFieldSide,
                  salaryfieldshow: co_esicdata[0].salaryFieldShow,
                  calculatedOn: null,
                });

                // ------------------ Payroll Statutory ----------------------

                if (ps_calculate) {
                  const ps_data =
                    payrollStatutoryDetails?.get(
                      co_esicdata[0].payheadMasterId,
                    ) || null;
                  if (ps_data) {
                    let ps_value = 0;

                    if (esicDeduction == true) {
                      // only for AMMAN ASSOCIATED SERVICES PRIVATE LIMITED
                      if (calculateEsicOnGross) {
                        ps_value = (+ps_employee_gross * 3.25) / 100;
                      } else {
                        const onedaysalary = Number(
                          ps_data.ActualEmployeeSalaryAmount,
                        );

                        ps_value = Number(onedaysalary) * +ps_paidDays;
                      }

                      ps_value = Math.max(ps_value, 0);

                      ps_value += +ps_OtherEmployer_ESIC_Amount;

                      // check max range

                      if (ps_data.GSS.salaryfieldmaxrange) {
                        if (+ps_value > +ps_data.GSS.salaryfieldmaxrange) {
                          ps_value = +ps_data.GSS.salaryfieldmaxrange;
                        }
                      }
                    }

                    const obj = ps_structuredData(
                      ps_data,
                      ps_value,
                      null,
                      null,
                      true,
                    );

                    payrollStatutoryArray.push(obj);
                  }
                }
              }
            }

            // ------------------ LWF deduction -----------------

            if (employee_lwf) {
              let value = 0;

              const stateId = +employee_lwf.stateid || null;

              const lwfData = allLWFStateWiseMap?.get(stateId);

              const salaryCalculation_Act = ['F', 'W'].includes(
                salaryCalculationAct,
              )
                ? 'F'
                : 'S';
              const month = +String(yearmonth).slice(4, 6);

              if (lwfData?.length && +employee_gross > 0) {
                const lwf_data = lwfData.find(
                  (e) =>
                    (e.applicableAct || []).includes(salaryCalculation_Act) &&
                    (!e.month || (e.month || [])?.includes(month)),
                );

                value = getLwfAmountForSalary(
                  lwf_data,
                  employee_lwf.payheadMasterId,
                  employee_gross,
                );
              }

              userSalaryArray.push({
                salaryMasterID: employee_lwf.salaryMasterID,
                payheadmasterid: employee_lwf.payheadMasterId,
                payheadName:
                  employee_lwf.payheadDisplayName &&
                  employee_lwf.payheadDisplayName.trim()
                    ? employee_lwf.payheadDisplayName.trim()
                    : employee_lwf.payheadName,
                employeeAmount: getRoundOffSalary(
                  value,
                  employee_lwf.salaryFieldRound,
                  employee_lwf.roundOffType,
                  employee_lwf.salaryFieldRoundNo,
                ),
                salaryfieldsrno: employee_lwf.salaryFieldSrNo,
                salaryfieldside: employee_lwf.salaryFieldSide,
                salaryfieldshow: employee_lwf.salaryFieldShow,
                calculatedOn: null,
                salaryfieldmaxrange: employee_lwf.salaryfieldmaxrange,
              });

              // ------------------ Payroll Statutory ----------------------

              if (ps_calculate) {
                const ps_data =
                  payrollStatutoryDetails?.get(employee_lwf.payheadMasterId) ||
                  null;

                if (ps_data) {
                  let ps_value = 0;

                  if (lwfData?.length && +ps_employee_gross > 0) {
                    const lwf_data = lwfData.find(
                      (e) =>
                        (e.applicableAct || []).includes(
                          salaryCalculation_Act,
                        ) &&
                        (!e.month || (e.month || [])?.includes(month)),
                    );

                    ps_value = getLwfAmountForSalary(
                      lwf_data,
                      employee_lwf.payheadMasterId,
                      ps_employee_gross,
                    );
                  }

                  const obj = ps_structuredData(
                    ps_data,
                    ps_value,
                    null,
                    null,
                    true,
                  );

                  payrollStatutoryArray.push(obj);
                }
              }
            }

            if (employer_lwf) {
              let value = 0;

              const stateId = +employer_lwf.stateid || null;

              const lwfData = allLWFStateWiseMap?.get(stateId);

              const salaryCalculation_Act = ['F', 'W'].includes(
                salaryCalculationAct,
              )
                ? 'F'
                : 'S';
              const month = +String(yearmonth).slice(4, 6);

              if (lwfData?.length && +employee_gross > 0) {
                const lwf_data = lwfData.find(
                  (e) =>
                    (e.applicableAct || []).includes(salaryCalculation_Act) &&
                    (!e.month || (e.month || [])?.includes(month)),
                );

                value = getLwfAmountForSalary(
                  lwf_data,
                  employer_lwf.payheadMasterId,
                  employee_gross,
                );
              }

              userSalaryArray.push({
                salaryMasterID: employer_lwf.salaryMasterID,
                payheadmasterid: employer_lwf.payheadMasterId,
                payheadName:
                  employer_lwf.payheadDisplayName &&
                  employer_lwf.payheadDisplayName.trim()
                    ? employer_lwf.payheadDisplayName.trim()
                    : employer_lwf.payheadName,
                employeeAmount: getRoundOffSalary(
                  value,
                  employer_lwf.salaryFieldRound,
                  employer_lwf.roundOffType,
                  employer_lwf.salaryFieldRoundNo,
                ),
                salaryfieldsrno: employer_lwf.salaryFieldSrNo,
                salaryfieldside: employer_lwf.salaryFieldSide,
                salaryfieldshow: employer_lwf.salaryFieldShow,
                calculatedOn: null,
                salaryfieldmaxrange: employer_lwf.salaryfieldmaxrange,
              });

              // ------------------ Payroll Statutory ----------------------

              if (ps_calculate) {
                const ps_data =
                  payrollStatutoryDetails?.get(employer_lwf.payheadMasterId) ||
                  null;

                if (ps_data) {
                  let ps_value = 0;

                  if (lwfData?.length && +ps_employee_gross > 0) {
                    const lwf_data = lwfData.find(
                      (e) =>
                        (e.applicableAct || []).includes(
                          salaryCalculation_Act,
                        ) &&
                        (!e.month || (e.month || [])?.includes(month)),
                    );

                    ps_value = getLwfAmountForSalary(
                      lwf_data,
                      employer_lwf.payheadMasterId,
                      ps_employee_gross,
                    );
                  }

                  const obj = ps_structuredData(
                    ps_data,
                    ps_value,
                    null,
                    null,
                    true,
                  );

                  payrollStatutoryArray.push(obj);
                }
              }
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

            // employer side deduction

            employerDeduction = userSalaryArray.filter(
              (s) => s.salaryfieldsrno == 'C' && +s.employeeAmount > 0,
            );

            EmployerSideAmount = employerDeduction.reduce(
              (acc, obj) => acc + +obj.employeeAmount,
              0,
            );

            userSalaryArray = userSalaryArray.filter((s) => {
              return s.salaryfieldsrno != 'C' && s.salaryfieldshow == 'Y';
            });

            // show data

            for (let g = 0; g < userSalaryArray.length; g++) {
              if (
                [
                  16, 17, 24, 34, 9, 43, 14, 13, 15, 78, 83, 99, 67, 101, 102,
                  103, 104, 107, 112, 116, 135, 123, 125, 126, 127, 133, 147,
                  122, 130, 148, 18, 59, 151, 152,
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

            employee_netPay = Number(totalear) - Number(totaldedu);

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
              +employee_gross % 1 !== 0 &&
              CTC_GROSS_NET.find((e) => e.payheadMasterId == 50)
                ?.salaryFieldRound == 'N'
            ) {
              employee_gross = +employee_gross.toFixed(
                +CTC_GROSS_NET.find((e) => e.payheadMasterId == 50)
                  ?.salaryFieldRoundNo || 0,
              );
            } else {
              employee_gross = Math.round(+employee_gross);
            }

            employee_ctc =
              +employee_gross +
              +employee_extraAddInNetPay +
              +EmployerSideAmount;

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

            // --------------------------- Payroll Statutory -----------------------------

            let ps_employeefinalSalary = [...payrollStatutoryArray];

            if (ps_calculate) {
              const { EMPLOYER_DEDUCTION } = salaryFieldSrNoFields;

              for (const s of payrollStatutoryArray) {
                if (
                  s.salaryfieldsrno === EMPLOYER_DEDUCTION &&
                  +s.employeeAmount > 0
                ) {
                  ps_employerDeduction.push(s);
                  ps_employerSideAmount += +s.employeeAmount;
                }
              }

              // Filter (kept as-is, single pass, no change needed here)
              payrollStatutoryArray = payrollStatutoryArray.filter(
                (s) =>
                  s.salaryfieldsrno !== EMPLOYER_DEDUCTION &&
                  s.salaryfieldshow === 'Y' &&
                  ((notIncludePyaheadIds.includes(s.payheadmasterid) &&
                    s.employeeAmount > 0) ||
                    !notIncludePyaheadIds.includes(s.payheadmasterid)),
              );

              // Single pass: totalEarnings + totalDeduction computed together
              let totalEarnings = 0;
              let totalDeduction = 0;
              for (const e of payrollStatutoryArray) {
                const amt = +e.employeeAmount;
                if (e.salaryfieldside === 'E') totalEarnings += amt;
                else if (e.salaryfieldside === 'D') totalDeduction += amt;
              }

              ps_employee_netPay = totalEarnings - totalDeduction;
              ps_employee_ctc =
                ps_employee_gross + ps_addInNetPay + ps_employerSideAmount;
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

                // --------------------------- Payroll Statutory ----------------------------------

                if (ps_calculate) {
                  const ps_data = payrollStatutoryDetails?.get(
                    e.payheadMasterId,
                  );

                  if (ps_data) {
                    const { GROSS, NETSALARY } = payheadMasterIdsMapping;
                    const payheadId = e.payheadMasterId;

                    const amount =
                      payheadId == GROSS
                        ? ps_employee_gross
                        : payheadId == NETSALARY
                          ? ps_employee_netPay
                          : ps_employee_ctc;

                    ps_employeefinalSalary.push(
                      ps_structuredData(ps_data, amount, null, null, true),
                    );
                  }
                }
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

            // ----------------------- Payroll Statutory ----------------------

            if (ps_calculate) {
              const { INCENTIVE, PENALTY, DEPOSIT_DEDUCTION, DEPOSIT_PAY } =
                payheadMasterIdsMapping;

              // Map of payheadmasterid -> replacement array, only for non-empty ones
              const ps_replacements = [
                [INCENTIVE, ps_incentiveArray],
                [PENALTY, ps_penaltyArray],
                [DEPOSIT_DEDUCTION, ps_depositArray],
                [DEPOSIT_PAY, ps_depositPayArray],
              ].filter(([, arr]) => arr.length);

              if (ps_replacements.length) {
                const excludeIds = new Set(ps_replacements.map(([id]) => id));

                // Single pass to remove all matching payheadmasterids at once
                ps_employeefinalSalary = ps_employeefinalSalary.filter(
                  (e) => !excludeIds.has(e.payheadmasterid),
                );

                // Push replacements
                for (const [, arr] of ps_replacements) {
                  ps_employeefinalSalary.push(arr[0]);
                }
              }
            }

            const advanceIds =
              advanceData.length > 0
                ? advanceData.map((e) => e.advancePaymentID)
                : [];
            const loantranIds =
              loanData.length > 0
                ? loanData.map((e) => e.LoanTrasactionId)
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
              let add_data = await HrSalaryTrans.create(
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
                await advancePayments.update(
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
                await LoanTransactions.update(
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
                await employeePenalties.update(
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
                await OverTimeCalculationMains.update(
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
                    salaryMonthToPay: yearmonth,
                    payReferenceId: add_data.userSalaryTranID,
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

              // update Expense Reimbursement

              if (
                expensePaymentId?.length &&
                employeefinalsalary[l].payheadmasterid ==
                  payheadMasterIdsMapping.EXPENSE_REIMBURSEMENT
              ) {
                await expensePayment.update(
                  {
                    referenceId: add_data.userSalaryTranID,
                    paymentDate: end_date,
                    updateBy: createBy,
                    updateByIp: createByIp,
                  },
                  {
                    where: {
                      ExpensePaymentID: {
                        [Sequelize.Op.in]: expensePaymentId,
                      },
                    },
                    transaction: t,
                  },
                );
              }
            }

            // -------------------------Payroll Statutory -------------------------

            if (ps_calculate) {
              const unPaidIds = [
                HrLeaveTypesIds.ABSENT,
                HrLeaveTypesIds.LWP,
                HrLeaveTypesIds.ATTENDANCE_PENALTY,
                HrLeaveTypesIds.ABSENT_DUE_TO_SANDWICH,
                HrLeaveTypesIds.WA,
              ];

              const presentData = allVerifiedData.find(
                (e) => e['hrLeaveType.LeaveID'] == HrLeaveTypesIds.PRESENT,
              );
              const unpaidData = allVerifiedData.filter((e) =>
                unPaidIds.includes(e['hrLeaveType.LeaveID']),
              );

              ps_extra_days = ps_paidDays - usertotalpresentday;

              const { updatedPresentData, updatedUnpaidData } =
                settleExtraDaysIntoPresent(
                  presentData,
                  unpaidData,
                  ps_extra_days,
                );

              const exceludeId = [HrLeaveTypesIds.PRESENT, ...unPaidIds];

              const attnCalData = allVerifiedData.filter(
                (e) => !exceludeId.includes(+e['hrLeaveType.LeaveID']),
              );

              const finalData = [
                updatedPresentData,
                ...attnCalData,
                ...updatedUnpaidData,
              ];

              ps_attendanceCalData = [...finalData];

              const mappedData = finalData.map((e) => {
                return {
                  userMasterID: e.userMasterID,
                  LeaveTranId: e.LeaveTranId,
                  AttnYearMon: e.AttnYearMon,
                  MonDays: e.MonDays,
                  MonWorkDays: e.MonWorkDays,
                  AttnVal: e.AttnVal,
                  monthstartdate: e.monthstartdate,
                  monthenddate: e.monthenddate,
                  payrollFrequency: e.payrollFrequency,
                  startDate: e.startDate,
                  endDate: e.endDate,
                };
              });

              await PayrollStatutoryAttnCal.bulkCreate(finalData, {
                user: req.userDetails,
                individualHooks: true,
                transaction: t,
              });

              const ps_bulkPayload = ps_employeefinalSalary.map((ps) => ({
                userMasterID: usermaster[i].userMasterID,
                psDetailsId: ps.psDetailsId,
                salaryYYYYMM: yearmonth,
                EmployeeSalaryAmount: ps.employeeAmount,
                SalaryCalcOnDays: ps_paidDays,
                calculatedOn: ps.calculatedOn,
              }));

              const ps_createdRecords =
                await PayrollStatutorySalaryTrans.bulkCreate(ps_bulkPayload, {
                  user: req.userDetails,
                  individualHooks: true,
                  transaction: t,
                  returning: true,
                });

              const ps_recordMap = new Map(
                ps_createdRecords.map((r) => [r.psDetailsId, r.id]),
              );

              const ps_updatePromises = [];

              for (const ps of ps_employeefinalSalary) {
                const createdId = ps_recordMap.get(ps.psDetailsId);

                if (!createdId) {
                  continue;
                }

                if (
                  ps.payheadmasterid === payheadMasterIdsMapping.INCENTIVE &&
                  incentiveIds?.length
                ) {
                  ps_updatePromises.push(
                    Employeeincentive.update(
                      { ps_salaryTransId: createdId },
                      {
                        where: {
                          employeeincentiveID: {
                            [Sequelize.Op.in]: incentiveIds,
                          },
                        },
                        transaction: t,
                      },
                    ),
                  );
                }

                if (
                  ps.payheadmasterid === payheadMasterIdsMapping.PENALTY &&
                  penaltyIds?.length
                ) {
                  ps_updatePromises.push(
                    EmployeePenalty.update(
                      { ps_salaryTransId: createdId },
                      {
                        where: {
                          employeePenaltyID: { [Sequelize.Op.in]: penaltyIds },
                        },
                        transaction: t,
                      },
                    ),
                  );
                }

                if (
                  ps.payheadmasterid == payheadMasterIdsMapping.OT &&
                  remaingAmountData.adjustMode ==
                    PayrollStatutoryAdjustModeEnum.OVERTIME &&
                  remaingAmountData.amount > 0
                ) {
                  remaingAmountData.ps_salaryTransId = createdId;

                  ps_updatePromises.push(
                    PayrollStatutoryAdjustment.create(remaingAmountData, {
                      user: req.userDetails,
                      transaction: t,
                    }),
                  );
                }
              }

              await Promise.all(ps_updatePromises);
            }
          }

          // Hour wise salary calculation
          else if (salarystructure[0].baseOnCalculation == 'H') {
            let incentiveArray = [];
            let finalinsentivearray = [];
            let finalpenaltyarray = [];
            let overtimeArray = [];
            let overtimeAmount = 0;
            let pfIncentiveAmount = 0;
            let esicIncentiveAmount = 0;

            let OtherEmployee_ESIC_Amount = 0;
            let OtherEmployer_ESIC_Amount = 0;
            let ESIC_CalculatedOn_Amount = 0;

            if (salary_calculation_wise == 'hourwise') {
              for (let j = 0; j < salarystructure.length; j++) {
                let finalsalary = 0;

                if (salarystructure[j].payheadMasterId == 16) {
                  //Advance

                  finalsalary = advanceData.reduce((acc, item) => {
                    const childSum = (item.employeeRepayments || []).reduce(
                      (sum, child) => sum + +child.amount,
                      0,
                    );
                    return acc + (+item.amount - +childSum);
                  }, 0);

                  userSalaryArray.push({
                    salaryMasterID: salarystructure[j].salaryMasterID,
                    payheadmasterid: salarystructure[j].payheadMasterId,
                    payheadName:
                      salarystructure[j].payheadDisplayName &&
                      salarystructure[j].payheadDisplayName.trim()
                        ? salarystructure[j].payheadDisplayName.trim()
                        : salarystructure[j].payheadName,
                    employeeAmount:
                      finalsalary > 0 ? Math.round(finalsalary) : 0,
                    salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                    salaryfieldside: salarystructure[j].salaryFieldSide,
                    salaryfieldshow: salarystructure[j].salaryFieldShow,
                    calculatedOn: null,
                    salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
                  });
                } else if (salarystructure[j].payheadMasterId == 17) {
                  //Loan

                  finalsalary = loanData.reduce(
                    (acc, obj) => acc + +obj.EMIAmount,
                    0,
                  );

                  userSalaryArray.push({
                    salaryMasterID: salarystructure[j].salaryMasterID,
                    payheadmasterid: salarystructure[j].payheadMasterId,
                    payheadName:
                      salarystructure[j].payheadDisplayName &&
                      salarystructure[j].payheadDisplayName.trim()
                        ? salarystructure[j].payheadDisplayName.trim()
                        : salarystructure[j].payheadName,
                    employeeAmount: Math.round(finalsalary),
                    salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                    salaryfieldside: salarystructure[j].salaryFieldSide,
                    salaryfieldshow: salarystructure[j].salaryFieldShow,
                    calculatedOn: null,
                    salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
                  });
                } else if (salarystructure[j].payheadMasterId == 24) {
                  // Incentive

                  let incentive = incentiveData;

                  let incentiveid = [];
                  let amountarray = [];
                  if (incentive.length > 0) {
                    for (let a = 0; a < incentive.length; a++) {
                      amountarray.push(+incentive[a].amount);

                      const incentiveName = incentive[a].incentivetype
                        .inc_type_displayName
                        ? incentive[a].incentivetype.inc_type_displayName
                        : incentive[a].incentivetype.incentivetypename;

                      // FOR ESIC
                      if (incentive[a].incentivetype.esicApplicable == 'true') {
                        OtherEmployee_ESIC_Amount +=
                          (+incentive[a].amount *
                            +incentive[a].incentivetype.employeeESICPer) /
                          100;
                        OtherEmployer_ESIC_Amount +=
                          (+incentive[a].amount *
                            +incentive[a].incentivetype.employerESICPer) /
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

                        if (incentive[a].incentivetype.consider == 'gross') {
                          if (
                            incentive[a].incentivetype.pfApplicable == 'true'
                          ) {
                            pfIncentiveAmount =
                              +pfIncentiveAmount + +incentive[a].amount;
                          }

                          if (
                            incentive[a].incentivetype.esicApplicable == 'true'
                          ) {
                            esicIncentiveAmount =
                              +esicIncentiveAmount + +incentive[a].amount;
                          }

                          userSalaryArray = userSalaryArray.filter((e) => {
                            return (
                              e.incentiveid != incentive[a].IncentivetypeID
                            );
                          });

                          userSalaryArray.push({
                            salaryMasterID: salarystructure[j].salaryMasterID,
                            payheadmasterid: salarystructure[j].payheadMasterId,
                            payheadName: incentiveName,
                            employeeAmount: Math.round(totalAmount),
                            salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                            salaryfieldside: salarystructure[j].salaryFieldSide,
                            salaryfieldshow: salarystructure[j].salaryFieldShow,
                            calculatedOn: null,
                            salaryfieldmaxrange:
                              salarystructure[j].salaryfieldmaxrange,
                            incentiveid: incentive[a].IncentivetypeID,
                          });
                        }

                        incentiveArray = incentiveArray.filter((e) => {
                          return e.incentiveid != incentive[a].IncentivetypeID;
                        });

                        incentiveArray.push({
                          salaryMasterID: salarystructure[j].salaryMasterID,
                          payheadmasterid: salarystructure[j].payheadMasterId,
                          payheadName: incentiveName,
                          employeeAmount: Math.round(totalAmount),
                          salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                          salaryfieldside: salarystructure[j].salaryFieldSide,
                          salaryfieldshow: salarystructure[j].salaryFieldShow,
                          calculatedOn: null,
                          salaryfieldmaxrange:
                            salarystructure[j].salaryfieldmaxrange,
                          incentiveid: incentive[a].IncentivetypeID,
                        });
                      } else {
                        incentiveid.push(incentive[a].IncentivetypeID);

                        if (incentive[a].incentivetype.consider == 'gross') {
                          if (
                            incentive[a].incentivetype.pfApplicable == 'true'
                          ) {
                            pfIncentiveAmount =
                              +pfIncentiveAmount + +incentive[a].amount;
                          }

                          if (
                            incentive[a].incentivetype.esicApplicable == 'true'
                          ) {
                            esicIncentiveAmount =
                              +esicIncentiveAmount + +incentive[a].amount;
                          }

                          userSalaryArray.push({
                            salaryMasterID: salarystructure[j].salaryMasterID,
                            payheadmasterid: salarystructure[j].payheadMasterId,
                            payheadName: incentiveName,
                            employeeAmount: Math.round(incentive[a].amount),
                            salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                            salaryfieldside: salarystructure[j].salaryFieldSide,
                            salaryfieldshow: salarystructure[j].salaryFieldShow,
                            calculatedOn: null,
                            salaryfieldmaxrange:
                              salarystructure[j].salaryfieldmaxrange,
                            incentiveid: incentive[a].IncentivetypeID,
                          });
                        }

                        incentiveArray.push({
                          salaryMasterID: salarystructure[j].salaryMasterID,
                          payheadmasterid: salarystructure[j].payheadMasterId,
                          payheadName: incentiveName,
                          employeeAmount: Math.round(incentive[a].amount),
                          salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                          salaryfieldside: salarystructure[j].salaryFieldSide,
                          salaryfieldshow: salarystructure[j].salaryFieldShow,
                          calculatedOn: null,
                          salaryfieldmaxrange:
                            salarystructure[j].salaryfieldmaxrange,
                          incentiveid: incentive[a].IncentivetypeID,
                        });
                      }
                    }

                    let finalamount = amountarray.reduce((acc, obj) => {
                      return acc + obj;
                    }, 0);

                    finalinsentivearray.push({
                      salaryMasterID: salarystructure[j].salaryMasterID,
                      payheadmasterid: salarystructure[j].payheadMasterId,
                      payheadName:
                        salarystructure[j].payheadDisplayName &&
                        salarystructure[j].payheadDisplayName.trim()
                          ? salarystructure[j].payheadDisplayName.trim()
                          : salarystructure[j].payheadName,
                      employeeAmount: Math.round(finalamount),
                      salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                      salaryfieldside: salarystructure[j].salaryFieldSide,
                      salaryfieldshow: salarystructure[j].salaryFieldShow,
                      calculatedOn: null,
                      salaryfieldmaxrange:
                        salarystructure[j].salaryfieldmaxrange,
                      incentiveid: null,
                    });
                  } else {
                    userSalaryArray.push({
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
                      salaryfieldmaxrange:
                        salarystructure[j].salaryfieldmaxrange,
                    });
                  }
                } else if (salarystructure[j].payheadMasterId == 34) {
                  // Penalty

                  if (penaltydata.length > 0) {
                    // Step 1: Group penalties by penaltyID and sum amounts
                    const penaltyMap = new Map();

                    penaltydata.forEach((penalty) => {
                      const existing = penaltyMap.get(penalty.penaltyID);
                      if (existing) {
                        existing.amount += Number(penalty.amount);
                      } else {
                        penaltyMap.set(penalty.penaltyID, {
                          penaltyID: penalty.penaltyID,
                          penaltyName: penalty.penaltyName,
                          amount: Number(penalty.amount),
                        });
                      }
                    });

                    // Step 2: Add grouped penalties to userSalaryArray (rounded per penalty type)
                    penaltyMap.forEach((penalty) => {
                      userSalaryArray.push({
                        salaryMasterID: salarystructure[j].salaryMasterID,
                        payheadmasterid: salarystructure[j].payheadMasterId,
                        payheadName: penalty.penaltyName,
                        employeeAmount: Math.round(penalty.amount), // Round after summing
                        salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                        salaryfieldside: salarystructure[j].salaryFieldSide,
                        salaryfieldshow: salarystructure[j].salaryFieldShow,
                        calculatedOn: null,
                        salaryfieldmaxrange:
                          salarystructure[j].salaryfieldmaxrange,
                        penaltyid: penalty.penaltyID,
                      });
                    });

                    // Step 3: Calculate total penalty amount for finalpenaltyarray
                    const totalPenaltyAmount = Array.from(
                      penaltyMap.values(),
                    ).reduce((sum, penalty) => sum + penalty.amount, 0);

                    finalpenaltyarray.push({
                      salaryMasterID: salarystructure[j].salaryMasterID,
                      payheadmasterid: salarystructure[j].payheadMasterId,
                      payheadName:
                        salarystructure[j].payheadDisplayName &&
                        salarystructure[j].payheadDisplayName.trim()
                          ? salarystructure[j].payheadDisplayName.trim()
                          : salarystructure[j].payheadName,
                      employeeAmount: Math.round(totalPenaltyAmount), // Round total
                      salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                      salaryfieldside: salarystructure[j].salaryFieldSide,
                      salaryfieldshow: salarystructure[j].salaryFieldShow,
                      calculatedOn: null,
                      salaryfieldmaxrange:
                        salarystructure[j].salaryfieldmaxrange,
                      penaltyid: null,
                    });
                  } else {
                    userSalaryArray.push({
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
                      salaryfieldmaxrange:
                        salarystructure[j].salaryfieldmaxrange,
                    });
                  }

                  // let penaltyid = [];
                  // let amountarray = [];

                  // if (penaltydata.length > 0) {
                  //   for (var b = 0; b < penaltydata.length; b++) {
                  //     amountarray.push(+penaltydata[b].amount);

                  //     let find_id = penaltyid.filter((e) => {
                  //       return e == penaltydata[b].penaltyID;
                  //     });

                  //     if (find_id.length > 0) {
                  //       let p_Array = userSalaryArray.filter((e) => {
                  //         return e.penaltyid == penaltydata[b].penaltyID;
                  //       });

                  //       userSalaryArray = userSalaryArray.filter((e) => {
                  //         return e.penaltyid != penaltydata[b].penaltyID;
                  //       });

                  //       let totalAmount =
                  //         Number(p_Array[0].employeeAmount) +
                  //         Number(penaltydata[b].amount);

                  //       userSalaryArray.push({
                  //         salaryMasterID: salarystructure[j].salaryMasterID,
                  //         payheadmasterid: salarystructure[j].payheadMasterId,
                  //         payheadName: penaltydata[b].penaltyName,
                  //         employeeAmount: Math.round(totalAmount),
                  //         salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  //         salaryfieldside: salarystructure[j].salaryFieldSide,
                  //         salaryfieldshow: salarystructure[j].salaryFieldShow,
                  //         calculatedOn: null,
                  //         salaryfieldmaxrange:
                  //           salarystructure[j].salaryfieldmaxrange,
                  //         penaltyid: penaltydata[b].penaltyID,
                  //       });
                  //     } else {
                  //       penaltyid.push(penaltydata[b].penaltyID);

                  //       userSalaryArray.push({
                  //         salaryMasterID: salarystructure[j].salaryMasterID,
                  //         payheadmasterid: salarystructure[j].payheadMasterId,
                  //         payheadName: penaltydata[b].penaltyName,
                  //         employeeAmount: Math.round(penaltydata[b].amount),
                  //         salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  //         salaryfieldside: salarystructure[j].salaryFieldSide,
                  //         salaryfieldshow: salarystructure[j].salaryFieldShow,
                  //         calculatedOn: null,
                  //         salaryfieldmaxrange:
                  //           salarystructure[j].salaryfieldmaxrange,
                  //         penaltyid: penaltydata[b].penaltyID,
                  //       });
                  //     }
                  //   }

                  //   let finalamount = amountarray.reduce((acc, obj) => {
                  //     return acc + obj;
                  //   }, 0);

                  //   finalpenaltyarray.push({
                  //     salaryMasterID: salarystructure[j].salaryMasterID,
                  //     payheadmasterid: salarystructure[j].payheadMasterId,
                  //     payheadName:
                  //       salarystructure[j].payheadDisplayName &&
                  //       salarystructure[j].payheadDisplayName.trim()
                  //         ? salarystructure[j].payheadDisplayName.trim()
                  //         : salarystructure[j].payheadName,
                  //     employeeAmount: Math.round(finalamount),
                  //     salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  //     salaryfieldside: salarystructure[j].salaryFieldSide,
                  //     salaryfieldshow: salarystructure[j].salaryFieldShow,
                  //     calculatedOn: null,
                  //     salaryfieldmaxrange:
                  //       salarystructure[j].salaryfieldmaxrange,
                  //     penaltyid: null,
                  //   });
                  // } else {
                  //   userSalaryArray.push({
                  //     salaryMasterID: salarystructure[j].salaryMasterID,
                  //     payheadmasterid: salarystructure[j].payheadMasterId,
                  //     payheadName:
                  //       salarystructure[j].payheadDisplayName &&
                  //       salarystructure[j].payheadDisplayName.trim()
                  //         ? salarystructure[j].payheadDisplayName.trim()
                  //         : salarystructure[j].payheadName,
                  //     employeeAmount: 0,
                  //     salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                  //     salaryfieldside: salarystructure[j].salaryFieldSide,
                  //     salaryfieldshow: salarystructure[j].salaryFieldShow,
                  //     calculatedOn: null,
                  //     salaryfieldmaxrange:
                  //       salarystructure[j].salaryfieldmaxrange,
                  //   });
                  // }
                } else if (salarystructure[j].payheadMasterId == 9) {
                  // TDS

                  userSalaryArray.push({
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
                  });
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
                      overtime_min = +overtime.overtimehrs;

                      overtimeAmount = Number(overtime.TotalAmount);

                      if (consider == 'gross') {
                        //For ESIC
                        if (esicApplicable == 'true') {
                          OtherEmployee_ESIC_Amount +=
                            (+overtimeAmount *
                              +userAttendacepolicy.employeeESICPer) /
                            100;
                          OtherEmployer_ESIC_Amount +=
                            (+overtimeAmount *
                              +userAttendacepolicy.employerESICPer) /
                            100;
                          ESIC_CalculatedOn_Amount += +overtimeAmount;
                        }

                        userSalaryArray.push({
                          salaryMasterID: salarystructure[j].salaryMasterID,
                          payheadmasterid: salarystructure[j].payheadMasterId,
                          payheadName:
                            salarystructure[j].payheadDisplayName &&
                            salarystructure[j].payheadDisplayName.trim()
                              ? salarystructure[j].payheadDisplayName.trim()
                              : salarystructure[j].payheadName,
                          employeeAmount: Number(overtime.TotalAmount),
                          salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                          salaryfieldside: salarystructure[j].salaryFieldSide,
                          salaryfieldshow: salarystructure[j].salaryFieldShow,
                          calculatedOn: null,
                          salaryfieldmaxrange:
                            salarystructure[j].salaryfieldmaxrange,
                        });
                      } else {
                        overtimeArray.push({
                          salaryMasterID: salarystructure[j].salaryMasterID,
                          payheadmasterid: salarystructure[j].payheadMasterId,
                          payheadName:
                            salarystructure[j].payheadDisplayName &&
                            salarystructure[j].payheadDisplayName.trim()
                              ? salarystructure[j].payheadDisplayName.trim()
                              : salarystructure[j].payheadName,
                          employeeAmount: Number(overtime.TotalAmount),
                          salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                          salaryfieldside: salarystructure[j].salaryFieldSide,
                          salaryfieldshow: salarystructure[j].salaryFieldShow,
                          calculatedOn: null,
                          salaryfieldmaxrange:
                            salarystructure[j].salaryfieldmaxrange,
                        });
                      }
                    } else {
                      userSalaryArray.push({
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
                        salaryfieldmaxrange:
                          salarystructure[j].salaryfieldmaxrange,
                      });
                    }
                  } else {
                    userSalaryArray.push({
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
                      salaryfieldmaxrange:
                        salarystructure[j].salaryfieldmaxrange,
                    });
                  }
                } else if (salarystructure[j].payheadMasterId == 15) {
                } else if (salarystructure[j].payheadMasterId == 13) {
                } else if (salarystructure[j].payheadMasterId == 14) {
                } else if (
                  salarystructure[j].payheadMasterId ==
                  payheadMasterIdsMapping.EMPLOYEE_LWF
                ) {
                  employee_lwf = salarystructure[j];
                } else if (
                  salarystructure[j].payheadMasterId ==
                  payheadMasterIdsMapping.EMPLOYER_LWF
                ) {
                  employer_lwf = salarystructure[j];
                } else if (salarystructure[j].payheadMasterId == 78) {
                  finalsalary = penaltyDeductionCalculation(
                    LCEGPenaltyData,
                    attendanceTransData,
                    salary_CalculationDays,
                    gross,
                    salaryStructureBaseoncal,
                    salary_calculation_wise,
                  );

                  finalsalary += PenaltyInSalary;

                  userSalaryArray.push({
                    salaryMasterID: salarystructure[j].salaryMasterID,
                    payheadmasterid: salarystructure[j].payheadMasterId,
                    payheadName:
                      salarystructure[j].payheadDisplayName &&
                      salarystructure[j].payheadDisplayName.trim()
                        ? salarystructure[j].payheadDisplayName.trim()
                        : salarystructure[j].payheadName,
                    employeeAmount: Math.round(finalsalary),
                    salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                    salaryfieldside: salarystructure[j].salaryFieldSide,
                    salaryfieldshow: salarystructure[j].salaryFieldShow,
                    calculatedOn: null,
                    salaryfieldmaxrange: salarystructure[j].salaryfieldmaxrange,
                  });
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

                  depositToDeductionArray.push({
                    salaryMasterID: salarystructure[j].salaryMasterID,
                    payheadmasterid: salarystructure[j].payheadMasterId,
                    payheadName:
                      salarystructure[j].payheadDisplayName &&
                      salarystructure[j].payheadDisplayName.trim()
                        ? salarystructure[j].payheadDisplayName.trim()
                        : salarystructure[j].payheadName,
                    employeeAmount: Math.round(finalsalary),
                    salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                    salaryfieldside: salarystructure[j].salaryFieldSide,
                    salaryfieldshow: salarystructure[j].salaryFieldShow,
                    calculatedOn: null,
                    salaryfieldmaxrange: null,
                  });
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

                  depositToPayArray.push({
                    salaryMasterID: salarystructure[j].salaryMasterID,
                    payheadmasterid: salarystructure[j].payheadMasterId,
                    payheadName:
                      salarystructure[j].payheadDisplayName &&
                      salarystructure[j].payheadDisplayName.trim()
                        ? salarystructure[j].payheadDisplayName.trim()
                        : salarystructure[j].payheadName,
                    employeeAmount: Math.round(finalsalary),
                    salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                    salaryfieldside: salarystructure[j].salaryFieldSide,
                    salaryfieldshow: salarystructure[j].salaryFieldShow,
                    calculatedOn: null,
                    salaryfieldmaxrange: null,
                  });
                } else if (salarystructure[j].payheadMasterId == 67) {
                  // Leave Encashment

                  const { amount, encashIds } = calculateLeaveEncashment(
                    allEmployeeLeavePolicy,
                    AllHrleaveTypes,
                    employeeLeaveEncashment,
                    AllsalarystructureData,
                    salary_calculation_wise,
                    salary_CalculationDays,
                    dailyworkingminutes || 0,
                  );

                  // set encashids
                  finalEncashIds = encashIds;

                  // for esic
                  if (
                    salarystructure[j].considerIn !=
                    payheadConsiderInEnum.NETSALARY
                  ) {
                    OtherEmployee_ESIC_Amount +=
                      (Math.round(amount) * 0.75) / 100;
                    OtherEmployer_ESIC_Amount +=
                      (Math.round(amount) * 3.25) / 100;
                  }

                  userSalaryArray.push({
                    salaryMasterID: salarystructure[j].salaryMasterID,
                    payheadmasterid: salarystructure[j].payheadMasterId,
                    payheadName:
                      salarystructure[j].payheadDisplayName &&
                      salarystructure[j].payheadDisplayName.trim()
                        ? salarystructure[j].payheadDisplayName.trim()
                        : salarystructure[j].payheadName,
                    employeeAmount: Math.round(amount),
                    salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                    salaryfieldside: salarystructure[j].salaryFieldSide,
                    salaryfieldshow: salarystructure[j].salaryFieldShow,
                    calculatedOn: null,
                    salaryfieldmaxrange: null,
                    considerIn: salarystructure[j].considerIn,
                  });
                } else if (salarystructure[j].payheadMasterId == 101) {
                  BonusPayData = salarystructure[j];
                }

                // Weekoff Salary
                else if (salarystructure[j].payheadMasterId == 147) {
                  userSalaryArray.push({
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
                    salaryfieldmaxrange: null,
                  });
                }

                // Expense Reimbursement
                else if (salarystructure[j].payheadMasterId == 116) {
                  const expenseAmount = expenseData.reduce(
                    (acc, obj) => acc + +obj.amount,
                    0,
                  );

                  expensePaymentId = expenseData.map((e) => e.ExpensePaymentID);

                  userSalaryArray.push({
                    salaryMasterID: salarystructure[j].salaryMasterID,
                    payheadmasterid: salarystructure[j].payheadMasterId,
                    payheadName:
                      salarystructure[j].payheadDisplayName &&
                      salarystructure[j].payheadDisplayName.trim()
                        ? salarystructure[j].payheadDisplayName.trim()
                        : salarystructure[j].payheadName,
                    employeeAmount: getRoundOffSalary(
                      expenseAmount,
                      salarystructure[j].salaryFieldRound,
                      salarystructure[j].roundOffType,
                      salarystructure[j].salaryFieldRoundNo,
                    ),
                    salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                    salaryfieldside: salarystructure[j].salaryFieldSide,
                    salaryfieldshow: salarystructure[j].salaryFieldShow,
                    calculatedOn: null,
                    salaryfieldmaxrange: null,
                    considerIn: salarystructure[j].considerIn,
                  });
                }
                // Paid Leave Hrs
                else if (
                  salarystructure[j].payheadMasterId ==
                  payheadMasterIdsMapping.PAID_LEAVE_HOURS
                ) {
                  let paidLeaveAmount = 0;

                  if (
                    salary_calculation_wise === 'hourwise' &&
                    !convertWorkedHoursToDays &&
                    paidLeaveMinutes > 0
                  ) {
                    paidLeaveAmount = calculatePaidLeaveHours(
                      gross,
                      salaryStructureBaseoncal,
                      dailyworkingminutes,
                      salary_CalculationDays,
                      paidLeaveMinutes,
                    );
                  }
                  userSalaryArray.push({
                    salaryMasterID: salarystructure[j].salaryMasterID,
                    payheadmasterid: salarystructure[j].payheadMasterId,
                    payheadName:
                      salarystructure[j].payheadDisplayName &&
                      salarystructure[j].payheadDisplayName.trim()
                        ? salarystructure[j].payheadDisplayName.trim()
                        : salarystructure[j].payheadName,
                    employeeAmount: getRoundOffSalary(
                      paidLeaveAmount,
                      salarystructure[j].salaryFieldRound,
                      salarystructure[j].roundOffType,
                      salarystructure[j].salaryFieldRoundNo,
                    ),
                    salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                    salaryfieldside: salarystructure[j].salaryFieldSide,
                    salaryfieldshow: salarystructure[j].salaryFieldShow,
                    calculatedOn: null,
                    salaryfieldmaxrange: null,
                    considerIn: salarystructure[j].considerIn,
                  });
                }

                // SHORT FALL HOURS
                else if (
                  salarystructure[j].payheadMasterId ==
                  payheadMasterIdsMapping.SHORT_FALL_HOURS
                ) {
                  const amount = shortFallHoursCalculation(
                    salary_CalculationDays,
                    gross,
                    salaryStructureBaseoncal,
                    salary_calculation_wise,
                    attendanceTransData,
                  );

                  userSalaryArray.push({
                    salaryMasterID: salarystructure[j].salaryMasterID,
                    payheadmasterid: salarystructure[j].payheadMasterId,
                    payheadName:
                      salarystructure[j].payheadDisplayName &&
                      salarystructure[j].payheadDisplayName.trim()
                        ? salarystructure[j].payheadDisplayName.trim()
                        : salarystructure[j].payheadName,
                    employeeAmount: getRoundOffSalary(
                      amount,
                      salarystructure[j].salaryFieldRound,
                      salarystructure[j].roundOffType,
                      salarystructure[j].salaryFieldRoundNo,
                    ),
                    salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                    salaryfieldside: salarystructure[j].salaryFieldSide,
                    salaryfieldshow: salarystructure[j].salaryFieldShow,
                    calculatedOn: null,
                    salaryfieldmaxrange: null,
                    considerIn: salarystructure[j].considerIn,
                  });
                } else {
                  const RA_payheadMasterId = salarystructure[j]
                    .remainingAmtSalaryFieldID
                    ? salarystructure.find(
                        (e) =>
                          e.salaryFieldID ==
                          salarystructure[j].remainingAmtSalaryFieldID,
                      )?.payheadMasterId
                    : null;

                  // check depends on att
                  if (salarystructure[j].salaryFieldAttanChk == 0) {
                    finalsalary = +salarystructure[j].EmployeeSalaryAmount;
                  } else {
                    const actualSalary =
                      +salarystructure[j].EmployeeSalaryAmount || 0;

                    if (convertWorkedHoursToDays) {
                      finalsalary =
                        (actualSalary / 60) *
                        +dailyworkingminutes *
                        +paidDaysForHourlySalary;
                    } else {
                      const oneMinuteSalary = actualSalary / 60;

                      finalsalary = oneMinuteSalary * +usertotalpresentday;
                    }

                    // let oneminutesalry =
                    //   Number(salarystructure[j].EmployeeSalaryAmount) /
                    //   Number(60);

                    // finalsalary =
                    //   Number(oneminutesalry) * Number(usertotalpresentday);
                  }

                  //pf

                  if (
                    salarystructure[j].payheadMasterId == 4 ||
                    salarystructure[j].payheadMasterId == 5 ||
                    salarystructure[j].payheadMasterId == 12 ||
                    salarystructure[j].payheadMasterId == 25 ||
                    salarystructure[j].payheadMasterId == 66
                  ) {
                    let pf = 0;

                    if ([4, 12].includes(salarystructure[j].payheadMasterId)) {
                      pf =
                        (Number(salarystructure[j].EmployeeSalaryAmount) *
                          100) /
                        ((salarystructure[j].payheadMasterId == 4 ? 12 : 8.33) *
                          60);
                    }

                    let calculatedOn = convertWorkedHoursToDays
                      ? +pf * +dailyworkingminutes * +paidDaysForHourlySalary
                      : Number(pf) * Number(usertotalpresentday);

                    userSalaryArray.push({
                      salaryMasterID: salarystructure[j].salaryMasterID,
                      payheadmasterid: salarystructure[j].payheadMasterId,
                      payheadName:
                        salarystructure[j].payheadDisplayName &&
                        salarystructure[j].payheadDisplayName.trim()
                          ? salarystructure[j].payheadDisplayName.trim()
                          : salarystructure[j].payheadName,
                      employeeAmount: +finalsalary,
                      salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                      salaryfieldside: salarystructure[j].salaryFieldSide,
                      salaryfieldshow: salarystructure[j].salaryFieldShow,
                      calculatedOn: [4, 12].includes(
                        salarystructure[j].payheadMasterId,
                      )
                        ? +calculatedOn
                        : null,
                      salaryfieldmaxrange:
                        salarystructure[j].salaryfieldmaxrange,
                      salaryFieldRound: salarystructure[j].salaryFieldRound,
                      salaryFieldRoundNo: salarystructure[j].salaryFieldRoundNo,
                      roundOffType: salarystructure[j].roundOffType,
                    });
                  } else {
                    if (salarystructure[j].salaryFieldRound == 'Y') {
                      finalsalary =
                        salarystructure[j].roundOffType == 0
                          ? Math.ceil(finalsalary.toFixed(2))
                          : Math.round(finalsalary);
                    } else {
                      let salaryfieldroundno = Number(
                        salarystructure[j].salaryFieldRoundNo == null
                          ? 0
                          : salarystructure[j].salaryFieldRoundNo,
                      );
                      finalsalary = Number(
                        finalsalary.toFixed(salaryfieldroundno),
                      );
                    }

                    if (salarystructure[j].salaryFieldWhenMonth[0] != '0') {
                      let currentmonth = Month;

                      if (Number(currentmonth) < 10) {
                        currentmonth = Month.slice(1);
                      }
                      let whencalculation =
                        salarystructure[j].salaryFieldWhenMonth;
                      whencalculation = whencalculation.filter((s) => {
                        return s == currentmonth;
                      });

                      if (whencalculation.length > 0) {
                        userSalaryArray.push({
                          salaryMasterID: salarystructure[j].salaryMasterID,
                          payheadmasterid: salarystructure[j].payheadMasterId,
                          payheadName:
                            salarystructure[j].payheadDisplayName &&
                            salarystructure[j].payheadDisplayName.trim()
                              ? salarystructure[j].payheadDisplayName.trim()
                              : salarystructure[j].payheadName,
                          employeeAmount: +finalsalary,
                          salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                          salaryfieldside: salarystructure[j].salaryFieldSide,
                          salaryfieldshow: salarystructure[j].salaryFieldShow,
                          calculatedOn: null,
                          salaryfieldmaxrange:
                            salarystructure[j].salaryfieldmaxrange,
                          salaryFieldRound: salarystructure[j].salaryFieldRound,
                          salaryFieldRoundNo:
                            salarystructure[j].salaryFieldRoundNo,
                          roundOffType: salarystructure[j].roundOffType,
                          considerIn: salarystructure[j].considerIn,
                          RA_payheadMasterId,
                        });
                      } else {
                        userSalaryArray.push({
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
                          salaryfieldmaxrange:
                            salarystructure[j].salaryfieldmaxrange,
                          salaryFieldRound: salarystructure[j].salaryFieldRound,
                          salaryFieldRoundNo:
                            salarystructure[j].salaryFieldRoundNo,
                          roundOffType: salarystructure[j].roundOffType,
                          considerIn: salarystructure[j].considerIn,
                          RA_payheadMasterId,
                        });
                      }
                    } else {
                      userSalaryArray.push({
                        salaryMasterID: salarystructure[j].salaryMasterID,
                        payheadmasterid: salarystructure[j].payheadMasterId,
                        payheadName:
                          salarystructure[j].payheadDisplayName &&
                          salarystructure[j].payheadDisplayName.trim()
                            ? salarystructure[j].payheadDisplayName.trim()
                            : salarystructure[j].payheadName,
                        employeeAmount: +finalsalary,
                        salaryfieldsrno: salarystructure[j].salaryFieldSrNo,
                        salaryfieldside: salarystructure[j].salaryFieldSide,
                        salaryfieldshow: salarystructure[j].salaryFieldShow,
                        calculatedOn: null,
                        salaryfieldmaxrange:
                          salarystructure[j].salaryfieldmaxrange,
                        salaryFieldRound: salarystructure[j].salaryFieldRound,
                        salaryFieldRoundNo:
                          salarystructure[j].salaryFieldRoundNo,
                        roundOffType: salarystructure[j].roundOffType,
                        considerIn: salarystructure[j].considerIn,
                        RA_payheadMasterId,
                      });
                    }
                  }
                }
              }

              // ----------------------Bonus Pay Calculation ---------------------------------------
              if (BonusPayData) {
                const currentBonusAmount =
                  userSalaryArray.find((e) => e.payheadmasterid == 6)
                    ?.employeeAmount || 0;

                let bonusAmount = 0;

                const { amount, ids, addcurrentId } = await getPayBonusAmount(
                  bonusPolicy,
                  yearmonth,
                  currentBonusAmount,
                  usermaster[i].userMasterID,
                );

                BonusIds = ids;
                addCurrentBonusId = addcurrentId;

                bonusAmount = amount;

                userSalaryArray.push({
                  salaryMasterID: BonusPayData.salaryMasterID,
                  payheadmasterid: BonusPayData.payheadMasterId,
                  payheadName:
                    BonusPayData.payheadDisplayName &&
                    BonusPayData.payheadDisplayName.trim()
                      ? BonusPayData.payheadDisplayName.trim()
                      : BonusPayData.payheadName,
                  employeeAmount: getRoundOffSalary(
                    +bonusAmount,
                    BonusPayData.salaryFieldRound,
                    BonusPayData.roundOffType,
                    BonusPayData.salaryFieldRoundNo,
                  ),
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
                userSalaryArray.push({
                  salaryMasterID: lwp_deduction.salaryMasterID,
                  payheadmasterid: lwp_deduction.payheadMasterId,
                  payheadName:
                    lwp_deduction.payheadDisplayName &&
                    lwp_deduction.payheadDisplayName.trim()
                      ? lwp_deduction.payheadDisplayName.trim()
                      : lwp_deduction.payheadName,
                  employeeAmount: 0,
                  salaryfieldsrno: lwp_deduction.salaryFieldSrNo,
                  salaryfieldside: lwp_deduction.salaryFieldSide,
                  salaryfieldshow: lwp_deduction.salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: lwp_deduction.salaryfieldmaxrange,
                  considerIn: lwp_deduction.considerIn,
                });
              }

              // deduct pf on overtime

              if (pfApplicable == 'true' || +pfIncentiveAmount > 0) {
                let pfDeductionAmount = 0;
                if (pfApplicable != 'true') {
                  pfDeductionAmount = +pfIncentiveAmount;
                } else {
                  pfDeductionAmount = +overtimeAmount + +pfIncentiveAmount;
                }

                userSalaryArray.forEach((e) => {
                  if (
                    e.payheadmasterid == 4 ||
                    e.payheadmasterid == 5 ||
                    e.payheadmasterid == 12 ||
                    e.payheadmasterid == 25 ||
                    e.payheadmasterid == 66
                  ) {
                    const amount =
                      Number(e.employeeAmount) +
                      (e.payheadmasterid == 4
                        ? (Number(pfDeductionAmount) * 12) / 100
                        : e.payheadmasterid == 5
                          ? (Number(pfDeductionAmount) * 3.67) / 100
                          : e.payheadmasterid == 12
                            ? (Number(pfDeductionAmount) * 8.33) / 100
                            : (Number(pfDeductionAmount) * 0.5) / 100);

                    e.employeeAmount =
                      e.salaryFieldRound == 'Y'
                        ? e.roundOffType == 0
                          ? Math.ceil(amount.toFixed(2))
                          : Math.round(amount)
                        : !e.salaryFieldRound
                          ? Math.round(amount)
                          : amount.toFixed(+e.salaryFieldRoundNo);

                    if ([4, 12].includes(e.payheadmasterid))
                      e.calculatedOn = Math.round(
                        Number(e.calculatedOn) + Number(pfDeductionAmount),
                      );
                  }
                });
              } else {
                userSalaryArray.forEach((e) => {
                  if (
                    e.payheadmasterid == 4 ||
                    e.payheadmasterid == 5 ||
                    e.payheadmasterid == 12 ||
                    e.payheadmasterid == 25 ||
                    e.payheadmasterid == 66
                  ) {
                    // const amount = Number(e.employeeAmount);

                    e.employeeAmount =
                      e.salaryFieldRound == 'Y'
                        ? e.roundOffType == 0
                          ? Math.ceil((+e.employeeAmount).toFixed(2))
                          : Math.round(+e.employeeAmount)
                        : !e.salaryFieldRound
                          ? Math.round(+e.employeeAmount)
                          : (+e.employeeAmount).toFixed(+e.salaryFieldRoundNo);

                    if ([4, 12].includes(e.payheadmasterid))
                      e.calculatedOn = Math.round(Number(e.calculatedOn));
                  }
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

              userSalaryArray.forEach((e) => {
                if (!e.salaryfieldmaxrange) return;

                const maxRange = +e.salaryfieldmaxrange;
                const empAmount = +e.employeeAmount;

                if (empAmount <= maxRange) return;

                const remainingAmount = empAmount - maxRange;

                // PF
                if (e.payheadmasterid == payheadMasterIdsMapping.PF) {
                  e.calculatedOn = Math.round((maxRange * 100) / 12);
                }

                // EPS
                if (e.payheadmasterid == payheadMasterIdsMapping.EPS) {
                  e.calculatedOn =
                    maxRange === 1250
                      ? 15000
                      : Math.round((maxRange * 100) / 8.33);
                }

                // cap current payhead
                e.employeeAmount = maxRange;

                // push remaining amount
                if (
                  remainingAmount > 0 &&
                  e.RA_payheadMasterId &&
                  e.RA_payheadMasterId !== e.payheadmasterid
                ) {
                  const targetPayhead = userSalaryArray.find(
                    (p) => p.payheadmasterid === e.RA_payheadMasterId,
                  );

                  if (targetPayhead) {
                    const targetMax =
                      +targetPayhead.salaryfieldmaxrange || Infinity;
                    const newAmount =
                      +targetPayhead.employeeAmount + remainingAmount;

                    targetPayhead.employeeAmount =
                      newAmount > targetMax
                        ? targetMax
                        : getRoundOffSalary(
                            newAmount,
                            targetPayhead.salaryFieldRound,
                            targetPayhead.roundOffType,
                            targetPayhead.salaryFieldRoundNo,
                          );
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

              employee_gross = userSalaryArray
                .filter(
                  (e) =>
                    e.salaryfieldsrno == 'A' &&
                    e.salaryfieldshow == 'Y' &&
                    e.considerIn != payheadConsiderInEnum.NETSALARY,
                )
                .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

              // if (employee_gross == 0) {
              //   // set Lwf deduction zero for both employee and employer side
              //   const idsToUpdate = new Set([
              //     payheadMasterIdsMapping.EMPLOYEE_LWF,
              //     payheadMasterIdsMapping.EMPLOYER_LWF,
              //   ]);

              //   userSalaryArray.forEach((item) => {
              //     if (idsToUpdate.has(item.payheadmasterid)) {
              //       item.employeeAmount = 0;
              //     }
              //   });
              // }

              let employee_otherAmount = 0;

              userSalaryArray.filter((s) => {
                if (
                  s.salaryfieldside == 'D' &&
                  s.salaryfieldsrno != 'C' &&
                  s.employeeAmount != 0 &&
                  s.salaryfieldshow == 'Y'
                ) {
                  employee_otherAmount =
                    employee_otherAmount + +s.employeeAmount;
                }
              });

              // add amount in net pay
              employee_extraAddInNetPay = userSalaryArray
                .filter(
                  (e) =>
                    e.salaryfieldsrno == 'A' &&
                    e.salaryfieldshow == 'Y' &&
                    e.considerIn == payheadConsiderInEnum.NETSALARY,
                )
                .reduce((acc, obj) => acc + +obj.employeeAmount, 0);

              employee_netPay =
                Number(employee_gross) -
                Number(employee_otherAmount) +
                +employee_extraAddInNetPay;

              // employee PT Calculation
              const ptdata = salarystructure.filter((s) => {
                return s.payheadMasterId == 15;
              });

              if (ptdata.length > 0) {
                const ptDeductionType =
                  usermaster[i].companyMaster?.ptDeduction ||
                  PTCalculationEnum.MONTHLY;

                const ptSlabs = allPTData.filter(
                  (e) =>
                    e.stateMasterID == ptdata[0].stateid &&
                    e.corporationId == ptdata[0].corporationId,
                );

                const ptCalculationType = ptSlabs?.[0]?.ptCalculation || null;

                const previousalary =
                  previousFiveMonthSalary.find(
                    (e) => e.userMasterID == usermaster[i].userMasterID,
                  )?.totalAmount || 0;

                const value = getPTCalculationAmount(
                  ptSlabs,
                  ptCalculationType,
                  ptDeductionType,
                  usermaster[i].gender,
                  previousalary,
                  employee_gross,
                  Month,
                );

                userSalaryArray.push({
                  salaryMasterID: ptdata[0].salaryMasterID,
                  payheadmasterid: ptdata[0].payheadMasterId,
                  payheadName:
                    ptdata[0].payheadDisplayName &&
                    ptdata[0].payheadDisplayName.trim()
                      ? ptdata[0].payheadDisplayName.trim()
                      : ptdata[0].payheadName,
                  employeeAmount: +value,
                  salaryfieldsrno: ptdata[0].salaryFieldSrNo,
                  salaryfieldside: ptdata[0].salaryFieldSide,
                  salaryfieldshow: ptdata[0].salaryFieldShow,
                  calculatedOn: null,
                });

                employee_netPay = Number(employee_netPay) - Number(value);
              }

              // employee esic

              const esicdata = salarystructure.filter((s) => {
                return s.payheadMasterId == 13;
              });

              if (esicdata.length > 0) {
                if (Number(esicdata[0].EmployeeSalaryAmount) > 0) {
                  let value = 0,
                    calculatedOn = 0;

                  if (esicDeduction == true) {
                    const actualSalary = +esicdata[0].EmployeeSalaryAmount || 0;

                    if (convertWorkedHoursToDays) {
                      value =
                        (actualSalary / 60) *
                        +dailyworkingminutes *
                        +paidDaysForHourlySalary;
                    } else {
                      const oneMinuteSalary = actualSalary / 60;

                      value = oneMinuteSalary * +usertotalpresentday;
                    }

                    // let oneminutesalry =
                    //   Number(esicdata[0].EmployeeSalaryAmount) / 60;

                    // value =
                    //   Number(oneminutesalry) * Number(usertotalpresentday);
                    // calculated on value
                    const esic =
                      (Number(esicdata[0].EmployeeSalaryAmount) * 100) /
                      (0.75 * 60);

                    calculatedOn = convertWorkedHoursToDays
                      ? +esic * +dailyworkingminutes * +paidDaysForHourlySalary
                      : Number(esic) * Number(usertotalpresentday);

                    value = Math.max(value, 0);

                    value += +OtherEmployee_ESIC_Amount;
                    calculatedOn += +ESIC_CalculatedOn_Amount;

                    // check max range

                    if (esicdata[0].salaryfieldmaxrange) {
                      if (+value > +esicdata[0].salaryfieldmaxrange) {
                        value = +esicdata[0].salaryfieldmaxrange;
                      }
                    }

                    value =
                      esicdata[0].salaryFieldRound == 'Y'
                        ? esicdata[0].roundOffType == 0
                          ? Math.ceil(value.toFixed(2))
                          : Math.round(value)
                        : !esicdata[0].salaryFieldRound
                          ? Math.round(value)
                          : value.toFixed(+esicdata[0].salaryFieldRoundNo);
                  }

                  userSalaryArray.push({
                    salaryMasterID: esicdata[0].salaryMasterID,
                    payheadmasterid: esicdata[0].payheadMasterId,
                    payheadName:
                      esicdata[0].payheadDisplayName &&
                      esicdata[0].payheadDisplayName.trim()
                        ? esicdata[0].payheadDisplayName.trim()
                        : esicdata[0].payheadName,
                    employeeAmount: +value,
                    salaryfieldsrno: esicdata[0].salaryFieldSrNo,
                    salaryfieldside: esicdata[0].salaryFieldSide,
                    salaryfieldshow: esicdata[0].salaryFieldShow,
                    calculatedOn:
                      +calculatedOn > 0 ? Math.round(+calculatedOn) : null,
                  });

                  employee_netPay = Number(employee_netPay) - Number(value);
                }
              }

              // company esic

              const co_esicdata = salarystructure.filter((s) => {
                return s.payheadMasterId == 14;
              });

              if (co_esicdata.length > 0) {
                if (Number(co_esicdata[0].EmployeeSalaryAmount) > 0) {
                  let value = 0;

                  if (esicDeduction == true) {
                    const actualSalary =
                      +co_esicdata[0].EmployeeSalaryAmount || 0;

                    if (convertWorkedHoursToDays) {
                      value =
                        (actualSalary / 60) *
                        +dailyworkingminutes *
                        +paidDaysForHourlySalary;
                    } else {
                      const oneMinuteSalary = actualSalary / 60;

                      value = oneMinuteSalary * +usertotalpresentday;
                    }

                    value = Math.max(value, 0);

                    // let oneminutesalry =
                    //   Number(co_esicdata[0].EmployeeSalaryAmount) / 60;

                    // value =
                    //   Number(oneminutesalry) * Number(usertotalpresentday);

                    //SUM Of ESIC
                    value += +OtherEmployer_ESIC_Amount;

                    // max range

                    if (co_esicdata[0].salaryfieldmaxrange) {
                      if (+value > +co_esicdata[0].salaryfieldmaxrange) {
                        value = +co_esicdata[0].salaryfieldmaxrange;
                      }
                    }

                    value =
                      co_esicdata[0].salaryFieldRound == 'Y'
                        ? co_esicdata[0].roundOffType == 0
                          ? Math.ceil(value.toFixed(2))
                          : Math.round(value)
                        : !co_esicdata[0].salaryFieldRoundNo
                          ? Math.round(value)
                          : value.toFixed(+co_esicdata[0].salaryFieldRoundNo);
                  }

                  userSalaryArray.push({
                    salaryMasterID: co_esicdata[0].salaryMasterID,
                    payheadmasterid: co_esicdata[0].payheadMasterId,
                    payheadName:
                      co_esicdata[0].payheadDisplayName &&
                      co_esicdata[0].payheadDisplayName.trim()
                        ? co_esicdata[0].payheadDisplayName.trim()
                        : co_esicdata[0].payheadName,
                    employeeAmount: +value,
                    salaryfieldsrno: co_esicdata[0].salaryFieldSrNo,
                    salaryfieldside: co_esicdata[0].salaryFieldSide,
                    salaryfieldshow: co_esicdata[0].salaryFieldShow,
                    calculatedOn: null,
                  });
                }
              }

              // ------------------ LWF deduction -----------------

              if (employee_lwf) {
                let value = 0;

                const stateId = +employee_lwf.stateid || null;

                const lwfData = allLWFStateWiseMap?.get(stateId);

                const salaryCalculation_Act = ['F', 'W'].includes(
                  salaryCalculationAct,
                )
                  ? 'F'
                  : 'S';
                const month = +String(yearmonth).slice(4, 6);

                if (lwfData?.length && +employee_gross > 0) {
                  const lwf_data = lwfData.find(
                    (e) =>
                      (e.applicableAct || []).includes(salaryCalculation_Act) &&
                      (!e.month || (e.month || [])?.includes(month)),
                  );

                  value = getLwfAmountForSalary(
                    lwf_data,
                    employee_lwf.payheadMasterId,
                    employee_gross,
                  );
                }

                userSalaryArray.push({
                  salaryMasterID: employee_lwf.salaryMasterID,
                  payheadmasterid: employee_lwf.payheadMasterId,
                  payheadName:
                    employee_lwf.payheadDisplayName &&
                    employee_lwf.payheadDisplayName.trim()
                      ? employee_lwf.payheadDisplayName.trim()
                      : employee_lwf.payheadName,
                  employeeAmount: getRoundOffSalary(
                    value,
                    employee_lwf.salaryFieldRound,
                    employee_lwf.roundOffType,
                    employee_lwf.salaryFieldRoundNo,
                  ),
                  salaryfieldsrno: employee_lwf.salaryFieldSrNo,
                  salaryfieldside: employee_lwf.salaryFieldSide,
                  salaryfieldshow: employee_lwf.salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: employee_lwf.salaryfieldmaxrange,
                });
              }

              if (employer_lwf) {
                let value = 0;

                const stateId = +employer_lwf.stateid || null;

                const lwfData = allLWFStateWiseMap?.get(stateId);

                const salaryCalculation_Act = ['F', 'W'].includes(
                  salaryCalculationAct,
                )
                  ? 'F'
                  : 'S';
                const month = +String(yearmonth).slice(4, 6);

                if (lwfData?.length && +employee_gross > 0) {
                  const lwf_data = lwfData.find(
                    (e) =>
                      (e.applicableAct || []).includes(salaryCalculation_Act) &&
                      (!e.month || (e.month || [])?.includes(month)),
                  );

                  value = getLwfAmountForSalary(
                    lwf_data,
                    employer_lwf.payheadMasterId,
                    employee_gross,
                  );
                }

                userSalaryArray.push({
                  salaryMasterID: employer_lwf.salaryMasterID,
                  payheadmasterid: employer_lwf.payheadMasterId,
                  payheadName:
                    employer_lwf.payheadDisplayName &&
                    employer_lwf.payheadDisplayName.trim()
                      ? employer_lwf.payheadDisplayName.trim()
                      : employer_lwf.payheadName,
                  employeeAmount: getRoundOffSalary(
                    value,
                    employer_lwf.salaryFieldRound,
                    employer_lwf.roundOffType,
                    employer_lwf.salaryFieldRoundNo,
                  ),
                  salaryfieldsrno: employer_lwf.salaryFieldSrNo,
                  salaryfieldside: employer_lwf.salaryFieldSide,
                  salaryfieldshow: employer_lwf.salaryFieldShow,
                  calculatedOn: null,
                  salaryfieldmaxrange: employer_lwf.salaryfieldmaxrange,
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

              // employer side deduction

              employerDeduction = userSalaryArray.filter(
                (s) => s.salaryfieldsrno == 'C' && +s.employeeAmount > 0,
              );

              EmployerSideAmount = employerDeduction.reduce(
                (acc, obj) => acc + +obj.employeeAmount,
                0,
              );

              userSalaryArray = userSalaryArray.filter((s) => {
                return s.salaryfieldsrno != 'C' && s.salaryfieldshow == 'Y';
              });

              // show data

              for (let g = 0; g < userSalaryArray.length; g++) {
                if (
                  [
                    16, 17, 24, 34, 9, 43, 14, 13, 15, 78, 83, 99, 67, 101, 102,
                    103, 104, 107, 112, 116, 135, 123, 125, 126, 127, 133, 147,
                    122, 130, 148, 18, 59, 151, 152,
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

              employee_netPay = Number(totalear) - Number(totaldedu);

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
                +employee_gross % 1 !== 0 &&
                CTC_GROSS_NET.find((e) => +e.payheadMasterId == 50)
                  ?.salaryFieldRound == 'N'
              ) {
                employee_gross = +employee_gross.toFixed(
                  +CTC_GROSS_NET.find((e) => e.payheadMasterId == 50)
                    ?.salaryFieldRoundNo || 0,
                );
              } else {
                employee_gross = Math.round(+employee_gross);
              }

              employee_ctc =
                +employee_gross +
                +employee_extraAddInNetPay +
                +EmployerSideAmount;

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
                  ? loanData.map((e) => e.LoanTrasactionId)
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
                let add_data = await HrSalaryTrans.create(
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
                      amount: Math.round(
                        +employeefinalsalary[l].employeeAmount,
                      ),
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
                  await advancePayments.update(
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
                  await LoanTransactions.update(
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
                  await employeePenalties.update(
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
                  await OverTimeCalculationMains.update(
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
                      salaryMonthToPay: yearmonth,
                      payReferenceId: add_data.userSalaryTranID,
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

                // update Expense Reimbursement

                if (
                  expensePaymentId?.length &&
                  employeefinalsalary[l].payheadmasterid ==
                    payheadMasterIdsMapping.EXPENSE_REIMBURSEMENT
                ) {
                  await expensePayment.update(
                    {
                      referenceId: add_data.userSalaryTranID,
                      paymentDate: end_date,
                      updateBy: createBy,
                      updateByIp: createByIp,
                    },
                    {
                      where: {
                        ExpensePaymentID: {
                          [Sequelize.Op.in]: expensePaymentId,
                        },
                      },
                      transaction: t,
                    },
                  );
                }
              }
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

          console.log(
            `Generating salary slip for ${usermaster[i].displayName} (${usermaster[i].userMasterID})`,
          );

          const find_salaryslip = usermaster[i].hrSalarySlips?.[0] || null;

          if (find_salaryslip) {
            await HRSalarySlip.destroy({
              where: {
                userMasterID: usermaster[i].userMasterID,
                salaryYYYYMM: yearmonth,
              },
              transaction: t,
            });
          }

          let leavedata = calculatedAttendanceData;

          // penalty
          let attendancePenalty =
            leavedata.find((e) => e['hrLeaveType.LeaveID'] == 22)?.AttnVal || 0;

          let check_hourly = leavedata.filter((e) => {
            return e['hrLeaveType.LeaveID'] == 20;
          });

          let salarycalculated;
          let final_workinghour = 0;
          let showovertime = false;
          let final_ot = 0;

          if (check_hourly.length > 0) {
            salarycalculated = 'hourly';

            // check attendance penalty

            attendancePenalty =
              +attendancePenalty > 0
                ? attendancePenalty
                : LCEGPenaltyData.find(
                    (e) => e.penaltyType == LCEGPenaltyTypeEnum.MINUTE,
                  )?.penaltyValue || 0;

            let working_hour = Number(check_hourly[0].AttnVal) / 60;
            let working_min = Number(check_hourly[0].AttnVal) % 60;

            if (Number(working_min) > 0) {
              if (Number(working_min) < 10) {
                working_min = '0' + working_min;
              }

              final_workinghour = Math.trunc(working_hour) + '.' + working_min;
            } else {
              final_workinghour = Math.trunc(working_hour);
            }

            if (+attendancePenalty > 0) {
              let penalty_hour = Number(attendancePenalty) / 60;
              let penalty_min = Number(attendancePenalty) % 60;

              if (Number(penalty_min) > 0) {
                if (Number(penalty_min) < 10) {
                  penalty_min = '0' + penalty_min;
                }

                attendancePenalty =
                  Math.trunc(penalty_hour) + '.' + penalty_min;
              } else {
                attendancePenalty = Math.trunc(penalty_hour);
              }
            }

            if (userAttendacepolicy) {
              let showinsalaryslip = userAttendacepolicy.showinsalaryslip;

              if (showinsalaryslip == 'true') {
                let overtime = leavedata.filter((e) => {
                  return (
                    e['hrLeaveType.LeaveID'] == 21 && Number(e.AttnVal) > 0
                  );
                });

                if (overtime.length > 0) {
                  showovertime = true;

                  let ot_hour = Number(overtime[0].AttnVal) / 60;
                  let ot_min = Number(overtime[0].AttnVal) % 60;

                  if (Number(ot_min) > 0) {
                    if (Number(ot_min) < 10) {
                      ot_min = '0' + ot_min;
                    }

                    final_ot = Math.trunc(ot_hour) + '.' + ot_min;
                  } else {
                    final_ot = Math.trunc(ot_hour);
                  }
                } else {
                  final_ot = 0;
                }
              }
            }
          } else {
            salarycalculated = 'monthly';
            attendancePenalty =
              +attendancePenalty > 0
                ? attendancePenalty
                : LCEGPenaltyData.find(
                    (e) => e.penaltyType == LCEGPenaltyTypeEnum.DAY,
                  )?.penaltyValue || 0;
          }

          // show overtime

          if (+overtime_min > 0) {
            showovertime = true;

            let ot_hour = +overtime_min / 60;
            let ot_min = +overtime_min % 60;

            if (+ot_min > 0) {
              if (+ot_min < 10) {
                ot_min = '0' + ot_min;
              }

              final_ot = Math.trunc(ot_hour) + '.' + ot_min;
            } else {
              final_ot = Math.trunc(ot_hour);
            }
          }

          const finalpresentday =
            leavedata.find((e) => e['hrLeaveType.LeaveID'] == 1)?.AttnVal || 0;
          const finalweekoff =
            leavedata.find((e) => e['hrLeaveType.LeaveID'] == 7)?.AttnVal || 0;
          const finalholiday =
            leavedata.find((e) => e['hrLeaveType.LeaveID'] == 9)?.AttnVal || 0;

          const finalpaidleave = leavedata
            .filter(
              (e) =>
                ![1, 5, 7, 9, 18, 20, 21, 22, 28, 25, 35, 57].includes(
                  +e['hrLeaveType.LeaveID'],
                ),
            )
            .reduce((acc, obj) => acc + +obj.AttnVal, 0);

          const finalunpaidleave = leavedata
            .filter((e) => [5, 18, 28, 57].includes(+e['hrLeaveType.LeaveID']))
            .reduce((acc, obj) => acc + +obj.AttnVal, 0);

          const outDoorDuty = leavedata
            .filter((e) => e['hrLeaveType.LeaveID'] == 25)
            .reduce((acc, obj) => acc + obj.AttnVal, 0);
          const compensatoryOff = leavedata
            .filter((e) => e['hrLeaveType.LeaveID'] == 6)
            .reduce((acc, obj) => acc + obj.AttnVal, 0);

          // allLeave

          const allLeaves = leavedata
            .filter(
              (e) =>
                ![1, 5, 7, 9, 20, 21, 22, 28, 34, 35, 57].includes(
                  e['hrLeaveType.LeaveID'],
                ),
            )
            .reduce((acc, obj) => acc + +obj.AttnVal, 0);
          const allAbsent = leavedata
            .filter((e) => [5, 28, 57].includes(e['hrLeaveType.LeaveID']))
            .reduce((acc, obj) => acc + +obj.AttnVal, 0);

          // set actualAmount in salary slip

          showusersalary = showusersalary.map((e) => {
            const findpayhead = salarystructure.find((s) => {
              return s.salaryMasterID == e.salaryMasterID;
            });

            e.actualamount =
              findpayhead?.EmployeeSalaryAmount > 0
                ? findpayhead.EmployeeSalaryAmount
                : '';
            return e;
          });

          const earning = showusersalary.filter((e) => {
            return (
              e.salaryfieldside == 'E' &&
              e.salaryfieldshow == 'Y' &&
              e.considerIn != payheadConsiderInEnum.NETSALARY
            );
          });

          const deduction = showusersalary.filter((e) => {
            return e.salaryfieldside == 'D' && e.salaryfieldshow == 'Y';
          });
          // -------------------Extra Earning payhead  ---------------
          const extra_earning = showusersalary.filter((e) => {
            return (
              e.salaryfieldside == 'E' &&
              e.salaryfieldshow == 'Y' &&
              e.considerIn == payheadConsiderInEnum.NETSALARY
            );
          });

          let totaldeduction = 0;

          if (deduction.length > 0) {
            totaldeduction = deduction.reduce((accumulator, object) => {
              return accumulator + object.employeeAmount;
            }, 0);
          } else {
            totaldeduction = 0;
          }

          // To check decimal or not

          if (+totaldeduction % 1 !== 0) {
            totaldeduction = (+totaldeduction).toFixed(2);
          }

          const numbertext = toWords.convert(employee_netPay);

          const monthName = month_dict[String(yearmonth).slice(4, 6)];

          let joiningmonth = employeeJoining
            ? employeeJoining.joiningDate.slice(5, 7)
            : '';
          let month2 = monthNames[joiningmonth - 1];
          let joiningdate =
            (employeeJoining ? employeeJoining.joiningDate.slice(8, 10) : '') +
            ' - ' +
            month2 +
            ' - ' +
            (employeeJoining ? employeeJoining.joiningDate.slice(0, 4) : '');

          const startDate =
            start_date.slice(8, 10) +
            ' - ' +
            monthNames[start_date.slice(5, 7) - 1] +
            ' - ' +
            start_date.slice(0, 4);

          const endDate =
            end_date.slice(8, 10) +
            ' - ' +
            monthNames[end_date.slice(5, 7) - 1] +
            ' - ' +
            end_date.slice(0, 4);

          const slaceJoiningDate = slaceFormatDate(employeeJoining.joiningDate);
          const slaceStartDate = slaceFormatDate(start_date);
          const slaceEndDate = slaceFormatDate(end_date);

          let salarySlipName;
          let otHrs = 0;

          const companyMasterId = +usermaster[i].companyMasterId;
          const salarySlipFormatID =
            salarySlipFormat?.salarySlipFormatID ?? null;

          const allEarnings = [2, 6, 7].includes(salarySlipFormatID)
            ? [...earning, ...extra_earning]
            : earning;

          if (salarySlipFormatID != 6) {
            if (allEarnings.length > deduction.length) {
              for (var o = 0; o < allEarnings.length; o++) {
                if (
                  deduction[o] != undefined ||
                  deduction[o] != null ||
                  deduction[o] != ''
                ) {
                  deduction[o] = deduction[o];
                } else {
                  deduction[o].payheadName = '';
                  deduction[o].employeeAmount = '';
                }

                if (allEarnings[o].actualamount == 0) {
                  allEarnings[o].actualamount = '';
                }
              }
            } else {
              for (var f = 0; f < deduction.length; f++) {
                if (
                  allEarnings[f] != undefined ||
                  allEarnings[f] != null ||
                  allEarnings[f] != ''
                ) {
                  allEarnings[f] = allEarnings[f];
                } else {
                  allEarnings[f].push({ payheadName: '', employeeAmount: '' });
                }
              }
            }
          }

          switch (companyMasterId) {
            case 277:
            case 298:
              salarySlipName = salarySlipNameList.ASOPALAV;
              break;
            case 560:
            case 630:
              salarySlipName = salarySlipNameList.JEEVDANI;
              const otData = All_OT_Cal.find(
                (e) => e.userMasterID == +usermaster[i].userMasterID,
              );
              otHrs = otData ? (+otData.overtimehrs / 60).toFixed(2) : 0;
              break;
            case 543:
              salarySlipName = salarySlipNameList.FINTECH_FILLING;
              break;
            case 744: //Parent Company
            // Child Company
            case 965:
            case 968:
            case 969:
            case 970:
            case 971:
            case 998:
            case 999:
            case 1000:
              salarySlipName = salarySlipNameList.SAVERA_GROUP;
              break;
            case 1045:
              salarySlipName = salarySlipNameList.TECHCEDENCE;
              break;
            default:
              // for salary slip format id
              switch (salarySlipFormatID) {
                case 2:
                  salarySlipName = salarySlipNameList.TEMPLATE2;
                  break;
                case 3:
                  salarySlipName =
                    salarySlipNameList.WITH_EMPLOYER_CONTRIBUTION;
                  break;
                case 4:
                  salarySlipName = salarySlipNameList.TEMPLATE4;
                  break;
                case 5:
                  salarySlipName = salarySlipNameList.TEMPLATE5;
                  break;
                case 6:
                  salarySlipName = salarySlipNameList.CONSULTANT_SALARY_SLIP;
                  break;
                case 7:
                  salarySlipName = salarySlipNameList.AED_SALARY_SLIP;
                  break;
                case 8:
                  salarySlipName = salarySlipNameList.TEMPLATE3;
                  break;
                case 9:
                  salarySlipName = salarySlipNameList.TEMPLATE6;
                  break;
                case 10:
                  salarySlipName = salarySlipNameList.TEMPLATE7;
                  break;
                default:
                  salarySlipName = salarySlipNameList.TEMPLATE1;
                  break;
              }
              break;
          }

          const contractorData =
            employeeJoining && employeeJoining.contractor
              ? employeeJoining.contractor
              : null;

          const contractorAddressData = contractorData
            ? `${contractorData.contractorAddress ? contractorData.contractorAddress + ',' : ''} ${contractorData.cityMaster.cityName}, ${contractorData.cityMaster.stateMaster.stateName}, ${contractorData.cityMaster.stateMaster.countryMaster.countryName}`
            : '';

          const workingDays = monday - finalweekoff - finalholiday;

          const divisionName =
            usermaster[i].employeeDivisions?.[0]?.division?.divisionName || '';

          let data = {
            companylogo: usermaster[i].companyMaster
              ? usermaster[i].companyMaster.companyLogo
              : '',
            companyname: usermaster[i].companyMaster
              ? usermaster[i].companyMaster.companyName
              : '',
            companyEmail:
              usermaster[i].companyMaster &&
              usermaster[i].companyMaster?.companyEmail &&
              usermaster[i].companyMaster?.companyEmail != '' &&
              (+usermaster[i]?.companyMasterId == 196 ||
                +usermaster[i]?.companyMasterId == 288 ||
                salarySlipFormatID == 6)
                ? usermaster[i].companyMaster?.companyEmail
                : '',
            showCompanyEmail:
              (+usermaster[i]?.companyMasterId == 196 ||
                +usermaster[i]?.companyMasterId == 288) &&
              usermaster[i].companyMaster?.companyEmail &&
              usermaster[i].companyMaster?.companyEmail != ''
                ? true
                : false,
            aaryaVrat: +usermaster[i]?.companyMasterId == 196,
            aaryaMaan: +usermaster[i]?.companyMasterId == 288,
            companyaddress: usermaster[i].companyMaster
              ? usermaster[i].companyMaster.companyAddress
              : '',
            employeecode: employeeJoining?.employeeCode || '',
            employeename: usermaster[i].displayName,
            joiningdate: joiningdate,
            uanNumber: employeeJoining?.uanNumber || '',
            pfNumber: employeeJoining?.pfNumber || '',
            pancard: employeeJoining?.pancard || '',
            esicNumber: employeeJoining?.esicNumber || '',
            branch: employeeBranch,
            branchAddress: employeeBranchAddress,
            department: employeeDepartment,
            designation: employeeDesignation,
            monthDays: monday,
            presentday: finalpresentday,
            weekoff: finalweekoff,
            holiday: finalholiday,
            unpaidleave: finalunpaidleave,
            paidleave: finalpaidleave,
            workinghour: final_workinghour,
            overtimehour: final_ot,
            attendancePenalty: attendancePenalty,
            attendancePenaltyShow: +attendancePenalty > 0 ? true : false,
            salarycalculated: salarycalculated,
            overtimeshow: showovertime,
            earning: earning,
            deduction: deduction,
            extra_earning,
            totaldeduction: totaldeduction,
            totalearning: employee_gross,
            totalactualearning: gross,
            nettotal: employee_netPay,
            numbertext: `${numbertext}${salarySlipFormatID == 7 ? '' : ' Rupees'} Only.`,
            numberTextMarathi: `${numbertext} Rupees Only ( ${toMarathiWords.convert(employee_netPay)} )`,

            month: monthName,
            year: year,
            start_date: startDate,
            end_date: endDate,
            otHrs,
            CIN_Number: usermaster[i].companyMaster
              ? usermaster[i].companyMaster.cinNumber
              : '',
            companyWebsite: usermaster[i].companyMaster
              ? usermaster[i].companyMaster.companyWebsite
              : '',
            outDoorDuty,
            ApiURL: mainApiUrl,
            usersContractorName: contractorData
              ? contractorData.contractorName
              : '',
            usersContractorAddress: contractorAddressData
              ? contractorAddressData
              : '',
            userbankAccountNo:
              employeeJoining &&
              employeeJoining.bankAccountStatus == 1 &&
              employeeJoining.bankAccountNo
                ? employeeJoining.bankAccountNo
                : '',
            userbankName:
              employeeJoining &&
              employeeJoining.bankMaster &&
              employeeJoining.bankAccountStatus == 1
                ? employeeJoining.bankMaster.bankName
                : '',
            bankIFSC:
              employeeJoining?.bankAccountStatus == 1
                ? employeeJoining?.bankIFSC
                : '',
            payableDays:
              salarycalculated == 'hourly'
                ? minutesToHoursMinutes(usertotalpresentday)
                : usertotalpresentday,
            compensatoryOff,
            allAbsent,
            allLeaves,
            allEarnings,
            slaceJoiningDate,
            slaceStartDate,
            slaceEndDate,
            workingDays,
            employerDeduction,
            EmployerSideAmount,
            divisionName,
            employee_ctc,
            totalExtraDays,
          };

          if (salarySlipName == salarySlipNameList.TEMPLATE5) {
            const leaveBalanceArray = await getLeaveBalanceForSalarySlip(
              start_date,
              end_date,
              usermaster[i].userMasterID,
              leaveTypeList,
            );

            data = { ...data, leaveBalanceArray };
          }

          if (salarySlipName == salarySlipNameList.CONSULTANT_SALARY_SLIP) {
            data = {
              ...data,
              invoiceNo: `CONS-${yearmonth}${employeeJoining?.employeeCode ? '-' + employeeJoining.employeeCode : ''}`,
              invoiceDate: moment().format('D MMM YYYY'),
              employeeAddress: userAddress ? ToformatAddress(userAddress) : '',
              empMobileNo: usermaster[i].userNumber,
              empEmail: usermaster[i].email,
              companyMobileNo: usermaster[i].companyMaster?.cpMobileNo || '',
              salaryCalRemark: salaryCalRemark || '',
              nameAsBank:
                employeeJoining?.bankAccountStatus == 1
                  ? employeeJoining?.nameAsBank || usermaster[i].displayName
                  : '',
              slaceFormatCurrentDate: moment().format('DD/MM/YYYY'),
              billingPeriod:
                moment(start_date, 'YYYY-MM-DD').format('D MMM YYYY') +
                ' - ' +
                moment(end_date, 'YYYY-MM-DD').format('D MMM YYYY'),
              employeeSignature: userSignature,
            };
          }

          let base64path = '';
          if (salarySlipName != 'saveraGroupPaySlip') {
            const filePath = getTemplate(salarySlipName);
            const file = await readFile(filePath);
            const template = Handlebars.compile(file);
            const html = template(data);

            // const browser = await puppeteer.launch({
            //   args: ['--no-sandbox'],
            //   headless: 'new',
            // });
            // const page = await browser.newPage();

            // Set the HTML content of the page
            await page.setContent(html);

            // Generate PDF
            const buffer = await page.pdf({
              format: 'A4', // Page format (A4 in this case)
              printBackground: true, // print background
              // margin: { top: '20px', bottom: '20px' },
            });

            base64path = Buffer.from(buffer).toString('base64');

            //  ---------------------- payroll Statutory -------------------------------
            if (ps_calculate) {
              const ps_slip_data = { ...data };

              ps_slip_data.overtimehour =
                minutesToHoursMinutes(ps_overtime_min);

              const ps_presentDays =
                ps_attendanceCalData.find((e) => e['hrLeaveType.LeaveID'] == 1)
                  ?.AttnVal || 0;

              const ps_finalunpaidleave = ps_attendanceCalData
                .filter((e) =>
                  [5, 18, 28, 57].includes(+e['hrLeaveType.LeaveID']),
                )
                .reduce((acc, obj) => acc + +obj.AttnVal, 0);

              const ps_allAbsent = ps_attendanceCalData
                .filter((e) => [5, 28, 57].includes(e['hrLeaveType.LeaveID']))
                .reduce((acc, obj) => acc + +obj.AttnVal, 0);

              // set actualAmount in salary slip

              const zeroAmountPayheads = new Set([
                16, 17, 24, 34, 9, 43, 14, 13, 15, 78, 83, 99, 67, 101, 102,
                103, 104, 107, 112, 116, 135, 123, 125, 126, 127, 133, 147, 122,
                130, 148, 18, 59, 151, 152,
              ]);

              const ps_showusersalary = [];

              for (const salary of payrollStatutoryArray) {
                const actualAmount =
                  +payrollStatutoryDetails.get(salary.payheadmasterid)
                    ?.ActualEmployeeSalaryAmount || '';
                salary.actualamount = actualAmount;
                if (
                  !zeroAmountPayheads.has(salary.payheadmasterid) ||
                  salary.employeeAmount !== 0
                ) {
                  ps_showusersalary.push(salary);
                }
              }

              const ps_earning = ps_showusersalary.filter((e) => {
                return (
                  e.salaryfieldside == 'E' &&
                  e.salaryfieldshow == 'Y' &&
                  e.considerIn != payheadConsiderInEnum.NETSALARY
                );
              });

              const ps_deduction = ps_showusersalary.filter((e) => {
                return e.salaryfieldside == 'D' && e.salaryfieldshow == 'Y';
              });
              // -------------------Extra Earning payhead  ---------------
              const ps_extra_earning = ps_showusersalary.filter((e) => {
                return (
                  e.salaryfieldside == 'E' &&
                  e.salaryfieldshow == 'Y' &&
                  e.considerIn == payheadConsiderInEnum.NETSALARY
                );
              });

              let ps_totaldeduction = 0;

              if (ps_deduction.length > 0) {
                ps_totaldeduction = ps_deduction.reduce(
                  (accumulator, object) => {
                    return accumulator + object.employeeAmount;
                  },
                  0,
                );
              } else {
                ps_totaldeduction = 0;
              }

              // To check decimal or not

              if (+ps_totaldeduction % 1 !== 0) {
                ps_totaldeduction = (+ps_totaldeduction).toFixed(2);
              }

              const numbertext = toWords.convert(ps_employee_netPay);

              const ps_allEarnings = [2, 6, 7].includes(salarySlipFormatID)
                ? [...ps_earning, ...ps_extra_earning]
                : ps_earning;

              if (salarySlipFormatID !== 6) {
                const maxLength = Math.max(
                  ps_allEarnings.length,
                  ps_deduction.length,
                );

                for (let i = 0; i < maxLength; i++) {
                  if (!ps_allEarnings[i]) {
                    ps_allEarnings[i] = undefined;
                  }

                  if (!ps_deduction[i]) {
                    ps_deduction[i] = undefined;
                  }
                }
              }

              ps_gross =
                payrollStatutoryDetails?.get(payheadMasterIdsMapping.GROSS)
                  ?.EmployeeSalaryAmount || 0;

              ps_slip_data.presentday = ps_presentDays;
              ps_slip_data.unpaidleave = ps_finalunpaidleave;
              ps_slip_data.earning = ps_earning;
              ps_slip_data.deduction = ps_deduction;
              ps_slip_data.extra_earning = ps_extra_earning;
              ps_slip_data.totaldeduction = ps_totaldeduction;
              ps_slip_data.totalearning = ps_employee_gross;
              ps_slip_data.totalactualearning = ps_gross;
              ps_slip_data.nettotal = ps_employee_netPay;
              ps_slip_data.numbertext = `${numbertext}${salarySlipFormatID == 7 ? '' : ' Rupees'} Only.`;
              ps_slip_data.numberTextMarathi = `${numbertext} Rupees Only ( ${toMarathiWords.convert(ps_employee_netPay)} )`;
              ps_slip_data.extra_earning = ps_extra_earning;
              ps_slip_data.allAbsent = ps_allAbsent;
              ps_slip_data.allEarnings = ps_allEarnings;
              ps_slip_data.employerDeduction = ps_employerDeduction;
              ps_slip_data.EmployerSideAmount = ps_employerSideAmount;
              ps_slip_data.employee_ctc = ps_employee_ctc;

              const ps_html = template(ps_slip_data);
              // Set the HTML content of the page
              await page.setContent(ps_html);

              // Generate PDF
              const buffer = await page.pdf({
                format: 'A4', // Page format (A4 in this case)
                printBackground: true, // print background
                // margin: { top: '20px', bottom: '20px' },
              });

              const ps_base64path = Buffer.from(buffer).toString('base64');
              const dataUrl = `data:application/pdf;base64,${ps_base64path}`;
              const salarySlipStoredPath = await s3UploadSalarySlipPdf({
                photo: dataUrl,
                userMasterID: usermaster[i].userMasterID,
                companyMasterId: companyMasterId,
                yearMonth: yearmonth,
                salarySlipType: 'payrollStatutory_salarySlip',
              });
              const path = salarySlipStoredPath?.original || null;

              await PayrollStatutorySlip.create(
                {
                  userMasterID: +usermaster[i].userMasterID,
                  salaryYYYYMM: yearmonth,
                  path,
                  isS3Upload: isStoreFileToS3Bucket,
                },
                { user: req.userDetails, transaction: t },
              );
            }

            // await browser.close();
          } else {
            function findLeaveBalance(leavebalance, LeaveID) {
              const findLeave =
                leavebalance && leavebalance.length > 0
                  ? leavebalance.find((e) => e.LeaveID == LeaveID)
                  : null;
              return findLeave ? findLeave.Balance : 0;
            }
            const leavebalance = await employeeeLeaveBalance(
              +usermaster[i].companyMasterId,
              +usermaster[i].userMasterID,
            );
            data.remainingBalance_CL = findLeaveBalance(leavebalance, 2);
            data.remainingBalance_SL = findLeaveBalance(leavebalance, 10);
            data.remainingBalance_PL = findLeaveBalance(leavebalance, 3);
            data.remainingBalance_OD = findLeaveBalance(leavebalance, 25);
            data.remainingBalance_CO = findLeaveBalance(leavebalance, 6);
            base64path = await generateHTMLToPDF_base64Path(
              data,
              salarySlipName,
              'portrait',
              'html', //File Extension
            );
          }
          if (base64path) {
            const dataUrl = `data:application/pdf;base64,${base64path}`;
            const salarySlipStoredPath = await s3UploadSalarySlipPdf({
              photo: dataUrl,
              userMasterID: usermaster[i].userMasterID,
              companyMasterId: companyMasterId,
              yearMonth: yearmonth,
              salarySlipType: 'salarySlip',
            });
            base64path = salarySlipStoredPath?.original || null;
          }

          await HRSalarySlip.create({
            userMasterID: +usermaster[i].userMasterID,
            salaryYYYYMM: yearmonth,
            path: base64path,
            salarySlipIssue: 0,
            salaryCalRemark,
            createBy: createBy,
            createByIp: createByIp,
            isS3Upload: isStoreFileToS3Bucket,
            migration: true,
          });

          console.log(
            `Salary slip generated for ${usermaster[i].displayName} (${usermaster[i].userMasterID})`,
          );
        });
      }
    }

    if (browser) await browser.close();
    return res.status(200).json({
      status: 200,
      message: 'Salary calculated successfully.',
    });
  } catch (err) {
    if (browser) await browser.close();
    next(err);
  }
};

exports.deleteAllsalary = async (req, res, next) => {
  try {
    const { userMasterID = [], yearmonth, from = 'salary' } = await req.body;

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    await sequelize.transaction(async (t) => {
      const AllsalaryData = await HRSalaryTrasaction.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: userMasterID,
          },
          salaryYYYYMM: yearmonth,
        },
        include: [
          {
            required: true,
            model: HRSalaryMaster,
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
                          payheadMasterIdsMapping.ADVANCE,
                          payheadMasterIdsMapping.LOAN,
                          payheadMasterIdsMapping.INCENTIVE,
                          payheadMasterIdsMapping.PENALTY,
                          payheadMasterIdsMapping.OT,
                          payheadMasterIdsMapping.DEPOSIT_DEDUCTION,
                          payheadMasterIdsMapping.DEPOSIT_PAY,
                          payheadMasterIdsMapping.LEAVE_ENCASHMENT,
                          payheadMasterIdsMapping.BONUS_PAY,
                          payheadMasterIdsMapping.BONUS,
                          payheadMasterIdsMapping.EXPENSE_REIMBURSEMENT,
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
            required: true,
            model: UserMaster,
            where: { ...where },
            attributes: ['isFNF', 'fnfMonth', 'userMasterID'],
            include: [
              ...includeModels,
              {
                model: HRSalarySlip,
                where: { salaryYYYYMM: yearmonth, paid: false },
                attributes: [],
              },
            ],
          },
        ],
      });

      // filter FNF

      const finalUserIds = [
        ...new Set(AllsalaryData.map((e) => e.userMasterID)),
      ];

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
        final_UserMasterID = finalUserIds.filter(
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

      const PAYHEADS = {
        ADV: payheadMasterIdsMapping.ADVANCE,
        LOAN: payheadMasterIdsMapping.LOAN,
        OT: payheadMasterIdsMapping.OT,
        DEPOSIT: payheadMasterIdsMapping.DEPOSIT_DEDUCTION,
        DEPOSIT_PAY: payheadMasterIdsMapping.DEPOSIT_PAY,
        LEAVE_ENC: payheadMasterIdsMapping.LEAVE_ENCASHMENT,
        BONUS: payheadMasterIdsMapping.BONUS,
        BONUS_PAY: payheadMasterIdsMapping.BONUS_PAY,
        EXPENSE_PAY: payheadMasterIdsMapping.EXPENSE_REIMBURSEMENT,
      };

      const idsMap = Object.fromEntries(
        Object.values(PAYHEADS).map((id) => [id, []]),
      );

      salaryData.forEach((e) => {
        const id = e?.HSM?.GSS?.HSF?.payheadMasterId;
        if (idsMap[id]) idsMap[id].push(e.userSalaryTranID);
      });

      const Loan_Ids = idsMap[payheadMasterIdsMapping.LOAN] ?? [];
      const Adv_ids = idsMap[payheadMasterIdsMapping.ADVANCE] ?? [];
      const OT_Ids = idsMap[payheadMasterIdsMapping.OT] ?? [];
      const deposit_Ids =
        idsMap[payheadMasterIdsMapping.DEPOSIT_DEDUCTION] ?? [];
      const depositPay_Ids = idsMap[payheadMasterIdsMapping.DEPOSIT_PAY] ?? [];
      const LeaveENC_Ids =
        idsMap[payheadMasterIdsMapping.LEAVE_ENCASHMENT] ?? [];
      const bonus_Ids = idsMap[payheadMasterIdsMapping.BONUS] ?? [];
      const bonusPay_Ids = idsMap[payheadMasterIdsMapping.BONUS_PAY] ?? [];
      const expensePayRefId =
        idsMap[payheadMasterIdsMapping.EXPENSE_REIMBURSEMENT] ?? [];

      // update data

      const updateArray = [];
      // Employee Incentives
      if (INC_Ids.length) {
        updateArray.push(
          Employeeincentive.update(
            {
              TableName: null,
              ReferenceId: null,
              ps_salaryTransId: null,
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
              ps_salaryTransId: null,
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
          LoanTransactions.update(
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

      // Deposit Pay
      if (depositPay_Ids.length) {
        updateArray.push(
          deposit.update(
            {
              payReferenceId: null,
            },
            {
              where: {
                payReferenceId: {
                  [Sequelize.Op.in]: depositPay_Ids,
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

      // update Bonus

      if (bonus_Ids.length) {
        updateArray.push(
          EmployeeBonus.destroy({
            where: {
              referenceId: {
                [Sequelize.Op.in]: bonus_Ids,
              },
            },
            hooks: false,
            // individualHooks: true,
            // user: req.userDetails,
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
              hooks: false,
              // // individualHooks: true,
              // user: req.userDetails,
              transaction: t,
            },
          ),
        );
      }

      // Update Expense Reimbursement

      if (expensePayRefId.length) {
        updateArray.push(
          expensePayment.update(
            {
              referenceId: null,
              paymentDate: null,
            },
            {
              where: {
                referenceId: {
                  [Sequelize.Op.in]: expensePayRefId,
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
        // Revert employee bonus entries that were settled in FNF
        await EmployeeBonus.update(
          {
            bonusPaymentFNFStatus: null,
            status: 1,
          },
          {
            where: {
              userMasterID: final_UserMasterID,
              bonusPaymentFNFStatus: {
                [Sequelize.Op.ne]: null,
              },
            },
            individualHooks: true,
            user: req.userDetails,
            transaction: t,
          },
        );

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

      const destroyArray = [
        HrSalaryTrans.destroy({
          where: {
            userMasterID: { [Sequelize.Op.in]: final_UserMasterID },
            salaryYYYYMM: yearmonth,
          },
          transaction: t,
        }),
        HRSalarySlip.destroy({
          where: {
            userMasterID: { [Sequelize.Op.in]: final_UserMasterID },
            salaryYYYYMM: yearmonth,
          },
          transaction: t,
        }),
      ];

      await Promise.all(destroyArray);

      // ----------------------- payroll statutory deletion------------------

      const payrollStatutoryTrans = await PayrollStatutorySlip.findOne({
        where: {
          userMasterID: { [Sequelize.Op.in]: final_UserMasterID },
          salaryYYYYMM: yearmonth,
        },
      });

      if (payrollStatutoryTrans) {
        await Promise.all([
          PayrollStatutoryAttnCal.destroy({
            where: {
              userMasterID: { [Sequelize.Op.in]: final_UserMasterID },
              AttnYearMon: yearmonth,
            },
            individualHooks: true,
            user: req.userDetails,
            transaction: t,
          }),
          PayrollStatutorySalaryTrans.destroy({
            where: {
              userMasterID: { [Sequelize.Op.in]: final_UserMasterID },
              salaryYYYYMM: yearmonth,
            },
            individualHooks: true,
            user: req.userDetails,
            transaction: t,
          }),
          PayrollStatutorySlip.destroy({
            where: {
              userMasterID: { [Sequelize.Op.in]: final_UserMasterID },
              salaryYYYYMM: yearmonth,
            },
            individualHooks: true,

            user: req.userDetails,
            transaction: t,
          }),
          PayrollStatutoryAdjustment.destroy({
            where: {
              userMasterID: { [Sequelize.Op.in]: final_UserMasterID },
              salaryYYYYMM: yearmonth,
            },
            individualHooks: true,
            user: req.userDetails,
            transaction: t,
          }),
        ]);
      }
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.salarydelte,
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserWiseSalarySlip = async (req, res, next) => {
  try {
    let slip;

    if (req.body.status) {
      if (req.body.status == '01') {
        slip = await HRSalarySlip.findOne({
          where: {
            userMasterID: req.body.userMasterID,
            salaryYYYYMM: req.body.yyyymm,
            // salarySlipIssue:1
          },
          include: [
            {
              model: UserMaster,
              attributes: ['displayName'],
            },
          ],
        });
      }
    } else {
      slip = await HRSalarySlip.findOne({
        where: {
          userMasterID: req.body.userMasterID,
          salaryYYYYMM: req.body.yyyymm,
          salarySlipIssue: 1,
        },
        include: [
          {
            model: UserMaster,
            attributes: ['displayName'],
          },
        ],
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Salary Slip Get Successfully.',
      data: slip,
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserWiseSalarySlipV2 = async (req, res, next) => {
  try {
    let slip;
    let { userMasterID, yyyymm } = req.body;

    if (req.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }

    if (req.body.status) {
      if (req.body.status == '01') {
        slip = await HRSalarySlip.findOne({
          where: {
            userMasterID: userMasterID,
            salaryYYYYMM: yyyymm,
          },
          include: [
            {
              model: UserMaster,
              attributes: ['displayName'],
            },
          ],
        });
      }
    } else {
      slip = await HRSalarySlip.findOne({
        where: {
          userMasterID: userMasterID,
          salaryYYYYMM: yyyymm,
          salarySlipIssue: 1,
        },
        include: [
          {
            model: UserMaster,
            attributes: ['displayName'],
          },
        ],
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Salary Slip Get Successfully.',
      data: slip,
    });
  } catch (err) {
    next(err);
  }
};

exports.issueSalarySlip = async (req, res, next) => {
  try {
    let { userMasterID, salaryYYYYMM, salarySlipIssue } = req.body;

    const createBy = req.userDetails?.userMasterId || null;
    const createByIp = req.userDetails?.userIpAddress || null;

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const user = await userMaster.findAll({
      where: {
        ...where,
        userMasterID,
      },
      include: [...includeModels],
      attributes: ['userMasterID'],
    });

    const userIds = user.map((e) => e.userMasterID);

    if (userIds.length > 0) {
      await HRSalarySlip.update(
        {
          salarySlipIssue: salarySlipIssue,
          updateBy: createBy,
          updateByIp: createByIp,
        },
        {
          where: {
            userMasterID: userIds,
            salaryYYYYMM: salaryYYYYMM,
            holdBy: null,
          },
        },
      );
    }

    return res.status(200).json({
      status: 200,
      message: 'SalarySlip Issue Successfully.',
    });
  } catch (error) {
    next(err.message);
  }
};

exports.getVariableDemoExcel = async (req, res, next) => {
  try {
    const { companyMasterID, payrollFrequency, fileName } = req.query;

    const date =
      new Date().getFullYear() +
      '-' +
      ('0' + (new Date().getMonth() + 1)).slice(-2) +
      '-' +
      ('0' + new Date().getDate()).slice(-2);

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const condition = {
      joiningDate: {
        [Sequelize.Op.lte]: date,
      },
      [Sequelize.Op.or]: [
        {
          leavingDate: { [Sequelize.Op.gte]: date },
        },
        {
          leavingDate: { [Sequelize.Op.eq]: null },
          [Sequelize.Op.or]: [
            {
              '$userMaster.deactiveDate$': { [Sequelize.Op.gte]: date },
            },
            {
              '$userMaster.deactiveDate$': { [Sequelize.Op.eq]: null },
            },
          ],
        },
      ],
      '$userMaster.companyMasterId$': companyMasterID,
      '$userMaster.status$': [0, 1],
    };

    if (payrollFrequency) condition.payrollFrequency = payrollFrequency;

    const users = await EmployeeJoiningDetails.findAndCountAll({
      raw: true,
      where: condition,
      include: [
        {
          model: UserMaster,
          required: true,
          where: { ...where },
          include: [...includeModels],
        },
      ],
      order: [[{ model: UserMaster }, 'displayName', 'ASC']],
    });

    let header = [];

    if (fileName == 'incentive') {
      const incentiveTypes = await Incentivetype.findAll({
        raw: true,
        where: Sequelize.and(
          Sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('incentivetypename')),
            ),
            {
              [Sequelize.Op.notIn]: nonEditableList_INC,
            },
          ),
          Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
          Sequelize.where(sequelize.col('status'), 1),
        ),
        attributes: ['incentivetypename'],
      });

      header = incentiveTypes.map((e) => e.incentivetypename);
    } else {
      const penaltyTypes = await Penalty.findAll({
        raw: true,
        where: {
          companyMasterID: companyMasterID,
          status: 1,
        },
        attributes: ['penaltyName'],
      });

      header = penaltyTypes.map((e) => e.penaltyName);
    }

    const final = await Promise.all(
      users.rows.map(async (e) => {
        const department = await employeeDepartment(e.userMasterID, date);
        const branch = await employeeBranch(e.userMasterID, date);

        return {
          'Employee Code': e.employeeCode,
          'Employee Name': e['userMaster.displayName'],
          'Mobile No.': e['userMaster.userNumber'],
          Branch: branch ? branch['branchMaster.branchName'] : '',
          Department: department ? department['department.departmentName'] : '',
        };
      }),
    );

    final.sort((a, b) => a['Employee Name'].localeCompare(b['Employee Name']));

    if (+final.length === 0) {
      return res.status(200).json({
        message: 'No data found to export!',
      });
    }
    await generateDemoExcelForVariable(
      header,
      final,
      `${fileName}`,
      'xlsx',
      res,
    );

    return;
  } catch (err) {
    next(err);
  }
};

exports.uploadVariablePayheadExcel = async (req, res, next) => {
  try {
    const { companyMasterID, month, fileName } = await req.body;

    const createBy = req.userDetails.userMasterId;
    const createByIP = req.userDetails.userIpAddress;

    const convertExcelDateToISO = (excelDate) => {
      return new Date(Math.round(excelDate - 25569) * 86400 * 1000)
        .toISOString()
        .slice(0, 10);
    };

    const formatDateStringToISO = (dateString) => {
      return new Date(dateString).toISOString().slice(0, 10);
    };

    const lastDateOfMonth =
      month.slice(0, 4) +
      '-' +
      month.slice(4, 6) +
      '-' +
      daysInMonth(month.slice(4, 6), month.slice(0, 4));

    const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    readXlsxFile(filePath).then(async (rows) => {
      const headerPart = rows[0].slice(6);

      const datarows = rows.slice(1);

      const finaldata = [];

      if (fileName == 'incentive') {
        const incentiveTypeArray = [];

        const withOutAttnBonusHeader = headerPart.filter(
          (e) => !nonEditableList_INC.includes(String(e).toLowerCase().trim()),
        );

        await sequelize
          .transaction(async (t) => {
            for (const header of withOutAttnBonusHeader) {
              const incentiveType = await Incentivetype.findOne({
                raw: true,
                attributes: [
                  'incentivetypename',
                  'companyMasterID',
                  'IncentivetypeID',
                ],
                where: Sequelize.and(
                  Sequelize.where(
                    sequelize.fn(
                      'TRIM',
                      sequelize.fn('LOWER', sequelize.col('incentivetypename')),
                    ),
                    header.trim().toLowerCase(),
                  ),
                  Sequelize.where(
                    sequelize.col('companyMasterID'),
                    companyMasterID,
                  ),
                  Sequelize.where(sequelize.col('status'), 1),
                ),
              });

              incentiveTypeArray.push(incentiveType);
            }

            for (const row of datarows) {
              const userMaster = await UserMaster.findOne({
                where: {
                  ...where,
                  userNumber: String(row[2]),
                  companyMasterId: companyMasterID,
                  status: 1,
                },
                include: [
                  ...includeModels,
                  {
                    model: EmployeeJoiningDetails,
                    attributes: ['payrollFrequency'],
                  },
                ],
              });

              if (userMaster) {
                for (const [index, value] of incentiveTypeArray.entries()) {
                  if (
                    row[6 + index] != null &&
                    row[6 + index] > 0 &&
                    typeof row[6 + index] === 'number'
                  ) {
                    if (!row[5])
                      return res.status(200).send({
                        status: 402,
                        message: `Incentive Date is required of: ${row[2]}`,
                      });

                    let date = '';

                    if (typeof row[5] === 'number') {
                      date = convertExcelDateToISO(row[5]);
                    } else if (isValidDate(row[5])) {
                      date = formatDateStringToISO(row[5]);
                    } else {
                      return res.status(200).send({
                        status: 402,
                        message: `Incentive Date Should be in 'yyyy-mm-dd' Format of: ${row[2]}`,
                      });
                    }

                    const payrollFrequency =
                      userMaster.employeeJoiningDetails?.[0]
                        ?.payrollFrequency || PayrollFrequencyType.MONTHLY;

                    const condition = {
                      userMasterID: userMaster.userMasterID,
                      payrollFrequency,
                    };

                    if (ProjectName == projectNamesList.PIH) {
                      condition.startDate = {
                        [Sequelize.Op.lte]: date,
                      };

                      condition.endDate = {
                        [Sequelize.Op.gte]: date,
                      };
                    } else {
                      condition.salaryYYYYMM = month;
                    }

                    const salary = await HRSalaryTrasaction.findOne({
                      where: condition,
                    });

                    if (salary) {
                      return res.status(200).json({
                        status: 401,
                        message:
                          'Salary already calculated for ' +
                          `'${userMaster.userNumber}'`,
                      });
                    }

                    if (date.slice(0, 4) + date.slice(5, 7) != month)
                      return res.status(200).send({
                        status: 402,
                        message: `Incentive Date is not range of this month of: ${row[2]}`,
                      });

                    const incentiveData = await Employeeincentive.findOne({
                      raw: true,
                      where: {
                        userMasterID: userMaster.userMasterID,
                        yearmonth: +month,
                        IncentivetypeID: +value.IncentivetypeID,
                        incentiveDate: date,
                        status: 1,
                      },
                    });

                    if (incentiveData) {
                      await Employeeincentive.update(
                        {
                          amount: +row[6 + index],
                          updateBy: +createBy,
                          updateByIp: createByIP,
                        },
                        {
                          where: {
                            employeeincentiveID:
                              incentiveData.employeeincentiveID,
                          },
                          transaction: t,
                        },
                      );
                    } else {
                      finaldata.push({
                        userMasterID: userMaster.userMasterID,
                        yearmonth: +month,
                        amount: +row[6 + index],
                        IncentivetypeID: +value.IncentivetypeID,
                        incentiveDate: date,
                        status: 1,
                        createBy: +createBy,
                        createByIp: createByIP,
                      });
                    }
                  }
                }
              }
            }

            await Employeeincentive.bulkCreate(finaldata, { transaction: t });

            fs.unlink(filePath, function (err) {});

            return res.status(200).send({
              status: 200,
              message:
                ' The File Upload Successfully: ' + req.file.originalname,
            });
          })
          .catch((err) => {
            res.status(200).send({
              status: 401,
              message: 'Fail to import data into database!' + err.message,
              error: err.message,
            });
          });
      }

      if (fileName == 'penalty') {
        const penaltyTypeArray = [];

        await sequelize
          .transaction(async (t) => {
            for (const header of headerPart) {
              const penaltytype = await Penalty.findOne({
                raw: true,
                attributes: ['penaltyID', 'penaltyName'],
                where: Sequelize.and(
                  Sequelize.where(
                    sequelize.fn(
                      'TRIM',
                      sequelize.fn('LOWER', sequelize.col('penaltyName')),
                    ),
                    header.trim().toLowerCase(),
                  ),
                  Sequelize.where(
                    sequelize.col('companyMasterID'),
                    companyMasterID,
                  ),
                  Sequelize.where(sequelize.col('status'), 1),
                ),
              });

              penaltyTypeArray.push(penaltytype);
            }

            for (const row of datarows) {
              const userMaster = await UserMaster.findOne({
                where: {
                  userNumber: String(row[2]),
                  companyMasterId: companyMasterID,
                  status: 1,
                },
                include: [
                  {
                    model: EmployeeJoiningDetails,
                    attributes: ['payrollFrequency'],
                  },
                ],
              });

              if (userMaster) {
                for (const [index, value] of penaltyTypeArray.entries()) {
                  if (
                    row[6 + index] != null &&
                    row[6 + index] > 0 &&
                    typeof row[6 + index] === 'number'
                  ) {
                    if (!row[5])
                      return res.status(200).send({
                        status: 402,
                        message: `Penalty Date is required of: ${row[2]}`,
                      });

                    let date = '';

                    if (typeof row[5] === 'number') {
                      date = convertExcelDateToISO(row[5]);
                    } else if (isValidDate(row[5])) {
                      date = formatDateStringToISO(row[5]);
                    } else {
                      return res.status(200).send({
                        status: 402,
                        message: `Penalty Date Should be in 'yyyy-mm-dd' Format of: ${row[2]}`,
                      });
                    }

                    const payrollFrequency =
                      userMaster.employeeJoiningDetails?.[0]
                        ?.payrollFrequency || PayrollFrequencyType.MONTHLY;

                    const condition = {
                      userMasterID: userMaster.userMasterID,
                      payrollFrequency,
                    };

                    if (ProjectName == projectNamesList.PIH) {
                      condition.startDate = {
                        [Sequelize.Op.lte]: date,
                      };

                      condition.endDate = {
                        [Sequelize.Op.gte]: date,
                      };
                    } else {
                      condition.salaryYYYYMM = month;
                    }

                    const salary = await HRSalaryTrasaction.findOne({
                      where: condition,
                    });

                    if (salary) {
                      return res.status(200).json({
                        status: 401,
                        message:
                          'Salary already calculated for ' +
                          `'${userMaster.userNumber}'`,
                      });
                    }

                    if (date.slice(0, 4) + '' + date.slice(5, 7) != month)
                      return res.status(200).send({
                        status: 402,
                        message: `Penalty Date is not range of this month of: ${row[2]}`,
                      });

                    const penaltyData = await EmployeePenalty.findOne({
                      raw: true,
                      where: {
                        userMasterID: userMaster.userMasterID,
                        penaltyID: +value.penaltyID,
                        penaltyDate: date,
                        status: 1,
                      },
                    });

                    if (penaltyData) {
                      await EmployeePenalty.update(
                        {
                          penaltyAmount: +row[6 + index],
                          updateBy: +createBy,
                          updateByIp: createByIP,
                        },
                        {
                          where: {
                            employeePenaltyID: penaltyData.employeePenaltyID,
                          },
                          transaction: t,
                        },
                      );
                    } else {
                      finaldata.push({
                        userMasterID: userMaster.userMasterID,
                        penaltyID: +value.penaltyID,
                        penaltyDate: date ? date : lastDateOfMonth,
                        penaltyAmount: +row[6 + index],
                        description: '',
                        status: 1,
                        createBy: +createBy,
                        createByIp: createByIP,
                      });
                    }
                  }
                }
              }
            }

            await EmployeePenalty.bulkCreate(finaldata, { transaction: t });

            fs.unlink(filePath, function (err) {});

            return res.status(200).send({
              status: 200,
              message:
                ' The File Upload Successfully: ' + req.file.originalname,
            });
          })
          .catch((err) => {
            res.status(200).send({
              status: 401,
              message: 'Fail to import data into database!' + err.message,
              error: err.message,
            });
          });
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.sendSalarySlipviamail = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchMasterID,
      userMasterID,
      month,
      page,
      limit,
    } = req.body;
    if (!companyMasterID || !month) {
      return res.status(200).json({
        status: 401,
        message: 'Company and Month are require fields!',
      });
    }
    const fromMail = await findCompanyNotificationPolicy(+companyMasterID);

    if (!fromMail)
      return res.status(200).json({
        status: 401,
        message: 'Notification Policy does not exist!',
      });

    const startDate =
      month.toString().slice(0, 4) +
      '-' +
      month.toString().slice(4, 6) +
      '-' +
      '01';
    const endDate =
      month.toString().slice(0, 4) +
      '-' +
      month.toString().slice(4, 6) +
      '-' +
      daysInMonth(month.slice(4, 6), month.slice(0, 4));

    let userdata = [];
    let userids = [];

    if (companyMasterID && !branchMasterID) {
      let startdate = startDate,
        enddate = endDate;
      const paginateCondition = {};
      // if (page && limit && Export != 'true') {
      //   paginateCondition.offset = (page - 1) * limit;
      //   paginateCondition.limit = limit;
      // }

      const userdata1 = await EmployeeJoiningDetails.findAndCountAll({
        raw: true,
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
          '$userMaster.companyMasterId$': companyMasterID,
          '$userMaster.status$': [0, 1],
        },
        ...paginateCondition,
        include: [
          {
            model: UserMaster,
            required: true,
          },
        ],
        order: [[{ model: UserMaster }, 'displayName', 'ASC']],
      });
      // const userdata1 = await getUserByCompanyandDateRange(
      //   companyMasterID,
      //   '',
      //   '',
      //   startDate,
      //   endDate
      // );

      userdata = userdata1.rows;
    }

    if (branchMasterID) {
      let startdate = startDate,
        enddate = endDate;
      const get_branch_users = await EmployeeBranch.findAndCountAll({
        raw: true,
        where: {
          branchID: branchMasterID,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(enddate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(startdate),
              },
            },
            {
              endDate: null,
            },
          ],
          status: 1,
        },
      });
      let allActiveUsersID = [];
      for (let userID of get_branch_users.rows) {
        allActiveUsersID.push(userID.userMasterID);
      }
      const paginateCondition = {};
      if (page && limit) {
        paginateCondition.offset = (page - 1) * limit;
        paginateCondition.limit = limit;
      }

      const userdata1 = await EmployeeJoiningDetails.findAndCountAll({
        raw: true,
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
          userMasterID: allActiveUsersID,
          '$userMaster.status$': [0, 1],
        },
        ...paginateCondition,
        include: [
          {
            model: UserMaster,
            required: true,
            ...accessibleUsers(req.userDetails),
          },
        ],
        order: [[{ model: UserMaster }, 'displayName', 'ASC']],
      });

      userdata1.rows.forEach((row) => {
        const branchData = get_branch_users.rows.find(
          (user) => user.userMasterID === row.userMasterID,
        );
        if (branchData) {
          row.branchStartDate = branchData.applicableDate;
          row.branchEndDate = branchData.endDate;
        }
      });
      // const userdata1 = await getUserByBranchandDateRange(
      //   branchMasterID,
      //   '',
      //   '',
      //   startDate,
      //   endDate
      // );

      userdata = userdata1.rows;
    }

    userdata.map((e) => {
      userids.push(e.userMasterID);
    });

    if (userMasterID) userids = userMasterID;

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const AllsalarySlips = await HRSalarySlip.findAll({
      raw: true,
      where: {
        salaryYYYYMM: month,
        userMasterID: userids,
        '$userMaster.email$': {
          [Sequelize.Op.not]: null,
        },
      },
      include: [
        {
          required: true,
          model: UserMaster,
          where: { ...where },
          attributes: [],
          include: [...includeModels],
        },
      ],
      attributes: [
        [Sequelize.col('userMaster.userMasterID'), 'userMasterID'],
        'path',
        [Sequelize.col('userMaster.email'), 'email'],
        [Sequelize.col('userMaster.displayName'), 'displayName'],
        'isS3Upload',
      ],
    });

    await EmailSalarySlip(AllsalarySlips, fromMail, month);

    return res.status(200).json({
      status: 200,
      message: 'Mail Sent Successfully.',
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllSalarySlip = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      selectedBranch,
      selectedDepartment,
      selectedDesignation,
      userMasterID = [],
      yearMonth,
      status = 1,
    } = req.body;
    if (!companyMasterID || !yearMonth)
      return res.status(200).json({
        status: 401,
        message: 'Company and Year Month are required fields.',
      });

    const [year, month] = yearMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-${daysInMonth(month, year)}`;

    const allIncludes = [];
    const condition = {};

    if (userMasterID && userMasterID.length > 0) {
      condition.userMasterID = {
        [Sequelize.Op.in]: userMasterID,
      };
    } else {
      if (selectedBranch && selectedBranch.length > 0) {
        allIncludes.push({
          model: EmployeeBranch,
          required: true,
          where: {
            status: 1,
            branchID: selectedBranch,
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
                endDate: null,
              },
            ],
          },
          attributes: [],
        });
      }
      if (selectedDepartment && selectedDepartment.length > 0) {
        allIncludes.push({
          model: EmployeeDepartment,
          required: true,
          where: {
            status: 1,
            departmentID: selectedDepartment,
            applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(startDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: [],
        });
      }
      if (selectedDesignation && selectedDesignation.length > 0) {
        allIncludes.push({
          model: EmployeeDesignation,
          required: true,
          where: {
            status: 1,
            designationID: selectedDesignation,
            applicableDate: { [Sequelize.Op.lte]: new Date(endDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(startDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          attributes: [],
        });
      }
    }

    const userCondition = {
      companyMasterId: companyMasterID,
      [Sequelize.Op.or]: [
        {
          deactiveDate: {
            [Sequelize.Op.gte]: new Date(startDate),
          },
        },
        { deactiveDate: { [Sequelize.Op.eq]: null } },
      ],
    };

    userCondition.status = status || '1';

    condition.salaryYYYYMM = +yearMonth.split('-').join('');
    condition.path = { [Sequelize.Op.ne]: null };

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const salarySlipData = await HRSalarySlip.findAll({
      raw: true,
      where: condition,
      include: [
        {
          model: userMaster,
          where: { ...where, ...userCondition },
          required: true,
          attributes: [],
          include: [
            ...includeModels,
            {
              model: EmployeeJoiningDetails,
              where: {
                joiningDate: {
                  [Sequelize.Op.lte]: new Date(endDate),
                },
                [Sequelize.Op.or]: [
                  {
                    leavingDate: { [Sequelize.Op.gte]: new Date(startDate) },
                  },
                  {
                    leavingDate: { [Sequelize.Op.eq]: null },
                  },
                ],
              },
              attributes: [],
            },
            ...allIncludes,
          ],
        },
      ],
      order: [[{ model: userMaster }, 'displayName', 'ASC']],
      attributes: [
        'path',
        [sequelize.col('userMaster.displayName'), 'displayName'],
        'isS3Upload',
      ],
    });

    if (salarySlipData.length === 0)
      return res.status(200).json({
        status: 401,
        message: 'No data found to download!',
      });

    return await createZipFileForsalarySlip(
      salarySlipData,
      yearMonth,
      `salarySlip-${yearMonth}`,
      res,
    );
  } catch (error) {
    next(error);
  }
};

exports.ctcmasterreportNew = async (req, res, next) => {
  const _ = require('lodash');
  try {
    const {
      userMasterID,
      companyMasterID,
      yearmonth,
      limit,
      page,
      exportData,
      exportPdf,
      sortField,
    } = req.body;

    const user = userMasterID,
      companyID = companyMasterID;
    let offset = (page - 1) * limit;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const notIncludeIds = [
      9, 16, 17, 24, 34, 43, 78, 83, 96, 97, 99, 67, 101, 102, 103, 104, 107,
      112, 135, 123, 125, 126, 127, 133, 130, 122, 147, 116, 148, 151, 152,
    ];

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

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
      ];
    } else {
      // Employee Name sorting
      order = [[Sequelize.col('userMaster.displayName'), 'ASC']];
    }

    const MainData = [];
    const allEmployeejoining = await EmployeeJoiningDetails.findAll({
      where: {
        userMasterID: userMasterID,
      },
      order,
      include: [
        {
          required: true,
          model: UserMaster,
          where: { ...where },
          attributes: ['displayName', 'userNumber', 'userMasterID'],
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

    // const HrSalaryFieldData = await HRSalaryFields.findAll({
    //   raw: true,
    //   where: {
    //     companyMasterID: companyID,
    //     status: 1,
    //     payheadMasterId: {
    //       [Sequelize.Op.notIn]: [1, 50],
    //     },
    //     salaryFieldSrNo: {
    //       [Sequelize.Op.notIn]: ['D'],
    //     },
    //   },
    //   order: [["salaryFieldID", "ASC"]],
    // })

    for (const user of allEmployeejoining) {
      let joingdate =
        user.joiningDate.toString().slice(0, 4) +
        user.joiningDate.toString().slice(5, 7);
      if (joingdate <= yearmonth) {
        const resultsSalary = await HRSalaryMaster.findOne({
          raw: true,
          where: {
            userMasterID: user.userMasterID,
            salaryFromYYYYMM: { [Sequelize.Op.lte]: yearmonth },
          },
          attributes: [
            [
              Sequelize.fn('MAX', Sequelize.col('salaryFromYYYYMM')),
              'maxSalaryFromYYYYMM',
            ],
          ],
        });

        const YYYYMM = resultsSalary.maxSalaryFromYYYYMM;

        let AllField = {};
        AllField['EmployeeCode'] = user.employeeCode;
        AllField['Employee Joining Date'] = moment(
          user.joiningDate,
          'YYYY-MM-DD',
        ).format('DD-MM-YYYY');

        AllField['Date Of Birth'] = user.dob
          ? moment(user.dob, 'YYYY-MM-DD').format('DD-MM-YYYY')
          : '';

        const userData = user.userMaster;
        AllField['Name'] = userData.displayName;
        AllField['Mobile No'] = userData.userNumber;

        AllField['Branch'] =
          (userData.employeeBranches && userData.employeeBranches.length) > 0
            ? userData.employeeBranches[0].branchMaster
              ? userData.employeeBranches[0].branchMaster.branchName
              : ''
            : '';
        AllField['Department'] =
          (userData.employeeDepartments &&
            userData.employeeDepartments.length) > 0
            ? userData.employeeDepartments[0].department
              ? userData.employeeDepartments[0].department.departmentName
              : ''
            : '';
        AllField['Designation'] =
          (userData.employeeDesignations &&
            userData.employeeDesignations.length) > 0
            ? userData.employeeDesignations[0].designation
              ? userData.employeeDesignations[0].designation.designationName
              : ''
            : '';
        AllField['Division'] =
          userData?.employeeDivisions?.[0]?.division.divisionName || '';

        AllField['Working Area'] =
          userData?.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName ||
          '';
        const results = await executeQuery(
          `
      SELECT A.*, COALESCE(B.actualamount, 0) as amount ,COALESCE(B.a_amount, 0) as actualamount FROM (
        SELECT PHM."payheadName",HSF."payheadDisplayName", HSF."payheadMasterId", HSF."salaryFieldSrNo",
          HSF."salaryFieldSide", HSF."salaryFieldShow", HSF."assignSalaryRound", HSF."assignSalaryRoundNo", HSF."assignSalaryRoundOffType"
        FROM "hrSalaryFields" as HSF
        INNER JOIN "Payheadmasters" as PHM ON HSF."payheadMasterId" = PHM."payheadMasterId"
        WHERE HSF."companyMasterID"=` +
            ':companyID' +
            ` AND HSF.status=1
          AND HSF."salaryFieldSrNo" NOT IN ('D') AND HSF."payheadMasterId" NOT IN (:notIncludeIds)
        ORDER BY HSF."salaryFieldID" ASC
      ) as A
      LEFT OUTER JOIN (
        SELECT HSF."payheadMasterId" as payheadid, HSM."EmployeeSalaryAmount" as actualamount, HSM."ActualEmployeeSalaryAmount" as a_amount
        FROM "hrSalaryMasters" as HSM
        INNER JOIN "gradeSalaryStructures" as GSS ON HSM."gradeSalaryStructureID" = GSS."gradeSalaryStructureID"
        LEFT OUTER JOIN "gradeStructures" as GS ON GSS."gradeStructureID" = GS."gradeStructureID"
        INNER JOIN "hrSalaryFields" as HSF ON GSS."salaryFieldID" = HSF."salaryFieldID"
        INNER JOIN "Payheadmasters" as PHM ON HSF."payheadMasterId" = PHM."payheadMasterId"
        WHERE HSM."userMasterID"= :userMasterID AND HSM."salaryFromYYYYMM"= :YYYYMM ORDER BY HSF."salaryFieldID" ASC 
      ) as B ON A."payheadMasterId" = B.payheadid`,
          {
            replacements: {
              companyID: companyID,
              notIncludeIds: notIncludeIds,
              userMasterID: user.userMasterID,
              YYYYMM: YYYYMM,
            },
          },
        );

        let A_Income = [];
        let B_Deduction = [];
        let C_Deduction = [];
        let grossData = null,
          netPayData = null,
          ctcData = null;

        const resultData = !showEmployerLWF
          ? results.filter((e) => e.payheadMasterId != 59)
          : results;

        resultData.forEach((Obj) => {
          if (![1, 50, 92].includes(Obj.payheadMasterId)) {
            let amount = Obj.amount;

            if (Obj.payheadMasterId == 66 && showActualEDLI)
              amount = getRoundOffSalary(
                +Obj.actualamount,
                Obj.assignSalaryRound,
                Obj.assignSalaryRoundOffType,
                Obj.assignSalaryRoundNo,
              );

            Obj.amount = amount;

            if (Obj.salaryFieldSrNo == 'A') {
              A_Income.push(Obj);
            }
            if (Obj.salaryFieldSrNo == 'B') {
              B_Deduction.push(Obj);
            }
            if (Obj.salaryFieldSrNo == 'C') {
              C_Deduction.push(Obj);
            }
          }

          if (Obj.payheadMasterId == 1) ctcData = Obj;
          if (Obj.payheadMasterId == 50) grossData = Obj;
          if (Obj.payheadMasterId == 92) netPayData = Obj;
        });

        let Gross_Deduction = B_Deduction.reduce(
          (acc, obj) => acc + +obj.amount,
          0,
        );

        A_Income.forEach((Obj) => {
          AllField[
            Obj.payheadDisplayName && Obj.payheadDisplayName.trim()
              ? Obj.payheadDisplayName
              : Obj.payheadName
          ] = Obj.amount;
        });

        AllField[
          grossData?.payheadDisplayName && grossData?.payheadDisplayName.trim()
            ? grossData?.payheadDisplayName
            : grossData?.payheadName
        ] = grossData?.amount;

        B_Deduction.forEach((Obj) => {
          AllField[
            Obj.payheadDisplayName && Obj.payheadDisplayName.trim()
              ? Obj.payheadDisplayName
              : Obj.payheadName
          ] = Obj.amount;
        });

        AllField['Gross_Deduction'] = Gross_Deduction;
        AllField[
          netPayData?.payheadDisplayName &&
          netPayData?.payheadDisplayName.trim()
            ? netPayData?.payheadDisplayName
            : netPayData?.payheadName
        ] = netPayData?.amount;

        C_Deduction.forEach((Obj) => {
          AllField[
            Obj.payheadDisplayName && Obj.payheadDisplayName.trim()
              ? Obj.payheadDisplayName
              : Obj.payheadName
          ] = Obj.amount;
        });

        AllField[
          ctcData?.payheadDisplayName && ctcData?.payheadDisplayName.trim()
            ? ctcData?.payheadDisplayName
            : ctcData?.payheadName
        ] = ctcData?.amount;

        MainData.push(AllField);
      }
    }

    if (exportData) {
      await generateExcel(MainData, 'CTC Master Report', 'xlsx', res);
      return;
    }

    if (exportPdf) {
      const companyDetails = await companyMaster.findOne({
        where: { companyMasterID: companyID },
        raw: true,
      });

      const { companyName, companyAddress, companyLogo } = companyDetails;

      const headers = Object.keys(MainData[0]);

      const pdfData = {
        datalength: headers.length,
        companyName,
        companyAddress,
        companyLogo,
        headers,
        MainData,
        ApiURL: mainApiUrl,
      };

      const getTemplate1 = (type) => {
        const file = path.join(__dirname, `../html/${type}.html`);
        return file;
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

      const filePath = await getTemplate1('ctcMasterReport');

      const file = await readFile(filePath);
      const template = Handlebars.compile(file);
      const html = template(pdfData);

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
        landscape: true,
        timeout: 120000,
      });
      await browser.close();

      let base64path = Buffer.from(pdfBuffer).toString('base64');

      return res.status(200).json({
        status: 200,
        data: base64path,
      });
    }

    return res.status(200).json({
      status: 200,
      data: MainData,
      totalcount: MainData.length,
    });
  } catch (err) {
    next(err.message);
  }
};

exports.paidSalary = async (req, res, next) => {
  try {
    const {
      userMasterID = [],
      salaryYYYYMM,
      paidDate,
      paymentMode,
      referenceNo,
      referenceDate,
      remarks,
    } = req.body;

    // Validate payment mode first
    if (!Object.values(paymentMode_PaidSalary).includes(paymentMode)) {
      return res.status(statusCodes.OK).json({
        status: 401,
        message: 'Please Enter Valid Payment Mode',
      });
    }

    //  Common validations
    const isInvalidUser =
      !Array.isArray(userMasterID) || userMasterID.length === 0;

    const isMissingBasicFields = !salaryYYYYMM || !paidDate || !paymentMode;

    //  Reference required only for non-cash modes
    const isReferenceRequired = ![
      paymentMode_PaidSalary.CASH,
      paymentMode_PaidSalary.CASHBOOK,
    ].includes(paymentMode);

    const isMissingReference =
      isReferenceRequired && (!referenceNo || !referenceDate);

    //  Final validation
    if (isInvalidUser || isMissingBasicFields || isMissingReference) {
      return res.status(statusCodes.OK).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const salarySlipData = await HRSalarySlip.findAll({
      where: {
        ...where,
        userMasterID,
        salaryYYYYMM,
        paid: false,
        holdBy: null,
      },
      include: [
        {
          model: UserMaster,
          attributes: ['userMasterID'],
          include: [...includeModels],
        },
      ],
    });

    await HRSalarySlip.update(
      {
        paid: true,
        paidDate,
        paymentMode,
        referenceNo,
        referenceDate,
        remarks,
        updateBy: req.userDetails.userMasterId,
        updateByIp: req.userDetails.userIpAddress,
      },
      {
        where: {
          hrSalarySlipID: {
            [Sequelize.Op.in]: salarySlipData.map((e) => e.hrSalarySlipID),
          },
        },
      },
    );

    return res.status(200).json({
      status: 200,
      message: 'Salary paid successfully.',
    });
  } catch (error) {
    next(error);
  }
};

exports.add_CTC_Gross_Net_In_CompanyandGrade = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const All_company = await companyMaster.findAll({
      where: {
        status: [0, 1],
      },
      attributes: ['companyMasterID', 'createBy'],
    });

    const All_hrsalaryFields = await HRSalaryFields.findAll({
      where: {
        companyMasterID: {
          [Sequelize.Op.in]: All_company.map((e) => e.companyMasterID),
        },
        payheadMasterId: {
          [Sequelize.Op.in]: [1, 50, 92],
        },
        status: 1,
      },
      attributes: ['salaryFieldID', 'payheadMasterId', 'companyMasterID'],
    });

    const All_GradeData = await GradeStructure.findAll({
      where: {
        companyMasterID: {
          [Sequelize.Op.in]: All_company.map((e) => e.companyMasterID),
        },
      },
      include: [{ model: GradeSalaryStructure }],
    });

    const gradeStructureData_TO_Add = [];
    for (const company of All_company) {
      const salaryfieldsToAdd = [];

      const companyId = company.companyMasterID;

      const hrsalayfields = All_hrsalaryFields.filter(
        (e) => e.companyMasterID == companyId,
      );

      let gross_field = hrsalayfields.find((e) => e.payheadMasterId == 50);
      let net_field = hrsalayfields.find((e) => e.payheadMasterId == 92);
      let ctc_field = hrsalayfields.find((e) => e.payheadMasterId == 1);

      // for Gross
      if (!gross_field) {
        salaryfieldsToAdd.push({
          salaryFieldActive: 'Y',
          payheadMasterId: 50, // gross
          salaryFieldSide: 'E',
          salaryFieldAttanChk: 1,
          salaryFieldRound: 'Y',
          salaryFieldSrNo: 'A',
          salaryFieldShow: 'Y',
          salaryFieldWhenMonth: [0],
          companyMasterID: companyId,
          createBy: company.createBy,
        });
      }

      // for net Pay
      if (!net_field) {
        salaryfieldsToAdd.push({
          salaryFieldActive: 'Y',
          payheadMasterId: 92, // net pay
          salaryFieldSide: 'E',
          salaryFieldAttanChk: 1,
          salaryFieldRound: 'Y',
          salaryFieldSrNo: 'A',
          salaryFieldShow: 'Y',
          salaryFieldWhenMonth: [0],
          companyMasterID: companyId,
          createBy: company.createBy,
        });
      }

      // for CTC
      if (!ctc_field) {
        salaryfieldsToAdd.push({
          salaryFieldActive: 'Y',
          payheadMasterId: 1, // net pay
          salaryFieldSide: 'E',
          salaryFieldAttanChk: 1,
          salaryFieldRound: 'Y',
          salaryFieldSrNo: 'A',
          salaryFieldShow: 'Y',
          salaryFieldWhenMonth: [0],
          companyMasterID: companyId,
          createBy: company.createBy,
        });
      }

      const addedData = await HRSalaryFields.bulkCreate(salaryfieldsToAdd, {
        returning: true,
        transaction,
      });

      if (!gross_field)
        gross_field = addedData.find((e) => e.payheadMasterId == 50);
      if (!net_field)
        net_field = addedData.find((e) => e.payheadMasterId == 92);
      if (!ctc_field) ctc_field = addedData.find((e) => e.payheadMasterId == 1);

      if (gross_field && net_field && ctc_field) {
        const gradeData = All_GradeData.filter(
          (e) => e.companyMasterID == companyId,
        );

        for (const grade of gradeData) {
          const salaryStructure = grade.gradeSalaryStructures || [];
          const gradeStructureID = grade.gradeStructureID;

          if (salaryStructure && salaryStructure.length) {
            // find gross

            if (
              ![...salaryStructure].find(
                (e) => e.salaryFieldID == gross_field.salaryFieldID,
              )
            ) {
              gradeStructureData_TO_Add.push({
                gradeStructureID: gradeStructureID,
                salaryFieldID: gross_field.salaryFieldID,
                fieldDefaultPer: null,
                fieldFixAmount: null,
                formula: null,
                formulaID: null,
                createBy: salaryStructure[0].createBy,
                salaryfieldindex: null,
                salaryfieldmaxrange: null,
              });
            }

            // find net Pay

            if (
              ![...salaryStructure].find(
                (e) => e.salaryFieldID == net_field.salaryFieldID,
              )
            ) {
              gradeStructureData_TO_Add.push({
                gradeStructureID: gradeStructureID,
                salaryFieldID: net_field.salaryFieldID,
                fieldDefaultPer: null,
                fieldFixAmount: null,
                formula: null,
                formulaID: null,
                createBy: salaryStructure[0].createBy,
                salaryfieldindex: null,
                salaryfieldmaxrange: null,
              });
            }

            // find gross

            if (
              ![...salaryStructure].find(
                (e) => e.salaryFieldID == ctc_field.salaryFieldID,
              )
            ) {
              gradeStructureData_TO_Add.push({
                gradeStructureID: gradeStructureID,
                salaryFieldID: ctc_field.salaryFieldID,
                fieldDefaultPer: null,
                fieldFixAmount: null,
                formula: null,
                formulaID: null,
                createBy: salaryStructure[0].createBy,
                salaryfieldindex: null,
                salaryfieldmaxrange: null,
              });
            }
          }
        }
      }
    }

    await GradeSalaryStructure.bulkCreate(gradeStructureData_TO_Add, {
      transaction,
    });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: 'Data added successfully!',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.add_CTC_Gross_Net_In_structure = async (req, res, next) => {
  try {
    const { chunkSize } = req.body;

    if (!chunkSize) throw new Error('chunkSize is required!');

    const All_GradeData = await GradeStructure.findAll({
      where: {
        status: [0, 1],
      },
      include: [
        {
          model: GradeSalaryStructure,
          include: [
            {
              model: HRSalaryFields,
              attributes: [
                'payheadMasterId',
                'salaryFieldRound',
                'salaryFieldRoundNo',
              ],
            },
          ],
        },
      ],
    });

    const All_salaryMasterData = await HRSalaryMaster.findAll({
      include: [
        {
          required: true,
          model: GradeSalaryStructure,
          include: [
            {
              required: true,
              model: HRSalaryFields,
              where: {
                payheadMasterId: { [Sequelize.Op.in]: [1, 50, 92, 15] },
              },
              attributes: ['payheadMasterId'],
            },
          ],
        },
      ],
    });

    const Add_final_Structure = [];
    const updateQuery = [];

    for (const grade of All_GradeData) {
      const salarystructure = grade.gradeSalaryStructures || [];

      // gross data
      const gross_fields = salarystructure.find(
        (e) => e.hrSalaryField.payheadMasterId == 50,
      );
      // net pay
      const net_fields = salarystructure.find(
        (e) => e.hrSalaryField.payheadMasterId == 92,
      );
      // CTC
      const ctc_fields = salarystructure.find(
        (e) => e.hrSalaryField.payheadMasterId == 1,
      );

      const all_Ids = [...salarystructure].map(
        (s) => +s.gradeSalaryStructureID,
      );

      const salaryMasterData = All_salaryMasterData.filter((e) =>
        all_Ids.includes(+e.gradeSalaryStructureID),
      );

      // group data month and userwise
      const groupedData = [
        ...new Map(
          salaryMasterData.map((item) => [
            `${item.salaryFromYYYYMM}-${item.userMasterID}`,
            {
              salaryFromYYYYMM: item.salaryFromYYYYMM,
              userMasterID: item.userMasterID,
            },
          ]),
        ).values(),
      ];

      for (const data of groupedData) {
        // const masterDataToAdd = [];

        const userMasterID = data.userMasterID;
        const yearMonth = data.salaryFromYYYYMM;

        // get all data of user month wise

        const userSalaryMasterData = await getUserSalaryMasterByMonth(
          userMasterID,
          yearMonth,
        );

        if (!userSalaryMasterData.length) continue;

        // caluclate amount of CTC GROSS AND NET SALARY

        // const grossAmount = userSalaryMasterData
        //   .filter(
        //     (e) =>
        //       ![1, 50, 92].includes(e.payheadMasterId) &&
        //       e.salaryFieldSrNo == 'A' &&
        //       e.considerIn != payheadConsiderInEnum.NETSALARY
        //   )
        //   .reduce((acc, obj) => acc + +obj.EmployeeSalaryAmount, 0);
        // const extraAmount = userSalaryMasterData
        //   .filter(
        //     (e) =>
        //       ![1, 50, 92].includes(e.payheadMasterId) &&
        //       e.salaryFieldSrNo == 'A' &&
        //       e.considerIn == 'net'
        //   )
        //   .reduce((acc, obj) => acc + +obj.EmployeeSalaryAmount, 0);
        // const deductionAmount = userSalaryMasterData
        //   .filter(
        //     (e) =>
        //       ![1, 50, 92].includes(e.payheadMasterId) &&
        //       e.salaryFieldSrNo == 'B'
        //   )
        //   .reduce((acc, obj) => acc + +obj.EmployeeSalaryAmount, 0);

        // const ctcAmount = userSalaryMasterData
        //   .filter(
        //     (e) =>
        //       ![1, 50, 92].includes(e.payheadMasterId) &&
        //       ['A', 'C'].includes(e.salaryFieldSrNo)
        //   )
        //   .reduce((acc, obj) => acc + +obj.EmployeeSalaryAmount, 0);

        // const netAmount = +grossAmount - +deductionAmount + +extraAmount;

        // FIND data of CTC GROSS AND NET SALARY from master

        let gross_master = userSalaryMasterData.find(
          (e) => e.payheadMasterId == 50,
        );
        let net_master = userSalaryMasterData.find(
          (e) => e.payheadMasterId == 92,
        );
        let ctc_master = userSalaryMasterData.find(
          (e) => e.payheadMasterId == 1,
        );

        const stateId =
          userSalaryMasterData.find((e) => e.stateid)?.stateid || null;

        if (gross_fields) {
          if (gross_master) {
            updateQuery.push(() =>
              HRSalaryMaster.update(
                { stateid: stateId },
                { where: { salaryMasterID: gross_master.salaryMasterID } },
              ),
            );
          } else {
            // Add_final_Structure.push({
            //           userMasterID,
            //           gradeSalaryStructureID: gross_fields.gradeSalaryStructureID,
            //           EmployeeSalaryAmount:
            //             gross_fields.hrSalaryField.salaryFieldRound == 'N'
            //               ? (+grossAmount).toFixed(
            //                   +gross_fields.hrSalaryField.salaryFieldRoundNo
            //                 )
            //               : Math.round(+grossAmount),
            //           salaryFromYYYYMM: userSalaryMasterData[0].salaryFromYYYYMM,
            //           stateid: stateId,
            //           AmountIn: userSalaryMasterData[0].AmountIn,
            //           createBy: userSalaryMasterData[0].createBy,
            //           ActualEmployeeSalaryAmount:
            //             +grossAmount % 1 != 0 ? (+grossAmount).toFixed(3) : +grossAmount,
            //         });
          }
        }

        if (net_fields) {
          if (net_master) {
            updateQuery.push(() =>
              HRSalaryMaster.update(
                { stateid: stateId },
                { where: { salaryMasterID: net_master.salaryMasterID } },
              ),
            );
          } else {
            // Add_final_Structure.push({
            //           userMasterID,
            //           gradeSalaryStructureID: net_fields.gradeSalaryStructureID,
            //           EmployeeSalaryAmount:
            //             net_fields.hrSalaryField.salaryFieldRound == 'N'
            //               ? (+netAmount).toFixed(
            //                   +net_fields.hrSalaryField.salaryFieldRoundNo
            //                 )
            //               : Math.round(+netAmount),
            //           salaryFromYYYYMM: userSalaryMasterData[0].salaryFromYYYYMM,
            //           stateid: stateId,
            //           AmountIn: userSalaryMasterData[0].AmountIn,
            //           createBy: userSalaryMasterData[0].createBy,
            //           ActualEmployeeSalaryAmount:
            //             +netAmount % 1 != 0 ? (+netAmount).toFixed(3) : +netAmount,
            //         });
          }
        }

        if (ctc_fields) {
          if (ctc_master) {
            updateQuery.push(() =>
              HRSalaryMaster.update(
                { stateid: stateId },
                { where: { salaryMasterID: ctc_master.salaryMasterID } },
              ),
            );
          } else {
            // Add_final_Structure.push({
            //       userMasterID,
            //       gradeSalaryStructureID: ctc_fields.gradeSalaryStructureID,
            //       EmployeeSalaryAmount:
            //         ctc_fields.hrSalaryField.salaryFieldRound == 'N'
            //           ? (+ctcAmount).toFixed(
            //               +ctc_fields.hrSalaryField.salaryFieldRoundNo
            //             )
            //           : Math.round(+ctcAmount),
            //       salaryFromYYYYMM: userSalaryMasterData[0].salaryFromYYYYMM,
            //       stateid: stateId,
            //       AmountIn: userSalaryMasterData[0].AmountIn,
            //       createBy: userSalaryMasterData[0].createBy,
            //       ActualEmployeeSalaryAmount:
            //         +ctcAmount % 1 != 0 ? (+ctcAmount).toFixed(3) : +ctcAmount,
            //     });
          }
        }
      }
    }

    console.log(
      '---------------start data adding in database ------------------------',
    );

    // add in batches

    for (let i = 0; i < Add_final_Structure.length; i += chunkSize) {
      await HRSalaryMaster.bulkCreate(
        Add_final_Structure.slice(i, i + chunkSize),
      );
    }

    for (let i = 0; i < updateQuery.length; i += chunkSize) {
      const chunk = updateQuery.slice(i, i + chunkSize);

      // run these 500 updates in parallel
      await Promise.all(chunk.map((fn) => fn()));
    }

    console.log(
      '---------------data added successfully. ------------------------',
    );

    return res.status(200).json({
      status: 200,
      message: 'Data added successfully!',
      count: Add_final_Structure.length,
    });
  } catch (error) {
    next(error);
  }
};

exports.add_CTC_Gross_Net_In_salary = async (req, res, next) => {
  try {
    const { companyIds, chunkSize } = req.body;

    if (!chunkSize || !companyIds || !Array.isArray(companyIds))
      throw new Error('chunkSize and companyIds are required!');

    const All_salaryMasterData = await HRSalaryMaster.findAll({
      include: [
        {
          model: userMaster,
          where: {
            companyMasterId: {
              [Sequelize.Op.in]: companyIds,
            },
          },
          attributes: ['companyMasterId'],
        },
        {
          model: GradeSalaryStructure,
          include: [
            {
              model: HRSalaryFields,
              attributes: [
                'payheadMasterId',
                'salaryFieldRound',
                'salaryFieldRoundNo',
              ],
            },
          ],
        },
      ],
    });

    const All_salaryData = await HRSalaryTrasaction.findAll({
      include: [
        {
          model: userMaster,
          where: {
            companyMasterId: {
              [Sequelize.Op.in]: companyIds,
            },
          },
          attributes: ['companyMasterId'],
        },
      ],
    });

    for (const company of companyIds) {
      const Add_final_Salary = [];

      const salaryMasterData_companyWise = All_salaryMasterData.filter(
        (e) => e.userMaster.companyMasterId == company,
      );

      const salaryData_companyWise = All_salaryData.filter(
        (e) => e.userMaster.companyMasterId == company,
      );

      // group data month and userwise
      const groupedData = [
        ...new Map(
          salaryMasterData_companyWise.map((item) => [
            `${item.salaryFromYYYYMM}-${item.userMasterID}`,
            {
              salaryFromYYYYMM: item.salaryFromYYYYMM,
              userMasterID: item.userMasterID,
            },
          ]),
        ).values(),
      ];

      for (const data of groupedData) {
        const userMasterID = data.userMasterID;
        const yearMonth = data.salaryFromYYYYMM;

        // get all data of user month wise

        const userSalaryMasterData = salaryMasterData_companyWise.filter(
          (e) =>
            e.userMasterID == userMasterID && e.salaryFromYYYYMM == yearMonth,
        );

        if (!userSalaryMasterData.length) continue;

        // FIND data of CTC GROSS AND NET SALARY from master

        const gross_master = userSalaryMasterData.find(
          (e) => e.gradeSalaryStructure.hrSalaryField.payheadMasterId == 50,
        );
        const net_master = userSalaryMasterData.find(
          (e) => e.gradeSalaryStructure.hrSalaryField.payheadMasterId == 92,
        );
        const ctc_master = userSalaryMasterData.find(
          (e) => e.gradeSalaryStructure.hrSalaryField.payheadMasterId == 1,
        );

        //------------------ add data in salary --------------------------

        if (gross_master && net_master && ctc_master) {
          const salaryData = salaryData_companyWise.filter((e) =>
            [...userSalaryMasterData]
              .map((s) => +s.salaryMasterID)
              .includes(+e.salaryMasterID),
          );

          if (!salaryData.length) continue;

          // group data month and userwise
          const groupedsalaryData = [
            ...new Map(
              salaryData.map((item) => [
                `${item.salaryYYYYMM}-${item.userMasterID}`,
                {
                  salaryYYYYMM: item.salaryYYYYMM,
                  userMasterID: item.userMasterID,
                },
              ]),
            ).values(),
          ];

          for (const salary of groupedsalaryData) {
            const userMasterID = salary.userMasterID;
            const yearMonth = salary.salaryYYYYMM;

            const salaryData = await getSalaryData(userMasterID, yearMonth);

            // FIND data of CTC GROSS AND NET SALARY from salary

            const gross_salary = salaryData.find(
              (e) => e.payheadMasterId == 50,
            );
            const net_salary = salaryData.find((e) => e.payheadMasterId == 92);
            const ctc_salary = salaryData.find((e) => e.payheadMasterId == 1);

            if (gross_salary && net_salary && ctc_salary) continue;

            const grossAmount = salaryData
              .filter(
                (e) =>
                  ![1, 50, 92].includes(e.payheadMasterId) &&
                  e.salaryFieldSrNo == 'A' &&
                  e.considerIn != 'net' &&
                  e.consider != 'net',
              )
              .reduce((acc, obj) => acc + +obj.EmployeeSalaryAmount, 0);
            const extraAmount = salaryData
              .filter(
                (e) =>
                  ![1, 50, 92].includes(e.payheadMasterId) &&
                  e.salaryFieldSrNo == 'A' &&
                  (e.considerIn == 'net' || e.consider == 'net'),
              )
              .reduce((acc, obj) => acc + +obj.EmployeeSalaryAmount, 0);
            const deductionAmount = salaryData
              .filter(
                (e) =>
                  ![1, 50, 92].includes(e.payheadMasterId) &&
                  ['B', 'D'].includes(e.salaryFieldSrNo) &&
                  e.salaryFieldSide == 'D',
              )
              .reduce((acc, obj) => acc + +obj.EmployeeSalaryAmount, 0);

            const ctcAmount = salaryData
              .filter(
                (e) =>
                  ![1, 50, 92].includes(e.payheadMasterId) &&
                  ['A', 'C'].includes(e.salaryFieldSrNo),
              )
              .reduce((acc, obj) => acc + +obj.EmployeeSalaryAmount, 0);

            const netAmount = +grossAmount - +deductionAmount + +extraAmount;

            if (gross_master && !gross_salary) {
              Add_final_Salary.push({
                userMasterID,
                salaryMasterID: gross_master.salaryMasterID,
                EmployeeSalaryAmount:
                  gross_master.gradeSalaryStructure.hrSalaryField
                    .salaryFieldRound == 'N'
                    ? (+grossAmount).toFixed(
                        +gross_master.gradeSalaryStructure.hrSalaryField
                          .salaryFieldRoundNo,
                      )
                    : Math.round(+grossAmount),
                salaryYYYYMM: salaryData[0].salaryYYYYMM,
                SalaryCalcOnDays: salaryData[0].SalaryCalcOnDays,
                createBy: salaryData[0].createBy,
              });
            }

            if (net_master && !net_salary) {
              Add_final_Salary.push({
                userMasterID,
                salaryMasterID: net_master.salaryMasterID,
                EmployeeSalaryAmount:
                  net_master.gradeSalaryStructure.hrSalaryField
                    .salaryFieldRound == 'N'
                    ? (+netAmount).toFixed(
                        +net_master.gradeSalaryStructure.hrSalaryField
                          .salaryFieldRoundNo,
                      )
                    : Math.round(+netAmount),
                salaryYYYYMM: salaryData[0].salaryYYYYMM,
                SalaryCalcOnDays: salaryData[0].SalaryCalcOnDays,
                createBy: salaryData[0].createBy,
              });
            }

            if (ctc_master && !ctc_salary) {
              Add_final_Salary.push({
                userMasterID,
                salaryMasterID: ctc_master.salaryMasterID,
                EmployeeSalaryAmount:
                  ctc_master.gradeSalaryStructure.hrSalaryField
                    .salaryFieldRound == 'N'
                    ? (+ctcAmount).toFixed(
                        +ctc_master.gradeSalaryStructure.hrSalaryField
                          .salaryFieldRoundNo,
                      )
                    : Math.round(+ctcAmount),
                salaryYYYYMM: salaryData[0].salaryYYYYMM,
                SalaryCalcOnDays: salaryData[0].SalaryCalcOnDays,
                createBy: salaryData[0].createBy,
              });
            }
          }
        }
      }

      // add in batches

      for (let i = 0; i < Add_final_Salary.length; i += chunkSize) {
        await HRSalaryTrasaction.bulkCreate(
          Add_final_Salary.slice(i, i + chunkSize),
        );
      }

      console.log(company, '---------------salary data added in company');
    }

    return res.status(200).json({
      status: 200,
      message: 'Data added successfully!',
    });
  } catch (error) {
    next(error);
  }
};

exports.add_defaultPayhead_In_Company = async (req, res, next) => {
  try {
    const {
      payheadMasterId,
      companyMasterID,
      salaryFieldSide,
      salaryFieldSrNo,
    } = req.body;

    if (!payheadMasterId || !salaryFieldSide || !salaryFieldSrNo)
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });

    const condition = {
      status: [0, 1],
    };

    if (
      companyMasterID &&
      Array.isArray(companyMasterID) &&
      companyMasterID.length > 0
    ) {
      condition.companyMasterID = {
        [Sequelize.Op.in]: companyMasterID,
      };
    }

    const allCompany = await companyMaster.findAll({
      where: condition,
    });

    const AllCompanyHrSalaryFields = await HRSalaryFields.findAll({
      where: {
        companyMasterID: {
          [Sequelize.Op.in]: allCompany.map((e) => e.companyMasterID),
        },
        payheadMasterId,
        status: 1,
      },
    });

    const gradestructure = await GradeStructure.findAll({
      where: {
        status: 1,
      },
      include: [
        {
          required: false,
          model: GradeSalaryStructure,
          where: {
            salaryFieldID: {
              [Sequelize.Op.in]: AllCompanyHrSalaryFields.map(
                (e) => e.salaryFieldID,
              ),
            },
          },
        },
      ],
    });

    const HrsalaryMaster = await HRSalaryMaster.findAll({
      include: [
        {
          required: true,
          model: GradeSalaryStructure,
          include: [
            {
              model: HRSalaryFields,
              where: {
                payheadMasterId: { [Sequelize.Op.in]: [50, payheadMasterId] },
              },
            },
          ],
        },
      ],
    });

    const finaldata = [];

    for (const company of allCompany) {
      const companyMasterID = company.companyMasterID;

      console.log(companyMasterID, 'companyMasterID');

      let payhead = AllCompanyHrSalaryFields.find(
        (e) =>
          e.companyMasterID == companyMasterID &&
          e.payheadMasterId == payheadMasterId,
      );

      if (!payhead) {
        payhead = await HRSalaryFields.create({
          salaryFieldActive: 'Y',
          payheadMasterId,
          salaryFieldSide,
          salaryFieldAttanChk: 1,
          salaryFieldRound: 'Y',
          salaryFieldSrNo,
          salaryFieldShow: 'Y',
          salaryFieldWhenMonth: [0],
          roundOffType: '1',
          assignSalaryRound: 'Y',
          assignSalaryRoundOffType: 1,
          companyMasterID: companyMasterID,
          considerIn: payheadConsiderInEnum.GROSS,
          createBy: company.createBy,
        });
      }

      if (payhead) {
        const Allgrade = gradestructure.filter(
          (e) => e.companyMasterID == companyMasterID,
        );

        for (const grade of Allgrade) {
          let salary_structure = [...grade.gradeSalaryStructures].find(
            (e) => e.salaryFieldID == payhead.salaryFieldID,
          );

          if (!salary_structure) {
            salary_structure = await GradeSalaryStructure.create({
              gradeStructureID: grade.gradeStructureID,
              salaryFieldID: payhead.salaryFieldID,
              createBy: grade.createBy,
            });
          }

          if (salary_structure) {
            const all_salaryMaster = HrsalaryMaster.filter(
              (e) =>
                e.gradeSalaryStructure.gradeStructureID ==
                grade.gradeStructureID,
            );

            const grossPayhead = all_salaryMaster.filter(
              (e) => e.gradeSalaryStructure.hrSalaryField.payheadMasterId == 50,
            );

            for (const master of grossPayhead) {
              const salaryMaster = all_salaryMaster.find(
                (e) =>
                  e.gradeSalaryStructureID ==
                  salary_structure.gradeSalaryStructureID,
              );

              if (!salaryMaster) {
                finaldata.push({
                  userMasterID: master.userMasterID,
                  gradeSalaryStructureID:
                    salary_structure.gradeSalaryStructureID,
                  salaryFromYYYYMM: master.salaryFromYYYYMM,
                  ptaxinctc: master.ptaxinctc,
                  stateid: master.stateid,
                  AmountIn: master.AmountIn,
                  createBy: master.createBy,
                  skillCategory: master.skillCategory,
                  corporationId: master.corporationId,
                  minWagesMasterId: master.minWagesMasterId,
                  payrollFrequency: master.payrollFrequency,
                  startDate: master.startDate,
                  endDate: master.endDate,
                });
              }
            }
          }
        }
      }
    }

    const BATCH_SIZE = 1000;

    for (let i = 0; i < finaldata.length; i += BATCH_SIZE) {
      const batch = finaldata.slice(i, i + BATCH_SIZE);
      await HRSalaryMaster.bulkCreate(batch);
    }

    return res.status(200).json({
      status: 200,
      recordAdded: finaldata.length,
    });
  } catch (error) {
    next(error);
  }
};

exports.set_EDLIlimit = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;

    if (!companyMasterID)
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });

    const allEmployeeEDlI = await HRSalaryMaster.findAll({
      include: [
        {
          required: true,
          model: GradeSalaryStructure,
          include: [
            {
              model: GradeStructure,
              where: { companyMasterID },
              attributes: [],
            },
            {
              model: HRSalaryFields,
              where: { payheadMasterId: 66 },
              attributes: [],
            },
          ],
        },
      ],
    });

    const gradestructureIds = allEmployeeEDlI.map(
      (a) => a.gradeSalaryStructureID,
    );

    // await GradeSalaryStructure.update({
    //   salaryfieldmaxrange: 75
    // }, {
    //   where: {
    //     gradeSalaryStructureID: {
    //       [Sequelize.Op.in]: gradestructureIds
    //     }
    //   }
    // });

    const hrsalarymasterIds = allEmployeeEDlI
      .filter((e) => +e.EmployeeSalaryAmount > 75)
      .map((a) => a.salaryMasterID);

    // await HRSalaryMaster.update({
    //   EmployeeSalaryAmount: 75
    // }, {
    //   where: {
    //     salaryMasterID: {
    //       [Sequelize.Op.in]: hrsalarymasterIds
    //     }
    //   }
    // });

    return res.status(200).json({
      status: 200,
      data: allEmployeeEDlI,
    });
  } catch (error) {
    next(error);
  }
};

async function attendanceData(userMasterID, start_date, end_date) {
  const attendancedata = await attendanceTransaction.findAll({
    where: {
      userMasterID,
      AttendanceDate: {
        [Sequelize.Op.between]: [start_date, end_date],
      },
      // Penalty or Early Go Penalty exists (non-null and non-empty string)
      [Sequelize.Op.or]: [
        {
          Panalty: {
            [Sequelize.Op.and]: [
              { [Sequelize.Op.ne]: null },
              { [Sequelize.Op.ne]: '' },
            ],
          },
        },
        {
          goEarlyPanalty: {
            [Sequelize.Op.and]: [
              { [Sequelize.Op.ne]: null },
              { [Sequelize.Op.ne]: '' },
            ],
          },
        },
      ],

      roundOffMinutes: {
        [Sequelize.Op.or]: [
          {
            [Sequelize.Op.eq]: Sequelize.literal(`
              (SELECT MAX(at2."roundOffMinutes") 
               FROM "attendanceTransactions" AS at2 
               WHERE at2."AttendanceDate" = "attendanceTransaction"."AttendanceDate" 
               AND at2."userMasterID" = "attendanceTransaction"."userMasterID"
               AND at2."roundOffMinutes" IS NOT NULL
              )
            `),
          },

          {
            [Sequelize.Op.and]: [
              Sequelize.literal(`
                NOT EXISTS (
                  SELECT 1 FROM "attendanceTransactions" AS at2
                  WHERE at2."AttendanceDate" = "attendanceTransaction"."AttendanceDate"
                  AND at2."userMasterID" = "attendanceTransaction"."userMasterID"
                  AND at2."roundOffMinutes" IS NOT NULL
                )
              `),
              { [Sequelize.Op.is]: null },
            ],
          },
        ],
      },
      AttendanceTransID: {
        [Sequelize.Op.notIn]: Sequelize.literal(`    
          (WITH duplicate_records AS (
          SELECT
              "trans1"."AttendanceTransID",
              "trans1"."AttendanceDate",
              "trans1"."roundOffMinutes",
              ROW_NUMBER() OVER (
                  PARTITION BY "trans1"."AttendanceDate", "trans1"."roundOffMinutes"
                  ORDER BY "trans1"."AttendanceTransID" ASC
              ) AS row_num
          FROM "attendanceTransactions" AS "trans1"
          JOIN (
              SELECT "AttendanceDate", "roundOffMinutes"
              FROM "attendanceTransactions"
              WHERE "userMasterID" = ${userMasterID}
              AND "AttendanceDate" BETWEEN '${start_date}' and '${end_date}'
              GROUP BY "AttendanceDate", "roundOffMinutes"
              HAVING COUNT(*) > 1
          ) AS "trans"
          ON "trans1"."AttendanceDate" = "trans"."AttendanceDate"
          AND COALESCE(CAST("trans1"."roundOffMinutes" AS INTEGER), -1) =
              COALESCE(CAST("trans"."roundOffMinutes" AS INTEGER), -1)
          WHERE "trans1"."userMasterID" = ${userMasterID}
          AND "trans1"."AttendanceDate" BETWEEN '${start_date}' and '${end_date}'
      )
      SELECT "AttendanceTransID"
      FROM duplicate_records
      WHERE row_num > 1)`),
      },
    },
    order: [['AttendanceDate', 'ASC']],
  });

  return attendancedata;
}

exports.addLCEGPenaltyData = async (req, res, next) => {
  try {
    const { monthArray = [] } = req.body;

    const rawData = await HrLeaveMonthlyTrans.findAll({
      where: {
        AttnYearMon: {
          [Sequelize.Op.in]: monthArray,
        },
        verified: 1,
      },
      include: [
        {
          model: HrLeaveTypes,
          where: {
            LeaveID: {
              [Sequelize.Op.in]: [1, 20],
            },
          },
          attributes: ['LeaveID'],
        },
      ],
    });

    // Group and process data
    const groupedData = {};

    rawData.forEach((item) => {
      const key = `${item.userMasterID}_${item.AttnYearMon}`;
      if (!groupedData[key]) {
        const startdate =
          String(item.AttnYearMon).slice(0, 4) +
          '-' +
          String(item.AttnYearMon).slice(4, 6) +
          '-' +
          '01';
        const enddate =
          String(item.AttnYearMon).slice(0, 4) +
          '-' +
          String(item.AttnYearMon).slice(4, 6) +
          '-' +
          daysInMonth(
            String(item.AttnYearMon).slice(4, 6),
            String(item.AttnYearMon).slice(0, 4),
          );

        groupedData[key] = {
          userMasterID: item.userMasterID,
          AttnYearMon: item.AttnYearMon,
          monthstartdate: item.monthstartdate || startdate,
          monthenddate: item.monthenddate || enddate,
          hasLeaveID20: false,
          createBy: item.createBy,
          createByIp: item.createByIp,
        };
      }

      if (item.hrLeaveType?.LeaveID == 20) {
        groupedData[key].hasLeaveID20 = true;
      }
    });

    const groupedArray = Object.values(groupedData).map((item) => ({
      userMasterID: item.userMasterID,
      AttnYearMon: item.AttnYearMon,
      monthstartdate: item.monthstartdate,
      monthenddate: item.monthenddate,
      salaryType: item.hasLeaveID20 ? 'hourly' : 'daily',
      createBy: item.createBy,
      createByIp: item.createByIp,
    }));

    const userMasterIds = [...new Set(groupedArray.map((e) => e.userMasterID))];

    const finalPenalty = [];

    for (const data of groupedArray) {
      const attendance = await attendanceData(
        data.userMasterID,
        data.monthstartdate,
        data.monthenddate,
        false,
      );

      let penaltyMin = 0,
        penaltyAmount = 0,
        penaltyDays = 0,
        penaltyPercent = 0;

      attendance.forEach((e) => {
        const processPenalty = (type) => {
          const value = +e[type];
          const deductionType = e[`${type}Deduction`];

          if (
            value &&
            deductionType &&
            ['min', 'amount', 'day', 'percent'].includes(deductionType)
          ) {
            if (
              (data.salaryType === 'hourly' &&
                deductionType === LCEGPenaltyTypeEnum.MINUTE) ||
              (data.salaryType === 'daily' &&
                deductionType === LCEGPenaltyTypeEnum.DAY)
            ) {
              return;
            }

            switch (deductionType) {
              case 'min':
                penaltyMin += +value;
                break;
              case 'amount':
                penaltyAmount += +value;
                break;
              case 'day':
                penaltyDays += +value;
                break;
              case 'percent':
                penaltyPercent += +value;
                break;
            }
          }
        };

        processPenalty('Panalty');
        processPenalty('goEarlyPanalty');
      });

      // push minute wise
      if (data.salaryType != 'hourly' && +penaltyMin > 0) {
        finalPenalty.push({
          userMasterID: data.userMasterID,
          YYYYMM: data.AttnYearMon,
          penaltyType: LCEGPenaltyTypeEnum.MINUTE,
          penaltyValue: +penaltyMin,
          createBy: data.createBy,
          createByIp: data.createByIp,
        });
      }

      // push Day wise
      if (data.salaryType != 'daily' && +penaltyDays > 0) {
        finalPenalty.push({
          userMasterID: data.userMasterID,
          YYYYMM: data.AttnYearMon,
          penaltyType: LCEGPenaltyTypeEnum.DAY,
          penaltyValue: +penaltyDays,
          createBy: data.createBy,
          createByIp: data.createByIp,
        });
      }

      // push percent wise
      if (+penaltyPercent > 0) {
        finalPenalty.push({
          userMasterID: data.userMasterID,
          YYYYMM: data.AttnYearMon,
          penaltyType: LCEGPenaltyTypeEnum.PERCENT,
          penaltyValue: +penaltyPercent,
          createBy: data.createBy,
          createByIp: data.createByIp,
        });
      }

      // push amount wise
      if (+penaltyAmount > 0) {
        finalPenalty.push({
          userMasterID: data.userMasterID,
          YYYYMM: data.AttnYearMon,
          penaltyType: LCEGPenaltyTypeEnum.AMOUNT,
          penaltyValue: +penaltyAmount,
          createBy: data.createBy,
          createByIp: data.createByIp,
        });
      }
    }

    await sequelize.transaction(async (t) => {
      await LCEGPenalty.destroy({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: userMasterIds,
          },
          YYYYMM: {
            [Sequelize.Op.in]: monthArray,
          },
        },
        transaction: t,
      });

      await LCEGPenalty.bulkCreate(finalPenalty, {
        hooks: false,
        transaction: t,
      });
    });

    return res.status(200).json({
      status: 200,
      data: finalPenalty,
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePfEsicPtDate = async (req, res, next) => {
  try {
    const { userMasterID, salaryYYYYMM, pfPaidDate, esicPaidDate, ptPaidDate } =
      req.body;

    if (
      !userMasterID ||
      !salaryYYYYMM ||
      (!pfPaidDate && !esicPaidDate && !ptPaidDate)
    )
      return res.status(statusCodes.OK).json({
        status: 401,
        message: 'Invalid parameters!',
      });

    // Identify which date type is being updated
    let type = '';
    let field = '';

    if (pfPaidDate) {
      type = 'PF';
      field = 'pfPaidDate';
    } else if (esicPaidDate) {
      type = 'ESIC';
      field = 'esicPaidDate';
    } else if (ptPaidDate) {
      type = 'PT';
      field = 'ptPaidDate';
    } else {
      return res.status(400).json({
        status: 400,
        message: 'No paid date provided.',
      });
    }

    // -----------------------------
    // Check already updated records
    // -----------------------------
    const existingRecords = await HRSalarySlip.findAll({
      where: {
        userMasterID,
        salaryYYYYMM,
        [field]: {
          [Sequelize.Op.not]: null,
        },
      },
      attributes: ['userMasterID'],
      include: [
        {
          model: userMaster,
          attributes: ['displayName'],
        },
      ],
    });

    let message = '';

    if (existingRecords.length) {
      const names = existingRecords
        .map((e) => e.userMaster?.displayName)
        .filter(Boolean)
        .join(', ');

      message = `${type} paid date already exists for: ${names}. `;
    }

    // -----------------------------
    // Prepare update data
    // -----------------------------
    const dataToUpdate = {
      updateBy: req?.userDetails?.userMasterId,
      updateByIp: req?.userDetails?.userIpAddress,
      [field]: pfPaidDate || esicPaidDate || ptPaidDate,
    };

    const whereCondition = {
      userMasterID,
      salaryYYYYMM,
      [field]: {
        [Sequelize.Op.eq]: null,
      },
    };

    // -----------------------------
    // Perform update
    // -----------------------------
    const [affectedRows] = await HRSalarySlip.update(dataToUpdate, {
      where: whereCondition,
    });

    if (affectedRows > 0) {
      message += `${type} paid date added successfully.`;
    } else if (!message) {
      message = `No records updated. ${type} paid date may already be set.`;
    }

    return res.status(200).json({
      status: 200,
      message: message.trim(),
    });
  } catch (error) {
    next(error);
  }
};

exports.getSalaryComputedEmployees = async (req, res, next) => {
  try {
    const {
      salaryYYYYMM,
      companyMasterID,
      userMasterID,
      branchMasterID,
      departmentID,
      designationID,
      divisionId,
      workingAreaId,
      page,
      limit,
      exportData,
    } = req.body;
    if (!salaryYYYYMM || !companyMasterID)
      return res.status(statusCodes.OK).json({
        status: 401,
        message: message.errorMessage.INVALID_REQUEST,
      });

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginationQuery =
      !exportData && page && limit ? { offset: (page - 1) * limit, limit } : {};

    let { payheadMasterId, type } = req.body;
    if (
      (Array.isArray(payheadMasterId) && payheadMasterId.length == 0) ||
      !payheadMasterId
    ) {
      payheadMasterId = [
        payheadMasterIdsMapping.PF,
        payheadMasterIdsMapping.EMPLOYEE_ESIC,
        payheadMasterIdsMapping.PTAX,
      ];
    }

    if (payheadMasterId && !Array.isArray(payheadMasterId))
      payheadMasterId = [payheadMasterId];

    const defaultPayhead = [
      payheadMasterIdsMapping.PF,
      payheadMasterIdsMapping.EMPLOYEE_ESIC,
      payheadMasterIdsMapping.PTAX,
      payheadMasterIdsMapping.GROSS,
      payheadMasterIdsMapping.NETSALARY,
    ];

    const whereCondition = {
      companyMasterId: companyMasterID,
    };

    if (!type) type = 'list';

    const userIncludeModels = [
      {
        model: EmployeeJoiningDetails,
        attributes: ['employeeCode'],
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
        required:
          Array.isArray(branchMasterID) && branchMasterID.length > 0
            ? true
            : false,
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
        model: EmployeeDepartment,
        where: {
          status: 1,
          ...(departmentID &&
            (!Array.isArray(departmentID) || departmentID.length) && {
              departmentID,
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
        required:
          Array.isArray(departmentID) && departmentID.length > 0 ? true : false,
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
        model: EmployeeDesignation,
        where: {
          status: 1,
          ...(designationID &&
            (!Array.isArray(designationID) || designationID.length) && {
              designationID,
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
        required:
          Array.isArray(designationID) && designationID.length > 0
            ? true
            : false,
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
        model: EmployeeDivision,
        where: {
          status: 1,
          ...(divisionId && { divisionId }),
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(filterDate),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: divisionId ? true : false,
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
          ...(workingAreaId && { workingAreaId }),
          startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
          [Sequelize.Op.or]: [
            {
              endDate: {
                [Sequelize.Op.gte]: new Date(filterDate),
              },
            },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        required: workingAreaId ? true : false,
        attributes: ['workingAreaId'],
        include: [
          {
            model: WorkingArea,
            attributes: ['workingAreaName'],
          },
        ],
      },
    ];

    const salaryIncludeModels = [
      {
        required: true,
        model: HRSalaryMaster,
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
                  payheadMasterId: defaultPayhead,
                },
                attributes: ['payheadMasterId'],
              },
            ],
          },
        ],
      },
    ];

    if (type == 'list') {
      userIncludeModels.push({
        model: HRSalarySlip,
        where: {
          salaryYYYYMM: salaryYYYYMM,
        },
        attributes: [
          'salaryYYYYMM',
          'ptPaidDate',
          'esicPaidDate',
          'pfPaidDate',
          'paidDate',
        ],
      });

      if (userMasterID) {
        whereCondition.userMasterID = userMasterID;
      }
    }

    let userData = [];
    let totalcount = 0;
    const salaryMap = {};

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    if (page && limit && !exportData) {
      const { rows: userList, count } = await UserMaster.findAndCountAll({
        subQuery: false,
        distinct: true,
        where: {
          ...where,
          ...whereCondition,
          [Sequelize.Op.and]: Sequelize.literal(`
      EXISTS (
        SELECT 1
        FROM "hrSalaryTrasactions" hst2
        JOIN "hrSalaryMasters" hsm2 ON hsm2."salaryMasterID" = hst2."salaryMasterID"
        JOIN "gradeSalaryStructures" gss2 ON gss2."gradeSalaryStructureID" = hsm2."gradeSalaryStructureID"
        JOIN "hrSalaryFields" hsf2 ON hsf2."salaryFieldID" = gss2."salaryFieldID"
        WHERE hst2."userMasterID" = "userMaster"."userMasterID"
          AND hst2."salaryYYYYMM" = '${salaryYYYYMM}'
          AND hsf2."payheadMasterId" IN (${payheadMasterId.join(',')})
      )
    `),
        },
        include: [...includeModels, ...userIncludeModels],
        attributes: userAttributes,
        ...paginationQuery,
        order: [['displayName', 'ASC']],
      });

      const userIds = userList.map((u) => u.userMasterID);

      const allSalaryData = await HrSalaryTrans.findAll({
        where: {
          salaryYYYYMM,
          userMasterID: userIds,
        },
        attributes: ['userMasterID', 'EmployeeSalaryAmount', 'salaryMasterID'],
        include: salaryIncludeModels,
      });

      userData = userList;
      totalcount = count;

      for (const s of allSalaryData) {
        if (!salaryMap[s.userMasterID]) salaryMap[s.userMasterID] = [];
        salaryMap[s.userMasterID].push(s);
      }
    } else {
      userData = await UserMaster.findAll({
        where: {
          ...where,
          ...whereCondition,
          [Sequelize.Op.and]: Sequelize.literal(`
      EXISTS (
        SELECT 1
        FROM "hrSalaryTrasactions" hst2
        JOIN "hrSalaryMasters" hsm2 ON hsm2."salaryMasterID" = hst2."salaryMasterID"
        JOIN "gradeSalaryStructures" gss2 ON gss2."gradeSalaryStructureID" = hsm2."gradeSalaryStructureID"
        JOIN "hrSalaryFields" hsf2 ON hsf2."salaryFieldID" = gss2."salaryFieldID"
        WHERE hst2."userMasterID" = "userMaster"."userMasterID"
          AND hst2."salaryYYYYMM" = '${salaryYYYYMM}'
          AND hsf2."payheadMasterId" IN (${payheadMasterId.join(',')})
      )
    `),
        },
        attributes: ['displayName', 'userNumber', 'userMasterID'],
        order: [['displayName', 'ASC']],
        include: [
          ...includeModels,
          ...userIncludeModels,
          ...(type && type != 'dropdown'
            ? [
                {
                  required: true,
                  model: HrSalaryTrans,
                  where: { salaryYYYYMM: salaryYYYYMM },
                  attributes: ['EmployeeSalaryAmount', 'salaryMasterID'],
                  include: salaryIncludeModels,
                },
              ]
            : []),
        ],
      });
    }

    const finalData = userData.map((userMaster) => {
      const obj = {
        'Employee Code':
          userMaster?.employeeJoiningDetails?.[0]?.employeeCode || '',
        'Employee Name': userMaster?.displayName || '',
        Number: userMaster?.userNumber || '',
        Branch:
          userMaster?.employeeBranches?.[0]?.branchMaster?.branchName || '',
        Department:
          userMaster?.employeeDepartments?.[0]?.department?.departmentName ||
          '',
        Designation:
          userMaster?.employeeDesignations?.[0]?.designation?.designationName ||
          '',
        Division:
          userMaster?.employeeDivisions?.[0]?.division?.divisionName || '',
        'Working Area':
          userMaster?.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName ||
          '',
        Gross: 0,
        'Net Pay': 0,
        'Salary Paid Date': userMaster?.hrSalarySlips?.[0]?.paidDate
          ? moment(userMaster?.hrSalarySlips?.[0]?.paidDate).format(
              'DD-MM-YYYY',
            )
          : '',
        'PF Paid Date': 'NA',
        'ESIC Paid Date': 'NA',
        'PT Paid Date': 'NA',
      };

      if (!exportData) {
        obj['userMasterID'] = userMaster?.userMasterID;
      }

      const salaryData =
        userMaster.hrSalaryTrasactions ||
        salaryMap[userMaster.userMasterID] ||
        [];

      salaryData.map((trans) => {
        if (
          trans?.HSM?.GSS?.HSF?.payheadMasterId == payheadMasterIdsMapping.PF
        ) {
          obj['PF Paid Date'] = userMaster?.hrSalarySlips?.[0]?.pfPaidDate
            ? moment(userMaster?.hrSalarySlips?.[0]?.pfPaidDate).format(
                'DD-MM-YYYY',
              )
            : '';
        }
        if (
          trans?.HSM?.GSS?.HSF?.payheadMasterId ==
          payheadMasterIdsMapping.EMPLOYEE_ESIC
        ) {
          obj['ESIC Paid Date'] = userMaster?.hrSalarySlips?.[0]?.esicPaidDate
            ? moment(userMaster?.hrSalarySlips?.[0]?.esicPaidDate).format(
                'DD-MM-YYYY',
              )
            : '';
        }
        if (
          trans?.HSM?.GSS?.HSF?.payheadMasterId == payheadMasterIdsMapping.PTAX
        ) {
          obj['PT Paid Date'] = userMaster?.hrSalarySlips?.[0]?.ptPaidDate
            ? moment(userMaster?.hrSalarySlips?.[0]?.ptPaidDate).format(
                'DD-MM-YYYY',
              )
            : '';
        }
        if (
          trans?.HSM?.GSS?.HSF?.payheadMasterId == payheadMasterIdsMapping.GROSS
        ) {
          obj['Gross'] = trans.EmployeeSalaryAmount || '';
        }
        if (
          trans?.HSM?.GSS?.HSF?.payheadMasterId ==
          payheadMasterIdsMapping.NETSALARY
        ) {
          obj['Net Pay'] = trans.EmployeeSalaryAmount || '';
        }
      });

      return obj;
    });

    if (exportData) {
      return await generateExcel(
        finalData,
        'PF ESIC & PT PAID DATE',
        'xlsx',
        res,
      );
    }

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: finalData,
      totalcount,
    });
  } catch (error) {
    next(error);
  }
};

exports.holdUnholdSalary = async (req, res, next) => {
  try {
    const { userMasterID, salaryYYYYMM, holdStatus } = req.body;

    if (!userMasterID)
      return res.status(200).json({
        status: 400,
        message: message.usermessage.notFoundMessage('User'),
      });

    if (!salaryYYYYMM)
      return res.status(200).json({
        status: 400,
        message: message.usermessage.notFoundMessage('Salary Year Month'),
      });

    const condition = {
      userMasterID: userMasterID,
      salaryYYYYMM: salaryYYYYMM,
    };

    const salarySlip = await HRSalarySlip.findOne({
      where: condition,
      attributes: ['paid', 'holdBy', 'hrSalarySlipID'],
    });

    if (!salarySlip)
      return res.status(200).json({
        status: 400,
        message: message.usermessage.notFoundMessage('Salary'),
      });

    if (salarySlip && salarySlip.paid == true)
      return res.status(200).json({
        status: 400,
        message: 'Can not hold because salary already paid',
      });

    if (salarySlip && salarySlip.holdBy && holdStatus == 'hold')
      return res.status(200).json({
        status: 400,
        message: 'Salary is already hold',
      });

    if (salarySlip && !salarySlip.holdBy && holdStatus == 'unhold')
      return res.status(200).json({
        status: 400,
        message: 'Salary is already unhold',
      });

    await HRSalarySlip.update(
      {
        holdBy: holdStatus == 'hold' ? req.userDetails.userMasterId : null,
        updateBy: holdStatus == 'hold' ? req.userDetails.userMasterId : null,
        holdAt: holdStatus == 'hold' ? new Date() : null,
      },
      {
        where: {
          hrSalarySlipID: salarySlip.hrSalarySlipID,
        },
      },
    );

    return res.status(200).json({
      status: 200,
      message:
        holdStatus == 'hold'
          ? 'Salary holded successfully'
          : 'Salary unholded successfully',
    });
  } catch (error) {
    next(error);
  }
};
