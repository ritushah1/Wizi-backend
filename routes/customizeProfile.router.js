const express = require('express');
const customizeProfileController = require('../controllers/customizeProfile.controller');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const router = express.Router();

router.post(
  '/v1/getCustomizeProfile',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMIZEPROFILE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  customizeProfileController.getcustomizeProfile,
);
router.put(
  '/v1/updateCustomizeProfile',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CUSTOMIZEPROFILE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  customizeProfileController.updateCustomizeProfile,
);

module.exports = router;
