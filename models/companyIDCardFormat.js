const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const companyMaster = require('./companyMaster');
const IdCardFormat = require('./idCardFormat');
const table_name = 'companyIDCardFormat';

const CompanyIDCardFormat = sequelize.define(
  table_name,
  {
    companyIDCardFormatID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    idCardFormatID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    updateBy: {
      type: Sequelize.BIGINT,
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

CompanyIDCardFormat.addHook('beforeCreate', (companyIDCardFormat, options) => {
    companyIDCardFormat.createBy = options.user.userMasterId;
    companyIDCardFormat.createByIp = options.user.userIpAddress;
});

CompanyIDCardFormat.addHook('beforeUpdate', (companyIDCardFormat, options) => {
    companyIDCardFormat.updateBy = options.user.userMasterId;
    companyIDCardFormat.updateByIp = options.user.userIpAddress;
});

CompanyIDCardFormat.addHook('beforeDestroy', (companyIDCardFormat, options) => {
    companyIDCardFormat.deleteBy = options.user.userMasterId;
    companyIDCardFormat.deleteByIp = options.user.userIpAddress;
});

CompanyIDCardFormat.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

companyMaster.hasMany(CompanyIDCardFormat, {
  as: 'cidf',
  foreignKey: { name: 'companyMasterID' },
});

CompanyIDCardFormat.belongsTo(IdCardFormat, {
  foreignKey: { name: 'idCardFormatID' },
});

CompanyIDCardFormat.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

CompanyIDCardFormat.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

CompanyIDCardFormat.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

module.exports = CompanyIDCardFormat;
