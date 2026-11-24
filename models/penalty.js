const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const PenaltyAmend = require('./penaltyAmends');
const UserMaster = require('./userMaster');
const table_name = 'penalty';
const Penalty = sequelize.define(
  table_name,
  {
    penaltyID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    penaltyName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    penaltyAmount: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    deductionFromSalary: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
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
    deleteBy: {
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
    isDefault: {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  {
    paranoid: true,
    indexes: [
      {
        unique: false,
        fields: ['penaltyName'],
      },
      {
        unique: false,
        fields: ['penaltyAmount'],
      },
      {
        unique: false,
        fields: ['companyMasterID'],
      },
    ],
  },
);

Penalty.addHook('beforeCreate', (Penalty, options) => {
  Penalty.createBy = options.user.userMasterId;
  Penalty.updateBy = options.user.userMasterId;
  Penalty.createByIp = options.user.userIpAddress;
  Penalty.updateByIp = options.user.userIpAddress;
});

Penalty.addHook('beforeUpdate', (Penalty, options) => {
  Penalty.updateBy = options.user.userMasterId;
  Penalty.ipAddress = options.user.userIpAddress;
  Penalty.updateByIp = options.user.userIpAddress;
});

Penalty.addHook('beforeDestroy', async (Penalty, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  Penalty.deleteBy = options.user.userMasterId;
  Penalty.deleteByIp = options.user.userIpAddress;
  await Penalty.save({
    hooks: false,
    transaction: options.transaction,
  });
});

Penalty.addHook('beforeSave', async (Penalty, options) => {
  Penalty.user = options.user;
});
Penalty.addHook('afterSave', async (Penalty, options) => {
  await addPenaltyAmend(Penalty, options);
});

async function addPenaltyAmend(penalty, options) {
  const list = Array.isArray(penalty) ? penalty : [penalty];

  const user = Array.isArray(penalty) ? penalty.user : penalty.user;

  const rows = list.map((item) => {
    const data = item.get({ plain: true });

    return {
      penaltyID: data.penaltyID,
      penaltyName: data.penaltyName,
      penaltyAmount: data.penaltyAmount,
      deductionFromSalary: data.deductionFromSalary,
      companyMasterID: data.companyMasterID,
      status: data.status,
      isDefault: data.isDefault,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await PenaltyAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

Penalty.belongsTo(UserMaster, {
  as: 'createByUserDetails',
  foreignKey: { name: 'createBy' },
});

Penalty.belongsTo(UserMaster, {
  as: 'updateByUserDetails',
  foreignKey: { name: 'updateBy' },
});

Penalty.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

Penalty.belongsTo(companyMaster, { foreignKey: { name: 'companyMasterID' } });
PenaltyAmend.belongsTo(Penalty, {
  as: 'penaltyAmends',
  foreignKey: { name: 'penaltyID' },
});

module.exports = Penalty;
