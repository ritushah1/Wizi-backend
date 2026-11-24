const express = require('express');
const EmployeeJoiningDetailsHistoryController = require('../controllers/employeeJoiningDetailsHistory.controller');
const { checkRoleOperationPermission } = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getEmployeeJoiningDetailsHistoryByUserMasterID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  EmployeeJoiningDetailsHistoryController.getEmployeeJoiningDetailsHistoryByUserMasterID,
);
module.exports = router;
