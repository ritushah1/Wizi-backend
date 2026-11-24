const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'confirmationAppraisalFormParam';

const companyMaster = require('./companyMaster');
const Designation = require('./designation');
const UserMaster = require('./userMaster');
const ConfirmationAppraisalFormAmend = require('./confirmationAppraisalFormParamAmend');

const ConfirmationAppraisalForm = sequelize.define(
  table_name,
  {
    ConfirmationAppraisalFormParamID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    designationID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    status: {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 1,
    },
    formParameters: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
    },
    formParametersTypes: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
    },
    sequenceNumber: {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: true,
    },
    createBy: {
      type: Sequelize.BIGINT,
    },
    updateBy: {
      type: Sequelize.BIGINT,
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
  },
  {
    paranoid: true,
  },
);

/* ==========================================================
   CREATE
========================================================== */

ConfirmationAppraisalForm.addHook(
  'beforeCreate',
  (confirmationAppraisalForm, options) => {
    confirmationAppraisalForm.createBy = options.user.userMasterId;
    confirmationAppraisalForm.createByIp = options.user.userIpAddress;
  },
);

/* ==========================================================
   BULK CREATE
========================================================== */

ConfirmationAppraisalForm.addHook('beforeBulkCreate', (forms, options) => {
  forms.forEach((form) => {
    form.createBy = options.user.userMasterId;
    form.createByIp = options.user.userIpAddress;
  });
});

/* ==========================================================
   UPDATE
========================================================== */

ConfirmationAppraisalForm.addHook(
  'beforeUpdate',
  (confirmationAppraisalForm, options) => {
    confirmationAppraisalForm.updateBy = options.user.userMasterId;

    confirmationAppraisalForm.updateByIp = options.user.userIpAddress;
  },
);

/* ==========================================================
   DELETE
========================================================== */

ConfirmationAppraisalForm.addHook(
  'beforeDestroy',
  (confirmationAppraisalForm, options) => {
    confirmationAppraisalForm.deleteBy = options.user.userMasterId;

    confirmationAppraisalForm.deleteByIp = options.user.userIpAddress;
  },
);

/* ==========================================================
   AMEND HISTORY
========================================================== */

async function addConfirmationAppraisalFormAmend(forms, options) {
  const list = Array.isArray(forms) ? forms : [forms];

  const user = options.user;

  const rows = list.map((form) => {
    const data = form.get({ plain: true });

    return {
      ConfirmationAppraisalFormParamID: data.ConfirmationAppraisalFormParamID,
      companyMasterID: data.companyMasterID,
      designationID: data.designationID,
      status: data.status,
      formParameters: data.formParameters,
      formParametersTypes: data.formParametersTypes,
      sequenceNumber: data.sequenceNumber,
      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await ConfirmationAppraisalFormAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

/* ==========================================================
   CREATE / UPDATE AMEND ENTRY
========================================================== */

ConfirmationAppraisalForm.addHook(
  'afterSave',
  async (confirmationAppraisalForm, options) => {
    await addConfirmationAppraisalFormAmend(confirmationAppraisalForm, options);
  },
);

/* ==========================================================
   ASSOCIATIONS
========================================================== */

ConfirmationAppraisalForm.belongsTo(companyMaster, {
  foreignKey: {
    name: 'companyMasterID',
  },
});

ConfirmationAppraisalForm.belongsTo(Designation, {
  foreignKey: {
    name: 'designationID',
  },
});

Designation.hasMany(ConfirmationAppraisalForm, {
  as: 'caf',
  foreignKey: {
    name: 'designationID',
  },
});

ConfirmationAppraisalForm.belongsTo(UserMaster, {
  as: 'createdBy',
  foreignKey: {
    name: 'createBy',
  },
});

ConfirmationAppraisalForm.belongsTo(UserMaster, {
  as: 'updatedBy',
  foreignKey: {
    name: 'updateBy',
  },
});

ConfirmationAppraisalForm.belongsTo(UserMaster, {
  as: 'deletedBy',
  foreignKey: {
    name: 'deleteBy',
  },
});

/* ==========================================================
   AMEND ASSOCIATIONS
========================================================== */

ConfirmationAppraisalFormAmend.belongsTo(ConfirmationAppraisalForm, {
  as: 'confirmationAppraisalForm',
  foreignKey: {
    name: 'ConfirmationAppraisalFormParamID',
  },
});

ConfirmationAppraisalForm.hasMany(ConfirmationAppraisalFormAmend, {
  as: 'amendHistory',
  foreignKey: {
    name: 'ConfirmationAppraisalFormParamID',
  },
});

module.exports = ConfirmationAppraisalForm;
