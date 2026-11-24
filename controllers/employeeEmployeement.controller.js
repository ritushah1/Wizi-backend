const message = require('../response_message/message');
const Sequelize = require('sequelize');
const UserMaster = require('../models/userMaster');
const EmployeeEmployeement = require('../models/employeeEmployeement');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Designation = require('../models/designation');
const Department = require('../models/department');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const companyMaster = require('../models/companyMaster');
const { generateExcel } = require('../utils/exportData');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

exports.getEmployeeEmployeementByUserId = async (req, res, next) => {
  try {
    const { rows: get_one_data, count } =
      await EmployeeEmployeement.findAndCountAll({
        where: {
          userMasterID: req.params.id,
          status: 1,
        },
        order: [['applicableDate', 'ASC']],
        include: [{ model: UserMaster, as: 'employee' }],
      });

    return res
      .status(200)
      .json({ status: 200, data: get_one_data, totalcount: count });
  } catch (err) {
    next(err);
  }
};

exports.postDeleteEmployeeEmployeementById = async (req, res, next) => {
  try {
    let { employeeEmployeementId, userMasterID } = await req.body;

    const getEmployeeJoiningDetails = await EmployeeJoiningDetails.findOne({
      where: {
        userMasterID: userMasterID,
        status: 1,
      },
    });

    const employment_data = await EmployeeEmployeement.findOne({
      where: {
        employeeEmployeementId: employeeEmployeementId,
      },
    });

    if (getEmployeeJoiningDetails && employment_data) {
      if (
        getEmployeeJoiningDetails.employment == employment_data.employeement
      ) {
        return res.status(200).json({
          status: 401,
          message:
            'This employeement is set in Employee Joining Details So You cannot delete this employment details.',
        });
      } else {
        await EmployeeEmployeement.destroy({
          where: {
            employeeEmployeementId: employeeEmployeementId,
          },
        });
        return res.status(200).json({
          status: 200,
          message: message.usermessage.deleteMessage('Employee Employement'),
        });
      }
    } else {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('Employee Employment'),
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.toBeConfirmedEmployee = async (req, res, next) => {
  try {
    const {
      users,
      companyMasterID,
      exportData,
      page,
      limit,
      probationLeftDays,
    } = await req.body;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const rawCurrentDate = new Date();
    const halfMonthLaterDate = new Date(rawCurrentDate);
    const days = probationLeftDays ? probationLeftDays : 15;
    halfMonthLaterDate.setDate(halfMonthLaterDate.getDate() + days);
    const formattedCurrentDate = asiaKolkataDateTime(new Date(rawCurrentDate));
    const formattedHalfMonthLaterDate = asiaKolkataDateTime(
      new Date(halfMonthLaterDate),
    );

    const paginationQuery = {};
    if (!exportData && page && limit) {
      paginationQuery.offset = (+page - 1) * +limit;
      paginationQuery.limit = +limit;
    }

    let condition = {
      endDate: {
        [Sequelize.Op.not]: null,
      },
    };

    condition.endDate[Sequelize.Op.lte] = new Date(formattedHalfMonthLaterDate);

    if (users && users.length > 0) condition.userMasterID = users;

    condition.employeement = 'Probation';

    condition.status = 1; // EmployeeEmployeement Status

    if (companyMasterID)
      condition['$employee.companyMasterId$'] = companyMasterID;

    condition['$employee.status$'] = 1; //USer Status
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    const order = [['endDate', 'ASC']];
    const { rows: employeeEmployeementData, count } =
      await EmployeeEmployeement.findAndCountAll({
        // raw: true,
        where: condition,
        ...paginationQuery,
        order,
        attributes: [
          'employeeEmployeementId',
          'employeement',
          'userMasterID',
          'applicableDate',
          'endDate',
        ],
        include: [
          {
            required: true,
            model: UserMaster,
            as: 'employee',
            where: {
              status: 1,
              ...userAccessCondition.where,
            },
            attributes: ['displayName', 'userNumber', 'companyMasterId'],
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
                required: true,
                model: EmployeeJoiningDetails,
                where: {
                  employment: 'Probation',
                },
                // attributes: ['employeeCode'],
              },
              {
                required: false,
                model: companyMaster,
                attributes: ['companyMasterID', 'companyName'],
              },
            ],
          },
        ],
      });

    const finaldata = employeeEmployeementData.map((e) => {
      const formattedExpiryDate = asiaKolkataDateTime(
        new Date(e.endDate),
      ).slice(0, 10);
      const date = new Date(formattedExpiryDate);
      const formattedDate =
        ('0' + date.getDate()).slice(-2) +
        '-' +
        ('0' + (date.getMonth() + 1)).slice(-2) +
        '-' +
        date.getFullYear();

      const currentDate = new Date(formattedCurrentDate.slice(0, 10));
      const timeDifference = Math.abs(currentDate.getTime() - date.getTime());
      const dayDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));

      return {
        displayName: e.employee.displayName,
        userMasterID: e.userMasterID,
        companyMasterID: +e.employee.companyMasterId,
        employeeCode:
          e.employee.employeeJoiningDetails.length > 0
            ? e.employee.employeeJoiningDetails[0].employeeCode
            : '',
        companyName: e.employee.companyMaster.companyName,
        branchName:
          e.employee.employeeBranches.length > 0
            ? e.employee.employeeBranches[0].branchMaster.branchName
            : '',
        departmentName:
          e.employee.employeeDepartments.length > 0
            ? e.employee.employeeDepartments[0].department.departmentName
            : '',
        designationName:
          e.employee.employeeDesignations.length > 0
            ? e.employee.employeeDesignations[0].designation.designationName
            : '',
        userNumber: e.employee.userNumber,
        employeement: e.employeement,
        probationEndingDate: formattedDate,
        probationEndingstatus:
          date.getTime() < currentDate.getTime()
            ? '2'
            : date.getTime() === currentDate.getTime()
              ? '0'
              : '1',
        status:
          date.getTime() < currentDate.getTime()
            ? `Ended Before ${dayDifference} Days`
            : date.getTime() === currentDate.getTime()
              ? 'Ending Today'
              : `Ending In ${dayDifference} Days`,
      };
    });

    if (exportData) {
      const finalExportData = finaldata.map((e) => {
        return {
          'Probation Status': e.status,
          'Employee Code': e.employeeCode,
          'Employee Name': e.displayName,
          'Employee Number': e.userNumber,
          'Company Name': e.companyName,
          'Branch Name': e.branchName,
          'Department Name': e.departmentName,
          'Designation Name': e.designationName,
          'Employeement Type': e.employeement,
          'Probation Ending Date': e.probationEndingDate,
        };
      });

      return await generateExcel(
        finalExportData,
        'To-Be-ConFirm-Employee',
        'xlsx',
        res,
      );
    }
    return res.status(200).json({
      status: 200,
      data: finaldata,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};
