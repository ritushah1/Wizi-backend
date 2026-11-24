const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const { PayrollStatutoryAdjustModeEnum } = require('../utils/dbUtils');
const PayrollStatutorySalaryTrans = require('./payrollStatutorySalaryTrans');
const table_name = 'payrollStatutoryAdjustment';
const PayrollStatutoryAdjustment = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    amount: {
      type: Sequelize.FLOAT,
    },
    adjustMode: {
      type: Sequelize.ENUM(...Object.values(PayrollStatutoryAdjustModeEnum)),
    },
    minutes: {
      type: Sequelize.INTEGER,
    },
    ps_TransId: {
      type: Sequelize.BIGINT,
    },
    salaryYYYYMM: {
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
    deleteBy: {
      type: Sequelize.BIGINT,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
    indexes: [
      {
        name: 'idx_ps_adjustment_user_salary',
        fields: ['userMasterID', 'salaryYYYYMM'],
      },
    ],
  }
);

PayrollStatutoryAdjustment.addHook('beforeCreate', (data, options) => {
    // Set createBy, ipAddress based on the authenticated user
    data.createBy = options.user.userMasterId;
    data.createByIp = options.user.userIpAddress;
   
});

PayrollStatutoryAdjustment.addHook('beforeDestroy', async(data, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
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

PayrollStatutoryAdjustment.belongsTo(PayrollStatutorySalaryTrans, {
  as:'PST',
    foreignKey: { name: 'ps_TransId' },
});

PayrollStatutorySalaryTrans.hasMany(PayrollStatutoryAdjustment, {
  as:'PSA',
    foreignKey: { name: 'ps_TransId' },
});

PayrollStatutoryAdjustment.belongsTo(UserMaster, {
    foreignKey: { name: 'createBy' },
});

PayrollStatutoryAdjustment.belongsTo(UserMaster, {
    as:'createdBy',
    foreignKey: { name: 'createBy' },
});

PayrollStatutoryAdjustment.belongsTo(UserMaster, {
    as:'deletedBy',
    foreignKey: { name: 'deleteBy' },
});

module.exports = PayrollStatutoryAdjustment;
