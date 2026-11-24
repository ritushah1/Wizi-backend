const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const Department = require('./department');
const StateMaster = require('./statemaster');
const Division = require('./division');
const WorkingArea = require('./workingArea');
const Designation = require('./designation');
const BranchMaster = require('./branchMaster');
const companyMaster = require('./companyMaster');
const AuthorizationCriteriaMaster = require('./authorizationCriteriaMaster');
const JobPosting = require('./jobPosting');
const table_name = 'manPowerRequisitionRequest';

const ManPowerRequisitionRequest = sequelize.define(
  table_name,
  {
    manPowerRequisitionID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    jobTitle: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    branchID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    departmentID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    designationID: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    devisionID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    workingAreaID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    typeOfRequirement: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    employmentType: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    reportTo: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    isTravelRequired: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },
    Grade: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    workingCity: {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: false,
    },
    workingState: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    vendorToHandle: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    ctcFrom: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    ctcTo: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    expFrom: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    expTo: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    remarks: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    previousEmp: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    previousEmpCTC: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    authorizationStatus: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    jobPostId: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    authCriteriaID:{
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    createBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
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
    deleteBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    paranoid: true,
    timestamps: true,
  },
);

ManPowerRequisitionRequest.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

companyMaster.hasMany(ManPowerRequisitionRequest, {
  foreignKey: { name: 'companyMasterID' },
});

ManPowerRequisitionRequest.belongsTo(UserMaster, {
  as:'requestedBy',
  foreignKey: { name: 'userMasterID' },
});

UserMaster.hasMany(ManPowerRequisitionRequest, {
  as:'requestedBy',
  foreignKey: { name: 'userMasterID' },
});

ManPowerRequisitionRequest.belongsTo(UserMaster, {
  as:'reportToEmp',
  foreignKey: { name: 'reportTo' },
});

UserMaster.hasMany(ManPowerRequisitionRequest, {
  as:'reportToEmp',
  foreignKey: { name: 'reportTo' },
});

ManPowerRequisitionRequest.belongsTo(BranchMaster, {
  foreignKey: { name: 'branchID' },
});

BranchMaster.hasMany(ManPowerRequisitionRequest, {
  foreignKey: { name: 'branchID' },
});

ManPowerRequisitionRequest.belongsTo(Designation, {
  foreignKey: { name: 'designationID' },
});

Designation.hasMany(ManPowerRequisitionRequest, {
  foreignKey: { name: 'designationID' },
});

ManPowerRequisitionRequest.belongsTo(WorkingArea, {
  foreignKey: { name: 'workingAreaID' },
});

WorkingArea.hasMany(ManPowerRequisitionRequest, {
  foreignKey: { name: 'workingAreaID' },
});

ManPowerRequisitionRequest.belongsTo(Division, {
  foreignKey: { name: 'devisionID' },
});

Division.hasMany(ManPowerRequisitionRequest, {
  foreignKey: { name: 'devisionID' },
});

ManPowerRequisitionRequest.belongsTo(Department, {
  foreignKey: { name: 'departmentID' },
});

Department.hasMany(ManPowerRequisitionRequest, {
  foreignKey: { name: 'departmentID' },
});

ManPowerRequisitionRequest.belongsTo(StateMaster, {
  foreignKey: { name: 'workingState' },
});

StateMaster.hasMany(ManPowerRequisitionRequest, {
  foreignKey: { name: 'workingState' },
});

ManPowerRequisitionRequest.belongsTo(UserMaster, {
  foreignKey: { name: 'previousEmp' },
  as: 'replacedEmp',
});

UserMaster.hasMany(ManPowerRequisitionRequest, {
  foreignKey: { name: 'previousEmp' },
  as: 'replacedEmp',
});

ManPowerRequisitionRequest.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

ManPowerRequisitionRequest.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

ManPowerRequisitionRequest.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

ManPowerRequisitionRequest.belongsTo(UserMaster, {
  foreignKey: { name: 'manPowerRequisition' },
});

UserMaster.hasMany(ManPowerRequisitionRequest, {
  foreignKey: { name: 'manPowerRequisition' },
});

ManPowerRequisitionRequest.belongsTo(AuthorizationCriteriaMaster, {
  foreignKey: { name: 'authCriteriaID' },
});

AuthorizationCriteriaMaster.hasMany(ManPowerRequisitionRequest, {
  foreignKey: { name: 'authCriteriaID' },
});

ManPowerRequisitionRequest.belongsTo(JobPosting, {
  foreignKey: { name: 'jobPostId' },
});

JobPosting.hasMany(ManPowerRequisitionRequest, {
  foreignKey: { name: 'jobPostId' },
});

ManPowerRequisitionRequest.belongsTo(UserMaster, {
  as: 'authorizer',
  foreignKey: 'authorizedBy',
});

ManPowerRequisitionRequest.addHook(
  'beforeCreate',
  (manPowerRequisitionRequest, options) => {
    manPowerRequisitionRequest.createBy = options.user.userMasterId;
    manPowerRequisitionRequest.createByIp = options.user.userIpAddress;
  },
);

ManPowerRequisitionRequest.addHook(
  'beforeUpdate',
  (manPowerRequisitionRequest, options) => {
    manPowerRequisitionRequest.updateBy = options.user.userMasterId;
    manPowerRequisitionRequest.updateByIp = options.user.userIpAddress;
  },
);

ManPowerRequisitionRequest.addHook(
  'beforeDestroy',
  (manPowerRequisitionRequest, options) => {
    manPowerRequisitionRequest.deleteBy = options.user.userMasterId;
    manPowerRequisitionRequest.deleteByIp = options.user.userIpAddress;
  },
);

module.exports = ManPowerRequisitionRequest;
