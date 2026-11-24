const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const userMaster = require('./userMaster');
const TransferLetter = require('./transferLetter');
const table_name = 'userTransferLetter';
const UserTransferLetter = sequelize.define(
  table_name,
  {
    userTransferLetterID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    transferLetterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    path: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    transferletterHTML: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.INTEGER,
    },
    updateBy: {
      type: Sequelize.INTEGER,
    },
    deleteBy: {
      type: Sequelize.INTEGER,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
    referenceNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    oldProjectID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    newProjectID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    oldDepartmentID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    newDepartmentID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    oldBranchID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    newBranchID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    effectiveDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    isVisibleToEmp: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    paranoid: true,
  },
);

UserTransferLetter.addHook('beforeCreate', (userTransferLetter, options) => {
  userTransferLetter.createBy = options.user.userMasterId;
  userTransferLetter.createByIp = options.user.userIpAddress;
});

UserTransferLetter.addHook('beforeUpdate', (userTransferLetter, options) => {
  userTransferLetter.updateBy = options.user.userMasterId;
  userTransferLetter.updateByIp = options.user.userIpAddress;
});

UserTransferLetter.addHook('beforeDestroy', (userTransferLetter, options) => {
  userTransferLetter.deleteBy = options.user.userMasterId;
  userTransferLetter.deleteByIp = options.user.userIpAddress;
});

UserTransferLetter.belongsTo(userMaster, {
  foreignKey: { name: 'userMasterID' },
});

UserTransferLetter.belongsTo(TransferLetter, {
  foreignKey: { name: 'transferLetterID' },
  as: 'transferLetter',
});

module.exports = UserTransferLetter;
