/** @format */

const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const userMaster = require('./userMaster');
const salaryMaster = require('./hrSalaryMaster');
const { PayrollFrequencyType } = require('../utils/dbUtils');
const Department = require('./department');
const Designation = require('./designation');
const BranchMaster = require('./branchMaster');
const table_name = 'hrSalaryTrasaction';
const HRSalaryTrasaction = sequelize.define(
  table_name,
  {
    userSalaryTranID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    salaryMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    salaryYYYYMM: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    EmployeeSalaryPer: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    EmployeeSalaryAmount: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    SalaryCalcOnDays: {
      type: Sequelize.FLOAT,
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
    calculatedOn: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    payrollFrequency: {
      type: Sequelize.ENUM(...Object.values(PayrollFrequencyType)),
      allowNull: false,
      defaultValue: PayrollFrequencyType.MONTHLY,
    },
    branchId: {
      type: Sequelize.INTEGER,
    },
    departmentId: {
      type: Sequelize.INTEGER,
    },
    designationId: {
      type: Sequelize.INTEGER,
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
        fields: ['salaryMasterID'],
      },
      {
        unique: false,
        fields: ['salaryYYYYMM'],
      },
    ],
  },
);

HRSalaryTrasaction.belongsTo(userMaster, {
  foreignKey: { name: 'userMasterID' },
});
HRSalaryTrasaction.belongsTo(salaryMaster, {
  foreignKey: { name: 'salaryMasterID' },
});

HRSalaryTrasaction.belongsTo(salaryMaster, {
  as: 'HSM',
  foreignKey: { name: 'salaryMasterID' },
});

userMaster.hasMany(HRSalaryTrasaction, {
  foreignKey: { name: 'userMasterID' },
});

HRSalaryTrasaction.belongsTo(userMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});

HRSalaryTrasaction.belongsTo(Department, {
  foreignKey: { name: 'departmentId' },
});
HRSalaryTrasaction.belongsTo(Designation, {
  foreignKey: { name: 'designationId' },
});
HRSalaryTrasaction.belongsTo(BranchMaster, {
  foreignKey: { name: 'branchId' },
});

module.exports = HRSalaryTrasaction;
