const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const { policyScope } = require('../utils/dbUtils');
const table_name = 'shortLeave';
const ShortLeave = sequelize.define(
  table_name,
  {
    shortLeaveName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    minutesForShortLeave: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    noOfShortLeave: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    updateBy: {
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
    deleteBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    authorizerRemark: {
      type: Sequelize.TEXT,
      allowNull: true,
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
    onlySameDay:{
      type:Sequelize.BOOLEAN,
      defaultValue:false
    },
    advanceDays:{
       type:Sequelize.INTEGER,
        validate: {
        min: {
          args: [1],
          msg: 'Advance Days always greater than zero.',
        },
      },
    },
    pastDays:{
       type:Sequelize.INTEGER,
        validate: {
        min: {
          args: [1],
          msg: 'Past Days always greater than zero.',
        },
      },
    },
    autoApprove:{
       type:Sequelize.BOOLEAN,
       defaultValue:false
    }
  },
  { paranoid: true },
  {
    indexes: [
      {
        unique: false,
        fields: ['shortLeaveName'],
      },
    ],
  },
);

ShortLeave.addHook('beforeCreate', (shortLeave, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  shortLeave.createBy = options.user.userMasterId;
  shortLeave.updateBy = options.user.userMasterId;
  shortLeave.createByIp = options.user.userIpAddress;
  shortLeave.updateByIp = options.user.userIpAddress;
});

ShortLeave.addHook('beforeUpdate', (shortLeave, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  shortLeave.updateBy = options.user.userMasterId;
  shortLeave.updateByIp = options.user.userIpAddress;
});

ShortLeave.addHook('beforeDestroy', (shortLeave, options) => {
  shortLeave.deleteBy = options.user.userMasterId;
  shortLeave.deleteByIp = options.user.userIpAddress;
});

ShortLeave.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

ShortLeave.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

ShortLeave.belongsTo(UserMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

ShortLeave.belongsTo(UserMaster, {
  as: 'deletedByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = ShortLeave;
