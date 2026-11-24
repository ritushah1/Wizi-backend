const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { accountingTypeEnum } = require('../utils/dbUtils');

const ZohoIntegration = sequelize.define(
  'zohoIntegration',
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
      comment: 'Company Master ID reference',
    },

    organizationID: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Zoho Books Organization ID',
    },

    organizationName: {
      type: Sequelize.STRING(300),
      allowNull: true,
      comment: 'Zoho Books Organization Name',
    },

    refresh_token: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'OAuth Refresh Token (never expires)',
    },

    access_token: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'OAuth Access Token (expires in 1 hour)',
    },

    expires_at: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Access Token Expiration Timestamp',
    },

    api_domain: {
      type: Sequelize.STRING(255),
      allowNull: false,
      comment: 'Zoho API Domain (e.g., https://www.zohoapis.in)',
    },

    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Indicates whether Zoho integration is active',
    },
    accountingType:{
      type:Sequelize.ENUM(Object.values(accountingTypeEnum)),
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
  },
  {
    tableName: 'zohoIntegrations',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['companyMasterID'],
      },
      {
        unique: true,
        fields: ['organizationID', 'isActive'],
      },
    ],
  },
);

// Define relationship after model is created
// This will be set up in the main app file to avoid circular dependencies
ZohoIntegration.associate = function (models) {
  if (models.CompanyMaster) {
    ZohoIntegration.belongsTo(models.CompanyMaster, {
      foreignKey: 'companyMasterID',
      as: 'company',
    });
  }
};

ZohoIntegration.addHook('beforeCreate', (ZohoIntegration, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    ZohoIntegration.createBy = options.user.userMasterId;
    ZohoIntegration.createByIp = options.user.userIpAddress;
});

ZohoIntegration.addHook('beforeUpdate', (ZohoIntegration, options) => {
    // Set updateBy and ipAddress based on the authenticated user
    ZohoIntegration.updateBy = options.user.userMasterId;
    ZohoIntegration.updateByIp = options.user.userIpAddress;
});

module.exports = ZohoIntegration;
