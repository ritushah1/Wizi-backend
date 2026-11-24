const CategoryMaster = require('../models/categoryMaster');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { DatabaseOperationEnum } = require('../utils/dbUtils');

/**
 * Add new category
 */
exports.postAddCategory = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      categoryName,
      description,
      color,
      icon,
      displayOrder,
      companyMasterID,
      status,
    } = req.body;

    if (!categoryName || !String(categoryName).trim() || !companyMasterID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'Category name and company are required and cannot be blank',
      });
    }

    categoryName = categoryName.trim();
    const dbOperation = DatabaseOperationEnum.CREATE;

    // Check if category already exists
    const findCategory = await CategoryMaster.findOne({
      where: {
        categoryName: {
          [Sequelize.Op.iLike]: categoryName,
        },
        companyMasterID: companyMasterID,
        status: 1,
      },
      transaction,
    });

    if (findCategory) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Category With Same Name'),
      });
    }

    let categoryObject = {
      categoryName,
      description: description || null,
      color: color || null,
      icon: icon || null,
      displayOrder: displayOrder || 0,
      companyMasterID,
      status: status !== undefined ? status : 1,
    };

    await CategoryMaster.create(categoryObject, {
      user: {
        userMasterId: req.userDetails.userMasterId,
        userIpAddress: req.userDetails.userIpAddress,
      },
      transaction,
      dbOperation,
    });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Category'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * Get category by ID
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const { categoryMasterID } = req.body;

    const getCategory = await CategoryMaster.findOne({
      where: { categoryMasterID: categoryMasterID, status: ['0', '1'] },
      raw: true,
    });

    if (!getCategory) {
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Category'),
      });
    }

    return res.status(200).json({ status: 200, data: getCategory });
  } catch (err) {
    next(err);
  }
};

/**
 * Update category
 */
exports.postUpdateCategory = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    console.log('Update category request body:', req.body); // Debug log
    
    let {
      categoryMasterID,
      categoryName,
      description,
      color,
      icon,
      displayOrder,
      companyMasterID,
      status,
    } = req.body;

    // Validate required fields
    if (!categoryMasterID || !categoryName || !String(categoryName).trim() || !companyMasterID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'Missing required fields: categoryMasterID, categoryName (cannot be blank), and companyMasterID are required',
      });
    }

    categoryName = categoryName.trim();
    const dbOperation = DatabaseOperationEnum.UPDATE;

    // Check if category name already exists (excluding current category)
    const findCategory = await CategoryMaster.findOne({
      where: {
        categoryName: {
          [Sequelize.Op.iLike]: categoryName,
        },
        companyMasterID: companyMasterID,
        categoryMasterID: { [Sequelize.Op.notIn]: [categoryMasterID] },
        status: 1,
      },
      transaction,
    });

    if (findCategory) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Category'),
      });
    }

    await CategoryMaster.update(
      {
        categoryName,
        description: description || null,
        color: color || null,
        icon: icon || null,
        displayOrder: displayOrder || 0,
        status,
      },
      {
        where: { categoryMasterID: categoryMasterID },
        user: {
          userMasterId: req.userDetails.userMasterId,
          userIpAddress: req.userDetails.userIpAddress,
        },
        transaction,
        dbOperation,
      },
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Category'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * Delete category
 */
exports.postDeleteCategory = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { categoryMasterID } = req.body;
    const dbOperation = DatabaseOperationEnum.DELETE;

    // Check if category is used in any courses
    // Courses may store either category name (string) or categoryMasterID (as string)
    const Course = require('../models/course');
    const category = await CategoryMaster.findOne({
      where: { categoryMasterID: categoryMasterID },
      transaction,
    });

    if (!category) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Category'),
      });
    }

    // Check for both category name and categoryMasterID (stored as string)
    const coursesUsingCategory = await Course.count({
      where: {
        [Sequelize.Op.or]: [
          { category: category.categoryName },
          { category: String(categoryMasterID) },
        ],
        status: { [Sequelize.Op.in]: [0, 1] },
      },
      transaction,
    });

    if (coursesUsingCategory > 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'Cannot delete category. It is currently assigned to one or more courses.',
      });
    }


    await CategoryMaster.destroy({
      where: { categoryMasterID: categoryMasterID },
      user: {
        userMasterId: req.userDetails.userMasterId,
        userIpAddress: req.userDetails.userIpAddress,
      },
      transaction,
      dbOperation,
    });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Category'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * Get all categories by company
 */
exports.getCategoryByCompanyId = async (req, res, next) => {
  try {
    const { companyMasterID, page, limit, searchQuery } = req.body;

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const offset = (pageNumber - 1) * pageSize;

    let whereClause = {
      companyMasterID: companyMasterID,
      status: ['0', '1'],
    };

    if (searchQuery && searchQuery.trim() !== '') {
      whereClause.categoryName = {
        [Sequelize.Op.iLike]: `%${searchQuery}%`,
      };
    }

    const { count, rows } = await CategoryMaster.findAndCountAll({
      where: whereClause,
      order: [
        ['categoryMasterID', 'DESC'],
      ],
      limit: pageSize,
      offset: offset,
      raw: true,
    });

    return res.status(200).json({
      status: 200,
      data: rows,
      totalcount: count,
      currentPage: pageNumber,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get active categories by company
 */
exports.getActiveCategoryByCompanyId = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;

    const categories = await CategoryMaster.findAll({
      where: {
        companyMasterID: companyMasterID,
        status: 1,
      },
      order: [
        ['displayOrder', 'ASC'],
        ['categoryName', 'ASC'],
      ],
      raw: true,
    });

    return res.status(200).json({
      status: 200,
      data: categories,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Change category status
 */
exports.postStatusChange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { categoryMasterID, status } = req.body;
    const dbOperation = DatabaseOperationEnum.UPDATE;

    // If deactivating (status = 0), check if category is in use
    if (status == '0' || status == 0) {
      // Check if category is used in any courses
      // Courses may store either category name (string) or categoryMasterID (as string)
      const Course = require('../models/course');
      const category = await CategoryMaster.findOne({
        where: { categoryMasterID: categoryMasterID },
        transaction,
      });

      if (!category) {
        await transaction.rollback();
        return res.status(200).json({
          status: 404,
          message: message.usermessage.notFoundMessage('Category'),
        });
      }

      // Check for both category name and categoryMasterID (stored as string)
      const coursesUsingCategory = await Course.count({
        where: {
          [Sequelize.Op.or]: [
            { category: category.categoryName },
            { category: String(categoryMasterID) },
          ],
          status: { [Sequelize.Op.in]: [0, 1] },
        },
        transaction,
      });

      if (coursesUsingCategory > 0) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Cannot deactivate category. It is currently assigned to one or more courses.',
        });
      }

    }

    await CategoryMaster.update(
      { status },
      {
        where: { categoryMasterID: categoryMasterID },
        user: {
          userMasterId: req.userDetails.userMasterId,
          userIpAddress: req.userDetails.userIpAddress,
        },
        transaction,
        dbOperation,
      },
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message:
        status == 1
          ? message.usermessage.activeMessage('Category')
          : message.usermessage.deactiveMessage('Category'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
