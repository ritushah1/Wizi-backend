const {
  asiaKolkataDateTime,
  getOrderByFields,
} = require('../utils/commonUtilFunctions');
const { generateExcel } = require('../utils/exportData');
const Sequelize = require('sequelize');
const advancePayment = require('../models/advancePayment');
const UserMaster = require('../models/userMaster');
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
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');

//getadvancedata
exports.getAdvanceData = async (req, res, next) => {
  try {
    let {
      page,
      limit,
      companyMasterID,
      userMasterID,
      startdate,
      enddate,
      exportData,
      sortField,
      userStatus = [1],
    } = req.body;
    const paginationQuery = {};
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const condition = {
      advanceDate: {
        [Sequelize.Op.between]: [startdate, enddate],
      },
      AdvanceStatus: 1,
    };
    if (Array.isArray(userMasterID) && userMasterID.length > 0) {
      condition.userMasterID = userMasterID;
    }
    const currentDate = asiaKolkataDateTime(new Date()).slice(0, 10);
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
        [Sequelize.col('advancePayment.advanceDate'), 'DESC'],
      ];
    } else if (sortField == orderByEmployeeMasterFields.EMPLOYEENAME) {
      // Employee Name sorting
      order = [
        [Sequelize.col('userMaster.displayName'), 'ASC'],
        [Sequelize.col('advancePayment.advanceDate'), 'DESC'],
      ];
    } else {
      order = [
        [Sequelize.col('advancePayment.advanceDate'), 'DESC'],
        [Sequelize.col('userMaster.displayName'), 'ASC'],
      ];
    }
    const userCondition = {
      companyMasterId: companyMasterID,
      ...userAccessCondition.where,
      status: userStatus,
    };
    const { rows: findAdvancePayments, count: totalcount } =
      await advancePayment.findAndCountAll({
        where: condition,
        ...paginationQuery,
        subQuery: false,
        order,
        include: [
          {
            model: UserMaster,
            where: userCondition,
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
      const finalData = findAdvancePayments.map((e) => {
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
          'Advance Mode': e.paymentmode,
          'Deduction Month': formatYearMonth(e.paymentYearMonth),
          Description: e.description,
          AdvanceStatus:
            e.AdvanceStatus === 1
              ? 'Approved'
              : e.AdvanceStatus === 2
                ? 'Rejected'
                : 'Pending',
          'Create By': e.createBy
            ? `${e.createdByUserDetails?.displayName} On ${moment(e.createdAt).format('DD-MM-YYYY HH:mm')}`
            : '',
          'Update By': e.updateBy
            ? `${e.updatedByUserDetails?.displayName} On ${moment(e.updatedAt).format('DD-MM-YYYY HH:mm')}`
            : '',
        };
      });
      await generateExcel(finalData, 'Advance Report', 'xlsx', res);
      return;
    }

    return res
      .status(200)
      .json({ status: 200, data: findAdvancePayments, totalcount: totalcount });
  } catch (err) {
    next(err);
  }
};

function formatYearMonth(yearMonth) {
  if (!yearMonth) return '';
  const value = yearMonth.toString();
  const year = value.substring(0, 4);
  const month = value.substring(4, 6);

  const date = new Date(Number(year), Number(month) - 1);

  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}
