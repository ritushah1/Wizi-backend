const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const { visitMeetingStatus, meetingType } = require('../utils/commonVars');
const Product = require('./product');
const Customer = require('./customer');
const MeetingPurpose = require('./meetingPurpose');
const table_name = 'visitMeetings';

const VisitMeetings = sequelize.define(
  table_name,
  {
    visitMeetingID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    customerID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    userMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    meetingPurposeID: {
      type: Sequelize.INTEGER,
    },
    fromTime: {
      type: Sequelize.TIME,
      allowNull: false,
    },
    toTime: {
      type: Sequelize.TIME,
      allowNull: false,
    },
    agenda: {
      type: Sequelize.TEXT,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    meetingStatus: {
      type: Sequelize.ENUM(...Object.values(visitMeetingStatus)),
      defaultValue: visitMeetingStatus.SCHEDULED,
    },
    meetingType: {
      type: Sequelize.ENUM(...Object.values(meetingType)),
      defaultValue: meetingType.OFFLINE,
    },
    meetingDate: {
      type: Sequelize.DATEONLY,
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
    remark: {
      type: Sequelize.TEXT,
    },
    previousMeetingID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  },
  {
    paranoid: true,
  },
);

VisitMeetings.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

VisitMeetings.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

VisitMeetings.belongsTo(UserMaster, {
  as: 'user',
  foreignKey: { name: 'userMasterID' },
});

VisitMeetings.belongsTo(Customer, { foreignKey: { name: 'customerID' } });

VisitMeetings.belongsTo(MeetingPurpose, {
  foreignKey: { name: 'meetingPurposeID' },
});

VisitMeetings.belongsTo(VisitMeetings, {
  as: 'previousMeeting',
  foreignKey: { name: 'previousMeetingID' },
});

VisitMeetings.addHook('beforeCreate', (visitMeeting, options) => {
  visitMeeting.createdBy = options.user.userMasterId;
  visitMeeting.createdByIp = options.user.userIpAddress;
});

VisitMeetings.addHook('beforeUpdate', (visitMeeting, options) => {
  visitMeeting.updatedBy = options.user.userMasterId;
  visitMeeting.updatedByIp = options.user.userIpAddress;
});

VisitMeetings.addHook('beforeDestroy', (visitMeeting, options) => {
  visitMeeting.deletedBy = options.user.userMasterId;
  visitMeeting.deletedByIp = options.user.userIpAddress;
});

module.exports = VisitMeetings;
