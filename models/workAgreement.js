const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const table_name = 'workAgreement';

const WorkAgreement = sequelize.define(table_name, {
  workAgreementID: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  workAgreementName: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  letterTemplate: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  letterHead: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  status: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1,
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
  setReferenceNumber: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  prefix: {
    type: Sequelize.STRING,
  },
  refNoFormat: {
    type: Sequelize.STRING,
  },
  startingSequence: {
    type: Sequelize.INTEGER,
  },
  currentSequence: {
    type: Sequelize.INTEGER,
  },
  resetRefNumber: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
});

WorkAgreement.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

module.exports = WorkAgreement;
