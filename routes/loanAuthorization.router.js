const express = require('express');
const loamnAuthorizationController = require('../controllers/loanAuthorization.controller');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const { permissionAccess } = require('../middleware/permissionAccess');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/viewLoanAuthorizationByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LOANAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  loamnAuthorizationController.viewLoanAuthorizationByUserId,
);

router.post(
  '/loanAuthorizationacceptreject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LOANAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  loamnAuthorizationController.loanAuthorizationacceptreject,
);

router.get(
  '/getLoanAuthorizationRequestById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINLOANAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEELOAN,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LOANAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  loamnAuthorizationController.getLoanAuthorizationRequestById,
);

router.post(
  '/v2/getLoanAuthorizationRequestById',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINLOANAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LOANMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEELOAN,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LOANAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  loamnAuthorizationController.getLoanAuthorizationRequestByIdV2,
);

router.post(
  '/getAllLoanAuthorizationAdmin',
  checkRolePermission,
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINLOANAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  loamnAuthorizationController.getAllLoanAuthorizationAdmin,
);

router.post(
  '/acceptRejectLoanAuth',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINLOANAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  loamnAuthorizationController.acceptRejectLoanAuthAdmin,
);

module.exports = router;
