const express = require('express');
const moduleDetailsController = require('../controllers/moduleDetails.controller');
const router = express.Router();
const { uploadImportExcelFile } = require('../middleware/uploadFile');

router.post('/v1/add', moduleDetailsController.postAddModuleDetails);
router.post('/v1/updatebyid', moduleDetailsController.postUpdatemoduleDetails);
router.get('/v1/getbyid/:id', moduleDetailsController.getmoduledetailsId);
router.post(
  '/v1/deletebyid',
  moduleDetailsController.postDeletemoduleDetailsById,
); //delete by id
router.post('/v1/getalldata', moduleDetailsController.getAllModuleDetails);
router.post('/v1/statuschanges', moduleDetailsController.poststatuschange); //status by id
router.post(
  '/v1/uploadexcel',
  uploadImportExcelFile,
  moduleDetailsController.uploadexcel,
); //upload excel

module.exports = router;
