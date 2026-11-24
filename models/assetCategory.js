const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const AssetCategoryAmend = require('./assetCategoryAmends');
const table_name = 'assetCategory';
const AssetCategory = sequelize.define(
  table_name,
  {
    assetCategoryID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    assetCategory: {
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
    indexes: [
      {
        unique: false,
        fields: ['assetCategory'],
      },
      {
        unique: false,
        fields: ['companyMasterID'],
      },
    ],
  },
);

AssetCategory.addHook('beforeCreate', (AssetCategory, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  AssetCategory.createBy = options.user.userMasterId;
  AssetCategory.updateBy = options.user.userMasterId;
  AssetCategory.createByIp = options.user.userIpAddress;
  AssetCategory.updateByIp = options.user.userIpAddress;
});

AssetCategory.addHook('beforeUpdate', (AssetCategory, options) => {
  AssetCategory.updateBy = options.user.userMasterId;
  AssetCategory.ipAddress = options.user.userIpAddress;
  AssetCategory.updateByIp = options.user.userIpAddress;
});

AssetCategory.addHook('beforeDestroy', async (AssetCategory, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  AssetCategory.deleteBy = options.user.userMasterId;
  AssetCategory.deleteByIp = options.user.userIpAddress;
  await AssetCategory.save({
    hooks: false,
    transaction: options.transaction,
  });
});

AssetCategory.addHook('beforeSave', async (AssetCategory, options) => {
  AssetCategory.user = options.user;
});
AssetCategory.addHook('beforeBulkCreate', async (AssetCategory, options) => {
  AssetCategory.user = options.user;
});
AssetCategory.addHook('afterSave', async (AssetCategory, options) => {
  await addAssetCategoryAmend(AssetCategory, options);
});
AssetCategory.addHook('afterBulkCreate', async (AssetCategory, options) => {
  await addAssetCategoryAmend(AssetCategory, options);
});
async function addAssetCategoryAmend(assetCategories, options) {
  const list = Array.isArray(assetCategories)
    ? assetCategories
    : [assetCategories];

  const user = assetCategories.user;

  const rows = list.map((assetCategory) => {
    const data = assetCategory.get({ plain: true });

    return {
      assetCategoryID: data.assetCategoryID,
      assetCategory: data.assetCategory,
      companyMasterID: data.companyMasterID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await AssetCategoryAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

AssetCategory.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
AssetCategoryAmend.belongsTo(AssetCategory, {
  as: 'assetCategoryAmends',
  foreignKey: { name: 'assetCategoryID' },
});
AssetCategory.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

AssetCategory.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

AssetCategory.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = AssetCategory;
