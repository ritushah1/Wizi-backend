const express = require('express');
const AnonymousFeedback = require('../controllers/anonymousFeedback.controller');
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
        permissionName: fromPermissionName.ME,
        operation: formOperation.SHOW_MENU,
      },
    ],
  }),
  AnonymousFeedback.postadd,
);
router.post(
  '/v1/get',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ANONYMOUSFEEDBACK,
        operation: formOperation.VIEW,
      },
    ],
  }),

  AnonymousFeedback.listdata,
);

module.exports = router;
