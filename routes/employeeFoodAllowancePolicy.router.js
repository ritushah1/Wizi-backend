const express = require('express');
const employeeFoodAllowancePolicyController = require('../controllers/employeeFoodAllowancePolicy.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.get(
  '/v1/getEmployeeFoodAllowancePolicyByCompany',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKFOODALLOWANCEPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeFoodAllowancePolicyController.getEmployeeFoodAllowancePolicyByCompany,
);

router.get(
  '/v1/getByUserId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeFoodAllowancePolicyController.getByUserId,
); // get data

router.post(
  '/v1/addbulk',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.BULKFOODALLOWANCEPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeFoodAllowancePolicyController.addBulk,
); // add bulk data

router.get(
  '/v1/getDataBycompanyId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.BULKFOODALLOWANCEPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeFoodAllowancePolicyController.getDataBycompanyId,
); // get data

module.exports = router;
