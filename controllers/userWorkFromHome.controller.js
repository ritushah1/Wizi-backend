const message = require('../response_message/message');
const e = require('express');
const {
  WorkFromHomeTypes,
  notificationScreentTypes,
  notificationTitleTypes,
  authorizationCriteriaType,
  AuthorizationStatusType,
  AuthStatusInAuthorizationRequest,
} = require('../utils/dbUtils');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const AuthorizationDetailService = require('../services/authorizationDetailService');
const UserWorkFromHomeService = require('../services/userWorkFromHomeService');
const WorkFromHomeAuthorizationService = require('../services/workFromHomeAuthorization');
const sequelize = require('../config/database');
const { Op, Sequelize } = require('sequelize');
const { statusCodes } = require('../utils/commonVars');
const UserMaster = require('../models/userMaster');
const WorkFromHomeAuthorization = require('../models/workFromHomeAuthorizations');
const {
  asiaKolkataDateTime,
  sendBulkNotification,
} = require('../utils/commonUtilFunctions');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const Designation = require('../models/designation');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const EmployeeBranch = require('../models/employeeBranch');
const hrLeaveMonthlyTransService = require('../services/hrLeaveMonthlyTransService');
const UserWorkFromHome = require('../models/userWorkFromHome');
const workFromHomeTransactionService = require('../services/workFromHomeTransactionService');
const userWorkFromHomeService = require('../services/userWorkFromHomeService');
const userInboxService = require('../services/userInboxService');
const userMasterService = require('../services/userMasterService');
const WorkFromHome = require('../models/userWorkFromHome');

exports.list = async (req, res, next) => {
  try {
    let {
      page = 1,
      pageSize = 10,
      sortByField,
      sortByValue,
      fromDate,
      toDate,
      dayType,
    } = req.query;

    const allowedKeys = [
      'page',
      'pageSize',
      'sortByField',
      'sortByValue',
      'fromDate',
      'toDate',
      'dayType',
    ];

    const invalidKeys = invalidKeyParams(req.query, allowedKeys);

    if (invalidKeys.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid query parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    page = parseInt(page);
    pageSize = parseInt(pageSize);

    if (!sortByField) {
      sortByField = 'createdAt';
    }

    if (!sortByValue) {
      sortByValue = 'DESC';
    }

    const order = [[sortByField, sortByValue]];
    const where = {
      userMasterID: req.userDetails.userMasterId,
    };
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (fromDate && toDate) {
      where[Op.or] = [
        { fromDate: { [Op.between]: [fromDate, toDate] } },
        { toDate: { [Op.between]: [fromDate, toDate] } },
        { fromDate: { [Op.lte]: fromDate }, toDate: { [Op.gte]: toDate } },
      ];
    } else if (fromDate) {
      where.toDate = { [Op.gte]: fromDate };
    } else if (toDate) {
      where.fromDate = { [Op.lte]: toDate };
    }

    if (dayType) {
      where.dayType = dayType;
    }

    const offset = (page - 1) * pageSize;

    const attributes = [
      'id',
      'dayType',
      'fromDate',
      'toDate',
      'workFromHomeDays',
      'remark',
      'authorizationStatus',
      'status',
      'AuthorizationCriteriaID',
      'createdAt',
      'updatedAt',
      'updateBy',
    ];

    const include = [
      {
        model: UserMaster,
        as: 'createdByUserDetails',
        attributes: ['displayName'],
      },
      {
        model: UserMaster,
        as: 'updatedByUserDetails',
        attributes: ['displayName'],
      },
      {
        model: UserMaster,
        attributes: ['userMasterID', 'displayName', 'userNumber'],
        include: [
          {
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
          {
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
        ],
      },
      {
        model: WorkFromHomeAuthorization,
        attributes: [
          'whAuthoriztaionid',
          'userWorkFromHomeID',
          'userMasterID',
          'remark',
          'status',
        ],
        include: [
          {
            model: UserMaster,
            attributes: ['userMasterID', 'displayName'],
          },
        ],
      },
      {
        model: AuthorizationCriteriaMaster,
        attributes: ['AuthorizationCriteria'],
      },
    ];

    const result = await UserWorkFromHomeService.listWorkFromHome(
      offset,
      pageSize,
      order,
      where,
      attributes,
      include,
      true,
    );

    return res.status(statusCodes.OK).json({
      message: message.usermessage.fetchMessage('Work From Home'),
      data: result.rows,
      totalRecords: result.count,
      currentPage: page,
      totalPages: Math.ceil(result.count / pageSize),
    });
  } catch (err) {
    next(err);
  }
};

exports.add = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const allowedKeys = [
      'dayType',
      'fromDate',
      'toDate',
      'workFromHomeDays',
      'remark',
      'AuthorizationCriteriaID',
      'createByIp',
      'userMasterID',
    ];

    const invalidKeys = invalidKeyParams(req.body, allowedKeys);

    if (invalidKeys.length > 0) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const { dayType, fromDate, toDate, workFromHomeDays, remark } =
      req.body;

      const createByIp = req.userDetails.userIpAddress;
    const userMasterID = req.body.userMasterID
      ? req.body.userMasterID
      : req.userDetails.userMasterId;
    const iosTokens = [];
    const androidTokens = [];
    let userData;
    let payload = {};

    //attendance verifaction code start
    const dates = toDate ? getDatesBetween(fromDate, toDate) : [fromDate];
    const attendanceApproved =
      await hrLeaveMonthlyTransService.getAttendanceVerifyCheck(
        ['AttnTranId'],
        {
          userMasterID: userMasterID,
          verified: 1,
          [Op.or]: dates.map((date) => ({
            monthstartdate: { [Op.lte]: date },
            monthenddate: { [Op.gte]: date },
          })),
        },
      );

    if (attendanceApproved) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: 'This dates attendance allready approved',
      });
    }
    //attendance verifaction code end

    //Pending Work From home Check start
    const userWorkFromHome = await userWorkFromHomeService.editWorkFromHome(
      {
        userMasterID: userMasterID,
        authorizationStatus: {
          [Op.notIn]: [
            AuthorizationStatusType.APPROVED,
            AuthorizationStatusType.REJECTED,
          ],
        },
        [Op.or]: dates.map((date) => ({
          fromDate: { [Op.lte]: date },
          toDate: { [Op.gte]: date },
        })),
      },
      [
        'id',
        'userMasterID',
        'authorizationStatus',
        'fromDate',
        'toDate',
        'dayType',
      ],
    );

    if (userWorkFromHome) {
      const isSameDayType = userWorkFromHome.dayType === dayType;
      const isFullDayConflict =
        userWorkFromHome.dayType === WorkFromHomeTypes.FULLDAY ||
        dayType === WorkFromHomeTypes.FULLDAY;
      const isHalfDayConflict =
        (userWorkFromHome.dayType === WorkFromHomeTypes.FIRSTHALF ||
          userWorkFromHome.dayType === WorkFromHomeTypes.SECONDHALF) &&
        dayType === WorkFromHomeTypes.FULLDAY;

      if (isSameDayType || isFullDayConflict || isHalfDayConflict) {
        await transaction.rollback();
        return res.status(statusCodes.BAD_REQUEST).json({
          message: 'You have already applied work from home durring this days',
        });
      }
    }
    //Pending Work From home Check end

    //Approved Work From Home check start
    const checkApprovedWorkFromHomeTransaction =
      await workFromHomeTransactionService.checkTransaction(
        ['workFromHomeTransactionID', 'status', 'date', 'userWorkFromHomeID'],
        {
          status: 1,
          date: { [Op.in]: dates },
          '$userWorkFromHome.userMasterID$': userMasterID,
          '$userWorkFromHome.authorizationStatus$': 3,
        },
        [
          {
            model: UserWorkFromHome,
            attributes: [
              'id',
              'dayType',
              'userMasterID',
              'authorizationStatus',
            ],
          },
        ],
      );

    if (checkApprovedWorkFromHomeTransaction) {
      const isSameDayType =
        checkApprovedWorkFromHomeTransaction.dayType === dayType;
      const isFullDayConflict =
        checkApprovedWorkFromHomeTransaction.userWorkFromHome.dayType ===
          WorkFromHomeTypes.FULLDAY || dayType === WorkFromHomeTypes.FULLDAY;
      const isHalfDayConflict =
        (checkApprovedWorkFromHomeTransaction.userWorkFromHome.dayType ===
          WorkFromHomeTypes.FIRSTHALF ||
          checkApprovedWorkFromHomeTransaction.userWorkFromHome.dayType ===
            WorkFromHomeTypes.SECONDHALF) &&
        dayType === WorkFromHomeTypes.FULLDAY;

      if (isSameDayType || isFullDayConflict || isHalfDayConflict) {
        await transaction.rollback();
        return res.status(statusCodes.BAD_REQUEST).json({
          message: 'You have already applied work from home durring this days',
        });
      }
    }
    //Approved Work From Home check end

    const authorizationDetailAattribute = [
      'AuthorizedByUserMasterId',
      'AuthorizationCriteriaID',
    ];

    const authorizationDetailInclude = [
      {
        model: AuthorizationCriteriaMaster,
        attributes: ['AuthorizationCriteria'],
      },
    ];

    const authorizationDetailIncludeWhere = {
      userMasterID: userMasterID,
      status: 1,
      AuthorizationMasterID: 1,
    };

    const authorizeData =
      await AuthorizationDetailService.getAuthorizationDetailByUserMasterID(
        authorizationDetailAattribute,
        authorizationDetailInclude,
        authorizationDetailIncludeWhere,
      );

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction,
    };

    const workFromHomeObject = {
      userMasterID: userMasterID,
      dayType,
      fromDate,
      workFromHomeDays,
      remark,
      AuthorizationCriteriaID: authorizeData?.AuthorizationCriteriaID || null,
      authorizationStatus: 0,
      status: 1,
      createBy: userMasterID,
      createByIp: createByIp,
      toDate: dayType === WorkFromHomeTypes.FULLDAY ? toDate : fromDate,
    };

    if (authorizeData?.AuthorizationCriteriaMaster) {
      const { AuthorizationCriteria } =
        authorizeData.AuthorizationCriteriaMaster;

      const statusMap = {
        'Any One': 1,
        'Any Two': 1,
        'Any Three': 1,
        'Sequeance No': 2,
      };

      workFromHomeObject.authorizationStatus =
        statusMap[AuthorizationCriteria] ?? 0;
    }

    const workFromHomeData = await UserWorkFromHomeService.createWorkFromHome(
      workFromHomeObject,
      options,
    );

    if (authorizeData) {
      const workFromHomeAuthorizationObject = [];
      const authorizePersonsIDs = [];
      for (const item of authorizeData.AuthorizedByUserMasterId) {
        workFromHomeAuthorizationObject.push({
          userWorkFromHomeID: workFromHomeData.dataValues.id,
          userMasterID: item,
          authStatus: AuthStatusInAuthorizationRequest.PENDING,
          status: 1,
          createBy: userMasterID,
          createByIp,
        });

        authorizePersonsIDs.push(item);
        if (
          workFromHomeObject.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          break;
        }
      }

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
          title: notificationTitleTypes.WORKFROMHOME,
          body: `${userData.displayName} has requested for Work From Home approval.`,
        },
        data: {
          screen: notificationScreentTypes.WORKFROMHOME,
        },
      };

      const workFromHomeAuthorizationBulkcreateData =
        await WorkFromHomeAuthorizationService.bulkCreateWorkFromHomeAuthorization(
          workFromHomeAuthorizationObject,
          options,
        );

      //authorization inbox create
      let userInboxArray = [];
      workFromHomeAuthorizationBulkcreateData.forEach((item) => {
        userInboxArray.push({
          activityTable: WorkFromHomeAuthorization.getTableName(),
          activityTablePK: item.whAuthoriztaionid,
          message: `${userData.displayName} has applied for Work from Home of date ${fromDate} to ${toDate ? toDate : fromDate}.`,
          assignedTo: item.userMasterID,
          assignedBy: userMasterID,
        });
      });

      await userInboxService.bulkCreateUserInbox(userInboxArray, options);
      //authorization inbox create end
    }

    await transaction.commit();

    if (iosTokens.length > 0) {
      sendBulkNotification(iosTokens, payload, 'ios');
    }

    if (androidTokens.length > 0) {
      sendBulkNotification(androidTokens, payload, 'android');
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Work From Home'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.edit = async (req, res, next) => {
  try {
    const allowedParams = ['id'];

    const invalidParams = invalidKeyParams(req.params, allowedParams);

    if (invalidParams.length > 0) {
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid route parameter(s): ${invalidParams.join(', ')}`,
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Missing required parameter: id',
      });
    }

    const attributes = [
      'id',
      'dayType',
      'fromDate',
      'toDate',
      'workFromHomeDays',
      'remark',
      'authorizationStatus',
      'status',
      'AuthorizationCriteriaID',
    ];

    const result = await UserWorkFromHomeService.editWorkFromHome(
      { id: id },
      attributes,
    );

    if (!result) {
      return res.status(statusCodes.NOT_FOUND).json({
        status: 404,
        message: 'Work From Home not found',
      });
    }

    if (result.authorizationStatus == 3 || result.authorizationStatus == 4) {
      return res.status(200).json({
        status: 401,
        message:
          'You cannot edit this record because it has already been approved or rejected.',
      });
    }
    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Work From Home'),
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const allowedParams = ['id'];

    const invalidParams = invalidKeyParams(req.params, allowedParams);

    if (invalidParams.length > 0) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid route parameter(s): ${invalidParams.join(', ')}`,
      });
    }

    const { id } = req.params;

    if (!id) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        status: statusCodes.BAD_REQUEST,
        message: 'Missing required parameter: id',
      });
    }

    const attributes = ['id', 'authorizationStatus'];

    const result = await UserWorkFromHomeService.editWorkFromHome(
      { id: id },
      attributes,
    );

    if (!result) {
      await transaction.rollback();
      return res.status(statusCodes.NOT_FOUND).json({
        status: 404,
        message: 'Work From Home not found',
      });
    }

    if (result.authorizationStatus == 3 || result.authorizationStatus == 4) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message:
          'You cannot delete this record because it has already been approved or rejected.',
      });
    }

    await UserWorkFromHomeService.destroyWorkFromHome(
      id,
      transaction,
      req.userDetails,
    );

    const workFromAuthorizationIDS =
      await WorkFromHomeAuthorizationService.getAllWorkFromHomeAuthorization(
        ['whAuthoriztaionid'],
        {
          userWorkFromHomeID: id,
        },
      );

    const workFromHomeAuthorizationIDS = workFromAuthorizationIDS.map(
      (item) => item.whAuthoriztaionid,
    );

    await userInboxService.destroyUserInbox(
      {
        activityTable: WorkFromHomeAuthorization.getTableName(),
        activityTablePK: {
          [Op.in]: workFromHomeAuthorizationIDS,
        },
      },
      { transaction },
    );

    await WorkFromHomeAuthorizationService.destroyWorkFromHomeAuthorization(
      id,
      transaction,
      req.userDetails,
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Work From Home'),
      data: result,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.deleteV2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const allowedParams = ['id'];

    // const invalidParams = invalidKeyParams(req.params, allowedParams);

    // if (invalidParams.length > 0) {
    //   await transaction.rollback();
    //   return res.status(statusCodes.BAD_REQUEST).json({
    //     message: `Invalid route parameter(s): ${invalidParams.join(', ')}`,
    //   });
    // }
    const { id, userMasterID } = req.body;

    // const { id } = req.params;

    // if (!id) {
    //   await transaction.rollback();
    //   return res.status(statusCodes.BAD_REQUEST).json({
    //     status: statusCodes.BAD_REQUEST,
    //     message: 'Missing required parameter: id',
    //   });
    // }
    if (!id || !userMasterID) {
      await transaction.rollback();
      return res
        .status(200)
        .json({
          status: statusCodes.BAD_REQUEST,
          message: 'Provide valid parameters',
        });
    }

    const attributes = ['id', 'authorizationStatus'];

    const result = await UserWorkFromHomeService.editWorkFromHome(
      { id: id, userMasterID: userMasterID },
      attributes,
    );

    if (!result) {
      await transaction.rollback();
      return res.status(statusCodes.NOT_FOUND).json({
        status: 404,
        message: 'Work From Home not found',
      });
    }

    if (result.authorizationStatus == 3 || result.authorizationStatus == 4) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message:
          'You cannot delete this record because it has already been approved or rejected.',
      });
    }

    const workFromAuthorizationIDS =
      await WorkFromHomeAuthorizationService.getAllWorkFromHomeAuthorization(
        ['whAuthoriztaionid'],
        {
          userWorkFromHomeID: id,
        },
      );

    const workFromHomeAuthorizationIDS = workFromAuthorizationIDS.map(
      (item) => item.whAuthoriztaionid,
    );

    await userInboxService.destroyUserInbox(
      {
        activityTable: WorkFromHomeAuthorization.getTableName(),
        activityTablePK: {
          [Op.in]: workFromHomeAuthorizationIDS,
        },
      },
      { transaction },
    );

    await WorkFromHomeAuthorizationService.destroyWorkFromHomeAuthorization(
      id,
      transaction,
      req.userDetails,
    );

    await UserWorkFromHome.destroy({
      where: { id: result.id, userMasterID: userMasterID },
      transaction,
      individualHooks: true,
      user: req.userDetails,
    });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Work From Home'),
      data: result,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.update = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const allowedKeys = [
      'dayType',
      'fromDate',
      'toDate',
      'workFromHomeDays',
      'remark',
      'AuthorizationCriteriaID',
      'createByIp',
      'id',
    ];

    const invalidKeys = invalidKeyParams(
      { ...req.body, ...req.params },
      allowedKeys,
    );

    if (invalidKeys.length > 0) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const { dayType, fromDate, toDate, workFromHomeDays, remark, createByIp } =
      req.body;

    const { id } = req.params;
    const userMasterId = req.userDetails.userMasterId;
    const iosTokens = [];
    const androidTokens = [];
    let userData;
    let payload = {};

    //attendance verifaction code start
    const dates = toDate ? getDatesBetween(fromDate, toDate) : [fromDate];
    const attendanceApproved =
      await hrLeaveMonthlyTransService.getAttendanceVerifyCheck(
        ['AttnTranId'],
        {
          userMasterID: userMasterId,
          verified: 1,
          [Op.or]: dates.map((date) => ({
            monthstartdate: { [Op.lte]: date },
            monthenddate: { [Op.gte]: date },
          })),
        },
      );

    if (attendanceApproved) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: 'This dates attendance allready approved',
      });
    }
    //attendance verifaction code end

    const workFromHomeData = await WorkFromHome.findOne({where:{id:id,userMasterID:userMasterId}});

    if(!workFromHomeData){
      await transaction.rollback();
      return res.status(200).json({status:400,message:'No work from home for this user found'})
    }

    //Pending Work From home Check start
    const userWorkFromHome = await userWorkFromHomeService.editWorkFromHome(
      {
        userMasterID: userMasterId,
        id: {
          [Op.notIn]: [id],
        },
        authorizationStatus: {
          [Op.notIn]: [3, 4],
        },
        [Op.or]: dates.map((date) => ({
          fromDate: { [Op.lte]: date },
          toDate: { [Op.gte]: date },
        })),
      },
      [
        'id',
        'userMasterID',
        'authorizationStatus',
        'fromDate',
        'toDate',
        'dayType',
      ],
      [
        {
          model: UserMaster,
          attributes: [
            'userMasterID',
            'displayName',
            'firebaseToken',
            'deviceType',
          ],
        },
      ],
    );

    if (userWorkFromHome) {
      const isSameDayType = userWorkFromHome.dayType === dayType;
      const isFullDayConflict =
        userWorkFromHome.dayType === WorkFromHomeTypes.FULLDAY ||
        dayType === WorkFromHomeTypes.FULLDAY;
      const isHalfDayConflict =
        (userWorkFromHome.dayType === WorkFromHomeTypes.FIRSTHALF ||
          userWorkFromHome.dayType === WorkFromHomeTypes.SECONDHALF) &&
        dayType === WorkFromHomeTypes.FULLDAY;

      if (isSameDayType || isFullDayConflict || isHalfDayConflict) {
        await transaction.rollback();
        return res.status(statusCodes.BAD_REQUEST).json({
          message: 'You have already applied work from home durring this days',
        });
      }
    }
    //Pending Work From home Check end

    //Approved Work From Home check start
    const checkApprovedWorkFromHomeTransaction =
      await workFromHomeTransactionService.checkTransaction(
        ['workFromHomeTransactionID', 'status', 'date', 'userWorkFromHomeID'],
        {
          status: 1,
          userWorkFromHomeID: {
            [Op.notIn]: [id],
          },
          date: { [Op.in]: dates },
          '$userWorkFromHome.userMasterID$': userMasterId,
          '$userWorkFromHome.authorizationStatus$': 3,
        },
        [
          {
            model: UserWorkFromHome,
            attributes: [
              'id',
              'dayType',
              'userMasterID',
              'authorizationStatus',
            ],
          },
        ],
      );

    if (checkApprovedWorkFromHomeTransaction) {
      const isSameDayType =
        checkApprovedWorkFromHomeTransaction.dayType === dayType;
      const isFullDayConflict =
        checkApprovedWorkFromHomeTransaction.userWorkFromHome.dayType ===
          WorkFromHomeTypes.FULLDAY || dayType === WorkFromHomeTypes.FULLDAY;
      const isHalfDayConflict =
        (checkApprovedWorkFromHomeTransaction.userWorkFromHome.dayType ===
          WorkFromHomeTypes.FIRSTHALF ||
          checkApprovedWorkFromHomeTransaction.userWorkFromHome.dayType ===
            WorkFromHomeTypes.SECONDHALF) &&
        dayType === WorkFromHomeTypes.FULLDAY;

      if (isSameDayType || isFullDayConflict || isHalfDayConflict) {
        await transaction.rollback();
        return res.status(statusCodes.BAD_REQUEST).json({
          message: 'You have already applied work from home durring this days',
        });
      }
    }
    //Approved Work From Home check end

    const authorizationDetailAattribute = [
      'AuthorizedByUserMasterId',
      'AuthorizationCriteriaID',
    ];

    const authorizationDetailInclude = [
      {
        model: AuthorizationCriteriaMaster,
        attributes: ['AuthorizationCriteria'],
      },
    ];

    const authorizationDetailIncludeWhere = {
      userMasterID: userMasterId,
      status: 1,
      AuthorizationMasterID: 1,
    };

    const authorizeData =
      await AuthorizationDetailService.getAuthorizationDetailByUserMasterID(
        authorizationDetailAattribute,
        authorizationDetailInclude,
        authorizationDetailIncludeWhere,
      );

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction,
    };

    const workFromHomeObject = {
      userMasterID: userMasterId,
      dayType,
      fromDate,
      workFromHomeDays,
      remark,
      AuthorizationCriteriaID: authorizeData?.AuthorizationCriteriaID || null,
      authorizationStatus: 0,
      status: 1,
      updateBy: userMasterId,
      updateByIp: createByIp,
      toDate: dayType === WorkFromHomeTypes.FULLDAY ? toDate : fromDate,
    };

    if (authorizeData?.AuthorizationCriteriaMaster) {
      const { AuthorizationCriteria } =
        authorizeData.AuthorizationCriteriaMaster;

      const statusMap = {
        'Any One': 1,
        'Any Two': 1,
        'Any Three': 1,
        'Sequeance No': 2,
      };

      workFromHomeObject.authorizationStatus =
        statusMap[AuthorizationCriteria] ?? 0;
    }

    await UserWorkFromHomeService.updateWorkFromHome(
      workFromHomeObject,
      { id: id },
      options,
    );

    if (authorizeData) {
      const workFromHomeAuthorizationObject = [];
      const authorizePersonsIDs = [];
      for (const item of authorizeData.AuthorizedByUserMasterId) {
        workFromHomeAuthorizationObject.push({
          userWorkFromHomeID: id,
          userMasterID: item,
          authStatus: AuthStatusInAuthorizationRequest.PENDING,
          status: 1,
          createBy: req.userDetails.userMasterId,
          createByIp,
        });

        authorizePersonsIDs.push(item);
        if (
          workFromHomeObject.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          break;
        }
      }

      const getworkFromHomeAuthorizationData =
        await WorkFromHomeAuthorizationService.getAllWorkFromHomeAuthorization(
          ['whAuthoriztaionid'],
          {
            userWorkFromHomeID: id,
          },
        );

      const workFromHomeAuthorizationIDS = getworkFromHomeAuthorizationData.map(
        (item) => item.whAuthoriztaionid,
      );

      //destroy user inbox
      await userInboxService.destroyUserInbox(
        {
          activityTable: WorkFromHomeAuthorization.getTableName(),
          activityTablePK: { [Op.in]: workFromHomeAuthorizationIDS },
        },
        options,
      );

      await WorkFromHomeAuthorizationService.destroyWorkFromHomeAuthorization(
        id,
        transaction,
        req.userDetails,
      );

      const authorizeUserData = await userMasterService.getMultipleUserData(
        ['userMasterID', 'displayName', 'firebaseToken', 'deviceType'],
        { userMasterID: { [Op.in]: [...authorizePersonsIDs, userMasterId] } },
      );

      authorizeUserData.forEach((user) => {
        if (authorizePersonsIDs.includes(user.userMasterID)) {
          if (user.deviceType === 'ios' && user.firebaseToken) {
            iosTokens.push(user.firebaseToken);
          } else if (user.deviceType === 'android' && user.firebaseToken) {
            androidTokens.push(user.firebaseToken);
          }
        }

        if (userMasterId == user.userMasterID) {
          userData = user;
        }
      });

      payload = {
        notification: {
          title: notificationTitleTypes.WORKFROMHOME,
          body: `${userData.displayName} has requested for Work From Home approval.`,
        },
        data: {
          screen: notificationScreentTypes.WORKFROMHOME,
        },
      };

      const workFromHomeAuthorizationBulkcreateData =
        await WorkFromHomeAuthorizationService.bulkCreateWorkFromHomeAuthorization(
          workFromHomeAuthorizationObject,
          options,
        );

      let userInboxArray = [];

      workFromHomeAuthorizationBulkcreateData.forEach((item) => {
        userInboxArray.push({
          activityTable: WorkFromHomeAuthorization.getTableName(),
          activityTablePK: item.whAuthoriztaionid,
          message: `${userData.displayName} has applied for Work from Home of date ${fromDate} to ${toDate ? toDate : fromDate}`,
          assignedTo: item.userMasterID,
          assignedBy: userMasterId,
        });
      });

      await userInboxService.bulkCreateUserInbox(userInboxArray, options);
      //authorization inbox create end
    }

    await transaction.commit();

    if (iosTokens.length > 0) {
      sendBulkNotification(iosTokens, payload, 'ios');
    }

    if (androidTokens.length > 0) {
      sendBulkNotification(androidTokens, payload, 'android');
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Work From Home'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

function invalidKeyParams(query, allowedKeys) {
  return Object.keys(query).filter((key) => !allowedKeys.includes(key));
}

function getDatesBetween(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);

  while (currentDate <= new Date(endDate)) {
    dates.push(currentDate.toISOString().slice(0, 10)); // format YYYY-MM-DD
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}
