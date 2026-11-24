const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'workFromHomeTransaction';
const userMaster = require('./userMaster');
const UserWorkFromHome = require('./userWorkFromHome');

const WorkFromHomeTransaction = sequelize.define(
  table_name,
  {
    workFromHomeTransactionID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userWorkFromHomeID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notNull: { msg: 'Work From Home ID  is required' },
        isInt: { msg: 'Work From Home ID must be an integer' },
      },
    },
    days: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    date: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    remark: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultVaule: 1,
      comment: '1 = Approve , 10 = Cancel',
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
    indexes: [{ fields: ['userWorkFromHomeID'] }],
  }
);

WorkFromHomeTransaction.addHook('beforeCreate', (instance, options) => {
  if (options.user) {
    instance.createBy = options.user.userMasterId;
    instance.createByIp = options.user.userIpAddress;
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

WorkFromHomeTransaction.addHook('beforeUpdate', (instance, options) => {
  if (options.user) {
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

WorkFromHomeTransaction.addHook('beforeDestroy', (instance, options) => {
  if (options.user) {
    instance.deletedBy = options.user.userMasterId;
    instance.deletedByIp = options.user.userIpAddress;
  }
});

WorkFromHomeTransaction.belongsTo(UserWorkFromHome, {
  foreignKey: { name: 'userWorkFromHomeID' },
});

UserWorkFromHome.hasMany(WorkFromHomeTransaction, {
  foreignKey: { name: 'userWorkFromHomeID' },
});

WorkFromHomeTransaction.belongsTo(userMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

WorkFromHomeTransaction.belongsTo(userMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

WorkFromHomeTransaction.belongsTo(userMaster, {
  as: 'deletedByUserDetails',
  foreignKey: { name: 'deletedBy' },
});

module.exports = WorkFromHomeTransaction;
