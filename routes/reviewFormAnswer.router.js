const express = require('express');
const ReviewFormAnswerController = require('../controllers/reviewFormAnswer.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { reqObjectType, formOperation } = require('../utils/commonVars');
const { validateSchema } = require('../middleware/validateSchema');
const {
  bulkCreateUpdateReviewFormAnswers,
} = require('../validators/reviewFormAnswer');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');

const router = express.Router();
router.post(
  '/v1',
  validateSchema(bulkCreateUpdateReviewFormAnswers, reqObjectType.BODY),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.REVIEWREQUEST,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ReviewFormAnswerController.bulkInsertUpdateReviewFormAnswers,
);

module.exports = router;
