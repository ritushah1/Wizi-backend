const Question = require('../models/question');
const QuestionOption = require('../models/questionOption');
const QuestionCategoryMaster = require('../models/questionCategoryMaster');
const AssessmentQuestion = require('../models/assessmentQuestion');
const UserMaster = require('../models/userMaster');
const Department = require('../models/department');
const CompanyMaster = require('../models/companyMaster');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Set up associations
if (!Question.associations || !Question.associations.questionOptions) {
  Question.hasMany(QuestionOption, {
    as: 'questionOptions',
    foreignKey: 'questionID',
  });
}

if (!QuestionOption.associations || !QuestionOption.associations.question) {
  QuestionOption.belongsTo(Question, {
    foreignKey: 'questionID',
  });
}

/**
 * Add new question(s) (supports single or multiple departments)
 */
exports.add = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      questionText,
      questionType,
      points,
      difficulty,
      explanation,
      options,
      departmentID,
      departmentIDs,
      questionCategoryMasterID,
      categoryID,
    } = req.body;

    const catId = questionCategoryMasterID || categoryID || null;

    // Normalize department IDs to an array
    const targetDeptIds = departmentIDs && Array.isArray(departmentIDs) && departmentIDs.length > 0
      ? departmentIDs
      : (departmentID ? (Array.isArray(departmentID) ? departmentID : [departmentID]) : []);

    // Validation
    const trimmedQuestionText = questionText ? String(questionText).trim() : '';
    if (!trimmedQuestionText || !questionType || targetDeptIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: 400,
        message: 'Question text (cannot be blank), type, and at least one department ID are required',
      });
    }

    if (options && Array.isArray(options) && options.length > 0) {
      for (const opt of options) {
        const optText = (opt.text || opt.optionText || '').trim();
        if (!optText) {
          await transaction.rollback();
          return res.status(400).json({
            status: 400,
            message: 'Question options cannot be blank',
          });
        }
      }
    }

    const createdQuestions = [];

    // Create a question and its options for each selected department
    for (const deptId of targetDeptIds) {
      const question = await Question.create(
        {
          questionText: trimmedQuestionText,
          questionType: questionType.toUpperCase(),
          points: points || 1,
          difficulty: difficulty ? difficulty.toUpperCase() : 'MEDIUM',
          explanation,
          departmentID: parseInt(deptId),
          questionCategoryMasterID: catId ? parseInt(catId) : null,
          isActive: true,
          status: 1,
          createdBy: req.userDetails?.userMasterId || null,
          createdByIp: req.ip || null,
        },
        {
          transaction,
        },
      );

      // Create options if provided
      if (options && Array.isArray(options) && options.length > 0) {
        const optionsData = options.map((option, index) => ({
          questionID: question.questionID,
          optionText: (option.text || option.optionText || '').trim(),
          isCorrect: option.isCorrect || false,
          orderIndex: index,
          status: 1,
        }));

        await QuestionOption.bulkCreate(optionsData, { transaction });
      }

      createdQuestions.push(question);
    }

    await transaction.commit();

    // Fetch complete question with options for response
    const firstQuestionId = createdQuestions[0]?.questionID;
    const completeQuestion = firstQuestionId
      ? await Question.findByPk(firstQuestionId, {
          include: [
            {
              model: QuestionOption,
              as: 'questionOptions',
              where: { status: { [Op.ne]: 0 } },
              required: false,
            },
            {
              model: UserMaster,
              as: 'createBy',
              attributes: ['userMasterID', 'displayName'],
            },
            {
              model: QuestionCategoryMaster,
              as: 'questionCategory',
              attributes: ['questionCategoryMasterID', 'categoryName', 'icon'],
              required: false,
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
        })
      : null;

    res.status(200).json({
      status: 200,
      message: `Question successfully created for ${createdQuestions.length} department(s)`,
      data: completeQuestion,
      count: createdQuestions.length,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating question:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error creating question',
    });
  }
};

exports.list = async (req, res) => {
  try {
    const {
      limit = 10,
      page = 1,
      searchQuery,
      questionType,
      type,
      difficulty,
      isActive,
      companyMasterID,
      departmentID,
      excludeQuestionIDs,
      questionCategoryMasterID,
      categoryID,
    } = req.body;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    console.log('📋 List Questions Request:', { companyMasterID, departmentID, page: pageNum, limit: limitNum, excludeQuestionIDs, questionCategoryMasterID, categoryID });

    // Require either companyMasterID or departmentID
    if (!companyMasterID && !departmentID) {
      console.log('❌ Missing companyMasterID and departmentID');
      return res.status(400).json({
        status: 400,
        message: 'Company ID or Department ID is required',
      });
    }

    const whereClause = {
      status: { [Op.ne]: 0 },
      isSnapshot: { [Op.ne]: true },
    };

    // Exclude specified question IDs if provided
    if (excludeQuestionIDs && Array.isArray(excludeQuestionIDs) && excludeQuestionIDs.length > 0) {
      whereClause.questionID = { [Op.notIn]: excludeQuestionIDs };
    }

    // Build department filter
    let departmentFilter = {};
    if (departmentID) {
      // Filter by specific department
      if (Array.isArray(departmentID) && departmentID.length > 0) {
        whereClause.departmentID = { [Op.in]: departmentID };
      } else {
        whereClause.departmentID = departmentID;
      }
      console.log('🔍 Filtering by departmentID:', departmentID);
    } else if (companyMasterID) {
      // Filter by company - need to join with departments
      departmentFilter = {
        companyMasterID: companyMasterID,
      };
      console.log('🔍 Filtering by companyMasterID:', companyMasterID);
    }

    // Category filter
    let rawCatId = questionCategoryMasterID !== undefined ? questionCategoryMasterID : categoryID;
    if (rawCatId && typeof rawCatId === 'object' && !Array.isArray(rawCatId)) {
      rawCatId = rawCatId.$ngOptionValue !== undefined ? rawCatId.$ngOptionValue : (rawCatId.questionCategoryMasterID || rawCatId.id);
    }
    if (rawCatId && rawCatId !== 'null' && rawCatId !== 'undefined' && rawCatId !== 'all') {
      if (Array.isArray(rawCatId)) {
        const validIds = rawCatId.map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0);
        if (validIds.length > 0) {
          whereClause.questionCategoryMasterID = { [Op.in]: validIds };
        }
      } else {
        const parsedId = parseInt(rawCatId);
        if (!isNaN(parsedId) && parsedId > 0) {
          whereClause.questionCategoryMasterID = parsedId;
        }
      }
    }

    // Apply additional filters
    if (searchQuery) {
      whereClause.questionText = { [Op.iLike]: `%${searchQuery}%` };
    }

    const effectiveQuestionType = questionType || type;
    if (effectiveQuestionType && effectiveQuestionType.toUpperCase() !== 'ALL') {
      whereClause.questionType = effectiveQuestionType.toUpperCase();
    }

    if (difficulty && difficulty.toUpperCase() !== 'ALL') {
      whereClause.difficulty = difficulty.toUpperCase();
    }

    if (isActive !== undefined) {
      whereClause.isActive = isActive;
    }

    console.log('🔍 Where clause:', JSON.stringify(whereClause));
    console.log('🔍 Department filter:', JSON.stringify(departmentFilter));

    const { count, rows } = await Question.findAndCountAll({
      distinct: true,
      where: whereClause,
      include: [
        {
          model: QuestionOption,
          as: 'questionOptions',
          where: { status: { [Op.ne]: 0 } },
          required: false,
        },
        {
          model: UserMaster,
          as: 'createBy',
          attributes: ['userMasterID', 'displayName'],
        },
        {
          model: QuestionCategoryMaster,
          as: 'questionCategory',
          attributes: ['questionCategoryMasterID', 'categoryName', 'icon'],
          required: false,
        },
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
      ],
      limit: limitNum,
      offset: offset,
      order: [['createdAt', 'DESC']],
    });

    console.log('✅ Found questions:', count);

    res.status(200).json({
      status: 200,
      message: 'Questions retrieved successfully',
      data: rows,
      totalcount: count,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('❌ Error fetching questions:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error fetching questions',
      error: error.toString(),
    });
  }
};

/**
 * Get question by ID
 */
exports.getByID = async (req, res) => {
  try {
    const { questionID } = req.body;

    if (!questionID) {
      return res.status(400).json({
        status: 400,
        message: 'Question ID is required',
      });
    }

    const question = await Question.findOne({
      where: {
        questionID,
        status: { [Op.ne]: 0 },
      },
      include: [
        {
          model: QuestionOption,
          as: 'questionOptions',
          where: { status: { [Op.ne]: 0 } },
          required: false,
        },
        {
          model: UserMaster,
          as: 'createBy',
          attributes: ['userMasterID', 'displayName'],
        },
        {
          model: QuestionCategoryMaster,
          as: 'questionCategory',
          attributes: ['questionCategoryMasterID', 'categoryName', 'icon'],
          required: false,
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

    if (!question) {
      return res.status(404).json({
        status: 404,
        message: 'Question not found',
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Question retrieved successfully',
      data: question,
    });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error fetching question',
    });
  }
};

/**
 * Update question
 */
exports.update = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      questionID,
      questionText,
      questionType,
      points,
      difficulty,
      explanation,
      options,
      isActive,
      departmentID,
      questionCategoryMasterID,
      categoryID,
    } = req.body;

    if (!questionID) {
      await transaction.rollback();
      return res.status(400).json({
        status: 400,
        message: 'Question ID is required',
      });
    }

    const question = await Question.findOne({
      where: {
        questionID,
        status: { [Op.ne]: 0 },
      },
    });

    if (!question) {
      await transaction.rollback();
      return res.status(404).json({
        status: 404,
        message: 'Question not found',
      });
    }

    if (questionText !== undefined) {
      if (!questionText || !String(questionText).trim()) {
        await transaction.rollback();
        return res.status(400).json({
          status: 400,
          message: 'Question text cannot be blank',
        });
      }
    }

    if (options && Array.isArray(options) && options.length > 0) {
      for (const opt of options) {
        const optText = (opt.text || opt.optionText || '').trim();
        if (!optText) {
          await transaction.rollback();
          return res.status(400).json({
            status: 400,
            message: 'Question options cannot be blank',
          });
        }
      }
    }

    const catId = questionCategoryMasterID !== undefined ? questionCategoryMasterID : categoryID;

    // Update question
    await question.update(
      {
        questionText: questionText !== undefined ? String(questionText).trim() : question.questionText,
        questionType: questionType ? questionType.toUpperCase() : question.questionType,
        points: points !== undefined ? points : question.points,
        difficulty: difficulty ? difficulty.toUpperCase() : question.difficulty,
        explanation: explanation !== undefined ? explanation : question.explanation,
        isActive: isActive !== undefined ? isActive : question.isActive,
        departmentID: departmentID !== undefined ? departmentID : question.departmentID,
        questionCategoryMasterID: catId !== undefined ? (catId ? parseInt(catId) : null) : question.questionCategoryMasterID,
        updatedBy: req.userDetails?.userMasterId || null,
        updatedByIp: req.ip || null,
      },
      {
        transaction,
      },
    );

    // Update options if provided
    if (options && Array.isArray(options)) {
      // Delete existing options
      await QuestionOption.destroy({
        where: { questionID },
        transaction,
      });

      // Create new options
      if (options.length > 0) {
        const optionsData = options.map((option, index) => ({
          questionID,
          optionText: (option.text || option.optionText || '').trim(),
          isCorrect: option.isCorrect || false,
          orderIndex: index,
          status: 1,
        }));

        await QuestionOption.bulkCreate(optionsData, { transaction });
      }
    }

    await transaction.commit();

    res.status(200).json({
      status: 200,
      message: 'Question updated successfully',
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating question:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error updating question',
    });
  }
};

/**
 * Update question status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { questionID, status } = req.body;

    if (!questionID || status === undefined) {
      return res.status(400).json({
        status: 400,
        message: 'Question ID and status are required',
      });
    }

    const question = await Question.findByPk(questionID);

    if (!question) {
      return res.status(404).json({
        status: 404,
        message: 'Question not found',
      });
    }

    await question.update(
      { 
        status,
        updatedBy: req.userDetails?.userMasterId || null,
        updatedByIp: req.ip || null,
      },
    );

    res.status(200).json({
      status: 200,
      message: 'Question status updated successfully',
    });
  } catch (error) {
    console.error('Error updating question status:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error updating question status',
    });
  }
};

/**
 * Delete question (soft delete)
 */
exports.delete = async (req, res) => {
  try {
    const { questionID } = req.body;

    if (!questionID) {
      return res.status(400).json({
        status: 400,
        message: 'Question ID is required',
      });
    }

    const question = await Question.findByPk(questionID);

    if (!question) {
      return res.status(404).json({
        status: 404,
        message: 'Question not found',
      });
    }

    // Block deletion if question is assigned to any assessment
    const assignedCount = await AssessmentQuestion.count({
      where: { questionID, status: 1 },
    });

    if (assignedCount > 0) {
      return res.status(200).json({
        status: 400,
        message: 'Cannot delete this question as it is already assigned to an assessment.',
      });
    }

    await question.update(
      { 
        status: 0,
        deletedBy: req.userDetails?.userMasterId || null,
        deletedByIp: req.ip || null,
      },
    );

    res.status(200).json({
      status: 200,
      message: 'Question deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error deleting question',
    });
  }
};

/**
 * Get question counts by type and difficulty
 */
exports.getCounts = async (req, res) => {
  try {
    const { companyMasterID, departmentID, searchQuery } = req.body;

    console.log('📊 Get Question Counts Request:', { companyMasterID, departmentID });

    // Require either companyMasterID or departmentID
    if (!companyMasterID && !departmentID) {
      console.log('❌ Missing companyMasterID and departmentID');
      return res.status(400).json({
        status: 400,
        message: 'Company ID or Department ID is required',
      });
    }

    const whereClause = {
      status: { [Op.ne]: 0 },
    };

    // Build department filter
    let departmentFilter = {};
    if (departmentID) {
      whereClause.departmentID = departmentID;
      console.log('🔍 Filtering by departmentID:', departmentID);
    } else if (companyMasterID) {
      departmentFilter = {
        companyMasterID: companyMasterID,
      };
      console.log('🔍 Filtering by companyMasterID:', companyMasterID);
    }

    // Apply search filter if provided
    if (searchQuery) {
      whereClause.questionText = { [Op.iLike]: `%${searchQuery}%` };
    }

    // Get total count
    const totalCount = await Question.count({
      distinct: true,
      where: whereClause,
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

    // Get MCQ count
    const mcqCount = await Question.count({
      distinct: true,
      where: {
        ...whereClause,
        questionType: 'MULTIPLE_CHOICE',
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

    // Get True/False count
    const trueFalseCount = await Question.count({
      distinct: true,
      where: {
        ...whereClause,
        questionType: 'TRUE_FALSE',
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

    // Get Easy count
    const easyCount = await Question.count({
      distinct: true,
      where: {
        ...whereClause,
        difficulty: 'EASY',
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

    // Get Medium count
    const mediumCount = await Question.count({
      distinct: true,
      where: {
        ...whereClause,
        difficulty: 'MEDIUM',
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

    // Get Hard count
    const hardCount = await Question.count({
      distinct: true,
      where: {
        ...whereClause,
        difficulty: 'HARD',
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

    console.log('✅ Question counts:', { totalCount, mcqCount, trueFalseCount, easyCount, mediumCount, hardCount });

    res.status(200).json({
      status: 200,
      data: {
        total: totalCount,
        mcq: mcqCount,
        trueFalse: trueFalseCount,
        easy: easyCount,
        medium: mediumCount,
        hard: hardCount,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching question counts:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      status: 500,
      message: error.message || 'Error fetching question counts',
      error: error.toString(),
    });
  }
};

/**
 * Helper to validate a single question row
 */
function validateQuestionRow(rowObj, rowNumber, categoryMap = null) {
  const remarks = [];

  // 1. Category Validation
  const categoryName = (rowObj.category !== undefined && rowObj.category !== null && rowObj.category !== '')
    ? rowObj.category.toString().trim()
    : ((rowObj.categoryName !== undefined && rowObj.categoryName !== null) ? rowObj.categoryName.toString().trim() : '');

  let matchedCategory = null;
  if (!categoryName) {
    remarks.push('Category is required');
  } else if (categoryMap) {
    matchedCategory = categoryMap.get(categoryName.toLowerCase());
    if (!matchedCategory) {
      remarks.push(`Category "${categoryName}" does not belong to the selected company`);
    }
  }

  // 2. Question Text
  const questionText = (rowObj.questionText !== undefined && rowObj.questionText !== null)
    ? rowObj.questionText.toString().trim()
    : '';
  if (!questionText) {
    remarks.push('Question Text is required');
  }

  // 3. Question Type
  let rawType = (rowObj.questionType || '').toString().trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (
    rawType === 'RADIO' ||
    rawType === 'RADIO_BUTTON' ||
    rawType === 'TRUEFALSE' ||
    rawType === 'TRUE_OR_FALSE' ||
    rawType === 'TF'
  ) {
    rawType = 'TRUE_FALSE';
  } else if (
    rawType === 'MULTIPLE' ||
    rawType === 'MULTIPLECHOICE' ||
    rawType === 'MULTI_CHOICE' ||
    rawType === 'MCQ' ||
    rawType === 'MULTI'
  ) {
    rawType = 'MULTIPLE_CHOICE';
  }

  if (rawType !== 'MULTIPLE_CHOICE' && rawType !== 'TRUE_FALSE') {
    remarks.push('Question Type must be MULTIPLE_CHOICE or TRUE_FALSE');
  }

  // 4. Difficulty
  let difficulty = (rowObj.difficulty || 'MEDIUM').toString().trim().toUpperCase();
  if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
    difficulty = 'MEDIUM';
  }

  // 5. Points
  let points = parseFloat(rowObj.points);
  if (isNaN(points) || points <= 0) {
    points = 1;
  }

  // 6. Options and Correct Answer Validation
  const rawCorrect = (rowObj.correctAnswer !== undefined && rowObj.correctAnswer !== null)
    ? rowObj.correctAnswer.toString().trim()
    : '';

  let optA = (rowObj.optionA !== undefined && rowObj.optionA !== null) ? rowObj.optionA.toString().trim() : '';
  let optB = (rowObj.optionB !== undefined && rowObj.optionB !== null) ? rowObj.optionB.toString().trim() : '';
  let optC = (rowObj.optionC !== undefined && rowObj.optionC !== null) ? rowObj.optionC.toString().trim() : '';
  let optD = (rowObj.optionD !== undefined && rowObj.optionD !== null) ? rowObj.optionD.toString().trim() : '';
  let normalizedCorrect = rawCorrect;

  if (rawType === 'TRUE_FALSE') {
    // True / False rules: True/False questions can only have True or False as answer
    optA = 'True';
    optB = 'False';
    optC = '';
    optD = '';

    const upperCorrect = rawCorrect.toUpperCase();
    if (upperCorrect === 'TRUE' || upperCorrect === 'T' || upperCorrect === 'A' || upperCorrect === '1') {
      normalizedCorrect = 'True';
    } else if (upperCorrect === 'FALSE' || upperCorrect === 'F' || upperCorrect === 'B' || upperCorrect === '2') {
      normalizedCorrect = 'False';
    } else {
      remarks.push('True/False questions can only have True or False as answer');
    }
  } else if (rawType === 'MULTIPLE_CHOICE') {
    // MCQ rules: Option A and Option B are required
    if (!optA || !optB) {
      remarks.push('Option A and Option B are required for Multiple Choice');
    }

    if (!rawCorrect) {
      remarks.push('Correct Answer is required');
    } else {
      const upperCorrect = rawCorrect.toUpperCase();
      const validLetters = [];
      if (optA) validLetters.push('A');
      if (optB) validLetters.push('B');
      if (optC) validLetters.push('C');
      if (optD) validLetters.push('D');

      let matched = false;
      if (upperCorrect === 'A' || upperCorrect === '1' || rawCorrect.toLowerCase() === optA.toLowerCase()) {
        normalizedCorrect = 'A';
        matched = true;
      } else if (upperCorrect === 'B' || upperCorrect === '2' || rawCorrect.toLowerCase() === optB.toLowerCase()) {
        normalizedCorrect = 'B';
        matched = true;
      } else if ((upperCorrect === 'C' || upperCorrect === '3' || rawCorrect.toLowerCase() === optC.toLowerCase()) && optC) {
        normalizedCorrect = 'C';
        matched = true;
      } else if ((upperCorrect === 'D' || upperCorrect === '4' || rawCorrect.toLowerCase() === optD.toLowerCase()) && optD) {
        normalizedCorrect = 'D';
        matched = true;
      }

      if (!matched) {
        remarks.push(`Correct Answer must match one of the valid options (${validLetters.join(', ')})`);
      }
    }
  }

  const resolvedCatId = matchedCategory
    ? matchedCategory.questionCategoryMasterID
    : (rowObj.questionCategoryMasterID ? parseInt(rowObj.questionCategoryMasterID) : null);

  return {
    uuid: rowObj.uuid || crypto.randomUUID(),
    rowNumber: rowNumber || rowObj.rowNumber || 1,
    category: matchedCategory ? matchedCategory.categoryName : (categoryName || ''),
    questionCategoryMasterID: resolvedCatId,
    questionText: questionText,
    questionType: rawType || 'MULTIPLE_CHOICE',
    difficulty: difficulty,
    points: points,
    optionA: optA,
    optionB: optB,
    optionC: optC,
    optionD: optD,
    correctAnswer: normalizedCorrect,
    explanation: (rowObj.explanation !== undefined && rowObj.explanation !== null) ? rowObj.explanation.toString().trim() : '',
    remark: remarks.join('; '),
    isCorrect: remarks.length === 0,
  };
}

/**
 * Generate Demo Excel for Question Bank
 */
exports.generateExcelForDemoQuestions = async (req, res, next) => {
  try {
    const companyMasterID = req.body?.companyMasterID || req.query?.companyMasterID;

    // Fetch active categories for the company
    let companyCategories = [];
    if (companyMasterID) {
      companyCategories = await QuestionCategoryMaster.findAll({
        where: {
          companyMasterID: parseInt(companyMasterID),
          status: 1,
        },
        attributes: ['questionCategoryMasterID', 'categoryName'],
        order: [['categoryName', 'ASC']],
      });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tankhwapatra LMS';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Questions', {
      views: [{ showGridLines: true }],
    });

    // Define columns
    worksheet.columns = [
      { header: 'Category *', key: 'category', width: 25 },
      { header: 'Question Text *', key: 'questionText', width: 45 },
      { header: 'Question Type *', key: 'questionType', width: 22 },
      { header: 'Difficulty', key: 'difficulty', width: 16 },
      { header: 'Points', key: 'points', width: 12 },
      { header: 'Option A *', key: 'optionA', width: 28 },
      { header: 'Option B *', key: 'optionB', width: 28 },
      { header: 'Option C', key: 'optionC', width: 28 },
      { header: 'Option D', key: 'optionD', width: 28 },
      { header: 'Correct Answer *', key: 'correctAnswer', width: 20 },
      { header: 'Explanation', key: 'explanation', width: 45 },
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E88E5' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'medium', color: { argb: 'FF0D47A1' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
    });

    const defaultCategoryName = companyCategories.length > 0 ? companyCategories[0].categoryName : 'General';

    // Sample data rows
    const sampleQuestions = [
      {
        category: defaultCategoryName,
        questionText: 'What does HTML stand for?',
        questionType: 'MULTIPLE_CHOICE',
        difficulty: 'EASY',
        points: 1,
        optionA: 'Hyper Text Markup Language',
        optionB: 'High Text Machine Language',
        optionC: 'Hyperlink and Text Markup Language',
        optionD: 'Home Tool Markup Language',
        correctAnswer: 'A',
        explanation: 'HTML is the standard markup language for documents designed to be displayed in a web browser.',
      },
      {
        category: defaultCategoryName,
        questionText: 'JavaScript is a statically-typed programming language.',
        questionType: 'TRUE_FALSE',
        difficulty: 'EASY',
        points: 1,
        optionA: 'True',
        optionB: 'False',
        optionC: '',
        optionD: '',
        correctAnswer: 'False',
        explanation: 'JavaScript is a dynamically typed programming language.',
      },
      {
        category: companyCategories.length > 1 ? companyCategories[1].categoryName : defaultCategoryName,
        questionText: 'Which HTTP status code represents "Internal Server Error"?',
        questionType: 'MULTIPLE_CHOICE',
        difficulty: 'MEDIUM',
        points: 2,
        optionA: '400',
        optionB: '404',
        optionC: '500',
        optionD: '502',
        correctAnswer: 'C',
        explanation: '500 indicates server-side unexpected condition.',
      },
      {
        category: companyCategories.length > 1 ? companyCategories[1].categoryName : defaultCategoryName,
        questionText: 'Git commits are immutable once created.',
        questionType: 'TRUE_FALSE',
        difficulty: 'HARD',
        points: 3,
        optionA: 'True',
        optionB: 'False',
        optionC: '',
        optionD: '',
        correctAnswer: 'True',
        explanation: 'Git commits cannot be modified; rewriting history creates new commits with new hashes.',
      },
    ];

    sampleQuestions.forEach((item) => {
      const row = worksheet.addRow(item);
      row.height = 22;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.alignment = {
          vertical: 'middle',
          horizontal: [3, 4, 5, 10].includes(colNumber) ? 'center' : 'left',
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
      });
    });

    // If company has categories, create a reference sheet for Category dropdown
    if (companyCategories.length > 0) {
      const catSheet = workbook.addWorksheet('Categories');
      catSheet.state = 'hidden';
      companyCategories.forEach((cat, idx) => {
        catSheet.getCell(`A${idx + 1}`).value = cat.categoryName;
      });

      for (let r = 2; r <= 1000; r++) {
        worksheet.getCell(`A${r}`).dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: [`Categories!$A$1:$A$${companyCategories.length}`],
          showErrorMessage: true,
          errorTitle: 'Invalid Category',
          error: 'Please select a valid category from the dropdown list',
        };
      }
    }

    // Add Excel Data Validations for Question Type (Col C) and Difficulty (Col D)
    for (let r = 2; r <= 1000; r++) {
      worksheet.getCell(`C${r}`).dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"MULTIPLE_CHOICE,TRUE_FALSE"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Question Type',
        error: 'Please choose MULTIPLE_CHOICE or TRUE_FALSE',
      };

      worksheet.getCell(`D${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"EASY,MEDIUM,HARD"'],
        showErrorMessage: true,
        errorTitle: 'Invalid Difficulty',
        error: 'Please choose EASY, MEDIUM, or HARD',
      };
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Demo_Questions_Template.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('❌ Error generating demo questions excel:', error);
    next(error);
  }
};

/**
 * Validate Uploaded Questions Excel File
 */
exports.validateQuestionsExcel = async (req, res, next) => {
  if (!req.file) {
    return res.status(200).json({ status: 400, message: 'Please upload an Excel file!' });
  }

  try {
    const companyMasterID = req.body?.companyMasterID || req.query?.companyMasterID;
    if (!companyMasterID) {
      return res.status(200).json({ status: 400, message: 'Please select a company before validating questions!' });
    }

    // Load active categories for the selected company
    const companyCategories = await QuestionCategoryMaster.findAll({
      where: {
        companyMasterID: parseInt(companyMasterID),
        status: 1,
      },
      attributes: ['questionCategoryMasterID', 'categoryName'],
    });

    const categoryMap = new Map();
    companyCategories.forEach((c) => {
      categoryMap.set(c.categoryName.trim().toLowerCase(), c);
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.worksheets[0];

    if (!worksheet || worksheet.rowCount < 2) {
      return res.status(200).json({ status: 400, message: 'Uploaded Excel sheet is empty!' });
    }

    // Parse header row
    const headerRow = worksheet.getRow(1).values;
    const headerMap = {};
    if (Array.isArray(headerRow)) {
      headerRow.forEach((val, idx) => {
        if (val) {
          const str = val.toString().toLowerCase().replace(/[*_-\s]+/g, '');
          headerMap[str] = idx;
        }
      });
    }

    const getColValue = (rowValues, ...keys) => {
      for (const key of keys) {
        const cleanKey = key.toLowerCase().replace(/[*_-\s]+/g, '');
        if (headerMap[cleanKey] !== undefined) {
          const val = rowValues[headerMap[cleanKey]];
          return val !== undefined && val !== null ? val : '';
        }
      }
      return '';
    };

    const validatedQuestions = [];
    const invalidRows = [];

    let rowNum = 1;
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const rowValues = worksheet.getRow(i).values;
      if (!rowValues || rowValues.length === 0) continue;

      const categoryVal = getColValue(rowValues, 'category', 'questioncategory', 'categoryname');
      const qText = getColValue(rowValues, 'questiontext', 'question', 'text');
      const qType = getColValue(rowValues, 'questiontype', 'type');
      const difficulty = getColValue(rowValues, 'difficulty', 'level');
      const points = getColValue(rowValues, 'points', 'marks', 'point');
      const optA = getColValue(rowValues, 'optiona', 'a', 'option1');
      const optB = getColValue(rowValues, 'optionb', 'b', 'option2');
      const optC = getColValue(rowValues, 'optionc', 'c', 'option3');
      const optD = getColValue(rowValues, 'optiond', 'd', 'option4');
      const correct = getColValue(rowValues, 'correctanswer', 'answer', 'correct');
      const explanation = getColValue(rowValues, 'explanation', 'explain', 'desc');

      // Skip completely empty rows
      if (!categoryVal && !qText && !qType && !optA && !correct) continue;

      const validatedRow = validateQuestionRow(
        {
          category: categoryVal,
          questionText: qText,
          questionType: qType,
          difficulty: difficulty,
          points: points,
          optionA: optA,
          optionB: optB,
          optionC: optC,
          optionD: optD,
          correctAnswer: correct,
          explanation: explanation,
        },
        rowNum,
        categoryMap,
      );

      if (!validatedRow.isCorrect) {
        invalidRows.push(validatedRow);
      }
      validatedQuestions.push(validatedRow);
      rowNum++;
    }

    if (validatedQuestions.length === 0) {
      return res.status(200).json({ status: 400, message: 'No questions found in Excel file!' });
    }

    // Create intermediate validated Excel workbook on disk
    const validatedWorkbook = new ExcelJS.Workbook();
    const validatedWorksheet = validatedWorkbook.addWorksheet('Validated Questions');

    validatedWorksheet.columns = [
      { header: 'UUID', key: 'uuid', width: 36 },
      { header: 'Remark', key: 'remark', width: 40 },
      { header: 'Row Number', key: 'rowNumber', width: 12 },
      { header: 'Category', key: 'category', width: 25 },
      { header: 'QuestionCategoryMasterID', key: 'questionCategoryMasterID', width: 15 },
      { header: 'Question Text', key: 'questionText', width: 45 },
      { header: 'Question Type', key: 'questionType', width: 20 },
      { header: 'Difficulty', key: 'difficulty', width: 15 },
      { header: 'Points', key: 'points', width: 10 },
      { header: 'Option A', key: 'optionA', width: 25 },
      { header: 'Option B', key: 'optionB', width: 25 },
      { header: 'Option C', key: 'optionC', width: 25 },
      { header: 'Option D', key: 'optionD', width: 25 },
      { header: 'Correct Answer', key: 'correctAnswer', width: 18 },
      { header: 'Explanation', key: 'explanation', width: 40 },
    ];

    validatedQuestions.forEach((q) => {
      validatedWorksheet.addRow(q);
    });

    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const savePath = path.join(
      uploadsDir,
      `validated_questions_${Date.now()}_${Math.random().toString(36).substring(7)}.xlsx`,
    );
    await validatedWorkbook.xlsx.writeFile(savePath);

    // Clean up uploaded raw file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const page = Number(req.body.page) || 1;
    const limit = Number(req.body.limit) || 20;
    const start = (page - 1) * limit;
    const end = start + limit;
    const invalidRowNumbers = invalidRows.map((r) => r.rowNumber).join(', ');

    return res.status(200).json({
      status: 200,
      message: 'Questions validated successfully',
      validatedExcelPath: savePath,
      questions: validatedQuestions.slice(start, end),
      totalRecords: validatedQuestions.length,
      page: page,
      limit: limit,
      invalidRowNumbers: invalidRowNumbers,
      summary: {
        totalRows: validatedQuestions.length,
        invalidRowCount: invalidRows.length,
        hasErrors: invalidRows.length > 0,
      },
    });
  } catch (error) {
    console.error('❌ Error validating questions excel:', error);
    next(error);
  }
};

/**
 * Get Validated Questions Data (Paginated)
 */
exports.getValidatedQuestionsData = async (req, res, next) => {
  try {
    const { validatedExcelPath, page = 1, limit = 20 } = req.body;

    if (!validatedExcelPath) {
      return res.status(400).json({ status: 400, message: 'Validated Excel path is required!' });
    }

    if (!fs.existsSync(validatedExcelPath)) {
      return res.status(404).json({ status: 404, message: 'Validated file not found!' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(validatedExcelPath);
    const worksheet = workbook.getWorksheet('Validated Questions') || workbook.worksheets[0];

    const questions = [];
    const invalidRows = [];

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const uuid = row.getCell(1).value;
      if (!uuid) continue;

      const q = {
        uuid: uuid,
        remark: row.getCell(2).value || '',
        rowNumber: Number(row.getCell(3).value) || r - 1,
        category: row.getCell(4).value || '',
        questionCategoryMasterID: Number(row.getCell(5).value) || null,
        questionText: row.getCell(6).value || '',
        questionType: row.getCell(7).value || 'MULTIPLE_CHOICE',
        difficulty: row.getCell(8).value || 'MEDIUM',
        points: Number(row.getCell(9).value) || 1,
        optionA: row.getCell(10).value || '',
        optionB: row.getCell(11).value || '',
        optionC: row.getCell(12).value || '',
        optionD: row.getCell(13).value || '',
        correctAnswer: row.getCell(14).value || '',
        explanation: row.getCell(15).value || '',
        isCorrect: !row.getCell(2).value,
      };

      if (!q.isCorrect) {
        invalidRows.push(q);
      }
      questions.push(q);
    }

    const p = Number(page) || 1;
    const l = Number(limit) || 20;
    const start = (p - 1) * l;
    const end = start + l;

    return res.status(200).json({
      status: 200,
      questions: questions.slice(start, end),
      totalRecords: questions.length,
      page: p,
      limit: l,
      invalidRowNumbers: invalidRows.map((r) => r.rowNumber).join(', '),
      summary: {
        totalRows: questions.length,
        invalidRowCount: invalidRows.length,
        hasErrors: invalidRows.length > 0,
      },
    });
  } catch (error) {
    console.error('❌ Error getting validated questions data:', error);
    next(error);
  }
};

/**
 * Update Validated Question Row
 */
exports.updateValidatedQuestionRow = async (req, res, next) => {
  try {
    const { validatedExcelPath, uuid, question, companyMasterID } = req.body;

    if (!validatedExcelPath || !uuid || !question) {
      return res.status(400).json({ status: 400, message: 'Missing required update parameters' });
    }

    if (!fs.existsSync(validatedExcelPath)) {
      return res.status(404).json({ status: 404, message: 'Validated file not found!' });
    }

    // Load category map for validation if companyMasterID is provided
    let categoryMap = null;
    if (companyMasterID) {
      const companyCategories = await QuestionCategoryMaster.findAll({
        where: {
          companyMasterID: parseInt(companyMasterID),
          status: 1,
        },
        attributes: ['questionCategoryMasterID', 'categoryName'],
      });
      categoryMap = new Map();
      companyCategories.forEach((c) => {
        categoryMap.set(c.categoryName.trim().toLowerCase(), c);
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(validatedExcelPath);
    const worksheet = workbook.getWorksheet('Validated Questions') || workbook.worksheets[0];

    let targetRowIndex = -1;
    for (let r = 2; r <= worksheet.rowCount; r++) {
      if (worksheet.getRow(r).getCell(1).value === uuid) {
        targetRowIndex = r;
        break;
      }
    }

    if (targetRowIndex === -1) {
      return res.status(404).json({ status: 404, message: 'Question row not found in file!' });
    }

    const currentRow = worksheet.getRow(targetRowIndex);
    const rowNumber = Number(currentRow.getCell(3).value) || targetRowIndex - 1;

    // Re-validate updated row
    const revalidated = validateQuestionRow(
      {
        ...question,
        uuid: uuid,
        rowNumber: rowNumber,
      },
      rowNumber,
      categoryMap,
    );

    // Update worksheet cells
    currentRow.getCell(1).value = revalidated.uuid;
    currentRow.getCell(2).value = revalidated.remark;
    currentRow.getCell(3).value = revalidated.rowNumber;
    currentRow.getCell(4).value = revalidated.category;
    currentRow.getCell(5).value = revalidated.questionCategoryMasterID;
    currentRow.getCell(6).value = revalidated.questionText;
    currentRow.getCell(7).value = revalidated.questionType;
    currentRow.getCell(8).value = revalidated.difficulty;
    currentRow.getCell(9).value = revalidated.points;
    currentRow.getCell(10).value = revalidated.optionA;
    currentRow.getCell(11).value = revalidated.optionB;
    currentRow.getCell(12).value = revalidated.optionC;
    currentRow.getCell(13).value = revalidated.optionD;
    currentRow.getCell(14).value = revalidated.correctAnswer;
    currentRow.getCell(15).value = revalidated.explanation;
    currentRow.commit();

    await workbook.xlsx.writeFile(validatedExcelPath);

    // Recalculate summary
    const invalidRows = [];
    let totalRows = 0;
    for (let r = 2; r <= worksheet.rowCount; r++) {
      const u = worksheet.getRow(r).getCell(1).value;
      if (!u) continue;
      totalRows++;
      const rem = worksheet.getRow(r).getCell(2).value;
      if (rem) {
        invalidRows.push(Number(worksheet.getRow(r).getCell(3).value) || r - 1);
      }
    }

    return res.status(200).json({
      status: 200,
      message: 'Question row updated successfully',
      updatedQuestion: revalidated,
      invalidRowNumbers: invalidRows.join(', '),
      summary: {
        totalRows: totalRows,
        invalidRowCount: invalidRows.length,
        hasErrors: invalidRows.length > 0,
      },
    });
  } catch (error) {
    console.error('❌ Error updating validated question row:', error);
    next(error);
  }
};

/**
 * Delete Validated Question Row
 */
exports.deleteValidatedQuestionRow = async (req, res, next) => {
  try {
    const { validatedExcelPath, uuid } = req.body;

    if (!validatedExcelPath || !uuid) {
      return res.status(400).json({ status: 400, message: 'Validated path and UUID are required' });
    }

    if (!fs.existsSync(validatedExcelPath)) {
      return res.status(404).json({ status: 404, message: 'Validated file not found!' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(validatedExcelPath);
    const worksheet = workbook.getWorksheet('Validated Questions') || workbook.worksheets[0];

    let targetRowIndex = -1;
    for (let r = 2; r <= worksheet.rowCount; r++) {
      if (worksheet.getRow(r).getCell(1).value === uuid) {
        targetRowIndex = r;
        break;
      }
    }

    if (targetRowIndex !== -1) {
      worksheet.spliceRows(targetRowIndex, 1);
      await workbook.xlsx.writeFile(validatedExcelPath);
    }

    // Recalculate summary
    const invalidRows = [];
    let totalRows = 0;
    for (let r = 2; r <= worksheet.rowCount; r++) {
      const u = worksheet.getRow(r).getCell(1).value;
      if (!u) continue;
      totalRows++;
      const rem = worksheet.getRow(r).getCell(2).value;
      if (rem) {
        invalidRows.push(Number(worksheet.getRow(r).getCell(3).value) || r - 1);
      }
    }

    return res.status(200).json({
      status: 200,
      message: 'Question row deleted successfully',
      totalRecords: totalRows,
      invalidRowNumbers: invalidRows.join(', '),
      summary: {
        totalRows: totalRows,
        invalidRowCount: invalidRows.length,
        hasErrors: invalidRows.length > 0,
      },
    });
  } catch (error) {
    console.error('❌ Error deleting validated question row:', error);
    next(error);
  }
};

/**
 * Re-Validate All Questions in Validated File
 */
exports.reValidateQuestions = async (req, res, next) => {
  try {
    const { validatedExcelPath, companyMasterID, page = 1, limit = 20 } = req.body;

    if (!validatedExcelPath) {
      return res.status(400).json({ status: 400, message: 'Validated path is required' });
    }

    if (!fs.existsSync(validatedExcelPath)) {
      return res.status(404).json({ status: 404, message: 'Validated file not found!' });
    }

    let categoryMap = null;
    if (companyMasterID) {
      const companyCategories = await QuestionCategoryMaster.findAll({
        where: {
          companyMasterID: parseInt(companyMasterID),
          status: 1,
        },
        attributes: ['questionCategoryMasterID', 'categoryName'],
      });
      categoryMap = new Map();
      companyCategories.forEach((c) => {
        categoryMap.set(c.categoryName.trim().toLowerCase(), c);
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(validatedExcelPath);
    const worksheet = workbook.getWorksheet('Validated Questions') || workbook.worksheets[0];

    const questions = [];
    const invalidRows = [];

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const uuid = row.getCell(1).value;
      if (!uuid) continue;

      const raw = {
        uuid: uuid,
        rowNumber: Number(row.getCell(3).value) || r - 1,
        category: row.getCell(4).value || '',
        questionCategoryMasterID: Number(row.getCell(5).value) || null,
        questionText: row.getCell(6).value || '',
        questionType: row.getCell(7).value || 'MULTIPLE_CHOICE',
        difficulty: row.getCell(8).value || 'MEDIUM',
        points: Number(row.getCell(9).value) || 1,
        optionA: row.getCell(10).value || '',
        optionB: row.getCell(11).value || '',
        optionC: row.getCell(12).value || '',
        optionD: row.getCell(13).value || '',
        correctAnswer: row.getCell(14).value || '',
        explanation: row.getCell(15).value || '',
      };

      const revalidated = validateQuestionRow(raw, raw.rowNumber, categoryMap);

      row.getCell(2).value = revalidated.remark;
      row.getCell(4).value = revalidated.category;
      row.getCell(5).value = revalidated.questionCategoryMasterID;
      row.getCell(6).value = revalidated.questionText;
      row.getCell(7).value = revalidated.questionType;
      row.getCell(8).value = revalidated.difficulty;
      row.getCell(9).value = revalidated.points;
      row.getCell(10).value = revalidated.optionA;
      row.getCell(11).value = revalidated.optionB;
      row.getCell(12).value = revalidated.optionC;
      row.getCell(13).value = revalidated.optionD;
      row.getCell(14).value = revalidated.correctAnswer;
      row.getCell(15).value = revalidated.explanation;
      row.commit();

      if (!revalidated.isCorrect) {
        invalidRows.push(revalidated);
      }
      questions.push(revalidated);
    }

    await workbook.xlsx.writeFile(validatedExcelPath);

    const p = Number(page) || 1;
    const l = Number(limit) || 20;
    const start = (p - 1) * l;
    const end = start + l;

    return res.status(200).json({
      status: 200,
      message: 'Questions re-validated successfully',
      questions: questions.slice(start, end),
      totalRecords: questions.length,
      invalidRowNumbers: invalidRows.map((r) => r.rowNumber).join(', '),
      summary: {
        totalRows: questions.length,
        invalidRowCount: invalidRows.length,
        hasErrors: invalidRows.length > 0,
      },
    });
  } catch (error) {
    console.error('❌ Error re-validating questions:', error);
    next(error);
  }
};

/**
 * Bulk Create Validated Questions for Selected Company & Department(s)
 */
exports.bulkCreateValidatedQuestions = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { validatedExcelPath, companyMasterID, departmentIDs, departmentID } = req.body;

    const targetDeptIds = departmentIDs && Array.isArray(departmentIDs) && departmentIDs.length > 0
      ? departmentIDs
      : (departmentID ? (Array.isArray(departmentID) ? departmentID : [departmentID]) : []);

    if (!validatedExcelPath || !companyMasterID || targetDeptIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: 400,
        message: 'Company, at least one department, and validated file path are required!',
      });
    }

    if (!fs.existsSync(validatedExcelPath)) {
      await transaction.rollback();
      return res.status(404).json({ status: 404, message: 'Validated file not found!' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(validatedExcelPath);
    const worksheet = workbook.getWorksheet('Validated Questions') || workbook.worksheets[0];

    const validQuestions = [];
    const invalidRows = [];

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const uuid = row.getCell(1).value;
      if (!uuid) continue;

      const q = {
        category: row.getCell(4).value || '',
        questionCategoryMasterID: Number(row.getCell(5).value) || null,
        questionText: row.getCell(6).value || '',
        questionType: (row.getCell(7).value || 'MULTIPLE_CHOICE').toString().toUpperCase(),
        difficulty: (row.getCell(8).value || 'MEDIUM').toString().toUpperCase(),
        points: parseFloat(row.getCell(9).value) || 1,
        optionA: row.getCell(10).value || '',
        optionB: row.getCell(11).value || '',
        optionC: row.getCell(12).value || '',
        optionD: row.getCell(13).value || '',
        correctAnswer: (row.getCell(14).value || '').toString().trim(),
        explanation: row.getCell(15).value || '',
        remark: row.getCell(2).value || '',
      };

      if (q.remark) {
        invalidRows.push(r - 1);
      }
      validQuestions.push(q);
    }

    if (invalidRows.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        status: 400,
        message: `Cannot import. There are ${invalidRows.length} invalid row(s). Please fix remarks first.`,
        invalidRows: invalidRows,
      });
    }

    if (validQuestions.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ status: 400, message: 'No questions found to import!' });
    }

    const creatorId =
      req.userDetails?.userMasterId ||
      req.userDetails?.userMasterID ||
      req.user?.userMasterId ||
      req.user?.userMasterID ||
      null;
    const clientIp = req.userDetails?.userIpAddress || req.ip || null;
    let totalCreated = 0;

    for (const deptId of targetDeptIds) {
      for (const q of validQuestions) {
        const createdQuestion = await Question.create(
          {
            questionText: q.questionText,
            questionType: q.questionType,
            difficulty: q.difficulty,
            points: q.points,
            explanation: q.explanation || '',
            departmentID: deptId,
            questionCategoryMasterID: q.questionCategoryMasterID || null,
            isActive: true,
            createdBy: creatorId,
            createdByIp: clientIp,
            status: 1,
          },
          { transaction },
        );

        const optionsToInsert = [];
        if (q.questionType === 'TRUE_FALSE') {
          const isTrueCorrect = q.correctAnswer === 'True' || q.correctAnswer === 'TRUE' || q.correctAnswer === 'A' || q.correctAnswer === '1';
          optionsToInsert.push(
            { questionID: createdQuestion.questionID, optionText: 'True', isCorrect: isTrueCorrect },
            { questionID: createdQuestion.questionID, optionText: 'False', isCorrect: !isTrueCorrect },
          );
        } else {
          // Multiple Choice
          const upperCorrect = q.correctAnswer.toUpperCase();
          if (q.optionA) {
            optionsToInsert.push({
              questionID: createdQuestion.questionID,
              optionText: q.optionA,
              isCorrect: upperCorrect === 'A' || upperCorrect === '1' || q.correctAnswer.toLowerCase() === q.optionA.toLowerCase(),
            });
          }
          if (q.optionB) {
            optionsToInsert.push({
              questionID: createdQuestion.questionID,
              optionText: q.optionB,
              isCorrect: upperCorrect === 'B' || upperCorrect === '2' || q.correctAnswer.toLowerCase() === q.optionB.toLowerCase(),
            });
          }
          if (q.optionC) {
            optionsToInsert.push({
              questionID: createdQuestion.questionID,
              optionText: q.optionC,
              isCorrect: upperCorrect === 'C' || upperCorrect === '3' || q.correctAnswer.toLowerCase() === q.optionC.toLowerCase(),
            });
          }
          if (q.optionD) {
            optionsToInsert.push({
              questionID: createdQuestion.questionID,
              optionText: q.optionD,
              isCorrect: upperCorrect === 'D' || upperCorrect === '4' || q.correctAnswer.toLowerCase() === q.optionD.toLowerCase(),
            });
          }
        }

        if (optionsToInsert.length > 0) {
          await QuestionOption.bulkCreate(optionsToInsert, { transaction });
        }

        totalCreated++;
      }
    }

    await transaction.commit();

    // Clean up validated excel file
    try {
      if (fs.existsSync(validatedExcelPath)) {
        fs.unlinkSync(validatedExcelPath);
      }
    } catch (e) {
      console.warn('Could not delete temporary validated excel file:', e.message);
    }

    return res.status(200).json({
      status: 200,
      message: `${validQuestions.length} question(s) imported successfully across ${targetDeptIds.length} department(s)!`,
      totalImported: totalCreated,
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error bulk creating questions:', error);
    next(error);
  }
};

