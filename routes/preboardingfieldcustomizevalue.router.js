const express = require('express');
const preboardingFormCustomizeValueController = require('../controllers/preboardingfieldcustomizevalue.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.get(
  '/v1/getbyid/:id',
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
  preboardingFormCustomizeValueController.getPreboardingIDCustomizeFieldValueById,
); //get by id

router.get(
  '/v1/convertbase64Tofile',
  preboardingFormCustomizeValueController.convertbase64Tofile,
); //get by id

module.exports = router;
