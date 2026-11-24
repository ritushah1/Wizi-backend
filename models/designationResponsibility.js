const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const Designation = require('./designation');
const tableName = 'designationResponsibility';
const designationResponsibility = sequelize.define(
  tableName,
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    responsibilityName: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    designationId: {
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
designationResponsibility.addHook(
  'beforeCreate',
  (designationResponsibility, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    designationResponsibility.createBy = options.user.userMasterId;
    designationResponsibility.updateBy = options.user.userMasterId;
    designationResponsibility.createByIp = options.user.userIpAddress;
    designationResponsibility.updateByIp = options.user.userIpAddress;
  },
);

designationResponsibility.addHook(
  'beforeUpdate',
  (designationResponsibility, options) => {
    designationResponsibility.updateBy = options.user.userMasterId;
    designationResponsibility.updateByIp = options.user.userIpAddress;
  },
);

designationResponsibility.addHook(
  'beforeDestroy',
  async (designationResponsibility, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    designationResponsibility.deleteBy = options.user.userMasterId;
    designationResponsibility.deleteByIp = options.user.userIpAddress;
    await designationResponsibility.save({
      hooks: false,
      transaction: options.transaction,
    });
  },
);

designationResponsibility.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

designationResponsibility.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

designationResponsibility.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

designationResponsibility.belongsTo(Designation, {
  foreignKey: { name: 'designationId' },
});


module.exports = designationResponsibility;
