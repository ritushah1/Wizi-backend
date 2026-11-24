const express = require('express');
const preboardingController = require('../controllers/prebordingDocument.controller');
const { verifyToken } = require('../middleware/tokenverify');
const { uploadUserCreateDocumentFiles } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addDocs',
  uploadUserCreateDocumentFiles,
  preboardingController.addDocs,
);

router.get(
  '/v1/getByPreBordingId/:id',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.USERPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  preboardingController.getByPreBordingId,
);

module.exports = router;
