const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const { attendanceBranchTypeRule, OutsidePunchPermissionEnum, policyScope, setHolidayCoffRulesIn, otRatioTypeEnum, AttendanceCorrectionPermissionEnum, punchInputTypeEnum, punchOutConfig } = require('../utils/dbUtils');

const tableName = 'attendancePolicyAmend';

const AttendancePolicyAmend = sequelize.define(tableName, {
  attendancePolicyAmendID: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  attendancePolicyID: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  companyMasterID: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  attendancePolicyName: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  selfieAttendance: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  outsidePunchInPunchOut: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  singleMultiplePunchInPunchOut: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  automaticAssignShift: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  sandwichLeave: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
  },
  BeforeAfterLeave: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
  },
  weekoffsandwichLeave: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
  },
  holidaysandwichLeave: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
  },
  HFDBeforeAfterLeave: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
  },
  considerWorkingHours: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  considerOvertimeAfter: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  overtimeEntryAfterMin: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  attendanceInMobile: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  coff: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  coffhalfday: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  cofffullday: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  coffOneAndHalfDay: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  coffTwoFullDay: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  giveOTAs: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  halfdayCoffEday: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  fulldayCoffEday: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  oneAndHalfDayCoffEday: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  twoDayCoffEday: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  overtimeHrs: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  status: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  showinsalaryslip: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  consider: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  createBy: {
    type: Sequelize.BIGINT,
    allowNull: false,
  },
  updateBy: {
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  createByIp: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  updateByIp: {
    type: Sequelize.STRING,
    allowNull: true,
  },

  pfApplicable: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  esicApplicable: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  missPunchMinutes: {
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  selfieWithFaceDetection: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  autoApprove: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },

  payType: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  payAmount: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  skipMinutesInOvertime: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },

  overtimeType: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'actual',
  },
  typeValue: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  monthDays: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  toShowOT: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  payheadMasterId: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  employeeESICPer: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  employerESICPer: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  preShiftHrsConsideration: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  showShift: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  extraOt: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
  },
  min_extra_ot_mins: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  extra_ot_mins: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  WHPHPriority: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  setCorrLimit: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  attCorrLimit: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  attBrType: {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: attendanceBranchTypeRule.ALL,
  },
  attBranch: {
    type: Sequelize.ARRAY(Sequelize.BIGINT),
    allowNull: true,
  },
  preShiftMin: {
    // Minimum Minutes For PreShiftHrs Consideration
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  Hfd_OT: {
    // Overtime Eligibility During Half-Day
    type: Sequelize.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  isWHAbsentRule: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  outSidePunchPermission: {
    type: Sequelize.ENUM(...Object.values(OutsidePunchPermissionEnum)),
  },
  autoApproveCoff: {
    // for auto approve coff/extra days on weekoff or holiday
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },

  extraHrsOTonWH: {
    // Hours beyond the set hours count as OT
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  branch_scope: {
    type: Sequelize.ENUM(...Object.values(policyScope)),
    defaultValue: policyScope.ALL,
  },
  department_scope: {
    type: Sequelize.ENUM(...Object.values(policyScope)),
    defaultValue: policyScope.ALL,
  },
  designation_scope: {
    type: Sequelize.ENUM(...Object.values(policyScope)),
    defaultValue: policyScope.ALL,
  },
  punchInRemarks: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  setCorrDayLimit: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  attCorrDayLimit: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  showVisit: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  isShiftShortfall: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  latePunchRestricted: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  shiftBasedRestriction: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  holidayCoff: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  holidayCoffRuleIn: {
    type: Sequelize.ENUM(...Object.values(setHolidayCoffRulesIn)),
  },
  holidayCoffHalfDay: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  holidayCoffFullDay: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  holidayCoffOneHalfDay: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  holidayCoffTwoDay: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  notifyReportingOnPunch: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  showHomeWorkingHours: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  punchOutRemarks: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  otCalcSetup: {
    defaultValue: false,
    type: Sequelize.BOOLEAN,
  },

  otRatioType: {
    type: Sequelize.ENUM(...Object.values(otRatioTypeEnum)),
  },
  ratio: {
    type: Sequelize.FLOAT,
  },
  weekOffOtCalcSetup: {
    defaultValue: false,
    type: Sequelize.BOOLEAN,
  },
  holidayOtCalcSetup: {
    defaultValue: false,
    type: Sequelize.BOOLEAN,
  },
  weekOffratio: {
    type: Sequelize.FLOAT,
  },
  holidayRatio: {
    type: Sequelize.FLOAT,
  },
  isNonPresentOT: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    comment: 'Convert working hours to overtime if attendance status ≠ present',
  },
  preShiftOT: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    comment: 'Convert Pre Shift Hours into OT',
  },
  isAttnCorrOnAbsent: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
    comment: 'Allow Attendance Correction for Fully Absent Employees',
  },
  isTimeCorrAllowed: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
    comment: 'Time Correction Allowed.',
  },
  isStatusChangeAllowed: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
    comment: 'Status Correction Allowed.',
  },
  isAddLogAllowed: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
    comment: 'Add Log Correction Allowed.',
  },
  attnCorrPermission:{
    type:Sequelize.ENUM(...Object.values(AttendanceCorrectionPermissionEnum)),
    defaultValue:AttendanceCorrectionPermissionEnum.IN_TIME_OUT_TIME_DESCRIPTION
  },
 punchIn_InputType:{
     type:Sequelize.ENUM(...Object.values(punchInputTypeEnum)),
    defaultValue:punchInputTypeEnum.NO_INPUT_REQUIRED
  },
    punchOut_InputType:{
     type:Sequelize.ENUM(...Object.values(punchInputTypeEnum)),
    defaultValue:punchInputTypeEnum.NO_INPUT_REQUIRED
  },
  continuePunchIn_InputType:{
     type:Sequelize.ENUM(...Object.values(punchInputTypeEnum)),
     defaultValue:punchInputTypeEnum.NO_INPUT_REQUIRED
  },
  autoPunchOutConfig:{
    type:Sequelize.ENUM(...Object.values(punchOutConfig)),
  },
   isAddlPaidDay:{
    type:Sequelize.BOOLEAN,
    defaultValue:false
   }
});

AttendancePolicyAmend.belongsTo(UserMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});

module.exports = AttendancePolicyAmend;