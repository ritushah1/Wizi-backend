const shortLeave = require('../models/shortLeave');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { generateExcel } = require('../utils/exportData');
const companyMaster = require('../models/companyMaster');
const EmployeeShortLeavePolicy = require('../models/employeeShortLeavePolicy');
const UserMaster = require('../models/userMaster');
const { userAttributes } = require('../utils/commonVars');
const { policyScope } = require('../utils/dbUtils');
const {
  bulkCreatePolicyScope,
  policy_Scope,
} = require('../utils/commonUtilFunctions');
const ShortLeaveBranch = require('../models/shortLeavePolicyBranch');
const ShortLeaveDepartment = require('../models/shortLeavePolicyDepartment');
const ShortLeaveDesignation = require('../models/shortLeavePolicyDesignation');

exports.postAddShortLeave = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      shortLeaveName,
      maxMinutesForShortLeave,
      noOfShortLeave,
      companyMasterID,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
      onlySameDay = false,
      advanceDays = null,
      pastDays = null,
      autoApprove = false
    } = req.body;

    const existingPolicy = await shortLeave.findOne({
      where: {
        [Sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('shortLeaveName')),
            ),
            shortLeaveName.trim().toLowerCase(),
          ),
          Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        ],
      },
    });

    if (existingPolicy) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: message.usermessage.alreadyExists(
          'Short Leave Policy With same Name',
        ),
      });
    }

    const insert_db_status = await shortLeave.create(
      {
        shortLeaveName,
        minutesForShortLeave: maxMinutesForShortLeave,
        noOfShortLeave,
        companyMasterID,
        branch_scope,
        department_scope,
        designation_scope,
        onlySameDay,
      advanceDays,
      pastDays,
      autoApprove
      },
      {
        user: req.userDetails,
        transaction,
      },
    );
    const shortLeaveID = insert_db_status.id;
    await bulkCreatePolicyScope({
      scope: branch_scope,
      selectedScope: policyScope.SELECTED,
      ids: branch_scope_IDs,
      model: ShortLeaveBranch,
      policyIdKey: 'shortLeaveID',
      scopeIdKey: 'branchMasterID',
      policyId: shortLeaveID,
      req,
      transaction: transaction,
    });

    await bulkCreatePolicyScope({
      scope: department_scope,
      selectedScope: policyScope.SELECTED,
      ids: department_scope_IDs,
      model: ShortLeaveDepartment,
      policyIdKey: 'shortLeaveID',
      scopeIdKey: 'departmentId',
      policyId: shortLeaveID,
      req,
      transaction: transaction,
    });

    await bulkCreatePolicyScope({
      scope: designation_scope,
      selectedScope: policyScope.SELECTED,
      ids: designation_scope_IDs,
      model: ShortLeaveDesignation,
      policyIdKey: 'shortLeaveID',
      scopeIdKey: 'designationId',
      policyId: shortLeaveID,
      req,
      transaction: transaction,
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Short Leave Policy'),
    });
  } catch (err) {
     await transaction.rollback();
    next(err);
  }
};

exports.updateShortLeave = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      shortLeaveName,
      maxMinutesForShortLeave,
      noOfShortLeave,
      companyMasterID,
      id,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
      onlySameDay = false,
      advanceDays = null,
      pastDays = null,
      autoApprove = false
    } = req.body;

    const existingPolicy = await shortLeave.findOne({
      where: {
        [Sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('shortLeaveName')),
            ),
            shortLeaveName.trim().toLowerCase(),
          ),
          Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
          Sequelize.or(
            Sequelize.where(sequelize.col('status'), 0),
            Sequelize.where(sequelize.col('status'), 1),
          ),
          Sequelize.where(sequelize.col('id'), {
            [Sequelize.Op.ne]: id,
          }),
        ],
      },
    });

    if (existingPolicy) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: message.usermessage.alreadyExists(
          'Short Leave Policy With same Name',
        ),
      });
    }

    const change_data_status = await shortLeave.findOne({
      where: { id },
    });

    change_data_status.shortLeaveName = shortLeaveName;
    change_data_status.minutesForShortLeave = maxMinutesForShortLeave;
    change_data_status.noOfShortLeave = noOfShortLeave;
    change_data_status.branch_scope = branch_scope;
    change_data_status.department_scope = department_scope;
    change_data_status.designation_scope = designation_scope;
    change_data_status.onlySameDay = onlySameDay;
    change_data_status.advanceDays = advanceDays;
    change_data_status.pastDays = pastDays;
    change_data_status.autoApprove = autoApprove;


    await change_data_status.save({
      user: req.userDetails,
      transaction,
    });
    await policy_Scope({
      model: ShortLeaveBranch,
      primaryKey: { shortLeaveID: id },
      column: 'branchMasterID',
      newIDs: branch_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: ShortLeaveDepartment,
      primaryKey: { shortLeaveID: id },
      column: 'departmentId',
      newIDs: department_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: ShortLeaveDesignation,
      primaryKey: { shortLeaveID: id },
      column: 'designationId',
      newIDs: designation_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Short Leave'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getAllShortLeaveData = async (req, res, next) => {
  try {
    let { limit, page, Export, search, id, companyMasterID } = req.query;
    let condition = {};

    if (id) {
      let get_one_data = await shortLeave.findOne({
        where: {
          id,
          status: {
            [Sequelize.Op.in]: [0, 1],
          },
        },
        include: [
          {
            model: ShortLeaveBranch,
            as: 'ap_branch',
          },
          {
            model: ShortLeaveDepartment,
            as: 'ap_dept',
          },
          {
            model: ShortLeaveDesignation,
            as: 'ap_design',
          },
        ],
      });

      return res.status(200).json({ status: 200, data: get_one_data });
    }

    if (!companyMasterID)
      return res.status(200).json({
        status: 401,
        message: message.usermessage.requiredMessage('companyMasterID'),
      });

    condition.companyMasterID = companyMasterID;

    condition.status = { [Sequelize.Op.in]: [0, 1] };

    if (search) {
      condition[Sequelize.Op.or] = [
        { shortLeaveName: { [Sequelize.Op.iLike]: `%${search}%` } },
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: `%${search}%`,
          },
        },
      ];
    }

    const paginationQuery = {};
    if (!Export && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = +limit;
    }

    const { rows: shortLeaveData, count } = await shortLeave.findAndCountAll({
      where: condition,
      raw: true,
      ...paginationQuery,
      order: [['shortLeaveName', 'ASC']],
      include: [
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
        {
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: userAttributes,
        },
        {
          model: UserMaster,
          as: 'updatedByUserDetails',
          attributes: userAttributes,
        },
      ],
    });

    if (Export) {
      const finaldata = shortLeaveData.map((e) => {
        return {
          'Short Leave Name': e.shortLeaveName,
          'Short Leave Minutes': e.minutesForShortLeave,
          'No of Short Leave': e.noOfShortLeave,
          'Apply Only Same Day':e.onlySameDay ? 'YES':'NO',
          'Put in Advance Days':e.advanceDays,
          'Put in Past Days':e.pastDays,
          'Auto Approve':e.autoApprove ? 'YES' : 'NO',
          'Company Name': e['companyMaster.companyName'],
          Status: e.status == 0 ? 'Deactive' : 'Active',
        };
      });

      return await generateExcel(finaldata, 'Short Leave', 'xlsx', res);
    }

    return res
      .status(200)
      .json({ status: 200, data: shortLeaveData, totalcount: count });
  } catch (err) {
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  try {
    let { id, status } = req.body;

    let change_data_status = await shortLeave.findOne({
      where: { id },
    });

    if (status == 0) {
      const findAssigned = await EmployeeShortLeavePolicy.findOne({
        where: {
          shortLeavePolicyID: id,
        },
      });

      if (findAssigned) {
        return res.status(200).json({
          status: 401,
          message:
            'Cannot deactive the short leave policy as it is already assigned to an employees.',
        });
      }
    }

    change_data_status.status = status;

    await change_data_status.save({
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.shortLeaveStatusChange,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteShortLeave = async (req, res, next) => {
  try {
    const { id } = req.params;

    const findData = await shortLeave.findByPk(id);

    if (!findData) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.shortLeavePolicyNotFound,
      });
    }

    const findAssigned = await EmployeeShortLeavePolicy.findOne({
      where: {
        shortLeavePolicyID: id,
      },
    });

    if (findAssigned) {
      return res.status(200).json({
        status: 401,
        message:
          'Cannot delete the short leave policy as it is already assigned to an employees.',
      });
    }
    await findData.destroy({
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.shortLeaveDeleteSuccess,
    });
  } catch (err) {
    next(err);
  }
};

exports.getBranchDepartmentDesignationWisePolicies = async (req, res, next) => {
  try {
    const { companyMasterID, branchMasterID, departmentId, designationId } =
      req.body;

    /* ================= VALIDATION ================= */
    if (
      !companyMasterID ||
      !branchMasterID ||
      !departmentId ||
      !designationId
    ) {
      return res.status(400).json({
        status: 400,
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }
    const order = [['shortLeaveName', 'ASC']];

    /* ================= QUERY ================= */
    const policies = await shortLeave.findAll({
      where: {
        companyMasterID,
        status: 1,
        [Sequelize.Op.and]: [
          /* ============== BRANCH ================= */
          sequelize.literal(`
            (
              "shortLeave"."branch_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "shortLeaveBranches" apb
                WHERE apb."shortLeaveID" =
                      "shortLeave"."id"
                AND apb."deletedAt" IS NULL
                AND apb."branchMasterID" = :branchMasterID
                AND "shortLeave"."deletedAt" IS NULL
              )
            )
          `),

          /* ============== DEPARTMENT ================= */
          sequelize.literal(`
            (
              "shortLeave"."department_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "shortLeaveDepartments" apd
                WHERE apd."shortLeaveID" =
                      "shortLeave"."id"
                AND apd."deletedAt" IS NULL
                AND apd."departmentId" = :departmentId
                AND "shortLeave"."deletedAt" IS NULL
              )
            )
          `),

          /* ============== DESIGNATION ================= */
          sequelize.literal(`
            (
              "shortLeave"."designation_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "shortLeaveDesignations" apg
                WHERE apg."shortLeaveID" =
                      "shortLeave"."id"
                AND apg."deletedAt" IS NULL
                AND apg."designationId" = :designationId
                AND "shortLeave"."deletedAt" IS NULL
              )
            )
          `),
        ],
      },

      replacements: {
        branchMasterID,
        departmentId,
        designationId,
        scopeAll: policyScope.ALL,
      },
      attributes: [
        'id',
        'shortLeaveName',
        'branch_scope',
        'department_scope',
        'designation_scope',
        'companyMasterID',
      ],
      order,
    });

    return res.status(200).json({
      status: 200,
      totalcount: policies.length,
      data: policies,
    });
  } catch (err) {
    next(err);
  }
};
