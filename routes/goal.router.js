const express = require('express');
const GoalController = require('../controllers/goal.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { reqObjectType, formOperation } = require('../utils/commonVars');
const { validateSchema } = require('../middleware/validateSchema');
const {
  listGoalSchema,
  bulkCreateGoalKraKpiSchema,
  bulkUpdateGoalKraKpiSchema,
} = require('../validators/goal');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');

const router = express.Router();
router.get(
  '/v1/financialYearCalculation',
  GoalController.financialYearCalculation,
);
router.post(
  '/v1',
  validateSchema(bulkCreateGoalKraKpiSchema),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOAL,
        operation: formOperation.CREATE,
      },
    ],
  }),
  GoalController.bulkCreateGoalKraKpi,
);

router.put(
  '/v1/:id',
  validateSchema(bulkUpdateGoalKraKpiSchema),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOAL,
        operation: formOperation.EDIT,
      },
    ],
  }),
  GoalController.bulkUpdateGoalKraKpi,
);
router.get(
  '/v1/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOAL,
        operation: formOperation.EDIT,
      },
    ],
  }),
  verifyChildParent,
  GoalController.getGoalDetails,
);
router.get(
  '/v1',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOAL,
        operation: formOperation.VIEW,
      },
    ],
  }),
  validateSchema(listGoalSchema, reqObjectType.QUERY),
  verifyChildParent,
  GoalController.listGoal,
);
router.delete(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.GOAL,
        operation: formOperation.DELETE,
      },
    ],
  }),
  GoalController.deleteGoal,
);
router.get(
  '/v1/company-wise-goals/:companyMasterID',
  verifyChildParent,
  GoalController.getCompanyWiseGoal,
);

module.exports = router;
