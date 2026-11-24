const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'expenseCategory';
const CompanyMaster = require('./companyMaster');
const ExpenseCategoryAmend = require('./expenseCategoryAmends');
const UserMaster = require('./userMaster');
const ExpenseCategory = sequelize.define(
  table_name,
  {
    expenseCategoryId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    expenseCategory: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
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

ExpenseCategory.addHook('beforeCreate', (ExpenseCategory, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  ExpenseCategory.createBy = options.user.userMasterId;
  ExpenseCategory.updateBy = options.user.userMasterId;
  ExpenseCategory.createByIp = options.user.userIpAddress;
  ExpenseCategory.updateByIp = options.user.userIpAddress;
});

ExpenseCategory.addHook('beforeUpdate', (ExpenseCategory, options) => {
  ExpenseCategory.updateBy = options.user.userMasterId;
  ExpenseCategory.ipAddress = options.user.userIpAddress;
  ExpenseCategory.updateByIp = options.user.userIpAddress;
});

ExpenseCategory.addHook('beforeDestroy', async (ExpenseCategory, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  ExpenseCategory.deleteBy = options.user.userMasterId;
  ExpenseCategory.deleteByIp = options.user.userIpAddress;
  await ExpenseCategory.save({
    hooks: false,
    transaction: options.transaction,
  });
});

ExpenseCategory.addHook('beforeSave', async (expenseCategory, options) => {
  expenseCategory.user = options.user;
});
ExpenseCategory.addHook(
  'beforeBulkCreate',
  async (expenseCategory, options) => {
    expenseCategory.user = options.user;
  },
);
ExpenseCategory.addHook('afterBulkCreate', async (expenseCategory, options) => {
  await addExpenseCategoryAmend(expenseCategory, options);
});
ExpenseCategory.addHook('afterSave', async (expenseCategory, options) => {
  await addExpenseCategoryAmend(expenseCategory, options);
});
async function addExpenseCategoryAmend(expenseCategories, options) {
  const list = Array.isArray(expenseCategories)
    ? expenseCategories
    : [expenseCategories];

  const user = Array.isArray(expenseCategories)
    ? expenseCategories.user
    : expenseCategories.user;

  const rows = list.map((expenseCategory) => {
    const data = expenseCategory.get({ plain: true });

    return {
      expenseCategoryId: data.expenseCategoryId,
      expenseCategory: data.expenseCategory,
      companyMasterID: data.companyMasterID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await ExpenseCategoryAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}
ExpenseCategory.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
ExpenseCategoryAmend.belongsTo(ExpenseCategory, {
  as: 'expensecategory',
  foreignKey: { name: 'expenseCategoryId' },
});
ExpenseCategory.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});
ExpenseCategory.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

ExpenseCategory.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});


module.exports = ExpenseCategory;
