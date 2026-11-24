const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'hrLeaveTypes';
const HrLeaveMaster = require('./hrLeaveMaster');
const companyMaster = require('./companyMaster');
const HrLeaveTypes = sequelize.define(
  table_name,
  {
    LeaveTranId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    LeaveID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    SortIndex: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },

    Leave_Allow: {
      type: Sequelize.STRING,
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
    leaveTypeChange: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    indexes: [
      {
        unique: false,
        fields: ['LeaveID'],
      },
      {
        unique: false,
        fields: ['SortIndex'],
      },
    ],
  }
);
HrLeaveTypes.belongsTo(HrLeaveMaster, {
  as: 'LeaveMaster',
  foreignKey: { name: 'LeaveID' },
});
HrLeaveTypes.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
companyMaster.hasMany(HrLeaveTypes, {
  foreignKey: { name: 'companyMasterID' },
})
module.exports = HrLeaveTypes;
