const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const GoogleSheetIntegration = require('./googleSheetIntegration');
const UserMaster = require('./userMaster');

const tableName = 'googleSheet';

const GoogleSheet = sequelize.define(
  tableName,
  {
    googleSheetID: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    integrationId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    yearMonth: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    spreadsheetId: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    spreadsheetName: {
      type: Sequelize.STRING,
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

GoogleSheet.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

GoogleSheet.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

GoogleSheet.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

GoogleSheet.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

GoogleSheet.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

GoogleSheet.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

GoogleSheet.belongsTo(GoogleSheetIntegration, {
  foreignKey: { name: 'integrationId' },
});

module.exports = GoogleSheet;
