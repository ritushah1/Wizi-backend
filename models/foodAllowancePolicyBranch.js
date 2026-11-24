const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const FoodAllowancePolicy = require('./foodAllowancePolicy');
const Branch = require('./branchMaster');
const table_name = 'foodAllowancePolicyBranch';

const FoodAllowancePolicyBranch = sequelize.define(
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
        fields: ['foodAllowancePolicyID'],
      },
      {
        unique: false,
        fields: ['foodAllowancePolicyID', 'branchMasterID'],
      },
    ],
  },
);

FoodAllowancePolicyBranch.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

FoodAllowancePolicyBranch.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

FoodAllowancePolicyBranch.addHook('beforeDestroy', async (item, options) => {
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
FoodAllowancePolicyBranch.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
FoodAllowancePolicyBranch.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
FoodAllowancePolicyBranch.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await FoodAllowancePolicyBranch.update(
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

FoodAllowancePolicyBranch.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

FoodAllowancePolicyBranch.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

FoodAllowancePolicyBranch.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

FoodAllowancePolicyBranch.belongsTo(Branch, {
  foreignKey: { name: 'branchMasterID' },
});

FoodAllowancePolicyBranch.belongsTo(FoodAllowancePolicy, {
  foreignKey: { name: 'foodAllowancePolicyID' },
});

FoodAllowancePolicy.hasMany(FoodAllowancePolicyBranch, {
  as: 'ap_branch',
  foreignKey: { name: 'foodAllowancePolicyID' },
});
module.exports = FoodAllowancePolicyBranch;
