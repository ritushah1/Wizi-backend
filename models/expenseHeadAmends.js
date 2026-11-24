const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const ExpenseHead = require('./expenseHead');
const ExpenseCategory = require('./expenseCategory');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const tableName = 'expenseHeadAmend';

const ExpenseHeadAmend = sequelize.define(
  tableName,
  {
    expenseHeadAmendID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    expenseHeadId: {
      type: Sequelize.INTEGER,
      allowNull: false,
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

    accountHeadID: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    status: {
      type: Sequelize.BIGINT,
      allowNull: false,
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
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        fields: ['expenseHeadId'],
      },
      {
        fields: ['expenseCategoryId'],
      },
      {
        fields: ['companyMasterID'],
      },
    ],
  },
);

ExpenseHeadAmend.belongsTo(ExpenseCategory, {
  foreignKey: { name: 'expenseCategoryId' },
});

ExpenseHeadAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

ExpenseHeadAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = ExpenseHeadAmend;
