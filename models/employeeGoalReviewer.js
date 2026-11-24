const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const EmployeeGoal = require('./employeeGoal');

const EmployeeGoalReviewer = sequelize.define(
  'employeeGoalReviewer',
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    startDate: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    noDays: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  { paranoid: true }
);

EmployeeGoalReviewer.belongsTo(EmployeeGoal, {
  foreignKey: { name: 'employeeGoalId', allowNull: false },
});
EmployeeGoal.hasMany(EmployeeGoalReviewer);
EmployeeGoalReviewer.belongsTo(UserMaster, {
  foreignKey: { name: 'reviewerId', allowNull: false },
  as: 'reviewer',
});
EmployeeGoalReviewer.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
  as: 'createdByUser',
});
EmployeeGoalReviewer.belongsTo(UserMaster, {
  foreignKey: { name: 'updateBy' },
  as: 'updatedByUser',
});
EmployeeGoalReviewer.belongsTo(UserMaster, {
  foreignKey: { name: 'deleteBy' },
  as: 'deletedByUser',
});

EmployeeGoalReviewer.addHook(
  'beforeCreate',
  (employeeGoalReviewer, options) => {
    employeeGoalReviewer.createBy = options.user.userMasterId;
    employeeGoalReviewer.updateBy = options.user.userMasterId;
    employeeGoalReviewer.createByIp = options.user.userIpAddress;
    employeeGoalReviewer.updateByIp = options.user.userIpAddress;
  }
);

EmployeeGoalReviewer.addHook(
  'beforeUpdate',
  (employeeGoalReviewer, options) => {
    employeeGoalReviewer.updateBy = options.user.userMasterId;
    employeeGoalReviewer.updateByIp = options.user.userIpAddress;
  }
);

EmployeeGoalReviewer.addHook(
  'beforeDestroy',
  (employeeGoalReviewer, options) => {
    employeeGoalReviewer.deleteBy = options.user.userMasterId;
    employeeGoalReviewer.deleteByIp = options.user.userIpAddress;
  }
);
module.exports = EmployeeGoalReviewer;
