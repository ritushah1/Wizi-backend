const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const companyMaster = require('./companyMaster');
const { bankAccountTypeEnum } = require('../utils/dbUtils');
const BankMaster = require('./bankMaster');
const CompanyBankDetailsAmend = require('./companyBankDetailsAmends');
const { iteratee } = require('lodash');
const table_name = 'companyBankDetails';

const CompanyBankDetails = sequelize.define(
  table_name,
  {
    companyBankDetailsID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Company Is Required!!!' },
      },
    },
    bankMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Bank  Is Required!!!' },
      },
    },
    bankAccountNo: {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'Bank Account Number',
      validate: {
        notEmpty: { msg: 'Bank Account Number Is Required!!!' },
      },
    },
    bankIfscCode: {
      type: Sequelize.STRING,
      allowNull: false,
      comment: 'Bank Account IFSC Code',
      validate: {
        notEmpty: { msg: 'Bank IFSC Code Is Required!!!' },
      },
    },
    nameAsBank: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Name As Per Bank Record',
    },
    accountType: {
      type: Sequelize.STRING,
      allowNull: false,
      type: Sequelize.ENUM(...Object.values(bankAccountTypeEnum)),
      comment: 'Saving and Current',
      validate: {
        notEmpty: { msg: 'Bank Account Type is required.' },
        checkType(value) {
          if (!Object.values(bankAccountTypeEnum).includes(value)) {
            throw new Error(
              `Invalid Bank Account Type. Allowed values: ${Object.values(bankAccountTypeEnum).join(', ')}`
            );
          }
        },
      },
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
      type: Sequelize.INTEGER,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid: true,
  }
);

CompanyBankDetails.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

CompanyBankDetails.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

CompanyBankDetails.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});
CompanyBankDetails.addHook('beforeSave',async(item,options)=>{
  item.user=options.user
})
CompanyBankDetails.addHook('afterSave',async(item,options)=>{
  await addCompanyBankDetailsAmend(item,options)
})

async function addCompanyBankDetailsAmend(companyBankDetails, options) {
  const list = Array.isArray(companyBankDetails)
    ? companyBankDetails
    : [companyBankDetails];

  const user = Array.isArray(companyBankDetails)
    ? companyBankDetails.user
    : companyBankDetails.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      companyBankDetailsID: data.companyBankDetailsID,
      companyMasterID: data.companyMasterID,
      bankMasterID: data.bankMasterID,
      bankAccountNo: data.bankAccountNo,
      bankIfscCode: data.bankIfscCode,
      nameAsBank: data.nameAsBank,
      accountType: data.accountType,
      description: data.description,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await CompanyBankDetailsAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

CompanyBankDetails.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

CompanyBankDetails.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

CompanyBankDetails.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

CompanyBankDetails.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

companyMaster.hasMany(CompanyBankDetails, {
  as: 'cbd',
  foreignKey: { name: 'companyMasterID' },
});
CompanyBankDetails.belongsTo(BankMaster, {
  foreignKey: { name: 'bankMasterID' },
});
CompanyBankDetailsAmend.belongsTo(CompanyBankDetails, {
  foreignKey: { name: 'companyBankDetailsID' },
});
module.exports = CompanyBankDetails;
