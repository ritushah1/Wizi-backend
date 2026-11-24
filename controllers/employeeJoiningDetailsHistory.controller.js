const Sequelize = require('sequelize');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');
const EmployeeJoiningDetailHistory = require('../models/employeeJoiningDetailsHistory');
const BankMaster = require('../models/bankMaster');
const Contractor = require('../models/contractor');
const UserMaster = require('../models/userMaster');
const BankBranch = require('../models/bankBranch');

exports.getEmployeeJoiningDetailsHistoryByUserMasterID = async (
  req,
  res,
  next
) => {
  try {
    const { userMasterID, page, limit, exportData } = req.body;
    const date = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginationQuery = {};

    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['createdAt', 'DESC']];

    const { rows: getEmployeeJoiningHistory, count } =
      await EmployeeJoiningDetailHistory.findAndCountAll({
        where: {
          userMasterID,
        },
        ...paginationQuery,
        order,
        include: [
          {
            model: BankMaster,
            attributes: ['bankName'],
          },
          {
            model: BankBranch,
            attributes: ['bankBranchName'],
          },
          {
            model: BankMaster,
            as: 'employeePFBank',
            attributes: ['bankName'],
          },
          {
            model: Contractor,
            attributes: ['contractorName'],
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

    return res.status(200).json({
      status: 200,
      data: getEmployeeJoiningHistory,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};
