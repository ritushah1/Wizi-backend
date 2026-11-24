const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const HrLeaveBalance = require('./hrLeaveBalance');
const UserMaster = require('./userMaster');
const { CoffUsedTypeEnum } = require('../utils/dbUtils');
const table_name = 'usedCoffTransaction';

const UsedCoffTransaction = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    date: {
      type: Sequelize.DATEONLY,
    },
    days: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM(...Object.values(CoffUsedTypeEnum)),
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.INTEGER,
    },
    updateBy: {
      type: Sequelize.INTEGER,
    },
    deleteBy: {
      type: Sequelize.INTEGER,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  { paranoid: true }
);

UsedCoffTransaction.addHook('beforeCreate', (UsedCoffTransaction, options) => {
  UsedCoffTransaction.createBy = options.user.userMasterId;
  UsedCoffTransaction.createByIp = options.user.userIpAddress;
});

UsedCoffTransaction.addHook('beforeUpdate', (UsedCoffTransaction, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  UsedCoffTransaction.updateBy = options.user.userMasterId;
  UsedCoffTransaction.ipAddress = options.user.userIpAddress;
  UsedCoffTransaction.updateByIp = options.user.userIpAddress;
});

UsedCoffTransaction.addHook('beforeDestroy', (UsedCoffTransaction, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  UsedCoffTransaction.deleteBy = options.user.userMasterId;
  UsedCoffTransaction.deleteByIp = options.user.userIpAddress;
});

UsedCoffTransaction.belongsTo(HrLeaveBalance, {
  foreignKey: { name: 'LeaveBalTranId' },
});

HrLeaveBalance.hasMany(UsedCoffTransaction, {
  foreignKey: { name: 'LeaveBalTranId' },
});

UsedCoffTransaction.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

UsedCoffTransaction.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

UsedCoffTransaction.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

module.exports = UsedCoffTransaction;
