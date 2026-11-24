const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const ProductMaster = require('./productMaster');

const table_name = 'onlineSubscriptionPlansFeatures';

const OnlineSubscriptionPlansFeature = sequelize.define(
  table_name,
  {
    onlineSubscriptionPlansFeatureID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    productMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: ProductMaster,
        key: 'productMasterID',
      },
      validate: {
        notNull: { msg: 'productMasterID is required' },
        isInt: { msg: 'productMasterID must be an integer' },
      },
    },
    featureName: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: 'featureName is required' },
        notEmpty: { msg: 'featureName cannot be empty' },
      },
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    updateBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    updateByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: table_name
  }
);

OnlineSubscriptionPlansFeature.addHook('beforeCreate', (instance, options) => {
  if (options.user) {
    instance.createBy = options.user.userMasterId;
    instance.createByIp = options.user.userIpAddress;
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

OnlineSubscriptionPlansFeature.addHook('beforeUpdate', (instance, options) => {
  if (options.user) {
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

OnlineSubscriptionPlansFeature.belongsTo(ProductMaster, {
  foreignKey: { name: 'productMasterID' },
  as: 'product',
});

ProductMaster.hasMany(OnlineSubscriptionPlansFeature, {
  foreignKey: { name: 'productMasterID' },
  as: 'features',
});

OnlineSubscriptionPlansFeature.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
  as: 'createdByUser',
});

OnlineSubscriptionPlansFeature.belongsTo(UserMaster, {
  foreignKey: { name: 'updateBy' },
  as: 'updatedByUser',
});

module.exports = OnlineSubscriptionPlansFeature;
