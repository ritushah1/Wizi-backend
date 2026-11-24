const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const usermaster = require('./userMaster');
const Course = require('./course');
const table_name = 'courseAuthorizations';

const CourseAuthorizationRequest = sequelize.define(table_name, {
  AuthorizationRequestId: {
    type: Sequelize.BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  TableName: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'courses',
  },
  ReferenceID: {
    type: Sequelize.BIGINT,
    allowNull: false,
  },
  userMasterID: {
    type: Sequelize.BIGINT,
    allowNull: false,
  },
  status: {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: 1,
  },
  authstatus: {
    type: Sequelize.INTEGER,
    allowNull: true, // 1=> Accept, 2=> Pending, 0=> Reject
    defaultValue: 2,
  },
  createBy: {
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  updateBy: {
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  createByIp: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  updateByIp: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  viewstatus: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  rejectionRemarks: {
    type: Sequelize.TEXT,
    allowNull: true,
  },
});

CourseAuthorizationRequest.belongsTo(usermaster, {
  foreignKey: { name: 'createBy' },
});

CourseAuthorizationRequest.belongsTo(usermaster, {
  as: 'authorizedPerson',
  foreignKey: { name: 'userMasterID' },
});

CourseAuthorizationRequest.belongsTo(Course, {
  foreignKey: { name: 'ReferenceID' },
  as: 'course',
});

Course.hasMany(CourseAuthorizationRequest, {
  foreignKey: { name: 'ReferenceID' },
  as: 'courseAuthorizations',
});

CourseAuthorizationRequest.belongsTo(usermaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

CourseAuthorizationRequest.belongsTo(usermaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

module.exports = CourseAuthorizationRequest;
