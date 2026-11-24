const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const AttendancePolicy = require('./attendancePolicy');
const Designation = require('./designation');
const PolicyDocuments = require('./policyDocuments');
const table_name = 'policyDocumentDesignation';

const PolicyDocumentDesignation = sequelize.define(
  table_name,
  {
    policyDocumentDesignationID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    policyDocumentID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Policy Document Is Required!!!' },
      },
    },
    designationId: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Designation Is Required!!!' },
      },
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
    deleteBy: {
      type: Sequelize.INTEGER,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
    indexes: [
      {
        unique: false,
        fields: ['policyDocumentID'],
      },
    ],
  },
);

PolicyDocumentDesignation.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

PolicyDocumentDesignation.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

PolicyDocumentDesignation.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});
// 🔹 BULK CREATE
PolicyDocumentDesignation.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
PolicyDocumentDesignation.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
PolicyDocumentDesignation.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await PolicyDocumentDesignation.update(
      {
        deleteBy: options.user.userMasterId,
        deleteByIp: options.user.userIpAddress,
      },
      {
        where: options.where,
        transaction: options.transaction,
        hooks: false,
      },
    );
  }
});

PolicyDocumentDesignation.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

PolicyDocumentDesignation.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

PolicyDocumentDesignation.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

PolicyDocumentDesignation.belongsTo(Designation, {
  foreignKey: { name: 'designationId' },
});

PolicyDocumentDesignation.belongsTo(PolicyDocuments, {
  foreignKey: { name: 'policyDocumentID' },
  targetKey: 'id'
});

PolicyDocuments.hasMany(PolicyDocumentDesignation, {
  as: 'dp_design',
  foreignKey: { name: 'policyDocumentID' },
  targetKey: 'id'
});

module.exports = PolicyDocumentDesignation;
