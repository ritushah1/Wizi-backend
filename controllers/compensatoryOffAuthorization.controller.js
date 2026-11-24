const { Op } = require('sequelize');
const UserMaster = require('../models/userMaster');
const AuthorizationMaster = require('../models/authorizationMaster');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');
const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const ExcelJS = require('exceljs');
const EmployeeBranch = require('../models/employeeBranch');
const {
  accessibleUsers,
  sendNotification,
  asiaKolkataDateTime,
} = require('../utils/commonUtilFunctions');
``;
const UserInbox = require('../models/UserInbox');
const CompensatoryOffAuthorization = require('../models/compensatoryOffAuthorization');
const coffMaster = require('../models/coffMaster');
const HrLeaveBalance = require('../models/hrLeaveBalance');
const moment = require('moment');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const attendanceTransaction = require('../models/attendanceTransaction');
const message = require('../response_message/message');
const {
  authorizationMasterTypes,
  AuthorizationStatusType,
  authorizationCriteriaType,
} = require('../utils/dbUtils');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const { generateExcel } = require('../utils/exportData');
const companyMaster = require('../models/companyMaster');

exports.compensatoryOffAuthorizationacceptreject = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { CompensatoryOffAuthorizationID, remarks, authstatus } = req.body;

    const compOffAuthorizationIDList = Array.isArray(
      CompensatoryOffAuthorizationID,
    )
      ? CompensatoryOffAuthorizationID
      : [CompensatoryOffAuthorizationID];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    };

    const authRequests = await CompensatoryOffAuthorization.findAll({
      where: {
        CompensatoryOffAuthorizationID: compOffAuthorizationIDList,
        authstatus: 2,
      },
      attributes: [
        'CompensatoryOffAuthorizationID',
        'userMasterID',
        'authstatus',
        'coffMasterID',
      ],
      include: [
        {
          model: coffMaster,
          where: {
            authorizationStatus: [
              AuthorizationStatusType.PENDING_ZERO,
              AuthorizationStatusType.PEDING_ONE,
              AuthorizationStatusType.PEDING_TWO,
            ],
          },
          attributes: [
            'coffMasterID',
            'userMasterID',
            'YearMM',
            'authorizationStatus',
            'LeaveTranId',
            'LeaveBalTranId',
            'LeaveAddNew',
            'expiryDate',
            'LeaveCreatedDate',
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
                      authorizationMasterTypes.compensatoryOff,
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
        message: 'Compensatory Off Authorization request not found',
      });
    }

    if (authstatus == 0) {
      const allCompOffIds = authRequests.map((e) => {
        return e?.coffMaster?.coffMasterID;
      });

      const allAuthorizer = await getAllCompOff(allCompOffIds, options);

      const allIdToDestroInbox = allAuthorizer.flatMap((e) =>
        e.compensatoryOffAuthorizations.map(
          (id) => id.CompensatoryOffAuthorizationID,
        ),
      );

      await updateCompOffAuth(
        compOffAuthorizationIDList,
        options,
        remarks,
        authstatus,
      );
      await destroyAllInboxes(allIdToDestroInbox, options);
      await updateCompOff(
        allCompOffIds,
        options,
        AuthorizationStatusType.REJECTED,
        req.userDetails.userMasterId,
        false,
        remarks,
      );

      await transaction.commit();
      return res.status(200).json({
        status: 200,
        message: 'Compensatory Off Authorization request rejected successfully',
      });
    } else {
      const anyOneData = [];
      const anyTwoData = [];
      const anyThreeData = [];
      const sequenceWise = [];
      let allIDsToDeleteInbox = [];
      let allIDsToUpdateCompOff = [];
      let allIDsToUpdateCompOffAuth = [];
      let bulkNotification = [];
      const allCoffIdsForHrLeaveBalance = [];
      const allHrLeaveBalance = [];
      authRequests.map((data) => {
        if (
          data?.coffMaster?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYONE
        ) {
          anyOneData.push({
            CompensatoryOffAuthorizationID: data.CompensatoryOffAuthorizationID,
            coffMasterID: data?.coffMaster.coffMasterID,
            LeaveTranId: data?.coffMaster?.LeaveTranId,
            userMasterID: data?.coffMaster?.userMasterID,
            YearMM: data?.coffMaster?.YearMM,
            LeaveAddNew: data?.coffMaster?.LeaveAddNew,
            createBy: req.userDetails.userMasterId,
            expiryDate: data?.coffMaster?.expiryDate || null,
            availBal: data?.coffMaster?.LeaveAddNew,
          });
        }
        if (
          data?.coffMaster?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTWO
        ) {
          anyTwoData.push({
            CompensatoryOffAuthorizationID: data.CompensatoryOffAuthorizationID,
            coffMasterID: data.coffMasterID,
          });
        }
        if (
          data?.coffMaster?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTHREE
        ) {
          anyThreeData.push({
            CompensatoryOffAuthorizationID: data.CompensatoryOffAuthorizationID,
            coffMasterID: data.coffMasterID,
          });
        }
        if (
          data?.coffMaster?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO
        ) {
          sequenceWise.push({
            CompensatoryOffAuthorizationID: data.CompensatoryOffAuthorizationID,
            coffMasterID: data.coffMasterID,
            authorizerIDs:
              data.coffMaster.userMaster.authorizationDetails[0]
                .AuthorizedByUserMasterId,
            userNameForNotification: data.coffMaster.userMaster.displayName,
            assignedBy: data.coffMaster.userMaster.userMasterID,
            date: data.coffMaster.date,
          });
        }
      });

      if (anyOneData.length > 0) {
        const getAllCompOffIds = anyOneData.map((e) => {
          return e.coffMasterID;
        });

        const getAllAuthorizers = await getAllCompOff(
          getAllCompOffIds,
          options,
        );

        const getAllIdsToDestryInbox = getAllAuthorizers.flatMap((e) =>
          e.compensatoryOffAuthorizations.map(
            (id) => id.CompensatoryOffAuthorizationID,
          ),
        );
        // const getIdtoUpdateCompOffAuth = getAllIdsToDestryInbox.filter((item) =>
        //   compOffAuthorizationIDList.includes(item)
        // );

        // allIDsToUpdateCompOffAuth = [
        //   ...allIDsToUpdateCompOffAuth,
        //   ...getIdtoUpdateCompOffAuth,
        // ];
        allIDsToDeleteInbox = [
          ...allIDsToDeleteInbox,
          ...getAllIdsToDestryInbox,
        ];
        allIDsToUpdateCompOff = [...allIDsToUpdateCompOff, ...getAllCompOffIds];
        for (const data of anyOneData) {
          allCoffIdsForHrLeaveBalance.push(data.coffMasterID);
          allHrLeaveBalance.push({
            LeaveTranId: data?.LeaveTranId,
            userMasterID: data?.userMasterID,
            YearMM: data?.YearMM,
            LeaveAddNew: data?.LeaveAddNew,
            createBy: req.userDetails.userMasterId,
            expiryDate: data?.expiryDate || null,
            availBal: data?.LeaveAddNew,
          });
        }
      }
      if (anyTwoData.length > 0) {
        const getAllCompOffId = anyTwoData.map((e) => e.coffMasterID);
        const getAUthorizationReqId = anyTwoData.map(
          (e) => e.CompensatoryOffAuthorizationID,
        );

        const getAllCompOffData = await getAllCompOff(getAllCompOffId, options);

        const otherAuthorizers = [];
        const CompOffApprovedIds = [];

        getAllCompOffData.forEach((item) => {
          const authorizers = item.compensatoryOffAuthorizations;

          const approved = authorizers.filter((a) => a.authstatus == 1);

          if (approved.length == 1) {
            const allIds = authorizers.map(
              (a) => a.CompensatoryOffAuthorizationID,
            );

            otherAuthorizers.push(...allIds);
            CompOffApprovedIds.push(item.coffMasterID);

            allCoffIdsForHrLeaveBalance.push(item.coffMasterID);
            allHrLeaveBalance.push({
              LeaveTranId: item?.LeaveTranId,
              userMasterID: item?.userMasterID,
              YearMM: item?.YearMM,
              LeaveAddNew: item?.LeaveAddNew,
              createBy: req.userDetails.userMasterId,
              expiryDate: item?.expiryDate || null,
              availBal: item?.LeaveAddNew,
            });
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];
        // const getIdtoUpdateCompOffAuth = getAUthorizationReqId.filter((item) =>
        //   compOffAuthorizationIDList.includes(item)
        // );

        // allIDsToUpdateCompOffAuth = [
        //   ...allIDsToUpdateCompOffAuth,
        //   ...getIdtoUpdateCompOffAuth,
        // ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateCompOff = [
          ...allIDsToUpdateCompOff,
          ...CompOffApprovedIds,
        ];
      }
      if (anyThreeData.length > 0) {
        const getAllCompOffId = anyThreeData.map((e) => e.coffMasterID);
        const getAUthorizationReqId = anyThreeData.map(
          (e) => e.CompensatoryOffAuthorizationID,
        );

        const getAllCompOffData = await getAllCompOff(getAllCompOffId, options);

        const otherAuthorizers = [];
        const CompOffApprovedIds = [];

        getAllCompOffData.forEach((item) => {
          const authorizers = item.compensatoryOffAuthorizations;

          const approved = authorizers.filter((a) => a.authstatus == 1);

          if (approved.length == 2) {
            const allIds = authorizers.map(
              (a) => a.CompensatoryOffAuthorizationID,
            );

            otherAuthorizers.push(...allIds);
            CompOffApprovedIds.push(item.coffMasterID);

            allCoffIdsForHrLeaveBalance.push(item.coffMasterID);
            allHrLeaveBalance.push({
              LeaveTranId: item?.LeaveTranId,
              userMasterID: item?.userMasterID,
              YearMM: item?.YearMM,
              LeaveAddNew: item?.LeaveAddNew,
              createBy: req.userDetails.userMasterId,
              expiryDate: item?.expiryDate || null,
              availBal: item?.LeaveAddNew,
            });
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];
        // const getIdtoUpdateCompOffAuth = getAUthorizationReqId.filter((item) =>
        //   compOffAuthorizationIDList.includes(item)
        // );

        // allIDsToUpdateCompOffAuth = [
        //   ...allIDsToUpdateCompOffAuth,
        //   ...getIdtoUpdateCompOffAuth,
        // ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateCompOff = [
          ...allIDsToUpdateCompOff,
          ...CompOffApprovedIds,
        ];
      }
      if (sequenceWise.length > 0) {
        const getAllCompOffId = sequenceWise.map((e) => e.coffMasterID);
        const getAUthorizationReqId = sequenceWise.map(
          (e) => e.CompensatoryOffAuthorizationID,
        );

        const otherAuthorizers = [];
        const CompOffApprovedIds = [];
        const createCompOffsAuth = [];
        const sendNotificationInbox = [];

        // const getIdtoUpdateCompOffAuth = getAUthorizationReqId.filter((item) =>
        //   compOffAuthorizationIDList.includes(item)
        // );
        await updateCompOffAuth(
          compOffAuthorizationIDList,
          options,
          remarks,
          authstatus,
        );
        const getAllCompOffData = await getAllCompOff(getAllCompOffId, options);

        getAllCompOffData.forEach((item) => {
          const authorizers = item.compensatoryOffAuthorizations;

          const approved = authorizers.filter((a) => a.authstatus == 1);

          const seq = sequenceWise.find(
            (x) => x.coffMasterID === item.coffMasterID,
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
            const allIds = authorizers.map((a) => a.CompOffsAuthorizationID);

            otherAuthorizers.push(...allIds);
            CompOffApprovedIds.push(item.coffMasterID);

            allCoffIdsForHrLeaveBalance.push(item.coffMasterID);
            allHrLeaveBalance.push({
              LeaveTranId: item?.LeaveTranId,
              userMasterID: item?.userMasterID,
              YearMM: item?.YearMM,
              LeaveAddNew: item?.LeaveAddNew,
              createBy: req.userDetails.userMasterId,
              expiryDate: item?.expiryDate || null,
              availBal: item?.LeaveAddNew,
            });

            return;
          }

          const nextUser = remainingUsers[0]; // FIRST PENDING USER

          createCompOffsAuth.push({
            coffMasterID: item.coffMasterID,
            userMasterID: +nextUser,
            authstatus: 2,
            TableName: 'coffMaster',
            status: 1,
          });
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateCompOff = [
          ...allIDsToUpdateCompOff,
          ...CompOffApprovedIds,
        ];

        const createNewCompOffsAuth =
          await CompensatoryOffAuthorization.bulkCreate(createCompOffsAuth, {
            ...options,
          });

        sequenceWise.map((item) => {
          const data = createNewCompOffsAuth.find(
            (e) => e.coffMasterID == item.coffMasterID,
          );

          if (data) {
            sendNotificationInbox.push({
              assignedTo: data.userMasterID,
              CompOffsID: item.coffMasterID,
              assignedBy: item.assignedBy,
              activityTable: CompensatoryOffAuthorization.getTableName(),
              activityTablePK: data.CompensatoryOffAuthorizationID,
              message: `${item.userNameForNotification} has requested Compensatory Off for ${moment(
                item.LeaveCreatedDate,
              ).format('DD/MM/YYYY')}`,
            });
          }
        });

        if (sendNotificationInbox.length > 0) {
          bulkNotification = await UserInbox.bulkCreate(sendNotificationInbox, {
            ...options,
          });
        }
      }

      await updateCompOffAuth(
        compOffAuthorizationIDList,
        options,
        remarks,
        authstatus,
      );

      await destroyAllInboxes(allIDsToDeleteInbox, options);
      if (allIDsToUpdateCompOff.length > 0) {
        const addLeaveBalance = await HrLeaveBalance.bulkCreate(
          allHrLeaveBalance,
          {
            options,
            returning: true,
          },
        );

        await Promise.all(
          addLeaveBalance.map((data, i) =>
            coffMaster.update(
              {
                authorizationStatus: 3,
                authorizedBy: req.userDetails.userMasterId,
                authorizedAt: new Date(),
                isAuthorizedBy: false,
                LeaveBalTranId: data.LeaveBalTranId,
                authorizerRemark: remarks,
              },
              {
                where: { coffMasterID: allCoffIdsForHrLeaveBalance[i] },
                options,
              },
            ),
          ),
        );
      }
      await transaction.commit();
      const data = {
        screen: 'coffauth',
      };

      bulkNotification.forEach(async (item) => {
        const notification = {
          title: 'Compensatory Off',
          body: item.message,
        };
        sendNotification(item.assignedTo, notification, data);
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'Compensatory Off Authorization Request Accepted Successfully',
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.viewcompensatoryOffAuthorizationByUserId = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      startdate,
      enddate,
      user,
      status,
      companyMasterID,
      exportData,
    } = req.body;
    const authUserMasterID = req.userDetails.userMasterId;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginateCondition =
      page && limit ? { offset: (page - 1) * limit, limit } : {};

    const condition = {
      status: 1,
      userMasterID: authUserMasterID,
      '$coffMaster.status$': 1,
    };

    if (status !== null && status !== undefined) {
      condition.authstatus = status;
      if (+status === 2) {
        condition['$coffMaster.authorizationStatus$'] = {
          [Sequelize.Op.notIn]: [3, 4],
        };
      }
    }

    if (user && user.length > 0) {
      condition['$coffMaster.userMasterID$'] = {
        [Sequelize.Op.in]: user,
      };
    }

    if (startdate && enddate) {
      condition['$coffMaster.LeaveCreatedDate$'] = {
        [Sequelize.Op.between]: [startdate, enddate],
      };
    }
    const userCondition = { status: 1 };
    if (companyMasterID) {
      userCondition.companyMasterId = companyMasterID;
    }

    const CompensatoryOffAuthorizationRequest =
      await CompensatoryOffAuthorization.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginateCondition,
        order: [['createdAt', 'DESC']],
        include: [
          {
            required: true,
            model: coffMaster,
            include: [
              {
                separate: true,
                model: CompensatoryOffAuthorization,
                include: [
                  {
                    model: UserMaster,
                    as: 'authorizedPerson',
                    attributes: ['displayName'],
                  },
                ],
              },
              {
                model: UserMaster,
                where: userCondition,
                attributes: [
                  'userMasterID',
                  'displayName',
                  'userNumber',
                  'photo',
                ],
                include: [
                  {
                    model: companyMaster,
                    attributes: ['companyName'],
                  },
                  {
                    separate: true,
                    required: false,
                    model: AuthorizationDetails,
                    as: 'authorizationDetails',
                    where: {
                      status: 1,
                      AuthorizationMasterID:
                        authorizationMasterTypes.compensatoryOff,
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
                    required: false,
                    separate: true,

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
                as: 'createdByUser',
                attributes: ['displayName'],
              },
            ],
          },
        ],
      });

    if (exportData) {
      // ── Fetch attendance separately — only needed for export ──────────────
      const attendanceConditions = CompensatoryOffAuthorizationRequest.rows
        .map((e) => ({
          userMasterID: e.coffMaster?.userMasterID,
          AttendanceDate: e.coffMaster?.LeaveCreatedDate,
        }))
        .filter((x) => x.userMasterID && x.AttendanceDate);

      const attendanceRecords =
        attendanceConditions.length > 0
          ? await attendanceTransaction.findAll({
              where: { [Sequelize.Op.or]: attendanceConditions },
              attributes: [
                'userMasterID',
                'AttendanceDate',
                'InDatetime',
                'OutDateTime',
              ],
            })
          : [];

      const attendanceMap = {};
      attendanceRecords.forEach((at) => {
        const key = `${at.userMasterID}_${at.AttendanceDate?.toString().split('T')[0]}`;
        attendanceMap[key] = at;
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('CompensatoryOffAuthorizations');

      const columns = [
        { header: 'Company Name', key: 'companyName', width: 22 }, // 1
        { header: 'Employee Code', key: 'employeeCode', width: 18 }, //2
        { header: 'Name', key: 'name', width: 25 }, //3
        { header: 'Mobile No', key: 'mobileNo', width: 15 }, // 4
        { header: 'Branch', key: 'branchName', width: 20 }, // 5
        { header: 'Department', key: 'departmentName', width: 22 }, // 6
        { header: 'Designation', key: 'designationName', width: 22 }, // 7
        { header: 'Working Area', key: 'workingAreaName', width: 20 }, // 8
        { header: 'Division', key: 'divisionName', width: 20 }, // 9
        { header: 'Compensatory Off Date', key: 'coffDate', width: 18 }, // 10
        {
          header: 'Compensatory Off Expiry Date',
          key: 'expiryDate',
          width: 20,
        }, // 11
        { header: 'Days', key: 'days', width: 10 }, // 12
        { header: 'In Time', key: 'inTime', width: 18 }, // 13
        { header: 'Out Time', key: 'outTime', width: 18 }, // 14
        { header: 'Authorization Criteria', key: 'authCriteria', width: 20 }, // 15
        { header: 'Authorizers', key: 'authorizer', width: 25 }, // 16
        { header: 'Authorizer Status', key: 'authorizerStatus', width: 18 }, // 17
        { header: 'Authorizer Remark', key: 'authRemarks', width: 20 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Remarks', key: 'remark', width: 20 }, // 18
        { header: 'Created By', key: 'createdBy', width: 22 }, // 19
        { header: 'Created Date', key: 'createdDate', width: 15 }, // 20
      ];

      worksheet.columns = columns;

      // ── Style header row ───────────────────────────────────────────────────
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      headerRow.height = 30;

      // ── Data rows ──────────────────────────────────────────────────────────
      let currentRowIndex = 2;

      for (const record of CompensatoryOffAuthorizationRequest.rows) {
        const coffMaster = record.coffMaster || {};
        const user = coffMaster.userMaster || {};
        const authoriser = coffMaster.compensatoryOffAuthorizations || [];

        const empCode =
          (user.employeeJoiningDetails || [])[0]?.employeeCode || '';
        const branchName =
          (user.employeeBranches || [])[0]?.branchMaster?.branchName || '';
        const departmentName =
          (user.employeeDepartments || [])[0]?.department?.departmentName || '';
        const designationName =
          (user.employeeDesignations || [])[0]?.designation?.designationName ||
          '';
        const workingAreaName =
          (user.employeeWorkingAreas || [])[0]?.workingArea?.workingAreaName ||
          '';
        const divisionName =
          (user.employeeDivisions || [])[0]?.division?.divisionName || '';

        const leaveDate = coffMaster.LeaveCreatedDate?.toString().split('T')[0];
        const attendance =
          attendanceMap[`${coffMaster.userMasterID}_${leaveDate}`];

        const rowCount = Math.max(authoriser.length, 1);

        const commonFields = {
          authCriteria:
            user.authorizationDetails[0]?.AuthorizationCriteriaMaster
              ?.AuthorizationCriteria,
          companyName: user.companyMaster.companyName,
          employeeCode: empCode,
          name: user.displayName || '',
          mobileNo: user.userNumber || '',
          branchName,
          departmentName,
          designationName,
          workingAreaName,
          divisionName,
          coffDate: coffMaster.LeaveCreatedDate
            ? moment(coffMaster.LeaveCreatedDate).format('DD-MM-YYYY')
            : '',
          expiryDate: coffMaster.expiryDate
            ? moment(coffMaster.expiryDate).format('DD-MM-YYYY')
            : '',
          days: coffMaster.LeaveAddNew || '',
          inTime: attendance?.InDatetime
            ? moment(attendance.InDatetime).format('DD-MM-YYYY HH:mm')
            : '',
          outTime: attendance?.OutDateTime
            ? moment(attendance.OutDateTime).format('DD-MM-YYYY HH:mm')
            : '',
          createdBy: coffMaster.createdByUser?.displayName || '',
          createdDate: record.createdAt
            ? moment(record.createdAt).format('DD-MM-YYYY')
            : '',
          remark: record.compensatoryOffAuthorizations?.remarks,
          status: [0, 1, 2].includes(record.coffMaster.authorizationStatus)
            ? 'Pending'
            : record.coffMaster.authorizationStatus === 3
              ? 'Approved'
              : 'Rejected',
        };

        // ── Write one row per authorizer ────────────────────────────────────
        if (authoriser.length === 0) {
          const excelRow = worksheet.addRow({
            ...commonFields,
            authorizer: '',
            authorizerStatus: '',
            authRemarks: '',
          });

          excelRow.height = 20;

          excelRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };

            cell.alignment = {
              vertical: 'middle',
              wrapText: true,
            };
          });
        } else {
          for (const auth of authoriser) {
            const excelRow = worksheet.addRow({
              ...commonFields,

              authorizer: auth.authorizedPerson?.displayName || '',

              authorizerStatus:
                auth.authstatus == 0
                  ? 'Rejected'
                  : auth.authstatus == 1
                    ? 'Approved'
                    : auth.authstatus == 2
                      ? 'Pending'
                      : '',
              authRemarks: auth.remarks,
            });

            excelRow.height = 20;

            excelRow.eachCell({ includeEmpty: true }, (cell) => {
              cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
              };

              cell.alignment = {
                vertical: 'middle',
                wrapText: true,
              };
            });
          }
        }

        // ── Merge common columns across authorizer rows ───────────────────────
        if (rowCount > 1) {
          const mergeStart = currentRowIndex;
          const mergeEnd = currentRowIndex + rowCount - 1;

          // All columns except 14 (authorizer) and 15 (authorizerStatus)
          const columnsToMerge = [
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 19, 20, 21, 22,
          ];

          for (const colNum of columnsToMerge) {
            worksheet.mergeCells(mergeStart, colNum, mergeEnd, colNum);
            const mergedCell = worksheet.getCell(mergeStart, colNum);
            mergedCell.alignment = {
              vertical: 'middle',
              horizontal: 'left',
              wrapText: true,
            };
          }
        }

        currentRowIndex += rowCount;
      }

      // ── Stream response ──────────────────────────────────────────────────────
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="CompensatoryOffAuthorizations.xlsx"',
      );

      await workbook.xlsx.write(res);
      return res.end();
    }

    return res.status(200).json({
      status: 200,
      data: CompensatoryOffAuthorizationRequest.rows,
      totalcount: CompensatoryOffAuthorizationRequest.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.getcompensatoryOffAuthorizationRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const authorizationRequest = await coffMaster.findOne({
      where: { coffMasterID: id },
      include: [
        {
          model: UserMaster,
          // as: 'authorizedPerson',
          attributes: ['userMasterID', 'displayName', 'userNumber'],
          include: [
            {
              required: false,
              model: AuthorizationDetails,
              as: 'authorizationDetails',
              where: {
                status: 1,
                AuthorizationMasterID: authorizationMasterTypes.compensatoryOff,
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
              model: attendanceTransaction,
              where: Sequelize.where(
                Sequelize.col(
                  'userMaster->attendanceTransactions.AttendanceDate',
                ),
                '=',
                Sequelize.col('coffMaster.LeaveCreatedDate'),
              ),
              attributes: ['InDatetime', 'OutDateTime'],
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
              required: false,
              separate: true,

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
          as: 'createdByUser',
          attributes: ['displayName'],
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
        message: message.usermessage.notFoundMessage('Coff Auth Request'),
      });
    }

    const {
      authorizationStatus,
      userMasterID,
      userMaster,
      LeaveAddNew,
      createdByUser,
    } = authorizationRequest;

    const { displayName, authorizationDetails } = userMaster;

    const authCriteriaID =
      authorizationDetails && authorizationDetails.length > 0
        ? authorizationDetails[0].AuthorizationCriteriaID
        : null;

    const authCriteria = await AuthorizationCriteria.findOne({
      where: { AuthorizationCriteriaID: authCriteriaID },
      attributes: ['AuthorizationCriteria'],
    });

    const authUserStatuses = await CompensatoryOffAuthorization.findAll({
      where: { coffMasterID: id },
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

    const dateStr = authorizationRequest.LeaveCreatedDate;
    const [year, month, day] = dateStr.split('-');
    const formattedDate = `${day}-${month}-${year}`;

    const responseData = {
      LeaveCreatedDate: formattedDate,
      expiryDate: authorizationRequest.expiryDate
        ? String(authorizationRequest.expiryDate).split('-').reverse().join('-')
        : null,
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
      LeaveAddNew,
      createdByUser: createdByUser ? createdByUser.displayName : '',
      InDateTime:
        authorizationRequest.userMaster.attendanceTransactions &&
        authorizationRequest.userMaster.attendanceTransactions.length > 0
          ? authorizationRequest.userMaster.attendanceTransactions[0].InDatetime
          : null,
      OutDateTime:
        authorizationRequest.userMaster.attendanceTransactions &&
        authorizationRequest.userMaster.attendanceTransactions.length > 0
          ? authorizationRequest.userMaster.attendanceTransactions[0]
              .OutDateTime
          : null,
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
      isAutoApproved: authorizationRequest.isAutoApproved,
    };

    return res.status(200).json({ status: 200, data: responseData });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.addCoffAuth = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;

    const leaveAuthDetails = await AuthorizationDetails.findAll({
      where: {
        status: 1,
        AuthorizationMasterID: authorizationMasterTypes.leave,
        companyMasterID,
      },
      include: [
        { model: UserMaster, attributes: ['userMasterID', 'displayName'] },
      ],
    });

    const coffAuthDetails = await AuthorizationDetails.findAll({
      where: {
        status: 1,
        AuthorizationMasterID: authorizationMasterTypes.compensatoryOff,
        companyMasterID,
      },
    });

    const allUserIds = leaveAuthDetails.map((e) => e.userMasterID);

    // Find All Coff Of User
    const findAllUsercoff = await coffMaster.findAll({
      where: {
        userMasterID: {
          [Sequelize.Op.in]: allUserIds,
        },
        authorizationStatus: 0,
        status: 1,
      },
    });

    // Find All AuthCriteria

    const AllAuthorizationCriterias = await AuthorizationCriteria.findAll({
      where: {
        status: 1,
      },
    });

    let counter = 0;

    await sequelize.transaction(async (t) => {
      for (let i = 0; i < leaveAuthDetails.length; i++) {
        const userMasterID = leaveAuthDetails[i].userMasterID;

        const findExistData = coffAuthDetails.find(
          (e) => e.userMasterID == userMasterID,
        );
        if (findExistData) continue;

        counter++;

        // Create AuthorizationDetails
        const insert_db_status = await AuthorizationDetails.create(
          {
            AuthorizationMasterID: authorizationMasterTypes.compensatoryOff,
            AuthorizedByUserMasterId:
              leaveAuthDetails[i].AuthorizedByUserMasterId,
            AuthorizationCriteriaID:
              leaveAuthDetails[i].AuthorizationCriteriaID,
            userMasterID,
            SerialNo: leaveAuthDetails[i].SerialNo,
            FromAmount: leaveAuthDetails[i].FromAmount,
            ToAmount: leaveAuthDetails[i].ToAmount,
            SequenceNo: leaveAuthDetails[i].SequenceNo,
            RequiredAuthorizationMessage:
              leaveAuthDetails[i].RequiredAuthorizationMessage,
            companyMasterID,
            createBy: leaveAuthDetails[i].createBy,
            createByIp: leaveAuthDetails[i].createByIp,
          },
          { transaction: t },
        );

        // Find All Coff Of User
        const findcoff = findAllUsercoff.filter(
          (e) => e.userMasterID == userMasterID,
        );

        // Find AuthCriteria
        const AuthorizationCriterias = AllAuthorizationCriterias.find(
          (e) =>
            e.AuthorizationCriteriaID ==
            insert_db_status.AuthorizationCriteriaID,
        );

        const authorizationStatus =
          AuthorizationCriterias.AuthorizationCriteria == 'Sequeance No'
            ? 2
            : 1;

        const AllCoffMasterIDs = findcoff.map((e) => e.coffMasterID);

        // Update All Coff
        await coffMaster.update(
          {
            authorizationStatus: authorizationStatus,
            updateBy: req.body.createBy,
            updateByIp: req.body.createByIp,
          },
          {
            where: {
              coffMasterID: {
                [Sequelize.Op.in]: AllCoffMasterIDs,
              },
            },
            transaction: t,
          },
        );

        const userinfo = leaveAuthDetails[i].userMaster;

        const findAllAuthorization = await CompensatoryOffAuthorization.findAll(
          {
            where: {
              coffMasterID: {
                [Sequelize.Op.in]: AllCoffMasterIDs,
              },
              status: 1,
            },
          },
        );

        const notification = {
          title: 'Compensatory Off',
          body: userinfo.displayName + ' requested for Compensatory Off.',
        };
        const data = {
          screen: 'coffauth',
        };

        for (let j = 0; j < findcoff.length; j++) {
          const authorizationIds = findAllAuthorization
            .filter((e) => e.coffMasterID == findcoff[j].coffMasterID)
            .map((a) => a.CompensatoryOffAuthorizationID);

          // Delete All UserInbox
          await UserInbox.destroy(
            {
              where: {
                activityTable: CompensatoryOffAuthorization.getTableName(),
                activityTablePK: {
                  [Sequelize.Op.in]: authorizationIds,
                },
              },
            },
            { transaction: t },
          );

          // Delete All Auth Data
          if (authorizationIds.length > 0) {
            await CompensatoryOffAuthorization.destroy(
              {
                where: {
                  coffMasterID: findcoff[j].coffMasterID,
                  status: 1,
                },
              },
              {
                Hooks: false,
                transaction: t,
              },
            );
          }

          if (AuthorizationCriterias.AuthorizationCriteria == 'Sequeance No') {
            const insert_db_status1 = await CompensatoryOffAuthorization.create(
              {
                TableName: 'coffMaster',
                coffMasterID: findcoff[j].coffMasterID,
                userMasterID: insert_db_status.AuthorizedByUserMasterId[0],
                status: 1,
                authstatus: 2,
              },
              { user: req.userDetails, transaction: t },
            );

            await UserInbox.create(
              {
                activityTable: CompensatoryOffAuthorization.getTableName(),
                activityTablePK:
                  insert_db_status1.toJSON().CompensatoryOffAuthorizationID,
                message: `${
                  userinfo.displayName
                } has requested for Compensatory Off for ${moment(
                  findcoff[j].LeaveCreatedDate,
                ).format('DD/MM/YYYY')}`,
                assignedTo: insert_db_status.AuthorizedByUserMasterId[0],
                assignedBy: findcoff[j].userMasterID,
              },
              { transaction: t },
            );

            await sendNotification(
              insert_db_status.AuthorizedByUserMasterId[0],
              notification,
              data,
            );
          } else {
            for (
              let k = 0;
              k < insert_db_status.AuthorizedByUserMasterId.length;
              k++
            ) {
              let insert_db_status1 = await CompensatoryOffAuthorization.create(
                {
                  TableName: 'coffMaster',
                  coffMasterID: findcoff[j].coffMasterID,
                  userMasterID: insert_db_status.AuthorizedByUserMasterId[k],
                  status: 1,
                  authstatus: 2,
                },
                {
                  user: req.userDetails,
                  transaction: t,
                },
              );

              await UserInbox.create(
                {
                  activityTable: CompensatoryOffAuthorization.getTableName(),
                  activityTablePK:
                    insert_db_status1.toJSON().CompensatoryOffAuthorizationID,
                  message: `${
                    userinfo.displayName
                  } has requested for Compensatory Off for ${moment(
                    findcoff[j].LeaveCreatedDate,
                  ).format('DD/MM/YYYY')}`,
                  assignedTo: insert_db_status.AuthorizedByUserMasterId[k],
                  assignedBy: findcoff[j].userMasterID,
                },
                { transaction: t },
              );

              await sendNotification(
                insert_db_status.AuthorizedByUserMasterId[k],
                notification,
                data,
              );
            }
          }
        }
      }
    });

    return res.status(200).json({
      status: 200,
      message: 'Data Added Successfully.',
      data: counter,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdminCoffAuthorizationRequests = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      limit,
      page,
      startdate,
      userMasterID,
      authorizationstatus,
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

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const condition = {
      status: 1,
    };

    if (userMasterID.length > 0) {
      condition.userMasterID = userMasterID;
    }

    if (startdate) {
      if (enddate == '' || enddate == undefined || enddate == null) {
        enddate = asiaKolkataDateTime(new Date()).slice(0, 10);
      }
      condition['$coffMaster.LeaveCreatedDate$'] = {
        [Sequelize.Op.between]: [startdate, enddate],
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
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    const getAllCoffrequest = await coffMaster.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: UserMaster,
          as: 'authorizer',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          attributes: ['displayName', 'userNumber', 'userMasterID', 'photo'],
          where: {
            companyMasterId: companyMasterID,
            status: 1,
            ...userAccessCondition.where,
          },
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              model: AuthorizationDetails,
              required: false,
              where: {
                status: 1,
                AuthorizationMasterID: authorizationMasterTypes.compensatoryOff, // fot coff
              },
              attributes: ['AuthorizationCriteriaID'],
              // separate: true,
              // include: [
              //   {
              //     model: AuthorizationCriteriaMaster,
              //     attributes: ['AuthorizationCriteria'],
              //   },
              // ],
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
          ],
        },
        {
          model: UserMaster,
          as: 'createdByUser',
          attributes: ['displayName'],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: getAllCoffrequest.rows,
      totalcount: getAllCoffrequest.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.coffApproveRejectAdmin = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { coffMasterID, authstatus, rejectionRemarks } = await req.body;

    if (!coffMasterID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Coff Request'),
      });
    }

    const allowedKeys = ['coffMasterID', 'authstatus', 'rejectionRemarks'];

    const invalidKeys = invalidKeyParams(
      { ...req.body, ...req.params },
      allowedKeys,
    );

    if (invalidKeys.length > 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: `Invalid body parameter(s): ${invalidKeys.join(', ')}`,
      });
    }

    const workFromHomeAuthorizationIDList = Array.isArray(coffMasterID)
      ? coffMasterID
      : [coffMasterID];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction,
    };
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const allAuthData = await coffMaster.findAll({
      where: {
        coffMasterID: workFromHomeAuthorizationIDList,
        authorizationStatus: [
          AuthorizationStatusType.PENDING_ZERO,
          AuthorizationStatusType.PEDING_ONE,
          AuthorizationStatusType.PEDING_TWO,
        ],
      },
      include: [
        {
          required: true,
          model: UserMaster,
          where: { ...userAccessCondition.where },
          include: [...userAccessCondition.includeModels],
        },
        {
          model: CompensatoryOffAuthorization,
          attributes: ['CompensatoryOffAuthorizationID'],
        },
      ],
      transaction,
    });

    if (allAuthData.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Coff Request'),
      });
    }

    const allIdsToDestroyInbox = allAuthData.flatMap((item) =>
      item.compensatoryOffAuthorizations.map(
        (e) => e.CompensatoryOffAuthorizationID,
      ),
    );

    await UserInbox.destroy({
      where: {
        activityTable: CompensatoryOffAuthorization.getTableName(),
        activityTablePK: allIdsToDestroyInbox,
      },
      options,
    });

    const bulkCreateHrLeaveBal = [];
    const allCoffIds = [];

    if (authstatus == 1) {
      for (const data of allAuthData) {
        allCoffIds.push(data.coffMasterID);
        bulkCreateHrLeaveBal.push({
          LeaveTranId: data?.LeaveTranId,
          userMasterID: data?.userMasterID,
          YearMM: data?.YearMM,
          LeaveAddNew: data?.LeaveAddNew,
          createBy: req.userDetails.userMasterId,
          expiryDate: data?.expiryDate || null,
          availBal: data?.LeaveAddNew,
        });
      }

      const addLeaveBalance = await HrLeaveBalance.bulkCreate(
        bulkCreateHrLeaveBal,
        {
          options,
          returning: true,
        },
      );

      await Promise.all(
        addLeaveBalance.map((data, i) =>
          coffMaster.update(
            {
              authorizationStatus: 3,
              authorizedBy: req.userDetails.userMasterId,
              authorizedAt: new Date(),
              isAuthorizedBy: true,
              LeaveBalTranId: data.LeaveBalTranId,
              authorizerRemark: rejectionRemarks,
            },
            {
              where: { coffMasterID: allCoffIds[i] },
              options,
            },
          ),
        ),
      );
    } else {
      await coffMaster.update(
        {
          authorizationStatus: 4,
          authorizedBy: req.userDetails.userMasterId,
          authorizedAt: new Date(),
          isAuthorizedBy: true,
          LeaveBalTranId: null,
          authorizerRemark: rejectionRemarks,
        },
        {
          where: { coffMasterID: workFromHomeAuthorizationIDList },
          options,
        },
      );
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        authstatus == 1
          ? 'Coff Request Approved Successfully'
          : 'Coff Request Rejected Successfully',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

function invalidKeyParams(query, allowedKeys) {
  return Object.keys(query).filter((key) => !allowedKeys.includes(key));
}

async function updateCompOffAuth(allIdToUpdate, options, remarks, authStatus) {
  const updateAllAuthorizationById = await CompensatoryOffAuthorization.update(
    {
      remarks: remarks,
      authstatus: authStatus,
    },
    {
      where: {
        CompensatoryOffAuthorizationID: allIdToUpdate,
      },
      ...options,
    },
  );
}

async function destroyAllInboxes(allIdToDestroInbox, options) {
  const destroyAllInbox = await UserInbox.destroy(
    {
      where: {
        activityTable: CompensatoryOffAuthorization.getTableName(),
        activityTablePK: allIdToDestroInbox,
      },
    },
    { ...options },
  );
}

async function updateCompOff(
  allCompOffIds,
  options,
  authorizationStatus,
  userMasterId,
  isAuthorizedBy = false,
  remark,
) {
  const rejectAllRequests = await coffMaster.update(
    {
      authorizationStatus: authorizationStatus,
      authorizedBy: userMasterId,
      authorizedAt: new Date(),
      isAuthorizedBy: isAuthorizedBy,
      authorizerRemark: remark,
    },
    {
      where: {
        coffMasterID: allCompOffIds,
      },
      ...options,
    },
  );
}

async function getAllCompOff(allCompOffIds, options) {
  const allAuthorizer = await coffMaster.findAll({
    where: {
      coffMasterID: allCompOffIds,
      authorizationStatus: [
        AuthorizationStatusType.PENDING_ZERO,
        AuthorizationStatusType.PEDING_ONE,
        AuthorizationStatusType.PEDING_TWO,
      ],
    },
    include: [
      {
        model: CompensatoryOffAuthorization,
      },
    ],
    ...options,
  });
  return allAuthorizer;
}
