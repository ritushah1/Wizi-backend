const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const FoodAllowancePolicy = require('./foodAllowancePolicy');
const Designation = require('./designation');
const table_name = 'foodAllowancePolicyDesignation';

const FoodAllowancePolicyDesignation = sequelize.define(
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
        notEmpty: { msg: 'Salary Policy Is Required!!!' },
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
        fields: ['foodAllowancePolicyID'],
      },
      {
        unique: false,
        fields: ['foodAllowancePolicyID', 'designationId'],
      },
    ],
  },
);

FoodAllowancePolicyDesignation.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

FoodAllowancePolicyDesignation.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

FoodAllowancePolicyDesignation.addHook(
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
FoodAllowancePolicyDesignation.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
FoodAllowancePolicyDesignation.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
FoodAllowancePolicyDesignation.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await FoodAllowancePolicyDesignation.update(
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

FoodAllowancePolicyDesignation.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

FoodAllowancePolicyDesignation.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

FoodAllowancePolicyDesignation.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

FoodAllowancePolicyDesignation.belongsTo(Designation, {
  foreignKey: { name: 'designationId' },
});

FoodAllowancePolicyDesignation.belongsTo(FoodAllowancePolicy, {
  foreignKey: { name: 'foodAllowancePolicyID' },
});

FoodAllowancePolicy.hasMany(FoodAllowancePolicyDesignation, {
  as: 'ap_design',
  foreignKey: { name: 'foodAllowancePolicyID' },
});

module.exports = FoodAllowancePolicyDesignation;
