const express = require('express');
const router = express.Router();
const twoFactorAuthenticationController = require('../controllers/twoFactorAuthentication.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/getQrCode',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  twoFactorAuthenticationController.getQrCode,
);
router.post(
  '/v1/checkSecretKey',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  twoFactorAuthenticationController.checkSecretKey,
);
router.post(
  '/v1/updateTwoFactorAuth',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  twoFactorAuthenticationController.updateTwoFactorAuth,
);

module.exports = router;
