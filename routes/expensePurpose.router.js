const express = require('express');
const ExpensePurposeController = require('../controllers/expensePurpose.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addExpensePurpose',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPURPOSE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ExpensePurposeController.postAddExpensePurpose,
);
router.post(
  '/v1/editExpensePurpose',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPURPOSE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ExpensePurposeController.postUpdateExpensePurpose,
);
router.post(
  '/v1/getAllExpensePurpose',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPURPOSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ExpensePurposeController.getAllExpensePurpose,
);
router.post(
  '/v1/getExpensePurposeById',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPURPOSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ExpensePurposeController.getExpensePurposeById,
);
router.post(
  '/v1/deleteExpensePurpose',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPURPOSE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  ExpensePurposeController.postDeleteExpensePurposeById,
);
router.post(
  '/v1/changeStatusExpensePurpose',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPURPOSE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ExpensePurposeController.poststatuschange,
);
router.post(
  '/v1/validateExpensePurpose',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPURPOSE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSEPURPOSE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  ExpensePurposeController.validateUploadExcel,
);
router.post(
  '/v1/revalidateExcelForExpensePurpose',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPURPOSE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSEPURPOSE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ExpensePurposeController.reValidateExpensePurpose,
);
router.post(
  '/v1/addValidateExcelForExpensePurpose',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPURPOSE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ExpensePurposeController.addValidateExpensePurpose,
);
router.post(
  '/v1/generateDemoExcelForExpensePurpose',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPURPOSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ExpensePurposeController.generateDemoExcelForExpensePurpose,
);
router.post(
  '/v1/getAllActiveExpensePurpose',
  ExpensePurposeController.getAllActiveExpensePurpose,
);

module.exports = router;
