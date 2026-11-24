const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const table_name = 'questionCategoryMaster';

const QuestionCategoryMaster = sequelize.define(
  table_name,
  {
    questionCategoryMasterID: {
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

QuestionCategoryMaster.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: { name: 'createdBy' },
});

QuestionCategoryMaster.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: { name: 'updatedBy' },
});

QuestionCategoryMaster.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

QuestionCategoryMaster.addHook('beforeCreate', (questionCategoryMaster, options) => {
  if (options?.user) {
    questionCategoryMaster.createdBy = options.user.userMasterId;
    questionCategoryMaster.createdByIp = options.user.userIpAddress;
  }
});

QuestionCategoryMaster.addHook('beforeUpdate', (questionCategoryMaster, options) => {
  if (options?.user) {
    questionCategoryMaster.updatedBy = options.user.userMasterId;
    questionCategoryMaster.updatedByIp = options.user.userIpAddress;
  }
});

QuestionCategoryMaster.addHook('beforeDestroy', (questionCategoryMaster, options) => {
  if (options?.user) {
    questionCategoryMaster.deletedBy = options.user.userMasterId;
    questionCategoryMaster.deletedByIp = options.user.userIpAddress;
  }
});

module.exports = QuestionCategoryMaster;
