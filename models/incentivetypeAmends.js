const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const table_name = 'incentivetypeAmend';

const IncentivetypeAmend = sequelize.define(
  table_name,
  {
    incentivetypeAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

    IncentivetypeID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },

    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },

    incentivetypename: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    showinsalaryslip: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    consider: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    pfApplicable: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    esicApplicable: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    employeeESICPer: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },

    employerESICPer: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },

    inc_type_displayName: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    createBy: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },

    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    timestamps:true,
    updatedAt:false,
    indexes: [
      {
        fields: ['IncentivetypeID'],
      },
    ],
  },
);

IncentivetypeAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
IncentivetypeAmend.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
});

module.exports = IncentivetypeAmend;
