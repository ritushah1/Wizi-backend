const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'erpSyncLog';
const ErpSyncLogs = sequelize.define(table_name, {
  logID: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  query: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  syncType: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  expenseSyncData: {
    type: Sequelize.JSONB,
    allowNull: true,
  },
});

module.exports = ErpSyncLogs;
