const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const BankMaster = require('./bankMaster');
const UserMaster = require('./userMaster');

const tableName = 'bankStatementFormatAmend';

const BankStatementFormatAmend = sequelize.define(
  tableName,
  {
    bankStatementFormatAmendID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    bankStatementFormatID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },

    bankMasterID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },

    fields: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
    },

    createBy: {
      type: Sequelize.INTEGER,
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
        fields: ['bankStatementFormatID'],
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



BankStatementFormatAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

BankStatementFormatAmend.belongsTo(BankMaster, {
  foreignKey: { name: 'bankMasterID' },
});

BankStatementFormatAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = BankStatementFormatAmend;