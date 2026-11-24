const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const { vehicleTypeEnum } = require('../utils/dbUtils');
const table_name = 'vehicleUsage';

const vehicleUsage = sequelize.define(
  table_name,
  {
    vehicleUsageID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    //foreig key
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    startingMeterImage: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    isS3Starting: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    startingMeterThumb: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    startingDateTime: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    endingMeterImage: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    isS3Ending: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    endingMeterThumb: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    endingDateTime: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    startkilometer: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    endkilometer: {
      type: Sequelize.FLOAT,
      allowNull: true,
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
    vehicleType: {
      type: Sequelize.ENUM(...Object.values(vehicleTypeEnum)),
      allowNull: true,
    },
    migration: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  {
    indexes: [
      {
        unique: false,
        fields: ['userMasterID'],
      },
    ],
  },
);

vehicleUsage.belongsTo(UserMaster, { foreignKey: { name: 'userMasterID' } });

vehicleUsage.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});
vehicleUsage.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

module.exports = vehicleUsage;
