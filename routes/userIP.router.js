const express = require('express');
// const AnonymousFeedback = require('../controllers/anonymousFeedback.controller');
const UserIp = require('../controllers/userIP.controller');
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
        permissionName: fromPermissionName.IPWHITELISTING,
        operation: formOperation.CREATE,
      },
    ],
  }),
  UserIp.postadd,
);
router.post(
  '/v1/get',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.IPWHITELISTING,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserIp.listdata,
);
router.get(
  '/v1/getById/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.IPWHITELISTING,
        operation: formOperation.VIEW,
      },
    ],
  }),
  UserIp.getById,
);
router.put(
  '/v1/editdata/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.IPWHITELISTING,
        operation: formOperation.EDIT,
      },
    ],
  }),
  UserIp.editdata,
);
module.exports = router;
