const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'fieldMap';

const FieldMap = sequelize.define(
  table_name,
  {
    fieldMapID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    tableName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    columnName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    updateBy: {
      type: Sequelize.BIGINT,
    },
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    updateByIp: {
      type: Sequelize.STRING,
      allowNull: true,
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

FieldMap.addHook('beforeCreate', (fieldmap, options) => {
  fieldmap.createBy = options.user.userMasterId;
  fieldmap.createByIp = options.user.userIpAddress;
});

FieldMap.addHook('beforeUpdate', (fieldmap, options) => {
  fieldmap.updateBy = options.user.userMasterId;
  fieldmap.updateByIp = options.user.userIpAddress;
});

FieldMap.addHook('beforeDestroy', async (FieldMap, options) => {
  FieldMap.deleteBy = options.user.userMasterId;
  FieldMap.deleteByIp = options.user.userIpAddress;
  await FieldMap.save({
    hooks: false,
    transaction: options.transaction,
  });
});

FieldMap.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

FieldMap.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

FieldMap.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

module.exports = FieldMap;
