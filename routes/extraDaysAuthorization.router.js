const express = require('express');
const extraDaysAuthorizationController = require('../controllers/extraDaysAuthorization.controller');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const { permissionAccess } = require('../middleware/permissionAccess');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.get(
  '/v1/getExtradaysAuthorizationRequestById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINEXTRADAYSAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXTRADAYSAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYEXTRADAYS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXTRADAYS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  extraDaysAuthorizationController.getExtradaysAuthorizationRequestById,
);
router.post(
  '/v1/viewExtraDayAuthorizationByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXTRADAYSAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  extraDaysAuthorizationController.viewExtraDayAuthorizationByUserId,
);
router.post(
  '/v1/extraDaysAuthorizationacceptreject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXTRADAYSAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  extraDaysAuthorizationController.extraDaysAuthorizationacceptreject,
);
router.post(
  '/v1/cancelExtraDayAuthorizationRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXTRADAYS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  checkRolePermission,
  permissionAccess,
  extraDaysAuthorizationController.cancelExtraDayAuthorizationRequest,
);
router.post(
  '/v1/getAllExtraDaysAuthorizationAdmin',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINEXTRADAYSAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  checkRolePermission,
  permissionAccess,
  extraDaysAuthorizationController.getAllExtraDaysAuthorizationAdmin,
);
router.post(
  '/v1/acceptRejectExtraDaysAuth',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINEXTRADAYSAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  extraDaysAuthorizationController.acceptRejectExtraDaysAuth,
);

module.exports = router;
