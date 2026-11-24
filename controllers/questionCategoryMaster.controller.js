const QuestionCategoryMaster = require('../models/questionCategoryMaster');
const Question = require('../models/question');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const { DatabaseOperationEnum } = require('../utils/dbUtils');

/**
 * Add new question category
 */
exports.postAddQuestionCategory = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      categoryName,
      description,
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

    // Check if category already exists for the company
    const findCategory = await QuestionCategoryMaster.findOne({
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
        message: message.usermessage.alreadyExists('Question Category With Same Name'),
      });
    }

    let categoryObject = {
      categoryName,
      description: description || null,
      icon: icon || null,
      displayOrder: displayOrder || 0,
      companyMasterID,
      status: status !== undefined ? status : 1,
    };

    await QuestionCategoryMaster.create(categoryObject, {
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
      message: message.usermessage.addMessage('Question Category'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * Get question category by ID
 */
exports.getQuestionCategoryById = async (req, res, next) => {
  try {
    const { questionCategoryMasterID } = req.body;

    const getCategory = await QuestionCategoryMaster.findOne({
      where: { questionCategoryMasterID: questionCategoryMasterID, status: ['0', '1'] },
      raw: true,
    });

    if (!getCategory) {
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Question Category'),
      });
    }

    return res.status(200).json({ status: 200, data: getCategory });
  } catch (err) {
    next(err);
  }
};

/**
 * Update question category
 */
exports.postUpdateQuestionCategory = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    let {
      questionCategoryMasterID,
      categoryName,
      description,
      icon,
      displayOrder,
      companyMasterID,
      status,
    } = req.body;

    // Validate required fields
    if (!questionCategoryMasterID || !categoryName || !String(categoryName).trim() || !companyMasterID) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'Missing required fields: questionCategoryMasterID, categoryName (cannot be blank), and companyMasterID are required',
      });
    }

    categoryName = categoryName.trim();
    const dbOperation = DatabaseOperationEnum.UPDATE;

    // Check if category name already exists (excluding current category)
    const findCategory = await QuestionCategoryMaster.findOne({
      where: {
        categoryName: {
          [Sequelize.Op.iLike]: categoryName,
        },
        companyMasterID: companyMasterID,
        questionCategoryMasterID: { [Sequelize.Op.notIn]: [questionCategoryMasterID] },
        status: 1,
      },
      transaction,
    });

    if (findCategory) {
      await transaction.rollback();
      return res.status(200).json({
        status: 401,
        message: message.usermessage.alreadyExists('Question Category'),
      });
    }

    // Block deactivation if question category is assigned to one or more questions
    if (status !== undefined && (status == 0 || status === '0')) {
      const assignedQuestionCount = await Question.count({
        where: {
          questionCategoryMasterID: questionCategoryMasterID,
          status: { [Sequelize.Op.notIn]: [0, '0'] },
        },
        transaction,
      });

      if (assignedQuestionCount > 0) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Cannot deactivate question category. It is currently assigned to one or more questions.',
        });
      }
    }

    await QuestionCategoryMaster.update(
      {
        categoryName,
        description: description || null,
        icon: icon || null,
        displayOrder: displayOrder || 0,
        status,
      },
      {
        where: { questionCategoryMasterID: questionCategoryMasterID },
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
      message: message.usermessage.updateMessage('Question Category'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * Delete question category
 */
exports.postDeleteQuestionCategory = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { questionCategoryMasterID } = req.body;
    const dbOperation = DatabaseOperationEnum.DELETE;

    const category = await QuestionCategoryMaster.findOne({
      where: { questionCategoryMasterID: questionCategoryMasterID },
      transaction,
    });

    if (!category) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Question Category'),
      });
    }

    // Check if any questions are assigned to this question category
    const assignedQuestionCount = await Question.count({
      where: {
        questionCategoryMasterID: questionCategoryMasterID,
        status: { [Sequelize.Op.notIn]: [0, '0'] },
      },
      transaction,
    });

    if (assignedQuestionCount > 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'Cannot delete question category. It is currently assigned to one or more questions.',
      });
    }

    await QuestionCategoryMaster.destroy({
      where: { questionCategoryMasterID: questionCategoryMasterID },
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
      message: message.usermessage.deleteMessage('Question Category'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * Get all question categories by company
 */
exports.getQuestionCategoryByCompanyId = async (req, res, next) => {
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

    const { count, rows } = await QuestionCategoryMaster.findAndCountAll({
      where: whereClause,
      order: [
        ['questionCategoryMasterID', 'DESC'],
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
 * Get active question categories by company
 */
exports.getActiveQuestionCategoryByCompanyId = async (req, res, next) => {
  try {
    const { companyMasterID } = req.body;

    const categories = await QuestionCategoryMaster.findAll({
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
 * Change question category status
 */
exports.postStatusChange = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { questionCategoryMasterID, status } = req.body;
    const dbOperation = DatabaseOperationEnum.UPDATE;

    const category = await QuestionCategoryMaster.findOne({
      where: { questionCategoryMasterID: questionCategoryMasterID },
      transaction,
    });

    if (!category) {
      await transaction.rollback();
      return res.status(200).json({
        status: 404,
        message: message.usermessage.notFoundMessage('Question Category'),
      });
    }

    // Block deactivation if question category is assigned to one or more questions
    if (status == 0 || status === '0') {
      const assignedQuestionCount = await Question.count({
        where: {
          questionCategoryMasterID: questionCategoryMasterID,
          status: { [Sequelize.Op.notIn]: [0, '0'] },
        },
        transaction,
      });

      if (assignedQuestionCount > 0) {
        await transaction.rollback();
        return res.status(200).json({
          status: 400,
          message: 'Cannot deactivate question category. It is currently assigned to one or more questions.',
        });
      }
    }

    await QuestionCategoryMaster.update(
      { status },
      {
        where: { questionCategoryMasterID: questionCategoryMasterID },
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
          ? message.usermessage.activeMessage('Question Category')
          : message.usermessage.deactiveMessage('Question Category'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};
