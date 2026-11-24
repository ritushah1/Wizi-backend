const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const GoalMaster = require('./goalMaster');
const {
  EmployeeGoalStatusEnum,
  GoalEvaluationPeriodEnum,
  ReviewerRoleEnum,
  ReviewTypeEnum,
  ReviewPeriodEnum,
} = require('../utils/dbUtils');

const EmployeeGoal = sequelize.define(
  'employeeGoal',
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    remarks: {
      type: Sequelize.TEXT,
    },
    targetGiven: {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 100,
    },
    targetAchieved: {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: 0,
    },
    evaluationPeriod: {
      type: Sequelize.ENUM(...Object.values(GoalEvaluationPeriodEnum)),
      allowNull: false,
    },
    reviewPeriod: {
      type: Sequelize.ENUM(...Object.values(ReviewPeriodEnum)),
      defaultValue: ReviewPeriodEnum.MONTHLY,
    },
    status: {
      type: Sequelize.ENUM(...Object.values(EmployeeGoalStatusEnum)),
      defaultValue: EmployeeGoalStatusEnum.OPEN,
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    reviewerRole: {
      type: Sequelize.ENUM(...Object.values(ReviewerRoleEnum)),
      defaultValue: ReviewerRoleEnum.OTHER,
    },
    reviewType: {
      type: Sequelize.ENUM(...Object.values(ReviewTypeEnum)),
      defaultValue: ReviewTypeEnum.ANY,
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
EmployeeGoal.belongsTo(UserMaster, {
  foreignKey: { name: 'userMasterId', allowNull: false },
  as: 'goalAssignedTo',
});
EmployeeGoal.belongsTo(GoalMaster, {
  foreignKey: { name: 'goalMasterId', allowNull: false },
});
GoalMaster.hasMany(EmployeeGoal);

EmployeeGoal.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
  as: 'createdByUser',
});

EmployeeGoal.belongsTo(UserMaster, {
  foreignKey: { name: 'updateBy' },
  as: 'updatedByUser',
});
EmployeeGoal.belongsTo(UserMaster, {
  foreignKey: { name: 'deleteBy' },
  as: 'deletedByUser',
});

EmployeeGoal.addHook('beforeCreate', (employeeGoal, options) => {
  employeeGoal.createBy = options.user.userMasterId;
  employeeGoal.updateBy = options.user.userMasterId;
  employeeGoal.createByIp = options.user.userIpAddress;
  employeeGoal.updateByIp = options.user.userIpAddress;
});

EmployeeGoal.addHook('beforeUpdate', (employeeGoal, options) => {
  employeeGoal.updateBy = options.user.userMasterId;
  employeeGoal.updateByIp = options.user.userIpAddress;
});

EmployeeGoal.addHook('beforeDestroy', (employeeGoal, options) => {
  employeeGoal.deleteBy = options.user.userMasterId;
  employeeGoal.deleteByIp = options.user.userIpAddress;
});

module.exports = EmployeeGoal;
