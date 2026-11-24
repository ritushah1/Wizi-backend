const express = require('express');
const payheadController = require('../controllers/payhead.controller');
const router = express.Router();

const { uploadImportExcelFile } = require('../middleware/uploadFile');

router.post('/v1/add', payheadController.postAddPayhead); // save data
router.post('/v1/getalldata', payheadController.getAllPayhead); //get all state data
router.post(
  '/v1/addfile',
  uploadImportExcelFile,
  payheadController.postImportData,
); // save data
router.get('/v1/getbyid/:id', payheadController.getPayheadById); //get by id
router.post('/v1/updatebyid', payheadController.postUpdatePayhead); //update state data
router.post('/v1/deletebyid', payheadController.postDeletePayheadById); //delete by id
router.post('/v1/statuschanges', payheadController.poststatuschange); //status change
router.post('/v1/getActivePayhead', payheadController.getActivePayhead); //status change

module.exports = router;
