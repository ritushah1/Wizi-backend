const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const Visit = require('../models/visit');
const VisitAuthorization = require('../models/visitAuthorization');
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

const {
  asiaKolkataDateTime,
  parseEmployeeInfoAlias,
} = require('../utils/commonUtilFunctions');
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
const {
  generateExcelWithAuthorizers,
  generateVisitAuthExcelWithAuthorizers,
} = require('../utils/exportData');

exports.viewVisitAuthorizationByUserId = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      startdate,
      enddate,
      user,
      status,
      companyMasterID,
      branchMasterID,
      exportData,
    } = req.body;

    const authUserMasterID = req.userDetails.userMasterId;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginateCondition =
      page && limit && !exportData ? { offset: (page - 1) * limit, limit } : {};

    const visitAuthorizationCondition = {
      userMasterID: authUserMasterID,
    };
    const visitCondition = { status: 1 };
    if (status !== null && status !== undefined) {
      visitAuthorizationCondition.authStatus = status;
      if (+status === 2) {
        visitCondition.authorizationStatus = {
          [Sequelize.Op.notIn]: [3, 4],
        };
      }
    }

    if (user && user.length > 0) {
      visitCondition.assignID = {
        [Sequelize.Op.in]: user,
      };
    }

    const userMasterCondition = { status: 1 };

    if (companyMasterID) {
      userMasterCondition.companyMasterId = companyMasterID;
    }

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
      visitCondition.visitDate = {
        [Sequelize.Op.between]: [startdate, enddate],
      };
    }

    const { rows: visitAuthorizationRequest, count } =
      await VisitAuthorization.findAndCountAll({
        distinct: true,
        where: visitAuthorizationCondition,
        ...paginateCondition,
        order: [['createdAt', 'DESC']],
        include: [
          {
            required: true,
            model: Visit,
            as: 'Visit',
            where: visitCondition,
            include: [
              {
                model: VisitAuthorization,
                as: 'visitAuth',
                attributes: [
                  'userMasterID',
                  'authStatus',
                  'visitAuthorizationID',
                ],
                include: [
                  {
                    model: UserMaster,
                    as: 'authPerson',
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
                    required: false,
                    model: EmployeeDesignation,
                    as: 'emp_desig',
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
                    as: 'emp_dept',
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
                    as: 'emp_branch',
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
                  {
                    required: false,
                    model: EmployeeJoiningDetails,
                    as: 'emp_join',
                    attributes: ['employeeCode'],
                  },
                  {
                    required: false,
                    model: EmployeeDivision,
                    as: 'emp_div',
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
                      { model: Division, attributes: ['divisionName'] },
                    ],
                  },
                  {
                    required: false,
                    model: EmployeeWorkingArea,
                    as: 'emp_area',
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
                as: 'createdByUserDetails',
                attributes: ['displayName'],
              },
              {
                model: UserMaster,
                as: 'updatedByUserDetails',
                attributes: ['displayName'],
              },
            ],
          },
        ],
      });

    if (exportData) {
      // Resolve coPersonID -> display names, same pattern as
      const uniqueCoPersonIds = new Set();
      visitAuthorizationRequest.forEach((row) => {
        if (row.Visit?.coPersonID) {
          row.Visit.coPersonID.forEach((id) => uniqueCoPersonIds.add(id));
        }
      });

      const coPersonUsers = await UserMaster.findAll({
        where: { userMasterID: Array.from(uniqueCoPersonIds) },
        attributes: ['userMasterID', 'displayName', 'userNumber'],
      });

      const maindata = visitAuthorizationRequest.map((row) => {
        const visit = row.Visit;
        const coper = (visit?.coPersonID || [])
          .map((id) => coPersonUsers.find((u) => u.userMasterID === +id))
          .filter(Boolean)
          .map((u) => `${u.displayName}(${u.userNumber})`)
          .join(', \n');

        return {
          employeeCode: parseEmployeeInfoAlias(visit?.assign)?.employeeCode,
          displayName: visit?.assign?.displayName,
          userNumber: visit?.assign?.userNumber,
          branch: parseEmployeeInfoAlias(visit?.assign)?.branch,
          department: parseEmployeeInfoAlias(visit?.assign)?.department,
          designation: parseEmployeeInfoAlias(visit?.assign)?.designation,
          division: parseEmployeeInfoAlias(visit?.assign)?.division,
          workingArea: parseEmployeeInfoAlias(visit?.assign)?.workingArea,
          Coperson: coper,
          authorizerCritera:
            visit?.AuthorizationCriteriaMaster?.AuthorizationCriteria,
          status: visit.authorizationStatus,
          authorizers: visit.visitAuth,
        };
      });

      return await generateVisitAuthExcelWithAuthorizers(
        maindata,
        'Visit Authorization',
        'xlsx',
        res,
      );
    }

    return res.status(200).json({
      status: 200,
      data: visitAuthorizationRequest,
      totalcount: count,
    });
  } catch (error) {
    next(error);
  }
};

exports.visitAuthorizationacceptreject = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { visitAuthorizationID, remarks, authStatus } = req.body;

    const visitAuthorizationIDList = Array.isArray(visitAuthorizationID)
      ? visitAuthorizationID
      : [visitAuthorizationID];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction,
    };

    const authRequests = await getAllVisitAuth(
      visitAuthorizationIDList,
      options,
    );

    const iosToken = [];
    const androidToken = [];

    if (authRequests.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: 'Visit Authorization request not found',
      });
    }

    if (authStatus == 0) {
      const allVisitIds = authRequests.map((e) => e?.Visit?.visitID);

      const allAuthorizer = await getAllVisit(allVisitIds, options);

      const allIdToDestroInbox = allAuthorizer.flatMap((e) =>
        e.visitAuth.map((a) => a.visitAuthorizationID),
      );

      await updateVisitAuth(
        visitAuthorizationIDList,
        options,
        remarks,
        authStatus,
      );
      await destroyAllInboxes(allIdToDestroInbox, options);
      await updateVisit(
        allVisitIds,
        options,
        AuthorizationStatusType.REJECTED,
        req.userDetails.userMasterId,
        false,
        remarks,
      );

      await transaction.commit();

      const payload = {
        notification: { title: 'Visit', body: 'Your visit is rejected.' },
        data: { screen: 'visit' },
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
        message: message.usermessage.rejectMessage('Visit'),
      });
    } else {
      const anyOneData = [];
      const anyTwoData = [];
      const anyThreeData = [];
      const sequenceWise = [];
      let allIDsToDeleteInbox = [];
      let allIDsToUpdateVisit = [];
      let bulkNotification = [];

      authRequests.forEach((data) => {
        const criteriaID =
          data?.Visit?.assign?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID;
        const visitID = data?.Visit?.visitID;

        if (criteriaID == authorizationCriteriaType.ANYONE) {
          anyOneData.push({
            visitAuthorizationID: data.visitAuthorizationID,
            visitID: visitID,
          });
        }
        if (criteriaID == authorizationCriteriaType.ANYTWO) {
          anyTwoData.push({
            visitAuthorizationID: data.visitAuthorizationID,
            visitID: visitID,
          });
        }
        if (criteriaID == authorizationCriteriaType.ANYTHREE) {
          anyThreeData.push({
            visitAuthorizationID: data.visitAuthorizationID,
            visitID: visitID,
          });
        }
        if (criteriaID == authorizationCriteriaType.SEQUENCENO) {
          sequenceWise.push({
            visitAuthorizationID: data.visitAuthorizationID,
            visitID: visitID,
            authorizerIDs:
              data.Visit.assign.authorizationDetails[0]
                .AuthorizedByUserMasterId,
            userNameForNotification: data.Visit.assign.displayName,
            assignedBy: data.Visit.assign.userMasterID,
          });
        }
      });

      if (anyOneData.length > 0) {
        const getAllVisitIds = anyOneData.map((e) => e.visitID);
        const getAllAuthorizers = await getAllVisit(getAllVisitIds, options);

        getAllAuthorizers.forEach((item) => {
          const user = item.assign;
          if (user?.firebaseToken) {
            if (user.deviceType === 'ios') iosToken.push(user.firebaseToken);
            else androidToken.push(user.firebaseToken);
          }
        });

        const getAllIdsToDestryInbox = getAllAuthorizers.flatMap((e) =>
          e.visitAuth.map((a) => a.visitAuthorizationID),
        );

        allIDsToDeleteInbox = [
          ...allIDsToDeleteInbox,
          ...getAllIdsToDestryInbox,
        ];
        allIDsToUpdateVisit = [...allIDsToUpdateVisit, ...getAllVisitIds];
      }

      if (anyTwoData.length > 0) {
        const getAllvisitID = anyTwoData.map((e) => e.visitID);
        const getAUthorizationReqId = anyTwoData.map(
          (e) => e.visitAuthorizationID,
        );

        const getAllVisitData = await getAllVisit(getAllvisitID, options);

        const otherAuthorizers = [];
        const visitApprovedIds = [];

        getAllVisitData.forEach((item) => {
          const authorizers = item.visitAuth;
          const approved = authorizers.filter((a) => a.authStatus == 1);

          if (approved.length == 1) {
            const allIds = authorizers.map((a) => a.visitAuthorizationID);

            const user = item.assign;
            if (user?.firebaseToken) {
              if (user.deviceType === 'ios') iosToken.push(user.firebaseToken);
              else androidToken.push(user.firebaseToken);
            }

            otherAuthorizers.push(...allIds);
            visitApprovedIds.push(item.visitID);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateVisit = [...allIDsToUpdateVisit, ...visitApprovedIds];
      }

      if (anyThreeData.length > 0) {
        const getAllvisitID = anyThreeData.map((e) => e.visitID);
        const getAUthorizationReqId = anyThreeData.map(
          (e) => e.visitAuthorizationID,
        );

        const getAllVisitData = await getAllVisit(getAllvisitID, options);

        const otherAuthorizers = [];
        const visitApprovedIds = [];

        getAllVisitData.forEach((item) => {
          const authorizers = item.visitAuth;
          const approved = authorizers.filter((a) => a.authStatus == 1);

          if (approved.length == 2) {
            const allIds = authorizers.map((a) => a.visitAuthorizationID);

            const user = item.assign;
            if (user?.firebaseToken) {
              if (user.deviceType === 'ios') iosToken.push(user.firebaseToken);
              else androidToken.push(user.firebaseToken);
            }

            otherAuthorizers.push(...allIds);
            visitApprovedIds.push(item.visitID);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateVisit = [...allIDsToUpdateVisit, ...visitApprovedIds];
      }

      if (sequenceWise.length > 0) {
        const getAllvisitID = sequenceWise.map((e) => e.visitID);
        const getAUthorizationReqId = sequenceWise.map(
          (e) => e.visitAuthorizationID,
        );

        const otherAuthorizers = [];
        const visitApprovedIds = [];
        const createVisitAuth = [];
        const sendNotificationInbox = [];

        await updateVisitAuth(
          visitAuthorizationIDList,
          options,
          remarks,
          authStatus,
        );

        const getAllVisitData = await getAllVisit(getAllvisitID, options);

        getAllVisitData.forEach((item) => {
          const authorizers = item.visitAuth;
          const approved = authorizers.filter((a) => a.authStatus == 1);

          const seq = sequenceWise.find((x) => x.visitID === item.visitID);
          if (!seq) return;

          const sequenceUserIDs = seq.authorizerIDs.map((id) => id.toString());
          const approvedUserIDs = approved.map((a) =>
            a.userMasterID.toString(),
          );

          const remainingUsers = sequenceUserIDs.filter(
            (id) => !approvedUserIDs.includes(id),
          );

          if (remainingUsers.length === 0) {
            const allIds = authorizers.map((a) => a.visitAuthorizationID);

            const user = item.assign;
            if (user?.firebaseToken) {
              if (user.deviceType === 'ios') iosToken.push(user.firebaseToken);
              else androidToken.push(user.firebaseToken);
            }

            otherAuthorizers.push(...allIds);
            visitApprovedIds.push(item.visitID);
            return;
          }

          const nextUser = remainingUsers[0];

          createVisitAuth.push({
            visitID: item.visitID,
            userMasterID: +nextUser,
            authStatus: 2,
            status: 1,
          });
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateVisit = [...allIDsToUpdateVisit, ...visitApprovedIds];

        const createNewVisitAuth = await VisitAuthorization.bulkCreate(
          createVisitAuth,
          { ...options },
        );

        sequenceWise.forEach((item) => {
          const data = createNewVisitAuth.find(
            (e) => e.visitID == item.visitID,
          );

          if (data) {
            sendNotificationInbox.push({
              assignedTo: data.userMasterID,
              assignedBy: item.assignedBy,
              activityTable: VisitAuthorization.getTableName(),
              activityTablePK: data.visitAuthorizationID,
              message: `${item.userNameForNotification} has requested Visit`,
            });
          }
        });

        if (sendNotificationInbox.length > 0) {
          bulkNotification = await UserInbox.bulkCreate(sendNotificationInbox, {
            ...options,
          });
        }
      }

      await updateVisitAuth(
        visitAuthorizationIDList,
        options,
        remarks,
        authStatus,
      );

      await destroyAllInboxes(allIDsToDeleteInbox, options);

      if (allIDsToUpdateVisit.length > 0) {
        await updateVisit(
          allIDsToUpdateVisit,
          options,
          AuthorizationStatusType.APPROVED,
          req.userDetails.userMasterId,
          false,
          remarks,
        );
      }

      await transaction.commit();

      const data = { screen: notificationScreentTypes.VISIT };

      bulkNotification.forEach(async (item) => {
        const notification = {
          title: notificationTitleTypes.VISIT,
          body: item.message,
        };
        sendNotification(item.assignedTo, notification, data);
      });
    }

    const payload = {
      notification: { title: 'Visit', body: 'Your Visit is accepted.' },
      data: { screen: 'visit' },
    };

    if (iosToken.length > 0) sendBulkNotification(iosToken, payload, 'ios');
    if (androidToken.length > 0)
      sendBulkNotification(androidToken, payload, 'android');

    return res.status(200).json({
      status: 200,
      message: 'Visit Request Accepted Successfully',
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/* ------------------------------ Helpers ------------------------------ */

async function updateVisitAuth(allIdToUpdate, options, remarks, authStatus) {
  await VisitAuthorization.update(
    { remarks, authStatus },
    {
      where: { visitAuthorizationID: allIdToUpdate },
      ...options,
    },
  );
}

async function destroyAllInboxes(allIdToDestroInbox, options) {
  await UserInbox.destroy(
    {
      where: {
        activityTable: VisitAuthorization.getTableName(),
        activityTablePK: allIdToDestroInbox,
      },
    },
    { ...options },
  );
}

async function updateVisit(
  allVisitIds,
  options,
  authorizationStatus,
  userMasterId,
  isAuthorizedBy = false,
  remark,
) {
  await Visit.update(
    {
      authorizationStatus,
      authorizedBy: userMasterId,
      authorizedAt: new Date(),
      isAuthorizedBy,
      authorizerRemark: remark,
      updateBy: userMasterId,
    },
    {
      where: { visitID: allVisitIds },
      ...options,
    },
  );
}

async function getAllVisit(allVisitIds, options) {
  return Visit.findAll({
    where: {
      visitID: allVisitIds,
      authorizationStatus: [
        AuthorizationStatusType.PENDING_ZERO,
        AuthorizationStatusType.PEDING_ONE,
        AuthorizationStatusType.PEDING_TWO,
      ],
    },
    include: [
      {
        model: VisitAuthorization,
        as: 'visitAuth',
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

async function getAllVisitAuth(visitAuthorizationIDList, options) {
  return VisitAuthorization.findAll({
    where: {
      visitAuthorizationID: visitAuthorizationIDList,
      authStatus: 2,
    },
    attributes: [
      'visitAuthorizationID',
      'userMasterID',
      'authStatus',
      'visitID',
    ],
    include: [
      {
        model: Visit,
        as: 'Visit',
        where: {
          authorizationStatus: [
            AuthorizationStatusType.PENDING_ZERO,
            AuthorizationStatusType.PEDING_ONE,
            AuthorizationStatusType.PEDING_TWO,
          ],
        },
        attributes: ['visitID', 'assignID', 'authorizationStatus'],
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
                  AuthorizationMasterID: authorizationMasterTypes.visit,
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
