const express = require('express');
const experiansepriceController = require('../controllers/expenseprice.controller');
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
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.CREATE,
      },
    ],
  }),
  experiansepriceController.postAddExpensePriceRule,
); // save data

router.get(
  '/v1/getbyheadid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  experiansepriceController.getExpensePriceRuleByHeadId,
);

router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.EDIT,
      },
    ],
  }),
  experiansepriceController.postUpdateExpensePriceRule,
);

router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSEHEAD,
        operation: formOperation.DELETE,
      },
    ],
  }),
  experiansepriceController.postDeleteExpensePriceRuleById,
);

router.get(
  '/v1/getExpensePriceRuleByHeadid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EXPENSE,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEEXPENSEREIMBURSEMENT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  experiansepriceController.getExpensePriceRuleByHeadid,
);

module.exports = router;
