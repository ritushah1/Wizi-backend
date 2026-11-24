const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const TaskStagesAmend = require('./taskStagesAmends');
const UserMaster = require('./userMaster');
const table_name = 'tasks_stages';
const Task_Stages = sequelize.define(
  table_name,
  {
    tasks_stagesID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
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
    updateBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteBy: {
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
  },
  { paranoid: true },
);

Task_Stages.addHook('beforeCreate', (Task_Stages, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  Task_Stages.createBy = options.user.userMasterId;
  Task_Stages.updateBy = options.user.userMasterId;
  Task_Stages.createByIp = options.user.userIpAddress;
  Task_Stages.updateByIp = options.user.userIpAddress;
});

Task_Stages.addHook('beforeUpdate', (Task_Stages, options) => {
  Task_Stages.updateBy = options.user.userMasterId;
  Task_Stages.ipAddress = options.user.userIpAddress;
  Task_Stages.updateByIp = options.user.userIpAddress;
});

Task_Stages.addHook(
  'beforeDestroy',
  async (AssetTask_StagesCategory, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    Task_Stages.deleteBy = options.user.userMasterId;
    Task_Stages.deleteByIp = options.user.userIpAddress;
    await Task_Stages.save({
      hooks: false,
      transaction: options.transaction,
    });
  },
);

Task_Stages.addHook('beforeSave', async (Task_Stages, options) => {
  Task_Stages.user = options.user;
});
Task_Stages.addHook('beforeBulkCreate', async (Task_Stages, options) => {
  Task_Stages.user = options.user;
});
Task_Stages.addHook('afterSave', async (Task_Stages, options) => {
  await addTaskStagesAmend(Task_Stages, options);
});
Task_Stages.addHook('afterBulkCreate', async (Task_Stages, options) => {
  await addTaskStagesAmend(Task_Stages, options);
});

async function addTaskStagesAmend(taskStages, options) {
  const list = Array.isArray(taskStages) ? taskStages : [taskStages];

  const user = taskStages.user;

  const rows = list.map((taskStage) => {
    const data = taskStage.get({ plain: true });

    return {
      tasks_stagesID: data.tasks_stagesID,
      TaskStage: data.TaskStage,
      companyMasterID: data.companyMasterID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await TaskStagesAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}
Task_Stages.belongsTo(companyMaster, {
  as: 'company',
  foreignKey: { name: 'companyMasterID' },
});
TaskStagesAmend.belongsTo(Task_Stages, {
  as: 'taskStagesAmends',
  foreignKey: { name: 'tasks_stagesID' },
});

Task_Stages.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

Task_Stages.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

Task_Stages.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = Task_Stages;
