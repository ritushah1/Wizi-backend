const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const AssetCategory = require('./assetCategory');
const UserMaster = require('./userMaster');

const table_name = 'assetMasterAmend';

const AssetMasterAmend = sequelize.define(
  table_name,
  {
    assetMasterAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

    assetMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
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

    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    timestamps:true,
    updatedAt:false,
    indexes: [
      {
        fields: ['assetMasterID'],
      },
    ],
  }
);



AssetMasterAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

AssetMasterAmend.belongsTo(AssetCategory, {
  foreignKey: { name: 'assetCategoryID' },
});
AssetMasterAmend.belongsTo(UserMaster,{
  foreignKey:{name:'createBy'}
})




module.exports = AssetMasterAmend;