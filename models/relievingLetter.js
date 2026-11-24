const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const table_name = 'relievingLetter';

const RelievingLetter = sequelize.define(
  table_name,
  {
    relievingLetterID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    relievingLetterName: {
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
  }
);

RelievingLetter.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

RelievingLetter.addHook('beforeCreate', (relievingLetter, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  relievingLetter.createBy = options.user.userMasterId;
  relievingLetter.updateBy = options.user.userMasterId;
  relievingLetter.createByIp = options.user.userIpAddress;
  relievingLetter.updateByIp = options.user.userIpAddress;
});

RelievingLetter.addHook('beforeUpdate', (relievingLetter, options) => {
  relievingLetter.updateBy = options.user.userMasterId;
  relievingLetter.ipAddress = options.user.userIpAddress;
  relievingLetter.updateByIp = options.user.userIpAddress;
});

RelievingLetter.addHook('beforeDestroy', (relievingLetter, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  relievingLetter.deleteBy = options.user.userMasterId;
  relievingLetter.deleteByIp = options.user.userIpAddress;
});

module.exports = RelievingLetter;
