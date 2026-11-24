const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'idCardFormat';

const IdCardFormat = sequelize.define(
  table_name,
  {
    idCardFormatID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    idCardFormatName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    portraitIdCardPath: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    portraitHtmlPath: {
      type: Sequelize.TEXT,
    },
    portraitThumbnailPath: {
        type: Sequelize.TEXT,
    },
    landscapeIdCardPath: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    landscapeHtmlPath: {
      type: Sequelize.TEXT,
    },
    landscapeThumbnailPath: {
        type: Sequelize.TEXT,
    },
    pdfPortraitIdCardPath: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    pdfPortraitHtmlPath: {
      type: Sequelize.TEXT,
    },
    pdfPortraitThumbnailPath: {
        type: Sequelize.TEXT,
    },
    pdfLandscapeIdCardPath: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    pdfLandscapeHtmlPath: {
      type: Sequelize.TEXT,
    },
    pdfLandscapeThumbnailPath: {
        type: Sequelize.TEXT,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    updateBy: {
      type: Sequelize.BIGINT,
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
  }
);

IdCardFormat.addHook('beforeCreate', (idCardFormat, options) => {
  idCardFormat.createBy = options.user.userMasterId;
  idCardFormat.createByIp = options.user.userIpAddress;
});

IdCardFormat.addHook('beforeUpdate', (idCardFormat, options) => {
  idCardFormat.updateBy = options.user.userMasterId;
  idCardFormat.updateByIp = options.user.userIpAddress;
});

IdCardFormat.addHook('beforeDestroy', (idCardFormat, options) => {
  idCardFormat.deleteBy = options.user.userMasterId;
  idCardFormat.deleteByIp = options.user.userIpAddress;
});

IdCardFormat.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

IdCardFormat.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

IdCardFormat.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

module.exports = IdCardFormat;
