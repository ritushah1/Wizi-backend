const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});
const { Sequelize } = require('sequelize');
const logger = require('./logger');

const dbHost = process.env.DB_HOST;
const dbDatabase = process.env.DB_DATABASE;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbDialect = process.env.DB_DIALECT;
const AppNameUtils = require('../utils/appName.utils');
const { EAppName } = require('../utils/commonVars');
const APP_NAME = AppNameUtils.getAppName();
console.log('Starting application as:', APP_NAME);
console.log('Connecting to DB...');
const msHrms = new Sequelize(dbDatabase, dbUser, dbPassword, {
  host: dbHost,
  dialect: dbDialect,
  dialectOptions: {
    useUTC: false, // for reading from database
  },
  timezone: '+05:30',
  logging: false,
  pool: {
    max: APP_NAME == EAppName.REPORT_SOCKET ? 5 : 50,
    min: APP_NAME == EAppName.REPORT_SOCKET ? 1 : 10,
    acquire: 30000,
    idle: 10000,
  },
});

logger.info(`${dbDatabase} connected.`);

module.exports = msHrms;
