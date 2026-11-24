const express = require('express');
const EmployeePaymentcontroller = require('../controllers/employeePayment.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/listEmployeeBonusPayment',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEBONUSPAYMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmployeePaymentcontroller.listEmployeeBonusPayment,
);

router.post(
  '/v1/getEmployeeBonusByUserId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEBONUSPAYMENT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  EmployeePaymentcontroller.getEmployeeBonusByUserId,
);

router.post(
  '/v1/payEmployeeBonus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEBONUSPAYMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  EmployeePaymentcontroller.payEmployeeBonus,
);

module.exports = router;
