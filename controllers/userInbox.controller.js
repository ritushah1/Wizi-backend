const { Op, Sequelize } = require('sequelize');
const { usermessage } = require('../response_message/message');
const { statusCodes } = require('../utils/commonVars');
const { generateExcel } = require('../utils/exportData');
const UserInbox = require('../models/UserInbox');
const UserMaster = require('../models/userMaster');
const OperationMaster = require('../models/operation');
const FormMaster = require('../models/formMaster');
const UserRole = require('../models/userRole');
const RolePermission = require('../models/rolePermission');
const message = require('../response_message/message');

exports.listTicketCategory = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      search,
      sortByField,
      sortByValue,
      exportData,
      exportFileType,
    } = req.query;

    const condition = { assignedTo: req.userDetails.userMasterId };

    if (search)
      condition[Op.or] = [
        { activityTableName: { [Op.iLike]: `%${search}%` } },
        // { description: { [Op.iLike]: `%${search}%` } },
      ];

    const order =
      sortByField && sortByValue
        ? [[sortByField, sortByValue]]
        : [['createdAt', 'DESC']];

    const paginationQuery = {};
    if (!exportData) {
      paginationQuery.offset = (page - 1) * pageSize;
      paginationQuery.limit = +pageSize;
    }

    const userInbox = await UserInbox.findAndCountAll({
      where: condition,
      ...paginationQuery,
      order,
      nest: true,
      distinct: true,
    });

    if (exportData) {
      await generateExcel(
        userInbox.rows.map((e) => e.toJSON()),
        'User-Inbox',
        exportFileType,
        res,
      );
      return;
    }
    res.status(statusCodes.OK).json({
      message: usermessage.fetchMessage('User Inbox'),
      data: userInbox.rows,
      totalcount: userInbox.count,
      page: +page,
      pageSize: paginationQuery.limit,
    });
  } catch (err) {
    next(err);
  }
};

async function checkLoanAdvancePermission(userMasterId) {
  const condition = {};
  const activityTableName = [];

  const userRoleData = await UserRole.findOne({
    raw: true,
    where: {
      userMasterID: userMasterId,
    },
    include: [
      {
        required: true,
        model: UserMaster,
        where: {
          admin: {
            [Sequelize.Op.notIn]: [2, 3],
          },
        },
        attributes: [],
      },
    ],
  });

  if (!userRoleData) return activityTableName;

  condition.roleMasterID = userRoleData.roleMasterID;
  const array = [
    'LoanMaster',
    'AdvancePayment',
    'EmployeeMaster',
    'JobApplication',
    'HRPre-BoardingRequest',
    'ExpenseAdvanceRequestAuthorization',
  ];
  const formNameCondition = {
    formName: {
      [Sequelize.Op.in]: array,
    },
  };

  const userRights = await RolePermission.findAll({
    raw: true,
    where: condition,
    attributes: [],
    include: [
      { model: FormMaster, where: formNameCondition },
      {
        model: OperationMaster,
        attributes: [],
        where: {
          operationID: 4,
        },
      },
    ],
  });

  array.map((e) => {
    const data = userRights.find((f) => f['formMaster.formName'] == e);
    if (!data) {
      if (e == 'LoanMaster') {
        activityTableName.push('loanMasters');
      } else if (e == 'AdvancePayment') {
        activityTableName.push('advancePayments');
      } else if (e === 'EmployeeMaster') {
        activityTableName.push('userExperiences');
        activityTableName.push('userEducations');
        activityTableName.push('userFamilies');
        activityTableName.push('userDocuments');
      } else if (e === 'JobApplication') {
        activityTableName.push('jobApplications');
      } else if (e === 'HRPre-BoardingRequest') {
        activityTableName.push('preboardings');
      } else if (e === 'ExpenseAdvanceRequestAuthorization') {
        activityTableName.push('expenseAdvanceRequests');
      }
    }
  });

  return activityTableName;
}

exports.getUserInboxData = async (req, res, next) => {
  try {
    const { page, limit, type, startdate, enddate } = req.query;

    // ✅ Pagination
    const pagtinatequery =
      page && limit ? { offset: (page - 1) * limit, limit: +limit } : {};

    const condition = {};

    // ✅ Date filter
    if (startdate && enddate) {
      const futureDate = new Date(new Date(enddate).getTime() + 86400000)
        .toISOString()
        .slice(0, 10);

      condition.createdAt = {
        [Sequelize.Op.between]: [new Date(startdate), new Date(futureDate)],
      };
    }

    // ✅ Permission List (blocked activityTables)
    const checkPermission = await checkLoanAdvancePermission(
      req.userDetails.userMasterId,
    );

    // ✅ Company filter
    condition.companyMasterID = {
      [Sequelize.Op.or]: [req.userDetails.companyMasterId, null],
    };

    // ===================================================
    // ✅ TYPE LOGIC (STRICT)
    // ===================================================
    if (type) {
      // ❌ If blocked → return empty
      if (checkPermission.includes(type)) {
        return res.status(200).json({
          status: 200,
          data: [],
          totalcount: 0,
        });
      }

      // ✅ Only that type
      condition.activityTable = type;
    } else {
      // ✅ No type → exclude blocked
      if (checkPermission.length) {
        condition.activityTable = {
          [Sequelize.Op.notIn]: checkPermission,
        };
      }
    }

    const { rows: userInbox, count: totalcount } =
      await UserInbox.findAndCountAll({
        where: {
          ...condition,

          [Sequelize.Op.or]: [
            // =====================================
            // ✅ CASE 1: assignedTo = USER
            // =====================================
            {
              [Sequelize.Op.and]: [
                {
                  assignedTo: req.userDetails.userMasterId,
                },

                // ✅ STATUS CHECK ONLY
                {
                  [Sequelize.Op.or]: [
                    { assignedBy: null },
                    Sequelize.where(
                      Sequelize.col('requestAssignedBy.status'),
                      Sequelize.Op.eq,
                      1,
                    ),
                  ],
                },
              ],
            },

            // =====================================
            // ✅ CASE 2 & 3: assignedTo = NULL
            // =====================================
            {
              [Sequelize.Op.and]: [
                {
                  assignedTo: null,
                },

                // 🔥 STATUS LOGIC
                {
                  [Sequelize.Op.or]: [
                    // CASE 3 → assignedBy NULL
                    { assignedBy: null },

                    // CASE 2 → assignedBy NOT NULL → status check
                    {
                      [Sequelize.Op.and]: [
                        {
                          assignedBy: {
                            [Sequelize.Op.ne]: null,
                          },
                        },
                        Sequelize.where(
                          Sequelize.col('requestAssignedBy.status'),
                          Sequelize.Op.eq,
                          1,
                        ),
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },

        ...pagtinatequery,
        order: [['createdAt', 'DESC']],
        distinct: true,

        include: [
          {
            required: false,
            model: UserMaster,
            as: 'requestAssignedBy',
            attributes: [],
            where: {
              companyMasterId:
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

    return res.status(200).json({
      status: 200,
      data: userInbox,
      totalcount,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteData = async (req, res, next) => {
  try {
    const { id } = req.body;

    await UserInbox.destroy({
      where: {
        id,
      },
    });

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Notification'),
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserInboxCount = async (req, res, next) => {
  try {
    const condition = {};

    const checkPermission = await checkLoanAdvancePermission(
      req.userDetails.userMasterId,
    );

    // ✅ Company filter
    condition.companyMasterID = {
      [Sequelize.Op.or]: [req.userDetails.companyMasterId, null],
    };

    const totalcount = await UserInbox.count({
      where: {
        ...condition,

        [Sequelize.Op.or]: [
          // =====================================
          // ✅ CASE 1: assignedTo = USER
          // =====================================
          {
            [Sequelize.Op.and]: [
              {
                assignedTo: req.userDetails.userMasterId,
              },

              // ✅ STATUS CHECK ONLY
              {
                [Sequelize.Op.or]: [
                  { assignedBy: null },
                  Sequelize.where(
                    Sequelize.col('requestAssignedBy.status'),
                    Sequelize.Op.eq,
                    1,
                  ),
                ],
              },
            ],
          },

          // =====================================
          // ✅ CASE 2 & 3: assignedTo = NULL
          // =====================================
          {
            [Sequelize.Op.and]: [
              {
                assignedTo: null,
              },

              // 🔥 APPLY PERMISSION ONLY HERE
              ...(checkPermission.length
                ? [
                    {
                      activityTable: {
                        [Sequelize.Op.notIn]: checkPermission,
                      },
                    },
                  ]
                : []),

              // 🔥 STATUS LOGIC
              {
                [Sequelize.Op.or]: [
                  // CASE 3 → assignedBy NULL
                  { assignedBy: null },

                  // CASE 2 → assignedBy NOT NULL → status check
                  {
                    [Sequelize.Op.and]: [
                      {
                        assignedBy: {
                          [Sequelize.Op.ne]: null,
                        },
                      },
                      Sequelize.where(
                        Sequelize.col('requestAssignedBy.status'),
                        Sequelize.Op.eq,
                        1,
                      ),
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },

      include: [
        {
          required: false,
          model: UserMaster,
          as: 'requestAssignedBy',
          attributes: [],
          where: {
            companyMasterId:
              req.userDetails.childCompanies.length > 0
                ? [
                    ...req.userDetails.childCompanies,
                    req.userDetails.companyMasterId,
                  ]
                : req.userDetails.companyMasterId,
          },
        },
      ],

      distinct: true,
    });

    return res.status(200).json({
      status: 200,
      totalcount: totalcount || 0,
    });
  } catch (error) {
    next(error);
  }
};
