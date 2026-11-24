const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const AttendancePolicy = require('./attendancePolicy');
const Department = require('./department');
const table_name = 'attendancePolicyDepartment';

const AttendancePolicyDepartment = sequelize.define(
  table_name,
  {
    attendancePolicyDepartmentID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    attendancePolicyID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Attendance Policy Is Required!!!' },
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
    indexes: [
      {
        unique: false,
        fields: ['attendancePolicyID'],
      },
    ],
  },
);

AttendancePolicyDepartment.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

AttendancePolicyDepartment.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

AttendancePolicyDepartment.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});
// 🔹 BULK CREATE
AttendancePolicyDepartment.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
AttendancePolicyDepartment.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
AttendancePolicyDepartment.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await AttendancePolicyDepartment.update(
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
});

AttendancePolicyDepartment.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

AttendancePolicyDepartment.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

AttendancePolicyDepartment.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

AttendancePolicyDepartment.belongsTo(Department, {
  foreignKey: { name: 'departmentId' },
});

AttendancePolicyDepartment.belongsTo(AttendancePolicy, {
  foreignKey: { name: 'attendancePolicyID' },
});

AttendancePolicy.hasMany(AttendancePolicyDepartment, {
  as: 'ap_dept',
  foreignKey: { name: 'attendancePolicyID' },
});
module.exports = AttendancePolicyDepartment;
