const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const PreboardingFormCustomize = require('./preboardingformcustomize');
const FieldMap = require('./fieldMap');
const table_name = 'preboardingFormCustomizeMapping';

const PreboardingFormCustomizeMapping = sequelize.define(
  table_name,
  {
    fieldMapID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    preboardingFormCustomizeID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    fieldMapID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    updateBy: {
      type: Sequelize.BIGINT,
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
      type: Sequelize.INTEGER,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  },
);

PreboardingFormCustomizeMapping.addHook(
  'beforeCreate',
  (preboardingFormCustomizeMapping, options) => {
    preboardingFormCustomizeMapping.createBy = options.user.userMasterId;
    preboardingFormCustomizeMapping.createByIp = options.user.userIpAddress;
  },
);

PreboardingFormCustomizeMapping.addHook(
  'beforeUpdate',
  (preboardingFormCustomizeMapping, options) => {
    preboardingFormCustomizeMapping.updateBy = options.user.userMasterId;
    preboardingFormCustomizeMapping.updateByIp = options.user.userIpAddress;
  },
);

PreboardingFormCustomizeMapping.addHook(
  'beforeDestroy',
  async (PreboardingFormCustomizeMapping, options) => {
    PreboardingFormCustomizeMapping.deleteBy = options.user.userMasterId;
    PreboardingFormCustomizeMapping.deleteByIp = options.user.userIpAddress;
    await PreboardingFormCustomizeMapping.save({
      hooks: false,
      transaction: options.transaction,
    });
  },
);

PreboardingFormCustomizeMapping.belongsTo(PreboardingFormCustomize, {
  foreignKey: { name: 'preboardingFormCustomizeID' },
  as: 'formCustomizeMap',
});
PreboardingFormCustomize.hasMany(PreboardingFormCustomizeMapping, {
  foreignKey: { name: 'preboardingFormCustomizeID' },
  as: 'formCustomizeMap',
});

PreboardingFormCustomizeMapping.belongsTo(FieldMap, {
  foreignKey: { name: 'fieldMapID' },
  as: 'fieldMapping',
});
FieldMap.hasMany(PreboardingFormCustomizeMapping, {
  foreignKey: { name: 'fieldMapID' },
  as: 'fieldMapping',
});

PreboardingFormCustomizeMapping.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

PreboardingFormCustomizeMapping.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

PreboardingFormCustomizeMapping.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

module.exports = PreboardingFormCustomizeMapping;
