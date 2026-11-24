const Sequelize = require('sequelize');
const UserExpense = require('../models/userExpense');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const UserExpenseTransaction = require('../models/userExpenseTransaction');
const UserExpenseHeadModel = require('../models/expenseHead');
const ExpenseAuthorizationRequest = require('../models/expenseAuthorization');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const UserMaster = require('../models/userMaster');
const erpAcountMaster = require('../models/erpAccountMaster');
const { executeQuery } = require('./common.controller');
const { getErpDatabaseConfig } = require('../config/erpdatabase');
const sql = require('mssql');
const Visit = require('../models/visit');
const companyMaster = require('../models/companyMaster');
const {
  asiaKolkataDateTime,
  paginateArray,
  findAuthorizationDetails,
  sendMailforExpense_With_Transaction,
  sendNotification_NEW,
  findCompanyNotificationPolicy,
  generateHTMLToPDF_base64Path,
  getHTMLTemplate,
  readHTMLFile,
} = require('../utils/commonUtilFunctions');

const {
  generateExcel,
  generateExcelForMyExpense,
  generateExcelForEmployeeExpenseReimbursement,
} = require('../utils/exportData');

const UserInbox = require('../models/UserInbox');
const Customer = require('../models/customer');
const ExpenseCategory = require('../models/expenseCategory');
const ExpenseHead = require('../models/expenseHead');
const {
  statusCodes,
  userAttributes,
  companyAttributes,
  attachmentFilePathFolderNames,
} = require('../utils/commonVars');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const {
  authorizationMasterTypes,
  authorizationCriteriaType,
  expenseTypes,
  expenseApprovalTypes,
  mailTemplateTypes,
  expense_Payment_Types_Obj,
  paymentMode,
  AuthorizationStatusType,
} = require('../utils/dbUtils');
const Project = require('../models/project');
const moment = require('moment');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const mailTemplateEditor = require('../models/mailTemplateEditor');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const {
  mainApiUrl,
  ProjectName,
  projectNamesList,
  isStoreFileToS3Bucket,
  bucketName,
} = require('../utils/labelUtils');
const ExpensePurpose = require('../models/expensePurpose');
const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');
const ExpenseApplyConfig = require('../models/expenseApplyConfig');
const expensePayment = require('../models/expensePayment');
const ErpSyncLogs = require('../models/erpSyncLog');
const CityMaster = require('../models/citymaster');
const StateMaster = require('../models/statemaster');
const { s3OrLocalUploadFiles } = require('../middleware/s3UploadFile');
const { deleteS3File } = require('../utils/s3.utils');

exports.deleteUserExpenseTransaction = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { userExpenseTransactionID } = await req.body;
    const findTobeDeleteTransaction = await UserExpenseTransaction.findOne({
      where: { userExpenseTransactionID: userExpenseTransactionID },
      status: 1,
      raw: true,
      transaction,
    });

    const findExpenseTransactionWithSameuserExpenseID =
      await UserExpenseTransaction.findAll({
        where: { userExpenseID: findTobeDeleteTransaction.userExpenseID },
        status: 1,
        raw: true,
        transaction,
      });

    await UserExpenseTransaction.destroy({
      where: {
        userExpenseTransactionID:
          findTobeDeleteTransaction.userExpenseTransactionID,
      },
      transaction,
    });
    const expenseAuthorizationRequest =
      await ExpenseAuthorizationRequest.findAll({
        where: {
          ReferenceID: findTobeDeleteTransaction.userExpenseTransactionID,
        },
        transaction,
      });

    const AuthorizationRequestIds = expenseAuthorizationRequest.map(
      (form) => form.AuthorizationRequestId,
    );

    await UserInbox.destroy({
      where: {
        activityTable: UserExpense.getTableName(),
        activityTablePK: AuthorizationRequestIds,
      },
      transaction,
    });
    await ExpenseAuthorizationRequest.destroy({
      where: {
        ReferenceID: findTobeDeleteTransaction.userExpenseTransactionID,
      },
      transaction,
    });
    if (findExpenseTransactionWithSameuserExpenseID.length == 1) {
      await UserExpense.destroy({
        where: { userExpenseID: findTobeDeleteTransaction.userExpenseID },
        transaction,
      });
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('User Expense'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getUserExpenseById = async (req, res, next) => {
  try {
    const get_one_data = await UserExpenseTransaction.findOne({
      where: {
        userExpenseTransactionID: req.params.id,
        status: 1,
      },
      include: [
        {
          model: UserExpense,
          as: 'userExpense',
        },
        {
          model: UserExpenseHeadModel,
          as: 'expenseHead',
        },
      ],
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getUserExpenseByVersion = async (req, res, next) => {
  try {
    const versionData = await executeQuery(
      `WITH RECURSIVE old_chain AS (
    SELECT *
    FROM "userExpenseTransactions"
    WHERE "userExpenseTransactionID" = :userExpenseTransactionID
      AND "oldExpenseTransID" IS NOT NULL

    UNION ALL

    SELECT t.*
    FROM "userExpenseTransactions" AS t
    INNER JOIN old_chain oc ON t."userExpenseTransactionID" = oc."oldExpenseTransID"
)
SELECT *
FROM old_chain WHERE "userExpenseTransactionID" != :userExpenseTransactionID;`,
      {
        replacements: {
          userExpenseTransactionID: req.body.id,
        },
      },
    );
    const userExpenseTransactionIDs = versionData.map(
      (e) => +e.userExpenseTransactionID,
    );
    const findAllExpenseVersion = await UserExpenseTransaction.findAll({
      where: {
        userExpenseTransactionID: userExpenseTransactionIDs,
      },
      include: [
        {
          model: CityMaster,
          as: 'cityMaster',
          attributes: ['cityName'],
        },
        {
          model: ExpenseHead,
          attributes: [
            'expenseHeadId',
            'expenseHead',
            'accountHeadID',
            'expenseCategoryId',
          ],
          include: [
            {
              model: ExpenseCategory,
              attributes: ['expenseCategoryId', 'expenseCategory'],
            },
          ],
        },
        {
          model: ExpensePurpose,
          as: 'ep',
          attributes: ['expensePurposeID', 'name'],
        },
        {
          model: AuthorizationCriteriaMaster,
          attributes: ['AuthorizationCriteriaID', 'AuthorizationCriteria'],
        },
        {
          separate: true,
          model: ExpenseAuthorizationRequest,
          include: [
            {
              model: UserMaster,
              as: 'authorizedPerson',
              attributes: userAttributes,
            },
          ],
        },
        {
          model: UserExpense,
          as: 'userExpense',
          attributes: ['userExpenseID', 'expense_date'],
        },
      ],
      order: [['userExpenseTransactionID', 'DESC']],
    });

    return res.status(200).json({
      status: 200,
      data: findAllExpenseVersion,
      totalcount: findAllExpenseVersion.length,
    });
  } catch (err) {
    next(err);
  }
};
exports.syncexpense = async (req, res, next) => {
  try {
    const { tobeSyncedExpenseData, companyMasterID } = req.body;
    const findUnSyncedExpenseData = await UserExpenseTransaction.findAll({
      where: {
        userExpenseTransactionID: {
          [Sequelize.Op.in]:
            tobeSyncedExpenseData?.[0].userExpenseTransactionIDs,
        },
      },
    });

    const findSyncedData = findUnSyncedExpenseData.find(
      (e) => e.erpJvid != null && e.erpJvid != '',
    );
    if (findSyncedData) {
      return res.status(200).json({
        status: 401,
        message: 'Already Synced. Please refresh the page!',
      });
    }
    const erpConfig = getErpDatabaseConfig(companyMasterID);

    sql.connect(erpConfig, async function (err) {
      if (err) {
        sql.close();
        return res
          .status(200)
          .json({ status: 200, message: 'Could not create DB Connection!.' });
      }
      const results = await erpDatabaseSyncProcess(
        tobeSyncedExpenseData,
        sql,
        'ManulSync',
      );
      sql.close();
      if (results && results.length) {
        return res.status(200).json({
          status: results[0].status,
          message:
            results[0].status == 200
              ? 'Erp-Sync Successfully'
              : results[0].message,
        });
      } else {
        return res.status(200).json({
          status: 401,
          message: 'Data Not Fetched',
        });
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.ExpenseAuthorizationDetails_new = async (req, res, next) => {
  try {
    const order = [['displayName', 'ASC']];

    const findUserData = await UserMaster.findAll({
      where: {
        status: 1,
      },
      order,
      include: [
        {
          model: AuthorizationDetails,
          where: {
            AuthorizedByUserMasterId: {
              [Sequelize.Op.contains]: [req.params.id],
            },
            AuthorizationMasterID: authorizationMasterTypes.expense,
            status: 1,
          },
        },
        {
          model: EmployeeJoiningDetails,
        },
      ],
      attributes: [
        [
          Sequelize.literal(`
"userMaster"."displayName" || 
CASE 
  WHEN "employeeJoiningDetails"."employeeCode" IS NOT NULL AND "employeeJoiningDetails"."employeeCode" != '' THEN ' ( ' || "employeeJoiningDetails"."employeeCode" || ' )'
  ELSE ''
END || ' - ' || "userMaster"."userNumber"
                `),
          'displayNameWithNumber',
        ],
        'userMasterID',
        'displayName',
        'userNumber',
      ],
    });

    return res.status(200).json({
      status: 200,
      message: {},
      data: findUserData,
    });
  } catch (err) {
    next(err);
  }
};
exports.erpExpenseAutoSync = async (req, res) => {
  try {
    const companyMasterID = req.body.companyMasterID;
    const startDate = req.body.startDate;
    if (!companyMasterID || !startDate) {
      res?.status(200).json({
        status: 200,
        message: message.usermessage.invalidField(
          'companyMasterID Or Start Date !!!!!!',
        ),
      });
      return console.log(
        message.usermessage.invalidField(
          'companyMasterID Or Start Date !!!!!!',
        ),
      );
    }
    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const order = [['createdAt', 'ASC']];
    const findExpenseData = await UserExpenseTransaction.findAll({
      where: {
        status: { [Sequelize.Op.ne]: 10 },
        authorizationStatus: { [Sequelize.Op.ne]: 4 },
        erpJvid: {
          [Sequelize.Op.or]: [
            { [Sequelize.Op.is]: null },
            { [Sequelize.Op.eq]: '' },
          ],
        },
        expenseAmount: { [Sequelize.Op.ne]: null },
      },
      order,
      include: [
        {
          required: true,
          model: UserExpense,
          as: 'userExpense',
          where: {
            expense_date: {
              [Sequelize.Op.and]: [
                { [Sequelize.Op.gte]: startDate },
                { [Sequelize.Op.lt]: currentdate },
              ],
            },
            status: 1,
          },
          include: [
            {
              required: true,
              model: UserMaster,
              where: { companyMasterId: companyMasterID, status: 1 },
              attributes: userAttributes,
              include: [
                {
                  required: true,
                  model: erpAcountMaster,
                  where: {
                    status: 1,
                  },
                },
              ],
            },
          ],
        },
        {
          model: ExpenseHead,
          where: {
            accountHeadID: { [Sequelize.Op.ne]: null },
          },
        },
      ],
    });

    const processedExpenseData = expenseAutoSyncProcess(findExpenseData);
    const erpConfig = getErpDatabaseConfig(companyMasterID);
    sql.connect(erpConfig, async function (err) {
      if (err) {
        sql.close();
        res
          ?.status(200)
          .json({ status: 200, message: 'Could not create DB Connection!.' });
        return console.log(
          'Could not create ERP DB Connection!........................',
        );
      }
      const results = await erpDatabaseSyncProcess(
        processedExpenseData,
        sql,
        'AutoSync',
      );

      sql.close();
      res?.status(200).json({
        status: 200,
        message: 'Processing completed..........',
        results,
      });
      return console.log(
        'ERP Sync Processing completed................................',
        results,
      );
    });
  } catch (err) {
    console.log(err);
  }
};

exports.expenseSyncData_V2 = async (req, res, next) => {
  try {
    let { page, limit, userMasterID, expense_date, companyMasterID } =
      await req.body;
    const order = [['createdAt', 'ASC']];

    const findExpenseData = await UserExpenseTransaction.findAll({
      where: {
        status: { [Sequelize.Op.ne]: 10 },
        authorizationStatus: { [Sequelize.Op.ne]: 4 },
        erpJvid: {
          [Sequelize.Op.or]: [
            { [Sequelize.Op.is]: null },
            { [Sequelize.Op.eq]: '' },
          ],
        },
        expenseAmount: { [Sequelize.Op.ne]: null },
      },
      order,
      include: [
        {
          required: true,
          model: UserExpense,
          as: 'userExpense',
          where: {
            expense_date: expense_date
              ? {
                  [Sequelize.Op.and]: [
                    { [Sequelize.Op.eq]: expense_date },
                    { [Sequelize.Op.gte]: '2025-04-01' },
                  ],
                }
              : { [Sequelize.Op.gte]: '2025-04-01' },
            status: 1,
          },
          include: [
            {
              required: true,
              model: UserMaster,
              where: {
                ...(userMasterID && { userMasterID: userMasterID }),
                companyMasterId: companyMasterID,
                status: 1,
              },
              attributes: userAttributes,
              include: [
                {
                  required: true,
                  model: erpAcountMaster,
                  where: {
                    status: 1,
                  },
                },
              ],
            },
          ],
        },
        {
          model: ExpenseHead,
          where: {
            accountHeadID: { [Sequelize.Op.ne]: null },
          },
        },
      ],
    });

    const processedExpenseData = expenseAutoSyncProcess(findExpenseData);

    const paginatedData = paginateArray(processedExpenseData, page, limit);
    return res.status(200).json({
      status: 200,
      totalcount: processedExpenseData.length,
      data: paginatedData,
    });
  } catch (err) {
    next(err);
  }
};

function expenseAutoSyncProcess(findExpenseData) {
  const unapprovedExpenseSet = new Set(
    findExpenseData
      .filter((e) => +e.authorizationStatus != 3)
      .map(
        (e) => `${e.userExpense.userMasterID}_${e.userExpense.expense_date}`,
      ),
  );
  const expenseObject = {};
  for (const trans of findExpenseData) {
    if (
      unapprovedExpenseSet.has(
        `${trans.userExpense.userMasterID}_${trans.userExpense.expense_date}`,
      )
    ) {
      continue;
    }

    const key = `${trans.userExpense.userMasterID}_${trans.userExpense.expense_date}_${trans.expenseHeadId}`;

    if (expenseObject[key]) {
      expenseObject[key].netAmount =
        expenseObject[key].netAmount + trans.expenseAmount;

      expenseObject[key].description = trans.description
        ? `${expenseObject[key].description}| ${trans.description.replace(/['"]+/g, '')}`
        : `${expenseObject[key].description}|  N/A`;

      expenseObject[key].userExpenseTransactionIDs.push(
        trans.userExpenseTransactionID,
      );
    } else {
      expenseObject[key] = {
        userMasterID: trans.userExpense.userMasterID,
        erpAcountID:
          trans.userExpense?.userMaster?.erpAcountMasters[0]?.erpAcountID,
        netAmount: trans.expenseAmount,

        expenseAmountheadwise: '0',

        expense_date: trans.userExpense?.expense_date,

        accountHeadID: trans.expenseHead?.accountHeadID,

        description: trans.description
          ? trans.description.replace(/['"]+/g, '')
          : 'N/A',

        userExpenseTransactionIDs: [],
        displayName: trans.userExpense?.userMaster?.displayName,
      };
      expenseObject[key].userExpenseTransactionIDs.push(
        trans.userExpenseTransactionID,
      );
    }
  }
  const expenseArray = Object.values(expenseObject);

  const finalExpenseObject = {};

  for (const expenseArrayObj of expenseArray) {
    const key = `${expenseArrayObj.userMasterID}_${expenseArrayObj.expense_date}`;

    if (finalExpenseObject[key]) {
      finalExpenseObject[key].netAmount =
        finalExpenseObject[key].netAmount + expenseArrayObj.netAmount;

      finalExpenseObject[key].expenseAmountheadwise =
        `${finalExpenseObject[key].expenseAmountheadwise}#${String(expenseArrayObj.netAmount)}`;

      finalExpenseObject[key].accountHeadID =
        `${finalExpenseObject[key].accountHeadID}#${expenseArrayObj.accountHeadID}`;

      finalExpenseObject[key].description =
        `${finalExpenseObject[key].description}#${expenseArrayObj.description}`;

      finalExpenseObject[key].userExpenseTransactionIDs.push(
        ...expenseArrayObj.userExpenseTransactionIDs,
      );
    } else {
      finalExpenseObject[key] = {
        userMasterID: expenseArrayObj.userMasterID,
        erpAcountID: expenseArrayObj.erpAcountID,
        netAmount: expenseArrayObj.netAmount,

        expenseAmountheadwise: String(expenseArrayObj.netAmount),

        expense_date: expenseArrayObj.expense_date,

        accountHeadID: expenseArrayObj.accountHeadID,

        description: expenseArrayObj.description,
        userExpenseTransactionIDs: expenseArrayObj.userExpenseTransactionIDs,
        displayName: expenseArrayObj.displayName,
      };
    }
  }

  const finalExpenseArray = Object.values(finalExpenseObject);
  return finalExpenseArray && finalExpenseArray.length ? finalExpenseArray : [];
}

async function erpDatabaseSyncProcess(expenseData, sql, syncType) {
  let request = new sql.Request();
  const results = [];
  for (let expense of expenseData) {
    try {
      await UserExpenseTransaction.update(
        {
          erpJvid: -1,
          syncType,
        },
        {
          where: {
            status: {
              [Sequelize.Op.ne]: 10,
            },
            authorizationStatus: 3,
            userExpenseTransactionID: {
              [Sequelize.Op.in]: expense.userExpenseTransactionIDs,
            },
          },
        },
      );
      const query =
        'exec MCCS_Veritrack_InsertQueryJV @TADPartyAccountMasterId=' +
        expense.erpAcountID +
        ',@NetAmount=' +
        expense.netAmount +
        ",@DocumentDate='" +
        expense.expense_date +
        "',@expenceHeadID='" +
        expense.accountHeadID +
        "',@expenceAmt='" +
        expense.expenseAmountheadwise +
        "',@dec='" +
        expense.description +
        "'";
      console.log('Query--------', query);
      await ErpSyncLogs.create({
        query: query,
        syncType: syncType,
        expenseSyncData: expense,
      });
      const recordset = await request.query(query);
      console.log('Recordset--------', recordset);

      const erpJvid = recordset?.recordset?.[0]?.[''] || 0;

      if (erpJvid !== 0) {
        await UserExpenseTransaction.update(
          {
            erpJvid: erpJvid,
            syncType,
          },
          {
            where: {
              status: {
                [Sequelize.Op.ne]: 10,
              },
              authorizationStatus: 3,
              userExpenseTransactionID: {
                [Sequelize.Op.in]: expense.userExpenseTransactionIDs,
              },
            },
          },
        );
        results.push({
          status: 200,
          userMasterID: expense.userMasterID,
          message: `Synced = ( erpJvid = ${erpJvid} )`,
        });
      } else {
        results.push({
          status: 401,
          userMasterID: expense.userMasterID,
          message: 'Synced - Could Not Get erpJvid',
        });
      }
    } catch (error) {
      results.push({
        status: 401,
        userMasterID: expense.userMasterID,
        message: error.message,
      });
    }
  }
  console.log('Results');

  return results;
}

exports.findExpesneWithNegativeJvID = async (req, res) => {
  try {
    const { companyMasterID } = await req.body;
    const order = [['createdAt', 'ASC']];
    const findExpenseData = await UserExpenseTransaction.findAll({
      where: {
        status: { [Sequelize.Op.ne]: 10 },
        erpJvid: {
          [Sequelize.Op.eq]: '-1',
        },
        expenseAmount: { [Sequelize.Op.ne]: null },
      },
      order,
      include: [
        {
          required: true,
          model: UserExpense,
          as: 'userExpense',
          where: {
            status: 1,
          },
          include: [
            {
              required: true,
              model: UserMaster,
              where: { companyMasterId: companyMasterID, status: 1 },
              attributes: userAttributes,
              include: [
                {
                  required: true,
                  model: erpAcountMaster,
                  where: {
                    status: 1,
                  },
                },
              ],
            },
          ],
        },
        {
          model: ExpenseHead,
          where: {
            accountHeadID: { [Sequelize.Op.ne]: null },
          },
        },
      ],
    });

    const finaldata = findExpenseData.map((e) => {
      return {
        syncType: e.syncType ? e.syncType : '',
        userExpenseTransactionID: e.userExpenseTransactionID,
        userExpenseID: e.userExpenseID,
        expenseHeadId: e.expenseHeadId,
        expenseAmount: e.expenseAmount,
        description: e.description,
        expenseHead: e.expenseHead?.expenseHead,
        accountHeadID: e.expenseHead?.accountHeadID,
        expense_date: e.userExpense.expense_date,
        authorizationStatus:
          +e.authorizationStatus == 3
            ? 'Approved'
            : +e.authorizationStatus == 4
              ? 'Rejected'
              : 'Pending',
      };
    });
    if (finaldata.length) {
      return await generateExcel(
        finaldata,
        'Negative Expense Data',
        'xlsx',
        res,
      );
    } else {
      return res.status(200).json({
        status: 200,
        message: 'No Data Found to Exportsds',
      });
    }
  } catch (err) {
    console.log(err);
  }
};

exports.findExpesneWithUnassignedERPID = async (req, res) => {
  try {
    const { companyMasterID } = await req.body;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const order = [['displayName', 'ASC']];

    const findUnassignedUserExpenseData = await UserMaster.findAll({
      where: {
        status: 1,
        companyMasterId: companyMasterID,
        [Sequelize.Op.and]: Sequelize.literal(
          `"erpAcountMasters"."userMasterID" IS NULL`,
        ),
      },
      order,
      include: [
        {
          required: false,
          model: erpAcountMaster,
          where: {
            status: 1,
          },
        },
        {
          required: true,
          model: UserExpense,
          include: [
            {
              required: true,
              model: UserExpenseTransaction,
              where: {
                authorizationStatus: 3,
              },
            },
          ],
        },
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
          model: EmployeeJoiningDetails,
          attributes: ['employeeCode'],
        },
        {
          required: false,
          model: companyMaster,
          attributes: ['companyMasterID', 'companyName'],
        },
      ],
      attributes: userAttributes,
    });
    const finaldata = [];

    for (const data of findUnassignedUserExpenseData) {
      let totalExpense = 0;
      for (let expense of data.userExpenses) {
        for (let trans of expense.userExpenseTransactions) {
          totalExpense += trans.expenseAmount;
        }
      }
      const pushData = {
        'Employee Code':
          data.employeeJoiningDetails && data.employeeJoiningDetails.length > 0
            ? data.employeeJoiningDetails[0].employeeCode
            : '',
        'Employee Name': data.displayName,
        'User Number': data.userNumber,
        'Company Name': data.companyMaster.companyName,
        'Branch Name':
          data.employeeBranches && data.employeeBranches.length > 0
            ? data.employeeBranches[0].branchMaster.branchName
            : '',
        'Department Name':
          data.employeeDepartments && data.employeeDepartments.length > 0
            ? data.employeeDepartments[0].department.departmentName
            : '',
        'Designation Name':
          data.employeeDesignations && data.employeeDesignations.length > 0
            ? data.employeeDesignations[0].designation.designationName
            : '',
        'Total Expense': totalExpense,
      };
      finaldata.push(pushData);
    }
    if (finaldata.length) {
      return await generateExcel(
        finaldata,
        'Negative Expense Data',
        'xlsx',
        res,
      );
    } else {
      return res.status(200).json({
        status: 200,
        message: 'No Data Found to Exportsds',
      });
    }
  } catch (err) {
    console.log(err);
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
  const config = await ExpenseApplyConfig.findOne({
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

exports.postAddUserExpense_V2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const formData = req.body;
    const files = req.files;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const userCompanyID = +req.userDetails.companyMasterId;
    let userMasterID = +req.userDetails.userMasterId;
    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);
    if (formData['expenseUserMasterID']) {
      userMasterID = +formData['expenseUserMasterID'];
    }
    const entryCount = Object.keys(formData).filter((key) =>
      key.startsWith('expenseHeadId'),
    ).length;

    const expenseTransaction = [];
    let index_attch = 0;
    for (let i = 0; i < entryCount; i++) {
      const checkAttach =
        formData[`isattachment_${i}`] == 'true' ? true : false;
      const checkAttach2 =
        formData[`isattachment2_${i}`] == 'true' ? true : false;
      const checkAttach3 =
        formData[`isattachment3_${i}`] == 'true' ? true : false;
      const checkAttach4 =
        formData[`isattachment4_${i}`] == 'true' ? true : false;
      let addObj = {
        expenseHeadId: +formData[`expenseHeadId${i}`],
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
        attachThumb: null,
        attach2Thumb: null,
        attach3Thumb: null,
        attach4Thumb: null,
        createBy: createBy,
        createByIp: createByIp,
        expensePurposeID:
          formData[`expensePurposeID${i}`] &&
          formData[`expensePurposeID${i}`] != 'null' &&
          formData[`expensePurposeID${i}`] != ''
            ? formData[`expensePurposeID${i}`]
            : null,
        // Add policy type specific fields
        policyType: formData[`policyType${i}`] || null,
        checkInDate: formData[`checkInDate${i}`] || null,
        checkOutDate: formData[`checkOutDate${i}`] || null,
        days: formData[`days${i}`] ? parseFloat(formData[`days${i}`]) : null,
        vehicleType:
          formData[`vehicleType${i}`] || formData[`transportType${i}`] || null,
        value: formData[`distanceKm${i}`]
          ? parseFloat(formData[`distanceKm${i}`])
          : null,
        cityMasterID: formData[`cityMasterID${i}`]
          ? parseInt(formData[`cityMasterID${i}`])
          : null,
        s3UploadattachFile: isStoreFileToS3Bucket,
        s3UploadattachFile2: isStoreFileToS3Bucket,
        s3UploadattachFile3: isStoreFileToS3Bucket,
        s3UploadattachFile4: isStoreFileToS3Bucket,
        migration: true,
      };
      const attachmentChecks = [
        { check: checkAttach, field: 'attachFile', thumbField: 'attachThumb' },
        {
          check: checkAttach2,
          field: 'attachFile2',
          thumbField: 'attach2Thumb',
        },
        {
          check: checkAttach3,
          field: 'attachFile3',
          thumbField: 'attach3Thumb',
        },
        {
          check: checkAttach4,
          field: 'attachFile4',
          thumbField: 'attach4Thumb',
        },
      ];

      for (const { check, field, thumbField } of attachmentChecks) {
        if (!check) {
          continue;
        }

        const attendanceAttachmentUrl = files?.[index_attch] || null;

        const attachmentPath = await s3OrLocalUploadFiles({
          attachment: attendanceAttachmentUrl?.path,
          attachmentFileName: attendanceAttachmentUrl?.filename,
          companyMasterId: userCompanyID,
          folderName: attachmentFilePathFolderNames.EXPENSE_ATTACHMENT,
          isDeleteLocalFile: true,
        });

        addObj[field] = attachmentPath || null;
        if (attendanceAttachmentUrl.thumbnailPath) {
          const thumbnailPath = await s3OrLocalUploadFiles({
            attachment: attendanceAttachmentUrl.thumbnailPath,
            attachmentFileName: attendanceAttachmentUrl.thumbnailFilename,
            companyMasterId: userCompanyID,
            folderName: attachmentFilePathFolderNames.EXPENSE_ATTACHMENT,
            isDeleteLocalFile: true,
          });

          addObj[thumbField] = thumbnailPath || null;
        }
        index_attch++;
      }
      expenseTransaction.push(addObj);
    }
    const visitID =
      formData[`visitID`] == 'null' ||
      formData[`visitID`] == 'undefined' ||
      !formData[`visitID`] ||
      formData[`visitID`] == null
        ? null
        : +formData[`visitID`];
    const ToursMasterID =
      formData[`ToursMasterID`] == 'null' ||
      formData[`ToursMasterID`] == 'undefined' ||
      !formData[`ToursMasterID`] ||
      formData[`ToursMasterID`] == null
        ? null
        : +formData[`ToursMasterID`];

    const projectID =
      formData[`projectID`] == 'null' ||
      formData[`projectID`] == 'undefined' ||
      !formData[`projectID`] ||
      formData[`projectID`] == null
        ? null
        : +formData[`projectID`];
    const serviceDate =
      formData[`serviceDate`] == 'null' ||
      formData[`serviceDate`] == 'undefined' ||
      !formData[`serviceDate`] ||
      formData[`serviceDate`] == null
        ? null
        : formData[`serviceDate`];
    const serviceNumber =
      formData[`serviceNumber`] == 'null' ||
      formData[`serviceNumber`] == 'undefined' ||
      !formData[`serviceNumber`] ||
      formData[`serviceNumber`] == null
        ? null
        : formData[`serviceNumber`];
    const expense_date = formData[`expense_date`];
    const mailUserIDs = [];

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
    } else {
      const findUserCompany = await companyMaster.findOne({
        where: {
          companyMasterID: userCompanyID,
        },
        attributes: ['expenseDatePicker'],
      });
      if (findUserCompany && findUserCompany.expenseDatePicker) {
        const diffInDays = Math.abs(
          moment(currentdate).diff(moment(expense_date), 'days'),
        );

        if (+diffInDays > +findUserCompany.expenseDatePicker) {
          await transaction.rollback();
          return res.status(200).json({
            status: 401,
            message: message.usermessage.expenseDatePicker(days),
          });
        }
      }
    }
    const findCompanyExpenseMailTemplate = await mailTemplateEditor.findOne({
      where: {
        status: 1,
        mailTypeID: mailTemplateTypes.expenseMailTemplate,
        companyMasterID: userCompanyID,
      },
    });

    // Validate accommodation date overlaps
    for (let i = 0; i < expenseTransaction.length; i++) {
      const transaction_item = expenseTransaction[i];

      if (
        transaction_item.policyType === 'accommodation' &&
        transaction_item.checkInDate &&
        transaction_item.checkOutDate
      ) {
        // Check for existing accommodation expenses with overlapping dates
        // Overlap exists if: start1 < end2 AND end1 > start2
        // This allows checkout of one booking to equal checkin of next booking
        const existingExpenses = await UserExpenseTransaction.findAll({
          include: [
            {
              model: UserExpense,
              as: 'userExpense',
              required: true,
              where: {
                userMasterID: userMasterID,
              },
            },
          ],
          where: {
            policyType: 'accommodation',
            checkInDate: { [Sequelize.Op.ne]: null },
            checkOutDate: { [Sequelize.Op.ne]: null },
            authorizationStatus: { [Sequelize.Op.ne]: 4 },
            // Date overlap logic: start1 < end2 AND end1 > start2
            // This allows consecutive bookings where checkout = next checkin
            [Sequelize.Op.and]: [
              {
                checkInDate: {
                  [Sequelize.Op.lt]: transaction_item.checkOutDate,
                },
              },
              {
                checkOutDate: {
                  [Sequelize.Op.gt]: transaction_item.checkInDate,
                },
              },
            ],
          },
        });

        if (existingExpenses.length > 0) {
          const formatDate = (dateStr) => {
            return moment(dateStr).format('DD-MM-YYYY');
          };

          const existingCheckIn = formatDate(existingExpenses[0].checkInDate);
          const existingCheckOut = formatDate(existingExpenses[0].checkOutDate);
          const newCheckIn = formatDate(transaction_item.checkInDate);
          const newCheckOut = formatDate(transaction_item.checkOutDate);

          await transaction.rollback();
          return res.status(200).json({
            status: 400,
            message: `Accommodation date overlap detected! You have already added an expense from ${existingCheckIn} to ${existingCheckOut} which overlaps with your new dates ${newCheckIn} to ${newCheckOut}. Please choose different dates.`,
          });
        }
      }

      // Validate food expense daily limit
      if (
        transaction_item.policyType === 'food' &&
        transaction_item.maxAllowedAmount
      ) {
        // Get existing food expenses for the same date (any city)
        const existingFoodExpenses = await UserExpenseTransaction.findAll({
          include: [
            {
              model: UserExpense,
              as: 'userExpense',
              required: true,
              where: {
                userMasterID: userMasterID,
                expense_date: expense_date,
              },
            },
          ],
          where: {
            policyType: 'food',
            authorizationStatus: { [Sequelize.Op.ne]: 4 },
          },
          attributes: ['expenseAmount'],
        });

        // Calculate total existing food expense for this date
        const existingTotal = existingFoodExpenses.reduce((sum, exp) => {
          return sum + (parseFloat(exp.expenseAmount) || 0);
        }, 0);

        // Calculate total from current submission for food expenses
        const currentFoodTotal = expenseTransaction
          .filter((t) => t.policyType === 'food')
          .reduce((sum, t) => sum + (parseFloat(t.expenseAmount) || 0), 0);

        const grandTotal = existingTotal + currentFoodTotal;
        const maxAllowed = parseFloat(transaction_item.maxAllowedAmount);

        if (grandTotal > maxAllowed) {
          const formatDate = (dateStr) => {
            return moment(dateStr).format('DD-MM-YYYY');
          };

          await transaction.rollback();
          return res.status(200).json({
            status: 400,
            message: `Daily food expense limit exceeded for ${formatDate(expense_date)}! Maximum allowed: ₹${maxAllowed.toFixed(2)}, Already claimed: ₹${existingTotal.toFixed(2)}, Current request: ₹${currentFoodTotal.toFixed(2)}, Total: ₹${grandTotal.toFixed(2)}. Please reduce your expense amount.`,
          });
        }
      }

      // Validate own vehicle - only one expense per vehicle type per day
      if (
        transaction_item.policyType === 'ownVehicle' &&
        transaction_item.vehicleType
      ) {
        // Check if user already has an own vehicle expense for this vehicle type on this date
        const existingOwnVehicleExpenses = await UserExpenseTransaction.findAll(
          {
            include: [
              {
                model: UserExpense,
                as: 'userExpense',
                required: true,
                where: {
                  userMasterID: userMasterID,
                  expense_date: expense_date,
                },
              },
            ],
            where: {
              policyType: 'ownVehicle',
              vehicleType: transaction_item.vehicleType, // Check for same vehicle type
              authorizationStatus: { [Sequelize.Op.ne]: 4 },
            },
          },
        );

        if (existingOwnVehicleExpenses.length > 0) {
          const formatDate = (dateStr) => {
            return moment(dateStr).format('DD-MM-YYYY');
          };

          const vehicleTypeName =
            transaction_item.vehicleType === 'twoWheeler'
              ? 'Two Wheeler'
              : 'Four Wheeler';

          await transaction.rollback();
          return res.status(200).json({
            status: 400,
            message: `You have already added a ${vehicleTypeName} expense for ${formatDate(expense_date)}. Only one ${vehicleTypeName} expense is allowed per day. Please edit the existing expense or choose a different date.`,
          });
        }

        // Check if current submission has multiple expenses of same vehicle type
        const sameVehicleTypeCount = expenseTransaction.filter(
          (t) =>
            t.policyType === 'ownVehicle' &&
            t.vehicleType === transaction_item.vehicleType,
        ).length;

        if (sameVehicleTypeCount > 1) {
          const formatDate = (dateStr) => {
            return moment(dateStr).format('DD-MM-YYYY');
          };

          const vehicleTypeName =
            transaction_item.vehicleType === 'twoWheeler'
              ? 'Two Wheeler'
              : 'Four Wheeler';

          await transaction.rollback();
          return res.status(200).json({
            status: 400,
            message: `You are trying to add ${sameVehicleTypeCount} ${vehicleTypeName} expenses for ${formatDate(expense_date)}. Only one ${vehicleTypeName} expense is allowed per day.`,
          });
        }
      }
    }

    const findCompanyNotificationPolicyData =
      await findCompanyNotificationPolicy(userCompanyID);

    const authorizationdetails = await findAuthorizationDetails(
      authorizationMasterTypes.expense,
      userMasterID,
    );

    let authStatus = 0;
    if (authorizationdetails) {
      if (
        +authorizationdetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO
      ) {
        authStatus = 2;
      } else {
        authStatus = 1;
      }
    }
    const insetExpenseData = await UserExpense.create(
      {
        visitID,
        userMasterID,
        ToursMasterID,
        projectID,
        expense_date,
        serviceNumber,
        serviceDate,
        expenseTransaction,
        authorizationStatus: authStatus,
        createBy,
        createByIp,
      },
      { transaction },
    );
    const expenseHeadIds = new Set();
    expenseTransaction.forEach(async (option) => {
      option['userExpenseID'] = insetExpenseData.userExpenseID;
      option['authorizationStatus'] = authStatus;
      option['createBy'] = createBy;
      option['createByIp'] = createByIp;
      option['AuthorizationCriteriaID'] =
        authorizationdetails && +authorizationdetails.AuthorizationCriteriaID
          ? +authorizationdetails.AuthorizationCriteriaID
          : null;
      expenseHeadIds.add(option['expenseHeadId']);
    });
    await UserExpenseTransaction.bulkCreate(expenseTransaction, {
      returning: true,
      transaction,
    }).then(async (response) => {
      if (authorizationdetails) {
        const inboxArray = [];
        const getAllUserDetails = await UserMaster.findAll({
          distinct: true,
          where: {
            userMasterID: [
              ...authorizationdetails.AuthorizedByUserMasterId,
              userMasterID,
            ],
          },
          attributes: userAttributes,
          include: [
            {
              required: false,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              required: false,
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(currentdate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(currentdate) } },
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
                  [Sequelize.Op.lte]: new Date(currentdate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(currentdate) },
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
                  [Sequelize.Op.lte]: new Date(currentdate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(currentdate) },
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
          ],
        });
        const findExpenseHeadData = await UserExpenseHeadModel.findAll({
          where: {
            expenseHeadId: {
              [Sequelize.Op.in]: [...expenseHeadIds],
            },
          },
          include: [
            {
              model: ExpenseCategory,
            },
          ],
        });

        let ExpenseType = '';
        if (visitID) ExpenseType = expenseTypes.VISIT;
        else if (ToursMasterID) ExpenseType = expenseTypes.TOUR;
        else if (projectID) ExpenseType = expenseTypes.PROJECT;
        else if (serviceNumber) ExpenseType = expenseTypes.SERVICE;
        else ExpenseType = expenseTypes.PERSONAL;

        if (
          +authorizationdetails.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          for (let i = 0; i < response.length; i++) {
            const findHeadData = findExpenseHeadData.find(
              (e) => e.expenseHeadId == response[i].expenseHeadId,
            );
            const insetExpenseAuthRequest =
              await ExpenseAuthorizationRequest.create(
                {
                  ReferenceID: response[i].userExpenseTransactionID,
                  userMasterID:
                    authorizationdetails.AuthorizedByUserMasterId[0],
                  status: 1,
                  authstatus: 2,
                  createBy,
                  createByIp,
                },
                { transaction },
              );

            const authorizerData = getAllUserDetails.find(
              (e) =>
                e.userMasterID ==
                +authorizationdetails.AuthorizedByUserMasterId[0],
            );

            const userData = getAllUserDetails.find(
              (e) => e.userMasterID == +userMasterID,
            );

            if (authorizerData && userData) {
              inboxArray.push({
                activityTable: UserExpense.getTableName(),
                activityTablePK:
                  insetExpenseAuthRequest.toJSON().AuthorizationRequestId,
                message: `${userData.displayName} has applied for Expense of ${expenseTransaction[i].expenseAmount}`,
                assignedTo: authorizationdetails.AuthorizedByUserMasterId[0],
                assignedBy: userMasterID,
              });

              let notification = {
                title:
                  'Hey ' +
                  authorizerData.firstName +
                  '! Someone requested for expense',
                body:
                  userData.firstName + ' has requested for expense approval',
              };
              let data = {
                screen: 'expenserequest',
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
                  findHeadData?.expenseHead || '', //Expense Head
                  findHeadData?.expenseCategory?.expenseCategory || '', //Expense Category
                  response[i].expenseAmount,
                  response[i].description,
                  findCompanyExpenseMailTemplate,
                  findCompanyNotificationPolicyData,
                  ExpenseType,
                  expense_date,
                );
              }
            }
          }
        } else {
          for (let j = 0; j < response.length; j++) {
            const findHeadData = findExpenseHeadData.find(
              (e) => e.expenseHeadId == response[j].expenseHeadId,
            );
            for (
              let i = 0;
              i < authorizationdetails.AuthorizedByUserMasterId.length;
              i++
            ) {
              const insetExpenseAuthRequest =
                await ExpenseAuthorizationRequest.create(
                  {
                    ReferenceID: response[j].userExpenseTransactionID,
                    userMasterID:
                      authorizationdetails.AuthorizedByUserMasterId[i],
                    status: 1,
                    authstatus: 2,
                    createBy,
                    createByIp,
                  },
                  { transaction },
                );

              const authorizerData = getAllUserDetails.find(
                (e) =>
                  e.userMasterID ==
                  +authorizationdetails.AuthorizedByUserMasterId[i],
              );
              const userData = getAllUserDetails.find(
                (e) => e.userMasterID == +userMasterID,
              );

              if (authorizerData && userData) {
                inboxArray.push({
                  activityTable: UserExpense.getTableName(),
                  activityTablePK:
                    insetExpenseAuthRequest.toJSON().AuthorizationRequestId,
                  message: `${userData.displayName} has applied for Expense from ${expenseTransaction[j].expenseAmount}`,
                  assignedTo: authorizationdetails.AuthorizedByUserMasterId[i],
                  assignedBy: userMasterID,
                });

                let notification = {
                  title:
                    'Hey ' +
                    authorizerData.firstName +
                    '! Someone requested for expense',
                  body:
                    userData.firstName + ' has requested for expense approval',
                };
                let data = {
                  screen: 'expenserequest',
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
                    findHeadData?.expenseHead || '', //Expense Head
                    findHeadData?.expenseCategory?.expenseCategory || '', //Expense Category
                    response[j].expenseAmount,
                    response[j].description,
                    findCompanyExpenseMailTemplate,
                    findCompanyNotificationPolicyData,
                    ExpenseType,
                    expense_date,
                  );
                }
              }

              mailUserIDs.push(
                authorizationdetails.AuthorizedByUserMasterId[i],
              );
            }
          }
        }

        await UserInbox.bulkCreate(inboxArray, {
          transaction,
        });
      }
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Expense'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
exports.userExpenseNew_V2 = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      fromDate,
      toDate,
      expenseType,
      status,
      page = 1,
      limit = 10,
      exportData,
    } = await req.body;
    const paginationQuery = {};
    const userMasterID = +req.userDetails.userMasterId;

    if (!exportData) {
      paginationQuery.offset = (+page - 1) * +limit;
      paginationQuery.limit = +limit;
    }

    const expenseTypeCondition = {};
    if (expenseType === expenseTypes.VISIT) {
      expenseTypeCondition.visitID = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (expenseType === expenseTypes.TOUR) {
      expenseTypeCondition.ToursMasterID = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (expenseType === expenseTypes.PERSONAL) {
      expenseTypeCondition.visitID = null;
      expenseTypeCondition.ToursMasterID = null;
      expenseTypeCondition.projectID = null;
      expenseTypeCondition.serviceNumber = null;
    }
    if (expenseType === expenseTypes.PROJECT) {
      expenseTypeCondition.projectID = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (expenseType === expenseTypes.SERVICE) {
      expenseTypeCondition.serviceNumber = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (fromDate && toDate) {
      expenseTypeCondition.expense_date = {
        [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
      };
    }

    const condition = { status: { [Sequelize.Op.ne]: 10 } };

    if (status === expenseApprovalTypes.PAID) {
      condition.authorizationStatus = '3';
      condition[Sequelize.Op.or] = [
        { erpJvid: { [Sequelize.Op.ne]: null } },
        { payment_Id: { [Sequelize.Op.ne]: null } },
      ];
    }

    if (status === expenseApprovalTypes.APPROVED) {
      condition.authorizationStatus = '3';
      condition.erpJvid = { [Sequelize.Op.eq]: null };
      condition.payment_Id = { [Sequelize.Op.eq]: null };
    }
    if (status === expenseApprovalTypes.PENDING) {
      condition.authorizationStatus = { [Sequelize.Op.in]: ['0', '1', '2'] };
    }
    if (status === expenseApprovalTypes.REJECTED) {
      condition.authorizationStatus = '4';
    }
    const { rows: userExpenseData, count } =
      await UserExpenseTransaction.findAndCountAll({
        where: { ...condition },
        ...paginationQuery,
        attributes: [
          'userExpenseTransactionID',
          'userExpenseID',
          'expenseHeadId',
          'expenseAmount',
          'attachFile',
          'attachFile2',
          'attachFile3',
          'attachFile4',
          'description',
          'authorizationStatus',
          'status',
          'AuthorizationCriteriaID',
          'erpJvid',
          'payment_Id',
        ],
        include: [
          {
            model: ExpenseHead,
            as: 'eh',
            attributes: ['expenseHeadId', 'expenseHead'],
            include: [
              {
                model: ExpenseCategory,
                as: 'ec',
                attributes: ['expenseCategoryId', 'expenseCategory'],
              },
            ],
          },
          {
            model: ExpensePurpose,
            as: 'ep',
            attributes: ['expensePurposeID', 'name'],
          },
          {
            separate: true,
            model: ExpenseAuthorizationRequest,
            as: 'Auth',
            attributes: [
              'AuthorizationRequestId',
              'ReferenceID',
              'userMasterID',
              'authstatus',
              'remarks',
            ],
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
            model: AuthorizationCriteriaMaster,
            attributes: ['AuthorizationCriteriaID', 'AuthorizationCriteria'],
          },
          {
            model: UserExpense,
            as: 'userExpense',
            where: {
              userMasterID: userMasterID,
              ...expenseTypeCondition,
            },
            attributes: [
              'userExpenseID',
              'userMasterID',
              'expense_date',
              'createdAt',
              'visitID',
              'ToursMasterID',
              'projectID',
            ],
            include: [
              {
                model: UserMaster,
                attributes: userAttributes,
                required: true,
              },
            ],
          },
        ],
        order: [
          [Sequelize.literal(`"userExpense.expense_date"`), 'DESC'],
          ['createdAt', 'DESC'],
        ],
      });

    const userExpenseCalculations = await UserExpenseTransaction.findAll({
      where: { status: { [Sequelize.Op.ne]: 10 } },
      attributes: [
        [
          sequelize.literal('"userExpenseTransaction"."authorizationStatus"'),
          'authorizationStatus',
        ],
        [sequelize.fn('SUM', sequelize.col('expenseAmount')), 'totalExpense'],
        'erpJvid',
        'payment_Id',
      ],
      group: [
        '"userExpenseTransaction"."authorizationStatus"',
        'erpJvid',
        'payment_Id',
        'userExpenseTransaction.userExpenseTransactionID',
      ],
      include: [
        {
          model: UserExpense,
          attributes: [],
          as: 'userExpense',
          where: {
            userMasterID: userMasterID,
            ...expenseTypeCondition,
          },
          include: [
            {
              model: UserMaster,
              required: true,
              attributes: [],
            },
          ],
        },
      ],
    });

    if (exportData) {
      const objectForExcel = userExpenseData.map((element, i) => {
        let ExpenseType = '';
        if (element.userExpense?.visitID) ExpenseType = expenseTypes.VISIT;
        else if (element.userExpense?.ToursMasterID)
          ExpenseType = expenseTypes.TOUR;
        else if (element.userExpense?.projectID)
          ExpenseType = expenseTypes.PROJECT;
        else if (element.userExpense?.serviceNumber)
          ExpenseType = expenseTypes.SERVICE;
        else ExpenseType = expenseTypes.PERSONAL;
        let expenseAuthStatus =
          +element.authorizationStatus == 4
            ? 'Rejected'
            : +element.authorizationStatus == 3 &&
                !element.erpJvid &&
                !element.payment_Id
              ? 'Approved'
              : +element.authorizationStatus == 3 &&
                  (element.erpJvid || element.payment_Id)
                ? 'Paid'
                : 'Pending';

        const authData = [];
        for (let auth of element.Auth) {
          const authSatus =
            +auth.authstatus == 0
              ? 'Rejected'
              : +auth.authstatus == 1
                ? 'Approved'
                : 'Pending';

          authData.push(`${authSatus} - ${auth.authorizedPerson.displayName}`);
        }
        return {
          'Sr. No.': i + 1,
          'Expense Type': ExpenseType,
          'Voucher No.': element.userExpense?.userExpenseID,
          'Expense Date': element.userExpense?.expense_date,
          'Expense Amount': element.expenseAmount,
          'Expense Purpose': element.ep?.name,
          'Expense Category': element.eh?.ec?.expenseCategory,
          'Expense Head': element.eh?.expenseHead,
          'Auth Data': authData.join(' , '),
          Description: element.description,
          'Expense Auth Status': expenseAuthStatus,
        };
      });

      await generateExcel(
        objectForExcel,
        `Expense-Report-${fromDate}-${toDate}`,
        'xlsx',
        res,
      );

      return;
    }

    const Calculation = { Accepted: 0, Pending: 0, Rejected: 0, Paid: 0 };
    for (let element of userExpenseCalculations) {
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

    return res.status(200).json({
      data: userExpenseData,
      status: 200,
      totalcount: +count,
      userExpenseCalculations: Calculation,
    });
  } catch (err) {
    next(err);
  }
};

exports.reapply_V2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const userCompanyID = +req.userDetails.companyMasterId;
    let {
      oldExpenseTransID,
      userExpenseID,
      expenseAmount,
      expenseHeadId,
      expensePriceRuleID,
      attachFile,
      attachFile2,
      attachFile3,
      attachFile4,
      description,
      version,
      isNewAttachment,
      isNewAttachment2,
      isNewAttachment3,
      isNewAttachment4,
      userMasterID,
      filesTobeRemoved,
      expensePurposeID,
      policyType,
      checkInDate,
      checkOutDate,
      days,
      vehicleType,
      distanceKm,
      cityMasterID,
      maxAllowedAmount,
      attachThumb = null,
      attach2Thumb = null,
      attach3Thumb = null,
      attach4Thumb = null,
    } = await req.body;
    let i = 0;
    const attachments = {
      attachFile,
      attachFile2,
      attachFile3,
      attachFile4,
      attachThumb,
      attach2Thumb,
      attach3Thumb,
      attach4Thumb,
    };

    const attachmentConfigs = [
      {
        isNew: isNewAttachment,
        field: 'attachFile',
        thumbField: 'attachThumb',
      },
      {
        isNew: isNewAttachment2,
        field: 'attachFile2',
        thumbField: 'attach2Thumb',
      },
      {
        isNew: isNewAttachment3,
        field: 'attachFile3',
        thumbField: 'attach3Thumb',
      },
      {
        isNew: isNewAttachment4,
        field: 'attachFile4',
        thumbField: 'attach4Thumb',
      },
    ];

    for (const { isNew, field, thumbField } of attachmentConfigs) {
      if (isNew === 'true') {
        const attachmentFile = req.files?.[i];

        if (attachmentFile) {
          const attachmentPath = await s3OrLocalUploadFiles({
            attachment: attachmentFile.path,
            attachmentFileName: attachmentFile.filename,
            companyMasterId: userCompanyID,
            folderName: attachmentFilePathFolderNames.EXPENSE_ATTACHMENT,
            isDeleteLocalFile: true,
          });

          attachments[field] = attachmentPath || null;
          if (attachmentFile.thumbnailPath) {
            const thumbnailPath = await s3OrLocalUploadFiles({
              attachment: attachmentFile.thumbnailPath,
              attachmentFileName: attachmentFile.thumbnailFilename,
              companyMasterId: userCompanyID,
              folderName: attachmentFilePathFolderNames.EXPENSE_ATTACHMENT,
              isDeleteLocalFile: true,
            });

            attachments[thumbField] = thumbnailPath || null;
          }
        } else {
          attachments[field] =
            attachments[field] && attachments[field] !== 'null'
              ? attachments[field]
              : null;
        }

        i++;
      }
    }

    attachFile = attachments.attachFile;
    attachFile2 = attachments.attachFile2;
    attachFile3 = attachments.attachFile3;
    attachFile4 = attachments.attachFile4;
    attachThumb = attachments.attachThumb;
    attach2Thumb = attachments.attach2Thumb;
    attach3Thumb = attachments.attach3Thumb;
    attach4Thumb = attachments.attach4Thumb;

    // Get the existing transaction to retrieve expense date and userMasterID
    const existingTransaction = await UserExpenseTransaction.findOne({
      where: { userExpenseTransactionID: +oldExpenseTransID },
      include: [
        {
          model: UserExpense,
          as: 'userExpense',
          attributes: ['userExpenseID', 'userMasterID', 'expense_date'],
        },
      ],
      transaction,
    });

    if (!existingTransaction) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: 'Expense transaction not found',
      });
    }

    const expense_date = existingTransaction.userExpense.expense_date;

    // Validate accommodation date overlaps
    if (policyType === 'accommodation' && checkInDate && checkOutDate) {
      // Check for existing accommodation expenses with overlapping dates
      // Exclude the current transaction being reapplied (status 10) and its old versions
      const existingExpenses = await UserExpenseTransaction.findAll({
        include: [
          {
            model: UserExpense,
            as: 'userExpense',
            required: true,
            where: {
              userMasterID: userMasterID,
            },
          },
        ],
        where: {
          userExpenseTransactionID: { [Sequelize.Op.ne]: +oldExpenseTransID },
          status: 1, // Exclude deleted/old versions
          policyType: 'accommodation',
          checkInDate: { [Sequelize.Op.ne]: null },
          checkOutDate: { [Sequelize.Op.ne]: null },
          authorizationStatus: { [Sequelize.Op.ne]: 4 },
          // Date overlap logic: start1 < end2 AND end1 > start2
          [Sequelize.Op.and]: [
            { checkInDate: { [Sequelize.Op.lt]: checkOutDate } },
            { checkOutDate: { [Sequelize.Op.gt]: checkInDate } },
          ],
        },
        transaction,
      });

      if (existingExpenses.length > 0) {
        const formatDate = (dateStr) => {
          return moment(dateStr).format('DD-MM-YYYY');
        };

        const existingCheckIn = formatDate(existingExpenses[0].checkInDate);
        const existingCheckOut = formatDate(existingExpenses[0].checkOutDate);
        const newCheckIn = formatDate(checkInDate);
        const newCheckOut = formatDate(checkOutDate);

        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: `Accommodation date overlap detected! You have already added an expense from ${existingCheckIn} to ${existingCheckOut} which overlaps with your new dates ${newCheckIn} to ${newCheckOut}. Please choose different dates.`,
        });
      }
    }

    // Validate food expense daily limit
    if (policyType === 'food' && maxAllowedAmount) {
      // Get existing food expenses for the same date (any city)
      // Exclude the current transaction being reapplied (status 10) and its old versions
      const existingFoodExpenses = await UserExpenseTransaction.findAll({
        include: [
          {
            model: UserExpense,
            as: 'userExpense',
            required: true,
            where: {
              userMasterID: userMasterID,
              expense_date: expense_date,
            },
          },
        ],
        where: {
          userExpenseTransactionID: { [Sequelize.Op.ne]: +oldExpenseTransID },
          status: 1, // Exclude deleted/old versions
          policyType: 'food',
          authorizationStatus: { [Sequelize.Op.ne]: 4 }, // Exclude rejected expenses
        },
        attributes: ['expenseAmount', 'userExpenseTransactionID'],
        transaction,
      });

      // Calculate total existing food expense for this date (excluding current transaction)
      const existingTotal = existingFoodExpenses.reduce((sum, exp) => {
        return sum + (parseFloat(exp.expenseAmount) || 0);
      }, 0);

      // Add the current transaction's new amount
      const currentAmount = parseFloat(expenseAmount) || 0;
      const grandTotal = existingTotal + currentAmount;
      const maxAllowed = parseFloat(maxAllowedAmount);

      if (grandTotal > maxAllowed) {
        const formatDate = (dateStr) => {
          return moment(dateStr).format('DD-MM-YYYY');
        };

        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: `Daily food expense limit exceeded for ${formatDate(expense_date)}! Maximum allowed: ₹${maxAllowed.toFixed(2)}, Already claimed: ₹${existingTotal.toFixed(2)}, Current request: ₹${currentAmount.toFixed(2)}, Total: ₹${grandTotal.toFixed(2)}. Please reduce your expense amount.`,
        });
      }
    }

    // Validate own vehicle - only one expense per vehicle type per day
    if (policyType === 'ownVehicle' && vehicleType) {
      // Check if user already has another own vehicle expense for this vehicle type on this date
      // Exclude the current transaction being reapplied (status 10) and its old versions
      const existingOwnVehicleExpenses = await UserExpenseTransaction.findAll({
        include: [
          {
            model: UserExpense,
            as: 'userExpense',
            required: true,
            where: {
              userMasterID: userMasterID,
              expense_date: expense_date,
            },
          },
        ],
        where: {
          userExpenseTransactionID: { [Sequelize.Op.ne]: +oldExpenseTransID },
          status: 1, // Exclude deleted/old versions
          policyType: 'ownVehicle',
          vehicleType: vehicleType, // Check for same vehicle type
          authorizationStatus: { [Sequelize.Op.ne]: 4 },
        },
        transaction,
      });

      if (existingOwnVehicleExpenses.length > 0) {
        const formatDate = (dateStr) => {
          return moment(dateStr).format('DD-MM-YYYY');
        };

        const vehicleTypeName =
          vehicleType === 'twoWheeler' ? 'Two Wheeler' : 'Four Wheeler';

        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: `You have already added a ${vehicleTypeName} expense for ${formatDate(expense_date)}. Only one ${vehicleTypeName} expense is allowed per day. Please edit the existing expense or choose a different date.`,
        });
      }
    }

    const authorizationdetails = await findAuthorizationDetails(
      authorizationMasterTypes.expense,
      userMasterID,
    );

    let authStatus = 0;
    if (authorizationdetails) {
      if (
        +authorizationdetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO
      ) {
        authStatus = 2;
      } else {
        authStatus = 1;
      }
    }
    await UserExpenseTransaction.update(
      {
        status: 10,
      },
      {
        where: { userExpenseTransactionID: +oldExpenseTransID },
        transaction,
      },
    );
    let insert_db_status = await UserExpenseTransaction.create(
      {
        oldExpenseTransID,
        userExpenseID,
        expenseAmount,
        expenseHeadId,
        expensePriceRuleID,
        attachFile,
        attachFile2,
        attachFile3,
        attachFile4,
        attachThumb,
        attach2Thumb,
        attach3Thumb,
        attach4Thumb,
        description,
        authorizationStatus: authStatus,
        version,
        createBy,
        createByIp,
        AuthorizationCriteriaID:
          authorizationdetails && +authorizationdetails.AuthorizationCriteriaID
            ? +authorizationdetails.AuthorizationCriteriaID
            : null,
        expensePurposeID:
          expensePurposeID &&
          expensePurposeID != 'null' &&
          expensePurposeID != ''
            ? expensePurposeID
            : null,
        // Add policy type specific fields
        policyType: policyType || null,
        checkInDate: checkInDate || null,
        checkOutDate: checkOutDate || null,
        days: days ? parseFloat(days) : null,
        vehicleType: vehicleType || null,
        value: distanceKm ? parseFloat(distanceKm) : null,
        cityMasterID: cityMasterID ? parseInt(cityMasterID) : null,
        maxAllowedAmount: maxAllowedAmount
          ? parseFloat(maxAllowedAmount)
          : null,
        s3UploadattachFile: isStoreFileToS3Bucket,
        s3UploadattachFile2: isStoreFileToS3Bucket,
        s3UploadattachFile3: isStoreFileToS3Bucket,
        s3UploadattachFile4: isStoreFileToS3Bucket,
        migration: true,
      },
      { transaction },
    );
    if (authorizationdetails) {
      const inboxArray = [];
      const getAllUserDetails = await UserMaster.findAll({
        raw: true,
        distinct: true,
        where: {
          userMasterID: [
            ...authorizationdetails.AuthorizedByUserMasterId,
            userMasterID,
          ],
        },
        include: [
          {
            model: companyMaster,
            attributes: companyAttributes,
          },
        ],
        attributes: userAttributes,
        transaction,
      });
      if (
        +authorizationdetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO
      ) {
        const insetExpenseAuthRequest =
          await ExpenseAuthorizationRequest.create(
            {
              ReferenceID: +insert_db_status.userExpenseTransactionID,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
              status: 1,
              authstatus: 2,
              createBy,
              createByIp,
            },
            { transaction },
          );

        const authorizerData = getAllUserDetails.find(
          (e) =>
            e.userMasterID == +authorizationdetails.AuthorizedByUserMasterId[0],
        );

        const userData = getAllUserDetails.find(
          (e) => e.userMasterID == +userMasterID,
        );

        if (authorizerData && userData) {
          inboxArray.push({
            activityTable: UserExpense.getTableName(),
            activityTablePK:
              insetExpenseAuthRequest.toJSON().AuthorizationRequestId,
            message: `${userData.displayName} has applied for Expense of ${expenseAmount}`,
            assignedTo: authorizationdetails.AuthorizedByUserMasterId[0],
            assignedBy: userMasterID,
          });

          let notification = {
            title:
              'Hey ' +
              authorizerData.firstName +
              '! Someone reapplied for expense',
            body: userData.firstName + ' has reapplied for expense approval',
          };
          let data = {
            screen: 'expenserequest',
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
      } else {
        for (
          let i = 0;
          i < authorizationdetails.AuthorizedByUserMasterId.length;
          i++
        ) {
          const insetExpenseAuthRequest =
            await ExpenseAuthorizationRequest.create(
              {
                ReferenceID: insert_db_status.userExpenseTransactionID,
                userMasterID: authorizationdetails.AuthorizedByUserMasterId[i],
                status: 1,
                authstatus: 2,
                createBy,
                createByIp,
              },
              { transaction },
            );

          const authorizerData = getAllUserDetails.find(
            (e) =>
              e.userMasterID ==
              +authorizationdetails.AuthorizedByUserMasterId[i],
          );
          const userData = getAllUserDetails.find(
            (e) => e.userMasterID == +userMasterID,
          );

          if (authorizerData && userData) {
            inboxArray.push({
              activityTable: UserExpense.getTableName(),
              activityTablePK:
                insetExpenseAuthRequest.toJSON().AuthorizationRequestId,
              message: `${userData.displayName} has applied for Expense from ${expenseAmount}`,
              assignedTo: authorizationdetails.AuthorizedByUserMasterId[i],
              assignedBy: userMasterID,
            });

            let notification = {
              title:
                'Hey ' +
                authorizerData.firstName +
                '! Someone reapplied for expense',
              body: userData.firstName + ' has reapplied for expense approval',
            };
            let data = {
              screen: 'expenserequest',
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
      }
      await UserInbox.bulkCreate(inboxArray, {
        transaction,
      });
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.reapplyMessage('Expense'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.userExpenseNew_V3 = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      fromDate,
      toDate,
      expenseType,
      page = 1,
      limit = 10,
      userExpenseID,
    } = await req.body;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userMasterID = +req.userDetails.userMasterId;
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (+page - 1) * +limit;
      paginationQuery.limit = +limit;
    }

    const expenseTypeCondition = {
      userMasterID: userMasterID,
    };

    if (expenseType === expenseTypes.VISIT) {
      expenseTypeCondition.visitID = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (expenseType === expenseTypes.TOUR) {
      expenseTypeCondition.ToursMasterID = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (expenseType === expenseTypes.PERSONAL) {
      expenseTypeCondition.visitID = null;
      expenseTypeCondition.ToursMasterID = null;
      expenseTypeCondition.projectID = null;
      expenseTypeCondition.serviceNumber = null;
    }
    if (expenseType === expenseTypes.PROJECT) {
      expenseTypeCondition.projectID = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (expenseType === expenseTypes.SERVICE) {
      expenseTypeCondition.serviceNumber = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (fromDate && toDate) {
      if (fromDate > toDate) {
        return res
          .status(statusCodes.BAD_REQUEST)
          .json({ message: message.usermessage.validDateRange() });
      }
      expenseTypeCondition.expense_date = {
        [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
      };
    }

    if (userExpenseID) {
      expenseTypeCondition.userExpenseID = userExpenseID;
    }
    const { rows: findallExpenses, count } = await UserExpense.findAndCountAll({
      where: expenseTypeCondition,
      ...paginationQuery,
      order: [['expense_date', 'DESC']],
      distinct: true,
      attributes: {
        include: [
          [
            Sequelize.literal(`(
    SELECT json_build_object(
      'pending', COUNT(*) FILTER (
        WHERE uet."deletedAt" IS NULL 
        AND uet."authorizationStatus" IN (0, 1, 2)
        AND uet."status" = 1
      ),
      'approved', COUNT(*) FILTER (
        WHERE uet."deletedAt" IS NULL 
        AND uet."authorizationStatus" = 3
        AND uet."status" = 1
        AND (uet."erpJvid" IS NULL OR uet."erpJvid" = '')
        AND uet."payment_Id" IS NULL
        ),
      'paid', COUNT(*) FILTER (
        WHERE uet."deletedAt" IS NULL 
        AND uet."authorizationStatus" = 3
        AND uet."status" = 1
        AND ((uet."erpJvid" IS NOT NULL OR uet."erpJvid" != '')
        OR uet."payment_Id" IS NOT NULL)
      ),
      'rejected', COUNT(*) FILTER (
        WHERE uet."deletedAt" IS NULL 
        AND uet."authorizationStatus" = 4
        AND uet."status" = 1
      ),
      'reapplied', COUNT(*) FILTER (
        WHERE uet."deletedAt" IS NULL
        AND uet.version NOTNULL
      ),
      'total', COUNT(*) FILTER (
        WHERE uet."status" = 1
      ),
      'pendingAmount', COALESCE(SUM(
        CASE 
          WHEN uet."deletedAt" IS NULL 
            AND uet."authorizationStatus" IN (0, 1, 2)
            AND uet."status" = 1
          THEN uet."expenseAmount" 
          ELSE 0 
        END
      ), 0),
      'approvedAmount', COALESCE(SUM(
        CASE 
          WHEN uet."deletedAt" IS NULL 
            AND uet."authorizationStatus" = 3
            AND uet."status" = 1 
           AND (uet."erpJvid" IS NULL OR uet."erpJvid" = '')
            AND uet."payment_Id" IS NULL
          THEN uet."expenseAmount" 
          ELSE 0 
        END
      ), 0),
      'paidAmount', COALESCE(SUM(
        CASE 
          WHEN uet."deletedAt" IS NULL 
            AND uet."authorizationStatus" = 3
            AND uet."status" = 1
            AND ((uet."erpJvid" IS NOT NULL OR uet."erpJvid" != '')
            OR uet."payment_Id" IS NOT NULL)
          THEN uet."expenseAmount" 
          ELSE 0 
        END
      ), 0),
      'rejectedAmount', COALESCE(SUM(
        CASE 
          WHEN uet."deletedAt" IS NULL 
            AND uet."authorizationStatus" = 4
            AND uet."status" = 1
          THEN uet."expenseAmount" 
          ELSE 0 
        END
      ), 0),
      'totalExpenseAmount', COALESCE(SUM(
        CASE 
          WHEN uet."deletedAt" IS NULL 
            AND uet."status" = 1
          THEN uet."expenseAmount" 
          ELSE 0 
        END
      ), 0),
       'reappliedAmount', COALESCE(SUM(
        CASE 
          WHEN uet."deletedAt" IS NULL
            AND uet.version NOTNULL
          THEN uet."expenseAmount" 
          ELSE 0 
        END
      ), 0)
    )
    FROM "userExpenseTransactions" AS uet 
    WHERE uet."userExpenseID" = "userExpense"."userExpenseID" AND uet."deletedAt" IS NULL
  )`),
            'expenseSummary',
          ],
        ],
      },
    });
    const userExpenseCalculations = await UserExpenseTransaction.findAll({
      where: { status: { [Sequelize.Op.ne]: 10 } },
      attributes: [
        [
          sequelize.literal('"userExpenseTransaction"."authorizationStatus"'),
          'authorizationStatus',
        ],
        [sequelize.fn('SUM', sequelize.col('expenseAmount')), 'totalExpense'],
        'erpJvid',
        'payment_Id',
      ],
      group: [
        '"userExpenseTransaction"."authorizationStatus"',
        'erpJvid',
        'payment_Id',
        'userExpenseTransaction.userExpenseTransactionID',
      ],
      include: [
        {
          model: UserExpense,
          attributes: [],
          as: 'userExpense',
          where: {
            userMasterID: userMasterID,
            ...expenseTypeCondition,
          },
        },
      ],
    });

    const Calculation = { Accepted: 0, Pending: 0, Rejected: 0, Paid: 0 };
    for (let element of userExpenseCalculations) {
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

    return res.status(200).json({
      data: findallExpenses,
      status: 200,
      totalcount: +count,
      userExpenseCalculations: Calculation,
    });
  } catch (err) {
    next(err);
  }
};

exports.userExpenseByID = async (req, res, next) => {
  try {
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const { authorizerUserMasterID, userExpenseID, isPrintVoucher } =
      await req.body;
    if (!userExpenseID)
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });
    const expenseAuthCondition = {};
    expenseAuthCondition.status = 1;
    expenseAuthCondition.userMasterID = req.userDetails.userMasterId;
    const findExpenseData = await UserExpense.findOne({
      where: { userExpenseID },
      include: [
        {
          required: true,
          model: UserMaster,
          attributes: userAttributes,
          include: [
            {
              model: companyMaster,
              attributes: [...companyAttributes, 'companyAddress'],
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
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
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
          ],
        },
        {
          required: true,
          separate: true,
          model: UserExpenseTransaction,
          where: {
            status: { [Sequelize.Op.ne]: 10 },
          },
          order: [['userExpenseTransactionID', 'ASC']],
          include: [
            {
              model: UserMaster,
              as: 'authorizer',
              attributes: ['displayName'],
            },
            {
              model: ExpenseHead,
              attributes: ['expenseHeadId', 'expenseHead', 'expenseCategoryId'],
              include: [
                {
                  model: ExpenseCategory,
                  attributes: ['expenseCategoryId', 'expenseCategory'],
                },
              ],
            },
            {
              model: ExpensePurpose,
              as: 'ep',
              attributes: ['expensePurposeID', 'name'],
            },
            {
              required: false,
              model: CityMaster,
              as: 'cityMaster',
              attributes: [
                'cityMasterID',
                'cityName',
                'stateMasterID',
                'isMetro',
              ],
              include: [
                {
                  model: StateMaster,
                  attributes: ['stateMasterID', 'stateName', 'stateCode'],
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
              model: ExpenseAuthorizationRequest,
              include: [
                {
                  required: true,
                  model: UserMaster,
                  as: 'authorizedPerson',
                  attributes: userAttributes,
                  include: [
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
                            endDate: {
                              [Sequelize.Op.gte]: new Date(filterDate),
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
              ],
            },
            {
              separate: true,
              model: ExpenseAuthorizationRequest,
              as: 'Auth',
              where: expenseAuthCondition,
            },
          ],
        },
        {
          required: false,
          model: Project,
          attributes: [
            'projectID',
            'projectName',
            'display_id',
            'short_name',
            'projectDescription',
          ],
        },
      ],
    });
    if (isPrintVoucher) {
      let totalExpenseAmount = 0;

      const expenseData = (findExpenseData.userExpenseTransactions || []).map(
        (e, i) => {
          totalExpenseAmount += e.expenseAmount;
          const approvedAuths = e.expenseAuthorizations.filter(
            (e) => e.authstatus == 1,
          );
          const approvalDateArray = approvedAuths.map((e) =>
            moment(e.updatedAt, 'YYYY-MM-DD').format('DD-MM-YYYY'),
          );
          const approvalByArray = approvedAuths.map(
            (e) => e.authorizedPerson?.displayName,
          );
          const approvalByDesignationArray = approvedAuths.map(
            (e) =>
              e.authorizedPerson?.employeeDesignations?.[0]?.designation
                .designationName,
          );
          const approvalRemarksArray = approvedAuths.map((e) =>
            e.remarks ? e.remarks : `-`,
          );
          return {
            index: i + 1,
            expenseDate: moment(
              findExpenseData.expense_date,
              'YYYY-MM-DD',
            ).format('DD-MM-YYYY'),
            expenseCategory: e.expenseHead?.expenseCategory?.expenseCategory,
            expenseHead: e.expenseHead?.expenseHead,
            expenseAmount: e.expenseAmount,
            approvalDateArray,
            approvalByArray,
            approvalByDesignationArray,
            approvalRemarksArray,
          };
        },
      );

      const voucherData = {
        companyName:
          findExpenseData?.userMaster?.companyMaster?.companyName || '',
        month: moment(filterDate, 'YYYY-MM-DD').format('MMMM YYYY'),
        companyAddress: findExpenseData?.companyMaster?.companyAddress || '',
        userExpenseID: findExpenseData.userExpenseID,
        employeeName: `${findExpenseData?.userMaster?.displayName}` || '',
        employeeCode:
          findExpenseData?.userMaster?.employeeJoiningDetails?.[0]
            ?.employeeCode || '',
        totalExpenseAmount,
        expenseData,
        expenseRequestDate: moment(findExpenseData.createdAt).format(
          'DD-MM-YYYY HH:mm',
        ),
        projectID: findExpenseData?.project?.display_id || '',
      };

      let base64path = '';

      base64path = await generateHTMLToPDF_base64Path(
        voucherData,
        'expenseVoucher',
        'portrait',
        'html', //File Extension
      );
      return res.status(200).json({
        data: base64path,
        status: 200,
      });
    } else {
      return res.status(200).json({
        data: findExpenseData,
        status: 200,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.updatebyUserExpenseID = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const companyMasterID = req.userDetails.companyMasterId;
    const userCompanyID = +req.userDetails.companyMasterId;
    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const formData = req.body;
    const userExpenseID = +formData['userExpenseID'];
    const files = req.files;
    const entryCount = Object.keys(formData).filter((key) =>
      key.startsWith('expenseHeadId'),
    ).length;
    // Find userExpense first to get userMasterID for validation
    const findUserExpense = await UserExpense.findOne({
      where: {
        userExpenseID: userExpenseID,
      },
      include: [
        {
          required: true,
          model: UserExpenseTransaction,
          as: 'ut',
          where: {
            status: { [Sequelize.Op.ne]: 10 },
          },
          order: [['userExpenseTransactionID', 'ASC']],
        },
        {
          model: UserMaster,
          attributes: userAttributes,
        },
      ],
    });
    const existingExpensetrans = findUserExpense?.ut || [];
    const expenseTransactionTobeDestroyed = [];
    const expenseTransactionTobeAdd = [];
    const expenseTransactionTobeUpdate = [];
    const userExpenseTransactionIDs = [];
    let index_attch = 0;
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
        expenseHeadId: +formData[`expenseHeadId${i}`],
        expensePriceRuleID: formData[`expensePriceRuleID${i}`]
          ? +formData[`expensePriceRuleID${i}`]
          : null,
        expenseAmount: +formData[`expenseAmount${i}`],
        description: formData[`description${i}`],
        attachFile: null,
        attachFile2: null,
        attachFile3: null,
        attachFile4: null,
        updateBy: createBy,
        updateByIp: createByIp,
        userExpenseTransactionID: formData[`userExpenseTransactionID_${i}`]
          ? +formData[`userExpenseTransactionID_${i}`]
          : null,
        expensePurposeID:
          formData[`expensePurposeID${i}`] &&
          formData[`expensePurposeID${i}`] != 'null' &&
          formData[`expensePurposeID${i}`] != ''
            ? formData[`expensePurposeID${i}`]
            : null,
        // Add policy type specific fields
        policyType: formData[`policyType${i}`] || null,
        checkInDate: formData[`checkInDate${i}`] || null,
        checkOutDate: formData[`checkOutDate${i}`] || null,
        days: formData[`days${i}`] ? parseFloat(formData[`days${i}`]) : null,
        cityMasterID: formData[`cityMasterID${i}`]
          ? parseInt(formData[`cityMasterID${i}`])
          : null,
        vehicleType:
          formData[`vehicleType${i}`] || formData[`transportType${i}`] || null,
        value: formData[`distanceKm${i}`]
          ? parseFloat(formData[`distanceKm${i}`])
          : null,
        maxAllowedAmount: formData[`maxAllowedAmount${i}`]
          ? parseFloat(formData[`maxAllowedAmount${i}`])
          : null,
        s3UploadattachFile: isStoreFileToS3Bucket,
        s3UploadattachFile2: isStoreFileToS3Bucket,
        s3UploadattachFile3: isStoreFileToS3Bucket,
        s3UploadattachFile4: isStoreFileToS3Bucket,
        attachThumb: null,
        attach2Thumb: null,
        attach3Thumb: null,
        attach4Thumb: null,
      };
      if (addObj.userExpenseTransactionID) {
        const findTrans = existingExpensetrans.find(
          (e) =>
            +e.userExpenseTransactionID == +addObj.userExpenseTransactionID,
        );
        if (findTrans) {
          addObj.attachThumb = findTrans.attachThumb;
          addObj.attach2Thumb = findTrans.attach2Thumb;
          addObj.attach3Thumb = findTrans.attach3Thumb;
          addObj.attach4Thumb = findTrans.attach4Thumb;
        }
        userExpenseTransactionIDs.push(+addObj.userExpenseTransactionID);
      }
      const attachmentConfigs = [
        {
          check: checkAttach,
          field: 'attachFile',
          thumbField: 'attachThumb',
          formField: `attachFile1_${i}`,
        },
        {
          check: checkAttach2,
          field: 'attachFile2',
          thumbField: 'attach2Thumb',
          formField: `attachFile2_${i}`,
        },
        {
          check: checkAttach3,
          field: 'attachFile3',
          thumbField: 'attach3Thumb',
          formField: `attachFile3_${i}`,
        },
        {
          check: checkAttach4,
          field: 'attachFile4',
          thumbField: 'attach4Thumb',
          formField: `attachFile4_${i}`,
        },
      ];

      for (const { check, field, formField, thumbField } of attachmentConfigs) {
        const attendanceAttachmentUrl = files?.[index_attch] || null;

        if (check && attendanceAttachmentUrl) {
          const attachmentPath = await s3OrLocalUploadFiles({
            attachment: attendanceAttachmentUrl.path,
            attachmentFileName: attendanceAttachmentUrl.filename,
            companyMasterId: userCompanyID,
            folderName: attachmentFilePathFolderNames.EXPENSE_ATTACHMENT,
            isDeleteLocalFile: true,
          });

          addObj[field] = attachmentPath || null;
          if (attendanceAttachmentUrl.thumbnailPath) {
            const thumbnailPath = await s3OrLocalUploadFiles({
              attachment: attendanceAttachmentUrl.thumbnailPath,
              attachmentFileName: attendanceAttachmentUrl.thumbnailFilename,
              companyMasterId: userCompanyID,
              folderName: attachmentFilePathFolderNames.EXPENSE_ATTACHMENT,
              isDeleteLocalFile: true,
            });

            addObj[thumbField] = thumbnailPath || null;
          }
        } else {
          addObj[field] = formData[formField] || null;
        }

        if (check) {
          index_attch++;
        }
      }
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

    // Validate accommodation date overlaps
    const allExpenseTransactions = [
      ...expenseTransactionTobeAdd,
      ...expenseTransactionTobeUpdate,
    ];

    for (let i = 0; i < allExpenseTransactions.length; i++) {
      const transaction_item = allExpenseTransactions[i];

      if (
        transaction_item.policyType === 'accommodation' &&
        transaction_item.checkInDate &&
        transaction_item.checkOutDate
      ) {
        // Check for existing accommodation expenses with overlapping dates
        const existingExpenses = await UserExpenseTransaction.findAll({
          include: [
            {
              model: UserExpense,
              as: 'userExpense',
              required: true,
              where: {
                userMasterID: findUserExpense.userMasterID,
              },
            },
          ],
          where: {
            policyType: 'accommodation',
            checkInDate: { [Sequelize.Op.ne]: null },
            authorizationStatus: { [Sequelize.Op.ne]: 4 },
            checkOutDate: { [Sequelize.Op.ne]: null },
            // Exclude current transaction being edited
            userExpenseTransactionID: transaction_item.userExpenseTransactionID
              ? { [Sequelize.Op.ne]: transaction_item.userExpenseTransactionID }
              : { [Sequelize.Op.ne]: null },
            // Date overlap logic: start1 < end2 AND end1 > start2
            // This allows consecutive bookings where checkout = next checkin
            [Sequelize.Op.and]: [
              {
                checkInDate: {
                  [Sequelize.Op.lt]: transaction_item.checkOutDate,
                },
              },
              {
                checkOutDate: {
                  [Sequelize.Op.gt]: transaction_item.checkInDate,
                },
              },
            ],
          },
        });

        if (existingExpenses.length > 0) {
          const formatDate = (dateStr) => {
            return moment(dateStr).format('DD-MM-YYYY');
          };

          const existingCheckIn = formatDate(existingExpenses[0].checkInDate);
          const existingCheckOut = formatDate(existingExpenses[0].checkOutDate);
          const newCheckIn = formatDate(transaction_item.checkInDate);
          const newCheckOut = formatDate(transaction_item.checkOutDate);

          await transaction.rollback();
          return res.status(200).json({
            status: 400,
            message: `Accommodation date overlap detected! You have already added an expense from ${existingCheckIn} to ${existingCheckOut} which overlaps with your new dates ${newCheckIn} to ${newCheckOut}. Please choose different dates.`,
          });
        }
      }

      if (
        transaction_item.policyType === 'food' &&
        transaction_item.maxAllowedAmount
      ) {
        // Get existing food expenses for the same date (any city)
        const existingFoodExpenses = await UserExpenseTransaction.findAll({
          include: [
            {
              model: UserExpense,
              as: 'userExpense',
              required: true,
              where: {
                userMasterID: findUserExpense.userMasterID,
                expense_date: findUserExpense.expense_date,
              },
            },
          ],
          where: {
            policyType: 'food',
            authorizationStatus: { [Sequelize.Op.ne]: 4 },
            // Exclude current transaction being edited
            userExpenseTransactionID: transaction_item.userExpenseTransactionID
              ? { [Sequelize.Op.ne]: transaction_item.userExpenseTransactionID }
              : { [Sequelize.Op.ne]: null },
          },
          attributes: ['expenseAmount'],
        });

        // Calculate total existing food expense for this date
        const existingTotal = existingFoodExpenses.reduce((sum, exp) => {
          return sum + (parseFloat(exp.expenseAmount) || 0);
        }, 0);

        // Calculate total from current submission for food expenses
        const currentFoodTotal = allExpenseTransactions
          .filter((t) => t.policyType === 'food')
          .reduce((sum, t) => sum + (parseFloat(t.expenseAmount) || 0), 0);

        const grandTotal = existingTotal + currentFoodTotal;
        const maxAllowed = parseFloat(transaction_item.maxAllowedAmount);

        if (grandTotal > maxAllowed) {
          const formatDate = (dateStr) => {
            return moment(dateStr).format('DD-MM-YYYY');
          };

          await transaction.rollback();
          return res.status(200).json({
            status: 400,
            message: `Daily food expense limit exceeded for ${formatDate(findUserExpense.expense_date)}! Maximum allowed: ₹${maxAllowed.toFixed(2)}, Already claimed: ₹${existingTotal.toFixed(2)}, Current request: ₹${currentFoodTotal.toFixed(2)}, Total: ₹${grandTotal.toFixed(2)}. Please reduce your expense amount.`,
          });
        }
      }

      // Validate own vehicle - only one expense per vehicle type per day
      if (
        transaction_item.policyType === 'ownVehicle' &&
        transaction_item.vehicleType
      ) {
        // Check if user already has another own vehicle expense for this vehicle type on this date
        const existingOwnVehicleExpenses = await UserExpenseTransaction.findAll(
          {
            include: [
              {
                model: UserExpense,
                as: 'userExpense',
                required: true,
                where: {
                  userMasterID: findUserExpense.userMasterID,
                  expense_date: findUserExpense.expense_date,
                },
              },
            ],
            where: {
              policyType: 'ownVehicle',
              vehicleType: transaction_item.vehicleType, // Check for same vehicle type
              authorizationStatus: { [Sequelize.Op.ne]: 4 },
              // Exclude current transaction being edited
              userExpenseTransactionID:
                transaction_item.userExpenseTransactionID
                  ? {
                      [Sequelize.Op.ne]:
                        transaction_item.userExpenseTransactionID,
                    }
                  : { [Sequelize.Op.ne]: null },
            },
          },
        );

        if (existingOwnVehicleExpenses.length > 0) {
          const formatDate = (dateStr) => {
            return moment(dateStr).format('DD-MM-YYYY');
          };

          const vehicleTypeName =
            transaction_item.vehicleType === 'twoWheeler'
              ? 'Two Wheeler'
              : 'Four Wheeler';

          await transaction.rollback();
          return res.status(200).json({
            status: 400,
            message: `You have already added a ${vehicleTypeName} expense for ${formatDate(findUserExpense.expense_date)}. Only one ${vehicleTypeName} expense is allowed per day. Please edit the existing expense or choose a different date.`,
          });
        }

        // Check if current submission has multiple expenses of same vehicle type
        const sameVehicleTypeCount = allExpenseTransactions.filter(
          (t) =>
            t.policyType === 'ownVehicle' &&
            t.vehicleType === transaction_item.vehicleType,
        ).length;

        if (sameVehicleTypeCount > 1) {
          const formatDate = (dateStr) => {
            return moment(dateStr).format('DD-MM-YYYY');
          };

          const vehicleTypeName =
            transaction_item.vehicleType === 'twoWheeler'
              ? 'Two Wheeler'
              : 'Four Wheeler';

          await transaction.rollback();
          return res.status(200).json({
            status: 400,
            message: `You are trying to add ${sameVehicleTypeCount} ${vehicleTypeName} expenses for ${formatDate(findUserExpense.expense_date)}. Only one ${vehicleTypeName} expense is allowed per day.`,
          });
        }
      }
    }

    const [
      findCompanyExpenseMailTemplate,
      findCompanyNotificationPolicyData,
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
      ExpenseAuthorizationRequest.findAll({
        where: {
          ReferenceID: {
            [Sequelize.Op.in]: userExpenseTransactionIDs,
          },
        },
      }),
    ]);
    if (expenseTransactionTobeAdd.length) {
      if (ProjectName == projectNamesList.MARS) {
        const reponseData = await canApplyExpense(
          userCompanyID,
          findUserExpense.expense_date,
          currentdate,
        );
        if (!reponseData.canApply) {
          await transaction.rollback();
          return res.status(200).json({
            status: 401,
            message: reponseData.message,
          });
        }
      } else {
        const findUserCompany = await companyMaster.findOne({
          where: {
            companyMasterID: userCompanyID,
          },
          attributes: ['expenseDatePicker'],
        });
        if (findUserCompany && findUserCompany.expenseDatePicker) {
          const diffInDays = Math.abs(
            moment(currentdate).diff(
              moment(findUserExpense.expense_date),
              'days',
            ),
          );

          if (+diffInDays > +findUserCompany.expenseDatePicker) {
            await transaction.rollback();
            return res.status(200).json({
              status: 401,
              message: message.usermessage.expenseDatePicker(
                +findUserCompany.expenseDatePicker,
              ),
            });
          }
        }
      }
    }
    const promiseArray = [];
    for (let trans of expenseTransactionTobeDestroyed) {
      const AuthorizationRequestIds = findExpenseRequestData
        .filter((e) => +e.ReferenceID == +trans.userExpenseTransactionID)
        .map((e) => +e.AuthorizationRequestId);

      const destroyInbox = UserInbox.destroy(
        {
          where: {
            activityTable: UserExpense.getTableName(),
            activityTablePK: {
              [Sequelize.Op.in]: AuthorizationRequestIds,
            },
          },
        },
        { transaction },
      );
      promiseArray.push(destroyInbox);

      const destroyAuth = ExpenseAuthorizationRequest.destroy(
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
      const destroyTrans = UserExpenseTransaction.destroy(
        {
          where: {
            userExpenseTransactionID: +trans.userExpenseTransactionID,
          },
        },
        { transaction },
      );
      promiseArray.push(destroyTrans);
    }
    for (let trans of expenseTransactionTobeUpdate) {
      const findApprovedRejectedRequests = findExpenseRequestData.find(
        (e) =>
          +e.ReferenceID == +trans.userExpenseTransactionID &&
          e.authstatus != 2,
      );
      if (findApprovedRejectedRequests) continue;
      const AuthorizationRequestIds = findExpenseRequestData
        .filter((e) => +e.ReferenceID == +trans.userExpenseTransactionID)
        .map((e) => +e.AuthorizationRequestId);

      const updateInbox = UserInbox.update(
        {
          message: `${findUserExpense?.userMaster?.displayName} has applied for Expense of ${trans.expenseAmount}`,
        },
        {
          where: {
            activityTable: UserExpense.getTableName(),
            activityTablePK: { [Sequelize.Op.in]: AuthorizationRequestIds },
          },
          transaction,
        },
      );
      promiseArray.push(updateInbox);
      const updateTrans = UserExpenseTransaction.update(
        {
          expenseAmount: trans.expenseAmount,
          attachFile: trans.attachFile,
          attachFile2: trans.attachFile2,
          attachFile3: trans.attachFile3,
          attachFile4: trans.attachFile4,
          description: trans.description,
          expenseHeadId: trans.expenseHeadId,
          expensePriceRuleID: trans.expensePriceRuleID,
          updateBy: trans.updateBy,
          updateByIp: trans.updateByIp,
          expensePurposeID: trans.expensePurposeID,
          // Add policy type specific fields
          policyType: trans.policyType,
          checkInDate: trans.checkInDate,
          checkOutDate: trans.checkOutDate,
          days: trans.days,
          cityMasterID: trans.cityMasterID,
          vehicleType: trans.vehicleType,
          value: trans.value,
          s3UploadattachFile: isStoreFileToS3Bucket,
          s3UploadattachFile2: isStoreFileToS3Bucket,
          s3UploadattachFile3: isStoreFileToS3Bucket,
          s3UploadattachFile4: isStoreFileToS3Bucket,
          migration: true,
        },
        {
          where: {
            userExpenseTransactionID: trans.userExpenseTransactionID,
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PENDING_ZERO,
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
          transaction,
        },
      );
      promiseArray.push(updateTrans);
    }
    const authorizationdetails = await findAuthorizationDetails(
      authorizationMasterTypes.expense,
      findUserExpense.userMasterID,
    );

    let authStatus = 0;
    if (authorizationdetails) {
      if (
        +authorizationdetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO
      ) {
        authStatus = 2;
      } else {
        authStatus = 1;
      }
    }
    const createExpenseTrnas = [];
    const expenseHeadIds = new Set();

    // Validate daily food expense limits before processing
    for (let trans of expenseTransactionTobeAdd) {
      if (
        trans.policyType === 'food' &&
        trans.expenseAmount &&
        trans.cityMasterID
      ) {
        // Get all existing food expenses for the same date and city
        const existingFoodExpenses = await UserExpenseTransaction.findAll({
          where: {
            policyType: 'food',
            cityMasterID: trans.cityMasterID,
            status: { [Sequelize.Op.ne]: 10 },
            authorizationStatus: { [Sequelize.Op.ne]: 4 }, // Exclude rejected
          },
          include: [
            {
              model: UserExpense,
              as: 'userExpense',
              where: {
                userMasterID: findUserExpense.userMasterID,
                expense_date: findUserExpense.expense_date,
              },
            },
          ],
          raw: true,
          transaction,
        });

        // Calculate total existing food expense for this date
        const totalExistingAmount = existingFoodExpenses.reduce(
          (sum, exp) => sum + (parseFloat(exp.expenseAmount) || 0),
          0,
        );

        // Get policy limit for this food expense
        if (trans.maxAllowedAmount) {
          const newTotal =
            totalExistingAmount + parseFloat(trans.expenseAmount);

          if (newTotal > trans.maxAllowedAmount) {
            await transaction.rollback();
            const cityInfo = await CityMaster.findOne({
              where: { cityMasterID: trans.cityMasterID },
              attributes: ['cityName'],
            });
            const cityName = cityInfo ? cityInfo.cityName : 'Selected city';
            return res.status(200).json({
              status: 401,
              message: `Food expense limit exceeded for ${cityName} on ${moment(findUserExpense.expense_date).format('DD-MM-YYYY')}. Maximum allowed: ₹${trans.maxAllowedAmount}, Already claimed: ₹${totalExistingAmount.toFixed(2)}, Current request: ₹${trans.expenseAmount}, Total: ₹${newTotal.toFixed(2)}`,
            });
          }
        }
      }
    }

    for (let trans of expenseTransactionTobeAdd) {
      const createTransObj = {
        userExpenseID,
        expenseHeadId: trans.expenseHeadId,
        expensePriceRuleID: trans.expenseHeadId,
        expenseAmount: trans.expenseAmount,
        attachFile: trans.attachFile ? trans.attachFile : null,
        attachFile2: trans.attachFile2 ? trans.attachFile2 : null,
        attachFile3: trans.attachFile3 ? trans.attachFile3 : null,
        attachFile4: trans.attachFile4 ? trans.attachFile4 : null,
        description: trans.description,
        authorizationStatus: authStatus,
        AuthorizationCriteriaID:
          authorizationdetails && +authorizationdetails.AuthorizationCriteriaID
            ? +authorizationdetails.AuthorizationCriteriaID
            : null,
        expensePurposeID: trans.expensePurposeID,
        // Add policy type specific fields
        policyType: trans.policyType || null,
        checkInDate: null,
        checkOutDate: null,
        days: null,
        vehicleType: null,
        value: null,
        cityMasterID: null,
        s3UploadattachFile: isStoreFileToS3Bucket,
        s3UploadattachFile2: isStoreFileToS3Bucket,
        s3UploadattachFile3: isStoreFileToS3Bucket,
        s3UploadattachFile4: isStoreFileToS3Bucket,
        migration: true,
      };

      // Set fields based on policy type
      if (trans.policyType === 'accommodation') {
        createTransObj.checkInDate = trans.checkInDate || null;
        createTransObj.checkOutDate = trans.checkOutDate || null;
        createTransObj.days = trans.days || null;
        createTransObj.cityMasterID = trans.cityMasterID || null;
      } else if (trans.policyType === 'food') {
        createTransObj.cityMasterID = trans.cityMasterID || null;
      } else if (
        trans.policyType === 'localTransport' ||
        trans.policyType === 'outstationTravel'
      ) {
        createTransObj.vehicleType = trans.transportType || null; // Store transport type in vehicleType column
      } else if (trans.policyType === 'ownVehicle') {
        createTransObj.vehicleType = trans.vehicleType || null; // Store vehicle type (twoWheeler/fourWheeler)
        createTransObj.value = trans.distanceKm || null; // Store km driven in value column
      }

      createExpenseTrnas.push(createTransObj);
      expenseHeadIds.add(trans.expenseHeadId);
    }
    const inboxArray = [];
    await UserExpenseTransaction.bulkCreate(createExpenseTrnas, {
      returning: true,
      transaction,
    }).then(async (response) => {
      if (authorizationdetails) {
        const getAllUserDetails = await UserMaster.findAll({
          distinct: true,
          where: {
            userMasterID: [
              ...authorizationdetails.AuthorizedByUserMasterId,
              findUserExpense.userMasterID,
            ],
          },
          attributes: userAttributes,
          include: [
            {
              required: false,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              required: false,
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(currentdate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(currentdate) } },
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
                  [Sequelize.Op.lte]: new Date(currentdate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(currentdate) },
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
                  [Sequelize.Op.lte]: new Date(currentdate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: { [Sequelize.Op.gte]: new Date(currentdate) },
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
          ],
        });
        const findExpenseHeadData = await UserExpenseHeadModel.findAll({
          where: {
            expenseHeadId: {
              [Sequelize.Op.in]: [...expenseHeadIds],
            },
          },
          include: [
            {
              model: ExpenseCategory,
            },
          ],
        });

        let ExpenseType = '';
        if (findUserExpense.visitID) ExpenseType = expenseTypes.VISIT;
        else if (findUserExpense.ToursMasterID) ExpenseType = expenseTypes.TOUR;
        else if (findUserExpense.projectID) ExpenseType = expenseTypes.PROJECT;
        else if (findUserExpense.serviceNumber)
          ExpenseType = expenseTypes.SERVICE;
        else ExpenseType = expenseTypes.PERSONAL;

        if (
          +authorizationdetails.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          for (let i = 0; i < response.length; i++) {
            const findHeadData = findExpenseHeadData.find(
              (e) => e.expenseHeadId == response[i].expenseHeadId,
            );
            const insetExpenseAuthRequest =
              await ExpenseAuthorizationRequest.create(
                {
                  ReferenceID: response[i].userExpenseTransactionID,
                  userMasterID:
                    authorizationdetails.AuthorizedByUserMasterId[0],
                  status: 1,
                  authstatus: 2,
                  createBy,
                  createByIp,
                },
                { transaction },
              );

            const authorizerData = getAllUserDetails.find(
              (e) =>
                e.userMasterID ==
                +authorizationdetails.AuthorizedByUserMasterId[0],
            );

            const userData = getAllUserDetails.find(
              (e) => e.userMasterID == +findUserExpense.userMasterID,
            );

            if (authorizerData && userData) {
              inboxArray.push({
                activityTable: UserExpense.getTableName(),
                activityTablePK:
                  insetExpenseAuthRequest.toJSON().AuthorizationRequestId,
                message: `${userData.displayName} has applied for Expense of ${response[i].expenseAmount}`,
                assignedTo: authorizationdetails.AuthorizedByUserMasterId[0],
                assignedBy: findUserExpense.userMasterID,
              });

              let notification = {
                title:
                  'Hey ' +
                  authorizerData.firstName +
                  '! Someone requested for expense',
                body:
                  userData.firstName + ' has requested for expense approval',
              };
              let data = {
                screen: 'expenserequest',
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
                  findHeadData?.expenseHead || '', //Expense Head
                  findHeadData?.expenseCategory?.expenseCategory || '', //Expense Category
                  response[i].expenseAmount,
                  response[i].description,
                  findCompanyExpenseMailTemplate,
                  findCompanyNotificationPolicyData,
                  ExpenseType,
                  findUserExpense.expense_date,
                );
              }
            }
          }
        } else {
          for (let j = 0; j < response.length; j++) {
            const findHeadData = findExpenseHeadData.find(
              (e) => e.expenseHeadId == response[j].expenseHeadId,
            );
            for (
              let i = 0;
              i < authorizationdetails.AuthorizedByUserMasterId.length;
              i++
            ) {
              const insetExpenseAuthRequest =
                await ExpenseAuthorizationRequest.create(
                  {
                    ReferenceID: response[j].userExpenseTransactionID,
                    userMasterID:
                      authorizationdetails.AuthorizedByUserMasterId[i],
                    status: 1,
                    authstatus: 2,
                    createBy,
                    createByIp,
                  },
                  { transaction },
                );

              const authorizerData = getAllUserDetails.find(
                (e) =>
                  e.userMasterID ==
                  +authorizationdetails.AuthorizedByUserMasterId[i],
              );
              const userData = getAllUserDetails.find(
                (e) => e.userMasterID == +findUserExpense.userMasterID,
              );

              if (authorizerData && userData) {
                inboxArray.push({
                  activityTable: UserExpense.getTableName(),
                  activityTablePK:
                    insetExpenseAuthRequest.toJSON().AuthorizationRequestId,
                  message: `${userData.displayName} has applied for Expense from ${response[j].expenseAmount}`,
                  assignedTo: authorizationdetails.AuthorizedByUserMasterId[i],
                  assignedBy: findUserExpense.userMasterID,
                });

                let notification = {
                  title:
                    'Hey ' +
                    authorizerData.firstName +
                    '! Someone requested for expense',
                  body:
                    userData.firstName + ' has requested for expense approval',
                };
                let data = {
                  screen: 'expenserequest',
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
                    findHeadData?.expenseHead || '', //Expense Head
                    findHeadData?.expenseCategory?.expenseCategory || '', //Expense Category
                    response[j].expenseAmount,
                    response[j].description,
                    findCompanyExpenseMailTemplate,
                    findCompanyNotificationPolicyData,
                    ExpenseType,
                    findUserExpense.expense_date,
                  );
                }
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
      message: message.usermessage.updateMessage('User Expense'),
      status: 200,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.deleteUserExpenseByExpenseID = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { userExpenseID } = await req.body;
    if (!userExpenseID) {
      await transaction.rollback();
      return res.status(200).json({
        message: 'Please Pass Valid Parameters',
        status: 401,
      });
    }
    const findExpenseData = await UserExpense.findOne({
      where: { userExpenseID },
      include: [
        {
          model: UserExpenseTransaction,
          attributes: [
            'userExpenseTransactionID',
            'userExpenseID',
            'version',
            'authorizationStatus',
          ],
          include: [
            {
              separate: true,
              model: ExpenseAuthorizationRequest,
              attributes: [
                'AuthorizationRequestId',
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

    if (!findExpenseData) {
      await transaction.rollback();
      return res.status(200).json({
        message: message.usermessage.notFoundMessage('User Expense'),
        status: 401,
      });
    }
    const findApprovedRejectedTras =
      findExpenseData?.userExpenseTransactions?.filter(
        (e) =>
          +e.authorizationStatus != 0 &&
          +e.authorizationStatus != 1 &&
          +e.authorizationStatus != 2,
      );

    // if (findApprovedRejectedTras.length) {
    //   await transaction.rollback();
    //   return res.status(200).json({
    //     message:
    //       'You Can not Delete Expense Some Of Transaction is Approved Or Rejected',
    //     status: 401,
    //   });
    // }

    const findTobeDeleteTransactionIDs =
      findExpenseData?.userExpenseTransactions?.map(
        (e) => +e.userExpenseTransactionID,
      );

    const authorizationRequestIds =
      findExpenseData.userExpenseTransactions.reduce((acc, tx) => {
        if (Array.isArray(tx.expenseAuthorizations)) {
          for (const auth of tx.expenseAuthorizations) {
            acc.push(+auth.AuthorizationRequestId);
          }
        }
        return acc;
      }, []);

    await Promise.all([
      UserExpenseTransaction.destroy({
        where: {
          userExpenseID,
        },
        transaction,
      }),
      UserInbox.destroy({
        where: {
          activityTable: UserExpense.getTableName(),
          activityTablePK: authorizationRequestIds,
        },
        transaction,
      }),
      ExpenseAuthorizationRequest.destroy({
        where: {
          ReferenceID: findTobeDeleteTransactionIDs,
        },
        transaction,
      }),
      UserExpense.destroy({
        where: { userExpenseID },
        transaction,
      }),
    ]);
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('User Expense'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.deleteUserExpenseByExpenseIDV2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { userExpenseID, userMasterID } = await req.body;
    if (!userExpenseID || !userMasterID) {
      await transaction.rollback();
      return res.status(200).json({
        message: 'Please Pass Valid Parameters',
        status: 401,
      });
    }
    const findExpenseData = await UserExpense.findOne({
      where: { userExpenseID: userExpenseID, userMasterID: userMasterID },
      include: [
        {
          model: UserExpenseTransaction,
          attributes: [
            'userExpenseTransactionID',
            'userExpenseID',
            'version',
            'authorizationStatus',
          ],
          include: [
            {
              separate: true,
              model: ExpenseAuthorizationRequest,
              attributes: [
                'AuthorizationRequestId',
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

    if (!findExpenseData) {
      await transaction.rollback();
      return res.status(200).json({
        message: message.usermessage.notFoundMessage('User Expense'),
        status: 401,
      });
    }
    const findApprovedRejectedTras =
      findExpenseData?.userExpenseTransactions?.filter(
        (e) =>
          +e.authorizationStatus != 0 &&
          +e.authorizationStatus != 1 &&
          +e.authorizationStatus != 2,
      );

    const findTobeDeleteTransactionIDs =
      findExpenseData?.userExpenseTransactions?.map(
        (e) => +e.userExpenseTransactionID,
      );

    const authorizationRequestIds =
      findExpenseData.userExpenseTransactions.reduce((acc, tx) => {
        if (Array.isArray(tx.expenseAuthorizations)) {
          for (const auth of tx.expenseAuthorizations) {
            acc.push(+auth.AuthorizationRequestId);
          }
        }
        return acc;
      }, []);

    await Promise.all([
      UserExpenseTransaction.destroy({
        where: {
          userExpenseID,
        },
        transaction,
      }),
      UserInbox.destroy({
        where: {
          activityTable: UserExpense.getTableName(),
          activityTablePK: authorizationRequestIds,
        },
        transaction,
      }),
      ExpenseAuthorizationRequest.destroy({
        where: {
          ReferenceID: findTobeDeleteTransactionIDs,
        },
        transaction,
      }),
      UserExpense.destroy({
        where: { userExpenseID: userExpenseID, userMasterID: userMasterID },
        transaction,
      }),
    ]);
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('User Expense'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.exportMyExpense = async (req, res, next) => {
  try {
    const { fromDate, toDate, expenseType } = await req.body;
    const userMasterID = +req.userDetails.userMasterId;
    const expenseTypeCondition = {
      userMasterID: userMasterID,
    };

    if (expenseType === expenseTypes.VISIT) {
      expenseTypeCondition.visitID = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (expenseType === expenseTypes.TOUR) {
      expenseTypeCondition.ToursMasterID = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (expenseType === expenseTypes.PERSONAL) {
      expenseTypeCondition.visitID = null;
      expenseTypeCondition.ToursMasterID = null;
      expenseTypeCondition.projectID = null;
      expenseTypeCondition.serviceNumber = null;
    }
    if (expenseType === expenseTypes.PROJECT) {
      expenseTypeCondition.projectID = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (expenseType === expenseTypes.SERVICE) {
      expenseTypeCondition.serviceNumber = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (fromDate && toDate) {
      if (fromDate > toDate) {
        return res
          .status(statusCodes.BAD_REQUEST)
          .json({ message: message.usermessage.validDateRange() });
      }
      expenseTypeCondition.expense_date = {
        [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
      };
    }

    const findallExpenses = await UserExpense.findAll({
      where: expenseTypeCondition,
      order: [['expense_date', 'DESC']],
      distinct: true,
      attributes: [
        'userExpenseID',
        'userMasterID',
        'expense_date',
        'createdAt',
        'visitID',
        'ToursMasterID',
        'projectID',
        'serviceNumber',
        'serviceDate',
      ],
      include: [
        {
          model: Visit,
          attributes: ['visitID', 'customerID'],
          include: [
            {
              model: Customer,
              attributes: ['customerName', 'companyName'],
            },
          ],
        },
        {
          required: true,
          separate: true,
          model: UserExpenseTransaction,
          as: 'ut',
          where: {
            status: { [Sequelize.Op.ne]: 10 },
          },
          order: [['userExpenseTransactionID', 'ASC']],
          attributes: [
            'userExpenseTransactionID',
            'userExpenseID',
            'expenseHeadId',
            'expenseAmount',
            'attachFile',
            'attachFile2',
            'attachFile3',
            'attachFile4',
            'attachThumb',
            'attach2Thumb',
            'attach3Thumb',
            'attach4Thumb',
            'description',
            'authorizationStatus',
            'status',
            'AuthorizationCriteriaID',
            'erpJvid',
            'payment_Id',
            's3UploadattachFile',
            's3UploadattachFile2',
            's3UploadattachFile3',
            's3UploadattachFile4',
          ],
          include: [
            {
              model: ExpenseHead,
              as: 'eh',
              attributes: ['expenseHeadId', 'expenseHead', 'expenseCategoryId'],
              include: [
                {
                  model: ExpenseCategory,
                  as: 'ec',
                  attributes: ['expenseCategoryId', 'expenseCategory'],
                },
              ],
            },
            {
              model: ExpensePurpose,
              as: 'ep',
              attributes: ['expensePurposeID', 'name'],
            },
            {
              separate: true,
              model: ExpenseAuthorizationRequest,
              as: 'Auth',
              attributes: [
                'AuthorizationRequestId',
                'ReferenceID',
                'userMasterID',
                'authstatus',
                'remarks',
              ],
              include: [
                {
                  required: true,
                  model: UserMaster,
                  as: 'authorizedPerson',
                  attributes: userAttributes,
                },
              ],
            },
          ],
        },
      ],
    });
    const finalDataToExport = [];
    let index = 0;

    for (let item of findallExpenses) {
      const transData = item.ut || [];
      let ExpenseType = '';
      if (item.visitID) ExpenseType = expenseTypes.VISIT;
      else if (item.ToursMasterID) ExpenseType = expenseTypes.TOUR;
      else if (item.projectID) ExpenseType = expenseTypes.PROJECT;
      else if (item.serviceNumber) ExpenseType = expenseTypes.SERVICE;
      else ExpenseType = expenseTypes.PERSONAL;
      for (let tran of transData) {
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

          authData.push(`${authSatus} - ${auth.authorizedPerson.displayName}`);
        }
        const Info = [
          index + 1,
          ExpenseType,
          moment(item.expense_date, 'YYYY-MM-DD').format('DD-MM-YYYY') || '',
          item.userExpenseID,
          new Date(item.createdAt),
          tran.ep?.name || '', //Purpose
          ExpenseType == expenseTypes.VISIT
            ? item?.visit?.customer?.companyName
            : '',
          ExpenseType == expenseTypes.VISIT
            ? item?.visit?.customer?.customerName
            : '',
          tran.eh?.ec?.expenseCategory || '', //Main Category
          tran.eh?.expenseHead || '', //Sub Category
          tran.expenseAmount, // Expense Amount
          tran.description, //Description
          expenseAuthStatus,
          authData,
          {
            original: tran.attachFile,
            thumbnail: tran.attachThumb,
            s3UploadattachFile: tran.s3UploadattachFile,
          },
          {
            original: tran.attachFile2,
            thumbnail: tran.attach2Thumb,
            s3UploadattachFile: tran.s3UploadattachFile2,
          },
          {
            original: tran.attachFile3,
            thumbnail: tran.attach3Thumb,
            s3UploadattachFile: tran.s3UploadattachFile3,
          },
          {
            original: tran.attachFile4,
            thumbnail: tran.attach4Thumb,
            s3UploadattachFile: tran.s3UploadattachFile4,
          },
        ];
        finalDataToExport.push(Info);
      }
      index++;
    }

    await generateExcelForMyExpense(
      finalDataToExport,
      'Expense Report',
      'xlsx',
      res,
    );
    return;
  } catch (err) {
    next(err);
  }
};

exports.getExistingDailyFoodExpense = async (req, res, next) => {
  try {
    const { userMasterID, expenseDate, policyType } = req.body;

    if (!userMasterID || !expenseDate || !policyType) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.invalidField('Required parameters'),
      });
    }

    // Get all existing food expenses for the user on the given date and city
    const existingExpenses = await UserExpenseTransaction.findAll({
      where: {
        policyType: policyType,
        status: { [Sequelize.Op.ne]: 10 },
        authorizationStatus: { [Sequelize.Op.ne]: 4 }, // Exclude rejected
      },
      include: [
        {
          model: UserExpense,
          as: 'userExpense',
          where: {
            userMasterID: userMasterID,
            expense_date: expenseDate,
          },
        },
      ],
      attributes: ['expenseAmount'],
    });

    // Calculate total amount
    const totalAmount = existingExpenses.reduce(
      (sum, expense) => sum + (parseFloat(expense.expenseAmount) || 0),
      0,
    );

    return res.status(200).json({
      status: 200,
      data: {
        totalAmount: totalAmount,
        count: existingExpenses.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.employeeExpenseReimbursement = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      fromDate,
      toDate,
      expenseType,
      page = 1,
      limit = 10,
      userExpenseID,
      exportData,
      userMasterID,
    } = req.body;
    const loggedInUserMasterID = +req.userDetails.userMasterId;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (+page - 1) * +limit;
      paginationQuery.limit = +limit;
    }

    const expenseTypeCondition = {
      createBy: loggedInUserMasterID,
    };
    if (userMasterID && userMasterID.length) {
      expenseTypeCondition.userMasterID = userMasterID;
    }
    if (expenseType === expenseTypes.VISIT) {
      expenseTypeCondition.visitID = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (expenseType === expenseTypes.TOUR) {
      expenseTypeCondition.ToursMasterID = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (expenseType === expenseTypes.PERSONAL) {
      expenseTypeCondition.visitID = null;
      expenseTypeCondition.ToursMasterID = null;
      expenseTypeCondition.projectID = null;
      expenseTypeCondition.serviceNumber = null;
    }
    if (expenseType === expenseTypes.PROJECT) {
      expenseTypeCondition.projectID = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (expenseType === expenseTypes.SERVICE) {
      expenseTypeCondition.serviceNumber = {
        [Sequelize.Op.ne]: null,
      };
    }
    if (fromDate && toDate) {
      if (fromDate > toDate) {
        return res
          .status(statusCodes.BAD_REQUEST)
          .json({ message: message.usermessage.validDateRange() });
      }
      expenseTypeCondition.expense_date = {
        [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
      };
    }

    if (userExpenseID) {
      expenseTypeCondition.userExpenseID = userExpenseID;
    }
    const { rows: findallExpenses, count } = await UserExpense.findAndCountAll({
      where: expenseTypeCondition,
      ...paginationQuery,
      order: [['expense_date', 'DESC']],
      distinct: true,
      attributes: {
        include: [
          [
            Sequelize.literal(`(
    SELECT json_build_object(
      'pending', COUNT(*) FILTER (
        WHERE uet."deletedAt" IS NULL 
        AND uet."authorizationStatus" IN (0, 1, 2)
        AND uet."status" = 1
      ),
      'approved', COUNT(*) FILTER (
        WHERE uet."deletedAt" IS NULL 
        AND uet."authorizationStatus" = 3
        AND uet."status" = 1
        AND (uet."erpJvid" IS NULL OR uet."erpJvid" = '')
        AND uet."payment_Id" IS NULL
        ),
      'paid', COUNT(*) FILTER (
        WHERE uet."deletedAt" IS NULL 
        AND uet."authorizationStatus" = 3
        AND uet."status" = 1
        AND ((uet."erpJvid" IS NOT NULL OR uet."erpJvid" != '')
        OR uet."payment_Id" IS NOT NULL)
      ),
      'rejected', COUNT(*) FILTER (
        WHERE uet."deletedAt" IS NULL 
        AND uet."authorizationStatus" = 4
        AND uet."status" = 1
      ),
      'reapplied', COUNT(*) FILTER (
        WHERE uet."deletedAt" IS NULL
        AND uet.version NOTNULL
      ),
      'total', COUNT(*) FILTER (
        WHERE uet."status" = 1
      ),
      'pendingAmount', COALESCE(SUM(
        CASE 
          WHEN uet."deletedAt" IS NULL 
            AND uet."authorizationStatus" IN (0, 1, 2)
            AND uet."status" = 1
          THEN uet."expenseAmount" 
          ELSE 0 
        END
      ), 0),
      'approvedAmount', COALESCE(SUM(
        CASE 
          WHEN uet."deletedAt" IS NULL 
            AND uet."authorizationStatus" = 3
            AND uet."status" = 1 
           AND (uet."erpJvid" IS NULL OR uet."erpJvid" = '')
            AND uet."payment_Id" IS NULL
          THEN uet."expenseAmount" 
          ELSE 0 
        END
      ), 0),
      'paidAmount', COALESCE(SUM(
        CASE 
          WHEN uet."deletedAt" IS NULL 
            AND uet."authorizationStatus" = 3
            AND uet."status" = 1
            AND ((uet."erpJvid" IS NOT NULL OR uet."erpJvid" != '')
            OR uet."payment_Id" IS NOT NULL)
          THEN uet."expenseAmount" 
          ELSE 0 
        END
      ), 0),
      'rejectedAmount', COALESCE(SUM(
        CASE 
          WHEN uet."deletedAt" IS NULL 
            AND uet."authorizationStatus" = 4
            AND uet."status" = 1
          THEN uet."expenseAmount" 
          ELSE 0 
        END
      ), 0),
      'totalExpenseAmount', COALESCE(SUM(
        CASE 
          WHEN uet."deletedAt" IS NULL 
            AND uet."status" = 1
          THEN uet."expenseAmount" 
          ELSE 0 
        END
      ), 0),
       'reappliedAmount', COALESCE(SUM(
        CASE 
          WHEN uet."deletedAt" IS NULL
            AND uet.version NOTNULL
          THEN uet."expenseAmount" 
          ELSE 0 
        END
      ), 0)
    )
    FROM "userExpenseTransactions" AS uet 
    WHERE uet."userExpenseID" = "userExpense"."userExpenseID" AND uet."deletedAt" IS NULL
  )`),
            'expenseSummary',
          ],
        ],
      },
      include: [
        {
          model: UserMaster,
          required: true,
          attributes: userAttributes,
          where: {
            companyMasterId: companyMasterID,
          },
          include: [
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

              model: EmployeeBranch,
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
              separate: true,

              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              separate: true,

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
          ],
        },
        {
          required: true,
          separate: true,
          model: UserExpenseTransaction,
          as: 'ut',
          where: {
            status: { [Sequelize.Op.ne]: 10 },
          },
          order: [['userExpenseTransactionID', 'ASC']],
          attributes: [
            'userExpenseTransactionID',
            'userExpenseID',
            'expenseHeadId',
            'expenseAmount',
            'attachFile',
            'attachFile2',
            'attachFile3',
            'attachFile4',
            'attachThumb',
            'attach2Thumb',
            'attach3Thumb',
            'attach4Thumb',
            'description',
            'authorizationStatus',
            'status',
            'AuthorizationCriteriaID',
            'erpJvid',
            'payment_Id',
            's3UploadattachFile',
            's3UploadattachFile2',
            's3UploadattachFile3',
            's3UploadattachFile4',
          ],
          include: [
            {
              model: UserMaster,
              as: 'authorizer',
              attributes: ['displayName'],
            },
            {
              model: ExpenseHead,
              as: 'eh',
              attributes: ['expenseHeadId', 'expenseHead', 'expenseCategoryId'],
              include: [
                {
                  model: ExpenseCategory,
                  as: 'ec',
                  attributes: ['expenseCategoryId', 'expenseCategory'],
                },
              ],
            },
            {
              model: ExpensePurpose,
              as: 'ep',
              attributes: ['expensePurposeID', 'name'],
            },
            {
              separate: true,
              model: ExpenseAuthorizationRequest,
              as: 'Auth',
              attributes: [
                'AuthorizationRequestId',
                'ReferenceID',
                'userMasterID',
                'authstatus',
                'remarks',
              ],
              include: [
                {
                  required: true,
                  model: UserMaster,
                  as: 'authorizedPerson',
                  attributes: userAttributes,
                },
              ],
            },
          ],
        },
      ],
    });

    if (exportData) {
      const finalDataToExport = [];
      let index = 0;

      for (let item of findallExpenses) {
        const transData = item.ut || [];
        let ExpenseType = '';
        if (item.visitID) ExpenseType = expenseTypes.VISIT;
        else if (item.ToursMasterID) ExpenseType = expenseTypes.TOUR;
        else if (item.projectID) ExpenseType = expenseTypes.PROJECT;
        else if (item.serviceNumber) ExpenseType = expenseTypes.SERVICE;
        else ExpenseType = expenseTypes.PERSONAL;
        for (let tran of transData) {
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

            authData.push(
              `${authSatus} - ${auth.authorizedPerson.displayName}`,
            );
          }
          const Info = [
            index + 1,
            item?.userMaster?.employeeJoiningDetails[0]?.employeeCode || '',
            item.userMaster?.displayName || '',
            item?.userMaster?.employeeBranches[0]?.branchMaster?.branchName ||
              '',
            item?.userMaster?.employeeDepartments[0]?.department
              ?.departmentName || '',
            item?.userMaster?.employeeDesignations[0]?.designation
              ?.designationName || '',
            ExpenseType,
            moment(item.expense_date, 'YYYY-MM-DD').format('DD-MM-YYYY') || '',
            item.userExpenseID,
            moment(item.createdAt, 'YYYY-MM-DD').format('DD-MM-YYYY') || '',
            tran.ep?.name || '', //Expense Purpose
            tran.eh?.ec?.expenseCategory || '', //Main Category
            tran.eh?.expenseHead || '', //Sub Category
            tran.expenseAmount, // Expense Amount
            tran.description, //Description
            expenseAuthStatus,
            tran.authorizedAt
              ? `${tran.authorizer?.displayName} On ${moment(tran.authorizedAt).format('DD-MM-YYYY HH:mm')}`
              : '',
            tran.authorizerRemark || '',
            authData,
            {
              original: tran.attachFile,
              thumbnail: tran.attachThumb,
              s3UploadattachFile: tran.s3UploadattachFile,
            },
            {
              original: tran.attachFile2,
              thumbnail: tran.attach2Thumb,
              s3UploadattachFile: tran.s3UploadattachFile2,
            },
            {
              original: tran.attachFile3,
              thumbnail: tran.attach3Thumb,
              s3UploadattachFile: tran.s3UploadattachFile3,
            },
            {
              original: tran.attachFile4,
              thumbnail: tran.attach4Thumb,
              s3UploadattachFile: tran.s3UploadattachFile4,
            },
          ];
          finalDataToExport.push(Info);
        }
        index++;
      }

      await generateExcelForEmployeeExpenseReimbursement(
        finalDataToExport,
        'Employee Expense Reimbursement',
        'xlsx',
        res,
      );
      return;
    }
    return res.status(200).json({
      data: findallExpenses,
      status: 200,
      totalcount: +count,
    });
  } catch (err) {
    next(err);
  }
};

exports.geneGenerateAllMyExpenseVoucherZip = async (req, res, next) => {
  try {
    const { fromDate, toDate } = req.body;
    const loggedInUserMasterID = +req.userDetails.userMasterId;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (!fromDate || !toDate) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ message: message.errorMessage.INVALID_FILTER_FIELDS });
    }

    const expenseTypeCondition = {
      userMasterID: loggedInUserMasterID,
      expense_date: { [Sequelize.Op.between]: [fromDate, toDate] },
    };

    const voucherEligibleCondition = Sequelize.literal(`(
        (
            /* APPROVED COUNT */
            (SELECT COUNT(*) FROM "userExpenseTransactions" uet
             WHERE uet."userExpenseID" = "userExpense"."userExpenseID"
               AND uet."deletedAt" IS NULL
               AND uet."status" = 1
               AND uet."authorizationStatus" = 3
               AND (uet."erpJvid" IS NULL OR uet."erpJvid" = '')
               AND uet."payment_Id" IS NULL
            )
            +
            /* PAID COUNT */
            (SELECT COUNT(*) FROM "userExpenseTransactions" uet
             WHERE uet."userExpenseID" = "userExpense"."userExpenseID"
               AND uet."deletedAt" IS NULL
               AND uet."status" = 1
               AND uet."authorizationStatus" = 3
               AND ((uet."erpJvid" IS NOT NULL OR uet."erpJvid" != '')
               OR uet."payment_Id" IS NOT NULL)
            )
        )
        =
        /* TOTAL COUNT */
        (SELECT COUNT(*) FROM "userExpenseTransactions" uet
         WHERE uet."userExpenseID" = "userExpense"."userExpenseID"
           AND uet."deletedAt" IS NULL
           AND uet."status" = 1
        )
    )`);

    const findExpenseData = await UserExpense.findAll({
      where: {
        ...expenseTypeCondition,
        [Sequelize.Op.and]: [voucherEligibleCondition],
      },
      attributes: [
        'userExpenseID',
        'userMasterID',
        'expense_date',
        'status',
        'createdAt',
        'updatedAt',
      ],
      include: [
        {
          required: true,
          model: UserMaster,
          attributes: ['userMasterID', 'displayName', 'userNumber'],
          attributes: userAttributes,
          include: [
            {
              model: companyMaster,
              attributes: [...companyAttributes, 'companyAddress'],
            },
            {
              required: false,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
          ],
        },
        {
          required: true,
          separate: true,
          model: UserExpenseTransaction,
          where: {
            status: { [Sequelize.Op.ne]: 10 },
          },
          attributes: [
            'userExpenseTransactionID',
            'userExpenseID',
            'expenseAmount',
            'description',
            'authorizationStatus',
            'createdAt',
            'updatedAt',
          ],
          order: [['userExpenseTransactionID', 'DESC']],
          include: [
            {
              model: ExpenseHead,
              attributes: ['expenseHeadId', 'expenseHead', 'expenseCategoryId'],
              include: [
                {
                  model: ExpenseCategory,
                  attributes: ['expenseCategoryId', 'expenseCategory'],
                },
              ],
            },
            {
              separate: true,
              model: ExpenseAuthorizationRequest,
              attributes: [
                'AuthorizationRequestId',
                'ReferenceID',
                'userMasterID',
                'authstatus',
                'createdAt',
                'updatedAt',
              ],
              include: [
                {
                  required: true,
                  model: UserMaster,
                  as: 'authorizedPerson',
                  attributes: ['displayName', 'userNumber'],
                  include: [
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
                            endDate: {
                              [Sequelize.Op.gte]: new Date(filterDate),
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
              ],
            },
          ],
        },
        {
          required: false,
          model: Project,
          attributes: ['projectID', 'display_id'],
        },
      ],
    });

    if (+findExpenseData.length == 0) {
      return res.status(200).json({
        status: 200,
        message: 'No Voucher data found to export!',
      });
    }
    const htmlTemplatePath = getHTMLTemplate('expenseVoucher', 'html');
    const htmlSource = await readHTMLFile(htmlTemplatePath);
    const compiledTemplate = Handlebars.compile(htmlSource);

    // -------------------------------------
    // Create a single combined HTML
    // -------------------------------------
    let finalHTML = `
      <html>
      <head>
        <style>
          .page-break { page-break-after: always; }
        </style>
      </head>
      <body>
    `;

    for (const expense of findExpenseData) {
      const expenseData = (expense.userExpenseTransactions || []).map(
        (e, i) => {
          const approved = e.expenseAuthorizations.filter(
            (a) => a.authstatus == 1,
          );

          return {
            index: i + 1,
            expenseDate: moment(expense.expense_date).format('DD-MM-YYYY'),
            expenseCategory: e.expenseHead?.expenseCategory?.expenseCategory,
            expenseHead: e.expenseHead?.expenseHead,
            expenseAmount: e.expenseAmount,
            approvalDateArray: approved.map((a) =>
              moment(a.updatedAt).format('DD-MM-YYYY'),
            ),
            approvalByArray: approved.map(
              (a) => a.authorizedPerson?.displayName,
            ),
            approvalByDesignationArray: approved.map(
              (a) =>
                a.authorizedPerson?.employeeDesignations?.[0]?.designation
                  .designationName,
            ),
            approvalRemarksArray: approved.map((a) => a.remarks || '-'),
          };
        },
      );

      const voucherData = {
        companyName: expense?.userMaster?.companyMaster?.companyName || '',
        companyAddress: expense?.companyMaster?.companyAddress || '',
        userExpenseID: expense.userExpenseID,
        employeeName: `${expense?.userMaster?.displayName}`,
        employeeCode:
          expense?.userMaster?.employeeJoiningDetails?.[0]?.employeeCode || '',
        totalExpenseAmount: expenseData.reduce(
          (t, x) => t + x.expenseAmount,
          0,
        ),
        expenseData,
        expenseRequestDate: moment(expense.createdAt).format(
          'DD-MM-YYYY HH:mm',
        ),
        projectID: expense?.project?.display_id || '',
      };

      const htmlBlock = compiledTemplate(voucherData);
      finalHTML += htmlBlock + `<div class="page-break"></div>`;
    }

    finalHTML += `</body></html>`;

    // -------------------------------------
    // PUPPETEER: Generate ONE PDF
    // -------------------------------------
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setContent(finalHTML, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: false,
      printBackground: true,
      timeout: 120000,
      margin: { top: '10px', bottom: '10px', left: '10px', right: '10px' },
    });

    await browser.close();

    // -------------------------------------
    // Send as PDF directly
    // -------------------------------------
    const fileName = `ExpenseVouchers.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    return res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    next(err);
  }
};

exports.employeeSideExpenseLedger = async (req, res, next) => {
  try {
    const { fromDate, toDate, userMasterID } = req.body;
    if (!userMasterID) {
      return res.status(200).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.invalidField('User'),
      });
    } else if (
      !fromDate ||
      !toDate ||
      (fromDate && toDate && new Date(fromDate) > new Date(toDate))
    ) {
      return res.status(200).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.invalidField('From Date and To Date'),
      });
    }
    const userExpenseCondition = {
      userMasterID,
      expense_date: {
        [Sequelize.Op.lt]: new Date(fromDate), // strictly before fromDate
      },
      status: 1,
    };
    const userExpensePaymentCondition = {
      userMasterID,
      paymentDate: {
        [Sequelize.Op.lt]: new Date(fromDate), // strictly before fromDate
      },
    };
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const expenseTransactionContion = { status: { [Sequelize.Op.ne]: 10 } };
    const [
      userData,
      userExpenseCalculationsBeforeFromDate,
      expensePaymentCalculationsBeforeFromDate,
      allUserExpenseTransations,
      allUserExpensePayment,
    ] = await Promise.all([
      UserMaster.findOne({
        where: {
          userMasterID: userMasterID,
          status: 1,
        },
        include: [
          {
            model: companyMaster,
            attributes: ['companyName'],
          },
          {
            separate: true,
            required: false,
            model: EmployeeDesignation,
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(currentDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
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
                [Sequelize.Op.lte]: new Date(currentDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
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
            model: EmployeeBranch,
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(currentDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
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
            separate: true,

            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
          {
            required: false,
            separate: true,
            model: EmployeeDivision,
            where: {
              status: 1,
              startDate: { [Sequelize.Op.lte]: currentDate },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: currentDate } },
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
              startDate: { [Sequelize.Op.lte]: currentDate },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: currentDate } },
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
        ],
      }),
      // userExpenseCalculationsBeforeFromDate
      UserExpenseTransaction.findOne({
        raw: true,
        where: expenseTransactionContion,
        attributes: [
          // Accepted (erpJvid NULL AND payment_Id NULL)
          [
            sequelize.literal(`
    COALESCE(SUM(CASE WHEN "userExpenseTransaction"."authorizationStatus" = 3 
                       AND ("userExpenseTransaction"."erpJvid" IS NULL OR "userExpenseTransaction"."erpJvid" = '')
                       AND "userExpenseTransaction"."payment_Id" IS NULL
                      THEN "userExpenseTransaction"."expenseAmount" ELSE 0 END), 0)
  `),
            'Accepted',
          ],
          // Paid (erpJvid NOT NULL OR payment_Id NOT NULL)
          [
            sequelize.literal(`
    COALESCE(SUM(CASE WHEN "userExpenseTransaction"."authorizationStatus" = 3
                       AND (("userExpenseTransaction"."erpJvid" IS NOT NULL AND "userExpenseTransaction"."erpJvid" <> '')
                            OR "userExpenseTransaction"."payment_Id" IS NOT NULL)
                      THEN "userExpenseTransaction"."expenseAmount" ELSE 0 END), 0)
  `),
            'Paid',
          ],

          // Total (all status 3)
          [
            sequelize.literal(`
      COALESCE(SUM(CASE WHEN "userExpenseTransaction"."authorizationStatus" = 3
                        THEN "userExpenseTransaction"."expenseAmount" ELSE 0 END), 0)
    `),
            'Total',
          ],
          // Only JvId NOT NULL & Payment_Id NULL
          [
            sequelize.literal(`
      COALESCE(SUM(CASE WHEN "userExpenseTransaction"."authorizationStatus" = 3
                         AND "userExpenseTransaction"."erpJvid" IS NOT NULL
                         AND "userExpenseTransaction"."erpJvid" <> ''
                         AND "userExpenseTransaction"."payment_Id" IS NULL
                        THEN "userExpenseTransaction"."expenseAmount" ELSE 0 END), 0)
    `),
            'OnlyJv',
          ],
          // Only Payment_Id NOT NULL & JvId NULL
          [
            sequelize.literal(`
      COALESCE(SUM(CASE WHEN "userExpenseTransaction"."authorizationStatus" = 3
                         AND "userExpenseTransaction"."erpJvid" IS NULL
                         AND "userExpenseTransaction"."payment_Id" IS NOT NULL
                        THEN "userExpenseTransaction"."expenseAmount" ELSE 0 END), 0)
    `),
            'OnlyPayment',
          ],
          // Both JvId & Payment_Id NOT NULL
          [
            sequelize.literal(`
      COALESCE(SUM(CASE WHEN "userExpenseTransaction"."authorizationStatus" = 3
                         AND "userExpenseTransaction"."erpJvid" IS NOT NULL
                         AND "userExpenseTransaction"."erpJvid" <> ''
                         AND "userExpenseTransaction"."payment_Id" IS NOT NULL
                        THEN "userExpenseTransaction"."expenseAmount" ELSE 0 END), 0)
    `),
            'BothJvAndPayment',
          ],
        ],

        include: [
          {
            model: UserExpense,
            attributes: [],
            as: 'userExpense',
            where: userExpenseCondition,
          },
        ],
      }),

      // expensePaymentCalculationsBeforeFromDate
      expensePayment.findOne({
        raw: true,
        where: {
          ...userExpensePaymentCondition,
          [Sequelize.Op.not]: {
            paymentmode: paymentMode.EXPENSEADVANCE,
            paymentType: expense_Payment_Types_Obj.EXPENSE_PAYMENT,
          },
        },
        attributes: [
          [
            sequelize.literal(`
        COALESCE(SUM(CASE WHEN "expensePayment"."txnType" = 'DEBIT' 
                          THEN "expensePayment"."amount" ELSE 0 END), 0)
      `),
            'TotalDebit',
          ],
          [
            sequelize.literal(`
        COALESCE(SUM(CASE WHEN "expensePayment"."txnType" = 'CREDIT' 
                          THEN "expensePayment"."amount" ELSE 0 END), 0)
      `),
            'TotalCredit',
          ],
        ],
      }),
      // findAllExpenseTransations
      UserExpenseTransaction.findAll({
        where: {
          authorizationStatus: 3,
          ...expenseTransactionContion,
        },
        attributes: [
          'userExpenseTransactionID',
          'userExpenseID',
          'expenseAmount',
          'description',
          'erpJvid',
          'payment_Id',
        ],
        include: [
          {
            model: UserExpense,
            as: 'userExpense',
            attributes: [
              'userExpenseID',
              'expense_date',
              'status',
              'userMasterID',
            ],
            where: {
              userMasterID,
              expense_date: {
                [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
              },
              status: 1,
            },
          },
          {
            model: ExpenseHead,
            as: 'eh',
            attributes: ['expenseHeadId', 'expenseHead'],
            include: [
              {
                model: ExpenseCategory,
                as: 'ec',
                attributes: ['expenseCategoryId', 'expenseCategory'],
              },
            ],
          },
          {
            model: ExpensePurpose,
            as: 'ep',
            attributes: ['expensePurposeID', 'name'],
          },
        ],
        order: [
          [{ model: UserExpense, as: 'userExpense' }, 'expense_date', 'ASC'],
        ],
      }),

      // findAllExpensePayments
      expensePayment.findAll({
        where: {
          userMasterID,
          paymentDate: {
            [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
          },
          status: 1,
          [Sequelize.Op.not]: {
            paymentmode: paymentMode.EXPENSEADVANCE,
            paymentType: expense_Payment_Types_Obj.EXPENSE_PAYMENT,
          },
        },
        attributes: [
          'ExpensePaymentID',
          'userMasterID',
          'amount',
          'paymentDate',
          'paymentmode',
          'referenceNO',
          'referenceDate',
          'status',
          'paymentType',
          'erpNo',
          'remarks',
          'txnType',
          'rmbMonth',
          'referenceId',
        ],
        order: [['paymentDate', 'ASC']], // order by paymentDate ascending
      }),
    ]);
    // ===============================
    // EMPLOYEE SIDE LEDGER
    // ===============================

    // 1️⃣ Expense Transactions → Employee DEBIT
    const expenseTransMap = allUserExpenseTransations.map((txn) => ({
      date: txn.userExpense?.expense_date || null,
      description:
        `Expense Of ${txn.eh?.expenseHead} For Date ${moment(
          txn.userExpense?.expense_date,
        ).format('DD-MM-YYYY')}` || '',
      debit: txn.expenseAmount || 0, // ✅ Employee Debit
      credit: 0,
      closingBalance: 0,
      type: 'DEBIT',
      paymentType: 'Expense',
    }));

    // 2️⃣ Payment Transactions → Reverse txnType
    const expensePaymentMap = allUserExpensePayment.map((txn) => ({
      date: txn.paymentDate || null,
      description: `${txn.paymentmode || ''}`,
      debit: txn.txnType === 'CREDIT' ? txn.amount || 0 : 0, // reversed
      credit: txn.txnType === 'DEBIT' ? txn.amount || 0 : 0, // reversed
      closingBalance: 0,
      type: txn.txnType,
      paymentType:
        txn.paymentType == expense_Payment_Types_Obj.EXPENSE_PAYMENT
          ? 'Expense Payment'
          : expense_Payment_Types_Obj.EXPENSE_ADVANCE_PAYMENT
            ? 'Expense Advance Payment'
            : expense_Payment_Types_Obj.EXPENSE_ADVANCE_REQUEST_PAYMENT
              ? 'Expense Advance Request Payment'
              : '',
    }));

    // 3️⃣ Opening Balance (Reversed)
    const openingBalance =
      (+expensePaymentCalculationsBeforeFromDate?.TotalDebit || 0) -
      ((+expensePaymentCalculationsBeforeFromDate?.totalCredit || 0) +
        (+userExpenseCalculationsBeforeFromDate?.Total || 0));

    // 4️⃣ Running Calculation
    let runningBalance = openingBalance;
    let totalCredit = 0;
    let totalDebit = 0;

    // Helper for Dr/Cr type (Employee View)
    const getBalanceType = (balance) => {
      if (balance === 0) return '';
      return balance > 0 ? 'Dr' : 'Cr';
    };

    // 5️⃣ Merge + Sort Transactions
    const sortedTransactions = [...expenseTransMap, ...expensePaymentMap]
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((txn) => {
        totalDebit += txn.debit || 0;
        totalCredit += txn.credit || 0;

        // 🔁 Reversed Running Formula
        runningBalance = runningBalance + (txn.debit || 0) - (txn.credit || 0);

        return {
          date: new Date(txn.date)
            .toLocaleDateString('en-GB')
            .replace(/\//g, '-'),
          description: txn.description,
          debit: (txn.debit || 0).toFixed(2),
          credit: (txn.credit || 0).toFixed(2),
          closingBalance: Math.abs(runningBalance).toFixed(2),
          closingBalanceType: getBalanceType(runningBalance),
          type: txn.type,
        };
      });

    // ===============================
    // FINAL RESPONSE OBJECT
    // ===============================

    const responseObj = {
      fromDate: moment(fromDate).format('DD-MM-YYYY'),
      toDate: moment(toDate).format('DD-MM-YYYY'),
      displayName: userData.displayName,
      userNumber: userData.userNumber,
      employeeCode: userData.employeeJoiningDetails?.[0]?.employeeCode || '',
      companyName: userData.companyMaster.companyName || '',
      branch: userData.employeeBranches?.[0]?.branchMaster?.branchName || '',
      department:
        userData.employeeDepartments?.[0]?.department?.departmentName || '',
      designation:
        userData.employeeDesignations?.[0]?.designation?.designationName || '',
      division: userData.employeeDivisions?.[0]?.division?.divisionName || null,
      workingArea:
        userData.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName ||
        null,

      openingBalance: Math.abs(openingBalance).toFixed(2),
      totalOpeningBalanceType: getBalanceType(openingBalance),

      transactions: sortedTransactions,

      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),

      totalClosingBalance: Math.abs(runningBalance).toFixed(2),
      totalClosingBalanceType: getBalanceType(runningBalance),

      ledgerHeading: 'Employee Expense Ledger',
      ledgerTitle: `Employee_Expense_Ledger_${userData.displayName}_${moment(
        fromDate,
      ).format('DD-MM-YYYY')}_to_${moment(toDate).format('DD-MM-YYYY')}`,
    };
    let base64path = await generateHTMLToPDF_base64Path(
      responseObj,
      'expenseLedger',
      'portrait',
      'html', //File Extension
    );
    return res.status(200).json({
      status: statusCodes.OK,
      data: base64path,
      fileName: `Expense_Ledger_${responseObj.displayName}_${moment(fromDate).format('DD-MM-YYYY')}_to_${moment(toDate).format('DD-MM-YYYY')}`,
    });
  } catch (err) {
    next(err);
  }
};

exports.employeeSideExpenseLedgerV2 = async (req, res, next) => {
  try {
    let { fromDate, toDate, userMasterID } = req.body;
    if (req.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }
    if (!userMasterID) {
      return res.status(200).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.invalidField('User'),
      });
    } else if (
      !fromDate ||
      !toDate ||
      (fromDate && toDate && new Date(fromDate) > new Date(toDate))
    ) {
      return res.status(200).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.invalidField('From Date and To Date'),
      });
    }
    const userExpenseCondition = {
      userMasterID,
      expense_date: {
        [Sequelize.Op.lt]: new Date(fromDate), // strictly before fromDate
      },
      status: 1,
    };
    const userExpensePaymentCondition = {
      userMasterID,
      paymentDate: {
        [Sequelize.Op.lt]: new Date(fromDate), // strictly before fromDate
      },
    };
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const expenseTransactionContion = { status: { [Sequelize.Op.ne]: 10 } };
    const [
      userData,
      userExpenseCalculationsBeforeFromDate,
      expensePaymentCalculationsBeforeFromDate,
      allUserExpenseTransations,
      allUserExpensePayment,
    ] = await Promise.all([
      UserMaster.findOne({
        where: {
          userMasterID: userMasterID,
          status: 1,
        },
        include: [
          {
            model: companyMaster,
            attributes: ['companyName'],
          },
          {
            separate: true,
            required: false,
            model: EmployeeDesignation,
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(currentDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
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
                [Sequelize.Op.lte]: new Date(currentDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
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
            model: EmployeeBranch,
            where: {
              status: 1,
              applicableDate: {
                [Sequelize.Op.lte]: new Date(currentDate),
              },
              [Sequelize.Op.or]: [
                {
                  endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
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
            separate: true,

            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
          {
            required: false,
            separate: true,
            model: EmployeeDivision,
            where: {
              status: 1,
              startDate: { [Sequelize.Op.lte]: currentDate },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: currentDate } },
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
              startDate: { [Sequelize.Op.lte]: currentDate },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: currentDate } },
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
        ],
      }),
      // userExpenseCalculationsBeforeFromDate
      UserExpenseTransaction.findOne({
        raw: true,
        where: expenseTransactionContion,
        attributes: [
          // Accepted (erpJvid NULL AND payment_Id NULL)
          [
            sequelize.literal(`
    COALESCE(SUM(CASE WHEN "userExpenseTransaction"."authorizationStatus" = 3 
                       AND ("userExpenseTransaction"."erpJvid" IS NULL OR "userExpenseTransaction"."erpJvid" = '')
                       AND "userExpenseTransaction"."payment_Id" IS NULL
                      THEN "userExpenseTransaction"."expenseAmount" ELSE 0 END), 0)
  `),
            'Accepted',
          ],
          // Paid (erpJvid NOT NULL OR payment_Id NOT NULL)
          [
            sequelize.literal(`
    COALESCE(SUM(CASE WHEN "userExpenseTransaction"."authorizationStatus" = 3
                       AND (("userExpenseTransaction"."erpJvid" IS NOT NULL AND "userExpenseTransaction"."erpJvid" <> '')
                            OR "userExpenseTransaction"."payment_Id" IS NOT NULL)
                      THEN "userExpenseTransaction"."expenseAmount" ELSE 0 END), 0)
  `),
            'Paid',
          ],

          // Total (all status 3)
          [
            sequelize.literal(`
      COALESCE(SUM(CASE WHEN "userExpenseTransaction"."authorizationStatus" = 3
                        THEN "userExpenseTransaction"."expenseAmount" ELSE 0 END), 0)
    `),
            'Total',
          ],
          // Only JvId NOT NULL & Payment_Id NULL
          [
            sequelize.literal(`
      COALESCE(SUM(CASE WHEN "userExpenseTransaction"."authorizationStatus" = 3
                         AND "userExpenseTransaction"."erpJvid" IS NOT NULL
                         AND "userExpenseTransaction"."erpJvid" <> ''
                         AND "userExpenseTransaction"."payment_Id" IS NULL
                        THEN "userExpenseTransaction"."expenseAmount" ELSE 0 END), 0)
    `),
            'OnlyJv',
          ],
          // Only Payment_Id NOT NULL & JvId NULL
          [
            sequelize.literal(`
      COALESCE(SUM(CASE WHEN "userExpenseTransaction"."authorizationStatus" = 3
                         AND "userExpenseTransaction"."erpJvid" IS NULL
                         AND "userExpenseTransaction"."payment_Id" IS NOT NULL
                        THEN "userExpenseTransaction"."expenseAmount" ELSE 0 END), 0)
    `),
            'OnlyPayment',
          ],
          // Both JvId & Payment_Id NOT NULL
          [
            sequelize.literal(`
      COALESCE(SUM(CASE WHEN "userExpenseTransaction"."authorizationStatus" = 3
                         AND "userExpenseTransaction"."erpJvid" IS NOT NULL
                         AND "userExpenseTransaction"."erpJvid" <> ''
                         AND "userExpenseTransaction"."payment_Id" IS NOT NULL
                        THEN "userExpenseTransaction"."expenseAmount" ELSE 0 END), 0)
    `),
            'BothJvAndPayment',
          ],
        ],

        include: [
          {
            model: UserExpense,
            attributes: [],
            as: 'userExpense',
            where: userExpenseCondition,
          },
        ],
      }),

      // expensePaymentCalculationsBeforeFromDate
      expensePayment.findOne({
        raw: true,
        where: {
          ...userExpensePaymentCondition,
          [Sequelize.Op.not]: {
            paymentmode: paymentMode.EXPENSEADVANCE,
            paymentType: expense_Payment_Types_Obj.EXPENSE_PAYMENT,
          },
        },
        attributes: [
          [
            sequelize.literal(`
        COALESCE(SUM(CASE WHEN "expensePayment"."txnType" = 'DEBIT' 
                          THEN "expensePayment"."amount" ELSE 0 END), 0)
      `),
            'TotalDebit',
          ],
          [
            sequelize.literal(`
        COALESCE(SUM(CASE WHEN "expensePayment"."txnType" = 'CREDIT' 
                          THEN "expensePayment"."amount" ELSE 0 END), 0)
      `),
            'TotalCredit',
          ],
        ],
      }),
      // findAllExpenseTransations
      UserExpenseTransaction.findAll({
        where: {
          authorizationStatus: 3,
          ...expenseTransactionContion,
        },
        attributes: [
          'userExpenseTransactionID',
          'userExpenseID',
          'expenseAmount',
          'description',
          'erpJvid',
          'payment_Id',
        ],
        include: [
          {
            model: UserExpense,
            as: 'userExpense',
            attributes: [
              'userExpenseID',
              'expense_date',
              'status',
              'userMasterID',
            ],
            where: {
              userMasterID,
              expense_date: {
                [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
              },
              status: 1,
            },
          },
          {
            model: ExpenseHead,
            as: 'eh',
            attributes: ['expenseHeadId', 'expenseHead'],
            include: [
              {
                model: ExpenseCategory,
                as: 'ec',
                attributes: ['expenseCategoryId', 'expenseCategory'],
              },
            ],
          },
          {
            model: ExpensePurpose,
            as: 'ep',
            attributes: ['expensePurposeID', 'name'],
          },
        ],
        order: [
          [{ model: UserExpense, as: 'userExpense' }, 'expense_date', 'ASC'],
        ],
      }),

      // findAllExpensePayments
      expensePayment.findAll({
        where: {
          userMasterID,
          paymentDate: {
            [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
          },
          status: 1,
          [Sequelize.Op.not]: {
            paymentmode: paymentMode.EXPENSEADVANCE,
            paymentType: expense_Payment_Types_Obj.EXPENSE_PAYMENT,
          },
        },
        attributes: [
          'ExpensePaymentID',
          'userMasterID',
          'amount',
          'paymentDate',
          'paymentmode',
          'referenceNO',
          'referenceDate',
          'status',
          'paymentType',
          'erpNo',
          'remarks',
          'txnType',
          'rmbMonth',
          'referenceId',
        ],
        order: [['paymentDate', 'ASC']], // order by paymentDate ascending
      }),
    ]);
    // ===============================
    // EMPLOYEE SIDE LEDGER
    // ===============================

    // 1️⃣ Expense Transactions → Employee DEBIT
    const expenseTransMap = allUserExpenseTransations.map((txn) => ({
      date: txn.userExpense?.expense_date || null,
      description:
        `Expense Of ${txn.eh?.expenseHead} For Date ${moment(
          txn.userExpense?.expense_date,
        ).format('DD-MM-YYYY')}` || '',
      debit: txn.expenseAmount || 0, // ✅ Employee Debit
      credit: 0,
      closingBalance: 0,
      type: 'DEBIT',
      paymentType: 'Expense',
    }));

    // 2️⃣ Payment Transactions → Reverse txnType
    const expensePaymentMap = allUserExpensePayment.map((txn) => ({
      date: txn.paymentDate || null,
      description: `${txn.paymentmode || ''}`,
      debit: txn.txnType === 'CREDIT' ? txn.amount || 0 : 0, // reversed
      credit: txn.txnType === 'DEBIT' ? txn.amount || 0 : 0, // reversed
      closingBalance: 0,
      type: txn.txnType,
      paymentType:
        txn.paymentType == expense_Payment_Types_Obj.EXPENSE_PAYMENT
          ? 'Expense Payment'
          : expense_Payment_Types_Obj.EXPENSE_ADVANCE_PAYMENT
            ? 'Expense Advance Payment'
            : expense_Payment_Types_Obj.EXPENSE_ADVANCE_REQUEST_PAYMENT
              ? 'Expense Advance Request Payment'
              : '',
    }));

    // 3️⃣ Opening Balance (Reversed)
    const openingBalance =
      (+expensePaymentCalculationsBeforeFromDate?.TotalDebit || 0) -
      ((+expensePaymentCalculationsBeforeFromDate?.totalCredit || 0) +
        (+userExpenseCalculationsBeforeFromDate?.Total || 0));

    // 4️⃣ Running Calculation
    let runningBalance = openingBalance;
    let totalCredit = 0;
    let totalDebit = 0;

    // Helper for Dr/Cr type (Employee View)
    const getBalanceType = (balance) => {
      if (balance === 0) return '';
      return balance > 0 ? 'Dr' : 'Cr';
    };

    // 5️⃣ Merge + Sort Transactions
    const sortedTransactions = [...expenseTransMap, ...expensePaymentMap]
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((txn) => {
        totalDebit += txn.debit || 0;
        totalCredit += txn.credit || 0;

        // 🔁 Reversed Running Formula
        runningBalance = runningBalance + (txn.debit || 0) - (txn.credit || 0);

        return {
          date: new Date(txn.date)
            .toLocaleDateString('en-GB')
            .replace(/\//g, '-'),
          description: txn.description,
          debit: (txn.debit || 0).toFixed(2),
          credit: (txn.credit || 0).toFixed(2),
          closingBalance: Math.abs(runningBalance).toFixed(2),
          closingBalanceType: getBalanceType(runningBalance),
          type: txn.type,
        };
      });

    // ===============================
    // FINAL RESPONSE OBJECT
    // ===============================

    const responseObj = {
      fromDate: moment(fromDate).format('DD-MM-YYYY'),
      toDate: moment(toDate).format('DD-MM-YYYY'),
      displayName: userData.displayName,
      userNumber: userData.userNumber,
      employeeCode: userData.employeeJoiningDetails?.[0]?.employeeCode || '',
      companyName: userData.companyMaster.companyName || '',
      branch: userData.employeeBranches?.[0]?.branchMaster?.branchName || '',
      department:
        userData.employeeDepartments?.[0]?.department?.departmentName || '',
      designation:
        userData.employeeDesignations?.[0]?.designation?.designationName || '',
      division: userData.employeeDivisions?.[0]?.division?.divisionName || null,
      workingArea:
        userData.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName ||
        null,

      openingBalance: Math.abs(openingBalance).toFixed(2),
      totalOpeningBalanceType: getBalanceType(openingBalance),

      transactions: sortedTransactions,

      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),

      totalClosingBalance: Math.abs(runningBalance).toFixed(2),
      totalClosingBalanceType: getBalanceType(runningBalance),

      ledgerHeading: 'Employee Expense Ledger',
      ledgerTitle: `Employee_Expense_Ledger_${userData.displayName}_${moment(
        fromDate,
      ).format('DD-MM-YYYY')}_to_${moment(toDate).format('DD-MM-YYYY')}`,
    };
    let base64path = await generateHTMLToPDF_base64Path(
      responseObj,
      'expenseLedger',
      'portrait',
      'html', //File Extension
    );
    return res.status(200).json({
      status: statusCodes.OK,
      data: base64path,
      fileName: `Expense_Ledger_${responseObj.displayName}_${moment(fromDate).format('DD-MM-YYYY')}_to_${moment(toDate).format('DD-MM-YYYY')}`,
    });
  } catch (err) {
    next(err);
  }
};
