const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');

const tableName = 'penaltyAmend';

const PenaltyAmend = sequelize.define(
  tableName,
  {
    penaltyAmendID: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    penaltyID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    penaltyName: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    penaltyAmount: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    deductionFromSalary: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },

    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },

    isDefault: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },

    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },

    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        fields: ['penaltyID'],
      },
      {
        fields: ['companyMasterID'],
      },
    ],
  },
);

PenaltyAmend.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

PenaltyAmend.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

module.exports = PenaltyAmend;
