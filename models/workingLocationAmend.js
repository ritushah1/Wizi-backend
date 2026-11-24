const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const CityMaster = require('./citymaster');
const UserMaster = require('./userMaster');

const tableName = 'workingLocationAmend';

const WorkingLocationAmend = sequelize.define(
  tableName,
  {
    workingLocationAmendID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    workingLocationID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    workingLocationName: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    cityMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    workingLocationAddress: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    latitude: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    longitude: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    radius: {
      type: Sequelize.DECIMAL(12, 4),
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
    indexes: [
      {
        fields: ['workingLocationID'],
      },
      {
        fields: ['companyMasterID'],
      },
      {
        fields: ['cityMasterID'],
      },
    ],
  }
);



WorkingLocationAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

WorkingLocationAmend.belongsTo(CityMaster, {
  foreignKey: { name: 'cityMasterID' },
});

WorkingLocationAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = WorkingLocationAmend;