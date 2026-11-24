const Sequelize = require('sequelize');
const advancePayment = require('../models/advancePayment');
const logger = require('../config/logger');
const UserMaster = require('../models/userMaster');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const companyMaster = require('../models/companyMaster');
const UserInbox = require('../models/UserInbox');

const readXlsxFile = require('read-excel-file/node');
const HRSalaryTrasaction = require('../models/hrSalaryTransaction');
const path = require('path');

const {
  userAttributes,
  companyAttributes,
  basicPaymentOptionsArray,
  statusCodes,
} = require('../utils/commonVars');
const {
  employeeDepartment,
  employeeDesignation,
  employeeBranch,
  getAllUserByCompanyDateWise,
  getAllUserByBranchDateWise,
  isValidDate,
  asiaKolkataDateTime,
} = require('../utils/commonUtilFunctions');

const {
  generateExcel,
  generateDemoExcelForAdvance,
} = require('../utils/exportData');
const { getAllUsers } = require('./companyContact.controller');
const EmployeeBranch = require('../models/employeeBranch');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const moment = require('moment');
const { FileUploadType } = require('../utils/dbUtils');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const {
  uploadImportExcelFilePath,
  deleteFileFromServer,
} = require('../middleware/uploadFile');
exports.postAddAdvancePaymentdata = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      userMasterID,
      description,
      amount,
      advanceDate,
      paymentYearMonth,
      paymentmode,
      referenceNO,
      referenceDate,
      AdvanceStatus,
    } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    if (AdvanceStatus != 0) {
      AdvanceStatus = 1;
    }
    const userData = await UserMaster.findOne({
      raw: true,
      where: {
        userMasterID: userMasterID,
      },
    });
    const createdAdvance = await advancePayment.create(
      {
        userMasterID,
        companyMasterID: userData.companyMasterId,
        description,
        amount,
        advanceDate,
        paymentYearMonth,
        paymentmode,
        referenceNO,
        referenceDate,
        createBy,
        createByIp,
        AdvanceStatus,
      },
      { transaction },
    );
    if (AdvanceStatus == 0) {
      await UserInbox.create(
        {
          activityTable: advancePayment.getTableName(),
          activityTablePK: createdAdvance.toJSON().advancePaymentID,
          message: `${userData.displayName} has appiled for Advance of ${amount}`,
          assignedBy: userMasterID,
        },
        {
          transaction,
        },
      );
    }
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Advance Payment'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

//**
// Get Advance By CompanyID
// */

exports.getadvanceByCompanyid = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      searchQuery,
      startdate,
      enddate,
      companyMasterID,
      branchMasterID,
      userMasterID,
      exportData,
      AdvanceStatus,
    } = await req.body;

    const paginationQuery = {};
    const condition = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['createdAt', 'DESC']];
    condition.companyMasterID = companyMasterID;

    condition.status = [0, 1];

    if (userMasterID && userMasterID.length > 0)
      condition.userMasterID = userMasterID;

    if (startdate && enddate)
      condition.advanceDate = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          '$userMaster.displayName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (AdvanceStatus) {
      condition.AdvanceStatus = AdvanceStatus;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows: allAdvanceData, count } =
      await advancePayment.findAndCountAll({
        distinct: true,
        raw: true,
        where: condition,
        ...paginationQuery,
        order,
        required: true,

        include: [
          {
            required: true,
            model: UserMaster,
            attributes: [
              'userMasterID',
              'companyMasterId',
              'firstName',
              'middleName',
              'lastName',
              'displayName',
              'userNumber',
              'photo',
            ],
            where: { ...userAccessCondition.where },
            include: [
              ...userAccessCondition.includeModels,
              {
                required: branchMasterID ? true : false,
                model: EmployeeBranch,
                where: {
                  ...(branchMasterID && { branchID: branchMasterID }),
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
              {
                model: companyMaster,
                attributes: ['companyName'],
              },
              {
                model: EmployeeJoiningDetails,
                attributes: ['employeeCode'],
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
        ],
      });

    if (exportData) {
      const finaldata = allAdvanceData.map((e) => {
        return {
          'Employee Code':
            e['userMaster.employeeJoiningDetails.employeeCode'] || '',
          'Employee Name': e['userMaster.displayName'],
          'Employee Number': e['userMaster.userNumber'],
          Company: e['userMaster.companyMaster.companyName'] || '',
          Branch:
            e['userMaster.employeeBranches.branchMaster.branchName'] || '',
          Department:
            e['userMaster.employeeDepartments.department.departmentName'] || '',
          Designation:
            e['userMaster.employeeDesignations.designation.designationName'] ||
            '',
          Division:
            e['userMaster.employeeDivisions.division.divisionName'] || '',
          'Working Area':
            e['userMaster.employeeWorkingAreas.workingArea.workingAreaName'] ||
            '',

          Amount: e.amount,
          'Advance Given Date': e.advanceDate
            ? moment(e.advanceDate, 'YYYY-MM-DD').format('DD-MM-YYYY')
            : '',
          'Deduction YearMonth': e.paymentYearMonth,
          'Advance Mode': e.paymentmode,
          Description: e.description,
          RejectionRemark: e.RejectionRemark,
          Status: e.status == 0 ? 'Deactive' : 'Active',
          AdvanceStatus:
            e.AdvanceStatus === 1
              ? 'Approved'
              : e.AdvanceStatus === 2
                ? 'Rejected'
                : 'Pending',
        };
      });

      return await generateExcel(finaldata, 'AdvancePayment', 'xlsx', res);
    }

    return res.status(200).json({
      status: 200,
      data: allAdvanceData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * find data with AttendanceTransID
 *
 */
exports.getAdvancePaymentById = async (req, res, next) => {
  try {
    const getAdvancePaymentByID = await advancePayment.findOne({
      where: {
        advancePaymentID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      raw: true,
    });

    if (!getAdvancePaymentByID) {
      return res.status(200).json({
        status: 200,
        message: message.usermessage.notFoundMessage('Advance Payment'),
      });
    }

    return res.status(200).json({ status: 200, data: getAdvancePaymentByID });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Data
 */
exports.postUpdateAdvancepayment = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      advancePaymentID,
      userMasterID,
      description,
      amount,
      advanceDate,
      paymentYearMonth,
      paymentmode,
      referenceNO,
      referenceDate,
      AdvanceStatus,
    } = await req.body;

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    AdvanceStatus = 1;

    await advancePayment.update(
      {
        userMasterID,
        description,
        amount,
        advanceDate,
        paymentYearMonth,
        paymentmode,
        referenceNO,
        referenceDate,
        updateBy,
        updateByIp,
        AdvanceStatus,
      },
      {
        where: { advancePaymentID: advancePaymentID },
      },
      {
        transaction,
      },
    );

    await UserInbox.destroy(
      {
        where: {
          activityTable: advancePayment.getTableName(),
          activityTablePK: advancePaymentID,
        },
      },
      { transaction },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Advance Payment'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * delete by advancePaymentID
 */
exports.postDeleteAdavancePaymentById = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let advancePaymentID = req.params.id;
    const totalAdvance = await advancePayment.findOne({
      where: {
        advancePaymentID: advancePaymentID,
        status: ['0', '1'],
      },
      transaction,
    });
    if (totalAdvance.tablereferenceID != null) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message:
          "You can't delete this AdvancePayment because it's Payment are paid !!",
      });
    }

    await advancePayment.update(
      {
        status: 2,
      },
      {
        where: { advancePaymentID: advancePaymentID },
      },
      {
        transaction,
      },
    );

    await UserInbox.destroy(
      {
        where: {
          activityTable: advancePayment.getTableName(),
          activityTablePK: totalAdvance.toJSON().advancePaymentID,
        },
      },
      {
        transaction,
      },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Advance Payment'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
//////
exports.postDeleteAdavancePaymentByIdV2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    // let advancePaymentID = req.params.id;
    const { advancePaymentID, userMasterID } = req.body;

    if (!advancePaymentID || !userMasterID) {
      await transaction.rollback();
      return res
        .status(200)
        .json({ status: 400, message: 'Invalid paremeters' });
    }
    const totalAdvance = await advancePayment.findOne({
      where: {
        advancePaymentID: advancePaymentID,
        userMasterID: userMasterID,
        status: ['0', '1'],
      },
      transaction,
    });

    if (!totalAdvance) {
      await transaction.rollback();
      return res.status(200).json({ status: 400, message: 'Data not found' });
    }

    if (totalAdvance.tablereferenceID != null) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message:
          "You can't delete this AdvancePayment because it's Payment are paid !!",
      });
    }

    await advancePayment.update(
      {
        status: 2,
      },
      {
        where: { advancePaymentID: advancePaymentID },
      },
      {
        transaction,
      },
    );

    await UserInbox.destroy(
      {
        where: {
          activityTable: advancePayment.getTableName(),
          activityTablePK: totalAdvance.toJSON().advancePaymentID,
        },
      },
      {
        transaction,
      },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Advance Payment'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * Update Status
 **/

exports.poststatuschange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { advancePaymentID, status } = await req.body;
    await advancePayment.update(
      {
        status: status,
      },
      {
        where: { advancePaymentID: advancePaymentID, status: ['1', '0'] },
      },
      {
        transaction,
      },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Advance Payment')
          : message.usermessage.deactiveMessage('Advance Payment'),
      data: {},
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getadvanceByUserid = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      searchQuery,
      startdate,
      enddate,
      userMasterID,
      AdvanceStatus,
    } = await req.body;

    const paginationQuery = {};
    const condition = {};

    condition.status = [0, 1];

    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['createdAt', 'DESC']];

    if (userMasterID && Array.isArray(userMasterID) && userMasterID.length) {
      condition.userMasterID = {
        [Sequelize.Op.in]: userMasterID,
      };
    } else if (userMasterID) {
      const userid = [];
      userid.push(parseInt(userMasterID));
      condition.userMasterID = {
        [Sequelize.Op.in]: userid,
      };
    }

    if (startdate && enddate) {
      condition.advanceDate = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
    }

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          description: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          amount: {
            [Sequelize.Op.eq]: searchQuery,
          },
        },
      ];
    if (AdvanceStatus) {
      condition.AdvanceStatus = AdvanceStatus;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const { rows: advancepayment, count } =
      await advancePayment.findAndCountAll({
        where: condition,
        ...paginationQuery,
        order,
        include: [
          {
            model: UserMaster,
            required: true,
            as: 'userMaster',
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
          },
          {
            model: companyMaster,
            as: 'companyMaster',
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
        ],
      });

    return res
      .status(200)
      .json({ status: 200, data: advancepayment, totalcount: count });
  } catch (err) {
    next(err);
  }
};

exports.getadvanceByUseridV2 = async (req, res, next) => {
  try {
    let {
      limit,
      page,
      searchQuery,
      startdate,
      enddate,
      userMasterID,
      AdvanceStatus,
    } = await req.body;

    if (req.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }

    const paginationQuery = {};
    const condition = {};

    condition.status = [0, 1];

    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['createdAt', 'DESC']];

    if (userMasterID && Array.isArray(userMasterID) && userMasterID.length) {
      condition.userMasterID = {
        [Sequelize.Op.in]: userMasterID,
      };
    } else if (userMasterID) {
      const userid = [];
      userid.push(parseInt(userMasterID));
      condition.userMasterID = {
        [Sequelize.Op.in]: userid,
      };
    }

    if (startdate && enddate) {
      condition.advanceDate = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
    }

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          description: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          amount: {
            [Sequelize.Op.eq]: searchQuery,
          },
        },
      ];
    if (AdvanceStatus) {
      condition.AdvanceStatus = AdvanceStatus;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const { rows: advancepayment, count } =
      await advancePayment.findAndCountAll({
        where: condition,
        ...paginationQuery,
        order,
        include: [
          {
            model: UserMaster,
            required: true,
            as: 'userMaster',
            where: { ...userAccessCondition.where },
            include: [...userAccessCondition.includeModels],
          },
          {
            model: companyMaster,
            as: 'companyMaster',
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
        ],
      });

    return res
      .status(200)
      .json({ status: 200, data: advancepayment, totalcount: count });
  } catch (err) {
    next(err);
  }
};

exports.postStatusrequest = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { advancePaymentID, AdvanceStatus, RejectionRemark } = await req.body;

    await advancePayment.update(
      {
        AdvanceStatus: AdvanceStatus,
        RejectionRemark: RejectionRemark,
      },
      {
        where: {
          advancePaymentID: advancePaymentID,
        },
      },
      {
        transaction,
      },
    );

    await UserInbox.destroy(
      {
        where: {
          activityTable: advancePayment.getTableName(),
          activityTablePK: advancePaymentID,
        },
      },
      { transaction },
    );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message:
        AdvanceStatus == '1'
          ? message.usermessage.acceptMesaage('Advance Payment')
          : message.usermessage.rejectMessage('Advance Payment'),
      data: {},
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.postAddRequestAdvancePaymentdata = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { userMasterID, description, amount } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    if (req?.userDetails.isMyUserDetails) {
      userMasterID = req.userDetails.userMasterId;
    }

    const userData = await UserMaster.findOne({
      raw: true,
      where: {
        userMasterID: userMasterID,
      },
    });
    const addAdvancePayment = await advancePayment.create(
      {
        userMasterID,
        companyMasterID: userData.companyMasterId,
        description,
        amount,
        createBy,
        createByIp,
      },
      { transaction },
    );

    await UserInbox.create(
      {
        activityTable: advancePayment.getTableName(),
        activityTablePK: addAdvancePayment.toJSON().advancePaymentID,
        message: `${userData.displayName} has appiled for Advance of ${amount}`,
        assignedBy: userMasterID,
      },
      {
        transaction,
      },
    );

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Advance Request'),
      data: addAdvancePayment,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.advancedatashow = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      companyMasterID,
      advancestatus,
      exportData,
      exportFileType,
      startdate,
      searchQuery,
      enddate,
    } = await req.body;

    const condition = {};

    if (companyMasterID) {
      condition.companyMasterID = companyMasterID;
    }

    if (advancestatus) condition.AdvanceStatus = advancestatus;

    condition.status = 1;

    if (startdate && enddate) {
      condition.createdAt = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
    }

    const userSearchCondition = {};
    if (searchQuery)
      userSearchCondition[Sequelize.Op.or] = [
        { displayName: { [Sequelize.Op.iLike]: `%${searchQuery}%` } },
      ];
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginationQuery = {};

    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const advancedata = await advancePayment.findAndCountAll({
      order: [['createdAt', 'DESC']],
      where: condition,
      ...paginationQuery,

      include: [
        {
          model: UserMaster,
          attributes: userAttributes,
          where: {
            ...userSearchCondition,
            ...userAccessCondition.includeModels,
          },
          required: true,
          include: [
            ...userAccessCondition.includeModels,
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
          ],
        },
        { model: companyMaster, attributes: companyAttributes },
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
      ],
    });

    async function processRow(row) {
      return {
        UserName: row.userMaster.displayName || '',
        UserNumber: row.userMaster.userNumber || '',
        CompanyName: row.companyMaster.companyName || '',
        BranchName:
          row.userMaster.employeeDesignations.length > 0
            ? row.userMaster.employeeDesignations[0].designation.designationName
            : '',
        Designation:
          row.userMaster.employeeBranches.length > 0
            ? row.userMaster.employeeBranches[0].branchMaster.branchName
            : '',
        Department:
          row.userMaster.employeeDepartments.length > 0
            ? row.userMaster.employeeDepartments[0].department.departmentName
            : '',
        Status: checkStatus(row.AdvanceStatus),
        AdvanceAmount: row.amount || '',
        Description: row.description || '',
        PaymentYearMonth: row.paymentYearMonth || '',
        AdvanceDate: row.advanceDate
          ? moment(row.advanceDate, 'YYYY-MM-DD').format('DD-MM-YYYY')
          : '',
        Paymentmode: row.paymentmode || '',
      };
    }

    function checkStatus(AdvanceStatus) {
      if (AdvanceStatus == 1) {
        return 'Approved';
      } else if (AdvanceStatus == 2) {
        return 'Rejected';
      } else if (AdvanceStatus == 0) {
        return 'Pending';
      } else {
        return '';
      }
    }

    if (exportData) {
      const updatedDownloadRows = await Promise.all(
        advancedata.rows.map(processRow),
      );

      await generateExcel(
        updatedDownloadRows,
        'Company-Advance-Report',
        exportFileType,
        res,
      );
      return;
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.fetchMessage('Loan'),
      data: advancedata,
    });
  } catch (err) {
    next(err);
  }
};

exports.exportDemoexcel = async (req, res, next) => {
  try {
    let { companyMasterID, branchMasterID } = req.query;

    if (!companyMasterID)
      return res.status(statusCodes.OK).json({
        status: statusCodes.BAD_REQUEST,
        message: message.usermessage.requiredMessage('companyMasterID'),
      });

    const date = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    const allUser = await UserMaster.findAll({
      where: {
        status: 1,
        companyMasterId: companyMasterID,
        ...userAccessCondition.where,
      },
      include: [
        ...userAccessCondition.includeModels,
        {
          model: EmployeeJoiningDetails,
          where: {
            joiningDate: {
              [Sequelize.Op.lte]: date,
            },
            [Sequelize.Op.or]: [
              {
                leavingDate: { [Sequelize.Op.gte]: date },
              },
              {
                leavingDate: { [Sequelize.Op.is]: null },
              },
            ],
          },
          attributes: ['employeeCode'],
        },
        {
          required: branchMasterID ? true : false,
          model: EmployeeBranch,
          where: {
            status: 1,
            ...(branchMasterID && { branchID: branchMasterID }),
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
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
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
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
            applicableDate: { [Sequelize.Op.lte]: new Date(date) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(date) } },
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
          required: true,
          model: companyMaster,
          attributes: companyAttributes,
        },
      ],
      attributes: ['displayName', 'userNumber'],
      order: [['displayName', 'ASC']],
    });

    const fileUploadType =
      allUser?.[0]?.companyMaster?.fileUploadType ||
      FileUploadType.MOBILE_NUMBER;

    // const isEmployeeCode =
    //   fileUploadType === FileUploadType.EMPLOYEE_CODE;

    const finalData = [];

    for (const user of allUser) {
      const employeeCode = user.employeeJoiningDetails?.[0]?.employeeCode;

      // if (isEmployeeCode && !employeeCode) continue;

      finalData.push({
        'Employee Code': employeeCode || '',
        'Employee Name': user.displayName,
        Branch: user.employeeBranches?.[0]?.branchMaster?.branchName || '',
        Department:
          user.employeeDepartments?.[0]?.department?.departmentName || '',
        Designation:
          user.employeeDesignations?.[0]?.designation?.designationName || '',
        'Employee Number': user.userNumber || '',
        'Advance Amount': '',
        'Advance Date (YYYY-MM-DD)': '',
        'Payment Mode': '',
        'Reference No.': '',
        'Reference Date': '',
        Description: '',
      });
    }

    return await generateDemoExcelForAdvance(
      finalData,
      'Advance Payment',
      'xlsx',
      res,
    );
  } catch (error) {
    next(error);
  }
};

exports.validateUploadExcel = async (req, res, next) => {
  if (!req.file) {
    return res
      .status(200)
      .send({ status: 400, message: 'Please upload an excel file!' });
  }

  const filePath = path.join(
    __dirname,
    `${uploadImportExcelFilePath}/${req.file.filename}`,
  );

  try {
    const { companyMasterID, branchMasterID, month } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIP = req.userDetails.userIpAddress;
    const date = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    if (!companyMasterID) {
      return res.status(200).json({
        status: 400,
        message: message.usermessage.requiredMessage('companyMasterID'),
      });
    }

    const companyMasterData = await companyMaster.findOne({
      where: {
        companyMasterID: companyMasterID,
      },
      attributes: ['fileUploadType'],
    });

    let fileUploadType = FileUploadType.MOBILE_NUMBER;
    const employeeCodeCondition = {};
    if (companyMasterData.fileUploadType == FileUploadType.EMPLOYEE_CODE) {
      fileUploadType = FileUploadType.EMPLOYEE_CODE;
      employeeCodeCondition.employeeCode = {
        [Sequelize.Op.ne]: null,
      };
    }

    const [findAllUsersData, findAllSalaryData] = await Promise.all([
      // findAllUsersData
      UserMaster.findAll({
        // raw: true,
        where: {
          companyMasterId: companyMasterID,
          status: 1,
          ...userAccessCondition.where,
        },
        include: [
          ...userAccessCondition.includeModels,
          {
            required: branchMasterID ? true : false,
            model: EmployeeBranch,
            where: {
              status: 1,
              ...(branchMasterID && { branchID: branchMasterID }),
              applicableDate: { [Sequelize.Op.lte]: new Date(date) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(date) } },
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
            model: EmployeeDesignation,
            where: {
              status: 1,
              applicableDate: { [Sequelize.Op.lte]: new Date(date) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(date) } },
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
              applicableDate: { [Sequelize.Op.lte]: new Date(date) },
              [Sequelize.Op.or]: [
                { endDate: { [Sequelize.Op.gte]: new Date(date) } },
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
            required: true,
            model: companyMaster,
            attributes: companyAttributes,
          },
          {
            required: true,
            model: EmployeeJoiningDetails,
            attributes: ['employeeCode'],
            where: employeeCodeCondition,
          },
        ],
      }),
      HRSalaryTrasaction.findAll({
        where: {
          // userMasterID: userMasterID,
          salaryYYYYMM: month,
        },
        include: [
          {
            required: true,
            model: UserMaster,
            where: {
              companyMasterId: companyMasterID,
              ...userAccessCondition.where,
            },
            include: [...userAccessCondition.includeModels],
          },
        ],
      }),
    ]);

    const rows = await readXlsxFile(filePath);
    deleteFileFromServer(filePath);
    // Skip header
    rows.shift();

    const finalData = [];
    for (const row of rows) {
      const advancedata = {
        userMasterID: null,
        companyMasterID: null,
        branchMasterID: null,
        departmentId: null,
        designationId: null,
        displayName: row[1],
        company: '',
        branch: '',
        department: '',
        designation: '',
        userNumber: '',
        employeeCode: '',
        amount: row[6],
        advanceDate: row[7],
        paymentmode: row[8],
        referenceNO: row[9],
        referenceDate: row[10],
        description: row[11],
        paymentYearMonth: month,
        createBy: createBy,
        createByIp: createByIP,
        AdvanceStatus: 1, // approved
        remarks: '',
      };
      const number = typeof row[5] === 'number' ? row[5].toString() : row[5];

      if (!number) {
        advancedata.remarks =
          fileUploadType == FileUploadType.MOBILE_NUMBER
            ? `Mobile No. is require for : ${advancedata.displayName}`
            : `Employee Code is require for : ${advancedata.displayName}`;
        finalData.push(advancedata);
        continue;
      }

      let userData = null;

      if (fileUploadType == FileUploadType.MOBILE_NUMBER) {
        userData = findAllUsersData.find((e) => e.userNumber == row[5]);
      } else {
        userData = findAllUsersData.find(
          (e) => e.employeeJoiningDetails[0].employeeCode == row[0],
        );
      }

      if (userData) {
        advancedata.userMasterID = userData.userMasterID;
        advancedata.userNumber = userData.userNumber;
        advancedata.employeeCode =
          userData.employeeJoiningDetails &&
          userData.employeeJoiningDetails.length > 0
            ? userData.employeeJoiningDetails[0].employeeCode
            : '';
        advancedata.companyMasterID = userData.companyMasterId;
        advancedata.branchMasterID =
          userData.employeeBranches && userData.employeeBranches.length > 0
            ? userData.employeeBranches[0].branchID
            : null;
        advancedata.departmentId =
          userData.employeeDepartments &&
          userData.employeeDepartments.length > 0
            ? userData.employeeDepartments[0].departmentID
            : null;
        advancedata.designationId =
          userData.employeeDesignations &&
          userData.employeeDesignations.length > 0
            ? userData.employeeDesignations[0].designationID
            : null;
        advancedata.displayName = userData.displayName;
        advancedata.company = userData.companyMaster.companyName;
        advancedata.branch =
          userData.employeeBranches && userData.employeeBranches.length > 0
            ? userData.employeeBranches[0].branchMaster
              ? userData.employeeBranches[0].branchMaster.branchName
              : ''
            : '';
        advancedata.department =
          userData.employeeDepartments &&
          userData.employeeDepartments.length > 0
            ? userData.employeeDepartments[0].department
              ? userData.employeeDepartments[0].department.departmentName
              : ''
            : '';
        advancedata.designation =
          userData.employeeDesignations &&
          userData.employeeDesignations.length > 0
            ? userData.employeeDesignations[0].designation
              ? userData.employeeDesignations[0].designation.designationName
              : ''
            : '';
        if (
          advancedata.amount != null &&
          advancedata.amount > 0 &&
          typeof advancedata.amount === 'number'
        ) {
          // check Advance Date

          if (!advancedata.advanceDate) {
            advancedata.remarks = 'Advance Date is required';
          }

          if (
            advancedata.advanceDate &&
            typeof advancedata.advanceDate == 'number'
          ) {
            advancedata.advanceDate = new Date(
              Math.round(advancedata.advanceDate - 25569) * 86400 * 1000,
            )
              .toISOString()
              .slice(0, 10);
          } else if (advancedata.advanceDate) {
            if (isValidDate(advancedata.advanceDate) === true) {
              advancedata.advanceDate = new Date(`${advancedata.advanceDate}`)
                .toISOString()
                .slice(0, 10);
            } else {
              advancedata.advanceDate = '';
              advancedata.remarks =
                "Advance date Should be in 'yyyy-mm-dd' Format";
            }
          }

          // check payment Mode

          let paymentMode = '';

          if (!advancedata.paymentmode) {
            advancedata.remarks = `Payment Mode is required`;
          }
          const paymentModes = basicPaymentOptionsArray;
          if (
            advancedata.paymentmode &&
            !paymentModes.includes(advancedata.paymentmode)
          ) {
            advancedata.remarks = `Select Payment Mode from Dropdown`;
          }
          // paymentMode = row[4];

          //check Reference Date

          let referenceDate = null;
          if (advancedata.paymentmode) {
            if (advancedata.paymentmode != 'Cash') {
              if (!advancedata.referenceDate) {
                advancedata.remarks = 'Reference Date is required';
              }

              if (
                advancedata.referenceDate &&
                typeof advancedata.referenceDate == 'number'
              ) {
                advancedata.referenceDate = new Date(
                  Math.round(advancedata.referenceDate - 25569) * 86400 * 1000,
                )
                  .toISOString()
                  .slice(0, 10);
              } else {
                if (
                  advancedata.referenceDate &&
                  isValidDate(advancedata.referenceDate) === true
                ) {
                  advancedata.referenceDate = new Date(
                    `${advancedata.referenceDate}`,
                  )
                    .toISOString()
                    .slice(0, 10);
                } else {
                  advancedata.referenceDate = '';
                  advancedata.remarks ==
                    "Reference Date Should be in 'yyyy-mm-dd' Format";
                }
              }
            }
          }
          if (!advancedata.description) {
            advancedata.remarks = 'Description is required';
          }

          const salary = findAllSalaryData
            ? findAllSalaryData.find(
                (e) => e.userMasterID == advancedata.userMasterID,
              )
            : null;

          if (salary) {
            advancedata.remarks =
              'salary is calculated, So, you can not add advance.';
          }
        }
      } else {
        advancedata.remarks =
          'User Not Found ' + ': ' + advancedata.displayName;
        finalData.push(advancedata);
        continue;
      }

      finalData.push(advancedata);
    }
    deleteFileFromServer(filePath);
    return res.status(200).json({
      status: 200,
      message: message.usermessage.validateMessage('Advance Payment'),
      data: finalData,
    });
  } catch (error) {
    next(error);
  }
};

exports.revalidateAdvancePayment = async (req, res, next) => {
  try {
    const { advancepaymentData, companyMasterID, branchMasterID, month } =
      req.body;

    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const [findAllSalaryData] = await Promise.all([
      HRSalaryTrasaction.findAll({
        where: {
          salaryYYYYMM: month,
        },
        include: [
          {
            required: true,
            model: UserMaster,
            where: {
              companyMasterId: companyMasterID,
              ...userAccessCondition.where,
            },
            include: [...userAccessCondition.includeModels],
          },
        ],
      }),
    ]);
    const advanceData = [];

    for (const row of advancepaymentData) {
      if (!row.userMasterID) {
        advanceData.push(row);
        continue;
      }
      row.remarks = '';
      if (
        row.amount != null &&
        row.amount > 0 &&
        typeof row.amount === 'number'
      ) {
        if (!row.advanceDate) {
          row.remarks = 'Advance Date is required';
        }

        if (!row.paymentmode) {
          row.remarks = `Payment Mode is required`;
        }
        if (row.paymentmode != 'Cash') {
          if (!row.referenceDate) {
            row.remarks = 'Reference Date is required';
          }

          if (row.referenceDate && typeof row.referenceDate == 'number') {
            row.referenceDate = new Date(
              Math.round(row.referenceDate - 25569) * 86400 * 1000,
            )
              .toISOString()
              .slice(0, 10);
          } else {
            if (row.referenceDate && isValidDate(row.referenceDate) === true) {
              row.referenceDate = new Date(`${row.referenceDate}`)
                .toISOString()
                .slice(0, 10);
            } else {
              row.referenceDate = '';
              row.remarks == "Reference Date Should be in 'yyyy-mm-dd' Format";
            }
          }
        }
        const salary = findAllSalaryData
          ? findAllSalaryData.find((e) => e.userMasterID == row.userMasterID)
          : null;

        if (salary) {
          row.remarks = 'salary is calculated, So, you can not add advance.';
        }
      }
      advanceData.push(row);
    }
    return res.status(200).json({
      status: 200,
      message: message.usermessage.reValidateMessage('Advance Payment'),
      data: advanceData,
    });
  } catch (error) {
    next(error);
  }
};

exports.addValidateAdvancePayment = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { advancepaymentData } = req.body;
    const addAdvanceData = [];
    for (const row of advancepaymentData) {
      const advanceObject = {
        userMasterID: row.userMasterID,
        companyMasterID: row.companyMasterID,
        description: row.description,
        amount: row.amount,
        advanceDate: row.advanceDate,
        paymentYearMonth: row.paymentYearMonth,
        paymentmode: row.paymentmode,
        referenceNO: row.referenceNO,
        referenceDate: row.referenceDate,
        createBy: req.userDetails.userMasterId,
        createByIp: req.userDetails.userIpAddress,
        AdvanceStatus: row.AdvanceStatus,
      };
      addAdvanceData.push(advanceObject);
    }

    await advancePayment.bulkCreate(addAdvanceData, { transaction });

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Advance Payment'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.updateByReportee = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let { advancePaymentID, description, amount, paymentYearMonth } =
      await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    await advancePayment.update(
      {
        description,
        amount,
        paymentYearMonth,
        updateBy,
        updateByIp,
      },
      {
        where: { advancePaymentID: advancePaymentID },
      },
      {
        transaction,
      },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Advance Payment'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.updateByReporteeV2 = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      advancePaymentID,
      description,
      amount,
      paymentYearMonth,
      userMasterID,
    } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    const editData = await advancePayment.findOne({
      where: { advancePaymentID: advancePaymentID, userMasterID, userMasterID },
    });
    if (!editData) {
      await transaction.rollback();
      return res
        .status(200)
        .json({
          status: 400,
          message: 'Advance payment for this user not found',
        });
    }

    await advancePayment.update(
      {
        description,
        amount,
        paymentYearMonth,
        updateBy,
        updateByIp,
      },
      {
        where: { advancePaymentID: advancePaymentID },
      },
      {
        transaction,
      },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Advance Payment'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getuserAdavancedataForReporteeUser = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      searchQuery,
      startdate,
      enddate,
      userMasterID,
      AdvanceStatus,
    } = await req.body;

    const paginationQuery = {};
    const condition = {};

    condition.status = [0, 1];

    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['createdAt', 'DESC']];

    if (userMasterID && Array.isArray(userMasterID) && userMasterID.length) {
      condition.userMasterID = {
        [Sequelize.Op.in]: userMasterID,
      };
    } else if (userMasterID) {
      const userid = [];
      userid.push(parseInt(userMasterID));
      condition.userMasterID = {
        [Sequelize.Op.in]: userid,
      };
    }

    if (startdate && enddate) {
      condition.advanceDate = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
    }

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          description: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          amount: {
            [Sequelize.Op.eq]: searchQuery,
          },
        },
      ];
    if (AdvanceStatus) {
      condition.AdvanceStatus = AdvanceStatus;
    }
    condition.createBy = req.userDetails.userMasterId;
    const { rows: advancepayment, count } =
      await advancePayment.findAndCountAll({
        where: condition,
        ...paginationQuery,
        order,
        include: [
          {
            model: UserMaster,
            required: true,
            as: 'userMaster',
          },
          {
            model: companyMaster,
            as: 'companyMaster',
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
        ],
      });

    return res
      .status(200)
      .json({ status: 200, data: advancepayment, totalcount: count });
  } catch (err) {
    next(err);
  }
};

exports.getadvanceByCompanyid_V2 = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      searchQuery,
      startdate,
      enddate,
      companyMasterID,
      branchMasterID,
      userMasterID,
      exportData,
      AdvanceStatus,
    } = await req.body;

    const paginationQuery = {};
    const condition = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['createdAt', 'DESC']];
    condition.companyMasterID = companyMasterID;

    condition.status = [0, 1];

    if (userMasterID && userMasterID.length > 0)
      condition.userMasterID = userMasterID;

    if (startdate && enddate)
      condition.advanceDate = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          '$userMaster.displayName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (AdvanceStatus) {
      condition.AdvanceStatus = AdvanceStatus;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows: allAdvanceData, count } =
      await advancePayment.findAndCountAll({
        distinct: true,
        where: condition,
        ...paginationQuery,
        order,
        required: true,

        include: [
          {
            required: true,
            model: UserMaster,
            where: { ...userAccessCondition.where },
            attributes: [
              'userMasterID',
              'companyMasterId',
              'firstName',
              'middleName',
              'lastName',
              'displayName',
              'userNumber',
              'photo',
            ],
            include: [
              ...userAccessCondition.includeModels,
              {
                required: branchMasterID ? true : false,
                model: EmployeeBranch,
                where: {
                  ...(branchMasterID && { branchID: branchMasterID }),
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
              {
                model: companyMaster,
                attributes: ['companyName'],
              },
              {
                model: EmployeeJoiningDetails,
                attributes: ['employeeCode'],
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
        ],
      });

    if (exportData) {
      const finaldata = allAdvanceData.map((e) => {
        return {
          'Employee Code':
            e.userMaster?.employeeJoiningDetails?.[0]?.employeeCode || '',
          'Employee Name': e.userMaster?.displayName || '',
          'Employee Number': e.userMaster.userNumber || '',
          Company: e.userMaster?.companyMaster?.companyName || '',
          Branch:
            e.userMaster?.employeeBranches?.[0]?.branchMaster?.branchName || '',
          Department:
            e.userMaster?.employeeDepartments?.[0]?.department
              ?.departmentName || '',
          Designation:
            e.userMaster?.employeeDesignations?.[0]?.designation
              ?.designationName || '',
          Division:
            e.userMaster?.employeeDivisions?.[0]?.division?.divisionName || '',
          'Working Area':
            e.userMaster?.employeeWorkingAreas?.[0]?.workingArea
              ?.workingAreaName || '',
          Amount: e.amount,
          'Advance Given Date': e.advanceDate
            ? moment(e.advanceDate, 'YYYY-MM-DD').format('DD-MM-YYYY')
            : '',
          'Deduction YearMonth': e.paymentYearMonth,
          'Advance Mode': e.paymentmode,
          Description: e.description,
          RejectionRemark: e.RejectionRemark,
          Status: e.status == 0 ? 'Deactive' : 'Active',
          AdvanceStatus:
            e.AdvanceStatus === 1
              ? 'Approved'
              : e.AdvanceStatus === 2
                ? 'Rejected'
                : 'Pending',
        };
      });
      return await generateExcel(finaldata, 'AdvancePayment', 'xlsx', res);
    }

    return res.status(200).json({
      status: 200,
      data: allAdvanceData,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};
