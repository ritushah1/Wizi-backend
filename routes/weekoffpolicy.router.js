const express = require('express');
const weekOffPolicyController = require('../controllers/weekoffpolicy.controller');
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
        permissionName: fromPermissionName.WEEKOFF,
        operation: formOperation.CREATE,
      },
    ],
  }),
  weekOffPolicyController.postAddWeekOffPolicy,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WEEKOFF,
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
  weekOffPolicyController.getWeekOffPolicyById,
); //get by id
router.post(
  '/v1/getbycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WEEKOFF,
        operation: formOperation.VIEW,
      },
    ],
  }),
  weekOffPolicyController.getWeekOffPolicyByCompanyId,
); //get by company id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WEEKOFF,
        operation: formOperation.EDIT,
      },
    ],
  }),
  weekOffPolicyController.postUpdateWeekOffPolicy,
); //update week off data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WEEKOFF,
        operation: formOperation.DELETE,
      },
    ],
  }),
  weekOffPolicyController.postDeleteWeekOffPolicyById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.WEEKOFF,
        operation: formOperation.EDIT,
      },
    ],
  }),
  weekOffPolicyController.poststatuschange,
); //status change
router.get(
  '/v1/getactiveweekoffbycompanyid/:id',
  weekOffPolicyController.getactiveweekoffbycompanyid,
);
router.post(
  '/v1/getBranchDepartmentDesignationWisePolicies',
  weekOffPolicyController.getBranchDepartmentDesignationWisePolicies,
);
module.exports = router;
