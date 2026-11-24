const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const AttendancePolicy = require('./attendancePolicy');
const Designation = require('./designation');
const table_name = 'attendancePolicyDesignation';

const AttendancePolicyDesignation = sequelize.define(
  table_name,
  {
    attendancePolicyDesignationID: {
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
    indexes: [
      {
        unique: false,
        fields: ['attendancePolicyID'],
      },
    ],
  },
);

AttendancePolicyDesignation.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

AttendancePolicyDesignation.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

AttendancePolicyDesignation.addHook('beforeDestroy', async (item, options) => {
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
AttendancePolicyDesignation.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
AttendancePolicyDesignation.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
AttendancePolicyDesignation.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await AttendancePolicyDesignation.update(
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

AttendancePolicyDesignation.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

AttendancePolicyDesignation.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

AttendancePolicyDesignation.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

AttendancePolicyDesignation.belongsTo(Designation, {
  foreignKey: { name: 'designationId' },
});

AttendancePolicyDesignation.belongsTo(AttendancePolicy, {
  foreignKey: { name: 'attendancePolicyID' },
});

AttendancePolicy.hasMany(AttendancePolicyDesignation, {
  as: 'ap_design',
  foreignKey: { name: 'attendancePolicyID' },
});
module.exports = AttendancePolicyDesignation;
