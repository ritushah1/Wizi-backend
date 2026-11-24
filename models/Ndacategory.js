const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const CompanyMaster = require('./companyMaster');
const NdacategoryAmend = require('./NdaCategoryAmends');
const table_name = 'Ndacategory';
const ndacategory = sequelize.define(table_name, {
  Ndacategoryid: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  nda_category: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  companyMasterID: {
    type: Sequelize.INTEGER,
    allowNull: false,
    //forign key
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
  deleteBy:{
    type: Sequelize.BIGINT,
    allowNull:true
  },
  createByIp: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  updateByIp: {
    type: Sequelize.STRING,
    allowNull: true,
  },
},{paranoid:true});

ndacategory.addHook('beforeCreate', (ndacategory, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  ndacategory.createBy = options.user.userMasterId;
  ndacategory.updateBy = options.user.userMasterId;
  ndacategory.createByIp = options.user.userIpAddress;
  ndacategory.updateByIp = options.user.userIpAddress;
});

ndacategory.addHook('beforeUpdate', (ndacategory, options) => {
  ndacategory.updateBy = options.user.userMasterId;
  ndacategory.ipAddress = options.user.userIpAddress;
  ndacategory.updateByIp = options.user.userIpAddress;
});

ndacategory.addHook('beforeDestroy', async (ndacategory, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  ndacategory.deleteBy = options.user.userMasterId;
  ndacategory.deleteByIp = options.user.userIpAddress;
  await ndacategory.save({
    hooks: false,
    transaction: options.transaction,
  });
});

ndacategory.addHook('beforeSave', async (ndacategory, options) => {
  ndacategory.user = options.user;
});
ndacategory.addHook('beforeBulkCreate', async (ndacategory, options) => {
  ndacategory.user = options.user;
});
ndacategory.addHook('afterSave', async (ndacategory, options) => {
  await addNdacategoryAmend(ndacategory, options);
});
ndacategory.addHook('afterBulkCreate', async (ndacategory, options) => {
  await addNdacategoryAmend(ndacategory, options);
});

async function addNdacategoryAmend(ndacategories, options) {
  const list = Array.isArray(ndacategories)
    ? ndacategories
    : [ndacategories];

  const user = ndacategories.user;

  const rows = list.map((ndacategory) => {
    const data = ndacategory.get({ plain: true });

    return {
      Ndacategoryid: data.Ndacategoryid,
      nda_category: data.nda_category,
      companyMasterID: data.companyMasterID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await NdacategoryAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

ndacategory.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
NdacategoryAmend.belongsTo(ndacategory, {
  as:'ndaCategory',
  foreignKey: { name: 'Ndacategoryid' },
});
ndacategory.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

ndacategory.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

ndacategory.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});


module.exports = ndacategory;
