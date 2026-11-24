const express = require('express');
const employeeShiftController = require('../controllers/employeeshift.controller');
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
      {
        permissionName: fromPermissionName.DAILYATTENDANCE,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeShiftController.getEmployeeShiftByUserId,
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
  employeeShiftController.deleteEmployeeShiftByID,
); // delete data
router.post(
  '/v1/getEmployeeShift',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKSHIFT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeShiftController.getEmployeeShift,
); // employee shift data

router.post(
  '/v2/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  employeeShiftController.postAddEmployeeShiftV2,
);
router.post(
  '/v2/addbulk',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKSHIFT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeShiftController.postAddEmployeeShiftBULKV2,
);
router.post(
  '/v1/getEmployeeShiftReport',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeShiftController.getEmployeeShiftReport,
); //get unassigned shift employees

module.exports = router;
