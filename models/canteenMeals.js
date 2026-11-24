const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const canteenDetails = require('./canteenDetails');
const UserMaster = require('./userMaster');
const { mealTypeEnum } = require('../utils/dbUtils');

const CanteenMeals = sequelize.define(
  'canteenMeals',
  {
    id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    mealType: {
      type: Sequelize.ENUM(...Object.values(mealTypeEnum)),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Meal Type is required.' },
        checkType(value) {
          if (!Object.values(mealTypeEnum).includes(value)) {
            throw new Error(
              `Invalid mealType. Allowed values: ${Object.values(mealTypeEnum).join(', ')}`
            );
          }
        },
      },
    },
    startTime: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Start time is required.' },
      },
    },
    endTime: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'End time is required.' },
      },
    },
    employeeShare: {
      type: Sequelize.FLOAT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Employee share is required.' },
        isFloat: { msg: 'Employee share must be a valid number.' },
        min: {
          args: [0],
          msg: 'Employee share must be a non-negative number.',
        },
      },
    },
    companyShare: {
      type: Sequelize.FLOAT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Company share is required.' },
        isFloat: { msg: 'Company share must be a valid number.' },
        min: {
          args: [0],
          msg: 'Company share must be a non-negative number.',
        },
      },
    },
    // applicable if only full day
    isApplicableOnFD: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    canteenDetailsId: {
      type: Sequelize.BIGINT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Canteen Details ID is required.' },
      },
    },
    status: {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    createBy: Sequelize.INTEGER,
    updateBy: Sequelize.INTEGER,
    deleteBy: Sequelize.INTEGER,
    createByIp: Sequelize.STRING,
    updateByIp: Sequelize.STRING,
    deleteByIp: Sequelize.STRING,
  },
  {
    paranoid: true, // enables soft delete
    indexes: [
      { fields: ['mealType'] },
      { fields: ['canteenDetailsId'] },
      {
        unique: true,
        name: 'unique_active_canteen_meal',
        fields: ['canteenDetailsId', 'mealType'],
        where: {
          status: 1,
          deletedAt: null,
        },
      },
    ],
  }
);

// ✅ Hooks for tracking user + IP info
CanteenMeals.addHook('beforeCreate', (record, options) => {
  if (options.user) {
    record.createBy = options.user.userMasterId;
    record.createByIp = options.user.userIpAddress;
  }
});

CanteenMeals.addHook('beforeUpdate', (record, options) => {
  if (options.user) {
    record.updateBy = options.user.userMasterId;
    record.updateByIp = options.user.userIpAddress;
  }
});

CanteenMeals.addHook('beforeDestroy', (record, options) => {
  if (options.user) {
    record.deleteBy = options.user.userMasterId;
    record.deleteByIp = options.user.userIpAddress;
  }
});

// ✅ Hook for manual uniqueness validation
CanteenMeals.addHook('beforeValidate', async (record) => {
  if (record.canteenDetailsId && record.mealType) {
    const existing = await CanteenMeals.findOne({
      where: {
        canteenDetailsId: record.canteenDetailsId,
        mealType: record.mealType,
        status: 1,
        deletedAt: null,
        id: { [Sequelize.Op.ne]: record.id || null },
      },
    });

    if (existing) {
      throw new Error(
        `Meal type '${record.mealType}' already exists for this canteen.`
      );
    }
  }
});

// Associations
CanteenMeals.belongsTo(canteenDetails, {
  foreignKey: { name: 'canteenDetailsId' },
});
canteenDetails.hasMany(CanteenMeals, {
  foreignKey: { name: 'canteenDetailsId' },
});

CanteenMeals.belongsTo(UserMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});

CanteenMeals.belongsTo(UserMaster, {
  as: 'updateByUser',
  foreignKey: { name: 'updateBy' },
});

CanteenMeals.belongsTo(UserMaster, {
  as: 'deleteByUser',
  foreignKey: { name: 'deleteBy' },
});

module.exports = CanteenMeals;
