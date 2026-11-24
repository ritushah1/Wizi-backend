const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const BranchMaster = require('./branchMaster');
const CompanyMaster = require('./companyMaster');
const CityMaster = require('./citymaster');
const UserMaster = require('./userMaster');

const tableName = 'branchMasterAmend';

const BranchAmend = sequelize.define(
  tableName,
  {
    branchAmendId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    branchMasterID: {
      type: Sequelize.INTEGER,
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

    branchName: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    branchCode: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    branchAddress: {
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

    gstNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    lwfNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    professionaltaxNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    pfNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    esicNumber: {
      type: Sequelize.STRING,
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
        fields: ['branchMasterID'],
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



BranchAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

BranchAmend.belongsTo(CityMaster, {
  foreignKey: { name: 'cityMasterID' },
});

BranchAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = BranchAmend;