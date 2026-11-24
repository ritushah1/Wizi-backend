const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const userMaster = require('./userMaster');
const StateMaster = require('./statemaster');
const { SkillCategoryType, PayrollFrequencyType } = require('../utils/dbUtils');
const Corporation = require('./corporation');
const MinWagesMaster = require('./minWagesMaster');
const AuthorizationCriteriaMaster = require('./authorizationCriteriaMaster');
const table_name = 'salaryIncrementRequest';
const SalaryIncrementRequest = sequelize.define(
  table_name,
  {
    salaryIncrementRequestID: {
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
    authorizationStatus: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    authorizedBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    authorizedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    isAuthorizedBy: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    authorizerRemark: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    authCriteriaID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    structureDeleteBy: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    structureDeletedAt: {
      type: Sequelize.DATE,
      allowNull: true,
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
        fields: ['userMasterID', 'salaryFromYYYYMM'],
      },
    ],
  },
);

SalaryIncrementRequest.addHook('beforeCreate', (data, options) => {
  // Set createBy, ipAddress based on the authenticated user
  data.createBy = options.user.userMasterId;
  data.createByIp = options.user.userIpAddress;
});

SalaryIncrementRequest.addHook('beforeUpdate', (data, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  data.updateBy = options.user.userMasterId;
  data.updateByIp = options.user.userIpAddress;
});

SalaryIncrementRequest.addHook('beforeDestroy', (data, options) => {
  // Set delete and ipAddress based on the authenticated user
  data.deleteBy = options.user.userMasterId;
  data.deleteByIp = options.user.userIpAddress;
});

SalaryIncrementRequest.belongsTo(userMaster, {
  as: 'userMaster',
  foreignKey: { name: 'userMasterID' },
});

SalaryIncrementRequest.belongsTo(StateMaster, {
  foreignKey: { name: 'stateid' },
});

userMaster.hasMany(SalaryIncrementRequest, {
  as: 'userMaster',
  foreignKey: { name: 'userMasterID' },
});

SalaryIncrementRequest.belongsTo(Corporation, {
  foreignKey: { name: 'corporationId' },
});

SalaryIncrementRequest.belongsTo(MinWagesMaster, {
  foreignKey: { name: 'minWagesMasterId' },
});

SalaryIncrementRequest.belongsTo(userMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});

SalaryIncrementRequest.belongsTo(userMaster, {
  as: 'updatedUser',
  foreignKey: { name: 'updateBy' },
});

SalaryIncrementRequest.belongsTo(userMaster, {
  as: 'deletedUser',
  foreignKey: { name: 'deleteBy' },
});

SalaryIncrementRequest.belongsTo(AuthorizationCriteriaMaster, {
  foreignKey: { name: 'authCriteriaID' },
});

AuthorizationCriteriaMaster.hasMany(SalaryIncrementRequest, {
  foreignKey: { name: 'authCriteriaID' },
});

SalaryIncrementRequest.belongsTo(userMaster, {
  as: 'structureDeletedBy',
  foreignKey: { name: 'structureDeleteBy' },
});

userMaster.hasMany(SalaryIncrementRequest, {
  as: 'structureDeletedBy',
  foreignKey: { name: 'structureDeleteBy' },
});

SalaryIncrementRequest.belongsTo(userMaster, {
  as: 'authorizer',
  foreignKey: 'authorizedBy',
});

module.exports = SalaryIncrementRequest;
