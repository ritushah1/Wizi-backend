const { Op, Sequelize } = require('sequelize');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const bankDetailRequestService = require('../services/bankDetailRequestService');
const authorizationDetailService = require('../services/authorizationDetailService');
const BankDetailAuthorization = require('../models/bankDetailAuthorization');
const {
  notificationTitleTypes,
  notificationScreentTypes,
  AuthStatusInAuthorizationRequest,
  authorizationCriteriaType,
  authorizationMasterTypes,
  AuthorizationStatusType,
} = require('../utils/dbUtils');
const bankDetailAuthorizationService = require('../services/bankDetailAuthorizationService');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const userInboxService = require('../services/userInboxService');
const userMasterService = require('../services/userMasterService');
const BankMaster = require('../models/bankMaster');
const { statusCodes } = require('../utils/commonVars');
const UserMaster = require('../models/userMaster');
const employeeJoiningService = require('../services/employeeJoiningService');
const { sendBulkNotification } = require('../utils/commonUtilFunctions');
const BankBranch = require('../models/bankBranch');
const { showPayrollFrequency } = require('../utils/labelUtils');

exports.add = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const allowedKeys = [
      'bankMasterID',
      'IFSCCode',
      'accountNo',
      'accountHolderName',
      'userMasterID',
      'bankDetailRequestId',
      'bankBranchID',
    ];

    const invalidKeys = invalidKeyParams(req.body, allowedKeys);

    if (invalidKeys.length > 0) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction,
    };

    const {
      bankMasterID,
      IFSCCode,
      accountNo,
      accountHolderName,
      bankBranchID,
    } = req.body;

    const userMasterID = req.body.userMasterID
      ? req.body.userMasterID
      : req.userDetails.userMasterId;
    const iosTokens = [];
    const androidTokens = [];
    let userData;
    let payload = {};

    //Check Bank Detail Request if allready pending
    if (!req?.body?.bankDetailRequestId) {
      const bankDetailRequestExistsData =
        await bankDetailRequestService.editBankDetailRequest(
          {
            userMasterID: userMasterID,
            authorizationStatus: {
              [Sequelize.Op.in]: [
                AuthorizationStatusType.PENDING_ZERO,
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
          },
          ['bankDetailRequestId']
        );

      if (bankDetailRequestExistsData) {
        await transaction.rollback();
        return res.status(statusCodes.BAD_REQUEST).json({
          message: `You already have a bank detail request in progress. Please wait until it is approved or rejected.`,
        });
      }
    }

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
      AuthorizationMasterID: authorizationMasterTypes.statutoryDetail,
    };

    const authorizeData =
      await authorizationDetailService.getAuthorizationDetailByUserMasterID(
        authorizationDetailAattribute,
        authorizationDetailInclude,
        authorizationDetailIncludeWhere
      );

    const bankdetailRequestObject = {
      userMasterID: userMasterID,
      bankMasterID: bankMasterID,
      IFSCCode: IFSCCode,
      accountNo: accountNo,
      accountHolderName: accountHolderName,
      authorizationStatus: AuthorizationStatusType.PENDING_ZERO,
      AuthorizationCriteriaID: authorizeData?.AuthorizationCriteriaID ?? null,
      ...(bankBranchID && { bankBranchID }),
    };

    if (authorizeData?.AuthorizationCriteriaMaster) {
      const { AuthorizationCriteria } =
        authorizeData?.AuthorizationCriteriaMaster;

      const statusMap = {
        'Any One': 1,
        'Any Two': 1,
        'Any Three': 1,
        'Sequeance No': 2,
      };

      bankdetailRequestObject.authorizationStatus =
        statusMap[AuthorizationCriteria] ?? 0;
    }

    let bankDetailRequestData;
    if (req?.body?.bankDetailRequestId) {
      const oldBankDetailRequestData =
        await bankDetailRequestService.editBankDetailRequest(
          { bankDetailRequestId: +req?.body?.bankDetailRequestId },
          [
            'bankMasterID',
            'IFSCCode',
            'accountNo',
            'accountHolderName',
            'bankBranchID',
          ],
          []
        );

      const oldData = oldBankDetailRequestData?.dataValues;

      let isSame =
        oldData.bankMasterID == bankMasterID &&
        oldData.IFSCCode === IFSCCode &&
        oldData.accountNo === accountNo &&
        oldData.accountHolderName === accountHolderName;

      if (oldData.bankBranchID !== null && showPayrollFrequency) {
        isSame = isSame && oldData.bankBranchID == bankBranchID;
      }

      if (isSame) {
        await transaction.rollback();
        return res.status(400).json({
          status: 400,
          message: 'You already have the same bank detail request in progress.',
        });
      }

      const bankDetailAuthorizationIds =
        await bankDetailAuthorizationService.getBankDetailAuthorizationIDs(
          { bankDetailRequestId: +req?.body?.bankDetailRequestId },
          ['bankDetailAuthorizationId']
        );

      await userInboxService.destroyUserInbox(
        {
          activityTable: BankDetailAuthorization.getTableName(),
          activityTablePK: {
            [Sequelize.Op.in]: bankDetailAuthorizationIds,
          },
        },
        options
      );

      await bankDetailAuthorizationService.destroy(
        {
          bankDetailAuthorizationId: bankDetailAuthorizationIds,
        },
        options
      );

      const [affectedCount, updatedRows] =
        await bankDetailRequestService.update(
          bankdetailRequestObject,
          {
            bankDetailRequestId: +req?.body?.bankDetailRequestId,
          },
          options,
          true
        );

      bankDetailRequestData = updatedRows?.[0];
    } else {
      bankDetailRequestData = await bankDetailRequestService.create(
        bankdetailRequestObject,
        options
      );
    }

    await employeeJoiningService.update(
      {
        bankMasterID: bankMasterID,
        bankIFSC: IFSCCode,
        bankAccountNo: accountNo,
        bankAccountStatus: 0,
        nameAsBank: accountHolderName,
        ...(bankBranchID && { bankBranchID }),
      },
      {
        userMasterID: userMasterID,
      },
      options
    );

    if (authorizeData) {
      const bankDetailAuthorizationObject = [];
      const authorizePersonsIDs = [];
      for (const item of authorizeData.AuthorizedByUserMasterId) {
        bankDetailAuthorizationObject.push({
          bankDetailRequestId:
            +bankDetailRequestData?.dataValues?.bankDetailRequestId,
          userMasterID: item,
          authStatus: AuthStatusInAuthorizationRequest.PENDING,
          status: 1,
          createBy: userMasterID,
        });

        authorizePersonsIDs.push(item);
        if (
          bankdetailRequestObject.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          break;
        }
      }

      const authorizeUserData = await userMasterService.getMultipleUserData(
        ['userMasterID', 'displayName', 'firebaseToken', 'deviceType'],
        { userMasterID: { [Op.in]: [...authorizePersonsIDs, userMasterID] } }
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
          title: notificationTitleTypes.BANKDETAIL,
          body: `${userData.displayName} has requested for Bank Detail approval.`,
        },
        data: {
          screen: notificationScreentTypes.BANKDETAIL,
        },
      };

      const bankDetailAuthorizationBulkcreateData =
        await bankDetailAuthorizationService.bulkCreate(
          bankDetailAuthorizationObject,
          options
        );

      //authorization inbox create
      let userInboxArray = [];
      bankDetailAuthorizationBulkcreateData.forEach((item) => {
        userInboxArray.push({
          activityTable: BankDetailAuthorization.getTableName(),
          activityTablePK: item.bankDetailAuthorizationId,
          message: `${userData.displayName} has applied for Bank Detail.`,
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
      message: req?.body?.bankDetailRequestId
        ? message.usermessage.updateMessage('Bank Detail Request')
        : message.usermessage.addMessage('Bank Detail Request'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    let {
      page = 1,
      pageSize = 10,
      sortByField,
      sortByValue,
      userMasterID,
    } = req.query;
    const allowedKeys = [
      'page',
      'pageSize',
      'sortByField',
      'sortByValue',
      'userMasterID',
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
      userMasterID: userMasterID,
    };
    const offset = (page - 1) * pageSize;

    const attributes = [
      'bankDetailRequestId',
      'bankMasterID',
      'bankBranchID',
      'IFSCCode',
      'accountNo',
      'accountHolderName',
      'authorizationStatus',
      'AuthorizationCriteriaID',
      'createdAt',
      'updatedAt',
      'authorizerRemark',
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
        model: BankMaster,
        attributes: ['bankName'],
      },
      {
        model: BankBranch,
        attributes: ['bankBranchName'],
      },
      {
        model: AuthorizationCriteriaMaster,
        attributes: ['AuthorizationCriteria'],
      },
      {
        model: BankDetailAuthorization,
        attributes: [
          'bankDetailRequestId',
          'userMasterID',
          'remark',
          'authStatus',
          'status',
          'createdAt',
          'updatedAt',
        ],
        include: [
          {
            model: UserMaster,
            attributes: ['displayName'],
          },
        ],
      },
      {
        model: UserMaster,
        attributes: ['displayName'],
        as: 'authorizer',
      },
    ];

    const result = await bankDetailRequestService.list(
      offset,
      pageSize,
      order,
      where,
      attributes,
      include,
      true
    );

    return res.status(statusCodes.OK).json({
      message: message.usermessage.fetchMessage('Bank Detail Request'),
      data: result.rows,
      totalRecords: result.count,
      currentPage: page,
      totalPages: Math.ceil(result.count / pageSize),
    });
  } catch (err) {
    next(err);
  }
};

function invalidKeyParams(query, allowedKeys) {
  return Object.keys(query).filter((key) => !allowedKeys.includes(key));
}
