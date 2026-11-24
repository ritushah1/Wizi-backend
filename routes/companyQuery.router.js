const express = require('express');
const router = express.Router();
const CompanyQuery = require('../controllers/companyQuery.controller');

router.post('/v1/addCompanyQuery', CompanyQuery.postAddCompanyQuery); 
router.post('/v1/deleteCompanyQuery', CompanyQuery.deleteCompanyQuery); 
router.post('/v1/updateCompanyQuery', CompanyQuery.updateCompanyQuery); 
router.post('/v1/updateStatus', CompanyQuery.postStatusChange); 
router.post('/v1/getAllCompanyQuery', CompanyQuery.getAllCompanyQuery); 
router.post('/v1/getCompanyQueryByID', CompanyQuery.getCompanyQueryByID); 

module.exports = router;
