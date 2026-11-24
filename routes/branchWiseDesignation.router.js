const express = require('express');
const router = express.Router();
const branchWiseDesignationController = require('../controllers/branchWiseDesignation.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.get(
  '/v1',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BRANCHWISENUMBEROFPOSITION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  branchWiseDesignationController.listBranchWiseDesignation,
);
router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BRANCHWISENUMBEROFPOSITION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  branchWiseDesignationController.postAddBranchWiseDesignation,
);
router.get(
  '/v1/edit/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BRANCHWISENUMBEROFPOSITION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.BRANCHWISENUMBEROFPOSITION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  branchWiseDesignationController.getBranchWiseDesignation,
);
router.put(
  '/v1/update/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BRANCHWISENUMBEROFPOSITION,
        operation: formOperation.EDIT,
      },
    ],
  }),
  branchWiseDesignationController.updateBranchWiseDesignation,
);
router.delete(
  '/v1/delete/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BRANCHWISENUMBEROFPOSITION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  branchWiseDesignationController.deleteBranchWiseDesignation,
);
router.get(
  '/v1/branchWiseDesignationHierarchy/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.STRUCTURE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  branchWiseDesignationController.branchWiseDesignationHierarchy,
);

module.exports = router;
