const express = require('express');
const LateEarlyPolicyController = require('../controllers/lateEarlyPolicy.controller');
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
        permissionName: fromPermissionName.LATEINEARLYGOPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  LateEarlyPolicyController.postAddLateEarlyPolicy,
); // add data
router.post(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LATEINEARLYGOPOLICY,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  LateEarlyPolicyController.postUpdateLateEarlyPolicy,
); // update data
router.post(
  '/v1/statuschange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LATEINEARLYGOPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  LateEarlyPolicyController.postStatusChangeLateEarlyPolicyById,
); // status change
router.post(
  '/v1/list',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LATEINEARLYGOPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  LateEarlyPolicyController.listLateEarlyPolicy,
); // list data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LATEINEARLYGOPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  LateEarlyPolicyController.getLateEarlyPolicyById,
); //get by id
router.delete(
  '/v1/deleteById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.LATEINEARLYGOPOLICY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  LateEarlyPolicyController.deleteData,
); //delete by id
router.post(
  '/v1/getBranchDepartmentDesignationWisePolicies',
  LateEarlyPolicyController.getBranchDepartmentDesignationWisePolicies,
);
module.exports = router;
