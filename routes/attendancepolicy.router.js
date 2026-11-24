const express = require('express');
const attendancePolicyController = require('../controllers/attendancepolicy.controller');
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
        permissionName: fromPermissionName.ATTENDANCEPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  attendancePolicyController.postAddAttendancePolicy,
); // save data
router.post(
  '/v1/getalldata',
  attendancePolicyController.getAllAttendancePolicyData,
); //get all attendancePolicy data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCEPOLICY,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ATTENDANCEPOLICY,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ME,
        operation: formOperation.SHOW_MENU,
      },
    ],
  }),
  attendancePolicyController.getAttendancePolicyById,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCEPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  attendancePolicyController.postUpdateAttendancePolicy,
); //update attendancePolicy data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCEPOLICY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  attendancePolicyController.postDeleteAttendancePolicyById,
); //delete by id
router.post(
  '/v1/statuschange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ATTENDANCEPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  attendancePolicyController.poststatuschange,
); //status
router.get(
  '/v1/getactiveattendancepolicybycompanyid/:id',
  attendancePolicyController.getactiveattendancebycompanyid,
);

router.post(
  '/v1/getBranchDepartmentDesignationWisePolicies',
  attendancePolicyController.getBranchDepartmentDesignationWisePolicies,
); //status

// ---------------------------- for data update for weekoff holiday rule --------------------------

router.post(
  '/v1/update-weekoff-holiday-rule',
  attendancePolicyController.updateWeekoffHolidayRule,
);

module.exports = router;
