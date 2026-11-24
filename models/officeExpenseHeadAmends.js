const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const OfficeExpenseHead = require('./officeExpenseHead');
const UserMaster = require('./userMaster');
const OfficeExpenseCategory = require('./officeExpenseCategory');

const tableName = 'officeExpenseHeadAmend';

const OfficeExpenseHeadAmend = sequelize.define(
  tableName,
  {
    officeExpenseHeadAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    officeExpenseHeadID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    officeExpenseHead: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    officeExpenseCategoryID: {
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
        fields: ['officeExpenseHeadID'],
      },
      {
        fields: ['officeExpenseCategoryID'],
      },
    ],
  },
);

OfficeExpenseHeadAmend.belongsTo(OfficeExpenseCategory, {
  foreignKey: { name: 'officeExpenseCategoryID' },
});

OfficeExpenseHeadAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = OfficeExpenseHeadAmend;
