const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const AppraisalFeedbackReq = require('./appraisalFeedbacklRequest');
const UserMaster = require('./userMaster');
const { probationAssessmentFieldType } = require('../utils/commonVars');
const table_name = 'appraisalFeedbackReqValue';

const AppraisalFeedbackReqValue = sequelize.define(
  table_name,
  {
    appraisalFeedbackReqValueID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    appraisalFeedbackReqID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    parameter: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    value: {
      type: Sequelize.STRING,
    },
    fieldType: {
      type: Sequelize.ENUM(...Object.values(probationAssessmentFieldType)),
    },
    needsToImprove: {
      type: Sequelize.TEXT,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
  },
  {
    paranoid: true,
  }
);

AppraisalFeedbackReqValue.belongsTo(AppraisalFeedbackReq, {
  foreignKey: { name: 'appraisalFeedbackReqID' },
});
AppraisalFeedbackReq.hasMany(AppraisalFeedbackReqValue, {
  foreignKey: { name: 'appraisalFeedbackReqID' },
});

AppraisalFeedbackReqValue.addHook(
  'beforeCreate',
  (appraisalFeedbackReqValue, options) => {
    appraisalFeedbackReqValue.createBy = options.user.userMasterId;
    appraisalFeedbackReqValue.createByIp = options.user.userIpAddress;
  }
);

AppraisalFeedbackReqValue.addHook(
  'beforeUpdate',
  (appraisalFeedbackReqValue, options) => {
    appraisalFeedbackReqValue.updateBy = options.user.userMasterId;
    appraisalFeedbackReqValue.updateByIp = options.user.userIpAddress;
  }
);

AppraisalFeedbackReqValue.addHook(
  'beforeDestroy',
  (appraisalFeedbackReqValue, options) => {
    appraisalFeedbackReqValue.deleteBy = options.user.userMasterId;
    appraisalFeedbackReqValue.deleteByIp = options.user.userIpAddress;
  }
);

AppraisalFeedbackReqValue.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

AppraisalFeedbackReqValue.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

AppraisalFeedbackReqValue.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

module.exports = AppraisalFeedbackReqValue;
