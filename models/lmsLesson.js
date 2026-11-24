const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'lessons';

const LmsLesson = sequelize.define(
  table_name,
  {
    id: {
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
    orderIndex: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    estimatedDuration: {
      type: Sequelize.INTEGER, // Duration in minutes
      defaultValue: 0,
      allowNull: false,
    },
    isRequired: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    moduleId: {
      type: Sequelize.INTEGER,
      allowNull: false,
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
    tableName: 'lessons',
  }
);

LmsLesson.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

LmsLesson.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

LmsLesson.addHook('beforeCreate', (lesson, options) => {
  if (options.user) {
    lesson.createdBy = options.user.userMasterId;
    lesson.createdByIp = options.user.userIpAddress;
  }
});

LmsLesson.addHook('beforeUpdate', (lesson, options) => {
  if (options.user) {
    lesson.updatedBy = options.user.userMasterId;
    lesson.updatedByIp = options.user.userIpAddress;
  }
});

LmsLesson.addHook('beforeDestroy', (lesson, options) => {
  if (options.user) {
    lesson.deletedBy = options.user.userMasterId;
    lesson.deletedByIp = options.user.userIpAddress;
  }
});

module.exports = LmsLesson;

// Define associations after export to handle circular dependencies
setImmediate(() => {
  const LmsModule = require('./lmsModule');
  const LmsContent = require('./lmsContent');
  
  LmsLesson.belongsTo(LmsModule, {
    foreignKey: 'moduleId',
    constraints: false, // Don't enforce FK constraints at Sequelize level
  });
  
  LmsLesson.hasMany(LmsContent, {
    as: 'contents',
    foreignKey: 'lessonId',
    constraints: false, // Don't enforce FK constraints at Sequelize level
  });
});
