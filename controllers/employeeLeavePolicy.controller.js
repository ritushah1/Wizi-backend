const { Op, Sequelize } = require('sequelize');
const { usermessage } = require('../response_message/message');
const UserMaster = require('../models/userMaster');
const { userAttributes, statusCodes } = require('../utils/commonVars');
const EmployeeLeavePolicy = require('../models/employeeLeavePolicy');
const sequelize = require('../config/database');
const HrLeaveMaster = require('../models/hrLeaveMaster');
const HrLeaveType = require('../models/hrLeaveTypes');
const companyMaster = require('../models/companyMaster');
const employeeLeavePolicy = require('../models/employeeLeavePolicy');
const { generateExcel } = require('../utils/exportData');
const {
  asiaKolkataDateTime,
  getFinancialYearDatesFromDate,
  employeeeLeaveBalance,
  getUserSalaryMasterByMonth,
  employeeAttendancePolicy,
  attendanceCalculation1,
  getPreviousMonth,
  getCoffBalanceData,
  consumeLeaveBalance,
  chunkArray,
  policy_Scope,
  bulkCreatePolicyScope,
  getSalaryCycleDateAndMonthByDate,
  getSalaryMonthBySalaryPolicy,
  getNextMonth,
  getMonthsFromPreviousMonth,
} = require('../utils/commonUtilFunctions');
const empLeavePolicy = require('../models/empLeavePolicy');
const UserLeaveLapse = require('../models/userLeaveLapse');
const HrLeaveBalance = require('../models/hrLeaveBalance');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const EmployeeEmployeement = require('../models/employeeEmployeement');
const LeaveEncashment = require('../models/leaveEncashment');
const _ = require('lodash');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeAttendancePolicy = require('../models/employeeAttendancePolicy');
const AttendancePolicy = require('../models/attendancePolicy');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const EmployeeSalaryPolicy = require('../models/employeeSalaryPolicy');
const SalaryPolicy = require('../models/salaryPolicy');
const EmployeeWeekOff = require('../models/employeeWeekOff');
const weekOffPolicy = require('../models/weekOffPolicy');
const EmployeeLateEarlyPolicy = require('../models/employeeLateEarlyPolicy');
const LateEarlyPolicy = require('../models/lateEarlyPolicy');
const LCEGPenalty = require('../models/lcegPenalty');
const {
  CoffUsedTypeEnum,
  earnBaseTypeLeaveEnum,
  policyScope,
  EarnedLeaveCreditType,
  chekLeaveBalanceFromEnum,
} = require('../utils/dbUtils');
const UsedCoffTransaction = require('../models/usedCoffTransaction');
const EmployeeLeavePolicyBranch = require('../models/employeeLeavePolicyBranch');
const EmployeeLeavePolicyDepartment = require('../models/employeeLeavePolicyDepartment');
const EmployeeLeavePolicyDesignation = require('../models/employeeLeavePolicyDesignation');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, '../leaveCron.log'),
  {
    flags: 'a',
  },
);

exports.createEmployeeLeavePolicy = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      leavePolicyName,
      leaveId,
      companyMasterID,
      leaveType,
      yearlyLeave,
      leaveOperationalYear,
      minDaysRequire,
      earnBaseType,
      creditPeriod,
      creditDate,
      creditType,
      // carryForward = 'N',
      // carryForwardLimit,
      // leavesToCarryForward,
      // leaveLapse,
      allowFutureApplyDays,
      allowPastApplyDays,
      allowMinInMonth,
      allowMaxInMonth,
      allowHalfDays,
      leaveOnNoticePeriod = '1',
      employementType,
      // leaveEncashment = '0',
      // cappingLeaveEncashment,
      min_leave_attachment,
      isAutoAdjusted = false,
      autoAdjustedPriority = null,
      leaveOnProbation = '1',
      probationDays = null,
      presentDays = null,
      isAdminApplicable = false,
      isAutoApprove = false,
      autoApproveLimit = null,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
      applyLeave = true,
      showLeaveBalance = true,
      leaveEncashmentAtFNF = false,
      minServiceDuration = null,
      clubbedLeave = 'noRestriction',
      clubIDs = [],
      isHalfDayClubbing,
      earnedLeaveCreditType,
      allowMin,
    } = await req.body;

    let {
      priority = null,
      monthly_CF_ENC_LPS = false,
      isMonthly_CF = false,
      monthly_CF_limit = null,
      isMonthly_ENC = false,
      monthly_ENC_limit = null,
      isMonthly_LPS = false,
      monthly_LPS_limit = null,
      quarterly_CF_ENC_LPS = false,
      isQuarterly_CF = false,
      quarterly_CF_limit = null,
      isQuarterly_ENC = false,
      quarterly_ENC_limit = null,
      isQuarterly_LPS = false,
      quarterly_LPS_limit = null,
      halfYearly_CF_ENC_LPS = false,
      isHalfYearly_CF = false,
      halfYearly_CF_limit = null,
      isHalfYearly_ENC = false,
      halfYearly_ENC_limit = null,
      isHalfYearly_LPS = false,
      halfYearly_LPS_limit = null,
      yearly_CF_ENC_LPS = false,
      isYearly_CF = false,
      yearly_CF_limit = null,
      isYearly_ENC = false,
      yearly_ENC_limit = null,
      isYearly_LPS = false,
      yearly_LPS_limit = null,
      fixedAmount_ENC = null,
      payheadIds = null,
      ratio = null,
      allowMaxInQuarter = null,
      allowMaxInHalfYear = null,
      allowMaxInYear = null,
      expiryDays = null,
      allowCoffBackdate = null,
    } = req.body;
    const existingPolicy = await EmployeeLeavePolicy.findOne({
      where: [
        sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('leavePolicyName')),
          ),
          leavePolicyName.trim().toLowerCase(),
        ),
        { companyMasterId: companyMasterID },
      ],
    });

    if (existingPolicy) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'Leave Policy With Same Name',
      });
    }
    // if not coff
    if (leaveId != 6) {
      expiryDays = null;
      allowCoffBackdate = null;
    }

    if (expiryDays) {
      priority = null;
      monthly_CF_ENC_LPS = false;
      isMonthly_CF = false;
      monthly_CF_limit = null;
      isMonthly_ENC = false;
      monthly_ENC_limit = null;
      isMonthly_LPS = false;
      monthly_LPS_limit = null;
      quarterly_CF_ENC_LPS = false;
      isQuarterly_CF = false;
      quarterly_CF_limit = null;
      isQuarterly_ENC = false;
      quarterly_ENC_limit = null;
      isQuarterly_LPS = false;
      quarterly_LPS_limit = null;
      halfYearly_CF_ENC_LPS = false;
      isHalfYearly_CF = false;
      halfYearly_CF_limit = null;
      isHalfYearly_ENC = false;
      halfYearly_ENC_limit = null;
      isHalfYearly_LPS = false;
      halfYearly_LPS_limit = null;
      yearly_CF_ENC_LPS = false;
      isYearly_CF = false;
      yearly_CF_limit = null;
      isYearly_ENC = false;
      yearly_ENC_limit = null;
      isYearly_LPS = false;
      yearly_LPS_limit = null;
      allowMaxInQuarter = null;
      allowMaxInHalfYear = null;
      allowMaxInYear = null;
    }

    if (!leaveEncashmentAtFNF && expiryDays) {
      fixedAmount_ENC = null;
      payheadIds = null;
      ratio = null;
    }

    if (yearlyLeave < 0 || (minDaysRequire && minDaysRequire < 0)) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Leave Days must be positive value.',
      });
    }

    if (creditDate < 0 || creditDate > 28) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Leave credit date must be between 1 and 28 .',
      });
    }

    if (
      typeof expiryDays == 'number' &&
      expiryDays <= 0 &&
      expiryDays % 1 != 0
    ) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'ExpiryDays must be a positive days.',
      });
    }

    if (leaveEncashmentAtFNF) {
      if (
        typeof minServiceDuration !== 'number' ||
        !Number.isInteger(minServiceDuration) ||
        minServiceDuration < 0
      ) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message:
            'Minimum service duration must be a non-negative whole number.',
        });
      }
    }

    const leaveExists = await HrLeaveMaster.findByPk(leaveId);
    if (!leaveExists) {
      await transaction.rollback();
      return res.status(statusCodes.NOT_FOUND).json({
        status: 401,
        message: usermessage.notFoundMessage('leaveId'),
      });
    }

    if (allowMinInMonth && allowMin) {
      if (allowMinInMonth < allowMin) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message:
            'Maximum leave at a time can not be less then minimum leave at a time',
        });
      }
    }

    const employeeLeave = await EmployeeLeavePolicy.create(
      {
        leavePolicyName,
        leaveId,
        companyMasterId: companyMasterID,
        leaveType,
        yearlyLeave,
        leaveOperationalYear,
        minDaysRequire,
        earnBaseType,
        creditPeriod,
        creditDate,
        creditType,
        // carryForward,
        // carryForwardLimit,
        // leavesToCarryForward,
        // leaveLapse,
        allowFutureApplyDays: applyLeave ? allowFutureApplyDays : 0,
        allowPastApplyDays: applyLeave ? allowPastApplyDays : 0,
        allowMinInMonth: applyLeave ? allowMinInMonth : 0,
        allowMaxInMonth: applyLeave ? allowMaxInMonth : 0,
        leaveOnNoticePeriod: applyLeave ? leaveOnNoticePeriod : 0,
        allowHalfDays: applyLeave ? allowHalfDays : 0,
        employementType,
        // leaveEncashment,
        // cappingLeaveEncashment:
        //   leaveEncashment == '1' ? cappingLeaveEncashment : null,
        min_leave_attachment:
          applyLeave && +min_leave_attachment > 0 ? min_leave_attachment : null,
        priority,
        monthly_CF_ENC_LPS,
        isMonthly_CF,
        monthly_CF_limit,
        isMonthly_ENC,
        monthly_ENC_limit,
        isMonthly_LPS,
        monthly_LPS_limit,
        quarterly_CF_ENC_LPS,
        isQuarterly_CF,
        quarterly_CF_limit,
        isQuarterly_ENC,
        quarterly_ENC_limit,
        isQuarterly_LPS,
        quarterly_LPS_limit,
        halfYearly_CF_ENC_LPS,
        isHalfYearly_CF,
        halfYearly_CF_limit,
        isHalfYearly_ENC,
        halfYearly_ENC_limit,
        isHalfYearly_LPS,
        halfYearly_LPS_limit,
        yearly_CF_ENC_LPS,
        isYearly_CF,
        yearly_CF_limit,
        isYearly_ENC,
        yearly_ENC_limit,
        isYearly_LPS,
        yearly_LPS_limit,
        fixedAmount_ENC,
        payheadIds,
        ratio,
        allowMaxInQuarter: applyLeave ? allowMaxInQuarter : 0,
        allowMaxInHalfYear: applyLeave ? allowMaxInHalfYear : 0,
        allowMaxInYear: applyLeave ? allowMaxInYear : 0,
        isAutoAdjusted: applyLeave ? isAutoAdjusted : false,
        autoAdjustedPriority:
          applyLeave && isAutoAdjusted ? autoAdjustedPriority : null,
        leaveOnProbation: applyLeave ? leaveOnProbation : 1,
        probationDays: applyLeave ? probationDays : null,
        presentDays: applyLeave ? presentDays : null,
        isAdminApplicable: applyLeave ? isAdminApplicable : true,
        expiryDays: applyLeave ? expiryDays : null,
        isAutoApprove: applyLeave ? isAutoApprove : false,
        autoApproveLimit: applyLeave ? autoApproveLimit : null,
        branch_scope,
        department_scope,
        designation_scope,
        applyLeave,
        showLeaveBalance: applyLeave ? true : showLeaveBalance,
        leaveEncashmentAtFNF,
        minServiceDuration: leaveEncashmentAtFNF ? minServiceDuration : null,
        clubbedLeave,
        clubIDs: clubbedLeave == 'selectedTypes' ? clubIDs : null,
        isHalfDayClubbing: isHalfDayClubbing,
        earnedLeaveCreditType:
          leaveType == 'Earn basis' ? earnedLeaveCreditType : null,
        allowCoffBackdate,
        allowMin: allowMin ? allowMin : null,
      },
      { user: req.userDetails, transaction },
    );
    const employeeLeavePolicyID = employeeLeave.id;
    await bulkCreatePolicyScope({
      scope: branch_scope,
      selectedScope: policyScope.SELECTED,
      ids: branch_scope_IDs,
      model: EmployeeLeavePolicyBranch,
      policyIdKey: 'employeeLeavePolicyID',
      scopeIdKey: 'branchMasterID',
      policyId: employeeLeavePolicyID,
      req,
      transaction,
    });

    await bulkCreatePolicyScope({
      scope: department_scope,
      selectedScope: policyScope.SELECTED,
      ids: department_scope_IDs,
      model: EmployeeLeavePolicyDepartment,
      policyIdKey: 'employeeLeavePolicyID',
      scopeIdKey: 'departmentId',
      policyId: employeeLeavePolicyID,
      req,
      transaction,
    });

    await bulkCreatePolicyScope({
      scope: designation_scope,
      selectedScope: policyScope.SELECTED,
      ids: designation_scope_IDs,
      model: EmployeeLeavePolicyDesignation,
      policyIdKey: 'employeeLeavePolicyID',
      scopeIdKey: 'designationId',
      policyId: employeeLeavePolicyID,
      req,
      transaction,
    });
    await transaction.commit();
    return res.status(statusCodes.OK).json({
      status: 200,
      data: employeeLeave,
      message: usermessage.addMessage('Employee Leave Policy'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.listEmployeeLeavePolicy = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      withDeleted,
      leaveId,
      companyMasterID,
      search,
      exportData,
    } = req.query;
    const condition = {};
    if (leaveId) condition.leaveId = +leaveId;

    if (companyMasterID) condition.companyMasterId = companyMasterID;
    if (search)
      condition[Op.or] = [
        { leavePolicyName: { [Op.iLike]: `%${search}%` } },
        { '$companyMaster.companyName$': { [Op.iLike]: `%${search}%` } },
      ];

    const paginationQuery = {};
    if (!exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = +limit;
    }
    const employeeLeave = await EmployeeLeavePolicy.findAndCountAll({
      where: condition,
      distinct: true,
      ...paginationQuery,
      paranoid: withDeleted !== 'true',
      include: [
        {
          model: HrLeaveMaster,
        },
        {
          model: companyMaster,
        },
        {
          model: UserMaster,
          as: 'createdByUser',
          attributes: userAttributes,
        },
        {
          model: UserMaster,
          as: 'updatedByUser',
          attributes: userAttributes,
        },
        {
          model: EmployeeLeavePolicyBranch,
          as: 'ap_branch',
        },
        {
          model: EmployeeLeavePolicyDepartment,
          as: 'ap_dept',
        },
        {
          model: EmployeeLeavePolicyDesignation,
          as: 'ap_design',
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    if (exportData) {
      const finaldata = employeeLeave.rows.map((e) => {
        return {
          'Employee LeavePolicy Name': e.leavePolicyName,
          'Company Name': e.companyMaster.companyName,
          Leave: e.hrLeaveMaster.LeaveName,
          LeaveType: e.leaveType,
          yearlyLeave: e.yearlyLeave,
          leaveOperationalYear: e.leaveOperationalYear,
          minDaysRequire: e.minDaysRequire,
          earnBaseType: e.earnBaseType,
          creditPeriod: e.creditPeriod,
          creditDate: e.creditDate,
          creditType: e.creditType,
          allowFutureApplyDays: e.allowFutureApplyDays,
          allowPastApplyDays: e.allowPastApplyDays,
          allowMinInMonth: e.allowMinInMonth,
          allowMaxInMonth: e.allowMaxInMonth,
          allowHalfDays: e.allowHalfDays,
          employementType: e.employementType.join(','),
        };
      });
      return await generateExcel(
        finaldata,
        'Employee Leave Policy',
        'xlsx',
        res,
      );
    }
    return res.status(statusCodes.OK).json({
      message: usermessage.fetchMessage('Employee Leave'),
      data: employeeLeave.rows,
      totalcount: employeeLeave.count,
      page: +page,
      pageSize: paginationQuery.limit,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateEmployeeLeavePolicy = async (req, res, next) => {
  try {
    const { id } = await req.params;

    const {
      leavePolicyName,
      leaveId,
      companyMasterId,
      leaveType,
      yearlyLeave,
      leaveOperationalYear,
      minDaysRequire,
      earnBaseType,
      creditPeriod,
      creditDate,
      creditType,
      // carryForward = 'N',
      // carryForwardLimit,
      // leavesToCarryForward,
      // leaveLapse,
      allowFutureApplyDays,
      allowPastApplyDays,
      allowMinInMonth,
      allowMaxInMonth,
      allowHalfDays,
      leaveOnNoticePeriod = '1',
      employementType,
      // leaveEncashment = '0',
      // cappingLeaveEncashment,
      min_leave_attachment,
      isAutoAdjusted = false,
      autoAdjustedPriority = null,
      leaveOnProbation = '1',
      probationDays = null,
      presentDays = null,
      isAdminApplicable = false,
      isAutoApprove = false,
      autoApproveLimit = null,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
      applyLeave = true,
      showLeaveBalance = true,
      leaveEncashmentAtFNF = false,
      minServiceDuration = null,
      clubbedLeave = 'noRestriction',
      clubIDs = [],
      isHalfDayClubbing,
      earnedLeaveCreditType,
      allowMin,
    } = req.body;

    let {
      priority = null,
      monthly_CF_ENC_LPS = false,
      isMonthly_CF = false,
      monthly_CF_limit = null,
      isMonthly_ENC = false,
      monthly_ENC_limit = null,
      isMonthly_LPS = false,
      monthly_LPS_limit = null,
      quarterly_CF_ENC_LPS = false,
      isQuarterly_CF = false,
      quarterly_CF_limit = null,
      isQuarterly_ENC = false,
      quarterly_ENC_limit = null,
      isQuarterly_LPS = false,
      quarterly_LPS_limit = null,
      halfYearly_CF_ENC_LPS = false,
      isHalfYearly_CF = false,
      halfYearly_CF_limit = null,
      isHalfYearly_ENC = false,
      halfYearly_ENC_limit = null,
      isHalfYearly_LPS = false,
      halfYearly_LPS_limit = null,
      yearly_CF_ENC_LPS = false,
      isYearly_CF = false,
      yearly_CF_limit = null,
      isYearly_ENC = false,
      yearly_ENC_limit = null,
      isYearly_LPS = false,
      yearly_LPS_limit = null,
      fixedAmount_ENC = null,
      payheadIds = null,
      ratio = null,
      allowMaxInQuarter = null,
      allowMaxInHalfYear = null,
      allowMaxInYear = null,
      expiryDays = null,
      allowCoffBackdate = null,
    } = req.body;

    // if not coff
    if (leaveId != 6) {
      expiryDays = null;
      allowCoffBackdate = null;
    }

    if (expiryDays) {
      priority = null;
      monthly_CF_ENC_LPS = false;
      isMonthly_CF = false;
      monthly_CF_limit = null;
      isMonthly_ENC = false;
      monthly_ENC_limit = null;
      isMonthly_LPS = false;
      monthly_LPS_limit = null;
      quarterly_CF_ENC_LPS = false;
      isQuarterly_CF = false;
      quarterly_CF_limit = null;
      isQuarterly_ENC = false;
      quarterly_ENC_limit = null;
      isQuarterly_LPS = false;
      quarterly_LPS_limit = null;
      halfYearly_CF_ENC_LPS = false;
      isHalfYearly_CF = false;
      halfYearly_CF_limit = null;
      isHalfYearly_ENC = false;
      halfYearly_ENC_limit = null;
      isHalfYearly_LPS = false;
      halfYearly_LPS_limit = null;
      yearly_CF_ENC_LPS = false;
      isYearly_CF = false;
      yearly_CF_limit = null;
      isYearly_ENC = false;
      yearly_ENC_limit = null;
      isYearly_LPS = false;
      yearly_LPS_limit = null;
      fixedAmount_ENC = null;
      payheadIds = null;
      ratio = null;
      allowMaxInQuarter = null;
      allowMaxInHalfYear = null;
      allowMaxInYear = null;
    }

    if (yearlyLeave < 0 || (minDaysRequire && minDaysRequire < 0)) {
      return res.status(200).json({
        status: 401,
        message: 'Leave Days must be positive value.',
      });
    }
    if (creditDate < 0 || creditDate > 28)
      return res.status(200).json({
        status: 401,
        message: 'Leave credit date must be between 1 and 28 .',
      });

    if (
      typeof expiryDays == 'number' &&
      expiryDays <= 0 &&
      expiryDays % 1 != 0
    ) {
      return res.status(200).json({
        status: 401,
        message: 'ExpiryDays must be a positive days.',
      });
    }

    if (leaveEncashmentAtFNF) {
      if (
        typeof minServiceDuration !== 'number' ||
        !Number.isInteger(minServiceDuration) ||
        minServiceDuration < 0
      ) {
        return res.status(200).json({
          status: 401,
          message:
            'Minimum service duration must be a non-negative whole number.',
        });
      }
    }

     if (allowMinInMonth && allowMin) {
      if (allowMinInMonth < allowMin) {
        return res.status(200).json({
          status: 400,
          message:
            'Maximum leave at a time can not be less then minimum leave at a time',
        });
      }
    }

    const employeeLeave = await EmployeeLeavePolicy.findByPk(id, {
      includes: {
        model: companyMaster,
        where: {
          companyMasterId:
            req.userDetails.childCompanies.length > 0
              ? [
                  ...req.userDetails.childCompanies,
                  req.userDetails.companyMasterId,
                ]
              : req.userDetails.companyMasterId,
        },
      },
    });
    if (!employeeLeave) {
      return res.status(statusCodes.NOT_FOUND).json({
        status: 401,
        message: usermessage.notFoundMessage('Employee Leave'),
      });
    }
    const transaction = await sequelize.transaction();
    try {
      if (leavePolicyName) employeeLeave.leavePolicyName = leavePolicyName;
      if (leaveType) employeeLeave.leaveType = leaveType;
      if (yearlyLeave) employeeLeave.yearlyLeave = yearlyLeave;
      if (leaveOperationalYear)
        employeeLeave.leaveOperationalYear = leaveOperationalYear;
      if (minDaysRequire) employeeLeave.minDaysRequire = minDaysRequire;
      if (earnBaseType) employeeLeave.earnBaseType = earnBaseType;
      if (creditPeriod) employeeLeave.creditPeriod = creditPeriod;
      if (creditDate) employeeLeave.creditDate = creditDate;
      if (creditType) employeeLeave.creditType = creditType;

      // employeeLeave.carryForward = carryForward;
      // employeeLeave.carryForwardLimit = carryForwardLimit;
      // employeeLeave.leavesToCarryForward = leavesToCarryForward;
      // employeeLeave.leaveLapse = leaveLapse;

      employeeLeave.allowFutureApplyDays = applyLeave
        ? allowFutureApplyDays
        : 0;

      employeeLeave.allowPastApplyDays = applyLeave ? allowPastApplyDays : 0;

      employeeLeave.allowMinInMonth = applyLeave ? allowMinInMonth : 0;

      employeeLeave.allowMaxInMonth = applyLeave ? allowMaxInMonth : 0;

      employeeLeave.allowHalfDays = applyLeave ? allowHalfDays : 0;

      employeeLeave.leaveOnNoticePeriod = applyLeave ? leaveOnNoticePeriod : 0;

      employeeLeave.leaveOnProbation = applyLeave ? leaveOnProbation : 1;

      employeeLeave.probationDays = applyLeave ? probationDays : null;

      employeeLeave.presentDays = applyLeave ? presentDays : null;

      employeeLeave.isAdminApplicable = applyLeave ? isAdminApplicable : true;

      employeeLeave.employementType = employementType;

      // employeeLeave.leaveEncashment = leaveEncashment;

      // employeeLeave.cappingLeaveEncashment =
      //   leaveEncashment == '1' ? cappingLeaveEncashment : null;

      employeeLeave.min_leave_attachment =
        applyLeave && +min_leave_attachment > 0 ? min_leave_attachment : null;

      employeeLeave.isAutoAdjusted = applyLeave ? isAutoAdjusted : false;

      employeeLeave.autoAdjustedPriority =
        applyLeave && isAutoAdjusted ? autoAdjustedPriority : null;

      employeeLeave.expiryDays = applyLeave ? expiryDays : null;

      employeeLeave.isAutoApprove = applyLeave ? isAutoApprove : false;
      employeeLeave.autoApproveLimit = applyLeave ? autoApproveLimit : null;

      employeeLeave.priority = priority;
      employeeLeave.monthly_CF_ENC_LPS = monthly_CF_ENC_LPS;
      employeeLeave.isMonthly_CF = isMonthly_CF;
      employeeLeave.monthly_CF_limit = monthly_CF_limit;
      employeeLeave.isMonthly_ENC = isMonthly_ENC;
      employeeLeave.monthly_ENC_limit = monthly_ENC_limit;
      employeeLeave.isMonthly_LPS = isMonthly_LPS;
      employeeLeave.monthly_LPS_limit = monthly_LPS_limit;
      employeeLeave.quarterly_CF_ENC_LPS = quarterly_CF_ENC_LPS;
      employeeLeave.isQuarterly_CF = isQuarterly_CF;
      employeeLeave.quarterly_CF_limit = quarterly_CF_limit;
      employeeLeave.isQuarterly_ENC = isQuarterly_ENC;
      employeeLeave.quarterly_ENC_limit = quarterly_ENC_limit;
      employeeLeave.isQuarterly_LPS = isQuarterly_LPS;
      employeeLeave.quarterly_LPS_limit = quarterly_LPS_limit;
      employeeLeave.halfYearly_CF_ENC_LPS = halfYearly_CF_ENC_LPS;
      employeeLeave.isHalfYearly_CF = isHalfYearly_CF;
      employeeLeave.halfYearly_CF_limit = halfYearly_CF_limit;
      employeeLeave.isHalfYearly_ENC = isHalfYearly_ENC;
      employeeLeave.halfYearly_ENC_limit = halfYearly_ENC_limit;
      employeeLeave.isHalfYearly_LPS = isHalfYearly_LPS;
      employeeLeave.halfYearly_LPS_limit = halfYearly_LPS_limit;
      employeeLeave.yearly_CF_ENC_LPS = yearly_CF_ENC_LPS;
      employeeLeave.isYearly_CF = isYearly_CF;
      employeeLeave.yearly_CF_limit = yearly_CF_limit;
      employeeLeave.isYearly_ENC = isYearly_ENC;
      employeeLeave.yearly_ENC_limit = yearly_ENC_limit;
      employeeLeave.isYearly_LPS = isYearly_LPS;
      employeeLeave.yearly_LPS_limit = yearly_LPS_limit;

      employeeLeave.fixedAmount_ENC = fixedAmount_ENC;
      employeeLeave.payheadIds = payheadIds;
      employeeLeave.ratio = ratio;
      employeeLeave.allowMaxInQuarter = applyLeave ? allowMaxInQuarter : 0;
      employeeLeave.allowMaxInHalfYear = applyLeave ? allowMaxInHalfYear : 0;
      employeeLeave.allowMaxInYear = applyLeave ? allowMaxInYear : 0;
      employeeLeave.branch_scope = branch_scope;
      employeeLeave.department_scope = department_scope;
      employeeLeave.designation_scope = designation_scope;
      employeeLeave.updateBy = req.userDetails.userMasterId;
      employeeLeave.updateByIp = req.userDetails.userIpAddress;
      employeeLeave.applyLeave = applyLeave;
      employeeLeave.showLeaveBalance = applyLeave ? true : showLeaveBalance;
      employeeLeave.leaveEncashmentAtFNF = leaveEncashmentAtFNF;
      employeeLeave.minServiceDuration = leaveEncashmentAtFNF
        ? minServiceDuration
        : null;
      employeeLeave.clubbedLeave = clubbedLeave;
      employeeLeave.clubIDs = clubbedLeave == 'selectedTypes' ? clubIDs : null;
      employeeLeave.isHalfDayClubbing = isHalfDayClubbing;
      employeeLeave.earnedLeaveCreditType =
        leaveType == 'Earn basis' ? earnedLeaveCreditType : null;
      employeeLeave.allowCoffBackdate = allowCoffBackdate;
      employeeLeave.allowMin = allowMin;

      if (leaveId) {
        const leaveExists = await HrLeaveMaster.findByPk(leaveId);
        if (!leaveExists) {
          await transaction.rollback();
          return res.status(statusCodes.NOT_FOUND).json({
            status: 401,
            message: usermessage.notFoundMessage('leave id'),
          });
        }
        employeeLeave.leaveId = leaveId;
      }
      if (companyMasterId) employeeLeave.companyMasterId = companyMasterId;
      await employeeLeave.save({
        user: req.userDetails,
        transaction,
      });
      await policy_Scope({
        model: EmployeeLeavePolicyBranch,
        primaryKey: { employeeLeavePolicyID: id },
        column: 'branchMasterID',
        newIDs: branch_scope_IDs,
        user: req.userDetails,
        transaction: transaction,
      });

      await policy_Scope({
        model: EmployeeLeavePolicyDepartment,
        primaryKey: { employeeLeavePolicyID: id },
        column: 'departmentId',
        newIDs: department_scope_IDs,
        user: req.userDetails,
        transaction: transaction,
      });

      await policy_Scope({
        model: EmployeeLeavePolicyDesignation,
        primaryKey: { employeeLeavePolicyID: id },
        column: 'designationId',
        newIDs: designation_scope_IDs,
        user: req.userDetails,
        transaction: transaction,
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    return res.status(statusCodes.OK).json({
      status: 200,
      data: employeeLeave,
      message: usermessage.updateMessage('Employee Leave Policy'),
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteEmployeeLeavePolicy = async (req, res, next) => {
  try {
    const { id } = await req.params;

    const findData = await empLeavePolicy.findOne({
      where: {
        employeeLeavePolicyID: {
          [Op.contains]: [id],
        },
      },
    });

    if (findData)
      return res.status(200).json({
        status: 401,
        message:
          'Leave Policy already assign to employees.So, you can not delete it.',
      });

    const employeeLeave = await employeeLeavePolicy.findByPk(id, {
      include: [
        {
          model: companyMaster,
          where: {
            companyMasterID:
              req.userDetails.childCompanies.length > 0
                ? [
                    ...req.userDetails.childCompanies,
                    req.userDetails.companyMasterId,
                  ]
                : req.userDetails.companyMasterId,
          },
        },
        { model: HrLeaveMaster },
        // { model: HrLeaveType }, fix this
      ],
      nest: true,
    });
    if (!employeeLeave)
      return res.status(statusCodes.NOT_FOUND).json({
        message: usermessage.notFoundMessage('Employee Leave Policy'),
      });

    await employeeLeave.destroy({
      user: req.userDetails,
    });

    return res.status(statusCodes.OK).json({
      status: 200,
      message: usermessage.deleteMessage('Employee Leave Policy'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getEmpLeavePolicyDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employeeLeave = await EmployeeLeavePolicy.findByPk(id, {
      include: [
        {
          model: HrLeaveMaster,
        },
        {
          model: UserMaster,
          as: 'createdByUser',
          attributes: userAttributes,
        },
        {
          model: companyMaster,
          where: {
            companyMasterID:
              req.userDetails.childCompanies.length > 0
                ? [
                    ...req.userDetails.childCompanies,
                    req.userDetails.companyMasterId,
                  ]
                : req.userDetails.companyMasterId,
          },
        },
        {
          model: EmployeeLeavePolicyBranch,
          as: 'ap_branch',
        },
        {
          model: EmployeeLeavePolicyDepartment,
          as: 'ap_dept',
        },
        {
          model: EmployeeLeavePolicyDesignation,
          as: 'ap_design',
        },
      ],
    });

    if (!employeeLeave)
      return res.status(statusCodes.NOT_FOUND).json({
        message: usermessage.notFoundMessage('Employee leave'),
      });

    return res.status(statusCodes.OK).json({
      data: employeeLeave,
      message: usermessage.fetchMessage('Employee leave'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getHrLeaveTypesByComp = async (req, res, next) => {
  try {
    const hrLeaveTypes = await HrLeaveType.findAndCountAll({
      where: {
        companyMasterID: req.params.id,
        status: 1,
      },
      include: [{ model: HrLeaveMaster, as: 'LeaveMaster' }],
      order: [['LeaveTranId', 'ASC']],
    });

    return res.status(200).json({
      data: hrLeaveTypes.rows,
      totalcount: hrLeaveTypes.count,
    });
  } catch (err) {
    next(err);
  }
};

// exports.changeStatusByDate = async (req, res, next) => {
//   try {
//     // const today = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
//     const today = new Date();
//     let get_data = await employeeLeavePolicy.findAll({
//       attributes: ['userMasterID'],
//       where: { applicableDate: today },
//     });
//     let users = [];
//     get_data.forEach((user) => {
//       users.push(user.userMasterID);
//     });

//     let result = await sequelize.transaction(async (t) => {
//       let emp_leave_active = await employeeLeavePolicy.update(
//         {
//           status: 1,
//         },
//         {
//           where: {
//             applicableDate: today,
//             userMasterID: {
//               [Sequelize.Op.in]: users,
//             },
//           },
//           transaction: t,
//         }
//       );

//       let deactive_prev = await employeeLeavePolicy.update(
//         {
//           status: 0,
//           endDate: today,
//         },
//         {
//           where: {
//             userMasterID: {
//               [Sequelize.Op.in]: users,
//             },
//             applicableDate: {
//               [Sequelize.Op.ne]: today,
//             },
//           },
//           transaction: t,
//         }
//       );

//       return emp_leave_active;
//     });
//   } catch (err) {
//     next(err);
//   }
// };

exports.getLeavePolicyBycompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await employeeLeavePolicy.findAll({
      raw: true,
      where: {
        companyMasterId: id,
      },
    });

    return res.status(200).json({
      status: 200,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

function getPriorityWiseBalance(
  balance = 0,
  config,
  priority = [],
  period = '',
) {
  let result = { encashment: 0, carryForward: 0, lapse: 0 };

  const period1 =
    period == 'HalfYearly' ? 'halfYearly' : String(period).toLowerCase();

  for (let type of priority) {
    if (balance <= 0) break;

    if (type === 'encashment' && config[`is${period}_ENC`]) {
      let limit = config[`${period1}_ENC_limit`] ?? 0;
      if (limit === 0 || limit >= balance) {
        result.encashment = balance;
        balance = 0;
      } else {
        result.encashment = limit;
        balance -= limit;
      }
    } else if (type === 'carryForward' && config[`is${period}_CF`]) {
      let limit = config[`${period1}_CF_limit`] ?? 0;
      if (limit === 0 || limit >= balance) {
        result.carryForward = balance;
        balance = 0;
      } else {
        result.carryForward = limit;
        balance -= limit;
      }
    } else if (type === 'lapse' && config[`is${period}_LPS`]) {
      let limit = config[`${period1}_LPS_limit`] ?? 0;
      if (limit === 0 || limit >= balance) {
        result.lapse = balance;
        balance = 0;
      } else {
        result.lapse = limit;
        balance -= limit;
      }
    }
  }

  return result;
}

async function bulkInsertInChunks(model, data, chunkSize = 1000) {
  const chunks = _.chunk(data, chunkSize);
  for (const chunk of chunks) {
    await model.bulkCreate(chunk);
  }
}

// earn base leaveType enum
const earnBaseLeaveMap = {
  [earnBaseTypeLeaveEnum.PRESENT]: [1, 25],

  [earnBaseTypeLeaveEnum.PRESENT_WEEKOFF]: [1, 25, 7],

  [earnBaseTypeLeaveEnum.PRESENT_WEEKOFF_HOLIDAY]: [1, 25, 7, 9],
};

const EXCLUDE_PRESENT_WEEKOFF_PAIDLEAVE = new Set([
  5, 18, 9, 20, 21, 22, 24, 28, 29, 30, 31, 32, 34, 35,
]);

const EXCLUDE_PAID_DAYS = new Set([
  5, 18, 20, 21, 22, 24, 28, 29, 30, 31, 32, 34, 35,
]);

function calculateTotalDays(EmployeeAttendance = [], leavePolicy) {
  const earnType = leavePolicy.earnBaseType;

  // SIMPLE INCLUDE CASES
  if (earnBaseLeaveMap[earnType]) {
    const validLeaveIDs = new Set(earnBaseLeaveMap[earnType]);

    return EmployeeAttendance.reduce((total, e) => {
      if (validLeaveIDs.has(+e.LeaveID)) {
        total += +e.AttnVal;
      }
      return total;
    }, 0);
  }

  // PRESENT + WEEKOFF + PAID LEAVE
  if (earnType === earnBaseTypeLeaveEnum.PRESENT_WEEKOFF_PAIDLEAVE) {
    return EmployeeAttendance.reduce((total, e) => {
      if (!EXCLUDE_PRESENT_WEEKOFF_PAIDLEAVE.has(+e.LeaveID)) {
        total += +e.AttnVal;
      }
      return total;
    }, 0);
  }

  // PAID DAYS
  if (earnType === earnBaseTypeLeaveEnum.PAID_DAYS) {
    return EmployeeAttendance.reduce((total, e) => {
      if (!EXCLUDE_PAID_DAYS.has(+e.LeaveID)) {
        total += +e.AttnVal;
      }
      return total;
    }, 0);
  }

  return 0;
}

const CREDIT_PERIOD_MONTHS = {
  Monthly: 1,
  Quarterly: 3,
  'Half Yearly': 6,
  Yearly: 12,
};

exports.employeeLeavePolicyCron = async (req, res, next) => {
  try {
    const { currentDate } = req?.body || {};

    const startTime = Date.now();
    accessLogStream.write(
      `${new Date().toISOString()} ===> Leave Cron Started\n`,
    );

    console.log('Leave cron started----------------------');
    const finalDataToAddLeave = [];
    const finalDataToLapse = [];
    const finalDataToEncashment = [];
    let finalCoffUsedTransaction = [];
    let finalCoffBalanceData = [];

    const date = currentDate || asiaKolkataDateTime(new Date()).slice(0, 10);
    const onlyDate = date.slice(8, 10);
    const currentMonth = date.slice(0, 4) + date.slice(5, 7);
    // const previousMonth = getPreviousMonth(+currentMonth);

    const AllEmployeeLeavePolicyData = await EmployeeLeavePolicy.findAll({
      where: {
        creditDate: +onlyDate,
      },
    });

    const leavePolicyIds = AllEmployeeLeavePolicyData.map((e) => e.id);

    if (!leavePolicyIds.length) return;

    const subquery = `
      SELECT DISTINCT ON ("userMasterID") *
      FROM "empLeavePolicies"
      WHERE "status" = 1
      AND "applicableDate" <= :date
      AND ("endDate" >= :date OR "endDate" IS NULL)
      AND "employeeLeavePolicyID" && ARRAY[:policyIDs]::integer[]
      ORDER BY "userMasterID", "applicableDate" DESC
    `;

    const AllEmployeeLeavePolicy = await empLeavePolicy.sequelize.query(
      subquery,
      {
        replacements: { date: new Date(date), policyIDs: leavePolicyIds },
        model: empLeavePolicy,
        mapToModel: true,
      },
    );

    // const AllEmployeeLeavePolicy = await empLeavePolicy.findAll({
    //   raw: true,
    //   where: {
    //     status: 1,
    //     userMasterID: [3293],
    //     applicableDate: {
    //       [Sequelize.Op.lte]: new Date(date),
    //     },
    //     [Sequelize.Op.or]: [
    //       {
    //         endDate: {
    //           [Sequelize.Op.gte]: new Date(date),
    //         },
    //       },
    //       {
    //         endDate: null,
    //       },
    //     ],
    //   },
    //   include: [
    //     {
    //       required: true,
    //       model: UserMaster,
    //       as: 'employee',
    //       // where: { companyMasterId: 68 },
    //     },
    //   ],
    // });

    const allUserIds = AllEmployeeLeavePolicy.map((e) => e.userMasterID);

    // find All user Data

    const userMaster = await UserMaster.findAll({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: allUserIds,
        },
        status: 1,
      },
      include: [
        {
          model: EmployeeJoiningDetails,
          attributes: [
            'employeeCode',
            'joiningDate',
            'leavingDate',
            'salaryCalculationAct',
            'fullMonthPresence',
          ],
        },
        {
          required: false,
          model: EmployeeSalaryPolicy,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(date),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(date),
                },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          attributes: ['salaryPolicyID'],
          include: [{ model: SalaryPolicy, as: 'salaryPolicy' }],
        },
        {
          model: EmployeeAttendancePolicy,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(date) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          required: false,
          attributes: ['attendancePolicyID', 'startDate', 'endDate'],
          include: [
            {
              model: AttendancePolicy,
              as: 'attendancePolicy',
              attributes: [
                'attendancePolicyID',
                'sandwichLeave',
                'BeforeAfterLeave',
                ['weekoffsandwichLeave', 'wh_sandwich'],
                ['holidaysandwichLeave', 'ph_sandwich'],
                ['HFDBeforeAfterLeave', 'HFD_Be_Aft'],
                'WHPHPriority',
                'coff',
                'isWHAbsentRule',
              ],
            },
          ],
        },
        {
          required: true,
          model: EmployeeEmployeement,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(date),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(date),
                },
              },
              {
                endDate: null,
              },
            ],
          },
        },
        // weeoffPolicy
        {
          model: EmployeeWeekOff,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(date) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          required: false,
          attributes: ['weekOffPolicyID', 'applicableDate', 'endDate'],
          include: [
            {
              model: weekOffPolicy,
              as: 'weekoff',
            },
          ],
        },
        // LCEG Policy Data
        {
          required: false,
          model: EmployeeLateEarlyPolicy,
          where: {
            status: 1,
            startDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              {
                endDate: { [Sequelize.Op.gte]: new Date(date) },
              },
              {
                endDate: { [Sequelize.Op.eq]: null },
              },
            ],
          },
          include: [
            {
              model: LateEarlyPolicy,
              as: 'lateEarlyPolicy',
              attributes: ['lateEarlyPolicyType', 'deductFrom'],
            },
          ],
        },
      ],
      attributes: [
        'userMasterID',
        'firstName',
        'lastName',
        'displayName',
        'userNumber',
        'photo',
        'companyMasterId',
        'gender',
      ],
      order: [['displayName', 'ASC']],
    });

    const userPreviousMonthMap = new Map();

    for (const user of userMaster) {
      const userMasterID = +user.userMasterID;
      const salaryPolicy =
        user.employeeSalaryPolicies?.[0]?.salaryPolicy || null;

      const { start_date, end_date, YYYYMM } = getSalaryCycleDateAndMonthByDate(
        salaryPolicy,
        date,
      );
      const previous_month = getPreviousMonth(YYYYMM);

      userPreviousMonthMap.set(userMasterID, previous_month);
    }

    // Distinct set of previous months across all users (avoids fetching month-by-month per user)
    const distinctPreviousMonths = [...new Set(userPreviousMonthMap.values())];

    // ---- Attendance calendar data ----
    const attnCalData = await HrLeaveMonthlyTrans.findAll({
      where: {
        AttnYearMon: { [Sequelize.Op.in]: distinctPreviousMonths },
        userMasterID: { [Sequelize.Op.in]: allUserIds },
      },
      attributes: [
        'AttnTranId',
        'LeaveTranId',
        'AttnVal',
        'userMasterID',
        'AttnYearMon',
        'monthstartdate',
        'monthenddate',
        'verified',
        'updateBy',
        'MonWorkDays',
      ],
      include: [
        {
          model: HrLeaveTypes,
          attributes: ['LeaveID'],
          include: [
            {
              model: HrLeaveMaster,
              as: 'LeaveMaster',
              attributes: ['LeaveName'],
            },
          ],
        },
      ],
    });

    const userAttnCalMap = new Map();

    for (const record of attnCalData) {
      const userMasterID = +record.userMasterID;
      const userPreviousMonth = userPreviousMonthMap.get(userMasterID);

      // Only keep the record if it matches THIS user's own previous month
      if (+record.AttnYearMon !== +userPreviousMonth) continue;

      if (!userAttnCalMap.has(userMasterID)) {
        userAttnCalMap.set(userMasterID, []);
      }
      userAttnCalMap.get(userMasterID).push(record);
    }

    // ---- LCEG Penalty data ----
    const lcegPenalty = await LCEGPenalty.findAll({
      where: {
        YYYYMM: { [Sequelize.Op.in]: distinctPreviousMonths },
        userMasterID: { [Sequelize.Op.in]: allUserIds },
      },
    });

    // Build userMasterID -> [penalty records for that user's own previous month]
    const userLcegPenaltyMap = new Map();

    for (const record of lcegPenalty) {
      const userMasterID = +record.userMasterID;
      const userPreviousMonth = userPreviousMonthMap.get(userMasterID);

      if (+record.YYYYMM !== +userPreviousMonth) continue;

      if (!userLcegPenaltyMap.has(userMasterID)) {
        userLcegPenaltyMap.set(userMasterID, []);
      }
      userLcegPenaltyMap.get(userMasterID).push(record);
    }

    const allCompanyIds = [
      ...new Set(userMaster.map((e) => e.companyMasterId)),
    ];

    const AllCompanyHrleaveType = await HrLeaveType.findAll({
      where: {
        status: 1,
        companyMasterID: allCompanyIds,
      },
      include: [
        { model: HrLeaveMaster, as: 'LeaveMaster', attributes: ['LeaveName'] },
      ],
    });

    const generateQuarterlyDates = (startDate) => {
      const dates = [];
      const qtDate = new Date(startDate);

      for (let i = 0; i < 4; i++) {
        if (i > 0) qtDate.setMonth(qtDate.getMonth() + 3);
        dates.push(asiaKolkataDateTime(qtDate).slice(0, 10));
      }

      return dates;
    };

    const generateHalfYearlyDates = (startDate) => {
      const dates = [];
      const hfDate = new Date(startDate);

      for (let i = 0; i < 2; i++) {
        if (i > 0) hfDate.setMonth(hfDate.getMonth() + 6);
        dates.push(asiaKolkataDateTime(hfDate).slice(0, 10));
      }

      return dates;
    };

    // function to format the date as 'YYYYMM'
    const formatMonth = (date) => {
      return date.toISOString().slice(0, 4) + date.toISOString().slice(5, 7);
    };

    // loop through all employee leave policy
    for (const empLeavePolicy of AllEmployeeLeavePolicy) {
      console.log(
        'Processing employee leave policy:',
        empLeavePolicy.userMasterID,
      );

      const userMasterID = +empLeavePolicy.userMasterID;

      // Employee Data
      const userData = userMaster.find((e) => e.userMasterID == userMasterID);

      if (!userData) continue;

      const userPreviousMonth = userPreviousMonthMap.get(+userMasterID);
      const userCurrentMonth = moment(String(userPreviousMonth), 'YYYYMM')
        .add(1, 'month')
        .format('YYYYMM');
      const userAttnCal = userAttnCalMap.get(userMasterID) || [];
      const userAttPenalty = userLcegPenaltyMap.get(userMasterID) || [];
      userData.hrLeaveMonthlyTrans = userAttnCal;
      userData.lcegPenalties = userAttPenalty;

      const companyWiseLeaveType = AllCompanyHrleaveType.filter(
        (e) => e.companyMasterID == userData.companyMasterId,
      );
      // calculate attendance
      const attendancedataCal = await attendanceCalculation1(
        userData,
        userPreviousMonth,
        '',
        companyWiseLeaveType,
      );

      const unverifiedData = attendancedataCal.filter((e) => e.verified == 0);

      if (
        unverifiedData.length &&
        unverifiedData[0].user_leave &&
        unverifiedData[0].user_leave.length
      ) {
        const toAddData = [];
        const toAddLCEGPenaltyData = [];

        // for penalty

        for (const penalty of unverifiedData[0]?.penaltyArray || []) {
          toAddLCEGPenaltyData.push({
            userMasterID: unverifiedData[0].userMasterID,
            YYYYMM: +unverifiedData[0].yearMonth,
            penaltyType: penalty.penaltyType,
            penaltyValue: penalty.values,
            createBy: unverifiedData[0].userMasterID,
          });
        }

        for (let m = 0; m < unverifiedData[0].user_leave.length; m++) {
          toAddData.push({
            userMasterID: unverifiedData[0].userMasterID,
            LeaveTranId: unverifiedData[0].user_leave[m].leavetranid,
            AttnYearMon: unverifiedData[0].yearMonth,
            MonDays: unverifiedData[0].MonDays,
            MonWorkDays: unverifiedData[0].WorkingDays,
            AttnVal: unverifiedData[0].user_leave[m].values,
            monthstartdate: unverifiedData[0].start_date,
            monthenddate: unverifiedData[0].end_date,
            branchID: unverifiedData[0].branchid,
            departmentID: unverifiedData[0].departid,
            designationID: unverifiedData[0].desigid,
            createBy: unverifiedData[0].userMasterID,
          });
        }

        //delete data

        await sequelize.transaction(async (t) => {
          await HrLeaveMonthlyTrans.destroy({
            where: {
              userMasterID: unverifiedData[0].userMasterID,
              AttnYearMon: userPreviousMonth,
            },
            transaction: t,
          });

          await LCEGPenalty.destroy({
            where: {
              userMasterID: unverifiedData[0].userMasterID,
              YYYYMM: userPreviousMonth,
            },
            transaction: t,
          });

          await HrLeaveMonthlyTrans.bulkCreate(toAddData, { transaction: t });
          await LCEGPenalty.bulkCreate(toAddLCEGPenaltyData, {
            hooks: false,
            transaction: t,
          });
        });
      }

      // find employee employeement
      const empEmployeement =
        (userData.employeeEmployeements || []).sort(
          (a, b) => b.employeeEmployeementId - a.employeeEmployeementId,
        )?.[0] || null;

      if (!empEmployeement) continue;

      // find All employee leave policy of user
      const AllLeavePolicy = AllEmployeeLeavePolicyData.filter((e) =>
        [...empLeavePolicy.employeeLeavePolicyID].includes(e.id),
      );

      if (AllLeavePolicy.length === 0) continue;

      const AllLeaveIDS = AllLeavePolicy.map((e) => e.leaveId);
      // leave type which set in leave policy
      const hrleaveTypesData = companyWiseLeaveType.filter((e) =>
        [...AllLeaveIDS].includes(e.LeaveID),
      );

      for (const leavePolicy of AllLeavePolicy) {
        // check user employeement is present in leave policy or not
        const employeementPresent = leavePolicy.employementType.some(
          (d) => d === empEmployeement.employeement,
        );

        console.log(
          leavePolicy.leaveId,
          '------------------leavePolicy.leaveId-------------------',
        );

        if (!employeementPresent) continue;
        // find leave types
        const currentLeavetype = hrleaveTypesData.find(
          (e) => e.LeaveID == leavePolicy.leaveId,
        );

        if (!currentLeavetype) continue;

        // set startDate as default year
        let startDate = date.slice(0, 4) + '-' + '01' + '-' + '01';

        if (leavePolicy.leaveOperationalYear == 'April To March') {
          const dates = await getFinancialYearDatesFromDate(date);
          startDate = dates.startDate;
        }

        const temp_startDate =
          startDate.slice(0, 8) +
          String(leavePolicy.creditDate).padStart(2, '0');

        let addDataFlag = false;
        let leaveToAdd = +leavePolicy.yearlyLeave;

        // ---------------------------------- Earn Basis OR PRO RATA ----------------------------------------

        if (leavePolicy.leaveType == 'Earn basis') {
          const monthsCount =
            CREDIT_PERIOD_MONTHS[leavePolicy.creditPeriod] || 0;

          const Months_TO_findAttendance = getMonthsFromPreviousMonth(
            userPreviousMonth,
            monthsCount,
          );

          // find latest attendance data

          const EmployeeAttendance = await HrLeaveMonthlyTrans.findAll({
            raw: true,
            where: {
              userMasterID: empLeavePolicy.userMasterID,
              AttnYearMon: {
                [Op.in]: Months_TO_findAttendance,
              },
            },
            include: [{ model: HrLeaveType, attributes: [] }],
            attributes: [
              'userMasterID',
              'AttnVal',
              [Sequelize.col('hrLeaveType.LeaveID'), 'LeaveID'],
            ],
          });

          const totalDays = calculateTotalDays(EmployeeAttendance, leavePolicy);

          if (
            leavePolicy.earnedLeaveCreditType ==
            EarnedLeaveCreditType.MINIMUM_ATTENDANCE_PRORATA
          ) {
            leaveToAdd = (
              (totalDays * leaveToAdd) /
              leavePolicy.minDaysRequire
            ).toFixed(2);
          }

          // if minimum required days is greater than user present day
          if (
            +leavePolicy.minDaysRequire > +totalDays &&
            leavePolicy.earnedLeaveCreditType ==
              EarnedLeaveCreditType.MINIMUM_ATTENDANCE
          )
            continue;
        }

        let leaveMonth = userCurrentMonth;
        let toAddLeave_Date_Pre =
          String(date).slice(0, 8) +
          String(leavePolicy.creditDate).padStart(2, '0');

        if (leavePolicy.creditPeriod == 'Monthly') {
          if (
            new Date(toAddLeave_Date_Pre).getTime() == new Date(date).getTime()
          ) {
            if (leavePolicy.creditType == 'Post') {
              leaveMonth = userPreviousMonth;
              console.log(
                leaveMonth,
                '---------------------------------leaveMonth---------------------',
              );
            }

            if (leaveToAdd > 0) {
              finalDataToAddLeave.push({
                LeaveTranId: currentLeavetype.LeaveTranId,
                userMasterID: empLeavePolicy.userMasterID,
                YearMM: +leaveMonth,
                LeaveAddNew: leaveToAdd,
                createBy: empLeavePolicy.userMasterID,
              });
              addDataFlag = true;
            }
          }
        }

        if (leavePolicy.creditPeriod == 'Quarterly') {
          const allQuarterlyDates = generateQuarterlyDates(temp_startDate);
          // current date is present
          const datePresentOrNot = allQuarterlyDates.some((d) => d === date);
          if (!datePresentOrNot) addDataFlag = true;
        }

        if (leavePolicy.creditPeriod == 'Half Yearly') {
          const allHalfYearlyDates = generateHalfYearlyDates(temp_startDate);
          // current date is present
          const datePresentOrNot = allHalfYearlyDates.some((d) => d === date);

          if (!datePresentOrNot) addDataFlag = true;
        }

        if (leavePolicy.creditPeriod == 'Yearly') {
          if (temp_startDate != date) addDataFlag = true;
        }
        // -------------push leave to add data-----------------

        if (!addDataFlag && leaveToAdd > 0) {
          finalDataToAddLeave.push({
            LeaveTranId: currentLeavetype.LeaveTranId,
            userMasterID: empLeavePolicy.userMasterID,
            YearMM: +leaveMonth,
            LeaveAddNew: leaveToAdd,
            createBy: empLeavePolicy.userMasterID,
          });
        }

        // ----------------- Leave Encashment ----------------------

        const priority = leavePolicy.priority || [];

        if (!priority || (priority && !priority.length)) continue;

        // Employee Leave Balance

        const currentEmpLeaveBalanceData = await employeeeLeaveBalance(
          AllLeavePolicy[0].companyMasterId,
          empLeavePolicy.userMasterID,
          null,
          null,
          null,
          null,
          null,
          chekLeaveBalanceFromEnum.ADMIN,
        );

        const balanceData = currentEmpLeaveBalanceData.find(
          (e) => e.LeaveID == leavePolicy.leaveId,
        );

        const balance = balanceData ? balanceData.Balance : 0;

        const final_Priority_Balance = [];

        // if monthly set
        if (leavePolicy.monthly_CF_ENC_LPS) {
          if (
            new Date(toAddLeave_Date_Pre).getTime() == new Date(date).getTime()
          ) {
            const data = {
              isMonthly_CF: leavePolicy.isMonthly_CF,
              monthly_CF_limit: leavePolicy.monthly_CF_limit,
              isMonthly_ENC: leavePolicy.isMonthly_ENC,
              monthly_ENC_limit: leavePolicy.monthly_ENC_limit,
              isMonthly_LPS: leavePolicy.isMonthly_LPS,
              monthly_LPS_limit: leavePolicy.monthly_LPS_limit,
            };
            final_Priority_Balance.push(
              getPriorityWiseBalance(balance, data, priority, 'Monthly'),
            );
          }
        }

        // if quarterly set
        if (leavePolicy.quarterly_CF_ENC_LPS) {
          const allQuarterlyDates = generateQuarterlyDates(temp_startDate);
          // current date is present
          const datePresentOrNot = allQuarterlyDates.some((d) => d === date);

          if (datePresentOrNot) {
            const data = {
              isQuarterly_CF: leavePolicy.isQuarterly_CF,
              quarterly_CF_limit: leavePolicy.quarterly_CF_limit,
              isQuarterly_ENC: leavePolicy.isQuarterly_ENC,
              quarterly_ENC_limit: leavePolicy.quarterly_ENC_limit,
              isQuarterly_LPS: leavePolicy.isQuarterly_LPS,
              quarterly_LPS_limit: leavePolicy.quarterly_LPS_limit,
            };

            final_Priority_Balance.push(
              getPriorityWiseBalance(balance, data, priority, 'Quarterly'),
            );
          }
        }

        // if Half yearly
        if (leavePolicy.halfYearly_CF_ENC_LPS) {
          const allHalfYearlyDates = generateHalfYearlyDates(temp_startDate);
          // current date is present
          const datePresentOrNot = allHalfYearlyDates.some((d) => d === date);
          if (datePresentOrNot) {
            const data = {
              isHalfYearly_CF: leavePolicy.isHalfYearly_CF,
              halfYearly_CF_limit: leavePolicy.halfYearly_CF_limit,
              isHalfYearly_ENC: leavePolicy.isHalfYearly_ENC,
              halfYearly_ENC_limit: leavePolicy.halfYearly_ENC_limit,
              isHalfYearly_LPS: leavePolicy.isHalfYearly_LPS,
              halfYearly_LPS_limit: leavePolicy.halfYearly_LPS_limit,
            };

            final_Priority_Balance.push(
              getPriorityWiseBalance(balance, data, priority, 'HalfYearly'),
            );
          }
        }

        // if yearly
        if (leavePolicy.yearly_CF_ENC_LPS) {
          let yearlyDate = temp_startDate;

          if (yearlyDate == date) {
            const data = {
              isYearly_CF: leavePolicy.isYearly_CF,
              yearly_CF_limit: leavePolicy.yearly_CF_limit,
              isYearly_ENC: leavePolicy.isYearly_ENC,
              yearly_ENC_limit: leavePolicy.yearly_ENC_limit,
              isYearly_LPS: leavePolicy.isYearly_LPS,
              yearly_LPS_limit: leavePolicy.yearly_LPS_limit,
            };

            final_Priority_Balance.push(
              getPriorityWiseBalance(balance, data, priority, 'Yearly'),
            );
          }
        }

        const Total_encash = final_Priority_Balance.reduce(
          (acc, obj) => acc + +obj.encashment,
          0,
        );
        const Total_carryForward = final_Priority_Balance.reduce(
          (acc, obj) => acc + +obj.carryForward,
          0,
        );
        const Total_lapse = final_Priority_Balance.reduce(
          (acc, obj) => acc + +obj.lapse,
          0,
        );

        let currentBalance = balance;
        const leaveID = balanceData?.LeaveID || null;

        // Fetch COFF balance data for the given date
        let allCoffBalanceData =
          leaveID == 6
            ? await getCoffBalanceData(empLeavePolicy.userMasterID, date)
            : [];
        let usedLogTransactions = [];

        for (const type of priority) {
          if (type == 'encashment' && +Total_encash > 0) {
            const leave_To_encash =
              currentBalance >= +Total_encash ? +Total_encash : +currentBalance;
            currentBalance -= +leave_To_encash;
            // push encashment data
            if (+leave_To_encash > 0) {
              // only for coff
              if (allCoffBalanceData.length > 0) {
                // Consume leave balance from available transactions
                const { allBalanceData, usedTransactionLog } =
                  consumeLeaveBalance(
                    allCoffBalanceData,
                    leave_To_encash,
                    date,
                    CoffUsedTypeEnum.ENCASH,
                  );

                allCoffBalanceData = [...allBalanceData];

                usedLogTransactions = [
                  ...usedLogTransactions,
                  ...usedTransactionLog,
                ];
              }

              finalDataToEncashment.push({
                LeaveTranId: currentLeavetype.LeaveTranId,
                userMasterID: empLeavePolicy.userMasterID,
                YYYYMM: getPreviousMonth(leaveMonth),
                days: +leave_To_encash,
                createBy: empLeavePolicy.userMasterID,
              });
            }
          }
          // lapse data
          if (type == 'lapse' && +Total_lapse > 0) {
            const leave_To_lapse =
              currentBalance >= +Total_lapse ? +Total_lapse : +currentBalance;
            currentBalance -= +leave_To_lapse;

            if (leave_To_lapse > 0) {
              // only for coff
              if (allCoffBalanceData.length > 0) {
                // Consume leave balance from available transactions
                const { allBalanceData, usedTransactionLog } =
                  consumeLeaveBalance(
                    allCoffBalanceData,
                    leave_To_lapse,
                    date,
                    CoffUsedTypeEnum.LAPSE,
                  );

                allCoffBalanceData = [...allBalanceData];

                usedLogTransactions = [
                  ...usedLogTransactions,
                  ...usedTransactionLog,
                ];
              }

              finalDataToLapse.push({
                LeaveTranId: currentLeavetype.LeaveTranId,
                userMasterID: empLeavePolicy.userMasterID,
                LapseYearMonth: leaveMonth,
                LapseDays: +leave_To_lapse,
                createBy: empLeavePolicy.userMasterID,
                status: 1,
              });
            }
          }

          // carryfoward data
          if (type == 'carryForward' && +Total_carryForward > 0) {
            const leave_To_CF =
              currentBalance >= +Total_carryForward
                ? +Total_carryForward
                : +currentBalance;
            currentBalance -= +leave_To_CF;
          }
        }

        finalCoffBalanceData = [...finalCoffBalanceData, ...allCoffBalanceData];
        finalCoffUsedTransaction = [
          ...finalCoffUsedTransaction,
          ...usedLogTransactions,
        ].map((e) => {
          return {
            ...e,
            createBy: empLeavePolicy.userMasterID,
          };
        });

        console.log('loop ends here-----------------------------------------');
      }
    }

    // add usedcoffTransaction
    const chunks = chunkArray(finalCoffUsedTransaction, 1000);

    console.log('insertion start---------------------------');

    for (const chunk of chunks) {
      await UsedCoffTransaction.bulkCreate(chunk, { hooks: false });
    }

    // update HrleaveBalance of coff

    await Promise.all(
      finalCoffBalanceData.map((e) =>
        HrLeaveBalance.update(
          {
            availBal: e.availBal,
          },
          {
            where: {
              LeaveBalTranId: e.LeaveBalTranId,
            },
          },
        ),
      ),
    );

    console.log('insertion start 1---------------------------');

    // add data in chunks
    await bulkInsertInChunks(LeaveEncashment, finalDataToEncashment, 1000);
    await bulkInsertInChunks(UserLeaveLapse, finalDataToLapse, 1000);
    await bulkInsertInChunks(HrLeaveBalance, finalDataToAddLeave, 1000);

    console.log('Leave cron finished----------------------');

    const duration = (Date.now() - startTime) / 1000;
    accessLogStream.write(
      `${new Date().toISOString()} ===> Leave Cron Finished | Duration: ${duration}s\n`,
    );

    if (currentDate) {
      return res.status(200).json({
        status: 200,
        message: usermessage.addMessage('Leave Balance'),
      });
    }

    return;
  } catch (error) {
    accessLogStream.write(
      `${new Date().toISOString()} ===> ERROR: ${error?.stack}\n`,
    );
    next(error);
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
    const order = [['leavePolicyName', 'ASC']];

    /* ================= QUERY ================= */
    const policies = await EmployeeLeavePolicy.findAll({
      where: {
        companyMasterId: companyMasterID,
        [Sequelize.Op.and]: [
          /* ============== BRANCH ================= */
          sequelize.literal(`
            (
              "employeeLeavePolicy"."branch_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "employeeLeavePolicyBranches" apb
                WHERE apb."employeeLeavePolicyID" =
                      "employeeLeavePolicy"."id"
                AND apb."deletedAt" IS NULL
                AND apb."branchMasterID" = :branchMasterID
                AND "employeeLeavePolicy"."deletedAt" IS NULL
              )
            )
          `),

          /* ============== DEPARTMENT ================= */
          sequelize.literal(`
            (
              "employeeLeavePolicy"."department_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "employeeLeavePolicyDepartments" apd
                WHERE apd."employeeLeavePolicyID" =
                      "employeeLeavePolicy"."id"
                AND apd."deletedAt" IS NULL
                AND apd."departmentId" = :departmentId
                AND "employeeLeavePolicy"."deletedAt" IS NULL
              )
            )
          `),

          /* ============== DESIGNATION ================= */
          sequelize.literal(`
            (
              "employeeLeavePolicy"."designation_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "employeeLeavePolicyDesignations" apg
                WHERE apg."employeeLeavePolicyID" =
                      "employeeLeavePolicy"."id"
                AND apg."deletedAt" IS NULL
                AND apg."designationId" = :designationId
                AND "employeeLeavePolicy"."deletedAt" IS NULL
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
        'leavePolicyName',
        'branch_scope',
        'department_scope',
        'designation_scope',
        'companyMasterId',
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
