const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const table_name = 'confirmationLetter';

const ConfirmationLetter = sequelize.define(
  table_name,
  {
    confirmationLetterID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    confirmationLetterName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    letterTemplate: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    letterHead: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createdBy: {
      type: Sequelize.INTEGER,
    },
    updatedBy: {
      type: Sequelize.INTEGER,
    },
    deletedBy: {
      type: Sequelize.INTEGER,
    },
    createdByIp: {
      type: Sequelize.STRING,
    },
    updatedByIp: {
      type: Sequelize.STRING,
    },
    deletedByIp: {
      type: Sequelize.STRING,
    },
    setReferenceNumber: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    prefix: {
      type: Sequelize.STRING,
    },
    refNoFormat: {
      type: Sequelize.STRING,
    },
    startingSequence: {
      type: Sequelize.INTEGER,
    },
    currentSequence: {
      type: Sequelize.INTEGER,
    },
    resetRefNumber: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    paranoid: true,
  },
);

ConfirmationLetter.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

ConfirmationLetter.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

ConfirmationLetter.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

ConfirmationLetter.addHook('beforeCreate', (confirmationLetter, options) => {
  confirmationLetter.createdBy = options.user.userMasterId;
  confirmationLetter.createdByIp = options.user.userIpAddress;
});

ConfirmationLetter.addHook('beforeUpdate', (confirmationLetter, options) => {
  confirmationLetter.updatedBy = options.user.userMasterId;
  confirmationLetter.updatedByIp = options.user.userIpAddress;
});

ConfirmationLetter.addHook('beforeDestroy', (confirmationLetter, options) => {
  confirmationLetter.deletedBy = options.user.userMasterId;
  confirmationLetter.deletedByIp = options.user.userIpAddress;
});

module.exports = ConfirmationLetter;
