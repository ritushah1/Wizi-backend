const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const HRSalaryFields = require('./hrSalaryFields');
const UserMaster = require('./userMaster');
const { PayrollStatutoryAdjustModeEnum } = require('../utils/dbUtils');
const table_name = 'payrollStatutoryConfiguration';
const PayrollStatutoryConfiguration = sequelize.define(table_name, {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  isPayrollStatutory:{
type:Sequelize.BOOLEAN,
allowNull:false,
defaultValue:false
  },
  adjustSalaryFieldId: {
    type: Sequelize.INTEGER,
  },
   adjustMode: {
    type: Sequelize.ENUM(...Object.values(PayrollStatutoryAdjustModeEnum)),
  },
  companyMasterId: {
    type: Sequelize.INTEGER,
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
    type: Sequelize.BIGINT,
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
 
},{
    paranoid:true
});

PayrollStatutoryConfiguration.addHook('beforeCreate', (data, options) => {
    // Set createBy, ipAddress based on the authenticated user
    data.createBy = options.user.userMasterId;
    data.createByIp = options.user.userIpAddress;
   
});

PayrollStatutoryConfiguration.addHook('beforeUpdate', (data, options) => {
    // Set updateBy and ipAddress based on the authenticated user
    data.updateBy = options.user.userMasterId;
    data.updateByIp = options.user.userIpAddress;
});

PayrollStatutoryConfiguration.addHook('beforeDestroy', (data, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    data.deleteBy = options.user.userMasterId;
    data.deleteByIp = options.user.userIpAddress;
});

PayrollStatutoryConfiguration.belongsTo(companyMaster, {
    foreignKey: { name: 'companyMasterId' },
});

companyMaster.hasMany(PayrollStatutoryConfiguration, {
  as:'PSC',
  foreignKey: { name: 'companyMasterId' },
});

PayrollStatutoryConfiguration.belongsTo(HRSalaryFields, {
    as:'AHSF',
    foreignKey: { name: 'adjustSalaryFieldId' },
});

PayrollStatutoryConfiguration.belongsTo(UserMaster, {
    as:'createdBy',
    foreignKey: { name: 'createBy' },
});

PayrollStatutoryConfiguration.belongsTo(UserMaster, {
    as:'updatedBy',
    foreignKey: { name: 'updateBy' },
});
PayrollStatutoryConfiguration.belongsTo(UserMaster, {
    as:'deletedBy',
    foreignKey: { name: 'deleteBy' },
});

module.exports = PayrollStatutoryConfiguration;
