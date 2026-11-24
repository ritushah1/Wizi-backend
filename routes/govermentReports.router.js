const express = require('express');
const router = express.Router();
const GovermentReportsController = require('../controllers/govermentReports.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/form_A_Employee_Register',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORMAEMPLOYEEREGISTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  GovermentReportsController.form_A_Employee_Register,
);
router.post(
  '/v1/formCLoanRegister',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORMCLOANREGISTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  GovermentReportsController.formCLoanRegister,
);
router.post(
  '/v1/formDPaymentOfBonus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORMDPAYMENTOFBONUS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  GovermentReportsController.formDPaymentOfBonus,
);

module.exports = router;
