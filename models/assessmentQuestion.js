const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const Assessment = require('./assessment');
const Question = require('./question');
const table_name = 'assessmentQuestion';

const AssessmentQuestion = sequelize.define(
  table_name,
  {
    assessmentQuestionID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    orderIndex: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    points: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
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

AssessmentQuestion.belongsTo(Assessment, {
  foreignKey: { name: 'assessmentID', allowNull: false },
});

AssessmentQuestion.belongsTo(Question, {
  foreignKey: { name: 'questionID', allowNull: false },
});

Assessment.hasMany(AssessmentQuestion, {
  foreignKey: 'assessmentID',
  as: 'assessmentQuestions',
});

AssessmentQuestion.addHook('beforeCreate', (assessmentQuestion, options) => {
  if (options.user) {
    assessmentQuestion.createdBy = options.user.userMasterId;
    assessmentQuestion.createdByIp = options.user.userIpAddress;
  }
});

AssessmentQuestion.addHook('beforeUpdate', (assessmentQuestion, options) => {
  if (options.user) {
    assessmentQuestion.updatedBy = options.user.userMasterId;
    assessmentQuestion.updatedByIp = options.user.userIpAddress;
  }
});

AssessmentQuestion.addHook('beforeDestroy', (assessmentQuestion, options) => {
  if (options.user) {
    assessmentQuestion.deletedBy = options.user.userMasterId;
    assessmentQuestion.deletedByIp = options.user.userIpAddress;
  }
});

module.exports = AssessmentQuestion;
