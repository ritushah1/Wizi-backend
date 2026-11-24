const Sequelize = require('sequelize');
const sequelize = require('../config/database');


const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const tableName = 'joiningDocumentTypeAmend';

const JoiningDocumentTypeAmend = sequelize.define(
  tableName,
  {
    joiningDocumentTypeAmendID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    joiningDocumentMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },

    documentName: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    description: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    documentFileType: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
    },

    hasFromDate: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },

    hasIssueDate: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },

    hasExpiryDate: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },

    hasIdentificationNumber: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },

    setReminderForExpiry: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },

    reminderBeforeDays: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },

    reminderFrequency: {
      type: Sequelize.STRING,
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
        fields: ['joiningDocumentMasterID'],
      },
      {
        fields: ['companyMasterID'],
      },
    ],
  }
);



JoiningDocumentTypeAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

JoiningDocumentTypeAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = JoiningDocumentTypeAmend;