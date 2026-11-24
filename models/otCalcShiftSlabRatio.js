const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const { otRatioTypeEnum } = require('../utils/dbUtils');
const otCalcShiftSlab = require('./otCalcShiftSlab');

const table_name = 'otCalcShiftSlabRatio';

const otCalcShiftSlabRatio = sequelize.define(
  table_name,
  {
    otCalcShiftSlabRatioID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    otCalcShiftSlabID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'OT Calc Shift Slab Is Required!!!' },
      },
    },
    upToMin: {
      type: Sequelize.INTEGER,
    },
    ratio: {
      type: Sequelize.FLOAT,
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

otCalcShiftSlabRatio.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

otCalcShiftSlabRatio.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

otCalcShiftSlabRatio.addHook('beforeDestroy', async (item, options) => {
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
otCalcShiftSlabRatio.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
otCalcShiftSlabRatio.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
otCalcShiftSlabRatio.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await otCalcShiftSlabRatio.update(
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

otCalcShiftSlabRatio.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

otCalcShiftSlabRatio.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

otCalcShiftSlabRatio.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

otCalcShiftSlabRatio.belongsTo(otCalcShiftSlab, {
  as: 'otCalcSSR',
  foreignKey: { name: 'otCalcShiftSlabID' },
});

otCalcShiftSlab.hasMany(otCalcShiftSlabRatio, {
  as: 'otCalcSSR',
  foreignKey: { name: 'otCalcShiftSlabID' },
});

module.exports = otCalcShiftSlabRatio;
