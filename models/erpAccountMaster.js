const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const table_name = 'erpAcountMaster';
const UserMaster = require('./userMaster');
const erpAcountMasters = sequelize.define(
  table_name,
  {
    erpAcountMasterID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    erpAcountID: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    userMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    erpAccountName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.BIGINT,
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
  },
  {
    indexes: [
      {
        unique: false,
        fields: ['erpAcountID'],
      },
      {
        unique: false,
        fields: ['userMasterID'],
      },
    ],
  }
);

erpAcountMasters.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

erpAcountMasters.belongsTo(UserMaster, {
  foreignKey: { name: 'userMasterID' },
});
UserMaster.hasMany(erpAcountMasters, {
  foreignKey: { name: 'userMasterID' },
});
erpAcountMasters.belongsTo(UserMaster, {
  as: 'c_By',
  foreignKey: { name: 'createBy' },
});

erpAcountMasters.belongsTo(UserMaster, {
  as: 'u_By',
  foreignKey: { name: 'updateBy' },
});
module.exports = erpAcountMasters;
