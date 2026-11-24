const express = require('express');
const router = express.Router();
const controller = require('../controllers/googleSheetExportSetting.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOOGLESHEETEXPORTSETTING,
        operation: formOperation.EDIT,
      },
    ],
  }),
  controller.postAddGoogleSheetExportSetting,
);
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOOGLESHEETEXPORTSETTING,
        operation: formOperation.EDIT,
      },
    ],
  }),
  controller.postDeleteGoogleSheetExportSettingById,
);
router.post(
  '/v1/getalldatabyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOOGLESHEETEXPORTSETTING,
        operation: formOperation.VIEW,
      },
    ],
  }),
  controller.getAllGoogleSheetExportSettingDataById,
);

module.exports = router;
