const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const tableName = 'workingAreaAmend';

const WorkingAreaAmend = sequelize.define(
  tableName,
  {
    workingAreaAmendID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    workingAreaID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    workingAreaName: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    createBy: {
      type: Sequelize.INTEGER,
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
        fields: ['workingAreaID'],
      },
      {
        fields: ['companyMasterID'],
      },
    ],
  }
);


WorkingAreaAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

WorkingAreaAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = WorkingAreaAmend;