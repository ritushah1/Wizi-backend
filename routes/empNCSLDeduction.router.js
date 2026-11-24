/** @format */

const express = require('express');
const empNCSLDeductionController = require('../controllers/empNCSLDeduction.controller');
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
        permissionName: fromPermissionName.EMPLOYEENCSLDEDUCTION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  empNCSLDeductionController.add,
); // save data

router.post(
  '/v1/statusChange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEENCSLDEDUCTION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  empNCSLDeductionController.statusChange,
);

router.post(
  '/v1/listData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEENCSLDEDUCTION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  empNCSLDeductionController.listData,
);

router.post(
  '/v1/downloadDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEENCSLDEDUCTION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  empNCSLDeductionController.downloadDemoExcel,
);
router.post(
  '/v1/validateUploadExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEENCSLDEDUCTION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadImportExcelFile,
  empNCSLDeductionController.validateUploadExcel,
);
router.post(
  '/v1/revalidateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEENCSLDEDUCTION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  empNCSLDeductionController.revalidateExcel,
);
router.post(
  '/v1/saveData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEENCSLDEDUCTION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  empNCSLDeductionController.saveData,
);

// for Skip---

router.post(
  '/v1/addSkipData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEENCSLDEDUCTION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  empNCSLDeductionController.addSkipData,
);
router.post(
  '/v1/deleteSkipData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEENCSLDEDUCTION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  empNCSLDeductionController.deleteSkipData,
);
router.post(
  '/v1/listSkipData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEENCSLDEDUCTION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  empNCSLDeductionController.listSkipData,
);

module.exports = router;
