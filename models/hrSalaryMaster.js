/** @format */

const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const userMaster = require('./userMaster');
const gradeSalaryStructure = require('./gradeSalaryStructure');
const StateMaster = require('./statemaster');
const { SkillCategoryType, PayrollFrequencyType } = require('../utils/dbUtils');
const Corporation = require('./corporation');
const MinWagesMaster = require('./minWagesMaster');
const SalaryIncrementRequest = require('./salaryIncrementRequest');
const table_name = 'hrSalaryMaster';
const HRSalaryMasterFields = sequelize.define(
  table_name,
  {
    salaryMasterID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    gradeSalaryStructureID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    EmployeeSalaryPer: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    EmployeeSalaryAmount: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    salaryFromYYYYMM: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    ptaxinctc: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    stateid: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    AmountIn: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    ActualEmployeeSalaryAmount: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    skillCategory: {
      type: Sequelize.ENUM(...Object.values(SkillCategoryType)),
    },
    corporationId: {
      type: Sequelize.INTEGER,
    },
    minWagesMasterId: {
      type: Sequelize.INTEGER,
    },
    payrollFrequency: {
      type: Sequelize.ENUM(...Object.values(PayrollFrequencyType)),
      allowNull: false,
      defaultValue: PayrollFrequencyType.MONTHLY,
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    salaryIncrementRequestID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
  },
  {
    indexes: [
      {
        unique: false,
        fields: ['userMasterID'],
      },
      {
        unique: false,
        fields: ['gradeSalaryStructureID'],
      },
      {
        unique: false,
        fields: ['salaryFromYYYYMM'],
      },
    ],
  }
);

HRSalaryMasterFields.belongsTo(userMaster, {
  foreignKey: { name: 'userMasterID' },
});
HRSalaryMasterFields.belongsTo(gradeSalaryStructure, {
  foreignKey: { name: 'gradeSalaryStructureID' },
});

HRSalaryMasterFields.belongsTo(gradeSalaryStructure, {
  as: 'GSS',
  foreignKey: { name: 'gradeSalaryStructureID' },
});

HRSalaryMasterFields.belongsTo(StateMaster, {
  foreignKey: { name: 'stateid' },
});

userMaster.hasMany(HRSalaryMasterFields, {
  foreignKey: { name: 'userMasterID' },
});

HRSalaryMasterFields.belongsTo(Corporation, {
  foreignKey: { name: 'corporationId' },
});

HRSalaryMasterFields.belongsTo(MinWagesMaster, {
  foreignKey: { name: 'minWagesMasterId' },
});

HRSalaryMasterFields.belongsTo(SalaryIncrementRequest, {
  foreignKey: { name: 'salaryIncrementRequestID' },
});
SalaryIncrementRequest.hasMany(HRSalaryMasterFields, {
  foreignKey: { name: 'salaryIncrementRequestID' },
});

module.exports = HRSalaryMasterFields;
