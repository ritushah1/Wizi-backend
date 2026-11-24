const ExpensePolicy = require('../models/expensePolicy');
const ExpenseDesignation = require('../models/expensePolicyDesignation');
const AccomodationExpenseRule = require('../models/accomodationExpenseRule');
const FoodExpenseRule = require('../models/foodExpenseRule');
const OwnVehicleExpenseRule = require('../models/ownVehicleExpenseRule');
const ExpenseTransportRule = require('../models/transportExpenseRule');
const ExpenseHead = require('../models/expenseHead');
const Designation = require('../models/designation');
const companyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const EmployeeBranch = require('../models/employeeBranch');
const Branch = require('../models/branchMaster');
const CityMaster = require('../models/citymaster');
const StateMaster = require('../models/statemaster');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const Sequelize = require('sequelize');
const { expenseRuleType, userAttributes } = require('../utils/commonVars');
const EmployeeDesignation = require('../models/employeeDesignation');
const { asiaKolkataDateTime } = require('../utils/commonUtilFunctions');

/**
 * Helper function to create expense rules based on expense type
 */
async function createExpenseRules(
  expensePolicyID,
  expenseType,
  data,
  transaction,
  user,
) {
  switch (expenseType) {
    case expenseRuleType.ACCOMMODATION:
      if (
        data.accommodationMetroRate !== undefined &&
        data.accommodationNonMetroRate !== undefined
      ) {
        await AccomodationExpenseRule.create(
          {
            expensePolicyID,
            priceMetro: data.accommodationMetroRate,
            priceNonMetro: data.accommodationNonMetroRate,
            status: 1,
          },
          { transaction, user },
        );
      }
      break;

    case expenseRuleType.FOOD:
      if (
        data.foodMetroRate !== undefined &&
        data.foodNonMetroRate !== undefined
      ) {
        await FoodExpenseRule.create(
          {
            expensePolicyID,
            priceMetro: data.foodMetroRate,
            priceNonMetro: data.foodNonMetroRate,
            status: 1,
          },
          { transaction, user },
        );
      }
      break;

    case expenseRuleType.OWNVEHICLE:
      if (data.vehicleRates && Array.isArray(data.vehicleRates)) {
        for (const rate of data.vehicleRates) {
          await OwnVehicleExpenseRule.create(
            {
              expensePolicyID,
              stateID: rate.stateMasterID,
              priceMetro: rate.twoWheelerRate,
              priceNonMetro: rate.fourWheelerRate,
              status: 1,
            },
            { transaction, user },
          );
        }
      }
      break;

    case expenseRuleType.OUTSTAIONTRAVEL: // Note: typo in commonVars - OUTSTAION not OUTSTATION
      if (
        data.outstationTransports &&
        Array.isArray(data.outstationTransports)
      ) {
        for (const transport of data.outstationTransports) {
          if (transport.name && transport.name.trim()) {
            await ExpenseTransportRule.create(
              {
                expensePolicyID,
                transportName: transport.name.trim(),
                status: 1,
              },
              { transaction, user },
            );
          }
        }
      }
      break;

    case expenseRuleType.LOCALTRANSPORT:
      if (data.localTransports && Array.isArray(data.localTransports)) {
        for (const transport of data.localTransports) {
          if (transport.name && transport.name.trim()) {
            await ExpenseTransportRule.create(
              {
                expensePolicyID,
                transportName: transport.name.trim(),
                status: 1,
              },
              { transaction, user },
            );
          }
        }
      }
      break;
  }
}

/**
 * Add new expense policy
 */
exports.addExpensePolicy = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      policyName,
      expenseHeadId,
      designationIds, // Changed from designationId to designationIds (array)
      effectiveDate,
      companyMasterID,
      expenseType,
    } = req.body;

    policyName = policyName?.trim();

    // Validate required fields
    if (
      !policyName ||
      !expenseHeadId ||
      !designationIds ||
      !effectiveDate ||
      !companyMasterID
    ) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'All fields are required!',
      });
    }

    // Validate designationIds is an array
    if (!Array.isArray(designationIds) || designationIds.length === 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'At least one designation is required!',
      });
    }

    // Validate expense head exists
    const expenseHead = await ExpenseHead.findOne({
      where: {
        expenseHeadId,
        companyMasterID,
        status: 1,
      },
      transaction,
    });

    if (!expenseHead) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Expense Head'),
      });
    }

    // Validate all designations exist
    const designations = await Designation.findAll({
      where: {
        designationId: designationIds,
        companyMasterID,
        status: 1,
      },
      transaction,
    });

    if (designations.length !== designationIds.length) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage(
          'One or more designations',
        ),
      });
    }

    // Check if policy name already exists in the company
    const existingPolicyName = await ExpensePolicy.findOne({
      where: {
        policyName: { [Sequelize.Op.iLike]: policyName },
        status: [0, 1],
      },
      include: [
        {
          model: ExpenseHead,
          as: 'ExpenseHead',
          where: {
            companyMasterID,
          },
          required: true,
        },
      ],
      transaction,
    });

    if (existingPolicyName) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: 'Expense Policy with this name already exists in the company!',
      });
    }

    // Check if policy already exists with same head, designation, effective date, and expense type
    const existingPolicy = await ExpensePolicy.findOne({
      where: {
        headID: expenseHeadId,
        effectiveDate,
        expenseType: expenseType || expenseRuleType.FOOD,
        status: [0, 1],
      },
      include: [
        {
          model: ExpenseDesignation,
          where: {
            designationID: designationIds,
            status: [0, 1],
          },
          required: true,
        },
      ],
      transaction,
    });

    if (existingPolicy) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message:
          'Expense Policy already exists with same expense head, designation, effective date and expense type combination!',
      });
    }

    // Create expense policy
    const policyData = {
      policyName,
      headID: expenseHeadId,
      effectiveDate,
      expenseType: expenseType || expenseRuleType.FOOD,
      status: 1,
    };

    const newPolicy = await ExpensePolicy.create(policyData, {
      transaction,
      user: req.userDetails,
    });

    // Create expense designation mappings for all selected designations
    for (const designationId of designationIds) {
      await ExpenseDesignation.create(
        {
          expensePolicyID: newPolicy.expensePolicyID,
          designationID: designationId,
          status: 1,
        },
        {
          transaction,
          user: req.userDetails,
        },
      );
    }

    // Create expense type specific rules
    await createExpenseRules(
      newPolicy.expensePolicyID,
      expenseType,
      req.body,
      transaction,
      req.userDetails,
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Expense Policy'),
      data: newPolicy,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Get expense policy by ID
 */
exports.getExpensePolicyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const policy = await ExpensePolicy.findOne({
      where: {
        expensePolicyID: id,
        status: [0, 1],
      },
      include: [
        {
          model: ExpenseHead,
          as: 'ExpenseHead',
          attributes: ['expenseHeadId', 'expenseHead', 'companyMasterID'],
          include: [
            {
              model: companyMaster,
              attributes: ['companyMasterID', 'companyName'],
            },
          ],
        },
        {
          model: ExpenseDesignation,
          where: { status: [0, 1] },
          required: false,
          include: [
            {
              model: Designation,
              as: 'Designation',
              attributes: ['designationId', 'designationName'],
            },
          ],
        },
        {
          model: AccomodationExpenseRule,
          where: { status: [0, 1] },
          required: false,
        },
        {
          model: FoodExpenseRule,
          where: { status: [0, 1] },
          required: false,
        },
        {
          model: OwnVehicleExpenseRule,
          where: { status: [0, 1] },
          required: false,
        },
        {
          model: ExpenseTransportRule,
          where: { status: [0, 1] },
          required: false,
        },
      ],
    });

    if (!policy) {
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Expense Policy'),
      });
    }

    return res.status(200).json({
      status: 200,
      data: policy,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all expense policies by company
 */
exports.getExpensePolicies = async (req, res, next) => {
  try {
    const {
      companyMasterID,
      designationIds,
      limit,
      page,
      searchQuery,
      exportData,
    } = req.body;

    const condition = {
      status: [0, 1],
    };

    // Build where clause
    const whereClause = {};

    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          policyName: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          '$ExpenseHead.expenseHead$': {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    }

    // Handle single company ID instead of array
    if (companyMasterID) {
      whereClause.companyMasterID = companyMasterID;
    }

    const hasDesignationFilter =
      designationIds &&
      Array.isArray(designationIds) &&
      designationIds.length > 0;

    // Step 1: If designation filter exists, first find matching policy IDs
    if (hasDesignationFilter) {
      const policiesWithDesignations = await ExpensePolicy.findAll({
        where: condition,
        attributes: ['expensePolicyID'],
        include: [
          {
            model: ExpenseHead,
            as: 'ExpenseHead',
            where: whereClause.companyMasterID ? whereClause : {},
            attributes: [],
          },
          {
            model: ExpenseDesignation,
            where: {
              designationID: designationIds,
              status: [0, 1],
            },
            required: true,
            attributes: [],
          },
        ],
      });

      const filteredPolicyIds = policiesWithDesignations.map(
        (p) => p.expensePolicyID,
      );

      // If no policies match the designation filter, return empty result
      if (filteredPolicyIds.length === 0) {
        return res.status(200).json({
          status: 200,
          data: [],
          totalcount: 0,
        });
      }

      // Add policy ID filter to main condition
      condition.expensePolicyID = filteredPolicyIds;
    }

    const order = [['createdAt', 'DESC']];

    // Step 2: First get total count without pagination
    const totalCount = await ExpensePolicy.count({
      where: condition,
      distinct: true,
      col: 'expensePolicyID',
      include: [
        {
          model: ExpenseHead,
          as: 'ExpenseHead',
          where: whereClause.companyMasterID ? whereClause : {},
          attributes: [],
        },
      ],
    });

    // Step 3: Fetch paginated policy details with ALL designations for matching policies
    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const policies = await ExpensePolicy.findAll({
      where: condition,
      ...paginationQuery,
      order,
      include: [
        {
          model: ExpenseHead,
          as: 'ExpenseHead',
          where: whereClause.companyMasterID ? whereClause : {},
          attributes: ['expenseHeadId', 'expenseHead', 'companyMasterID'],
          include: [
            {
              model: companyMaster,
              attributes: ['companyMasterID', 'companyName'],
            },
          ],
        },
        {
          model: ExpenseDesignation,
          where: { status: [0, 1] }, // Get ALL designations, not just filtered ones
          required: false,
          include: [
            {
              model: Designation,
              as: 'Designation',
              attributes: ['designationId', 'designationName'],
              required: false,
            },
          ],
        },
      ],
    });

    // Get user details for created/updated by
    const uniqueUserIds = new Set();
    policies.forEach((row) => {
      if (row.createBy) uniqueUserIds.add(+row.createBy);
      if (row.updateBy) uniqueUserIds.add(+row.updateBy);
    });

    const userData = await UserMaster.findAll({
      raw: true,
      where: {
        userMasterID: [...uniqueUserIds],
        status: [0, 1],
      },
      attributes: userAttributes,
    });

    // Format response data
    const formattedData = policies.map((policy) => {
      const policyObj = policy.toJSON();

      const createUser = userData.find(
        (e) => e.userMasterID == policy.createBy,
      );
      policyObj.createdByName = createUser
        ? createUser.displayName
        : policy.createBy;

      if (policy.updateBy) {
        const updateUser = userData.find(
          (e) => e.userMasterID == policy.updateBy,
        );
        policyObj.updatedByName = updateUser
          ? updateUser.displayName
          : policy.updateBy;
      }

      // Format designations - get all designations as a comma-separated string
      // Access from the raw policy object before JSON conversion
      if (policy.ExpenseDesignations && policy.ExpenseDesignations.length > 0) {
        const designationNames = policy.ExpenseDesignations.map(
          (ed) => ed.Designation?.designationName,
        )
          .filter((name) => name)
          .join(', ');
        policyObj.designations = designationNames;
        // Also keep first designation for backwards compatibility
        policyObj.designation = {
          designationId:
            policy.ExpenseDesignations[0].Designation?.designationId,
          designationName:
            policy.ExpenseDesignations[0].Designation?.designationName,
        };
      } else {
        // Fallback: Handle camelCase from toJSON()
        const designationsList = policyObj.expenseDesignations;
        if (designationsList && designationsList.length > 0) {
          const designationNames = designationsList
            .map((ed) => ed.designation?.designationName)
            .filter((name) => name)
            .join(', ');
          policyObj.designations = designationNames || '-';
          policyObj.designation = designationsList[0].designation;
        }
      }

      // Simplify expense head structure
      if (policy.ExpenseHead) {
        policyObj.expenseHead = {
          expenseHeadId: policy.ExpenseHead.expenseHeadId,
          expenseHead: policy.ExpenseHead.expenseHead,
        };
      }

      return policyObj;
    });

    if (exportData) {
      const { generateExcel } = require('../utils/exportData');
      const finalData = formattedData.map((policy) => ({
        PolicyName: policy.policyName,
        ExpenseHead: policy.expenseHead?.expenseHead || '',
        Designations: policy.designations || '',
        EffectiveDate: policy.effectiveDate || '',
        ExpenseType: policy.expenseType || '',
        Status: policy.status == 1 ? 'Active' : 'Deactive',
      }));
      await generateExcel(finalData, 'ExpensePolicy', 'xlsx', res);
      return;
    }

    return res.status(200).json({
      status: 200,
      data: formattedData,
      totalcount: totalCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update expense policy
 */
exports.updateExpensePolicy = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      expensePolicyID,
      policyName,
      expenseHeadId,
      designationIds, // Changed to array
      effectiveDate,
      status,
      expenseType,
    } = req.body;

    policyName = policyName?.trim();

    // Check if policy exists
    const existingPolicy = await ExpensePolicy.findOne({
      where: {
        expensePolicyID,
        status: [0, 1],
      },
      attributes: [
        'expensePolicyID',
        'headID',
        'effectiveDate',
        'expenseType',
        'policyName',
        'status',
      ],
      transaction,
    });

    if (!existingPolicy) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Expense Policy'),
      });
    }

    // Validate designationIds if provided
    if (designationIds) {
      if (!Array.isArray(designationIds) || designationIds.length === 0) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'At least one designation is required!',
        });
      }

      // Validate all designations exist
      const designations = await Designation.findAll({
        where: {
          designationId: designationIds,
          status: 1,
        },
        transaction,
      });

      if (designations.length !== designationIds.length) {
        await transaction.rollback();
        return res.status(200).json({
          status: 404,
          message: message.usermessage.notFoundMessage(
            'One or more designations',
          ),
        });
      }
    }

    // Check if policy name already exists in the company (excluding current policy)
    if (policyName) {
      // Get company ID from existing policy's expense head
      const policyWithHead = await ExpensePolicy.findOne({
        where: { expensePolicyID },
        include: [
          {
            as: 'ExpenseHead',
            model: ExpenseHead,
            required: true,
          },
        ],
        transaction,
      });

      const companyMasterID = policyWithHead?.expenseHead?.companyMasterID;

      if (companyMasterID) {
        const existingPolicyName = await ExpensePolicy.findOne({
          where: {
            policyName: { [Sequelize.Op.iLike]: policyName },
            expensePolicyID: { [Sequelize.Op.ne]: expensePolicyID },
            status: [0, 1],
          },
          include: [
            {
              model: ExpenseHead,
              where: {
                companyMasterID,
              },
              required: true,
            },
          ],
          transaction,
        });

        if (existingPolicyName) {
          await transaction.rollback();
          return res.status(200).json({
            status: 401,
            message:
              'Expense Policy with this name already exists in the company!',
          });
        }
      }
    }

    // Check for duplicate policy (excluding current policy being edited)
    // Use provided values or existing policy values
    const headIDToCheck = expenseHeadId || existingPolicy.headID;
    const effectiveDateToCheck = effectiveDate || existingPolicy.effectiveDate;
    const expenseTypeToCheck = expenseType || existingPolicy.expenseType;

    // Get designations to check
    let designationIdsToCheck = designationIds;
    if (!designationIdsToCheck || designationIdsToCheck.length === 0) {
      const existingDesignations = await ExpenseDesignation.findAll({
        where: {
          expensePolicyID,
          status: [0, 1],
        },
        attributes: ['designationID'],
        transaction,
      });
      designationIdsToCheck = existingDesignations.map(
        (ed) => ed.designationID,
      );
    }

    // Check if another policy exists with same combination (SIMPLE APPROACH LIKE ADD API)
    const duplicatePolicy = await ExpensePolicy.findOne({
      where: {
        headID: headIDToCheck,
        effectiveDate: effectiveDateToCheck,
        expenseType: expenseTypeToCheck,
        expensePolicyID: { [Sequelize.Op.ne]: expensePolicyID },
        status: [0, 1],
      },
      include: [
        {
          model: ExpenseDesignation,
          where: {
            designationID: designationIdsToCheck,
            status: [0, 1],
          },
          required: true,
        },
      ],
      transaction,
    });

    if (duplicatePolicy) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message:
          'Expense Policy already exists with same expense head, designation, effective date and expense type combination!',
      });
    }

    // No duplicate found, proceed with update

    // Update expense policy
    await ExpensePolicy.update(
      {
        policyName,
        headID: expenseHeadId,
        effectiveDate,
        expenseType: expenseType || existingPolicy.expenseType,
        status,
      },
      {
        where: { expensePolicyID },
        individualHooks: true,
        transaction,
        user: req.userDetails,
      },
    );

    // Update designation mappings if designationIds provided
    if (designationIds) {
      // Delete all existing designations
      await ExpenseDesignation.destroy({
        where: {
          expensePolicyID,
          status: [0, 1],
        },
        transaction,
        user: req.userDetails,
      });

      // Create new designation mappings
      for (const designationId of designationIds) {
        await ExpenseDesignation.create(
          {
            expensePolicyID,
            designationID: designationId,
            status: 1,
          },
          {
            transaction,
            user: req.userDetails,
          },
        );
      }
    }

    // Update expense type specific rules
    // First, delete existing rules
    await AccomodationExpenseRule.destroy({
      where: { expensePolicyID },
      transaction,
      user: req.userDetails,
    });

    await FoodExpenseRule.destroy({
      where: { expensePolicyID },
      transaction,
      user: req.userDetails,
    });

    await OwnVehicleExpenseRule.destroy({
      where: { expensePolicyID },
      transaction,
      user: req.userDetails,
    });

    await ExpenseTransportRule.destroy({
      where: { expensePolicyID },
      transaction,
      user: req.userDetails,
    });

    // Create new rules based on updated expense type
    await createExpenseRules(
      expensePolicyID,
      expenseType || existingPolicy.expenseType,
      req.body,
      transaction,
      req.userDetails,
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Expense Policy'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Delete expense policy
 */
exports.deleteExpensePolicy = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { expensePolicyId } = req.body;

    const policy = await ExpensePolicy.findOne({
      where: {
        expensePolicyID: expensePolicyId,
        status: [0, 1],
      },
      transaction,
      user: req.userDetails,
    });

    if (!policy) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Expense Policy'),
      });
    }

    // Hard delete related rules first (foreign key constraints)
    await AccomodationExpenseRule.destroy({
      where: { expensePolicyID: expensePolicyId },
      transaction,
      user: req.userDetails,
    });

    await FoodExpenseRule.destroy({
      where: { expensePolicyID: expensePolicyId },
      transaction,
      user: req.userDetails,
    });

    await OwnVehicleExpenseRule.destroy({
      where: { expensePolicyID: expensePolicyId },
      transaction,
      user: req.userDetails,
    });

    await ExpenseTransportRule.destroy({
      where: { expensePolicyID: expensePolicyId },
      transaction,
      user: req.userDetails,
    });

    // Hard delete related designations
    await ExpenseDesignation.destroy({
      where: { expensePolicyID: expensePolicyId },
      transaction,
      user: req.userDetails,
    });

    // Hard delete expense policy
    await ExpensePolicy.destroy({
      where: { expensePolicyID: expensePolicyId },
      individualHooks:true,
      transaction,
      user: req.userDetails,
    });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Expense Policy'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Change expense policy status
 */
exports.changeExpensePolicyStatus = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { expensePolicyId, status } = req.body;

    const policy = await ExpensePolicy.findOne({
      where: {
        expensePolicyID: expensePolicyId,
        status: [0, 1],
      },
      transaction,
      user: req.userDetails,
    });

    if (!policy) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Expense Policy'),
      });
    }

    await ExpensePolicy.update(
      { status },
      {
        where: { expensePolicyID: expensePolicyId },
        individualHooks: true,
        transaction,
        user: req.userDetails,
      },
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message:
        status == '1'
          ? message.usermessage.activeMessage('Expense Policy')
          : message.usermessage.deactiveMessage('Expense Policy'),
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Get available expense types for user based on designation and expense head
 */
exports.getAvailableExpenseTypes = async (req, res, next) => {
  try {
    const { userMasterID, expenseHeadId, expenseDate } = req.body;

    if (!userMasterID || !expenseHeadId || !expenseDate) {
      return res.status(200).json({
        status: 400,
        message: 'User ID, Expense Head ID and Expense Date are required!',
      });
    }
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    // Get user's designation
    const user = await UserMaster.findOne({
      where: {
        userMasterID,
        status: 1,
      },
      include: [
        {
          required: false,
          model: EmployeeDesignation,
          attributes: ['designationID'],
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

    if (!user || !user.employeeDesignations?.[0]?.designationID) {
      return res.status(200).json({
        status: 200,
        data: [],
      });
    }

    // Find all policies matching:
    // 1. User's designation
    // 2. Selected expense head
    // 3. Effective date <= expense date
    // 4. Active status
    const policies = await ExpensePolicy.findAll({
      where: {
        headID: expenseHeadId,
        effectiveDate: {
          [Sequelize.Op.lte]: expenseDate,
        },
        status: 1,
      },
      include: [
        {
          model: ExpenseDesignation,
          where: {
            designationID: user.employeeDesignations?.[0]?.designationID,
            status: 1,
          },
          required: true,
        },
      ],
      attributes: ['expenseType'],
    });

    // Extract unique expense types (handle duplicates in JavaScript)
    const availableExpenseTypes = [
      ...new Set(policies.map((p) => p.expenseType)),
    ];

    // Map expense types to user-friendly format
    const expenseTypeOptions = availableExpenseTypes.map((type) => ({
      value: type,
      label: getExpenseTypeLabel(type),
    }));

    return res.status(200).json({
      status: 200,
      data: expenseTypeOptions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get expense policy details with rates for validation
 */
exports.getExpensePolicyForValidation = async (req, res, next) => {
  try {
    const { userMasterID, expenseHeadId, expenseDate, expenseType } = req.body;

    if (!userMasterID || !expenseHeadId || !expenseDate || !expenseType) {
      return res.status(200).json({
        status: 400,
        message:
          'User ID, Expense Head ID, Expense Date and Expense Type are required!',
      });
    }
    const filterDate = asiaKolkataDateTime(new Date()).slice(0, 10);
    // Get user's designation
    const user = await UserMaster.findOne({
      where: {
        userMasterID,
        status: 1,
      },
      include: [
        {
          required: true,
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
        },
      ],
    });

    if (!user || !user.employeeDesignations?.[0]?.designationID) {
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage(
          'User or User Designation',
        ),
      });
    }

    // Find policy matching designation, head, date, and type
    const policy = await ExpensePolicy.findOne({
      where: {
        headID: expenseHeadId,
        effectiveDate: {
          [Sequelize.Op.lte]: expenseDate,
        },
        expenseType: expenseType,
        status: 1,
      },
      include: [
        {
          model: ExpenseDesignation,
          where: {
            designationID: user.employeeDesignations?.[0]?.designationID,
            status: 1,
          },
          required: true,
        },
        {
          model: AccomodationExpenseRule,
          where: { status: 1 },
          required: false,
        },
        {
          model: FoodExpenseRule,
          where: { status: 1 },
          required: false,
        },
        {
          model: ExpenseTransportRule,
          where: { status: 1 },
          required: false,
        },
        {
          model: OwnVehicleExpenseRule,
          where: { status: 1 },
          required: false,
        },
      ],
      order: [['effectiveDate', 'DESC']],
    });

    if (!policy) {
      return res.status(200).json({
        status: 404,
        message: 'No active policy found for the selected criteria',
      });
    }

    // Extract rates based on expense type
    let rateData = null;
    let transportOptions = [];
    let vehicleRates = null;

    if (
      expenseType === expenseRuleType.ACCOMMODATION &&
      policy.accomodationExpenseRules?.[0]
    ) {
      rateData = {
        priceMetro: policy.accomodationExpenseRules[0].priceMetro,
        priceNonMetro: policy.accomodationExpenseRules[0].priceNonMetro,
      };
    } else if (
      expenseType === expenseRuleType.FOOD &&
      policy.foodExpenseRules?.[0]
    ) {
      rateData = {
        priceMetro: policy.foodExpenseRules[0].priceMetro,
        priceNonMetro: policy.foodExpenseRules[0].priceNonMetro,
      };
    } else if (
      (expenseType === expenseRuleType.LOCALTRANSPORT ||
        expenseType === expenseRuleType.OUTSTAIONTRAVEL) &&
      policy.expenseTransportRules?.length > 0
    ) {
      // Extract transport options
      transportOptions = policy.expenseTransportRules.map((rule) => ({
        transportRuleID: rule.expenseTransportRuleID,
        transportName: rule.transportName,
      }));
    } else if (
      expenseType === expenseRuleType.OWNVEHICLE &&
      policy.ownVehicleExpenseRules?.length > 0
    ) {
      // Extract own vehicle rates by state
      vehicleRates = policy.ownVehicleExpenseRules.map((rule) => ({
        stateID: rule.stateID,
        twoWheelerRate: rule.priceMetro,
        fourWheelerRate: rule.priceNonMetro,
      }));
    }

    return res.status(200).json({
      status: 200,
      data: {
        expensePolicyID: policy.expensePolicyID,
        policyName: policy.policyName,
        expenseType: policy.expenseType,
        rates: rateData,
        transportOptions: transportOptions,
        vehicleRates: vehicleRates,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's active branch and state for expense date
 */
exports.getUserActiveBranch = async (req, res, next) => {
  try {
    const { userMasterID, expenseDate } = req.body;

    if (!userMasterID || !expenseDate) {
      return res.status(200).json({
        status: 400,
        message: 'User ID and Expense Date are required!',
      });
    }

    // Find active branch for the user on the given date
    const employeeBranch = await EmployeeBranch.findOne({
      where: {
        userMasterID,
        applicableDate: {
          [Sequelize.Op.lte]: expenseDate,
        },
        [Sequelize.Op.or]: [
          { endDate: { [Sequelize.Op.gte]: expenseDate } },
          { endDate: { [Sequelize.Op.eq]: null } },
        ],
        status: 1,
      },
      include: [
        {
          model: Branch,
          as: 'branchMaster',
          attributes: ['branchMasterID', 'branchName', 'cityMasterID'],
          include: [
            {
              model: CityMaster,
              attributes: [
                'cityMasterID',
                'cityName',
                'stateMasterID',
                'isMetro',
              ],
              include: [
                {
                  model: StateMaster,
                  attributes: ['stateMasterID', 'stateName'],
                },
              ],
            },
          ],
        },
      ],
      order: [['applicableDate', 'DESC']],
    });

    if (!employeeBranch || !employeeBranch.branchMaster) {
      return res.status(200).json({
        status: 404,
        message: 'No active branch found for the user on the given date',
      });
    }

    const branch = employeeBranch.branchMaster;
    const city = branch.CityMaster || branch.cityMaster;
    const state = city?.StateMaster || city?.stateMaster;

    return res.status(200).json({
      status: 200,
      data: {
        branchMasterID: branch.branchMasterID,
        branchName: branch.branchName,
        cityMasterID: city?.cityMasterID,
        cityName: city?.cityName,
        isMetro: city?.isMetro,
        stateMasterID: state?.stateMasterID,
        stateName: state?.stateName,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to get user-friendly label for expense type
 */
function getExpenseTypeLabel(expenseType) {
  const labels = {
    [expenseRuleType.ACCOMMODATION]: 'Accommodation',
    [expenseRuleType.FOOD]: 'Food',
    [expenseRuleType.OWNVEHICLE]: 'Own Vehicle',
    [expenseRuleType.OUTSTAIONTRAVEL]: 'Outstation Transport',
    [expenseRuleType.LOCALTRANSPORT]: 'Local Transport',
  };
  return labels[expenseType] || expenseType;
}
