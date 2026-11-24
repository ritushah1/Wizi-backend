const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const Task_Stages = require('./tasks_stages');
const table_name = 'userTasks';
const UserTasks = sequelize.define(table_name, {
  user_TasksID: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  userMasterID: {
    type: Sequelize.BIGINT,
    allowNull: false,
  },
  TaskName: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  TaskDesc: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
  attachment: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  attachmentThumb: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  priority: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  tasktype: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  isrecurringtype: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  recurringtimeline: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  startDate: {
    type: Sequelize.DATE,
    allowNull: false,
  },
  startTime: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  endDate: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  tasks_stagesID: {
    type: Sequelize.BIGINT,
    allowNull: false,
  },
  allTaskStage: {
    type: Sequelize.ARRAY(Sequelize.INTEGER),
    allowNull: true,
  },
  taskStatus: {
    //0-Pending 1-Accept 2-Reject 3-Completed
    type: Sequelize.BIGINT,
    allowNull: false,
    defaultValue: 0,
  },
  parentuserTasksID: {
    //0-MainTask
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  taskWeightage: {
    //max 100
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  hasSubTask: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  status: {
    type: Sequelize.INTEGER,
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
  isS3Upload: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  migration: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
});

UserTasks.belongsTo(UserMaster, { foreignKey: { name: 'userMasterID' } });
UserTasks.belongsTo(Task_Stages, { foreignKey: { name: 'tasks_stagesID' } });
UserTasks.belongsTo(UserTasks, {
  as: 'parentTask',
  foreignKey: 'parentuserTasksID',
});
UserTasks.belongsTo(UserMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});
UserTasks.belongsTo(UserMaster, {
  as: 'updateByUser',
  foreignKey: { name: 'updateBy' },
});
UserMaster.hasMany(UserTasks, { foreignKey: { name: 'userMasterID' } });

module.exports = UserTasks;
