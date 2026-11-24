const express = require('express');
const CheckListController = require('../controllers/checklist.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getAllCheckList',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHECKLISTMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  CheckListController.getAllCheckList,
);
router.post(
  '/v1/postAddCheckList',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHECKLISTMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  CheckListController.postAddCheckList,
);
router.get(
  '/v1/getCheckListById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHECKLISTMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  CheckListController.getCheckListById,
);
router.post(
  '/v1/postUpdateCheckList',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHECKLISTMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  CheckListController.postUpdateCheckList,
);
router.post(
  '/v1/poststatuschange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CHECKLISTMASTER,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.MYCHECKLIST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  CheckListController.poststatuschange,
);

module.exports = router;
