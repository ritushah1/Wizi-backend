const UserMaster = require('./userMaster');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const BranchMaster = require('./branchMaster');
const Designation = require('./designation');
const table_name = 'branchWiseDesignations';
const BranchWiseDesignation = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    branchMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'branchMasterID is required' },
        isInt: { msg: 'branchMasterID must be an integer' },
      },
    },
    designationID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'designationID is required' },
        isInt: { msg: 'designationID must be an integer' },
      },
    },
    position: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'Positions must be at least 1.',
        },
      },
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    updateBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    updateByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    deletedBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deletedByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    deletedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    paranoid: true,
    tableName: table_name,
    indexes: [{ fields: ['branchMasterID'] }, { fields: ['designationID'] }],
  }
);

BranchWiseDesignation.addHook('beforeCreate', (instance, options) => {
  if (options.user) {
    instance.createBy = options.user.userMasterId;
    instance.createByIp = options.user.userIpAddress;
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

BranchWiseDesignation.addHook('beforeUpdate', (instance, options) => {
  if (options.user) {
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

BranchWiseDesignation.addHook('beforeDestroy', (instance, options) => {
  if (options.user) {
    instance.deletedBy = options.user.userMasterId;
    instance.deletedByIp = options.user.userIpAddress;
  }
});

BranchWiseDesignation.addHook('beforeSave', async (instance, options) => {
  if (
    !instance.changed('branchMasterID') &&
    !instance.changed('designationID')
  ) {
    return;
  }

  const existing = await BranchWiseDesignation.findOne({
    where: {
      branchMasterID: instance.branchMasterID,
      designationID: instance.designationID,
      deletedAt: null,
    },
  });

  if (existing && existing.id !== instance.id) {
    throw new Error('This branch, and designation combination already exists.');
  }
});

BranchWiseDesignation.belongsTo(BranchMaster, {
  as: 'branchMaster',
  foreignKey: { name: 'branchMasterID' },
});

BranchMaster.hasMany(BranchWiseDesignation, { foreignKey: { name: 'branchMasterID' },  as: 'br_design' });

BranchWiseDesignation.belongsTo(Designation, {
  as: 'designation',
  foreignKey: { name: 'designationID' },
});

BranchWiseDesignation.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

BranchWiseDesignation.belongsTo(UserMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

BranchWiseDesignation.belongsTo(UserMaster, {
  as: 'deletedByUserDetails',
  foreignKey: { name: 'deletedBy' },
});

module.exports = BranchWiseDesignation;
