const express = require('express');
const router = express.Router();
const momDetailsController = require('../controllers/momDetails.controller');

router.post('/v1/addMomDetails', momDetailsController.addMomDetails);
router.post('/v1/getAllMomDetails', momDetailsController.getAllMomDetails);
router.post('/v1/getMomDetailsById', momDetailsController.getMomDetailsById);
router.post('/v1/updateMomDetails', momDetailsController.updateMomDetails);

module.exports = router;
