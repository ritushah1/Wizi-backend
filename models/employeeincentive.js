const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const Incentivetype = require('./incentivetype');
const UserMaster = require('../models/userMaster');
const HRSalaryTrasaction = require('./hrSalaryTransaction');
const PayrollStatutorySalaryTrans = require('./payrollStatutorySalaryTrans');
const { incentivePayModeEnum } = require('../utils/dbUtils');
const table_name = 'employeeincentive';
const Employeeincentive = sequelize.define(table_name, {
  employeeincentiveID: {
    type: Sequelize.BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  userMasterID: {
    type: Sequelize.BIGINT,
    allowNull: false,
  },
  yearmonth: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  amount: {
    type: Sequelize.FLOAT,
    allowNull: true,
  },
  IncentivetypeID: {
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  description: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  status: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  createBy: {
    type: Sequelize.BIGINT,
    allowNull: false,
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
  incentivetypename: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  ReferenceId: {
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  TableName: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  incentiveDate: {
    type: Sequelize.DATEONLY,
    allowNull: true,
  },
  from:{
      type: Sequelize.STRING,
  },
  ps_salaryTransId:{
    type:Sequelize.BIGINT
  },
  payInFNF:{
    type:Sequelize.BOOLEAN,
    defaultValue:false
  },
   payModeInFNF: {
    type: Sequelize.ENUM(...Object.values(incentivePayModeEnum)),
    allowNull: true,
  },
},{
  indexes:[
    {
      unique:false,
      fields:['userMasterID','incentiveDate']
    }
  ]
});

Employeeincentive.belongsTo(UserMaster, {
  foreignKey: { name: 'userMasterID' },
});
Employeeincentive.belongsTo(Incentivetype, {
  foreignKey: { name: 'IncentivetypeID' },
});

Employeeincentive.belongsTo(Incentivetype, {
  as: 'IncType',
  foreignKey: { name: 'IncentivetypeID' },
});

Employeeincentive.belongsTo(HRSalaryTrasaction, {
  foreignKey: { name: 'ReferenceId' },
});

HRSalaryTrasaction.hasMany(Employeeincentive, {
  foreignKey: { name: 'ReferenceId' },
});


Employeeincentive.belongsTo(PayrollStatutorySalaryTrans, {
  as:'PST',
  foreignKey: { name: 'ps_salaryTransId' },
});

PayrollStatutorySalaryTrans.hasMany(Employeeincentive, {
  as:'INC',
  foreignKey: { name: 'ps_salaryTransId' },
});

module.exports = Employeeincentive;
