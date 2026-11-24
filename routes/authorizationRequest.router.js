const express = require('express');
const authorizationRequestController = require('../controllers/authorizationRequest.controller');
const { permissionAccess } = require('../middleware/permissionAccess');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/viewauthorizationrequestbyuseridforovertime',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OVERTIMEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.viewauthorizationrequestbyuseridforovertime, //mobile web
);
router.get(
  '/v1/getAuthorizationRequestByReferanceIdOvertime/:id',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OVERTIMEREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYOVERTIME,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.getAuthorizationRequestByReferanceIdOvertime, //mobile web
);
router.post(
  '/v1/authorizationacceptrejectovertime',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OVERTIMEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.authorizationacceptrejectovertime, //mobile web
);
router.post(
  '/v1/overtimeAuthoriedUser',
  permissionAccess,
  authorizationRequestController.overtimeAuthoriedUser, //mobile
);
router.post(
  '/v1/authorizationacceptrejectexpenseall',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.authorizationacceptrejectexpenseall, //mobile
);

router.post(
  '/v1/overtimedatashow',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.overtimedatashow, //web
);

router.post(
  '/v1/expensedatashow',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.expensedatashow, //web
);

router.get(
  '/v1/getExpenseAuthorizationRequestByAuthorizationRequestId/:id',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.getExpenseAuthorizationRequestByAuthorizationRequestId, //web
);

router.post(
  '/v1/getExpenseAuthByUserExpenseTrans',
  permissionAccess,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.getExpenseAuthByUserExpenseTrans, //mobile web
);
router.post(
  '/v3/getExpenseAuthByUser',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  authorizationRequestController.getExpenseAuthByUserExpense, //mobile web
);
module.exports = router;
