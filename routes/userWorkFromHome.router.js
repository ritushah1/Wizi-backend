const express = require('express');
const router = express.Router();
const userWorkFromHomeController = require('../controllers/userWorkFromHome.controller');
const { reqObjectType, formOperation } = require('../utils/commonVars');
const {
  createWorkFromHomeSchema,
  updateWorkFromHomeSchema,
} = require('../validators/workFromHomeValidation');
const { validateSchema } = require('../middleware/validateSchema');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');

router.get(
  '/v1',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYWORKFROMHOME,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINWORKFROMHOMEAUTHORIZATION,
        operation: formOperation.VIEW,
      },
    ],
  }),
  userWorkFromHomeController.list,
);
router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYWORKFROMHOME,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.ADMINWORKFROMHOMEAUTHORIZATION,
        operation: formOperation.CREATE,
      },
    ],
  }),
  validateSchema(createWorkFromHomeSchema, reqObjectType.BODY),
  userWorkFromHomeController.add,
);
router.get(
  '/v1/edit/:id([0-9]+)',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYWORKFROMHOME,
        operation: formOperation.EDIT,
      },
    ],
  }),
  userWorkFromHomeController.edit,
);
router.put(
  '/v1/update/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYWORKFROMHOME,
        operation: formOperation.EDIT,
      },
    ],
  }),
  validateSchema(updateWorkFromHomeSchema, reqObjectType.BODY),
  userWorkFromHomeController.update,
);
router.delete(
  '/v1/delete/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYWORKFROMHOME,
        operation: formOperation.DELETE,
      },
    ],
  }),
  userWorkFromHomeController.delete,
);
router.post(
  '/v2/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYWORKFROMHOME,
        operation: formOperation.DELETE,
      },
    ],
  }),
  userWorkFromHomeController.deleteV2,
);

module.exports = router;
