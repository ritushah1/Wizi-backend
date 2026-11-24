const express = require('express');
const assignCustomerToEmployeeController = require('../controllers/assignCustomerToEmployee.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getCustomersByUser',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNCUSTOMERTOEMPLOYEE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  assignCustomerToEmployeeController.getCustomersByUser,
);
router.post(
  '/v1/assignUnassignCustomerToEmployee',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNCUSTOMERTOEMPLOYEE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  assignCustomerToEmployeeController.assignUnassignCustomerToEmployee,
);

module.exports = router;
