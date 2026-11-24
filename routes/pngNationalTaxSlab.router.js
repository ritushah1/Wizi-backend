/** @format */

const express = require('express');
const PNGNationalTaxSlabController = require('../controllers/pngNationalTaxSlab.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const router = express.Router();

// uplaod excel for nation tax slab
router.post(
  '/v1/uploadExcel',
  uploadImportExcelFile,
  PNGNationalTaxSlabController.uploadExcel
);

// upload excel for national tax rebate
router.post(
  '/v1/uploadExcelTaxRebate',
  uploadImportExcelFile,
  PNGNationalTaxSlabController.uploadExcelTaxRebate
);

module.exports = router;
