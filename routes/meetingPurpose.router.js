const express = require('express');
const MeetingPurpose = require('../controllers/meetingPurpose.controller');
const {
  checkRoleOperationPermission,
} = require('../middleware/checkRoleOperationPermission');
const { fromPermissionName } = require('../constants/formPermission');
const { formOperation } = require('../utils/commonVars');
const router = express.Router();

router.post(
  '/v1/addMeetingPurpose',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MEETINGPURPOSE,
        operation: formOperation.CREATE,
      },
    ],
  }),
  MeetingPurpose.addMeetingPurpose,
);

router.post(
  '/v1/getAllMeetingPurpose',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MEETINGPURPOSE,
        operation: formOperation.VIEW,
      },
    ],
  }),
  MeetingPurpose.listMeetingPurposes,
);

router.post(
  '/v1/getMeetingPurposeByID',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MEETINGPURPOSE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  MeetingPurpose.getMeetingPurposeByID,
);

router.post(
  '/v1/updateMeetingPurpose',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MEETINGPURPOSE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  MeetingPurpose.updateMeetingPurpose,
);

router.post(
  '/v1/updateMeetingPurposeStatus',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MEETINGPURPOSE,
        operation: formOperation.EDIT,
      },
    ],
  }),
  MeetingPurpose.updateMeetingPurposeStatus,
);

router.post(
  '/v1/deleteMeetingPurpose',
  checkRoleOperationPermission({
    requiredPermissionList: [
      {
        permissionName: fromPermissionName.MEETINGPURPOSE,
        operation: formOperation.DELETE,
      },
    ],
  }),
  MeetingPurpose.deleteMeetingPurpose,
);

module.exports = router;
