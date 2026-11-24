const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'pip';

const PIP = sequelize.define(
  table_name,
  {
    pipID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'User Is Required!!!' },
      },
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Start Date Is Required!!!' },
      },
    },
    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    managerID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Manager Is Required!!!' },
      },
    },
    concernSummary: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    businessImpact: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    pipReviewAdvanceDays: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    authorizationStatus: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
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

PIP.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

PIP.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

PIP.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

PIP.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

PIP.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

PIP.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

PIP.belongsTo(UserMaster, {
  as: 'employees',
  foreignKey: { name: 'userMasterID' },
});

UserMaster.hasMany(PIP, {
  as: 'employees',
  foreignKey: { name: 'userMasterID' },
});

PIP.belongsTo(UserMaster, {
  as: 'manager',
  foreignKey: { name: 'managerID' },
});

UserMaster.hasMany(PIP, {
  as: 'manager',
  foreignKey: { name: 'managerID' },
});

module.exports = PIP;
