const express = require('express');
const router = express.Router();
const workFromHomeAuthorizationController = require('../controllers/workFromHomeAuthorization.controller');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const { permissionAccess } = require('../middleware/permissionAccess');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKFROMHOMEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  workFromHomeAuthorizationController.list,
);
router.get(
  '/v1/view/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKFROMHOMEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  workFromHomeAuthorizationController.view,
);
router.post(
  '/v1/statusUpdate',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKFROMHOMEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  workFromHomeAuthorizationController.statusUpdate,
);
router.post(
  '/v1/workFromHomeCancelationList',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKFROMHOMECANCELLATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  checkRolePermission,
  permissionAccess,
  workFromHomeAuthorizationController.workFromHomeCancelationList,
);
router.post(
  '/v1/cancelWorkFromHomeTransaction',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKFROMHOMECANCELLATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  workFromHomeAuthorizationController.cancelWorkFromHomeTransaction,
);
router.post(
  '/v1/getAllWorkFromHomeAuthAdmin',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINWORKFROMHOMEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  workFromHomeAuthorizationController.getAllWorkFromHomeAuthAdmin,
);
router.post(
  '/v1/acceptRejectWorkFromHomeAdmin',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINWORKFROMHOMEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  workFromHomeAuthorizationController.acceptRejectWorkFromHomeAdmin,
);

router.post(
  '/v2/view',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WORKFROMHOMEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  workFromHomeAuthorizationController.viewV2,
);

module.exports = router;
