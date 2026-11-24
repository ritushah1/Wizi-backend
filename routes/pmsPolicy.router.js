const express = require('express');
const PmsPolicyController = require('../controllers/pmsPolicy.controller');
const { verifyChildParent } = require('../middleware/verifyChildParent');
const { reqObjectType, formOperation } = require('../utils/commonVars');
const { validateSchema } = require('../middleware/validateSchema');
const {
  createPmsPolicySchema,
  updatePmsPolicySchema,
  listPmsPolicySchema,
} = require('../validators/pmsPolicy');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');

const router = express.Router();
router.post(
  '/v1',
  validateSchema(createPmsPolicySchema, reqObjectType.BODY),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PMSPOLICY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  PmsPolicyController.createPmsPolicy,
);
router.put(
  '/v1/:id',
  validateSchema(updatePmsPolicySchema, reqObjectType.BODY),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PMSPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  PmsPolicyController.updatePmsPolicy,
);
router.get(
  '/v1',
  validateSchema(listPmsPolicySchema, reqObjectType.QUERY),
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PMSPOLICY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  PmsPolicyController.listPmsPolicy,
);
router.get(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PMSPOLICY,
        operation: formOperation.EDIT,
      },
    ],
  }),
  PmsPolicyController.getPmsPolicyDetails,
);
router.delete(
  '/v1/:id',
  verifyChildParent,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.PMSPOLICY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  PmsPolicyController.deletePmsPolicy,
);
module.exports = router;
