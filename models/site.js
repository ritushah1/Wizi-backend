const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'site';
const UserMaster = require('./userMaster');
const companyMaster = require('./companyMaster');
const BranchMaster = require('./branchMaster');
const SiteAmend = require('./siteAmends');

const Site = sequelize.define(
  table_name,
  {
    siteID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    siteName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    siteCode: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    branchMasterID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: true,
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
  }
);

Site.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

Site.belongsTo(BranchMaster, {
  foreignKey: { name: 'branchMasterID' },
});
Site.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

Site.belongsTo(UserMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

Site.belongsTo(UserMaster, {
  as: 'deletedByUserDetails',
  foreignKey: { name: 'deleteBy' },
});
SiteAmend.belongsTo(Site, {
  foreignKey: { name: 'siteID' },
});

Site.addHook('beforeCreate', (data, options) => {
  data.createBy = options.user.userMasterId;
  data.createByIp = options.user.userIpAddress;
});

Site.addHook('beforeUpdate', (data, options) => {
  data.updateBy = options.user.userMasterId;
  data.updateByIp = options.user.userIpAddress;
});

Site.addHook('beforeDestroy', async (Site, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  Site.deleteBy = options.user.userMasterId;
  Site.deleteByIp = options.user.userIpAddress;
  await Site.save({
    hooks: false,
    transaction: options.transaction,
  });
});
Site.addHook('beforeSave',async(data,options)=>{
  data.user=options.user
})
Site.addHook('afterSave',async(data,options)=>{
  await addSiteAmend(data,options);
})

async function addSiteAmend(data, options) {
  const list = Array.isArray(data) ? data : [data];

  const user = Array.isArray(data)
    ? data.user
    : data.user;

  const rows = list.map((data) => {
    const siteData = data.get({ plain: true });

    return {
      siteID: siteData.siteID,
      siteName: siteData.siteName,
      siteCode: siteData.siteCode,
      companyMasterID: siteData.companyMasterID,
      branchMasterID: siteData.branchMasterID,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await SiteAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}
module.exports = Site;
