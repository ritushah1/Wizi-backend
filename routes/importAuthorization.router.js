const express = require('express');
const ImportAuthorizationController = require('../controllers/importAuthorization.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();
router.get(
  '/v1/exportAuthorizationDetails',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTHORIZATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ImportAuthorizationController.exportAuthorizationDetails,
);

router.post(
  '/v1/validatUploadAuthorizationDetails',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTHORIZATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  ImportAuthorizationController.validatUploadAuthorizationDetails,
); // Validate Employee Authorization

router.post(
  '/v1/addUpdateAuthorization',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUTHORIZATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ImportAuthorizationController.addUpdateAuthorization,
);

module.exports = router;
