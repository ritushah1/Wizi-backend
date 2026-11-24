const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const PIP = require('./pip');
const table_name = 'pipReviewer';

const PIPReviewer = sequelize.define(
  table_name,
  {
    pipReviewerID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    pipID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'PIP Is Required!!!' },
      },
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'User Is Required!!!' },
      },
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
      type: Sequelize.BIGINT,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  },
);

PIPReviewer.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

PIPReviewer.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

PIPReviewer.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

PIPReviewer.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

PIPReviewer.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

PIPReviewer.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

PIPReviewer.belongsTo(UserMaster, {
  as: 'reviewer',
  foreignKey: { name: 'userMasterID' },
});

UserMaster.hasMany(PIPReviewer, {
  as: 'reviewer',
  foreignKey: { name: 'userMasterID' },
});

PIPReviewer.belongsTo(PIP, {
  as: 'reviewers',
  foreignKey: { name: 'pipID' },
});

PIP.hasMany(PIPReviewer, {
  as: 'reviewers',
  foreignKey: { name: 'pipID' },
});

module.exports = PIPReviewer;
