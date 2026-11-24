const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const table_name = 'disengagementLetter';

const DisengagementLetter = sequelize.define(
  table_name,
  {
    disengagementLetterID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    disengagementLetterName: {
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

DisengagementLetter.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

DisengagementLetter.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

DisengagementLetter.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

DisengagementLetter.addHook('beforeCreate', (disengagementLetter, options) => {
  disengagementLetter.createdBy = options.user.userMasterId;
  disengagementLetter.createdByIp = options.user.userIpAddress;
});

DisengagementLetter.addHook('beforeUpdate', (disengagementLetter, options) => {
  disengagementLetter.updatedBy = options.user.userMasterId;
  disengagementLetter.updatedByIp = options.user.userIpAddress;
});

DisengagementLetter.addHook('beforeDestroy', (disengagementLetter, options) => {
  disengagementLetter.deletedBy = options.user.userMasterId;
  disengagementLetter.deletedByIp = options.user.userIpAddress;
});

module.exports = DisengagementLetter;
