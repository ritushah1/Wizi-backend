const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CityMaster = require('./citymaster');
const CompanyTypeMaster = require('./companytypeMaster');
const {
  WeekOffSalaryTypeEnum,
  PTCalculationEnum,
  loginOtpMethodENUM,
  distanceCalculationMethodENUM,
  OTBasedOnEnum,
} = require('../utils/dbUtils');
const ZohoIntegration = require('./zohoIntegration');
const Timezone = require('./timezone');
const Inquiries = require('./inquiries');
const companyMaster = require('./companyMaster');
const table_name = 'companyAmend';
const CompanyAmend = sequelize.define(
  table_name,
  {
    companyAmendID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    companyName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    companyAddress: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    companyWebsite: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    companyEmail: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    companyLogo: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    cpName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    cpMobileNo: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    cpEmail: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    parentCompanyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    subCompanyRequired: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    status: {
      type: Sequelize.BIGINT,
      allowNull: false,
      defaultValue: 1,
    },
    employeeCodePattern: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    expenseDatePicker: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    otp: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    panNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    tanNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    companyDescription: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    employeeCodeType: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    authorizedSignature: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    customerListPreference: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    ownerName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    ownerFatherName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    tdsdeduction: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    uniqueEmpCode: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    cinNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    setUpTime: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    fileUploadType: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    letterHead: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    weekOffSalaryType: {
      type: Sequelize.ENUM(...Object.values(WeekOffSalaryTypeEnum)),
    },
    payheadMasterId: {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
    },
    ptDeduction: {
      type: Sequelize.ENUM(...Object.values(PTCalculationEnum)),
      allowNull: false,
      defaultValue: PTCalculationEnum.MONTHLY,
    },
    addUserStepper: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    visit_geo_check: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    visit_geo_radius: {
      type: Sequelize.FLOAT,
      allowNull: true,
    },
    showVisitCheckInAttachment: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    requiredVisitCheckInAttachment: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    showVisitCheckOutAttachment: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    requiredVisitCheckOutAttachment: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    uniqueCompanyCode: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    timezoneID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    otpForLogin: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    loginOtpMethod: {
      type: Sequelize.ENUM(...Object.values(loginOtpMethodENUM)),
      allowNull: true,
      defaultValue: loginOtpMethodENUM.EMAIL,
    },
    inquiryID: {
      type: Sequelize.BIGINT,
      allowNull: true,
      comment: 'Link to signup inquiry',
    },
    distanceMethod: {
      type: Sequelize.ENUM(...Object.values(distanceCalculationMethodENUM)),
      allowNull: true,
      defaultValue: distanceCalculationMethodENUM.HAVERSINE,
    },
    visit_Auto_Check: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    otBasedOn: {
      type: Sequelize.ENUM(...Object.values(OTBasedOnEnum)),
      allowNull: true,
      defaultValue: OTBasedOnEnum.AUTO,
    },
    isAttnStatusChangeable: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    empCodeSeqLen: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    empCodeAutoStartsFrom: {
      type: Sequelize.BIGINT,
      allowNull: true,
      defaultValue: 0,
    },
    isAttRemarkRequired : {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        unique: false,
        fields: ['companyName'],
      },
      {
        unique: false,
        fields: ['companyTypeid'],
      },
      {
        unique: false,
        fields: ['parentCompanyMasterID'],
      },
    ],
  },
);

CompanyAmend.belongsTo(Inquiries, {
  foreignKey: { name: 'inquiryID', allowNull: true },
});

CompanyAmend.belongsTo(CityMaster, { foreignKey: { name: 'cityMasterID' } });
CompanyAmend.belongsTo(CompanyTypeMaster, {
  foreignKey: { name: 'companyTypeid' },
});

CompanyAmend.belongsTo(Timezone, {
  foreignKey: { name: 'timezoneID', allowNull: true },
});

module.exports = CompanyAmend;
