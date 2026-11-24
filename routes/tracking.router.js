const express = require('express');
const TrackingController = require('../controllers/tracking.controller');
const { fromPermissionName } = require('../constants/formPermission');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post('/v1/savedatabulk', TrackingController.postTrackingBulk);

router.post(
  '/v1/getUserTrackingInfoById',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVEHICLEMETERDETAILS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.KMSREPORT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINVEHICLEMETERDETAILS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINLOCATIONTRACKING,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  TrackingController.getUserTrackingInfoById,
),
  router.post(
    '/v1/getUserTrackingInfo',
    checkRoleOperationPermission({
      requiredPermissionList: [
        {
          permissionName: fromPermissionName.TEAMVEHICLEMETERDETAILS,
          operation: formOperation.VIEW,
        },
        {
          permissionName: fromPermissionName.ADMINVEHICLEMETERDETAILS,
          operation: formOperation.VIEW,
        },
        {
          permissionName: fromPermissionName.ADMINLOCATIONTRACKING,
          operation: formOperation.VIEW,
        },
        {
          permissionName: fromPermissionName.EXPENSE,
          operation: formOperation.VIEW,
        },
      ],
    }),
    TrackingController.getUserTrackingInfo,
  );

router.post(
  '/v1/getActiveUserandTrackingUserCount',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TRACKINGDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  TrackingController.getActiveUserandTrackingUserCount,
);

router.post(
  '/v1/getTrackingGeoFenceWiseData',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ADMINLOCATIONTRACKING,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.TRACKINGDASHBOARD,
        operation: formOperation.VIEW,
      },
    ],
  }),
  TrackingController.getTrackingGeoFenceWiseData,
);

router.post(
  '/v1/calculateKmsByUserAndDate',
  TrackingController.calculateKmsByUserAndDate,
);
router.post(
  '/v1/getTrackingDirectionPoints',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.TEAMVEHICLEMETERDETAILS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINVEHICLEMETERDETAILS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.KMSREPORT,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.ADMINLOCATIONTRACKING,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.EXPENSEREQUEST,
        operation: formOperation.VIEW,
      },
    ],
  }),
  TrackingController.getTrackingDirectionPoints,
);
module.exports = router;
