const express = require('express');
const AuthorizationDetailsController = require('../controllers/authorizationDetails.controller');
const { permissionAccess } = require('../middleware/permissionAccess');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const { fromPermissionName } = require('../constants/formPermission');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/add',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTHORIZATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  AuthorizationDetailsController.postAddAuthorizationDetails,
); // save data
router.post(
  '/v1/getalldata',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  AuthorizationDetailsController.getAuthorizationDetails,
); // all data
router.post(
  '/v1/deletebyid',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTHORIZATION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  AuthorizationDetailsController.postDeleteAuthorizationDetailsById,
); // delete by id data

router.get(
  '/v1/getbyid/:id',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTHORIZATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  AuthorizationDetailsController.getAuthorizationDetailsById,
); // get by id data
router.post(
  '/v1/updatebyid',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTHORIZATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  AuthorizationDetailsController.postUpdateAuthorizationDetails,
); // get by id data

router.post(
  '/v1/nonauthorizeduser',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTHORIZATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  AuthorizationDetailsController.nonauthorizeduser,
);

router.post(
  '/v1/getAuthList',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  AuthorizationDetailsController.getAuthList,
);

router.post(
  '/v1/replaceAuth',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTHORIZATIONREPLACE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  AuthorizationDetailsController.replaceAuth,
);

router.post(
  '/v1/getAuthorizationDetailsByAuthorizedByUserMasterId',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  AuthorizationDetailsController.getAuthorizationDetailsByAuthorizedByUserMasterId,
);

router.post(
  '/v1/deleteAuth',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTHORIZATION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  AuthorizationDetailsController.deleteAuth,
);
router.post(
  '/v1/getAuthorizationedUserForDropDown',
  checkRolePermission,
  permissionAccess,
  AuthorizationDetailsController.getAuthorizationedUserForDropDown,
);
module.exports = router;
