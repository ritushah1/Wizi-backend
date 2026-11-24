const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const empResponsibility = require('./empResponsibilities');
const tableName = 'empResponsibilityDetails';
const empResponsibilityDetails = sequelize.define(
  tableName,
  {
    empResDetailID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    responsibilityDescription: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    empRespoID: {
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
empResponsibilityDetails.addHook(
  'beforeCreate',
  (empResponsibilityDetails, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    empResponsibilityDetails.createBy = options.user.userMasterId;
    empResponsibilityDetails.createByIp = options.user.userIpAddress;
  },
);

empResponsibilityDetails.addHook(
  'beforeUpdate',
  (empResponsibilityDetails, options) => {
    empResponsibilityDetails.updateBy = options.user.userMasterId;
    empResponsibilityDetails.updateByIp = options.user.userIpAddress;
  },
);

empResponsibilityDetails.addHook(
  'beforeDestroy',
  async (empResponsibilityDetails, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    empResponsibilityDetails.deleteBy = options.user.userMasterId;
    empResponsibilityDetails.deleteByIp = options.user.userIpAddress;
    await empResponsibilityDetails.save({
      hooks: false,
      transaction: options.transaction,
    });
  },
);

empResponsibilityDetails.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

empResponsibilityDetails.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

empResponsibilityDetails.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

empResponsibilityDetails.belongsTo(empResponsibility, {
  as: 'ER',
  foreignKey: { name: 'empRespoID' },
});

empResponsibility.hasMany(empResponsibilityDetails, {
  as: 'ERD',
  foreignKey: { name: 'empRespoID' },
});


module.exports = empResponsibilityDetails;
