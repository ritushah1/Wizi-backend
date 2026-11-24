const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const CompanyMaster = require('./companyMaster');

const TABLE_NAME = 'apiLogs';

const ApiLogs = sequelize.define(
  TABLE_NAME,
  {
    requestLogID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    method: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    url: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    reqStartTime: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    reqEndTime: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    responseTimeMs: {
      type: Sequelize.INTEGER, // milliseconds
      allowNull: true,
    },
    requestBody: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    requestParams: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    requestQuery: {
      type: Sequelize.JSONB,
      allowNull: true,
    },
    statusCode: {
      type: Sequelize.SMALLINT,
      allowNull: true,
    },
    failureReason: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    callFrom: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    indexes: [
      {
        unique: false,
        fields: ['reqStartTime'],
      },
      {
        unique: false,
        fields: ['responseTimeMs'],
      },
    ],
  },
);

ApiLogs.addHook('beforeCreate', (item, options) => {
  if (options?.user) {
    item.createBy = options.user.userMasterId || null;
    item.createByIp = options.user.userIpAddress || null;
  }
});

ApiLogs.belongsTo(UserMaster, {
  as: 'createdByUser',
  foreignKey: { name: 'createBy' },
});

ApiLogs.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
module.exports = ApiLogs;
