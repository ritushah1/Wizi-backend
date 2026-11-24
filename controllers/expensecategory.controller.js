const expenseCategory = require('../models/expenseCategory');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const companyMaster = require('../models/companyMaster');
const sequelize = require('../config/database');
const expenseHead = require('../models/expenseHead');
const { generateExcel } = require('../utils/exportData');
const ExpenseCategory = require('../models/expenseCategory');
const readXlsxFile = require('read-excel-file/node');
const fs = require('fs');
const path = require('path');

exports.postAddexpenseCategory = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { expenseCategory1, companyMasterID } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    await expenseCategory.create(
      {
        expenseCategory: expenseCategory1,
        companyMasterID,
        createBy,
        createByIp,
      },
      { user: req.userDetails, transaction },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Expense Category'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getexpenseCategoryId = async (req, res, next) => {
  try {
    let get_one_data = await expenseCategory.findOne({
      where: { expenseCategoryId: req.params.id, status: ['0', '1'] },
      raw: true,
    });
    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateexpenseCategory = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { expenseCategoryId, expenseCategory1, companyMasterID } =
      await req.body;

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    await expenseCategory.update(
      {
        expenseCategory: expenseCategory1,
        updateBy,
        updateByIp,
      },
      {
        where: { expenseCategoryId: expenseCategoryId },
        individualHooks: true,
        transaction,
        user: req.userDetails,
      },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Expense Category'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postDeleteexpenseCategoryById = async (req, res, next) => {
  try {
    let { expenseCategoryId } = await req.body;
    const userMasterID = req.userDetails.userMasterId;

    let data = await expenseHead.findOne({
      where: {
        expenseCategoryId: expenseCategoryId,
        status: ['1', '0'],
      },
    });

    if (data) {
      return res.status(200).json({
        status: 401,
        message:
          'You can not delete this Expense Category. Already used in Expense Head.',
      });
    } else {
  
      await ExpenseCategory.destroy({
        where: { expenseCategoryId: expenseCategoryId },
        individualHooks:true,
        user:req.userDetails
      });
      return res.status(200).json({
        status: 200,
        message: message.usermessage.deleteMessage('Expense Category'),
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { expenseCategoryId, status } = await req.body;
    let delete_status;
    if (status != '1') {
      let data = await expenseHead.findOne({
        where: {
          expenseCategoryId: expenseCategoryId,
          status: ['1', '0'],
        },
      });
      if (data) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message:
            'You can not deactivate this Expense Category. Already used in Expense Head.',
        });
      }
    }
    await expenseCategory.update(
      {
        status,
      },
      {
        where: { expenseCategoryId: expenseCategoryId, status: ['1', '0'] },
        individualHooks: true,
        transaction,
        user: req.userDetails,
      },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Expense Category')
          : message.usermessage.deactiveMessage('Expense Category'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getexpenseCategorycompanyid = async (req, res, next) => {
  try {
    const { companyMasterID, limit, page, searchQuery, exportData } =
      await req.body;

    const condition = {};

    condition.status = [0, 1];

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          expenseCategory: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$companyMaster.companyName$': {
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

    const ecpense_Category = await expenseCategory.findAndCountAll({
      raw: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
      ],
    });

    if (exportData) {
      const finalData = [];

      for (let i = 0; i < ecpense_Category.rows.length; i++) {
        const data1 = {
          ExpenseCategory: ecpense_Category.rows[i].expenseCategory,
          CompanyName: ecpense_Category.rows[i]['companyMaster.companyName'],
          Status: ecpense_Category.rows[i].status,
        };
        data1.Status == 1
          ? (data1.Status = 'Active')
          : (data1.Status = 'Deactive');
        finalData.push(data1);
      }

      await generateExcel(finalData, 'ExpenseCategory', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: ecpense_Category.rows,
      totalcount: ecpense_Category.count,
    });
  } catch (err) {
    next(err.message);
  }
};

exports.getexpenseCategoryByCompanyId = async (req, res, next) => {
  try {
    const order = [['expenseCategory', 'ASC']];
    const get_one_data = await expenseCategory.findAll({
      where: {
        companyMasterID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      raw: true,
      order,
    });

    return res.status(200).json({ status: 200, data: get_one_data });
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
    const rows = await readXlsxFile(filePath);

    // Skip header
    rows.shift();
    const data = [];

    for (const row of rows) {
      if (row && row.length > 0) {
        const expenseCategory = row[0]; // Assuming the Expense Category name is in the first column
        let expenseCategoryMaster = {
          expenseCategory: expenseCategory,
          companyMasterID: req.body.companyMasterID,
          remarks: '',
        };

        const duplicateInExcel = data.find(
          (s) =>
            s.expenseCategory &&
            typeof s.expenseCategory === 'string' &&
            s.expenseCategory.toLowerCase() ===
              expenseCategoryMaster.expenseCategory.toLowerCase(),
        );

        if (duplicateInExcel) {
          expenseCategoryMaster.remarks =
            'Duplicate Expense Category Name in Excel';
        } else {
          const condition = {
            companyMasterID: req.body.companyMasterID,
            status: [0, 1],
            expenseCategory: {
              [Sequelize.Op.iLike]: expenseCategoryMaster.expenseCategory,
            },
          };

          const uniquedata = await ExpenseCategory.findAll({
            where: condition,
          });

          if (uniquedata.length > 0) {
            expenseCategoryMaster.remarks = 'Expense Category Already Exists';
          }
        }

        data.push(expenseCategoryMaster);
      }
    }
    fs.unlink(filePath, function (err) {});
    return res.status(200).json({
      status: 200,
      message: message.usermessage.expenseCategoryValidate,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.reValidateExpenceCategory = async (req, res, next) => {
  try {
    const { expenseCategory, companyMasterID } = req.body;

    let data = [];
    for (const row of expenseCategory) {
      if (row != null && row != '') {
        let expenseCategoryMaster = {
          expenseCategory: row.trim(),
          remarks: '',
        };
        const duplicateInData = data.some(
          (s) =>
            s.expenseCategory.trim().toLowerCase() ===
            expenseCategoryMaster.expenseCategory.trim().toLowerCase(),
        );

        if (duplicateInData) {
          expenseCategoryMaster.remarks =
            'Duplicate Expense Category Name in Data';
        } else {
          const condition = {};
          condition.companyMasterID = companyMasterID;
          condition.status = [0, 1];
          condition.expenseCategory = {
            [Sequelize.Op.iLike]: expenseCategoryMaster.expenseCategory,
          };
          let uniquedata = await ExpenseCategory.findAll({
            where: condition,
          });
          if (uniquedata && uniquedata.length > 0) {
            expenseCategoryMaster.remarks = 'Expense Category Already Exists';
          }
        }

        data.push(expenseCategoryMaster);
      }
    }
    return res.status(200).json({
      status: 200,
      message: message.usermessage.expenseCategoryValidate,
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.addValidateExpenseCategory = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { expenseCategory, companyMasterID } = req.body;

    await ExpenseCategory.bulkCreate(
      expenseCategory.map((item) => ({
        expenseCategory: item.trim(),
        companyMasterID,
        createBy: req.userDetails.userMasterId,
        createByIp: req.userDetails.userIpAddress,
      })),
      { transaction, user: req.userDetails },
    );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.expenseCategoryadd,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
