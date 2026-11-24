const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'attendanceCorrectionReason';
const UserMaster = require('./userMaster');
const companyMaster = require('./companyMaster');
const AttendanceCorrectionReasonAmend = require('./attendanceCorrectionReasonAmends');

const AttendanceCorrectionReason = sequelize.define(
  table_name,
  {
    attendanceCorrectionReasonID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    reason: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    isDefault: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    createBy: {
      type: Sequelize.INTEGER,
    },
    updateBy: {
      type: Sequelize.INTEGER,
    },
    deleteBy: {
      type: Sequelize.INTEGER,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  }
);

AttendanceCorrectionReason.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

AttendanceCorrectionReason.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

AttendanceCorrectionReason.belongsTo(UserMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

AttendanceCorrectionReason.belongsTo(UserMaster, {
  as: 'deletedByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

AttendanceCorrectionReasonAmend.belongsTo(AttendanceCorrectionReason, {
  foreignKey: { name: 'attendanceCorrectionReasonID' },
});

async function addAttendanceCorrectionReasonAmend(
  attendanceCorrectionReasons,
  options
) {
  const list = Array.isArray(attendanceCorrectionReasons)
    ? attendanceCorrectionReasons
    : [attendanceCorrectionReasons];

  const user = Array.isArray(attendanceCorrectionReasons)
    ? attendanceCorrectionReasons.user
    : attendanceCorrectionReasons.user;

  const rows = list.map((attendanceCorrectionReason) => {
    const data = attendanceCorrectionReason.get({ plain: true });

    return {
      attendanceCorrectionReasonID: data.attendanceCorrectionReasonID,
      reason: data.reason,
      isDefault: data.isDefault,
      companyMasterID: data.companyMasterID,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await AttendanceCorrectionReasonAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

AttendanceCorrectionReason.addHook('beforeBulkCreate',async(attendanceCorrectionReason,options)=>{
  attendanceCorrectionReason.user=options.user
})
AttendanceCorrectionReason.addHook('beforeSave',async(attendanceCorrectionReason,options)=>{
  attendanceCorrectionReason.user=options.user
})
AttendanceCorrectionReason.addHook('afterSave',async(attendanceCorrectionReason,options)=>{
   await addAttendanceCorrectionReasonAmend(attendanceCorrectionReason,options)
})
AttendanceCorrectionReason.addHook('afterBulkCreate',async(attendanceCorrectionReason,options)=>{
  await addAttendanceCorrectionReasonAmend(attendanceCorrectionReason,options)
})

AttendanceCorrectionReason.addHook(
  'beforeCreate',
  (attendanceCorrectionReason, options) => {
    attendanceCorrectionReason.createBy = options.user.userMasterId;
    attendanceCorrectionReason.createByIp = options.user.userIpAddress;
  }
);

AttendanceCorrectionReason.addHook(
  'beforeUpdate',
  (attendanceCorrectionReason, options) => {
    attendanceCorrectionReason.updateBy = options.user.userMasterId;
    attendanceCorrectionReason.updateByIp = options.user.userIpAddress;
  }
);

AttendanceCorrectionReason.addHook('beforeDestroy', async (AttendanceCorrectionReason, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  AttendanceCorrectionReason.deleteBy = options.user.userMasterId;
  AttendanceCorrectionReason.deleteByIp = options.user.userIpAddress;
  await AttendanceCorrectionReason.save({
    hooks: false,
    transaction: options.transaction,
  });
});
module.exports = AttendanceCorrectionReason;
