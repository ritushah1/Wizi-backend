const Sequelize = require('sequelize');
const LateEarlyPolicy = require('../models/lateEarlyPolicy');
const logger = require('../config/logger');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const companyMaster = require('../models/companyMaster');
const EmployeeLateEarlyPolicy = require('../models/employeeLateEarlyPolicy');
const UserMaster = require('../models/userMaster');
const { userAttributes } = require('../utils/commonVars');
const {
  PenaltyDeductFromEnum,
  policyScope,
  LCEGPolicyTypeEnum,
  excelDataShow,
  excelMsgForDeductionType,
} = require('../utils/dbUtils');
const LCEGPolicyBranch = require('../models/lcegPolicyBranch');
const LCEGPolicyDepartment = require('../models/lcegPolicyDepartment');
const LCEGPolicyDesignation = require('../models/lcegPolicyDesignation');

const {
  getUniqueSheetName,
  capitalize,
  policy_Scope,
  bulkCreatePolicyScope,
} = require('../utils/commonUtilFunctions');
const Excel = require('exceljs');
const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const Designation = require('../models/designation');
exports.postAddLateEarlyPolicy = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      companyMasterID,
      lateEarlyPolicyName,
      lateEarlyPolicyType,
      latedeductionfrom,
      latedeductioncycle,
      latedeductioncategory,
      latenoof,
      latemaxminute,
      latedeductiontype,
      latevalue,
      graceInTime,
      earlydeductionfrom,
      earlydeductioncycle,
      earlydeductioncategory,
      earlynoof,
      earlymaxminute,
      earlydeductiontype,
      earlyvalue,
      combineddeductionfrom,
      combineddeductioncycle,
      combineddeductioncategory,
      combinednoof,
      combinedmaxminute,
      combineddeductiontype,
      combinedvalue,
      lateRecurring,
      earlyRecurring,
      combinedRecurring,
      onWorkingHours,
      combinedSlab1,
      combinedSlab2,
      combineddeductionfrom1,
      combineddeductionfrom2,
      combineddeductiontype1,
      combineddeductiontype2,
      combinedvalue1,
      combinedvalue2,
      combinedmaxminute1,
      combinedmaxminute2,
      lateComeSlab1,
      lateComeSlab2,
      latedeductionfrom1,
      latedeductionfrom2,
      latedeductiontype1,
      latedeductiontype2,
      latevalue1,
      latevalue2,
      latemaxminute1,
      latemaxminute2,
      earlyGoSlab1,
      earlyGoSlab2,
      earlydeductionfrom1,
      earlydeductionfrom2,
      earlydeductiontype1,
      earlydeductiontype2,
      earlyvalue1,
      earlyvalue2,
      earlymaxminute1,
      earlymaxminute2,
      deductFrom,
      earlyGraceTime,
      cmbGraceInPenalty,
      lcGraceInPenalty,
      egGraceInPenalty,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
    } = await req.body;

    // return null;
    const find_SameData = await LateEarlyPolicy.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('lateEarlyPolicyName')),
          ),
          lateEarlyPolicyName.trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1),
        ),
      ),
      transaction,
    });

    if (find_SameData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: `Policy name '${lateEarlyPolicyName}' already exists. Please choose another.`,
      });
    }

    const inserDatedData = await LateEarlyPolicy.create(
      {
        companyMasterID,
        lateEarlyPolicyName,
        lateEarlyPolicyType,
        latedeductionfrom,
        latedeductioncycle,
        latedeductioncategory,
        latenoof,
        latemaxminute,
        latedeductiontype,
        latevalue,
        graceInTime,
        earlydeductionfrom,
        earlydeductioncycle,
        earlydeductioncategory,
        earlynoof,
        earlymaxminute,
        earlydeductiontype,
        earlyvalue,
        combineddeductionfrom,
        combineddeductioncycle,
        combineddeductioncategory,
        combinednoof,
        combinedmaxminute,
        combineddeductiontype,
        combinedvalue,
        lateRecurring,
        earlyRecurring,
        combinedRecurring,
        onWorkingHours,
        combinedSlab1,
        combinedSlab2,
        combineddeductionfrom1,
        combineddeductionfrom2,
        combineddeductiontype1,
        combineddeductiontype2,
        combinedvalue1,
        combinedvalue2,
        combinedmaxminute1,
        combinedmaxminute2,
        lateComeSlab1,
        lateComeSlab2,
        latedeductionfrom1,
        latedeductionfrom2,
        latedeductiontype1,
        latedeductiontype2,
        latevalue1,
        latevalue2,
        latemaxminute1,
        latemaxminute2,
        earlyGoSlab1,
        earlyGoSlab2,
        earlydeductionfrom1,
        earlydeductionfrom2,
        earlydeductiontype1,
        earlydeductiontype2,
        earlyvalue1,
        earlyvalue2,
        earlymaxminute1,
        earlymaxminute2,
        deductFrom,
        earlyGraceTime,
        cmbGraceInPenalty,
        lcGraceInPenalty,
        egGraceInPenalty,
        cmbGraceInPenalty,
        lcGraceInPenalty,
        egGraceInPenalty,
        branch_scope,
        department_scope,
        designation_scope,
      },
      { user: req.userDetails, transaction },
    );
    const lcegPolicyID = inserDatedData.lateEarlyPolicyMasterID;

    await bulkCreatePolicyScope({
      scope: branch_scope,
      selectedScope: policyScope.SELECTED,
      ids: branch_scope_IDs,
      model: LCEGPolicyBranch,
      policyIdKey: 'lcegPolicyID',
      scopeIdKey: 'branchMasterID',
      policyId: lcegPolicyID,
      req,
      transaction,
    });

    await bulkCreatePolicyScope({
      scope: department_scope,
      selectedScope: policyScope.SELECTED,
      ids: department_scope_IDs,
      model: LCEGPolicyDepartment,
      policyIdKey: 'lcegPolicyID',
      scopeIdKey: 'departmentId',
      policyId: lcegPolicyID,
      req,
      transaction,
    });

    await bulkCreatePolicyScope({
      scope: designation_scope,
      selectedScope: policyScope.SELECTED,
      ids: designation_scope_IDs,
      model: LCEGPolicyDesignation,
      policyIdKey: 'lcegPolicyID',
      scopeIdKey: 'designationId',
      policyId: lcegPolicyID,
      req,
      transaction,
    });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('LateCome EarlyGo Policy'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getLateEarlyPolicyById = async (req, res, next) => {
  try {
    const getLateEarlyPolicy = await LateEarlyPolicy.findOne({
      where: {
        lateEarlyPolicyMasterID: req.params.id,
      },
      include: [
        {
          model: LCEGPolicyBranch,
          as: 'lceg_branch',
          attributes: ['branchMasterID'],
          include: [
            {
              model:BranchMaster,
              attributes:['branchName']
            } 
          ],
        },
        {
          model: LCEGPolicyDepartment,
          as: 'lceg_dept',
          attributes: ['departmentId'],
          include: [
            {
              model: Department,
              attributes: ['departmentName'],
            },
          ],
        },
        {
          model: LCEGPolicyDesignation,
          as: 'lceg_design',
          attributes: ['designationId'],
          include:[
            {
              model:Designation,
              attributes:['designationName']
            }
          ]
        },
      ],
    });

    return res.status(200).json({ status: 200, data: getLateEarlyPolicy });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateLateEarlyPolicy = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      lateEarlyPolicyMasterID,
      companyMasterID,
      lateEarlyPolicyName,
      lateEarlyPolicyType,
      latedeductionfrom,
      latedeductioncycle,
      latedeductioncategory,
      latenoof,
      latemaxminute,
      latedeductiontype,
      latevalue,
      graceInTime,
      earlydeductionfrom,
      earlydeductioncycle,
      earlydeductioncategory,
      earlynoof,
      earlymaxminute,
      earlydeductiontype,
      earlyvalue,
      combineddeductionfrom,
      combineddeductioncycle,
      combineddeductioncategory,
      combinednoof,
      combinedmaxminute,
      combineddeductiontype,
      combinedvalue,
      lateRecurring,
      earlyRecurring,
      combinedRecurring,
      onWorkingHours,
      combinedSlab1,
      combinedSlab2,
      combineddeductionfrom1,
      combineddeductionfrom2,
      combineddeductiontype1,
      combineddeductiontype2,
      combinedvalue1,
      combinedvalue2,
      combinedmaxminute1,
      combinedmaxminute2,
      lateComeSlab1,
      lateComeSlab2,
      latedeductionfrom1,
      latedeductionfrom2,
      latedeductiontype1,
      latedeductiontype2,
      latevalue1,
      latevalue2,
      latemaxminute1,
      latemaxminute2,
      earlyGoSlab1,
      earlyGoSlab2,
      earlydeductionfrom1,
      earlydeductionfrom2,
      earlydeductiontype1,
      earlydeductiontype2,
      earlyvalue1,
      earlyvalue2,
      earlymaxminute1,
      earlymaxminute2,
      deductFrom,
      earlyGraceTime,
      cmbGraceInPenalty,
      lcGraceInPenalty,
      egGraceInPenalty,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
    } = await req.body;

    const find_SameData = await LateEarlyPolicy.findOne({
      where: Sequelize.and(
        Sequelize.where(
          sequelize.fn(
            'TRIM',
            sequelize.fn('LOWER', sequelize.col('lateEarlyPolicyName')),
          ),
          lateEarlyPolicyName.trim().toLowerCase(),
        ),
        Sequelize.where(sequelize.col('companyMasterID'), companyMasterID),
        Sequelize.or(
          Sequelize.where(sequelize.col('status'), 0),
          Sequelize.where(sequelize.col('status'), 1),
        ),
        Sequelize.where(sequelize.col('lateEarlyPolicyMasterID'), {
          [Sequelize.Op.ne]: lateEarlyPolicyMasterID,
        }),
      ),
      transaction,
    });

    if (find_SameData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: `Policy name '${lateEarlyPolicyName}' already exists. Please choose another.`,
      });
    }

    await LateEarlyPolicy.update(
      {
        companyMasterID,
        lateEarlyPolicyName,
        lateEarlyPolicyType,
        latedeductionfrom,
        latedeductioncycle,
        latedeductioncategory,
        latenoof,
        latemaxminute,
        latedeductiontype,
        latevalue,
        graceInTime,
        earlydeductionfrom,
        earlydeductioncycle,
        earlydeductioncategory,
        earlynoof,
        earlymaxminute,
        earlydeductiontype,
        earlyvalue,
        combineddeductionfrom,
        combineddeductioncycle,
        combineddeductioncategory,
        combinednoof,
        combinedmaxminute,
        combineddeductiontype,
        combinedvalue,
        lateRecurring,
        earlyRecurring,
        combinedRecurring,
        onWorkingHours,
        combinedSlab1,
        combinedSlab2,
        combineddeductionfrom1,
        combineddeductionfrom2,
        combineddeductiontype1,
        combineddeductiontype2,
        combinedvalue1,
        combinedvalue2,
        combinedmaxminute1,
        combinedmaxminute2,
        lateComeSlab1,
        lateComeSlab2,
        latedeductionfrom1,
        latedeductionfrom2,
        latedeductiontype1,
        latedeductiontype2,
        latevalue1,
        latevalue2,
        latemaxminute1,
        latemaxminute2,
        earlyGoSlab1,
        earlyGoSlab2,
        earlydeductionfrom1,
        earlydeductionfrom2,
        earlydeductiontype1,
        earlydeductiontype2,
        earlyvalue1,
        earlyvalue2,
        earlymaxminute1,
        earlymaxminute2,
        deductFrom,
        earlyGraceTime,
        cmbGraceInPenalty,
        lcGraceInPenalty,
        egGraceInPenalty,
        branch_scope,
        department_scope,
        designation_scope,
      },
      {
        where: { lateEarlyPolicyMasterID: lateEarlyPolicyMasterID },
        user: req.userDetails,
        individualHooks: true,
        transaction,
      },
    );

    await policy_Scope({
      model: LCEGPolicyBranch,
      primaryKey: { lcegPolicyID: lateEarlyPolicyMasterID },
      column: 'branchMasterID',
      newIDs: branch_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: LCEGPolicyDepartment,
      primaryKey: { lcegPolicyID: lateEarlyPolicyMasterID },
      column: 'departmentId',
      newIDs: department_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: LCEGPolicyDesignation,
      primaryKey: { lcegPolicyID: lateEarlyPolicyMasterID },
      column: 'designationId',
      newIDs: designation_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('LateCome EarlyGo Policy'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postStatusChangeLateEarlyPolicyById = async (req, res, next) => {
  try {
    const { lateEarlyPolicyMasterID, status } = await req.body;

    if (status != 1) {
      const assignData = await EmployeeLateEarlyPolicy.findOne({
        where: {
          lateEarlyPolicyMasterID,
          status: 1,
        },
        include: [
          {
            required: true,
            model: UserMaster,
            as: 'employee',
            where: {
              status: [0, 1],
            },
          },
        ],
      });

      if (assignData)
        return res.status(200).json({
          status: 401,
          message: message.usermessage.alreadyAssign(
            'LateCome EarlyGo Policy',
            'deactivate',
          ),
        });
    }

    await LateEarlyPolicy.update(
      {
        status: status,
      },
      {
        where: { lateEarlyPolicyMasterID: lateEarlyPolicyMasterID },
        user: req.userDetails,
        individualHooks: true,
      },
    );

    const message1 =
      status == 1
        ? message.usermessage.activeMessage('LateCome EarlyGo Policy')
        : message.usermessage.deleteMessage('LateCome EarlyGo Policy');

    return res.status(200).json({
      status: 200,
      message: message1,
    });
  } catch (err) {
    next(err);
  }
};

exports.listLateEarlyPolicy = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      companyMasterID,
      status,
      searchQuery,
      exportData = false,
    } = req.body;

    const condition = {};

    if (companyMasterID) condition.companyMasterID = companyMasterID;
    if (status) condition.status = status;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        { lateEarlyPolicyName: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
      ];

    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['createdAt', 'DESC']];

    const Policy = await LateEarlyPolicy.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: companyMaster,
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
        {
          model: LCEGPolicyBranch,
          as: 'lceg_branch',
          include: [
            {
              model: BranchMaster,
              attributes: ['branchName'],
            },
          ],
        },
        {
          model: LCEGPolicyDepartment,
          as: 'lceg_dept',
          include: [
            {
              model: Department,
              attributes: ['departmentName'],
            },
          ],
        },
        {
          model: LCEGPolicyDesignation,
          as: 'lceg_design',
          include: [
            {
              model: Designation,
              attributes: ['designationName'],
            },
          ],
        },
      ],
    });

    if (exportData) {
      const workbook = new Excel.Workbook();
      let counter = 1;
      for (const policy of Policy.rows) {
        const uniqueSheetName = getUniqueSheetName(
          workbook,
          policy.lateEarlyPolicyName || 'Late_Come_Early_Go_Policy',
          counter,
        );

        const worksheet = workbook.addWorksheet(uniqueSheetName);
        const companyRow = worksheet.addRow([
          'Company Name',
          policy?.companyMaster.companyName,
        ]);
        companyRow.getCell(1).font = { bold: true };
        const policyTypeRow = worksheet.addRow([
          'Policy Type',
          excelDataShow[policy?.lateEarlyPolicyType],
        ]);
        policyTypeRow.getCell(1).font = { bold: true };
        const policyNameRow = worksheet.addRow([
          'LateCome EarlyGo Policy Name',
          policy?.lateEarlyPolicyName,
        ]);
        policyNameRow.getCell(1).font = { bold: true };
        worksheet.addRow([]);
        if (policy.branch_scope == 'selected') {
          const selectedBranch = policy.lceg_branch
            .map((item) => item?.branchMaster?.branchName)
            .join(',');
          worksheet.addRow([
            'Policy Applicable To',
            capitalize(policy.branch_scope) + ' Branches',
            selectedBranch,
          ]);
        } else {
          worksheet.addRow(['Policy Applicable To', `Company's All Branches`]);
        }
        if (policy.department_scope == 'selected') {
          const selectedDepartment = policy.lceg_dept
            .map((item) => item?.department?.departmentName)
            .join(',');
          worksheet.addRow([
            'Policy Applicable To',
            capitalize(policy.department_scope) + ' Department',
            selectedDepartment,
          ]);
        } else {
          worksheet.addRow([
            'Policy Applicable To',
            `Company's All Departments`,
          ]);
        }
        if (policy.designation_scope == 'selected') {
          const selectedDesig = policy.lceg_design
            .map((item) => item?.designation?.designationName)
            .join(',');
          worksheet.addRow([
            'Policy Applicable To',
            capitalize(policy.designation_scope) + ' Designation',
            selectedDesig,
          ]);
        } else {
          worksheet.addRow([
            'Policy Applicable To',
            `Company's All Designations`,
          ]);
        }
        worksheet.addRow([]);

        if (policy.lateEarlyPolicyType == LCEGPolicyTypeEnum.COMBINED) {
          const headerRow = worksheet.addRow([
            'Late Come Early Go',
            'Combined',
          ]);
          worksheet.addRow([
            'Grace Time (For Late Coming)',
            policy.graceInTime,
          ]);
          worksheet.addRow([
            'Grace Time (For Early Go)',
            policy.earlyGraceTime,
          ]);
          worksheet.addRow([
            'Deduction category',
            capitalize(policy.combineddeductioncategory),
          ]);
          const minCountSlot = policy?.combineddeductioncategory
            ?.toString()
            ?.split('wise');
          worksheet.addRow([
            `No of ${minCountSlot?.[0]} allowed`,
            policy.combinednoof,
          ]);
          if (!(policy.combineddeductioncategory == 'slotwise')) {
            worksheet.addRow([
              'Deduction from',
              capitalize(policy.combineddeductionfrom),
            ]);
          }
          if (!(policy.combineddeductioncategory == 'countwise')) {
            worksheet.addRow([
              'Deduction cycle ',
              capitalize(policy.combineddeductioncycle),
            ]);
          }
          if (!(policy.combineddeductioncategory == 'minutewise')) {
            worksheet.addRow([
              'Max (Late Coming or Early Going) Minutes allowed ',
              policy.combinedmaxminute,
            ]);
          }
          worksheet.addRow([
            'Deduction Type',
            excelMsgForDeductionType[policy.combineddeductiontype],
          ]);
          if (policy.combineddeductiontype == 'day') {
            worksheet.addRow(['Day', capitalize(policy.combinedvalue)]);
          }
          if (policy.combineddeductiontype == 'perminute') {
            worksheet.addRow(['Gross Divide by Minutes', policy.combinedvalue]);
            if (policy.combineddeductioncategory == 'minutewise') {
              worksheet.addRow([
                'Include grace minutes in penalty',
                policy.cmbGraceInPenalty == true ? 'Yes' : 'No',
              ]);
            }
          }
          if (policy.combineddeductiontype == 'fixamount') {
            const str =
              policy.combineddeductioncategory == 'minutewise'
                ? '(Per Minute)'
                : '';
            worksheet.addRow([
              `Amount ${str}`,
              capitalize(policy.combinedvalue),
            ]);
            if (policy.combineddeductioncategory == 'minutewise') {
              worksheet.addRow([
                'Include grace minutes in penalty',
                policy.cmbGraceInPenalty == true ? 'Yes' : 'No',
              ]);
            }
          }
          if (
            policy.combineddeductiontype == 'percent' ||
            policy.combineddeductiontype == 'monthlypercent'
          ) {
            worksheet.addRow([`Percentage `, capitalize(policy.combinedvalue)]);
          }
          if (policy.combineddeductiontype == 'min') {
            worksheet.addRow(['Minute', policy.combinedvalue]);
          }
          if (
            !(policy.combineddeductioncategory == 'minutewise') ||
            !(policy.combineddeductioncycle == 'monthwise')
          ) {
            worksheet.addRow([
              'Set Recurring',
              policy.combinedRecurring == true ? 'Yes' : 'No',
            ]);
          }

          if (policy.combinedSlab1) {
            worksheet.addRow([
              'Combined Slab - 1 ',
              'Deduction from',
              capitalize(policy.combineddeductionfrom1),
            ]);
            worksheet.addRow([
              '',
              'Max (Late Coming or Early Going) Minutes allowed ',
              policy.combinedmaxminute1,
            ]);
            worksheet.addRow([
              '',
              'Deduction Type',
              excelMsgForDeductionType[policy.combineddeductiontype1],
            ]);
            worksheet.addRow([
              '',
              excelMsgForDeductionType[policy.combineddeductiontype1],
              policy.combinedvalue1,
            ]);
          }
          if (policy.combinedSlab2) {
            worksheet.addRow([
              'Combined Slab - 2 ',
              'Deduction from',
              capitalize(policy.combineddeductionfrom2),
            ]);
            worksheet.addRow([
              '',
              'Max Late Coming Minutes allowed ',
              policy.combinedmaxminute2,
            ]);
            worksheet.addRow([
              '',
              'Deduction Type',
              excelMsgForDeductionType[policy.combineddeductiontype2],
            ]);
            worksheet.addRow([
              '',
              excelMsgForDeductionType[policy.combineddeductiontype2],
              policy.combinedvalue2,
            ]);
          }
        } else if (
          policy.lateEarlyPolicyType == LCEGPolicyTypeEnum.LC_SHIFT_WISE
        ) {
          const headerRow = worksheet.addRow([
            'Late Come With ',
            'Respect To Shift',
          ]);
          worksheet.addRow([
            'Grace Time (For Late Coming)',
            policy.graceInTime,
          ]);
          worksheet.addRow([
            'Deduction category',
            capitalize(policy.latedeductioncategory),
          ]);

          worksheet.addRow([`No of count allowed`, policy.latenoof]);
          worksheet.addRow(['Deduction from', policy.latedeductionfrom]);

          // worksheet.addRow([
          //   'Max (Late Coming or Early Going) Minutes allowed ',
          //   policy.latemaxminute,
          // ]);
          if (!(policy.latedeductioncategory == 'minutewise')) {
            worksheet.addRow([
              'Max Late Coming Minutes allowed ',
              policy.latemaxminute,
            ]);
          }

          // worksheet.addRow([
          //   'Deduction Type',
          //   capitalize(policy.latedeductiontype),
          // ]);
          // worksheet.addRow([
          //   capitalize(policy.latedeductiontype),
          //   policy.latevalue,
          // ]);
          // worksheet.addRow([
          //   'Set Recurring',
          //   policy.lateRecurring == true ? 'Yes' : 'No',
          // ]);
          if (policy.latedeductioncategory == 'minutewise') {
            worksheet.addRow(['Deduction Cycle', 'Month Wise']);
          }
          worksheet.addRow([
            'Deduction Type',
            excelMsgForDeductionType[policy.latedeductiontype],
          ]);

          if (policy.latedeductiontype == 'day') {
            worksheet.addRow(['Day', capitalize(policy.latevalue)]);
          }
          if (policy.latedeductiontype == 'perminute') {
            worksheet.addRow([
              'Gross Divide by Minutes',
              excelMsgForDeductionType[policy.latedeductiontype],
            ]);
            if (policy.latedeductioncategory == 'minutewise') {
              worksheet.addRow([
                'Include grace minutes in penalty',
                policy.cmbGraceInPenalty == true ? 'Yes' : 'No',
              ]);
            }
          }
          if (policy.latedeductiontype == 'fixamount') {
            const str =
              policy.latedeductioncategory == 'minutewise'
                ? '(Per Minute)'
                : '';
            worksheet.addRow([`Amount ${str}`, capitalize(policy.latevalue)]);
            if (policy.latedeductioncategory == 'minutewise') {
              worksheet.addRow([
                'Include grace minutes in penalty',
                policy.cmbGraceInPenalty == true ? 'Yes' : 'No',
              ]);
            }
          }
          if (
            policy.latedeductiontype == 'percent' ||
            policy.latedeductiontype == 'monthlypercent'
          ) {
            worksheet.addRow([`Percentage `, capitalize(policy.latevalue)]);
          }
          if (policy.latedeductiontype == 'min') {
            worksheet.addRow(['Minute', policy.latevalue]);
          }
          if (
            !(policy.latedeductioncategory == 'minutewise') ||
            !(policy.latedeductioncycle == 'monthwise')
          ) {
            worksheet.addRow([
              'Set Recurring',
              policy.lateRecurring == true ? 'Yes' : 'No',
            ]);
          }

          if (
            policy.lateComeSlab1 &&
            policy.latedeductioncategory == 'countwise'
          ) {
            worksheet.addRow([
              'Combined Slab - 1 ',
              'Deduction from',
              capitalize(policy.latedeductionfrom1),
            ]);
            worksheet.addRow([
              '',
              'Max Late Coming Minutes allowed ',
              policy.latemaxminute1,
            ]);
            worksheet.addRow([
              '',
              'Deduction Type',
              excelMsgForDeductionType[policy.latedeductiontype1],
            ]);
            if (
              policy.latedeductiontype1 == 'fixamount' ||
              policy.latedeductiontype1 == 'percent'
            ) {
              worksheet.addRow([
                '',
                policy.latedeductiontype1 == 'fixamount'
                  ? 'Amount'
                  : 'Percentage',
                policy.latevalue1,
              ]);
            }
            if (
              policy.latedeductiontype1 == 'day' ||
              policy.latedeductiontype1 == 'min'
            ) {
              worksheet.addRow([
                '',
                policy.latedeductiontype1 == 'min' ? 'Minute' : 'Day',
                policy.latevalue1,
              ]);
            }
          }
          if (
            policy.lateComeSlab2 &&
            policy.latedeductioncategory == 'countwise'
          ) {
            worksheet.addRow([
              'Combined Slab - 2 ',
              'Deduction from',
              capitalize(policy.latedeductionfrom2),
            ]);
            worksheet.addRow([
              '',
              'Max Late Coming Minutes allowed ',
              policy.latemaxminute2,
            ]);
            worksheet.addRow([
              '',
              'Deduction Type',
              excelMsgForDeductionType[policy.latedeductiontype2],
            ]);
            if (
              policy.latedeductiontype2 == 'fixamount' ||
              policy.latedeductiontype2 == 'percent'
            ) {
              worksheet.addRow([
                '',
                policy.latedeductiontype2 == 'fixamount'
                  ? 'Amount'
                  : 'Percentage',
                policy.latevalue2,
              ]);
            }
            if (
              policy.latedeductiontype2 == 'day' ||
              policy.latedeductiontype2 == 'min'
            ) {
              worksheet.addRow([
                '',
                policy.latedeductiontype2 == 'min' ? 'Minute' : 'Day',
                policy.latevalue2,
              ]);
            }
          }
        } else if (policy.lateEarlyPolicyType == LCEGPolicyTypeEnum.SEPERATED) {
          if (policy.latedeductionfrom) {
            const headerRow = worksheet.addRow(['Late Come']);
            worksheet.addRow(['Grace In Time', policy.graceInTime]);
            worksheet.addRow([
              'Deduction category',
              capitalize(policy.latedeductioncategory),
            ]);
            const minCountSlot = policy?.latedeductioncategory
              ?.toString()
              ?.split('wise');
            worksheet.addRow([
              `No of ${minCountSlot?.[0]} allowed`,
              policy.latenoof,
            ]);
            if (!(policy.latedeductioncategory == 'slotwise')) {
              worksheet.addRow([
                'Deduction from',
                capitalize(policy.latedeductionfrom),
              ]);
            }
            if (!(policy.latedeductioncategory == 'countwise')) {
              worksheet.addRow([
                'Deduction cycle ',
                capitalize(policy.latedeductioncycle),
              ]);
            }
            if (!(policy.latedeductioncategory == 'minutewise')) {
              worksheet.addRow([
                'Max Late Coming Minutes allowed ',
                policy.latemaxminute,
              ]);
            }
            worksheet.addRow([
              'Deduction Type',
              excelMsgForDeductionType[policy.latedeductiontype],
            ]);
            worksheet.addRow([
              excelMsgForDeductionType[policy.latedeductiontype],
              policy.latevalue,
            ]);
            if (!(policy.latedeductioncategory == 'minutewise')) {
              worksheet.addRow([
                'Set Recurring',
                policy.lateRecurring == true ? 'Yes' : 'No',
              ]);
            }
            if (
              policy.lateComeSlab1 &&
              policy.latedeductioncategory == 'countwise'
            ) {
              worksheet.addRow([
                'Late Come Slab - 1 ',
                'Deduction from',
                capitalize(policy.latedeductionfrom1),
              ]);
              worksheet.addRow([
                '',
                'Max Late Coming Minutes allowed ',
                policy.latemaxminute1,
              ]);
              worksheet.addRow([
                '',
                'Deduction Type',
                excelMsgForDeductionType[policy.latedeductiontype1],
              ]);
              worksheet.addRow([
                '',
                excelMsgForDeductionType[policy.latedeductiontype1],
                policy.latevalue1,
              ]);
            }
            if (
              policy.lateComeSlab2 &&
              policy.latedeductioncategory == 'countwise'
            ) {
              worksheet.addRow([
                'Late Come Slab - 2 ',
                'Deduction from',
                capitalize(policy.latedeductionfrom2),
              ]);
              worksheet.addRow([
                '',
                'Max Late Coming  Minutes allowed ',
                policy.latemaxminute2,
              ]);
              worksheet.addRow([
                '',
                'Deduction Type',
                excelMsgForDeductionType[policy.latedeductiontype2],
              ]);
              worksheet.addRow([
                '',
                excelMsgForDeductionType[policy.latedeductiontype2],
                policy.latevalue2,
              ]);
            }
          }
          if (policy.earlydeductionfrom) {
            worksheet.addRow([]);
            worksheet.addRow(['Early Go']);
            worksheet.addRow([
              'Grace Time (For Early Go)',
              policy.earlyGraceTime,
            ]);
            worksheet.addRow([
              'Deduction category',
              capitalize(policy.earlydeductioncategory),
            ]);
            const minCountSlot = policy?.earlydeductioncategory
              ?.toString()
              ?.split('wise');
            worksheet.addRow([
              `No of ${minCountSlot?.[0]} allowed`,
              policy.earlynoof,
            ]);
            if (!(policy.earlydeductioncategory == 'slotwise')) {
              worksheet.addRow([
                'Deduction from',
                capitalize(policy.earlydeductionfrom),
              ]);
            }
            if (!(policy.earlydeductioncategory == 'countwise')) {
              worksheet.addRow([
                'Deduction cycle ',
                capitalize(policy.earlydeductioncycle),
              ]);
            }
            if (!(policy.earlydeductioncategory == 'minutewise')) {
              worksheet.addRow([
                'Max Early Going Minutes allowed ',
                policy.earlymaxminute,
              ]);
            }
            worksheet.addRow([
              'Deduction Type',
              excelMsgForDeductionType[policy.earlydeductiontype],
            ]);
            worksheet.addRow([
              excelMsgForDeductionType[policy.earlydeductiontype],
              policy.earlyvalue,
            ]);
            if (!(policy.earlydeductioncategory == 'minutewise')) {
              worksheet.addRow([
                'Set Recurring',
                policy.earlyRecurring == true ? 'Yes' : 'No',
              ]);
            }
            if (
              policy.earlyGoSlab1 &&
              policy.earlydeductioncategory == 'countwise'
            ) {
              worksheet.addRow([
                'Early Go Slab - 1 ',
                'Deduction from',
                capitalize(policy.earlydeductionfrom1),
              ]);
              worksheet.addRow([
                '',
                'Max Early Going Minutes allowed ',
                policy.earlymaxminute1,
              ]);
              worksheet.addRow([
                '',
                'Deduction Type',
                excelMsgForDeductionType[policy.earlydeductiontype1],
              ]);
              worksheet.addRow([
                '',
                excelMsgForDeductionType[policy.earlydeductiontype1],
                policy.earlyvalue1,
              ]);
            }
            if (
              policy.earlyGoSlab2 &&
              policy.earlydeductioncategory == 'countwise'
            ) {
              worksheet.addRow([
                'Early Go Slab - 2 ',
                'Deduction from',
                capitalize(policy.earlydeductionfrom2),
              ]);
              worksheet.addRow([
                '',
                'Max Early Going Minutes allowed ',
                policy.earlymaxminute2,
              ]);
              worksheet.addRow([
                '',
                'Deduction Type',
                excelMsgForDeductionType[policy.earlydeductiontype2],
              ]);
              worksheet.addRow([
                '',
                excelMsgForDeductionType[policy.earlydeductiontype2],
                policy.earlyvalue2,
              ]);
            }
          }
        }
        if (
          !(policy.lateEarlyPolicyType == LCEGPolicyTypeEnum.NO_LCEG_POLICY)
        ) {
          worksheet.addRow([]);
          worksheet.addRow([
            'Not Applicable If Total Working Hours Are Completed',
            policy.onWorkingHours == true ? 'Yes' : 'No',
          ]);
          if (policy.deductFrom == 'attendance') {
            worksheet.addRow([
              'In Case Of Day/Minute Wise Attendnace Penalties',
              'Deduct from present days/minutes',
            ]);
          } else {
            worksheet.addRow([
              'In Case Of Day/Minute Wise Attendnace Penalties',
              'Deduct from salary',
            ]);
          }
        }
        counter++;
      }
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=Holiday_Policy.xlsx',
      );
      return res.send(buffer);
    }

    return res.status(200).json({
      message: 'Policies fetched successfully',
      status: 200,
      data: Policy.rows,
      totalcount: Policy.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteData = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const findEmployeeLcEgPolicy = await EmployeeLateEarlyPolicy.findOne({
      where: {
        lateEarlyPolicyMasterID: id,
      },
      include: [
        {
          required: true,
          model: UserMaster,
          as: 'employee',
          where: {
            status: [0, 1],
          },
        },
      ],
    });

    if (findEmployeeLcEgPolicy) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyAssign(
          'LateCome EarlyGo Policy',
          'Delete',
        ),
      });
    }

    const findData = await LateEarlyPolicy.findByPk(id, {
      include: [
        {
          model: LCEGPolicyBranch,
          as: 'lceg_branch',
          attributes: ['lcegPolicyBranchID'],
        },
        {
          model: LCEGPolicyDepartment,
          as: 'lceg_dept',
          attributes: ['lcegPolicyDepartmentID'],
        },
        {
          model: LCEGPolicyDesignation,
          as: 'lceg_design',
          attributes: ['lcegPolicyDesignationID'],
        },
      ],
    });

    if (!findData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 200,
        message: message.usermessage.notFoundMessage('LCEG Policy'),
      });
    }

    if (findData.lceg_branch?.length) {
      const ids = findData.lceg_branch.map((e) => e.lcegPolicyBranchID);

      await LCEGPolicyBranch.destroy({
        where: {
          lcegPolicyBranchID: ids,
        },
        user: req.userDetails,
        individualHooks: true,
        transaction,
      });
    }

    if (findData.lceg_dept?.length) {
      const ids = findData.lceg_dept.map((e) => e.lcegPolicyDepartmentID);

      await LCEGPolicyDepartment.destroy({
        where: {
          lcegPolicyDepartmentID: ids,
        },
        user: req.userDetails,
        individualHooks: true,
        transaction,
      });
    }

    if (findData.lceg_design?.length) {
      const ids = findData.lceg_design.map((e) => e.lcegPolicyDesignationID);

      await LCEGPolicyDesignation.destroy({
        where: {
          lcegPolicyDesignationID: ids,
        },
        user: req.userDetails,
        individualHooks: true,
        transaction,
      });
    }

    await findData.destroy({ user: req.userDetails, transaction });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('LateCome EarlyGo Policy'),
    });
  } catch (error) {
    await transaction.rollback();
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
    const order = [['lateEarlyPolicyName', 'ASC']];

    /* ================= QUERY ================= */
    const policies = await LateEarlyPolicy.findAll({
      where: {
        companyMasterID,
        status: 1,

        [Sequelize.Op.and]: [
          /* ============== BRANCH ================= */
          sequelize.literal(`
            (
              "lateEarlyPolicy"."branch_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "lcegPolicyBranches" apb
                WHERE apb."lcegPolicyID" =
                      "lateEarlyPolicy"."lateEarlyPolicyMasterID"
                AND apb."deletedAt" IS NULL
                AND apb."branchMasterID" = :branchMasterID
              )
            )
          `),

          /* ============== DEPARTMENT ================= */
          sequelize.literal(`
            (
              "lateEarlyPolicy"."department_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "lcegPolicyDepartments" apd
                WHERE apd."lcegPolicyID" =
                      "lateEarlyPolicy"."lateEarlyPolicyMasterID"
                AND apd."deletedAt" IS NULL
                AND apd."departmentId" = :departmentId
              )
            )
          `),

          /* ============== DESIGNATION ================= */
          sequelize.literal(`
            (
              "lateEarlyPolicy"."designation_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "lcegPolicyDesignations" apg
                WHERE apg."lcegPolicyID" =
                      "lateEarlyPolicy"."lateEarlyPolicyMasterID"
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
        'lateEarlyPolicyMasterID',
        'lateEarlyPolicyName',
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
