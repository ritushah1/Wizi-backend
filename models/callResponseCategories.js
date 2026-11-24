const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'callResponseCategory';
const CallResponseCategory = sequelize.define(
  table_name,
  {
    callResponseCategoryID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    callResponseCategory: {
      type: Sequelize.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Category Name is required.' },
      },
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

CallResponseCategory.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

CallResponseCategory.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

CallResponseCategory.addHook('beforeCreate', (CallResponse, options) => {
  if (options.user) {
    CallResponse.createBy = options.user.userMasterId;
    CallResponse.createByIp = options.user.userIpAddress;
  }
});

CallResponseCategory.addHook('beforeUpdate', (CallResponse, options) => {
  if (options.user) {
    CallResponse.updateBy = options.user.userMasterId;
    CallResponse.updateByIp = options.user.userIpAddress;
  }
});

CallResponseCategory.addHook('beforeDestroy', (CallResponse, options) => {
  if (options.user) {
    CallResponse.deleteBy = options.user.userMasterId;
    CallResponse.deleteByIp = options.user.userIpAddress;
  }
});

module.exports = CallResponseCategory;
