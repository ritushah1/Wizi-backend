const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');

const table_name = 'hrSalaryFieldsAmend';

const HRSalaryFieldsAmend = sequelize.define(table_name, {
  salaryFieldAmendID: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  salaryFieldID: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  payheadMasterId: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  salaryFieldActive: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  salaryFieldInactiveDate: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  salaryFieldIndex: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  salaryFieldSide: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  salaryFieldAttanChk: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  salaryFieldMaxAmt: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  salaryFieldWhen: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  salaryFieldWhenMonth: {
    type: Sequelize.ARRAY(Sequelize.STRING),
    allowNull: true,
  },
  salaryFieldDefaultPer: {
    type: Sequelize.DECIMAL,
    allowNull: true,
  },
  salaryFieldRound: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  salaryFieldRoundNo: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  salaryFieldShow: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  salaryFieldShowInCTC: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  salaryFieldInCTCEff: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  salaryFieldFixVariable: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  salaryFieldMaxRange: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  salaryFieldSrNo: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  companyMasterID: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  Form16ID: {
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
  createByIp: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  formula: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  formulaID: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  payheadDisplayName: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  roundOffType: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  considerIn: {
    type: Sequelize.STRING,
    allowNull: true,
  },

  assignSalaryRound: {
    type: Sequelize.STRING,
    allowNull: true,
  },

  assignSalaryRoundNo: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },

  assignSalaryRoundOffType: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
});

HRSalaryFieldsAmend.belongsTo(UserMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});

module.exports = HRSalaryFieldsAmend;
