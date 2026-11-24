const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const ExtraDays = require('../models/extraDays');
const AuthorizationDetails = require('../models/AuthorizationDetails');
const AuthorizationCriteria = require('../models/authorizationCriteriaMaster');
const UserMaster = require('../models/userMaster');
const ExtraDaysAuthorization = require('../models/extraDaysAuthorization');
const ExcelJS = require('exceljs');
const moment = require('moment');
const {
  asiaKolkataDateTime,
  sendNotification,
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
const { generateExcel } = require('../utils/exportData');
const companyMaster = require('../models/companyMaster');

exports.getExtradaysAuthorizationRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const authorizationRequest = await ExtraDays.findOne({
      where: { extraDaysID: id },
      include: [
        {
          model: UserMaster,
          attributes: userAttributes,
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
          as: 'createByUser',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'authorizer',
          attributes: ['displayName'],
        },
      ],
    });

    const {
      authorizationStatus,
      userMasterID,
      userMaster,
      createByUser,
      date,
      days,
      remarks,
      cancelRemarks,
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

    const authUserStatuses = await ExtraDaysAuthorization.findAll({
      where: { extraDaysID: id },
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

    const formattedDate = moment(date).format('DD/MM/YYYY');

    const responseData = {
      date: formattedDate,
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
      createdByUser: createByUser ? createByUser.displayName : '',
      days: days,
      remarks,
      cancelRemarks,
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
      authorizer: authorizationRequest?.authorizer?.displayName || null,
      finalRemark: authorizationRequest?.authorizerRemark,
      isAutoApproved: authorizationRequest.isAutoApproved,
    };

    return res.status(200).json({ status: 200, data: responseData });
  } catch (error) {
    next(error);
  }
};

exports.viewExtraDayAuthorizationByUserId = async (req, res, next) => {
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

    const condition = { userMasterID: authUserMasterID };
    if (status !== null && status !== undefined) {
      condition.authStatus = status;
      if (+status === 2) {
        condition['$extraDay.authorizationStatus$'] = {
          [Sequelize.Op.notIn]: [3, 4, 5],
        };
      }
    } else {
      condition.authStatus = 2;
      condition['$extraDay.authorizationStatus$'] = {
        [Sequelize.Op.notIn]: [3, 4, 5],
      };
    }

    if (user && user.length > 0) {
      condition['$extraDay.userMasterID$'] = {
        [Sequelize.Op.in]: user,
      };
    }

    if (startdate && enddate) {
      condition['$extraDay.date$'] = {
        [Sequelize.Op.between]: [startdate, enddate],
      };
    }
    const userCondition = { status: 1 };
    if (companyMasterID) {
      userCondition.companyMasterId = companyMasterID;
    }
    const ExtraDayAuthorizationRequest =
      await ExtraDaysAuthorization.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginateCondition,
        order: [['createdAt', 'DESC']],
        include: [
          {
            required: true,
            model: ExtraDays,
            include: [
              {
                separate: true,
                model: ExtraDaysAuthorization,
                include: [
                  {
                    model: UserMaster,
                    attributes: ['displayName'],
                  },
                ],
              },
              {
                model: UserMaster,
                where: userCondition,
                attributes: ['userMasterID', 'displayName', 'userNumber'],
                include: [
                   {
                    separate:true,
                    required:false,
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
                   model:companyMaster,
                   attributes:['companyName']
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
                as: 'createByUser',
                attributes: ['displayName'],
              },
            ],
          },
        ],
      });
    if (exportData) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('ExtraDayAuthorizations');

      const columns = [
        {header:'Company Name',key:'companyName',width:22},
        { header: 'Employee Code', key: 'employeeCode', width: 18 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Mobile No', key: 'mobileNo', width: 15 },
        { header: 'Branch', key: 'branchName', width: 20 },
        { header: 'Department', key: 'departmentName', width: 22 },
        { header: 'Designation', key: 'designationName', width: 22 },
        { header: 'Working Area', key: 'workingAreaName', width: 20 },
        { header: 'Division', key: 'divisionName', width: 20 },
        { header: 'Extra Day Date', key: 'extraDayDate', width: 18 },
        { header: 'Days', key: 'days', width: 10 },
        {header:'Authorization Criteria',key:'authCriteria',width:18},
        { header: 'Authorizers', key: 'authorizer', width: 25 },
        { header: 'Authorizer Status', key: 'authorizerStatus', width: 18 },
        {header:'Authorizer Remarks',key:'authRemarks',width:20},
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Remarks', key: 'remark', width: 20 },
        { header: 'Created By', key: 'createdBy', width: 22 },
        { header: 'Created Date', key: 'createdDate', width: 18 },
      ];

      worksheet.columns = columns;

      const headerRow = worksheet.getRow(1);

      headerRow.eachCell((cell) => {
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' },
        };

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

      let currentRowIndex = 2;

     for (const record of ExtraDayAuthorizationRequest.rows) {
  const extraDay = record.extraDay || {};
  const user = extraDay.userMaster || {};

  const authorizations = extraDay.extraDaysAuthorizations || [];

  const rowCount = Math.max(authorizations.length, 1);

  const commonFields = {
    authCriteria:
      user.authorizationDetails?.[0]?.AuthorizationCriteriaMaster
        ?.AuthorizationCriteria || '',

    companyName: user.companyMaster?.companyName || '',

    employeeCode:
      user.employeeJoiningDetails?.[0]?.employeeCode || '',

    name: user.displayName || '',

    mobileNo: user.userNumber || '',

    branchName:
      user.employeeBranches?.[0]?.branchMaster?.branchName || '',

    departmentName:
      user.employeeDepartments?.[0]?.department?.departmentName || '',

    designationName:
      user.employeeDesignations?.[0]?.designation?.designationName || '',

    workingAreaName:
      user.employeeWorkingAreas?.[0]?.workingArea?.workingAreaName || '',

    divisionName:
      user.employeeDivisions?.[0]?.division?.divisionName || '',

    extraDayDate: extraDay.date
      ? moment(extraDay.date).format('DD-MM-YYYY')
      : '',

    days: extraDay.days || '',

    createdBy:
      extraDay.createByUser?.displayName || '',

    createdDate: record.createdAt
      ? moment(record.createdAt).format('DD-MM-YYYY')
      : '',

    remark:
      authorizations[0]?.remarks || '',

    status: [0, 1, 2].includes(record.extraDay.authorizationStatus)
      ? 'Pending'
      : record.extraDay.authorizationStatus === 3
        ? 'Approved'
        : 'Rejected',
  };


  if (authorizations.length === 0) {
    const excelRow = worksheet.addRow({
      ...commonFields,
      authorizer: '',
      authorizerStatus: '',
      authRemarks:''
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
  else {
    for (const auth of authorizations) {

      const excelRow = worksheet.addRow({
        ...commonFields,

        authorizer:
          auth.userMaster?.displayName || '',

        authorizerStatus:
          auth.authStatus == 0
            ? 'Rejected'
            : auth.authStatus == 1
              ? 'Approved'
              : auth.authStatus == 2
                ? 'Pending'
                : '',
          authRemarks:auth.remarks
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

  // merge common columns
  if (rowCount > 1) {
    const mergeStart = currentRowIndex;
    const mergeEnd = currentRowIndex + rowCount - 1;

    const columnsToMerge = [
      1, 2, 3, 4, 5, 6, 7, 8,
      9, 10, 11, 12, 16, 17, 18,19
    ];

    columnsToMerge.forEach((col) => {
      worksheet.mergeCells(
        mergeStart,
        col,
        mergeEnd,
        col
      );
    });
  }

  currentRowIndex += rowCount;
}
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );

      res.setHeader(
        'Content-Disposition',
        'attachment; filename="ExtraDayAuthorizations.xlsx"',
      );

      await workbook.xlsx.write(res);

      return res.end();
    }

    return res.status(200).json({
      status: 200,
      data: ExtraDayAuthorizationRequest.rows,
      totalcount: ExtraDayAuthorizationRequest.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.extraDaysAuthorizationacceptreject = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { extraDaysAuthorizationID, remarks, authStatus } = req.body;

    const extraDaysAuthorizationIDList = Array.isArray(extraDaysAuthorizationID)
      ? extraDaysAuthorizationID
      : [extraDaysAuthorizationID];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    };

    const authRequests = await ExtraDaysAuthorization.findAll({
      where: {
        extraDaysAuthorizationID: extraDaysAuthorizationIDList,
        authStatus: 2,
      },
      attributes: [
        'extraDaysAuthorizationID',
        'userMasterID',
        'authStatus',
        'extraDaysID',
      ],
      include: [
        {
          model: ExtraDays,
          where: {
            authorizationStatus: [
              AuthorizationStatusType.PENDING_ZERO,
              AuthorizationStatusType.PEDING_ONE,
              AuthorizationStatusType.PEDING_TWO,
            ],
          },
          attributes: [
            'extraDaysID',
            'userMasterID',
            'date',
            'authorizationStatus',
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
        message: 'Extra Days Authorization request not found',
      });
    }

    if (authStatus == 0) {
      const allExtraDayIds = authRequests.map((e) => {
        return e?.extraDay?.extraDaysID;
      });

      const allAuthorizer = await getAllExtraDays(allExtraDayIds, options);

      const allIdToDestroInbox = allAuthorizer.flatMap((e) =>
        e.extraDaysAuthorizations.map((id) => id.extraDaysAuthorizationID),
      );

      const getIdtoUpdateExtraDayAuth = allIdToDestroInbox.filter((item) =>
        extraDaysAuthorizationIDList.includes(item),
      );
      await updateExtraDayAuth(
        getIdtoUpdateExtraDayAuth,
        options,
        remarks,
        authStatus,
      );
      await destroyAllInboxes(allIdToDestroInbox, options);
      await updateExtraDay(
        allExtraDayIds,
        options,
        AuthorizationStatusType.REJECTED,
        req.userDetails.userMasterId,
        false,
        remarks,
      );

      await transaction.commit();
      return res.status(200).json({
        status: 200,
        message: 'Extra Days Authorization request rejected successfully',
      });
    } else {
      const anyOneData = [];
      const anyTwoData = [];
      const anyThreeData = [];
      const sequenceWise = [];
      let allIDsToDeleteInbox = [];
      let allIDsToUpdateExtraDay = [];
      let allIDsToUpdateExtraDayAuth = [];
      let bulkNotification = [];
      authRequests.map((data) => {
        if (
          data?.extraDay?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYONE
        ) {
          anyOneData.push({
            extraDaysAuthorizationID: data.extraDaysAuthorizationID,
            extraDaysID: data.extraDaysID,
          });
        }
        if (
          data?.extraDay?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTWO
        ) {
          anyTwoData.push({
            extraDaysAuthorizationID: data.extraDaysAuthorizationID,
            extraDaysID: data.extraDaysID,
          });
        }
        if (
          data?.extraDay?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.ANYTHREE
        ) {
          anyThreeData.push({
            extraDaysAuthorizationID: data.extraDaysAuthorizationID,
            extraDaysID: data.extraDaysID,
          });
        }
        if (
          data?.extraDay?.userMaster?.authorizationDetails?.[0]
            ?.AuthorizationCriteriaID == authorizationCriteriaType.SEQUENCENO
        ) {
          sequenceWise.push({
            extraDaysAuthorizationID: data.extraDaysAuthorizationID,
            extraDaysID: data.extraDaysID,
            authorizerIDs:
              data.extraDay.userMaster.authorizationDetails[0]
                .AuthorizedByUserMasterId, // it is an array of userID
            userNameForNotification: data.extraDay.userMaster.displayName,
            assignedBy: data.extraDay.userMaster.userMasterID,
            date: data.extraDay.date,
          });
        }
      });

      if (anyOneData.length > 0) {
        const getAllExtraDayIds = anyOneData.map((e) => {
          return e.extraDaysID;
        });

        const getAllAuthorizers = await getAllExtraDays(
          getAllExtraDayIds,
          options,
        );

        const getAllIdsToDestryInbox = getAllAuthorizers.flatMap((e) =>
          e.extraDaysAuthorizations.map((id) => id.extraDaysAuthorizationID),
        );
        const getIdtoUpdateExtraDayAuth = getAllIdsToDestryInbox.filter(
          (item) => extraDaysAuthorizationIDList.includes(item),
        );

        allIDsToUpdateExtraDayAuth = [
          ...allIDsToUpdateExtraDayAuth,
          ...getIdtoUpdateExtraDayAuth,
        ];
        allIDsToDeleteInbox = [
          ...allIDsToDeleteInbox,
          ...getAllIdsToDestryInbox,
        ];
        allIDsToUpdateExtraDay = [
          ...allIDsToUpdateExtraDay,
          ...getAllExtraDayIds,
        ];
      }
      if (anyTwoData.length > 0) {
        const getAllExtraDayId = anyTwoData.map((e) => e.extraDaysID);
        const getAUthorizationReqId = anyTwoData.map(
          (e) => e.extraDaysAuthorizationID,
        );

        const getAllExtraDay = await getAllExtraDays(getAllExtraDayId, options);

        const otherAuthorizers = [];
        const extraDayApprovedIds = [];

        getAllExtraDay.forEach((item) => {
          const authorizers = item.extraDaysAuthorizations;

          const approved = authorizers.filter((a) => a.authStatus === 1);

          if (approved.length == 1) {
            const allIds = authorizers.map((a) => a.extraDaysAuthorizationID);

            otherAuthorizers.push(...allIds);
            extraDayApprovedIds.push(item.extraDaysID);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];
        const getIdtoUpdateExtraDayAuth = getAUthorizationReqId.filter((item) =>
          extraDaysAuthorizationIDList.includes(item),
        );

        allIDsToUpdateExtraDayAuth = [
          ...allIDsToUpdateExtraDayAuth,
          ...getIdtoUpdateExtraDayAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateExtraDay = [
          ...allIDsToUpdateExtraDay,
          ...extraDayApprovedIds,
        ];
      }
      if (anyThreeData.length > 0) {
        const getAllExtraDayId = anyThreeData.map((e) => e.extraDaysID);
        const getAUthorizationReqId = anyThreeData.map(
          (e) => e.extraDaysAuthorizationID,
        );

        const getAllExtraDay = await getAllExtraDays(getAllExtraDayId, options);

        const otherAuthorizers = [];
        const extraDayApprovedIds = [];

        getAllExtraDay.forEach((item) => {
          const authorizers = item.extraDaysAuthorizations;

          const approved = authorizers.filter((a) => a.authStatus === 1);

          if (approved.length == 2) {
            const allIds = authorizers.map((a) => a.extraDaysAuthorizationID);

            otherAuthorizers.push(...allIds);
            extraDayApprovedIds.push(item.extraDaysID);
          }
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];
        const getIdtoUpdateExtraDayAuth = getAUthorizationReqId.filter((item) =>
          extraDaysAuthorizationIDList.includes(item),
        );

        allIDsToUpdateExtraDayAuth = [
          ...allIDsToUpdateExtraDayAuth,
          ...getIdtoUpdateExtraDayAuth,
        ];
        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateExtraDay = [
          ...allIDsToUpdateExtraDay,
          ...extraDayApprovedIds,
        ];
      }
      if (sequenceWise.length > 0) {
        const getAllExtraDayId = sequenceWise.map((e) => e.extraDaysID);
        const getAUthorizationReqId = sequenceWise.map(
          (e) => e.extraDaysAuthorizationID,
        );

        const otherAuthorizers = [];
        const extraDayApprovedIds = [];
        const createExtraDaysAuth = [];
        const sendNotificationInbox = [];

        const getIdtoUpdateExtraDayAuth = getAUthorizationReqId.filter((item) =>
          extraDaysAuthorizationIDList.includes(item),
        );
        await updateExtraDayAuth(
          getIdtoUpdateExtraDayAuth,
          options,
          remarks,
          authStatus,
        );
        // allIDsToUpdateExtraDayAuth = [
        //   ...allIDsToUpdateExtraDayAuth,
        //   ...getIdtoUpdateExtraDayAuth,
        // ];
        const getAllExtraDay = await getAllExtraDays(getAllExtraDayId, options);

        getAllExtraDay.forEach((item) => {
          const authorizers = item.extraDaysAuthorizations;

          const approved = authorizers.filter((a) => a.authStatus === 1);

          const seq = sequenceWise.find(
            (x) => x.extraDaysID === item.extraDaysID,
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
            const allIds = authorizers.map((a) => a.extraDaysAuthorizationID);

            otherAuthorizers.push(...allIds);
            extraDayApprovedIds.push(item.extraDaysID);
            return;
          }

          const nextUser = remainingUsers[0]; // FIRST PENDING USER

          createExtraDaysAuth.push({
            extraDaysID: item.extraDaysID,
            userMasterID: +nextUser,
            authStatus: 2,
          });
        });

        const idToDelete = [...otherAuthorizers, ...getAUthorizationReqId];

        allIDsToDeleteInbox = [...allIDsToDeleteInbox, ...idToDelete];
        allIDsToUpdateExtraDay = [
          ...allIDsToUpdateExtraDay,
          ...extraDayApprovedIds,
        ];

        const createNewExtraDaysAuth = await ExtraDaysAuthorization.bulkCreate(
          createExtraDaysAuth,
          { ...options },
        );

        sequenceWise.map((item) => {
          const data = createNewExtraDaysAuth.find(
            (e) => e.extraDaysID == item.extraDaysID,
          );

          if (data) {
            sendNotificationInbox.push({
              assignedTo: data.userMasterID,
              extraDaysID: item.extraDaysID,
              assignedBy: item.assignedBy,
              activityTable: ExtraDaysAuthorization.getTableName(),
              activityTablePK: data.extraDaysAuthorizationID,
              message: `${item.userNameForNotification} has requested Extra Days for ${moment(
                item.date,
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
      await updateExtraDayAuth(
        allIDsToUpdateExtraDayAuth,
        options,
        remarks,
        authStatus,
      );

      await destroyAllInboxes(allIDsToDeleteInbox, options);
      if (allIDsToUpdateExtraDay.length > 0) {
        await updateExtraDay(
          allIDsToUpdateExtraDay,
          options,
          AuthorizationStatusType.APPROVED,
          req.userDetails.userMasterId,
          false,
          remarks,
        );
      }
      await transaction.commit();
      const data = {
        screen: 'extradaysauth',
      };

      bulkNotification.forEach(async (item) => {
        const notification = {
          title: 'Extra Days',
          body: item.message,
        };
        sendNotification(item.assignedTo, notification, data);
      });

      return res.status(200).json({
        status: 200,
        message: 'Extra Days Authorization request approved successfully',
      });
    }
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.cancelExtraDayAuthorizationRequest = async (req, res, next) => {
  try {
    const { extraDaysID, cancelRemarks } = req.body;

    const existExtraDays = await ExtraDays.findOne({
      where: {
        extraDaysID,
      },
    });

    if (existExtraDays && !existExtraDays.employeeincentiveID) {
      existExtraDays.authorizationStatus = 5;
      if (cancelRemarks) existExtraDays.cancelRemarks = cancelRemarks;
      await existExtraDays.save({ user: req.userDetails });
    }

    return res.status(200).json({
      status: 200,
      message: 'Extra Days Request Cancelled Successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllExtraDaysAuthorizationAdmin = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      startdate,
      userMasterID,
      authorizationstatus,
      companyMasterID,
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

    const condition = {};

    if (userMasterID.length > 0) {
      condition.userMasterID = userMasterID;
    }

    if (startdate) {
      if (enddate == '' || enddate == undefined || enddate == null) {
        enddate = asiaKolkataDateTime(new Date()).slice(0, 10);
      }
      condition.date = {
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

    const { where, includeModels } = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: false,
    });

    const getAllExtraDayAuthRequest = await ExtraDays.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: UserMaster,
          attributes: ['userMasterID', 'displayName', 'userNumber'],
          where: {
            ...where,
            companyMasterId: companyMasterID,
            status: 1,
          },
          include: [
            ...includeModels,
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
          as: 'createByUser',
          attributes: ['displayName'],
        },
        // {
        //   model: UserMaster,
        //   as: 'authorizer',
        //   attributes: ['displayName'],
        // },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: getAllExtraDayAuthRequest.rows,
      totalcount: getAllExtraDayAuthRequest.count,
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptRejectExtraDaysAuth = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { extraDaysID, authstatus, rejectionRemarks } = req.body;

    if (!extraDaysID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Extra Days Authorization Request',
        ),
      });
    }

    const allowedKeys = ['extraDaysID', 'authstatus', 'rejectionRemarks'];

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

    const extraDayAuthorizationIDList = Array.isArray(extraDaysID)
      ? extraDaysID
      : [extraDaysID];

    const options = {
      individualHooks: true,
      user: req.userDetails,
      transaction: transaction,
    };

    const allExtraDays = await getAllExtraDays(
      extraDayAuthorizationIDList,
      options,
    );

    if (allExtraDays.length == 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage(
          'Extra Days Authorization Request',
        ),
      });
    }

    const idToApproveExtraDays = allExtraDays.map((item) => item.extraDaysID);
    const idToDestroyInbox = allExtraDays.flatMap((item) =>
      item.extraDaysAuthorizations.map((e) => e.extraDaysAuthorizationID),
    );

    await destroyAllInboxes(idToDestroyInbox, options);
    const updatedData =
      authstatus == 1
        ? await updateExtraDay(
            idToApproveExtraDays,
            options,
            AuthorizationStatusType.APPROVED,
            req.userDetails.userMasterId,
            true,
            rejectionRemarks,
          )
        : await updateExtraDay(
            idToApproveExtraDays,
            options,
            AuthorizationStatusType.REJECTED,
            req.userDetails.userMasterId,
            true,
            rejectionRemarks,
          );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        authstatus == 1
          ? 'Extra Days Authorization Request Approved Successfully'
          : 'Extra Days Authorization Request Rejected Successfully',
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

function invalidKeyParams(query, allowedKeys) {
  return Object.keys(query).filter((key) => !allowedKeys.includes(key));
}

async function updateExtraDayAuth(allIdToUpdate, options, remarks, authStatus) {
  const updateAllAuthorizationById = await ExtraDaysAuthorization.update(
    {
      remarks: remarks,
      authStatus: authStatus,
    },
    {
      where: {
        extraDaysAuthorizationID: allIdToUpdate,
      },
      ...options,
    },
  );
}

async function destroyAllInboxes(allIdToDestroInbox, options) {
  const destroyAllInbox = await UserInbox.destroy(
    {
      where: {
        activityTable: ExtraDaysAuthorization.getTableName(),
        activityTablePK: allIdToDestroInbox,
      },
    },
    { ...options },
  );
}

async function updateExtraDay(
  allExtraDayIds,
  options,
  authorizationStatus,
  userMasterId,
  isAuthorizedBy = false,
  remark,
) {
  const rejectAllRequests = await ExtraDays.update(
    {
      authorizationStatus: authorizationStatus,
      authorizedBy: userMasterId,
      authorizedAt: new Date(),
      isAuthorizedBy: isAuthorizedBy,
      authorizerRemark: remark,
    },
    {
      where: {
        extraDaysID: allExtraDayIds,
      },
      ...options,
    },
  );
}

async function getAllExtraDays(allExtraDayIds, options) {
  const allAuthorizer = await ExtraDays.findAll({
    where: {
      extraDaysID: allExtraDayIds,
      authorizationStatus: [
        AuthorizationStatusType.PENDING_ZERO,
        AuthorizationStatusType.PEDING_ONE,
        AuthorizationStatusType.PEDING_TWO,
      ],
    },
    include: [
      {
        model: ExtraDaysAuthorization,
      },
    ],
    ...options,
  });
  return allAuthorizer;
}
