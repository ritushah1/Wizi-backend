const express = require('express');
const AssessmentController = require('../controllers/assessment.controller');
const router = express.Router();

// Assessment CRUD operations
router.get('/creator/mine', AssessmentController.getMyAssessments);
router.post('/add', AssessmentController.addAssessment);
router.post('/list', AssessmentController.listAssessment);
router.post('/getByID', AssessmentController.getAssessmentByID);
router.post('/update', AssessmentController.updateAssessment);
router.post('/updateStatus', AssessmentController.updateAssessmentStatus);
router.post('/delete', AssessmentController.deleteAssessment);

// Assessment counts
router.post('/counts', AssessmentController.getAssessmentCounts);

// Assessment attempts - Angular compatibility (forward to assessment-attempts controller)
const AssessmentAttemptController = require('../controllers/assessmentAttempt.controller');
router.post('/:assessmentId/attempts', AssessmentAttemptController.getMyAttempts);

// Assessment question management
router.post('/assignQuestions', AssessmentController.assignQuestions);

// Assessment validation
router.post('/validate', AssessmentController.validateAssessment);

module.exports = router;
