const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'trackingOld';

const TrackingOld = sequelize.define(
  table_name,
  {
    //primary key
    UserTrackingID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    //foreign key
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    Lattitude: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    Longitude: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    Address: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    Track_datetime: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    Battery: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    Gps: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    Wifi: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    Mobile_name: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    type: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
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
    Status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    developerMode: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'off',
    },
    geofence: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    accuracy: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    batteryOptimization: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    batterySaver: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    indexes: [
      {
        unique: false,
        fields: ['userMasterID', 'Track_datetime'],
      },
      {
        unique: false,
        fields: ['Track_datetime'],
      },
    ],
  },
);
TrackingOld.belongsTo(UserMaster, { foreignKey: { name: 'userMasterID' } });
UserMaster.hasMany(TrackingOld, { foreignKey: { name: 'userMasterID' } });

module.exports = TrackingOld;
