const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');

const tableName = 'googleSheetIntegration';

const GoogleSheetIntegration = sequelize.define(
  tableName,
  {
    googleSheetIntegrationID: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    refreshToken: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    // The main spreadsheet ID created on connect
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createBy: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    updateBy: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    deleteBy: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    updateByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    paranoid: true,
  },
);

GoogleSheetIntegration.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
companyMaster.hasMany(GoogleSheetIntegration, {
  as:'googleSheetIntegration',
  foreignKey: 'companyMasterID',
});

module.exports = GoogleSheetIntegration;
