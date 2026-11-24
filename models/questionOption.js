const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'questionOptions'; // Changed to plural to match database table

const QuestionOption = sequelize.define(
  table_name,
  {
    questionOptionID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    questionID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'questions', // Changed to plural
        key: 'questionID',
      },
    },
    optionText: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    isCorrect: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    orderIndex: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
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

module.exports = QuestionOption;
