const express = require('express');
const gradeSalaryStructureController = require('../controllers/gradesalarystructure.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getsalarystructuredataBygradeId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ASSIGNINCREMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNSALARYSTRUCTURE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  gradeSalaryStructureController.getsalarystructuredataBygradeId,
);
module.exports = router;
