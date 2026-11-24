const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const table_name = 'transferLetter';

const TransferLetter = sequelize.define(
  table_name,
  {
    transferLetterID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    transferLetterName: {
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

TransferLetter.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

TransferLetter.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

TransferLetter.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

TransferLetter.addHook('beforeCreate', (transferLetter, options) => {
  transferLetter.createdBy = options.user.userMasterId;
  transferLetter.createdByIp = options.user.userIpAddress;
});

TransferLetter.addHook('beforeUpdate', (transferLetter, options) => {
  transferLetter.updatedBy = options.user.userMasterId;
  transferLetter.updatedByIp = options.user.userIpAddress;
});

TransferLetter.addHook('beforeDestroy', (transferLetter, options) => {
  transferLetter.deletedBy = options.user.userMasterId;
  transferLetter.deletedByIp = options.user.userIpAddress;
});

module.exports = TransferLetter;
