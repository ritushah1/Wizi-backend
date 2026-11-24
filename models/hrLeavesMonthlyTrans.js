/** @format */

const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const HrLeaveTypes = require('./hrLeaveTypes');
const UserMaster = require('./userMaster');
const { PayrollFrequencyType, salaryCalculationAct } = require('../utils/dbUtils');
const Department = require('./department');
const Designation = require('./designation');
const BranchMaster = require('./branchMaster');
const table_name = 'hrLeaveMonthlyTrans';

const HrLeaveMonthlyTrans = sequelize.define(
  table_name,
  {
    AttnTranId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    //foreign key
    userMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    //foreign key
    LeaveTranId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    AttnYearMon: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    MonDays: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    MonWorkDays: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    AttnVal: {
      type: Sequelize.FLOAT,
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
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    updateByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    verified: {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    monthstartdate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    monthenddate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    payrollFrequency: {
      type: Sequelize.ENUM(...Object.values(PayrollFrequencyType)),
      allowNull: false,
      defaultValue: PayrollFrequencyType.MONTHLY,
    },
    branchId: {
      type: Sequelize.INTEGER,
    },
    departmentId: {
      type: Sequelize.INTEGER,
    },
    designationId: {
      type: Sequelize.INTEGER,
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    salaryCalAct:{
      type:Sequelize.ENUM(...Object.values(salaryCalculationAct))
    }
  },
  {
    indexes: [
      {
        unique: false,
        fields: ['userMasterID'],
      },
      {
        unique: false,
        fields: ['LeaveTranId'],
      },
      {
        unique: false,
        fields: ['AttnYearMon'],
      },

      {
        unique: false,
        fields: ['verified'],
      },

      {
        unique: false,
        fields: ['AttnYearMon', 'verified'],
      },
      {
         unique: false,
         fields:['userMasterID','verified','monthstartdate','monthenddate']
      }
    ],
  }
);

HrLeaveMonthlyTrans.belongsTo(UserMaster, {
  foreignKey: { name: 'userMasterID' },
});
HrLeaveMonthlyTrans.belongsTo(HrLeaveTypes, {
  foreignKey: { name: 'LeaveTranId' },
});

UserMaster.hasMany(HrLeaveMonthlyTrans, {
  foreignKey: { name: 'userMasterID' },
});

HrLeaveMonthlyTrans.belongsTo(Department, {
  foreignKey: { name: 'departmentId' },
});
HrLeaveMonthlyTrans.belongsTo(Designation, {
  foreignKey: { name: 'designationId' },
});
HrLeaveMonthlyTrans.belongsTo(BranchMaster, {
  foreignKey: { name: 'branchId' },
});

HrLeaveMonthlyTrans.belongsTo(UserMaster, {
  as:'createdBy',
  foreignKey: { name: 'createBy' },
});

HrLeaveMonthlyTrans.belongsTo(UserMaster, {
  as:'updatedBy',
  foreignKey: { name: 'updateBy' },
});

module.exports = HrLeaveMonthlyTrans;
