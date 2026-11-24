const express = require('express');
const router = express.Router();
const questionController = require('../controllers/question.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');

// Standard Question Bank Routes
router.post('/add', questionController.add);
router.post('/list', questionController.list);
router.post('/getByID', questionController.getByID);
router.post('/update', questionController.update);
router.post('/updateStatus', questionController.updateStatus);
router.post('/delete', questionController.delete);
router.post('/counts', questionController.getCounts);

// Bulk Upload & Excel Validation Routes (matching attendanceTransaction flow)
router.post('/generateDemoExcel', questionController.generateExcelForDemoQuestions);
router.post('/generateExcelForDemoQuestions', questionController.generateExcelForDemoQuestions);
router.post('/validateQuestionsExcel', uploadImportExcelFile, questionController.validateQuestionsExcel);
router.post('/getValidatedQuestionsData', questionController.getValidatedQuestionsData);
router.post('/updateValidatedQuestionRow', questionController.updateValidatedQuestionRow);
router.post('/deleteValidatedQuestionRow', questionController.deleteValidatedQuestionRow);
router.post('/reValidateQuestions', questionController.reValidateQuestions);
router.post('/bulkCreateValidatedQuestions', questionController.bulkCreateValidatedQuestions);

module.exports = router;

