const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const empWorkingAgreement = require('./empWorkAgreement');
const empWorkAgreement = require('./empWorkAgreement');
const tableName = 'empResponsibility';
const empResponsibility = sequelize.define(
  tableName,
  {
    empResID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    workAgrID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    responsibilityName: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    updateBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    updateByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    paranoid: true,
  },
);
empResponsibility.addHook('beforeCreate', (empResponsibility, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  empResponsibility.createBy = options.user.userMasterId;
  empResponsibility.createByIp = options.user.userIpAddress;
});

empResponsibility.addHook('beforeUpdate', (empResponsibility, options) => {
  empResponsibility.updateBy = options.user.userMasterId;
  empResponsibility.updateByIp = options.user.userIpAddress;
});

empResponsibility.addHook(
  'beforeDestroy',
  async (empResponsibility, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    empResponsibility.deleteBy = options.user.userMasterId;
    empResponsibility.deleteByIp = options.user.userIpAddress;
    await empResponsibility.save({
      hooks: false,
      transaction: options.transaction,
    });
  },
);

empResponsibility.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

empResponsibility.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

empResponsibility.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

empResponsibility.belongsTo(empWorkAgreement, {
  as: 'EWA',
  foreignKey: { name: 'workAgrID' },
});

empWorkAgreement.hasMany(empResponsibility, {
  as: 'ER',
  foreignKey: { name: 'workAgrID' },
});

module.exports = empResponsibility;
