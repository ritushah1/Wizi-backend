const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const UserMaster = require('./userMaster');
const { ShiftTypeEnum } = require('../utils/dbUtils');
const ShiftAmend = require('./shiftAmend');
const table_name = 'shift';
const Shift = sequelize.define(
  table_name,
  {
    shiftID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    shiftName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    shiftCode: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    shiftDesc: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    table: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    referenceId: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    branchID: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    shiftGrace: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
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
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    updateByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    shiftType: {
      type: Sequelize.ENUM(...Object.values(ShiftTypeEnum)),
    },
    deleteBy: {
      type: Sequelize.BIGINT,
      allowNull: true,
    },
    deleteByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  },
  {
    paranoid: true,
    indexes: [
      {
        unique: false,
        fields: ['shiftName'],
      },
      {
        unique: false,
        fields: ['shiftCode'],
      },
      {
        unique: false,
        fields: ['companyMasterID'],
      },
    ],
  },
);

Shift.belongsTo(companyMaster, { foreignKey: { name: 'companyMasterID' } });

async function addShiftPolicyAmend(process, options) {
  const user = options.user;

  const data = process.get({ plain: true });

  await ShiftAmend.create(
    {
      shiftID: data.shiftID,
      companyMasterID: data.companyMasterID,
      shiftName: data.shiftName,
      shiftCode: data.shiftCode,
      shiftDesc: data.shiftDesc,
      table: data.table,
      referenceId: data.referenceId,
      branchID: data.branchID,
      shiftGrace: data.shiftGrace,
      shiftType: data.shiftType,
      status: data.status,
      
      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    },
    {
      transaction: options.transaction,
    },
  );
}

Shift.addHook('afterSave', async (item, options) => {
  await addShiftPolicyAmend(item, options);
});

Shift.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

ShiftAmend.belongsTo(Shift, {
  as: 'shiftPolicy',
  foreignKey: {
    name: 'shiftID',
  },
});

Shift.hasMany(ShiftAmend, {
  as: 'amendShift',
  foreignKey: {
    name: 'shiftID',
  },
});

module.exports = Shift;
