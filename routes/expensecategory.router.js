const express = require('express');
const expensecategoryController = require('../controllers/expensecategory.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSECATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  expensecategoryController.postAddexpenseCategory,
);

router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSECATEGORY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expensecategoryController.getexpenseCategoryId,
);

router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSECATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  expensecategoryController.postUpdateexpenseCategory,
);

router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSECATEGORY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  expensecategoryController.postDeleteexpenseCategoryById,
);

router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSECATEGORY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  expensecategoryController.poststatuschange,
);

router.post(
  '/v1/getExpenseCategorycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSECATEGORY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expensecategoryController.getexpenseCategorycompanyid,
);

router.get(
  '/v1/getExpenseCategoryByCompanyId/:id',
  expensecategoryController.getexpenseCategoryByCompanyId,
);

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSECATEGORY,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSECATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  expensecategoryController.validateUploadExcel,
);

router.post(
  '/v1/reValidateExpenceCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSECATEGORY,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSECATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  expensecategoryController.reValidateExpenceCategory,
);

router.post(
  '/v1/addValidateExpenseCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSECATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  expensecategoryController.addValidateExpenseCategory,
);

module.exports = router;
