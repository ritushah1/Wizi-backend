const express = require('express');
const attendanceRegisterController = require('../controllers/attendanceRegister.contoller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/attendanceReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCEREGISTERTWO,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECONSOLIDATEDREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendanceRegisterController.attendanceReport,
);
module.exports = router;
