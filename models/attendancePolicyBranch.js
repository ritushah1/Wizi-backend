const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const AttendancePolicy = require('./attendancePolicy');
const Branch = require('./branchMaster');
const table_name = 'attendancePolicyBranch';

const AttendancePolicyBranch = sequelize.define(
  table_name,
  {
    attendancePolicyBranchID: {
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
    branchMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Branch Is Required!!!' },
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

AttendancePolicyBranch.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

AttendancePolicyBranch.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

AttendancePolicyBranch.addHook('beforeDestroy', async (item, options) => {
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
AttendancePolicyBranch.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
AttendancePolicyBranch.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
AttendancePolicyBranch.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await AttendancePolicyBranch.update(
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

AttendancePolicyBranch.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

AttendancePolicyBranch.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

AttendancePolicyBranch.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

AttendancePolicyBranch.belongsTo(Branch, {
  foreignKey: { name: 'branchMasterID' },
});

AttendancePolicyBranch.belongsTo(AttendancePolicy, {
  foreignKey: { name: 'attendancePolicyID' },
});

AttendancePolicy.hasMany(AttendancePolicyBranch, {
  as: 'ap_branch',
  foreignKey: { name: 'attendancePolicyID' },
});
module.exports = AttendancePolicyBranch;
