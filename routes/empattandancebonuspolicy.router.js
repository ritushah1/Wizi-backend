const express = require('express');
const employeeAttendanceBonusPolicyController = require('../controllers/empattandancebonuspolicy.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.get(
  '/v1/getbyuserid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeAttendanceBonusPolicyController.getEmployeeAttendanceBonuByUserId,
);

router.post(
  '/v1/getbulk',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  verifyChildParent,
  employeeAttendanceBonusPolicyController.getAttendanceBonusPolicyoff,
); //status changeget
router.post(
  '/v1/addbulk',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeAttendanceBonusPolicyController.postAddattendanceBonusBULK,
); // save data

module.exports = router;
