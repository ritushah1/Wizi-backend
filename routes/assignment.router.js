const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');

// All routes use POST method (tp-backend convention)
router.post('/add', assignmentController.add);
router.post('/list', assignmentController.list);
router.post('/getByID', assignmentController.getByID);
router.post('/update', assignmentController.update);
router.post('/publish', assignmentController.publish);
router.post('/delete', assignmentController.delete);

// Assignment counts
router.post('/counts', assignmentController.getCounts);

// Assignment allocation routes
router.post('/assignToTrainees', assignmentController.assignToTrainees);
router.post('/updateDeadline', assignmentController.updateDeadline);
router.post('/getAllocations', assignmentController.getAllocations);
router.post('/getAssignedToMe', assignmentController.getAssignedToMe);

module.exports = router;
