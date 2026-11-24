const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const BankMaster = require('./bankMaster');
const BankStatementFormatAmend = require('./bankStatmentFormatAmends');
const table_name = 'bankStatementFormat';
const BankStatementFormat = sequelize.define(
    table_name,
    {
        bankStatementFormatID: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            allowNull: false,
            primaryKey: true,
        },
        companyMasterID: {
            type: Sequelize.BIGINT,
            allowNull: false,
        },
        bankMasterID: {
            type: Sequelize.INTEGER,
            allowNull: true,
        },
        fields: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: false
        },
        createBy: {
            type: Sequelize.INTEGER,
        },
        updateBy: {
            type: Sequelize.INTEGER,
        },
        deleteBy: {
            type: Sequelize.INTEGER,
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
        paranoid: true
    }
);
BankStatementFormat.addHook('beforeCreate', (bankStatementFormat, options) => {
    // Set createBy, updateBy, and ipAddress based on the authenticated user
    bankStatementFormat.createBy = options.user.userMasterId;
    bankStatementFormat.updateBy = options.user.userMasterId;
    bankStatementFormat.createByIp = options.user.userIpAddress;
    bankStatementFormat.updateByIp = options.user.userIpAddress;
});

BankStatementFormat.addHook('beforeUpdate', (bankStatementFormat, options) => {
    bankStatementFormat.updateBy = options.user.userMasterId;
    bankStatementFormat.ipAddress = options.user.userIpAddress;
    bankStatementFormat.updateByIp = options.user.userIpAddress;
});

BankStatementFormat.addHook('beforeDestroy', async (BankStatementFormat, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  BankStatementFormat.deleteBy = options.user.userMasterId;
  BankStatementFormat.deleteByIp = options.user.userIpAddress;
  await BankStatementFormat.save({
    hooks: false,
    transaction: options.transaction,
  });
});

BankStatementFormat.addHook('beforeSave',async(bankStatementFormat,options)=>{
    bankStatementFormat.user=options.user
})
BankStatementFormat.addHook('afterSave',async(bankStatementFormat,options)=>{
    await addBankStatementFormatAmend(bankStatementFormat,options);
})


async function addBankStatementFormatAmend(bankStatementFormats, options) {
  const list = Array.isArray(bankStatementFormats)
    ? bankStatementFormats
    : [bankStatementFormats];

  const user = Array.isArray(bankStatementFormats)
    ? bankStatementFormats.user
    : bankStatementFormats.user;

  const rows = list.map((bankStatementFormat) => {
    const data = bankStatementFormat.get({ plain: true });

    return {
      bankStatementFormatID: data.bankStatementFormatID,
      companyMasterID: data.companyMasterID,
      bankMasterID: data.bankMasterID,
      fields: data.fields,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await BankStatementFormatAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

BankStatementFormat.belongsTo(companyMaster, {
    foreignKey: { name: 'companyMasterID' },
});

BankStatementFormat.belongsTo(BankMaster, {
    foreignKey: { name: 'bankMasterID' },
});
BankStatementFormatAmend.belongsTo(BankStatementFormat, {
  foreignKey: { name: 'bankStatementFormatID' },
});

module.exports = BankStatementFormat;