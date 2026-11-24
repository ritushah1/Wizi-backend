const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const table_name = 'organizationDocument';
const OrganizationDocument = sequelize.define(
  table_name,
  {
    organizationDocumentID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    documentName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    file: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    isExpireDate: {
      type: Sequelize.BOOLEAN,
    },
    expireDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    oldOrgDocumentID: {
      type: Sequelize.INTEGER
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
  {
    paranoid: true,
  }
);
OrganizationDocument.addHook('beforeCreate', (orgDocument, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  orgDocument.createBy = options.user.userMasterId;
  orgDocument.createByIp = options.user.userIpAddress;
});

OrganizationDocument.addHook('beforeUpdate', (orgDocument, options) => {
  orgDocument.updateBy = options.user.userMasterId;
  orgDocument.updateByIp = options.user.userIpAddress;
});

OrganizationDocument.addHook('beforeDestroy', (orgDocument, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  orgDocument.deleteBy = options.user.userMasterId;
  orgDocument.deleteByIp = options.user.userIpAddress;
});

OrganizationDocument.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

companyMaster.hasMany(OrganizationDocument, {
  foreignKey: { name: 'companyMasterID' },
});

OrganizationDocument.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

OrganizationDocument.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

module.exports = OrganizationDocument;