const express = require('express');
const labourServiceChargeController = require('../controllers/labourServiceCharge.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

// Create labour service charge
router.post(
  '/v1/addLabourServiceCharge',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName:
          fromPermissionName.LABOURSERVICECHARGE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  labourServiceChargeController.addLabourServiceCharge,
);

// Get labour service charge by ID
router.get(
  '/v1/getLabourServiceChargeById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName:
          fromPermissionName.LABOURSERVICECHARGE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  labourServiceChargeController.getLabourServiceChargeById,
);

// Get all labour service charges
router.post(
  '/v1/getLabourServiceCharges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName:
          fromPermissionName.LABOURSERVICECHARGE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  labourServiceChargeController.getLabourServiceCharges,
);

// Update labour service charge
router.post(
  '/v1/updateLabourServiceCharge',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName:
          fromPermissionName.LABOURSERVICECHARGE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  labourServiceChargeController.updateLabourServiceCharge,
);

// Delete labour service charge
router.post(
  '/v1/deleteLabourServiceCharge',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName:
          fromPermissionName.LABOURSERVICECHARGE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  labourServiceChargeController.deleteLabourServiceCharge,
);

// Change labour service charge status
router.post(
  '/v1/changeLabourServiceChargeStatus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName:
          fromPermissionName.LABOURSERVICECHARGE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  labourServiceChargeController.changeLabourServiceChargeStatus,
);

module.exports = router;
