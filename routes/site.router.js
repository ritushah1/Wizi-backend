const express = require('express');
const SiteController = require('../controllers/site.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');

const router = express.Router();

router.post(
  '/v1/addSite',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SITEMASTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  SiteController.addSite,
);
router.post(
  '/v1/listSite',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SITEMASTER,
        operation: formOperation.VIEW,
      },
    ],
  }),
  SiteController.listSite,
);
router.get(
  '/v1/getSiteByID/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SITEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  SiteController.getSiteByID,
);
router.put(
  '/v1/editSite',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SITEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  SiteController.editSite,
);
router.post(
  '/v1/deleteSite',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.SITEMASTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  SiteController.deleteSite,
);

module.exports = router;
