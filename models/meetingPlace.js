const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const MeetingPlaceAmend = require('./meetingPlaceAmends');
const UserMaster = require('./userMaster');
const table_name = 'meetingPlace';
const meetingPlace = sequelize.define(
  table_name,
  {
    meetingPlaceid: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    meetingPlaceName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      //forign key
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
    updateBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    updateByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  { paranoid: true },
);
meetingPlace.addHook('beforeCreate', (meetingPlace, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  meetingPlace.createBy = options.user.userMasterId;
  meetingPlace.updateBy = options.user.userMasterId;
  meetingPlace.createByIp = options.user.userIpAddress;
  meetingPlace.updateByIp = options.user.userIpAddress;
});

meetingPlace.addHook('beforeUpdate', (meetingPlace, options) => {
  meetingPlace.updateBy = options.user.userMasterId;
  meetingPlace.ipAddress = options.user.userIpAddress;
  meetingPlace.updateByIp = options.user.userIpAddress;
});

meetingPlace.addHook('beforeDestroy', async (meetingPlace, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  meetingPlace.deleteBy = options.user.userMasterId;
  meetingPlace.deleteByIp = options.user.userIpAddress;
  await meetingPlace.save({
    hooks: false,
    transaction: options.transaction,
  });
});

meetingPlace.addHook('beforeSave', async (meetingPlace, options) => {
  meetingPlace.user = options.user;
});
meetingPlace.addHook('beforeBulkCreate', async (meetingPlace, options) => {
  meetingPlace.user = options.user;
});
meetingPlace.addHook('afterSave', async (meetingPlace, options) => {
  await addMeetingPlaceAmend(meetingPlace, options);
});
meetingPlace.addHook('afterBulkCreate', async (meetingPlace, options) => {
  await addMeetingPlaceAmend(meetingPlace, options);
});

async function addMeetingPlaceAmend(meetingPlaces, options) {
  const list = Array.isArray(meetingPlaces) ? meetingPlaces : [meetingPlaces];

  const user = meetingPlaces.user;

  const rows = list.map((meetingPlace) => {
    const data = meetingPlace.get({ plain: true });

    return {
      meetingPlaceid: data.meetingPlaceid,
      meetingPlaceName: data.meetingPlaceName,
      companyMasterID: data.companyMasterID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await MeetingPlaceAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}
meetingPlace.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
MeetingPlaceAmend.belongsTo(meetingPlace, {
  as: 'meetingPlaceAmends',
  foreignKey: { name: 'meetingPlaceid' },
});

meetingPlace.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

meetingPlace.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

meetingPlace.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = meetingPlace;
