const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const HRSalaryFields = require('./hrSalaryFields');
const ZohoIntegration = require('./zohoIntegration');
const BranchMaster = require('../models/branchMaster');
const UserMaster = require('../models/userMaster');

const ZohoAccountMapping = sequelize.define(
  'zohoAccountMapping',
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'Company ID',
    },

    zohoIntegrationID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'Zoho Intergration ID',
    },

    salaryFieldID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'Salary Field ID reference',
    },

    accountID: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Zoho Book Account ID',
    },

    accountName: {
      type: Sequelize.STRING(300),
      allowNull: true,
      comment: 'Zoho Books Organization Name',
    },

    accountType: {
      type: Sequelize.STRING(300),
      allowNull: true,
      comment: 'Zoho Books Organization Name',
    },

    branchMasterID:{
      type: Sequelize.INTEGER,
      comment: 'Branch Master ID',
    },
    userMasterID:{
      type: Sequelize.INTEGER,
      comment: 'User Master ID',
    },
      createBy: {
            type: Sequelize.BIGINT,
            },
      createByIp: {
            type: Sequelize.STRING,
                },
  },
  {
    tableName: 'zohoAccountMappings',
    timestamps: true,
    indexes: [
      {
        unique: false,
        fields: ['salaryFieldID', 'zohoIntegrationID'],
      },
      {
        unique: false,
        fields: ['zohoIntegrationID'],
      },
      {
        unique:true,
        fields:['salaryFieldID','branchMasterID'],
        where:{
          branchMasterID:{
            [Sequelize.Op.not]:null
          }
        }
      },
       {
        unique:true,
        fields:['salaryFieldID','userMasterID'],
        where:{
          userMasterID:{
            [Sequelize.Op.not]:null
          }
        }
      }
    ],
  },
);

ZohoAccountMapping.belongsTo(HRSalaryFields, {
  foreignKey: { name: 'salaryFieldID' },
});

ZohoAccountMapping.belongsTo(ZohoIntegration, {
  foreignKey: { name: 'zohoIntegrationID' },
});

ZohoAccountMapping.belongsTo(BranchMaster, {
  foreignKey: { name: 'branchMasterID' },
});

ZohoAccountMapping.belongsTo(UserMaster, {
  foreignKey: { name: 'userMasterID' },
});

ZohoIntegration.hasMany(ZohoAccountMapping, {
  foreignKey: { name: 'zohoIntegrationID' },
  as:'zam'
});

ZohoAccountMapping.addHook('beforeCreate', (ZohoAccountMapping, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    ZohoAccountMapping.createBy = options.user.userMasterId;
    ZohoAccountMapping.createByIp = options.user.userIpAddress;
});


module.exports = ZohoAccountMapping;
