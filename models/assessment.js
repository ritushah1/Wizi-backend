const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const Department = require('./department');
const table_name = 'assessment';

const Assessment = sequelize.define(
  table_name,
  {
    assessmentID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    title: {
      type: Sequelize.STRING(200),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    type: {
      type: Sequelize.ENUM('PRE_ASSESSMENT', 'POST_ASSESSMENT', 'QUIZ', 'EXAM'),
      allowNull: false,
    },
    passingPercentage: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    totalMarks: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 100,
      comment: 'Total marks for the assessment',
    },
    timeLimit: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Time limit in minutes',
    },
    maxAttempts: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    instructions: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    departmentID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'departments',
        key: 'departmentId',
      },
    },
    isSnapshot: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    originalAssessmentID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    courseId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '0=deleted, 1=active, 2=inactive',
    },
    createdBy: {
      type: Sequelize.INTEGER,
    },
    updatedBy: {
      type: Sequelize.INTEGER,
    },
    deletedBy: {
      type: Sequelize.INTEGER,
    },
    createdByIp: {
      type: Sequelize.STRING,
    },
    updatedByIp: {
      type: Sequelize.STRING,
    },
    deletedByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  },
);

Assessment.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

Assessment.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

Assessment.belongsTo(Department, {
  as: 'department',
  foreignKey: { name: 'departmentID' },
});

Assessment.addHook('beforeCreate', (assessment, options) => {
  if (options.user) {
    assessment.createdBy = options.user.userMasterId;
    assessment.createdByIp = options.user.userIpAddress;
  }
});

Assessment.addHook('beforeUpdate', (assessment, options) => {
  if (options.user) {
    assessment.updatedBy = options.user.userMasterId;
    assessment.updatedByIp = options.user.userIpAddress;
  }
});

Assessment.addHook('beforeDestroy', (assessment, options) => {
  if (options.user) {
    assessment.deletedBy = options.user.userMasterId;
    assessment.deletedByIp = options.user.userIpAddress;
  }
});

module.exports = Assessment;
