const express = require('express');
const employeeLateEarlyController = require('../controllers/employeeLateEarlyPolicy.controller');
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
  employeeLateEarlyController.postAddLateEarlyPolicy,
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
  employeeLateEarlyController.getLateEarlyPolicyByUserId,
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
  employeeLateEarlyController.postDeletLateEarlyPolicyById,
); // delete data
router.post(
  '/v1/getLateEarlyPolicy',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKLATEINEARLYGOPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  employeeLateEarlyController.getLateEarlyPolicy,
); // employee  data
router.post(
  '/v1/postAddAllPolicyBULK',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BULKLATEINEARLYGOPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  employeeLateEarlyController.postAddAllPolicyBULK,
); // add bulk data

module.exports = router;
