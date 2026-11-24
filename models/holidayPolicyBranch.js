const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const HolidayPolicy = require('./holidayPolicy');
const Branch = require('./branchMaster');
const table_name = 'holidayPolicyBranch';

const HolidayPolicyBranch = sequelize.define(
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
        fields: ['holidayPolicyID'],
      },
      {
        unique: false,
        fields: ['holidayPolicyID', 'branchMasterID'],
      },
    ],
  },
);

HolidayPolicyBranch.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

HolidayPolicyBranch.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

HolidayPolicyBranch.addHook('beforeDestroy', async (item, options) => {
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
HolidayPolicyBranch.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
HolidayPolicyBranch.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
HolidayPolicyBranch.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await HolidayPolicyBranch.update(
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

HolidayPolicyBranch.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

HolidayPolicyBranch.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

HolidayPolicyBranch.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

HolidayPolicyBranch.belongsTo(Branch, {
  foreignKey: { name: 'branchMasterID' },
});

HolidayPolicyBranch.belongsTo(HolidayPolicy, {
  foreignKey: { name: 'holidayPolicyID' },
});

HolidayPolicy.hasMany(HolidayPolicyBranch, {
  as: 'ap_branch',
  foreignKey: { name: 'holidayPolicyID' },
});

module.exports = HolidayPolicyBranch;
