const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'expensePurpose';
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const ExpensePurposeAmend = require('./expensePurposeAmends');
const ExpensePurpose = sequelize.define(
  table_name,
  {
    expensePurposeID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    name: {
      type: Sequelize.STRING,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    updateBy: {
      type: Sequelize.BIGINT,
    },
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    updateByIp: {
      type: Sequelize.STRING,
      allowNull: true,
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
  },
);

ExpensePurpose.addHook('beforeCreate', (expensePurpose, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  expensePurpose.createBy = options.user.userMasterId;
  expensePurpose.createByIp = options.user.userIpAddress;
});

ExpensePurpose.addHook('beforeUpdate', (expensePurpose, options) => {
  expensePurpose.updateBy = options.user.userMasterId;
  expensePurpose.updateByIp = options.user.userIpAddress;
});

ExpensePurpose.addHook('beforeDestroy', async (ExpensePurpose, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  ExpensePurpose.deleteBy = options.user.userMasterId;
  ExpensePurpose.deleteByIp = options.user.userIpAddress;
  await ExpensePurpose.save({
    hooks: false,
    transaction: options.transaction,
  });
});

ExpensePurpose.addHook('beforeSave', async (expensePurpose, options) => {
  expensePurpose.user = options.user;
});

ExpensePurpose.addHook('afterSave', async (expensePurpose, options) => {
  await addExpensePurposeAmend(expensePurpose, options);
});

async function addExpensePurposeAmend(expensePurpose, options) {
  const list = Array.isArray(expensePurpose)
    ? expensePurpose
    : [expensePurpose];

  const user = Array.isArray(expensePurpose)
    ? expensePurpose.user
    : expensePurpose.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      expensePurposeID: data.expensePurposeID,
      companyMasterID: data.companyMasterID,
      name: data.name,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await ExpensePurposeAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

ExpensePurpose.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

ExpensePurpose.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

ExpensePurpose.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

ExpensePurpose.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

ExpensePurposeAmend.belongsTo(ExpensePurpose, {
  foreignKey: { name: 'expensePurposeID' },
});

module.exports = ExpensePurpose;
