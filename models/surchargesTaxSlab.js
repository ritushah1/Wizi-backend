const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const incomeTaxSlabMaster = require('./incomeTaxSlabMaster');

const SurchargesTaxSlab = sequelize.define(
  'surchargesTaxSlab',
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

    fromAmount: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notNull: { msg: 'From amount is required' },
        min: {
          args: [0],
          msg: 'From amount cannot be negative',
        },
      },
    },

    toAmount: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        min: 0,
        isGreaterThanFrom(value) {
          if (+value <= +this.fromAmount) {
            throw new Error('To amount must be greater than from amount');
          }
        },
      },
    },

    percentage: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'Percentage is required' },
        min: {
          args: [0],
          msg: 'Percentage cannot be negative',
        },
      },
    },

    incomeTaxSlabMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notNull: { msg: 'Income tax slab ID is required' },
        min: {
          args: [0],
          msg: 'Income tax slab ID cannot be negative',
        },
      },
    },

    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },

    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    updateBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },

    updateByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    deleteBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },

    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  { paranoid: true },
);

SurchargesTaxSlab.belongsTo(incomeTaxSlabMaster, {
  foreignKey: { name: 'incomeTaxSlabMasterID' },
});

SurchargesTaxSlab.addHook('beforeCreate', (slabs, options) => {
  // Set createBy and ipAddress based on the authenticated user
  slabs.createBy = options.user.userMasterId;
  slabs.createByIp = options.user.userIpAddress;
});

SurchargesTaxSlab.addHook('beforeUpdate', (slabs, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  slabs.updateBy = options.user.userMasterId;
  slabs.updateByIp = options.user.userIpAddress;
});

SurchargesTaxSlab.addHook('beforeDestroy', (slabs, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  slabs.deleteBy = options.user.userMasterId;
  slabs.deleteByIp = options.user.userIpAddress;
});

module.exports = SurchargesTaxSlab;
