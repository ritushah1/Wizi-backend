const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const weekOffPolicy = require('./weekOffPolicy');

const table_name = 'phWeekOffPolicySlab';

const PHWeekOffPolicySlab = sequelize.define(
  table_name,
  {
    phWeekOffPolicySlabID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    weekOffPolicyID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    minPresentDays: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    weekOffCount: {
      type: Sequelize.INTEGER,
      allowNull: true,
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
    deleteBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    paranoid: true,
    timestamps: true,
  },
);

PHWeekOffPolicySlab.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

PHWeekOffPolicySlab.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

PHWeekOffPolicySlab.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

PHWeekOffPolicySlab.belongsTo(weekOffPolicy, {
  foreignKey: { name: 'weekOffPolicyID' },
});

weekOffPolicy.hasMany(PHWeekOffPolicySlab, {
  foreignKey: { name: 'weekOffPolicyID' },
});

weekOffPolicy.hasMany(PHWeekOffPolicySlab, {
  as:'PHWS',
  foreignKey: { name: 'weekOffPolicyID' },
});

PHWeekOffPolicySlab.addHook('beforeCreate', (phWeekOffPolicySlab, options) => {
  phWeekOffPolicySlab.createBy = options.user.userMasterId;
  phWeekOffPolicySlab.createByIp = options.user.userIpAddress;
});

PHWeekOffPolicySlab.addHook('beforeUpdate', (phWeekOffPolicySlab, options) => {
  phWeekOffPolicySlab.updateBy = options.user.userMasterId;
  phWeekOffPolicySlab.updateByIp = options.user.userIpAddress;
});

PHWeekOffPolicySlab.addHook('beforeDestroy', (phWeekOffPolicySlab, options) => {
  phWeekOffPolicySlab.deleteBy = options.user.userMasterId;
  phWeekOffPolicySlab.deleteByIp = options.user.userIpAddress;
});

module.exports = PHWeekOffPolicySlab;
