const Sequelize = require('sequelize');
const HolidayPolicy = require('../models/holidayPolicy');
const message = require('../response_message/message');
const holidayListModel = require('../models/holidayList');
const employeeHolidayPolicy = require('../models/employeeHolidayPolicy');
const UserMaster = require('../models/userMaster');
const companyMaster = require('../models/companyMaster');
const sequelize = require('../config/database');
const weekoffHolidayTran = require('../models/weekoffHolidayTran');
const Excel = require('exceljs');
const {
  getUniqueSheetName,
  bulkCreatePolicyScope,
  policy_Scope,
  asiaKolkataDateTime,
  capitalize,
} = require('../utils/commonUtilFunctions');
const HolidayPolicyBranch = require('../models/holidayPolicyBranch');
const HolidayPolicyDepartment = require('../models/holidayPolicyDepartment');
const HolidayPolicyDesignation = require('../models/holidayPolicyDesignation');
const BranchMaster = require('../models/branchMaster');
const Department = require('../models/department');
const Designation = require('../models/designation');
const { policyScope } = require('../utils/dbUtils');
const HolidayCompensationRule = require('../models/holidayCompensationRule');
const { statusCodes } = require('../utils/commonVars');

exports.postAddholidayPolicy = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      holidayPolicyName,
      holidayYear,
      companyMasterID,
      holidayListName,
      holidayDate,
      optionalHoliday,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
      isDefault = false,
    } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const existingPolicy = await HolidayPolicy.findOne({
      where: {
        companyMasterID,
        status: [0, 1],
        [Sequelize.Op.or]: [
          sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('holidayPolicyName')),
            ),
            String(holidayPolicyName).trim().toLowerCase(),
          ),
          ...(isDefault ? [{ isDefault: true }] : []),
        ],
      },
    });
    if (existingPolicy) {
      await transaction.rollback();
      let msg;

      if (existingPolicy.isDefault) {
        msg = 'Only one default Holiday Policy is allowed per company.';
      } else {
        msg = message.usermessage.alreadyExists(
          'Holiday Policy With Same Name',
        );
      }

      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: msg,
      });
    }

    const insert_db_status = await HolidayPolicy.create(
      {
        holidayPolicyName: holidayPolicyName.trim(),
        holidayYear,
        companyMasterID,
        isDefault,
        createBy,
        createByIp,
      },
      { transaction },
    );
    const holidayPolicyID = insert_db_status.holidayPolicyID;
    await holidayListModel.create(
      {
        holidayPolicyID,
        holidayListName,
        holidayDate,
        optionalHoliday,
        branch_scope,
        department_scope,
        designation_scope,
        createBy,
        createByIp,
      },
      { transaction },
    );
    await bulkCreatePolicyScope({
      scope: branch_scope,
      selectedScope: policyScope.SELECTED,
      ids: branch_scope_IDs,
      model: HolidayPolicyBranch,
      policyIdKey: 'holidayPolicyID',
      scopeIdKey: 'branchMasterID',
      policyId: holidayPolicyID,
      req,
      transaction,
    });

    await bulkCreatePolicyScope({
      scope: department_scope,
      selectedScope: policyScope.SELECTED,
      ids: department_scope_IDs,
      model: HolidayPolicyDepartment,
      policyIdKey: 'holidayPolicyID',
      scopeIdKey: 'departmentId',
      policyId: holidayPolicyID,
      req,
      transaction,
    });

    await bulkCreatePolicyScope({
      scope: designation_scope,
      selectedScope: policyScope.SELECTED,
      ids: designation_scope_IDs,
      model: HolidayPolicyDesignation,
      policyIdKey: 'holidayPolicyID',
      scopeIdKey: 'designationId',
      policyId: holidayPolicyID,
      req,
      transaction,
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Holiday Policy'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 return all bank data
 */

exports.getAllholidayPolicyData = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      limit,
      page,
      searchQuery,
      exportData = false,
    } = await req.body;

    const condition = {};

    condition.status = [0, 1];

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          holidayPolicyName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [
      ['companyMasterID', 'ASC'],
      ['createdAt', 'DESC'],
    ];

    const holiday_Policy = await HolidayPolicy.findAndCountAll({
      // raw: true,
      distinct: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
        {
          model: HolidayPolicyBranch,
          as: 'ap_branch',
          include: [
            {
              model: BranchMaster,
              attributes: ['branchName'],
            },
          ],
        },
        {
          model: HolidayPolicyDepartment,
          as: 'ap_dept',
          include: [
            {
              model: Department,
              attributes: ['departmentName'],
            },
          ],
        },
        {
          model: HolidayPolicyDesignation,
          as: 'ap_design',
          include: [
            {
              model: Designation,
              attributes: ['designationName'],
            },
          ],
        },
        {
          model: HolidayCompensationRule,
          attributes: ['holidayCompensationRuleID'],
        },
      ],
    });

    if (holiday_Policy.rows.length > 0) {
      for (const policy of holiday_Policy.rows) {
        policy['holidayList'] = await holidayListModel.findAll({
          raw: true,
          where: {
            holidayPolicyID: policy.holidayPolicyID,
          },
        });
      }
    }

    if (exportData) {
      const workbook = new Excel.Workbook();
      let counter = 1;
      for (const policy of holiday_Policy.rows) {
        const uniqueSheetName = getUniqueSheetName(
          workbook,
          policy.holidayPolicyName || 'Holiday Policy',
          counter,
        );

        const worksheet = workbook.addWorksheet(uniqueSheetName);
        const companyRow = worksheet.addRow([
          'Company Name',
          policy?.['companyMaster.companyName'],
        ]);
        companyRow.getCell(1).font = { bold: true };
        const yearRow = worksheet.addRow(['Year', policy?.holidayYear]);
        yearRow.getCell(1).font = { bold: true };
        if (policy.branch_scope == policyScope.SELECTED) {
          const selectedBranch = policy.ap_branch
            .map((item) => item?.branchMaster?.branchName)
            .join(',');
          worksheet.addRow([
            'Policy Applicable To',
            capitalize(policy.branch_scope) + ' Branches',
            selectedBranch,
          ]);
        } else {
          worksheet.addRow([
            'Policy Applicable To',
            capitalize(policy.branch_scope) + ' Branches',
          ]);
        }
        if (policy.department_scope == policyScope.SELECTED) {
          const selectedDepartment = policy.ap_dept
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
            capitalize(policy.department_scope) + ' Department',
          ]);
        }
        if (policy.designation_scope == policyScope.SELECTED) {
          const selectedDesig = policy.ap_design
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
            capitalize(policy.designation_scope) + ' Designation',
          ]);
        }
        const policyNameRow = worksheet.addRow([
          'Holiday Policy Name',
          policy?.holidayPolicyName,
        ]);
        policyNameRow.getCell(1).font = { bold: true };
        worksheet.addRow([]);

        const defaultRow = worksheet.addRow([
          'Is Default Policy',
          policy.isDefault ? 'Yes' : 'No',
        ]);
        defaultRow.getCell(1).font = { bold: true };
        worksheet.addRow([]);
        const headerRow = worksheet.addRow([
          'Holiday',
          'Date',
          'Optional Holiday',
        ]);

        headerRow.eachCell((cell) => {
          cell.font = {
            bold: true,
            color: { argb: 'FFFFFFFF' },
          };

          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' },
          };

          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
          };

          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
        const holiday = policy?.holidayList?.[0];
        for (let i = 0; i < holiday?.holidayDate.length; i++) {
          const rawDate = holiday.holidayDate[i];
          const dateObj = new Date(rawDate);
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          const formattedDate = `${day}-${month}-${year}`;
          worksheet.addRow([
            holiday?.holidayListName[i],
            formattedDate,
            holiday?.optionalHoliday[i] == true ? 'Yes' : 'No',
          ]);
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
      status: 200,
      data: holiday_Policy.rows,
      totalcount: holiday_Policy.count,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * find data with HolidayPolicy id
 *
 * @param {id} holidayPolicyID  to fetch bank name
 */

exports.getholidayPolicyById = async (req, res, next) => {
  try {
    const { isOptionalHoliday = 'false' } = req.query;

    const isOptionalCOndition = {};
    if (isOptionalHoliday === 'true') {
      isOptionalCOndition.optionalHoliday = {
        [Sequelize.Op.contains]: [false],
      };
    }

    let get_one_data = await HolidayPolicy.findOne({
      where: {
        holidayPolicyID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          model: HolidayPolicyBranch,
          as: 'ap_branch',
        },
        {
          model: HolidayPolicyDepartment,
          as: 'ap_dept',
        },
        {
          model: HolidayPolicyDesignation,
          as: 'ap_design',
        },
        {
          model: holidayListModel,
          where: isOptionalCOndition,
        },
      ],
    });

    if (
      isOptionalHoliday === 'true' &&
      get_one_data &&
      get_one_data.holidayLists.length > 0
    ) {
      for (
        let i = 0;
        i < get_one_data.holidayLists[0].holidayDate.length;
        i++
      ) {
        if (get_one_data.holidayLists[0].optionalHoliday[i] == true) {
          get_one_data.holidayLists[0].holidayDate.splice(i, 1);
          get_one_data.holidayLists[0].optionalHoliday.splice(i, 1);
          get_one_data.holidayLists[0].holidayListName.splice(i, 1);
          i--;
        }
      }
    }
    if (!get_one_data) {
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    } else {
      res.status(200).json({ status: 200, data: get_one_data });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * update data
 *
 * @param {id} holidayPolicyID  to update id
 */
exports.postUpdateholidayPolicy = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      holidayPolicyID,
      holidayPolicyName,
      holidayYear,
      companyMasterID,
      holidayListName,
      holidayDate = [],
      optionalHoliday,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
      isDefault = false,
    } = req.body;

    const duplicates = holidayDate.filter((item, index) => {
      return holidayDate.indexOf(item) !== index;
    });

    const formatDate = (dateStr) => {
      const [year, month, day] = dateStr.split('-');
      return `${day}-${month}-${year}`;
    };

    if (duplicates.length) {
      const formattedDates = [...new Set(duplicates)].map(formatDate);

      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: `Duplicate Holiday Dates (${formattedDates.join(', ')})`,
      });
    }
    const existingPolicyName = await HolidayPolicy.findOne({
      where: {
        companyMasterID,
        status: [0, 1],
        holidayPolicyID: { [Sequelize.Op.ne]: holidayPolicyID },
        [Sequelize.Op.or]: [
          sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('holidayPolicyName')),
            ),
            String(holidayPolicyName).trim().toLowerCase(),
          ),
          ...(isDefault ? [{ isDefault: true }] : []),
        ],
      },
    });
    if (existingPolicyName) {
      await transaction.rollback();
      let msg;

      if (existingPolicyName.isDefault) {
        msg = 'Only one default Holiday Policy is allowed per company.';
      } else {
        msg = message.usermessage.alreadyExists(
          'Holiday Policy With Same Name',
        );
      }

      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: msg,
      });
    }

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    const oldHolidayPolicy = await holidayListModel.findOne(
      {
        where: { holidayPolicyID: holidayPolicyID },

        raw: true,
      },
      { transaction },
    );

    await HolidayPolicy.update(
      {
        holidayPolicyName,
        holidayYear,
        companyMasterID,
        updateBy,
        updateByIp,
        branch_scope,
        department_scope,
        designation_scope,
        isDefault,
      },
      { where: { holidayPolicyID: holidayPolicyID } },
      { transaction },
    );

    await holidayListModel.update(
      { holidayListName, holidayDate, optionalHoliday, updateBy, updateByIp },
      { where: { holidayPolicyID: holidayPolicyID } },
      { transaction },
    );

    const getHolidayPolicy = await employeeHolidayPolicy.findAll(
      {
        raw: true,
        where: { holidayPolicyID: holidayPolicyID, status: 1 },
        include: [
          {
            model: UserMaster,
            as: 'employee',
            attributes: ['userMasterID', 'companyMasterId'],
          },
        ],
      },
      { transaction },
    );

    for (const user of getHolidayPolicy) {
      let count = 0;
      for (let date of oldHolidayPolicy.holidayDate) {
        date = new Date(date);
        date.setDate(date.getDate() + 1);
        date = date.toISOString().slice(0, 10);

        if (new Date(user.applicableDate) <= new Date(date)) {
          if (!user.endDate || new Date(user.endDate) >= new Date(date)) {
            //Add

            await weekoffHolidayTran.destroy(
              {
                where: {
                  userMasterID: user.userMasterID,
                  date: date,
                  tableName: 'holiday',
                },
              },
              { transaction },
            );
          }
        }
      }
      let holidayDates = [];
      for (let date of holidayDate) {
        if (new Date(user.applicableDate) <= new Date(date)) {
          if (!user.endDate || new Date(user.endDate) >= new Date(date)) {
            await weekoffHolidayTran.destroy(
              {
                where: {
                  userMasterID: user.userMasterID,
                  date: date,
                  tableName: 'holiday',
                },
              },
              { transaction },
            );
            holidayDates.push({
              userMasterID: user.userMasterID,
              companyMasterID: companyMasterID,
              yearMonth: date.slice(0, 4) + date.slice(5, 7),
              date: date,
              dayName: get_day(date),
              value: 1,
              tableName: 'holiday',
              optionalHoliday: +optionalHoliday[count] ? true : false,
            });
          }
        }
        count++;
      }
      await weekoffHolidayTran.bulkCreate(holidayDates, transaction);
    }
    await policy_Scope({
      model: HolidayPolicyBranch,
      primaryKey: { holidayPolicyID: holidayPolicyID },
      column: 'branchMasterID',
      newIDs: branch_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: HolidayPolicyDepartment,
      primaryKey: { holidayPolicyID: holidayPolicyID },
      column: 'departmentId',
      newIDs: department_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: HolidayPolicyDesignation,
      primaryKey: { holidayPolicyID: holidayPolicyID },
      column: 'designationId',
      newIDs: designation_scope_IDs,
      user: req.userDetails,
      transaction: transaction,
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Holiday Policy'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

function get_day(date) {
  temp = new Date(date).getDay();
  days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return days[temp];
}
/**
 * update status
 *
 * @param {id} holidayPolicyID  to update status of bank
 */

exports.poststatuschange = async (req, res, next) => {
  try {
    let { holidayPolicyID, status } = await req.body;
    let delete_status;
    if (status == '1') {
      delete_status = await HolidayPolicy.update(
        {
          status: '1',
        },
        {
          where: { holidayPolicyID: holidayPolicyID, status: ['1', '0'] },
        },
      );
    } else {
      let data = await employeeHolidayPolicy.findOne({
        where: {
          holidayPolicyID: holidayPolicyID,
          status: ['1', '0'],
        },
      });

      if (data) {
        return res.status(200).json({
          status: 401,
          message:
            'You can not deactivate this Holiday Policy. Already assigned to employees.',
        });
      } else {
        delete_status = await HolidayPolicy.update(
          {
            status: '0',
          },
          {
            where: { holidayPolicyID: holidayPolicyID, status: ['1', '0'] },
          },
        );
      }
    }

    if (delete_status != 0) {
      res.status(200).json({
        status: 200,
        message: message.usermessage.holidaypolicydelete,
        data: {},
      });
    } else {
      res.status(200).json({
        status: 200,
        message: message.usermessage.deletedrecord,
        data: {},
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * delete by i
 *
 * @param {id} holidayPolicyID  to delete id
 */
exports.postDeleteholidayPolicyById = async (req, res, next) => {
  try {
    let { holidayPolicyID } = await req.body;

    let data = await employeeHolidayPolicy.findOne({
      where: {
        holidayPolicyID: holidayPolicyID,
        status: ['1', '0'],
      },
    });

    if (data) {
      return res.status(200).json({
        status: 401,
        message:
          'You can not delete this Holiday Policy. Already assigned to employees.',
      });
    } else {
      let delete_status = await HolidayPolicy.update(
        {
          status: 2,
        },
        {
          where: { holidayPolicyID: holidayPolicyID },
        },
      );
      await HolidayCompensationRule.destroy({
        where: { holidayPolicyID: holidayPolicyID },
        user: req.userDetails,
      });

      res.status(200).json({
        status: 200,
        message: message.usermessage.holidaypolicydelete,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.getactiveholidaypolicybycompanyid = async (req, res, next) => {
  try {
    const policy = await HolidayPolicy.findAll({
      where: {
        companyMasterID: req.params.id,
        status: 1,
      },
      raw: true,
    });

    res.status(200).json({ status: 200, data: policy });
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
    const order = [['holidayPolicyName', 'ASC']];
    const currentYear = asiaKolkataDateTime(new Date()).slice(0, 4);

    /* ================= QUERY ================= */
    const policies = await HolidayPolicy.findAll({
      where: {
        companyMasterID,
        holidayYear: currentYear,
        status: 1,
        [Sequelize.Op.and]: [
          /* ============== BRANCH ================= */
          sequelize.literal(`
            (
              "holidayPolicy"."branch_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "holidayPolicyBranches" apb
                WHERE apb."holidayPolicyID" =
                      "holidayPolicy"."holidayPolicyID"
                AND apb."deletedAt" IS NULL
                AND apb."branchMasterID" = :branchMasterID
              )
            )
          `),

          /* ============== DEPARTMENT ================= */
          sequelize.literal(`
            (
              "holidayPolicy"."department_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "holidayPolicyDepartments" apd
                WHERE apd."holidayPolicyID" =
                      "holidayPolicy"."holidayPolicyID"
                AND apd."deletedAt" IS NULL
                AND apd."departmentId" = :departmentId
              )
            )
          `),

          /* ============== DESIGNATION ================= */
          sequelize.literal(`
            (
              "holidayPolicy"."designation_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "holidayPolicyDesignations" apg
                WHERE apg."holidayPolicyID" =
                      "holidayPolicy"."holidayPolicyID"
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
        'holidayPolicyID',
        'holidayPolicyName',
        'branch_scope',
        'department_scope',
        'designation_scope',
        'companyMasterID',
        'holidayYear',
        'isDefault',
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

exports.addUpdateHolidayCompensationRule = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { holidayPolicyID, compensationRules } = req.body;

    if (!holidayPolicyID) {
      await transaction.rollback();
      return res.status(400).json({
        status: 400,
        message: message.usermessage.requiredMessage('Holiday Policy ID'),
      });
    }

    if (!compensationRules || compensationRules.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: 400,
        message: message.usermessage.requiredMessage('Compensation Rules'),
      });
    }

    // Flatten all dates across all rules and check for duplicates
    const allDates = compensationRules.flatMap((rule) => rule.holidays || []);

    const seen = new Set();
    const duplicates = [];

    allDates.forEach((date) => {
      if (seen.has(date)) {
        if (!duplicates.includes(date)) duplicates.push(date);
      } else {
        seen.add(date);
      }
    });

    if (duplicates.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: 400,
        message: `The following dates appear in multiple compensation rules: ${duplicates.join(', ')}`,
      });
    }

    // Delete all existing rules for this policy first, then recreate
    await HolidayCompensationRule.destroy({
      where: { holidayPolicyID },
      transaction,
      user: req.userDetails,
    });

    const rulesToCreate = compensationRules.map((rule) => ({
      holidayPolicyID,
      holidayDate: rule.holidays,
      compensationType: rule.compensationType,
      minutesForHalfDay: rule.minutesForHalfDay ?? null,
      minutesForFullDay: rule.minutesForFullDay ?? null,
      minutesForOneAndHalfDay: rule.minutesForOneAndHalfDay ?? null,
      minutesForTwoFullDay: rule.minutesForTwoFullDay ?? null,
    }));

    await HolidayCompensationRule.bulkCreate(rulesToCreate, {
      user: req.userDetails,
      individualHooks: true,
      transaction,
    });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: 'Holiday compensation rules saved successfully.',
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getHolidayCompensationRuleByPolicyId = async (req, res, next) => {
  try {
    const { holidayPolicyID } = req.body;

    if (!holidayPolicyID) {
      return res.status(400).json({
        status: 400,
        message: message.usermessage.notFoundMessage(
          'Holiday Compensation Rule',
        ),
      });
    }

    const rules = await HolidayCompensationRule.findAll({
      where: { holidayPolicyID },
    });

    return res.status(200).json({
      status: 200,
      data: rules,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteHolidayCompensationRuleByPolicyId = async (req, res, next) => {
  try {
    const { holidayPolicyID } = req.body;
    if (!holidayPolicyID) {
      return res.status(400).json({
        status: 400,
        message: message.usermessage.notFoundMessage(
          'Holiday Compensation Rule',
        ),
      });
    }

    await HolidayCompensationRule.destroy({
      where: { holidayPolicyID },
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Compensations'),
    });
  } catch (err) {
    next(err);
  }
};
