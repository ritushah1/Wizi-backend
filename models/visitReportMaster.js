const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'visitReportMaster';
const CompanyMaster = require('./companyMaster');
const VisitReportMasterAmend = require('./visitReportMasterAmends');
const UserMaster = require('./userMaster');
const VisitReportMaster = sequelize.define(
  table_name,
  {
    visitReportMasterID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    visitReportName: {
      type: Sequelize.STRING,
      allowNull: false,
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
    deleteBy: {
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
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    paranoid: true,
    indexes: [
      {
        unique: false,
        fields: ['visitReportName'],
      },
    ],
  },
);

VisitReportMaster.addHook('beforeCreate', (VisitReportMaster, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  VisitReportMaster.createBy = options.user.userMasterId;
  VisitReportMaster.updateBy = options.user.userMasterId;
  VisitReportMaster.createByIp = options.user.userIpAddress;
  VisitReportMaster.updateByIp = options.user.userIpAddress;
});

VisitReportMaster.addHook('beforeUpdate', (VisitReportMaster, options) => {
  VisitReportMaster.updateBy = options.user.userMasterId;
  VisitReportMaster.ipAddress = options.user.userIpAddress;
  VisitReportMaster.updateByIp = options.user.userIpAddress;
});

VisitReportMaster.addHook(
  'beforeDestroy',
  async (VisitReportMaster, options) => {
    // Set deleteBy and ipAddress based on the authenticated user
    VisitReportMaster.deleteBy = options.user.userMasterId;
    VisitReportMaster.deleteByIp = options.user.userIpAddress;
    await VisitReportMaster.save({
      hooks: false,
      transaction: options.transaction,
    });
  },
);

VisitReportMaster.addHook('beforeSave', (item, options) => {
  item.user = options.user;
});

VisitReportMaster.addHook('beforeBulkCreate', (items, options) => {
  items.user = options.user;
});

VisitReportMaster.addHook('afterSave', async (item, options) => {
  await addVisitReportMasterAmend(item, options);
});

VisitReportMaster.addHook('afterBulkCreate', async (items, options) => {
  await addVisitReportMasterAmend(items, options);
});

async function addVisitReportMasterAmend(visitReportMaster, options) {
  const list = Array.isArray(visitReportMaster)
    ? visitReportMaster
    : [visitReportMaster];

  const user = Array.isArray(visitReportMaster)
    ? visitReportMaster.user
    : visitReportMaster.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      visitReportMasterID: data.visitReportMasterID,
      companyMasterID: data.companyMasterID,
      visitReportName: data.visitReportName,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await VisitReportMasterAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

VisitReportMaster.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

VisitReportMasterAmend.belongsTo(VisitReportMaster, {
  foreignKey: { name: 'visitReportMasterID' },
});

VisitReportMaster.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

VisitReportMaster.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

VisitReportMaster.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = VisitReportMaster;
