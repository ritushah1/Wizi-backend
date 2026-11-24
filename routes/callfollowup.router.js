const express = require('express');
const callfollowupContoller = require('../controllers/callfollowup.controller');
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
        permissionName: fromPermissionName.CALLFOLLOWUP,
        operation: formOperation.CREATE,
      },
    ],
  }),
  callfollowupContoller.postAddCallFollowup,
); // save data
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CALLFOLLOWUP,
        operation: formOperation.EDIT,
      },
    ],
  }),
  callfollowupContoller.getCallFollowupId,
); //get by id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CALLFOLLOWUP,
        operation: formOperation.EDIT,
      },
    ],
  }),
  callfollowupContoller.postUpdateCallFollowup,
); //update data
router.post(
  '/v1/deletebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CALLFOLLOWUP,
        operation: formOperation.DELETE,
      },
    ],
  }),
  callfollowupContoller.postDeleteCallFollowupById,
); //delete by id
router.post(
  '/v1/statuschange',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CALLFOLLOWUP,
        operation: formOperation.EDIT,
      },
    ],
  }),
  callfollowupContoller.poststatuschange,
); //status by id
router.post(
  '/v1/getCallFollowupuserid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CALLFOLLOWUP,
        operation: formOperation.VIEW,
      },
    ],
  }),
  callfollowupContoller.getCallFollowupuserid,
); //get by id
router.post(
  '/v1/getCallFollowupvisitid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.CALLFOLLOWUP,
        operation: formOperation.VIEW,
      },
    ],
  }),
  callfollowupContoller.getCallFollowupvisitid,
); //get by id

module.exports = router;
