const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const toursMaster = require('../models/toursMaster');
const tourAuthorization = require('../models/tourAuthorization');
const UserMaster = require('../models/userMaster');
const EmployeeDesignation = require('../models/employeeDesignation');
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
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');
const UserInbox = require('../models/UserInbox');

const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');
const message = require('../response_message/message');
const {
  authorizationMasterTypes,
  authorizationCriteriaType,
  AuthorizationStatusType,
  notificationScreentTypes,
  notificationTitleTypes,
} = require('../utils/dbUtils');
const {
  sendNotification,
  sendBulkNotification,
} = require('../utils/commonUtilFunctions');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const { generateExcelWithAuthorizers } = require('../utils/exportData');

exports.viewTourAuthorizationByUserId = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      startdate,
      enddate,
      user,
      status,
      searchQuery,
      companyMasterID,
      branchMasterID,
      Export,
    } = req.body;

    const userMasterID = req.userDetails.userMasterId;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginateCondition =
      page && limit && !Export ? { offset: (page - 1) * limit, limit } : {};

    const condition = {
      status: 1,
      userMasterID, // tourAuthorization.userMasterID -> the person who must authorize
    };

    if (status !== null && status !== undefined) {
      condition.authStatus = status;
      if (+status === 2) {
        condition['$toursMaster.authorizationStatus$'] = {
          [Sequelize.Op.notIn]: [3, 4],
        };
      }
    }

    if (user && user.length > 0) {
      condition['$toursMaster.UserMasterID$'] = {
        [Sequelize.Op.in]: user,
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

    const tourMasterCondition = {
      status: 1,
    };
    const branchCondition = {
      status: 1,
      applicableDate: {
        [Sequelize.Op.lte]: new Date(filterDate),
      },
      [Sequelize.Op.or]: [
        { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
        { endDate: { [Sequelize.Op.eq]: null } },
      ],
    };
    if (branchMasterID && branchMasterID.length > 0) {
      branchCondition.branchID = branchMasterID;
    }
    if (startdate && enddate) {
      tourMasterCondition[Sequelize.Op.and] = [
        {
          FromDate: {
            [Sequelize.Op.lte]: enddate,
          },
        },
        {
          ToDate: {
            [Sequelize.Op.gte]: startdate,
          },
        },
      ];
    }

    const TourAuthorizationRequest = await tourAuthorization.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginateCondition,
      order: [['createdAt', 'DESC']],
      include: [
        {
          required: true,
          as: 'toursMaster',
          model: toursMaster,
          where: tourMasterCondition,
          include: [
            {
              model: tourAuthorization,
              as: 'tourAuth',
              attributes: ['userMasterID', 'authStatus', 'tourAuthorizationID'],
              include: [
                {
                  model: UserMaster,
                  as: 'authorizedPerson',
                  attributes: ['displayName'],
                },
              ],
            },
            {
              model: AuthorizationCriteriaMaster,
              attributes: ['AuthorizationCriteria'],
            },
            {
              model: UserMaster,
              as: 'assign',
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
                      { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
                      { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
                  include: [{ model: Division, attributes: ['divisionName'] }],
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
                    { model: WorkingArea, attributes: ['workingAreaName'] },
                  ],
                },
              ],
            },
            {
              model: UserMaster,
              as: 'createByUser',
              attributes: ['displayName'],
            },
            {
              model: UserMaster,
              as: 'updateByUser',
              attributes: ['displayName'],
            },
          ],
        },
      ],
    });

    if (Export) {
      // Resolve CoPersonId -> display names, same pattern as gettourdatabycompanyid
      const uniqueCoPersonIds = new Set();
      TourAuthorizationRequest.rows.forEach((row) => {
        if (row.toursMaster?.CoPersonId) {
          row.toursMaster.CoPersonId.forEach((id) => uniqueCoPersonIds.add(id));
        }
      });

      const coPersonUsers = await UserMaster.findAll({
        where: { userMasterID: Array.from(uniqueCoPersonIds) },
        attributes: ['userMasterID', 'displayName', 'userNumber'],
      });

      const maindata = TourAuthorizationRequest.rows.map((row) => {
        const tour = row.toursMaster;
        const coper = (tour?.CoPersonId || [])
          .map((id) => coPersonUsers.find((u) => u.userMasterID === +id))
          .filter(Boolean)
          .map((u) => `${u.displayName}(${u.userNumber})`)
          .join(',');

        return {
          Employee: tour?.assign?.displayName || '',
          Number: tour?.assign?.userNumber || '',
          Branch:
            tour?.assign?.employeeBranches?.[0]?.branchMaster?.branchName || '',
          Department:
            tour?.assign?.employeeDepartments?.[0]?.department
              ?.departmentName || '',
          Designation:
            tour?.assign?.employeeDesignations?.[0]?.designation
              ?.designationName || '',
          TourName: tour?.ToursName,
          TourFromDate:
            String(tour?.FromDate)?.split('-').reverse().join('-') || '',
          TourEndDate:
            String(tour?.ToDate)?.split('-').reverse().join('-') || '',
          TotalDays: tour?.TotalDays,
          Coperson: coper,
          status: tour?.authorizationStatus,
          authorizers: row.toursMaster.tourAuth,
          authorizerCritera:
            row?.toursMaster?.AuthorizationCriteriaMaster
              ?.AuthorizationCriteria,
        };
      });

      return await generateExcelWithAuthorizers(
        maindata,
        'Tour Authorization',
        'xlsx',
        res,
      );
    }

    return res.status(200).json({
      status: 200,
      data: TourAuthorizationRequest.rows,
      totalcount: TourAuthorizationRequest.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTourAuthorizationRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const authorizationRequest = await toursMaster.findOne({
      where: { ToursMasterID: id },
      include: [
        {
          model: UserMaster,
          as: 'assign',
          attributes: ['userMasterID', 'displayName', 'userNumber'],
          include: [
            {
              required: false,
              model: AuthorizationDetails,
              as: 'authorizationDetails',
              where: {
                status: 1,
                AuthorizationMasterID: authorizationMasterTypes.tour,
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
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
              include: [{ model: Division, attributes: ['divisionName'] }],
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
                { model: WorkingArea, attributes: ['workingAreaName'] },
              ],
            },
          ],
        },
        {
          model: UserMaster,
          as: 'authorizer',
          attributes: ['displayName'],
        },
        {
          model: AuthorizationCriteria,
          attributes: ['AuthorizationCriteria'],
        },
      ],
    });

    if (!authorizationRequest) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Tour Request'),
      });
    }

    const {
      authorizationStatus,
      UserMasterID: userMasterID,
      assign: userMaster,
    } = authorizationRequest;

    const { displayName, authorizationDetails } = userMaster;

    const authCriteriaID =
      authorizationDetails && authorizationDetails.length > 0
        ? authorizationDetails[0].AuthorizationCriteriaID
        : null;

    const authCriteria =
      authorizationRequest?.AuthorizationCriteriaMaster?.AuthorizationCriteria;

    const authUserStatuses = await tourAuthorization.findAll({
      where: { tourMasterID: id },
    });

    const userMasterIDs = authUserStatuses.map((item) => item.userMasterID);

    const users = await UserMaster.findAll({
      where: { userMasterID: userMasterIDs },
      attributes: ['userMasterID', 'displayName'],
    });

    const userMap = new Map(
      users.map((u) => [u.userMasterID.toString(), u.displayName]),
    );

    const authUserStatusData = authUserStatuses.map((s) => ({
      userMasterID: s.userMasterID,
      displayName: userMap.get(s.userMasterID.toString()) || null,
      authStatus: s.authStatus,
      remarks: s.remarks,
      updatedAt: s.updatedAt,
    }));

    const responseData = {
      authorizationStatus,
      userMasterID,
      displayName,
      AuthorizationCriteria: authCriteria ? authCriteria : '',

      authUserStatus:
        authUserStatusData && authUserStatusData.length > 0
          ? authUserStatusData
          : [],

      employeeCode: userMaster?.employeeJoiningDetails?.[0]?.employeeCode || '',
      branch: userMaster?.employeeBranches?.[0]?.branchMaster?.branchName || '',
      department:
        userMaster?.employeeDepartments?.[0]?.department?.departmentName || '',
      designation:
        userMaster?.employeeDesignations?.[0]?.designation?.designationName ||
        '',
      division:
        userMaster?.employeeDivisions?.[0]?.division?.divisionName || null,
      workingArea:
        userMaster?.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName ||
        null,
      createdAt: authorizationRequest.createdAt,
      userNumber: userMaster?.userNumber,
      authorizer: authorizationRequest?.authorizer?.displayName,
      authorizerRemark: authorizationRequest?.authorizerRemark,

      // tour-specific fields
      toursName: authorizationRequest.ToursName,
      fromDate: authorizationRequest.FromDate,
      toDate: authorizationRequest.ToDate,
      totalDays: authorizationRequest.TotalDays,
      coPersonId: authorizationRequest.CoPersonId,
      description: authorizationRequest.Description,
      rejectionremarks: authorizationRequest.rejectionremarks,
    };

    return res.status(200).json({ status: 200, data: responseData });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.tourAuthorizationacceptreject = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { tourAuthorizationID, rejectionRemarks, authStatus } = req.body;

    const tourAuthorizationIDList = Array.isArray(tourAuthorizationID)
      ? tourAuthorizationID
      : [tourAuthorizationID];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction,
    };

    const authRequests = await getAllTourAuth(tourAuthorizationIDList, options);

    const iosToken = [];
    const androidToken = [];

    if (authRequests.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: 'Tour Authorization request not found',
      });
    }

    if (authStatus == 0) {
      const allTourIds = authRequests.map((e) => e?.ToursMaster?.ToursMasterID);

      const allAuthorizer = await getAllTour(allTourIds, options);

      const allIdToDestroInbox = allAuthorizer.flatMap((e) =>
        e.tourAuth.map((a) => a.tourAuthorizationID),
      );

      await updateTourAuth(
        tourAuthorizationIDList,
        options,
        rejectionRemarks,
        authStatus,
      );
      await destroyAllInboxes(allIdToDestroInbox, options);
      await updateTour(
        allTourIds,
        options,
        AuthorizationStatusType.REJECTED,
        req.userDetails.userMasterId,
        false,
        rejectionRemarks,
      );

      await transaction.commit();

      const payload = {
        notification: { title: 'Tour', body: 'Your tour is rejected.' },
        data: { screen: 'tour' },
      };

      allAuthorizer.forEach((item) => {
        const user = item.assign;
        if (user?.firebaseToken) {
          if (user.deviceType === 'ios') iosToken.push(user.firebaseToken);
          else androidToken.push(user.firebaseToken);
        }
      });

      if (iosToken.length > 0) sendBulkNotification(iosToken, payload, 'ios');
      if (androidToken.length > 0)
        sendBulkNotification(androidToken, payload, 'android');

      return res.status(200).json({
        status: 200,
        message: 'Tour Authorization request rejected successfully',
      });
    } else {
      const anyOneData = [];
      const anyTwoData = [];
      const anyThreeData = [];
      const sequenceWise = [];
      let allIDsToDeleteInbox = [];
      let allIDsToUpdateTour = [];
      let bulkNotification = [];

      authRequests.forEach((data) => {
        const criteriaID =
          data?.ToursMaster?.assign?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID;
        const tourID = data?.ToursMaster?.ToursMasterID;

        if (criteriaID == authorizationCriteriaType.ANYONE) {
          anyOneData.push({
            tourAuthorizationID: data.tourAuthorizationID,
            ToursMasterID: tourID,
          });
        }
        if (criteriaID == authorizationCriteriaType.ANYTWO) {
          anyTwoData.push({
            tourAuthorizationID: data.tourAuthorizationID,
            ToursMasterID: tourID,
          });
        }
        if (criteriaID == authorizationCriteriaType.ANYTHREE) {
          anyThreeData.push({
            tourAuthorizationID: data.tourAuthorizationID,
            ToursMasterID: tourID,
          });
        }
        if (criteriaID == authorizationCriteriaType.SEQUENCENO) {
          sequenceWise.push({
            tourAuthorizationID: data.tourAuthorizationID,
            ToursMasterID: tourID,
            authorizerIDs:
              data.ToursMaster.assign.authorizationDetails[0]
                .AuthorizedByUserMasterId,
            userNameForNotification: data.ToursMaster.assign.displayName,
            assignedBy: data.ToursMaster.assign.userMasterID,
          });
        }
      });

      if (anyOneData.length > 0) {
        const getAllTourIds = anyOneData.map((e) => e.ToursMasterID);
        const getAllAuthorizers = await getAllTour(getAllTourIds, options);

        getAllAuthorizers.forEach((item) => {
          const user = item.assign;
          if (user?.firebaseToken) {
            if (user.deviceType === 'ios') iosToken.push(user.firebaseToken);
            else androidToken.push(user.firebaseToken);
          }
        });

        const getAllIdsToDestryInbox = getAllAuthorizers.flatMap((e) =>
          e.tourAuth.map((a) => a.tourAuthorizationID),
        );

        allIDsToDeleteInbox = [
          ...allIDsToDeleteInbox,
          ...getAllIdsToDestryInbox,
        ];
        allIDsToUpdateTour = [...allIDsToUpdateTour, ...getAllTourIds];
      }

      if (anyTwoData.length > 0) {
        const getAllTourId = anyTwoData.map((e) => e.ToursMasterID);
        const getAUthorizationReqId = anyTwoData.map(
          (e) => e.tourAuthorizationID,
        );

        const getAllTourData = await getAllTour(getAllTourId, options);

        const otherAuthorizers = [];
        const TourApprovedIds = [];

        getAllTourData.forEach((item) => {
          const authorizers = item.tourAuth;
          const approved = authorizers.filter((a) => a.authStatus == 1);

          if (approved.length == 1) {
            const allIds = authorizers.map((a) => a.tourAuthorizationID);

            const user = item.assign;
            if (user?.firebaseToken) {
              if (user.deviceType === 'ios') iosToken.push(user.firebaseToken);
              else androidToken.push(user.firebaseToken);
            }

            otherAuthorizers.push(...allIds);
            TourApprovedIds.push(item.ToursMasterID);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateTour = [...allIDsToUpdateTour, ...TourApprovedIds];
      }

      if (anyThreeData.length > 0) {
        const getAllTourId = anyThreeData.map((e) => e.ToursMasterID);
        const getAUthorizationReqId = anyThreeData.map(
          (e) => e.tourAuthorizationID,
        );

        const getAllTourData = await getAllTour(getAllTourId, options);

        const otherAuthorizers = [];
        const TourApprovedIds = [];

        getAllTourData.forEach((item) => {
          const authorizers = item.tourAuth;
          const approved = authorizers.filter((a) => a.authStatus == 1);

          if (approved.length == 2) {
            const allIds = authorizers.map((a) => a.tourAuthorizationID);

            const user = item.assign;
            if (user?.firebaseToken) {
              if (user.deviceType === 'ios') iosToken.push(user.firebaseToken);
              else androidToken.push(user.firebaseToken);
            }

            otherAuthorizers.push(...allIds);
            TourApprovedIds.push(item.ToursMasterID);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateTour = [...allIDsToUpdateTour, ...TourApprovedIds];
      }

      if (sequenceWise.length > 0) {
        const getAllTourId = sequenceWise.map((e) => e.ToursMasterID);
        const getAUthorizationReqId = sequenceWise.map(
          (e) => e.tourAuthorizationID,
        );

        const otherAuthorizers = [];
        const TourApprovedIds = [];
        const createTourAuth = [];
        const sendNotificationInbox = [];

        await updateTourAuth(
          tourAuthorizationIDList,
          options,
          rejectionRemarks,
          authStatus,
        );

        const getAllTourData = await getAllTour(getAllTourId, options);

        getAllTourData.forEach((item) => {
          const authorizers = item.tourAuth;
          const approved = authorizers.filter((a) => a.authStatus == 1);

          const seq = sequenceWise.find(
            (x) => x.ToursMasterID === item.ToursMasterID,
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
            const allIds = authorizers.map((a) => a.tourAuthorizationID);

            const user = item.assign;
            if (user?.firebaseToken) {
              if (user.deviceType === 'ios') iosToken.push(user.firebaseToken);
              else androidToken.push(user.firebaseToken);
            }

            otherAuthorizers.push(...allIds);
            TourApprovedIds.push(item.ToursMasterID);
            return;
          }

          const nextUser = remainingUsers[0];

          createTourAuth.push({
            tourMasterID: item.ToursMasterID,
            userMasterID: +nextUser,
            authStatus: 2,
            status: 1,
          });
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateTour = [...allIDsToUpdateTour, ...TourApprovedIds];

        const createNewTourAuth = await tourAuthorization.bulkCreate(
          createTourAuth,
          { ...options },
        );

        sequenceWise.forEach((item) => {
          const data = createNewTourAuth.find(
            (e) => e.tourMasterID == item.ToursMasterID,
          );

          if (data) {
            sendNotificationInbox.push({
              assignedTo: data.userMasterID,
              LoansID: item.ToursMasterID, // keep key name consistent with your generic UserInbox schema
              assignedBy: item.assignedBy,
              activityTable: tourAuthorization.getTableName(),
              activityTablePK: data.tourAuthorizationID,
              message: `${item.userNameForNotification} has requested Tour`,
            });
          }
        });

        if (sendNotificationInbox.length > 0) {
          bulkNotification = await UserInbox.bulkCreate(sendNotificationInbox, {
            ...options,
          });
        }
      }

      await updateTourAuth(
        tourAuthorizationIDList,
        options,
        rejectionRemarks,
        authStatus,
      );

      await destroyAllInboxes(allIDsToDeleteInbox, options);

      if (allIDsToUpdateTour.length > 0) {
        await updateTour(
          allIDsToUpdateTour,
          options,
          AuthorizationStatusType.APPROVED,
          req.userDetails.userMasterId,
          false,
          rejectionRemarks,
        );
      }

      await transaction.commit();

      const data = { screen: notificationScreentTypes.TOUR };

      bulkNotification.forEach(async (item) => {
        const notification = {
          title: notificationTitleTypes.TOUR,
          body: item.message,
        };
        sendNotification(item.assignedTo, notification, data);
      });
    }

    const payload = {
      notification: { title: 'Tour', body: 'Your tour is accepted.' },
      data: { screen: 'tour' },
    };

    if (iosToken.length > 0) sendBulkNotification(iosToken, payload, 'ios');
    if (androidToken.length > 0)
      sendBulkNotification(androidToken, payload, 'android');

    return res.status(200).json({
      status: 200,
      message: 'Tour Request Accepted Successfully',
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/* ------------------------------ Helpers ------------------------------ */

async function updateTourAuth(allIdToUpdate, options, remarks, authStatus) {
  await tourAuthorization.update(
    { remarks, authStatus },
    {
      where: { tourAuthorizationID: allIdToUpdate },
      ...options,
    },
  );
}

async function destroyAllInboxes(allIdToDestroInbox, options) {
  await UserInbox.destroy(
    {
      where: {
        activityTable: tourAuthorization.getTableName(),
        activityTablePK: allIdToDestroInbox,
      },
    },
    { ...options },
  );
}

async function updateTour(
  allTourIds,
  options,
  authorizationStatus,
  userMasterId,
  isAuthorizedBy = false,
  remark,
) {
  await toursMaster.update(
    {
      authorizationStatus,
      authorizedBy: userMasterId,
      authorizedAt: new Date(),
      isAuthorizedBy,
      authorizerRemark: remark,
      updateBy: userMasterId,
    },
    {
      where: { ToursMasterID: allTourIds },
      ...options,
    },
  );
}

async function getAllTour(allTourIds, options) {
  return toursMaster.findAll({
    where: {
      ToursMasterID: allTourIds,
      authorizationStatus: [
        AuthorizationStatusType.PENDING_ZERO,
        AuthorizationStatusType.PEDING_ONE,
        AuthorizationStatusType.PEDING_TWO,
      ],
    },
    include: [
      {
        model: tourAuthorization,
        as: 'tourAuth',
      },
      {
        model: UserMaster,
        as: 'assign',
        attributes: [
          'firebaseToken',
          'deviceType',
          'displayName',
          'userMasterID',
        ],
      },
    ],
    ...options,
  });
}

async function getAllTourAuth(tourAuthorizationIDList, options) {
  return tourAuthorization.findAll({
    where: {
      tourAuthorizationID: tourAuthorizationIDList,
      authStatus: 2,
    },
    attributes: [
      'tourAuthorizationID',
      'userMasterID',
      'authStatus',
      'tourMasterID',
    ],
    include: [
      {
        model: toursMaster,
        where: {
          authorizationStatus: [
            AuthorizationStatusType.PENDING_ZERO,
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        attributes: ['ToursMasterID', 'UserMasterID', 'authorizationStatus'],
        include: [
          {
            model: UserMaster,
            as: 'assign',
            attributes: ['displayName', 'userMasterID'],
            include: [
              {
                separate: true,
                model: AuthorizationDetails,
                as: 'authorizationDetails',
                attributes: [
                  'AuthorizationDetailsId',
                  'AuthorizationCriteriaID',
                  'AuthorizationMasterID',
                  'AuthorizedByUserMasterId',
                ],
                where: {
                  AuthorizationMasterID: authorizationMasterTypes.tour,
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
}
