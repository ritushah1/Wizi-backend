const express = require('express');
const preboardingformcustomizeController = require('../controllers/preboardingformcustomize.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const { verifyToken } = require('../middleware/tokenverify');
const router = express.Router();

router.post(
  '/v1/getbycompanyid',
  verifyToken,
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.USERPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.HRPREBOARDINGREQUEST,
        operation: formOperation.EDIT,
      },
    ],
  }),
  preboardingformcustomizeController.getPreboardingFormCustomizeByCompanyId,
); //get by company id

router.post(
  '/v1/getPreboardingFormCustomizeByCompanyBySecretKey',
  preboardingformcustomizeController.getPreboardingFormCustomizeByCompanyBySecretKey,
); //get by company id
module.exports = router;
