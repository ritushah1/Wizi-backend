const express = require('express');
const resignTaskAssign = require('../controllers/resignTaskAssign.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getAllresigntaskAssign',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATIONTASK,
        operation: formOperation.VIEW,
      },
    ],
  }),
  resignTaskAssign.getAllresignTaskAssign,
);
router.post(
  '/v1/postUpdateresignTaskAssign',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RESIGNATIONTASK,
        operation: formOperation.VIEW,
      },
    ],
  }),
  resignTaskAssign.postUpdateresignTaskAssign,
);

module.exports = router;
