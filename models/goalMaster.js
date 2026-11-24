const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const userMaster = require('./userMaster');
const { GoalTypeEnum, GoalEvaluationPeriodEnum } = require('../utils/dbUtils');
const GoalSetting = require('./goalSetting');

const GoalMaster = sequelize.define(
  'goalMaster',
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM(...Object.values(GoalTypeEnum)),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
    },
    evaluationPeriod: {
      type: Sequelize.ENUM(...Object.values(GoalEvaluationPeriodEnum)),
      allowNull: false,
      defaultValue: GoalEvaluationPeriodEnum.ANNUALLY,
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
  { paranoid: true }
);

GoalMaster.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterId', allowNull: false },
});

GoalMaster.belongsTo(GoalSetting, {
  foreignKey: { name: 'goalSettingId', allowNull: false },
});
GoalSetting.hasMany(GoalMaster, {
  foreignKey: { name: 'goalSettingId' },
});

GoalMaster.belongsTo(userMaster, {
  foreignKey: { name: 'createBy' },
  as: 'createdByUser',
});
GoalMaster.belongsTo(userMaster, {
  foreignKey: { name: 'updateBy' },
  as: 'updatedByUser',
});
GoalMaster.belongsTo(userMaster, {
  foreignKey: { name: 'deleteBy' },
  as: 'deletedByUser',
});

GoalMaster.addHook('beforeCreate', (goal, options) => {
  // Set createdBy, updatedBy, and ipAddress based on the authenticated user
  goal.createBy = options.user.userMasterId;
  goal.updateBy = options.user.userMasterId;
  goal.createByIp = options.user.userIpAddress;
  goal.updateByIp = options.user.userIpAddress;
});

GoalMaster.addHook('beforeUpdate', (goal, options) => {
  // Set updatedBy and ipAddress based on the authenticated user
  goal.updateBy = options.user.userMasterId;
  goal.updateByIp = options.user.userIpAddress;
});

GoalMaster.addHook('beforeDestroy', (goal, options) => {
  // Set deletedBy and ipAddress based on the authenticated user
  goal.deleteBy = options.user.userMasterId;
  goal.deleteByIp = options.user.userIpAddress;
});

module.exports = GoalMaster;
