const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const WeekOffPolicy = require('./weekOffPolicy');
const Designation = require('./designation');
const table_name = 'weekoffPolicyDesignation';

const WeekoffPolicyDesignation = sequelize.define(
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
        fields: ['weekOffPolicyID'],
      },
      {
        unique: false,
        fields: ['weekOffPolicyID', 'designationId'],
      },
    ],
  },
);

WeekoffPolicyDesignation.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

WeekoffPolicyDesignation.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

WeekoffPolicyDesignation.addHook('beforeDestroy', async (item, options) => {
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
WeekoffPolicyDesignation.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
WeekoffPolicyDesignation.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
WeekoffPolicyDesignation.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await WeekoffPolicyDesignation.update(
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

WeekoffPolicyDesignation.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

WeekoffPolicyDesignation.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

WeekoffPolicyDesignation.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

WeekoffPolicyDesignation.belongsTo(Designation, {
  foreignKey: { name: 'designationId' },
});

WeekoffPolicyDesignation.belongsTo(WeekOffPolicy, {
  foreignKey: { name: 'weekOffPolicyID' },
});

WeekOffPolicy.hasMany(WeekoffPolicyDesignation, {
  as: 'ap_design',
  foreignKey: { name: 'weekOffPolicyID' },
});

module.exports = WeekoffPolicyDesignation;
