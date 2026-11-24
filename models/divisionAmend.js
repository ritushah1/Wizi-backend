const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const tableName = 'divisionAmend';

const DivisionAmend = sequelize.define(
  tableName,
  {
    divisionAmendId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    divisionId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    divisionName: {
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
        fields: ['divisionId'],
      },
      {
        fields: ['companyMasterID'],
      },
    ],
  }
);

DivisionAmend.belongsTo(CompanyMaster, {
  foreignKey: {
    name: 'companyMasterID',
  },
});

DivisionAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: {
    name: 'createBy',
  },
});

module.exports = DivisionAmend;