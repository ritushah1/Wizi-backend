const express = require('express');
const auditLogsController = require('../controllers/auditLogs.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getAll',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUDITLOG,
        operation: formOperation.VIEW,
      },
    ],
  }),
  auditLogsController.getAuditLogs,
);
router.get(
  '/v1/getTableNames',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.AUDITLOG,
        operation: formOperation.VIEW,
      },
    ],
  }),
  auditLogsController.getUniqueTableNames,
);

module.exports = router;
