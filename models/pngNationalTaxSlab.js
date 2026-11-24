/** @format */

const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { PNGTaxSlabTypeEnum } = require('../utils/dbUtils');

const PngNationalTaxSlab = sequelize.define(
  'pngNationalTaxSlab',
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
    exceeding: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    notExceeding: {
      type: Sequelize.FLOAT,
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
  }
);

PngNationalTaxSlab.addHook('beforeCreate', (PngNationalTaxSlab, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  PngNationalTaxSlab.createBy = options.user.userMasterId;
  PngNationalTaxSlab.createByIp = options.user.userIpAddress;
});

PngNationalTaxSlab.addHook('beforeUpdate', (PngNationalTaxSlab, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  PngNationalTaxSlab.updateBy = options.user.userMasterId;
  PngNationalTaxSlab.updateByIp = options.user.userIpAddress;
});

PngNationalTaxSlab.addHook('beforeDestroy', (PngNationalTaxSlab, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  PngNationalTaxSlab.deleteBy = options.user.userMasterId;
  PngNationalTaxSlab.deleteByIp = options.user.userIpAddress;
});

module.exports = PngNationalTaxSlab;
