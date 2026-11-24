const express = require('express');
const foodAllowancePolicyController = require('../controllers/foodAllowancePolicy.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FOODALLOWANCEPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  foodAllowancePolicyController.addData,
);
router.put(
  '/v1/updateData/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FOODALLOWANCEPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  foodAllowancePolicyController.updateData,
);
router.get(
  '/v1/listData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FOODALLOWANCEPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  verifyChildParent,
  foodAllowancePolicyController.listData,
);
router.delete(
  '/v1/deleteData/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FOODALLOWANCEPOLICY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  foodAllowancePolicyController.deleteData,
);
router.get(
  '/v1/getById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FOODALLOWANCEPOLICY,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.FOODALLOWANCEPOLICY,
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
  foodAllowancePolicyController.getById,
);
router.post(
  '/v1/updateStatus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FOODALLOWANCEPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  foodAllowancePolicyController.updateStatus,
);
router.post('/v1/addFoodAllow', foodAllowancePolicyController.addFoodAllow);
router.post(
  '/v1/getBranchDepartmentDesignationWisePolicies',
  foodAllowancePolicyController.getBranchDepartmentDesignationWisePolicies,
);
module.exports = router;
