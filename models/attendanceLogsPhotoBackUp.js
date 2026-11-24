const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const AttendanceLogsPhotoBackUp = sequelize.define(
  'attendanceLogsPhotoBackUp',
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    attendanceLogID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    photo: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    fileUrl: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
  },
);

module.exports = AttendanceLogsPhotoBackUp;
