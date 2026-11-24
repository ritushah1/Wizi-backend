const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const table_name = 'meetingPlaceAmend';

const MeetingPlaceAmend = sequelize.define(
  table_name,
  {
    meetingPlaceAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

    meetingPlaceid: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    meetingPlaceName: {
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
        fields: ['meetingPlaceid'],
      },
    ],
  },
);

MeetingPlaceAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
MeetingPlaceAmend.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
});

module.exports = MeetingPlaceAmend;
