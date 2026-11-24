const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const { lwfDeductionType } = require('../utils/commonVars');
const StateMaster = require('./statemaster');
const { lwfDeductionMethodEnum } = require('../utils/dbUtils');
const table_name = 'lwfMaster';

const LwfMaster = sequelize.define(
  table_name,
  {
    lwfMasterID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    stateID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    employeeAmt: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    employerAmt: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    applicableAct:{                                              
  type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
      comment:'Appliacble Act ShopAct=>S,FactoryAct/OnWorkingDays=>F'
    },
    deductionMethod:{
 type: Sequelize.ENUM(...Object.values(lwfDeductionMethodEnum)),
      allowNull: false,
      comment:'Lwf deduction method fix or percentage of gross'
    },
    deductionType: {
      type: Sequelize.ENUM(...Object.values(lwfDeductionType)),
      allowNull: false,
    },
    employeePer:{
 type: Sequelize.FLOAT,
      allowNull: true,
    },
     employerPer:{
 type: Sequelize.FLOAT,
      allowNull: true,
    },
     employeeCapping:{
 type: Sequelize.FLOAT,
      allowNull: true,
    },
     employerCapping:{
 type: Sequelize.FLOAT,
      allowNull: true,
    },
    month: {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: true,
    },
    applicableYearMonth: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
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
    deleteBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    paranoid: true,
    timestamps: true,
  },
);

LwfMaster.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

LwfMaster.belongsTo(StateMaster, {
  foreignKey: { name: 'stateID' },
});

StateMaster.hasMany(LwfMaster, {
  foreignKey: { name: 'stateID' },
});

LwfMaster.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

LwfMaster.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

LwfMaster.addHook(
  'beforeCreate',
  (lwfMaster, options) => {
    lwfMaster.createBy = options.user.userMasterId;
    lwfMaster.createByIp = options.user.userIpAddress;
  },
);

LwfMaster.addHook(
  'beforeUpdate',
  (lwfMaster, options) => {
    lwfMaster.updateBy = options.user.userMasterId;
    lwfMaster.updateByIp = options.user.userIpAddress;
  },
);

LwfMaster.addHook(
  'beforeDestroy',
  (lwfMaster, options) => {
    lwfMaster.deleteBy = options.user.userMasterId;
    lwfMaster.deleteByIp = options.user.userIpAddress;
  },
);

module.exports = LwfMaster;
