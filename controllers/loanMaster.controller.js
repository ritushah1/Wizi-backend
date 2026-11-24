const Sequelize = require('sequelize');
const LoanMaster = require('../models/loanMaster');
const sequelize = require('../config/database');
const message = require('../response_message/message');
const LoanTransaction = require('../models/loanTransaction');
const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const LoanAdvance = require('../models/loanAdvance');
const {
  asiaKolkataDateTime,
  employeeDepartment,
  employeeDesignation,
  employeeBranch,
  sendNotification,
} = require('../utils/commonUtilFunctions');

const UserInbox = require('../models/UserInbox');

const { generateExcel } = require('../utils/exportData');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const {
  advancePaymentType,
  authorizationMasterTypes,
  notificationScreentTypes,
  notificationTitleTypes,
  AuthorizationStatusType,
} = require('../utils/dbUtils');
const FormAuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const LoanAuthorization = require('../models/loanAuthorizationRequest');
const moment = require('moment');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const { statusCodes } = require('../utils/commonVars');

exports.postAddLoanMaster = async (req, res, next) => {
  try {
    let LoanID;
    let {
      companyMasterID,
      userMasterID,
      LoanAmount,
      LoanRemark,
      EMIMonths,
      interest,
      startMonth,
      givenDate,
      paymentmode,
      loanstatus,
      rejectionremarks,
      referenceNO,
      referenceDate,
      payrollFrequency,
    } = await req.body;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    // Minimum allowed month = one month before givenDate
    const givenDateObj = moment(givenDate);

    const minimumStartMonth = givenDateObj
      .clone()
      .subtract(1, 'month')
      .format('YYYYMM');

    if (Number(startMonth) < Number(minimumStartMonth)) {
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: `Start month cannot be before ${moment(minimumStartMonth, 'YYYYMM').format('MMMM YYYY')}.`,
      });
    }

    const totalMonthlyPrinciple = req.body.loanTransaction.reduce((sum, tx) => {
      return sum + Number(tx.monthlyPrinciple || 0);
    }, 0);

    if (totalMonthlyPrinciple != LoanAmount)
      return res
        .status(200)
        .json({ status: 404, message: message.usermessage.loanAmountNotMatch });

    await sequelize.transaction(async (t) => {
      loanstatus = 1;
      const loanData = {
        companyMasterID,
        userMasterID,
        LoanAmount,
        LoanRemark,
        EMIMonths,
        interest,
        startMonth,
        givenDate,
        paymentmode,
        referenceNO,
        referenceDate,
        loanstatus,
        rejectionremarks,
        payrollFrequency,
      };
      if (req.body.LoanID == undefined) {
        let insert_db_status = await LoanMaster.create(
          {
            ...loanData,
            createBy,
            createByIp,
          },
          { transaction: t },
        );

        LoanID = insert_db_status.LoanID;
      } else {
        await LoanMaster.update(
          {
            ...loanData,
            updateBy,
            updateByIp,
          },
          {
            where: { LoanID: req.body.LoanID },
            transaction: t,
          },
        );

        LoanID = req.body.LoanID;
      }

      var efftarray = [];
      for (i = 0; i < req.body.loanTransaction.length; i++) {
        efftarray.push({
          LoanID: LoanID,
          EMIAmount: req.body.loanTransaction[i].instamount,
          EMIMonth: req.body.loanTransaction[i].yearmonth,
          monthlyPrinciple: req.body.loanTransaction[i].monthlyPrinciple,
          monthlyInterest: req.body.loanTransaction[i].monthlyInterest,
          startDate: req.body.loanTransaction[i].startDate,
          endDate: req.body.loanTransaction[i].endDate,
          createBy: createBy,
          createByIp: createByIp,
        });
      }

      await LoanTransaction.bulkCreate(efftarray, {
        returning: true,
        transaction: t,
      });

      res
        .status(200)
        .json({ status: 200, message: message.usermessage.LoanMasteradd });
    });
  } catch (err) {
    next(err);
  }
};

exports.postGetLoanMasterbyLoanID = async (req, res, next) => {
  try {
    let get_one_data = await LoanMaster.findOne({
      where: {
        LoanID: req.params.id,
        status: [0, 1],
      },
      order: [['LoanID', 'ASC']],
      include: [
        {
          model: UserMaster,
          as: 'userMaster',
        },
        {
          model: companyMaster,
          as: 'companyMaster',
        },
      ],
    });
    let get_child = await LoanTransaction.findAll({
      where: {
        LoanID: req.params.id,
        status: [0, 1],
      },
      order: [['LoanTrasactionId', 'ASC']],
    });

    let getAdvance = await LoanAdvance.findAll({
      where: {
        LoanID: req.params.id,
      },
      order: [['LoanAdvanceID', 'ASC']],
    });
    if (!get_one_data) {
      res
        .status(200)
        .json({ status: 404, message: message.usermessage.LoanMasternotFound });
    } else {
      res.status(200).json({
        status: 200,
        data: get_one_data,
        childData: get_child,
        LoanAdvance: getAdvance,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.postGetLoanMasterbyLoanIDV2 = async (req, res, next) => {
  try {
    const { LoanID, userMasterID } = req.body;
    let get_one_data = await LoanMaster.findOne({
      where: {
        LoanID: LoanID,
        userMasterID: userMasterID,
        status: [0, 1],
      },
      order: [['LoanID', 'ASC']],
      include: [
        {
          model: UserMaster,
          as: 'userMaster',
        },
        {
          model: companyMaster,
          as: 'companyMaster',
        },
      ],
    });
    let get_child = await LoanTransaction.findAll({
      where: {
        LoanID: LoanID,
        status: [0, 1],
      },
      order: [['LoanTrasactionId', 'ASC']],
    });

    let getAdvance = await LoanAdvance.findAll({
      where: {
        LoanID: LoanID,
      },
      order: [['LoanAdvanceID', 'ASC']],
    });
    if (!get_one_data) {
      res
        .status(200)
        .json({ status: 404, message: message.usermessage.LoanMasternotFound });
    } else {
      res.status(200).json({
        status: 200,
        data: get_one_data,
        childData: get_child,
        LoanAdvance: getAdvance,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.getLoanByCompanyid = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      searchQuery,
      startdate,
      enddate,
      userMasterID,
      companyMasterID,
    } = await req.body;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginationQuery = {};
    const condition = {
      [Sequelize.Op.or]: {
        authorizationStatus: AuthorizationStatusType.APPROVED,
        givenDate: {
          [Sequelize.Op.ne]: null,
        },
      },
    };
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['createdAt', 'DESC']];

    if (
      userMasterID === null ||
      userMasterID === undefined ||
      userMasterID === '' ||
      (Array.isArray(userMasterID) && userMasterID.length === 0)
    ) {
    } else condition.userMasterID = userMasterID;

    condition.companyMasterID = companyMasterID;
    condition.status = [0, 1];
    if (startdate && enddate)
      condition.givenDate = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          '$userMaster.displayName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const AllLoan = await LoanMaster.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          required: false,
          model: LoanTransaction,
          attributes: ['EMIAmount', 'RefrenceId'],
          where: {
            RefrenceId: {
              [Sequelize.Op.ne]: null,
            },
          },
        },
        {
          model: LoanAdvance,
          attributes: ['Amount'],
        },
        {
          model: UserMaster,
          as: 'createdByUser',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'updatedByUser',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'userMaster',
          required: true,
          where: { ...userAccessCondition.where },
          include: [
            ...userAccessCondition.includeModels,
            {
              separate: true,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
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
              separate: true,
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
          model: companyMaster,
          as: 'companyMaster',
        },
      ],
    });

    const finalData = AllLoan.rows.map((loan) => {
      const transactionTotal =
        loan.loanTransactions?.reduce(
          (sum, transaction) => sum + Number(transaction.EMIAmount || 0),
          0,
        ) || 0;

      const advanceTotal =
        loan.loanAdvances?.reduce(
          (sum, advance) => sum + Number(advance.Amount || 0),
          0,
        ) || 0;

      const paidAmount = transactionTotal + advanceTotal;

      const remainingAmount = Number(loan.LoanAmount || 0) - paidAmount;

      const paidAdvance = advanceTotal;

      return {
        ...loan.toJSON(),
        paidEmi: loan.loanTransactions?.length,
        paidAmount,
        remainingAmount,
        paidAdvance,
      };
    });

    return res
      .status(200)
      .json({ status: 200, data: finalData, totalcount: AllLoan.count });
  } catch (err) {
    next(err);
  }
};

/*
 * delete loan master by loanID
 */

exports.postDeleteByLoanID = async (req, res, next) => {
  try {
    let { LoanID } = await req.body;

    const totalloaninst = await LoanTransaction.count({
      raw: true,
      where: {
        LoanID: LoanID,
        RefrenceId: {
          [Sequelize.Op.ne]: null,
        },
      },
    });

    const totalloanAdvance = await LoanAdvance.count({
      raw: true,
      where: {
        LoanID: LoanID,
      },
    });

    if (totalloaninst != 0) {
      return res.status(200).json({
        status: 401,
        message:
          "You can't delete this loan because it's some of installments are paid !!",
      });
    } else if (totalloanAdvance != 0) {
      return res.status(200).json({
        status: 401,
        message:
          "You can't delete this loan because it's some of installments are paid !!",
      });
    } else {
      sequelize.transaction(async (t) => {
        await LoanMaster.update(
          {
            status: 2,
          },
          {
            where: { LoanID: LoanID },
            transaction: t,
          },
        );

        await LoanTransaction.update(
          {
            status: 2,
          },
          {
            where: { LoanID: LoanID },
            transaction: t,
          },
        );
        await LoanAdvance.update(
          {
            status: 2,
          },
          {
            where: { LoanID: LoanID },
            transaction: t,
          },
        );

        await UserInbox.destroy(
          {
            where: {
              activityTable: LoanMaster.getTableName(),
              activityTablePK: LoanID,
            },
          },
          { transaction: t },
        );
      });
      return res.status(200).json({
        status: 200,
        message: message.usermessage.LoanMasterdatadeleted,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.postUpdateLoanMaster = async (req, res, next) => {
  try {
    let {
      LoanID,
      LoanAmount,
      LoanRemark,
      EMIMonths,
      startMonth,
      loanstatus,
      givenDate,
      paymentmode,
      referenceNO,
      referenceDate,
    } = await req.body;

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    const loanData = await LoanMaster.findOne({
      where: {
        LoanID,
      },
    });

    if (!loanData) {
      return res.status(statusCodes.NOT_FOUND).json({
        status: statusCodes.NOT_FOUND,
        message: message.usermessage.notFoundMessage('Loan Data'),
      });
    }

    const loanStartMonth = loanData.startMonth;

    if (+loanStartMonth != startMonth) {
      // Minimum allowed month = one month before givenDate
      const givenDateObj = moment(givenDate);

      const minimumStartMonth = givenDateObj
        .clone()
        .subtract(1, 'month')
        .format('YYYYMM');

      if (Number(startMonth) < Number(minimumStartMonth)) {
        return res.status(statusCodes.OK).json({
          status: statusCodes.BAD_REQUEST,
          message: `Start month cannot be before ${moment(minimumStartMonth, 'YYYYMM').format('MMMM YYYY')}.`,
        });
      }
    }

    let advanceAmount = await LoanAdvance.sum('Amount', {
      where: {
        LoanID: LoanID,
        type: advancePaymentType.ADVANCE,
      },
    });

    const totalMonthlyPrinciple = req.body.loanTransaction.reduce(
      (sum, item) => {
        return sum + (item.monthlyPrinciple || 0);
      },
      0,
    );

    advanceAmount = advanceAmount == null ? 0 : advanceAmount;

    if (LoanAmount != totalMonthlyPrinciple + advanceAmount) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.loanAmountNotMatch,
      });
    }

    await sequelize.transaction(async (t) => {
      const ids = req?.body?.loanTransaction
        ?.filter((item) => item.LoanTrasactionId !== null)
        .map((item) => item.LoanTrasactionId);

      const loanTransactionIds = (
        await LoanTransaction.findAll({
          attributes: ['LoanTrasactionId'],
          where: { LoanID: LoanID },
          raw: true,
        })
      ).map((t) => t.LoanTrasactionId);

      const removeLoanTransactionIds = loanTransactionIds.filter(
        (item) => !ids.includes(item),
      );
      await LoanTransaction.destroy({
        where: { LoanTrasactionId: removeLoanTransactionIds },
        transaction: t,
      });

      let change_data_status = await LoanMaster.update(
        {
          LoanAmount,
          LoanRemark,
          EMIMonths,
          startMonth,
          givenDate,
          loanstatus,
          paymentmode,
          referenceNO,
          referenceDate,
          updateBy,
          updateByIp,
        },
        {
          where: { LoanID: LoanID },
          transaction: t,
        },
      );

      var efftarray = [];
      for (var i = 0; i < req.body.loanTransaction.length; i++) {
        if (req.body.loanTransaction[i].LoanTrasactionId == null) {
          efftarray.push({
            LoanID: LoanID,
            RefrenceId: req.body.loanTransaction[i].RefrenceId,
            TableName: req.body.loanTransaction[i].TableName,
            BalAmount: req.body.loanTransaction[i].BalAmount,
            EMIAmount: req.body.loanTransaction[i].instamount,
            EMIMonth: req.body.loanTransaction[i].yearmonth,
            monthlyPrinciple: req.body.loanTransaction[i].monthlyPrinciple,
            monthlyInterest: req.body.loanTransaction[i].monthlyInterest,
            startDate: req.body.loanTransaction[i].startDate,
            endDate: req.body.loanTransaction[i].endDate,
            createBy: updateBy,
            createByIp: updateByIp,
          });
        } else {
          await LoanTransaction.update(
            {
              LoanID: LoanID,
              RefrenceId: req.body.loanTransaction[i].RefrenceId,
              TableName: req.body.loanTransaction[i].TableName,
              BalAmount: req.body.loanTransaction[i].BalAmount,
              EMIAmount: req.body.loanTransaction[i].instamount,
              EMIMonth: req.body.loanTransaction[i].yearmonth,
              monthlyPrinciple: req.body.loanTransaction[i].monthlyPrinciple,
              monthlyInterest: req.body.loanTransaction[i].monthlyInterest,
              startDate: req.body.loanTransaction[i].startDate,
              endDate: req.body.loanTransaction[i].endDate,
              updateBy: updateBy,
              updateByIp: updateByIp,
            },
            {
              where: {
                LoanTrasactionId: req.body.loanTransaction[i].LoanTrasactionId,
              },
              transaction: t,
            },
          );
        }
      }

      await LoanTransaction.bulkCreate(efftarray, {
        returning: true,
        transaction: t,
      });

      await UserInbox.destroy(
        {
          where: {
            activityTable: LoanMaster.getTableName(),
            activityTablePK: LoanID,
          },
        },
        { transaction: t },
      );

      res.status(200).json({
        status: 200,
        message: message.usermessage.LoanMasterupdate,
      });
      return change_data_status;
    });
  } catch (err) {
    next(err);
  }
};

exports.postAddAdvanceLoan = async (req, res, next) => {
  try {
    let = {
      LoanID,
      Amount,
      givenDate,
      paymentmode,
      refrenceNo,
      referenceDate,
      remarks,
    } = await req.body;
    const userUpdateBy = req.userDetails.userMasterId;
    const userUpdateByIp = req.userDetails.userIpAddress;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    await sequelize.transaction(async (t) => {
      let insert_db_status = await LoanAdvance.create(
        {
          LoanID,
          Amount,
          givenDate,
          paymentmode,
          refrenceNo,
          referenceDate,
          remarks,
          createBy,
          createByIp,
        },
        { transaction: t },
      );
      var change_data_status;

      let element = req.body.loanTransaction;
      element.updateBy = userUpdateBy;
      element.updateByIp = userUpdateByIp;
      for (var i = 0; i < element.length; i++) {
        let = {
          LoanTrasactionId,
          EMIAmount,
          EMIMonth,
          monthlyPrinciple,
          monthlyInterest,
          updateBy,
          updateByIp,
        } = element[i];
        await sequelize.transaction(async (t) => {
          change_data_status = await LoanTransaction.update(
            {
              EMIAmount,
              EMIMonth,
              monthlyPrinciple,
              monthlyInterest,
              updateBy,
              updateByIp,
            },
            {
              where: { LoanTrasactionId: LoanTrasactionId },
              transaction: t,
            },
          );
        });
      }

      res.status(200).json({
        status: 200,
        message: message.usermessage.LoanMasterupdate,
      });
      return change_data_status;
      // let insert_child_status = await LoanTransaction.bulkCreate(efftarray, { returning: true, transaction: t });
      // logger.info(`Loan master data inserted ${JSON.stringify(insert_db_status)}`);
      // res.status(200).json({status: 200, message: message.usermessage.LoanMasteradd})
    });
  } catch (err) {
    next(err);
  }
};

/*
 * Get AdvanceLoan By LoanId
 */
exports.getLoanAdvanceByLoanID = async (req, res, next) => {
  try {
    let getAdvanceData = await LoanAdvance.findAll({
      where: {
        LoanID: req.params.id,
      },
      order: [['LoanAdvanceID', 'ASC']],
    });

    if (!getAdvanceData) {
      res
        .status(200)
        .json({ status: 404, message: message.usermessage.LoanMasternotFound });
    } else {
      res.status(200).json({ status: 200, data: getAdvanceData });
    }
  } catch (err) {
    next(err);
  }
};

exports.getLoanByUserId = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      searchQuery,
      startdate,
      enddate,
      userMasterID,
      isExport,
    } = await req.body;
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const condition = {};
    condition.userMasterID = userMasterID;
    condition.status = [0, 1];

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          LoanRemark: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          LoanAmount: {
            [Sequelize.Op.eq]: searchQuery,
          },
        },
      ];

    if (startdate && enddate) {
      const start = new Date(startdate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(enddate);
      end.setHours(23, 59, 59, 999);

      condition.createdAt = {
        [Sequelize.Op.gte]: start,
        [Sequelize.Op.lte]: end,
      };
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const LoanData = await LoanMaster.findAndCountAll({
      where: condition,
      distinct: true,
      ...paginationQuery,
      order: [['createdAt', 'DESC']],
      include: [
        {
          required: false,
          model: LoanTransaction,
          attributes: ['EMIAmount', 'RefrenceId'],
          where: {
            RefrenceId: {
              [Sequelize.Op.ne]: null,
            },
          },
        },
        {
          model: LoanAdvance,
          attributes: ['Amount'],
        },
        {
          model: UserMaster,
          as: 'userMaster',
          required: true,
          where: { ...userAccessCondition.where },
          include: [
            ...userAccessCondition.includeModels,
            { model: companyMaster },
          ],
        },
        {
          model: LoanAuthorization,
          required: false,
          where: {
            status: 1,
          },
        },
        {
          model: UserMaster,
          attributes: ['displayName'],
          as: 'createdByUser',
        },
        {
          model: UserMaster,
          attributes: ['displayName'],
          as: 'updatedByUser',
        },
      ],
    });

    if (isExport) {
      const finaldata = LoanData.rows.map((data) => {
        const transactionTotal =
          data.loanTransactions?.reduce(
            (sum, transaction) => sum + Number(transaction.EMIAmount || 0),
            0,
          ) || 0;

        const advanceTotal =
          data.loanAdvances?.reduce(
            (sum, advance) => sum + Number(advance.Amount || 0),
            0,
          ) || 0;

        const paidAmount = transactionTotal + advanceTotal;

        const remainingAmount = Number(data.LoanAmount || 0) - paidAmount;

        const paidAdvance = advanceTotal;

        return {
          'Employee Name': data?.userMaster?.displayName,
          'Company Name': data?.userMaster?.companyMaster?.companyName,
          'Loan Remark': data?.LoanRemark,
          'Loan Date': data?.givenDate
            ? moment(data?.givenDate).format('DD-MM-YYYY')
            : '',
          'Loan Amount': data?.LoanAmount,
          'Payment Mode': data?.paymentmode || '',
          'Paid Amount': paidAmount,
          'Remaining Amount': remainingAmount,
          'Paid Advance': paidAdvance,
          'Paid EMI': data.loanTransactions?.length,
          'Created By': data?.createdByUser?.displayName,
          'Created At':
            moment(data?.createdAt).format('DD-MM-YYYY HH:mm') || '',
          'Updated By': data?.updatedByUser?.displayName,
          'Updated At':
            moment(data?.updatedAt).format('DD-MM-YYYY HH:mm') || '',
        };
      });
      return await generateExcel(finaldata, 'Loan', 'xlsx', res);
    }

    const finalData = LoanData.rows.map((loan) => {
      const transactionTotal =
        loan.loanTransactions?.reduce(
          (sum, transaction) => sum + Number(transaction.EMIAmount || 0),
          0,
        ) || 0;

      const advanceTotal =
        loan.loanAdvances?.reduce(
          (sum, advance) => sum + Number(advance.Amount || 0),
          0,
        ) || 0;

      const paidAmount = transactionTotal + advanceTotal;

      const remainingAmount = Number(loan.LoanAmount || 0) - paidAmount;

      const paidAdvance = advanceTotal;

      return {
        ...loan.toJSON(),
        paidEmi: loan.loanTransactions?.length,
        paidAmount,
        remainingAmount,
        paidAdvance,
      };
    });

    return res
      .status(200)
      .json({ status: 200, data: finalData, totalcount: LoanData.count });
  } catch (err) {
    next(err);
  }
};

exports.postloanmasteradd = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    let { companyMasterID, userMasterID, LoanAmount, LoanRemark } =
      await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const authorizationdetails = await FormAuthorizationDetails.findOne(
      {
        where: {
          AuthorizationMasterID: authorizationMasterTypes.loan,
          userMasterID,
          status: 1,
        },
        include: [
          {
            model: AuthorizationCriteriaMaster,
            attributes: ['AuthorizationCriteria'],
          },
        ],
      },
      { transaction: t },
    );

    const authorizationStatus =
      authorizationdetails && authorizationdetails.AuthorizationCriteriaMaster
        ? authorizationdetails.AuthorizationCriteriaMaster
            .AuthorizationCriteria == 'Sequeance No'
          ? 2
          : 1
        : 0;
    let insert_db_status = await LoanMaster.create(
      {
        companyMasterID,
        userMasterID,
        LoanAmount,
        LoanRemark,
        createBy,
        createByIp,
        authorizationStatus: authorizationStatus,
      },
      { transaction: t },
    );

    if (authorizationStatus != 0) {
      // user Details
      const userDetails = await UserMaster.findOne({
        where: {
          userMasterID,
        },
      });

      if (!userDetails) throw new Error('User not found!');

      // For Sequence No
      if (authorizationStatus == 2) {
        const authorizationData = await LoanAuthorization.create(
          {
            TableName: LoanMaster.getTableName(),
            LoanID: insert_db_status.LoanID,
            userMasterID: authorizationdetails.AuthorizedByUserMasterId[0],
            authstatus: 2,
          },
          { user: req.userDetails, transaction: t },
        );

        // Create UserInbox
        await UserInbox.create(
          {
            activityTable: LoanAuthorization.getTableName(),
            activityTablePK: authorizationData.toJSON().loanAuthorizationID,
            message: `${userDetails.displayName} has requested a Loan.`,
            assignedTo: authorizationdetails.AuthorizedByUserMasterId[0],
            assignedBy: userMasterID,
          },
          { user: req.userDetails, transaction: t },
        );

        const notification = {
          title: notificationTitleTypes.LOAN,
          body: userDetails.displayName + ' requested for a Loan.',
        };
        const data = {
          screen: notificationScreentTypes.LOAN,
          isScheduled: 'true',
          scheduledTime: new Date().toISOString(),
        };
        // send Notification
        await sendNotification(
          authorizationData.userMasterID,
          notification,
          data,
        );
      } else {
        // For Any
        for (
          let j = 0;
          j < authorizationdetails.AuthorizedByUserMasterId.length;
          j++
        ) {
          const authorizationData = await LoanAuthorization.create(
            {
              TableName: LoanMaster.getTableName(),
              LoanID: insert_db_status.LoanID,
              userMasterID: authorizationdetails.AuthorizedByUserMasterId[j],
              authstatus: 2,
            },
            { user: req.userDetails, transaction: t },
          );

          // Create UserInbox
          await UserInbox.create(
            {
              activityTable: LoanAuthorization.getTableName(),
              activityTablePK: authorizationData.toJSON().loanAuthorizationID,
              message: `${userDetails.displayName} has requested a Loan.`,
              assignedTo: authorizationdetails.AuthorizedByUserMasterId[j],
              assignedBy: userMasterID,
            },
            { user: req.userDetails, transaction: t },
          );

          const notification = {
            title: notificationTitleTypes.LOAN,
            body: userDetails.displayName + ' requested for a Loan.',
          };
          const data = {
            screen: notificationScreentTypes.LOAN,
            isScheduled: 'true',
            scheduledTime: new Date().toISOString(),
          };
          // send Notification
          await sendNotification(
            authorizationData.userMasterID,
            notification,
            data,
          );
        }
      }
    }
    await t.commit();

    res.status(200).json({ status: 200, message: 'data inserted' });
    return insert_db_status;
  } catch (err) {
    await t.rollback();
    next(err);
  }
};
//postStatusRequest

exports.postStatusrequest = async (req, res, next) => {
  try {
    let { LoanID, loanstatus, LoanRemark } = await req.body;
    let delete_status;
    let result = await sequelize.transaction(async (t) => {
      delete_status = await LoanMaster.update(
        {
          loanstatus: loanstatus,
          rejectionremarks: LoanRemark,
        },
        {
          where: {
            LoanID: LoanID,
          },
          transaction: t,
        },
      );

      await UserInbox.destroy(
        {
          where: {
            activityTable: LoanMaster.getTableName(),
            activityTablePK: LoanID,
          },
        },
        { transaction: t },
      );

      return res.status(200).json({ status: 200, message: '', data: {} });
    });
  } catch (err) {
    next(err);
  }
};

exports.loandatashow = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      companyMasterID,
      loanstatus,
      exportData,
      exportFileType,
      startdate,
      searchQuery,
      enddate,
    } = await req.body;
    let offset = (page - 1) * limit;

    const condition = {};

    if (companyMasterID) condition.companyMasterID = companyMasterID;

    if (loanstatus) condition.loanstatus = loanstatus;

    condition.status = 1;

    if (startdate && enddate) {
      condition.createdAt = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
    }

    const userSearchCondition = {};
    if (searchQuery)
      userSearchCondition[Sequelize.Op.or] = [
        { displayName: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
      ];
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const loanData = await LoanMaster.findAndCountAll({
      raw: true,
      limit: limit,
      offset: offset,
      order: [['createdAt', 'DESC']],
      where: condition,
      include: [
        {
          model: UserMaster,
          attributes: ['displayName', 'userNumber'],
          required: true,
          where: {
            ...userSearchCondition,
            ...userAccessCondition.includeModels,
          },
          include: [...userAccessCondition.includeModels],
        },
        { model: companyMaster, attributes: ['companyName'] },
      ],
    });

    async function processRow(row) {
      const designation = await employeeDesignation(
        row.userMasterID,
        new Date(),
      );
      const department = await employeeDepartment(row.userMasterID, new Date());
      const branch = await employeeBranch(row.userMasterID, new Date());
      return {
        UserName: row['userMaster.displayName'] || '',
        UserNumber: row['userMaster.userNumber'] || '',
        CompanyName: row['companyMaster.companyName'] || '',
        BranchName: branch ? branch['branchMaster.branchName'] : '',
        Designation: designation
          ? designation['designation.designationName']
          : '',
        Department: department ? department['department.departmentName'] : '',
        Status: checkStatus(row.loanstatus),
        LoanAmount: row.LoanAmount || '',
        LoanRemark: row.LoanRemark || '',
        EMIMonths: row.EMIMonths || '',
        StartMonth: row.startMonth || '',
        GivenDate: row.givenDate
          ? new Date(row.givenDate).toISOString().slice(0, 10)
          : '',
      };
    }

    function checkStatus(loanstatus) {
      if (loanstatus == 1) {
        return 'Approved';
      } else if (loanstatus == 2) {
        return 'Rejected';
      } else if (loanstatus == 0) {
        return 'Pending';
      } else {
        return '';
      }
    }

    if (exportData) {
      const updatedDownloadRows = await Promise.all(
        loanData.rows.map(processRow),
      );

      await generateExcel(
        updatedDownloadRows,
        'Company-Loan-Report',
        exportFileType,
        res,
      );
      return;
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Loan'),
      data: loanData.rows,
      totalCount: loanData.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.createDuePayment = async (req, res, next) => {
  try {
    const {
      LoanID,
      LoanTrasactionId,
      Amount,
      givenDate,
      paymentmode,
      refrenceNo,
      referenceDate,
      remarks,
    } = await req.body;

    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    await sequelize.transaction(async (t) => {
      const loanAdvance = await LoanAdvance.create(
        {
          LoanID,
          Amount,
          givenDate,
          paymentmode,
          refrenceNo,
          referenceDate,
          remarks,
          type: 'Due',
          createBy,
          createByIp,
        },
        { transaction: t },
      );

      await LoanTransaction.update(
        {
          loanAdvanceId: loanAdvance.LoanAdvanceID,
          updateBy: createBy,
          updateByIp: createByIp,
        },
        {
          where: { LoanTrasactionId },
          transaction: t,
        },
      );
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Due Payment'),
    });
  } catch (err) {
    next(err);
  }
};

exports.updateLoanById = async (req, res, next) => {
  try {
    const { LoanID, LoanRemark, LoanAmount } = await req.body;
    if (!LoanID) {
      return res.status(400).json({
        status: 400,
        message: message.usermessage.notFoundMessage('LoanID'),
      });
    }

    const loanData = await LoanMaster.findOne({
      where: { LoanID },
      include: [
        {
          model: LoanAuthorization,
          attributes: ['authstatus', 'userMasterID'],
        },
      ],
    });

    if (
      loanData.authorizationStatus == AuthorizationStatusType.APPROVED ||
      loanData.authorizationStatus == AuthorizationStatusType.REJECTED
    ) {
      return res.status(400).json({
        status: 400,
        message:
          'Loan cannot be updated as it is already approved or rejected by authorizer.',
      });
    }

    const cantEdit = loanData?.loanAuthorizationRequests?.some(
      (item) => item.authstatus == 1 || item.authstatus == 0,
    );

    if (cantEdit) {
      return res.status(400).json({
        status: 400,
        message:
          'Loan cannot be updated as it is already approved or rejected by authorizer.',
      });
    }

    await LoanMaster.update(
      {
        LoanAmount: LoanAmount,
        LoanRemark: LoanRemark,
      },
      {
        where: { LoanID },
      },
    );
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Loan'),
    });
  } catch (err) {
    next(err);
  }
};
