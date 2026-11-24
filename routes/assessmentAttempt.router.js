const express = require('express');
const AssessmentAttemptController = require('../controllers/assessmentAttempt.controller');
const router = express.Router();

// Get user's attempts for an assessment (Angular format - URL param)
router.post('/assessments/:assessmentId/attempts', AssessmentAttemptController.getMyAttempts);

// Start a new assessment attempt
router.post('/start', AssessmentAttemptController.startAttempt);

// Submit assessment attempt with answers
router.post('/submit', AssessmentAttemptController.submitAttempt);

// Get user's attempts for an assessment (React format - body param)
router.post('/myAttempts', AssessmentAttemptController.getMyAttempts);

// Get attempt details with answers
router.post('/details', AssessmentAttemptController.getAttemptDetails);

module.exports = router;
