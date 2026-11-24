const express = require('express');
const router = express.Router();
const lmsSsoController = require('../controllers/lmsSso.controller');

// Get user details for LMS SSO (no auth required - called by LMS backend)
router.get('/user/:userMasterID', lmsSsoController.getUserForLMS);

module.exports = router;
