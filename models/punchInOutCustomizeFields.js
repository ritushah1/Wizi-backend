const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { PuncInOutCustomizeFormFieldType } = require('../utils/dbUtils');
const PunchInOutCustomizeForm = require('./punchInOutCustomizeForm');
const UserMaster = require('./userMaster');
const tableName = 'punchInOutCustomizeField';
const punchInOutCustomizeFields = sequelize.define(
  tableName,
  {
    punchInOutCustomizeFieldsID: {
      type: Sequelize.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    index: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    fieldLabel: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    inputType: {
      type: Sequelize.ENUM(...Object.values(PuncInOutCustomizeFormFieldType)),
      allowNull: false,
    },
    isRequired: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },
    values:{
       type:Sequelize.ARRAY(Sequelize.STRING),
       allowNull:true
    },
    punchInOutCustomizeFormID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    updateBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteBy: {
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
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    paranoid: true,
  },
);
punchInOutCustomizeFields.addHook(
  'beforeCreate',
  (punchInOutCustomizeFields, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    punchInOutCustomizeFields.createBy = options.user.userMasterId;
    punchInOutCustomizeFields.updateBy = options.user.userMasterId;
    punchInOutCustomizeFields.createByIp = options.user.userIpAddress;
    punchInOutCustomizeFields.updateByIp = options.user.userIpAddress;
  },
);

punchInOutCustomizeFields.addHook(
  'beforeUpdate',
  (punchInOutCustomizeFields, options) => {
    punchInOutCustomizeFields.updateBy = options.user.userMasterId;
    punchInOutCustomizeFields.ipAddress = options.user.userIpAddress;
    punchInOutCustomizeFields.updateByIp = options.user.userIpAddress;
  },
);

punchInOutCustomizeFields.addHook(
  'beforeDestroy',
  async (punchInOutCustomizeFields, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    punchInOutCustomizeFields.deleteBy = options.user.userMasterId;
    punchInOutCustomizeFields.deleteByIp = options.user.userIpAddress;
    await punchInOutCustomizeFields.save({
      hooks: false,
      transaction: options.transaction,
    });
  },
);

punchInOutCustomizeFields.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});
punchInOutCustomizeFields.belongsTo(UserMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});
punchInOutCustomizeFields.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

punchInOutCustomizeFields.belongsTo(PunchInOutCustomizeForm, {
  foreignKey: { name: 'punchInOutCustomizeFormID' },
});

PunchInOutCustomizeForm.hasMany(punchInOutCustomizeFields,{
    as:'fields',
    foreignKey:{name:'punchInOutCustomizeFormID'}
})

module.exports = punchInOutCustomizeFields;
