const express = require('express');
const attendanceRegisterFormatController = require('../controllers/attendanceRegisterFormat.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addAttendanceRegisterFormat',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCEREGISTERONE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendanceRegisterFormatController.addAttendanceRegisterFormat,
); // save data
router.get(
  '/v1/getattendanceRegisterFormatByCompanyId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCEREGISTERONE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendanceRegisterFormatController.getattendanceRegisterFormatByCompanyId,
); // save data

module.exports = router;
