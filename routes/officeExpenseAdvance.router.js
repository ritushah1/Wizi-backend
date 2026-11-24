const express = require('express');
const officeExpenseAdvanceController = require('../controllers/officeExpenseAdvance.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/creditDebitAdvance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEADVANCE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  officeExpenseAdvanceController.creditDebitAdvance,
);
router.post(
  '/v1/getAllOfficeExpenseAdvance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEADVANCE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  officeExpenseAdvanceController.getAllOfficeExpenseAdvance,
);

router.post(
  '/v1/officeExpensePendingPayment',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEPAYMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  officeExpenseAdvanceController.officeExpensePendingPayment,
);

router.post(
  '/v1/addOfficeExpensePayment',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEPAYMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  officeExpenseAdvanceController.addOfficeExpensePayment,
);

router.post(
  '/v1/listOfficeExpensePayments',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PAIDOFFICEEXPENSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  officeExpenseAdvanceController.listOfficeExpensePayments,
);
module.exports = router;
