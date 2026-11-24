const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CityMaster = require('./citymaster');
const table_name = 'customer';
const CompanyMaster = require('./companyMaster');
const CustomerIndustry = require('./customerIndustry');
const CustomerAmend = require('./customerAmends');
const UserMaster = require('./userMaster');
const Customer = sequelize.define(
  table_name,
  {
    customerID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyName: {
      type: Sequelize.STRING,
    },
    customerName: {
      type: Sequelize.STRING,
    },
    currentLocation: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    mobileNumber1: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    mobileNumber2: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    website: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    latitude: {
      type: Sequelize.DECIMAL,
      allowNull: true,
    },
    longitude: {
      type: Sequelize.DECIMAL,
      allowNull: true,
    },
    address: {
      type: Sequelize.TEXT,
    },
    zipcode: {
      type: Sequelize.INTEGER,
    },
    cityMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    status: {
      type: Sequelize.BIGINT,
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
    customerIndustryID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    radius: {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 50,
    },
  },
  {
    paranoid: true,
    indexes: [
      {
        unique: false,
        fields: ['companyName'],
      },
      {
        unique: false,
        fields: ['customerName'],
      },
      {
        unique: false,
        fields: ['companyMasterID'],
      },
    ],
  },
);
Customer.addHook('beforeCreate', (Customer, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  Customer.createBy = options.user.userMasterId;
  Customer.updateBy = options.user.userMasterId;
  Customer.createByIp = options.user.userIpAddress;
  Customer.updateByIp = options.user.userIpAddress;
});

Customer.addHook('beforeUpdate', (Customer, options) => {
  Customer.updateBy = options.user.userMasterId;
  Customer.ipAddress = options.user.userIpAddress;
  Customer.updateByIp = options.user.userIpAddress;
});

Customer.addHook('beforeDestroy', async (Customer, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  Customer.deleteBy = options.user.userMasterId;
  Customer.deleteByIp = options.user.userIpAddress;
  await Customer.save({
    hooks: false,
    transaction: options.transaction,
  });
});

Customer.addHook('beforeSave', async (Customer, options) => {
  Customer.user = options.user;
});
Customer.addHook('beforeBulkCreate', async (Customer, options) => {
  Customer.user = options.user;
});
Customer.addHook('afterSave', async (Customer, options) => {
  await addCustomerAmend(Customer, options);
});
Customer.addHook('afterBulkCreate', async (Customer, options) => {
  await addCustomerAmend(Customer, options);
});

async function addCustomerAmend(customer, options) {
  const list = Array.isArray(customer) ? customer : [customer];

  const user = customer.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      customerID: data.customerID,
      companyName: data.companyName,
      customerName: data.customerName,
      currentLocation: data.currentLocation,
      mobileNumber1: data.mobileNumber1,
      mobileNumber2: data.mobileNumber2,
      email: data.email,
      website: data.website,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      zipcode: data.zipcode,
      cityMasterID: data.cityMasterID,
      companyMasterID: data.companyMasterID,
      customerIndustryID: data.customerIndustryID,
      radius: data.radius,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await CustomerAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

Customer.belongsTo(CustomerIndustry, {
  foreignKey: { name: 'customerIndustryID' },
  as: 'ci',
});
CustomerIndustry.hasMany(Customer, {
  foreignKey: { name: 'customerIndustryID' },
  as: 'ci',
});
Customer.belongsTo(CompanyMaster, { foreignKey: { name: 'companyMasterID' } });
Customer.belongsTo(CityMaster, { foreignKey: { name: 'cityMasterID' } });
CustomerAmend.belongsTo(Customer, {
  foreignKey: { name: 'customerID' },
});
Customer.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

Customer.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

Customer.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = Customer;
