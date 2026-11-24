const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const table_name = 'salaryRegisterFormat';
const SalaryRegisterFormat = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    fields: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
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

SalaryRegisterFormat.addHook(
  'beforeCreate',
  (SalaryRegisterFormat, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    SalaryRegisterFormat.createBy = options.user.userMasterId;
    SalaryRegisterFormat.createByIp = options.user.userIpAddress;
  }
);

SalaryRegisterFormat.addHook(
  'beforeUpdate',
  (SalaryRegisterFormat, options) => {
    SalaryRegisterFormat.updateBy = options.user.userMasterId;
    SalaryRegisterFormat.updateByIp = options.user.userIpAddress;
  }
);

SalaryRegisterFormat.addHook(
  'beforeDestroy',
  (SalaryRegisterFormat, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    SalaryRegisterFormat.deleteBy = options.user.userMasterId;
    SalaryRegisterFormat.deleteByIp = options.user.userIpAddress;
  }
);

SalaryRegisterFormat.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});


module.exports = SalaryRegisterFormat;
