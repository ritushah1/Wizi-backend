const express = require('express');
const EmployeeDiscrepancyLetter = require('../controllers/employeeDiscrepancyLetter.controller');
const { fromPermissionName } = require('../constants/formPermission');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addEmployeeDiscrepancyLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNDISCREPANCYLETTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  EmployeeDiscrepancyLetter.addEmployeeDiscrepancyLetter,
);
router.post(
  '/v1/getEmployeeDiscrepancyLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNDISCREPANCYLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmployeeDiscrepancyLetter.getEmployeeDiscrepancyLetter,
);
router.post(
  '/v1/updateEmployeeDiscrepancyLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNDISCREPANCYLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  EmployeeDiscrepancyLetter.updateEmployeeDiscrepancyLetter,
);
router.post(
  '/v1/deleteEmployeeDiscrepancyLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNDISCREPANCYLETTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  EmployeeDiscrepancyLetter.deleteEmployeeDiscrepancyLetter,
);
router.post(
  '/v1/sendEmailDiscrepancyLetter',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNDISCREPANCYLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmployeeDiscrepancyLetter.sendEmailDiscrepancyLetter,
);

module.exports = router;
