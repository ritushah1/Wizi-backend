const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'workFromHomeAuthorizations';
const userMaster = require('./userMaster');
const UserWorkFromHome = require('./userWorkFromHome');

const WorkFromHomeAuthorization = sequelize.define(
  table_name,
  {
    whAuthoriztaionid: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userWorkFromHomeID: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notNull: { msg: 'Work From Home ID  is required' },
        isInt: { msg: 'Work From Home ID must be an integer' },
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
        fields: ['userWorkFromHomeID'],
      },
    ],
  }
);

WorkFromHomeAuthorization.addHook('beforeCreate', (instance, options) => {
  if (options.user) {
    instance.createBy = options.user.userMasterId;
    instance.createByIp = options.user.userIpAddress;
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

WorkFromHomeAuthorization.addHook('beforeUpdate', (instance, options) => {
  if (options.user) {
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

WorkFromHomeAuthorization.addHook('beforeDestroy', (instance, options) => {
  if (options.user) {
    instance.deletedBy = options.user.userMasterId;
    instance.deletedByIp = options.user.userIpAddress;
  }
});

WorkFromHomeAuthorization.belongsTo(UserWorkFromHome, {
  foreignKey: { name: 'userWorkFromHomeID' },
});
UserWorkFromHome.hasMany(WorkFromHomeAuthorization, {
  foreignKey: { name: 'userWorkFromHomeID' },
});

WorkFromHomeAuthorization.belongsTo(userMaster, {
  foreignKey: { name: 'userMasterID' },
});
userMaster.hasMany(WorkFromHomeAuthorization, {
  foreignKey: { name: 'userMasterID' },
});
WorkFromHomeAuthorization.belongsTo(userMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

WorkFromHomeAuthorization.belongsTo(userMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

WorkFromHomeAuthorization.belongsTo(userMaster, {
  as: 'deletedByUserDetails',
  foreignKey: { name: 'deletedBy' },
});

module.exports = WorkFromHomeAuthorization;
