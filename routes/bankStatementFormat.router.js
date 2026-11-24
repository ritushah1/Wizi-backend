const express = require('express');
const bankStatementFormatController = require('../controllers/bankStatementFormat.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/add',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BANKSTATEMENTFORMAT,
        operation: formOperation.CREATE,
      },
    ],
  }),
  bankStatementFormatController.addBankStatementFormat,
); // save data
router.post(
  '/v1/getBankStatementFormat',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BANKSTATEMENTFORMAT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.BANKSTATEMENTFORMAT,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.BANKSTATEMENTREPORT,
        operation: formOperation.VIEW,
      },
    ],
  }),
  bankStatementFormatController.getBankStatementFormat,
); // save data
router.put(
  '/v1/updateBankStatementFormat',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BANKSTATEMENTFORMAT,
        operation: formOperation.EDIT,
      },
    ],
  }),
  bankStatementFormatController.updateBankStatementFormat,
); // save data
router.delete(
  '/v1/deleteBankStatementFormat',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.BANKSTATEMENTFORMAT,
        operation: formOperation.DELETE,
      },
    ],
  }),
  bankStatementFormatController.deleteBankStatementFormat,
); // save data

module.exports = router;
