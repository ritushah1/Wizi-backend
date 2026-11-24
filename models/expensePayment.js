const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const userMaster = require('./userMaster');
const companyMaster = require('./companyMaster');
const HRSalaryTrasaction = require('./hrSalaryTransaction');
const UserMaster = require('./userMaster');
const { expense_Payment_Types_Obj } = require('../utils/dbUtils');
const table_name = 'expensePayment';
const expensePayment = sequelize.define(
  table_name,
  {
    ExpensePaymentID: {
      type: Sequelize.BIGINT,
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
      allowNull: false,
    },
    paymentDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    paymentmode: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    referenceNO: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    referenceDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    paymentType: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: expense_Payment_Types_Obj.EXPENSE_PAYMENT, // 0-> Expense Payment, 1-> Expense Advance Payment, 2-> Expense Advance Request Payment
    },
    erpNo: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    remarks: {
      type: Sequelize.STRING,
      allowNull: true,
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
    txnType: {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'DEBIT',
    },
    rmbMonth: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    referenceId: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    paymentRemarks: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
  },
  {
    indexes: [
      {
        unique: false,
        fields: ['userMasterID'],
      },
      {
        unique: false,
        fields: ['userMasterID', 'rmbMonth', 'paymentmode'],
      },
    ],
  },
);

expensePayment.belongsTo(userMaster, { foreignKey: { name: 'userMasterID' } });

userMaster.hasMany(expensePayment, { foreignKey: { name: 'userMasterID' } });

expensePayment.belongsTo(HRSalaryTrasaction, {
  foreignKey: { name: 'referenceId' },
});

HRSalaryTrasaction.hasMany(expensePayment, {
  foreignKey: { name: 'referenceId' },
});
expensePayment.belongsTo(UserMaster, {
  as: 'c_By',
  foreignKey: { name: 'createBy' },
});

expensePayment.belongsTo(UserMaster, {
  as: 'u_By',
  foreignKey: { name: 'updateBy' },
});
module.exports = expensePayment;
