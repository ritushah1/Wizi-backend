const express = require('express');
const zohoSalarySyncController = require('../controllers/zohoSalarySync.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/sync-salary',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SYNCSALARY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  zohoSalarySyncController.syncSalary,
);

router.post(
  '/v1/list-sync-salary',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SYNCSALARY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  zohoSalarySyncController.listSyncSalary,
);

module.exports = router;
