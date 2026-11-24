const UserMaster = require('../models/userMaster');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');
const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const EmployeeBranch = require('../models/employeeBranch');
const {
  sendNotification,
  asiaKolkataDateTime,
  sendBulkNotification,
} = require('../utils/commonUtilFunctions');
``;
const UserInbox = require('../models/UserInbox');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const message = require('../response_message/message');
const {
  authorizationMasterTypes,
  AuthorizationStatusType,
  authorizationCriteriaType,
  notificationScreentTypes,
  notificationTitleTypes,
} = require('../utils/dbUtils');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const LoanAuthorization = require('../models/loanAuthorizationRequest');
const LoanMaster = require('../models/loanMaster');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.viewLoanAuthorizationByUserId = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      startdate,
      enddate,
      userMasterID,
      user,
      status,
      searchQuery,
      companyMasterID,
      branchMasterID,
    } = req.body;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginateCondition =
      page && limit ? { offset: (page - 1) * limit, limit } : {};

    const condition = {
      status: 1,
      userMasterID,
      //   '$loanMaster.status$': 1,
    };

    if (status !== null && status !== undefined) {
      condition.authstatus = status;
      if (+status === 2) {
        condition['$loanMaster.authorizationStatus$'] = {
          [Sequelize.Op.notIn]: [3, 4],
        };
      }
    }

    if (user && user.length > 0) {
      condition['$loanMaster.userMasterID$'] = {
        [Sequelize.Op.in]: user,
      };
    }

    if (startdate && enddate) {
      const start = new Date(startdate);
      start.setHours(0, 0, 0, 0); // start of day

      const end = new Date(enddate);
      end.setHours(23, 59, 59, 999); // end of day

      condition['$loanMaster.createdAt$'] = {
        [Sequelize.Op.between]: [start, end],
      };
    }
    const userMasterCondition = { status: 1 };
    if (searchQuery) {
      userMasterCondition.displayName = {
        [Sequelize.Op.iLike]: `%${searchQuery}%`,
      };
    }

    if (companyMasterID) {
      userMasterCondition.companyMasterId = companyMasterID;
    }
    const branchCondition = {
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
    };
    if (branchMasterID && branchMasterID.length > 0) {
      branchCondition.branchID = branchMasterID;
    }

    const LoanAuthorizationRequest = await LoanAuthorization.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginateCondition,
      order: [['createdAt', 'DESC']],
      include: [
        {
          required: true,
          model: LoanMaster,
          include: [
            {
              model: UserMaster,
              attributes: [
                'userMasterID',
                'displayName',
                'userNumber',
                'photo',
              ],
              where: userMasterCondition,
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
                  required: branchMasterID ? true : false,
                  model: EmployeeBranch,
                  where: branchCondition,
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
                  required: true,
                  model: EmployeeJoiningDetails,
                  attributes: ['employeeCode'],
                },
                {
                  required: false,
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
              model: UserMaster,
              as: 'createdByUser',
              attributes: ['displayName'],
            },
            {
              model: UserMaster,
              as: 'updatedByUser',
              attributes: ['displayName'],
            },
          ],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: LoanAuthorizationRequest.rows,
      totalcount: LoanAuthorizationRequest.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.getLoanAuthorizationRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const authorizationRequest = await LoanMaster.findOne({
      where: { LoanID: id },
      include: [
        {
          model: UserMaster,
          attributes: ['userMasterID', 'displayName', 'userNumber'],
          include: [
            {
              required: false,
              model: AuthorizationDetails,
              as: 'authorizationDetails',
              where: {
                status: 1,
                AuthorizationMasterID: authorizationMasterTypes.loan,
              },
              attributes: ['AuthorizationCriteriaID'],
              include: [
                {
                  model: AuthorizationCriteria,
                  as: 'AuthorizationCriteriaMaster',
                  attributes: ['AuthorizationCriteria'],
                },
              ],
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
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              required: false,
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
          model: UserMaster,
          as: 'authorizer',
          attributes: ['displayName'],
        },
      ],
    });

    if (!authorizationRequest) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Loan Request'),
      });
    }

    const { authorizationStatus, userMasterID, userMaster } =
      authorizationRequest;

    const { displayName, authorizationDetails } = userMaster;

    const authCriteriaID =
      authorizationDetails && authorizationDetails.length > 0
        ? authorizationDetails[0].AuthorizationCriteriaID
        : null;

    const authCriteria = await AuthorizationCriteria.findOne({
      where: { AuthorizationCriteriaID: authCriteriaID },
      attributes: ['AuthorizationCriteria'],
    });

    const authUserStatuses = await LoanAuthorization.findAll({
      where: { LoanID: id },
    });

    const userMasterIDs = authUserStatuses.map((item) => item.userMasterID);

    const users = await UserMaster.findAll({
      where: { userMasterID: userMasterIDs },
      attributes: ['userMasterID', 'displayName'],
    });

    const userMap = new Map(
      users.map((user) => [user.userMasterID.toString(), user.displayName]),
    );

    const authUserStatusData = authUserStatuses.map((status) => ({
      userMasterID: status.userMasterID,
      displayName: userMap.get(status.userMasterID.toString()) || null,
      authstatus: status.authstatus,
      remarks: status.remarks,
      updatedAt: status.updatedAt,
    }));

    const responseData = {
      authorizationStatus,
      userMasterID,
      displayName,
      AuthorizationCriteria: authCriteria
        ? authCriteria.AuthorizationCriteria
        : '',

      authUserStatus:
        authUserStatusData && authUserStatusData.length > 0
          ? authUserStatusData
          : [],

      employeeCode:
        authorizationRequest.userMaster?.employeeJoiningDetails[0]
          ?.employeeCode || '',
      branch:
        authorizationRequest.userMaster?.employeeBranches?.[0]?.branchMaster
          ?.branchName || '',
      department:
        authorizationRequest.userMaster?.employeeDepartments?.[0]?.department
          ?.departmentName || '',
      designation:
        authorizationRequest.userMaster?.employeeDesignations?.[0]?.designation
          ?.designationName || '',
      division:
        authorizationRequest.userMaster?.employeeDivisions?.[0]?.division
          ?.divisionName || null,
      workingArea:
        authorizationRequest.userMaster?.employeeWorkingAreas?.[0]?.workingArea
          ?.workingAreaName || null,
      createdAt: authorizationRequest.createdAt,
      userNumber: authorizationRequest.userMaster?.userNumber,
      authorizer: authorizationRequest?.authorizer?.displayName,
      authorizerRemark: authorizationRequest?.authorizerRemark,
      loanAmount: authorizationRequest.LoanAmount,
      loanRemark: authorizationRequest.LoanRemark,
    };

    return res.status(200).json({ status: 200, data: responseData });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.getLoanAuthorizationRequestByIdV2 = async (req, res, next) => {
  try {
    const { id ,userMasterId } = req.body;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const authorizationRequest = await LoanMaster.findOne({
      where: { LoanID: id ,userMasterID:userMasterId },
      include: [
        {
          model: UserMaster,
          attributes: ['userMasterID', 'displayName', 'userNumber'],
          include: [
            {
              required: false,
              model: AuthorizationDetails,
              as: 'authorizationDetails',
              where: {
                status: 1,
                AuthorizationMasterID: authorizationMasterTypes.loan,
              },
              attributes: ['AuthorizationCriteriaID'],
              include: [
                {
                  model: AuthorizationCriteria,
                  as: 'AuthorizationCriteriaMaster',
                  attributes: ['AuthorizationCriteria'],
                },
              ],
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
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              required: false,
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
          model: UserMaster,
          as: 'authorizer',
          attributes: ['displayName'],
        },
      ],
    });

    if (!authorizationRequest) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Loan Request'),
      });
    }

    const { authorizationStatus, userMasterID, userMaster } =
      authorizationRequest;

    const { displayName, authorizationDetails } = userMaster;

    const authCriteriaID =
      authorizationDetails && authorizationDetails.length > 0
        ? authorizationDetails[0].AuthorizationCriteriaID
        : null;

    const authCriteria = await AuthorizationCriteria.findOne({
      where: { AuthorizationCriteriaID: authCriteriaID },
      attributes: ['AuthorizationCriteria'],
    });

    const authUserStatuses = await LoanAuthorization.findAll({
      where: { LoanID: id },
    });

    const userMasterIDs = authUserStatuses.map((item) => item.userMasterID);

    const users = await UserMaster.findAll({
      where: { userMasterID: userMasterIDs },
      attributes: ['userMasterID', 'displayName'],
    });

    const userMap = new Map(
      users.map((user) => [user.userMasterID.toString(), user.displayName]),
    );

    const authUserStatusData = authUserStatuses.map((status) => ({
      userMasterID: status.userMasterID,
      displayName: userMap.get(status.userMasterID.toString()) || null,
      authstatus: status.authstatus,
      remarks: status.remarks,
      updatedAt: status.updatedAt,
    }));

    const responseData = {
      authorizationStatus,
      userMasterID,
      displayName,
      AuthorizationCriteria: authCriteria
        ? authCriteria.AuthorizationCriteria
        : '',

      authUserStatus:
        authUserStatusData && authUserStatusData.length > 0
          ? authUserStatusData
          : [],

      employeeCode:
        authorizationRequest.userMaster?.employeeJoiningDetails[0]
          ?.employeeCode || '',
      branch:
        authorizationRequest.userMaster?.employeeBranches?.[0]?.branchMaster
          ?.branchName || '',
      department:
        authorizationRequest.userMaster?.employeeDepartments?.[0]?.department
          ?.departmentName || '',
      designation:
        authorizationRequest.userMaster?.employeeDesignations?.[0]?.designation
          ?.designationName || '',
      division:
        authorizationRequest.userMaster?.employeeDivisions?.[0]?.division
          ?.divisionName || null,
      workingArea:
        authorizationRequest.userMaster?.employeeWorkingAreas?.[0]?.workingArea
          ?.workingAreaName || null,
      createdAt: authorizationRequest.createdAt,
      userNumber: authorizationRequest.userMaster?.userNumber,
      authorizer: authorizationRequest?.authorizer?.displayName,
      authorizerRemark: authorizationRequest?.authorizerRemark,
      loanAmount: authorizationRequest.LoanAmount,
      loanRemark: authorizationRequest.LoanRemark,
    };

    return res.status(200).json({ status: 200, data: responseData });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.loanAuthorizationacceptreject = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { loanAuthorizationID, rejectionRemarks, authstatus } = req.body;

    const loanAuthorizationIDList = Array.isArray(loanAuthorizationID)
      ? loanAuthorizationID
      : [loanAuthorizationID];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    };

    const authRequests = await getAllLoanAuth(loanAuthorizationIDList, options);

    const iosToken = [];
    const androidToken = [];

    if (authRequests.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: 'Loan Authorization request not found',
      });
    }

    if (authstatus == 0) {
      const allLoanIds = authRequests.map((e) => {
        return e?.loanMaster?.LoanID;
      });

      const allAuthorizer = await getAllLoan(allLoanIds, options);

      const allIdToDestroInbox = allAuthorizer.flatMap((e) =>
        e.loanAuthorizationRequests.map((id) => id.loanAuthorizationID),
      );

      await updateLoanAuth(
        loanAuthorizationIDList,
        options,
        rejectionRemarks,
        authstatus,
      );
      await destroyAllInboxes(allIdToDestroInbox, options);
      await updateLoan(
        allLoanIds,
        options,
        AuthorizationStatusType.REJECTED,
        req.userDetails.userMasterId,
        false,
        rejectionRemarks,
      );

      await transaction.commit();

      const payload = {
        notification: {
          title: 'Loan',
          body: 'Your loan is rejected.',
        },
        data: {
          screen: 'loan',
        },
      };

      allAuthorizer.forEach((item) => {
        const user = item.userMaster;

        if (user?.firebaseToken) {
          if (user.deviceType === 'ios') {
            iosToken.push(user.firebaseToken);
          } else {
            androidToken.push(user.firebaseToken);
          }
        }
      });

      if (iosToken.length > 0) {
        sendBulkNotification(iosToken, payload, 'ios');
      }
      if (androidToken.length > 0) {
        sendBulkNotification(androidToken, payload, 'android');
      }

      return res.status(200).json({
        status: 200,
        message: 'Loan Authorization request rejected successfully',
      });
    } else {
      const anyOneData = [];
      const anyTwoData = [];
      const anyThreeData = [];
      const sequenceWise = [];
      let allIDsToDeleteInbox = [];
      let allIDsToUpdateLoan = [];
      let bulkNotification = [];
      authRequests.map((data) => {
        if (
          data?.loanMaster?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYONE
        ) {
          anyOneData.push({
            loanAuthorizationID: data.loanAuthorizationID,
            LoanID: data?.loanMaster.LoanID,
          });
        }
        if (
          data?.loanMaster?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTWO
        ) {
          anyTwoData.push({
            loanAuthorizationID: data.loanAuthorizationID,
            LoanID: data.LoanID,
          });
        }
        if (
          data?.loanMaster?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTHREE
        ) {
          anyThreeData.push({
            loanAuthorizationID: data.loanAuthorizationID,
            LoanID: data.LoanID,
          });
        }
        if (
          data?.loanMaster?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO
        ) {
          sequenceWise.push({
            loanAuthorizationID: data.loanAuthorizationID,
            LoanID: data.LoanID,
            authorizerIDs:
              data.loanMaster.userMaster.authorizationDetails[0]
                .AuthorizedByUserMasterId,
            userNameForNotification: data.loanMaster.userMaster.displayName,
            assignedBy: data.loanMaster.userMaster.userMasterID,
          });
        }
      });

      if (anyOneData.length > 0) {
        const getAllLoanIds = anyOneData.map((e) => {
          return e.LoanID;
        });

        const getAllAuthorizers = await getAllLoan(getAllLoanIds, options);

        getAllAuthorizers.forEach((item) => {
          const user = item.userMaster;

          if (user?.firebaseToken) {
            if (user.deviceType === 'ios') {
              iosToken.push(user.firebaseToken);
            } else {
              androidToken.push(user.firebaseToken);
            }
          }
        });

        const getAllIdsToDestryInbox = getAllAuthorizers.flatMap((e) =>
          e.loanAuthorizationRequests.map((id) => id.loanAuthorizationID),
        );

        allIDsToDeleteInbox = [
          ...allIDsToDeleteInbox,
          ...getAllIdsToDestryInbox,
        ];
        allIDsToUpdateLoan = [...allIDsToUpdateLoan, ...getAllLoanIds];
      }
      if (anyTwoData.length > 0) {
        const getAllLoanId = anyTwoData.map((e) => e.LoanID);
        const getAUthorizationReqId = anyTwoData.map(
          (e) => e.loanAuthorizationID,
        );

        const getAllLoanData = await getAllLoan(getAllLoanId, options);

        const otherAuthorizers = [];
        const LoanApprovedIds = [];

        getAllLoanData.forEach((item) => {
          const authorizers = item.loanAuthorizationRequests;

          const approved = authorizers.filter((a) => a.authstatus == 1);

          if (approved.length == 1) {
            const allIds = authorizers.map((a) => a.loanAuthorizationID);

            const user = item.userMaster;
            if (user?.firebaseToken) {
              if (user.deviceType === 'ios') {
                iosToken.push(user.firebaseToken);
              } else {
                androidToken.push(user.firebaseToken);
              }
            }

            otherAuthorizers.push(...allIds);
            LoanApprovedIds.push(item.LoanID);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateLoan = [...allIDsToUpdateLoan, ...LoanApprovedIds];
      }
      if (anyThreeData.length > 0) {
        const getAllLoanId = anyThreeData.map((e) => e.LoanID);
        const getAUthorizationReqId = anyThreeData.map(
          (e) => e.loanAuthorizationID,
        );

        const getAllLoanData = await getAllLoan(getAllLoanId, options);

        const otherAuthorizers = [];
        const LoanApprovedIds = [];

        getAllLoanData.forEach((item) => {
          const authorizers = item.loanAuthorizationRequests;

          const approved = authorizers.filter((a) => a.authstatus == 1);

          if (approved.length == 2) {
            const allIds = authorizers.map((a) => a.loanAuthorizationID);

            const user = item.userMaster;
            if (user?.firebaseToken) {
              if (user.deviceType === 'ios') {
                iosToken.push(user.firebaseToken);
              } else {
                androidToken.push(user.firebaseToken);
              }
            }

            otherAuthorizers.push(...allIds);
            LoanApprovedIds.push(item.LoanID);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateLoan = [...allIDsToUpdateLoan, ...LoanApprovedIds];
      }
      if (sequenceWise.length > 0) {
        const getAllLoanId = sequenceWise.map((e) => e.LoanID);
        const getAUthorizationReqId = sequenceWise.map(
          (e) => e.loanAuthorizationID,
        );

        const otherAuthorizers = [];
        const LoanApprovedIds = [];
        const createLoansAuth = [];
        const sendNotificationInbox = [];

        await updateLoanAuth(
          loanAuthorizationIDList,
          options,
          rejectionRemarks,
          authstatus,
        );
        const getAllLoanData = await getAllLoan(getAllLoanId, options);

        getAllLoanData.forEach((item) => {
          const authorizers = item.loanAuthorizationRequests;

          const approved = authorizers.filter((a) => a.authstatus == 1);

          const seq = sequenceWise.find((x) => x.LoanID === item.LoanID);

          if (!seq) return;

          const sequenceUserIDs = seq.authorizerIDs.map((id) => id.toString());

          const approvedUserIDs = approved.map((a) =>
            a.userMasterID.toString(),
          );

          const remainingUsers = sequenceUserIDs.filter(
            (id) => !approvedUserIDs.includes(id),
          );

          if (remainingUsers.length === 0) {
            const allIds = authorizers.map((a) => a.LoansAuthorizationID);

            const user = item.userMaster;
            if (user?.firebaseToken) {
              if (user.deviceType === 'ios') {
                iosToken.push(user.firebaseToken);
              } else {
                androidToken.push(user.firebaseToken);
              }
            }

            otherAuthorizers.push(...allIds);
            LoanApprovedIds.push(item.LoanID);

            return;
          }

          const nextUser = remainingUsers[0]; // FIRST PENDING USER

          createLoansAuth.push({
            LoanID: item.LoanID,
            userMasterID: +nextUser,
            authstatus: 2,
            TableName: LoanMaster.getTableName(),
            status: 1,
          });
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateLoan = [...allIDsToUpdateLoan, ...LoanApprovedIds];

        const createNewLoansAuth = await LoanAuthorization.bulkCreate(
          createLoansAuth,
          {
            ...options,
          },
        );

        sequenceWise.map((item) => {
          const data = createNewLoansAuth.find((e) => e.LoanID == item.LoanID);

          if (data) {
            sendNotificationInbox.push({
              assignedTo: data.userMasterID,
              LoansID: item.LoanID,
              assignedBy: item.assignedBy,
              activityTable: LoanAuthorization.getTableName(),
              activityTablePK: data.loanAuthorizationID,
              message: `${item.userNameForNotification} has requested Loan`,
            });
          }
        });

        if (sendNotificationInbox.length > 0) {
          bulkNotification = await UserInbox.bulkCreate(sendNotificationInbox, {
            ...options,
          });
        }
      }

      await updateLoanAuth(
        loanAuthorizationIDList,
        options,
        rejectionRemarks,
        authstatus,
      );

      await destroyAllInboxes(allIDsToDeleteInbox, options);
      if (allIDsToUpdateLoan.length > 0) {
        await updateLoan(
          allIDsToUpdateLoan,
          options,
          AuthorizationStatusType.APPROVED,
          req.userDetails.userMasterId,
          false,
          rejectionRemarks,
        );
      }
      await transaction.commit();
      const data = {
        screen: notificationScreentTypes.LOAN,
      };

      bulkNotification.forEach(async (item) => {
        const notification = {
          title: notificationTitleTypes.LOAN,
          body: item.message,
        };
        sendNotification(item.assignedTo, notification, data);
      });
    }

    const payload = {
      notification: {
        title: 'Loan',
        body: 'Your loan is accepted.',
      },
      data: {
        screen: 'loan',
      },
    };

    if (iosToken.length > 0) {
      sendBulkNotification(iosToken, payload, 'ios');
    }
    if (androidToken.length > 0) {
      sendBulkNotification(androidToken, payload, 'android');
    }

    return res.status(200).json({
      status: 200,
      message: 'Loan Request Accepted Successfully',
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getAllLoanAuthorizationAdmin = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      startdate,
      userMasterID,
      authorizationstatus,
      companyMasterID,
      enddate,
      searchQuery,
      user,
    } = req.body;

    if (!companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Company'),
      });
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const condition = {};

    if (userMasterID.length > 0) {
      condition.userMasterID = userMasterID;
    }

    if (startdate) {
      const start = new Date(startdate);
      start.setHours(0, 0, 0, 0); // start of day

      const end = enddate ? new Date(enddate) : new Date();
      end.setHours(23, 59, 59, 999); // end of day
      condition['$loanMaster.createdAt$'] = {
        [Sequelize.Op.between]: [startdate, end],
      };
    }

    if (authorizationstatus) {
      if (authorizationstatus == 1) {
        condition.authorizationStatus = [0, 1, 2];
      } else {
        condition.authorizationStatus = authorizationstatus;
      }
    } else {
      condition.authorizationStatus = [0, 1, 2];
    }

    const userMasterCondition = {
      companyMasterId: companyMasterID,
      status: 1,
    };
    if (searchQuery) {
      userMasterCondition.displayName = {
        [Sequelize.Op.iLike]: `%${searchQuery}%`,
      };
    }
    if (user && user.length > 0) {
      condition.userMasterID = user;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const getAllLoanAuthRequest = await LoanMaster.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: UserMaster,
          attributes: ['userMasterID', 'displayName', 'userNumber'],
          where: { ...userMasterCondition, ...userAccessCondition.where },
          include: [
            ...userAccessCondition.includeModels,
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
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              required: false,
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
          as: 'authorizer',
          attributes: ['displayName'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: getAllLoanAuthRequest.rows,
      totalcount: getAllLoanAuthRequest.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptRejectLoanAuthAdmin = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { LoanID, authstatus, rejectionRemarks } = req.body;

    if (!LoanID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Extra Days Authorization Request',
        ),
      });
    }

    const loanAuthorizationIDList = Array.isArray(LoanID) ? LoanID : [LoanID];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    };

    const allLoan = await getAllLoan(loanAuthorizationIDList, options);
    const iosToken = [];
    const androidToken = [];
    allLoan.forEach((item) => {
      const user = item.userMaster;

      if (user?.firebaseToken) {
        if (user.deviceType === 'ios') {
          iosToken.push(user.firebaseToken);
        } else {
          androidToken.push(user.firebaseToken);
        }
      }
    });

    if (allLoan.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Loan Authorization Request',
        ),
      });
    }

    const idToApproveLoan = allLoan.map((item) => item.LoanID);
    const idToDestroyInbox = allLoan.flatMap((item) =>
      item.loanAuthorizationRequests.map((e) => e.loanAuthorizationID),
    );

    await destroyAllInboxes(idToDestroyInbox, options);
    const updatedData =
      authstatus == 1
        ? await updateLoan(
            idToApproveLoan,
            options,
            AuthorizationStatusType.APPROVED,
            req.userDetails.userMasterId,
            true,
            rejectionRemarks,
          )
        : await updateLoan(
            idToApproveLoan,
            options,
            AuthorizationStatusType.REJECTED,
            req.userDetails.userMasterId,
            true,
            rejectionRemarks,
          );

    await transaction.commit();

    const payload = {
      notification: {
        title: 'Loan',
        body:
          authstatus == 1 ? 'Your loan is accepted.' : 'Your loan is rejected.',
      },
      data: {
        screen: 'loan',
      },
    };

    if (iosToken.length > 0) {
      sendBulkNotification(iosToken, payload, 'ios');
    }
    if (androidToken.length > 0) {
      sendBulkNotification(androidToken, payload, 'android');
    }
    return res.status(200).json({
      status: 200,
      message:
        authstatus == 1
          ? 'Loan Authorization Request Approved Successfully'
          : 'Loan Authorization Request Rejected Successfully',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

async function updateLoanAuth(allIdToUpdate, options, remarks, authStatus) {
  const updateAllAuthorizationById = await LoanAuthorization.update(
    {
      remarks: remarks,
      authstatus: authStatus,
    },
    {
      where: {
        loanAuthorizationID: allIdToUpdate,
      },
      ...options,
    },
  );
}

async function destroyAllInboxes(allIdToDestroInbox, options) {
  const destroyAllInbox = await UserInbox.destroy(
    {
      where: {
        activityTable: LoanAuthorization.getTableName(),
        activityTablePK: allIdToDestroInbox,
      },
    },
    { ...options },
  );
}

async function updateLoan(
  allLoanIds,
  options,
  authorizationStatus,
  userMasterId,
  isAuthorizedBy = false,
  remark,
) {
  const rejectAllRequests = await LoanMaster.update(
    {
      authorizationStatus: authorizationStatus,
      authorizedBy: userMasterId,
      authorizedAt: new Date(),
      isAuthorizedBy: isAuthorizedBy,
      authorizerRemark: remark,
      updatedBy: userMasterId,
    },
    {
      where: {
        LoanID: allLoanIds,
      },
      ...options,
    },
  );
}

async function getAllLoan(allLoanIds, options) {
  const allAuthorizer = await LoanMaster.findAll({
    where: {
      LoanID: allLoanIds,
      authorizationStatus: [
        AuthorizationStatusType.PENDING_ZERO,
        AuthorizationStatusType.PEDING_ONE,
        AuthorizationStatusType.PEDING_TWO,
      ],
    },
    include: [
      {
        model: LoanAuthorization,
      },
      {
        model: UserMaster,
        attributes: ['firebaseToken', 'deviceType'],
      },
    ],
    ...options,
  });
  return allAuthorizer;
}

async function getAllLoanAuth(loanAuthorizationIDList, options) {
  const authorizers = await LoanAuthorization.findAll({
    where: {
      loanAuthorizationID: loanAuthorizationIDList,
      authstatus: 2,
    },
    attributes: ['loanAuthorizationID', 'userMasterID', 'authstatus', 'LoanID'],
    include: [
      {
        model: LoanMaster,
        where: {
          authorizationStatus: [
            AuthorizationStatusType.PENDING_ZERO,
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        attributes: ['LoanID', 'userMasterID', 'authorizationStatus'],
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
                  AuthorizationMasterID: authorizationMasterTypes.loan,
                  status: 1,
                },
              },
            ],
          },
        ],
      },
    ],
    ...options,
  });

  return authorizers;
}
