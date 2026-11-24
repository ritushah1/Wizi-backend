/** @format */

const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const incomeTaxSlabMaster = require('./incomeTaxSlabMaster');
const { PNGYTDTaxSlabTypeEnum } = require('../utils/dbUtils');

const YTDIncomeTaxSlab = sequelize.define(
  'YTDIncomeTaxSlab',
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    fromAmount: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    toAmount: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM(...Object.values(PNGYTDTaxSlabTypeEnum)),
      allowNull: true,
    },
    value: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    incomeTaxSlabMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
      type: Sequelize.BIGINT,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  { paranoid: true }
);

YTDIncomeTaxSlab.belongsTo(incomeTaxSlabMaster, {
  foreignKey: { name: 'incomeTaxSlabMasterID' },
});

YTDIncomeTaxSlab.addHook('beforeCreate', (YTDIncomeTaxSlab, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  YTDIncomeTaxSlab.createBy = options.user.userMasterId;
  YTDIncomeTaxSlab.createByIp = options.user.userIpAddress;
});

YTDIncomeTaxSlab.addHook('beforeUpdate', (YTDIncomeTaxSlab, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  YTDIncomeTaxSlab.updateBy = options.user.userMasterId;
  YTDIncomeTaxSlab.updateByIp = options.user.userIpAddress;
});

YTDIncomeTaxSlab.addHook('beforeDestroy', (YTDIncomeTaxSlab, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  YTDIncomeTaxSlab.deleteBy = options.user.userMasterId;
  YTDIncomeTaxSlab.deleteByIp = options.user.userIpAddress;
});

module.exports = YTDIncomeTaxSlab;
