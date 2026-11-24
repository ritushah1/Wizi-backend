const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const Site = require('./site');
const BranchMaster = require('./branchMaster');
const ProjectAmend = require('./projectAmend');
const table_name = 'project';

const Project = sequelize.define(
  table_name,
  {
    projectID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    projectName: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    display_id: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    short_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    projectDescription: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    deactiveDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    branchMasterID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    siteID: {
      type: Sequelize.BIGINT,
      allowNull: true,
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
  { paranoid: true }
);

Project.addHook('beforeCreate', (project, options) => {
  project.createBy = options.user.userMasterId;
  project.createByIp = options.user.userIpAddress;
});

Project.addHook('beforeUpdate', (project, options) => {
  project.updateBy = options.user.userMasterId;
  project.updateByIp = options.user.userIpAddress;
});

Project.addHook('beforeDestroy', async (Project, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  Project.deleteBy = options.user.userMasterId;
  Project.deleteByIp = options.user.userIpAddress;
  await Project.save({
    hooks: false,
    transaction: options.transaction,
  });
});

Project.addHook('beforeSave',async (project,options)=>{
  project.user=options.user
})
Project.addHook('beforeBulkCreate',async(project,options)=>{
  project.user=options.user
})
Project.addHook('afterSave',async(project,options)=>{
   await addProjectAmend(project,options);
})
Project.addHook('afterBulkCreate',async(project,options)=>{
  await addProjectAmend(project,options);
})

async function addProjectAmend(projects, options) {
  const list = Array.isArray(projects) ? projects : [projects];

  const user = Array.isArray(projects)
    ? projects.user
    : projects.user;

  const rows = list.map((project) => {
    const data = project.get({ plain: true });

    return {
      projectID: data.projectID,
      projectName: data.projectName,
      display_id: data.display_id,
      short_name: data.short_name,
      projectDescription: data.projectDescription,
      deactiveDate: data.deactiveDate,
      companyMasterID: data.companyMasterID,
      branchMasterID: data.branchMasterID,
      siteID: data.siteID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await ProjectAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

Project.belongsTo(companyMaster, { foreignKey: { name: 'companyMasterID' } });

Project.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

Project.belongsTo(UserMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

Project.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});
Project.belongsTo(BranchMaster, {
  foreignKey: { name: 'branchMasterID' },
});
Project.belongsTo(Site, {
  foreignKey: { name: 'siteID' },
});
ProjectAmend.belongsTo(Project, {
  foreignKey: { name: 'projectID' },
});

module.exports = Project;
