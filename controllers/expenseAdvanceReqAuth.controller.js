const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const ExpenseAdvanceRequest = require('../models/expenseAdvanceRequest');
const UserMaster = require('../models/userMaster');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const companyMaster = require('../models/companyMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const { userAttributes, authStatusTypeObj } = require('../utils/commonVars');
const {
  asiaKolkataDateTime,
  sendNotification_NEW,
} = require('../utils/commonUtilFunctions');
const ExpenseAdvanceReqAuth = require('../models/expenseAdvanceReqAuth');
const message = require('../response_message/message');
const {
  expenseAdvanceRequestAuthStatus,
  authorizationMasterTypes,
  authorizationCriteriaType,
  notificationScreentTypes,
  notificationTitleTypes,
} = require('../utils/dbUtils');
const UserInbox = require('../models/UserInbox');
const AuthorizationDetails = require('../models/AuthorizationDetails');

exports.getExpenseAdvanceReqAuthByAuthUserId = async (req, res, next) => {
  try {
    const { page, limit, userMasterID, authStatus } = req.body;
    const loggedInUserID = req.userDetails.userMasterId;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginateCondition =
      page && limit ? { offset: (page - 1) * limit, limit } : {};

    const expenseAdvanceReqCondition = {
      status: 1,
    };
    const expenseAdvanceReqAuthCondition = {
      userMasterID: loggedInUserID,
    };
    if (authStatus == undefined || authStatus == null) {
      expenseAdvanceReqCondition.authorizationStatus = {
        [Sequelize.Op.in]: [0, 1, 2],
      };
      expenseAdvanceReqAuthCondition.authStatus = 2;
    } else if (+authStatus == authStatusTypeObj.PENDING) {
      expenseAdvanceReqCondition.authorizationStatus = {
        [Sequelize.Op.in]: [0, 1, 2],
      };
      expenseAdvanceReqAuthCondition.authStatus = 2;
    } else if (+authStatus == authStatusTypeObj.APPROVED) {
      expenseAdvanceReqCondition.authorizationStatus = 3;
      expenseAdvanceReqAuthCondition.authStatus = 1;
    } else if (+authStatus == authStatusTypeObj.REJECTED) {
      expenseAdvanceReqCondition.authorizationStatus = 4;
      expenseAdvanceReqAuthCondition.authStatus = 0;
    }

    if (userMasterID && userMasterID.length) {
      expenseAdvanceReqCondition.userMasterID = {
        [Sequelize.Op.in]: userMasterID,
      };
    }

    const { rows: expenseAdvanceReqAuthData, count } =
      await ExpenseAdvanceReqAuth.findAndCountAll({
        distinct: true,
        where: expenseAdvanceReqAuthCondition,
        ...paginateCondition,
        order: [['createdAt', 'DESC']],
        include: [
          {
            required: true,
            model: ExpenseAdvanceRequest,
            as: 'ea_req',
            where: expenseAdvanceReqCondition,
            include: [
              {
                model: UserMaster,
                where: {
                  status: 1,
                },
                attributes: userAttributes,
                include: [
                  {
                    required: false,
                    model: EmployeeBranch,
                    separate: true,
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
                    required: false,
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
                    required: false,
                    separate: true,
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
                    separate: true,
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
                    model: companyMaster,
                    attributes: ['companyName'],
                  },
                  {
                    model: EmployeeJoiningDetails,
                    attributes: ['employeeCode'],
                  },
                ],
              },
            ],
          },
          {
            model: UserMaster,
            as: 'authPerson',
            attributes: ['userMasterID', 'displayName', 'userNumber'],
          },
        ],
      });

    return res.status(200).json({
      status: 200,
      data: expenseAdvanceReqAuthData,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.authorizeExpenseAdvanceRequest = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { AuthReqId, authRemarks, authStatus, authAmount } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const findAuthRequest = await ExpenseAdvanceReqAuth.findOne({
      where: { AuthReqId },
      transaction,
      include: [
        {
          required: true,
          model: ExpenseAdvanceRequest,
          as: 'ea_req',
          include: [
            {
              model: UserMaster,
              attributes: userAttributes,
            },
          ],
        },
      ],
    });
    if (!findAuthRequest) {
      throw new Error('Expense request not found');
    }
    if (
      findAuthRequest.authStatus != expenseAdvanceRequestAuthStatus.PENDING ||
      ![0, 1, 2].includes(findAuthRequest.ea_req?.authorizationStatus)
    ) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Expense Advance Request is Already Authorized',
      });
    }
    const [findAuthorizationDetails, findAllAuthRequest] = await Promise.all([
      AuthorizationDetails.findOne({
        where: {
          AuthorizationMasterID: authorizationMasterTypes.expense,
          userMasterID: findAuthRequest.ea_req?.userMasterID,
          status: 1,
        },
        transaction,
      }),
      ExpenseAdvanceReqAuth.findAll({
        where: {
          expenseAdvanceRequestID: findAuthRequest.expenseAdvanceRequestID,
        },
        transaction,
      }),
    ]);
    if (!findAuthorizationDetails) {
      throw new Error(
        message.usermessage.notFoundMessage('Authorization Details')
      );
    }

    const userData = findAuthRequest.ea_req?.userMaster;
    if (!userData) {
      throw new Error(message.usermessage.notFoundMessage('User'));
    }
    const allAuthIds = findAllAuthRequest.map((e) => +e.AuthReqId);
    const formAuthUsers = findAuthorizationDetails.AuthorizedByUserMasterId.map(
      (id) => id.toString()
    );
    const promiseArray = [];
    const createInboxPromise = [];
    const allApprovedAndPendingAuthRequests = findAllAuthRequest.filter(
      (e) => e.authStatus != 0
    );
    const approvedRequests = findAllAuthRequest.filter(
      (e) => +e.authStatus == 1
    );
    promiseArray.push(
      ExpenseAdvanceReqAuth.update(
        {
          remarks: authRemarks,
          authStatus,
          authAmount,
        },
        {
          where: {
            AuthReqId: findAuthRequest.AuthReqId,
          },
          transaction,
          user: req.userDetails,
          individualHooks: true,
        }
      )
    );
    if (authStatus == 0) {
      promiseArray.push(
        UserInbox.destroy({
          where: {
            activityTable: ExpenseAdvanceReqAuth.getTableName(),
            activityTablePK: allAuthIds,
          },
          transaction,
        })
      );
      promiseArray.push(
        ExpenseAdvanceRequest.update(
          {
            authorizationStatus: 4,
            authAmount,
            authorizedAt: new Date(),
            authRemarks,
            authorizedBy: updateBy,
          },
          {
            where: {
              expenseAdvanceRequestID: findAuthRequest.expenseAdvanceRequestID,
            },
            transaction,
          }
        )
      );
      const notification = {
        title: notificationTitleTypes.EXPENSEADVANCEREQUEST,
        body: message.usermessage.rejectMessage('Expense Advance Request'),
      };
      const data = {
        screen: notificationTitleTypes.EXPENSEADVANCEREQUEST,
      };
      sendNotification_NEW(
        userData.firebaseToken,
        userData.deviceType,
        notification,
        data
      );
    } else {
      if (
        +findAuthorizationDetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO
      ) {
        promiseArray.push(
          UserInbox.destroy({
            where: {
              activityTable: ExpenseAdvanceReqAuth.getTableName(),
              activityTablePK: allAuthIds,
            },
            transaction,
          })
        );
        const approvedAndPendingUserIds = allApprovedAndPendingAuthRequests.map(
          (e) => e.userMasterID.toString()
        );
        const remainingUserIds = formAuthUsers.filter(
          (id) => !approvedAndPendingUserIds.includes(id)
        );

        if (remainingUserIds.length) {
          const createExpenseReqAuth = await ExpenseAdvanceReqAuth.create(
            {
              expenseAdvanceRequestID: findAuthRequest.expenseAdvanceRequestID,
              userMasterID: remainingUserIds[0],
            },
            {
              user: req.userDetails,
              transaction,
            }
          );
          const inboxMessage = `${userData.displayName} has appiled for Expense Advance of ${findAuthRequest.ea_req?.amount}`;

          const createInboxObj = {
            activityTable: ExpenseAdvanceReqAuth.getTableName(),
            activityTablePK: createExpenseReqAuth.toJSON().AuthReqId,
            message: inboxMessage,
            assignedTo: remainingUserIds[0],
            assignedBy: userData.userMasterID,
          };
          createInboxPromise.push(createInboxObj);
          const notification = {
            title: notificationTitleTypes.EXPENSEADVANCEREQUEST,
            body: inboxMessage,
          };
          const data = {
            screen: notificationTitleTypes.EXPENSEADVANCEREQUEST,
          };
          sendNotification_NEW(
            userData.firebaseToken,
            userData.deviceType,
            notification,
            data
          );
        } else {
          promiseArray.push(
            ExpenseAdvanceRequest.update(
              {
                authorizationStatus: 3,
                authAmount,
                authorizedAt: new Date(),
                authRemarks,
                authorizedBy: updateBy,
              },
              {
                where: {
                  expenseAdvanceRequestID:
                    findAuthRequest.expenseAdvanceRequestID,
                },
                transaction,
              }
            )
          );
          const notification = {
            title: notificationTitleTypes.EXPENSEADVANCEREQUEST,
            body: message.usermessage.approveMessage('Expense Advance Request'),
          };
          const data = {
            screen: notificationTitleTypes.EXPENSEADVANCEREQUEST,
          };
          sendNotification_NEW(
            userData.firebaseToken,
            userData.deviceType,
            notification,
            data
          );
        }
      } else if (
        +findAuthorizationDetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.ANYONE
      ) {
        promiseArray.push(
          UserInbox.destroy({
            where: {
              activityTable: ExpenseAdvanceReqAuth.getTableName(),
              activityTablePK: allAuthIds,
            },
            transaction,
          })
        );
        promiseArray.push(
          ExpenseAdvanceRequest.update(
            {
              authorizationStatus: 3,
              authAmount,
              authorizedAt: new Date(),
              authRemarks,
              authorizedBy: updateBy,
            },
            {
              where: {
                expenseAdvanceRequestID:
                  findAuthRequest.expenseAdvanceRequestID,
              },
              transaction,
            }
          )
        );
        const notification = {
          title: notificationTitleTypes.EXPENSEADVANCEREQUEST,
          body: message.usermessage.approveMessage('Expense Advance Request'),
        };
        const data = {
          screen: notificationTitleTypes.EXPENSEADVANCEREQUEST,
        };
        sendNotification_NEW(
          userData.firebaseToken,
          userData.deviceType,
          notification,
          data
        );
      } else if (
        +findAuthorizationDetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.ANYTWO
      ) {
        if (approvedRequests.length + 1 >= 2) {
          promiseArray.push(
            UserInbox.destroy({
              where: {
                activityTable: ExpenseAdvanceReqAuth.getTableName(),
                activityTablePK: allAuthIds,
              },
              transaction,
            })
          );
          promiseArray.push(
            ExpenseAdvanceRequest.update(
              {
                authorizationStatus: 3,
                authAmount,
                authorizedAt: new Date(),
                authRemarks,
                authorizedBy: updateBy,
              },
              {
                where: {
                  expenseAdvanceRequestID:
                    findAuthRequest.expenseAdvanceRequestID,
                },
                transaction,
              }
            )
          );
          const notification = {
            title: notificationTitleTypes.EXPENSEADVANCEREQUEST,
            body: message.usermessage.approveMessage('Expense Advance Request'),
          };
          const data = {
            screen: notificationTitleTypes.EXPENSEADVANCEREQUEST,
          };
          sendNotification_NEW(
            userData.firebaseToken,
            userData.deviceType,
            notification,
            data
          );
        } else {
          promiseArray.push(
            UserInbox.destroy({
              where: {
                activityTable: ExpenseAdvanceReqAuth.getTableName(),
                activityTablePK: findAuthRequest.AuthReqId,
              },
              transaction,
            })
          );
        }
      } else {
        if (approvedRequests.length + 1 >= 3) {
          promiseArray.push(
            UserInbox.destroy({
              where: {
                activityTable: ExpenseAdvanceReqAuth.getTableName(),
                activityTablePK: allAuthIds,
              },
              transaction,
            })
          );
          promiseArray.push(
            ExpenseAdvanceRequest.update(
              {
                authorizationStatus: 3,
                authAmount,
                authorizedAt: new Date(),
                authRemarks,
                authorizedBy: updateBy,
              },
              {
                where: {
                  expenseAdvanceRequestID:
                    findAuthRequest.expenseAdvanceRequestID,
                },
                transaction,
              }
            )
          );
          const notification = {
            title: notificationTitleTypes.EXPENSEADVANCEREQUEST,
            body: message.usermessage.approveMessage('Expense Advance Request'),
          };
          const data = {
            screen: notificationTitleTypes.EXPENSEADVANCEREQUEST,
          };
          sendNotification_NEW(
            userData.firebaseToken,
            userData.deviceType,
            notification,
            data
          );
        } else {
          promiseArray.push(
            UserInbox.destroy({
              where: {
                activityTable: ExpenseAdvanceReqAuth.getTableName(),
                activityTablePK: findAuthRequest.AuthReqId,
              },
              transaction,
            })
          );
        }
      }
    }
    if (createInboxPromise.length > 0) {
      promiseArray.push(
        UserInbox.bulkCreate(createInboxPromise, {
          transaction,
        })
      );
    }
    await Promise.all(promiseArray);

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        authStatus == expenseAdvanceRequestAuthStatus.APPROVED
          ? message.usermessage.approveMessage('Expense Advance Request')
          : message.usermessage.rejectMessage('Expense Advance Request'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
