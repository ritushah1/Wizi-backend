const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const Assignment = require('./assignment');
const UserMaster = require('./userMaster');
const CompanyMaster = require('./companyMaster');
const table_name = 'assignment_allocations';

const AssignmentAllocation = sequelize.define(
  table_name,
  {
    allocationID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    assignmentID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'assignments',
        key: 'assignmentID',
      },
    },
    traineeID: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'userMasters',
        key: 'userMasterID',
      },
    },
    deadline: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    allocatedBy: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'userMasters',
        key: 'userMasterID',
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

// Associations
AssignmentAllocation.belongsTo(Assignment, {
  as: 'assignment',
  foreignKey: 'assignmentID',
  targetKey: 'assignmentID',
});

AssignmentAllocation.belongsTo(UserMaster, {
  as: 'trainee',
  foreignKey: 'traineeID',
  targetKey: 'userMasterID',
});

AssignmentAllocation.belongsTo(UserMaster, {
  as: 'allocator',
  foreignKey: 'allocatedBy',
  targetKey: 'userMasterID',
});

AssignmentAllocation.belongsTo(CompanyMaster, {
  foreignKey: 'companyMasterID',
});

module.exports = AssignmentAllocation;
