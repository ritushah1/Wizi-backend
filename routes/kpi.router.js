const express = require('express');
const KPIController = require('../controllers/kpi.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { reqObjectType, formOperation } = require('../utils/commonVars');
const { validateSchema } = require('../middleware/validateSchema');
const { listKpiSchema } = require('../validators/kpi');
const { checkRoleOperationPermission } = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');

const router = express.Router();

router.get(
  '/v1',
  validateSchema(listKpiSchema, reqObjectType.QUERY),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.KPI,
        operation: formOperation.VIEW,
      },
    ],
  }),
  KPIController.listKPI
);

module.exports = router;
