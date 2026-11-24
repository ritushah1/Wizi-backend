const express = require('express');
const companyApiKeyController = require('../controllers/companyApiKey.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/getCompanyApiKeyByCompanyId',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.APIKEY,
        operation: formOperation.VIEW,
      },
    ],
  }),
  companyApiKeyController.getById,
);
router.post(
  '/v1/deleteCompanyApiKeyById',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.APIKEY,
        operation: formOperation.DELETE,
      },
    ],
  }),
  companyApiKeyController.delete,
);
router.post(
  '/v1/addCompanyApiKey',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.APIKEY,
        operation: formOperation.CREATE,
      },
    ],
  }),
  companyApiKeyController.add,
);
module.exports = router;
