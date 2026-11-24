const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const CompanyMaster = require('./companyMaster');
const table_name = 'labourServiceCharge';

const LabourServiceCharge = sequelize.define(
  table_name,
  {
    labourServiceChargeID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Company Master ID Is Required!!!' },
      },
    },
    applicableYearMonth: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Applicable Year Month Is Required!!!' },
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
  },
);

LabourServiceCharge.addHook('beforeCreate', (item, options) => {
  if (options && options.user) {
    item.createBy = options.user.userMasterId;
    item.createByIp = options.user.userIpAddress;
  }
});

LabourServiceCharge.addHook('beforeUpdate', (item, options) => {
  if (options && options.user) {
    item.updateBy = options.user.userMasterId;
    item.updateByIp = options.user.userIpAddress;
  }
});

LabourServiceCharge.addHook('beforeDestroy', async (item, options) => {
  if (options && options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

// Associations
LabourServiceCharge.belongsTo(CompanyMaster, {
  as: 'company',
  foreignKey: { name: 'companyMasterID' },
});

CompanyMaster.hasMany(LabourServiceCharge, {
  foreignKey: { name: 'companyMasterID' },
});

LabourServiceCharge.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

LabourServiceCharge.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

module.exports = LabourServiceCharge;
