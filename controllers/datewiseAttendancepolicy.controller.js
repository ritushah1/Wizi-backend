const datewiseattendancePolicy = require('../models/datewiseAttendancepolicy');
const logger = require('../config/logger');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const UserMaster = require('../models/userMaster');
const AttendancePolicy = require('../models/attendancePolicy');
const companyMaster = require('../models/companyMaster');
const sequelize = require('../config/database');
const { userAttributes, companyAttributes } = require('../utils/commonVars');
const moment = require('moment');
const { generateExcel } = require('../utils/exportData');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const WorkingArea = require('../models/workingArea');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const Division = require('../models/division');
const EmployeeDivision = require('../models/employeeDivision');
const BranchMaster = require('../models/branchMaster');
const EmployeeBranch = require('../models/employeeBranch');
const Department = require('../models/department');
const EmployeeDepartment = require('../models/employeeDepartment');
const Designation = require('../models/designation');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');

exports.postadddatewisepolicy = async (req, res, next) => {
  try {
    let { userMasterID, fromDate, ToDate } = await req.body;

    const findUserData = await UserMaster.findOne({
      raw: true,
      where: {
        userMasterID: userMasterID,
      },
      attributes: ['companyMasterId'],
    });

    await datewiseattendancePolicy.create(
      {
        userMasterID,
        companyMasterID: findUserData.companyMasterId,
        fromDate,
        ToDate,
      },
      { user: req.userDetails },
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Outside Attendace Permission'),
    });
  } catch (err) {
    next(err.message);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const getdatewisepolicy = await datewiseattendancePolicy.findOne({
      where: {
        datewiseAttendancepolicyID: req.params.id,
      },
    });

    return res.status(200).json({ status: 200, data: getdatewisepolicy });
  } catch (err) {
    next(err);
  }
};

// //update the user data

exports.datewiseupdateData = async (req, res, next) => {
  try {
    let { datewiseAttendancepolicyID, fromDate, ToDate, userMasterID } =
      await req.body;
    const findData = await datewiseattendancePolicy.findOne({
      where: {
        datewiseAttendancepolicyID: datewiseAttendancepolicyID,
        userMasterID: userMasterID,
      },
    });
    if (!findData) {
      return res
        .status(200)
        .json({
          status: 400,
          message: 'Outside Attendance For This User Not Found',
        });
    }
    await datewiseattendancePolicy.update(
      {
        fromDate,
        ToDate,
      },
      {
        where: { datewiseAttendancepolicyID: datewiseAttendancepolicyID },
      },
      { user: req.userDetails },
    );
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage(
        'Outside Attendance Permission',
      ),
    });
  } catch (err) {
    next(err);
  }
};

exports.postDelete = async (req, res, next) => {
  try {
    await datewiseattendancePolicy.destroy({
      where: {
        datewiseAttendancepolicyID: req.body.id,
      },
    });
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage(
        'Outside Attendace Permission',
      ),
    });
  } catch (error) {
    next(error);
  }
};
exports.postDeleteV2 = async (req, res, next) => {
  try {
    const { datewiseAttendancepolicyID, userMasterID } = req.body;
    if (!datewiseAttendancepolicyID || !userMasterID) {
      return res
        .status(200)
        .json({ status: 400, message: 'Please provide valid parameters' });
    }
    const deleteData = await datewiseattendancePolicy.findOne({
      where: {
        datewiseAttendancepolicyID: datewiseAttendancepolicyID,
        userMasterID: userMasterID,
      },
    });

    if (!deleteData) {
      return res.status(200).json({ status: 400, message: 'Data not found' });
    }
    await datewiseattendancePolicy.destroy({
      where: {
        datewiseAttendancepolicyID: deleteData.datewiseAttendancepolicyID,
        userMasterID: userMasterID,
      },
    });
    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage(
        'Outside Attendace Permission',
      ),
    });
  } catch (error) {
    next(error);
  }
};

exports.getalldatabyid = async (req, res, next) => {
  try {
    let {
      limit,
      page,
      companyMasterID,
      userMasterID,
      startdate,
      enddate,
      searchQuery,
      exportData,
    } = await req.body;

    if(req.userDetails.isMyUserDetails){
      userMasterID=req.userDetails.userMasterId
    }

    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const endDate = enddate || moment().format('YYYY-MM-DD');

    const condition = {
      '$userMaster.status$': 1,
    };
    if (userMasterID && userMasterID.length > 0)
      condition.userMasterID = userMasterID;

    if (companyMasterID) {
      // req.userDetails.accessibleCompanies = companyMasterID;
      condition.companyMasterID = companyMasterID;
    }

    if (startdate && enddate) {
      condition.fromDate = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
      condition.ToDate = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(enddate)],
      };
    }

    if (searchQuery)
      condition[Sequelize.Op.or] = [
        {
          '$userMaster.displayName$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const { rows: getDatewiseAttedancePolicy, count } =
      await datewiseattendancePolicy.findAndCountAll({
        where: condition,
        ...paginationQuery,
        include: [
          {
            required: true,
            model: UserMaster,
            where: {
              status: 1,
              ...userAccessCondition.where,
            },
            include: [
              ...userAccessCondition.includeModels,
              {
                required: true,
                model: EmployeeJoiningDetails,
                as: 'emp_join',
                attributes: ['employeeCode'],
              },
              {
                model: EmployeeDesignation,
                as: 'emp_desig',
                where: {
                  status: 1,
                  applicableDate: { [Sequelize.Op.lte]: endDate },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: endDate } },
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
                as: 'emp_dept',
                where: {
                  status: 1,
                  applicableDate: { [Sequelize.Op.lte]: endDate },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: endDate } },
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
                as: 'emp_branch',
                where: {
                  status: 1,
                  applicableDate: { [Sequelize.Op.lte]: endDate },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: endDate } },
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
                model: EmployeeDivision,
                as: 'emp_div',
                where: {
                  status: 1,
                  startDate: { [Sequelize.Op.lte]: endDate },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: endDate } },
                    { endDate: { [Sequelize.Op.eq]: null } },
                  ],
                },

                required: false,
                attributes: ['divisionId'],
                include: [
                  {
                    model: Division,
                    attributes: ['divisionName'],
                  },
                ],
              },
              {
                model: EmployeeWorkingArea,
                as: 'emp_area',
                where: {
                  status: 1,
                  startDate: { [Sequelize.Op.lte]: endDate },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: endDate } },
                    { endDate: { [Sequelize.Op.eq]: null } },
                  ],
                },

                required: false,
                attributes: ['workingAreaId'],
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
            as: 'createdByUserDetails',
            attributes: userAttributes,
          },
          {
            model: UserMaster,
            as: 'updatedByUserDetails',
            attributes: userAttributes,
          },
          {
            model: companyMaster,
            attributes: companyAttributes,
          },
        ],
        order: [['fromDate', 'DESC']],
      });
    if (exportData) {
      const finaldata = getDatewiseAttedancePolicy.map((e) => {
        return {
          'Company Name': e.companyMaster?.companyName,
          'Employee Code': e.userMaster?.emp_join?.[0]?.employeeCode || '',
          'Employee Name': e.userMaster?.displayName,
          Branch: e.userMaster?.emp_branch?.[0]?.branchMaster?.branchName || '',
          Department:
            e.userMaster?.emp_dept?.[0]?.department?.departmentName || '',
          Designation:
            e.userMaster?.emp_desig?.[0]?.designation?.designationName || '',
          Division: e.userMaster?.emp_div?.[0]?.division?.divisionName || '',
          WorkingArea:
            e.userMaster?.emp_area?.[0]?.workingArea?.workingAreaName || '',
          'From Date': moment(e.fromDate, 'YYYY-MM-DD').format('DD-MM-YYYY'),
          'To Date': moment(e.ToDate, 'YYYY-MM-DD').format('DD-MM-YYYY'),
          'Create By': e.createBy
            ? `${e.createdByUserDetails?.displayName} On ${moment(e.createdAt).format('DD-MM-YYYY HH:mm')}`
            : '',
          'Update By': e.updateBy
            ? `${e.updatedByUserDetails?.displayName} On ${moment(e.updatedAt).format('DD-MM-YYYY HH:mm')}`
            : '',
        };
      });

      return await generateExcel(finaldata, 'Outside Attendace', 'xlsx', res);
    }
    return res.status(200).json({
      status: 200,
      data: getDatewiseAttedancePolicy,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};
