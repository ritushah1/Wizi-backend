const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const message = require('../response_message/message');
const ExpenseAdvanceRequest = require('../models/expenseAdvanceRequest');
const {
  expenseAdvanceRequestAuthStatus,
  txnTypeENUM,
  authorizationMasterTypes,
  authorizationCriteriaType,
  AuthorizationStatusType,
  expense_Payment_Types_Obj,
  paymentMode,
} = require('../utils/dbUtils');
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
const {
  userAttributes,
  erpStoredProcedures,
  expenseAdvanceRequestDateFilterType,
  statusCodes,
} = require('../utils/commonVars');
const ExpensePayment = require('../models/expensePayment');
const {
  sendNotification_NEW,
  asiaKolkataDateTime,
  parseEmployeeInfo,
  toWords,
  generateHTMLToPDF_base64Path,
} = require('../utils/commonUtilFunctions');
const UserInbox = require('../models/UserInbox');
const moment = require('moment');
const { generateExcel } = require('../utils/exportData');
const BankMaster = require('../models/bankMaster');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const ExpenseAdvanceReqAuth = require('../models/expenseAdvanceReqAuth');
const erpAcountMasters = require('../models/erpAccountMaster');
const { getErpDatabaseConfig } = require('../config/erpdatabase');
const sql = require('mssql');
const CompanyBankDetails = require('../models/companyBankDetails');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.addExpenseAdvanceRequest = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { description, amount } = req.body;
    const createBy = req.userDetails.userMasterId;
    const applierUserData = await UserMaster.findOne({
      where: {
        userMasterID: createBy,
        status: 1,
      },
      attributes: userAttributes,
    });
    if (!applierUserData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('User'),
      });
    }

    const authorizationdetails = await AuthorizationDetails.findOne(
      {
        where: {
          AuthorizationMasterID: authorizationMasterTypes.expense,
          userMasterID: applierUserData.userMasterID,
          status: 1,
        },
        include: [
          {
            model: AuthorizationCriteriaMaster,
            attributes: ['AuthorizationCriteria'],
          },
        ],
      },
      { transaction },
    );
    const authorizationStatus = authorizationdetails
      ? authorizationdetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO
        ? AuthorizationStatusType.PEDING_TWO
        : AuthorizationStatusType.PEDING_ONE
      : AuthorizationStatusType.PENDING_ZERO;

    const requestData = await ExpenseAdvanceRequest.create(
      {
        userMasterID: applierUserData.userMasterID,
        description,
        amount,
        authorizationStatus,
        AuthorizationCriteriaID:
          authorizationdetails && +authorizationdetails.AuthorizationCriteriaID
            ? +authorizationdetails.AuthorizationCriteriaID
            : null,
      },
      { user: req.userDetails, transaction },
    );
    if (authorizationdetails) {
      const inboxMessage = `${applierUserData.displayName} has appiled for Expense Advance of ${amount}`;
      const createUserInboxArray = [];
      if (
        authorizationdetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO
      ) {
        const createAuthRequest = await ExpenseAdvanceReqAuth.create(
          {
            expenseAdvanceRequestID: requestData.expenseAdvanceRequestID,
            userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
          },
          {
            user: req.userDetails,
            transaction,
          },
        );
        createUserInboxArray.push({
          activityTable: ExpenseAdvanceReqAuth.getTableName(),
          activityTablePK: createAuthRequest.toJSON().AuthReqId,
          message: inboxMessage,
          assignedTo: authorizationdetails.AuthorizedByUserMasterId[0],
          assignedBy: applierUserData.userMasterID,
        });

        const notification = {
          title: 'Expense Advance Request',
          body: inboxMessage,
        };

        const data = {
          screen: 'expenseAdvanceReqAuth',
          isScheduled: 'true',
          scheduledTime: new Date().toISOString(),
        };

        sendNotification_NEW(
          applierUserData.firebaseToken,
          applierUserData.deviceType,
          notification,
          data,
        );
      } else {
        for (
          let j = 0;
          j < authorizationdetails.AuthorizedByUserMasterId.length;
          j++
        ) {
          const createAuthRequest = await ExpenseAdvanceReqAuth.create(
            {
              expenseAdvanceRequestID: requestData.expenseAdvanceRequestID,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
            },
            {
              user: req.userDetails,
              transaction,
            },
          );
          createUserInboxArray.push({
            activityTable: ExpenseAdvanceReqAuth.getTableName(),
            activityTablePK: createAuthRequest.toJSON().AuthReqId,
            message: inboxMessage,
            assignedTo: authorizationdetails.AuthorizedByUserMasterId[j],
            assignedBy: applierUserData.userMasterID,
          });

          const notification = {
            title: 'Expense Advance Request',
            body: inboxMessage,
          };

          const data = {
            screen: 'expenseAdvanceReqAuth',
            isScheduled: 'true',
            scheduledTime: new Date().toISOString(),
          };

          sendNotification_NEW(
            applierUserData.firebaseToken,
            applierUserData.deviceType,
            notification,
            data,
          );
        }
      }
      await UserInbox.bulkCreate(createUserInboxArray, { transaction });
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Expense Advance Request'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getAllMyExpenseAdvanceRequest = async (req, res, next) => {
  try {
    const { limit, page, fromDate, toDate, exportData, authStatus } = req.body;

    const paginationQuery = {};
    const condition = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['createdAt', 'DESC']];

    condition.userMasterID = req.userDetails.userMasterId;

    if (fromDate && toDate) {
      const startOfDay = new Date(fromDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);

      condition.createdAt = {
        [Sequelize.Op.between]: [startOfDay, endOfDay],
      };
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (authStatus !== undefined && authStatus !== null) {
      switch (+authStatus) {
        case expenseAdvanceRequestAuthStatus.CANCELLED:
          condition.status = 10;
          condition.authorizationStatus = 3;
          break;

        case expenseAdvanceRequestAuthStatus.PAID:
          condition.status = 1;
          condition.authorizationStatus = 3;
          condition.ExpensePaymentID = { [Sequelize.Op.ne]: null };
          break;

        case expenseAdvanceRequestAuthStatus.APPROVED:
          condition.status = 1;
          condition.authorizationStatus = 3;
          condition.ExpensePaymentID = { [Sequelize.Op.eq]: null };
          break;

        case expenseAdvanceRequestAuthStatus.REJECTED:
          condition.status = 1;
          condition.authorizationStatus = 4;
          condition.ExpensePaymentID = { [Sequelize.Op.eq]: null };
          break;

        case expenseAdvanceRequestAuthStatus.PENDING:
          condition.status = 1;
          condition.authorizationStatus = { [Sequelize.Op.in]: [0, 1, 2] };
          condition.ExpensePaymentID = { [Sequelize.Op.eq]: null };
          break;

        default:
          // do nothing
          break;
      }
    }
    const expenseAdavanceReqAuthCondition = {};
    if (!exportData) {
      expenseAdavanceReqAuthCondition.authStatus = [0, 1];
    }
    const { rows: allExpenseAdvanceRequest, count } =
      await ExpenseAdvanceRequest.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginationQuery,
        order,
        include: [
          {
            required: false,
            model: ExpenseAdvanceReqAuth,
            as: 'Auth',
            where: expenseAdavanceReqAuthCondition,
            attributes: [
              'AuthReqId',
              'expenseAdvanceRequestID',
              'userMasterID',
              'authAmount',
              'authStatus',
              'remarks',
            ],
            include: [
              {
                model: UserMaster,
                as: 'authPerson',
                attributes: ['displayName'],
              },
            ],
          },
          {
            required: true,
            model: UserMaster,
            attributes: userAttributes,
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
                model: companyMaster,
                attributes: ['companyName'],
              },
              {
                model: EmployeeJoiningDetails,
                attributes: [
                  'employeeCode',
                  'bankIFSC',
                  'bankAccountNo',
                  'nameAsBank',
                ],
                include: [
                  {
                    model: BankMaster,
                    attributes: ['bankName'],
                  },
                ],
              },
            ],
          },
          {
            required: false,
            model: UserMaster,
            as: 'createdBy',
            attributes: userAttributes,
          },
          {
            required: false,
            model: UserMaster,
            as: 'updatedBy',
            attributes: userAttributes,
          },
          {
            required: false,
            model: UserMaster,
            as: 'authorizedUser',
            attributes: userAttributes,
          },
          {
            required: false,
            model: UserMaster,
            as: 'canceledUser',
            attributes: userAttributes,
          },
          {
            required: false,
            model: ExpensePayment,
          },
        ],
      });

    if (exportData) {
      const finaldata = allExpenseAdvanceRequest.map((e) => {
        return {
          'Employee Code': parseEmployeeInfo(e.userMaster)?.employeeCode,
          'Employee Name': e.userMaster?.displayName,
          'Employee Number': e.userMaster?.userNumber,
          Company: parseEmployeeInfo(e.userMaster)?.companyName,
          Branch: parseEmployeeInfo(e.userMaster)?.branch,
          Department: parseEmployeeInfo(e.userMaster)?.department,
          Designation: parseEmployeeInfo(e.userMaster)?.designation,
          Division: parseEmployeeInfo(e.userMaster)?.division,
          'Working Area': parseEmployeeInfo(e.userMaster)?.workingArea,
          'Bank Name':
            e.userMaster?.employeeJoiningDetails?.[0]?.bankMaster?.bankName ||
            '',
          'Name As Bank':
            e.userMaster?.employeeJoiningDetails?.[0]?.nameAsBank || '',
          'Bank IFSC Code':
            e.userMaster?.employeeJoiningDetails?.[0]?.bankIFSC || '',
          'Bank Account Number':
            e.userMaster?.employeeJoiningDetails?.[0]?.bankAccountNo || '',
          'Applied Amount': e.amount,
          Description: e.description,
          'Applied At': e.createdAt
            ? moment(e.createdAt).format('DD-MM-YYYY HH:mm')
            : '',
          'Authorization Status': (() => {
            const isAuth3 = e.authorizationStatus == 3;

            if (isAuth3 && e.status == 10) return 'Cancelled';
            if (isAuth3 && e.status == 1 && !e.ExpensePaymentID)
              return 'Approved';
            if (isAuth3 && e.status == 1 && e.ExpensePaymentID) return 'Paid';
            if (e.authorizationStatus == 4) return 'Rejected';

            return 'Pending';
          })(),
          'Final Authorized Amount': e.authAmount,
          'Final Authorized By': e.authorizedAt
            ? `${e.authorizedUser?.displayName} On ${moment(e.authorizedAt).format('DD-MM-YYYY HH:mm')}`
            : '',
          'Cancelled By': e.canceledAt
            ? `${e.canceledUser?.displayName} On ${moment(e.canceledAt).format('DD-MM-YYYY HH:mm')}`
            : '',
          'Cancel Remarks': e.canceledRemarks || '',
          'Payment Date': e.expensePayment
            ? moment(e.expensePayment?.paymentDate).format('DD-MM-YYYY')
            : '',
          'Payment Mode': e.expensePayment?.paymentmode || '',
          'Payment Reference Date':
            e.expensePayment && e.expensePayment?.referenceDate
              ? moment(e.expensePayment?.referenceDate).format('DD-MM-YYYY')
              : '',
          'Payment Reference No.': e.expensePayment?.referenceNO || '',
        };
      });

      return await generateExcel(
        finaldata,
        'Expense Advance Request',
        'xlsx',
        res,
      );
    }

    return res.status(200).json({
      status: 200,
      data: allExpenseAdvanceRequest,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateExpenseAdvanceRequest = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { expenseAdvanceRequestID, description, amount } = req.body;
    

    const expenseRequest = await ExpenseAdvanceRequest.findOne({
      where: { expenseAdvanceRequestID },
      include: [
        {
          model: ExpenseAdvanceReqAuth,
          as: 'Auth',
        },
      ],
      transaction,
    });

    if (!expenseRequest) {
      throw new Error(
        message.usermessage.notFoundMessage('Expense Advance Request'),
      );
    }
    const applierUserData = await UserMaster.findOne({
      where: {
        userMasterID: expenseRequest.userMasterID,
        status: 1,
      },
      attributes: userAttributes,
    });
    if (!applierUserData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('User'),
      });
    }
    if (expenseRequest.Auth?.length) {
      const findAnyApprovedAuth = expenseRequest.Auth?.find(
        (e) => e.authStatus == 1 || e.authStatus == 0,
      );
      if (findAnyApprovedAuth) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `Any Of the Authorizer Authorized the Request So you Can't Edit Request`,
        });
      }
      const findAuthRequestIDs = expenseRequest.Auth?.map((e) => e.AuthReqId);

      await UserInbox.update(
        {
          message: `${applierUserData?.displayName} has appiled for Expense Advance of ${amount}`,
        },
        {
          where: {
            activityTable: ExpenseAdvanceReqAuth.getTableName(),
            activityTablePK: {
              [Sequelize.Op.in]: findAuthRequestIDs,
            },
          },
          transaction,
        },
      );
    }

    expenseRequest.description = description;
    expenseRequest.amount = amount;

    await expenseRequest.save({
      transaction,
      user: req.userDetails,
      individualHooks: true,
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Expense Advance Request'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.updateExpenseAdvanceRequestV2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { expenseAdvanceRequestID, description, amount } = req.body;

    let userMasterID='';

    if(req.userDetails.isMyUserDetails){
        userMasterID = req.userDetails.userMasterId;
    }
    const expenseRequest = await ExpenseAdvanceRequest.findOne({
      where: { expenseAdvanceRequestID ,userMasterID},
      include: [
        {
          model: ExpenseAdvanceReqAuth,
          as: 'Auth',
        },
      ],
      transaction,
    });

    if (!expenseRequest) {
      throw new Error(
        message.usermessage.notFoundMessage('Expense Advance Request'),
      );
    }
    const applierUserData = await UserMaster.findOne({
      where: {
        userMasterID: expenseRequest.userMasterID,
        status: 1,
      },
      attributes: userAttributes,
    });
    if (!applierUserData) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('User'),
      });
    }
    if (expenseRequest.Auth?.length) {
      const findAnyApprovedAuth = expenseRequest.Auth?.find(
        (e) => e.authStatus == 1 || e.authStatus == 0,
      );
      if (findAnyApprovedAuth) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `Any Of the Authorizer Authorized the Request So you Can't Edit Request`,
        });
      }
      const findAuthRequestIDs = expenseRequest.Auth?.map((e) => e.AuthReqId);

      await UserInbox.update(
        {
          message: `${applierUserData?.displayName} has appiled for Expense Advance of ${amount}`,
        },
        {
          where: {
            activityTable: ExpenseAdvanceReqAuth.getTableName(),
            activityTablePK: {
              [Sequelize.Op.in]: findAuthRequestIDs,
            },
          },
          transaction,
        },
      );
    }

    expenseRequest.description = description;
    expenseRequest.amount = amount;

    await expenseRequest.save({
      transaction,
      user: req.userDetails,
      individualHooks: true,
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Expense Advance Request'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getExpenseAdvanceRequestByID = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const requestData = await ExpenseAdvanceRequest.findOne({
      where: {
        expenseAdvanceRequestID: id,
      },
      include: [
        {
          model: ExpenseAdvanceReqAuth,
          as: 'Auth',
          separate: true,
          order: [['createdAt', 'ASC']],
          attributes: [
            'AuthReqId',
            'expenseAdvanceRequestID',
            'userMasterID',
            'authAmount',
            'authStatus',
            'remarks',
            'updatedAt',
          ],
          include: [
            {
              model: UserMaster,
              as: 'authPerson',
              attributes: ['displayName'],
            },
          ],
        },
        {
          required: true,
          model: UserMaster,
          attributes: userAttributes,
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
              model: companyMaster,
              attributes: ['companyName'],
            },
            {
              model: EmployeeJoiningDetails,
              attributes: [
                'employeeCode',
                'bankIFSC',
                'bankAccountNo',
                'nameAsBank',
              ],
            },
          ],
        },
        {
          required: false,
          model: UserMaster,
          as: 'createdBy',
          attributes: userAttributes,
        },
        {
          required: false,
          model: UserMaster,
          as: 'updatedBy',
          attributes: userAttributes,
        },
        {
          required: false,
          model: UserMaster,
          as: 'authorizedUser',
          attributes: userAttributes,
        },
        {
          required: false,
          model: UserMaster,
          as: 'canceledUser',
          attributes: userAttributes,
        },
        {
          required: false,
          model: UserMaster,
          as: 'paidUser',
          attributes: userAttributes,
        },
        {
          required: false,
          model: ExpensePayment,
        },
        {
          required: false,
          model: AuthorizationCriteriaMaster,
          attributes: ['AuthorizationCriteria'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: requestData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getExpenseAdvanceRequestByIDV2 = async (req, res, next) => {
  try {
    const { id,userMasterID } = req.body;
    if(req.userDetails.isMyUserDetails){
      userMasterID=req.userDetails.userMasterId
    }
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const requestData = await ExpenseAdvanceRequest.findOne({
      where: {
        expenseAdvanceRequestID: id,
        userMasterID:userMasterID
      },
      include: [
        {
          model: ExpenseAdvanceReqAuth,
          as: 'Auth',
          separate: true,
          order: [['createdAt', 'ASC']],
          attributes: [
            'AuthReqId',
            'expenseAdvanceRequestID',
            'userMasterID',
            'authAmount',
            'authStatus',
            'remarks',
            'updatedAt',
          ],
          include: [
            {
              model: UserMaster,
              as: 'authPerson',
              attributes: ['displayName'],
            },
          ],
        },
        {
          required: true,
          model: UserMaster,
          attributes: userAttributes,
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
              model: companyMaster,
              attributes: ['companyName'],
            },
            {
              model: EmployeeJoiningDetails,
              attributes: [
                'employeeCode',
                'bankIFSC',
                'bankAccountNo',
                'nameAsBank',
              ],
            },
          ],
        },
        {
          required: false,
          model: UserMaster,
          as: 'createdBy',
          attributes: userAttributes,
        },
        {
          required: false,
          model: UserMaster,
          as: 'updatedBy',
          attributes: userAttributes,
        },
        {
          required: false,
          model: UserMaster,
          as: 'authorizedUser',
          attributes: userAttributes,
        },
        {
          required: false,
          model: UserMaster,
          as: 'canceledUser',
          attributes: userAttributes,
        },
        {
          required: false,
          model: UserMaster,
          as: 'paidUser',
          attributes: userAttributes,
        },
        {
          required: false,
          model: ExpensePayment,
        },
        {
          required: false,
          model: AuthorizationCriteriaMaster,
          attributes: ['AuthorizationCriteria'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: requestData,
    });
  } catch (error) {
    next(error);
  }
};



exports.deleteExpenseAdvanceRequest = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const expenseRequest = await ExpenseAdvanceRequest.findOne({
      where: { expenseAdvanceRequestID: id },
      include: [
        {
          model: ExpenseAdvanceReqAuth,
          as: 'Auth',
        },
      ],
      transaction,
    });

    if (!expenseRequest) {
      await transaction.rollback();
      return res.status(404).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Expense Advance Request'),
      });
    }

    if (expenseRequest.Auth?.length) {
      const findAnyApprovedAuth = expenseRequest.Auth.find(
        (e) => e.authStatus == 1 || e.authStatus == 0,
      );
      if (findAnyApprovedAuth) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `Any Of the Authorizer Authorized the Request So you Can't Delete Request`,
        });
      }
      const findAuthRequestIDs = expenseRequest.Auth.map((e) => e.AuthReqId);

      await UserInbox.destroy({
        where: {
          activityTable: ExpenseAdvanceReqAuth.getTableName(),
          activityTablePK: {
            [Sequelize.Op.in]: findAuthRequestIDs,
          },
        },
        transaction,
      });
    }
    await expenseRequest.destroy({
      user: req.userDetails,
      individualHooks: true,
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Expense Advance Request'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.deleteExpenseAdvanceRequestV2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {id,userMasterID} = req.body;

    if(!id || !userMasterID){
      await transaction.rollback();
      return res.status(200).json({status:400,message:'Invalid Parameters'});
    }
    const expenseRequest = await ExpenseAdvanceRequest.findOne({
      where: { expenseAdvanceRequestID: id , userMasterID:userMasterID },
      include: [
        {
          model: ExpenseAdvanceReqAuth,
          as: 'Auth',
        },
      ],
      transaction,
    });

    if (!expenseRequest) {
      await transaction.rollback();
      return res.status(404).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Expense Advance Request'),
      });
    }

    if (expenseRequest.Auth?.length) {
      const findAnyApprovedAuth = expenseRequest.Auth.find(
        (e) => e.authStatus == 1 || e.authStatus == 0,
      );
      if (findAnyApprovedAuth) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `Any Of the Authorizer Authorized the Request So you Can't Delete Request`,
        });
      }
      const findAuthRequestIDs = expenseRequest.Auth.map((e) => e.AuthReqId);

      await UserInbox.destroy({
        where: {
          activityTable: ExpenseAdvanceReqAuth.getTableName(),
          activityTablePK: {
            [Sequelize.Op.in]: findAuthRequestIDs,
          },
        },
        transaction,
      });
    }
    await expenseRequest.destroy({
      user: req.userDetails,
      individualHooks: true,
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Expense Advance Request'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.cancelExpenseAdvanceRequest = async (req, res, next) => {
  try {
    const { expenseAdvanceRequestID, canceledRemarks } = req.body;
    const expenseRequest = await ExpenseAdvanceRequest.findOne({
      where: { expenseAdvanceRequestID },
    });

    if (!expenseRequest) {
      throw new Error('Expense request not found');
    }
    if (expenseRequest.authorizationStatus != 3) {
      return res.status(200).json({
        status: 401,
        message: 'Expense Advance Request is Not Approved',
      });
    }

    if (expenseRequest.ExpensePaymentID) {
      return res.status(200).json({
        status: 401,
        message: `Expense Advance Request is Alreay Paid So you Can't Cancel Expense`,
      });
    }
    expenseRequest.canceledRemarks = canceledRemarks;
    expenseRequest.status = 10;
    expenseRequest.canceledBy = req.userDetails.userMasterId;
    expenseRequest.canceledAt = new Date();

    await expenseRequest.save({
      user: req.userDetails,
      individualHooks: true,
    });
    return res.status(200).json({
      status: 200,
      message: message.usermessage.cancelMessage('Expense Advance Request'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllExpenseAdvanceRequest = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      fromDate,
      toDate,
      exportData,
      authStatus,
      companyMasterID,
      userMasterID,
      filterType,
      exportFileType = 'xlsx',
    } = req.body;

    const paginationQuery = {};
    const condition = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['createdAt', 'DESC']];
    if (userMasterID && userMasterID.length) {
      condition.userMasterID = userMasterID;
    }
    const paymentCondtion = {};
    if (fromDate && toDate) {
      const startOfDay = new Date(fromDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (filterType == expenseAdvanceRequestDateFilterType.On_Apply_Date) {
        condition.createdAt = {
          [Sequelize.Op.between]: [startOfDay, endOfDay],
        };
      } else if (
        filterType == expenseAdvanceRequestDateFilterType.On_Approval_Date
      ) {
        condition.authorizedAt = {
          [Sequelize.Op.between]: [startOfDay, endOfDay],
        };
      } else if (
        filterType == expenseAdvanceRequestDateFilterType.On_Paid_Date
      ) {
        condition.paidAt = {
          [Sequelize.Op.between]: [startOfDay, endOfDay],
        };
      } else if (
        filterType == expenseAdvanceRequestDateFilterType.On_Payment_Date
      ) {
        paymentCondtion.paymentDate = {
          [Sequelize.Op.between]: [startOfDay, endOfDay],
        };
      } else {
        condition.createdAt = {
          [Sequelize.Op.between]: [startOfDay, endOfDay],
        };
      }
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (authStatus !== undefined && authStatus !== null) {
      switch (+authStatus) {
        case expenseAdvanceRequestAuthStatus.CANCELLED:
          condition.status = 10;
          condition.authorizationStatus = 3;
          break;

        case expenseAdvanceRequestAuthStatus.PAID:
          condition.status = 1;
          condition.authorizationStatus = 3;
          condition.ExpensePaymentID = { [Sequelize.Op.ne]: null };
          break;

        case expenseAdvanceRequestAuthStatus.APPROVED:
          condition.status = 1;
          condition.authorizationStatus = 3;
          condition.ExpensePaymentID = { [Sequelize.Op.eq]: null };
          break;

        case expenseAdvanceRequestAuthStatus.REJECTED:
          condition.status = 1;
          condition.authorizationStatus = 4;
          condition.ExpensePaymentID = { [Sequelize.Op.eq]: null };
          break;

        case expenseAdvanceRequestAuthStatus.PENDING:
          condition.status = 1;
          condition.authorizationStatus = { [Sequelize.Op.in]: [0, 1, 2] };
          condition.ExpensePaymentID = { [Sequelize.Op.eq]: null };
          break;

        default:
          // do nothing
          break;
      }
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows: allExpenseAdvanceRequest, count } =
      await ExpenseAdvanceRequest.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginationQuery,
        order,
        include: [
          {
            model: ExpenseAdvanceReqAuth,
            as: 'Auth',
            attributes: [
              'AuthReqId',
              'expenseAdvanceRequestID',
              'userMasterID',
              'authAmount',
              'authStatus',
              'remarks',
            ],
            include: [
              {
                model: UserMaster,
                as: 'authPerson',
                attributes: ['displayName'],
              },
            ],
          },
          {
            required: true,
            model: UserMaster,
            where: {
              status: 1,
              companyMasterId: companyMasterID,
              ...userAccessCondition.where,
            },
            attributes: userAttributes,
            include: [
              ...userAccessCondition.includeModels,
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
                model: companyMaster,
                attributes: ['companyName'],
              },
              {
                model: EmployeeJoiningDetails,
                attributes: [
                  'employeeCode',
                  'bankIFSC',
                  'bankAccountNo',
                  'nameAsBank',
                ],
                include: [
                  {
                    model: BankMaster,
                    attributes: ['bankName'],
                  },
                ],
              },
            ],
          },
          {
            required: false,
            model: UserMaster,
            as: 'createdBy',
            attributes: userAttributes,
          },
          {
            required: false,
            model: UserMaster,
            as: 'updatedBy',
            attributes: userAttributes,
          },
          {
            required: false,
            model: UserMaster,
            as: 'authorizedUser',
            attributes: userAttributes,
          },
          {
            required: false,
            model: UserMaster,
            as: 'canceledUser',
            attributes: userAttributes,
          },
          {
            required: false,
            model: UserMaster,
            as: 'paidUser',
            attributes: userAttributes,
          },
          {
            required:
              filterType &&
              filterType == expenseAdvanceRequestDateFilterType.On_Payment_Date
                ? true
                : false,
            model: ExpensePayment,
            where: paymentCondtion,
          },
        ],
      });
    if (exportData) {
      if (exportFileType == 'pdf') {
        const findCompanyDetails = await companyMaster.findOne({
          where: { companyMasterID },
          include: [
            {
              model: CompanyBankDetails,
              as: 'cbd',
              attributes: ['bankAccountNo'],
            },
          ],
        });
        const pdfObj = {
          paymentDate: moment(fromDate, 'YYYY-MM-DD').format('DD-MM-YYYY'),
          companyName: findCompanyDetails.companyName,
          paymentData: [],
          totalExpenseAdvanceAmount: 0,
          totalExpenseAdvanceAmountInWords: null,
          fileHeading: null,
        };

        // Group payments per user
        const userWiseMap = {};

        for (const payment of allExpenseAdvanceRequest) {
          const userId = payment.userMasterID;

          if (!userWiseMap[userId]) {
            userWiseMap[userId] = {
              userMasterID: userId,
              amount: 0,
              userMaster: payment.userMaster,
            };
          }

          userWiseMap[userId].amount += Number(payment.authAmount);
          pdfObj.totalExpenseAdvanceAmount += Number(payment.authAmount);
        }

        // Prepare final PDF rows (one row per user)
        let serialNumber = 0;

        for (const userId in userWiseMap) {
          serialNumber++;

          const userData = userWiseMap[userId];
          const joiningDetails =
            (userData.userMaster.employeeJoiningDetails &&
              userData.userMaster.employeeJoiningDetails[0]) ||
            {};

          pdfObj.paymentData.push({
            serialNumber: serialNumber,
            userMasterID: userData.userMasterID,
            companyAccountNumber:
              findCompanyDetails?.cbd?.[0]?.bankAccountNo || '',
            amount: userData.amount,
            userBankIFSC: joiningDetails.bankIFSC || '',
            userBankAccountNumber: joiningDetails.bankAccountNo || '',
            userNameAsOnBank: joiningDetails.nameAsBank || '',
            purposeOfPayment: 'EXPENSE PAYMENT',
          });
        }

        // Convert total amount to words
        pdfObj.totalExpenseAdvanceAmountInWords = toWords.convert(
          pdfObj.totalExpenseAdvanceAmount,
        );

        pdfObj.fileHeading = `${pdfObj.paymentDate} Expense Advance Payment Sheet`;
        let base64path = await generateHTMLToPDF_base64Path(
          pdfObj,
          'expenseAdvanceRequest',
          'portrait',
          'html', //File Extension
        );

        return res.status(statusCodes.OK).json({
          data: base64path,
          fileName: pdfObj.fileHeading,
          status: statusCodes.OK,
        });
      } else {
        const finaldata = allExpenseAdvanceRequest.map((e) => {
          return {
            'Employee Code': parseEmployeeInfo(e.userMaster)?.employeeCode,
            'Employee Name': e.userMaster?.displayName,
            'Employee Number': e.userMaster?.userNumber,
            Company: parseEmployeeInfo(e.userMaster)?.companyName,
            Branch: parseEmployeeInfo(e.userMaster)?.branch,
            Department: parseEmployeeInfo(e.userMaster)?.department,
            Designation: parseEmployeeInfo(e.userMaster)?.designation,
            Division: parseEmployeeInfo(e.userMaster)?.division,
            'Working Area': parseEmployeeInfo(e.userMaster)?.workingArea,
            'Bank Name':
              e.userMaster?.employeeJoiningDetails?.[0]?.bankMaster?.bankName ||
              '',
            'Name As Bank':
              e.userMaster?.employeeJoiningDetails?.[0]?.nameAsBank || '',
            'Bank IFSC Code':
              e.userMaster?.employeeJoiningDetails?.[0]?.bankIFSC || '',
            'Bank Account Number':
              e.userMaster?.employeeJoiningDetails?.[0]?.bankAccountNo || '',
            'Applied Amount': e.amount,
            Description: e.description,
            'Applied At': e.createdAt
              ? moment(e.createdAt).format('DD-MM-YYYY HH:mm')
              : '',
            'Authorization Status': (() => {
              const isAuth3 = e.authorizationStatus == 3;

              if (isAuth3 && e.status == 10) return 'Cancelled';
              if (isAuth3 && e.status == 1 && !e.ExpensePaymentID)
                return 'Approved';
              if (isAuth3 && e.status == 1 && e.ExpensePaymentID) return 'Paid';
              if (e.authorizationStatus == 4) return 'Rejected';

              return 'Pending';
            })(),
            'Final Authorized Amount': e.authAmount,
            'Final Authorized By': e.authorizedAt
              ? `${e.authorizedUser?.displayName} On ${moment(e.authorizedAt).format('DD-MM-YYYY HH:mm')}`
              : '',
            'Paid By': e.paidAt
              ? `${e.paidUser?.displayName} On ${moment(e.paidAt).format('DD-MM-YYYY HH:mm')}`
              : '',
            'Cancelled By': e.canceledUser?.displayName || '',
            'Cancelled At': e.canceledAt
              ? moment(e.canceledAt).format('DD-MM-YYYY HH:mm')
              : '',
            'Cancel Remarks': e.canceledRemarks || '',
            'Payment Date': e.expensePayment
              ? moment(e.expensePayment?.paymentDate).format('DD-MM-YYYY')
              : '',
            'Payment Mode': e.expensePayment?.paymentmode || '',
            'Payment Reference Date':
              e.expensePayment && e.expensePayment?.referenceDate
                ? moment(e.expensePayment?.referenceDate).format('DD-MM-YYYY')
                : '',
            'Payment Reference No.': e.expensePayment?.referenceNO || '',
          };
        });

        return await generateExcel(
          finaldata,
          'Expense Advance Request',
          'xlsx',
          res,
        );
      }
    }

    return res.status(200).json({
      status: 200,
      data: allExpenseAdvanceRequest,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.markAsPaidExpenseAdvanceRequest = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      expenseAdvanceRequestID,
      paymentDate,
      paymentmode,
      referenceNO,
      referenceDate,
    } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const expenseRequest = await ExpenseAdvanceRequest.findOne({
      where: { expenseAdvanceRequestID },
      transaction,
    });
    if (!expenseRequest) {
      throw new Error('Expense request not found');
    }
    if (expenseRequest.authorizationStatus != 3) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: `Expense Advance Request is Not Approved So Can't Mark As Paid`,
      });
    }

    if (expenseRequest.ExpensePaymentID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Expense Advance Request is Alreay Paid',
      });
    }
    const paymentData = {
      userMasterID: expenseRequest.userMasterID,
      amount: expenseRequest.authAmount,
      paymentDate,
      paymentmode,
      createBy,
      createByIp,
      txnType: txnTypeENUM.DEBIT,
      paymentType: expense_Payment_Types_Obj.EXPENSE_ADVANCE_REQUEST_PAYMENT,
    };

    if (paymentmode !== 'Cash' && paymentmode !== 'ExpenseAdvance') {
      paymentData.referenceNO = referenceNO;
      paymentData.referenceDate = referenceDate;
    }

    const insert_db_status = await ExpensePayment.create(paymentData, {
      transaction,
    });

    expenseRequest.ExpensePaymentID = insert_db_status.ExpensePaymentID;
    expenseRequest.paidBy = createBy;
    expenseRequest.paidAt = new Date();

    await expenseRequest.save({
      user: req.userDetails,
      individualHooks: true,
      transaction,
    });
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.paidMessage(
        'Advance Expense Request Mark As',
      ),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.listErpExpenseAdvanceSync = async (req, res, next) => {
  try {
    let { page, limit, userMasterID, companyMasterID, exportData } = req.body;
    const order = [['displayName', 'ASC']];
    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const userCondtion = { companyMasterId: companyMasterID, status: 1 };
    if (userMasterID && userMasterID?.length) {
      userCondtion.userMasterID = userMasterID;
    }
    const erpAccountCondtion = { status: 1 };
    const expenseAdvanceRequestCondtion = {
      status: 1,
      authorizationStatus: 3,
      erpJvid: null,
      ExpensePaymentID: null,
      authAmount: { [Sequelize.Op.ne]: null },
    };
    const { rows: findUserWiseExpenseAdvanceRequest, count } =
      await UserMaster.findAndCountAll({
        subQuery: false,
        distinct: true,
        where: userCondtion,
        attributes: userAttributes,
        ...paginationQuery,
        order,
        include: [
          {
            model: erpAcountMasters,
            where: erpAccountCondtion,
          },
          {
            model: ExpenseAdvanceRequest,
            as: 'ea_Req',
            where: expenseAdvanceRequestCondtion,
          },
        ],
      });
    const processedExpenseAdvanceRequestData =
      expenseAdavanceReqAutoSyncProcessedData(
        findUserWiseExpenseAdvanceRequest,
      );

    return res.status(200).json({
      status: 200,
      totalcount: count,
      data: processedExpenseAdvanceRequestData.responseArray,
    });
  } catch (err) {
    next(err);
  }
};

function expenseAdavanceReqAutoSyncProcessedData(userWiseExpenseAdvanceData) {
  try {
    const returnResponseObj = {
      responseArray: [],
      netAmount: 0, // All Users Sum
      allUserExpenseAdvanceRequestIDs: [],
      allUserDescription: [],
      allUserErpAcountID: [],
      allUserTotalExpenseAmount: [],
    };
    let serialNumber = 0;
    for (const user of userWiseExpenseAdvanceData) {
      serialNumber++;
      const responseObj = {
        srNo: serialNumber,
        userMasterID: user.userMasterID,
        companyMasterID: user.companyMasterId,
        displayName: user.displayName,
        userNumber: user.userNumber,
        totalExpenseAdvanceAmount: 0,
        concatedDescription: null,
        concatedExpenseRequestAmount: null,
        expenseAdvanceRequestIDs: [],
        erpAcountID: user.erpAcountMasters?.[0]?.erpAcountID,
        userClosingBalance: null,
      };
      const descriptionArray = [];
      const amountArray = [];
      for (const req of user.ea_Req) {
        responseObj.totalExpenseAdvanceAmount += req.authAmount;
        descriptionArray.push(req.description || 'N/A');
        amountArray.push(req.authAmount);
        responseObj.expenseAdvanceRequestIDs.push(+req.expenseAdvanceRequestID);
      }
      responseObj.concatedExpenseRequestAmount = amountArray.join('| ');
      responseObj.concatedDescription = descriptionArray.join('| ');
      returnResponseObj.responseArray.push(responseObj);
      returnResponseObj.netAmount += responseObj.totalExpenseAdvanceAmount;
      returnResponseObj.allUserExpenseAdvanceRequestIDs.push(
        ...responseObj.expenseAdvanceRequestIDs,
      );
      returnResponseObj.allUserDescription.push(
        responseObj.concatedDescription,
      );
      returnResponseObj.allUserErpAcountID.push(responseObj.erpAcountID);
      returnResponseObj.allUserTotalExpenseAmount.push(
        responseObj.totalExpenseAdvanceAmount,
      );
    }

    return returnResponseObj || [];
  } catch (error) {
    throw new Error(
      'Error in Expense Adavance Req Auto Sync Process: ' + error.message,
    );
  }
}

exports.syncExpenseAdvance = async (req, res, next) => {
  try {
    console.log('==== [SYNC_EXP_ADV] API CALLED ====');

    const { tobeSyncedExpenseAdvanceData, companyMasterID, paymentDate } =
      req.body;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    console.log('[SYNC_EXP_ADV] Request Data:', {
      companyMasterID,
      paymentDate,
      totalUsers: tobeSyncedExpenseAdvanceData?.length,
      createBy,
      createByIp,
    });

    const tobeSyncedUserMasterIDs = tobeSyncedExpenseAdvanceData.map(
      (e) => +e.userMasterID,
    );

    console.log('[SYNC_EXP_ADV] UserMasterIDs:', tobeSyncedUserMasterIDs);

    const userCondtion = {
      companyMasterId: companyMasterID,
      status: 1,
      userMasterID: tobeSyncedUserMasterIDs,
    };

    console.log('[SYNC_EXP_ADV] Fetching users from DB');

    const { rows: findUserWiseExpenseAdvanceRequest, count } =
      await UserMaster.findAndCountAll({
        subQuery: false,
        distinct: true,
        where: userCondtion,
        attributes: userAttributes,
        order: [['displayName', 'ASC']],
        include: [
          { model: erpAcountMasters, where: { status: 1 } },
          {
            model: ExpenseAdvanceRequest,
            as: 'ea_Req',
            where: {
              status: 1,
              authorizationStatus: 3,
              erpJvid: null,
              ExpensePaymentID: null,
              authAmount: { [Sequelize.Op.ne]: null },
            },
          },
        ],
      });

    console.log('[SYNC_EXP_ADV] Users fetched:', count);

    if (!count) {
      console.log('[SYNC_EXP_ADV] No eligible data found');
      return res.status(200).json({
        status: 401,
        message: 'No eligible data found for sync',
      });
    }

    const processedExpenseAdvanceRequestData =
      expenseAdavanceReqAutoSyncProcessedData(
        findUserWiseExpenseAdvanceRequest,
      );

    console.log('[SYNC_EXP_ADV] Processed ERP Data:', {
      netAmount: processedExpenseAdvanceRequestData.netAmount,
      totalRequests:
        processedExpenseAdvanceRequestData.allUserExpenseAdvanceRequestIDs
          ?.length,
    });

    const erpConfig = getErpDatabaseConfig(companyMasterID);

    console.log('[SYNC_EXP_ADV] Connecting to ERP DB');

    sql.connect(erpConfig, async function (err) {
      if (err) {
        console.error('[SYNC_EXP_ADV] ERP DB connection error:', err);
        sql.close();
        return res
          .status(200)
          .json({ status: 200, message: 'Could not create DB Connection!' });
      }

      console.log('[SYNC_EXP_ADV] ERP DB connected');

      const results = await erpDatabaseSyncProcess(
        processedExpenseAdvanceRequestData,
        sql,
        'ManualSync',
        paymentDate,
        createBy,
        createByIp,
      );

      sql.close();
      console.log('[SYNC_EXP_ADV] ERP DB connection closed');

      console.log('[SYNC_EXP_ADV] Final Result:', results);

      if (results?.length) {
        return res.status(200).json({
          status: results[0].status,
          message:
            results[0].status === 200
              ? 'Erp-Sync Successfully'
              : results[0].message,
        });
      }

      return res.status(200).json({
        status: 401,
        message: 'Data Not Fetched',
      });
    });
  } catch (err) {
    console.error('[SYNC_EXP_ADV] Unhandled Error:', err?.stack || err);
    next(err);
  }
};

async function erpDatabaseSyncProcess(
  expenseData,
  sql,
  syncType,
  paymentDate,
  createBy,
  createByIp,
) {
  const results = [];
  const transaction = await sequelize.transaction();

  try {
    console.log('==== [ERP_SYNC] START ====');

    const params = {
      BookMasterId: 10,
      NetAmount: expenseData.netAmount,
      DocumentDate: paymentDate,
      TADAccount: expenseData.allUserErpAcountID.join('#'),
      expenceAmt: expenseData.allUserTotalExpenseAmount.join('#'),
      dec: expenseData.allUserDescription.join('#'),
    };

    console.log('[ERP_SYNC] SP Params:', params);

    let erpJvid;

    try {
      const request = new sql.Request();

      request.input('BookMasterId', sql.BigInt, params.BookMasterId);
      request.input('NetAmount', sql.Decimal(18, 2), params.NetAmount);
      request.input('DocumentDate', sql.Date, params.DocumentDate);
      request.input('TADAccount', sql.VarChar(sql.MAX), params.TADAccount);
      request.input('expenceAmt', sql.VarChar(sql.MAX), params.expenceAmt);
      request.input('dec', sql.VarChar(sql.MAX), params.dec);

      console.log('[ERP_SYNC] Executing Stored Procedure');
      const storedProcedureName = erpStoredProcedures.ADVANCE_EXPENSE_ERP_SYNC;
      const result = await request.execute(storedProcedureName);

      console.log('[ERP_SYNC] Stored Procedure Result:', result?.recordset);

      erpJvid = result?.recordset?.[0]?.erpJvid;
    } catch (erpError) {
      console.error('[ERP_SYNC] SP Execution Failed:', erpError);
      await transaction.rollback();

      results.push({
        status: 500,
        message: 'ERP Stored Procedure execution failed',
        error: erpError.message,
      });

      return results;
    }

    if (!erpJvid) {
      console.error('[ERP_SYNC] ERP JV ID not received');
      await transaction.rollback();

      results.push({
        status: 401,
        message: 'ERP JV ID missing',
      });

      return results;
    }

    console.log('[ERP_SYNC] ERP JV ID:', erpJvid);

    const findallExpenseReqs = await ExpenseAdvanceRequest.findAll({
      where: {
        status: { [Sequelize.Op.ne]: 10 },
        authorizationStatus: 3,
        expenseAdvanceRequestID: {
          [Sequelize.Op.in]: expenseData.allUserExpenseAdvanceRequestIDs,
        },
      },
      transaction,
    });

    console.log(
      '[ERP_SYNC] ExpenseAdvanceRequests found:',
      findallExpenseReqs.length,
    );

    const paidAt = new Date();

    for (const req of findallExpenseReqs) {
      console.log(
        '[ERP_SYNC] Processing Request ID:',
        req.expenseAdvanceRequestID,
      );

      const payment = await ExpensePayment.create(
        {
          userMasterID: req.userMasterID,
          amount: req.authAmount,
          paymentDate,
          paymentmode: paymentMode.NETBANKING,
          createBy,
          createByIp,
          txnType: txnTypeENUM.CREDIT,
          paymentType:
            expense_Payment_Types_Obj.EXPENSE_ADVANCE_REQUEST_PAYMENT,
        },
        { transaction },
      );

      console.log(
        '[ERP_SYNC] ExpensePayment Created:',
        payment.ExpensePaymentID,
      );

      await ExpenseAdvanceRequest.update(
        {
          erpJvid,
          syncType,
          paidBy: createBy,
          paidAt,
          ExpensePaymentID: payment.ExpensePaymentID,
        },
        {
          where: {
            expenseAdvanceRequestID: req.expenseAdvanceRequestID,
          },
          transaction,
        },
      );
    }

    await transaction.commit();
    console.log('[ERP_SYNC] Transaction committed');

    results.push({
      status: 200,
      message: `Synced successfully ( erpJvid = ${erpJvid} )`,
    });

    return results;
  } catch (error) {
    console.error('[ERP_SYNC] Unexpected Error:', error?.stack || error);

    await transaction.rollback();

    results.push({
      status: 500,
      message: 'ERP Sync Failed',
      error: error.message,
    });

    return results;
  }
}
