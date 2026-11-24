const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const table_name = 'attendanceRegisterFormat';
const AttendanceRegisterFormat = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    fields: {
      type: Sequelize.ARRAY(Sequelize.TEXT),
      allowNull: false,
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
  },
);

AttendanceRegisterFormat.addHook('beforeCreate', (item, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

AttendanceRegisterFormat.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

AttendanceRegisterFormat.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

AttendanceRegisterFormat.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
AttendanceRegisterFormat.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

AttendanceRegisterFormat.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

AttendanceRegisterFormat.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});
companyMaster.hasMany(AttendanceRegisterFormat, {
  as: 'attRegFormat',
  foreignKey: { name: 'companyMasterID' },
});
module.exports = AttendanceRegisterFormat;
