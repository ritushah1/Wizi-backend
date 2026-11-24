const express = require('express');
const stateMasterController = require('../controllers/statemaster.controller');
const router = express.Router();

const { verifyToken } = require('../middleware/tokenverify');
const { uploadImportExcelFile } = require('../middleware/uploadFile');

router.post('/v1/add', verifyToken, stateMasterController.postAddState); // save data
router.post('/v1/getalldata', stateMasterController.getAllStateData); //get all state data
router.post(
  '/v1/addfile',
  verifyToken,
  uploadImportExcelFile,
  stateMasterController.postImportData,
); // save data
router.get('/v1/getbyid/:id', stateMasterController.getStateById); //get by id
router.post(
  '/v1/updatebyid',
  verifyToken,
  stateMasterController.postUpdateState,
); //update state data
router.post(
  '/v1/deletebyid',
  verifyToken,
  stateMasterController.postDeleteStateById,
); //delete by id
router.get('/v1/getbycountryid/:id', stateMasterController.getStateBycountryid); //get by countryid
router.post(
  '/v1/statuschanges',
  verifyToken,
  stateMasterController.poststatuschange,
); //status change
module.exports = router;
