const Sequelize = require('sequelize');
const logger = require('../config/logger');
const message = require('../response_message/message');
const RoleMaster = require('../models/roleMaster');
const sequelize = require('../config/database');
const RolePermission = require('../models/rolePermission');
const companyMaster = require('../models/companyMaster');
const FormMaster = require('../models/formMaster');
const UserMaster = require('../models/userMaster');
const {
  paginate,
  userDetails,
  asiaKolkataDateTime,
} = require('../utils/commonUtilFunctions');
const RoleMasterBranchWise = require('../models/roleMasterBranchWise');
const BranchMaster = require('../models/branchMaster');
const CityMaster = require('../models/citymaster');
const UserRole = require('../models/userRole');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeBranch = require('../models/employeeBranch');
const Department = require('../models/department');
const EmployeeDepartment = require('../models/employeeDepartment');
const Designation = require('../models/designation');
const EmployeeDesignation = require('../models/employeeDesignation');
const { userAttributes } = require('../utils/commonVars');
const { sortFields } = require('../utils/dbUtils');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.postAddRoleMaster = async (req, res, next) => {
  try {
    const {
      formarray,
      companyMasterID,
      roleName,
      roleType,
      companyAccessType,
      branchMasterID,
    } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const UniqueData = await RoleMaster.findOne({
      raw: true,
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('roleName')),
          ),
          String(roleName).trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
      ),
    });

    if (UniqueData) {
      return res.status(200).send({
        status: 401,
        message: 'Role with same name already exist',
      });
    }

    const transaction = await sequelize.transaction();
    try {
      const insert_db_status = await RoleMaster.create(
        {
          roleName,
          roleType,
          companyAccessType,
          companyMasterID,
          createBy,
          createByIp,
        },
        { user: req.userDetails, transaction },
      );

      for (let item of formarray) {
        item.roleMasterID = insert_db_status.roleMasterID;
        item.rolePermissionID = null;
      }

      if (branchMasterID && branchMasterID.length) {
        const RoleBranchWise = branchMasterID.map((item) => ({
          roleMasterID: insert_db_status.roleMasterID,
          branchMasterID: item,
          createBy: createBy,
          createByIp: createByIp,
        }));

        await RoleMasterBranchWise.bulkCreate(RoleBranchWise, { transaction });
      }

      await RolePermission.bulkCreate(formarray, {
        user: req.userDetails,
        individualHooks: true,
        transaction,
      });

      await transaction.commit();

      res.status(200).json({
        status: 200,
        message: 'Role added Successfully',
        data: {},
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (err) {
    next(err);
  }
};

exports.getRoleMasterById = async (req, res, next) => {
  try {
    const getdata = await RoleMaster.findOne({
      where: {
        roleMasterID: req.params.id,
      },
      include: [
        {
          model: companyMaster,
        },
        {
          required: false,
          model: RoleMasterBranchWise,
          where: {
            status: 1,
          },
          attributes: ['branchMasterID'],
        },
      ],
    });

    const allBranch = getdata.roleMasterBranchWises || [];
    const finalBranch = allBranch.map((item) => item.branchMasterID);
    const getPermission = await RolePermission.findAll({
      where: {
        roleMasterID: req.params.id,
      },
      include: [{ model: FormMaster }],
    });
    for (let permission of getPermission) {
      permission.dataValues.parent =
        permission?.formMaster?.parentFormMasterID || null;
    }

    return res.status(200).json({
      status: 200,
      data: getPermission,
      roleMaster: getdata,
      allBranch: finalBranch,
    });
  } catch (err) {
    next(err);
  }
};
exports.postUpdateRoleMaster = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      formarray,
      companyMasterID,
      roleName,
      roleType,
      companyAccessType,
      branchMasterIDs,
      roleMasterID,
    } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const UniqueData = await RoleMaster.findOne({
      raw: true,
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('roleName')),
          ),
          String(roleName).trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.where(sequelize.col('roleMasterID'), {
          [Sequelize.Op.ne]: roleMasterID,
        }),
      ),
    });

    if (UniqueData) {
      await transaction.rollback();
      return res.status(200).send({
        status: 401,
        message: 'Role with same name already exist',
      });
    }

    await RoleMaster.update(
      {
        companyMasterID,
        roleName,
        roleType,
        companyAccessType,
        updateBy,
        updateByIp,
      },
      {
        where: { roleMasterID: roleMasterID },
        user: req.userDetails,
        transaction,
      },
    );

    //Destroy All BranchWise Role
    await RoleMasterBranchWise.destroy({
      where: {
        roleMasterID: roleMasterID,
      },
      force: true,
      transaction,
    });

    if (branchMasterIDs && branchMasterIDs.length) {
      const RoleBranchWise = branchMasterIDs.map((item) => ({
        roleMasterID: roleMasterID,
        branchMasterID: item,
        createBy: updateBy,
        createByIp: updateByIp,
      }));

      await RoleMasterBranchWise.bulkCreate(RoleBranchWise, { transaction });
    }

    await RolePermission.destroy({
      where: {
        roleMasterID: roleMasterID,
      },
      hooks: true,
      individualHooks: true,
      user: req.userDetails,
      // force: true,
      transaction,
    });

    await RolePermission.bulkCreate(formarray, {
      user: req.userDetails,
      individualHooks: true,
      transaction,
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: 'Role updated Successfully',
      data: formarray,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.listRoleMaster = async (req, res, next) => {
  try {
    let { page, limit, searchQuery, companyMasterID } = req.body;
    const condition = {
      companyMasterID: companyMasterID,
    };
    if (searchQuery)
      condition[Sequelize.Op.or] = [
        { roleName: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' } },
      ];

    const order = [['createdAt', 'DESC']];

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const { rows: rolemaster, count } = await RoleMaster.findAndCountAll({
      raw: true,
      distinct: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        { model: companyMaster, attributes: ['companyName'] },
        {
          model: UserMaster,
          as: 'createdBy',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'updatedBy',
          attributes: ['displayName'],
        },
        {
          separate: true,
          required: false,
          model: RoleMasterBranchWise,
          where: {
            status: 1,
          },
          attributes: [
            'roleMasterBranchWiseID',
            'roleMasterID',
            'branchMasterID',
          ],
        },
      ],
    });

    res.status(200).json({
      message: 'Roles fetched Successfully',
      status: 200,
      data: rolemaster,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.AssignRoleMaster = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { userMasterID, roleMasterID } = req.body;
    userMasterID = Array.isArray(userMasterID) ? userMasterID : [userMasterID];
    roleMasterID = Array.isArray(roleMasterID) ? roleMasterID : [roleMasterID];

    const finalData = [];

    await UserRole.destroy({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: userMasterID,
        },
      },
      hooks: true,
      individualHooks: true,
      user: req.userDetails,
      transaction,
    });
    for (const id of userMasterID) {
      finalData.push({
        userMasterID: id,
        roleMasterID,
      });
    }
    await UserRole.bulkCreate(finalData, {
      individualHooks: true,
      user: req.userDetails,
      transaction,
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.assignMessage('Role'),
      data: {},
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.listUserPermission = async (req, res, next) => {
  try {
    let {
      page,
      limit,
      userMasterID,
      companyMasterID,
      sortField = sortFields.EMPLOYEENAME,
    } = req.body;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const condition = { status: 1, companyMasterId: companyMasterID };
    if (userMasterID && userMasterID.length) {
      condition.userMasterID = userMasterID;
    }
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    let orderByArray = [['displayName', 'ASC']];
    if (sortField && sortField == sortFields.EMPLOYEECODE) {
      const employeeCodeSubquery = `
    (
      SELECT ejd."employeeCode"
      FROM "employeeJoiningDetails" ejd
      WHERE ejd."userMasterID" = "userMaster"."userMasterID"
      LIMIT 1
    )
    `;

      orderByArray = [
        // 0. NULL / empty FIRST
        [
          Sequelize.literal(`
            CASE 
              WHEN ${employeeCodeSubquery} IS NULL 
                   OR ${employeeCodeSubquery} = '' 
              THEN 0 
              ELSE 1 
            END
          `),
          'ASC',
        ],

        // 1. Pure numbers first
        [
          Sequelize.literal(`
            CASE 
              WHEN ${employeeCodeSubquery} ~ '^[0-9]+$' 
              THEN 0 
              ELSE 1 
            END
          `),
          'ASC',
        ],

        // 2. Numeric sort
        [
          Sequelize.literal(`
            CASE 
              WHEN ${employeeCodeSubquery} ~ '^[0-9]+$' 
              THEN (${employeeCodeSubquery})::int 
            END
          `),
          'ASC',
        ],

        // 3. Prefix (alphabet part)
        [
          Sequelize.literal(`
            substring(${employeeCodeSubquery} FROM '^[^0-9]+')
          `),
          'ASC',
        ],

        // 4. Numeric part (natural sort)
        [
          Sequelize.literal(`
            CASE 
              WHEN ${employeeCodeSubquery} ~ '[0-9]+' 
              THEN substring(${employeeCodeSubquery} FROM '[0-9]+')::int 
            END
          `),
          'ASC',
        ],

        // 5. Final fallback
        [Sequelize.literal(`${employeeCodeSubquery}`), 'ASC'],

        ['displayName', 'ASC'],
      ];
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows: findUserRoles, count } = await UserMaster.findAndCountAll({
      where: { ...userAccessCondition.where, ...condition },
      attributes: userAttributes,
      order: orderByArray,
      ...paginationQuery,
      include: [
        ...userAccessCondition.includeModels,
        {
          required: false,
          model: UserRole,
          attributes: ['roleMasterID'],
          include: [
            { model: RoleMaster, attributes: ['roleName'] },
            {
              model: UserMaster,
              as: 'createByUser',
              attributes: ['displayName'],
            },
          ],
        },
        {
          model: EmployeeDesignation,
          as: 'emp_desig',
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['designationID'],
          include: [
            {
              model: Designation,
              as: 'designation',
              attributes: ['designationName'],
            },
          ],
        },
        {
          model: EmployeeDepartment,
          as: 'emp_dept',
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['departmentID'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName'],
            },
          ],
        },
        {
          model: EmployeeBranch,
          as: 'emp_branch',
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: currentDate },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: currentDate } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
          required: false,
          attributes: ['branchID'],
          include: [
            {
              model: BranchMaster,
              as: 'branchMaster',
              attributes: ['branchName'],
            },
          ],
        },
        {
          model: EmployeeJoiningDetails,
          as: 'emp_join',
          attributes: ['employeeCode'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: findUserRoles,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};
