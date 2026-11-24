const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const companyMaster = require('./companyMaster');
const QueryCategory = require('./queryCategory');
const table_name = 'companyQuery';

const CompanyQuery = sequelize.define(
  table_name,
  {
    companyQueryID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    queryCategoryID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'queryCategoryID is required' },
        isInt: { msg: 'queryCategoryID must be an integer' },
      },
    },
    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notNull: { msg: 'companyMasterID is required' },
        isInt: { msg: 'companyMasterID must be an integer' },
      },
    },
    date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      validate: {
        notNull: { msg: 'Date is required' },
        notEmpty: { msg: 'Date cannot be empty' },
      },
    },
    query: {
      type: Sequelize.TEXT,
      allowNull: false,
      validate: {
        notNull: { msg: 'Query is required' },
        notEmpty: { msg: 'Query cannot be empty' },
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

CompanyQuery.addHook('beforeCreate', (companyQuery, options) => {
  companyQuery.createBy = options.user.userMasterId;
  companyQuery.createByIp = options.user.userIpAddress;
});

CompanyQuery.addHook('beforeUpdate', (companyQuery, options) => {
  companyQuery.updateBy = options.user.userMasterId;
  companyQuery.updateByIp = options.user.userIpAddress;
});

CompanyQuery.addHook('beforeDestroy', (companyQuery, options) => {
  companyQuery.deleteBy = options.user.userMasterId;
  companyQuery.deleteByIp = options.user.userIpAddress;
});

CompanyQuery.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

CompanyQuery.belongsTo(QueryCategory, {
  foreignKey: { name: 'queryCategoryID' },
});

CompanyQuery.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

CompanyQuery.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

CompanyQuery.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

module.exports = CompanyQuery;
