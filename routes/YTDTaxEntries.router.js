const express = require('express');
const YTDTaxEntriesController = require('../controllers/YTDTaxEntries.controller');
const router = express.Router();
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/downloadDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.YTDTAXABLEAMOUNTANDTAXENTRY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  YTDTaxEntriesController.downloadDemoExcel,
);
router.post(
  '/v1/validateUploadExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.YTDTAXABLEAMOUNTANDTAXENTRY,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.YTDTAXABLEAMOUNTANDTAXENTRY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  YTDTaxEntriesController.validateUploadExcel,
);
router.post(
  '/v1/revalidateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.YTDTAXABLEAMOUNTANDTAXENTRY,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.YTDTAXABLEAMOUNTANDTAXENTRY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  YTDTaxEntriesController.revalidateExcel,
);
router.post(
  '/v1/saveData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.YTDTAXABLEAMOUNTANDTAXENTRY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  YTDTaxEntriesController.saveData,
);
router.post('/v1/listData', YTDTaxEntriesController.listData);

module.exports = router;
