const express = require('express');
const UserLapseLeaveController = require('../controllers/userLeaveLapse.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getLeaveLapseByUser',
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
  UserLapseLeaveController.getLeaveLapseByUser,
);

module.exports = router;
