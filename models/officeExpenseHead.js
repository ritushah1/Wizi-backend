const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'officeExpenseHead';
const OfficeExpenseCategory = require('./officeExpenseCategory');
const OfficeExpenseHeadAmend = require('./officeExpenseHeadAmends');
const UserMaster = require('./userMaster');
const OfficeExpenseHead = sequelize.define(
  table_name,
  {
    officeExpenseHeadID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    officeExpenseHead: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    officeExpenseCategoryID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    status: {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.INTEGER,
    },
    updateBy: {
      type: Sequelize.INTEGER,
    },
    deleteBy: {
      type: Sequelize.INTEGER,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  },
);

OfficeExpenseHead.addHook('beforeCreate', (officeExpenseHead, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  officeExpenseHead.createBy = options.user.userMasterId;
  officeExpenseHead.updateBy = options.user.userMasterId;
  officeExpenseHead.createByIp = options.user.userIpAddress;
  officeExpenseHead.updateByIp = options.user.userIpAddress;
});

OfficeExpenseHead.addHook('beforeUpdate', (officeExpenseHead, options) => {
  officeExpenseHead.updateBy = options.user.userMasterId;
  officeExpenseHead.ipAddress = options.user.userIpAddress;
  officeExpenseHead.updateByIp = options.user.userIpAddress;
});

OfficeExpenseHead.addHook(
  'beforeDestroy',
  async (officeExpenseHead, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    officeExpenseHead.deleteBy = options.user.userMasterId;
    officeExpenseHead.deleteByIp = options.user.userIpAddress;
    await officeExpenseHead.save({
      hooks: false,
      transaction: options.transaction,
    });
  },
);

OfficeExpenseHead.addHook('beforeSave', async (officeExpenseHead, options) => {
  officeExpenseHead.user = options.user;
});
OfficeExpenseHead.addHook(
  'beforeBulkCreate',
  async (officeExpenseHead, options) => {
    officeExpenseHead.user = options.user;
  },
);
OfficeExpenseHead.addHook('afterSave', async (officeExpenseHead, options) => {
  await addOfficeExpenseHeadAmend(officeExpenseHead, options);
});
OfficeExpenseHead.addHook(
  'afterBulkCreate',
  async (officeExpenseHead, options) => {
    await addOfficeExpenseHeadAmend(officeExpenseHead, options);
  },
);

async function addOfficeExpenseHeadAmend(officeExpenseHead, options) {
  const list = Array.isArray(officeExpenseHead)
    ? officeExpenseHead
    : [officeExpenseHead];

  const user = Array.isArray(officeExpenseHead)
    ? officeExpenseHead.user
    : officeExpenseHead.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      officeExpenseHeadID: data.officeExpenseHeadID,
      officeExpenseHead: data.officeExpenseHead,
      officeExpenseCategoryID: data.officeExpenseCategoryID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await OfficeExpenseHeadAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

OfficeExpenseHead.belongsTo(OfficeExpenseCategory, {
  foreignKey: { name: 'officeExpenseCategoryID' },
});

OfficeExpenseHead.belongsTo(OfficeExpenseCategory, {
  as: 'oec',
  foreignKey: { name: 'officeExpenseCategoryID' },
});

OfficeExpenseHeadAmend.belongsTo(OfficeExpenseHead, {
  as: 'officeExpenseAmends',
  foreignKey: { name: 'officeExpenseHeadID' },
});

OfficeExpenseHead.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

OfficeExpenseHead.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

OfficeExpenseHead.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = OfficeExpenseHead;
