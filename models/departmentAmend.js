const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const tableName = 'departmentAmend';

const DepartmentAmend = sequelize.define(
  tableName,
  {
    departmentAmendId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    departmentId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    departmentName: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    status: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },

    authorizationStatus: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },

    createBy: {
      // User who performed this amendment
      type: Sequelize.BIGINT,
      allowNull: false,
    },

    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        fields: ['departmentId'],
      },
      {
        fields: ['companyMasterID'],
      },
    ],
  }
);

DepartmentAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

DepartmentAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = DepartmentAmend;