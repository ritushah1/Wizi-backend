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
  probationTypeEnum,
} = require('../utils/dbUtils');
const ZohoIntegration = require('./zohoIntegration');
const Timezone = require('./timezone');
const Inquiries = require('./inquiries');
const CompanyAmend = require('./companyAmend');
const table_name = 'companyMaster';
const companyMaster = sequelize.define(
  table_name,
  {
    companyMasterID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
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
    deleteBy: {
      type: Sequelize.BIGINT,
    },
    empCodeAutoStartsFrom: {
      type: Sequelize.BIGINT,
      allowNull: true,
      defaultValue: 0,
    },
    probationType: {
      type: Sequelize.ENUM(...Object.values(probationTypeEnum)),
      allowNull: true,
    },
    probationValue: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    isAttRestrict: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    isAttRemarkRequired : {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  {
    paranoid: true,
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
companyMaster.addHook('beforeSave', async (data, options) => {
  data.user = options.user;
});
companyMaster.addHook('beforeBulkCreate', async (data, options) => {
  data.user = options.user;
});
companyMaster.addHook('afterSave', async (data, options) => {
  await addCompanyAmend(data, options);
});
companyMaster.addHook('afterBulkCreate', async (data, options) => {
  await addCompanyAmend(data, options);
});
companyMaster.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});
async function addCompanyAmend(companies, options) {
  const list = Array.isArray(companies) ? companies : [companies];

  const user = options.user;

  const rows = list.map((company) => {
    const data = company.get({ plain: true });

    return {
      companyMasterID: data.companyMasterID,
      companyName: data.companyName,
      companyAddress: data.companyAddress,
      companyWebsite: data.companyWebsite,
      companyEmail: data.companyEmail,
      companyLogo: data.companyLogo,
      cpName: data.cpName,
      cpMobileNo: data.cpMobileNo,
      cpEmail: data.cpEmail,
      parentCompanyMasterID: data.parentCompanyMasterID,
      subCompanyRequired: data.subCompanyRequired,
      status: data.status,
      employeeCodePattern: data.employeeCodePattern,
      expenseDatePicker: data.expenseDatePicker,
      otp: data.otp,
      panNumber: data.panNumber,
      tanNumber: data.tanNumber,
      companyDescription: data.companyDescription,
      employeeCodeType: data.employeeCodeType,
      authorizedSignature: data.authorizedSignature,
      customerListPreference: data.customerListPreference,
      ownerName: data.ownerName,
      ownerFatherName: data.ownerFatherName,
      tdsdeduction: data.tdsdeduction,
      uniqueEmpCode: data.uniqueEmpCode,
      cinNumber: data.cinNumber,
      setUpTime: data.setUpTime,
      fileUploadType: data.fileUploadType,
      letterHead: data.letterHead,
      weekOffSalaryType: data.weekOffSalaryType,
      payheadMasterId: data.payheadMasterId,
      ptDeduction: data.ptDeduction,
      addUserStepper: data.addUserStepper,
      visit_geo_check: data.visit_geo_check,
      visit_geo_radius: data.visit_geo_radius,
      showVisitCheckInAttachment: data.showVisitCheckInAttachment,
      requiredVisitCheckInAttachment: data.requiredVisitCheckInAttachment,
      showVisitCheckOutAttachment: data.showVisitCheckOutAttachment,
      requiredVisitCheckOutAttachment: data.requiredVisitCheckOutAttachment,
      uniqueCompanyCode: data.uniqueCompanyCode,
      timezoneID: data.timezoneID,
      otpForLogin: data.otpForLogin,
      loginOtpMethod: data.loginOtpMethod,
      inquiryID: data.inquiryID,
      distanceMethod: data.distanceMethod,
      visit_Auto_Check: data.visit_Auto_Check,
      otBasedOn: data.otBasedOn,
      isAttnStatusChangeable: data.isAttnStatusChangeable,
      empCodeSeqLen: data.empCodeSeqLen,
      empCodeAutoStartsFrom: data.empCodeAutoStartsFrom,
      isAttRemarkRequired: data.isAttRemarkRequired,
      // Foreign Keys
      cityMasterID: data.cityMasterID,
      companyTypeid: data.companyTypeid,

      // Audit
      createBy: user?.userMasterId,
      createByIp: user?.userIpAddress,
    };
  });

  await CompanyAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

companyMaster.belongsTo(Inquiries, {
  foreignKey: { name: 'inquiryID', allowNull: true },
});

companyMaster.belongsTo(CityMaster, { foreignKey: { name: 'cityMasterID' } });
companyMaster.belongsTo(CompanyTypeMaster, {
  foreignKey: { name: 'companyTypeid' },
});
companyMaster.hasMany(companyMaster, {
  as: 'child',
  foreignKey: { name: 'parentCompanyMasterID' },
});
companyMaster.hasMany(ZohoIntegration, {
  foreignKey: 'companyMasterID',
  as: 'zohoIntegration',
});

companyMaster.belongsTo(Timezone, {
  foreignKey: { name: 'timezoneID', allowNull: true },
});
CompanyAmend.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

module.exports = companyMaster;
