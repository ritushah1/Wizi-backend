const LmsModule = require('../models/lmsModule');
const LmsLesson = require('../models/lmsLesson');
const LmsContent = require('../models/lmsContent');
const Course = require('../models/course');
const message = require('../response_message/message');
const Sequelize = require('sequelize');

/**
 * Add a new module to a course
 */
exports.addModule = async (req, res, next) => {
  try {
    const {
      courseId,
      title,
      description,
      orderIndex,
      estimatedDuration,
    } = await req.body;

    // Verify course exists
    const course = await Course.findOne({
      where: { courseID: courseId, status: 1 },
    });

    if (!course) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Course'),
      });
    }

    const module = await LmsModule.create(
      {
        courseId,
        title,
        description,
        orderIndex: orderIndex || 0,
        estimatedDuration: estimatedDuration || 0,
      },
      { user: req.userDetails }
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Module'),
      data: module,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all modules for a course
 */
exports.getModulesByCourseId = async (req, res, next) => {
  try {
    const { courseId } = await req.body;

    const modules = await LmsModule.findAll({
      where: {
        courseId,
        status: 1,
      },
      order: [['orderIndex', 'ASC']],
      include: [
        {
          model: LmsLesson,
          as: 'lessons',
          where: { status: 1 },
          required: false,
          order: [['orderIndex', 'ASC']],
          include: [
            {
              model: LmsContent,
              as: 'contents',
              where: { status: 1 },
              required: false,
              order: [['orderIndex', 'ASC']],
            },
          ],
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: modules,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get module by ID
 */
exports.getModuleById = async (req, res, next) => {
  try {
    const { moduleId } = await req.body;

    const module = await LmsModule.findOne({
      where: { moduleId, status: 1 },
      include: [
        {
          model: LmsLesson,
          as: 'lessons',
          where: { status: 1 },
          required: false,
          order: [['orderIndex', 'ASC']],
        },
      ],
    });

    if (!module) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Module'),
      });
    }

    return res.status(200).json({
      status: 200,
      data: module,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update module
 */
exports.updateModule = async (req, res, next) => {
  try {
    const {
      moduleId,
      title,
      description,
      orderIndex,
      estimatedDuration,
    } = await req.body;

    const module = await LmsModule.findOne({
      where: { moduleId, status: 1 },
    });

    if (!module) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Module'),
      });
    }

    await LmsModule.update(
      {
        title,
        description,
        orderIndex,
        estimatedDuration,
      },
      {
        where: { moduleId },
        user: req.userDetails,
      }
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Module'),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reorder modules
 */
exports.reorderModules = async (req, res, next) => {
  try {
    const { courseId, modules } = await req.body;

    // modules should be an array of { moduleId, orderIndex }
    for (const mod of modules) {
      await LmsModule.update(
        { orderIndex: mod.orderIndex },
        {
          where: { moduleId: mod.moduleId, courseId },
          user: req.userDetails,
        }
      );
    }

    return res.status(200).json({
      status: 200,
      message: 'Modules reordered successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete module (soft delete)
 */
exports.deleteModule = async (req, res, next) => {
  try {
    const { moduleId } = await req.body;

    const module = await LmsModule.findOne({
      where: { moduleId, status: 1 },
    });

    if (!module) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Module'),
      });
    }

    await LmsModule.update(
      { status: 2 },
      {
        where: { moduleId },
        user: req.userDetails,
      }
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Module'),
    });
  } catch (err) {
    next(err);
  }
};
