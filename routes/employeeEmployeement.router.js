const express = require('express');
const employeeEmployeementController = require('../controllers/employeeEmployeement.controller');
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
  employeeEmployeementController.getEmployeeEmployeementByUserId,
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
  employeeEmployeementController.postDeleteEmployeeEmployeementById,
); //get by user id

router.post(
  '/v1/toBeConfirmedEmployee',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeEmployeementController.toBeConfirmedEmployee,
);

module.exports = router;
