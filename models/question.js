const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const Department = require('./department');
const table_name = 'questions'; // Changed to plural to match database table

const Question = sequelize.define(
  table_name,
  {
    questionID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    questionText: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    questionType: {
      type: Sequelize.ENUM('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'),
      allowNull: false,
      defaultValue: 'MULTIPLE_CHOICE',
    },
    points: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    difficulty: {
      type: Sequelize.ENUM('EASY', 'MEDIUM', 'HARD'),
      allowNull: false,
      defaultValue: 'MEDIUM',
    },
    explanation: {
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
    questionCategoryMasterID: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'questionCategoryMasters',
        key: 'questionCategoryMasterID',
      },
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isSnapshot: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    originalQuestionID: {
      type: Sequelize.INTEGER,
      allowNull: true,
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

const QuestionCategoryMaster = require('./questionCategoryMaster');

Question.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

Question.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

Question.belongsTo(Department, {
  as: 'department',
  foreignKey: { name: 'departmentID' },
});

Question.belongsTo(QuestionCategoryMaster, {
  as: 'questionCategory',
  foreignKey: { name: 'questionCategoryMasterID' },
});

// Remove hooks - audit fields are set directly in controller
// Question.addHook('beforeCreate', (question, options) => {
//   question.createdBy = options.user.userMasterId;
//   question.createdByIp = options.user.userIpAddress;
// });

// Question.addHook('beforeUpdate', (question, options) => {
//   question.updatedBy = options.user.userMasterId;
//   question.updatedByIp = options.user.userIpAddress;
// });

// Question.addHook('beforeDestroy', (question, options) => {
//   question.deletedBy = options.user.userMasterId;
//   question.deletedByIp = options.user.userIpAddress;
// });

const QuestionOption = require('./questionOption');

if (!Question.associations || !Question.associations.questionOptions) {
  Question.hasMany(QuestionOption, {
    as: 'questionOptions',
    foreignKey: 'questionID',
  });
}

if (!QuestionOption.associations || !QuestionOption.associations.question) {
  QuestionOption.belongsTo(Question, {
    foreignKey: 'questionID',
  });
}

Question.associate = (models) => {
  if (!Question.associations || !Question.associations.questionOptions) {
    Question.hasMany(models.QuestionOption, {
      as: 'questionOptions',
      foreignKey: 'questionID',
    });
  }
};

module.exports = Question;
