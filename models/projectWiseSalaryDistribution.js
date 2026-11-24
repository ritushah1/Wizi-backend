const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const { PayrollFrequencyType } = require('../utils/dbUtils');
const { month_dict } = require('../utils/commonUtilFunctions');

const ProjectWiseSalaryDistribution = sequelize.define(
  'projectWiseSalaryDistribution',
  {
    id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'User is required.' },
      },
    },

    applicableYYYYMM: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'applicableYYYYMM is required.' },
      },
    },

    payrollFrequency: {
      type: Sequelize.ENUM(...Object.values(PayrollFrequencyType)),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'payrollFrequency is required.' },
        isIn: {
          args: [Object.values(PayrollFrequencyType)],
          msg: `Invalid payrollFrequency. Allowed values are: ${Object.values(PayrollFrequencyType).join(', ')}`,
        },
      },
    },

    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      validate: {
        isRequiredForNonMonthly(value) {
          if (
            this.payrollFrequency === PayrollFrequencyType.FORTNIGHTLY ||
            this.payrollFrequency === PayrollFrequencyType.WEEKLY
          ) {
            if (!value)
              throw new Error(
                'startDate is required for WEEKLY or FORTNIGHTLY payroll frequency.'
              );
          }
        },
      },
    },

    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
      validate: {
        isRequiredForNonMonthly(value) {
          if (
            this.payrollFrequency === PayrollFrequencyType.FORTNIGHTLY ||
            this.payrollFrequency === PayrollFrequencyType.WEEKLY
          ) {
            if (!value)
              throw new Error(
                'endDate is required for WEEKLY or FORTNIGHTLY payroll frequency.'
              );
          }
        },
      },
    },

    createBy: { type: Sequelize.BIGINT },
    updateBy: { type: Sequelize.BIGINT },
    deleteBy: { type: Sequelize.BIGINT },
    createByIp: { type: Sequelize.STRING },
    updateByIp: { type: Sequelize.STRING },
    deleteByIp: { type: Sequelize.STRING },
  },
  {
    paranoid: true,

    // ---------------------- INDEXES ----------------------
    indexes: [
      // Unique for MONTHLY: payrollFrequency + user + applicableYYYYMM
      {
        name: 'unique_monthly_distribution',
        unique: true,
        fields: ['payrollFrequency', 'userMasterID', 'applicableYYYYMM'],
        where: {
          payrollFrequency: PayrollFrequencyType.MONTHLY,
          deletedAt: null,
        },
      },

      // Unique for WEEKLY / FORTNIGHTLY: payrollFrequency + user + startDate + endDate
      {
        name: 'unique_range_distribution',
        unique: true,
        fields: ['payrollFrequency', 'userMasterID', 'startDate', 'endDate'],
        where: {
          payrollFrequency: [
            PayrollFrequencyType.WEEKLY,
            PayrollFrequencyType.FORTNIGHTLY,
          ],
          deletedAt: null,
        },
      },

      // Normal indexes
      { name: 'idx_userMasterID', fields: ['userMasterID'] },
      { name: 'idx_startDate', fields: ['startDate'] },
      { name: 'idx_endDate', fields: ['endDate'] },
    ],
  }
);

// ---------------------- Hooks for audit fields ----------------------

ProjectWiseSalaryDistribution.addHook(
  'beforeValidate',
  async function (data, options) {
    const {
      payrollFrequency,
      applicableYYYYMM,
      startDate,
      endDate,
      userMasterID,
    } = data;

    // ---------------- MONTHLY CHECK ----------------
    if (payrollFrequency === PayrollFrequencyType.MONTHLY) {
      if (!applicableYYYYMM) {
        throw new Error(
          'applicableYYYYMM is required for MONTHLY payroll frequency.'
        );
      }

      // Check if same month already exists for user
      const exists = await ProjectWiseSalaryDistribution.findOne({
        where: {
          payrollFrequency,
          userMasterID,
          applicableYYYYMM,
          deletedAt: null,
          id: { [Sequelize.Op.ne]: data.id || 0 }, // exclude current record on update
        },
      });

      if (exists) {
        throw new Sequelize.ValidationError(
          `Salary distribution already exists for this user for month ${month_dict[String(applicableYYYYMM).slice(4, 6)] + '-' + String(applicableYYYYMM).slice(0, 4)}.`
        );
      }
    }

    // ---------------- WEEKLY / FORTNIGHTLY CHECK ----------------
    if (
      payrollFrequency === PayrollFrequencyType.WEEKLY ||
      payrollFrequency === PayrollFrequencyType.FORTNIGHTLY
    ) {
      if (!startDate || !endDate) {
        throw new Sequelize.ValidationError(
          'startDate and endDate are required for WEEKLY/FORTNIGHTLY payroll frequency.'
        );
      }

      const exists = await ProjectWiseSalaryDistribution.findOne({
        where: {
          payrollFrequency,
          userMasterID,
          startDate,
          endDate,
          deletedAt: null,
          id: { [Sequelize.Op.ne]: data.id || 0 },
        },
      });

      if (exists) {
        throw new Sequelize.ValidationError(
          `Salary distribution already exists for this user for the period ${startDate} to ${endDate}.`
        );
      }
    }
  }
);

ProjectWiseSalaryDistribution.addHook(
  'beforeCreate',
  (salaryDistribution, options) => {
    if (options.user) {
      salaryDistribution.createBy = options.user.userMasterId;
      salaryDistribution.createByIp = options.user.userIpAddress;
    }
  }
);

ProjectWiseSalaryDistribution.addHook(
  'beforeUpdate',
  (salaryDistribution, options) => {
    if (options.user) {
      salaryDistribution.updateBy = options.user.userMasterId;
      salaryDistribution.updateByIp = options.user.userIpAddress;
    }
  }
);

ProjectWiseSalaryDistribution.addHook(
  'beforeDestroy',
  (salaryDistribution, options) => {
    if (options.user) {
      salaryDistribution.deleteBy = options.user.userMasterId;
      salaryDistribution.deleteByIp = options.user.userIpAddress;
    }
  }
);

// ---------------------- Associations ----------------------
ProjectWiseSalaryDistribution.belongsTo(UserMaster, {
  foreignKey: { name: 'userMasterID' },
});
UserMaster.hasMany(ProjectWiseSalaryDistribution, {
  as: 'PWSD', // project wise salary distributions
  foreignKey: { name: 'userMasterID' },
});

ProjectWiseSalaryDistribution.belongsTo(UserMaster, {
  as: 'createByUser',
  foreignKey: { name: 'createBy' },
});
ProjectWiseSalaryDistribution.belongsTo(UserMaster, {
  as: 'updateByUser',
  foreignKey: { name: 'updateBy' },
});
ProjectWiseSalaryDistribution.belongsTo(UserMaster, {
  as: 'deleteByUser',
  foreignKey: { name: 'deleteBy' },
});

module.exports = ProjectWiseSalaryDistribution;
