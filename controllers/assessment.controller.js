const Assessment = require('../models/assessment');
const AssessmentQuestion = require('../models/assessmentQuestion');
const Question = require('../models/question');
const QuestionOption = require('../models/questionOption');
const QuestionCategoryMaster = require('../models/questionCategoryMaster');
const Department = require('../models/department');
const CompanyMaster = require('../models/companyMaster');
const UserMaster = require('../models/userMaster');
const message = require('../response_message/message');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');

// =====================================================
// ASSESSMENT OPERATIONS
// =====================================================

exports.getMyAssessments = async (req, res, next) => {
  try {
    // Note: userDetails uses 'companyMasterId' (lowercase 'd'), not 'companyMasterID'
    const companyMasterID = req.userDetails?.companyMasterId;
    const createdBy = req.userDetails?.userMasterId;

    if (!createdBy) {
      return res.status(200).json({
        status: 401,
        message: 'User not authenticated',
        data: [],
      });
    }

    if (!companyMasterID) {
      return res.status(200).json({
        status: 400,
        message: 'Company ID not found in user details',
        data: [],
      });
    }

    const assessments = await Assessment.findAll({
      where: {
        createdBy,
        status: 1,
      },
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM "assessmentQuestions" AS aq
              WHERE aq."assessmentID" = "assessment"."assessmentID"
              AND aq.status = 1
              AND aq."deletedAt" IS NULL
            )`),
            'questionCount'
          ]
        ]
      },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['departmentId', 'departmentName', 'companyMasterID'],
          where: {
            companyMasterID: companyMasterID,
          },
          required: true,
          include: [
            {
              model: CompanyMaster,
              attributes: ['companyMasterID', 'companyName'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Transform assessments to include 'id' field for frontend compatibility
    const transformedAssessments = assessments.map(assessment => {
      const data = assessment.toJSON ? assessment.toJSON() : assessment;
      // Add 'id' field as alias for 'assessmentID'
      return {
        ...data,
        id: data.assessmentID,
        questionCount: parseInt(data.questionCount) || 0,
      };
    });

    return res.status(200).json({
      status: 200,
      data: transformedAssessments,
    });
  } catch (err) {
    console.error('❌ Error in getMyAssessments:', err);
    next(err);
  }
};

exports.listAssessments = async (req, res, next) => {
  try {
    const { limit, page, searchQuery, type, companyMasterID, departmentID } = req.body;

    // Require either companyMasterID or departmentID
    if (!companyMasterID && !departmentID) {
      return res.status(400).json({
        status: 400,
        message: 'Company ID or Department ID is required',
      });
    }

    const condition = {};
    condition.status = 1;
    condition.isSnapshot = { [Sequelize.Op.ne]: true };

    if (type) condition.type = type;

    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          title: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          description: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    }

    // Build department filter
    let departmentFilter = {};
    if (departmentID && (Array.isArray(departmentID) ? departmentID.length > 0 : true)) {
      // Filter by specific department(s)
      condition.departmentID = departmentID;
    } else if (companyMasterID) {
      // Filter by company - need to join with departments
      departmentFilter = {
        companyMasterID: companyMasterID,
      };
    }

    const paginationQuery = {};
    if (page && limit) {
      paginationQuery.offset = (page - 1) * limit;
      paginationQuery.limit = limit;
    }

    const order = [['createdAt', 'DESC']];

    const { rows, count } = await Assessment.findAndCountAll({
      where: condition,
      distinct: true,
      col: 'assessmentID',
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['departmentId', 'departmentName', 'companyMasterID'],
          where: Object.keys(departmentFilter).length > 0 ? departmentFilter : undefined,
          required: true,
          include: [
            {
              model: CompanyMaster,
              attributes: ['companyMasterID', 'companyName'],
            },
          ],
        },
        {
          model: UserMaster,
          as: 'createBy',
          attributes: ['userMasterID', 'displayName'],
          required: false,
        },
        {
          model: AssessmentQuestion,
          as: 'assessmentQuestions',
          attributes: ['assessmentQuestionID', 'questionID', 'orderIndex', 'points'],
          required: false,
          where: { status: 1 },
          include: [
            {
              model: Question,
              attributes: ['questionID', 'questionText', 'questionType', 'difficulty', 'points'],
              required: false,
            },
          ],
        },
      ],
      ...paginationQuery,
      order,
    });

    return res.status(200).json({
      status: 200,
      data: rows,
      totalcount: count,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAssessmentByID = async (req, res, next) => {
  try {
    const assessmentID = req.body.assessmentID || req.body.id || req.params.id || req.params.assessmentId;

    if (!assessmentID) {
      return res.status(200).send({
        status: 400,
        message: 'Assessment ID is required',
      });
    }

    const assessment = await Assessment.findOne({
      where: {
        assessmentID,
        status: 1,
      },
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
                {
                  model: QuestionCategoryMaster,
                  as: 'questionCategory',
                  attributes: ['questionCategoryMasterID', 'categoryName', 'color', 'icon'],
                  required: false,
                },
              ],
            },
          ],
        },
        {
          model: Department,
          as: 'department',
          attributes: ['departmentId', 'departmentName', 'companyMasterID'],
          include: [
            {
              model: CompanyMaster,
              attributes: ['companyMasterID', 'companyName'],
            },
          ],
        },
      ],
    });

    if (!assessment) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Assessment'),
      });
    }

    let assessmentData = assessment.toJSON ? assessment.toJSON() : JSON.parse(JSON.stringify(assessment));

    // Shuffle questions and options if requested
    const shouldShuffle = req.body.shuffle || req.query.shuffle || req.body.shuffleQuestions;
    if (shouldShuffle && assessmentData.assessmentQuestions && assessmentData.assessmentQuestions.length > 1) {
      // Fisher-Yates shuffle for questions
      for (let i = assessmentData.assessmentQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [assessmentData.assessmentQuestions[i], assessmentData.assessmentQuestions[j]] = [
          assessmentData.assessmentQuestions[j],
          assessmentData.assessmentQuestions[i],
        ];
      }

      // Fisher-Yates shuffle for options within each question
      assessmentData.assessmentQuestions.forEach((aq) => {
        const questionObj = aq.question;
        if (questionObj && questionObj.questionOptions && questionObj.questionOptions.length > 1) {
          for (let i = questionObj.questionOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questionObj.questionOptions[i], questionObj.questionOptions[j]] = [
              questionObj.questionOptions[j],
              questionObj.questionOptions[i],
            ];
          }
        }
      });
    }

    return res.status(200).json({
      status: 200,
      data: assessmentData,
    });
  } catch (error) {
    next(error);
  }
};

exports.addAssessment = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      title,
      description,
      type,
      passingPercentage,
      timeLimit,
      maxAttempts,
      instructions,
      departmentID,
      totalMarks,
    } = req.body;

    const trimmedTitle = title ? String(title).trim() : '';

    if (!trimmedTitle || !type || !passingPercentage || !departmentID) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Title (cannot be blank), type, passing percentage, and department ID are required',
      });
    }

    // Check if an assessment with same title, department, and type already exists
    const existingAssessment = await Assessment.findOne({
      where: {
        title: {
          [Sequelize.Op.iLike]: trimmedTitle,
        },
        departmentID,
        type,
        status: { [Sequelize.Op.notIn]: [0, '0'] },
      },
      transaction,
    });

    if (existingAssessment) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'An assessment with the same name, department, and type already exists.',
      });
    }

    const assessment = await Assessment.create(
      {
        title: trimmedTitle,
        description: description && description !== title ? description : '',
        type,
        passingPercentage,
        timeLimit: timeLimit || 60,
        maxAttempts: maxAttempts || 3,
        instructions,
        departmentID,
        totalMarks: totalMarks || 100,
      },
      { transaction, user: req.userDetails }
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.addMessage('Assessment'),
      data: assessment,
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.updateAssessment = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      assessmentID,
      title = req.body.offerLetterName,
      description = req.body.letterTemplate,
      type,
      passingPercentage,
      timeLimit,
      maxAttempts,
      instructions,
      departmentID,
      totalMarks,
    } = req.body;

    if (!assessmentID) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Assessment'),
      });
    }

    const currentAssessment = await Assessment.findByPk(assessmentID, { transaction });
    if (!currentAssessment) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Assessment'),
      });
    }

    if (title !== undefined) {
      if (!title || !String(title).trim()) {
        await transaction.rollback();
        return res.status(200).send({
          status: 400,
          message: 'Title cannot be blank',
        });
      }
    }

    const targetTitle = (title !== undefined && title !== null ? String(title).trim() : currentAssessment.title);
    const targetDeptID = departmentID !== undefined && departmentID !== null ? departmentID : currentAssessment.departmentID;
    const targetType = type !== undefined && type !== null ? type : currentAssessment.type;

    // Check if another assessment with the same title, department, and type already exists
    const existingAssessment = await Assessment.findOne({
      where: {
        assessmentID: { [Sequelize.Op.ne]: assessmentID },
        title: {
          [Sequelize.Op.iLike]: targetTitle,
        },
        departmentID: targetDeptID,
        type: targetType,
        status: { [Sequelize.Op.notIn]: [0, '0'] },
      },
      transaction,
    });

    if (existingAssessment) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'An assessment with the same name, department, and type already exists.',
      });
    }

    const updateData = {};
    if (title) updateData.title = targetTitle;
    if (description !== undefined) {
      updateData.description = description === title ? '' : description;
    }
    if (type) updateData.type = type;
    if (passingPercentage !== undefined) updateData.passingPercentage = passingPercentage;
    if (timeLimit !== undefined) updateData.timeLimit = timeLimit;
    if (maxAttempts !== undefined) updateData.maxAttempts = maxAttempts;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (departmentID !== undefined) updateData.departmentID = departmentID;
    if (totalMarks !== undefined) updateData.totalMarks = totalMarks;

    await Assessment.update(updateData, {
      where: { assessmentID },
      transaction,
      user: req.userDetails,
    });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.updateMessage('Assessment'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.deleteAssessment = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { assessmentID } = req.body;

    if (!assessmentID) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Assessment'),
      });
    }

    // Check if assessment is assigned to any course
    const CourseAssessment = require('../models/courseAssessment');
    const courseAssignmentCount = await CourseAssessment.count({
      where: { assessmentId: assessmentID, status: 1 },
    });

    if (courseAssignmentCount > 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'Cannot delete this assessment as it is already assigned to one or more courses.',
      });
    }

    // Check if any employee has attempted this assessment
    const AssessmentAttempt = require('../models/assessmentAttempt');
    const attemptCount = await AssessmentAttempt.count({
      where: { assessmentID },
    });

    if (attemptCount > 0) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: 'Cannot delete this assessment as it has already been attempted by employees.',
      });
    }

    // Delete linked assignments (created from this assessment)
    const Assignment = require('../models/assignment');
    const linkedAssignments = await Assignment.findAll({
      where: { assessmentID, deletedAt: null },
    });

    // Block deletion if any linked assignment is published (ACTIVE)
    const publishedAssignment = linkedAssignments.find(a => a.status === 'ACTIVE');
    if (publishedAssignment) {
      await transaction.rollback();
      return res.status(200).json({
        status: 400,
        message: `Cannot delete this assessment. A published assignment "${publishedAssignment.title}" was created from it. Please delete the assignment first.`,
      });
    }

    for (const assignment of linkedAssignments) {
      await assignment.update(
        { deletedBy: req.userDetails?.userMasterId || null },
        { transaction, user: req.userDetails }
      );
      await assignment.destroy({ transaction, user: req.userDetails });
    }

    await Assessment.destroy({
      where: { assessmentID },
      transaction,
      user: req.userDetails,
    });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: message.usermessage.deleteMessage('Assessment'),
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};


exports.listAssessment = async (req, res, next) => {
  // Alias for listAssessments
  return exports.listAssessments(req, res, next);
};

exports.updateAssessmentStatus = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { assessmentID, isActive } = req.body;

    if (!assessmentID) {
      await transaction.rollback();
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Assessment'),
      });
    }

    await Assessment.update(
      { isActive: isActive !== undefined ? isActive : true },
      {
        where: { assessmentID },
        transaction,
        user: req.userDetails,
      }
    );

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: 'Assessment status updated successfully',
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.assignQuestions = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { assessmentID, questionIds } = req.body;

    if (!assessmentID || !questionIds || !Array.isArray(questionIds)) {
      await transaction.rollback();
      return res.status(200).send({
        status: 400,
        message: 'Assessment ID and question IDs array are required',
      });
    }

    // Remove existing questions
    await AssessmentQuestion.destroy({
      where: { assessmentID },
      transaction,
    });

    // Add new questions
    const assessmentQuestions = questionIds.map((questionId, index) => ({
      assessmentID,
      questionID: questionId, // Changed from questionId to questionID (capital ID)
      orderIndex: index + 1,
    }));

    await AssessmentQuestion.bulkCreate(assessmentQuestions, { transaction });

    await transaction.commit();

    return res.status(200).json({
      status: 200,
      message: 'Questions assigned successfully',
    });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.validateAssessment = async (req, res, next) => {
  try {
    const { assessmentID } = req.body;

    if (!assessmentID) {
      return res.status(200).send({
        status: 400,
        message: 'Assessment ID is required',
      });
    }

    const assessment = await Assessment.findOne({
      where: { assessmentID, status: 1 },
      include: [
        {
          model: AssessmentQuestion,
          as: 'assessmentQuestions',
        },
      ],
    });

    if (!assessment) {
      return res.status(200).send({
        status: 404,
        message: message.usermessage.notFoundMessage('Assessment'),
      });
    }

    const errors = [];

    if (!assessment.title) errors.push('Title is required');
    if (!assessment.type) errors.push('Type is required');
    if (!assessment.passingPercentage) errors.push('Passing percentage is required');
    if (!assessment.questions || assessment.questions.length === 0) {
      errors.push('At least one question is required');
    }

    if (errors.length > 0) {
      return res.status(200).json({
        status: 400,
        message: 'Validation failed',
        errors,
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'Assessment is valid',
      data: assessment,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAssessmentCounts = async (req, res, next) => {
  try {
    const { companyMasterID, departmentID, searchQuery } = req.body;

    // Require either companyMasterID or departmentID
    if (!companyMasterID && !departmentID) {
      return res.status(400).json({
        status: 400,
        message: 'Company ID or Department ID is required',
      });
    }

    const condition = {};
    condition.status = 1;

    if (searchQuery) {
      condition[Sequelize.Op.or] = [
        {
          title: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
        {
          description: {
            [Sequelize.Op.iLike]: '%' + searchQuery + '%',
          },
        },
      ];
    }

    // Build department filter
    let departmentFilter = {};
    if (departmentID) {
      condition.departmentID = departmentID;
    } else if (companyMasterID) {
      departmentFilter = {
        companyMasterID: companyMasterID,
      };
    }

    // Get total count
    const totalCount = await Assessment.count({
      where: condition,
      include: [
        {
          model: Department,
          as: 'department',
          attributes: [],
          where: Object.keys(departmentFilter).length > 0 ? departmentFilter : undefined,
          required: true,
        },
      ],
    });

    // Get pre-assessment count
    const preAssessmentCount = await Assessment.count({
      where: {
        ...condition,
        type: 'PRE_ASSESSMENT',
      },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: [],
          where: Object.keys(departmentFilter).length > 0 ? departmentFilter : undefined,
          required: true,
        },
      ],
    });

    // Get post-assessment count
    const postAssessmentCount = await Assessment.count({
      where: {
        ...condition,
        type: 'POST_ASSESSMENT',
      },
      include: [
        {
          model: Department,
          as: 'department',
          attributes: [],
          where: Object.keys(departmentFilter).length > 0 ? departmentFilter : undefined,
          required: true,
        },
      ],
    });

    return res.status(200).json({
      status: 200,
      data: {
        total: totalCount,
        preAssessment: preAssessmentCount,
        postAssessment: postAssessmentCount,
      },
    });
  } catch (err) {
    console.error('❌ Error in getAssessmentCounts:', err);
    next(err);
  }
};
