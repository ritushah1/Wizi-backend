const express = require('express');
const SN_Code = require('../controllers/sn_code.controller');
const router = express.Router();
const { uploadImportExcelFile } = require('../middleware/uploadFile');
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
        permissionName: fromPermissionName.SNCODE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  SN_Code.addsn_code,
);
router.post(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SNCODE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  SN_Code.updatesn_code,
);
router.post(
  '/v1/statuschange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SNCODE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  SN_Code.updateStatus,
);
router.post(
  '/v1/getAll',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SNCODE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  SN_Code.getAllData,
);
router.get(
  '/v1/getById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SNCODE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  SN_Code.getById,
);
router.post(
  '/v1/uploadSNCodes',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SNCODE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  SN_Code.uploadSNCodes,
);

module.exports = router;
