const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const SalaryIncrementRequest = require('./salaryIncrementRequest');
const table_name = 'salaryIncrementRequestAuthorization';

const SalaryIncrementRequestAuthorization = sequelize.define(
  table_name,
  {
    salaryIncrementRequestAuthorizationID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    salaryIncrementRequestID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notNull: { msg: 'Salary Increment Request ID Request  is required' },
        isInt: { msg: 'Salary Increment Request ID Request must be an integer' },
      },
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notNull: { msg: 'userMasterID is required' },
        isInt: { msg: 'userMasterID must be an integer' },
      },
    },
    remarks: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    authStatus: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: '0 = Reject , 1 = Accepyed, 2 = Pending',
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '0 = InActive , 1 = Active',
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: false,
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

SalaryIncrementRequestAuthorization.belongsTo(UserMaster, {
  as: 'employee',
  foreignKey: { name: 'userMasterID' },
});

UserMaster.hasMany(SalaryIncrementRequestAuthorization, {
  foreignKey: { name: 'userMasterID' },
});

SalaryIncrementRequestAuthorization.belongsTo(SalaryIncrementRequest, {
  as: 'salaryIncreReqAuth',
  foreignKey: { name: 'salaryIncrementRequestID' },
});

SalaryIncrementRequest.hasMany(SalaryIncrementRequestAuthorization, {
  as: 'salaryIncreReqAuth',
  foreignKey: { name: 'salaryIncrementRequestID' },
});

SalaryIncrementRequestAuthorization.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

SalaryIncrementRequestAuthorization.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

SalaryIncrementRequestAuthorization.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

SalaryIncrementRequestAuthorization.addHook(
  'beforeCreate',
  (salaryIncrementReqAuth, options) => {
    salaryIncrementReqAuth.createBy = options.user.userMasterId;
    salaryIncrementReqAuth.createByIp = options.user.userIpAddress;
  },
);

SalaryIncrementRequestAuthorization.addHook(
  'beforeUpdate',
  (salaryIncrementReqAuth, options) => {
    salaryIncrementReqAuth.updateBy = options.user.userMasterId;
    salaryIncrementReqAuth.updateByIp = options.user.userIpAddress;
  },
);

SalaryIncrementRequestAuthorization.addHook(
  'beforeDestroy',
  (salaryIncrementReqAuth, options) => {
    salaryIncrementReqAuth.deleteBy = options.user.userMasterId;
    salaryIncrementReqAuth.deleteByIp = options.user.userIpAddress;
  },
);

module.exports = SalaryIncrementRequestAuthorization;
