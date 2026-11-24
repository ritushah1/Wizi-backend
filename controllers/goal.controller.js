/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
const { Op } = require('sequelize');
const Goal = require('../models/goalMaster');
const UserMaster = require('../models/userMaster');
const companyMaster = require('../models/companyMaster');
const { generateExcel } = require('../utils/exportData');
const { usermessage, errorMessage } = require('../response_message/message');
const { userAttributes, statusCodes } = require('../utils/commonVars');
const KRAMaster = require('../models/kramaster');
const KPIMaster = require('../models/kpimaster');
const EmployeeGoal = require('../models/employeeGoal');
const GoalSetting = require('../models/goalSetting');
const sequelize = require('../config/database');
const PmsPolicy = require('../models/pmsPolicy');
const { PmsPolicyEnum } = require('../utils/dbUtils');
const { CustomError } = require('../utils/customError');
const {
  isInCalendarYear,
  isInFinancialYear,
} = require('../utils/commonUtilFunctions');
const { findKraById } = require('./kra.controller');
const { findKPIById } = require('./kpi.controller');
const { accessibleUsers } = require('../utils/commonUtilFunctions');
const { accessibleRoleWiseUsers } = require('../middleware/accessibleRoleWiseUsers');

exports.financialYearCalculation = async (req, res, next) => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const previousYear = currentYear - 1;
    const nextYear = currentYear + 1;
    const selectedYears = ['previous', 'current', 'next'];
    const financialYears = selectedYears.map((year) => {
      if (year === 'previous') return `${previousYear}-${currentYear}`;
      if (year === 'current') return `${currentYear}-${nextYear}`;
      if (year === 'next') return `${nextYear}-${nextYear + 1}`;
    });
    return res.status(200).json({
      status: 200,
      message: 'Financial years retrieved successfully',
      data: { financialYears },
    });
  } catch (err) {
    next(err);
  }
};

const findGoalById = async (id, userDetails) => {
  const goal = await Goal.findByPk(id, {
    include: [
      {
        model: KRAMaster,
        include: [
          {
            model: UserMaster,
            as: 'createdByUser',
            attributes: userAttributes,
          },
          { model: KPIMaster },
        ],
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
            userDetails.childCompanies.length > 0
              ? [...userDetails.childCompanies, userDetails.companyMasterId]
              : userDetails.companyMasterId,
        },
      },
      { model: EmployeeGoal },
    ],
    nest: true,
  });

  if (!goal)
    throw new CustomError(
      usermessage.notFoundMessage('Goal'),
      statusCodes.NOT_FOUND,
    );
  return goal;
};

exports.bulkCreateGoalKraKpi = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      title,
      description,
      type,
      companyMasterID,
      goalSettingId,
      evaluationPeriod,
      kra,
    } = req.body;
    const pmsPolicy = await PmsPolicy.findOne(
      { where: { companyMasterId: companyMasterID } },
      {
        transaction,
      },
    );
    if (!pmsPolicy) {
      throw new CustomError(
        usermessage.notFoundMessage('PMS Policy'),
        statusCodes.NOT_FOUND,
      );
    }
    const goalSetting = await GoalSetting.findByPk(goalSettingId, {
      transaction,
    });
    if (!goalSetting) {
      throw new CustomError(
        usermessage.notFoundMessage('Goal Setting'),
        statusCodes.NOT_FOUND,
      );
    }
    const goal = await Goal.create(
      {
        title,
        description,
        companyMasterId: companyMasterID,
        type,
        goalSettingId,
        evaluationPeriod,
      },
      {
        user: req.userDetails,
        transaction,
      },
    );
    const goalMasterId = goal.toJSON().id;
    for (const element of kra) {
      const { kpi, ...kraData } = element;

      // Logic to add KRA
      const existingKras = await KRAMaster.findAll({
        where: {
          goalMasterId,
        },
        transaction,
      });
      const totalWeightageKra =
        existingKras.length > 0
          ? existingKras.reduce((total, kra) => total + kra.weightage, 0)
          : 0;

      const remainingWeightageKra = 100 - totalWeightageKra;
      if (kraData.weightage > remainingWeightageKra) {
        throw new CustomError(
          errorMessage.KRA_WEIGHTAGE_EXCEEDS(remainingWeightageKra),
          statusCodes.BAD_REQUEST,
        );
      }
      const createdKRA = await KRAMaster.create(
        { ...kraData, goalMasterId },
        { user: req.userDetails, transaction },
      );
      const kraMasterId = createdKRA.toJSON().id;

      // Logic to add KPI
      for (const kpiElement of kpi) {
        const existingKpi = await KPIMaster.findAll({
          where: {
            kraMasterId,
          },
          transaction,
        });
        const totalWeightageKpi =
          existingKpi.length > 0
            ? existingKpi.reduce((total, kpi) => total + kpi.weightage, 0)
            : 0;
        const remainingWeightageKpi = 100 - totalWeightageKpi;
        if (kpiElement.weightage > remainingWeightageKpi) {
          throw new CustomError(
            errorMessage.KPI_WEIGHTAGE_EXCEEDS(remainingWeightageKpi),
            statusCodes.BAD_REQUEST,
          );
        }
        await KPIMaster.create(
          { ...kpiElement, kraMasterId },
          {
            user: req.userDetails,
            transaction,
          },
        );
      }
    }
    await transaction.commit();
    return res.status(statusCodes.OK).json({
      message: usermessage.addMessage('Goal'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.bulkUpdateGoalKraKpi = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      title,
      description,
      type,
      companyMasterID,
      goalSettingId,
      evaluationPeriod,
      kra,
    } = req.body;
    const goalMasterId = req.params.id;
    const existingGoals = await findGoalById(goalMasterId, req.userDetails);
    if (
      existingGoals &&
      existingGoals.employeeGoals &&
      existingGoals.employeeGoals.length > 0
    ) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        status: 400,
        message: 'Goal can not be edited already assigned to employee!',
      });
    }
    const pmsPolicy = await PmsPolicy.findOne(
      { where: { companyMasterId: companyMasterID } },
      {
        transaction,
      },
    );
    if (!pmsPolicy) {
      throw new CustomError(
        usermessage.notFoundMessage('PMS Policy'),
        statusCodes.NOT_FOUND,
      );
    }

    // Update goal setting
    if (goalSettingId) {
      const goalSetting = await GoalSetting.findByPk(goalSettingId, {
        transaction,
      });
      if (!goalSetting) {
        throw new CustomError(
          usermessage.notFoundMessage('Goal Setting'),
          statusCodes.NOT_FOUND,
        );
      }
      existingGoals.goalSettingId = goalSettingId;
    }
    if (title) existingGoals.title = title;
    if (description) existingGoals.description = description;
    if (evaluationPeriod) existingGoals.evaluationPeriod = evaluationPeriod;
    if (type) existingGoals.type = type;

    await existingGoals.save({ transaction, user: req.userDetails });

    for (const element of kra) {
      const { kpi, ...kraData } = element;

      const existingKras = await KRAMaster.findAll({
        where: {
          goalMasterId,
        },
        transaction,
      });
      const totalWeightageKra =
        existingKras.length > 0
          ? existingKras.reduce((total, kra) => total + +kra.weightage, 0)
          : 0;

      // Delete KRA and associated KPIs
      if (kraData.id && kraData.delete) {
        const kraExists = await findKraById(kraData.id, req.userDetails);
        await KPIMaster.destroy({
          where: { kraMasterId: kraData.id },
          user: req.userDetails,
          transaction,
        });
        await kraExists.destroy({ transaction, user: req.userDetails });
      }
      // Update KRA
      else if (kraData.id) {
        const kraExists = await findKraById(kraData.id, req.userDetails);
        const remainingWeightageKra =
          100 - (totalWeightageKra - +kraExists.toJSON().weightage);
        if (kraData.weightage > remainingWeightageKra) {
          throw new CustomError(
            errorMessage.KRA_WEIGHTAGE_EXCEEDS(remainingWeightageKra),
            statusCodes.BAD_REQUEST,
          );
        }
        if (kraData.title) kraExists.title = kraData.title;
        if (kraData.description) kraExists.description = kraData.description;
        if (kraData.weightage) kraExists.weightage = kraData.weightage;
        await kraExists.save({ transaction, user: req.userDetails });

        // Logic to add/update/delete KPI
        for (const kpiElement of kpi) {
          const existingKpi = await KRAMaster.findAll({
            where: {
              id: kraData.id,
            },
            transaction,
          });
          const totalWeightageKpi =
            existingKpi.length > 0
              ? existingKpi.reduce((total, kpi) => total + +kpi.weightage, 0)
              : 0;

          // Delete KPI
          if (kpiElement.id && kpiElement.delete) {
            const kpiExists = await findKPIById(kpiElement.id, req.userDetails);
            await kpiExists.destroy({ transaction, user: req.userDetails });
          }
          // Update KPI
          else if (kpiElement.id) {
            const kpiExists = await findKPIById(kpiElement.id, req.userDetails);
            const remainingWeightageKpi =
              100 - (totalWeightageKpi - +kpiExists.toJSON().weightage);
            if (kpiElement.weightage > remainingWeightageKpi) {
              throw new CustomError(
                errorMessage.KPI_WEIGHTAGE_EXCEEDS(remainingWeightageKpi),
                statusCodes.BAD_REQUEST,
              );
            }
            if (kpiElement.title) kpiExists.title = kpiElement.title;
            if (kpiElement.description)
              kpiExists.description = kpiElement.description;
            if (kpiElement.weightage)
              kpiExists.weightage = kpiElement.weightage;
            if (kpiElement.targetGiven)
              kpiExists.targetGiven = kpiElement.targetGiven;
            if (kpiElement.overAchieve)
              kpiExists.overAchieve = kpiElement.overAchieve;
            await kpiExists.save({ transaction, user: req.userDetails });
          }
          // Create KPI
          else {
            const remainingWeightageKpi = 100 - totalWeightageKpi;
            if (kpiElement.weightage > remainingWeightageKpi) {
              throw new CustomError(
                errorMessage.KPI_WEIGHTAGE_EXCEEDS(remainingWeightageKpi),
                statusCodes.BAD_REQUEST,
              );
            }
            await KPIMaster.create(
              { ...kpiElement, kraMasterId: kraData.id },
              {
                user: req.userDetails,
                transaction,
              },
            );
          }
        }
      }
      // Add KRA
      else {
        const remainingWeightageKra = 100 - totalWeightageKra;
        if (kraData.weightage > remainingWeightageKra) {
          throw new CustomError(
            errorMessage.KRA_WEIGHTAGE_EXCEEDS(remainingWeightageKra),
            statusCodes.BAD_REQUEST,
          );
        }
        const createdKRA = await KRAMaster.create(
          { ...kraData, goalMasterId },
          { user: req.userDetails, transaction },
        );

        const kraMasterId = createdKRA.toJSON().id;

        // Add KPIs
        for (const kpiElement of kpi) {
          const existingKpi = await KPIMaster.findAll({
            where: {
              kraMasterId,
            },
            transaction,
          });
          const totalWeightageKpi =
            existingKpi.length > 0
              ? existingKpi.reduce((total, kpi) => total + kpi.weightage, 0)
              : 0;
          const remainingWeightageKpi = 100 - totalWeightageKpi;
          if (kpiElement.weightage > remainingWeightageKpi) {
            throw new CustomError(
              errorMessage.KPI_WEIGHTAGE_EXCEEDS(remainingWeightageKpi),
              statusCodes.BAD_REQUEST,
            );
          }
          await KPIMaster.create(
            { ...kpiElement, kraMasterId },
            {
              user: req.userDetails,
              transaction,
            },
          );
        }
      }
    }
    await transaction.commit();
    return res.status(statusCodes.OK).json({
      message: usermessage.updateMessage('Goal'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getGoalDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const goal = await findGoalById(id, req.userDetails);
    const goalAssignCount = await EmployeeGoal.count({
      where: {
        goalMasterId: id,
      },
    });
    return res.status(statusCodes.OK).json({
      data: goal,
      count: goalAssignCount,
      message: usermessage.fetchMessage('Goal details'),
    });
  } catch (err) {
    next(err);
  }
};

exports.listGoal = async (req, res, next) => {
  try {
    const {
      page,
      pageSize,
      withDeleted,
      companyMasterID,
      search,
      sortByField,
      sortByValue,
      exportData,
      exportFileType,
    } = req.query;
    const condition = {};
    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };
    if (companyMasterID) {
      req.userDetails.accessibleCompanies = companyMasterID;

      companyFilter.companyMasterID = companyMasterID;
    }
    if (search)
      condition[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    const order =
      sortByField && sortByValue
        ? [[sortByField, sortByValue]]
        : [['createdAt', 'DESC']];
    const paginationQuery = {};
    if (!exportData && page && pageSize) {
      paginationQuery.offset = (page - 1) * pageSize;
      paginationQuery.limit = +pageSize;
    }

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    const goal = await Goal.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      paranoid: withDeleted !== 'true',
      include: [
        {
          model: KRAMaster,
          include: [
            {
              model: UserMaster,
              as: 'createdByUser',
              attributes: userAttributes,
            },
            {
              model: KPIMaster,
            },
          ],
        },
        {
          model: UserMaster,
          as: 'createdByUser',
          attributes: userAttributes,
          required: true,
          where: {...userAccessCondition.where},
          include: [...userAccessCondition.includeModels],  
        },
        {
          model: companyMaster,
          where: companyFilter,
        },
        { model: EmployeeGoal },
      ],
      nest: true,
      distinct: true,
    });

    if (exportData) {
      const finalData = goal.rows.map((goalItem) => {
        return {
          'Goal Name': goalItem.title,
          'Goal Description': goalItem.description,
          'Goal Type': goalItem.type,
          'From Date': goalItem.type,
          'To Date': goalItem.type,
          'Company Name': goalItem.companyMaster.companyName,
        };
      });

      await generateExcel(finalData, 'goal', exportFileType, res);
      return;
    }
    return res.status(statusCodes.OK).json({
      message: usermessage.fetchMessage('Goal'),
      data: goal.rows,
      totalcount: goal.count,
      page: +page,
      pageSize: paginationQuery.limit,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteGoal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const goal = await findGoalById(id, req.userDetails);
    if (goal && goal.employeeGoals && goal.employeeGoals?.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: 400,
        message: 'Goal can not be deleted already assigned to employee!',
      });
    }
    await goal.destroy({
      user: req.userDetails,
    });
    return res.status(statusCodes.OK).json({
      message: usermessage.deleteMessage('Goal'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getCompanyWiseGoal = async (req, res, next) => {
  try {
    const { companyMasterID } = req.params;
    const goalData = await Goal.findAll({
      attributes: ['id', 'title'],
      where: {
        companyMasterId: companyMasterID,
      },
    });
    return res.status(statusCodes.OK).json({
      message: usermessage.fetchMessage('Goal'),
      data: goalData,
      status: 200,
    });
  } catch (err) {
    next(err);
  }
};
