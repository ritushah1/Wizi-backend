const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const ExpensePayment = require('./expensePayment');
const UserExpenseTransaction = require('./userExpenseTransaction');
const table_name = 'expensePaymentTransaction';

const ExpensePaymentTransaction = sequelize.define(
  table_name,
  {
    expPayTransID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    ExpensePaymentID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    userExpenseTransactionID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateBy: {
      type: Sequelize.BIGINT,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteBy: {
      type: Sequelize.INTEGER,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  }
);

ExpensePaymentTransaction.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

ExpensePaymentTransaction.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

ExpensePaymentTransaction.addHook('beforeDestroy', (item, options) => {
  item.deleteBy = options.user.userMasterId;
  item.deleteByIp = options.user.userIpAddress;
});

ExpensePaymentTransaction.belongsTo(UserMaster, {
  as: 'c_By',
  foreignKey: { name: 'createBy' },
});

ExpensePaymentTransaction.belongsTo(UserMaster, {
  as: 'u_By',
  foreignKey: { name: 'updateBy' },
});

ExpensePaymentTransaction.belongsTo(UserMaster, {
  as: 'd_By',
  foreignKey: { name: 'deleteBy' },
});

ExpensePaymentTransaction.belongsTo(ExpensePayment, {
  as: 'ep',
  foreignKey: { name: 'ExpensePaymentID' },
});

ExpensePayment.hasMany(ExpensePaymentTransaction, {
  as: 'ep_ept',
  foreignKey: { name: 'ExpensePaymentID' },
});

ExpensePaymentTransaction.belongsTo(UserExpenseTransaction, {
  as: 'uet',
  foreignKey: { name: 'userExpenseTransactionID' },
});

UserExpenseTransaction.hasMany(ExpensePaymentTransaction, {
  as: 'uet_ept',
  foreignKey: { name: 'userExpenseTransactionID' },
});

module.exports = ExpensePaymentTransaction;
