const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const companyMaster = require('./companyMaster');
const table_name = 'expenseApplyConfig';

const ExpenseApplyConfig = sequelize.define(
  table_name,
  {
    expenseApplyConfigID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    fromDay: {
      type: Sequelize.BIGINT,
    },
    today: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    applyTillDay: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    applyTillMonthOffset: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      //   applyTillMonthOffset INT NOT NULL DEFAULT 0
      //   -- 0 = same month, 1 = next month
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
      type: Sequelize.INTEGER,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  }
);

ExpenseApplyConfig.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

ExpenseApplyConfig.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

ExpenseApplyConfig.addHook('beforeDestroy', (item, options) => {
  item.deleteBy = options.user.userMasterId;
  item.deleteByIp = options.user.userIpAddress;
});

ExpenseApplyConfig.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
companyMaster.hasMany(ExpenseApplyConfig, {
  foreignKey: { name: 'companyMasterID' },
});

ExpenseApplyConfig.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

ExpenseApplyConfig.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

ExpenseApplyConfig.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});
module.exports = ExpenseApplyConfig;
