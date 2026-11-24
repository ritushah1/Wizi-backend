const express = require('express');
const empLeavePolicyController = require('../controllers/empLeavePolicy.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const router = express.Router();

router.post(
  '/v1/addData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKLEAVEPOLICY,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  empLeavePolicyController.addData,
);
router.get(
  '/v1/getEmpLeavePolicyByUserId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LEAVEAPPLICATION,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  empLeavePolicyController.getEmpLeavePolicyByUserId,
);
router.get(
  '/v1/getEmpLeavePolicyByCompany',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKLEAVEPOLICY,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.BULKLEAVEPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  verifyChildParent,
  empLeavePolicyController.getEmpLeavePolicyByCompany,
);

module.exports = router;
