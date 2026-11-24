const express = require('express');
const UserChecklist = require('../controllers/userCheckList.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/AddUserChecklist',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYCHECKLIST,
        operation: formOperation.CREATE,
      },
    ],
  }),
  UserChecklist.AddUserChecklist,
);
router.get(
  '/v1/getByIdUserChecklist/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYCHECKLIST,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MYCHECKLIST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  UserChecklist.getByIdUserChecklist,
);
router.post(
  '/v1/updateByIdUserChecklist',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYCHECKLIST,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MYCHECKLIST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  UserChecklist.updateByIdUserChecklist,
);
router.post(
  '/v1/getByUserChecklist',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYCHECKLIST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserChecklist.getByUserChecklist,
);
router.get(
  '/v1/getCheckListbyUserID/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYCHECKLIST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserChecklist.getCheckListbyUserID,
);
router.post(
  '/v1/listAdminCheckList',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINCHECKLIST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserChecklist.listAdminCheckList,
);
router.post(
  '/v1/getByDateandUserIDUserChecklist',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYCHECKLIST,
        operation: formOperation.CREATE,
      },
    ],
  }),
  UserChecklist.getByDateandUserIDUserChecklist,
);

module.exports = router;
