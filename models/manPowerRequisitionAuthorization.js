const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const ManPowerRequisitionRequest = require('./manPowerRequisitionRequest');
const table_name = 'manPowerRequisitionAuthorization';

const ManPowerRequisitionAuthorization = sequelize.define(
  table_name,
  {
    manPowerRequisitionAuthorizationID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    manPowerRequisitionID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notNull: { msg: 'Manpower Requisition ID Request  is required' },
        isInt: { msg: 'Manpower Requisition ID Request must be an integer' },
      },
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notNull: { msg: 'userMasterID is required' },
        isInt: { msg: 'userMasterID must be an integer' },
      },
    },
    remarks: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    authStatus: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: '0 = Reject , 1 = Accepyed, 2 = Pending',
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '0 = InActive , 1 = Active',
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

ManPowerRequisitionAuthorization.belongsTo(UserMaster, {
  foreignKey: { name: 'userMasterID' },
});

UserMaster.hasMany(ManPowerRequisitionAuthorization, {
  foreignKey: { name: 'userMasterID' },
});

ManPowerRequisitionAuthorization.belongsTo(ManPowerRequisitionRequest, {
  as: 'manPowerAuth',
  foreignKey: { name: 'manPowerRequisitionID' },
});

ManPowerRequisitionRequest.hasMany(ManPowerRequisitionAuthorization, {
  as: 'manPowerAuth',
  foreignKey: { name: 'manPowerRequisitionID' },
});

ManPowerRequisitionAuthorization.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

ManPowerRequisitionAuthorization.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

ManPowerRequisitionAuthorization.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

ManPowerRequisitionAuthorization.addHook(
  'beforeCreate',
  (manPowerRequisitionAuthorization, options) => {
    manPowerRequisitionAuthorization.createBy = options.user.userMasterId;
    manPowerRequisitionAuthorization.createByIp = options.user.userIpAddress;
  },
);

ManPowerRequisitionAuthorization.addHook(
  'beforeUpdate',
  (manPowerRequisitionAuthorization, options) => {
    manPowerRequisitionAuthorization.updateBy = options.user.userMasterId;
    manPowerRequisitionAuthorization.updateByIp = options.user.userIpAddress;
  },
);

ManPowerRequisitionAuthorization.addHook(
  'beforeDestroy',
  (manPowerRequisitionAuthorization, options) => {
    manPowerRequisitionAuthorization.deleteBy = options.user.userMasterId;
    manPowerRequisitionAuthorization.deleteByIp = options.user.userIpAddress;
  },
);

module.exports = ManPowerRequisitionAuthorization;
