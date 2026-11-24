const Sequelize = require('sequelize');
const UserMasterModel = require('../models/userMaster');
const Visit = require('../models/visit');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const CompanyMasterModel = require('../models/companyMaster');
const customer = require('../models/customer');
const UserMaster = require('../models/userMaster');
const product = require('../models/product');
const visitPurpose = require('../models/visitPurpose');
const VisitFormCustomizeFieldValueModel = require('../models/visitformcustomizevalue');
const VisitFormCustomize = require('../models/visitformcustomize');
const VisitReportCustomize = require('../models/visitreportcustomize');
const visitFormCustomizeValues = require('../models/visitformcustomizevalue');
const {
  sendNotification,
  asiaKolkataDateTime,
  findAuthorizationDetails,
} = require('../utils/commonUtilFunctions');
const Customer = require('../models/customer');
const Product = require('../models/product');
const VisitPurpose = require('../models/visitPurpose');
const googleSheetIntegration = require('../controllers/googleSheetIntegration.controller');
const CityMaster = require('../models/citymaster');
const StateMaster = require('../models/statemaster');
const CountryMaster = require('../models/countrymaster');
const VisitReportCustomizeValue = require('../models/visitreportcustomizevalue');
const { userAttributes } = require('../utils/commonVars');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const { generateExcelForVisitReport } = require('../utils/exportData');
const moment = require('moment');
const VisitReportMaster = require('../models/visitReportMaster');
const CustomerIndustry = require('../models/customerIndustry');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const GoogleSheetIntegration = require('../models/googleSheetIntegration');
const Excel = require('exceljs');
const { mainApiUrl } = require('../utils/labelUtils');
const {
  authorizationMasterTypes,
  notificationTitleTypes,
  notificationScreentTypes,
  AuthorizationStatusType,
  authorizationCriteriaType,
} = require('../utils/dbUtils');
const VisitAuthorization = require('../models/visitAuthorization');
const UserInbox = require('../models/UserInbox');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeDivision = require('../models/employeeDivision');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const Division = require('../models/division');
const WorkingArea = require('../models/workingArea');
const AuthorizationCriteriaMaster = require('../models/authorizationCriteriaMaster');
const VisitProduct = require('../models/visitProduct');
const PurposeOfVisit = require('../models/purposeOfVisit');

exports.postAddVisit = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      customerID,
      assignID,
      coPersonID,
      visitPurposeID,
      productID,
      visitDate,
      visitTime,
      checkInDateTime,
      checkInLatitude,
      checkInLongitude,
      checkInLocation,
      checkOutDateTime,
      checkOutLatitude,
      checkOutLongitude,
      checkOutLocation,
      visitStatus,
      companyMasterID,
      customfieldvalue,
    } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const authorizationDetails = await findAuthorizationDetails(
      authorizationMasterTypes.visit,
      assignID,
    );
    const authorizationStatus = authorizationDetails
      ? +authorizationDetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO
        ? AuthorizationStatusType.PEDING_TWO
        : AuthorizationStatusType.PEDING_ONE
      : AuthorizationStatusType.APPROVED;
    let insert_db_status = await Visit.create(
      {
        customerID,
        assignID,
        coPersonID,
        visitDate,
        visitTime,
        checkInDateTime,
        checkInLatitude,
        checkInLongitude,
        checkInLocation,
        checkOutDateTime,
        checkOutLatitude,
        checkOutLongitude,
        checkOutLocation,
        visitStatus,
        companyMasterID,
        createBy,
        createByIp,
        authorizationStatus,
        AuthorizationCriteriaID: authorizationDetails
          ? authorizationDetails.AuthorizationCriteriaID
          : null,
      },
      { transaction: transaction },
    );
    const productIDs = productID
      ? Array.isArray(productID)
        ? productID
        : [productID]
      : [];
    const visitPurposeIDs = visitPurposeID
      ? Array.isArray(visitPurposeID)
        ? visitPurposeID
        : [visitPurposeID]
      : [];
    const createPromises = [];
    if (productIDs.length) {
      createPromises.push(
        VisitProduct.bulkCreate(
          productIDs.map((item) => ({
            productID: item,
            visitID: insert_db_status.visitID,
          })),
          {
            user: req.userDetails,
            individualHooks: true,
            transaction,
          },
        ),
      );
    }
    if (visitPurposeIDs.length) {
      createPromises.push(
        PurposeOfVisit.bulkCreate(
          visitPurposeIDs.map((item) => ({
            visitPurposeID: item,
            visitID: insert_db_status.visitID,
          })),
          {
            user: req.userDetails,
            individualHooks: true,
            transaction,
          },
        ),
      );
    }
    await Promise.all(createPromises);
    if (
      authorizationDetails &&
      authorizationStatus != AuthorizationStatusType.APPROVED
    ) {
      // user Details
      const userDetails = await UserMaster.findOne({
        where: {
          userMasterID: assignID,
        },
      });

      if (!userDetails) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: message.usermessage.notFoundMessage('User'),
        });
      }

      // For Sequence No
      if (+authorizationStatus == AuthorizationStatusType.PEDING_TWO) {
        const authorizationData = await VisitAuthorization.create(
          {
            visitID: insert_db_status.visitID,
            userMasterID: authorizationDetails.AuthorizedByUserMasterId[0],
            authStatus: 2,
          },
          { user: req.userDetails, transaction: transaction },
        );

        // Create UserInbox
        await UserInbox.create(
          {
            activityTable: VisitAuthorization.getTableName(),
            activityTablePK: authorizationData.toJSON().visitAuthorizationID,
            message: `${userDetails.displayName} has requested a Visit.`,
            assignedTo: authorizationDetails.AuthorizedByUserMasterId[0],
            assignedBy: assignID,
          },
          { transaction },
        );

        const notification = {
          title: notificationTitleTypes.VISIT,
          body: userDetails.displayName + ' requested for a Visit.',
        };
        const data = {
          screen: notificationScreentTypes.VISIT,
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
          const authorizationData = await VisitAuthorization.create(
            {
              visitID: insert_db_status.visitID,
              userMasterID: authorizationDetails.AuthorizedByUserMasterId[j],
              authStatus: 2,
            },
            { user: req.userDetails, transaction: transaction },
          );

          // Create UserInbox
          await UserInbox.create(
            {
              activityTable: VisitAuthorization.getTableName(),
              activityTablePK: authorizationData.toJSON().visitAuthorizationID,
              message: `${userDetails.displayName} has requested a Visit.`,
              assignedTo: authorizationDetails.AuthorizedByUserMasterId[j],
              assignedBy: assignID,
            },
            { user: req.userDetails, transaction: transaction },
          );

          const notification = {
            title: notificationTitleTypes.VISIT,
            body: userDetails.displayName + ' requested for a Visit.',
          };
          const data = {
            screen: notificationScreentTypes.VISIT,
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
    const notification = {
      title: 'Visit',
      body: 'New Visit Assigned To You. Please Check',
    };
    const data = {
      screen: 'visit',
      visitDate: visitDate,
      visitTime: visitTime,
    };
    await sendNotification(assignID, notification, data);
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Visit'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getVisitById = async (req, res, next) => {
  try {
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    let get_one_data = await Visit.findOne({
      where: {
        visitID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          model: VisitProduct,
          as: 'vp',
          include: [{ model: Product, attributes: ['productName'] }],
        },
        {
          model: PurposeOfVisit,
          as: 'pov',
          include: [{ model: VisitPurpose, attributes: ['visitPurpose'] }],
        },
        {
          model: AuthorizationCriteriaMaster,
          as: 'AuthorizationCriteriaMaster',
          attributes: ['AuthorizationCriteria'],
        },
        {
          model: UserMaster,
          as: 'assign',
          attributes: userAttributes,
          include: [
            {
              required: false,
              model: EmployeeDesignation,
              as: 'emp_desig',
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
              as: 'emp_dept',
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
              as: 'emp_branch',
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
              include: [{ model: Division, attributes: ['divisionName'] }],
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
          model: Customer,
          include: {
            model: CityMaster,
            include: {
              model: StateMaster,
              include: {
                model: CountryMaster,
              },
            },
          },
        },
        { model: CompanyMasterModel },
        {
          model: VisitAuthorization,
          as: 'visitAuth',
          include: [
            {
              model: UserMaster,
              as: 'authPerson',
              attributes: ['displayName'],
            },
          ],
        },
      ],
    });

    if (!get_one_data) {
      return res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    } else {
      let coPersonID = get_one_data.coPersonID;
      let get_user_data = await UserMasterModel.findAll({
        where: {
          userMasterID: {
            [Sequelize.Op.in]: coPersonID,
          },
        },
      });
      get_one_data['coPersonID'] = get_user_data;

      const productIDs = get_one_data.vp?.map((item) => item.productID);
      get_one_data['productID'] = productIDs || [];
      const purposeOfVisitIDs = get_one_data.pov?.map(
        (item) => item.visitPurposeID,
      );
      get_one_data['visitPurposeID'] = purposeOfVisitIDs || [];
      return res.status(200).json({ status: 200, data: get_one_data });
    }
  } catch (err) {
    next(err);
  }
};

exports.postUpdateVisit = async (req, res, next) => {
  try {
    const {
      visitID,
      customerID,
      assignID,
      coPersonID,
      visitPurposeID,
      productID,
      visitDate,
      visitTime,
      checkInDateTime,
      checkInLatitude,
      checkInLongitude,
      checkInLocation,
      checkOutDateTime,
      checkOutLatitude,
      checkOutLongitude,
      checkOutLocation,
      visitStatus,
      companyMasterID,
      oldVisitDate,
    } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    const oldDate = oldVisitDate;

    await Visit.update(
      {
        customerID,
        assignID,
        coPersonID,
        visitPurposeID,
        productID,
        visitDate,
        visitTime,
        checkInDateTime,
        checkInLatitude,
        checkInLongitude,
        checkInLocation,
        checkOutDateTime,
        checkOutLatitude,
        checkOutLongitude,
        checkOutLocation,
        visitStatus,
        companyMasterID,
        updateBy,
        updateByIp,
      },
      {
        where: { visitID },
      },
    );

    const findVisit = await Visit.findOne({ where: { visitID } });
    if (findVisit && findVisit.checkInDateTime && findVisit.checkOutDateTime) {
      const checkInDateTime = new Date(findVisit.checkInDateTime);
      const checkOutDateTime = new Date(findVisit.checkOutDateTime);
      const diffMs = checkOutDateTime - checkInDateTime;
      const diffMinutes = diffMs / (1000 * 60);
      const formattedMinutes = diffMinutes.toFixed(2);
      await Visit.update(
        {
          visitMinutes: formattedMinutes,
          updateBy,
          updateByIp,
        },
        {
          where: { visitID },
        },
      );
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Visit'),
    });
  } catch (err) {
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  try {
    let { visitID, status } = req.body;
    await Visit.update(
      {
        status: status,
      },
      {
        where: { visitID: visitID, status: ['1', '0'] },
      },
    );

    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Status')
          : message.usermessage.deactiveMessage('Status'),
    });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteVisitById = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    let { visitID, companyMasterID, visitDate } = req.body;
    const visitRecord = await Visit.findOne({ where: { visitID } });
    const visitAuthorizationDetails = await VisitAuthorization.findAll({
      where: { visitID },
    });
    const allAuthorizationID = visitAuthorizationDetails.map(
      (item) => item.visitAuthorizationID,
    );
    if (allAuthorizationID.length > 0) {
      await UserInbox.destroy({
        where: {
          activityTable: VisitAuthorization.getTableName(),
          activityTablePK: { [Sequelize.Op.in]: allAuthorizationID },
        },
        transaction,
      });
    }
    await Visit.update(
      {
        status: 2,
      },
      {
        where: { visitID },
        transaction,
      },
    );

    if (visitRecord) {
      googleSheetIntegration
        .deleteVisitRecord(
          visitRecord.companyMasterID,
          visitID,
          visitRecord.visitDate,
        )
        .catch((err) => {
          console.error('Google Sheet deleteRecord failed:', err);
        });
    }
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Visit'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getVisitByCompanyId = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      searchQuery,
      startdate,
      enddate,
      userMasterID,
      exportData,
    } = await req.body;
    const condition = {};
    condition.status = [0, 1];

    if (startdate && enddate)
      condition.visitDate = {
        [Sequelize.Op.between]: [startdate, enddate],
      };

    if (searchQuery) {
      condition[Sequelize.Op.and] = [
        {
          [Sequelize.Op.or]: [
            {
              '$assign.firstName$': {
                [Sequelize.Op.iLike]: '%' + searchQuery + '%',
              },
            },
            {
              '$visitPurpose.visitPurpose$': {
                [Sequelize.Op.iLike]: '%' + searchQuery + '%',
              },
            },
            {
              '$customer.customerName$': {
                [Sequelize.Op.iLike]: '%' + searchQuery + '%',
              },
            },
            {
              '$companyMaster.companyName$': {
                [Sequelize.Op.iLike]: '%' + searchQuery + '%',
              },
            },
          ],
        },
        {
          [Sequelize.Op.or]: [
            { assignID: userMasterID },
            { createBy: userMasterID },
          ],
        },
      ];
    } else {
      condition[Sequelize.Op.or] = [
        { assignID: userMasterID },
        { createBy: userMasterID },
      ];
    }

    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [
      ['visitDate', 'DESC'],
      ['visitID', 'DESC'],
    ];
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const { rows: visitData, count } = await Visit.findAndCountAll({
      distinct: true,
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          required: false,
          model: CompanyMasterModel,
          attributes: ['companyName', 'companyAddress'],
        },
        {
          required: false,
          model: customer,
          attributes: [
            'companyName',
            'customerName',
            'currentLocation',
            'mobileNumber1',
          ],
          include: [
            {
              model: CustomerIndustry,
              as: 'ci',
              required: false,
              attributes: ['name'],
            },
          ],
        },
        {
          required: false,
          model: visitPurpose,
          attributes: ['visitPurposeID', 'visitPurpose', 'companyMasterID'],
        },
        {
          required: false,
          model: UserMaster,
          as: 'createdByUserDetails',
          attributes: userAttributes,
        },
        {
          required: false,
          model: UserMaster,
          as: 'updatedByUserDetails',
          attributes: userAttributes,
        },
        {
          required: true,
          model: UserMaster,
          as: 'assign',
          where: { ...userAccessCondition.where },
          attributes: userAttributes,
          include: [
            ...userAccessCondition.includeModels,
            {
              separate: true,
              required: false,
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
          ],
        },
      ],
    });
    const visitCopersonIDs = new Set();
    const visitIDs = new Set();
    for (const visit of visitData) {
      visitIDs.add(visit.visitID);
      for (let person of visit.coPersonID) {
        visitCopersonIDs.add(+person);
      }
    }

    const [
      visitCopersonUserData,
      findVisitCustomizeField,
      findVisitReportCustomizeValues,
      findAllVisitAuthorizationData,
      findAllVisitProduct,
      findAllPurposeOfVisit,
    ] = await Promise.all([
      // visitCopersonUserData
      await UserMaster.findAll({
        where: {
          userMasterID: [...visitCopersonIDs],
        },
      }),
      visitFormCustomizeValues.findAll({
        where: {
          visitID: [...visitIDs],
        },
        include: [
          {
            model: VisitFormCustomize,
            include: [{ model: CompanyMasterModel }],
          },
        ],
        order: [
          [{ model: VisitFormCustomize }, 'index', 'ASC'],
          [{ model: VisitFormCustomize }, 'createdAt', 'ASC'],
        ],
      }),
      VisitReportCustomizeValue.findAll({
        where: {
          visitID: [...visitIDs],
        },
        attributes: ['visitID', 'value'],
        include: [
          {
            required: false,
            model: VisitReportCustomize,
            include: [
              {
                model: VisitReportMaster,
                as: 'vrMaster',
                attributes: [['visitReportName', 'name']],
              },
            ],
          },
        ],
      }),
      VisitAuthorization.findAll({
        where: {
          visitID: [...visitIDs],
        },
        include: [
          {
            model: UserMaster,
            as: 'authPerson',
            attributes: ['displayName'],
          },
        ],
      }),
      VisitProduct.findAll({
        where: {
          visitID: [...visitIDs],
        },
        include: [
          {
            model: Product,
            attributes: ['productName'],
          },
        ],
      }),
      PurposeOfVisit.findAll({
        where: {
          visitID: [...visitIDs],
        },
        include: [
          {
            model: VisitPurpose,
            attributes: ['visitPurpose'],
          },
        ],
      }),
    ]);
    const customizeFieldMap = {};

    findVisitCustomizeField.forEach((item) => {
      const vid = item.visitID;

      if (!customizeFieldMap[vid]) {
        customizeFieldMap[vid] = [];
      }

      customizeFieldMap[vid].push(item);
    });
    const visitReportCustomizeMap = {};
    findVisitReportCustomizeValues.forEach((item) => {
      const vid = item.visitID;
      if (!visitReportCustomizeMap[vid]) {
        visitReportCustomizeMap[vid] = [];
      }
      visitReportCustomizeMap[vid].push(item);
    });
    const visitAuthDataMap = {};
    findAllVisitAuthorizationData.forEach((item) => {
      const vid = item.visitID;
      if (!visitAuthDataMap[vid]) {
        visitAuthDataMap[vid] = [];
      }
      visitAuthDataMap[vid].push(item);
    });
    const visitProductDataMap = {};
    findAllVisitProduct.forEach((item) => {
      const vid = item.visitID;
      if (!visitProductDataMap[vid]) {
        visitProductDataMap[vid] = [];
      }
      visitProductDataMap[vid].push(item);
    });
    const purposeOfVisitDataMap = {};
    findAllPurposeOfVisit.forEach((item) => {
      const vid = item.visitID;
      if (!purposeOfVisitDataMap[vid]) {
        purposeOfVisitDataMap[vid] = [];
      }
      purposeOfVisitDataMap[vid].push(item);
    });
    const allVisitMainData = [];
    for (let visit of visitData) {
      const customizeValues = customizeFieldMap[visit.visitID] || [];
      visit.dataValues.visitFormCustomizeValue = customizeValues;
      const visitAuthData = visitAuthDataMap[visit.visitID] || [];

      visit.dataValues.visitAuth = visitAuthData;
      visit.dataValues.isApprovedOrRejectedByAny =
        visitAuthData?.some(
          (auth) =>
            Number(auth.authStatus) == 1 || Number(auth.authStatus) == 0,
        ) || false;

      const visitReportCustomizeValues =
        visitReportCustomizeMap[visit.visitID] || [];
      visit.dataValues.visitReportCustomizeValues = visitReportCustomizeValues;

      const visitProductData = visitProductDataMap[visit.visitID] || [];
      visit.dataValues.vp = visitProductData;

      const purposeOfVisitData = purposeOfVisitDataMap[visit.visitID] || [];
      visit.dataValues.pov = purposeOfVisitData;
      if (visit.createBy) {
        visit.createById = visit.createBy;
        if (
          visit.assignID == +visit.createBy ||
          +visit.createBy == userMasterID
        ) {
          visit.dataValues.editvisit = true;
        } else {
          visit.dataValues.editvisit = false;
        }
        visit.dataValues.createBy = visit.createdByUserDetails.displayName;
      }

      if (visit.updateBy !== null) {
        visit.dataValues.updateBy = visit.updatedByUserDetails.displayName;
      }
      // Set For Co-Person Name And Number
      const coperson = [];
      for (const person of visit.coPersonID) {
        const user = visitCopersonUserData.find(
          (e) => e.userMasterID == +person,
        );
        coperson.push(user.displayName + '(' + user.userNumber + ')');
      }
      visit.coPersonID = coperson.join();

      let employeeCode = '';
      if (visit.assign) {
        if (
          visit.assign.employeeJoiningDetails &&
          visit.assign.employeeJoiningDetails.length > 0
        ) {
          if (visit.assign.employeeJoiningDetails[0].employeeCode) {
            employeeCode = visit.assign.employeeJoiningDetails[0].employeeCode;
          }
        }
      }
      // Formate Visit Date
      const formattedVisitDate = asiaKolkataDateTime(visit.visitDate)
        .slice(0, 10)
        .split('-')
        .reverse()
        .join('-');

      if (customizeValues.length > 0) {
        visit.report = 'Yes';
      } else {
        visit.report = 'No';
      }

      allVisitMainData.push({
        VisitID: visit.visitID,
        EmployeeCode: employeeCode,
        UserId: visit.assign.userMasterID,
        assigneduserMasterID: visit.assign.userMasterID,
        Employee:
          visit.assign.displayName + ' (' + visit.assign.userNumber + ')',
        Coperson: visit.coPersonID,
        CustomerCompany: visit.customer ? visit.customer.companyName : '',
        CustomerIndustry: visit?.customer?.ci?.name || '',
        CustomerContact: visit.customer
          ? visit.customer.customerName +
            ' (' +
            visit.customer.mobileNumber1 +
            ')'
          : '',
        CustomerAddress: visit.customer ? visit.customer.currentLocation : '',
        Product:
          visitProductData
            ?.map((e) => e.product?.productName)
            .filter(Boolean)
            .join(', ') || '',
        VisitPurpose:
          purposeOfVisitData
            ?.map((e) => e.visitPurpose?.visitPurpose)
            .filter(Boolean)
            .join(', ') || '',
        VisitDate: formattedVisitDate,
        VisitTime: visit.visitTime,
        CheckInDateTime:
          visit.checkInDateTime != null
            ? moment(visit.checkInDateTime, 'YYYY-MM-DD HH:mm:ss').format(
                'DD-MM-YYYY hh:mm A',
              )
            : '',

        CheckInLocation:
          visit.checkInLocation != null ? visit.checkInLocation : '',
        CheckOutDateTime:
          visit.checkOutDateTime != null
            ? moment(visit.checkOutDateTime, 'YYYY-MM-DD HH:mm:ss').format(
                'DD-MM-YYYY hh:mm A',
              )
            : '',

        CheckOutLocation:
          visit.checkOutLocation != null ? visit.checkOutLocation : '',
        visitFormCustomizeValue: customizeValues || [],
        checkInAttachment: visit.checkInAttachment || '',
        checkOutAttachment: visit.checkOutAttachment || '',
        visitAuthData: visitAuthData || [],
        authorizationStatus: visit.authorizationStatus,
        // visitReportCustomizeValue: visitReportCustomizeValues || [],
      });
    }

    if (exportData) {
      const finalData = [];

      // Helper function to process customize values
      const processCustomizeValues = (items, key, outputKey) => {
        items.forEach((item) => {
          item[outputKey] = [];

          const customizeValues = item[key] || [];

          customizeValues.forEach(
            ({ visitID, value, visitFormCustomize, visitReportCustomize }) => {
              if (item.VisitID === visitID) {
                const customizeField =
                  visitFormCustomize || visitReportCustomize;

                const fieldLabel = customizeField?.fieldLabel;
                const fieldType = customizeField?.inputType;

                // YOUR ORIGINAL IMAGE LOGIC
                const finalValue =
                  typeof value === 'string' && value.length > 200
                    ? "it's image"
                    : formatFieldValue(value, fieldType);

                if (fieldLabel) {
                  item[outputKey].push({
                    value: finalValue,
                    fieldLabel,
                  });
                }
              }
            },
          );
        });
      };

      // Process visitFormCustomizeValue and visitReportCustomizeValue
      processCustomizeValues(
        allVisitMainData,
        'visitFormCustomizeValue',
        'visitreport',
      );
      // processCustomizeValues(
      //   allVisitMainData,
      //   "visitReportCustomizeValue",
      //   "visitReportCustomizeValue1"
      // );

      // Helper function to generate result string from fields
      const generateResultString = (fields) => {
        return fields
          .map(({ fieldLabel, value }) => `${fieldLabel}: ${value}`)
          .join('\n');
      };

      // Build final data for export
      allVisitMainData.forEach((visitItem, i) => {
        const visitFormCustomizeValueResult = visitItem.visitreport
          ? generateResultString(visitItem.visitreport)
          : '';
        // const visitReportCustomizeValue = visitItem.visitReportCustomizeValue1
        //   ? generateResultString(visitItem.visitReportCustomizeValue1)
        //   : "";
        const visitAuthData = visitItem.visitAuthData
          .map(
            (el) =>
              `${el.authPerson?.displayName} - ${el.authStatus == 1 ? 'Approved' : el.authStatus == 0 ? 'Rejected' : 'Pending'}`,
          )
          .join(', \n');
        const visitAuthStatus =
          +visitItem.authorizationStatus == 4
            ? 'Rejected'
            : +visitItem.authorizationStatus == 3
              ? 'Approved'
              : 'Pending';
        const data = {
          'Employee Code': visitItem.EmployeeCode,
          Name: visitItem.Employee,
          'Co-Person': visitItem.Coperson,
          'Visit Date': visitItem.VisitDate,
          Time: visitItem.VisitTime,
          'Check-In-DateTime': visitItem.CheckInDateTime,
          'Check-In-Location': visitItem.CheckInLocation,
          'Check-Out-DateTime': visitItem.CheckOutDateTime,
          'Check-Out-Location': visitItem.CheckOutLocation,
          Product: visitItem.Product,
          'Visit Purpose': visitItem.VisitPurpose,
          Customer: visitItem.CustomerContact,
          "Customer's Company": visitItem.CustomerCompany,
          'Customer Industry': visitItem.CustomerIndustry,
          "Customer's Address": visitItem.CustomerAddress,
          'Check-In-Attachment': visitItem.checkInAttachment
            ? mainApiUrl + visitItem.checkInAttachment
            : '',
          'Check-Out-Attachment': visitItem.checkOutAttachment
            ? mainApiUrl + visitItem.checkOutAttachment
            : '',
          'Customize Fields': visitFormCustomizeValueResult,
          'Auth Status': visitAuthStatus,
          'Auth Data': visitAuthData,
          // "Report Customize Fields": visitReportCustomizeValue,
        };

        finalData.push(data);
      });

      await generateVisitAttachmentExcel(finalData, res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: visitData,
      totalcount: count,
      customFileds:
        findVisitCustomizeField && findVisitCustomizeField.length > 0
          ? findVisitCustomizeField
          : [],
    });
  } catch (err) {
    next(err);
  }
};
const formatFieldValue = (value, fieldType) => {
  if (typeof value !== 'string') return value;

  if (fieldType === 'textarea') {
    return value
      .replace(/<br\s*\/?>/gi, '\n') // convert br to new line
      .replace(/<\/?[^>]+(>|$)/g, '') // remove all other html tags
      .trim();
  }

  return value.replace(/<\/?[^>]+(>|$)/g, '').trim();
};
const generateVisitAttachmentExcel = async (data, res) => {
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet('Visit');

  const columns = Object.keys(data[0]).map((key) => ({
    header: key,
    key: key,
    width: 20,
  }));

  worksheet.columns = columns;

  data.forEach((item, index) => {
    const row = worksheet.addRow(item);
    row.eachCell((cell) => {
      cell.alignment = {
        wrapText: true,
        vertical: 'top',
      };
    });
    if (item['Check-In-Attachment']) {
      row.getCell('Check-In-Attachment').value = {
        text: 'View Attachment',
        hyperlink: item['Check-In-Attachment'],
      };
      row.getCell('Check-In-Attachment').font = {
        color: '0563C1',
        underline: true,
      };
    }

    if (item['Check-Out-Attachment']) {
      row.getCell('Check-Out-Attachment').value = {
        text: 'View Attachment',
        hyperlink: item['Check-Out-Attachment'],
      };
      row.getCell('Check-Out-Attachment').font = {
        color: '0563C1',
        underline: true,
      };
    }
  });

  worksheet.getRow(1).font = { bold: true };

  res.attachment('Visit.xlsx');
  res.set({
    'Access-Control-Expose-Headers': '*',
  });

  await workbook.xlsx.write(res);
};

exports.getApprovedVisitByAssignID = async (req, res, next) => {
  try {
    let get_one_data = await Visit.findAll({
      where: {
        assignID: req.params.id,
        status: 1,
        authorizationStatus: 3,
      },
      include: [
        {
          model: UserMaster,
          as: 'assign',
          required: true,
        },
        { model: CompanyMasterModel },
        { model: Customer },
        {
          model: VisitAuthorization,
          as: 'visitAuth',
          include: [
            {
              model: UserMaster,
              as: 'authPerson',
              attributes: ['displayName'],
            },
          ],
        },
      ],
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};
exports.getVisitByUserID = async (req, res, next) => {
  try {
    const {
      userMasterID,
      page,
      limit,
      date,
      toDate,
      isOnlyApprovedVisit = false,
    } = req.body;
    const condition = {};
    condition.status = 1;
    condition.assignID = userMasterID;

    if (toDate) {
      condition.visitDate = {
        [Sequelize.Op.between]: [date, toDate],
      };
    } else {
      condition.visitDate = date;
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });

    if (isOnlyApprovedVisit) {
      condition.authorizationStatus = 3;
    }
    const visit = await Visit.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order: [['visitDate', 'DESC']],
      include: [
        {
          model: PurposeOfVisit,
          as: 'pov',
          include: [{ model: VisitPurpose, attributes: ['visitPurpose'] }],
        },
        { model: CompanyMasterModel },
        { model: customer },
        {
          model: UserMaster,
          as: 'assign',
          required: true,
          where: { ...userAccessCondition.where },
          attributes: [
            'userMasterID',
            'firstName',
            'middleName',
            'lastName',
            'displayName',
            'userNumber',
            'photo',
          ],
          include: [...userAccessCondition.includeModels],
        },
        { model: product },
        { model: visitPurpose },
        {
          model: VisitAuthorization,
          as: 'visitAuth',
          include: [
            {
              model: UserMaster,
              as: 'authPerson',
              attributes: ['displayName'],
            },
          ],
        },
      ],
    });

    for (let i = 0; i < visit.rows.length; i++) {
      let visitreport = await VisitReportCustomizeValue.findAll({
        where: {
          visitID: visit.rows[i].visitID,
        },
      });

      if (visitreport.length > 0) {
        visit.rows[i].dataValues.report = 'Yes';
      } else {
        visit.rows[i].dataValues.report = 'No';
      }

      let visitValue = await VisitFormCustomizeFieldValueModel.findAll({
        raw: true,
        where: {
          visitID: visit.rows[i].visitID,
        },
        attributes: ['value'],
        include: [{ model: VisitFormCustomize, attributes: ['fieldLabel'] }],
        order: [
          [{ model: VisitFormCustomize }, 'index', 'ASC'],
          [{ model: VisitFormCustomize }, 'createdAt', 'ASC'],
        ],
      });

      visit.rows[i].dataValues.VisitValue = visitValue;
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Visit'),
      data: visit.rows,
      totalcount: visit.count,
    });
  } catch (err) {
    next(err);
  }
};

exports.TeamVisit = async (req, res, next) => {
  try {
    let {
      limit,
      page,
      startdate,
      enddate,
      status,
      filter,
      userMasterID,
      exportData,
    } = await req.body;
    const includeData = [
      {
        required: false,
        model: CompanyMasterModel,
        attributes: ['companyName', 'companyAddress'],
      },
      {
        required: false,
        model: Customer,
        attributes: [
          'companyName',
          'customerName',
          'currentLocation',
          'mobileNumber1',
        ],
        include: [
          {
            model: CustomerIndustry,
            as: 'ci',
            required: false,
            attributes: ['name'],
          },
        ],
      },
      {
        required: false,
        model: UserMaster,
        as: 'createdByUserDetails',
        attributes: userAttributes,
      },
      {
        required: false,
        model: UserMaster,
        as: 'updatedByUserDetails',
        attributes: userAttributes,
      },
      {
        required: true,
        model: UserMaster,
        as: 'assign',
        attributes: userAttributes,
        include: [
          {
            required: false,
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
          },
        ],
      },
    ];

    const condition = {};
    condition.status = ['0', '1'];
    if (userMasterID && userMasterID.length > 0) {
      condition.assignID = userMasterID;
    }

    if (filter == 'true') {
      if (status != '3') {
        condition.checkInDateTime = {
          [Sequelize.Op.is]: null,
        };
        condition.checkOutDateTime = {
          [Sequelize.Op.is]: null,
        };
      }
      if (startdate && enddate) {
        condition.visitDate = {
          [Sequelize.Op.between]: [startdate, enddate],
        };
      }
    }

    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [
      ['visitDate', 'DESC'],
      ['visitID', 'DESC'],
    ];
    const { rows: teamVisitData, count } = await Visit.findAndCountAll({
      // raw: true,
      where: condition,
      ...paginationQuery,
      order,
      include: includeData,
      distinct: true,
      subQuery: false,
    });

    const visitCopersonIDs = new Set();
    const visitIDs = new Set();
    for (const visit of teamVisitData) {
      visitIDs.add(visit.visitID);
      for (let person of visit.coPersonID) {
        visitCopersonIDs.add(+person);
      }
    }

    const [
      visitCopersonUserData,
      findVisitCustomizeField,
      findVisitReportCustomizeValues,
      findAllVisitAuthorizationData,
      findAllVisitProduct,
      findAllPurposeOfVisit,
    ] = await Promise.all([
      await UserMaster.findAll({
        where: {
          userMasterID: [...visitCopersonIDs],
        },
        attributes: userAttributes,
      }),
      visitFormCustomizeValues.findAll({
        where: {
          visitID: [...visitIDs],
        },
        attributes: ['visitID', 'value'],
        include: [
          {
            model: VisitFormCustomize,
            include: [{ model: CompanyMasterModel }],
          },
        ],
        order: [
          [{ model: VisitFormCustomize }, 'index', 'ASC'],
          [{ model: VisitFormCustomize }, 'createdAt', 'ASC'],
        ],
      }),
      VisitReportCustomizeValue.findAll({
        where: {
          visitID: [...visitIDs],
        },
        attributes: ['visitID', 'value'],
        include: [
          {
            required: false,
            model: VisitReportCustomize,
            include: [
              {
                model: VisitReportMaster,
                as: 'vrMaster',
                attributes: [['visitReportName', 'name']],
              },
            ],
          },
        ],
      }),
      VisitAuthorization.findAll({
        where: {
          visitID: [...visitIDs],
        },
        include: [
          {
            model: UserMaster,
            as: 'authPerson',
            attributes: ['displayName'],
          },
        ],
      }),
      VisitProduct.findAll({
        where: {
          visitID: [...visitIDs],
        },
        include: [
          {
            model: Product,
            attributes: ['productName'],
          },
        ],
      }),
      PurposeOfVisit.findAll({
        where: {
          visitID: [...visitIDs],
        },
        include: [
          {
            model: VisitPurpose,
            attributes: ['visitPurpose'],
          },
        ],
      }),
    ]);
    const customizeFieldMap = {};

    findVisitCustomizeField.forEach((item) => {
      const vid = item.visitID;

      if (!customizeFieldMap[vid]) {
        customizeFieldMap[vid] = [];
      }

      customizeFieldMap[vid].push(item);
    });
    const visitReportCustomizeMap = {};
    findVisitReportCustomizeValues.forEach((item) => {
      const vid = item.visitID;
      if (!visitReportCustomizeMap[vid]) {
        visitReportCustomizeMap[vid] = [];
      }
      visitReportCustomizeMap[vid].push(item);
    });
    const visitAuthDataMap = {};
    findAllVisitAuthorizationData.forEach((item) => {
      const vid = item.visitID;
      if (!visitAuthDataMap[vid]) {
        visitAuthDataMap[vid] = [];
      }
      visitAuthDataMap[vid].push(item);
    });
    const visitProductDataMap = {};
    findAllVisitProduct.forEach((item) => {
      const vid = item.visitID;
      if (!visitProductDataMap[vid]) {
        visitProductDataMap[vid] = [];
      }
      visitProductDataMap[vid].push(item);
    });
    const purposeOfVisitDataMap = {};
    findAllPurposeOfVisit.forEach((item) => {
      const vid = item.visitID;
      if (!purposeOfVisitDataMap[vid]) {
        purposeOfVisitDataMap[vid] = [];
      }
      purposeOfVisitDataMap[vid].push(item);
    });
    const allVisitMainData = [];
    for (let visit of teamVisitData) {
      const customizeValues = customizeFieldMap[visit.visitID] || [];
      visit.dataValues.visitFormCustomizeValue = customizeValues;
      const visitAuthData = visitAuthDataMap[visit.visitID] || [];
      visit.dataValues.visitAuth = visitAuthData;
      visit.dataValues.isApprovedOrRejectedByAny =
        visitAuthData?.some(
          (auth) =>
            Number(auth.authStatus) == 1 || Number(auth.authStatus) == 0,
        ) || false;
      const visitReportCustomizeValues =
        visitReportCustomizeMap[visit.visitID] || [];
      visit.dataValues.visitReportCustomizeValues = visitReportCustomizeValues;

      const visitProductData = visitProductDataMap[visit.visitID] || [];
      visit.dataValues.vp = visitProductData;

      const purposeOfVisitData = purposeOfVisitDataMap[visit.visitID] || [];
      visit.dataValues.pov = purposeOfVisitData;

      if (visit.createBy) {
        visit.createById = visit.createBy;
        if (
          visit.assignID == +req.userDetails.userMasterId ||
          +visit.createBy == req.userDetails.userMasterId
        ) {
          visit.dataValues.editvisit = true;
        } else {
          visit.dataValues.editvisit = false;
        }
        visit.createBy = visit.createdByUserDetails.displayName;
      }

      if (visit.updateBy !== null) {
        visit.updateBy = visit.updatedByUserDetails.displayName;
      }
      // Set For Co-Person Name And Number
      const coperson = [];
      for (const person of visit.coPersonID) {
        const user = visitCopersonUserData.find(
          (e) => e.userMasterID == +person,
        );
        coperson.push(user.displayName + '(' + user.userNumber + ')');
      }
      visit.coPersonID = coperson.join();

      let employeeCode = '';
      if (visit.assign) {
        if (
          visit.assign.employeeJoiningDetails &&
          visit.assign.employeeJoiningDetails.length > 0
        ) {
          if (visit.assign.employeeJoiningDetails[0].employeeCode) {
            employeeCode = visit.assign.employeeJoiningDetails[0].employeeCode;
          }
        }
      }
      // Formate Visit Date
      const formattedVisitDate = asiaKolkataDateTime(visit.visitDate)
        .slice(0, 10)
        .split('-')
        .reverse()
        .join('-');

      if (customizeValues) {
        visit.report = 'Yes';
      } else {
        visit.report = 'No';
      }

      allVisitMainData.push({
        VisitID: visit.visitID,
        EmployeeCode: employeeCode,
        UserId: visit.assign.userMasterID,
        assigneduserMasterID: visit.assign.userMasterID,
        Employee:
          visit.assign.displayName + ' (' + visit.assign.userNumber + ')',
        Coperson: visit.coPersonID,
        CustomerCompany: visit.customer ? visit.customer.companyName : '',
        CustomerIndustry: visit?.customer?.ci?.name || '',
        CustomerContact: visit.customer
          ? visit.customer.customerName +
            ' (' +
            visit.customer.mobileNumber1 +
            ')'
          : '',
        CustomerAddress: visit.customer ? visit.customer.currentLocation : '',
        Product:
          visitProductData
            ?.map((e) => e.product?.productName)
            .filter(Boolean)
            .join(', ') || '',
        VisitPurpose:
          purposeOfVisitData
            ?.map((e) => e.visitPurpose?.visitPurpose)
            .filter(Boolean)
            .join(', ') || '',
        VisitDate: formattedVisitDate,
        VisitTime: visit.visitTime,
        CheckInDateTime:
          visit.checkInDateTime != null
            ? moment(visit.checkInDateTime, 'YYYY-MM-DD HH:mm:ss').format(
                'DD-MM-YYYY hh:mm A',
              )
            : '',
        CheckInLocation:
          visit.checkInLocation != null ? visit.checkInLocation : '',
        CheckOutDateTime:
          visit.checkOutDateTime != null
            ? moment(visit.checkOutDateTime, 'YYYY-MM-DD HH:mm:ss').format(
                'DD-MM-YYYY hh:mm A',
              )
            : '',
        CheckOutLocation:
          visit.checkOutLocation != null ? visit.checkOutLocation : '',
        visitFormCustomizeValue: customizeValues || [],
        visitAuthData: visitAuthData || [],
        authorizationStatus: visit.authorizationStatus,
        // visitReportCustomizeValue: visitReportCustomizeValues || [],
      });
    }

    if (exportData) {
      const finalData = [];

      // Helper function to process customize values

      const processCustomizeValues = (items, key, outputKey) => {
        items.forEach((item) => {
          item[outputKey] = [];

          const customizeValues = item[key] || [];

          customizeValues.forEach(
            ({ visitID, value, visitFormCustomize, visitReportCustomize }) => {
              if (item.VisitID === visitID) {
                const customizeField =
                  visitFormCustomize || visitReportCustomize;

                const fieldLabel = customizeField?.fieldLabel;
                const fieldType = customizeField?.inputType;

                const finalValue =
                  typeof value === 'string' && value.length > 200
                    ? "it's image"
                    : formatFieldValue(value, fieldType);

                if (fieldLabel) {
                  item[outputKey].push({
                    value: finalValue,
                    fieldLabel,
                  });
                }
              }
            },
          );
        });
      };

      // Process visitFormCustomizeValue and visitReportCustomizeValue
      processCustomizeValues(
        allVisitMainData,
        'visitFormCustomizeValue',
        'visitreport',
      );

      const generateResultString = (fields) => {
        const fieldData = {};
        fields.forEach(({ value, fieldLabel }) => {
          fieldData[fieldLabel] = value;
        });
        return Object.entries(fieldData)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
      };

      // Build final data for export
      allVisitMainData.forEach((visitItem, i) => {
        const visitFormCustomizeValueResult = visitItem.visitreport
          ? generateResultString(visitItem.visitreport)
          : '';
        const visitAuthData = visitItem.visitAuthData
          .map(
            (el) =>
              `${el.authPerson?.displayName} - ${el.authStatus == 1 ? 'Approved' : el.authStatus == 0 ? 'Rejected' : 'Pending'}`,
          )
          .join(', \n');
        let visitAuthStatus =
          +visitItem.authorizationStatus == 4
            ? 'Rejected'
            : +visitItem.authorizationStatus == 3
              ? 'Approved'
              : 'Pending';
        const data = {
          'Employee Code': visitItem.EmployeeCode,
          Name: visitItem.Employee,
          'Co-Person': visitItem.Coperson,
          'Visit Date': visitItem.VisitDate,
          Time: visitItem.VisitTime,
          'Check-In-DateTime': visitItem.CheckInDateTime,
          'Check-In-Location': visitItem.CheckInLocation,
          'Check-Out-DateTime': visitItem.CheckOutDateTime,
          'Check-Out-Location': visitItem.CheckOutLocation,
          Product: visitItem.Product,
          'Visit Purpose': visitItem.VisitPurpose,
          Customer: visitItem.CustomerContact,
          "Customer's Company": visitItem.CustomerCompany,
          'Customer Industry': visitItem.CustomerIndustry,
          "Customer's Address": visitItem.CustomerAddress,
          'Customize Fields': visitFormCustomizeValueResult,
          'Auth Status': visitAuthStatus,
          'Auth Data': visitAuthData,
          // "Report Customize Fields": visitReportCustomizeValue,
        };

        finalData.push(data);
      });

      await generateExcelForVisitReport(finalData, 'Visit', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      customFileds:
        findVisitCustomizeField && findVisitCustomizeField.length > 0
          ? findVisitCustomizeField
          : [],
      data: teamVisitData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.visitCheckInCheckOut_web = async (req, res, next) => {
  try {
    let { visitID, checkInDateTime, checkOutDateTime } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const findBeforeUpdate = await Visit.findOne({
      where: { visitID: visitID },
    });
    if (findBeforeUpdate) {
      if (
        findBeforeUpdate.checkInDateTime &&
        findBeforeUpdate.checkOutDateTime
      ) {
        return res.status(200).json({
          status: 401,
          message: 'Vist Check-in Check-Out Already Completed!!!',
        });
      }
    }
    let checkInAttachment = findBeforeUpdate.checkInAttachment;
    let checkOutAttachment = findBeforeUpdate.checkOutAttachment;
    if (req?.files?.checkInAttachment?.length) {
      checkInAttachment = req?.files?.checkInAttachment?.[0]?.filename
        ? `uploads/visitAttachment/${req?.files?.checkInAttachment?.[0]?.filename}`
        : findBeforeUpdate.checkInAttachment;
    }
    if (req?.files?.checkOutAttachment?.length) {
      checkOutAttachment = req?.files?.checkOutAttachment?.[0]?.filename
        ? `uploads/visitAttachment/${req?.files?.checkOutAttachment?.[0]?.filename}`
        : findBeforeUpdate.checkOutAttachment;
    }

    await Visit.update(
      {
        checkInDateTime,
        checkOutDateTime,
        updateBy,
        updateByIp,
        checkInAttachment,
        checkOutAttachment,
      },
      {
        where: { visitID: visitID },
      },
    );
    const findVisit = await Visit.findOne({
      where: { visitID: visitID },
    });
    if (findVisit && findVisit.checkInDateTime && findVisit.checkOutDateTime) {
      const checkInDateTime = new Date(findVisit.checkInDateTime);
      const checkOutDateTime = new Date(findVisit.checkOutDateTime);
      const diffMs = checkOutDateTime - checkInDateTime;
      const diffMinutes = diffMs / (1000 * 60);
      const formattedMinutes = diffMinutes.toFixed(2);
      await Visit.update(
        {
          visitMinutes: formattedMinutes,
          updateBy,
          updateByIp,
        },
        {
          where: { visitID: visitID },
        },
      );
    }
    const integration = await GoogleSheetIntegration.findOne({
      companyMasterID: findBeforeUpdate.companyMasterID,
    });
    if (integration) {
      googleSheetIntegration
        .updateVisitCheckInOutRecord(findBeforeUpdate.visitID)
        .catch((err) => {
          console.log(
            'Error in Google Sheet Integration for Visit Check-In Check-Out: ',
            err,
          );
        });
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Visit'),
    });
  } catch (err) {
    next(err);
  }
};

exports.visitCheckInCheckOut_mobile = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      visitID,
      checkInDateTime,
      checkInLatitude,
      checkInLongitude,
      checkInLocation,
      checkOutDateTime,
      checkOutLatitude,
      checkOutLongitude,
      checkOutLocation,
      isCheckIn,
      isCheckOut,
    } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const findBeforeUpdate = await Visit.findOne({
      where: { visitID: visitID },
      include: [
        {
          model: Customer,
        },
      ],
    });
    if (findBeforeUpdate) {
      if (
        findBeforeUpdate.checkInDateTime &&
        findBeforeUpdate.checkOutDateTime
      ) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: 'Vist Check-in Check-Out Already Completed!!!',
        });
      } else if (findBeforeUpdate.checkInDateTime && checkOutDateTime) {
        const inTime = new Date(findBeforeUpdate.checkInDateTime);
        const outTime = new Date(checkOutDateTime);

        if (outTime - inTime < 60000) {
          await transaction.rollback();
          return res.status(200).json({
            status: 401,
            message:
              'Check-Out time must be at least 1 minute greater than Check-In time!',
          });
        }
      }
    }
    let checkInAttachment = findBeforeUpdate.checkInAttachment;
    let checkOutAttachment = findBeforeUpdate.checkOutAttachment;
    if (req?.files?.checkInAttachment?.length) {
      checkInAttachment = req?.files?.checkInAttachment?.[0]?.filename
        ? `uploads/visitAttachment/${req?.files?.checkInAttachment?.[0]?.filename}`
        : findBeforeUpdate.checkInAttachment;
    }
    if (req?.files?.checkOutAttachment?.length) {
      checkOutAttachment = req?.files?.checkOutAttachment?.[0]?.filename
        ? `uploads/visitAttachment/${req?.files?.checkOutAttachment?.[0]?.filename}`
        : findBeforeUpdate.checkOutAttachment;
    }

    if (isCheckIn) {
      if (findBeforeUpdate) {
        if (findBeforeUpdate.checkInDateTime) {
          await transaction.rollback();
          return res.status(200).json({
            status: 401,
            message: 'Vist is Already Checked-in!!!',
          });
        } else {
          checkInDateTime = new Date();
          if (checkInLatitude && checkInLongitude) {
            if (
              !findBeforeUpdate?.customer?.latitude &&
              !findBeforeUpdate?.customer?.longitude
            ) {
              await Customer.update(
                { latitude: checkInLatitude, longitude: checkInLongitude },
                {
                  where: {
                    customerID: findBeforeUpdate.customerID,
                  },
                  transaction,
                  user: req.userDetails,
                },
              );
            }
          }
        }
      }
    }
    await Visit.update(
      {
        checkInDateTime,
        checkInLatitude,
        checkInLongitude,
        checkInLocation,
        checkOutDateTime,
        checkOutLatitude,
        checkOutLongitude,
        checkOutLocation,
        updateBy,
        updateByIp,
        checkInAttachment,
        checkOutAttachment,
      },
      {
        transaction,
        where: { visitID: visitID },
      },
    );
    const findVisit = await Visit.findOne({
      where: { visitID: visitID },
    });
    if (findVisit && findVisit.checkInDateTime && findVisit.checkOutDateTime) {
      const checkInDateTime = new Date(findVisit.checkInDateTime);
      const checkOutDateTime = new Date(findVisit.checkOutDateTime);
      const diffMs = checkOutDateTime - checkInDateTime;
      const diffMinutes = diffMs / (1000 * 60);
      const formattedMinutes = diffMinutes.toFixed(2);
      await Visit.update(
        {
          visitMinutes: formattedMinutes,
          updateBy,
          updateByIp,
        },
        {
          transaction,
          where: { visitID: visitID },
        },
      );
    }
    const integration = await GoogleSheetIntegration.findOne({
      where: { companyMasterID: findBeforeUpdate.companyMasterID },
    });
    if (integration) {
      googleSheetIntegration
        .updateVisitCheckInOutRecord(findBeforeUpdate.visitID)
        .catch((err) => {
          console.log(
            'Error in Google Sheet Integration for Visit Check-In Check-Out: ',
            err,
          );
        });
    }
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Visit'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.addVisitV2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      customerID,
      assignID,
      coPersonID,
      visitPurposeID,
      productID,
      visitDate,
      visitTime,
      checkInDateTime,
      checkInLatitude,
      checkInLongitude,
      checkInLocation,
      checkOutDateTime,
      checkOutLatitude,
      checkOutLongitude,
      checkOutLocation,
      visitStatus,
      companyMasterID,
      customfieldvalue,
    } = req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const authorizationDetails = await findAuthorizationDetails(
      authorizationMasterTypes.visit,
      assignID,
    );
    const authorizationStatus = authorizationDetails
      ? +authorizationDetails.AuthorizationCriteriaID ==
        authorizationCriteriaType.SEQUENCENO
        ? AuthorizationStatusType.PEDING_TWO
        : AuthorizationStatusType.PEDING_ONE
      : AuthorizationStatusType.APPROVED;
    productID == productID
      ? Array.isArray(productID)
        ? productID
        : [productID]
      : [];
    visitPurposeID == visitPurposeID
      ? Array.isArray(visitPurposeID)
        ? visitPurposeID
        : [visitPurposeID]
      : [];
    let insert_db_status = await Visit.create(
      {
        customerID,
        assignID,
        coPersonID,
        visitDate,
        visitTime,
        checkInDateTime,
        checkInLatitude,
        checkInLongitude,
        checkInLocation,
        checkOutDateTime,
        checkOutLatitude,
        checkOutLongitude,
        checkOutLocation,
        visitStatus,
        companyMasterID,
        createBy,
        createByIp,
        authorizationStatus,
        AuthorizationCriteriaID: authorizationDetails
          ? authorizationDetails.AuthorizationCriteriaID
          : null,
      },
      { transaction },
    );
    // transaction for visit and customize fields

    const createPromises = [];
    if (customfieldvalue?.length) {
      createPromises.push(
        VisitFormCustomizeFieldValueModel.bulkCreate(
          customfieldvalue.map((item) => ({
            visitFormCustomizeID: item.visitFormCustomizeID,
            visitID: insert_db_status.visitID,
            value: item.value,
            createBy,
            createByIp,
          })),
          { transaction },
        ),
      );
    }

    if (productID.length) {
      createPromises.push(
        VisitProduct.bulkCreate(
          productID.map((item) => ({
            productID: item,
            visitID: insert_db_status.visitID,
          })),
          {
            individualHooks: true,
            user: req.userDetails,
            transaction,
          },
        ),
      );
    }
    if (visitPurposeID.length) {
      createPromises.push(
        PurposeOfVisit.bulkCreate(
          visitPurposeID.map((item) => ({
            visitPurposeID: item,
            visitID: insert_db_status.visitID,
          })),
          {
            individualHooks: true,
            user: req.userDetails,
            transaction,
          },
        ),
      );
    }
    await Promise.all(createPromises);
    if (
      authorizationDetails &&
      authorizationStatus != AuthorizationStatusType.APPROVED
    ) {
      // user Details
      const userDetails = await UserMaster.findOne({
        where: {
          userMasterID: assignID,
        },
      });

      if (!userDetails) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: message.usermessage.notFoundMessage('User'),
        });
      }

      // For Sequence No
      if (+authorizationStatus == AuthorizationStatusType.PEDING_TWO) {
        const authorizationData = await VisitAuthorization.create(
          {
            visitID: insert_db_status.visitID,
            userMasterID: authorizationDetails.AuthorizedByUserMasterId[0],
            authStatus: 2,
          },
          { user: req.userDetails, transaction: transaction },
        );

        // Create UserInbox
        await UserInbox.create(
          {
            activityTable: VisitAuthorization.getTableName(),
            activityTablePK: authorizationData.toJSON().visitAuthorizationID,
            message: `${userDetails.displayName} has requested a Visit.`,
            assignedTo: authorizationDetails.AuthorizedByUserMasterId[0],
            assignedBy: assignID,
          },
          { transaction },
        );

        const notification = {
          title: notificationTitleTypes.VISIT,
          body: userDetails.displayName + ' requested for a Visit.',
        };
        const data = {
          screen: notificationScreentTypes.VISIT,
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
          const authorizationData = await VisitAuthorization.create(
            {
              visitID: insert_db_status.visitID,
              userMasterID: authorizationDetails.AuthorizedByUserMasterId[j],
              authStatus: 2,
            },
            { user: req.userDetails, transaction: transaction },
          );

          // Create UserInbox
          await UserInbox.create(
            {
              activityTable: VisitAuthorization.getTableName(),
              activityTablePK: authorizationData.toJSON().visitAuthorizationID,
              message: `${userDetails.displayName} has requested a Visit.`,
              assignedTo: authorizationDetails.AuthorizedByUserMasterId[j],
              assignedBy: assignID,
            },
            { user: req.userDetails, transaction: transaction },
          );

          const notification = {
            title: notificationTitleTypes.VISIT,
            body: userDetails.displayName + ' requested for a Visit.',
          };
          const data = {
            screen: notificationScreentTypes.VISIT,
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
    await transaction.commit();
    googleSheetIntegration
      .addVisitRecord(insert_db_status.visitID, req.userDetails)
      .catch((err) => {
        console.log('Error in Google Sheet Integration for Visit Add: ', err);
      });

    const notification = {
      title: 'Visit',
      body: 'New Visit Assigned To You. Please Check',
    };
    const data = {
      screen: 'visit',
    };

    await sendNotification(req.body.assignID, notification, data);

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Visit'),
      data: insert_db_status,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
exports.updateVisitV2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      visitID,
      customerID,
      assignID,
      coPersonID,
      visitPurposeID,
      productID,
      visitDate,
      visitTime,
      checkInDateTime,
      checkInLatitude,
      checkInLongitude,
      checkInLocation,
      checkOutDateTime,
      checkOutLatitude,
      checkOutLongitude,
      checkOutLocation,
      visitStatus,
      companyMasterID,
      customfieldvalue,
      visitFormCustomizeID,
    } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    const oldDate = await Visit.findOne({
      where: { visitID: visitID },
      attributes: ['visitDate'],
    });

    await Visit.update(
      {
        customerID,
        assignID,
        coPersonID,
        visitDate,
        visitTime,
        checkInDateTime,
        checkInLatitude,
        checkInLongitude,
        checkInLocation,
        checkOutDateTime,
        checkOutLatitude,
        checkOutLongitude,
        checkOutLocation,
        visitStatus,
        companyMasterID,
        updateBy,
        updateByIp,
      },
      {
        where: { visitID },
        transaction,
      },
    );

    const findVisit = await Visit.findOne({
      where: { visitID },
      include: [
        { model: VisitProduct, as: 'vp' },
        {
          model: PurposeOfVisit,
          as: 'pov',
        },
      ],
    });
    const existingProducts = findVisit.vp || [];

    // New product IDs
    const newProductIDs = Array.isArray(productID)
      ? productID
      : productID
        ? [productID]
        : [];

    // Existing product IDs
    const existingProductIDs = existingProducts.map((item) => +item.productID);

    // -------------------- DELETE REMOVED PRODUCTS --------------------
    const productIDsToDelete = existingProducts
      .filter((item) => !newProductIDs.includes(+item.productID))
      .map((item) => item.visitProductID);

    if (productIDsToDelete.length) {
      await VisitProduct.destroy({
        where: {
          visitProductID: productIDsToDelete,
        },
        individualHooks: true,
        user: req.userDetails,
      });
    }

    // -------------------- CREATE NEW PRODUCTS --------------------
    const productIDsToCreate = newProductIDs.filter(
      (id) => !existingProductIDs.includes(+id),
    );

    if (productIDsToCreate.length) {
      await VisitProduct.bulkCreate(
        productIDsToCreate.map((productID) => ({
          visitID,
          productID,
          createBy: req.userDetails.userMasterId,
          createByIp: req.userDetails.userIpAddress,
        })),
        {
          individualHooks: true,
          user: req.userDetails,
        },
      );
    }
    const existingPurposes = findVisit.pov || [];

    // New purpose IDs
    const newPurposeIDs = Array.isArray(visitPurposeID)
      ? visitPurposeID
      : visitPurposeID
        ? [visitPurposeID]
        : [];

    // Existing purpose IDs
    const existingPurposeIDs = existingPurposes.map(
      (item) => +item.visitPurposeID,
    );

    // -------------------- DELETE REMOVED PURPOSES --------------------
    const purposeIDsToDelete = existingPurposes
      .filter((item) => !newPurposeIDs.includes(+item.visitPurposeID))
      .map((item) => item.purposeOfVisitID);

    if (purposeIDsToDelete.length) {
      await PurposeOfVisit.destroy({
        where: {
          purposeOfVisitID: purposeIDsToDelete,
        },
        individualHooks: true,
        user: req.userDetails,
      });
    }

    // -------------------- CREATE NEW PURPOSES --------------------
    const purposeIDsToCreate = newPurposeIDs.filter(
      (id) => !existingPurposeIDs.includes(+id),
    );

    if (purposeIDsToCreate.length) {
      await PurposeOfVisit.bulkCreate(
        purposeIDsToCreate.map((visitPurposeID) => ({
          visitID,
          visitPurposeID,
          createBy: req.userDetails.userMasterId,
          createByIp: req.userDetails.userIpAddress,
        })),
        {
          individualHooks: true,
          user: req.userDetails,
        },
      );
    }
    if (findVisit && findVisit.checkInDateTime && findVisit.checkOutDateTime) {
      const checkInDateTime = new Date(findVisit.checkInDateTime);
      const checkOutDateTime = new Date(findVisit.checkOutDateTime);
      const diffMs = checkOutDateTime - checkInDateTime;
      const diffMinutes = diffMs / (1000 * 60);
      const formattedMinutes = diffMinutes.toFixed(2);
      await Visit.update(
        {
          visitMinutes: formattedMinutes,
          updateBy,
          updateByIp,
        },
        {
          where: { visitID },
          transaction,
        },
      );
    }

    for (let i = 0; i < customfieldvalue.length; i++) {
      await VisitFormCustomizeFieldValueModel.update(
        {
          visitFormCustomizeID,
          visitID,
          value: customfieldvalue[i].value,
          updateBy,
          updateByIp,
        },
        {
          where: {
            visitFormCustomizeValueID:
              customfieldvalue[i].visitFormCustomizeValueID,
          },
          transaction,
        },
      );
    }
    await transaction.commit();

    googleSheetIntegration
      .updateVisitRecord(visitID, oldDate.visitDate, req.userDetails)
      .catch((err) => {
        console.log(
          'Error in Google Sheet Integration for Visit Update: ',
          err,
        );
      });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Visit'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getVisitCountUserWise = async (req, res, next) => {
  try {
    const { fromDate, toDate } = req.body;
    const userMasterID = req.userDetails.userMasterId;

    if (!fromDate || !toDate) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.invalidField('Date'),
      });
    }
    const reponseObj = {
      totalVisits: 0,
      pendingVisits: 0,
      completedVisits: 0,
    };
    const condition = {
      assignID: userMasterID,
      status: 1,
    };
    if (fromDate && toDate)
      condition.visitDate = {
        [Sequelize.Op.between]: [fromDate, toDate],
      };
    const visitCounts = await Visit.findOne({
      raw: true,
      attributes: [
        [sequelize.fn('COUNT', Sequelize.col('visitID')), 'totalVisits'],
        [
          sequelize.fn(
            'SUM',
            Sequelize.literal(
              `CASE WHEN "checkOutDateTime" IS NULL THEN 1 ELSE 0 END`,
            ),
          ),
          'pendingVisits',
        ],
        [
          sequelize.fn(
            'SUM',
            Sequelize.literal(
              `CASE WHEN "checkOutDateTime" IS NOT NULL THEN 1 ELSE 0 END`,
            ),
          ),
          'completedVisits',
        ],
      ],
      where: condition,
    });
    return res.status(200).json({
      status: 200,
      data: {
        totalVisits: Number(visitCounts?.totalVisits) || 0,
        pendingVisits: Number(visitCounts?.pendingVisits) || 0,
        completedVisits: Number(visitCounts?.completedVisits) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getUpcomingVisitCountUserWise = async (req, res, next) => {
  try {
    const userMasterID = req.userDetails.userMasterId;
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const upcomingVisitCount = await Visit.count({
      where: {
        assignID: userMasterID,
        status: 1,
        visitDate: {
          [Sequelize.Op.gt]: currentDate,
        },
      },
    });

    return res.status(200).json({
      status: 200,
      data: { upcomingVisitCount },
    });
  } catch (err) {
    next(err);
  }
};

exports.getUpcomingVisitByUserID = async (req, res, next) => {
  try {
    const { userMasterID, page, limit, date } = req.body;
    const condition = {};
    condition.status = 1;
    condition.assignID = userMasterID;

    const referenceDate = date || asiaKolkataDateTime(new Date()).slice(0, 10);
    condition.visitDate = {
      [Sequelize.Op.gt]: referenceDate,
    };

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const visit = await Visit.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order: [['visitDate', 'ASC']],
      include: [
        { model: CompanyMasterModel },
        { model: customer },
        {
          model: UserMaster,
          as: 'assign',
          required: true,
          where: { ...userAccessCondition.where },
          attributes: [
            'userMasterID',
            'firstName',
            'middleName',
            'lastName',
            'displayName',
            'userNumber',
            'photo',
          ],
          include: [...userAccessCondition.includeModels],
        },
        { model: product },
        { model: visitPurpose },
        {
          model: VisitAuthorization,
          as: 'visitAuth',
          include: [
            {
              model: UserMaster,
              as: 'authPerson',
              attributes: ['displayName'],
            },
          ],
        },
      ],
    });

    const visitIDs = visit.rows.map((v) => v.visitID);

    let reportVisitIDs = new Set();
    let valuesMap = {};

    if (visitIDs.length > 0) {
      const visitReports = await VisitReportCustomizeValue.findAll({
        attributes: ['visitID'],
        where: {
          visitID: { [Sequelize.Op.in]: visitIDs },
        },
      });
      reportVisitIDs = new Set(visitReports.map((r) => r.visitID));

      const visitValues = await VisitFormCustomizeFieldValueModel.findAll({
        raw: true,
        where: {
          visitID: { [Sequelize.Op.in]: visitIDs },
        },
        attributes: ['visitID', 'value'],
        include: [{ model: VisitFormCustomize, attributes: ['fieldLabel'] }],
        order: [
          [{ model: VisitFormCustomize }, 'index', 'ASC'],
          [{ model: VisitFormCustomize }, 'createdAt', 'ASC'],
        ],
      });

      for (const val of visitValues) {
        const vid = val.visitID;
        if (!valuesMap[vid]) {
          valuesMap[vid] = [];
        }
        const valCopy = { ...val };
        delete valCopy.visitID;
        valuesMap[vid].push(valCopy);
      }
    }

    for (let i = 0; i < visit.rows.length; i++) {
      const vid = visit.rows[i].visitID;
      visit.rows[i].dataValues.report = reportVisitIDs.has(vid) ? 'Yes' : 'No';
      visit.rows[i].dataValues.VisitValue = valuesMap[vid] || [];
    }

    return res.status(200).json({
      status: 200,
      data: visit.rows,
      totalcount: visit.count,
    });
  } catch (err) {
    next(err);
  }
};
