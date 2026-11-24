const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CityMaster = require('./citymaster');

const table_name = 'inquiries';

const Inquiries = sequelize.define(
  table_name,
  {
    inquiryID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    totalEmployees: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    fieldEmployees: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    companyEmail: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    mobileNumber: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    contactPersonFirstName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    contactPersonLastName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    address: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    cityMasterID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    otpEmail: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    otpCode: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    otpExpiry: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    otpVerified: {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    },
    otpAttempts: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: true,
    },
    // ─── Payment tracking ─────────────────────────────────────────────────────
    paymentOrderId: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Razorpay order ID returned from createOrder',
    },
    paymentId: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Razorpay payment ID confirmed after verifySignature',
    },
    paymentAmount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Amount in INR (not paise)',
    },
    paymentStatus: {
      type: Sequelize.ENUM('pending', 'success', 'failed'),
      allowNull: true,
      defaultValue: null,
    },
    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment: 'Link to companyMaster after company registration (Step 2)',
    },
    branchMasterID: {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment: 'Link to branchMaster after branch registration (Step 3)',
    },
    departmentMasterID: {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment:
        'Link to departmentMaster after department registration (Step 4)',
    },
    designationMasterID: {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment:
        'Link to designationMaster after designation registration (Step 4)',
    },
    // ──────────────────────────────────────────────────────────────────────────
    completedStep: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
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
    deleteBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    timezoneID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
  },
  {
    paranoid: true,
    tableName: table_name,
    timestamps: true,
    indexes: [
      { fields: ['mobileNumber'] },
      { fields: ['otpCode'] },
      { fields: ['otpExpiry'] },
      { fields: ['otpVerified'] },
      { fields: ['completedStep'] },
    ],
  },
);

Inquiries.belongsTo(CityMaster, {
  foreignKey: { name: 'cityMasterID', allowNull: true },
});

module.exports = Inquiries;
