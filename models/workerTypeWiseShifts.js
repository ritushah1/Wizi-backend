const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { workerTypesEnum } = require('../utils/dbUtils');
const Shift = require('./shift');
const UserMaster = require('./userMaster');

const WorkerTypeWiseShift = sequelize.define(
  'workerTypeWiseShift',
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    workerType: {
      type: Sequelize.ENUM(...Object.values(workerTypesEnum)),
      allowNull: false,
    },
    shiftID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },

    createByIp: {
      type: Sequelize.STRING,
    },
    updateBy: {
      type: Sequelize.BIGINT,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteBy: {
      type: Sequelize.BIGINT,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  { paranoid: true },
);

WorkerTypeWiseShift.belongsTo(Shift, {
  foreignKey: { name: 'shiftID' },
});

Shift.hasMany(WorkerTypeWiseShift, {
  as: 'workerType',
  foreignKey: { name: 'shiftID' },
});

WorkerTypeWiseShift.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

WorkerTypeWiseShift.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

WorkerTypeWiseShift.addHook('beforeCreate', (WorkerTypeWiseShift, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  WorkerTypeWiseShift.createBy = options.user.userMasterId;
  WorkerTypeWiseShift.createByIp = options.user.userIpAddress;
});

WorkerTypeWiseShift.addHook('beforeUpdate', (WorkerTypeWiseShift, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  WorkerTypeWiseShift.updateBy = options.user.userMasterId;
  WorkerTypeWiseShift.updateByIp = options.user.userIpAddress;
});

WorkerTypeWiseShift.addHook('beforeDestroy', (WorkerTypeWiseShift, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  WorkerTypeWiseShift.deleteBy = options.user.userMasterId;
  WorkerTypeWiseShift.deleteByIp = options.user.userIpAddress;
});

module.exports = WorkerTypeWiseShift;
