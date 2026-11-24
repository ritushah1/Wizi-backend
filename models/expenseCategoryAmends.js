const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const tableName = 'expenseCategoryAmend';

const ExpenseCategoryAmend = sequelize.define(
  tableName,
  {
    expenseCategoryAmendID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    expenseCategoryId: {
      type: Sequelize.INTEGER,
      allowNull: false,
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
        fields: ['expenseCategoryId'],
      },
      {
        fields: ['companyMasterID'],
      },
    ],
  },
);

ExpenseCategoryAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

ExpenseCategoryAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = ExpenseCategoryAmend;
