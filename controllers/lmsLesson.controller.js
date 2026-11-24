const LmsLesson = require('../models/lmsLesson');
const LmsModule = require('../models/lmsModule');
const LmsContent = require('../models/lmsContent');
const message = require('../response_message/message');
const Sequelize = require('sequelize');

/**
 * Add a new lesson to a module
 */
exports.addLesson = async (req, res, next) => {
  try {
    const {
      moduleId,
      title,
      description,
      orderIndex,
      estimatedDuration,
      isRequired,
    } = await req.body;

    // Verify module exists
    const module = await LmsModule.findOne({
      where: { moduleId, status: 1 },
    });

    if (!module) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Module'),
      });
    }

    const lesson = await LmsLesson.create(
      {
        moduleId,
        title,
        description,
        orderIndex: orderIndex || 0,
        estimatedDuration: estimatedDuration || 0,
        isRequired: isRequired || false,
      },
      { user: req.userDetails }
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Lesson'),
      data: lesson,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all lessons for a module
 */
exports.getLessonsByModuleId = async (req, res, next) => {
  try {
    const { moduleId } = await req.body;

    const lessons = await LmsLesson.findAll({
      where: {
        moduleId,
        status: 1,
      },
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
    });

    return res.status(200).json({
      status: 200,
      data: lessons,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get lesson by ID
 */
exports.getLessonById = async (req, res, next) => {
  try {
    const { lessonId } = await req.body;

    const lesson = await LmsLesson.findOne({
      where: { lessonId, status: 1 },
      include: [
        {
          model: LmsContent,
          as: 'contents',
          where: { status: 1 },
          required: false,
          order: [['orderIndex', 'ASC']],
        },
      ],
    });

    if (!lesson) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Lesson'),
      });
    }

    return res.status(200).json({
      status: 200,
      data: lesson,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update lesson
 */
exports.updateLesson = async (req, res, next) => {
  try {
    const {
      lessonId,
      title,
      description,
      orderIndex,
      estimatedDuration,
      isRequired,
    } = await req.body;

    const lesson = await LmsLesson.findOne({
      where: { lessonId, status: 1 },
    });

    if (!lesson) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Lesson'),
      });
    }

    await LmsLesson.update(
      {
        title,
        description,
        orderIndex,
        estimatedDuration,
        isRequired,
      },
      {
        where: { lessonId },
        user: req.userDetails,
      }
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Lesson'),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reorder lessons
 */
exports.reorderLessons = async (req, res, next) => {
  try {
    const { moduleId, lessons } = await req.body;

    // lessons should be an array of { lessonId, orderIndex }
    for (const lesson of lessons) {
      await LmsLesson.update(
        { orderIndex: lesson.orderIndex },
        {
          where: { lessonId: lesson.lessonId, moduleId },
          user: req.userDetails,
        }
      );
    }

    return res.status(200).json({
      status: 200,
      message: 'Lessons reordered successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete lesson (soft delete)
 */
exports.deleteLesson = async (req, res, next) => {
  try {
    const { lessonId } = await req.body;

    const lesson = await LmsLesson.findOne({
      where: { lessonId, status: 1 },
    });

    if (!lesson) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Lesson'),
      });
    }

    await LmsLesson.update(
      { status: 2 },
      {
        where: { lessonId },
        user: req.userDetails,
      }
    );

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Lesson'),
    });
  } catch (err) {
    next(err);
  }
};
