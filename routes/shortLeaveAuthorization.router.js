const express = require('express');
const shortLeaveAuthorization = require('../controllers/shortLeaveAuthorization.controller');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const { permissionAccess } = require('../middleware/permissionAccess');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/listShortLeaveAuthRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHORTLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  shortLeaveAuthorization.listShortLeaveAuthRequest,
); // show data

router.get(
  '/v1/getAuthorizationRequestByReferenceId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHORTLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYSHORTLEAVEAPPLICATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINSHORTLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  shortLeaveAuthorization.getAuthorizationRequestByReferenceId,
);

router.post(
  '/v2/getAuthorizationRequestByReferenceId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHORTLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYSHORTLEAVEAPPLICATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINSHORTLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  shortLeaveAuthorization.getAuthorizationRequestByReferenceIdV2,
);

router.post(
  '/v1/shortLeaveAcceptReject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHORTLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  shortLeaveAuthorization.shortLeaveAcceptReject,
); // show data
router.post(
  '/v1/getAllShortLeaveAuthAdmin',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINSHORTLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  shortLeaveAuthorization.getAllShortLeaveAuthAdmin,
);
router.post(
  '/v1/acceptRejectUserShortLeaveRequestAdmin',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINSHORTLEAVEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  shortLeaveAuthorization.acceptRejectUserShortLeaveRequestAdmin,
);

module.exports = router;
