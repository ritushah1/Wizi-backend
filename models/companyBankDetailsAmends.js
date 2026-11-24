const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const CompanyMaster = require('./companyMaster');
const BankMaster = require('./bankMaster');
const UserMaster = require('./userMaster');

const tableName = 'companyBankDetailsAmend';

const CompanyBankDetailsAmend = sequelize.define(
  tableName,
  {
    companyBankDetailsAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    companyBankDetailsID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },

    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },

    bankMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },

    bankAccountNo: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    bankIfscCode: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    nameAsBank: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    accountType: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    status: {
      type: Sequelize.INTEGER,
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
        fields: ['companyBankDetailsID'],
      },
      {
        fields: ['companyMasterID'],
      },
      {
        fields: ['bankMasterID'],
      },
    ],
  }
);



CompanyBankDetailsAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

CompanyBankDetailsAmend.belongsTo(BankMaster, {
  foreignKey: { name: 'bankMasterID' },
});

CompanyBankDetailsAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = CompanyBankDetailsAmend;