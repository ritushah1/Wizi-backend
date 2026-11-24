const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const CompanyMaster = require('./companyMaster');

const AutoMailSetup = sequelize.define(
  'autoMailSetup',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: true,
    },
    mailType: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    mailMode: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    time: {
      type: Sequelize.TIME,
      allowNull: false,
    },
    day: {
      type: Sequelize.STRING,
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
  },
  { paranoid: true }
);

AutoMailSetup.addHook('beforeCreate', (autoMailSetup, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  autoMailSetup.createBy = options.user.userMasterId;
  autoMailSetup.updateBy = options.user.userMasterId;
  autoMailSetup.createByIp = options.user.userIpAddress;
  autoMailSetup.updateByIp = options.user.userIpAddress;
});

AutoMailSetup.addHook('beforeUpdate', (autoMailSetup, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  autoMailSetup.updateBy = options.user.userMasterId;
  autoMailSetup.ipAddress = options.user.userIpAddress;
  autoMailSetup.updateByIp = options.user.userIpAddress;
});

AutoMailSetup.addHook('beforeDestroy', (autoMailSetup, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  autoMailSetup.deleteBy = options.user.userMasterId;
  autoMailSetup.deleteByIp = options.user.userIpAddress;
});

AutoMailSetup.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

AutoMailSetup.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
  as: 'CreatedBy',
});

AutoMailSetup.belongsTo(UserMaster, {
  foreignKey: { name: 'updateBy' },
  as: 'updatedBy',
});

module.exports = AutoMailSetup;
