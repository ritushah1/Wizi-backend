const expenseHead = require('../models/expenseHead');
const logger = require('../config/logger');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const ExpenseCategory = require('../models/expenseCategory');
const companyMaster = require('../models/companyMaster');
const sequelize = require('../config/database');
const xlsx = require('xlsx');
const UserExpenseTransaction = require('../models/userExpenseTransaction');
const {
  generateExcel,
  genrateDemoExcelForExpenseHead,
} = require('../utils/exportData');
const readXlsxFile = require('read-excel-file/node');
const fs = require('fs');
const path = require('path');
const ExpenseHead = require('../models/expenseHead');
/**
 * save city data.
 *
 * @body {createBy} createBy user id of user who added the city.
 * @body {number} createBy if any user change data then updateBy id change.
 
 */
exports.postAddexpenseHead = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      expenseHead1,
      expenseCategoryId,
      companyMasterID,
      accountHeadID,
    } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const condition = { companyMasterID, [Sequelize.Op.or]: [] };
    if (accountHeadID) {
      condition[Sequelize.Op.or].push({
        accountHeadID: accountHeadID,
      });
    }
    condition[Sequelize.Op.or].push({
      expenseCategoryId: expenseCategoryId,
      expenseHead: expenseHead1,
    });
    const accountheads = await expenseHead.findOne(
      {
        where: condition,
      },
      { transaction },
    );
    if (accountheads) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Account Head'),
      });
    }

    const insert_db_status = await expenseHead.create(
      {
        expenseHead: expenseHead1,
        companyMasterID,
        expenseCategoryId,
        accountHeadID,
        createBy,
        createByIp,
      },
      { transaction, user: req.userDetails },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.expenseheadadd,
      data: insert_db_status,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getexpenseHeadId = async (req, res, next) => {
  try {
    let get_one_data = await expenseHead.findOne({
      where: { expenseHeadId: req.params.id, status: ['0', '1'] },
      raw: true,
    });

    if (!get_one_data)
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    else res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

/**
 * update data
 *
 * @param {id} expenseHeadID  to update id
 */
exports.postUpdateexpenseHead = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      expenseHeadId,
      expenseHead1,
      expenseCategoryId,
      companyMasterID,
      accountHeadID,
    } = await req.body;

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    const condition = { companyMasterID, [Sequelize.Op.or]: [] };
    if (accountHeadID) {
      condition[Sequelize.Op.or].push({
        accountHeadID: accountHeadID,
      });
    }
    condition[Sequelize.Op.or].push({
      expenseCategoryId: expenseCategoryId,
      expenseHead: expenseHead1,
    });

    condition.expenseHeadId = { [Sequelize.Op.ne]: expenseHeadId };

    const accountheads = await expenseHead.findOne(
      {
        where: condition,
      },
      { transaction },
    );
    if (accountheads) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Account Head'),
      });
    }
    await expenseHead.update(
      {
        expenseHead: expenseHead1,
        expenseCategoryId,
        accountHeadID,
        updateBy,
        updateByIp,
      },
      {
        where: { expenseHeadId: expenseHeadId },
        individualHooks: true,
        transaction,
        user: req.userDetails,
      },
    );
    await transaction.commit();
    return res
      .status(200)
      .json({ status: 200, message: message.usermessage.expenseheadupdate });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * delete by i
 *
 * @param {id} expenseHeadID  to delete id
 */
exports.postDeleteexpenseHeadById = async (req, res, next) => {
  try {
    let { expenseHeadId } = await req.body;
    const userMasterID = req.userDetails.userMasterId;

    let data = await UserExpenseTransaction.findOne({
      where: {
        expenseHeadId: expenseHeadId,
        status: ['1', '0'],
      },
    });

    if (data) {
      return res.status(200).json({
        status: 401,
        message:
          'You can not delete this Expense Head. Already used in Expense.',
      });
    } else {
      await ExpenseHead.destroy({
        where: { expenseHeadId: expenseHeadId },
        user: req.userDetails,
        individualHooks: true,
      });
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.expenseheaddelete });
    }
  } catch (err) {
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { expenseHeadId, status } = await req.body;
    let delete_status;
    if (status == '1') {
      delete_status = await expenseHead.update(
        {
          status: '1',
        },
        {
          where: { expenseHeadId: expenseHeadId, status: ['1', '0'] },
          individualHooks: true,
          transaction,
          user: req.userDetails,
        },
      );
    } else {
      let data = await UserExpenseTransaction.findOne({
        where: {
          expenseHeadId: expenseHeadId,
          status: ['1', '0'],
        },
      });

      if (data) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message:
            'You can not deactivate this Expense Head. Already used in Expense.',
        });
      } else {
        delete_status = await expenseHead.update(
          {
            status: '0',
          },
          {
            where: { expenseHeadId: expenseHeadId, status: ['1', '0'] },
            individualHooks: true,
            transaction,
            user: req.userDetails,
          },
        );
      }
    }
    await transaction.commit();

    if (delete_status != 0) {
      res.status(200).json({
        status: 200,
        message: message.usermessage.expenseheaddelete,
        data: {},
      });
    } else {
      res.status(200).json({
        status: 200,
        message: message.usermessage.deletedrecord,
        data: {},
      });
    }
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getexpenseHeadcompanyid = async (req, res, next) => {
  try {
    const { companyMasterID, limit, page, searchQuery, exportData } =
      await req.body;

    const condition = {};

    condition.status = [0, 1];

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          expenseHead: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$companyMaster.companyName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$expenseCategory.expenseCategory$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];

    const ExpenseHead = await expenseHead.findAndCountAll({
      raw: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
        {
          model: ExpenseCategory,
          attributes: ['expenseCategory'],
        },
      ],
    });
    if (exportData) {
      const finalData = [];

      for (let i = 0; i < ExpenseHead.rows.length; i++) {
        const data1 = {
          ExpenseHead: ExpenseHead.rows[i].expenseHead,
          ExpenseCategory:
            ExpenseHead.rows[i]['expenseCategory.expenseCategory'],
          CompanyName: ExpenseHead.rows[i]['companyMaster.companyName'],
          AccountHeadID: ExpenseHead.rows[i].accountHeadID,
          Status: ExpenseHead.rows[i].status,
        };
        data1.Status == 1
          ? (data1.Status = 'Active')
          : (data1.Status = 'Deactive');
        finalData.push(data1);
      }

      await generateExcel(finalData, 'ExpenseHead', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: ExpenseHead.rows,
      totalcount: ExpenseHead.count,
    });
  } catch (err) {
    next(err.message);
  }
};

exports.getactiveexpenseheadbycategoryid = async (req, res, next) => {
  try {
    const order = [['expenseHead', 'ASC']];
    const expensehead = await expenseHead.findAll({
      where: {
        expenseCategoryId: req.params.id,
        status: 1,
      },
      order,
    });

    return res.status(200).json({ status: 200, data: expensehead });
  } catch (err) {
    next(err);
  }
};

exports.excel1 = async (req, res) => {
  try {
    const { companyMasterID } = req.body;
    const expenseCategories = await ExpenseCategory.findAll({
      where: { companyMasterID: companyMasterID, status: 1 },
    });
    res.status(200).json({
      status: 200,
      data: expenseCategories,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: 500,
      message: 'Internal error',
    });
  }
};

exports.uploadexcel = async (req, res) => {
  const transaction = await sequelize.transaction();
  if (req.file == undefined) {
    await transaction.rollback();
    return res
      .status(400)
      .json({ status: 400, message: 'Please upload an Excel file!' });
  }

  const filePath = path.join(__dirname, `../uploads/${req.file.filename}`);

  try {
    // const filePath = './uploads/' + req.file.filename;

    // Read the Excel file
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Get the header row from the Excel file
    const headerRow = data[0];

    // Find the column index of the 'expenseHead' and 'expenseCategory' fields
    const expenseHeadColumnIndex = headerRow.findIndex(
      (column) => column.toLowerCase() === 'expensehead',
    );
    const expenseCategoryColumnIndex = headerRow.findIndex(
      (column) => column.toLowerCase() === 'expensecategory',
    );

    // Extract the expense head and expense category values
    const expenseData = data.slice(1).map((row) => ({
      expenseHead: row[0],
      expenseCategory: row[1],
    }));

    // Iterate over the expense data and insert into the database
    let existingExpenseHead = [];
    let insertedExpenseHead = [];
    let nonExistentExpenseCategories = [];

    for (const expense of expenseData) {
      // Check if the expense head already exists (case-insensitive)
      const existingExpense = await expenseHead.findOne({
        where: {
          asset_name: sequelize.or(
            sequelize.where(
              sequelize.fn('LOWER', sequelize.col('expenseHead')),
              expense.expenseHead.toLowerCase(),
            ),
            sequelize.where(
              sequelize.fn('UPPER', sequelize.col('expenseHead')),
              expense.expenseHead.toUpperCase(),
            ),
          ),

          companyMasterID: req.body.companyMasterID,
        }, // Set the parentCompanyMasterID in the query
      });

      if (existingExpense) {
        existingExpenseHead.push(expense.expenseHead);
      } else {
        // Check if the expense category exists
        const existingExpenseCategory = await ExpenseCategory.findOne({
          raw: true,
          where: {
            companyMasterID: req.body.companyMasterID,
            expenseCategory: expense.expenseCategory,
            status: 1,
          },
        });

        if (existingExpenseCategory) {
          await expenseHead.create(
            {
              expenseHead: expense.expenseHead,
              expenseCategoryId: existingExpenseCategory.expenseCategoryId,
              companyMasterID: req.body.companyMasterID,
              createBy: req.body.createBy,
            },
            { user: req.userDetails, transaction },
          );
          insertedExpenseHead.push(expense.expenseHead);
        } else {
          nonExistentExpenseCategories.push(expense.expenseCategory);
        }
      }
    }

    if (nonExistentExpenseCategories.length > 0) {
      await transaction.rollback();
      res.status(200).json({
        status: 401,
        message: `Expense Category '${nonExistentExpenseCategories.join(
          ', ',
        )}' does not exist.`,
      });
    } else if (existingExpenseHead.length > 0) {
      await transaction.rollback();
      res.status(200).json({
        status: 401,
        message: `Expense Head '${existingExpenseHead.join(
          ', ',
        )}' already exists in the Company.`,
      });
    } else {
      await transaction.commit();
      res.status(200).json({
        status: 200,
        message: `Expense Head '${insertedExpenseHead.join(
          ', ',
        )}' inserted successfully`,
      });
    }
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({
      status: 500,
      message: 'Internal server error',
    });
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
    const rows = await readXlsxFile(filePath);

    // Skip header
    rows.shift();

    const data = [];
    for (const row of rows) {
      if (row[0] != null && row[0].trim() != '') {
        let getExpenseCategoryID = await ExpenseCategory.findOne({
          where: {
            expenseCategory: { [Sequelize.Op.iLike]: row[0] },
            companyMasterID: req.body.companyMasterID,
          },
        });
        let expenseHeadMaster = {
          expenseCategoryId: row[0],
          expenseHead: row[1].trim(),
          companyMasterID: req.body.companyMasterID,
          remarks: '',
        };

        if (getExpenseCategoryID) {
          expenseHeadMaster.expenseCategoryId =
            getExpenseCategoryID.expenseCategoryId;
        } else {
          expenseHeadMaster.expenseCategoryId = '';
          expenseHeadMaster.remarks =
            'Expense Category Not Exist! Please Add Expense Category!!';
        }
        const duplicateInExcel = data.find(
          (s) =>
            s.expenseHead &&
            typeof s.expenseHead === 'string' &&
            s.expenseHead.toLowerCase() ===
              expenseHeadMaster.expenseHead.toLowerCase() &&
            s.expenseCategoryId == expenseHeadMaster.expenseCategoryId,
        );

        if (duplicateInExcel) {
          expenseHeadMaster.remarks = 'Duplicate Expense Head in Excel';
        } else {
          const condition = {
            companyMasterID: req.body.companyMasterID,
            status: [0, 1],
            expenseHead: {
              [Sequelize.Op.iLike]: expenseHeadMaster.expenseHead,
            },
          };
          if (getExpenseCategoryID) {
            condition.expenseCategoryId =
              getExpenseCategoryID.expenseCategoryId;
          }

          const uniquedata = await expenseHead.findAll({
            where: condition,
          });

          if (uniquedata.length > 0) {
            expenseHeadMaster.remarks = 'Expense Head Already Exists';
          }
        }
        data.push(expenseHeadMaster);
      }
    }
    fs.unlink(filePath, function (err) {});
    return res.status(200).json({
      status: 200,
      message: message.usermessage.expenseheadValidate,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.revalidateExpensehead = async (req, res, next) => {
  try {
    const { expenseHeadData, companyMasterID } = req.body;

    let data = [];
    for (const row of expenseHeadData) {
      // Ensure the row is an object and has the required fields
      if (row.expenseHead && row.expenseHead.trim() !== '') {
        let expenseHeadMaster = {
          expenseHead: row.expenseHead.trim(),
          expenseCategoryId: row.expenseCategoryId,
          remarks: '',
        };

        // Check for duplicates in `data` array
        const duplicateInData = data.some(
          (s) =>
            s.expenseHead.trim().toLowerCase() ===
              expenseHeadMaster.expenseHead.trim().toLowerCase() &&
            s.expenseCategoryId == expenseHeadMaster.expenseCategoryId,
        );

        if (duplicateInData) {
          expenseHeadMaster.remarks = 'Duplicate Expense Head in Data';
        } else {
          // Check for duplicates in the database
          const condition = {
            companyMasterID: companyMasterID,
            status: [0, 1],
            expenseHead: {
              [Sequelize.Op.iLike]: expenseHeadMaster.expenseHead,
            },
            expenseCategoryId: expenseHeadMaster.expenseCategoryId,
          };

          const uniquedata = await expenseHead.findAll({
            where: condition,
          });

          if (uniquedata && uniquedata.length > 0) {
            expenseHeadMaster.remarks = 'Expense Head Already Exists';
          }
        }

        data.push(expenseHeadMaster);
      }
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.expenseheadReValidate,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};
exports.addValidateExpensehead = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { expenseHeadData, companyMasterID } = req.body;

    await expenseHead.bulkCreate(
      expenseHeadData.map((item) => ({
        expenseHead: item.expenseHead.trim(),
        expenseCategoryId: item.expenseCategoryId,
        companyMasterID,
        createBy: req.userDetails.userMasterId,
        createByIp: req.userDetails.userIpAddress,
      })),
      { transaction, user: req.userDetails },
    );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.expenseheadadd,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.generateDemoExcel = async (req, res, next) => {
  try {
    let { limit, page, companyMasterID } = await req.body;
    const condition = {};
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    condition.companyMasterID = companyMasterID;
    condition.status = [0, 1];
    const order = [['expenseCategory', 'ASC']];
    const { rows, count } = await ExpenseCategory.findAndCountAll({
      raw: true,
      where: condition,
      ...paginationQuery,
      order,
    });
    const expenseCategoryName = rows.map((row) => row.expenseCategory);
    await genrateDemoExcelForExpenseHead(
      expenseCategoryName,
      'Demo Expense Head',
      'xlsx',
      res,
    );
  } catch (err) {
    next(err);
  }
};
