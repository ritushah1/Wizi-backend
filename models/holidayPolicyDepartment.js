const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const HolidayPolicy = require('./holidayPolicy');
const Department = require('./department');
const table_name = 'holidayPolicyDepartment';

const HolidayPolicyDepartment = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    holidayPolicyID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Holiday Policy Is Required!!!' },
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
        fields: ['holidayPolicyID'],
      },
      {
        unique: false,
        fields: ['holidayPolicyID', 'departmentId'],
      },
    ],
  },
);

HolidayPolicyDepartment.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

HolidayPolicyDepartment.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

HolidayPolicyDepartment.addHook('beforeDestroy', async (item, options) => {
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
HolidayPolicyDepartment.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
HolidayPolicyDepartment.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
HolidayPolicyDepartment.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await HolidayPolicyDepartment.update(
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

HolidayPolicyDepartment.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

HolidayPolicyDepartment.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

HolidayPolicyDepartment.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

HolidayPolicyDepartment.belongsTo(Department, {
  foreignKey: { name: 'departmentId' },
});

HolidayPolicyDepartment.belongsTo(HolidayPolicy, {
  foreignKey: { name: 'holidayPolicyID' },
});

HolidayPolicy.hasMany(HolidayPolicyDepartment, {
  as: 'ap_dept',
  foreignKey: { name: 'holidayPolicyID' },
});

module.exports = HolidayPolicyDepartment;
