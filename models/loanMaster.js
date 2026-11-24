/** @format */

const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const { PayrollFrequencyType } = require('../utils/dbUtils');
const table_name = 'loanMaster';

const LoanMaster = sequelize.define(
  table_name,
  {
    LoanID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    //foreign key
    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    //foreign key
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    LoanAmount: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    LoanRemark: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    EMIMonths: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    interest: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    startMonth: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    givenDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    paymentmode: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    referenceNO: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    referenceDate: {
      type: Sequelize.DATEONLY,
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
    updateBy: {
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

    loanstatus: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    rejectionremarks: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    viewstatus: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    payrollFrequency: {
      type: Sequelize.ENUM(...Object.values(PayrollFrequencyType)),
      allowNull: false,
      defaultValue: PayrollFrequencyType.MONTHLY,
    },
    authorizedBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    authorizedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    isAuthorizedBy: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    authorizerRemark: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    authorizationStatus: {
      type: Sequelize.INTEGER,
      allowNull: true, // 1=> Accept 2=> Pending 0=> Reject
    },
  },
  {
    indexes: [
      {
        unique: false,
        fields: ['companyMasterID'],
      },
      {
        unique: false,
        fields: ['userMasterID'],
      },
    ],
  }
);

LoanMaster.belongsTo(UserMaster, { foreignKey: { name: 'userMasterID' } });

UserMaster.hasMany(LoanMaster, { foreignKey: { name: 'userMasterID' } });

LoanMaster.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
LoanMaster.belongsTo(UserMaster, {
  as: 'createdByUser',
  foreignKey: { name: 'createBy' },
});
LoanMaster.belongsTo(UserMaster, {
  as: 'updatedByUser',
  foreignKey: { name: 'updateBy' },
});
LoanMaster.belongsTo(UserMaster, {
  as: 'authorizer',
  foreignKey: 'authorizedBy',
});

module.exports = LoanMaster;
