const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const CityMaster = require('./citymaster');
const companyMaster = require('./companyMaster');
const branchMaster = require('./branchMaster');
const UserMaster = require('./userMaster');
const WorkingLocationAmend = require('./workingLocationAmend');
const table_name = 'workingLocation';
const WorkingLocation = sequelize.define(
  table_name,
  {
    workingLocationID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    workingLocationName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    // branchMasterID: {
    //   type: Sequelize.INTEGER,
    //   allowNull: true,
    // },
    workingLocationAddress: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    latitude: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    longitude: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    radius: {
      type: Sequelize.DECIMAL(12, 4),
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
      type:Sequelize.BIGINT,
      allowNull:true
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
    paranoid:true,
    indexes: [
      // {
      //   unique: false,
      //   fields: ['branchMasterID'],
      // },
      {
        unique: false,
        fields: ['companyMasterID'],
      },
    ],
  }
);

WorkingLocation.addHook('beforeDestroy', async (WorkingLocation, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  WorkingLocation.deleteBy = options.user.userMasterId;
  WorkingLocation.deleteByIp = options.user.userIpAddress;
  await WorkingLocation.save({
    hooks: false,
    transaction: options.transaction,
  });
});


WorkingLocation.addHook('beforeBulkCreate',async(workingLocation,options)=>{
   workingLocation.user=options.user;
  })
  WorkingLocation.addHook('beforeSave',async (workingLocation,options)=>{
    workingLocation.user=options.user;
  })
WorkingLocation.addHook('afterBulkCreate',async(workingLocation,options)=>{
  await addWorkingLocationAmend(workingLocation,options);
})
WorkingLocation.addHook('afterSave',async(workingLocation,options)=>{
  await addWorkingLocationAmend(workingLocation,options);
})

async function addWorkingLocationAmend(workingLocations, options) {
  const list = Array.isArray(workingLocations)
    ? workingLocations
    : [workingLocations];

  const user = Array.isArray(workingLocations)
    ? workingLocations.user
    : workingLocations.user;

  const rows = list.map((workingLocation) => {
    const data = workingLocation.get({ plain: true });

    return {
      workingLocationID: data.workingLocationID,
      workingLocationName: data.workingLocationName,
      companyMasterID: data.companyMasterID,
      cityMasterID: data.cityMasterID,
      workingLocationAddress: data.workingLocationAddress,
      latitude: data.latitude,
      longitude: data.longitude,
      radius: data.radius,
      status: data.status,
      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await WorkingLocationAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

WorkingLocation.belongsTo(CityMaster, { foreignKey: { name: 'cityMasterID' } });
WorkingLocation.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
// WorkingLocation.belongsTo(branchMaster, {
//   foreignKey: { name: 'branchMasterID' },
// });

WorkingLocation.belongsTo(UserMaster,{
  as: 'createdByUserDetails',
  foreignKey: {name: 'createBy'}
});

WorkingLocation.belongsTo(UserMaster,{
  as: 'updatedByUserDetails',
  foreignKey: {name: 'updateBy'}
});

WorkingLocation.belongsTo(UserMaster,{
  as:'deleteByUserDetails',
  foreignKey:{name:'deleteBy'}
})

WorkingLocationAmend.belongsTo(WorkingLocation, {
  foreignKey: { name: 'workingLocationID' },
});

module.exports = WorkingLocation;
