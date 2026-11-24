const express = require('express');
const PaySlipGeneratorController = require('../controllers/paySlipGenerator.controller');
const { uploadImportExcelFile } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post('/v1/getDateRanges', PaySlipGeneratorController.getDateRanges);
router.post(
  '/v1/downloadDemoExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PAYSLIPGENERATOR,
        operation: formOperation.CREATE,
      },
    ],
  }),
  PaySlipGeneratorController.downloadDemoExcel,
);
router.post(
  '/v1/validateUploadExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PAYSLIPGENERATOR,
        operation: formOperation.CREATE,
      },
    ],
  }),
  uploadImportExcelFile,
  PaySlipGeneratorController.validateUploadExcel,
);
router.post(
  '/v1/revalidateExcel',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PAYSLIPGENERATOR,
        operation: formOperation.CREATE,
      },
    ],
  }),
  PaySlipGeneratorController.revalidateExcel,
);
router.post(
  '/v1/saveData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PAYSLIPGENERATOR,
        operation: formOperation.CREATE,
      },
    ],
  }),
  PaySlipGeneratorController.saveData,
);
router.post(
  '/v1/getPaySlipGeneratorData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PAYSLIPGENERATOR,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PaySlipGeneratorController.getPaySlipGeneratorData,
);
router.post(
  '/v1/generateSalarySlip',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PAYSLIPGENERATOR,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PaySlipGeneratorController.generateSalarySlip,
);
router.get(
  '/v1/getMyPaySlipData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYPAYSLIPPIH,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PaySlipGeneratorController.getMyPaySlipData,
);

module.exports = router;
