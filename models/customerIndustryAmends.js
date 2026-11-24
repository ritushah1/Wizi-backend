const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const CustomerIndustryAmend = sequelize.define(
  'customerIndustryAmend',
  {
    customerIndustryAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    customerIndustryID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
    },
    status: {
      type: Sequelize.INTEGER,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    timestamps: true,
    paranoid: false,
    updatedAt: false,
    indexes: [
      {
        fields: ['customerIndustryAmendID'],
      },
    ],
  },
);
CustomerIndustryAmend.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
CustomerIndustryAmend.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
});

module.exports = CustomerIndustryAmend;
