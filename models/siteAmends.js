const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const BranchMaster = require('./branchMaster');
const UserMaster = require('./userMaster');

const tableName = 'siteAmend';

const SiteAmend = sequelize.define(
  tableName,
  {
    siteAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    siteID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },

    siteName: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    siteCode: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    branchMasterID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },

    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: true,
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
        fields: ['siteID'],
      },
      {
        fields: ['companyMasterID'],
      },
      {
        fields: ['branchMasterID'],
      },
    ],
  }
);



SiteAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

SiteAmend.belongsTo(BranchMaster, {
  foreignKey: { name: 'branchMasterID' },
});

SiteAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = SiteAmend;