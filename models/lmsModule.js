const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'modules';

const LmsModule = sequelize.define(
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
    courseId: {
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
    tableName: 'modules',
  }
);

LmsModule.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

LmsModule.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

LmsModule.addHook('beforeCreate', (module, options) => {
  if (options.user) {
    module.createdBy = options.user.userMasterId;
    module.createdByIp = options.user.userIpAddress;
  }
});

LmsModule.addHook('beforeUpdate', (module, options) => {
  if (options.user) {
    module.updatedBy = options.user.userMasterId;
    module.updatedByIp = options.user.userIpAddress;
  }
});

LmsModule.addHook('beforeDestroy', (module, options) => {
  if (options.user) {
    module.deletedBy = options.user.userMasterId;
    module.deletedByIp = options.user.userIpAddress;
  }
});

module.exports = LmsModule;

// Define associations after export to handle circular dependencies
setImmediate(() => {
  const Course = require('./course');
  const LmsLesson = require('./lmsLesson');
  
  LmsModule.belongsTo(Course, {
    foreignKey: 'courseId',
    constraints: false, // Don't enforce FK constraints at Sequelize level
  });
  
  LmsModule.hasMany(LmsLesson, {
    as: 'lessons',
    foreignKey: 'moduleId',
    constraints: false, // Don't enforce FK constraints at Sequelize level
  });
});
