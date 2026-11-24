const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const UserWorkFromHome = require('../models/userWorkFromHome');
const WorkFromHomeAuthorization = require('../models/workFromHomeAuthorizations');
const {
  AuthorizationStatusType,
  AuthStatusInAuthorizationRequest,
  authorizationCriteriaType,
  notificationTitleTypes,
  notificationScreentTypes,
} = require('./dbUtils');
const userWorkFromHomeService = require('../services/userWorkFromHomeService');
const UserInbox = require('../models/UserInbox');
const UserExpenseTransaction = require('../models/userExpenseTransaction');
const UserExpense = require('../models/userExpense');
const ExpenseAuthorizationRequest = require('../models/expenseAuthorization');
const overTimeCalculation = require('../models/overTimeCalculation');
const OvertimeAuthorization = require('../models/overtimeAuthorization');
const coffMaster = require('../models/coffMaster');
const CompensatoryOffAuthorization = require('../models/compensatoryOffAuthorization');
const ExtraDays = require('../models/extraDays');
const ExtraDaysAuthorization = require('../models/extraDaysAuthorization');
const moment = require('moment');
const UserResignation = require('../models/resignation');
const ResignationAuth = require('../models/resignationAuthorization');
const EmployeeGatepass = require('../models/employeeGatepass');
const GatePassAuthorizationRequest = require('../models/gatePassAuthorization');
const AttendanceCorrectionRequest = require('../models/attendanceCorrectionRequest');
const AttendanceCorrectionAuthorization = require('../models/attendanceCorrectionAuthorization');
const UserLeave = require('../models/userleave');
const HrLeaveTypes = require('../models/hrLeaveTypes');
const LeaveAuthorizationRequest = require('../models/leaveAuthorization');
const ShortLeaveAuthorization = require('../models/shortLeaveAuthorization');
const UserShortLeave = require('../models/userShortLeave');
const ApprovedLeaveAuthorization = require('../models/approvedLeaveAuthorization');
const bankDetailRequestService = require('../services/bankDetailRequestService');
const BankDetailAuthorization = require('../models/bankDetailAuthorization');
const BankDetailRequest = require('../models/bankDetailRequest');
const ExpenseAdvanceRequest = require('../models/expenseAdvanceRequest');
const ExpenseAdvanceReqAuth = require('../models/expenseAdvanceReqAuth');
const LoanAuthorization = require('../models/loanAuthorizationRequest');
const LoanMaster = require('../models/loanMaster');
const ManPowerRequisitionRequest = require('../models/manPowerRequisitionRequest');
const ManPowerRequisitionAuthorization = require('../models/manPowerRequisitionAuthorization');
const toursMaster = require('../models/toursMaster');
const tourAuthorization = require('../models/tourAuthorization');
const Visit = require('../models/visit');
const VisitAuthorization = require('../models/visitAuthorization');
const SalaryIncrementRequest = require('../models/salaryIncrementRequest');
const SalaryIncrementRequestAuthorization = require('../models/salaryIncrementRequestAuthorization');
const Course = require('../models/course');
const CourseAuthorizationRequest = require('../models/courseAuthorization');
const { formatMonth } = require('./commonUtilFunctions');

//Work From Home Authorization
async function workFromHomeAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const workFromHomeData = await userWorkFromHomeService.getAllWorkFromHome(
    ['id', 'userMasterID', 'fromDate', 'toDate'],
    {
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
      userMasterID: {
        [Sequelize.Op.in]: userMasterID,
      },
    },
    [
      {
        model: UserMaster,
        attributes: ['userMasterID', 'displayName'],
      },
      {
        model: WorkFromHomeAuthorization,
        attributes: ['whAuthoriztaionid', 'userWorkFromHomeID', 'userMasterID'],
      },
    ],
  );

  //Collect user Work From Home IDS
  const userWorkFromHomeIDS = workFromHomeData.map((item) => item.id);

  const allWhAuthorizationIds = workFromHomeData.flatMap((item) =>
    item.workFromHomeAuthorizations.map((auth) => auth.whAuthoriztaionid),
  );

  await UserInbox.destroy(
    {
      where: {
        activityTable: WorkFromHomeAuthorization.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: allWhAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  await WorkFromHomeAuthorization.destroy(
    {
      where: {
        whAuthoriztaionid: {
          [Sequelize.Op.in]: allWhAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  await UserWorkFromHome.update(
    {
      authorizationStatus,
      AuthorizationCriteriaID,
      updateBy,
      updateByIp,
    },
    {
      where: {
        id: {
          [Sequelize.Op.in]: userWorkFromHomeIDS,
        },
      },
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
      validate: false,
    },
  );

  let WorkFromHomeAuthorizationData = [];
  for (const item of workFromHomeData) {
    for (const authItem of AuthorizedByUserMasterId) {
      WorkFromHomeAuthorizationData.push({
        userWorkFromHomeID: item.id,
        userMasterID: authItem,
        authStatus: AuthStatusInAuthorizationRequest.PENDING,
        status: 1,
        createBy: item.userMasterID,
        createByIp,
      });

      // break inner loop if criteria == 5
      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }

    payload = {
      notification: {
        title: notificationTitleTypes.WORKFROMHOME,
        body:
          item?.userMaster?.displayName + ' requested for a work from home.',
      },
      data: {
        screen: notificationScreentTypes.WORKFROMHOME,
      },
    };

    bulkNotificationObject.push({
      payload: payload,
      iosTokens: iosTokens,
      androidTokens: androidTokens,
    });
  }

  const workFromHomeAuthCreateData = await WorkFromHomeAuthorization.bulkCreate(
    WorkFromHomeAuthorizationData,
    { user: req.userDetails, individualHooks: true, transaction: transaction },
  );

  const workFromHomeInboxArray = workFromHomeAuthCreateData.map((item) => {
    const userWorkFromHomeData = workFromHomeData.find(
      (whitem) => whitem.id == item.userWorkFromHomeID,
    );

    return {
      activityTable: WorkFromHomeAuthorization.getTableName(),
      activityTablePK: item.whAuthoriztaionid,
      message: `${userWorkFromHomeData?.dataValues.userMaster?.dataValues?.displayName} has applied for Work from Home of date ${userWorkFromHomeData?.dataValues?.fromDate} to ${userWorkFromHomeData?.dataValues?.toDate ? userWorkFromHomeData?.dataValues?.toDate : userWorkFromHomeData?.dataValues?.fromDate}`,
      assignedTo: item?.userMasterID,
      assignedBy: userWorkFromHomeData?.dataValues?.userMasterID,
    };
  });

  await UserInbox.bulkCreate(workFromHomeInboxArray, {
    transaction: transaction,
  });

  return bulkNotificationObject;
}

async function expenseAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const userExpenseTransactions = await UserExpenseTransaction.findAll({
    attributes: [
      'userExpenseTransactionID',
      'userExpenseID',
      'authorizationStatus',
      'expenseAmount',
    ],
    where: {
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
      status: 1,
    },
    include: [
      {
        model: UserExpense,
        as: 'userExpense',
        attributes: ['userExpenseID', 'userMasterID'],
        where: {
          status: 1,
          userMasterID: { [Sequelize.Op.in]: userMasterID },
        },
        include: [
          {
            model: UserMaster,
            attributes: ['displayName'],
          },
        ],
      },
      {
        model: ExpenseAuthorizationRequest,
        as: 'Auth',
        attributes: ['AuthorizationRequestId'],
        where: {
          status: 1,
        },
        required: false,
      },
    ],
    transaction: transaction,
  });

  const userExpenseTransactionIDs = userExpenseTransactions.map((item) => {
    return item.userExpenseTransactionID;
  });

  const authIds = userExpenseTransactions.flatMap((item) =>
    item.Auth ? item.Auth.map((a) => a.AuthorizationRequestId) : [],
  );

  await UserInbox.destroy({
    where: {
      activityTable: UserExpense.getTableName(),
      activityTablePK: {
        [Sequelize.Op.in]: authIds,
      },
    },
    transaction: transaction,
  });

  await ExpenseAuthorizationRequest.destroy({
    where: {
      AuthorizationRequestId: {
        [Sequelize.Op.in]: authIds,
      },
    },
    transaction: transaction,
  });

  await UserExpenseTransaction.update(
    {
      authorizationStatus: authorizationStatus,
      updateBy,
      updateByIp,
      AuthorizationCriteriaID,
    },
    {
      where: {
        userExpenseTransactionID: {
          [Sequelize.Op.in]: userExpenseTransactionIDs,
        },
      },
      transaction: transaction,
    },
  );

  let expenseAuthorizationRequestObject = [];
  for (const item of userExpenseTransactions) {
    for (const authItem of AuthorizedByUserMasterId) {
      expenseAuthorizationRequestObject.push({
        ReferenceID: item.userExpenseTransactionID,
        userMasterID: authItem,
        status: 1,
        authstatus: AuthStatusInAuthorizationRequest.PENDING,
        createBy: item?.userExpense?.userMasterID,
        createByIp,
      });

      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }
  }

  const expenseAuthorizationAddedRequest =
    await ExpenseAuthorizationRequest.bulkCreate(
      expenseAuthorizationRequestObject,
      { transaction: transaction },
    );

  const userInboxArray = expenseAuthorizationAddedRequest.map((item) => {
    const userExpenseData = userExpenseTransactions.find(
      (uEitem) => uEitem.userExpenseTransactionID == item.ReferenceID,
    );
    return {
      activityTable: UserExpense.getTableName(),
      activityTablePK: item.AuthorizationRequestId,
      message: `${userExpenseData?.dataValues.userExpense?.dataValues?.userMaster?.dataValues?.displayName} has applied for Expense of ${userExpenseData?.dataValues?.expenseAmount}`,
      assignedTo: item?.userMasterID,
      assignedBy:
        userExpenseData?.dataValues?.userExpense?.dataValues?.userMasterID,
    };
  });

  await UserInbox.bulkCreate(userInboxArray, { transaction: transaction });

  return bulkNotificationObject;
}

async function expenseAdvanceRequestAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const findExpenseAdvanceReq = await ExpenseAdvanceRequest.findAll({
    where: {
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
      status: 1,
      userMasterID: { [Sequelize.Op.in]: userMasterID },
    },
    include: [
      {
        model: ExpenseAdvanceReqAuth,
        as: 'Auth',
        attributes: ['AuthReqId'],
        where: {
          status: 1,
        },
        required: false,
      },
      {
        model: UserMaster,
        attributes: ['displayName'],
      },
    ],
  });

  const expenseAdvanceRequestIDs = findExpenseAdvanceReq.map((item) => {
    return item.expenseAdvanceRequestID;
  });

  const authIds = findExpenseAdvanceReq.flatMap((item) =>
    item.Auth ? item.Auth.map((a) => a.AuthReqId) : [],
  );

  await UserInbox.destroy({
    where: {
      activityTable: ExpenseAdvanceReqAuth.getTableName(),
      activityTablePK: {
        [Sequelize.Op.in]: authIds,
      },
    },
    transaction: transaction,
  });

  await ExpenseAdvanceReqAuth.destroy({
    where: {
      AuthReqId: {
        [Sequelize.Op.in]: authIds,
      },
    },
    transaction: transaction,
  });

  await ExpenseAdvanceRequest.update(
    {
      authorizationStatus: authorizationStatus,
      updateBy,
      updateByIp,
      AuthorizationCriteriaID,
    },
    {
      where: {
        expenseAdvanceRequestID: {
          [Sequelize.Op.in]: expenseAdvanceRequestIDs,
        },
      },
      transaction: transaction,
    },
  );

  let expenseAuthorizationRequestObject = [];
  for (const item of findExpenseAdvanceReq) {
    for (const authItem of AuthorizedByUserMasterId) {
      expenseAuthorizationRequestObject.push({
        expenseAdvanceRequestID: item.expenseAdvanceRequestID,
        userMasterID: authItem,
        status: 1,
        authstatus: AuthStatusInAuthorizationRequest.PENDING,
        createBy: item?.userMasterID,
        createByIp,
      });

      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }
  }

  const expenseAuthorizationAddedRequest =
    await ExpenseAdvanceReqAuth.bulkCreate(expenseAuthorizationRequestObject, {
      transaction: transaction,
    });

  const userInboxArray = expenseAuthorizationAddedRequest.map((item) => {
    const userExpenseData = findExpenseAdvanceReq.find(
      (uEitem) =>
        uEitem.expenseAdvanceRequestID == item.expenseAdvanceRequestID,
    );
    return {
      activityTable: ExpenseAdvanceReqAuth.getTableName(),
      activityTablePK: item.AuthReqId,
      message: `${userExpenseData?.userMaster?.displayName} has appiled for Expense Advance of ${userExpenseData?.amount}`,
      assignedTo: item?.userMasterID,
      assignedBy: userExpenseData?.userMasterID,
    };
  });

  await UserInbox.bulkCreate(userInboxArray, { transaction: transaction });

  return bulkNotificationObject;
}

async function overtimeAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  let overTimeCalculationData = await overTimeCalculation.findAll({
    attributes: ['OverTimeID'],
    where: {
      UserMasterID: { [Sequelize.Op.in]: userMasterID },
      AuthorizationRequired: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
    },
    include: [
      {
        model: OvertimeAuthorization,
        attributes: ['AuthorizationRequestId'],
        where: {
          status: 1,
        },
        required: false,
      },
    ],
    transaction: transaction,
  });

  // Collect OverTimeIDs
  const overTimeIDS = overTimeCalculationData.map((item) => item.OverTimeID);

  // Collect AuthorizationRequestIds (flattened)
  const authorizationRequestIds = overTimeCalculationData.flatMap((item) =>
    item.overtimeAuthorizations.map((auth) => auth.AuthorizationRequestId),
  );

  await overTimeCalculation.update(
    {
      AuthorizationRequired: authorizationStatus,
      updateBy,
      updateByIp,
    },
    {
      where: {
        OverTimeID: { [Sequelize.Op.in]: overTimeIDS },
      },
      transaction: transaction,
    },
  );

  await OvertimeAuthorization.destroy(
    {
      where: {
        AuthorizationRequestId: authorizationRequestIds,
      },
    },
    { transaction: transaction },
  );

  let overTimeAuthorizationObject = [];
  for (const item of overTimeCalculationData) {
    for (const authItem of AuthorizedByUserMasterId) {
      overTimeAuthorizationObject.push({
        ReferenceID: item.OverTimeID,
        userMasterID: authItem,
        status: 1,
        authstatus: AuthStatusInAuthorizationRequest.PENDING,
        createBy: item.UserMasterID,
        createByIp,
      });

      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }
  }

  await OvertimeAuthorization.bulkCreate(overTimeAuthorizationObject, {
    transaction: transaction,
  });

  return bulkNotificationObject;
}

async function coffAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const coffData = await coffMaster.findAll({
    attributes: ['coffMasterID', 'LeaveCreatedDate'],
    where: {
      userMasterID: { [Sequelize.Op.in]: userMasterID },
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
      status: 1,
    },
    include: [
      {
        model: UserMaster,
        attributes: ['userMasterID', 'displayName'],
      },

      {
        model: CompensatoryOffAuthorization,
        attributes: ['CompensatoryOffAuthorizationID'],
        where: {
          status: 1,
        },
        required: false,
      },
    ],
    transaction: transaction,
  });

  // Collect OverTimeIDs
  const coffMasterIDS = coffData.map((item) => item.coffMasterID);

  // Collect compensatoryOffAuthorizationRequestIds (flattened)
  const compensatoryOffAuthorizationIds = coffData.flatMap((item) =>
    item.compensatoryOffAuthorizations.map(
      (auth) => auth.CompensatoryOffAuthorizationID,
    ),
  );

  await coffMaster.update(
    {
      authorizationStatus: authorizationStatus,
      updateBy,
      updateByIp,
    },
    {
      where: {
        coffMasterID: {
          [Sequelize.Op.in]: coffMasterIDS,
        },
      },
      transaction: transaction,
    },
  );

  await UserInbox.destroy(
    {
      where: {
        activityTable: CompensatoryOffAuthorization.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: compensatoryOffAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  await CompensatoryOffAuthorization.destroy(
    {
      where: {
        CompensatoryOffAuthorizationID: {
          [Sequelize.Op.in]: compensatoryOffAuthorizationIds,
        },
      },
    },
    {
      user: req.userDetails,
      individualHooks: true,
      transaction: transaction,
    },
  );

  let compensatoryOffAuthorizationObject = [];
  for (const item of coffData) {
    for (const authItem of AuthorizedByUserMasterId) {
      compensatoryOffAuthorizationObject.push({
        TableName: coffMaster.getTableName(),
        coffMasterID: item.coffMasterID,
        userMasterID: authItem,
        status: 1,
        authstatus: AuthStatusInAuthorizationRequest.PENDING,
        createBy: item.UserMasterID,
        createByIp,
      });

      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }

    payload = {
      notification: {
        title: notificationTitleTypes.COMPENSATORYOFF,
        body:
          item?.userMaster?.displayName + ' requested for Compensatory Off.',
      },
      data: {
        screen: notificationScreentTypes.COMPENSATORYOFF,
      },
    };

    bulkNotificationObject.push({
      payload: payload,
      iosTokens: iosTokens,
      androidTokens: androidTokens,
    });
  }

  const compensatoryOffAuthorizationBluckCreateData =
    await CompensatoryOffAuthorization.bulkCreate(
      compensatoryOffAuthorizationObject,
      {
        user: req.userDetails,
        individualHooks: true,
        transaction: transaction,
      },
    );

  const userInboxArray = compensatoryOffAuthorizationBluckCreateData.map(
    (item) => {
      const coffObjectData = coffData.find(
        (cooffItem) => cooffItem.coffMasterID == item.coffMasterID,
      );

      return {
        activityTable: CompensatoryOffAuthorization.getTableName(),
        activityTablePK: item.CompensatoryOffAuthorizationID,
        message: `${coffObjectData?.dataValues.userMaster?.dataValues?.displayName} has requested for Compensatory Off for ${moment(
          coffObjectData?.dataValues?.LeaveCreatedDate,
        ).format('DD/MM/YYYY')}`,
        assignedTo: item?.userMasterID,
        assignedBy: coffObjectData?.dataValues?.userMasterID,
      };
    },
  );

  await UserInbox.bulkCreate(userInboxArray, { transaction: transaction });

  return bulkNotificationObject;
}

async function extraDaysAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const extraDaysData = await ExtraDays.findAll({
    attributes: ['extraDaysID', 'userMasterID', 'authorizationStatus', 'date'],
    where: {
      userMasterID: { [Sequelize.Op.in]: userMasterID },
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
    },
    include: [
      {
        model: UserMaster,
        attributes: ['userMasterID', 'displayName'],
      },
      {
        model: ExtraDaysAuthorization,
        attributes: ['extraDaysAuthorizationID'],
        required: false,
      },
    ],
    transaction: transaction,
  });

  // Collect extraDaysIDs
  const extraDayIDS = extraDaysData.map((item) => item.extraDaysID);

  // Collect extraDaysAuthorizationIDs (flattened)
  const extraDaysAuthorizationIDs = extraDaysData.flatMap((item) =>
    item.extraDaysAuthorizations.map((auth) => auth.extraDaysAuthorizationID),
  );

  await ExtraDays.update(
    {
      authorizationStatus: authorizationStatus,
      updateBy,
      updateByIp,
    },
    {
      where: {
        extraDaysID: {
          [Sequelize.Op.in]: extraDayIDS,
        },
      },
      transaction: transaction,
    },
  );

  await UserInbox.destroy(
    {
      where: {
        activityTable: ExtraDaysAuthorization.getTableName(),
        activityTablePK: extraDaysAuthorizationIDs,
      },
    },
    { transaction: transaction },
  );

  await ExtraDaysAuthorization.destroy(
    {
      where: {
        extraDaysAuthorizationID: extraDaysAuthorizationIDs,
      },
    },
    { transaction: transaction },
  );

  let extraDaysAuthorizationObject = [];
  for (const item of extraDaysData) {
    for (const authItem of AuthorizedByUserMasterId) {
      extraDaysAuthorizationObject.push({
        extraDaysID: item.extraDaysID,
        userMasterID: authItem,
        authstatus: AuthStatusInAuthorizationRequest.PENDING,
        createBy: item.UserMasterID,
        createByIp,
      });

      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }

    payload = {
      notification: {
        title: notificationTitleTypes.EXTRADAYS,
        body: item?.userMaster?.displayName + ' requested for Extra Days.',
      },
      data: {
        screen: notificationScreentTypes.EXTRADAYS,
      },
    };

    bulkNotificationObject.push({
      payload: payload,
      iosTokens: iosTokens,
      androidTokens: androidTokens,
    });
  }

  const extraDaysAuthorizationBulkCreateData =
    await ExtraDaysAuthorization.bulkCreate(extraDaysAuthorizationObject, {
      user: req.userDetails,
      individualHooks: true,
      transaction: transaction,
    });

  const extraDaysUserInboxArray = extraDaysAuthorizationBulkCreateData.map(
    (item) => {
      const extraDayData = extraDaysData.find(
        (extraDayItem) => extraDayItem.extraDaysID == item.extraDaysID,
      );

      return {
        activityTable: ExtraDaysAuthorization.getTableName(),
        activityTablePK: item.extraDaysAuthorizationID,
        message: `${
          extraDayData?.dataValues?.userMaster?.dataValues?.displayName
        } has requested for Extra Days for ${moment(extraDayData.date).format(
          'DD/MM/YYYY',
        )}`,
        assignedTo: item.userMasterID,
        assignedBy: extraDayData?.dataValues?.userMasterID,
      };
    },
  );

  await UserInbox.bulkCreate(extraDaysUserInboxArray, {
    transaction: transaction,
  });

  return bulkNotificationObject;
}

async function resignationAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const userResignationData = await UserResignation.findAll({
    attributes: ['resignationID', 'userMasterID', 'appliedDate'],
    where: {
      userMasterID: userMasterID,
      authorizationstatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
    },
    include: [
      {
        model: UserMaster,
        as: 'employee',
        attributes: ['userMasterID', 'displayName'],
      },
      {
        model: ResignationAuth,
        attributes: ['AuthorizationRequestId', 'ReferenceID', 'userMasterID'],
      },
    ],
    transaction: transaction,
  });

  // Collect OverTimeIDs
  const userResignatioIDS = userResignationData.map(
    (item) => item.resignationID,
  );

  // Collect userResignationAuthorizatioIds (flattened)
  const userResignationAuthorizationIds = userResignationData.flatMap((item) =>
    item.resignationAuthorizations.map((auth) => auth.AuthorizationRequestId),
  );

  await UserResignation.update(
    {
      authorizationstatus: authorizationStatus,
      updateBy,
      updateByIp,
    },
    {
      where: {
        resignationID: {
          [Sequelize.Op.in]: userResignatioIDS,
        },
      },
      transaction: transaction,
    },
  );

  await ResignationAuth.destroy({
    where: {
      AuthorizationRequestId: {
        [Sequelize.Op.in]: userResignationAuthorizationIds,
      },
    },
    transaction: transaction,
  });

  await UserInbox.destroy(
    {
      where: {
        activityTable: ResignationAuth.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: userResignationAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  let resignationAuthObject = [];
  for (const item of userResignationData) {
    for (const authItem of AuthorizedByUserMasterId) {
      resignationAuthObject.push({
        ReferenceID: item.resignationID,
        userMasterID: authItem,
        status: 1,
        authstatus: AuthStatusInAuthorizationRequest.PENDING,
        createBy: item.userMasterID,
        createByIp,
      });

      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }

    payload = {
      notification: {
        title: notificationTitleTypes.RESIGANTION,
        body: item?.employee?.displayName + ' applied for Resignation.',
      },
      data: {
        screen: notificationScreentTypes.RESIGANTION,
      },
    };

    bulkNotificationObject.push({
      payload: payload,
      iosTokens: iosTokens,
      androidTokens: androidTokens,
    });
  }

  const resigantionAuthorozationBulkCreateData =
    await ResignationAuth.bulkCreate(resignationAuthObject, {
      transaction: transaction,
    });

  const resignationInboxArray = resigantionAuthorozationBulkCreateData.map(
    (item) => {
      const resignationObjectData = userResignationData.find(
        (resignationItem) => resignationItem.resignationID == item.ReferenceID,
      );

      return {
        activityTable: ResignationAuth.getTableName(),
        activityTablePK: item.AuthorizationRequestId,
        message: `${
          resignationObjectData?.dataValues?.employee?.dataValues?.displayName
        } has applied Resignation.`,
        assignedTo: item.userMasterID,
        assignedBy: resignationObjectData?.dataValues?.userMasterID,
      };
    },
  );

  await UserInbox.bulkCreate(resignationInboxArray, {
    transaction: transaction,
  });
  return bulkNotificationObject;
}

async function getPassAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const gatePassData = await EmployeeGatepass.findAll({
    attributes: ['id', 'date', 'userMasterId',  'reqCheckInOutType'],
    where: {
      userMasterId: { [Sequelize.Op.in]: userMasterID },
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
      status: 'Pending',
    },
    include: [
      {
        model: UserMaster,
        as: 'employee',
        attributes: ['userMasterID', 'displayName'],
      },
      {
        model: GatePassAuthorizationRequest,
        attributes: ['AuthorizationRequestId'],
      },
    ],
  });

  const getPassIDS = gatePassData.map((item) => item.id);

  // Collect gatePassAuthorizations (flattened)
  const gatePassAuthorizationIDs = gatePassData.flatMap((item) =>
    item.gatePassAuthorizations.map((auth) => auth.AuthorizationRequestId),
  );

  await EmployeeGatepass.update(
    {
      authorizationStatus: authorizationStatus,
      updateBy,
      updateByIp,
    },
    {
      where: {
        id: { [Sequelize.Op.in]: getPassIDS },
      },
      transaction: transaction,
    },
  );

  await UserInbox.destroy(
    {
      where: {
        activityTable: GatePassAuthorizationRequest.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: gatePassAuthorizationIDs,
        },
      },
    },
    { transaction: transaction },
  );

  await GatePassAuthorizationRequest.destroy(
    {
      where: {
        AuthorizationRequestId: {
          [Sequelize.Op.in]: gatePassAuthorizationIDs,
        },
      },
    },
    { transaction: transaction },
  );

  let employeeGatePassAuthorizationObject = [];
  for (const item of gatePassData) {
    for (const authItem of AuthorizedByUserMasterId) {
      employeeGatePassAuthorizationObject.push({
        TableName: 'EmployeeGatePass',
        ReferenceID: item.id,
        userMasterID: authItem,
        status: 1,
        authstatus: AuthStatusInAuthorizationRequest.PENDING,
        createBy: item.userMasterId,
        createByIp,
        checkInOutType: null,
      });

      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }

    payload = {
      notification: {
        title: notificationTitleTypes.EMPLOYEEGATEPASS,
        body: item?.employee?.displayName + ' requested for GatePass.',
      },
      data: {
        screen: notificationScreentTypes.EMPLOYEEGATEPASS,
      },
    };

    bulkNotificationObject.push({
      payload: payload,
      iosTokens: iosTokens,
      androidTokens: androidTokens,
    });
  }

  const gatePassAuthorizationBulkAddData =
    await GatePassAuthorizationRequest.bulkCreate(
      employeeGatePassAuthorizationObject,
      { transaction: transaction },
    );

  const userInboxArray = gatePassAuthorizationBulkAddData.map((item) => {
    const gatePassObjectData = gatePassData.find(
      (gatePassItem) => gatePassItem.id == item.ReferenceID,
    );

    return {
      activityTable: GatePassAuthorizationRequest.getTableName(),
      activityTablePK: item.AuthorizationRequestId,
      message: `${
        gatePassObjectData?.dataValues?.employee?.dataValues?.displayName
      } has applied for GatePass request ${moment(
        gatePassObjectData?.dataValues?.date,
      ).format('DD/MM/YYYY')} `,
      assignedTo: item?.userMasterID,
      assignedBy: gatePassObjectData?.dataValues?.userMasterId,
    };
  });

  await UserInbox.bulkCreate(userInboxArray, { transaction: transaction });
  return bulkNotificationObject;
}

async function attendanceCorrectionAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const attendaceCorrectionData = await AttendanceCorrectionRequest.findAll({
    attributes: [
      'attendanceCorrectionRequestId',
      'AttendanceDate',
      'userMasterID',
    ],
    where: {
      userMasterID: { [Sequelize.Op.in]: userMasterID },
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
      status: 1,
    },
    include: [
      {
        model: UserMaster,
        as: 'employee',
        attributes: ['userMasterID', 'displayName'],
      },
      {
        model: AttendanceCorrectionAuthorization,
        attributes: ['id'],
      },
    ],
  });

  //Collect Attendance correction IDS
  const attendanceCorrectionRequestIDS = attendaceCorrectionData.map(
    (item) => item.attendanceCorrectionRequestId,
  );

  // Collect attendanceCorrectionAuthorizationIds (flattened)
  const attendanceCorrectionAuthorizationIds = attendaceCorrectionData.flatMap(
    (item) => item.attendanceCorrectionAuthorizations.map((auth) => auth.id),
  );

  await AttendanceCorrectionRequest.update(
    {
      authorizationStatus: authorizationStatus,
      updateBy,
      updateByIp,
    },
    {
      where: {
        attendanceCorrectionRequestId: {
          [Sequelize.Op.in]: attendanceCorrectionRequestIDS,
        },
      },
      user: req.userDetails,
      individualHooks: true,
      transaction: transaction,
    },
  );

  await UserInbox.destroy(
    {
      where: {
        activityTable: AttendanceCorrectionAuthorization.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: attendanceCorrectionAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  await AttendanceCorrectionAuthorization.destroy(
    {
      where: {
        id: {
          [Sequelize.Op.in]: attendanceCorrectionAuthorizationIds,
        },
      },
    },
    {
      user: req.userDetails,
      individualHooks: true,
      transaction: transaction,
    },
  );

  let attendanceCorrectionAuthorizationObject = [];
  for (const item of attendaceCorrectionData) {
    for (const authItem of AuthorizedByUserMasterId) {
      attendanceCorrectionAuthorizationObject.push({
        attendanceCorrectionRequestId: item.attendanceCorrectionRequestId,
        userMasterID: authItem,
        status: 1,
        authStatus: AuthStatusInAuthorizationRequest.PENDING,
        createBy: item.userMasterID,
        createByIp,
      });

      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }

    payload = {
      notification: {
        title: notificationTitleTypes.ATTENDANCECORRECTION,
        body:
          item?.employee?.displayName +
          ' requested for an attendance correction.',
      },
      data: {
        screen: notificationScreentTypes.ATTENDANCECORRECTION,
      },
    };

    bulkNotificationObject.push({
      payload: payload,
      iosTokens: iosTokens,
      androidTokens: androidTokens,
    });
  }

  const attendanceBulkCreateData =
    await AttendanceCorrectionAuthorization.bulkCreate(
      attendanceCorrectionAuthorizationObject,
      { transaction: transaction },
    );

  const userInboxArray = attendanceBulkCreateData.map((item) => {
    const attendanceCorrectionObjectData = attendaceCorrectionData.find(
      (attendanceCorrectionItem) =>
        attendanceCorrectionItem.attendanceCorrectionRequestId ==
        item.attendanceCorrectionRequestId,
    );

    return {
      activityTable: AttendanceCorrectionAuthorization.getTableName(),
      activityTablePK: item.id,
      message: `${
        attendanceCorrectionObjectData?.dataValues?.employee?.dataValues
          ?.displayName
      } has requested an attendance correction for ${moment(
        attendanceCorrectionObjectData.AttendanceDate,
      ).format('DD/MM/YYYY')}.`,
      assignedTo: item.userMasterID,
      assignedBy: attendanceCorrectionObjectData?.dataValues?.userMasterID,
    };
  });

  await UserInbox.bulkCreate(userInboxArray, { transaction: transaction });
  return bulkNotificationObject;
}

async function leaveAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const leaveData = await UserLeave.findAll({
    attributes: [
      'UserLeaveApplicationID',
      'userMasterID',
      'FromDate',
      'ToDate',
    ],
    where: {
      userMasterID: { [Sequelize.Op.in]: userMasterID },
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
      status: 1,
    },
    include: [
      {
        model: HrLeaveTypes,
        attributes: ['LeaveID'],
      },
      {
        model: UserMaster,
        attributes: ['userMasterID', 'displayName'],
      },
      {
        model: LeaveAuthorizationRequest,
        attributes: ['AuthorizationRequestId', 'TableName', 'ReferenceID'],
      },
    ],
  });

  //Collect user leavs IDS
  const userLeavesIDS = leaveData.map((item) => item.UserLeaveApplicationID);

  // Collect LeaveAuthorizationIds (flattened)
  const leaveAuthorizationIds = leaveData.flatMap((item) =>
    item.leaveAuthorizations.map((auth) => auth.AuthorizationRequestId),
  );

  await UserLeave.update(
    {
      authorizationStatus: authorizationStatus,
      AuthorizationCriteriaID,
      updateBy,
      updateByIp,
    },
    {
      where: {
        UserLeaveApplicationID: { [Sequelize.Op.in]: userLeavesIDS },
      },
      transaction: transaction,
    },
  );

  await UserInbox.destroy(
    {
      where: {
        activityTable: {
          [Sequelize.Op.in]: [
            'outdoorDutyAuthorizations',
            'leaveAuthorizations',
          ],
        },
        activityTablePK: {
          [Sequelize.Op.in]: leaveAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  await ApprovedLeaveAuthorization.destroy(
    {
      where: {
        UserLeaveApplicationID: {
          [Sequelize.Op.in]: userLeavesIDS,
        },
      },
    },
    {
      transaction,
    },
  );

  await LeaveAuthorizationRequest.destroy(
    {
      where: {
        AuthorizationRequestId: {
          [Sequelize.Op.in]: leaveAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  let leaveAuthorizationObject = [];
  for (const item of leaveData) {
    for (const authItem of AuthorizedByUserMasterId) {
      leaveAuthorizationObject.push({
        TableName: 'userLeaves',
        ReferenceID: item.UserLeaveApplicationID,
        userMasterID: authItem,
        status: 1,
        authstatus: AuthStatusInAuthorizationRequest.PENDING,
        createBy: item.userMasterID,
        createByIp,
      });

      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }

    const type =
      item.hrLeaveType.LeaveID == 25
        ? notificationTitleTypes.OUTDOORDUTY
        : notificationTitleTypes.LEAVE;

    payload = {
      notification: {
        title: type,
        body: item?.userMaster?.displayName + ` requested for ${type} .`,
      },
      data: {
        screen:
          type == notificationTitleTypes.OUTDOORDUTY
            ? notificationScreentTypes.OUTDOORDUTY
            : notificationScreentTypes.LEAVE,
      },
    };

    bulkNotificationObject.push({
      payload: payload,
      iosTokens: iosTokens,
      androidTokens: androidTokens,
    });
  }

  const LeaveAuthorizationRequestBulkCreateData =
    await LeaveAuthorizationRequest.bulkCreate(leaveAuthorizationObject, {
      transaction: transaction,
    });

  const userInboxArray = LeaveAuthorizationRequestBulkCreateData.map((item) => {
    const leaveObjectData = leaveData.find(
      (leaveItem) => leaveItem.UserLeaveApplicationID == item.ReferenceID,
    );

    const type =
      leaveObjectData?.dataValues?.hrLeaveType?.dataValues?.LeaveID == 25
        ? notificationTitleTypes.OUTDOORDUTY
        : notificationTitleTypes.LEAVE;

    const tableName =
      leaveObjectData?.dataValues?.hrLeaveType?.dataValues?.LeaveID == 25
        ? 'outdoorDutyAuthorizations'
        : 'leaveAuthorizations';

    return {
      activityTable: tableName,
      activityTablePK: item.AuthorizationRequestId,
      message: `${
        leaveObjectData?.dataValues?.userMaster?.dataValues?.displayName
      } has applied for ${type} request from ${moment(
        leaveObjectData?.dataValues?.FromDate,
      ).format('DD/MM/YYYY')} to ${moment(
        leaveObjectData?.dataValues?.ToDate,
      ).format('DD/MM/YYYY')}`,
      assignedTo: item.userMasterID,
      assignedBy: leaveObjectData?.dataValues?.userMasterID,
    };
  });

  await UserInbox.bulkCreate(userInboxArray, { transaction: transaction });

  return bulkNotificationObject;
}

async function shortLeaveAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const allShortLeave = await UserShortLeave.findAll({
    attributes: ['userShortLeaveId', 'date', 'userMasterID'],
    where: {
      userMasterID: {
        [Sequelize.Op.in]: userMasterID,
      },
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
    },
    include: [
      {
        model: UserMaster,
        attributes: ['userMasterID', 'displayName'],
      },
      {
        model: ShortLeaveAuthorization,
        attributes: ['id'],
      },
    ],
  });

  //Collect short leave IDS
  const shortLeaveIDS = allShortLeave.map((item) => item.userShortLeaveId);

  // Collect shortleaveAuthorizationIds (flattened)
  const shortLeaveAuthorizationIds = allShortLeave.flatMap((item) =>
    item.shortLeaveAuthorizations.map((auth) => auth.id),
  );

  await UserShortLeave.update(
    {
      authorizationStatus,
    },
    {
      where: {
        userShortLeaveId: {
          [Sequelize.Op.in]: shortLeaveIDS,
        },
      },
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    },
  );

  await UserInbox.destroy({
    where: {
      activityTable: ShortLeaveAuthorization.getTableName(),
      activityTablePK: {
        [Sequelize.Op.in]: shortLeaveAuthorizationIds,
      },
    },
    transaction: transaction,
  });

  // Delete All User Short Leave Authorization
  await ShortLeaveAuthorization.destroy({
    where: {
      id: {
        [Sequelize.Op.in]: shortLeaveAuthorizationIds,
      },
    },
    hooks: false,
    transaction: transaction,
  });

  let shortLeaveAuthorizationObject = [];
  for (const item of allShortLeave) {
    for (const authItem of AuthorizedByUserMasterId) {
      shortLeaveAuthorizationObject.push({
        referenceId: item.userShortLeaveId,
        userMasterID: authItem,
        status: 1,
        authstatus: AuthStatusInAuthorizationRequest.PENDING,
      });

      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }

    payload = {
      notification: {
        title: notificationTitleTypes.SHORTLEAVE,
        body: item?.userMaster?.displayName + ' requested for a Short Leave.',
      },
      data: {
        screen: notificationScreentTypes.SHORTLEAVE,
      },
    };

    bulkNotificationObject.push({
      payload: payload,
      iosTokens: iosTokens,
      androidTokens: androidTokens,
    });
  }

  const shortLeaveAuthorizationBulkCreateObject =
    await ShortLeaveAuthorization.bulkCreate(shortLeaveAuthorizationObject, {
      user: req.userDetails,
      individualHooks: true,
      transaction: transaction,
    });

  const shortLeaveUserInboxArray = shortLeaveAuthorizationBulkCreateObject.map(
    (item) => {
      const shortLeaveObjectData = allShortLeave.find(
        (shortLeaveItem) => shortLeaveItem.userShortLeaveId == item.referenceId,
      );

      return {
        activityTable: ShortLeaveAuthorization.getTableName(),
        activityTablePK: item.id,
        message: `${
          shortLeaveObjectData?.dataValues?.userMaster?.dataValues?.displayName
        } has requested a Short Leave for ${moment(
          shortLeaveObjectData?.dataValues?.date,
        ).format('DD/MM/YYYY')}.`,
        assignedTo: item.userMasterID,
        assignedBy: shortLeaveObjectData?.dataValues?.userMasterID,
      };
    },
  );

  await UserInbox.bulkCreate(shortLeaveUserInboxArray, {
    transaction: transaction,
  });

  return bulkNotificationObject;
}

async function bankDetailRequestAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const bankDetailRequestData =
    await bankDetailRequestService.getAllBankDetailRequest(
      ['bankDetailRequestId', 'userMasterID'],
      {
        authorizationStatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PENDING_ZERO,
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        userMasterID: {
          [Sequelize.Op.in]: userMasterID,
        },
      },
      [
        {
          model: UserMaster,
          attributes: ['userMasterID', 'displayName'],
        },
        {
          model: BankDetailAuthorization,
          attributes: [
            'bankDetailAuthorizationId',
            'bankDetailRequestId',
            'userMasterID',
          ],
        },
      ],
    );

  //Collect Bank Detail Request IDS
  const bankDetailRequestIDS = bankDetailRequestData.map(
    (item) => item.bankDetailRequestId,
  );

  const allbankDetailAuthorizationIds = bankDetailRequestData.flatMap((item) =>
    item.bankDetailAuthorizations.map((auth) => auth.bankDetailAuthorizationId),
  );

  await UserInbox.destroy(
    {
      where: {
        activityTable: BankDetailAuthorization.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: allbankDetailAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  await BankDetailAuthorization.destroy(
    {
      where: {
        bankDetailAuthorizationId: {
          [Sequelize.Op.in]: allbankDetailAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  await BankDetailRequest.update(
    {
      authorizationStatus,
      AuthorizationCriteriaID,
      updateBy,
      updateByIp,
    },
    {
      where: {
        bankDetailRequestId: {
          [Sequelize.Op.in]: bankDetailRequestIDS,
        },
      },
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
      validate: false,
    },
  );

  let bankDetailAuthorizationData = [];
  for (const item of bankDetailRequestData) {
    for (const authItem of AuthorizedByUserMasterId) {
      bankDetailAuthorizationData.push({
        bankDetailRequestId: item.bankDetailRequestId,
        userMasterID: authItem,
        authStatus: AuthStatusInAuthorizationRequest.PENDING,
        status: 1,
        createBy: item.userMasterID,
        createByIp,
      });

      // break inner loop if criteria == 5
      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }

    payload = {
      notification: {
        title: notificationTitleTypes.BANKDETAIL,
        body:
          item?.userMaster?.displayName +
          ' requested for a Bank Detail udpate.',
      },
      data: {
        screen: notificationScreentTypes.BANKDETAIL,
      },
    };

    bulkNotificationObject.push({
      payload: payload,
      iosTokens: iosTokens,
      androidTokens: androidTokens,
    });
  }

  const bankDetailAuthCreateData = await BankDetailAuthorization.bulkCreate(
    bankDetailAuthorizationData,
    { user: req.userDetails, individualHooks: true, transaction: transaction },
  );

  const bankDetailRequestInboxArray = bankDetailAuthCreateData.map((item) => {
    const bankDetailRequestDatas = bankDetailRequestData.find(
      (bditem) => bditem.bankDetailRequestId == item.bankDetailRequestId,
    );

    return {
      activityTable: BankDetailAuthorization.getTableName(),
      activityTablePK: item.bankDetailAuthorizationId,
      message: `${bankDetailRequestDatas?.dataValues.userMaster?.dataValues?.displayName} has applied bank detail update`,
      assignedTo: item?.userMasterID,
      assignedBy: bankDetailRequestDatas?.dataValues?.userMasterID,
    };
  });

  await UserInbox.bulkCreate(bankDetailRequestInboxArray, {
    transaction: transaction,
  });

  return bulkNotificationObject;
}

async function loanRequestAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const loanRequestData = await LoanMaster.findAll({
    attributes: ['LoanID', 'userMasterID'],
    where: {
      userMasterID: {
        [Sequelize.Op.in]: userMasterID,
      },
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
    },
    include: [
      {
        model: UserMaster,
        attributes: ['userMasterID', 'displayName'],
      },
      {
        model: LoanAuthorization,
        attributes: ['loanAuthorizationID'],
      },
    ],
  });

  //Collect Bank Detail Request IDS
  const loanRequestIDS = loanRequestData.map((item) => item.LoanID);

  const allLoanAuthorizationIds = loanRequestData.flatMap((item) =>
    item.loanAuthorizationRequests.map((auth) => auth.loanAuthorizationID),
  );

  await UserInbox.destroy(
    {
      where: {
        activityTable: LoanAuthorization.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: allLoanAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  await LoanAuthorization.destroy(
    {
      where: {
        loanAuthorizationID: {
          [Sequelize.Op.in]: allLoanAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  await LoanMaster.update(
    {
      authorizationStatus,
      updateBy,
      updateByIp,
    },
    {
      where: {
        LoanID: {
          [Sequelize.Op.in]: loanRequestIDS,
        },
      },
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
      validate: false,
    },
  );

  let loanAuthorizationData = [];
  for (const item of loanRequestData) {
    for (const authItem of AuthorizedByUserMasterId) {
      loanAuthorizationData.push({
        LoanID: item.LoanID,
        userMasterID: authItem,
        authstatus: AuthStatusInAuthorizationRequest.PENDING,
        status: 1,
        createBy: item.userMasterID,
        createByIp,
      });

      // break inner loop if criteria == 5
      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }

    payload = {
      notification: {
        title: notificationTitleTypes.LOAN,
        body: item?.userMaster?.displayName + ' requested for a Loan udpate.',
      },
      data: {
        screen: notificationScreentTypes.LOAN,
      },
    };

    bulkNotificationObject.push({
      payload: payload,
      iosTokens: iosTokens,
      androidTokens: androidTokens,
    });
  }

  const loanAuthCreateData = await LoanAuthorization.bulkCreate(
    loanAuthorizationData,
    { user: req.userDetails, individualHooks: true, transaction: transaction },
  );

  const loanRequestInboxArray = loanAuthCreateData.map((item) => {
    const loanRequestDatas = loanRequestData.find(
      (bditem) => bditem.LoanID == item.LoanID,
    );

    return {
      activityTable: LoanAuthorization.getTableName(),
      activityTablePK: item.loanAuthorizationID,
      message: `${loanRequestDatas?.dataValues.userMaster?.dataValues?.displayName} has applied for Loan`,
      assignedTo: item?.userMasterID,
      assignedBy: loanRequestDatas?.dataValues?.userMasterID,
    };
  });

  await UserInbox.bulkCreate(loanRequestInboxArray, {
    transaction: transaction,
  });

  return bulkNotificationObject;
}

async function manPowerRequisitionAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const manPowerRequisitionRequestData =
    await ManPowerRequisitionRequest.findAll({
      attributes: ['manPowerRequisitionID', 'userMasterID'],
      where: {
        userMasterID: {
          [Sequelize.Op.in]: userMasterID,
        },
        authorizationStatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PENDING_ZERO,
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
      },
      include: [
        {
          model: UserMaster,
          as: 'requestedBy',
          attributes: ['userMasterID', 'displayName'],
        },
        {
          separate: true,
          as: 'manPowerAuth',
          model: ManPowerRequisitionAuthorization,
          attributes: ['manPowerRequisitionAuthorizationID'],
        },
      ],
    });

  //Collect Manpower Requisition IDS
  const manPowerRequisitionRequestIDS = manPowerRequisitionRequestData.map(
    (item) => item.manPowerRequisitionID,
  );

  const allLoanAuthorizationIds = manPowerRequisitionRequestData.flatMap(
    (item) =>
      item.manPowerAuth.map((auth) => auth.manPowerRequisitionAuthorizationID),
  );

  await UserInbox.destroy(
    {
      where: {
        activityTable: ManPowerRequisitionAuthorization.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: allLoanAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  await ManPowerRequisitionAuthorization.destroy(
    {
      where: {
        manPowerRequisitionAuthorizationID: {
          [Sequelize.Op.in]: allLoanAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  await ManPowerRequisitionRequest.update(
    {
      authorizationStatus,
      authCriteriaID: AuthorizationCriteriaID,
      updateBy,
      updateByIp,
    },
    {
      where: {
        manPowerRequisitionID: {
          [Sequelize.Op.in]: manPowerRequisitionRequestIDS,
        },
      },
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
      validate: false,
    },
  );

  let manPowerRequisitionAuthorizationdata = [];
  for (const item of manPowerRequisitionRequestData) {
    for (const authItem of AuthorizedByUserMasterId) {
      manPowerRequisitionAuthorizationdata.push({
        manPowerRequisitionID: item.manPowerRequisitionID,
        userMasterID: authItem,
        authstatus: AuthStatusInAuthorizationRequest.PENDING,
        status: 1,
        createBy: item.userMasterID,
        createByIp,
      });

      // break inner loop if criteria == 5
      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }

    payload = {
      notification: {
        title: notificationTitleTypes.MANPOWERREQUISITION,
        body:
          item?.requestedBy?.displayName +
          ' requested for a Manpower Requisition udpate.',
      },
      data: {
        screen: notificationScreentTypes.MANPOWERREQUISITION,
      },
    };

    bulkNotificationObject.push({
      payload: payload,
      iosTokens: iosTokens,
      androidTokens: androidTokens,
    });
  }

  const manpowerRequisitionAuthCreateData =
    await ManPowerRequisitionAuthorization.bulkCreate(
      manPowerRequisitionAuthorizationdata,
      {
        user: req.userDetails,
        individualHooks: true,
        transaction: transaction,
      },
    );

  const manPowerRequestInboxArray = manpowerRequisitionAuthCreateData.map(
    (item) => {
      const manPowerRequisitionRequestDatas =
        manPowerRequisitionRequestData.find(
          (bditem) =>
            bditem.manPowerRequisitionID == item.manPowerRequisitionID,
        );

      return {
        activityTable: ManPowerRequisitionAuthorization.getTableName(),
        activityTablePK: item.manPowerRequisitionAuthorizationID,
        message: `${manPowerRequisitionRequestDatas?.dataValues.requestedBy?.dataValues?.displayName} has applied for Manpower Requisition`,
        assignedTo: item?.userMasterID,
        assignedBy: manPowerRequisitionRequestDatas?.dataValues?.userMasterID,
      };
    },
  );

  await UserInbox.bulkCreate(manPowerRequestInboxArray, {
    transaction: transaction,
  });

  return bulkNotificationObject;
}

// tour

async function tourRequestAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const tourRequestData = await toursMaster.findAll({
    attributes: ['ToursMasterID', 'UserMasterID'],
    where: {
      UserMasterID: {
        [Sequelize.Op.in]: userMasterID,
      },
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
      status: 1,
    },
    include: [
      {
        as: 'assign',
        model: UserMaster,
        attributes: ['userMasterID', 'displayName'],
      },
      {
        as: 'tourAuth',
        model: tourAuthorization,
        attributes: ['tourAuthorizationID'],
      },
    ],
  });
  const tourRequestIDS = tourRequestData.map((item) => item.ToursMasterID);

  const allTourAuthorizationIds = tourRequestData.flatMap((item) =>
    item.tourAuth.map((auth) => auth.tourAuthorizationID),
  );

  await UserInbox.destroy(
    {
      where: {
        activityTable: tourAuthorization.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: allTourAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  await tourAuthorization.destroy({
    where: {
      tourAuthorizationID: {
        [Sequelize.Op.in]: allTourAuthorizationIds,
      },
    },
    individualHooks: true,
    user: req.userDetails,
    transaction: transaction,
  });

  await toursMaster.update(
    {
      AuthorizationCriteriaID,
      authorizationStatus,
      updateBy,
      updateByIp,
    },
    {
      where: {
        ToursMasterID: {
          [Sequelize.Op.in]: tourRequestIDS,
        },
      },
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
      validate: false,
    },
  );

  let tourAuthorizationData = [];
  for (const item of tourRequestData) {
    for (const authItem of AuthorizedByUserMasterId) {
      tourAuthorizationData.push({
        tourMasterID: item.ToursMasterID,
        userMasterID: authItem,
        authStatus: AuthStatusInAuthorizationRequest.PENDING,
        status: 1,
        createBy: item.UserMasterID,
        createByIp,
      });

      // break inner loop if criteria == 5
      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }

    payload = {
      notification: {
        title: notificationTitleTypes.TOUR,
        body: item?.assign?.displayName + ' requested for a Tour.',
      },
      data: {
        screen: notificationScreentTypes.TOUR,
      },
    };

    bulkNotificationObject.push({
      payload: payload,
      iosTokens: iosTokens,
      androidTokens: androidTokens,
    });
  }
  const tourAuthCreateData = await tourAuthorization.bulkCreate(
    tourAuthorizationData,
    { user: req.userDetails, individualHooks: true, transaction: transaction },
  );

  const tourRequestInboxArray = tourAuthCreateData.map((item) => {
    const tourRequestDatas = tourRequestData.find(
      (bditem) => bditem.ToursMasterID == item.tourMasterID,
    );

    return {
      activityTable: tourAuthorization.getTableName(),
      activityTablePK: item.tourAuthorizationID,
      message: `${tourRequestDatas?.dataValues.assign?.dataValues?.displayName} has applied for Tour`,
      assignedTo: item?.userMasterID,
      assignedBy: tourRequestDatas?.dataValues?.UserMasterID,
    };
  });

  await UserInbox.bulkCreate(tourRequestInboxArray, {
    transaction: transaction,
  });
  return bulkNotificationObject;
}

async function salaryIncrementRequestAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const salaryIncrementRequestData = await SalaryIncrementRequest.findAll({
    attributes: ['salaryIncrementRequestID', 'userMasterID', 'salaryFromYYYYMM'],
    where: {
      userMasterID: {
        [Sequelize.Op.in]: userMasterID,
      },
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
      status: 1,
    },
    include: [
      {
        as: 'userMaster',
        model: UserMaster,
        attributes: ['userMasterID', 'displayName'],
      },
      {
        as: 'salaryIncreReqAuth',
        model: SalaryIncrementRequestAuthorization,
        attributes: ['salaryIncrementRequestAuthorizationID'],
      },
    ],
  });
  const salaryIncrementRequestIDS = salaryIncrementRequestData.map((item) => item.salaryIncrementRequestID);

  const allTourAuthorizationIds = salaryIncrementRequestData.flatMap((item) =>
    item.salaryIncreReqAuth.map((auth) => auth.salaryIncrementRequestAuthorizationID),
  );

  await UserInbox.destroy(
    {
      where: {
        activityTable: SalaryIncrementRequestAuthorization.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: allTourAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  await SalaryIncrementRequestAuthorization.destroy({
    where: {
      salaryIncrementRequestAuthorizationID: {
        [Sequelize.Op.in]: allTourAuthorizationIds,
      },
    },
    individualHooks: true,
    user: req.userDetails,
    transaction: transaction,
  });

  await SalaryIncrementRequest.update(
    {
      authCriteriaID: AuthorizationCriteriaID,
      authorizationStatus,
      updateBy,
      updateByIp,
    },
    {
      where: {
        salaryIncrementRequestID: {
          [Sequelize.Op.in]: salaryIncrementRequestIDS,
        },
      },
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
      validate: false,
    },
  );

  let salaryIncrementAuthorizationData = [];
  for (const item of salaryIncrementRequestData) {
    for (const authItem of AuthorizedByUserMasterId) {
      salaryIncrementAuthorizationData.push({
        salaryIncrementRequestID: item.salaryIncrementRequestID,
        userMasterID: authItem,
        authStatus: AuthStatusInAuthorizationRequest.PENDING,
        status: 1,
        createBy: item.UserMasterID,
        createByIp,
      });

      // break inner loop if criteria == 5
      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }
    const monthName =  formatMonth(item.salaryFromYYYYMM);
    payload = {
      notification: {
        title: notificationTitleTypes.SALARYINCREMENT,
        body: `New Salary Structure requested for ${item?.userMaster?.displayName} for the month of ${monthName}.`,
      },
      data: {
        screen: notificationScreentTypes.SALARYINCREMENT,
      },
    };

    bulkNotificationObject.push({
      payload: payload,
      iosTokens: iosTokens,
      androidTokens: androidTokens,
    });
  }
  const salaryIncrementAuthCreateData = await SalaryIncrementRequestAuthorization.bulkCreate(
    salaryIncrementAuthorizationData,
    { user: req.userDetails, individualHooks: true, transaction: transaction },
  );

  const salaryIncrementRequestInboxArray = salaryIncrementAuthCreateData.map((item) => {
    const salaryIncrementRequestDatas = salaryIncrementRequestData.find(
      (bditem) => bditem.salaryIncrementRequestID == item.salaryIncrementRequestID,
    );
    const monthName =  formatMonth(salaryIncrementRequestDatas.salaryFromYYYYMM);
    return {
      activityTable: SalaryIncrementRequestAuthorization.getTableName(),
      activityTablePK: item.salaryIncrementRequestAuthorizationID,
      // message: `${salaryIncrementRequestDatas?.dataValues.assign?.dataValues?.displayName} has applied for Salary Structure`,
      message: `New Salary Structure requested for ${salaryIncrementRequestDatas?.userMaster?.displayName} for the month of ${monthName}.`,
      assignedTo: item?.userMasterID,
      assignedBy: salaryIncrementRequestDatas?.dataValues?.UserMasterID,
    };
  });

  await UserInbox.bulkCreate(salaryIncrementRequestInboxArray, {
    transaction: transaction,
  });
  return bulkNotificationObject;
}

//Replace code start
async function workFromHomeAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
    return res
      .status(200)
      .json({
        status: 400,
        message: 'Invalid data type for find employee or replace employee',
      });
  }
  const whAuthorizationIdsRemoveInbox = (
    await UserWorkFromHome.findAll({
      attributes: ['id'],
      where: {
        authorizationStatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        id: {
          [Sequelize.Op.in]: sequelize.literal(`(
              SELECT "userWorkFromHomeID"
              FROM "workFromHomeAuthorizations"
              WHERE "status" = 1 AND "deletedAt" IS NULL
              GROUP BY "userWorkFromHomeID"
              HAVING ARRAY_AGG("userMasterID"::text) @> ARRAY['${findID}', '${replaceID}']
            )`),
        },
      },
      include: [
        {
          required: true,
          model: WorkFromHomeAuthorization,
          attributes: ['whAuthoriztaionid', 'userMasterID'],
          where: {
            status: 1,
            userMasterID: findID,
            authStatus: 2,
          },
        },
      ],
    })
  ).flatMap((item) =>
    item.workFromHomeAuthorizations.map((auth) => auth.whAuthoriztaionid),
  );

  const workFromAuthorizationDataUpdate = (
    await WorkFromHomeAuthorization.findAll({
      attributes: ['whAuthoriztaionid'],
      where: {
        userMasterID: findID,
        authStatus: 2,
        whAuthoriztaionid: {
          [Sequelize.Op.notIn]: whAuthorizationIdsRemoveInbox,
        },
      },
      include: [
        {
          required: true,
          model: UserWorkFromHome,
          attributes: [],
          where: {
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
        },
      ],
    })
  ).map((item) => item.whAuthoriztaionid);

  await UserInbox.destroy({
    where: {
      activityTable: WorkFromHomeAuthorization.getTableName(),
      activityTablePK: whAuthorizationIdsRemoveInbox,
    },
    transaction: transaction,
  });

  await WorkFromHomeAuthorization.destroy({
    where: {
      whAuthoriztaionid: whAuthorizationIdsRemoveInbox,
    },
    individualHooks: true,
    user: userDetails,
    transaction: transaction,
  });

  await UserInbox.update(
    {
      assignedTo: replaceID,
    },
    {
      where: {
        activityTable: WorkFromHomeAuthorization.getTableName(),
        activityTablePK: workFromAuthorizationDataUpdate,
      },
      transaction: transaction,
    },
  );

  await WorkFromHomeAuthorization.update(
    {
      userMasterID: replaceID,
    },
    {
      where: {
        whAuthoriztaionid: workFromAuthorizationDataUpdate,
      },
      individualHooks: true,
      user: userDetails,
      transaction: transaction,
    },
  );

  return;
}

async function expenseAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
    return res
      .status(200)
      .json({
        status: 400,
        message: 'Invalid data type for find employee or replace employee',
      });
  }
  const userExpenseDataRemoved = (
    await UserExpenseTransaction.findAll({
      where: {
        authorizationStatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        userExpenseTransactionID: {
          [Sequelize.Op.in]: sequelize.literal(`(
            SELECT "ReferenceID"
            FROM "expenseAuthorizations"
            WHERE "status" = 1
            GROUP BY "ReferenceID"
            HAVING ARRAY_AGG("userMasterID"::text) @> ARRAY['${findID}', '${replaceID}']
          )`),
        },
        status: 1,
      },
      include: [
        {
          required: true,
          model: ExpenseAuthorizationRequest,
          as: 'Auth',
          attributes: ['AuthorizationRequestId'],
          where: {
            status: 1,
            userMasterID: findID,
            authstatus: 2,
          },
        },
      ],
    })
  ).flatMap(
    (item) => item.Auth?.map((auth) => auth.AuthorizationRequestId) || [],
  );

  const userExpenseAuthorizationDataUpdate = (
    await ExpenseAuthorizationRequest.findAll({
      attributes: ['AuthorizationRequestId'],
      where: {
        userMasterID: findID,
        status: 1,
        authstatus: 2,
        AuthorizationRequestId: {
          [Sequelize.Op.notIn]: userExpenseDataRemoved,
        },
      },
      include: [
        {
          required: true,
          model: UserExpenseTransaction,
          attributes: [],
          where: {
            status: 1,
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
        },
      ],
    })
  ).map((item) => item.AuthorizationRequestId);

  await UserInbox.destroy({
    where: {
      activityTable: UserExpense.getTableName(),
      activityTablePK: userExpenseDataRemoved,
    },
    transaction: transaction,
  });

  await ExpenseAuthorizationRequest.destroy({
    where: {
      AuthorizationRequestId: userExpenseDataRemoved,
    },
    transaction: transaction,
  });

  await UserInbox.update(
    {
      assignedTo: replaceID,
    },
    {
      where: {
        activityTable: UserExpense.getTableName(),
        activityTablePK: userExpenseAuthorizationDataUpdate,
      },
      transaction: transaction,
    },
  );

  await ExpenseAuthorizationRequest.update(
    {
      userMasterID: replaceID,
    },
    {
      where: {
        AuthorizationRequestId: userExpenseAuthorizationDataUpdate,
      },
      transaction: transaction,
    },
  );

  return;
}

async function expenseAdvanceRequestAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  try {
    if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
      return res
        .status(200)
        .json({
          status: 400,
          message: 'Invalid data type for find employee or replace employee',
        });
    }
    const expenseAdvanceReqDataRemoved = (
      await ExpenseAdvanceRequest.findAll({
        where: {
          authorizationStatus: {
            [Sequelize.Op.in]: [
              AuthorizationStatusType.PEDING_ONE,
              AuthorizationStatusType.PEDING_TWO,
            ],
          },
          expenseAdvanceRequestID: {
            [Sequelize.Op.in]: sequelize.literal(`(
  SELECT "expenseAdvanceRequestID"
  FROM "expenseAdvanceReqAuths"
  WHERE "status" = 1
    AND "deletedAt" IS NULL
  GROUP BY "expenseAdvanceRequestID"
  HAVING ARRAY_AGG("userMasterID"::text) @> ARRAY['${findID}', '${replaceID}']
)`),
          },
          status: 1,
        },
        include: [
          {
            required: true,
            model: ExpenseAdvanceReqAuth,
            as: 'Auth',
            attributes: ['AuthReqId'],
            where: {
              status: 1,
              userMasterID: findID,
              authStatus: 2,
            },
          },
        ],
      })
    ).flatMap((item) => item.Auth?.map((auth) => auth.AuthReqId) || []);

    const expenseAdvanceAuthorizationDataUpdate = (
      await ExpenseAdvanceReqAuth.findAll({
        attributes: ['AuthReqId'],
        where: {
          userMasterID: findID,
          status: 1,
          authStatus: 2,
          ExpenseAdvanceReqAuth: {
            [Sequelize.Op.notIn]: expenseAdvanceReqDataRemoved,
          },
        },
        include: [
          {
            required: true,
            model: ExpenseAdvanceRequest,
            as: 'ea_req',
            attributes: [],
            where: {
              status: 1,
              authorizationStatus: {
                [Sequelize.Op.in]: [
                  AuthorizationStatusType.PEDING_ONE,
                  AuthorizationStatusType.PEDING_TWO,
                ],
              },
            },
          },
        ],
      })
    ).map((item) => item.AuthReqId);

    await UserInbox.destroy({
      where: {
        activityTable: ExpenseAdvanceReqAuth.getTableName(),
        activityTablePK: expenseAdvanceReqDataRemoved,
      },
      transaction: transaction,
    });

    await ExpenseAuthorizationRequest.destroy({
      where: {
        AuthorizationRequestId: expenseAdvanceReqDataRemoved,
      },
      transaction: transaction,
    });

    await UserInbox.update(
      {
        assignedTo: replaceID,
      },
      {
        where: {
          activityTable: ExpenseAdvanceReqAuth.getTableName(),
          activityTablePK: expenseAdvanceAuthorizationDataUpdate,
        },
        transaction: transaction,
      },
    );

    await ExpenseAdvanceReqAuth.update(
      {
        userMasterID: replaceID,
      },
      {
        where: {
          AuthReqId: expenseAdvanceAuthorizationDataUpdate,
        },
        transaction: transaction,
      },
    );
  } catch (error) {
    throw new Error(
      'Error in expense AdvanceRequest Authorization Replace: ' + error.message,
    );
  }
}

async function overtimeAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
    return res
      .status(200)
      .json({
        status: 400,
        message: 'Invalid data type for find employee or replace employee',
      });
  }
  const overTimeRemoved = (
    await overTimeCalculation.findAll({
      attributes: ['OverTimeID'],
      where: {
        AuthorizationRequired: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        OverTimeID: {
          [Sequelize.Op.in]: sequelize.literal(`(
            SELECT "ReferenceID"
            FROM "overtimeAuthorizations"
            WHERE "status" = 1
            GROUP BY "ReferenceID"
            HAVING ARRAY_AGG("userMasterID"::text) @> ARRAY['${findID}', '${replaceID}']
          )`),
        },
      },
      include: [
        {
          model: OvertimeAuthorization,
          attributes: ['AuthorizationRequestId'],
          where: {
            status: 1,
            userMasterID: findID,
            authstatus: 2,
          },
          required: true,
        },
      ],
    })
  ).flatMap(
    (item) =>
      item.overtimeAuthorizations?.map((auth) => auth.AuthorizationRequestId) ||
      [],
  );

  const overTimeAuthorizationUpdate = (
    await OvertimeAuthorization.findAll({
      attributes: ['AuthorizationRequestId'],
      where: {
        userMasterID: findID,
        status: 1,
        authstatus: 2,
        AuthorizationRequestId: {
          [Sequelize.Op.notIn]: overTimeRemoved,
        },
      },
      include: [
        {
          required: true,
          model: overTimeCalculation,
          as: 'overTimeCalculation',
          attributes: [],
          where: {
            AuthorizationRequired: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
        },
      ],
    })
  ).map((item) => item.AuthorizationRequestId);

  await OvertimeAuthorization.destroy({
    where: {
      AuthorizationRequestId: overTimeRemoved,
    },
    transaction: transaction,
  });

  await OvertimeAuthorization.update(
    {
      userMasterID: replaceID,
    },
    {
      where: {
        AuthorizationRequestId: overTimeAuthorizationUpdate,
      },
      transaction: transaction,
    },
  );

  return;
}

async function resignationAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
    return res
      .status(200)
      .json({
        status: 400,
        message: 'Invalid data type for find employee or replace employee',
      });
  }
  const userResignationRemovedData = (
    await UserResignation.findAll({
      attributes: ['resignationID'],
      where: {
        authorizationstatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        status: 1,
        resignationID: {
          [Sequelize.Op.in]: sequelize.literal(`(
            SELECT "ReferenceID"
            FROM "resignationAuthorizations"
            WHERE "status" = 1
            GROUP BY "ReferenceID"
            HAVING ARRAY_AGG("userMasterID"::text) @> ARRAY['${findID}', '${replaceID}']
          )`),
        },
      },
      include: [
        {
          model: ResignationAuth,
          attributes: ['AuthorizationRequestId'],
          where: {
            status: 1,
            userMasterID: findID,
            authstatus: 2,
          },
          required: true,
        },
      ],
    })
  ).flatMap(
    (item) =>
      item.resignationAuthorizations?.map(
        (auth) => auth.AuthorizationRequestId,
      ) || [],
  );

  const resignationUpdateData = (
    await ResignationAuth.findAll({
      attributes: ['AuthorizationRequestId'],
      where: {
        status: 1,
        userMasterID: findID,
        authstatus: 2,
        AuthorizationRequestId: {
          [Sequelize.Op.notIn]: userResignationRemovedData,
        },
      },
      include: [
        {
          required: true,
          model: UserResignation,
          attributes: [],
          where: {
            status: 1,
            authorizationstatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
        },
      ],
    })
  ).map((item) => item.AuthorizationRequestId);

  await UserInbox.destroy({
    where: {
      activityTable: ResignationAuth.getTableName(),
      activityTablePK: {
        [Sequelize.Op.in]: userResignationRemovedData,
      },
    },
    transaction: transaction,
  });

  await ResignationAuth.destroy({
    where: {
      AuthorizationRequestId: {
        [Sequelize.Op.in]: userResignationRemovedData,
      },
    },
    transaction: transaction,
  });

  await UserInbox.update(
    {
      assignedTo: replaceID,
    },
    {
      where: {
        activityTable: ResignationAuth.getTableName(),
        activityTablePK: resignationUpdateData,
      },
      transaction: transaction,
    },
  );

  await ResignationAuth.update(
    {
      userMasterID: replaceID,
    },
    {
      where: {
        AuthorizationRequestId: resignationUpdateData,
      },
      transaction: transaction,
    },
  );

  return;
}

async function gatePassAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
    return res
      .status(200)
      .json({
        status: 400,
        message: 'Invalid data type for find employee or replace employee',
      });
  }
  const employeeGatePassRemovedData = (
    await EmployeeGatepass.findAll({
      attributes: ['id'],
      where: {
        authorizationStatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        status: 'Pending',
        id: {
          [Sequelize.Op.in]: sequelize.literal(`(
                SELECT "ReferenceID"
                FROM "gatePassAuthorizations"
                WHERE "status" = 1
                GROUP BY "ReferenceID"
                HAVING ARRAY_AGG("userMasterID"::text) @> ARRAY['${findID}', '${replaceID}']
              )`),
        },
      },
      include: [
        {
          required: true,
          model: GatePassAuthorizationRequest,
          attributes: ['AuthorizationRequestId'],
          where: {
            status: 1,
            userMasterID: findID,
            authstatus: 2,
          },
        },
      ],
    })
  ).flatMap(
    (item) =>
      item.gatePassAuthorizations?.map((auth) => auth.AuthorizationRequestId) ||
      [],
  );

  const employeeGatePassUpdateData = (
    await GatePassAuthorizationRequest.findAll({
      attributes: ['AuthorizationRequestId'],
      where: {
        status: 1,
        userMasterID: findID,
        authstatus: 2,
        AuthorizationRequestId: {
          [Sequelize.Op.notIn]: employeeGatePassRemovedData,
        },
      },
      include: [
        {
          required: true,
          model: EmployeeGatepass,
          attributes: [],
          where: {
            status: 'Pending',
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
        },
      ],
    })
  ).map((item) => item.AuthorizationRequestId);

  await UserInbox.destroy({
    where: {
      activityTable: GatePassAuthorizationRequest.getTableName(),
      activityTablePK: {
        [Sequelize.Op.in]: employeeGatePassRemovedData,
      },
    },
    transaction: transaction,
  });

  await GatePassAuthorizationRequest.destroy({
    where: {
      AuthorizationRequestId: {
        [Sequelize.Op.in]: employeeGatePassRemovedData,
      },
    },
    transaction: transaction,
  });

  await UserInbox.update(
    {
      assignedTo: replaceID,
    },
    {
      where: {
        activityTable: GatePassAuthorizationRequest.getTableName(),
        activityTablePK: employeeGatePassUpdateData,
      },
      transaction: transaction,
    },
  );

  await ResignationAuth.update(
    {
      userMasterID: replaceID,
    },
    {
      where: {
        AuthorizationRequestId: employeeGatePassUpdateData,
      },
      transaction: transaction,
    },
  );

  return;
}

async function coffAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
    return res
      .status(200)
      .json({
        status: 400,
        message: 'Invalid data type for find employee or replace employee',
      });
  }
  const coffRemovedData = (
    await coffMaster.findAll({
      attributes: ['coffMasterID'],
      where: {
        authorizationStatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        status: 1,
        coffMasterID: {
          [Sequelize.Op.in]: sequelize.literal(`(
                SELECT "coffMasterID"
                FROM "compensatoryOffAuthorizations"
                WHERE "status" = 1
                GROUP BY "coffMasterID"
                HAVING ARRAY_AGG("userMasterID"::text) @> ARRAY['${findID}', '${replaceID}']
              )`),
        },
      },
      include: [
        {
          required: true,
          model: CompensatoryOffAuthorization,
          attributes: ['CompensatoryOffAuthorizationID'],
          where: {
            status: 1,
            userMasterID: findID,
            authstatus: 2,
          },
        },
      ],
    })
  ).flatMap(
    (item) =>
      item.compensatoryOffAuthorizations?.map(
        (auth) => auth.CompensatoryOffAuthorizationID,
      ) || [],
  );

  const coffUpdateData = (
    await CompensatoryOffAuthorization.findAll({
      attributes: ['CompensatoryOffAuthorizationID'],
      where: {
        status: 1,
        userMasterID: findID,
        authstatus: 2,
        CompensatoryOffAuthorizationID: {
          [Sequelize.Op.notIn]: coffRemovedData,
        },
      },
      include: [
        {
          required: true,
          model: coffMaster,
          attributes: [],
          where: {
            status: 1,
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
        },
      ],
    })
  ).map((item) => item.CompensatoryOffAuthorizationID);

  await UserInbox.destroy({
    where: {
      activityTable: CompensatoryOffAuthorization.getTableName(),
      activityTablePK: {
        [Sequelize.Op.in]: coffRemovedData,
      },
    },
    transaction: transaction,
  });

  await CompensatoryOffAuthorization.destroy({
    where: {
      CompensatoryOffAuthorizationID: {
        [Sequelize.Op.in]: coffRemovedData,
      },
    },
    individualHooks: true,
    user: userDetails,
    transaction: transaction,
  });

  await UserInbox.update(
    {
      assignedTo: replaceID,
    },
    {
      where: {
        activityTable: CompensatoryOffAuthorization.getTableName(),
        activityTablePK: coffUpdateData,
      },
      transaction: transaction,
    },
  );

  await CompensatoryOffAuthorization.update(
    {
      userMasterID: replaceID,
    },
    {
      where: {
        CompensatoryOffAuthorizationID: coffUpdateData,
      },
      individualHooks: true,
      user: userDetails,
      transaction: transaction,
    },
  );

  return;
}

async function leaveAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
    return res
      .status(200)
      .json({
        status: 400,
        message: 'Invalid data type for find employee or replace employee',
      });
  }
  const leaveRemovedData = (
    await UserLeave.findAll({
      attributes: ['UserLeaveApplicationID'],
      where: {
        authorizationStatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        status: 1,
        UserLeaveApplicationID: {
          [Sequelize.Op.in]: sequelize.literal(`(
                SELECT "ReferenceID"
                FROM "leaveAuthorizations"
                WHERE "status" = 1
                GROUP BY "ReferenceID"
                HAVING ARRAY_AGG("userMasterID"::text) @> ARRAY['${findID}', '${replaceID}']
              )`),
        },
      },
      include: [
        {
          required: true,
          model: LeaveAuthorizationRequest,
          attributes: ['AuthorizationRequestId'],
          where: {
            status: 1,
            userMasterID: findID,
            authstatus: 2,
          },
        },
      ],
    })
  ).flatMap(
    (item) =>
      item.leaveAuthorizations?.map((auth) => auth.AuthorizationRequestId) ||
      [],
  );

  const leaveUpdateData = (
    await LeaveAuthorizationRequest.findAll({
      attributes: ['AuthorizationRequestId'],
      where: {
        status: 1,
        userMasterID: findID,
        authstatus: 2,
        AuthorizationRequestId: {
          [Sequelize.Op.notIn]: leaveRemovedData,
        },
      },
      include: [
        {
          required: true,
          model: UserLeave,
          attributes: [],
          where: {
            status: 1,
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
        },
      ],
    })
  ).map((item) => item.AuthorizationRequestId);

  await UserInbox.destroy(
    {
      where: {
        activityTable: {
          [Sequelize.Op.in]: [
            'outdoorDutyAuthorizations',
            'leaveAuthorizations',
          ],
        },
        activityTablePK: {
          [Sequelize.Op.in]: leaveRemovedData,
        },
      },
    },
    { transaction: transaction },
  );

  await UserInbox.destroy({
    where: {
      activityTable: {
        [Sequelize.Op.in]: ['outdoorDutyAuthorizations', 'leaveAuthorizations'],
      },
      activityTablePK: {
        [Sequelize.Op.in]: leaveRemovedData,
      },
    },
    transaction: transaction,
  });

  await LeaveAuthorizationRequest.destroy({
    where: {
      AuthorizationRequestId: {
        [Sequelize.Op.in]: leaveRemovedData,
      },
    },
    transaction: transaction,
  });

  await UserInbox.update(
    {
      assignedTo: replaceID,
    },
    {
      where: {
        activityTable: {
          [Sequelize.Op.in]: [
            'outdoorDutyAuthorizations',
            'leaveAuthorizations',
          ],
        },
        activityTablePK: leaveUpdateData,
      },
      transaction: transaction,
    },
  );

  await LeaveAuthorizationRequest.update(
    {
      userMasterID: replaceID,
    },
    {
      where: {
        AuthorizationRequestId: leaveUpdateData,
      },
      transaction: transaction,
    },
  );

  return;
}

async function shortLeaveAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
    return res
      .status(200)
      .json({
        status: 400,
        message: 'Invalid data type for find employee or replace employee',
      });
  }
  const shortLeaveRemovedData = (
    await UserShortLeave.findAll({
      attributes: ['userShortLeaveId'],
      where: {
        authorizationStatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        status: 1,
        userShortLeaveId: {
          [Sequelize.Op.in]: sequelize.literal(`(
                SELECT "referenceId"
                FROM "shortLeaveAuthorizations"
                WHERE "status" = 1
                GROUP BY "referenceId"
                HAVING ARRAY_AGG("userMasterID"::text) @> ARRAY['${findID}', '${replaceID}']
              )`),
        },
      },
      include: [
        {
          required: true,
          model: ShortLeaveAuthorization,
          attributes: ['id'],
          where: {
            status: 1,
            userMasterID: findID,
            authstatus: 2,
          },
        },
      ],
    })
  ).flatMap(
    (item) => item.shortLeaveAuthorizations?.map((auth) => auth.id) || [],
  );

  const shortLeaveUpdateData = (
    await ShortLeaveAuthorization.findAll({
      attributes: ['id'],
      where: {
        status: 1,
        userMasterID: findID,
        authstatus: 2,
        id: {
          [Sequelize.Op.notIn]: shortLeaveRemovedData,
        },
      },
      include: [
        {
          required: true,
          model: UserShortLeave,
          attributes: [],
          where: {
            status: 1,
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
        },
      ],
    })
  ).map((item) => item.id);

  await UserInbox.destroy(
    {
      where: {
        activityTable: ShortLeaveAuthorization.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: shortLeaveRemovedData,
        },
      },
    },
    { transaction: transaction },
  );

  await ShortLeaveAuthorization.destroy({
    where: {
      id: {
        [Sequelize.Op.in]: shortLeaveRemovedData,
      },
    },
    individualHooks: true,
    user: userDetails,
    transaction: transaction,
  });

  await UserInbox.update(
    {
      assignedTo: replaceID,
    },
    {
      where: {
        activityTable: ShortLeaveAuthorization.getTableName(),
        activityTablePK: shortLeaveUpdateData,
      },
      transaction: transaction,
    },
  );

  await ShortLeaveAuthorization.update(
    {
      userMasterID: replaceID,
    },
    {
      where: {
        id: shortLeaveUpdateData,
      },
      individualHooks: true,
      user: userDetails,
      transaction: transaction,
    },
  );

  return;
}

async function attendanceCorrectionAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
    return res
      .status(200)
      .json({
        status: 400,
        message: 'Invalid data type for find employee or replace employee',
      });
  }
  const attendanceCorrentationRemovedData = (
    await AttendanceCorrectionRequest.findAll({
      attributes: ['attendanceCorrectionRequestId'],
      where: {
        authorizationStatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        status: 1,
        attendanceCorrectionRequestId: {
          [Sequelize.Op.in]: sequelize.literal(`(
                        SELECT "attendanceCorrectionRequestId"
                        FROM "attendanceCorrectionAuthorizations"
                        WHERE "status" = 1
                        GROUP BY "attendanceCorrectionRequestId"
                        HAVING ARRAY_AGG("userMasterID"::text) @> ARRAY['${findID}', '${replaceID}']
                      )`),
        },
      },
      include: [
        {
          required: true,
          model: AttendanceCorrectionAuthorization,
          attributes: ['id'],
          where: {
            status: 1,
            userMasterID: findID,
            authStatus: 2,
          },
        },
      ],
    })
  ).flatMap(
    (item) =>
      item.attendanceCorrectionAuthorizations?.map((auth) => auth.id) || [],
  );

  const attendanceCorrentationUpdateData = (
    await AttendanceCorrectionAuthorization.findAll({
      attributes: ['id'],
      where: {
        status: 1,
        userMasterID: findID,
        authStatus: 2,
        id: {
          [Sequelize.Op.notIn]: attendanceCorrentationRemovedData,
        },
      },
      include: [
        {
          required: true,
          model: AttendanceCorrectionRequest,
          attributes: [],
          where: {
            status: 1,
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
        },
      ],
    })
  ).map((item) => item.id);

  await UserInbox.destroy(
    {
      where: {
        activityTable: AttendanceCorrectionAuthorization.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: attendanceCorrentationRemovedData,
        },
      },
    },
    { transaction: transaction },
  );

  await AttendanceCorrectionAuthorization.destroy({
    where: {
      id: {
        [Sequelize.Op.in]: attendanceCorrentationRemovedData,
      },
    },
    individualHooks: true,
    user: userDetails,
    transaction: transaction,
  });

  await UserInbox.update(
    {
      assignedTo: replaceID,
    },
    {
      where: {
        activityTable: AttendanceCorrectionAuthorization.getTableName(),
        activityTablePK: attendanceCorrentationUpdateData,
      },
      transaction: transaction,
    },
  );

  await AttendanceCorrectionAuthorization.update(
    {
      userMasterID: replaceID,
    },
    {
      where: {
        id: attendanceCorrentationUpdateData,
      },
      individualHooks: true,
      user: userDetails,
      transaction: transaction,
    },
  );

  return;
}

async function bankDetailRequestAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
    return res
      .status(200)
      .json({
        status: 400,
        message: 'Invalid data type for find employee or replace employee',
      });
  }
  const bankDetailAuthorizationIdsRemoveInbox = (
    await BankDetailRequest.findAll({
      attributes: ['bankDetailRequestId'],
      where: {
        authorizationStatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        bankDetailRequestId: {
          [Sequelize.Op.in]: sequelize.literal(`(
              SELECT "bankDetailRequestId"
              FROM "bankDetailAuthorizations"
              WHERE "status" = 1 AND "deletedAt" IS NULL
              GROUP BY "bankDetailRequestId"
              HAVING ARRAY_AGG("userMasterID"::text) @> ARRAY['${findID}', '${replaceID}']
            )`),
        },
      },
      include: [
        {
          required: true,
          model: BankDetailAuthorization,
          attributes: ['bankDetailAuthorizationId', 'userMasterID'],
          where: {
            status: 1,
            userMasterID: findID,
            authStatus: 2,
          },
        },
      ],
    })
  ).flatMap((item) =>
    item.bankDetailAuthorizations.map((auth) => auth.bankDetailAuthorizationId),
  );

  const bankDetailAuthorizationDataUpdate = (
    await BankDetailAuthorization.findAll({
      attributes: ['bankDetailAuthorizationId'],
      where: {
        userMasterID: findID,
        authStatus: 2,
        bankDetailAuthorizationId: {
          [Sequelize.Op.notIn]: bankDetailAuthorizationIdsRemoveInbox,
        },
      },
      include: [
        {
          required: true,
          model: BankDetailRequest,
          attributes: [],
          where: {
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
        },
      ],
    })
  ).map((item) => item.bankDetailAuthorizationId);

  await UserInbox.destroy({
    where: {
      activityTable: BankDetailAuthorization.getTableName(),
      activityTablePK: bankDetailAuthorizationIdsRemoveInbox,
    },
    transaction: transaction,
  });

  await BankDetailAuthorization.destroy({
    where: {
      bankDetailAuthorizationId: bankDetailAuthorizationIdsRemoveInbox,
    },
    individualHooks: true,
    user: userDetails,
    transaction: transaction,
  });

  await UserInbox.update(
    {
      assignedTo: replaceID,
    },
    {
      where: {
        activityTable: BankDetailAuthorization.getTableName(),
        activityTablePK: bankDetailAuthorizationDataUpdate,
      },
      transaction: transaction,
    },
  );

  await BankDetailAuthorization.update(
    {
      userMasterID: replaceID,
    },
    {
      where: {
        bankDetailAuthorizationId: bankDetailAuthorizationDataUpdate,
      },
      individualHooks: true,
      user: userDetails,
      transaction: transaction,
    },
  );

  return;
}

async function manPowerRequisitionRequestAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
    return res
      .status(200)
      .json({
        status: 400,
        message: 'Invalid data type for find employee or replace employee',
      });
  }
  const manPowerRequisitionAuthorizationIdsRemoveInbox = (
    await ManPowerRequisitionRequest.findAll({
      attributes: ['manPowerRequisitionID'],
      where: {
        authorizationStatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        manPowerRequisitionID: {
          [Sequelize.Op.in]: sequelize.literal(`(
              SELECT "manPowerRequisitionID"
              FROM "manPowerRequisitionRequests"
              WHERE "status" = 1 AND "deletedAt" IS NULL
              GROUP BY "manPowerRequisitionID"
              HAVING ARRAY_AGG("userMasterID"::text) @> ARRAY['${findID}', '${replaceID}']
            )`),
        },
      },
      include: [
        {
          required: true,
          model: ManPowerRequisitionAuthorization,
          as: 'manPowerAuth',
          attributes: ['manPowerRequisitionAuthorizationID', 'userMasterID'],
          where: {
            status: 1,
            userMasterID: findID,
            authStatus: 2,
          },
        },
      ],
    })
  ).flatMap((item) =>
    item.manPowerAuth.map((auth) => auth.manPowerRequisitionAuthorizationID),
  );

  const manPowerRequisitionAuthorizationDataUpdate = (
    await ManPowerRequisitionAuthorization.findAll({
      attributes: ['manPowerRequisitionAuthorizationID'],
      where: {
        userMasterID: findID,
        authStatus: 2,
        manPowerRequisitionAuthorizationID: {
          [Sequelize.Op.notIn]: manPowerRequisitionAuthorizationIdsRemoveInbox,
        },
      },
      include: [
        {
          required: true,
          as: 'manPowerAuth',
          model: ManPowerRequisitionRequest,
          attributes: [],
          where: {
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
        },
      ],
    })
  ).map((item) => item.manPowerRequisitionAuthorizationID);

  await UserInbox.destroy({
    where: {
      activityTable: ManPowerRequisitionAuthorization.getTableName(),
      activityTablePK: manPowerRequisitionAuthorizationIdsRemoveInbox,
    },
    transaction: transaction,
  });

  await ManPowerRequisitionAuthorization.destroy({
    where: {
      manPowerRequisitionAuthorizationID:
        manPowerRequisitionAuthorizationIdsRemoveInbox,
    },
    individualHooks: true,
    user: userDetails,
    transaction: transaction,
  });

  await UserInbox.update(
    {
      assignedTo: replaceID,
    },
    {
      where: {
        activityTable: ManPowerRequisitionAuthorization.getTableName(),
        activityTablePK: manPowerRequisitionAuthorizationDataUpdate,
      },
      transaction: transaction,
    },
  );

  await ManPowerRequisitionAuthorization.update(
    {
      userMasterID: replaceID,
    },
    {
      where: {
        manPowerRequisitionAuthorizationID:
          manPowerRequisitionAuthorizationDataUpdate,
      },
      individualHooks: true,
      user: userDetails,
      transaction: transaction,
    },
  );

  return;
}

async function tourRequestAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
    return res
      .status(200)
      .json({
        status: 400,
        message: 'Invalid data type for find employee or replace employee',
      });
  }
  const tourAuthorizationIdsRemoveInbox = (
    await toursMaster.findAll({
      attributes: ['ToursMasterID'],
      where: {
        authorizationStatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        ToursMasterID: {
          [Sequelize.Op.in]: sequelize.literal(`(
              SELECT "ToursMasterID"
              FROM "ToursMasters"
              WHERE "status" = 1 
              GROUP BY "ToursMasterID"
              HAVING ARRAY_AGG("UserMasterID"::text) @> ARRAY['${findID}', '${replaceID}']
            )`),
        },
      },
      include: [
        {
          required: true,
          model: tourAuthorization,
          as: 'tourAuth',
          attributes: ['tourAuthorizationID', 'userMasterID'],
          where: {
            status: 1,
            userMasterID: findID,
            authStatus: 2,
          },
        },
      ],
    })
  ).flatMap((item) => item.tourAuth.map((auth) => auth.tourAuthorizationID));

  const tourAuthorizationDataUpdate = (
    await tourAuthorization.findAll({
      attributes: ['tourAuthorizationID'],
      where: {
        userMasterID: findID,
        authStatus: 2,
        tourAuthorizationID: {
          [Sequelize.Op.notIn]: tourAuthorizationIdsRemoveInbox,
        },
      },
      include: [
        {
          required: true,
          model: toursMaster,
          attributes: [],
          where: {
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
        },
      ],
    })
  ).map((item) => item.tourAuthorizationID);

  await UserInbox.destroy({
    where: {
      activityTable: tourAuthorization.getTableName(),
      activityTablePK: tourAuthorizationIdsRemoveInbox,
    },
    transaction: transaction,
  });

  await tourAuthorization.destroy({
    where: {
      tourAuthorizationID: tourAuthorizationIdsRemoveInbox,
    },
    individualHooks: true,
    user: userDetails,
    transaction: transaction,
  });

  await UserInbox.update(
    {
      assignedTo: replaceID,
    },
    {
      where: {
        activityTable: tourAuthorization.getTableName(),
        activityTablePK: tourAuthorizationDataUpdate,
      },
      transaction: transaction,
    },
  );

  await tourAuthorization.update(
    {
      userMasterID: replaceID,
    },
    {
      where: {
        tourAuthorizationID: tourAuthorizationDataUpdate,
      },
      individualHooks: true,
      user: userDetails,
      transaction: transaction,
    },
  );

  return;
}

async function salaryIncrementRequestAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  const salaryIncrementAuthorizationIdsRemoveInbox = (
    await SalaryIncrementRequest.findAll({
      attributes: ['salaryIncrementRequestID'],
      where: {
        authorizationStatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        salaryIncrementRequestID: {
          [Sequelize.Op.in]: sequelize.literal(`(
              SELECT "salaryIncrementRequestID"
              FROM "SalaryIncrementRequest"
              WHERE "status" = 1 
              GROUP BY "salaryIncrementRequestID"
              HAVING ARRAY_AGG("UserMasterID"::text) @> ARRAY['${findID}', '${replaceID}']
            )`),
        },
      },
      include: [
        {
          required: true,
          model: SalaryIncrementRequestAuthorization,
          as: 'salaryIncreReqAuth',
          attributes: ['salaryIncrementRequestAuthorizationID', 'userMasterID'],
          where: {
            status: 1,
            userMasterID: findID,
            authStatus: 2,
          },
        },
      ],
    })
  ).flatMap((item) => item.salaryIncreReqAuth.map((auth) => auth.salaryIncrementRequestAuthorizationID));

  const salaryIncrementAuthorizationDataUpdate = (
    await SalaryIncrementRequestAuthorization.findAll({
      attributes: ['salaryIncrementRequestAuthorizationID'],
      where: {
        userMasterID: findID,
        authStatus: 2,
        salaryIncrementRequestAuthorizationID: {
          [Sequelize.Op.notIn]: salaryIncrementAuthorizationIdsRemoveInbox,
        },
      },
      include: [
        {
          required: true,
          model: toursMaster,
          attributes: [],
          where: {
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
        },
      ],
    })
  ).map((item) => item.tourAuthorizationID);

  await UserInbox.destroy({
    where: {
      activityTable: SalaryIncrementRequestAuthorization.getTableName(),
      activityTablePK: salaryIncrementAuthorizationIdsRemoveInbox,
    },
    transaction: transaction,
  });

  await SalaryIncrementRequestAuthorization.destroy({
    where: {
      salaryIncrementRequestAuthorizationID: salaryIncrementAuthorizationIdsRemoveInbox,
    },
    individualHooks: true,
    user: userDetails,
    transaction: transaction,
  });

  await UserInbox.update(
    {
      assignedTo: replaceID,
    },
    {
      where: {
        activityTable: tourAuthorization.getTableName(),
        activityTablePK: salaryIncrementAuthorizationDataUpdate,
      },
      transaction: transaction,
    },
  );

  await tourAuthorization.update(
    {
      userMasterID: replaceID,
    },
    {
      where: {
        tourAuthorizationID: salaryIncrementAuthorizationDataUpdate,
      },
      individualHooks: true,
      user: userDetails,
      transaction: transaction,
    },
  );

  return;
}

// Visit
async function visitRequestAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const visitRequestData = await Visit.findAll({
    attributes: ['visitID', 'assignID'],
    where: {
      assignID: {
        [Sequelize.Op.in]: userMasterID,
      },
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
      status: 1,
    },
    include: [
      {
        as: 'assign',
        model: UserMaster,
        attributes: ['userMasterID', 'displayName'],
      },
      {
        as: 'visitAuth',
        model: VisitAuthorization,
        attributes: ['visitAuthorizationID'],
      },
    ],
  });
  const visitRequestIDS = visitRequestData.map((item) => item.visitID);

  const allVisitAuthorizationIds = visitRequestData.flatMap((item) =>
    item.visitAuth.map((auth) => auth.visitAuthorizationID),
  );

  await UserInbox.destroy(
    {
      where: {
        activityTable: VisitAuthorization.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: allVisitAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  await VisitAuthorization.destroy({
    where: {
      visitAuthorizationID: {
        [Sequelize.Op.in]: allVisitAuthorizationIds,
      },
    },
    individualHooks: true,
    user: req.userDetails,
    transaction: transaction,
  });

  await Visit.update(
    {
      AuthorizationCriteriaID,
      authorizationStatus,
      updateBy,
      updateByIp,
    },
    {
      where: {
        visitID: {
          [Sequelize.Op.in]: visitRequestIDS,
        },
      },
      transaction: transaction,
    },
  );

  let visitAuthorizationData = [];
  for (const item of visitRequestData) {
    for (const authItem of AuthorizedByUserMasterId) {
      visitAuthorizationData.push({
        visitID: item.visitID,
        userMasterID: authItem,
        authStatus: AuthStatusInAuthorizationRequest.PENDING,
        status: 1,
        createBy: item.userMasterID,
        createByIp,
      });

      // break inner loop if criteria == 5
      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }

    payload = {
      notification: {
        title: notificationTitleTypes.VISIT,
        body: item?.assign?.displayName + ' requested for a Visit.',
      },
      data: {
        screen: notificationScreentTypes.VISIT,
      },
    };

    bulkNotificationObject.push({
      payload: payload,
      iosTokens: iosTokens,
      androidTokens: androidTokens,
    });
  }
  const visitAuthCreateData = await VisitAuthorization.bulkCreate(
    visitAuthorizationData,
    { user: req.userDetails, individualHooks: true, transaction: transaction },
  );

  const visitRequestInboxArray = visitAuthCreateData.map((item) => {
    const visitRequestDatas = visitRequestData.find(
      (bditem) => bditem.visitID == item.visitID,
    );

    return {
      activityTable: VisitAuthorization.getTableName(),
      activityTablePK: item.visitAuthorizationID,
      message: `${visitRequestDatas?.assign?.displayName} has applied for Visit`,
      assignedTo: item?.userMasterID,
      assignedBy: visitRequestDatas?.assignID,
    };
  });

  await UserInbox.bulkCreate(visitRequestInboxArray, {
    transaction: transaction,
  });
  return bulkNotificationObject;
}

async function SalaryIncrementAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const salaryIncrementRequest = await SalaryIncrementRequest.findAll({
    attributes: ['salaryIncrementRequestID', 'userMasterID', 'salaryFromYYYYMM'],
    where: {
      userMasterID: {
        [Sequelize.Op.in]: userMasterID,
      },
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
      status: 1,
    },
    include: [
      {
        as: 'userMaster',
        model: UserMaster,
        attributes: ['userMasterID', 'displayName'],
      },
      {
        as: 'salaryIncreReqAuth',
        model: SalaryIncrementRequestAuthorization,
        attributes: ['salaryIncrementRequestAuthorizationID'],
      },
    ],
  });
  const salaryIncrementRequestIDS = salaryIncrementRequest.map(
    (item) => item.salaryIncrementRequestID,
  );

  const allSalaryIncrementAuthorizationIds = salaryIncrementRequest.flatMap(
    (item) =>
      item.salaryIncreReqAuth.map(
        (auth) => auth.salaryIncrementRequestAuthorizationID,
      ),
  );

  await UserInbox.destroy(
    {
      where: {
        activityTable: SalaryIncrementRequestAuthorization.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: allSalaryIncrementAuthorizationIds,
        },
      },
    },
    { transaction: transaction },
  );

  await SalaryIncrementRequestAuthorization.destroy({
    where: {
      salaryIncrementRequestAuthorizationID: {
        [Sequelize.Op.in]: allSalaryIncrementAuthorizationIds,
      },
    },
    individualHooks: true,
    user: req.userDetails,
    transaction: transaction,
  });

  await SalaryIncrementRequest.update(
    {
      AuthorizationCriteriaID,
      authorizationStatus,
      updateBy,
      updateByIp,
    },
    {
      where: {
        salaryIncrementRequestID: {
          [Sequelize.Op.in]: salaryIncrementRequestIDS,
        },
      },
      transaction: transaction,
    },
  );

  let salaryIncrementAuthorizationData = [];
  for (const item of salaryIncrementRequest) {
    for (const authItem of AuthorizedByUserMasterId) {
      salaryIncrementAuthorizationData.push({
        salaryIncrementRequestID: item.salaryIncrementRequestID,
        userMasterID: authItem,
        authStatus: AuthStatusInAuthorizationRequest.PENDING,
        status: 1,
        createBy: item.userMasterID,
        createByIp,
      });

      // break inner loop if criteria == 5
      if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
        break;
      }
    }
    const monthName =  formatMonth(item.salaryFromYYYYMM);
    payload = {
      notification: {
        title: notificationTitleTypes.SALARYINCREMENT,
        body: `New Salary Structure requested for ${item?.userMaster?.displayName} for the month of ${monthName}.`,
      },
      data: {
        screen: notificationScreentTypes.SALARYINCREMENT,
      },
    };

    bulkNotificationObject.push({
      payload: payload,
      iosTokens: iosTokens,
      androidTokens: androidTokens,
    });
  }
  const salaryIncrementAuthCreateData =
    await SalaryIncrementRequestAuthorization.bulkCreate(
      salaryIncrementAuthorizationData,
      {
        user: req.userDetails,
        individualHooks: true,
        transaction: transaction,
      },
    );

  const salaryIncrementRequestInboxArray = salaryIncrementAuthCreateData.map(
    (item) => {
      const salaryIncrementRequestDatas = salaryIncrementRequest.find(
        (bditem) =>
          bditem.salaryIncrementRequestID == item.salaryIncrementRequestID,
      );
       const monthName =  formatMonth(salaryIncrementRequestDatas.salaryFromYYYYMM);
      return {
        activityTable: SalaryIncrementRequestAuthorization.getTableName(),
        activityTablePK: item.salaryIncrementRequestAuthorizationID,
        message: `New Salary Structure requested for ${salaryIncrementRequestDatas?.userMaster?.displayName} for the month of ${monthName}.`,
        assignedTo: item?.userMasterID,
        assignedBy: salaryIncrementRequestDatas?.assignID,
      };
    },
  );

  await UserInbox.bulkCreate(salaryIncrementRequestInboxArray, {
    transaction: transaction,
  });
  return bulkNotificationObject;
}

async function visitRequestAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
    return res
      .status(200)
      .json({
        status: 400,
        message: 'Invalid data type for find employee or replace employee',
      });
  }
  const visitAuthorizationIdsRemoveInbox = (
    await Visit.findAll({
      attributes: ['visitID'],
      where: {
        authorizationStatus: {
          [Sequelize.Op.in]: [
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        visitID: {
          [Sequelize.Op.in]: sequelize.literal(`(
              SELECT "visitID"
              FROM "visits"
              WHERE "status" = 1
              GROUP BY "visitID"
              HAVING ARRAY_AGG("assignID"::text) @> ARRAY['${findID}', '${replaceID}']
            )`),
        },
      },
      include: [
        {
          required: true,
          model: VisitAuthorization,
          as: 'visitAuth',
          attributes: ['visitAuthorizationID', 'userMasterID'],
          where: {
            userMasterID: findID,
            authStatus: 2,
          },
        },
      ],
    })
  ).flatMap((item) => item.visitAuth.map((auth) => auth.visitAuthorizationID));

  const tourAuthorizationDataUpdate = (
    await VisitAuthorization.findAll({
      attributes: ['visitAuthorizationID'],
      where: {
        userMasterID: findID,
        authStatus: 2,
        visitAuthorizationID: {
          [Sequelize.Op.notIn]: visitAuthorizationIdsRemoveInbox,
        },
      },
      include: [
        {
          required: true,
          model: Visit,
          attributes: [],
          where: {
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
        },
      ],
    })
  ).map((item) => item.visitAuthorizationID);

  await UserInbox.destroy({
    where: {
      activityTable: VisitAuthorization.getTableName(),
      activityTablePK: visitAuthorizationIdsRemoveInbox,
    },
    transaction: transaction,
  });

  await VisitAuthorization.destroy({
    where: {
      visitAuthorizationID: visitAuthorizationIdsRemoveInbox,
    },
    individualHooks: true,
    user: userDetails,
    transaction: transaction,
  });

  await UserInbox.update(
    {
      assignedTo: replaceID,
    },
    {
      where: {
        activityTable: VisitAuthorization.getTableName(),
        activityTablePK: tourAuthorizationDataUpdate,
      },
      transaction: transaction,
    },
  );

  await VisitAuthorization.update(
    {
      userMasterID: replaceID,
    },
    {
      where: {
        visitAuthorizationID: tourAuthorizationDataUpdate,
      },
      individualHooks: true,
      user: userDetails,
      transaction: transaction,
    },
  );

  return;
}

// Course Authorization
async function courseAuthorization(
  req,
  userMasterID,
  authorizationStatus,
  AuthorizationCriteriaID,
  AuthorizedByUserMasterId,
  updateBy,
  createByIp,
  updateByIp,
  iosTokens,
  androidTokens,
  transaction,
) {
  const bulkNotificationObject = [];
  const courseData = await Course.findAll({
    attributes: ['id', 'createdBy', 'title', 'authorizationStatus'],
    where: {
      createdBy: {
        [Sequelize.Op.in]: userMasterID,
      },
      authorizationStatus: {
        [Sequelize.Op.in]: [
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
      status: 1,
    },
    include: [
      {
        as: 'createBy',
        model: UserMaster,
        attributes: ['userMasterID', 'displayName'],
      },
      {
        as: 'courseAuthorizations',
        model: CourseAuthorizationRequest,
        attributes: ['AuthorizationRequestId'],
        required: false,
      },
    ],
    transaction,
  });

  const courseIds = courseData.map((item) => item.id);
  const allCourseAuthIds = courseData.flatMap((item) =>
    (item.courseAuthorizations || []).map((auth) => auth.AuthorizationRequestId),
  );

  if (allCourseAuthIds.length > 0) {
    await UserInbox.destroy(
      {
        where: {
          activityTable: CourseAuthorizationRequest.getTableName(),
          activityTablePK: {
            [Sequelize.Op.in]: allCourseAuthIds,
          },
        },
      },
      { transaction },
    );

    await CourseAuthorizationRequest.destroy(
      {
        where: {
          AuthorizationRequestId: {
            [Sequelize.Op.in]: allCourseAuthIds,
          },
        },
      },
      { transaction },
    );
  }

  if (courseIds.length > 0) {
    await Course.update(
      {
        AuthorizationCriteriaID,
        authorizationStatus,
        updateBy,
        updateByIp,
      },
      {
        where: {
          id: {
            [Sequelize.Op.in]: courseIds,
          },
        },
        transaction,
      },
    );

    let courseAuthData = [];
    for (const item of courseData) {
      for (const authItem of AuthorizedByUserMasterId) {
        courseAuthData.push({
          TableName: 'courses',
          ReferenceID: item.id,
          userMasterID: authItem,
          authstatus: AuthStatusInAuthorizationRequest.PENDING,
          status: 1,
          createBy: item.createdBy,
          createByIp,
        });

        if (AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO) {
          break;
        }
      }

      const creatorName = item.createBy?.displayName || 'User';
      const payload = {
        notification: {
          title: 'Course Authorization',
          body: `${creatorName} requested authorization for course '${item.title}'.`,
        },
        data: {
          screen: 'courseauth',
        },
      };

      bulkNotificationObject.push({
        payload,
        iosTokens,
        androidTokens,
      });
    }

    const courseAuthCreateData = await CourseAuthorizationRequest.bulkCreate(
      courseAuthData,
      { user: req.userDetails, individualHooks: true, transaction },
    );

    const courseInboxArray = courseAuthCreateData.map((item) => {
      const courseItem = courseData.find((c) => c.id == item.ReferenceID);
      const creatorName = courseItem?.createBy?.displayName || 'User';
      return {
        activityTable: CourseAuthorizationRequest.getTableName(),
        activityTablePK: item.AuthorizationRequestId,
        message: `${creatorName} has requested authorization for course '${courseItem?.title || 'Course'}'`,
        assignedTo: item.userMasterID,
        assignedBy: courseItem?.createdBy,
      };
    });

    if (courseInboxArray.length > 0) {
      await UserInbox.bulkCreate(courseInboxArray, { transaction });
    }
  }

  return bulkNotificationObject;
}

// Course Authorization Replace
async function courseAuthorizationReplace(
  findID,
  replaceID,
  transaction,
  userDetails,
) {
  if (!Number.isInteger(findID) || !Number.isInteger(replaceID)) {
    return;
  }
  const courseAuthData = await CourseAuthorizationRequest.findAll({
    attributes: ['AuthorizationRequestId', 'ReferenceID'],
    where: {
      userMasterID: findID,
      authstatus: 2,
      status: 1,
    },
    include: [
      {
        required: true,
        model: Course,
        as: 'course',
        attributes: ['id'],
        where: {
          authorizationStatus: {
            [Sequelize.Op.in]: [
              AuthorizationStatusType.PEDING_ONE,
              AuthorizationStatusType.PEDING_TWO,
            ],
          },
          status: 1,
        },
      },
    ],
    transaction,
  });

  const authIds = courseAuthData.map((item) => item.AuthorizationRequestId);

  if (authIds.length > 0) {
    await CourseAuthorizationRequest.update(
      {
        userMasterID: replaceID,
        updateBy: userDetails.userMasterId,
        updateByIp: userDetails.userIpAddress || null,
      },
      {
        where: {
          AuthorizationRequestId: {
            [Sequelize.Op.in]: authIds,
          },
        },
        transaction,
      },
    );

    await UserInbox.update(
      {
        assignedTo: replaceID,
      },
      {
        where: {
          activityTable: CourseAuthorizationRequest.getTableName(),
          activityTablePK: {
            [Sequelize.Op.in]: authIds,
          },
        },
        transaction,
      },
    );
  }
}

module.exports = {
  workFromHomeAuthorization,
  expenseAuthorization,
  expenseAdvanceRequestAuthorization,
  overtimeAuthorization,
  coffAuthorization,
  extraDaysAuthorization,
  resignationAuthorization,
  getPassAuthorization,
  attendanceCorrectionAuthorization,
  leaveAuthorization,
  shortLeaveAuthorization,
  bankDetailRequestAuthorization,
  tourRequestAuthorization,
  visitRequestAuthorization,
  courseAuthorization,

  //Authorization Replace
  workFromHomeAuthorizationReplace,
  expenseAuthorizationReplace,
  expenseAdvanceRequestAuthorizationReplace,
  overtimeAuthorizationReplace,
  resignationAuthorizationReplace,
  gatePassAuthorizationReplace,
  coffAuthorizationReplace,
  leaveAuthorizationReplace,
  shortLeaveAuthorizationReplace,
  attendanceCorrectionAuthorizationReplace,
  bankDetailRequestAuthorizationReplace,
  loanRequestAuthorization,
  manPowerRequisitionAuthorization,
  manPowerRequisitionRequestAuthorizationReplace,
  tourRequestAuthorizationReplace,
  visitRequestAuthorizationReplace,
  SalaryIncrementAuthorization,
  salaryIncrementRequestAuthorizationReplace,
  salaryIncrementRequestAuthorization,
  courseAuthorizationReplace,
};
