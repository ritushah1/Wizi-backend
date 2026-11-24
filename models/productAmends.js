const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const tableName = 'productAmend';

const ProductAmend = sequelize.define(
  tableName,
  {
    productAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    productID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    productName: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    productPhoto: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    status: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },

    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
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
        fields: ['productID'],
      },
      {
        fields: ['companyMasterID'],
      },
    ],
  }
);



ProductAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

ProductAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = ProductAmend;