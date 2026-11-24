const express = require('express');
const empPayrollStatutoryController = require('../controllers/empPayrollStatutory.controller');
const { uploadEmpPayrollStatutory } = require('../middleware/uploadFile.js');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission.js');
const { fromPermissionName } = require('../constants/formPermission.js');
const { formOperation } = require('../utils/commonVars.js');
const router = express.Router();

router.post(
  '/v1/listData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEPAYROLLSTATUTORY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  empPayrollStatutoryController.listData,
); // list data
router.get(
  '/v1/getById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEPAYROLLSTATUTORY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  empPayrollStatutoryController.getById,
); // get data
router.delete(
  '/v1/deleteById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEPAYROLLSTATUTORY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  empPayrollStatutoryController.deleteById,
); // delete data

// -------------------------- upload Employee Payroll Statutory --------------------------------------

router.post(
  '/v1/payrollStatutoryDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEPAYROLLSTATUTORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  empPayrollStatutoryController.payrollStatutoryDemoExcel,
);
// POST with from='submit' for validation, POST without from for pagination
router.post(
  '/v1/validatePayrollStatutory',
  uploadEmpPayrollStatutory,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEPAYROLLSTATUTORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  empPayrollStatutoryController.validatePayrollStatutory,
);
router.post(
  '/v1/revalidateSingleRow',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEPAYROLLSTATUTORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  empPayrollStatutoryController.revalidateSingleRow,
);
router.post(
  '/v1/deleteExcelRow',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEPAYROLLSTATUTORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  empPayrollStatutoryController.deleteExcelRow,
);
router.post(
  '/v1/savePayrollStatutory',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEPAYROLLSTATUTORY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  empPayrollStatutoryController.savePayrollStatutory,
);

module.exports = router;
