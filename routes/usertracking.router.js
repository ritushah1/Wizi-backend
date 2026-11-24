const express = require('express');
const userTrackingController = require('../controllers/usertracking.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/check',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TRACKINGEMPLOYEE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  userTrackingController.postCheckTracking,
); // check user tracking
router.get(
  '/v1/getbyid/:id',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TRACKINGEMPLOYEE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  userTrackingController.getUserTrackingById,
); //get by id
router.post(
  '/v1/getbycompanyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TRACKINGEMPLOYEE,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.LOCATIONDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  userTrackingController.getUserTrackingByCompanyId,
); //get by company id
router.post(
  '/v1/updatebyid',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TRACKINGEMPLOYEE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  userTrackingController.postUpdateUserTracking,
); //update user tracking data
router.post(
  '/v1/disable',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TRACKINGEMPLOYEE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  userTrackingController.postDisableUserTracking,
); //disable user tracking data
router.post(
  '/v1/bulkCreateUserTracking',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TRACKINGEMPLOYEE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  userTrackingController.bulkCreateUserTracking,
); //disable user tracking data
module.exports = router;
