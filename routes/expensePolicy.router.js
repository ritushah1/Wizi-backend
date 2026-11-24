const express = require('express');
const expensePolicyController = require('../controllers/expensePolicy.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

// Create expense policy
router.post(
  '/v1/addExpensePolicy',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  expensePolicyController.addExpensePolicy,
);

// Get expense policy by ID
router.get(
  '/v1/getExpensePolicyById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expensePolicyController.getExpensePolicyById,
);

// Get all expense policies
router.post(
  '/v1/getExpensePolicies',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expensePolicyController.getExpensePolicies,
);

// Update expense policy
router.post(
  '/v1/updateExpensePolicy',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  expensePolicyController.updateExpensePolicy,
);

// Delete expense policy
router.post(
  '/v1/deleteExpensePolicy',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPOLICY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  expensePolicyController.deleteExpensePolicy,
);

// Change expense policy status
router.post(
  '/v1/changeExpensePolicyStatus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  expensePolicyController.changeExpensePolicyStatus,
);

// Get available expense types for user
router.post(
  '/v1/getAvailableExpenseTypes',
  expensePolicyController.getAvailableExpenseTypes,
);

// Get expense policy details for validation
router.post(
  '/v1/getExpensePolicyForValidation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  expensePolicyController.getExpensePolicyForValidation,
);

// Get user's active branch and state
router.post(
  '/v1/getUserActiveBranch',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expensePolicyController.getUserActiveBranch,
);

module.exports = router;
