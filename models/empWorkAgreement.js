const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const Designation = require('./designation');
const UserMaster = require('./userMaster');
const WorkAgreement = require('./workAgreement');

const tableName = 'empWorkAgreement';
const empWorkAgreement = sequelize.define(
  tableName,
  {
    id: {
      type: Sequelize.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    designationId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    agreementName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    salary: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    authStatus: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    acceptedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    acceptedBy: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    agreementID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    agreementHTML: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    agreementPath: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    agreementGeneratedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    referenceNumber: {
      type: Sequelize.STRING,
      allowNull: true,
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
empWorkAgreement.addHook('beforeCreate', (empWorkAgreement, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  empWorkAgreement.createBy = options.user.userMasterId;
  empWorkAgreement.createByIp = options.user.userIpAddress;
});

empWorkAgreement.addHook('beforeUpdate', (empWorkAgreement, options) => {
  empWorkAgreement.updateBy = options.user.userMasterId;
  empWorkAgreement.updateByIp = options.user.userIpAddress;
});

empWorkAgreement.addHook('beforeDestroy', async (empWorkAgreement, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  empWorkAgreement.deleteBy = options.user.userMasterId;
  empWorkAgreement.deleteByIp = options.user.userIpAddress;
  await empWorkAgreement.save({
    hooks: false,
    transaction: options.transaction,
  });
});

empWorkAgreement.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

empWorkAgreement.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

empWorkAgreement.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

empWorkAgreement.belongsTo(Designation, {
  foreignKey: { name: 'designationId' },
});

empWorkAgreement.belongsTo(WorkAgreement, {
  foreignKey: { name: 'agreementID' },
});

empWorkAgreement.belongsTo(UserMaster, {
  as: 'acceptedByEmp',
  foreignKey: { name: 'acceptedBy' },
});

empWorkAgreement.belongsTo(UserMaster, {
  as: 'user',
  foreignKey: { name: 'userMasterID' },
});

module.exports = empWorkAgreement;
