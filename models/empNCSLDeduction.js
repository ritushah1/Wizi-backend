/** @format */

const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const { NCSLDeductionsEnum } = require('../utils/dbUtils');

const EmpNCSLDeduction = sequelize.define(
  'empNCSLDeduction',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    category: {
      type: Sequelize.ENUM(...Object.values(NCSLDeductionsEnum)),
      allowNull: false,
    },
    amount: {
      type: Sequelize.FLOAT,
      allowNull: false,
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

    createByIp: {
      type: Sequelize.STRING,
    },
    updateByIp: {
      type: Sequelize.STRING,
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
        fields: ['userMasterID', 'category'],
      },
      {
        unique: false,
        fields: ['userMasterID', 'status'],
      },
    ],
  }
);

EmpNCSLDeduction.addHook('beforeCreate', (EmpNCSLDeduction, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  EmpNCSLDeduction.createBy = options.user.userMasterId;
  EmpNCSLDeduction.createByIp = options.user.userIpAddress;
});

EmpNCSLDeduction.addHook('beforeUpdate', (EmpNCSLDeduction, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  EmpNCSLDeduction.updateBy = options.user.userMasterId;
  EmpNCSLDeduction.updateByIp = options.user.userIpAddress;
});

EmpNCSLDeduction.belongsTo(UserMaster, {
  foreignKey: { allowNull: false, name: 'userMasterID' },
});

UserMaster.hasMany(EmpNCSLDeduction, {
  foreignKey: { name: 'userMasterID' },
});

EmpNCSLDeduction.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

EmpNCSLDeduction.belongsTo(UserMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

module.exports = EmpNCSLDeduction;
