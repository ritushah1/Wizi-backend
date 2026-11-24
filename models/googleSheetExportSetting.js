const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const FormMaster = require('./formMaster');

const tableName = 'googleSheetExportSetting';

const GoogleSheetExportSetting = sequelize.define(
  tableName,
  {
    googleSheetExportSettingID: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    formMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    createBy: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    updateBy: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    deleteBy: {
      type: Sequelize.INTEGER,
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

GoogleSheetExportSetting.addHook('beforeCreate', (instance, options) => {
  if (options.user) {
    instance.createBy = options.user.userMasterId;
    instance.createByIp = options.user.userIpAddress;
  }
});

GoogleSheetExportSetting.addHook('beforeUpdate', (instance, options) => {
  if (options.user) {
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

GoogleSheetExportSetting.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

GoogleSheetExportSetting.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
companyMaster.hasMany(GoogleSheetExportSetting, {
  foreignKey: 'companyMasterID',
});

GoogleSheetExportSetting.belongsTo(FormMaster, {
  foreignKey: { name: 'formMasterID' },
});

module.exports = GoogleSheetExportSetting;
