const express = require('express');
const countryMasterController = require('../controllers/countrymaster.controller');
const router = express.Router();

const { verifyToken } = require('../middleware/tokenverify');
const { uploadImportExcelFile } = require('../middleware/uploadFile');

router.post('/v1/add', verifyToken, countryMasterController.postAddCountry); // save data
router.post(
  '/v1/addfile',
  verifyToken,
  uploadImportExcelFile,
  countryMasterController.postImportData,
); // save data
router.post('/v1/getalldata', countryMasterController.getAllCountryData); //get all country data
router.get('/v1/getbyid/:id', countryMasterController.getCountryById); //get by id
router.post(
  '/v1/updatebyid',
  verifyToken,
  countryMasterController.postUpdateCountry,
); //update country data
router.post(
  '/v1/deletebyid',
  verifyToken,
  countryMasterController.postDeleteCountryById,
); //delete by id
router.post(
  '/v1/statuschanges',
  verifyToken,
  countryMasterController.poststatuschange,
); //status change
module.exports = router;
