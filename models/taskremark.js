const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const Task_Stages = require('./tasks_stages');
const UserTasks = require('./User_Tasks');
const table_name = 'taskremark';
const TaskRemark = sequelize.define(table_name, {
  taskremarkID: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  remark: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  tasks_stagesID: {
    type: Sequelize.BIGINT,
    allowNull: false,
  },
  user_TasksID: {
    type: Sequelize.BIGINT,
    allowNull: false,
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
  attachment: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  isS3Upload: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  migration: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  attachmentThunbnail: {
    type: Sequelize.STRING,
    allowNull: true,
  },
});

TaskRemark.belongsTo(UserTasks, { foreignKey: { name: 'user_TasksID' } });
TaskRemark.belongsTo(Task_Stages, { foreignKey: { name: 'tasks_stagesID' } });

module.exports = TaskRemark;
