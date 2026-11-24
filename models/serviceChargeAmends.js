const Sequelize = require("sequelize");
const sequelize = require("../config/database");

const Contractor = require("./contractor");
const UserMaster = require("./userMaster");
const tableName = 'serviceChargeAmend'

const ServiceChargeAmend = sequelize.define(
  tableName,
  {
    serviceChargeAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    serviceChargeID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    contractorId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    applicableYYYYMM: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    timestamps: true,
    paranoid: false,
    updatedAt:false,
    indexes:[
        {
            fields:['serviceChargeAmendID']
        }
    ]
  }
);


ServiceChargeAmend.belongsTo(Contractor, {
  foreignKey: {
    name: "contractorId",
  },
});

ServiceChargeAmend.belongsTo(UserMaster, {
  as: "createdByUser",
  foreignKey: {
    name: "createBy",
  },
});

module.exports = ServiceChargeAmend;