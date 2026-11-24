/** @format */

const Sequelize = require('sequelize');
const SalaryPolicyMaster = require('../models/salaryPolicy');
const logger = require('../config/logger');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const companyMaster = require('../models/companyMaster');
const employeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const UserMaster = require('../models/userMaster');
const { userAttributes, statusCodes } = require('../utils/commonVars');
const {
  PayrollFrequencyType,
  policyScope,
  overtimeAddedEnum,
} = require('../utils/dbUtils');
const { showOvertimeGiveIn } = require('../utils/labelUtils');
const { MonthDaysTypeEnum } = require('../utils/dbUtils');
const {
  bulkCreatePolicyScope,
  policy_Scope,
} = require('../utils/commonUtilFunctions');
const SalaryPolicyBranch = require('../models/salaryPolicyBranch');
const SalaryPolicyDepartment = require('../models/salaryPolicyDepartment');
const SalaryPolicyDesignation = require('../models/salaryPolicyDesignation');
/**
 * save SalaryPolicy data.
 *
 * @body {createBy} createBy user id of user who added the SalaryPolicy.
 * @body {number} createBy if any user change data then updateBy id change.
 
 */
exports.postAddSalaryPolicy = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      salaryPolicyName,
      salaryCycleDate = 1,
      salaryCalculationDays,
      salarycalculationBasedon,
      monthlyFixhours,
      dailyFixhours,
      holidayHours,
      weekoffHours,
      leaveHours,
      breakHours,
      overtimeAdded,
      salaryCycleConsider,
      companyMasterID,
      considerTimeType,
      considerTimeValue,
      payrollFrequency,
      otGiveIn = null,
      MonthDaysType,
      fixDays,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
      monthly_ot_cal_type,
      convertWorkedHoursToDays = false,
    } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    const existingPolicy = await SalaryPolicyMaster.findOne({
      where: [
        sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('salaryPolicyName')),
          ),
          salaryPolicyName.trim().toLowerCase(),
        ),
        { companyMasterID: companyMasterID },
        { status: [0, 1] },
      ],
    });

    if (existingPolicy) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: message.usermessage.alreadyExists(
          'Salary Policy With Same Name',
        ),
      });
    }
    if (!salaryCycleDate) salaryCycleDate = 1;

    const cycleDate = Number(salaryCycleDate);

    if (!Number.isInteger(+cycleDate) || +cycleDate < 1 || +cycleDate > 28) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Salary cycle start date must be between 1 and 28.',
      });
    }

    // if not payroll frequency
    if (!payrollFrequency) payrollFrequency = PayrollFrequencyType.MONTHLY;

    if (salarycalculationBasedon != 'hourwise') {
      considerTimeType = null;
      considerTimeValue = null;
      monthly_ot_cal_type = null;
      convertWorkedHoursToDays = false;
    }
    // set null salary cycle date and salaryCycleConsider
    if (payrollFrequency != PayrollFrequencyType.MONTHLY) {
      salaryCycleConsider = null;
    }

    if (salarycalculationBasedon == 'hourwise') {
      MonthDaysType = null;
      fixDays = null;
    }

    if (MonthDaysType == MonthDaysTypeEnum.MONTHDAYS) fixDays = null;

    if (overtimeAdded == overtimeAddedEnum.DAILY) {
      monthly_ot_cal_type = null;
    }

    const insert_db_status = await SalaryPolicyMaster.create(
      {
        salaryPolicyName,
        salaryCycleDate,
        companyMasterID,
        salaryCalculationDays,
        salarycalculationBasedon,
        monthlyFixhours,
        dailyFixhours,
        holidayHours,
        weekoffHours,
        leaveHours,
        breakHours,
        overtimeAdded,
        salaryCycleConsider,
        considerTimeType,
        considerTimeValue:
          considerTimeType == 'actual' ? null : considerTimeValue,
        payrollFrequency,
        otGiveIn: showOvertimeGiveIn ? otGiveIn : null,
        createBy,
        createByIp,
        MonthDaysType,
        fixDays,
        branch_scope,
        department_scope,
        designation_scope,
        monthly_ot_cal_type,
        convertWorkedHoursToDays,
      },
      { transaction },
    );
    const salaryPolicyID = insert_db_status.salaryPolicyID;
    await bulkCreatePolicyScope({
      scope: branch_scope,
      selectedScope: policyScope.SELECTED,
      ids: branch_scope_IDs,
      model: SalaryPolicyBranch,
      policyIdKey: 'salaryPolicyID',
      scopeIdKey: 'branchMasterID',
      policyId: salaryPolicyID,
      req,
      transaction: transaction,
    });

    await bulkCreatePolicyScope({
      scope: department_scope,
      selectedScope: policyScope.SELECTED,
      ids: department_scope_IDs,
      model: SalaryPolicyDepartment,
      policyIdKey: 'salaryPolicyID',
      scopeIdKey: 'departmentId',
      policyId: salaryPolicyID,
      req,
      transaction: transaction,
    });

    await bulkCreatePolicyScope({
      scope: designation_scope,
      selectedScope: policyScope.SELECTED,
      ids: designation_scope_IDs,
      model: SalaryPolicyDesignation,
      policyIdKey: 'salaryPolicyID',
      scopeIdKey: 'designationId',
      policyId: salaryPolicyID,
      req,
      transaction: transaction,
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Salary Policy'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 return all SalaryPolicy data
 */

exports.getAllSalaryPolicyData = async (req, res, next) => {
  try {
    const { companyMasterID, limit, page, searchQuery } = await req.body;

    const condition = {};

    condition.status = [0, 1];

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          salaryPolicyName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];

    const salaryPolicy = await SalaryPolicyMaster.findAndCountAll({
      raw: true,
      where: condition,
      ...paginationQuery,
      order,
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

    return res.status(200).json({
      status: 200,
      data: salaryPolicy.rows,
      totalcount: salaryPolicy.count,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * find data with SalaryPolicy id
 *
 * @param {id} salaryPolicyID  to fetch SalaryPolicy name
 */

exports.getSalaryPolicyById = async (req, res, next) => {
  try {
    let get_one_data = await SalaryPolicyMaster.findOne({
      where: {
        salaryPolicyID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          model: SalaryPolicyBranch,
          as: 'ap_branch',
        },
        {
          model: SalaryPolicyDepartment,
          as: 'ap_dept',
        },
        {
          model: SalaryPolicyDesignation,
          as: 'ap_design',
        },
      ],
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

/**
 * update data
 *
 * @param {id} salaryPolicyID  to update id
 */
exports.postUpdateSalaryPolicy = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      salaryPolicyID,
      salaryPolicyName,
      companyMasterID,
      salaryCycleDate = 1,
      salaryCalculationDays,
      salarycalculationBasedon,
      monthlyFixhours,
      dailyFixhours,
      holidayHours,
      weekoffHours,
      leaveHours,
      breakHours,
      overtimeAdded,
      salaryCycleConsider,
      considerTimeType,
      considerTimeValue,
      payrollFrequency,
      otGiveIn = null,
      MonthDaysType,
      fixDays,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
      monthly_ot_cal_type,
      convertWorkedHoursToDays = false,
    } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const existingPolicyName = await SalaryPolicyMaster.findOne({
      where: {
        [Sequelize.Op.and]: [
          sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('salaryPolicyName')),
            ),
            salaryPolicyName.trim().toLowerCase(),
          ),
          { companyMasterID: companyMasterID },
          { salaryPolicyID: { [Sequelize.Op.ne]: salaryPolicyID } },
          { status: [0, 1] },
        ],
      },
    });

    if (existingPolicyName) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: message.usermessage.alreadyExists(
          'Salary Policy With Same Name',
        ),
      });
    }
    if (!salaryCycleDate) salaryCycleDate = 1;

    const cycleDate = Number(salaryCycleDate);

    if (!Number.isInteger(+cycleDate) || +cycleDate < 1 || +cycleDate > 28) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Salary cycle start date must be between 1 and 28.',
      });
    }

    // if not payroll frequency
    if (!payrollFrequency) payrollFrequency = PayrollFrequencyType.MONTHLY;

    if (salarycalculationBasedon != 'hourwise') {
      considerTimeType = null;
      considerTimeValue = null;
      monthly_ot_cal_type = null;
      convertWorkedHoursToDays = false;
    }

    if (salarycalculationBasedon == 'hourwise') {
      MonthDaysType = null;
      fixDays = null;
    }

    if (MonthDaysType == MonthDaysTypeEnum.MONTHDAYS) fixDays = null;

    // set null salary cycle date and salaryCycleConsider
    if (payrollFrequency != PayrollFrequencyType.MONTHLY) {
      salaryCycleConsider = null;
    }

    if (overtimeAdded == overtimeAddedEnum.DAILY) {
      monthly_ot_cal_type = null;
    }

    await SalaryPolicyMaster.update(
      {
        salaryPolicyName,
        salaryCycleDate: cycleDate,
        companyMasterID,
        salaryCalculationDays,
        salarycalculationBasedon,
        monthlyFixhours,
        dailyFixhours,
        holidayHours,
        weekoffHours,
        leaveHours,
        breakHours,
        overtimeAdded,
        salaryCycleConsider,
        considerTimeType,
        considerTimeValue:
          considerTimeType == 'actual' ? null : considerTimeValue,
        payrollFrequency,
        otGiveIn: showOvertimeGiveIn ? otGiveIn : null,
        updateBy,
        updateByIp,
        MonthDaysType,
        fixDays,
        branch_scope,
        department_scope,
        designation_scope,
        monthly_ot_cal_type,
        convertWorkedHoursToDays,
      },
      {
        where: { salaryPolicyID: salaryPolicyID },
        transaction,
      },
    );
    await policy_Scope({
      model: SalaryPolicyBranch,
      primaryKey: { salaryPolicyID: salaryPolicyID },
      column: 'branchMasterID',
      newIDs: branch_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: SalaryPolicyDepartment,
      primaryKey: { salaryPolicyID: salaryPolicyID },
      column: 'departmentId',
      newIDs: department_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: SalaryPolicyDesignation,
      primaryKey: { salaryPolicyID: salaryPolicyID },
      column: 'designationId',
      newIDs: designation_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Salary Policy'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * update status
 *
 * @param {id} salaryPolicyID  to update status of SalaryPolicy
 */

exports.poststatuschange = async (req, res, next) => {
  try {
    let { salaryPolicyID, status } = await req.body;
    let delete_status;
    let result = await sequelize.transaction(async (t) => {
      if (status == '1') {
        delete_status = await SalaryPolicyMaster.update(
          {
            status: '1',
          },
          {
            where: { salaryPolicyID: salaryPolicyID, status: ['1', '0'] },
            transaction: t,
          },
        );
      } else {
        let data = await employeeSalaryPolicy.findOne({
          where: {
            salaryPolicyID: salaryPolicyID,
            status: ['1', '0'],
          },
        });

        if (data) {
          return res.status(200).json({
            status: 401,
            message:
              'You can not deactive this Salary Policy. Already assigned to employees.',
          });
        } else {
          delete_status = await SalaryPolicyMaster.update(
            {
              status: '0',
            },
            {
              where: { salaryPolicyID: salaryPolicyID, status: ['1', '0'] },
              transaction: t,
            },
          );
        }
      }

      if (delete_status != 0) {
        res.status(200).json({
          status: 200,
          message: message.usermessage.bankdelete,
          data: {},
        });
      } else {
        res.status(200).json({
          status: 200,
          message: message.usermessage.deletedrecord,
          data: {},
        });
      }
      return delete_status;
    });
  } catch (err) {
    next(err);
  }
};

/**
 * delete by i
 *
 * @param {id} salaryPolicyID  to delete id
 */
exports.postDeleteSalaryPolicyById = async (req, res, next) => {
  try {
    let { salaryPolicyID } = await req.body;
    // let delete_db_status = await SalaryPolicyMaster.destroy({
    //     where: {
    //         salaryPolicyID: salaryPolicyID
    //     }
    // });

    let data = await employeeSalaryPolicy.findOne({
      where: {
        salaryPolicyID: salaryPolicyID,
        status: ['1', '0'],
      },
    });

    if (data) {
      return res.status(200).json({
        status: 401,
        message:
          'You can not delete this Salary Policy. Already assigned to employees.',
      });
    } else {
      let result = await sequelize.transaction(async (t) => {
        let delete_status = await SalaryPolicyMaster.update(
          {
            status: 2,
          },
          {
            where: { salaryPolicyID: salaryPolicyID },
            transaction: t,
          },
        );

        res.status(200).json({
          status: 200,
          message: message.usermessage.salarypolicydelete,
        });
        return delete_status;
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.getactivesalarybycompanyid = async (req, res, next) => {
  try {
    let salary;
    salary = await SalaryPolicyMaster.findAll({
      where: {
        companyMasterID: req.params.id,
        status: 1,
      },
      raw: true,
    });

    res.status(200).json({ status: 200, data: salary });
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
    const order = [['salaryPolicyName', 'ASC']];

    /* ================= QUERY ================= */
    const policies = await SalaryPolicyMaster.findAll({
      where: {
        companyMasterID,
        status: 1,
        [Sequelize.Op.and]: [
          /* ============== BRANCH ================= */
          sequelize.literal(`
            (
              "salaryPolicy"."branch_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "salaryPolicyBranches" apb
                WHERE apb."salaryPolicyID" =
                      "salaryPolicy"."salaryPolicyID"
                AND apb."deletedAt" IS NULL
                AND apb."branchMasterID" = :branchMasterID
              )
            )
          `),

          /* ============== DEPARTMENT ================= */
          sequelize.literal(`
            (
              "salaryPolicy"."department_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "salaryPolicyDepartments" apd
                WHERE apd."salaryPolicyID" =
                      "salaryPolicy"."salaryPolicyID"
                AND apd."deletedAt" IS NULL
                AND apd."departmentId" = :departmentId
              )
            )
          `),

          /* ============== DESIGNATION ================= */
          sequelize.literal(`
            (
              "salaryPolicy"."designation_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "salaryPolicyDesignations" apg
                WHERE apg."salaryPolicyID" =
                      "salaryPolicy"."salaryPolicyID"
                AND apg."deletedAt" IS NULL
                AND apg."designationId" = :designationId
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
        'salaryPolicyID',
        'salaryPolicyName',
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
