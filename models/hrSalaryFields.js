const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const companyMaster = require('./companyMaster');
const Payheadmaster = require('./payhead');
const form16 = require('./form16');
const HRSalaryFieldsAmend = require('./hrSalaryFieldsAmend');
const table_name = 'hrSalaryFields';
const HRSalaryFields = sequelize.define(
  table_name,
  {
    salaryFieldID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    payheadMasterId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    salaryFieldActive: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    salaryFieldInactiveDate: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    salaryFieldIndex: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    salaryFieldSide: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    salaryFieldAttanChk: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    salaryFieldMaxAmt: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    salaryFieldWhen: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    salaryFieldWhenMonth: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
    },
    salaryFieldDefaultPer: {
      type: Sequelize.DECIMAL,
      allowNull: true,
    },
    salaryFieldRound: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    salaryFieldRoundNo: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    salaryFieldShow: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    salaryFieldShowInCTC: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    salaryFieldInCTCEff: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    salaryFieldFixVariable: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    salaryFieldMaxRange: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    salaryFieldSrNo: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    Form16ID: {
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
    createByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    updateByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    formula: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    formulaID: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    payheadDisplayName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    roundOffType: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    considerIn: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    assignSalaryRound: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    assignSalaryRoundNo: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },

    assignSalaryRoundOffType: {
      type: Sequelize.INTEGER,
      allowNull: true,
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
        fields: ['salaryFieldActive'],
      },
      {
        unique: false,
        fields: ['salaryFieldDefaultPer'],
      },
      {
        unique: false,
        fields: ['salaryFieldSrNo'],
      },
    ],
  },
);

HRSalaryFields.belongsTo(companyMaster, {
  foreignKey: { name: 'companyMasterID' },
});
HRSalaryFields.belongsTo(Payheadmaster, {
  foreignKey: { name: 'payheadMasterId' },
});

HRSalaryFields.belongsTo(Payheadmaster, {
  as: 'PHM',
  foreignKey: { name: 'payheadMasterId' },
});

async function addHRSalaryFieldsAmend(process, options) {
  const user = options.user;

  const data = process.get({ plain: true });

  await HRSalaryFieldsAmend.create(
    {
      salaryFieldID: data.salaryFieldID,
      payheadMasterId: data.payheadMasterId,
      salaryFieldActive: data.salaryFieldActive,
      salaryFieldInactiveDate: data.salaryFieldInactiveDate,
      salaryFieldIndex: data.salaryFieldIndex,
      salaryFieldSide: data.salaryFieldSide,
      salaryFieldAttanChk: data.salaryFieldAttanChk,
      salaryFieldMaxAmt: data.salaryFieldMaxAmt,
      salaryFieldWhen: data.salaryFieldWhen,
      salaryFieldWhenMonth: data.salaryFieldWhenMonth,
      salaryFieldDefaultPer: data.salaryFieldDefaultPer,
      salaryFieldRound: data.salaryFieldRound,
      salaryFieldRoundNo: data.salaryFieldRoundNo,
      salaryFieldShow: data.salaryFieldShow,
      salaryFieldShowInCTC: data.salaryFieldShowInCTC,
      salaryFieldInCTCEff: data.salaryFieldInCTCEff,
      salaryFieldFixVariable: data.salaryFieldFixVariable,
      salaryFieldMaxRange: data.salaryFieldMaxRange,
      salaryFieldSrNo: data.salaryFieldSrNo,
      companyMasterID: data.companyMasterID,
      Form16ID: data.Form16ID,
      status: data.status,
      formula: data.formula,
      formulaID: data.formulaID,
      payheadDisplayName: data.payheadDisplayName,
      roundOffType: data.roundOffType,
      considerIn: data.considerIn,
      assignSalaryRound: data.assignSalaryRound,
      assignSalaryRoundNo: data.assignSalaryRoundNo,
      assignSalaryRoundOffType: data.assignSalaryRoundOffType,

      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    },
    {
      transaction: options.transaction,
    },
  );
}

HRSalaryFields.addHook('afterSave', async (item, options) => {
  await addHRSalaryFieldsAmend(item, options);
});

HRSalaryFields.addHook('beforeDestroy', async (item, options) => {
  if (options.user) {
    item.deleteBy = options.user.userMasterId;
    item.deleteByIp = options.user.userIpAddress;

    await item.save({
      hooks: false,
      transaction: options.transaction,
    });
  }
});

HRSalaryFieldsAmend.belongsTo(HRSalaryFields, {
  as: 'hrSalaryField',
  foreignKey: {
    name: 'salaryFieldID',
  },
});

HRSalaryFields.hasMany(HRSalaryFieldsAmend, {
  as: 'amendHrSalaryField',
  foreignKey: {
    name: 'salaryFieldID',
  },
});

module.exports = HRSalaryFields;
