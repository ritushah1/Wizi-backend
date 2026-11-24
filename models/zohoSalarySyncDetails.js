const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { accountingTypeEnum } = require('../utils/dbUtils');
const ZohoIntegration = require('./zohoIntegration');
const BranchMaster = require('./branchMaster');
const UserMaster = require('./userMaster');
const companyMaster = require('./companyMaster');
const HRSalaryFields = require('./hrSalaryFields');
const ZohoSalarySync = require('./zohoSalarySync');
const  tableName = 'zohoSalarySyncDetails';

const ZohoSalarySyncDetails = sequelize.define(
  tableName,
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

     zohoSalarySyncID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    salaryFieldID: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        amount:{
 type: Sequelize.FLOAT,
          allowNull: false,
        },
      accountID: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
    
        accountName: {
          type: Sequelize.STRING(300),
          allowNull: true,
        },
    
        accountType: {
          type: Sequelize.STRING(300),
          allowNull: true,
        },

    createBy: {
        type: Sequelize.BIGINT,
        },
  createByIp: {
        type: Sequelize.STRING,
            },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['zohoSalarySyncID','salaryFieldID'],
      },
    ],
  },
);


ZohoSalarySyncDetails.belongsTo(HRSalaryFields, {
  foreignKey: { name: 'salaryFieldID' },
});

ZohoSalarySyncDetails.belongsTo(ZohoSalarySync, {
  foreignKey: { name: 'zohoSalarySyncID' },
});

ZohoSalarySync.hasMany(ZohoSalarySyncDetails, {
  foreignKey: { name: 'zohoSalarySyncID' },
  as:'zscd'
});

ZohoSalarySyncDetails.addHook('beforeCreate', (ZohoSalarySyncDetails, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    ZohoSalarySyncDetails.createBy = options.user.userMasterId;
    ZohoSalarySyncDetails.createByIp = options.user.userIpAddress;
});


module.exports = ZohoSalarySyncDetails;
