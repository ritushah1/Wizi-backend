const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const { policyScope } = require('../utils/dbUtils');
const UserMaster = require('./userMaster');

const PolicyDocuments = sequelize.define(
  'policyDocuments',
  {
    id: {
      type: Sequelize.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
    },
    document: {
      type: Sequelize.TEXT,
      allowNull: false,
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
    branch_scope: {
      type: Sequelize.ENUM(...Object.values(policyScope)),
      defaultValue: policyScope.ALL,
    },
    department_scope: {
      type: Sequelize.ENUM(...Object.values(policyScope)),
      defaultValue: policyScope.ALL,
    },
    designation_scope: {
      type: Sequelize.ENUM(...Object.values(policyScope)),
      defaultValue: policyScope.ALL,
    },
    requireAcceptance: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  { paranoid: true },
);
PolicyDocuments.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterId' },
});
PolicyDocuments.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

PolicyDocuments.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

PolicyDocuments.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});
PolicyDocuments.addHook('beforeCreate', (policyDocuments, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  policyDocuments.createBy = options.user.userMasterId;
  policyDocuments.updateBy = options.user.userMasterId;
  policyDocuments.createByIp = options.user.userIpAddress;
  policyDocuments.updateByIp = options.user.userIpAddress;
});

PolicyDocuments.addHook('beforeUpdate', (policyDocuments, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  policyDocuments.updateBy = options.user.userMasterId;
  policyDocuments.updateByIp = options.user.userIpAddress;
});

PolicyDocuments.addHook('beforeDestroy', (policyDocuments, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  policyDocuments.deleteBy = options.user.userMasterId;
  policyDocuments.deleteByIp = options.user.userIpAddress;
});

module.exports = PolicyDocuments;
