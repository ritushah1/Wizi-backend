const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { PuncInOutCustomizeFormFieldType } = require('../utils/dbUtils');
const PunchInOutCustomizeForm = require('./punchInOutCustomizeForm');
const UserMaster = require('./userMaster');
const tableName = 'punchInOutFormValue';
const PunchInOutFormValue = sequelize.define(tableName, {
  punchInOutCustomizeFieldsID: {
    type: Sequelize.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  fieldIndex: {
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  fieldLabel: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  inputType: {
    type: Sequelize.ENUM(...Object.values(PuncInOutCustomizeFormFieldType)),
    allowNull: true,
  },
  fieldValue: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  punchInOutCustomizeFormID: {
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  attendanceLogID: {
    // Do not Create Foreign Key
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  createBy: {
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  createByIp: {
    type: Sequelize.STRING,
    allowNull: true,
  },
});

PunchInOutFormValue.addHook('beforeCreate', (punchInOutFormValue, options) => {
  // Set createBy and ipAddress based on the authenticated user
  punchInOutFormValue.createBy = options.user.userMasterId;
  punchInOutFormValue.createByIp = options.user.userIpAddress;
});

PunchInOutFormValue.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});
PunchInOutFormValue.belongsTo(PunchInOutCustomizeForm, {
  as: 'piocf',
  foreignKey: { name: 'punchInOutCustomizeFormID' },
});


module.exports = PunchInOutFormValue;
