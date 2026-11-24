const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'bankDetailRequests';
const userMaster = require('./userMaster');
const BankMaster = require('./bankMaster');
const AuthorizationCriteriaMaster = require('./authorizationCriteriaMaster');
const BankBranch = require('./bankBranch');

const BankDetailRequest = sequelize.define(
  table_name,
  {
    bankDetailRequestId: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notNull: { msg: 'userMasterID is required' },
        isInt: { msg: 'userMasterID must be an integer' },
      },
    },
    bankMasterID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notNull: { msg: 'Bank is required' },
        isInt: { msg: 'Bank must be an integer' },
      },
    },
    bankBranchID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    IFSCCode: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    accountNo: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: 'Account number is required' },
        isNumeric: {
          msg: 'Account number must contain only numbers',
        },
      },
    },
    accountHolderName: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: 'Account holder name is required' },
        notEmpty: { msg: 'Account holder name cannot be empty' },
        is: {
          args: /^[a-zA-Z\s.]+$/,
          msg: 'Name can contain only letters, spaces, and dots',
        },
      },
    },
    authorizationStatus: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment:
        '0 = Pending (No Authorization), 1 = Pending (Any one, Any two, Any three), 2 = Pending (Sequence), 3 = Approved, 4 = Rejected',
    },
    AuthorizationCriteriaID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '0 = Inactive , 1 = Active',
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
    deletedBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deletedByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    deletedAt: {
      type: Sequelize.DATE,
      allowNull: true,
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
  },
  {
    timestamps: true,
    paranoid: true,
    tableName: table_name,
    indexes: [
      {
        unique: false,
        fields: ['userMasterID'],
      },
      {
        unique: false,
        fields: ['bankMasterID'],
      },
    ],
  }
);

BankDetailRequest.addHook('beforeCreate', (instance, options) => {
  if (options.user) {
    instance.createBy = options.user.userMasterId;
    instance.createByIp = options.user.userIpAddress;
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

BankDetailRequest.addHook('beforeUpdate', (instance, options) => {
  if (options.user) {
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

BankDetailRequest.addHook('beforeDestroy', (instance, options) => {
  if (options.user) {
    instance.deletedBy = options.user.userMasterId;
    instance.deletedByIp = options.user.userIpAddress;
  }
});

BankDetailRequest.belongsTo(userMaster, {
  foreignKey: { name: 'userMasterID' },
});

BankDetailRequest.belongsTo(BankMaster, {
  foreignKey: { name: 'bankMasterID' },
});

userMaster.hasMany(BankDetailRequest, { foreignKey: { name: 'userMasterID' } });
BankDetailRequest.belongsTo(userMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

BankDetailRequest.belongsTo(userMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

BankDetailRequest.belongsTo(userMaster, {
  as: 'deletedByUserDetails',
  foreignKey: { name: 'deletedBy' },
});

BankDetailRequest.belongsTo(AuthorizationCriteriaMaster, {
  foreignKey: { name: 'AuthorizationCriteriaID' },
});

BankDetailRequest.belongsTo(BankBranch, {
  foreignKey: { name: 'bankBranchID' },
});

BankDetailRequest.belongsTo(userMaster, {
  as: 'authorizer',
  foreignKey: 'authorizedBy',
});

module.exports = BankDetailRequest;
