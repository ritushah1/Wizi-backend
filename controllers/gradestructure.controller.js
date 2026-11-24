/** @format */

const Sequelize = require('sequelize');
const GradeStructure = require('../models/gradeStructure');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const logger = require('../config/logger');
const message = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const StateMaster = require('../models/statemaster');
const ProfessionalTaxSlabMaster = require('../models/professionaltaxmaster');
const HRSalaryFieldChild = require('../models/hrSalaryFieldChild');
const { executeQuery } = require('./common.controller');
const HRSalaryFields = require('../models/hrSalaryFields');
const { post } = require('../routes/hrleavesmonthlytrans.router');
const { log } = require('handlebars');
const {
  assignSalaryStructure,
  manualchangeSalaryStructure,
  asiaKolkataDateTime,
} = require('../utils/commonUtilFunctions');
const HRSalaryMasterFields = require('../models/hrSalaryMaster');
const Payheadmaster = require('../models/payhead');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeSkillCategory = require('../models/employeeSkillCategory');
const Contractor = require('../models/contractor');
const {
  default_payheadMasterIds,
  PayrollFrequencyType,
  salaryOptions,
  salaryFieldSrNoFields,
  payheadMasterIdsMapping,
} = require('../utils/dbUtils');
const { showPayrollFrequency } = require('../utils/labelUtils');
const CityMaster = require('../models/citymaster');
const Excel = require('exceljs');
const path = require('path');
const fs = require('fs');
const { statusCodes } = require('../utils/commonVars');
const SalaryBasedOnDays = require('../models/salaryBasedOnDays');
/**
 * save grade structure data.
 *
 * @body {createBy} createBy user id of user who added the grade structure.
 * @body {number} createBy if any user change data then updateBy id change.
 
 */

const getMissingPayheads = (payheadsToCheck, existingPayheads, allPayheads) => {
  const missingPayheads = payheadsToCheck.filter(
    (payheadId) =>
      !existingPayheads.some(
        (existing) => +existing.payheadMasterId === +payheadId,
      ),
  );

  return (
    missingPayheads.map(
      (missingId) =>
        allPayheads.find((payhead) => +payhead.payheadMasterId === +missingId)
          ?.payheadName || `Unknown Payhead ID ${missingId}`,
    ) || []
  );
};

const mergeUniqueSalaryFields = (array1, array2) => {
  const existingIds = new Set(array1.map((item) => item.salaryFieldID)); // Store IDs from first array
  return [
    ...array1,
    ...array2.filter((item) => !existingIds.has(item.salaryFieldID)), // Add only unique items
  ];
};

exports.postAddGradeStructure = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      gradeName,
      gradeFrom,
      gradeTo,
      baseOnCalculation,
      companyMasterID,
      gradeSalayFields = [],
      isContractorGrade = false,
      contractorId,
      skillCategory,
      applicableYYYYMM,
      payrollFrequency = PayrollFrequencyType.MONTHLY,
    } = await req.body;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    if (
      !gradeSalayFields ||
      !Array.isArray(gradeSalayFields) ||
      !gradeSalayFields.length
    ) {
      throw new Error(
        'Grade structure cannot be created without salary fields.',
      );
    }

    if (
      baseOnCalculation == 'M' &&
      payrollFrequency &&
      payrollFrequency != PayrollFrequencyType.MONTHLY
    ) {
      throw new Error(
        'Monthly salary grades can only be used with a monthly payroll frequency.',
      );
    }

    const PFESIC_PayheadData = await Payheadmaster.findAll({
      where: {
        payheadMasterId: {
          [Sequelize.Op.in]: [4, 5, 12, 25, 66, 13, 14],
        },
        status: 1,
      },
      attributes: ['payheadMasterId', 'payheadName'],
      transaction,
    });

    const all_hrsalryfield = await HRSalaryFields.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
      include: [{ model: Payheadmaster, attributes: ['payheadName'] }],
      transaction,
    });

    const findhrsalryfield = all_hrsalryfield.filter((e) =>
      default_payheadMasterIds.includes(e.payheadMasterId),
    );
    // check for pf

    const pfdata = [...gradeSalayFields].filter((e) =>
      [4, 5, 12, 25, 66].includes(e.payheadMasterId),
    );

    if (pfdata.length > 0) {
      const missing_PFBreakup = getMissingPayheads(
        [4, 5, 12, 25, 66],
        gradeSalayFields,
        PFESIC_PayheadData.filter((e) =>
          [4, 5, 12, 25, 66].includes(e.payheadMasterId),
        ),
      );

      if (missing_PFBreakup.length) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `Add '${missing_PFBreakup.join(', ')}' to complete PF breakup`,
        });
      }
    }

    // check for esic

    const esicdata = [...gradeSalayFields].filter((e) =>
      [13, 14].includes(e.payheadMasterId),
    );

    if (esicdata.length > 0) {
      const missing_ESICBreakup = getMissingPayheads(
        [13, 14],
        gradeSalayFields,
        PFESIC_PayheadData.filter((e) => [13, 14].includes(e.payheadMasterId)),
      );

      if (missing_ESICBreakup.length) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `Add '${missing_ESICBreakup.join(', ')}' to complete ESIC breakup`,
        });
      }
    }

    // ------------ for remaining amount -------------------

    const ids = new Set(gradeSalayFields.map((i) => i.salaryFieldId));

    const missingPayheads = [
      ...new Set(
        gradeSalayFields
          .filter(
            (i) =>
              i.remainingAmtSalaryFieldID &&
              !ids.has(i.remainingAmtSalaryFieldID),
          )
          .map((i) => {
            return (
              all_hrsalryfield.find(
                (e) => e.salaryFieldID === i.remainingAmtSalaryFieldID,
              )?.Payheadmaster?.payheadName || 'Unknown Payhead'
            );
          }),
      ),
    ];

    if (missingPayheads.length) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message:
          missingPayheads.length === 1
            ? `Please add ${missingPayheads[0]} to the salary grade to allocate the remaining amount.`
            : `Please add the following payheads to the salary grade to allocate the remaining amount: ${missingPayheads.join(
                ', ',
              )}.`,
      });
    }

    // add grade

    const insert_db_status = await GradeStructure.create(
      {
        gradeName,
        gradeFrom,
        gradeTo,
        baseOnCalculation,
        companyMasterID,
        isContractorGrade,
        contractorId: isContractorGrade ? contractorId : null,
        skillCategory: isContractorGrade ? skillCategory : null,
        applicableYYYYMM: isContractorGrade ? applicableYYYYMM : null,
        payrollFrequency,
        createBy,
        createByIp,
      },
      { transaction },
    );

    const gradeStructureID = insert_db_status.gradeStructureID;

    const arrayData = [...gradeSalayFields].map((e, i) => {
      return {
        gradeStructureID: gradeStructureID,
        salaryFieldID: e.salaryFieldId,
        fieldDefaultPer: null,
        fieldFixAmount: e.fieldFixAmount
          ? e.fieldFixAmount
          : e.fieldFixAmount == 0
            ? 0
            : null,
        formula: e.formula || null,
        formulaID: e.formulaID || null,
        createBy,
        createByIp,
        salaryfieldindex: i + 1,
        salaryfieldmaxrange: e.salaryfieldmaxrange || null,
        fieldFixAmount1: e.fieldFixAmount1
          ? e.fieldFixAmount1
          : e.fieldFixAmount1 == 0
            ? 0
            : null,
        formula1: e.formula1 || null,
        formulaPreference: e.formulaPreference || null,
        remainingAmtSalaryFieldID: e.salaryfieldmaxrange
          ? e.remainingAmtSalaryFieldID
          : null,
      };
    });

    const extraFields = [...findhrsalryfield].map((e) => {
      return {
        gradeStructureID: gradeStructureID,
        salaryFieldID: e.salaryFieldID,
        fieldDefaultPer: null,
        fieldFixAmount: null,
        fieldFixAmount1: null,
        formula: null,
        formulaID: null,
        createBy,
        createByIp,
        salaryfieldindex: null,
        salaryfieldmaxrange: null,
        formula1: e.formula1 || null,
        formulaPreference: e.formulaPreference || null,
        remainingAmtSalaryFieldID: null,
      };
    });

    const mergedArray = mergeUniqueSalaryFields(extraFields, arrayData);

    // add grade salary structure
    await GradeSalaryStructure.bulkCreate(mergedArray, { transaction });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Salary Grade'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getGradeStructureById = async (req, res, next) => {
  try {
    const get_one_data = await GradeStructure.findOne({
      where: {
        gradeStructureID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          required: false,
          model: GradeSalaryStructure,
          include: [
            {
              model: HRSalaryFields,
              where: {
                payheadMasterId: {
                  [Sequelize.Op.notIn]: default_payheadMasterIds,
                },
              },
              include: [{ model: Payheadmaster, attributes: ['payheadName'] }],
            },
            {
              model: HRSalaryFields,
              as: 'RA_HSF',
              attributes: ['salaryFieldID', 'payheadMasterId'],
              include: [{ model: Payheadmaster, attributes: ['payheadName'] }],
            },
          ],
        },
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
      ],
    });

    return res.status(200).json({ status: 200, data: get_one_data });
    // }
  } catch (err) {
    next(err);
  }
};

/**
 * find data with companyMaster id
 *
 * @param {id} companyMasteID  to fetch grade structure
 */

exports.getGradeStructureByCompanyMasterId = async (req, res, next) => {
  try {
    const { companyMasterID, limit, page, searchQuery } = await req.body;

    const condition = {};

    condition.status = [0, 1];

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          gradeName: {
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

    const gradeStructure = await GradeStructure.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: companyMaster,
          as: 'companyMaster',
          attributes: ['companyName'],
        },
        {
          model: Contractor,
          attributes: ['contractorName'],
        },
      ],
    });

    for (var j = 0; j < gradeStructure.rows.length; j++) {
      let contractor = null;
      if (gradeStructure.rows[j].contractor)
        contractor = gradeStructure.rows[j].contractor.contractorName;

      gradeStructure.rows[j].dataValues.contractorName = contractor;

      let user1 = await UserMaster.findOne({
        where: {
          userMasterID: gradeStructure.rows[j].createBy,
        },
      });
      let user2 = await UserMaster.findOne({
        where: {
          userMasterID: gradeStructure.rows[j].updateBy,
        },
      });

      if (user1) {
        gradeStructure.rows[j].createBy = user1.dataValues.displayName;
      }
      if (user2) {
        gradeStructure.rows[j].updateBy = user2.dataValues.displayName;
      }
    }

    return res.status(200).json({
      status: 200,
      data: gradeStructure.rows,
      totalcount: gradeStructure.count,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * update data
 *
 * @param {id} gradeStructureID  to update id
 */

exports.postUpdateGradeStructure = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      gradeStructureID,
      gradeName,
      gradeFrom,
      gradeTo,
      baseOnCalculation,
      companyMasterID,
      gradeSalayFields = [],
      isContractorGrade = false,
      contractorId,
      skillCategory,
      applicableYYYYMM,
      payrollFrequency = PayrollFrequencyType.MONTHLY,
    } = await req.body;

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    if (
      !gradeSalayFields ||
      !Array.isArray(gradeSalayFields) ||
      !gradeSalayFields.length
    ) {
      throw new Error(
        'Grade structure cannot be created without salary fields.',
      );
    }

    const baseOnDays = await SalaryBasedOnDays.findOne({
      where: {
        gradeStructureID,
      },
    });

    if (baseOnDays) {
      const allSalaryFieldIds = [...gradeSalayFields].map(
        (e) => e.salaryFieldId,
      );

      const otherThanBasic = await HRSalaryFields.findOne({
        where: {
          salaryFieldID: allSalaryFieldIds,
          salaryFieldSrNo: salaryFieldSrNoFields.EARNING,
          payheadMasterId: {
            [Sequelize.Op.ne]: payheadMasterIdsMapping.BASIC,
          },
        },
      });

      if (otherThanBasic)
        throw new Error(
          'Based-on-Days salary is already configured for this grade. Only BASIC payhead is allowed.',
        );
    }

    const grade = await GradeStructure.findByPk(gradeStructureID);

    if (!grade) throw new Error('Salary Grade not found!');

    isContractorGrade = grade.isContractorGrade;

    if (
      baseOnCalculation == 'M' &&
      payrollFrequency &&
      payrollFrequency != PayrollFrequencyType.MONTHLY
    ) {
      throw new Error(
        'Monthly salary grades can only be used with a monthly payroll frequency.',
      );
    }

    const find_data = await executeQuery(
      `select sm.* from "gradeStructures" as gs inner join "gradeSalaryStructures" as gss on gs."gradeStructureID"=gss."gradeStructureID"
        inner join "hrSalaryMasters" as sm on gss."gradeSalaryStructureID"=sm."gradeSalaryStructureID"
        where gs."gradeStructureID"=` +
        ':gradeStructureID' +
        ` limit 1`,
      {
        replacements: {
          gradeStructureID: gradeStructureID,
        },
      },
    );

    if (find_data.length > 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message:
          "You have already assign this grade structure to employee . So, you can't update it.",
      });
    }

    const PFESIC_PayheadData = await Payheadmaster.findAll({
      where: {
        payheadMasterId: {
          [Sequelize.Op.in]: [4, 5, 12, 25, 66, 13, 14],
        },
        status: 1,
      },
      attributes: ['payheadMasterId', 'payheadName'],
      transaction,
    });

    const all_hrsalryfield = await HRSalaryFields.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
      include: [{ model: Payheadmaster, attributes: ['payheadName'] }],
      transaction,
    });

    const findhrsalryfield = all_hrsalryfield.filter((e) =>
      default_payheadMasterIds.includes(e.payheadMasterId),
    );

    // check for pf

    const pfdata = [...gradeSalayFields].filter((e) =>
      [4, 5, 12, 25, 66].includes(e.payheadMasterId),
    );

    if (pfdata.length > 0) {
      const missing_PFBreakup = getMissingPayheads(
        [4, 5, 12, 25, 66],
        gradeSalayFields,
        PFESIC_PayheadData.filter((e) =>
          [4, 5, 12, 25, 66].includes(e.payheadMasterId),
        ),
      );

      if (missing_PFBreakup.length) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `Add '${missing_PFBreakup.join(', ')}' to complete PF breakup`,
        });
      }
    }

    // check for esic

    const esicdata = [...gradeSalayFields].filter((e) =>
      [13, 14].includes(e.payheadMasterId),
    );

    if (esicdata.length > 0) {
      const missing_ESICBreakup = getMissingPayheads(
        [13, 14],
        gradeSalayFields,
        PFESIC_PayheadData.filter((e) => [13, 14].includes(e.payheadMasterId)),
      );

      if (missing_ESICBreakup.length) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `Add '${missing_ESICBreakup.join(', ')}' to complete ESIC breakup`,
        });
      }
    }

    // ------------ for remaining amount -------------------

    const ids = new Set(gradeSalayFields.map((i) => i.salaryFieldId));

    const missingPayheads = [
      ...new Set(
        gradeSalayFields
          .filter(
            (i) =>
              i.remainingAmtSalaryFieldID &&
              !ids.has(i.remainingAmtSalaryFieldID),
          )
          .map((i) => {
            return (
              all_hrsalryfield.find(
                (e) => e.salaryFieldID === i.remainingAmtSalaryFieldID,
              )?.Payheadmaster?.payheadName || 'Unknown Payhead'
            );
          }),
      ),
    ];

    if (missingPayheads.length) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message:
          missingPayheads.length === 1
            ? `Please add ${missingPayheads[0]} to the salary grade to allocate the remaining amount.`
            : `Please add the following payheads to the salary grade to allocate the remaining amount: ${missingPayheads.join(
                ', ',
              )}.`,
      });
    }

    // delete grade salary structure

    await GradeSalaryStructure.destroy({
      where: { gradeStructureID: gradeStructureID },
      transaction,
    });

    // update grade structure
    grade.gradeName = gradeName;
    grade.gradeFrom = gradeFrom;
    grade.gradeTo = gradeTo;
    grade.baseOnCalculation = baseOnCalculation;
    grade.companyMasterID = companyMasterID;
    grade.payrollFrequency = payrollFrequency;
    grade.updateBy = updateBy;
    grade.updateByIp = updateByIp;

    if (isContractorGrade) {
      grade.contractorId = contractorId;
      grade.skillCategory = skillCategory;
      grade.applicableYYYYMM = applicableYYYYMM;
    }

    await grade.save({ transaction });

    const arrayData = [...gradeSalayFields].map((e, i) => {
      return {
        gradeStructureID: gradeStructureID,
        salaryFieldID: e.salaryFieldId,
        fieldDefaultPer: null,
        fieldFixAmount: e.fieldFixAmount
          ? e.fieldFixAmount
          : e.fieldFixAmount == 0
            ? 0
            : null,
        formula: e.formula || null,
        formulaID: e.formulaID || null,
        createBy: updateBy,
        createByIp: updateByIp,
        salaryfieldindex: e.salaryfieldindex || null,
        salaryfieldmaxrange: e.salaryfieldmaxrange || null,
        fieldFixAmount1: e.fieldFixAmount1
          ? e.fieldFixAmount1
          : e.fieldFixAmount1 == 0
            ? 0
            : null,
        formula1: e.formula1 || null,
        formulaPreference: e.formulaPreference || null,
        remainingAmtSalaryFieldID: e.salaryfieldmaxrange
          ? e.remainingAmtSalaryFieldID
          : null,
      };
    });

    const extraFields = [...findhrsalryfield].map((e) => {
      return {
        gradeStructureID: gradeStructureID,
        salaryFieldID: e.salaryFieldID,
        fieldDefaultPer: null,
        fieldFixAmount: null,
        fieldFixAmount1: null,
        formula: null,
        formulaID: null,
        createBy: updateBy,
        createByIp: updateByIp,
        salaryfieldindex: null,
        salaryfieldmaxrange: null,
        formula1: null,
        formulaPreference: null,
        remainingAmtSalaryFieldID: null,
      };
    });

    const mergedArray = mergeUniqueSalaryFields(extraFields, arrayData);

    // add grade salary structure
    await GradeSalaryStructure.bulkCreate(mergedArray, { transaction });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Salary Grade'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * update status
 *
 * @param {id} gradeStructureID  to update status of grade structure
 */

exports.poststatuschange = async (req, res, next) => {
  try {
    let { gradeStructureID, status } = await req.body;

    await sequelize.transaction(async (t) => {
      if (status == '1') {
        await GradeStructure.update(
          {
            status: '1',
          },
          {
            where: { gradeStructureID: gradeStructureID, status: ['1', '0'] },
            transaction: t,
          },
        );
      } else {
        const find_data = await HRSalaryMasterFields.findOne({
          include: [
            {
              required: true,
              model: GradeSalaryStructure,
              where: {
                gradeStructureID,
              },
            },
            {
              required: true,
              model: UserMaster,
              where: { status: { [Sequelize.Op.in]: [0, 1] } },
            },
          ],
        });

        if (find_data) {
          return res.status(200).json({
            status: 401,
            message:
              "You have already assign this grade structure to employee . So, you can't deactive it.",
          });
        }

        const data = await SalaryBasedOnDays.findOne({
          where: {
            gradeStructureID,
          },
        });

        if (data)
          return res.status(200).json({
            status: 401,
            message:
              "You have already used this grade in based on days salary . So, you can't deactive it.",
          });

        await GradeStructure.update(
          {
            status: '0',
          },
          {
            where: { gradeStructureID: gradeStructureID, status: ['1', '0'] },
            transaction: t,
          },
        );
      }
    });

    return res.status(200).json({
      status: 200,
      message:
        status == 0
          ? message.usermessage.deactiveMessage('Salary Grade')
          : message.usermessage.activeMessage('Salary Grade'),
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

/**
 * delete by i
 *
 * @param {id} gradeStructureID  to delete id
 */
exports.postDeleteGradeStructureById = async (req, res, next) => {
  try {
    const { gradeStructureID } = await req.body;

    const find_data = await HRSalaryMasterFields.findOne({
      include: [
        {
          required: true,
          model: GradeSalaryStructure,
          where: {
            gradeStructureID,
          },
        },
        {
          required: true,
          model: UserMaster,
          where: { status: { [Sequelize.Op.in]: [0, 1] } },
        },
      ],
    });

    if (find_data) {
      return res.status(200).json({
        status: 401,
        message:
          "You have already assign this grade structure to employee . So, you can't delete it.",
      });
    }

    const data = await SalaryBasedOnDays.findOne({
      where: {
        gradeStructureID,
      },
    });

    if (data)
      return res.status(200).json({
        status: 401,
        message:
          "You have already used this grade in based on days salary . So, you can't delete it.",
      });

    await GradeStructure.update(
      {
        status: 2,
      },
      {
        where: { gradeStructureID: gradeStructureID },
      },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.gradestructuredelete,
    });
  } catch (err) {
    next(err);
  }
};

exports.getGradeStructureByCompanyId = async (req, res, next) => {
  try {
    const get_one_data = await GradeStructure.findAll({
      where: {
        companyMasterID: req.params.id,
        status: 1,
      },
    });
    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getptvaluebycompanystate = async (req, res, next) => {
  try {
    let get_one_data = await companyMaster.findOne({
      where: {
        companyMasterID: req.body.companyMasterID,
        status: 1,
      },
      include: [
        {
          model: CityMaster,
          attributes: ['stateMasterID'],
          include: [{ model: StateMaster, attributes: ['stateMasterID'] }],
        },
      ],
    });

    let get_one_data1 = null;

    if (get_one_data && get_one_data.cityMaster) {
      get_one_data1 = await ProfessionalTaxSlabMaster.findOne({
        where: {
          stateMasterID: get_one_data.cityMaster.stateMasterID,
          fromAmount: { [Sequelize.Op.lte]: req.body.maxamount },
          toAmount: { [Sequelize.Op.gte]: req.body.maxamount },
          status: 1,
        },
      });
    }

    return res.status(200).json({ status: 200, data: get_one_data1 });
  } catch (err) {
    next(err);
  }
};

exports.getctcvalue = async (req, res, next) => {
  try {
    const {
      ctc,
      gradeid,
      stateid,
      AmountIn,
      userMasterID,
      yearMonth,
      corporationId = null,
    } = req.body;

    let {
      skillCategory = null,
      gender = null,
      companyMasterID = null,
    } = req.body;

    const grade_salary_structure_data = await GradeSalaryStructure.findAll({
      raw: true,
      where: {
        gradeStructureID: gradeid,
      },
      include: [
        {
          model: HRSalaryFields,
          attributes: [],
          include: [{ model: Payheadmaster, attributes: [] }],
        },
        {
          model: GradeStructure,
          attributes: [],
        },
      ],
      order: [
        [
          { model: HRSalaryFields, as: 'hrSalaryField' },
          'salaryFieldSrNo',
          'ASC',
        ],
        ['salaryfieldindex', 'ASC'],

        // Order by payheadName in Payheadmaster
        [
          { model: HRSalaryFields, as: 'hrSalaryField' },
          { model: Payheadmaster, as: 'Payheadmaster' },
          'payheadName',
          'ASC',
        ],
      ],
      attributes: [
        'gradeSalaryStructureID',
        'gradeStructureID',
        'salaryFieldID',
        'fieldFixAmount',
        'formula',
        'salaryfieldindex',
        'salaryfieldmaxrange',
        'fieldFixAmount1',
        'formula1',
        'formulaPreference',
        [sequelize.col('hrSalaryField.payheadMasterId'), 'payheadMasterId'],
        [sequelize.col('hrSalaryField.salaryFieldSide'), 'salaryFieldSide'],
        [
          sequelize.col('hrSalaryField.salaryFieldAttanChk'),
          'salaryFieldAttanChk',
        ],
        [
          sequelize.col('hrSalaryField.salaryFieldWhenMonth'),
          'salaryFieldWhenMonth',
        ],
        [sequelize.col('hrSalaryField.salaryFieldSrNo'), 'salaryFieldSrNo'],
        [sequelize.col('hrSalaryField.companyMasterID'), 'companyMasterID'],
        [
          sequelize.col('hrSalaryField.payheadDisplayName'),
          'payheadDisplayName',
        ],
        // [sequelize.col('hrSalaryField.roundOffType'), 'roundOffType'],
        [sequelize.col('hrSalaryField.considerIn'), 'considerIn'],
        [
          sequelize.col('hrSalaryField.Payheadmaster.payheadName'),
          'payheadName',
        ],
        [
          sequelize.col('gradeStructure.baseOnCalculation'),
          'baseOnCalculation',
        ],

        [sequelize.col('hrSalaryField.assignSalaryRound'), 'assignSalaryRound'],
        [
          sequelize.col('hrSalaryField.assignSalaryRoundNo'),
          'assignSalaryRoundNo',
        ],
        [
          sequelize.col('hrSalaryField.assignSalaryRoundOffType'),
          'assignSalaryRoundOffType',
        ],
      ],
    });

    let userdata = null;
    let salaryCalculationAct = 'S';

    if (userMasterID) {
      userdata = await UserMaster.findOne({
        where: {
          userMasterID,
        },
        include: [
          {
            required: false,
            model: EmployeeSkillCategory,
            where: {
              applicableYYYYMM: {
                [Sequelize.Op.lte]: +yearMonth,
              },
              [Sequelize.Op.or]: [
                {
                  endYYYYMM: {
                    [Sequelize.Op.gte]: +yearMonth,
                  },
                },
                {
                  endYYYYMM: {
                    [Sequelize.Op.is]: null,
                  },
                },
              ],
            },
          },
          {
            model: EmployeeJoiningDetails,
            attributes: ['salaryCalculationAct'],
          },
        ],
        attributes: ['userMasterID', 'gender', 'companyMasterId'],
      });

      gender = userdata ? userdata.gender : '';
      companyMasterID = userdata?.companyMasterId || companyMasterID;

      skillCategory =
        userdata?.employeeSkillCategories?.[0]?.skillCategory || null;

      salaryCalculationAct =
        userdata?.employeeJoiningDetails?.[0]?.salaryCalculationAct || 'S';
    }

    const payhead_B_C = await HRSalaryFields.findAll({
      where: {
        salaryFieldSrNo: {
          [Sequelize.Op.in]: ['B', 'C'],
        },
        status: 1,
        companyMasterID,
      },
      attributes: ['payheadMasterId', 'salaryFieldSrNo'],
      include: [{ model: Payheadmaster, attributes: ['payheadName'] }],
    });

    // Find if min wages is used in formula or formula1
    const hasMinimumWages = grade_salary_structure_data.some(
      (item) =>
        (item.formula && item.formula.includes('Minimum Wages')) ||
        (item.formula1 && item.formula1.includes('Minimum Wages')),
    );

    if (hasMinimumWages && !skillCategory) {
      return res.status(200).json({
        status: 401,
        message: 'Skill category is required for employees with minimum wages.',
      });
    }

    const { salaryStructureData: data, minWagesMasterId } =
      await assignSalaryStructure(
        grade_salary_structure_data,
        ctc,
        stateid,
        AmountIn,
        yearMonth,
        gender,
        corporationId,
        companyMasterID,
        skillCategory,
        0,
        null,
        hasMinimumWages,
        [],
        null,
        payhead_B_C,
        salaryCalculationAct,
      );

    return res
      .status(200)
      .json({ status: 200, data, skillCategory, minWagesMasterId });
  } catch (err) {
    next(err);
  }
};

exports.getctcvalue1 = async (req, res, next) => {
  try {
    const {
      ctc,
      stateid,
      AmountIn,
      yearMonth,
      userMasterID,
      corporationId = null,
      payheadMasterId,
      payheadAmount,
      grade_salary_structure,
    } = req.body;

    let {
      skillCategory = null,
      gender = null,
      companyMasterID = null,
    } = req.body;

    let userdata = null;
    let salaryCalculationAct = 'S';

    if (userMasterID) {
      userdata = await UserMaster.findOne({
        where: {
          userMasterID,
        },
        include: [
          {
            required: false,
            model: EmployeeSkillCategory,
            where: {
              applicableYYYYMM: {
                [Sequelize.Op.lte]: +yearMonth,
              },
              [Sequelize.Op.or]: [
                {
                  endYYYYMM: {
                    [Sequelize.Op.gte]: +yearMonth,
                  },
                },
                {
                  endYYYYMM: {
                    [Sequelize.Op.is]: null,
                  },
                },
              ],
            },
          },
          {
            model: EmployeeJoiningDetails,
            attributes: ['salaryCalculationAct'],
          },
        ],
        attributes: ['userMasterID', 'gender', 'companyMasterId'],
      });

      gender = userdata ? userdata.gender : '';
      companyMasterID = userdata?.companyMasterId || companyMasterID;

      skillCategory =
        userdata?.employeeSkillCategories?.[0]?.skillCategory || null;

      salaryCalculationAct =
        userdata?.employeeJoiningDetails?.[0]?.salaryCalculationAct || 'S';
    }

    const payhead_B_C = await HRSalaryFields.findAll({
      where: {
        salaryFieldSrNo: {
          [Sequelize.Op.in]: ['B', 'C'],
        },
        status: 1,
        companyMasterID,
      },
      attributes: ['payheadMasterId', 'salaryFieldSrNo'],
      include: [{ model: Payheadmaster, attributes: ['payheadName'] }],
    });

    // Find if min wages is used in formula or formula1
    const hasMinimumWages = grade_salary_structure.some(
      (item) =>
        (item.formula && item.formula.includes('Minimum Wages')) ||
        (item.formula1 && item.formula1.includes('Minimum Wages')),
    );

    if (hasMinimumWages && !skillCategory) {
      return res.status(200).json({
        status: 401,
        message: 'Skill category is required for employees with minimum wages.',
      });
    }

    const { salaryStructureData: data, minWagesMasterId } =
      await assignSalaryStructure(
        grade_salary_structure,
        ctc,
        stateid,
        AmountIn,
        yearMonth,
        gender,
        corporationId,
        companyMasterID,
        skillCategory,
        payheadMasterId,
        payheadAmount,
        hasMinimumWages,
        [],
        null,
        payhead_B_C,
        salaryCalculationAct,
      );

    res
      .status(200)
      .json({ status: 200, data, skillCategory, minWagesMasterId });
  } catch (err) {
    next(err);
  }
};

exports.getGradeForAssignStructure = async (req, res, next) => {
  try {
    const {
      isAssignStructure = false,
      amount,
      companyMasterID,
      userMasterID,
      YYYYMM,
    } = req.body;

    if (!companyMasterID || !userMasterID)
      throw new Error('Company and user are required fields');

    const includeConditions = [
      {
        model: EmployeeJoiningDetails,
        attributes: ['contractorId', 'joiningDate', 'payrollFrequency'],
      },
    ];

    const skillCategoryInclude = {
      required: false,
      model: EmployeeSkillCategory,
    };

    const date = asiaKolkataDateTime(new Date()).slice(0, 10);

    let month = YYYYMM || String(date).slice(0, 4) + String(date).slice(5, 7);

    if (month) {
      skillCategoryInclude.where = {
        applicableYYYYMM: {
          [Sequelize.Op.lte]: +month,
        },
        [Sequelize.Op.or]: [
          {
            endYYYYMM: {
              [Sequelize.Op.gte]: +month,
            },
          },
          {
            endYYYYMM: {
              [Sequelize.Op.eq]: null,
            },
          },
        ],
      };
    }

    includeConditions.push(skillCategoryInclude);

    const userData = await UserMaster.findOne({
      where: { userMasterID },
      include: includeConditions,
    });

    if (!userData) throw new Error('User not found!');

    const contractorId =
      userData.employeeJoiningDetails?.[0]?.contractorId || null;
    const skillCategory =
      userData.employeeSkillCategories?.[0]?.skillCategory || null;

    const joingdate = userData.employeeJoiningDetails?.[0]?.joiningDate || null;

    const joiningMonth = joingdate
      ? String(joingdate).slice(0, 4) + String(joingdate).slice(5, 7)
      : null;

    month = YYYYMM || joiningMonth;

    const payrollFrequency =
      userData.employeeJoiningDetails?.[0]?.payrollFrequency || 'Monthly';

    const condition = {
      companyMasterID,
      status: [0, 1],
    };

    // if structure is not assigned
    if (!isAssignStructure) {
      condition.isContractorGrade = false;
      if (showPayrollFrequency) condition.payrollFrequency = payrollFrequency;
    }

    if (amount) {
      ((condition.gradeFrom = {
        [Sequelize.Op.lte]: +amount,
      }),
        (condition.gradeTo = {
          [Sequelize.Op.gte]: +amount,
        }));
    }

    // if only contractor users

    if (!isAssignStructure && contractorId) {
      condition.contractorId = contractorId;
      condition.isContractorGrade = true;

      if (month) {

         const skillCategoryCondition = skillCategory
    ? `AND "gradeStructures"."skillCategory" = '${String(skillCategory).replace(/'/g, "''")}'`
    : `AND "gradeStructures"."skillCategory" IS NULL`;

        condition.applicableYYYYMM = {
          [Sequelize.Op.eq]: Sequelize.literal(`(
                      SELECT MAX("applicableYYYYMM") 
                      FROM "gradeStructures"
                      WHERE "gradeStructures"."contractorId" = ${contractorId} 
                      AND "gradeStructures"."applicableYYYYMM" <= ${month} 
                      ${skillCategoryCondition}
                      and "gradeStructures"."status" IN (0, 1)
                    )`),
        };
      }
      if (skillCategory) {
        condition.skillCategory = skillCategory;
      }
    }

    const grade = await GradeStructure.findAll({
      raw: true,
      where: condition,
      attributes: [
        ['gradeStructureID', 'gsid'],
        ['baseOnCalculation', 'calcon'],
        ['status', 'gstatus'],
        ['gradeName', 'gsname'],
      ],
    });

    return res.status(200).json({
      status: 200,
      data: grade,
    });
  } catch (error) {
    next(error);
  }
};

exports.getGradeForAssignStructureByCompany = async (req, res, next) => {
  try {
    const {
      isAssignStructure = false,
      amount,
      companyMasterID,
      YYYYMM,
      contractorId,
      skillCategory,
    } = req.body;

    if (!companyMasterID) throw new Error('Company is required fields');

    const condition = {
      companyMasterID,
      status: [0, 1],
    };

    // if structure is not assigned
    if (!isAssignStructure) {
      condition.isContractorGrade = false;
    }

    if (amount) {
      ((condition.gradeFrom = {
        [Sequelize.Op.lte]: +amount,
      }),
        (condition.gradeTo = {
          [Sequelize.Op.gte]: +amount,
        }));
    }

    // if only contractor users

    if (!isAssignStructure && contractorId) {
      condition.contractorId = contractorId;
      condition.isContractorGrade = true;

      if (YYYYMM) {

         const skillCategoryCondition = skillCategory
    ? `AND "gradeStructures"."skillCategory" = '${String(skillCategory).replace(/'/g, "''")}'`
    : `AND "gradeStructures"."skillCategory" IS NULL`;

        condition.applicableYYYYMM = {
          [Sequelize.Op.eq]: Sequelize.literal(`(
                      SELECT MAX("applicableYYYYMM") 
                      FROM "gradeStructures"
                      WHERE "gradeStructures"."contractorId" = ${contractorId} 
                      AND "gradeStructures"."applicableYYYYMM" <= ${YYYYMM} 
                      ${skillCategoryCondition}
                      and "gradeStructures"."status" IN (0, 1)
                    )`),
        };
      }
      if (skillCategory) {
        condition.skillCategory = skillCategory;
      }
    }

    const grade = await GradeStructure.findAll({
      raw: true,
      where: condition,
      attributes: [
        ['gradeStructureID', 'gsid'],
        ['baseOnCalculation', 'calcon'],
        ['status', 'gstatus'],
        ['gradeName', 'gsname'],
      ],
    });

    return res.status(200).json({
      status: 200,
      data: grade,
    });
  } catch (error) {
    next(error);
  }
};

exports.exportGradeStructure = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;
    const allowedKeys = ['companyMasterID'];
    const invalidKeys = invalidKeyParams(req.body, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid query parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const getGradeStructures = await GradeStructure.findAll({
      attributes: [
        'companyMasterID',
        'gradeName',
        'baseOnCalculation',
        'gradeFrom',
        'gradeTo',
        'payrollFrequency',
        'applicableYYYYMM',
      ],
      where: {
        companyMasterID: { [Sequelize.Op.in]: companyMasterID },
        status: { [Sequelize.Op.in]: [1] },
      },
      include: [
        {
          required: false,
          model: GradeSalaryStructure,
          attributes: [
            'fieldFixAmount',
            'formula',
            'formulaPreference',
            'fieldFixAmount1',
            'formula1',
          ],
          include: [
            {
              model: HRSalaryFields,
              attributes: ['salaryFieldSrNo', 'payheadMasterId'],
              where: {
                payheadMasterId: {
                  [Sequelize.Op.notIn]: default_payheadMasterIds,
                },
              },
              include: [{ model: Payheadmaster, attributes: ['payheadName'] }],
            },
          ],
        },
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
      ],
      raw: false,
    });

    const companyDatas = await companyMaster.findAll({
      attributes: ['companyMasterID', 'companyName'],
      where: {
        companyMasterID: { [Sequelize.Op.in]: companyMasterID },
      },
    });

    const companiesWithGrades = companyDatas.map((company) => {
      return {
        companyMasterID: company.companyMasterID,
        companyName: company.companyName,
        grades: getGradeStructures.filter(
          (grade) => grade.companyMasterID === company.companyMasterID,
        ),
      };
    });

    const exportDir = path.join(__dirname, '../uploads/Grade-Structure');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const fileName = `SalaryGrade_${new Date().toLocaleDateString('en-GB').replace(/\//g, '_')}.xlsx`;
    const filePath = path.join(exportDir, fileName);

    const workbook = new Excel.Workbook({
      filename: filePath,
    });

    const comPanyNames = [];
    let counter = 1;
    for (const companyGrade of companiesWithGrades) {
      let formattedName =
        companyGrade?.companyName.length > 31
          ? companyGrade.companyName.slice(0, 28)
          : companyGrade.companyName;

      if (!comPanyNames.includes(formattedName)) {
        comPanyNames.push(formattedName);
      } else {
        comPanyNames.push(formattedName + counter);
        formattedName = formattedName + counter;
      }

      const sheet = workbook.addWorksheet(formattedName || '');
      sheet.columns = [
        { header: 'Company Name', key: 'companyName', width: 30 },
        { header: 'Grade Name', key: 'gradeName', width: 30 },
        {
          header: 'Salary Basis',
          key: 'salaryBasis',
          width: 50,
        },
        {
          header: 'Payroll Frequency',
          key: 'payrollFrequency',
          width: 50,
        },
        {
          header: 'Applicable Year and Month',
          key: 'applicableYYYYMM',
          width: 20,
        },
        { header: 'Grade From', key: 'gradeFrom', width: 20 },
        { header: 'Grade To', key: 'gradeTo', width: 20 },
      ];

      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFDDEBF7' },
        };
      });

      for (const grade of companyGrade.grades) {
        const row = sheet.addRow([
          grade?.companyMaster?.companyName || '',
          grade?.gradeName || '',
          salaryOptions[grade.baseOnCalculation],
          grade?.payrollFrequency || '',
          (grade?.applicableYYYYMM
            ? String(grade.applicableYYYYMM).slice(0, 4) +
              '-' +
              String(grade.applicableYYYYMM).slice(4, 6)
            : '') || '',
          grade?.gradeFrom || '',
          grade?.gradeTo || '',
          'Grade Structure',
        ]);

        row.alignment = { horizontal: 'center', vertical: 'middle' };
        row.alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.mergeCells(`H${row.number}:M${row.number}`);
        row.getCell(8).font = { bold: true };
        row.getCell(8).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        const payheadHeader = sheet.addRow([
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'Sr. No',
          'Payhead Name',
          'Group',
          'Fix Amount',
          'Formula',
          'Preference',
        ]);

        payheadHeader.eachCell((cell, colNumber) => {
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFF' },
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };

          switch (colNumber) {
            case 6:
              sheet.getColumn(colNumber).width = 10;
              break;
            case 7:
              sheet.getColumn(colNumber).width = 25;
              break;
            case 8:
              sheet.getColumn(colNumber).width = 10;
              break;
            case 9:
              sheet.getColumn(colNumber).width = 15;
              break;
            case 10:
              sheet.getColumn(colNumber).width = 25;
              break;
            case 11:
              sheet.getColumn(colNumber).width = 15;
              break;
            default:
              sheet.getColumn(colNumber).width = 20;
          }
        });

        let lastRow;
        for (const [index, item] of grade.gradeSalaryStructures.entries()) {
          const firstRow = sheet.addRow([
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            index + 1,
            item?.hrSalaryField?.Payheadmaster?.payheadName || '',
            item?.hrSalaryField?.salaryFieldSrNo || '',
            item?.fieldFixAmount || '',
            item?.formula || '',
            item?.formulaPreference || '',
          ]);

          if (item?.fieldFixAmount1 || item?.formula1) {
            const secondRow = sheet.addRow([
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              item?.fieldFixAmount1 || '',
              item?.formula1 || '',
              '',
            ]);

            [firstRow, secondRow].forEach((r, idx) => {
              r.eachCell((cell, colNumber) => {
                cell.alignment = {
                  horizontal: 'center',
                  vertical: 'middle',
                  wrapText: true,
                };
                cell.border = {
                  top: { style: idx === 1 ? 'thin' : 'none' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' },
                };
              });
            });

            const r1 = firstRow.number;
            const r2 = secondRow.number;

            sheet.mergeCells(`H${r1}:H${r2}`);
            sheet.mergeCells(`I${r1}:I${r2}`);
            sheet.mergeCells(`J${r1}:J${r2}`);
            sheet.mergeCells(`M${r1}:M${r2}`);

            lastRow = secondRow;
          } else {
            firstRow.eachCell((cell) => {
              cell.alignment = {
                horizontal: 'center',
                vertical: 'middle',
                wrapText: true,
              };
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
              };
            });

            lastRow = firstRow;
          }
        }

        if (lastRow) {
          const endRow = lastRow.number;
          sheet.mergeCells(`A${row.number}:A${endRow}`);
          sheet.mergeCells(`B${row.number}:B${endRow}`);
          sheet.mergeCells(`C${row.number}:C${endRow}`);
          sheet.mergeCells(`D${row.number}:D${endRow}`);
          sheet.mergeCells(`E${row.number}:E${endRow}`);
          sheet.mergeCells(`F${row.number}:F${endRow}`);
          sheet.mergeCells(`G${row.number}:G${endRow}`);
        }
        sheet.addRow([]);
      }
      counter++;
    }

    res.attachment(`${fileName}.xlsx`);
    res.set({ 'Access-Control-Expose-Headers': '*' });

    return workbook.xlsx.write(res);
  } catch (error) {
    next(error);
  }
};

function invalidKeyParams(query, allowedKeys) {
  return Object.keys(query).filter((key) => !allowedKeys.includes(key));
}
