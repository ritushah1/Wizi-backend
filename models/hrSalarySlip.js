/** @format */

const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const userMaster = require('./userMaster');
const {
  PayrollFrequencyType,
  paymentMode,
  paymentMode_PaidSalary,
} = require('../utils/dbUtils');
const table_name = 'hrSalarySlip';
const HRSalarySlip = sequelize.define(
  table_name,
  {
    hrSalarySlipID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    salaryYYYYMM: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    path: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
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
    salarySlipIssue: {
      type: Sequelize.INTEGER,
      allowNull: false,
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
    paid: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    paidDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    pfPaidDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    esicPaidDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    ptPaidDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    paymentMode: {
      type: Sequelize.ENUM(...Object.values(paymentMode_PaidSalary)),
    },
    referenceNo: {
      type: Sequelize.STRING,
    },
    referenceDate: {
      type: Sequelize.DATEONLY,
    },
    remarks: {
      type: Sequelize.TEXT,
    },
    holdBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    holdAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    salaryCalRemark: {
      type: Sequelize.TEXT,
    },
    isS3Upload: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    migration: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
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
        fields: ['salaryYYYYMM'],
      },
      {
        unique: false,
        fields: ['salaryYYYYMM', 'salarySlipIssue'],
      },
    ],
  },
);

HRSalarySlip.belongsTo(userMaster, { foreignKey: { name: 'userMasterID' } });
userMaster.hasMany(HRSalarySlip, { foreignKey: { name: 'userMasterID' } });
HRSalarySlip.belongsTo(userMaster, {
  foreignKey: { name: 'holdBy' },
  as: 'salaryHoldBy',
});
userMaster.hasMany(HRSalarySlip, {
  foreignKey: { name: 'holdBy' },
  as: 'salaryHoldBy',
});

module.exports = HRSalarySlip;
