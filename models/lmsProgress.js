const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const Enrollment = require('./enrollment');
const UserMaster = require('./userMaster');
const table_name = 'lms_progress';

const LmsProgress = sequelize.define(
  table_name,
  {
    progressID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    enrollmentID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    itemType: {
      type: Sequelize.STRING(50),
      allowNull: false,
      // COURSE, MODULE, LESSON, CONTENT
    },
    itemID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    progressPercentage: {
      type: Sequelize.DECIMAL(5, 2),
      defaultValue: 0,
      allowNull: false,
    },
    isCompleted: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    completedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    videoMaxWatched: {
      type: Sequelize.FLOAT,
      defaultValue: 0,
      allowNull: true,
    },
    videoCurrentTime: {
      type: Sequelize.FLOAT,
      defaultValue: 0,
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
    tableName: 'lms_progress',
    indexes: [
      {
        unique: true,
        fields: ['enrollmentID', 'itemType', 'itemID'],
        name: 'unique_progress_item',
      },
    ],
  }
);

LmsProgress.belongsTo(Enrollment, {
  foreignKey: 'enrollmentID',
});

LmsProgress.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

LmsProgress.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

LmsProgress.addHook('beforeCreate', (progress, options) => {
  if (options.user) {
    progress.createdBy = options.user.userMasterId;
    progress.createdByIp = options.user.userIpAddress;
  }
});

LmsProgress.addHook('beforeUpdate', (progress, options) => {
  if (options.user) {
    progress.updatedBy = options.user.userMasterId;
    progress.updatedByIp = options.user.userIpAddress;
  }
});

LmsProgress.addHook('beforeDestroy', (progress, options) => {
  if (options.user) {
    progress.deletedBy = options.user.userMasterId;
    progress.deletedByIp = options.user.userIpAddress;
  }
});

module.exports = LmsProgress;
