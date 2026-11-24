const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');

const tableName = 'expensePolicyAmend';

const ExpensePolicyAmend = sequelize.define(
  tableName,
  {
    expensePolicyAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    expensePolicyID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },

    headID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },

    effectiveDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },

    expenseType: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    policyName: {
      type: Sequelize.STRING,
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
        fields: ['expensePolicyID'],
      },
      {
        fields: ['headID'],
      },
    ],
  },
);

ExpensePolicyAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = ExpensePolicyAmend;
