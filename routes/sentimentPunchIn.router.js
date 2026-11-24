const express = require('express');
const sentimentPunchInController = require('../controllers/sentimentPunchIn.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

const router = express.Router();
router.get(
  '/v1',
  verifyChildParent,
  sentimentPunchInController.listSentimentPunchIn,
);
router.post(
  '/v1',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYSENTIMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  sentimentPunchInController.createSentimentPunchIn,
);
router.get(
  '/v1/analysis',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SENTIMENTDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  sentimentPunchInController.sentimentPunchInsAnalysis,
);

router.post(
  '/v1/getdata',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYSENTIMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.SENTIMENTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  sentimentPunchInController.getSentimentPunchIn,
);
module.exports = router;
