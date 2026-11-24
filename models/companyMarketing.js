const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'companyMarketing';
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const CompanyMarketing = sequelize.define(
  table_name,
  {
    companyMarketingID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    dealerID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    marketingPersonID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
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

CompanyMarketing.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

CompanyMarketing.belongsTo(UserMaster, {
  as: 'marketingPerson',
  foreignKey: { name: 'marketingPersonID' },
});

UserMaster.hasMany(CompanyMarketing, {
  as: 'marketingPerson',
  foreignKey: { name: 'marketingPersonID' },
});

CompanyMarketing.belongsTo(UserMaster, {
  as: 'dealer',
  foreignKey: { name: 'dealerID' },
});
UserMaster.hasMany(CompanyMarketing, {
  as: 'dealer',
  foreignKey: { name: 'dealerID' },
});

CompanyMarketing.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

CompanyMarketing.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

CompanyMarketing.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

CompanyMarketing.addHook('beforeCreate', (companyMarketing, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  companyMarketing.createBy = options.user.userMasterId;
  companyMarketing.createByIp = options.user.userIpAddress;
});

CompanyMarketing.addHook('beforeUpdate', (companyMarketing, options) => {
  companyMarketing.updateBy = options.user.userMasterId;
  companyMarketing.ipAddress = options.user.userIpAddress;
  companyMarketing.updateByIp = options.user.userIpAddress;
});

CompanyMarketing.addHook('beforeDestroy', (companyMarketing, options) => {
  companyMarketing.deleteBy = options.user.userMasterId;
  companyMarketing.deleteByIp = options.user.userIpAddress;
});

CompanyMaster.hasMany(CompanyMarketing, {
  foreignKey: { name: 'companyMasterID' },
});

module.exports = CompanyMarketing;
