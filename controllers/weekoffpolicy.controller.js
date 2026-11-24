const Sequelize = require('sequelize');
const WeekOffPolicy = require('../models/weekOffPolicy');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const WeekOffOptionsModel = require('../models/weekOffOptions');
const companyMaster = require('../models/companyMaster');
const employeeWeekoffPolicy = require('../models/employeeWeekOff');
const Excel = require('exceljs');
const UserMaster = require('../models/userMaster');
const {
  weekoffTypeEnum,
  WeekOffEnumMsg,
  msgForOffEnum,
  excelMsgForWeekOffPolicyType,
  policyScope,
  phWeekOffType,
} = require('../utils/dbUtils');
const {
  isValidValue,
  capitalize,
  getUniqueSheetName,
  policy_Scope,
  bulkCreatePolicyScope,
} = require('../utils/commonUtilFunctions');
const WeekoffPolicyBranch = require('../models/weekoffPolicyBranch');
const WeekoffPolicyDepartment = require('../models/weekoffPolicyDepartment');
const WeekoffPolicyDesignation = require('../models/weekoffPolicyDesignation');
const BranchMaster = require('../models/branchMaster');
const Department = require('../models/department');
const Designation = require('../models/designation');
const { statusCodes } = require('../utils/commonVars');
const PHWeekOffPolicySlab = require('../models/phWeekOffPolicySlab');
/**
 * save bank data.
 *
 * @body {createBy} createBy user id of user who added the bank.
 * @body {number} createBy if any user change data then updateBy id change.
 
 */
exports.postAddWeekOffPolicy = async (req, res, next) => {
  try {
    const {
      weekOffPolicyName,
      description,
      companyMasterID,
      isNoWeekoffPolicy = false,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
      isDefault = false,
      slabWiseData = [],
      presentDayType = null,
      isMinDaysForPaidWeekOff,
      minDaysForPaidWeekOff,
    } = req.body;

    let {
      weekoffType,
      monthlyFix,
      paidDays,
      presentDays,
      physicalPresent,
      weekOffOptions,
    } = req.body;

    if (weekoffType == 'onPresentDay') {
      if (presentDayType && !['fix', 'slabWise'].includes(presentDayType)) {
        return res.status(200).json({
          status: 400,
          message: 'Invalid Present Day Type',
        });
      }

      if (!Array.isArray(slabWiseData)) {
        return res.status(200).json({
          status: 400,
          message: 'Slab Wise Data must be an array',
        });
      }

      if (presentDayType === 'slabWise') {
        if (!slabWiseData.length) {
          return res.status(200).json({
            status: 400,
            message: 'At least one slab is required',
          });
        }

        for (let i = 0; i < slabWiseData.length; i++) {
          const slab = slabWiseData[i];

          if (
            slab.minimumPresentDays === undefined ||
            slab.minimumPresentDays === null ||
            slab.minimumPresentDays === ''
          ) {
            return res.status(200).json({
              status: 400,
              message: `Minimum Present Days is required in slab ${i + 1}`,
            });
          }

          if (
            slab.weekOff === undefined ||
            slab.weekOff === null ||
            slab.weekOff === ''
          ) {
            return res.status(200).json({
              status: 400,
              message: `Week Off Count is required in slab ${i + 1}`,
            });
          }

          const minimumPresentDays = Number(slab.minimumPresentDays);
          const weekOff = Number(slab.weekOff);

          // Minimum Present Days validation (0.5 increments)
          if (
            Number.isNaN(minimumPresentDays) ||
            minimumPresentDays < 0.5 ||
            minimumPresentDays > 31 ||
            minimumPresentDays % 0.5 !== 0
          ) {
            return res.status(200).json({
              status: 400,
              message: `Minimum Present Days in slab ${
                i + 1
              } must be between 0.5 and 31 in increments of 0.5`,
            });
          }

          // Week Off validation (whole numbers only)
          if (
            Number.isNaN(weekOff) ||
            !Number.isInteger(weekOff) ||
            weekOff < 1 ||
            weekOff > 31
          ) {
            return res.status(200).json({
              status: 400,
              message: `Week Off Count in slab ${
                i + 1
              } must be a whole number between 1 and 31`,
            });
          }

          // Previous slab comparison
          if (i > 0) {
            const previousMinimumPresentDays = Number(
              slabWiseData[i - 1].minimumPresentDays,
            );

            const previousWeekOff = Number(slabWiseData[i - 1].weekOff);

            if (minimumPresentDays <= previousMinimumPresentDays) {
              return res.status(200).json({
                status: 400,
                message: `Minimum Present Days in slab ${
                  i + 1
                } must be greater than previous slab`,
              });
            }

            if (weekOff <= previousWeekOff) {
              return res.status(200).json({
                status: 400,
                message: `Week Off Count in slab ${
                  i + 1
                } must be greater than previous slab`,
              });
            }
          }
        }
      }

      if (presentDayType === 'fix') {
        if (
          presentDays === undefined ||
          presentDays === null ||
          presentDays === ''
        ) {
          return res.status(200).json({
            status: 400,
            message: 'Number of Present Days is required',
          });
        }

        const days = Number(presentDays);

        if (Number.isNaN(days) || days < 0.5 || days > 31 || days % 0.5 !== 0) {
          return res.status(200).json({
            status: 400,
            message:
              'Number of Present Days must be between 0.5 and 31 in increments of 0.5',
          });
        }
      }
    }

    if (isMinDaysForPaidWeekOff) {
      if (
        minDaysForPaidWeekOff === undefined ||
        minDaysForPaidWeekOff === null ||
        minDaysForPaidWeekOff === ''
      ) {
        return res.status(400).json({
          success: false,
          message: 'Minimum present days is required.',
        });
      }

      const days = Number(minDaysForPaidWeekOff);

      if (isNaN(days)) {
        return res.status(400).json({
          success: false,
          message: 'Minimum present days must be a number.',
        });
      }

      if (days < 0.5 || days > 6) {
        return res.status(400).json({
          success: false,
          message: 'Minimum present days must be between 0.5 and 6.',
        });
      }

      if (days % 0.5 !== 0) {
        return res.status(400).json({
          success: false,
          message: 'Minimum present days must be in increments of 0.5.',
        });
      }
    }

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    const existingPolicy = await WeekOffPolicy.findOne({
      where: {
        companyMasterID,
        status: [0, 1],
        [Sequelize.Op.or]: [
          sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('weekOffPolicyName')),
            ),
            String(weekOffPolicyName).trim().toLowerCase(),
          ),
          ...(isDefault ? [{ isDefault: true }] : []),
        ],
      },
    });

    if (existingPolicy) {
      let msg;

      if (existingPolicy.isDefault) {
        msg = 'Only one default Weekoff Policy is allowed per company.';
      } else {
        msg = message.usermessage.alreadyExists(
          'Weekoff Policy With Same Name',
        );
      }

      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: msg,
      });
    }

    if (isNoWeekoffPolicy) {
      weekoffType = null;
      monthlyFix = null;
      paidDays = null;
      physicalPresent = null;
      presentDays = null;
      weekOffOptions = [];
    }

    if (weekoffType == weekoffTypeEnum.FIX) {
      monthlyFix = null;
      paidDays = null;
      physicalPresent = null;
      presentDays = null;
    }

    if (weekoffType == weekoffTypeEnum.MONTHLYFIX) {
      weekOffOptions = [];
      paidDays = null;
      physicalPresent = null;
      presentDays = null;

      if (!isValidValue(+monthlyFix)) {
        return res.status(200).json({
          status: 401,
          message: 'Enter valid value of montly fix weekoff.',
        });
      }
    }

    if (weekoffType == weekoffTypeEnum.ONPAIDDAYS) {
      monthlyFix = null;
      weekOffOptions = [];
      physicalPresent = null;
      presentDays = null;

      if (!isValidValue(+paidDays)) {
        return res.status(200).json({
          status: 401,
          message: 'Enter valid value of paid days.',
        });
      }
    }

    if (weekoffType == weekoffTypeEnum.ONPHYSICALPRESENT) {
      monthlyFix = null;
      weekOffOptions = [];
      paidDays = null;
      presentDays = null;

      if (+physicalPresent % 1 != 0) {
        return res.status(200).json({
          status: 401,
          message: 'Enter valid value of physical present.',
        });
      }
    }

    if (weekoffType == weekoffTypeEnum.ONPRESENTDAY) {
      monthlyFix = null;
      weekOffOptions = [];
      physicalPresent = null;
      paidDays = null;

      if (!isValidValue(+presentDays)) {
        return res.status(200).json({
          status: 401,
          message: 'Enter valid value of present days.',
        });
      }
    }

    await sequelize.transaction(async (t) => {
      let insert_db_status = await WeekOffPolicy.create(
        {
          weekOffPolicyName,
          description,
          companyMasterID,
          createBy,
          createByIp,
          weekoffType,
          monthlyFix,
          paidDays,
          isNoWeekoffPolicy,
          physicalPresent,
          presentDays,
          branch_scope,
          department_scope,
          designation_scope,
          isDefault,
          PHweekOffType: presentDayType,
          isMinDaysForFixWf: isMinDaysForPaidWeekOff,
          minPresentDaysForFixWF: isMinDaysForPaidWeekOff
            ? minDaysForPaidWeekOff
            : null,
        },
        { transaction: t },
      );
      const weekOffPolicyID = insert_db_status.weekOffPolicyID;
      if (weekoffType == weekoffTypeEnum.FIX) {
        weekOffOptions.forEach(async (option) => {
          option['weekOffPolicyID'] = weekOffPolicyID;
        });

        await WeekOffOptionsModel.bulkCreate(weekOffOptions, {
          transaction: t,
        });
      }

      if (
        weekoffType == weekoffTypeEnum.ONPRESENTDAY &&
        slabWiseData &&
        slabWiseData.length > 0 &&
        presentDayType == 'slabWise'
      ) {
        const dataToStore = slabWiseData.map((item) => {
          return {
            minPresentDays: item.minimumPresentDays,
            weekOffCount: item.weekOff,
            weekOffPolicyID: weekOffPolicyID,
          };
        });

        await PHWeekOffPolicySlab.bulkCreate(dataToStore, {
          individualHooks: true,
          transaction: t,
          user: req.userDetails,
        });
      }

      await bulkCreatePolicyScope({
        scope: branch_scope,
        selectedScope: policyScope.SELECTED,
        ids: branch_scope_IDs,
        model: WeekoffPolicyBranch,
        policyIdKey: 'weekOffPolicyID',
        scopeIdKey: 'branchMasterID',
        policyId: weekOffPolicyID,
        req,
        transaction: t,
      });

      await bulkCreatePolicyScope({
        scope: department_scope,
        selectedScope: policyScope.SELECTED,
        ids: department_scope_IDs,
        model: WeekoffPolicyDepartment,
        policyIdKey: 'weekOffPolicyID',
        scopeIdKey: 'departmentId',
        policyId: weekOffPolicyID,
        req,
        transaction: t,
      });

      await bulkCreatePolicyScope({
        scope: designation_scope,
        selectedScope: policyScope.SELECTED,
        ids: designation_scope_IDs,
        model: WeekoffPolicyDesignation,
        policyIdKey: 'weekOffPolicyID',
        scopeIdKey: 'designationId',
        policyId: weekOffPolicyID,
        req,
        transaction: t,
      });
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Week Off Policy'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getWeekOffPolicyById = async (req, res, next) => {
  try {
    let get_one_data = await WeekOffPolicy.findOne({
      where: {
        weekOffPolicyID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          model: WeekoffPolicyBranch,
          as: 'ap_branch',
        },
        {
          model: WeekoffPolicyDepartment,
          as: 'ap_dept',
        },
        {
          model: WeekoffPolicyDesignation,
          as: 'ap_design',
        },
        {
          model: WeekOffOptionsModel,
          as: 'weekOffOptions',
        },
        {
          model: PHWeekOffPolicySlab,
          attributes: ['weekOffCount', 'minPresentDays'],
        },
      ],
    });

    if (get_one_data) {
      get_one_data.noWeekoffPolicy =
        get_one_data?.weekOffOptions?.length > 0 ? false : true;
    }

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

/**
 * find data with company master id
 *
 * @param {id} companyMasterID  to fetch bank name
 */

exports.getWeekOffPolicyByCompanyId = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      limit,
      page,
      searchQuery,
      exportData = false,
    } = req.body;

    const condition = {};

    condition.status = [0, 1];

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          weekOffPolicyName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          description: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        // {
        //   '$companyMaster.companyName$': {
        //     [Sequelize.Op.iLike]: '%' + searchQuery + '%',
        //   },
        // },
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

    const weekoffPolicy = await WeekOffPolicy.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      distinct: true,
      include: [
        {
          model: companyMaster,
          attributes: ['companyName'],
          where: searchQuery
            ? {
                companyName: {
                  [Sequelize.Op.iLike]: `%${searchQuery}%`,
                },
              }
            : undefined,
          required: false,
        },
        {
          model: WeekoffPolicyBranch,
          as: 'ap_branch',
          include: [
            {
              model: BranchMaster,
              attributes: ['branchName'],
            },
          ],
        },
        {
          model: WeekoffPolicyDepartment,
          as: 'ap_dept',
          include: [
            {
              model: Department,
              attributes: ['departmentName'],
            },
          ],
        },
        {
          model: WeekoffPolicyDesignation,
          as: 'ap_design',
          include: [
            {
              model: Designation,
              attributes: ['designationName'],
            },
          ],
        },
        {
          model: PHWeekOffPolicySlab,
          attributes: ['minPresentDays', 'weekOffCount'],
        },
      ],
    });

    if (weekoffPolicy.rows.length > 0) {
      for (const policy of weekoffPolicy.rows) {
        policy.dataValues['weekOffOptions'] = await WeekOffOptionsModel.findAll(
          {
            raw: true,
            where: {
              weekOffPolicyID: policy.weekOffPolicyID,
            },
          },
        );
      }
    }

    if (exportData) {
      const workbook = new Excel.Workbook();
      let counter = 1;
      for (const policy of weekoffPolicy.rows) {
        const uniqueSheetName = getUniqueSheetName(
          workbook,
          policy.weekOffPolicyName || 'Holiday Policy',
          counter,
        );
        const worksheet = workbook.addWorksheet(uniqueSheetName);
        const companyRow = worksheet.addRow([
          'Company Name',
          policy?.companyMaster?.companyName,
        ]);
        companyRow.getCell(1).font = { bold: true };
        const policyNameRow = worksheet.addRow([
          'WeekOff Policy Name',
          policy?.weekOffPolicyName,
        ]);
        policyNameRow.getCell(1).font = { bold: true };
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

        const defaultRow = worksheet.addRow([
          'Is Default Policy',
          policy.isDefault ? 'Yes' : 'No',
        ]);
        defaultRow.getCell(1).font = { bold: true };

        const yearRow = worksheet.addRow([
          'WeekOff Type',
          excelMsgForWeekOffPolicyType[policy?.weekoffType],
        ]);
        yearRow.getCell(1).font = { bold: true };
        worksheet.addRow([]);

        if (policy?.weekoffType == weekoffTypeEnum.MONTHLYFIX) {
          worksheet.addRow([WeekOffEnumMsg.monthlyFix, policy.monthlyFix]);
        } else if (policy?.weekoffType == weekoffTypeEnum.ONPAIDDAYS) {
          worksheet.addRow([WeekOffEnumMsg.onPaidDays, policy.paidDays]);
        } else if (policy?.weekoffType == weekoffTypeEnum.ONPHYSICALPRESENT) {
          worksheet.addRow([
            WeekOffEnumMsg.onPhysicalPresent,
            policy.physicalPresent,
          ]);
        } else if (policy?.weekoffType == weekoffTypeEnum.ONPRESENTDAY) {
          worksheet.addRow([
            'Week Off Type',
            policy.PHweekOffType == 'fix' ? 'Fixed' : 'Slab Wise',
          ]);

          if (policy.PHweekOffType == 'fix') {
            worksheet.addRow([WeekOffEnumMsg.onPresentDay, policy.presentDays]);
          } else {
            for (const policyData of policy.dataValues?.phWeekOffPolicySlabs) {
              worksheet.addRow([
                'Minimum Present Days',
                policyData.minPresentDays,
                'Week Off Count',
                policyData.weekOffCount,
              ]);
            }
          }
        } else if (policy?.weekoffType == weekoffTypeEnum.FIX) {
          for (let weekOff of policy.dataValues.weekOffOptions) {
            const dayName = worksheet.addRow([weekOff.day.toUpperCase(), '']);
            applyHeaderStyle(dayName);
            dayName.getCell(1).font = { bold: true };
            for (let day of weekOff.options) {
              let currentDay = day.name.slice(0, 3);
              if (currentDay == 'all') {
                currentDay = 'All';
              }
              const offAt = day.option.split('off');
              worksheet.addRow([
                `${currentDay} ${capitalize(weekOff.day)}`,
                `${msgForOffEnum[offAt[0]]}`,
              ]);
            }
            worksheet.addRow([]);
          }
        } else if (policy?.isNoWeekoffPolicy == true) {
          worksheet.addRow([WeekOffEnumMsg.noWeekoffPolicy]);
        }
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
      data: weekoffPolicy.rows,
      totalcount: weekoffPolicy.count,
    });
  } catch (err) {
    next(err);
  }
};
function applyHeaderStyle(row) {
  row.eachCell((cell) => {
    cell.font = {
      ...(cell.font || {}),
      bold: true,
      color: { argb: 'FFFFFFFF' }, // white
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
}

/**
 * update data
 *
 * @param {id} weekOffPolicyID  to update id
 */
exports.postUpdateWeekOffPolicy = async (req, res, next) => {
  try {
    let {
      weekOffPolicyID,
      weekOffPolicyName,
      description,
      companyMasterID,
      weekOffOptions,
      weekoffType,
      monthlyFix,
      paidDays,
      isNoWeekoffPolicy,
      physicalPresent,
      presentDays,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
      isDefault = false,
      slabWiseData = [],
      presentDayType = null,
      isMinDaysForPaidWeekOff,
      minDaysForPaidWeekOff,
    } = req.body;

    if (weekoffType == 'onPresentDay') {
      if (presentDayType && !['fix', 'slabWise'].includes(presentDayType)) {
        return res.status(200).json({
          status: 400,
          message: 'Invalid Present Day Type',
        });
      }

      if (!Array.isArray(slabWiseData)) {
        return res.status(200).json({
          status: 400,
          message: 'Slab Wise Data must be an array',
        });
      }

      if (presentDayType === 'slabWise') {
        if (!slabWiseData.length) {
          return res.status(200).json({
            status: 400,
            message: 'At least one slab is required',
          });
        }

        for (let i = 0; i < slabWiseData.length; i++) {
          const slab = slabWiseData[i];

          if (
            slab.minimumPresentDays === undefined ||
            slab.minimumPresentDays === null ||
            slab.minimumPresentDays === ''
          ) {
            return res.status(200).json({
              status: 400,
              message: `Minimum Present Days is required in slab ${i + 1}`,
            });
          }

          if (
            slab.weekOff === undefined ||
            slab.weekOff === null ||
            slab.weekOff === ''
          ) {
            return res.status(200).json({
              status: 400,
              message: `Week Off Count is required in slab ${i + 1}`,
            });
          }

          const minimumPresentDays = Number(slab.minimumPresentDays);
          const weekOff = Number(slab.weekOff);

          // Minimum Present Days validation (0.5 increments)
          if (
            Number.isNaN(minimumPresentDays) ||
            minimumPresentDays < 0.5 ||
            minimumPresentDays > 31 ||
            minimumPresentDays % 0.5 !== 0
          ) {
            return res.status(200).json({
              status: 400,
              message: `Minimum Present Days in slab ${
                i + 1
              } must be between 0.5 and 31 in increments of 0.5`,
            });
          }

          // Week Off validation (whole numbers only)
          if (
            Number.isNaN(weekOff) ||
            !Number.isInteger(weekOff) ||
            weekOff < 1 ||
            weekOff > 31
          ) {
            return res.status(200).json({
              status: 400,
              message: `Week Off Count in slab ${
                i + 1
              } must be a whole number between 1 and 31`,
            });
          }

          // Previous slab comparison
          if (i > 0) {
            const previousMinimumPresentDays = Number(
              slabWiseData[i - 1].minimumPresentDays,
            );

            const previousWeekOff = Number(slabWiseData[i - 1].weekOff);

            if (minimumPresentDays <= previousMinimumPresentDays) {
              return res.status(200).json({
                status: 400,
                message: `Minimum Present Days in slab ${
                  i + 1
                } must be greater than previous slab`,
              });
            }

            if (weekOff <= previousWeekOff) {
              return res.status(200).json({
                status: 400,
                message: `Week Off Count in slab ${
                  i + 1
                } must be greater than previous slab`,
              });
            }
          }
        }
      }

      if (presentDayType === 'fix') {
        if (
          presentDays === undefined ||
          presentDays === null ||
          presentDays === ''
        ) {
          return res.status(200).json({
            status: 400,
            message: 'Number of Present Days is required',
          });
        }

        const days = Number(presentDays);

        if (Number.isNaN(days) || days < 0.5 || days > 31 || days % 0.5 !== 0) {
          return res.status(200).json({
            status: 400,
            message:
              'Number of Present Days must be between 0.5 and 31 in increments of 0.5',
          });
        }
      }
    }

    if (isMinDaysForPaidWeekOff) {
      if (
        minDaysForPaidWeekOff === undefined ||
        minDaysForPaidWeekOff === null ||
        minDaysForPaidWeekOff === ''
      ) {
        return res.status(400).json({
          success: false,
          message: 'Minimum present days is required.',
        });
      }

      const days = Number(minDaysForPaidWeekOff);

      if (isNaN(days)) {
        return res.status(400).json({
          success: false,
          message: 'Minimum present days must be a number.',
        });
      }

      if (days < 0.5 || days > 6) {
        return res.status(400).json({
          success: false,
          message: 'Minimum present days must be between 0.5 and 6.',
        });
      }

      if (days % 0.5 !== 0) {
        return res.status(400).json({
          success: false,
          message: 'Minimum present days must be in increments of 0.5.',
        });
      }
    }

    const existingPolicy = await WeekOffPolicy.findOne({
      where: {
        companyMasterID,
        status: [0, 1],
        weekOffPolicyID: { [Sequelize.Op.ne]: weekOffPolicyID },
        [Sequelize.Op.or]: [
          sequelize.where(
            sequelize.fn(
              'TRIM',
              sequelize.fn('LOWER', sequelize.col('weekOffPolicyName')),
            ),
            String(weekOffPolicyName).trim().toLowerCase(),
          ),
          ...(isDefault ? [{ isDefault: true }] : []),
        ],
      },
    });

    if (existingPolicy) {
      let msg;

      if (existingPolicy.isDefault) {
        msg = 'Only one default Weekoff Policy is allowed per company.';
      } else {
        msg = message.usermessage.alreadyExists(
          'Weekoff Policy With Same Name',
        );
      }

      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: msg,
      });
    }

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    if (isNoWeekoffPolicy) {
      weekoffType = null;
      monthlyFix = null;
      paidDays = null;
      weekOffOptions = [];
      physicalPresent = null;
      presentDays = null;
    }

    if (weekoffType == weekoffTypeEnum.FIX) {
      monthlyFix = null;
      paidDays = null;
      physicalPresent = null;
      presentDays = null;
    }

    if (weekoffType == weekoffTypeEnum.MONTHLYFIX) {
      weekOffOptions = [];
      paidDays = null;
      physicalPresent = null;
      presentDays = null;

      if (!isValidValue(+monthlyFix)) {
        return res.status(200).json({
          status: 401,
          message: 'Enter valid value of montly fix weekoff.',
        });
      }
    }

    if (weekoffType == weekoffTypeEnum.ONPAIDDAYS) {
      monthlyFix = null;
      weekOffOptions = [];
      physicalPresent = null;
      presentDays = null;

      if (!isValidValue(+paidDays)) {
        return res.status(200).json({
          status: 401,
          message: 'Enter valid value of paid days.',
        });
      }
    }

    if (weekoffType == weekoffTypeEnum.ONPHYSICALPRESENT) {
      monthlyFix = null;
      weekOffOptions = [];
      paidDays = null;
      presentDays = null;

      if (+physicalPresent % 1 != 0) {
        return res.status(200).json({
          status: 401,
          message: 'Enter valid value of physical present.',
        });
      }
    }

    if (weekoffType == weekoffTypeEnum.ONPRESENTDAY) {
      monthlyFix = null;
      weekOffOptions = [];
      physicalPresent = null;
      paidDays = null;

      if (!isValidValue(+presentDays)) {
        return res.status(200).json({
          status: 401,
          message: 'Enter valid value of present days.',
        });
      }
    }

    let result = await sequelize.transaction(async (t) => {
      await WeekOffPolicy.update(
        {
          weekOffPolicyName,
          description,
          companyMasterID,
          updateBy,
          updateByIp,
          weekoffType,
          monthlyFix,
          paidDays,
          isNoWeekoffPolicy,
          physicalPresent,
          presentDays,
          branch_scope,
          department_scope,
          designation_scope,
          isDefault,
          PHweekOffType: weekoffType == 'onPresentDay' ? presentDayType : null,
          isMinDaysForFixWf: isMinDaysForPaidWeekOff,
          minPresentDaysForFixWF: isMinDaysForPaidWeekOff
            ? minDaysForPaidWeekOff
            : null,
        },
        {
          where: { weekOffPolicyID },
          transaction: t,
        },
      );

      await WeekOffOptionsModel.destroy({
        where: {
          weekOffPolicyID,
        },
        transaction: t,
      });

      if (weekoffType == weekoffTypeEnum.FIX) {
        weekOffOptions.forEach(async (option) => {
          option['weekOffPolicyID'] = weekOffPolicyID;
        });
        await WeekOffOptionsModel.bulkCreate(weekOffOptions, {
          transaction: t,
        });
      }

      await PHWeekOffPolicySlab.destroy({
        where: {
          weekOffPolicyID: weekOffPolicyID,
        },
      });

      if (
        weekoffType == weekoffTypeEnum.ONPRESENTDAY &&
        slabWiseData &&
        slabWiseData.length > 0 &&
        presentDayType == 'slabWise'
      ) {
        const dataToStore = slabWiseData.map((item) => {
          return {
            minPresentDays: item.minimumPresentDays,
            weekOffCount: item.weekOff,
            weekOffPolicyID: weekOffPolicyID,
          };
        });

        await PHWeekOffPolicySlab.bulkCreate(dataToStore, {
          individualHooks: true,
          transaction: t,
          user: req.userDetails,
        });
      }

      await policy_Scope({
        model: WeekoffPolicyBranch,
        primaryKey: { weekOffPolicyID: weekOffPolicyID },
        column: 'branchMasterID',
        newIDs: branch_scope_IDs,
        user: req.userDetails,
        transaction: t,
      });

      await policy_Scope({
        model: WeekoffPolicyDepartment,
        primaryKey: { weekOffPolicyID: weekOffPolicyID },
        column: 'departmentId',
        newIDs: department_scope_IDs,
        user: req.userDetails,
        transaction: t,
      });

      await policy_Scope({
        model: WeekoffPolicyDesignation,
        primaryKey: { weekOffPolicyID: weekOffPolicyID },
        column: 'designationId',
        newIDs: designation_scope_IDs,
        user: req.userDetails,
        transaction: t,
      });
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Weekoff Policy'),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * update status
 *
 * @param {id} weekOffPolicyID  to update status of bank
 */

exports.poststatuschange = async (req, res, next) => {
  try {
    const { weekOffPolicyID, status } = await req.body;
    if (status != '1') {
      const data = await employeeWeekoffPolicy.findOne({
        where: {
          weekOffPolicyID,
          status: ['1', '0'],
        },
      });

      if (data) {
        return res.status(200).json({
          status: 401,
          message:
            'You can not deactivate this WeekOff Policy. Already assigned to employees.',
        });
      }
    }

    await WeekOffPolicy.update(
      {
        status,
      },
      {
        where: { weekOffPolicyID },
      },
    );

    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Weekoff Policy')
          : message.usermessage.deactiveMessage('Weekoff Policy'),
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

/**
 * delete by i
 *
 * @param {id} weekOffPolicyID  to delete id
 */
exports.postDeleteWeekOffPolicyById = async (req, res, next) => {
  try {
    let { weekOffPolicyID } = await req.body;

    let data = await employeeWeekoffPolicy.findOne({
      where: {
        weekOffPolicyID: weekOffPolicyID,
        status: ['1', '0'],
      },
    });

    if (data) {
      return res.status(200).json({
        status: 401,
        message:
          'You can not delete this WeekOff Policy. Already assigned to employees.',
      });
    } else {
      let delete_status = await WeekOffPolicy.update(
        {
          status: 2,
        },
        {
          where: { weekOffPolicyID: weekOffPolicyID },
        },
      );

      return res.status(200).json({
        status: 200,
        message: message.usermessage.weekoffpolicydelete,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.getactiveweekoffbycompanyid = async (req, res, next) => {
  try {
    const weekOffPolicyData = await WeekOffPolicy.findAll({
      where: {
        companyMasterID: req.params.id,
        status: 1,
      },
      raw: true,
    });

    return res.status(200).json({ status: 200, data: weekOffPolicyData });
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
    const order = [['weekOffPolicyName', 'ASC']];

    /* ================= QUERY ================= */
    const policies = await WeekOffPolicy.findAll({
      where: {
        companyMasterID,
        status: 1,
        [Sequelize.Op.and]: [
          /* ============== BRANCH ================= */
          sequelize.literal(`
            (
              "weekOffPolicy"."branch_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "weekoffPolicyBranches" apb
                WHERE apb."weekOffPolicyID" =
                      "weekOffPolicy"."weekOffPolicyID"
                AND apb."deletedAt" IS NULL
                AND apb."branchMasterID" = :branchMasterID
              )
            )
          `),

          /* ============== DEPARTMENT ================= */
          sequelize.literal(`
            (
              "weekOffPolicy"."department_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "weekoffPolicyDepartments" apd
                WHERE apd."weekOffPolicyID" =
                      "weekOffPolicy"."weekOffPolicyID"
                AND apd."deletedAt" IS NULL
                AND apd."departmentId" = :departmentId
              )
            )
          `),

          /* ============== DESIGNATION ================= */
          sequelize.literal(`
            (
              "weekOffPolicy"."designation_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "weekoffPolicyDesignations" apg
                WHERE apg."weekOffPolicyID" =
                      "weekOffPolicy"."weekOffPolicyID"
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
        'weekOffPolicyID',
        'weekOffPolicyName',
        'branch_scope',
        'department_scope',
        'designation_scope',
        'companyMasterID',
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
