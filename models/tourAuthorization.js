const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const toursMaster = require('./toursMaster');
const tableName = 'tourAuthorization';

const tourAuthorization = sequelize.define(
  tableName,
  {
    tourAuthorizationID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    tourMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    authStatus: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    remarks: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    updateBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteBy: {
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
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  { paranoid: true },
);

tourAuthorization.addHook('beforeCreate', (tourAuthorization, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  tourAuthorization.createBy = options.user.userMasterId;
  tourAuthorization.updateBy = options.user.userMasterId;
  tourAuthorization.createByIp = options.user.userIpAddress;
  tourAuthorization.updateByIp = options.user.userIpAddress;
});

tourAuthorization.addHook('beforeUpdate', (tourAuthorization, options) => {
  tourAuthorization.updateBy = options.user.userMasterId;
  tourAuthorization.ipAddress = options.user.userIpAddress;
  tourAuthorization.updateByIp = options.user.userIpAddress;
});

tourAuthorization.addHook(
  'beforeDestroy',
  async (tourAuthorization, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    tourAuthorization.deleteBy = options.user.userMasterId;
    tourAuthorization.deleteByIp = options.user.userIpAddress;
    await tourAuthorization.save({
      hooks: false,
      transaction: options.transaction,
    });
  },
);

tourAuthorization.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
});

tourAuthorization.belongsTo(UserMaster, {
  foreignKey: { name: 'updateBy' },
});

tourAuthorization.belongsTo(UserMaster, {
  as: 'authorizedPerson',
  foreignKey: { name: 'userMasterID' },
});
tourAuthorization.belongsTo(toursMaster, {
  foreignKey: { name: 'tourMasterID' },
});

toursMaster.hasMany(tourAuthorization, {
  as: 'tourAuth',
  foreignKey: 'tourMasterID',
});

tourAuthorization.belongsTo(toursMaster, {
  as: 'toursMaster',
  foreignKey: 'tourMasterID',
});

module.exports = tourAuthorization;
