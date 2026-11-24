/** @format */

const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'salaryPolicy';
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const {
  PayrollFrequencyType,
  OTGiveInEnum,
  MonthDaysTypeEnum,
  policyScope,
  monthlyOTCalcuationType,
} = require('../utils/dbUtils');

const SalaryPolicy = sequelize.define(table_name, {
  salaryPolicyID: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  salaryPolicyName: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  salaryCycleDate: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  salaryCalculationDays: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  status: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1,
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
  salarycalculationBasedon: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  monthlyFixhours: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  dailyFixhours: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  holidayHours: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  weekoffHours: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  leaveHours: {
    type: Sequelize.STRING,
    allowNull: true,
  },

  breakHours: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  overtimeAdded: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  salaryCycleConsider: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  considerTimeType: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  considerTimeValue: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  payrollFrequency: {
    type: Sequelize.ENUM(...Object.values(PayrollFrequencyType)),
    allowNull: false,
    defaultValue: PayrollFrequencyType.MONTHLY,
  },
  otGiveIn: {
    type: Sequelize.ENUM(...Object.values(OTGiveInEnum)),
    allowNull: true,
  },
  MonthDaysType: {
    type: Sequelize.ENUM(...Object.values(MonthDaysTypeEnum)),
  },
  fixDays: {
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
  monthly_ot_cal_type: {
    type: Sequelize.ENUM(...Object.values(monthlyOTCalcuationType)),
  },
  convertWorkedHoursToDays: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});

SalaryPolicy.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

SalaryPolicy.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

SalaryPolicy.belongsTo(UserMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

module.exports = SalaryPolicy;
