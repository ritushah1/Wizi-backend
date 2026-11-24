const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const CityMaster = require('./citymaster');
const CustomerIndustry = require('./customerIndustry');
const UserMaster = require('./userMaster');

const CustomerAmend = sequelize.define(
  'customerAmend',
  {
    customerAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    customerID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    companyName: {
      type: Sequelize.STRING,
    },
    customerName: {
      type: Sequelize.STRING,
    },
    currentLocation: {
      type: Sequelize.TEXT,
    },
    mobileNumber1: {
      type: Sequelize.STRING,
    },
    mobileNumber2: {
      type: Sequelize.STRING,
    },
    email: {
      type: Sequelize.STRING,
    },
    website: {
      type: Sequelize.STRING,
    },
    latitude: {
      type: Sequelize.DECIMAL,
    },
    longitude: {
      type: Sequelize.DECIMAL,
    },
    address: {
      type: Sequelize.TEXT,
    },
    zipcode: {
      type: Sequelize.INTEGER,
    },
    cityMasterID: {
      type: Sequelize.INTEGER,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
    },
    customerIndustryID: {
      type: Sequelize.INTEGER,
    },
    radius: {
      type: Sequelize.FLOAT,
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
        fields: ['customerAmendID'],
      },
    ],
  },
);

CustomerAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

CustomerAmend.belongsTo(CityMaster, {
  foreignKey: { name: 'cityMasterID' },
});

CustomerAmend.belongsTo(CustomerIndustry, {
  foreignKey: { name: 'customerIndustryID' },
  as: 'ci',
});

CustomerAmend.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
});
module.exports = CustomerAmend;
