const express = require('express');
const employeeShortLeavePolicy = require('../controllers/employeeShortLeavePolicy.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.BULKSHORTLEAVEPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeShortLeavePolicy.addData,
);
router.get(
  '/v1/getEmpShortLeavePolicyByUserId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.BULKSHORTLEAVEPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeShortLeavePolicy.getEmpLeavePolicyByUserId,
);

router.post(
  '/v1/getEmpShortLeavePolicyByCompany',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKSHORTLEAVEPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeShortLeavePolicy.getEmpShortLeavePolicyByCompany,
);

router.post(
  '/v1/listUserShortLeaveForCancelShortLeave',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHORTLEAVECANCELLATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeShortLeavePolicy.listUserShortLeaveForCancelShortLeave,
);

router.post(
  '/v1/cancelShortLeave',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHORTLEAVECANCELLATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeShortLeavePolicy.cancelShortLeave,
);

module.exports = router;
