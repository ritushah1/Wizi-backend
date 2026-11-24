const express = require('express');
const employeeSalaryPolicyController = require('../controllers/employeesalarypolicycontroller');
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
      {
        permissionName: fromPermissionName.ASSIGNSALARYPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeSalaryPolicyController.postAddSalaryPolicy,
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
        permissionName: fromPermissionName.ASSIGNSALARYPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeSalaryPolicyController.getSalaryPolicyByUserId,
); // get data

router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ASSIGNSALARYPOLICY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  employeeSalaryPolicyController.postDeletSalaryPolicyById,
); // delete data

router.post(
  '/v1/getSalaryPolicy',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKSALARYPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeSalaryPolicyController.getSalaryPolicy,
); // employee shift data

router.post(
  '/v1/addbulk',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKSALARYPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeSalaryPolicyController.postAddSalaryPolicyBULK,
); // add bulk data

module.exports = router;
