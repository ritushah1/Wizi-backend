const { Op } = require('sequelize');
const UserMaster = require('../models/userMaster');
const Visit = require('../models/visit');
const { userAttributes, statusCodes } = require('../utils/commonVars');
const {
  countDaysBetween,
  getDatesFromDateRange,
  asiaKolkataDateTime,
} = require('../utils/commonUtilFunctions');
const moment = require('moment');
const Customer = require('../models/customer');
const UserExpense = require('../models/userExpense');
const UserExpenseTransaction = require('../models/userExpenseTransaction');
const EmployeeDepartment = require('../models/employeeDepartment');
const Sequelize = require('sequelize');
const PurposeOfVisit = require('../models/purposeOfVisit');
const VisitPurpose = require('../models/visitPurpose');

exports.getVisitDashboardData = async (req, res, next) => {
  try {
    const {
      userMasterID,
      fromDate,
      toDate,
      companyMasterID,
      departmentID = [],
    } = req.body;

    const visitCondition = {
      status: 1,
    };

    if (userMasterID) {
      visitCondition.assignID = userMasterID;
    }

    if (fromDate && toDate) {
      visitCondition.visitDate = {
        [Op.between]: [
          asiaKolkataDateTime(fromDate).slice(0, 10),
          asiaKolkataDateTime(toDate).slice(0, 10),
        ],
      };
    }
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const visitData = await Visit.findAll({
      distinct: true,
      where: visitCondition,
      attributes: [
        'visitID',
        'customerID',
        'assignID',
        'visitPurposeID',
        'visitDate',
        'checkInDateTime',
        'checkOutDateTime',
        'createdAt',
      ],
      order: [['visitDate', 'ASC']],
      include: [
        {
          model: PurposeOfVisit,
          as: 'pov',
          attributes: ['visitPurposeID'],
          include: [{ model: VisitPurpose, attributes: ['visitPurpose'] }],
        },
        {
          model: Customer,
          attributes: ['customerID', 'customerName', 'createdAt'],
        },
        {
          model: UserMaster,
          as: 'assign',
          where: {
            status: [0, 1],
            companyMasterId: companyMasterID,
          },
          attributes: userAttributes,
          include: [
            {
              model: EmployeeDepartment,
              required: departmentID?.length > 0 ? true : false,
              attributes: ['departmentID'],
              where: {
                departmentID: departmentID,
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: currentDate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: currentDate } },
                  { endDate: null },
                ],
              },
            },
          ],
        },
        {
          model: UserExpense,
          attributes: ['userExpenseID', 'visitID'],
          include: [
            {
              model: UserExpenseTransaction,
              attributes: [
                'userExpenseTransactionID',
                'userExpenseID',
                'expenseAmount',
              ],
            },
          ],
        },
      ],
    });

    const totalDays = countDaysBetween(fromDate, toDate);
    let datesInRange = await getDatesFromDateRange(
      new Date(fromDate),
      new Date(toDate),
    );
    datesInRange = datesInRange?.map((e) => [
      moment(e).format('DD-MM-YYYY'),
      [],
    ]);

    const dashboardData = visitData.reduce(
      (acc, obj) => {
        if (
          new Date(obj.visitDate) < new Date(currentDate) &&
          !obj.checkInDateTime &&
          !obj.checkOutDateTime
        ) {
          acc.missedVisits.push(obj);
        } else {
          if (new Date(obj.visitDate) >= new Date(currentDate)) {
            acc.todayVisits.push(obj);
          } else {
            acc.visitData.push(obj);
          }

          if (
            acc.uniquenessData.unique.some(
              (x) => x.customerID == obj.customerID,
            )
          ) {
            acc.uniquenessData.repeat.push(obj);
          } else {
            acc.uniquenessData.unique.push(obj);
          }
          if (
            !Object.keys(acc.customerVisited).includes(String(obj.customerID))
          ) {
            acc.customerVisited[obj.customerID] = [obj];
          } else {
            acc.customerVisited[obj.customerID].push(obj);
          }

          if (!acc.averageVisit.customers.includes(obj.customerID)) {
            acc.averageVisit.customers.push(obj.customerID);
          }

          const visitDate = moment(obj.visitDate, 'YYYY-MM-DD').format(
            'DD-MM-YYYY',
          );

          acc.dateWiseVisit[visitDate].push(obj);

          if (
            !Object.keys(acc.leaderBoardData).includes(String(obj.assignID))
          ) {
            acc.leaderBoardData[obj.assignID] = [obj];
          } else {
            acc.leaderBoardData[obj.assignID].push(obj);
          }

          if (Array.isArray(obj.pov)) {
            obj.pov.forEach((pov) => {
              const visitPurposeID = pov?.visitPurposeID;

              if (visitPurposeID) {
                if (
                  !Object.keys(acc.purposeData).includes(String(visitPurposeID))
                ) {
                  acc.purposeData[visitPurposeID] = [pov];
                } else {
                  acc.purposeData[visitPurposeID].push(pov);
                }
              }
            });
          }

          if (
            new Date(obj.customer.createdAt) <= new Date(toDate) &&
            new Date(obj.customer.createdAt) >= new Date(fromDate) &&
            !acc.classificationData.new.includes(obj.customerID)
          ) {
            acc.classificationData.new.push(obj.customerID);
          } else {
            if (
              !acc.classificationData.exist.includes(obj.customerID) &&
              !acc.classificationData.new.includes(obj.customerID)
            ) {
              acc.classificationData.exist.push(obj.customerID);
            }
          }

          const userExpenseAmount = obj?.userExpenses?.reduce((acc, obj) => {
            return (
              acc +
              +obj.userExpenseTransactions.reduce(
                (acc, obj) => acc + +obj.expenseAmount,
                0,
              )
            );
          }, 0);
          acc.visitExpense.amount += +userExpenseAmount;
        }
        if (
          new Date(obj.visitDate).toISOString().slice(0, 10) ==
          new Date(obj.createdAt).toISOString().slice(0, 10)
        ) {
          acc.planningData.unScheduled.push(obj);
        } else {
          acc.planningData.scheduled.push(obj);
        }

        return acc;
      },
      {
        visitData: [],
        missedVisits: [],
        todayVisits: [],
        leaderBoardData: {},
        uniquenessData: {
          repeat: [],
          unique: [],
        },
        classificationData: {
          exist: [],
          new: [],
        },
        averageVisit: {
          perCustomer: 0,
          customers: [],
          perDay: 0,
        },
        customerVisited: {},
        dateWiseVisit: Object.fromEntries(datesInRange),
        purposeData: {},
        dates: Object.keys(Object.fromEntries(datesInRange)),
        visitExpense: {
          expenseAmountPerVisit: 0,
          amount: 0,
        },
        planningData: {
          scheduled: [],
          unScheduled: [],
        },
      },
    );

    const totalVisits =
      dashboardData.visitData.length + dashboardData.todayVisits.length;
    dashboardData.averageVisit.perDay = parseFloat(
      (totalVisits / totalDays).toFixed(2),
    );
    dashboardData.rowData = visitData;
    dashboardData.averageVisit.perCustomer = parseFloat(
      (totalVisits / dashboardData.averageVisit.customers.length).toFixed(2),
    );
    dashboardData.visitExpense.expenseAmountPerVisit = parseFloat(
      (dashboardData.visitExpense.amount / totalVisits).toFixed(2),
    );

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: dashboardData,
    });
  } catch (error) {
    next(error);
  }
};
