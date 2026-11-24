const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const tableName = 'designationAmend';

const DesignationAmend = sequelize.define(
  tableName,
  {
    designationAmendId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    designationId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    designationName: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    parentDesignation: {
      type: Sequelize.INTEGER,
    },

    jobdescription: {
      type: Sequelize.TEXT,
    },

    status: {
      type: Sequelize.BIGINT,
    },

    localDesignName: {
      type: Sequelize.STRING,
    },

    skillCategory: {
      type: Sequelize.ARRAY(Sequelize.STRING),
    },

    // Who made this amendment
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

DesignationAmend.belongsTo(UserMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});

module.exports = DesignationAmend;
