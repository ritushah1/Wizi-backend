const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const EmployeeEmployeement = require('./employeeEmployeement');
const { TargetAchieved, suggestionAuthority } = require('../utils/dbUtils');
const table_name = 'appraisalFeedbackReq';

const AppraisalFeedbackReq = sequelize.define(
  table_name,
  {
    appraisalFeedbackReqID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    filledByID: {
      type: Sequelize.BIGINT,
    },
    authoritySuggestion: {
      type: Sequelize.ENUM(...Object.values(suggestionAuthority)),
    },
    isTargetAchieved: {
      type: Sequelize.ENUM(...Object.values(TargetAchieved)),
    },
    extendedReason: {
      type: Sequelize.TEXT,
    },
    employeeEmploymentID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    updateBy: {
      type: Sequelize.BIGINT,
    },
    deleteBy: {
      type: Sequelize.INTEGER,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
    isReassessment: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    isAuthCycleDone: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
  },
  {
    paranoid: true,
  }
);

AppraisalFeedbackReq.belongsTo(EmployeeEmployeement, {
  as: 'eA',
  foreignKey: { name: 'employeeEmploymentID' },
});
EmployeeEmployeement.hasMany(AppraisalFeedbackReq, {
  as: 'eA',
  foreignKey: { name: 'employeeEmploymentID' },
});
AppraisalFeedbackReq.belongsTo(UserMaster, {
  foreignKey: { name: 'filledByID' },
  as: 'reviewer',
});
AppraisalFeedbackReq.addHook(
  'beforeCreate',
  (appraisalFeedbackRequest, options) => {
    appraisalFeedbackRequest.createBy = options.user.userMasterId;
    appraisalFeedbackRequest.createByIp = options.user.userIpAddress;
  }
);

AppraisalFeedbackReq.addHook(
  'beforeUpdate',
  (appraisalFeedbackRequest, options) => {
    appraisalFeedbackRequest.updateBy = options.user.userMasterId;
    appraisalFeedbackRequest.updateByIp = options.user.userIpAddress;
  }
);

AppraisalFeedbackReq.addHook(
  'beforeDestroy',
  (appraisalFeedbackRequest, options) => {
    appraisalFeedbackRequest.deleteBy = options.user.userMasterId;
    appraisalFeedbackRequest.deleteByIp = options.user.userIpAddress;
  }
);

AppraisalFeedbackReq.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

AppraisalFeedbackReq.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

AppraisalFeedbackReq.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

module.exports = AppraisalFeedbackReq;
