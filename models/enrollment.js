const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');

const table_name = 'enrollments';

const Enrollment = sequelize.define(
  table_name,
  {
    enrollmentID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    userMasterID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'userMasters',
        key: 'userMasterID',
      },
    },
    courseID: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Reference to course table',
    },
    enrolledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    progressPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      allowNull: false,
    },
    isCertificateExpired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastReminderSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastManagerReminderSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      comment: '1 = active, 0 = inactive',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    deletedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdByIp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    updatedByIp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    deletedByIp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: table_name,
    timestamps: true,
    paranoid: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt',
    indexes: [
      {
        fields: ['userMasterID', 'courseID'],
        name: 'idx_enrollment_user_course',
      },
      {
        fields: ['userMasterID'],
        name: 'idx_enrollment_user',
      },
      {
        fields: ['courseID'],
        name: 'idx_enrollment_course',
      },
      {
        fields: ['isActive'],
        name: 'idx_enrollment_active',
      },
    ],
  },
);

// Associations
Enrollment.belongsTo(UserMaster, {
  as: 'user',
  foreignKey: 'userMasterID',
});

// Associate with Course (deferred to avoid circular dependency)
setImmediate(() => {
  const Course = require('./course');
  Enrollment.belongsTo(Course, {
    as: 'course',
    foreignKey: 'courseID',
    targetKey: 'id',
    constraints: false,
  });
});

Enrollment.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: 'createdBy',
});

Enrollment.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: 'updatedBy',
});

Enrollment.belongsTo(UserMaster, {
  as: 'deleteBy',
  foreignKey: 'deletedBy',
});

// Hooks for tracking user actions
Enrollment.addHook('beforeCreate', (enrollment, options) => {
  if (options.user) {
    enrollment.createdBy = options.user.userMasterID || options.user.userMasterId;
    enrollment.createdByIp = options.user.userIpAddress || options.user.ip;
  }
});

Enrollment.addHook('beforeUpdate', (enrollment, options) => {
  if (options.user) {
    enrollment.updatedBy = options.user.userMasterID || options.user.userMasterId;
    enrollment.updatedByIp = options.user.userIpAddress || options.user.ip;
  }
});

Enrollment.addHook('beforeDestroy', (enrollment, options) => {
  if (options.user) {
    enrollment.deletedBy = options.user.userMasterID || options.user.userMasterId;
    enrollment.deletedByIp = options.user.userIpAddress || options.user.ip;
  }
});

module.exports = Enrollment;
