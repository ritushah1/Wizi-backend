const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'expenseHead';
const CompanyMaster = require('./companyMaster');
const ExpenseCategory = require('./expenseCategory');
const UserMaster = require('./userMaster');
const ExpenseHeadAmend = require('./expenseHeadAmends');
const ExpensePolicyAmend = require('./expensePolicyAmends');
const ExpenseHead = sequelize.define(
  table_name,
  {
    expenseHeadId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    expenseHead: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    expenseCategoryId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    // accountHeadID: {
    //   type: Sequelize.INTEGER,
    //   allowNull: true,
    // },
    accountHeadID: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.BIGINT,
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
    deleteBy: {
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
  },
  {
    paranoid: true,
  },
);
ExpenseHead.addHook('beforeCreate', (ExpenseHead, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  ExpenseHead.createBy = options.user.userMasterId;
  ExpenseHead.updateBy = options.user.userMasterId;
  ExpenseHead.createByIp = options.user.userIpAddress;
  ExpenseHead.updateByIp = options.user.userIpAddress;
});

ExpenseHead.addHook('beforeUpdate', (ExpenseHead, options) => {
  ExpenseHead.updateBy = options.user.userMasterId;
  ExpenseHead.ipAddress = options.user.userIpAddress;
  ExpenseHead.updateByIp = options.user.userIpAddress;
});

ExpenseHead.addHook('beforeDestroy', async (ExpenseHead, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  ExpenseHead.deleteBy = options.user.userMasterId;
  ExpenseHead.deleteByIp = options.user.userIpAddress;
  await ExpenseHead.save({
    hooks: false,
    transaction: options.transaction,
  });
});

ExpenseHead.addHook('beforeSave', async (expenseHeads, options) => {
  expenseHeads.user = options.user;
});
ExpenseHead.addHook('beforeBulkCreate', async (expenseHeads, options) => {
  expenseHeads.user = options.user;
});
ExpenseHead.addHook('afterSave', async (expenseHeads, options) => {
  await addExpenseHeadAmend(expenseHeads, options);
});
ExpenseHead.addHook('afterBulkCreate', async (expenseHeads, options) => {
  await addExpenseHeadAmend(expenseHeads, options);
});

async function addExpenseHeadAmend(expenseHeads, options) {
  const list = Array.isArray(expenseHeads) ? expenseHeads : [expenseHeads];

  const user = Array.isArray(expenseHeads)
    ? expenseHeads.user
    : expenseHeads.user;

  const rows = list.map((expenseHead) => {
    const data = expenseHead.get({ plain: true });

    return {
      expenseHeadId: data.expenseHeadId,
      expenseHead: data.expenseHead,
      expenseCategoryId: data.expenseCategoryId,
      companyMasterID: data.companyMasterID,
      accountHeadID: data.accountHeadID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await ExpenseHeadAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

ExpenseHead.belongsTo(ExpenseCategory, {
  foreignKey: { name: 'expenseCategoryId' },
});
ExpenseHead.belongsTo(ExpenseCategory, {
  as: 'ec',
  foreignKey: { name: 'expenseCategoryId' },
});
ExpenseHead.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
ExpenseHead.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});
ExpenseHeadAmend.belongsTo(ExpenseHead, {
  as: 'expenseHeadAmend',
  foreignKey: { name: 'expenseHeadId' },
});
ExpensePolicyAmend.belongsTo(ExpenseHead, {
  foreignKey: { name: 'headID' },
});
ExpenseHead.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

ExpenseHead.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});


module.exports = ExpenseHead;
