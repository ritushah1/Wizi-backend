const express = require('express');
const biometricController = require('../controllers/biometric.controller');
const router = express.Router();
const { verifyToken } = require('../middleware/tokenverify');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');

router.post(
  '/v1/excelattendance',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXCELATTENDANCE,
        operation: formOperation.DOWNLOAD,
      },
    ],
  }),
  uploadImportExcelFile,
  biometricController.excelattendance,
); // save data

router.get('/v1/AaryavartData', biometricController.AaryavartData);
router.post(
  '/v1/pendingbiometricsync',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRICATTENDANCE,
        operation: formOperation.DOWNLOAD,
      },
    ],
  }),
  biometricController.pendingbiometricsync,
);

router.get(
  '/v1/asopalavCommissionAPI',
  biometricController.asopalavCommissionAPI,
);

router.post(
  '/v1/generateDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRICATTENDANCE,
        operation: formOperation.DOWNLOAD,
      },
    ],
  }),
  biometricController.generateDemoExcel,
);

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRICATTENDANCE,
        operation: formOperation.DOWNLOAD,
      },
    ],
  }),
  uploadImportExcelFile,
  biometricController.validateUploadExcel,
);

module.exports = router;
