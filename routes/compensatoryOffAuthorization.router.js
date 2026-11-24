const express = require('express');
const compensatoryOffAuthorizationController = require('../controllers/compensatoryOffAuthorization.controller');
const { permissionAccess } = require('../middleware/permissionAccess');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/viewcompensatoryOffAuthorizationByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPENSATORYOFFAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  compensatoryOffAuthorizationController.viewcompensatoryOffAuthorizationByUserId,
);

router.post(
  '/compensatoryOffAuthorizationacceptreject',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPENSATORYOFFAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  compensatoryOffAuthorizationController.compensatoryOffAuthorizationacceptreject,
);

router.get(
  '/getcompensatoryOffAuthorizationRequestById/:id',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPENSATORYOFFAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  compensatoryOffAuthorizationController.getcompensatoryOffAuthorizationRequestById,
);

// Add Coff Auth as set of Leave Auth
router.post(
  '/v1/addCoffAuth',
  permissionAccess,
  compensatoryOffAuthorizationController.addCoffAuth,
);

router.post(
  '/v1/getAdminCoffAuthorizationRequests',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINCOMPENSATORYOFFAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  compensatoryOffAuthorizationController.getAdminCoffAuthorizationRequests,
);

router.post(
  '/v1/coffApproveRejectAdmin',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINCOMPENSATORYOFFAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  compensatoryOffAuthorizationController.coffApproveRejectAdmin,
);

module.exports = router;
