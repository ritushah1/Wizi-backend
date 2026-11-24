const express = require('express');
const attendanceCorrectionRequestController = require('../controllers/attendanceCorrectionRequest.controller');
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
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.CREATE,
      },
    ],
  }),
  attendanceCorrectionRequestController.addData,
);
router.put(
  '/v1/update/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  attendanceCorrectionRequestController.updateData,
);
router.delete(
  '/v1/delete/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.DELETE,
      },
    ],
  }),
  attendanceCorrectionRequestController.deleteData,
);
router.get(
  '/v1/getById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName:
          fromPermissionName.ADMINATTENDANCECORRECTIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.EDIT,
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
  attendanceCorrectionRequestController.getById,
);
router.post(
  '/v1/getByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendanceCorrectionRequestController.getByUserId,
);

router.post(
  '/v2/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.DELETE,
      },
    ],
  }),
  attendanceCorrectionRequestController.deleteDataV2,
);

module.exports = router;
