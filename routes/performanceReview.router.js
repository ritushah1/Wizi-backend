const express = require('express');
const PerformanceReviewController = require('../controllers/performanceReview.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { reqObjectType, formOperation } = require('../utils/commonVars');
const { validateSchema } = require('../middleware/validateSchema');
const {
  createPerformanceReview,
  listPerformanceReview,
  updatePerformanceReview,
} = require('../validators/performanceReview');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');

const router = express.Router();
router.post(
  '/v1',
  validateSchema(createPerformanceReview, reqObjectType.BODY),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PERFORMANCEREVIEW,
        operation: formOperation.CREATE,
      },
    ],
  }),
  PerformanceReviewController.createPerformanceReview,
);
router.put(
  '/v1/:id',
  validateSchema(updatePerformanceReview, reqObjectType.BODY),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PERFORMANCEREVIEW,
        operation: formOperation.EDIT,
      },
    ],
  }),
  PerformanceReviewController.updatePerformanceReview,
);
router.get(
  '/v1',
  validateSchema(listPerformanceReview, reqObjectType.QUERY),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SETPERFORMANCEREVIEW,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.SETPERFORMANCEREVIEW,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.SETPERFORMANCEREVIEW,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.PERFORMANCEREVIEW,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.PERFORMANCEREVIEWREPORT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.REVIEWREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PerformanceReviewController.listPerformanceReview,
);
router.get(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PERFORMANCEREVIEW,
        operation: formOperation.EDIT,
      },
    ],
  }),
  PerformanceReviewController.getPerformanceReviewDetails,
);
router.delete(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PERFORMANCEREVIEW,
        operation: formOperation.DELETE,
      },
    ],
  }),
  PerformanceReviewController.deletePerformanceReview,
);
module.exports = router;
