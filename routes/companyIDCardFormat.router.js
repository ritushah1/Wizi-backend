const express = require('express');
const router = express.Router();
const CompanyIDCardFormat = require('../controllers/companyIDCardFormat.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

router.post(
  '/v1/addUpdateCompanyIDCardFormat',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANYIDCARDPFORMAT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  CompanyIDCardFormat.addUpdateCompanyIDCardFormat,
);

router.post(
  '/v1/getAllCompanyIDCardFormat',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.COMPANYIDCARDPFORMAT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  CompanyIDCardFormat.getAllCompanyIDCardFormat,
);

module.exports = router;
