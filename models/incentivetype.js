const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const IncentivetypeAmend = require('./incentivetypeAmends');
const table_name = 'incentivetype';
const Incentivetype = sequelize.define(
  table_name,
  {
    IncentivetypeID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    incentivetypename: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    showinsalaryslip: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    consider: {
      type: Sequelize.STRING,
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
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    updateBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    updateByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    pfApplicable: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    esicApplicable: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    employeeESICPer: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    employerESICPer: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    inc_type_displayName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  { paranoid: true },
);

Incentivetype.addHook('beforeCreate', (Incentivetype, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  Incentivetype.createBy = options.user.userMasterId;
  Incentivetype.updateBy = options.user.userMasterId;
  Incentivetype.createByIp = options.user.userIpAddress;
  Incentivetype.updateByIp = options.user.userIpAddress;
});

Incentivetype.addHook('beforeUpdate', (Incentivetype, options) => {
  Incentivetype.updateBy = options.user.userMasterId;
  Incentivetype.ipAddress = options.user.userIpAddress;
  Incentivetype.updateByIp = options.user.userIpAddress;
});

Incentivetype.addHook('beforeDestroy', async (Incentivetype, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  Incentivetype.deleteBy = options.user.userMasterId;
  Incentivetype.deleteByIp = options.user.userIpAddress;
  await Incentivetype.save({
    hooks: false,
    transaction: options.transaction,
  });
});

Incentivetype.addHook('beforeSave', async (Incentivetype, options) => {
  Incentivetype.user = options.user;
});
Incentivetype.addHook('beforeBulkCreate', async (Incentivetype, options) => {
  Incentivetype.user = options.user;
});
Incentivetype.addHook('afterSave', async (Incentivetype, options) => {
  await addIncentivetypeAmend(Incentivetype, options);
});
Incentivetype.addHook('afterBulkCreate', async (Incentivetype, options) => {
  await addIncentivetypeAmend(Incentivetype, options);
});

async function addIncentivetypeAmend(incentiveTypes, options) {
  const list = Array.isArray(incentiveTypes)
    ? incentiveTypes
    : [incentiveTypes];

  const user = incentiveTypes.user;

  const rows = list.map((incentiveType) => {
    const data = incentiveType.get({ plain: true });

    return {
      IncentivetypeID: data.IncentivetypeID,
      companyMasterID: data.companyMasterID,
      incentivetypename: data.incentivetypename,
      showinsalaryslip: data.showinsalaryslip,
      consider: data.consider,
      pfApplicable: data.pfApplicable,
      esicApplicable: data.esicApplicable,
      employeeESICPer: data.employeeESICPer,
      employerESICPer: data.employerESICPer,
      inc_type_displayName: data.inc_type_displayName,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await IncentivetypeAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}


Incentivetype.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
IncentivetypeAmend.belongsTo(Incentivetype,{
  as:'incentiveTypeAends',
  foreignKey:{name:"IncentivetypeID"}
})
Incentivetype.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

Incentivetype.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

Incentivetype.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = Incentivetype;
