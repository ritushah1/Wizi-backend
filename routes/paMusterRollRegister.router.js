const express = require('express');
const paMusterRollRegisterController = require('../controllers/paMusterRollRegister.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/musterRegisterWithSalaryCycle',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.FORMXVI,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.FORMXVI,
        operation: formOperation.VIEW,
      },
    ],
  }),
  paMusterRollRegisterController.musterRegisterWithSalaryCycle,
);
module.exports = router;
