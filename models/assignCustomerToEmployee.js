const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const Customer = require('./customer');
const table_name = 'assignCustomerToEmployee';
const AssignCustomerToEmployee = sequelize.define(
  table_name,
  {
    assignCustToEmpID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    userMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    customerID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    assignDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
  },
  {
    indexes: [
      {
        unique: false,
        fields: ['userMasterID'],
      },
      {
        unique: false,
        fields: ['customerID'],
      },
    ],
  }
);

AssignCustomerToEmployee.addHook('beforeCreate', (assignCust, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  assignCust.createBy = options.user.userMasterId;
  assignCust.createByIp = options.user.userIpAddress;
});

AssignCustomerToEmployee.addHook('beforeUpdate', (assignCust, options) => {
  assignCust.updateBy = options.user.userMasterId;
  assignCust.updateByIp = options.user.userIpAddress;
});

AssignCustomerToEmployee.belongsTo(UserMaster, {
  foreignKey: { name: 'userMasterID' },
});

UserMaster.hasMany(AssignCustomerToEmployee, {
  foreignKey: { name: 'userMasterID' },
});

AssignCustomerToEmployee.belongsTo(Customer, {
  foreignKey: { name: 'customerID' },
});

AssignCustomerToEmployee.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

AssignCustomerToEmployee.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

module.exports = AssignCustomerToEmployee;
