const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'salarySlipFormat';

const SalarySlipFormat = sequelize.define(
  table_name,
  {
    salarySlipFormatID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    salarySlipFormatName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    salarySlipPath: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    thumbnailPath: {
      type: Sequelize.TEXT,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    updateBy: {
      type: Sequelize.BIGINT,
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

SalarySlipFormat.addHook('beforeCreate', (salarySlipFormat, options) => {
  salarySlipFormat.createBy = options.user.userMasterId;
  salarySlipFormat.createByIp = options.user.userIpAddress;
});

SalarySlipFormat.addHook('beforeUpdate', (salarySlipFormat, options) => {
  salarySlipFormat.updateBy = options.user.userMasterId;
  salarySlipFormat.updateByIp = options.user.userIpAddress;
});

SalarySlipFormat.addHook('beforeDestroy', (salarySlipFormat, options) => {
  salarySlipFormat.deleteBy = options.user.userMasterId;
  salarySlipFormat.deleteByIp = options.user.userIpAddress;
});

SalarySlipFormat.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

SalarySlipFormat.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

SalarySlipFormat.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

module.exports = SalarySlipFormat;
