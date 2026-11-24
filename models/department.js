const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const table_name = 'department';
const CompanyMaster = require('./companyMaster');
const AuditLogs = require('./auditLogs');
const { DatabaseOperationEnum } = require('../utils/dbUtils');
const UserMaster = require('./userMaster');
const DepartmentAmend = require('./departmentAmend');

const Department = sequelize.define(
  table_name,
  {
    departmentId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    departmentName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    companyMasterID: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    status: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    authorizationStatus: {
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
  },
  {
    paranoid: true,
    indexes: [
      {
        unique: false,
        fields: ['departmentName'],
      },
      {
        unique: false,
        fields: ['companyMasterID'],
      },
    ],
  },
);

Department.belongsTo(CompanyMaster, {
  foreignKey: { name: 'companyMasterID' },
});

Department.belongsTo(UserMaster, {
  as: 'createdByUserDetails',
  foreignKey: { name: 'createBy' },
});
Department.belongsTo(UserMaster, {
  as: 'updatedByUserDetails',
  foreignKey: { name: 'updateBy' },
});
Department.belongsTo(UserMaster, {
  as: 'deleteByUserDetails',
  foreignKey: { name: 'deleteBy' },
});

Department.addHook('beforeDestroy', async (Department, options) => {
  // Set deleteBy and ipAddress based on the authenticated user
  Department.deleteBy = options.user.userMasterId;
  Department.deleteByIp = options.user.userIpAddress;
  await Department.save({
    hooks: false,
    transaction: options.transaction,
  });
});
Department.addHook('beforeSave', async (department, options) => {
  department.user = options.user;
});
Department.addHook('beforeBulkCreate', async (department, options) => {
  department.user = options.user;
});

Department.addHook('afterSave', async (department, options) => {
  if (options.dbOperation === DatabaseOperationEnum.CREATE) {
    await addDepartmentAmend(department, options);
    const newValue = department.toJSON();
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
        tableName: Department.getTableName(),
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
    await addDepartmentAmend(department, options);
    const oldValue = department._previousDataValues;
    const newValue = department.toJSON();
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
        tableName: Department.getTableName(),
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
  } else if (options.dbOperation === DatabaseOperationEnum.DELETE) {
    const oldValue = department._previousDataValues;
    const newValue = department.toJSON();
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

    let addLog = await AuditLogs.create(
      {
        companyMasterID: oldValue.companyMasterID,
        operation: options.dbOperation,
        oldValue,
        newValue: {},
        tableName: Department.getTableName(),
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

Department.addHook('beforeBulkCreate', async (department, options) => {
  department.user = options.user;
});

Department.addHook('afterBulkCreate', async (department, options) => {
  await addDepartmentAmend(department, options);
  const row = department.map((item) => {
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
      tableName: Department.getTableName(),
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
Department.addHook('afterDestroy', async (department, options) => {
  const oldValue = department.toJSON();

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
      tableName: Department.getTableName(),
      createBy,
      createByIp,
    },
    {
      transaction: options.transaction,
    },
  );
  await options.transaction.commit();
});
async function addDepartmentAmend(departments, options) {
  const list = Array.isArray(departments) ? departments : [departments];

  const user = Array.isArray(departments) ? departments.user : departments.user;

  const rows = list.map((department) => {
    const data = department.get({ plain: true });

    return {
      departmentId: data.departmentId,
      departmentName: data.departmentName,
      companyMasterID: data.companyMasterID,
      status: data.status,
      authorizationStatus: data.authorizationStatus,
      createBy: user.userMasterId,
      createByIp: user.userIpAddress,
    };
  });

  await DepartmentAmend.bulkCreate(rows, {
    transaction: options.transaction,
  });
}

DepartmentAmend.belongsTo(Department, {
  as: 'department',
  foreignKey: { name: 'departmentId' },
});

module.exports = Department;
