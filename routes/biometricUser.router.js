const express = require('express');
const biometricUserController = require('../controllers/biometricUser.controller');
const router = express.Router();
const { uploadBiometricUser } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadBiometricUser,
  biometricUserController.postadd,
);
router.post(
  '/v1/get',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  biometricUserController.listdata,
);
router.post(
  '/v1/syncBiometricUser',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  biometricUserController.syncBiometricUser,
);
router.post(
  '/v1/deletebiometric',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.DELETE,
      },
    ],
  }),
  biometricUserController.deletebiometric,
);
router.post(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadBiometricUser,
  biometricUserController.changeRecord,
);

router.post(
  '/v1/getById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.EDIT,
      },
    ],
  }),
  biometricUserController.getById,
);
router.post(
  '/v1/transferUser',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  biometricUserController.transferUser,
);

router.post(
  '/v1/syncBiometricUserWithPhoto',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  biometricUserController.syncBiometricUserWithPhoto,
);
router.post(
  '/v1/syncBiometricUserWithFinger',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  biometricUserController.syncBiometricUserWithFinger,
);
module.exports = router;
