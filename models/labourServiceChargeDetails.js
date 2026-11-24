const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const LabourServiceCharge = require('./labourServiceCharge');
const table_name = 'labourServiceChargeDetails';

const LabourServiceChargeDetails = sequelize.define(
  table_name,
  {
    labourServiceChargeDetailID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    labourServiceChargeID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Labour Service Charge ID Is Required!!!' },
      },
    },
    skillCategory: {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        notEmpty: { msg: 'Skill Category Is Required!!!' },
      },
    },
    percentage: {
      type: Sequelize.FLOAT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Percentage Is Required!!!' },
      },
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
      type: Sequelize.BIGINT,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  },
);

LabourServiceChargeDetails.addHook('beforeCreate', (item, options) => {
  if (options && options.user) {
    item.createBy = options.user.userMasterId;
    item.createByIp = options.user.userIpAddress;
  }
});

LabourServiceChargeDetails.addHook('beforeUpdate', (item, options) => {
  if (options && options.user) {
    item.updateBy = options.user.userMasterId;
    item.updateByIp = options.user.userIpAddress;
  }
});

LabourServiceChargeDetails.addHook('beforeDestroy', async (item, options) => {
  if (options && options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

LabourServiceChargeDetails.addHook('beforeBulkCreate', (items, options) => {
  if (options && options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// Associations with short aliases
LabourServiceChargeDetails.belongsTo(LabourServiceCharge, {
  as: 'charge',
  foreignKey: { name: 'labourServiceChargeID' },
});

LabourServiceCharge.hasMany(LabourServiceChargeDetails, {
  as: 'details',
  foreignKey: { name: 'labourServiceChargeID' },
});

LabourServiceChargeDetails.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

LabourServiceChargeDetails.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

module.exports = LabourServiceChargeDetails;
