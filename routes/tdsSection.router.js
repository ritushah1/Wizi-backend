const express = require('express');
const router = express.Router();

const tdsSectionController = require('../controllers/tdsSection.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');

router.post('/v1/add', tdsSectionController.addtdsSection);
router.put('/v1/:id', tdsSectionController.updateTdsSection);
router.put('/v1/updateStatus/:id', tdsSectionController.updateStatus);
router.get('/v1/getAllData', tdsSectionController.getAllData);
router.get('/v1/getById/:id', tdsSectionController.getById);
router.post(
  '/v1/uploadSection',
  uploadImportExcelFile,
  tdsSectionController.uploadSection
);

module.exports = router;
