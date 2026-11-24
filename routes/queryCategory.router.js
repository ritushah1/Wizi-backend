const express = require('express');
const router = express.Router();
const QueryCategory = require('../controllers/queryCategory.controller');

router.post('/v1/addQueryCategory', QueryCategory.postAddQueryCategory); 
router.post('/v1/deleteQueryCategory', QueryCategory.deleteQueryCategory); 
router.post('/v1/updateQueryCategory', QueryCategory.updateQueryCategory); 
router.post('/v1/updateStatus', QueryCategory.postStatusChange); 
router.post('/v1/getAllQueryCategory', QueryCategory.getAllQueryCategory); 
router.post('/v1/getQueryCategoryByID', QueryCategory.getQueryCategoryByID); 
router.post('/v1/getActiveQueryCategory', QueryCategory.getActiveQueryCategory); 

module.exports = router;
