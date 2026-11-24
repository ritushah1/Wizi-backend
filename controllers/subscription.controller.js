const Sequelize = require('sequelize');
const subscriptionPlan = require('../models/subscriptionPlan');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const FormMaster = require('../models/formMaster');
const RoleMaster = require('../models/roleMaster');
const RolePermission = require('../models/rolePermission');
const ProductPermission = require('../models/productPermission');
const companyMaster = require('../models/companyMaster');
const {
  checkSubscriptionPlanExpiration,
  add_WeekOffHoliday_With_Transaction,
} = require('../utils/commonUtilFunctions');
const ProductMaster = require('../models/productMaster');
const SubscriptionPlanAddOn = require('../models/subscriptionPlanAddOn');
const UserMaster = require('../models/userMaster');
const UserTracking = require('../models/userTracking');
const {
  companyAccessType,
  roleType,
  roleMasterRoleNames,
} = require('../utils/dbUtils');
const {
  subscriptionTypes,
  companyAttributes,
  userAttributes,
} = require('../utils/commonVars');
const {
  generateExcelForCompanySubscriptionData,
} = require('../utils/exportData');
const moment = require('moment');

exports.postAddSubscription = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      companyMasterID,
      productMasterID,
      startDate,
      endDate,
      totalUser,
      totalTracking,
      status,
      subscriptionType,
      biometricCost,
      customizationCost,
      customizationDescription,
      softwareCost,
      gstAmount,
      totalIncludingGST,
      totalExcludingGST,
    } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;
    const countTotalChildPrentCompanyUsers = await UserMaster.count({
      where: { status: 1 },
      include: [
        {
          model: companyMaster,
          where: {
            status: 1,
            [Sequelize.Op.or]: [
              { companyMasterID: companyMasterID },
              { parentCompanyMasterID: companyMasterID },
            ],
          },
        },
      ],
    });
    if (+countTotalChildPrentCompanyUsers > +totalUser) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: `Current Active User Count is ${countTotalChildPrentCompanyUsers} you Can not add Subscription User Less then Current Active User`,
      });
    }

    const countTotalChildPrentCompanyUsersTracking = await UserTracking.count({
      where: { trackStatus: 1 },
      include: [
        {
          model: companyMaster,
          as: 'company',
          where: {
            status: 1,
            [Sequelize.Op.or]: [
              { companyMasterID: companyMasterID },
              { parentCompanyMasterID: companyMasterID },
            ],
          },
        },
      ],
    });
    if (+countTotalChildPrentCompanyUsersTracking > +totalTracking) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: `Current Tracking User Count is ${countTotalChildPrentCompanyUsersTracking} you Can not add Subscription Tracking User Less then Current Tracking User`,
      });
    }
    const getActivePlan = await subscriptionPlan.findOne({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
    });

    let prevPlanEndDate = null;

    if (startDate && getActivePlan) {
      const newPlanStartDate = new Date(startDate);
      const activePlanStartDate = new Date(getActivePlan.startDate);

      if (newPlanStartDate <= activePlanStartDate) {
        prevPlanEndDate = newPlanStartDate.toISOString().split('T')[0];
      } else {
        newPlanStartDate.setDate(newPlanStartDate.getDate() - 1);
        prevPlanEndDate = newPlanStartDate.toISOString().split('T')[0];
      }
    }

    if (getActivePlan) {
      await subscriptionPlan.update(
        {
          status: 0,
          endDate: prevPlanEndDate,
        },
        {
          where: {
            companyPlanMasterID: getActivePlan.companyPlanMasterID,
            status: 1,
          },
          transaction,
        },
      );
    }

    const createSubscriptionPlan = await subscriptionPlan.create(
      {
        companyMasterID,
        productMasterID,
        startDate,
        endDate,
        totalUser,
        totalTracking,
        subscriptionType,
        status,
        createBy,
        createByIp,
      },
      { transaction },
    );

    await SubscriptionPlanAddOn.create(
      {
        companyPlanMasterID: createSubscriptionPlan.companyPlanMasterID,
        user: totalUser,
        trackingUser: totalTracking,
        softwareCost,
        biometricCost,
        customizationCost,
        customizationDescription,
        totalExcludingGST,
        gstAmount,
        totalIncludingGST,
      },
      { user: req.userDetails, transaction },
    );
    if (!getActivePlan) {
      await createNewRolePermissionBasedOnSubscriptionProduct(
        req,
        companyMasterID,
        productMasterID,
        transaction,
      );
    } else if (+getActivePlan.productMasterID != +productMasterID) {
      await updateRolePermissionBasedOnProductPermission(
        req,
        companyMasterID,
        +getActivePlan.productMasterID,
        productMasterID,
        transaction,
      );
    }

    if (subscriptionType != subscriptionTypes.PLAN_CHANGE) {
      await add_WeekOffHoliday_With_Transaction(
        companyMasterID,
        [],
        startDate,
        null,
        null,
        false,
        null,
        transaction,
      );
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Subscription Plan'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

async function createNewRolePermissionBasedOnSubscriptionProduct(
  req,
  companyMasterID,
  productMasterID,
  transaction,
) {
  try {
    const getallChildParentCompanyData = await companyMaster.findAll({
      where: {
        [Sequelize.Op.or]: [
          { companyMasterID: +companyMasterID },
          { parentCompanyMasterID: +companyMasterID },
        ],
        status: [0, 1],
      },
    });
    const allChildParentCompanyMasterIDs = getallChildParentCompanyData.map(
      (e) => e.companyMasterID,
    );
    const roleMasterData = await RoleMaster.findAll({
      raw: true,
      where: {
        companyMasterID: allChildParentCompanyMasterIDs,
      },
    });

    const roleIds = roleMasterData.map((e) => e.roleMasterID);

    await RolePermission.destroy(
      {
        where: {
          roleMasterID: {
            [Sequelize.Op.in]: roleIds,
          },
        },
        hooks: true,
        individualHooks: true,
        user: req.userDetails,
      },
      {
        transaction,
      },
    );

    await RoleMaster.destroy(
      {
        where: {
          roleMasterID: {
            [Sequelize.Op.in]: roleIds,
          },
        },
        hooks: true,
        individualHooks: true,
        user: req.userDetails,
      },
      {
        transaction,
      },
    );

    const getAllProductPermission = await ProductPermission.findAll({
      where: {
        productMasterID: productMasterID,
        status: 1,
      },
      include: [
        {
          model: FormMaster,
          where: {
            status: 1,
          },
        },
      ],
      order: [
        ['formMasterID', 'ASC'],
        ['operationID', 'ASC'],
      ],
    });

    const createRolePermissionArray = [];
    for (let company of allChildParentCompanyMasterIDs) {
      const [createAdminRole, createEmployeeRole] = await Promise.all([
        // Admin Role
        RoleMaster.create(
          {
            roleName: roleMasterRoleNames.ADMIN,
            roleType: roleType.COMPANY_WISE,
            companyAccessType: companyAccessType.OWN_PLUS_CHILD_COMPANY,
            companyMasterID: company,
          },
          { user: req.userDetails, transaction },
        ),
        //Employee Role
        await RoleMaster.create(
          {
            roleName: roleMasterRoleNames.EMPLOYEE,
            roleType: 'companyWise',
            companyAccessType: 'ownPlusChildCompany',
            companyAccessType: companyAccessType.OWN_PLUS_CHILD_COMPANY,
            companyMasterID: company,
          },
          { user: req.userDetails, transaction },
        ),
      ]);

      for (const permission of getAllProductPermission) {
        const isDefaultRights = permission?.formMaster?.defaultRight || false;
        const adminRoleRightsObj = {
          roleMasterID: createAdminRole.roleMasterID,
          formMasterID: permission.formMasterID,
          operationID: permission.operationID,
        };
        createRolePermissionArray.push(adminRoleRightsObj);
        if (isDefaultRights) {
          const employeeRoleRightsObj = {
            roleMasterID: createEmployeeRole.roleMasterID,
            formMasterID: permission.formMasterID,
            operationID: permission.operationID,
          };
          createRolePermissionArray.push(employeeRoleRightsObj);
        }
      }
    }
    await RolePermission.bulkCreate(createRolePermissionArray, {
      user: req.userDetails,
      transaction,
    });
  } catch (error) {
    throw new Error('Error in Create New Role Permission: ' + error.message);
  }
}

async function updateRolePermissionBasedOnProductPermission(
  req,
  companyMasterID,
  oldProductMasterID,
  newProductMasterID,
  transaction,
) {
  try {
    const [findAllOldProductPerMission, findAllNewProductPerMission] =
      await Promise.all([
        ProductPermission.findAll({
          where: {
            productMasterID: oldProductMasterID,
            status: 1,
          },
          order: [
            ['formMasterID', 'ASC'],
            ['operationID', 'ASC'],
          ],
          include: [
            {
              model: FormMaster,
            },
          ],
        }),
        ProductPermission.findAll({
          where: {
            productMasterID: newProductMasterID,
            status: 1,
          },
          order: [
            ['formMasterID', 'ASC'],
            ['operationID', 'ASC'],
          ],
          include: [
            {
              model: FormMaster,
            },
          ],
        }),
      ]);
    const getallChildParentCompanyData = await companyMaster.findAll({
      where: {
        [Sequelize.Op.or]: [
          { companyMasterID: +companyMasterID },
          { parentCompanyMasterID: +companyMasterID },
        ],
        status: [0, 1],
      },
    });
    const allChildParentCompanyMasterIDs = getallChildParentCompanyData.map(
      (e) => e.companyMasterID,
    );
    const roleMasterData = await RoleMaster.findAll({
      raw: true,
      where: {
        companyMasterID: allChildParentCompanyMasterIDs,
      },
      attributes: ['roleMasterID'],
    });

    const oldPermissionSet = new Set(
      findAllOldProductPerMission.map(
        (p) => `${p.formMasterID}-${p.operationID}`,
      ),
    );
    const newFullPermissionSet = new Set(
      findAllNewProductPerMission.map(
        (p) => `${p.formMasterID}-${p.operationID}`,
      ),
    );
    const newDefaultPermissionSet = new Set(
      findAllNewProductPerMission
        .filter((p) => p.formMaster?.defaultRight == true)
        .map((p) => `${p.formMasterID}-${p.operationID}`),
    );
    const toBeRemovedPermissions = [...oldPermissionSet].filter(
      (key) => !newFullPermissionSet.has(key),
    );
    const toBeAddPermissions = [...newDefaultPermissionSet].filter(
      (key) => !oldPermissionSet.has(key),
    );
    if (
      toBeRemovedPermissions.length === 0 &&
      toBeAddPermissions.length === 0
    ) {
      return;
    }

    const CHUNK_SIZE = 500;
    if (toBeRemovedPermissions.length > 0) {
      const seen = new Set();

      const removeConditions = roleMasterData
        .flatMap((role) =>
          toBeRemovedPermissions.map((key) => {
            const [formMasterID, operationID] = key.split('-').map(Number);
            const identifier = `${role.roleMasterID}-${formMasterID}-${operationID}`;

            if (seen.has(identifier)) return null;
            seen.add(identifier);

            return {
              roleMasterID: role.roleMasterID,
              formMasterID,
              operationID,
            };
          }),
        )
        .filter(Boolean);
      for (let i = 0; i < removeConditions.length; i += CHUNK_SIZE) {
        const chunk = removeConditions.slice(i, i + CHUNK_SIZE);

        await RolePermission.destroy({
          where: { [Sequelize.Op.or]: chunk },
          hooks: true,
          individualHooks: true,
          user: req.userDetails,
          transaction,
        });
      }
    }

    if (toBeAddPermissions.length > 0) {
      const newRolePermissions = roleMasterData.flatMap((role) =>
        toBeAddPermissions.map((key) => {
          const [formMasterID, operationID] = key.split('-').map(Number);
          return {
            roleMasterID: role.roleMasterID,
            formMasterID,
            operationID,
            status: 1,
          };
        }),
      );

      // process in chunks
      for (let i = 0; i < newRolePermissions.length; i += CHUNK_SIZE) {
        const chunk = newRolePermissions.slice(i, i + CHUNK_SIZE);

        await RolePermission.bulkCreate(chunk, {
          transaction,
          user: req.userDetails,
        });
      }
    }
  } catch (error) {
    throw new Error(
      'Error in Change Role Permission As per Product Permission: ' +
        error.message,
    );
  }
}

exports.getAllSubscriptionData = async (req, res, next) => {
  try {
    let { limit, page, companyMasterID, exportData } = await req.body;

    const paginationQuery = {};
    const condition = {
      status: {
        [Sequelize.Op.in]: [0, 1],
      },
      companyMasterID: companyMasterID,
    };
    if (page && limit && !exportData) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }
    const { rows: subscriptionPlanData, count } =
      await subscriptionPlan.findAndCountAll({
        where: condition,
        ...paginationQuery,
        order: [['companyPlanMasterID', 'DESC']],
        include: [
          {
            model: ProductMaster,
          },
          {
            model: companyMaster,
          },
          {
            model: UserMaster,
            as: 'createdByUser',
            attributes: userAttributes,
          },
          {
            required: false,
            separate: true,
            model: SubscriptionPlanAddOn,
            order: [['createdAt', 'DESC']],
            include: [
              {
                model: UserMaster,
                as: 'createdByUser',
                attributes: userAttributes,
              },
            ],
          },
        ],
      });

    if (exportData) {
      const finalDataToExport = [];
      let index = 0;
      for (let item of subscriptionPlanData) {
        const addOnsData = item.subscriptionPlanAddOns || [];
        for (let tran of addOnsData) {
          const Info = [
            index + 1,
            item.subscriptionType,
            item.productMaster?.productName || '',
            moment(item.startDate, 'YYYY-MM-DD').format('DD-MM-YYYY') || '',
            moment(item.endDate, 'YYYY-MM-DD').format('DD-MM-YYYY') || '',
            item.totalUser,
            item.totalTracking,
            item.createdByUser?.displayName || '', // Plan Created By
            moment(item.createdAt).format('DD-MM-YYYY HH:mm:ss'), // Plan Created At
            tran.user, //Add on User
            tran.trackingUser, //Add on User
            tran.softwareCost, //Add on Software Cost
            tran.biometricCost, //Add on Biometric Cost
            tran.customizationCost, //Add on Customization Cost
            tran.customizationDescription || '', //Add on Customization Description
            tran.totalExcludingGST, //Add on Total Excluding GST
            tran.gstAmount, //Add on Gst Amount
            tran.totalIncludingGST, //Add on Total Including GST
            tran.createdByUser?.displayName || '', // Add-on Created By
            moment(tran.createdAt).format('DD-MM-YYYY HH:mm:ss'), // Add-on Created At
          ];
          finalDataToExport.push(Info);
        }
        index++;
      }
      await generateExcelForCompanySubscriptionData(
        finalDataToExport,
        'Company Subscriptions',
        'xlsx',
        res,
      );
      return;
    }
    return res
      .status(200)
      .json({ status: 200, data: subscriptionPlanData, totalcount: count });
  } catch (err) {
    next(err);
  }
};

exports.getSubscriptionById = async (req, res, next) => {
  try {
    const get_one_data = await subscriptionPlan.findOne({
      where: {
        companyPlanMasterID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      include: [
        {
          required: false,
          separate: true,
          model: SubscriptionPlanAddOn,
          order: [['createdAt', 'DESC']],
          include: [
            {
              model: UserMaster,
              as: 'createdByUser',
              attributes: userAttributes,
            },
          ],
        },
        {
          model: ProductMaster,
        },
        {
          model: companyMaster,
          attributes: companyAttributes,
        },
        {
          model: UserMaster,
          as: 'createdByUser',
          attributes: userAttributes,
        },
      ],
    });

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getSubscriptionPlanExpiration = async (req, res, next) => {
  try {
    const companyMasterId =
      +req.userDetails.parentCompanyMasterId == 0
        ? +req.userDetails.companyMasterId
        : +req.userDetails.parentCompanyMasterId;

    if (!companyMasterId) {
      return res.status(200).json({
        status: 401,
        message: message.usermessage.notFoundMessage('companyMasterId'),
      });
    }
    const get_one_data = await checkSubscriptionPlanExpiration(companyMasterId);

    return res.status(200).json({ status: 200, data: get_one_data });
  } catch (err) {
    next(err);
  }
};

exports.getActiveSubscription = async (req, res, next) => {
  try {
    const { companyMasterID } = await req.body;

    const getDataActive = await companyMaster.findOne({
      where: {
        [Sequelize.Op.or]: [{ companyMasterID }],
      },
      attributes: ['companyName', 'parentCompanyMasterID'],
    });

    const company =
      getDataActive.parentCompanyMasterID == 0
        ? companyMasterID
        : getDataActive.parentCompanyMasterID;

    const subscriptionPlans = await subscriptionPlan.findOne({
      where: {
        companyMasterID: company,
        status: 1,
      },
      include: [
        {
          model: companyMaster,
          attributes: ['companyName'],
        },
      ],
    });

    return res.status(200).json({ status: 200, data: subscriptionPlans });
  } catch (err) {
    next(err);
  }
};

exports.manageSubscriptionAddOns = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      companyPlanMasterID,
      totalUser,
      totalTracking,
      softwareCost,
      biometricCost,
      customizationCost,
      customizationDescription,
      totalExcludingGST,
      gstAmount,
      totalIncludingGST,
    } = await req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    const findSubscriptionData = await subscriptionPlan.findOne({
      where: {
        companyPlanMasterID,
      },
    });
    const newTotalUsers =
      +findSubscriptionData.totalUser + (+totalUser ? +totalUser : 0);
    const newTotalTracking =
      +findSubscriptionData.totalTracking +
      (+totalTracking ? +totalTracking : 0);
    await subscriptionPlan.update(
      {
        totalUser: newTotalUsers,
        totalTracking: newTotalTracking,
        updateBy,
        updateByIp,
      },
      {
        where: { companyPlanMasterID: companyPlanMasterID },
        transaction,
      },
    );
    await SubscriptionPlanAddOn.create(
      {
        companyPlanMasterID,
        user: totalUser,
        trackingUser: totalTracking,
        softwareCost,
        biometricCost,
        customizationCost,
        customizationDescription,
        totalExcludingGST,
        gstAmount,
        totalIncludingGST,
      },
      { user: req.userDetails, transaction },
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Subscription Add-On'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.updateUserSubscriptionAddOnsData = async (req, res, next) => {
  try {
    const findSubscriptionData = await subscriptionPlan.findAll({
      order: [['companyPlanMasterID', 'ASC']],
    });

    const addOnDataArray = [];
    const planIDs = [];
    for (let plan of findSubscriptionData) {
      const addOnObj = {
        companyPlanMasterID: +plan.companyPlanMasterID,
        createBy: plan.createBy,
        user: plan.totalUser,
        trackingUser: plan.totalTracking,
        createdAt: plan.createdAt,
        updatedAt: plan.createdAt,
      };
      addOnDataArray.push(addOnObj);
      planIDs.push(plan.companyPlanMasterID);
    }
    await SubscriptionPlanAddOn.bulkCreate(addOnDataArray, {
      hooks: false,
      individualHooks: false,
    });
    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Subscription Add-On'),
      planIDs,
    });
  } catch (err) {
    next(err);
  }
};
