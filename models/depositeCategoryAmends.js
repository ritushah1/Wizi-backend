const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const tableName = 'depositCategoryAmend';

const DepositCategoryAmend = sequelize.define(
  tableName,
  {
    depositCategoryAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    depositcategoryid: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    depositcategoryname: {
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
    },

    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },

    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        fields: ['depositcategoryid'],
      },
      {
        fields: ['companyMasterID'],
      },
    ],
  },
);

DepositCategoryAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

DepositCategoryAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = DepositCategoryAmend;
