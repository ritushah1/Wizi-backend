const express = require('express');
const salaryRegisterFormatController = require('../controllers/salaryRegisterFormat.controller');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYREGISTERFORMAT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  salaryRegisterFormatController.addData,
); // save data
router.get(
  '/v1/getByCompanyId/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SALARYREGISTERFORMAT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.SALARYREGISTERREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  salaryRegisterFormatController.getByCompanyId,
); // save data

module.exports = router;
