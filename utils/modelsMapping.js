const advancePayment = require('../models/advancePayment');
const aibiometric = require('../models/aibiometric');
const allocateOfficeExpense = require('../models/allocateOfficeExpense');
const announcement = require('../models/announcement');
const anonymousFeedback = require('../models/anonymousFeedback');
const appointment = require('../models/appointment');
const approvedLeaveAuthorization = require('../models/approvedLeaveAuthorization');
const appVersion = require('../models/appVersion');
const assetCategory = require('../models/assetCategory');
const assetMaster = require('../models/assetMaster');
const assignAssetToEmployee = require('../models/assignAssetToEmployee');
const attendanceAuthorization = require('../models/attendanceAuthorization');
const attendanceBonusPolicy = require('../models/attendanceBonusPolicy');
const attendanceCorrection = require('../models/attendanceCorrection');
const attendanceCorrectionAuthorization = require('../models/attendanceCorrectionAuthorization');
const attendanceCorrectionLogs = require('../models/attendanceCorrectionLogs');
const attendanceCorrectionReason = require('../models/attendanceCorrectionReason');
const attendanceCorrectionRequest = require('../models/attendanceCorrectionRequest');
const attendancelogs = require('../models/attendancelogs');
const attendancePolicy = require('../models/attendancePolicy');
const attendanceTransaction = require('../models/attendanceTransaction');
const auditLogs = require('../models/auditLogs');
const authorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const authorizationMaster = require('../models/authorizationMaster');
const authorizationRequest = require('../models/authorizationRequest');
const autoMailSetup = require('../models/autoMailSetup');
const bankBranch = require('../models/bankBranch');
const bankMaster = require('../models/bankMaster');
const bankStatementFormat = require('../models/bankStatementFormat');
const biometricIntegration = require('../models/biometricIntegration');
const branchMaster = require('../models/branchMaster');
const callfollowup = require('../models/callfollowup');
const citymaster = require('../models/citymaster');
const coffMaster = require('../models/coffMaster');
const companyDocument = require('../models/companyDocument');
const companyDocumentType = require('../models/companyDocumentType');
const companyLetterFormat = require('../models/companyLetterFormat');
const companyLetterhead = require('../models/companyLetterhead');
const companyMaster = require('../models/companyMaster');
const companyRegister = require('../models/companyRegister');
const companytypeMaster = require('../models/companytypeMaster');
const companywiseReport = require('../models/companywiseReport');
const costCenter = require('../models/costCenter');
const countrymaster = require('../models/countrymaster');
const customer = require('../models/customer');
const dailyTask = require('../models/dailyTask');
const datewiseAttendancepolicy = require('../models/datewiseAttendancepolicy');
const department = require('../models/department');
const deposit = require('../models/deposit');
const depositCategory = require('../models/depositCategory');
const designation = require('../models/designation');
const documentList = require('../models/documentList');
const empLetterHead = require('../models/empLetterHead');
const employeeAccident = require('../models/employeeAccident');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const employeeBranch = require('../models/employeeBranch');
const employeeDepartment = require('../models/employeeDepartment');
const employeeDesignation = require('../models/employeeDesignation');
const employeeDigitalSignature = require('../models/employeeDigitalSignature');
const employeeEmployeement = require('../models/employeeEmployeement');
const employeeHolidayPolicy = require('../models/employeeHolidayPolicy');
const employeeIncentive = require('../models/employeeincentive');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const employeeNda = require('../models/employeeNda');
const employeePenalty = require('../models/employeePenalty');
const employeeReportTo = require('../models/employeeReportTo');
const employeeResignation = require('../models/resignation');
const employeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const employeeShift = require('../models/employeeShift');
const employeeWeekOff = require('../models/employeeWeekOff');
const employeement = require('../models/employeement');
const erpAccountMaster = require('../models/erpAccountMaster');
const esicSetup = require('../models/esicSetup');
const executionstatus = require('../models/executionstatus');
const expencePriceRule = require('../models/expencePriceRule');
const expenseAuthorization = require('../models/expenseAuthorization');
const expenseCategory = require('../models/expenseCategory');
const expenseHead = require('../models/expenseHead');
const expensePayment = require('../models/expensePayment');
const form16 = require('../models/form16');
const form16child = require('../models/form16child');
const formAuthorizationDetails = require('../models/formAuthorizationDetails');
const formMaster = require('../models/formMaster');
const formauthorizationRequest = require('../models/authorizationRequest');
const gatePass = require('../models/gatePass');
const gradeSalaryStructure = require('../models/gradeSalaryStructure');
const gradeStructure = require('../models/gradeStructure');
const holidayList = require('../models/holidayList');
const holidayPolicy = require('../models/holidayPolicy');
const hrLeaveBalance = require('../models/hrLeaveBalance');
const hrLeaveMaster = require('../models/hrLeaveMaster');
const hrLeavesMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const hrLeaveTypes = require('../models/hrLeaveTypes');
const hrSalaryFieldChild = require('../models/hrSalaryFieldChild');
const hrSalaryFields = require('../models/hrSalaryFields');
const hrSalaryMaster = require('../models/hrSalaryMaster');
const HRSalarySlip = require('../models/hrSalarySlip');
const hrSalaryTransaction = require('../models/hrSalaryTransaction');
const hrToolKit = require('../models/hrToolKit');
const incentiveType = require('../models/incentivetype');
const incrementAuthorization = require('../models/incrementAuthorization');
const investmentdetails = require('../models/investmentdetails');
const leaveAuthorization = require('../models/leaveAuthorization');
const letterFields = require('../models/letterFields');
const letterHead = require('../models/letterHead');
const letterTemplateEditor = require('../models/letterTemplateEditor');
const letterTemplateType = require('../models/letterTemplateType');
const loanAdvance = require('../models/loanAdvance');
const loanMaster = require('../models/loanMaster');
const loanTransaction = require('../models/loanTransaction');
const mailConfiguration = require('../models/mailConfiguration');
const mailFields = require('../models/mailFields');
const mailTemplateEditor = require('../models/mailTemplateEditor');
const mailTemplateType = require('../models/mailTemplateType');
const manualOldAttendance = require('../models/manualOldAttendance');
const meetingPlace = require('../models/meetingPlace');
const moduleDetails = require('../models/moduleDetails');
const moduleList = require('../models/moduleList');
const monthlySkillsetsform = require('../models/monthlySkillsetsform');
const notificationPolicy = require('../models/notificationPolicy');
const operation = require('../models/operation');
const otherpaymentdetails = require('../models/otherpaymentdetails');
const overTimeCalculation = require('../models/overTimeCalculation');
const overTimeCalculationMain = require('../models/overTimeCalculationMain');
const overTimePolicy = require('../models/overTimePolicy');
const overtimeAuthorization = require('../models/overtimeAuthorization');
const payhead = require('../models/payhead');
const penalty = require('../models/penalty');
const pfSetup = require('../models/pfSetup');
const policyDocuments = require('../models/policyDocuments');
const preboarding = require('../models/preboarding');
const preboardingformcustomize = require('../models/preboardingformcustomize');
const preboardingformcustomizevalue = require('../models/preboardingformcustomizevalue');
const preboardingrequest = require('../models/preboardingrequest');
const probationPolicy = require('../models/probationPolicy');
const product = require('../models/product');
const productMaster = require('../models/productMaster');
const professionalTaxSetup = require('../models/professionalTaxSetup');
const professionalTaxmaster = require('../models/professionaltaxmaster');
const quartertaxchallan = require('../models/quartertaxchallan');
const resignProcess = require('../models/resignProcess');
const resignationAuthorization = require('../models/resignationAuthorization');
const resignTask = require('../models/resignTask');
const resignTaskAssign = require('../models/resignTaskAssign');
const resignation = require('../models/resignation');
const salaryPolicy = require('../models/salaryPolicy');
const shift = require('../models/shift');
const shiftTime = require('../models/shiftTime');
const skillsets = require('../models/skillsets');
const skillsetsform = require('../models/skillsetsform');
const stateMaster = require('../models/statemaster');
const subscriptionPlan = require('../models/subscriptionPlan');
const taskremark = require('../models/taskremark');
const tasks_stages = require('../models/tasks_stages');
const taxchallanmaster = require('../models/taxchallanmaster');
const tdsslabmaster = require('../models/tdsslabmaster');
const test = require('../models/test');
const ticket = require('../models/ticket');
const ticketCategory = require('../models/ticketCategory');
const ticketSubCategory = require('../models/ticketSubCategory');
const ticketUpdates = require('../models/ticketUpdates');
const toursMaster = require('../models/toursMaster');
const tracking = require('../models/tracking');
const userActivity = require('../models/userActivity');
const userAddress = require('../models/userAddress');
const userAnnouncement = require('../models/userAnnouncement');
const userChats = require('../models/userChats');
const userDocument = require('../models/userDocument');
const userEducation = require('../models/userEducation');
const userExpense = require('../models/userExpense');
const userExpenseTransaction = require('../models/userExpenseTransaction');
const userExperience = require('../models/userExperience');
const userFamily = require('../models/userfamily');
const userleave = require('../models/userleave');
const userLeaveTransaction = require('../models/userLeaveTransaction');
const userLetters = require('../models/userLetters');
const userMaster = require('../models/userMaster');
const userOverTimePolicyAssign = require('../models/userOverTimePolicyAssign');
const userSkills = require('../models/userSkills');
const userTracking = require('../models/userTracking');
const vehicleUsage = require('../models/vehicleUsage');
const visit = require('../models/visit');
const visitformcustomize = require('../models/visitformcustomize');
const visitformcustomizevalue = require('../models/visitformcustomizevalue');
const visitPurpose = require('../models/visitPurpose');
const visitReportCustomize = require('../models/visitreportcustomize');
const visitReportCustomizeValue = require('../models/visitreportcustomizevalue');
const visitReportMaster = require('../models/visitReportMaster');
const visitors = require('../models/visitors');
const weekOffOptions = require('../models/weekOffOptions');
const weekOffPolicy = require('../models/weekOffPolicy');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');

exports.ModelsMapping = {
  advancePayment,
  aibiometric,
  allocateOfficeExpense,
  announcement,
  anonymousFeedback,
  appointment,
  approvedLeaveAuthorization,
  appVersion,
  assetCategory,
  assetMaster,
  assignAssetToEmployee,
  attendanceAuthorization,
  attendanceBonusPolicy,
  attendanceCorrection,
  attendanceCorrectionAuthorization,
  attendanceCorrectionLogs,
  attendanceCorrectionReason,
  attendanceCorrectionRequest,
  attendancelogs,
  attendancePolicy,
  attendanceTransaction,
  auditLogs,
  authorizationCriteriaMaster,
  AuthorizationDetails,
  authorizationMaster,
  authorizationRequest,
  autoMailSetup,
  bankBranch,
  bankMaster,
  bankStatementFormat,
  biometricIntegration,
  branchMaster,
  callfollowup,
  citymaster,
  coffMaster,
  companyDocument,
  companyDocumentType,
  companyLetterFormat,
  companyLetterhead,
  companyMaster,
  companyRegister,
  companytypeMaster,
  companywiseReport,
  costCenter,
  countrymaster,
  customer,
  dailyTask,
  datewiseAttendancepolicy,
  department,
  deposit,
  depositCategory,
  designation,
  documentList,
  empLetterHead,
  employeeAccident,
  EmployeeAttendancePolicy,
  employeeBranch,
  employeeDepartment,
  employeeDesignation,
  employeeDigitalSignature,
  employeeEmployeement,
  employeeHolidayPolicy,
  employeeIncentive,
  EmployeeJoiningDetails,
  employeeNda,
  employeePenalty,
  employeeReportTo,
  employeeResignation,
  employeeSalaryPolicy,
  employeeShift,
  employeeWeekOff,
  employeement,
  erpAccountMaster,
  esicSetup,
  executionstatus,
  expencePriceRule,
  expenseAuthorization,
  expenseCategory,
  expenseHead,
  expensePayment,
  form16,
  form16child,
  formAuthorizationDetails,
  formMaster,
  formauthorizationRequest,
  gatePass,
  gradeSalaryStructure,
  gradeStructure,
  holidayList,
  holidayPolicy,
  hrLeaveBalance,
  hrLeaveMaster,
  hrLeavesMonthlyTrans,
  hrLeaveTypes,
  hrSalaryFieldChild,
  hrSalaryFields,
  hrSalaryMaster,
  HRSalarySlip,
  hrSalaryTransaction,
  hrToolKit,
  incentiveType,
  incrementAuthorization,
  investmentdetails,
  leaveAuthorization,
  letterFields,
  letterHead,
  letterTemplateEditor,
  letterTemplateType,
  loanAdvance,
  loanMaster,
  loanTransaction,
  mailConfiguration,
  mailFields,
  mailTemplateEditor,
  mailTemplateType,
  manualOldAttendance,
  meetingPlace,
  moduleDetails,
  moduleList,
  monthlySkillsetsform,
  notificationPolicy,
  operation,
  otherpaymentdetails,
  overTimeCalculation,
  overTimeCalculationMain,
  overTimePolicy,
  overtimeAuthorization,
  payhead,
  penalty,
  pfSetup,
  policyDocuments,
  preboarding,
  preboardingformcustomize,
  preboardingformcustomizevalue,
  preboardingrequest,
  probationPolicy,
  product,
  productMaster,
  professionalTaxSetup,
  professionalTaxmaster,
  quartertaxchallan,
  resignProcess,
  resignationAuthorization,
  resignTask,
  resignTaskAssign,
  resignation,
  salaryPolicy,
  shift,
  shiftTime,
  skillsets,
  skillsetsform,
  stateMaster,
  subscriptionPlan,
  taskremark,
  tasks_stages,
  taxchallanmaster,
  tdsslabmaster,
  test,
  ticket,
  ticketCategory,
  ticketSubCategory,
  ticketUpdates,
  toursMaster,
  tracking,
  userActivity,
  userAddress,
  userAnnouncement,
  userChats,
  userDocument,
  userEducation,
  userExpense,
  userExpenseTransaction,
  userExperience,
  userFamily,
  userleave,
  userLeaveTransaction,
  userLetters,
  userMaster,
  userOverTimePolicyAssign,
  userSkills,
  userTracking,
  vehicleUsage,
  visit,
  visitformcustomize,
  visitformcustomizevalue,
  visitPurpose,
  visitReportCustomize,
  visitReportCustomizeValue,
  visitReportMaster,
  visitors,
  weekOffOptions,
  weekOffPolicy,
  weekoffHolidayTran,
};
