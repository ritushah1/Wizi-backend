const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'companyManager';
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const CompanyManager = sequelize.define(
  table_name,
  {
    companyManagerID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    assignDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    status: {
      type: Sequelize.BIGINT,
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
  {
    paranoid: true,
  }
);

CompanyManager.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

CompanyManager.belongsTo(UserMaster, {
  foreignKey: { name: 'userMasterID' },
});

UserMaster.hasMany(CompanyManager, {
  foreignKey: { name: 'userMasterID' },
});

CompanyManager.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

CompanyManager.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

CompanyManager.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

CompanyManager.addHook('beforeCreate', (companyManager, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  companyManager.createBy = options.user.userMasterId;
  companyManager.createByIp = options.user.userIpAddress;
});

CompanyManager.addHook('beforeUpdate', (companyManager, options) => {
  companyManager.updateBy = options.user.userMasterId;
  companyManager.ipAddress = options.user.userIpAddress;
  companyManager.updateByIp = options.user.userIpAddress;
});

CompanyManager.addHook('beforeDestroy', (companyManager, options) => {
  companyManager.deleteBy = options.user.userMasterId;
  companyManager.deleteByIp = options.user.userIpAddress;
});
CompanyMaster.hasMany(CompanyManager, {
  foreignKey: { name: 'companyMasterID' },
});
module.exports = CompanyManager;
