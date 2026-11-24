const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'deviceType';

const DeviceType = sequelize.define(
  table_name,
  {
    deviceTypeID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    deviceType: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    deviceModel: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    operatingSystem: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    appVersion: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    updateBy: {
      type: Sequelize.BIGINT,
    },
    deleteBy: {
      type: Sequelize.BIGINT,
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
    indexes: [
      { fields: ['userMasterID', 'createdAt'], where: { deletedAt: null } },
    ],
  },
);

DeviceType.belongsTo(UserMaster, {
  foreignKey: { name: 'userMasterID' },
});
UserMaster.hasMany(DeviceType, {
  foreignKey: { name: 'userMasterID' },
});
DeviceType.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
  as: 'createdBy',
});
DeviceType.belongsTo(UserMaster, {
  foreignKey: { name: 'updateBy' },
  as: 'updatedBy',
});
DeviceType.belongsTo(UserMaster, {
  foreignKey: { name: 'deleteBy' },
  as: 'deletedBy',
});
DeviceType.addHook('beforeCreate', (user, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  user.createBy = options.user.userMasterId;
  user.createByIp = options.user.userIpAddress;
});

DeviceType.addHook('beforeUpdate', (user, options) => {
  user.updateBy = options.user.userMasterId;
  user.updateByIp = options.user.userIpAddress;
});

DeviceType.addHook('beforeDestroy', (user, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  user.deleteBy = options.user.userMasterId;
  user.deleteByIp = options.user.userIpAddress;
});
module.exports = DeviceType;
