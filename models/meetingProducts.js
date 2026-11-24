const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const VisitMeetings = require('./visitMeetings');
const Product = require('./product');
const table_name = 'meetingProduct';

const MeetingProduct = sequelize.define(
  table_name,
  {
    meetingProductID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    productID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    visitMeetingID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    createdBy: {
      type: Sequelize.INTEGER,
    },
    updatedBy: {
      type: Sequelize.INTEGER,
    },
    deletedBy: {
      type: Sequelize.INTEGER,
    },
    createdByIp: {
      type: Sequelize.STRING,
    },
    updatedByIp: {
      type: Sequelize.STRING,
    },
    deletedByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  },
);

MeetingProduct.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

MeetingProduct.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

MeetingProduct.belongsTo(Product, {
  as: 'product',
  foreignKey: { name: 'productID' },
});

Product.hasMany(MeetingProduct, {
  as: 'product',
  foreignKey: { name: 'productID' },
});

MeetingProduct.belongsTo(VisitMeetings, {
  foreignKey: { name: 'visitMeetingID' },
});

VisitMeetings.hasMany(MeetingProduct, {
  foreignKey: { name: 'visitMeetingID' },
});

MeetingProduct.addHook('beforeCreate', (meetingProduct, options) => {
  meetingProduct.createdBy = options.user.userMasterId;
  meetingProduct.createdByIp = options.user.userIpAddress;
});

MeetingProduct.addHook('beforeUpdate', (meetingProduct, options) => {
  meetingProduct.updatedBy = options.user.userMasterId;
  meetingProduct.updatedByIp = options.user.userIpAddress;
});

MeetingProduct.addHook('beforeDestroy', (meetingProduct, options) => {
  meetingProduct.deletedBy = options.user.userMasterId;
  meetingProduct.deletedByIp = options.user.userIpAddress;
});

module.exports = MeetingProduct;
