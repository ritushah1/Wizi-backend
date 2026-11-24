const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const Department = require('./department');
const BranchMaster = require('./branchMaster');
const Designation = require('./designation');
const Division = require('./division');
const table_name = 'resignProcess';
const ResignProcessAmend = require('./resignProcessAmend');
const UserMaster = require('./userMaster');

const ResignProcess = sequelize.define(table_name, {
  resignProcessID: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  companyMasterID: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  departmentID: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  branchID: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  designationID: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  divisionID: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  status: {
    type: Sequelize.INTEGER,
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
  deleteBy:{
   type : Sequelize.BIGINT,
  },
  createByIp: {
    type: Sequelize.STRING,
    allowNull: true,
  },
  updateByIp: {
    type: Sequelize.STRING,
    allowNull: true,
  },
},{
  paranoid:true
});

ResignProcess.addHook('beforeCreate', (ResignProcess, options) => {
  // Set createBy, updateBy, and ipAddress based on the authenticated user
  ResignProcess.createBy = options.user.userMasterId;
  ResignProcess.updateBy = options.user.userMasterId;
  ResignProcess.createByIp = options.user.userIpAddress;
  ResignProcess.updateByIp = options.user.userIpAddress;
});

ResignProcess.addHook('beforeUpdate', (ResignProcess, options) => {
  ResignProcess.updateBy = options.user.userMasterId;
  ResignProcess.ipAddress = options.user.userIpAddress;
  ResignProcess.updateByIp = options.user.userIpAddress;
});

ResignProcess.addHook('beforeDestroy', async (ResignProcess, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  ResignProcess.deleteBy = options.user.userMasterId;
  ResignProcess.deleteByIp = options.user.userIpAddress;
  await ResignProcess.save({
    hooks: false,
    transaction: options.transaction,
  });
});

ResignProcess.belongsTo(companyMaster, {
  as: 'company',
  foreignKey: { name: 'companyMasterID' },
});
ResignProcess.belongsTo(Department, {
  as: 'department',
  foreignKey: { name: 'departmentID' },
});
ResignProcess.belongsTo(BranchMaster, {
  as: 'branch',
  foreignKey: { name: 'branchID' },
});
ResignProcess.belongsTo(Designation, {
  as: 'designation',
  foreignKey: { name: 'designationID' },
});
ResignProcess.belongsTo(Division, {
  as: 'division',
  foreignKey: { name: 'divisionID' },
});

async function addResignProcessAmend(process, options) {
  const user = options.user;

  const data = process.get({ plain: true });

  await ResignProcessAmend.create(
    {
      resignProcessID: data.resignProcessID,
      companyMasterID: data.companyMasterID,
      departmentID: data.departmentID,
      branchID: data.branchID,
      designationID: data.designationID,
      divisionID: data.divisionID,
      status: data.status,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    },
    {
      transaction: options.transaction,
    }
  );
}

ResignProcess.addHook(
  'afterSave',
  async (resignProcess, options) => {
    await addResignProcessAmend(
      resignProcess,
      options
    );
  }
);

ResignProcessAmend.belongsTo(ResignProcess, {
  as: 'resignProcess',
  foreignKey: {
    name: 'resignProcessID',
  },
});

ResignProcess.hasMany(ResignProcessAmend, {
  as: 'amendHistory',
  foreignKey: {
    name: 'resignProcessID',
  },
});

ResignProcess.belongsTo(UserMaster, {
  as: 'createdByUser',
  foreignKey: { name: 'createBy' },
});

ResignProcess.belongsTo(UserMaster, {
  as: 'updatedByUser',
  foreignKey: { name: 'updateBy' },
});
ResignProcess.belongsTo(UserMaster, {
  as: 'deleteByUser',
  foreignKey: { name: 'deleteBy' },
});


module.exports = ResignProcess;
