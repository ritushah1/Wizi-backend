const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'timezone';

const Timezone = sequelize.define(
  table_name,
  {
    timezoneID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

    timezone: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: 'Timezone is required' },
        notEmpty: { msg: 'Timezone cannot be empty' },
      },
      // Example: 'America/New_York'
    },

    timezoneOffset: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: 'Timezone offset is required' },
        notEmpty: { msg: 'Timezone offset cannot be empty' },
      },
      // Example: '-05:00'
    },

    timezoneName: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: 'Timezone name is required' },
        notEmpty: { msg: 'Timezone name cannot be empty' },
      },
      // Example: 'Eastern Standard Time'
    },

    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '0 = Inactive, 1 = Active',
    },

    createBy: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    updateBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    updateByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    deletedBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deletedByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    // ✅ Removed manual deletedAt — paranoid: true handles it automatically
  },
  {
    timestamps: true,       // Adds createdAt, updatedAt automatically
    paranoid: true,         // Adds deletedAt automatically for soft delete
    tableName: table_name,
    indexes: [
      { fields: ['timezone'] },     
    ],
  }
);


// ✅ beforeCreate — set createBy, createByIp, updateBy, updateByIp
Timezone.addHook('beforeCreate', (instance, options) => {
  if (options.user) {
    instance.createBy    = options.user.userMasterId;
    instance.createByIp  = options.user.userIpAddress;
    instance.updateBy    = options.user.userMasterId;
    instance.updateByIp  = options.user.userIpAddress;
  }
});


// ✅ beforeUpdate — set updateBy, updateByIp
Timezone.addHook('beforeUpdate', (instance, options) => {
  if (options.user) {
    instance.updateBy   = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});


// ✅ beforeDestroy — set deletedBy, deletedByIp and save before soft delete
Timezone.addHook('beforeDestroy', async (instance, options) => {
  if (options.user) {
    instance.deletedBy   = options.user.userMasterId;
    instance.deletedByIp = options.user.userIpAddress;

    // ✅ Manually save deletedBy & deletedByIp before paranoid sets deletedAt
    await instance.save({ hooks: false });
  }
});

module.exports = Timezone;