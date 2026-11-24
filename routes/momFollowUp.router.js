const express = require('express');
const router = express.Router();
const momFollowUpController = require('../controllers/momFollowUp.controller');

router.post('/v1/addMomFollowUp', momFollowUpController.addMomFollowUp);
router.post(
  '/v1/getAllMomFollowUpById',
  momFollowUpController.getAllMomFollowUpById
);
router.post('/v1/getMomFollowUpById', momFollowUpController.getMomFollowUpById);
router.post('/v1/updateMomFollowUp', momFollowUpController.updateMomFollowUp);
module.exports = router;
