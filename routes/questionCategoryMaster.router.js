const express = require('express');
const questionCategoryMasterController = require('../controllers/questionCategoryMaster.controller');
const router = express.Router();

// Add new question category
router.post('/v1/add', questionCategoryMasterController.postAddQuestionCategory);

// Get question category by ID
router.post('/v1/getbyid', questionCategoryMasterController.getQuestionCategoryById);

// Update question category
router.post('/v1/updatebyid', questionCategoryMasterController.postUpdateQuestionCategory);

// Delete question category
router.post('/v1/deletebyid', questionCategoryMasterController.postDeleteQuestionCategory);

// Change status
router.post('/v1/statuschange', questionCategoryMasterController.postStatusChange);

// Get question categories by company ID (with pagination and search)
router.post(
  '/v1/getQuestionCategoryByCompanyId',
  questionCategoryMasterController.getQuestionCategoryByCompanyId,
);

// Get active question categories by company ID
router.post(
  '/v1/getActiveQuestionCategoryByCompanyId',
  questionCategoryMasterController.getActiveQuestionCategoryByCompanyId,
);

module.exports = router;
