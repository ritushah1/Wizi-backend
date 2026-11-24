const express = require('express');
const employeeHolidayPolicyController = require('../controllers/employeeHolidayPolicy.controller');
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
  employeeHolidayPolicyController.postAddEmployeeHolidayPolicy,
); // save data

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
  employeeHolidayPolicyController.getEmployeeHolidayPolicyByUserId,
); //get by user id

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
  employeeHolidayPolicyController.postDeleteEmployeeHolidayPolicyById,
); //delete by id

router.post(
  '/v1/getEmployeeHoliday',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKHOLIDAY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeHolidayPolicyController.getEmployeeHoliday,
); //status changeget

router.post(
  '/v1/addbulk',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKHOLIDAY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeHolidayPolicyController.postAddEmployeeWeekoffBULK,
); // save data
module.exports = router;
