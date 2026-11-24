const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const CompanyMaster = require('./companyMaster');

const VisitPurposeAmend = sequelize.define(
  'visitPurposeAmend',
  {
    visitPurposeAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    visitPurposeID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    visitPurpose: {
      type: Sequelize.STRING,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
    },
    status: {
      type: Sequelize.BIGINT,
    },
    authorizationStatus: {
      type: Sequelize.BIGINT,
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
    paranoid: false,
  },
);

VisitPurposeAmend.belongsTo(CompanyMaster, {
  foreignKey: {
    name: 'companyMasterID',
  },
});

module.exports = VisitPurposeAmend;
