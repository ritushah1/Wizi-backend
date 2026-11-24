const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const userMaster = require('./userMaster');
const gradeSalaryStructure = require('./gradeSalaryStructure');
const EmpPayrollStatutory = require('./empPayrollStatutory');
const SalaryIncrementRequest = require('./salaryIncrementRequest');
const table_name = 'salaryIncrementRequestDetails';
const SalaryIncrementRequestDetails = sequelize.define(
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
    salaryIncrementRequestID: {
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
    paranoid: true,
    indexes: [
      {
        unique: false,
        fields: ['gradeSalaryStructureID'],
      },
    ],
  },
);

SalaryIncrementRequestDetails.addHook('beforeCreate', (data, options) => {
  // Set createBy, ipAddress based on the authenticated user
  data.createBy = options.user.userMasterId;
  data.createByIp = options.user.userIpAddress;
});

SalaryIncrementRequestDetails.addHook('beforeUpdate', (data, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  data.updateBy = options.user.userMasterId;
  data.updateByIp = options.user.userIpAddress;
});

SalaryIncrementRequestDetails.addHook(
  'beforeDestroy',
  async (data, options) => {
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
  },
);

SalaryIncrementRequestDetails.belongsTo(SalaryIncrementRequest, {
  as: 'SIR',
  foreignKey: { name: 'salaryIncrementRequestID' },
});

SalaryIncrementRequest.hasMany(SalaryIncrementRequestDetails, {
  as: 'SIRDetails',
  foreignKey: { name: 'salaryIncrementRequestID' },
});

SalaryIncrementRequestDetails.belongsTo(gradeSalaryStructure, {
  as: 'GSS',
  foreignKey: { name: 'gradeSalaryStructureID' },
});

SalaryIncrementRequestDetails.belongsTo(userMaster, {
  as: 'createdUser',
  foreignKey: { name: 'createBy' },
});

SalaryIncrementRequestDetails.belongsTo(userMaster, {
  as: 'updatedUser',
  foreignKey: { name: 'updateBy' },
});

SalaryIncrementRequestDetails.belongsTo(userMaster, {
  as: 'deletedUser',
  foreignKey: { name: 'deleteBy' },
});

module.exports = SalaryIncrementRequestDetails;
