const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const ExpensePolicy = require('./expensePolicy');
const Designation = require('./designation');
const table_name = 'expenseDesignation';

const ExpenseDesignation = sequelize.define(
  table_name,
  {
    expenseDesignationID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    expensePolicyID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Expense Policy Is Required!!!' },
      },
    },
    designationID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Designation Is Required!!!' },
      },
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
  {
    paranoid: true,
  }
);

ExpenseDesignation.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

ExpenseDesignation.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

ExpenseDesignation.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

ExpenseDesignation.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

ExpenseDesignation.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

ExpenseDesignation.belongsTo(ExpensePolicy, {
  foreignKey: { name: 'expensePolicyID' },
});

ExpenseDesignation.belongsTo(Designation, {
  as: 'Designation',
  foreignKey: { name: 'designationID' },
});

Designation.hasMany(ExpenseDesignation, {
  foreignKey: { name: 'designationID' },
});

ExpensePolicy.hasMany(ExpenseDesignation, {
  foreignKey: { name: 'expensePolicyID' },
});


module.exports = ExpenseDesignation;
