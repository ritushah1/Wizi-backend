const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const EmployeeLeavePolicy = require('./employeeLeavePolicy');
const Department = require('./department');
const table_name = 'employeeLeavePolicyDepartment';

const EmployeeLeavePolicyDepartment = sequelize.define(
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
        fields: ['employeeLeavePolicyID'],
      },
      {
        unique: false,
        fields: ['employeeLeavePolicyID', 'departmentId'],
      },
    ],
  },
);

EmployeeLeavePolicyDepartment.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

EmployeeLeavePolicyDepartment.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

EmployeeLeavePolicyDepartment.addHook(
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
EmployeeLeavePolicyDepartment.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
EmployeeLeavePolicyDepartment.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
EmployeeLeavePolicyDepartment.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await EmployeeLeavePolicyDepartment.update(
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

EmployeeLeavePolicyDepartment.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

EmployeeLeavePolicyDepartment.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

EmployeeLeavePolicyDepartment.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

EmployeeLeavePolicyDepartment.belongsTo(Department, {
  foreignKey: { name: 'departmentId' },
});

EmployeeLeavePolicyDepartment.belongsTo(EmployeeLeavePolicy, {
  foreignKey: { name: 'employeeLeavePolicyID' },
});

EmployeeLeavePolicy.hasMany(EmployeeLeavePolicyDepartment, {
  as: 'ap_dept',
  foreignKey: { name: 'employeeLeavePolicyID' },
});

module.exports = EmployeeLeavePolicyDepartment;
