const Sequelize = require('sequelize');
const moment = require('moment');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const UserResignation = require('../models/resignation');
const ResignationAuthorization = require('../models/resignationAuthorization');
const AuthorizationMaster = require('../models/authorizationMaster');
const ResignTaskAssign = require('../models/resignTaskAssign');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const ResignProcess = require('../models/resignProcess');
const ResignationTask = require('../models/resignTask');
const companyMaster = require('../models/companyMaster');
const EmployeeBranch = require('../models/employeeBranch');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');

const {
  asiaKolkataDateTime,
  employeeDepartment,
  sendNotification,
  sendBulkNotification,
  createEmployeeJoiningDetailHistory,
} = require('../utils/commonUtilFunctions');
const ResigantionReason = require('../models/resigantionReason');
const message = require('../response_message/message');
const UserInbox = require('../models/UserInbox');
const EmployeeResignation = require('../models/resignation');
const {
  authorizationMasterTypes,
  AuthorizationStatusType,
  authorizationCriteriaType,
  notificationTitleTypes,
  notificationScreentTypes,
  AuthStatusInAuthorizationRequest,
} = require('../utils/dbUtils');
const userMasterService = require('../services/userMasterService');
const { statusCodes } = require('../utils/commonVars');
const EmployeeDivision = require('../models/employeeDivision');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const fs = require('fs');
const path = require('path');

async function resign_Task_Assign(userid, t = {}) {
  try {
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // =========================================================
    // Get Employee Current Organization Mapping
    // =========================================================

    const employee = await UserMaster.findOne({
      where: {
        userMasterID: userid,
      },

      include: [
        {
          model: EmployeeDepartment,
          required: false,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(filterDate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(filterDate),
                },
              },
              {
                endDate: null,
              },
            ],
          },
          attributes: ['departmentID'],
        },

        {
          model: EmployeeBranch,
          required: false,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(filterDate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(filterDate),
                },
              },
              {
                endDate: null,
              },
            ],
          },
          attributes: ['branchID'],
        },

        {
          model: EmployeeDesignation,
          required: false,
          where: {
            status: 1,
            applicableDate: {
              [Sequelize.Op.lte]: new Date(filterDate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(filterDate),
                },
              },
              {
                endDate: null,
              },
            ],
          },
          attributes: ['designationID'],
        },

        {
          model: EmployeeDivision,
          required: false,
          where: {
            status: 1,
            startDate: {
              [Sequelize.Op.lte]: new Date(filterDate),
            },
            [Sequelize.Op.or]: [
              {
                endDate: {
                  [Sequelize.Op.gte]: new Date(filterDate),
                },
              },
              {
                endDate: null,
              },
            ],
          },
          attributes: ['divisionId'],
        },
      ],

      ...t,
    });

    // =========================================================
    // Get Approved Resignation
    // =========================================================

    const user_resign = await UserResignation.findOne({
      raw: true,
      where: {
        userMasterID: userid,
        status: 1,
        authorizationstatus: 3,
      },
      ...t,
    });

    if (!employee || !user_resign) {
      return {
        success: false,
        message: 'Employee or resignation not found',
      };
    }

    // =========================================================
    // Prevent Duplicate Task Assignment
    // =========================================================

    const alreadyAssigned = await ResignTaskAssign.findOne({
      where: {
        resignationID: user_resign.resignationID,
      },
      ...t,
    });

    if (alreadyAssigned) {
      return {
        success: false,
        message: 'Tasks already assigned',
      };
    }

    // =========================================================
    // Employee Current Data
    // =========================================================

    const employeeData = {
      branchID: Number(employee.employeeBranches?.[0]?.branchID) || null,

      departmentID:
        Number(employee.employeeDepartments?.[0]?.departmentID) || null,

      divisionID: Number(employee.employeeDivisions?.[0]?.divisionId) || null,

      designationID:
        Number(employee.employeeDesignations?.[0]?.designationID) || null,
    };

    // =========================================================
    // Fetch Active Resignation Processes
    // =========================================================

    const resign_processes = await ResignProcess.findAll({
      raw: true,
      where: {
        status: 1,
        companyMasterID: employee.companyMasterId,
      },
      ...t,
    });

    // =========================================================
    // Match Compatible Processes
    // =========================================================

    const matchingProcesses = resign_processes.filter((process) => {
      // Branch must match if configured
      if (
        process.branchID &&
        Number(process.branchID) !== employeeData.branchID
      ) {
        return false;
      }

      // Department must match if configured
      if (
        process.departmentID &&
        Number(process.departmentID) !== employeeData.departmentID
      ) {
        return false;
      }

      // Division must match if configured
      if (
        process.divisionID &&
        Number(process.divisionID) !== employeeData.divisionID
      ) {
        return false;
      }

      // Designation must match if configured
      if (
        process.designationID &&
        Number(process.designationID) !== employeeData.designationID
      ) {
        return false;
      }

      return true;
    });

    if (!matchingProcesses.length) {
      return {
        success: false,
        message: 'No matching resignation process found',
      };
    }

    // =========================================================
    // Select Most Specific Match
    // =========================================================

    const scoredProcesses = matchingProcesses.map((process) => {
      let matchCount = 0;
      let priorityScore = 0;

      // Branch
      if (process.branchID) {
        matchCount++;
        priorityScore += 1;
      }

      // Division
      if (process.divisionID) {
        matchCount++;
        priorityScore += 2;
      }

      // Department
      if (process.departmentID) {
        matchCount++;
        priorityScore += 4;
      }

      // Designation
      if (process.designationID) {
        matchCount++;
        priorityScore += 8;
      }

      return {
        ...process,
        matchCount,
        priorityScore,
      };
    });

    scoredProcesses.sort((a, b) => {
      // First:
      // More exact matching fields
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount;
      }

      // Second:
      // Business priority
      return b.priorityScore - a.priorityScore;
    });

    // Highest exact match wins
    scoredProcesses.sort((a, b) => {
      return b.matchCount - a.matchCount;
    });

    const resign_process = scoredProcesses[0];

    // =========================================================
    // Fetch Tasks
    // =========================================================

    const resign_task = await ResignationTask.findAll({
      where: {
        resignProcessID: resign_process.resignProcessID,
        status: 1,
      },
      ...t,
    });

    if (!resign_task.length) {
      return {
        success: false,
        message: 'No tasks configured',
      };
    }

    // =========================================================
    // Prepare Task Assignment
    // =========================================================

    const resignTasks = resign_task.map((task) => ({
      resignTaskID: task.resignTaskID,
      resignationID: user_resign.resignationID,
      userMasterID: task.userMasterID,
      status: 0,
      createBy: user_resign.createBy,
      createByIp: user_resign.createByIp,
    }));

    // =========================================================
    // Create Task Assignments
    // =========================================================

    const createdTasks = await ResignTaskAssign.bulkCreate(resignTasks, {
      transaction: t.transaction,
    });

    const resignTasksAssignedIDS = createdTasks.map(
      (e) => e.resignTaskAssignID,
    );

    // =========================================================
    // Fetch Assigned Tasks
    // =========================================================

    const new_resign_task = await ResignTaskAssign.findAll({
      raw: true,
      where: {
        resignTaskAssignID: resignTasksAssignedIDS,
        status: 0,
      },
      include: [
        {
          model: UserResignation,
          required: true,
        },
      ],
      ...t,
    });

    // =========================================================
    // Create Inbox Notifications
    // =========================================================

    const inboxresignTasks = new_resign_task.map((task) => ({
      activityTable: ResignTaskAssign.getTableName(),
      activityTablePK: task.resignTaskAssignID,
      message: `New Resignation task Assigned to you`,
      assignedTo: task.userMasterID,
      assignedBy: task['resignation.userMasterID'],
    }));

    await UserInbox.bulkCreate(inboxresignTasks, {
      transaction: t.transaction,
    });

    return {
      success: true,
      resignProcessID: resign_process.resignProcessID,
      assignedTasks: resignTasks.length,
    };
  } catch (error) {
    throw error;
  }
}

exports.postAddUserResignation = async (req, res, next) => {
  try {
    let {
      userMasterID,
      employeeComment,
      appliedDate,
      lastworkingdate,
      preferredLWDate,
      noticeperiod,
      resigantionReasonID,
    } = req.body;
    const iosTokens = [];
    const androidTokens = [];
    let userData;
    if(req.userDetails.isMyUserDetails){
      userMasterID=req.userDetails.userMasterId;
    }

    const already_applied = await UserResignation.findOne({
      where: {
        userMasterID,
        authorizationstatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PENDING_ZERO,
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
            AuthorizationStatusType.APPROVED,
          ],
        },
        status: 1,
      },
    });

    if (already_applied)
      return res.status(200).json({
        status: 401,
        message: 'You have already applied for Resignation',
        data: {},
      });

    const authorizationmaster = await AuthorizationMaster.findOne({
      where: { authorizationMasterName: 'Resignation' },
    });

    if (!authorizationmaster)
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Authorization Master'),
      });

    const authorizationdetails = await AuthorizationDetails.findOne({
      attributes: [
        'AuthorizationMasterID',
        'AuthorizationCriteriaID',
        'AuthorizedByUserMasterId',
      ],
      where: {
        AuthorizationMasterID: authorizationmaster.authorizationMasterID,
        userMasterID,
        status: 1,
      },
      raw: true,
    });

    const attachment = req.file ? req.file.filename : '';

    if (!authorizationdetails) {
      await UserResignation.create({
        userMasterID,
        employeeComment,
        appliedDate,
        lastworkingdate,
        preferredLWDate,
        attachment,
        noticeperiod,
        authorizationstatus: 0,
        relievingDate: preferredLWDate,
        resigantionReasonID,
        createBy: req.userDetails.userMasterId,
        createByIp: req.userDetails.userIpAddress,
      });
      return res.status(200).json({
        status: 200,
        message: message.usermessage.addMessage('Resignation'),
      });
    }

    const AuthorizationCriterias = await AuthorizationCriteria.findOne({
      attributes: ['AuthorizationCriteriaID', 'AuthorizationCriteria'],
      where: {
        AuthorizationCriteriaID: authorizationdetails.AuthorizationCriteriaID,
        status: 1,
      },
      raw: true,
    });

    await sequelize.transaction(async (t) => {
      const insert_db_status = await UserResignation.create(
        {
          userMasterID,
          employeeComment,
          appliedDate,
          lastworkingdate,
          preferredLWDate,
          attachment,
          noticeperiod,
          authorizationstatus: 1,
          relievingDate: preferredLWDate,
          resigantionReasonID,
          createBy: req.userDetails.userMasterId,
          createByIp: req.userDetails.userIpAddress,
        },
        { transaction: t },
      );

      const resignationAuthorizationObject = [];
      const authorizePersonsIDs = [];
      for (const userId of authorizationdetails.AuthorizedByUserMasterId) {
        resignationAuthorizationObject.push({
          ReferenceID: insert_db_status.resignationID,
          userMasterID: userId,
          status: 1,
          authstatus: AuthStatusInAuthorizationRequest.PENDING,
          createBy: req.userDetails.userMasterId,
          createByIp: req.userDetails.userIpAddress,
        });

        authorizePersonsIDs.push(userId);
        if (
          AuthorizationCriterias.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          break;
        }
      }

      const resignationAuthorizationCreateData =
        await ResignationAuthorization.bulkCreate(
          resignationAuthorizationObject,
          {
            transaction: t,
          },
        );

      const authorizeUserData = await userMasterService.getMultipleUserData(
        ['userMasterID', 'displayName', 'firebaseToken', 'deviceType'],
        { userMasterID: { [Op.in]: [...authorizePersonsIDs, userMasterID] } },
      );

      authorizeUserData.forEach((user) => {
        if (authorizePersonsIDs.includes(user.userMasterID)) {
          if (user.deviceType === 'ios' && user.firebaseToken) {
            iosTokens.push(user.firebaseToken);
          } else if (user.deviceType === 'android' && user.firebaseToken) {
            androidTokens.push(user.firebaseToken);
          }
        }
        if (userMasterID == user.userMasterID) {
          userData = user;
        }
      });

      payload = {
        notification: {
          title: notificationTitleTypes.RESIGANTION,
          body: `${userData.displayName} applied for Resignation`,
        },
        data: {
          screen: notificationScreentTypes.RESIGANTION,
        },
      };

      //authorization inbox create
      let userInboxArray = [];
      resignationAuthorizationCreateData.forEach((item) => {
        userInboxArray.push({
          activityTable: ResignationAuthorization.getTableName(),
          activityTablePK: item.AuthorizationRequestId,
          message: `${userData.displayName} has applied Resignation.`,
          assignedTo: item.userMasterID,
          assignedBy: userMasterID,
        });
      });

      await UserInbox.bulkCreate(userInboxArray, { transaction: t });
    });

    if (iosTokens.length > 0) {
      sendBulkNotification(iosTokens, payload, 'ios');
    }

    if (androidTokens.length > 0) {
      sendBulkNotification(androidTokens, payload, 'android');
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Resignation'),
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUserResignation = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      employeeComment,
      appliedDate,
      lastworkingdate,
      preferredLWDate,
      noticeperiod,
      resigantionReasonID,
    } = req.body;
    const iosTokens = [];
    const androidTokens = [];
    let userData;

    const userResignation = await UserResignation.findByPk(id);

    if (!userResignation) {
      await transaction.commit();

      return res.status(404).json({
        status: 404,
        message: message.usermessage.notFoundMessage('User Resignation'),
      });
    }

    const attachment = req.file ? req.file.filename : '';
    if (employeeComment) userResignation.employeeComment = employeeComment;
    if (appliedDate) userResignation.appliedDate = appliedDate;
    if (lastworkingdate) userResignation.lastworkingdate = lastworkingdate;
    if (preferredLWDate) userResignation.preferredLWDate = preferredLWDate;
    if (noticeperiod) userResignation.noticeperiod = noticeperiod;
    if (attachment) userResignation.attachment = attachment;
    if (resigantionReasonID)
      userResignation.resigantionReasonID = resigantionReasonID;
    await userResignation.save({ transaction });

    const resignationAuthorizationIDS = await ResignationAuthorization.findAll({
      attributes: ['AuthorizationRequestId'],
      where: { ReferenceID: id },
      raw: true,
    }).then((rows) => rows.map((r) => r.AuthorizationRequestId));

    await UserInbox.destroy({
      where: {
        activityTable: ResignationAuthorization.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: resignationAuthorizationIDS,
        },
      },
      transaction,
    });

    await ResignationAuthorization.destroy({
      where: {
        AuthorizationRequestId: {
          [Sequelize.Op.in]: resignationAuthorizationIDS,
        },
      },
      transaction,
    });

    const authorizationmaster = await AuthorizationMaster.findOne({
      where: { authorizationMasterName: 'Resignation' },
    });

    if (authorizationmaster) {
      const authorizationdetails = await AuthorizationDetails.findOne({
        attributes: [
          'AuthorizationMasterID',
          'AuthorizationCriteriaID',
          'AuthorizedByUserMasterId',
        ],
        where: {
          AuthorizationMasterID: authorizationmaster.authorizationMasterID,
          userMasterID: userResignation.userMasterID,
          status: 1,
        },
        raw: true,
      });

      if (authorizationdetails) {
        const AuthorizationCriterias = await AuthorizationCriteria.findOne({
          attributes: ['AuthorizationCriteriaID', 'AuthorizationCriteria'],
          where: {
            AuthorizationCriteriaID:
              authorizationdetails.AuthorizationCriteriaID,
            status: 1,
          },
          raw: true,
        });

        const resignationAuthorizationObject = [];
        const authorizePersonsIDs = [];
        for (const userId of authorizationdetails.AuthorizedByUserMasterId) {
          resignationAuthorizationObject.push({
            ReferenceID: id,
            userMasterID: userId,
            status: 1,
            authstatus: AuthStatusInAuthorizationRequest.PENDING,
            createBy: req.userDetails.userMasterId,
            createByIp: req.userDetails.userIpAddress,
          });

          authorizePersonsIDs.push(userId);
          if (
            AuthorizationCriterias.AuthorizationCriteriaID ==
            authorizationCriteriaType.SEQUENCENO
          ) {
            break;
          }
        }

        const resignationAuthorizationCreateData =
          await ResignationAuthorization.bulkCreate(
            resignationAuthorizationObject,
            { transaction },
          );

        const authorizeUserData = await userMasterService.getMultipleUserData(
          ['userMasterID', 'displayName', 'firebaseToken', 'deviceType'],
          {
            userMasterID: {
              [Op.in]: [...authorizePersonsIDs, userResignation.userMasterID],
            },
          },
        );

        authorizeUserData.forEach((user) => {
          if (authorizePersonsIDs.includes(user.userMasterID)) {
            if (user.deviceType === 'ios' && user.firebaseToken) {
              iosTokens.push(user.firebaseToken);
            } else if (user.deviceType === 'android' && user.firebaseToken) {
              androidTokens.push(user.firebaseToken);
            }
          }
          if (userResignation.userMasterID == user.userMasterID) {
            userData = user;
          }
        });

        payload = {
          notification: {
            title: notificationTitleTypes.RESIGANTION,
            body: `${userData.displayName} applied for Resignation`,
          },
          data: {
            screen: notificationScreentTypes.RESIGANTION,
          },
        };

        //authorization inbox create
        let userInboxArray = [];
        resignationAuthorizationCreateData.forEach((item) => {
          userInboxArray.push({
            activityTable: ResignationAuthorization.getTableName(),
            activityTablePK: item.AuthorizationRequestId,
            message: `${userData.displayName} has applied Resignation.`,
            assignedTo: item.userMasterID,
            assignedBy: userResignation.userMasterID,
          });
        });

        await UserInbox.bulkCreate(userInboxArray, { transaction });
      }
    }

    await transaction.commit();

    if (iosTokens.length > 0) {
      sendBulkNotification(iosTokens, payload, 'ios');
    }

    if (androidTokens.length > 0) {
      sendBulkNotification(androidTokens, payload, 'android');
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('User Resignation'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.updateRelievingDate = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { relievingDate } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    if (!relievingDate) {
      await transaction.commit();
      return res.status(404).json({
        status: 404,
        message: 'RelievingDate date is required field!',
      });
    }

    const userResignation = await UserResignation.findByPk(id);

    if (!userResignation) {
      await transaction.commit();
      return res.status(404).json({
        status: 404,
        message: message.usermessage.notFoundMessage('User Resignation'),
      });
    }

    if (userResignation.authorizationstatus == 3) {
      // update joining details
      await createEmployeeJoiningDetailHistory(
        userResignation.userMasterID,
        transaction,
      );
      await EmployeeJoiningDetails.update(
        {
          leavingDate: relievingDate,
          updateBy,
          updateByIp,
        },
        {
          where: {
            userMasterID: userResignation.userMasterID,
          },
          transaction,
        },
      );
    }

    if (relievingDate) userResignation.relievingDate = relievingDate;

    await userResignation.save({ transaction });
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('User Resignation'),
      data: userResignation,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getAllResignationbyAuth = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      user,
      startdate,
      enddate,
      authorizationstatus = null,
      companyMasterID,
    } = req.body;
    const authUserMasterID = req.userDetails.userMasterId;

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const condition = {
      status: 1,
      userMasterID: authUserMasterID,
    };

    if (!user || user.length === 0) {
      condition.authstatus = [2];
      condition['$resignation.authorizationstatus$'] = {
        [Sequelize.Op.notIn]: [3, 4, 5],
      };
    }
    if (authorizationstatus !== null && authorizationstatus !== undefined) {
      if (authorizationstatus == '2') {
        condition['$resignation.authorizationstatus$'] = {
          [Sequelize.Op.notIn]: [3, 4, 5],
        };
      }
      condition.authstatus = authorizationstatus;
    } else {
      condition.authstatus = [2];
      condition['$resignation.authorizationstatus$'] = {
        [Sequelize.Op.notIn]: [3, 4, 5],
      };
    }

    if (user && user.length > 0) {
      condition['$resignation.userMasterID$'] = {
        [Sequelize.Op.in]: user,
      };
    }

    if (startdate && enddate) {
      condition['$resignation.appliedDate$'] = {
        [Sequelize.Op.between]: [startdate, enddate],
      };
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const userCondition = { status: 1 };
    if (companyMasterID) {
      userCondition.companyMasterId = companyMasterID;
    }
    const resignation_data = await ResignationAuthorization.findAndCountAll({
      distinct: true,
      order: [['createdAt', 'DESC']],
      ...paginationQuery,
      where: condition,
      include: [
        {
          model: UserMaster,
          attributes: ['displayName'],
        },
        {
          required: true,
          model: UserResignation,
          include: [
            {
              model: ResigantionReason,
              attributes: ['resigantionReasonID', 'reason'],
            },
            {
              model: UserMaster,
              as: 'employee',
              where: userCondition,
              include: [
                {
                  model: EmployeeJoiningDetails,
                  attributes: ['employeeCode'],
                },

                {
                  model: EmployeeDesignation,
                  as: 'emp_desig',
                  where: {
                    status: 1,
                    applicableDate: { [Sequelize.Op.lte]: currentDate },
                    [Sequelize.Op.or]: [
                      { endDate: { [Sequelize.Op.gte]: currentDate } },
                      { endDate: { [Sequelize.Op.eq]: null } },
                    ],
                  },
                  required: false,
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
                  as: 'emp_dept',
                  where: {
                    status: 1,
                    applicableDate: { [Sequelize.Op.lte]: currentDate },
                    [Sequelize.Op.or]: [
                      { endDate: { [Sequelize.Op.gte]: currentDate } },
                      { endDate: { [Sequelize.Op.eq]: null } },
                    ],
                  },
                  required: false,
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
                  as: 'emp_branch',
                  where: {
                    status: 1,
                    applicableDate: { [Sequelize.Op.lte]: currentDate },
                    [Sequelize.Op.or]: [
                      { endDate: { [Sequelize.Op.gte]: currentDate } },
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
        },
      ],
    });

    // for (let i = 0; i < resignation_data.rows.length; i++) {
    //   const user_resignation = await UserResignation.findOne({
    //     raw: true,
    //     where: {
    //       resignationID: resignation_data.rows[i].ReferenceID,
    //     },
    //   });

    //   if (user_resignation.authorizationstatus == 3) {
    //     resignation_data.rows[i].show = 'accepted';
    //   } else if (user_resignation.authorizationstatus == 4) {
    //     resignation_data.rows[i].show = 'rejected';
    //   } else {
    //     resignation_data.rows[i].show = 'yes';
    //   }
    // }

    return res.status(200).json({
      status: 200,
      data: resignation_data.rows,
      totalcount: resignation_data.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.postRejectResignation = async (req, res, next) => {
  try {
    const { AuthorizationRequestId } = await req.body;

    await sequelize.transaction(async (t) => {
      const auth_resignation = await ResignationAuthorization.findOne({
        raw: true,
        where: { AuthorizationRequestId },
        transaction: t,
      });

      await ResignationAuthorization.update(
        { authstatus: 0 },
        { where: { AuthorizationRequestId } },
        { transaction: t },
      );

      await UserResignation.update(
        { authorizationstatus: 4 },
        { where: { resignationID: auth_resignation.ReferenceID } },
        { transaction: t },
      );
    });

    return res.status(200).json({
      status: 200,
      message: 'Resignation Rejected Successfully',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

exports.postAcceptResignation = async (req, res, next) => {
  try {
    const { AuthorizationRequestId } = await req.body;

    const auth_resignation = await ResignationAuthorization.findOne({
      raw: true,
      where: { AuthorizationRequestId },
    });
    const user_resignation = await UserResignation.findOne({
      raw: true,
      where: { resignationID: auth_resignation.ReferenceID },
    });

    const authorizationmaster = await AuthorizationMaster.findOne({
      where: { authorizationMasterName: 'Resignation' },
    });
    if (!authorizationmaster)
      return res
        .status(200)
        .json({ status: 401, message: 'Authorization master not found!' });

    const authorizationdetails = await AuthorizationDetails.findOne({
      where: {
        AuthorizationMasterID: authorizationmaster.authorizationMasterID,
        userMasterID: user_resignation.userMasterID,
        status: 1,
      },
      raw: true,
    });
    if (!authorizationdetails)
      return res
        .status(200)
        .json({ status: 401, message: 'Authorization Details not found!' });

    const AuthorizationCriterias = await AuthorizationCriteria.findOne({
      where: {
        AuthorizationCriteriaID: authorizationdetails.AuthorizationCriteriaID,
        status: 1,
      },
      raw: true,
    });

    if (AuthorizationCriterias.AuthorizationCriteria == 'Sequeance No') {
      await ResignationAuthorization.update(
        { authstatus: 1 },
        { where: { AuthorizationRequestId } },
      );

      for (
        let i = 0;
        i < authorizationdetails.AuthorizedByUserMasterId.length;
        i++
      ) {
        if (
          authorizationdetails.AuthorizedByUserMasterId[i] ==
          auth_resignation.userMasterID
        ) {
          if (i + 1 == authorizationdetails.AuthorizedByUserMasterId.length) {
            await UserResignation.update(
              { authorizationstatus: 3 },
              { where: { resignationID: auth_resignation.ReferenceID } },
            );
            await resign_Task_Assign(user_resignation.userMasterID);
          } else {
            await ResignationAuthorization.create({
              ReferenceID: auth_resignation.ReferenceID,
              userMasterID:
                authorizationdetails.AuthorizedByUserMasterId[i + 1],
              status: 1,
              authstatus: 2,
              createBy: auth_resignation.createBy,
              createByIp: auth_resignation.createByIp,
            });
          }
        }
      }
    } else if (AuthorizationCriterias.AuthorizationCriteria == 'Any One') {
      await ResignationAuthorization.update(
        { authstatus: 1 },
        { where: { AuthorizationRequestId } },
      );
      await UserResignation.update(
        { authorizationstatus: 3 },
        { where: { resignationID: auth_resignation.ReferenceID } },
      );
      await resign_Task_Assign(user_resignation.userMasterID);
    } else if (AuthorizationCriterias.AuthorizationCriteria == 'Any Two') {
      const auth_resignation1 = await ResignationAuthorization.findOne({
        raw: true,
        where: { ReferenceID: auth_resignation.ReferenceID, authstatus: 1 },
      });

      if (auth_resignation1) {
        await UserResignation.update(
          { authorizationstatus: 3 },
          { where: { resignationID: auth_resignation.ReferenceID } },
        );
        await resign_Task_Assign(user_resignation.userMasterID);
      }

      await ResignationAuthorization.update(
        { authstatus: 1 },
        { where: { AuthorizationRequestId } },
      );
    } else if (AuthorizationCriterias.AuthorizationCriteria == 'Any Three') {
      const auth_resignation1 = await ResignationAuthorization.findAll({
        raw: true,
        where: { ReferenceID: auth_resignation.ReferenceID, authstatus: 1 },
      });

      if (auth_resignation1.length > 1) {
        await UserResignation.update(
          { authorizationstatus: 3 },
          { where: { resignationID: auth_resignation.ReferenceID } },
        );
        await resign_Task_Assign(user_resignation.userMasterID);
      }

      await ResignationAuthorization.update(
        { authstatus: 1 },
        { where: { AuthorizationRequestId } },
      );
    }

    return res.status(200).json({
      status: 200,
      message: 'Resignation Accepted Successfully',
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

exports.getResignationByUserId = async (req, res, next) => {
  try {
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const alreadyApplied = await UserResignation.findAll({
      where: {
        userMasterID: req.params.id,
        status: 1,
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: ResigantionReason,
          attributes: ['resigantionReasonID', 'reason'],
        },
        {
          model: UserMaster,
          as: 'employee',
          attributes: ['userMasterID', 'displayName', 'userNumber'],
          required: true,
          where: {
            ...userAccessCondition.where,
          },
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
          ],
        },
        {
          model: ResignationAuthorization,
          attributes: [
            'AuthorizationRequestId',
            'status',
            'authstatus',
            'remarks',
          ],
        },
      ],
    });

    const finaldata = [];
    if (+alreadyApplied.length === 0) {
      return res.status(200).json({ status: 200, data: [] });
    }

    for (let i = 0; i < alreadyApplied.length; i++) {
      const canDelete = await ResignationAuthorization.findOne({
        where: {
          ReferenceID: alreadyApplied[i].resignationID,
          status: 1,
          authstatus: [1, 0],
        },
      });
      const hasTask = await ResignTaskAssign.findAll({
        where: {
          resignationID: alreadyApplied[i].resignationID,
        },
      });

      if (canDelete) {
        alreadyApplied[i].status = false;
      } else {
        alreadyApplied[i].status = true;
      }
      if (hasTask.length > 0) {
        alreadyApplied[i].setDataValue('hasResignTask', true);
      } else {
        alreadyApplied[i].setDataValue('hasResignTask', false);
      }
      finaldata.push(alreadyApplied[i]);
    }

    return res.status(200).json({ status: 200, data: finaldata });
  } catch (err) {
    next(err);
  }
};

exports.getAuthorizationRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const date = asiaKolkataDateTime(new Date()).slice(0, 10);
    const authorizationRequest = await UserResignation.findOne({
      where: { resignationID: id },
      include: [
        {
          model: ResigantionReason,
          attributes: ['resigantionReasonID', 'reason'],
        },
        {
          model: UserMaster,
          as: 'authorizer',
        },
        {
          model: UserMaster,
          as: 'employee',
          attributes: ['displayName', 'userNumber', 'userMasterID'],
          include: [
            {
              model: companyMaster,
              attributes: ['companyName'],
            },
            {
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(date) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(date) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              attributes: ['designationID', 'applicableDate'],
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
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(date) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(date) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              attributes: ['departmentID', 'applicableDate'],
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
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(date) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(date) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
              attributes: ['branchID', 'applicableDate'],
              include: [
                {
                  model: BranchMaster,
                  as: 'branchMaster',
                  attributes: ['branchName'],
                },
              ],
            },
            {
              required: true,
              model: EmployeeJoiningDetails,
              as: 'employeeJoiningDetails',
              attributes: ['employeeCode'],
            },
            {
              required: false,
              model: AuthorizationDetails,
              as: 'authorizationDetails',
              where: {
                status: 1,
                AuthorizationMasterID: authorizationMasterTypes.resignation,
              },
              attributes: ['AuthorizationCriteriaID'],
              include: [
                {
                  model: AuthorizationCriteria,
                  as: 'AuthorizationCriteriaMaster',
                  attributes: ['AuthorizationCriteria'],
                },
              ],
            },
          ],
        },
      ],
    });

    const companyName =
      authorizationRequest.employee.companyMaster &&
      authorizationRequest.employee.companyMaster.companyName
        ? authorizationRequest.employee.companyMaster.companyName
        : '';

    const designationName =
      authorizationRequest.employee.employeeDesignations.length > 0
        ? authorizationRequest.employee.employeeDesignations[0].designation
            .designationName
        : '';

    const departmentName =
      authorizationRequest.employee.employeeDepartments.length > 0
        ? authorizationRequest.employee.employeeDepartments[0].department
            .departmentName
        : '';

    const branchName =
      authorizationRequest.employee.employeeBranches.length > 0
        ? authorizationRequest.employee.employeeBranches[0].branchMaster
            .branchName
        : '';

    const employeeCode =
      authorizationRequest.employee.employeeJoiningDetails.length > 0
        ? authorizationRequest.employee.employeeJoiningDetails[0].employeeCode
        : '';

    const authorizer = authorizationRequest?.authorizer?.displayName;

    const {
      resignationID,
      employeeComment,
      appliedDate,
      lastworkingdate,
      preferredLWDate,
      noticeperiod,
      attachment,
      relievingDate,
      authorizationstatus,
      userMasterId,
      employee,
      resigantionReason,
      isAuthorizedBy,
      authorizerRemark,
      authorizerSuggestedRelievingDate,
      createdAt,
    } = authorizationRequest;

    const { displayName, authorizationDetails } = employee;
    const resigantionReasonID = resigantionReason
      ? resigantionReason.resigantionReasonID
      : '';
    const reason = resigantionReason ? resigantionReason.reason : '';
    const authCriteriaID =
      authorizationDetails && authorizationDetails.length > 0
        ? authorizationDetails[0].AuthorizationCriteriaID
        : null;

    const authCriteria = await AuthorizationCriteria.findOne({
      where: { AuthorizationCriteriaID: authCriteriaID },
      attributes: ['AuthorizationCriteria'],
    });

    const authUserStatuses = await ResignationAuthorization.findAll({
      where: { ReferenceID: id },
    });

    const userMasterIDs = authUserStatuses.map((item) => item.userMasterID);

    const users = await UserMaster.findAll({
      where: { userMasterID: userMasterIDs },
      attributes: ['userMasterID', 'displayName'],
    });

    const userMap = new Map(
      users.map((user) => [user.userMasterID.toString(), user.displayName]),
    );

    const authUserStatusData = authUserStatuses.map((status) => ({
      userMasterID: status.userMasterID,
      displayName: userMap.get(status.userMasterID) || null,
      authstatus: status.authstatus,
      remarks: status.remarks,
      updatedAt: status.updatedAt,
      suggestedRelievingDate: status.suggestedRelievingDate,
    }));

    const responseData = {
      resignationID,
      employeeComment,
      appliedDate,
      lastworkingdate,
      preferredLWDate,
      noticeperiod,
      attachment,
      relievingDate,
      userMasterId,
      authorizationstatus,
      displayName,
      designationName,
      departmentName,
      branchName,
      companyName,
      employeeCode,
      AuthorizationCriteria: authCriteria
        ? authCriteria.AuthorizationCriteria
        : '',
      authUserStatus: authUserStatusData.length > 0 ? authUserStatusData : [],
      resigantionReasonID,
      reason,
      authorizer,
      isAuthorizedBy,
      authorizerSuggestedRelievingDate,
      authorizerRemark,
      createdAt,
    };

    return res.status(200).json({ status: 200, data: responseData });
  } catch (error) {
    next(error);
  }
};

exports.postCancelResignationById = async (req, res, next) => {
  try {
    const { resignationID, authorizationstatus } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const resignation = await UserResignation.findOne({
      where: {
        resignationID,
      },
    });

    if (!resignation)
      return res.status(200).json({
        status: 401,
        message: 'Resignation not found!',
      });

    await sequelize.transaction(async (t) => {
      await UserResignation.update(
        { authorizationstatus },
        {
          where: { resignationID },
          transaction: t,
        },
      );
      await createEmployeeJoiningDetailHistory(resignation.userMasterID, t);
      // update joining details
      await EmployeeJoiningDetails.update(
        {
          leavingDate: null,
          updateBy,
          updateByIp,
        },
        {
          where: {
            userMasterID: resignation.userMasterID,
          },
          transaction: t,
        },
      );

      const getAssignedTask = await ResignTaskAssign.findAll({
        where: { resignationID },
      });
      const resignTasksAssignedIDS = getAssignedTask.map(
        (e) => e.resignTaskAssignID,
      );
      await UserInbox.destroy(
        {
          where: {
            activityTable: ResignTaskAssign.getTableName(),
            activityTablePK: resignTasksAssignedIDS,
          },
        },
        { transaction: t },
      );
      await ResignTaskAssign.update(
        { status: 2 },
        {
          where: { resignationID, status: 0 },
          transaction: t,
        },
      );
      await ResignTaskAssign.update(
        { status: 3 },
        {
          where: { resignationID, status: 1 },
          transaction: t,
        },
      );
    });

    return res.status(200).json({
      status: 200,
      message: 'Resignation cancel successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.getResignationTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await ResignTaskAssign.findAll({
      where: { resignationID: id },
      include: [
        {
          model: UserMaster,
          attributes: ['userMasterID', 'displayName', 'userNumber'],
        },
        { model: ResignationTask },
        {
          model: UserResignation,
          include: {
            model: UserMaster,
            as: 'employee',
            attributes: ['userMasterID', 'displayName', 'userNumber'],
          },
        },
      ],
    });

    // if (!task.length) {
    //   return res
    //     .status(200)
    //     .json({ status: 404, message: 'ResignationTask not found', data: [] });
    // }

    return res.status(200).json({ status: 200, data: task });
  } catch (error) {
    next(error);
  }
};

exports.resignationAuthorizeduser = async (req, res, next) => {
  try {
    const { companyMasterID, branchMasterID, authPersonid } = req.body;

    const userDetails = req.userDetails || {};
    let userdata;

    if (!userDetails.accessibleBranches) {
      userDetails.accessibleBranches = [];
    }

    if (!userDetails.accessibleCompanies) {
      userDetails.accessibleCompanies = [];
    }

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    if (branchMasterID === '') {
      const AuthPerson = await AuthorizationDetails.findAll({
        where: {
          AuthorizedByUserMasterId: { [Sequelize.Op.contains]: [authPersonid] },
          AuthorizationMasterID: authorizationMasterTypes.resignation,
          status: 1,
          companyMasterID,
        },
        include: {
          model: UserMaster,
          required: true,
          where: {
            ...userAccessCondition.where,
          },
          include: [...userAccessCondition.includeModels],
        },
      });

      const userid = AuthPerson.map((person) => person.userMasterID);

      userdata = await UserMaster.findAll({
        where: {
          userMasterID: { [Sequelize.Op.in]: userid },
          status: 1,
        },
        attributes: [
          ['userMasterID', 'userMasterID'],
          ['displayName', 'userName'],
          ['userNumber', 'Number'],
        ],
      });
    } else {
      const branchContact = await EmployeeBranch.findAll({
        raw: true,
        where: {
          status: 1,
          branchID: branchMasterID,
          applicableDate: { [Sequelize.Op.lte]: new Date() },
          [Sequelize.Op.or]: [
            { endDate: { [Sequelize.Op.eq]: null } },
            { endDate: { [Sequelize.Op.gte]: new Date() } },
          ],
        },
      });

      const branchuser = branchContact.map((contact) => contact.userMasterID);
      const AuthPerson = await AuthorizationDetails.findAll({
        where: {
          AuthorizedByUserMasterId: { [Sequelize.Op.contains]: [authPersonid] },
          AuthorizationMasterID: authorizationMasterTypes.resignation,
          status: 1,
          userMasterID: { [Sequelize.Op.in]: branchuser },
        },
        include: {
          model: UserMaster,
          required: true,
          where: {
            ...userAccessCondition.where,
          },
          include: [...userAccessCondition.includeModels],
        },
      });

      const userid = AuthPerson.map((person) => person.userMasterID);

      userdata = await UserMaster.findAll({
        where: {
          userMasterID: { [Sequelize.Op.in]: userid },
          status: 1,
        },
        attributes: [
          ['userMasterID', 'userMasterID'],
          ['displayName', 'userName'],
          ['userNumber', 'Number'],
        ],
      });
    }

    return res.status(200).json({
      status: 200,
      message: {},
      data: userdata,
    });
  } catch (err) {
    next(err);
  }
};

exports.resignationAuthorizationacceptreject = async (req, res, next) => {
  try {
    const {
      ResignationAuthorizationRequestId,
      remarks,
      authstatus,
      userMasterID,
      suggestedRelievingDate = null,
    } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    let isResignationAccepted = false;
    const authRequest = await ResignationAuthorization.findOne({
      where: { AuthorizationRequestId: ResignationAuthorizationRequestId },
      include: [{ required: true, model: UserResignation }],
    });
    if (!authRequest) {
      return res
        .status(200)
        .json({ status: 500, message: 'Authorization request not found' });
    }
    if (authRequest?.authstatus == 1 || authRequest?.authstatus == 0) {
      return res.status(200).json({
        status: 500,
        message:
          authRequest.authstatus == 1
            ? 'You already accepted the Resignation '
            : 'You already rejected the Resignation',
      });
    }
    if (
      authRequest?.resignation?.authorizationstatus == 3 ||
      authRequest?.resignation?.authorizationstatus == 4
    ) {
      return res.status(200).json({
        status: 500,
        message:
          authRequest?.resignation?.authorizationstatus == 3
            ? 'Resignation already accepted'
            : 'Resignation already rejected',
      });
    }
    const leavingDate = authRequest.resignation.relievingDate;

    const resignationID = authRequest.ReferenceID;

    const allAuthData = await ResignationAuthorization.findAll({
      where: { ReferenceID: resignationID },
      include: [{ model: UserResignation }],
    });

    const authorizationMaster = await AuthorizationMaster.findOne({
      where: { authorizationMasterID: 5 },
    });

    if (!authorizationMaster) {
      return res
        .status(200)
        .json({ status: 500, message: 'Authorization Master not found' });
    }

    const authorizationDetails = await AuthorizationDetails.findOne({
      where: {
        AuthorizationMasterID: authorizationMaster.authorizationMasterID,
        userMasterID: authRequest.resignation.userMasterID,
        status: 1,
      },
    });

    if (!authorizationDetails) {
      return res
        .status(200)
        .json({ status: 500, message: 'Authorization details not found' });
    }

    const authorizationCriteria = await AuthorizationCriteria.findOne({
      where: {
        AuthorizationCriteriaID: authorizationDetails.AuthorizationCriteriaID,
        status: 1,
      },
    });

    if (!authorizationCriteria) {
      return res
        .status(200)
        .json({ status: 500, message: 'Authorization criteria not found' });
    }

    const allAuthIds = allAuthData.map((e) => e.AuthorizationRequestId);

    await sequelize.transaction(async (t) => {
      if (authstatus == 0) {
        await UserInbox.destroy(
          {
            where: {
              activityTable: ResignationAuthorization.getTableName(),
              activityTablePK: allAuthIds,
            },
          },
          { transaction: t },
        );

        await UserResignation.update(
          {
            authorizationstatus: 4,
            authorizedBy: req.userDetails.userMasterId,
            authorizedAt: new Date(),
            authorizerRemark: remarks,
            authorizerSuggestedRelievingDate: suggestedRelievingDate || null,
          },
          { where: { resignationID: resignationID }, transaction: t },
        );
      } else {
        const userinfo = await UserMaster.findOne({
          where: {
            userMasterID: authRequest.resignation.userMasterID,
          },
        });

        const notification = {
          title: 'Resignation',
          body: userinfo.displayName + ' Applied for Resignation.',
        };
        const data = {
          screen: 'resignationAuthorization',
        };

        if (authorizationCriteria.AuthorizationCriteria === 'Sequeance No') {
          await UserInbox.destroy(
            {
              where: {
                activityTable: ResignationAuthorization.getTableName(),
                activityTablePK: allAuthIds,
              },
            },
            { transaction: t },
          );

          const authRequests = allAuthData.filter((e) => e.authstatus != 0);

          const approvedUserIds = authRequests.map((req) =>
            req.userMasterID.toString(),
          );
          const formAuthUsers =
            authorizationDetails.AuthorizedByUserMasterId.map((id) =>
              id.toString(),
            );

          const remainingUserIds = formAuthUsers.filter(
            (id) => !approvedUserIds.includes(id),
          );
          if (suggestedRelievingDate) {
            await UserResignation.update(
              {
                relievingDate: suggestedRelievingDate,
              },
              { where: { resignationID: resignationID } },
              { transaction: t },
            );
          }

          if (remainingUserIds.length > 0) {
            const resignAuth = await ResignationAuthorization.create(
              {
                status: 1,
                authstatus: 2,
                ReferenceID: resignationID,
                userMasterID: remainingUserIds[0],
              },
              { user: req.userDetails, transaction: t },
            );

            await UserInbox.create(
              {
                activityTable: ResignationAuthorization.getTableName(),
                activityTablePK: resignAuth.toJSON().AuthorizationRequestId,
                message: `${userinfo.displayName} has applied Resignation`,
                assignedTo: remainingUserIds[0],
                assignedBy: userinfo.userMasterID,
              },
              { transaction: t },
            );

            await sendNotification(remainingUserIds[0], notification, data);
          } else {
            await UserResignation.update(
              {
                authorizationstatus: 3,
                authorizedBy: req.userDetails.userMasterId,
                authorizedAt: new Date(),
                authorizerRemark: remarks,
                authorizerSuggestedRelievingDate: suggestedRelievingDate,
              },
              { where: { resignationID: resignationID } },
              { transaction: t },
            );
            isResignationAccepted = true;
            await createEmployeeJoiningDetailHistory(
              authRequest.resignation?.userMasterID,
              t,
            );
            // update joining details
            await EmployeeJoiningDetails.update(
              {
                leavingDate: suggestedRelievingDate
                  ? suggestedRelievingDate
                  : leavingDate,
                updateBy,
                updateByIp,
              },
              {
                where: {
                  userMasterID: authRequest.resignation.userMasterID,
                },
                transaction: t,
              },
            );

            await resign_Task_Assign(authRequest.resignation.userMasterID, {
              transaction: t,
            });
          }
        } else if (authorizationCriteria.AuthorizationCriteria === 'Any One') {
          await UserInbox.destroy(
            {
              where: {
                activityTable: ResignationAuthorization.getTableName(),
                activityTablePK: ResignationAuthorizationRequestId,
              },
            },
            { transaction: t },
          );

          const approvedRequests = allAuthData.filter((e) => e.authstatus == 1);
          if (suggestedRelievingDate) {
            await UserResignation.update(
              {
                relievingDate: suggestedRelievingDate,
              },
              { where: { resignationID: resignationID } },
              { transaction: t },
            );
          }
          if (approvedRequests.length + 1 >= 1) {
            await UserInbox.destroy(
              {
                where: {
                  activityTable: ResignationAuthorization.getTableName(),
                  activityTablePK: allAuthIds,
                },
              },
              { transaction: t },
            );
            await UserResignation.update(
              {
                authorizationstatus: 3,
                authorizedBy: req.userDetails.userMasterId,
                authorizedAt: new Date(),
                authorizerRemark: remarks,
                authorizerSuggestedRelievingDate: suggestedRelievingDate,
              },
              { where: { resignationID: resignationID }, transaction: t },
            );
            isResignationAccepted = true;
            await createEmployeeJoiningDetailHistory(
              authRequest.resignation?.userMasterID,
              t,
            );
            // update joining details
            await EmployeeJoiningDetails.update(
              {
                leavingDate: suggestedRelievingDate
                  ? suggestedRelievingDate
                  : leavingDate,
                updateBy,
                updateByIp,
              },
              {
                where: {
                  userMasterID: authRequest.resignation.userMasterID,
                },
                transaction: t,
              },
            );

            await resign_Task_Assign(authRequest.resignation.userMasterID, {
              transaction: t,
            });
          }
        } else if (authorizationCriteria.AuthorizationCriteria === 'Any Two') {
          await UserInbox.destroy(
            {
              where: {
                activityTable: ResignationAuthorization.getTableName(),
                activityTablePK: ResignationAuthorizationRequestId,
              },
            },
            { transaction: t },
          );

          if (suggestedRelievingDate) {
            await UserResignation.update(
              {
                relievingDate: suggestedRelievingDate,
              },
              { where: { resignationID: resignationID } },
              { transaction: t },
            );
          }

          const approvedRequests = allAuthData.filter((e) => e.authstatus == 1);
          if (approvedRequests.length + 1 >= 2) {
            await UserInbox.destroy(
              {
                where: {
                  activityTable: ResignationAuthorization.getTableName(),
                  activityTablePK: allAuthIds,
                },
              },
              { transaction: t },
            );
            await UserResignation.update(
              {
                authorizationstatus: 3,
                authorizedBy: req.userDetails.userMasterId,
                authorizedAt: new Date(),
                authorizerRemark: remarks,
                authorizerSuggestedRelievingDate: suggestedRelievingDate,
              },
              { where: { resignationID: resignationID }, transaction: t },
            );
            isResignationAccepted = true;
            await createEmployeeJoiningDetailHistory(
              authRequest.resignation?.userMasterID,
              t,
            );
            // update joining details
            await EmployeeJoiningDetails.update(
              {
                leavingDate: suggestedRelievingDate
                  ? suggestedRelievingDate
                  : leavingDate,
                updateBy,
                updateByIp,
              },
              {
                where: {
                  userMasterID: authRequest.resignation.userMasterID,
                },
                transaction: t,
              },
            );

            await resign_Task_Assign(authRequest.resignation.userMasterID, {
              transaction: t,
            });
          }
        } else {
          await UserInbox.destroy(
            {
              where: {
                activityTable: ResignationAuthorization.getTableName(),
                activityTablePK: ResignationAuthorizationRequestId,
              },
            },
            { transaction: t },
          );
          if (suggestedRelievingDate) {
            await UserResignation.update(
              {
                relievingDate: suggestedRelievingDate,
              },
              { where: { resignationID: resignationID } },
              { transaction: t },
            );
          }
          const approvedRequests = allAuthData.filter((e) => e.authstatus == 1);

          if (approvedRequests.length + 1 >= 3) {
            await UserInbox.destroy(
              {
                where: {
                  activityTable: ResignationAuthorization.getTableName(),
                  activityTablePK: allAuthIds,
                },
              },
              { transaction: t },
            );
            await UserResignation.update(
              {
                authorizationstatus: 3,
                authorizedBy: req.userDetails.userMasterId,
                authorizedAt: new Date(),
                authorizerRemark: remarks,
                authorizerSuggestedRelievingDate: suggestedRelievingDate,
              },
              { where: { resignationID: resignationID }, transaction: t },
            );
            isResignationAccepted = true;
            await createEmployeeJoiningDetailHistory(
              authRequest.resignation?.userMasterID,
              t,
            );
            // update joining details
            await EmployeeJoiningDetails.update(
              {
                leavingDate: suggestedRelievingDate
                  ? suggestedRelievingDate
                  : leavingDate,
                updateBy,
                updateByIp,
              },
              {
                where: {
                  userMasterID: authRequest.resignation.userMasterID,
                },
                transaction: t,
              },
            );

            await resign_Task_Assign(authRequest.resignation.userMasterID, {
              transaction: t,
            });
          }
        }
      }

      await ResignationAuthorization.update(
        {
          authstatus,
          remarks,
          updateBy: userMasterID,
          suggestedRelievingDate: suggestedRelievingDate || null,
        },
        {
          where: { AuthorizationRequestId: ResignationAuthorizationRequestId },
        },
      );
    });

    return res.status(200).json({
      status: 200,
      isResignationAccepted,
      message:
        authstatus === 1
          ? 'Resignation Authorization Request Accept Successfully'
          : 'Resignation Authorization Request Reject Successfully',
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllAdminAuthorizationAcceptReject = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      userMasterID,
      fromDate,
      toDate,
      page,
      limit,
      authorizationstatus,
    } = req.body;
    // authorizationstatus = { 1:Pending but Authorization Criteri any one, two, three,
    // 2:Pending but Authorization Criteria Sequence wise, 0:Pending but no Authorization Criteria,
    // 3:Approved, 4:Rejected, 5:Canceled }
    if (!companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Company'),
      });
    }

    const allowedKeys = [
      'companyMasterID',
      'userMasterID',
      'fromDate',
      'toDate',
      'page',
      'limit',
      'authorizationstatus',
    ];

    const invalidKeys = invalidKeyParams(
      { ...req.body, ...req.params },
      allowedKeys,
    );

    if (invalidKeys.length > 0) {
      return res.status(200).json({
        status: 400,
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const condition = {};

    if (userMasterID.length > 0) {
      condition.userMasterID = {
        [Sequelize.Op.in]: userMasterID,
      };
    }

    if (fromDate && toDate) {
      condition.appliedDate = {
        [Sequelize.Op.between]: [fromDate, toDate],
      };
    }

    if (userMasterID.length == 0) {
      condition.authorizationstatus = {
        [Sequelize.Op.in]: [0, 1, 2],
      };
    }

    if (authorizationstatus) {
      if (authorizationstatus == 1) {
        condition.authorizationstatus = [0, 1, 2];
      } else {
        condition.authorizationstatus = authorizationstatus;
      }
    } else {
      condition.authorizationstatus = [0, 1, 2];
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const getAllResignationRequests = await UserResignation.findAndCountAll({
      where: condition,
      distinct: true,
      ...paginationQuery,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: ResigantionReason,
          attributes: ['resigantionReasonID', 'reason'],
        },
        {
          as: 'employee',
          required: true,
          model: UserMaster,
          where: {
            companyMasterId: companyMasterID,
            status: 1,
            ...userAccessCondition.where,
          },
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              model: EmployeeDesignation,
              as: 'emp_desig',
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: currentDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: currentDate } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
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
              as: 'emp_dept',
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: currentDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: currentDate } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: false,
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
              as: 'emp_branch',
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: currentDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: currentDate } },
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
        {
          model: UserMaster,
          as: 'authorizer',
          attributes: ['displayName'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: getAllResignationRequests.rows,
      totalcount: getAllResignationRequests.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.approveRejectAdminAuthorization = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      resignationID,
      authorizationstatus,
      remarks,
      suggestedRelievingDate = null,
    } = req.body;

    if (!resignationID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Resignation request'),
      });
    }

    const allowedKeys = [
      'resignationID',
      'authorizationstatus',
      'remarks',
      'suggestedRelievingDate',
    ];

    const invalidKeys = invalidKeyParams(
      { ...req.body, ...req.params },
      allowedKeys,
    );

    if (invalidKeys.length > 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const data = await UserResignation.findOne({
      where: { resignationID: resignationID },
      attributes: ['authorizationstatus', 'relievingDate', 'userMasterID'],
    });

    if (data.authorizationstatus == 3 || data.authorizationstatus == 4) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message:
          data.authorizationstatus == 3
            ? 'Resignation Request Already Accepted.'
            : 'Resignation  Request Already Rejected.',
      });
    }

    const allAuthData = await ResignationAuthorization.findAll({
      where: { ReferenceID: resignationID },
      include: [{ model: UserResignation }],
    });

    const allAuthIds = allAuthData.map((e) => e.AuthorizationRequestId);

    await UserInbox.destroy(
      {
        where: {
          activityTable: ResignationAuthorization.getTableName(),
          activityTablePK: allAuthIds,
        },
      },
      { transaction: transaction },
    );

    await UserResignation.update(
      {
        authorizedBy: req.userDetails.userMasterId,
        authorizedAt: new Date(),
        isAuthorizedBy: true,
        authorizationstatus: authorizationstatus,
        authorizerRemark: remarks,
        authorizerSuggestedRelievingDate: suggestedRelievingDate || null,
        relievingDate: suggestedRelievingDate
          ? suggestedRelievingDate
          : data.relievingDate,
      },
      {
        where: { resignationID: resignationID },
        transaction: transaction,
      },
    );
    if (authorizationstatus == 3) {
      await createEmployeeJoiningDetailHistory(data?.userMasterID, transaction);
      // update joining details
      await EmployeeJoiningDetails.update(
        {
          leavingDate: suggestedRelievingDate
            ? suggestedRelievingDate
            : data.relievingDate,
          updateBy: req.userDetails.userMasterId,
          updateByIp: req.userDetails.userIpAddress,
        },
        {
          where: {
            userMasterID: data?.userMasterID,
          },
          transaction: transaction,
        },
      );
      const resignation = await UserResignation.findOne({
        where: {
          resignationID: resignationID,
        },
      });

      await resign_Task_Assign(resignation.userMasterID, {
        transaction: transaction,
      });
    }
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        authorizationstatus == 3
          ? 'Resignation Accepted Successfully'
          : 'Resignation Rejected Successfully',
      isResignationAccepted: authorizationstatus == 3 ? true : false,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

function invalidKeyParams(query, allowedKeys) {
  return Object.keys(query).filter((key) => !allowedKeys.includes(key));
}

exports.downloadResignationClearancePdf = async (req, res, next) => {
  try {
    const { id } = req.body;

    const taskData = await ResignTaskAssign.findAll({
      where: {
        resignationID: id,
      },
      include: [
        {
          model: UserMaster,
          attributes: ['userMasterID', 'displayName', 'userNumber'],
        },
        {
          model: ResignationTask,
        },
        {
          model: UserResignation,
          include: {
            model: UserMaster,
            as: 'employee',
            attributes: ['userMasterID', 'displayName', 'userNumber'],
          },
        },
      ],
    });

    const finalData = {
      assignedDate:
        taskData.length > 0
          ? moment(taskData[0].createdAt).format('DD-MM-YYYY hh:mm:ss A')
          : '',
      tasks: taskData.map((task) => ({
        displayName: task.userMaster?.displayName || '',

        userNumber: task.userMaster?.userNumber || '',

        description: task.resignTask?.description || '',

        isApplicable:
          task.isApplicable === null ? '' : task.isApplicable ? 'Yes' : 'No',

        isRecovered:
          task.isRecovered === null ? '' : task.isRecovered ? 'Yes' : 'No',

        amount: task.amount || 0,

        remarks: task.remarks || '',

        isPending: task.status === 0 || task.status === 2,

        isCompleted: task.status === 1 || task.status === 3,

        taskCompletedDate:
          task.updatedAt && (task.status === 1 || task.status === 3)
            ? moment(task.updatedAt).format('DD-MM-YYYY hh:mm:ss A')
            : '',
      })),
    };

    const htmlPath = path.join(__dirname, '../html/clearanceData.html');

    const htmlFile = fs.readFileSync(htmlPath, 'utf8');

    const template = Handlebars.compile(htmlFile);

    const htmlContent = template(finalData);

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox'],
    });

    const page = await browser.newPage();

    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    const pdfBase64Path = Buffer.from(pdfBuffer).toString('base64');

    return res.status(200).json({
      status: 200,
      message: 'Clearance PDF generated successfully',
      data: pdfBase64Path,
    });
  } catch (error) {
    next(error);
  }
};
