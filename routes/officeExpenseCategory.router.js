const express = require('express');
const officeExpenseCategoryController = require('../controllers/officeExpenseCategory.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/postAddOfficeExpenseCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSECATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  officeExpenseCategoryController.postAddOfficeExpenseCategory,
);
router.post(
  '/v1/getAllOfficeExpenseCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSECATEGORY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  officeExpenseCategoryController.getAllOfficeExpenseCategory,
);
router.put(
  '/v1/updateOfficeExpenseCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSECATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  officeExpenseCategoryController.updateOfficeExpenseCategory,
);
router.delete(
  '/v1/deleteOfficeExpenseCategory/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSECATEGORY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  officeExpenseCategoryController.deleteOfficeExpenseCategory,
);
router.get(
  '/v1/getOfficeExpenseCategoryByID/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSECATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  officeExpenseCategoryController.getOfficeExpenseCategoryByID,
);
router.get(
  '/v1/generateDemoExcelForOfficeExpenseCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSECATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  officeExpenseCategoryController.generateDemoExcelForOfficeExpenseCategory,
);
router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSECATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  officeExpenseCategoryController.validateUploadExcel,
);
router.post(
  '/v1/reValidateOfficeExpenceCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSECATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  officeExpenseCategoryController.reValidateOfficeExpenceCategory,
);
router.post(
  '/v1/addValidateOfficeExpenseCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSECATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  officeExpenseCategoryController.addValidateOfficeExpenseCategory,
);
router.post(
  '/v1/postStatusChange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSECATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  officeExpenseCategoryController.postStatusChange,
);

module.exports = router;
