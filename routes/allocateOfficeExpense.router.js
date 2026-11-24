const express = require('express');
const allocateOfficeExpenseController = require('../controllers/allocateOfficeExpense.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addOfficeExpenseAllocationRights',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ALLOCATEOFFICEEXPENSERIGHTS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  allocateOfficeExpenseController.addOfficeExpenseAllocationRights,
);
router.post(
  '/v1/getAllOfficeExpenseAllocationRights',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ALLOCATEOFFICEEXPENSERIGHTS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  allocateOfficeExpenseController.getAllOfficeExpenseAllocationRights,
);
router.put(
  '/v1/updateOfficeExpenseAllocationRights',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ALLOCATEOFFICEEXPENSERIGHTS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  allocateOfficeExpenseController.updateOfficeExpenseAllocationRights,
);
router.delete(
  '/v1/deleteOfficeExpenseAllocationRights/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ALLOCATEOFFICEEXPENSERIGHTS,
        operation: formOperation.DELETE,
      },
    ],
  }),
  allocateOfficeExpenseController.deleteOfficeExpenseAllocationRights,
);
router.get(
  '/v1/getOfficeExpenseAllocationRightsByID/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ALLOCATEOFFICEEXPENSERIGHTS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  allocateOfficeExpenseController.getOfficeExpenseAllocationRightsByID,
);
router.post(
  '/v1/getAllAssignedBranchByUser',
  allocateOfficeExpenseController.getAllAssignedBranchByUser,
);
router.post(
  '/v1/getAllAssignedSiteByUser',
  allocateOfficeExpenseController.getAllAssignedSiteByUser,
);
router.post(
  '/v1/getAssignedUsersByBranchAndSite',
  allocateOfficeExpenseController.getAssignedUsersByBranchAndSite,
);

module.exports = router;
