const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'officeExpenseCategory';
const CompanyMaster = require('./companyMaster');
const OfficeExpenseCategoryAmend = require('./officeExpenseCategoryAmends');
const UserMaster = require('./userMaster');
const OfficeExpenseCategory = sequelize.define(
  table_name,
  {
    officeExpenseCategoryID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    officeExpenseCategory: {
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
  {
    paranoid: true,
  },
);

OfficeExpenseCategory.addHook(
  'beforeCreate',
  (officeExpenseCategory, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    officeExpenseCategory.createBy = options.user.userMasterId;
    officeExpenseCategory.updateBy = options.user.userMasterId;
    officeExpenseCategory.createByIp = options.user.userIpAddress;
    officeExpenseCategory.updateByIp = options.user.userIpAddress;
  },
);

OfficeExpenseCategory.addHook(
  'beforeUpdate',
  (officeExpenseCategory, options) => {
    officeExpenseCategory.updateBy = options.user.userMasterId;
    officeExpenseCategory.ipAddress = options.user.userIpAddress;
    officeExpenseCategory.updateByIp = options.user.userIpAddress;
  },
);

OfficeExpenseCategory.addHook(
  'beforeDestroy',
  async (officeExpenseCategory, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    officeExpenseCategory.deleteBy = options.user.userMasterId;
    officeExpenseCategory.deleteByIp = options.user.userIpAddress;
    await officeExpenseCategory.save({
      hooks: false,
      transaction: options.transaction,
    });
  },
);

OfficeExpenseCategory.addHook(
  'beforeSave',
  async (officeExpenseCategory, options) => {
    officeExpenseCategory.user = options.user;
  },
);
OfficeExpenseCategory.addHook(
  'beforeBulkCreate',
  async (officeExpenseCategory, options) => {
    officeExpenseCategory.user = options.user;
  },
);
OfficeExpenseCategory.addHook(
  'afterSave',
  async (officeExpenseCategory, options) => {
    await addOfficeExpenseCategoryAmend(officeExpenseCategory, options);
  },
);
OfficeExpenseCategory.addHook(
  'afterBulkCreate',
  async (officeExpenseCategory, options) => {
    await addOfficeExpenseCategoryAmend(officeExpenseCategory, options);
  },
);

async function addOfficeExpenseCategoryAmend(officeExpenseCategory, options) {
  const list = Array.isArray(officeExpenseCategory)
    ? officeExpenseCategory
    : [officeExpenseCategory];

  const user = Array.isArray(officeExpenseCategory)
    ? officeExpenseCategory.user
    : officeExpenseCategory.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      officeExpenseCategoryID: data.officeExpenseCategoryID,
      officeExpenseCategory: data.officeExpenseCategory,
      companyMasterID: data.companyMasterID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await OfficeExpenseCategoryAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

OfficeExpenseCategory.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

OfficeExpenseCategoryAmend.belongsTo(OfficeExpenseCategory, {
  as: 'officeExpenseCategoryAmends',
  foreignKey: { name: 'officeExpenseCategoryID' },
});

OfficeExpenseCategory.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

OfficeExpenseCategory.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

OfficeExpenseCategory.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = OfficeExpenseCategory;
