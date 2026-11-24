const express = require('express');
const ReviewFormController = require('../controllers/reviewForm.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { reqObjectType, formOperation } = require('../utils/commonVars');
const { validateSchema } = require('../middleware/validateSchema');
const {
  createReviewForm,
  listReviewForm,
  updateReviewForm,
} = require('../validators/reviewForm');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');

const router = express.Router();
router.post(
  '/v1',
  validateSchema(createReviewForm, reqObjectType.BODY),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.REVIEWFORM,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ReviewFormController.bulkCreateReviewForm,
);
router.put(
  '/v1/:id',
  validateSchema(updateReviewForm),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.REVIEWFORM,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ReviewFormController.bulkUpdateReviewForm,
);
router.get(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.REVIEWFORM,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ReviewFormController.getReviewFormDetails,
);
router.get(
  '/v1',
  validateSchema(listReviewForm, reqObjectType.QUERY),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.REVIEWFORM,
        operation: formOperation.VIEW,
      },
    ],
  }),
  ReviewFormController.listReviewForm,
);
router.delete(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.REVIEWFORM,
        operation: formOperation.DELETE,
      },
    ],
  }),
  ReviewFormController.deleteReviewForm,
);

module.exports = router;
