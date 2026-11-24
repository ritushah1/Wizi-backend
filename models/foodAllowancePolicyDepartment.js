const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const FoodAllowancePolicy = require('./foodAllowancePolicy');
const Department = require('./department');
const table_name = 'foodAllowancePolicyDepartment';

const FoodAllowancePolicyDepartment = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    foodAllowancePolicyID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Food Allowance Policy Is Required!!!' },
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
        fields: ['foodAllowancePolicyID'],
      },
      {
        unique: false,
        fields: ['foodAllowancePolicyID', 'departmentId'],
      },
    ],
  },
);

FoodAllowancePolicyDepartment.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

FoodAllowancePolicyDepartment.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

FoodAllowancePolicyDepartment.addHook(
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
FoodAllowancePolicyDepartment.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
FoodAllowancePolicyDepartment.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
FoodAllowancePolicyDepartment.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await FoodAllowancePolicyDepartment.update(
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

FoodAllowancePolicyDepartment.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

FoodAllowancePolicyDepartment.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

FoodAllowancePolicyDepartment.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

FoodAllowancePolicyDepartment.belongsTo(Department, {
  foreignKey: { name: 'departmentId' },
});

FoodAllowancePolicyDepartment.belongsTo(FoodAllowancePolicy, {
  foreignKey: { name: 'foodAllowancePolicyID' },
});

FoodAllowancePolicy.hasMany(FoodAllowancePolicyDepartment, {
  as: 'ap_dept',
  foreignKey: { name: 'foodAllowancePolicyID' },
});

module.exports = FoodAllowancePolicyDepartment;
