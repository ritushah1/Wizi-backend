const express = require('express');
const EmployeeSkillCategoryController = require('../controllers/employeeSkillCategory.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.BULKEMPLOYEESKILLCATEGORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  EmployeeSkillCategoryController.addData,
);
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
  EmployeeSkillCategoryController.getByUserId,
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
  EmployeeSkillCategoryController.delete,
);
router.post(
  '/v1/getAllUsersSkillCategory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKEMPLOYEESKILLCATEGORY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmployeeSkillCategoryController.getAllUsersSkillCategory,
);

module.exports = router;
