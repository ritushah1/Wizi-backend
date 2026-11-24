const express = require('express');
const ExperienceLetter = require('../controllers/experienceLetter.controller');
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
        permissionName: fromPermissionName.EXPERIENCELETTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  ExperienceLetter.addExperienceLetter,
);
router.put(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPERIENCELETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ExperienceLetter.updateExperienceLetter,
);
router.post(
  '/v1/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPERIENCELETTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  ExperienceLetter.deleteExperienceLetter,
);
router.post(
  '/v1/get',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.EXPERIENCELETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.OFFERLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  ExperienceLetter.getExperienceLetter,
);

module.exports = router;
