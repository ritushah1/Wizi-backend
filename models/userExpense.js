const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('./userMaster');
const visit = require('./visit');
const tour = require('./toursMaster');
const Project = require('./project');
const table_name = 'userExpense';
const UserExpense = sequelize.define(
  table_name,
  {
    userExpenseID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    visitID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    userMasterID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    ToursMasterID: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    expense_date: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
    // expenseCategoryId: {
    //   type: Sequelize.INTEGER,
    //   allowNull: true,
    // },
    status: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    projectID: {
      type: Sequelize.INTEGER,
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

    deleteBy: {
      type: Sequelize.INTEGER,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
    serviceNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    serviceDate: {
      type: Sequelize.DATEONLY,
      allowNull: true,
    },
  },
  {
    paranoid: true,
    indexes: [
      {
        fields: ['userMasterID'],
      },
      {
        fields: ['userMasterID', 'expense_date'],
      },
    ],
  },
);

UserExpense.belongsTo(UserMaster, { foreignKey: { name: 'userMasterID' } });

UserExpense.belongsTo(visit, { foreignKey: { name: 'visitID' } });
UserExpense.belongsTo(tour, { foreignKey: { name: 'ToursMasterID' } });

UserMaster.hasMany(UserExpense, {
  foreignKey: { name: 'userMasterID' },
});
UserExpense.belongsTo(Project, {
  foreignKey: { name: 'projectID' },
});

visit.hasMany(UserExpense, {
  foreignKey: { name: 'visitID' },
});
UserExpense.belongsTo(UserMaster, {
  foreignKey: { name: 'createBy' },
  as: 'c_By',
});

UserExpense.belongsTo(UserMaster, {
  foreignKey: { name: 'updateBy' },
  as: 'u_By',
});
module.exports = UserExpense;
