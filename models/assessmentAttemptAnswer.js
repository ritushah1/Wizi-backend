const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const table_name = 'assessmentAttemptAnswers';

const AssessmentAttemptAnswer = sequelize.define(
  table_name,
  {
    assessmentAttemptAnswerID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    assessmentAttemptID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    questionID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    selectedOptionID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    isCorrect: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    timestamps: true,
    paranoid: true,
  },
);

module.exports = AssessmentAttemptAnswer;
