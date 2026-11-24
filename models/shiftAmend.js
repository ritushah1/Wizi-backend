const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const { ShiftTypeEnum } = require('../utils/dbUtils');
const table_name = 'shiftAmend';

const ShiftAmend = sequelize.define(table_name, {
  shiftAmendID: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  shiftID: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  shiftName: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  shiftCode: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  shiftDesc: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  table: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  referenceId: {
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  branchID: {
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  shiftGrace: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1,
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
  shiftType: {
    type: Sequelize.ENUM(...Object.values(ShiftTypeEnum)),
  },
});

ShiftAmend.belongsTo(UserMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});

module.exports = ShiftAmend;
