const {
  paymentMode,
  companyMasterIDENUM,
  mailCronTypes,
  UserTypesEnum,
  payheadMasterIdsMapping,
} = require('./dbUtils');
const {
  showPayWithSalary,
  ProjectName,
  projectNamesList,
} = require('./labelUtils');

const userAttributes = [
  'userMasterID',
  'firstName',
  'middleName',
  'lastName',
  'displayName',
  'companyMasterId',
  'email',
  'userNumber',
  'photo',
  'firebaseToken',
  'deviceType',
];

const companyAttributes = [
  'companyMasterID',
  'companyName',
  'companyLogo',
  'companyWebsite',
  'fileUploadType',
];

const statusCodes = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER: 500,
};

const roles = {
  ADMIN: 'admin',
  USER: 'user',
};

const reqObjectType = {
  BODY: 'body',
  PARAMS: 'params',
  QUERY: 'query',
};

const reviewFormAssignTo = {
  REVIEWER: 'reviewer',
  REVIEWEE: 'reviewee',
};

const salaryRegisterFormatFields = {
  employeeCode: 'Employee Code',
  employeeName: 'Employee Name',
  contactNo: 'Contact No',
  gender: 'Gender',
  company: 'Company',
  branch: 'Branch',
  department: 'Department',
  designation: 'Designation',
  division: 'Division',
  workingArea: 'Working Area',
  joiningDate: 'Joining Date',
  salaryType: 'Salary Type',
  accountNo: 'Account No',
  IFSCNo: 'IFSC No',
  ESICNo: 'ESIC No',
  UANNo: 'UAN No',
  paidDays: 'Paid Days',
  unPaidDays: 'UnPaid Days',
  attendanceBonusDays: 'Attendance Bonus Days',
  extraDays: 'Extra Days Count',
  workingHrs: 'Working Hours',
  overtimeHrs: 'Overtime Hours',
  present: 'Present',
  absent: 'Absent',
  weekoff: 'WeekOff',
  holiday: 'Holiday',
  paidLeave: 'Paid Leave',
  unpaidLeave: 'Unpaid Leave',
  attendancePenalty: 'Attendance Penalty',
  totalDays: 'Total Days',
  monthDays: 'Month Days',
  PANNo: 'Pan Number',
};
const pngGenerateSalaryFileParams = {
  paymentMethod: 'ACH',
  debitAccountNumber: '11073567',
  paymentCurrency: 'PGK',
  country: 'PG',
};

const companyPlanwiseForms = [
  'WorkingArea',
  'Division',
  'LateInEarlygoPolicy',
  'ShortLeavePolicy',
  'AttendanceBonusPolicy',
  'FoodAllowancePolicy',
  'ProjectMaster',
];
const subscriptionTypes = {
  TRIAL: 'Trial',
  ORDER_RECEIVED: 'Order',
  RENEWAL: 'Renew',
  PLAN_CHANGE: 'Plan-Change',
  PLAN_EXTENDED: 'Plan-Extended',
};

const companyTypes = {
  PARENT_COMPANY: 'PARENT',
  CHILD_COMPANY: 'CHILD',
  ALL: 'ALL',
};

const adminDashboardTypesObj = {
  TOTAL_COMPANY: 'totalCompany',
  TOTAL_ACTIVE_COMPANY: 'totalActiveCompany',
  TOTAL_DEACTIVE_COMPANY: 'totalDeActiveCompany',
  TOTAL_CURRENT_MONTH_RENEWAL_COMPANY: 'totalCurrentMonthRenewalCompany',
  TOTAL_EXPIRED_PLAN_COMPANY: 'totalExpiredPlanCompany',
};
const attendanceStatusForCalender = {
  HOLIDAY: 'Holiday',
  WEEKOFF: 'WeekOff',
  WEEKOFF_SECONDHALF: 'WeekOff (SH)',
  MISS_PUNCH: 'Miss Punch',
  PRESENT: 'Present',
  SHORT_LEAVE: 'SHL',
  ABSENT: 'Absent',
  HALFDAY: 'Half Day',
  LATECOME: 'LC',
  EARLYGO: 'EG',
  ABSENT_HFD: 'Absent (HFD)',
  ABSENT_SANDWICH: 'Absent (S)',
  WEEKOFF_ABSENT: 'WA',
};

const DailyAttendanceSummaryDashboardFields = {
  PHYSICALPRESENT: 'Physical Present',
  LEAVE: 'Leave',
  OUTDOORDUTY: 'Outdoor Duty',
  WORKFROMHOME: 'Work From Home',
  WEEKOFF_HOLIDAY: 'Weekoff-Holiday',
};

const officeExpenseTypes = {
  BRANCH: 'Branch',
  SITE: 'Site',
};

const trackStatusLabels = {
  IN_OFFICE: 'In-Office',
  OUT_OFFICE: 'Out-Office',
  PUNCH_OUT: 'Punch-Out',
  NOT_PUNCH_IN: 'Not Punch-In',
};
const basicPaymentOptionsArray = [
  paymentMode.CASH,
  paymentMode.CHEQUE,
  paymentMode.UPI,
  paymentMode.NETBANKING,
];
const paymentOptionsForExensePayment = [
  paymentMode.CASH,
  paymentMode.NETBANKING,
  paymentMode.EXPENSEADVANCE,
];
if (showPayWithSalary) {
  paymentOptionsForExensePayment.push(paymentMode.PAYWITHSALARY);
}
if (ProjectName != projectNamesList.MARS) {
  paymentOptionsForExensePayment.push(paymentMode.CHEQUE);
  paymentOptionsForExensePayment.push(paymentMode.UPI);
}
const authStatusType = [
  { name: 'Pending', value: 2 },
  { name: 'Approved', value: 1 },
  { name: 'Rejected', value: 0 },
];
const authStatusTypeObj = { PENDING: 2, APPROVED: 1, REJECTED: 0 };
const erpStoredProcedures = {
  GET_USERWISE_CLOSING_BALANCE: 'MCCS_Veritrack_TAD_Account_CLBalance',
  ADVANCE_EXPENSE_ERP_SYNC: 'MHIL_BankPayment_InsertQueryJV',
  ERP_TADA_ACCOUNT: 'MHIL_Tankhwapatra_TAD_AccountMaster_INSERT',
  ERP_EMPLOYEE_MASTER_ACCOUNT: 'MHIL_Tankhwapatra_EMP_AccountMaster_INSERT',
  ERP_EMPLOYEE_MASTER_ACCOUNT_LIST: 'MHIL_Tankhwapatra_EMP_AccountMaster_List',
  ERP_EMPLOYEE_MASTER_LEAVINGDATE:
    'MHIL_Tankhwapatra_EMP_AccountMaster_LeavingDate',
};

const expenseAdvanceRequestDateFilterType = {
  On_Approval_Date: 1,
  On_Paid_Date: 2,
  On_Payment_Date: 3,
  On_Apply_Date: 4,
};

const sortFields = {
  EMPLOYEENAME: 'EMPLOYEENAME',
  EMPLOYEECODE: 'EMPLOYEECODE',
};

const EAppName = Object.freeze({
  API: 'api',
  REPORT_SOCKET: 'report-socket',
});
const envType = Object.freeze({
  PRODUCTION: 'production',
  DEVELOPMENT: 'development',
  QA: 'qa',
  STAGE: 'stage',
});

const mehtaServiceAPIRoutes = Object.freeze({
  GET_EMPLOYEE_SERVICE_LIST: 'complainMaster/getEngineerCheckedInList/',
  GET_COMPLAIN_VISITLOGS_BY_COMPLAIN_NO: 'complainVisitLogs/by-complain-no/',
  GET_COMPLAIN_VISITLOGS_BY_USER_DATEWISE: 'complainVisitLogs/by-engineer',
});
const paMUSTERROLLReportTypes = Object.freeze({
  FORM_XVI: 1,
  FORM_NO_28: 2,
});
const mehtaERPCompanyMasterIDs = Object.freeze([
  companyMasterIDENUM.MEHTA_HIGHTECH_INDUSTRIES,
  companyMasterIDENUM.MEHTA_SOFTECH_PVT_LTD,
]);

const visitMeetingStatus = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  RESCHEDULED: 'Rescheduled',
};

const meetingType = {
  ONLINE: 'Online',
  OFFLINE: 'Offline',
};

const mailCronNameObj = Object.freeze({
  [mailCronTypes.ATTENDANCE_REPORT]: 'Attendance Report',
  [mailCronTypes.DAILY_PUNCH_IN_OUT]: 'Daily PunchIn-Out Report',
  [mailCronTypes.DAILY_PHYSICAL_PRESENT_ABSENT_REPORT]:
    'Daily Physical Present Absent Report',
  [mailCronTypes.PREVIOUS_DAY_PHYSICAL_PRESENT_ABSENT_REPORT]:
    'Previous Day Physical Present Absent Report',
  [mailCronTypes.MISS_PUNCH_REPORT]: 'Miss Punch Report',
  [mailCronTypes.LEAVE_REPORT]: 'Leave Report',
  [mailCronTypes.DAILY_LEAVE]: 'Daily Leave Report',
  [mailCronTypes.FY_LEAVE_REPORT]: 'FY Leave Report',
  [mailCronTypes.VISIT_REPORT]: 'Visit Report',
  [mailCronTypes.LC_EG_REPORT]: 'Late-Come Early-Go Report',
  [mailCronTypes.SHIFT_DEPARTMENTWISE_ATTENDANCE_COUNT_REPORT]:
    'Shift DepartmentWise Attendance Count Report',
  [mailCronTypes.DEPARTMENTWISE_DAILY_COST_REPORT]:
    'DepartmentWise Daily Cost Report',
  [mailCronTypes.BIRTHDAY]: 'Birthday Wish',
  [mailCronTypes.WORK_ANNIVERSARY]: 'Work Anniversary',
});

const attendanceDetailedReportFields = {
  employeeNumber: 'Mobile Number',
  joiningDate: 'Joining Date',
  company: 'Company',
  branch: 'Branch',
  department: 'Department',
  designation: 'Designation',
  division: 'Division',
  workingArea: 'Working Area',
  employmentType: 'Employeement Type',
  employeeReportsTo: 'Reports To',
  officialEmail: 'Official E-Mail',
  maritalStatus: 'Marital status',
  cugNumber: 'Cug Number',
  esicNumber: 'Esic Number',
  adharName: 'Name As Aadhar',
  uanNumber: 'Uan Number',
  dateOfBirth: 'Date of Birth',
  age: 'Age',
  gender: 'Gender',
  leavingDate: 'Leaving Date',
  employeeType: 'Employee Type',
  salaryCalculationAct: 'Salary Calculation Act',
  fullMonthPresence: 'Full Month Presence',

  // special fields
  allDateWiseAttendance: 'All Date-wise Attendance',
  attendanceSummary: 'Attendance Summary',
};
const orderByEmployeeMasterFields = {
  EMPLOYEENAME: 'EMPLOYEENAME',
  EMPLOYEECODE: 'EMPLOYEECODE',
  CREATEDAT: 'CREATEDAT',
};
const lwfDeductionType = {
  YEARLY: 'yearly',
  HALFYEARLY: 'halfYearly',
  MONTHLY: 'monthly',
};

const expenseRuleType = {
  ACCOMMODATION: 'accommodation',
  FOOD: 'food',
  LOCALTRANSPORT: 'localTransport',
  OWNVEHICLE: 'ownVehicle',
  OUTSTAIONTRAVEL: 'outstationTravel',
};

const pipActions = {
  CLOSE_REVIEW: 'closeReview',
  EXTEND_REVIEW: 'extendReview',
  TERMINATE: 'terminate',
};

const probationAssessmentFieldType = {
  RATINGS: 'ratings',
  TEXT_AREA: 'textArea',
  LABEL: 'label',
};

const newRegimeInclude_Sub_Section_Ids = [6];

const perDaySalaryReportFormatEnum = {
  FORMAT_1: 'Format-1',
  FORMAT_2: 'Format-2',
};

const adminUserTypes = Object.freeze([
  UserTypesEnum.SUPER_ADMIN,
  UserTypesEnum.SUB_ADMIN,
  UserTypesEnum.DEALER,
  UserTypesEnum.HRM,
  UserTypesEnum.RM,
  UserTypesEnum.HRM_HEAD,
  UserTypesEnum.RM_HEAD,
  UserTypesEnum.MARKETING_PERSON,
]);
const adminUserTypesSet = new Set(adminUserTypes);

const formOperation = {
  CREATE: 'Create',
  EDIT: 'Edit',
  VIEW: 'View',
  DELETE: 'Delete',
  SHOW_MENU: 'Show Menu',
  DOWNLOAD: 'Download',
  SYNC: 'Sync',
};

const validMaritalStatus = [
  'Single',
  'Married',
  'Widowed',
  'Separated',
  'Divorced',
];

const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const customClientTypes = Object.freeze({
  WEB: 'web',
  MOBILE: 'mobile',
});

const cookieNamesEnum = Object.freeze({
  AUTHENTICATION_TOKEN: 'auth_token',
});

const AuthByEnum = {
  MULTIPLE: 'MULTIPLE',
  SINGLE: 'SINGLE',
};

const certificateExpiryTypeEnum = Object.freeze({
  LIFETIME: 'LIFETIME',
  DAYS: 'DAYS',
});

const AttendanceLockMessage = Object.freeze({
  ATTN_VERIFY: 'Attendance verified.',
  MODIFICATION_RESTRICTION: 'Attendance modification period expired.',
});

const PFCalculationCompanyIds =
  ProjectName == projectNamesList.TANKHWA_PATRA
    ? {
        [companyMasterIDENUM.N_S_Construction]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: true,
        },

        [companyMasterIDENUM.MEHTA_HIGHTECH_INDUSTRIES]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.MEHTA_SOFTECH_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.MEHTA_EXPAI]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.MEHTA_ELECTONICS]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.MEHTA_EQUITIES_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.APSC_EMART_LLP]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.ALISHAN_GREEN_ENERGY_PVT_LTD]: {
          newRuleDays: 9,
          oldRuleDays: 22,
          isRoundOff: false,
        },

        [companyMasterIDENUM.ALISHAN_SOLAR_PVT_LTD]: {
          newRuleDays: 9,
          oldRuleDays: 22,
          isRoundOff: false,
        },

        [companyMasterIDENUM.ALISHAN_GREEN_ENERGY_PVT_LTD_UNIT_2]: {
          newRuleDays: 9,
          oldRuleDays: 22,
          isRoundOff: false,
        },

        [companyMasterIDENUM.GLOBE_ELV_SOLUTION_LLP]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.BRISK_SURGICAL_COTTON_LTD_BELAGAVI]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.BRISK_SURGICAL_COTTON_LTD_INDUSTRIES]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.BRISK_SURGICAL_COTTON_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.FTA_HSRP_SOLUTION_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.MKC_2]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.NAVBODH_PRAKASHAN]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: true,
        },

        [companyMasterIDENUM.YUGBODH_DIGITAL_PRINTS]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: true,
        },

        // --------------- RAJVI'S ALL COMPANIES ---------------------------

        [companyMasterIDENUM.RAJVI_ESTATE_LLP]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.RAJVI_PETROLIUM]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.SHREE_RAJVI_RESIDENCY]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.PRIME_ESTATE]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.ROYAL_CHEMIST]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.CASUAL]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.R_TOWN_ESTATE_LLP]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.RAJVEE_RESORTS_AND_HOTELS_PRIVATE_LIMITED]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.SHREE_RIVIERA_ELEGANCE_CO_OPERATIVE_HOUSING_SERVICE]:
          {
            newRuleDays: 14,
            oldRuleDays: 16,
            isRoundOff: false,
          },

        [companyMasterIDENUM.KANDLA_GATEWAY_ESTATE_LLP]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        // --------------------------------------------

        [companyMasterIDENUM.TOPLINE_SWITCHGEAR_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.UA_AGRO_SOLUTION_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.VERDE_AGROTECH_INDIA_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.RESILIENCE_HOSPITALITY]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.RESILIENCE_SERVICES]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.OMSREE_MARKETING_SOLUTION]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.AYUSHMATH]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.SAMANAM_FOOD_PRIVATE_LIMITED]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.MEHTA_SOFTECH_PRIVATE_LIMITED_2]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.KESAR_CONTROL_SYSTEMS_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.KESAR_CONTROL_SYSTEMS_PVT_LTD_CASH]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.KESAR_TESTING_SERVICE_LLP]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.DGM_AUTOMATION_INDIA_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.ZEVIS_PERFORMANCE_ADDITIVIES_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.HEXACOOL_PROCESS_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.HEXACOOL_AUXILIARY_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.PENTAGRAM_TECHNO_PRODUCTS_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.SNEHAL_TURNKEY_SOLUTIONS_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.MIPADH_ENGINEERS_LIMITED]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.BESO_ENTERPRISES_PRIVATE_LIMITED]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.BESO_ENTERPRISES]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.EMBOSS]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.AMMAN_ASSOCIATE_SERVICES_PRIVATE_LIMITED]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: true,
        },

        [companyMasterIDENUM.KRISHNA_CORPINDIA_PRIVATE_LIMITED]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.RAGHAV_ADVERTISING]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.GYAYAK_HOSPITAL_PRIVATE_LIMITED]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.PROPACK_SHREINER_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },

        [companyMasterIDENUM.MARUTI_KOATSU_CYLINDER_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.CHHATRESHWARY_LOGISTIC_PRIVATE_LIMITED]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.RAGHAV_PARIVAAR]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.RAGHAVAM_LOGISTICS_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.RAGHAV_ENTERPRISES]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.CHHATTISGARH_DISTRIBUTORS]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.SEMANTIC_INFRA_PROJECTS_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.SPECTRUM_TECH_N_FAB_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.DIGIZAC_SOLUTION_INDIA_PVT_LTD]: {
          newRuleDays: 4,
          oldRuleDays: 27,
          isRoundOff: false,
        },
        [companyMasterIDENUM.PAYAL_CONSTRUCTION]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.KRISHNA_CORPORATION]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.ASHVIN_PRESSING_COMPONENTS]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.FLOWTECH]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.KRISHNA_ENVIRO_ENGINEERS]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.VIDHART_CORPINDIA_PRIVATE_LIMITED]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.JAY_BUILDERS]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.PRAMODA_CORPINDIA_PRIVATE_LIMITED]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.KRISHNA_DARSHAN_ENVRIRO_CARE_PRIVATE_LIMITED]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.REMEDIES_HEALTH_CARE]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.G_I_HEALTHCARE_PVT_LTD]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.DIVINE_EMPIRE]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.ATHARV_PUBLIC_SCHOOL]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
        [companyMasterIDENUM.SRI_SAI_BASAVA_SUGARS_LIMITED]: {
          newRuleDays: 14,
          oldRuleDays: 16,
          isRoundOff: false,
        },
      }
    : {};

const PFCalculationMonth = [202609];
const NewRuleCapping = {
  [payheadMasterIdsMapping.PF]: 3000,
  [payheadMasterIdsMapping.EPF]: 917,
  [payheadMasterIdsMapping.EPS]: 2083,
  [payheadMasterIdsMapping.ADMIN_CHARGES]: 125,
  [payheadMasterIdsMapping.EDLI]: 125,
};

const SepMonthPFCapping = {
  [payheadMasterIdsMapping.PF]: 2360,
  [payheadMasterIdsMapping.EPF]: 721,
  [payheadMasterIdsMapping.EPS]: 1639,
  [payheadMasterIdsMapping.ADMIN_CHARGES]: 98,
  [payheadMasterIdsMapping.EDLI]: 98,
};

const OldPFRuleEndDate = '2026-09-16';
const attachmentFilePathFolderNames = Object.freeze({
  EXPENSE_ATTACHMENT: 'expenseAttachment',
  USER_TASK: 'userTask', //done
  SALARY_SLIP: 'salarySlip',
  PAYROLL_STATUTORY_SALARY_SLIP: 'payrollStatutorySalarySlip',
  ATTENDANCE_CUSTOMIZE_FIELD: 'attendanceCustomizeField',
  ATTENDANCE_ATTACHMENT: 'attendanceAttachment',
  ATTENDANCE_PHOTO: 'attendanceLogs',
  VEHICLE_METER: 'vehicleMeter',
  EMPLOYEE_NDA_FILE: 'employeeNda',
  USER_TASK_REMARKS: 'userTaskRemarks',
});
module.exports = {
  certificateExpiryTypeEnum,
  lwfDeductionType,
  salaryRegisterFormatFields,
  userAttributes,
  companyAttributes,
  statusCodes,
  roles,
  reqObjectType,
  reviewFormAssignTo,
  pngGenerateSalaryFileParams,
  companyPlanwiseForms,
  subscriptionTypes,
  companyTypes,
  adminDashboardTypesObj,
  attendanceStatusForCalender,
  DailyAttendanceSummaryDashboardFields,
  officeExpenseTypes,
  trackStatusLabels,
  basicPaymentOptionsArray,
  paymentOptionsForExensePayment,
  authStatusType,
  authStatusTypeObj,
  erpStoredProcedures,
  expenseAdvanceRequestDateFilterType,
  sortFields,
  EAppName,
  envType,
  mehtaServiceAPIRoutes,
  paMUSTERROLLReportTypes,
  mehtaERPCompanyMasterIDs,
  visitMeetingStatus,
  meetingType,
  mailCronNameObj,
  attendanceDetailedReportFields,
  orderByEmployeeMasterFields,
  expenseRuleType,
  pipActions,
  probationAssessmentFieldType,
  newRegimeInclude_Sub_Section_Ids,
  perDaySalaryReportFormatEnum,
  adminUserTypes,
  adminUserTypesSet,
  formOperation,
  validBloodGroups,
  validMaritalStatus,
  customClientTypes,
  cookieNamesEnum,
  AuthByEnum,
  AttendanceLockMessage,
  PFCalculationCompanyIds,
  PFCalculationMonth,
  NewRuleCapping,
  OldPFRuleEndDate,
  SepMonthPFCapping,
  attachmentFilePathFolderNames,
};
