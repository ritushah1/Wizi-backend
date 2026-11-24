const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const MeetingPurposeAmend = sequelize.define(
  'meetingPurposeAmend',
  {
    meetingPurposeAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    meetingPurposeID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    meetingPurpose: {
      type: Sequelize.STRING,
    },
    description: {
      type: Sequelize.TEXT,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
    },
    status: {
      type: Sequelize.INTEGER,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    timestamps: true,
    updatedAt:false,
    indexes:[{
        fields:['meetingPurposeAmendID']
    }]
  }
);
MeetingPurposeAmend.belongsTo(companyMaster,{
    foreignKey:{name:'companyMasterID'}
})
MeetingPurposeAmend.belongsTo(UserMaster,{
    foreignKey:{name:'createBy'}
})

module.exports = MeetingPurposeAmend;