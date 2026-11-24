const { Op, Sequelize } = require('sequelize');
const { usermessage } = require('../response_message/message');
const PolicyDocuments = require('../models/policyDocuments');
const companyMaster = require('../models/companyMaster');
const { statusCodes } = require('../utils/commonVars');
const {
  bulkCreatePolicyScope,
  policy_Scope,
  asiaKolkataDateTime,
} = require('../utils/commonUtilFunctions');
const PolicyDocumentBranch = require('../models/policyDocumentBranch');
const PolicyDocumentDepartment = require('../models/policyDocumentDepartment');
const PolicyDocumentDesignation = require('../models/policyDocumentDesignation');
const { policyScope } = require('../utils/dbUtils');
const sequelize = require('../config/database');
const Designation = require('../models/designation');
const Department = require('../models/department');
const BranchMaster = require('../models/branchMaster');
const message = require('../response_message/message');
const UserMaster = require('../models/userMaster');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeBranch = require('../models/employeeBranch');
const OrgDocumentAcceptance = require('../models/orgDocumentAcceptance');
const Division = require('../models/division');
const EmployeeDivision = require('../models/employeeDivision');
const EmployeeWorkingArea = require('../models/employeeWorkingArea');
const WorkingArea = require('../models/workingArea');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const EmployeeJoiningDetails = require('../models/employeeJoiningDetails');
const { generateExcel } = require('../utils/exportData');
const moment = require('moment');
exports.createPolicyDocument = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    for (const key of Object.keys(req.body)) {
      if (
        req.body[key] == 'null' ||
        !req.body[key] ||
        req.body[key] == 'undefined'
      ) {
        req.body[key] = null;
      }
    }
    const {
      name,
      description,
      companyMasterID,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
      requireAcceptance = false,
    } = req.body;
    const dbFilepath = req.file
      ? `uploads/policy-documents/${req.file.filename}`
      : null;
    const ticket = await PolicyDocuments.create(
      {
        name,
        description,
        document: dbFilepath,
        companyMasterId: companyMasterID,
        branch_scope,
        department_scope,
        designation_scope,
        requireAcceptance,
      },
      {
        user: req.userDetails,
        transaction,
      },
    );

    const id = ticket.id;

    await bulkCreatePolicyScope({
      scope: branch_scope,
      selectedScope: policyScope.SELECTED,
      ids:
        branch_scope_IDs == 'undefined' ||
        branch_scope_IDs == 'null' ||
        branch_scope_IDs == ''
          ? []
          : branch_scope_IDs?.split(','),
      model: PolicyDocumentBranch,
      policyIdKey: 'policyDocumentID',
      scopeIdKey: 'branchMasterID',
      policyId: id,
      req,
      transaction,
    });

    await bulkCreatePolicyScope({
      scope: department_scope,
      selectedScope: policyScope.SELECTED,
      ids:
        department_scope_IDs == 'undefined' ||
        department_scope_IDs == 'null' ||
        department_scope_IDs == ''
          ? []
          : department_scope_IDs?.split(','),
      model: PolicyDocumentDepartment,
      policyIdKey: 'policyDocumentID',
      scopeIdKey: 'departmentId',
      policyId: id,
      req,
      transaction,
    });

    await bulkCreatePolicyScope({
      scope: designation_scope,
      selectedScope: policyScope.SELECTED,
      ids:
        designation_scope_IDs == 'undefined' ||
        designation_scope_IDs == 'null' ||
        designation_scope_IDs == ''
          ? []
          : designation_scope_IDs?.split(','),
      model: PolicyDocumentDesignation,
      policyIdKey: 'policyDocumentID',
      scopeIdKey: 'designationId',
      policyId: id,
      req,
      transaction,
    });

    await transaction.commit();

    return res.status(statusCodes.OK).json({
      data: ticket,
      message: usermessage.addMessage('Policy Document'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.updatePolicyDocument = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    for (const key of Object.keys(req.body)) {
      if (
        req.body[key] == 'null' ||
        !req.body[key] ||
        req.body[key] == 'undefined'
      ) {
        req.body[key] = null;
      }
    }
    const { id } = req.params;
    const {
      name,
      description,
      companyMasterId,
      branch_scope = policyScope.ALL,
      branch_scope_IDs = [],
      department_scope = policyScope.ALL,
      department_scope_IDs = [],
      designation_scope = policyScope.ALL,
      designation_scope_IDs = [],
      requireAcceptance = false,
    } = req.body;
    const policyDocument = await PolicyDocuments.findByPk(id, {
      include: [
        {
          model: companyMaster,
          where: {
            companyMasterID:
              req.userDetails.childCompanies.length > 0
                ? [
                    ...req.userDetails.childCompanies,
                    req.userDetails.companyMasterId,
                  ]
                : req.userDetails.companyMasterId,
          },
        },
      ],
    });
    if (!policyDocument) {
      await transaction.rollback();
      return res.status(statusCodes.NOT_FOUND).json({
        message: usermessage.notFoundMessage('Policy Document'),
      });
    }
    if (name) policyDocument.name = name;
    if (description) policyDocument.description = description;
    if (req.file) {
      const dbFilepath = `uploads/policy-documents/${req.file.filename}`;
      policyDocument.document = dbFilepath;
    }

    policyDocument.requireAcceptance = requireAcceptance;
    if (branch_scope) policyDocument.branch_scope = branch_scope;
    if (department_scope) policyDocument.department_scope = department_scope;
    if (designation_scope) policyDocument.designation_scope = designation_scope;

    if (companyMasterId) policyDocument.companyMasterId = companyMasterId;
    await policyDocument.save({
      user: req.userDetails,
    });

    await policy_Scope({
      model: PolicyDocumentBranch,
      primaryKey: { policyDocumentID: id },
      column: 'branchMasterID',
      newIDs:
        branch_scope_IDs == 'undefined' ||
        branch_scope_IDs == 'null' ||
        branch_scope_IDs == ''
          ? []
          : branch_scope_IDs?.split(',').map(Number),
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: PolicyDocumentDepartment,
      primaryKey: { policyDocumentID: id },
      column: 'departmentId',
      newIDs:
        department_scope_IDs == 'undefined' ||
        department_scope_IDs == 'null' ||
        department_scope_IDs == ''
          ? []
          : department_scope_IDs?.split(',').map(Number),
      user: req.userDetails,
      transaction: transaction,
    });

    await policy_Scope({
      model: PolicyDocumentDesignation,
      primaryKey: { policyDocumentID: id },
      column: 'designationId',
      newIDs:
        designation_scope_IDs == 'undefined' ||
        designation_scope_IDs == 'null' ||
        designation_scope_IDs == ''
          ? []
          : designation_scope_IDs?.split(',').map(Number),
      user: req.userDetails,
      transaction: transaction,
    });

    await transaction.commit();
    return res.status(statusCodes.OK).json({
      data: policyDocument,
      message: usermessage.updateMessage('Policy Document'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getPolicyDocumentDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const policyDocument = await PolicyDocuments.findByPk(id, {
      include: [
        {
          model: companyMaster,
          where: {
            companyMasterID:
              req.userDetails.childCompanies.length > 0
                ? [
                    ...req.userDetails.childCompanies,
                    req.userDetails.companyMasterId,
                  ]
                : req.userDetails.companyMasterId,
          },
        },
        {
          model: PolicyDocumentBranch,
          as: 'dp_branch',
        },
        {
          model: PolicyDocumentDepartment,
          as: 'dp_dept',
        },
        {
          model: PolicyDocumentDesignation,
          as: 'dp_design',
        },
      ],
    });
    if (!policyDocument)
      return res.status(statusCodes.OK).json({
        message: usermessage.notFoundMessage('Policy Document'),
      });
    res.status(statusCodes.OK).json({
      data: policyDocument,
      message: usermessage.fetchMessage('Policy Document'),
    });
  } catch (err) {
    next(err);
  }
};

exports.listPolicyDocument = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      withDeleted,
      companyMasterID,
      search,
      sortByField,
      sortByValue,
    } = req.query;

    const condition = {};
    const companyFilter = {
      companyMasterID:
        req.userDetails.childCompanies.length > 0
          ? [...req.userDetails.childCompanies, req.userDetails.companyMasterId]
          : req.userDetails.companyMasterId,
    };

    if (search)
      condition[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];

    if (companyMasterID) companyFilter.companyMasterID = companyMasterID;

    const order =
      sortByField && sortByValue
        ? [[sortByField, sortByValue]]
        : [['createdAt', 'DESC']];

    const offset = (page - 1) * pageSize;
    const limit = +pageSize;

    const policyDocument = await PolicyDocuments.findAndCountAll({
      distinct: true,
      where: condition,
      offset,
      limit,
      order,
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
          where: companyFilter,
        },
        {
          model: PolicyDocumentBranch,
          as: 'dp_branch',
          include: [
            {
              model: BranchMaster,
              attributes: ['branchName'],
            },
          ],
        },
        {
          model: PolicyDocumentDepartment,
          as: 'dp_dept',
          include: [
            {
              model: Department,
              attributes: ['departmentName'],
            },
          ],
        },
        {
          model: PolicyDocumentDesignation,
          as: 'dp_design',
          include: [
            {
              model: Designation,
              attributes: ['designationName'],
            },
          ],
        },
        {
          model: OrgDocumentAcceptance,
          as: 'ODA',
          attributes: ['orgDocumentAcceptanceID'],
        },
      ],
    });

    res.status(statusCodes.OK).json({
      message: usermessage.fetchMessage('Policy Document'),
      data: policyDocument.rows,
      totalcount: policyDocument.count,
      page: +page,
      pageSize: limit,
    });
  } catch (err) {
    next(err);
  }
};

exports.deletePolicyDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const policyDocument = await PolicyDocuments.findByPk(id, {
      include: [
        {
          model: companyMaster,
          where: {
            companyMasterID:
              req.userDetails.childCompanies.length > 0
                ? [
                    ...req.userDetails.childCompanies,
                    req.userDetails.companyMasterId,
                  ]
                : req.userDetails.companyMasterId,
          },
        },
      ],
    });
    if (!policyDocument) {
      return res.status(statusCodes.NOT_FOUND).json({
        message: usermessage.notFoundMessage('Policy Document'),
        status: 401,
      });
    }
    const findAlreadyAcceptedDocument = await OrgDocumentAcceptance.findOne({
      where: {
        policyDocumentID: id,
      },
    });

    if (findAlreadyAcceptedDocument) {
      return res.status(statusCodes.OK).json({
        message: 'Org Document Is Already Approved By Employees',
        status: 401,
      });
    }
    await policyDocument.destroy({
      user: req.userDetails,
    });

    return res.status(statusCodes.OK).json({
      message: usermessage.deleteMessage('Policy Document'),
      status: statusCodes.OK,
    });
  } catch (err) {
    next(err);
  }
};

exports.getBranchDepartmentDesignationWiseDocuments = async (
  req,
  res,
  next,
) => {
  try {
    const { companyMasterID, userMasterID, page, limit } = req.body;

    /* ================= VALIDATION ================= */
    if (!companyMasterID || !userMasterID) {
      return res.status(400).json({
        status: 400,
        message: message.errorMessage.INVALID_FILTER_FIELDS,
      });
    }
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const currentUser = await UserMaster.findOne({
      attributes: ['userMasterID', 'companyMasterId'],
      where: {
        userMasterID: userMasterID,
        companyMasterId: companyMasterID,
      },
      include: [
        {
          required: false,
          attributes: ['designationID'],
          model: EmployeeDesignation,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
        },
        {
          required: false,
          model: EmployeeDepartment,
          attributes: ['departmentID'],
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
        },
        {
          required: false,
          attributes: ['branchID'],
          model: EmployeeBranch,
          where: {
            status: 1,
            applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
            [Sequelize.Op.or]: [
              { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
              { endDate: { [Sequelize.Op.eq]: null } },
            ],
          },
        },
      ],
    });

    if (!currentUser) {
      return res.status(400).json({
        status: 400,
        message: message.usermessage.notFoundMessage('User'),
      });
    }

    const designationID =
      currentUser?.employeeDesignations?.[0]?.designationID || null;
    const departmentID =
      currentUser?.employeeDepartments?.[0]?.departmentID || null;
    const branchID = currentUser?.employeeBranches?.[0]?.branchID || null;

    // const order = [['shortLeaveName', 'ASC']];

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    /* ================= QUERY ================= */
    const policies = await PolicyDocuments.findAndCountAll({
      ...paginationQuery,
      order: [['name', 'ASC']],
      where: {
        companyMasterId: companyMasterID,
        [Sequelize.Op.and]: [
          /* ============== BRANCH ================= */
          sequelize.literal(`
            (
              "policyDocuments"."branch_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "policyDocumentBranches" apb
                WHERE apb."policyDocumentID" =
                      "policyDocuments"."id"
                AND apb."deletedAt" IS NULL
                AND apb."branchMasterID" = :branchID
                AND "policyDocuments"."deletedAt" IS NULL
              )
            )
          `),

          /* ============== DEPARTMENT ================= */
          sequelize.literal(`
            (
              "policyDocuments"."department_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "policyDocumentDepartments" apd
                WHERE apd."policyDocumentID" =
                      "policyDocuments"."id"
                AND apd."deletedAt" IS NULL
                AND apd."departmentId" = :departmentID
                AND "policyDocuments"."deletedAt" IS NULL
              )
            )
          `),

          /* ============== DESIGNATION ================= */
          sequelize.literal(`
            (
              "policyDocuments"."designation_scope" = :scopeAll
              OR EXISTS (
                SELECT 1
                FROM "policyDocumentDesignations" apg
                WHERE apg."policyDocumentID" =
                      "policyDocuments"."id"
                AND apg."deletedAt" IS NULL
                AND apg."designationId" = :designationID
                AND "policyDocuments"."deletedAt" IS NULL
              )
            )
          `),
        ],
      },

      replacements: {
        branchID,
        departmentID,
        designationID,
        scopeAll: policyScope.ALL,
      },
      attributes: [
        'id',
        'name',
        'branch_scope',
        'department_scope',
        'designation_scope',
        'companyMasterId',
        'document',
        'description',
      ],
      // order,
    });

    return res.status(200).json({
      status: 200,
      totalcount: policies.count,
      data: policies.rows,
    });
  } catch (err) {
    next(err);
  }
};

// exports.getOrgDocumentAcceptanceByPolicyDocumentID = async (req, res, next) => {
//   try {
//     const { id, page, limit } = req.body;
//     const companyMasterID = req.userDetails.companyMasterId;

//     const userAccessCondition = accessibleRoleWiseUsers({
//       userDetails: req.userDetails,
//       includeCompany: !companyMasterID,
//     });
//     const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
//     if (!page || !limit) {
//       return res
//         .status(200)
//         .json({ status: 400, message: 'Invalid parameters' });
//     }
//     const offset = (page - 1) * limit;

//     const { rows: acceptancePolicy, count } =
//       await OrgDocumentAcceptance.findAndCountAll({
//         where: { policyDocumentID: id },
//         limit,
//         offset,
//         include: [
//           {
//             model: PolicyDocuments,
//             attributes: ['id', 'name'],
//           },
//           {
//             required: true,
//             model: UserMaster,
//             attributes: [
//               'userMasterID',
//               'companyMasterId',
//               'firstName',
//               'middleName',
//               'lastName',
//               'displayName',
//               'userNumber',
//               'photo',
//             ],
//             where: { ...userAccessCondition.where },
//             include: [
//               ...userAccessCondition.includeModels,
//               {
//                 required: false,
//                 model: EmployeeBranch,
//                 where: {
//                   status: 1,
//                   applicableDate: { [Sequelize.Op.lte]: new Date(filterDate) },
//                   [Sequelize.Op.or]: [
//                     { endDate: { [Sequelize.Op.gte]: new Date(filterDate) } },
//                     { endDate: { [Sequelize.Op.eq]: null } },
//                   ],
//                 },
//                 attributes: ['branchID'],
//                 include: [
//                   {
//                     model: BranchMaster,
//                     as: 'branchMaster',
//                     attributes: ['branchName'],
//                   },
//                 ],
//               },
//               {
//                 required: false,
//                 model: EmployeeDesignation,
//                 where: {
//                   status: 1,
//                   applicableDate: {
//                     [Sequelize.Op.lte]: new Date(filterDate),
//                   },
//                   [Sequelize.Op.or]: [
//                     {
//                       endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
//                     },
//                     { endDate: { [Sequelize.Op.eq]: null } },
//                   ],
//                 },

//                 attributes: ['designationID'],
//                 include: [
//                   {
//                     model: Designation,
//                     as: 'designation',
//                     attributes: ['designationName'],
//                   },
//                 ],
//               },
//               {
//                 required: false,
//                 model: EmployeeDepartment,
//                 where: {
//                   status: 1,
//                   applicableDate: {
//                     [Sequelize.Op.lte]: new Date(filterDate),
//                   },
//                   [Sequelize.Op.or]: [
//                     {
//                       endDate: { [Sequelize.Op.gte]: new Date(filterDate) },
//                     },
//                     { endDate: { [Sequelize.Op.eq]: null } },
//                   ],
//                 },

//                 attributes: ['departmentID'],
//                 include: [
//                   {
//                     model: Department,
//                     as: 'department',
//                     attributes: ['departmentName'],
//                   },
//                 ],
//               },
//               {
//                 required: false,
//                 model: EmployeeDivision,
//                 where: {
//                   status: 1,
//                   startDate: { [Sequelize.Op.lte]: filterDate },
//                   [Sequelize.Op.or]: [
//                     { endDate: { [Sequelize.Op.gte]: filterDate } },
//                     { endDate: { [Sequelize.Op.eq]: null } },
//                   ],
//                 },

//                 attributes: ['divisionId', 'startDate'],
//                 include: [
//                   {
//                     model: Division,
//                     attributes: ['divisionName'],
//                   },
//                 ],
//               },

//               {
//                 required: false,
//                 model: EmployeeWorkingArea,
//                 where: {
//                   status: 1,
//                   startDate: { [Sequelize.Op.lte]: filterDate },
//                   [Sequelize.Op.or]: [
//                     { endDate: { [Sequelize.Op.gte]: filterDate } },
//                     { endDate: { [Sequelize.Op.eq]: null } },
//                   ],
//                 },
//                 attributes: ['workingAreaId', 'startDate'],
//                 include: [
//                   {
//                     model: WorkingArea,
//                     attributes: ['workingAreaName'],
//                   },
//                 ],
//               },
//               {
//                 model: companyMaster,
//                 attributes: ['companyName'],
//               },
//               {
//                 model: EmployeeJoiningDetails,
//                 attributes: ['employeeCode'],
//               },
//             ],
//           },
//         ],
//       });
//     return res
//       .status(200)
//       .json({ status: 200, data: acceptancePolicy, totalcount: count });
//   } catch (err) {
//     next(err);
//   }
// };

exports.getOrgDocumentAcceptanceByPolicyDocumentID = async (req, res, next) => {
  try {
    const { id, page, limit, exportData = false } = req.body;

    const companyMasterID = req.userDetails.companyMasterId;

    const fileType = 'xlsx';
    const userAccessCondition = accessibleRoleWiseUsers({
      userDetails: req.userDetails,
      includeCompany: !companyMasterID,
    });

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    // Pagination is required only for normal listing
    if (!exportData && (!page || !limit)) {
      return res.status(200).json({
        status: 400,
        message: 'Invalid parameters',
      });
    }

    const offset = !exportData ? (page - 1) * limit : undefined;

    const queryOptions = {
      where: {
        policyDocumentID: id,
      },

      include: [
        {
          model: PolicyDocuments,
          attributes: ['id', 'name'],
        },

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

          where: {
            ...userAccessCondition.where,
          },

          include: [
            ...userAccessCondition.includeModels,

            {
              required: false,
              model: EmployeeBranch,
              where: {
                status: 1,
                applicableDate: {
                  [Sequelize.Op.lte]: new Date(filterDate),
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: new Date(filterDate),
                    },
                  },
                  {
                    endDate: {
                      [Sequelize.Op.eq]: null,
                    },
                  },
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
                    endDate: {
                      [Sequelize.Op.gte]: new Date(filterDate),
                    },
                  },
                  {
                    endDate: {
                      [Sequelize.Op.eq]: null,
                    },
                  },
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
                    endDate: {
                      [Sequelize.Op.gte]: new Date(filterDate),
                    },
                  },
                  {
                    endDate: {
                      [Sequelize.Op.eq]: null,
                    },
                  },
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
                startDate: {
                  [Sequelize.Op.lte]: filterDate,
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: filterDate,
                    },
                  },
                  {
                    endDate: {
                      [Sequelize.Op.eq]: null,
                    },
                  },
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
                startDate: {
                  [Sequelize.Op.lte]: filterDate,
                },
                [Sequelize.Op.or]: [
                  {
                    endDate: {
                      [Sequelize.Op.gte]: filterDate,
                    },
                  },
                  {
                    endDate: {
                      [Sequelize.Op.eq]: null,
                    },
                  },
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
      ],
    };

    if (!exportData) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }

    const { rows: acceptancePolicy, count } =
      await OrgDocumentAcceptance.findAndCountAll(queryOptions);

    if (exportData) {
      const exportRows = acceptancePolicy.map((item) => {
        const data = item.toJSON();

        const user = data.userMaster || {};
        const policyDocument = data.policyDocument || {};

        const branch =
          user.employeeBranches?.[0]?.branchMaster?.branchName || '';

        const designation =
          user.employeeDesignations?.[0]?.designation?.designationName || '';

        const department =
          user.employeeDepartments?.[0]?.department?.departmentName || '';

        const division =
          user.employeeDivisions?.[0]?.Division?.divisionName || '';

        const workingArea =
          user.employeeWorkingAreas?.[0]?.WorkingArea?.workingAreaName || '';

        const companyName = user.companyMaster?.companyName || '';

        const employeeCode = user.employeeJoiningDetails[0]?.employeeCode || '';

        return {
          'Policy Document': policyDocument.name || '',
          'Employee Code': employeeCode,
          'Employee Name':
            user.displayName ||
            `${user.firstName || ''} ${user.middleName || ''} ${
              user.lastName || ''
            }`.trim(),
          'Employee Number': user.userNumber || '',
          Company: companyName,
          Branch: branch,
          Department: department,
          Designation: designation,
          'Working Area': workingArea,
          Division: division,
          // Keep these according to your actual OrgDocumentAcceptance columns
          'Accepted Date': data.createdAt
            ? moment(data.createdAt).format('DD-MM-YYYY')
            : null || '',
        };
      });

      if (!exportRows.length) {
        return res.status(200).json({
          status: 400,
          message: 'No data found to export',
        });
      }

      return await generateExcel(
        exportRows,
        `Organization_Document_Acceptance`,
        fileType,
        res,
      );
    }
    return res.status(200).json({
      status: 200,
      data: acceptancePolicy,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};
