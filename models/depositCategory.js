const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const DepositCategoryAmend = require('./depositeCategoryAmends');
const { defaultOptionListAppearanceProvider } = require('pdf-lib');
const UserMaster = require('./userMaster');
const table_name = 'depositcategories';
const depositcategory = sequelize.define(
  table_name,
  {
    depositcategoryid: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    depositcategoryname: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      //forign key
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

depositcategory.addHook('beforeCreate', (depositCategory, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  depositCategory.createBy = options.user.userMasterId;
  depositCategory.updateBy = options.user.userMasterId;
  depositCategory.createByIp = options.user.userIpAddress;
  depositCategory.updateByIp = options.user.userIpAddress;
});

depositcategory.addHook('beforeUpdate', (depositCategory, options) => {
  depositCategory.updateBy = options.user.userMasterId;
  depositCategory.ipAddress = options.user.userIpAddress;
  depositCategory.updateByIp = options.user.userIpAddress;
});

depositcategory.addHook('beforeDestroy', async (depositCategory, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  depositCategory.deleteBy = options.user.userMasterId;
  depositCategory.deleteByIp = options.user.userIpAddress;
  await depositCategory.save({
    hooks: false,
    transaction: options.transaction,
  });
});

depositcategory.addHook(
  'beforeBulkCreate',
  async (depositCategory, options) => {
    depositCategory.user = options.user;
  },
);
depositcategory.addHook('beforeSave', async (depositCategory, options) => {
  depositCategory.user = options.user;
});
depositcategory.addHook('afterSave', async (depositCategory, options) => {
  await addDepositCategoryAmend(depositCategory, options);
});
depositcategory.addHook('afterBulkCreate', async (depositCategory, options) => {
  await addDepositCategoryAmend(depositCategory, options);
});

async function addDepositCategoryAmend(depositCategory, options) {
  const list = Array.isArray(depositCategory)
    ? depositCategory
    : [depositCategory];

  const user = Array.isArray(depositCategory)
    ? depositCategory.user
    : depositCategory.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      depositcategoryid: data.depositcategoryid,
      depositcategoryname: data.depositcategoryname,
      companyMasterID: data.companyMasterID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await DepositCategoryAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

depositcategory.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
DepositCategoryAmend.belongsTo(depositcategory, {
  as: 'depositeCategoryAmend',
  foreignKey: { name: 'depositcategoryid' },
});

depositcategory.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

depositcategory.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

depositcategory.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = depositcategory;
