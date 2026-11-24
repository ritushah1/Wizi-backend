const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const table_name = 'ndacategoryAmend';

const NdacategoryAmend = sequelize.define(
  table_name,
  {
    ndacategoryAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

    Ndacategoryid: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    nda_category: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
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

    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    timestamps:true,
    updatedAt:false,
    indexes: [
      {
        fields: ['Ndacategoryid'],
      },
    ],
  }
);


NdacategoryAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
NdacategoryAmend.belongsTo(UserMaster,{
  foreignKey:{name:'createBy'}
})

module.exports = NdacategoryAmend;