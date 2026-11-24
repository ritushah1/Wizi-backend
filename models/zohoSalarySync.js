const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { accountingTypeEnum } = require('../utils/dbUtils');
const ZohoIntegration = require('./zohoIntegration');
const BranchMaster = require('./branchMaster');
const UserMaster = require('./userMaster');
const companyMaster = require('./companyMaster');
const  tableName = 'zohoSalarySync';

const ZohoSalarySync = sequelize.define(
  tableName,
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

     zohoIntegrationID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

      branchMasterID: {
      type: Sequelize.INTEGER,
     
    },

      userMasterID: {
      type: Sequelize.BIGINT,
    },
    salaryMonth:{
         type: Sequelize.INTEGER,
      allowNull: true,
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
            journal_id:{
              type:Sequelize.STRING
            }
  },
  {
    indexes: [
      {
        unique: false,
        fields: ['companyMasterID'],
      },
      {
        unique:false,
        fields:['zohoIntegrationID']
      }
    ],
  },
);

ZohoSalarySync.belongsTo(ZohoIntegration, {
  foreignKey: { name: 'zohoIntegrationID' },
});

ZohoSalarySync.belongsTo(BranchMaster, {
  foreignKey: { name: 'branchMasterID' },
});

ZohoSalarySync.belongsTo(UserMaster, {
  foreignKey: { name: 'userMasterID' },
});

ZohoSalarySync.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

ZohoSalarySync.addHook('beforeCreate', (ZohoSalarySync, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    ZohoSalarySync.createBy = options.user.userMasterId;
    ZohoSalarySync.createByIp = options.user.userIpAddress;
});

ZohoSalarySync.addHook('beforeUpdate', (ZohoSalarySync, options) => {
    // Set updateBy and ipAddress based on the authenticated user
    ZohoSalarySync.updateBy = options.user.userMasterId;
    ZohoSalarySync.updateByIp = options.user.userIpAddress;
});

module.exports = ZohoSalarySync;
