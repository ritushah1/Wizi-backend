const express = require('express');
const SalaryBasedOnDaysController = require('../controllers/salaryBasedOnDays.controller');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GRADE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  SalaryBasedOnDaysController.add,
);
router.delete(
  '/v1/delete/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GRADE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  SalaryBasedOnDaysController.delete,
);
router.get(
  '/v1/getByGradeStructureId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GRADE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  SalaryBasedOnDaysController.getByGradeStructureId,
);

module.exports = router;
