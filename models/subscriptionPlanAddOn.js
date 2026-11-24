const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanySubscriptionMaster = require('./subscriptionPlan');
const UserMaster = require('./userMaster');
const table_name = 'subscriptionPlanAddOn';
const SubscriptionPlanAddOn = sequelize.define(
  table_name,
  {
    subscriptionPlanAddOnID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyPlanMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    user: {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    trackingUser: {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    softwareCost: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    biometricCost: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    customizationCost: {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },
    customizationDescription: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    totalExcludingGST: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    gstAmount: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    totalIncludingGST: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
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
  {
    indexes: [
      {
        unique: false,
        fields: ['companyPlanMasterID'],
      },
    ],
    paranoid: true, // enables soft deletes`
  }
);
SubscriptionPlanAddOn.addHook('beforeCreate', (data, options) => {
  data.createBy = options.user.userMasterId;
  data.createByIp = options.user.userIpAddress;
});

SubscriptionPlanAddOn.addHook('beforeUpdate', (data, options) => {
  data.updateBy = options.user.userMasterId;
  data.updateByIp = options.user.userIpAddress;
});

SubscriptionPlanAddOn.addHook('beforeDestroy', (data, options) => {
  data.deleteBy = options.user.userMasterId;
  data.deleteByIp = options.user.userIpAddress;
});
SubscriptionPlanAddOn.belongsTo(CompanySubscriptionMaster, {
  foreignKey: { name: 'companyPlanMasterID' },
});

CompanySubscriptionMaster.hasMany(SubscriptionPlanAddOn, {
  foreignKey: { name: 'companyPlanMasterID' },
});

SubscriptionPlanAddOn.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
  as: 'createdByUser',
});
SubscriptionPlanAddOn.belongsTo(UserMaster, {
  foreignKey: { name: 'updateBy' },
  as: 'updatedByUser',
});
SubscriptionPlanAddOn.belongsTo(UserMaster, {
  foreignKey: { name: 'deleteBy' },
  as: 'deletedByUser',
});

module.exports = SubscriptionPlanAddOn;
