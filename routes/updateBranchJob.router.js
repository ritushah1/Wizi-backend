const express = require('express');
const UpdateBranchJobController = require('../controllers/updateBranchJob.controller');
const router = express.Router();
const { permissionAccess } = require('../middleware/permissionAccess');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/ExportDemojobTitle',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  checkRolePermission,
  permissionAccess,
  UpdateBranchJobController.ExportDemojobTitle_V2,
);

router.post(
  '/v1/validatBranchJobTitle',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  permissionAccess,
  uploadImportExcelFile,
  UpdateBranchJobController.validatBranchJobTitle,
);

router.post(
  '/v1/addValidateBranchJob',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  UpdateBranchJobController.addValidateBranchJob,
);
module.exports = router;
