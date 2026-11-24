const express = require('express');
const manPowerRequisitionAuthorizationController = require('../controllers/manPowerRequisitionAuthorization.controller');
const { permissionAccess } = require('../middleware/permissionAccess');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/manPowerRequisitionAuthorizationAcceptReject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANPOWERREQUISITIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  manPowerRequisitionAuthorizationController.manPowerRequisitionAuthorizationAcceptReject,
);

router.post(
  '/v1/listManPowerRequisitionAuthorization',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANPOWERREQUISITIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  manPowerRequisitionAuthorizationController.listManPowerRequisitionAuthorization,
);

router.get(
  '/v1/manPowerRequisitionAuthorizationDataByID/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANPOWERREQUISITIONAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  manPowerRequisitionAuthorizationController.manPowerRequisitionAuthorizationDataByID,
);

module.exports = router;
