const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'shiftTime';
const Shift = require('./shift');
const ShiftTIme = sequelize.define(
  table_name,
  {
    shiftTimeID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    shiftID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    day: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    statTime: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    firsthalfendtime: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    secondhalfstarttime: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    endtime: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    totalhours: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    totalhourshalfday: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    missPunchMinutes: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    paranoid: true,
    indexes: [
      {
        unique: false,
        fields: ['shiftID'],
      },
      {
        unique: false,
        fields: ['day'],
      },
    ],
  },
);

ShiftTIme.belongsTo(Shift, { foreignKey: { name: 'shiftID' } });

Shift.hasMany(ShiftTIme, { foreignKey: { name: 'shiftID' } });
Shift.hasMany(ShiftTIme, { as: 'shiftTime', foreignKey: { name: 'shiftID' } });

ShiftTIme.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

module.exports = ShiftTIme;
