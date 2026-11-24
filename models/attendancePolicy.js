const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'attendancePolicy';
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const {
  attendanceBranchTypeRule,
  OutsidePunchPermissionEnum,
  policyScope,
  setHolidayCoffRulesIn,
  otRatioTypeEnum,
  AttendanceCorrectionPermissionEnum,
  punchInputTypeEnum,
  punchOutConfig,
} = require('../utils/dbUtils');
const Payheadmaster = require('./payhead');
const AttendancePolicyAmend = require('./attendancePolicyAmend');
const AttendancePolicy = sequelize.define(
  table_name,
  {
    attendancePolicyID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
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
    // delete after deployed
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
      comment:
        'Convert working hours to overtime if attendance status ≠ present',
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
    deleteBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    attnCorrPermission: {
      type: Sequelize.ENUM(
        ...Object.values(AttendanceCorrectionPermissionEnum),
      ),
      defaultValue:
        AttendanceCorrectionPermissionEnum.IN_TIME_OUT_TIME_DESCRIPTION,
    },
    autoPunchOutConfig: {
      type: Sequelize.ENUM(...Object.values(punchOutConfig)),
    },
    isAddlPaidDay: {
      type: Sequelize.BOOLEAN,
    },
    // ----------------------- Don't delete this commented fields -----------

    punchIn_InputType: {
      type: Sequelize.ENUM(...Object.values(punchInputTypeEnum)),
      defaultValue: punchInputTypeEnum.NO_INPUT_REQUIRED,
    },
    punchOut_InputType: {
      type: Sequelize.ENUM(...Object.values(punchInputTypeEnum)),
      defaultValue: punchInputTypeEnum.NO_INPUT_REQUIRED,
    },
    continuePunchIn_InputType: {
      type: Sequelize.ENUM(...Object.values(punchInputTypeEnum)),
      defaultValue: punchInputTypeEnum.NO_INPUT_REQUIRED,
    },
  },
  { paranoid: true },
);

AttendancePolicy.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

AttendancePolicy.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

AttendancePolicy.belongsTo(UserMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

AttendancePolicy.belongsTo(Payheadmaster, {
  foreignKey: 'payheadMasterId',
});

async function addAttendancePolicyAmend(process, options) {
  const user = options.user;

  const data = process.get({ plain: true });

  await AttendancePolicyAmend.create(
    {
      attendancePolicyID: data.attendancePolicyID,
      companyMasterID: data.companyMasterID,
      attendancePolicyName: data.attendancePolicyName,
      selfieAttendance: data.selfieAttendance,
      singleMultiplePunchInPunchOut: data.singleMultiplePunchInPunchOut,
      outsidePunchInPunchOut: data.outsidePunchInPunchOut,
      automaticAssignShift: data.automaticAssignShift,
      sandwichLeave: data.sandwichLeave,
      BeforeAfterLeave: data.BeforeAfterLeave,
      weekoffsandwichLeave: data.weekoffsandwichLeave,
      holidaysandwichLeave: data.holidaysandwichLeave,
      HFDBeforeAfterLeave: data.HFDBeforeAfterLeave,
      considerWorkingHours: data.considerWorkingHours,
      considerOvertimeAfter: data.considerOvertimeAfter,
      overtimeEntryAfterMin: data.overtimeEntryAfterMin,
      attendanceInMobile: data.attendanceInMobile,
      coff: data.coff,
      coffhalfday: data.coffhalfday,
      cofffullday: data.cofffullday,
      coffOneAndHalfDay: data.coffOneAndHalfDay,
      coffTwoFullDay: data.coffTwoFullDay,
      giveOTAs: data.giveOTAs,
      halfdayCoffEday: data.halfdayCoffEday,
      fulldayCoffEday: data.fulldayCoffEday,
      oneAndHalfDayCoffEday: data.oneAndHalfDayCoffEday,
      twoDayCoffEday: data.twoDayCoffEday,
      overtimeHrs: data.overtimeHrs,
      status: data.status,
      showinsalaryslip: data.showinsalaryslip,
      consider: data.consider,
      pfApplicable: data.pfApplicable,
      esicApplicable: data.esicApplicable,
      missPunchMinutes: data.missPunchMinutes,
      selfieWithFaceDetection: data.selfieWithFaceDetection,
      autoApprove: data.autoApprove,
      payType: data.payType,
      payAmount: data.payAmount,
      skipMinutesInOvertime: data.skipMinutesInOvertime,
      overtimeType: data.overtimeType,
      typeValue: data.typeValue,
      monthDays: data.monthDays,
      toShowOT: data.toShowOT,
      payheadMasterId: data.payheadMasterId,
      employeeESICPer: data.employeeESICPer,
      employerESICPer: data.employerESICPer,
      preShiftHrsConsideration: data.preShiftHrsConsideration,
      showShift: data.showShift,
      extraOt: data.extraOt,
      min_extra_ot_mins: data.min_extra_ot_mins,
      extra_ot_mins: data.extra_ot_mins,
      WHPHPriority: data.WHPHPriority,
      setCorrLimit: data.setCorrLimit,
      attCorrLimit: data.attCorrLimit,
      attBrType: data.attBrType,
      attBranch: data.attBranch,
      preShiftMin: data.preShiftMin,
      Hfd_OT: data.Hfd_OT,
      isWHAbsentRule: data.isWHAbsentRule,
      outSidePunchPermission: data.outSidePunchPermission,
      autoApproveCoff: data.autoApproveCoff,
      extraHrsOTonWH: data.extraHrsOTonWH,
      branch_scope: data.branch_scope,
      department_scope: data.department_scope,
      designation_scope: data.designation_scope,
      punchInRemarks: data.punchInRemarks,
      setCorrDayLimit: data.setCorrDayLimit,
      attCorrDayLimit: data.attCorrDayLimit,
      showVisit: data.showVisit,
      isShiftShortfall: data.isShiftShortfall,
      latePunchRestricted: data.latePunchRestricted,
      shiftBasedRestriction: data.shiftBasedRestriction,
      holidayCoff: data.holidayCoff,
      holidayCoffRuleIn: data.holidayCoffRuleIn,
      holidayCoffHalfDay: data.holidayCoffHalfDay,
      holidayCoffFullDay: data.holidayCoffFullDay,
      holidayCoffOneHalfDay: data.holidayCoffOneHalfDay,
      holidayCoffTwoDay: data.holidayCoffTwoDay,
      notifyReportingOnPunch: data.notifyReportingOnPunch,
      showHomeWorkingHours: data.showHomeWorkingHours,
      punchOutRemarks: data.punchOutRemarks,
      otCalcSetup: data.otCalcSetup,
      otRatioType: data.otRatioType,
      ratio: data.ratio,
      weekOffOtCalcSetup: data.weekOffOtCalcSetup,
      holidayOtCalcSetup: data.holidayOtCalcSetup,
      weekOffratio: data.weekOffratio,
      holidayRatio: data.holidayRatio,
      preShiftOT: data.preShiftOT,
      isAttnCorrOnAbsent: data.isAttnCorrOnAbsent,
      isTimeCorrAllowed: data.isTimeCorrAllowed,
      isNonPresentOT: data.isNonPresentOT,
      isStatusChangeAllowed: data.isStatusChangeAllowed,
      isAddLogAllowed: data.isAddLogAllowed,
      attnCorrPermission: data.attnCorrPermission,
      autoPunchOutConfig: data.autoPunchOutConfig,
      isAddlPaidDay: data.isAddlPaidDay,
      // punchIn_InputType:data.punchIn_InputType,
      // punchOut_InputType:data.punchOut_InputType,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    },
    {
      transaction: options.transaction,
    },
  );
}

AttendancePolicy.addHook('afterSave', async (attendancePolicy, options) => {
  await addAttendancePolicyAmend(attendancePolicy, options);
});

AttendancePolicy.addHook('beforeDestroy', (attendancePolicy, options) => {
  attendancePolicy.deleteBy = options.user.userMasterId;
  attendancePolicy.deleteByIp = options.user.userIpAddress;
});

AttendancePolicyAmend.belongsTo(AttendancePolicy, {
  as: 'attendancePolicy',
  foreignKey: {
    name: 'attendancePolicyID',
  },
});

AttendancePolicy.hasMany(AttendancePolicyAmend, {
  as: 'amendAttendanceHistory',
  foreignKey: {
    name: 'attendancePolicyID',
  },
});

module.exports = AttendancePolicy;
