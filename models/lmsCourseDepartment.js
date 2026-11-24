const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'course_departments';

const LmsCourseDepartment = sequelize.define(
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
    departmentId: {
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
    tableName: 'course_departments',
    indexes: [
      {
        unique: true,
        fields: ['courseId', 'departmentId'],
      },
    ],
  }
);

LmsCourseDepartment.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

LmsCourseDepartment.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

LmsCourseDepartment.addHook('beforeCreate', (courseDept, options) => {
  courseDept.createdBy = options.user.userMasterId;
  courseDept.createdByIp = options.user.userIpAddress;
});

LmsCourseDepartment.addHook('beforeUpdate', (courseDept, options) => {
  courseDept.updatedBy = options.user.userMasterId;
  courseDept.updatedByIp = options.user.userIpAddress;
});

LmsCourseDepartment.addHook('beforeDestroy', (courseDept, options) => {
  courseDept.deletedBy = options.user.userMasterId;
  courseDept.deletedByIp = options.user.userIpAddress;
});

module.exports = LmsCourseDepartment;

// Define associations after export to handle circular dependencies
setImmediate(() => {
  const Course = require('./course');
  const Department = require('./department');
  
  LmsCourseDepartment.belongsTo(Course, {
    foreignKey: 'courseId',
    constraints: false, // Don't enforce FK constraints at Sequelize level
  });
  
  LmsCourseDepartment.belongsTo(Department, {
    as: 'department',
    foreignKey: 'departmentId',
    constraints: false,
  });
});
