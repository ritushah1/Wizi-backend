const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const EmployeeLeavePolicy = require('./employeeLeavePolicy');
const Designation = require('./designation');
const table_name = 'employeeLeavePolicyDesignation';

const EmployeeLeavePolicyDesignation = sequelize.define(
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
        fields: ['employeeLeavePolicyID'],
      },
      {
        unique: false,
        fields: ['employeeLeavePolicyID', 'designationId'],
      },
    ],
  },
);

EmployeeLeavePolicyDesignation.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

EmployeeLeavePolicyDesignation.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

EmployeeLeavePolicyDesignation.addHook(
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
EmployeeLeavePolicyDesignation.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
EmployeeLeavePolicyDesignation.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
EmployeeLeavePolicyDesignation.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await EmployeeLeavePolicyDesignation.update(
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

EmployeeLeavePolicyDesignation.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

EmployeeLeavePolicyDesignation.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

EmployeeLeavePolicyDesignation.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

EmployeeLeavePolicyDesignation.belongsTo(Designation, {
  foreignKey: { name: 'designationId' },
});

EmployeeLeavePolicyDesignation.belongsTo(EmployeeLeavePolicy, {
  foreignKey: { name: 'employeeLeavePolicyID' },
});

EmployeeLeavePolicy.hasMany(EmployeeLeavePolicyDesignation, {
  as: 'ap_design',
  foreignKey: { name: 'employeeLeavePolicyID' },
});

module.exports = EmployeeLeavePolicyDesignation;
