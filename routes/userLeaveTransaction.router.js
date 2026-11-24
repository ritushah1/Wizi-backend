const express = require('express');
const UserLeaveTransaction = require('../controllers/userLeaveTransaction.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getApprovedLeaveTransactionByUser',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.MANAGELEAVEBALANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MANAGETEAMLEAVEBALANCE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserLeaveTransaction.getApprovedLeaveTransactionByUser,
);

router.post(
  '/v1/pendingLeaveByUser',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MANAGELEAVEBALANCE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MANAGETEAMLEAVEBALANCE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserLeaveTransaction.pendingLeaveByUser,
);
module.exports = router;
