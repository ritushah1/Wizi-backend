const EmployeeGoal = require('../models/employeeGoal');
const UserMaster = require('../models/userMaster');
const { generateExcel, getGradeForTarget } = require('../utils/exportData');
const { usermessage, errorMessage } = require('../response_message/message');
const {
  userAttributes,
  statusCodes,
  companyAttributes,
} = require('../utils/commonVars');
const GoalMaster = require('../models/goalMaster');
const companyMaster = require('../models/companyMaster');
const KRAMaster = require('../models/kramaster');
const KPIMaster = require('../models/kpimaster');
const { CustomError } = require('../utils/customError');
const EmployeeGoalReview = require('../models/employeeGoalReview');
const EmployeeGoalReviewFeedback = require('../models/employeeGoalReviewFeedback');
const {
  EmployeeGoalStatusEnum,
  ReviewPeriodEnum,
  GoalEvaluationPeriodEnum,
} = require('../utils/dbUtils');
const {
  employeeDesignation,
  asiaKolkataDateTime,
} = require('../utils/commonUtilFunctions');
const { generatePDF } = require('../utils/pdfGenerate');
const EmployeeDesignation = require('../models/employeeDesignation');
const { Sequelize, where, fn, col, literal } = require('sequelize');
const Designation = require('../models/designation');
const { cond, forEach, constant, add, keys } = require('lodash');
const Op = Sequelize.Op;
const { accessibleUsers } = require('../utils/commonUtilFunctions');
const GoalSetting = require('../models/goalSetting');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const moment = require('moment');
const EmployeeGoalReviewer = require('../models/employeeGoalReviewer');
const path = require('path');
const fs = require('fs');
const Excel = require('exceljs');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');

exports.bulkCreateEmployeeGoalReview = async (req, res, next) => {
  try {
    const { employeeGoalId, userMasterID } = req.body;
    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };
    const validEmployeeGoal = await EmployeeGoal.findByPk(employeeGoalId, {
      include: [
        {
          model: GoalMaster,
          attributes: ['id'],
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
    if (!validEmployeeGoal) {
      throw new CustomError(
        usermessage.invalidField('Employee Goal'),
        statusCodes.BAD_REQUEST,
      );
    }

    const validUsers = await UserMaster.findAll({
      where: { userMasterID: userMasterID, status: 1 },
      include: {
        model: companyMaster,
        where: companyFilter,
      },
    });
    const validUserIds = validUsers.map((user) => user.userMasterID);
    const invalidUserIds = userMasterID.filter(
      (userId) => !validUserIds.includes(userId),
    );
    if (invalidUserIds.length > 0) {
      throw new CustomError(
        {
          message: usermessage.invalidField('user'),
          invalidUserIds: invalidUserIds.join(', '),
        },
        statusCodes.BAD_REQUEST,
      );
    }

    const dataToInsert = userMasterID.flatMap((reviewerId) => ({
      employeeGoalId,
      reviewerId,
    }));

    await EmployeeGoalReview.bulkCreate(dataToInsert, {
      user: req.userDetails,
      individualHooks: true,
    });

    return res.status(statusCodes.OK).json({
      message: usermessage.addMessage('Employee Goal Reviews'),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateEmployeeGoalReview = async (req, res, next) => {
  try {
    const { employeeGoalId, userMasterID, status, isCompleted } = req.body;
    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };
    const employeeGoalReview = await EmployeeGoalReview.findByPk(
      req.params.id,
      {
        include: [
          {
            model: EmployeeGoal,
            include: [
              {
                model: GoalMaster,
                include: [{ model: companyMaster, where: companyFilter }],
              },
            ],
          },
        ],
      },
    );
    if (status) employeeGoalReview.status = status;
    if (isCompleted) employeeGoalReview.isCompleted = isCompleted;
    if (employeeGoalId) {
      const validEmployeeGoal = await EmployeeGoal.findByPk(employeeGoalId, {
        include: [
          {
            model: GoalMaster,
            attributes: ['id'],
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
      if (!validEmployeeGoal)
        throw new CustomError(
          usermessage.notFoundMessage('Employee Goal'),
          statusCodes.NOT_FOUND,
        );
      employeeGoalReview.employeeGoalId = employeeGoalId;
    }
    if (userMasterID) {
      const validUsers = await UserMaster.findAll({
        where: { userMasterID: userMasterID, status: 1 },
        include: {
          model: companyMaster,
          where: companyFilter,
        },
      });
      if (!validUsers)
        throw new CustomError(
          usermessage.notFoundMessage('reviewer'),
          statusCodes.NOT_FOUND,
        );

      employeeGoalReview.reviewerId = userMasterID;
    }

    await employeeGoalReview.save({ user: req.userDetails });
    return res.status(statusCodes.OK).json({
      message: usermessage.updateMessage('Employee Goal Review'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getEmployeeGoalReviewDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };

    const employeeGoalReviewData = await EmployeeGoalReview.findByPk(id);
    if (!employeeGoalReviewData)
      throw new Error('EmployeeGoalReview not found');

    const employeeGoalData = await EmployeeGoal.findByPk(
      employeeGoalReviewData.employeeGoalId,
      {
        attributes: ['reviewPeriod'],
      },
    );

    const isShortPeriod =
      employeeGoalData.reviewPeriod === ReviewPeriodEnum.DAILY ||
      employeeGoalData.reviewPeriod === ReviewPeriodEnum.WEEKLY ||
      employeeGoalData.reviewPeriod === ReviewPeriodEnum.FORTNIGHTLY;

    let dateCondition;

    if (isShortPeriod) {
      // Use YYYY-MM-DD matching
      dateCondition = where(
        fn('TO_CHAR', col('employeeGoalReview.startDate'), 'YYYY-MM-DD'),
        { [Op.like]: `${employeeGoalReviewData.startDate}%` },
      );
    } else {
      // Use YYYY-MM matching
      const startDate = new Date(employeeGoalReviewData.startDate);
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const dateLike = `${year}-${month}`;

      dateCondition = where(
        fn('TO_CHAR', col('employeeGoalReview.startDate'), 'YYYY-MM'),
        { [Op.like]: `${dateLike}%` },
      );
    }

    const employeeGoalReview = await EmployeeGoalReview.findAll({
      as: 'employeeGoalReview',
      where: {
        employeeGoalId: employeeGoalReviewData.employeeGoalId,
        [Op.and]: dateCondition,
      },
      order: [
        ['id', 'ASC'],
        [EmployeeGoal, 'id', 'ASC'],
        [EmployeeGoal, GoalMaster, 'kraMasters', 'id', 'ASC'],
        [EmployeeGoal, GoalMaster, 'kraMasters', 'kpiMasters', 'id', 'ASC'],
        ['employeeGoalReviewFeedbacks', 'kpiMasterId', 'ASC'],
      ],
      include: [
        {
          model: EmployeeGoal,
          include: [
            {
              model: GoalMaster,
              include: [
                {
                  model: companyMaster,
                  where: companyFilter,
                  attributes: companyAttributes,
                },
                {
                  model: KRAMaster,

                  include: [
                    {
                      model: KPIMaster,
                    },
                  ],
                },
              ],
            },
            {
              model: UserMaster,
              as: 'goalAssignedTo',
              attributes: userAttributes,
            },
          ],
        },
        {
          model: UserMaster,
          as: 'reviewer',
          attributes: userAttributes,
        },
        {
          model: EmployeeGoalReviewFeedback,
        },
      ],
    });
    if (!employeeGoalReview)
      throw new CustomError(
        usermessage.notFoundMessage('Employee Goal Review'),
        statusCodes.NOT_FOUND,
      );

    return res.status(statusCodes.OK).json({
      data: employeeGoalReview,
      message: usermessage.fetchMessage('Employee Goal Review'),
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
      goalMasterId,
      userMasterID,
      revieweeId,
      companyMasterID,
      sortByField,
      sortByValue,
      exportData,
      employeeGoalID,
      exportFileType,
      pageView,
    } = req.query;

    const condition = {};
    if (userMasterID && !pageView) condition.reviewerId = userMasterID;
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

    const order =
      sortByField && sortByValue
        ? [[sortByField, sortByValue]]
        : [['id', 'DESC']];

    const paginationQuery = {};
    if (!exportData) {
      paginationQuery.offset = (page - 1) * pageSize;
      paginationQuery.limit = +pageSize;
    }

    const employeeGoalCondition = revieweeId
      ? { userMasterId: revieweeId }
      : pageView
        ? { userMasterId: userMasterID }
        : {};
    if (employeeGoalID) employeeGoalCondition.id = employeeGoalID;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const { rows: employeeGoalReviews, count } =
      await EmployeeGoalReview.findAndCountAll({
        attributes: [
          'id',
          'status',
          'isCompleted',
          'startDate',
          'endDate',
          'employeeGoalId',
          'reviewerId',
          'createdAt',
          'createBy',
          [
            Sequelize.literal(`(
            CASE 
              WHEN DATE("employeeGoalReview"."startDate") <= DATE('${filterDate}') 
              AND DATE("employeeGoalReview"."endDate") >= DATE('${filterDate}')
              THEN true
              ELSE false
            END
          )`),
            'edit',
          ],
        ],
        where: condition,
        ...paginationQuery,
        order,
        paranoid: withDeleted !== 'true',
        include: [
          {
            model: EmployeeGoal,
            where: employeeGoalCondition,
            order: [['id', 'ASC']],
            include: [
              {
                model: GoalMaster,
                where: goalMasterId ? { id: goalMasterId } : {},
                include: [
                  {
                    model: companyMaster,
                    where: companyFilter,
                    attributes: companyAttributes,
                  },
                  {
                    model: KRAMaster,
                    order: [['id', 'ASC']],
                    include: [
                      {
                        model: KPIMaster,
                        order: [['id', 'ASC']],
                      },
                    ],
                  },
                ],
              },
              {
                model: UserMaster,
                as: 'goalAssignedTo',
                attributes: userAttributes,
                required: true,
                ...accessibleUsers(req.userDetails),
                include: [
                  {
                    separate: true,
                    model: EmployeeDesignation,
                    where: {
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.lte]: new Date(filterDate),
                      },
                      [Sequelize.Op.or]: [
                        {
                          endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
                  {
                    separate: true,
                    model: EmployeeDepartment,
                    where: {
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.lte]: new Date(filterDate),
                      },
                      [Sequelize.Op.or]: [
                        {
                          endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
                    model: EmployeeBranch,
                    where: {
                      // ...(branchMasterID && { branchID: branchMasterID }),
                      status: 1,
                      applicableDate: {
                        [Sequelize.Op.lte]: new Date(filterDate),
                      },
                      [Sequelize.Op.or]: [
                        {
                          endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
                    model: EmployeeJoiningDetails,
                    attributes: ['employeeCode'],
                  },
                ],
              },
              {
                model: EmployeeGoalReviewer,
                attributes: ['reviewerId'],
                include: [
                  {
                    model: UserMaster,
                    as: 'reviewer',
                    attributes: ['displayName'],
                  },
                ],
              },
            ],
          },
          {
            model: UserMaster,
            as: 'reviewer',
            attributes: userAttributes,
          },
          { model: EmployeeGoalReviewFeedback },
        ],
        nest: true,
        distinct: true,
      });

    if (exportData) {
      const finaldata = employeeGoalReviews.map((e) => {
        // Extract KRA, KPI, Weightage, Target Given, and Target Achieved
        const kraTitle =
          e.employeeGoal.goalMaster.kraMasters.length > 0
            ? e.employeeGoal.goalMaster.kraMasters[0].title // Get the first KRA title
            : '';

        const kpiTitle =
          e.employeeGoal.goalMaster.kraMasters.length > 0 &&
          e.employeeGoal.goalMaster.kraMasters[0].kpiMasters.length > 0
            ? e.employeeGoal.goalMaster.kraMasters[0].kpiMasters[0].title // Get the first KPI title
            : '';

        const weightage =
          e.employeeGoal.goalMaster.kraMasters.length > 0 &&
          e.employeeGoal.goalMaster.kraMasters[0].kpiMasters.length > 0
            ? e.employeeGoal.goalMaster.kraMasters[0].kpiMasters[0].weightage // Get the first KPI weightage
            : '';

        const targetGiven = e.employeeGoal.targetGiven; // Extract Target Given from employeeGoal

        const targetAchieved =
          e.employeeGoalReviewFeedbacks.length > 0
            ? e.employeeGoalReviewFeedbacks[0].targetAchieved // Extract first targetAchieved
            : '';

        return {
          'Employee Code':
            e.employeeGoal.goalAssignedTo.employeeJoiningDetails.length > 0
              ? e.employeeGoal.goalAssignedTo.employeeJoiningDetails[0]
                  .employeeCode
              : '',
          'Employee Name': e.employeeGoal.goalAssignedTo.displayName,
          Number: e.employeeGoal.goalAssignedTo.userNumber,
          'Company Name': e.employeeGoal.goalMaster.companyMaster.companyName,
          Branch:
            e.employeeGoal.goalAssignedTo.employeeBranches.length > 0
              ? e.employeeGoal.goalAssignedTo.employeeBranches[0].branchMaster
                  .branchName
              : '',
          Department:
            e.employeeGoal.goalAssignedTo.employeeDepartments.length > 0
              ? e.employeeGoal.goalAssignedTo.employeeDepartments[0].department
                  .departmentName
              : '',
          Designation:
            e.employeeGoal.goalAssignedTo.employeeDesignations.length > 0
              ? e.employeeGoal.goalAssignedTo.employeeDesignations[0]
                  .designation.designationName
              : '',
          'Goal Name': e.employeeGoal.goalMaster.title,
          'Goal Description': e.employeeGoal.goalMaster.description,
          'Created Date': e.employeeGoal.createdAt,
          KRA: kraTitle, // KRA Title
          KPI: kpiTitle, // KPI Title
          Weightage: weightage, // Weightage
          'Target Given': targetGiven, // Target Given
          'Target Achieved': targetAchieved, // Target Achieved from feedback
        };
      });

      await generateExcel(finaldata, 'Employee Goals', 'xlsx', res);
      return;
    }

    return res.status(statusCodes.OK).json({
      message: usermessage.fetchMessage('Employee Goal Reviews'),
      data: employeeGoalReviews,
      totalcount: count,
      page: +page,
      pageSize: paginationQuery.limit,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteEmployeeGoalReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };
    const employeeGoalReview = await EmployeeGoalReview.findByPk(id, {
      include: [
        {
          model: EmployeeGoal,
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
        },
      ],
      nest: true,
    });
    if (!employeeGoalReview)
      throw new CustomError(
        usermessage.notFoundMessage('Employee Goal Review'),
        statusCodes.NOT_FOUND,
      );
    await employeeGoalReview.destroy({
      user: req.userDetails,
    });
    return res.status(statusCodes.OK).json({
      message: usermessage.deleteMessage('Employee Goal Review'),
    });
  } catch (err) {
    next(err);
  }
};

// FIX

exports.employeeGoalReviewReport = async (req, res, next) => {
  try {
    const { employeeGoalId, reportType } = req.query;
    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };

    const employeeGoalExists = await EmployeeGoal.findOne({
      where: { id: employeeGoalId },
      include: [
        {
          model: EmployeeGoalReview,
          include: [
            { model: UserMaster, as: 'reviewer', attributes: userAttributes },
            { model: EmployeeGoalReviewFeedback, separate: true },
          ],
        },
        {
          model: GoalMaster,
          include: [
            { model: GoalSetting, attributes: ['grade'] },
            {
              model: KRAMaster,
              include: [
                {
                  model: KPIMaster,
                },
              ],
            },
            { model: companyMaster, where: companyFilter, attributes: [] },
          ],
        },
        { model: UserMaster, attributes: userAttributes, as: 'goalAssignedTo' },
      ],
    });

    if (!employeeGoalExists)
      throw new CustomError(
        errorMessage.EMPLOYEE_GOAL_REPORT_NOT_READY,
        statusCodes.BAD_REQUEST,
      );

    const employeeGoalData = employeeGoalExists.toJSON();
    const revieweeDesignation = await employeeDesignation(
      employeeGoalData.userMasterId,
      new Date().toISOString().slice(0, 10),
    );
    const revieweeData = {
      name: employeeGoalData.goalAssignedTo.displayName,
      phone: employeeGoalData.goalAssignedTo.userNumber,
      email: employeeGoalData.goalAssignedTo.email,
      designation: revieweeDesignation['designation.designationName'],
      date:
        moment(employeeGoalData?.goalMaster?.fromDate, 'YYYY-MM-DD').format(
          'DD-MM-YYYY',
        ) +
        '<br>' +
        moment(employeeGoalData?.goalMaster?.toDate, 'YYYY-MM-DD').format(
          'DD-MM-YYYY',
        ),
    };

    const revieweeTable = `<tr>
    <td>Employee Name</td>
    <td>Email</td>
    <td>Phone</td>
    <td>Designation</td>
    <td>Date</td></tr>
    <tr>
    <td>${revieweeData.name}</td>
    <td>${revieweeData.email}</td>
    <td>${revieweeData.phone}</td>
    <td>${revieweeData.designation}</td>
    <td>${revieweeData.date}</td>
    </tr>`;

    const reportData = [];

    employeeGoalData.goalMaster.kraMasters.forEach((kra) => {
      kra.kpiMasters.forEach((kpi, index) => {
        let gradeForTarget = 'NA';

        if (
          employeeGoalData.employeeGoalReviews.length > 0 &&
          employeeGoalData.employeeGoalReviews[0].employeeGoalReviewFeedbacks
            .length > 0
        ) {
          const gradeObject = employeeGoalData.goalMaster.goalSetting.grade;

          const achievedGrade =
            employeeGoalData.employeeGoalReviews[0].employeeGoalReviewFeedbacks[
              index
            ].targetAchieved;

          gradeForTarget = getGradeForTarget(gradeObject, achievedGrade);
        }

        reportData.push({
          goalName: employeeGoalData.goalMaster.title,
          goalDescription: employeeGoalData.goalMaster.description,
          kraTitle: kra.title,
          kraDescription: kra.description,
          kraWeightage: kra.weightage,
          kpiId: kpi.id,
          kpiTitle: kpi.title,
          kpiDescription: kpi.description,
          kpiWeightage: kpi.weightage,
          targetGiven: employeeGoalData.targetGiven,
          gradeForTarget,
          kpiReviewerData: [],
        });
      });
    });

    const reviewers = [];
    employeeGoalData.employeeGoalReviews.forEach((egr) => {
      if (egr.employeeGoalReviewFeedbacks.length)
        reviewers.push({ name: egr.reviewer.displayName, id: egr.reviewerId });
    });

    reportData.forEach((data) => {
      employeeGoalData.employeeGoalReviews.forEach((reviews) => {
        reviews.employeeGoalReviewFeedbacks.forEach((feedbacks) => {
          if (+data.kpiId === +feedbacks.kpiMasterId)
            data.kpiReviewerData.push({
              reviewerId: reviews.reviewer.userMasterID,
              reviewerName: reviews.reviewer.displayName,
              targetAchieved: feedbacks.targetAchieved,
              targetGiven: data.targetGiven,
              remarks: feedbacks.remarks || 'NA',
            });
        });
      });
    });

    let reviewTableHeader = `<tr>
    <td>Goal</td>
    <td>KRA</td>
    <td>KPI</td>`;

    // Ensure that you add a header for each reviewer
    reviewers.forEach((reviewer) => {
      reviewTableHeader += `<td>${reviewer.name}</td>`;
    });

    reviewTableHeader += `</tr>`;

    let reviewTableRows = '';
    reportData.forEach((report) => {
      reviewTableRows += `<tr>
        <td>${report.goalName}</td>
        <td>${report.kraTitle}</td>
        <td>${report.kpiTitle}</td>`;

      // Add data for each reviewer
      reviewers.forEach((reviewer) => {
        const reviewerData = report.kpiReviewerData.find(
          (r) => r.reviewerId === reviewer.id,
        );

        reviewTableRows += `<td>
          Target Given: ${reviewerData ? reviewerData.targetGiven : 'NA'} <br>
          Target Achieved:  ${
            reviewerData ? reviewerData.targetAchieved : 'NA'
          } <br>
          Grade: ${report.gradeForTarget} <br>
          Remarks: ${reviewerData ? reviewerData.remarks : 'NA'}
        </td>`;
      });

      reviewTableRows += `</tr>`;
    });

    const reviewTable = reviewTableHeader + reviewTableRows;

    const pdfGenerationObject = { revieweeTable, reviewTable };
    const pdfBuffer = await generatePDF(
      'goalReviewReport',
      pdfGenerationObject,
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Goal-Review-Report-${revieweeData.displayName}.pdf`,
    );
    res.setHeader('Content-Type', 'application/pdf');
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// exports.employeeGoalReviewReport = async (req, res, next) => {
//   try {
//     const { employeeGoalId, reportType } = req.query;
//     const companyFilter = {
//       companyMasterID:
//         req.userDetails.childCompanies.length > 0
//           ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
//           : req.userDetails.companyMasterId,
//     };
//     const employeeGoalExists = await EmployeeGoal.findOne({
//       where: { id: employeeGoalId },
//       include: [
//         {
//           model: EmployeeGoalReview,
//           include: [
//             { model: UserMaster, as: 'reviewer', attributes: userAttributes },
//             { model: EmployeeGoalReviewFeedback, separate: true },
//           ],
//         },
//         {
//           model: GoalMaster,
//           include: [
//             {
//               model: KRAMaster,
//               include: [
//                 {
//                   model: KPIMaster,
//                 },
//               ],
//             },
//             { model: companyMaster, where: companyFilter, attributes: [] },
//           ],
//         },
//         { model: UserMaster, attributes: userAttributes, as: 'goalAssignedTo' },
//       ],
//     });

//     if (!employeeGoalExists)
//       throw new CustomError(
//         errorMessage.EMPLOYEE_GOAL_REPORT_NOT_READY,
//         statusCodes.BAD_REQUEST
//       );
//     const employeeGoalData = employeeGoalExists.toJSON();
//     const revieweeDesignation = await employeeDesignation(
//       employeeGoalData.userMasterId,
//       new Date().toISOString().slice(0, 10)
//     );
//     const revieweeData = {
//       name: employeeGoalData.goalAssignedTo.displayName,
//       phone: employeeGoalData.goalAssignedTo.userNumber,
//       email: employeeGoalData.goalAssignedTo.email,
//       designation: revieweeDesignation['designation.designationName'],
//     };

//     const revieweeTable = `<tr>
//     <td>Employee Name</td>
//     <td>Email</td>
//     <td>Phone</td>
//     <td>Designation</td></tr>
//     <tr>
//     <td>${revieweeData.name}</td>
//     <td>${revieweeData.email}</td>
//     <td>${revieweeData.phone}</td>
//     <td>${revieweeData.designation}</td></tr>`;

//     const reportData = [];
//     employeeGoalData.goalMaster.kraMasters.forEach((kra) => {
//       kra.kpiMasters.forEach((kpi) => {
//         reportData.push({
//           goalName: employeeGoalData.goalMaster.title,
//           goalDescription: employeeGoalData.goalMaster.description,
//           kraTitle: kra.title,
//           kraDescription: kra.description,
//           kraWeightage: kra.weightage,
//           kpiId: kpi.id,
//           kpiTitle: kpi.title,
//           kpiDescription: kpi.description,
//           kpiWeightage: kpi.weightage,
//           targetGiven: kpi.targetGiven,
//           kpiReviewerData: [],
//         });
//       });
//     });
//     const reviewers = [];
//     employeeGoalData.employeeGoalReviews.forEach((egr) => {
//       if (egr.employeeGoalReviewFeedbacks.length)
//         reviewers.push({ name: egr.reviewer.displayName, id: egr.reviewerId });
//     });
//     reportData.forEach((data) => {
//       employeeGoalData.employeeGoalReviews.forEach((reviews) => {
//         reviews.employeeGoalReviewFeedbacks.forEach((feedbacks) => {
//           if (+data.kpiId === +feedbacks.kpiMasterId)
//             data.kpiReviewerData.push({
//               reviewerId: reviews.reviewer.userMasterID,
//               reviewerName: reviews.reviewer.displayName,
//               targetAchieved: feedbacks.targetAchieved,
//               targetGiven: data.targetGiven,
//               remarks: feedbacks.remarks || 'NA',
//             });
//         });
//       });
//     });
//     let reviewTableHeader = `<tr>
//     <td>Goal</td>
//     <td>KRA</td>
//     <td>KPI</td>`;

//     for (let i = 0; i < reviewers.length; i++) {
//       reviewTableHeader += `<td>Anonymous reviewer ${i + 1}</td>`;
//     }
//     reviewTableHeader += `</tr>`;

//     let reviewTableRows = '';
//     reportData.forEach((report) => {
//       reviewTableRows += `<tr>
//         <td>${report.goalName}</td>
//         <td>${report.kraTitle}</td>
//         <td>${report.kpiTitle}</td>`;
//       report.kpiReviewerData.forEach((reviewerData) => {
//         reviewTableRows += `<td>Target Given: ${reviewerData.targetGiven} <br>
//           Target Achieved: ${reviewerData.targetAchieved} <br>
//          Remarks: ${reviewerData.remarks}</td>`;
//       });
//       reviewTableRows += `</tr>`;
//     });
//     const reviewTable = reviewTableHeader + reviewTableRows;

//     const pdfGenerationObject = { revieweeTable, reviewTable };
//     const pdfBuffer = await generatePDF(
//       'goalReviewReport',
//       pdfGenerationObject
//     );
//     res.setHeader(
//       'Content-Disposition',
//       `attachment; filename=Goal-Review-Report-${revieweeData.displayName}.pdf`
//     );
//     res.setHeader('Content-Type', 'application/pdf');
//     return res.send(pdfBuffer);
//   } catch (error) {
//     next(error);
//   }
// };

exports.addReview = async (req, res, next) => {
  try {
    const { employeeGoalReviewId, kpiData } = req.body;

    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };

    const findTargetGiven = await EmployeeGoalReview.findByPk(
      employeeGoalReviewId,
      {
        include: [
          {
            model: EmployeeGoal,
            attributes: ['targetGiven'],
          },
        ],
      },
    );

    const validEmployeeGoalReview = await EmployeeGoalReview.findByPk(
      employeeGoalReviewId,
      {
        include: [
          {
            model: EmployeeGoal,
            include: [
              {
                model: GoalMaster,
                attributes: ['id'],
                include: [
                  {
                    model: companyMaster,
                    where: companyFilter,
                  },
                ],
              },
            ],
          },
        ],

        nest: true,
      },
    );
    if (!validEmployeeGoalReview) {
      throw new CustomError(
        usermessage.invalidField('Employee Goal Review'),
        statusCodes.BAD_REQUEST,
      );
    }

    const dataToInsert = kpiData.map((kpi) => ({
      employeeGoalReviewId,
      kpiMasterId: kpi.kpiMasterId,
      remarks: kpi.remarks,
      targetAchieved: kpi.targetAchieved,
    }));

    await EmployeeGoalReviewFeedback.destroy({
      where: {
        employeeGoalReviewId,
      },
    });

    await EmployeeGoalReviewFeedback.bulkCreate(dataToInsert, {
      user: req.userDetails,
      individualHooks: true,
    });

    return res.status(statusCodes.OK).json({
      message: usermessage.addMessage('Employee Goal Review Feedback'),
    });
  } catch (error) {
    next(error);
  }
};

exports.employeeGoalReviewReportDesignationWise = async (req, res, next) => {
  try {
    const { designationID, goalMasterId } = req.query;

    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };

    const designaitonWiseUserData = await EmployeeDesignation.findAll({
      raw: true,
      where: {
        designationID: designationID,
        endDate: { [Sequelize.Op.eq]: null },
        status: 1,
      },
      attributes: ['userMasterID'],
      include: [
        {
          model: Designation,
          as: 'designation',
          attributes: ['designationName'],
        },
      ],
    });

    if (!designaitonWiseUserData) {
      throw new CustomError(
        errorMessage.EMPLOYEE_NOT_FOUND_IN_DESIGNATION,
        statusCodes.BAD_REQUEST,
      );
    }

    const designaitonWiseUserMasterId = designaitonWiseUserData.map(
      (e) => e.userMasterID,
    );
    const revieweeDesignation =
      designaitonWiseUserData[0]['designation.designationName'];

    const employeeGoalExists = await EmployeeGoal.findAll({
      where: { goalMasterId, userMasterId: designaitonWiseUserMasterId },
      include: [
        {
          model: EmployeeGoalReview,
          include: [
            { model: UserMaster, as: 'reviewer', attributes: userAttributes },
            { model: EmployeeGoalReviewFeedback, separate: true },
          ],
        },
        {
          model: GoalMaster,
          include: [
            {
              model: KRAMaster,
              include: [
                {
                  model: KPIMaster,
                },
              ],
            },
            { model: companyMaster, where: companyFilter, attributes: [] },
          ],
        },
        { model: UserMaster, attributes: userAttributes, as: 'goalAssignedTo' },
      ],
    });

    let reviewTable = '';
    if (employeeGoalExists.length == 0)
      throw new CustomError(
        errorMessage.EMPLOYEE_GOAL_REPORT_NOT_READY,
        statusCodes.BAD_REQUEST,
      );

    let pdfGenerationObject = '';

    for (let [index, element] of employeeGoalExists.entries()) {
      const employeeGoalData = element.toJSON();

      const revieweeData = {
        name: employeeGoalData.goalAssignedTo.displayName,
        phone: employeeGoalData.goalAssignedTo.userNumber,
        email: employeeGoalData.goalAssignedTo.email,
        designation: revieweeDesignation,
      };

      const revieweeTable = `<tr>
    <th>Employee Name</th>
    <th>Email</th>
    <th>Phone</th>
    <th>Designation</th></tr>
    <tr>
    <td>${revieweeData.name}</td>
    <td>${revieweeData.email}</td>
    <td>${revieweeData.phone}</td>
    <td>${revieweeData.designation}</td></tr>`;

      const reportData = [];
      employeeGoalData.goalMaster.kraMasters.forEach((kra) => {
        kra.kpiMasters.forEach((kpi) => {
          reportData.push({
            goalName: employeeGoalData.goalMaster.title,
            goalDescription: employeeGoalData.goalMaster.description,
            kraTitle: kra.title,
            kraDescription: kra.description,
            kraWeightage: kra.weightage,
            kpiId: kpi.id,
            kpiTitle: kpi.title,
            kpiDescription: kpi.description,
            kpiWeightage: kpi.weightage,
            targetGiven: kpi.targetGiven,
            kpiReviewerData: [],
          });
        });
      });
      const reviewers = [];
      employeeGoalData.employeeGoalReviews.forEach((egr) => {
        if (egr.employeeGoalReviewFeedbacks.length)
          reviewers.push({
            name: egr.reviewer.displayName,
            id: egr.reviewerId,
          });
      });
      reportData.forEach((data) => {
        employeeGoalData.employeeGoalReviews.forEach((reviews) => {
          reviews.employeeGoalReviewFeedbacks.forEach((feedbacks) => {
            if (+data.kpiId === +feedbacks.kpiMasterId)
              data.kpiReviewerData.push({
                reviewerId: reviews.reviewer.userMasterID,
                reviewerName: reviews.reviewer.displayName,
                targetAchieved: feedbacks.targetAchieved,
                targetGiven: data.targetGiven,
                remarks: feedbacks.remarks || 'NA',
              });
          });
        });
      });
      let reviewTableHeader = `<tr>
    <th>Goal</th>
    <th>KRA</th>
    <th>KPI</th>`;

      for (let i = 0; i < reviewers.length; i++) {
        reviewTableHeader += `<th>Anonymous reviewer ${i + 1}</th>`;
      }
      reviewTableHeader += `</tr>`;

      let reviewTableRows = '';
      reportData.forEach((report) => {
        reviewTableRows += `<tr>
        <td>${report.goalName}</td>
        <td>${report.kraTitle}</td>
        <td>${report.kpiTitle}</td>`;
        report.kpiReviewerData.forEach((reviewerData) => {
          reviewTableRows += `<td>Target Given: ${reviewerData.targetGiven} <br>
          Target Achieved: ${reviewerData.targetAchieved} <br>
         Remarks: ${reviewerData.remarks}</td>`;
        });
        reviewTableRows += `</tr>`;
      });

      reviewTable = reviewTableHeader + reviewTableRows;

      let final = ` <table>${revieweeTable}</table><h3>Review Form</h3> <table>${reviewTable}</table>`;

      if (index != employeeGoalExists.length - 1)
        final += `<div class='pageBreak'></div>`;

      pdfGenerationObject += final;
    }

    const pdfBuffer = await generatePDF('goalReviewReportDesignationWise', {
      pdfGenerationObject,
    });
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Goal-Review-Report-${revieweeDesignation}.pdf`,
    );
    res.setHeader('Content-Type', 'application/pdf');
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

exports.getGoalReviewReport = async (req, res, next) => {
  const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
  const goal = await EmployeeGoal.findByPk(req.body.id, {
    attributes: [
      'id',
      'remarks',
      'targetGiven',
      'targetAchieved',
      'evaluationPeriod',
      'reviewPeriod',
      'status',
      'startDate',
      'endDate',
      'reviewerRole',
      'reviewType',
      'userMasterId',
      'goalMasterId',
    ],
    include: [
      {
        model: GoalMaster,
        attributes: ['id', 'title', 'type', 'description'],
        include: [
          {
            model: KRAMaster,
            attributes: [
              'id',
              'title',
              'description',
              'weightage',
              'goalMasterId',
            ],
            include: [
              {
                model: KPIMaster,
                attributes: [
                  'id',
                  'title',
                  'description',
                  'weightage',
                  'kraMasterId',
                  'targetGiven',
                  'overAchieve',
                ],
              },
            ],
          },
          {
            model: GoalSetting,
            attributes: ['id', 'grade'],
          },
        ],
      },
      {
        model: EmployeeGoalReviewer,
        attributes: [
          'id',
          'startDate',
          'noDays',
          'employeeGoalId',
          'reviewerId',
        ],
        separate: true,
        include: [
          {
            model: UserMaster,
            as: 'reviewer',
            attributes: ['firstName', 'middleName', 'lastName', 'displayName'],
          },
        ],
      },
      {
        model: EmployeeGoalReview,
        attributes: [
          'id',
          'isCompleted',
          'employeeGoalId',
          'reviewerId',
          'startDate',
          'endDate',
        ],
        separate: true,
        include: [
          {
            model: EmployeeGoalReviewFeedback,
            attributes: [
              'remarks',
              'targetAchieved',
              'employeeGoalReviewId',
              'kpiMasterId',
            ],
            include: [
              {
                model: KPIMaster,
                attributes: [
                  'id',
                  'title',
                  'description',
                  'weightage',
                  'kraMasterId',
                  'targetGiven',
                  'overAchieve',
                ],
                include: [
                  {
                    model: KRAMaster,
                    attributes: [
                      'id',
                      'title',
                      'description',
                      'weightage',
                      'goalMasterId',
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        model: UserMaster,
        as: 'goalAssignedTo',
        attributes: [
          'userMasterID',
          'firstName',
          'middleName',
          'lastName',
          'displayName',
          'userNumber',
          'email',
        ],
        include: [
          {
            separate: true,
            model: EmployeeDesignation,
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(filterDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
    ],
  });

  const reportType = await getReportTypes(
    goal.evaluationPeriod,
    goal.reviewPeriod,
  );

  const validTypes = {
    Daily: ReviewPeriodEnum.DAILY,
    Weekly: ReviewPeriodEnum.WEEKLY,
    Fortnightly: ReviewPeriodEnum.FORTNIGHTLY,
    Monthly: ReviewPeriodEnum.MONTHLY,
    Quarterly: ReviewPeriodEnum.QUARTERLY,
    Annually: ReviewPeriodEnum.ANNUALLY,
    'Semi Annually': ReviewPeriodEnum.SEMI_ANNUALLY,
  };

  const dateObject = {};

  for (const type of reportType) {
    const mappedType = validTypes[type];
    if (mappedType) {
      dateObject[type] = await getPeriodDistribution(
        goal.startDate,
        goal.endDate,
        mappedType,
        goal.reviewPeriod,
        goal.evaluationPeriod,
      );
    }
  }

  // return res.json({ data: dateObject })

  const dateKeys = Object.keys(dateObject);
  const finalObject = {
    goalName: goal.goalMaster.title,
    evaluationPeriod: goal.evaluationPeriod,
    reviewPeriod: goal.reviewPeriod,
    startDate: goal.startDate,
    endDate: goal.endDate,
    ...goal.goalAssignedTo?.dataValues,
    employeeGoalReviewers: goal.employeeGoalReviewers,
  };

  for (const key of dateKeys) {
    finalObject[key] = {
      KRA: await Promise.all(
        goal.goalMaster.kraMasters.map(async (kra) => {
          return {
            kraName: kra.title,
            KPI: await Promise.all(
              kra.kpiMasters.map(async (kpi) => {
                return {
                  name: kpi.title,
                  id: kpi.id,
                  weightage: kpi.weightage,
                  targetGiven: kpi.targetGiven,
                  month: dateObject[key],
                  reviewer: await getFieldValues(
                    goal.employeeGoalReviewers,
                    'reviewerId',
                    dateObject[key],
                    goal.employeeGoalReviews,
                    kpi.id,
                    key,
                    kpi.targetGiven,
                    kpi.weightage,
                    goal.reviewPeriod,
                    goal.evaluationPeriod,
                    goal.startDate,
                    goal.endDate,
                  ),
                };
              }),
            ),
          };
        }),
      ),
    };
  }

  const exportDir = path.join(__dirname, '../uploads/PMS-report');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const fileName = `PMS_Report_${Date.now()}.xlsx`;
  const filePath = path.join(exportDir, fileName);

  const workbook = new Excel.Workbook({
    filename: filePath,
  });

  for (const reportvalue of reportType) {
    const sheet = workbook.addWorksheet(reportvalue);

    sheet.columns = [
      { width: 10 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 30 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
    ];

    const headerStyle = {
      font: { bold: true, size: 16 },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const cellStyle = {
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    const empInfoRow = sheet.addRow(['Goal Review Report']);
    sheet.mergeCells('A1:E1');
    empInfoRow.eachCell((cell) => {
      cell.style = headerStyle;
    });
    empInfoRow.height = 25;
    const userDetailsRow = sheet.addRow([
      'Employee Name',
      'Email',
      'Phone',
      'Designation',
      'Date',
    ]);

    userDetailsRow.eachCell((cell) => {
      cell.style = {
        alignment: { vertical: 'middle', horizontal: 'center' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
        font: { bold: true, size: 12 },
      };
    });

    const userDataRow = sheet.addRow([
      finalObject?.displayName,
      finalObject?.email,
      finalObject?.userNumber,
      finalObject?.employeeDesignations[0]?.designation?.designationName,
      `${finalObject?.startDate} to ${finalObject?.endDate}`,
    ]);
    userDataRow.eachCell((cell) => (cell.style = cellStyle));

    sheet.mergeCells('A5:O5');
    sheet.getCell('A5').value = 'Review Form';
    for (let col = 1; col <= 15; col++) {
      sheet.getRow(5).getCell(col).style = headerStyle;
    }

    sheet.getColumn(1).width = 30;
    sheet.getColumn(2).width = 40;
    sheet.getColumn(3).width = 80;

    sheet.addRow();
    sheet.addRow();
    // Table Headers
    const tableHeaders = ['Goal', 'KRA', 'KPI', 'Weightage %', 'Target Given'];
    const tableHeaderRow = sheet.addRow(tableHeaders);
    tableHeaderRow.eachCell((cell) => {
      // cell.style = headerStyle
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0056A0' },
      };
      ((cell.alignment = { vertical: 'middle', horizontal: 'center' }),
        (cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        }));
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
    });

    const startCol = 6;
    const row = 6;
    const months = finalObject[reportvalue]['KRA'][0]['KPI'][0]['month'];
    const reviewers = finalObject['employeeGoalReviewers'] || [];
    const reviewerIds = reviewers.map((r) => r.reviewerId);
    const reviewersPerMonth = reviewers.length;
    const reviewerSubHeaders = [
      'TargetAchieved',
      'WeightageAchieved',
      'Remarks',
    ];
    let currentCol = startCol;
    const weightScoreTotal = {};
    reviewerIds.forEach((userId) => {
      weightScoreTotal[userId] = {};
      months.forEach((month) => {
        weightScoreTotal[userId][month] = 0;
      });
    });

    for (let month of months) {
      const startMergeCol = currentCol;
      const endMergeCol = currentCol + reviewersPerMonth * 3 - 1;

      await applyColumnCellBorder(sheet, startMergeCol, endMergeCol, row);

      const startCell = `${getColumnLetter(startMergeCol)}${row}`;
      const endCell = `${getColumnLetter(endMergeCol)}${row}`;
      const mergeRange = `${startCell}:${endCell}`;

      sheet.mergeCells(mergeRange);

      const cell = sheet.getCell(startCell);
      cell.value = month;
      cell.style = {
        alignment: { vertical: 'middle', horizontal: 'center' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
        font: { bold: true },
      };

      reviewers.forEach((reviewer, i) => {
        const reviewerStartCol = currentCol + i * 3;
        const reviewerMiddleCol = reviewerStartCol + 1;
        const reviewerEndCol = reviewerStartCol + 2;
        const reviewerCell = `${getColumnLetter(reviewerStartCol)}${row + 1}`;
        const reviewerMiddleCell = `${getColumnLetter(reviewerMiddleCol)}${row + 1}`;
        const reviewerEndCell = `${getColumnLetter(reviewerEndCol)}${row + 1}`;

        sheet.mergeCells(`${reviewerCell}:${reviewerEndCell}`);

        const name =
          reviewer?.reviewer?.displayName || `Reviewer ${reviewer.reviewerId}`;
        const reviewerNameCell = sheet.getCell(reviewerCell);
        reviewerNameCell.value = name;
        reviewerNameCell.style = {
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          },
          font: { bold: true },
        };

        const midReviewer = sheet.getCell(reviewerMiddleCell);
        midReviewer.style = {
          border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          },
        };

        const endReviewer = sheet.getCell(reviewerEndCell);
        endReviewer.style = {
          border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          },
        };

        reviewerSubHeaders.forEach((header, idx) => {
          const col = reviewerStartCol + idx;
          const cell = sheet.getCell(row + 2, col);
          cell.value = header;
          cell.style = {
            alignment: { vertical: 'middle', horizontal: 'center' },
            border: {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            },
            font: { bold: false },
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF0056A0' },
          };
          cell.font = {
            color: { argb: 'FFFFFFFF' },
          };

          if (header === 'TargetAchieved') {
            sheet.getColumn(col).width = 18;
          }
          if (header === 'WeightageAchieved') {
            sheet.getColumn(col).width = 20;
          }
        });
      });

      currentCol = endMergeCol + 1;
    }

    sheet.getRow(9).getCell(1).value = finalObject?.goalName;

    let rowIndex = 9;
    const goalStartRow = rowIndex;
    for (const KRAData of finalObject[reportvalue].KRA) {
      const kraStartRow = rowIndex;

      for (const KPIData of KRAData.KPI) {
        const periodLengths = {
          Monthly:
            goal.reviewPeriod == ReviewPeriodEnum.DAILY
              ? 30
              : goal.reviewPeriod == ReviewPeriodEnum.WEEKLY
                ? 4
                : goal.reviewPeriod == ReviewPeriodEnum.FORTNIGHTLY
                  ? 2
                  : 1,
          Quarterly:
            goal.reviewPeriod == ReviewPeriodEnum.MONTHLY
              ? 3
              : goal.reviewPeriod == ReviewPeriodEnum.QUARTERLY
                ? 1
                : 1,
          'Semi Annually':
            goal.reviewPeriod == ReviewPeriodEnum.MONTHLY
              ? 6
              : goal.reviewPeriod == ReviewPeriodEnum.QUARTERLY
                ? 2
                : goal.reviewPeriod == ReviewPeriodEnum.SEMI_ANNUALLY
                  ? 1
                  : 1,
          Annually:
            goal.reviewPeriod == ReviewPeriodEnum.MONTHLY
              ? 12
              : goal.reviewPeriod == ReviewPeriodEnum.QUARTERLY
                ? 4
                : goal.reviewPeriod == ReviewPeriodEnum.SEMI_ANNUALLY
                  ? 2
                  : 1,
          Daily: 1,
          Weekly: goal.reviewPeriod == ReviewPeriodEnum.DAILY ? 7 : 1,
          Fortnightly:
            goal.reviewPeriod == ReviewPeriodEnum.DAILY
              ? 14
              : goal.reviewPeriod == ReviewPeriodEnum.WEEKLY
                ? 2
                : 1,
        };

        const row = sheet.getRow(rowIndex);
        row.getCell(3).value = KPIData.name;
        row.getCell(3).style = {
          alignment: {
            wrapText: true,
            horizontal: 'center',
            vertical: 'middle',
          },
        };
        row.getCell(4).value = KPIData.weightage;
        row.getCell(4).style = {
          alignment: {
            horizontal: 'right',
            vertical: 'bottom',
          },
        };
        row.getCell(5).value = KPIData.targetGiven * periodLengths[reportvalue];
        row.getCell(5).style = {
          alignment: {
            horizontal: 'right',
            vertical: 'bottom',
          },
        };
        let innerIndexCount = 6;
        months.forEach((month, index) => {
          reviewerIds.forEach((reviewer, i) => {
            const KPIResultData = getReviewerEntry(KPIData, reviewer, index);
            row.getCell(innerIndexCount).value = KPIResultData.targetArchive;
            row.getCell(innerIndexCount + 1).value =
              KPIResultData.weightedScore;
            row.getCell(innerIndexCount + 2).value = KPIResultData.remarks;
            row.getCell(innerIndexCount + 2).alignment = { wrapText: true };
            sheet.getColumn(innerIndexCount + 2).width = 40;

            innerIndexCount += 3;
            weightScoreTotal[reviewer][month] += KPIResultData.weightedScore;
          });
        });
        rowIndex++;
      }

      const kraEndRow = rowIndex - 1;

      if (kraStartRow <= kraEndRow) {
        sheet.mergeCells(kraStartRow, 2, kraEndRow, 2);
        const kraCell = sheet.getRow(kraStartRow).getCell(2);
        kraCell.value = KRAData.kraName;
        kraCell.style = cellStyle;
        await applyRowCellBorder(sheet, kraStartRow, kraEndRow, 2, cellStyle);
      }
    }

    const goalEndRow = rowIndex - 1;
    if (goalStartRow <= goalEndRow) {
      sheet.mergeCells(goalStartRow, 1, goalEndRow, 1);
      const goalCell = sheet.getRow(goalStartRow).getCell(1);
      goalCell.value = finalObject?.goalName;
      goalCell.style = cellStyle;
      await applyRowCellBorder(sheet, goalStartRow, goalEndRow, 1, cellStyle);
    }

    const summaryRow = sheet.getRow(rowIndex);

    // Merge A to J across two rows
    sheet.mergeCells(`A${summaryRow.number}:E${summaryRow.number}`);
    summaryRow.getCell(1).value = 'Sum Total';
    summaryRow.eachCell((cell) => {
      cell.style = {
        border: {
          top: {
            style: 'thin',
          },
          bottom: {
            style: 'thin',
          },
          left: {
            style: 'thin',
          },
          right: {
            style: 'thin',
          },
        },
        font: {
          bold: true,
        },
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
        },
      };
    });

    let summaryCol = 6;
    let totalAvgScore = [];
    months.forEach((month, monthIndex) => {
      reviewerIds.forEach((userId, reviewerIdsIndex) => {
        const firstEmptyCell = summaryRow.getCell(summaryCol);
        firstEmptyCell.value = '';
        firstEmptyCell.style = {
          border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          },
        };

        summaryCol++;
        totalAvgScore.push(weightScoreTotal[userId][month]);
        const cell = summaryRow.getCell(summaryCol);
        cell.value = weightScoreTotal[userId][month];
        cell.style = {
          font: { bold: true },
          alignment: { vertical: 'middle', horizontal: 'right' },
          border: {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          },
        };

        const isLastReviewer = reviewerIdsIndex === reviewerIds.length - 1;
        const isLastMonth = monthIndex === months.length - 1;

        for (let i = 1; i <= (isLastReviewer && isLastMonth ? 1 : 2); i++) {
          const emptyCell = summaryRow.getCell(summaryCol + i);
          emptyCell.value = '';
          emptyCell.style = {
            border: {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            },
          };
        }

        summaryCol += 2;
      });
    });

    const sum = totalAvgScore.reduce((acc, val) => acc + val, 0);
    const average = (sum / totalAvgScore.length).toFixed(2);
    rowIndex++;
    sheet.addRow();
    sheet.addRow();

    const finalScoreRowHeading = sheet.addRow([
      'Final Grade',
      'Final Goal Achievement',
    ]);
    finalScoreRowHeading.eachCell((cell) => (cell.style = cellStyle));
    const finalScoreRow = sheet.addRow([
      average,
      getGradeCategory(average, goal?.goalMaster?.goalSetting?.grade),
    ]);
    finalScoreRow.eachCell((cell) => {
      cell.style = {
        ...cellStyle,
        font: {
          bold: true,
        },
      };
    });

    sheet.addRow();

    const employeeACKRow = sheet.addRow(['Employee Acknowledgement']);
    employeeACKRow.eachCell((cell) => {
      cell.style = {
        font: {
          bold: true,
          size: 14,
        },
      };
    });

    sheet.addRow();
    const empACKDetailsRow = sheet.addRow(['']);
    const startRow = empACKDetailsRow.number;
    const endRow = startRow + 1;

    sheet.mergeCells(`A${startRow}:J${endRow}`);

    const ackCell = sheet.getCell(`A${startRow}`);
    ackCell.value =
      'I, [Employee Name], confirm that I have reviewed the contents of this performance appraisal, including the KPIs, ratings, and feedback provided. My signature below does not necessarily imply agreement with the evaluation but confirms that the appraisal discussion has taken place.';

    sheet.getRow(startRow).height = 40;
    sheet.getRow(endRow).height = 40;
    await applyColumnCellBorder(sheet, 1, 10, startRow);
    await applyColumnCellBorder(sheet, 1, 10, endRow);
    ackCell.style = {
      ...cellStyle,
      alignment: { wrapText: true, vertical: 'middle', horizontal: 'left' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    sheet.addRow();

    const empNameRow = sheet.addRow(['Employee Name']);
    empNameRow.eachCell((cell) => {
      cell.style = {
        border: {
          bottom: { style: 'thin' },
        },
        font: {
          bold: true,
        },
      };
    });

    sheet.addRow();
    const empSign = sheet.addRow(['Employee Signature']);
    empSign.eachCell((cell) => {
      cell.style = {
        font: {
          bold: true,
        },
      };
    });

    sheet.addRow();
    const date = sheet.addRow(['Date']);
    date.eachCell((cell) => {
      cell.style = {
        border: {
          bottom: { style: 'thin' },
        },
        font: {
          bold: true,
        },
      };
    });

    sheet.addRow();
    sheet.addRow(['☐ I agree with the evaluation']);
    sheet.addRow([
      '☐ I do not agree with the evaluation and have submitted my comments (attached)',
    ]);

    sheet.addRow();
    sheet.addRow();
    sheet.addRow();

    const HODACK = sheet.addRow(['Head of Department (HOD) Acknowledgment']);
    HODACK.eachCell(
      (cell) => (cell.style = { font: { size: 14, bold: true } }),
    );

    sheet.addRow();
    const HODACKDetailsRow = sheet.addRow(['']);
    const HODStartRow = HODACKDetailsRow.number;
    const HODEndRow = HODStartRow + 1;

    sheet.mergeCells(`A${HODStartRow}:J${HODEndRow}`);

    const hodackCell = sheet.getCell(`A${HODStartRow}`);
    hodackCell.value =
      'I, [HOD Name], confirm that the performance appraisal for the above employee has been completed based on established KPIs, documented monthly performance, and observed behaviors. I affirm that the appraisal process was conducted fairly and discussed with the employee.';

    sheet.getRow(HODStartRow).height = 40;
    sheet.getRow(HODEndRow).height = 40;
    await applyColumnCellBorder(sheet, 1, 10, HODStartRow);
    await applyColumnCellBorder(sheet, 1, 10, HODEndRow);
    hodackCell.style = {
      ...cellStyle,
      alignment: { wrapText: true, vertical: 'middle', horizontal: 'left' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    sheet.addRow();

    const HDONameRow = sheet.addRow(['HOD Name']);
    HDONameRow.eachCell((cell) => {
      cell.style = {
        border: {
          bottom: { style: 'thin' },
        },
        font: {
          bold: true,
        },
      };
    });

    sheet.addRow();
    const hodSign = sheet.addRow(['HOD Signature']);
    hodSign.eachCell((cell) => {
      cell.style = {
        border: {
          bottom: { style: 'thin' },
        },
        font: {
          bold: true,
        },
      };
    });

    sheet.addRow();
    const hoddate = sheet.addRow(['Date']);
    hoddate.eachCell((cell) => {
      cell.style = {
        border: {
          bottom: { style: 'thin' },
        },
        font: {
          bold: true,
        },
      };
    });

    sheet.addRow();
    sheet.addRow();

    const Identified = sheet.addRow(['Training Identified']);
    Identified.eachCell(
      (cell) =>
        (cell.style = {
          font: {
            size: 14,
          },
          font: {
            bold: true,
          },
        }),
    );

    const hodIdentificationRow = sheet.addRow(['']);
    const hodIdStartRow = hodIdentificationRow.number;
    const hodIdEndRow = hodIdStartRow + 6;

    for (let i = hodIdStartRow; i < hodIdEndRow; i++) {
      sheet.getRow(i).height = 40;
      await applyColumnCellBorder(sheet, 1, 3, i);
    }

    hodackCell.style = {
      ...cellStyle,
      alignment: { wrapText: true, vertical: 'middle', horizontal: 'left' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  }

  res.attachment(`${fileName}.xlsx`);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return workbook.xlsx.write(res);
};

function getGradeCategory(score, gradeRanges) {
  for (const [label, range] of Object.entries(gradeRanges)) {
    const [min, max] = range.split('-').map(Number);
    if (score >= min && score <= max) {
      return label;
    }
  }
  return 'Invalid Score';
}

function applyColumnCellBorder(sheet, startColumn, endColumn, row) {
  return new Promise((resolve) => {
    for (let i = startColumn; i <= endColumn; i++) {
      const cellRef = `${getColumnLetter(i)}${row}`;
      const borderCell = sheet.getCell(cellRef);
      borderCell.style = {
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      };
    }
    resolve();
  });
}
function applyRowCellBorder(sheet, startRow, endRow, col, cellStyle) {
  return new Promise((resolve) => {
    for (let i = startRow; i <= endRow; i++) {
      const cellRef = `${getColumnLetter(col)}${i}`;
      const borderCell = sheet.getCell(cellRef);
      borderCell.style = cellStyle;
    }
    resolve();
  });
}

function getReviewerEntry(kpiObject, reviewerId, index) {
  const reviewerArray = kpiObject.reviewer;

  for (const reviewer of reviewerArray) {
    if (reviewer.hasOwnProperty(reviewerId)) {
      return reviewer[reviewerId][index];
    }
  }

  return null;
}

function getColumnLetter(col) {
  let letter = '',
    temp = col;
  while (temp > 0) {
    let remainder = (temp - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
}

async function getReportTypes(evaluationPeriod, reviewPeriod) {
  const reportType = [];

  const includeDaily = () =>
    !reportType.includes(ReviewPeriodEnum.DAILY) &&
    reportType.push(ReviewPeriodEnum.DAILY);
  const includeWeekly = () =>
    !reportType.includes(ReviewPeriodEnum.WEEKLY) &&
    reportType.push(ReviewPeriodEnum.WEEKLY);
  const includeFortnightly = () =>
    !reportType.includes(ReviewPeriodEnum.FORTNIGHTLY) &&
    reportType.push(ReviewPeriodEnum.FORTNIGHTLY);
  const includeMonthly = () =>
    !reportType.includes('Monthly') && reportType.push('Monthly');
  const includeQuarterly = () =>
    !reportType.includes('Quarterly') && reportType.push('Quarterly');
  const includeSemiAnnually = () =>
    !reportType.includes('Semi Annually') && reportType.push('Semi Annually');
  const includeAnnually = () =>
    !reportType.includes('Annually') && reportType.push('Annually');

  if (evaluationPeriod === 'Monthly') {
    if (reviewPeriod === ReviewPeriodEnum.MONTHLY) {
      includeMonthly();
    } else if (reviewPeriod === ReviewPeriodEnum.DAILY) {
      includeDaily();
      includeWeekly();
      includeFortnightly();
      includeMonthly();
    } else if (reviewPeriod === ReviewPeriodEnum.WEEKLY) {
      includeWeekly();
      includeFortnightly();
      includeMonthly();
    } else if (reviewPeriod === ReviewPeriodEnum.FORTNIGHTLY) {
      includeFortnightly();
      includeMonthly();
    }
  } else if (evaluationPeriod === 'Quarterly') {
    if (reviewPeriod === 'Monthly') {
      includeMonthly();
      includeQuarterly();
    } else if (reviewPeriod === 'Quarterly') {
      includeQuarterly();
    }
  } else if (evaluationPeriod === 'Semi Annually') {
    if (reviewPeriod === 'Monthly') {
      includeMonthly();
      includeQuarterly();
      includeSemiAnnually();
    } else if (reviewPeriod === 'Quarterly') {
      includeQuarterly();
      includeSemiAnnually();
    } else if (reviewPeriod === 'Semi Annually') {
      includeSemiAnnually();
    }
  } else if (evaluationPeriod === 'Annually') {
    if (reviewPeriod === 'Monthly') {
      includeMonthly();
      includeQuarterly();
      includeSemiAnnually();
      includeAnnually();
    } else if (reviewPeriod === 'Quarterly') {
      includeQuarterly();
      includeSemiAnnually();
      includeAnnually();
    } else if (reviewPeriod === 'Semi Annually') {
      includeSemiAnnually();
      includeAnnually();
    } else if (reviewPeriod === 'Annually') {
      includeAnnually();
    }
  }

  return reportType;
}

async function getTargetAchieved(
  employeeGoalReviews,
  reviewerId,
  monthOrDate,
  kpiMasterId,
) {
  const isFullDate = monthOrDate.length === 10;

  const matchedReviews = employeeGoalReviews.filter((review) => {
    const reviewFullDate = review.startDate.slice(0, 10);
    const reviewMonth = review.startDate.slice(0, 7);

    return (
      review.reviewerId === reviewerId &&
      ((isFullDate && reviewFullDate === monthOrDate) ||
        (!isFullDate && reviewMonth === monthOrDate))
    );
  });

  for (const review of matchedReviews) {
    for (const feedback of review.employeeGoalReviewFeedbacks) {
      if (feedback.kpiMasterId == kpiMasterId) {
        return {
          targetAchieved: parseFloat(feedback.targetAchieved),
          remarks: feedback.remarks,
        };
      }
    }
  }

  return { targetAchieved: 0, remarks: '' };
}

async function getPeriodRange(
  startMonth,
  rawType,
  evaluationPeriod,
  reviewPeriod,
  goalStartDate,
  goalEndDate,
) {
  const type = rawType.trim().toLowerCase();

  // FULL DATE CHECK (YYYY-MM-DD)
  const isFullDate = startMonth.length === 10;

  // DAILY → return same date
  if (type === 'daily') {
    return [startMonth];
  }

  if (
    evaluationPeriod == GoalEvaluationPeriodEnum.MONTHLY &&
    reviewPeriod != ReviewPeriodEnum.MONTHLY &&
    type == 'monthly'
  ) {
    const result = [];
    const d = new Date(goalEndDate);

    for (let i = 30; i >= 0; i--) {
      const dt = new Date(d);
      dt.setDate(d.getDate() - i);
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      result.push(`${year}-${month}-${day}`);
    }

    return result;
  }

  if (type === 'weekly' && isFullDate) {
    const result = [];
    let d;
    if (
      evaluationPeriod == GoalEvaluationPeriodEnum.MONTHLY &&
      reviewPeriod != ReviewPeriodEnum.WEEKLY
    ) {
      d = new Date(startMonth);
      d.setDate(d.getDate() - 1);
    } else {
      d = new Date(startMonth);
    }

    for (let i = 6; i >= 0; i--) {
      const dt = new Date(d);
      dt.setDate(d.getDate() - i);
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      result.push(`${year}-${month}-${day}`);
    }
    return result;
  }

  // FORTNIGHTLY → last 14 days
  if (type === 'fortnightly' && isFullDate) {
    const result = [];
    const d = new Date(startMonth);

    for (let i = 13; i >= 0; i--) {
      const dt = new Date(d);
      dt.setDate(d.getDate() - i);
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      result.push(`${year}-${month}-${day}`);
    }
    return result;
  }

  // For Daily / Weekly / Fortnightly → return full date as-is
  if (['daily', 'weekly', 'fortnightly'].includes(type)) {
    return [startMonth]; // return SAME date
  }

  // For monthly-based periods
  const periodLengths = {
    monthly: 1,
    quarterly: 3,
    'semi annually': 6,
    annually: 12,
  };

  const [year, month] = startMonth.split('-').map(Number);

  const date = new Date(year, month); // JS months (0–11)
  date.setMonth(date.getMonth() - periodLengths[type]);

  // Format result
  const startYear = date.getFullYear();
  const startMonthNum = String(date.getMonth() + 1).padStart(2, '0');

  // const [startYear, startMonthNum] = startMonth.split('-').map(Number)

  const monthsToAdd = periodLengths[type];
  if (!monthsToAdd) {
    throw new Error(`Invalid type: ${rawType}`);
  }

  const range = [];

  for (let i = 0; i < monthsToAdd; i++) {
    const date = new Date(startYear, startMonthNum - 1 + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    range.push(`${year}-${month}`);
  }

  return range;
}

async function getReviewerTargetArchive(
  monthList,
  employeeGoalReviews,
  reviewerId,
  kpiMasterId,
  reportType = null,
  targetGiven,
  weightage,
  reviewPeriod,
  evaluationPeriod,
  goalStartDate,
  goalEndDate,
) {
  var value = [];
  for (const month of monthList) {
    // -------------------------
    // NEW: Weekly / fortnightly
    // -------------------------
    if (
      reportType &&
      (reportType.toLowerCase() === 'weekly' ||
        reportType.toLowerCase() === 'fortnightly' ||
        reportType.toLowerCase() === 'monthly') &&
      evaluationPeriod == GoalEvaluationPeriodEnum.MONTHLY &&
      reviewPeriod != ReviewPeriodEnum.MONTHLY
    ) {
      const newMonthObject = await getPeriodRange(
        month,
        reportType,
        evaluationPeriod,
        reviewPeriod,
        goalStartDate,
        goalEndDate,
      );
      var targetArchive = 0;
      var finalRemarks = '';

      for (const fullDate of newMonthObject) {
        const getTargetArchivedandRemarks = await getTargetAchieved(
          employeeGoalReviews,
          reviewerId,
          fullDate,
          kpiMasterId,
        );

        targetArchive += Number(getTargetArchivedandRemarks.targetAchieved);

        finalRemarks = getTargetArchivedandRemarks.remarks;
      }

      const targetGivenInto = newMonthObject.length; // same logic as monthly but with dates count

      let targetGivenTotal;

      if (
        (reviewPeriod == ReviewPeriodEnum.WEEKLY &&
          reportType.toLowerCase() === 'weekly') ||
        (reviewPeriod == ReviewPeriodEnum.FORTNIGHTLY &&
          reportType.toLowerCase() === 'fortnightly')
      ) {
        targetGivenTotal = Number(targetGiven);
      } else if (
        reviewPeriod == ReviewPeriodEnum.WEEKLY &&
        (reportType.toLowerCase() === 'fortnightly' ||
          reportType.toLowerCase() === 'monthly')
      ) {
        targetGivenTotal =
          reportType.toLowerCase() === 'fortnightly'
            ? Number(targetGiven) * 2
            : Number(targetGiven) * 4;
      } else if (
        reviewPeriod == ReviewPeriodEnum.FORTNIGHTLY &&
        reportType.toLowerCase() === 'monthly'
      ) {
        targetGivenTotal = Number(targetGiven) * 2;
      } else if (
        reviewPeriod == ReviewPeriodEnum.DAILY &&
        reportType.toLowerCase() === 'monthly'
      ) {
        targetGivenTotal = Number(targetGiven) * 30;
      } else {
        targetGivenTotal = Number(targetGiven) * targetGivenInto;
      }

      value.push({
        targetArchive: targetArchive,
        targetGiven: targetGivenTotal,
        weightedScore: await formatScore(
          await calculateWithDetails(
            targetArchive,
            targetGivenTotal,
            weightage,
          ),
        ),
        remarks: finalRemarks,
      });

      continue;
    }

    if (reportType != 'Monthly' && reportType != null) {
      const newMonthObject = await getPeriodRange(
        month,
        reportType,
        evaluationPeriod,
        reviewPeriod,
      );

      var targetArchive = 0;
      for (const newMonth of newMonthObject) {
        var getTargetArchivedandRemarks = await getTargetAchieved(
          employeeGoalReviews,
          reviewerId,
          newMonth,
          kpiMasterId,
          goalStartDate,
          goalEndDate,
        );
        targetArchive =
          targetArchive + Number(getTargetArchivedandRemarks.targetAchieved);
      }
      let targetGivenInto;

      if (
        (reviewPeriod == ReviewPeriodEnum.QUARTERLY &&
          evaluationPeriod == GoalEvaluationPeriodEnum.QUARTERLY) ||
        (reviewPeriod == ReviewPeriodEnum.SEMI_ANNUALLY &&
          evaluationPeriod == GoalEvaluationPeriodEnum.SEMI_ANNUALLY) ||
        (reviewPeriod == ReviewPeriodEnum.ANNUALLY &&
          evaluationPeriod == GoalEvaluationPeriodEnum.ANNUALLY)
      ) {
        targetGivenInto = 1;
      } else {
        if (
          (reviewPeriod == ReviewPeriodEnum.QUARTERLY &&
            reportType.toLowerCase() == 'quarterly' &&
            (evaluationPeriod == GoalEvaluationPeriodEnum.ANNUALLY ||
              evaluationPeriod == GoalEvaluationPeriodEnum.SEMI_ANNUALLY)) ||
          (reviewPeriod == ReviewPeriodEnum.SEMI_ANNUALLY &&
            reportType.toLowerCase() == 'semi annually' &&
            evaluationPeriod == GoalEvaluationPeriodEnum.ANNUALLY)
        ) {
          targetGivenInto = 1;
        } else {
          if (
            reviewPeriod == ReviewPeriodEnum.QUARTERLY &&
            reportType.toLowerCase() == 'semi annually' &&
            evaluationPeriod == GoalEvaluationPeriodEnum.ANNUALLY
          ) {
            targetGivenInto = 2;
          } else if (
            reviewPeriod == ReviewPeriodEnum.QUARTERLY &&
            reportType.toLowerCase() == 'annually' &&
            evaluationPeriod == GoalEvaluationPeriodEnum.ANNUALLY
          ) {
            targetGivenInto = 4;
          } else if (
            reviewPeriod == ReviewPeriodEnum.QUARTERLY &&
            reportType.toLowerCase() == 'semi annually' &&
            evaluationPeriod == GoalEvaluationPeriodEnum.SEMI_ANNUALLY
          ) {
            targetGivenInto = 2;
          } else if (
            reviewPeriod == ReviewPeriodEnum.SEMI_ANNUALLY &&
            reportType.toLowerCase() == 'annually' &&
            evaluationPeriod == GoalEvaluationPeriodEnum.ANNUALLY
          ) {
            targetGivenInto = 2;
          } else {
            targetGivenInto = newMonthObject.length;
          }
        }
      }

      value.push({
        targetArchive: targetArchive,
        targetGiven: Number(targetGiven) * targetGivenInto,
        weightedScore: await formatScore(
          await calculateWithDetails(
            targetArchive,
            Number(targetGiven) * targetGivenInto,
            weightage,
          ),
        ),
        remarks: getTargetArchivedandRemarks.remarks,
      });
    } else {
      var getTargetArchivedandRemarks = await getTargetAchieved(
        employeeGoalReviews,
        reviewerId,
        month,
        kpiMasterId,
      );
      value.push({
        targetArchive: Number(getTargetArchivedandRemarks.targetAchieved),
        targetGiven: Number(targetGiven),
        weightedScore: await formatScore(
          await calculateWithDetails(
            Number(getTargetArchivedandRemarks.targetAchieved),
            Number(targetGiven),
            weightage,
          ),
        ),
        remarks: getTargetArchivedandRemarks.remarks,
      });
    }
  }
  return value;
}

async function calculateWithDetails(achieved, target, weightage) {
  const percentageAchieved = (achieved / target) * 100;
  const finalResult = (weightage / 100) * percentageAchieved;
  return finalResult;
}

async function formatScore(value) {
  return Number(value.toFixed(2));
}

async function getFieldValues(
  array,
  fieldName,
  Months,
  employeeGoalReviews,
  kpiId,
  reportType = null,
  targetGiven,
  weightage,
  reviewPeriod,
  evaluationPeriod,
  goalStartDate,
  goalEndDate,
) {
  return await Promise.all(
    array.map(async (item) => {
      return {
        [item[fieldName]]: await getReviewerTargetArchive(
          Months,
          employeeGoalReviews,
          item[fieldName],
          kpiId,
          reportType,
          targetGiven,
          weightage,
          reviewPeriod,
          evaluationPeriod,
          goalStartDate,
          goalEndDate,
        ),
      };
    }),
  );
}

async function getPeriodDistribution(
  startDate,
  endDate,
  type,
  reviewPeriod,
  evaluationPeriod,
) {
  const periods = [];

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Existing short period handling (works for previous scenarios)
  if (
    type == ReviewPeriodEnum.DAILY &&
    evaluationPeriod == GoalEvaluationPeriodEnum.MONTHLY
  ) {
    return generateDates(start, end, ReviewPeriodEnum.DAILY);
  } else if (
    type == ReviewPeriodEnum.WEEKLY &&
    evaluationPeriod == GoalEvaluationPeriodEnum.MONTHLY
  ) {
    return generateDates(start, end, ReviewPeriodEnum.WEEKLY);
  } else if (
    type == ReviewPeriodEnum.FORTNIGHTLY &&
    evaluationPeriod == GoalEvaluationPeriodEnum.MONTHLY
  ) {
    return generateDates(start, end, ReviewPeriodEnum.FORTNIGHTLY);
  } else if (
    type == ReviewPeriodEnum.MONTHLY &&
    reviewPeriod != ReviewPeriodEnum.MONTHLY &&
    evaluationPeriod == GoalEvaluationPeriodEnum.MONTHLY
  ) {
    return generateDates(start, end, ReviewPeriodEnum.MONTHLY);
  } else if (
    evaluationPeriod === GoalEvaluationPeriodEnum.MONTHLY &&
    (type === ReviewPeriodEnum.DAILY ||
      type === ReviewPeriodEnum.WEEKLY ||
      type === ReviewPeriodEnum.FORTNIGHTLY ||
      (type === ReviewPeriodEnum.MONTHLY &&
        reviewPeriod !== ReviewPeriodEnum.MONTHLY))
  ) {
    return generateDates(start, end, type);
  }

  // For Quarterly / Semi Annually / Annually: existing behavior below
  let step = 1;
  switch (type) {
    case 'Monthly':
      step = 1;
      break;
    case 'Quarterly':
      step = 3;
      break;
    case 'Semi Annually':
      step = 6;
      break;
    case 'Annually':
      step = 12;
      break;
    default:
      throw new Error('Invalid period type');
  }

  if (reviewPeriod === 'Annually') {
    const afterEnd = new Date(end);
    afterEnd.setMonth(afterEnd.getMonth() + 1);
    afterEnd.setDate(1);
    const month = String(afterEnd.getMonth() + 1).padStart(2, '0');
    const year = afterEnd.getFullYear();
    periods.push(`${year}-${month}`);
    return periods;
  }

  const current = new Date(start);
  current.setMonth(current.getMonth() + step);
  current.setDate(1);

  const limit = new Date(end);
  limit.setMonth(limit.getMonth() + 1);
  limit.setDate(1);

  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    const temp = new Date(start);
    temp.setMonth(temp.getMonth() + 1);
    temp.setDate(1);
    const month = String(temp.getMonth() + 1).padStart(2, '0');
    const year = temp.getFullYear();
    periods.push(`${year}-${month}`);
    return periods;
  }

  while (current <= limit) {
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const year = current.getFullYear();

    if (
      evaluationPeriod == GoalEvaluationPeriodEnum.ANNUALLY &&
      reviewPeriod == ReviewPeriodEnum.MONTHLY &&
      periods.length < 12
    ) {
      periods.push(`${year}-${month}`);
    } else if (
      evaluationPeriod == GoalEvaluationPeriodEnum.ANNUALLY &&
      reviewPeriod == ReviewPeriodEnum.SEMI_ANNUALLY &&
      periods.length < 2
    ) {
      periods.push(`${year}-${month}`);
    } else if (
      evaluationPeriod == GoalEvaluationPeriodEnum.ANNUALLY &&
      reviewPeriod == ReviewPeriodEnum.QUARTERLY &&
      periods.length < 4
    ) {
      periods.push(`${year}-${month}`);
    } else if (
      evaluationPeriod == GoalEvaluationPeriodEnum.ANNUALLY &&
      reviewPeriod == ReviewPeriodEnum.ANNUALLY &&
      periods.length < 1
    ) {
      periods.push(`${year}-${month}`);
    } else if (
      evaluationPeriod == GoalEvaluationPeriodEnum.SEMI_ANNUALLY &&
      reviewPeriod == ReviewPeriodEnum.MONTHLY &&
      periods.length < 6
    ) {
      periods.push(`${year}-${month}`);
    } else if (
      evaluationPeriod == GoalEvaluationPeriodEnum.SEMI_ANNUALLY &&
      reviewPeriod == ReviewPeriodEnum.QUARTERLY &&
      periods.length < 2
    ) {
      periods.push(`${year}-${month}`);
    } else if (
      evaluationPeriod == GoalEvaluationPeriodEnum.SEMI_ANNUALLY &&
      reviewPeriod == ReviewPeriodEnum.SEMI_ANNUALLY &&
      periods.length < 1
    ) {
      periods.push(`${year}-${month}`);
    } else if (
      evaluationPeriod == GoalEvaluationPeriodEnum.QUARTERLY &&
      reviewPeriod == ReviewPeriodEnum.MONTHLY &&
      periods.length < 3
    ) {
      periods.push(`${year}-${month}`);
    } else if (
      evaluationPeriod == GoalEvaluationPeriodEnum.QUARTERLY &&
      reviewPeriod == ReviewPeriodEnum.QUARTERLY &&
      periods.length < 1
    ) {
      periods.push(`${year}-${month}`);
    } else if (
      evaluationPeriod == GoalEvaluationPeriodEnum.MONTHLY &&
      reviewPeriod == ReviewPeriodEnum.MONTHLY &&
      periods.length < 1
    ) {
      periods.push(`${year}-${month}`);
    }

    current.setMonth(current.getMonth() + step);
    current.setDate(1);
  }

  return periods;
}

function generateDates(startDate, endDate, period) {
  const result = [];
  let current = new Date(startDate);
  const last = new Date(endDate);

  if (period === ReviewPeriodEnum.DAILY) {
    // Daily → include start date
    while (current <= last) {
      result.push(formatDate(current));
      current.setDate(current.getDate() + 1);
    }
    return result;
  }

  if (period === ReviewPeriodEnum.WEEKLY) {
    // Weekly → start after 7 days
    current.setDate(current.getDate() + 7);

    while (current <= last) {
      result.push(formatDate(current));
      current.setDate(current.getDate() + 7);
    }
    return result;
  }

  if (period === ReviewPeriodEnum.FORTNIGHTLY) {
    // Fortnightly → start after 14 days
    current.setDate(current.getDate() + 14);

    while (current <= last) {
      result.push(formatDate(current));
      current.setDate(current.getDate() + 14);
    }
    return result;
  }

  if (period === ReviewPeriodEnum.MONTHLY) {
    // Monthly → only push the start-of-month ONCE
    result.push(formatDate(current));
    return result;
  }

  throw new Error('Invalid period type');
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

exports.getGoalConsolidatedReport = async (req, res, next) => {
  const userIds = req.body.userIds;
  const goalId = req.body.id;
  const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

  const userData = await UserMaster.findAll({
    where: {
      userMasterID: { [Op.in]: userIds },
    },
    attributes: ['userMasterID', 'displayName'],
    include: [
      {
        required: false,
        model: EmployeeDivision,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: filterDate },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: filterDate } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },

        attributes: ['divisionId', 'startDate'],
        include: [
          {
            model: Division,
            attributes: ['divisionName'],
          },
        ],
      },
      {
        required: false,
        model: EmployeeWorkingArea,
        where: {
          status: 1,
          startDate: { [Sequelize.Op.lte]: filterDate },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.gte]: filterDate } },
            { endDate: { [Sequelize.Op.eq]: null } },
          ],
        },
        attributes: ['workingAreaId', 'startDate'],
        include: [
          {
            model: WorkingArea,
            attributes: ['workingAreaName'],
          },
        ],
      },
      {
        model: EmployeeJoiningDetails,
        attributes: ['employeeCode'],
      },
      {
        required: false,
        model: EmployeeDepartment,
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(filterDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
        required: false,
        model: EmployeeDesignation,
        where: {
          status: 1,
          applicableDate: {
            [Sequelize.Op.lte]: new Date(filterDate),
          },
          [Sequelize.Op.or]: [
            {
              endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
  });

  const allGoals = await EmployeeGoal.findAll({
    where: {
      goalMasterId: goalId,
      userMasterId: { [Op.in]: userIds },
    },
    include: [
      {
        model: GoalMaster,
        include: { model: GoalSetting, attributes: ['grade'] },
      },
      {
        model: EmployeeGoalReview,
        attributes: [
          'id',
          'isCompleted',
          'employeeGoalId',
          'reviewerId',
          'startDate',
          'endDate',
        ],
        separate: true,
        include: [
          {
            model: EmployeeGoalReviewFeedback,
            attributes: [
              'remarks',
              'targetAchieved',
              'employeeGoalReviewId',
              'kpiMasterId',
            ],
            include: [
              {
                model: KPIMaster,
                attributes: [
                  'id',
                  'title',
                  'description',
                  'weightage',
                  'kraMasterId',
                  'targetGiven',
                  'overAchieve',
                ],
                include: [
                  {
                    model: KRAMaster,
                    attributes: [
                      'id',
                      'title',
                      'description',
                      'weightage',
                      'goalMasterId',
                    ],
                  },
                ],
              },
            ],
          },
          {
            model: UserMaster,
            as: 'reviewer',
          },
        ],
      },
      {
        model: EmployeeGoalReviewer,
      },
    ],
    order: [['id', 'DESC']],
  });

  const reviewResult = {};
  userIds.forEach((userId) => {
    reviewResult[userId] = [];
  });

  const goalsByUser = {};

  allGoals.forEach((goal) => {
    const userId = goal.userMasterId;
    if (!goalsByUser[userId]) {
      goalsByUser[userId] = [];
    }
    goalsByUser[userId].push(goal);
  });

  for (const userId of userIds) {
    if (!goalsByUser[userId]) {
      continue;
    }

    const goals = [];

    goalsByUser[userId].forEach((goal) => {
      const reviewerScores = {};

      goal.employeeGoalReviews?.forEach((review) => {
        const reviewerId = review.reviewerId;

        if (!reviewerScores[reviewerId]) {
          reviewerScores[reviewerId] = {
            archived: 0,
            targetgiven: 0,
            name: review?.reviewer?.displayName,
          };
        }

        review.employeeGoalReviewFeedbacks?.forEach((feedback) => {
          const kpi = feedback.kpiMaster;
          if (kpi?.targetGiven && kpi?.weightage && feedback?.targetAchieved) {
            reviewerScores[reviewerId].archived += parseFloat(
              feedback.targetAchieved,
            );
            reviewerScores[reviewerId].targetgiven += parseFloat(
              kpi.targetGiven,
            );
          }
        });
      });

      for (const reviewerId in reviewerScores) {
        reviewerScores[reviewerId].archived = parseFloat(
          reviewerScores[reviewerId].archived.toFixed(2),
        );
        reviewerScores[reviewerId].targetgiven = parseFloat(
          reviewerScores[reviewerId].targetgiven.toFixed(2),
        );
      }

      goals.push({
        goalId: goal?.id,
        grade: goal?.goalMaster?.goalSetting?.grade || {},
        remarks: goal?.remarks,
        startDate: goal?.startDate,
        endDate: goal?.endDate,
        reviewerScores,
      });
    });

    reviewResult[userId] = goals;
  }

  const exportDir = path.join(__dirname, '../uploads/Consolidate-report');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const fileName = `Consolidate_Report_${Date.now()}.xlsx`;
  const filePath = path.join(exportDir, fileName);

  const workbook = new Excel.Workbook();
  const sheet = workbook.addWorksheet('Consolidated Score Report');

  sheet.columns = [
    { header: 'Employee Code', key: 'employeeCode', width: 20 },
    { header: 'Employee Name', key: 'employeeName', width: 25 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Division', key: 'division', width: 20 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Previous Year Weighted Score', key: 'previousScore', width: 30 },
    { header: 'Reviewer Name', key: 'reviewerName', width: 30 },
    { header: 'Score', key: 'score', width: 30 },
    { header: 'Weighted Score', key: 'weightedScore', width: 30 },
    { header: 'Goal Achieved', key: 'goalArchived', width: 30 },
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'DFF0D8' },
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    cell.font = { bold: true };
  });

  let currentRow = 2;

  for (let i = 0; i < userData.length; i++) {
    const userId = userData[i]?.userMasterID || '-';
    const displayName = userData[i]?.displayName || '-';
    const department =
      userData[i]?.employeeDepartments[0]?.department?.departmentName || '-';
    const employeeCode =
      userData[i]?.employeeJoiningDetails[0]?.employeeCode || '-';
    const division =
      userData[i]?.employeeDivisions[0]?.division?.divisionName || '-';
    const location =
      userData[i]?.employeeWorkingAreas[0]?.workingArea?.workingAreaName || '-';

    const reviewData = reviewResult[userId];
    let previousScoreObject = [];

    if (reviewData && reviewData.length === 2) {
      const reviewerScores = reviewData[1]?.reviewerScores || {};
      const reviewerKeys = Object.keys(reviewerScores);

      previousScoreObject = reviewerKeys.map((key) => {
        const { archived, targetgiven } = reviewerScores[key];
        return (archived / targetgiven) * 100;
      });
    }

    let firstObjectReviewKeys = [];
    if (reviewData && reviewData.length >= 1) {
      const reviewerScores = reviewData[0].reviewerScores || {};
      firstObjectReviewKeys = Object.keys(reviewerScores);
    }

    const total = previousScoreObject.reduce((a, b) => a + b, 0);
    const avgScore = previousScoreObject.length
      ? (total / previousScoreObject.length).toFixed(2)
      : '0.00';

    const reviewerRowCount = firstObjectReviewKeys.length || 1;
    const weightedScoreObject = [];
    for (let j = 0; j < reviewerRowCount; j++) {
      const score = isNaN(
        (reviewData[0]?.reviewerScores[firstObjectReviewKeys[j]]?.archived /
          reviewData[0]?.reviewerScores[firstObjectReviewKeys[j]]
            ?.targetgiven) *
          100,
      )
        ? 0
        : (
            (reviewData[0]?.reviewerScores[firstObjectReviewKeys[j]]?.archived /
              reviewData[0]?.reviewerScores[firstObjectReviewKeys[j]]
                ?.targetgiven) *
            100
          ).toFixed(2);
      weightedScoreObject.push(score);
      sheet.addRow({
        employeeCode: '',
        employeeName: '',
        department: '',
        division: '',
        location: '',
        previousScore: '',
        reviewerName:
          reviewData[0]?.reviewerScores[firstObjectReviewKeys[j]]?.name || '',
        score: score,
        weightedScore: '',
        goalArchived: '',
      });
    }

    const fromRow = currentRow;
    const toRow = currentRow + reviewerRowCount - 1;
    const weightedScoreResult = calculateAverage(weightedScoreObject);
    const gradeObject = reviewData[0]?.grade || {};
    getGradeForTarget(gradeObject, weightedScoreResult);
    ['A', 'B', 'C', 'D', 'E', 'F', 'I', 'J'].forEach((col) =>
      sheet.mergeCells(`${col}${fromRow}:${col}${toRow}`),
    );

    const rowToFill = sheet.getRow(fromRow);

    rowToFill.getCell('A').value = employeeCode;
    rowToFill.getCell('B').value = displayName;
    rowToFill.getCell('C').value = department;
    rowToFill.getCell('D').value = division;
    rowToFill.getCell('E').value = location;
    rowToFill.getCell('F').value = avgScore;
    rowToFill.getCell('I').value = weightedScoreResult;
    rowToFill.getCell('J').value = getGradeForTarget(
      gradeObject,
      weightedScoreResult,
    );
    currentRow = toRow + 1;
  }

  sheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  });

  res.attachment(fileName);
  res.set({ 'Access-Control-Expose-Headers': '*' });

  return workbook.xlsx.write(res);
};

function calculateAverage(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 0;

  const numericValues = arr.map(Number).filter((val) => !isNaN(val)); // Filter out non-numeric values

  if (numericValues.length === 0) return 0;

  const total = numericValues.reduce((sum, val) => sum + val, 0);
  return (total / numericValues.length).toFixed(2);
}

/**
 * ================================
 * Main Controller Function
 * ================================
 */
exports.getKPIWiseEmployeePerformanceReport = async (req, res, next) => {
  try {
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const goals = await EmployeeGoal.findAll({
      where: {
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        userMasterId: req.body.userIds,
      },
      attributes: [
        'id',
        'remarks',
        'targetGiven',
        'targetAchieved',
        'evaluationPeriod',
        'reviewPeriod',
        'status',
        'startDate',
        'endDate',
        'reviewerRole',
        'reviewType',
        'userMasterId',
        'goalMasterId',
      ],
      include: [
        {
          required: true,
          model: GoalMaster,
          where: { id: req.body.id },
          attributes: ['id', 'title', 'type', 'description'],
          include: [
            {
              model: KRAMaster,
              attributes: [
                'id',
                'title',
                'description',
                'weightage',
                'goalMasterId',
              ],
              include: [
                {
                  model: KPIMaster,
                  attributes: [
                    'id',
                    'title',
                    'description',
                    'weightage',
                    'kraMasterId',
                    'targetGiven',
                    'overAchieve',
                  ],
                },
              ],
            },
            {
              model: GoalSetting,
              attributes: ['id', 'grade'],
            },
          ],
        },
        {
          model: EmployeeGoalReviewer,
          attributes: [
            'id',
            'startDate',
            'noDays',
            'employeeGoalId',
            'reviewerId',
          ],
          separate: true,
          include: [
            {
              model: UserMaster,
              as: 'reviewer',
              attributes: [
                'firstName',
                'middleName',
                'lastName',
                'displayName',
              ],
            },
          ],
        },
        {
          model: EmployeeGoalReview,
          attributes: [
            'id',
            'isCompleted',
            'employeeGoalId',
            'reviewerId',
            'startDate',
            'endDate',
          ],
          separate: true,
          include: [
            {
              model: EmployeeGoalReviewFeedback,
              attributes: [
                'remarks',
                'targetAchieved',
                'employeeGoalReviewId',
                'kpiMasterId',
              ],
              include: [
                {
                  model: KPIMaster,
                  attributes: [
                    'id',
                    'title',
                    'description',
                    'weightage',
                    'kraMasterId',
                    'targetGiven',
                    'overAchieve',
                  ],
                  include: [
                    {
                      model: KRAMaster,
                      attributes: [
                        'id',
                        'title',
                        'description',
                        'weightage',
                        'goalMasterId',
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          model: UserMaster,
          as: 'goalAssignedTo',
          attributes: [
            'userMasterID',
            'firstName',
            'middleName',
            'lastName',
            'displayName',
            'userNumber',
            'email',
          ],
          include: [
            {
              separate: true,
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(filterDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
            {
              separate: true,
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(filterDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
              model: EmployeeBranch,
              where: {
                // ...(branchMasterID && { branchID: branchMasterID }),
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(filterDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
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
          ],
        },
      ],
    });

    if (goals.length === 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: usermessage.notFoundMessage('Goal'),
      });
    }

    const buffer = await ggenerateExcel(goals);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=KPI_Performance_Report.xlsx',
    );

    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

/* ===========================
   EXCEL GENERATION
=========================== */

async function ggenerateExcel(allEmployeeGoals) {
  const workbook = new Excel.Workbook();
  const sheet = workbook.addWorksheet('KPI Report');

  // Get maximum number of reviewers for any single employee
  const maxReviewersCount = getMaxReviewersPerEmployee(allEmployeeGoals);

  // Set dynamic columns: Name + Branch + Department + Designation + Target Given + (value + reviewer name) for each reviewer slot
  const columns = [
    { width: 30 }, // Name
    { width: 20 }, // Branch
    { width: 20 }, // Department
    { width: 25 }, // Designation
    { width: 15 }, // Target Given
  ];

  // Add 2 columns for each reviewer slot (value column + reviewer name column)
  for (let i = 0; i < maxReviewersCount; i++) {
    columns.push({ width: 15 }); // Target Achieved value
    columns.push({ width: 25 }); // Reviewer Name
  }

  sheet.columns = columns;

  let row = 1;
  const goalMaster = allEmployeeGoals[0]?.goalMaster;

  /* ===== GOAL HEADER ===== */
  const lastCol = String.fromCharCode(69 + maxReviewersCount * 2); // Changed from 66 to 69 (A=65, B=66, C=67, D=68, E=69)

  // Add row first
  sheet.addRow([]);
  sheet.mergeCells(`A${row}:${lastCol}${row}`);
  const headerCell = sheet.getCell(`A${row}`);
  headerCell.value = `Goal: ${goalMaster?.title || ''}`;
  headerCell.font = { bold: true, size: 14 };
  headerCell.fill = solid('D9E1F2');
  row += 2;

  for (const kra of goalMaster?.kraMasters || []) {
    row = renderKRA(sheet, kra, allEmployeeGoals, row, maxReviewersCount);
    row += 2;
  }

  return workbook.xlsx.writeBuffer();
}

/* ===========================
   GET MAX REVIEWERS PER EMPLOYEE
=========================== */

function getMaxReviewersPerEmployee(allEmployeeGoals) {
  let max = 0;

  for (const eg of allEmployeeGoals) {
    const reviewerCount = eg.employeeGoalReviewers?.length || 0;
    if (reviewerCount > max) {
      max = reviewerCount;
    }
  }

  return max;
}

/* ===========================
   KRA SECTION
=========================== */

function renderKRA(sheet, kra, allEmployeeGoals, row, maxReviewersCount) {
  const lastCol = String.fromCharCode(69 + maxReviewersCount * 2);

  // Add row first
  sheet.addRow([]);
  sheet.mergeCells(`A${row}:${lastCol}${row}`);
  const kraCell = sheet.getCell(`A${row}`);
  kraCell.value = `KRA: ${kra.title}`;
  kraCell.font = { bold: true };
  kraCell.fill = solid('B4C7E7');
  row += 2;

  for (const kpi of kra.kpiMasters || []) {
    row = renderKPI(sheet, kpi, allEmployeeGoals, row, maxReviewersCount);
    row++;
  }

  return row;
}

/* ===========================
   KPI SECTION (CORE LOGIC)
=========================== */

function renderKPI(sheet, kpi, allEmployeeGoals, row, maxReviewersCount) {
  const lastCol = String.fromCharCode(69 + maxReviewersCount * 2);

  // Add KPI title row
  sheet.addRow([]);
  sheet.mergeCells(`A${row}:${lastCol}${row}`);
  const kpiCell = sheet.getCell(`A${row}`);
  kpiCell.value = `KPI: ${kpi.title}`;
  kpiCell.font = { bold: true };
  row++;

  // Header row with merged cells for each "Target Achieved"
  const headerRow = sheet.addRow([
    'Name',
    'Branch',
    'Department',
    'Designation',
    'Target Given',
  ]);

  // Merge cells for each "Target Achieved" header (spans 2 columns)
  let colIndex = 6; // Start from column F (after Name, Branch, Department, Designation, Target Given)
  for (let i = 0; i < maxReviewersCount; i++) {
    const startCol = String.fromCharCode(64 + colIndex);
    const endCol = String.fromCharCode(64 + colIndex + 1);
    sheet.mergeCells(`${startCol}${row}:${endCol}${row}`);

    const cell = sheet.getCell(`${startCol}${row}`);
    cell.value = 'Target Achieved';
    cell.font = { bold: true };
    cell.fill = solid('DEEAF6');
    cell.border = border();
    cell.alignment = { horizontal: 'center' };

    // Also apply border to the merged cell
    const endCell = sheet.getCell(`${endCol}${row}`);
    endCell.border = border();

    colIndex += 2; // Move to next pair of columns
  }

  // Apply styling to all header cells
  for (let i = 1; i <= 5; i++) {
    headerRow.getCell(i).font = { bold: true };
    headerRow.getCell(i).fill = solid('DEEAF6');
    headerRow.getCell(i).border = border();
  }

  row++;

  // Track totals for each reviewer column
  const columnTotals = new Array(maxReviewersCount).fill(0);

  // Employee rows
  for (const eg of allEmployeeGoals) {
    const reviewerData = getEmployeeReviewerData(eg, kpi.id);

    const rowData = [
      eg.goalAssignedTo?.displayName || '', // Name
      eg.goalAssignedTo?.employeeBranches?.[0]?.branchMaster?.branchName || '', // Branch
      eg.goalAssignedTo?.employeeDepartments?.[0]?.department?.departmentName ||
        '', // Department
      eg.goalAssignedTo?.employeeDesignations?.[0]?.designation
        ?.designationName || '', // Designation
      Number(kpi.targetGiven || 0), // Target Given
    ];

    // Add reviewer data for each slot
    for (let i = 0; i < maxReviewersCount; i++) {
      if (i < reviewerData.length && reviewerData[i].total !== 0) {
        rowData.push(reviewerData[i].total); // Value
        rowData.push(`${reviewerData[i].name}`); // Reviewer Name
        columnTotals[i] += reviewerData[i].total; // Add to total
      } else {
        rowData.push(''); // Empty value
        rowData.push(''); // Empty name
      }
    }

    const dataRow = sheet.addRow(rowData);

    // Apply borders and formatting
    dataRow.eachCell((cell, colNumber) => {
      cell.border = border();
      // Center align for all cells except first column (Name)
      if (colNumber > 1) {
        cell.alignment = { horizontal: 'center' };
      }
    });

    row++;
  }

  // Add Total Row
  const totalRowData = ['Total', '', '', '', ''];

  for (let i = 0; i < maxReviewersCount; i++) {
    totalRowData.push(columnTotals[i]); // Total value
    totalRowData.push(''); // Empty reviewer name
  }

  const totalRow = sheet.addRow(totalRowData);

  // Apply styling to total row
  totalRow.eachCell((cell, colNumber) => {
    cell.border = border();
    cell.font = { bold: true };
    if (colNumber > 1) {
      cell.alignment = { horizontal: 'center' };
    }
  });

  row++;

  return row;
}

/* ===========================
   GET EMPLOYEE REVIEWER DATA
=========================== */

function getEmployeeReviewerData(employeeGoal, kpiId) {
  const reviewerDataArray = [];

  // Create a map to store totals by reviewerId
  const reviewerTotalsMap = new Map();

  // Get reviewer info from employeeGoalReviewers
  const reviewerInfoMap = new Map();
  for (const reviewerAssignment of employeeGoal.employeeGoalReviewers || []) {
    if (reviewerAssignment.reviewerId) {
      reviewerInfoMap.set(reviewerAssignment.reviewerId, {
        id: reviewerAssignment.reviewerId,
        name:
          reviewerAssignment.reviewer?.displayName ||
          `Reviewer ${reviewerAssignment.reviewerId}`,
      });
    }
  }

  // Sum targetAchieved for each reviewerId where kpiMasterId matches
  for (const review of employeeGoal.employeeGoalReviews || []) {
    const reviewerId = review.reviewerId;

    if (!reviewerId) continue;

    let sum = reviewerTotalsMap.get(reviewerId) || 0;

    for (const fb of review.employeeGoalReviewFeedbacks || []) {
      if (fb.kpiMasterId === kpiId) {
        sum += Number(fb.targetAchieved || 0);
      }
    }

    reviewerTotalsMap.set(reviewerId, sum);
  }

  // Build the array with reviewer data
  for (const [reviewerId, total] of reviewerTotalsMap.entries()) {
    const reviewerInfo = reviewerInfoMap.get(reviewerId);
    if (reviewerInfo) {
      reviewerDataArray.push({
        id: reviewerId,
        total: total,
        name: reviewerInfo.name,
      });
    }
  }

  return reviewerDataArray;
}

/* ===========================
   STYLES
=========================== */

function solid(color) {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: `FF${color}` },
  };
}

function border() {
  return {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
}
