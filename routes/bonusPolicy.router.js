const express = require('express');
const bonusPolicyController = require('../controllers/bonusPolicy.controller');
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
        permissionName: fromPermissionName.BONUSPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  bonusPolicyController.addData,
); // save data
router.put(
  '/v1/update/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BONUSPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  bonusPolicyController.updateData,
); // update data
router.post(
  '/v1/listdata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BONUSPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  bonusPolicyController.listdata,
); // list data
router.get(
  '/v1/getById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BONUSPOLICY,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.BONUSPOLICY,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.BONUSPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  bonusPolicyController.getById,
); // get data
router.delete(
  '/v1/delete/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BONUSPOLICY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  bonusPolicyController.deletedata,
);
router.post(
  '/v1/poststatuschange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BONUSPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  bonusPolicyController.poststatuschange,
);
router.get(
  '/v1/getActiveBonusPolicyByCompanyId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BONUSPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  bonusPolicyController.getActiveBonusPolicyByCompanyId,
);
router.post(
  '/v1/getBranchDepartmentDesignationWisePolicies',
  bonusPolicyController.getBranchDepartmentDesignationWisePolicies,
);
module.exports = router;
