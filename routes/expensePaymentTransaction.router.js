const express = require('express');
const ExpensePaymentTransactionController = require('../controllers/expensePaymentTransaction.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();
router.post(
  '/v1/getExpensePaymentTransByUserExpenseTranID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEPAYMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ExpensePaymentTransactionController.getExpensePaymentTransByUserExpenseTranID,
);

module.exports = router;
