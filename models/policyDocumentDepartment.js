const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const Department = require('./department');
const PolicyDocuments = require('./policyDocuments');
const table_name = 'policyDocumentDepartment';

const PolicyDocumentDepartment = sequelize.define(
  table_name,
  {
    policyDocumentDepartmentID: {
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
    departmentId: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Department Is Required!!!' },
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

PolicyDocumentDepartment.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

PolicyDocumentDepartment.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

PolicyDocumentDepartment.addHook('beforeDestroy', async (item, options) => {
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
PolicyDocumentDepartment.addHook('beforeBulkCreate', (items, options) => {
  if (options.user) {
    for (const item of items) {
      item.createBy = options.user.userMasterId;
      item.createByIp = options.user.userIpAddress;
    }
  }
});

// 🔹 BULK UPDATE
PolicyDocumentDepartment.addHook('beforeBulkUpdate', (options) => {
  if (options.user) {
    options.attributes.updateBy = options.user.userMasterId;
    options.attributes.updateByIp = options.user.userIpAddress;
  }
});

// 🔹 BULK DESTROY (Soft delete support)
PolicyDocumentDepartment.addHook('beforeBulkDestroy', async (options) => {
  if (options.user) {
    await PolicyDocumentDepartment.update(
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

PolicyDocumentDepartment.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

PolicyDocumentDepartment.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

PolicyDocumentDepartment.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

PolicyDocumentDepartment.belongsTo(Department, {
  foreignKey: { name: 'departmentId' },
});

PolicyDocumentDepartment.belongsTo(PolicyDocuments, {
  foreignKey: { name: 'policyDocumentID' },
  targetKey: 'id'
});

PolicyDocuments.hasMany(PolicyDocumentDepartment, {
  as: 'dp_dept',
  foreignKey: { name: 'policyDocumentID' },
  targetKey: 'id'
});

module.exports = PolicyDocumentDepartment;
