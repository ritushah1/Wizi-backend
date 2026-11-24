const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const LoanMaster = require('./loanMaster');
const UserMaster = require('./userMaster');
const table_name = 'loanAuthorizationRequest';

const LoanAuthorization = sequelize.define(
  table_name,
  {
    loanAuthorizationID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    authstatus: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    remarks: {
      type: Sequelize.TEXT,
      allowNull: true,
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

LoanAuthorization.belongsTo(UserMaster, {
  as: 'authorizedPerson',
  foreignKey: { name: 'userMasterID' },
});
LoanAuthorization.belongsTo(UserMaster, {
  as: 'createdByuser',
  foreignKey: { name: 'createBy' },
});

LoanAuthorization.belongsTo(UserMaster, {
  as: 'updatedByUser',
  foreignKey: { name: 'updateBy' },
});

LoanAuthorization.belongsTo(UserMaster, {
  as: 'deletedByUser',
  foreignKey: { name: 'deleteBy' },
});
LoanAuthorization.belongsTo(LoanMaster, {
  foreignKey: { name: 'LoanID' },
});

LoanMaster.hasMany(LoanAuthorization, {
  foreignKey: { name: 'LoanID' },
});

LoanAuthorization.addHook(
  'beforeCreate',
  (loanAuthorization, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    loanAuthorization.createBy = options.user.userMasterId;
    loanAuthorization.updateBy = options.user.userMasterId;
    loanAuthorization.createByIp = options.user.userIpAddress;
    loanAuthorization.updateByIp = options.user.userIpAddress;
  }
);

LoanAuthorization.addHook(
  'beforeUpdate',
  (loanAuthorization, options) => {
    loanAuthorization.updateBy = options.user.userMasterId;
    loanAuthorization.ipAddress = options.user.userIpAddress;
    loanAuthorization.updateByIp = options.user.userIpAddress;
  }
);

LoanAuthorization.addHook(
  'beforeDestroy',
  (loanAuthorization, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    loanAuthorization.deleteBy = options.user.userMasterId;
    loanAuthorization.deleteByIp = options.user.userIpAddress;
  }
);

module.exports = LoanAuthorization;
