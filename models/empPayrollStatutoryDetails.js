const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const userMaster = require('./userMaster');
const gradeSalaryStructure = require('./gradeSalaryStructure');
const StateMaster = require('./statemaster');
const { SkillCategoryType, PayrollFrequencyType } = require('../utils/dbUtils');
const Corporation = require('./corporation');
const MinWagesMaster = require('./minWagesMaster');
const EmpPayrollStatutory = require('./empPayrollStatutory');
const table_name = 'empPayrollStatutoryDetails';
const EmpPayrollStatutoryDetails = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    gradeSalaryStructureID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    EmployeeSalaryAmount: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    ActualEmployeeSalaryAmount: {
      type: Sequelize.FLOAT,
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
        fields: ['empPayrollStatutoryId'],
      },
      {
        unique: false,
        fields: ['gradeSalaryStructureID'],
      },

    ],
  },
 
);

EmpPayrollStatutoryDetails.addHook('beforeCreate', (data, options) => {
  // Set createBy, ipAddress based on the authenticated user
  data.createBy = options.user.userMasterId;
  data.createByIp = options.user.userIpAddress;
});


EmpPayrollStatutoryDetails.addHook('beforeUpdate', (data, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  data.updateBy = options.user.userMasterId;
  data.updateByIp = options.user.userIpAddress;
});

EmpPayrollStatutoryDetails.addHook('beforeDestroy', async (data, options) => {
 
   if (!options.user) return;

   await data.update(
      {
         deleteBy: options.user.userMasterId,
         deleteByIp: options.user.userIpAddress
      },
      {
         transaction: options.transaction,
         hooks: false,
         silent: true   // optional: don't bump `updatedAt` for this
      }
   );
});

EmpPayrollStatutoryDetails.belongsTo(EmpPayrollStatutory, {
as:'EPS',
  foreignKey: { name: 'empPayrollStatutoryId' },
});

EmpPayrollStatutory.hasMany(EmpPayrollStatutoryDetails, {
as:'EPSD',
  foreignKey: { name: 'empPayrollStatutoryId' },
});

EmpPayrollStatutoryDetails.belongsTo(gradeSalaryStructure, {
  as: 'GSS',
  foreignKey: { name: 'gradeSalaryStructureID' },
});

EmpPayrollStatutoryDetails.belongsTo(userMaster, {
  as: 'createdUser',
  foreignKey: { name: 'createBy' },
});

EmpPayrollStatutoryDetails.belongsTo(userMaster, {
  as: 'updatedUser',
  foreignKey: { name: 'updateBy' },
});

EmpPayrollStatutoryDetails.belongsTo(userMaster, {
  as: 'deletedUser',
  foreignKey: { name: 'deleteBy' },
});

module.exports = EmpPayrollStatutoryDetails;
