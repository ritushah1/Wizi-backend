const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const table_name = 'visitorsAmend';

const VisitorsAmend = sequelize.define(
  table_name,
  {
    visitorsAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

    visitorsid: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    visitorsFirstName: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    visitorsLastName: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    visitorsPhone: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    visitorsComapny: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    visitorPhoto: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
        fields: ['visitorsid'],
      },
    ],
  },
);

VisitorsAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
VisitorsAmend.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
});

module.exports = VisitorsAmend;
