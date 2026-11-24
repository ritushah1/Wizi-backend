const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const table_name = 'assetCategoryAmend';

const AssetCategoryAmend = sequelize.define(
  table_name,
  {
    assetCategoryAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

    assetCategoryID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    assetCategory: {
      type: Sequelize.STRING,
      allowNull: false,
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
        fields: ['assetCategoryID'],
      },
    ],
  }
);



AssetCategoryAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
AssetCategoryAmend.belongsTo(UserMaster,{
    foreignKey:{name:'createBy'}
})

module.exports = AssetCategoryAmend;