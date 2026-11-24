const express = require('express');
const lwfMasterController = require('../controllers/lwfMaster.controller');
const router = express.Router();

router.post('/v1/addLwfMaster', lwfMasterController.postAddLwfMaster);
router.post('/v1/getAllLwfMaster', lwfMasterController.getAllLwfMaster);
router.post('/v1/getLwfMasterByID', lwfMasterController.getLwfMasterById);
router.post('/v1/updateLwfMaster', lwfMasterController.postUpdateLwfMaster);
router.post('/v1/deleteLwfMaster', lwfMasterController.postDeleteLwfMaster);

// ----------------------- don't call/delete this api -------------------------

router.post('/v1/addState_SalaryMaster', lwfMasterController.addState_SalaryMaster);


module.exports = router;
