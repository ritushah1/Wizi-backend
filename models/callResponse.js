const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const companyMaster = require('./companyMaster');
const CallResponseCategory = require('./callResponseCategories');
const table_name = 'callResponse';

const CallResponse = sequelize.define(
  table_name,
  {
    callResponseID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    callResponseCategoryID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Call Response Category is required.' },
      },
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Company is required.' },
      },
    },
    callDate: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    callTime: {
      type: Sequelize.TIME,
      allowNull: false,
    },
    Remark: {
      type: Sequelize.TEXT,
      allowNull: true,
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
  },
  {
    paranoid: true,
  }
);

CallResponse.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

CallResponse.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

CallResponse.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

CallResponse.belongsTo(CallResponseCategory, {
  foreignKey: { name: 'callResponseCategoryID' },
});

CallResponse.addHook('beforeCreate', (CallResponse, options) => {
  if (options.user) {
    CallResponse.createBy = options.user.userMasterId;
    CallResponse.createByIp = options.user.userIpAddress;
  }
});

CallResponse.addHook('beforeUpdate', (CallResponse, options) => {
  if (options.user) {
    CallResponse.updateBy = options.user.userMasterId;
    CallResponse.updateByIp = options.user.userIpAddress;
  }
});

CallResponse.addHook('beforeDestroy', (CallResponse, options) => {
  if (options.user) {
    CallResponse.deleteBy = options.user.userMasterId;
    CallResponse.deleteByIp = options.user.userIpAddress;
  }
});

module.exports = CallResponse;
