const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const Visit = require('./visit');
const tableName = 'visitAuthorization';

const VisitAuthorization = sequelize.define(
  tableName,
  {
    visitAuthorizationID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    visitID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    authStatus: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    remarks: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    updateBy: {
      type: Sequelize.BIGINT,
    },
    deleteBy: {
      type: Sequelize.BIGINT,
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
    indexes: [
      {
        unique: false,
        fields: ['visitID', 'userMasterID', 'authStatus'],
      },
      {
        unique: true,
        fields: ['visitID', 'userMasterID'],
        where: {
          deletedAt: null,
        },
      },
    ],
  },
);

VisitAuthorization.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

VisitAuthorization.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

VisitAuthorization.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

VisitAuthorization.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

VisitAuthorization.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

VisitAuthorization.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

VisitAuthorization.belongsTo(UserMaster, {
  as: 'authPerson',
  foreignKey: { name: 'userMasterID' },
});
VisitAuthorization.belongsTo(Visit, {
  foreignKey: { name: 'visitID' },
});
VisitAuthorization.belongsTo(Visit, {
  as: 'Visit',
  foreignKey: 'visitID',
});

Visit.hasMany(VisitAuthorization, {
  as: 'visitAuth',
  foreignKey: 'visitID',
});

module.exports = VisitAuthorization;
