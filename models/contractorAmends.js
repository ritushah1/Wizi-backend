const Sequelize = require("sequelize");
const sequelize = require("../config/database");
const companyMaster = require("./companyMaster");
const CityMaster = require("./citymaster");
const BankMaster = require("./bankMaster");
const UserMaster = require("./userMaster");

const ContractorAmend = sequelize.define(
  "contractorAmend",
  {
    contractorAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    contractorId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    contractorName: {
      type: Sequelize.STRING,
    },
    shortName: {
      type: Sequelize.STRING,
    },
    contractorCode: {
      type: Sequelize.STRING,
    },
    website: {
      type: Sequelize.STRING,
    },
    contactPersonName: {
      type: Sequelize.STRING,
    },
    contactNo: {
      type: Sequelize.STRING,
    },
    dateofIncorporation: {
      type: Sequelize.STRING,
    },
    email: {
      type: Sequelize.STRING,
    },
    cityMasterID: {
      type: Sequelize.INTEGER,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
    },
    registrationNo: {
      type: Sequelize.STRING,
    },
    aboutContractor: {
      type: Sequelize.STRING,
    },
    bankMasterID: {
      type: Sequelize.INTEGER,
    },
    bankIFSC: {
      type: Sequelize.STRING,
    },
    bankAccountNo: {
      type: Sequelize.STRING,
    },
    pancard: {
      type: Sequelize.STRING,
    },
    gstNumber: {
      type: Sequelize.STRING,
    },
    contractorAddress: {
      type: Sequelize.TEXT,
    },
    localName: {
      type: Sequelize.TEXT,
    },
    localAddress: {
      type: Sequelize.TEXT,
    },
    status: {
      type: Sequelize.INTEGER,
    },
    createBy: {
      type: Sequelize.INTEGER,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    timestamps: true,
    updatedAt:false,
    indexes:[{
        fields:['contractorAmendID']
    }]
  }
);
ContractorAmend.belongsTo(companyMaster, {
  foreignKey: { name: "companyMasterID" },
});
ContractorAmend.belongsTo(CityMaster, {
  foreignKey: { name: "cityMasterID" },
});
ContractorAmend.belongsTo(BankMaster, {
  foreignKey: { name: "bankMasterID", allowNull: true },
});
ContractorAmend.belongsTo(UserMaster,{
    foreignKey:{name:'createBy'}
})

module.exports = ContractorAmend;