const express = require('express');
const shortLeaveController = require('../controllers/shortLeave.controller');
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
        permissionName: fromPermissionName.SHORTLEAVEPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  shortLeaveController.postAddShortLeave,
); // save data
router.post(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHORTLEAVEPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  shortLeaveController.updateShortLeave,
); // update data
router.get(
  '/v1/getalldata',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHORTLEAVEPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  shortLeaveController.getAllShortLeaveData,
); //get all bank data
router.post(
  '/v1/updateStatus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHORTLEAVEPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  shortLeaveController.poststatuschange,
); //status change
router.delete(
  '/v1/deleteShortLeave/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SHORTLEAVEPOLICY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  shortLeaveController.deleteShortLeave,
); //status change

router.post(
  '/v1/getBranchDepartmentDesignationWisePolicies',
  shortLeaveController.getBranchDepartmentDesignationWisePolicies,
);
module.exports = router;
