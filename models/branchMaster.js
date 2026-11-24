const UserMaster = require('./userMaster');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CityMaster = require('./citymaster');
const companyMaster = require('./companyMaster');
const BranchAmend = require('./branchMasterAmend');
const table_name = 'branchMaster';
const BranchMaster = sequelize.define(
  table_name,
  {
    branchMasterID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    branchName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    branchCode: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    branchAddress: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    latitude: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    longitude: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    radius: {
      type: Sequelize.DECIMAL(12, 4),
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
    gstNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    lwfNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    professionaltaxNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    pfNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    esicNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    paranoid: true,
    indexes: [
      {
        unique: false,
        fields: ['branchName'],
      },
      {
        unique: false,
        fields: ['branchCode'],
      },
      {
        unique: false,
        fields: ['companyMasterID'],
      },
    ],
  },
);

BranchMaster.addHook('beforeDestroy', async (BranchMaster, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  BranchMaster.deleteBy = options.user.userMasterId;
  BranchMaster.deleteByIp = options.user.userIpAddress;
  await BranchMaster.save({
    hooks: false,
    transaction: options.transaction,
  });
});
BranchMaster.addHook('beforeCreate', (BranchMaster, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  BranchMaster.createBy = options.user.userMasterId;
  BranchMaster.updateBy = options.user.userMasterId;
  BranchMaster.createByIp = options.user.userIpAddress;
  BranchMaster.updateByIp = options.user.userIpAddress;
});

BranchMaster.addHook('beforeUpdate', (BranchMaster, options) => {
  BranchMaster.updateBy = options.user.userMasterId;
  BranchMaster.ipAddress = options.user.userIpAddress;
  BranchMaster.updateByIp = options.user.userIpAddress;
});

BranchMaster.addHook('beforeSave', async (branch, options) => {
  branch.user = options.user;
});

BranchMaster.addHook('afterSave', async (branch, options) => {
  await addBranchAmend(branch, options);
});

async function addBranchAmend(branch, options) {
  const list = Array.isArray(branch) ? branch : [branch];
  const user = Array.isArray(branch) ? branch.user : branch.user;
  const rows = list.map((branch) => {
    const data = branch.get({ plain: true });

    return {
      branchMasterID: data.branchMasterID,
      companyMasterID: data.companyMasterID,
      cityMasterID: data.cityMasterID,
      branchName: data.branchName,
      branchCode: data.branchCode,
      branchAddress: data.branchAddress,
      latitude: data.latitude,
      longitude: data.longitude,
      radius: data.radius,
      gstNumber: data.gstNumber,
      lwfNumber: data.lwfNumber,
      professionaltaxNumber: data.professionaltaxNumber,
      pfNumber: data.pfNumber,
      esicNumber: data.esicNumber,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await BranchAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

BranchMaster.belongsTo(CityMaster, { foreignKey: { name: 'cityMasterID' } });
BranchMaster.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

BranchMaster.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

BranchMaster.belongsTo(UserMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

BranchMaster.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

companyMaster.hasMany(BranchMaster, {
  foreignKey: { name: 'companyMasterID' },
  as: 'br_master',
});
BranchAmend.belongsTo(BranchMaster, {
  foreignKey: { name: 'branchMasterID' },
});

module.exports = BranchMaster;
