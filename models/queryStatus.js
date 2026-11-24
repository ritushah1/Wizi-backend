const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const CompanyQuery = require('./companyQuery');
const table_name = 'queryStatus';

const QueryStatus = sequelize.define(
  table_name,
  {
    queryStatusID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    // { 0: Pending, 1: InProgress, 2: Solved }
    statusID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    solution: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    timeTaken: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    companyQueryID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'companyQueryID is required' },
        isInt: { msg: 'companyQueryID must be an integer' },
      },
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

QueryStatus.addHook('beforeCreate', (queryStatus, options) => {
  queryStatus.createBy = options.user.userMasterId;
  queryStatus.createByIp = options.user.userIpAddress;
});

QueryStatus.addHook('beforeUpdate', (queryStatus, options) => {
  queryStatus.updateBy = options.user.userMasterId;
  queryStatus.updateByIp = options.user.userIpAddress;
});

QueryStatus.addHook('beforeDestroy', (queryStatus, options) => {
  queryStatus.deleteBy = options.user.userMasterId;
  queryStatus.deleteByIp = options.user.userIpAddress;
});

QueryStatus.belongsTo(CompanyQuery, {
  foreignKey: { name: 'companyQueryID' },
});
CompanyQuery.hasMany(QueryStatus, {
  foreignKey: { name: 'companyQueryID' },
});

QueryStatus.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

QueryStatus.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

QueryStatus.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

module.exports = QueryStatus;
