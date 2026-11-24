const message = require('../response_message/message');
const e = require('express');
const {
  AuthorizationStatusType,
  AuthStatusInAuthorizationRequest,
  authorizationCriteriaType,
  notificationScreentTypes,
  authorizationMasterTypes,
} = require('../utils/dbUtils');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const AuthorizationDetailService = require('../services/authorizationDetailService');
const sequelize = require('../config/database');
const { Op, Sequelize, where } = require('sequelize');
const { statusCodes } = require('../utils/commonVars');
const UserMaster = require('../models/userMaster');
const {
  asiaKolkataDateTime,
  sendNotification,
} = require('../utils/commonUtilFunctions');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const Designation = require('../models/designation');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const EmployeeBranch = require('../models/employeeBranch');
const userInboxService = require('../services/userInboxService');
const userMasterService = require('../services/userMasterService');
const BankDetailRequest = require('../models/bankDetailRequest');
const bankDetailAuthorizationService = require('../services/bankDetailAuthorizationService');
const BankDetailAuthorization = require('../models/bankDetailAuthorization');
const bankDetailRequestService = require('../services/bankDetailRequestService');
const BankMaster = require('../models/bankMaster');
const employeeJoiningService = require('../services/employeeJoiningService');
const BankBranch = require('../models/bankBranch');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const FormAuthorizationDetails = require('../models/AuthorizationDetails');

exports.list = async (req, res, next) => {
  try {
    let {
      page = 1,
      pageSize = 10,
      sortByField,
      sortByValue,
      userMasterID,
      authStatus,
      companyMasterID,
    } = req.body;

    const allowedKeys = [
      'page',
      'pageSize',
      'sortByField',
      'sortByValue',
      'userMasterID',
      'authStatus',
      'companyMasterID',
    ];

    const invalidKeys = invalidKeyParams(req.body, allowedKeys);

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

    const bankDetailRequestWhere = {};

    if (authStatus !== null && authStatus !== undefined) {
      if (authStatus == 2) {
        bankDetailRequestWhere['authorizationStatus'] = { [Op.notIn]: [3, 4] };
      }
      where.authStatus = authStatus;
    } else {
      where.authStatus = 2;
      bankDetailRequestWhere['authorizationStatus'] = { [Op.in]: [0, 1, 2] };
    }

    if (userMasterID && Array.isArray(userMasterID) && userMasterID.length) {
      bankDetailRequestWhere.userMasterID = {
        [Op.in]: userMasterID,
      };
    }

    const offset = (page - 1) * pageSize;
    const userCondition = { status: 1 };
    if (companyMasterID) {
      userCondition.companyMasterId = companyMasterID;
    }
    const include = [
      {
        model: BankDetailRequest,
        where: bankDetailRequestWhere,
        include: [
          {
            model: UserMaster,
            where: userCondition,
            attributes: ['userMasterID', 'displayName', 'userNumber'],
            include: [
              {
                separate: true,
                model: EmployeeJoiningDetails,
                attributes: ['employeeCode', 'userMasterID'],
              },
              {
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
        ],
      },
    ];

    const result = await bankDetailAuthorizationService.list(
      offset,
      pageSize,
      order,
      where,
      include,
      true,
    );

    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      message: message.usermessage.fetchMessage('Bank Detail Authorization'),
      data: result.rows,
      totalRecords: result.count,
      currentPage: page,
      totalPages: Math.ceil(result.count / pageSize),
    });
  } catch (err) {
    next(err);
  }
};

exports.view = async (req, res, next) => {
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
      'bankDetailRequestId',
      'userMasterID',
      'bankMasterID',
      'bankBranchID',
      'IFSCCode',
      'accountNo',
      'accountHolderName',
      'authorizationStatus',
      'status',
      'AuthorizationCriteriaID',
      'createdAt',
      'authorizedBy',
      'authorizerRemark',
    ];

    const include = [
      {
        model: UserMaster,
        attributes: ['displayName'],
        as: 'authorizer',
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
        model: UserMaster,
        attributes: ['userMasterID', 'displayName', 'userNumber'],
        include: [
          {
            model: EmployeeDesignation,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: null },
              ],
            },
            separate: true,
            required: false,
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
            model: EmployeeDepartment,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: null },
              ],
            },
            separate: true,
            required: false,
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
            model: EmployeeBranch,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date() },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date() } },
                { endDate: null },
              ],
            },
            separate: true,
            required: false,
            attributes: ['branchID', 'applicableDate'],
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
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
        ],
      },
      {
        model: BankDetailAuthorization,
        attributes: [
          'bankDetailAuthorizationId',
          'bankDetailRequestId',
          'userMasterID',
          'remark',
          'status',
          'authStatus',
          'updatedAt',
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

    const result = await bankDetailRequestService.editBankDetailRequest(
      { bankDetailRequestId: id },
      attributes,
      include,
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Bank detail Authorization'),
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.statusUpdate = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const allowedKeys = ['authStatus', 'remark', 'id'];

    const invalidKeys = invalidKeyParams(req.body, allowedKeys);

    if (invalidKeys.length > 0) {
      await transaction.rollback();
      return res.status(statusCodes.BAD_REQUEST).json({
        message: `Invalid query parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const { authStatus, remark, id } = req.body;

    if (!id) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Bank Details Authhorization Request',
        ),
      });
    }

    const bankAuthReqIDList = Array.isArray(id) ? id : [id];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    };

    const workFromHomeAuthorizationData =
      await bankDetailAuthorizationService.getAllAuthData(
        [
          'bankDetailAuthorizationId',
          'userMasterID',
          'authStatus',
          'bankDetailRequestId',
        ],
        {
          bankDetailAuthorizationId: bankAuthReqIDList,
          authStatus: 2,
        },
        [
          {
            model: BankDetailRequest,
            where: {
              authorizationStatus: [
                AuthorizationStatusType.PENDING_ZERO,
                AuthorizationStatusType.PEDING_ONE,
                AuthorizationStatusType.PEDING_TWO,
              ],
            },
            attributes: [
              'bankDetailRequestId',
              'userMasterID',
              'authorizationStatus',
            ],
            include: [
              {
                model: UserMaster,
                attributes: ['displayName', 'userMasterID'],
                include: [
                  {
                    separate: true,
                    model: FormAuthorizationDetails,
                    attributes: [
                      'AuthorizationDetailsId',
                      'AuthorizationCriteriaID',
                      'AuthorizationMasterID',
                      'AuthorizedByUserMasterId',
                    ],
                    where: {
                      AuthorizationMasterID:
                        authorizationMasterTypes.statutoryDetail,
                      status: 1,
                    },
                  },
                ],
              },
            ],
          },
        ],
        options,
      );

    if (workFromHomeAuthorizationData.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Bank Details Authorization Request',
        ),
      });
    }

    if (authStatus == 0) {
      const allBankAuthReqIds = workFromHomeAuthorizationData.map((e) => {
        return e?.bankDetailRequest?.bankDetailRequestId;
      });

      const allAuthorizer =
        await bankDetailRequestService.getAllBankDetailRequest(
          ['bankDetailRequestId', 'userMasterID', 'authorizationStatus'],
          {
            bankDetailRequestId: allBankAuthReqIds,
          },
          [
            {
              model: BankDetailAuthorization,
              attributes: [
                'bankDetailAuthorizationId',
                'userMasterID',
                'authStatus',
                'bankDetailRequestId',
              ],
            },
          ],
          options,
        );

      const allIdToDestroyInbox = allAuthorizer.flatMap((e) =>
        e.bankDetailAuthorizations.map((id) => id.bankDetailAuthorizationId),
      );

      const getIdtoUpdatebankDetailsAuth = allIdToDestroyInbox.filter((item) =>
        bankAuthReqIDList.includes(item),
      );

      const getIdToUpdateEmpJoining = allAuthorizer.map(
        (item) => item.userMasterID,
      );

      await bankDetailRequestService.update(
        {
          authorizationStatus: AuthorizationStatusType.REJECTED,
          authorizedBy: req.userDetails.userMasterId,
          authorizedAt: new Date(),
          authorizerRemark: remark,
          isAuthorizedBy: false,
        },
        { bankDetailRequestId: allBankAuthReqIds },
        options,
      );
      const data = {
        authStatus: authStatus,
        remark: remark,
      };
      await bankDetailAuthorizationService.update(
        data,
        { bankDetailAuthorizationId: getIdtoUpdatebankDetailsAuth },
        options,
      );
      await userInboxService.destroyUserInbox(
        {
          activityTable: BankDetailAuthorization.getTableName(),
          activityTablePK: { [Op.in]: allIdToDestroyInbox },
        },
        options,
      );
      await employeeJoiningService.update(
        {
          bankAccountStatus: 2,
        },
        {
          userMasterID: getIdToUpdateEmpJoining,
        },
        options,
      );
      await transaction.commit();
      return res.status(200).json({
        status: 200,
        message: 'Bank Details Authorization request rejected successfully',
      });
    } else {
      const anyOneData = [];
      const anyTwoData = [];
      const anyThreeData = [];
      const sequenceWise = [];
      let allIDsToDeleteInbox = [];
      let allIDsToUpdateBandDetailsAuth = [];
      let allIDsToUpdateBandDetails = [];
      let allIDsToUpdateEmployeeJoining = [];
      let bulkNotification = [];
      workFromHomeAuthorizationData.map((data) => {
        if (
          data?.bankDetailRequest?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYONE
        ) {
          anyOneData.push({
            bankDetailAuthorizationId: data.bankDetailAuthorizationId,
            bankDetailRequestId: data.bankDetailRequestId,
            userMasterID: data.bankDetailRequest.userMasterID,
          });
        } else if (
          data?.bankDetailRequest?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTWO
        ) {
          anyTwoData.push({
            bankDetailAuthorizationId: data.bankDetailAuthorizationId,
            bankDetailRequestId: data.bankDetailRequestId,
            userMasterID: data.bankDetailRequest.userMasterID,
          });
        } else if (
          data?.bankDetailRequest?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTHREE
        ) {
          anyThreeData.push({
            bankDetailAuthorizationId: data.bankDetailAuthorizationId,
            bankDetailRequestId: data.bankDetailRequestId,
            userMasterID: data.bankDetailRequest.userMasterID,
          });
        } else if (
          data?.bankDetailRequest?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO
        ) {
          sequenceWise.push({
            bankDetailAuthorizationId: data.bankDetailAuthorizationId,
            bankDetailRequestId: data.bankDetailRequestId,
            authorizerIDs:
              data.bankDetailRequest.userMaster.authorizationDetails[0]
                .AuthorizedByUserMasterId, // it is an array of userID
            userNameForNotification:
              data.bankDetailRequest.userMaster.displayName,
            assignedBy: data.bankDetailRequest.userMaster.userMasterID,
            userMasterID: data.bankDetailRequest.userMasterID,
          });
        }
      });

      if (anyOneData.length > 0) {
        const allBankAuthReqIds = anyOneData.map((e) => {
          return e.bankDetailRequestId;
        });

        const allAuthorizer =
          await bankDetailRequestService.getAllBankDetailRequest(
            ['bankDetailRequestId', 'userMasterID', 'authorizationStatus'],
            {
              bankDetailRequestId: allBankAuthReqIds,
            },
            [
              {
                model: BankDetailAuthorization,
                attributes: [
                  'bankDetailAuthorizationId',
                  'userMasterID',
                  'authStatus',
                  'bankDetailRequestId',
                ],
              },
            ],
            options,
          );

        const allIdToDestroyInbox = allAuthorizer.flatMap((e) =>
          e.bankDetailAuthorizations.map((id) => id.bankDetailAuthorizationId),
        );

        const getIdtoUpdatebankDetailsAuth = allIdToDestroyInbox.filter(
          (item) => bankAuthReqIDList.includes(item),
        );

        const getIdsToUpdateEmployeeJoining = anyOneData.map(
          (item) => item.userMasterID,
        );

        allIDsToUpdateEmployeeJoining = [
          ...allIDsToUpdateEmployeeJoining,
          ...getIdsToUpdateEmployeeJoining,
        ];
        allIDsToUpdateBandDetailsAuth = [
          ...allIDsToUpdateBandDetailsAuth,
          ...getIdtoUpdatebankDetailsAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...allIdToDestroyInbox];
        allIDsToUpdateBandDetails = [
          ...allIDsToUpdateBandDetails,
          ...allBankAuthReqIds,
        ];
      }
      if (anyTwoData.length > 0) {
        const allbankDetailsIds = anyTwoData.map((e) => e.bankDetailRequestId);
        const getAUthorizationReqId = anyTwoData.map(
          (e) => e.bankDetailAuthorizationId,
        );

        const allAuthorizer =
          await bankDetailRequestService.getAllBankDetailRequest(
            ['bankDetailRequestId', 'userMasterID', 'authorizationStatus'],
            {
              bankDetailRequestId: allbankDetailsIds,
            },
            [
              {
                model: BankDetailAuthorization,
                attributes: [
                  'bankDetailAuthorizationId',
                  'userMasterID',
                  'authStatus',
                  'bankDetailRequestId',
                ],
              },
            ],
            options,
          );

        const otherAuthorizers = [];
        const bankDetailsApprovedIds = [];

        allAuthorizer.forEach((item) => {
          const authorizers = item.bankDetailAuthorizations;

          const approved = authorizers.filter((a) => a.authStatus === 1);

          if (approved.length == 1) {
            const allIds = authorizers.map((a) => a.bankDetailAuthorizationId);
            otherAuthorizers.push(...allIds);
            bankDetailsApprovedIds.push(item.bankDetailRequestId);
            allIDsToUpdateEmployeeJoining.push(item.userMasterID);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];
        const getIdtoUpdateShortLeaveAuth = getAUthorizationReqId.filter(
          (item) => bankAuthReqIDList.includes(item),
        );

        allIDsToUpdateBandDetailsAuth = [
          ...allIDsToUpdateBandDetailsAuth,
          ...getIdtoUpdateShortLeaveAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateBandDetails = [
          ...allIDsToUpdateBandDetails,
          ...bankDetailsApprovedIds,
        ];
      }
      if (anyThreeData.length > 0) {
        const allbankDetailsIds = anyThreeData.map(
          (e) => e.bankDetailRequestId,
        );
        const getAUthorizationReqId = anyThreeData.map(
          (e) => e.bankDetailAuthorizationId,
        );

        const allAuthorizer =
          await bankDetailRequestService.getAllBankDetailRequest(
            ['bankDetailRequestId', 'userMasterID', 'authorizationStatus'],
            {
              bankDetailRequestId: allbankDetailsIds,
            },
            [
              {
                model: BankDetailAuthorization,
                attributes: [
                  'bankDetailAuthorizationId',
                  'userMasterID',
                  'authStatus',
                  'bankDetailRequestId',
                ],
              },
            ],
            options,
          );

        const otherAuthorizers = [];
        const bankDetailsApprovedIds = [];

        allAuthorizer.forEach((item) => {
          const authorizers = item.bankDetailAuthorizations;

          const approved = authorizers.filter((a) => a.authStatus === 1);

          if (approved.length == 2) {
            const allIds = authorizers.map((a) => a.bankDetailAuthorizationId);
            otherAuthorizers.push(...allIds);
            bankDetailsApprovedIds.push(item.bankDetailRequestId);
            allIDsToUpdateEmployeeJoining.push(item.userMasterID);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];
        const getIdtoUpdateShortLeaveAuth = getAUthorizationReqId.filter(
          (item) => bankAuthReqIDList.includes(item),
        );

        allIDsToUpdateBandDetailsAuth = [
          ...allIDsToUpdateBandDetailsAuth,
          ...getIdtoUpdateShortLeaveAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateBandDetails = [
          ...allIDsToUpdateBandDetails,
          ...bankDetailsApprovedIds,
        ];
      }
      if (sequenceWise.length > 0) {
        const allbankDetailsIds = sequenceWise.map(
          (e) => e.bankDetailRequestId,
        );
        const getAUthorizationReqId = sequenceWise.map(
          (e) => e.bankDetailAuthorizationId,
        );

        const otherAuthorizers = [];
        const shortLeaveApprovedIds = [];
        const createShortLeaveAuth = [];
        const sendNotificationInbox = [];

        const getIdtoUpdatebankDetailsAuth = getAUthorizationReqId.filter(
          (item) => bankAuthReqIDList.includes(item),
        );

        const data = {
          authStatus: authStatus,
          remark: remark,
        };
        await bankDetailAuthorizationService.update(data, {
          bankDetailAuthorizationId: getIdtoUpdatebankDetailsAuth,
        });

        const allAuthorizer =
          await bankDetailRequestService.getAllBankDetailRequest(
            ['bankDetailRequestId', 'userMasterID', 'authorizationStatus'],
            {
              bankDetailRequestId: allbankDetailsIds,
            },
            [
              {
                model: BankDetailAuthorization,
                attributes: [
                  'bankDetailAuthorizationId',
                  'userMasterID',
                  'authStatus',
                  'bankDetailRequestId',
                ],
              },
            ],
            options,
          );

        allAuthorizer.forEach((item) => {
          const authorizers = item.bankDetailAuthorizations;

          const approved = authorizers.filter((a) => a.authStatus === 1);

          const seq = sequenceWise.find(
            (x) => x.bankDetailRequestId === item.bankDetailRequestId,
          );

          if (!seq) return;

          const sequenceUserIDs = seq.authorizerIDs.map((id) => id.toString());

          const approvedUserIDs = approved.map((a) =>
            a.userMasterID.toString(),
          );

          const remainingUsers = sequenceUserIDs.filter(
            (id) => !approvedUserIDs.includes(id),
          );

          if (remainingUsers.length === 0) {
            const allIds = authorizers.map((a) => a.bankDetailAuthorizationId);
            allIDsToUpdateEmployeeJoining.push(item.userMasterID);
            otherAuthorizers.push(...allIds);
            shortLeaveApprovedIds.push(item.bankDetailRequestId);
            return;
          }

          const nextUser = remainingUsers[0]; // FIRST PENDING USER

          createShortLeaveAuth.push({
            bankDetailRequestId: item.bankDetailRequestId,
            userMasterID: +nextUser,
            authStatus: 2,
            status: 1,
          });
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateBandDetails = [
          ...allIDsToUpdateBandDetails,
          ...shortLeaveApprovedIds,
        ];

        const createNewExtraDaysAuth =
          await bankDetailAuthorizationService.bulkCreate(
            createShortLeaveAuth,
            {
              ...options,
            },
          );

        sequenceWise.map((item) => {
          const data = createNewExtraDaysAuth.find(
            (e) => e.bankDetailRequestId == item.bankDetailRequestId,
          );

          if (data) {
            sendNotificationInbox.push({
              assignedTo: data.userMasterID,
              bankDetailRequestId: item.bankDetailRequestId,
              assignedBy: item.assignedBy,
              activityTable: BankDetailAuthorization.getTableName(),
              activityTablePK: data.bankDetailAuthorizationId,
              message: `${item.userNameForNotification} has applied for Bank Details Authorization`,
            });
          }
        });

        if (sendNotificationInbox.length > 0) {
          bulkNotification = await userInboxService.bulkCreateUserInbox(
            sendNotificationInbox,
            options,
          );
        }
      }

      const data = {
        authStatus: authStatus,
        remark: remark,
      };
      await bankDetailAuthorizationService.update(
        data,
        {
          bankDetailAuthorizationId: allIDsToUpdateBandDetailsAuth,
        },
        true,
        options,
      );

      await userInboxService.destroyUserInbox(
        {
          activityTable: BankDetailAuthorization.getTableName(),
          activityTablePK: { [Op.in]: allIDsToDeleteInbox },
        },
        options,
      );

      if (allIDsToUpdateBandDetails.length > 0) {
        await bankDetailRequestService.update(
          {
            authorizationStatus: AuthorizationStatusType.APPROVED,
            authorizedBy: req.userDetails.userMasterId,
            authorizedAt: new Date(),
            authorizerRemark: remark,
            isAuthorizedBy: false,
          },
          { bankDetailRequestId: allIDsToUpdateBandDetails },
          options,
        );
        await employeeJoiningService.update(
          {
            bankAccountStatus: 1,
          },
          {
            userMasterID: allIDsToUpdateEmployeeJoining,
          },
          options,
        );
      }

      await transaction.commit();
      let notificationData = {
        screen: notificationScreentTypes.BANKDETAIL,
        isScheduled: 'true',
        scheduledTime: new Date().toISOString(),
      };

      bulkNotification.forEach((item) => {
        let notification = {
          title: `Hey ${item.displayName}! Someone requested for Bank Details Authorization`,
          body: item.message,
        };
        sendNotification(item.assignedTo, notification, notificationData);
      });
      return res.status(200).json({
        status: 200,
        message: 'Bank Details Authorization request approved successfully',
      });
    }
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.bankDetailAuthorizeduser = async (req, res, next) => {
  try {
    let { companyMasterID, authPersonid } = await req.body;
    let userdata;

    let Auth_person = await AuthorizationDetails.findAll({
      where: {
        AuthorizedByUserMasterId: { [Sequelize.Op.contains]: [authPersonid] },
        AuthorizationMasterID: authorizationMasterTypes.statutoryDetail,
        status: 1,
        companyMasterID: companyMasterID,
      },
    });

    let userid = [];

    for (var i = 0; i < Auth_person.length; i++) {
      userid.push(Auth_person[i].userMasterID);
    }

    userdata = await UserMaster.findAll({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: userid,
        },
        status: 1,
      },
      attributes: [
        ['userMasterID', 'userMasterID'],
        ['displayName', 'userName'],
        ['userNumber', 'Number'],
      ],
    });

    return res.status(200).json({
      status: 200,
      message: {},
      data: userdata,
    });
  } catch (err) {
    next(err);
  }
};

function invalidKeyParams(query, allowedKeys) {
  return Object.keys(query).filter((key) => !allowedKeys.includes(key));
}

exports.getAllBankDetailAdmin = async (req, res, next) => {
  try {
    const {
      authorizationstatus,
      companyMasterID,
      limit,
      page,
      userMasterID,
      startdate,
    } = req.body;

    let { enddate } = req.body;
    if (!companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Company'),
      });
    }

    const allowedKeys = [
      'companyMasterID',
      'userMasterID',
      'startdate',
      'enddate',
      'page',
      'limit',
      'authorizationstatus',
    ];

    const invalidKeys = invalidKeyParams(
      { ...req.body, ...req.params },
      allowedKeys,
    );

    if (invalidKeys.length > 0) {
      return res.status(200).json({
        status: 400,
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const condition = {
      status: 1,
    };

    if (authorizationstatus) {
      if (authorizationstatus == AuthorizationStatusType.PEDING_ONE) {
        condition.authorizationStatus = [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ];
      } else {
        condition.authorizationStatus = authorizationstatus;
      }
    } else {
      condition.authorizationStatus = [
        AuthorizationStatusType.PENDING_ZERO,
        AuthorizationStatusType.PEDING_ONE,
        AuthorizationStatusType.PEDING_TWO,
      ];
    }

    if (startdate) {
      if (enddate == '' || enddate == undefined || enddate == null) {
        enddate = asiaKolkataDateTime(new Date()).slice(0, 10);
      }
      const start = new Date(startdate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(enddate);
      end.setHours(23, 59, 59, 999);
      condition.createdAt = {
        [Sequelize.Op.between]: [start, end],
      };
    }

    if (userMasterID.length > 0) {
      condition.userMasterID = userMasterID;
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const include = [
      {
        model: UserMaster,
        attributes: ['displayName'],
        as: 'authorizer',
      },
      {
        model: UserMaster,
        where: { companyMasterId: companyMasterID, status: 1 },
        attributes: ['userMasterID', 'displayName', 'userNumber'],
        include: [
          {
            require: false,
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode', 'userMasterID'],
          },
          {
            require: false,
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
            require: false,
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
            require: false,
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
    ];
    const order = [['createdAt', 'DESC']];
    const result = await bankDetailAuthorizationService.listAdmin(
      paginationQuery.offset,
      paginationQuery.limit,
      order,
      condition,
      include,
      true,
    );

    return res.status(200).json({
      status: 200,
      data: result.rows,
      totalcount: result.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptRejectBankDetailsAuthReqAdmin = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { bankDetailRequestId, remark, authStatus } = req.body;

    const bankDetailRequestIdList = Array.isArray(bankDetailRequestId)
      ? bankDetailRequestId
      : [bankDetailRequestId];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    };

    const include = [
      {
        model: BankDetailAuthorization,
        attributes: [
          'bankDetailRequestId',
          'userMasterID',
          'bankDetailAuthorizationId',
        ],
        include: [
          {
            model: UserMaster,
            attributes: ['displayName', 'userMasterID'],
            include: [
              {
                separate: true,
                model: AuthorizationDetails,
                attributes: [
                  'AuthorizationDetailsId',
                  'AuthorizationCriteriaID',
                  'AuthorizationMasterID',
                  'AuthorizedByUserMasterId',
                ],
                where: {
                  AuthorizationMasterID:
                    authorizationMasterTypes.statutoryDetail,
                  status: 1,
                },
              },
            ],
          },
        ],
      },
    ];

    const condition = {
      status: 1,
    };
    condition.authorizationStatus = [
      AuthorizationStatusType.PENDING_ZERO,
      AuthorizationStatusType.PEDING_ONE,
      AuthorizationStatusType.PEDING_TWO,
    ];
    condition.bankDetailRequestId = bankDetailRequestIdList;

    const authRequests =
      await bankDetailAuthorizationService.adminDataToApproveReject(
        condition,
        include,
        true,
        ['bankDetailRequestId', 'userMasterID', 'bankDetailRequestId'],
      );

    if (authRequests.length == 0) {
      await transaction.rollback();
      return res
        .status(200)
        .json({ status: 500, message: 'Authorization request not found' });
    }

    const idsToDeleteInbox = authRequests.flatMap((item) =>
      item.bankDetailAuthorizations.map((e) => e.bankDetailAuthorizationId),
    );

    const idsToUpdateJoiningDetails = authRequests.map(
      (item) => item.userMasterID,
    );

    await bankDetailRequestService.update(
      {
        authorizationStatus:
          authStatus == 0
            ? AuthorizationStatusType.REJECTED
            : AuthorizationStatusType.APPROVED,
        authorizerRemark: remark,
        isAuthorizedBy: true,
        authorizedBy: req.userDetails.userMasterId,
        authorizedAt: new Date(),
      },
      { bankDetailRequestId: bankDetailRequestIdList },
      options,
    );

    await userInboxService.destroyUserInbox(
      {
        activityTable: BankDetailAuthorization.getTableName(),
        activityTablePK: { [Op.in]: idsToDeleteInbox },
      },
      options,
    );

    await employeeJoiningService.update(
      {
        bankAccountStatus: authStatus == 0 ? 2 : 1,
      },
      {
        userMasterID: idsToUpdateJoiningDetails,
      },
      options,
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message:
        authStatus == 0
          ? 'Authorization Request Rejected Successfully'
          : 'Authorization Request Accepted Successfully',
    });
  } catch (error) {
    transaction.rollback();
    next(error);
  }
};
