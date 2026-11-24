const expensePayment = require('../models/expensePayment');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserExpenseTransaction = require('../models/userExpenseTransaction');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');
const moment = require('moment');
const ExpensePaymentTransaction = require('../models/expensePaymentTransaction');
const UserExpense = require('../models/userExpense');
const { userAttributes } = require('../utils/commonVars');
const UserMaster = require('../models/userMaster');

exports.getExpensePaymentTransByUserExpenseTranID = async (req, res, next) => {
  try {
    let { userExpenseTransactionID } = req.body;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const { rows, count } = await ExpensePaymentTransaction.findAndCountAll({
      where: {
        userExpenseTransactionID,
      },
      order: [['ExpensePaymentID', 'ASC']],
      include: [
        {
          model: UserExpenseTransaction,
          as: 'uet',
          include: [{ model: UserExpense, as: 'userExpense' }],
        },
        {
          model: expensePayment,
          as: 'ep',
          include: [
            {
              model: UserMaster,
              as: 'c_By',
              attributes: userAttributes,
            },
            {
              model: UserMaster,
              as: 'u_By',
              attributes: userAttributes,
            },
          ],
        },
      ],
    });

    return res.status(200).json({ status: 200, data: rows, totalcount: count });
  } catch (err) {
    next(err);
  }
};
