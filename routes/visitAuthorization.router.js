const express = require('express');
const router = express.Router();
const visitAuthorizationController = require('../controllers/visitAuthorization.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/viewVisitAuthorizationByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  visitAuthorizationController.viewVisitAuthorizationByUserId,
);
router.post(
  '/v1/visitAuthorizationacceptreject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.VISITAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  visitAuthorizationController.visitAuthorizationacceptreject,
);

module.exports = router;
