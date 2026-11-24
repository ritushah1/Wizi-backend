const express = require('express');
const biometricIntegration = require('../controllers/biometricIntegration.controller');
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
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.EDIT,
      },
    ],
  }),
  biometricIntegration.postAddBiometricIntegration,
); // save data
router.post('/v1/getAll', biometricIntegration.getAllBiometricIntegration); // get all data
router.get('/v1/getbyid/:id', biometricIntegration.getBiometricIntegrationById); // get by ID
router.post(
  '/v1/statusChange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.EDIT,
      },
    ],
  }),
  biometricIntegration.poststatuschange,
); // status change
router.post(
  '/v1/delete',
  biometricIntegration.postDeletebiometricIntegrationById,
); // delete by id
router.post(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.EDIT,
      },
    ],
  }),
  biometricIntegration.postUpdateBiometricIntegration,
); // update by id
router.post(
  '/v1/getbycomp',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  biometricIntegration.getBiometricIntegrationByCompId,
); // get by comp id
router.post(
  '/v1/getBiometricList',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  biometricIntegration.getBiometricList,
);

router.post(
  '/v1/deleteBycompanyMasterID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.DELETE,
      },
    ],
  }),
  biometricIntegration.postDeletebiometricIntegrationBycompanyMasterID,
);

router.post(
  '/v1/checkBiometricStatus',
  biometricIntegration.checkBiometricStatus,
);

router.post(
  '/v1/checkunassignedEmployeeCodeData',
  biometricIntegration.checkunassignedEmployeeCodeData,
);

router.post(
  '/v1/checkBiometricUserCountAndSoftwareUserCount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  biometricIntegration.checkBiometricUserCountAndSoftwareUserCount,
);

router.post(
  '/v1/getBiometricMachineTime',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BIOMETRIC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  biometricIntegration.getBiometricMachineTime,
);
module.exports = router;
