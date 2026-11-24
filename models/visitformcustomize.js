const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'visitFormCustomize';
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const VisitFormCustomizeAmend = require('./visitFormCustomizeAmends');

const VisitFormCustomize = sequelize.define(table_name, {
  visitFormCustomizeID: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  fieldLabel: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  index: {
    type: Sequelize.BIGINT,
    allowNull: true,
  },
  inputType: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  value: {
    type: Sequelize.ARRAY(Sequelize.STRING),
    allowNull: true,
  },
  isRequired: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
  },
  status: {
    type: Sequelize.INTEGER,
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
  deleteByIp:{
    type:Sequelize.STRING,
    allowNull:true
  }
},{
  paranoid:true
});


VisitFormCustomize.addHook('beforeCreate', (VisitFormCustomize, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  VisitFormCustomize.createBy = options.user.userMasterId;
  VisitFormCustomize.updateBy = options.user.userMasterId;
  VisitFormCustomize.createByIp = options.user.userIpAddress;
  VisitFormCustomize.updateByIp = options.user.userIpAddress;
});

VisitFormCustomize.addHook('beforeUpdate', (VisitFormCustomize, options) => {
  VisitFormCustomize.updateBy = options.user.userMasterId;
  VisitFormCustomize.ipAddress = options.user.userIpAddress;
  VisitFormCustomize.updateByIp = options.user.userIpAddress;
});

VisitFormCustomize.addHook('beforeDestroy', async (VisitFormCustomize, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  VisitFormCustomize.deleteBy = options.user.userMasterId;
  VisitFormCustomize.deleteByIp = options.user.userIpAddress;
  await VisitFormCustomize.save({
    hooks: false,
    transaction: options.transaction,
  });
});

VisitFormCustomize.addHook('beforeSave', (item, options) => {
  item.user = options.user;
});

VisitFormCustomize.addHook('beforeBulkCreate', (items, options) => {
  items.user = options.user;
});

VisitFormCustomize.addHook('afterSave', async (item, options) => {
  await addVisitFormCustomizeAmend(item, options);
});

VisitFormCustomize.addHook('afterBulkCreate', async (items, options) => {
  await addVisitFormCustomizeAmend(items, options);
});

async function addVisitFormCustomizeAmend(visitFormCustomize, options) {
  const list = Array.isArray(visitFormCustomize)
    ? visitFormCustomize
    : [visitFormCustomize];

  const user = Array.isArray(visitFormCustomize)
    ? visitFormCustomize.user
    : visitFormCustomize.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      visitFormCustomizeID: data.visitFormCustomizeID,
      companyMasterID: data.companyMasterID,
      fieldLabel: data.fieldLabel,
      index: data.index,
      inputType: data.inputType,
      value: data.value,
      isRequired: data.isRequired,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await VisitFormCustomizeAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}


VisitFormCustomizeAmend.belongsTo(VisitFormCustomize, {
  foreignKey: { name: 'visitFormCustomizeID' },
});
VisitFormCustomize.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

VisitFormCustomize.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

VisitFormCustomize.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

VisitFormCustomize.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
module.exports = VisitFormCustomize;
