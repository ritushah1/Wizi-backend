const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CompanyMaster = require('./companyMaster');
const Department = require('./department');
const UserMaster = require('./userMaster');
const table_name = 'assignments';

const Assignment = sequelize.define(
  table_name,
  {
    assignmentID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    title: {
      type: Sequelize.STRING(200),
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    instructions: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    textBlocks: {
      type: Sequelize.JSON,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM('DRAFT', 'ACTIVE', 'ARCHIVED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    departmentID: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'departmentId',
      },
    },
    assessmentID: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'assessments',
        key: 'assessmentID',
      },
    },
    createdBy: {
      type: Sequelize.INTEGER,
    },
    updatedBy: {
      type: Sequelize.INTEGER,
    },
    deletedBy: {
      type: Sequelize.INTEGER,
    },
    createdByIp: {
      type: Sequelize.STRING,
    },
    updatedByIp: {
      type: Sequelize.STRING,
    },
    deletedByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    timestamps: true,
    paranoid: true,
  },
);

Assignment.belongsTo(UserMaster, {
  as: 'createBy',
  foreignKey: 'createdBy',
  targetKey: 'userMasterID',
});

Assignment.belongsTo(UserMaster, {
  as: 'updateBy',
  foreignKey: 'updatedBy',
  targetKey: 'userMasterID',
});

Assignment.belongsTo(CompanyMaster, {
  foreignKey: 'companyMasterID',
});

Assignment.belongsTo(Department, {
  as: 'department',
  foreignKey: 'departmentID',
});

module.exports = Assignment;
