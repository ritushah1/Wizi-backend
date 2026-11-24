const express = require('express');
const expenseController = require('../controllers/userExpense.controller');
const router = express.Router();
const { uploadUserExpense } = require('../middleware/uploadFile');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { generateMulterThumbnails } = require('../middleware/uploadThumbnails');

router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseController.getUserExpenseById,
); //get by id
router.post(
  '/v1/getbyversion',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEEXPENSEREIMBURSEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseController.getUserExpenseByVersion,
);
router.post(
  '/v1/syncexpense',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPSYNC,
        operation: formOperation.SYNC,
      },
    ],
  }),
  expenseController.syncexpense,
);
router.post(
  '/v1/deleteUserExpenseTransaction',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseController.deleteUserExpenseTransaction,
);

router.get(
  '/v2/userExpenseAuthDetails/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEADVANCEREQUESTAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseController.ExpenseAuthorizationDetails_new,
);
router.get('/v1/erpExpenseAutoSync', expenseController.erpExpenseAutoSync);
router.post(
  '/v2/expensesyncdata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPSYNC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseController.expenseSyncData_V2,
);
router.post(
  '/v1/findExpesneWithNegativeJvID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPSYNC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseController.findExpesneWithNegativeJvID,
);
router.post(
  '/v1/findExpesneWithUnassignedERPID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ERPSYNC,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseController.findExpesneWithUnassignedERPID,
);

router.post(
  '/v2/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEEXPENSEREIMBURSEMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadUserExpense,
  generateMulterThumbnails,
  expenseController.postAddUserExpense_V2,
); // save data

router.post(
  '/v2/userExpenseNew',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseController.userExpenseNew_V2,
);

router.post(
  '/v2/reapply',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadUserExpense,
  generateMulterThumbnails,
  expenseController.reapply_V2,
);

router.post(
  '/v3/userExpenseNew',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseController.userExpenseNew_V3,
);
router.post(
  '/v1/userExpenseByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEEXPENSEREIMBURSEMENT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseController.userExpenseByID,
);

router.post(
  '/v1/updatebyUserExpenseID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadUserExpense,
  generateMulterThumbnails,
  expenseController.updatebyUserExpenseID,
);
router.post(
  '/v1/deleteUserExpenseByExpenseID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEEXPENSEREIMBURSEMENT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  expenseController.deleteUserExpenseByExpenseID,
);
router.post(
  '/v1/exportMyExpense',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseController.exportMyExpense,
);

router.post(
  '/v1/getExistingDailyFoodExpense',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseController.getExistingDailyFoodExpense,
);

router.post(
  '/v1/employeeExpenseReimbursement',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEEXPENSEREIMBURSEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseController.employeeExpenseReimbursement,
);

router.post(
  '/v1/geneGenerateAllMyExpenseVoucherZip',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseController.geneGenerateAllMyExpenseVoucherZip,
);

router.post(
  '/v1/employeeSideExpenseLedger',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYEXPENSELEDGER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseController.employeeSideExpenseLedger,
);

router.post(
  '/v2/deleteUserExpenseByExpenseID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEEXPENSEREIMBURSEMENT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  expenseController.deleteUserExpenseByExpenseIDV2,
);

module.exports = router;
