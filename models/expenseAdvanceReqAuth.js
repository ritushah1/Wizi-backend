const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const ExpenseAdvanceRequest = require('./expenseAdvanceRequest');
const table_name = 'expenseAdvanceReqAuth';
const ExpenseAdvanceReqAuth = sequelize.define(
  table_name,
  {
    AuthReqId: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    expenseAdvanceRequestID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    authAmount: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    authStatus: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2,
    },
    remarks: {
      type: Sequelize.TEXT,
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
      type: Sequelize.BIGINT,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
    indexes: [
      {
        unique: false,
        fields: [
          'expenseAdvanceRequestID',
          'userMasterID',
          'status',
          'authStatus',
        ],
      },
    ],
  }
);
ExpenseAdvanceReqAuth.addHook('beforeCreate', (data, options) => {
  if (options.user) {
    data.createBy = options.user.userMasterId;
    data.createByIp = options.user.userIpAddress;
  }
});
ExpenseAdvanceReqAuth.addHook('beforeUpdate', (data, options) => {
  if (options.user) {
    data.updateBy = options.user.userMasterId;
    data.updateByIp = options.user.userIpAddress;
  }
});
ExpenseAdvanceReqAuth.addHook('beforeDestroy', (data, options) => {
  if (options.user) {
    data.deleteBy = options.user.userMasterId;
    data.deleteByIp = options.user.userIpAddress;
  }
});
ExpenseAdvanceReqAuth.belongsTo(ExpenseAdvanceRequest, {
  as:'ea_req',
  foreignKey: { name: 'expenseAdvanceRequestID' },
});
ExpenseAdvanceReqAuth.belongsTo(UserMaster, {
  as: 'authPerson',
  foreignKey: { name: 'userMasterID' },
});
ExpenseAdvanceRequest.hasMany(ExpenseAdvanceReqAuth, {
  as: 'Auth',
  foreignKey: { name: 'expenseAdvanceRequestID' },
});
ExpenseAdvanceReqAuth.belongsTo(UserMaster, {
  as: 'c_By',
  foreignKey: { name: 'createBy' },
});
ExpenseAdvanceReqAuth.belongsTo(UserMaster, {
  as: 'u_By',
  foreignKey: { name: 'updateBy' },
});
ExpenseAdvanceReqAuth.belongsTo(UserMaster, {
  as: 'd_By',
  foreignKey: { name: 'deleteBy' },
});
module.exports = ExpenseAdvanceReqAuth;
