const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const table_name = 'employeeReportTo';
const EmployeeReportTo = sequelize.define(
  table_name,
  {
    employeeReportToID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    reportToID: {
      type: Sequelize.INTEGER,
      allowNull: false,
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
  },
  {
    indexes: [
      {
        unique: false,
        fields: ['userMasterID'],
      },
      {
        unique: false,
        fields: ['reportToID'],
      },
      {
        unique: false,
        fields: ['reportToID', 'userMasterID'],
      },
      {
        unique: false,
        fields: ['reportToID', 'userMasterID', 'status'],
      },
    ],
  },
);

EmployeeReportTo.addHook('beforeBulkCreate', (items, options) => {
  items.forEach((item) => {
    item.createBy = options.user.userMasterId;
    item.createByIp = options.user.userIpAddress;
  });
});
EmployeeReportTo.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

EmployeeReportTo.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

EmployeeReportTo.belongsTo(UserMaster, {
  as: 'employee',
  foreignKey: { name: 'userMasterID' },
});
EmployeeReportTo.belongsTo(UserMaster, {
  as: 'reportTo',
  foreignKey: { name: 'reportToID' },
});
UserMaster.hasMany(EmployeeReportTo, {
  foreignKey: { name: 'userMasterID' },
});
EmployeeReportTo.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

EmployeeReportTo.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

module.exports = EmployeeReportTo;
