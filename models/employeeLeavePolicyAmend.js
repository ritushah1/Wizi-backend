const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const { policyScope, clubbedLeave } = require('../utils/dbUtils');

const EmployeeLeavePolicyAmend = sequelize.define('employeeLeavePolicyAmend', {
  employeeLeavePolicyAmend: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  employeeLeavePolicyID: {
    type: Sequelize.INTEGER,
    allowNull: false,
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
  allowCoffBackdate: {
    type: Sequelize.BOOLEAN,
  },
  allowMin: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
});

EmployeeLeavePolicyAmend.belongsTo(UserMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});

module.exports = EmployeeLeavePolicyAmend;
