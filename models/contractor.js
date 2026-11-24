const Sequelize = require("sequelize");
const sequelize = require("../config/database");
const companyMaster = require("./companyMaster");
const CityMaster = require("./citymaster");
const BankMaster = require("./bankMaster");
const ContractorAmend = require("./contractorAmends");
const UserMaster = require("./userMaster");
const table_name = "contractor";

const Contractor = sequelize.define(
  table_name,
  {
    contractorId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    contractorName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    shortName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    contractorCode: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    website: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    contactPersonName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    contactNo: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    dateofIncorporation: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    // forgein key
    cityMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    // forgein key
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    registrationNo: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    aboutContractor: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    bankIFSC: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    bankAccountNo: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    pancard: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    gstNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    contractorAddress: {
      type: Sequelize.TEXT,
      allowNull: true,
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
    localName: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    localAddress: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
  },
  {
    paranoid: true,
  }
);

Contractor.belongsTo(BankMaster, {
  foreignKey: { name: "bankMasterID", allowNull: true },
});

Contractor.addHook("beforeCreate", (contractor, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  contractor.createBy = options.user.userMasterId;
  contractor.createByIp = options.user.userIpAddress;
});

Contractor.addHook("beforeUpdate", (contractor, options) => {
  contractor.updateBy = options.user.userMasterId;
  contractor.updateByIp = options.user.userIpAddress;
});

Contractor.addHook('beforeDestroy', async (Contractor, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  Contractor.deleteBy = options.user.userMasterId;
  Contractor.deleteByIp = options.user.userIpAddress;
  await Contractor.save({
    hooks: false,
    transaction: options.transaction,
  });
});

Contractor.addHook('beforeSave', async (Contractor, options) => {
  Contractor.user = options.user;
});
Contractor.addHook('beforeBulkCreate', async (Contractor, options) => {
  Contractor.user = options.user;
});
Contractor.addHook('afterSave', async (Contractor, options) => {
  await addContractorAmend(Contractor, options);
});
Contractor.addHook('afterBulkCreate', async (Contractor, options) => {
  await addContractorAmend(Contractor, options);
});

async function addContractorAmend(contractor, options) {
  const list = Array.isArray(contractor) ? contractor : [contractor];

  const user = contractor.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      contractorId: data.contractorId,
      contractorName: data.contractorName,
      shortName: data.shortName,
      contractorCode: data.contractorCode,
      website: data.website,
      contactPersonName: data.contactPersonName,
      contactNo: data.contactNo,
      dateofIncorporation: data.dateofIncorporation,
      email: data.email,
      cityMasterID: data.cityMasterID,
      companyMasterID: data.companyMasterID,
      registrationNo: data.registrationNo,
      aboutContractor: data.aboutContractor,
      bankMasterID: data.bankMasterID,
      bankIFSC: data.bankIFSC,
      bankAccountNo: data.bankAccountNo,
      pancard: data.pancard,
      gstNumber: data.gstNumber,
      contractorAddress: data.contractorAddress,
      localName: data.localName,
      localAddress: data.localAddress,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await ContractorAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

Contractor.belongsTo(companyMaster, {
  foreignKey: { name: "companyMasterID" },
});
Contractor.belongsTo(CityMaster, {
  foreignKey: { name: "cityMasterID" },
});
ContractorAmend.belongsTo(Contractor,{
  foreignKey:{name:'contractorId'}
});
Contractor.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

Contractor.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

Contractor.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

module.exports = Contractor;
