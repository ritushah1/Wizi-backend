const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const TeamOvertimePlanning = require('./teamOvertimePlanning');
const UserMaster = require('./userMaster');
const tableName = 'teamOvertimePlanningDetail';

const TeamOvertimePlanningDetails = sequelize.define(tableName, {
  teamOvertimePlanningDetailsID: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  userMasterID: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  teamOvertimePlanningID: {
    type: Sequelize.INTEGER,
    allowNull: false,
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
});
TeamOvertimePlanningDetails.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

TeamOvertimePlanningDetails.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

TeamOvertimePlanningDetails.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});
TeamOvertimePlanningDetails.belongsTo(TeamOvertimePlanning, {
  foreignKey: { name: 'teamOvertimePlanningID' },
});
TeamOvertimePlanningDetails.belongsTo(UserMaster, {
  foreignKey: { name: 'userMasterID' },
});
TeamOvertimePlanning.hasMany(TeamOvertimePlanningDetails, {
  foreignKey: { name: 'teamOvertimePlanningID' },
  as:'details'
});
TeamOvertimePlanningDetails.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

TeamOvertimePlanningDetails.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

TeamOvertimePlanningDetails.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});
module.exports = TeamOvertimePlanningDetails;
