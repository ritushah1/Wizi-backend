const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'course_designations';

const LmsCourseDesignation = sequelize.define(
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
    designationId: {
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
    tableName: 'course_designations',
    indexes: [
      {
        unique: true,
        fields: ['courseId', 'designationId'],
      },
    ],
  }
);

LmsCourseDesignation.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

LmsCourseDesignation.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

LmsCourseDesignation.addHook('beforeCreate', (courseDesig, options) => {
  if (options && options.user) {
    courseDesig.createdBy = options.user.userMasterId;
    courseDesig.createdByIp = options.user.userIpAddress;
  }
});

LmsCourseDesignation.addHook('beforeUpdate', (courseDesig, options) => {
  if (options && options.user) {
    courseDesig.updatedBy = options.user.userMasterId;
    courseDesig.updatedByIp = options.user.userIpAddress;
  }
});

LmsCourseDesignation.addHook('beforeDestroy', (courseDesig, options) => {
  if (options && options.user) {
    courseDesig.deletedBy = options.user.userMasterId;
    courseDesig.deletedByIp = options.user.userIpAddress;
  }
});

module.exports = LmsCourseDesignation;

// Define associations after export to handle circular dependencies
setImmediate(() => {
  const Course = require('./course');
  const Designation = require('./designation');
  
  LmsCourseDesignation.belongsTo(Course, {
    foreignKey: 'courseId',
    constraints: false,
  });
  
  LmsCourseDesignation.belongsTo(Designation, {
    as: 'designation',
    foreignKey: 'designationId',
    constraints: false,
  });
});
