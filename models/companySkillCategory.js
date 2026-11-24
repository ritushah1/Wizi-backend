const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const { SkillCategoryType } = require('../utils/dbUtils');
const table_name = 'companySkillCategory';
const CompanySkillCategory = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    skillCategory: {
      type: Sequelize.ENUM(...Object.values(SkillCategoryType)),
    },
    displayName:{
type:Sequelize.STRING,
allowNull:false
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.INTEGER,
    },
    updateBy: {
      type: Sequelize.INTEGER,
    },
    deleteBy: {
      type: Sequelize.INTEGER,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  }
);

CompanySkillCategory.belongsTo(companyMaster,
    {
      foreignKey: { name: 'companyMasterID' },
})

CompanySkillCategory.addHook(
  'beforeCreate',
  (data, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    data.createBy = options.user.userMasterId;
    data.createByIp = options.user.userIpAddress;
  }
);

CompanySkillCategory.addHook(
  'beforeUpdate',
  (data, options) => {
    data.updateBy = options.user.userMasterId;
    data.updateByIp = options.user.userIpAddress;
  }
);

CompanySkillCategory.addHook(
  'beforeDestroy',
  (data, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    data.deleteBy = options.user.userMasterId;
    data.deleteByIp = options.user.userIpAddress;
  }
);

module.exports = CompanySkillCategory;
