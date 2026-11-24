const express = require('express');
const mannualAttendanceController = require('../controllers/mannualAttendance.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/uploadboimetricexcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRICATTENDANCE,
        operation: formOperation.DOWNLOAD,
      },
    ],
  }),
  uploadImportExcelFile,
  mannualAttendanceController.uploadboimetricexcel,
);

router.post(
  '/v2/getAlldata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMDAILYATTENDANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.DAILYATTENDANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MANUALATTENDANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  mannualAttendanceController.getAlldata_V2,
);

router.post(
  '/v2/addmanualAttendance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANUALATTENDANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.DAILYATTENDANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MANUALATTENDANCE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  mannualAttendanceController.addmanualAttendance_V2,
);

module.exports = router;
