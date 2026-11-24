const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'product';
const CompanyMaster = require('./companyMaster');
const ProductAmend = require('./productAmends');
const UserMaster = require('./userMaster');
const Product = sequelize.define(
  table_name,
  {
    productID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    productName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    productPhoto: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    status: {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: 1,
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    updateBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteBy:{
      type:Sequelize.BIGINT,
      allowNull:true
    },
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    updateByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    paranoid:true,
    indexes: [
      {
        unique: false,
        fields: ['productName'],
      },
      {
        unique: false,
        fields: ['companyMasterID'],
      },
    ],
  }
);

Product.addHook('beforeCreate', (Product, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  Product.createBy = options.user.userMasterId;
  Product.updateBy = options.user.userMasterId;
  Product.createByIp = options.user.userIpAddress;
  Product.updateByIp = options.user.userIpAddress;
});

Product.addHook('beforeUpdate', (Product, options) => {
  Product.updateBy = options.user.userMasterId;
  Product.ipAddress = options.user.userIpAddress;
  Product.updateByIp = options.user.userIpAddress;
});

Product.addHook('beforeDestroy', async (Product, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  Product.deleteBy = options.user.userMasterId;
  Product.deleteByIp = options.user.userIpAddress;
  await Product.save({
    hooks: false,
    transaction: options.transaction,
  });
});

Product.addHook('beforeSave',async(Product,options)=>{
  Product.user=options.user
})
Product.addHook('beforeBulkCreate',async(Product,options)=>{
  Product.user=options.user
})
Product.addHook('afterBulkCreate',async(Product,options)=>{
  await addProductAmend(Product,options)
})
Product.addHook('afterSave',async(Product,options)=>{
  await addProductAmend(Product,options)
})

async function addProductAmend(product, options) {
  const list = Array.isArray(product) ? product : [product];

  const user = Array.isArray(product)
    ? product.user
    : product.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      productID: data.productID,
      productName: data.productName,
      productPhoto: data.productPhoto,
      companyMasterID: data.companyMasterID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await ProductAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}



Product.belongsTo(CompanyMaster, { foreignKey: { name: 'companyMasterID' } });
Product.belongsTo(UserMaster,{
    as:'createByUserDetails',
    foreignKey:{name:'createBy'}
})

Product.belongsTo(UserMaster,{
    as:'updateByUserDetails',
    foreignKey:{name:'updateBy'}
})

Product.belongsTo(UserMaster,{
    as:'deleteByUserDetails',
    foreignKey:{name:'deleteBy'}
})
ProductAmend.belongsTo(Product, {
  as:'productAmends',
  foreignKey: { name: 'productID' },
});
module.exports = Product;
