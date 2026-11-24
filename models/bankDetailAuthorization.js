const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'bankDetailAuthorizations';
const userMaster = require('./userMaster');
const BankDetailRequest = require('./bankDetailRequest');

const BankDetailAuthorization = sequelize.define(
  table_name,
  {
    bankDetailAuthorizationId: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    bankDetailRequestId: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notNull: { msg: 'Bank Detail Request  is required' },
        isInt: { msg: 'Bank Detail Request must be an integer' },
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
    remark: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    authStatus: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultVaule: 2,
      comment: '0 = Reject , 1 = Accepyed, 2 = Pending',
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultVaule: 1,
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
        fields: ['bankDetailRequestId'],
      },
    ],
  }
);

BankDetailAuthorization.addHook('beforeCreate', (instance, options) => {
  if (options.user) {
    instance.createBy = options.user.userMasterId;
    instance.createByIp = options.user.userIpAddress;
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

BankDetailAuthorization.addHook('beforeUpdate', (instance, options) => {
  if (options.user) {
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

BankDetailAuthorization.addHook('beforeDestroy', (instance, options) => {
  if (options.user) {
    instance.deletedBy = options.user.userMasterId;
    instance.deletedByIp = options.user.userIpAddress;
  }
});

BankDetailAuthorization.belongsTo(BankDetailRequest, {
  foreignKey: { name: 'bankDetailRequestId' },
});
BankDetailRequest.hasMany(BankDetailAuthorization, {
  foreignKey: { name: 'bankDetailRequestId' },
});

BankDetailAuthorization.belongsTo(userMaster, {
  foreignKey: { name: 'userMasterID' },
});
userMaster.hasMany(BankDetailAuthorization, {
  foreignKey: { name: 'userMasterID' },
});
BankDetailAuthorization.belongsTo(userMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

BankDetailAuthorization.belongsTo(userMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

BankDetailAuthorization.belongsTo(userMaster, {
  as: 'deletedByUserDetails',
  foreignKey: { name: 'deletedBy' },
});

module.exports = BankDetailAuthorization;
