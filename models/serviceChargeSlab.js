const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const ServiceCharge = require('./serviceCharge');
const UserMaster = require('./userMaster');

const ServiceChargeSlab = sequelize.define(
  'serviceChargeSlab',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    fromDays: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    toDays: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    skilledRate: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    semiskilledRate: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    unskilledRate: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    createBy: {
      type: Sequelize.INTEGER,
    },
    updateBy: {
      type: Sequelize.INTEGER,
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
  { paranoid: true },
);

ServiceChargeSlab.addHook('beforeCreate', (ServiceChargeSlab, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  ServiceChargeSlab.createBy = options.user.userMasterId;
  ServiceChargeSlab.updateBy = options.user.userMasterId;
  ServiceChargeSlab.createByIp = options.user.userIpAddress;
  ServiceChargeSlab.updateByIp = options.user.userIpAddress;
});

ServiceChargeSlab.addHook('beforeUpdate', (ServiceChargeSlab, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  ServiceChargeSlab.updateBy = options.user.userMasterId;
  ServiceChargeSlab.ipAddress = options.user.userIpAddress;
  ServiceChargeSlab.updateByIp = options.user.userIpAddress;
});

ServiceChargeSlab.addHook(
  'beforeDestroy',
  async (ServiceChargeSlab, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    ServiceChargeSlab.deleteBy = options.user.userMasterId;
    ServiceChargeSlab.deleteByIp = options.user.userIpAddress;
    await ServiceChargeSlab.save({
      hooks: false,
      transaction: options.transaction,
    });
  },
);

ServiceChargeSlab.belongsTo(ServiceCharge, {
  foreignKey: { name: 'serviceChargeId' },
});

ServiceCharge.hasMany(ServiceChargeSlab, {
  foreignKey: { name: 'serviceChargeId' },
});

ServiceChargeSlab.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

ServiceChargeSlab.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

ServiceChargeSlab.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = ServiceChargeSlab;
