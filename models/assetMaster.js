const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const assetCategory = require('./assetCategory');
const AssetMasterAmend = require('./assetMasterAmends');
const UserMaster = require('./userMaster');
const table_name = 'assetMaster';
const assetMaster = sequelize.define(
  table_name,
  {
    assetMasterID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    assetSerialNo: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    assetName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    assetCategoryID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    purchaseDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    assetDocument: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
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
        fields: ['assetMasterID'],
      },
      {
        unique: false,
        fields: ['companyMasterID'],
      },
    ],
  },
);

assetMaster.addHook('beforeCreate', (assetMaster, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  assetMaster.createBy = options.user.userMasterId;
  assetMaster.updateBy = options.user.userMasterId;
  assetMaster.createByIp = options.user.userIpAddress;
  assetMaster.updateByIp = options.user.userIpAddress;
});

assetMaster.addHook('beforeUpdate', (assetMaster, options) => {
  assetMaster.updateBy = options.user.userMasterId;
  assetMaster.ipAddress = options.user.userIpAddress;
  assetMaster.updateByIp = options.user.userIpAddress;
});

assetMaster.addHook('beforeDestroy', async (assetMaster, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  assetMaster.deleteBy = options.user.userMasterId;
  assetMaster.deleteByIp = options.user.userIpAddress;
  await assetMaster.save({
    hooks: false,
    transaction: options.transaction,
  });
});
assetMaster.addHook('beforeSave', async (assetMaster, options) => {
  assetMaster.user = options.user;
});
assetMaster.addHook('beforeBulkCreate', async (assetMaster, options) => {
  assetMaster.user = options.user;
});
assetMaster.addHook('afterSave', async (assetMasters, options) => {
  await addAssetMasterAmend(assetMasters, options);
});
assetMaster.addHook('afterBulkCreate', async (assetMasters, options) => {
  await addAssetMasterAmend(assetMasters, options);
});

async function addAssetMasterAmend(assetMasters, options) {
  const list = Array.isArray(assetMasters) ? assetMasters : [assetMasters];

  const user = assetMasters.user;

  const rows = list.map((assetMaster) => {
    const data = assetMaster.get({ plain: true });

    return {
      assetMasterID: data.assetMasterID,
      assetSerialNo: data.assetSerialNo,
      assetName: data.assetName,
      assetCategoryID: data.assetCategoryID,
      purchaseDate: data.purchaseDate,
      quantity: data.quantity,
      description: data.description,
      assetDocument: data.assetDocument,
      companyMasterID: data.companyMasterID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await AssetMasterAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

assetMaster.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
assetMaster.belongsTo(assetCategory, {
  foreignKey: { name: 'assetCategoryID' },
});
AssetMasterAmend.belongsTo(assetMaster, {
  foreignKey: { name: 'assetMasterID' },
});
assetMaster.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

assetMaster.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

assetMaster.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = assetMaster;
