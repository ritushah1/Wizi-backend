const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');

const tableName = 'resignProcessAmend';

const ResignProcessAmend = sequelize.define(
  tableName,
  {
    resignProcessAmendID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    resignProcessID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    departmentID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    branchID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    designationID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    divisionID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
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
    timestamps: true,
    updatedAt: false,
  }
);

ResignProcessAmend.belongsTo(UserMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});

module.exports = ResignProcessAmend;