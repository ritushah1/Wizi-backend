const express = require('express');
const router = express.Router();
const QueryStatus = require('../controllers/queryStatus.controller');

router.post('/v1/addQueryStatus', QueryStatus.postAddQueryStatus); 
router.post('/v1/updateQueryStatus', QueryStatus.updateQueryStatus); 
router.post('/v1/getAllQueryStatus', QueryStatus.getAllQueryStatus);  

module.exports = router;
