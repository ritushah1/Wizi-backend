const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'course_users';

const LmsCourseUser = sequelize.define(
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
    userMasterID: {
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
    tableName: 'course_users',
    indexes: [
      {
        unique: true,
        fields: ['courseId', 'userMasterID'],
      },
    ],
  }
);

LmsCourseUser.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

LmsCourseUser.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

LmsCourseUser.addHook('beforeCreate', (courseUser, options) => {
  if (options && options.user) {
    courseUser.createdBy = options.user.userMasterId;
    courseUser.createdByIp = options.user.userIpAddress;
  }
});

LmsCourseUser.addHook('beforeUpdate', (courseUser, options) => {
  if (options && options.user) {
    courseUser.updatedBy = options.user.userMasterId;
    courseUser.updatedByIp = options.user.userIpAddress;
  }
});

LmsCourseUser.addHook('beforeDestroy', (courseUser, options) => {
  if (options && options.user) {
    courseUser.deletedBy = options.user.userMasterId;
    courseUser.deletedByIp = options.user.userIpAddress;
  }
});

module.exports = LmsCourseUser;

// Define associations after export to handle circular dependencies
setImmediate(() => {
  const Course = require('./course');
  const UserMaster = require('./userMaster');
  
  LmsCourseUser.belongsTo(Course, {
    foreignKey: 'courseId',
    constraints: false,
  });
  
  LmsCourseUser.belongsTo(UserMaster, {
    as: 'user',
    foreignKey: 'userMasterID',
    constraints: false,
  });
});
