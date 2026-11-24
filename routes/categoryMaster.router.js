const express = require('express');
const categoryMasterController = require('../controllers/categoryMaster.controller');
const router = express.Router();

// Add new category
router.post('/v1/add', categoryMasterController.postAddCategory);

// Get category by ID
router.post('/v1/getbyid', categoryMasterController.getCategoryById);

// Update category
router.post('/v1/updatebyid', categoryMasterController.postUpdateCategory);

// Delete category
router.post('/v1/deletebyid', categoryMasterController.postDeleteCategory);

// Change status
router.post('/v1/statuschange', categoryMasterController.postStatusChange);

// Get categories by company ID (with pagination and search)
router.post('/v1/getCategoryByCompanyId', categoryMasterController.getCategoryByCompanyId);

// Get active categories by company ID
router.post('/v1/getActiveCategoryByCompanyId', categoryMasterController.getActiveCategoryByCompanyId);

module.exports = router;
