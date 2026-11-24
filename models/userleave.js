const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'userLeave';
const userMaster = require('./userMaster');
const hrLeaveTypes = require('./hrLeaveTypes');
const companyMaster = require('./companyMaster');
const { leaveApplyFromEnum } = require('../utils/dbUtils');
const AuthorizationCriteriaMaster = require('./authorizationCriteriaMaster');

const UserLeave = sequelize.define(table_name, {
  UserLeaveApplicationID: {
    type: Sequelize.BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  LeaveTranId: {
    type: Sequelize.BIGINT,
    allowNull: false,
  },
  userMasterID: {
    type: Sequelize.BIGINT,
    allowNull: false,
  },
  companyMasterID: {
    type: Sequelize.BIGINT,
    allowNull: false,
  },
  DayType: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  FromDate: {
    type: Sequelize.DATEONLY,
    allowNull: false,
  },
  ToDate: {
    type: Sequelize.DATEONLY,
    allowNull: false,
  },
  LeaveDays: {
    type: Sequelize.DECIMAL,
    allowNull: false,
  },
  Remark: {
    type: Sequelize.TEXT,
    allowNull: false,
  },
  authorizationStatus: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultVaule: 0,
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
  status: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultVaule: 1,
  },
  attachment: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  leaveFrom: {
    type: Sequelize.ENUM(...Object.values(leaveApplyFromEnum)),
    allowNull: false,
    defaultValue: leaveApplyFromEnum.EMPLOYEE,
  },
  AuthorizationCriteriaID: {
    type: Sequelize.BIGINT,
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
  isAutoApproved: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
},{
  indexes:[
    {
      unique:false,
      fields:['userMasterID']
    },
     {
      unique:false,
      fields:['userMasterID','status']
    },
     {
      unique:false,
      fields:['userMasterID','status','authorizationStatus']
    },
    {
      unique:false,
      fields:['FromDate','ToDate','userMasterID','authorizationStatus','status']
    }
  ]
});
UserLeave.belongsTo(hrLeaveTypes, { foreignKey: { name: 'LeaveTranId' } });
UserLeave.belongsTo(userMaster, { foreignKey: { name: 'userMasterID' } });
UserLeave.belongsTo(companyMaster, { foreignKey: { name: 'companyMasterID' } });
userMaster.hasMany(UserLeave, { foreignKey: { name: 'userMasterID' } });
UserLeave.belongsTo(userMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

UserLeave.belongsTo(userMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

UserLeave.belongsTo(AuthorizationCriteriaMaster, {
  foreignKey: { name: 'AuthorizationCriteriaID' },
});
UserLeave.belongsTo(userMaster, {
  as: 'authorizer',
  foreignKey: 'authorizedBy',
});

module.exports = UserLeave;
