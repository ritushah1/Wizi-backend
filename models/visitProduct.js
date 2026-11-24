const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'visitProduct';
const Product = require('./product');
const Visit = require('./visit');
const UserMaster = require('./userMaster');

const VisitProduct = sequelize.define(
  table_name,
  {
    visitProductID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    productID: {
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
        fields: ['visitID', 'productID'],
        where: {
          deletedAt: null,
        },
      },
    ],
  },
);
VisitProduct.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

VisitProduct.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

VisitProduct.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

VisitProduct.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});
VisitProduct.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});
VisitProduct.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});
VisitProduct.belongsTo(Product, { foreignKey: { name: 'productID' } });
VisitProduct.belongsTo(Visit, { foreignKey: { name: 'visitID' } });

Visit.hasMany(VisitProduct, {
  as: 'vp',
  foreignKey: 'visitID',
});

module.exports = VisitProduct;
