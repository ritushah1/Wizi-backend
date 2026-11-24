const express = require('express');
const salaryIncrementAuthorizationController = require('../controllers/salaryIncrementAuthorization.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const { permissionAccess } = require('../middleware/permissionAccess');
const router = express.Router();

router.post(
  '/v1/getSalaryIncrementAuthorizationRequestById',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYINCREMENTAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  salaryIncrementAuthorizationController.getSalaryIncrementAuthorizationRequestById,
);
router.post(
  '/v1/listSalaryIncrementAuthorization',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYINCREMENTAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  salaryIncrementAuthorizationController.listSalaryIncrementAuthorization,
);
router.post(
  '/v1/salaryIncrementAuthorizationacceptreject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYINCREMENTAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  salaryIncrementAuthorizationController.salaryIncrementAuthorizationacceptreject,
);
router.post(
  '/v1/getAllSalaryIncrementAuthorizationAdmin',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINSALARYINCREMENTAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  checkRolePermission,
  permissionAccess,
  salaryIncrementAuthorizationController.getAllSalaryIncrementAuthorizationAdmin,
);
router.post(
  '/v1/acceptRejectSalaryIncrementAuthAdmin',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINSALARYINCREMENTAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  salaryIncrementAuthorizationController.acceptRejectSalaryIncrementAuthAdmin,
);

module.exports = router;
