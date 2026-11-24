const Course = require('../models/course');
const CourseAssessment = require('../models/courseAssessment');
const Assessment = require('../models/assessment');
const AssessmentQuestion = require('../models/assessmentQuestion');
const Question = require('../models/question');
const QuestionOption = require('../models/questionOption');

/**
 * Snapshot all assessments for a published/approved course so that any future changes
 * to the original master assessments or questions in the question bank will NOT alter
 * this approved course's assessments.
 *
 * @param {number|string} courseId - ID of the course being approved/published
 * @param {object} options - { transaction, userDetails }
 */
async function snapshotCourseAssessments(courseId, options = {}) {
  const transaction = options.transaction || null;
  const userDetails = options.userDetails || null;

  try {
    if (!courseId) return;

    const course = await Course.findOne({
      where: { id: courseId },
      transaction,
    });

    if (!course) {
      console.warn(`[AssessmentSnapshot] Course ${courseId} not found, skipping snapshot.`);
      return;
    }

    // Find all active assessment bindings for this course
    const bindings = await CourseAssessment.findAll({
      where: {
        courseId,
        status: 1,
      },
      transaction,
    });

    if (!bindings || bindings.length === 0) {
      console.log(`[AssessmentSnapshot] No assessments bound to course ${courseId}`);
      return;
    }

    console.log(`📸 [AssessmentSnapshot] Snapshotting ${bindings.length} assessment(s) for course "${course.title}" (ID: ${courseId})`);

    for (const binding of bindings) {
      const currentAssessmentId = binding.assessmentId;
      if (!currentAssessmentId) continue;

      const masterAssessment = await Assessment.findOne({
        where: { assessmentID: currentAssessmentId, status: 1 },
        include: [
          {
            model: AssessmentQuestion,
            as: 'assessmentQuestions',
            where: { status: 1 },
            required: false,
            include: [
              {
                model: Question,
                where: { status: 1 },
                required: false,
                include: [
                  {
                    model: QuestionOption,
                    as: 'questionOptions',
                    where: { status: 1 },
                    required: false,
                  },
                ],
              },
            ],
          },
        ],
        order: [
          [{ model: AssessmentQuestion, as: 'assessmentQuestions' }, 'orderIndex', 'ASC'],
        ],
        transaction,
      });

      if (!masterAssessment) {
        console.warn(`[AssessmentSnapshot] Assessment ${currentAssessmentId} not found for course ${courseId}`);
        continue;
      }

      // If this assessment is already a snapshot for THIS course, skip to prevent duplicate nested snapshots
      if (masterAssessment.isSnapshot && masterAssessment.courseId === parseInt(courseId)) {
        console.log(`[AssessmentSnapshot] Assessment ${currentAssessmentId} is already a snapshot for course ${courseId}`);
        continue;
      }

      const activeQuestions = masterAssessment.assessmentQuestions || [];
      if (activeQuestions.length === 0) {
        console.warn(`[AssessmentSnapshot] Assessment ${currentAssessmentId} has no questions, skipping snapshot.`);
        continue;
      }

      const originalParentId = masterAssessment.isSnapshot
        ? (masterAssessment.originalAssessmentID || masterAssessment.assessmentID)
        : masterAssessment.assessmentID;

      // 1. Create a cloned Assessment record for this course
      const clonedAssessment = await Assessment.create(
        {
          title: masterAssessment.title,
          description: masterAssessment.description,
          type: masterAssessment.type,
          passingPercentage: masterAssessment.passingPercentage,
          totalMarks: masterAssessment.totalMarks || 100,
          timeLimit: masterAssessment.timeLimit,
          maxAttempts: masterAssessment.maxAttempts,
          instructions: masterAssessment.instructions,
          departmentID: masterAssessment.departmentID,
          isActive: true,
          status: 1,
          isSnapshot: true,
          originalAssessmentID: originalParentId,
          courseId: parseInt(courseId),
          createdBy: userDetails?.userMasterId || masterAssessment.createdBy,
          createdByIp: userDetails?.userIpAddress || null,
        },
        { transaction, user: userDetails }
      );

      // 2. Clone each Question and its QuestionOptions, then create new AssessmentQuestion
      for (const aq of activeQuestions) {
        const origQ = aq.question;
        if (!origQ) continue;

        const clonedQuestion = await Question.create(
          {
            questionText: origQ.questionText,
            questionType: origQ.questionType,
            points: origQ.points || 1,
            difficulty: origQ.difficulty || 'MEDIUM',
            explanation: origQ.explanation,
            departmentID: origQ.departmentID,
            questionCategoryMasterID: origQ.questionCategoryMasterID,
            isActive: true,
            status: 1,
            isSnapshot: true,
            originalQuestionID: origQ.isSnapshot
              ? (origQ.originalQuestionID || origQ.questionID)
              : origQ.questionID,
            createdBy: userDetails?.userMasterId || origQ.createdBy,
            createdByIp: userDetails?.userIpAddress || null,
          },
          { transaction, user: userDetails }
        );

        const origOptions = origQ.questionOptions || [];
        if (origOptions.length > 0) {
          const clonedOptionsData = origOptions.map((opt, idx) => ({
            questionID: clonedQuestion.questionID,
            optionText: opt.optionText,
            isCorrect: Boolean(opt.isCorrect),
            orderIndex: opt.orderIndex !== undefined ? opt.orderIndex : idx,
            status: 1,
          }));

          await QuestionOption.bulkCreate(clonedOptionsData, { transaction });
        }

        // Link cloned question to cloned assessment
        await AssessmentQuestion.create(
          {
            assessmentID: clonedAssessment.assessmentID,
            questionID: clonedQuestion.questionID,
            orderIndex: aq.orderIndex,
            points: aq.points,
            status: 1,
          },
          { transaction, user: userDetails }
        );
      }

      // 3. Update course_assessments binding to point to this new snapshot assessment
      await CourseAssessment.update(
        {
          assessmentId: clonedAssessment.assessmentID,
          originalAssessmentId: originalParentId,
        },
        {
          where: { id: binding.id },
          transaction,
        }
      );

      console.log(`✅ [AssessmentSnapshot] Successfully created snapshot Assessment #${clonedAssessment.assessmentID} (from master #${originalParentId}) with ${activeQuestions.length} questions for Course #${courseId}`);
    }
  } catch (err) {
    console.error(`❌ [AssessmentSnapshot] Error snapshotting assessments for course ${courseId}:`, err);
    throw err;
  }
}

module.exports = {
  snapshotCourseAssessments,
};
