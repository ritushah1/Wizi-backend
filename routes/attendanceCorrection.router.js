const express = require('express');
const attendanceCorrectionController = require('../controllers/attendanceCorrection.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.get(
  '/v1/getAlldata/',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName:
          fromPermissionName.ADMINATTENDANCECORRECTIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.DAILYATTENDANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TEAMDAILYATTENDANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendanceCorrectionController.getAlldata,
);

module.exports = router;
