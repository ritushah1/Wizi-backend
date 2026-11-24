const express = require('express');
const employeeBonusPolicyController = require('../controllers/employeeBonusPolicy.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.BULKADDEMPLOYEEBONUSPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeBonusPolicyController.addData,
); // save data
router.get(
  '/v1/getByUserId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeBonusPolicyController.getByUserId,
);
router.post(
  '/v1/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeBonusPolicyController.delete,
);
router.post(
  '/v1/getAllEmployeeBonusPolicy',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKADDEMPLOYEEBONUSPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeBonusPolicyController.getAllEmployeeBonusPolicy,
);

module.exports = router;
