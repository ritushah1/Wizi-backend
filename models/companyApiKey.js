const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'companyApiKey';
const userMaster = require('./userMaster');
const companyMaster = require('./companyMaster');

const CompanyApiKey = sequelize.define(
  table_name,
  {
    companyApiKeyID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notNull: { msg: 'Company Master ID is required' },
        isInt: { msg: 'Company Master ID must be an integer' },
      },
    },
    apiKey: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '0 = Inactive , 1 = Active',
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    updateBy: {
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
    deleteBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    showChildParentCompanyData: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  {
    paranoid: true,
  },
);

CompanyApiKey.addHook('beforeCreate', (instance, options) => {
  if (options.user) {
    instance.createBy = options.user.userMasterId;
    instance.createByIp = options.user.userIpAddress;
  }
});

CompanyApiKey.addHook('beforeUpdate', (instance, options) => {
  if (options.user) {
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

CompanyApiKey.addHook('beforeDestroy', (instance, options) => {
  if (options.user) {
    instance.deletedBy = options.user.userMasterId;
    instance.deletedByIp = options.user.userIpAddress;
  }
});

CompanyApiKey.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

companyMaster.hasMany(CompanyApiKey, {
  foreignKey: { name: 'companyMasterID' },
});

CompanyApiKey.belongsTo(userMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

CompanyApiKey.belongsTo(userMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

CompanyApiKey.belongsTo(userMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

module.exports = CompanyApiKey;
