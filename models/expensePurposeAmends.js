const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const tableName = 'expensePurposeAmend';

const ExpensePurposeAmend = sequelize.define(
  tableName,
  {
    expensePurposeAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    expensePurposeID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    name: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    status: {
      type: Sequelize.INTEGER,
      allowNull: true,
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
        fields: ['expensePurposeID'],
      },
      {
        fields: ['companyMasterID'],
      },
    ],
  },
);

ExpensePurposeAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

ExpensePurposeAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = ExpensePurposeAmend;
