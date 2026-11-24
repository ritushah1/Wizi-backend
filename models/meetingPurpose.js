const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const MeetingPurposeAmend = require('./meetingPurposeAmends');
const table_name = 'meetingPurpose';

const MeetingPurpose = sequelize.define(
  table_name,
  {
    meetingPurposeID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    meetingPurpose: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
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

MeetingPurpose.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

MeetingPurpose.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});
MeetingPurpose.belongsTo(UserMaster, {
  as: 'deleteByDetails',
  foreignKey: { name: 'deleteBy' },
});

MeetingPurposeAmend.belongsTo(MeetingPurpose,{
  as:'meetingPurposeAmends',
  foreignKey:{name:'meetingPurposeID'}
})

MeetingPurpose.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

MeetingPurpose.addHook('beforeCreate', (meetingPurpose, options) => {
  meetingPurpose.createdBy = options.user.userMasterId;
  meetingPurpose.createdByIp = options.user.userIpAddress;
});

MeetingPurpose.addHook('beforeUpdate', (meetingPurpose, options) => {
  meetingPurpose.updatedBy = options.user.userMasterId;
  meetingPurpose.updatedByIp = options.user.userIpAddress;
});

MeetingPurpose.addHook('beforeDestroy', async(meetingPurpose, options) => {
  meetingPurpose.deletedBy = options.user.userMasterId;
  meetingPurpose.deletedByIp = options.user.userIpAddress;
  await meetingPurpose.save({
    hooks:false,
    transaction:options.transaction
  })
});

MeetingPurpose.addHook('beforeSave', async (MeetingPurpose, options) => {
  MeetingPurpose.user = options.user;
});
MeetingPurpose.addHook('beforeBulkCreate', async (MeetingPurpose, options) => {
  MeetingPurpose.user = options.user;
});
MeetingPurpose.addHook('afterSave', async (MeetingPurpose, options) => {
  await addMeetingPurposeAmend(MeetingPurpose, options);
});
MeetingPurpose.addHook('afterBulkCreate', async (MeetingPurpose, options) => {
  await addMeetingPurposeAmend(MeetingPurpose, options);
});

async function addMeetingPurposeAmend(meetingPurpose, options) {
  const list = Array.isArray(meetingPurpose)
    ? meetingPurpose
    : [meetingPurpose];

  const user = meetingPurpose.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      meetingPurposeID: data.meetingPurposeID,
      meetingPurpose: data.meetingPurpose,
      description: data.description,
      companyMasterID: data.companyMasterID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await MeetingPurposeAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}
module.exports = MeetingPurpose;
