const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const Shift = require('./shift');
const table_name = 'shiftRoster';

const ShiftRoster = sequelize.define(
  table_name,
  {
    shiftRosterID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    shiftRosterDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.INTEGER,
      // allowNull: false,
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
    isFromRoster: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
  },
  { paranoid: true },
);

ShiftRoster.addHook('beforeCreate', (shiftRoster, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  shiftRoster.createBy = options.user.userMasterId;
  shiftRoster.createByIp = options.user.userIpAddress;
});
ShiftRoster.addHook('beforeBulkCreate', (shiftRoster, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  shiftRoster.forEach((answer) => {
    answer.updateBy = options.user.userMasterId;
    answer.updateByIp = options.user.userIpAddress;
  });
});
ShiftRoster.addHook('beforeUpdate', (shiftRoster, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  shiftRoster.updateBy = options.user.userMasterId;
  shiftRoster.updateByIp = options.user.userIpAddress;
});

ShiftRoster.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});
ShiftRoster.belongsTo(UserMaster, { foreignKey: { name: 'userMasterID' } });
ShiftRoster.belongsTo(Shift, { foreignKey: { name: 'shiftID' } });
ShiftRoster.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
  as: 'createdBy',
});
ShiftRoster.belongsTo(UserMaster, {
  foreignKey: { name: 'updateBy' },
  as: 'updatedBy',
});
ShiftRoster.belongsTo(UserMaster, {
  foreignKey: { name: 'deleteBy' },
  as: 'deletedBy',
});
UserMaster.hasMany(ShiftRoster, {
  foreignKey: { name: 'userMasterID' },
});
module.exports = ShiftRoster;
