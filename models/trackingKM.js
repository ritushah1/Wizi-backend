const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'trackingKM';
// ----------------------------------------------------------- Never Sync This Table Manual -------------------------------------------------
const TrackingKM = sequelize.define(table_name, {
  //primary key
  TrackingKMID: {
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
  date: {
    type: Sequelize.DATEONLY,
    allowNull: true,
  },
  kilometer: {
    type: Sequelize.FLOAT,
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
  osr_Km: {
    type: Sequelize.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
});

TrackingKM.belongsTo(UserMaster, { foreignKey: { name: 'userMasterID' } });
module.exports = TrackingKM;

// ---------------------------------------------------------Do Not Remove Below Script -----------------------------------------------------------

// -- Parent partitioned table
// CREATE TABLE "trackingKMs" (
//   "TrackingKMID" BIGSERIAL,   -- auto increment
//   "userMasterID" BIGINT NOT NULL,
//   "Lattitude" VARCHAR,
//   "Longitude" VARCHAR,
//   "date" DATE,
//   "kilometer" FLOAT,
//   "createBy" BIGINT,
//   "updateBy" BIGINT,
//   "createByIp" VARCHAR,
//   "updateByIp" VARCHAR,
//   "Status" INTEGER DEFAULT 1 NOT NULL,
//   "Address" VARCHAR,
//   "Track_datetime" TIMESTAMP NOT NULL,  -- ✅ partition key
//   "Battery" VARCHAR,
//   "Gps" VARCHAR,
//   "Wifi" VARCHAR,
//   "Mobile_name" VARCHAR,
//   "type" VARCHAR,
//   "developerMode" VARCHAR DEFAULT 'off' NOT NULL,
//   "geofence" VARCHAR,
//   "createdAt" TIMESTAMP DEFAULT now() NOT NULL,
//   "updatedAt" TIMESTAMP DEFAULT now() NOT NULL,
//   PRIMARY KEY ("TrackingKMID", "Track_datetime"),
//   CONSTRAINT fk_trackingKMs_user FOREIGN KEY ("userMasterID")
//     REFERENCES "userMasters"("userMasterID") ON DELETE CASCADE
// ) PARTITION BY RANGE ("Track_datetime");

// -- ✅ Indexes
// -- 1. Index on userMasterID for filtering by user
// CREATE INDEX idx_trackingKMs_userMasterID ON "trackingKMs" ("userMasterID");

// -- 2. Index on Track_datetime for partition pruning and range queries
// CREATE INDEX idx_trackingKMs_trackdatetime ON "trackingKMs" ("Track_datetime");

// -- 3. Composite index for faster "get user data on a specific date"
// CREATE INDEX idx_trackingKMs_user_date ON "trackingKMs" ("userMasterID", "date");

// -- Partition for January 2025
// CREATE TABLE trackingKMs_2025_01
//   PARTITION OF "trackingKMs"
//   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
