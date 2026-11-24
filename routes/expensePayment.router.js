const express = require('express');
const expensePaymentController = require('../controllers/expensePayment.controller');
const router = express.Router();
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/expensePendingPaymentData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPAYMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expensePaymentController.expensePendingPaymentData,
);
router.post(
  '/v1/addExpensePayment',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPAYMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  expensePaymentController.addExpensePayment,
);

router.post(
  '/v1/listExpensePayments',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPAYMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADVANCEEXPENSEPAYMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expensePaymentController.listExpensePayments,
);

router.post(
  '/v1/synerpIntegration/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADVANCEEXPENSEPAYMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expensePaymentController.synerpIntegration,
);

router.post(
  '/v1/syncerpExpensePayment',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPAYMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expensePaymentController.syncerpExpensePayment,
);
router.post(
  '/v1/exportDemoImportGroupExpense',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPAYMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  expensePaymentController.exportDemoImportGroupExpense,
);
router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPAYMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSEPAYMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  expensePaymentController.validateUploadExcel,
);
router.post(
  '/v1/reValidateUploadExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPAYMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSEPAYMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  expensePaymentController.reValidateUploadExcel,
);
router.post(
  '/v1/addValidateExpensePayment',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPAYMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  expensePaymentController.addValidateExpensePayment,
);

module.exports = router;
