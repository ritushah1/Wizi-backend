const EmployeeNda = require('../models/employeeNda');
const UserMaster = require('../models/userMaster');
const ndacategory = require('../models/Ndacategory');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const {
  employeeDesignation,
  employeeDepartment,
  employeeBranch,
  parseEmployeeInfo,
  asiaKolkataDateTime,
  parseEmployeeInfoAlias,
} = require('../utils/commonUtilFunctions');
const { generateExcel } = require('../utils/exportData');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const moment = require('moment');
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
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const { orderByEmployeeMasterFields } = require('../utils/commonVars');
const depositcategory = require('../models/depositCategory');
const deposit = require('../models/deposit');

exports.getNdaData = async (req, res, next) => {
  try {
    let { page, limit, userMasterID, exportData, companyMasterID, sortField } =
      req.body;

    const condition = {};

    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    if (userMasterID && userMasterID.length)
      condition.userMasterID = userMasterID;

    const paginationQuery = !exportData
      ? page && limit
        ? { offset: (page - 1) * limit, limit }
        : {}
      : {};
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });
    let order = [];

    if (sortField === orderByEmployeeMasterFields.EMPLOYEECODE) {
      const employeeCodeSubquery = `
  (
    SELECT ejd."employeeCode"
    FROM "employeeJoiningDetails" ejd
    WHERE ejd."userMasterID" = "userMaster"."userMasterID"
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

        [Sequelize.col('userMaster.displayName'), 'ASC'],
      ];
    } else {
      // Employee Name sorting
      order = [[Sequelize.col('userMaster.displayName'), 'ASC']];
    }
    const { rows, count } = await EmployeeNda.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      subQuery: false,
      include: [
        {
          model: ndacategory,
          attributes: ['nda_category'],
        },
        {
          model: UserMaster,
          where: {
            status: 1,
            companyMasterId: companyMasterID,
            ...userAccessCondition.where,
          },
          attributes: ['displayName', 'userNumber'],
          include: [
            ...userAccessCondition.includeModels,
            {
              model: EmployeeJoiningDetails,
              attributes: ['employeeCode'],
            },
            {
              required: false,
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
      ],
      attributes: ['Ndaname', 'givendate', 'description'],
    });

    if (exportData) {
      const finaldata = rows.map((e) => {
        return {
          EmployeeCode: parseEmployeeInfo(e.userMaster)?.employeeCode,
          EmplyoeeName: e.userMaster?.displayName,
          Number: e.userMaster?.userNumber,
          Branch: parseEmployeeInfo(e.userMaster)?.branch,
          Department: parseEmployeeInfo(e.userMaster)?.department,
          Designation: parseEmployeeInfo(e.userMaster)?.designation,
          Division: parseEmployeeInfo(e.userMaster)?.division,
          WorkingArea: parseEmployeeInfo(e.userMaster)?.workingArea,
          NDAName: e.Ndaname || '',
          GivenDate: e.givendate
            ? moment(e.givendate, 'YYYY-MM-DD').format('DD-MM-YYYY')
            : '',
          Description: e.description || '',
          Category: e.Ndacategory?.nda_category || '',
        };
      });
      await generateExcel(finaldata, 'NdaReport', 'xlsx', res);
      return;
    }

    return res.status(200).json({ status: 200, data: rows, totalcount: count });
  } catch (error) {
    next(error);
  }
};

exports.getdepositData = async (req, res, next) => {
  try {
    let {
      page,
      limit,
      companyMasterID,
      userMasterID = [],
      exportData,
      userStatus = [1],
    } = req.body;

    const isExport = page == '' && limit == '';
    const hasUserFilter = userMasterID && userMasterID.length > 0;

    const offset = (Number(page) - 1) * Number(limit);

    const userWhere = {
      companyMasterId: companyMasterID,
      status: userStatus,
    };

    if (hasUserFilter) {
      userWhere.userMasterID = userMasterID;
    }

    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const currentdate = asiaKolkataDateTime(new Date()).slice(0, 10);

    const DepositData = await deposit.findAll({
      where: {
        companyMasterID,
        status: 1,
      },
      attributes: [
        'userMasterID',
        'amount',
        'description',
        'dateOfDeposit',
        'depositReceiveAs',
        'salaryMonth',
        'refundDate',
        'refundRemarks',
        'refundMode',
        'description',
      ],
      ...paginationQuery,
      include: [
        {
          required: true,
          model: depositcategory,
          attributes: ['depositcategoryname'],
        },
        {
          required: true,
          model: UserMaster,
          where: userWhere,
          attributes: ['userMasterID', 'displayName', 'userNumber'],
          include: [
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
                applicableDate: { [Sequelize.Op.lte]: currentdate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: currentdate } },
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
                applicableDate: { [Sequelize.Op.lte]: currentdate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: currentdate } },
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
                applicableDate: { [Sequelize.Op.lte]: currentdate },
                [Sequelize.Op.or]: [
                  { endDate: { [Sequelize.Op.gte]: currentdate } },
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
      ],
      // order: [[UserMaster, 'displayName', 'ASC']],
    });

    let totalcount = '';

    if (!exportData) {
      totalcount = await deposit.count({
        include: [
          {
            model: depositcategory,
            required: true,
          },
          {
            model: UserMaster,
            where: userWhere,
            required: true,
          },
        ],
        distinct: true,
      });
    }

    const finalData = [];

    for (const deposit of DepositData) {
      const {
        userMaster,
        depositcategory,
        amount,
        dateOfDeposit,
        depositReceiveAs,
        salaryMonth,
        refundDate,
        refundRemarks,
        refundMode,
        description,
      } = deposit;

      const employeeInfo = parseEmployeeInfoAlias(userMaster);

      finalData.push({
        EmployeeCode: employeeInfo?.employeeCode || '',
        EmployeeName: userMaster?.displayName || '',
        Number: userMaster?.userNumber || '',
        Branch: employeeInfo?.branch || '',
        Department: employeeInfo?.department || '',
        Designation: employeeInfo?.designation || '',
        'Deposit Category Name': depositcategory?.depositcategoryname || '',
        'Deposit Description': description,
        'Deposit Amount': amount,
        'Deposit Date': dateOfDeposit
          ? moment(dateOfDeposit).format('DD-MM-YYYY')
          : '',
        'Deposit Received As': depositReceiveAs || '',
        'Deposit Salary Month': salaryMonth || '',
        'Refund Date': refundDate
          ? moment(refundDate).format('DD-MM-YYYY')
          : '',
        'Refund Remarks': refundRemarks || '',
        'Refund Mode': refundMode || '',
      });
    }

    if (exportData) {
      await generateExcel(finalData, 'Deposit', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: finalData,
      totalcount: totalcount,
    });
  } catch (err) {
    next(err);
  }
};
