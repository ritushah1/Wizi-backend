const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { generateExcel } = require('../utils/exportData');
const AssignAssetToEmployee = require('../models/assignAssetToEmployee');
const UserMaster = require('../models/userMaster');
const {
  asiaKolkataDateTime,
  parseEmployeeInfo,
} = require('../utils/commonUtilFunctions');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const {
  userAttributes,
  companyAttributes,
  orderByEmployeeMasterFields,
} = require('../utils/commonVars');
const companyMaster = require('../models/companyMaster');
const EmployeeBranch = require('../models/employeeBranch');
const BranchMaster = require('../models/branchMaster');
const EmployeeDesignation = require('../models/employeeDesignation');
const Designation = require('../models/designation');
const EmployeeDepartment = require('../models/employeeDepartment');
const Department = require('../models/department');
const EmployeeDivision = require('../models/employeeDivision');
const Division = require('../models/division');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const moment = require('moment');
const assetMaster = require('../models/assetMaster');
const AssetCategory = require('../models/assetCategory');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
exports.getAssetData = async (req, res, next) => {
  try {
    let {
      page,
      limit,
      userMasterID,
      assetcategory,
      exportData,
      sortField,
      userStatus = [1],
    } = req.body;

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const condition = {
      status: 1,
    };
    if (Array.isArray(userMasterID) && userMasterID.length > 0) {
      condition.userMasterID = userMasterID;
    }
    if (Array.isArray(assetcategory) && assetcategory.length > 0) {
      condition.assetCategoryID = assetcategory;
    }
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
    });
    let order = [];

    if (sortField === orderByEmployeeMasterFields.EMPLOYEECODE) {
      const employeeCodeSubquery = `
(
  SELECT ejd."employeeCode"
  FROM "employeeJoiningDetails" ejd
  WHERE ejd."userMasterID" = "employee"."userMasterID"
  LIMIT 1
)
`;

      order = [
        [
          Sequelize.literal(`
        CASE
          WHEN ${employeeCodeSubquery} IS NULL
               OR ${employeeCodeSubquery} = ''
          THEN 0
          ELSE 1
        END
      `),
          'ASC',
        ],
        [
          Sequelize.literal(`
        CASE
          WHEN ${employeeCodeSubquery} ~ '^[0-9]+$'
          THEN 0
          ELSE 1
        END
      `),
          'ASC',
        ],
        [
          Sequelize.literal(`
        CASE
          WHEN ${employeeCodeSubquery} ~ '^[0-9]+$'
          THEN (${employeeCodeSubquery})::int
        END
      `),
          'ASC',
        ],
        [
          Sequelize.literal(`
        substring(${employeeCodeSubquery} FROM '^[^0-9]+')
      `),
          'ASC',
        ],
        [
          Sequelize.literal(`
        CASE
          WHEN ${employeeCodeSubquery} ~ '[0-9]+'
          THEN substring(${employeeCodeSubquery} FROM '[0-9]+')::int
        END
      `),
          'ASC',
        ],
        [Sequelize.literal(`${employeeCodeSubquery}`), 'ASC'],

        [Sequelize.col('employee.displayName'), 'ASC'],
        [Sequelize.col('assignAssetToEmployee.assignDate'), 'DESC'],
      ];
    } else if (sortField == orderByEmployeeMasterFields.EMPLOYEENAME) {
      // Employee Name sorting
      order = [
        [Sequelize.col('employee.displayName'), 'ASC'],
        [Sequelize.col('assignAssetToEmployee.assignDate'), 'DESC'],
      ];
    } else {
      order = [
        [Sequelize.col('assignAssetToEmployee.assignDate'), 'DESC'],
        [Sequelize.col('employee.displayName'), 'ASC'],
      ];
    }
    const userCondtion = {
      status: userStatus,
      ...userAccessCondition.where,
    };
    const { rows: assignedAsset, count } =
      await AssignAssetToEmployee.findAndCountAll({
        subQuery: false,
        distinct: true,
        where: condition,
        ...paginationQuery,
        order,
        include: [
          {
            model: UserMaster,
            as: 'employee',
            where: userCondtion,
            attributes: userAttributes,
            include: [
              ...userAccessCondition.includeModels,
              {
                model: companyMaster,
                attributes: companyAttributes,
              },
              { model: EmployeeJoiningDetails, attributes: ['employeeCode'] },
              {
                required: false,
                separate: true,
                model: EmployeeBranch,
                where: {
                  status: 1,
                  applicableDate: { [Sequelize.Op.lte]: new Date(currentDate) },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: new Date(currentDate) } },
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
                separate: true,
                model: EmployeeDesignation,
                where: {
                  status: 1,
                  applicableDate: {
                    [Sequelize.Op.lte]: new Date(currentDate),
                  },
                  [Sequelize.Op.or]: [
                    {
                      endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
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
                    [Sequelize.Op.lte]: new Date(currentDate),
                  },
                  [Sequelize.Op.or]: [
                    {
                      endDate: { [Sequelize.Op.gte]: new Date(currentDate) },
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
                model: EmployeeDivision,
                where: {
                  status: 1,
                  startDate: { [Sequelize.Op.lte]: currentDate },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: currentDate } },
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
                  startDate: { [Sequelize.Op.lte]: currentDate },
                  [Sequelize.Op.or]: [
                    { endDate: { [Sequelize.Op.gte]: currentDate } },
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
            model: assetMaster,
            as: 'assetMaster',
            attributes: ['assetName', 'assetSerialNo'],
          },
          {
            model: AssetCategory,
            as: 'assetCategory',
            attributes: ['assetCategory'],
          },
          {
            model: UserMaster,
            as: 'c_By',
            attributes: userAttributes,
          },
          {
            model: UserMaster,
            as: 'u_By',
            attributes: userAttributes,
          },
        ],
      });
    if (exportData) {
      const finalData = assignedAsset.map((e) => {
        return {
          'Employee Code': parseEmployeeInfo(e.employee)?.employeeCode,
          'Employee Name': e.employee?.displayName,
          'Employee Number': e.employee?.userNumber,
          Company: parseEmployeeInfo(e.employee)?.companyName,
          Branch: parseEmployeeInfo(e.employee)?.branch,
          Department: parseEmployeeInfo(e.employee)?.department,
          Designation: parseEmployeeInfo(e.employee)?.designation,
          Division: parseEmployeeInfo(e.employee)?.division,
          'Working Area': parseEmployeeInfo(e.employee)?.workingArea,
          'Asset Category': e.assetCategory?.assetCategory || '',
          'Asset Name': e.assetMaster?.assetName || '',
          'Asset Serial No': e.assetMaster?.assetSerialNo || '',
          Description: e.description || '',
          'Asset Assign Date': e.assignDate
            ? moment(e.assignDate, 'YYYY-MM-DD').format('DD-MM-YYYY')
            : '',
          'Asset Return Date': e.returnDate
            ? moment(e.returnDate, 'YYYY-MM-DD').format('DD-MM-YYYY')
            : '',
          'Assigned Quantity': e.quantity,
          'Create By': e.createBy
            ? `${e.c_By?.displayName} On ${moment(e.createdAt).format('DD-MM-YYYY HH:mm')}`
            : '',
          'Update By': e.updateBy
            ? `${e.u_By?.displayName} On ${moment(e.updatedAt).format('DD-MM-YYYY HH:mm')}`
            : '',
        };
      });
      await generateExcel(finalData, 'Assetreport', 'xlsx', res);
      return;
    }
    return res
      .status(200)
      .json({ status: 200, data: assignedAsset, totalcount: count });
  } catch (err) {
    next(err);
  }
};
