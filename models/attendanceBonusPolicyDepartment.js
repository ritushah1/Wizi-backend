const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const AttendanceBonusPolicy = require('./attendanceBonusPolicy');
const Department = require('./department');
const table_name = 'attendanceBonusPolicyDepartment';

const AttendanceBonusPolicyDepartment = sequelize.define(
  table_name,
  {
    attendancePolicyDepartmentID: {
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
    departmentId: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Department Is Required!!!' },
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

AttendanceBonusPolicyDepartment.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

AttendanceBonusPolicyDepartment.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

AttendanceBonusPolicyDepartment.addHook(
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
AttendanceBonusPolicyDepartment.addHook(
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
AttendanceBonusPolicyDepartment.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
AttendanceBonusPolicyDepartment.addHook(
  'beforeBulkDestroy',
  async (options) => {
    if (options.user) {
      await AttendanceBonusPolicyDepartment.update(
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

AttendanceBonusPolicyDepartment.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

AttendanceBonusPolicyDepartment.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

AttendanceBonusPolicyDepartment.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

AttendanceBonusPolicyDepartment.belongsTo(Department, {
  foreignKey: { name: 'departmentId' },
});

AttendanceBonusPolicyDepartment.belongsTo(AttendanceBonusPolicy, {
  foreignKey: { name: 'attendanceBonusPolicyId' },
});

AttendanceBonusPolicy.hasMany(AttendanceBonusPolicyDepartment, {
  as: 'ap_bonus_dept',
  foreignKey: { name: 'attendanceBonusPolicyId' },
});
module.exports = AttendanceBonusPolicyDepartment;
