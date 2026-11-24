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
const { Sequelize } = require('sequelize');
const PIPReviews = require('../models/pipReviews');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');

exports.listPIPtoManager = async (req, res, next) => {
  try {
    const { page, limit, companyMasterID, authorizationstatus, userMasterID } =
      req.body;

    const offset = (page - 1) * limit;

    const whereCondition = {
      managerID: req.userDetails.userMasterId,
    };

    if (authorizationstatus) {
      whereCondition.authorizationStatus = authorizationstatus;
    }

    if (userMasterID && userMasterID.length > 0) {
      whereCondition.userMasterID = userMasterID;
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = +limit;
    }
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
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
      status: 200,
      data: rows,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.acceptRejectPIP = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { pipID, authorizationStatus } = req.body;

    // Validation
    if (!pipID) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: usermessage.requiredMessage('PIP ID'),
      });
    }

    // Check existing PIP
    const existingPIP = await PIP.findOne({
      where: {
        pipID: +pipID,
        managerID: req.userDetails.userMasterId,
        authorizationStatus: {
          [Sequelize.Op.notIn]: [3, 4],
        },
      },
      attributes: [
        'authorizationStatus',
        'userMasterID',
        'managerID',
        'createBy',
      ],
    });

    if (!existingPIP) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        status: 400,
        message: usermessage.notFoundMessage('PIP'),
      });
    }

    // Update PIP
    await PIP.update(
      {
        authorizationStatus,
      },
      {
        where: {
          pipID: +pipID,
        },
        transaction,
        user: req.userDetails,
      },
    );

    await UserInbox.destroy({
      where: {
        activityTable: PIP.getTableName(),
        activityTablePK: pipID,
      },
      transaction,
    });

    if (authorizationStatus == 3) {
      const managerID = existingPIP.managerID;
      const userMasterID = existingPIP.userMasterID;
      const createBy = existingPIP.createBy;

      const userIds = [...new Set([managerID, userMasterID, createBy])];

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
      const creator = userMap[createBy];

      const employeePayload = {
        screen: 'me/address',
      };

      const reviewerPayload = {
        screen: 'PerformanceImprovementPlanReviewer',
      };

      const reviewers = await PIPReviewer.findAll({
        where: {
          pipID: pipID,
        },
        transaction,
      });
      sendNotification(
        userMasterID,
        {
          title: 'Performance Improvement Plan',
          body: `${creator.displayName} has added you in PIP`,
        },
        employeePayload,
      );
      Promise.all(
        reviewers.map((item) =>
          sendNotification(
            item.userMasterID,
            {
              title: 'Performance Improvement Plan',
              body: `${creator.displayName} has added ${employee.displayName} in PIP and you are a reviewer.`,
            },
            null,
          ),
        ),
      );
    }

    await transaction.commit();

    return res.status(statusCodes.OK).json({
      status: 200,
      data: existingPIP,
      message: usermessage.updateMessage('PIP'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.listPIPtoReviewer = async (req, res, next) => {
  try {
    const { page, limit, userMasterID, companyMasterID, authorizationstatus } =
      req.body;

    const offset = (page - 1) * limit;

    const whereCondition = {
      authorizationStatus: 3,
    };

    if (userMasterID && userMasterID.length > 0) {
      whereCondition.userMasterID = userMasterID;
    }

    if (authorizationstatus) {
      whereCondition.authorizationStatus = authorizationstatus;
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = +limit;
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const { count, rows } = await PIP.findAndCountAll({
      where: whereCondition,
      ...paginationQuery,
      include: [
        {
          model: UserMaster,
          as: 'employees',
          attributes: ['userMasterID', 'displayName'],
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
        {
          model: PIPReviewer,
          as: 'reviewers',
          where: {
            userMasterID: req.userDetails.userMasterId,
          },
          include: [
            {
              model: PIPReviews,
              attributes: ['review', 'action'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
      distinct: true,
    });

    const today = new Date(filterDate);

    const data = rows.map((row) => {
      const plainRow = row.toJSON();

      // Since `reviewers` is filtered to the logged-in user, this is
      // effectively "the current user's reviewer record for this PIP".
      const currentReviewer = plainRow.reviewers?.[0];
      const alreadyReviewed = (currentReviewer?.pipReviews?.length || 0) > 0;

      let editable = false;

      if (!alreadyReviewed && plainRow.endDate) {
        const advanceDays = Number(plainRow.pipReviewAdvanceDays) || 0;
        const reviewWindowStart = new Date(plainRow.endDate);
        reviewWindowStart.setDate(reviewWindowStart.getDate() - advanceDays);

        editable = today >= reviewWindowStart;
      }

      return {
        ...plainRow,
        editable,
      };
    });

    return res.status(statusCodes.OK).json({
      data: data,
      totalcount: count,
      status: 200,
    });
  } catch (err) {
    next(err);
  }
};

exports.givePIPReview = async (req, res, next) => {
  try {
    const { pipReviewerID, review, action } = req.body;

    const policy = await PIPReviews.create(
      {
        pipReviewerID,
        review,
        action,
      },
      {
        user: req.userDetails,
      },
    );

    return res.status(statusCodes.OK).json({
      status: 200,
      message: 'Review Submitted Succefully',
    });
  } catch (err) {
    next(err);
  }
};
