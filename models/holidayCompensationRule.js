const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'holidayCompensationRule';
const HolidayPolicyMaster = require('./holidayPolicy');
const { compensationTypeEnum } = require('../utils/dbUtils');
const HolidayCompensationRule = sequelize.define(
  table_name,
  {
    holidayCompensationRuleID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    holidayPolicyID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    holidayDate: {
      type: Sequelize.ARRAY(Sequelize.DATEONLY),
      allowNull: false,
    },
    compensationType: {
      type: Sequelize.ENUM(...Object.values(compensationTypeEnum)),
      allowNull: false,
    },
    minutesForHalfDay: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    minutesForFullDay: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    minutesForOneAndHalfDay: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    minutesForTwoFullDay: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    status: {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: false,
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
    deletedBy: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    deletedByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    paranoid: true,
  },
);

HolidayCompensationRule.belongsTo(HolidayPolicyMaster, {
  foreignKey: { name: 'holidayPolicyID' },
});
HolidayPolicyMaster.hasMany(HolidayCompensationRule, {
  foreignKey: { name: 'holidayPolicyID' },
});

HolidayCompensationRule.addHook(
  'beforeCreate',
  (holidayCompensationRule, options) => {
    holidayCompensationRule.createBy = options.user.userMasterId;
    holidayCompensationRule.createByIp = options.user.userIpAddress;
  },
);

HolidayCompensationRule.addHook(
  'beforeUpdate',
  (holidayCompensationRule, options) => {
    holidayCompensationRule.updateBy = options.user.userMasterId;
    holidayCompensationRule.updateByIp = options.user.userIpAddress;
  },
);

HolidayCompensationRule.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await HolidayCompensationRule.update(
      {
        deletedBy: options.user.userMasterId,
        deletedByIp: options.user.userIpAddress,
      },
      {
        where: options.where,
        transaction: options.transaction,
      },
    );
  }
});

module.exports = HolidayCompensationRule;
