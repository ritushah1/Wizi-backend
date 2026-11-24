const CallFollowup = require('../models/callfollowup');
const logger = require('../config/logger');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const UserMaster = require('../models/userMaster');
const Customer = require('../models/customer');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');
const { generateExcel } = require('../utils/exportData');
const {
  userAttributes,
  companyAttributes,
  statusCodes,
} = require('../utils/commonVars');
const moment = require('moment');
const CityMaster = require('../models/citymaster');
const StateMaster = require('../models/statemaster');
const CountryMaster = require('../models/countrymaster');
const companyMaster = require('../models/companyMaster');
const CustomerIndustry = require('../models/customerIndustry');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.postAddCallFollowup = async (req, res, next) => {
  try {
    let {
      visitID,
      customerCompanyID,
      callDateTime,
      estimatedTime,
      remarks,
      callFollowUpStatus,
      userMasterID,
      contactPersonName,
      contactPersonNumber,
      status,
    } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    let result = await sequelize.transaction(async (t) => {
      let insert_db_status = await CallFollowup.create(
        {
          visitID,
          customerCompanyID,
          callDateTime,
          estimatedTime,
          remarks,
          callFollowUpStatus,
          userMasterID,
          contactPersonName,
          contactPersonNumber,
          status,
          createBy,
          createByIp,
        },
        { transaction: t },
      );
      res.status(200).json({
        status: 200,
        message: message.usermessage.callfollowupadd,
        data: insert_db_status,
      });
      return insert_db_status;
    });
  } catch (err) {
    next(err.message);
  }
};

/**
 * find data with CallFollowup id
 *
 * @param {id} CallFollowupID  to fetch callfollowup name
 */

exports.getCallFollowupId = async (req, res, next) => {
  try {
    let get_one_data = await CallFollowup.findOne({
      where: { callFollowUpID: req.params.id, status: ['0', '1'] },
      raw: true,
    });
    if (!get_one_data)
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    else res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

/**
 * update data
 *
 * @param {id} CallFollowupID  to update id
 */
exports.postUpdateCallFollowup = async (req, res, next) => {
  try {
    let {
      callFollowUpID,
      visitID,
      customerCompanyID,
      callDateTime,
      estimatedTime,
      remarks,
      callFollowUpStatus,
      userMasterID,
      contactPersonName,
      contactPersonNumber,
      status,
    } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    let result = await sequelize.transaction(async (t) => {
      let change_data_status = await CallFollowup.update(
        {
          visitID,
          customerCompanyID,
          callDateTime,
          estimatedTime,
          remarks,
          callFollowUpStatus,
          userMasterID,
          contactPersonName,
          contactPersonNumber,
          status,
          updateBy,
          updateByIp,
        },
        {
          where: { callFollowUpID: callFollowUpID },
          transaction: t,
        },
      );
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.callfollowupupdate });
      return change_data_status;
    });
  } catch (err) {
    next(err);
  }
};

/**
 * delete by i
 *
 * @param {id} CallFollowupID  to delete id
 */
exports.postDeleteCallFollowupById = async (req, res, next) => {
  try {
    let { callFollowUpID } = await req.body;
    let result = await sequelize.transaction(async (t) => {
      let delete_status = await CallFollowup.update(
        {
          status: '2',
        },
        {
          where: { callFollowUpID: callFollowUpID },
          transaction: t,
        },
      );
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.callfollowupdelete });
      return delete_status;
    });
  } catch (err) {
    next(err);
  }
};

exports.poststatuschange = async (req, res, next) => {
  try {
    let { callFollowUpID, status } = await req.body;
    let delete_status;
    delete_status = await CallFollowup.update(
      {
        status: status,
      },
      {
        where: { callFollowUpID: callFollowUpID, status: ['1', '0'] },
      },
    );

    if (delete_status != 0) {
      res.status(200).json({
        status: 200,
        message: message.usermessage.callfollowupdelete,
        data: {},
      });
    } else {
      res.status(200).json({
        status: 200,
        message: message.usermessage.deletedrecord,
        data: {},
      });
    }
    return delete_status;
  } catch (err) {
    next(err);
  }
};

exports.getCallFollowupuserid = async (req, res, next) => {
  try {
    const {
      limit,
      page,
      searchQuery,
      startdate,
      enddate,
      userMasterID,
      exportData,
      comp_id,
    } = await req.body;

    const paginationQuery = {};
    const condition = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['callDateTime', 'DESC']];
    condition.status = [0, 1];

    if (startdate && enddate)
      condition.callDateTime = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
    if (userMasterID) condition.userMasterID = userMasterID;
    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          contactPersonName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          contactPersonNumber: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];

    if (comp_id) {
      condition.customerCompanyID = comp_id;
    }

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const AllCallFollowUp = await CallFollowup.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: UserMaster,
          required: true,
          where: { ...userAccessCondition.where },
          attributes: userAttributes,
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
        {
          required: true,
          model: Customer,
          include: [
            {
              model: CityMaster,
              attributes: ['cityName', 'stateMasterID'],
              include: [
                {
                  model: StateMaster,
                  attributes: ['stateName', 'countryMasterID'],
                  include: [
                    {
                      model: CountryMaster,
                      attributes: ['countryName'],
                    },
                  ],
                },
              ],
            },
            {
              model: companyMaster,
              attributes: companyAttributes,
            },
            {
              model: CustomerIndustry,
              attributes: ['name'],
              as: 'ci',
            },
          ],
        },
        {
          model: UserMaster,
          as: 'createdBy',
          attributes: userAttributes,
        },
        {
          model: UserMaster,
          as: 'updatedBy',
          attributes: userAttributes,
        },
      ],
    });
    if (exportData) {
      const finalData = AllCallFollowUp?.rows?.map((row) => ({
        'Employee Code':
          row?.userMaster?.employeeJoiningDetails[0]?.employeeCode,
        'Employee Name': row?.userMaster?.displayName,
        Branch: row?.userMaster?.employeeBranches[0]?.branchMaster?.branchName,
        Department:
          row?.userMaster?.employeeDepartments[0]?.department?.departmentName,
        Designation:
          row?.userMaster?.employeeDesignations[0]?.designation
            ?.designationName,
        'Contact Person Name': row?.contactPersonName,
        'Contact Person Number': row?.contactPersonNumber,
        'Call Date Time': moment(row?.callDateTime).format('DD-MM-YYYY HH:mm'),
        Remarks: row?.remarks,
        'Estimated Time': row?.estimatedTime,
        'Customer Name': row?.customer?.customerName,
        'Customer Company': row?.customer?.companyName,
        'Customer Email': row?.customer?.email,
        'Customer Number': row?.customer?.mobileNumber1,
        'Customer Industry': row?.customer?.ci?.name || '',
        Website: row?.customer?.website,
        'Customer Address': row?.customer?.address,
        'Current Location': row?.customer?.currentLocation,
        Lattitude: row?.customer?.latitude,
        Longitude: row?.customer?.longitude,
        City: row?.customer?.cityMaster?.cityName,
        State: row?.customer?.cityMaster?.stateMaster?.stateName,
        Country:
          row?.customer?.cityMaster?.stateMaster?.countryMaster?.countryName,
      }));
      return generateExcel(finalData, 'CallFollowUp', 'xlsx', res);
    }
    return res.status(statusCodes.OK).json({
      status: statusCodes.OK,
      data: AllCallFollowUp.rows,
      totalcount: AllCallFollowUp.count,
    });
  } catch (err) {
    next(err.message);
  }
};

exports.getCallFollowupvisitid = async (req, res, next) => {
  try {
    const { limit, page, searchQuery, startdate, enddate, id } = await req.body;

    const paginationQuery = {};
    const condition = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const order = [['callDateTime', 'DESC']];
    if (id) condition.visitID = id;
    if (startdate && enddate) {
      const futureDate = new Date(new Date(enddate).getTime() + 86400000)
        .toISOString()
        .slice(0, 10);
      condition.callDateTime = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(futureDate)],
      };
    }
    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          contactPersonName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          contactPersonNumber: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    const AllCallFollowUp = await CallFollowup.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: UserMaster,
          required: true,
          where: { ...userAccessCondition.where },
          include: [...userAccessCondition.includeModels],
        },
        { model: Customer },
      ],
    });

    for (var j = 0; j < AllCallFollowUp.rows.length; j++) {
      const user1 = await UserMaster.findOne({
        where: { userMasterID: AllCallFollowUp.rows[j].createBy },
      });
      const user2 = await UserMaster.findOne({
        where: { userMasterID: AllCallFollowUp.rows[j].updateBy },
      });

      if (user1)
        AllCallFollowUp.rows[j].createBy = user1.dataValues.displayName;
      if (user2)
        AllCallFollowUp.rows[j].updateBy = user2.dataValues.displayName;
    }

    return res.status(200).json({
      status: 200,
      data: AllCallFollowUp.rows,
      totalcount: AllCallFollowUp.count,
    });
  } catch (err) {
    next(err.message);
  }
};
