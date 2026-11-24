const express = require('express');
const router = express.Router();
const attendanceBonusPolicycontroller = require('../controllers/attendanceBonusPolicy.controller');
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
        permissionName: fromPermissionName.ATTENDANCEBONUSPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  attendanceBonusPolicycontroller.postAddAttendancePolicyBonus,
); // save data

router.get(
  '/v1/listdata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCEBONUSPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  attendanceBonusPolicycontroller.listdata,
);

router.put(
  '/v1/editdata/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCEBONUSPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  attendanceBonusPolicycontroller.editdata,
);

router.delete(
  '/v1/deletedata/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCEBONUSPOLICY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  attendanceBonusPolicycontroller.deletedata,
);

router.get(
  '/v1/getdata/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCEBONUSPOLICY,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ATTENDANCEBONUSPOLICY,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ME,
        operation: formOperation.SHOW_MENU,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  attendanceBonusPolicycontroller.getdata,
);

router.post(
  '/v1/poststatuschange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCEBONUSPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  attendanceBonusPolicycontroller.poststatuschange,
);

router.post(
  '/v1/getBranchDepartmentDesignationWisePolicies',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),

  attendanceBonusPolicycontroller.getBranchDepartmentDesignationWisePolicies,
);
module.exports = router;
