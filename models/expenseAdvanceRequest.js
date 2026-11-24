const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const ExpensePayment = require('./expensePayment');
const AuthorizationCriteriaMaster = require('./authorizationCriteriaMaster');
const table_name = 'expenseAdvanceRequest';

const ExpenseAdvanceRequest = sequelize.define(
  table_name,
  {
    expenseAdvanceRequestID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    description: {
      type: Sequelize.STRING,
    },
    amount: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    authorizationStatus: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    authAmount: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    authorizedBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    authorizedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    authRemarks: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    canceledBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    canceledRemarks: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    canceledAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    ExpensePaymentID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    paidBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    paidAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    erpJvid: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    syncType: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateBy: {
      type: Sequelize.BIGINT,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteBy: {
      type: Sequelize.INTEGER,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
    AuthorizationCriteriaID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
  },
  {
    paranoid: true,
  }
);

ExpenseAdvanceRequest.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

ExpenseAdvanceRequest.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

ExpenseAdvanceRequest.addHook('beforeDestroy', (item, options) => {
  item.deleteBy = options.user.userMasterId;
  item.deleteByIp = options.user.userIpAddress;
});

ExpenseAdvanceRequest.belongsTo(UserMaster, {
  foreignKey: { name: 'userMasterID' },
});

UserMaster.hasMany(ExpenseAdvanceRequest, {
  as: 'ea_Req',
  foreignKey: { name: 'userMasterID' },
});

ExpenseAdvanceRequest.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

ExpenseAdvanceRequest.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

ExpenseAdvanceRequest.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

ExpenseAdvanceRequest.belongsTo(UserMaster, {
  as: 'authorizedUser',
  foreignKey: { name: 'authorizedBy' },
});

ExpenseAdvanceRequest.belongsTo(UserMaster, {
  as: 'canceledUser',
  foreignKey: { name: 'canceledBy' },
});
ExpenseAdvanceRequest.belongsTo(UserMaster, {
  as: 'paidUser',
  foreignKey: { name: 'paidBy' },
});

ExpenseAdvanceRequest.belongsTo(ExpensePayment, {
  foreignKey: { name: 'ExpensePaymentID' },
});

ExpensePayment.hasMany(ExpenseAdvanceRequest, {
  foreignKey: { name: 'ExpensePaymentID' },
});
ExpenseAdvanceRequest.belongsTo(AuthorizationCriteriaMaster, {
  foreignKey: { name: 'AuthorizationCriteriaID' },
});
module.exports = ExpenseAdvanceRequest;
