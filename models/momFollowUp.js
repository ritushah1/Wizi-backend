const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const MomDetails = require('./momDetails');
const CompanyType = require('./companytypeMaster');
const CityMaster = require('./citymaster');
const ProductMaster = require('./productMaster');
const ExistingAttendanceProcess = require('./existingAttendanceProcess');
const UserMaster = require('./userMaster');

const tableName = 'momFollowUp';
const MomFollowUp = sequelize.define(
  tableName,
  {
    momFollowUpID: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    userMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    meetingDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    meetingTime: {
      type: Sequelize.TIME,
      allowNull: false,
    },
    companyName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    meetingWith: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    designation: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    companyTypeID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    cityMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    totalEmployees: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    fieldEmployee: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    attendanceProcessID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    meetingRemarks: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    productMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    webApplication: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    mobileApplication: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ma_PunchInPunchOut: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ma_Leave: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ma_Visit: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ma_Customer: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ma_Expense: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ma_LoanAndAdvance: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    ma_MirayoAi: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    wa_OrgDetails: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    wa_EmployeeMaster: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    wa_Payroll: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    wa_Salary: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    wa_Overtime: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    wa_Reports: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    wa_Tracking: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
    },
    wa_MirayoAi: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    interested: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    nextFollowUpDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    followUpRemarks: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    momDetailID: {
      type: Sequelize.INTEGER,
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
  },
  {
    paranoid: true,
  },
);
MomFollowUp.addHook('beforeCreate', (item, options) => {
  item.createBy = options.user.userMasterId;
  item.createByIp = options.user.userIpAddress;
});

MomFollowUp.addHook('beforeUpdate', (item, options) => {
  item.updateBy = options.user.userMasterId;
  item.updateByIp = options.user.userIpAddress;
});

MomFollowUp.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});
MomFollowUp.belongsTo(CompanyType, {
  foreignKey: { name: 'companyTypeID' },
});
MomFollowUp.belongsTo(CityMaster, {
  foreignKey: { name: 'cityMasterID' },
});
MomFollowUp.belongsTo(ProductMaster, {
  foreignKey: { name: 'productMasterID' },
});
MomFollowUp.belongsTo(ExistingAttendanceProcess, {
  foreignKey: { name: 'attendanceProcessID' },
});
MomFollowUp.belongsTo(UserMaster, {
  as: 'marketingPerson',
  foreignKey: { name: 'userMasterID' },
});
MomFollowUp.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

MomFollowUp.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

MomFollowUp.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});
MomFollowUp.belongsTo(MomDetails, {
  foreignKey: { name: 'momDetailID' },
});
MomDetails.hasMany(MomFollowUp, {
  foreignKey: { name: 'momDetailID' },
  as: 'momFollowUps',
});
module.exports = MomFollowUp;
