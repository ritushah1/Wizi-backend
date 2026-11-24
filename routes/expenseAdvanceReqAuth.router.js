const express = require('express');
const ExpenseAdvanceReqAuthController = require('../controllers/expenseAdvanceReqAuth.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();
router.post(
  '/v1/getExpenseAdvanceReqAuthByAuthUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEADVANCEREQUESTAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ExpenseAdvanceReqAuthController.getExpenseAdvanceReqAuthByAuthUserId,
);
router.post(
  '/v1/authorizeExpenseAdvanceRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEADVANCEREQUESTAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ExpenseAdvanceReqAuthController.authorizeExpenseAdvanceRequest,
);
module.exports = router;
