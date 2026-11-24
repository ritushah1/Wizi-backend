const express = require('express');
const AttendanceCorrectionReasonController = require('../controllers/attendanceCorrectionReason.controller');
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
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREASON,
        operation: formOperation.CREATE,
      },
    ],
  }),
  AttendanceCorrectionReasonController.addAttendanceCorrectionReason,
);
router.post(
  '/v1/list',
  AttendanceCorrectionReasonController.listAttendanceCorrectionReason,
);
router.get(
  '/v1/getByID/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREASON,
        operation: formOperation.EDIT,
      },
    ],
  }),
  AttendanceCorrectionReasonController.getAttendanceCorrectionReasonByID,
);
router.put(
  '/v1/edit',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREASON,
        operation: formOperation.EDIT,
      },
    ],
  }),
  AttendanceCorrectionReasonController.editAttendanceCorrectionReasonByID,
);
router.delete(
  '/v1/deleteById',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREASON,
        operation: formOperation.DELETE,
      },
    ],
  }),
  AttendanceCorrectionReasonController.deleteAttendanceCorrectionReasonByID,
);
module.exports = router;
