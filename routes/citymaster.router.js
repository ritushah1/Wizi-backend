const express = require('express');
const cityMasterController = require('../controllers/citymaster.controller');
const router = express.Router();

const { verifyToken } = require('../middleware/tokenverify');
const { uploadImportExcelFile } = require('../middleware/uploadFile');

router.post('/v1/add', verifyToken, cityMasterController.postAddCity); // save data
router.post(
  '/v1/addfile',
  verifyToken,
  uploadImportExcelFile,
  cityMasterController.postImportData,
); // save data
router.post('/v1/getalldata', cityMasterController.getAllCityData); //get all city data
router.get('/v1/getbyid/:id', cityMasterController.getCityById); //get by id
router.post('/v1/updatebyid', verifyToken, cityMasterController.postUpdateCity); //update city data
router.post(
  '/v1/deletebyid',
  verifyToken,
  cityMasterController.postDeleteCityById,
); //delete by id
router.post(
  '/v1/statuschanges',
  verifyToken,
  cityMasterController.poststatuschange,
); //status change
router.get(
  '/v1/getbgetCityBystateIdyid/:id',
  cityMasterController.getCityBystateId,
); //get by id

router.post(
  '/v1/uploadExcel',
  uploadImportExcelFile,
  cityMasterController.uploadExcel,
);
module.exports = router;
