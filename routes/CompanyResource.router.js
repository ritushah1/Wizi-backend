'use strict';
const express = require('express');
const router = express.Router();
const companyResourceController = require('../controllers/CompanyResource.controller');

// List Branch
router.post('/v1/listBranch', companyResourceController.listBranch);

// List Department
router.post('/v1/listDepartment', companyResourceController.listDepartment);

// List Designation
router.post('/v1/listDesignation', companyResourceController.listDesignation);

// List Division
router.post('/v1/listDivision', companyResourceController.listDivision);

// List WorkingArea
router.post('/v1/listWorkingArea', companyResourceController.listWorkingArea);

// Add Candidate - POST request to register a new candidate
router.post('/v1/addCandidate', companyResourceController.addCandidate);

module.exports = router;