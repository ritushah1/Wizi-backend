const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const FormMaster = require('./formMaster');
const ProductMaster = require('./productMaster');
const Operation = require('./operation');
const table_name = 'productPermission';
const ProductPermission = sequelize.define(table_name, {
  productPermissionID: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  status: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  createBy: {
    type: Sequelize.BIGINT,
    allowNull: false,
  },
  updateBy: {
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
});

ProductPermission.belongsTo(FormMaster, {
  foreignKey: { name: 'formMasterID' },
});

FormMaster.hasMany(ProductPermission, {
  foreignKey: { name: 'formMasterID' },
});

ProductPermission.belongsTo(ProductMaster, {
  foreignKey: { name: 'productMasterID' },
});

ProductMaster.hasMany(ProductPermission, {
  foreignKey: { name: 'productMasterID' },
});
ProductMaster.hasMany(ProductPermission, {
  as: 'rp',
  foreignKey: { name: 'productMasterID' },
});

ProductPermission.belongsTo(Operation, { foreignKey: { name: 'operationID' } });

module.exports = ProductPermission;
