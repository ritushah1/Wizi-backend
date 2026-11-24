const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'visitReportCustomize';
const CompanyMaster = require('./companyMaster');
const VisitReportMaster = require('./visitReportMaster');
const VisitReportCustomizeAmend = require('./visitReportCustomizeAmends');
const UserMaster = require('./userMaster');
const VisitReportCustomize = sequelize.define(table_name, {
  visitReportCustomizeID: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  fieldLabel: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  index:{
    type:Sequelize.BIGINT,
    allowNull:true
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
},{paranoid:true});

VisitReportCustomize.addHook('beforeCreate', (VisitReportCustomize, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  VisitReportCustomize.createBy = options.user.userMasterId;
  VisitReportCustomize.updateBy = options.user.userMasterId;
  VisitReportCustomize.createByIp = options.user.userIpAddress;
  VisitReportCustomize.updateByIp = options.user.userIpAddress;
});

VisitReportCustomize.addHook('beforeUpdate', (VisitReportCustomize, options) => {
  VisitReportCustomize.updateBy = options.user.userMasterId;
  VisitReportCustomize.ipAddress = options.user.userIpAddress;
  VisitReportCustomize.updateByIp = options.user.userIpAddress;
});

VisitReportCustomize.addHook('beforeDestroy', async (VisitReportCustomize, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  VisitReportCustomize.deleteBy = options.user.userMasterId;
  VisitReportCustomize.deleteByIp = options.user.userIpAddress;
  await VisitReportCustomize.save({
    hooks: false,
    transaction: options.transaction,
  });
});

VisitReportCustomize.addHook('beforeSave', (item, options) => {
  item.user = options.user;
});

VisitReportCustomize.addHook('beforeBulkCreate', (items, options) => {
  items.user = options.user;
});

VisitReportCustomize.addHook('afterSave', async (item, options) => {
  await addVisitReportCustomizeAmend(item, options);
});

VisitReportCustomize.addHook('afterBulkCreate', async (items, options) => {
  await addVisitReportCustomizeAmend(items, options);
});

async function addVisitReportCustomizeAmend(visitReportCustomize, options) {
  const list = Array.isArray(visitReportCustomize)
    ? visitReportCustomize
    : [visitReportCustomize];

  const user = Array.isArray(visitReportCustomize)
    ? visitReportCustomize.user
    : visitReportCustomize.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      visitReportCustomizeID: data.visitReportCustomizeID,
      companyMasterID: data.companyMasterID,
      visitReportMasterID: data.visitReportMasterID,
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

  await VisitReportCustomizeAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

VisitReportCustomize.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
VisitReportCustomize.belongsTo(VisitReportMaster, {
  foreignKey: { name: 'visitReportMasterID' },
});
VisitReportCustomize.belongsTo(VisitReportMaster, {
  as: 'vrMaster',
  foreignKey: { name: 'visitReportMasterID' },
});
VisitReportCustomizeAmend.belongsTo(VisitReportCustomize, {
  foreignKey: { name: 'visitReportCustomizeID' },
});
VisitReportCustomize.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

VisitReportCustomize.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

VisitReportCustomize.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = VisitReportCustomize;
