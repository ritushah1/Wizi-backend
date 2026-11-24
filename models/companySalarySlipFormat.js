const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const companyMaster = require('./companyMaster');
const SalarySlipFormat = require('./salarySlipFormat');
const table_name = 'companySalarySlipFormat';

const CompanySalarySlipFormat = sequelize.define(
  table_name,
  {
    companySalarySlipFormatID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    salarySlipFormatID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    companyMasterID: {
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

CompanySalarySlipFormat.addHook(
  'beforeCreate',
  (companySalarySlipFormat, options) => {
    companySalarySlipFormat.createBy = options.user.userMasterId;
    companySalarySlipFormat.createByIp = options.user.userIpAddress;
  }
);

CompanySalarySlipFormat.addHook(
  'beforeUpdate',
  (companySalarySlipFormat, options) => {
    companySalarySlipFormat.updateBy = options.user.userMasterId;
    companySalarySlipFormat.updateByIp = options.user.userIpAddress;
  }
);

CompanySalarySlipFormat.addHook(
  'beforeDestroy',
  (companySalarySlipFormat, options) => {
    companySalarySlipFormat.deleteBy = options.user.userMasterId;
    companySalarySlipFormat.deleteByIp = options.user.userIpAddress;
  }
);

CompanySalarySlipFormat.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

CompanySalarySlipFormat.belongsTo(SalarySlipFormat, {
  foreignKey: { name: 'salarySlipFormatID' },
});

CompanySalarySlipFormat.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

CompanySalarySlipFormat.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

CompanySalarySlipFormat.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

module.exports = CompanySalarySlipFormat;
