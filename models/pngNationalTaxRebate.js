const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { PNGTaxSlabTypeEnum } = require('../utils/dbUtils');

const PNGNationalTaxRebate = sequelize.define(
  'pngNationalTaxRebate',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    applicableYYYYMM: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM(...Object.values(PNGTaxSlabTypeEnum)),
      allowNull: true,
    },
    taxDependant0: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    taxDependant1: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    taxDependant2: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    taxDependant3: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.INTEGER,
    },
    updateBy: {
      type: Sequelize.INTEGER,
    },
    deleteBy: {
      type: Sequelize.INTEGER,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  },
);

PNGNationalTaxRebate.addHook(
  'beforeCreate',
  (PNGNationalTaxRebate, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    PNGNationalTaxRebate.createBy = options.user.userMasterId;
    PNGNationalTaxRebate.createByIp = options.user.userIpAddress;
  },
);

PNGNationalTaxRebate.addHook(
  'beforeUpdate',
  (PNGNationalTaxRebate, options) => {
    // Set updateBy and ipAddress based on the authenticated user
    PNGNationalTaxRebate.updateBy = options.user.userMasterId;
    PNGNationalTaxRebate.updateByIp = options.user.userIpAddress;
  },
);

PNGNationalTaxRebate.addHook(
  'beforeDestroy',
  (PNGNationalTaxRebate, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    PNGNationalTaxRebate.deleteBy = options.user.userMasterId;
    PNGNationalTaxRebate.deleteByIp = options.user.userIpAddress;
  },
);

module.exports = PNGNationalTaxRebate;
