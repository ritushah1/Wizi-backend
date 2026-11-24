const express = require('express');
const expenseheadController = require('../controllers/expensehead.controller');
const router = express.Router();
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.CREATE,
      },
    ],
  }),
  expenseheadController.postAddexpenseHead,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.EDIT,
      },
    ],
  }),
  expenseheadController.getexpenseHeadId,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.EDIT,
      },
    ],
  }),
  expenseheadController.postUpdateexpenseHead,
); //update companytype tax data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.DELETE,
      },
    ],
  }),
  expenseheadController.postDeleteexpenseHeadById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.EDIT,
      },
    ],
  }),
  expenseheadController.poststatuschange,
); //status by id
router.post(
  '/v1/getExpenseHeadcompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  expenseheadController.getexpenseHeadcompanyid,
); //get by id

router.get(
  '/v1/getactiveexpenseheadbycategoryid/:id',
  expenseheadController.getactiveexpenseheadbycategoryid,
);

router.post(
  '/v1/excel1',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.CREATE,
      },
    ],
  }),
  expenseheadController.excel1,
);
router.post(
  '/v1/uploadexcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  expenseheadController.uploadexcel,
); //upload excel

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  expenseheadController.validateUploadExcel,
);

router.post(
  '/v1/revalidateExpensehead',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.CREATE,
      },
    ],
  }),
  expenseheadController.revalidateExpensehead,
);

router.post(
  '/v1/addValidateExpensehead',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.CREATE,
      },
    ],
  }),
  expenseheadController.addValidateExpensehead,
);

router.post(
  '/v1/generateDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.CREATE,
      },
    ],
  }),
  expenseheadController.generateDemoExcel,
);
module.exports = router;
