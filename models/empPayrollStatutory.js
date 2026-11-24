
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const userMaster = require('./userMaster');
const gradeSalaryStructure = require('./gradeSalaryStructure');
const StateMaster = require('./statemaster');
const { SkillCategoryType, PayrollFrequencyType } = require('../utils/dbUtils');
const Corporation = require('./corporation');
const MinWagesMaster = require('./minWagesMaster');
const table_name = 'empPayrollStatutory';
const EmpPayrollStatutory = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    salaryFromYYYYMM: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    stateid: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    AmountIn: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    skillCategory: {
      type: Sequelize.ENUM(...Object.values(SkillCategoryType)),
    },
    corporationId: {
      type: Sequelize.INTEGER,
    },
    minWagesMasterId: {
      type: Sequelize.INTEGER,
    },
    payrollFrequency: {
      type: Sequelize.ENUM(...Object.values(PayrollFrequencyType)),
      allowNull: false,
      defaultValue: PayrollFrequencyType.MONTHLY,
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
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
  },
  {
    paranoid:true,
    indexes: [
      {
        unique: false,
        fields: ['userMasterID'],
      },
      {
        unique: false,
        fields: ['userMasterID','salaryFromYYYYMM'],
      },
    ],
  },
 
);

EmpPayrollStatutory.addHook('beforeCreate', (data, options) => {
  // Set createBy, ipAddress based on the authenticated user
  data.createBy = options.user.userMasterId;
  data.createByIp = options.user.userIpAddress;
});

EmpPayrollStatutory.addHook('beforeUpdate', (data, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  data.updateBy = options.user.userMasterId;
  data.updateByIp = options.user.userIpAddress;
});

EmpPayrollStatutory.addHook('beforeDestroy', (data, options) => {
  // Set delete and ipAddress based on the authenticated user
  data.deleteBy = options.user.userMasterId;
  data.deleteByIp = options.user.userIpAddress;
});

EmpPayrollStatutory.belongsTo(userMaster, {
  foreignKey: { name: 'userMasterID' },
});


EmpPayrollStatutory.belongsTo(StateMaster, {
  foreignKey: { name: 'stateid' },
});

userMaster.hasMany(EmpPayrollStatutory, {
  foreignKey: { name: 'userMasterID' },
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           

EmpPayrollStatutory.belongsTo(Corporation, {
  foreignKey: { name: 'corporationId' },
});

EmpPayrollStatutory.belongsTo(MinWagesMaster, {
  foreignKey: { name: 'minWagesMasterId' },
});

EmpPayrollStatutory.belongsTo(userMaster, {
  as: 'createdUser',
  foreignKey: { name: 'createBy' },
});

EmpPayrollStatutory.belongsTo(userMaster, {
  as: 'updatedUser',
  foreignKey: { name: 'updateBy' },
});

EmpPayrollStatutory.belongsTo(userMaster, {
  as: 'deletedUser',
  foreignKey: { name: 'deleteBy' },
});

module.exports = EmpPayrollStatutory;
