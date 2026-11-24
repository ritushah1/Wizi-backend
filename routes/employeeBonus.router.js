const express = require('express');
const employeeBonusController = require('../controllers/employeeBonus.controller');
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
        permissionName: fromPermissionName.EMPLOYEEBONUS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeBonusController.addData,
); // save data
router.post(
  '/v1/listEmployeeBonus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEBONUS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeBonusController.listEmployeeBonus,
);
router.get(
  '/v1/cancelEmployeeBonus/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEBONUS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.PAYSLIPGENERATOR,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeBonusController.cancelEmployeeBonus,
);

router.post(
  '/v1/generateDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEBONUS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeBonusController.generateDemoExcel,
);

router.post(
  '/v1/validateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEBONUS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadImportExcelFile,
  employeeBonusController.validateUploadExcel,
);

router.post(
  '/v1/revalidateEmployeeBonus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEBONUS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeBonusController.revalidateEmployeeBonus,
);

router.post(
  '/v1/addValidateEmployeeBonus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEBONUS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeBonusController.addValidateEmployeeBonus,
);

router.post(
  '/v1/getEmployeeBonusByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEBONUS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeBonusController.getEmployeeBonusByUserId,
);
module.exports = router;
