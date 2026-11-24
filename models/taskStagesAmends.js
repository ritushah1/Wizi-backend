const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const table_name = 'tasksStagesAmend';

const TaskStagesAmend = sequelize.define(
  table_name,
  {
    tasksStagesAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

    tasks_stagesID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    TaskStage: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
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

    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        fields: ['tasks_stagesID'],
      },
    ],
  },
);

TaskStagesAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
TaskStagesAmend.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
});

module.exports = TaskStagesAmend;
