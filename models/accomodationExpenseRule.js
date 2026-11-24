const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const ExpensePolicy = require('./expensePolicy');
const table_name = 'accomodationExpenseRule';

const AccomodationExpenseRule = sequelize.define(
  table_name,
  {
    accomodationExpenseRuleID: {
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
  }
);

AccomodationExpenseRule.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

AccomodationExpenseRule.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

AccomodationExpenseRule.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

AccomodationExpenseRule.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

AccomodationExpenseRule.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

AccomodationExpenseRule.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

AccomodationExpenseRule.belongsTo(ExpensePolicy, {
  foreignKey: { name: 'expensePolicyID' },
});

ExpensePolicy.hasMany(AccomodationExpenseRule, {
  foreignKey: { name: 'expensePolicyID' },
});


module.exports = AccomodationExpenseRule;
