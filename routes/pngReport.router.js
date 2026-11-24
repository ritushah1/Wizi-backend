const express = require('express');
const PNGReportController = require('../controllers/pngReport.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/salaryRegister',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PNGSALARYREGISTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PNGReportController.salaryRegister,
); //PNG salary register
router.post(
  '/v1/yearlySalaryReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PNGYEARLYSALARYREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PNGReportController.yearlySalaryReport,
); //PNG salary register

module.exports = router;
