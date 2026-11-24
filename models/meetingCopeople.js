const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const VisitMeetings = require('./visitMeetings');
const table_name = 'meetingCopeople';

const MeetingCopeople = sequelize.define(
  table_name,
  {
    meetingCopeopleID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    visitMeetingID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    createdBy: {
      type: Sequelize.INTEGER,
    },
    updatedBy: {
      type: Sequelize.INTEGER,
    },
    deletedBy: {
      type: Sequelize.INTEGER,
    },
    createdByIp: {
      type: Sequelize.STRING,
    },
    updatedByIp: {
      type: Sequelize.STRING,
    },
    deletedByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  },
);

MeetingCopeople.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

MeetingCopeople.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

MeetingCopeople.belongsTo(UserMaster, {
  as: 'coPeople',
  foreignKey: { name: 'userMasterID' },
});

UserMaster.hasMany(MeetingCopeople, {
  as: 'coPeople',
  foreignKey: { name: 'userMasterID' },
});

MeetingCopeople.belongsTo(VisitMeetings, {
  foreignKey: { name: 'visitMeetingID' },
});

VisitMeetings.hasMany(MeetingCopeople, {
  foreignKey: { name: 'visitMeetingID' },
});

MeetingCopeople.addHook('beforeCreate', (meetingCopeople, options) => {
  meetingCopeople.createdBy = options.user.userMasterId;
  meetingCopeople.createdByIp = options.user.userIpAddress;
});

MeetingCopeople.addHook('beforeUpdate', (meetingCopeople, options) => {
  meetingCopeople.updatedBy = options.user.userMasterId;
  meetingCopeople.updatedByIp = options.user.userIpAddress;
});

MeetingCopeople.addHook('beforeDestroy', (meetingCopeople, options) => {
  meetingCopeople.deletedBy = options.user.userMasterId;
  meetingCopeople.deletedByIp = options.user.userIpAddress;
});
module.exports = MeetingCopeople;
