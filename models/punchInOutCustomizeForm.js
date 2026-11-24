const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { PunchInOutCustomizeFromTypeEnum } = require('../utils/dbUtils');
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const tableName = 'punchInOutCustomizeForm';

const PunchInOutCustomizeForm = sequelize.define(
  tableName,
  {
    punchInOutCustomizeFormID: {
      type: Sequelize.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM(...Object.values(PunchInOutCustomizeFromTypeEnum)),
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
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
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    paranoid: true,
  },
);

PunchInOutCustomizeForm.addHook(
  'beforeCreate',
  (PunchInOutCustomizeForm, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    PunchInOutCustomizeForm.createBy = options.user.userMasterId;
    PunchInOutCustomizeForm.createByIp = options.user.userIpAddress;
    PunchInOutCustomizeForm.updateByIp = options.user.userIpAddress;
  },
);

PunchInOutCustomizeForm.addHook(
  'beforeUpdate',
  (PunchInOutCustomizeForm, options) => {
    PunchInOutCustomizeForm.updateBy = options.user.userMasterId;
    PunchInOutCustomizeForm.ipAddress = options.user.userIpAddress;
    PunchInOutCustomizeForm.updateByIp = options.user.userIpAddress;
  },
);

PunchInOutCustomizeForm.addHook(
  'beforeDestroy',
  async (PunchInOutCustomizeForm, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    PunchInOutCustomizeForm.deleteBy = options.user.userMasterId;
    PunchInOutCustomizeForm.deleteByIp = options.user.userIpAddress;
    await PunchInOutCustomizeForm.save({
      hooks: false,
      transaction: options.transaction,
    });
  },
);

PunchInOutCustomizeForm.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});
PunchInOutCustomizeForm.belongsTo(UserMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});
PunchInOutCustomizeForm.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});
PunchInOutCustomizeForm.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

module.exports = PunchInOutCustomizeForm;
