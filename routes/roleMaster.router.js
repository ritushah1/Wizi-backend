const express = require('express');
const RoleMasterController = require('../controllers/roleMaster.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/postAddRoleMaster',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ROLEMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  RoleMasterController.postAddRoleMaster,
);
router.get(
  '/v1/getRoleMasterById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ROLEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ROLEMASTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ROLEMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.USERPERMISSION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  RoleMasterController.getRoleMasterById,
);
router.post(
  '/v1/postUpdateRoleMaster',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ROLEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  RoleMasterController.postUpdateRoleMaster,
);
router.post(
  '/v1/listRoleMaster',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ROLEMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  RoleMasterController.listRoleMaster,
);
router.post(
  '/v1/AssignRoleMaster',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERPERMISSION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  RoleMasterController.AssignRoleMaster,
);
router.post(
  '/v1/listUserPermission',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERPERMISSION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  RoleMasterController.listUserPermission,
);

module.exports = router;
