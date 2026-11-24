const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const Course = require('./course');
const table_name = 'certificates';

const Certificate = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.STRING(36),
      allowNull: false,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    certificateNumber: {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true,
    },
    issuedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    expiresAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    isValid: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isExpiryWarningSent: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    finalScore: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
    },
    finalPercentage: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
    },
    completionTimeHours: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    verificationHash: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    userId: {
      type: Sequelize.INTEGER,
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
  },
);

// Define associations
Certificate.belongsTo(UserMaster, {
  as: 'user',
  foreignKey: 'userId',
  targetKey: 'userMasterID',
});

Certificate.belongsTo(Course, {
  as: 'course',
  foreignKey: 'courseId',
  targetKey: 'id',
});

Certificate.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

Certificate.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

// Add hooks for audit fields
Certificate.addHook('beforeCreate', (certificate, options) => {
  if (options.user) {
    certificate.createdBy = options.user.userMasterId;
    certificate.createdByIp = options.user.userIpAddress;
  }
});

Certificate.addHook('beforeUpdate', (certificate, options) => {
  if (options.user) {
    certificate.updatedBy = options.user.userMasterId;
    certificate.updatedByIp = options.user.userIpAddress;
  }
});

Certificate.addHook('beforeDestroy', (certificate, options) => {
  if (options.user) {
    certificate.deletedBy = options.user.userMasterId;
    certificate.deletedByIp = options.user.userIpAddress;
  }
});

// Virtual methods
Certificate.prototype.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > new Date(this.expiresAt);
};

Certificate.prototype.isActive = function() {
  return this.isValid && !this.isExpired();
};

module.exports = Certificate;
