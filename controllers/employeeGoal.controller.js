const EmployeeGoal = require('../models/employeeGoal');
const EmployeeGoalUpdates = require('../models/employeeGoalUpdates');
const sequelize = require('../config/database');
const { Sequelize, Op } = require('sequelize');
const UserMaster = require('../models/userMaster');
const EmployeeGoalReview = require('../models/employeeGoalReview');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeGoalReviewer = require('../models/employeeGoalReviewer');
const EmployeeGoalReviewFeedback = require('../models/employeeGoalReviewFeedback');
const Designation = require('../models/designation');
const { generateExcel } = require('../utils/exportData');
const { usermessage, errorMessage } = require('../response_message/message');
const {
  userAttributes,
  statusCodes,
  companyAttributes,
} = require('../utils/commonVars');
const GoalMaster = require('../models/goalMaster');
const companyMaster = require('../models/companyMaster');
const { CustomError } = require('../utils/customError');
const KRAMaster = require('../models/kramaster');
const KPIMaster = require('../models/kpimaster');
const { accessibleUsers } = require('../utils/commonUtilFunctions');
const { create } = require('lodash');
const moment = require('moment');
const { ReviewPeriodEnum } = require('../utils/dbUtils');

exports.bulkCreateEmployeeGoal = async (req, res, next) => {
  const {
    goalMasterId,
    userMasterID,
    targetGiven,
    evaluationPeriod,
    startDate,
    endDate,
    reviewerRole,
    reviewType,
    remarks,
    reviewPeriod,
    bulkData,
  } = req.body;

  const createBy = req.userDetails.userMasterId;
  const createByIp = req.userDetails.userIpAddress;

  try {
    // Prevent duplicate
    const exists = await EmployeeGoal.findOne({
      where: {
        userMasterId: userMasterID,
        goalMasterId: goalMasterId,
        startDate: { [Op.lte]: startDate },
        endDate: { [Op.gte]: startDate },
      },
      attributes: ['id'],
      raw: true,
    });

    if (exists) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: errorMessage.EMPLOYEE_GOAL_ALREADY_ASSIGNED,
      });
    }

    // Start transaction
    const employeeGoalCreate = await sequelize.transaction(async (t) => {
      const validGoal = await GoalMaster.findByPk(goalMasterId, {
        transaction: t,
      });
      if (!validGoal) {
        throw new Error(usermessage.invalidField('Goal'));
      }

      const validUser = await UserMaster.findByPk(userMasterID, {
        transaction: t,
      });
      if (!validUser) {
        throw new Error(usermessage.invalidField('User'));
      }

      const created = await EmployeeGoal.create(
        {
          goalMasterId,
          userMasterId: userMasterID,
          evaluationPeriod,
          startDate,
          endDate,
          reviewerRole,
          reviewType,
          remarks,
          targetGiven,
          createBy,
          createByIp,
          reviewPeriod,
        },
        {
          transaction: t,
          user: { userMasterId: createBy, userIpAddress: createByIp },
        },
      );

      const employeeGoalReviewerObject = bulkData.map((item) => ({
        ...item,
        employeeGoalId: created.id,
      }));

      await EmployeeGoalReviewer.bulkCreate(employeeGoalReviewerObject, {
        transaction: t,
        user: req.userDetails,
        individualHooks: true,
      });

      const employeeGoalReviewObject = generateReviewSchedule({
        startDate,
        endDate,
        reviewPeriod,
        employeeGoalId: created.id,
        bulkData,
        evaluationPeriod,
      });

      await EmployeeGoalReview.bulkCreate(employeeGoalReviewObject, {
        transaction: t,
        user: req.userDetails,
        individualHooks: true,
      });

      return created;
    });

    // Success response
    return res.status(statusCodes.OK).json({
      data: employeeGoalCreate,
      message: usermessage.addMessage('Employee Goals'),
    });
  } catch (error) {
    // Auto-rollback happens here if anything fails inside the transaction
    return res.status(statusCodes.INTERNAL_SERVER).json({
      message:
        error.message || 'Something went wrong while creating employee goals.',
    });
  }
};

exports.updateEmployeeGoal = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      targetGiven,
      targetAchieved,
      goalMasterId,
      userMasterId,
      remarks,
      status,
      startDate,
      endDate,
      reviewType,
      reviewPeriod,
      evaluationPeriod,
      reviewerRole,
      bulkData,
    } = req.body;

    // Prepare company filter for validation
    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };

    // Find existing EmployeeGoal with included GoalMaster and company
    const employeeGoal = await EmployeeGoal.findByPk(id, {
      include: {
        model: GoalMaster,
        include: [
          {
            model: companyMaster,
            where: companyFilter,
          },
        ],
      },
      transaction,
    });

    if (!employeeGoal) {
      await transaction.rollback();
      throw new CustomError(
        usermessage.notFoundMessage('Employee Goal'),
        statusCodes.NOT_FOUND,
      );
    }

    var employeeGoalEvaluationPeriod = employeeGoal.evaluationPeriod;
    const employeeGoalUpdates = {};

    if (status) {
      employeeGoalUpdates.employeeGoalId = employeeGoal.id;
      employeeGoalUpdates.status = status;
      employeeGoal.status = status;
    }

    if (remarks !== undefined) employeeGoal.remarks = remarks;
    if (targetGiven !== undefined) employeeGoal.targetGiven = targetGiven;
    if (targetAchieved !== undefined) {
      employeeGoalUpdates.employeeGoalId = employeeGoal.id;
      employeeGoalUpdates.targetAchieved = targetAchieved;
      employeeGoal.targetAchieved = targetAchieved;
    }

    if (userMasterId) {
      const userExist = await UserMaster.findByPk(userMasterId, {
        transaction,
      });
      if (!userExist) {
        await transaction.rollback();
        throw new CustomError(
          usermessage.notFoundMessage('User'),
          statusCodes.NOT_FOUND,
        );
      }

      employeeGoal.userMasterId = userMasterId;
    }

    if (goalMasterId) {
      const goalExists = await GoalMaster.findByPk(goalMasterId, {
        transaction,
      });
      if (!goalExists) {
        await transaction.rollback();
        throw new CustomError(
          usermessage.notFoundMessage('Goal'),
          statusCodes.NOT_FOUND,
        );
      }

      employeeGoal.goalMasterId = goalMasterId;
    }

    if (startDate) employeeGoal.startDate = startDate;
    if (endDate) employeeGoal.endDate = endDate;
    if (reviewType) employeeGoal.reviewType = reviewType;
    if (reviewPeriod) employeeGoal.reviewPeriod = reviewPeriod;
    if (evaluationPeriod) employeeGoal.evaluationPeriod = evaluationPeriod;
    if (reviewerRole) employeeGoal.reviewerRole = reviewerRole;

    if (Object.keys(employeeGoalUpdates).length) {
      await EmployeeGoalUpdates.create(employeeGoalUpdates, {
        transaction,
        user: req.userDetails,
      });
    }

    await employeeGoal.save({
      user: req.userDetails,
      transaction,
    });

    // Validate bulkData before using it
    if (!Array.isArray(bulkData)) {
      await transaction.rollback();
      throw new CustomError('Invalid bulkData format', statusCodes.BAD_REQUEST);
    }

    // Delete existing reviewers and recreate
    await EmployeeGoalReviewer.destroy({
      where: { employeeGoalId: id },
      transaction,
    });

    const employeeGoalReviewerObject = bulkData.map((item) => ({
      ...item,
      employeeGoalId: id,
    }));

    await EmployeeGoalReviewer.bulkCreate(employeeGoalReviewerObject, {
      transaction,
      individualHooks: true,
      user: req.userDetails,
    });

    // Delete existing reviews and recreate
    await EmployeeGoalReview.destroy({
      where: { employeeGoalId: id },
      transaction,
    });

    const employeeGoalReviewObject = generateReviewSchedule({
      startDate,
      endDate,
      reviewPeriod,
      employeeGoalId: id,
      bulkData,
      evaluationPeriod: employeeGoalEvaluationPeriod,
    });

    await EmployeeGoalReview.bulkCreate(employeeGoalReviewObject, {
      transaction,
      user: req.userDetails,
      individualHooks: true,
    });

    await transaction.commit();

    return res.status(statusCodes.OK).json({
      data: employeeGoal,
      message: usermessage.updateMessage('Employee Goal'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getEmployeeGoalDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };
    const employeeGoal = await EmployeeGoal.findByPk(id, {
      include: [
        {
          model: GoalMaster,
          include: [{ model: companyMaster, where: companyFilter }],
        },
        {
          model: EmployeeGoalReview,
          include: [
            {
              model: EmployeeGoalReviewFeedback,
            },
          ],
        },
        {
          model: EmployeeGoalReviewer,
          attributes: [
            'id',
            'employeeGoalId',
            'reviewerId',
            'startDate',
            'noDays',
          ],
        },
        {
          model: UserMaster,
          as: 'goalAssignedTo',
          attributes: userAttributes,
          include: [
            {
              model: companyMaster,
              attributes: companyAttributes,
            },
          ],
        },
        {
          model: EmployeeGoalUpdates,
        },
      ],
    });
    if (!employeeGoal)
      throw new CustomError(
        usermessage.notFoundMessage('Employee Goal'),
        statusCodes.NOT_FOUND,
      );

    return res.status(statusCodes.OK).json({
      data: employeeGoal,
      message: usermessage.fetchMessage('Employee Goal'),
    });
  } catch (err) {
    next(err);
  }
};

exports.listEmployeeGoals = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      withDeleted,
      status,
      userMasterID,
      goalMasterId,
      companyMasterID,
      sortByField,
      sortByValue,
      exportData,
      exportFileType,
    } = req.query;

    const condition = {};
    if (userMasterID) condition.userMasterId = +userMasterID;
    if (goalMasterId) condition.goalMasterId = +goalMasterId;
    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };
    if (companyMasterID) {
      req.userDetails.accessibleCompanies = companyMasterID;
      companyFilter.companyMasterID = +companyMasterID;
    }
    if (status) condition.status = status;

    const order =
      sortByField && sortByValue
        ? [[sortByField, sortByValue]]
        : [['createdAt', 'DESC']];

    const paginationQuery = {};
    if (!exportData) {
      paginationQuery.offset = (page - 1) * pageSize;
      paginationQuery.limit = +pageSize;
    }

    const employeeGoals = await EmployeeGoal.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      paranoid: withDeleted !== 'true',
      include: [
        {
          required: true,
          model: EmployeeGoalReviewer,
          attributes: ['id'],
          include: [
            {
              model: UserMaster,
              as: 'reviewer',
              attributes: ['displayName'],
            },
          ],
        },
        {
          required: true,
          model: GoalMaster,
          include: [
            {
              model: companyMaster,
              where: companyFilter,
            },
            { model: KRAMaster, include: [{ model: KPIMaster }] },
          ],
        },
        {
          model: UserMaster,
          as: 'goalAssignedTo',
          attributes: userAttributes,
          required: true,
          ...accessibleUsers(req.userDetails, true, false),
          include: [
            {
              model: companyMaster,
              attributes: companyAttributes,
            },
            {
              separate: true,
              required: false,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              separate: true,
              required: false,
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date() },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
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
              separate: true,
              required: false,
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date() },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
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
              required: false,
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(),
                    },
                  },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['designationID'],
              include: [
                {
                  model: Designation,
                  as: 'designation',
                  attributes: ['designationName'],
                },
              ],
            },
          ],
        },
        { model: EmployeeGoalUpdates },
      ],
      nest: true,
      distinct: true,
    });

    if (exportData) {
      const finalData = employeeGoals.rows.map((empGoalItem) => {
        return {
          'User Name': empGoalItem.goalAssignedTo.displayName,
          'Goal Name': empGoalItem.goalMaster.title,
          Remarks: empGoalItem.remarks,
          'Company Name': empGoalItem.goalAssignedTo.companyMaster.companyName,
          'Evaluation Period': empGoalItem.evaluationPeriod,
          'Target Given': empGoalItem.targetGiven,
          'Target Achieved': empGoalItem.targetAchieved,
          Status: empGoalItem.status,
        };
      });

      await generateExcel(finalData, 'Employee-Goals', exportFileType, res);
      return;
    }
    return res.status(statusCodes.OK).json({
      message: usermessage.fetchMessage('Employee Goals'),
      data: employeeGoals.rows,
      totalcount: employeeGoals.count,
      page: +page,
      pageSize: paginationQuery.limit,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteEmployeeGoal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employeeGoalAssignCount = await EmployeeGoalReviewer.findAll({
      distinct: true,
      where: {
        employeeGoalId: id,
      },
    });

    const reviewExists = await EmployeeGoalReviewFeedback.findOne({
      include: [
        {
          model: EmployeeGoalReview,
          required: true,
          where: {
            employeeGoalId: id,
          },
          attributes: [],
        },
      ],
      attributes: ['id'],
      raw: true,
    });

    if (reviewExists) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: 'Can not delete, Review already submitted for this goal.',
      });
    }

    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };
    const employeeGoal = await EmployeeGoal.findByPk(id, {
      include: [
        {
          model: GoalMaster,
          include: [
            {
              model: companyMaster,
              where: companyFilter,
            },
          ],
        },
      ],
      nest: true,
    });
    if (!employeeGoal)
      throw new CustomError(
        usermessage.notFoundMessage('Employee Goal'),
        statusCodes.NOT_FOUND,
      );

    await employeeGoal.destroy({
      user: req.userDetails,
    });
    return res.status(statusCodes.OK).json({
      message: usermessage.deleteMessage('Employee Goal'),
    });
  } catch (err) {
    next(err);
  }
};

const periodToMonths = {
  Monthly: 1,
  Quarterly: 3,
  'Semi Annually': 6,
  Annually: 12,
};

function getReviewCount(goalPeriod, reviewPeriod) {
  const goalMonths = periodToMonths[goalPeriod];
  const reviewMonths = periodToMonths[reviewPeriod];

  if (!goalMonths || !reviewMonths) {
    throw new Error(
      'Invalid period type. Must be one of: Monthly, Quarterly, Half Yearly, Yearly',
    );
  }

  if (goalMonths % reviewMonths !== 0) {
    throw new Error(
      `Review period (${reviewPeriod}) does not divide evenly into goal period (${goalPeriod})`,
    );
  }

  return goalMonths / reviewMonths;
}

function getLastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function generateReviewSchedule({
  startDate,
  endDate,
  reviewPeriod,
  employeeGoalId,
  bulkData,
  evaluationPeriod,
}) {
  const result = [];
  const reviewChunkSize = periodToMonths[reviewPeriod];
  const goalStart = new Date(startDate);
  const goalEnd = new Date(endDate);

  if (
    [
      ReviewPeriodEnum.DAILY,
      ReviewPeriodEnum.WEEKLY,
      ReviewPeriodEnum.FORTNIGHTLY,
    ].includes(reviewPeriod)
  ) {
    const totalDatesObject = generateDates(startDate, endDate, reviewPeriod);

    const noDays = {
      [ReviewPeriodEnum.DAILY]: 1,
      [ReviewPeriodEnum.WEEKLY]: 7,
      [ReviewPeriodEnum.FORTNIGHTLY]: 14,
      [ReviewPeriodEnum.MONTHLY]: 30,
    };

    bulkData.forEach(async ({ reviewerId }) => {
      totalDatesObject.map((item) => {
        result.push({
          reviewerId,
          employeeGoalId: employeeGoalId,
          startDate: item,
          endDate: getNextDate(item, noDays[reviewPeriod]),
        });
      });
    });
  } else {
    const totalNumberofMonths = getReviewCount(evaluationPeriod, reviewPeriod);

    bulkData.forEach(async ({ reviewerId, startDate: reviewDay, noDays }) => {
      let temp = new Date(goalStart);

      // For annual, start counting 1 month after the goal END date
      if (reviewChunkSize === 12) {
        temp = new Date(goalEnd);
        temp.setUTCMonth(temp.getUTCMonth() + 1);
      } else {
        // For other periods, start counting from 1 month after the goal START date
        temp.setUTCMonth(temp.getUTCMonth() + reviewChunkSize);
      }

      let startMonth = 1;
      while (startMonth <= totalNumberofMonths) {
        const year = temp.getUTCFullYear();
        const month = temp.getUTCMonth();
        const maxDay = getLastDayOfMonth(year, month);
        const safeDay = Math.min(reviewDay, maxDay);

        const reviewStart = new Date(Date.UTC(year, month, safeDay));
        const reviewEnd = new Date(reviewStart);
        reviewEnd.setUTCDate(reviewEnd.getUTCDate() + noDays - 1);

        result.push({
          reviewerId,
          employeeGoalId: employeeGoalId,
          startDate: reviewStart.toISOString().split('T')[0],
          endDate: reviewEnd.toISOString().split('T')[0],
        });

        temp.setUTCMonth(temp.getUTCMonth() + reviewChunkSize);
        startMonth++;
      }
    });
  }

  return result;
}

function getNextDate(startDate, days) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function generateDates(startDate, endDate, period) {
  const result = [];
  let current = new Date(startDate);
  const last = new Date(endDate);

  const gapDays = {
    Daily: 1,
    Weekly: 7,
    Fortnightly: 14,
    Monthly: 30,
  };

  const increment = gapDays[period];

  // 👉 Daily: include the starting date
  if (period === ReviewPeriodEnum.DAILY) {
    while (current <= last) {
      result.push(formatDate(current));
      current.setDate(current.getDate() + 1);
    }
    return result;
  }

  // 👉 Weekly / Fortnightly / Monthly (START AFTER first increment)
  current.setDate(current.getDate() + increment);

  while (current <= last) {
    result.push(formatDate(current));
    current.setDate(current.getDate() + increment);
  }

  return result;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

exports.getEmployeeGoalByUser = async (req, res, next) => {
  try {
    const { userMasterID } = req.body;

    const { rows, count } = await EmployeeGoal.findAndCountAll({
      where: {
        userMasterId: userMasterID,
      },
      attributes: [
        'userMasterId',
        'goalMasterId',
        'startDate',
        'endDate',
        'id',
      ],
      include: [
        {
          model: GoalMaster,
          attributes: ['title'],
          required: true,
        },
      ],
    });

    const data = rows.map((x) => ({
      id: +x?.id,
      title:
        x?.goalMaster?.title +
        ' ' +
        moment(x?.startDate, 'YYYY-MM-DD').format('DD-MM-YYYY') +
        ' - ' +
        moment(x?.endDate, 'YYYY-MM-DD').format('DD-MM-YYYY'),
    }));

    return res.status(statusCodes.OK).json({
      data: data,
      status: statusCodes.OK,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateReviewerData = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { values, goalID } = req.body;

    if (!values?.length) {
      await transaction.rollback();

      return res.status(statusCodes.OK).json({
        status: 400,
        message: 'Reviewers not found!',
      });
    }

    // Get current reviewer configuration
    const existingReviewers = await EmployeeGoalReviewer.findAll({
      where: {
        id: values.map((item) => item.id),
      },
      transaction,
      raw: true,
    });

    const reviewerMap = new Map();

    existingReviewers.forEach((reviewer) => {
      reviewerMap.set(reviewer.id, reviewer);
    });

    for (const item of values) {
      const oldReviewer = reviewerMap.get(item.id);

      if (!oldReviewer) {
        continue;
      }

      const startDateDiff =
        Number(item.startDate) - Number(oldReviewer.startDate);

      const noDaysDiff = Number(item.noDays) - Number(oldReviewer.noDays);

      // Update reviewer configuration
      await EmployeeGoalReviewer.update(
        {
          startDate: item.startDate,
          noDays: item.noDays,
        },
        {
          where: {
            id: item.id,
          },
          transaction,
          individualHooks: true,
          user: req.userDetails,
        },
      );

      // Nothing changed
      if (startDateDiff === 0 && noDaysDiff === 0) {
        continue;
      }

      const pendingReviews = await EmployeeGoalReview.findAll({
        where: {
          employeeGoalId: goalID,
          reviewerId: item.reviewerId,
          isCompleted: false,
        },
        transaction,
      });

      for (const review of pendingReviews) {
        let reviewStartDate = new Date(review.startDate);

        // If reviewer start day changed
        if (startDateDiff !== 0) {
          reviewStartDate.setDate(reviewStartDate.getDate() + startDateDiff);
        }

        // Recalculate end date using latest noDays
        const reviewEndDate = new Date(reviewStartDate);
        reviewEndDate.setDate(reviewEndDate.getDate() + Number(item.noDays) - 1);

        await review.update(
          {
            startDate: reviewStartDate,
            endDate: reviewEndDate,
          },
          {
            transaction,
            user: req.userDetails,
          },
        );
      }
    }

    await transaction.commit();

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: usermessage.updateMessage('Reviewers Data'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
