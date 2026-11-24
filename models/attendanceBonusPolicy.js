const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const {
  attendanceBonusSlotEnum,
  attendanceBonusForEnum,
  attendanceBonusType,
  policyScope,
} = require('../utils/dbUtils');
const table_name = 'attendanceBonusPolicy';

const AttendanceBonusPolicy = sequelize.define(
  table_name,
  {
    attendanceBonusPolicyId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    // forgein key
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    attendanceBonusPolicyName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    setNoattendanceBonusPolicy: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    setPresentDay: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    noofPrentDay: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    attendanceBonustype: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    attendanceBonusAmount: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.INTEGER,
    },
    updateBy: {
      type: Sequelize.INTEGER,
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
    slots: {
      type: Sequelize.ENUM(...Object.values(attendanceBonusSlotEnum)),
      allowNull: true,
    },
    noofPrentDaySlot2: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    attendanceBonustypeSlot2: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    attendanceBonusAmountSlot2: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    type: {
      type: Sequelize.ENUM(...Object.values(attendanceBonusType)),
      allowNull: true,
    },
    min_bonus_hrs: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    bonus_criteria: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    hours: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    noofPrentDaySlot3: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    attendanceBonustypeSlot3: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    attendanceBonusAmountSlot3: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    attBonusFor: {
      type: Sequelize.ENUM(...Object.values(attendanceBonusForEnum)),
    },
    branch_scope: {
      type: Sequelize.ENUM(...Object.values(policyScope)),
      defaultValue: policyScope.ALL,
    },
    department_scope: {
      type: Sequelize.ENUM(...Object.values(policyScope)),
      defaultValue: policyScope.ALL,
    },
    designation_scope: {
      type: Sequelize.ENUM(...Object.values(policyScope)),
      defaultValue: policyScope.ALL,
    },
  },
  {
    paranoid: true,
  },
);

AttendanceBonusPolicy.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

AttendanceBonusPolicy.addHook(
  'beforeCreate',
  (attendanceBonusPolicy, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    attendanceBonusPolicy.createBy = options.user.userMasterId;
    attendanceBonusPolicy.updateBy = options.user.userMasterId;
    attendanceBonusPolicy.createByIp = options.user.userIpAddress;
    attendanceBonusPolicy.updateByIp = options.user.userIpAddress;
  },
);

AttendanceBonusPolicy.addHook(
  'beforeUpdate',
  (attendanceBonusPolicy, options) => {
    attendanceBonusPolicy.updateBy = options.user.userMasterId;
    attendanceBonusPolicy.ipAddress = options.user.userIpAddress;
    attendanceBonusPolicy.updateByIp = options.user.userIpAddress;
  },
);

AttendanceBonusPolicy.addHook(
  'beforeDestroy',
  (attendanceBonusPolicy, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    attendanceBonusPolicy.deleteBy = options.user.userMasterId;
    attendanceBonusPolicy.deleteByIp = options.user.userIpAddress;
  },
);

AttendanceBonusPolicy.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

AttendanceBonusPolicy.belongsTo(UserMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

AttendanceBonusPolicy.belongsTo(UserMaster, {
  as: 'deletedByUserDetails',
  foreignKey: { name: 'deleteBy' },
});
module.exports = AttendanceBonusPolicy;
