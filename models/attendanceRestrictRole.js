const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const RoleMaster = require('./roleMaster');
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const tableName = 'attendancerestricRole';

const attendanceRestrictRole = sequelize.define(
  tableName,
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    roleID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    maxAttModDays: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    updateBy: {
      type: Sequelize.BIGINT,
    },
    deleteBy: {
      type: Sequelize.BIGINT,
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
  },
);

attendanceRestrictRole.addHook(
  'beforeCreate',
  (attendanceRestrictRole, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    attendanceRestrictRole.createBy = options.user.userMasterId;
    attendanceRestrictRole.createByIp = options.user.userIpAddress;
  },
);

attendanceRestrictRole.addHook(
  'beforeUpdate',
  (attendanceRestrictRole, options) => {
    attendanceRestrictRole.updateBy = options.user.userMasterId;
    attendanceRestrictRole.ipAddress = options.user.userIpAddress;
    attendanceRestrictRole.updateByIp = options.user.userIpAddress;
  },
);

attendanceRestrictRole.addHook(
  'beforeDestroy',
  async (attendanceRestrictRole, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    attendanceRestrictRole.deleteBy = options.user.userMasterId;
    attendanceRestrictRole.deleteByIp = options.user.userIpAddress;
    await attendanceRestrictRole.save({
      hooks: false,
      transaction: options.transaction,
    });
  },
);

attendanceRestrictRole.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

attendanceRestrictRole.belongsTo(RoleMaster, {
  foreignKey: { name: 'roleID' },
});

companyMaster.hasMany(attendanceRestrictRole, {
  foreignKey: { name: 'companyMasterID' },
  as: 'attResRole',
});

attendanceRestrictRole.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

attendanceRestrictRole.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

attendanceRestrictRole.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = attendanceRestrictRole;
