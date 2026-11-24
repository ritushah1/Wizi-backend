const express = require('express');
const officeExpenseController = require('../controllers/officeExpense.controller');
const router = express.Router();
const { uploadOfficeExpense } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addOfficeExpense',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadOfficeExpense,
  officeExpenseController.addOfficeExpense,
);
router.post(
  '/v1/getAllOfficeExpense',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  officeExpenseController.getAllOfficeExpense,
);
router.post(
  '/v1/getOfficeExpenseByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.OFFICEEXPENSE,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.OFFICEEXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  officeExpenseController.getOfficeExpenseByID,
);

router.post(
  '/v2/getOfficeExpenseByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.OFFICEEXPENSE,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.OFFICEEXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  officeExpenseController.getOfficeExpenseByIDV2,
);

router.post(
  '/v1/updateOfficeExpense',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEREQUEST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadOfficeExpense,
  officeExpenseController.updateOfficeExpense,
);
router.delete(
  '/v1/deleteOfficeExpense/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  officeExpenseController.deleteOfficeExpense,
);
router.post(
  '/v1/exportOfficeExpense',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  officeExpenseController.exportOfficeExpense,
);
router.get(
  '/v1/getOfficeExpenseTransactionByID/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  officeExpenseController.getTransactionByID,
);
router.post(
  '/v1/reapply',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  uploadOfficeExpense,
  officeExpenseController.reapplyOfficeExpense,
);

router.post(
  '/v1/listMonthlyOfficeExpenseVoucher',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MONTHLYOFFICEEXPENSEVOUCHER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  officeExpenseController.listMonthlyOfficeExpenseVoucher,
);
router.post(
  '/v1/monthlyOfficeExpenseVoucher',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  officeExpenseController.monthlyOfficeExpenseVoucher,
);

router.post(
  '/v2/deleteOfficeExpense',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  officeExpenseController.deleteOfficeExpenseV2,
);

module.exports = router;
