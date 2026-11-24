const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'designation';
const CompanyMaster = require('./companyMaster');
const AuditLogs = require('./auditLogs');
const { DatabaseOperationEnum } = require('../utils/dbUtils');
const UserMaster = require('./userMaster');
const DesignationAmend = require('./designationAmend');

const Designation = sequelize.define(
  table_name,
  {
    designationId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    designationName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    parentDesignation: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    jobdescription: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    status: {
      type: Sequelize.BIGINT,
      allowNull: false,
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
    localDesignName: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    skillCategory: {
      type: Sequelize.ARRAY(Sequelize.STRING),
    },
  },
  {
    paranoid: true,
    indexes: [
      {
        unique: false,
        fields: ['designationName'],
      },
      {
        unique: false,
        fields: ['companyMasterID'],
      },
    ],
  },
);

Designation.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

Designation.belongsTo(Designation, {
  foreignKey: { name: 'parentDesignation' },
  as: 'parentSingleDesignation',
});

Designation.hasMany(Designation, {
  foreignKey: { name: 'parentDesignation' },
  as: 'childDesignations',
});

Designation.addHook('beforeDestroy', async (Designation, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  Designation.deleteBy = options.user.userMasterId;
  Designation.deleteByIp = options.user.userIpAddress;
  await Designation.save({
    hooks: false,
    transaction: options.transaction,
  });
});

Designation.addHook('beforeBulkCreate',async(designation,options)=>{
  designation.user=options.user
})

Designation.addHook('beforeSave', async (designation, options) => {
  designation.user = options.user;
  if (designation.parentDesignation) {
    if (designation.parentDesignation === designation.designationId) {
      throw new Error('A designation cannot be its own parent.');
    }

    const parent = await Designation.findByPk(designation.parentDesignation);
    if (!parent) {
      throw new Error('Parent designation not found.');
    }

    if (designation.companyMasterID !== parent.companyMasterID) {
      throw new Error('Parent designation must belong to the same company.');
    }
  }
});

Designation.addHook('afterSave', async (designation, options) => {
  await addDesignationAmend(designation, options);
  if (options.dbOperation === DatabaseOperationEnum.CREATE) {
    const newValue = designation.toJSON();
    const createBy = newValue.createBy;
    const createByIp = newValue.createByIp;
    delete newValue.createBy;
    delete newValue.createByIp;
    delete newValue.createdAt;
    delete newValue.updateBy;
    delete newValue.updateByIp;
    delete newValue.updatedAt;
    delete newValue.deleteBy;
    delete newValue.deleteByIp;
    delete newValue.deletedAt;

    let addLog = await AuditLogs.create(
      {
        companyMasterID: newValue.companyMasterID,
        operation: options.dbOperation,
        oldValue: {},
        newValue,
        tableName: Designation.getTableName(),
        createBy,
        createByIp,
      },
      {
        transaction: options.transaction,
      },
    );

    if (options.transaction && options.commit !== false) {
      await options.transaction.commit();
    }
  } else if (options.dbOperation === DatabaseOperationEnum.UPDATE) {
    const oldValue = designation._previousDataValues;
    const newValue = designation.toJSON();
    const createBy = newValue.updateBy;
    const createByIp = newValue.updateByIp;
    delete oldValue.createBy;
    delete oldValue.createByIp;
    delete oldValue.createdAt;
    delete oldValue.updateBy;
    delete oldValue.updateByIp;
    delete oldValue.updatedAt;
    delete oldValue.deleteBy;
    delete oldValue.deleteByIp;
    delete oldValue.deletedAt;
    delete newValue.createBy;
    delete newValue.createByIp;
    delete newValue.createdAt;
    delete newValue.updateBy;
    delete newValue.updateByIp;
    delete newValue.updatedAt;
    delete newValue.deleteBy;
    delete newValue.deleteByIp;
    delete newValue.deletedAt;

    let addLog = await AuditLogs.create(
      {
        companyMasterID: newValue.companyMasterID,
        operation: options.dbOperation,
        oldValue,
        newValue,
        tableName: Designation.getTableName(),
        createBy,
        createByIp,
      },
      {
        transaction: options.transaction,
      },
    );

    if (options.transaction && options.commit !== false) {
      await options.transaction.commit();
    }
  }
});

Designation.addHook('afterBulkCreate', async (designation, options) => {
  await addDesignationAmend(designation,options);
  const row = designation.map((item) => {
    const newValue = item.toJSON();
    const createBy = newValue.createBy;
    const createByIp = newValue.createByIp;
    delete newValue.createBy;
    delete newValue.createByIp;
    delete newValue.createdAt;
    delete newValue.updateBy;
    delete newValue.updateByIp;
    delete newValue.updatedAt;
    delete newValue.deleteBy;
    delete newValue.deleteByIp;
    delete newValue.deletedAt;
    return {
      companyMasterID: newValue.companyMasterID,
      operation: options.dbOperation,
      oldValue: {},
      newValue,
      tableName: Designation.getTableName(),
      createBy,
      createByIp,
    };
  });
  await AuditLogs.bulkCreate(row, {
    transaction: options.transaction,
  });
  if (options.transaction && options.commit !== false) {
    await options.transaction.commit();
  }
});

Designation.addHook('afterDestroy', async (designation, options) => {
  const oldValue = designation.toJSON();

  const createBy = oldValue.updateBy;
  const createByIp = oldValue.updateByIp;

  delete oldValue.createBy;
  delete oldValue.createByIp;
  delete oldValue.createdAt;
  delete oldValue.updateBy;
  delete oldValue.updateByIp;
  delete oldValue.updatedAt;
  delete oldValue.deleteBy;
  delete oldValue.deleteByIp;
  delete oldValue.deletedAt;

  await AuditLogs.create(
    {
      companyMasterID: oldValue.companyMasterID,
      operation: DatabaseOperationEnum.DELETE,
      oldValue,
      newValue: {},
      tableName: Designation.getTableName(),
      createBy,
      createByIp,
    },
    {
      transaction: options.transaction,
    },
  );
});

async function addDesignationAmend(designations, options) {
  const list = Array.isArray(designations) ? designations : [designations];
  const user = Array.isArray(designations)
        ? designations.user
        : designations.user;

  const rows = list.map((designation) => {
    const data = designation.get({ plain: true });

    return {
      designationId: data.designationId,
      designationName: data.designationName,
      companyMasterID: data.companyMasterID,
      parentDesignation: data.parentDesignation,
      jobdescription: data.jobdescription,
      status: data.status,
      localDesignName: data.localDesignName,
      skillCategory: data.skillCategory,

      createBy:user.userMasterId,
      createByIp:user.userIpAddress,
    };
  });

  await DesignationAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}
Designation.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});

Designation.belongsTo(UserMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});
Designation.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});
DesignationAmend.belongsTo(Designation, {
  as: 'designation',
  foreignKey: { name: 'designationId' },
});
DesignationAmend.belongsTo(Designation,{
  as:'parentDesignationAmend',
  foreignKey:{name:'parentDesignation'}
})
module.exports = Designation;
