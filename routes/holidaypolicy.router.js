const express = require('express');
const holidayPolicyController = require('../controllers/holidaypolicy.controller');
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
        permissionName: fromPermissionName.HOLIDAY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  holidayPolicyController.postAddholidayPolicy,
); // save data
router.post(
  '/v1/getalldata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.EMPLOYEEMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.HOLIDAY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  holidayPolicyController.getAllholidayPolicyData,
); //get all week off data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HOLIDAY,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.HOLIDAY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  holidayPolicyController.getholidayPolicyById,
); //get by id

router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HOLIDAY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  holidayPolicyController.postUpdateholidayPolicy,
); //update week off data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HOLIDAY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  holidayPolicyController.postDeleteholidayPolicyById,
); //delete by id
router.post(
  '/v1/statuschanges',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HOLIDAY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  holidayPolicyController.poststatuschange,
); //status change
router.get(
  '/v1/getactiveholidaypolicybycompanyid/:id',
  holidayPolicyController.getactiveholidaypolicybycompanyid,
);
router.post(
  '/v1/getBranchDepartmentDesignationWisePolicies',
  holidayPolicyController.getBranchDepartmentDesignationWisePolicies,
);

router.post(
  '/v1/addUpdateHolidayCompensationRule',
  holidayPolicyController.addUpdateHolidayCompensationRule,
);

router.post(
  '/v1/getHolidayCompensationRuleByPolicyId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HOLIDAY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  holidayPolicyController.getHolidayCompensationRuleByPolicyId,
);

router.post(
  '/v1/deleteHolidayCompensationRuleByPolicyId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.HOLIDAY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  holidayPolicyController.deleteHolidayCompensationRuleByPolicyId,
);
module.exports = router;
