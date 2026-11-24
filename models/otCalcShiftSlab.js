const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const { otRatioTypeEnum } = require('../utils/dbUtils');
const AttendancePolicy = require('./attendancePolicy');

const table_name = 'otCalcShiftSlab';

const otCalcShiftSlab = sequelize.define(
  table_name,
  {
    otCalcShiftSlabID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    attendancePolicyID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Attendance Policy Is Required!!!' },
      },
    },
    shiftIds: {
      type: Sequelize.ARRAY(Sequelize.BIGINT),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Shift IDs Are Required!!!' },
      },
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateBy: {
      type: Sequelize.BIGINT,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteBy: {
      type: Sequelize.INTEGER,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  },
);

otCalcShiftSlab.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

otCalcShiftSlab.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

otCalcShiftSlab.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});
// 🔹 BULK CREATE
otCalcShiftSlab.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
otCalcShiftSlab.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
otCalcShiftSlab.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await otCalcShiftSlab.update(
      {
        deleteBy: options.user.userMasterId,
        deleteByIp: options.user.userIpAddress,
      },
      {
        where: options.where,
        transaction: options.transaction,
        hooks: false,
      },
    );
  }
});

otCalcShiftSlab.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

otCalcShiftSlab.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

otCalcShiftSlab.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

otCalcShiftSlab.belongsTo(AttendancePolicy, {
  as: 'otCalcSS',
  foreignKey: { name: 'attendancePolicyID' },
});

AttendancePolicy.hasMany(otCalcShiftSlab, {
  as: 'otCalcSS',
  foreignKey: { name: 'attendancePolicyID' },
});

module.exports = otCalcShiftSlab;
