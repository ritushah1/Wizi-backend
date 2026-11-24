const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const EmployeeLeavePolicy = require('./employeeLeavePolicy');
const Branch = require('./branchMaster');
const table_name = 'employeeLeavePolicyBranch';

const EmployeeLeavePolicyBranch = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    employeeLeavePolicyID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Leave Policy Is Required!!!' },
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
        fields: ['employeeLeavePolicyID'],
      },
      {
        unique: false,
        fields: ['employeeLeavePolicyID', 'branchMasterID'],
      },
    ],
  },
);

EmployeeLeavePolicyBranch.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

EmployeeLeavePolicyBranch.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

EmployeeLeavePolicyBranch.addHook('beforeDestroy', async (item, options) => {
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
EmployeeLeavePolicyBranch.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
EmployeeLeavePolicyBranch.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
EmployeeLeavePolicyBranch.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await EmployeeLeavePolicyBranch.update(
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

EmployeeLeavePolicyBranch.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

EmployeeLeavePolicyBranch.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

EmployeeLeavePolicyBranch.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

EmployeeLeavePolicyBranch.belongsTo(Branch, {
  foreignKey: { name: 'branchMasterID' },
});

EmployeeLeavePolicyBranch.belongsTo(EmployeeLeavePolicy, {
  foreignKey: { name: 'employeeLeavePolicyID' },
});

EmployeeLeavePolicy.hasMany(EmployeeLeavePolicyBranch, {
  as: 'ap_branch',
  foreignKey: { name: 'employeeLeavePolicyID' },
});

module.exports = EmployeeLeavePolicyBranch;
