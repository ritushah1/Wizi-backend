const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'queryCategory';

const QueryCategory = sequelize.define(
  table_name,
  {
    queryCategoryID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    categoryName: {
      type: Sequelize.TEXT,
      allowNull: false,
      validate: {
        notNull: { msg: 'Category Name is required' },
        notEmpty: { msg: 'Category Name can not be empty' },
      },
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    updateBy: {
      type: Sequelize.BIGINT,
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

QueryCategory.addHook('beforeCreate', (queryCategory, options) => {
  queryCategory.createBy = options.user.userMasterId;
  queryCategory.createByIp = options.user.userIpAddress;
});

QueryCategory.addHook('beforeUpdate', (queryCategory, options) => {
  queryCategory.updateBy = options.user.userMasterId;
  queryCategory.updateByIp = options.user.userIpAddress;
});

QueryCategory.addHook('beforeDestroy', (queryCategory, options) => {
  queryCategory.deleteBy = options.user.userMasterId;
  queryCategory.deleteByIp = options.user.userIpAddress;
});

QueryCategory.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

QueryCategory.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

QueryCategory.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

module.exports = QueryCategory;
