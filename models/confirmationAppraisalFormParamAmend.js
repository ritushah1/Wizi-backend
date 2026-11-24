const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');

const tableName = 'confirmationAppraisalFormParamAmend';

const ConfirmationAppraisalFormAmend = sequelize.define(
  tableName,
  {
    ConfirmationAppraisalFormAmendID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ConfirmationAppraisalFormParamID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    designationID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
    },
    formParameters: {
      type: Sequelize.ARRAY(Sequelize.STRING),
    },
    formParametersTypes: {
      type: Sequelize.ARRAY(Sequelize.STRING),
    },
    sequenceNumber: {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: false,
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

ConfirmationAppraisalFormAmend.belongsTo(UserMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});

module.exports = ConfirmationAppraisalFormAmend;
