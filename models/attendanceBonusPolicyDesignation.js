const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const AttendanceBonusPolicy = require('./attendanceBonusPolicy');
const Designation = require('./designation');
const table_name = 'attendanceBonusPolicyDesignation';

const AttendanceBonusPolicyDesignation = sequelize.define(
  table_name,
  {
    attendanceBonusPolicyDesignationID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    attendanceBonusPolicyId: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Attendance Bonus Policy Is Required!!!' },
      },
    },
    designationId: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Designation Is Required!!!' },
      },
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateBy: {
      type: Sequelize.BIGINT,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteBy: {
      type: Sequelize.INTEGER,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  },
);

AttendanceBonusPolicyDesignation.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

AttendanceBonusPolicyDesignation.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

AttendanceBonusPolicyDesignation.addHook(
  'beforeDestroy',
  async (item, options) => {
    if (options.user) {
      item.deleteBy = options.user.userMasterId;
      item.deleteByIp = options.user.userIpAddress;

      await item.save({
        hooks: false,
        transaction: options.transaction,
      });
    }
  },
);
// 🔹 BULK CREATE
AttendanceBonusPolicyDesignation.addHook(
  'beforeBulkCreate',
  (items, options) => {
    if (options.user) {
      for (const item of items) {
        item.createBy = options.user.userMasterId;
        item.createByIp = options.user.userIpAddress;
      }
    }
  },
);

// 🔹 BULK UPDATE
AttendanceBonusPolicyDesignation.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
AttendanceBonusPolicyDesignation.addHook(
  'beforeBulkDestroy',
  async (options) => {
    if (options.user) {
      await AttendanceBonusPolicyDesignation.update(
        {
          deleteBy: options.user.userMasterId,
          deleteByIp: options.user.userIpAddress,
        },
        {
          where: options.where,
          transaction: options.transaction,
          hooks: false,
        },
      );
    }
  },
);

AttendanceBonusPolicyDesignation.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

AttendanceBonusPolicyDesignation.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

AttendanceBonusPolicyDesignation.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

AttendanceBonusPolicyDesignation.belongsTo(Designation, {
  foreignKey: { name: 'designationId' },
});

AttendanceBonusPolicyDesignation.belongsTo(AttendanceBonusPolicy, {
  foreignKey: { name: 'attendanceBonusPolicyId' },
});

AttendanceBonusPolicy.hasMany(AttendanceBonusPolicyDesignation, {
  as: 'ap_bonus_design',
  foreignKey: { name: 'attendanceBonusPolicyId' },
});
module.exports = AttendanceBonusPolicyDesignation;
