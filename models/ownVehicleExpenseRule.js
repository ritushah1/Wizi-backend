const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const ExpensePolicy = require('./expensePolicy');
const table_name = 'ownVehicleExpenseRule';

const OwnVehicleExpenseRule = sequelize.define(
  table_name,
  {
    ownVehicleExpenseRuleID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    expensePolicyID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Expense Policy Is Required!!!' },
      },
    },
    priceMetro: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    priceNonMetro: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    stateID: { type: Sequelize.INTEGER, allowNull: false },
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
      type: Sequelize.BIGINT,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  },
);

OwnVehicleExpenseRule.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

OwnVehicleExpenseRule.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

OwnVehicleExpenseRule.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

OwnVehicleExpenseRule.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

OwnVehicleExpenseRule.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

OwnVehicleExpenseRule.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

OwnVehicleExpenseRule.belongsTo(ExpensePolicy, {
  foreignKey: { name: 'expensePolicyID' },
});

ExpensePolicy.hasMany(OwnVehicleExpenseRule, {
  foreignKey: { name: 'expensePolicyID' },
});

module.exports = OwnVehicleExpenseRule;
