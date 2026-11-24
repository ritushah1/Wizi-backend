const express = require('express');
const companyManagersController = require('../controllers/companyManagers.controller');
const router = express.Router();

router.post(
  '/v1/assignCompanyManager',
  companyManagersController.assignCompanyManager
);
router.post(
  '/v1/getAllCompanyManagers',
  companyManagersController.getAllCompanyManagers
);

router.post('/v1/updateRM_IN_HRM', companyManagersController.updateRM_IN_HRM);
router.post(
  '/v1/update_Old_HRM_TO_new_HRM',
  companyManagersController.update_Old_HRM_TO_new_HRM
);
module.exports = router;
