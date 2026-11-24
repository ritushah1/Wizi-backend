const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const table_name = 'canteenLogs';
const EmployeePenalty = require('../models/employeePenalty');

const CanteenLogs = sequelize.define(table_name, {
  canteenLogsID: {
    type: Sequelize.BIGINT,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  //foreig key
  userMasterID: {
    type: Sequelize.BIGINT,
    allowNull: false,
  },
  logDateTime: {
    type: Sequelize.DATE,
    allowNull: false,
  },
  direction: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  photo: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  attendnaceFrom: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  longitude: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  latitude: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  address: {
    type: Sequelize.STRING,
    allowNull: false,
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
  serialNumber: {
    type: Sequelize.TEXT,
  },
  isS3Upload: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
});

CanteenLogs.belongsTo(UserMaster, { foreignKey: { name: 'userMasterID' } });
UserMaster.hasMany(CanteenLogs, { foreignKey: { name: 'userMasterID' } });

CanteenLogs.belongsTo(EmployeePenalty, {
  foreignKey: { name: 'empPenaltyID' },
});
module.exports = CanteenLogs;
