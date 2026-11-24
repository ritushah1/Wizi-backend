const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const WeekOffPolicy = require('./weekOffPolicy');
const Department = require('./department');
const table_name = 'weekoffPolicyDepartment';

const WeekoffPolicyDepartment = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    weekOffPolicyID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Weekoff Policy Is Required!!!' },
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
        fields: ['weekOffPolicyID'],
      },
      {
        unique: false,
        fields: ['weekOffPolicyID', 'departmentId'],
      },
    ],
  },
);

WeekoffPolicyDepartment.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

WeekoffPolicyDepartment.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

WeekoffPolicyDepartment.addHook('beforeDestroy', async (item, options) => {
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
WeekoffPolicyDepartment.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
WeekoffPolicyDepartment.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
WeekoffPolicyDepartment.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await WeekoffPolicyDepartment.update(
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

WeekoffPolicyDepartment.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

WeekoffPolicyDepartment.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

WeekoffPolicyDepartment.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

WeekoffPolicyDepartment.belongsTo(Department, {
  foreignKey: { name: 'departmentId' },
});

WeekoffPolicyDepartment.belongsTo(WeekOffPolicy, {
  foreignKey: { name: 'weekOffPolicyID' },
});

WeekOffPolicy.hasMany(WeekoffPolicyDepartment, {
  as: 'ap_dept',
  foreignKey: { name: 'weekOffPolicyID' },
});

module.exports = WeekoffPolicyDepartment;
