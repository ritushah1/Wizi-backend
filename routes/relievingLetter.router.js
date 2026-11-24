const express = require('express');
const RelievingLetter = require('../controllers/relievingLetter.controller');
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
        permissionName: fromPermissionName.RELIEVINGLETTER,
        operation: formOperation.CREATE,
      },
    ],
  }),
  RelievingLetter.addRelievingLetter,
);
router.put(
  '/v1/update',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RELIEVINGLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  RelievingLetter.updateRelievingLetter,
);
router.post(
  '/v1/delete',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RELIEVINGLETTER,
        operation: formOperation.DELETE,
      },
    ],
  }),
  RelievingLetter.deleteRelievingLetter,
);
router.post(
  '/v1/get',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.RELIEVINGLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ASSIGNLETTER,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.RELIEVINGLETTER,
        operation: formOperation.EDIT,
      },
    ],
  }),
  RelievingLetter.getRelievingLetter,
);

module.exports = router;
