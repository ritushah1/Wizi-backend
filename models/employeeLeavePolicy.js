const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const HrLeaveMaster = require('./hrLeaveMaster');
const {
  policyScope,
  clubbedLeave,
  EarnedLeaveCreditType,
} = require('../utils/dbUtils');
const AttendancePolicyAmend = require('./attendancePolicyAmend');
const EmployeeLeavePolicyAmend = require('./employeeLeavePolicyAmend');
const employeeLeavePolicy = sequelize.define(
  'employeeLeavePolicy',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    leavePolicyName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    leaveType: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    yearlyLeave: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    leaveOperationalYear: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    minDaysRequire: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    earnBaseType: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    creditPeriod: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    creditDate: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    creditType: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    leaveLapse: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    allowFutureApplyDays: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    allowPastApplyDays: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    allowMinInMonth: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    allowMaxInMonth: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    allowHalfDays: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    employementType: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
    },
    createBy: {
      type: Sequelize.INTEGER,
    },
    updateBy: {
      type: Sequelize.INTEGER,
    },
    deleteBy: {
      type: Sequelize.INTEGER,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
    min_leave_attachment: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    leaveOnNoticePeriod: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '1',
    },
    leaveOnProbation: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: '1',
    },
    probationDays: {
      type: Sequelize.INTEGER,
    },
    presentDays: {
      type: Sequelize.INTEGER,
    },
    isAdminApplicable: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    isAutoAdjusted: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    autoAdjustedPriority: {
      type: Sequelize.INTEGER,
    },
    priority: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
    },
    expiryDays: {
      type: Sequelize.INTEGER,
    },
    // Monthly
    monthly_CF_ENC_LPS: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isMonthly_CF: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    monthly_CF_limit: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    isMonthly_ENC: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    monthly_ENC_limit: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    isMonthly_LPS: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    monthly_LPS_limit: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },

    // Quarterly
    quarterly_CF_ENC_LPS: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isQuarterly_CF: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    quarterly_CF_limit: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    isQuarterly_ENC: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    quarterly_ENC_limit: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    isQuarterly_LPS: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    quarterly_LPS_limit: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },

    // Half-Yearly
    halfYearly_CF_ENC_LPS: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isHalfYearly_CF: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    halfYearly_CF_limit: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    isHalfYearly_ENC: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    halfYearly_ENC_limit: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    isHalfYearly_LPS: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    halfYearly_LPS_limit: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },

    // Yearly
    yearly_CF_ENC_LPS: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isYearly_CF: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    yearly_CF_limit: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    isYearly_ENC: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    yearly_ENC_limit: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    isYearly_LPS: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    yearly_LPS_limit: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    fixedAmount_ENC: {
      // fix Amount for increment
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    payheadIds: {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: true,
    },
    ratio: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    allowMaxInQuarter: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    allowMaxInHalfYear: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    allowMaxInYear: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    isAutoApprove: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    autoApproveLimit: {
      type: Sequelize.INTEGER,
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
    applyLeave: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    showLeaveBalance: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    leaveEncashmentAtFNF: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
    minServiceDuration: {
      // in months
      type: Sequelize.INTEGER,
    },
    clubbedLeave: {
      type: Sequelize.ENUM(...Object.values(clubbedLeave)),
      allowNull: false,
      defaultValue: clubbedLeave.NORESTRICTION,
    },
    clubIDs: {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: true,
    },
    isHalfDayClubbing: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    earnedLeaveCreditType: {
      type: Sequelize.ENUM(...Object.values(EarnedLeaveCreditType)),
      allowNull: true,
    },
    allowCoffBackdate:{
      type: Sequelize.BOOLEAN,
    },
    allowMin:{
      type:Sequelize.INTEGER,
      allowNull:true
    }
  },
  { paranoid: true },
);

employeeLeavePolicy.belongsTo(HrLeaveMaster, {
  foreignKey: { name: 'leaveId' },
});
employeeLeavePolicy.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterId' },
});
employeeLeavePolicy.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
  as: 'createdByUser',
});
employeeLeavePolicy.belongsTo(UserMaster, {
  foreignKey: { name: 'updateBy' },
  as: 'updatedByUser',
});
employeeLeavePolicy.belongsTo(UserMaster, {
  foreignKey: { name: 'deleteBy' },
  as: 'deletedByUser',
});
employeeLeavePolicy.addHook('beforeCreate', (leave, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  leave.createBy = options.user.userMasterId;
  leave.createByIp = options.user.userIpAddress;
});

employeeLeavePolicy.addHook('beforeUpdate', (leave, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  leave.updateBy = options.user.userMasterId;
  leave.updateByIp = options.user.userIpAddress;
});

employeeLeavePolicy.addHook('beforeDestroy', (leave, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  leave.deleteBy = options.user.userMasterId;
  leave.deleteByIp = options.user.userIpAddress;
});

async function addEmployeeLeavePolicyAmend(process, options) {
  const user = options.user;

  const data = process.get({ plain: true });

  await EmployeeLeavePolicyAmend.create(
    {
      employeeLeavePolicyID: data.id,
      companyMasterID: data.companyMasterID,
      leavePolicyName: data.leavePolicyName,
      leaveType: data.leaveType,
      yearlyLeave: data.yearlyLeave,
      leaveOperationalYear: data.leaveOperationalYear,
      minDaysRequire: data.minDaysRequire,
      earnBaseType: data.earnBaseType,
      creditPeriod: data.creditPeriod,
      creditDate: data.creditDate,
      creditType: data.creditType,
      leaveLapse: data.leaveLapse,
      allowFutureApplyDays: data.allowFutureApplyDays,
      allowPastApplyDays: data.allowPastApplyDays,
      allowMinInMonth: data.allowMinInMonth,
      allowMaxInMonth: data.allowMaxInMonth,
      allowHalfDays: data.allowHalfDays,
      employementType: data.employementType,
      min_leave_attachment: data.min_leave_attachment,
      leaveOnNoticePeriod: data.leaveOnNoticePeriod,
      leaveOnProbation: data.leaveOnProbation,
      probationDays: data.probationDays,
      isAdminApplicable: data.isAdminApplicable,
      presentDays: data.presentDays,
      isAutoAdjusted: data.isAutoAdjusted,
      priority: data.priority,
      expiryDays: data.expiryDays,
      monthly_CF_ENC_LPS: data.monthly_CF_ENC_LPS,
      isMonthly_CF: data.isMonthly_CF,
      monthly_CF_limit: data.monthly_CF_limit,
      isMonthly_ENC: data.isMonthly_ENC,
      monthly_ENC_limit: data.monthly_ENC_limit,
      isMonthly_LPS: data.isMonthly_LPS,
      monthly_LPS_limit: data.monthly_LPS_limit,
      quarterly_CF_ENC_LPS: data.quarterly_CF_ENC_LPS,
      isQuarterly_CF: data.isQuarterly_CF,
      quarterly_CF_limit: data.quarterly_CF_limit,
      isQuarterly_ENC: data.isQuarterly_ENC,
      quarterly_ENC_limit: data.quarterly_ENC_limit,
      isQuarterly_LPS: data.isQuarterly_LPS,
      quarterly_LPS_limit: data.quarterly_LPS_limit,
      halfYearly_CF_ENC_LPS: data.halfYearly_CF_ENC_LPS,
      isHalfYearly_CF: data.isHalfYearly_CF,
      halfYearly_CF_limit: data.halfYearly_CF_limit,
      isHalfYearly_ENC: data.isHalfYearly_ENC,
      halfYearly_ENC_limit: data.halfYearly_ENC_limit,
      isHalfYearly_LPS: data.isHalfYearly_LPS,
      halfYearly_LPS_limit: data.halfYearly_LPS_limit,
      yearly_CF_ENC_LPS: data.yearly_CF_ENC_LPS,
      isYearly_CF: data.isYearly_CF,
      yearly_CF_limit: data.yearly_CF_limit,
      isYearly_ENC: data.isYearly_ENC,
      yearly_ENC_limit: data.yearly_ENC_limit,
      isYearly_LPS: data.isYearly_LPS,
      yearly_LPS_limit: data.yearly_LPS_limit,
      fixedAmount_ENC: data.fixedAmount_ENC,
      payheadIds: data.payheadIds,
      ratio: data.ratio,
      allowMaxInQuarter: data.allowMaxInQuarter,
      allowMaxInHalfYear: data.allowMaxInHalfYear,
      allowMaxInYear: data.allowMaxInYear,
      isAutoApprove: data.isAutoApprove,
      autoApproveLimit: data.autoApproveLimit,
      branch_scope: data.branch_scope,
      department_scope: data.department_scope,
      designation_scope: data.designation_scope,
      applyLeave: data.applyLeave,
      showLeaveBalance: data.showLeaveBalance,
      leaveEncashmentAtFNF: data.leaveEncashmentAtFNF,
      minServiceDuration: data.minServiceDuration,
      clubbedLeave: data.clubbedLeave,
      clubIDs: data.clubIDs,
      isHalfDayClubbing: data.isHalfDayClubbing,
      EarnedLeaveCreditType: data.EarnedLeaveCreditType,
allowCoffBackdate:data.allowCoffBackdate,
allowMin:data.allowMin,
      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    },
    {
      transaction: options.transaction,
    },
  );
}

employeeLeavePolicy.addHook('afterSave', async (attendancePolicy, options) => {
  await addEmployeeLeavePolicyAmend(attendancePolicy, options);
});

EmployeeLeavePolicyAmend.belongsTo(employeeLeavePolicy, {
  as: 'employeeLeavePolicy',
  foreignKey: {
    name: 'employeeLeavePolicyID',
  },
});

employeeLeavePolicy.hasMany(EmployeeLeavePolicyAmend, {
  as: 'amendHistory',
  foreignKey: {
    name: 'employeeLeavePolicyID',
  },
});

module.exports = employeeLeavePolicy;
