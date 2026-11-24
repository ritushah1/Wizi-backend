const OfficeExpense = require('../models/officeExpense');
const OfficeExpenseTransaction = require('../models/officeExpenseTransaction');
const UserMaster = require('../models/userMaster');
const {
  findOfficeExpenseAuthorizationDetails,
  findCompanyNotificationPolicy,
  sendNotification_NEW,
  sendMailforExpense_With_Transaction,
  asiaKolkataDateTime,
  generateHTMLToPDF_base64Path,
} = require('../utils/commonUtilFunctions');
const {
  organizationAuthorizationMasterTypes,
  authorizationCriteriaType,
  mailTemplateTypes,
} = require('../utils/dbUtils');
const { statusCodes, userAttributes } = require('../utils/commonVars');
const OfficeExpenseHead = require('../models/officeExpenseHead');
const { Op, Sequelize, col, fn, literal } = require('sequelize');
const OfficeExpenseCategory = require('../models/officeExpenseCategory');
const OfficeExpenseAuthorizationRequest = require('../models/officeExpenseAuthorization');
const UserInbox = require('../models/UserInbox');
const BranchMaster = require('../models/branchMaster');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const Site = require('../models/site');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const mailTemplateEditor = require('../models/mailTemplateEditor');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const {
  mainApiUrl,
  ProjectName,
  projectNamesList,
} = require('../utils/labelUtils');
const { generateExcelForOfficeExpense } = require('../utils/exportData');
const companyMaster = require('../models/companyMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeBranch = require('../models/employeeBranch');
const Department = require('../models/department');
const EmployeeDepartment = require('../models/employeeDepartment');
const OfficeExpenseApplyConfig = require('../models/officeExpenseApplyConfig');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.addOfficeExpense = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const userMasterID = +req.userDetails.userMasterId;
    const userCompanyID = +req.userDetails.companyMasterId;
    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const formData = req.body;
    const files = req.files;
    const entryCount = Object.keys(formData).filter((key) =>
      key.startsWith('officeExpenseHeadID'),
    ).length;

    const expenseTransaction = [];
    let index_attch = 0;
    const expense_date = formData[`expense_date`];

    const branchMasterID = formData[`branchMasterID`]
      ? formData[`branchMasterID`]
      : null;
    const siteID = formData[`siteID`] ? formData[`siteID`] : null;

    if (!expense_date || (!branchMasterID && !siteID)) {
      await transaction.rollback();
      return res
        .status(200)
        .json({ status: 401, message: message.usermessage.ValidParameters });
    }
    if (ProjectName == projectNamesList.MARS) {
      const reponseData = await canApplyExpense(
        userCompanyID,
        expense_date,
        currentdate,
      );
      if (!reponseData.canApply) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: reponseData.message,
        });
      }
    }
    for (let i = 0; i < entryCount; i++) {
      // check for attachments
      const checkAttach =
        formData[`isattachment_${i}`] == 'true' ? true : false;
      const checkAttach2 =
        formData[`isattachment2_${i}`] == 'true' ? true : false;
      const checkAttach3 =
        formData[`isattachment3_${i}`] == 'true' ? true : false;
      const checkAttach4 =
        formData[`isattachment4_${i}`] == 'true' ? true : false;

      // values to add in expense transaction
      let addObj = {
        officeExpenseHeadID: +formData[`officeExpenseHeadID${i}`],
        expensePriceRuleID:
          formData[`expensePriceRuleID${i}`] &&
          formData[`expensePriceRuleID${i}`] != 'null' &&
          formData[`expensePriceRuleID${i}`] != ''
            ? formData[`expensePriceRuleID${i}`]
            : null,
        expenseAmount: +formData[`expenseAmount${i}`],
        description: formData[`description${i}`],
        attachFile: null,
        attachFile2: null,
        attachFile3: null,
        attachFile4: null,
      };

      // attached files path
      addObj.attachFile =
        files[index_attch] && checkAttach
          ? `uploads/office-expense/${files[index_attch].filename}`
          : null;
      if (checkAttach) index_attch++;

      addObj.attachFile2 =
        files[index_attch] && checkAttach2
          ? `uploads/office-expense/${files[index_attch].filename}`
          : null;
      if (checkAttach2) index_attch++;

      addObj.attachFile3 =
        files[index_attch] && checkAttach3
          ? `uploads/office-expense/${files[index_attch].filename}`
          : null;
      if (checkAttach3) index_attch++;

      addObj.attachFile4 =
        files[index_attch] && checkAttach4
          ? `uploads/office-expense/${files[index_attch].filename}`
          : null;
      if (checkAttach4) index_attch++;

      expenseTransaction.push(addObj);
    }

    const orgAuthorizationdetails = await findOfficeExpenseAuthorizationDetails(
      organizationAuthorizationMasterTypes.officeExpense,
      branchMasterID,
      siteID,
    );

    let authStatus = 0;

    if (orgAuthorizationdetails) {
      if (
        +orgAuthorizationdetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO
      ) {
        authStatus = 2;
      } else {
        authStatus = 1;
      }
    }

    const addOfficeExpense = await OfficeExpense.create(
      {
        branchMasterID,
        siteID,
        expense_date,
        userMasterID: req.userDetails.userMasterId,
      },
      {
        user: req.userDetails,
        transaction,
      },
    );

    const officeExpenseHeadIDs = new Set();

    expenseTransaction.forEach((option) => {
      option['officeExpenseID'] = addOfficeExpense?.officeExpenseID;
      option['authorizationStatus'] = authStatus;
      option['AuthorizationCriteriaID'] =
        orgAuthorizationdetails &&
        +orgAuthorizationdetails.AuthorizationCriteriaID
          ? +orgAuthorizationdetails.AuthorizationCriteriaID
          : null;

      officeExpenseHeadIDs.add(option?.officeExpenseHeadID);
    });

    // create office expense transaction
    await OfficeExpenseTransaction.bulkCreate(expenseTransaction, {
      returning: true,
      transaction,
      individualHooks: true,
      user: req.userDetails,
    }).then(async (response) => {
      if (orgAuthorizationdetails) {
        const inboxArray = [];
        // authorized users data
        const getAllUserDetails = await UserMaster.findAll({
          where: {
            userMasterID: [
              ...orgAuthorizationdetails.AuthorizedByUserMasterId,
              userMasterID,
            ],
          },
          attributes: userAttributes,
        });

        // office expense head data
        const officeExpenseHeadData = await OfficeExpenseHead.findAll({
          where: {
            officeExpenseHeadID: {
              [Op.in]: [...officeExpenseHeadIDs],
            },
          },
          include: [
            {
              model: OfficeExpenseCategory,
            },
          ],
        });

        if (
          +orgAuthorizationdetails.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          for (let i = 0; i < response.length; i++) {
            const addOfficeExpAuthRequest =
              await OfficeExpenseAuthorizationRequest.create(
                {
                  ReferenceID: response[i].officeExpenseTransactionID,
                  userMasterID:
                    orgAuthorizationdetails.AuthorizedByUserMasterId[0],
                  status: 1,
                  authstatus: 2,
                },
                {
                  user: req.userDetails,
                  transaction,
                },
              );

            const authorizerData = getAllUserDetails.find(
              (user) =>
                user.userMasterID ==
                +orgAuthorizationdetails.AuthorizedByUserMasterId[0],
            );
            const userData = getAllUserDetails.find(
              (user) => user.userMasterID == userMasterID,
            );

            if (authorizerData && userData) {
              inboxArray.push({
                activityTable: OfficeExpenseAuthorizationRequest.getTableName(),
                activityTablePK:
                  addOfficeExpAuthRequest.toJSON().officeExpenseAuthRequestId,
                message: `${userData.displayName} has applied for Office Expense of ${response[i].expenseAmount}`,
                assignedTo:
                  +orgAuthorizationdetails.AuthorizedByUserMasterId[0],
                assignedBy: userMasterID,
              });
            }

            let notification = {
              title:
                'Hey ' +
                authorizerData.firstName +
                '! Someone requested for expense',
              body:
                userData.firstName +
                ' has requested for office expense approval',
            };

            let data = {
              screen: 'officeexpenserequest',
              isScheduled: 'true',
              scheduledTime: new Date().toISOString(),
            };

            sendNotification_NEW(
              authorizerData.firebaseToken,
              authorizerData.deviceType,
              notification,
              data,
            );
          }

          // if (
          //   findCompanyExpenseMailTemplate &&
          //   findCompanyNotificationPolicyData &&
          //   authorizerData.email &&
          //   userData.email
          // ) {
          //   // send mail
          //   sendMailforExpense_With_Transaction(
          //     authorizerData.email,
          //     userData,
          //     findHeadData?.expenseHead || '', //Expense Head
          //     findHeadData?.expenseCategory?.expenseCategory || '', //Expense Category
          //     response[i].expenseAmount,
          //     response[i].description,
          //     findCompanyExpenseMailTemplate,
          //     findCompanyNotificationPolicyData,
          //     ExpenseType,
          //     expense_date
          //   );
          // }
        } else {
          for (let i = 0; i < response.length; i++) {
            for (
              let j = 0;
              j < orgAuthorizationdetails.AuthorizedByUserMasterId.length;
              j++
            ) {
              const addOfficeExpAuthRequest =
                await OfficeExpenseAuthorizationRequest.create(
                  {
                    ReferenceID: response[i].officeExpenseTransactionID,
                    userMasterID:
                      orgAuthorizationdetails.AuthorizedByUserMasterId[j],
                    status: 1,
                    authstatus: 2,
                  },
                  {
                    user: req.userDetails,
                    transaction,
                  },
                );

              const authorizerData = getAllUserDetails.find(
                (user) =>
                  user.userMasterID ==
                  +orgAuthorizationdetails.AuthorizedByUserMasterId[j],
              );
              const userData = getAllUserDetails.find(
                (user) => user.userMasterID == userMasterID,
              );

              if (authorizerData && userData) {
                inboxArray.push({
                  activityTable:
                    OfficeExpenseAuthorizationRequest.getTableName(),
                  activityTablePK:
                    addOfficeExpAuthRequest.toJSON().officeExpenseAuthRequestId,
                  message: `${userData.displayName} has applied for Office Expense of ${expenseTransaction[i].expenseAmount}`,
                  assignedTo:
                    +orgAuthorizationdetails.AuthorizedByUserMasterId[j],
                  assignedBy: userMasterID,
                });
              }

              let notification = {
                title:
                  'Hey ' +
                  authorizerData?.firstName +
                  '! Someone requested for expense',
                body:
                  userData?.firstName +
                  ' has requested for office expense approval',
              };

              let data = {
                screen: 'officeexpenserequest',
                isScheduled: 'true',
                scheduledTime: new Date().toISOString(),
              };

              sendNotification_NEW(
                authorizerData.firebaseToken,
                authorizerData.deviceType,
                notification,
                data,
              );

              // if (
              //   findCompanyExpenseMailTemplate &&
              //   findCompanyNotificationPolicyData &&
              //   authorizerData.email &&
              //   userData.email
              // ) {
              //   // send mail
              //   sendMailforExpense_With_Transaction(
              //     authorizerData.email,
              //     userData,
              //     findHeadData?.expenseHead || '', //Expense Head
              //     findHeadData?.expenseCategory?.expenseCategory || '', //Expense Category
              //     response[i].expenseAmount,
              //     response[i].description,
              //     findCompanyExpenseMailTemplate,
              //     findCompanyNotificationPolicyData,
              //     ExpenseType,
              //     expense_date
              //   );
              // }
            }
          }
        }

        await UserInbox.bulkCreate(inboxArray, {
          transaction,
        });
      }
    });

    await transaction.commit();
    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: message.usermessage.addMessage('Office Expense'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
async function canApplyExpense(
  companyMasterID,
  expenseDate,
  today = new Date(),
) {
  const reponseObj = {
    canApply: true,
    message: null,
  };
  const expenseDay = moment(expenseDate).date();
  // Find the config for this company and expense day
  const config = await OfficeExpenseApplyConfig.findOne({
    where: {
      companyMasterID,
      fromDay: { [Sequelize.Op.lte]: expenseDay },
      today: { [Sequelize.Op.gte]: expenseDay },
    },
  });

  if (config) {
    const expenseMoment = moment(expenseDate);
    let applyTillMonth = expenseMoment.month() + config.applyTillMonthOffset; // 0-based
    let applyTillYear = expenseMoment.year();

    // Adjust year if month overflow (moment handles month > 11 automatically)
    const applyTillDate = moment()
      .year(applyTillYear)
      .month(applyTillMonth)
      .date(config.applyTillDay)
      .endOf('day');

    if (moment(today).isAfter(applyTillDate)) {
      reponseObj.canApply = false;
      reponseObj.message = `Expense can be applied only till ${applyTillDate.format('YYYY-MM-DD')}`;
    }
  }
  return reponseObj;
}
exports.getAllOfficeExpense = async (req, res, next) => {
  const {
    companyMasterID,
    branchMasterID,
    siteID,
    page,
    limit,
    fromDate,
    toDate,
  } = req.body;

  if (!companyMasterID && !branchMasterID && !siteID)
    return res
      .status(statusCodes.BAD_REQUEST)
      .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });

  const condition = {
    [Op.or]: [
      {
        '$site.companyMasterID$': companyMasterID,
      },
      {
        '$branchMaster.companyMasterID$': companyMasterID,
      },
    ],
    userMasterID: req?.userDetails?.userMasterId,
  };

  if (branchMasterID) condition.branchMasterID = branchMasterID;
  if (siteID) condition.siteID = siteID;

  if (fromDate && toDate) {
    condition.expense_date = {
      [Op.between]: [fromDate, toDate],
    };
  }

  const paginationQuery =
    page && limit
      ? {
          offset: (page - 1) * limit,
          limit: limit,
        }
      : {};

  const includedModels = [
    {
      model: Site,
      required: siteID ? true : false,
      attributes: ['siteName'],
    },
    {
      model: BranchMaster,
      required: branchMasterID ? true : false,
      attributes: ['branchName'],
    },
  ];

  const { rows, count } = await OfficeExpense.findAndCountAll({
    distinct: true,
    where: condition,
    include: includedModels,
    order: [['createdAt', 'DESC']],
    ...paginationQuery,
    attributes: {
      include: [
        [
          Sequelize.literal(`(
            SELECT json_build_object(
              'pending', COUNT(*) FILTER (
                WHERE oet."deletedAt" IS NULL 
                AND oet."authorizationStatus" IN (0, 1, 2)
                AND oet."status" = 1
              ),
              'approved', COUNT(*) FILTER (
                WHERE oet."deletedAt" IS NULL 
                AND oet."authorizationStatus" = 3
                AND oet."status" = 1
                AND (oet."erpJvid" IS NULL OR oet."erpJvid" = '')
                AND oet."payment_Id" IS NULL
                ),
              'paid', COUNT(*) FILTER (
                WHERE oet."deletedAt" IS NULL 
                AND oet."authorizationStatus" = 3
                AND oet."status" = 1
                AND ((oet."erpJvid" IS NOT NULL OR oet."erpJvid" != '')
                OR oet."payment_Id" IS NOT NULL)
              ),
              'rejected', COUNT(*) FILTER (
                WHERE oet."deletedAt" IS NULL 
                AND oet."authorizationStatus" = 4
                AND oet."status" = 1
              ),
              'reapplied', COUNT(*) FILTER (
                WHERE oet."deletedAt" IS NULL
                AND oet.version NOTNULL
              ),
              'total', COUNT(*) FILTER (
                WHERE oet."status" = 1
              ),
              'pendingAmount', COALESCE(SUM(
                CASE 
                  WHEN oet."deletedAt" IS NULL 
                    AND oet."authorizationStatus" IN (0, 1, 2)
                    AND oet."status" = 1
                  THEN oet."expenseAmount" 
                  ELSE 0 
                END
              ), 0),
              'approvedAmount', COALESCE(SUM(
                CASE 
                  WHEN oet."deletedAt" IS NULL 
                    AND oet."authorizationStatus" = 3
                    AND oet."status" = 1 
                   AND (oet."erpJvid" IS NULL OR oet."erpJvid" = '')
                    AND oet."payment_Id" IS NULL
                  THEN oet."expenseAmount" 
                  ELSE 0 
                END
              ), 0),
              'paidAmount', COALESCE(SUM(
                CASE 
                  WHEN oet."deletedAt" IS NULL 
                    AND oet."authorizationStatus" = 3
                    AND oet."status" = 1
                    AND ((oet."erpJvid" IS NOT NULL OR oet."erpJvid" != '')
                    OR oet."payment_Id" IS NOT NULL)
                  THEN oet."expenseAmount" 
                  ELSE 0 
                END
              ), 0),
              'rejectedAmount', COALESCE(SUM(
                CASE 
                  WHEN oet."deletedAt" IS NULL 
                    AND oet."authorizationStatus" = 4
                    AND oet."status" = 1
                  THEN oet."expenseAmount" 
                  ELSE 0 
                END
              ), 0),
              'totalExpenseAmount', COALESCE(SUM(
                CASE 
                  WHEN oet."deletedAt" IS NULL 
                    AND oet."status" = 1
                  THEN oet."expenseAmount" 
                  ELSE 0 
                END
              ), 0),
               'reappliedAmount', COALESCE(SUM(
                CASE 
                  WHEN oet."deletedAt" IS NULL
                    AND oet.version NOTNULL
                  THEN oet."expenseAmount" 
                  ELSE 0 
                END
              ), 0)
            )
            FROM "officeExpenseTransactions" AS oet 
            WHERE oet."officeExpenseID" = "officeExpenses"."officeExpenseID" AND oet."deletedAt" IS NULL AND oet."status" != 10
          )`),
          'expenseSummary',
        ],
      ],
    },
  });

  const calculationCondition = {
    status: {
      [Sequelize.Op.ne]: 10,
    },
    '$officeExpense.expense_date$':
      fromDate && toDate
        ? {
            [Op.between]: [fromDate, toDate],
          }
        : {
            [Op.ne]: null,
          },
    [Op.or]: [
      {
        '$officeExpense.site.companyMasterID$': companyMasterID,
      },
      {
        '$officeExpense.branchMaster.companyMasterID$': companyMasterID,
      },
    ],
    '$officeExpense.userMasterID$': req?.userDetails?.userMasterId,
  };

  const officeExpenseCalculations = await OfficeExpenseTransaction.findAll({
    where: calculationCondition,
    attributes: [
      [
        sequelize.literal('"officeExpenseTransactions"."authorizationStatus"'),
        'authorizationStatus',
      ],
      [sequelize.fn('SUM', sequelize.col('expenseAmount')), 'totalExpense'],
      'erpJvid',
      'payment_Id',
    ],
    group: [
      '"officeExpenseTransactions"."authorizationStatus"',
      'erpJvid',
      'payment_Id',
      'officeExpenseTransactions.officeExpenseTransactionID',
      'officeExpense.officeExpenseID',
      'officeExpense.branchMaster.branchMasterID',
      'officeExpense.site.siteID',
    ],
    include: [
      {
        model: OfficeExpense,
        as: 'officeExpense',
        include: [
          {
            model: BranchMaster,
          },
          {
            model: Site,
          },
        ],
        attributes: [
          'officeExpenseID',
          'expense_date',
          'branchMasterID',
          'siteID',
          'createBy',
          'status',
          'userMasterID',
        ],
      },
    ],
  });

  const Calculation = { Accepted: 0, Pending: 0, Rejected: 0, Paid: 0 };
  for (let element of officeExpenseCalculations) {
    const jsonElement = element.toJSON();
    if (
      +jsonElement.authorizationStatus === 0 ||
      +jsonElement.authorizationStatus === 1 ||
      +jsonElement.authorizationStatus === 2
    )
      Calculation.Pending += +jsonElement.totalExpense;
    if (
      +jsonElement.authorizationStatus === 3 &&
      !jsonElement.erpJvid &&
      !jsonElement.payment_Id
    )
      Calculation.Accepted += +jsonElement.totalExpense;
    if (
      +jsonElement.authorizationStatus === 3 &&
      (jsonElement.erpJvid || jsonElement.payment_Id)
    )
      Calculation.Paid += +jsonElement.totalExpense;
    if (+jsonElement.authorizationStatus === 4)
      Calculation.Rejected += +jsonElement.totalExpense;
  }

  return res.status(statusCodes.OK).json({
    status: statusCodes.OK,
    data: rows,
    totalcount: count,
    officeExpenseCalculations: Calculation,
  });
};

exports.getOfficeExpenseByID = async (req, res, next) => {
  try {
    const { officeExpenseID } = req.body;

    if (!officeExpenseID)
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });

    const expenseAuthCondition = {};
    expenseAuthCondition.status = 1;
    expenseAuthCondition.userMasterID = req.userDetails.userMasterId;

    const includedModels = [
      {
        model: BranchMaster,
        attributes: ['branchName', 'companyMasterID', 'branchMasterID'],
      },
      {
        model: Site,
        attributes: ['siteName', 'siteID', 'branchMasterID'],
        include: [
          {
            model: BranchMaster,
            attributes: ['branchName'],
          },
        ],
      },
      {
        separate: true,
        model: OfficeExpenseTransaction,
        where: { status: { [Sequelize.Op.ne]: 10 } },
        include: [
          {
            model: OfficeExpenseHead,
            attributes: ['officeExpenseCategoryID', 'officeExpenseHead'],
            include: [
              {
                model: OfficeExpenseCategory,
                attributes: ['officeExpenseCategory'],
              },
            ],
          },
          {
            required: false,
            model: AuthorizationCriteriaMaster,
            attributes: ['AuthorizationCriteriaID', 'AuthorizationCriteria'],
          },
          {
            separate: true,
            model: OfficeExpenseAuthorizationRequest,
            include: [
              {
                required: true,
                model: UserMaster,
                as: 'authorizedPerson',
                attributes: userAttributes,
              },
            ],
          },
          {
            separate: true,
            model: OfficeExpenseAuthorizationRequest,
            as: 'Auth',
            where: expenseAuthCondition,
          },
        ],
      },
      {
        model: UserMaster,
        attributes: ['displayName', 'userNumber'],
        include: [
          {
            required: false,
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
        ],
      },
    ];

    const data = await OfficeExpense.findOne({
      where: {
        officeExpenseID,
      },
      include: includedModels,
    });

    return res.status(statusCodes.OK).json({
      data,
      status: statusCodes.OK,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOfficeExpenseByIDV2 = async (req, res, next) => {
  try {
    const { officeExpenseID } = req.body;

    if (!officeExpenseID)
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });

    const expenseAuthCondition = {};
    expenseAuthCondition.status = 1;
    expenseAuthCondition.userMasterID = req.userDetails.userMasterId;

    const includedModels = [
      {
        model: BranchMaster,
        attributes: ['branchName', 'companyMasterID', 'branchMasterID'],
      },
      {
        model: Site,
        attributes: ['siteName', 'siteID', 'branchMasterID'],
        include: [
          {
            model: BranchMaster,
            attributes: ['branchName'],
          },
        ],
      },
      {
        separate: true,
        model: OfficeExpenseTransaction,
        where: { status: { [Sequelize.Op.ne]: 10 } },
        include: [
          {
            model: OfficeExpenseHead,
            attributes: ['officeExpenseCategoryID', 'officeExpenseHead'],
            include: [
              {
                model: OfficeExpenseCategory,
                attributes: ['officeExpenseCategory'],
              },
            ],
          },
          {
            required: false,
            model: AuthorizationCriteriaMaster,
            attributes: ['AuthorizationCriteriaID', 'AuthorizationCriteria'],
          },
          {
            separate: true,
            model: OfficeExpenseAuthorizationRequest,
            include: [
              {
                required: true,
                model: UserMaster,
                as: 'authorizedPerson',
                attributes: userAttributes,
              },
            ],
          },
          {
            separate: true,
            model: OfficeExpenseAuthorizationRequest,
            as: 'Auth',
            where: expenseAuthCondition,
          },
        ],
      },
      {
        model: UserMaster,
        attributes: ['displayName', 'userNumber'],
        include: [
          {
            required: false,
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
        ],
      },
    ];

    const data = await OfficeExpense.findOne({
      where: {
        officeExpenseID,
        // userMasterID: req.userDetails.userMasterId,
      },
      include: includedModels,
    });
    if (!data) {
      return res
        .status(200)
        .json({
          status: 400,
          message: 'office expense for this user not found',
        });
    }

    return res.status(statusCodes.OK).json({
      data,
      status: statusCodes.OK,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOfficeExpense = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const formData = req.body;
    const userMasterID = +req.userDetails.userMasterId;
    const officeExpenseID = +formData['officeExpenseID'];
    const companyMasterID = +formData['companyMasterID'];
    const files = req.files;
    const entryCount = Object.keys(formData).filter((key) =>
      key.startsWith('officeExpenseHeadID'),
    ).length;
    const branchMasterID = formData[`branchMasterID`]
      ? formData[`branchMasterID`]
      : null;
    const siteID = formData[`siteID`] ? formData[`siteID`] : null;
    if (!branchMasterID && !siteID) {
      await transaction.rollback();
      return res
        .status(200)
        .json({ status: 401, message: message.usermessage.ValidParameters });
    }
    const expenseTransaction = [];
    let index_attch = 0;

    const expenseTransactionTobeDestroyed = [];
    const expenseTransactionTobeAdd = [];
    const expenseTransactionTobeUpdate = [];
    const officeExpenseTransactionIDs = [];

    for (let i = 0; i < entryCount; i++) {
      const checkAttach =
        formData[`isNewAttachment_${i}`] == 'true' ? true : false;
      const checkAttach2 =
        formData[`isNewAttachment2_${i}`] == 'true' ? true : false;
      const checkAttach3 =
        formData[`isNewAttachment3_${i}`] == 'true' ? true : false;
      const checkAttach4 =
        formData[`isNewAttachment4_${i}`] == 'true' ? true : false;

      let addObj = {
        officeExpenseHeadID: +formData[`officeExpenseHeadID${i}`],
        expensePriceRuleID:
          formData[`expensePriceRuleID${i}`] &&
          formData[`expensePriceRuleID${i}`] != 'null' &&
          formData[`expensePriceRuleID${i}`] != ''
            ? formData[`expensePriceRuleID${i}`]
            : null,
        expenseAmount: +formData[`expenseAmount${i}`],
        description: formData[`description${i}`],
        attachFile: null,
        attachFile2: null,
        attachFile3: null,
        attachFile4: null,
        officeExpenseTransactionID: formData[`officeExpenseTransactionID_${i}`]
          ? formData[`officeExpenseTransactionID_${i}`]
          : null,
      };

      if (addObj.officeExpenseTransactionID) {
        if (Array.isArray(addObj.officeExpenseTransactionID)) {
          addObj.officeExpenseTransactionID.forEach((x) =>
            officeExpenseTransactionIDs.push(x),
          );
        } else {
          officeExpenseTransactionIDs.push(addObj.officeExpenseTransactionID);
        }
      }

      addObj.attachFile =
        files[index_attch] && checkAttach
          ? `uploads/office-expense/${files[index_attch].filename}`
          : formData[`attachFile1_${i}`]
            ? formData[`attachFile1_${i}`]
            : null;
      if (checkAttach) index_attch++;

      addObj.attachFile2 =
        files[index_attch] && checkAttach2
          ? `uploads/office-expense/${files[index_attch].filename}`
          : formData[`attachFile2_${i}`]
            ? formData[`attachFile2_${i}`]
            : null;
      if (checkAttach2) index_attch++;

      addObj.attachFile3 =
        files[index_attch] && checkAttach3
          ? `uploads/office-expense/${files[index_attch].filename}`
          : formData[`attachFile3_${i}`]
            ? formData[`attachFile3_${i}`]
            : null;
      if (checkAttach3) index_attch++;

      addObj.attachFile4 =
        files[index_attch] && checkAttach4
          ? `uploads/office-expense/${files[index_attch].filename}`
          : formData[`attachFile4_${i}`]
            ? formData[`attachFile4_${i}`]
            : null;
      if (checkAttach4) index_attch++;

      if (formData[`isRemoved_${i}`] == 'true') {
        expenseTransactionTobeDestroyed.push(addObj);
      } else if (formData[`isNewAdded_${i}`] == 'true') {
        expenseTransactionTobeAdd.push(addObj);
      } else if (
        formData[`authorizationStatus${i}`] &&
        (formData[`authorizationStatus${i}`] != '3' ||
          formData[`authorizationStatus${i}`] != '4')
      ) {
        expenseTransactionTobeUpdate.push(addObj);
      }
    }

    const filesString = formData[`filesTobeRemoved`]
      ? formData[`filesTobeRemoved`]
      : '';
    const filesTobeRemove = filesString.split(',').map((file) => file.trim());

    for (let file of filesTobeRemove) {
      if (file) {
        const filePath = path.join(__dirname, `../${file}`);
        fs.unlink(filePath, function (err) {});
      }
    }

    const [
      findCompanyExpenseMailTemplate,
      findCompanyNotificationPolicyData,
      findOfficeExpense,
      findExpenseRequestData,
    ] = await Promise.all([
      mailTemplateEditor.findOne({
        where: {
          status: 1,
          mailTypeID: mailTemplateTypes.expenseMailTemplate,
          companyMasterID: companyMasterID,
        },
      }),
      findCompanyNotificationPolicy(companyMasterID),
      OfficeExpense.findOne({
        where: {
          officeExpenseID: officeExpenseID,
        },
        include: [
          {
            model: UserMaster,
            as: 'createdBy',
            attributes: userAttributes,
          },
        ],
      }),
      OfficeExpenseAuthorizationRequest.findAll({
        where: {
          ReferenceID: {
            [Sequelize.Op.in]: officeExpenseTransactionIDs,
          },
        },
      }),
    ]);
    if (expenseTransactionTobeAdd.length) {
      const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);

      if (ProjectName == projectNamesList.MARS) {
        const reponseData = await canApplyExpense(
          companyMasterID,
          findOfficeExpense.expense_date,
          currentdate,
        );
        if (!reponseData.canApply) {
          await transaction.rollback();
          return res.status(200).json({
            status: 401,
            message: reponseData.message,
          });
        }
      }
    }
    const promiseArray = [];

    for (let trans of expenseTransactionTobeDestroyed) {
      const AuthorizationRequestIds = findExpenseRequestData
        .filter((e) => +e.ReferenceID == +trans.officeExpenseTransactionID)
        .map((e) => +e.AuthorizationRequestId);

      const destroyInbox = UserInbox.destroy(
        {
          where: {
            activityTable: OfficeExpenseAuthorizationRequest.getTableName(),
            activityTablePK: {
              [Sequelize.Op.in]: AuthorizationRequestIds,
            },
          },
        },
        { transaction },
      );
      promiseArray.push(destroyInbox);

      const destroyAuth = OfficeExpenseAuthorizationRequest.destroy(
        {
          where: {
            AuthorizationRequestId: {
              [Sequelize.Op.in]: AuthorizationRequestIds,
            },
          },
        },
        { transaction },
      );
      promiseArray.push(destroyAuth);
      const destroyTrans = OfficeExpenseTransaction.destroy(
        {
          where: {
            officeExpenseTransactionID: +trans.officeExpenseTransactionID,
          },
        },
        { transaction },
      );
      promiseArray.push(destroyTrans);
    }

    for (let trans of expenseTransactionTobeUpdate) {
      const AuthorizationRequestIds = findExpenseRequestData
        .filter((e) => e.ReferenceID == trans.officeExpenseTransactionID)
        .map((e) => e.officeExpenseAuthRequestId);

      const updateInbox = UserInbox.update(
        {
          message: `${findOfficeExpense.createdBy?.displayName} has applied for Office Expense of ${trans.expenseAmount}`,
        },
        {
          where: {
            activityTable: OfficeExpenseAuthorizationRequest.getTableName(),
            activityTablePK: { [Sequelize.Op.in]: AuthorizationRequestIds },
          },
          transaction,
        },
      );
      promiseArray.push(updateInbox);
      const updateTrans = await OfficeExpenseTransaction.update(
        {
          officeExpenseHeadID: trans.officeExpenseHeadID,
          expenseAmount: trans.expenseAmount,
          attachFile: trans.attachFile,
          attachFile2: trans.attachFile2,
          attachFile3: trans.attachFile3,
          attachFile4: trans.attachFile4,
          description: trans.description,
          officeExpenseID: officeExpenseID,
          expensePriceRuleID: trans.expensePriceRuleID,
        },
        {
          where: {
            officeExpenseTransactionID: trans.officeExpenseTransactionID,
          },
          transaction,
          user: req.userDetails,
        },
      );
      promiseArray.push(updateTrans);
    }

    const orgAuthorizationdetails = await findOfficeExpenseAuthorizationDetails(
      organizationAuthorizationMasterTypes.officeExpense,
      branchMasterID,
      siteID,
    );

    let authStatus = 0;
    if (orgAuthorizationdetails) {
      if (
        +orgAuthorizationdetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO
      ) {
        authStatus = 2;
      } else {
        authStatus = 1;
      }
    }
    const createExpenseTrnas = [];
    const expenseHeadIds = new Set();

    const inboxArray = [];

    for (let trans of expenseTransactionTobeAdd) {
      const createTransObj = {
        officeExpenseID,
        officeExpenseHeadID: trans.officeExpenseHeadID,
        expensePriceRuleID: trans.expensePriceRuleID,
        expenseAmount: trans.expenseAmount,
        attachFile: trans.attachFile ? trans.attachFile : null,
        attachFile2: trans.attachFile2 ? trans.attachFile2 : null,
        attachFile3: trans.attachFile3 ? trans.attachFile3 : null,
        attachFile4: trans.attachFile4 ? trans.attachFile4 : null,
        description: trans.description,
        authorizationStatus: authStatus,
        AuthorizationCriteriaID:
          orgAuthorizationdetails &&
          +orgAuthorizationdetails.AuthorizationCriteriaID
            ? +orgAuthorizationdetails.AuthorizationCriteriaID
            : null,
      };
      createExpenseTrnas.push(createTransObj);
      expenseHeadIds.add(trans.officeExpenseHeadID);
    }
    await OfficeExpenseTransaction.bulkCreate(createExpenseTrnas, {
      returning: true,
      transaction,
      individualHooks: true,
      user: req.userDetails,
    }).then(async (response) => {
      if (orgAuthorizationdetails) {
        const getAllUserDetails = await UserMaster.findAll({
          distinct: true,
          where: {
            userMasterID: [
              ...orgAuthorizationdetails.AuthorizedByUserMasterId,
              findOfficeExpense.userMasterID,
            ],
          },
          attributes: userAttributes,
        });

        const findOfficeExpenseHeadData = await OfficeExpenseHead.findAll({
          where: {
            officeExpenseHeadID: {
              [Sequelize.Op.in]: [...expenseHeadIds],
            },
          },
          include: [
            {
              model: OfficeExpenseCategory,
            },
          ],
        });

        if (
          +orgAuthorizationdetails.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          for (let i = 0; i < response.length; i++) {
            const findOfficeHeadData = findOfficeExpenseHeadData.find(
              (e) => e.officeExpenseHeadID == response[i].officeExpenseHeadID,
            );

            const addOfficeExpAuthRequest =
              await OfficeExpenseAuthorizationRequest.create(
                {
                  ReferenceID: response[i].officeExpenseTransactionID,
                  userMasterID:
                    orgAuthorizationdetails.AuthorizedByUserMasterId[0],
                  status: 1,
                  authstatus: 2,
                },
                {
                  user: req.userDetails,
                  transaction,
                },
              );

            const authorizerData = getAllUserDetails.find(
              (user) =>
                user.userMasterID ==
                +orgAuthorizationdetails.AuthorizedByUserMasterId[0],
            );
            const userData = getAllUserDetails.find(
              (user) => user.userMasterID == userMasterID,
            );
            if (authorizerData && userData) {
              inboxArray.push({
                activityTable: OfficeExpenseAuthorizationRequest.getTableName(),
                activityTablePK:
                  addOfficeExpAuthRequest.toJSON().officeExpenseAuthRequestId,
                message: `${userData.displayName} has applied for Office Expense of ${response[i].expenseAmount}`,
                assignedTo:
                  +orgAuthorizationdetails.AuthorizedByUserMasterId[0],
                assignedBy: userMasterID,
              });
            }

            let notification = {
              title:
                'Hey ' +
                authorizerData.firstName +
                '! Someone requested for expense',
              body:
                userData.firstName +
                ' has requested for office expense approval',
            };

            let data = {
              screen: 'officeexpenserequest',
              isScheduled: 'true',
              scheduledTime: new Date().toISOString(),
            };

            sendNotification_NEW(
              authorizerData.firebaseToken,
              authorizerData.deviceType,
              notification,
              data,
            );

            if (
              findCompanyExpenseMailTemplate &&
              findCompanyNotificationPolicyData &&
              authorizerData.email &&
              userData.email
            ) {
              // send mail
              sendMailforExpense_With_Transaction(
                authorizerData.email,
                userData,
                findOfficeHeadData?.officeExpenseHead || '', //Expense Head
                findOfficeHeadData?.officeExpenseCategory[0]
                  ?.officeExpenseCategory || '', //Expense Category
                response[i].expenseAmount,
                response[i].description,
                findCompanyExpenseMailTemplate,
                findCompanyNotificationPolicyData,
                // ExpenseType,
                findOfficeExpense.expense_date,
              );
            }
          }
        } else {
          for (let i = 0; i < response.length; i++) {
            const findOfficeHeadData = findOfficeExpenseHeadData.find(
              (e) => e.officeExpenseHeadID == response[i].officeExpenseHeadID,
            );
            for (
              let j = 0;
              j < orgAuthorizationdetails.AuthorizedByUserMasterId.length;
              j++
            ) {
              const addOfficeExpAuthRequest =
                await OfficeExpenseAuthorizationRequest.create(
                  {
                    ReferenceID: response[i].officeExpenseTransactionID,
                    userMasterID:
                      orgAuthorizationdetails.AuthorizedByUserMasterId[j],
                    status: 1,
                    authstatus: 2,
                  },
                  {
                    user: req.userDetails,
                    transaction,
                  },
                );

              const authorizerData = getAllUserDetails.find(
                (user) =>
                  user.userMasterID ==
                  +orgAuthorizationdetails.AuthorizedByUserMasterId[j],
              );
              const userData = getAllUserDetails.find(
                (user) => user.userMasterID == userMasterID,
              );

              if (authorizerData && userData) {
                inboxArray.push({
                  activityTable:
                    OfficeExpenseAuthorizationRequest.getTableName(),
                  activityTablePK:
                    addOfficeExpAuthRequest.toJSON().officeExpenseAuthRequestId,
                  message: `${userData.displayName} has applied for Office Expense of ${response[i].expenseAmount}`,
                  assignedTo:
                    +orgAuthorizationdetails.AuthorizedByUserMasterId[j],
                  assignedBy: userMasterID,
                });
              }

              let notification = {
                title:
                  'Hey ' +
                  authorizerData?.firstName +
                  '! Someone requested for expense',
                body:
                  userData?.firstName +
                  ' has requested for office expense approval',
              };

              let data = {
                screen: 'officeexpenserequest',
                isScheduled: 'true',
                scheduledTime: new Date().toISOString(),
              };

              sendNotification_NEW(
                authorizerData.firebaseToken,
                authorizerData.deviceType,
                notification,
                data,
              );

              if (
                findCompanyExpenseMailTemplate &&
                findCompanyNotificationPolicyData &&
                authorizerData?.email &&
                userData.email
              ) {
                // send mail
                // sendMailforExpense_With_Transaction(
                //   authorizerData.email,
                //   userData,
                //   findOfficeHeadData?.officeExpenseHead || '', //Expense Head
                //   findOfficeHeadData?.officeExpenseCategory[0]?.officeExpenseCategory || '', //Expense Category
                //   response[j].expenseAmount,
                //   response[j].description,
                //   findCompanyExpenseMailTemplate,
                //   findCompanyNotificationPolicyData,
                //   ExpenseType,
                //   findUserExpense.expense_date
                // );
              }
            }
          }
        }
      }
    });

    await Promise.all([
      await UserInbox.bulkCreate(inboxArray, {
        transaction,
      }),
      ...promiseArray,
    ]);
    await transaction.commit();
    return res.status(200).json({
      message: message.usermessage.updateMessage('Office Expense'),
      status: 200,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.deleteOfficeExpense = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let officeExpenseID = req.params.id;
    if (!officeExpenseID) {
      await transaction.rollback();
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });
    }

    const findOfficeExpenseData = await OfficeExpense.findOne({
      where: { officeExpenseID },
      include: [
        {
          model: OfficeExpenseTransaction,
          attributes: [
            'officeExpenseTransactionID',
            'officeExpenseID',
            'version',
            'authorizationStatus',
          ],
          include: [
            {
              separate: true,
              model: OfficeExpenseAuthorizationRequest,
              attributes: [
                'officeExpenseAuthRequestId',
                'ReferenceID',
                'userMasterID',
                'status',
                'authstatus',
              ],
            },
          ],
        },
      ],
    });

    if (!findOfficeExpenseData) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        message: message.usermessage.notFoundMessage('Office Expense'),
        status: 401,
      });
    }

    const findApprovedRejectedTras =
      findOfficeExpenseData?.officeExpenseTransactions?.filter(
        (e) =>
          +e.authorizationStatus != 0 &&
          +e.authorizationStatus != 1 &&
          +e.authorizationStatus != 2,
      );

    if (findApprovedRejectedTras.length) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        message:
          'You Can not Delete Office Expense Some Of Transaction is Approved Or Rejected',
        status: 401,
      });
    }

    const findTobeDeleteTransactionIDs =
      findOfficeExpenseData?.officeExpenseTransactions?.map(
        (e) => +e.officeExpenseTransactionID,
      );

    const authorizationRequestIds =
      findOfficeExpenseData.officeExpenseTransactions.reduce((acc, tx) => {
        if (Array.isArray(tx.officeExpenseAuths)) {
          for (const auth of tx.officeExpenseAuths) {
            acc.push(+auth.officeExpenseAuthRequestId);
          }
        }
        return acc;
      }, []);

    await Promise.all([
      UserInbox.destroy({
        where: {
          activityTable: OfficeExpenseAuthorizationRequest.getTableName(),
          activityTablePK: authorizationRequestIds,
        },
        transaction,
      }),
      OfficeExpenseAuthorizationRequest.destroy({
        where: {
          ReferenceID: findTobeDeleteTransactionIDs,
        },
        transaction,
      }),
      OfficeExpenseTransaction.destroy({
        where: {
          officeExpenseID,
        },
        transaction,
      }),
      OfficeExpense.destroy({
        where: { officeExpenseID },
        transaction,
      }),
    ]);
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Office Expense'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.deleteOfficeExpenseV2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    // let officeExpenseID = req.params.id;
    const { officeExpenseID, userMasterID } = req.body;
    if (!officeExpenseID) {
      await transaction.rollback();
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });
    }

    const findOfficeExpenseData = await OfficeExpense.findOne({
      where: { officeExpenseID: officeExpenseID, userMasterID: userMasterID },
      include: [
        {
          model: OfficeExpenseTransaction,
          attributes: [
            'officeExpenseTransactionID',
            'officeExpenseID',
            'version',
            'authorizationStatus',
          ],
          include: [
            {
              separate: true,
              model: OfficeExpenseAuthorizationRequest,
              attributes: [
                'officeExpenseAuthRequestId',
                'ReferenceID',
                'userMasterID',
                'status',
                'authstatus',
              ],
            },
          ],
        },
      ],
    });

    if (!findOfficeExpenseData) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        message: message.usermessage.notFoundMessage('Office Expense'),
        status: 401,
      });
    }

    const findApprovedRejectedTras =
      findOfficeExpenseData?.officeExpenseTransactions?.filter(
        (e) =>
          +e.authorizationStatus != 0 &&
          +e.authorizationStatus != 1 &&
          +e.authorizationStatus != 2,
      );

    if (findApprovedRejectedTras.length) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        message:
          'You Can not Delete Office Expense Some Of Transaction is Approved Or Rejected',
        status: 401,
      });
    }

    const findTobeDeleteTransactionIDs =
      findOfficeExpenseData?.officeExpenseTransactions?.map(
        (e) => +e.officeExpenseTransactionID,
      );

    const authorizationRequestIds =
      findOfficeExpenseData.officeExpenseTransactions.reduce((acc, tx) => {
        if (Array.isArray(tx.officeExpenseAuths)) {
          for (const auth of tx.officeExpenseAuths) {
            acc.push(+auth.officeExpenseAuthRequestId);
          }
        }
        return acc;
      }, []);

    await Promise.all([
      UserInbox.destroy({
        where: {
          activityTable: OfficeExpenseAuthorizationRequest.getTableName(),
          activityTablePK: authorizationRequestIds,
        },
        transaction,
      }),
      OfficeExpenseAuthorizationRequest.destroy({
        where: {
          ReferenceID: findTobeDeleteTransactionIDs,
        },
        transaction,
      }),
      OfficeExpenseTransaction.destroy({
        where: {
          officeExpenseID,
        },
        transaction,
      }),
      OfficeExpense.destroy({
        where: { officeExpenseID: officeExpenseID, userMasterID: userMasterID },
        transaction,
      }),
    ]);
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Office Expense'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.exportOfficeExpense = async (req, res, next) => {
  try {
    const { companyMasterID, branchMasterID, siteID, fromDate, toDate } =
      req.body;

    if (!companyMasterID && !branchMasterID && !siteID)
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });

    const condition = {
      [Op.or]: [
        {
          '$site.companyMasterID$': companyMasterID,
        },
        {
          '$branchMaster.companyMasterID$': companyMasterID,
        },
      ],
      userMasterID: req?.userDetails?.userMasterId,
    };

    if (branchMasterID) condition.branchMasterID = branchMasterID;
    if (siteID) condition.siteID = siteID;

    let finalDataToExport = [];

    if (fromDate && toDate) {
      if (fromDate > toDate) {
        return res
          .status(statusCodes.BAD_REQUEST)
          .json({ message: message.usermessagevalidDateRange() });
      }
      condition.expense_date = {
        [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
      };
    }

    const officeExpenseData = await OfficeExpense.findAll({
      where: condition,
      order: [['expense_date', 'DESC']],
      distinct: true,
      include: [
        {
          separate: true,
          required: true,
          model: OfficeExpenseTransaction,
          where: {
            status: { [Sequelize.Op.ne]: 10 },
          },
          order: [['officeExpenseTransactionID', 'ASC']],
          include: [
            {
              model: OfficeExpenseHead,
              attributes: [
                'officeExpenseHeadID',
                'officeExpenseHead',
                'officeExpenseCategoryID',
              ],
              include: [
                {
                  model: OfficeExpenseCategory,
                  attributes: ['officeExpenseCategory'],
                },
              ],
            },
            {
              model: OfficeExpenseAuthorizationRequest,
              as: 'Auth',
              attributes: [
                'officeExpenseAuthRequestId',
                'ReferenceID',
                'userMasterID',
                'authstatus',
                'remarks',
              ],
            },
          ],
        },
        {
          model: BranchMaster,
          attributes: ['branchName'],
        },
        {
          model: Site,
          attributes: ['siteName'],
        },
      ],
    });

    const allUsersID = officeExpenseData.flatMap(
      (x) =>
        x.officeExpenseTransactions?.flatMap(
          (trans) => trans.Auth?.flatMap((auth) => auth?.userMasterID) ?? [],
        ) ?? [],
    );

    const allUsersData = await UserMaster.findAll({
      where: {
        userMasterID: allUsersID,
      },
    });

    let index = 0;
    for (let expense of officeExpenseData) {
      for (let tran of expense.officeExpenseTransactions) {
        let expenseAuthStatus =
          +tran.authorizationStatus == 4
            ? 'Rejected'
            : +tran.authorizationStatus == 3 &&
                !tran.erpJvid &&
                !tran.payment_Id
              ? 'Approved'
              : +tran.authorizationStatus == 3 &&
                  (tran.erpJvid || tran.payment_Id)
                ? 'Paid'
                : 'Pending';

        const authData = [];
        for (let auth of tran.Auth) {
          const authSatus =
            +auth.authstatus == 0
              ? 'Rejected'
              : +auth.authstatus == 1
                ? 'Approved'
                : 'Pending';

          const authorizedPerson = allUsersData.find(
            (user) => user.userMasterID == auth.userMasterID,
          );

          authData.push(`${authSatus} - ${authorizedPerson.displayName}`);
        }

        const Info = [
          index + 1,
          expense?.branchMaster?.branchName || '',
          expense?.site?.siteName || '',
          moment(expense.expense_date, 'YYYY-MM-DD').format('DD-MM-YYYY') || '',
          expense.officeExpenseID,
          moment(new Date(expense.createdAt)).format('DD-MM-YYYY') || '',
          tran.officeExpenseHead?.officeExpenseCategory
            ?.officeExpenseCategory || '', //Main Category
          tran.officeExpenseHead?.officeExpenseHead || '', //Sub Category
          tran.expenseAmount, // Expense Amount
          tran.description, //Description
          expenseAuthStatus,
          authData && authData.length > 0 ? authData.join(', ') : '',
          tran.attachFile && tran.attachFile.startsWith('uploads')
            ? `${mainApiUrl}${tran.attachFile}`
            : ' ',
          tran.attachFile2 && tran.attachFile2.startsWith('uploads')
            ? `${mainApiUrl}${tran.attachFile2}`
            : ' ',
          tran.attachFile3 && tran.attachFile3.startsWith('uploads')
            ? `${mainApiUrl}${tran.attachFile3}`
            : ' ',
          tran.attachFile4 && tran.attachFile4.startsWith('uploads')
            ? `${mainApiUrl}${tran.attachFile4}`
            : ' ',
        ];
        finalDataToExport.push(Info);
      }
      index++;
    }
    return await generateExcelForOfficeExpense(
      finalDataToExport,
      'Office Expense Report',
      'xlsx',
      res,
    );
  } catch (error) {
    next(error);
  }
};

exports.reapplyOfficeExpense = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const formData = req.body;

    const createObj = {
      oldExpenseTransID: +formData['oldExpenseTransID'],
      expenseAmount: +formData['expenseAmount'],
      description: formData['description'],
    };

    if (!createObj.oldExpenseTransID) {
      await transaction.rollback();
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });
    }

    const oldOfficeExpTransaction = await OfficeExpenseTransaction.findOne({
      where: {
        officeExpenseTransactionID: createObj.oldExpenseTransID,
      },
      include: [
        {
          model: OfficeExpense,
          as: 'officeExpense',
        },
      ],
    });

    createObj.officeExpenseHeadID = oldOfficeExpTransaction.officeExpenseHeadID;
    createObj.officeExpenseID = oldOfficeExpTransaction.officeExpenseID;

    let i = 0;
    if (formData['isNewAttachment'] == 'true') {
      createObj.attachFile =
        req.files && req.files[i]
          ? `uploads/office-expense/${req.files[i].filename}`
          : attachFile && attachFile != 'null'
            ? attachFile
            : null;
      i++;
    }
    if (formData['isNewAttachment2'] == 'true') {
      createObj.attachFile2 =
        req.files && req.files[i]
          ? `uploads/office-expense/${req.files[i].filename}`
          : attachFile2 && attachFile2 != 'null'
            ? attachFile2
            : null;
      i++;
    }
    if (formData['isNewAttachment3'] == 'true') {
      createObj.attachFile3 =
        req.files && req.files[i]
          ? `uploads/office-expense/${req.files[i].filename}`
          : attachFile3 && attachFile3 != 'null'
            ? attachFile3
            : null;
      i++;
    }
    if (formData['isNewAttachment4'] == 'true') {
      createObj.attachFile4 =
        req.files && req.files[i]
          ? `uploads/office-expense/${req.files[i].filename}`
          : attachFile4 && attachFile4 != 'null'
            ? attachFile4
            : null;
    }
    const filesTobeRemoved = formData['filesTobeRemoved'];
    const filesString = filesTobeRemoved ? filesTobeRemoved : '';
    const filesTobeRemove = filesString.split(',').map((file) => file.trim());

    for (let file of filesTobeRemove) {
      const filePath = path.join(__dirname, `../${file}`);
      fs.unlink(filePath, function (err) {});
    }

    const orgAuthorizationdetails = await findOfficeExpenseAuthorizationDetails(
      organizationAuthorizationMasterTypes.officeExpense,
      oldOfficeExpTransaction?.officeExpense?.branchMasterID,
      oldOfficeExpTransaction?.officeExpense?.siteID,
    );

    createObj.authorizationStatus = 0;
    if (orgAuthorizationdetails) {
      if (
        +orgAuthorizationdetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO
      ) {
        createObj.authorizationStatus = 2;
      } else {
        createObj.authorizationStatus = 1;
      }
    }

    await OfficeExpenseTransaction.update(
      {
        status: 10,
      },
      {
        where: { officeExpenseTransactionID: createObj.oldExpenseTransID },
        transaction,
        user: req.userDetails,
      },
    );

    createObj.version =
      oldOfficeExpTransaction.version == null
        ? 1
        : +oldOfficeExpTransaction.version + 1;

    const createOfficeExpenseTransaction =
      await OfficeExpenseTransaction.create(createObj, {
        user: req.userDetails,
        transaction,
      });

    if (orgAuthorizationdetails) {
      const inboxArray = [];
      const allUserDetails = await UserMaster.findAll({
        where: {
          userMasterID: [
            ...orgAuthorizationdetails.AuthorizedByUserMasterId,
            oldOfficeExpTransaction?.officeExpense?.userMasterID,
          ],
        },
      });

      if (
        +orgAuthorizationdetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO
      ) {
        const addOfficeExpAuthRequest =
          await OfficeExpenseAuthorizationRequest.create(
            {
              ReferenceID:
                createOfficeExpenseTransaction.officeExpenseTransactionID,
              userMasterID:
                +orgAuthorizationdetails.AuthorizedByUserMasterId[0],
              status: 1,
              authstatus: 2,
            },
            {
              user: req.userDetails,
              transaction,
            },
          );

        const authorizerData = allUserDetails.find(
          (user) =>
            user.userMasterID ==
            +orgAuthorizationdetails.AuthorizedByUserMasterId[0],
        );
        const userData = allUserDetails.find(
          (user) =>
            user.userMasterID ==
            oldOfficeExpTransaction?.officeExpense?.userMasterID,
        );
        if (authorizerData && userData) {
          inboxArray.push({
            activityTable: OfficeExpenseAuthorizationRequest.getTableName(),
            activityTablePK:
              addOfficeExpAuthRequest.toJSON().officeExpenseAuthRequestId,
            message: `${userData.displayName} has applied for Office Expense of ${createOfficeExpenseTransaction.expenseAmount}`,
            assignedTo: +orgAuthorizationdetails.AuthorizedByUserMasterId[0],
            assignedBy: userData.userMasterID,
          });
        }

        let notification = {
          title:
            'Hey ' +
            authorizerData.firstName +
            '! Someone reapplied for expense',
          body:
            userData.firstName + ' has reapplied for office expense approval',
        };

        let data = {
          screen: 'officeexpenserequest',
          isScheduled: 'true',
          scheduledTime: new Date().toISOString(),
        };

        sendNotification_NEW(
          authorizerData.firebaseToken,
          authorizerData.deviceType,
          notification,
          data,
        );
      } else {
        for (const userID of orgAuthorizationdetails.AuthorizedByUserMasterId) {
          const addOfficeExpAuthRequest =
            await OfficeExpenseAuthorizationRequest.create(
              {
                ReferenceID:
                  createOfficeExpenseTransaction.officeExpenseTransactionID,
                userMasterID: +userID,
                status: 1,
                authstatus: 2,
              },
              {
                user: req.userDetails,
                transaction,
              },
            );

          const authorizerData = allUserDetails.find(
            (user) => user.userMasterID == +userID,
          );
          const userData = allUserDetails.find(
            (user) =>
              user.userMasterID ==
              oldOfficeExpTransaction?.officeExpense?.userMasterID,
          );
          if (authorizerData && userData) {
            inboxArray.push({
              activityTable: OfficeExpenseAuthorizationRequest.getTableName(),
              activityTablePK:
                addOfficeExpAuthRequest.toJSON().officeExpenseAuthRequestId,
              message: `${userData.displayName} has applied for Office Expense of ${createOfficeExpenseTransaction.expenseAmount}`,
              assignedTo: +userID,
              assignedBy: userData.userMasterID,
            });
          }

          let notification = {
            title:
              'Hey ' +
              authorizerData.firstName +
              '! Someone reapplied for expense',
            body:
              userData.firstName + ' has reapplied for office expense approval',
          };

          let data = {
            screen: 'officeexpenserequest',
            isScheduled: 'true',
            scheduledTime: new Date().toISOString(),
          };

          sendNotification_NEW(
            authorizerData.firebaseToken,
            authorizerData.deviceType,
            notification,
            data,
          );
        }
      }

      await UserInbox.bulkCreate(inboxArray, {
        transaction,
      });
    }

    await transaction.commit();
    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: message.usermessage.reapplyMessage('Office Expense'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

exports.getTransactionByID = async (req, res, next) => {
  try {
    const officeExpenseTransactionID = req.params.id;

    if (!officeExpenseTransactionID)
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });

    const transactionData = await OfficeExpenseTransaction.findOne({
      where: {
        officeExpenseTransactionID,
      },
      include: [
        {
          model: OfficeExpense,
          as: 'officeExpense',
        },
        {
          model: OfficeExpenseHead,
          attributes: ['officeExpenseHeadID', 'officeExpenseCategoryID'],
          include: [
            {
              model: OfficeExpenseCategory,
              attributes: ['officeExpenseCategoryID', 'companyMasterID'],
            },
          ],
        },
      ],
    });

    transactionData.dataValues.companyMasterID =
      transactionData?.officeExpenseHead?.officeExpenseCategory?.companyMasterID;

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: transactionData,
    });
  } catch (error) {
    next(error);
  }
};

exports.listMonthlyOfficeExpenseVoucher = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchMasterID,
      siteID,
      page,
      limit,
      expenseMonth,
      userMasterID,
    } = req.body;

    if (!companyMasterID && !branchMasterID && !siteID) {
      return res.status(400).json({
        message: 'Invalid filter fields',
      });
    }

    const fromDate = moment(expenseMonth, 'YYYY-MM')
      .startOf('month')
      .format('YYYY-MM-DD');

    const toDate = moment(expenseMonth, 'YYYY-MM')
      .endOf('month')
      .format('YYYY-MM-DD');
    const condition = {
      expense_date: { [Op.between]: [fromDate, toDate] },

      [Op.or]: [
        { branchMasterID: { [Op.ne]: null } },
        { siteID: { [Op.ne]: null } },
      ],
    };

    if (userMasterID?.length) {
      condition.userMasterID = { [Op.in]: userMasterID };
    }
    if (siteID) {
      condition.siteID = siteID;
    } else if (branchMasterID) {
      condition.branchMasterID = branchMasterID;
    }
    const pagination =
      page && limit ? { offset: (page - 1) * limit, limit } : {};
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows, count } = await OfficeExpense.findAndCountAll({
      subQuery: false,
      raw: true,
      where: condition,
      ...pagination,

      attributes: [
        'userMasterID',
        'branchMasterID',
        'siteID',

        [col('branchMaster.branchName'), 'branchName'],
        [col('site.siteName'), 'siteName'],
        [col('userMaster.displayName'), 'displayName'],

        // ✅ SUM of expenseAmount
        [
          fn('SUM', col('officeExpenseTransactions.expenseAmount')),
          'totalExpenseAmount',
        ],

        // total transactions
        [
          fn(
            'COUNT',
            col('officeExpenseTransactions.officeExpenseTransactionID'),
          ),
          'totalTxn',
        ],
        [
          fn(
            'SUM',
            literal(`
          CASE 
            WHEN "officeExpenseTransactions"."authorizationStatus" = 3 
            THEN 1 ELSE 0 
          END
        `),
          ),
          'approvedTxn',
        ],
      ],

      include: [
        {
          model: BranchMaster,
          attributes: [],
          required: false,
          where: { companyMasterID },
        },
        {
          model: Site,
          attributes: [],
          required: false,
          where: { companyMasterID },
        },
        {
          required: true,
          model: UserMaster,
          attributes: [],
          where: {
            companyMasterId: companyMasterID,
            status: 1,
            ...userAccessCondition.where,
          },
          include: [...userAccessCondition.includeModels],
        },
        {
          model: OfficeExpenseTransaction,
          attributes: [],
          required: true, // must exist
          where: {
            status: 1,
          },
        },
      ],

      group: [
        col('officeExpenses.userMasterID'),
        col('officeExpenses.branchMasterID'),
        col('officeExpenses.siteID'),
        col('branchMaster.branchName'),
        col('site.siteName'),
        col('userMaster.displayName'),
      ],

      // 🔑 ensures ALL transactions are authorizationStatus = 3
      having: literal(`
    COUNT("officeExpenseTransactions"."officeExpenseTransactionID")
    =
    SUM(
      CASE 
        WHEN "officeExpenseTransactions"."authorizationStatus" = 3 
        THEN 1 ELSE 0 
      END
    )
  `),

      order: [['userMasterID', 'ASC']],
    });

    return res.status(200).json({
      status: 200,
      totalcount: count.length,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
};

exports.monthlyOfficeExpenseVoucher = async (req, res, next) => {
  try {
    const { branchMasterID, siteID, expenseMonth, userMasterID } = req.body;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (!branchMasterID && !siteID) {
      return res.status(400).json({ message: 'Invalid filter fields' });
    }

    const fromDate = moment(expenseMonth, 'YYYY-MM')
      .startOf('month')
      .format('YYYY-MM-DD');
    const toDate = moment(expenseMonth, 'YYYY-MM')
      .endOf('month')
      .format('YYYY-MM-DD');

    const condition = {
      expense_date: { [Op.between]: [fromDate, toDate] },
      [Op.or]: [
        { branchMasterID: { [Op.ne]: null } },
        { siteID: { [Op.ne]: null } },
      ],
      userMasterID,
    };
    if (branchMasterID) condition.branchMasterID = branchMasterID;
    if (siteID) condition.siteID = siteID;

    // Step 1: Get OfficeExpense IDs where all transactions have authorizationStatus = 3 AND status = 1
    const approvedExpenseIds = await OfficeExpense.findAll({
      where: condition,
      attributes: [
        'officeExpenseID',
        // total transactions
        [
          fn(
            'COUNT',
            col('officeExpenseTransactions.officeExpenseTransactionID'),
          ),
          'totalTxn',
        ],
        [
          fn(
            'SUM',
            literal(`
          CASE 
            WHEN "officeExpenseTransactions"."authorizationStatus" = 3 
            THEN 1 ELSE 0 
          END
        `),
          ),
          'approvedTxn',
        ],
      ],
      include: [
        {
          model: OfficeExpenseTransaction,
          attributes: [],
          where: {
            status: 1,
          },
        },
      ], // just for counting
      group: ['officeExpenses.officeExpenseID'],
      having: literal(
        `    COUNT("officeExpenseTransactions"."officeExpenseTransactionID")
    =
    SUM(
      CASE 
        WHEN "officeExpenseTransactions"."authorizationStatus" = 3 
        THEN 1 ELSE 0 
      END
    )`,
      ),
      subQuery: false,
      raw: true,
    });

    if (!approvedExpenseIds.length) {
      return res.status(200).json({
        status: 401,
        message: 'No vouchers found where all transactions are approved.',
      });
    }

    const officeExpenseIDs = approvedExpenseIds.map((e) => e.officeExpenseID);

    // Step 2: Fetch full OfficeExpense data for these IDs
    const officeExpenseData = await OfficeExpense.findAll({
      where: { officeExpenseID: { [Op.in]: officeExpenseIDs } },
      include: [
        {
          separate: true,
          model: OfficeExpenseTransaction,
          where: { authorizationStatus: 3, status: 1 }, // only approved transactions
          required: false,
          order: [['createdAt', 'ASC']],
          include: [
            {
              separate: true,
              model: OfficeExpenseAuthorizationRequest,
              order: [['updatedAt', 'DESC']],
              include: [
                {
                  model: UserMaster,
                  as: 'authorizedPerson',
                  attributes: userAttributes,
                  include: [
                    {
                      as: 'emp_desig',
                      model: EmployeeDesignation,
                      where: {
                        status: 1,
                        applicableDate: {
                          [Sequelize.Op.lte]: new Date(currentDate),
                        },
                        endDate: { [Sequelize.Op.eq]: null },
                      },
                      include: [{ model: Designation, as: 'designation' }],
                    },
                  ],
                },
              ],
            },
            {
              model: OfficeExpenseHead,
              include: [
                {
                  model: OfficeExpenseCategory,
                  attributes: [
                    'officeExpenseCategory',
                    'officeExpenseCategoryID',
                  ],
                },
              ],
            },
          ],
        },
        {
          model: BranchMaster,
          attributes: [
            'branchMasterID',
            'branchName',
            'branchAddress',
            'companyMasterID',
          ],
          include: [
            {
              model: companyMaster,
              attributes: ['companyName', 'companyAddress'],
            },
          ],
        },
        {
          model: Site,
          attributes: ['siteID', 'siteName', 'companyMasterID'],
          include: [
            {
              model: companyMaster,
              attributes: ['companyName', 'companyAddress'],
            },
          ],
        },
        {
          model: UserMaster,
          as: 'createdBy',
          attributes: userAttributes,
          include: [
            { model: EmployeeJoiningDetails, attributes: ['employeeCode'] },
          ],
        },
      ],
      order: [['expense_date', 'ASC']],
    });
    const findUserData = await UserMaster.findOne({
      where: {
        userMasterID,
        status: 1,
      },
      include: [
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
        {
          model: EmployeeJoiningDetails,
          attributes: ['employeeCode'],
        },
        {
          model: companyMaster,
          attributes: ['companyName', 'companyAddress'],
        },
      ],
    });
    let location = null;
    if (branchMasterID) {
      const findBranch = await BranchMaster.findOne({
        where: { branchMasterID },
      });
      location = findBranch.branchName;
    } else if (siteID) {
      const findsite = await Site.findOne({
        where: { siteID },
      });
      location = findsite.siteName;
    }
    let totalExpenseAmount = 0;
    let serialNumber = 0;
    const allTransactionData = [];
    for (let expense of officeExpenseData) {
      for (let trans of expense?.officeExpenseTransactions) {
        totalExpenseAmount += trans?.expenseAmount;
        const approved = trans.officeExpenseAuths.filter(
          (a) => a.authstatus == 1,
        );
        allTransactionData.push({
          srNo: serialNumber + 1,
          officeExpenseTransVoucherNo: trans.officeExpenseTransactionID,
          expense_date: moment(expense?.expense_date, 'YYYY-MM-DD').format(
            'DD-MM-YYYY',
          ),
          officeExpenseCategory:
            trans?.officeExpenseHead?.officeExpenseCategory
              ?.officeExpenseCategory,
          officeExpenseHead: trans?.officeExpenseHead?.officeExpenseHead,
          description: trans?.description,
          expenseAmount: trans?.expenseAmount,
          approvalDateArray: approved.map((a) =>
            moment(a.updatedAt).format('DD-MM-YYYY HH:mm'),
          ),
          approvalByArray: approved.map((a) => a.authorizedPerson?.displayName),
          approvalByDesignationArray: approved.map(
            (a) =>
              a.authorizedPerson?.emp_desig?.[0]?.designation.designationName,
          ),
          approvalRemarksArray: approved.map((a) => a.remarks || '-'),
        });
        serialNumber++;
      }
    }
    const voucherData = {
      companyName: findUserData?.companyMaster?.companyName || '',
      companyAddress: findUserData?.companyMaster?.companyAddress || '',
      month: moment(expenseMonth, 'YYYY-MM').format('MMMM YYYY'),
      officeExpenseVoucherNo: '',
      location,
      employeeName: findUserData?.displayName || '',
      requestDate: `${moment(fromDate, 'YYYY-MM-DD').format('DD-MM-YYYY')} To ${moment(toDate, 'YYYY-MM-DD').format('DD-MM-YYYY')}`,
      approvalDate: '',
      transactions: allTransactionData,
      openingBalance: '',
      AddBalance: '',
      lessBalance: '',
      closingBalance: '',
      totalClaimedAmount: totalExpenseAmount,
      totalApprovedAmount: '',
      totalExpenseAmount,
    };
    let base64path = await generateHTMLToPDF_base64Path(
      voucherData,
      'officeExpenseVoucher',
      'portrait',
      'html', //File Extension
      true,
    );

    const formattedMonth = moment(expenseMonth, 'YYYY-MM').format('YYYY-MM');

    let fileName = `${formattedMonth}`;

    if (branchMasterID && location) {
      fileName += ` - ${location} Branch`;
    } else if (siteID && location) {
      fileName += ` - ${location} Site`;
    }

    fileName += ` Office Expense Voucher`;
    return res.status(statusCodes.OK).json({
      data: base64path,
      voucherData,
      fileName,
      status: statusCodes.OK,
    });
  } catch (error) {
    next(error);
  }
};
