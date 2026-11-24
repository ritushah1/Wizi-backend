const Sequelize = require('sequelize');
const { Op } = Sequelize;
const sequelize = require('../config/database');
const AssessmentAttempt = require('../models/assessmentAttempt');
const AssessmentAttemptAnswer = require('../models/assessmentAttemptAnswer');
const Assessment = require('../models/assessment');
const AssessmentQuestion = require('../models/assessmentQuestion');
const Question = require('../models/question');
const QuestionOption = require('../models/questionOption');

/**
 * Start a new assessment attempt
 */
exports.startAttempt = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const assessmentID = req.body.assessmentID || req.body.assessmentId || req.body.id;
    const courseId = req.body.courseID || req.body.courseId || req.params.courseId;
    const userMasterID = req.userDetails?.userMasterId;

    if (!assessmentID) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Assessment ID is required',
      });
    }

    if (!userMasterID) {
      await transaction.rollback();
      return res.status(200).send({
        status: 401,
        message: 'User not authenticated',
      });
    }

    // Check if assessment exists
    const assessment = await Assessment.findOne({
      where: { assessmentID, status: 1 },
    });

    if (!assessment) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: 'Assessment not found',
      });
    }

    // Check if user has exceeded max attempts for this assessment (and course if provided)
    // Both started (status 2) and completed (status 1) attempts count as attempts
    const countWhere = {
      assessmentID: parseInt(assessmentID),
      userMasterID,
      status: { [Op.in]: [1, 2] },
    };

    if (courseId && courseId !== 'undefined' && courseId !== 'null' && !isNaN(parseInt(courseId))) {
      countWhere.courseID = parseInt(courseId);
    }

    const previousAttempts = await AssessmentAttempt.count({
      where: countWhere,
    });

    if (assessment.maxAttempts && previousAttempts >= assessment.maxAttempts) {
      await transaction.rollback();
      return res.status(200).send({
        status: 403,
        message: `Maximum attempts (${assessment.maxAttempts}) reached for this assessment`,
      });
    }

    // Finalize any previously unsubmitted in-progress attempts (abandoned) as completed/failed
    await AssessmentAttempt.update(
      {
        status: 1,
        submittedAt: new Date(),
        score: 0,
        isPassed: false,
        updatedBy: userMasterID,
        updatedByIp: req.ip,
      },
      {
        where: {
          assessmentID: parseInt(assessmentID),
          userMasterID,
          status: 2,
        },
        transaction,
      }
    );

    // Create attempt record
    const attempt = await AssessmentAttempt.create(
      {
        assessmentID: parseInt(assessmentID),
        courseID: courseId && !isNaN(parseInt(courseId)) ? parseInt(courseId) : null,
        userMasterID,
        startedAt: new Date(),
        status: 2, // in-progress
        createdBy: userMasterID,
        createdByIp: req.ip,
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      data: {
        attemptId: attempt.assessmentAttemptID,
        assessmentID: attempt.assessmentID,
        courseId: attempt.courseID,
        startedAt: attempt.startedAt,
        attemptNumber: previousAttempts + 1,
        totalAttemptsUsed: previousAttempts + 1,
      },
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

/**
 * Submit assessment attempt with answers
 */
exports.submitAttempt = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const attemptId = req.body.attemptId || req.body.assessmentAttemptID || req.body.id;
    const { answers } = req.body;
    const userMasterID = req.userDetails?.userMasterId;

    console.log('📝 Submit attempt request:', { attemptId, answersCount: answers?.length, userMasterID });

    if (!attemptId || !answers || !Array.isArray(answers)) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Attempt ID and answers array are required',
      });
    }

    // Get the attempt
    const attempt = await AssessmentAttempt.findOne({
      where: {
        assessmentAttemptID: attemptId,
        userMasterID,
        status: 2, // in-progress
      },
    });

    console.log('📋 Found attempt:', attempt ? attempt.assessmentAttemptID : 'NOT FOUND');

    if (!attempt) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: 'Assessment attempt not found or already submitted',
      });
    }

    // Get assessment with questions
    const assessment = await Assessment.findOne({
      where: { assessmentID: attempt.assessmentID, status: 1 },
      include: [
        {
          model: AssessmentQuestion,
          as: 'assessmentQuestions',
          include: [
            {
              model: Question,
              include: [
                {
                  model: QuestionOption,
                  as: 'questionOptions',
                },
              ],
            },
          ],
        },
      ],
    });

    console.log('📚 Assessment questions:', assessment?.assessmentQuestions?.length || 0);

    if (!assessment) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: 'Assessment not found',
      });
    }

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = assessment.assessmentQuestions.length;
    const attemptAnswers = [];

    for (const answer of answers) {
      const { questionId, selectedOptionId } = answer;

      // Find the question
      const assessmentQuestion = assessment.assessmentQuestions.find(
        (aq) => aq.question.questionID === parseInt(questionId)
      );

      if (assessmentQuestion) {
        // Find the selected option
        const selectedOption = assessmentQuestion.question.questionOptions.find(
          (opt) => opt.questionOptionID === parseInt(selectedOptionId)
        );

        const isCorrect = selectedOption ? selectedOption.isCorrect : false;

        if (isCorrect) {
          correctAnswers++;
        }

        // Save the answer
        attemptAnswers.push({
          assessmentAttemptID: attemptId,
          questionID: parseInt(questionId),
          selectedOptionID: parseInt(selectedOptionId),
          isCorrect,
          status: 1,
        });
      }
    }

    console.log('✅ Correct answers:', correctAnswers, '/', totalQuestions);

    // Calculate score percentage
    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
    const isPassed = score >= (assessment.passingPercentage || 0);

    // Bulk create attempt answers
    if (attemptAnswers.length > 0) {
      await AssessmentAttemptAnswer.bulkCreate(attemptAnswers, { transaction });
    }

    // Update attempt
    const timeSpent = Math.round((new Date() - new Date(attempt.startedAt)) / 1000); // in seconds
    await attempt.update(
      {
        score,
        correctAnswers,
        totalQuestions,
        isPassed,
        submittedAt: new Date(),
        timeSpent,
        status: 1, // completed
        updatedBy: userMasterID,
        updatedByIp: req.ip,
      },
      { transaction }
    );

    await transaction.commit();

    console.log('🎉 Assessment submitted successfully');

    return res.status(200).json({
      status: 200,
      data: {
        attemptId: attempt.assessmentAttemptID,
        score,
        percentage: score,
        correctAnswers,
        totalQuestions,
        isPassed,
        timeSpent,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (err) {
    console.error('❌ Error submitting assessment:', err);
    await transaction.rollback();
    next(err);
  }
};

/**
 * Get user's attempts for an assessment
 * Supports both:
 * - POST /assessment-attempts/assessments/:assessmentId/attempts (Angular - URL param)
 * - POST /assessment-attempts/myAttempts with { assessmentID } (React - body param)
 */
exports.getMyAttempts = async (req, res, next) => {
  try {
    // Support both URL param and body param
    let assessmentID = req.params.assessmentId || req.body.assessmentID || req.body.assessmentId || req.body.id;
    const courseId = req.query.courseId || req.query.courseID || req.body.courseId || req.body.courseID || req.params.courseId;
    const userMasterID = req.userDetails?.userMasterId;

    if (!assessmentID || assessmentID === 'undefined' || assessmentID === 'null') {
      return res.status(200).json({
        status: 200,
        data: [],
      });
    }

    assessmentID = parseInt(assessmentID);
    if (isNaN(assessmentID)) {
      return res.status(200).json({
        status: 200,
        data: [],
      });
    }

    const whereClause = {
      assessmentID,
      userMasterID,
    };

    if (courseId && courseId !== 'undefined' && courseId !== 'null' && !isNaN(parseInt(courseId))) {
      whereClause.courseID = parseInt(courseId);
    }

    const attempts = await AssessmentAttempt.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      status: 200,
      data: attempts,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get attempt details with answers
 */
exports.getAttemptDetails = async (req, res, next) => {
  try {
    const { attemptId } = req.body;
    const userMasterID = req.userDetails?.userMasterId;

    if (!attemptId) {
      return res.status(200).send({
        status: 400,
        message: 'Attempt ID is required',
      });
    }

    const attempt = await AssessmentAttempt.findOne({
      where: {
        assessmentAttemptID: attemptId,
        userMasterID,
      },
      include: [
        {
          model: Assessment,
          as: 'assessment',
        },
      ],
    });

    if (!attempt) {
      return res.status(200).send({
        status: 404,
        message: 'Attempt not found',
      });
    }

    // Get answers
    const answers = await AssessmentAttemptAnswer.findAll({
      where: { assessmentAttemptID: attemptId },
      include: [
        {
          model: Question,
          as: 'question',
        },
        {
          model: QuestionOption,
          as: 'selectedOption',
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: {
        attempt,
        answers,
      },
    });
  } catch (err) {
    next(err);
  }
};
