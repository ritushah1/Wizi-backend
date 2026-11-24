const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'course_assessments';

const CourseAssessment = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    courseId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    assessmentId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    originalAssessmentId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    type: {
      type: Sequelize.ENUM('PRE_ASSESSMENT', 'POST_ASSESSMENT'),
      allowNull: false,
    },
    isRequired: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    paranoid: true,
    tableName: 'course_assessments',
    indexes: [
      {
        unique: true,
        fields: ['courseId', 'type'],
        where: { status: 1 },
      },
    ],
  }
);

module.exports = CourseAssessment;

setImmediate(() => {
  const Course = require('./course');
  const Assessment = require('./assessment');

  CourseAssessment.belongsTo(Course, {
    as: 'course',
    foreignKey: 'courseId',
    constraints: false,
  });

  CourseAssessment.belongsTo(Assessment, {
    as: 'assessment',
    foreignKey: 'assessmentId',
    targetKey: 'assessmentID',
    constraints: false,
  });
});
