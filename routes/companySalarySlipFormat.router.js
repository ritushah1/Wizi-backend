const express = require('express');
const router = express.Router();
const CompanySalarySlipFormat = require('../controllers/companySalarySlipFormat.controller');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');

router.post(
  '/v1/addUpdateCompanySalarySlipFormat',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANYSALARYSLIPFORMAT,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.COMPANYSALARYSLIPFORMAT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  CompanySalarySlipFormat.addUpdateCompanySalarySlipFormat,
);

router.post(
  '/v1/getAllCompanySalarySlipFormat',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANYSALARYSLIPFORMAT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  CompanySalarySlipFormat.getAllCompanySalarySlipFormat,
);

module.exports = router;
