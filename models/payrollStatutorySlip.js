const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const userMaster = require('./userMaster');
const {
  PayrollFrequencyType,
  paymentMode,
  paymentMode_PaidSalary,
} = require('../utils/dbUtils');
const table_name = 'payrollStatutorySlip';
const PayrollStatutorySlip = sequelize.define(
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
    salaryYYYYMM: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    path: {
      type: Sequelize.TEXT,
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
    deleteBy: {
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
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
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
    isS3Upload: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    paranoid: true,
    indexes: [
      {
        unique: false,
        fields: ['userMasterID'],
      },
      {
        unique: false,
        fields: ['salaryYYYYMM'],
      },
      {
        unique: false,
        fields: ['salaryYYYYMM', 'userMasterID'],
      },
    ],
  },
);

PayrollStatutorySlip.addHook('beforeCreate', (data, options) => {
  // Set createBy, ipAddress based on the authenticated user
  data.createBy = options.user.userMasterId;
  data.createByIp = options.user.userIpAddress;
});

PayrollStatutorySlip.addHook('beforeUpdate', (data, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  data.updateBy = options.user.userMasterId;
  data.updateByIp = options.user.userIpAddress;
});

PayrollStatutorySlip.addHook('beforeDestroy', async (data, options) => {
  if (!options.user) return;

  await data.update(
    {
      deleteBy: options.user.userMasterId,
      deleteByIp: options.user.userIpAddress,
    },
    {
      transaction: options.transaction,
      hooks: false,
      silent: true, // optional: don't bump `updatedAt` for this
    },
  );
});

PayrollStatutorySlip.belongsTo(userMaster, {
  foreignKey: { name: 'userMasterID' },
});
userMaster.hasMany(PayrollStatutorySlip, {
  foreignKey: { name: 'userMasterID' },
});

PayrollStatutorySlip.belongsTo(userMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});

PayrollStatutorySlip.belongsTo(userMaster, {
  as: 'updateByUser',
  foreignKey: { name: 'updateBy' },
});

PayrollStatutorySlip.belongsTo(userMaster, {
  as: 'deleteByUser',
  foreignKey: { name: 'deleteBy' },
});

module.exports = PayrollStatutorySlip;
