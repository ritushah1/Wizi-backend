const express = require('express');
const previousSalaryController = require('../controllers/previousSalary.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.get(
  '/v1/getDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PREVIOUSSALARY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  previousSalaryController.getDemoExcel,
); // save data

router.post(
  '/v1/uploadExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PREVIOUSSALARY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  previousSalaryController.uploadExcel,
);

router.post(
  '/v1/getPreviousSalaryData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PREVIOUSSALARY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  previousSalaryController.getPreviousSalaryData,
);

router.post(
  '/v1/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PREVIOUSSALARY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  previousSalaryController.delete,
);

module.exports = router;
