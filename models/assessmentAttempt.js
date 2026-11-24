const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');

const table_name = 'assessmentAttempts';

const AssessmentAttempt = sequelize.define(
  table_name,
  {
    assessmentAttemptID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    assessmentID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    courseID: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Course ID if taken within a course',
    },
    userMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    startedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    submittedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    score: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      comment: 'Score percentage (0-100)',
    },
    correctAnswers: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    totalQuestions: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    isPassed: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    timeSpent: {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Time spent in seconds',
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '0=deleted, 1=active, 2=in-progress',
    },
    createdBy: {
      type: Sequelize.INTEGER,
    },
    updatedBy: {
      type: Sequelize.INTEGER,
    },
    createdByIp: {
      type: Sequelize.STRING,
    },
    updatedByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    timestamps: true,
    paranoid: true,
  },
);

// Define associations
AssessmentAttempt.belongsTo(UserMaster, {
  as: 'user',
  foreignKey: 'userMasterID',
  targetKey: 'userMasterID',
});

module.exports = AssessmentAttempt;
