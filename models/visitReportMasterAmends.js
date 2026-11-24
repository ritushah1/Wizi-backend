const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');

const table_name = 'visitReportMasterAmend';

const VisitReportMasterAmend = sequelize.define(
  table_name,
  {
    visitReportMasterAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

    visitReportMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },

    visitReportName: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    createBy: {
      type: Sequelize.BIGINT,
    },

    createByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
  },
);

VisitReportMasterAmend.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
});

module.exports = VisitReportMasterAmend;
