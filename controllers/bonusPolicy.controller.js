const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const BonusPolicy = require('../models/bonusPolicy');
const { bonusCreditTypeEnum, policyScope } = require('../utils/dbUtils');
const { usermessage } = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const { userAttributes } = require('../utils/commonVars');
const {
  asiaKolkataDateTime,
  policy_Scope,
  bulkCreatePolicyScope,
} = require('../utils/commonUtilFunctions');
const EmployeeBonusPolicy = require('../models/employeeBonusPolicy');
const { generateExcel } = require('../utils/exportData');
const BonusPolicyBranch = require('../models/bonusPolicyBranch');
const BonusPolicyDepartment = require('../models/bonusPolicyDepartment');
const BonusPolicyDesignation = require('../models/bonusPolicyDesignation');

exports.addData = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      bonusPolicyName,
      bonusCycle,
      bonusCreditType,
      payInSalary,
      companyMasterID,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
    } = req.body;
    let { bonusCreditCycle } = req.body;

    const find_SameData = await BonusPolicy.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('bonusPolicyName')),
          ),
          String(bonusPolicyName).trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1),
        ),
      ),
    });

    if (find_SameData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: `Bonus Policy name '${bonusPolicyName}' already exists. Please choose another.`,
      });
    }

    if (bonusCreditType == bonusCreditTypeEnum.PREVIOUS)
      bonusCreditCycle = null;

    const insert_db_status = await BonusPolicy.create(
      {
        bonusPolicyName,
        bonusCycle,
        bonusCreditType,
        bonusCreditCycle,
        payInSalary,
        companyMasterID,
        branch_scope,
        department_scope,
        designation_scope,
      },
      { user: req.userDetails, transaction },
    );

    const bonusPolicyID = insert_db_status.bonusPolicyId;
    await bulkCreatePolicyScope({
      scope: branch_scope,
      selectedScope: policyScope.SELECTED,
      ids: branch_scope_IDs,
      model: BonusPolicyBranch,
      policyIdKey: 'bonusPolicyID',
      scopeIdKey: 'branchMasterID',
      policyId: bonusPolicyID,
      req,
      transaction: transaction,
    });

    await bulkCreatePolicyScope({
      scope: department_scope,
      selectedScope: policyScope.SELECTED,
      ids: department_scope_IDs,
      model: BonusPolicyDepartment,
      policyIdKey: 'bonusPolicyID',
      scopeIdKey: 'departmentId',
      policyId: bonusPolicyID,
      req,
      transaction: transaction,
    });

    await bulkCreatePolicyScope({
      scope: designation_scope,
      selectedScope: policyScope.SELECTED,
      ids: designation_scope_IDs,
      model: BonusPolicyDesignation,
      policyIdKey: 'bonusPolicyID',
      scopeIdKey: 'designationId',
      policyId: bonusPolicyID,
      req,
      transaction: transaction,
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: usermessage.addMessage('Bonus Policy'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.updateData = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      bonusPolicyName,
      bonusCycle,
      bonusCreditType,
      payInSalary,
      companyMasterID,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
    } = req.body;
    let { bonusCreditCycle } = req.body;
    const { id } = req.params;

    const find_SameData = await BonusPolicy.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('bonusPolicyName')),
          ),
          String(bonusPolicyName).trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1),
        ),
        Sequelize.where(sequelize.col('bonusPolicyId'), {
          [Sequelize.Op.ne]: id,
        }),
      ),
    });

    if (find_SameData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: `Bonus Policy name '${bonusPolicyName}' already exists. Please choose another.`,
      });
    }

    const bonusPolicy = await BonusPolicy.findByPk(id);

    if (!bonusPolicy) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: usermessage.deletedrecord,
      });
    }

    if (bonusCreditType == bonusCreditTypeEnum.PREVIOUS)
      bonusCreditCycle = null;

    bonusPolicy.bonusPolicyName = bonusPolicyName;
    bonusPolicy.bonusCycle = bonusCycle;
    bonusPolicy.bonusCreditType = bonusCreditType;
    bonusPolicy.bonusCreditCycle = bonusCreditCycle;
    bonusPolicy.payInSalary = payInSalary;
    bonusPolicy.companyMasterID = companyMasterID;
    bonusPolicy.branch_scope = branch_scope;
    bonusPolicy.department_scope = department_scope;
    bonusPolicy.designation_scope = designation_scope;
    await bonusPolicy.save({
      user: req.userDetails,
      transaction,
    });
    await policy_Scope({
      model: BonusPolicyBranch,
      primaryKey: { bonusPolicyID: id },
      column: 'branchMasterID',
      newIDs: branch_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: BonusPolicyDepartment,
      primaryKey: { bonusPolicyID: id },
      column: 'departmentId',
      newIDs: department_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: BonusPolicyDesignation,
      primaryKey: { bonusPolicyID: id },
      column: 'designationId',
      newIDs: designation_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: usermessage.updateMessage('Bonus Policy'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// get all data api
exports.listdata = async (req, res, next) => {
  try {
    const { page, limit, searchQuery, companyMasterID, Export } = req.body;

    const condition = {};

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          bonusPolicyName: {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
      ];

    const paginationQuery = !Export
      ? page && limit
        ? { offset: (page - 1) * limit, limit }
        : {}
      : {};

    const { rows, count } = await BonusPolicy.findAndCountAll({
      where: condition,
      ...paginationQuery,
      include: [
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
        {
          model: UserMaster,
          as: 'createdBy',
          attributes: userAttributes,
        },
        {
          model: UserMaster,
          as: 'updatedBy',
          attributes: userAttributes,
        },
      ],
      order: [['bonusPolicyId', 'DESC']],
    });

    if (Export) {
      const finaldata = rows.map((e) => {
        return {
          'Bonus Policy Name': e.bonusPolicyName,
          'Company Name': e.companyMaster?.companyName || '',
          'Bonus Cycle': e.bonusCycle,
          'Bonus CreditType': e.bonusCreditType,
          'Bonus CreditCycle': e.bonusCreditCycle || '',
          'Pay In Salary': e.payInSalary ? 'Yes' : 'No',
          Status: e.status == 0 ? 'Deactive' : 'Active',
          createdBy: e.createdBy?.displayName || '',
          createdAt: asiaKolkataDateTime(e.createdAt),
          updatedBy: e.updatedBy?.displayName || '',
          updatedAt: e.updateBy ? asiaKolkataDateTime(e.updatedAt) : '',
        };
      });

      return await generateExcel(finaldata, 'Bonus Policy', 'xlsx', res);
    }

    return res.status(200).json({ status: 200, data: rows, totalcount: count });
  } catch (error) {
    next(error);
  }
};

// get by id
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const Data = await BonusPolicy.findOne({
      where: {
        bonusPolicyId: id,
      },
      include: [
        {
          model: companyMaster,
          attributes: ['companyMasterID', 'companyName'],
        },
        {
          model: BonusPolicyBranch,
          as: 'ap_branch',
        },
        {
          model: BonusPolicyDepartment,
          as: 'ap_dept',
        },
        {
          model: BonusPolicyDesignation,
          as: 'ap_design',
        },
      ],
    });

    return res.status(200).json({ status: 200, data: Data });
  } catch (err) {
    next(err);
  }
};

// delete api
exports.deletedata = async (req, res, next) => {
  try {
    const { id } = req.params;

    const findBonusPolicy = await EmployeeBonusPolicy.findOne({
      where: {
        bonusPolicyId: id,
      },
    });

    if (findBonusPolicy)
      return res.status(200).json({
        status: 401,
        message:
          'Bonus Policy already assigned to employees.So,you can not delete it',
      });

    const findData = await BonusPolicy.findByPk(id);

    if (!findData) {
      return res.status(200).json({
        status: 401,
        message: 'Attendance Bonus Policy not found!',
      });
    }

    // Perform deletion
    await findData.destroy({
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: usermessage.deleteMessage('Bonus Policy'),
    });
  } catch (error) {
    next(error);
  }
};

// active,deactive
exports.poststatuschange = async (req, res, next) => {
  try {
    let { bonusPolicyId, status } = await req.body;

    if (![0, 1].includes(+status))
      return res.status(200).json({
        status: 401,
        message: 'status is not valid!',
      });

    const findBonusPolicy = await EmployeeBonusPolicy.findOne({
      where: {
        bonusPolicyId,
      },
    });

    if (findBonusPolicy && status == 0) {
      return res.status(200).json({
        status: 401,
        message:
          'Bonus Policy already assigned to employees.So,you can not deactivate it',
      });
    }

    const findData = await BonusPolicy.findByPk(bonusPolicyId);

    findData.status = status;

    await findData.save({
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? usermessage.activeMessage('Bonus Policy')
          : usermessage.deactiveMessage('Bonus Policy'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getActiveBonusPolicyByCompanyId = async (req, res, next) => {
  try {
    const bonusPolicy = await BonusPolicy.findAll({
      where: {
        companyMasterID: req.params.id,
        status: 1,
      },
      include: [
        {
          model: BonusPolicyBranch,
          as: 'ap_branch',
        },
        {
          model: BonusPolicyDepartment,
          as: 'ap_dept',
        },
        {
          model: BonusPolicyDesignation,
          as: 'ap_design',
        },
      ],
    });

    return res.status(200).json({ status: 200, data: bonusPolicy });
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
    const order = [['bonusPolicyName', 'ASC']];

    /* ================= QUERY ================= */
    const policies = await BonusPolicy.findAll({
      where: {
        companyMasterID,
        status: 1,
        [Sequelize.Op.and]: [
          /* ============== BRANCH ================= */
          sequelize.literal(`
            (
              "bonusPolicy"."branch_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "bonusPolicyBranches" apb
                WHERE apb."bonusPolicyID" =
                      "bonusPolicy"."bonusPolicyId"
                AND apb."deletedAt" IS NULL
                AND apb."branchMasterID" = :branchMasterID
                AND "bonusPolicy"."deletedAt" IS NULL
              )
            )
          `),

          /* ============== DEPARTMENT ================= */
          sequelize.literal(`
            (
              "bonusPolicy"."department_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "bonusPolicyDepartments" apd
                WHERE apd."bonusPolicyID" =
                      "bonusPolicy"."bonusPolicyId"
                AND apd."deletedAt" IS NULL
                AND apd."departmentId" = :departmentId
                AND "bonusPolicy"."deletedAt" IS NULL
              )
            )
          `),

          /* ============== DESIGNATION ================= */
          sequelize.literal(`
            (
              "bonusPolicy"."designation_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "bonusPolicyDesignations" apg
                WHERE apg."bonusPolicyID" =
                      "bonusPolicy"."bonusPolicyId"
                AND apg."deletedAt" IS NULL
                AND apg."designationId" = :designationId
                AND "bonusPolicy"."deletedAt" IS NULL
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
        'bonusPolicyId',
        'bonusPolicyName',
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
