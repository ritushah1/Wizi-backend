const Sequelize = require('sequelize');
const message = require('../response_message/message');
const companyMaster = require('../models/companyMaster');
const path = require('path');
const readXlsxFile = require('read-excel-file/node');
const fs = require('fs');
const sequelize = require('../config/database');
const { generateExcel } = require('../utils/exportData');
const UserMaster = require('../models/userMaster');
const moment = require('moment');
const ManPowerRequisitionRequest = require('../models/manPowerRequisitionRequest');
const AuthorizationMaster = require('../models/authorizationMaster');
const {
  authorizationMasterTypes,
  notificationTitleTypes,
  notificationScreentTypes,
  AuthStatusInAuthorizationRequest,
  authorizationCriteriaType,
} = require('../utils/dbUtils');
const FormAuthorizationDetails = require('../models/AuthorizationDetails');
const ManPowerRequisitionAuthorization = require('../models/manPowerRequisitionAuthorization');
const userMasterService = require('../services/userMasterService');
const UserInbox = require('../models/UserInbox');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const { sendBulkNotification } = require('../utils/commonUtilFunctions');
const Department = require('../models/department');
const Designation = require('../models/designation');
const BranchMaster = require('../models/branchMaster');
const Division = require('../models/division');
const WorkingArea = require('../models/workingArea');
const CityMaster = require('../models/citymaster');
const StateMaster = require('../models/statemaster');

exports.getAllManPowerRequisitionRequest = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      search,
      companyMasterID,
      departmentId,
      designationID,
      devisionID,
      workingAreaID,
      branchID,
      isExport,
      status,
      isJobPosting,
    } = req.body;

    const condition = {
      status: [0, 1],
      companyMasterID: companyMasterID,
      createBy: req.userDetails.userMasterId,
    };

    if (search) {
      condition[Sequelize.Op.or] = [
        {
          jobTitle: {
            [Sequelize.Op.iLike]: `%${search}%`,
          },
        },
      ];
    }

    if (departmentId) condition.departmentID = departmentId;
    if (branchID) condition.branchID = branchID;
    if (designationID) condition.designationID = designationID;
    if (devisionID) condition.devisionID = devisionID;
    if (workingAreaID) condition.workingAreaID = workingAreaID;
    if (status) condition.authorizationStatus = status;
    if (isJobPosting) condition.jobPostId = null;
    const paginationQuery = {};
    if (!isExport && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const { rows: manPowerRequisitionRequestData, count } =
      await ManPowerRequisitionRequest.findAndCountAll({
        where: condition,
        distinct: true,
        ...paginationQuery,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: UserMaster,
            as: 'createdBy',
            attributes: ['displayName'],
          },
          {
            model: UserMaster,
            as: 'updatedBy',
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
            model: ManPowerRequisitionAuthorization,
            as: 'manPowerAuth',
            attributes: ['authStatus'],
          },
          {
            model: StateMaster,
            attributes: ['stateName'],
          },
          {
            model: UserMaster,
            as: 'reportToEmp',
            attributes: ['displayName'],
          },
          {
            model: UserMaster,
            as: 'replacedEmp',
            attributes: ['displayName'],
          },
          {
            model: UserMaster,
            as: 'requestedBy',
            attributes: ['displayName'],
          },
        ],
      });

    if (isExport) {
      const cityIds = [
        ...new Set(
          manPowerRequisitionRequestData.flatMap(
            (item) => item.workingCity || [],
          ),
        ),
      ];
      const cities = await CityMaster.findAll({
        where: {
          cityMasterID: cityIds,
        },
        attributes: ['cityMasterID', 'cityName'],
      });
      const cityMap = {};

      cities.forEach((city) => {
        cityMap[city.cityMasterID] = city.cityName;
      });
      const finalData = manPowerRequisitionRequestData.map((e) => ({
        'Company Name': e.companyMaster?.companyName || '',

        'Authorization Status':
          e.authorizationStatus == 3
            ? 'Approved'
            : e.authorizationStatus == 4
              ? 'Rejected'
              : 'Pending',

        'Job Title': e.jobTitle || '',

        'Branch Name': e.branchMaster?.branchName || '',

        'Department Name': e.department?.departmentName || '',

        'Designation Name': e.designation?.designationName || '',

        'Division Name': e.division?.divisionName || '',

        'Working Area': e.workingArea?.workingAreaName || '',

        'Working State': e.stateMaster?.stateName || '',

        'Working Cities': (e.workingCity || [])
          .map((id) => cityMap[id])
          .filter(Boolean)
          .join(', '),

        'Type Of Requirement':
          e.typeOfRequirement == 'replacement' ? 'Replacement' : 'New Hire',

        'Previous Employee': e.replacedEmp?.displayName || '',

        'Previous Employee CTC': e.previousEmpCTC || '',

        'Employment Type': e.employmentType || '',

        'Travel Required': e.isTravelRequired ? 'Yes' : 'No',

        'CTC From': e.ctcFrom || '',

        'CTC To': e.ctcTo || '',

        'Experience From': e.expFrom || '',

        'Experience To': e.expTo || '',

        'Report To': e.reportToEmp?.displayName || '',

        'Requested By': e.requestedBy?.displayName || '',

        Grade: e.Grade || '',

        Remarks: e.remarks || '',

        'Created By': e.createdBy?.displayName || '',

        'Created At': formatDate(e.createdAt),
      }));

      return await generateExcel(
        finalData,
        'ManPowerRequisitionRequest',
        'xlsx',
        res,
      );
    }

    return res.status(200).json({
      status: 200,
      data: manPowerRequisitionRequestData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

const formatDate = (date) => {
  if (!date) return '';

  return new Date(date).toLocaleDateString('en-GB');
};

exports.postAddManPowerRequisitionRequest = async (req, res, next) => {
  try {
    const {
      jobTitle,
      companyMasterID,
      branchID,
      departmentID,
      designationID,
      devisionID,
      workingAreaID,
      typeOfRequirement,
      employmentType,
      reportTo,
      isTravelRequired,
      Grade,
      workingCity,
      workingState,
      vendorToHandle,
      ctcFrom,
      ctcTo,
      expFrom,
      expTo,
      previousEmp,
      previousEmpCTC,
      remarks,
    } = req.body;

    if (!jobTitle) {
      return res.status(404).json({
        status: 404,
        message: message.usermessage.notFoundMessage('job Title'),
      });
    }

    if (!departmentID) {
      return res.status(404).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Department'),
      });
    }

    if (typeOfRequirement === 'replacement' && previousEmp) {
      const replacedEmpData = await ManPowerRequisitionRequest.findOne({
        where: {
          previousEmp: previousEmp,
        },
      });

      if (replacedEmpData) {
        return res.status(200).json({
          status: 400,
          message:
            'Previous Employee is already added in another Manpower Requisition Request',
        });
      }
    }

    const iosTokens = [];
    const androidTokens = [];
    let userData;

    const authorizationmaster = await AuthorizationMaster.findOne({
      where: {
        authorizationMasterID: authorizationMasterTypes.manPowerRequisition,
      },
    });

    if (!authorizationmaster)
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Authorization Master'),
      });

    const authorizationdetails = await FormAuthorizationDetails.findOne({
      attributes: [
        'AuthorizationMasterID',
        'AuthorizationCriteriaID',
        'AuthorizedByUserMasterId',
      ],
      where: {
        AuthorizationMasterID: authorizationmaster.authorizationMasterID,
        userMasterID: req.userDetails.userMasterId,
        status: 1,
      },
      raw: true,
    });

    if (!authorizationdetails) {
      const insert_db_status = await ManPowerRequisitionRequest.create(
        {
          jobTitle,
          companyMasterID,
          branchID,
          departmentID,
          designationID,
          devisionID,
          workingAreaID,
          typeOfRequirement,
          employmentType,
          reportTo,
          isTravelRequired,
          Grade,
          workingCity,
          workingState,
          vendorToHandle,
          ctcFrom,
          ctcTo,
          expFrom,
          expTo,
          previousEmp,
          previousEmpCTC,
          remarks,
          userMasterID: req.userDetails.userMasterId,
        },
        { user: req.userDetails },
      );
      return res.status(200).json({
        status: 200,
        message: message.usermessage.addMessage('Manpower Requisition Request'),
      });
    }

    const AuthorizationCriterias = await AuthorizationCriteriaMaster.findOne({
      attributes: ['AuthorizationCriteriaID', 'AuthorizationCriteria'],
      where: {
        AuthorizationCriteriaID: authorizationdetails.AuthorizationCriteriaID,
        status: 1,
      },
      raw: true,
    });

    await sequelize.transaction(async (t) => {
      const insert_db_status = await ManPowerRequisitionRequest.create(
        {
          jobTitle,
          companyMasterID,
          branchID,
          departmentID,
          designationID,
          devisionID,
          workingAreaID,
          typeOfRequirement,
          employmentType,
          reportTo,
          authCriteriaID: AuthorizationCriterias.AuthorizationCriteriaID,
          isTravelRequired,
          Grade,
          workingCity,
          workingState,
          vendorToHandle,
          ctcFrom,
          ctcTo,
          expFrom,
          expTo,
          previousEmp,
          previousEmpCTC,
          remarks,
          userMasterID: req.userDetails.userMasterId,
        },
        { user: req.userDetails, transaction: t },
      );

      const manPowerRequisitionAuthorizationObject = [];
      const authorizePersonsIDs = [];
      for (const userId of authorizationdetails.AuthorizedByUserMasterId) {
        manPowerRequisitionAuthorizationObject.push({
          manPowerRequisitionID: insert_db_status.manPowerRequisitionID,
          userMasterID: userId,
          status: 1,
          authstatus: AuthStatusInAuthorizationRequest.PENDING,
          createBy: req.userDetails.userMasterId,
          createByIp: req.userDetails.userIpAddress,
        });

        authorizePersonsIDs.push(userId);
        if (
          AuthorizationCriterias.AuthorizationCriteriaID ==
          authorizationCriteriaType.SEQUENCENO
        ) {
          break;
        }
      }

      const resignationAuthorizationCreateData =
        await ManPowerRequisitionAuthorization.bulkCreate(
          manPowerRequisitionAuthorizationObject,
          {
            transaction: t,
          },
        );

      const authorizeUserData = await userMasterService.getMultipleUserData(
        ['userMasterID', 'displayName', 'firebaseToken', 'deviceType'],
        {
          userMasterID: {
            [Sequelize.Op.in]: [
              ...authorizePersonsIDs,
              req.userDetails.userMasterId,
            ],
          },
        },
      );

      authorizeUserData.forEach((user) => {
        if (authorizePersonsIDs.includes(user.userMasterID)) {
          if (user.deviceType === 'ios' && user.firebaseToken) {
            iosTokens.push(user.firebaseToken);
          } else if (user.deviceType === 'android' && user.firebaseToken) {
            androidTokens.push(user.firebaseToken);
          }
        }
        if (req.userDetails.userMasterId == user.userMasterID) {
          userData = user;
        }
      });

      payload = {
        notification: {
          title: notificationTitleTypes.MANPOWERREQUISITION,
          body: `${userData.displayName} applied for Manpower Requisition`,
        },
        data: {
          screen: notificationScreentTypes.MANPOWERREQUISITION,
        },
      };

      //authorization inbox create
      let userInboxArray = [];
      resignationAuthorizationCreateData.forEach((item) => {
        userInboxArray.push({
          activityTable: ManPowerRequisitionAuthorization.getTableName(),
          activityTablePK: item.manPowerRequisitionAuthorizationID,
          message: `${userData.displayName} has applied for Manpower Requisition.`,
          assignedTo: item.userMasterID,
          assignedBy: req.userDetails.userMasterId,
        });
      });

      await UserInbox.bulkCreate(userInboxArray, { transaction: t });
    });

    if (iosTokens.length > 0) {
      sendBulkNotification(iosTokens, payload, 'ios');
    }

    if (androidTokens.length > 0) {
      sendBulkNotification(androidTokens, payload, 'android');
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Manpower Requisition Request'),
    });
  } catch (err) {
    next(err);
  }
};

exports.getManPowerRequisitionRequestById = async (req, res, next) => {
  try {
    const { manPowerRequisitionID } = req.body;

    if (!manPowerRequisitionID) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: message.usermessage.notFoundMessage('Manpower Requisition ID'),
      });
    }

    let get_one_data = await ManPowerRequisitionRequest.findOne({
      where: {
        manPowerRequisitionID: manPowerRequisitionID,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          model: UserMaster,
          as: 'reportToEmp',
          attributes: ['companyMasterId', 'userMasterID'],
        },
        {
          model: StateMaster,
          attributes: ['stateMasterID', 'countryMasterID'],
        },
      ],
    });

    if (!get_one_data) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: message.usermessage.notFoundMessage('Manpower Requisition'),
      });
    }

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateManPowerRequisitionRequest = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      manPowerRequisitionID,
      jobTitle,
      companyMasterID,
      branchID,
      departmentID,
      designationID,
      devisionID,
      workingAreaID,
      typeOfRequirement,
      employmentType,
      reportTo,
      isTravelRequired,
      Grade,
      workingCity,
      workingState,
      vendorToHandle,
      ctcFrom,
      ctcTo,
      expFrom,
      expTo,
      previousEmp,
      previousEmpCTC,
      remarks,
    } = req.body;

    const iosTokens = [];
    const androidTokens = [];
    let userData;

    const manPowerRequisitionRequest =
      await ManPowerRequisitionRequest.findByPk(manPowerRequisitionID);

    if (!manPowerRequisitionRequest) {
      await transaction.rollback();

      return res.status(404).json({
        status: 404,
        message: message.usermessage.notFoundMessage(
          'Manpower Requisition Request',
        ),
      });
    }

    if (typeOfRequirement === 'replacement' && previousEmp) {
      const replacedEmpData = await ManPowerRequisitionRequest.findOne({
        where: {
          previousEmp: previousEmp,
          [Sequelize.Op.not]: { manPowerRequisitionID: manPowerRequisitionID },
        },
      });

      if (replacedEmpData) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message:
            'Previous Employee is already added in another Manpower Requisition Request',
        });
      }
    }

    // if (jobTitle) manPowerRequisitionRequest.jobTitle = jobTitle;
    // if (departmentID) manPowerRequisitionRequest.departmentID = departmentID;

    // await manPowerRequisitionRequest.save({ transaction });
    const authorizationmaster = await AuthorizationMaster.findOne({
      where: {
        authorizationMasterID: authorizationMasterTypes.manPowerRequisition,
      },
    });
    const authorizationdetails = await FormAuthorizationDetails.findOne({
      attributes: [
        'AuthorizationMasterID',
        'AuthorizationCriteriaID',
        'AuthorizedByUserMasterId',
      ],
      where: {
        AuthorizationMasterID: authorizationmaster.authorizationMasterID,
        userMasterID: req.userDetails.userMasterId,
        status: 1,
      },
      raw: true,
    });
    const AuthorizationCriterias = await AuthorizationCriteriaMaster.findOne({
      attributes: ['AuthorizationCriteriaID', 'AuthorizationCriteria'],
      where: {
        AuthorizationCriteriaID: authorizationdetails.AuthorizationCriteriaID,
        status: 1,
      },
      raw: true,
    });

    await ManPowerRequisitionRequest.update(
      {
        jobTitle,
        companyMasterID,
        branchID,
        departmentID,
        designationID,
        devisionID: devisionID ? devisionID : null,
        workingAreaID: workingAreaID ? workingAreaID : null,
        typeOfRequirement,
        employmentType,
        reportTo: reportTo ? reportTo : null,
        isTravelRequired,
        Grade,
        workingCity,
        authCriteriaID: AuthorizationCriterias.AuthorizationCriteriaID,
        workingState: workingState ? workingState : null,
        vendorToHandle,
        ctcFrom,
        ctcTo,
        expFrom,
        expTo,
        previousEmp: previousEmp ? previousEmp : null,
        previousEmpCTC,
        remarks,
      },
      {
        where: {
          manPowerRequisitionID: manPowerRequisitionID,
        },
        user: req.userDetails,
        transaction,
      },
    );

    const resignationAuthorizationIDS =
      await ManPowerRequisitionAuthorization.findAll({
        attributes: ['manPowerRequisitionAuthorizationID'],
        where: { manPowerRequisitionID: manPowerRequisitionID },
        raw: true,
      }).then((rows) => rows.map((r) => r.manPowerRequisitionAuthorizationID));

    await UserInbox.destroy({
      where: {
        activityTable: ManPowerRequisitionAuthorization.getTableName(),
        activityTablePK: {
          [Sequelize.Op.in]: resignationAuthorizationIDS,
        },
      },
      transaction,
    });

    await ManPowerRequisitionAuthorization.destroy({
      where: {
        manPowerRequisitionAuthorizationID: {
          [Sequelize.Op.in]: resignationAuthorizationIDS,
        },
      },
      transaction,
    });

    if (authorizationmaster) {
      const authorizationdetails = await FormAuthorizationDetails.findOne({
        attributes: [
          'AuthorizationMasterID',
          'AuthorizationCriteriaID',
          'AuthorizedByUserMasterId',
        ],
        where: {
          AuthorizationMasterID: authorizationmaster.authorizationMasterID,
          userMasterID: manPowerRequisitionRequest.userMasterID,
          status: 1,
        },
        raw: true,
      });

      if (authorizationdetails) {
        const manpowerRequisitionAuthorizationObject = [];
        const authorizePersonsIDs = [];
        for (const userId of authorizationdetails.AuthorizedByUserMasterId) {
          manpowerRequisitionAuthorizationObject.push({
            manPowerRequisitionID: manPowerRequisitionID,
            userMasterID: userId,
            status: 1,
            authstatus: AuthStatusInAuthorizationRequest.PENDING,
            createBy: req.userDetails.userMasterId,
            createByIp: req.userDetails.userIpAddress,
          });

          authorizePersonsIDs.push(userId);
          if (
            AuthorizationCriterias.AuthorizationCriteriaID ==
            authorizationCriteriaType.SEQUENCENO
          ) {
            break;
          }
        }

        const resignationAuthorizationCreateData =
          await ManPowerRequisitionAuthorization.bulkCreate(
            manpowerRequisitionAuthorizationObject,
            { transaction },
          );

        const authorizeUserData = await userMasterService.getMultipleUserData(
          ['userMasterID', 'displayName', 'firebaseToken', 'deviceType'],
          {
            userMasterID: {
              [Sequelize.Op.in]: [
                ...authorizePersonsIDs,
                manPowerRequisitionRequest.userMasterID,
              ],
            },
          },
        );

        authorizeUserData.forEach((user) => {
          if (authorizePersonsIDs.includes(user.userMasterID)) {
            if (user.deviceType === 'ios' && user.firebaseToken) {
              iosTokens.push(user.firebaseToken);
            } else if (user.deviceType === 'android' && user.firebaseToken) {
              androidTokens.push(user.firebaseToken);
            }
          }
          if (manPowerRequisitionRequest.userMasterID == user.userMasterID) {
            userData = user;
          }
        });

        payload = {
          notification: {
            title: notificationTitleTypes.MANPOWERREQUISITION,
            body: `${userData.displayName} applied for Manpower Requisition`,
          },
          data: {
            screen: notificationScreentTypes.MANPOWERREQUISITION,
          },
        };

        //authorization inbox create
        let userInboxArray = [];
        resignationAuthorizationCreateData.forEach((item) => {
          userInboxArray.push({
            activityTable: ManPowerRequisitionAuthorization.getTableName(),
            activityTablePK: item.manPowerRequisitionAuthorizationID,
            message: `${userData.displayName} has applied for Manpower Requisition.`,
            assignedTo: item.userMasterID,
            assignedBy: manPowerRequisitionRequest.userMasterID,
          });
        });

        await UserInbox.bulkCreate(userInboxArray, { transaction });
      }
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
      message: message.usermessage.updateMessage(
        'Manpower Requisition Request',
      ),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postDeleteManPowerRequisitionRequestById = async (req, res, next) => {
  try {
    const { manPowerRequisitionID } = await req.body;

    let result = await sequelize.transaction(async (t) => {
      const manpowerRequisitionAuthorizationRequest =
        await ManPowerRequisitionAuthorization.findAll({
          raw: true,
          where: { manPowerRequisitionID: manPowerRequisitionID },
          attributes: ['manPowerRequisitionAuthorizationID'],
          transaction: t,
        });

      let AuthorizationRequestIds = manpowerRequisitionAuthorizationRequest.map(
        (form) => form.manPowerRequisitionAuthorizationID,
      );

      await UserInbox.destroy(
        {
          where: {
            activityTable: ManPowerRequisitionAuthorization.getTableName(),

            activityTablePK: AuthorizationRequestIds,
          },
        },
        { transaction: t },
      );

      await ManPowerRequisitionAuthorization.destroy({
        where: { manPowerRequisitionID },
        individualHooks: true,
        user: req.userDetails,
      });

      await ManPowerRequisitionRequest.destroy({
        where: { manPowerRequisitionID },
        individualHooks: true,
        user: req.userDetails,
      });
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Manpower Requisition'),
    });
  } catch (err) {
    next(err);
  }
};
