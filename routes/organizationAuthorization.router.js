const express = require('express');
const organizationAuthorizationController = require('../controllers/organizationAuthorization.controller');
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
        permissionName: fromPermissionName.ORGANIZATIONAUTHORIZATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  organizationAuthorizationController.addOrganizationAuthorization,
);
router.post(
  '/v1/getalldata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  organizationAuthorizationController.getAllOrganizationAuthorization,
);
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONAUTHORIZATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  organizationAuthorizationController.getOrganizationAuthorizationById,
);
router.put(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONAUTHORIZATION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  organizationAuthorizationController.updateOrganizationAuthorizationById,
);
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONAUTHORIZATION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  organizationAuthorizationController.deleteOrganizationAuthorization,
);
router.post(
  '/v1/getAuthorizedUserBranches',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  organizationAuthorizationController.getAuthorizedUserBranches,
);
router.post(
  '/v1/getAuthorizedUserSites',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ORGANIZATIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  organizationAuthorizationController.getAuthorizedUserSites,
);
module.exports = router;
