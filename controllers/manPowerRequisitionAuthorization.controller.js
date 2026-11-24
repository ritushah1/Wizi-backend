const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');
const UserMaster = require('../models/userMaster');
const moment = require('moment');
const {
  asiaKolkataDateTime,
  sendNotification,
  invalidKeyParams,
} = require('../utils/commonUtilFunctions');
const { Sequelize } = require('sequelize');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const Designation = require('../models/designation');
const sequelize = require('../config/database');
const UserInbox = require('../models/UserInbox');
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
const { userAttributes, companyAttributes } = require('../utils/commonVars');
const message = require('../response_message/message');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const ManPowerRequisitionRequest = require('../models/manPowerRequisitionRequest');
const ManPowerRequisitionAuthorization = require('../models/manPowerRequisitionAuthorization');
const companyMaster = require('../models/companyMaster');
const StateMaster = require('../models/statemaster');
const CountryMaster = require('../models/countrymaster');
const CityMaster = require('../models/citymaster');

exports.manPowerRequisitionAuthorizationDataByID = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const authorizationRequest = await ManPowerRequisitionRequest.findOne({
      where: { manPowerRequisitionID: id },
      include: [
        {
          model: UserMaster,
          as: 'requestedBy',
          attributes: userAttributes,
          include: [
            {
              required: false,
              model: AuthorizationDetails,
              as: 'authorizationDetails',
              where: {
                status: 1,
                AuthorizationMasterID:
                  authorizationMasterTypes.manPowerRequisition,
              },
              attributes: ['AuthorizationCriteriaID'],
              include: [
                {
                  model: AuthorizationCriteriaMaster,
                  as: 'AuthorizationCriteriaMaster',
                  attributes: ['AuthorizationCriteria'],
                },
              ],
            },
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
        {
          model: UserMaster,
          as: 'createdBy',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'authorizer',
          attributes: ['displayName'],
        },
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
        {
          model: Department,
          attributes: ['departmentName'],
        },
        {
          model: Designation,
          attributes: ['designationName'],
        },
        { model: BranchMaster, attributes: ['branchName'] },
        {
          model: Division,
          attributes: ['divisionName'],
        },
        {
          model: WorkingArea,
          attributes: ['workingAreaName'],
        },
        {
          model: StateMaster,
          attributes: ['stateName', 'stateMasterID'],
          include: [
            {
              model: CountryMaster,
              attributes: ['countryName'],
            },
          ],
        },
        {
          model: UserMaster,
          as: 'reportToEmp',
          attributes: ['displayName'],
          include: [
            {
              model: companyMaster,
              attributes: ['companyName'],
            },
          ],
        },
        {
          model: UserMaster,
          attributes: ['displayName'],
          as: 'replacedEmp',
        },
      ],
    });

    const {
      authorizationStatus,
      userMasterID,
      requestedBy,
      createdBy,
      remarks,
    } = authorizationRequest;

    const { displayName, authorizationDetails } = requestedBy;
    let city = '';
    if (
      authorizationRequest.workingCity &&
      authorizationRequest?.workingCity?.length > 0
    ) {
      const cityMaster = await CityMaster.findAll({
        where: {
          cityMasterID: authorizationRequest.workingCity,
        },
        attributes: ['cityName'],
      });

      city = cityMaster.map((item) => item.cityName);
    }

    const authCriteriaID = authorizationRequest.authCriteriaID;

    const authCriteria = await AuthorizationCriteria.findOne({
      where: { AuthorizationCriteriaID: authCriteriaID },
      attributes: ['AuthorizationCriteria'],
    });

    const authUserStatuses = await ManPowerRequisitionAuthorization.findAll({
      where: { manPowerRequisitionID: id },
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
      authStatus: status.authStatus,
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
      createdBy: createdBy ? createdBy.displayName : '',
      remarks,
      employeeCode:
        authorizationRequest.requestedBy?.employeeJoiningDetails[0]
          ?.employeeCode || '',
      branch:
        authorizationRequest.requestedBy?.employeeBranches?.[0]?.branchMaster
          ?.branchName || '',
      department:
        authorizationRequest.requestedBy?.employeeDepartments?.[0]?.department
          ?.departmentName || '',
      designation:
        authorizationRequest.requestedBy?.employeeDesignations?.[0]?.designation
          ?.designationName || '',
      division:
        authorizationRequest.requestedBy?.employeeDivisions?.[0]?.division
          ?.divisionName || null,
      workingArea:
        authorizationRequest.requestedBy?.employeeWorkingAreas?.[0]?.workingArea
          ?.workingAreaName || null,
      createdAt: authorizationRequest.createdAt,
      userNumber: authorizationRequest.requestedBy?.userNumber,
      authorizer: authorizationRequest?.authorizer?.displayName || null,
      finalRemark: authorizationRequest?.authorizerRemark,
      jobTitle: authorizationRequest.jobTitle,
      manpowerDepartment: authorizationRequest?.department?.departmentName,
      manpowerDesignation: authorizationRequest?.designation?.designationName,
      manpowerDivision: authorizationRequest?.division?.divisionName,
      manpowerBranch: authorizationRequest?.branchMaster?.branchName,
      manpowerWorkingArea: authorizationRequest?.workingArea?.workingAreaName,
      manpowerCompany: authorizationRequest?.companyMaster?.companyName,
      typeOfRequirement:
        authorizationRequest?.typeOfRequirement == 'replacement'
          ? 'Replacement'
          : 'New',
      isTravelRequired:
        authorizationRequest?.isTravelRequired == false ? 'No' : 'Yes',
      ctcFrom: authorizationRequest?.ctcFrom,
      ctcTo: authorizationRequest?.ctcTo,
      expFrom: authorizationRequest?.expFrom,
      expTo: authorizationRequest?.expTo,
      grade: authorizationRequest?.Grade,
      empType: authorizationRequest?.employmentType,
      state: authorizationRequest?.stateMaster?.stateName,
      city: city.join(','),
      country: authorizationRequest?.stateMaster?.countryMaster?.countryName,
      vendorsToHandled: authorizationRequest?.vendorToHandle,
      reportTo: authorizationRequest?.reportToEmp?.displayName,
      reportToCompany:
        authorizationRequest?.reportToEmp?.companyMaster?.companyName,
      replacedEmp: authorizationRequest?.replacedEmp?.displayName,
      replacedEmpCTC: authorizationRequest?.previousEmpCTC,
    };

    return res.status(200).json({ status: 200, data: responseData });
  } catch (error) {
    next(error);
  }
};

exports.listManPowerRequisitionAuthorization = async (req, res, next) => {
  try {
    const { limit, page, status, companyMasterID, userMasterID } = req.body;
    const authUserMasterID = req.userDetails.userMasterId;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginateCondition =
      page && limit ? { offset: (page - 1) * limit, limit } : {};

    const condition = { userMasterID: authUserMasterID };
    if (status !== null && status !== undefined && status !== '') {
      condition.authStatus = status;
      if (+status === 2) {
        condition['$manPowerAuth.authorizationStatus$'] = {
          [Sequelize.Op.notIn]: [3, 4, 5],
        };
      }
    } else {
      condition.authStatus = 2;
      condition['$manPowerAuth.authorizationStatus$'] = {
        [Sequelize.Op.notIn]: [3, 4, 5],
      };
    }

    if (userMasterID && userMasterID.length > 0) {
      condition['$manPowerAuth.userMasterID$'] = {
        [Sequelize.Op.in]: userMasterID,
      };
    }

    const userCondition = { status: 1 };

    const ManPowerRequisitionAuthorizationRequest =
      await ManPowerRequisitionAuthorization.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginateCondition,
        order: [['manPowerRequisitionAuthorizationID', 'DESC']],
        include: [
          {
            required: true,
            as: 'manPowerAuth',
            model: ManPowerRequisitionRequest,
            include: [
              {
                model: UserMaster,
                as: 'requestedBy',
                where: userCondition,
                attributes: ['userMasterID', 'displayName', 'userNumber'],
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
              {
                model: UserMaster,
                as: 'createdBy',
                attributes: ['displayName'],
              },
            ],
          },
        ],
      });

    return res.status(200).json({
      status: 200,
      data: ManPowerRequisitionAuthorizationRequest.rows,
      totalcount: ManPowerRequisitionAuthorizationRequest.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.manPowerRequisitionAuthorizationAcceptReject = async (
  req,
  res,
  next,
) => {
  const transaction = await sequelize.transaction();
  try {
    const { manPowerRequisitionAuthorizationID, remarks, authStatus } =
      req.body;

    const manPowerRequisitionAuthorizationIDList = Array.isArray(
      manPowerRequisitionAuthorizationID,
    )
      ? manPowerRequisitionAuthorizationID
      : [manPowerRequisitionAuthorizationID];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    };

    const authRequests = await ManPowerRequisitionAuthorization.findAll({
      where: {
        manPowerRequisitionAuthorizationID:
          manPowerRequisitionAuthorizationIDList,
        authStatus: 2,
      },
      attributes: [
        'manPowerRequisitionAuthorizationID',
        'userMasterID',
        'authStatus',
        'manPowerRequisitionID',
      ],
      include: [
        {
          model: ManPowerRequisitionRequest,
          as: 'manPowerAuth',
          where: {
            authorizationStatus: [
              AuthorizationStatusType.PENDING_ZERO,
              AuthorizationStatusType.PEDING_ONE,
              AuthorizationStatusType.PEDING_TWO,
            ],
          },
          attributes: [
            'manPowerRequisitionID',
            'userMasterID',
            'authorizationStatus',
          ],
          include: [
            {
              model: UserMaster,
              as: 'requestedBy',
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
                      authorizationMasterTypes.manPowerRequisition,
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

    if (authRequests.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 500,
        message: 'Manpower Requisition Authorization request not found',
      });
    }

    if (authStatus == 0) {
      const allManpowerRequisitionIds = authRequests.map((e) => {
        return e?.manPowerAuth?.manPowerRequisitionID;
      });

      const allAuthorizer = await getAllManpowerRequisition(
        allManpowerRequisitionIds,
        options,
      );

      const allIdToDestroInbox = allAuthorizer.flatMap((e) =>
        e.manPowerAuth.map(
          (id) => id.dataValues.manPowerRequisitionAuthorizationID,
        ),
      );

      const getIdtoUpdateManpowerRequisitionAuth = allIdToDestroInbox.filter(
        (item) => manPowerRequisitionAuthorizationIDList.includes(item),
      );
      await updateManpowerRequisitionAuth(
        getIdtoUpdateManpowerRequisitionAuth,
        options,
        remarks,
        authStatus,
      );
      await destroyAllInboxes(allIdToDestroInbox, options);
      await updateManpowerRequisition(
        allManpowerRequisitionIds,
        options,
        AuthorizationStatusType.REJECTED,
        req.userDetails.userMasterId,
        false,
        remarks,
      );

      await transaction.commit();
      return res.status(200).json({
        status: 200,
        message:
          'Manpower Requisition Authorization request rejected successfully',
      });
    } else {
      const anyOneData = [];
      const anyTwoData = [];
      const anyThreeData = [];
      const sequenceWise = [];
      let allIDsToDeleteInbox = [];
      let allIDsToUpdateManpowerRequisition = [];
      let allIDsToUpdateManpowerRequisitionAuth = [];
      let bulkNotification = [];
      authRequests.map((data) => {
        if (
          data?.manPowerAuth?.requestedBy?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYONE
        ) {
          anyOneData.push({
            manPowerRequisitionAuthorizationID:
              data.manPowerRequisitionAuthorizationID,
            manPowerRequisitionID: data.manPowerRequisitionID,
          });
        }
        if (
          data?.manPowerAuth?.requestedBy?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTWO
        ) {
          anyTwoData.push({
            manPowerRequisitionAuthorizationID:
              data.manPowerRequisitionAuthorizationID,
            manPowerRequisitionID: data.manPowerRequisitionID,
          });
        }
        if (
          data?.manPowerAuth?.requestedBy?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTHREE
        ) {
          anyThreeData.push({
            manPowerRequisitionAuthorizationID:
              data.manPowerRequisitionAuthorizationID,
            manPowerRequisitionID: data.manPowerRequisitionID,
          });
        }
        if (
          data?.manPowerAuth?.requestedBy?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO
        ) {
          sequenceWise.push({
            manPowerRequisitionAuthorizationID:
              data.manPowerRequisitionAuthorizationID,
            manPowerRequisitionID: data.manPowerRequisitionID,
            authorizerIDs:
              data.manPowerAuth.requestedBy.authorizationDetails[0]
                .AuthorizedByUserMasterId, // it is an array of userID
            userNameForNotification: data.manPowerAuth.requestedBy.displayName,
            assignedBy: data.manPowerAuth.requestedBy.userMasterID,
            date: data.manPowerAuth.date,
          });
        }
      });

      if (anyOneData.length > 0) {
        const getAllManPowerRequisitionIds = anyOneData.map((e) => {
          return e.manPowerRequisitionID;
        });

        const getAllAuthorizers = await getAllManpowerRequisition(
          getAllManPowerRequisitionIds,
          options,
        );

        const getAllIdsToDestryInbox = getAllAuthorizers.flatMap((e) =>
          e.manPowerAuth.map((id) => id.manPowerRequisitionAuthorizationID),
        );
        const getIdtoUpdateManpowerRequisitionAuth =
          getAllIdsToDestryInbox.filter((item) =>
            manPowerRequisitionAuthorizationIDList.includes(item),
          );

        allIDsToUpdateManpowerRequisitionAuth = [
          ...allIDsToUpdateManpowerRequisitionAuth,
          ...getIdtoUpdateManpowerRequisitionAuth,
        ];
        allIDsToDeleteInbox = [
          ...allIDsToDeleteInbox,
          ...getAllIdsToDestryInbox,
        ];
        allIDsToUpdateManpowerRequisition = [
          ...allIDsToUpdateManpowerRequisition,
          ...getAllManPowerRequisitionIds,
        ];
      }
      if (anyTwoData.length > 0) {
        const getAllManpowerRequisitionId = anyTwoData.map(
          (e) => e.manPowerRequisitionID,
        );
        const getAUthorizationReqId = anyTwoData.map(
          (e) => e.manPowerRequisitionAuthorizationID,
        );

        const getAllManpower = await getAllManpowerRequisition(
          getAllManpowerRequisitionId,
          options,
        );

        const otherAuthorizers = [];
        const manpowerRequisitionApprovedIds = [];

        getAllManpower.forEach((item) => {
          const authorizers = item.manPowerAuth;

          const approved = authorizers.filter((a) => a.authStatus === 1);

          if (approved.length == 1) {
            const allIds = authorizers.map(
              (a) => a.manPowerRequisitionAuthorizationID,
            );

            otherAuthorizers.push(...allIds);
            manpowerRequisitionApprovedIds.push(item.manPowerRequisitionID);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];
        const getIdtoUpdateManpowerRequisitionAuth =
          getAUthorizationReqId.filter((item) =>
            manPowerRequisitionAuthorizationIDList.includes(item),
          );

        allIDsToUpdateManpowerRequisitionAuth = [
          ...allIDsToUpdateManpowerRequisitionAuth,
          ...getIdtoUpdateManpowerRequisitionAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateManpowerRequisition = [
          ...allIDsToUpdateManpowerRequisition,
          ...manpowerRequisitionApprovedIds,
        ];
      }
      if (anyThreeData.length > 0) {
        const getAllManpowerRequisitionId = anyThreeData.map(
          (e) => e.manPowerRequisitionID,
        );
        const getAUthorizationReqId = anyThreeData.map(
          (e) => e.manPowerRequisitionAuthorizationID,
        );

        const getAllManpower = await getAllManpowerRequisition(
          getAllManpowerRequisitionId,
          options,
        );

        const otherAuthorizers = [];
        const manpowerRequisitionApprovedIds = [];

        getAllManpower.forEach((item) => {
          const authorizers = item.manPowerAuth;

          const approved = authorizers.filter((a) => a.authStatus === 1);

          if (approved.length == 2) {
            const allIds = authorizers.map(
              (a) => a.manPowerRequisitionAuthorizationID,
            );

            otherAuthorizers.push(...allIds);
            manpowerRequisitionApprovedIds.push(item.manPowerRequisitionID);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];
        const getIdtoUpdateManpowerRequisitionAuth =
          getAUthorizationReqId.filter((item) =>
            manPowerRequisitionAuthorizationIDList.includes(item),
          );

        allIDsToUpdateManpowerRequisitionAuth = [
          ...allIDsToUpdateManpowerRequisitionAuth,
          ...getIdtoUpdateManpowerRequisitionAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateManpowerRequisition = [
          ...allIDsToUpdateManpowerRequisition,
          ...manpowerRequisitionApprovedIds,
        ];
      }
      if (sequenceWise.length > 0) {
        const getAllManpowerRequisitionId = sequenceWise.map(
          (e) => e.manPowerRequisitionID,
        );
        const getAUthorizationReqId = sequenceWise.map(
          (e) => e.manPowerRequisitionAuthorizationID,
        );

        const otherAuthorizers = [];
        const manpowerRequisitionApprovedIds = [];
        const createManpowerRequisitionAuth = [];
        const sendNotificationInbox = [];

        const getIdtoUpdateManpowerRequisitionAuth =
          getAUthorizationReqId.filter((item) =>
            manPowerRequisitionAuthorizationIDList.includes(item),
          );
        await updateManpowerRequisitionAuth(
          getIdtoUpdateManpowerRequisitionAuth,
          options,
          remarks,
          authStatus,
        );
        // allIDsToUpdateManpowerRequisitionAuth = [
        //   ...allIDsToUpdateManpowerRequisitionAuth,
        //   ...getIdtoUpdateManpowerRequisitionAuth,
        // ];
        const getAllManpower = await getAllManpowerRequisition(
          getAllManpowerRequisitionId,
          options,
        );

        getAllManpower.forEach((item) => {
          const authorizers = item.manPowerAuth;

          const approved = authorizers.filter((a) => a.authStatus === 1);

          const seq = sequenceWise.find(
            (x) => x.manPowerRequisitionID == item.manPowerRequisitionID,
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
            const allIds = authorizers.map(
              (a) => a.manPowerRequisitionAuthorizationID,
            );

            otherAuthorizers.push(...allIds);
            manpowerRequisitionApprovedIds.push(item.manPowerRequisitionID);
            return;
          }

          const nextUser = remainingUsers[0]; // FIRST PENDING USER

          createManpowerRequisitionAuth.push({
            manPowerRequisitionID: item.manPowerRequisitionID,
            userMasterID: +nextUser,
            authStatus: 2,
          });
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateManpowerRequisition = [
          ...allIDsToUpdateManpowerRequisition,
          ...manpowerRequisitionApprovedIds,
        ];

        const createNewManpowerRequisitionAuth =
          await ManPowerRequisitionAuthorization.bulkCreate(
            createManpowerRequisitionAuth,
            { ...options },
          );

        sequenceWise.map((item) => {
          const data = createNewManpowerRequisitionAuth.find(
            (e) => e.manPowerRequisitionID == item.manPowerRequisitionID,
          );

          if (data) {
            sendNotificationInbox.push({
              assignedTo: data.userMasterID,
              manPowerRequisitionID: item.manPowerRequisitionID,
              assignedBy: item.assignedBy,
              activityTable: ManPowerRequisitionAuthorization.getTableName(),
              activityTablePK: data.manPowerRequisitionAuthorizationID,
              message: `${item.userNameForNotification} has requested for Manpower Requisition`,
            });
          }
        });

        if (sendNotificationInbox.length > 0) {
          bulkNotification = await UserInbox.bulkCreate(sendNotificationInbox, {
            ...options,
          });
        }
      }
      await updateManpowerRequisitionAuth(
        allIDsToUpdateManpowerRequisitionAuth,
        options,
        remarks,
        authStatus,
      );

      await destroyAllInboxes(allIDsToDeleteInbox, options);
      if (allIDsToUpdateManpowerRequisition.length > 0) {
        await updateManpowerRequisition(
          allIDsToUpdateManpowerRequisition,
          options,
          AuthorizationStatusType.APPROVED,
          req.userDetails.userMasterId,
          false,
          remarks,
        );
      }
      await transaction.commit();
      const data = {
        screen: notificationScreentTypes.MANPOWERREQUISITION,
      };

      bulkNotification.forEach(async (item) => {
        const notification = {
          title: notificationTitleTypes.MANPOWERREQUISITION,
          body: item.message,
        };
        sendNotification(item.assignedTo, notification, data);
      });

      return res.status(200).json({
        status: 200,
        message:
          'Manpower Requisition Authorization request approved successfully',
      });
    }
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

async function updateManpowerRequisitionAuth(
  allIdToUpdate,
  options,
  remarks,
  authStatus,
) {
  const updateAllAuthorizationById =
    await ManPowerRequisitionAuthorization.update(
      {
        remarks: remarks,
        authStatus: authStatus,
      },
      {
        where: {
          manPowerRequisitionAuthorizationID: allIdToUpdate,
        },
        ...options,
      },
    );
}

async function destroyAllInboxes(allIdToDestroInbox, options) {
  const destroyAllInbox = await UserInbox.destroy(
    {
      where: {
        activityTable: ManPowerRequisitionAuthorization.getTableName(),
        activityTablePK: allIdToDestroInbox,
      },
    },
    { ...options },
  );
}

async function updateManpowerRequisition(
  allManpowerRequisitionIds,
  options,
  authorizationStatus,
  userMasterId,
  isAuthorizedBy = false,
  remark,
) {
  const rejectAllRequests = await ManPowerRequisitionRequest.update(
    {
      authorizationStatus: authorizationStatus,
      authorizedBy: userMasterId,
      authorizedAt: new Date(),
      isAuthorizedBy: isAuthorizedBy,
      authorizerRemark: remark,
    },
    {
      where: {
        manPowerRequisitionID: allManpowerRequisitionIds,
      },
      ...options,
    },
  );
}

async function getAllManpowerRequisition(allManpowerRequisitionIds, options) {
  const allAuthorizer = await ManPowerRequisitionRequest.findAll({
    logging: true,
    where: {
      manPowerRequisitionID: allManpowerRequisitionIds,
      authorizationStatus: [
        AuthorizationStatusType.PENDING_ZERO,
        AuthorizationStatusType.PEDING_ONE,
        AuthorizationStatusType.PEDING_TWO,
      ],
    },
    include: [
      {
        model: ManPowerRequisitionAuthorization,
        as: 'manPowerAuth',
      },
    ],
    ...options,
  });
  return allAuthorizer;
}
