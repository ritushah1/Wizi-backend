const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'visitPurpose';
const CompanyMaster = require('./companyMaster');
const VisitPurposeAmend = require('./visitPurposeAmends');
const UserMaster = require('./userMaster');
const VisitPurpose = sequelize.define(
  table_name,
  {
    visitPurposeID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    visitPurpose: {
      type: Sequelize.STRING,
      allowNull: false,
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
    authorizationStatus: {
      type: Sequelize.BIGINT,
      allowNull: false,
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
  },
  {
    paranoid: true,
    indexes: [
      {
        unique: false,
        fields: ['companyMasterID'],
      },
      {
        unique: false,
        fields: ['visitPurpose'],
      },
    ],
  },
);
VisitPurpose.addHook('beforeCreate', (VisitPurpose, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  VisitPurpose.createBy = options.user.userMasterId;
  VisitPurpose.createByIp = options.user.userIpAddress;
});

VisitPurpose.addHook('beforeUpdate', (VisitPurpose, options) => {
  VisitPurpose.updateBy = options.user.userMasterId;
  VisitPurpose.updateByIp = options.user.userIpAddress;
});

VisitPurpose.addHook('beforeDestroy', async (VisitPurpose, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  VisitPurpose.deleteBy = options.user.userMasterId;
  VisitPurpose.deleteByIp = options.user.userIpAddress;
  await VisitPurpose.save({
    hooks: false,
    transaction: options.transaction,
  });
});
VisitPurpose.addHook('beforeSave', async (VisitPurpose, options) => {
  VisitPurpose.user = options.user;
});
VisitPurpose.addHook('beforeBulkCreate', async (VisitPurpose, options) => {
  VisitPurpose.user = options.user;
});
VisitPurpose.addHook('afterSave', async (VisitPurpose, options) => {
  await addVisitPurposeAmend(VisitPurpose, options);
});
VisitPurpose.addHook('afterBulkCreate', async (VisitPurpose, options) => {
  await addVisitPurposeAmend(VisitPurpose, options);
});

async function addVisitPurposeAmend(visitPurpose, options) {
  const list = Array.isArray(visitPurpose) ? visitPurpose : [visitPurpose];

  const user = visitPurpose.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      visitPurposeID: data.visitPurposeID,
      visitPurpose: data.visitPurpose,
      companyMasterID: data.companyMasterID,
      status: data.status,
      authorizationStatus: data.authorizationStatus,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await VisitPurposeAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

VisitPurpose.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
VisitPurposeAmend.belongsTo(VisitPurpose, {
  as: 'visitPurposeAmends',
  foreignKey: {
    name: 'visitPurposeID',
  },
});
VisitPurpose.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

VisitPurpose.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

VisitPurpose.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});
module.exports = VisitPurpose;
