const Sequelize = require('sequelize');
const HRSalaryMaster = require('../models/hrSalaryMaster');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const GradeSalaryStructure = require('../models/gradeSalaryStructure');
const { executeQuery } = require('./common.controller');
const HRSalaryTrasaction = require('../models/hrSalaryTransaction');
const {
  month_dict,
  getUserSalaryMasterByMonth,
  getRoundOffSalary,
  getDateRangesByType,
  asiaKolkataDateTime,
  assignSalaryStructure,
  infixtopostfix,
  isNumeric,
  getLastUserSalaryMaster,
  sendNotification,
  formatMonth,
} = require('../utils/commonUtilFunctions');
const GradeStructure = require('../models/gradeStructure');
const HRSalaryFields = require('../models/hrSalaryFields');
const Payheadmaster = require('../models/payhead');
const { generateExcelforSalaryStructure } = require('../utils/exportData');
const { showEmployerLWF, showActualEDLI } = require('../utils/labelUtils');
const {
  PayrollFrequencyType,
  employeementTypeEnum,
  roleType,
  default_payheadMasterIds,
  payheadMasterIdsMapping,
  notIncludePyaheadIds,
  lwfDeductionMethodEnum,
  authorizationMasterTypes,
  AuthorizationStatusType,
  authorizationCriteriaType,
  notificationTitleTypes,
  notificationScreentTypes,
  exclude_payheadMasterIds,
} = require('../utils/dbUtils');
const { cond } = require('lodash');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const { statusCodes } = require('../utils/commonVars');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeSkillCategory = require('../models/employeeSkillCategory');
const { required } = require('@hapi/joi');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const UserMaster = require('../models/userMaster');
const StateMaster = require('../models/statemaster');
const Corporation = require('../models/corporation');
const moment = require('moment');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const readXlsxFile = require('read-excel-file/node');
const MinWagesMaster = require('../models/minWagesMaster');
const ProfessionalTaxSlabMaster = require('../models/professionaltaxmaster');
const {
  FormulaPreferenceEnum,
  PTCalculationEnum,
  SkillCategoryType,
} = require('../utils/dbUtils');
const crypto = require('crypto');
const EmployeeEmployeement = require('../models/employeeEmployeement');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const LwfMaster = require('../models/lwfMaster');
const AuthorizationMaster = require('../models/authorizationMaster');
const SalaryIncrementRequest = require('../models/salaryIncrementRequest');
const FormAuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const SalaryIncrementRequestDetails = require('../models/salaryIncrementRequestDetails');
const SalaryIncrementRequestAuthorization = require('../models/salaryIncrementRequestAuthorization');
const UserInbox = require('../models/UserInbox');

async function getSalaryMasterByUserIdandMonth(
  userMasterID,
  month = null,
  startdate = null,
  enddate = null,
) {
  if (!userMasterID) return { salaryMasterData: [], applicableFrom: '' };

  const currentDate = new Date().toISOString().slice(0, 10);

  const currentMonth =
    month ?? String(currentDate).slice(0, 4) + String(currentDate).slice(5, 7);

  let startDate = null;
  let endDate = null;

  const joining = await EmployeeJoiningDetails.findOne({
    where: {
      userMasterID,
    },
    attributes: ['payrollFrequency'],
  });

  const payrollFrequency =
    joining?.payrollFrequency || PayrollFrequencyType.MONTHLY;

  if (
    [PayrollFrequencyType.FORTNIGHTLY, PayrollFrequencyType.WEEKLY].includes(
      payrollFrequency,
    )
  ) {
    if (startdate && enddate) {
      startDate = startdate;
      endDate = enddate;
    } else {
      const year = String(currentDate).slice(0, 4);

      const dateRanges =
        getDateRangesByType(payrollFrequency, year)?.find(
          (e) =>
            new Date(e.from) <= new Date(currentDate) &&
            new Date(e.to) >= new Date(currentDate),
        ) || null;

      if (dateRanges) {
        startDate = dateRanges.from;
        endDate = dateRanges.to;
      }
    }
  }

  const allData = await getUserSalaryMasterByMonth(
    userMasterID,
    currentMonth,
    payrollFrequency,
    startDate,
    endDate,
  );

  const excludeIds = [1, 50, 92];

  // not include LWF company side

  if (!showEmployerLWF) excludeIds.push(59);

  const finalData = allData.filter(
    (e) => !excludeIds.includes(+e.payheadMasterId),
  );
  const Net_Ctc_Gross = allData.filter((e) =>
    [1, 50, 92].includes(+e.payheadMasterId),
  );

  let yearly_aTotal = 0;
  let yearly_bTotal = 0;
  let yearly_extra_aTotal = 0;
  let yearly_cTotal = 0;

  for (let i = 0; i < finalData.length; i++) {
    let length = 12;
    if (finalData[i].salaryFieldWhenMonth[0] != 0) {
      length = finalData[i].salaryFieldWhenMonth.length;
    }

    let amount = +finalData[i].EmployeeSalaryAmount;

    // for EDLI

    if (+finalData[i].payheadMasterId == 66 && showActualEDLI) {
      amount = getRoundOffSalary(
        +finalData[i].ActualEmployeeSalaryAmount,
        finalData[i].assignSalaryRound,
        finalData[i].assignSalaryRoundOffType,
        finalData[i].assignSalaryRoundNo,
      );
      finalData[i].showActualvalue = amount;
      finalData[i].showYearlyActualvalue = getRoundOffSalary(
        +finalData[i].ActualEmployeeSalaryAmount * length,
        finalData[i].assignSalaryRound,
        finalData[i].assignSalaryRoundOffType,
        finalData[i].assignSalaryRoundNo,
      );
    }

    const yearlyAmount = amount * length;

    if (
      finalData[i].salaryFieldSrNo == 'A' &&
      finalData[i].considerIn != 'net'
    ) {
      yearly_aTotal += +yearlyAmount;
    }

    if (
      finalData[i].salaryFieldSrNo == 'A' &&
      finalData[i].considerIn == 'net'
    ) {
      yearly_extra_aTotal += +yearlyAmount;
    }

    if (finalData[i].salaryFieldSrNo == 'B') {
      yearly_bTotal += +yearlyAmount;
    }

    if (finalData[i].salaryFieldSrNo == 'C') {
      yearly_cTotal += +yearlyAmount;
    }

    finalData[i].finalvalue = +amount;
    finalData[i].yearly_finalvalue = yearlyAmount;
  }

  Net_Ctc_Gross.forEach((e) => {
    e.finalvalue = +e.EmployeeSalaryAmount;

    if (e.payheadMasterId == 1) {
      e.yearly_finalvalue = getRoundOffSalary(
        +yearly_aTotal + +yearly_extra_aTotal + +yearly_cTotal,
        e.assignSalaryRound,
        e.assignSalaryRoundOffType,
        e.assignSalaryRoundNo,
      );
    }

    if (e.payheadMasterId == 50) {
      e.yearly_finalvalue = getRoundOffSalary(
        +yearly_aTotal,
        e.assignSalaryRound,
        e.assignSalaryRoundOffType,
        e.assignSalaryRoundNo,
      );
    }

    if (e.payheadMasterId == 92) {
      e.yearly_finalvalue = getRoundOffSalary(
        +yearly_aTotal + +yearly_extra_aTotal - +yearly_bTotal,
        e.assignSalaryRound,
        e.assignSalaryRoundOffType,
        e.assignSalaryRoundNo,
      );
    }
  });

  const salaryApplicableMonth = finalData?.[0]?.salaryFromYYYYMM ?? null;
  const salaryApplicableStartDate = finalData?.[0]?.startDate ?? null;
  const salaryApplicableEndDate = finalData?.[0]?.endDate ?? null;

  let applicableFrom = salaryApplicableMonth
    ? `${month_dict[String(salaryApplicableMonth).slice(4, 6)] + '-' + String(salaryApplicableMonth).slice(0, 4)}`
    : null;

  if (salaryApplicableStartDate && salaryApplicableEndDate) {
    const year = String(salaryApplicableEndDate).slice(0, 4);

    const dateRanges =
      getDateRangesByType(payrollFrequency, year)?.find(
        (e) => e.from == salaryApplicableStartDate && e.to == currentDate,
      ) || null;

    if (dateRanges)
      applicableFrom = `${dateRanges.title + '(' + String(salaryApplicableStartDate).split('-').reverse().join('-') + ' - ' + String(salaryApplicableEndDate).split('-').reverse().join('-')}`;
  }

  return { salaryMasterData: [...finalData, ...Net_Ctc_Gross], applicableFrom };
}

exports.postAddHRSalaryMaster = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    if (!Array.isArray(req.body)) throw new Error('Pass valid parameter');

    const payrollFrequency = req.body[0].payrollFrequency;
    const userMasterID = req.body[0].userMasterID;
    const startDate = req.body[0].startDate;
    const endDate = req.body[0].endDate;
    const salaryFromYYYYMM = +req.body[0].salaryFromYYYYMM;
    const monthName = formatMonth(salaryFromYYYYMM);

    const find_salary = await HRSalaryTrasaction.findOne({
      where: {
        userMasterID,
        payrollFrequency,
      },
      order: [['salaryYYYYMM', 'DESC']],
    });

    const salaryCondition = { userMasterID, payrollFrequency };
    let msg = '';

    if (
      [PayrollFrequencyType.FORTNIGHTLY, PayrollFrequencyType.WEEKLY].includes(
        payrollFrequency,
      )
    ) {
      msg =
        payrollFrequency == PayrollFrequencyType.FORTNIGHTLY
          ? 'fortnight'
          : 'week';
      salaryCondition.startDate = startDate;
      salaryCondition.endDate = endDate;
    } else {
      msg = 'month';
      salaryCondition.salaryFromYYYYMM = salaryFromYYYYMM;
    }

    const find_structure = await HRSalaryMaster.count({
      where: salaryCondition,
    });

    if (find_structure) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: `New Salary Structure already assigned for this ${msg}.`,
      });
    }

    if (find_salary) {
      let showMessage = false;

      if (
        [
          PayrollFrequencyType.FORTNIGHTLY,
          PayrollFrequencyType.WEEKLY,
        ].includes(payrollFrequency)
      ) {
        showMessage = new Date(find_salary.startDate) >= new Date(startDate);
      } else {
        showMessage = +find_salary.salaryYYYYMM >= +salaryFromYYYYMM;
      }

      if (showMessage) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: 'Salary already Calculated for this month',
        });
      }
    }

    const salaryIncrementAuth = await FormAuthorizationDetails.findOne({
      where: {
        AuthorizationMasterID: authorizationMasterTypes.salaryIncrement,
        userMasterID,
        status: 1,
      },
      include: [
        {
          model: AuthorizationCriteriaMaster,
          attributes: ['AuthorizationCriteriaID'],
        },
      ],
    });

    if (!salaryIncrementAuth) {

     const finalData = (Array.isArray(req.body) ? req.body : []).map((e) => ({
  ...e,
  createBy: req.userDetails?.userMasterId || null,
  createByIp: req.userDetails?.userIpAddress || null,
}));

      await HRSalaryMaster.bulkCreate(finalData, transaction);
    } else {
      let authorizationStatus = null;

      if (salaryIncrementAuth) {
        if (
          salaryIncrementAuth.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          authorizationStatus = 2;
        } else {
          authorizationStatus = 1;
        }
      } else {
        authorizationStatus = 3;
      }

      const commonData = req.body?.[0];

      const conditionToCheck = {
        userMasterID: commonData.userMasterID,
        authorizationStatus: {
          [Sequelize.Op.in]: [0, 1, 2, 3],
        },
      };

      if (
        [
          PayrollFrequencyType.FORTNIGHTLY,
          PayrollFrequencyType.WEEKLY,
        ].includes(payrollFrequency)
      ) {
        msg =
          payrollFrequency == PayrollFrequencyType.FORTNIGHTLY
            ? 'fortnight'
            : 'week';
        conditionToCheck.startDate = startDate;
        conditionToCheck.endDate = endDate;
      } else {
        msg = 'month';
        conditionToCheck.salaryFromYYYYMM = salaryFromYYYYMM;
      }

      const alreadyInsertedData = await SalaryIncrementRequest.findOne({
        where: conditionToCheck,
      });

      if (alreadyInsertedData) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `There is already pending salary increment request for this ${msg}.`,
        });
      }
      const salaryIncrement = await SalaryIncrementRequest.create(
        {
          userMasterID: commonData.userMasterID,
          salaryFromYYYYMM: commonData.salaryFromYYYYMM,
          stateid: commonData.stateid,
          AmountIn: commonData.AmountIn,
          skillCategory: commonData.skillCategory,
          corporationId: commonData.corporationId,
          minWagesMasterId: commonData.minWagesMasterId,
          payrollFrequency: commonData.payrollFrequency,
          startDate: commonData.startDate,
          endDate: commonData.endDate,
          authCriteriaID:
            salaryIncrementAuth?.AuthorizationCriteriaMaster
              ?.AuthorizationCriteriaID,
          authorizationStatus: authorizationStatus,
        },
        {
          hooks: true,
          user: req.userDetails,
          transaction,
        },
      );

      const salaryIncrementRequestDetailsData = req.body?.map?.((item) => {
        return {
          gradeSalaryStructureID: item.gradeSalaryStructureID,
          EmployeeSalaryAmount: item.EmployeeSalaryAmount,
          ActualEmployeeSalaryAmount: item.ActualEmployeeSalaryAmount,
          salaryIncrementRequestID: salaryIncrement.salaryIncrementRequestID,
        };
      });

      await SalaryIncrementRequestDetails.bulkCreate(
        salaryIncrementRequestDetailsData,
        {
          transaction,
          individualHooks: true,
          user: req.userDetails,
        },
      );

      const employee_name = await UserMaster.findOne({
        raw: true,
        where: {
          userMasterID,
          status: 1,
        },
        transaction,
        attributes: ['displayName'],
      });
      const employeename = employee_name ? employee_name.displayName : '';
      if (
        salaryIncrementAuth.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO
      ) {
        let insert_db_status1 =
          await SalaryIncrementRequestAuthorization.create(
            {
              TableName: SalaryIncrementRequest.getTableName(),
              salaryIncrementRequestID:
                salaryIncrement.salaryIncrementRequestID,
              userMasterID: salaryIncrementAuth.AuthorizedByUserMasterId[0],
              status: 1,
              authstatus: 2,
              createBy: req.userDetails.userMasterId,
              createByIp: req.userDetails.userIpAddress,
            },
            { transaction, user: req.userDetails },
          );

        await UserInbox.create(
          {
            activityTable: SalaryIncrementRequestAuthorization.getTableName(),
            activityTablePK:
              insert_db_status1.toJSON().salaryIncrementRequestID,
            message: `New Salary Structure requested for ${employeename} for the month of ${monthName}.`,
            assignedTo: salaryIncrementAuth.AuthorizedByUserMasterId[0],
            assignedBy: req.userDetails.userMasterId,
          },
          { transaction, user: req.userDetails },
        );

        const notification = {
          title: notificationTitleTypes.SALARYINCREMENT,
          body: `New Salary Structure requested for ${employeename} for the month of ${monthName}.`,
        };
        const data = {
          screen: notificationScreentTypes.SALARYINCREMENT,
        };
        await sendNotification(
          salaryIncrementAuth.AuthorizedByUserMasterId[0],
          notification,
          data,
        );
      } else {
        for (
          var j = 0;
          j < salaryIncrementAuth.AuthorizedByUserMasterId.length;
          j++
        ) {
          let insert_db_status1 =
            await SalaryIncrementRequestAuthorization.create(
              {
                TableName: SalaryIncrementRequest.getTableName(),
                salaryIncrementRequestID:
                  salaryIncrement.salaryIncrementRequestID,
                userMasterID: salaryIncrementAuth.AuthorizedByUserMasterId[j],
                status: 1,
                authstatus: 2,
                createBy: req.userDetails.userMasterId,
                createByIp: req.userDetails.userIpAddress,
              },
              { transaction, user: req.userDetails },
            );

          await UserInbox.create(
            {
              activityTable: SalaryIncrementRequestAuthorization.getTableName(),
              activityTablePK:
                insert_db_status1.toJSON()
                  .salaryIncrementRequestAuthorizationID,
              message: `New Salary Structure requested for ${employeename} for the month of ${monthName}.`,
              assignedTo: salaryIncrementAuth.AuthorizedByUserMasterId[j],
              assignedBy: req.userDetails.userMasterId,
            },
            { transaction, user: req.userDetails },
          );

          const notification = {
            title: notificationTitleTypes.SALARYINCREMENT,
            body: `New Salary Structure requested for ${employeename} for the month of ${monthName}.`,
          };
          const data = {
            screen: notificationScreentTypes.SALARYINCREMENT,
          };
          await sendNotification(
            salaryIncrementAuth.AuthorizedByUserMasterId[j],
            notification,
            data,
          );
        }
      }
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Salary Structure'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getSalayMasterByUser = async (req, res, next) => {
  try {
    const { salaryMasterData, applicableFrom } =
      await getSalaryMasterByUserIdandMonth(req.params.id);

    return res
      .status(200)
      .json({ status: 200, data: salaryMasterData, applicableFrom });
  } catch (err) {
    next(err);
  }
};

exports.deleteSalaryMaster = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { salaryMasterIDs, userMasterID } = req.body;

    if (salaryMasterIDs.length === 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Salary Master not found!',
      });
    }

    const salaryMaster = await HRSalaryMaster.findOne({
      where: { salaryMasterID: salaryMasterIDs[0] },
      attributes: [
        'startDate',
        'endDate',
        'salaryFromYYYYMM',
        'payrollFrequency',
      ],
      raw: true,
    });

    if (!salaryMaster) {
      await transaction.rollback();
      throw new Error('Salary master not found.');
    }

    const payrollFrequency = salaryMaster.payrollFrequency;

    const condition = { userMasterID, payrollFrequency };

    if (
      [PayrollFrequencyType.FORTNIGHTLY, PayrollFrequencyType.WEEKLY].includes(
        payrollFrequency,
      )
    ) {
      Object.assign(condition, {
        startDate: salaryMaster.startDate,
        endDate: salaryMaster.endDate,
      });
    } else {
      condition.salaryFromYYYYMM = salaryMaster.salaryFromYYYYMM;
    }

    const hrSalaryData = await HRSalaryMaster.findAll({
      raw: true,
      where: condition,
      attributes: [
        'salaryMasterID',
        'startDate',
        'userMasterID',
        'endDate',
        'salaryFromYYYYMM',
        'payrollFrequency',
      ],
    });

    if (hrSalaryData.length === 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Salary Master not found!',
      });
    }

    const salary = await HRSalaryTrasaction.findAll({
      where: {
        salaryMasterID: hrSalaryData.map((e) => e.salaryMasterID),
      },
    });

    if (salary.length) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Salary already calculated for this salary structure!',
      });
    }
    const destroyCondition = { userMasterID, payrollFrequency };

    if (
      [PayrollFrequencyType.FORTNIGHTLY, PayrollFrequencyType.WEEKLY].includes(
        payrollFrequency,
      )
    ) {
      Object.assign(destroyCondition, {
        startDate: hrSalaryData[0].startDate,
        endDate: hrSalaryData[0].endDate,
      });
    } else {
      destroyCondition.salaryFromYYYYMM = hrSalaryData[0].salaryFromYYYYMM;
    }

    await HRSalaryMaster.destroy({
      where: destroyCondition,
      transaction,
    });
    const salaryIncrementWhere = {
      userMasterID: hrSalaryData[0].userMasterID,
      payrollFrequency: hrSalaryData[0].payrollFrequency,
    };

    if (
      [PayrollFrequencyType.FORTNIGHTLY, PayrollFrequencyType.WEEKLY].includes(
        payrollFrequency,
      )
    ) {
      salaryIncrementWhere.startDate = hrSalaryData[0].startDate;
      salaryIncrementWhere.endDate = hrSalaryData[0].endDate;
    } else {
      salaryIncrementWhere.salaryFromYYYYMM = hrSalaryData[0].salaryFromYYYYMM;
    }

    await SalaryIncrementRequest.update(
      {
        authorizationStatus: 5,
        structureDeleteBy: req.userDetails?.userMasterId,
        structureDeletedAt: new Date(),
      },
      {
        where: salaryIncrementWhere,
        transaction,
      },
    );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: 'Salary structure deleted successfully.',
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getAllSalaryStructureByUserId = async (req, res, next) => {
  try {
    const { userMasterID, exportData } = req.query;

    const notIncludeIds = notIncludePyaheadIds;

    if (!showEmployerLWF) notIncludeIds.push(59);

    const salaryMasterdata = await HRSalaryMaster.findAll({
      raw: true,
      where: {
        userMasterID: userMasterID,
        '$gradeSalaryStructure.hrSalaryField.payheadMasterId$': {
          [Sequelize.Op.notIn]: notIncludeIds,
        },
      },
      include: [
        {
          model: GradeSalaryStructure,
          include: [
            { model: GradeStructure, attributes: [] },
            {
              model: HRSalaryFields,
              include: [
                {
                  model: Payheadmaster,
                  attributes: [],
                },
              ],
              attributes: [],
            },
          ],
          attributes: [],
          order: [
            ['salaryfieldindex', 'ASC'],
            [
              { model: HRSalaryFields, model: Payheadmaster },
              'payheadName',
              'ASC',
            ],
          ],
        },
      ],
      attributes: [
        'salaryMasterID',
        [
          Sequelize.col(
            'gradeSalaryStructure.hrSalaryField.Payheadmaster.payheadName',
          ),
          'payheadName',
        ],
        [
          Sequelize.col('gradeSalaryStructure.hrSalaryField.payheadMasterId'),
          'payheadMasterId',
        ],
        [
          Sequelize.col(
            'gradeSalaryStructure.hrSalaryField.payheadDisplayName',
          ),
          'payheadDisplayName',
        ],
        'EmployeeSalaryAmount',
        'salaryFromYYYYMM',
        'ActualEmployeeSalaryAmount',
        'payrollFrequency',
        'AmountIn',
        'stateid',
        'corporationId',
        'startDate',
        'endDate',
        'salaryIncrementRequestID',
        Sequelize.col('gradeSalaryStructure.gradeSalaryStructureID'),
        Sequelize.col('gradeSalaryStructure.gradeStructureID'),
        Sequelize.col('gradeSalaryStructure.fieldFixAmount'),
        Sequelize.col('gradeSalaryStructure.salaryfieldindex'),
        Sequelize.col('gradeSalaryStructure.hrSalaryField.salaryFieldID'),
        // Sequelize.col('gradeSalaryStructure.hrSalaryField.salaryFieldIndex'),
        Sequelize.col('gradeSalaryStructure.hrSalaryField.salaryFieldSide'),
        Sequelize.col('gradeSalaryStructure.hrSalaryField.salaryFieldAttanChk'),
        Sequelize.col('gradeSalaryStructure.hrSalaryField.companyMasterID'),
        Sequelize.col('gradeSalaryStructure.fieldFixAmount1'),
        [
          Sequelize.col(
            'gradeSalaryStructure.gradeStructure.baseOnCalculation',
          ),
          'baseOnCalculation',
        ],
        [
          Sequelize.col('gradeSalaryStructure.gradeStructure.gradeName'),
          'gradeName',
        ],
        [Sequelize.col('gradeSalaryStructure.formula'), 'formula'],
        [Sequelize.col('gradeSalaryStructure.formula1'), 'formula1'],
        [
          Sequelize.col('gradeSalaryStructure.formulaPreference'),
          'formulaPreference',
        ],
        [
          Sequelize.col('gradeSalaryStructure.hrSalaryField.salaryFieldSrNo'),
          'salaryFieldSrNo',
        ],
        [
          Sequelize.col('gradeSalaryStructure.hrSalaryField.considerIn'),
          'considerIn',
        ],
        [
          Sequelize.col('gradeSalaryStructure.hrSalaryField.assignSalaryRound'),
          'assignSalaryRound',
        ],
        [
          Sequelize.col('gradeSalaryStructure.salaryfieldmaxrange'),
          'salaryfieldmaxrange',
        ],
        [
          Sequelize.col(
            'gradeSalaryStructure.hrSalaryField.assignSalaryRoundNo',
          ),
          'assignSalaryRoundNo',
        ],
        [
          Sequelize.col(
            'gradeSalaryStructure.hrSalaryField.assignSalaryRoundOffType',
          ),
          'assignSalaryRoundOffType',
        ],
        [
          Sequelize.col(
            'gradeSalaryStructure.hrSalaryField.salaryFieldWhenMonth',
          ),
          'salaryFieldWhenMonth',
        ],
      ],
    });

    const groupedData = {};

    salaryMasterdata.forEach((item) => {
      const year = item.salaryFromYYYYMM.toString().slice(0, 4); // Extract the year part
      const month1 = item.salaryFromYYYYMM.toString().slice(4);
      const month = item.salaryFromYYYYMM.toString();

      item.applicableFrom = `${month_dict[month1]}-${year}`;

      if (
        [
          PayrollFrequencyType.FORTNIGHTLY,
          PayrollFrequencyType.WEEKLY,
        ].includes(item.payrollFrequency) &&
        item.startDate &&
        item.endDate
      ) {
        const dateRanges =
          getDateRangesByType(
            item.payrollFrequency,
            String(item.startDate).slice(0, 4),
          )?.find((e) => e.from == item.startDate && e.to == item.endDate) ||
          null;

        if (dateRanges) {
          const startDate = String(item.startDate)
            .split('-')
            .reverse()
            .join('-');
          const endDate = String(item.endDate).split('-').reverse().join('-');

          item.applicableFrom = `${dateRanges.title}(${startDate} - ${endDate})`;
        }
      }

      if (!groupedData[month]) {
        groupedData[month] = {
          A: [],
          gross: [], // Gross
          B: [], // Employee Deduction
          AB: [],
          netPay: [], // add In Net Pay
          C: [],
          ctc: [], // Employer Deduction
          // items: [],
        };
      }

      // groupedData[month].items.push(item);

      if (![1, 50, 92].includes(item.payheadMasterId)) {
        if (item.salaryFieldSrNo === 'A' && item.considerIn != 'net') {
          groupedData[month].A.push(item);
        } else if (item.salaryFieldSrNo === 'B') {
          groupedData[month].B.push(item);
        } else if (item.salaryFieldSrNo === 'A' && item.considerIn == 'net') {
          groupedData[month].AB.push(item);
        } else if (item.salaryFieldSrNo === 'C') {
          groupedData[month].C.push(item);
        }
      }

      if (item.payheadMasterId == 1) {
        groupedData[month].ctc.push({
          ...item,
          salaryFieldSrNo: '',
          considerIn: '',
        });
      }

      if (item.payheadMasterId == 50) {
        groupedData[month].gross.push({
          ...item,
          salaryFieldSrNo: '',
          considerIn: '',
        });
      }

      if (item.payheadMasterId == 92) {
        groupedData[month].netPay.push({
          ...item,
          salaryFieldSrNo: '',
          considerIn: '',
        });
      }
    });

    // Sort the grouped data by year and month
    const sortedKeys = Object.keys(groupedData).sort(
      (a, b) => new Date(b) - new Date(a),
    );

    // Create the result array with the sums and categories
    const result = sortedKeys.map((key) => {
      const group = groupedData[key];
      const { A, gross, B, AB, netPay, C, ctc } = group;

      return [...A, ...gross, ...B, ...AB, ...netPay, ...C, ...ctc];
    });

    if (exportData) {
      const sheetNames = result.map(
        (monthData) =>
          monthData[0].applicableFrom + ' ' + `(${monthData[0].gradeName})`,
      );

      const finalData = result.map((monthData) => {
        const filteredData = monthData
          .filter((item) => item.payheadName !== null)
          .map((e) => {
            const { payheadMasterId, ...rest } = e;

            return {
              ...rest,
              EmployeeSalaryAmount:
                payheadMasterId == 66 && showActualEDLI
                  ? getRoundOffSalary(
                      +e.ActualEmployeeSalaryAmount,
                      e.assignSalaryRound,
                      e.assignSalaryRoundOffType,
                      e.assignSalaryRoundNo,
                    )
                  : e.EmployeeSalaryAmount,
              payheadName:
                e.payheadDisplayName && e.payheadDisplayName.trim()
                  ? e.payheadDisplayName
                  : e.payheadName,
            };
          });

        const additionalInfo = filteredData[0];

        const payheadObjects = filteredData.map((e) => {
          return {
            payheadName: e.payheadName,
            EmployeeSalaryAmount: e.EmployeeSalaryAmount,
            formula: e.formulaPreference
              ? `${e.formulaPreference} of ${e.formula || e.fieldFixAmount} OR ${e.formula1 || e.fieldFixAmount1}`
              : e.formula || e.formula1,
            salaryFieldSrNo: e.salaryFieldSrNo,
            considerIn: e.considerIn,
          };
        });
        return [
          [
            {
              applicableFrom: additionalInfo.applicableFrom,
              baseOnCalculation: additionalInfo.baseOnCalculation,
            },
          ],
          payheadObjects,
        ];
      });

      await generateExcelforSalaryStructure(
        finalData,
        'Salary-Structures',
        'xlsx',
        res,
        sheetNames,
      );
    } else {
      const currentMonth =
        new Date().toISOString().slice(0, 4) +
        new Date().toISOString().slice(5, 7);

      const gradestructure = await executeQuery(
        `
            select gss."gradeStructureID", MAX(hsm."salaryFromYYYYMM") from "hrSalaryMasters" as hsm left OUTER join "gradeSalaryStructures" as gss on hsm."gradeSalaryStructureID" = gss."gradeSalaryStructureID" where hsm."userMasterID"= :userMasterID` +
          ` and hsm."salaryFromYYYYMM" <= :currentMonth` +
          ` GROUP BY gss."gradeStructureID",hsm."salaryFromYYYYMM" ORDER by hsm."salaryFromYYYYMM" DESC limit 1 
             `,
        {
          replacements: {
            userMasterID: userMasterID,
            currentMonth: currentMonth,
          },
        },
      );

      const salaryData = await HRSalaryTrasaction.findAll({
        where: {
          salaryMasterID: salaryMasterdata.map((e) => e.salaryMasterID),
        },
      });

      const finaldata = result.map((e) => {
        if (e[0]?.baseOnCalculation === 'M') {
          const finalData = e.filter(
            (f) => ![1, 50, 92].includes(+f.payheadMasterId),
          );
          const Net_Ctc_Gross = e.filter((f) =>
            [1, 50, 92].includes(+f.payheadMasterId),
          );

          let yearly_aTotal = 0;
          let yearly_bTotal = 0;
          let yearly_extra_aTotal = 0;
          let yearly_cTotal = 0;

          finalData.forEach((s) => {
            s.current =
              Array.isArray(gradestructure) &&
              gradestructure[0]?.max === e[0]?.salaryFromYYYYMM;

            const findCalculatedsalary = salaryData.find(
              (sa) => sa.salaryMasterID == s.salaryMasterID,
            );
            s.salaryCalculated = !!findCalculatedsalary;

            let length = 12;
            if (
              Array.isArray(s.salaryFieldWhenMonth) &&
              s.salaryFieldWhenMonth[0] != 0
            ) {
              length = s.salaryFieldWhenMonth.length;
            }

            let amount = +s.EmployeeSalaryAmount;
            if (s.payheadMasterId == 66 && showActualEDLI) {
              amount = getRoundOffSalary(
                +s.ActualEmployeeSalaryAmount,
                s.assignSalaryRound,
                s.assignSalaryRoundOffType,
                s.assignSalaryRoundNo,
              );
            }

            const yearlyAmount = amount * length;

            if (s.salaryFieldSrNo == 'A' && s.considerIn !== 'net')
              yearly_aTotal += yearlyAmount;
            if (s.salaryFieldSrNo == 'A' && s.considerIn === 'net')
              yearly_extra_aTotal += yearlyAmount;
            if (s.salaryFieldSrNo == 'B') yearly_bTotal += yearlyAmount;
            if (s.salaryFieldSrNo == 'C') yearly_cTotal += yearlyAmount;

            s.EmployeeSalaryAmount = amount;
            s.yearlyAmount = yearlyAmount;
            s.payheadOriganalName = s.payheadName;
            s.payheadName = s.payheadDisplayName?.trim() || s.payheadName;
          });

          Net_Ctc_Gross.forEach((el) => {
            if (el.payheadMasterId == 1) {
              el.yearlyAmount = getRoundOffSalary(
                yearly_aTotal + yearly_extra_aTotal + yearly_cTotal,
                el.assignSalaryRound,
                el.assignSalaryRoundOffType,
                el.assignSalaryRoundNo,
              );
            }
            if (el.payheadMasterId == 50) {
              el.yearlyAmount = getRoundOffSalary(
                yearly_aTotal,
                el.assignSalaryRound,
                el.assignSalaryRoundOffType,
                el.assignSalaryRoundNo,
              );
            }
            if (el.payheadMasterId == 92) {
              el.yearlyAmount = getRoundOffSalary(
                yearly_aTotal + yearly_extra_aTotal - yearly_bTotal,
                el.assignSalaryRound,
                el.assignSalaryRoundOffType,
                el.assignSalaryRoundNo,
              );
            }
          });

          return [...finalData, ...Net_Ctc_Gross];
        } else {
          e.forEach((s) => {
            if (
              gradestructure.length > 0 &&
              gradestructure[0].max == e[0].salaryFromYYYYMM
            )
              s.current = true;
            else s.current = false;

            const findCalculatedsalary = salaryData.find(
              (sa) => sa.salaryMasterID == s.salaryMasterID,
            );

            s.salaryCalculated = !!findCalculatedsalary;

            let amount = +s.EmployeeSalaryAmount;
            if (s.payheadMasterId == 66 && showActualEDLI) {
              amount = getRoundOffSalary(
                +s.ActualEmployeeSalaryAmount,
                s.assignSalaryRound,
                s.assignSalaryRoundOffType,
                s.assignSalaryRoundNo,
              );
            }
            s.EmployeeSalaryAmount = amount;

            s.yearlyAmount = '';
            s.payheadName = s.payheadDisplayName?.trim() || s.payheadName;
          });

          return e;
        }
      });

      return res.status(200).json({
        status: 200,
        data: finaldata,
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.getOldNewSalaryStructure = async (req, res, next) => {
  try {
    const { userMasterID } = req.body;

    const SalaryStructureshow = await HRSalaryMaster.findAll({
      where: { userMasterID },
      group: ['userMasterID', 'salaryFromYYYYMM'],
      attributes: ['userMasterID', 'salaryFromYYYYMM'],
    });

    const finalData = SalaryStructureshow.map((e) => {
      return {
        userMasterID: e.userMasterID,
        month:
          month_dict[String(e.salaryFromYYYYMM).slice(4, 6)] +
          '-' +
          String(e.salaryFromYYYYMM).slice(0, 4),
        salaryFromYYYYMM: e.salaryFromYYYYMM,
      };
    });

    return res.status(200).json({
      status: 200,
      message: 'Data Get Successfully!',
      data: finalData,
    });
  } catch (err) {
    next(err);
  }
};

exports.ctcCalculation = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      departmentID,
      designationID,
      divisionId,
      workingAreaId,
      repoteeUserMasterID,
      searchQuery,
      status,
    } = req.body;

    // let { branchMasterID } = req.body;
    // if (req.userDetails && req.userDetails.role) {
    //   if (
    //     req.userDetails.role.roleType == roleType.BRANCH_WISE &&
    //     (!branchMasterID ||
    //       (Array.isArray(branchMasterID) && !branchMasterID.length))
    //   )
    //     branchMasterID = req.userDetails.accessibleBranches;
    // }

    // const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // const month = filterDate.slice(0, 4) + '' + filterDate.slice(5, 7);

    // check if hourly or daily structure assigned in company

    // const structure = await UserMaster.findOne({
    //   subQuery: false,
    //   where: {
    //     companyMasterId: companyMasterID,
    //     status: {
    //       [Sequelize.Op.in]: [0, 1],
    //     },
    //   },
    //   include: [
    //     {
    //       required: true,
    //       model: HRSalaryMaster,
    //       where: {
    //         salaryFromYYYYMM: {
    //           [Sequelize.Op.eq]: Sequelize.literal(`(
    //       SELECT MAX(h."salaryFromYYYYMM")
    //       FROM "hrSalaryMasters" h
    //       WHERE h."userMasterID" = "userMaster"."userMasterID"
    //       and h."salaryFromYYYYMM" <= ${+month}
    //     )`),
    //         },
    //       },
    //       attributes: ["gradeSalaryStructureID"],
    //       include: [
    //         {
    //           required: true,
    //           model: GradeSalaryStructure,
    //           as: "GSS",
    //           attributes: ["gradeStructureID"],
    //           include: [
    //             {
    //               required: true,
    //               model: GradeStructure,
    //               where: {
    //                 baseOnCalculation: {
    //                   [Sequelize.Op.in]: ["D", "H"],
    //                 },
    //               },
    //               attributes: [],
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //   ],
    //   attributes: ["userMasterID"],
    // });

    // const showCTC = !structure;

    let ctc = 0;
    let gross = 0;
    let netPay = 0;
    let aggregateCTC = 0;
    let aggregateGross = 0;
    let aggregateNetPay = 0;

    // if (showCTC) {
    //   const includeModels = [
    //     {
    //       model: EmployeeJoiningDetails,
    //       attributes: ["employeeCode"],
    //     },
    //     {
    //       model: companyMaster,
    //       attributes: ["companyName"],
    //     },
    //     {
    //       required: true,
    //       model: HRSalaryMaster,
    //       where: {
    //         salaryFromYYYYMM: {
    //           [Sequelize.Op.eq]: Sequelize.literal(`(
    //       SELECT MAX("salaryFromYYYYMM")
    //       FROM "hrSalaryMasters"
    //       WHERE "hrSalaryMasters"."userMasterID" = "userMaster"."userMasterID"
    //       and "hrSalaryMasters"."salaryFromYYYYMM" <= ${+month}
    //     )`),
    //         },
    //       },
    //       attributes: ["gradeSalaryStructureID", "EmployeeSalaryAmount"],
    //       include: [
    //         {
    //           required: true,
    //           model: GradeSalaryStructure,
    //           as: "GSS",
    //           attributes: ["salaryFieldID"],
    //           include: [
    //             {
    //               required: true,
    //               model: HRSalaryFields,
    //               as: "HSF",
    //               where: {
    //                 payheadMasterId: {
    //                   [Sequelize.Op.in]: [1, 50, 92],
    //                 },
    //               },
    //               attributes: ["payheadMasterId"],
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //   ];

    //   // if branch masterId

    //   if (
    //     branchMasterID &&
    //     (!Array.isArray(branchMasterID) || branchMasterID.length)
    //   ) {
    //     includeModels.push({
    //       model: EmployeeBranch,
    //       where: {
    //         status: 1,
    //         branchID: branchMasterID,
    //         applicableDate: {
    //           [Sequelize.Op.lte]: filterDate,
    //         },
    //         [Sequelize.Op.or]: [
    //           {
    //             endDate: {
    //               [Sequelize.Op.gte]: filterDate,
    //             },
    //           },
    //           { endDate: { [Sequelize.Op.eq]: null } },
    //         ],
    //       },
    //       required: branchMasterID ? true : false,
    //       attributes: [],
    //     });
    //   }

    //   // if department

    //   if (
    //     departmentID &&
    //     (!Array.isArray(departmentID) || departmentID.length)
    //   ) {
    //     includeModels.push({
    //       model: EmployeeDepartment,
    //       where: {
    //         status: 1,
    //         departmentID,
    //         applicableDate: {
    //           [Sequelize.Op.lte]: filterDate,
    //         },
    //         [Sequelize.Op.or]: [
    //           {
    //             endDate: {
    //               [Sequelize.Op.gte]: filterDate,
    //             },
    //           },
    //           { endDate: { [Sequelize.Op.eq]: null } },
    //         ],
    //       },
    //       required: true,
    //       attributes: [],
    //     });
    //   }

    //   // if designation

    //   if (
    //     designationID &&
    //     (!Array.isArray(designationID) || designationID.length)
    //   ) {
    //     includeModels.push({
    //       model: EmployeeDesignation,
    //       where: {
    //         status: 1,

    //         designationID,

    //         applicableDate: {
    //           [Sequelize.Op.lte]: filterDate,
    //         },
    //         [Sequelize.Op.or]: [
    //           {
    //             endDate: {
    //               [Sequelize.Op.gte]: filterDate,
    //             },
    //           },
    //           { endDate: { [Sequelize.Op.eq]: null } },
    //         ],
    //       },
    //       required: true,
    //       attributes: [],
    //     });
    //   }

    //   // if division

    //   if (divisionId && (!Array.isArray(divisionId) || divisionId.length)) {
    //     includeModels.push({
    //       model: EmployeeDivision,
    //       where: {
    //         status: 1,
    //         divisionId,
    //         startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
    //         [Sequelize.Op.or]: [
    //           { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
    //           { endDate: { [Sequelize.Op.eq]: null } },
    //         ],
    //       },
    //       required: true,
    //       attributes: [],
    //     });
    //   }

    //   // working Area

    //   if (
    //     workingAreaId &&
    //     (!Array.isArray(workingAreaId) || workingAreaId.length)
    //   ) {
    //     includeModels.push({
    //       model: EmployeeWorkingArea,
    //       where: {
    //         status: 1,
    //         workingAreaId,
    //         startDate: { [Sequelize.Op.lte]: new Date(filterDate) },
    //         [Sequelize.Op.or]: [
    //           { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
    //           { endDate: { [Sequelize.Op.eq]: null } },
    //         ],
    //       },
    //       required: true,
    //       attributes: [],
    //     });
    //   }

    //   // if repotee person

    //   if (
    //     repoteeUserMasterID &&
    //     (!Array.isArray(repoteeUserMasterID) || repoteeUserMasterID.length)
    //   ) {
    //     includeModels.push({
    //       required: true,
    //       model: EmployeeReportTo,
    //       where: {
    //         status: 1,
    //         reportToID: repoteeUserMasterID,
    //       },
    //       attributes: [],
    //     });
    //   }

    //   const userCondition = {
    //     companyMasterId: companyMasterID,
    //     status: 1,
    //   };

    //   if (status) userCondition.status = status;

    //   if (searchQuery)
    //     userCondition[Sequelize.Op.or] = [
    //       {
    //         displayName: {
    //           [Sequelize.Op.iLike]: "%" + searchQuery + "%",
    //         },
    //       },
    //       {
    //         userNumber: {
    //           [Sequelize.Op.iLike]: "%" + searchQuery + "%",
    //         },
    //       },
    //       {
    //         "$employeeJoiningDetails.employeeCode$": {
    //           [Sequelize.Op.iLike]: "%" + searchQuery + "%",
    //         },
    //       },
    //       {
    //         "$companyMaster.companyName$": {
    //           [Sequelize.Op.iLike]: "%" + searchQuery + "%",
    //         },
    //       },
    //     ];

    //   const salaryData = await UserMaster.findAll({
    //     where: userCondition,
    //     attributes: ["userMasterID", "displayName"],
    //     include: includeModels,
    //   });

    //   salaryData
    //     .flatMap((e) => e.hrSalaryMasters || [])
    //     .reduce((acc, obj) => {
    //       const payheadId = obj?.GSS?.HSF?.payheadMasterId || null;
    //       const amount = obj?.EmployeeSalaryAmount || 0;

    //       if (payheadId == 1) ctc += +amount;
    //       if (payheadId == 50) gross += +amount;
    //       if (payheadId == 92) netPay += +amount;

    //       return acc;
    //     },null);

    //   const userDataLength = salaryData.length;

    //   if (userDataLength > 0) {
    //     aggregateCTC =
    //       (ctc / userDataLength) % 1 == 0
    //         ? ctc / userDataLength
    //         : (ctc / userDataLength).toFixed(2);
    //     aggregateGross =
    //       (gross / userDataLength) % 1 == 0
    //         ? gross / userDataLength
    //         : (gross / userDataLength).toFixed(2);
    //     aggregateNetPay =
    //       (netPay / userDataLength) % 1 == 0
    //         ? netPay / userDataLength
    //         : (netPay / userDataLength).toFixed(2);
    //   }
    // }

    return res.status(200).json({
      status: 200,
      data: {
        showCTC: false,
        ctc,
        gross,
        netPay,
        aggregateCTC,
        aggregateGross,
        aggregateNetPay,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateHRSalaryMaster = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const allowedKeys = [
      'salaryMasterID',
      'EmployeeSalaryAmount',
      'ActualEmployeeSalaryAmount',
    ];

    const bodyData = req?.body;

    if (!Array.isArray(bodyData)) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Request body must be an array',
      });
    }

    const validationErrors = validateSalaryArray(bodyData, allowedKeys);

    if (validationErrors.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        message: 'Invalid payload',
        errors: validationErrors,
      });
    }

    const userMasterId = req?.userDetails?.userMasterId;
    const updateByIp = req?.userDetails?.userIpAddress;

    await Promise.all(
      bodyData.map((row) =>
        HRSalaryMaster.update(
          {
            EmployeeSalaryAmount: row?.EmployeeSalaryAmount,
            ActualEmployeeSalaryAmount: row?.ActualEmployeeSalaryAmount,
            updateBy: userMasterId,
            updateByIp: updateByIp,
          },
          {
            where: { salaryMasterID: row?.salaryMasterID },
            transaction,
          },
        ),
      ),
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Salary Structure'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

function validateSalaryArray(arr, allowedKeys) {
  const errors = [];

  arr.forEach((obj, index) => {
    const keys = Object.keys(obj);

    // Check extra keys
    const extraKeys = keys.filter((k) => !allowedKeys.includes(k));
    if (extraKeys.length > 0) {
      errors.push(
        `Object ${index + 1}: Extra key(s) found → ${extraKeys.join(', ')}`,
      );
    }

    // Check missing keys
    const missingKeys = allowedKeys.filter((k) => !keys.includes(k));
    if (missingKeys.length > 0) {
      errors.push(
        `Object ${index + 1}: Missing key(s) → ${missingKeys.join(', ')}`,
      );
    }
  });

  return errors;
}

exports.getUserSalaryMasterBymonth = async (req, res, next) => {
  try {
    const { userMasterID, month, startDate, endDate } = req.body;

    if (!userMasterID)
      return res.status(200).json({
        status: 401,
        message: 'User is required!',
      });

    const { salaryMasterData, applicableFrom } =
      await getSalaryMasterByUserIdandMonth(
        userMasterID,
        month,
        startDate,
        endDate,
      );

    return res
      .status(statusCodes.OK)
      .json({ status: statusCodes.OK, data: salaryMasterData, applicableFrom });
  } catch (error) {
    next(error);
  }
};
exports.getLastSalaryStructure = async (req, res, next) => {
  try {
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const employmentData = await EmployeeEmployeement.findOne({
      attributes: ['employeement'],
      where: {
        userMasterID: req.params.id,
        status: 1,
        applicableDate: {
          [Sequelize.Op.lte]: new Date(currentDate),
        },
        [Sequelize.Op.or]: [
          {
            endDate: {
              [Sequelize.Op.gte]: new Date(currentDate),
            },
          },
          {
            endDate: {
              [Sequelize.Op.is]: null,
            },
          },
        ],
      },
    });

    const { salaryMasterData, applicableFrom } =
      await getLastSalaryMasterByUserId(req.params.id);

    if (
      employmentData?.employeement == 'Contract' &&
      salaryMasterData?.[0]?.isContractorGrade !== true
    ) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: `The previously assigned grade is not a Contractor grade, while the employee's employment type is Contractor. Therefore, this option cannot be used.`,
      });
    }

    if (
      employmentData?.employeement != 'Contract' &&
      salaryMasterData?.[0]?.isContractorGrade === true
    ) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: `The previously assigned grade is a Contractor grade, while the employee's employment type is not Contractor. Therefore, this option cannot be used.`,
      });
    }

    return res
      .status(statusCodes.OK)
      .json({ status: statusCodes.OK, data: salaryMasterData, applicableFrom });
  } catch (err) {
    next(err);
  }
};

async function getLastSalaryMasterByUserId(
  userMasterID,
  month = null,
  startdate = null,
  enddate = null,
) {
  if (!userMasterID) return { salaryMasterData: [], applicableFrom: '' };

  const currentDate = new Date().toISOString().slice(0, 10);

  const currentMonth =
    month ?? String(currentDate).slice(0, 4) + String(currentDate).slice(5, 7);

  let startDate = null;
  let endDate = null;

  const joining = await EmployeeJoiningDetails.findOne({
    where: {
      userMasterID,
    },
    attributes: ['payrollFrequency'],
  });

  const payrollFrequency =
    joining?.payrollFrequency || PayrollFrequencyType.MONTHLY;

  if (
    [PayrollFrequencyType.FORTNIGHTLY, PayrollFrequencyType.WEEKLY].includes(
      payrollFrequency,
    )
  ) {
    if (startdate && enddate) {
      startDate = startdate;
      endDate = enddate;
    } else {
      const year = String(currentDate).slice(0, 4);

      const dateRanges =
        getDateRangesByType(payrollFrequency, year)?.find(
          (e) =>
            new Date(e.from) <= new Date(currentDate) &&
            new Date(e.to) >= new Date(currentDate),
        ) || null;

      if (dateRanges) {
        startDate = dateRanges.from;
        endDate = dateRanges.to;
      }
    }
  }

  const allData = await getLastUserSalaryMaster(
    userMasterID,
    currentMonth,
    payrollFrequency,
    startDate,
    endDate,
  );

  const excludeIds = [1, 50, 92];

  // not include LWF company side

  if (!showEmployerLWF) excludeIds.push(59);

  const finalData = allData.filter(
    (e) => !excludeIds.includes(+e.payheadMasterId),
  );
  const Net_Ctc_Gross = allData.filter((e) =>
    [1, 50, 92].includes(+e.payheadMasterId),
  );

  let yearly_aTotal = 0;
  let yearly_bTotal = 0;
  let yearly_extra_aTotal = 0;
  let yearly_cTotal = 0;

  for (let i = 0; i < finalData.length; i++) {
    finalData[i].actualvalue = +finalData[i].ActualEmployeeSalaryAmount;
    let length = 12;
    if (finalData[i].salaryFieldWhenMonth[0] != 0) {
      length = finalData[i].salaryFieldWhenMonth.length;
    }

    let amount = +finalData[i].EmployeeSalaryAmount;

    // for EDLI

    if (+finalData[i].payheadMasterId == 66 && showActualEDLI) {
      amount = getRoundOffSalary(
        +finalData[i].ActualEmployeeSalaryAmount,
        finalData[i].assignSalaryRound,
        finalData[i].assignSalaryRoundOffType,
        finalData[i].assignSalaryRoundNo,
      );
      finalData[i].showActualvalue = amount;
      finalData[i].showYearlyActualvalue = getRoundOffSalary(
        +finalData[i].ActualEmployeeSalaryAmount * length,
        finalData[i].assignSalaryRound,
        finalData[i].assignSalaryRoundOffType,
        finalData[i].assignSalaryRoundNo,
      );
    }

    const yearlyAmount = amount * length;

    if (
      finalData[i].salaryFieldSrNo == 'A' &&
      finalData[i].considerIn != 'net'
    ) {
      yearly_aTotal += +yearlyAmount;
    }

    if (
      finalData[i].salaryFieldSrNo == 'A' &&
      finalData[i].considerIn == 'net'
    ) {
      yearly_extra_aTotal += +yearlyAmount;
    }

    if (finalData[i].salaryFieldSrNo == 'B') {
      yearly_bTotal += +yearlyAmount;
    }

    if (finalData[i].salaryFieldSrNo == 'C') {
      yearly_cTotal += +yearlyAmount;
    }

    finalData[i].finalvalue = +amount;
    finalData[i].yearly_finalvalue = yearlyAmount;
  }

  Net_Ctc_Gross.forEach((e) => {
    e.finalvalue = +e.EmployeeSalaryAmount;

    if (e.payheadMasterId == 1) {
      e.yearly_finalvalue = getRoundOffSalary(
        +yearly_aTotal + +yearly_extra_aTotal + +yearly_cTotal,
        e.assignSalaryRound,
        e.assignSalaryRoundOffType,
        e.assignSalaryRoundNo,
      );
    }

    if (e.payheadMasterId == 50) {
      e.yearly_finalvalue = getRoundOffSalary(
        +yearly_aTotal,
        e.assignSalaryRound,
        e.assignSalaryRoundOffType,
        e.assignSalaryRoundNo,
      );
    }

    if (e.payheadMasterId == 92) {
      e.yearly_finalvalue = getRoundOffSalary(
        +yearly_aTotal + +yearly_extra_aTotal - +yearly_bTotal,
        e.assignSalaryRound,
        e.assignSalaryRoundOffType,
        e.assignSalaryRoundNo,
      );
    }
  });

  const salaryApplicableMonth = finalData?.[0]?.salaryFromYYYYMM ?? null;
  const salaryApplicableStartDate = finalData?.[0]?.startDate ?? null;
  const salaryApplicableEndDate = finalData?.[0]?.endDate ?? null;

  let applicableFrom = salaryApplicableMonth
    ? `${month_dict[String(salaryApplicableMonth).slice(4, 6)] + '-' + String(salaryApplicableMonth).slice(0, 4)}`
    : null;

  if (salaryApplicableStartDate && salaryApplicableEndDate) {
    const year = String(salaryApplicableEndDate).slice(0, 4);

    const dateRanges =
      getDateRangesByType(payrollFrequency, year)?.find(
        (e) => e.from == salaryApplicableStartDate && e.to == currentDate,
      ) || null;

    if (dateRanges)
      applicableFrom = `${dateRanges.title + '(' + String(salaryApplicableStartDate).split('-').reverse().join('-') + ' - ' + String(salaryApplicableEndDate).split('-').reverse().join('-')}`;
  }

  return { salaryMasterData: [...finalData, ...Net_Ctc_Gross], applicableFrom };
}

function fixBaseHeaders(isFortnightly = false) {
  const expectedBaseHeaders = isFortnightly
    ? [
        'Employee Code',
        'Employee Name',
        'Number',
        'Branch',
        'Department',
        'Designation',
        'Joining Date',
        'Skill Category',
        'Year',
        'Applicable From (Fortnight)',
        'Salary Grade',
        'State',
        'Corporation',
      ]
    : [
        'Employee Code',
        'Employee Name',
        'Number',
        'Branch',
        'Department',
        'Designation',
        'Joining Date',
        'Skill Category',
        'Applicable YYYYMM (e.g. 202501)',
        'Salary Grade',
        'State',
        'Corporation',
      ];

  return expectedBaseHeaders;
}

exports.uploadSalaryStructureDemoExcel = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      departmentID,
      designationID,
      workingAreaId,
      divisionId,
      employeementType,
      contractorId,
      userMasterID,
      status,
      payrollFrequency,
    } = req.body;
    let { branchMasterID } = req.body;

    if (!companyMasterID || !payrollFrequency) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.requiredMessage(
          'company and payrollFrequency',
        ),
      });
    }

    if (employeementType == employeementTypeEnum.ON_CONTRACT && !contractorId) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: `Contractor is required for 'On Contract' employees.`,
      });
    }

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const currentMonth = currentDate.substring(0, 7).replace('-', '');

    const empEmployeementCondition =
      employeementType === employeementTypeEnum.ON_PAYROLL
        ? { contractorId: { [Sequelize.Op.is]: null } }
        : employeementType === employeementTypeEnum.ON_CONTRACT
          ? { contractorId: { [Sequelize.Op.ne]: null } }
          : {};

    const contractorCondition =
      contractorId && (!Array.isArray(contractorId) || contractorId.length)
        ? { contractorId }
        : {};

    const empJoiningCondition = {
      ...empEmployeementCondition,
      ...contractorCondition,
      payrollFrequency,
    };

    const dateRangeCondition = (
      dateField = 'applicableDate',
      endField = 'endDate',
    ) => ({
      status: 1,
      [dateField]: { [Sequelize.Op.lte]: currentDate },
      [Sequelize.Op.or]: [
        { [endField]: { [Sequelize.Op.gte]: currentDate } },
        { [endField]: { [Sequelize.Op.eq]: null } },
      ],
    });

    const monthRangeCondition = {
      status: 1,
      applicableYYYYMM: { [Sequelize.Op.lte]: currentMonth },
      [Sequelize.Op.or]: [
        { endYYYYMM: { [Sequelize.Op.gte]: currentMonth } },
        { endYYYYMM: { [Sequelize.Op.eq]: null } },
      ],
    };

    const includedModels = [
      {
        model: EmployeeJoiningDetails,
        where: empJoiningCondition,
        attributes: ['employeeCode', 'joiningDate'],
      },
      {
        model: EmployeeDesignation,
        where: {
          ...dateRangeCondition(),
          ...(designationID?.length && { designationID }),
        },
        required: !!designationID?.length,
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
        where: {
          ...dateRangeCondition(),
          ...(departmentID?.length && { departmentID }),
        },
        required: !!departmentID?.length,
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
        where: {
          ...dateRangeCondition(),
          ...(branchMasterID?.length && { branchID: branchMasterID }),
        },
        required: !!branchMasterID?.length,
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
        model: EmployeeSkillCategory,
        as: 'emp_skill',
        required: false,
        where: monthRangeCondition,
        attributes: ['skillCategory'],
      },
    ];

    if (divisionId && (!userMasterID || !userMasterID?.length)) {
      includedModels.push({
        model: EmployeeDivision,
        where: { ...dateRangeCondition('startDate'), divisionId },
        required: true,
        attributes: ['divisionId'],
        include: [{ model: Division, attributes: ['divisionName'] }],
      });
    }

    if (workingAreaId && (!userMasterID || !userMasterID?.length)) {
      includedModels.push({
        model: EmployeeWorkingArea,
        where: { ...dateRangeCondition('startDate'), workingAreaId },
        required: true,
        attributes: ['workingAreaId'],
        include: [{ model: WorkingArea, attributes: ['workingAreaName'] }],
      });
    }

    const condition = { companyMasterId: companyMasterID, status };
    if (Array.isArray(userMasterID) && userMasterID.length) {
      condition.userMasterID = { [Sequelize.Op.in]: userMasterID };
    }

    const gradeCondition = { companyMasterID, status: 1, payrollFrequency };

    if (contractorId) gradeCondition.contractorId = contractorId;
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const [userData, allGrade, salaryFields, stateData] = await Promise.all([
      UserMaster.findAll({
        where: { ...userAccessCondition.where, ...condition },
        include: [...userAccessCondition.includeModels, ...includedModels],
        order: [['displayName', 'ASC']],
        attributes: ['userMasterID', 'displayName', 'userNumber'],
      }),
      GradeStructure.findAll({
        where: gradeCondition,
        attributes: ['gradeName'],
        raw: true,
      }),
      HRSalaryFields.findAll({
        where: {
          companyMasterID,
          status: 1,
          payheadMasterId: { [Sequelize.Op.notIn]: default_payheadMasterIds },
        },
        order: [['salaryFieldID', 'ASC']],
        include: [{ model: Payheadmaster, attributes: ['payheadName'] }],
        attributes: ['payheadMasterId', 'salaryFieldSrNo'],
        raw: true,
      }),
      StateMaster.findAll({
        where: { countryMasterID: 103, status: 1 },
        attributes: ['stateName', 'stateMasterID'],
        include: [{ model: Corporation, attributes: ['corporationName'] }],
      }),
    ]);

    // Process salary fields
    const fieldA = salaryFields
      .filter((f) => f.salaryFieldSrNo === 'A')
      .map(
        (f) => f['Payheadmaster.payheadName'] || f.Payheadmaster?.payheadName,
      )
      .filter(Boolean);
    const fieldB = salaryFields
      .filter((f) => f.salaryFieldSrNo === 'B')
      .map(
        (f) => f['Payheadmaster.payheadName'] || f.Payheadmaster?.payheadName,
      )
      .filter(Boolean);
    const fieldC = salaryFields
      .filter((f) => f.salaryFieldSrNo === 'C')
      .map(
        (f) => f['Payheadmaster.payheadName'] || f.Payheadmaster?.payheadName,
      )
      .filter(Boolean);

    const salaryHeaders = [
      ...fieldA,
      'Gross',
      ...fieldB,
      'Net Salary',
      ...fieldC,
      'CTC',
    ];

    // Base headers - different for Fortnightly
    const isFortnightly = payrollFrequency === PayrollFrequencyType.FORTNIGHTLY;

    const baseHeaders = fixBaseHeaders(isFortnightly);

    const requiredFieldNames = isFortnightly
      ? new Set([
          'Year',
          'Applicable From (Fortnight)',
          'Salary Grade',
          'Gross',
          'Net Salary',
          'CTC',
        ])
      : new Set([
          'Applicable YYYYMM (e.g. 202501)',
          'Salary Grade',
          'Gross',
          'Net Salary',
          'CTC',
        ]);

    const allHeaders = [...baseHeaders, ...salaryHeaders];
    const READONLY_COLUMNS = 8;

    // Process dropdown data - SANITIZE to remove commas and special chars
    const sanitize = (str) =>
      str ? str.toString().replace(/,/g, ' ').replace(/"/g, '').trim() : '';

    const gradeNames = allGrade
      .map((g) => sanitize(g.gradeName))
      .filter(Boolean)
      .sort();

    const stateNames = [...new Set(stateData.map((s) => sanitize(s.stateName)))]
      .filter(Boolean)
      .sort();

    const allCorporations = [
      ...new Set(
        stateData.flatMap(
          (s) => s.corporations?.map((c) => sanitize(c.corporationName)) || [],
        ),
      ),
    ]
      .filter(Boolean)
      .sort();

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tankhwapatra';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Upload Salary Structure');

    // Add header row
    const headerRow = worksheet.addRow(allHeaders);
    headerRow.height = 22;

    // Color scheme
    const COLORS = {
      REQUIRED: 'FFFF0000', // Red - Required fields
      BASIC: 'FF4472C4', // Blue - Basic employee info (first 8 columns)
      SALARY: 'FF7030A0', // Purple - Salary fields
    };

    const baseHeadersCount = baseHeaders.length; // 12

    headerRow.eachCell((cell, colNumber) => {
      const headerName = allHeaders[colNumber - 1];
      const isRequired = requiredFieldNames.has(headerName);

      let bgColor;

      if (isRequired) {
        // Required fields - Red
        bgColor = COLORS.REQUIRED;
      } else if (colNumber <= READONLY_COLUMNS) {
        // First 8 columns (readonly basic info) - Blue
        bgColor = COLORS.BASIC;
      } else if (colNumber <= baseHeadersCount) {
        // Editable basic fields (YYYYMM, Grade, State, Corp) - Blue
        bgColor = COLORS.BASIC;
      } else {
        // Salary fields - Purple
        bgColor = COLORS.SALARY;
      }

      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Column indices (1-based) - different for Fortnightly
    const gradeColIndex = isFortnightly ? 11 : 10;
    const stateColIndex = isFortnightly ? 12 : 11;
    const corpColIndex = isFortnightly ? 13 : 12;
    const yearColIndex = isFortnightly ? 9 : null;
    const fortnightColIndex = isFortnightly ? 10 : null;

    // Generate Year dropdown values (1 year ahead to 20 years back)
    const currentYear = new Date().getFullYear();
    const yearValues = [];
    for (let y = currentYear + 1; y >= currentYear - 20; y--) {
      yearValues.push(y.toString());
    }

    // Generate Fortnight dropdown values (F1 to F26)
    const fortnightValues = [];
    for (let f = 1; f <= 26; f++) {
      fortnightValues.push(`F${f}`);
    }

    // Add data rows
    userData.forEach((user) => {
      const joining = user.employeeJoiningDetails?.[0];

      const rowData = isFortnightly
        ? [
            joining?.employeeCode || '',
            user.displayName || '',
            user.userNumber || '',
            user.employeeBranches?.[0]?.branchMaster?.branchName || '',
            user.employeeDepartments?.[0]?.department?.departmentName || '',
            user.employeeDesignations?.[0]?.designation?.designationName || '',
            joining?.joiningDate
              ? moment(joining.joiningDate).format('DD-MM-YYYY')
              : '',
            user.emp_skill?.[0]?.skillCategory || '',
            '', // Year
            '', // Fortnight
            '', // Salary Grade
            '', // State
            '', // Corporation
            ...salaryHeaders.map(() => ''),
          ]
        : [
            joining?.employeeCode || '',
            user.displayName || '',
            user.userNumber || '',
            user.employeeBranches?.[0]?.branchMaster?.branchName || '',
            user.employeeDepartments?.[0]?.department?.departmentName || '',
            user.employeeDesignations?.[0]?.designation?.designationName || '',
            joining?.joiningDate
              ? moment(joining.joiningDate).format('DD-MM-YYYY')
              : '',
            user.emp_skill?.[0]?.skillCategory || '',
            '', // Applicable YYYYMM
            '', // Salary Grade
            '', // State
            '', // Corporation
            ...salaryHeaders.map(() => ''),
          ];

      const dataRow = worksheet.addRow(rowData);

      dataRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        // Data cells inherit unlocked from column default - no need to set explicitly
      });
    });

    // AUTO-FIT COLUMN WIDTHS
    worksheet.columns.forEach((column, index) => {
      let maxWidth = allHeaders[index]?.length || 10;

      worksheet.eachRow((row) => {
        const cell = row.getCell(index + 1);
        const cellValue = cell.value ? cell.value.toString() : '';
        maxWidth =
          cellValue == 'Salary Grade'
            ? 25
            : cellValue == 'State'
              ? 15
              : Math.max(maxWidth, cellValue.length);
      });

      column.width = Math.min(Math.max(maxWidth + 2, 8), 45);
    });

    const dataRowCount = userData.length;

    // Add dropdowns only if there's data and dropdown values exist
    if (dataRowCount > 0) {
      // Create hidden sheet for dropdown values (more reliable than inline lists)
      const hiddenSheet = workbook.addWorksheet('Data');
      hiddenSheet.state = 'hidden';

      // Add grade names to hidden sheet
      gradeNames.forEach((grade, index) => {
        hiddenSheet.getCell(index + 1, 1).value = grade;
      });

      // Add state names to hidden sheet
      stateNames.forEach((state, index) => {
        hiddenSheet.getCell(index + 1, 2).value = state;
      });

      // Add corporation names to hidden sheet
      allCorporations.forEach((corp, index) => {
        hiddenSheet.getCell(index + 1, 3).value = corp;
      });

      // Add Year values to hidden sheet (for Fortnightly)
      if (isFortnightly) {
        yearValues.forEach((year, index) => {
          hiddenSheet.getCell(index + 1, 4).value = year;
        });

        // Add Fortnight values to hidden sheet
        fortnightValues.forEach((fortnight, index) => {
          hiddenSheet.getCell(index + 1, 5).value = fortnight;
        });
      }

      // Define ranges
      const gradeRange =
        gradeNames.length > 0 ? `Data!$A$1:$A$${gradeNames.length}` : null;
      const stateRange =
        stateNames.length > 0 ? `Data!$B$1:$B$${stateNames.length}` : null;
      const corpRange =
        allCorporations.length > 0
          ? `Data!$C$1:$C$${allCorporations.length}`
          : null;

      // Apply data validations
      const yearRange = isFortnightly
        ? `Data!$D$1:$D${yearValues.length}`
        : null;
      const fortnightRange = isFortnightly
        ? `Data!$E$1:$E${fortnightValues.length}`
        : null;

      for (let row = 2; row <= dataRowCount + 1; row++) {
        if (gradeRange) {
          worksheet.getCell(row, gradeColIndex).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [gradeRange],
            showErrorMessage: true,
            errorTitle: 'Invalid',
            error: 'Select from list',
          };
        }

        if (stateRange) {
          worksheet.getCell(row, stateColIndex).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [stateRange],
            showErrorMessage: true,
            errorTitle: 'Invalid',
            error: 'Select from list',
          };
        }

        if (corpRange) {
          worksheet.getCell(row, corpColIndex).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [corpRange],
            showErrorMessage: true,
            errorTitle: 'Invalid',
            error: 'Select from list',
          };
        }

        // Year and Fortnight dropdowns for Fortnightly
        if (isFortnightly && yearRange) {
          worksheet.getCell(row, yearColIndex).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [yearRange],
            showErrorMessage: true,
            errorTitle: 'Invalid',
            error: 'Select from list',
          };
        }

        if (isFortnightly && fortnightRange) {
          worksheet.getCell(row, fortnightColIndex).dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: [fortnightRange],
            showErrorMessage: true,
            errorTitle: 'Invalid',
            error: 'Select from list',
          };
        }
      }
    }

    // Freeze header row
    worksheet.views = [{ state: 'frozen', xSplit: 3, ySplit: 1 }];

    // Generate and send file
    const fileName = `Salary_Template_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, '../uploads', fileName);

    await workbook.xlsx.writeFile(filePath);

    return res.download(filePath, fileName, (err) => {
      // Delete file after download
      fs.unlink(filePath, () => {});
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (error) {
    console.error('Error in uploadSalaryStructureDemoExcel:', error);
    next(error);
  }
};

// Helper function to determine AmountIn based on formula
const getAmountInFromFormula = (grade_salary_structure) => {
  let hasGrossInFormula = false;
  let hasCTCInFormula = false;

  for (const item of grade_salary_structure) {
    const formula = (item.formula || '').toUpperCase();
    const formula1 = (item.formula1 || '').toUpperCase();

    if (formula.includes('GROSS') || formula1.includes('GROSS')) {
      hasGrossInFormula = true;
    }
    if (formula.includes('CTC') || formula1.includes('CTC')) {
      hasCTCInFormula = true;
    }
  }

  if (hasCTCInFormula && !hasGrossInFormula) {
    return { AmountIn: '0', basedOn: 'CTC' };
  }
  return { AmountIn: '1', basedOn: 'GROSS' };
};

// ============= LOCAL CALCULATION FUNCTIONS (NO DB QUERIES INSIDE) =============
// Formula calculation functions (precedence, isNumeric, resolveValue, formulaCalculation, infixtopostfix)
// are imported from commonUtilFunctions.js

// Local grade structure calculation (no DB queries)
function gradeStructureCalculationLocal(
  gradeStructureData = [],
  ctc,
  AmountIn,
  yearMonth,
  calculatedGross = 0,
  calculationOf,
  stateid,
  corporationId,
  gender,
  payheadMasterId,
  payheadAmount,
  ptSlabData = [],
  lwfData = null,
) {
  let aTotal = 0,
    extra_aTotal = 0,
    bTotal = 0,
    cTotal = 0;

  for (let n = 0; n < gradeStructureData.length; n++) {
    let value = 0;

    // if CTC
    if (
      AmountIn == '0' &&
      gradeStructureData[n].payheadMasterId == payheadMasterIdsMapping.CTC
    ) {
      gradeStructureData[n].finalvalue = Number(ctc);
      continue;
    }

    // Gross
    if (
      AmountIn == '1' &&
      gradeStructureData[n].payheadMasterId == payheadMasterIdsMapping.GROSS
    ) {
      gradeStructureData[n].finalvalue = +calculatedGross || Number(ctc);
      continue;
    }

    // set if payheadmasterid and amount is available
    if (
      payheadMasterId &&
      payheadMasterId == gradeStructureData[n].payheadMasterId
    ) {
      gradeStructureData[n].fieldFixAmount = Number(payheadAmount);
    }

    // continue if other calculation
    if (
      calculationOf == 'other' &&
      gradeStructureData[n].salaryFieldSrNo == 'A' &&
      gradeStructureData[n].considerIn != 'net'
    ) {
      continue;
    }

    // PT calculation
    if (gradeStructureData[n].payheadMasterId == payheadMasterIdsMapping.PTAX) {
      const month = String(yearMonth).slice(4, 6);
      const GrossAmountForPT = +calculatedGross || 0;
      let getPTData = [];

      if (ptSlabData.length) {
        const filtered = ptSlabData.filter(
          (e) =>
            e.corporationId == corporationId &&
            e.applicableFromYYYYMM <= yearMonth,
        );
        const maxApplicable = Math.max(
          ...filtered.map((e) => e.applicableFromYYYYMM),
        );
        getPTData = filtered.filter(
          (e) => +e.applicableFromYYYYMM == +maxApplicable,
        );
      }

      const PTCalculation = getPTData[0]?.ptCalculation || null;

      if (PTCalculation == PTCalculationEnum.HALFYEARLY) {
        const gross = GrossAmountForPT * 6;
        const ptData = getPTData.filter(
          (e) => +e.fromAmount <= +gross && +e.toAmount >= +gross,
        );
        let PTAmount = 0;
        if (ptData.length) {
          if (gender == 'female') {
            PTAmount = Math.max(ptData[0].femaleTax, ptData[1]?.femaleTax || 0);
          } else {
            PTAmount = Math.max(ptData[0].maleTax, ptData[1]?.maleTax || 0);
          }
        }
        value = Math.round(+PTAmount / 6);
      } else {
        const ptData = getPTData.find(
          (e) =>
            +e.fromAmount <= +GrossAmountForPT &&
            +e.toAmount >= +GrossAmountForPT &&
            e.month == month,
        );
        if (ptData) {
          value = gender == 'female' ? ptData.femaleTax : ptData.maleTax;
        }
      }
    } else if (
      gradeStructureData[n].payheadMasterId ==
        payheadMasterIdsMapping.EMPLOYEE_LWF ||
      gradeStructureData[n].payheadMasterId ==
        payheadMasterIdsMapping.EMPLOYER_LWF
    ) {
      value = 0;

      if (lwfData) {
        if (
          lwfData.deductionMethod == lwfDeductionMethodEnum.GROSS_PERCENTAGE
        ) {
          const percentage =
            +gradeStructureData[n].payheadMasterId ===
            payheadMasterIdsMapping.EMPLOYEE_LWF
              ? lwfData.employeePer
              : lwfData.employerPer;

          const capping =
            +gradeStructureData[n].payheadMasterId ===
            payheadMasterIdsMapping.EMPLOYEE_LWF
              ? lwfData.employeeCapping
              : lwfData.employerCapping;

          const gross = +calculatedGross || Number(ctc);

          value = (+percentage * +gross) / 100;

          if (capping != null) {
            value = Math.min(value, capping);
          }
        } else {
          value =
            +gradeStructureData[n].payheadMasterId ==
            payheadMasterIdsMapping.EMPLOYEE_LWF
              ? lwfData?.employeeAmt || 0
              : lwfData?.employerAmt || 0;
        }
      }
    }
    // Set extra fields to zero
    else if (
      notIncludePyaheadIds.includes(gradeStructureData[n].payheadMasterId)
    ) {
      value = 0;
    } else {
      let tempValue = 0,
        tempValue1 = 0;

      if (gradeStructureData[n].formula) {
        tempValue = Number(
          infixtopostfix(gradeStructureData[n].formula, gradeStructureData),
        );
      } else {
        tempValue = +gradeStructureData[n].fieldFixAmount || 0;
      }

      if (
        gradeStructureData[n].formula1 ||
        gradeStructureData[n].fieldFixAmount1
      ) {
        if (gradeStructureData[n].formula1) {
          tempValue1 = Number(
            infixtopostfix(gradeStructureData[n].formula1, gradeStructureData),
          );
        } else {
          tempValue1 = Number(gradeStructureData[n].fieldFixAmount1) || 0;
        }
      }

      value =
        gradeStructureData[n].formulaPreference == FormulaPreferenceEnum.HIGHER
          ? Math.max(tempValue, tempValue1)
          : gradeStructureData[n].formulaPreference ==
              FormulaPreferenceEnum.LOWER
            ? Math.min(tempValue, tempValue1)
            : tempValue;

      if (
        gradeStructureData[n].EmployeeSalaryAmount >= 0 &&
        +gradeStructureData[n].fieldFixAmount >= 0 &&
        !gradeStructureData[n].fieldFixAmount1 &&
        !gradeStructureData[n].formula1 &&
        !gradeStructureData[n].formula
      ) {
        value = gradeStructureData[n].EmployeeSalaryAmount;
      }
    }

    let salaryfieldroundno = 0;

    if (gradeStructureData[n].assignSalaryRound == 'Y') {
      gradeStructureData[n].actualvalue = Number(value.toFixed(3));
      gradeStructureData[n].finalvalue =
        gradeStructureData[n].assignSalaryRoundOffType == 0
          ? Math.ceil(value.toFixed(2))
          : Math.round(value);
    } else {
      salaryfieldroundno = !gradeStructureData[n].assignSalaryRoundNo
        ? 0
        : +gradeStructureData[n].assignSalaryRoundNo;
      gradeStructureData[n].actualvalue = Number(value.toFixed(3));
      gradeStructureData[n].finalvalue = Number(
        value.toFixed(salaryfieldroundno),
      );
    }

    if (gradeStructureData[n].salaryfieldmaxrange) {
      if (Number(value) > Number(gradeStructureData[n].salaryfieldmaxrange)) {
        gradeStructureData[n].finalvalue =
          gradeStructureData[n].salaryfieldmaxrange;
      }
    }

    if (gradeStructureData[n].payheadMasterId == 59 && !showEmployerLWF)
      continue;

    if (
      ![
        payheadMasterIdsMapping.GROSS,
        payheadMasterIdsMapping.CTC,
        payheadMasterIdsMapping.NETSALARY,
      ].includes(gradeStructureData[n].payheadMasterId)
    ) {
      if (
        gradeStructureData[n].salaryFieldSrNo == 'A' &&
        gradeStructureData[n].considerIn != 'net'
      ) {
        aTotal += +(gradeStructureData[n].finalvalue || 0);
      }
      if (
        gradeStructureData[n].salaryFieldSrNo == 'A' &&
        gradeStructureData[n].considerIn == 'net'
      ) {
        extra_aTotal += +(gradeStructureData[n].finalvalue || 0);
      }
      if (gradeStructureData[n].salaryFieldSrNo == 'B') {
        bTotal += +(gradeStructureData[n].finalvalue || 0);
      }
      if (gradeStructureData[n].salaryFieldSrNo == 'C') {
        cTotal += +(gradeStructureData[n].finalvalue || 0);
      }
    }
  }

  return { gradeStructureData, aTotal, extra_aTotal, bTotal, cTotal };
}

// Local assign salary structure (no DB queries - all data passed as params)
function assignSalaryStructureLocal(
  grade_salary_structure_data_temp = [],
  ctc,
  stateid,
  AmountIn,
  yearMonth,
  gender,
  corporationId,
  skillCategory,
  payheadMasterId = null,
  payheadAmount = 0,
  hasMinimumWages = false,
  ptSlabData = [],
  minWagesMasterData = null,
  payhead_B_C = [],
  lwfData = null,
) {
  let aTotal = 0,
    bTotal = 0,
    cTotal = 0,
    extra_aTotal = 0;
  let minWagesMasterId = null;

  const NET_CTC_GROSS = [...grade_salary_structure_data_temp].filter((e) =>
    [
      payheadMasterIdsMapping.GROSS,
      payheadMasterIdsMapping.CTC,
      payheadMasterIdsMapping.NETSALARY,
    ].includes(e.payheadMasterId),
  );
  const EPF_Data = [...grade_salary_structure_data_temp].find(
    (e) => e.payheadMasterId == 5,
  );
  const grade_salary_structure_data = [
    ...grade_salary_structure_data_temp,
  ].filter(
    (e) =>
      ![
        payheadMasterIdsMapping.GROSS,
        payheadMasterIdsMapping.CTC,
        payheadMasterIdsMapping.NETSALARY,
        payheadMasterIdsMapping.EPF,
      ].includes(e.payheadMasterId),
  );

  const minWages = [];

  if (hasMinimumWages && minWagesMasterData) {
    const amount =
      skillCategory == SkillCategoryType.SKILLED
        ? minWagesMasterData?.skilled
        : skillCategory == SkillCategoryType.SEMISKILLED
          ? minWagesMasterData?.semiSkilled
          : skillCategory == SkillCategoryType.UNSKILLED
            ? minWagesMasterData?.unSkilled
            : 0;
    minWagesMasterId = minWagesMasterData?.id || null;

    minWages.push({
      payheadName: 'Minimum Wages',
      fieldFixAmount: amount || 0,
    });
  }

  const A_Data = grade_salary_structure_data.filter(
    (e) => e.salaryFieldSrNo == 'A' && e.considerIn != 'net',
  );

  const usedPayheads = payhead_B_C.filter((payhead) => {
    const name = payhead.Payheadmaster?.payheadName || '';
    return A_Data.some((item) => {
      const formula = item.formula || '';
      const formula1 = item.formula1 || '';
      const regex = new RegExp(
        `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      );
      return regex.test(formula) || regex.test(formula1);
    });
  });

  const usedPayheadIds = usedPayheads.map((e) => +e.payheadMasterId);
  const usedPayheadData = grade_salary_structure_data.filter((e) =>
    usedPayheadIds.includes(+e.payheadMasterId),
  );
  const finalAData = [...A_Data, ...usedPayheadData].sort(
    (a, b) => a.salaryfieldindex - b.salaryfieldindex,
  );
  const with_A_Data = [...NET_CTC_GROSS, ...minWages, ...finalAData];

  const calculatedData = gradeStructureCalculationLocal(
    with_A_Data,
    ctc,
    AmountIn,
    yearMonth,
    0,
    'A',
    stateid,
    corporationId,
    gender,
    payheadMasterId,
    payheadAmount,
    ptSlabData,
    lwfData,
  );

  const calculatedGross = calculatedData.aTotal;
  const calculated_A = calculatedData.gradeStructureData.filter(
    (e) =>
      ![
        payheadMasterIdsMapping.GROSS,
        payheadMasterIdsMapping.CTC,
        payheadMasterIdsMapping.NETSALARY,
      ].includes(e.payheadMasterId),
  );
  const WithOut_A_Data = grade_salary_structure_data.filter(
    (e) =>
      (e.salaryFieldSrNo != 'A' || e.considerIn == 'net') &&
      !usedPayheadIds.includes(+e.payheadMasterId),
  );

  const calculate_Without_A = gradeStructureCalculationLocal(
    [...NET_CTC_GROSS, ...calculated_A, ...minWages, ...WithOut_A_Data],
    ctc,
    AmountIn,
    yearMonth,
    calculatedGross,
    'other',
    stateid,
    corporationId,
    gender,
    payheadMasterId,
    payheadAmount,
    ptSlabData,
    lwfData,
  );

  const finalStructureData = calculate_Without_A.gradeStructureData.filter(
    (e) =>
      ![
        payheadMasterIdsMapping.GROSS,
        payheadMasterIdsMapping.CTC,
        payheadMasterIdsMapping.NETSALARY,
      ].includes(e.payheadMasterId) && e.payheadName != 'Minimum Wages',
  );

  aTotal = +calculatedGross;
  extra_aTotal = +calculate_Without_A.extra_aTotal;
  bTotal += +calculate_Without_A.bTotal;
  cTotal += +calculate_Without_A.cTotal;

  if (EPF_Data) {
    const PF_Amount =
      finalStructureData.find(
        (e) => e.payheadMasterId == payheadMasterIdsMapping.PF,
      )?.finalvalue || 0;
    const EPS_Amount =
      finalStructureData.find(
        (e) => e.payheadMasterId == payheadMasterIdsMapping.EPS,
      )?.finalvalue || 0;
    const finalvalue1 =
      +PF_Amount - +EPS_Amount > 0 ? +PF_Amount - +EPS_Amount : 0;
    const finalvalue = getRoundOffSalary(
      finalvalue1,
      EPF_Data.assignSalaryRound,
      EPF_Data.assignSalaryRoundOffType,
      EPF_Data.assignSalaryRoundNo,
    );
    const actualvalue = +finalvalue1.toFixed(3);

    cTotal += +finalvalue;

    const EPF_Data_temp = { ...EPF_Data, finalvalue, actualvalue };
    finalStructureData.splice(+EPF_Data.salaryfieldindex, 0, EPF_Data_temp);
  }

  [...NET_CTC_GROSS].forEach((e) => {
    if (e.payheadMasterId == payheadMasterIdsMapping.CTC) {
      const amount = getRoundOffSalary(
        +aTotal + +cTotal + +extra_aTotal,
        e.assignSalaryRound,
        e.assignSalaryRoundOffType,
        e.assignSalaryRoundNo,
      );
      e.finalvalue = +amount;
      e.actualvalue = +amount;
    }
    if (e.payheadMasterId == payheadMasterIdsMapping.GROSS) {
      const amount = getRoundOffSalary(
        +aTotal,
        e.assignSalaryRound,
        e.assignSalaryRoundOffType,
        e.assignSalaryRoundNo,
      );
      e.finalvalue = +amount;
      e.actualvalue = +amount;
    }
    if (e.payheadMasterId == payheadMasterIdsMapping.NETSALARY) {
      const amount = getRoundOffSalary(
        +aTotal - +bTotal + +extra_aTotal,
        e.assignSalaryRound,
        e.assignSalaryRoundOffType,
        e.assignSalaryRoundNo,
      );
      e.finalvalue = +amount;
      e.actualvalue = +amount;
    }
  });

  return {
    salaryStructureData: [...finalStructureData, ...NET_CTC_GROSS],
    minWagesMasterId,
  };
}

// Map Excel values to grade structure for EmployeeSalaryAmount field
// This allows using Excel entered amount when fieldFixAmount exists but no formula/fieldFixAmount1
function mapExcelValuesToGradeStructure(
  gradeStructure,
  salaryHeaders,
  row,
  BASE_HEADERS_COUNT,
  payheadNameToId,
) {
  salaryHeaders.forEach((headerName, idx) => {
    const excelValue =
      parseFloat(row.getCell(BASE_HEADERS_COUNT + idx + 1).value) || 0;
    const payheadId = payheadNameToId.get(headerName?.toLowerCase()?.trim());

    if (payheadId) {
      const matchingItem = gradeStructure.find(
        (g) => g.payheadMasterId === payheadId,
      );
      if (matchingItem) {
        matchingItem.EmployeeSalaryAmount = excelValue;
      }
    }
  });
}

// ============= COMMON HELPER FUNCTIONS FOR SALARY VALIDATION =============

// Fetch last calculated salary for users (for salary already calculated check)
async function fetchLastCalculatedSalary(userMasterIDs, payrollFrequency) {
  if (!userMasterIDs || userMasterIDs.length === 0) return [];

  // Get the last calculated salary transaction for each user
  return HRSalaryTrasaction.findAll({
    where: {
      userMasterID: { [Sequelize.Op.in]: userMasterIDs },
      payrollFrequency: payrollFrequency || PayrollFrequencyType.MONTHLY,
    },
    attributes: [
      'userMasterID',
      [Sequelize.fn('MAX', Sequelize.col('salaryYYYYMM')), 'lastSalaryYYYYMM'],
      [Sequelize.fn('MAX', Sequelize.col('startDate')), 'lastStartDate'],
      [Sequelize.fn('MAX', Sequelize.col('endDate')), 'lastEndDate'],
    ],
    group: ['userMasterID'],
    raw: true,
  });
}

// Create lookup map for last calculated salary
// Returns Map: userMasterID -> { lastSalaryYYYYMM, lastStartDate, lastEndDate }
function createLastCalculatedSalaryMap(lastCalculatedSalaries) {
  const map = new Map();
  lastCalculatedSalaries.forEach((item) => {
    map.set(item.userMasterID, {
      lastSalaryYYYYMM: item.lastSalaryYYYYMM,
      lastStartDate: item.lastStartDate,
      lastEndDate: item.lastEndDate,
    });
  });
  return map;
}

// Check if salary is already calculated for the given period
// Returns true if salary is already calculated (should show error)
function isSalaryAlreadyCalculated(
  lastCalcData,
  applicableYYYYMM,
  startDate,
  isFortnightly,
) {
  if (!lastCalcData) return false;

  if (isFortnightly) {
    // For fortnightly: check if lastStartDate >= startDate
    if (lastCalcData.lastStartDate && startDate) {
      return new Date(lastCalcData.lastStartDate) >= new Date(startDate);
    }
  } else {
    // For monthly: check if lastSalaryYYYYMM >= applicableYYYYMM
    if (lastCalcData.lastSalaryYYYYMM && applicableYYYYMM) {
      return +lastCalcData.lastSalaryYYYYMM >= +applicableYYYYMM;
    }
  }
  return false;
}

// Fetch existing salary structures for users (for duplicate check)
async function fetchExistingSalaryStructures(userMasterIDs, payrollFrequency) {
  if (!userMasterIDs || userMasterIDs.length === 0) return [];

  return HRSalaryMaster.findAll({
    where: {
      userMasterID: { [Sequelize.Op.in]: userMasterIDs },
      payrollFrequency: payrollFrequency || PayrollFrequencyType.MONTHLY,
    },
    attributes: [
      'userMasterID',
      'salaryFromYYYYMM',
      'startDate',
      'endDate',
      'payrollFrequency',
    ],
    group: [
      'userMasterID',
      'salaryFromYYYYMM',
      'startDate',
      'endDate',
      'payrollFrequency',
    ],
    raw: true,
  });
}

// Create lookup map for existing salary structures
// Key format: For Monthly -> "userMasterID_YYYYMM", For Fortnightly -> "userMasterID_startDate_endDate"
function createExistingSalaryStructureMap(
  existingSalaryStructures,
  isFortnightly,
) {
  const map = new Map();
  existingSalaryStructures.forEach((item) => {
    let key;
    if (isFortnightly) {
      key = `${item.userMasterID}_${item.startDate}_${item.endDate}`;
    } else {
      key = `${item.userMasterID}_${item.salaryFromYYYYMM}`;
    }
    map.set(key, true);
  });
  return map;
}

// Fetch all master data for salary validation
async function fetchSalaryValidationMasterData(
  req,
  companyMasterID,
  mobileNumbers = [],
) {
  const userAccessCondition = accessibleRoleWiseUsers({
    userDetails: req.userDetails,
    includeCompany: !companyMasterID,
  });
  const [
    allGrades,
    allStates,
    allCorporations,
    salaryFields,
    allUsers,
    allMinWages,
    allPTSlabs,
    allGradeSalaryStructures,
    allLWFData,
  ] = await Promise.all([
    GradeStructure.findAll({
      where: { companyMasterID, status: 1 },
      attributes: ['gradeStructureID', 'gradeName', 'baseOnCalculation'],
      raw: true,
    }),
    StateMaster.findAll({
      where: { countryMasterID: 103, status: 1 },
      attributes: ['stateMasterID', 'stateName'],
      raw: true,
    }),
    Corporation.findAll({
      attributes: ['id', 'corporationName', 'stateMasterID'],
      raw: true,
    }),
    HRSalaryFields.findAll({
      where: {
        companyMasterID,
        status: 1,
        payheadMasterId: { [Sequelize.Op.notIn]: default_payheadMasterIds },
      },
      include: [{ model: Payheadmaster, attributes: ['payheadName'] }],
      attributes: ['payheadMasterId', 'salaryFieldSrNo', 'salaryFieldID'],
    }),
    mobileNumbers.length > 0
      ? UserMaster.findAll({
          where: {
            companyMasterId: companyMasterID,
            userNumber: { [Sequelize.Op.in]: mobileNumbers },
            status: 1,
            ...userAccessCondition.where,
          },
          attributes: ['userMasterID', 'userNumber', 'gender', 'displayName'],
          raw: true,
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeJoiningDetails,
              attributes: ['salaryCalculationAct'],
            },
          ],
        })
      : [],
    MinWagesMaster.findAll({
      where: { companyMasterId: companyMasterID },
      order: [['applicableYYYYMM', 'DESC']],
      raw: true,
    }),
    ProfessionalTaxSlabMaster.findAll({
      where: { status: 1 },
      raw: true,
    }),
    GradeSalaryStructure.findAll({
      raw: true,
      include: [
        {
          model: HRSalaryFields,
          attributes: [],
          include: [{ model: Payheadmaster, attributes: [] }],
        },
        {
          model: GradeStructure,
          attributes: [],
          where: { companyMasterID, status: 1 },
        },
      ],
      order: [
        [
          { model: HRSalaryFields, as: 'hrSalaryField' },
          'salaryFieldSrNo',
          'ASC',
        ],
        ['salaryfieldindex', 'ASC'],
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
    }),
    LwfMaster.findAll(),
  ]);

  // Filter B and C salary fields from already fetched salaryFields
  const payhead_B_C = salaryFields.filter((f) =>
    ['B', 'C'].includes(f.salaryFieldSrNo),
  );

  // Convert salaryFields to raw format for payheadNameToId map
  const salaryFieldsRaw = salaryFields.map((f) => ({
    payheadMasterId: f.payheadMasterId,
    salaryFieldSrNo: f.salaryFieldSrNo,
    salaryFieldID: f.salaryFieldID,
    'Payheadmaster.payheadName': f.Payheadmaster?.payheadName,
  }));

  return {
    allGrades,
    allStates,
    allCorporations,
    salaryFields: salaryFieldsRaw,
    payhead_B_C,
    allUsers,
    allMinWages,
    allPTSlabs,
    allGradeSalaryStructures,
    allLWFData,
  };
}

// Create lookup maps from master data
function createLookupMaps(masterData) {
  const {
    allGrades,
    allStates,
    allCorporations,
    salaryFields,
    allUsers,
    allGradeSalaryStructures,
  } = masterData;

  const gradeMap = new Map(
    allGrades.map((g) => [
      g.gradeName?.toLowerCase()?.trim(),
      g.gradeStructureID,
    ]),
  );
  const stateMap = new Map(
    allStates.map((s) => [s.stateName?.toLowerCase()?.trim(), s.stateMasterID]),
  );
  const corpMap = new Map(
    allCorporations.map((c) => [c.corporationName?.toLowerCase()?.trim(), c]),
  );
  const userMap = new Map(
    allUsers.map((u) => [u.userNumber?.toString()?.trim(), u]),
  );

  const gradeSalaryStructureMap = new Map();
  allGradeSalaryStructures.forEach((item) => {
    const gradeId = item.gradeStructureID;
    if (!gradeSalaryStructureMap.has(gradeId)) {
      gradeSalaryStructureMap.set(gradeId, []);
    }
    gradeSalaryStructureMap.get(gradeId).push(item);
  });

  const payheadNameToId = new Map();
  salaryFields.forEach((f) => {
    const name = (
      f['Payheadmaster.payheadName'] || f.Payheadmaster?.payheadName
    )
      ?.toLowerCase()
      ?.trim();
    if (name) payheadNameToId.set(name, f.payheadMasterId);
  });
  payheadNameToId.set('gross', payheadMasterIdsMapping.GROSS);
  payheadNameToId.set('net salary', payheadMasterIdsMapping.NETSALARY);
  payheadNameToId.set('ctc', payheadMasterIdsMapping.CTC);

  return {
    gradeMap,
    stateMap,
    corpMap,
    userMap,
    gradeSalaryStructureMap,
    payheadNameToId,
  };
}

// Set cell remarks with color (only if remarks exist)
function setCellRemarks(cell, remarks, hasError) {
  if (!hasError || !remarks || remarks.length === 0) {
    cell.value = '';
    return;
  }
  cell.value = Array.isArray(remarks) ? remarks.join('; ') : remarks;
  cell.font = { color: { argb: 'FFFF0000' } };
}

// ============= END COMMON HELPER FUNCTIONS =============

// Merged API: Validate on submit OR get paginated data from existing file
exports.validateSalaryStructure = async (req, res, next) => {
  const { from, filename, page = 1, limit = 20 } = req.body;

  // If not submit, just return paginated data from existing file
  if (from !== 'submit') {
    try {
      if (!filename) {
        return res.status(statusCodes.OK).json({
          status: statusCodes.BAD_REQUEST,
          message: 'Filename is required',
        });
      }

      const existingFilepath = path.join(
        __dirname,
        `../uploads/upload-salary-structure/${filename}`,
      );
      if (!fs.existsSync(existingFilepath)) {
        return res.status(statusCodes.OK).json({
          status: statusCodes.BAD_REQUEST,
          message: 'File not found',
        });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(existingFilepath);
      const worksheet = workbook.getWorksheet(1);

      if (!worksheet || worksheet.rowCount < 2) {
        return res.status(statusCodes.OK).json({
          status: statusCodes.OK,
          filename,
          data: [],
          totalCount: 0,
          totalPages: 0,
          summary: { invalidRows: 0, remarksRowNumbers: [] },
        });
      }

      const headerRow = worksheet.getRow(1);
      const headers = [];
      headerRow.eachCell((cell) => {
        headers.push(cell.value?.toString() || '');
      });

      const allData = [];
      const remarksRowNumbers = [];

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        const employeeRowNo = rowIndex - 1; // Employee row starts from 1
        const rowData = { rowIndex: employeeRowNo };

        headers.forEach((header, idx) => {
          rowData[header] = row.getCell(idx + 1).value;
        });

        const remarks = rowData['Remarks'] || '';

        // Track rows with remarks
        if (remarks && remarks !== '') {
          remarksRowNumbers.push(employeeRowNo);
        }

        allData.push(rowData);
      }

      const totalCount = allData.length;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const paginatedData = allData.slice(
        (pageNum - 1) * limitNum,
        pageNum * limitNum,
      );

      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        filename,
        data: paginatedData,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        remarksRowNumbers,
      });
    } catch (error) {
      console.error('Error in validateSalaryStructure (pagination):', error);
      next(error);
    }
    return;
  }

  // from === 'submit' - Validate Excel
  if (!req.file) {
    return res.status(statusCodes.OK).send({
      status: statusCodes.BAD_REQUEST,
      message: 'Please upload an excel file!',
    });
  }

  const filepath = path.join(
    __dirname,
    `../uploads/upload-salary-structure/${req.file.filename}`,
  );
  const outputFilename = `validated_${Date.now()}_${req.userDetails.userMasterId}_${req.file.originalname || req.file.filename}`;
  const outputFilepath = path.join(
    __dirname,
    `../uploads/upload-salary-structure/${outputFilename}`,
  );

  try {
    const { companyMasterID, payrollFrequency } = req.body;

    if (!companyMasterID) {
      fs.unlinkSync(filepath);
      return res.status(statusCodes.OK).send({
        status: statusCodes.BAD_REQUEST,
        message: 'Company is required',
      });
    }

    const isFortnightly = payrollFrequency === PayrollFrequencyType.FORTNIGHTLY;

    // Read Excel using ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filepath);
    const worksheet = workbook.getWorksheet(1);

    fs.unlinkSync(filepath);

    if (!worksheet || worksheet.rowCount < 2) {
      return res.status(statusCodes.OK).send({
        status: statusCodes.BAD_REQUEST,
        message: 'Excel file is empty or has no data rows',
      });
    }

    // Get headers
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || '';
    });

    // Validate Excel file format - check fixed fields structure
    const expectedBaseHeaders = fixBaseHeaders(isFortnightly);

    // Check if we have minimum required headers
    if (headers.length < expectedBaseHeaders.length) {
      return res.status(statusCodes.OK).send({
        status: statusCodes.BAD_REQUEST,
        message: 'Invalid file format - insufficient columns',
      });
    }

    // Validate base headers (first 12/13 columns) match exactly
    for (let i = 0; i < expectedBaseHeaders.length; i++) {
      if (headers[i]?.trim() !== expectedBaseHeaders[i]) {
        return res.status(statusCodes.OK).send({
          status: statusCodes.BAD_REQUEST,
          message: `Invalid file format - Expected "${expectedBaseHeaders[i]}" at column ${i + 1}, found "${headers[i] || 'empty'}"`,
        });
      }
    }

    // BASE_HEADERS_COUNT: 12 for monthly, 13 for fortnightly (Year + Fortnight instead of YYYYMM)
    const BASE_HEADERS_COUNT = isFortnightly ? 13 : 12;
    const UUID_COL_INDEX = headers.length + 1;
    const REMARKS_COL_INDEX = headers.length + 2;

    // Add UUID header
    headerRow.getCell(UUID_COL_INDEX).value = 'UUID';
    headerRow.getCell(UUID_COL_INDEX).font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    headerRow.getCell(UUID_COL_INDEX).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    // Add Remarks header
    headerRow.getCell(REMARKS_COL_INDEX).value = 'Remarks';
    headerRow.getCell(REMARKS_COL_INDEX).font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    headerRow.getCell(REMARKS_COL_INDEX).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };

    const salaryHeaders = headers.slice(BASE_HEADERS_COUNT);

    // Collect mobile numbers for bulk lookup
    const mobileNumbers = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const mobile = row.getCell(3).value?.toString()?.trim();
        if (mobile) mobileNumbers.push(mobile);
      }
    });

    if (mobileNumbers.length == 0) {
      return res.status(statusCodes.OK).send({
        status: statusCodes.BAD_REQUEST,
        message: 'No mobile numbers found in the uploaded Excel file.',
      });
    }

    // Check for duplicate mobile numbers in Excel
    const mobileCountMap = {};
    mobileNumbers.forEach((mobile) => {
      mobileCountMap[mobile] = (mobileCountMap[mobile] || 0) + 1;
    });
    const duplicateMobiles = Object.keys(mobileCountMap).filter(
      (mobile) => mobileCountMap[mobile] > 1,
    );

    if (duplicateMobiles.length > 0) {
      return res.status(statusCodes.OK).send({
        status: statusCodes.BAD_REQUEST,
        message: `Duplicate mobile numbers found: ${duplicateMobiles.join(', ')}`,
      });
    }

    // Fetch all master data using common function
    const masterData = await fetchSalaryValidationMasterData(
      req,
      companyMasterID,
      mobileNumbers,
    );
    const lookupMaps = createLookupMaps(masterData);
    const {
      userMap,
      gradeMap,
      stateMap,
      corpMap,
      gradeSalaryStructureMap,
      payheadNameToId,
    } = lookupMaps;
    const { allMinWages, allPTSlabs, payhead_B_C, allLWFData } = masterData;

    const allLWFStateWiseMap = new Map();

    for (const lwf of allLWFData) {
      const key = +lwf.stateID;

      if (!allLWFStateWiseMap.has(key)) {
        allLWFStateWiseMap.set(key, []);
      }

      const data = allLWFStateWiseMap.get(key);

      data?.push(lwf);
    }

    // Fetch existing salary structures for duplicate check (optimized - single query)
    const userMasterIDs = Array.from(userMap.values()).map(
      (u) => u.userMasterID,
    );
    const [existingSalaryStructures, lastCalculatedSalaries] =
      await Promise.all([
        fetchExistingSalaryStructures(userMasterIDs, payrollFrequency),
        fetchLastCalculatedSalary(userMasterIDs, payrollFrequency),
      ]);
    const existingSalaryMap = createExistingSalaryStructureMap(
      existingSalaryStructures,
      isFortnightly,
    );
    const lastCalculatedSalaryMap = createLastCalculatedSalaryMap(
      lastCalculatedSalaries,
    );

    const remarksRowNumbers = [];

    // Process each row
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      const remarks = [];
      const employeeRowNo = rowIndex - 1; // Employee row starts from 1

      // Generate UUID for this row
      const rowUUID = crypto.randomUUID();
      row.getCell(UUID_COL_INDEX).value = rowUUID;

      const mobileNumber = row.getCell(3).value?.toString()?.trim();
      const skillCategory = row.getCell(8).value?.toString()?.trim() || null;

      // Handle Fortnightly vs Monthly columns
      let applicableYYYYMM,
        startDate,
        endDate,
        salaryGrade,
        stateName,
        corporationName;

      if (isFortnightly) {
        const year = row.getCell(9).value?.toString()?.trim();
        const fortnight = row.getCell(10).value?.toString()?.trim();
        salaryGrade = row.getCell(11).value?.toString()?.trim();
        stateName = row.getCell(12).value?.toString()?.trim();
        corporationName = row.getCell(13).value?.toString()?.trim();

        // Validate Year and Fortnight
        if (!year) {
          remarks.push('Year is required');
        } else if (!/^\d{4}$/.test(year)) {
          remarks.push('Invalid Year format');
        }

        if (!fortnight) {
          remarks.push('Applicable From (Fortnight) is required');
        } else {
          // Get date ranges for the year
          const dateRanges = getDateRangesByType(
            PayrollFrequencyType.FORTNIGHTLY,
            year,
          );
          const matchedFortnight = dateRanges.find(
            (d) => d.title === fortnight,
          );

          if (!matchedFortnight) {
            remarks.push(`Invalid Fortnight: ${fortnight}`);
          } else {
            startDate = matchedFortnight.from;
            endDate = matchedFortnight.to;
            // Calculate applicableYYYYMM from startDate (e.g., '2026-01-05' → '202601')
            applicableYYYYMM = startDate.slice(0, 4) + startDate.slice(5, 7);
          }
        }
      } else {
        applicableYYYYMM = row.getCell(9).value?.toString()?.trim();
        salaryGrade = row.getCell(10).value?.toString()?.trim();
        stateName = row.getCell(11).value?.toString()?.trim();
        corporationName = row.getCell(12).value?.toString()?.trim();

        // Validate YYYYMM
        if (!applicableYYYYMM) {
          remarks.push('Applicable YYYYMM required');
        } else if (!/^\d{6}$/.test(applicableYYYYMM)) {
          remarks.push('Invalid YYYYMM format');
        }
      }

      // Check user exists
      const user = userMap.get(mobileNumber);
      if (!user) {
        remarks.push('User not found');
        row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
        continue;
      }

      // Check if salary structure already exists for this user and period
      let existingKey;
      if (isFortnightly && startDate && endDate) {
        existingKey = `${user.userMasterID}_${startDate}_${endDate}`;
      } else if (applicableYYYYMM) {
        existingKey = `${user.userMasterID}_${applicableYYYYMM}`;
      }
      if (existingKey && existingSalaryMap.has(existingKey)) {
        const periodMsg = isFortnightly ? 'fortnight' : 'month';
        remarks.push(`Salary structure already assigned for this ${periodMsg}`);
        row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
        continue;
      }

      // Check if salary is already calculated for this period or later
      const lastCalcData = lastCalculatedSalaryMap.get(
        String(user.userMasterID),
      );
      if (
        isSalaryAlreadyCalculated(
          lastCalcData,
          applicableYYYYMM,
          startDate,
          isFortnightly,
        )
      ) {
        const periodMsg = isFortnightly ? 'fortnight' : 'month';
        remarks.push(`Salary already calculated for this ${periodMsg}`);
        row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
        continue;
      }

      const gender = user.gender || null;

      if (!salaryGrade) {
        remarks.push('Salary Grade required');
      }

      const gradeStructureID = gradeMap.get(salaryGrade?.toLowerCase()?.trim());
      if (salaryGrade && !gradeStructureID) {
        remarks.push(`Invalid Grade: ${salaryGrade}`);
      }

      const stateMasterID = stateMap.get(stateName?.toLowerCase()?.trim());
      if (stateName && !stateMasterID) {
        remarks.push(`Invalid State: ${stateName}`);
      }

      let corporationId = null;
      if (corporationName) {
        if (!stateMasterID) {
          remarks.push(`State is required for Corporation`);
        } else {
          const corp = corpMap.get(corporationName?.toLowerCase()?.trim());
          const checkForSameState = corp?.stateMasterID == stateMasterID;

          if (!corp || !checkForSameState) {
            remarks.push(`Invalid Corporation`);
          } else {
            corporationId = corp.id;
          }
        }
      }

      if (remarks.length > 0) {
        row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
        continue;
      }

      // Get grade structure from pre-fetched map (deep copy to avoid mutation)
      const grade_salary_structure = JSON.parse(
        JSON.stringify(gradeSalaryStructureMap.get(gradeStructureID) || []),
      );

      // Check if state is required (hasMinimumWages or payheadMasterId 15 exists)

      let stateRequired = false;
      let hasMinimumWages = false;
      let hasLwf = false;

      for (const item of grade_salary_structure) {
        const isMinimumWages =
          item.formula?.includes('Minimum Wages') ||
          item.formula1?.includes('Minimum Wages');

        if (isMinimumWages) {
          hasMinimumWages = true;
        }

        const isLwf =
          item.payheadMasterId == payheadMasterIdsMapping.EMPLOYEE_LWF ||
          item.payheadMasterId == payheadMasterIdsMapping.EMPLOYER_LWF;

        if (isLwf) hasLwf = true;

        if (
          item.payheadMasterId == payheadMasterIdsMapping.PTAX ||
          isLwf ||
          isMinimumWages
        ) {
          stateRequired = true;
        }

        if (stateRequired && hasMinimumWages && hasLwf) {
          break;
        }
      }

      // const hasMinimumWages = grade_salary_structure.some(
      //   (item) =>
      //     item.formula?.includes('Minimum Wages') ||
      //     item.formula1?.includes('Minimum Wages'),
      // );
      // const hasPT = grade_salary_structure.some(
      //   (item) => item.payheadMasterId == 15,
      // );

      if (stateRequired && !stateMasterID) {
        remarks.push('State is required');
        row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
        continue;
      }

      // Determine AmountIn from formula
      const { AmountIn, basedOn } = getAmountInFromFormula(
        grade_salary_structure,
      );

      // Get input value based on formula
      let inputValue = 0;
      const grossColIdx = salaryHeaders.findIndex(
        (h) => h?.toLowerCase()?.trim() === 'gross',
      );
      const ctcColIdx = salaryHeaders.findIndex(
        (h) => h?.toLowerCase()?.trim() === 'ctc',
      );

      if (basedOn === 'GROSS' && grossColIdx !== -1) {
        inputValue =
          parseFloat(row.getCell(BASE_HEADERS_COUNT + grossColIdx + 1).value) ||
          0;
      } else if (basedOn === 'CTC' && ctcColIdx !== -1) {
        inputValue =
          parseFloat(row.getCell(BASE_HEADERS_COUNT + ctcColIdx + 1).value) ||
          0;
      }

      if (!inputValue) {
        // Fallback: try to get Gross first, then CTC
        if (grossColIdx !== -1) {
          inputValue =
            parseFloat(
              row.getCell(BASE_HEADERS_COUNT + grossColIdx + 1).value,
            ) || 0;
        }
        if (!inputValue && ctcColIdx !== -1) {
          inputValue =
            parseFloat(row.getCell(BASE_HEADERS_COUNT + ctcColIdx + 1).value) ||
            0;
        }
      }

      if (!inputValue) {
        remarks.push(`${basedOn} value required`);
        row.getCell(REMARKS_COL_INDEX).value = remarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
        continue;
      }

      // Get MinWagesMaster data for this state and yearMonth (pre-fetched)
      let minWagesMasterData = null;
      if (hasMinimumWages && stateMasterID && applicableYYYYMM) {
        minWagesMasterData = allMinWages.find(
          (m) =>
            m.stateMasterId == stateMasterID &&
            m.applicableYYYYMM <= +applicableYYYYMM,
        );
      }

      // Filter PT slab data for this state
      const ptSlabData = allPTSlabs.filter(
        (pt) => pt.stateMasterID == stateMasterID,
      );

      // check Lwf data

      let lwfData = null;
      const targetMonth = +String(applicableYYYYMM).slice(4, 6);

      if (hasLwf) {
        const data = allLWFStateWiseMap?.get(+stateMasterID) || [];
        const salaryCalculationAct = ['W', 'F'].includes(
          user['employeeJoiningDetails.salaryCalculationAct'],
        )
          ? 'F'
          : 'S';

        lwfData = data?.reduce((latest, item) => {
          if (
            +item.applicableYearMonth <= +applicableYYYYMM &&
            (!item.month || item.month?.includes(targetMonth)) &&
            (item.applicableAct || []).includes(salaryCalculationAct) &&
            (!latest || +item.applicableYearMonth > +latest.applicableYearMonth)
          ) {
            return item;
          }
          return latest;
        }, null);
      }

      // Check for invalid or negative values BEFORE calculation
      const invalidValueRemarks = [];
      for (let idx = 0; idx < salaryHeaders.length; idx++) {
        const headerName = salaryHeaders[idx];
        const cellValue = row.getCell(BASE_HEADERS_COUNT + idx + 1).value;

        // Check if value is a valid number (not string/character)
        if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
          const numValue = Number(cellValue);
          if (isNaN(numValue)) {
            invalidValueRemarks.push(
              `${headerName}: Invalid value, must be a number`,
            );
            continue;
          }
          // Check for negative value
          if (numValue < 0) {
            invalidValueRemarks.push(
              `${headerName}: Negative value not allowed`,
            );
          }
        }
      }

      // If any invalid/negative values found, skip calculation and show remarks
      if (invalidValueRemarks.length > 0) {
        row.getCell(REMARKS_COL_INDEX).value = invalidValueRemarks.join('; ');
        remarksRowNumbers.push(employeeRowNo);
        continue;
      }

      // Map Excel values to grade structure for EmployeeSalaryAmount
      mapExcelValuesToGradeStructure(
        grade_salary_structure,
        salaryHeaders,
        row,
        BASE_HEADERS_COUNT,
        payheadNameToId,
      );

      try {
        // Use local calculation function (no DB queries inside)
        const { salaryStructureData } = assignSalaryStructureLocal(
          grade_salary_structure,
          inputValue,
          stateMasterID,
          AmountIn,
          applicableYYYYMM,
          gender,
          corporationId,
          skillCategory,
          null,
          0,
          hasMinimumWages,
          ptSlabData,
          minWagesMasterData,
          payhead_B_C,
          lwfData,
        );

        // Compare values
        const discrepancies = [];
        salaryHeaders.forEach((headerName, idx) => {
          const cellValue = row.getCell(BASE_HEADERS_COUNT + idx + 1).value;
          const excelValue = parseFloat(cellValue) || 0;
          const payheadId = payheadNameToId.get(
            headerName?.toLowerCase()?.trim(),
          );
          const calculatedField = salaryStructureData.find(
            (f) => f.payheadMasterId === payheadId,
          );
          const calculatedValue = calculatedField?.finalvalue || 0;

          // Check if payhead exists in grade structure but user entered amount
          const payheadExistsInGrade = grade_salary_structure.some(
            (g) => g.payheadMasterId === payheadId,
          );
          if (
            !payheadExistsInGrade &&
            excelValue > 0 &&
            ![
              payheadMasterIdsMapping.GROSS,
              payheadMasterIdsMapping.CTC,
              payheadMasterIdsMapping.NETSALARY,
            ].includes(payheadId)
          ) {
            discrepancies.push(
              `${headerName}: Payhead not exist in grade structure`,
            );
            return;
          }

          if (Math.abs(excelValue - calculatedValue) > 0) {
            discrepancies.push(
              `${headerName}:Excel value(${excelValue}) and Calculated value(${calculatedValue}) are not same`,
            );
          }
        });

        if (discrepancies.length > 0) {
          row.getCell(REMARKS_COL_INDEX).value = discrepancies.join('; ');
          remarksRowNumbers.push(employeeRowNo);
        }
        // Don't add remarks for valid rows
      } catch (calcError) {
        row.getCell(REMARKS_COL_INDEX).value = `Error: ${calcError.message}`;
        remarksRowNumbers.push(employeeRowNo);
      }
    }

    worksheet.getColumn(UUID_COL_INDEX).width = 40;
    worksheet.getColumn(REMARKS_COL_INDEX).width = 60;
    await workbook.xlsx.writeFile(outputFilepath);

    // Return first page data
    const allData = [];
    const headersWithUUIDRemarks = [...headers, 'UUID', 'Remarks'];
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      const employeeRowNo = rowIndex - 1; // Employee row starts from 1
      const rowData = { rowIndex: employeeRowNo };
      headersWithUUIDRemarks.forEach((header, idx) => {
        rowData[header] = row.getCell(idx + 1).value;
      });
      allData.push(rowData);
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const paginatedData = allData.slice(
      (pageNum - 1) * limitNum,
      pageNum * limitNum,
    );

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Validation completed Successfully!',
      filename: outputFilename,
      data: paginatedData,
      totalCount: allData.length,
      totalPages: Math.ceil(allData.length / limitNum),
      remarksRowNumbers,
    });
  } catch (error) {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    if (fs.existsSync(outputFilepath)) fs.unlinkSync(outputFilepath);
    console.error('Error in validateSalaryStructureV2:', error);
    next(error);
  }
};

// Revalidate single row - update row data in Excel, recalculate, add remarks
exports.revalidateSingleRow = async (req, res, next) => {
  try {
    const { filename, uuid, companyMasterID, rowData, payrollFrequency } =
      req.body;

    if (!filename || !uuid || !companyMasterID || !rowData) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'filename, uuid, companyMasterID and rowData are required',
      });
    }

    const isFortnightly = payrollFrequency === PayrollFrequencyType.FORTNIGHTLY;

    const filepath = path.join(
      __dirname,
      `../uploads/upload-salary-structure/${filename}`,
    );
    if (!fs.existsSync(filepath)) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'File not found',
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filepath);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet || worksheet.rowCount < 2) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Invalid worksheet',
      });
    }

    // Get headers
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || '';
    });

    const UUID_COL_INDEX = headers.indexOf('UUID') + 1;
    if (UUID_COL_INDEX === 0) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'UUID column not found in file',
      });
    }

    // Find row by UUID
    let targetRowIndex = null;
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const rowUUID = worksheet
        .getRow(rowIndex)
        .getCell(UUID_COL_INDEX)
        .value?.toString();
      if (rowUUID === uuid) {
        targetRowIndex = rowIndex;
        break;
      }
    }

    if (!targetRowIndex) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Row not found with given UUID',
      });
    }

    const BASE_HEADERS_COUNT = isFortnightly ? 13 : 12;
    const REMARKS_COL_INDEX = headers.indexOf('Remarks') + 1;
    const salaryHeaders = headers
      .slice(BASE_HEADERS_COUNT)
      .filter((h) => h !== 'Remarks' && h !== 'UUID');

    // Update row data from frontend
    const row = worksheet.getRow(targetRowIndex);
    Object.keys(rowData).forEach((key) => {
      const colIdx = headers.indexOf(key);
      if (colIdx !== -1 && key !== 'UUID' && key !== 'Remarks') {
        row.getCell(colIdx + 1).value = rowData[key];
      }
    });

    // Get values for validation
    const mobileNumber = row.getCell(3).value?.toString()?.trim();
    const skillCategory = row.getCell(8).value?.toString()?.trim() || null;
    const remarks = [];

    // Handle Fortnightly vs Monthly columns
    let applicableYYYYMM,
      startDate,
      endDate,
      salaryGrade,
      stateName,
      corporationName;

    if (isFortnightly) {
      const year = row.getCell(9).value?.toString()?.trim();
      const fortnight = row.getCell(10).value?.toString()?.trim();
      salaryGrade = row.getCell(11).value?.toString()?.trim();
      stateName = row.getCell(12).value?.toString()?.trim();
      corporationName = row.getCell(13).value?.toString()?.trim();

      // Validate Year and Fortnight
      if (!year || !/^\d{4}$/.test(year)) {
        remarks.push('Invalid Year');
      }

      if (!fortnight) {
        remarks.push('Applicable From (Fortnight) is required');
      } else if (year) {
        const dateRanges = getDateRangesByType(
          PayrollFrequencyType.FORTNIGHTLY,
          year,
        );
        const matchedFortnight = dateRanges.find((d) => d.title === fortnight);

        if (!matchedFortnight) {
          remarks.push(`Invalid Fortnight: ${fortnight}`);
        } else {
          startDate = matchedFortnight.from;
          endDate = matchedFortnight.to;
          applicableYYYYMM = startDate.slice(0, 4) + startDate.slice(5, 7);
        }
      }
    } else {
      applicableYYYYMM = row.getCell(9).value?.toString()?.trim();
      salaryGrade = row.getCell(10).value?.toString()?.trim();
      stateName = row.getCell(11).value?.toString()?.trim();
      corporationName = row.getCell(12).value?.toString()?.trim();

      if (!applicableYYYYMM || !/^\d{6}$/.test(applicableYYYYMM)) {
        remarks.push('Invalid YYYYMM format');
      }
    }

    // Fetch only required data based on row values
    const [
      user,
      grade,
      state,
      salaryFields,
      allMinWages,
      allPTSlabs,
      gradeSalaryStructure,
      allLWFData,
    ] = await Promise.all([
      UserMaster.findOne({
        where: {
          companyMasterId: companyMasterID,
          userNumber: mobileNumber,
          status: 1,
        },
        attributes: ['userMasterID', 'userNumber', 'gender', 'displayName'],
        include: [
          {
            model: EmployeeJoiningDetails,
            attributes: ['salaryCalculationAct'],
          },
        ],
        raw: true,
      }),
      salaryGrade
        ? GradeStructure.findOne({
            where: {
              companyMasterID,
              status: 1,
              gradeName: sequelize.where(
                sequelize.fn('TRIM', sequelize.col('gradeName')),
                salaryGrade?.trim(),
              ),
            },
            attributes: ['gradeStructureID', 'gradeName', 'baseOnCalculation'],
            raw: true,
          })
        : null,
      stateName
        ? StateMaster.findOne({
            where: { countryMasterID: 103, status: 1, stateName },
            attributes: ['stateMasterID', 'stateName'],
            include: [
              { model: Corporation, attributes: ['id', 'corporationName'] },
            ],
          })
        : null,
      // corporationName
      //   ? Corporation.findOne({
      //       where: { corporationName },
      //       attributes: ['id', 'corporationName', 'stateMasterID'],
      //       raw: true,
      //       include:[{model:StateMaster,where:{}}]
      //     })
      //   : null,
      HRSalaryFields.findAll({
        where: {
          companyMasterID,
          status: 1,
          payheadMasterId: { [Sequelize.Op.notIn]: default_payheadMasterIds },
        },
        include: [{ model: Payheadmaster, attributes: ['payheadName'] }],
        attributes: ['payheadMasterId', 'salaryFieldSrNo', 'salaryFieldID'],
      }),
      MinWagesMaster.findAll({
        where: { companyMasterId: companyMasterID },
        order: [['applicableYYYYMM', 'DESC']],
        raw: true,
      }),
      ProfessionalTaxSlabMaster.findAll({
        where: { status: 1 },
        raw: true,
      }),
      salaryGrade
        ? GradeSalaryStructure.findAll({
            raw: true,
            include: [
              {
                model: HRSalaryFields,
                attributes: [],
                include: [{ model: Payheadmaster, attributes: [] }],
              },
              {
                model: GradeStructure,
                attributes: [],
                where: {
                  companyMasterID,
                  status: 1,
                  gradeName: sequelize.where(
                    sequelize.fn('TRIM', sequelize.col('gradeName')),
                    salaryGrade?.trim(),
                  ),
                },
              },
            ],
            order: [
              [
                { model: HRSalaryFields, as: 'hrSalaryField' },
                'salaryFieldSrNo',
                'ASC',
              ],
              ['salaryfieldindex', 'ASC'],
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
              [
                sequelize.col('hrSalaryField.payheadMasterId'),
                'payheadMasterId',
              ],
              [
                sequelize.col('hrSalaryField.salaryFieldSide'),
                'salaryFieldSide',
              ],
              [
                sequelize.col('hrSalaryField.salaryFieldAttanChk'),
                'salaryFieldAttanChk',
              ],
              [
                sequelize.col('hrSalaryField.salaryFieldWhenMonth'),
                'salaryFieldWhenMonth',
              ],
              [
                sequelize.col('hrSalaryField.salaryFieldSrNo'),
                'salaryFieldSrNo',
              ],
              [
                sequelize.col('hrSalaryField.companyMasterID'),
                'companyMasterID',
              ],
              [
                sequelize.col('hrSalaryField.payheadDisplayName'),
                'payheadDisplayName',
              ],
              [sequelize.col('hrSalaryField.considerIn'), 'considerIn'],
              [
                sequelize.col('hrSalaryField.Payheadmaster.payheadName'),
                'payheadName',
              ],
              [
                sequelize.col('gradeStructure.baseOnCalculation'),
                'baseOnCalculation',
              ],
              [
                sequelize.col('hrSalaryField.assignSalaryRound'),
                'assignSalaryRound',
              ],
              [
                sequelize.col('hrSalaryField.assignSalaryRoundNo'),
                'assignSalaryRoundNo',
              ],
              [
                sequelize.col('hrSalaryField.assignSalaryRoundOffType'),
                'assignSalaryRoundOffType',
              ],
            ],
          })
        : [],
      LwfMaster.findAll(),
    ]);

    // Validate user
    if (!user) {
      remarks.push('User not found');
      setCellRemarks(row.getCell(REMARKS_COL_INDEX), remarks, true);
      await workbook.xlsx.writeFile(filepath);

      // Build updated row data for response
      const updatedRowData = { rowIndex: targetRowIndex - 1 };
      headers.forEach((header, idx) => {
        updatedRowData[header] = row.getCell(idx + 1).value;
      });
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        data: updatedRowData,
        message: 'Row updated successfully',
      });
    }

    const allLWFStateWiseMap = new Map();

    for (const lwf of allLWFData) {
      const key = +lwf.stateID;

      if (!allLWFStateWiseMap.has(key)) {
        allLWFStateWiseMap.set(key, []);
      }

      const data = allLWFStateWiseMap.get(key);

      data?.push(lwf);
    }

    // Check if salary structure already exists for this user and period
    const existingCondition = {
      userMasterID: user.userMasterID,
      payrollFrequency: payrollFrequency || PayrollFrequencyType.MONTHLY,
    };
    if (isFortnightly && startDate && endDate) {
      existingCondition.startDate = startDate;
      existingCondition.endDate = endDate;
    } else if (applicableYYYYMM) {
      existingCondition.salaryFromYYYYMM = +applicableYYYYMM;
    }
    const existingSalary = await HRSalaryMaster.findOne({
      where: existingCondition,
      attributes: ['salaryMasterID'],
      raw: true,
    });
    if (existingSalary) {
      const periodMsg = isFortnightly ? 'fortnight' : 'month';
      remarks.push(`Salary structure already assigned for this ${periodMsg}`);
    }

    // Check if salary is already calculated for this period or later
    const lastCalcSalary = await HRSalaryTrasaction.findOne({
      where: {
        userMasterID: user.userMasterID,
        payrollFrequency: payrollFrequency || PayrollFrequencyType.MONTHLY,
      },
      attributes: ['salaryYYYYMM', 'startDate', 'endDate'],
      order: [['salaryYYYYMM', 'DESC']],
      raw: true,
    });
    if (lastCalcSalary) {
      const lastCalcData = {
        lastSalaryYYYYMM: lastCalcSalary.salaryYYYYMM,
        lastStartDate: lastCalcSalary.startDate,
        lastEndDate: lastCalcSalary.endDate,
      };
      if (
        isSalaryAlreadyCalculated(
          lastCalcData,
          applicableYYYYMM,
          startDate,
          isFortnightly,
        )
      ) {
        const periodMsg = isFortnightly ? 'fortnight' : 'month';
        remarks.push(`Salary already calculated for this ${periodMsg}`);
      }
    }

    // Validate fields
    if (!grade) {
      remarks.push(
        salaryGrade ? `Invalid Grade: ${salaryGrade}` : 'Salary Grade required',
      );
    }
    if (stateName && !state) {
      remarks.push(`Invalid State: ${stateName}`);
    }

    const gender = user.gender || null;
    const stateMasterID = state?.stateMasterID || null;

    let corporationId = null;

    if (corporationName) {
      corporationId =
        (state.corporations || []).find(
          (e) => e.corporationName == corporationName,
        )?.id || null;

      if (!corporationId) {
        remarks.push('Invalid Corporation');
      }
    }

    // Get grade salary structure
    const grade_salary_structure = JSON.parse(
      JSON.stringify(gradeSalaryStructure || []),
    );

    // Check if state is required (hasMinimumWages or payheadMasterId 15 exists)

    let stateRequired = false;
    let hasMinimumWages = false;
    let hasLwf = false;

    for (const item of grade_salary_structure) {
      const isMinimumWages =
        item.formula?.includes('Minimum Wages') ||
        item.formula1?.includes('Minimum Wages');

      if (isMinimumWages) {
        hasMinimumWages = true;
      }

      const isLwf =
        item.payheadMasterId == payheadMasterIdsMapping.EMPLOYEE_LWF ||
        item.payheadMasterId == payheadMasterIdsMapping.EMPLOYER_LWF;

      if (isLwf) hasLwf = true;

      if (
        item.payheadMasterId == payheadMasterIdsMapping.PTAX ||
        isLwf ||
        isMinimumWages
      ) {
        stateRequired = true;
      }

      if (stateRequired && hasMinimumWages && hasLwf) {
        break;
      }
    }

    // Check if state is required (hasMinimumWages or payheadMasterId 15 exists)
    // const hasMinimumWages = grade_salary_structure.some(
    //   (item) =>
    //     item.formula?.includes('Minimum Wages') ||
    //     item.formula1?.includes('Minimum Wages'),
    // );
    // const hasPT = grade_salary_structure.some(
    //   (item) => item.payheadMasterId == payheadMasterIdsMapping.PTAX,
    // );

    if (stateRequired && !stateMasterID) {
      remarks.push(`State is required`);
    }

    if (remarks.length > 0) {
      setCellRemarks(row.getCell(REMARKS_COL_INDEX), remarks, true);
      await workbook.xlsx.writeFile(filepath);
      // Build updated row data for response
      const updatedRowData = { rowIndex: targetRowIndex - 1 };
      headers.forEach((header, idx) => {
        updatedRowData[header] = row.getCell(idx + 1).value;
      });
      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        data: updatedRowData,
        message: 'Row updated successfully',
      });
    }

    const { AmountIn, basedOn } = getAmountInFromFormula(
      grade_salary_structure,
    );

    // Get input value
    let inputValue = 0;
    const grossColIdx = salaryHeaders.findIndex(
      (h) => h?.toLowerCase()?.trim() === 'gross',
    );
    const ctcColIdx = salaryHeaders.findIndex(
      (h) => h?.toLowerCase()?.trim() === 'ctc',
    );

    if (basedOn === 'GROSS' && grossColIdx !== -1) {
      inputValue =
        parseFloat(row.getCell(BASE_HEADERS_COUNT + grossColIdx + 1).value) ||
        0;
    } else if (basedOn === 'CTC' && ctcColIdx !== -1) {
      inputValue =
        parseFloat(row.getCell(BASE_HEADERS_COUNT + ctcColIdx + 1).value) || 0;
    }
    if (!inputValue && grossColIdx !== -1) {
      inputValue =
        parseFloat(row.getCell(BASE_HEADERS_COUNT + grossColIdx + 1).value) ||
        0;
    }
    if (!inputValue && ctcColIdx !== -1) {
      inputValue =
        parseFloat(row.getCell(BASE_HEADERS_COUNT + ctcColIdx + 1).value) || 0;
    }

    if (!inputValue) {
      setCellRemarks(
        row.getCell(REMARKS_COL_INDEX),
        [`${basedOn} value required`],
        true,
      );
      await workbook.xlsx.writeFile(filepath);
      return res
        .status(statusCodes.OK)
        .json({ status: statusCodes.OK, message: 'Row updated successfully' });
    }

    let minWagesMasterData = null;
    if (hasMinimumWages && stateMasterID && applicableYYYYMM) {
      minWagesMasterData = allMinWages.find(
        (m) =>
          m.stateMasterId == stateMasterID &&
          m.applicableYYYYMM <= +applicableYYYYMM,
      );
    }

    const ptSlabData = allPTSlabs.filter(
      (pt) => pt.stateMasterID == stateMasterID,
    );

    // check Lwf data

    let lwfData = null;
    const targetMonth = +String(applicableYYYYMM).slice(4, 6);

    if (hasLwf) {
      const data = allLWFStateWiseMap?.get(+stateMasterID) || [];
      const salaryCalculationAct = ['W', 'F'].includes(
        user['employeeJoiningDetails.salaryCalculationAct'],
      )
        ? 'F'
        : 'S';

      lwfData = data?.reduce((latest, item) => {
        if (
          +item.applicableYearMonth <= +applicableYYYYMM &&
          (!item.month || item.month?.includes(targetMonth)) &&
          (item.applicableAct || []).includes(salaryCalculationAct) &&
          (!latest || +item.applicableYearMonth > +latest.applicableYearMonth)
        ) {
          return item;
        }
        return latest;
      }, null);
    }

    const payhead_B_C = salaryFields.filter((f) =>
      ['B', 'C'].includes(f.salaryFieldSrNo),
    );

    // Payhead name to ID map
    const payheadNameToId = new Map();
    salaryFields.forEach((f) => {
      const name = f.Payheadmaster?.payheadName?.toLowerCase()?.trim();
      if (name) payheadNameToId.set(name, f.payheadMasterId);
    });
    payheadNameToId.set('gross', payheadMasterIdsMapping.GROSS);
    payheadNameToId.set('net salary', payheadMasterIdsMapping.NETSALARY);
    payheadNameToId.set('ctc', payheadMasterIdsMapping.CTC);

    // Check for invalid or negative values BEFORE calculation
    const invalidValueRemarks = [];
    for (let idx = 0; idx < salaryHeaders.length; idx++) {
      const headerName = salaryHeaders[idx];
      const cellValue = row.getCell(BASE_HEADERS_COUNT + idx + 1).value;

      // Check if value is a valid number (not string/character)
      if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
        const numValue = Number(cellValue);
        if (isNaN(numValue)) {
          invalidValueRemarks.push(
            `${headerName}: Invalid value, must be a number`,
          );
          continue;
        }
        // Check for negative value
        if (numValue < 0) {
          invalidValueRemarks.push(`${headerName}: Negative value not allowed`);
        }
      }
    }

    // If any invalid/negative values found, skip calculation and show remarks
    if (invalidValueRemarks.length > 0) {
      setCellRemarks(row.getCell(REMARKS_COL_INDEX), invalidValueRemarks, true);
      await workbook.xlsx.writeFile(filepath);

      // Build updated row data for response
      const updatedRowData = { rowIndex: targetRowIndex - 1 };
      headers.forEach((header, idx) => {
        updatedRowData[header] = row.getCell(idx + 1).value;
      });

      return res.status(statusCodes.OK).json({
        status: statusCodes.OK,
        message: 'Row updated successfully',
        data: updatedRowData,
      });
    }

    // Map Excel values to grade structure for EmployeeSalaryAmount
    mapExcelValuesToGradeStructure(
      grade_salary_structure,
      salaryHeaders,
      row,
      BASE_HEADERS_COUNT,
      payheadNameToId,
    );

    try {
      const { salaryStructureData } = assignSalaryStructureLocal(
        grade_salary_structure,
        inputValue,
        stateMasterID,
        AmountIn,
        applicableYYYYMM,
        gender,
        corporationId,
        skillCategory,
        null,
        0,
        hasMinimumWages,
        ptSlabData,
        minWagesMasterData,
        payhead_B_C,
        lwfData,
      );

      const discrepancies = [];
      salaryHeaders.forEach((headerName, idx) => {
        const cellValue = row.getCell(BASE_HEADERS_COUNT + idx + 1).value;
        const excelValue = parseFloat(cellValue) || 0;
        const payheadId = payheadNameToId.get(
          headerName?.toLowerCase()?.trim(),
        );
        const calculatedField = salaryStructureData.find(
          (f) => f.payheadMasterId === payheadId,
        );
        const calculatedValue = calculatedField?.finalvalue || 0;

        // Check if payhead exists in grade structure but user entered amount
        const payheadExistsInGrade = grade_salary_structure.some(
          (g) => g.payheadMasterId === payheadId,
        );
        if (
          !payheadExistsInGrade &&
          excelValue > 0 &&
          ![
            payheadMasterIdsMapping.GROSS,
            payheadMasterIdsMapping.CTC,
            payheadMasterIdsMapping.NETSALARY,
          ].includes(payheadId)
        ) {
          discrepancies.push(
            `${headerName}: Payhead not exist in grade structure`,
          );
          return;
        }

        if (Math.abs(excelValue - calculatedValue) > 0) {
          discrepancies.push(
            `${headerName}:Excel value(${excelValue}) and Calculated value(${calculatedValue}) are not same`,
          );
        }
      });

      setCellRemarks(
        row.getCell(REMARKS_COL_INDEX),
        discrepancies,
        discrepancies.length > 0,
      );
    } catch (calcError) {
      setCellRemarks(
        row.getCell(REMARKS_COL_INDEX),
        [`Error: ${calcError.message}`],
        true,
      );
    }

    await workbook.xlsx.writeFile(filepath);

    // Build updated row data for response
    const updatedRowData = { rowIndex: targetRowIndex - 1 };
    headers.forEach((header, idx) => {
      updatedRowData[header] = row.getCell(idx + 1).value;
    });

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Row updated successfully',
      data: updatedRowData,
    });
  } catch (error) {
    console.error('Error in revalidateSingleRow:', error);
    next(error);
  }
};

// Delete row from Excel file
exports.deleteExcelRow = async (req, res, next) => {
  try {
    const { filename, uuid } = req.body;

    if (!filename || !uuid) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'filename and uuid are required',
      });
    }

    const filepath = path.join(
      __dirname,
      `../uploads/upload-salary-structure/${filename}`,
    );
    if (!fs.existsSync(filepath)) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'File not found',
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filepath);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet || worksheet.rowCount < 2) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Invalid worksheet',
      });
    }

    // Get UUID column index
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || '';
    });

    const UUID_COL_INDEX = headers.indexOf('UUID') + 1;
    if (UUID_COL_INDEX === 0) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'UUID column not found in file',
      });
    }

    // Find row by UUID
    let targetRowIndex = null;
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const rowUUID = worksheet
        .getRow(rowIndex)
        .getCell(UUID_COL_INDEX)
        .value?.toString();
      if (rowUUID === uuid) {
        targetRowIndex = rowIndex;
        break;
      }
    }

    if (!targetRowIndex) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Row not found with given UUID',
      });
    }

    // Delete the row
    worksheet.spliceRows(targetRowIndex, 1);

    await workbook.xlsx.writeFile(filepath);

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Row deleted successfully',
    });
  } catch (error) {
    console.error('Error in deleteExcelRow:', error);
    next(error);
  }
};

// Save salary structure - Final save API
exports.saveSalaryStructure = async (req, res, next) => {
  let transaction = null;

  try {
    const { filename, companyMasterID, payrollFrequency } = req.body;

    if (!filename || !companyMasterID) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'filename and companyMasterID are required',
      });
    }

    const isFortnightly = payrollFrequency === PayrollFrequencyType.FORTNIGHTLY;
    const defaultPayheadMasterIdsForSave = notIncludePyaheadIds;

    const filepath = path.join(
      __dirname,
      `../uploads/upload-salary-structure/${filename}`,
    );
    if (!fs.existsSync(filepath)) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'File not found',
      });
    }

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    // Read Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filepath);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet || worksheet.rowCount < 2) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Excel file is empty or has no data rows',
      });
    }

    // Get headers
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || '';
    });

    const REMARKS_COL_INDEX = headers.indexOf('Remarks') + 1;
    if (REMARKS_COL_INDEX === 0) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Invalid file format - Remarks column not found',
      });
    }

    // Check if any row has remarks
    const remarksRowNumbers = [];
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const remarks = worksheet
        .getRow(rowIndex)
        .getCell(REMARKS_COL_INDEX)
        .value?.toString()
        ?.trim();
      if (remarks && remarks !== '') {
        remarksRowNumbers.push(rowIndex - 1);
      }
    }

    if (remarksRowNumbers.length > 0) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message:
          'Cannot save. Rows with remarks exist. Please fix all errors first.',
        remarksRowNumbers,
      });
    }

    // Collect mobile numbers
    const mobileNumbers = [];
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const mobile = worksheet
        .getRow(rowIndex)
        .getCell(3)
        .value?.toString()
        ?.trim();
      if (mobile) mobileNumbers.push(mobile);
    }

    // Fetch master data
    const masterData = await fetchSalaryValidationMasterData(
      req,
      companyMasterID,
      mobileNumbers,
    );
    const lookupMaps = createLookupMaps(masterData);
    const {
      userMap,
      gradeMap,
      stateMap,
      corpMap,
      gradeSalaryStructureMap,
      payheadNameToId,
    } = lookupMaps;
    const {
      allMinWages,
      allPTSlabs,
      payhead_B_C,
      allGradeSalaryStructures,
      allLWFData,
    } = masterData;

    const allLWFStateWiseMap = new Map();

    for (const lwf of allLWFData) {
      const key = +lwf.stateID;

      if (!allLWFStateWiseMap.has(key)) {
        allLWFStateWiseMap.set(key, []);
      }

      const data = allLWFStateWiseMap.get(key);

      data?.push(lwf);
    }

    // Fetch existing salary structures for duplicate check (optimized - single query)
    const userMasterIDs = Array.from(userMap.values()).map(
      (u) => u.userMasterID,
    );
    const [existingSalaryStructures, lastCalculatedSalaries] =
      await Promise.all([
        fetchExistingSalaryStructures(userMasterIDs, payrollFrequency),
        fetchLastCalculatedSalary(userMasterIDs, payrollFrequency),
      ]);
    const existingSalaryMap = createExistingSalaryStructureMap(
      existingSalaryStructures,
      isFortnightly,
    );
    const lastCalculatedSalaryMap = createLastCalculatedSalaryMap(
      lastCalculatedSalaries,
    );

    // Build gradeSalaryStructureID map: gradeStructureID_payheadMasterId -> gradeSalaryStructureID
    const gradeSalaryStructureIdMap = new Map();
    allGradeSalaryStructures.forEach((item) => {
      const key = `${item.gradeStructureID}_${item.payheadMasterId}`;
      gradeSalaryStructureIdMap.set(key, item.gradeSalaryStructureID);
    });

    const BASE_HEADERS_COUNT = isFortnightly ? 13 : 12;
    const salaryHeaders = headers
      .slice(BASE_HEADERS_COUNT)
      .filter((h) => h !== 'Remarks' && h !== 'UUID');

    const allRecordsToInsert = [];

    // Process each row
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);

      const mobileNumber = row.getCell(3).value?.toString()?.trim();
      const skillCategory = row.getCell(8).value?.toString()?.trim() || null;

      // Handle Fortnightly vs Monthly columns
      let applicableYYYYMM,
        startDate,
        endDate,
        salaryGrade,
        stateName,
        corporationName;

      if (isFortnightly) {
        const year = row.getCell(9).value?.toString()?.trim();
        const fortnight = row.getCell(10).value?.toString()?.trim();
        salaryGrade = row.getCell(11).value?.toString()?.trim();
        stateName = row.getCell(12).value?.toString()?.trim();
        corporationName = row.getCell(13).value?.toString()?.trim();

        // Get date ranges for the year
        const dateRanges = getDateRangesByType(
          PayrollFrequencyType.FORTNIGHTLY,
          year,
        );
        const matchedFortnight = dateRanges.find((d) => d.title === fortnight);

        if (matchedFortnight) {
          startDate = matchedFortnight.from;
          endDate = matchedFortnight.to;
          applicableYYYYMM = startDate.slice(0, 4) + startDate.slice(5, 7);
        }
      } else {
        applicableYYYYMM = row.getCell(9).value?.toString()?.trim();
        salaryGrade = row.getCell(10).value?.toString()?.trim();
        stateName = row.getCell(11).value?.toString()?.trim();
        corporationName = row.getCell(12).value?.toString()?.trim();
      }

      const user = userMap.get(mobileNumber);

      // Skip if user not found (shouldn't happen as validation passed)
      if (!user) continue;

      // Check if salary structure already exists for this user and period (final check before save)
      let existingKey;
      if (isFortnightly && startDate && endDate) {
        existingKey = `${user.userMasterID}_${startDate}_${endDate}`;
      } else if (applicableYYYYMM) {
        existingKey = `${user.userMasterID}_${applicableYYYYMM}`;
      }
      if (existingKey && existingSalaryMap.has(existingKey)) {
        // Skip this row - salary structure already exists
        continue;
      }

      // Check if salary is already calculated for this period or later
      const lastCalcData = lastCalculatedSalaryMap.get(
        String(user.userMasterID),
      );
      if (
        isSalaryAlreadyCalculated(
          lastCalcData,
          applicableYYYYMM,
          startDate,
          isFortnightly,
        )
      ) {
        // Skip this row - salary already calculated for this period
        continue;
      }

      const gradeStructureID = gradeMap.get(salaryGrade?.toLowerCase()?.trim());
      const stateMasterID = stateMap.get(stateName?.toLowerCase()?.trim());
      const corp = corpMap.get(corporationName?.toLowerCase()?.trim());
      const corporationId = stateMasterID
        ? corp?.stateMasterID == stateMasterID
          ? corp.id
          : null
        : null || null;

      // Get grade salary structure
      const grade_salary_structure = JSON.parse(
        JSON.stringify(gradeSalaryStructureMap.get(gradeStructureID) || []),
      );

      // Check if state is required (hasMinimumWages or payheadMasterId 15 exists)

      let stateRequired = false;
      let hasMinimumWages = false;
      let hasLwf = false;

      for (const item of grade_salary_structure) {
        const isMinimumWages =
          item.formula?.includes('Minimum Wages') ||
          item.formula1?.includes('Minimum Wages');

        if (isMinimumWages) {
          hasMinimumWages = true;
        }

        const isLwf =
          item.payheadMasterId == payheadMasterIdsMapping.EMPLOYEE_LWF ||
          item.payheadMasterId == payheadMasterIdsMapping.EMPLOYER_LWF;

        if (isLwf) hasLwf = true;

        if (
          item.payheadMasterId == payheadMasterIdsMapping.PTAX ||
          isLwf ||
          isMinimumWages
        ) {
          stateRequired = true;
        }

        if (stateRequired && hasMinimumWages && hasLwf) {
          break;
        }
      }

      const { AmountIn } = getAmountInFromFormula(grade_salary_structure);

      // Get input value
      let inputValue = 0;
      const grossColIdx = salaryHeaders.findIndex(
        (h) => h?.toLowerCase()?.trim() === 'gross',
      );
      const ctcColIdx = salaryHeaders.findIndex(
        (h) => h?.toLowerCase()?.trim() === 'ctc',
      );

      if (grossColIdx !== -1) {
        inputValue =
          parseFloat(row.getCell(BASE_HEADERS_COUNT + grossColIdx + 1).value) ||
          0;
      }
      if (!inputValue && ctcColIdx !== -1) {
        inputValue =
          parseFloat(row.getCell(BASE_HEADERS_COUNT + ctcColIdx + 1).value) ||
          0;
      }

      // Check for invalid or negative values in salary fields - skip row if any found
      let hasInvalidValue = false;
      for (let idx = 0; idx < salaryHeaders.length; idx++) {
        const cellValue = row.getCell(BASE_HEADERS_COUNT + idx + 1).value;
        // Check for non-numeric value
        if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
          const numValue = Number(cellValue);
          if (isNaN(numValue)) {
            hasInvalidValue = true;
            break;
          }
        }
        // Check for negative value
        const excelValue = parseFloat(cellValue) || 0;
        if (excelValue < 0) {
          hasInvalidValue = true;
          break;
        }
      }
      if (hasInvalidValue) continue;

      // Get MinWages data
      let minWagesMasterData = null;
      let minWagesMasterId = null;
      if (hasMinimumWages && stateMasterID && applicableYYYYMM) {
        minWagesMasterData = allMinWages.find(
          (m) =>
            m.stateMasterId == stateMasterID &&
            m.applicableYYYYMM <= +applicableYYYYMM,
        );
        minWagesMasterId = minWagesMasterData?.minWagesMasterId || null;
      }

      const ptSlabData = allPTSlabs.filter(
        (pt) => pt.stateMasterID == stateMasterID,
      );

      // check Lwf data

      let lwfData = null;
      const targetMonth = +String(applicableYYYYMM).slice(4, 6);

      if (hasLwf) {
        const data = allLWFStateWiseMap?.get(+stateMasterID) || [];

        const salaryCalculationAct = ['W', 'F'].includes(
          user['employeeJoiningDetails.salaryCalculationAct'],
        )
          ? 'F'
          : 'S';

        lwfData = data?.reduce((latest, item) => {
          if (
            +item.applicableYearMonth <= +applicableYYYYMM &&
            (!item.month || item.month?.includes(targetMonth)) &&
            (item.applicableAct || []).includes(salaryCalculationAct) &&
            (!latest || +item.applicableYearMonth > +latest.applicableYearMonth)
          ) {
            return item;
          }
          return latest;
        }, null);
      }

      // Map Excel values to grade structure for EmployeeSalaryAmount
      mapExcelValuesToGradeStructure(
        grade_salary_structure,
        salaryHeaders,
        row,
        BASE_HEADERS_COUNT,
        payheadNameToId,
      );

      // Calculate salary structure
      const { salaryStructureData } = assignSalaryStructureLocal(
        grade_salary_structure,
        inputValue,
        stateMasterID,
        AmountIn,
        applicableYYYYMM,
        user.gender,
        corporationId,
        skillCategory,
        null,
        0,
        hasMinimumWages,
        ptSlabData,
        minWagesMasterData,
        payhead_B_C,
        lwfData,
      );

      // Build records for calculated payheads
      salaryStructureData.forEach((item) => {
        const gradeSalaryStructureID = gradeSalaryStructureIdMap.get(
          `${gradeStructureID}_${item.payheadMasterId}`,
        );

        if (gradeSalaryStructureID) {
          const record = {
            userMasterID: user.userMasterID,
            gradeSalaryStructureID,
            EmployeeSalaryAmount: item.finalvalue || 0,
            ActualEmployeeSalaryAmount:
              item.actualvalue || item.finalvalue || 0,
            salaryFromYYYYMM: +applicableYYYYMM,
            stateid: stateRequired ? stateMasterID : null,
            AmountIn,
            corporationId: stateRequired ? corporationId : null,
            skillCategory: hasMinimumWages ? skillCategory : null,
            minWagesMasterId: hasMinimumWages ? minWagesMasterId : null,
            payrollFrequency: isFortnightly
              ? PayrollFrequencyType.FORTNIGHTLY
              : PayrollFrequencyType.MONTHLY,
            createBy,
            createByIp: createByIp || null,
            status: 1,
          };

          // Add startDate and endDate for Fortnightly
          if (isFortnightly && startDate && endDate) {
            record.startDate = startDate;
            record.endDate = endDate;
          }

          allRecordsToInsert.push(record);
        }
      });

      // Add default payheads with amount = 0
      defaultPayheadMasterIdsForSave.forEach((payheadMasterId) => {
        const gradeSalaryStructureID = gradeSalaryStructureIdMap.get(
          `${gradeStructureID}_${payheadMasterId}`,
        );

        if (gradeSalaryStructureID) {
          // Check if not already added from calculated data
          const alreadyExists = salaryStructureData.some(
            (s) => s.payheadMasterId === payheadMasterId,
          );
          if (!alreadyExists) {
            const record = {
              userMasterID: user.userMasterID,
              gradeSalaryStructureID,
              EmployeeSalaryAmount: 0,
              ActualEmployeeSalaryAmount: 0,
              salaryFromYYYYMM: +applicableYYYYMM,
              stateid: stateRequired ? stateMasterID : null,
              AmountIn,
              corporationId: stateRequired ? corporationId : null,
              skillCategory: hasMinimumWages ? skillCategory : null,
              minWagesMasterId: hasMinimumWages ? minWagesMasterId : null,
              payrollFrequency: isFortnightly
                ? PayrollFrequencyType.FORTNIGHTLY
                : PayrollFrequencyType.MONTHLY,
              createBy,
              createByIp: createByIp || null,
              status: 1,
            };

            // Add startDate and endDate for Fortnightly
            if (isFortnightly && startDate && endDate) {
              record.startDate = startDate;
              record.endDate = endDate;
            }

            allRecordsToInsert.push(record);
          }
        }
      });
    }

    // Check if there are records to insert
    if (allRecordsToInsert.length === 0) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: 'No valid records to save',
      });
    }
    const salaryIncrementAuthMap = {};
    const salaryIncrementAuthDetailsMap = {};

    if (userMasterIDs.length > 0) {
      const salaryIncrementAuth = await FormAuthorizationDetails.findAll({
        where: {
          AuthorizationMasterID: authorizationMasterTypes.salaryIncrement,
          userMasterID: {
            [Sequelize.Op.in]: userMasterIDs,
          },
          status: 1,
        },
        include: [
          {
            model: AuthorizationCriteriaMaster,
            attributes: ['AuthorizationCriteriaID'],
          },
        ],
      });

      const authorizedUserIds = new Set(
        salaryIncrementAuth.map((item) => +item.userMasterID),
      );

      userMasterIDs.forEach((userMasterID) => {
        salaryIncrementAuthMap[userMasterID] =
          authorizedUserIds.has(userMasterID);
      });

      salaryIncrementAuth.forEach((item) => {
        salaryIncrementAuthDetailsMap[item.userMasterID] = item;
      });
    }

    const authorizedRecords = [];
    const nonAuthorizedRecords = [];

    for (const record of allRecordsToInsert) {
      if (salaryIncrementAuthMap[record.userMasterID]) {
        authorizedRecords.push(record);
      } else {
        nonAuthorizedRecords.push(record);
      }
    }
    // Start transaction only when ready to insert (after all validations passed)
    transaction = await sequelize.transaction();

    // Bulk insert in chunks
    const CHUNK_SIZE = 2000;
    for (let i = 0; i < nonAuthorizedRecords.length; i += CHUNK_SIZE) {
      const chunk = nonAuthorizedRecords.slice(i, i + CHUNK_SIZE);

      await HRSalaryMaster.bulkCreate(chunk, { transaction });
    }

    // Group records by user
    const authorizedUserGroups = {};

    for (const record of authorizedRecords) {
      if (!authorizedUserGroups[record.userMasterID]) {
        authorizedUserGroups[record.userMasterID] = [];
      }

      authorizedUserGroups[record.userMasterID].push(record);
    }

    const employees = await UserMaster.findAll({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: Object.keys(authorizedUserGroups),
        },
        status: 1,
      },
      attributes: ['userMasterID', 'displayName'],
      raw: true,
      transaction,
    });

    const employeeMap = {};

    employees.forEach((emp) => {
      employeeMap[emp.userMasterID] = emp.displayName;
    });

    for (const userMasterID of Object.keys(authorizedUserGroups)) {
      const userRecords = authorizedUserGroups[userMasterID];
      const commonData = userRecords[0];

      const salaryIncrementAuth = salaryIncrementAuthDetailsMap[userMasterID];

      let authorizationStatus = null;

      if (
        salaryIncrementAuth?.AuthorizationCriteriaMaster
          ?.AuthorizationCriteriaID === authorizationCriteriaType.SEQUENCENO
      ) {
        authorizationStatus = AuthorizationStatusType.PEDING_TWO;
      } else {
        authorizationStatus = AuthorizationStatusType.PEDING_ONE;
      }

      const salaryIncrement = await SalaryIncrementRequest.create(
        {
          userMasterID: commonData.userMasterID,
          salaryFromYYYYMM: commonData.salaryFromYYYYMM,
          stateid: commonData.stateid,
          AmountIn: commonData.AmountIn,
          skillCategory: commonData.skillCategory,
          corporationId: commonData.corporationId,
          minWagesMasterId: commonData.minWagesMasterId,
          payrollFrequency: commonData.payrollFrequency,
          startDate: commonData.startDate,
          endDate: commonData.endDate,
          authCriteriaID:
            salaryIncrementAuth.AuthorizationCriteriaMaster
              ?.AuthorizationCriteriaID,
          authorizationStatus,
        },
        {
          transaction,
          user: req.userDetails,
        },
      );

      const detailsData = userRecords.map((item) => ({
        gradeSalaryStructureID: item.gradeSalaryStructureID,
        EmployeeSalaryAmount: item.EmployeeSalaryAmount,
        ActualEmployeeSalaryAmount: item.ActualEmployeeSalaryAmount,
        salaryIncrementRequestID: salaryIncrement.salaryIncrementRequestID,
      }));

      await SalaryIncrementRequestDetails.bulkCreate(detailsData, {
        transaction,
        individualHooks: true,
        user: req.userDetails,
      });

      const notificationsToSend = [];
      const employeeName = employeeMap[userMasterID] || '';

      if (
        salaryIncrementAuth.AuthorizationCriteriaMaster
          ?.AuthorizationCriteriaID === authorizationCriteriaType.SEQUENCENO
      ) {
        const authorization = await SalaryIncrementRequestAuthorization.create(
          {
            TableName: SalaryIncrementRequest.getTableName(),
            salaryIncrementRequestID: salaryIncrement.salaryIncrementRequestID,
            userMasterID: salaryIncrementAuth.AuthorizedByUserMasterId?.[0],
            status: 1,
            authstatus: 2,
            createBy: req.userDetails.userMasterId,
            createByIp: req.userDetails.userIpAddress,
          },
          {
            transaction,
            user: req.userDetails,
          },
        );
        const monthName = formatMonth(salaryIncrement.salaryFromYYYYMM);
        await UserInbox.create(
          {
            activityTable: SalaryIncrementRequestAuthorization.getTableName(),
            activityTablePK:
              authorization.salaryIncrementRequestAuthorizationID,
            message: `New Salary Structure requested for ${employeeName} for the month of ${monthName}.`,
            assignedTo: salaryIncrementAuth.AuthorizedByUserMasterId?.[0],
            assignedBy: req.userDetails.userMasterId,
          },
          { transaction },
        );

        notificationsToSend.push({
          userMasterID: salaryIncrementAuth.AuthorizedByUserMasterId[j],
          notification: {
            title: notificationTitleTypes.SALARYINCREMENT,
            body: `New Salary Structure requested for ${employeeName} for the month of ${monthName}.`,
          },
          data: {
            screen: notificationScreentTypes.SALARYINCREMENT,
          },
        });
      } else {
        for (
          let j = 0;
          j < salaryIncrementAuth.AuthorizedByUserMasterId.length;
          j++
        ) {
          const authorization =
            await SalaryIncrementRequestAuthorization.create(
              {
                TableName: SalaryIncrementRequest.getTableName(),
                salaryIncrementRequestID:
                  salaryIncrement.salaryIncrementRequestID,
                userMasterID: salaryIncrementAuth.AuthorizedByUserMasterId[j],
                status: 1,
                authstatus: 2,
                createBy: req.userDetails.userMasterId,
                createByIp: req.userDetails.userIpAddress,
              },
              {
                transaction,
                user: req.userDetails,
              },
            );
          const monthName = formatMonth(salaryIncrement.salaryFromYYYYMM);
          await UserInbox.create(
            {
              activityTable: SalaryIncrementRequestAuthorization.getTableName(),
              activityTablePK:
                authorization.salaryIncrementRequestAuthorizationID,
              message: `New Salary Structure requested for ${employeeName} for the month of ${monthName}.`,
              assignedTo: salaryIncrementAuth.AuthorizedByUserMasterId[j],
              assignedBy: req.userDetails.userMasterId,
            },
            { transaction },
          );

          notificationsToSend.push({
            userMasterID: salaryIncrementAuth.AuthorizedByUserMasterId[j],
            notification: {
              title: notificationTitleTypes.SALARYINCREMENT,
              body: `New Salary Structure requested for ${employeeName} for the month of ${monthName}.`,
            },
            data: {
              screen: notificationScreentTypes.SALARYINCREMENT,
            },
          });
        }
      }
    }

    await transaction.commit();
    try {
      for (const item of notificationsToSend) {
        await sendNotification(item.userMasterID, item.notification, item.data);
      }
    } catch (error) {
      console.error('Notification Error:', error);
    }
    // Delete the file after successful save
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: 'Salary structure saved successfully',
      savedUsers: worksheet.rowCount - 1,
      savedRecords: allRecordsToInsert.length,
    });
  } catch (error) {
    // Only rollback if transaction was started
    if (transaction) {
      await transaction.rollback();
    }
    console.error('Error in saveSalaryStructure:', error);
    next(error);
  }
};

exports.getAllPendingRequestByUserID = async (req, res, next) => {
  try {
    const { userMasterID } = req.body;
    if (!userMasterID) {
      return res.status(200).json({
        status: 400,
        message: 'UserMasterID not found!',
      });
    }
    const getAllStructure = await SalaryIncrementRequest.findAll({
      where: {
        userMasterID: userMasterID,
        authorizationStatus: [0, 1, 2],
      },
      include: [
        {
          as: 'SIRDetails',
          model: SalaryIncrementRequestDetails,
          attributes: [
            'gradeSalaryStructureID',
            'salaryIncrementRequestID',
            'EmployeeSalaryAmount',
            'ActualEmployeeSalaryAmount',
          ],
          include: [
            {
              required: true,
              model: GradeSalaryStructure,
              as: 'GSS',
              attributes: [
                'gradeSalaryStructureID',
                'formula',
                'formula1',
                'formulaPreference',
                'fieldFixAmount',
                'fieldFixAmount1',
                'salaryfieldindex',
                'salaryfieldmaxrange',
                'remainingAmtSalaryFieldID',
                'salaryFieldID',
              ],
              include: [
                {
                  model: GradeStructure,
                  attributes: [
                    'gradeStructureID',
                    'gradeName',
                    'baseOnCalculation',
                  ],
                },
                {
                  model: HRSalaryFields,
                  as: 'HSF',
                  attributes: [
                    'salaryFieldID',
                    'payheadDisplayName',
                    'status',
                    'payheadMasterId',
                    'salaryFieldSrNo',
                    'salaryFieldSide',
                    'salaryFieldShow',
                    'salaryFieldAttanChk',
                    'salaryFieldRound',
                    'salaryFieldRoundNo',
                    'salaryFieldWhenMonth',
                    'roundOffType',
                    'considerIn',
                    'assignSalaryRound',
                    'assignSalaryRoundNo',
                    'assignSalaryRoundOffType',
                  ],
                  where: {
                    payheadMasterId: {
                      [Sequelize.Op.notIn]: exclude_payheadMasterIds,
                    },
                  },
                  include: [
                    {
                      model: Payheadmaster,
                      as: 'PHM',
                      attributes: ['payheadName'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      order: [
        ['salaryIncrementRequestID', 'DESC'],
        [
          { model: SalaryIncrementRequestDetails, as: 'SIRDetails' },
          { model: GradeSalaryStructure, as: 'GSS' },
          'salaryfieldindex',
          'ASC',
        ],
        [
          { model: SalaryIncrementRequestDetails, as: 'SIRDetails' },
          { model: GradeSalaryStructure, as: 'GSS' },
          { model: HRSalaryFields, as: 'HSF' },
          'salaryFieldSrNo',
          'ASC',
        ],
        [
          { model: SalaryIncrementRequestDetails, as: 'SIRDetails' },
          { model: GradeSalaryStructure, as: 'GSS' },
          { model: HRSalaryFields, as: 'HSF' },
          { model: Payheadmaster, as: 'PHM' },
          'payheadName',
          'ASC',
        ],
      ],
    });

    const formattedData = getAllStructure.map((request) => {
      const year = request.salaryFromYYYYMM
        ? request.salaryFromYYYYMM.toString().slice(0, 4)
        : '';
      const month1 = request.salaryFromYYYYMM
        ? request.salaryFromYYYYMM.toString().slice(4)
        : '';
      let applicableFrom =
        month_dict && month_dict[month1]
          ? `${month_dict[month1]}-${year}`
          : `${month1}-${year}`;

      if (
        [
          PayrollFrequencyType.FORTNIGHTLY,
          PayrollFrequencyType.WEEKLY,
        ].includes(request.payrollFrequency) &&
        request.startDate &&
        request.endDate
      ) {
        const dateRanges =
          getDateRangesByType(
            request.payrollFrequency,
            String(request.startDate).slice(0, 4),
          )?.find((e) => e.from == request.startDate && e.to == request.endDate) ||
          null;

        if (dateRanges) {
          const startDate = String(request.startDate)
            .split('-')
            .reverse()
            .join('-');
          const endDate = String(request.endDate).split('-').reverse().join('-');

          applicableFrom = `${dateRanges.title}(${startDate} - ${endDate})`;
        }
      }

      const grouped = {
        A: [],
        gross: [],
        B: [],
        AB: [],
        netPay: [],
        C: [],
        ctc: [],
      };

      (request.SIRDetails || []).forEach((detail) => {
        const itemObj = {
          salaryIncrementRequestID: request.salaryIncrementRequestID,
          salaryMasterID: request.salaryIncrementRequestID,
          salaryFromYYYYMM: request.salaryFromYYYYMM,
          authorizationStatus: request.authorizationStatus,
          payrollFrequency: request.payrollFrequency,
          AmountIn: request.AmountIn,
          stateid: request.stateid,
          corporationId: request.corporationId,
          startDate: request.startDate,
          endDate: request.endDate,
          applicableFrom: applicableFrom,
          salaryCalculated: false,

          gradeStructureID: detail.GSS?.gradeStructure?.gradeStructureID,
          gradeName: detail.GSS?.gradeStructure?.gradeName,
          baseOnCalculation: detail.GSS?.gradeStructure?.baseOnCalculation,

          gradeSalaryStructureID: detail.gradeSalaryStructureID,

          payheadName:
            (detail.GSS?.HSF?.payheadDisplayName &&
              detail.GSS?.HSF?.payheadDisplayName.trim()) ||
            detail.GSS?.HSF?.PHM?.payheadName,

          payheadDisplayName: detail.GSS?.HSF?.payheadDisplayName,
          payheadMasterId: detail.GSS?.HSF?.payheadMasterId,
          salaryFieldSrNo: detail.GSS?.HSF?.salaryFieldSrNo,
          salaryFieldSide: detail.GSS?.HSF?.salaryFieldSide,
          considerIn: detail.GSS?.HSF?.considerIn,
          formula: detail.GSS?.formula,
          formula1: detail.GSS?.formula1,
          formulaPreference: detail.GSS?.formulaPreference,
          fieldFixAmount: detail.GSS?.fieldFixAmount,
          fieldFixAmount1: detail.GSS?.fieldFixAmount1,
          EmployeeSalaryAmount: detail.EmployeeSalaryAmount,
          ActualEmployeeSalaryAmount: detail.ActualEmployeeSalaryAmount,
        };

        if (![1, 50, 92].includes(itemObj.payheadMasterId)) {
          if (itemObj.salaryFieldSrNo === 'A' && itemObj.considerIn != 'net') {
            grouped.A.push(itemObj);
          } else if (itemObj.salaryFieldSrNo === 'B') {
            grouped.B.push(itemObj);
          } else if (itemObj.salaryFieldSrNo === 'A' && itemObj.considerIn == 'net') {
            grouped.AB.push(itemObj);
          } else if (itemObj.salaryFieldSrNo === 'C') {
            grouped.C.push(itemObj);
          }
        }

        if (itemObj.payheadMasterId == 1) {
          grouped.ctc.push({
            ...itemObj,
            salaryFieldSrNo: '',
            considerIn: '',
          });
        }

        if (itemObj.payheadMasterId == 50) {
          grouped.gross.push({
            ...itemObj,
            salaryFieldSrNo: '',
            considerIn: '',
          });
        }

        if (itemObj.payheadMasterId == 92) {
          grouped.netPay.push({
            ...itemObj,
            salaryFieldSrNo: '',
            considerIn: '',
          });
        }
      });

      return [
        ...grouped.A,
        ...grouped.gross,
        ...grouped.B,
        ...grouped.AB,
        ...grouped.netPay,
        ...grouped.C,
        ...grouped.ctc,
      ];
    });

    return res.status(200).json({ status: 200, data: formattedData });
  } catch (error) {
    next(error);
  }
};
