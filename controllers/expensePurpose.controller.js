const Sequelize = require('sequelize');
const ExpensePurpose = require('../models/expensePurpose');
const message = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const path = require('path');
const readXlsxFile = require('read-excel-file/node');
const fs = require('fs');
const sequelize = require('../config/database');
const {
  generateDemoExcelForExpensePurpose,
  generateExcel,
} = require('../utils/exportData');
const UserExpense = require('../models/userExpense');
const UserMaster = require('../models/userMaster');
const moment = require('moment');
const UserExpenseTransaction = require('../models/userExpenseTransaction');

exports.getAllExpensePurpose = async (req, res, next) => {
  try {
    const { limit, page, searchQuery, companyMasterID, exportData } = req.body;

    const condition = {
      status: [0, 1],
      companyMasterID: companyMasterID,
    };

    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          name: {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
      ];
    }

    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const { rows: expensePurposeData, count } =
      await ExpensePurpose.findAndCountAll({
        where: condition,
        ...paginationQuery,
        order: [['name', 'ASC']],
        include: [
          {
            model: companyMaster,
            attributes: ['companyName'],
          },
          {
            model: UserMaster,
            as: 'createdBy',
            attributes: ['displayName'],
          },
          {
            model: UserMaster,
            as: 'updatedBy',
            attributes: ['displayName'],
          },
        ],
      });

    if (exportData) {
      const finaldata = expensePurposeData.map((e) => {
        return {
          'Company Name': e.companyMaster?.companyName || '-',
          'Expense Purpose Name': e.name || '-',
          CreatedBy: e.createdBy.displayName,
          'Created By': `${e.createdBy?.displayName || ''} - ${moment(e.createdAt).format('DD-MM-YYYY HH:mm') || ''}`,
          'Updated By': e.updateBy
            ? `${e.updatedBy?.displayName || ''} - ${moment(e.updatedAt).format('DD-MM-YYYY HH:mm') || ''}`
            : '',
          status: e.status === 1 ? 'Active' : 'Inactive',
        };
      });

      return await generateExcel(finaldata, 'Expense Purpose', 'xlsx', res);
    }
    return res.status(200).json({
      status: 200,
      data: expensePurposeData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.postAddExpensePurpose = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { name, companyMasterID } = await req.body;

    if (!name) {
      await transaction.rollback();
      return res.status(404).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Expense Purpose name'),
      });
    }

    if (!companyMasterID) {
      await transaction.rollback();
      return res.status(404).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Company'),
      });
    }

    const expensePurpose = await ExpensePurpose.findOne({
      where: {
        name: {
          [Sequelize.Op.iLike]: name,
        },
        companyMasterID: companyMasterID,
      },
    });

    if (expensePurpose) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists(
          'Expense Purpose With Same Name',
        ),
      });
    }

    let insert_db_status = await ExpensePurpose.create(
      {
        name,
        companyMasterID,
      },
      { user: req.userDetails, transaction },
    );
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Expense Purpose'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getExpensePurposeById = async (req, res, next) => {
  try {
    const { expensePurposeID } = req.body;

    if (!expensePurposeID) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: message.usermessage.notFoundMessage('Expense Purpose ID'),
      });
    }

    let get_one_data = await ExpensePurpose.findOne({
      where: {
        expensePurposeID: expensePurposeID,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
    });

    if (!get_one_data) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: message.usermessage.notFoundMessage('Expense Purpose'),
      });
    }

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateExpensePurpose = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { expensePurposeID, name, companyMasterID } = req.body;

    const findExpensePurpose = await ExpensePurpose.findOne({
      where: {
        name: {
          [Sequelize.Op.iLike]: name,
        },
        companyMasterID: companyMasterID,
        expensePurposeID: { [Sequelize.Op.notIn]: [expensePurposeID] },
      },
    });

    if (findExpensePurpose) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Expense Purpose'),
      });
    }

    await ExpensePurpose.update(
      {
        name,
        companyMasterID,
      },
      {
        where: { expensePurposeID },
        individualHooks: true,
        transaction,
        user: req.userDetails,
      },
    );
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Expense Purpose'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { expensePurposeID, status } = await req.body;

    if (status != '1') {
      let data = await UserExpenseTransaction.findOne({
        where: {
          expensePurposeID: expensePurposeID,
        },
      });

      if (data) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: message.usermessage.alreadyAssign(
            'Expense Purpose',
            'deactivate',
          ),
        });
      }
    }
    await ExpensePurpose.update(
      {
        status,
      },
      {
        where: { expensePurposeID: expensePurposeID },
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
          ? message.usermessage.activeMessage('Expense Purpose')
          : message.usermessage.deactiveMessage('Expense Purpose'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postDeleteExpensePurposeById = async (req, res, next) => {
  try {
    const { expensePurposeID } = await req.body;

    const data = await UserExpenseTransaction.findOne({
      where: {
        expensePurposeID: expensePurposeID,
      },
    });
    if (data) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyAssign('Expense Purpose', 'Delete'),
      });
    }
    await ExpensePurpose.destroy({
      where: { expensePurposeID },
      individualHooks: true,
      user: req.userDetails,
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Expense Purpose'),
    });
  } catch (err) {
    next(err);
  }
};

exports.validateUploadExcel = async (req, res, next) => {
  if (req.file == undefined) {
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
        const expensePurpose = row[0];
        let expensePurposeMaster = {
          name: expensePurpose,
          companyMasterID: req.body.companyMasterID,
          remarks: '',
        };

        const duplicateInExcel = data.find(
          (s) =>
            s.name &&
            typeof s.name === 'string' &&
            s.name.toLowerCase() === expensePurposeMaster.name.toLowerCase(),
        );

        if (duplicateInExcel) {
          expensePurposeMaster.remarks =
            'Duplicate Expense Purpose Name in Excel';
        } else {
          const condition = {
            companyMasterID: req.body.companyMasterID,
            status: [0, 1],
            name: {
              [Sequelize.Op.iLike]: expensePurposeMaster.name,
            },
          };

          const uniquedata = await ExpensePurpose.findAll({
            where: condition,
          });

          if (uniquedata.length > 0) {
            expensePurposeMaster.remarks = 'Expense Purpose Already Exists';
          }
        }

        data.push(expensePurposeMaster);
      }
    }
    fs.unlink(filePath, function (err) {});
    return res.status(200).json({
      status: 200,
      message: message.usermessage.validateMessage('Expense Purpose'),
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.reValidateExpensePurpose = async (req, res, next) => {
  try {
    const { name, companyMasterID } = req.body;

    let data = [];
    for (const row of name) {
      if (row != null && row != '') {
        let expensePurpose = {
          name: row.trim(),
          remarks: '',
        };
        const duplicateInData = data.some(
          (s) =>
            s.name.trim().toLowerCase() ===
            expensePurpose.name.trim().toLowerCase(),
        );

        if (duplicateInData) {
          expensePurpose.remarks = 'Duplicate Expense Purpose Name in Data';
        } else {
          const condition = {};
          condition.companyMasterID = companyMasterID;
          condition.status = [0, 1];
          condition.name = {
            [Sequelize.Op.iLike]: expensePurpose.name,
          };
          let uniquedata = await ExpensePurpose.findAll({
            where: condition,
          });
          if (uniquedata && uniquedata.length > 0) {
            expensePurpose.remarks = 'Expense Purpose Already Exists';
          }
        }

        data.push(expensePurpose);
      }
    }
    return res.status(200).json({
      status: 200,
      message: message.usermessage.validateMessage('Expense Purpose'),
      data: data,
    });
  } catch (error) {
    next(error);
  }
};

exports.addValidateExpensePurpose = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { name, companyMasterID } = req.body;

    const data = name.map((item) => ({
      name: item.trim(),
      companyMasterID,
    }));

    await ExpensePurpose.bulkCreate(data, {
      individualHooks: true,
      user: req.userDetails,
      transaction,
    });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Expense Purpose'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.generateDemoExcelForExpensePurpose = async (req, res, next) => {
  try {
    await generateDemoExcelForExpensePurpose({}, 'expensePurpose', 'xlsx', res);
  } catch (error) {
    next(error);
  }
};

exports.  getAllActiveExpensePurpose = async (req, res, next) => {
  try {
    const { limit, page, searchQuery, companyMasterID, exportData } = req.body;

    const condition = {
      status: 1,
      companyMasterID: companyMasterID,
    };

    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          name: {
            [Sequelize.Op.iLike]: `%${searchQuery}%`,
          },
        },
      ];
    }

    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const { rows: expensePurposeData, count } =
      await ExpensePurpose.findAndCountAll({
        where: condition,
        ...paginationQuery,
        order: [['name', 'ASC']],
        include: [
          {
            model: companyMaster,
            attributes: ['companyName'],
          },
          {
            model: UserMaster,
            as: 'createdBy',
            attributes: ['displayName'],
          },
          {
            model: UserMaster,
            as: 'updatedBy',
            attributes: ['displayName'],
          },
        ],
      });

    if (exportData) {
      const finaldata = expensePurposeData.map((e) => {
        return {
          'Company Name': e.companyMaster?.companyName || '-',
          'Expense Purpose Name': e.name || '-',
          CreatedBy: e.createdBy.displayName,
          'Created By': `${e.createdBy?.displayName || ''} - ${moment(e.createdAt).format('DD-MM-YYYY HH:mm') || ''}`,
          'Updated By': e.updateBy
            ? `${e.updatedBy?.displayName || ''} - ${moment(e.updatedAt).format('DD-MM-YYYY HH:mm') || ''}`
            : '',
          status: e.status === 1 ? 'Active' : 'Inactive',
        };
      });

      return await generateExcel(finaldata, 'Expense Purpose', 'xlsx', res);
    }
    return res.status(200).json({
      status: 200,
      data: expensePurposeData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};
