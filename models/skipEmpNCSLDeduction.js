/** @format */

const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const { NCSLDeductionsEnum } = require('../utils/dbUtils');
const EmpNCSLDeduction = require('./empNCSLDeduction');

const SkipEmpNCSLDeduction = sequelize.define(
  'skipEmpNCSLDeduction',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    YYYYMM: {
      type: Sequelize.INTEGER,
    },
    fortnight: {
      type: Sequelize.STRING,
    },
    fStartDate: {
      type: Sequelize.DATEONLY,
    },
    fEndDate: {
      type: Sequelize.DATEONLY,
    },
    salaryStatus: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    remarks: {
      type: Sequelize.TEXT,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.INTEGER,
    },
    updateBy: {
      type: Sequelize.INTEGER,
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
  }
);

SkipEmpNCSLDeduction.addHook(
  'beforeCreate',
  (SkipEmpNCSLDeduction, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    SkipEmpNCSLDeduction.createBy = options.user.userMasterId;
    SkipEmpNCSLDeduction.createByIp = options.user.userIpAddress;
  }
);

SkipEmpNCSLDeduction.addHook(
  'beforeUpdate',
  (SkipEmpNCSLDeduction, options) => {
    // Set updateBy and ipAddress based on the authenticated user
    SkipEmpNCSLDeduction.updateBy = options.user.userMasterId;
    SkipEmpNCSLDeduction.updateByIp = options.user.userIpAddress;
  }
);

SkipEmpNCSLDeduction.addHook(
  'beforeDestroy',
  (SkipEmpNCSLDeduction, options) => {
    SkipEmpNCSLDeduction.deleteBy = options.user.userMasterId;
    SkipEmpNCSLDeduction.deleteByIp = options.user.userIpAddress;
  }
);

SkipEmpNCSLDeduction.belongsTo(EmpNCSLDeduction, {
  foreignKey: { name: 'empNCSLDeductionId' },
});

EmpNCSLDeduction.hasMany(SkipEmpNCSLDeduction, {
  foreignKey: { name: 'empNCSLDeductionId' },
});

SkipEmpNCSLDeduction.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

SkipEmpNCSLDeduction.belongsTo(UserMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

SkipEmpNCSLDeduction.belongsTo(UserMaster, {
  as: 'deletedByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = SkipEmpNCSLDeduction;
