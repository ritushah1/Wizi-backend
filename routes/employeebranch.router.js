const express = require('express');
const employeeBranchController = require('../controllers/employeeBranch.controller');
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
  employeeBranchController.postAddEmployeeBranch,
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
  employeeBranchController.getEmployeeBranchByUserId,
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
  employeeBranchController.postDeleteEmployeeBranchById,
); //delete by id

router.get(
  '/v1/getEmployeeBranchByAttendacePolicy/:id',
  employeeBranchController.getEmployeeBranchByAttendacePolicy,
); //get by user id

module.exports = router;
