const { Sequelize, Op } = require('sequelize');
const sequelize = require('../config/database');
const OfficeExpenseAdvance = require('../models/officeExpenseAdvance');
const { statusCodes, userAttributes } = require('../utils/commonVars');
const message = require('../response_message/message');
const { txnTypeENUM } = require('../utils/dbUtils');
const BranchMaster = require('../models/branchMaster');
const Site = require('../models/site');
const UserMaster = require('../models/userMaster');
const { generateExcel } = require('../utils/exportData');
const moment = require('moment');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Designation = require('../models/designation');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const EmployeeDivision = require('../models/employeeDivision');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');
const OfficeExpenseTransaction = require('../models/officeExpenseTransaction');
const OfficeExpenseHead = require('../models/officeExpenseHead');
const OfficeExpense = require('../models/officeExpense');
const companyMaster = require('../models/companyMaster');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.creditDebitAdvance = async (req, res, next) => {
  try {
    const {
      branchMasterID,
      siteID,
      userMasterID,
      amount,
      date,
      transactionType,
      paymentMode,
      referenceNo,
      referenceDate,
      remarks,
    } = req.body;

    const condition = {
      userMasterID,
      branchMasterID,
    };

    if (siteID) {
      condition.siteID = siteID;
    } else {
      condition.siteID = {
        [Op.eq]: null,
      };
    }

    if (transactionType == txnTypeENUM.CREDIT) {
      const [result] = await OfficeExpenseAdvance.findAll({
        attributes: [
          [
            Sequelize.fn(
              'SUM',
              Sequelize.literal(
                `CASE WHEN "transactionType" = '${txnTypeENUM.CREDIT}' THEN "amount" ELSE 0 END`,
              ),
            ),
            'totalCreditAmount',
          ],
          [
            Sequelize.fn(
              'SUM',
              Sequelize.literal(
                `CASE WHEN "transactionType" = '${txnTypeENUM.DEBIT}' THEN "amount" ELSE 0 END`,
              ),
            ),
            'totalDebitAmount',
          ],
        ],
        where: condition,
        raw: true,
      });
      const totalCreditAmount = Number(result.totalCreditAmount || 0);
      const totalDebitAmount = Number(result.totalDebitAmount || 0);

      const totalRemainingBalance = totalDebitAmount - totalCreditAmount;
      if (totalRemainingBalance <= 0) {
        return res.status(200).json({
          status: 401,
          message: 'No remaining Office Expense Advance balance is available.',
        });
      }
      if (amount > totalRemainingBalance) {
        return res.status(200).json({
          status: 401,
          message: `Remaining Expense Advance balance is ${totalRemainingBalance}.`,
        });
      }
    }

    await OfficeExpenseAdvance.create(
      {
        branchMasterID,
        siteID,
        userMasterID,
        amount,
        date,
        transactionType,
        paymentMode,
        referenceNo,
        referenceDate,
        remarks,
      },
      {
        user: req.userDetails,
      },
    );

    const returnMessage =
      'Advance ' + transactionType.toLowerCase() + 'ed successfully';

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: returnMessage,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllOfficeExpenseAdvance = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      branchMasterID,
      siteID,
      userMasterID,
      fromDate,
      toDate,
      page,
      limit,
      transactionType,
      exportData,
    } = req.body;

    const companyCondition = {};
    if (companyMasterID) companyCondition.companyMasterID = companyMasterID;

    const condition = {};
    if (branchMasterID) condition.branchMasterID = branchMasterID;
    if (siteID) condition.siteID = siteID;
    if (userMasterID) condition.userMasterID = userMasterID;
    if (transactionType) condition.transactionType = transactionType;

    if (fromDate && toDate) {
      condition.date = {
        [Op.between]: [fromDate, toDate],
      };
    }

    const paginationQuery =
      page && limit
        ? {
            limit: limit,
            offset: (page - 1) * limit,
          }
        : {};

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows, count } = await OfficeExpenseAdvance.findAndCountAll({
      where: condition,
      ...paginationQuery,
      include: [
        {
          model: BranchMaster,
          attributes: ['branchName'],
          where: companyCondition,
        },
        {
          model: Site,
          attributes: ['siteName'],
        },
        {
          model: UserMaster,
          attributes: userAttributes,
          where: { ...userAccessCondition.where },
          include: [
            ...userAccessCondition.includeModels,
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
      ],
    });

    if (exportData) {
      const officeExpenseAdvanceData = rows?.map((row) => ({
        Date: moment(new Date(row?.date)).format('DD-MM-YYYY'),
        'Employee Name': row?.userMaster?.displayName,
        'Employee Code':
          row?.userMaster?.employeeJoiningDetails[0]?.employeeCode,
        Branch: row?.userMaster?.employeeBranches[0]?.branchMaster?.branchName,
        Department:
          row?.userMaster?.employeeDepartments[0]?.department?.departmentName,
        Designation:
          row?.userMaster?.employeeDesignations[0]?.designation
            ?.designationName,
        Division: row?.userMaster?.employeeDivisions[0]?.division?.divisionName,
        'Working Area':
          row?.userMaster?.employeeWorkingAreas[0]?.workingArea
            ?.workingAreaName,
        'Allocated Branch': row?.branchMaster?.branchName,
        'Allocated Site': row?.site?.siteName,
        'Transaction Type': row?.transactionType,
        Amount: row?.amount,
        'Payment Mode': row?.paymentMode,
        'Reference Number': row?.referenceNo,
        'Reference Date': row?.referenceDate
          ? moment(row?.referenceDate).format('DD-MM-YYYY')
          : '',
        Remarks: row?.remarks,
      }));

      return await generateExcel(
        officeExpenseAdvanceData,
        'Office Expense Advance',
        'xlsx',
        res,
      );
    }

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: rows,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.officeExpensePendingPayment = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      userMasterID,
      expensefilter,
      fromDate,
      toDate,
      branchMasterID,
      siteID,
    } = req.body;

    const officeExpenseCondition = {};
    const officeExpenseTransCondition = {
      authorizationStatus: 3,
      payment_Id: null,
    };

    if (userMasterID) officeExpenseCondition.userMasterID = userMasterID;
    if (branchMasterID) officeExpenseCondition.branchMasterID = branchMasterID;
    if (siteID) {
      officeExpenseCondition.branchMasterID = null;
      officeExpenseCondition.siteID = siteID;
    } else if (branchMasterID) {
      officeExpenseCondition.branchMasterID = branchMasterID;
      officeExpenseCondition.siteID = null;
    }
    const paginationQuery =
      page && limit ? { offset: (page - 1) * limit, limit } : {};

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    if (fromDate && toDate) {
      officeExpenseCondition.expense_date = {
        [Sequelize.Op.between]: [fromDate, toDate],
      };
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    if (expensefilter == 0) {
      const { rows, count } = await OfficeExpenseTransaction.findAndCountAll({
        distinct: true,
        where: officeExpenseTransCondition,
        ...paginationQuery,
        include: [
          {
            model: OfficeExpenseHead,
            attributes: ['officeExpenseHeadID', 'officeExpenseHead'],
          },
          {
            model: OfficeExpense,
            as: 'officeExpense',
            where: officeExpenseCondition,
            attributes: [
              'expense_date',
              'userMasterID',
              'officeExpenseID',
              'branchMasterID',
              'siteID',
            ],
            include: [
              {
                model: BranchMaster,
                attributes: ['branchMasterID', 'branchName'],
              },
              {
                model: Site,
                attributes: ['siteID', 'siteName'],
              },
              {
                required: true,
                model: UserMaster,
                where: { ...userAccessCondition.where },
                include: [...userAccessCondition.includeModels],
                attributes: ['userNumber', 'displayName', 'userMasterID'],
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
                ],
              },
            ],
          },
        ],
        order: [['officeExpenseTransactionID', 'DESC']],
      });

      const finaldata = rows.map((e) => {
        return {
          userMasterID: e.officeExpense?.userMasterID,
          officeExpenseID: e.officeExpense?.officeExpenseID,
          officeExpenseTransactionID: e.officeExpenseTransactionID,
          expenseAmount: e.expenseAmount,
          designationName:
            e.officeExpense?.userMaster?.employeeDesignations?.[0]?.designation
              ?.designationName || '',
          departmentName:
            e.officeExpense?.userMaster?.employeeDepartments?.[0]?.department
              ?.departmentName || '',
          employeeCode:
            e.officeExpense?.userMaster?.employeeJoiningDetails?.[0]
              ?.employeeCode || '',
          displayName: e.officeExpense?.userMaster?.displayName,
          branchName:
            e.officeExpense?.userMaster?.employeeBranches?.[0]?.branchMaster
              ?.branchName || '',
          userNumber: e.officeExpense?.userMaster?.userNumber || '',
          authorizationStatus: e.authorizationStatus,
          expense_date: e.officeExpense?.expense_date,
          officeExpenseHead: e.officeExpenseHead?.officeExpenseHead || '',
          branchMasterID: e.officeExpense?.branchMasterID || null,
          expenseBranchName: e.officeExpense?.branchMaster?.branchName || '',
          expenseSiteName: e.officeExpense?.site?.siteName || '',
          siteID: e.officeExpense?.siteID || null,
        };
      });

      return res.status(200).json({
        status: 200,
        data: finaldata,
        totalcount: count,
      });
    } else if (expensefilter == 3) {
      const order = [['officeExpenseID', 'DESC']];

      const rows = await OfficeExpense.findAll({
        where: officeExpenseCondition,
        order,
        include: [
          {
            model: BranchMaster,
            attributes: ['branchMasterID', 'branchName'],
          },
          {
            model: Site,
            attributes: ['siteID', 'siteName'],
          },
          {
            required: true,
            model: OfficeExpenseTransaction,
            where: officeExpenseTransCondition,
            include: [
              {
                model: OfficeExpenseHead,
                attributes: ['officeExpenseHeadID', 'officeExpenseHead'],
              },
            ],
          },
          {
            model: UserMaster,
            attributes: ['displayName', 'userNumber'],
            include: [
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
        const expenseTransactions = expense.officeExpenseTransactions || [];
        if (expenseTransactions.length == 0) continue;

        const findPendingTrans = expenseTransactions.find(
          (e) => +e.authorizationStatus != 3,
        );
        if (findPendingTrans) continue;
        const userExpenseTransactionIDs = expenseTransactions.reduce(
          (acc, expense) => {
            acc.push(expense.officeExpenseTransactionID);
            return acc;
          },
          [],
        );
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
          displayName: expense.userMaster?.displayName,
          userNumber: expense.userMaster?.userNumber || '',
          userMasterID: expense.userMasterID,
          officeExpenseTransactionID: userExpenseTransactionIDs,
          branchMasterID: expense.branchMasterID || null,
          expenseBranchName: expense.branchMaster?.branchName || '',
          expenseSiteName: expense.site?.siteName || '',
          siteID: expense.siteID || null,
          officeExpenseID: expense.officeExpenseID,
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
    } else if (expensefilter == 1) {
      const rows = await OfficeExpense.findAll({
        where: officeExpenseCondition,
        include: [
          {
            model: BranchMaster,
            attributes: ['branchMasterID', 'branchName'],
          },
          {
            model: Site,
            attributes: ['siteID', 'siteName'],
          },
          {
            required: true,
            model: OfficeExpenseTransaction,
            where: officeExpenseTransCondition,
            include: [
              {
                model: OfficeExpenseHead,
                attributes: ['officeExpenseHeadID', 'officeExpenseHead'],
              },
            ],
          },
          {
            model: UserMaster,
            attributes: ['displayName', 'userNumber'],
            include: [
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

      // Aggregate manually by user + branch + site
      const groupedData = {};

      rows.forEach((e) => {
        const userID = e.userMasterID;
        const branchID = e.branchMaster?.branchMasterID || null;
        const siteID = e.site?.siteID || null;

        // Composite key for grouping
        const key = `${userID}_${branchID || 'noBranch'}_${siteID || 'noSite'}`;

        if (!groupedData[key]) {
          groupedData[key] = {
            userMasterID: userID,
            displayName: e.userMaster?.displayName || '',
            userNumber: e.userMaster?.userNumber || '',
            expenseAmount: 0,
            officeExpenseTransactionID: [],
            branchName:
              e.userMaster?.employeeBranches?.[0]?.branchMaster?.branchName ||
              '',
            branchMasterID:
              e.userMaster?.employeeBranches?.[0]?.branchMaster
                ?.branchMasterID || null,
            expenseBranchName: e.branchMaster?.branchName || '',
            siteID: e.site?.siteID || null,
            expenseSiteName: e.site?.siteName || '',
            designationName:
              e.userMaster?.employeeDesignations?.[0]?.designation
                ?.designationName || '',
            departmentName:
              e.userMaster?.employeeDepartments?.[0]?.department
                ?.departmentName || '',
            employeeCode:
              e.userMaster?.employeeJoiningDetails?.[0]?.employeeCode || '',
            authorizationStatus: '3',
          };
        }

        e.officeExpenseTransactions.forEach((t) => {
          groupedData[key].expenseAmount += parseFloat(t.expenseAmount || 0);
          groupedData[key].officeExpenseTransactionID.push(
            t.officeExpenseTransactionID,
          );
        });
      });

      const finalRows = Object.values(groupedData);

      return res.status(200).json({
        status: 200,
        data: finalRows,
        totalcount: rows.length,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.addOfficeExpensePayment = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      branchMasterID,
      siteID,
      userMasterID,
      amount,
      date,
      transactionType,
      paymentMode,
      referenceNo,
      referenceDate,
      officeExpenseTransactionID,
      expensefilter,
      paymentType,
    } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const paymentData = {
      branchMasterID,
      siteID,
      userMasterID,
      amount,
      date,
      transactionType,
      paymentMode,
      officeExpenseTransactionID,
      expensefilter,
      paymentType,
    };

    if (paymentMode !== 'Cash' && paymentMode !== 'ExpenseAdvance') {
      paymentData.referenceNo = referenceNo;
      paymentData.referenceDate = referenceDate;
    }

    const insert_db_status = await OfficeExpenseAdvance.create(paymentData, {
      user: req.userDetails,
      transaction,
    });
    if (+paymentType == 0 && officeExpenseTransactionID) {
      const updateCondition =
        expensefilter == 0
          ? { officeExpenseTransactionID: officeExpenseTransactionID }
          : {
              officeExpenseTransactionID: {
                [Sequelize.Op.in]: officeExpenseTransactionID,
              },
            };

      await OfficeExpenseTransaction.update(
        {
          payment_Id: insert_db_status.officeExpenseAdvanceID,
          updateBy,
          updateByIp,
        },
        {
          where: updateCondition,
          transaction,
        },
      );
    }
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        +paymentType == 0
          ? message.usermessage.addMessage('Office Expense Payment')
          : message.usermessage.addMessage('Office Advance Expense Payment'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.listOfficeExpensePayments = async (req, res, next) => {
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
    const condition = {};

    if (paymentMode && paymentMode.length) {
      condition.paymentMode = {
        [Sequelize.Op.in]: paymentMode,
      };
    }

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
      condition.date = {
        [Sequelize.Op.between]: [startdate, enddate],
      };

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows, count } = await OfficeExpenseAdvance.findAndCountAll({
      where: condition,
      ...paginationQuery,
      include: [
        {
          model: BranchMaster,
          attributes: ['branchMasterID', 'branchName'],
        },
        {
          model: Site,
          attributes: ['siteID', 'siteName'],
        },
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
          PaymentMode: e.paymentMode,
          ReferenceNO: e.referenceNo,
          ReferenceDate: e.referenceDate
            ? moment(e.referenceDate).format('DD-MM-YYYY')
            : '',
          PaymentDate: e.date ? moment(e.date).format('DD-MM-YYYY') : '',
          'Expense Branch Name': e.branchMaster?.branchName || '',
          'Expense Site Name': e.site?.siteName || '',
        };
      });

      await generateExcel(finaldata, 'Office Expense Payment', 'xlsx', res);
      return;
    }

    return res.status(200).json({ status: 200, data: rows, totalcount: count });
  } catch (err) {
    next(err);
  }
};
