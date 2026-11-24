const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const table_name = 'jobRoleClassificationAmend';

const JobRoleClassificationAmend = sequelize.define(
  table_name,
  {
    jobRoleClassificationAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

    jobRoleClassificationID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    jobRoleClassificationName: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    jobRoleClassificationDescription: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
        fields: ['jobRoleClassificationID'],
      },
    ],
  },
);

JobRoleClassificationAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
JobRoleClassificationAmend.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
});

module.exports = JobRoleClassificationAmend;
