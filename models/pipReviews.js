const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const PIP = require('./pip');
const { pipActions } = require('../utils/commonVars');
const PIPReviewer = require('./pipReviewer');
const table_name = 'pipReviews';

const PIPReviews = sequelize.define(
  table_name,
  {
    pipReviewsID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    pipReviewerID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'PIP Reviewer Is Required!!!' },
      },
    },
    review: {
      type: Sequelize.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Review Is Required!!!' },
      },
    },
    action: {
      type: Sequelize.ENUM(...Object.values(pipActions)),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Action Is Required!!!' },
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

PIPReviews.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

PIPReviews.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

PIPReviews.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

PIPReviews.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

PIPReviews.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

PIPReviews.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

PIPReviews.belongsTo(PIPReviewer, {
  foreignKey: { name: 'pipReviewerID' },
});

PIPReviewer.hasMany(PIPReviews, {
  foreignKey: { name: 'pipReviewerID' },
});

module.exports = PIPReviews;
