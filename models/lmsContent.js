const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'contents';

const LmsContent = sequelize.define(
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
    type: {
      type: Sequelize.STRING(50),
      allowNull: false,
      // VIDEO, AUDIO, PDF, TEXT, EXTERNAL_LINK, IMAGE, DOCUMENT
    },
    textContent: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    fileKey: {
      type: Sequelize.STRING(500),
      allowNull: true,
    },
    externalUrl: {
      type: Sequelize.STRING(1000),
      allowNull: true,
    },
    fileSizeBytes: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    mimeType: {
      type: Sequelize.STRING(100),
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
    lessonId: {
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
    tableName: 'contents',
  }
);

LmsContent.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

LmsContent.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

LmsContent.addHook('beforeCreate', (content, options) => {
  if (options.user) {
    content.createdBy = options.user.userMasterId;
    content.createdByIp = options.user.userIpAddress;
  }
});

LmsContent.addHook('beforeUpdate', (content, options) => {
  if (options.user) {
    content.updatedBy = options.user.userMasterId;
    content.updatedByIp = options.user.userIpAddress;
  }
});

LmsContent.addHook('beforeDestroy', (content, options) => {
  if (options.user) {
    content.deletedBy = options.user.userMasterId;
    content.deletedByIp = options.user.userIpAddress;
  }
});

module.exports = LmsContent;

// Define associations after export to handle circular dependencies
setImmediate(() => {
  const LmsLesson = require('./lmsLesson');
  
  LmsContent.belongsTo(LmsLesson, {
    foreignKey: 'lessonId',
    constraints: false, // Don't enforce FK constraints at Sequelize level
  });
});
