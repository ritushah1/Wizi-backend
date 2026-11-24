const toursMaster = require('../models/toursMaster');
const Sequelize = require('sequelize');
const message = require('../response_message/message');
const UserMaster = require('../models/userMaster');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeBranch = require('../models/employeeBranch');
const {
  sendNotification,
  asiaKolkataDateTime,
  findAuthorizationDetails,
} = require('../utils/commonUtilFunctions');
const Designation = require('../models/designation');
const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const { userAttributes } = require('../utils/commonVars');
const {
  generateExcel,
  generateExcelWithAuthorizers,
} = require('../utils/exportData');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const {
  authorizationMasterTypes,
  authorizationCriteriaType,
  notificationTitleTypes,
  notificationScreentTypes,
  AuthorizationStatusType,
} = require('../utils/dbUtils');
const tourAuthorization = require('../models/tourAuthorization');
const UserInbox = require('../models/UserInbox');
const Excel = require('exceljs');
const sequelize = require('../config/database');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');

exports.postAddtoursMaster = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      ToursName,
      FromDate,
      ToDate,
      TotalDays,
      CoPersonId,
      Description,
      userMasterID,
    } = await req.body;

    const authorizationDetails = await findAuthorizationDetails(
      authorizationMasterTypes.tour,
      userMasterID,
    );
    let authorizationStatus = AuthorizationStatusType.PENDING_ZERO;
    if (authorizationDetails) {
      if (
        +authorizationDetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO
      ) {
        authorizationStatus = AuthorizationStatusType.PEDING_TWO;
      } else {
        authorizationStatus = AuthorizationStatusType.PEDING_ONE;
      }
    } else {
      authorizationStatus = AuthorizationStatusType.APPROVED;
    }

    const insert_db_status = await toursMaster.create(
      {
        ToursName,
        FromDate,
        ToDate,
        TotalDays,
        CoPersonId,
        authorizationStatus,
        AuthorizationCriteriaID:
          authorizationDetails?.AuthorizationCriteriaID || null,
        Description,
        UserMasterID: userMasterID,
        createBy: req.userDetails.userMasterId,
        createByIp: req.userDetails.userIpAddress,
      },
      { transaction: transaction },
    );
    if (authorizationDetails) {
      if (authorizationStatus != 0) {
        // user Details
        const userDetails = await UserMaster.findOne({
          where: {
            userMasterID,
          },
        });

        if (!userDetails) {
          await transaction.rollback();
          return res
            .status(200)
            .json({ status: 401, message: 'User not found' });
        }

        // For Sequence No
        if (authorizationStatus == 2) {
          const authorizationData = await tourAuthorization.create(
            {
              TableName: toursMaster.getTableName(),
              tourMasterID: insert_db_status.ToursMasterID,
              userMasterID: authorizationDetails.AuthorizedByUserMasterId[0],
              authStatus: 2,
            },
            { user: req.userDetails, transaction: transaction },
          );

          // Create UserInbox
          await UserInbox.create(
            {
              activityTable: tourAuthorization.getTableName(),
              activityTablePK: authorizationData.toJSON().tourAuthorizationID,
              message: `${userDetails.displayName} has requested a Tour.`,
              assignedTo: authorizationDetails.AuthorizedByUserMasterId[0],
              assignedBy: userMasterID,
            },
            { user: req.userDetails, transaction: transaction },
          );

          const notification = {
            title: notificationTitleTypes.TOUR,
            body: userDetails.displayName + ' requested for a Tour.',
          };
          const data = {
            screen: notificationScreentTypes.TOUR,
            isScheduled: 'true',
            scheduledTime: new Date().toISOString(),
          };
          // send Notification
          await sendNotification(
            authorizationData.userMasterID,
            notification,
            data,
          );
        } else {
          // For Any
          for (
            let j = 0;
            j < authorizationDetails.AuthorizedByUserMasterId.length;
            j++
          ) {
            const authorizationData = await tourAuthorization.create(
              {
                TableName: toursMaster.getTableName(),
                tourMasterID: insert_db_status.ToursMasterID,
                userMasterID: authorizationDetails.AuthorizedByUserMasterId[j],
                authStatus: 2,
              },
              { user: req.userDetails, transaction: transaction },
            );

            // Create UserInbox
            await UserInbox.create(
              {
                activityTable: tourAuthorization.getTableName(),
                activityTablePK: authorizationData.toJSON().tourAuthorizationID,
                message: `${userDetails.displayName} has requested a Tour.`,
                assignedTo: authorizationDetails.AuthorizedByUserMasterId[j],
                assignedBy: userMasterID,
              },
              { user: req.userDetails, transaction: transaction },
            );

            const notification = {
              title: notificationTitleTypes.TOUR,
              body: userDetails.displayName + ' requested for a Tour.',
            };
            const data = {
              screen: notificationScreentTypes.TOUR,
              isScheduled: 'true',
              scheduledTime: new Date().toISOString(),
            };
            // send Notification
            await sendNotification(
              authorizationData.userMasterID,
              notification,
              data,
            );
          }
        }
      }
    }
    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.toursMasteradd,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

// to add transaction section in this
exports.postUpdatetoursMaster = async (req, res, next) => {
  try {
    let {
      ToursMasterID,
      ToursName,
      FromDate,
      ToDate,
      TotalDays,
      CoPersonId,
      Description,
      userMasterID,
      Authorization,
    } = await req.body;

    const tourData = await toursMaster.findOne({
      where: { ToursMasterID: ToursMasterID },
      include: [
        {
          as: 'tourAuth',
          model: tourAuthorization,
          attributes: ['authStatus', 'userMasterID'],
        },
      ],
    });

    if (
      tourData.authorizationStatus == AuthorizationStatusType.APPROVED ||
      tourData.authorizationStatus == AuthorizationStatusType.REJECTED
    ) {
      return res.status(400).json({
        status: 400,
        message:
          'Tour cannot be updated as it is already approved or rejected by authorizer.',
      });
    }
    const cantEdit = tourData?.tourAuth?.some(
      (item) => item.authStatus == 1 || item.authStatus == 0,
    );

    if (cantEdit) {
      return res.status(400).json({
        status: 400,
        message:
          'Tour cannot be updated as it is already approved or rejected by authorizer.',
      });
    }

    await toursMaster.update(
      {
        ToursName,
        FromDate,
        ToDate,
        TotalDays,
        CoPersonId,
        Description,
        UserMasterID: userMasterID,
        Authorization,
        updateBy: req.userDetails.userMasterId,
        updateByIp: req.userDetails.userIpAddress,
      },
      {
        where: {
          ToursMasterID: ToursMasterID,
        },
      },
    );

    return res
      .status(200)
      .json({ status: 200, message: message.usermessage.toursMasterupdate });
  } catch (err) {
    next(err);
  }
};

exports.posttoursMasterById = async (req, res, next) => {
  try {
    var data = await toursMaster.findOne({
      where: {
        ToursMasterID: req.params.id,
        status: 1,
      },
      include: [{ model: UserMaster, as: 'assign' }],
    });

    if (data != null && data.CoPersonId != null) {
      for (var j = 0; j < data.CoPersonId.length; j++) {
        let temp_data = await UserMaster.findOne({
          where: {
            userMasterID: data.CoPersonId[j],
          },
        });
        data.CoPersonId[j] = {
          UserMasterID: data.CoPersonId[j],
          Name:
            temp_data.firstName +
            ' ' +
            temp_data.middleName +
            ' ' +
            temp_data.lastName,
          userNumber: temp_data.userNumber,
        };
      }
    }

    if (!data) {
      return res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    } else {
      return res.status(200).json({ status: 200, data: data });
    }
  } catch (err) {
    next(err);
  }
};

exports.getDeletetoursMasterById = async (req, res, next) => {
  try {
    const id = req.params.id;
    await toursMaster.update(
      {
        status: 2,
      },
      {
        where: { ToursMasterID: id },
      },
    );

    const tourAuthorizationDetails = await tourAuthorization.findAll({
      where: { tourMasterID: id },
    });

    const allAuthorizationID = tourAuthorizationDetails.map(
      (item) => item.tourAuthorizationID,
    );

    await tourAuthorization.destroy({
      where: { tourMasterID: id },
      individualHooks: true,
      user: req.userDetails,
    });
    if (allAuthorizationID.length > 0) {
      await UserInbox.destroy({
        where: {
          activityTable: tourAuthorization.getTableName(),
          activityTablePK: { [Sequelize.Op.in]: allAuthorizationID },
        },
        individualHooks: true,
        user: req.userDetails,
      });
    }

    return res
      .status(200)
      .json({ status: 200, message: message.usermessage.toursMasterdelete });
  } catch (err) {
    next(err);
  }
};

exports.postchangestatus = async (req, res, next) => {
  try {
    const { ToursMasterID, status } = await req.body;

    if (status != '0' && status != '1') {
      return res
        .status(200)
        .json({ status: 401, message: 'Pass Valid Status' });
    }

    await toursMaster.update(
      {
        status,
      },
      {
        where: { ToursMasterID: ToursMasterID },
      },
    );

    return res.status(200).json({
      status: 200,
      message:
        status == '0'
          ? message.usermessage.deactiveMessage('Tour')
          : message.usermessage.activeMessage('Tour'),
    });
  } catch (err) {
    next(err);
  }
};

exports.gettouruserid = async (req, res, next) => {
  try {
    const { limit, page, searchQuery, startdate, enddate, Export } =
      await req.body;
    const userMasterID = req.userDetails.userMasterId;
    const paginationQuery = {};
    if (page && limit && !Export) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const condition = { UserMasterID: userMasterID, status: [1] };

    if (startdate && enddate) {
      condition[Sequelize.Op.and] = [
        {
          FromDate: { [Sequelize.Op.lte]: enddate },
        },
        {
          ToDate: { [Sequelize.Op.gte]: startdate },
        },
      ];
    }

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          ToursName: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' },
        },
      ];
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const TourMasterData = await toursMaster.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      order: [
        ['createdAt', 'DESC'],
        ['FromDate', 'ASC'],
      ],
      include: [
        {
          model: UserMaster,
          as: 'assign',
          required: true,
          where: { ...userAccessCondition.where },
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
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
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
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
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
          as: 'createByUser',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'updateByUser',
          attributes: ['displayName'],
        },
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
      ],
    });

    for (var j = 0; j < TourMasterData.rows.length; j++) {
      TourMasterData.rows[j].setDataValue(
        'isApprovedByAny',
        TourMasterData.rows[j].tourAuth?.some(
          (auth) => Number(auth.authStatus) == 1,
        ) || false,
      );
      if (TourMasterData.rows[j].CoPersonId != null) {
        for (var k = 0; k < TourMasterData.rows[j].CoPersonId.length; k++) {
          let copersonuser = await UserMaster.findOne({
            where: {
              userMasterID: Number(TourMasterData.rows[j].CoPersonId[k]),
            },
            attributes: ['userMasterID', 'displayName', 'userNumber'],
          });
          TourMasterData.rows[j].CoPersonId[k] = copersonuser;
        }
      }
    }

    if (Export) {
      const maindata = TourMasterData.rows.map((row) => ({
        Employee: row.assign?.displayName || '',
        Number: row.assign?.userNumber || '',
        Branch:
          row.assign?.employeeBranches?.[0]?.branchMaster?.branchName || '',
        Department:
          row.assign?.employeeDepartments?.[0]?.department?.departmentName ||
          '',
        Designation:
          row.assign?.employeeDesignations?.[0]?.designation?.designationName ||
          '',
        TourName: row.ToursName,
        TourFromDate:
          String(row.FromDate)?.split('-').reverse().join('-') || '',
        TourEndDate: String(row.ToDate)?.split('-').reverse().join('-') || '',
        TotalDays: row.TotalDays,
        Coperson: (row.CoPersonId || [])
          .filter(Boolean)
          .map((u) => `${u.displayName}(${u.userNumber})`)
          .join(','),
        status: row.authorizationStatus,
        authorizers: row.tourAuth,
        authorizerCriteria:
          row?.AuthorizationCriteriaMaster?.AuthorizationCriteria,
      }));

      return await generateExcelWithAuthorizers(
        maindata,
        'Tour Master',
        'xlsx',
        res,
      );
    }

    return res.status(200).json({
      status: 200,
      data: TourMasterData.rows,
      totalcount: TourMasterData.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.gettourdatabycompanyid = async (req, res, next) => {
  try {
    let {
      limit,
      page,
      companyMasterID,
      branchMasterID,
      departmentid,
      designationid,
      userMasterID,
      startdate,
      enddate,
      Export,
    } = await req.body;

    if (!companyMasterID) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.ValidParameters,
      });
    }

    const paginationQuery = {};
    if (page && limit && !Export) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    let maindata = [];
    const condition = {};
    condition.status = 1;
    if (startdate && enddate) {
      condition.FromDate = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
      condition.ToDate = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
    }

    if (userMasterID) condition.UserMasterID = userMasterID;
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows: usermaster, count } = await toursMaster.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      include: [
        {
          model: UserMaster,
          as: 'assign',
          where: {
            companyMasterId: companyMasterID,
            status: 1,
            ...userAccessCondition.where,
          },
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeDesignation,
              where: {
                status: 1,
                ...(designationid &&
                  (!Array.isArray(designationid) || designationid.length) && {
                    designationID: designationid,
                  }),
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: designationid && designationid.length ? true : false,
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
                ...(departmentid &&
                  (!Array.isArray(departmentid) || departmentid.length) && {
                    departmentID: departmentid,
                  }),
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: departmentid && departmentid.length ? true : false,
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
                ...(branchMasterID &&
                  (!Array.isArray(branchMasterID) || branchMasterID.length) && {
                    branchID: branchMasterID,
                  }),
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
              required: branchMasterID && branchMasterID.length ? true : false,
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
      ],
      order: [['FromDate', 'DESC']],
    });
    const uniqueCoPersonIds = new Set(); // Collect unique IDs

    for (let j = 0; j < usermaster.length; j++) {
      if (usermaster[j].CoPersonId) {
        usermaster[j].CoPersonId.forEach((id) => uniqueCoPersonIds.add(id));
      }
    }

    // If needed, convert Set to array
    const uniqueCoPersonIdArray = Array.from(uniqueCoPersonIds);
    const findallUserData = await UserMaster.findAll({
      where: {
        userMasterID: uniqueCoPersonIdArray,
      },
      attributes: userAttributes,
    });

    for (let n = 0; n < usermaster.length; n++) {
      let coper = [];
      let isAssigned = false;

      usermaster[n].setDataValue(
        'isApprovedByAny',
        usermaster[n].tourAuth?.some((auth) => Number(auth.authStatus) == 1) ||
          false,
      );

      if (usermaster[n].CoPersonId) {
        for (let k = 0; k < usermaster[n].CoPersonId.length; k++) {
          const findUser = findallUserData.find(
            (user) => user.userMasterID === +usermaster[n].CoPersonId[k],
          );
          coper.push(findUser.displayName + '(' + findUser.userNumber + ')');
        }
      }

      const data = {
        Employee: usermaster[n].assign?.displayName || '',
        Number: usermaster[n].assign?.userNumber || '',
        Branch:
          usermaster[n].assign?.employeeBranches?.[0]?.branchMaster
            ?.branchName || '',
        Department:
          usermaster[n].assign?.employeeDepartments?.[0]?.department
            ?.departmentName || '',
        Designation:
          usermaster[n].assign?.employeeDesignations?.[0]?.designation
            ?.designationName || '',
        TourName: usermaster[n].ToursName,
        TourFromDate:
          String(usermaster[n].FromDate)?.split('-').reverse().join('-') || '',
        TourEndDate:
          String(usermaster[n].ToDate)?.split('-').reverse().join('-') || '',
        TotalDays: usermaster[n].TotalDays,
        Coperson: coper.join(','),
      };

      if (!Export) {
        data.TourID = usermaster[n].ToursMasterID;
        data.UserId = usermaster[n].UserMasterID;
        data.authorizationStatus = usermaster[n].authorizationStatus;
        data.isApprovedByAny = usermaster[n].getDataValue('isApprovedByAny');
      } else {
        data.status = usermaster[n].authorizationStatus;
        data.authorizers = usermaster[n].tourAuth;
        data.authorizersCriteria =
          usermaster[n].AuthorizationCriteriaMaster?.AuthorizationCriteria;
      }
      maindata.push(data);
    }

    if (Export)
      return await generateExcelWithAuthorizers(
        maindata,
        'Tour Report',
        'xlsx',
        res,
      );

    return res.status(200).json({
      status: 200,
      data: maindata,
      totalcount: count,
    });
  } catch (err) {
    next(err.message);
  }
};

exports.getApprovedUserID = async (req, res, next) => {
  try {
    const { limit, page, searchQuery, startdate, enddate, Export } =
      await req.body;
    const userMasterID = req.userDetails.userMasterId;
    const paginationQuery = {};
    if (page && limit && !Export) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const condition = { UserMasterID: userMasterID, status: [1] };

    if (!page && !limit && !Export) {
      condition.authorizationStatus = 3;
    }

    if (startdate && enddate) {
      condition[Sequelize.Op.and] = [
        {
          FromDate: { [Sequelize.Op.lte]: enddate },
        },
        {
          ToDate: { [Sequelize.Op.gte]: startdate },
        },
      ];
    }

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          ToursName: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' },
        },
      ];
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const TourMasterData = await toursMaster.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      order: [
        ['createdAt', 'DESC'],
        ['FromDate', 'ASC'],
      ],
      include: [
        {
          model: UserMaster,
          as: 'assign',
          required: true,
          where: { ...userAccessCondition.where },
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeDesignation,
              where: {
                status: 1,
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
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
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
                  { endDate: { [Sequelize.Op.eq]: null } },
                ],
              },
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
                applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
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
          as: 'createByUser',
          attributes: ['displayName'],
        },
        {
          model: UserMaster,
          as: 'updateByUser',
          attributes: ['displayName'],
        },
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
      ],
    });

    for (var j = 0; j < TourMasterData.rows.length; j++) {
      TourMasterData.rows[j].setDataValue(
        'isApprovedByAny',
        TourMasterData.rows[j].tourAuth?.some(
          (auth) => Number(auth.authStatus) == 1,
        ) || false,
      );
      if (TourMasterData.rows[j].CoPersonId != null) {
        for (var k = 0; k < TourMasterData.rows[j].CoPersonId.length; k++) {
          let copersonuser = await UserMaster.findOne({
            where: {
              userMasterID: Number(TourMasterData.rows[j].CoPersonId[k]),
            },
            attributes: ['userMasterID', 'displayName', 'userNumber'],
          });
          TourMasterData.rows[j].CoPersonId[k] = copersonuser;
        }
      }
    }

    if (Export) {
      const maindata = TourMasterData.rows.map((row) => ({
        Employee: row.assign?.displayName || '',
        Number: row.assign?.userNumber || '',
        Branch:
          row.assign?.employeeBranches?.[0]?.branchMaster?.branchName || '',
        Department:
          row.assign?.employeeDepartments?.[0]?.department?.departmentName ||
          '',
        Designation:
          row.assign?.employeeDesignations?.[0]?.designation?.designationName ||
          '',
        TourName: row.ToursName,
        TourFromDate:
          String(row.FromDate)?.split('-').reverse().join('-') || '',
        TourEndDate: String(row.ToDate)?.split('-').reverse().join('-') || '',
        TotalDays: row.TotalDays,
        Coperson: (row.CoPersonId || [])
          .filter(Boolean)
          .map((u) => `${u.displayName}(${u.userNumber})`)
          .join(','),
        status: row.authorizationStatus,
        authorizers: row.tourAuth,
        authorizerCriteria:
          row?.AuthorizationCriteriaMaster?.AuthorizationCriteria,
      }));

      return await generateExcelWithAuthorizers(
        maindata,
        'Tour Master',
        'xlsx',
        res,
      );
    }

    return res.status(200).json({
      status: 200,
      data: TourMasterData.rows,
      totalcount: TourMasterData.count,
    });
  } catch (err) {
    next(err);
  }
};
