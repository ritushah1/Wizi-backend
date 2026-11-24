const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const OfficeExpenseCategory = require('./officeExpenseCategory');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const tableName = 'officeExpenseCategoryAmend';

const OfficeExpenseCategoryAmend = sequelize.define(
  tableName,
  {
    officeExpenseCategoryAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    officeExpenseCategoryID: {
      type: Sequelize.INTEGER,
      allowNull: false,
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
    },

    createBy: {
      type: Sequelize.INTEGER,
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
        fields: ['officeExpenseCategoryID'],
      },
      {
        fields: ['companyMasterID'],
      },
    ],
  },
);

OfficeExpenseCategoryAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

OfficeExpenseCategoryAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = OfficeExpenseCategoryAmend;
