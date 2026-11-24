const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const CompanyMaster = require('./companyMaster');
const BranchMaster = require('./branchMaster');
const Site = require('./site');
const UserMaster = require('./userMaster');

const tableName = 'projectAmend';

const ProjectAmend = sequelize.define(
  tableName,
  {
    projectAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    projectID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },

    projectName: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    display_id: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    short_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    projectDescription: {
      type: Sequelize.TEXT,
      allowNull: true,
    },

    deactiveDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    branchMasterID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },

    siteID: {
      type: Sequelize.BIGINT,
      allowNull: true,
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
        fields: ['projectID'],
      },
      {
        fields: ['companyMasterID'],
      },
      {
        fields: ['branchMasterID'],
      },
      {
        fields: ['siteID'],
      },
    ],
  }
);


ProjectAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

ProjectAmend.belongsTo(BranchMaster, {
  foreignKey: { name: 'branchMasterID' },
});

ProjectAmend.belongsTo(Site, {
  foreignKey: { name: 'siteID' },
});

ProjectAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = ProjectAmend;