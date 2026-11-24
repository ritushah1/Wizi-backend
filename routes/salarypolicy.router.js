const express = require('express');
const salaryPolicyController = require('../controllers/salarypolicy.controller');
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
        permissionName: fromPermissionName.SALARYPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  salaryPolicyController.postAddSalaryPolicy,
); // save data
router.post(
  '/v1/getalldata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  salaryPolicyController.getAllSalaryPolicyData,
); //get all salaryPolicy data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYPOLICY,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.SALARYPOLICY,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  salaryPolicyController.getSalaryPolicyById,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  salaryPolicyController.postUpdateSalaryPolicy,
); //update salaryPolicy data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYPOLICY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  salaryPolicyController.postDeleteSalaryPolicyById,
); //delete by id
router.post(
  '/v1/statuschange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  salaryPolicyController.poststatuschange,
); //status
router.get(
  '/v1/getactivesalarypolicybycompanyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ASSIGNSALARYPOLICY,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.BULKSALARYPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  salaryPolicyController.getactivesalarybycompanyid,
);
router.post(
  '/v1/getBranchDepartmentDesignationWisePolicies',
  salaryPolicyController.getBranchDepartmentDesignationWisePolicies,
);
module.exports = router;
