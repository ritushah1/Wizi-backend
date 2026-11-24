const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const CompanyProgress = require('./companyProgress');
const table_name = 'companyStageRemarks';

const CompanyStageRemarks = sequelize.define(
  table_name,
  {
    companyStageRemarksID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyMasterID: {
      type: Sequelize.BIGINT,
    },
    companyProgressID: {
      type: Sequelize.BIGINT,
    },
    comment: {
      type: Sequelize.TEXT,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    updateBy: {
      type: Sequelize.BIGINT,
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

CompanyStageRemarks.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

CompanyStageRemarks.belongsTo(CompanyProgress, {
  foreignKey: { name: 'companyProgressID' },
});
CompanyProgress.hasMany(CompanyStageRemarks, {
  foreignKey: { name: 'companyProgressID' },
});
CompanyStageRemarks.addHook('beforeCreate', (companyStageRemarks, options) => {
  companyStageRemarks.createBy = options.user.userMasterId;
  companyStageRemarks.createByIp = options.user.userIpAddress;
});

CompanyStageRemarks.addHook('beforeUpdate', (companyStageRemarks, options) => {
  companyStageRemarks.updateBy = options.user.userMasterId;
  companyStageRemarks.updateByIp = options.user.userIpAddress;
});

CompanyStageRemarks.addHook('beforeDestroy', (companyStageRemarks, options) => {
  companyStageRemarks.deleteBy = options.user.userMasterId;
  companyStageRemarks.deleteByIp = options.user.userIpAddress;
});

CompanyStageRemarks.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

CompanyStageRemarks.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

CompanyStageRemarks.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});


module.exports = CompanyStageRemarks;
