const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const Project = require('./project');
const ProjectWiseSalaryDistribution = require('./projectWiseSalaryDistribution');

const ProjectWiseSalaryDistributionDetails = sequelize.define(
  'projectWiseSalaryDistributionDetails',
  {
    id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },

    projectID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Project is required.' },
      },
    },

    // Project Wise Salary Distribution ID
    pwsdID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Project Wise Salary Distribution reference is required.',
        },
      },
    },

    amount: {
      type: Sequelize.FLOAT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Amount is required.' },
        isFloat: { msg: 'Amount must be a valid number.' },
        min: {
          args: [0],
          msg: 'Amount must be a non-negative number.',
        },
      },
    },
    absentDeduction: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    penaltyDeduction: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    advanceDeduction: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    loanDeduction: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    createBy: { type: Sequelize.BIGINT },
    updateBy: { type: Sequelize.BIGINT },
    deleteBy: { type: Sequelize.BIGINT },
    createByIp: { type: Sequelize.STRING },
    updateByIp: { type: Sequelize.STRING },
    deleteByIp: { type: Sequelize.STRING },
  },
  {
    paranoid: true,
    indexes: [
      // Composite index: projectID + pwsdID (only for active rows)
      {
        name: 'unique_project_pwsd_active',
        unique: true,
        fields: ['projectID', 'pwsdID'],
        where: {
          deletedAt: null,
        },
      },

      // Indexes for faster joins
      { name: 'idx_pwsdID', fields: ['pwsdID'] },
      { name: 'idx_projectID', fields: ['projectID'] },
    ],
  },
);

// ----------------------------------------------
// Prevent duplicate project entries PRE-VALIDATION
// ----------------------------------------------
ProjectWiseSalaryDistributionDetails.addHook(
  'beforeValidate',
  async function (data, options) {
    if (!data.projectID || !data.pwsdID) return;

    const exists = await ProjectWiseSalaryDistributionDetails.findOne({
      where: {
        projectID: data.projectID,
        pwsdID: data.pwsdID,
        deletedAt: null,
        id: { [Sequelize.Op.ne]: data.id || 0 }, // exclude current record on update
      },
    });

    if (exists) {
      throw new Error(
        `This project is already added in the selected salary distribution.`,
      );
    }
  },
);

// ---------------------- Hooks for audit fields ----------------------

ProjectWiseSalaryDistributionDetails.addHook(
  'beforeCreate',
  (salaryDistributionDetails, options) => {
    if (options.user) {
      salaryDistributionDetails.createBy = options.user.userMasterId;
      salaryDistributionDetails.createByIp = options.user.userIpAddress;
    }
  },
);

ProjectWiseSalaryDistributionDetails.addHook(
  'beforeUpdate',
  (salaryDistributionDetails, options) => {
    if (options.user) {
      salaryDistributionDetails.updateBy = options.user.userMasterId;
      salaryDistributionDetails.updateByIp = options.user.userIpAddress;
    }
  },
);

ProjectWiseSalaryDistributionDetails.addHook(
  'beforeDestroy',
  async (salaryDistributionDetails, options) => {
    if (options.user) {
      salaryDistributionDetails.deleteBy = options.user.userMasterId;
      salaryDistributionDetails.deleteByIp = options.user.userIpAddress;

      await salaryDistributionDetails.save();
    }
  },
);

// ---------------------- Associations ----------------------
ProjectWiseSalaryDistributionDetails.belongsTo(Project, {
  foreignKey: { name: 'projectID' },
});

ProjectWiseSalaryDistributionDetails.belongsTo(ProjectWiseSalaryDistribution, {
  as: 'PWSD',
  foreignKey: { name: 'pwsdID' },
});

ProjectWiseSalaryDistribution.hasMany(ProjectWiseSalaryDistributionDetails, {
  as: 'PWSDD',
  foreignKey: { name: 'pwsdID' },
});

ProjectWiseSalaryDistributionDetails.belongsTo(UserMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});
ProjectWiseSalaryDistributionDetails.belongsTo(UserMaster, {
  as: 'updateByUser',
  foreignKey: { name: 'updateBy' },
});
ProjectWiseSalaryDistributionDetails.belongsTo(UserMaster, {
  as: 'deleteByUser',
  foreignKey: { name: 'deleteBy' },
});

module.exports = ProjectWiseSalaryDistributionDetails;
