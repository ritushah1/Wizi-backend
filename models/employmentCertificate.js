const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const table_name = 'employmentCertificate';

const EmploymentCertificate = sequelize.define(
  table_name,
  {
    employmentCertificateID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    employmentCertificateName: {
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

EmploymentCertificate.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

EmploymentCertificate.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

EmploymentCertificate.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

EmploymentCertificate.addHook(
  'beforeCreate',
  (employmentCertificate, options) => {
    employmentCertificate.createdBy = options.user.userMasterId;
    employmentCertificate.createdByIp = options.user.userIpAddress;
  },
);

EmploymentCertificate.addHook(
  'beforeUpdate',
  (employmentCertificate, options) => {
    employmentCertificate.updatedBy = options.user.userMasterId;
    employmentCertificate.updatedByIp = options.user.userIpAddress;
  },
);

EmploymentCertificate.addHook(
  'beforeDestroy',
  (employmentCertificate, options) => {
    employmentCertificate.deletedBy = options.user.userMasterId;
    employmentCertificate.deletedByIp = options.user.userIpAddress;
  },
);

module.exports = EmploymentCertificate;
