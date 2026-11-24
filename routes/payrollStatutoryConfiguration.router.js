const express = require('express');
const PayrollStatutoryConfigrationController = require('../controllers/payrollStatutoryConfiguration.controller');
const router = express.Router();

router.post(
  '/v1/saveDetails',
  PayrollStatutoryConfigrationController.saveDetails,
);

router.get(
  '/v1/getByCompanyId/:id',
  PayrollStatutoryConfigrationController.getByCompanyId,
);

module.exports = router;