const express = require('express');
const PayrollStatutoryReportController = require('../controllers/payrollStatutoryReport.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/payrollReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PAYROLLSTATUTORYREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PayrollStatutoryReportController.payrollReport,
);

module.exports = router;
