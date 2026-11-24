const express = require('express');
const mehtaServiceController = require('../controllers/mehtaService.contoller');
const router = express.Router();

router.post(
  '/v1/getEmployeeServiceList',
  mehtaServiceController.getEmployeeServiceList,
);
router.post(
  '/v1/getEmployeeServiceDataByServiceNumber',
  mehtaServiceController.getEmployeeServiceDataByServiceNumber,
);
router.post(
  '/v1/getEmployeeServiceDataByUserDateWise',
  mehtaServiceController.getEmployeeServiceDataByUserDateWise,
);
module.exports = router;
