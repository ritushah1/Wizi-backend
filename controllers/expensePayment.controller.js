const expensePayment = require('../models/expensePayment');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserExpenseTransaction = require('../models/userExpenseTransaction');
const UserMaster = require('../models/userMaster');
const erpAcountMasters = require('../models/erpAccountMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const BranchMaster = require('../models/branchMaster');
const EmployeeBranch = require('../models/employeeBranch');
const Department = require('../models/department');
const EmployeeDepartment = require('../models/employeeDepartment');
const Designation = require('../models/designation');
const EmployeeDesignation = require('../models/employeeDesignation');
const {
  asiaKolkataDateTime,
  isValidDate,
  month_dict,
  isValidateYearMonth,
  parseEmployeeInfo,
} = require('../utils/commonUtilFunctions');
const moment = require('moment');
const {
  generateExcel,
  generateDemoExcelForExpensePayment,
} = require('../utils/exportData');
const erpIntegration = require('../models/erpIntegration');
const axios = require('axios');
const companyMaster = require('../models/companyMaster');
const UserExpense = require('../models/userExpense');
const ExpenseHead = require('../models/expenseHead');
const { usermessage } = require('../response_message/message');
const fs = require('fs');
const path = require('path');
const readXlsxFile = require('read-excel-file/node');
const {
  paymentMode,
  txnTypeENUM,
  expense_Payment_Types_Obj,
} = require('../utils/dbUtils');
const {
  showPayWithSalary,
  projectNamesList,
  ProjectName,
} = require('../utils/labelUtils');
const ExpensePaymentTransaction = require('../models/expensePaymentTransaction');
const BankMaster = require('../models/bankMaster');
const HrLeaveMonthlyTrans = require('../models/hrLeavesMonthlyTrans');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.expensePendingPaymentData = async (req, res, next) => {
  try {
    const { limit, page, userMasterID, expensefilter, fromDate, toDate } =
      await req.body;

    const condition = {
      status: 1,
    };

    if (userMasterID) condition.userMasterID = userMasterID;

    const paginationQuery =
      page && limit ? { offset: (page - 1) * limit, limit } : {};

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    if (fromDate && toDate)
      condition.expense_date = {
        [Sequelize.Op.between]: [fromDate, toDate],
      };

    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    if (expensefilter == 0) {
      const { rows, count } = await UserExpenseTransaction.findAndCountAll({
        raw: true,
        subQuery: false,
        where: {
          status: 1,
          authorizationStatus: 3,
          erpJvid: {
            [Sequelize.Op.or]: [
              { [Sequelize.Op.is]: null },
              { [Sequelize.Op.eq]: '' },
            ],
          },
          payment_Id: {
            [Sequelize.Op.or]: [{ [Sequelize.Op.is]: null }],
          },
        },
        ...paginationQuery,
        include: [
          {
            model: ExpenseHead,
            attributes: ['expenseHeadId', 'expenseHead'],
          },
          {
            model: UserExpense,
            as: 'userExpense',
            where: condition,
            attributes: ['expense_date', 'userMasterID'],
            include: [
              {
                model: UserMaster,
                where: { ...userAccessCondition.where },
                attributes: ['userNumber', 'displayName', 'userMasterID'],
                include: [
                  ...userAccessCondition.includeModels,
                  { model: erpAcountMasters, attributes: ['erpAcountID'] },
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
                    model: EmployeeJoiningDetails,
                    attributes: ['employeeCode'],
                  },
                ],
              },
            ],
          },
        ],
        order: [
          [
            { model: UserExpense, as: 'userExpense' },
            'expense_date',
            'ASC', // or 'ASC'
          ],
        ],
      });

      const finaldata = rows.map((e) => {
        return {
          userMasterID: e['userExpense.userMaster.userMasterID'],
          userExpenseTransactionID: e.userExpenseTransactionID,
          expenseAmount: +e.expenseAmount,
          paidExpenseAmount: +e.paidAmount,
          designationName:
            e[
              'userExpense.userMaster.employeeDesignations.designation.designa'
            ],
          departmentName:
            e[
              'userExpense.userMaster.employeeDepartments.department.departmen'
            ],
          employeeCode:
            e['userExpense.userMaster.employeeJoiningDetails.employeeCode'],
          'userMaster.displayName': e['userMaster.displayName'],
          branchName:
            e[
              'userExpense.userMaster.employeeBranches.branchMaster.branchName'
            ],
          'userMaster.userNumber': e['userMaster.userNumber'],
          authorizationStatus: e.authorizationStatus,
          erpAcountID: e['userExpense.userMaster.erpAcountMasters.erpAcountID'],
          expense_date: e['userExpense.expense_date'],
          erpJvid: e.erpJvid,
          expenseHead: e['expenseHead.expenseHead'],
          'userMaster.displayName': e['userExpense.userMaster.displayName'],
          'userMaster.userNumber': e['userExpense.userMaster.userNumber'],
        };
      });

      return res.status(200).json({
        status: 200,
        data: finaldata,
        totalcount: count,
      });
    } else if (expensefilter == 1) {
      const rows = await UserExpense.findAll({
        raw: true,
        where: condition,

        include: [
          {
            required: true,
            model: UserExpenseTransaction,
            attributes: [],
            where: {
              authorizationStatus: 3,
              status: 1,
              erpJvid: {
                [Sequelize.Op.or]: [
                  { [Sequelize.Op.is]: null },
                  { [Sequelize.Op.eq]: '' },
                ],
              },
              payment_Id: {
                [Sequelize.Op.or]: [{ [Sequelize.Op.is]: null }],
              },
            },
          },
          {
            model: UserMaster,
            where: { status: 1, ...userAccessCondition.where },
            attributes: ['displayName', 'userNumber'],
            include: [
              ...userAccessCondition.includeModels,
              { model: erpAcountMasters, attributes: [] },

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
                attributes: [],
                include: [
                  {
                    model: Designation,
                    as: 'designation',
                    attributes: [],
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
                attributes: [],
                include: [
                  {
                    model: Department,
                    as: 'department',
                    attributes: [],
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
                attributes: [],
                include: [
                  {
                    model: BranchMaster,
                    as: 'branchMaster',
                    attributes: [],
                  },
                ],
              },

              {
                required: false,
                model: EmployeeJoiningDetails,
                attributes: [],
              },
            ],
          },
        ],

        attributes: [
          'userExpense.userMasterID',

          [
            sequelize.fn(
              'SUM',
              sequelize.col('userExpenseTransactions.expenseAmount'),
            ),
            'expenseAmount',
          ],

          // 🔑 aggregate expense_date for ordering
          [
            sequelize.fn('MAX', sequelize.col('userExpense.expense_date')),
            'latestExpenseDate',
          ],

          'userMaster.displayName',
          'userMaster.userNumber',
          'userMaster.employeeDesignations.designationID',
          'userMaster.employeeDesignations.designation.designationName',
          'userMaster.employeeJoiningDetails.employeeCode',
          'userMaster.employeeDepartments.departmentID',
          'userMaster.employeeDepartments.department.departmentName',
          'userMaster.employeeBranches.branchID',
          'userMaster.employeeBranches.branchMaster.branchName',
          'userMaster.erpAcountMasters.erpAcountID',
          'userExpenseTransactions.authorizationStatus',
        ],

        group: [
          'userExpense.userMasterID',
          'userMaster.displayName',
          'userMaster.userNumber',
          'userMaster.employeeDesignations.designationID',
          'userMaster.employeeDesignations.designation.designationName',
          'userMaster.employeeJoiningDetails.employeeCode',
          'userMaster.employeeDepartments.departmentID',
          'userMaster.employeeDepartments.department.departmentName',
          'userMaster.employeeBranches.branchID',
          'userMaster.employeeBranches.branchMaster.branchName',
          'userMaster.erpAcountMasters.erpAcountID',
          'userExpenseTransactions.authorizationStatus',
        ],

        // ✅ ASC = oldest expense date first
        order: [[sequelize.literal('"latestExpenseDate"'), 'ASC']],
      });

      const data = await UserExpenseTransaction.findAll({
        raw: true,
        where: {
          status: 1,
          authorizationStatus: 3,
          erpJvid: {
            [Sequelize.Op.or]: [
              { [Sequelize.Op.is]: null },
              { [Sequelize.Op.eq]: '' },
            ],
          },
          payment_Id: {
            [Sequelize.Op.or]: [{ [Sequelize.Op.is]: null }],
          },
        },
        attributes: ['userExpenseTransactionID', 'paidAmount'],
        include: [
          {
            model: UserExpense,
            as: 'userExpense',
            where: condition,
          },
        ],
      });

      const finalRows = rows.map((e) => {
        // Filter the data based on userMasterID
        const findData = data.filter(
          (expense) => expense['userExpense.userMasterID'] === e.userMasterID,
        );

        // Extract userExpenseTransactionIDs from the filtered data
        const result = findData.reduce(
          (acc, expense) => {
            acc.transactionIDs.push(expense.userExpenseTransactionID);
            acc.totalPaidAmount += Number(expense.paidAmount || 0);
            return acc;
          },
          { transactionIDs: [], totalPaidAmount: 0 },
        );

        const { transactionIDs, totalPaidAmount } = result;
        return {
          ...e,
          userExpenseTransactionID: transactionIDs, // Correctly assign the array of transaction IDs
          paidExpenseAmount: totalPaidAmount,
        };
      });

      return res.status(200).json({
        status: 200,
        data: finalRows,
        totalcount: rows.length,
      });
    } else if (expensefilter == 2) {
      const rows = await UserExpense.findAll({
        raw: true,
        where: condition,
        include: [
          {
            required: true,
            model: UserExpenseTransaction,
            where: {
              status: 1,
              authorizationStatus: 3,
              erpJvid: {
                [Sequelize.Op.or]: [
                  { [Sequelize.Op.is]: null },
                  { [Sequelize.Op.eq]: '' },
                ],
              },
              payment_Id: {
                [Sequelize.Op.or]: [{ [Sequelize.Op.is]: null }],
              },
            },
            attributes: ['expenseHeadId'],
            include: [
              {
                model: ExpenseHead,
                attributes: ['accountHeadID'],
              },
            ],
          },
          {
            model: UserMaster,
            where: { ...userAccessCondition.where },
            attributes: ['displayName', 'userNumber'],
            include: [
              ...userAccessCondition.includeModels,
              { model: erpAcountMasters, attributes: [] },
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

                attributes: [],
                include: [
                  {
                    model: Designation,
                    as: 'designation',
                    attributes: [],
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

                attributes: [],
                include: [
                  {
                    model: Department,
                    as: 'department',
                    attributes: [],
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
                attributes: [],
                include: [
                  {
                    model: BranchMaster,
                    as: 'branchMaster',
                    attributes: [],
                  },
                ],
              },
              {
                required: false,
                model: EmployeeJoiningDetails,
                attributes: [],
              },
            ],
          },
        ],

        attributes: [
          'userExpense.userMasterID',
          [
            sequelize.fn(
              'SUM',
              sequelize.col('userExpenseTransactions.expenseAmount'),
            ),
            'expenseAmount',
          ],
          'userMaster.employeeDesignations.designationID',
          'userMaster.employeeDesignations.designation.designationName',
          'userMaster.employeeJoiningDetails.employeeCode',
          'userMaster.employeeDepartments.departmentID',
          'userMaster.employeeDepartments.department.departmentName',
          'userMaster.employeeBranches.branchID',
          'userMaster.employeeBranches.branchMaster.branchName',
          'userMaster.erpAcountMasters.erpAcountID',
          'userExpenseTransactions.authorizationStatus',
          'userExpense.expense_date',
          'userExpenseTransactions.expenseHeadId',
          'userExpenseTransactions.expenseHead.expenseHead',
          'userExpenseTransactions.expenseHead.accountHeadID',
          'userExpenseTransactions.erpJvid',
          // 'userExpenseTransactions.userExpenseTransactionID'
        ],

        group: [
          'userExpense.userMasterID',
          'userMaster.displayName',
          'userMaster.userNumber',
          'userMaster.employeeDesignations.designationID',
          'userMaster.employeeDesignations.designation.designationName',
          'userMaster.employeeJoiningDetails.employeeCode',
          'userMaster.employeeDepartments.departmentID',
          'userMaster.employeeDepartments.department.departmentName',
          'userMaster.employeeBranches.branchID',
          'userMaster.employeeBranches.branchMaster.branchName',
          'userMaster.erpAcountMasters.erpAcountID',
          'userExpenseTransactions.authorizationStatus',
          'userExpense.expense_date',
          'userExpenseTransactions.expenseHeadId',
          'userExpenseTransactions.expenseHead.accountHeadID',
          'userExpenseTransactions.expenseHead.expenseHeadId',
          'userExpenseTransactions.erpJvid',
          'userExpenseTransactions.expenseHead.expenseHead',
          // 'userExpenseTransactions.userExpenseTransactionID'
        ],
        order: [['expense_date', 'ASC']],
      });

      const data = await UserExpenseTransaction.findAll({
        raw: true,
        where: {
          status: 1,
          authorizationStatus: 3,
          erpJvid: {
            [Sequelize.Op.or]: [
              { [Sequelize.Op.is]: null },
              { [Sequelize.Op.eq]: '' },
            ],
          },
          payment_Id: {
            [Sequelize.Op.or]: [{ [Sequelize.Op.is]: null }],
          },
        },
        attributes: ['userExpenseTransactionID', 'expenseHeadId', 'paidAmount'],
        include: [
          {
            model: UserExpense,
            as: 'userExpense',
            where: condition,
          },
          {
            model: ExpenseHead,
            attributes: ['expenseHeadId'],
          },
        ],
      });

      const transactionMap = new Map();

      // Populate map with IDs + sum
      for (const item of data) {
        const key = `${item['userExpense.userMasterID']}_${item['userExpense.expense_date']}_${item['expenseHead.expenseHeadId']}`;

        if (!transactionMap.has(key)) {
          transactionMap.set(key, {
            transactionIDs: [],
            totalPaidAmount: 0,
          });
        }

        const mapValue = transactionMap.get(key);

        mapValue.transactionIDs.push(item.userExpenseTransactionID);
        mapValue.totalPaidAmount += Number(item.paidAmount || 0);
      }
      for (const item of rows) {
        const key = `${item.userMasterID}_${item.expense_date}_${item.expenseHeadId}`;

        const mapValue = transactionMap.get(key);

        item.userExpenseTransactionID = mapValue?.transactionIDs || [];
        item.paidExpenseAmount = mapValue?.totalPaidAmount || 0;
      }
      return res.status(200).json({
        status: 200,
        data: rows,
        totalcount: rows.length,
      });
    } else if (expensefilter == 3) {
      const order = [['expense_date', 'ASC']];

      const rows = await UserExpense.findAll({
        where: condition,
        order,
        include: [
          {
            model: UserExpenseTransaction,
            as: 'ut',
            required: true,
            where: {
              erpJvid: {
                [Sequelize.Op.or]: [
                  { [Sequelize.Op.is]: null },
                  { [Sequelize.Op.eq]: '' },
                ],
              },
              payment_Id: {
                [Sequelize.Op.or]: [{ [Sequelize.Op.is]: null }],
              },
              status: 1,
            },
          },
          {
            model: UserMaster,
            where: { ...userAccessCondition.where },
            attributes: ['displayName', 'userNumber'],
            include: [
              ...userAccessCondition.includeModels,
              {
                model: erpAcountMasters,
                attributes: ['erpAcountID'],
              },
              {
                model: EmployeeDesignation,
                required: false,
                where: {
                  status: 1,
                  applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                    { endDate: null },
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
                model: EmployeeDepartment,
                required: false,
                where: {
                  status: 1,
                  applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                    { endDate: null },
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
                model: EmployeeBranch,
                required: false,
                where: {
                  status: 1,
                  applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                    { endDate: null },
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
                model: EmployeeJoiningDetails,
                required: false,
                attributes: ['employeeCode'],
              },
            ],
          },
        ],
      });

      const finalRows = [];

      for (let expense of rows) {
        const expenseTransactions = expense.ut || [];
        if (expenseTransactions.length == 0) continue;

        const findPendingTrans = expenseTransactions.find(
          (e) => +e.authorizationStatus != 3,
        );
        if (findPendingTrans) continue;
        // const userExpenseTransactionIDs = expenseTransactions.reduce(
        //   (acc, expense) => {
        //     acc.push(expense.userExpenseTransactionID);
        //     return acc;
        //   },
        //   []
        // );
        const result = expenseTransactions.reduce(
          (acc, expense) => {
            acc.transactionIDs.push(expense.userExpenseTransactionID);
            acc.totalPaidAmount += Number(expense.paidAmount || 0);
            return acc;
          },
          { transactionIDs: [], totalPaidAmount: 0 },
        );
        const { transactionIDs, totalPaidAmount } = result;

        const obj = {
          authorizationStatus: '3',
          branchName:
            expense.userMaster?.employeeBranches?.[0]?.branchMaster
              ?.branchName || '',
          departmentName:
            expense.userMaster?.employeeDepartments?.[0]?.department
              ?.departmentName || '',
          designationName:
            expense.userMaster?.employeeDesignations?.[0]?.designation
              ?.designationName || '',
          employeeCode:
            expense.userMaster?.employeeJoiningDetails?.[0]?.employeeCode || '',
          erpAcountID:
            expense.userMaster?.erpAcountMasters?.[0]?.erpAcountID || '',
          erpJvid: null,
          expenseAmount: expenseTransactions.reduce(
            (sum, txn) => sum + Number(txn.expenseAmount || 0),
            0,
          ),
          expenseHead: '',
          expense_date: expense.expense_date,
          'userMaster.displayName': expense.userMaster?.displayName,
          'userMaster.userNumber': expense.userMaster?.userNumber,
          userMasterID: expense.userMasterID,
          userExpenseTransactionID: transactionIDs,
          userExpenseID: expense.userExpenseID,
          paidExpenseAmount: totalPaidAmount,
        };
        finalRows.push(obj);
      }

      const paginatedRows =
        limit && page
          ? finalRows.slice((page - 1) * limit, page * limit)
          : finalRows;
      return res.status(200).json({
        status: 200,
        data: paginatedRows,
        totalcount: finalRows.length,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.addExpensePayment = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      userMasterID,
      amount,
      paymentDate,
      paymentmode,
      referenceNO,
      referenceDate,
      userExpenseTransactionID,
      expensefilter,
      paymentType,
      txnType,
      rmbMonth = null,
      paymentRemarks,
    } = req.body;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Expense Advance payment amount must be greater than zero.',
      });
    }

    const paymentData = {
      userMasterID,
      amount,
      paymentDate,
      paymentmode,
      createBy,
      createByIp,
      txnType,
      paymentType,
      rmbMonth,
      referenceNO,
      referenceDate: referenceDate || null,
      paymentRemarks: paymentRemarks || null,
    };

    /* ================= ADVANCE BALANCE VALIDATION ================= */
    if (
      txnType == txnTypeENUM.CREDIT &&
      paymentmode == paymentMode.EXPENSEADVANCE
    ) {
      const [result] = await expensePayment.findAll({
        attributes: [
          [
            Sequelize.fn(
              'SUM',
              Sequelize.literal(
                `CASE WHEN "txnType" = '${txnTypeENUM.CREDIT}' THEN "amount" ELSE 0 END`,
              ),
            ),
            'totalCreditAmount',
          ],
          [
            Sequelize.fn(
              'SUM',
              Sequelize.literal(
                `CASE WHEN "txnType" = '${txnTypeENUM.DEBIT}' THEN "amount" ELSE 0 END`,
              ),
            ),
            'totalDebitAmount',
          ],
        ],
        where: {
          userMasterID,
          paymentmode: paymentMode.EXPENSEADVANCE,
          status: 1,
        },
        raw: true,
        transaction,
      });

      const totalCreditAmount = Number(result.totalCreditAmount || 0);
      const totalDebitAmount = Number(result.totalDebitAmount || 0);

      const totalRemainingBalance = totalDebitAmount - totalCreditAmount;

      if (totalRemainingBalance <= 0) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: 'No remaining Expense Advance balance is available.',
        });
      }

      if (amount > totalRemainingBalance) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: `Remaining Expense Advance balance is ${totalRemainingBalance}.`,
        });
      }
    }

    /* ================= INSERT EXPENSE PAYMENT ================= */
    const insert_db_status = await expensePayment.create(paymentData, {
      transaction,
    });

    /* ================= EXPENSE PAYMENT ADJUSTMENT ================= */
    if (
      +paymentType == expense_Payment_Types_Obj.EXPENSE_PAYMENT &&
      userExpenseTransactionID
    ) {
      const findAllTrans = await UserExpenseTransaction.findAll({
        where: {
          userExpenseTransactionID,
        },
        order: [['userExpenseTransactionID', 'ASC']],
        transaction,
      });

      let closingBalance = amount;
      const updatePromises = [];
      const paymentTransArr = [];
      for (const trans of findAllTrans) {
        if (closingBalance <= 0) break;

        const remainingPayment =
          Number(trans.expenseAmount) - Number(trans.paidAmount);
        if (remainingPayment <= 0) continue;

        const payNow = Math.min(remainingPayment, closingBalance);
        const newPaidAmount = Number(trans.paidAmount) + payNow;

        const updateData = { paidAmount: newPaidAmount };
        if (newPaidAmount == trans.expenseAmount) {
          updateData.payment_Id = insert_db_status.ExpensePaymentID;
        }

        updatePromises.push(
          UserExpenseTransaction.update(updateData, {
            where: {
              userExpenseTransactionID: trans.userExpenseTransactionID,
            },
            transaction,
          }),
        );

        paymentTransArr.push({
          ExpensePaymentID: insert_db_status.ExpensePaymentID,
          userExpenseTransactionID: trans.userExpenseTransactionID,
        });
        closingBalance -= payNow;
      }
      if (updatePromises.length) {
        await Promise.all(updatePromises);
      }

      if (paymentTransArr.length) {
        await ExpensePaymentTransaction.bulkCreate(paymentTransArr, {
          user: req.userDetails,
          individualHooks: true,
          transaction,
        });
      }
    }
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        +paymentType == expense_Payment_Types_Obj.EXPENSE_PAYMENT
          ? message.usermessage.addMessage('Expense Payment')
          : message.usermessage.addMessage('Advance Expense Payment'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.listExpensePayments = async (req, res, next) => {
  try {
    let {
      page,
      limit,
      userMasterID,
      startdate,
      enddate,
      exportData,
      companyMasterID,
      searchQuery,
      paymentType,
      paymentMode = [],
      month,
    } = req.body;
    if (!companyMasterID || paymentType == null || paymentType == undefined) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }

    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const condition = { paymentType };

    if (paymentMode && paymentMode.length) {
      condition.paymentmode = {
        [Sequelize.Op.in]: paymentMode,
      };
    }

    if (month) condition.rmbMonth = month;

    if (userMasterID) condition.userMasterID = userMasterID;
    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          '$userMaster.displayName$': {
            [Sequelize.Op.like]: `%${searchQuery}%`,
          },
        },
      ];

    if (startdate && enddate)
      condition.paymentDate = {
        [Sequelize.Op.between]: [startdate, enddate],
      };

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows, count } = await expensePayment.findAndCountAll({
      where: condition,
      ...paginationQuery,
      include: [
        {
          model: UserMaster,
          attributes: ['userNumber', 'displayName', 'companyMasterId'],
          where: {
            companyMasterId: companyMasterID,
            ...userAccessCondition.where,
          },
          include: [
            ...userAccessCondition.includeModels,
            {
              model: companyMaster,
              attributes: ['companyMasterID'],
              include: [
                { model: erpIntegration, attributes: ['advanceExpenceUrl'] },
              ],
            },
            { model: erpAcountMasters },
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
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    if (exportData) {
      const finaldata = rows.map((e) => {
        return {
          'Employee Code ':
            e.userMaster.employeeJoiningDetails.length > 0
              ? e.userMaster.employeeJoiningDetails[0].employeeCode
              : '',
          'Erp Employee Code ':
            e.userMaster.erpAcountMasters.length > 0
              ? e.userMaster.erpAcountMasters[0].erpAcountID
              : '',
          'Employee Name': e.userMaster.displayName,
          Branch:
            e.userMaster.employeeBranches.length > 0
              ? e.userMaster.employeeBranches[0].branchMaster.branchName
              : '',
          Department:
            e.userMaster.employeeDepartments.length > 0
              ? e.userMaster.employeeDepartments[0].department.departmentName
              : '',
          Designation:
            e.userMaster.employeeDesignations.length > 0
              ? e.userMaster.employeeDesignations[0].designation.designationName
              : '',
          Amount: e.amount,
          PaymentMode: e.paymentmode,
          ReferenceNO: e.referenceNO,
          ReferenceDate: e.referenceDate
            ? moment(e.referenceDate).format('DD-MM-YYYY')
            : '',
          PaymentDate: e.paymentDate
            ? moment(e.paymentDate).format('DD-MM-YYYY')
            : '',
          'PayWithSalary Month': e.rmbMonth
            ? `${month_dict[String(e.rmbMonth).slice(4, 6)]} - ${String(e.rmbMonth).slice(0, 4)}`
            : '',
          'PayWithSalary Status': e.referenceId ? 'Paid In Salary' : '',
          'Payment Remarks': e.paymentRemarks || '',
          Sync: e.erpNo,
        };
      });

      await generateExcel(finaldata, 'Advance Expense Payment', 'xlsx', res);
      return;
    }

    return res.status(200).json({ status: 200, data: rows, totalcount: count });
  } catch (err) {
    next(err);
  }
};

exports.synerpIntegration = async (req, res, next) => {
  try {
    const ExpensePaymentID = req.params.id;

    const datasync = await expensePayment.findOne({
      where: {
        ExpensePaymentID: ExpensePaymentID,
      },
      include: [
        {
          required: true,
          model: UserMaster,
          attributes: ['displayName', 'userMasterID'],
          include: [
            {
              required: false,
              model: erpAcountMasters,
            },
            {
              required: true,
              model: companyMaster,
              attributes: ['companyMasterID', 'companyName'],
              include: [
                {
                  required: true,
                  model: erpIntegration,
                  attributes: ['apiKey', 'apiSecret', 'advanceExpenceUrl'],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!datasync) {
      return res.status(404).json({ message: 'Expense payment not found' });
    }

    const apiKey = `${datasync.userMaster.companyMaster.erpIntegrations[0].apiKey}`;
    const apiSecret = `${datasync.userMaster.companyMaster.erpIntegrations[0].apiSecret}`;

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const headers = {
      Authorization: `Basic ${auth}`,
    };

    if (!headers) {
      return res.status(200).json({
        status: 200,
        message: 'Permission Not Found',
      });
    }

    const postData = {
      employee: datasync.userMaster.erpAcountMasters[0].erpAcountID,
      posting_date: new Date(datasync.createdAt).toISOString().slice(0, 10),
      purpose: datasync.remarks,
      advance_amount: datasync.amount,
    };

    const apiUrl =
      datasync.userMaster.companyMaster.erpIntegrations[0].advanceExpenceUrl;

    const response = await axios.post(apiUrl, postData, { headers });

    if (
      !response.data.message ||
      !response.data.message ||
      !response.data.message.doc
    ) {
      return res
        .status(500)
        .json({ message: 'Invalid response from external API' });
    }

    datasync.erpNo = response.data.message.doc;

    datasync.save();

    return res.status(200).json({
      status: 200,
      // data:datasync,
      message: 'Sync Successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.syncerpExpensePayment = async (req, res, next) => {
  try {
    const { userExpenseTransactionID, userMasterID, expensefilter } =
      await req.body;

    const erpCode = await UserMaster.findOne({
      where: { userMasterID },
      attributes: ['userMasterID', 'companyMasterId'],
      include: [
        {
          required: false,
          model: erpAcountMasters,
          attributes: ['erpAcountID'],
        },
      ],
    });

    if (
      !erpCode ||
      !erpCode.erpAcountMasters ||
      erpCode.erpAcountMasters.length === 0
    ) {
      return res.status(200).json({
        status: 404,
        message: usermessage.notFoundMessage('Erp Employee Code'),
      });
    }

    const erpItegration = await erpIntegration.findOne({
      where: { companyMasterID: erpCode.companyMasterId },
      attributes: ['expenseUrl', 'apiSecret', 'apiKey'],
    });

    if (!erpItegration) {
      return res.status(200).json({
        status: 404,
        message: usermessage.notFoundMessage('ErpIntegration'),
      });
    } else if (
      erpItegration.expenseUrl === '' ||
      erpItegration.expenseUrl === null
    ) {
      return res.status(200).json({
        status: 404,
        message: usermessage.notFoundMessage('Erp Expense URL'),
      });
    }

    const ErpEmployeeCode = erpCode.erpAcountMasters[0].dataValues.erpAcountID;

    const apiKey = `${erpItegration.apiKey}`;
    const apiSecret = `${erpItegration.apiSecret}`;

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const headers = {
      Authorization: `Basic ${auth}`,
    };

    if (!headers) {
      return res.status(200).json({
        status: 404,
        message: usermessage.notFoundMessage('Permission'),
      });
    }

    if (expensefilter == 0) {
      const SyncData = await UserExpenseTransaction.findOne({
        where: {
          userExpenseTransactionID,
        },
        include: [
          {
            model: UserExpense,
            as: 'userExpense',
            attributes: ['expense_date'],
          },
          {
            model: ExpenseHead,
            attributes: ['accountHeadID'],
          },
        ],
        attributes: [
          'userExpenseTransactionID',
          'expenseAmount',
          'erpJvid',
          'description',
          'expenseHeadId',
          'userExpenseID',
        ],
      });

      const expenseType = SyncData.dataValues.expenseHead.accountHeadID;
      if (expenseType === null) {
        return res.status(200).json({
          status: 404,
          message: usermessage.notFoundMessage('Expense Type'),
        });
      }

      const postData = {
        employee: ErpEmployeeCode,
        expenses: [
          {
            expense_type: expenseType,
            description: SyncData.description,
            expenses_date:
              SyncData.dataValues.userExpense.dataValues.expense_date,
            amount: SyncData.expenseAmount,
          },
        ],
      };

      const apiUrl = erpItegration.expenseUrl;

      const response = await axios.post(apiUrl, postData, { headers });

      if (!response || response.data.message.status === false) {
        return res.status(200).json({
          status: 404,
          message: 'Error In Erp API',
        });
      }

      const expense_cliam = response.data.message.expense_claim;

      (SyncData.erpJvid = expense_cliam), await SyncData.save();

      return res.status(200).json({
        status: 200,
        message: 'Expense Sync SuccessFully',
      });
    } else if (expensefilter == 2) {
      const SyncData = await UserExpenseTransaction.findAndCountAll({
        raw: true,
        where: {
          userExpenseTransactionID,
        },
        include: [
          {
            model: UserExpense,
            as: 'userExpense',
            attributes: ['expense_date'],
          },
          {
            model: ExpenseHead,
            attributes: ['accountHeadID', 'expenseHeadId'],
          },
        ],

        attributes: [
          [
            sequelize.fn('SUM', sequelize.col('expenseAmount')),
            'expenseAmount',
          ],
          'userExpense.expense_date',
          'expenseHead.expenseHeadId',

          [
            sequelize.fn('STRING_AGG', sequelize.col('description'), ', '), // Use STRING_AGG instead of GROUP_CONCAT
            'allDescriptions',
          ],
        ],

        group: [
          'userExpense.expense_date',
          'expenseHead.expenseHeadId',
          'userExpense.userExpenseID',
        ],
      });

      const expenseDate = SyncData.rows[0].expense_date;

      const expenseAmount = SyncData.rows[0].expenseAmount;

      const expenseType = SyncData.rows[0]['expenseHead.accountHeadID'];

      const concatenatedDescriptions = SyncData.rows[0].allDescriptions;

      if (expenseType === null) {
        return res.status(200).json({
          status: 404,
          message: usermessage.notFoundMessage('Expense Type'),
        });
      }

      const postData = {
        employee: ErpEmployeeCode,
        expenses: [
          {
            expense_date: expenseDate,
            expense_type: expenseType,
            description: concatenatedDescriptions,
            amount: expenseAmount,
          },
        ],
      };

      const apiUrl = erpItegration.expenseUrl;

      const response = await axios.post(apiUrl, postData, { headers });

      if (!response || response.data.message.status === false) {
        return res.status(200).json({
          status: 200,
          message: 'Error In Erp API',
        });
      }
      const expense_claim = response.data.message.expense_claim;
      await UserExpenseTransaction.update(
        {
          erpJvid: expense_claim,
        },
        { where: { userExpenseTransactionID: userExpenseTransactionID } },
      );

      return res.status(200).json({
        status: 200,
        message: 'Expense Sync SuccessFully',
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.exportDemoImportGroupExpense = async (req, res, next) => {
  try {
    let { companyMasterID, userMasterID, fromDate, toDate } = await req.body;
    if (!companyMasterID || !fromDate || !toDate) {
      return res.status(200).json({
        status: 401,
        message: 'Please pass valid params!',
      });
    }
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    //Get User Data
    const userCondition = {
      companyMasterId: companyMasterID,
      status: 1,
    };

    const userExpenseCondition = {};
    if (userMasterID && userMasterID.length > 0) {
      userCondition.userMasterID = userMasterID;
      userExpenseCondition.userMasterID = userMasterID;
    }
    if (fromDate && toDate) {
      if (fromDate > toDate) {
        return res
          .status(statusCodes.BAD_REQUEST)
          .json({ message: message.usermessage.validDateRange() });
      }
      userExpenseCondition.expense_date = {
        [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
      };
    }
    const order = [['userExpenseID', 'ASC']];
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const userExpenseData = await UserExpense.findAll({
      where: userExpenseCondition,
      order,
      include: [
        {
          model: UserExpenseTransaction,
          as: 'ut',
          required: true,
          where: {
            payment_Id: null,
            status: 1,
          },
        },
        {
          model: UserMaster,
          where: { ...userCondition, ...userAccessCondition.where },
          attributes: ['displayName', 'userNumber'],
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeDesignation,
              required: false,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: null },
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
              model: EmployeeDepartment,
              required: false,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: null },
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
              model: EmployeeBranch,
              required: false,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: null },
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
              model: EmployeeJoiningDetails,
              required: false,
              attributes: [
                'employeeCode',
                'bankAccountNo',
                'bankIFSC',
                'bankMasterID',
                'bankAccountStatus',
                'nameAsBank',
              ],
              include: [{ model: BankMaster, attributes: ['bankName'] }],
            },
          ],
        },
      ],
    });

    const finalRows = [];

    for (let expense of userExpenseData) {
      const expenseTransactions = expense.ut || [];
      if (expenseTransactions.length == 0) continue;

      const findPendingTrans = expenseTransactions.find(
        (e) => +e.authorizationStatus != 3,
      );
      if (findPendingTrans) continue;
      const totalRemaining = expenseTransactions.reduce(
        (sum, txn) =>
          sum + (Number(txn.expenseAmount || 0) - Number(txn.paidAmount || 0)),
        0,
      );
      if (+totalRemaining <= 0) continue;
      const userMaster = expense?.userMaster;

      const joiningDetails = expense.userMaster?.employeeJoiningDetails?.[0];
      let accountNo = null;
      let ifscCode = null;
      let bankName = null;
      /* ---------- Bank Details ---------- */
      if (joiningDetails?.bankAccountStatus === 1) {
        if (joiningDetails.bankAccountNo) {
          accountNo = joiningDetails.bankAccountNo;
        }

        if (joiningDetails.bankIFSC) {
          ifscCode = joiningDetails.bankIFSC;
        }

        if (joiningDetails.bankMaster?.bankName) {
          bankName = joiningDetails.bankMaster.bankName;
        }
      }
      const obj = {
        'Employee Code': parseEmployeeInfo(userMaster)?.employeeCode,
        'Employee Name': userMaster?.displayName,
        'Employee Number': userMaster?.userNumber,
        Branch: parseEmployeeInfo(userMaster)?.branch,
        Department: parseEmployeeInfo(userMaster)?.department,
        Designation: parseEmployeeInfo(userMaster)?.designation,
        'Bank Name':
          joiningDetails?.bankAccountStatus === 1
            ? joiningDetails?.bankMaster?.bankName || ''
            : null,
        'Name As Bank':
          joiningDetails?.bankAccountStatus === 1
            ? joiningDetails?.nameAsBank || ''
            : null,
        'Bank IFSC Code':
          joiningDetails?.bankAccountStatus === 1
            ? joiningDetails?.bankIFSC || ''
            : null,
        'Bank Account Number':
          joiningDetails?.bankAccountStatus === 1
            ? joiningDetails?.bankAccountNo || ''
            : null,
        'Expense Date': expense.expense_date,
        'Expense Voucher Number': expense.userExpenseID,
        'Total Amount': totalRemaining,
        'Payment Mode': '',
        'Payment Date': '',
        'Payment Reference NO': '',
        'Payment Reference Date': '',
      };
      if (showPayWithSalary) {
        obj['Pay With Salary Month'] = '';
      }
      if (ProjectName === projectNamesList.MARS) {
        delete obj['Employee Number'];
        delete obj.Branch;
        delete obj.Department;
        delete obj.Designation;
      }
      finalRows.push(obj);
    }
    if (!finalRows.length) {
      return res.status(200).json({
        status: 401,
        message: 'No data found to generate the file!',
      });
    }

    return await generateDemoExcelForExpensePayment(
      finalRows,
      'Expense Payment',
      'xlsx',
      res,
    );
  } catch (err) {
    next(err);
  }
};

exports.validateUploadExcel = async (req, res, next) => {
  if (!req.file) {
    return res
      .status(200)
      .send({ status: 400, message: 'Please upload an excel file!' });
  }

  const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);

  try {
    let { companyMasterID, userMasterID, fromDate, toDate } = await req.body;
    if (!companyMasterID || !fromDate || !toDate) {
      return res.status(200).json({
        status: 401,
        message: 'Please pass valid params!',
      });
    }
    const excelRows = await readXlsxFile(filePath);
    deleteUploadedExcelFile(filePath);
    const headerRow = excelRows[0];
    const indexObj = {
      employeeCodeIndex: headerRow.indexOf('Employee Code'),
      employeeNumberIndex: headerRow.indexOf('Employee Number'),
      employeeNameIndex: headerRow.indexOf('Employee Name'),
      branchIndex: headerRow.indexOf('Branch'),
      departmentIndex: headerRow.indexOf('Department'),
      designationIndex: headerRow.indexOf('Designation'),
      expenseDateIndex: headerRow.indexOf('Expense Date'),
      expenseVoucherNumberIndex: headerRow.indexOf('Expense Voucher Number'),
      totalAmountIndex: headerRow.indexOf('Total Amount'),
      paymentModeIndex: headerRow.indexOf('Payment Mode'),
      paymentDateIndex: headerRow.indexOf('Payment Date'),
      paymentRefrenceNumberIndex: headerRow.indexOf('Payment Reference NO'),
      paymentRefrenceDateIndex: headerRow.indexOf('Payment Reference Date'),
      payWithSalaryMonthIndex: headerRow.indexOf('Pay With Salary Month'),
    };
    const validExcel = validateExpensePaymentExcelIndex(indexObj);
    if (!validExcel.isValid) {
      return res.status(200).json({
        status: 401,
        message: `Column ${validExcel.missingFields.join(',')} is Missing`,
      });
    }
    excelRows.shift();
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    //Get User Data
    const userCondition = {
      companyMasterId: companyMasterID,
      status: 1,
    };

    const userExpenseCondition = {};
    if (userMasterID && userMasterID.length > 0) {
      userCondition.userMasterID = userMasterID;
      userExpenseCondition.userMasterID = userMasterID;
    }
    if (fromDate && toDate) {
      if (fromDate > toDate) {
        return res
          .status(statusCodes.BAD_REQUEST)
          .json({ message: message.usermessage.validDateRange() });
      }
      userExpenseCondition.expense_date = {
        [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
      };
    }
    const order = [['userExpenseID', 'ASC']];
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const userExpenseData = await UserExpense.findAll({
      where: userExpenseCondition,
      order,
      include: [
        {
          model: UserExpenseTransaction,
          as: 'ut',
          required: true,
          where: {
            payment_Id: null,
            status: 1,
          },
        },
        {
          model: UserMaster,
          where: { ...userCondition, ...userAccessCondition.where },
          attributes: ['displayName', 'userNumber'],
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeDesignation,
              required: false,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: null },
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
              model: EmployeeDepartment,
              required: false,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: null },
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
              model: EmployeeBranch,
              required: false,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: null },
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
              model: EmployeeJoiningDetails,
              required: false,
              attributes: ['employeeCode'],
            },
          ],
        },
      ],
    });
    const expenseUserMasterIDs = [
      ...new Set(userExpenseData.map((e) => +e.userMasterID)),
    ];

    const allUserExpensePaymentsData = await expensePayment.findAll({
      attributes: [
        'userMasterID',
        [
          Sequelize.fn(
            'SUM',
            Sequelize.literal(
              `CASE WHEN "txnType" = '${txnTypeENUM.CREDIT}' THEN "amount" ELSE 0 END`,
            ),
          ),
          'totalCreditAmount',
        ],
        [
          Sequelize.fn(
            'SUM',
            Sequelize.literal(
              `CASE WHEN "txnType" = '${txnTypeENUM.DEBIT}' THEN "amount" ELSE 0 END`,
            ),
          ),
          'totalDebitAmount',
        ],
      ],
      where: {
        userMasterID: {
          [Sequelize.Op.in]: expenseUserMasterIDs, // 👈 array of IDs
        },
        paymentmode: paymentMode.EXPENSEADVANCE,
        status: 1,
      },
      group: ['userMasterID'],
      raw: true,
    });
    // ==========================
    // PREPARE ADVANCE MAP
    // ==========================
    const advanceMap = new Map(); // userId → remainingAdvance

    for (const row of allUserExpensePaymentsData) {
      const credit = Number(row.totalCreditAmount || 0);
      const debit = Number(row.totalDebitAmount || 0);

      advanceMap.set(+row.userMasterID, {
        remainingAdvance: credit - debit,
      });
    }

    // ==========================
    // RUNTIME TRACKERS
    // ==========================
    const runningAdvanceMap = new Map(); // userId → remainingAdvance
    const userRowMap = new Map(); // userId → ExpenseAdvance rows only
    const blockedAdvanceUsers = new Set(); // users fully blocked

    const validatedData = [];

    // ==========================
    // EXCEL ROW LOOP
    // ==========================
    for (const data of excelRows) {
      const validatedObj = {
        userExpenseID: data[indexObj.expenseVoucherNumberIndex],
        amount: Number(data[indexObj.totalAmountIndex] || 0),
        paymentDate: data[indexObj.paymentDateIndex],
        paymentmode: data[indexObj.paymentModeIndex],
        referenceNO: data[indexObj.paymentRefrenceNumberIndex],
        referenceDate: data[indexObj.paymentRefrenceDateIndex],
        userMasterID: null,
        userExpenseTransactionID: [],
        remarks: [],
        employeeCode: '',
        userNumber: '',
        displayName: '',
        branch: '',
        department: '',
        designation: '',
        expenseDate: '',
        isDeleted: false,
        month: data[indexObj.payWithSalaryMonthIndex],
      };

      const {
        userExpenseID,
        amount,
        paymentDate,
        paymentmode,
        referenceDate,
        month,
      } = validatedObj;

      // ==========================
      // BASIC VALIDATIONS
      // ==========================
      if (!userExpenseID)
        validatedObj.remarks.push('Please Enter Expense Voucher Number');
      if (!amount) validatedObj.remarks.push('Please Enter Expense Amount');

      if (paymentmode === paymentMode.PAYWITHSALARY) {
        if (!month) {
          validatedObj.remarks.push('Please Enter Pay With Salary Month');
        } else if (!isValidateYearMonth(month)) {
          validatedObj.remarks.push(
            'Please Enter Valid Pay With Salary Month Format',
          );
        }
      } else {
        if (!paymentDate) {
          validatedObj.remarks.push('Please Enter Payment Date');
        } else if (!isValidDate(paymentDate)) {
          validatedObj.remarks.push('Please Enter Valid Payment Date Format');
        }
      }

      if (!paymentmode) {
        validatedObj.remarks.push('Please Enter Payment Mode');
      } else if (!Object.values(paymentMode).includes(paymentmode)) {
        validatedObj.remarks.push('Please Enter Valid Payment Mode');
      }

      if (referenceDate && !isValidDate(referenceDate)) {
        validatedObj.remarks.push(
          'Please Enter Valid Payment Reference Date Format',
        );
      }

      // ==========================
      // FIND EXPENSE
      // ==========================
      const findExpense = userExpenseData.find(
        (e) => +e.userExpenseID === +userExpenseID,
      );
      if (!findExpense) {
        validatedObj.remarks.push('Please Enter Valid Expense Voucher Number');
        validatedData.push(validatedObj);
        continue;
      }

      // ==========================
      // USER DETAILS
      // ==========================
      const userMaster = findExpense.userMaster || {};
      const userId = +findExpense.userMasterID;
      validatedObj.userMasterID = userId;

      validatedObj.employeeCode =
        userMaster.employeeJoiningDetails?.[0]?.employeeCode || '';
      validatedObj.userNumber = userMaster.userNumber || '';
      validatedObj.displayName = userMaster.displayName || '';
      validatedObj.branch =
        userMaster.employeeBranches?.[0]?.branchMaster?.branchName || '';
      validatedObj.department =
        userMaster.employeeDepartments?.[0]?.department?.departmentName || '';
      validatedObj.designation =
        userMaster.employeeDesignations?.[0]?.designation?.designationName ||
        '';
      validatedObj.expenseDate = findExpense.expense_date;

      // ==========================
      // TRANSACTION CHECK
      // ==========================
      const expenseTransactions = findExpense.ut || [];
      if (!expenseTransactions.length) {
        validatedObj.remarks.push('No Expense Transaction Found');
        validatedData.push(validatedObj);
        continue;
      }

      const pendingTxn = expenseTransactions.find(
        (e) => +e.authorizationStatus !== 3,
      );
      if (pendingTxn) {
        validatedObj.remarks.push(
          'Some Expense Transactions Are Pending Authorization',
        );
        validatedData.push(validatedObj);
        continue;
      }

      const totalExpenseAmount = expenseTransactions.reduce(
        (sum, txn) => sum + Number(txn.expenseAmount || 0),
        0,
      );
      validatedObj.userExpenseTransactionID = expenseTransactions.map(
        (txn) => +txn.userExpenseTransactionID,
      );

      if (+totalExpenseAmount !== +amount) {
        validatedObj.remarks.push('Please Enter Valid Expense Amount');
      }

      // ==========================
      // EXPENSE ADVANCE LOGIC
      // ==========================
      if (paymentmode === paymentMode.EXPENSEADVANCE) {
        // Track only ExpenseAdvance rows
        if (!userRowMap.has(userId)) userRowMap.set(userId, []);
        userRowMap.get(userId).push(validatedObj);

        // Already blocked
        if (blockedAdvanceUsers.has(userId)) {
          validatedObj.remarks.push(
            'Expense Advance Not Allowed Due To Previous Validation Failure',
          );
          validatedData.push(validatedObj);
          continue;
        }

        // No advance record
        if (!advanceMap.has(userId)) {
          blockedAdvanceUsers.add(userId);
          for (const row of userRowMap.get(userId)) {
            row.remarks.push('No Expense Advance Available For This Employee');
          }
          validatedData.push(validatedObj);
          continue;
        }

        const initialRemaining = advanceMap.get(userId).remainingAdvance;

        // Advance zero
        if (initialRemaining <= 0) {
          blockedAdvanceUsers.add(userId);
          for (const row of userRowMap.get(userId)) {
            row.remarks.push(
              'No Remaining Expense Advance Available (Remaining: 0)',
            );
          }
          validatedData.push(validatedObj);
          continue;
        }

        const remaining = runningAdvanceMap.get(userId) ?? initialRemaining;

        // Exceeded
        if (+amount > remaining) {
          blockedAdvanceUsers.add(userId);
          for (const row of userRowMap.get(userId)) {
            row.remarks.push(
              `Expense Advance Exceeded. Remaining Advance Was ${remaining}`,
            );
          }
          validatedData.push(validatedObj);
          continue;
        }

        // Deduct
        runningAdvanceMap.set(userId, remaining - amount);
      }

      // Push the row
      validatedData.push(validatedObj);
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.validateMessage('Expense Payment'),
      data: validatedData,
    });
  } catch (error) {
    next(error);
  }
};

function deleteUploadedExcelFile(filePath) {
  fs.unlink(filePath, function (err) {});
}
function validateExpensePaymentExcelIndex(indexObj) {
  try {
    const mandatoryFields = [
      'employeeCodeIndex',
      'employeeNameIndex',
      'expenseDateIndex',
      'expenseVoucherNumberIndex',
      'totalAmountIndex',
      'paymentModeIndex',
      'paymentDateIndex',
    ];

    let isValid = true;
    const missingFields = [];

    for (const field of mandatoryFields) {
      if (indexObj[field] === -1) {
        isValid = false;
        missingFields.push(field);
      }
    }

    return { isValid, missingFields };
  } catch (error) {
    throw new Error('Error in Get Excel Validity: ' + error.message);
  }
}

exports.reValidateUploadExcel = async (req, res, next) => {
  try {
    let {
      companyMasterID,
      userMasterID,
      fromDate,
      toDate,
      expensePaymentData,
    } = await req.body;
    if (
      !companyMasterID ||
      !fromDate ||
      !toDate ||
      expensePaymentData.length == 0
    ) {
      return res.status(200).json({
        status: 401,
        message: 'Please pass valid params!',
      });
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // User Conditions
    const userCondition = { companyMasterId: companyMasterID, status: 1 };
    const userExpenseCondition = {};
    if (userMasterID?.length > 0) {
      userCondition.userMasterID = userMasterID;
      userExpenseCondition.userMasterID = userMasterID;
    }
    if (fromDate && toDate) {
      if (fromDate > toDate) {
        return res
          .status(statusCodes.BAD_REQUEST)
          .json({ message: message.usermessage.validDateRange() });
      }
      userExpenseCondition.expense_date = {
        [Sequelize.Op.between]: [new Date(fromDate), new Date(toDate)],
      };
    }
    const order = [['userExpenseID', 'DESC']];
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const userExpenseData = await UserExpense.findAll({
      where: userExpenseCondition,
      order,
      include: [
        {
          model: UserExpenseTransaction,
          as: 'ut',
          required: true,
          where: { payment_Id: null, status: 1 },
        },
        {
          model: UserMaster,
          where: { ...userCondition, ...userAccessCondition.where },
          attributes: ['displayName', 'userNumber'],
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeDesignation,
              required: false,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: null },
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
              model: EmployeeDepartment,
              required: false,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: null },
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
              model: EmployeeBranch,
              required: false,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: null },
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
              model: EmployeeJoiningDetails,
              required: false,
              attributes: ['employeeCode'],
            },
          ],
        },
      ],
    });

    // Prepare Advance Map
    const expenseUserMasterIDs = [
      ...new Set(userExpenseData.map((e) => +e.userMasterID)),
    ];
    const allUserExpensePaymentsData = await expensePayment.findAll({
      attributes: [
        'userMasterID',
        [
          Sequelize.fn(
            'SUM',
            Sequelize.literal(
              `CASE WHEN "txnType" = '${txnTypeENUM.CREDIT}' THEN "amount" ELSE 0 END`,
            ),
          ),
          'totalCreditAmount',
        ],
        [
          Sequelize.fn(
            'SUM',
            Sequelize.literal(
              `CASE WHEN "txnType" = '${txnTypeENUM.DEBIT}' THEN "amount" ELSE 0 END`,
            ),
          ),
          'totalDebitAmount',
        ],
      ],
      where: {
        userMasterID: { [Sequelize.Op.in]: expenseUserMasterIDs },
        paymentmode: paymentMode.EXPENSEADVANCE,
        status: 1,
      },
      group: ['userMasterID'],
      raw: true,
    });

    const advanceMap = new Map();
    for (const row of allUserExpensePaymentsData) {
      const credit = Number(row.totalCreditAmount || 0);
      const debit = Number(row.totalDebitAmount || 0);
      advanceMap.set(+row.userMasterID, { remainingAdvance: credit - debit });
    }

    const runningAdvanceMap = new Map(); // userId → remainingAdvance
    const userRowMap = new Map(); // userId → ExpenseAdvance rows only
    const blockedAdvanceUsers = new Set(); // users fully blocked

    // Loop over Excel rows
    const validatedData = [];
    for (let validatedObj of expensePaymentData) {
      validatedObj.remarks = [];
      validatedObj.isDeleted = false;

      const {
        userExpenseID,
        amount,
        paymentDate,
        paymentmode,
        referenceDate,
        month,
      } = validatedObj;

      if (!userExpenseID) {
        validatedObj.remarks.push('Please Enter Expense Voucher Number');
      }

      if (!amount) {
        validatedObj.remarks.push('Please Enter Expense amount');
      }

      // if payment mode is pay with salary

      if (paymentmode == paymentMode.PAYWITHSALARY) {
        if (!month) {
          validatedObj.remarks.push('Please Enter Pay With Salary Month');
        } else if (!isValidateYearMonth(month)) {
          validatedObj.remarks.push(
            'Please Enter Valid Pay With Salary Month Format',
          );
        }
      } else {
        if (!paymentDate) {
          validatedObj.remarks.push('Please Enter Payment Date');
        } else if (!isValidDate(paymentDate)) {
          validatedObj.remarks.push('Please Enter Valid Payment Date Format');
        }
      }

      if (!paymentmode) {
        validatedObj.remarks.push('Please Enter Payment Mode');
      } else if (!Object.values(paymentMode).includes(paymentmode)) {
        validatedObj.remarks.push('Please Enter Valid Payment Mode');
      }

      if (referenceDate && !isValidDate(referenceDate)) {
        validatedObj.remarks.push(
          'Please Enter Valid Payment Reference Date Format',
        );
      }

      const findExpense = userExpenseData.find(
        (e) => +e.userExpenseID === +userExpenseID,
      );

      if (!findExpense) {
        validatedObj.remarks.push('Please Enter Valid Expense Voucher Number');
        validatedData.push(validatedObj);
        continue;
      }

      const userMaster = findExpense.userMaster || {};
      const userId = findExpense.userMasterID;
      validatedObj.userMasterID = userId;
      validatedObj.employeeCode =
        userMaster.employeeJoiningDetails?.[0]?.employeeCode || '';
      validatedObj.userNumber = userMaster.userNumber || '';
      validatedObj.displayName = userMaster.displayName || '';
      validatedObj.branch =
        userMaster.employeeBranches?.[0]?.branchMaster?.branchName || '';
      validatedObj.department =
        userMaster.employeeDepartments?.[0]?.department?.departmentName || '';
      validatedObj.designation =
        userMaster.employeeDesignations?.[0]?.designation?.designationName ||
        '';
      validatedObj.expenseDate = findExpense.expense_date;

      const expenseTransactions = findExpense.ut || [];
      if (!expenseTransactions.length) {
        validatedObj.remarks.push('No Expense Transaction Found');
        validatedData.push(validatedObj);
        continue;
      }

      const pendingTxn = expenseTransactions.find(
        (e) => +e.authorizationStatus !== 3,
      );
      if (pendingTxn) {
        validatedObj.remarks.push(
          'Some Of the Expense Transaction is Pending To Authorization',
        );
        validatedData.push(validatedObj);
        continue;
      }

      // Amount check
      const totalExpenseAmount = expenseTransactions.reduce(
        (sum, txn) => sum + Number(txn.expenseAmount || 0),
        0,
      );
      validatedObj.userExpenseTransactionID = expenseTransactions.map(
        (txn) => +txn.userExpenseTransactionID,
      );
      if (+totalExpenseAmount !== +amount) {
        validatedObj.remarks.push('Please Enter Valid Expense Amount');
        validatedData.push(validatedObj);
        continue;
      }
      // ==========================
      // EXPENSE ADVANCE LOGIC
      // ==========================
      if (paymentmode === paymentMode.EXPENSEADVANCE) {
        if (!userRowMap.has(userId)) userRowMap.set(userId, []);
        userRowMap.get(userId).push(validatedObj);

        if (blockedAdvanceUsers.has(userId)) {
          validatedObj.remarks.push(
            'Expense Advance Not Allowed Due To Previous Validation Failure',
          );
          validatedData.push(validatedObj);
          continue;
        }

        if (!advanceMap.has(userId)) {
          blockedAdvanceUsers.add(userId);
          for (const row of userRowMap.get(userId))
            row.remarks.push('No Expense Advance Available For This Employee');
          validatedData.push(validatedObj);
          continue;
        }

        const initialRemaining = advanceMap.get(userId).remainingAdvance;
        if (initialRemaining <= 0) {
          blockedAdvanceUsers.add(userId);
          for (const row of userRowMap.get(userId))
            row.remarks.push(
              'No Remaining Expense Advance Available (Remaining: 0)',
            );
          validatedData.push(validatedObj);
          continue;
        }

        const remaining = runningAdvanceMap.get(userId) ?? initialRemaining;
        if (+amount > remaining) {
          blockedAdvanceUsers.add(userId);
          for (const row of userRowMap.get(userId))
            row.remarks.push(
              `Expense Advance Exceeded. Remaining Advance Was ${remaining}`,
            );
          validatedData.push(validatedObj);
          continue;
        }

        runningAdvanceMap.set(userId, remaining - amount);
      }

      validatedData.push(validatedObj);
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.reValidateMessage('Expense Payment'),
      data: validatedData,
    });
  } catch (error) {
    next(error);
  }
};

exports.addValidateExpensePayment = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    let { expensePaymentData } = await req.body;
    if (expensePaymentData.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Please pass valid params!',
      });
    }
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const updateExpenseTransArray = [];
    const createExpensePaymentTransArray = [];
    for (let expense of expensePaymentData) {
      const paymentData = {
        userMasterID: expense.userMasterID,
        amount: expense.amount,
        paymentDate:
          expense.paymentmode != paymentMode.PAYWITHSALARY
            ? expense.paymentDate
            : null,
        paymentmode: expense.paymentmode,
        referenceNO: expense.referenceNO,
        referenceDate: expense.referenceDate,
        rmbMonth:
          expense.paymentmode == paymentMode.PAYWITHSALARY
            ? +String(expense.month).replace('-', '')
            : null,
        createBy,
        createByIp,
      };
      const insert_db_status = await expensePayment.create(paymentData, {
        transaction,
      });

      updateExpenseTransArray.push(
        UserExpenseTransaction.update(
          {
            payment_Id: insert_db_status.ExpensePaymentID,
          },
          {
            where: {
              userExpenseTransactionID: {
                [Sequelize.Op.in]: expense.userExpenseTransactionID,
              },
            },
            transaction,
          },
        ),
      );
      for (let trans of expense.userExpenseTransactionID) {
        const createExpensePaymentTransObj = {
          ExpensePaymentID: insert_db_status.ExpensePaymentID,
          userExpenseTransactionID: trans,
        };
        createExpensePaymentTransArray.push(createExpensePaymentTransObj);
      }
    }

    if (createExpensePaymentTransArray.length) {
      updateExpenseTransArray.push(
        ExpensePaymentTransaction.bulkCreate(createExpensePaymentTransArray, {
          user: req.userDetails,
          individualHooks: true,
          transaction,
        }),
      );
    }
    await Promise.all(updateExpenseTransArray);
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Expense Payment'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

