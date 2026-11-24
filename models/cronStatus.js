const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const { cronStatusTypes } = require('../utils/dbUtils');
const table_name = 'cronStatus';
const CronStatus = sequelize.define(table_name, {
  cronStatusID: {
    type: Sequelize.BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  companyMasterID: {
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  cronType: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  remarks: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  status: {
    type: Sequelize.TEXT,
    allowNull: true,
    defaultValue: cronStatusTypes.EXECUTED,
  },
});
CronStatus.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
module.exports = CronStatus;
