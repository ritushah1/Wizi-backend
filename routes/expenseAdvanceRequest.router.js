const express = require('express');
const expenseAdvanceRequestController = require('../controllers/expenseAdvanceRequest.controller');
const { permissionAccess } = require('../middleware/permissionAccess');
const { checkRolePermission } = require('../middleware/checkRolePermission');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addExpenseAdvanceRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYEXPENSEADVANCEREQUEST,
        operation: formOperation.CREATE,
      },
    ],
  }),
  expenseAdvanceRequestController.addExpenseAdvanceRequest,
);

router.post(
  '/v1/getAllMyExpenseAdvanceRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYEXPENSEADVANCEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseAdvanceRequestController.getAllMyExpenseAdvanceRequest,
);

router.post(
  '/v1/updateExpenseAdvanceRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYEXPENSEADVANCEREQUEST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  expenseAdvanceRequestController.updateExpenseAdvanceRequest,
);
router.get(
  '/v1/getExpenseAdvanceRequestByID/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEADVANCEREQUESTAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYEXPENSEADVANCEREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LISTEXPENSEADVANCEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseAdvanceRequestController.getExpenseAdvanceRequestByID,
);

router.post(
  '/v2/getExpenseAdvanceRequestByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEADVANCEREQUESTAUTHORIZATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYEXPENSEADVANCEREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LISTEXPENSEADVANCEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseAdvanceRequestController.getExpenseAdvanceRequestByIDV2,
);

router.delete(
  '/v1/deleteExpenseAdvanceRequest/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYEXPENSEADVANCEREQUEST,
        operation: formOperation.DELETE,
      },
    ],
  }),
  expenseAdvanceRequestController.deleteExpenseAdvanceRequest,
);

router.post(
  '/v1/cancelExpenseAdvanceRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LISTEXPENSEADVANCEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseAdvanceRequestController.cancelExpenseAdvanceRequest,
);

router.post(
  '/v1/getAllExpenseAdvanceRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LISTEXPENSEADVANCEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  checkRolePermission,
  permissionAccess,
  expenseAdvanceRequestController.getAllExpenseAdvanceRequest,
);

router.post(
  '/v1/markAsPaidExpenseAdvanceRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LISTEXPENSEADVANCEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseAdvanceRequestController.markAsPaidExpenseAdvanceRequest,
);

router.post(
  '/v1/listErpExpenseAdvanceSync',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPEXPENSEADVANCESYNC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseAdvanceRequestController.listErpExpenseAdvanceSync,
);
router.post(
  '/v1/syncExpenseAdvance',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPEXPENSEADVANCESYNC,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ERPEXPENSEADVANCESYNC,
        operation: formOperation.SYNC,
      },
    ],
  }),
  expenseAdvanceRequestController.syncExpenseAdvance,
);

router.post(
  '/v2/deleteExpenseAdvanceRequest',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYEXPENSEADVANCEREQUEST,
        operation: formOperation.DELETE,
      },
    ],
  }),
  expenseAdvanceRequestController.deleteExpenseAdvanceRequestV2,
);

module.exports = router;
