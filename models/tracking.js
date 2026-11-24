const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'tracking';
// const CompanyMaster = require('./companyMaster');

const Tracking = sequelize.define(
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
Tracking.belongsTo(UserMaster, { foreignKey: { name: 'userMasterID' } });
UserMaster.hasMany(Tracking, { foreignKey: { name: 'userMasterID' } });

module.exports = Tracking;

// ---------------------------------------------------------Do Not Remove Below Script -----------------------------------------------------------

// CREATE TABLE "trackings" (
//   "UserTrackingID" BIGSERIAL,   -- auto increment
//   "userMasterID" BIGINT NOT NULL,
//   "Lattitude" VARCHAR,
//   "Longitude" VARCHAR,
//   "Address" VARCHAR,
//   "Track_datetime" TIMESTAMP NOT NULL,   -- ✅ partition key
//   "Battery" VARCHAR,
//   "Gps" VARCHAR,
//   "Wifi" VARCHAR,
//   "Mobile_name" VARCHAR,
//   "type" VARCHAR,
//   "createBy" BIGINT,
//   "updateBy" BIGINT,
//   "createByIp" VARCHAR,
//   "updateByIp" VARCHAR,
//   "Status" INTEGER DEFAULT 1 NOT NULL,
//   "developerMode" VARCHAR DEFAULT 'off' NOT NULL,
//   "geofence" VARCHAR,
//   "createdAt" TIMESTAMP DEFAULT now() NOT NULL,
//   "updatedAt" TIMESTAMP DEFAULT now() NOT NULL,
//   PRIMARY KEY ("UserTrackingID", "Track_datetime"),
//   CONSTRAINT fk_trackings_user FOREIGN KEY ("userMasterID")
//     REFERENCES "userMasters"("userMasterID") ON DELETE CASCADE
// ) PARTITION BY RANGE ("Track_datetime");

// -- Index to speed up lookups by user + timestamp
// CREATE INDEX idx_trackings_user_time ON "trackings" ("userMasterID", "Track_datetime");

// -- Index to speed up range queries by timestamp
// CREATE INDEX idx_trackings_time ON "trackings" ("Track_datetime");

// -- Partition for September 2025
// CREATE TABLE "trackings_2025_09"
//   PARTITION OF "trackings"
//   FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
