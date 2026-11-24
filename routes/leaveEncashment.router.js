const express = require('express');
const leaveEncashmentController = require('../controllers/leaveEncashment.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/cancelLapseLeaveEncashment',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEENCASHMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  leaveEncashmentController.cancelLapseLeaveEncashment,
);

router.post(
  '/v1/getAllLeaveEncashment',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEENCASHMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  leaveEncashmentController.getAllLeaveEncashment,
);

router.post(
  '/v1/getLeaveEncashmentByUser',
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
  leaveEncashmentController.getLeaveEncashmentByUser,
);
module.exports = router;
