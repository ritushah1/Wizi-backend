const express = require('express');
const pipManagerReveiwerController = require('../controllers/pipManagerReveiwer.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/listPIPtoManager',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PERFORMANCEIMPROVEMENTPLANREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  pipManagerReveiwerController.listPIPtoManager,
);
router.post(
  '/v1/listPIPtoReviewer',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PERFORMANCEIMPROVEMENTPLANREVIEWER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  pipManagerReveiwerController.listPIPtoReviewer,
);
router.post(
  '/v1/acceptRejectPIP',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PERFORMANCEIMPROVEMENTPLANREQUEST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  pipManagerReveiwerController.acceptRejectPIP,
);
router.post(
  '/v1/givePIPReview',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PERFORMANCEIMPROVEMENTPLANREVIEWER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  pipManagerReveiwerController.givePIPReview,
);

module.exports = router;
