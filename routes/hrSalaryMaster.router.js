const express = require('express');
const hrSalaryMaster = require('../controllers/hrSalaryMaster.controller.js');
const router = express.Router();
const { uploadHrSalary } = require('../middleware/uploadFile.js');
const { fromPermissionName } = require('../constants/formPermission.js');
const { formOperation } = require('../utils/commonVars.js');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission.js');

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNSALARYSTRUCTURE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNINCREMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryMaster.postAddHRSalaryMaster,
);
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNSALARYSTRUCTURE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ASSIGNINCREMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryMaster.getSalayMasterByUser,
);
router.post(
  '/v1/deleteSalaryMaster',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEESALARYSTRUCTURE,
        operation: formOperation.DELETE,
      },
      {
        permissionName: fromPermissionName.ASSIGNINCREMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryMaster.deleteSalaryMaster,
);
router.get(
  '/v1/',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNSALARYSTRUCTURE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYPAY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryMaster.getAllSalaryStructureByUserId,
);
router.post(
  '/v1/getSalaryStructure',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryMaster.getOldNewSalaryStructure,
);

// ---------------- NET Pay , Gross and CTC calculation ---------------------

router.post(
  '/v1/ctcCalculation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryMaster.ctcCalculation,
);
router.put(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNSALARYSTRUCTURE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryMaster.updateHRSalaryMaster,
);

router.post(
  '/v1/getUserSalaryMasterBymonth',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PROJECTWISESALARYDISTRIBUTION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  hrSalaryMaster.getUserSalaryMasterBymonth,
);

router.get(
  '/v1/get-last-salary-structure/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNINCREMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryMaster.getLastSalaryStructure,
);

// -------------------------- upload salary structure --------------------------------------

router.post(
  '/v1/uploadSalaryStructureDemoExcel',
  hrSalaryMaster.uploadSalaryStructureDemoExcel,
);

// V2 - Enhanced validation with user lookup, gender, formula-based AmountIn
// POST with from='submit' for validation, POST without from for pagination
router.post(
  '/v1/validateSalaryStructure',
  uploadHrSalary,
  hrSalaryMaster.validateSalaryStructure,
);
router.post('/v1/revalidateSingleRow', hrSalaryMaster.revalidateSingleRow);
router.post('/v1/deleteExcelRow', hrSalaryMaster.deleteExcelRow);
router.post('/v1/saveSalaryStructure', hrSalaryMaster.saveSalaryStructure);
router.post(
  '/v1/getAllPendingRequestByUserID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNSALARYSTRUCTURE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryMaster.getAllPendingRequestByUserID,
);

module.exports = router;
