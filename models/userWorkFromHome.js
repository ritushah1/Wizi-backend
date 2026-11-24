const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'userWorkFromHome';
const userMaster = require('./userMaster');
const { WorkFromHomeTypes } = require('../utils/dbUtils');
const AuthorizationCriteriaMaster = require('./authorizationCriteriaMaster');

const UserWorkFromHome = sequelize.define(
  table_name,
  {
    id: {
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
    dayType: {
      type: Sequelize.ENUM(...Object.values(WorkFromHomeTypes)),
      allowNull: false,
      defaultValue: WorkFromHomeTypes.FULLDAY,
      validate: {
        notNull: { msg: 'Day-type is required' },
        notEmpty: { msg: 'Day-type cannot be empty' },
      },
    },
    fromDate: {
      type: Sequelize.DATEONLY,
      allowNull: false,
      validate: {
        notNull: { msg: 'From Date is required' },
        notEmpty: { msg: 'From Date cannot be empty' },
      },
    },
    toDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      validate: {
        isDate: { msg: 'To Date must be a valid date' },
      },
    },
    workFromHomeDays: {
      type: Sequelize.DECIMAL,
      allowNull: false,
      validate: {
        notNull: { msg: 'workFromHomeDays is required' },
        notEmpty: { msg: 'workFromHomeDays cannot be empty' },
      },
    },
    remark: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notNull: { msg: 'remark is required' },
        notEmpty: { msg: 'remark cannot be empty' },
      },
    },
    authorizationStatus: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultVaule: 0,
      comment:
        '0 = Pending (No Authorization), 1 = Pending (Any one, Any two, Any three), 2 = Pending (Sequence), 3 = Approved, 4 = Rejected',
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultVaule: 1,
      comment: '0 = Inactive , 1 = Active',
    },
    AuthorizationCriteriaID: {
      type: Sequelize.BIGINT,
      allowNull: true,
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
    indexes: [{ fields: ['userMasterID'] }],
    validate: {
      toDateRequiredWhenFullDay() {
        if (this.dayType === WorkFromHomeTypes.FULLDAY && !this.toDate) {
          throw new Error('To Date is required when Day Type is Full Day');
        }
      },
      toDateMustBeAfterFromDate() {
        if (this.fromDate && this.toDate && this.toDate < this.fromDate) {
          throw new Error('To Date must be same or after From Date');
        }
      },
    },
  },
);

UserWorkFromHome.addHook('beforeCreate', (instance, options) => {
  if (options.user) {
    instance.createBy = options.user.userMasterId;
    instance.createByIp = options.user.userIpAddress;
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

UserWorkFromHome.addHook('beforeUpdate', (instance, options) => {
  if (options.user) {
    instance.updateBy = options.user.userMasterId;
    instance.updateByIp = options.user.userIpAddress;
  }
});

UserWorkFromHome.addHook('beforeDestroy', async (instance, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  instance.deleteBy = options.user.userMasterId;
  instance.deleteByIp = options.user.userIpAddress;
  await instance.save({
    hooks: false,
    transaction: options.transaction,
  });
});

UserWorkFromHome.belongsTo(userMaster, {
  foreignKey: { name: 'userMasterID' },
});

userMaster.hasMany(UserWorkFromHome, { foreignKey: { name: 'userMasterID' } });
UserWorkFromHome.belongsTo(userMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

UserWorkFromHome.belongsTo(userMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});

UserWorkFromHome.belongsTo(userMaster, {
  as: 'deletedByUserDetails',
  foreignKey: { name: 'deletedBy' },
});

UserWorkFromHome.belongsTo(AuthorizationCriteriaMaster, {
  foreignKey: { name: 'AuthorizationCriteriaID' },
});
UserWorkFromHome.belongsTo(AuthorizationCriteriaMaster, {
  as: 'wfhAuthCri',
  foreignKey: { name: 'AuthorizationCriteriaID' },
});

UserWorkFromHome.belongsTo(userMaster, {
  as: 'authorizer',
  foreignKey: 'authorizedBy',
});

module.exports = UserWorkFromHome;
