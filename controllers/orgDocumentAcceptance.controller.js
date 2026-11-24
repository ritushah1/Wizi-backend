const Sequelize = require('sequelize');
const UserMaster = require('../models/userMaster');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const moment = require('moment');
const {
  accessibleRoleWiseUsers,
} = require('../middleware/accessibleRoleWiseUsers');
const OrgDocumentAcceptance = require('../models/orgDocumentAcceptance');
const PolicyDocuments = require('../models/policyDocuments');
const EmployeeDesignation = require('../models/employeeDesignation');
const EmployeeDepartment = require('../models/employeeDepartment');
const EmployeeBranch = require('../models/employeeBranch');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');
const { policyScope } = require('../utils/dbUtils');

exports.getRemainingAcceptanceOrgDocument = async (req, res, next) => {
  try {
    const userMasterID = req.userDetails.userMasterId;
    const companyMasterID = req.userDetails.companyMasterId;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);

    /* ================= CURRENT USER DETAILS ================= */

    const currentUser = await UserMaster.findOne({
      attributes: ['userMasterID', 'companyMasterId'],
      where: {
        userMasterID,
        companyMasterId: companyMasterID,
      },
      include: [
        {
          required: false,
          attributes: ['designationID'],
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
        },
        {
          required: false,
          model: EmployeeDepartment,
          attributes: ['departmentID'],
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
        },
        {
          required: false,
          attributes: ['branchID'],
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
        },
      ],
    });

    const designationID =
      currentUser?.employeeDesignations?.[0]?.designationID || null;

    const departmentID =
      currentUser?.employeeDepartments?.[0]?.departmentID || null;

    const branchID = currentUser?.employeeBranches?.[0]?.branchID || null;

    /* ================= REMAINING DOCUMENTS ================= */

    const policies = await PolicyDocuments.findAll({
      where: {
        companyMasterId: companyMasterID,
        requireAcceptance: true,

        [Sequelize.Op.and]: [
          /* ================= NOT ACCEPTED ================= */

          sequelize.literal(`
            NOT EXISTS (
              SELECT 1
              FROM "orgDocumentAcceptances" oda
              WHERE oda."policyDocumentID" = "policyDocuments"."id"
              AND oda."userMasterID" = ${userMasterID}
              AND oda."deletedAt" IS NULL
            )
          `),

          /* ================= BRANCH ================= */

          sequelize.literal(`
            (
              "policyDocuments"."branch_scope" = '${policyScope.ALL}'
              OR EXISTS (
                SELECT 1
                FROM "policyDocumentBranches" apb
                WHERE apb."policyDocumentID" = "policyDocuments"."id"
                AND apb."deletedAt" IS NULL
                AND apb."branchMasterID" = ${branchID || 0}
              )
            )
          `),

          /* ================= DEPARTMENT ================= */

          sequelize.literal(`
            (
              "policyDocuments"."department_scope" = '${policyScope.ALL}'
              OR EXISTS (
                SELECT 1
                FROM "policyDocumentDepartments" apd
                WHERE apd."policyDocumentID" = "policyDocuments"."id"
                AND apd."deletedAt" IS NULL
                AND apd."departmentId" = ${departmentID || 0}
              )
            )
          `),

          /* ================= DESIGNATION ================= */

          sequelize.literal(`
            (
              "policyDocuments"."designation_scope" = '${policyScope.ALL}'
              OR EXISTS (
                SELECT 1
                FROM "policyDocumentDesignations" apg
                WHERE apg."policyDocumentID" = "policyDocuments"."id"
                AND apg."deletedAt" IS NULL
                AND apg."designationId" = ${designationID || 0}
              )
            )
          `),
        ],
      },

      attributes: [
        'id',
        'name',
        'description',
        'document',
        'requireAcceptance',
      ],

      order: [['id', 'DESC']],
    });

    return res.status(200).json({
      status: 200,
      count: policies.length,
      data: policies,
    });
  } catch (err) {
    next(err);
  }
};

exports.acceptOrgDocument = async (req, res, next) => {
  try {
    const { policyDocumentID } = req.body;
    const userMasterID = req.userDetails.userMasterId;
    const companyMasterID = req.userDetails.companyMasterId;

    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    const findAlreadyAcceptedDocument = await OrgDocumentAcceptance.findOne({
      where: {
        userMasterID,
        policyDocumentID,
      },
    });
    if (!findAlreadyAcceptedDocument) {
      await OrgDocumentAcceptance.create(
        {
          userMasterID,
          policyDocumentID,
        },
        {
          user: req.userDetails,
        },
      );
    }

    return res.status(200).json({
      status: 200,
      message: message.usermessage.acceptMesaage('Org Document'),
    });
  } catch (err) {
    next(err);
  }
};
