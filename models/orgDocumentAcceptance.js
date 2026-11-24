const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const companyMaster = require('./companyMaster');
const { bankAccountTypeEnum } = require('../utils/dbUtils');
const BankMaster = require('./bankMaster');
const PolicyDocuments = require('./policyDocuments');
const table_name = 'orgDocumentAcceptance';

const OrgDocumentAcceptance = sequelize.define(
  table_name,
  {
    orgDocumentAcceptanceID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'User Is Required!!!' },
      },
    },
    policyDocumentID: {
      type: Sequelize.BIGINT,
      validate: {
        notEmpty: { msg: 'Policy Documents Is Required!!!' },
      },
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
      type: Sequelize.INTEGER,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
    indexes: [
      {
        unique: false,
        fields: ['userMasterID', 'policyDocumentID'],
      },
    ],
  },
);

OrgDocumentAcceptance.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

OrgDocumentAcceptance.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

OrgDocumentAcceptance.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

OrgDocumentAcceptance.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

OrgDocumentAcceptance.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

OrgDocumentAcceptance.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

OrgDocumentAcceptance.belongsTo(UserMaster, {
  foreignKey: { name: 'userMasterID' },
});

UserMaster.hasMany(OrgDocumentAcceptance, {
  as: 'orgDocAcc',
  foreignKey: { name: 'userMasterID' },
});
OrgDocumentAcceptance.belongsTo(PolicyDocuments, {
  foreignKey: { name: 'policyDocumentID' },
});

PolicyDocuments.hasMany(OrgDocumentAcceptance,{
  foreignKey:{name:'policyDocumentID'},
  as:'ODA'
})

module.exports = OrgDocumentAcceptance;
