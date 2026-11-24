const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'customerIndustry';
const CompanyMaster = require('./companyMaster');
const CustomerIndustryAmend = require('./customerIndustryAmends');
const UserMaster = require('./userMaster');
const CustomerIndustry = sequelize.define(
  table_name,
  {
    customerIndustryID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: Sequelize.STRING,
    },
    companyMasterID: {
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
    },
    updateBy: {
      type: Sequelize.BIGINT,
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
  },
  {
    paranoid: true,
  },
);
CustomerIndustry.addHook('beforeCreate', (customerIndustry, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  customerIndustry.createBy = options.user.userMasterId;
  customerIndustry.createByIp = options.user.userIpAddress;
});

CustomerIndustry.addHook('beforeUpdate', (customerIndustry, options) => {
  customerIndustry.updateBy = options.user.userMasterId;
  customerIndustry.ipAddress = options.user.userIpAddress;
  customerIndustry.updateByIp = options.user.userIpAddress;
});

CustomerIndustry.addHook('beforeDestroy', async (customerIndustry, options) => {
  customerIndustry.deleteBy = options.user.userMasterId;
  customerIndustry.deleteByIp = options.user.userIpAddress;
  await customerIndustry.save({
    hooks: false,
    transaction: options.transaction,
  });
});

CustomerIndustry.addHook('beforeSave', async (CustomerIndustry, options) => {
  CustomerIndustry.user = options.user;
});
// CustomerIndustry.addHook('beforeBulkCreate', async (CustomerIndustry, options) => {
//   CustomerIndustry.user = options.user;
// });
CustomerIndustry.addHook('afterSave', async (CustomerIndustry, options) => {
  await addCustomerIndustryAmend(CustomerIndustry, options);
});
// CustomerIndustry.addHook('afterBulkCreate', async (CustomerIndustry, options) => {
//   await addCustomerIndustryAmend(CustomerIndustry, options);
// });

async function addCustomerIndustryAmend(customerIndustry, options) {
  const list = Array.isArray(customerIndustry)
    ? customerIndustry
    : [customerIndustry];

  const user = customerIndustry.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      customerIndustryID: data.customerIndustryID,
      name: data.name,
      companyMasterID: data.companyMasterID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await CustomerIndustryAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

CustomerIndustry.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

CustomerIndustry.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

CustomerIndustry.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});
CustomerIndustry.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

CustomerIndustryAmend.belongsTo(CustomerIndustry, {
  foreignKey: { name: 'customerIndustryID' },
});

module.exports = CustomerIndustry;
