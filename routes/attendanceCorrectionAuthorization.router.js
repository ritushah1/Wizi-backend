const express = require('express');
const attendanceCorrectionAuthorizationController = require('../controllers/attendanceCorrectionAuthorization.controller');
const { permissionAccess } = require('../middleware/permissionAccess');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/attendancecorrectionauthorizationrequest',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendanceCorrectionAuthorizationController.authorizationacceptrejectAttendanceCorrection,
);

router.post(
  '/listAttendaceAuthorization',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendanceCorrectionAuthorizationController.viewAuthorizationRequestByUserIdForAttendanceCorrection,
);

router.get(
  '/attendanceauthorizationdatabyid/:id',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendanceCorrectionAuthorizationController.getAuthorizationRequestById,
);

router.post(
  '/v2/attendanceauthorizationdatabyid',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendanceCorrectionAuthorizationController.getAuthorizationRequestByIdV2,
);

router.post(
  '/v1/getAllAttendanceAuthorizationRequestAdmin',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName:
          fromPermissionName.ADMINATTENDANCECORRECTIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendanceCorrectionAuthorizationController.getAllAttendanceAuthorizationRequestAdmin,
);

router.post(
  '/v1/approveRejectAdminAttendanceAuthorization',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName:
          fromPermissionName.ADMINATTENDANCECORRECTIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendanceCorrectionAuthorizationController.approveRejectAdminAttendanceAuthorization,
);
module.exports = router;
