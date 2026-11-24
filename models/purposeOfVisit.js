const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'purposeOfVisit';
const VisitPurpose = require('./visitPurpose');
const Visit = require('./visit');
const UserMaster = require('./userMaster');

const PurposeOfVisit = sequelize.define(
  table_name,
  {
    purposeOfVisitID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    visitPurposeID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    visitID: {
      type: Sequelize.INTEGER,
      allowNull: false,
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
    indexes: [
      {
        unique: false,
        fields: ['visitID'],
      },
      {
        unique: true,
        fields: ['visitID', 'visitPurposeID'],
        where: {
          deletedAt: null,
        },
      },
    ],
  },
);
PurposeOfVisit.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

PurposeOfVisit.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

PurposeOfVisit.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

PurposeOfVisit.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});
PurposeOfVisit.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});
PurposeOfVisit.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});
PurposeOfVisit.belongsTo(VisitPurpose, {
  foreignKey: { name: 'visitPurposeID' },
});
PurposeOfVisit.belongsTo(Visit, { foreignKey: { name: 'visitID' } });

Visit.hasMany(PurposeOfVisit, {
  as: 'pov',
  foreignKey: 'visitID',
});

module.exports = PurposeOfVisit;
