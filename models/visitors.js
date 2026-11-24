const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const VisitorsAmend = require('./visitorsAmends');
const UserMaster = require('./userMaster');
const table_name = 'visitors';
const visitors = sequelize.define(
  table_name,
  {
    visitorsid: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    visitorsFirstName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    visitorsLastName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    visitorsPhone: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    visitorsComapny: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      //forign key
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
    visitorPhoto: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    paranoid: true,
  },
);
visitors.addHook('beforeCreate', (visitors, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  visitors.createBy = options.user.userMasterId;
  visitors.updateBy = options.user.userMasterId;
  visitors.createByIp = options.user.userIpAddress;
  visitors.updateByIp = options.user.userIpAddress;
});

visitors.addHook('beforeUpdate', (visitors, options) => {
  visitors.updateBy = options.user.userMasterId;
  visitors.ipAddress = options.user.userIpAddress;
  visitors.updateByIp = options.user.userIpAddress;
});

visitors.addHook('beforeDestroy', async (visitors, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  visitors.deleteBy = options.user.userMasterId;
  visitors.deleteByIp = options.user.userIpAddress;
  await visitors.save({
    hooks: false,
    transaction: options.transaction,
  });
});

visitors.addHook('beforeSave', async (visitors, options) => {
  visitors.user = options.user;
});
visitors.addHook('beforeBulkCreate', async (visitors, options) => {
  visitors.user = options.user;
});
visitors.addHook('afterSave', async (visitors, options) => {
  await addVisitorsAmend(visitors, options);
});
visitors.addHook('afterBulkCreate', async (visitors, options) => {
  await addVisitorsAmend(visitors, options);
});

async function addVisitorsAmend(visitors, options) {
  const list = Array.isArray(visitors) ? visitors : [visitors];

  const user = visitors.user;

  const rows = list.map((visitor) => {
    const data = visitor.get({ plain: true });

    return {
      visitorsid: data.visitorsid,
      visitorsFirstName: data.visitorsFirstName,
      visitorsLastName: data.visitorsLastName,
      visitorsPhone: data.visitorsPhone,
      visitorsComapny: data.visitorsComapny,
      visitorPhoto: data.visitorPhoto,
      companyMasterID: data.companyMasterID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await VisitorsAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

visitors.belongsTo(CompanyMaster, { foreignKey: { name: 'companyMasterID' } });
VisitorsAmend.belongsTo(visitors, {
  foreignKey: { name: 'visitorsid' },
});
visitors.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

visitors.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

visitors.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = visitors;
