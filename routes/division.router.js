const express = require('express');
const divisionController = require('../controllers/division.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const router = express.Router();

router.post(
  '/v1/addData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DIVISION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  divisionController.addData,
);
router.put(
  '/v1/updateData/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DIVISION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  divisionController.updateData,
);
router.get(
  '/v1/listData',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DIVISION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  divisionController.listData,
);
router.delete(
  '/v1/deleteData/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DIVISION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  divisionController.deleteData,
);
router.get(
  '/v1/getById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DIVISION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  divisionController.getById,
);
router.post(
  '/v1/uploadExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DIVISION,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.DIVISION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadImportExcelFile,
  divisionController.uploadExcel,
);
router.get(
  '/v1/demoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DIVISION,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.DIVISION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  divisionController.demoExcel,
);
router.post(
  '/v1/updateStatus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DIVISION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  divisionController.updateStatus,
);
router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DIVISION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  divisionController.validateUploadExcel,
);

router.post(
  '/v1/reValidateDivision',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DIVISION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  divisionController.reValidateDivision,
);

router.post(
  '/v1/addValidateDivision',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DIVISION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  divisionController.addValidateDivision,
);
module.exports = router;
