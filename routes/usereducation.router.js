const express = require('express');
const userEducationController = require('../controllers/usereducation.controller');
const { uploadUserEducation } = require('../middleware/uploadFile');
const router = express.Router();

router.post(
  '/v1/updatebyid',
  uploadUserEducation,
  userEducationController.postUpdateUserEducation,
); //update user education data
router.post(
  '/v1/add',
  uploadUserEducation,
  userEducationController.postAddUserEducation,
); // save data

router.get('/v1/getbyid/:id', userEducationController.getUserEducationById); //get by id
router.get(
  '/v1/getbyuserid/:id',
  userEducationController.getUserEducationByUserMasterId,
); //get by user id
router.post(
  '/v1/deletebyid',
  userEducationController.postDeleteUserEducationById,
); //delete by id
router.post('/v1/statuschanges', userEducationController.poststatuschange);
router.post('/v1/verifyreq', userEducationController.postEduVerifyRequest);

module.exports = router;
