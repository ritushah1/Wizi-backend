const express = require('express');
const employeeWorkingLocationController = require('../controllers/employeeWorkingLocation.controller');
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
  employeeWorkingLocationController.postAddEmployeeWorkingLocation,
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
  employeeWorkingLocationController.getEmployeeWorkingLocationByUserId,
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
  employeeWorkingLocationController.postDeleteEmployeeWorkingLocationById,
); // delete data
router.post(
  '/v1/getEmployeeWorkingLocation',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKWORKINGLOCATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeWorkingLocationController.getEmployeeWorkingLocation,
); // employee EmployeeWorkingLocationRoutes data
router.post(
  '/v1/addbulk',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKWORKINGLOCATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeWorkingLocationController.postAddEmployeeWorkingLocationBULK,
); // add bulk data

module.exports = router;
