const express = require('express');
const EmployeeDeclarationController = require('../controllers/employeeDeclaration.controller');
const { uploadEmployeeDeclaration } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXDECLARATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadEmployeeDeclaration,
  EmployeeDeclarationController.postAddDeclarationRequest,
);
router.post(
  '/v1/delete',
  EmployeeDeclarationController.postDeleteDeclarationRequest,
);
router.post(
  '/v1/getAll',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.INCOMETAXDECLARATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmployeeDeclarationController.listDeclarationRequest,
);
router.post(
  '/v1/acceptReject',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.INCOMETAXDECLARATIONREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmployeeDeclarationController.acceptRejectDeclarationRequest,
);
router.get(
  '/v1/getByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXDECLARATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmployeeDeclarationController.getByUserId,
);
router.get(
  '/v1/getDeclarationDatailsByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXDECLARATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmployeeDeclarationController.getDeclarationDatailsByUserId,
);

router.get(
  '/v1/getYearlyIncometaxCalculationByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXDECLARATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmployeeDeclarationController.getYearlyIncometaxCalculationByUserId,
);
router.get(
  '/v1/getFinancialYear',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXDECLARATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmployeeDeclarationController.getFinancialYear,
);

router.get(
  '/v1/getMonthlyTaxDeductionsOfEmployees',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MONTHLYTAXDEDUCTIONSOFEMPLOYEES,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmployeeDeclarationController.getMonthlyTaxDeductionsOfEmployees,
);
router.post(
  '/v1/addManualInxomeTaxAmount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MONTHLYTAXDEDUCTIONSOFEMPLOYEES,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MONTHLYTAXDEDUCTIONSOFEMPLOYEES,
        operation: formOperation.EDIT,
      },
    ],
  }),
  EmployeeDeclarationController.addManualInxomeTaxAmount,
);
router.post(
  '/v1/deleteManualAmount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MONTHLYTAXDEDUCTIONSOFEMPLOYEES,
        operation: formOperation.DELETE,
      },
    ],
  }),
  EmployeeDeclarationController.deleteManualAmount,
);

router.get(
  '/v1/getIncomeTaxComputation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCOMETAXDECLARATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmployeeDeclarationController.getIncomeTaxComputation,
);

router.post(
  '/v1/getEmployeeDeclarationReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEDECLARATIONREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),

  EmployeeDeclarationController.getEmployeeDeclarationReport,
);

module.exports = router;
