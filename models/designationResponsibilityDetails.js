const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const designationResponsibility = require('./designationResponsibility');
const tableName = 'designationResponsibilityDetails';
const designationResponsibilityDetails = sequelize.define(
  tableName,
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    responsibilityDescription: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    desigRespoID: {
      type: Sequelize.INTEGER,
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
designationResponsibilityDetails.addHook(
  'beforeCreate',
  (designationResponsibilityDetails, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    designationResponsibilityDetails.createBy = options.user.userMasterId;
    designationResponsibilityDetails.updateBy = options.user.userMasterId;
    designationResponsibilityDetails.createByIp = options.user.userIpAddress;
    designationResponsibilityDetails.updateByIp = options.user.userIpAddress;
  },
);

designationResponsibilityDetails.addHook(
  'beforeUpdate',
  (designationResponsibilityDetails, options) => {
    designationResponsibilityDetails.updateBy = options.user.userMasterId;
    designationResponsibilityDetails.updateByIp = options.user.userIpAddress;
  },
);

designationResponsibilityDetails.addHook(
  'beforeDestroy',
  async (designationResponsibilityDetails, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    designationResponsibilityDetails.deleteBy = options.user.userMasterId;
    designationResponsibilityDetails.deleteByIp = options.user.userIpAddress;
    await designationResponsibilityDetails.save({
      hooks: false,
      transaction: options.transaction,
    });
  },
);

designationResponsibilityDetails.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

designationResponsibilityDetails.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

designationResponsibilityDetails.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});
designationResponsibilityDetails.belongsTo(designationResponsibility, {
  as: 'DR',
  foreignKey: { name: 'desigRespoID' },
});

designationResponsibility.hasMany(designationResponsibilityDetails, {
  as: 'DRD',
  foreignKey: { name: 'desigRespoID' },
});

module.exports = designationResponsibilityDetails;
