const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const ExpenseHead = require('./expenseHead');
const { expenseRuleType } = require('../utils/commonVars');
const ExpensePolicyAmend = require('./expensePolicyAmends');
const table_name = 'expensePolicy';

const ExpensePolicy = sequelize.define(
  table_name,
  {
    expensePolicyID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    headID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Expense Head Is Required!!!' },
      },
    },
    effectiveDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Effective Date Is Required!!!' },
      },
    },
    expenseType: {
      type: Sequelize.ENUM(...Object.values(expenseRuleType)),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Effective Date Is Required!!!' },
      },
    },
    policyName: {
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

ExpensePolicy.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

ExpensePolicy.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

ExpensePolicy.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

ExpensePolicy.addHook('beforeSave', async (expensePolicy, options) => {
  expensePolicy.user = options.user;
});
ExpensePolicy.addHook('afterSave', async (expensePolicy, options) => {
  await addExpensePolicyAmend(expensePolicy, options);
});

async function addExpensePolicyAmend(expensePolicy, options) {
  const list = Array.isArray(expensePolicy) ? expensePolicy : [expensePolicy];

  const user = Array.isArray(expensePolicy)
    ? expensePolicy.user
    : expensePolicy.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      expensePolicyID: data.expensePolicyID,
      headID: data.headID,
      effectiveDate: data.effectiveDate,
      expenseType: data.expenseType,
      policyName: data.policyName,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await ExpensePolicyAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

ExpensePolicy.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

ExpensePolicy.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

ExpensePolicy.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

ExpensePolicy.belongsTo(ExpenseHead, {
  as: 'ExpenseHead',
  foreignKey: { name: 'headID' },
});

ExpenseHead.hasMany(ExpensePolicy, {
  foreignKey: { name: 'headID' },
});
ExpensePolicyAmend.belongsTo(ExpensePolicy, {
  as: 'expensePolicyAmends',
  foreignKey: { name: 'expensePolicyID' },
});

module.exports = ExpensePolicy;
