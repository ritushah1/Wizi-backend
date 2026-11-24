const TicketStatusEnum = {
  CREATED: 'Created',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  CLOSED: 'Closed',
  REOPEN: 'Reopen',
  CLOSED_BY_ASSIGNEE: 'Closed By Assignee',
};

const TicketPriorityEnum = {
  HIGH: 'High',
  LOW: 'Low',
  MEDIUM: 'Medium',
};

const DatabaseOperationEnum = {
  CREATE: 'Create',
  GET: 'Get',
  UPDATE: 'Update',
  DELETE: 'Delete',
};

const SentimentMoodEnum = {
  SAD: 'sad',
  HAPPY: 'happy',
  STRESSED: 'stressed',
  ANGRY: 'angry',
  NOT_SURE: 'notSure',
  OK: 'ok',
};

const EmployeeGoalStatusEnum = {
  OPEN: 'Open',
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In Progress',
};

const PmsPolicyEnum = {
  FINANCIAL_YEAR: 'FinancialYear',
  CALENDAR_YEAR: 'CalendarYear',
};

const GoalTypeEnum = {
  INDIVIDUAL: 'Individual',
  GROUP: 'Group',
};

const GoalEvaluationPeriodEnum = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUALLY: 'Annually',
  SEMI_ANNUALLY: 'Semi Annually',
};

const ReviewPeriodEnum = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  FORTNIGHTLY: 'Fortnightly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUALLY: 'Annually',
  SEMI_ANNUALLY: 'Semi Annually',
};

const ReviewQuestionsResponseType = {
  RATING: 'Rating',
  TEXT: 'Text',
  GRADE: 'Grade',
  RATING_AND_TEXT: 'Rating and Text',
  GRADE_AND_TEXT: 'Grade and Text',
};

const PerformanceReviewStatus = {
  INITIATED: 'Initiated',
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In Progress',
};

const notificationCronTypes = {
  PUNCH_IN: 'punchIn',
  PUNCH_OUT: 'punchOut',
  HOLIDAY: 'holiday',
  BIRTHDAY: 'birthday',
  WORK_ANNIVERSARY: 'workAnniversary',
  PROBATION_ASSESSMENT: 'probationAssessment',
  TASK: 'task',
};

const notificationCronTimeType = {
  BEFORE: 'before',
  AFTER: 'after',
};

const notificationCronTimeFormat = {
  DAYS: 'days',
  MINUTES: 'minutes',
  HOURS: 'hours',
};

const EmployeeGatepassStatusEnum = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECT: 'Reject',
};
const EmployeeGatepassPurposeEnum = {
  COMPANY: 'Company',
  PERSONAL: 'Personal',
  LUNCHDINNER: 'Lunch/Dinner',
};
const EmployeeGatepassCheckStatusEnum = {
  CHECKOUT: 'Checkout',
  CHECKIN: 'Checkin',
  FINAL: 'FinalCheckin',
};
const singleMultipleCheckInOutTypes = {
  SINGLE: 'Single',
  MULTIPLE: 'Multiple',
};
const mailCronTypes = {
  ATTENDANCE_REPORT: 'attendanceReport',
  DAILY_PUNCH_IN_OUT: 'dailypuncinoutReport',
  DAILY_PHYSICAL_PRESENT_ABSENT_REPORT: 'dailyPhysicalPresentAbsentReport',
  PREVIOUS_DAY_PHYSICAL_PRESENT_ABSENT_REPORT:
    'previousDayPhysicalPresentAbsentReport',
  MISS_PUNCH_REPORT: 'missPunchReport',
  LEAVE_REPORT: 'leaveReport', //
  DAILY_LEAVE: 'dailyleaveReport',
  FY_LEAVE_REPORT: 'FYleaveReport',
  VISIT_REPORT: 'visitReport',
  SHIFT_DEPARTMENTWISE_ATTENDANCE_COUNT_REPORT:
    'shiftdepartmentwiseDailyattendancecountReport',
  LC_EG_REPORT: 'lateComeEarlyGoReport',
  DEPARTMENTWISE_DAILY_COST_REPORT: 'departmentwiseDailyCostReport',
  BIRTHDAY: 'birthday',
  WORK_ANNIVERSARY: 'workAnniversary',
  DAILY_VISIT_REPORT: 'dailyVisitReport',
};
const roleType = {
  COMPANY_WISE: 'companyWise',
  BRANCH_WISE: 'branchWise',
};
const companyAccessType = {
  OWN_COMPANY: 'ownCompany',
  OWN_PLUS_CHILD_COMPANY: 'ownPlusChildCompany',
};

const FoodAllowanceTypeEnum = {
  NO_FOOD_ALLOWANCE: 'noFoodAllowance',
  ON_INOUT_TIME: 'onInOutTime',
  ON_WORKING_HOURS: 'onWorkingHours',
  ON_MONTH_DAYS: 'onMonthDays',
};

const TeaAllowanceTypeEnum = {
  NO_TEA_ALLOWANCE: 'noTeaAllowance',
  ON_IN_TIME: 'onInTime',
  ON_ATTN_STATUS: 'onAttnStatus',
};

const AllowanceTypeEnum = {
  FOOD_ALLOWANCE: 'food',
  TEA_ALLOEANCE: 'tea',
};

const JoiningRequestStatus = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECT: 'Reject',
};
const registrationStatus = {
  PENDING: 'Pending',
  REGISTERED: 'Registered',
};
const FileUploadType = {
  MOBILE_NUMBER: 'mobileNumber',
  EMPLOYEE_CODE: 'employeeCode',
};

const DateTimeType = {
  SEPERATED: 'seperate',
  COMBINED: 'combine',
};

const SkillCategoryType = {
  SKILLED: 'skilled',
  SEMISKILLED: 'semiskilled',
  UNSKILLED: 'unskilled',
  NOT_APPLICABLE: 'NA',
  SECURITY: 'security',
  STAFF: 'staff',
  APPRENTICE: 'apprentice',
};

const PenaltyDeductFromEnum = {
  ATTENDANCE: 'attendance',
  SALARY: 'salary',
};

const Nationality = [
  'Afghan',
  'Albanian',
  'Algerian',
  'Andorran',
  'Angolan',
  'Antiguan or Barbudan',
  'Argentine',
  'Armenian',
  'Australian',
  'Austrian',
  'Azerbaijani, Azeri',
  'Bahamian',
  'Bahraini',
  'Bangladeshi',
  'Bengali',
  'Barbadian',
  'Belarusian',
  'Belgian',
  'Belizean',
  'Beninese, Beninois',
  'Bhutanese',
  'Bolivian',
  'Bosnian or Herzegovinian',
  'Motswana, Botswanan',
  'Brazilian',
  'Bruneian',
  'Bulgarian',
  'Burkinabé',
  'Burmese',
  'Burundian',
  'Cabo Verdean',
  'Cambodian',
  'Cameroonian',
  'Canadian',
  'Central African',
  'Chadian',
  'Chilean',
  'Chinese',
  'Colombian',
  'Comoran, Comorian',
  'Congolese',
  'Congolese',
  'Costa Rican',
  'Ivorian',
  'Croatian',
  'Cuban',
  'Cypriot',
  'Czech',
  'Danish',
  'Djiboutian',
  'Dominican',
  'Dominican',
  'Timorese',
  'Ecuadorian',
  'Egyptian',
  'Salvadoran',
  'Equatorial Guinean, Equatoguinean',
  'Eritrean',
  'Estonian',
  'Ethiopian',
  'Fijian',
  'Finnish',
  'French',
  'Gabonese',
  'Gambian',
  'Georgian',
  'German',
  'Ghanaian',
  'Gibraltar',
  'Greek, Hellenic',
  'Grenadian',
  'Guatemalan',
  'Guinean',
  'Bissau-Guinean',
  'Guyanese',
  'Haitian',
  'Honduran',
  'Hungarian, Magyar',
  'Icelandic',
  'Indian',
  'Indonesian',
  'Iranian, Persian',
  'Iraqi',
  'Irish',
  'Israeli',
  'Italian',
  'Ivorian',
  'Jamaican',
  'Japanese',
  'Jordanian',
  'Kazakhstani, Kazakh',
  'Kenyan',
  'I-Kiribati',
  'North Korean',
  'South Korean',
  'Kuwaiti',
  'Kyrgyzstani, Kyrgyz, Kirgiz, Kirghiz',
  'Lao, Laotian',
  'Latvian, Lettish',
  'Lebanese',
  'Basotho',
  'Liberian',
  'Libyan',
  'Liechtensteiner',
  'Lithuanian',
  'Luxembourg, Luxembourgish',
  'Macedonian',
  'Malagasy',
  'Malawian',
  'Malaysian',
  'Maldivian',
  'Malian, Malinese',
  'Maltese',
  'Marshallese',
  'Martiniquais, Martinican',
  'Mauritanian',
  'Mauritian',
  'Mexican',
  'Micronesian',
  'Moldovan',
  'Monégasque, Monacan',
  'Mongolian',
  'Montenegrin',
  'Moroccan',
  'Mozambican',
  'Namibian',
  'Nauruan',
  'Nepali',
  'Dutch, Netherlandic',
  'New Zealand, NZ, Zelanian',
  'Nicaraguan',
  'Nigerien',
  'Nigerian',
  'Northern Marianan',
  'Norwegian',
  'Omani',
  'Pakistani',
  'Palauan',
  'Palestinian',
  'Panamanian',
  'Papua New Guinean, Papuan',
  'Paraguayan',
  'Peruvian',
  'Filipino, Philippine',
  'Polish',
  'Portuguese',
  'Puerto Rican',
  'Qatari',
  'Romanian',
  'Russian',
  'Rwandan',
  'Kittitian or Nevisian',
  'Saint Lucian',
  'Saint Vincentian, Vincentian',
  'Samoan',
  'Sammarinese',
  'São Toméan',
  'Saudi, Saudi Arabian',
  'Senegalese',
  'Serbian',
  'Seychellois',
  'Sierra Leonean',
  'Singapore, Singaporean',
  'Slovak',
  'Slovenian, Slovene',
  'Solomon Island',
  'Somali',
  'South African',
  'South Sudanese',
  'Spanish',
  'Sri Lankan',
  'Sudanese',
  'Surinamese',
  'Swazi',
  'Swedish',
  'Swiss',
  'Syrian',
  'Tajikistani',
  'Tanzanian',
  'Thai',
  'Timorese',
  'Togolese',
  'Tokelauan',
  'Tongan',
  'Trinidadian or Tobagonian',
  'Tunisian',
  'Turkish',
  'Turkmen',
  'Tuvaluan',
  'Ugandan',
  'Ukrainian',
  'Emirati, Emirian, Emiri',
  'UK, British',
  'United States, U.S., American',
  'Uruguayan',
  'Uzbekistani, Uzbek',
  'Ni-Vanuatu, Vanuatuan',
  'Vatican',
  'Venezuelan',
  'Vietnamese',
  'Yemeni',
  'Zambian',
  'Zimbabwean',
];

const nonEditableList_INC = [
  'attendance bonus',
  'food allowance',
  'tea/coffee allowance',
  'extra days',
];
const default_payheadMasterIds = [
  9, 16, 17, 24, 34, 43, 78, 83, 96, 97, 99, 1, 50, 92, 67, 101, 102, 103, 104,
  107, 112, 135, 123, 125, 126, 127, 133, 130, 122, 147, 116, 148, 151, 152,
];

const requiredUserTypeEnum = {
  National: '1',
  Expart: '2',
  Both: '3',
};

const leaveOperationENUM = {
  Encashment: 'Encashment',
  Lapse: 'Lapse',
  AddLeaveBalance: 'AddLeaveBalance',
  cancelLeaveEncashment: 'cancelLeaveEncashment',
  cancelLeaveEncashmentAndLapse: 'cancelLeaveEncashmentAndLapse',
  Encashment_IN_FNF: 'EncashmentInFNF',
};

const leaveEncashmentStatusEnum = {
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
  UNPAID: 'Un-Paid',
  LAPSED: 'Lapsed',
  ENCASH_IN_FNF: 'Settled-In-FNF',
};

const employeeRepaymentType = {
  ADVANCE: 'Advance',
  PENALTY: 'Penalty',
};

const paymentMode = {
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  UPI: 'UPI',
  WAIVE_OFF: 'Waive Off',
  NETBANKING: 'NetBanking',
  EXPENSEADVANCE: 'ExpenseAdvance',
  PAYWITHSALARY: 'PayWithSalary',
  CASHBOOK: 'CashBook',
};

const paymentMode_PaidSalary = {
  CASH: paymentMode.CASH,
  CHEQUE: paymentMode.CHEQUE,
  UPI: paymentMode.UPI,
  NETBANKING: paymentMode.NETBANKING,
  CASHBOOK: paymentMode.CASHBOOK,
};

const weekoffTypeEnum = {
  FIX: 'fix',
  MONTHLYFIX: 'monthlyFix',
  ONPAIDDAYS: 'onPaidDays',
  ONPHYSICALPRESENT: 'onPhysicalPresent',
  ONPRESENTDAY: 'onPresentDay',
};

const yearCycleEnum = {
  JAN_DEC: 'January to December',
  APRIL_MARCH: 'April to March',
};

const bonusCreditCycleEnum = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  HALFYEARLY: 'halfYearly',
  YEARLY: 'yearly',
};

const bonusCreditTypeEnum = {
  PREVIOUS: 'previous',
  CURRENT: 'current',
};

const bonusPaymentMode = {
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  UPI: 'UPI',
};

const frequencyENUM = {
  ONCE: 'once',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  FORTNIGHT: 'fortnight',
  MONTHLY: 'monthly',
};

const bonusPaymentType = {
  PAID: 'Paid',
  UNPAID: 'Un-Paid',
};

const PayrollFrequencyType = {
  MONTHLY: 'Monthly',
  FORTNIGHTLY: 'Fortnightly',
  WEEKLY: 'Weekly',
};

const TaxApplicabilityType = {
  TAXABLE: 'TX',
  NON_TAXABLE: 'NT',
  NOT_APPLICABLE: 'NA',
};

const letterTypesENUM = {
  TERMINATIONLETTER: 'terminationletter',
  OFFERLETTER: 'offerletter',
  EXPERIENCELETTER: 'experienceletter',
  JOININGLETTER: 'joiningletter',
  APPOINTMENTLETTER: 'appointmentletter',
};

const mailTemplateTypes = {
  leaveEmailTemplate: 1,
  expenseMailTemplate: 2,
  leaveRejectEmailTemplate: 3,
  leaveAcceptEmailTemplate: 4,
  expenseAcceptMailTemplate: 5,
  expenseRejectMailTemplate: 6,
  leaveUpdateEmailTemplate: 7,
  expenseUpdateMailTemplate: 8,
  offerLetterMailTemplate: 9,
  joiningLetterMailTemplate: 10,
  appointmentLetterMailTemplate: 11,
  experienceLetterMailTemplate: 12,
  terminationLetterMailTemplate: 13,
  incrementLetterMailTemplate: 14,
  outdoorDutyEmailTemplate: 15,
  outdoorDutyRejectEmailTemplate: 16,
  outdoorDutyAcceptEmailTemplate: 17,
  jobApplicationAcceptMailTemplate: 18,
  discrepancyMailTemplate: 19,
  jobApplicationRejectMailTemplate: 20,
  preBoardingAcceptMailTemplate: 21,
  preBoardingRejectMailTemplate: 22,
  preBoardingApplicationAcknowledgementMailTemplate: 23,
  jobApplicationAcknowledgementMailTemplate: 24,
  relievingLetterMailTemplate: 27,
  transferLetterMailTemplate: 28,
  disengagementLetterMailTemplate: 29,
  employmentProofCertificateTemplate: 30,
  confirmationLetterMailTemplate: 31,
};

const letterTemplateTypes = {
  offerLetterTemplate: 1,
  joiningLetterTemplate: 2,
  experienceLetterTemplate: 3,
  incrementLetterTemplate: 4,
  terminationLetterTemplate: 5,
  appointmentLetterTemplate: 6,
  discrepancyLetterTemplate: 7,
};

const authorizationMasterTypes = {
  leave: 1,
  expense: 2,
  overtime: 3,
  resignation: 5,
  employeeGatePass: 6,
  attendanceCorrection: 7,
  compensatoryOff: 8,
  probationAssessment: 9,
  statutoryDetail: 10,
  loan: 11,
  manPowerRequisition: 12,
  visit: 13,
  tour: 14,
  salaryIncrement: 15,
  lmsCourse: 16,
};

const organizationAuthorizationMasterTypes = {
  officeExpense: 1,
};

const InterViewTypeENUM = {
  VIRTUAL: 'virtual',
  INPERSON: 'inperson',
};

const preboardingStatusTypes = {
  SCREENING: 'Screening',
  INTERVIEW: 'Interview',
  ACCEPT: 'Accept',
  REJECT: 'Reject',
  ONHOLD: 'OnHold',
  ONBOARDED: 'OnBoarded',
  HRROUND: 'HR Round',
};

const customizeProfileFields = {
  companyName: 'Company Name',
  address: 'Address',
  employeeCode: 'Employee Code',
  employeeName: 'Employee Name',
  email: 'Email',
  contactNo: 'Contact No',
  department: 'Department',
  designation: 'Designation',
  branchName: 'Branch Name',
  dateOfBirth: 'Date Of Birth',
};
const attendaceTransType = {
  biometricNotValidated: 0,
  biometricNC: 1,
  biometricNC_SameTime: 2,
  tpMirrorNotValidated: 3,
  tpMirrorNC: 4,
  NEWIN_FOR_NEWDAY: 5,
  tpMirrorNC_SameTime: 6,
};

const attendanceTransactionType = {
  notValidated: 'Not Validated',
  notConsider: 'NC',
};

const attendanceDirection = {
  IN: 'in',
  OUT: 'out',
  NC: 'nc',
  NEWIN: 'NEWIN',
  CONTINUEIN: 'CONTINUEIN',
  NEWIN_FOR_NEWDAY: 'newin',
};

const RegimeType = {
  NEW_REGIME: 'New Regime',
  OLD_REGIME: 'Old Regime',
};

const allowedAttendanceSources = ['mobile', 'biometric', 'mobileandbiometric'];

const attendanceFromType = {
  MOBILE: 'mobile',
  BIOMETRIC: 'biometric',
  TPMIRROR: 'tpmirror',
  MOBILEANDBIOMETRIC: 'mobileandbiometric',
  MOBILEANDTPMIRROR: 'mobileandtpmirror',
};

const singleMultiplePunchInPunchOutTypes = {
  SINGLE: 'Single',
  MULTIPLE: 'Multiple',
};
const expenseTypes = {
  ALL: 'All',
  PERSONAL: 'Personal',
  PROJECT: 'Project',
  TOUR: 'Tour',
  VISIT: 'Visit',
  SERVICE: 'Service', //Only For Mehta HighTech
};
const expenseTypeArray = [
  { name: expenseTypes.PERSONAL, value: expenseTypes.PERSONAL },
  { name: expenseTypes.PROJECT, value: expenseTypes.PROJECT },
  { name: expenseTypes.TOUR, value: expenseTypes.TOUR },
  { name: expenseTypes.VISIT, value: expenseTypes.VISIT },
];

const authorizationCriteriaType = {
  ANYTWO: 3,
  ANYONE: 4,
  SEQUENCENO: 5,
  ANYTHREE: 6,
};

const expenseTypeArrayForDropDown = [
  { name: 'All', value: 'All' },
  { name: 'Personal', value: 'Personal' },
  { name: 'Project', value: 'Project' },
  { name: 'Tour', value: 'Tour' },
  { name: 'Visit', value: 'Visit' },
];

const expenseApprovalTypes = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PENDING: 'Pending',
  PAID: 'Paid',
};

const LCEGPenaltyTypeEnum = {
  MINUTE: 'min',
  DAY: 'day',
  PERCENT: 'percent',
  AMOUNT: 'amount',
  MONTHLY_PERCENT: 'monthlypercent',
};

// NCSL Deductions----

const NCSLDeductionsEnum = {
  GEN_SAVINGS: 'gen',
  EDU_SAVINGS: 'edu',
  XMAS_SAVINGS: 'xmas',
  PORO_CARD: 'poro',
  LOAN: 'loan',
  NASFUND_V_CONTRIBUTION: 'vnasfund',
  SALARY_SACRIFICE: 'salarysacrifice',
};

const NCSLDeductionsName = {
  gen: 'General Savings',
  edu: 'Educational Savings',
  xmas: 'X-Mas Savings',
  poro: 'Poro Card',
  loan: 'Loan',
  vnasfund: 'NasFund V-Contribution',
  salarysacrifice: 'Salary Sacrifice',
};

// PIH OT Calculation
const OTCalculationRatio = {
  OT1: 1.5,
  OT2: 2,
};

// PNG slab tax type
const PNGTaxSlabTypeEnum = {
  FIX: 'fix',
  FORMULA: 'formula',
};

// PNG OT Give In
const OTGiveInEnum = {
  IN_OT: 'ot',
  IN_PAIDHOURS: 'ph',
};

const attendanceBranchTypeRule = {
  ALL: 'all',
  SELECTED: 'selected',
  ASSIGNED: 'assigned',
};

const updateBranchJob = [
  { Label: 'Branch', value: 'BRANCH' },
  { Label: 'Department', value: 'DEPARTMENT' },
  { Label: 'Designation', value: 'DESIGNATION' },
  { Label: 'Division', value: 'DIVISION' },
  { Label: 'Project', value: 'PROJECT' },
  { Label: 'Reports To', value: 'REPORTSTO' },
  { Label: 'Skill Category', value: 'SKILLCATEGORY' },
  { Label: 'Working Area', value: 'WORKINGAREA' },
  { Label: 'Working Location', value: 'WORKINGLOCATION' },
];

const updateBranchJobTypes = {
  BRANCH: 'BRANCH', //
  DEPARTMENT: 'DEPARTMENT', //
  DESIGNATION: 'DESIGNATION', //
  DIVISION: 'DIVISION', //
  PROJECT: 'PROJECT', //
  REPORTSTO: 'REPORTSTO', //
  SKILLCATEGORY: 'SKILLCATEGORY', //
  WORKINGAREA: 'WORKINGAREA', //
  WORKINGLOCATION: 'WORKINGLOCATION', //
};
const geoFenseType = {
  INSIDE: 'in',
  OUTSIDE: 'out',
  OFFLINE: 'offline',
  GPS_OFF: 'gpsOff',
};

const companyMasterIDENUM = {
  MEHTA_SOFTECH_PVT_LTD: 3,
  MEHTA_HIGHTECH_INDUSTRIES: 28,
  N_S_Construction: 68,
  CHATTERJEE_CLEANING_ARTS_SERVICES_LIMITED: 165,
  MRINMOYEE_SUPPLY_PVT_LTD: 166,
  TANKHWAPATRA: 200,
  MEHTA_EQUITIES_LTD: 370,
  Savera_Group: 744,
  Shreenath_Pumps_Private_Limited: 1015,
  REAL_FORCE_PUMPS: 1241,
  CHHATTISGARH_DISTRIBUTORS: 1432,
  IDEAL_SHEET_METAL: 1129,
  SOLITECH_GREEN_ENERGY: 1889,
  UDAY_AUTOLINK: 1920,
  MEHTA_EXPAI: 31,
  MEHTA_ELECTONICS: 956,
  APSC_EMART_LLP: 790,
  ALISHAN_GREEN_ENERGY_PVT_LTD: 1065,
  ALISHAN_SOLAR_PVT_LTD: 1066,
  ALISHAN_GREEN_ENERGY_PVT_LTD_UNIT_2: 1128,
  PATIDAR_EXPORT_PVT_LTD: 811,
  GLOBE_ELV_SOLUTION_LLP: 1309,
  BRISK_SURGICAL_COTTON_LTD_BELAGAVI: 1428,
  BRISK_SURGICAL_COTTON_LTD_INDUSTRIES: 1367,
  BRISK_SURGICAL_COTTON_LTD: 1383,
  ASTHA_CHERITABLE_TRUST: 1317,
  FTA_HSRP_SOLUTION_PVT_LTD: 883,
  MKC_2: 1344,
  NAVBODH_PRAKASHAN: 533,
  YUGBODH_DIGITAL_PRINTS: 653,
  RAJVI_ESTATE_LLP: 1438,
  RAJVI_PETROLIUM: 1449,
  SHREE_RAJVI_RESIDENCY: 1451,
  KANDLA_GATEWAY_ESTATE_LLP: 2321,
  SHREE_RIVIERA_ELEGANCE_CO_OPERATIVE_HOUSING_SERVICE: 1452,
  RAJVEE_RESORTS_AND_HOTELS_PRIVATE_LIMITED: 1450,
  R_TOWN_ESTATE_LLP: 1453,
  YARMOUTH_REALITY_PRIVATE_LIMITED: 1454,
  CASUAL: 1455,
  ROYAL_CHEMIST: 1456,
  PRIME_ESTATE: 1961,
  TOPLINE_SWITCHGEAR_PVT_LTD: 202,
  UA_AGRO_SOLUTION_PVT_LTD: 1917,
  VERDE_AGROTECH_INDIA_PVT_LTD: 1984,
  RESILIENCE_HOSPITALITY: 2036,
  RESILIENCE_SERVICES: 2037,
  OMSREE_MARKETING_SOLUTION: 2247,
  AYUSHMATH: 2328,
  SAMANAM_FOOD_PRIVATE_LIMITED: 2325,
  MEHTA_SOFTECH_PRIVATE_LIMITED_2: 897,
  KESAR_CONTROL_SYSTEMS_PVT_LTD: 1954,
  KESAR_CONTROL_SYSTEMS_PVT_LTD_CASH: 2032,
  KESAR_TESTING_SERVICE_LLP: 1957,
  DGM_AUTOMATION_INDIA_PVT_LTD: 1898,
  ZEVIS_PERFORMANCE_ADDITIVIES_PVT_LTD: 2286,
  HEXACOOL_PROCESS_PVT_LTD: 1225,
  HEXACOOL_AUXILIARY_PVT_LTD: 1627,
  PENTAGRAM_TECHNO_PRODUCTS_PVT_LTD: 1606,
  SNEHAL_TURNKEY_SOLUTIONS_PVT_LTD: 1625,
  MIPADH_ENGINEERS_LIMITED: 1556,
  BESO_ENTERPRISES_PRIVATE_LIMITED: 2291,
  BESO_ENTERPRISES: 2322,
  EMBOSS: 1113,
  AMMAN_ASSOCIATE_SERVICES_PRIVATE_LIMITED: 1446,
  KRISHNA_CORPINDIA_PRIVATE_LIMITED: 2242,
  RAGHAV_ADVERTISING: 1431,
  GYAYAK_HOSPITAL_PRIVATE_LIMITED: 421,
  PROPACK_SHREINER_PVT_LTD: 1824,
  MARUTI_KOATSU_CYLINDER_PVT_LTD: 864,
  CHHATRESHWARY_LOGISTIC_PRIVATE_LIMITED: 2178,
  RAGHAV_PARIVAAR: 1366,
  RAGHAVAM_LOGISTICS_PVT_LTD: 1433,
  RAGHAV_ENTERPRISES: 1434,
  SEMANTIC_INFRA_PROJECTS_PVT_LTD: 2136,
  SPECTRUM_TECH_N_FAB_PVT_LTD: 2137,
  DIGIZAC_SOLUTION_INDIA_PVT_LTD: 1232,
  PAYAL_CONSTRUCTION: 2055,
  KRISHNA_CORPORATION: 2080,
  ASHVIN_PRESSING_COMPONENTS: 1978,

  FLOWTECH: 1156,
  KRISHNA_ENVIRO_ENGINEERS: 2239,
  VIDHART_CORPINDIA_PRIVATE_LIMITED: 2189,
  JAY_BUILDERS: 2241,
  PRAMODA_CORPINDIA_PRIVATE_LIMITED: 2242,
  KRISHNA_DARSHAN_ENVRIRO_CARE_PRIVATE_LIMITED: 2240,
  REMEDIES_HEALTH_CARE: 2167,
  G_I_HEALTHCARE_PVT_LTD: 2348,
  DIVINE_EMPIRE: 748,
  ATHARV_PUBLIC_SCHOOL: 2190,
  SRI_SAI_BASAVA_SUGARS_LIMITED: 2075,
};
const ReviewerRoleEnum = {
  REPORTED_TO: 'Reported To',
  OTHER: 'Other',
};

const ReviewTypeEnum = {
  SEQUENCE: 'Sequence',
  ANY: 'Any',
};

// PNG slab tax type
const PNGYTDTaxSlabTypeEnum = {
  PERCENT: 'percent',
  FORMULA: 'formula',
};

const FormulaPreferenceEnum = {
  HIGHER: 'higher',
  LOWER: 'lower',
};

const companyCreateByDefaultUser = 145237;

const PTCalculationEnum = {
  MONTHLY: 'monthly',
  HALFYEARLY: 'halfYearly',
};

const AsopalavComapnyIds_Attn = [277, 298];

const MonthDaysTypeEnum = {
  FIX: 'fix',
  MONTHDAYS: 'monthDays',
};

const WeekOffSalaryTypeEnum = {
  REGULAR: 'regular',
  SEPARATE: 'separate',
};
const txnTypeENUM = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
};

const salaryCalculationAct = {
  SHOPACT: 'S',
  FACTORYACT: 'F',
  ONWORKINGDAYS: 'W',
};

const attendanceRegisterTypes = {
  INOUT: 'INOUT',
  ATTENDANCESTATUS: 'ATTENDANCESTATUS',
  INOUT_ATTENDANCESTATUS: 'INOUT_ATTENDANCESTATUS',
};
const attendanceReportMainReportTypes = {
  CONSOLIDATED_PA: 1,
  CONSOLIDATED_INOUT: 2,
  REGISTER_2_PA: 3,
  REGISTER_2_INOUT: 4,
  CONSOLIDATED_PA_INOUT_VERTICAL: 5,
  REGISTER_2_PA_WITHLOGS: 6,
  REGISTER_2_INOUT_WITHLOGS: 7,
  EMPLOYEE_PUNCH_IN_OUT_PA: 8,
  EMPLOYEE_PUNCH_IN_OUT_INOUT: 9,
  REGISTER_2_PA_INOUT: 10,
  CONSOLIDATED_PA_INOUT_HORIZONTAL: 11,
};

const attendanceReportRangeType = {
  FULL_MONTH: 1,
  MONTH_TILL_CURRENT_DATE: 2,
};

const leaveApplyFromEnum = {
  EMPLOYEE: 'employee',
  ADMIN: 'admin',
  SYSTEM: 'system',
};

const saveraCompanyIDs = [744, 965, 968, 969, 970, 971, 998, 999, 1000];

const addressTypes = {
  PERMANENT: 'permanent',
  TEMPORARY: 'temporary',
};
const weekoffTypeApplicableMonthTypes = {
  PAST_MONTH: 0,
  CURRENT_MONTH: 1,
  UPCOMING_MONTH: 2,
};

const UserTypesEnum = {
  USER_0: 0,
  USER_1: 1,
  SUPER_ADMIN: 2,
  SUB_ADMIN: 3,
  DEALER: 4,
  RM: 5,
  HRM: 6,
  RM_HEAD: 7,
  HRM_HEAD: 8,
  MARKETING_PERSON: 9,
};

const WorkFromHomeTypes = {
  FULLDAY: 'Full Day',
  FIRSTHALF: 'First Half',
  SECONDHALF: 'Second Half',
};

const TargetAchieved = {
  NOTACHIEVED: 'Not Achieved',
  PARTIALLY: 'Partially',
  ACHIEVED: 'Achieved',
};

const suggestionAuthority = {
  CONFIRM: 'Confirm',
  EXTENDED: 'Extend',
  NOTCONFIRM: 'Do Not Confirm',
};

//  -----------------ONLY FOR PIH ------------------

const leaveEncashmentPercent = {
  EMPLOYEE: 6,
  EMPLOYER: 8.4,
  NASFUND_HOUSING: 2,
};

const roleMasterRoleNames = {
  ADMIN: 'Admin',
  EMPLOYEE: 'Employee',
};

const ExpatTaxRebate = {
  DEPENDANT0: 0,
  DEPENDANT1: 450,
  DEPENDANT2: 750,
  DEPENDANT3: 1050,
};
const biometricIntegrationTypes = {
  AIFACE: 'AIFaceAttendance',
  IPBASED: 'IpBasedBiometric',
  PARALLEL: 'parallelDatabase',
};
const biometricAlgorithmTypes = {
  Multiple_Day_Single_Machine_Multiple_IN_OUT: 1,
  Single_Day_Single_Machine_First_IN_Last_Out: 2,
  Single_Day_Multiple_Machine_First_IN_Last_Out: 3,
  Single_Day_Single_Machine_Multiple_IN_OUT: 4,
  Single_Day_Multiple_Machine_Multiple_In_Out: 5,
  Multiple_Day_Multiple_Machine_Multiple_In_Out: 6,
  Canteen: 7,
  Multiple_Day_Multiple_Machine_First_IN_Last_Out: 8,
  Multiple_Day_Multiple_Machine_Multiple_In_Out_With_New_IN: 9,
};

const AuthorizationStatusType = {
  PENDING_ZERO: 0,
  PEDING_ONE: 1,
  PEDING_TWO: 2,
  APPROVED: 3,
  REJECTED: 4,
  CANCELLED: 5,
};

const AuthStatusInAuthorizationRequest = {
  PENDING: 2,
  APPROVED: 1,
  REJECTED: 0,
};

const notificationScreentTypes = {
  COMPENSATORYOFF: 'coffauth',
  EXTRADAYS: 'extradaysauth',
  RESIGANTION: 'resignationAuthorizations',
  EMPLOYEEGATEPASS: 'gatepassauth',
  ATTENDANCECORRECTION: 'attendanceCorrectionauth',
  OUTDOORDUTY: 'outDoorDutyAuth',
  LEAVE: 'leaveauth',
  SHORTLEAVE: 'shortLeaveAuth',
  WORKFROMHOME: 'workFromHome',
  BANKDETAIL: 'bankDetail',
  EXPENSEADVANCEREQUEST: 'expenseAdvanceRequest',
  DISCREPANCYLETTER: 'discrepancyLetter',
  LOAN: 'loan',
  TEAMPUNCHINOUT: 'teamPunchInOut',
  ATTENDANCE: 'attendance',
  MANPOWERREQUISITION: 'manpowerRequisition',
  VISIT: 'visit',
  TOUR: 'tour',
  SALARYINCREMENT: 'salaryIncrement',
};

const notificationTitleTypes = {
  COMPENSATORYOFF: 'Compensatory Off',
  EXTRADAYS: 'Extra Days',
  RESIGANTION: 'Resignation',
  EMPLOYEEGATEPASS: 'Employee Gate-Pass',
  ATTENDANCECORRECTION: 'Attendance Correction',
  OUTDOORDUTY: 'Outdoor Duty',
  LEAVE: 'Leave',
  SHORTLEAVE: 'Short Leave',
  WORKFROMHOME: 'Work From Home',
  BANKDETAIL: 'Bank Detail',
  EXPENSEADVANCEREQUEST: 'Expense Advance Request',
  LOAN: 'Loan Request',
  TEAMPUNCHINOUT: 'Team Punch In-Out',
  ATTENDANCE: 'Attendance',
  MANPOWERREQUISITION: 'Manpower Requisition',
  VISIT: 'visit',
  TOUR: 'Tour',
  SALARYINCREMENT: 'Salary Structure Request',
};

const incentiveFromEnum = {
  ATTN_CAL: 'AC',
};

const adminSideUserTypesArray = [
  UserTypesEnum.SUPER_ADMIN,
  UserTypesEnum.SUB_ADMIN,
  UserTypesEnum.DEALER,
  UserTypesEnum.RM,
  UserTypesEnum.HRM,
  UserTypesEnum.RM_HEAD,
  UserTypesEnum.HRM_HEAD,
  UserTypesEnum.MARKETING_PERSON,
];

const authorizationCriteriaName = {
  3: 'Any Two',
  4: 'Any One',
  5: 'Sequance No',
  6: 'Any Three',
};

const authorizationStatusString = {
  0: 'Pending',
  1: 'Pending',
  2: 'Pending',
  3: 'Approved',
  4: 'Rejected',
};

const statusMap = {
  0: 'Rejected',
  1: 'Approved',
  2: 'Pending',
};

const salaryOptions = {
  M: 'Month Wise',
  H: 'Hour Wise',
  D: 'Day Wise',
};
const defaultPenaltyNames = {
  CANTEEN: 'Canteen',
};

const cronStatusTypes = {
  EXECUTED: 'Executed',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

const cronTypes = {
  CHHATTISGARH_DISTRIBUTORS_ATTENDANCE:
    'CHHATTISGARH_DISTRIBUTORS Attendance API',
  IDEAL_SHEET_METAL_VATVA_ATTENDANCE:
    'IDEAL SHEET METAL - VATVA Biomax Attendance API',
  IDEAL_SHEET_METAL_PRAHLADNAGAR_ATTENDANCE:
    'IDEAL SHEET METAL - PRAHLADNAGAR Biomax Attendance API',
  SOLITECH_GREEN_ENERGY_ATTENDANCE: 'SOLITECH GREEN ENERGY Attendance API',
  UDAY_AUTOLINK_Biomax_ATTENDANCE:
    'UDAY AUTOLINK STAMPINGS Biomax Attendance API',
};

const customerListPreferenceTypes = {
  ALL_CUSTOMER: 'all',
  CUSTOMER_CREATED_BY_USER: 'created',
  CUSTOMER_ASSIGNED_TO_USER: 'assigned',
  EMPLOYEE_BRANCH_CITY_WISE_CUSTOMER: 'employeeBranchCityWise',
};

const advancePaymentType = {
  ADVANCE: 'Advance',
  DUE: 'Due',
};
const userNamePrefixes = ['Mr.', 'Ms.', 'Mrs.', 'Miss'];

const CoffUsedTypeEnum = {
  USED: 'used',
  LAPSE: 'lapse',
  ENCASH: 'encash',
};

const companyIdEnumIDCard = {
  MONARCH: [838, 945, 946, 944],
  STAVYA: [1735], // Add Stavya company IDs here when available
  ASOPALAV: [277, 298, 300],
};

const mealTypeEnum = Object.freeze({
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
});

const taskStatus = {
  0: 'Pending',
  1: 'Accepted',
  2: 'Rejected',
  3: 'Completed',
};

const ExpatHRAValue = {
  LABEL1: 4160,
  LABEL2: 10400,
};

const ExpatMVAValue = {
  LABEL1: 3250,
};

const QueryStatusEnum = {
  0: 'Pending',
  1: 'In Progress',
  2: 'Resolved',
};

const expenseAdvanceRequestAuthStatus = {
  REJECTED: 0,
  APPROVED: 1,
  PENDING: 2,
  CANCELLED: 3,
  PAID: 4,
};

const ShiftTypeEnum = {
  DAYSHIFT: 'day',
  NIGHTSHIFT: 'night',
};

const SalaryStructureTypeEnum = {
  MONTHLY: 'M',
  DAILY: 'D',
  HOURLY: 'H',
};

const HrLeaveTypesIds = {
  WORKING_HRS: 20,
  OT_HRS: 21,
  PH_HRS: 34,
  PRESENT: 1,
  ABSENT: 5,
  WEEKOFF: 7,
  HOLIDAY: 9,
  ATTENDANCE_PENALTY: 22,
  ABSENT_DUE_TO_SANDWICH: 28,
  LEAVE_BEHALF_ON_SANDWICH: 29,
  ACTUAL_WEEKOFF: 30,
  ACTUAL_HOLIDAY: 31,
  ATTENDANCE_BONUS: 32,
  LEAVE_HRS: 35,
  LWP: 18,
  OPTIONAL_HOLIDAY: 24,
  OD: 25,
  LONG_SERVICE_LEAVE: 43,
  COFF: 6,
  WA: 57, // Weekoff absent due to shortfall days in week
};

const salaryFieldSrNoFields = {
  EARNING: 'A',
  EMPLOYEE_DEDUCTION: 'B',
  EMPLOYER_DEDUCTION: 'C',
  OTHER_DEDUCTION: 'D',
};

const payheadMasterIdsMapping = {
  GROSS: 50,
  CTC: 1,
  NETSALARY: 92,
  NORMAL_PAY: 145,
  OT_PAY: 102,
  PAID_HOLIDAY_PAY: 104,
  INCENTIVE: 24,
  PENALTY: 34,
  NCSL_KIDS_SAVING: 122,
  NCSL_LOAN: 123,
  NCSL_GENERAL_SAVINGS: 125,
  NCSL_PORO: 126,
  NCSL_XMAS: 127,
  SALARY_WAGES_TAX: 135,
  SALARY_SACRIFICE: 133,
  ADVANCE: 16,
  LOAN: 17,
  OT: 43,
  DEPOSIT_DEDUCTION: 96,
  DEPOSIT_PAY: 97,
  LEAVE_ENCASHMENT: 67,
  BONUS: 6,
  BONUS_PAY: 101,
  EXPENSE_REIMBURSEMENT: 116,
  PAID_LEAVE_HOURS: 148,
  BASIC: 2,
  PF: 4,
  EPF: 5,
  EPS: 12,
  ADMIN_CHARGES: 25,
  EDLI: 66,
  ATTENDANCE_PENALTY: 78,
  EMPLOYEE_ESIC: 13,
  EMPLOYER_ESIC: 14,
  PTAX: 15,
  EMPLOYEE_LWF: 18,
  EMPLOYER_LWF: 59,
  SHORT_FALL_HOURS: 151,
  TDS: 9,
  LTA: 20,
  DA:35,
  LONG_SERVICE_LEAVE_PAY:152
};

const payheadConsiderInEnum = {
  GROSS: 'gross',
  NETSALARY: 'net',
};

const attendanceBonusSlotEnum = {
  ONESLOT: 'oneSlot',
  TWOSLOT: 'twoSlot',
  THREESLOT: 'threeSlot',
};

const LCEGPolicyTypeEnum = {
  NO_LCEG_POLICY: 'noLcEgPolicy',
  SEPERATED: 'seperated',
  COMBINED: 'combined',
  LC_SHIFT_WISE: 'lcShiftWise',
};

const BankDetailsStatusEnum = {
  0: 'Pending',
  1: 'Approved',
  2: 'Rejected',
};
const expense_Payment_Types_Obj = {
  EXPENSE_PAYMENT: 0,
  EXPENSE_ADVANCE_PAYMENT: 1,
  EXPENSE_ADVANCE_REQUEST_PAYMENT: 2,
};

const earnBaseTypeLeaveEnum = {
  PRESENT: 'Physical Present',
  PRESENT_WEEKOFF: 'Physical Present + Weekly Off',
  PRESENT_WEEKOFF_HOLIDAY: 'Physical present + Weekly Off + Holiday',
  PRESENT_WEEKOFF_PAIDLEAVE: 'Physical present + Weekly Off+ Leave',
  PAID_DAYS: 'Paid Days',
};

const OutsidePunchPermissionEnum = Object.freeze({
  PUNCH_IN: 'punchIn',
  PUNCH_OUT: 'punchOut',
  BOTH: 'both',
});

const bankAccountTypeEnum = Object.freeze({
  SAVING: 'Saving',
  CURRENT: 'Current',
});

const pfPercentage = new Map([
  [payheadMasterIdsMapping.PF, 12],
  [payheadMasterIdsMapping.EPF, 3.67],
  [payheadMasterIdsMapping.EPS, 8.33],
  [payheadMasterIdsMapping.ADMIN_CHARGES, 0.5],
  [payheadMasterIdsMapping.EDLI, 0.5],
]);
// in attendance policy
const overtimeTypeEnum = {
  ACTUAL: 'actual',
  ROUND_OFF: 'roundoff',
  SLOT_WISE: 'slotwise',
};

const whatsAppRecieveMsgType = {
  SALARYSLIP: 'salary-slip',
};

const attendanceBonusForEnum = {
  PRESENT_DAYS: 'presentDays',
  ABSENT_DAYS: 'absentDays',
  PRESENT_HOLIDAY_DAYS: 'presentHolidayDays',
};

const attendanceBonusType = {
  DAILY: 'daily',
  HOURLY: 'hourly',
};

const salarySlipNameList = {
  ASOPALAV: 'salaryslipForAsoPalav',
  JEEVDANI: 'salarySlipForJeevdani',
  FINTECH_FILLING: 'salarySlipForFinTechFilings',
  SAVERA_GROUP: 'saveraGroupPaySlip',
  TECHCEDENCE: 'salarySlipTechcedence',
  TEMPLATE1: 'salaryslip',
  TEMPLATE2: 'vittaazioPaySlip',
  WITH_EMPLOYER_CONTRIBUTION: 'salarySlipWithEmployerContribution',
  TEMPLATE4: 'salaryslipTemplate4', // without joining Date
  TEMPLATE5: 'salaryslipTemplate5', // with Leave Balance
  CONSULTANT_SALARY_SLIP: 'consultant-salary-slip',
  AED_SALARY_SLIP: 'AED-salary-slip',
  TEMPLATE3: 'salaryslipTemplate3',
  TEMPLATE6: 'salaryslipTemplate6',
  TEMPLATE7: 'salaryslipTemplate7',
};
const SelfieAttendancePermission = {
  1: 'Face Detection',
  2: 'Face Recognization',
  0: 'Only Selfie',
};

const OutsidePunchInOutPermission = {
  punchIn: 'Only Punch-In',
  punchOut: 'Only Punch-out',
  both: 'Both Punch-In and Punch-Out',
};

const AttendanceInMobile = {
  PA: 'Present-Absent Report',
  InOut: 'InTime-OutTime Report',
};

const PayType = {
  ctcSalary: 'CTC Salary',
  grossSalary: 'Gross Salary',
  basicSalary: 'Basic Salary',
  fixedAmount: 'Fixed Amount',
};
const policyScope = Object.freeze({
  ALL: 'all',
  SELECTED: 'selected',
});

const LCEGDeductionTypeEnum = Object.freeze({
  FIX_AMOUNT: 'fixamount',
  DAILY_PERCENTAGE: 'percent',
  MONTHLY_PERCENTAGE: 'monthlypercent',
  PER_MINUTE: 'perminute',
  MINUTE_WISE: 'min',
  DAY_WISE: 'day',
});

const WeekOffEnumMsg = {
  monthlyFix: 'Monthly Fix Number of Weekoff: ',
  onPaidDays: 'Number of Paid Days to Get 1 Weekoff: ',
  onPhysicalPresent: 'Number of Physical Present to Get 1 Weekoff: ',
  onPresentDay: 'Number of Present Days to Get 1 Weekoff: ',
  noWeekoffPolicy: 'No Weekoff Policy: ',
};
const msgForOffEnum = {
  secondhalf: 'Second Half Off',
  fullday: 'Full Day Off',
};

const excelDataShow = {
  noLcEgPolicy: 'No Late Come Early Go Policy',
  seperated: 'Seperated',
  combined: 'Combined',
  lcShiftWise: 'Late Come Shift Wise',
};

const excelMsgForDeductionType = {
  fixamount: 'Fixed Amount',
  percent: 'Percentage Of Daily Gross',
  monthlypercent: 'Percentage Of Monthly Gross',
  perminute: 'Per Minutes',
  min: 'Minute',
  day: 'Day',
};

const excelMsgForWeekOffPolicyType = {
  onPresentDay: 'Monthly Number of Weekoff on Present + Holiday',
  onPhysicalPresent: 'Monthly Number of Weekoff on Physical Present + Holiday',
  onPaidDays: 'Monthly Number of Weekoff on Paid Days',
  monthlyFix: 'Monthly Number of Weekoff',
  fix: 'Fix Weekoff',
};

const employeementTypeEnum = Object.freeze({
  ON_PAYROLL: 'OnPayroll',
  ON_CONTRACT: 'onContract',
});

const notIncludePyaheadIds = [
  16, 17, 9, 24, 34, 43, 78, 83, 96, 97, 99, 67, 101, 102, 103, 104, 107, 112,
  116, 135, 123, 125, 126, 127, 133, 130, 122, 147, 148, 151, 152,
];

const salaryStatusEnum = Object.freeze({
  ALL: 'ALL',
  EXCLUDE_ON_HOLD: 'EXCLUDE_ON_HOLD',
  ON_HOLD: 'ON_HOLD',
});

const monthlyOTCalcuationType = Object.freeze({
  TOTAL_WORKING: 'total_working',
  SHIFT_PLUS_OT: 'shift_plus_ot',
});

const overtimeAddedEnum = Object.freeze({
  MONHTLY: 'monthly',
  DAILY: 'daily',
});

const chekLeaveBalanceFromEnum = Object.freeze({
  EMPLOYEE: 'employee',
  ADMIN: 'admin',
});

const longServicePayEncashmentTax_National = [
  {
    applicableFrom: 202401,
    taxPercent: 2,
  },
];

const listLeaveTypesFrom = {
  ALL: 'all',
  ADD: 'add',
};
const attendanceInMobileTypes = {
  In_Out: 'InOut',
  PA: 'PA',
};

const workerTypesEnum = {
  COMPANY_WORKER: 'cmp_worker',
  COMPANY_STAFF: 'cmp_staff',
  COMPANY_MANAGER: 'cmp_manager',
  COMPANY_APPRENTICE: 'cmp_apprentice',
  CONTRACTUAL_WORKER: 'cnt_worker',
  CONTRACTUAL_SECURITY: 'cnt_security',
  CONTRACTUAL_APPRENTICE: 'cnt_apprentice',
  COMMISSION: 'commission',
};

const workerCategory = {
  COMPANY: 'company',
  CONTRACT: 'contract',
  APPRENTICE: 'apprentice',
  COMMISSION: 'commission',
};

const listSaveraWorkerType = [
  {
    key: 'Company Worker',
    value: workerTypesEnum.COMPANY_WORKER,
    category: workerCategory.COMPANY,
  },
  {
    key: 'Company Staff',
    value: workerTypesEnum.COMPANY_STAFF,
    category: workerCategory.COMPANY,
  },

  {
    key: 'Contractual Worker',
    value: workerTypesEnum.CONTRACTUAL_WORKER,
    category: workerCategory.CONTRACT,
  },

  {
    key: 'Contractual Apprentice',
    value: workerTypesEnum.CONTRACTUAL_APPRENTICE,
    category: workerCategory.CONTRACT,
  },
];

const listWorkerTypes = [
  {
    key: 'Company Worker',
    value: workerTypesEnum.COMPANY_WORKER,
    category: workerCategory.COMPANY,
  },
  {
    key: 'Company Staff',
    value: workerTypesEnum.COMPANY_STAFF,
    category: workerCategory.COMPANY,
  },
  {
    key: 'Company Manager',
    value: workerTypesEnum.COMPANY_MANAGER,
    category: workerCategory.COMPANY,
  },
  {
    key: 'Company Apprentice',
    value: workerTypesEnum.COMPANY_APPRENTICE,
    category: workerCategory.APPRENTICE,
  },
  {
    key: 'Contractual Worker',
    value: workerTypesEnum.CONTRACTUAL_WORKER,
    category: workerCategory.CONTRACT,
  },
  {
    key: 'Contractual Security',
    value: workerTypesEnum.CONTRACTUAL_SECURITY,
    category: workerCategory.CONTRACT,
  },
  {
    key: 'Contractual Apprentice',
    value: workerTypesEnum.CONTRACTUAL_APPRENTICE,
    category: workerCategory.CONTRACT,
  },
  {
    key: 'Commission',
    value: workerTypesEnum.COMMISSION,
    category: workerCategory.COMMISSION,
  },
];

const employeementTypeEnumList = {
  Probation: 'Probation',
  Trainee: 'Trainee',
  Confirm: 'Confirm',
  Apprenticeship: 'Apprenticeship',
  Contract: 'Contract',
  Locum: 'Locum',
  Retainer: 'Retainer',
  Visiting_Consultant: 'Visiting Consultant',
  Permanent: 'Permanent',
  On_Commission: 'On Commission',
};

const wizihireUserMasterID = {
  LOCAL_USERMASTER_ID: 3293,
  PRODUCTION_USERMASTER_ID: 135346,
  QA_USERMASTER_ID: 3293,
  STAGE_USERMASTER_ID: 3293,
};

const form_C_reportTypeEnum = {
  MONTHLY: 'monthly',
  FINANCIAL_YEAR: 'financialYear',
  CALENDER_YEAR: 'calendarYear',
};

const orderByEnum = {
  EMPLOYEE_NAME: 'employeeName',
  EMPLOYEE_CODE: 'employeeCode',
};

const compensationTypeEnum = {
  Overtime: 'Overtime',
  AddLeave: 'AddLeave',
  AddExtraDays: 'AddExtraDays',
  NoCompensation: 'NoCompensation',
};
const setHolidayCoffRulesIn = Object.freeze({
  ATTENDANCE_POLICY: 'attendancePolicy',
  HOLIDAY_POLICY: 'holidayPolicy',
});

const offDayCategoryEnum = {
  HOLIDAY: 'holiday',
  WEEKOFF: 'weekoff',
};

const OTPayTypeEnum = {
  GROSS_SALARY: 'grossSalary',
  BASIC_SALARY: 'basicSalary',
  CTC_SALARY: 'ctcSalary',
  FIXED_AMOUNT: 'fixedAmount',
};

const loginOtpMethodENUM = {
  EMAIL: 'email',
  MOBILE: 'mobile',
};

const SalaryPolicyTypeEnum = {
  MONTH_WISE: 'monthwise',
  DAY_WISE: 'daywise',
  HOUR_WISE: 'hourwise',
};

const allAsopalaveCompanyIds = [277, 298, 300];

const salaryConsiderInEnum = {
  GROSS: 'gross',
  NET_SALARY: 'net',
};
const sortFields = {
  EMPLOYEENAME: 'EMPLOYEENAME',
  EMPLOYEECODE: 'EMPLOYEECODE',
};

const DuplicatefieldsMap = {
  adharCard: 'Aadhar card number',
  uanNumber: 'UAN number',
  esicNumber: 'ESIC number',
  pancard: 'Pan number',
};
const distanceCalculationMethodENUM = Object.freeze({
  HAVERSINE: 'HAVERSINE',
  OSRM: 'OSRM',
  BOTH: 'BOTH',
});

const mandaysReportTypeEnum = {
  DETAILED_REPORT: 'Detailed',
  SUMMARY_REPORT: 'Summary',
};

const absenteeismReportTypeEnum = {
  EMPLOYEE_WISE: 'Employee_Wise',
  CONTRACTOR_WISE: 'Contractor_Wise',
};

const otRatioTypeEnum = {
  ALL: 'all',
  SHIFT_WISE: 'shiftWise',
  SLAB_WISE: 'slabWise',
};

const bonusPaymentFNFStatusEnum = {
  WAIVE_OFF: 'Waive_Off',
  PAY_IN_FNF: 'PayInFNF',
};

const vehicleTypeEnum = {
  FOUR_WHEELER: 'fourWheeler',
  TWO_WHEELER: 'twoWheeler',
};

const otCalcByEnum = {
  FIX: 'fix',
  POLICY_WISE: 'policyWise',
};

const defaultSkillCategory = [
  {
    key: 'Skilled',
    value: SkillCategoryType.SKILLED,
  },
  {
    key: 'SemiSkilled',
    value: SkillCategoryType.SEMISKILLED,
  },
  {
    key: 'UnSkilled',
    value: SkillCategoryType.UNSKILLED,
  },
  {
    key: 'Not Applicable',
    value: SkillCategoryType.NOT_APPLICABLE,
  },
];

const employeeSkillCategoryList = [
  ...defaultSkillCategory,
  {
    key: 'Security',
    value: SkillCategoryType.SECURITY,
  },
  {
    key: 'Staff',
    value: SkillCategoryType.STAFF,
  },
  {
    key: 'Apprentice',
    value: SkillCategoryType.APPRENTICE,
  },
];

const accountingTypeEnum = {
  COMPANY_WISE: 'COMPANY_WISE',
  BRANCH_WISE: 'BRANCH_WISE',
  USER_WISE: 'USER_WISE',
};

const salaryRegisterTypeEnum = Object.freeze({
  SALARY_REGISTER: 'salaryRegister',
  MONTHLY_SALARY_SUMMARY: 'monthlySalarySummary',
  SALARY_REGISTER_WITH_DATE_OF_PAY: 'salaryRegisterWithDateOfPay',
  WAGES_SHEET: 'wagesSheet',
  FORM_B_WAGES_REGISTER: 'Form-B-WagesRegister',
});

const phWeekOffType = {
  FIXED: 'fix',
  SLABWISE: 'slabWise',
};

const lwfDeductionMethodEnum = {
  FIX: 'fix',
  GROSS_PERCENTAGE: 'gross_percentage',
};
const OTBasedOnEnum = Object.freeze({
  AUTO: 'auto',
  PLANNING: 'plan',
});
const daysTogetBeforeData = 7;

const considerOvertimeAfterEnum = Object.freeze({
  AFTER_WORKING_HOURS: 'totalworkinghours',
  AFTER_SHIFT_OUTTIME: 'shifthours',
});

const OvertimeRequestTypeEnum = Object.freeze({
  PRE_SHIFT: 'pre_shift',
  POST_SHIFT: 'post_shift',
});

const correctionStatusEnum = {
  IN_OUT_TIME: 1,
  STATUS_CHANGE: 2,
  ADD_LOG: 3,
  TIME_UNCHANGE: 4,
};

const clubbedLeave = {
  NORESTRICTION: 'noRestriction',
  SELECTEDTYPES: 'selectedTypes',
  ALLLEAVETYPE: 'allLeaveType',
};

const bankMasterIdsMapping = {
  ICICI: 1,
};

const employeeCodeTypes = Object.freeze({
  MANUAL: 'manual',
  AUTO_INCREMENT: 'auto',
  PATTERN: 'pattern',
  PATTERN_PLUS_AUTO_INCREMENT: 'patternAutoIncrement',
});

const APICallFrom = Object.freeze({
  TEAM: 'team',
  NORMAL: 'normal',
});

const EarnedLeaveCreditType = {
  MINIMUM_ATTENDANCE: 'MINIMUM_ATTENDANCE',
  MINIMUM_ATTENDANCE_PRORATA: 'MINIMUM_ATTENDANCE_PRORATA',
};

const PayrollStatutoryAdjustModeEnum = Object.freeze({
  OVERTIME: 'overtime',
  CASH: 'cash',
});

const depositPayModeEnum = Object.freeze({
  WAIVE_OFF: 'WAIVE_OFF',
  SALARY: 'SALARY',
});

const incentivePayModeEnum = Object.freeze({
  WAIVE_OFF: 'WAIVE_OFF',
  SALARY: 'SALARY',
});

const bankSalaryStatusEnum = Object.freeze({
  ALL: 'ALL',
  EXCLUDE_ON_HOLD: 'EXCLUDE_ON_HOLD',
  ON_HOLD: 'ON_HOLD',
  FNF: 'FNF',
});

const AttendanceCorrectionPermissionEnum = Object.freeze({
  DESCRIPTION_ONLY: 'DESC_ONLY',
  IN_TIME_OUT_TIME_DESCRIPTION: 'IN_TIME_OUT_TIME_DESC',
});

const punchInputTypeEnum = Object.freeze({
  NO_INPUT_REQUIRED: 'NA',
  REMARKS_REQUIRED: 'remarks',
  CUSTOM_FORM: 'custom_form',
});

const roundOffDaysForPayrollStatutory = 0.5;

const exclude_payheadMasterIds = [
  9, 16, 17, 24, 34, 43, 78, 83, 96, 97, 99, 67, 101, 102, 103, 104, 107, 112,
  135, 123, 125, 126, 127, 133, 130, 122, 147, 116, 148, 151, 152,
];
const punchOutConfig = Object.freeze({
  SKIP_PUNCH_OUT_AFTER_TIME_LIMIT: 'SKIP_PUNCH_OUT',
  AUTO_PUNCH_OUT_AFTER_TIME_LIMIT: 'AUTO_PUNCH_OUT',
});

const probationTypeEnum = Object.freeze({
  MONTH: 'month',
  DAY: 'day',
});

const PunchInOutCustomizeFromTypeEnum = {
  PUNCHIN: 'punchIn',
  PUNCHOUT: 'punchOut',
  CONTINUEPUNCHIN: 'continuePunchIn',
};

const PuncInOutCustomizeFormFieldType = {
  TEXTAREA: 'textarea',
  DROPDOWN: 'dropdown',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  NUMBER: 'number',
  TEXT: 'text',
  FILE: 'file',
};

const extraDaysFromEnum = {
  ATTENDANCE_CALCULATION: 'AC', // ATTENDANCE CALCULATION
  WEEKOFF_HOLIDAY_ON_SAME_DAY: 'WH_ON_SAME_DAY', // IF WEEKOFF AND HOLIDAY ON SAME DAY
};

module.exports = {
  OutsidePunchPermissionEnum,
  earnBaseTypeLeaveEnum,
  paymentMode_PaidSalary,
  BankDetailsStatusEnum,
  LCEGPolicyTypeEnum,
  attendanceBonusSlotEnum,
  payheadConsiderInEnum,
  payheadMasterIdsMapping,
  salaryFieldSrNoFields,
  HrLeaveTypesIds,
  SalaryStructureTypeEnum,
  ShiftTypeEnum,
  ExpatHRAValue,
  ExpatMVAValue,
  QueryStatusEnum,
  mealTypeEnum,
  CoffUsedTypeEnum,
  incentiveFromEnum,
  ExpatTaxRebate,
  leaveEncashmentPercent,
  leaveApplyFromEnum,
  PNGYTDTaxSlabTypeEnum,
  OTGiveInEnum,
  PNGTaxSlabTypeEnum,
  OTCalculationRatio,
  NCSLDeductionsName,
  NCSLDeductionsEnum,
  WeekOffSalaryTypeEnum,
  MonthDaysTypeEnum,
  AsopalavComapnyIds_Attn,
  PTCalculationEnum,
  FormulaPreferenceEnum,
  LCEGPenaltyTypeEnum,
  PenaltyDeductFromEnum,
  RegimeType,
  TaxApplicabilityType,
  PayrollFrequencyType,
  bonusPaymentMode,
  bonusCreditTypeEnum,
  bonusCreditCycleEnum,
  yearCycleEnum,
  weekoffTypeEnum,
  paymentMode,
  employeeRepaymentType,
  default_payheadMasterIds,
  nonEditableList_INC,
  TicketStatusEnum,
  TicketPriorityEnum,
  DatabaseOperationEnum,
  SentimentMoodEnum,
  EmployeeGoalStatusEnum,
  PmsPolicyEnum,
  GoalTypeEnum,
  GoalEvaluationPeriodEnum,
  ReviewQuestionsResponseType,
  PerformanceReviewStatus,
  notificationCronTypes,
  notificationCronTimeType,
  notificationCronTimeFormat,
  EmployeeGatepassStatusEnum,
  EmployeeGatepassPurposeEnum,
  EmployeeGatepassCheckStatusEnum,
  singleMultipleCheckInOutTypes,
  mailCronTypes,
  roleType,
  companyAccessType,
  FoodAllowanceTypeEnum,
  JoiningRequestStatus,
  registrationStatus,
  TeaAllowanceTypeEnum,
  AllowanceTypeEnum,
  FileUploadType,
  Nationality,
  DateTimeType,
  requiredUserTypeEnum,
  SkillCategoryType,
  leaveOperationENUM,
  leaveEncashmentStatusEnum,
  frequencyENUM,
  bonusPaymentType,
  letterTypesENUM,
  mailTemplateTypes,
  letterTemplateTypes,
  authorizationMasterTypes,
  InterViewTypeENUM,
  preboardingStatusTypes,
  customizeProfileFields,
  attendaceTransType,
  attendanceTransactionType,
  attendanceDirection,
  allowedAttendanceSources,
  attendanceFromType,
  singleMultiplePunchInPunchOutTypes,
  updateBranchJob,
  updateBranchJobTypes,
  expenseTypeArray,
  expenseTypes,
  authorizationCriteriaType,
  expenseTypeArrayForDropDown,
  expenseApprovalTypes,
  attendanceBranchTypeRule,
  geoFenseType,
  companyMasterIDENUM,
  ReviewerRoleEnum,
  ReviewTypeEnum,
  ReviewPeriodEnum,
  organizationAuthorizationMasterTypes,
  txnTypeENUM,
  salaryCalculationAct,
  attendanceRegisterTypes,
  attendanceReportMainReportTypes,
  attendanceReportRangeType,
  saveraCompanyIDs,
  addressTypes,
  weekoffTypeApplicableMonthTypes,
  UserTypesEnum,
  roleMasterRoleNames,
  WorkFromHomeTypes,
  biometricIntegrationTypes,
  biometricAlgorithmTypes,
  AuthorizationStatusType,
  AuthStatusInAuthorizationRequest,
  notificationScreentTypes,
  notificationTitleTypes,
  adminSideUserTypesArray,
  authorizationCriteriaName,
  authorizationStatusString,
  statusMap,
  salaryOptions,
  defaultPenaltyNames,
  cronStatusTypes,
  cronTypes,
  customerListPreferenceTypes,
  advancePaymentType,
  userNamePrefixes,
  TargetAchieved,
  suggestionAuthority,
  companyIdEnumIDCard,
  taskStatus,
  expenseAdvanceRequestAuthStatus,
  expense_Payment_Types_Obj,
  bankAccountTypeEnum,
  pfPercentage,
  overtimeTypeEnum,
  whatsAppRecieveMsgType,
  attendanceBonusForEnum,
  attendanceBonusType,
  salarySlipNameList,
  SelfieAttendancePermission,
  OutsidePunchInOutPermission,
  AttendanceInMobile,
  PayType,
  policyScope,
  LCEGDeductionTypeEnum,
  msgForOffEnum,
  WeekOffEnumMsg,
  excelDataShow,
  excelMsgForDeductionType,
  excelMsgForWeekOffPolicyType,
  employeementTypeEnum,
  notIncludePyaheadIds,
  salaryStatusEnum,
  monthlyOTCalcuationType,
  overtimeAddedEnum,
  chekLeaveBalanceFromEnum,
  longServicePayEncashmentTax_National,
  listLeaveTypesFrom,
  attendanceInMobileTypes,
  workerTypesEnum,
  workerCategory,
  listWorkerTypes,
  listSaveraWorkerType,
  employeementTypeEnumList,
  wizihireUserMasterID,
  form_C_reportTypeEnum,
  orderByEnum,
  compensationTypeEnum,
  setHolidayCoffRulesIn,
  offDayCategoryEnum,
  OTPayTypeEnum,
  companyCreateByDefaultUser,
  loginOtpMethodENUM,
  SalaryPolicyTypeEnum,
  allAsopalaveCompanyIds,
  salaryConsiderInEnum,
  sortFields,
  DuplicatefieldsMap,
  distanceCalculationMethodENUM,
  mandaysReportTypeEnum,
  absenteeismReportTypeEnum,
  bonusPaymentFNFStatusEnum,
  vehicleTypeEnum,
  otRatioTypeEnum,
  bonusPaymentFNFStatusEnum,
  otCalcByEnum,
  defaultSkillCategory,
  employeeSkillCategoryList,
  accountingTypeEnum,
  salaryRegisterTypeEnum,
  phWeekOffType,
  lwfDeductionMethodEnum,
  OTBasedOnEnum,
  daysTogetBeforeData,
  considerOvertimeAfterEnum,
  OvertimeRequestTypeEnum,
  correctionStatusEnum,
  clubbedLeave,
  bankMasterIdsMapping,
  employeeCodeTypes,
  APICallFrom,
  EarnedLeaveCreditType,
  PayrollStatutoryAdjustModeEnum,
  depositPayModeEnum,
  incentivePayModeEnum,
  bankSalaryStatusEnum,
  AttendanceCorrectionPermissionEnum,
  punchInputTypeEnum,
  roundOffDaysForPayrollStatutory,
  exclude_payheadMasterIds,
  punchOutConfig,
  probationTypeEnum,
  PunchInOutCustomizeFromTypeEnum,
  PuncInOutCustomizeFormFieldType,
  extraDaysFromEnum,
};
