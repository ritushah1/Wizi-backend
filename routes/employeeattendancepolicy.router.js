const express = require('express');
const employeeAttendancePolicyController = require('../controllers/employeeattendancepolicy.controller');
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
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeAttendancePolicyController.postAddAttendancePolicy,
); // save data
router.get(
  '/v1/getbyuserid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ATTENDANCECORRECTIONREQUEST,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeAttendancePolicyController.getAttendancePolicyByUserId,
); // get data

router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeAttendancePolicyController.postDeletAttendancePolicyById,
); // delete data
router.post(
  '/v1/getAttendancePolicy',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.BULKATTENDANCEPOLICY,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.BULKATTENDANCEPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeAttendancePolicyController.getAttendancePolicy,
); // employee shift data
// add bulk data
router.post(
  '/v1/postAddAttendanceAllPolicyBULK',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKATTENDANCEPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeAttendancePolicyController.postAddAllPolicyBULKATTENDANCE,
); // add bulk data

module.exports = router;
