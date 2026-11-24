const express = require('express');
const ManPowerRequisitionRequest = require('../controllers/manPowerRequisitionRequest.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addManPowerRequisitionRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANPOWERREQUISITION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ManPowerRequisitionRequest.postAddManPowerRequisitionRequest,
);

router.post(
  '/v1/getAllManPowerRequisitionRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANPOWERREQUISITION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.JOBPOSTING,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MANPOWERREQUISITION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ManPowerRequisitionRequest.getAllManPowerRequisitionRequest,
);

router.post(
  '/v1/getManPowerRequisitionRequestByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANPOWERREQUISITION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.JOBPOSTING,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ManPowerRequisitionRequest.getManPowerRequisitionRequestById,
);

router.post(
  '/v1/updateManPowerRequisitionRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANPOWERREQUISITION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ManPowerRequisitionRequest.postUpdateManPowerRequisitionRequest,
);

router.post(
  '/v1/deleteManPowerRequisitionRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANPOWERREQUISITION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  ManPowerRequisitionRequest.postDeleteManPowerRequisitionRequestById,
);

module.exports = router;
