const Sequelize = require('sequelize');
const ProductMaster = require('../models/productMaster');
const ProductPermission = require('../models/productPermission');
const message = require('../response_message/message');
const sequelize = require('../config/database');
const FormMaster = require('../models/formMaster');
const subscriptionPlan = require('../models/subscriptionPlan');
const companyMaster = require('../models/companyMaster');
const RoleMaster = require('../models/roleMaster');
const RolePermission = require('../models/rolePermission');
const OnlineSubscriptionPlansFeature = require('../models/onlineSubscriptionPlansFeature');

exports.postAddProduct = async (req, res, next) => {
  try {
    const {
      formarray,
      productName,
      productCode,
      productPrice,
      description,
      totalUser,
      totalTracking,
    } = await req.body;
    const createBy = req.userDetails.userMasterId;
    const createByIp = req.userDetails.userIpAddress;

    const transaction = await sequelize.transaction();

    try {
      const insert_db_status = await ProductMaster.create(
        {
          productName,
          productCode,
          productPrice,
          description,
          productPrice,
          totalUser,
          totalTracking,
          createBy,
          createByIp,
        },
        { transaction },
      );

      for (let item of formarray) {
        item.productMasterID = insert_db_status.productMasterID;
        item.productPermissionID = null;
        item.createBy = createBy;
        item.createByIp = createByIp;
      }

      await ProductPermission.bulkCreate(formarray, { transaction });

      await transaction.commit();

      res.status(200).json({
        status: 200,
        message: message.usermessage.productadd,
        data: {},
      });
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      res.status(200).send({
        status: 401,
        message: 'Fail to import data!',
        error: error.message,
        data: formarray,
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.getAllProductData = async (req, res, next) => {
  try {
    let { limit, page, searchQuery } = await req.body;
    let offset = (page - 1) * limit;
    let product_master = [],
      totalcount;
    if (searchQuery) {
      product_master = await ProductMaster.findAll({
        where: {
          [Sequelize.Op.or]: [
            { productName: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' } },
            { productCode: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' } },
            {
              [Sequelize.Op.or]: [
                sequelize.where(
                  sequelize.cast(
                    sequelize.col('productMaster.totalUser'),
                    'varchar',
                  ),
                  { [Sequelize.Op.iLike]: `%${searchQuery}%` },
                ),
                sequelize.where(
                  sequelize.cast(
                    sequelize.col('productMaster.totalTracking'),
                    'varchar',
                  ),
                  { [Sequelize.Op.iLike]: `%${searchQuery}%` },
                ),
                sequelize.where(
                  sequelize.cast(
                    sequelize.col('productMaster.productPrice'),
                    'varchar',
                  ),
                  { [Sequelize.Op.iLike]: `%${searchQuery}%` },
                ),
              ],
            },
          ],
          status: ['0', '1'],
        },
        limit: limit,
        offset: offset,
      });
      totalcount = await ProductMaster.count({
        where: {
          [Sequelize.Op.or]: [
            { productName: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' } },
            { productCode: { [Sequelize.Op.iLike]: '%' + searchQuery + '%' } },
            {
              [Sequelize.Op.or]: [
                sequelize.where(
                  sequelize.cast(
                    sequelize.col('productMaster.totalUser'),
                    'varchar',
                  ),
                  { [Sequelize.Op.iLike]: `%${searchQuery}%` },
                ),
                sequelize.where(
                  sequelize.cast(
                    sequelize.col('productMaster.totalTracking'),
                    'varchar',
                  ),
                  { [Sequelize.Op.iLike]: `%${searchQuery}%` },
                ),
                sequelize.where(
                  sequelize.cast(
                    sequelize.col('productMaster.productPrice'),
                    'varchar',
                  ),
                  { [Sequelize.Op.iLike]: `%${searchQuery}%` },
                ),
              ],
            },
          ],
          status: ['0', '1'],
        },
      });
    } else if (limit == '' && page == '') {
      product_master = await ProductMaster.findAll({
        raw: true,
        where: {
          status: 1,
        },
        order: [['productName', 'ASC']],
      });
      totalcount = await ProductMaster.count({
        raw: true,
        where: { status: ['0', '1'] },
      });
    } else {
      product_master = await ProductMaster.findAll({
        raw: true,
        where: {
          status: {
            [Sequelize.Op.in]: [0, 1],
          },
        },
        order: [['productName', 'ASC']],
        limit: limit,
        offset: offset,
      });
      totalcount = await ProductMaster.count({
        raw: true,
        where: { status: ['0', '1'] },
      });
    }

    res
      .status(200)
      .json({ status: 200, data: product_master, totalcount: totalcount });
  } catch (err) {
    next(err);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    let get_one_data = await ProductMaster.findOne({
      where: {
        productMasterID: req.params.id,
        status: {
          [Sequelize.Op.in]: [0, 1],
        },
      },
      raw: true,
    });

    let getPermission = [];
    getPermission = await ProductPermission.findAll({
      where: {
        productMasterID: req.params.id,
      },
    });

    for (var i = 0; i < getPermission.length; i++) {
      let getdata = await FormMaster.findOne({
        where: {
          formMasterID: getPermission[i].formMasterID,
          status: 1,
        },
      });
      getPermission[i].dataValues.parent = getdata.parentFormMasterID;
    }

    if (!get_one_data)
      res
        .status(200)
        .json({ status: 200, message: message.usermessage.deletedrecord });
    else
      res.status(200).json({
        stauts: 200,
        data: get_one_data,
        productPermission: getPermission,
      });
  } catch (err) {
    next(err);
  }
};

exports.getProductFeatures = async (req, res, next) => {
  try {
    const features = await OnlineSubscriptionPlansFeature.findAll({
      where: { productMasterID: req.params.id },
      attributes: ['onlineSubscriptionPlansFeatureID', 'featureName'],
    });

    res.status(200).json({
      status: 200,
      data: features,
    });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateProductFeatures = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { productMasterID, features = [] } = req.body;

    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;

    if (features && features.length > 0) {
      // Check for duplicates
      const uniqueFeaturesMap = new Map(
        features.map((item) => [item.featureName.toLowerCase().trim(), item]),
      );

      if (uniqueFeaturesMap.size !== features.length) {
        await transaction.rollback();
        return res.status(200).json({
          status: 401,
          message: 'Duplicate feature name found.',
        });
      }

      const uniqueFeatures = Array.from(uniqueFeaturesMap.values());

      await OnlineSubscriptionPlansFeature.destroy({
        where: { productMasterID },
        transaction,
      });

      const featureData = uniqueFeatures.map((feature) => ({
        productMasterID: productMasterID,
        featureName: feature.featureName.trim(),
        createBy: updateBy,
        createByIp: updateByIp,
        updateBy,
        updateByIp,
      }));

      await OnlineSubscriptionPlansFeature.bulkCreate(featureData, {
        transaction,
      });
    }

    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Features'),
    });
  } catch (err) {
    if (transaction) await transaction.rollback();
    next(err);
  }
};

exports.getOnlineSubscriptionPlans = async (req, res, next) => {
  try {
    let { limit = 4 } = req.query;
    const productPlans = await ProductMaster.findAll({
      where: {
        isOnline: true,
        status: 1,
      },
      attributes: [
        'productMasterID',
        'productName',
        'productCode',
        'description',
        'productPrice',
      ],
      include: [
        {
          model: OnlineSubscriptionPlansFeature,
          as: 'features',
          attributes: ['onlineSubscriptionPlansFeatureID', 'featureName'],
        },
      ],
      limit: parseInt(limit),
      order: [['productPrice', 'ASC']],
    });

    res.status(200).json({
      status: 200,
      data: productPlans,
    });
  } catch (err) {
    next(err);
  }
};

exports.postUpdateProduct = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      formarray = [],
      productMasterID,
      productName,
      productCode,
      productPrice,
      description,
      totalUser,
      totalTracking,
    } = req.body;
    const updateBy = req.userDetails.userMasterId;
    const updateByIp = req.userDetails.userIpAddress;
    // ✅ 1. Update ProductMaster
    await ProductMaster.update(
      {
        productName,
        productCode,
        productPrice,
        description,
        totalUser,
        totalTracking,
        updateBy,
        updateByIp,
      },
      {
        where: { productMasterID },
        transaction,
      },
    );
    if (!Array.isArray(formarray)) {
      throw new Error('formarray must be an array');
    }

    // ✅ 1. Remove duplicates
    const uniqueFormArray = Array.from(
      new Map(
        formarray.map((item) => [
          `${item.formMasterID}-${item.operationID}`,
          item,
        ]),
      ).values(),
    );

    // ✅ 2. Fetch existing permissions
    const existingPermissions = await ProductPermission.findAll({
      where: { productMasterID },
      attributes: ['formMasterID', 'operationID'],
      raw: true,
      transaction,
    });

    // ✅ 3. Convert to Sets
    const existingSet = new Set(
      existingPermissions.map((p) => `${p.formMasterID}-${p.operationID}`),
    );

    const newSet = new Set(
      uniqueFormArray.map((p) => `${p.formMasterID}-${p.operationID}`),
    );

    // ✅ 4. Find differences
    const toAdd = [...newSet].filter((key) => !existingSet.has(key));
    const toRemove = [...existingSet].filter((key) => !newSet.has(key));
    await updateProductPermissionBasedOnFormArray(
      productMasterID,
      toRemove,
      toAdd,
      updateBy,
      updateByIp,
      transaction,
    );
    await destroyRolePermissionBasedOnProductPermission(
      req,
      productMasterID,
      toRemove,
      transaction,
    );
    await transaction.commit();
    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Subscription Plan'),
    });
  } catch (err) {
    await transaction.rollback();

    next(err);
  }
};
async function updateProductPermissionBasedOnFormArray(
  productMasterID,
  toRemove,
  toAdd,
  createBy,
  createByIp,
  transaction,
) {
  try {
    // ✅ Early exit (performance boost)
    if (toAdd.length === 0 && toRemove.length === 0) {
      return;
    }

    const CHUNK_SIZE = 500;

    // ✅ 5. DELETE removed permissions (Improved)
    if (toRemove.length > 0) {
      const removeConditions = toRemove.map((key) => {
        const [formMasterID, operationID] = key.split('-').map(Number);
        return { formMasterID, operationID };
      });

      for (let i = 0; i < removeConditions.length; i += CHUNK_SIZE) {
        const chunk = removeConditions.slice(i, i + CHUNK_SIZE);

        await ProductPermission.destroy({
          where: {
            productMasterID,
            [Sequelize.Op.or]: chunk.map((c) => ({
              formMasterID: c.formMasterID,
              operationID: c.operationID,
            })),
          },
          transaction,
        });
      }
    }

    // ✅ 6. ADD new permissions
    if (toAdd.length > 0) {
      const addData = toAdd.map((key) => {
        const [formMasterID, operationID] = key.split('-').map(Number);
        return {
          formMasterID,
          operationID,
          productMasterID,
          createBy,
          createByIp,
          status: 1,
        };
      });

      for (let i = 0; i < addData.length; i += CHUNK_SIZE) {
        const chunk = addData.slice(i, i + CHUNK_SIZE);

        await ProductPermission.bulkCreate(chunk, {
          transaction,
        });
      }
    }
  } catch (error) {
    throw new Error(
      'Error in Change Product Permission As per Form Array: ' + error.message,
    );
  }
}

async function destroyRolePermissionBasedOnProductPermission(
  req,
  productMasterID,
  toRemove,
  transaction,
) {
  try {
    // ✅ Early exit
    if (!toRemove?.length) return;

    // ✅ Step 1: Get all active plans
    const plans = await subscriptionPlan.findAll({
      where: {
        productMasterID,
        status: 1,
      },
      attributes: ['companyMasterID'],
      raw: true,
    });

    if (!plans.length) return;

    // ✅ Step 2: Collect all company IDs
    const companyIDs = [...new Set(plans.map((p) => p.companyMasterID))];

    // ✅ Step 3: Get parent + child companies in ONE query
    const companies = await companyMaster.findAll({
      where: {
        [Sequelize.Op.or]: [
          { companyMasterID: companyIDs },
          { parentCompanyMasterID: companyIDs },
        ],
        status: [0, 1],
      },
      attributes: ['companyMasterID'],
      raw: true,
    });

    const allCompanyIDs = [...new Set(companies.map((c) => c.companyMasterID))];

    if (!allCompanyIDs.length) return;

    // ✅ Step 4: Get all roles in ONE query
    const roles = await RoleMaster.findAll({
      where: {
        companyMasterID: allCompanyIDs,
      },
      attributes: ['roleMasterID'],
      raw: true,
    });

    if (!roles.length) return;

    // ✅ Step 5: Pre-process toRemove once
    const parsedKeys = toRemove.map((key) => {
      const [formMasterID, operationID] = key.split('-').map(Number);
      return { formMasterID, operationID };
    });

    // ✅ Build remove Permission
    for (let i = 0; i < roles.length; i += 50) {
      const roleChunk = roles.slice(i, i + 50);

      const chunkConditions = roleChunk.flatMap((role) =>
        parsedKeys.map((key) => ({
          roleMasterID: role.roleMasterID,
          formMasterID: key.formMasterID,
          operationID: key.operationID,
        })),
      );

      await RolePermission.destroy({
        where: { [Sequelize.Op.or]: chunkConditions },
        hooks: true,
        individualHooks: true,
        user: req.userDetails,
        transaction,
      });
    }
  } catch (error) {
    throw new Error(
      'Error in Change Role Permission As per Product Permission: ' +
        error.message,
    );
  }
}

exports.poststatuschange = async (req, res, next) => {
  try {
    let = { productMasterID, status } = await req.body;
    let delete_status;
    let result = await sequelize.transaction(async (t) => {
      if (status == '1') {
        delete_status = await ProductMaster.update(
          {
            status: '1',
          },
          {
            where: { productMasterID: productMasterID, status: ['1', '0'] },
            transaction: t,
          },
        );
      } else {
        delete_status = await ProductMaster.update(
          {
            status: '0',
          },
          {
            where: { productMasterID: productMasterID, status: ['1', '0'] },
            transaction: t,
          },
        );
      }

      if (delete_status != 0) {
        res.status(200).json({
          status: 200,
          message: message.usermessage.productdelete,
          data: {},
        });
      } else {
        res.status(200).json({
          status: 200,
          message: message.usermessage.deletedrecord,
          data: {},
        });
      }
      return delete_status;
    });
  } catch (err) {
    next(err);
  }
};

/**
 * delete by i
 *
 * @param {id} productMasterID  to delete id
 */
exports.postDeleteProductById = async (req, res, next) => {
  try {
    let = { productMasterID } = await req.body;
    let result = await sequelize.transaction(async (t) => {
      let delete_status = await ProductMaster.update(
        {
          status: 2,
        },
        {
          where: { productMasterID: productMasterID },
          transaction: t,
        },
      );

      res
        .status(200)
        .json({ status: 200, message: message.usermessage.productdelete });
      return delete_status;
    });
  } catch (err) {
    next(err);
  }
};
