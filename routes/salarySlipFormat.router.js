const express = require('express');
const router = express.Router();
const SalarySlipFormat = require('../controllers/salarySlipFormat.controller');
const { uploadSalarySlipFormat } = require('../middleware/uploadFile');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addSalarySlipFormat',
  uploadSalarySlipFormat,
  SalarySlipFormat.postAddSalarySlipFormat,
);

router.post(
  '/v1/updateSalarySlipFormat',
  uploadSalarySlipFormat,
  SalarySlipFormat.updateSalarySlipFormat,
);

router.post(
  '/v1/getAllSalarySlipFormat',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANYSALARYSLIPFORMAT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  SalarySlipFormat.getAllSalarySlipFormat,
);
router.post(
  '/v1/getSalarySlipFormatByID',
  SalarySlipFormat.getSalarySlipFormatByID,
);

module.exports = router;
