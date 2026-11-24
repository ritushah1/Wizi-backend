const express = require('express');
const hrSalaryTransaction = require('../controllers/hrSalaryTransaction.controller');
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
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryTransaction.GenrateSalary,
);

router.post(
  '/v1/getUserWiseSalarySlip',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYSLIP,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryTransaction.getUserWiseSalarySlip,
);

router.post(
  '/v2/getUserWiseSalarySlip',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYSLIP,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryTransaction.getUserWiseSalarySlipV2,
);

router.post(
  '/v1/deleteAllsalary',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.DELETE,
      },
    ],
  }),
  hrSalaryTransaction.deleteAllsalary,
);

router.post(
  '/v1/issueSalarySlip',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FULLANDFINALSETTLEMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryTransaction.issueSalarySlip,
);

router.get(
  '/v1/getVariableDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNPENALTYEMP,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEINCENTIVE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryTransaction.getVariableDemoExcel,
);

router.post(
  '/v1/uploadVariablePayheadExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEINCENTIVE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNPENALTYEMP,
        operation: formOperation.VIEW,
      },
    ],
  }),
  uploadImportExcelFile,
  hrSalaryTransaction.uploadVariablePayheadExcel,
);

router.post(
  '/v1/sendSalarySlipviamail',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMAILSALARYSLIP,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryTransaction.sendSalarySlipviamail,
);

router.post(
  '/v1/getAllSalarySlip',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.DOWNLOADSALARYSLIPINBULK,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryTransaction.getAllSalarySlip,
);

router.post(
  '/v2/ctcmasterreport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CTCREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryTransaction.ctcmasterreportNew,
);

// -----------------------Paid Salary API ------------------------
router.post(
  '/v1/paidSalary',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCECALCULATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  hrSalaryTransaction.paidSalary,
);

// ------------------- Internal APIs: Do NOT call or delete -----------------------------

router.post(
  '/v1/add_CTC_Gross_Net_In_CompanyandGrade',
  hrSalaryTransaction.add_CTC_Gross_Net_In_CompanyandGrade,
);
router.post(
  '/v1/add_CTC_Gross_Net_In_structure',
  hrSalaryTransaction.add_CTC_Gross_Net_In_structure,
);
router.post(
  '/v1/add_CTC_Gross_Net_In_salary',
  hrSalaryTransaction.add_CTC_Gross_Net_In_salary,
);

// ------------------ Default Payhead setup APIs -----------------

router.post(
  '/v1/add_defaultPayhead_In_Company',
  hrSalaryTransaction.add_defaultPayhead_In_Company,
);

router.post('/v1/set_EDLIlimit', hrSalaryTransaction.set_EDLIlimit);

router.post('/v1/addLCEGPenaltyData', hrSalaryTransaction.addLCEGPenaltyData);

// ---------------------- Internal APIs: Do NOT call or delete --------------------------

router.post(
  '/v1/getSalaryComputedEmployees',
  hrSalaryTransaction.getSalaryComputedEmployees,
);
router.put(
  '/v1/updatePfEsicPtDate',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PFESICPTPAIDDATE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  hrSalaryTransaction.updatePfEsicPtDate,
);
router.post(
  '/v1/holdUnholdSalary',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HOLDSALARY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  hrSalaryTransaction.holdUnholdSalary,
);

module.exports = router;
