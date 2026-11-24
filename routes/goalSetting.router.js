const express = require('express');
const GoalSettingController = require('../controllers/goalSetting.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { reqObjectType, formOperation } = require('../utils/commonVars');
const { validateSchema } = require('../middleware/validateSchema');
const {
  createGoalSettingSchema,
  listGoalSettingSchema,
  updateGoalSettingSchema,
} = require('../validators/goalSetting');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');

const router = express.Router();

router.post(
  '/v1',
  validateSchema(createGoalSettingSchema),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOALSETTING,
        operation: formOperation.CREATE,
      },
    ],
  }),
  GoalSettingController.createGoalSetting,
);
router.put(
  '/v1/:id',
  validateSchema(updateGoalSettingSchema),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOALSETTING,
        operation: formOperation.EDIT,
      },
    ],
  }),
  GoalSettingController.updateGoalSetting,
);
router.get(
  '/v1/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOALSETTING,
        operation: formOperation.VIEW,
      },
    ],
  }),
  verifyChildParent,
  GoalSettingController.getGoalSettingDetails,
);
router.get(
  '/v1',
  validateSchema(listGoalSettingSchema, reqObjectType.QUERY),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOALSETTING,
        operation: formOperation.EDIT,
      },
    ],
  }),
  GoalSettingController.listGoalSetting,
);
router.delete(
  '/v1/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOALSETTING,
        operation: formOperation.DELETE,
      },
    ],
  }),
  verifyChildParent,
  GoalSettingController.deleteGoalSetting,
);
module.exports = router;
