const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const JobRoleClassificationAmend = require('./jobRoleClassificationAmends');

const table_name = 'jobRoleClassification';

const JobRoleClassification = sequelize.define(
  table_name,
  {
    jobRoleClassificationID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    jobRoleClassificationName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    jobRoleClassificationDescription: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
  { paranoid: true },
);

JobRoleClassification.addHook(
  'beforeCreate',
  (jobRoleClassification, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    jobRoleClassification.createBy = options.user.userMasterId;
    jobRoleClassification.updateBy = options.user.userMasterId;
    jobRoleClassification.createByIp = options.user.userIpAddress;
    jobRoleClassification.updateByIp = options.user.userIpAddress;
  },
);

JobRoleClassification.addHook(
  'beforeUpdate',
  (jobRoleClassification, options) => {
    // Set updateBy and ipAddress based on the authenticated user
    jobRoleClassification.updateBy = options.user.userMasterId;
    jobRoleClassification.ipAddress = options.user.userIpAddress;
    jobRoleClassification.updateByIp = options.user.userIpAddress;
  },
);

JobRoleClassification.addHook('beforeDestroy', async (JobRoleClassification, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  JobRoleClassification.deleteBy = options.user.userMasterId;
  JobRoleClassification.deleteByIp = options.user.userIpAddress;
  await JobRoleClassification.save({
    hooks: false,
    transaction: options.transaction,
  });
});
JobRoleClassification.addHook(
  'beforeSave',
  async (JobRoleClassification, options) => {
    JobRoleClassification.user = options.user;
  },
);
JobRoleClassification.addHook(
  'beforeBulkCreate',
  async (JobRoleClassification, options) => {
    JobRoleClassification.user = options.user;
  },
);
JobRoleClassification.addHook(
  'afterSave',
  async (JobRoleClassification, options) => {
    await addJobRoleClassificationAmend(JobRoleClassification, options);
  },
);
JobRoleClassification.addHook(
  'afterBulkCreate',
  async (JobRoleClassification, options) => {
    await addJobRoleClassificationAmend(JobRoleClassification, options);
  },
);

async function addJobRoleClassificationAmend(jobRoleClassifications, options) {
  const list = Array.isArray(jobRoleClassifications)
    ? jobRoleClassifications
    : [jobRoleClassifications];

  const user = jobRoleClassifications.user;

  const rows = list.map((jobRoleClassification) => {
    const data = jobRoleClassification.get({ plain: true });

    return {
      jobRoleClassificationID: data.jobRoleClassificationID,
      companyMasterID: data.companyMasterID,
      jobRoleClassificationName: data.jobRoleClassificationName,
      jobRoleClassificationDescription: data.jobRoleClassificationDescription,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await JobRoleClassificationAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

JobRoleClassification.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

JobRoleClassification.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

JobRoleClassification.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

JobRoleClassification.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});
JobRoleClassificationAmend.belongsTo(JobRoleClassification, {
  as: 'jobRoleClassificationAmends',
  foreignKey: { name: 'jobRoleClassificationID' },
});

module.exports = JobRoleClassification;
