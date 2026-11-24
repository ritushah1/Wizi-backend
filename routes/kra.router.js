const express = require('express');
const KRAController = require('../controllers/kra.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { reqObjectType, formOperation } = require('../utils/commonVars');
const { validateSchema } = require('../middleware/validateSchema');
const { listKraSchema } = require('../validators/kra');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');

const router = express.Router();

router.get(
  '/v1',
  validateSchema(listKraSchema, reqObjectType.QUERY),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.KRA,
        operation: formOperation.VIEW,
      },
    ],
  }),
  KRAController.listKRA,
);

module.exports = router;
