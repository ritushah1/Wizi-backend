const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const GradeStructure = require('./gradeStructure');
const HRSalaryFields = require('./hrSalaryFields');
const UserMaster = require('./userMaster');
const table_name = 'salaryBasedOnDays';

const SalaryBasedOnDays = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    gradeStructureID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'Grade is required' },
        isInt: { msg: 'Invalid grade ID' },
      },
    },

    salaryFieldID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'Salary field is required' },
        isInt: { msg: 'Invalid salary field ID' },
      },
    },

    maxPresentDays: {
      type: Sequelize.FLOAT,
      allowNull: false,
      validate: {
        notNull: { msg: 'PresentDays is required' },
        min: {
          args: [0],
          msg: 'PresentDays cannot be negative',
        },
      },
    },

    amount: {
      type: Sequelize.FLOAT,
      allowNull: false,
      validate: {
        notNull: { msg: 'Amount is required' },
        min: {
          args: [0],
          msg: 'Amount must be greater than zero',
        },
      },
    },

    maxPresentDays1: {
      type: Sequelize.FLOAT,
      allowNull: false,
      validate: {
        notNull: { msg: 'PresentDays is required' },
        min: {
          args: [0],
          msg: 'PresentDays cannot be negative',
        },
      },
    },

    amount1: {
      type: Sequelize.FLOAT,
      allowNull: false,
      validate: {
        notNull: { msg: 'Amount is required' },
        min: {
          args: [0],
          msg: 'Amount must be greater than zero',
        },
      },
    },

    status: {
      type: Sequelize.INTEGER,
      defaultValue: 1,
    },

    createBy: {
      type: Sequelize.BIGINT,
    },

    updateBy: {
      type: Sequelize.BIGINT,
    },

    createByIp: Sequelize.STRING,
    updateByIp: Sequelize.STRING,

    deleteBy: Sequelize.BIGINT,
    deleteByIp: Sequelize.STRING,
  },
  {
    paranoid: true,
    validate: {
      maxPresentDays1Rule() {
        // maxPresentDays1 must be > maxPresentDays
        if (this.maxPresentDays1 <= this.maxPresentDays) {
          throw new Error(
            'maxPresentDays1 must be greater than maxPresentDays'
          );
        }

        // maxPresentDays1 must be <= 31
        if (this.maxPresentDays1 > 31) {
          throw new Error('maxPresentDays1 cannot be greater than 31');
        }
      },
    },

    indexes: [
      {
        unique: true,
        fields: ['gradeStructureID', 'salaryFieldID'],
        name: 'uniq_grade_salaryfield',
        where: {
          deletedAt: null,
        },
      },
    ],
  }
);

SalaryBasedOnDays.addHook('beforeCreate', (SalaryBasedOnDays, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  SalaryBasedOnDays.createBy = options.user.userMasterId;
  SalaryBasedOnDays.createByIp = options.user.userIpAddress;
});

SalaryBasedOnDays.addHook('beforeUpdate', (SalaryBasedOnDays, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  SalaryBasedOnDays.updateBy = options.user.userMasterId;
  SalaryBasedOnDays.updateByIp = options.user.userIpAddress;
});

SalaryBasedOnDays.addHook('beforeDestroy', (SalaryBasedOnDays, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  SalaryBasedOnDays.deleteBy = options.user.userMasterId;
  SalaryBasedOnDays.deleteByIp = options.user.userIpAddress;
});

SalaryBasedOnDays.belongsTo(GradeStructure, {
  foreignKey: { name: 'gradeStructureID' },
});

SalaryBasedOnDays.belongsTo(HRSalaryFields, {
  foreignKey: { name: 'salaryFieldID' },
});

SalaryBasedOnDays.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

SalaryBasedOnDays.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

SalaryBasedOnDays.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});

module.exports = SalaryBasedOnDays;
