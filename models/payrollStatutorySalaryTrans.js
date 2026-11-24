
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const userMaster = require('./userMaster');
const { PayrollFrequencyType } = require('../utils/dbUtils');
const EmpPayrollStatutoryDetails = require('./empPayrollStatutoryDetails');
const table_name = 'payrollStatutorySalaryTrans';
const PayrollStatutorySalaryTrans = sequelize.define(
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
    psDetailsId: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    salaryYYYYMM: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    EmployeeSalaryAmount: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    SalaryCalcOnDays: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
     calculatedOn: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    payrollFrequency: {
      type: Sequelize.ENUM(...Object.values(PayrollFrequencyType)),
      allowNull: false,
      defaultValue: PayrollFrequencyType.MONTHLY,
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    updateBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteBy:{
 type: Sequelize.BIGINT,
    },
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    updateByIp: {
      type: Sequelize.STRING,
      allowNull: true,
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
        fields: ['psDetailsId'],
      },
      {
        unique: false,
        fields: ['userMasterID','salaryYYYYMM'],
      },
    ],
  },
);

PayrollStatutorySalaryTrans.addHook('beforeCreate', (data, options) => {
  // Set createBy, ipAddress based on the authenticated user
  data.createBy = options.user.userMasterId;
  data.createByIp = options.user.userIpAddress;
});


PayrollStatutorySalaryTrans.addHook('beforeUpdate', (data, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  data.updateBy = options.user.userMasterId;
  data.updateByIp = options.user.userIpAddress;
});

PayrollStatutorySalaryTrans.addHook('beforeDestroy', async (data, options) => {
 
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

PayrollStatutorySalaryTrans.belongsTo(userMaster, {
  foreignKey: { name: 'userMasterID' },
});
PayrollStatutorySalaryTrans.belongsTo(EmpPayrollStatutoryDetails, {
    as:'EPSD',
  foreignKey: { name: 'psDetailsId' },
});

userMaster.hasMany(PayrollStatutorySalaryTrans, {
    as:'PSST',
  foreignKey: { name: 'userMasterID' },
});

PayrollStatutorySalaryTrans.belongsTo(userMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});

PayrollStatutorySalaryTrans.belongsTo(userMaster, {
  as: 'updateByUser',
  foreignKey: { name: 'updateBy' },
});

PayrollStatutorySalaryTrans.belongsTo(userMaster, {
  as: 'deleteByUser',
  foreignKey: { name: 'deleteBy' },
});

module.exports = PayrollStatutorySalaryTrans;
