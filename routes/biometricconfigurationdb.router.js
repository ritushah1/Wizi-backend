const express = require('express');
const biometricController = require('../controllers/biometricconfigurationdb.controller');
const router = express.Router();

router.post(
  '/v1/tankhwapatraDatabase',
  biometricController.tankhwapatraDatabaseList
);
router.post(
  '/v1/tankhwapatraGetTable',
  biometricController.tankhwapatraTableList
);
router.post(
  '/v1/tankhwapatragetSerialNo',
  biometricController.tankhwapatraSerialNoList
);
router.post(
  '/v1/tankhwapatraCreateTable',
  biometricController.tankhwapatraCreateBiometricTable
);
// router.post('/v1/tptesting', biometricController.tankhwapatraTableList1);

module.exports = router;
