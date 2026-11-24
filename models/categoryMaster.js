const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const table_name = 'categoryMaster';

const CategoryMaster = sequelize.define(
  table_name,
  {
    categoryMasterID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    categoryName: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    color: {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Hex color code for UI display (e.g., #FF5733)',
    },
    icon: {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Icon name or URL',
    },
    displayOrder: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'For sorting in UI',
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '1 = Active, 0 = Inactive',
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    createdBy: {
      type: Sequelize.INTEGER,
    },
    updatedBy: {
      type: Sequelize.INTEGER,
    },
    deletedBy: {
      type: Sequelize.INTEGER,
    },
    createdByIp: {
      type: Sequelize.STRING,
    },
    updatedByIp: {
      type: Sequelize.STRING,
    },
    deletedByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  },
);

CategoryMaster.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

CategoryMaster.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

CategoryMaster.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

CategoryMaster.addHook('beforeCreate', (categoryMaster, options) => {
  categoryMaster.createdBy = options.user.userMasterId;
  categoryMaster.createdByIp = options.user.userIpAddress;
});

CategoryMaster.addHook('beforeUpdate', (categoryMaster, options) => {
  categoryMaster.updatedBy = options.user.userMasterId;
  categoryMaster.updatedByIp = options.user.userIpAddress;
});

CategoryMaster.addHook('beforeDestroy', (categoryMaster, options) => {
  categoryMaster.deletedBy = options.user.userMasterId;
  categoryMaster.deletedByIp = options.user.userIpAddress;
});

module.exports = CategoryMaster;
