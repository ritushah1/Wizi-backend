const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'holidayPolicy';
const CompanyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const { policyScope } = require('../utils/dbUtils');
const holidayPolicy = sequelize.define(table_name, {
  holidayPolicyID: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  holidayPolicyName: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  holidayYear: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  companyMasterID: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  status: {
    type: Sequelize.BIGINT,
    allowNull: false,
    defaultValue: 1,
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
  branch_scope: {
    type: Sequelize.ENUM(...Object.values(policyScope)),
    defaultValue: policyScope.ALL,
  },
  department_scope: {
    type: Sequelize.ENUM(...Object.values(policyScope)),
    defaultValue: policyScope.ALL,
  },
  designation_scope: {
    type: Sequelize.ENUM(...Object.values(policyScope)),
    defaultValue: policyScope.ALL,
  },
  isDefault: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
});

// holidayPolicy.belongsTo(UserMaster,{
//   as: 'createdByUserDetails',
//   foreignKey: {name: 'createBy'}
// });

// holidayPolicy.belongsTo(UserMaster,{
//   as: 'updatedByUserDetails',
//   foreignKey: {name: 'updateBy'}
// });

holidayPolicy.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

module.exports = holidayPolicy;
