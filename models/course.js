const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const AuthorizationCriteriaMaster = require('./authorizationCriteriaMaster');
const { certificateExpiryTypeEnum } = require('../utils/commonVars');
const table_name = 'courses';

const Course = sequelize.define(
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
      allowNull: false,
    },
    coverImageKey: {
      type: Sequelize.STRING(500),
      allowNull: true,
    },
    coverImageUrl: {
      type: Sequelize.STRING(1000),
      allowNull: true,
    },
    courseStatus: {
      type: Sequelize.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    level: {
      type: Sequelize.ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED'),
      allowNull: false,
      defaultValue: 'BEGINNER',
    },
    category: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    deadline: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    passingPercentage: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 70,
    },
    certificateEnabled: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isMandatory: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isSelfEnroll: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    certificateExpiryType: {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: certificateExpiryTypeEnum.LIFETIME,
    },
    certificateExpiryDays: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    allowReenrollment: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    allowReassignmentOnCertExpiry: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    estimatedDuration: {
      type: Sequelize.INTEGER, // Duration in minutes
      defaultValue: 0,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    authorizationStatus: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0, // 0=>Draft, 1=>Pending Any, 2=>Pending Sequence, 3=>Approved, 4=>Rejected
    },
    AuthorizationCriteriaID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    authorizerRemark: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    rejectionRemarks: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    isAuthorizedBy: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    authorizedBy: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    authorizedAt: {
      type: Sequelize.DATE,
      allowNull: true,
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

Course.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

Course.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

Course.belongsTo(UserMaster, {
  as: 'authorizedByUser',
  foreignKey: { name: 'authorizedBy' },
});

Course.belongsTo(AuthorizationCriteriaMaster, {
  as: 'AuthorizationCriteriaMaster',
  foreignKey: { name: 'AuthorizationCriteriaID' },
});

Course.belongsTo(CompanyMaster, {
  as: 'companyMaster',
  foreignKey: { name: 'companyMasterID' },
});
Course.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

Course.addHook('beforeCreate', (course, options) => {
  if (options.user) {
    course.createdBy = options.user.userMasterId;
    course.createdByIp = options.user.userIpAddress;
  }
});

Course.addHook('beforeUpdate', (course, options) => {
  if (options.user) {
    course.updatedBy = options.user.userMasterId;
    course.updatedByIp = options.user.userIpAddress;
  }
});

Course.addHook('beforeDestroy', (course, options) => {
  if (options.user) {
    course.deletedBy = options.user.userMasterId;
    course.deletedByIp = options.user.userIpAddress;
  }
});

module.exports = Course;

// Define associations after export to handle circular dependencies
setImmediate(() => {
  const LmsModule = require('./lmsModule');
  const LmsCourseDepartment = require('./lmsCourseDepartment');
  const LmsCourseDesignation = require('./lmsCourseDesignation');
  const LmsCourseUser = require('./lmsCourseUser');
  const CategoryMaster = require('./categoryMaster');
  
  Course.hasMany(LmsModule, {
    as: 'modules',
    foreignKey: 'courseId',
    constraints: false, // Don't enforce FK constraints at Sequelize level
  });
  
  Course.hasMany(LmsCourseDepartment, {
    as: 'courseDepartments',
    foreignKey: 'courseId',
    constraints: false, // Don't enforce FK constraints at Sequelize level
  });

  Course.hasMany(LmsCourseDesignation, {
    as: 'courseDesignations',
    foreignKey: 'courseId',
    constraints: false,
  });

  Course.hasMany(LmsCourseUser, {
    as: 'courseUsers',
    foreignKey: 'courseId',
    constraints: false,
  });

  const CourseAssessment = require('./courseAssessment');
  Course.hasMany(CourseAssessment, {
    as: 'courseAssessments',
    foreignKey: 'courseId',
    constraints: false,
  });
});

module.exports = Course;
