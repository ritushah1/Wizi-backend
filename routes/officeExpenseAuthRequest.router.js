const express = require('express');
const officeExpenseAuthRequestController = require('../controllers/officeExpenseAuthRequest.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getAllOfficeExpenseRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  officeExpenseAuthRequestController.getAllOfficeExpenseRequest,
);
router.post(
  '/v1/acceptRejectOfficeExpenses',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  officeExpenseAuthRequestController.acceptRejectOfficeExpenses,
);

module.exports = router;
