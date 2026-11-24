const express = require('express');
const authorizationRequestController = require('../controllers/gatePassAuthorization.controller');
const { permissionAccess } = require('../middleware/permissionAccess');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/gatepassauthorizationrequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEGATEPASSAUTHORIZATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.viewAuthorizationRequestByUserIdForGatePass,
);

router.post(
  '/authorizationacceptreject',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEGATEPASSAUTHORIZATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.authorizationacceptrejectGatePass,
);

router.get(
  '/gatepassrequestdatabyid/:id',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEGATEPASSAUTHORIZATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.getAuthorizationRequestById,
);

router.post(
  '/v2/gatepassrequestdatabyid',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEGATEPASSAUTHORIZATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.getAuthorizationRequestByIdV2,
);

module.exports = router;
