const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const WeekOffPolicy = require('./weekOffPolicy');
const Branch = require('./branchMaster');
const table_name = 'weekoffPolicyBranch';

const WeekoffPolicyBranch = sequelize.define(
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
        notEmpty: { msg: 'WeekfOff Policy Is Required!!!' },
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
        fields: ['weekOffPolicyID'],
      },
      {
        unique: false,
        fields: ['weekOffPolicyID', 'branchMasterID'],
      },
    ],
  },
);

WeekoffPolicyBranch.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

WeekoffPolicyBranch.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

WeekoffPolicyBranch.addHook('beforeDestroy', async (item, options) => {
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
WeekoffPolicyBranch.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
WeekoffPolicyBranch.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
WeekoffPolicyBranch.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await WeekoffPolicyBranch.update(
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

WeekoffPolicyBranch.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

WeekoffPolicyBranch.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

WeekoffPolicyBranch.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

WeekoffPolicyBranch.belongsTo(Branch, {
  foreignKey: { name: 'branchMasterID' },
});

WeekoffPolicyBranch.belongsTo(WeekOffPolicy, {
  foreignKey: { name: 'weekOffPolicyID' },
});

WeekOffPolicy.hasMany(WeekoffPolicyBranch, {
  as: 'ap_branch',
  foreignKey: { name: 'weekOffPolicyID' },
});
module.exports = WeekoffPolicyBranch;
