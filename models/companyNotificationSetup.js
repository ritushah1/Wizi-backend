const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const companyMaster = require('./companyMaster');
const {
  notificationCronTypes,
  notificationCronTimeFormat,
  notificationCronTimeType,
} = require('../utils/dbUtils');

const CompanyNotificationSetup = sequelize.define(
  'companyNotificationSetup',
  {
    id: {
      type: Sequelize.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    notificationType: {
      type: Sequelize.ENUM(...Object.values(notificationCronTypes)),
      allowNull: false,
    },
    time: { type: Sequelize.INTEGER, allowNull: true },
    timeType: {
      type: Sequelize.ENUM(...Object.values(notificationCronTimeType)),
      allowNull: true,
    },
    timeFormat: {
      type: Sequelize.ENUM(...Object.values(notificationCronTimeFormat)),
      allowNull: true,
    },
    metadata: { type: Sequelize.JSON },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
    timeForNotification: {
      type: Sequelize.TIME,
    },
    time1: { type: Sequelize.INTEGER, allowNull: true },
    timeFormat1: {
      type: Sequelize.ENUM(...Object.values(notificationCronTimeFormat)),
      allowNull: true,
    },
    time2: { type: Sequelize.INTEGER, allowNull: true },
    timeFormat2: {
      type: Sequelize.ENUM(...Object.values(notificationCronTimeFormat)),
      allowNull: true,
    },
  },
  {
    paranoid: true,
    // Composite key which makes sure that combination of companyMasterId and notificationType is always unique
    indexes: [
      {
        unique: true,
        fields: ['companyMasterId', 'notificationType'],
        where: { deletedAt: null },
      },
    ],
  },
);

CompanyNotificationSetup.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
  as: 'createdByUser',
});
CompanyNotificationSetup.belongsTo(UserMaster, {
  foreignKey: { name: 'updateBy' },
  as: 'updatedByUser',
});
CompanyNotificationSetup.belongsTo(UserMaster, {
  foreignKey: { name: 'deleteBy' },
  as: 'deletedByUser',
});
CompanyNotificationSetup.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterId', allowNull: false },
});

CompanyNotificationSetup.addHook(
  'beforeCreate',
  (companyNotificationSetup, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    companyNotificationSetup.createBy = options.user.userMasterId;
    companyNotificationSetup.createByIp = options.user.userIpAddress;
  },
);

CompanyNotificationSetup.addHook(
  'beforeUpdate',
  (companyNotificationSetup, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    companyNotificationSetup.updateBy = options.user.userMasterId;
    companyNotificationSetup.updateByIp = options.user.userIpAddress;
  },
);

CompanyNotificationSetup.addHook(
  'beforeDestroy',
  (companyNotificationSetup, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    companyNotificationSetup.deleteBy = options.user.userMasterId;
    companyNotificationSetup.deleteByIp = options.user.userIpAddress;
  },
);

module.exports = CompanyNotificationSetup;
