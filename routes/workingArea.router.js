const express = require('express');
const workingAreaController = require('../controllers/workingArea.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGAREA,
        operation: formOperation.CREATE,
      },
    ],
  }),
  workingAreaController.addData,
);
router.put(
  '/v1/updateData/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGAREA,
        operation: formOperation.EDIT,
      },
    ],
  }),
  workingAreaController.updateData,
);
router.get(
  '/v1/listData',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGAREA,
        operation: formOperation.VIEW,
      },
    ],
  }),
  workingAreaController.listData,
);
router.delete(
  '/v1/deleteData/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGAREA,
        operation: formOperation.DELETE,
      },
    ],
  }),
  workingAreaController.deleteData,
);
router.get(
  '/v1/getById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGAREA,
        operation: formOperation.VIEW,
      },
    ],
  }),
  workingAreaController.getById,
);
router.post(
  '/v1/uploadExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGAREA,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  workingAreaController.uploadExcel,
);
router.get(
  '/v1/demoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGAREA,
        operation: formOperation.CREATE,
      },
    ],
  }),
  workingAreaController.demoExcel,
);
router.post(
  '/v1/updateStatus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGAREA,
        operation: formOperation.EDIT,
      },
    ],
  }),
  workingAreaController.updateStatus,
);
router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGAREA,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.WORKINGAREA,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  workingAreaController.validateUploadExcel,
);

router.post(
  '/v1/reValidateWorkingArea',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGAREA,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.WORKINGAREA,
        operation: formOperation.CREATE,
      },
    ],
  }),
  workingAreaController.reValidateWorkingArea,
);

router.post(
  '/v1/addValidateWorkingArea',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKINGAREA,
        operation: formOperation.CREATE,
      },
    ],
  }),
  workingAreaController.addValidateWorkingArea,
);

module.exports = router;
