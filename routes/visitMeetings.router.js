const express = require('express');
const VisitMeetings = require('../controllers/visitMeeting.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addVisitMeeting',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ALLMEETINGS,
        operation: formOperation.CREATE,
      },
      {
        permissionName: fromPermissionName.MYMEETINGS,
        operation: formOperation.CREATE,
      },
    ],
  }),
  VisitMeetings.addVisitMeetings,
);

router.post(
  '/v1/getAllVisitMeeting',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.ALLMEETINGS,
        operation: formOperation.VIEW,
      },
      {
        permissionName: fromPermissionName.MYMEETINGS,
        operation: formOperation.VIEW,
      },
    ],
  }),
  VisitMeetings.listVisitMeetingss,
);

router.post(
  '/v1/getVisitMeetingByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYMEETINGS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  VisitMeetings.getVisitMeetingsByID,
);

router.post(
  '/v1/updateVisitMeeting',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYMEETINGS,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ALLMEETINGS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  VisitMeetings.updateVisitMeetings,
);

router.post(
  '/v1/updateVisitMeetingsStatus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYMEETINGS,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ALLMEETINGS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  VisitMeetings.updateVisitMeetingsStatus,
);

router.post(
  '/v1/deleteVisitMeeting',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYMEETINGS,
        operation: formOperation.DELETE,
      },
    ],
  }),
  VisitMeetings.deleteVisitMeetings,
);

router.post('/v1/bulkMeetingAddUpdate', VisitMeetings.bulkMeetingAddUpdate);
router.post(
  '/v1/rescheduleVisitMeeting',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MYMEETINGS,
        operation: formOperation.EDIT,
      },
      {
        permissionName: fromPermissionName.ALLMEETINGS,
        operation: formOperation.EDIT,
      },
    ],
  }),
  VisitMeetings.rescheduleVisitMeeting,
);

module.exports = router;
