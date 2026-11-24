const express = require('express');
const router = express.Router();
const GoogleSheetIntegration = require('../controllers/googleSheetIntegration.controller');
const { verifyToken } = require('../middleware/tokenverify');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

// OAuth
router.get('/v1/auth-url', GoogleSheetIntegration.getAuthUrl);
router.get(
  '/v1/connect',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOOGLESHEETCONNECTION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  GoogleSheetIntegration.connect,
);
router.post(
  '/v1/disconnect',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOOGLESHEETCONNECTION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  verifyToken,
  GoogleSheetIntegration.disconnect,
);

// Sheet data operations are handled by visit controllers.

module.exports = router;
