const express = require('express');
const officeExpenseHeadController = require('../controllers/officeExpenseHead.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/postAddOfficeExpenseHead',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEHEAD,
        operation: formOperation.CREATE,
      },
    ],
  }),
  officeExpenseHeadController.postAddOfficeExpenseHead,
);
router.post(
  '/v1/getAllOfficeExpenseHead',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEHEAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  officeExpenseHeadController.getAllOfficeExpenseHead,
);
router.put(
  '/v1/updateOfficeExpenseHead',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEHEAD,
        operation: formOperation.EDIT,
      },
    ],
  }),
  officeExpenseHeadController.updateOfficeExpenseHead,
);
router.delete(
  '/v1/deleteOfficeExpenseHead/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEHEAD,
        operation: formOperation.DELETE,
      },
    ],
  }),
  officeExpenseHeadController.deleteOfficeExpenseHead,
);
router.get(
  '/v1/getOfficeExpenseHeadByID/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEHEAD,
        operation: formOperation.EDIT,
      },
    ],
  }),
  officeExpenseHeadController.getOfficeExpenseHeadByID,
);
router.post(
  '/v1/generateDemoExcelForOfficeExpenseHead',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEHEAD,
        operation: formOperation.CREATE,
      },
    ],
  }),
  officeExpenseHeadController.generateDemoExcelForOfficeExpenseHead,
);
router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEHEAD,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  officeExpenseHeadController.validateUploadExcel,
);
router.post(
  '/v1/revalidateOfficeExpensehead',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEHEAD,
        operation: formOperation.CREATE,
      },
    ],
  }),
  officeExpenseHeadController.revalidateOfficeExpensehead,
);
router.post(
  '/v1/addValidateOfficeExpensehead',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEHEAD,
        operation: formOperation.CREATE,
      },
    ],
  }),
  officeExpenseHeadController.addValidateOfficeExpensehead,
);
router.post(
  '/v1/postStatusChange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.OFFICEEXPENSEHEAD,
        operation: formOperation.EDIT,
      },
    ],
  }),
  officeExpenseHeadController.postStatusChange,
);

module.exports = router;
