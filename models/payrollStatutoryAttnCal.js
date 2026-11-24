const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const HrLeaveTypes = require('./hrLeaveTypes');
const UserMaster = require('./userMaster');
const { PayrollFrequencyType } = require('../utils/dbUtils');
const table_name = 'payrollStatutoryAttnCal';

const PayrollStatutoryAttnCal = sequelize.define(
  table_name,
  {
    id: {
      type: Sequelize.BIGINT,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    //foreign key
    userMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    //foreign key
    LeaveTranId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    AttnYearMon: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    MonDays: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    MonWorkDays: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
    AttnVal: {
      type: Sequelize.FLOAT,
      allowNull: false,
    },
     monthstartdate: {
      type: Sequelize.DATEONLY,
    },
    monthenddate: {
      type: Sequelize.DATEONLY,
    },
    payrollFrequency: {
      type: Sequelize.ENUM(...Object.values(PayrollFrequencyType)),
      allowNull: false,
      defaultValue: PayrollFrequencyType.MONTHLY,
    },
    startDate: {
      type: Sequelize.DATEONLY,
    },
    endDate: {
      type: Sequelize.DATEONLY,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    updateBy: {
      type: Sequelize.BIGINT,
    },
    deleteBy:{
 type: Sequelize.BIGINT,
    },
    createByIp: {
      type: Sequelize.STRING,
    },
    updateByIp: {
      type: Sequelize.STRING,
    },
    deleteByIp: {
      type: Sequelize.STRING,
    },
  },
  {
    paranoid:true,
    indexes: [
      {
        unique: false,
        fields: ['userMasterID'],
      },
      {
        unique: false,
        fields: ['LeaveTranId'],
      },
      {
        unique: false,
        fields: ['AttnYearMon', 'userMasterID'],
      },
      {
        unique: false,
        fields: ['userMasterID', 'monthstartdate', 'monthenddate'],
      },
    ],
  },
);

PayrollStatutoryAttnCal.addHook('beforeCreate', (data, options) => {
  // Set createBy, ipAddress based on the authenticated user
  data.createBy = options.user.userMasterId;
  data.createByIp = options.user.userIpAddress;
});


PayrollStatutoryAttnCal.addHook('beforeUpdate', (data, options) => {
  // Set updateBy and ipAddress based on the authenticated user
  data.updateBy = options.user.userMasterId;
  data.updateByIp = options.user.userIpAddress;
});

PayrollStatutoryAttnCal.addHook('beforeDestroy', async (data, options) => {
 
   if (!options.user) return;

   await data.update(
      {
         deleteBy: options.user.userMasterId,
         deleteByIp: options.user.userIpAddress
      },
      {
         transaction: options.transaction,
         hooks: false,
         silent: true   // optional: don't bump `updatedAt` for this
      }
   );
});

PayrollStatutoryAttnCal.belongsTo(UserMaster, {
  foreignKey: { name: 'userMasterID' },
});
PayrollStatutoryAttnCal.belongsTo(HrLeaveTypes, {
  foreignKey: { name: 'LeaveTranId' },
});

UserMaster.hasMany(PayrollStatutoryAttnCal, {
  as:'PSAC',
  foreignKey: { name: 'userMasterID' },
});

PayrollStatutoryAttnCal.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: { name: 'createBy' },
});

PayrollStatutoryAttnCal.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: { name: 'updateBy' },
});

PayrollStatutoryAttnCal.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: { name: 'deleteBy' },
});


module.exports = PayrollStatutoryAttnCal;
