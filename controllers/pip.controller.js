const sequelize = require('../config/database');
const { userAttributes, statusCodes } = require('../utils/commonVars');
const { usermessage, errorMessage } = require('../response_message/message');
const UserMaster = require('../models/userMaster');
const PIP = require('../models/pip');
const PIPReviewer = require('../models/pipReviewer');
const UserInbox = require('../models/UserInbox');
const {
  sendNotification,
  asiaKolkataDateTime,
} = require('../utils/commonUtilFunctions');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const { Sequelize } = require('sequelize');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const Division = require('../models/division');
const WorkingArea = require('../models/workingArea');
const EmployeeDivision = require('../models/employeeDivision');
const PIPReviews = require('../models/pipReviews');

exports.createPIP = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      userMasterID,
      startDate,
      endDate,
      managerID,
      concernSummary,
      businessImpact,
      reviewers = [],
      pipReviewAdvanceDays,
    } = req.body;

    // Validation
    if (!userMasterID || !startDate || !managerID || reviewers.length === 0) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: usermessage.requiredMessage(
          'Employee, Start Date, Manager, and Reviewer',
        ),
      });
    }

    if (endDate && new Date(startDate) > new Date(endDate)) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: 'End Date should be greater than Start Date',
      });
    }

    // Duplicate reviewer check
    const reviewerIds = reviewers
      .map((r) => r.userMasterID)
      .filter((id) => !!id);
    const uniqueReviewerIds = new Set(reviewerIds);
    if (uniqueReviewerIds.size !== reviewerIds.length) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: 'Same reviewer cannot be added more than once.',
      });
    }

    const newStartDate = new Date(startDate);
    const newEndDate = endDate ? new Date(endDate) : null;

    const existingPIP = await PIP.findOne({
      where: {
        userMasterID,
        [Sequelize.Op.or]: [
          // Case 1: in-progress (not Approved, not Rejected)
          {
            authorizationStatus: {
              [Sequelize.Op.notIn]: [3, 4],
            },
          },
          // Case 2: Approved and overlapping date range
          {
            authorizationStatus: 3,
            startDate: {
              [Sequelize.Op.lte]: newEndDate || new Date('9999-12-31'),
            },
            [Sequelize.Op.or]: [
              { endDate: null },
              { endDate: { [Sequelize.Op.gte]: newStartDate } },
            ],
          },
        ],
      },
      transaction,
    });

    if (existingPIP) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message:
          existingPIP.authorizationStatus === 3
            ? 'An approved PIP already exists for this employee that overlaps with the selected dates.'
            : 'This employee already has a PIP in progress. Please resolve it before creating a new one.',
      });
    }

    // Create PIP
    const policy = await PIP.create(
      {
        userMasterID,
        startDate,
        endDate,
        managerID,
        concernSummary,
        businessImpact,
        pipReviewAdvanceDays,
      },
      {
        transaction,
        user: req.userDetails,
      },
    );

    // Create Reviewers
    await PIPReviewer.bulkCreate(
      reviewers.map((reviewer) => ({
        pipID: policy.pipID,
        userMasterID: reviewer.userMasterID,
        individualHooks: true,
      })),
      {
        transaction,
        user: req.userDetails,
      },
    );

    // Fetch required users
    const userIds = [
      ...new Set([managerID, userMasterID, req.userDetails.userMasterId]),
    ];

    const users = await UserMaster.findAll({
      where: {
        userMasterID: userIds,
      },
      attributes: ['userMasterID', 'firebaseToken', 'displayName'],
      transaction,
    });

    const userMap = Object.fromEntries(
      users.map((user) => [user.userMasterID, user]),
    );

    const manager = userMap[managerID];
    const employee = userMap[userMasterID];
    const creator = userMap[req.userDetails.userMasterId];

    const inboxNotifications = [];

    if (manager) {
      inboxNotifications.push({
        assignedTo: manager.userMasterID,
        assignedBy: req.userDetails.userMasterId,
        activityTable: PIP.getTableName(),
        activityTablePK: policy.pipID,
        message: `${creator.displayName} has created a PIP for ${employee.displayName}`,
      });
    }

    let bulkNotification = [];

    if (inboxNotifications.length) {
      bulkNotification = await UserInbox.bulkCreate(inboxNotifications, {
        transaction,
        user: req.userDetails,
        individualHooks: true,
      });
    }

    await transaction.commit();

    const managerPayload = {
      screen: 'PerformanceImprovementPlanRequest',
    };

    await Promise.all(
      bulkNotification.map((item) =>
        sendNotification(
          item.assignedTo,
          {
            title: 'Performance Improvement Plan',
            body: item.message,
          },
          item.assignedTo === managerID ? managerPayload : null,
        ),
      ),
    );

    return res.status(statusCodes.OK).json({
      status: 200,
      message: usermessage.addMessage('PIP'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.updatePIP = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      pipID,
      userMasterID,
      startDate,
      endDate,
      managerID,
      concernSummary,
      businessImpact,
      reviewers = [],
      pipReviewAdvanceDays,
    } = req.body;

    // Validation
    if (
      !pipID ||
      !userMasterID ||
      !startDate ||
      !managerID ||
      reviewers.length === 0
    ) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: usermessage.requiredMessage(
          'PIP, Employee, Start Date, Manager and Reviewer',
        ),
      });
    }

    if (endDate && new Date(startDate) > new Date(endDate)) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: 'End Date should be greater than Start Date',
      });
    }

    // Duplicate reviewer check
    const reviewerIds = reviewers
      .map((r) => r.userMasterID)
      .filter((id) => !!id);
    const uniqueReviewerIds = new Set(reviewerIds);
    if (uniqueReviewerIds.size !== reviewerIds.length) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: 'Same reviewer cannot be added more than once.',
      });
    }

    // Check existing PIP
    const existingPIP = await PIP.findByPk(pipID, {
      transaction,
    });

    if (!existingPIP) {
      await transaction.rollback();
      return res.status(statusCodes.NOT_FOUND).json({
        message: usermessage.notFoundMessage('PIP'),
      });
    }

    // Block update if another PIP for this employee is in-progress
    // or an approved one overlaps the selected dates
    const newStartDate = new Date(startDate);
    const newEndDate = endDate ? new Date(endDate) : null;

    const conflictingPIP = await PIP.findOne({
      where: {
        userMasterID,
        pipID: { [Sequelize.Op.ne]: pipID },
        [Sequelize.Op.or]: [
          // Case 1: in-progress (not Approved, not Rejected)
          {
            authorizationStatus: {
              [Sequelize.Op.notIn]: [3, 4],
            },
          },
          // Case 2: Approved and overlapping date range
          {
            authorizationStatus: 3,
            startDate: {
              [Sequelize.Op.lte]: newEndDate || new Date('9999-12-31'),
            },
            [Sequelize.Op.or]: [
              { endDate: null },
              { endDate: { [Sequelize.Op.gte]: newStartDate } },
            ],
          },
        ],
      },
      transaction,
    });

    if (conflictingPIP) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message:
          conflictingPIP.authorizationStatus === 3
            ? 'An approved PIP already exists for this employee that overlaps with the selected dates.'
            : 'This employee already has a PIP in progress. Please resolve it before updating this one.',
      });
    }

    // Update PIP
    await existingPIP.update(
      {
        userMasterID,
        startDate,
        endDate,
        managerID,
        concernSummary,
        businessImpact,
        pipReviewAdvanceDays,
      },
      {
        transaction,
        user: req.userDetails,
      },
    );

    // Delete existing reviewers
    await PIPReviewer.destroy({
      where: {
        pipID,
      },
      transaction,
    });

    await UserInbox.destroy({
      where: {
        activityTable: PIP.getTableName(),
        activityTablePK: pipID,
      },
      transaction,
    });

    // Insert new reviewers
    await PIPReviewer.bulkCreate(
      reviewers.map((reviewer) => ({
        pipID,
        userMasterID: reviewer.userMasterID,
      })),
      {
        transaction,
        user: req.userDetails,
        individualHooks: true,
      },
    );

    // Fetch required users
    const userIds = [
      ...new Set([managerID, userMasterID, req.userDetails.userMasterId]),
    ];

    const users = await UserMaster.findAll({
      where: {
        userMasterID: userIds,
      },
      attributes: ['userMasterID', 'firebaseToken', 'displayName'],
      transaction,
    });

    const userMap = Object.fromEntries(
      users.map((user) => [user.userMasterID, user]),
    );

    const manager = userMap[managerID];
    const employee = userMap[userMasterID];
    const creator = userMap[req.userDetails.userMasterId];

    const inboxNotifications = [];

    if (manager) {
      inboxNotifications.push({
        assignedTo: manager.userMasterID,
        assignedBy: req.userDetails.userMasterId,
        activityTable: PIP.getTableName(),
        activityTablePK: existingPIP.pipID,
        message: `${creator.displayName} has created a PIP for ${employee.displayName}`,
      });
    }

    let bulkNotification = [];

    if (inboxNotifications.length) {
      bulkNotification = await UserInbox.bulkCreate(inboxNotifications, {
        transaction,
        user: req.userDetails,
        individualHooks: true,
      });
    }

    await transaction.commit();

    const managerPayload = {
      screen: 'PerformanceImprovementPlanRequest',
    };

    await Promise.all(
      bulkNotification.map((item) =>
        sendNotification(
          item.assignedTo,
          {
            title: 'Performance Improvement Plan',
            body: item.message,
          },
          item.assignedTo === managerID ? managerPayload : null,
        ),
      ),
    );

    return res.status(statusCodes.OK).json({
      data: existingPIP,
      message: usermessage.updateMessage('PIP'),
      status: 200,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getPIPList = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      userMasterID,
      companyMasterID,
      authorizationstatus,
      searchQuery,
    } = req.body;

    const whereCondition = {};
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = +limit;
    }

    if (userMasterID && userMasterID.length > 0) {
      whereCondition.userMasterID = userMasterID;
    }

    if (authorizationstatus) {
      whereCondition.authorizationStatus = authorizationstatus;
    }

    const { count, rows } = await PIP.findAndCountAll({
      where: whereCondition,
      ...paginationQuery,
      include: [
        {
          model: UserMaster,
          as: 'employees',
          attributes: ['userMasterID', 'displayName'],
          ...(companyMasterID && {
            where: { companyMasterId: companyMasterID },
          }),
          include: [
            {
              required: false,
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
              required: false,
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
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
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
          ],
        },
        {
          model: UserMaster,
          as: 'manager',
          attributes: ['userMasterID', 'displayName'],
        },
      ],
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    return res.status(statusCodes.OK).json({
      data: rows,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getPIPByID = async (req, res, next) => {
  try {
    const { pipID } = req.params;

    if (!pipID) {
      return res.status(statusCodes.OK).json({
        status: 400,
        message: usermessage.requiredMessage('PIP ID'),
      });
    }
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const pip = await PIP.findOne({
      where: {
        pipID,
      },
      include: [
        {
          model: UserMaster,
          as: 'createdBy',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'employees',
          attributes: [
            'userMasterID',
            'displayName',
            'companyMasterId',
            'userNumber',
          ],
          include: [
            {
              required: false,
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
              required: false,
              model: EmployeeDepartment,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
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
              required: false,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
          ],
        },
        {
          model: UserMaster,
          as: 'manager',
          attributes: ['userMasterID', 'displayName'],
          include: [
            {
              required: false,
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              attributes: ['branchID'],
            },
          ],
        },
        {
          model: PIPReviewer,
          as: 'reviewers',
          include: [
            {
              model: UserMaster,
              as: 'reviewer',
              attributes: ['userMasterID', 'displayName'],
              include: [
                {
                  required: false,
                  model: EmployeeBranch,
                  where: {
                    status: 1,
                    applicableDate: {
                      [Sequelize.Op.lte]: new Date(filterDate),
                    },
                    [Sequelize.Op.or]: [
                      { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                      { endDate: { [Sequelize.Op.eq]: null } },
                    ],
                  },
                  required: false,
                  attributes: ['branchID'],
                },
              ],
            },
            {
              model: PIPReviews,
              attributes: ['review', 'action'],
            },
          ],
        },
      ],
    });

    if (!pip) {
      return res.status(statusCodes.OK).json({
        status: 400,
        message: usermessage.notFoundMessage('PIP'),
      });
    }

    return res.status(statusCodes.OK).json({
      data: pip,
      status: 200,
    });
  } catch (err) {
    next(err);
  }
};

exports.deletePIP = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { pipID } = req.params;

    const pip = await PIP.findByPk(pipID, {
      transaction,
    });

    if (!pip) {
      await transaction.rollback();

      return res.status(statusCodes.OK).json({
        status: 400,
        message: usermessage.notFoundMessage('PIP'),
      });
    }

    await PIPReviewer.destroy({
      where: {
        pipID,
      },
      transaction,
    });

    await pip.destroy({
      transaction,
      user: req.userDetails,
    });

    await transaction.commit();

    return res.status(statusCodes.OK).json({
      status: 200,
      message: usermessage.deleteMessage('PIP'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
