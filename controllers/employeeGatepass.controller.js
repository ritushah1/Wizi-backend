const { Op } = require('sequelize');
const EmployeeGatepass = require('../models/employeeGatepass');
const UserMaster = require('../models/userMaster');
const { generateExcelForEmployeeGatePass } = require('../utils/exportData');
const { usermessage } = require('../response_message/message');
const {
  userAttributes,
  statusCodes,
  companyAttributes,
} = require('../utils/commonVars');
const EmployeeGatepassCheckInOut = require('../models/employeeGatepassCheckInOut');
const { CustomError } = require('../utils/customError');
const sequelize = require('../config/database');
const companyMaster = require('../models/companyMaster');
const {
  accessibleUsers,
  asiaKolkataDateTime,
  sendBulkNotification,
} = require('../utils/commonUtilFunctions');
const GatePassAuthorization = require('../models/gatePassAuthorization');
const AuthorizationMaster = require('../models/authorizationMaster');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');

const {
  employeeDepartment,
  employeeDesignation,
  employeeBranch,
} = require('../utils/commonUtilFunctions');
const EmployeeDesignation = require('../models/employeeDesignation');
const { Sequelize } = require('sequelize');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const {
  authorizationCriteriaType,
  AuthStatusInAuthorizationRequest,
  notificationTitleTypes,
  notificationScreentTypes,
  singleMultipleCheckInOutTypes,
} = require('../utils/dbUtils');
const UserInbox = require('../models/UserInbox');
const userMasterService = require('../services/userMasterService');
const { json } = require('body-parser');

exports.createMyGatepass = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      description,
      date,
      fromTime,
      toTime,
      status,
      purposeFor,
      userMasterID,
      companyMasterID,
      checkInOutType,
    } = req.body;

    const gatePassData = req.body;
    const iosTokens = [];
    const androidTokens = [];
    let userData;

    let authorizationmaster = await AuthorizationMaster.findOne({
      where: { authorizationMasterID: 6 },
    });

    if (!authorizationmaster) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        status: 401,
        message: 'Authorization Master Not Found',
      });
    }

    let authorizationdetails = await AuthorizationDetails.findOne({
      where: {
        AuthorizationMasterID: authorizationmaster.authorizationMasterID,
        userMasterID: gatePassData.userMasterID,
        status: 1,
      },
      raw: true,
    });

    let authorizationStatus;
    let AuthorizationCriterias = null;
    if (authorizationdetails) {
      AuthorizationCriterias = await AuthorizationCriteria.findOne({
        attributes: ['AuthorizationCriteriaID', 'AuthorizationCriteria'],
        where: {
          AuthorizationCriteriaID: authorizationdetails.AuthorizationCriteriaID,
          status: 1,
        },
        raw: true,
      });

      authorizationStatus =
        AuthorizationCriterias.AuthorizationCriteria == 'Sequeance No' ? 2 : 1;
    } else {
      authorizationStatus = 0;
    }

    const empgatepass = await EmployeeGatepass.create(
      {
        description,
        date,
        fromTime,
        toTime,
        purposeFor,
        status,
        authorizationStatus,
        userMasterId: userMasterID,
        companyMasterId: companyMasterID,
        reqCheckInOutType: checkInOutType,
        approvedCheckInOutType: null,
      },
      { user: req.userDetails, transaction },
    );

    if (authorizationStatus > 0) {
      const employeeGatePassAuthorizationObject = [];
      const authorizePersonsIDs = [];
      for (const userId of authorizationdetails.AuthorizedByUserMasterId) {
        employeeGatePassAuthorizationObject.push({
          TableName: 'EmployeeGatePass',
          ReferenceID: empgatepass.id,
          userMasterID: userId,
          status: 1,
          authstatus: AuthStatusInAuthorizationRequest.PENDING,
          createBy: req.userDetails.userMasterId,
          createByIp: req.ip,
          checkInOutType: null,
        });

        authorizePersonsIDs.push(userId);
        if (
          AuthorizationCriterias.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          break;
        }
      }

      const employeeGatePassAuthorizationCreateData =
        await GatePassAuthorization.bulkCreate(
          employeeGatePassAuthorizationObject,
          { transaction },
        );

      const authorizeUserData = await userMasterService.getMultipleUserData(
        ['userMasterID', 'displayName', 'firebaseToken', 'deviceType'],
        { userMasterID: { [Op.in]: [...authorizePersonsIDs, userMasterID] } },
      );

      authorizeUserData.forEach((user) => {
        if (authorizePersonsIDs.includes(user.userMasterID)) {
          if (user.deviceType === 'ios' && user.firebaseToken) {
            iosTokens.push(user.firebaseToken);
          } else if (user.deviceType === 'android' && user.firebaseToken) {
            androidTokens.push(user.firebaseToken);
          }
        }
        if (userMasterID == user.userMasterID) {
          userData = user;
        }
      });

      payload = {
        notification: {
          title: notificationTitleTypes.EMPLOYEEGATEPASS,
          body: `${userData.displayName} requested for GatePass.`,
        },
        data: {
          screen: notificationScreentTypes.EMPLOYEEGATEPASS,
        },
      };

      //authorization inbox create
      let userInboxArray = [];
      employeeGatePassAuthorizationCreateData.forEach((item) => {
        userInboxArray.push({
          activityTable: GatePassAuthorization.getTableName(),
          activityTablePK: item.AuthorizationRequestId,
          message: `${userData.displayName} has applied for Gate Pass request from ${date}`,
          assignedTo: item.userMasterID,
          assignedBy: userMasterID,
        });
      });

      await UserInbox.bulkCreate(userInboxArray, { transaction });
    }

    await transaction.commit();

    if (iosTokens.length > 0) {
      sendBulkNotification(iosTokens, payload, 'ios');
    }

    if (androidTokens.length > 0) {
      sendBulkNotification(androidTokens, payload, 'android');
    }

    return res.status(200).json({
      data: empgatepass,
      message: 'Gate pass created successfully',
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.updateMyGatepass = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      description,
      date,
      fromTime,
      toTime,
      purposeFor,
      userMasterID,
      status,
      rejectionRemarks,
      checkInOutType,
    } = req.body;
    const iosTokens = [];
    const androidTokens = [];
    let userData;

    const empgatepass = await EmployeeGatepass.findByPk(id);

    if (!empgatepass) {
      await transaction.rollback();
      return res.status(statusCodes.NOT_FOUND).json({
        message: usermessage.notFoundMessage('employeeGatepass'),
      });
    }

    let authorizationmaster = await AuthorizationMaster.findOne({
      where: { authorizationMasterID: 6 },
    });

    if (!authorizationmaster) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        status: 401,
        message: 'Authorization Master Not Found',
      });
    }

    if (description) empgatepass.description = description;
    if (date) empgatepass.date = date;
    if (fromTime) empgatepass.fromTime = fromTime;
    if (toTime) empgatepass.toTime = toTime;
    if (purposeFor) empgatepass.purposeFor = purposeFor;
    if (checkInOutType) {
      empgatepass.reqCheckInOutType = checkInOutType;
    }
    if (status) empgatepass.status = status;
    if (userMasterID) empgatepass.userMasterId = userMasterID;
    if (rejectionRemarks) empgatepass.rejectionRemarks = rejectionRemarks;

    await empgatepass.save({ user: req.userDetails, transaction });

    let authorizationdetails = await AuthorizationDetails.findOne({
      where: {
        AuthorizationMasterID: authorizationmaster.authorizationMasterID,
        userMasterID: userMasterID,
        status: 1,
      },
      raw: true,
    });

    let authorizationStatus;
    let AuthorizationCriterias = null;
    if (authorizationdetails) {
      AuthorizationCriterias = await AuthorizationCriteria.findOne({
        attributes: ['AuthorizationCriteriaID', 'AuthorizationCriteria'],
        where: {
          AuthorizationCriteriaID: authorizationdetails.AuthorizationCriteriaID,
          status: 1,
        },
        raw: true,
      });

      authorizationStatus =
        AuthorizationCriterias.AuthorizationCriteria == 'Sequeance No' ? 2 : 1;
    } else {
      authorizationStatus = 0;
    }

    if (authorizationStatus > 0) {
      const authorizationRequestIDS = (
        await GatePassAuthorization.findAll({
          attributes: ['AuthorizationRequestId'],
          where: {
            TableName: 'EmployeeGatePass',
            ReferenceID: empgatepass.id,
          },
          raw: true,
        })
      ).map((r) => r.AuthorizationRequestId);

      await UserInbox.destroy({
        where: {
          activityTable: GatePassAuthorization.getTableName(),
          activityTablePK: { [Op.in]: authorizationRequestIDS },
        },
        transaction,
      });

      await GatePassAuthorization.destroy({
        where: {
          TableName: 'EmployeeGatePass',
          ReferenceID: empgatepass.id,
        },
        transaction,
      });

      const employeeGatePassAuthorizationObject = [];
      const authorizePersonsIDs = [];
      for (const userId of authorizationdetails.AuthorizedByUserMasterId) {
        employeeGatePassAuthorizationObject.push({
          TableName: 'EmployeeGatePass',
          ReferenceID: empgatepass.id,
          userMasterID: userId,
          status: 1,
          authstatus: AuthStatusInAuthorizationRequest.PENDING,
          createBy: req.userDetails.userMasterId,
          createByIp: req.ip,
          checkInOutType: null,
        });

        authorizePersonsIDs.push(userId);
        if (
          AuthorizationCriterias.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          break;
        }
      }

      const employeeGatePassAuthorizationCreateData =
        await GatePassAuthorization.bulkCreate(
          employeeGatePassAuthorizationObject,
          { transaction },
        );

      const authorizeUserData = await userMasterService.getMultipleUserData(
        ['userMasterID', 'displayName', 'firebaseToken', 'deviceType'],
        {
          userMasterID: {
            [Op.in]: [...authorizePersonsIDs, userMasterID],
          },
        },
      );

      authorizeUserData.forEach((user) => {
        if (authorizePersonsIDs.includes(user.userMasterID)) {
          if (user.deviceType === 'ios' && user.firebaseToken) {
            iosTokens.push(user.firebaseToken);
          } else if (user.deviceType === 'android' && user.firebaseToken) {
            androidTokens.push(user.firebaseToken);
          }
        }
        if (userMasterID == user.userMasterID) {
          userData = user;
        }
      });

      payload = {
        notification: {
          title: notificationTitleTypes.EMPLOYEEGATEPASS,
          body: `${userData.displayName} requested for GatePass.`,
        },
        data: {
          screen: notificationScreentTypes.EMPLOYEEGATEPASS,
        },
      };

      //authorization inbox create
      let userInboxArray = [];
      employeeGatePassAuthorizationCreateData.forEach((item) => {
        userInboxArray.push({
          activityTable: GatePassAuthorization.getTableName(),
          activityTablePK: item.AuthorizationRequestId,
          message: `${userData.displayName} has applied for Gate Pass request from ${date}`,
          assignedTo: item.userMasterID,
          assignedBy: userMasterID,
        });
      });

      await UserInbox.bulkCreate(userInboxArray, { transaction });
    }

    await transaction.commit();

    if (iosTokens.length > 0) {
      sendBulkNotification(iosTokens, payload, 'ios');
    }

    if (androidTokens.length > 0) {
      sendBulkNotification(androidTokens, payload, 'android');
    }

    return res.status(statusCodes.OK).json({
      data: empgatepass,
      message: 'Gate pass updated successfully',
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
exports.updateMyGatepassV2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      id,
      description,
      date,
      fromTime,
      toTime,
      purposeFor,
      userMasterID,
      status,
      rejectionRemarks,
      checkInOutType,
    } = req.body;
    const iosTokens = [];
    const androidTokens = [];
    let userData;

    const empgatepass = await EmployeeGatepass.findByPk(id);

    if (!empgatepass) {
      await transaction.rollback();
      return res.status(statusCodes.NOT_FOUND).json({
        message: usermessage.notFoundMessage('employeeGatepass'),
      });
    }

    let authorizationmaster = await AuthorizationMaster.findOne({
      where: { authorizationMasterID: 6 },
    });

    if (!authorizationmaster) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        status: 401,
        message: 'Authorization Master Not Found',
      });
    }

    if (description) empgatepass.description = description;
    if (date) empgatepass.date = date;
    if (fromTime) empgatepass.fromTime = fromTime;
    if (toTime) empgatepass.toTime = toTime;
    if (purposeFor) empgatepass.purposeFor = purposeFor;
    if (status) empgatepass.status = status;
    if (userMasterID) empgatepass.userMasterId = userMasterID;
    if (rejectionRemarks) empgatepass.rejectionRemarks = rejectionRemarks;
    if (checkInOutType) {
      empgatepass.reqCheckInOutType = checkInOutType;
    }
    await empgatepass.save({ user: req.userDetails, transaction });

    let authorizationdetails = await AuthorizationDetails.findOne({
      where: {
        AuthorizationMasterID: authorizationmaster.authorizationMasterID,
        userMasterID: userMasterID,
        status: 1,
      },
      raw: true,
    });

    let authorizationStatus;
    let AuthorizationCriterias = null;
    if (authorizationdetails) {
      AuthorizationCriterias = await AuthorizationCriteria.findOne({
        attributes: ['AuthorizationCriteriaID', 'AuthorizationCriteria'],
        where: {
          AuthorizationCriteriaID: authorizationdetails.AuthorizationCriteriaID,
          status: 1,
        },
        raw: true,
      });

      authorizationStatus =
        AuthorizationCriterias.AuthorizationCriteria == 'Sequeance No' ? 2 : 1;
    } else {
      authorizationStatus = 0;
    }

    if (authorizationStatus > 0) {
      const authorizationRequestIDS = (
        await GatePassAuthorization.findAll({
          attributes: ['AuthorizationRequestId'],
          where: {
            TableName: 'EmployeeGatePass',
            ReferenceID: empgatepass.id,
          },
          raw: true,
        })
      ).map((r) => r.AuthorizationRequestId);

      await UserInbox.destroy({
        where: {
          activityTable: GatePassAuthorization.getTableName(),
          activityTablePK: { [Op.in]: authorizationRequestIDS },
        },
        transaction,
      });

      await GatePassAuthorization.destroy({
        where: {
          TableName: 'EmployeeGatePass',
          ReferenceID: empgatepass.id,
        },
        transaction,
      });

      const employeeGatePassAuthorizationObject = [];
      const authorizePersonsIDs = [];
      for (const userId of authorizationdetails.AuthorizedByUserMasterId) {
        employeeGatePassAuthorizationObject.push({
          TableName: 'EmployeeGatePass',
          ReferenceID: empgatepass.id,
          userMasterID: userId,
          status: 1,
          authstatus: AuthStatusInAuthorizationRequest.PENDING,
          createBy: req.userDetails.userMasterId,
          createByIp: req.ip,
          checkInOutType: null,
        });

        authorizePersonsIDs.push(userId);
        if (
          AuthorizationCriterias.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          break;
        }
      }

      const employeeGatePassAuthorizationCreateData =
        await GatePassAuthorization.bulkCreate(
          employeeGatePassAuthorizationObject,
          { transaction },
        );

      const authorizeUserData = await userMasterService.getMultipleUserData(
        ['userMasterID', 'displayName', 'firebaseToken', 'deviceType'],
        {
          userMasterID: {
            [Op.in]: [...authorizePersonsIDs, userMasterID],
          },
        },
      );

      authorizeUserData.forEach((user) => {
        if (authorizePersonsIDs.includes(user.userMasterID)) {
          if (user.deviceType === 'ios' && user.firebaseToken) {
            iosTokens.push(user.firebaseToken);
          } else if (user.deviceType === 'android' && user.firebaseToken) {
            androidTokens.push(user.firebaseToken);
          }
        }
        if (userMasterID == user.userMasterID) {
          userData = user;
        }
      });

      payload = {
        notification: {
          title: notificationTitleTypes.EMPLOYEEGATEPASS,
          body: `${userData.displayName} requested for GatePass.`,
        },
        data: {
          screen: notificationScreentTypes.EMPLOYEEGATEPASS,
        },
      };

      //authorization inbox create
      let userInboxArray = [];
      employeeGatePassAuthorizationCreateData.forEach((item) => {
        userInboxArray.push({
          activityTable: GatePassAuthorization.getTableName(),
          activityTablePK: item.AuthorizationRequestId,
          message: `${userData.displayName} has applied for Gate Pass request from ${date}`,
          assignedTo: item.userMasterID,
          assignedBy: userMasterID,
        });
      });

      await UserInbox.bulkCreate(userInboxArray, { transaction });
    }

    await transaction.commit();

    if (iosTokens.length > 0) {
      sendBulkNotification(iosTokens, payload, 'ios');
    }

    if (androidTokens.length > 0) {
      sendBulkNotification(androidTokens, payload, 'android');
    }

    return res.status(statusCodes.OK).json({
      data: empgatepass,
      message: 'Gate pass updated successfully',
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};


exports.createEmployeeGatepass = async (req, res, next) => {

  try {
    const {
      description,
      date,
      fromTime,
      toTime,
      status,
      purposeFor,
      userMasterID,
      companyMasterID,
      checkInOutType,
    } = req.body;

    if (checkInOutType && (!Object.values(singleMultipleCheckInOutTypes).includes(checkInOutType))) {
      return res.status(statusCodes.BAD_REQUEST).json({
        data: 400,
        message: 'Please provide a valid Check-In/Check-Out type.',
      });
    }
  
    const empgatepass = await EmployeeGatepass.create(
      {
        description,
        date,
        fromTime,
        toTime,
        purposeFor,
        status,
        authorizationStatus: 3,
        userMasterId: userMasterID,
        companyMasterId: companyMasterID,
        reqCheckInOutType: checkInOutType,
        approvedCheckInOutType: checkInOutType,
      },
      { user: req.userDetails },
    );

    return res.status(statusCodes.OK).json({
      data: empgatepass,
      message: usermessage.addMessage('Employee Gate pass'),
    });
  } catch (err) {
    next(err);
  }
};

exports.updateEmployeeGatepass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      description,
      date,
      fromTime,
      toTime,
      purposeFor,
      userMasterId,
      status,
      rejectionRemarks,
      checkInOutType,
    } = req.body;
    const empgatepass = await EmployeeGatepass.findByPk(id);

    if (!empgatepass) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: usermessage.notFoundMessage('employeeGatepass'),
      });
    }

    if (description) empgatepass.description = description;
    if (date) empgatepass.date = date;
    if (fromTime) empgatepass.fromTime = fromTime;
    if (toTime) empgatepass.toTime = toTime;
    if (purposeFor) empgatepass.purposeFor = purposeFor;
    if (status) empgatepass.status = status;
    if (userMasterId) empgatepass.userMasterId = userMasterId;
    if (rejectionRemarks) empgatepass.rejectionRemarks = rejectionRemarks;
    if (checkInOutType) {
      empgatepass.reqCheckInOutType = checkInOutType;
    }
    await empgatepass.save({ user: req.userDetails });
    return res.status(statusCodes.OK).json({
      status:200,
      data: empgatepass,
      message: usermessage.updateMessage('employeeGatepass'),
    });
  } catch (err) {
    next(err);
  }
};

exports.employeeGatePassCheckInCheckOut = async (req, res, next) => {
  try {
    const { employeeGatepassId, type, address } = req.body;

    const allowedTypes = ['Checkin', 'Checkout', 'FinalCheckin'];

    if (!allowedTypes.includes(type)) {
      throw new CustomError(
        'Invalid Check-In/Check-Out action.',
        statusCodes.BAD_REQUEST,
      );
    }

    const gatepass = await EmployeeGatepass.findByPk(
      employeeGatepassId,
    );

    if (!gatepass) {
      throw new CustomError(
        'Employee Gate Pass not found.',
        statusCodes.NOT_FOUND,
      );
    }

    const checkInOutType =
      gatepass.approvedCheckInOutType ||
      gatepass.reqCheckInOutType;

    const lastCheck = await EmployeeGatepassCheckInOut.findOne({
      where: { employeeGatepassId },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    });

    if (lastCheck?.type === 'FinalCheckin') {
      throw new CustomError(
        'Final Check-In is already completed. No further actions are allowed.',
        statusCodes.BAD_REQUEST,
      );
    }

    if (lastCheck?.type === 'Checkin' && type !== 'Checkout') {
      throw new CustomError(
        'You must Check-Out before performing another action.',
        statusCodes.BAD_REQUEST,
      );
    }

    const { date: currentDate, time: currentTime } =
      getCurrentIndiaDateTime();

    const attachment =
      req.files?.length > 0 ? req.files[0].path : undefined;

    await EmployeeGatepassCheckInOut.create(
      {
        employeeGatepassId,
        date: currentDate,
        time: currentTime,
        type,
        address,
        ...(attachment ? { attachment } : {}),
      },
      { user: req.userDetails },
    );

    const messages = {
      Checkin: 'Checked in successfully!',
      Checkout: 'Checked out successfully!',
      FinalCheckin: 'Final check-in completed successfully!',
    };

    return res.status(statusCodes.OK).json({
      message: messages[type],
    });
  } catch (error) {
    next(error);
  }
};


function getCurrentIndiaDateTime() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function checkFromAndToTime(time1, time2, Type) {
  const [hours1, minutes1] = time1.split(':').map(Number);
  const [hours2, minutes2] = time2.split(':').map(Number);

  const fromTime = Number(hours1 * 60) + Number(minutes1);
  const toTime = Number(hours2 * 60) + Number(minutes2);

  if (fromTime > toTime) {
    return `${Type} is less than Pervious Check-In/Out. ${Type} need to greater than Pervious Check-In/Out.`;
  } else if (fromTime === toTime) {
    return `${Type} is equal to Check-In/Out. ${Type} need to greater than Pervious Check-In/Out.`;
  }
}

exports.getEmployeeGatepassDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const empgatepass = await EmployeeGatepass.findByPk(id, {
      include: [
        {
          model: companyMaster,
          attributes: companyAttributes,
        },
        {
          model: UserMaster,
          as: 'createdByUser',
          attributes: userAttributes,
        },
        {
          model: UserMaster,
          as: 'employee',
          attributes: userAttributes,
        },
      ],
    });

    if (!empgatepass)
      return res.status(statusCodes.NOT_FOUND).json({
        message: usermessage.notFoundMessage('EmployeeGatepass'),
      });

    return res.status(statusCodes.OK).json({
      data: empgatepass,
      message: usermessage.fetchMessage('EmployeeGatepass'),
    });
  } catch (err) {
    next(err);
  }
};

exports.listEmployeeGatepass = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      withDeleted,
      userMasterID,
      companyMasterID,
      status,
      search,
      sortByField,
      sortByValue,
      exportData,
      exportFileType,
      startDate,
      endDate,
    } = req.query;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const condition = {};
    if (status) {
      const statusArray = status.split(',').map(Number);
      condition.authorizationStatus = { [Op.in]: statusArray };
    }
    if (userMasterID) condition.userMasterId = userMasterID;

    if (search)
      condition[Op.or] = [
        { '$employee.displayName$': { [Op.iLike]: `%${search}%` } },
        { '$companyMaster.companyName$': { [Op.iLike]: `%${search}%` } },
      ];

    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };
    if (companyMasterID) {
      req.userDetails.accessibleCompanies = companyMasterID;
      companyFilter.companyMasterID = +companyMasterID;
    }

    if (startDate && endDate)
      condition.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };

    const order =
      sortByField && sortByValue
        ? [[sortByField, sortByValue]]
        : [['createdAt', 'DESC']];
    const paginationQuery = {};
    if (!exportData) {
      paginationQuery.offset = (page - 1) * pageSize;
      paginationQuery.limit = +pageSize;
    }

    let orderFilter = {};
    if (exportData) orderFilter = [['createdAt', 'ASC']];
    if (!exportData) orderFilter = [['createdAt', 'DESC']];

    const empgatepass = await EmployeeGatepass.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      paranoid: withDeleted !== 'true',
      include: [
        {
          model: companyMaster,
          attributes: companyAttributes,
          where: companyFilter,
        },
        {
          model: UserMaster,
          as: 'createdByUser',
          attributes: userAttributes,
        },
        {
          model: UserMaster,
          as: 'employee',
          attributes: userAttributes,
          required: true,
          ...accessibleUsers(req.userDetails),
          include: [
            {
              separate: true,
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
              separate: true,
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
      nest: true,
      distinct: true,
    });

    for (let item of empgatepass.rows) {
      const getLastCheck = await EmployeeGatepassCheckInOut.findAll({
        where: { employeeGatepassId: item.id },
        order: orderFilter,
      });

      item.dataValues.lastCheck = getLastCheck;
    }

    if (exportData && empgatepass.rows.length == 0) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: usermessage.notFoundMessage('EmployeeGatepass'),
      });
    }

    //for excel
    if (exportData) {
      const final1 = [];
      empgatepass.rows.map((item, index) => {
        const companyInfo = [
          index + 1,
          item.employee.displayName,
          item.companyMaster.companyName,
          item.employee.employeeBranches?.[0]?.branchMaster?.branchName || '',
          item.employee.employeeDepartments?.[0]?.department?.departmentName ||
            '',
          item.employee.employeeDesignations?.[0]?.designation
            ?.designationName || '',
          item.status == 'Reject' ? 'Rejected' : item.status,
          item.description,
          item.date
            ? item.date.slice(8, 10) +
              '-' +
              item.date.slice(5, 7) +
              '-' +
              item.date.slice(0, 4)
            : '',
          convertTo12HourFormat(item.fromTime),
          convertTo12HourFormat(item.toTime),
          item.purposeFor,
          item.rejectionRemarks ? item.rejectionRemarks : '',
        ];

        if (item.dataValues.lastCheck.length === 0) {
          final1.push([...companyInfo, '', '', '', '']);
        } else {
          item.dataValues.lastCheck.forEach((lastCheckItem) => {
            const { date, time, type, address } = lastCheckItem;
            final1.push([
              ...companyInfo,
              date
                ? date.slice(8, 10) +
                  '-' +
                  date.slice(5, 7) +
                  '-' +
                  date.slice(0, 4)
                : '',
              ,
              convertTo12HourFormat(time),
              type,
              address,
            ]);
          });
        }
      });

      await generateExcelForEmployeeGatePass(
        final1,
        'empgatepass',
        exportFileType,
        res,
      );
      return;
    }

    return res.status(statusCodes.OK).json({
      message: usermessage.fetchMessage('EmployeeGatepass'),
      data: empgatepass.rows,
      totalcount: empgatepass.count,
      page: +page,
      pageSize: paginationQuery.limit,
    });
  } catch (err) {
    next(err);
  }
};

function convertTo12HourFormat(time24) {
  if (!time24) return '';

  let [hours, minutes] = time24.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes < 10 ? '0' : ''}${minutes} ${ampm}`;
}

exports.deleteEmployeeGatepass = async (req, res, next) => {
  const transaction = await sequelize.transaction(); // start transaction
  try {
    const { id } = req.params;

    const empgatepass = await EmployeeGatepass.findByPk(id, { transaction });

    if (!empgatepass) {
      await transaction.rollback();
      return res.status(statusCodes.OK).json({
        message: usermessage.notFoundMessage('EmployeeGatepass'),
      });
    }

    await empgatepass.destroy({ user: req.userDetails, transaction });

    const authorizationRequestIDS = (
      await GatePassAuthorization.findAll({
        attributes: ['AuthorizationRequestId'],
        where: {
          TableName: 'EmployeeGatePass',
          ReferenceID: id,
        },
        raw: true,
        transaction,
      })
    ).map((r) => r.AuthorizationRequestId);

    if (authorizationRequestIDS.length > 0) {
      await UserInbox.destroy({
        where: {
          activityTable: GatePassAuthorization.getTableName(),
          activityTablePK: { [Op.in]: authorizationRequestIDS },
        },
        transaction,
      });
    }

    await GatePassAuthorization.destroy({
      where: {
        TableName: 'EmployeeGatePass',
        ReferenceID: id,
      },
      transaction,
    });

    await transaction.commit();

    return res.status(statusCodes.OK).json({
      message: usermessage.deleteMessage('EmployeeGatepass'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postUpdategatePass1 = async (req, res, next) => {
  try {
    const { id, inTime, outTime, checkINattachment, checkOUTattachment } =
      req.body;
    const existingRecord = await EmployeeGatepassCheckInOut.findOne({
      where: { id },
    });

    if (!existingRecord) {
      throw new CustomError(
        usermessage.notFoundMessage('Employee Gatepass'),
        statusCodes.NOT_FOUND,
      );
    }

    if (outTime) existingRecord.outTime = outTime;
    if (inTime) existingRecord.inTime = inTime;
    if (checkINattachment) existingRecord.checkINattachment = checkINattachment;
    if (checkOUTattachment)
      existingRecord.checkOUTattachment = checkOUTattachment;
    await existingRecord.save({ user: req.userDetails });
    return res.status(200).json({
      // data: updatedRecord,
      message: 'Employee gatepass record updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};
exports.getEmployeeGatepassDetailsV2 = async (req, res, next) => {
  try {
    const { id, userMasterID } = req.body;
    if (!id || !userMasterID) {
      return res
        .status(200)
        .json({ status: 400, message: 'Please provide valid parameters' });
    }
    const empgatepass = await EmployeeGatepass.findOne({
      where: { id: +id, userMasterId: +userMasterID },
      include: [
        {
          model: companyMaster,
          attributes: companyAttributes,
        },
        {
          model: UserMaster,
          as: 'createdByUser',
          attributes: userAttributes,
        },
        {
          model: UserMaster,
          as: 'employee',
          attributes: userAttributes,
        },
      ],
    });

    if (!empgatepass)
      return res.status(statusCodes.NOT_FOUND).json({
        message: usermessage.notFoundMessage('EmployeeGatepass'),
      });

    return res.status(statusCodes.OK).json({
      data: empgatepass,
      message: usermessage.fetchMessage('EmployeeGatepass'),
    });
  } catch (err) {
    next(err);
  }
};
